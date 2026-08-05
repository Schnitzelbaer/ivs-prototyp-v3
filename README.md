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

| Baustein        | Version                 | Bemerkung                                                      |
| --------------- | ----------------------- | -------------------------------------------------------------- |
| Angular         | 22                      | Standalone, kein SSR (ArcGIS-SDK ist browser-only)             |
| Tailwind CSS    | 4                       | via `@tailwindcss/postcss`, konfiguriert in `.postcssrc.json`  |
| spartan/ui      | 1.1.2                   | alle 57 Primitives generiert unter `libs/ui`, Style «vega»     |
| Theme           | shadcn-Preset `bInUyNX` | Indigo auf neutraler Basis, Radius 0.45 rem, Noto Sans, Lucide |
| ArcGIS Maps SDK | 5                       | `@arcgis/core`, für die Karte ohne Lizenzschlüssel nutzbar     |
| pnpm            | 11                      | Paketmanager                                                   |

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

Das spartan/ui-Regelwerk liegt als Skill im Repo (`.claude/skills/spartan/`).
Nach grösseren Änderungen lohnt sich:

```bash
pnpm ng g @spartan-ng/cli:healthcheck
```

## Deployment

Live: **<https://ivs-prototyp-v3.vercel.app>**

```bash
vercel --prod
```

Die Konfiguration steht in `vercel.json` — Build nach
`dist/ivs-prototyp-v3/browser` und ein SPA-Rewrite auf `index.html`, ohne den
Deep Links wie `/objekt/be-21-1-2` und das Kartenfenster `/karte` beim direkten
Aufruf ins Leere laufen.

**Auto-Deploy ist aktiv:** Jeder Push auf `main` deployt automatisch in die
Produktion — `vercel --prod` braucht es nur für Deploys ohne Commit. Welcher
Commit live ist, zeigt `vercel ls ivs-prototyp-v3` (Details in Abschnitt 12.7
des Fachkontexts).

## Kitchen Sink

Unter `/kitchen-sink` liegt eine Referenzseite mit **allen** spartan/ui-Primitives
im Theme des Projekts, mit Beispielinhalten aus der IVS-Fachdomäne und einem
Umschalter für hell/dunkel. Sie dient als Nachschlagewerk beim Bauen des
Prototyps — Quellcode unter `src/app/kitchen-sink/`, je ein Abschnitt pro
Themengruppe.

## Stand

Der Kern-Workflow steht in fünfter Ausbaustufe (02.08.2026, Review-Pakete
«Changes IVS» und «Neue ToDos» umgesetzt). Der vollständige Projektstand — abgestimmte
Entscheide, Architektur, Fallstricke und nächste Schritte — liegt in
[docs/IVS-Fachkontext-Prototyping.md](docs/IVS-Fachkontext-Prototyping.md),
Abschnitte 9.8, 12.4–12.6 und 14. Dieses Dokument allein genügt, um in einer
neuen Session weiterzuarbeiten.

- **Shell** (`src/app/shell/`): Icon-Leiste; das IVS-Logo führt zum
  Dashboard, «Perspektive wechseln» liegt im **Account-Menü** unten links
  (R-03…R-07 wählbar, der Button zeigt die aktive Rollen-Nummer) zusammen
  mit Profil und «Demodaten zurücksetzen»; die **Rolle gilt pro Tab**
  (sessionStorage) — mehrere Perspektiven lassen sich nebeneinander öffnen;
  Dark-Mode, Sprachwechsler (Attrappe). Es gibt keine ausgegrauten
  Bedienelemente: Gesperrte Aktionen bleiben aktiv und erklären sich beim
  Klick in einem Modal (**nie-disabled-Regel**).
- **Objekt-Taxonomie und Legende**: Strecke → Linienführung → Abschnitt mit
  Substanz / mit viel Substanz / **Kunstbaute als spezifischer Abschnitt**.
  Überall dieselben Symbole (Karte, Kartenbild-Panel, Hierarchie-Menü,
  MapTip, Side-Panel): Strecke/Linienführung orange gleich dick, Abschnitte
  blau durchgezogen in drei Dicken, Wegbegleiter rot.
