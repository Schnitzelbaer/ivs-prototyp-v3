import { PruefAntwort, Pruefprotokoll } from './model';

/**
 * Prüfprotokoll des Fachlektorats (Abschnitt 4.6 des Fachkontexts):
 * Fragenkatalog gemäss Review-Vorlage vom 05.08.2026 — vier thematische
 * Gruppen, jede Frage wird mit Ja/Nein beantwortet, ein Nein verlangt
 * eine Begründung («Was muss überarbeitet werden?»). Zwei Fragen kommen
 * bewusst in zwei Gruppen vor und werden separat beantwortet.
 *
 * Erst wenn alle Fragen mit Ja beantwortet sind, darf ein Objekt als
 * «geprüft» gekennzeichnet werden; enthält das Protokoll Nein-Befunde,
 * geht das Objekt mit den Begründungen als Kommentaren zur Korrektur
 * zurück an die Inventarisierenden.
 */

export interface PruefFrage {
  id: string;
  text: string;
}

export interface PruefGruppe {
  titel: string;
  fragen: PruefFrage[];
}

const ZUSAMMENFASSUNG =
  'Ist die Zusammenfassung von Geschichts- und Geländebeschrieb nachvollziehbar, relevant ' +
  'und sind darin die wesentlichen Aussagen zu Geschichte und Gelände enthalten?';

const EMPFEHLUNGEN =
  'Haben die Empfehlungen zu den Erhaltungszielen, erkannten Gefahren, wünschenswerten ' +
  'Schutzmassnahmen und konkreten Verbesserungen einen nachvollziehbaren Zusammenhang mit ' +
  'den Inhalten des Geländebeschriebs und der Schutzbegründung?';

export const PRUEF_GRUPPEN: readonly PruefGruppe[] = [
  {
    titel: 'Allgemein',
    fragen: [
      {
        id: 'allgemein-nhg',
        text: 'Sind die NHG-Einstufungen der Objekte nachvollziehbar und überzeugend?',
      },
    ],
  },
  {
    titel: 'Geländebeschrieb',
    fragen: [
      {
        id: 'gelaende-karte',
        text:
          'Stimmt der Geländebeschrieb mit der Darstellung des Geländebefundes in der ' +
          'IVS-Karte überein?',
      },
      { id: 'gelaende-zusammenfassung', text: ZUSAMMENFASSUNG },
      { id: 'gelaende-empfehlungen', text: EMPFEHLUNGEN },
    ],
  },
  {
    titel: 'Geschichtsbeschrieb',
    fragen: [
      {
        id: 'geschichte-widersprueche',
        text:
          'Werden im Geschichtsbeschrieb Widersprüche in der geschichtlichen Überlieferung ' +
          'explizit angesprochen und gegebenenfalls diskutiert?',
      },
      { id: 'geschichte-zusammenfassung', text: ZUSAMMENFASSUNG },
    ],
  },
  {
    titel: 'Schutzbegründung',
    fragen: [
      { id: 'schutz-empfehlungen', text: EMPFEHLUNGEN },
      {
        id: 'schutz-inhalte',
        text:
          'Entsprechen die Inhalte der Schutzbegründung für Geschichte, Morphologie und ' +
          'Substanzgrad den Beschriebinhalten?',
      },
    ],
  },
];

export const ALLE_PRUEF_FRAGEN: readonly PruefFrage[] = PRUEF_GRUPPEN.flatMap((g) => g.fragen);

export function leereAntwort(): PruefAntwort {
  return { antwort: null, begruendung: '' };
}

export function antwortVon(protokoll: Pruefprotokoll | undefined, frageId: string): PruefAntwort {
  return protokoll?.antworten[frageId] ?? leereAntwort();
}

/** Anzahl beantworteter Fragen. */
export function beantworteteFragen(protokoll: Pruefprotokoll | undefined): number {
  return ALLE_PRUEF_FRAGEN.filter((f) => antwortVon(protokoll, f.id).antwort !== null).length;
}

/** Mit Nein beantwortete Fragen samt Gruppe (die Befunde). */
export function neinBefunde(
  protokoll: Pruefprotokoll | undefined,
): { gruppe: string; frage: PruefFrage; begruendung: string }[] {
  const befunde: { gruppe: string; frage: PruefFrage; begruendung: string }[] = [];
  for (const gruppe of PRUEF_GRUPPEN) {
    for (const frage of gruppe.fragen) {
      const antwort = antwortVon(protokoll, frage.id);
      if (antwort.antwort === 'nein') {
        befunde.push({ gruppe: gruppe.titel, frage, begruendung: antwort.begruendung.trim() });
      }
    }
  }
  return befunde;
}

/** Vollständig: jede Frage beantwortet, jedes Nein begründet. */
export function protokollVollstaendig(protokoll: Pruefprotokoll | undefined): boolean {
  return (
    beantworteteFragen(protokoll) === ALLE_PRUEF_FRAGEN.length &&
    neinBefunde(protokoll).every((b) => b.begruendung !== '')
  );
}

/** Bestanden: vollständig und ohne Nein-Befunde — Voraussetzung für «geprüft». */
export function pruefungBestanden(protokoll: Pruefprotokoll | undefined): boolean {
  return protokollVollstaendig(protokoll) && neinBefunde(protokoll).length === 0;
}
