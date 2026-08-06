import { Injectable, effect, signal } from '@angular/core';
import { RolleId } from './model';

/**
 * Kommentare (09/10): auf jedem Objekt jeder Ebene oder platziert auf der
 * Karte (05.11) — seit Entscheid 88 immer mit Pflicht-Objektzuweisung. Im
 * Text stehen Erwähnungen als `@[Name]` und Attribut-Referenzen als
 * `#[Label]` — `parseKommentarText` zerlegt sie fürs Rendering, ein Klick
 * auf eine Attribut-Referenz scrollt im Objektformular zum Feld (siehe
 * core/attribute.ts).
 */

export interface KommentarAntwort {
  autor: string;
  rolle: RolleId;
  zeit: string; // ISO-Zeitstempel
  text: string;
}

export interface Kommentar {
  id: string;
  /**
   * Signatur des Objekts — Pflicht: Jeder Kommentar ist einem Objekt
   * zugewiesen, auch räumliche Notizen auf der Karte (Entscheid 88).
   */
  objektSignatur: string;
  /** Kartenposition (räumliche Notiz), null bei reinen Objekt-Kommentaren. */
  position: { lon: number; lat: number } | null;
  titel: string;
  text: string;
  autor: string;
  rolle: RolleId;
  zeit: string;
  erledigt: boolean;
  antworten: KommentarAntwort[];
}

export type KommentarSegment =
  | { typ: 'text'; wert: string }
  | { typ: 'mention'; wert: string }
  | { typ: 'attribut'; wert: string };

/**
 * Aktueller Zeitstempel in LOKALER Zeit, zonenlos («2026-07-30T14:30:00») —
 * das Format aller Kommentar-Zeitstempel. toISOString() wäre UTC und würde
 * in Anzeige und Sortierung um die Zeitzonendifferenz danebenliegen.
 */
export function jetztLokal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

