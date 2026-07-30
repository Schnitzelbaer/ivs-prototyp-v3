# IVS-Prototyp v3

Prototyping für das **IVS-Nachführungstool** — kollaborative, rollenbasierte
Pflege und Publikation des Bundesinventars der historischen Verkehrswege der
Schweiz (IVS). Auftraggeber ASTRA.

Zweck der Prototypen: UX-Validierung mit Stakeholdern, zugleich Vorarbeit für
die Umsetzung.

## Fachlicher Kontext

Der gesamte abgestimmte Fachkontext — Rollen, Objektmodell, User Story Map,
funktionale und nicht-funktionale Anforderungen, Workflow-Stati, Testdaten und
die bereits getroffenen Prototyping-Vorgaben — liegt in:

- [docs/IVS-Fachkontext-Prototyping.md](docs/IVS-Fachkontext-Prototyping.md)

Was dort steht, ist geklärt und gilt, bis es ausdrücklich geändert wird. Das
Dokument enthält neben dem Fachkontext auch den festgelegten Stack (Abschnitt 12)
und die **Leitplanken für die Zusammenarbeit** (Abschnitt 13) — insbesondere:
nicht vom Stack abweichen und keine neuen Komponenten bauen, ohne vorher zu
fragen. Es ist so gebaut, dass es sich in eine neue Session einspeisen lässt.

## Zuschnitt

- **Fokus:** Kern-Workflow in voller Tiefe — Übersicht/Dashboard (04) →
  Objektbearbeitung (07) → Prüfen und Kommentieren (09/10). Nebenblöcke
  (Accounts, Stammdaten, Arbeitspakete, 360°, Reports) als einfachere,
  aber vorhandene Screens.
- **Karte:** ArcGIS Maps SDK for JavaScript mit swisstopo-WMTS-Hintergrund,
  Vorgehen wie im Projekt `ivs-map`.
- **Tablet-Tauglichkeit** ab 768 px inkl. Touch von Beginn an mitgedacht.
  Auf Geräten mit ungenauer Eingabe (`@media (pointer: coarse)`) werden alle
  Bedienelemente automatisch auf mindestens 44 px vergrössert — ohne Umschalter,
  siehe `src/styles.css`.

## Technischer Stack

| Baustein | Version | Bemerkung |
|---|---|---|
| Angular | 22 | Standalone, kein SSR (ArcGIS-SDK ist browser-only) |
| Tailwind CSS | 4 | via `@tailwindcss/postcss`, konfiguriert in `.postcssrc.json` |
| spartan/ui | 1.1.2 | alle 57 Primitives generiert unter `libs/ui`, Style «vega» |
| Theme | shadcn-Preset `bInUyNX` | Indigo auf neutraler Basis, Radius 0.45 rem, Noto Sans, Lucide |
| ArcGIS Maps SDK | 5 | `@arcgis/core`, für die Karte ohne Lizenzschlüssel nutzbar |
| pnpm | 11 | Paketmanager |

spartan/ui kopiert seinen Quellcode ins Projekt (shadcn-Prinzip) — die
Komponenten unter `libs/ui` sind unser Code und dürfen angepasst werden. Der
Import läuft über den Alias `@spartan-ng/helm/*`, gemappt in `tsconfig.json`.
Konfiguration des Generators: `components.json`.

Das Theme stammt aus dem shadcn-Preset-Builder (Code `bInUyNX`). Übernommen
wurde nur der Inhalt, nicht der Mechanismus: `shadcn apply --preset` würde
React-Komponenten installieren und `components.json` umschreiben und ist für
uns nicht nutzbar. Die Tokens liegen in `src/styles.css`, der Style in
`components.json`. **Ein Wechsel des Styles erfordert, `libs/ui` zu verwerfen
und alle Komponenten neu zu generieren** — eigene Anpassungen an den
Komponenten gingen dabei verloren.

## Entwicklung

```bash
pnpm install
```

```bash
pnpm start
```

Weitere Komponenten nachziehen (falls neue Primitives dazukommen):

```bash
pnpm ng g @spartan-ng/cli:ui <name>
```

`pnpm test` schlägt derzeit mit «No tests found» fehl — für die Prototypen sind
keine Unit-Tests vorgesehen.

## Kitchen Sink

Unter `/kitchen-sink` liegt eine Referenzseite mit **allen** spartan/ui-Primitives
im Theme des Projekts, mit Beispielinhalten aus der IVS-Fachdomäne und einem
Umschalter für hell/dunkel. Sie dient als Nachschlagewerk beim Bauen des
Prototyps — Quellcode unter `src/app/kitchen-sink/`, je ein Abschnitt pro
Themengruppe.

## Stand

Der Kern-Workflow des Prototyps steht in erster Ausbaustufe:

