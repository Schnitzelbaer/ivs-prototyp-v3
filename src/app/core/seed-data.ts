import {
  Bewertung,
  Ebene,
  IvsObjekt,
  Lognotiz,
  NhgWert,
  RolleId,
  Substanzgrad,
  WorkflowStatus,
  idAusSignatur,
} from './model';

/**
 * Mock-Objekte für das Testgebiet Bern.
 *
 * Die Hierarchie folgt den echten Gruppierungen der Testdaten aus `ivs-map`:
 * `ivs_ivsfk` fasst Routen zu Strecken zusammen, `ivs_signatur` (101/102)
 * unterscheidet Linienführungen, die Routen bzw. Teilsegmente sind die
 * Abschnitte. Die Zuordnung Signatur → Geometrie liegt in
 * `src/app/karte/karten-layer.ts` und wird zur Laufzeit auf die Layer
 * gestempelt.
 *
 * Die fachlichen Texte sind fiktiv, aber im Stil der echten Objektbeschriebe
 * (Fachkontext Abschnitt 3.2). Ortsnamen sind der realen Umgebung entnommen.
 */

/** Wird der Seed geändert, die Version erhöhen — verwirft gespeicherte Stände. */
export const SEED_VERSION = 6;

const STANDARD_ERHALTUNGSZIEL =
  'Erhalten der Wegsubstanz mit allen historischen Bestandteilen (Art. 3 VIVS). ' +
  'Eingriffe erfolgen substanzschonend, traditionelle Bauweisen und Materialien ' +
  'sind beizubehalten; Unterhalts- und Wiederherstellungsarbeiten in Absprache ' +
  'mit der zuständigen Fachstelle.';

export interface Vorlage {
  signatur: string;
  ebene: Ebene;
  name: string;
  parent: string | null;
  status: WorkflowStatus;
  zustaendigName?: string;
  nhgWert?: NhgWert;
  substanzgrad?: Substanzgrad | null;
  bauzeit?: string;
  bauherrschaft?: string;
  planer?: string;
  gemeinden?: string;
  aufnahmejahr?: number | null;
  wegbegleiterTyp?: string;
  bewertung?: Partial<Bewertung>;
  erhaltungsziel?: string;
  gefahrenMassnahmen?: string;
  geschichteText?: string;
  datierungGeschichte10?: string | null;
  datierungGeschichte20?: string | null;
  gelaendeText?: string;
  datierungGelaende20?: string | null;
  bibliografie?: string;
  pruefkommentar?: string;
  lognotizen?: Lognotiz[];
  inexistent?: { seit: string; begruendung: string } | null;
}

/** Zuständige Rolle aus dem Status ableiten (wer ist am Zug). */
export function rolleFuerStatus(status: WorkflowStatus): RolleId {
  switch (status) {
    case 'zugewiesen':
    case 'in_bearbeitung':
    case 'korrektur':
      return 'R-05';
    case 'bereit_zur_pruefung':
    case 'in_pruefung':
      return 'R-06';
    default:
      return 'R-03';
  }
}

export const NAME_FUER_ROLLE: Record<RolleId, string> = {
  'R-01': '—',
  'R-02': '—',
  'R-03': 'K. Aebischer',
  'R-04': 'T. Nyffenegger',
  'R-05': 'B. Anderegg',
  'R-06': 'M. Gerber',
  'R-07': 'S. Koch',
  'R-08': 'System',
};

function leereBewertung(): Bewertung {
  return {
    geschichte: { punkte: null, text: '' },
    morphologie: { punkte: null, text: '' },
    substanzwert: { punkte: null, text: '' },
  };
}

export function objektAusVorlage(v: Vorlage): IvsObjekt {
  const rolle = rolleFuerStatus(v.status);
  return {
    id: idAusSignatur(v.signatur),
    signatur: v.signatur,
    ebene: v.ebene,
    name: v.name,
    parent: v.parent,
    status: v.status,
    zustaendigRolle: rolle,
    zustaendigName: v.zustaendigName ?? NAME_FUER_ROLLE[rolle],
    inexistent: v.inexistent ?? null,
    nhgWert: v.nhgWert ?? 'national',
    substanzgrad: v.substanzgrad === undefined ? 'mit_substanz' : v.substanzgrad,
    bauzeit: v.bauzeit ?? '',
    bauherrschaft: v.bauherrschaft ?? '',
    planer: v.planer ?? '—',
    kanton: 'BE',
    gemeinden: v.gemeinden ?? 'Frauenkappelen',
    aufnahmejahr: v.aufnahmejahr ?? 2025,
    wegbegleiterTyp: v.wegbegleiterTyp,
    bewertung: { ...leereBewertung(), ...v.bewertung },
    erhaltungsziel: v.erhaltungsziel ?? STANDARD_ERHALTUNGSZIEL,
    gefahrenMassnahmen: v.gefahrenMassnahmen ?? '',
    geschichteText: v.geschichteText ?? '',
    datierungGeschichte10: v.datierungGeschichte10 ?? null,
    datierungGeschichte20: v.datierungGeschichte20 ?? null,
    gelaendeText: v.gelaendeText ?? '',
    datierungGelaende20: v.datierungGelaende20 ?? null,
    bibliografie: v.bibliografie ?? '',
    pruefkommentar: v.pruefkommentar ?? '',
    lognotizen: v.lognotizen ?? [],
  };
}