- **Dashboard** (`/dashboard`): **persönliche** Aufgabenliste, nur mit
  Strecken (ToDos werden auf Strecken-Ebene zugewiesen) — je Status
  erscheinen nur Objekte, die der aktiven Person zugewiesen sind oder
  laut Lognotizen einmal zugewiesen waren; gruppiert **nach allen acht
  Workflow-Stati** (leere Gruppen zugeklappt), Volltextsuche,
  Schnellfilter inkl. Status-Filter, Zeilen-Dropdown mit direktem
  Statuswechsel unter den von der Rolle setzbaren Stati,
  Polygon-Selektion auf der Karte als geographischer Filter. Die
  **Karte zeigt nur die Objekte der Liste**; Suche und Filter dezimieren
  sie mit. Generierte Objekte sind neutral «System» zugewiesen und
  erscheinen in keinem Dashboard. **Arbeitspakete** für R-03
  (Kantonspakete an die Regionale Koordination) und R-04 (freie Auswahl
  per Checkbox/Polygon an Inventarisierende) — die Zuweisung setzt
  Status «Zugewiesen», Person und Lognotiz in einem Zug; Paketrollen
  sehen alle Objekte und können per Ansicht-Umschalter auf die
  persönlichen Dashboards ihrer Personen **absteigen**.
- **Objektbearbeitung** (`/objekt/:id`): View-/Edit-Modus mit automatischem
  Speichern, Formular gemäss Skizze (Eckdaten mit Dufour-Situierungsausschnitt
  via swisstopo-WMS, NHG-Bewertung mit Punkteskalen, Empfehlungen, Geschichte
  & Gelände, Anhang, Prüfen/Freigabe, Inexistent mit Pflichtbegründung,
  Lognotizen), **Hierarchie-Menü** mit Legenden-Symbolen, Typ-Tags und
  Umteilen je Child-Zeile («…»-Kontextmenü, öffnet nur per Klick),
  **Status-Dropdown** (zeigt den aktuellen Status, setzbare Stati zur
  freien Wahl), **Personen-Dropdown** für die Zuweisung (protokolliert),
  **Back-Button** zur gemerkten Herkunftsseite, **Versionsvergleich**
  IVS 1.0 → 2.0 im Historie-Menü (Wort-Diff mit Änderungsmarkierungen plus
  Vergleichskarte, Deckkraft beider Stände separat regelbar),
  Begehungs-Einplanung sichtbar (Badge und 360°-Bereich),
  Bearbeitungslog-Sheet, **Prüfprotokoll** als Seitenleiste (Knopf
  «Prüfung», nur im Status «In Prüfung» für R-06/R-07: Ja/Nein-Fragen
  in vier Gruppen, Nein mit Pflichtbegründung; Befunde werden beim
  Zurückweisen zu Kommentaren und das Objekt geht in «Korrektur», ohne
  bestandenes Protokoll ist «Geprüft» gesperrt; R-07 sieht einen
  Platzhalter für ihr später spezifiziertes eigenes Protokoll).
- **Karte** (`src/app/karte/`): ArcGIS-Komponente mit swisstopo-WMTS und den
  `ivs-map`-Layern. Die Mock-Objekte haben keine eigenen Quelldaten — die
  bestehenden Layer (Routen, Teilsegmente, Punktobjekte) werden beim Laden
  mit den Objekt-Attributen angereichert (`karten-layer.ts`); die
  Teilsegmente sind nach Abschnitt-Typ symbolisiert, die Kunstbauten haben
  einen generierten Teilstück-Layer. Selektion mit SDK-Highlight, Abblendung
  und Zoom; Hover zeigt einen MapTip mit der Hierarchie und den
  Legenden-Symbolen, Klick öffnet das Objekt direkt — nur bei mehreren echt
  verschiedenen Objekten erscheint ein Kontextmenü. Das
  **Kartenbild-Panel** steuert Hintergründe additiv (Auge plus Deckkraft je
  Eintrag) und die Objekt-Layer. `/karte` öffnet ein eigenständiges
  Kartenfenster **mit Panel-Kopf** (Tabs Karte/360°/Kommentare, Zeichnen
  und Kommentieren inklusive), synchronisiert über BroadcastChannel und
  storage-Ereignisse.
