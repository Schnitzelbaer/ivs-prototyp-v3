import { Injectable, computed, effect, signal } from '@angular/core';

/**
 * Kantonspakete (Entscheid 82): Alle 26 Kantone sind aufgelistet und lassen
 * sich — auch ohne Testdaten, testweise — einer Regionalen Koordination
 * zuweisen. Die Zuweisung ist persistent und änderbar; der Workflow-Status
 * der Objekte bleibt davon unberührt (erst die Zuweisung an eine Person
 * setzt «Zugewiesen», Entscheid 79).
 */

/** Die 26 Kantone in offizieller Reihenfolge. */
export const KANTONE: readonly { kuerzel: string; name: string }[] = [
  { kuerzel: 'ZH', name: 'Zürich' },
  { kuerzel: 'BE', name: 'Bern' },
  { kuerzel: 'LU', name: 'Luzern' },
  { kuerzel: 'UR', name: 'Uri' },
  { kuerzel: 'SZ', name: 'Schwyz' },
  { kuerzel: 'OW', name: 'Obwalden' },
  { kuerzel: 'NW', name: 'Nidwalden' },
  { kuerzel: 'GL', name: 'Glarus' },
  { kuerzel: 'ZG', name: 'Zug' },
  { kuerzel: 'FR', name: 'Freiburg' },
  { kuerzel: 'SO', name: 'Solothurn' },
  { kuerzel: 'BS', name: 'Basel-Stadt' },
  { kuerzel: 'BL', name: 'Basel-Landschaft' },
  { kuerzel: 'SH', name: 'Schaffhausen' },
  { kuerzel: 'AR', name: 'Appenzell Ausserrhoden' },
  { kuerzel: 'AI', name: 'Appenzell Innerrhoden' },
  { kuerzel: 'SG', name: 'St. Gallen' },
  { kuerzel: 'GR', name: 'Graubünden' },
  { kuerzel: 'AG', name: 'Aargau' },
  { kuerzel: 'TG', name: 'Thurgau' },
  { kuerzel: 'TI', name: 'Tessin' },
  { kuerzel: 'VD', name: 'Waadt' },
  { kuerzel: 'VS', name: 'Wallis' },
  { kuerzel: 'NE', name: 'Neuenburg' },
  { kuerzel: 'GE', name: 'Genf' },
  { kuerzel: 'JU', name: 'Jura' },
];

/**
 * Arbeitspaket der Regionalen Koordination (Entscheid 83): benannt,
 * gespeichert und löschbar; der Inhalt (Strecken) ist änderbar, ein Objekt
 * gehört zu höchstens einem Paket. Die Zuweisung an eine Inventarisierende
 * geschieht pro Paket (Objekte → «Zugewiesen», via ObjektStore).
 */
export interface Arbeitspaket {
  id: string;
  name: string;
  /** Name der Regionalen Koordination, der das Paket gehört. */
  koordinator: string;
  /** Ids der enthaltenen Strecken. */
  objektIds: string[];
  /** Name der Inventarisierenden nach der Zuweisung, sonst null. */
  zugewiesenAn: string | null;
}

const STORAGE_KEY = 'ivs-prototyp-v3.pakete';

/** Bei Änderungen am Seed unten erhöhen — verwirft gespeicherte Stände. */
const VERSION = 2;

interface Ablage {
  version: number;
  /** Kanton-Kürzel → Name der Regionalen Koordination. */
  kantonZuweisungen: Record<string, string>;
  pakete: Arbeitspaket[];
}

/** Standard: Der Kanton Bern ist T. Nyffenegger vorab zugewiesen. */
function seedAblage(): { kantonZuweisungen: Record<string, string>; pakete: Arbeitspaket[] } {
  return { kantonZuweisungen: { BE: 'T. Nyffenegger' }, pakete: [] };
}

@Injectable({ providedIn: 'root' })
export class PaketStore {
  private readonly stand = signal(laden());

  /** Kanton-Kürzel → Name der zugewiesenen Regionalen Koordination. */
  readonly kantonZuweisungen = computed(() => this.stand().kantonZuweisungen);

  /** Alle Arbeitspakete (Entscheid 83). */
  readonly pakete = computed(() => this.stand().pakete);