// ---------------------------------------------------------------------------
// BE 7 — Bern – Bümpliz – Riedbach; Murtenstrasse (publiziert / freigegeben)
// ---------------------------------------------------------------------------

const BE_7: Vorlage[] = [
  {
    signatur: 'BE 7',
    ebene: 'strecke',
    name: 'Bern – Bümpliz – Riedbach (– Murten); Murtenstrasse',
    parent: null,
    status: 'publiziert',
    bauzeit: '18.–19. Jh.',
    bauherrschaft: 'Stand Bern',
    gemeinden: 'Bern',
    aufnahmejahr: 2024,
    bewertung: {
      geschichte: {
        punkte: 4,
        text: 'Hauptausfallachse der Stadt Bern nach Westen; Teil der 1740–1750 ausgebauten Chaussee Bern–Murten.',
      },
      morphologie: {
        punkte: 3,
        text: 'Städtisch überformt, Alleenreste und Stundensteine erhalten.',
      },
      substanzwert: { punkte: 2, text: 'Verlauf weitgehend überbaut, Substanz punktuell.' },
    },
    geschichteText:
      'Text identisch mit Erstbeschrieb IVS 1.0 (Stand 12.03.2002). Die Murtenstrasse ist die westliche ' +
      'Ausfallachse Berns und wurde im Zuge des bernischen Chausseebaus um 1742–1748 auf der Linie ' +
      'Bern–Bümpliz–Riedbach neu trassiert. Ältere Vorgänger führten über die Höhen von Ausserholligen ' +
      '(s. BE 23). Die Strasse diente dem Post- und Warenverkehr in die Waadt und ins Freiburgische; ' +
      'Stundensteine von 1790 markierten die Distanzen ab dem Zytglogge.',
    datierungGeschichte10: '2002-03-12',
    gelaendeText:
      'Die Achse ist im Stadtgebiet durchgehend überbaut. Historische Substanz beschränkt sich auf ' +
      'einzelne Alleenreste, zwei Stundensteine sowie die Platzräume bei Heiliggeistkirche und Burgerspital.',
    datierungGelaende20: '2024-05-16',
    bibliografie:
      'Anderegg, K. (1998): Der bernische Chausseebau im 18. Jahrhundert. Bern.\n' +
      'Flückiger, R. (2002): IVS Dokumentation Kanton Bern, Strecke BE 7.',
    lognotizen: [
      {
        datum: '2025-03-02',
        autor: 'K. Aebischer',
        rolle: 'R-03',
        text: 'Publikation IVS 2.0 mit Version 2025-1.',
      },
    ],
  },
  {
    signatur: 'BE 7.1',
    ebene: 'linienfuehrung',
    name: 'Stadtstrecke Bern – Bümpliz',
    parent: 'BE 7',
    status: 'publiziert',
    bauzeit: '18. Jh.',
    bauherrschaft: 'Stand Bern',
    gemeinden: 'Bern',
    aufnahmejahr: 2024,
    substanzgrad: 'wenig_substanz',
    bewertung: {
      geschichte: { punkte: 4, text: 'Chausseetrassee von 1742–1748, seither Hauptstrasse.' },
      morphologie: { punkte: 2, text: 'Städtisch überformt.' },
      substanzwert: { punkte: 2, text: 'Wenig Originalsubstanz, Verlauf authentisch.' },
    },
    geschichteText:
      'Text identisch mit Erstbeschrieb IVS 1.0 (Stand 12.03.2002). Die Stadtstrecke folgt der Chaussee von ' +
      '1742–1748 zwischen Heiliggeistkirche und Bümpliz Dorf. Der Bahnbau von 1860 und die Tramlinie von 1913 ' +
      'überformten die Achse stark.',
    datierungGeschichte10: '2002-03-12',
    gelaendeText:
      'Durchgehend asphaltierte Hauptstrasse; Verlauf und Flucht der Chaussee erhalten.',
    datierungGelaende20: '2024-05-16',
  },
  {
    signatur: 'BE 7.1.1',
    ebene: 'abschnitt',
    name: 'Heiliggeistkirche – Inselspital',
    parent: 'BE 7.1',
    status: 'publiziert',
    gemeinden: 'Bern',
    substanzgrad: 'wenig_substanz',
    aufnahmejahr: 2024,
  },
  {
    signatur: 'BE 7.1.2',
    ebene: 'abschnitt',
    name: 'Inselspital – Ausserholligen',
    parent: 'BE 7.1',
    status: 'publiziert',
    gemeinden: 'Bern',
    substanzgrad: 'wenig_substanz',
    aufnahmejahr: 2024,
  },
  {
    signatur: 'BE 7.1.3',
    ebene: 'abschnitt',
    name: 'Ausserholligen – Untermatt',
    parent: 'BE 7.1',
    status: 'publiziert',
    gemeinden: 'Bern',
    substanzgrad: 'wenig_substanz',
    aufnahmejahr: 2024,
  },
  {
    signatur: 'BE 7.1.4',
    ebene: 'abschnitt',
    name: 'Untermatt – Bümpliz Dorf',
    parent: 'BE 7.1',
    status: 'publiziert',
    gemeinden: 'Bern',
    substanzgrad: 'wenig_substanz',
    aufnahmejahr: 2024,
  },
  {
    signatur: 'BE 7.2',
    ebene: 'linienfuehrung',
    name: 'Bümpliz – Riedbach',
    parent: 'BE 7',
    status: 'freigegeben',
    bauzeit: '18. Jh.',
    bauherrschaft: 'Stand Bern',
    gemeinden: 'Bern',
    aufnahmejahr: 2024,
    bewertung: {
      geschichte: { punkte: 3, text: 'Chausseeabschnitt mit erhaltener Stundenstein-Setzung.' },
      morphologie: { punkte: 3, text: 'Offene Feldlage zwischen Oberbottigen und Riedbach.' },
      substanzwert: { punkte: 3, text: 'Trassee mit Begrenzungssteinen abschnittweise erhalten.' },
    },
    geschichteText:
      'Ergänzt gegenüber Erstbeschrieb IVS 1.0 (Stand 12.03.2002): Zwischen Bümpliz und Riedbach behielt die ' +
      'Chaussee bis zum Ausbau von 1964 ihr Profil von 1748. Der Stundenstein bei Oberbottigen wurde 1988 ' +
      'restauriert und am originalen Standort belassen.',
    datierungGeschichte10: '2002-03-12',
    datierungGeschichte20: '2024-11-03',
    gelaendeText:
      'Westlich von Oberbottigen liegt das alte Trassee als Feldweg neben der heutigen Strasse; Randsteine ' +
      'und ein Stundenstein von 1790 erhalten.',
    datierungGelaende20: '2024-06-21',
  },
  {
    signatur: 'BE 7.2.1',
    ebene: 'abschnitt',
    name: 'Bümpliz Dorf – Fellergut',
    parent: 'BE 7.2',
    status: 'freigegeben',
    gemeinden: 'Bern',
    aufnahmejahr: 2024,
  },
  {
    signatur: 'BE 7.2.2',
    ebene: 'abschnitt',
    name: 'Fellergut – Niederbottigen',
    parent: 'BE 7.2',
    status: 'freigegeben',
    gemeinden: 'Bern',
    aufnahmejahr: 2024,
  },
  {
    signatur: 'BE 7.2.3',
    ebene: 'abschnitt',
    name: 'Niederbottigen – Oberbottigen',
    parent: 'BE 7.2',
    status: 'freigegeben',
    gemeinden: 'Bern',
    aufnahmejahr: 2024,
  },
  {
    signatur: 'BE 7.2.4',
    ebene: 'abschnitt',
    name: 'Oberbottigen – Riedbach',
    parent: 'BE 7.2',
    status: 'freigegeben',
    gemeinden: 'Bern',
    aufnahmejahr: 2024,
  },
  {
    signatur: 'BE 7 W1',
    ebene: 'wegbegleiter',
    name: 'Heiliggeist-Kirche',
    parent: 'BE 7',
    status: 'publiziert',
    wegbegleiterTyp: 'Kirche',
    bauzeit: '1726–1729',
    gemeinden: 'Bern',
    aufnahmejahr: 2024,
    substanzgrad: 'viel_substanz',
    geschichteText:
      'Barocke Predigtkirche am Kopf der westlichen Ausfallachse; Ausgangspunkt der Distanzmessung der Murtenstrasse.',
  },
  {
    signatur: 'BE 7 W2',
    ebene: 'wegbegleiter',
    name: 'Burger-Spital',
    parent: 'BE 7',
    status: 'publiziert',
    wegbegleiterTyp: 'Profanes Gebäude',
    bauzeit: '1734–1742',
    gemeinden: 'Bern',
    aufnahmejahr: 2024,
    substanzgrad: 'viel_substanz',
    geschichteText:
      'Spital- und Herbergsbau am Stadtausgang; beherbergte Reisende und Fuhrleute der Murtenstrasse.',
  },
  {
    signatur: 'BE 7 W3',
    ebene: 'wegbegleiter',
    name: 'Stundenstein an der Murtenstrasse',
    parent: 'BE 7',
    status: 'freigegeben',
    wegbegleiterTyp: 'Distanzstein',
    bauzeit: '1790',
    gemeinden: 'Bern',
    aufnahmejahr: 2024,
    substanzgrad: 'viel_substanz',
    geschichteText: 'Stundenstein «II Stunden von Bern» der Setzung von 1790; 1988 restauriert.',
  },
  {
    signatur: 'BE 7 W4',
    ebene: 'wegbegleiter',
    name: 'Gasthaus Bären, Bümpliz',
    parent: 'BE 7',
    status: 'freigegeben',
    wegbegleiterTyp: 'Profanes Gebäude',
    bauzeit: '17. Jh., Umbau 1832',
    gemeinden: 'Bern',
    aufnahmejahr: 2024,
    geschichteText: 'Tavernenwirtschaft an der Chaussee; Pferdewechsel der Postkurse Bern–Murten.',
  },
];

