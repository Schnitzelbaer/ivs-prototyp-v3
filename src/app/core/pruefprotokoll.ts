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

/**
 * Prüfprotokoll der Fachlichen Prüfstelle (R-07): die neun Fragen der
 * Checkliste 1 aus der Arbeitshilfe (Kap. 4.7) als flache Liste ohne
 * Gruppen. Gleiche Mechanik wie beim Fachlektorat — alle Ja erlauben
 * hier aber die **Freigabe** (Status «freigegeben»), Nein-Befunde gehen
 * als Kommentare zur Korrektur zurück. Die Kapitel-Verweise bleiben im
 * Prototyp Text (Platzhalter, vgl. Abschnitt 10).
 */
export const PRUEFSTELLE_FRAGEN: readonly PruefFrage[] = [
  { id: 'ps-verstaendlich', text: 'Ist der Beschrieb verständlich?' },
  {
    id: 'ps-aufbau',
    text: 'Sind Aufbau und Argumentation des Beschriebs nachvollziehbar?',
  },
  {
    id: 'ps-arbeitshilfe',
    text:
      'Entspricht der Inhalt des Beschriebs den Bestimmungen der Arbeitshilfe, ' +
      'Kap. 3.6 und 4.7?',
  },
  {
    id: 'ps-aktuell',
    text: 'Ist der Inhalt des Beschriebs aktuell und für den Vollzug des IVS relevant?',
  },
  { id: 'ps-widerspruchsfrei', text: 'Ist der Inhalt des Beschriebs widerspruchsfrei?' },
  {
    id: 'ps-luecken',
    text:
      'Werden inhaltliche Lücken explizit erwähnt und gegebenenfalls begründet? ' +
      'Sind die Begründungen nachvollziehbar und fachlich korrekt?',
  },
  {
    id: 'ps-terminologie',
    text: 'Ist die Terminologie der Beschriebe korrekt (gemäss Terminologie-Handbuch)?',
  },
  {
    id: 'ps-aussagen',
    text:
      'Werden die wichtigsten Aussagen des Beschriebs hervorgehoben und korrekt ' +
      '(gemäss Arbeitshilfe Kap. 5.1, 5.2, 5.3) bewertet?',
  },
  { id: 'ps-eckdaten', text: 'Entsprechen die Eckdaten dem Inhalt des Beschriebs?' },
];

export function leereAntwort(): PruefAntwort {
  return { antwort: null, begruendung: '' };
}

export function antwortVon(protokoll: Pruefprotokoll | undefined, frageId: string): PruefAntwort {
  return protokoll?.antworten[frageId] ?? leereAntwort();
}

/** Anzahl beantworteter Fragen des übergebenen Katalogs. */
export function beantworteteFragen(
  protokoll: Pruefprotokoll | undefined,
  fragen: readonly PruefFrage[] = ALLE_PRUEF_FRAGEN,
): number {
  return fragen.filter((f) => antwortVon(protokoll, f.id).antwort !== null).length;
}

/** Mit Nein beantwortete Fragen samt Gruppe (die Befunde des Fachlektorats). */
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

/** Mit Nein beantwortete Fragen eines gruppenlosen Katalogs (Prüfstelle). */
export function neinBefundeVon(
  protokoll: Pruefprotokoll | undefined,
  fragen: readonly PruefFrage[],
): { frage: PruefFrage; begruendung: string }[] {
  return fragen
    .map((frage) => ({ frage, antwort: antwortVon(protokoll, frage.id) }))
    .filter(({ antwort }) => antwort.antwort === 'nein')
    .map(({ frage, antwort }) => ({ frage, begruendung: antwort.begruendung.trim() }));
}

/** Vollständig: jede Frage des Katalogs beantwortet, jedes Nein begründet. */
export function protokollVollstaendig(
  protokoll: Pruefprotokoll | undefined,
  fragen: readonly PruefFrage[] = ALLE_PRUEF_FRAGEN,
): boolean {
  return (
    beantworteteFragen(protokoll, fragen) === fragen.length &&
    neinBefundeVon(protokoll, fragen).every((b) => b.begruendung !== '')
  );
}

/**
 * Bestanden: vollständig und ohne Nein-Befunde — Voraussetzung für
 * «geprüft» (Fachlektorat) bzw. «freigegeben» (Prüfstelle).
 */
export function pruefungBestanden(
  protokoll: Pruefprotokoll | undefined,
  fragen: readonly PruefFrage[] = ALLE_PRUEF_FRAGEN,
): boolean {
  return (
    protokollVollstaendig(protokoll, fragen) && neinBefundeVon(protokoll, fragen).length === 0
  );
}
