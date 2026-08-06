import { IvsObjekt, NhgWert, Substanzgrad, WorkflowStatus, bewertungMittel } from './model';

/**
 * Gemeinsame Attributfilter für Dashboard und Objekte-Übersicht
 * (Entscheid 84): Alle sinnvollen Objekt-Attribute sind filterbar, die
 * Karte folgt den Filtern. «Zuständige Person» steht den Paketrollen
 * R-03/R-04 zur Verfügung, «Kantonspaket» nur R-03 (Entscheid 85).
 */
export interface AttributFilter {
  status: 'alle' | WorkflowStatus;
  bedeutung: 'alle' | NhgWert;
  substanz: 'alle' | Substanzgrad;
  /** Kanton-Kürzel oder 'alle'. */
  kanton: 'alle' | string;
  /** Teilstring der Gemeinden, leer = kein Filter. */
  gemeinde: string;
  /** Aufnahmejahr als Text ('2024', '2025') oder 'alle'. */
  aufnahmejahr: 'alle' | string;
  /** Mindest-Durchschnitt der NHG-Bewertung ('1'–'3') oder 'alle'. */
  bewertungMin: 'alle' | string;
  inexistent: 'alle' | 'nur' | 'ohne';
  /** Name der zuständigen Person, OHNE_PERSON oder 'alle' (nur R-03/R-04). */
  person: 'alle' | string;
  /** 'alle' oder `kanton:<Kürzel>` — Kantonspakete, nur R-03 (Entscheid 85). */
  paket: string;
}

/** Filterwert für «ohne Zuweisung» (Status «Offen», Entscheid 79). */
export const OHNE_PERSON = '__ohne';

export function leererAttributFilter(): AttributFilter {
  return {
    status: 'alle',
    bedeutung: 'alle',
    substanz: 'alle',
    kanton: 'alle',
    gemeinde: '',
    aufnahmejahr: 'alle',
    bewertungMin: 'alle',
    inexistent: 'alle',
    person: 'alle',
    paket: 'alle',
  };
}

export function attributFilterAktiv(f: AttributFilter): boolean {
  return (
    f.status !== 'alle' ||
    f.bedeutung !== 'alle' ||
    f.substanz !== 'alle' ||
    f.kanton !== 'alle' ||
    f.gemeinde.trim() !== '' ||
    f.aufnahmejahr !== 'alle' ||
    f.bewertungMin !== 'alle' ||
    f.inexistent !== 'alle' ||
    f.person !== 'alle' ||
    f.paket !== 'alle'
  );
}

/** Gemeinsames Filterprädikat für Dashboard und Objekte-Übersicht. */
export function passtAttributFilter(o: IvsObjekt, f: AttributFilter): boolean {
  if (f.status !== 'alle' && o.status !== f.status) return false;
  if (f.bedeutung !== 'alle' && o.nhgWert !== f.bedeutung) return false;
  if (f.substanz !== 'alle' && o.substanzgrad !== f.substanz) return false;
  if (f.kanton !== 'alle' && o.kanton !== f.kanton) return false;
  if (f.gemeinde.trim()) {
    if (!o.gemeinden.toLowerCase().includes(f.gemeinde.trim().toLowerCase())) return false;
  }
  if (f.aufnahmejahr !== 'alle' && String(o.aufnahmejahr) !== f.aufnahmejahr) return false;
  if (f.bewertungMin !== 'alle') {
    const mittel = bewertungMittel(o.bewertung);
    if (mittel === null || mittel < Number(f.bewertungMin)) return false;
  }
  if (f.inexistent === 'nur' && !o.inexistent) return false;
  if (f.inexistent === 'ohne' && o.inexistent) return false;
  if (f.person !== 'alle') {
    if (f.person === OHNE_PERSON) {
      if (o.zustaendigName) return false;
    } else if (o.zustaendigName !== f.person) {
      return false;
    }
  }
  if (f.paket !== 'alle' && f.paket.startsWith('kanton:')) {
    if (o.kanton !== f.paket.slice('kanton:'.length)) return false;
  }
  return true;
}
