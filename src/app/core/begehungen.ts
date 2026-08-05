import { Injectable, effect, signal } from '@angular/core';
import { RolleId } from './model';

/**
 * Begehungen (Feldarbeit, Entscheid 89) in zwei Stufen:
 *
 * 1. **Anforderung** — jede fachliche Rolle (R-03…R-07) kann eine Begehung
 *    anfordern: für ein Objekt (auch eine ganze Strecke) oder an einem
 *    frei gewählten Kartenpunkt, mit Begründung. Ohne Datum und Logistik.
 * 2. **Begehung** — die Fachliche Administration (R-03) plant fix: Titel,
 *    Datum, Logistik (Verkehrsmittel, Unterkunft, Zeitbedarf) und die
 *    Reihenfolge der Ziele. Offene Anforderungen lassen sich dabei
 *    übernehmen und gelten dann als eingeplant.
 */

/** Begehungen fix planen darf nur die Fachliche Administration (Entscheid 89). */
export function darfBegehungPlanen(rolle: RolleId): boolean {
  return rolle === 'R-03';
}

/** Anfordern dürfen alle fachlichen Rollen. */
export function darfBegehungAnfordern(rolle: RolleId): boolean {
  return ['R-03', 'R-04', 'R-05', 'R-06', 'R-07'].includes(rolle);
}

export type Verkehrsmittel = 'zu_fuss' | 'velo' | 'oev' | 'auto';

export const VERKEHRSMITTEL_LABEL: Record<Verkehrsmittel, string> = {
  zu_fuss: 'Zu Fuss',
  velo: 'Velo',
  oev: 'öV',
  auto: 'Auto',
};

/** Ein Ziel einer Begehung: Objekt (Signatur) oder freier Kartenpunkt. */
export interface BegehungsZiel {
  /** Objekt-Signatur — null bei einem freien Kartenpunkt. */
  signatur: string | null;
  /** Bezeichnung des freien Punkts (bei Objekten leer). */
  bezeichnung: string;
  /** Kartenposition des freien Punkts (Objekte haben ihre Geometrie). */
  position: { lon: number; lat: number } | null;
}

export interface Begehung {
  id: string;
  titel: string;
  datum: string; // ISO-Datum
  verkehrsmittel: Verkehrsmittel;
  unterkunft: string;
  zeitbedarfStunden: number | null;
  /** Die zu begehenden Ziele, in Reihenfolge. */
  ziele: BegehungsZiel[];
}

/** Angeforderte Begehung — wird von R-03 in eine Begehung übernommen. */
export interface BegehungsAnforderung {
  id: string;
  /** Objekt-Signatur — null bei einem freien Kartenpunkt. */
  signatur: string | null;
  /** Kartenposition des freien Punkts. */
  position: { lon: number; lat: number } | null;
  /** Bezeichnung des Punkts bzw. Zusatz zum Objekt. */
  bezeichnung: string;
  begruendung: string;
  autor: string;
  rolle: RolleId;
  datum: string; // ISO-Datum der Anforderung
  /** Id der Begehung nach der Einplanung, sonst null (offen). */
  begehungId: string | null;
}

const SEED_VERSION = 2;

const SEED_BEGEHUNGEN: Begehung[] = [
  {
    id: 'b1',
    titel: 'Nachkontrolle Frauenkappelen',
    datum: '2026-08-12',
    verkehrsmittel: 'zu_fuss',
    unterkunft: '—',
    zeitbedarfStunden: 6,
    ziele: [
      { signatur: 'BE 21.1.1', bezeichnung: '', position: null },
      { signatur: 'BE 21.1.3', bezeichnung: '', position: null },
      { signatur: 'BE 22 W1', bezeichnung: '', position: null },
    ],
  },
];

const SEED_ANFORDERUNGEN: BegehungsAnforderung[] = [
  {
    id: 'a1',
    signatur: 'BE 35',
    position: null,
    bezeichnung: '',
    begruendung:
      'Für die übergreifende Prüfung braucht es einen aktuellen Augenschein der Wegräume zwischen Oberwangen und Thörishaus.',
    autor: 'S. Koch',
    rolle: 'R-07',
    datum: '2026-07-28',
    begehungId: null,
  },
  {
    id: 'a2',
    signatur: null,
    position: { lon: 7.2549, lat: 46.9641 },
    bezeichnung: 'Mögliche Hohlweg-Fortsetzung im Zälgli',
    begruendung: 'Verlauf im Feld klären — gehört das Teilstück noch zu BE 21.1.3?',
    autor: 'B. Anderegg',
    rolle: 'R-05',
    datum: '2026-08-02',
    begehungId: null,
  },
];