/** Zerlegt Kommentartext in Text-, `@[…]`- und `#[…]`-Segmente. */
export function parseKommentarText(text: string): KommentarSegment[] {
  const segmente: KommentarSegment[] = [];
  const muster = /([@#])\[([^\]]+)\]/g;
  let letzterIndex = 0;
  for (const treffer of text.matchAll(muster)) {
    if (treffer.index > letzterIndex) {
      segmente.push({ typ: 'text', wert: text.slice(letzterIndex, treffer.index) });
    }
    segmente.push({ typ: treffer[1] === '@' ? 'mention' : 'attribut', wert: treffer[2] });
    letzterIndex = treffer.index + treffer[0].length;
  }
  if (letzterIndex < text.length) {
    segmente.push({ typ: 'text', wert: text.slice(letzterIndex) });
  }
  return segmente;
}

/** Bei Änderungen erhöhen — verwirft gespeicherte Kommentar-Stände. */
const KOMMENTAR_SEED_VERSION = 2;

const SEED_KOMMENTARE: Kommentar[] = [
  {
    id: 'k1',
    objektSignatur: 'BE 21.1.1',
    position: null,
    titel: 'Substanzwert erneut prüfen',
    text:
      '@[B. Anderegg] Bitte schau dir den #[Substanzwert] nochmals an. Ich habe in der ' +
      '360-Grad-Ansicht gesehen, dass da noch Pflastersteine vorhanden sind. Wie siehst du das?',
    autor: 'M. Gerber',
    rolle: 'R-06',
    zeit: '2026-07-20T14:15:00',
    erledigt: false,
    antworten: [
      {
        autor: 'B. Anderegg',
        rolle: 'R-05',
        zeit: '2026-07-20T16:07:00',
        text: 'Die Pflastersteine sind in der Zwischenzeit ersetzt worden. Ich war letzte Woche vor Ort und habe das nachgeprüft.',
      },
      {
        autor: 'M. Gerber',
        rolle: 'R-06',
        zeit: '2026-07-21T09:11:00',
        text: 'Dann passt es. Kannst du noch neue Bilder dazu hochladen?',
      },
    ],
  },
  {
    id: 'k2',
    objektSignatur: 'BE 21.1.1',
    position: null,
    titel: 'Quellenangaben prüfen',
    text: '@[B. Anderegg] Bitte prüf noch folgende Quellen:\nABIS 404\nREDA 51',
    autor: 'M. Gerber',
    rolle: 'R-06',
    zeit: '2026-07-16T13:01:00',
    erledigt: true,
    antworten: [],
  },
  {
    id: 'k3',
    objektSignatur: 'BE 22.2.1',
    position: null,
    titel: 'Terminologie Wegbegrenzung',
    text: 'Im #[Gelände]-Beschrieb «Wegrand» durch «Wegbegrenzung» ersetzen (Terminologie-Handbuch).',
    autor: 'M. Gerber',
    rolle: 'R-06',
    zeit: '2026-07-24T10:42:00',
    erledigt: false,
    antworten: [],
  },
  {
    id: 'k4',
    objektSignatur: 'BE 21.1.3',
    position: { lon: 7.2549, lat: 46.9641 },
    titel: 'Wegfortsetzung unklar',
    text: 'Hier scheint der Hohlweg weiterzulaufen. Bei nächster Begehung klären, ob er noch zu BE 21.1.3 gehört.',
    autor: 'B. Anderegg',
    rolle: 'R-05',
    zeit: '2026-07-26T08:30:00',
    erledigt: false,
    antworten: [],
  },
];

interface Ablage {
  version: number;
  kommentare: Kommentar[];
}

const STORAGE_KEY = 'ivs-prototyp-v3.kommentare';

@Injectable({ providedIn: 'root' })
export class KommentarStore {
  private readonly kommentare = signal<Kommentar[]>(laden());

  readonly alle = this.kommentare.asReadonly();

  constructor() {
    effect(() => {
      const ablage: Ablage = { version: KOMMENTAR_SEED_VERSION, kommentare: this.kommentare() };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ablage));
      } catch {
        // ohne Persistenz weiterfahren
      }
    });
    // Änderungen aus anderen Fenstern übernehmen (separates Kartenfenster)
    window.addEventListener('storage', (ereignis) => {
      if (ereignis.key === STORAGE_KEY && ereignis.newValue) this.kommentare.set(laden());
    });
  }

  fuerObjekt(signatur: string): Kommentar[] {
    return this.kommentare().filter((k) => k.objektSignatur === signatur);
  }

  byId(id: string): Kommentar | undefined {
    return this.kommentare().find((k) => k.id === id);
  }

  hinzufuegen(kommentar: Omit<Kommentar, 'id'>): void {
    const id = `k${Math.random().toString(36).slice(2, 10)}`;
    this.kommentare.update((liste) => [...liste, { ...kommentar, id }]);
  }

  antworten(id: string, antwort: KommentarAntwort): void {
    this.kommentare.update((liste) =>
      liste.map((k) => (k.id === id ? { ...k, antworten: [...k.antworten, antwort] } : k)),
    );
  }

  /**
   * Objektsignaturen umziehen bzw. Kommentare gelöschter Objekte entfernen
   * (Entscheid 90 / 07.05). `umbenennen` liefert die neue Signatur — oder
   * null zum Entfernen, undefined für unverändert.
   */
  signaturenMigrieren(umbenennen: (signatur: string) => string | null | undefined): void {
    this.kommentare.update((liste) =>
      liste.flatMap((k) => {
        const ziel = umbenennen(k.objektSignatur);
        if (ziel === null) return [];
        return [ziel === undefined ? k : { ...k, objektSignatur: ziel }];
      }),
    );
  }

  erledigtSetzen(id: string, erledigt: boolean): void {
    this.kommentare.update((liste) => liste.map((k) => (k.id === id ? { ...k, erledigt } : k)));
  }

  loeschen(id: string): void {
    this.kommentare.update((liste) => liste.filter((k) => k.id !== id));
  }

  zuruecksetzen(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.kommentare.set(SEED_KOMMENTARE.map((k) => JSON.parse(JSON.stringify(k)) as Kommentar));
  }
}

function laden(): Kommentar[] {
  try {
    const roh = localStorage.getItem(STORAGE_KEY);
    if (roh) {
      const ablage = JSON.parse(roh) as Ablage;
      if (ablage.version === KOMMENTAR_SEED_VERSION && Array.isArray(ablage.kommentare)) {
        return ablage.kommentare;
      }
    }
  } catch {
    // defekter Stand — neu seeden
  }
  return SEED_KOMMENTARE.map((k) => JSON.parse(JSON.stringify(k)) as Kommentar);
}
