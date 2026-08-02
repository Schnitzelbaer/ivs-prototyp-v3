import { IvsObjekt, NHG_LABEL, SUBSTANZGRAD_LABEL, Substanzgrad } from './model';

/**
 * Versionsvergleich IVS 1.0 → IVS 2.0 (08.05, Vorgabe 10).
 *
 * Der 1.0-Stand wird im Prototyp deterministisch aus dem heutigen Stand
 * abgeleitet: Der Erstbeschrieb enthielt einen inzwischen gestrichenen
 * Hinweis und dem heutigen Text fehlte der letzte (mit der Nachführung
 * ergänzte) Satz; einzelne Formulierungen und Eckdaten weichen ab. Für
 * ausgewählte kuratierte Objekte liegen ausformulierte 1.0-Texte vor.
 * Gleicher Input ergibt immer denselben 1.0-Stand.
 */

export interface EckdatenAenderung {
  label: string;
  alt: string;
  neu: string;
}

export interface AlterStand {
  geschichteText: string;
  gelaendeText: string;
  aenderungen: EckdatenAenderung[];
}

/** Kuratierte Erstbeschriebe (IVS 1.0) für Schlüsselobjekte der Seed-Strecken. */
const KURATIERTE_ALTTEXTE: Record<string, { geschichte?: string; gelaende?: string }> = {
  'BE 21': {
    geschichte:
      'Die alte Murtenstrasse verband Bern über Frauenkappelen und Mühleberg mit Gümmenen. ' +
      'Der Verlauf ist seit dem Hochmittelalter belegt; die Bedeutung als Handelsweg nahm ' +
      'mit dem Chausseebau des 18. Jahrhunderts ab. Die ältere Wegführung über die Aumatt ' +
      'ist urkundlich nur lückenhaft belegt.',
    gelaende:
      'Der Weg ist über weite Strecken als Feld- und Hohlweg erhalten. Zustand und ' +
      'Substanz wurden seit der Erstaufnahme von 1993 nicht überprüft.',
  },
  'BE 21.1.1': {
    geschichte:
      'Bedeutender historischer West-Ost-Übergang am Dorfausgang von Frauenkappelen. ' +
      'Eine genauere Datierung der Kofferung steht noch aus.',
    gelaende:
      'Originale Wegbreite streckenweise erkennbar; die Pflästerung ist unter dem ' +
      'heutigen Belag zu vermuten, aber nicht freigelegt.',
  },
  'BE 22': {
    geschichte:
      'Die Wohleistrasse führte als Uferweg dem Wohlensee entlang. Vor dem Aufstau der ' +
      'Aare (1920) verlief der Weg deutlich näher am Fluss; ältere Verläufe sind nur aus ' +
      'der Siegfriedkarte zu erschliessen.',
  },
  'BE 7': {
    geschichte:
      'Die Murtenstrasse ist die westliche Ausfallachse Berns. Ältere Vorgänger führten ' +
      'über die Höhen von Ausserholligen; der Chausseebau von 1742–1748 hat die Linie ' +
      'Bern–Bümpliz–Riedbach festgelegt. Die Bedeutung für den Salz- und Kornhandel ist ' +
      'nicht abschliessend geklärt.',
  },
  'BE 35': {
    gelaende:
      'Die Achse ist im Stadtgebiet weitgehend überbaut; einzelne Alleereste und zwei ' +
      'Stundensteine sind erhalten. Der Erhaltungszustand wurde 1994 als gut beurteilt.',
  },
};

/** In 1.0 vorhandene, mit der Nachführung gestrichene Hinweise. */
const GESTRICHENE_SAETZE_GESCHICHTE = [
  'Die ältere Wegführung ist urkundlich nur lückenhaft belegt.',
  'Eine genauere Datierung steht noch aus.',
  'Der Verlauf ist auf der Siegfriedkarte nur teilweise nachgezeichnet.',
  'Ob der Weg durchgehend fahrbar war, ist nicht geklärt.',
];

const GESTRICHENE_SAETZE_GELAENDE = [
  'Zustand und Substanz wurden seit der Erstaufnahme nicht überprüft.',
  'Die Wegbreite konnte nur abschnittsweise gemessen werden.',
  'Eine Begehung des östlichen Teilstücks steht noch aus.',
  'Die Abgrenzung zum modernen Ausbau ist im Feld unscharf.',
];

/** Formulierungen, die mit der Nachführung modernisiert wurden (1.0 → 2.0). */
const ERSETZUNGEN: readonly [string, string][] = [
  ['rund ', 'etwa '],
  ['heute', 'gegenwärtig'],
  ['erhalten', 'vorhanden'],
];