  constructor() {
    effect(() => {
      const ablage: Ablage = { version: VERSION, ...this.stand() };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ablage));
      } catch {
        // Speicher voll oder blockiert — weiter ohne Persistenz.
      }
    });
  }

  /** Kanton einer Regionalen Koordination zuweisen; leer entfernt die Zuweisung. */
  kantonZuweisen(kuerzel: string, personName: string): void {
    this.stand.update((s) => {
      const kantonZuweisungen = { ...s.kantonZuweisungen };
      if (personName) kantonZuweisungen[kuerzel] = personName;
      else delete kantonZuweisungen[kuerzel];
      return { ...s, kantonZuweisungen };
    });
  }

  /**
   * Paket erstellen. Ein Objekt gehört zu höchstens einem Paket — bereits
   * paketierte Objekte wandern aus ihrem alten Paket hierher (die letzte
   * Definition gilt). Gibt das neue Paket zurück.
   */
  paketErstellen(name: string, koordinator: string, objektIds: readonly string[]): Arbeitspaket {
    // Zufalls-Id statt Modul-Zähler: übersteht Reload und Persistenz (12.6)
    const paket: Arbeitspaket = {
      id: `p${Math.random().toString(36).slice(2, 10)}`,
      name,
      koordinator,
      objektIds: [...new Set(objektIds)],
      zugewiesenAn: null,
    };
    this.stand.update((s) => ({
      ...s,
      pakete: [...ohneObjekte(s.pakete, paket.objektIds), paket],
    }));
    return paket;
  }

  /** Der Auswahl entsprechende Strecken einem bestehenden Paket hinzufügen. */
  objekteHinzufuegen(paketId: string, objektIds: readonly string[]): void {
    this.stand.update((s) => ({
      ...s,
      pakete: ohneObjekte(s.pakete, objektIds, paketId).map((p) =>
        p.id === paketId ? { ...p, objektIds: [...new Set([...p.objektIds, ...objektIds])] } : p,
      ),
    }));
  }

  /** Ein einzelnes Objekt aus einem Paket entfernen. */
  objektEntfernen(paketId: string, objektId: string): void {
    this.stand.update((s) => ({
      ...s,
      pakete: s.pakete.map((p) =>
        p.id === paketId ? { ...p, objektIds: p.objektIds.filter((id) => id !== objektId) } : p,
      ),
    }));
  }

  /** Zuweisungs-Vermerk am Paket (der Objekt-Wechsel läuft über den ObjektStore). */
  paketZuweisungSetzen(paketId: string, personName: string): void {
    this.stand.update((s) => ({
      ...s,
      pakete: s.pakete.map((p) => (p.id === paketId ? { ...p, zugewiesenAn: personName } : p)),
    }));
  }

  paketLoeschen(paketId: string): void {
    this.stand.update((s) => ({ ...s, pakete: s.pakete.filter((p) => p.id !== paketId) }));
  }

  /** Paket-Zugehörigkeit je Objekt-Id (für Filter und Exklusivität). */
  readonly paketProObjekt = computed<ReadonlyMap<string, Arbeitspaket>>(() => {
    const karte = new Map<string, Arbeitspaket>();
    for (const paket of this.stand().pakete) {
      for (const id of paket.objektIds) karte.set(id, paket);
    }
    return karte;
  });

  /** Setzt alles auf den Seed zurück (Werkzeug für Demos). */
  zuruecksetzen(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.stand.set(seedAblage());
  }
}

/** Objekte aus allen (anderen) Paketen entfernen — ein Objekt, ein Paket. */
function ohneObjekte(
  pakete: Arbeitspaket[],
  objektIds: readonly string[],
  ausserPaketId?: string,
): Arbeitspaket[] {
  const menge = new Set(objektIds);
  return pakete.map((p) =>
    p.id === ausserPaketId ? p : { ...p, objektIds: p.objektIds.filter((id) => !menge.has(id)) },
  );
}

function laden(): { kantonZuweisungen: Record<string, string>; pakete: Arbeitspaket[] } {
  try {
    const roh = localStorage.getItem(STORAGE_KEY);
    if (roh) {
      const ablage = JSON.parse(roh) as Ablage;
      if (ablage.version === VERSION && ablage.kantonZuweisungen) {
        return { kantonZuweisungen: ablage.kantonZuweisungen, pakete: ablage.pakete ?? [] };
      }
    }
  } catch {
    // defekter Stand — neu seeden
  }
  return seedAblage();
}