- **Shell** (`src/app/shell/`): Icon-Leiste mit verstecktem **Rollenmenü**
  hinter dem IVS-Logo (R-03…R-07 wählbar, übrige aufgeführt aber gesperrt),
  Dark-Mode, Profil mit «Demodaten zurücksetzen», Sprachwechsler (Attrappe).
- **Dashboard** (`/dashboard`): rollenspezifisch vorgefilterte Aufgabenliste,
  gruppiert nach Backlog / In Arbeit / Done (Mapping der acht Workflow-Stati),
  Volltextsuche, Schnellfilter, Inline-Statuswechsel gemäss Rollenrechten,
  Polygon-Selektion auf der Karte als geographischer Filter.
- **Objektbearbeitung** (`/objekt/:id`): View-/Edit-Modus mit automatischem
  Speichern, Formular gemäss Skizze (Eckdaten mit Dufour-Situierungsausschnitt
  via swisstopo-WMS, NHG-Bewertung mit Punkteskalen, Empfehlungen, Geschichte
  & Gelände, Anhang, Prüfen/Freigabe, Inexistent mit Pflichtbegründung,
  Lognotizen), Hierarchie-Dropdown zum Wechsel zwischen Parent-/Child-Objekten,
  Statusübergänge je Rolle mit automatischem Logeintrag, Bearbeitungslog-Sheet.
- **Karte** (`src/app/karte/`): ArcGIS-Komponente mit swisstopo-WMTS, allen
  `ivs-map`-Layern und den Objekt-Layern; Selektion mit Hervorhebung/Zoom.
  `/karte` öffnet ein eigenständiges Kartenfenster, das per BroadcastChannel
  bidirektional mit dem Hauptfenster synchronisiert (Selektion, Objekt-Klick).
- **Objekte** (`/objekte`): Kartenansicht mit dezenter Objektliste, Suche,
  Filtern und Side-Panel mit dem Objektinhalt (04.01–04.03), Export-Attrappe.
- **360°-Aufnahmen** (`/panorama`): Galerie der Befahrung mit echt drehbarem
  Platzhalter-Panorama (generierte, nahtlose SVGs), Vor-/Zurück-Navigation,
  Karte mit Standort und live mitdrehendem Blickrichtungskegel — plus
  **Begehungsplanung** (Reihenfolge, Verkehrsmittel, Unterkunft, Zeitbedarf),
  auch aus der Objektbearbeitung heraus.
- **Kommentare** (09/10): Panel mit Threads, Erledigt-Kennzeichnung, Suche,
  Filtern, `@`-Erwähnungen und `#`-Attribut-Referenzen (springen im Formular
  zum Feld); Kommentare an Objekten jeder Ebene oder frei auf der Karte
  (Sprechblasen-Pins, Platzier-Werkzeug, optionale Objektzuweisung).
- **Detail-Werkzeuge**: Rich-Text-Editor (07.17) für Geschichte/Gelände,
  Geometrie-Editing (05.05/05.09: zeichnen, verschieben, Stützpunkte,
  verschneiden, zusammenfügen, Snapping), Hintergrundkarten und Overlays
  mit Transparenz (05.04), Objekt umteilen (07.09), Quellen zusammenstellen
  mit simulierter Literaturdatenbank-Abfrage (07.18).
- **Stammdatenverwaltung** (`/stammdaten`, nur R-03): Auswahllisten mit
  DE/FR/IT, deaktivieren statt löschen (02.01/02.02); die Wegbegleiter-Typen
  speisen das Objektformular.
- **Mock-Daten** (`src/app/core/seed-data.ts`): 46 Objekte im Testgebiet Bern
  (5 Strecken, 9 Linienführungen, 22 Abschnitte, 10 Wegbegleiter), abgeleitet
  aus den echten Gruppierungen der Testdaten (`ivs_ivsfk`, `ivs_signatur`);
  Änderungen überleben im localStorage (`SEED_VERSION` erhöhen verwirft sie).

Noch offen (spätere Etappen): Prüfprotokoll/Checkliste 1, Versionsvergleich,
Nebenblöcke (Accounts, Arbeitspakete, Reports).

Die Objekt-Geometrien erzeugt `tools/build-objekte.mjs` aus den Testdaten
(`node tools/build-objekte.mjs` → `public/data/ivs-objekte.geojson` und
`ivs-wegbegleiter.geojson` — getrennt, weil ein GeoJSONLayer nur einen
Geometrietyp trägt).

## Verwandte Projekte

| Projekt | Inhalt |
|---|---|
| `ivs-map` | Testdaten (Testgebiet Bern) und Referenz-Kartenimplementation |
| `ivs-prototyp` | Älterer Prototyp, nur begrenzt als Inspiration zu verwenden |

## Sprache

Alle Inhalte auf Deutsch in Schweizer Rechtschreibung — niemals «ß», immer «ss».