- **Objekte** (`/objekte`): Kartenansicht mit **aufklappbarem
  Strecken-Baum** (nur Strecken auf erster Ebene), Suche und Filtern —
  sobald Filter oder Suche aktiv sind, wird auch die **Karte gefiltert**;
  ein Klick — auch auf der Karte — öffnet zuerst das Side-Panel mit dem
  **vollständigen** Objektinhalt samt Hierarchie-Menü (04.01–04.03),
  Export-Attrappe.
- **360°-Aufnahmen** (`/panorama`): Galerie der Befahrung mit echt drehbarem
  Platzhalter-Panorama (generierte, nahtlose SVGs), Vor-/Zurück-Navigation,
  Karte mit Standort und live mitdrehendem Blickrichtungskegel.
- **Begehungen** (`/begehungen`, eigener Tab): Reihenfolge, Verkehrsmittel,
  Unterkunft und Zeitbedarf der Feldeinsätze; planen dürfen R-03/04/06/07
  (auch aus der Objektbearbeitung heraus), andere Rollen sehen alles.
- **Kommentare** (09/10): Panel mit Threads, Erledigt-Kennzeichnung, Suche,
  Filtern (Standard «Offene»; objektübergreifende Listen zeigen nur die
  eigenen — zugewiesen, mal zugewiesen oder erwähnt), `@`-Erwähnungen und
  `#`-Attribut-Referenzen (springen im Formular zum Feld); Kommentare an
  Objekten jeder Ebene oder frei auf der Karte (Sprechblasen-Pins,
  Platzier-Werkzeug, optionale Objektzuweisung).
- **Detail-Werkzeuge**: Rich-Text-Editor (07.17) für Geschichte/Gelände,
  Geometrie-Editing (05.05/05.09: zeichnen, verschieben, Stützpunkte,
  verschneiden, zusammenfügen, Snapping), Hintergrundkarten und Overlays
  mit Transparenz (05.04), Objekt umteilen (07.09), Quellen zusammenstellen
  mit simulierter Literaturdatenbank-Abfrage (07.18).
- **Stammdatenverwaltung** (`/stammdaten`, nur R-03): Auswahllisten mit
  DE/FR/IT, deaktivieren statt löschen (02.01/02.02); die Wegbegleiter-Typen
  speisen das Objektformular.
- **Mock-Daten**: 48 kuratierte Objekte (`src/app/core/seed-data.ts`, fünf
  Strecken mit ausformulierten Beschrieben, inkl. zweier Kunstbauten) plus
  eine generierte **Vollabdeckung** aller Testgeometrien
  (`src/app/core/objekt-generierung.ts`): Jede Route, jedes Teilsegment und
  jedes Punktobjekt gehört zu einem Mock-Objekt (insgesamt ~3742 inkl. 148
  Kunstbauten, generierte im Status «publiziert») und reagiert auf der
  Karte auf Hover und Klick. Die Ableitung folgt den echten Gruppierungen
  (`ivs_ivsfk` → Strecke, `ivs_signatur` → Linienführung, Route →
  Abschnitt; Ein-Routen-Linienführungen werden über die Teilsegmente in
  Abschnitte zerlegt, damit Abschnittslängen nur selten der Linienführung
  entsprechen), räumlich getrennte Gruppen werden über
  Zusammenhangskomponenten aufgeteilt — kein Objekt besteht aus
  unverbundenen Stücken. Rund jede sechste Linienführung erhält eine
  generierte Kunstbaute mit eigener Teilstück-Geometrie. Änderungen
  überleben im localStorage (`SEED_VERSION` erhöhen verwirft sie).

Noch offen (spätere Etappen): Umsetzungsvermerk der Inventarisierenden und
das eigene Protokoll der Fachlichen Prüfstelle im Prüfprotokoll,
Nebenblöcke (Accounts, Reports, Einsatzlisten).

Die Zuordnung Signatur → Testdaten-Feature liegt in
`src/app/karte/karten-layer.ts` und wird zur Laufzeit auf die geladenen
GeoJSON-Layer gestempelt.

## Verwandte Projekte

| Projekt        | Inhalt                                                        |
| -------------- | ------------------------------------------------------------- |
| `ivs-map`      | Testdaten (Testgebiet Bern) und Referenz-Kartenimplementation |
| `ivs-prototyp` | Älterer Prototyp, nur begrenzt als Inspiration zu verwenden   |

## Sprache

Alle Inhalte auf Deutsch in Schweizer Rechtschreibung — niemals «ß», immer «ss».
