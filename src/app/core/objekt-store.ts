import { Injectable, computed, effect, signal } from '@angular/core';
import { IvsObjekt, Lognotiz, WorkflowStatus } from './model';
import { SEED_OBJEKTE, SEED_VERSION } from './seed-data';

interface Ablage {
  version: number;
  objekte: IvsObjekt[];
}

const STORAGE_KEY = 'ivs-prototyp-v3.objekte';

/**
 * Hält alle IVS-Objekte als Signal und spiegelt jede Änderung in den
 * localStorage. Passt die gespeicherte Seed-Version nicht mehr, wird der
 * Stand verworfen und neu geseedet (SEED_VERSION in seed-data.ts erhöhen).
 */
@Injectable({ providedIn: 'root' })
export class ObjektStore {
  private readonly objekte = signal<IvsObjekt[]>(laden());

  readonly alle = this.objekte.asReadonly();

  readonly strecken = computed(() => this.objekte().filter((o) => o.ebene === 'strecke'));

  constructor() {
    effect(() => {
      const ablage: Ablage = { version: SEED_VERSION, objekte: this.objekte() };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ablage));
      } catch {
        // Speicher voll oder blockiert — der Prototyp läuft dann ohne Persistenz weiter.
      }
    });
  }

  byId(id: string): IvsObjekt | undefined {
    return this.objekte().find((o) => o.id === id);
  }

  bySignatur(signatur: string): IvsObjekt | undefined {
    return this.objekte().find((o) => o.signatur === signatur);
  }

  kinder(signatur: string): IvsObjekt[] {
    return this.objekte().filter((o) => o.parent === signatur);
  }

  /** Wurzel-Strecke eines Objekts (für die Hierarchie-Anzeige). */
  strecke(objekt: IvsObjekt): IvsObjekt {
    let aktuell = objekt;
    while (aktuell.parent) {
      const parent = this.bySignatur(aktuell.parent);
      if (!parent) break;
      aktuell = parent;
    }
    return aktuell;
  }

  update(id: string, patch: Partial<IvsObjekt>): void {
    this.objekte.update((liste) => liste.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  setStatus(id: string, status: WorkflowStatus): void {
    this.update(id, { status });
  }

  lognotizHinzufuegen(id: string, notiz: Lognotiz): void {
    const objekt = this.byId(id);
    if (!objekt) return;
    this.update(id, { lognotizen: [...objekt.lognotizen, notiz] });
  }

  /** Löscht ein Objekt mitsamt allen Unterobjekten (07.05). */
  loeschen(id: string): void {
    const objekt = this.byId(id);
    if (!objekt) return;
    const zuLoeschen = new Set<string>([objekt.signatur]);
    let gewachsen = true;
    while (gewachsen) {
      gewachsen = false;
      for (const o of this.objekte()) {
        if (o.parent && zuLoeschen.has(o.parent) && !zuLoeschen.has(o.signatur)) {
          zuLoeschen.add(o.signatur);
          gewachsen = true;
        }
      }
    }
    this.objekte.update((liste) => liste.filter((o) => !zuLoeschen.has(o.signatur)));
  }

  /** Setzt alles auf den Seed zurück (Werkzeug für Demos). */
  zuruecksetzen(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.objekte.set(SEED_OBJEKTE.map((o) => strukturKopie(o)));
  }
}

function laden(): IvsObjekt[] {
  try {
    const roh = localStorage.getItem(STORAGE_KEY);
    if (roh) {
      const ablage = JSON.parse(roh) as Ablage;
      if (ablage.version === SEED_VERSION && Array.isArray(ablage.objekte)) {
        return ablage.objekte;
      }
    }
  } catch {
    // defekter Stand — neu seeden
  }
  return SEED_OBJEKTE.map((o) => strukturKopie(o));
}

function strukturKopie<T>(wert: T): T {
  return JSON.parse(JSON.stringify(wert)) as T;
}
