import { Injectable, effect, signal } from '@angular/core';
import { RolleId } from './model';

/**
 * Begehungsplanung (Feldarbeit): Eine Begehung bündelt Objekte in einer
 * festgelegten Reihenfolge und hält die Logistik fest — Verkehrsmittel,
 * Unterkunft und Zeitbedarf. Eigener Tab «Begehungen»; planbar auch direkt
 * aus der Objektbearbeitung.
 */

/** Begehungen planen dürfen nur diese Rollen (Review-Vorgabe). */
export const BEGEHUNGS_PLANER: readonly RolleId[] = ['R-03', 'R-04', 'R-06', 'R-07'];

export function darfBegehungPlanen(rolle: RolleId): boolean {
  return BEGEHUNGS_PLANER.includes(rolle);
}

export type Verkehrsmittel = 'zu_fuss' | 'velo' | 'oev' | 'auto';

export const VERKEHRSMITTEL_LABEL: Record<Verkehrsmittel, string> = {
  zu_fuss: 'Zu Fuss',
  velo: 'Velo',
  oev: 'öV',
  auto: 'Auto',
};

export interface Begehung {
  id: string;
  titel: string;
  datum: string; // ISO-Datum
  verkehrsmittel: Verkehrsmittel;
  unterkunft: string;
  zeitbedarfStunden: number | null;
  /** Signaturen der zu begehenden Objekte, in Reihenfolge. */
  objekte: string[];
}

const SEED_VERSION = 1;

const SEED_BEGEHUNGEN: Begehung[] = [
  {
    id: 'b1',
    titel: 'Nachkontrolle Frauenkappelen',
    datum: '2026-08-12',
    verkehrsmittel: 'zu_fuss',
    unterkunft: '—',
    zeitbedarfStunden: 6,
    objekte: ['BE 21.1.1', 'BE 21.1.3', 'BE 22 W1'],
  },
];

interface Ablage {
  version: number;
  begehungen: Begehung[];
}

const STORAGE_KEY = 'ivs-prototyp-v3.begehungen';

@Injectable({ providedIn: 'root' })
export class BegehungsStore {
  private readonly begehungen = signal<Begehung[]>(laden());

  readonly alle = this.begehungen.asReadonly();

  constructor() {
    effect(() => {
      const ablage: Ablage = { version: SEED_VERSION, begehungen: this.begehungen() };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ablage));
      } catch {
        // ohne Persistenz weiterfahren
      }
    });
  }

  hinzufuegen(begehung: Omit<Begehung, 'id'>): void {
    const id = `b${Math.random().toString(36).slice(2, 10)}`;
    this.begehungen.update((liste) => [...liste, { ...begehung, id }]);
  }

  loeschen(id: string): void {
    this.begehungen.update((liste) => liste.filter((b) => b.id !== id));
  }

  /** Objekt innerhalb der Begehung nach oben/unten verschieben. */
  verschieben(id: string, index: number, richtung: -1 | 1): void {
    this.begehungen.update((liste) =>
      liste.map((b) => {
        if (b.id !== id) return b;
        const ziel = index + richtung;
        if (ziel < 0 || ziel >= b.objekte.length) return b;
        const objekte = [...b.objekte];
        [objekte[index], objekte[ziel]] = [objekte[ziel], objekte[index]];
        return { ...b, objekte };
      }),
    );
  }

  zuruecksetzen(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.begehungen.set(SEED_BEGEHUNGEN.map((b) => ({ ...b, objekte: [...b.objekte] })));
  }
}

function laden(): Begehung[] {
  try {
    const roh = localStorage.getItem(STORAGE_KEY);
    if (roh) {
      const ablage = JSON.parse(roh) as Ablage;
      if (ablage.version === SEED_VERSION && Array.isArray(ablage.begehungen)) return ablage.begehungen;
    }
  } catch {
    // defekter Stand — neu seeden
  }
  return SEED_BEGEHUNGEN.map((b) => ({ ...b, objekte: [...b.objekte] }));
}
