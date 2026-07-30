import { Injectable, effect, signal } from '@angular/core';
import { RolleId } from './model';
import { ROLLEN, Rolle, rolle } from './rollen';

interface Einstellungen {
  rolle: RolleId;
  dunkel: boolean;
}

const STORAGE_KEY = 'ivs-prototyp-v3.einstellungen';

/** Aktive Rolle (Rollen-Umschalter) und Erscheinungsbild, persistiert. */
@Injectable({ providedIn: 'root' })
export class EinstellungenStore {
  private readonly einstellungen = signal<Einstellungen>(laden());

  readonly aktiveRolleId = signal<RolleId>(this.einstellungen().rolle);
  readonly dunkel = signal<boolean>(this.einstellungen().dunkel);

  constructor() {
    effect(() => {
      document.documentElement.classList.toggle('dark', this.dunkel());
    });
    effect(() => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ rolle: this.aktiveRolleId(), dunkel: this.dunkel() } satisfies Einstellungen),
        );
      } catch {
        // ohne Persistenz weiterfahren
      }
    });
    // Rollen-/Darstellungswechsel aus anderen Fenstern übernehmen
    // (separates Kartenfenster; das storage-Ereignis feuert nur fremd)
    window.addEventListener('storage', (ereignis) => {
      if (ereignis.key !== STORAGE_KEY || !ereignis.newValue) return;
      const neu = laden();
      this.aktiveRolleId.set(neu.rolle);
      this.dunkel.set(neu.dunkel);
    });
  }

  aktiveRolle(): Rolle {
    return rolle(this.aktiveRolleId());
  }

  rolleWechseln(id: RolleId): void {
    if (!rolle(id).waehlbar) return;
    this.aktiveRolleId.set(id);
  }

  dunkelUmschalten(): void {
    this.dunkel.update((d) => !d);
  }
}

function laden(): Einstellungen {
  try {
    const roh = localStorage.getItem(STORAGE_KEY);
    if (roh) {
      const wert = JSON.parse(roh) as Partial<Einstellungen>;
      const gueltig = ROLLEN.some((r) => r.id === wert.rolle && r.waehlbar);
      return { rolle: gueltig ? (wert.rolle as RolleId) : 'R-05', dunkel: !!wert.dunkel };
    }
  } catch {
    // defekter Stand — Standardwerte
  }
  return { rolle: 'R-05', dunkel: false };
}
