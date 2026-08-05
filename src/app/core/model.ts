/**
 * Datenmodell des IVS-Prototyps.
 *
 * Führendes Fachkonzept ist die IVS-Signatur (z. B. «BE 21», «BE 21.1»,
 * «BE 21.1.2»). Für URLs wird daraus eine technische Id abgeleitet
 * (`idAusSignatur`), Wegbegleiter tragen eine eigene Signatur im Schema
 * «BE 21 W1» — angezeigt wird bei ihnen nur der Name.
 */

export type Ebene = 'strecke' | 'linienfuehrung' | 'abschnitt' | 'wegbegleiter';

export const EBENE_LABEL: Record<Ebene, string> = {
  strecke: 'Strecke',
  linienfuehrung: 'Linienführung',
  abschnitt: 'Abschnitt',
  wegbegleiter: 'Wegbegleiter',
};

/** Die acht verbindlichen Workflow-Stati (Fachkontext Abschnitt 7). */
export type WorkflowStatus =
  | 'zugewiesen'
  | 'in_bearbeitung'
  | 'bereit_zur_pruefung'
  | 'in_pruefung'
  | 'korrektur'
  | 'geprueft'
  | 'freigegeben'
  | 'publiziert';

export type RolleId = 'R-01' | 'R-02' | 'R-03' | 'R-04' | 'R-05' | 'R-06' | 'R-07' | 'R-08';

export type NhgWert = 'national' | 'regional' | 'lokal';

export type Substanzgrad = 'viel_substanz' | 'mit_substanz' | 'wenig_substanz' | 'ohne_substanz';

export const NHG_LABEL: Record<NhgWert, string> = {
  national: 'national',
  regional: 'regional',
  lokal: 'lokal',
};

export const SUBSTANZGRAD_LABEL: Record<Substanzgrad, string> = {
  viel_substanz: 'Viel Substanz',
  mit_substanz: 'Mit Substanz',
  wenig_substanz: 'Wenig Substanz',
  ohne_substanz: 'Ohne Substanz',
};

/** Ein Teil der NHG-Bewertung: 0–4 Punkte plus Begründungstext. */
export interface BewertungsTeil {
  /** null = noch nicht bewertet (z. B. Wegbegleiter) */
  punkte: number | null;
  text: string;
}

export interface Bewertung {
  geschichte: BewertungsTeil;
  morphologie: BewertungsTeil;
  substanzwert: BewertungsTeil;
}

export interface Lognotiz {
  datum: string; // ISO-Datum
  autor: string;
  rolle: RolleId;
  text: string;
}

/** Antwort auf eine Prüffrage; bei «nein» ist die Begründung Pflicht. */
export interface PruefAntwort {
  antwort: 'ja' | 'nein' | null;
  begruendung: string;
}

/**
 * Prüfprotokoll des Fachlektorats am Objekt (Fragenkatalog und Regeln in
 * core/pruefprotokoll.ts). `abschluss` vermerkt die letzte Prüfrunde.
 */
export interface Pruefprotokoll {
  antworten: Record<string, PruefAntwort>;
  abschluss: {
    datum: string;
    autor: string;
    rolle: RolleId;
    ergebnis: 'geprueft' | 'korrektur';
  } | null;
}

export interface IvsObjekt {
  /** Technische Id für URLs, abgeleitet aus der Signatur («be-21-1-2»). */
  id: string;
  signatur: string;
  ebene: Ebene;
  name: string;
  /** Signatur des übergeordneten Objekts, null bei Strecken. */
  parent: string | null;
  status: WorkflowStatus;
  zustaendigRolle: RolleId;
  zustaendigName: string;
  /** Orthogonales Kennzeichen mit Pflichtbegründung (07.16). */
  inexistent: { seit: string; begruendung: string } | null;

  // Eckdaten
  nhgWert: NhgWert;
  substanzgrad: Substanzgrad | null;
  bauzeit: string;
  bauherrschaft: string;
  planer: string;
  kanton: 'BE';
  gemeinden: string;
  aufnahmejahr: number | null;
  /** Objektart bei Wegbegleitern (Kirche, Distanzstein, …). */
  wegbegleiterTyp?: string;
  /**
   * Gesetzt bei Kunstbauten (Brücke, Stützmauer, …) — sie sind spezifische
   * Abschnitte (ebene 'abschnitt') mit eigener Liniengeometrie.
   */
  kunstbauteTyp?: string;

