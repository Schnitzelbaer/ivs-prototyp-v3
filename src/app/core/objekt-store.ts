import { Injectable, computed, effect, signal } from '@angular/core';
import { IvsObjekt, Lognotiz, RolleId, WorkflowStatus } from './model';
import { NAME_FUER_ROLLE, SEED_OBJEKTE, SEED_VERSION, rolleFuerStatus } from './seed-data';
import { STATUS_LABEL } from './status';

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

  /**
   * Statuswechsel als fachliche Operation: setzt den Status, führt die
   * Zuständigkeit nach (wer ist am Zug — gleiche Ableitung wie im Seed)
   * und protokolliert den Übergang als Lognotiz. So bleibt die
   * Historisierung unabhängig vom Einstiegspunkt (Dashboard, Detail)
   * vollständig.
   */
  statusWechseln(id: string, status: WorkflowStatus, autor: string, autorRolle: RolleId): void {
    const objekt = this.byId(id);
    if (!objekt || objekt.status === status) return;
    const zustaendigRolle = rolleFuerStatus(status);
    this.update(id, {
      status,
      zustaendigRolle,
      zustaendigName: NAME_FUER_ROLLE[zustaendigRolle],
      lognotizen: [
        ...objekt.lognotizen,
        {
          datum: new Date().toISOString().slice(0, 10),
          autor,
          rolle: autorRolle,
          text: `Status: ${STATUS_LABEL[objekt.status]} → ${STATUS_LABEL[status]}`,
        },
      ],
    });
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
