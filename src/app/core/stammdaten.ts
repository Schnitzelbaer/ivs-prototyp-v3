import { Injectable, effect, signal } from '@angular/core';

/**
 * Stammdaten / Auswahllisten (02.01): von der Fachlichen Administration
 * (R-03) gepflegte Listen, mehrsprachig DE/FR/IT (02.02). Einträge werden
 * deaktiviert statt gelöscht, damit bestehende Objekte gültig bleiben.
 * Die Liste «Wegbegleiter-Typen» speist das Objektformular.
 */

export interface StammdatenEintrag {
  id: string;
  de: string;
  fr: string;
  it: string;
  aktiv: boolean;
}

export interface StammdatenListe {
  id: string;
  titel: string;
  hinweis?: string;
  eintraege: StammdatenEintrag[];
}

const SEED_VERSION = 1;

let laufnummer = 0;
function eintrag(de: string, fr = '', it = '', aktiv = true): StammdatenEintrag {
  return { id: `s${++laufnummer}`, de, fr, it, aktiv };
}

/**
 * Neue Einträge erhalten Zufalls-Ids: Der Seed-Zähler beginnt bei jedem
 * App-Start wieder bei null und würde nach einem Reload bereits
 * persistierte Ids erneut vergeben (Doppel-Ids: Bearbeiten würde fremde
 * Zeilen mitändern, @for-track bräche).
 */
function neueId(): string {
  return `e${Math.random().toString(36).slice(2, 10)}`;
}

const SEED_LISTEN: StammdatenListe[] = [
  {
    id: 'wegbegleiter-typen',
    titel: 'Wegbegleiter-Typen',
    hinweis: 'Speist das Feld «Objektart» der Wegbegleiter im Objektformular.',
    eintraege: [
      eintrag('Kirche', 'Église', 'Chiesa'),
      eintrag('Kapelle', 'Chapelle', 'Cappella'),
      eintrag('Profanes Gebäude', 'Bâtiment profane', 'Edificio profano'),
      eintrag('Brunnen', 'Fontaine', 'Fontana'),
      eintrag('Distanzstein', 'Borne', 'Pietra miliare'),
      eintrag('Einzelbaum', 'Arbre isolé', 'Albero isolato'),
      eintrag('Gewerbebetrieb', '', ''),
      eintrag('Inschrift', '', ''),
      eintrag('Fähre', 'Bac', 'Traghetto', false),
    ],
  },
  {
    id: 'wegoberflaechen',
    titel: 'Wegoberflächen',
    eintraege: [
      eintrag('Hartbelag', 'Revêtement dur', 'Pavimentazione dura'),
      eintrag('Schotterung', 'Empierrement', 'Massicciata'),
      eintrag('Lockermaterial', 'Matériau meuble', 'Materiale sciolto'),
      eintrag('Lockermaterial + Schotterung', '', ''),
      eintrag('Pflästerung', 'Pavage', 'Selciato'),
    ],
  },
  {
    id: 'wegformen',
    titel: 'Wegformen',
    eintraege: [
      eintrag('Hohlweg', 'Chemin creux', 'Strada incassata'),
      eintrag('Dammweg', 'Chemin sur digue', ''),
      eintrag('Böschung', 'Talus', 'Scarpata'),
      eintrag('Stufenweg', '', ''),
    ],
  },
  {
    id: 'kunstbauten',
    titel: 'Kunstbauten',
    eintraege: [
      eintrag('Brücke', 'Pont', 'Ponte'),
      eintrag('Stützmauer', 'Mur de soutènement', 'Muro di sostegno'),
      eintrag('Trockenmauer', 'Mur en pierres sèches', 'Muro a secco'),
      eintrag('Durchlass', 'Passage', ''),
    ],
  },
  {
    id: 'bedeutung',
    titel: 'Bedeutungsstufen',
    hinweis: 'NHG-Wert der Objekte — Änderungen wirken im Prototyp nicht auf bestehende Auswahlfelder.',
    eintraege: [eintrag('national', 'nationale', 'nazionale'), eintrag('regional', 'régionale', 'regionale'), eintrag('lokal', 'locale', 'locale')],
  },
  {
    id: 'substanzgrad',
    titel: 'Substanzgrad',
    eintraege: [
      eintrag('Viel Substanz', 'Beaucoup de substance', 'Molta sostanza'),
      eintrag('Mit Substanz', 'Avec substance', 'Con sostanza'),
      eintrag('Wenig Substanz', 'Peu de substance', 'Poca sostanza'),
      eintrag('Ohne Substanz', 'Sans substance', 'Senza sostanza'),
    ],
  },
];

interface Ablage {
  version: number;
  listen: StammdatenListe[];
}

const STORAGE_KEY = 'ivs-prototyp-v3.stammdaten';

@Injectable({ providedIn: 'root' })
export class StammdatenStore {
  private readonly listen = signal<StammdatenListe[]>(laden());

  readonly alle = this.listen.asReadonly();

  constructor() {
    effect(() => {
      const ablage: Ablage = { version: SEED_VERSION, listen: this.listen() };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ablage));
      } catch {
        // ohne Persistenz weiterfahren
      }
    });
  }

  liste(id: string): StammdatenListe | undefined {
    return this.listen().find((l) => l.id === id);
  }

  /** Aktive DE-Werte einer Liste — für Auswahlfelder im Objektformular. */
  aktiveWerte(id: string): string[] {
    return (this.liste(id)?.eintraege ?? []).filter((e) => e.aktiv).map((e) => e.de);
  }

  eintragAktualisieren(listeId: string, eintragId: string, patch: Partial<StammdatenEintrag>): void {
    this.listen.update((listen) =>
      listen.map((liste) =>
        liste.id === listeId
          ? {
              ...liste,
              eintraege: liste.eintraege.map((e) => (e.id === eintragId ? { ...e, ...patch } : e)),
            }
          : liste,
      ),
    );
  }

  eintragHinzufuegen(listeId: string, de: string): void {
    if (!de.trim()) return;
    this.listen.update((listen) =>
      listen.map((liste) =>
        liste.id === listeId
          ? { ...liste, eintraege: [...liste.eintraege, { id: neueId(), de: de.trim(), fr: '', it: '', aktiv: true }] }
          : liste,
      ),
    );
  }

  zuruecksetzen(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.listen.set(strukturKopie(SEED_LISTEN));
  }
}

function laden(): StammdatenListe[] {
  try {
    const roh = localStorage.getItem(STORAGE_KEY);
    if (roh) {
      const ablage = JSON.parse(roh) as Ablage;
      if (ablage.version === SEED_VERSION && Array.isArray(ablage.listen)) return ablage.listen;
    }
  } catch {
    // defekter Stand — neu seeden
  }
  return strukturKopie(SEED_LISTEN);
}

function strukturKopie<T>(wert: T): T {
  return JSON.parse(JSON.stringify(wert)) as T;
}