// ---------------------------------------------------------------------------
// BE 21 — Frauenkappelen – Mühleberg – Gümmenen (in Bearbeitung, R-05)
// ---------------------------------------------------------------------------

const BE_21: Vorlage[] = [
  {
    signatur: 'BE 21',
    ebene: 'strecke',
    name: 'Frauenkappelen – Mühleberg – Gümmenen; alte Murtenstrasse',
    parent: null,
    status: 'in_bearbeitung',
    bauzeit: 'Mittelalter; Ausbau 18. Jh.',
    bauherrschaft: 'Gemeine Herrschaft / Stand Bern',
    gemeinden: 'Frauenkappelen, Mühleberg',
    bewertung: {
      geschichte: {
        punkte: 4,
        text: 'Vorgängerin der Chaussee von 1748; mittelalterliche Hauptverbindung zum Saane-Übergang Gümmenen.',
      },
      morphologie: {
        punkte: 3,
        text: 'Weitgehend offene Kulturlandschaft, Hohlwegpassagen erhalten.',
      },
      substanzwert: {
        punkte: 3,
        text: 'Lange Abschnitte mit originaler Kofferung und Hohlwegprofil.',
      },
    },
    geschichteText:
      'Text identisch mit Erstbeschrieb IVS 1.0 (Stand 14.09.1993). Die alte Murtenstrasse verband Bern über ' +
      'Frauenkappelen mit der Saanebrücke von Gümmenen, die seit dem 13. Jahrhundert bezeugt ist ' +
      '(GREMAUD 1875/I: 214). Nach dem Bau der Chaussee durch das Riedbachtal (s. BE 7) sank die Linie zum ' +
      'lokalen Kirch- und Feldweg ab, was ihre Substanz weitgehend konservierte.',
    datierungGeschichte10: '1993-09-14',
    gelaendeText: '',
    bibliografie: 'Flückiger, R. (1993): IVS Dokumentation Kanton Bern, Strecke BE 21.',
    lognotizen: [
      {
        datum: '2026-06-12',
        autor: 'T. Nyffenegger',
        rolle: 'R-04',
        text: 'Arbeitspaket «Wohlensee Süd» zugewiesen an B. Anderegg.',
      },
    ],
  },
  {
    signatur: 'BE 21.1',
    ebene: 'linienfuehrung',
    name: 'Dorfstrecke Frauenkappelen',
    parent: 'BE 21',
    status: 'in_bearbeitung',
    bauzeit: 'Mittelalter',
    bewertung: {
      geschichte: { punkte: 4, text: 'Dorfdurchfahrt mit ältestem Wegverlauf der Strecke.' },
      morphologie: { punkte: 3, text: 'Geschlossenes Dorfbild, anschliessend offene Flur.' },
      substanzwert: { punkte: 3, text: 'Pflästerung und Hohlwegprofil abschnittweise erhalten.' },
    },
    geschichteText:
      'Text identisch mit Erstbeschrieb IVS 1.0 (Stand 14.09.1993). Die Dorfstrecke führt von der Kirche ' +
      'Frauenkappelen westwärts über die Stockere Richtung Mühleberg.',
    datierungGeschichte10: '1993-09-14',
  },
  {
    signatur: 'BE 21.1.1',
    ebene: 'abschnitt',
    name: 'Frauenkappelen Dorf – Stockere',
    parent: 'BE 21.1',
    status: 'in_bearbeitung',
    bauzeit: 'Mittelalter; Kofferung 18. Jh.',
    bauherrschaft: 'Gemeinde',
    bewertung: {
      geschichte: { punkte: 4, text: 'Bedeutender historischer West-Ost-Übergang am Dorfausgang.' },
      morphologie: {
        punkte: 3,
        text: 'Eindrücklicher Verlauf der Flanke entlang, mit Trockenmauern und Obstbaumreihe.',
      },
      substanzwert: {
        punkte: 3,
        text: 'Über weite Strecken originale Wegbreite und Pflästerung erhalten.',
      },
    },
    geschichteText:
      'Text identisch mit Erstbeschrieb IVS 1.0 (Stand 14.09.1993). Der Abschnitt verliess das Dorf westwärts ' +
      'bei der Kirche und stieg über die Stockere zur Geländekante an. Zehntpläne von 1712 zeigen den Weg ' +
      'mit beidseitigen Hägen; die Kofferung dürfte mit dem Ausbau von 1748 zusammenhängen (ANDEREGG 1998: 41).',
    datierungGeschichte10: '1993-09-14',
    gelaendeText:
      'Geländebeschrieb 2025: Der Weg präsentiert sich als 2,5–3 m breiter Feldweg mit talseitiger ' +
      'Trockenmauer (Höhe bis 1,2 m). Im mittleren Teil liegt die originale Pflästerung unter dünner ' +
      'Mergeldecke frei; Querabschläge aus steilgestellten Platten sind an zwei Stellen erhalten.',
    datierungGelaende20: '2025-04-30',
    bibliografie: 'Anderegg, K. (1998): Der bernische Chausseebau im 18. Jahrhundert. Bern.',
    lognotizen: [
      {
        datum: '2026-07-08',
        autor: 'B. Anderegg',
        rolle: 'R-05',
        text: 'Geländebegehung abgeschlossen, Fotos ergänzt; Substanzwert neu begründet.',
      },
    ],
  },
  {
    signatur: 'BE 21.1.2',
    ebene: 'abschnitt',
    name: 'Stockere – Längacher',
    parent: 'BE 21.1',
    status: 'zugewiesen',
    geschichteText: 'Text identisch mit Erstbeschrieb IVS 1.0 (Stand 14.09.1993).',
    datierungGeschichte10: '1993-09-14',
  },
  {
    signatur: 'BE 21.1.3',
    ebene: 'abschnitt',
    name: 'Hohlweg im Zälgli',
    parent: 'BE 21.1',
    status: 'korrektur',
    bewertung: {
      geschichte: { punkte: 3, text: 'Kurzer Rest des mittelalterlichen Verlaufs.' },
      morphologie: { punkte: 4, text: 'Markantes Hohlwegprofil, Tiefe bis 2,5 m.' },
      substanzwert: { punkte: 4, text: 'Ungestörtes Hohlwegprofil mit alter Sohle.' },
    },
    geschichteText:
      'Text identisch mit Erstbeschrieb IVS 1.0 (Stand 14.09.1993). Kurzer Hohlwegrest im Zälgli.',
    datierungGeschichte10: '1993-09-14',
    gelaendeText:
      'Geländebeschrieb 2025: Hohlweg von rund 30 m Länge, Tiefe bis 2,5 m, Sohle unbefestigt.',
    datierungGelaende20: '2025-05-02',
    pruefkommentar:
      'Datierung des Hohlwegs prüfen — «mittelalterlich» ist im Text nicht belegt. Bitte Quelle ergänzen oder Formulierung abschwächen.',
    lognotizen: [
      {
        datum: '2026-07-19',
        autor: 'M. Gerber',
        rolle: 'R-06',
        text: 'Zur Korrektur zurückgewiesen: Datierungsbeleg fehlt.',
      },
    ],
  },
  {
    signatur: 'BE 21.2',
    ebene: 'linienfuehrung',
    name: 'Obere Linie über die Aumatt',
    parent: 'BE 21',
    status: 'zugewiesen',
    geschichteText: 'Text identisch mit Erstbeschrieb IVS 1.0 (Stand 14.09.1993).',
    datierungGeschichte10: '1993-09-14',
  },
  {
    signatur: 'BE 21.2.1',
    ebene: 'abschnitt',
    name: 'Aumatt – Bergli',
    parent: 'BE 21.2',
    status: 'zugewiesen',
  },
  {
    signatur: 'BE 21.2.2',
    ebene: 'abschnitt',
    name: 'Bergli – Fuchsegg',
    parent: 'BE 21.2',
    status: 'in_bearbeitung',
    gelaendeText:
      'Geländebeschrieb 2025 (Entwurf): Wegstück von 1,25 km mit wechselnder Oberfläche — Schotterung, ' +
      'Lockermaterial und zwei kurze Hartbelagspassagen; talseitig durchgehende Böschung.',
    datierungGelaende20: '2025-06-11',
  },
  {
    signatur: 'BE 21 W1',
    ebene: 'wegbegleiter',
    name: 'Gasthaus Traube, Mühleberg',
    parent: 'BE 21',
    status: 'in_bearbeitung',
    wegbegleiterTyp: 'Profanes Gebäude',
    bauzeit: '1671, Umbau 1804',
    substanzgrad: 'viel_substanz',
    gemeinden: 'Mühleberg',
    geschichteText:
      'Taverne an der Dorfdurchfahrt von Mühleberg; Umspannstation der alten Murtenstrasse.',
  },
  {
    signatur: 'BE 21 W2',
    ebene: 'wegbegleiter',
    name: 'Stundenstein bei Frauenkappelen',
    parent: 'BE 21',
    status: 'zugewiesen',
    wegbegleiterTyp: 'Distanzstein',
    bauzeit: '18. Jh.',
  },
  {
    signatur: 'BE 21 W3',
    ebene: 'wegbegleiter',
    name: 'Kirche Mühleberg',
    parent: 'BE 21',
    status: 'zugewiesen',
    wegbegleiterTyp: 'Kirche',
    bauzeit: '12. Jh., Chor 1524',
    substanzgrad: 'viel_substanz',
    gemeinden: 'Mühleberg',
    geschichteText:
      'Kirchort an der alten Murtenstrasse; Ziel der Kirchwege aus den umliegenden Höfen.',
  },
];

