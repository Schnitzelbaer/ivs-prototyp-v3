import { Injectable, effect, signal } from '@angular/core';

/**
 * Arbeitsgeometrien aus dem Geometrie-Editing (05.05): pro Objekt-Signatur
 * eine Liste von Esri-Geometrie-JSONs (Punkte und Linien), zusätzlich zur
 * statischen Objektgeometrie aus den Testdaten. Persistiert im localStorage,
 * damit Zeichnungen den Reload überleben.
 */
export type GeometrieJson = Record<string, unknown>;

interface Ablage {
  version: number;
  geometrien: Record<string, GeometrieJson[]>;
}

const STORAGE_KEY = 'ivs-prototyp-v3.geometrien';
const VERSION = 1;

@Injectable({ providedIn: 'root' })
export class GeometrieStore {
  private readonly geometrien = signal<Record<string, GeometrieJson[]>>(laden());

  readonly alle = this.geometrien.asReadonly();

  constructor() {
    effect(() => {
      const ablage: Ablage = { version: VERSION, geometrien: this.geometrien() };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ablage));
      } catch {
        // ohne Persistenz weiterfahren
      }
    });
    // Änderungen aus anderen Fenstern übernehmen (das separate Kartenfenster
    // zeichnet in denselben Bestand; das storage-Ereignis feuert nur fremd).
    window.addEventListener('storage', (ereignis) => {
      if (ereignis.key === STORAGE_KEY && ereignis.newValue) this.geometrien.set(laden());
    });
  }

  fuerObjekt(signatur: string): GeometrieJson[] {
    return this.geometrien()[signatur] ?? [];
  }

  setzen(signatur: string, geometrien: GeometrieJson[]): void {
    this.geometrien.update((alle) => ({ ...alle, [signatur]: geometrien }));
  }

  /**
   * Signaturen umziehen bzw. entfernen (Entscheid 90: Signaturänderung,
   * 07.05: Objekt-Löschung). `umbenennen` liefert die neue Signatur —
   * oder null zum Entfernen, undefined für unverändert.
   */
  signaturenMigrieren(umbenennen: (signatur: string) => string | null | undefined): void {
    this.geometrien.update((alle) => {
      const neu: Record<string, GeometrieJson[]> = {};
      for (const [signatur, geometrien] of Object.entries(alle)) {
        const ziel = umbenennen(signatur);
        if (ziel === null) continue;
        neu[ziel ?? signatur] = geometrien;
      }
      return neu;
    });
  }

  zuruecksetzen(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.geometrien.set({});
  }
}

function laden(): Record<string, GeometrieJson[]> {
  try {
    const roh = localStorage.getItem(STORAGE_KEY);
    if (roh) {
      const ablage = JSON.parse(roh) as Ablage;
      if (ablage.version === VERSION && ablage.geometrien) return ablage.geometrien;
    }
  } catch {
    // defekter Stand — leer starten
  }
  return {};
}