/** Deterministischer Hash (wie in der Objekt-Generierung). */
function hashWert(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

/** Rich-Text (HTML) auf reinen Text reduzieren — der Diff vergleicht Inhalte. */
export function alsKlartext(text: string): string {
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function inSaetze(text: string): string[] {
  return text.split(/(?<=\.)\s+/).filter((s) => s.trim() !== '');
}

/** Generischer 1.0-Text: gestrichener Hinweis rein, letzter Satz raus. */
function alterText(neuText: string, seed: number, art: 'geschichte' | 'gelaende'): string {
  const klartext = alsKlartext(neuText);
  if (!klartext) return '';
  const saetze = inSaetze(klartext);
  const basis = saetze.length > 1 ? saetze.slice(0, -1) : [...saetze];
  const fundus = art === 'geschichte' ? GESTRICHENE_SAETZE_GESCHICHTE : GESTRICHENE_SAETZE_GELAENDE;
  const gestrichen = fundus[seed % fundus.length];
  basis.splice(Math.min(basis.length, 1 + (seed % 2)), 0, gestrichen);
  let text = basis.join(' ');
  // 1.0 nutzte die ältere Formulierung
  const [neu, alt] = ERSETZUNGEN[seed % ERSETZUNGEN.length];
  text = text.split(alt).join(neu);
  return text;
}

const SUBSTANZ_STUFEN: readonly Substanzgrad[] = [
  'viel_substanz',
  'mit_substanz',
  'wenig_substanz',
  'ohne_substanz',
];

/** Der IVS-1.0-Stand eines Objekts (deterministisch, kuratierte zuerst). */
export function alterStand(objekt: IvsObjekt): AlterStand {
  const seed = hashWert(objekt.signatur);
  const kuratiert = KURATIERTE_ALTTEXTE[objekt.signatur];

  // Ohne heutigen Text auch kein 1.0-Text — sonst läse sich der Diff, als
  // wäre der ganze Beschrieb gestrichen worden.
  const geschichte10 = objekt.geschichteText
    ? (kuratiert?.geschichte ?? alterText(objekt.geschichteText, seed, 'geschichte'))
    : '';
  const gelaende10 = objekt.gelaendeText
    ? (kuratiert?.gelaende ?? alterText(objekt.gelaendeText, seed >> 2, 'gelaende'))
    : '';

  const aenderungen: EckdatenAenderung[] = [];
  const aufnahmejahr10 = 1992 + (seed % 4);
  if (objekt.aufnahmejahr && objekt.aufnahmejahr !== aufnahmejahr10) {
    aenderungen.push({
      label: 'Aufnahmejahr',
      alt: String(aufnahmejahr10),
      neu: String(objekt.aufnahmejahr),
    });
  }
  // Substanz nimmt über die Zeit eher ab — 1.0 lag oft eine Stufe höher
  if (objekt.substanzgrad && seed % 3 === 0) {
    const index = SUBSTANZ_STUFEN.indexOf(objekt.substanzgrad);
    if (index > 0) {
      aenderungen.push({
        label: 'Substanzgrad',
        alt: SUBSTANZGRAD_LABEL[SUBSTANZ_STUFEN[index - 1]],
        neu: SUBSTANZGRAD_LABEL[objekt.substanzgrad],
      });
    }
  }
  if (seed % 5 === 0 && objekt.nhgWert === 'national') {
    aenderungen.push({
      label: 'NHG-Wert',
      alt: NHG_LABEL['regional'],
      neu: NHG_LABEL[objekt.nhgWert],
    });
  }
  return { geschichteText: geschichte10, gelaendeText: gelaende10, aenderungen };
}

// ---------------------------------------------------------------------------
// Wort-Diff (LCS) für die Änderungsmarkierungen
// ---------------------------------------------------------------------------

export interface DiffSegment {
  typ: 'gleich' | 'neu' | 'entfernt';
  text: string;
}

/**
 * Wortweiser Diff zweier Texte über die längste gemeinsame Teilfolge;
 * zusammenhängende Wörter gleichen Typs werden zu Segmenten gebündelt.
 */
export function wortDiff(alt: string, neu: string): DiffSegment[] {
  const a = alsKlartext(alt).split(/\s+/).filter(Boolean);
  const b = alsKlartext(neu).split(/\s+/).filter(Boolean);
  const n = a.length;
  const m = b.length;
  // LCS-Tabelle (n+1) × (m+1)
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const segmente: DiffSegment[] = [];
  const anhaengen = (typ: DiffSegment['typ'], wort: string) => {
    const letztes = segmente[segmente.length - 1];
    if (letztes?.typ === typ) letztes.text += ` ${wort}`;
    else segmente.push({ typ, text: wort });
  };
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      anhaengen('gleich', a[i]);
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      anhaengen('entfernt', a[i]);
      i++;
    } else {
      anhaengen('neu', b[j]);
      j++;
    }
  }
  while (i < n) anhaengen('entfernt', a[i++]);
  while (j < m) anhaengen('neu', b[j++]);
  return segmente;
}