// ---------------------------------------------------------------------------
// BE 22 — Frauenkappelen – Wohlen (in Prüfung, R-06)
// ---------------------------------------------------------------------------

const BE_22: Vorlage[] = [
  {
    signatur: 'BE 22',
    ebene: 'strecke',
    name: 'Frauenkappelen – Wohlen; Wohleistrasse',
    parent: null,
    status: 'in_pruefung',
    nhgWert: 'regional',
    bauzeit: 'Spätmittelalter',
    gemeinden: 'Frauenkappelen, Wohlen bei Bern',
    bewertung: {
      geschichte: {
        punkte: 3,
        text: 'Kirch- und Marktweg zwischen den Kirchgemeinden Frauenkappelen und Wohlen.',
      },
      morphologie: {
        punkte: 3,
        text: 'Abwechslungsreiche Führung durch Wald und offene Flur zum Wohlensee.',
      },
      substanzwert: { punkte: 2, text: 'Substanz auf die Waldpassagen beschränkt.' },
    },
    geschichteText:
      'Text identisch mit Erstbeschrieb IVS 1.0 (Stand 03.05.1994). Die Wohleistrasse verband die Dörfer am ' +
      'Südufer des Wohlensees; als Kirchweg nach Wohlen ist sie 1481 erstmals erwähnt (BÜTTNER 1953: 583).',
    datierungGeschichte10: '1994-05-03',
    gelaendeText:
      'Geländebeschrieb 2025: Führung grösstenteils auf heutigen Flurstrassen; Substanz in den Waldstücken.',
    datierungGelaende20: '2025-03-18',
    bibliografie:
      'Büttner, H. (1953): Studien zur Geschichte der Kirchgemeinden des Berner Mittellandes. Bern.',
  },
  {
    signatur: 'BE 22.1',
    ebene: 'linienfuehrung',
    name: 'Untere Linie am Talbach',
    parent: 'BE 22',
    status: 'bereit_zur_pruefung',
    nhgWert: 'regional',
    geschichteText:
      'Text identisch mit Erstbeschrieb IVS 1.0 (Stand 03.05.1994). Ältere, talnahe Führung.',
    datierungGeschichte10: '1994-05-03',
    gelaendeText:
      'Geländebeschrieb 2025: Zwei kurze Wegstücke mit Lockermaterial-Oberfläche beidseits des Talbachs.',
    datierungGelaende20: '2025-03-18',
  },
  {
    signatur: 'BE 22.1.1',
    ebene: 'abschnitt',
    name: 'Salzmatt – Talbach',
    parent: 'BE 22.1',
    status: 'bereit_zur_pruefung',
    nhgWert: 'regional',
  },
  {
    signatur: 'BE 22.1.2',
    ebene: 'abschnitt',
    name: 'Talbach – Eichholz',
    parent: 'BE 22.1',
    status: 'bereit_zur_pruefung',
    nhgWert: 'regional',
  },
  {
    signatur: 'BE 22.2',
    ebene: 'linienfuehrung',
    name: 'Obere Linie über die Salzmatt',
    parent: 'BE 22',
    status: 'in_pruefung',
    nhgWert: 'regional',
    bewertung: {
      geschichte: { punkte: 3, text: 'Jüngere Umfahrung der feuchten Tallage.' },
      morphologie: { punkte: 3, text: 'Aussichtsreiche Kantenlage mit Einzelbäumen.' },
      substanzwert: { punkte: 2, text: 'Oberflächen überprägt, Wegbegrenzungen erhalten.' },
    },
    geschichteText:
      'Text identisch mit Erstbeschrieb IVS 1.0 (Stand 03.05.1994). Die obere Linie umging die Nässe der ' +
      'Talbachsenke und wurde im 19. Jahrhundert zur Hauptführung.',
    datierungGeschichte10: '1994-05-03',
    gelaendeText:
      'Geländebeschrieb 2025: Feldweg in Kantenlage; die Linde am Kirchweg markiert die Abzweigung.',
    datierungGelaende20: '2025-03-19',
    pruefkommentar: '',
  },
  {
    signatur: 'BE 22.2.1',
    ebene: 'abschnitt',
    name: 'Salzmatt – Hostatt',
    parent: 'BE 22.2',
    status: 'in_pruefung',
    nhgWert: 'regional',
    gelaendeText:
      'Geländebeschrieb 2025: Feldweg in Kantenlage mit gut erhaltenem Wegrand; ' +
      'der Wegrand ist im mittleren Teil durch Viehtritt stellenweise erodiert.',
    datierungGelaende20: '2025-03-19',
  },
  {
    signatur: 'BE 22.2.2',
    ebene: 'abschnitt',
    name: 'Hostatt – Wohleiwald',
    parent: 'BE 22.2',
    status: 'in_pruefung',
    nhgWert: 'regional',
  },
  {
    signatur: 'BE 22 W1',
    ebene: 'wegbegleiter',
    name: 'Linde am Kirchweg',
    parent: 'BE 22',
    status: 'bereit_zur_pruefung',
    wegbegleiterTyp: 'Einzelbaum',
    nhgWert: 'regional',
    bauzeit: 'gepflanzt um 1820',
    geschichteText: 'Markante Wegmarke an der Verzweigung der oberen und unteren Linie.',
  },
];

