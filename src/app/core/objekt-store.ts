import { Injectable, computed, effect, signal } from '@angular/core';
import { IvsObjekt, Lognotiz, RolleId, WorkflowStatus } from './model';
import { ladeObjektModell } from './objekt-generierung';
import {
  SEED_OBJEKTE,
  SEED_VERSION,
  statusVonStreckeErben,
  zustaendigkeitFuerStatus,
} from './seed-data';
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
    // Vollabdeckung: generierte Objekte ergänzen den kuratierten Seed. Nach
    // dem Laden aus dem localStorage sind sie bereits enthalten — der Filter
    // auf vorhandene Ids macht den Aufruf idempotent.
    void this.generierteErgaenzen();
  }

  /** Generierte Objekte (Vollabdeckung der Testdaten) nachladen. */
  private async generierteErgaenzen(): Promise<void> {
    const { generierte } = await ladeObjektModell();
    this.objekte.update((liste) => {
      const vorhanden = new Set(liste.map((o) => o.id));
      const neue = generierte.filter((o) => !vorhanden.has(o.id));
      if (!neue.length) return liste;
      // Generierte Nachkommen kuratierter Strecken erben deren Status
      // und Zuständigkeit (Entscheid 78)
      return statusVonStreckeErben([...liste, ...neue.map((o) => strukturKopie(o))]);
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
   * Alle Nachkommen der übergebenen Signaturen (inklusive dieser selbst),
   * über die parent-Verkettung gesammelt.
   */
  private mitNachkommen(signaturen: Iterable<string>): Set<string> {
    const menge = new Set<string>(signaturen);
    let gewachsen = true;
    while (gewachsen) {
      gewachsen = false;
      for (const o of this.objekte()) {
        if (o.parent && menge.has(o.parent) && !menge.has(o.signatur)) {
          menge.add(o.signatur);
          gewachsen = true;
        }
      }
    }
    return menge;
  }

  /**
   * Statuswechsel als fachliche Operation: setzt den Status, führt die
   * Zuständigkeit nach (wer ist am Zug — gleiche Ableitung wie im Seed)
   * und protokolliert den Übergang als Lognotiz. Der Status wird auf
   * Strecken-Ebene geführt (Entscheid 78) — bei Strecken erben alle
   * Nachkommen Status und Zuständigkeit still (Lognotiz nur am Objekt
   * selbst). So bleibt die Historisierung unabhängig vom Einstiegspunkt
   * (Dashboard, Detail) vollständig.
   */
  statusWechseln(id: string, status: WorkflowStatus, autor: string, autorRolle: RolleId): void {
    const objekt = this.byId(id);
    if (!objekt || objekt.status === status) return;
    // «Offen» entzieht die Zuweisung — das Objekt gehört wieder niemandem
    const { rolle: zustaendigRolle, name: zustaendigName } = zustaendigkeitFuerStatus(status);
    const betroffene =
      objekt.ebene === 'strecke'
        ? this.mitNachkommen([objekt.signatur])
        : new Set([objekt.signatur]);
    const notiz: Lognotiz = {
      datum: new Date().toISOString().slice(0, 10),
      autor,
      rolle: autorRolle,
      text: `Status: ${STATUS_LABEL[objekt.status]} → ${STATUS_LABEL[status]}`,
    };
    this.objekte.update((liste) =>
      liste.map((o) => {
        if (!betroffene.has(o.signatur)) return o;
        return {
          ...o,
          status,
          zustaendigRolle,
          zustaendigName,
          lognotizen: o.id === id ? [...o.lognotizen, notiz] : o.lognotizen,
        };
      }),
    );
  }

  /**
   * Zuständigkeit als fachliche Operation (Entscheid 81): Die Person wird
   * wie der Status auf Strecken-Ebene geführt — Nachkommen erben sie
   * still, die Lognotiz steht am Objekt selbst. Der Workflow-Status
   * bleibt unberührt; einzig ein «offenes» Objekt wechselt mit der
   * Zuweisung automatisch auf «Zugewiesen» (Entscheid 79).
   */
  personZuweisen(
    id: string,
    person: { name: string; rolle: RolleId },
    autor: string,
    autorRolle: RolleId,
  ): void {
    const objekt = this.byId(id);
    if (!objekt || objekt.zustaendigName === person.name) return;
    const status: WorkflowStatus = objekt.status === 'offen' ? 'zugewiesen' : objekt.status;
    const betroffene =
      objekt.ebene === 'strecke'
        ? this.mitNachkommen([objekt.signatur])
        : new Set([objekt.signatur]);
    const notiz: Lognotiz = {
      datum: new Date().toISOString().slice(0, 10),
      autor,
      rolle: autorRolle,
      text: objekt.zustaendigName
        ? `Zugewiesen an ${person.name} (${person.rolle}), vorher ${objekt.zustaendigName}.`
        : `Zugewiesen an ${person.name} (${person.rolle}).`,
    };
    this.objekte.update((liste) =>
      liste.map((o) => {
        if (!betroffene.has(o.signatur)) return o;
        return {
          ...o,
          status,
          zustaendigRolle: person.rolle,
          zustaendigName: person.name,
          lognotizen: o.id === id ? [...o.lognotizen, notiz] : o.lognotizen,
        };
      }),
    );
  }

  lognotizHinzufuegen(id: string, notiz: Lognotiz): void {
    const objekt = this.byId(id);
    if (!objekt) return;
    this.update(id, { lognotizen: [...objekt.lognotizen, notiz] });
  }

  /**
   * Arbeitspaket zuweisen (03.02/03.03): setzt alle Objekte in einem Zug
   * auf «Zugewiesen», trägt die Person als zuständig ein und protokolliert
   * das Paket je Strecke als Lognotiz. Status und Zuständigkeit erben die
   * Nachkommen still (Entscheid 78).
   */
  paketZuweisen(
    ids: readonly string[],
    person: { name: string; rolle: RolleId },
    paket: string,
    autor: string,
    autorRolle: RolleId,
  ): void {
    const menge = new Set(ids);
    const signaturen = this.mitNachkommen(
      this.objekte()
        .filter((o) => menge.has(o.id))
        .map((o) => o.signatur),
    );
    const datum = new Date().toISOString().slice(0, 10);
    this.objekte.update((liste) =>
      liste.map((o) =>
        signaturen.has(o.signatur)
          ? {
              ...o,
              status: 'zugewiesen' as WorkflowStatus,
              zustaendigRolle: person.rolle,
              zustaendigName: person.name,
              // Lognotiz nur auf den Strecken des Pakets, Nachkommen erben still
              lognotizen: menge.has(o.id)
                ? [
                    ...o.lognotizen,
                    {
                      datum,
                      autor,
                      rolle: autorRolle,
                      text: `${paket} zugewiesen an ${person.name} (${person.rolle}).`,
                    },
                  ]
                : o.lognotizen,
            }
          : o,
      ),
    );
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
    void this.generierteErgaenzen();
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
