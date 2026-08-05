import { Injectable, effect, signal } from '@angular/core';
import { RolleId } from './model';
import { ROLLEN, Rolle, rolle } from './rollen';

interface Einstellungen {
  rolle: RolleId;
  dunkel: boolean;
}

const STORAGE_KEY = 'ivs-prototyp-v3.einstellungen';
/** Rolle pro Tab: sessionStorage statt localStorage (jeder Tab seine eigene). */
const SESSION_KEY = 'ivs-prototyp-v3.rolle';

/**
 * Aktive Rolle (Rollen-Umschalter) und Erscheinungsbild.
 *
 * Die Rolle gilt **pro Tab** (sessionStorage) — so lassen sich mehrere
 * Perspektiven nebeneinander öffnen. Der localStorage hält nur die zuletzt
 * gewählte Rolle als Standard für neue Tabs; das separate Kartenfenster
 * erbt die Rolle seines Ursprungs-Tabs über den URL-Parameter `rolle`
 * (mit `noopener` wird der sessionStorage nicht kopiert). Das
 * Erscheinungsbild bleibt fensterübergreifend synchron.
 */
@Injectable({ providedIn: 'root' })
export class EinstellungenStore {
  readonly aktiveRolleId = signal<RolleId>(rolleLaden());
  readonly dunkel = signal<boolean>(dunkelLaden());

  constructor() {
    effect(() => {
      document.documentElement.classList.toggle('dark', this.dunkel());
    });
    effect(() => {
      try {
        sessionStorage.setItem(SESSION_KEY, this.aktiveRolleId());
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ rolle: this.aktiveRolleId(), dunkel: this.dunkel() } satisfies Einstellungen),
        );
      } catch {
        // ohne Persistenz weiterfahren
      }
    });
    // Darstellungswechsel aus anderen Fenstern übernehmen (das
    // storage-Ereignis feuert nur fremd); die Rolle bleibt pro Tab.
    window.addEventListener('storage', (ereignis) => {
      if (ereignis.key !== STORAGE_KEY || !ereignis.newValue) return;
      try {
        this.dunkel.set(!!(JSON.parse(ereignis.newValue) as Partial<Einstellungen>).dunkel);
      } catch {
        // defekter Stand — ignorieren
      }
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

function gueltigeRolle(wert: unknown): wert is RolleId {
  return ROLLEN.some((r) => r.id === wert && r.waehlbar);
}

/** URL-Parameter > Tab-eigener Stand > Standard aus localStorage > R-05. */
function rolleLaden(): RolleId {
  try {
    const ausUrl = new URLSearchParams(window.location.search).get('rolle');
    if (gueltigeRolle(ausUrl)) return ausUrl;
    const ausTab = sessionStorage.getItem(SESSION_KEY);
    if (gueltigeRolle(ausTab)) return ausTab;
    const roh = localStorage.getItem(STORAGE_KEY);
    if (roh) {
      const wert = (JSON.parse(roh) as Partial<Einstellungen>).rolle;
      if (gueltigeRolle(wert)) return wert;
    }
  } catch {
    // defekter Stand — Standardwert
  }
  return 'R-05';
}

function dunkelLaden(): boolean {
  try {
    const roh = localStorage.getItem(STORAGE_KEY);
    if (roh) return !!(JSON.parse(roh) as Partial<Einstellungen>).dunkel;
  } catch {
    // defekter Stand — Standardwert
  }
  return false;
}