// ---------------------------------------------------------------------------
// BE 23 — Riedbach – Frauenkappelen; Kirchweg (Backlog, R-05 L. Furrer)
// ---------------------------------------------------------------------------

const BE_23: Vorlage[] = [
  {
    signatur: 'BE 23',
    ebene: 'strecke',
    name: 'Riedbach – Frauenkappelen; alter Kirchweg',
    parent: null,
    status: 'zugewiesen',
    zustaendigName: 'L. Furrer',
    nhgWert: 'lokal',
    bauzeit: 'Mittelalter',
    gemeinden: 'Bern, Frauenkappelen',
    geschichteText:
      'Text identisch mit Erstbeschrieb IVS 1.0 (Stand 14.09.1993). Höhenweg über Matzwil, Vorgänger der Talstrasse.',
    datierungGeschichte10: '1993-09-14',
  },
  {
    signatur: 'BE 23.1',
    ebene: 'linienfuehrung',
    name: 'Alte Kirchgasse',
    parent: 'BE 23',
    status: 'zugewiesen',
    zustaendigName: 'L. Furrer',
    nhgWert: 'lokal',
  },
  {
    signatur: 'BE 23.1.1',
    ebene: 'abschnitt',
    name: 'Kirchgasse Frauenkappelen',
    parent: 'BE 23.1',
    status: 'zugewiesen',
    zustaendigName: 'L. Furrer',
    nhgWert: 'lokal',
  },
  {
    signatur: 'BE 23.2',
    ebene: 'linienfuehrung',
    name: 'Linie über Matzwil',
    parent: 'BE 23',
    status: 'zugewiesen',
    zustaendigName: 'L. Furrer',
    nhgWert: 'lokal',
  },
  {
    signatur: 'BE 23.2.1',
    ebene: 'abschnitt',
    name: 'Riedbach – Matzwil',
    parent: 'BE 23.2',
    status: 'zugewiesen',
    zustaendigName: 'L. Furrer',
    nhgWert: 'lokal',
  },
];