interface Ablage {
  version: number;
  begehungen: Begehung[];
  anforderungen: BegehungsAnforderung[];
}

const STORAGE_KEY = 'ivs-prototyp-v3.begehungen';

@Injectable({ providedIn: 'root' })
export class BegehungsStore {
  private readonly stand = signal(laden());

  readonly alle = () => this.stand().begehungen;
  readonly anforderungen = () => this.stand().anforderungen;

  constructor() {
    effect(() => {
      const ablage: Ablage = { version: SEED_VERSION, ...this.stand() };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ablage));
      } catch {
        // ohne Persistenz weiterfahren
      }
    });
  }

  /**
   * Begehung fix planen (R-03). `anforderungsIds` sind die dabei
   * übernommenen Anforderungen — sie gelten danach als eingeplant.
   */
  hinzufuegen(begehung: Omit<Begehung, 'id'>, anforderungsIds: readonly string[] = []): void {
    const id = `b${Math.random().toString(36).slice(2, 10)}`;
    const uebernommen = new Set(anforderungsIds);
    this.stand.update((s) => ({
      ...s,
      begehungen: [...s.begehungen, { ...begehung, id }],
      anforderungen: s.anforderungen.map((a) =>
        uebernommen.has(a.id) ? { ...a, begehungId: id } : a,
      ),
    }));
  }

  /** Begehung löschen — eingeplante Anforderungen werden wieder offen. */
  loeschen(id: string): void {
    this.stand.update((s) => ({
      ...s,
      begehungen: s.begehungen.filter((b) => b.id !== id),
      anforderungen: s.anforderungen.map((a) =>
        a.begehungId === id ? { ...a, begehungId: null } : a,
      ),
    }));
  }

  /** Ziel innerhalb der Begehung nach oben/unten verschieben. */
  verschieben(id: string, index: number, richtung: -1 | 1): void {
    this.stand.update((s) => ({
      ...s,
      begehungen: s.begehungen.map((b) => {
        if (b.id !== id) return b;
        const ziel = index + richtung;
        if (ziel < 0 || ziel >= b.ziele.length) return b;
        const ziele = [...b.ziele];
        [ziele[index], ziele[ziel]] = [ziele[ziel], ziele[index]];
        return { ...b, ziele };
      }),
    }));
  }

  /** Begehung anfordern (alle fachlichen Rollen, Entscheid 89). */
  anfordern(anforderung: Omit<BegehungsAnforderung, 'id' | 'begehungId'>): void {
    const id = `a${Math.random().toString(36).slice(2, 10)}`;
    this.stand.update((s) => ({
      ...s,
      anforderungen: [...s.anforderungen, { ...anforderung, id, begehungId: null }],
    }));
  }

  anforderungLoeschen(id: string): void {
    this.stand.update((s) => ({
      ...s,
      anforderungen: s.anforderungen.filter((a) => a.id !== id),
    }));
  }

  zuruecksetzen(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.stand.set(seedStand());
  }
}

function seedStand(): { begehungen: Begehung[]; anforderungen: BegehungsAnforderung[] } {
  return {
    begehungen: SEED_BEGEHUNGEN.map((b) => ({ ...b, ziele: b.ziele.map((z) => ({ ...z })) })),
    anforderungen: SEED_ANFORDERUNGEN.map((a) => ({ ...a })),
  };
}

function laden(): { begehungen: Begehung[]; anforderungen: BegehungsAnforderung[] } {
  try {
    const roh = localStorage.getItem(STORAGE_KEY);
    if (roh) {
      const ablage = JSON.parse(roh) as Ablage;
      if (ablage.version === SEED_VERSION && Array.isArray(ablage.begehungen)) {
        return { begehungen: ablage.begehungen, anforderungen: ablage.anforderungen ?? [] };
      }
    }
  } catch {
    // defekter Stand — neu seeden
  }
  return seedStand();
}