  // Schutzbegründung / Bewertung [NHG 5.1.b]
  bewertung: Bewertung;

  // Empfehlungen
  erhaltungsziel: string;
  gefahrenMassnahmen: string;

  // Geschichte & Gelände
  geschichteText: string;
  datierungGeschichte10: string | null;
  datierungGeschichte20: string | null;
  gelaendeText: string;
  datierungGelaende20: string | null;

  // Anhang
  bibliografie: string;

  // Prüfen / Freigabe
  pruefkommentar: string;
  /** Prüfprotokoll des Fachlektorats — fehlt, solange nie geprüft wurde. */
  pruefprotokoll?: Pruefprotokoll;

  lognotizen: Lognotiz[];
}

/**
 * Objekttyp für Beschriftung und Legende — überall einheitlich verwendet
 * (Hierarchie-Dropdown, MapTip, Kartenbild-Panel, Objektlisten).
 *
 * Abschnitte werden nach Substanz unterschieden; «wenig/ohne Substanz» läuft
 * unter «Abschnitt mit Substanz» (die Taxonomie kennt nur zwei Stufen plus
 * die Kunstbaute als spezifischen Abschnitt).
 */
export type ObjektTyp =
  | 'strecke'
  | 'linienfuehrung'
  | 'abschnitt_substanz'
  | 'abschnitt_viel_substanz'
  | 'kunstbaute'
  | 'wegbegleiter';

export function objektTyp(
  o: Pick<IvsObjekt, 'ebene' | 'substanzgrad' | 'kunstbauteTyp'>,
): ObjektTyp {
  switch (o.ebene) {
    case 'strecke':
      return 'strecke';
    case 'linienfuehrung':
      return 'linienfuehrung';
    case 'wegbegleiter':
      return 'wegbegleiter';
    case 'abschnitt':
      if (o.kunstbauteTyp) return 'kunstbaute';
      return o.substanzgrad === 'viel_substanz' ? 'abschnitt_viel_substanz' : 'abschnitt_substanz';
  }
}

export const OBJEKT_TYP_LABEL: Record<ObjektTyp, string> = {
  strecke: 'Strecke',
  linienfuehrung: 'Linienführung',
  abschnitt_substanz: 'Abschnitt mit Substanz',
  abschnitt_viel_substanz: 'Abschnitt mit viel Substanz',
  kunstbaute: 'Kunstbaute',
  wegbegleiter: 'Wegbegleiter',
};

/**
 * Beschriftung des Typ-Tags: bei Kunstbauten und Wegbegleitern wird die
 * konkrete Art angezeigt («Kunstbaute (Brücke)», «Kirche»).
 */
export function objektTypText(
  o: Pick<IvsObjekt, 'ebene' | 'substanzgrad' | 'kunstbauteTyp' | 'wegbegleiterTyp'>,
): string {
  const typ = objektTyp(o);
  if (typ === 'kunstbaute' && o.kunstbauteTyp) return `Kunstbaute (${o.kunstbauteTyp})`;
  if (typ === 'wegbegleiter' && o.wegbegleiterTyp) return o.wegbegleiterTyp;
  return OBJEKT_TYP_LABEL[typ];
}

/** «BE 21.1.2» → «be-21-1-2», «BE 21 W1» → «be-21-w1» */
export function idAusSignatur(signatur: string): string {
  return signatur.toLowerCase().replace(/[\s.]+/g, '-');
}

/** Durchschnitt der drei Bewertungsteile, null wenn keiner bewertet ist. */
export function bewertungMittel(b: Bewertung): number | null {
  const punkte = [b.geschichte.punkte, b.morphologie.punkte, b.substanzwert.punkte].filter(
    (p): p is number => p !== null,
  );
  if (punkte.length === 0) return null;
  return punkte.reduce((s, p) => s + p, 0) / punkte.length;
}

export function bewertungText(b: Bewertung): string {
  const m = bewertungMittel(b);
  return m === null ? '—' : `Ø ${m.toLocaleString('de-CH', { maximumFractionDigits: 1 })}/4`;
}
