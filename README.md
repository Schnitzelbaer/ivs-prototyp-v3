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

Was dort steht, ist geklärt und gilt, bis es ausdrücklich geändert wird.

## Zuschnitt

- **Fokus:** Kern-Workflow in voller Tiefe — Übersicht/Dashboard (04) →
  Objektbearbeitung (07) → Prüfen und Kommentieren (09/10). Nebenblöcke
  (Accounts, Stammdaten, Arbeitspakete, 360°, Reports) als einfachere,
  aber vorhandene Screens.
- **Vier Varianten** als eigenständige Prototypen über eine Prototypen-Übersicht
  erreichbar, mit gemeinsamer Basis aus Mock-Daten und Basiskomponenten.
- **Karte:** ArcGIS Maps SDK for JavaScript mit swisstopo-WMTS-Hintergrund,
  Vorgehen wie im Projekt `ivs-map`.
- **Tablet-Tauglichkeit** ab 768 px inkl. Touch von Beginn an mitgedacht.

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

## Stand

Setup steht, der Prototyp ist noch nicht gebaut. `src/app/app.html` ist eine
Platzhalter-Seite zur Verifikation und wird durch die Prototypen-Übersicht
ersetzt.

## Verwandte Projekte

| Projekt | Inhalt |
|---|---|
| `ivs-map` | Testdaten (Testgebiet Bern) und Referenz-Kartenimplementation |
| `ivs-prototyp` | Älterer Prototyp, nur begrenzt als Inspiration zu verwenden |

## Sprache

Alle Inhalte auf Deutsch in Schweizer Rechtschreibung — niemals «ß», immer «ss».
