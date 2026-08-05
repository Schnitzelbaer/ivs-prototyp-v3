import { Injectable, computed, effect, signal } from '@angular/core';

/**
 * Kantonspakete (Entscheid 82): Alle 26 Kantone sind aufgelistet und lassen
 * sich — auch ohne Testdaten, testweise — einer Regionalen Koordination
 * zuweisen. Die Zuweisung ist persistent und änderbar; der Workflow-Status
 * der Objekte bleibt davon unberührt (erst die Zuweisung an eine Person
 * setzt «Zugewiesen», Entscheid 79).
 *
 * Die benannten Arbeitspaket-Entitäten der Regionalen Koordination
 * (Entscheid 83) sind mit Entscheid 85 wieder entfallen — die Zuweisung an
 * Inventarisierende läuft rein über die Zuständigkeit.
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

const STORAGE_KEY = 'ivs-prototyp-v3.pakete';

/** Bei Änderungen am Seed unten erhöhen — verwirft gespeicherte Stände. */
const VERSION = 3;

interface Ablage {
  version: number;
  /** Kanton-Kürzel → Name der Regionalen Koordination. */
  kantonZuweisungen: Record<string, string>;
}

/** Standard: Der Kanton Bern ist T. Nyffenegger vorab zugewiesen. */
function seedZuweisungen(): Record<string, string> {
  return { BE: 'T. Nyffenegger' };
}

@Injectable({ providedIn: 'root' })
export class PaketStore {
  private readonly zuweisungen = signal<Record<string, string>>(laden());

  /** Kanton-Kürzel → Name der zugewiesenen Regionalen Koordination. */
  readonly kantonZuweisungen = computed(() => this.zuweisungen());

  constructor() {
    effect(() => {
      const ablage: Ablage = { version: VERSION, kantonZuweisungen: this.zuweisungen() };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ablage));
      } catch {
        // Speicher voll oder blockiert — weiter ohne Persistenz.
      }
    });
  }

  /** Kanton einer Regionalen Koordination zuweisen; leer entfernt die Zuweisung. */
  kantonZuweisen(kuerzel: string, personName: string): void {
    this.zuweisungen.update((z) => {
      const neu = { ...z };
      if (personName) neu[kuerzel] = personName;
      else delete neu[kuerzel];
      return neu;
    });
  }

  /** Setzt alles auf den Seed zurück (Werkzeug für Demos). */
  zuruecksetzen(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.zuweisungen.set(seedZuweisungen());
  }
}

function laden(): Record<string, string> {
  try {
    const roh = localStorage.getItem(STORAGE_KEY);
    if (roh) {
      const ablage = JSON.parse(roh) as Ablage;
      if (ablage.version === VERSION && ablage.kantonZuweisungen) {
        return ablage.kantonZuweisungen;
      }
    }
  } catch {
    // defekter Stand — neu seeden
  }
  return seedZuweisungen();
}