// ---------------------------------------------------------------------------
// BE 35 — Bern – Oberwangen – Thörishaus; Freiburgstrasse
// (geprüft, wartet auf Freigabe durch R-03)
// ---------------------------------------------------------------------------

const BE_35: Vorlage[] = [
  {
    signatur: 'BE 35',
    ebene: 'strecke',
    name: 'Bern – Oberwangen – Thörishaus (– Freiburg); Freiburgstrasse',
    parent: null,
    status: 'geprueft',
    bauzeit: 'Mittelalter; Ausbau um 1770',
    bauherrschaft: 'Stand Bern',
    gemeinden: 'Köniz',
    aufnahmejahr: 2024,
    bewertung: {
      geschichte: {
        punkte: 3,
        text: 'Landstrasse nach Freiburg durch das Wangental, Post- und Marktweg.',
      },
      morphologie: {
        punkte: 3,
        text: 'Talstrasse in offener Kulturlandschaft mit erhaltenen Wegräumen.',
      },
      substanzwert: {
        punkte: 3,
        text: 'Abschnittweise alte Wegbreite mit Brunnen- und Gasthausstandorten.',
      },
    },
    geschichteText:
      'Text identisch mit Erstbeschrieb IVS 1.0 (Stand 22.06.1994). Die Freiburgstrasse führte vom ' +
      'Obertor durch das Wangental über Oberwangen und Thörishaus zur Sensebrücke an der Grenze ' +
      'gegen Freiburg; als Post- und Marktweg um 1770 chausseemässig ausgebaut.',
    datierungGeschichte10: '1994-06-22',
    gelaendeText:
      'Geländebeschrieb 2024: Verlauf zwischen Oberwangen und Thörishaus als Tal- und Feldstrasse ' +
      'neben der heutigen Hauptstrasse erhalten.',
    datierungGelaende20: '2024-09-12',
    pruefkommentar:
      'Prüfung abgeschlossen 05.07.2026 (M. Gerber). Terminologie und Datierungen konsistent.',
    lognotizen: [
      {
        datum: '2026-07-05',
        autor: 'M. Gerber',
        rolle: 'R-06',
        text: 'Fachliche Prüfung abgeschlossen, keine offenen Befunde.',
      },
    ],
  },
  {
    signatur: 'BE 35.1',
    ebene: 'linienfuehrung',
    name: 'Oberwangen – Thörishaus',
    parent: 'BE 35',
    status: 'geprueft',
    aufnahmejahr: 2024,
    bewertung: {
      geschichte: { punkte: 3, text: 'Hauptführung durch das Wangental.' },
      morphologie: { punkte: 3, text: 'Dörfliche Wegräume mit Brunnen.' },
      substanzwert: { punkte: 2, text: 'Oberflächen modern, Raumwirkung intakt.' },
    },
    geschichteText: 'Text identisch mit Erstbeschrieb IVS 1.0 (Stand 22.06.1994).',
    datierungGeschichte10: '1994-06-22',
  },
  {
    signatur: 'BE 35.1.1',
    ebene: 'abschnitt',
    name: 'Oberwangen Dorf – Stegacker',
    parent: 'BE 35.1',
    status: 'geprueft',
    gemeinden: 'Köniz',
    aufnahmejahr: 2024,
  },
  {
    signatur: 'BE 35.1.2',
    ebene: 'abschnitt',
    name: 'Stegacker – Bruchmatt',
    parent: 'BE 35.1',
    status: 'geprueft',
    gemeinden: 'Köniz',
    aufnahmejahr: 2024,
  },
  {
    signatur: 'BE 35.1.3',
    ebene: 'abschnitt',
    name: 'Bruchmatt – Thörishaus Dorf',
    parent: 'BE 35.1',
    status: 'geprueft',
    gemeinden: 'Köniz',
    aufnahmejahr: 2024,
  },
  {
    signatur: 'BE 35 W1',
    ebene: 'wegbegleiter',
    name: 'Gasthaus zum Hähli',
    parent: 'BE 35',
    status: 'geprueft',
    wegbegleiterTyp: 'Profanes Gebäude',
    bauzeit: '1788',
    gemeinden: 'Köniz',
    aufnahmejahr: 2024,
    geschichteText:
      'Wirtshaus an der Strasse in Thörishaus; Zoll- und Umspannstation vor der Sensebrücke.',
  },
  {
    signatur: 'BE 35 W2',
    ebene: 'wegbegleiter',
    name: 'Dorfbrunnen Thörishaus',
    parent: 'BE 35',
    status: 'geprueft',
    wegbegleiterTyp: 'Brunnen',
    bauzeit: '1841',
    gemeinden: 'Köniz',
    aufnahmejahr: 2024,
    geschichteText: 'Tränkebrunnen am Dorfplatz, Rastpunkt der Fuhrwerke vor dem Grenzübergang.',
  },
];

export const SEED_OBJEKTE: IvsObjekt[] = [...BE_7, ...BE_21, ...BE_22, ...BE_23, ...BE_35].map(
  objektAusVorlage,
);
