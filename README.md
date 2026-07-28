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

## Verwandte Projekte

| Projekt | Inhalt |
|---|---|
| `ivs-map` | Testdaten (Testgebiet Bern) und Referenz-Kartenimplementation |
| `ivs-prototyp` | Älterer Prototyp, nur begrenzt als Inspiration zu verwenden |

## Sprache

Alle Inhalte auf Deutsch in Schweizer Rechtschreibung — niemals «ß», immer «ss».
