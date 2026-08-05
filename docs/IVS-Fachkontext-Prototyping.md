# IVS-Nachführungstool — Kontext für das Prototyping

> **Zweck dieses Dokuments.** Es bündelt den gesamten Kontext für das Prototyping
> des IVS-Nachführungstools: den fachlichen Teil (Abschnitte 1–11) aus
> Detailspezifikation, User Story Map, dem Aufbau der echten IVS-Objektbeschriebe
> und den verfügbaren Testdaten — sowie den technischen Teil (Abschnitte 12–14)
> mit dem festgelegten Stack, dem Stand der Arbeit, den Leitplanken für die
> Zusammenarbeit und den nächsten Schritten.
>
> **Verwendung.** In eine neue Session einfügen oder als Datei referenzieren.
> Was hier steht, ist geklärt und muss nicht erneut erfragt werden. Das
> Dokument ist so gehalten, dass eine neue Session ohne den bisherigen
> Chatverlauf weiterarbeiten kann.
>
> **Vor dem Loslegen bitte Abschnitt 13 lesen.** Dort stehen die verbindlichen
> Leitplanken — insbesondere: **nicht vom Stack abweichen** und **keine neuen
> Komponenten bauen**, ohne vorher zu fragen.
>
> **Der schnellste Einstieg** in den heutigen Stand: Abschnitt 9.8
> (abgestimmte Detailentscheide, aktuell bis Nr. 84), 12.4 (Projektstruktur
> und Persistenz), 12.5 (was gebaut ist), 12.6 (Fallstricke — bitte wirklich
> lesen, sie sparen Stunden), 12.7 (Deployment) und 14 (nächste Schritte).
>
> **Stand:** 05.08.2026, siebte Ausbaustufe (Review-Paket «Verbesserungen»:
> Status «Offen», Zuständigkeit über das Dashboard, Kantonspakete mit allen
> 26 Kantonen, Arbeitspakete als persistente Entitäten, echte
> Attributfilter — Entscheide 79–84). Repository auf `main`. Live unter
> <https://ivs-prototyp-v3.vercel.app>, Auto-Deploy aus `main` aktiv (12.7).
>
> **Ein spartan/ui-Skill liegt im Repo** (`.claude/skills/spartan/`, per
> Symlink auf `.agents/skills/spartan/`) und wird von Claude Code automatisch
> geladen. Er enthält das verbindliche Regelwerk der Bibliothek — semantische
> Farbtokens, Komposition, Formulare, Icons — plus die CLI-Generatoren
> (`ng g @spartan-ng/cli:info --json`, `:healthcheck`, `:ui <name>`). Der
> `healthcheck` läuft aktuell mit 29 von 29 grünen Prüfungen durch.

---

## 1. Ausgangslage

Das **IVS-Nachführungstool** ermöglicht die kollaborative, rollenbasierte Pflege
und Publikation des **Bundesinventars der historischen Verkehrswege der Schweiz
(IVS)**. Das Web-GIS umfasst:

- Bearbeitung von **Geo- und Sachdaten**
- ein **mehrstufiges fachliches Review**
- die **Freigabe für die Publikation** an swisstopo
- **Reports** während der Bearbeitung und als Bestandteil der rechtsverbindlichen
  Inventarpublikation nach Abschluss und Genehmigung der Nachführung

Auftraggeber ist das ASTRA. Betrieb beim Bund (BIT), Authentifizierung über eIAM.

---

## 2. Rollen

Die Spalte «Ref. Arbeitshilfe» zeigt die Rollen der Arbeitshilfe, welche die
entsprechende Zugriffsrolle erhalten. Eine Person kann mehrere Rollen erhalten
(z. B. Ausbildungsverantwortliche).

| ID   | Rolle                     | Ref. Arbeitshilfe                                                    | Beschreibung                                                                     | Hauptverantwortung im Prozess                                                                       |
| ---- | ------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| R-01 | Alle Benutzer             | —                                                                    | Authentifizierte Personen                                                        | Anmeldung via eIAM; Erstellung von Reports                                                          |
| R-02 | Technische Administration | —                                                                    | Verantwortlich für Systemzugriff                                                 | Verwaltung Accounts, Berechtigungen, technische Konfiguration                                       |
| R-03 | Fachliche Administration  | PL ASTRA, Gesamtkoordination                                         | Fachverantwortliche Stellen                                                      | Verwaltung von Auswahllisten/Stammdaten, Freigabe von Versionen, Zusammenstellen von Arbeitspaketen |
| R-04 | Regionale Koordination    | Teamleitung                                                          | Verantwortlicher eines oder mehrerer Inventarisierungsteams                      | Koordiniert die Inventarisierenden seines Gebietes                                                  |
| R-05 | Inventarisierende         | Inventarisierungsteam, Inventarisierende, Ausbildungsverantwortliche | Externe/interne Bearbeitende                                                     | Erfassung und Aktualisierung von Bundes-Objekten                                                    |
| R-06 | Fachlektorat              | Fachlektorat, Sprachlektorat, Ausbildungsverantwortliche             | Fachliches Review, 1. Stufe der Qualitätsprüfung                                 | Prüfung, Kommentierung, Rückmeldung an Inventarisierende, Editieren                                 |
| R-07 | Fachliche Prüfstelle      | Fachexperte/in, Kantonale IVS-Fachstellen, Fachgremium               | Prüfung während des Genehmigungsverfahrens, 1. und 2. Stufe der Qualitätsprüfung | Kann gewisse Felder kommentieren. Nur bei Objekten in festgelegten Gebieten resp. schweizweit       |
| R-08 | System                    | —                                                                    | Automatisierte Prozesse                                                          | Statuswechsel, Zuweisungen                                                                          |

---

## 3. Objektmodell und Notation

### 3.1 Hierarchie

```
Strecke              VS 1          Brig/Glis - Gondo (- Domodossola); Simplonpass
  └ Linienführung    VS 1.2        Saumweg (Mittelalter und Stockalper)
      └ Abschnitt    VS 1.2.14     Sengg - Simplon Dorf
Wegbegleiter (Punktobjekte)        Gasthaus, Brücke, Stundenstein, …
```

Die Notation ist **kantonskürzel + fortlaufende Nummerierung**, punktgetrennt je
Ebene. Objekte sind untereinander verlinkt (Parent/Child) und referenzieren sich
im Text gegenseitig (z. B. «s. VS 1.2.4»).

### 3.2 Aufbau eines Objektbeschriebs (aus den Originaldokumenten)

Kopfbereich jeder Seite:

- Links: `IVS — INVENTAR HISTORISCHER VERKEHRSWEGE DER SCHWEIZ`
- Rechts, invertierter Balken: die Signatur, z. B. `VS 1`, `VS 1.2`, `VS 1.2.14`
- Zeilen: `IVS Dokumentation`, `Kanton Wallis`, `Bedeutung National`, `Seite N`

Standardisierte Vorbemerkung (rot) auf Seite 1:

> «Die Dokumentation beschreibt auch Objekte (Strecken, Linienführungen,
> Abschnitte), welche nur noch wenig oder keine historische Wegsubstanz
> enthalten. Diese sind in der Inventarkarte als graue Linien dargestellt. Sie
> sind historische Verkehrswege von nationaler Bedeutung, sind aber nicht Teil
> des Bundesinventars (Art. 3 VIVS).»

Identifikationsblock (je nach Ebene):

```
Strecke  VS 1          Brig/Glis - Gondo (- Domodossola); Simplonpass
Linienführung  2       Saumweg (Mittelalter und Stockalper)
Abschnitt  14          Sengg - Simplon Dorf
Landeskarte            1289, 1309
```

Kapitel:

- **GESCHICHTE** — mit Bearbeitungsvermerk `Stand  Juli 1993 / RF, Ae`.
  Fliesstext über mehrere Absätze, chronologisch gegliedert (Ur- und
  Frühgeschichte, Römische Zeit, Hochmittelalter, …), mit Literaturzitaten im
  Stil `(ANDEREGG 1986: 38)`, `(BÜTTNER 1953: 583)`, `(GREMAUD 1875/I: 199)`
  und Querverweisen `(s. VS 1.2)`.
- **GELÄNDE** — mit Aufnahmevermerk `Aufnahme  24. Juli 1992 / RF`.
  Beschreibung der erhaltenen Wegsubstanz: Hangweg, Stützmauern, Pflästerung,
  Querabschläge (steilgestellte Steinplatten), Trockenmauern, Breitenangaben
  in Metern, Zustand und Datierung von Ausbaustufen.
- **Abbildungen** mit Legende im linken Seitenrand, z. B.
  «Frei gelegte Pflästerung oberhalb Simplon Dorf. Abb. 1 (RF, 23. 7. 1992)».
- Auf Streckenebene zusätzlich **Nachträge** mit eigenem Vermerk, z. B.
  «Ergänzung der Fassung von 1992/94 von Roland Flückiger (Klaus Aerni, 10. 1. 2003)» mit nummerierten Punkten.
- Abschluss: `—— Ende des Beschriebs ——`

**Merkmale für realistische Mock-Texte:** wissenschaftlicher, nüchterner Ton;
lange Absätze; Kürzel für Bearbeitende (RF, Ae); Jahreszahlen und
Quellenangaben; Verweise auf benachbarte Objekte; Beschriebe auf tieferen Ebenen
sind kürzer und konkreter als auf Streckenebene.

### 3.3 Fachliche Attribute

- **Bedeutung:** national / regional / lokal
- **Substanzgrad:** viel Substanz / mit Substanz / wenig Substanz / ohne Substanz
- **Weitere Stammdaten:** Wegoberflächen, Wegformen, Wegbegleiter, Kunstbauten,
  Typ des GIS-Objekts, Status der Bearbeitung
- **Versionierung:** Inventarversionen (z. B. IVS 1.0 als Basis, IVS 2.0 als
  laufende Nachführung)

---

## 4. Prozess (User Story Map)

Grundlage ist die **überarbeitete Fassung** der User Story Map. Sie ersetzt die
frühere Fassung vollständig. Gegenüber der alten Karte sind die Personas nun
durchgehend mit den Rollen-IDs aus Abschnitt 2 beschriftet, es gibt eine dritte
Markierungsfarbe für Ergänzungen aus der Arbeitshilfe, und die Prüfschritte sind
mit den Bearbeitungsschritten durch eine explizite Rückkopplung verbunden.

### 4.1 Aufbau des Boards

Vier Zeilen von oben nach unten:

| Zeile | Farbe   | Bedeutung          |
| ----- | ------- | ------------------ |
| Wer   | violett | Persona / Rolle    |
| Warum | grün    | Ziel               |
| Was   | blau    | Aufgabe (Backbone) |
| Wie   | gelb    | Teilaufgabe        |

### 4.2 Markierungen

| Markierung | Farbe    | Bedeutung                                                      |
| ---------- | -------- | -------------------------------------------------------------- |
| `[Feld]`   | hellblau | «Muss im Feld möglich sein» — betrifft Backbone-Karten         |
| `[WS]`     | orange   | «Ergänzungen im Workshop»                                      |
| `[AH]`     | pink     | «Ergänzungen aus der Arbeitshilfe» — **neu in dieser Fassung** |
| `[SOLL]`   | Badge    | Priorität Soll, direkt auf der Karte vermerkt                  |
| `[?]`      | rot      | offene Frage auf dem Board                                     |

Als `[Feld]` markiert sind die Backbone-Aufgaben **Bearbeitungsstand prüfen,
Bildmaterial ergänzen, Kartendaten anpassen, Informationen bearbeiten** und
**Bedeutung einschätzen**. Das ist der Teil des Prozesses, der auf dem Tablet
draussen funktionieren muss (vgl. N12).

Die `[AH]`-Karten stammen aus der Arbeitshilfe und sind fachlich verbindlicher
als die Workshop-Ergänzungen. Sie führen mit dem **Prüfprotokoll** ein Konzept
ein, das in der alten Karte fehlte (siehe 4.5).

### 4.3 Backbone

| Aufgabe (Backbone)                | Persona                                                                    | Ziel                                              |
| --------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------- |
| Anmelden                          | Alle Benutzer (R-01)                                                       | Zugriff aufs IVS beschränken                      |
| Zutritte verteilen (manuell)      | Technische Administration (R-02)                                           | Zugriff aufs IVS beschränken                      |
| Verwalten von Auswahllisten       | — (keine Persona auf dem Board)                                            | Basis für Erfassung und Beurteilung schaffen      |
| 360-Grad-Bilder importieren       | `[?]`                                                                      | Basis für Erfassung und Beurteilung schaffen      |
| Lücken bestimmen                  | Regionale Koordination (R-04), Fachliche Administration (R-03)             | Koordination der Erfassung                        |
| Arbeitspakete zuweisen            | Fachliche Administration (R-03)                                            | Koordination der Erfassung                        |
| Bearbeitungsstand prüfen `[Feld]` | Fachlektorat (R-06), Inventarisierende (R-05)                              | Inventar auf neuesten Stand bringen und halten    |
| Bildmaterial ergänzen `[Feld]`    | Fachlektorat (R-06), Inventarisierende (R-05)                              | Inventar auf neuesten Stand bringen und halten    |
| Kartendaten anpassen `[Feld]`     | Fachlektorat (R-06), Inventarisierende (R-05)                              | Inventar auf neuesten Stand bringen und halten    |
| Informationen bearbeiten `[Feld]` | Fachlektorat (R-06), Inventarisierende (R-05)                              | Inventar auf neuesten Stand bringen und halten    |
| Bedeutung einschätzen `[Feld]`    | Fachlektorat (R-06), Inventarisierende (R-05)                              | Inventar auf neuesten Stand bringen und halten    |
| Bericht generieren                | Fachlektorat (R-06), Inventarisierende (R-05)                              | Inventar auf neuesten Stand bringen und halten    |
| Status wechseln                   | Inventarisierende (R-05), Fachlektorat (R-06)                              | Qualität des Inventars sicherstellen              |
| Versionen vergleichen             | Inventarisierende (R-05), Fachlektorat (R-06)                              | Qualität des Inventars sicherstellen              |
| Fachliche Prüfung                 | Fachlektorat (R-06)                                                        | Qualität des Inventars sicherstellen              |
| Kommentieren                      | Fachlektorat (R-06), Fachliche Prüfstelle (R-07), Inventarisierende (R-05) | Qualität des Inventars sicherstellen              |
| Sprachliche Prüfung               | Sprachlektorat (gleiche Rolle wie Fachlektorat R-06)                       | Qualität des Inventars sicherstellen              |
| Übergreifende Prüfung             | Fachliche Prüfstelle (R-07)                                                | Qualität des Inventars sicherstellen              |
| Zusammenfassung prüfen            | — (keine Persona auf dem Board)                                            | Qualität des Inventars sicherstellen              |
| Rückmeldungen einarbeiten         | Inventarisierende (R-05)                                                   | Qualität des Inventars sicherstellen              |
| Version definitiv setzen          | Fachliche Administration (R-03)                                            | Inventar der Öffentlichkeit zur Verfügung stellen |
| Freigeben                         | Fachliche Prüfstelle (R-07), Fachliche Administration (R-03)               | Inventar der Öffentlichkeit zur Verfügung stellen |
| Publizieren                       | System (R-08), swisstopo                                                   | Inventar der Öffentlichkeit zur Verfügung stellen |
| Reports erstellen                 | `[?]`                                                                      | `[?]`                                             |

**Änderungen gegenüber der alten Fassung, die für das Prototyping zählen:**

- **Sprachlektorat ist keine eigene Zugriffsrolle**, sondern «gleiche Rolle wie
  Fachlektorat R-06». Der Rollen-Umschalter braucht dafür keinen eigenen
  Eintrag; die sprachliche Prüfung ist eine Aufgabe innerhalb von R-06.
- **Übergreifende Prüfung liegt bei R-07** (vorher unspezifisch «Kantone,
  Externe»).
- **Freigeben nennt neben R-03 zusätzlich R-07.** Das steht in Spannung zu
  Abschnitt 7, wo die Freigabe allein bei R-03 liegt (siehe Abschnitt 10).
- **Lücken bestimmen liegt bei R-04 und R-03** (vorher «Kantone, Fachlicher
  Admin»).
- **Bericht generieren** hat neu dieselbe Persona wie die Bearbeitungsschritte.
- Für **Verwalten von Auswahllisten** und **Zusammenfassung prüfen** ist auf dem
  Board keine Persona gesetzt.

### 4.4 Teilaufgaben je Abschnitt

**Anmelden** — keine Teilaufgaben.

**Zutritte verteilen (manuell):** Accounts on-boarden · Zugriffsstufen · Rollen
verwalten (erstellen, umbenennen, löschen) · Rechte verwalten (erstellen,
umbenennen, löschen, an Rolle zuweisen) · Benutzer erfassen, disablen, für
Bearbeitung sperren · Rolle & Rechte zuweisen, entfernen

**Verwalten von Auswahllisten:** Auswahllisten von GIS-Objekten · Auswahllisten
von Objektbeschrieben · `[?]` Noch andere Stammdaten verwalten?

**360-Grad-Bilder importieren:** `[WS]` Schweiz wird gesamthaft aufgezeichnet ·
`[WS]` Als eigener Layer in Karte verfügbar · `[WS]` Zu IVS-Objekten verlinkt

**Lücken bestimmen:** `[WS]` (Prov.?) auf Karte erfassen mit leerem
Obj.beschrieb

**Arbeitspakete zuweisen:** Layer mit vordefinierten Gebieten · Bearbeiter
zuweisen (Auswahl, 1..n) · Prüfenden manuell zuweisen · `[WS]` Gebiete
zusammenstellen · `[WS]` Gebiete werden an Anbieter (autom.?) zugewiesen ·
`[WS]` Gebiete an Personen zuweisen · `[WS]` Einsatzlisten generieren

**Bearbeitungsstand prüfen:** Grafische Übersicht mit Filter (gesamte Schweiz,
Gebiete, ?) · Übersicht IVS-Objekte (Liste mit Filter, Sortierung und Status,
Versionen, Zuständiger) · Ändern des Status in der Liste · Übersicht über eigene
/ zugewiesene Gebiete · Export gefilterte und sortierte Liste · Volltextsuche

**Bildmaterial ergänzen:** Fotos (auch historische) · Metadaten bearbeiten
(insb. Aufnahmedatum, Fotograf, Quelle, Aufnahmestandort) · Mehrere Bilder
möglich

**Kartendaten anpassen:** Layer dazuschalten (bspw. IVS-Gelände-, Dufourkarte) ·
Validierung gegen INTERLIS-Modell · Historisierung mit Datum, Name Person pro
Änderung GIS-Objekt · GIS-Objekte verlinken (dazu auffordern) · Segment
hinzufügen zu IVS-Obj., zusammenfassen, attribuieren · Kartendaten filtern ·
`[WS]` Zeichnen (Geografien) mit Tablet muss möglich sein · `[AH]`
Inventarisierende: IVS-Karteneinträge nach Prüfung überarbeiten

**Informationen bearbeiten:** Texte bearbeiten (Bearbeitungsmaske -> ISOS) ·
Automatisches Speichern · Links zu anderen IVS-Objekten · `[AH]` Links zu
kantonübergreifenden Objekten · Historisierung mit Datum, Name Person pro
Änderung / Löschung · `[SOLL]` Gelöschte Inhalte für spätere Bearbeitung zu
Verfügung stellen (Redo?) · Objekte auf nicht-existent oder wieder existent
setzen · Export IVS-Objekt · `[WS]` Notizen im Feld machen · `[AH]`
Inventarisierende: Beschriebe nach Prüfung überarbeiten · `[AH]` Fachlektorat:
Korrekturen anbringen · `[AH]` Textstellen, die diskutiert werden müssen, müssen
markiert werden können

**Bedeutung einschätzen:** National oder Regional · `[SOLL]` Liste mit Punkten
durchgehen und Bedeutung wird vorgeschlagen

**Bericht generieren** — keine Teilaufgaben.

**Status wechseln:** Zuweisung an Rolle · Notification · Zur Prüfung · An
Fachlektor · Zurück zu Inventarisierung · Freigabe · Zurück zu fachlichem Admin

**Versionen vergleichen:** Versionen nebeneinander · Änderungsmodus (analog
Word-Dokument) · Änderungen sollten ersichtlich sein

**Fachliche Prüfung:** Zeitstempel der Prüfung · Objektbeschrieb als geprüft
kennzeichnen · `[AH]` Prüfprotokoll auf Grundlage Checkliste 1 in jedem
Beschrieb integriert · `[AH]` Korrekturen an IVS-Karte im Prüfprotokoll des
entsprechenden Beschriebs festhalten · `[AH]` Karte und Beschriebe müssen in
separaten Fenstern geöffnet werden können für die Prüfung · `[AH]` Terminologie
prüfen

**Kommentieren:** Prüfregister QS wie SBB Tool · Kommentar erstellen · Kommentar
bearbeiten · Kommentar erledigen · Auf Kommentar antworten · `[WS]` Kommentare
werden für Inventarisierer erst ersichtlich, wenn Status wieder auf «In
Bearbeitung» oder «Korrektur» o. ä. · `[AH]` Inventarisierende müssen in einem
Prüfprotokoll festhalten, welche Befunde sie umgesetzt haben · `[AH]`
Abweichungen zu Befunden des Fachlektorats müssen festgehalten & begründet
werden · `[AH]` Fachgremium kann Kommentare zu einzelnen Beschrieben erfassen

**Sprachliche Prüfung:** `[WS]` Es wird nur in der Sprache der Region
dokumentiert (Appl. jedoch mehrsprachig) · `[AH]` Es dürfen keine inhaltlichen
Änderungen gemacht werden

**Übergreifende Prüfung:** `[AH]` Der Prüfbericht für die IVS-Dokumentation
eines Kantons muss im Erfassungstool integriert werden. Es ist nicht
erforderlich, ein Prüfprotokoll des Fachexperten pro Beschrieb zu integrieren,
da diese Detaillierung nicht angestrebt wird. **ABER**: der Fachexperte muss im
Tool ein Kommentarfeld nutzen können, um individuelle Hinweise pro Objekt
platzieren zu können. · `[AH]` Strittige Fälle, wo sich Fachexperten,
Inventarisierende und Fachlektorat nicht einig werden, sind mit der
Stellungnahme zur vertieften Prüfung und Fachentscheid an das Fachgremium zu
überweisen.

**Zusammenfassung prüfen:** Abstract des Objektbeschriebs als Orientierung für
allg. Bevölkerung hilfreich

**Rückmeldungen einarbeiten:** Korrekturen annehmen · Korrekturen ablehnen

**Version definitiv setzen** — keine Teilaufgaben.

**Freigeben:** Entscheid dokumentieren · Zeitstempel der Freigabe ·
Publikationsversion angeben · IVS-Objekt sperren nach Freigabe · Auf einen
Schlag freigeben

**Publizieren:** Export

**Reports erstellen:** Mutationshistorie · Zustände · Aktivitäten

### 4.5 Rückkopplung Prüfung → Bearbeitung

Neu auf dem Board ist eine gezeichnete Verbindung: von **Fachliche Prüfung**,
**Kommentieren**, **Sprachliche Prüfung** und **Übergreifende Prüfung** führt
eine gemeinsame Linie zurück zu je einem Pfeil auf **Kartendaten anpassen** und
**Informationen bearbeiten**.

```
Fachliche Prüfung ┐
Kommentieren      ├──────────┬──────────────┐
Sprachliche Prüf. │          ▼              ▼
Übergreifende Pr. ┘   Kartendaten    Informationen
                        anpassen       bearbeiten
```

Fachlich heisst das: Befunde aus allen vier Prüfschritten fliessen in dieselben
zwei Bearbeitungsmasken zurück — Geometrie und Text. Für das Prototyping ist das
die zentrale Schleife: Ein Befund muss von der Prüfansicht aus direkt an die
Stelle im Objektbeschrieb oder auf der Karte führen, an der er zu erledigen ist,
und der Weg zurück muss dokumentiert werden.

### 4.6 Das Prüfprotokoll

Die `[AH]`-Karten beschreiben ein durchgehendes Artefakt, das die alte Karte
nicht kannte. Verbindlich für das Prototyping:

- Das **Prüfprotokoll** basiert auf **Checkliste 1** und ist **in jedem
  Objektbeschrieb integriert** — kein separates Dokument.
- Das **Fachlektorat (R-06)** hält darin seine Befunde fest, inklusive
  Korrekturen an der IVS-Karte.
- Die **Inventarisierenden (R-05)** halten darin fest, welche Befunde sie
  umgesetzt haben; **Abweichungen müssen festgehalten und begründet werden**.
- Die **Fachliche Prüfstelle (R-07)** braucht **kein** Prüfprotokoll pro
  Beschrieb, sondern ein **Kommentarfeld pro Objekt**. Auf Kantonsebene wird
  hingegen ein **Prüfbericht für die gesamte IVS-Dokumentation eines Kantons**
  im Tool integriert.
- Das **Sprachlektorat** darf **keine inhaltlichen Änderungen** vornehmen.
- Strittige Fälle gehen mit Stellungnahme an ein **Fachgremium**, das ebenfalls
  Kommentare zu einzelnen Beschrieben erfassen kann.
- **Karte und Beschrieb müssen für die Prüfung in separaten Fenstern geöffnet
  werden können.**

Das Verhältnis zwischen «Prüfprotokoll» (aus der Arbeitshilfe) und
«Prüfregister QS wie SBB Tool» (aus dem Workshop) ist auf dem Board nicht
aufgelöst — siehe Abschnitt 10.

> **Gebaut (Entscheide 75/76, 05.08.2026).** Das Prüfprotokoll des
> Fachlektorats liegt als Seitenleiste im Objekt-Detail (Knopf «Prüfung»,
> nur auf Strecken im Status «In Prüfung»). Massgebend ist der
> **Fragenkatalog der Review-Vorlage vom 05.08.2026** (vier Gruppen,
> 8 Fragen mit Ja/Nein und Pflichtbegründung bei Nein) — er ersetzt im
> Prototyp die Checkliste 1 aus 4.7. Nein-Befunde werden beim
> Zurückweisen zu Kommentaren am Objekt, das Objekt geht in «Korrektur»;
> ohne durchwegs Ja ist «Geprüft» gesperrt. Die Fachliche Prüfstelle
> erhält ein eigenes Protokoll (noch zu spezifizieren).

### 4.7 Checkliste 1

> **Hinweis zum Stand:** Im Prototyp ist stattdessen der Fragenkatalog der
> Review-Vorlage vom 05.08.2026 gebaut (Entscheid 75, Wortlaut in
> `core/pruefprotokoll.ts`). Die folgende Checkliste bleibt als fachliche
> Grundlage der Arbeitshilfe dokumentiert.

Die Checkliste, auf der das Prüfprotokoll aufbaut. Neun Prüffragen, jede als
**binärer Schalter** (Toggle, erfüllt / nicht erfüllt) — keine Dreiwertigkeit,
kein «nicht anwendbar». Blau gesetzte Kapitelnummern sind Links in die
Arbeitshilfe beziehungsweise ins Terminologie-Handbuch.

| Nr. | Prüffrage                                                                                                                            | Verweis                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| 1   | Ist der Beschrieb verständlich?                                                                                                      | —                               |
| 2   | Sind Aufbau und Argumentation des Beschriebs nachvollziehbar?                                                                        | —                               |
| 3   | Entspricht der Inhalt des Beschriebs den Bestimmungen der Arbeitshilfe?                                                              | Arbeitshilfe Kap. 3.6, 4.7      |
| 4   | Ist der Inhalt des Beschriebs aktuell und für den Vollzug des IVS relevant?                                                          | —                               |
| 5   | Ist der Inhalt des Beschriebs widerspruchsfrei?                                                                                      | —                               |
| 6   | Werden inhaltliche Lücken explizit erwähnt und gegebenenfalls begründet? Sind die Begründungen nachvollziehbar und fachlich korrekt? | —                               |
| 7   | Ist die Terminologie der Beschriebe korrekt?                                                                                         | Terminologie-Handbuch           |
| 8   | Werden die wichtigsten Aussagen des Beschriebs hervorgehoben und korrekt bewertet?                                                   | Arbeitshilfe Kap. 5.1, 5.2, 5.3 |
| 9   | Entsprechen die Eckdaten dem Inhalt des Beschriebs?                                                                                  | —                               |

**Für das Prototyping relevant:**

- Die Liste ist **rein textbezogen**. Keine einzige Frage betrifft die
  Geometrie. Die `[AH]`-Karte «Korrekturen an IVS-Karte im Prüfprotokoll des
  entsprechenden Beschriebs festhalten» hat in Checkliste 1 also keine
  Entsprechung — Kartenbefunde landen im selben Protokoll, aber ausserhalb des
  Fragenrasters. Das Prüfprotokoll besteht demnach aus **Checkliste + freien
  Befunden**.
- Frage 7 deckt sich mit der `[AH]`-Karte «Terminologie prüfen» unter Fachliche
  Prüfung.
- Die Fragen 3, 7 und 8 verweisen auf externe Dokumente. Im Prototyp genügen
  Platzhalter-Links; das **Terminologie-Handbuch** liegt nicht vor.
- Ein Toggle allein trägt keine Begründung. Da abgelehnte Punkte laut Story Map
  begründet werden müssen, braucht jede Frage im Tool zusätzlich ein
  **Kommentarfeld** — mindestens dann, wenn der Schalter auf «nicht erfüllt»
  steht.

## 5. Funktionale Anforderungen

Die Spalte «Ref.» bezieht sich auf die Referenz der entsprechenden
Grobanforderungen. Priorität: **M** (Muss), **S** (Soll), **K** (Kann).

### 5.1 Accounts- und Rollenverwaltung

| ID    | Ref.       | Anforderung                 | Rolle              | Beschreibung                                    | Akzeptanzkriterium                         | Prio |
| ----- | ---------- | --------------------------- | ------------------ | ----------------------------------------------- | ------------------------------------------ | ---- |
| 01.01 | —          | eIAM-Login                  | Alle (R-01)        | Authentifizierung über eIAM gemäss BIT-Standard | Erfolgreicher SSO-Login                    | M    |
| 01.02 | —          | Rollenbasierte Berechtigung | System (R-08)      | Rollenspezifische Funktionen nach Login         | UI zeigt nur erlaubte Aktionen             | M    |
| 01.03 | 0502, 0503 | Account-Verwaltung          | Tech. Admin (R-02) | Anlegen / Deaktivieren                          | Accounts können erstellt / gelöscht werden | M    |
| 01.04 | 0501       | Rollen-Verwaltung           | Tech. Admin (R-02) | Rollen erstellen, umbenennen, löschen           | Rollen zuweisbar / entziehbar              | M    |
| 01.05 | —          | Session-Handling            | System (R-08)      | Auto-Logout nach Inaktivität gemäss BIT         | Logout nach definierter Zeit               | M    |

### 5.2 Auswahllisten / Stammdaten verwalten

| ID    | Ref. | Anforderung                         | Rolle               | Beschreibung                                                                                                                                                                   | Akzeptanzkriterium                       | Prio |
| ----- | ---- | ----------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- | ---- |
| 02.01 | 0601 | Inhalte der Auswahllisten verwalten | Fachl. Admin (R-03) | CRUD für Stammdaten (Wegoberflächen, -formen und -begleiter, Kunstbauten, Bedeutungsstufen national/regional/lokal, Substanzgrad, Typ des GIS-Objekts, Status der Bearbeitung) | Werte hinzufügen / ändern / deaktivieren | S    |
| 02.02 | —    | Mehrsprachigkeit der Listeninhalte  | Fachl. Admin (R-03) | Stammdaten in DE/FR/IT pflegbar                                                                                                                                                | Übersetzungen pro Eintrag                | S    |

### 5.3 Vorbereitungen Arbeitspakete (Push-Methode)

| ID    | Ref. | Anforderung                         | Rolle                                         | Beschreibung                                                                   | Akzeptanzkriterium                                                                                                                                                        | Prio |
| ----- | ---- | ----------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 03.01 | —    | Arbeitspakete bilden                | Fachl. Admin (R-03)                           | Zusammenstellung von Bundes-Objekten zu Paketen (z. B. nach Kanton / Region)   | Paket erstellbar, benennbar                                                                                                                                               | M    |
| 03.02 | —    | Push-Zuweisung von Arbeitspaketen   | Fachl. Admin (R-03)                           | Aktive Zuweisung eines Pakets an Regionale Koordination                        | Regionale Koordination sieht Arbeitspakete und dazugehörige Objekte                                                                                                       | M    |
| 03.03 | —    | Push-Zuweisung an Inventarisierende | Reg. Koordination (R-04)                      | Aktive Zuweisung eines Objekts an Inventarisierende                            | Inventarisierende sehen Objekte im Dashboard                                                                                                                              | M    |
| 03.04 | —    | Einsatzlisten generieren            | Fachl. Admin (R-03), Reg. Koordination (R-04) | Export von Arbeitspaketen als Excel-File mit Bundes-Objekten und Bearbeitenden | Excel-File herunterladbar, enthält Strecke mit allen Linienführungen und Abschnitten inkl. Objektname, Objektnummer, Kilometer pro Objekt, Region, Kanton und Bearbeitern | S    |

### 5.4 Bearbeitungsstand prüfen / Übersicht

| ID    | Ref.                   | Anforderung                                   | Rolle                                                              | Beschreibung                                                                                                                                    | Akzeptanzkriterium                                                                                | Prio |
| ----- | ---------------------- | --------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---- |
| 04.01 | —                      | Übersicht                                     | Alle (R-01)                                                        | Übersicht aller Objekte inkl. Status und Fortschritt                                                                                            | Alle Objekte werden gemäss Berechtigungen aufgelistet                                             | M    |
| 04.01 | —                      | Dashboard                                     | Alle (R-01)                                                        | Darstellung von vorgefilterten Objekten für eine spezifische Aufgabe                                                                            | Einstiegsseite für spezifische Aufgaben zeigt alle zu bearbeitenden Objekte                       | S    |
| 04.02 | 0102, 0201, 0701, 0702 | Suche & Filter                                | Alle (R-01)                                                        | Volltext- und Attributsuche; Filter nach allen Stammdaten inkl. Bedeutungsattribut, Status, Bearbeiter, Region, Substanzgrad, Alter, Objekt-Typ | Trefferliste mit Sprung zu Karte/Detail                                                           | M    |
| 04.03 | 0703                   | Sortierung                                    | Alle (R-01)                                                        | Nach allen Spalten der Übersichtstabelle sortierbar                                                                                             | Übersicht auf- und absteigend sortiert                                                            | K    |
| 04.04 | —                      | Gleichzeitige Bearbeitung von Attributen      | Fachl. Admin (R-03), Inventarisierende (R-05), Fachlektorat (R-06) | Mehrere Objekte selektieren, gemeinsames Attribut wählen, neuen Wert definieren; Änderung wird auf alle ausgewählten Objekte angewendet         | Ein Wert wird für mehrere gewählte Objekte gleichzeitig geändert                                  | S    |
| 04.05 | 0704                   | Export einer gefilterten und sortierten Liste | Alle (R-01)                                                        | Gefilterte und sortierte Tabelle als Excel-File                                                                                                 | Excel enthält alle im UI sichtbaren Spalten mit den gefilterten Zeilen, gleich sortiert wie im UI | M    |

### 5.5 Kartenfunktionen

| ID    | Ref.       | Anforderung                            | Rolle                    | Beschreibung                                                                                                                               | Akzeptanzkriterium                                                                            | Prio |
| ----- | ---------- | -------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | ---- |
| 05.01 | —          | Kartendarstellung (ESRI)               | Alle (R-01)              | Kartenviewer auf ESRI SDK mit swisstopo-Hintergrundkarten                                                                                  | Karte lädt mit korrekten Layern                                                               | M    |
| 05.02 | 0701       | Filter                                 | Alle (R-01)              | Filter analog Liste nach allen Stammdaten inkl. Status, Region, Bearbeiter, Bedeutung, Substanzgrad, Alter, Objekt-Typ                     | Nur dem Filter entsprechende Bundes-Objekte werden angezeigt                                  | M    |
| 05.03 | —          | Geographischer Filter                  | Alle (R-01)              | Filtern mithilfe einer Bounding-Box                                                                                                        | Nur Objekte innerhalb der gezeichneten Bounding-Box werden angezeigt                          | M    |
| 05.04 | 0103       | Zusätzliche Layer einblenden           | Alle (R-01)              | Inhalte aus der BGDI (IVS-Geländekarte, Dufourkarte etc.) und weitere Webservices (z. B. Inventarobjekte ASTRA) als Layer                  | Layer zu- oder wegschaltbar, Daten entsprechend ein-/ausgeblendet                             | M    |
| 05.05 | 0104       | Geometrien erstellen und editieren     | Inventarisierende (R-05) | Linien- und Punkt-Geometrien: zeichnen, verschieben, löschen, verlängern und verkürzen, **verschneiden, zusammenfügen**                    | Änderungen gespeichert                                                                        | M    |
| 05.06 | —          | Validierung                            | System (R-08)            | Erfasste und geänderte Geometrien werden automatisch gegen INTERLIS validiert                                                              | Validierungsmeldung bei Fehlschlag                                                            | M    |
| 05.07 | 0113       | Historisierung Änderungen an Geometrie | System (R-08)            | Jede Änderung an der Geometrie wird protokolliert                                                                                          | Historie textuell einsehbar mit Zeitstempel, Bearbeiter, Bearbeitung (neu, mutiert, gelöscht) | S    |
| 05.08 | 0113, 1001 | Geometrie-Versionen vergleichen        | Alle (R-01)              | Frühere und aktuelle Geometrieversionen vergleichbar                                                                                       | Differenz-Ansicht zeigt alte und neue Geometrieversion übereinander                           | S    |
| 05.09 | —          | Snapping / Tracing                     | Inventarisierende (R-05) | Beim Zeichnen und Bearbeiten optionales Snapping/Tracing auf TLM (Digitale Landschaftsmodelle) von swisstopo oder an bestehender Geometrie | Erfasste Geometrien sind konsistent                                                           | M    |
| 05.10 | —          | Legende                                | Alle (R-01)              | Legende mit allen Karten-Bestandteilen sichtbar, wenn eine Karte angezeigt wird                                                            | Legende zeigt alle verwendeten Symbole und Farben für Geometrien und Hintergrundkarten        | M    |
| 05.11 | —          | Räumliche Notizen                      | Alle (R-01)              | Notizen an beliebigem Ort auf der Karte erfassbar                                                                                          | Notiz wird als Symbol an der gewählten Position angezeigt                                     | S    |

### 5.6 360°-Bilder

| ID    | Ref. | Anforderung                 | Rolle       | Beschreibung                                                                                   | Akzeptanzkriterium                                                     | Prio |
| ----- | ---- | --------------------------- | ----------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---- |
| 06.01 | —    | 360°-Bilder Viewer          | Alle (R-01) | Von ASTRA bereitgestellte 360°-Bilder sind im Tool verfügbar und als Preview zu öffnen         | Für jedes 360°-Bild lässt sich eine Bildvorschau direkt im Tool öffnen | M    |
| 06.02 | 0101 | Lokalisierung 360°-Bilder   | Alle (R-01) | Position und Blickrichtung des aktuell ausgewählten Bildes werden auf einer Karte visualisiert | Karte zeigt Standort und Blickrichtung des aktiven 360°-Bildes         | M    |
| 06.03 | —    | Navigation auf 360°-Bildern | Alle (R-01) | Es kann zwischen den 360°-Bildern navigiert werden                                             | Vor- und Rückwärtsnavigation ist möglich                               | M    |

### 5.7 Objekte bearbeiten (Fokus Bundes-Objekte)

| ID    | Ref.                   | Anforderung                         | Rolle                    | Beschreibung                                                                                                                                                   | Akzeptanzkriterium                                                                                                                        | Prio |
| ----- | ---------------------- | ----------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 07.01 | 0109                   | Bilder hochladen/löschen            | Inventarisierende (R-05) | Mehrere Bilder pro Objekt; Auswahl von lokalem Speicherort oder aus zentraler Medienbibliothek                                                                 | Bilder zugeordnet und gespeichert; Bild und Metadaten löschbar                                                                            | M    |
| 07.02 | 0109                   | Metadaten zu Bildern                | Inventarisierende (R-05) | Dateiname, Bildlegende, Quelle, Urheber, Aufnahmedatum, Aufnahmestandort, Lizenz                                                                               | Pflichtfelder validiert                                                                                                                   | M    |
| 07.03 | —                      | Bildvorschau                        | Alle (R-01)              | Bilder als Vorschau einsehbar                                                                                                                                  | Hochgeladene Bilder können angeschaut werden                                                                                              | S    |
| 07.04 | 0101, 0105, 0111, 0303 | Attributformular                    | Inventarisierende (R-05) | Formularbasierte Sachdatenerfassung                                                                                                                            | Validierung gemäss Datenmodell; nicht bearbeitbare Attribute gesperrt; Hinweis auf betroffene verlinkte Objekte                           | M    |
| 07.05 | —                      | Objekt löschen                      | Inventarisierende (R-05) | Objekt bis zur Publikation löschbar                                                                                                                            | Objekt gelöscht; nach Publikation nicht mehr löschbar                                                                                     | M    |
| 07.06 | —                      | Einschätzung der Bedeutung          | Inventarisierende (R-05) | Empfehlung für Bedeutung wird vom System berechnet                                                                                                             | Bedeutung wird vorgeschlagen, lässt sich annehmen oder ändern                                                                             | K    |
| 07.07 | —                      | Zusammenfassung ausfüllen           | Inventarisierende (R-05) | Zusammenfassung pro Objekt erfassen/ändern                                                                                                                     | Zusammenfassung wird gespeichert                                                                                                          | M    |
| 07.08 | 0101                   | Zuweisung 360-Grad-Aufnahme         | Inventarisierende (R-05) | 360-Grad-Aufnahme aus bestehender Datenbank einem Objekt zuweisen                                                                                              | Aufnahme wird zum Objektbeschrieb angezeigt                                                                                               | K    |
| 07.09 | 0108                   | Verlinkung von Objekten             | Inventarisierende (R-05) | Bezug zur über-/untergeordneten Strecke, Linienführung, Abschnitt oder Wegbegleiter herstellen oder ändern                                                     | Parent/Child des Objekts aufrufbar                                                                                                        | M    |
| 07.10 | —                      | Darstellung verlinkte Objekte       | Alle (R-01)              | Zusammengehörigkeit zwischen verlinkten Objekten klar und nachvollziehbar dargestellt                                                                          | Beziehung ist visuell erkennbar                                                                                                           | M    |
| 07.11 | —                      | Selektion verlinkter Objekte        | Inventarisierende (R-05) | Zwischen verlinkten Objekten unterschiedlichen Typs (Strecke, Linienführung, Abschnitt) einfach wechseln                                                       | Verlinkte Objekte anderen Typs können geöffnet und bearbeitet werden                                                                      | M    |
| 07.12 | 0113                   | Historisierung                      | System (R-08)            | Jede Änderung wird protokolliert                                                                                                                               | Historie einsehbar mit Zeitstempel, Bearbeiter, Bearbeitung (neu, mutiert, gelöscht)                                                      | M    |
| 07.13 | 0901                   | Versionen anzeigen                  | Alle (R-01)              | Jede abgenommene Version eines Objekts ist einsehbar                                                                                                           | Alte Versionen anzeigbar                                                                                                                  | M    |
| 07.14 | 0704                   | Export                              | Fachl. Admin (R-03)      | Objektbeschreibungen als PDF; Geodaten vollständig als INTERLIS (gemäss neuem MGDM) oder FileGeodatabase inkl. aller Attribute, verlinkter Dokumente und Fotos | PDF mit allen Attributen und Bildern; Geodaten vollständig exportierbar                                                                   | M    |
| 07.15 | —                      | Begründung erfassen                 | Inventarisierende (R-05) | Textuelle Begründung der Einstufung                                                                                                                            | Pflichtfeld bei Klassifikation                                                                                                            | M    |
| 07.16 | 0106, 0107             | Nicht-existent setzen oder aufheben | Inventarisierende (R-05) | Objekt auf nicht-existent oder wieder existent setzen, mit Begründung                                                                                          | Warnhinweis mit Konsequenzen beim Setzen; nicht-existente und verlinkte Objekte gekennzeichnet; verlinkte Objekte müssen überprüft werden | M    |
| 07.17 | —                      | Text-Formatierung                   | Inventarisierende (R-05) | Texte formatieren zur Kommunikation oder um eigene Todos zu markieren (einfärben, durchstreichen, fett etc.)                                                   | Formatierungsoptionen stehen für Textinhalte zur Verfügung                                                                                | S    |
| 07.18 | —                      | Bibliografie erstellen              | Inventarisierende (R-05) | Zusammenstellung aller Quellen aus dem Objektbeschrieb, Abfrage über eine oder mehrere Literaturdatenbanken                                                    | Bibliografie mit allen im Text zitierten Titeln wird angezeigt                                                                            | S    |

### 5.8 Status und Versionierung

| ID    | Ref.                   | Anforderung            | Rolle                                                                      | Beschreibung                                                   | Akzeptanzkriterium                                                              | Prio |
| ----- | ---------------------- | ---------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---- |
| 08.01 | 0203, 0301, 0401, 0402 | Status setzen          | Fachl. Admin (R-03), Fachlektorat (R-06), Inventarisierende (R-05)         | z. B. «in Bearbeitung» → «bereit für Prüfung»                  | Status sichtbar in Übersicht                                                    | M    |
| 08.02 | —                      | Objektstatus mitführen | System (R-08)                                                              | Voller Workflow (Review/Freigabe) abgebildet                   | Jedes Objekt verfügt über einen Status gemäss Workflow                          | M    |
| 08.03 | —                      | Zuweisung an Rolle     | Fachl. Admin (R-03), Fachlektorat (R-06), Inventarisierende (R-05), System | Übergabe durch Inventarisierende an Fachlektorat und umgekehrt | Fachlektorat kann Objekt lesen und bearbeiten                                   | M    |
| 08.04 | 0113                   | Historie anschauen     | Alle (R-01)                                                                | Log mit allen Änderungen                                       | Log mit Mutationstyp (neu/geändert/gelöscht), Zeitstempel, Bearbeiter, Änderung | M    |
| 08.05 | 0113, 1001             | Versionen vergleichen  | Alle (R-01)                                                                | Vergleich Geometrie und Sachdaten                              | Älterer Stand aufrufbar; Unterschiede zwischen zwei Versionen hervorgehoben     | S    |

### 5.9 Prüfen und Kommentieren

| ID    | Ref.       | Anforderung                     | Rolle                                                                   | Beschreibung                                                | Akzeptanzkriterium                                                 | Prio |
| ----- | ---------- | ------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------ | ---- |
| 09.01 | 0201       | Objekt prüfen                   | Fachlektorat (R-06)                                                     | Status des Objekts auf «prüfen» ändern                      | Status «in Prüfung» gesetzt                                        | M    |
| 09.02 | 0203       | Objekt als geprüft kennzeichnen | Fachlektorat (R-06)                                                     | Status des Objekts auf «geprüft» ändern                     | Status «geprüft» gesetzt inkl. Zeitstempel                         | M    |
| 09.03 | 0202, 0302 | Kommentare erfassen             | Fachlektorat (R-06), Inventarisierende (R-05), Fachl. Prüfstelle (R-07) | Kommentare zu Attributen/Geometrien/Bildern                 | Kommentar referenziert Attribut                                    | M    |
| 09.04 | 0202       | Inline-Kommentare mit Textbezug | Fachlektorat (R-06)                                                     | Kommentare in einem Text an spezifischen Stellen hinzufügen | In einem Textfeld mehrere Kommentare auf verschiedenen Textstellen | K    |
| 09.05 | —          | Kommentare bearbeiten           | Fachlektorat (R-06), Inventarisierende (R-05), Fachl. Prüfstelle (R-07) | Eigene Kommentare anpassen                                  | Kommentar gespeichert                                              | S    |

### 5.10 Rückmeldungen einarbeiten

| ID    | Ref. | Anforderung                      | Rolle                                                                   | Beschreibung                      | Akzeptanzkriterium           | Prio |
| ----- | ---- | -------------------------------- | ----------------------------------------------------------------------- | --------------------------------- | ---------------------------- | ---- |
| 10.01 | —    | Kommentare einsehen              | Fachlektorat (R-06), Inventarisierende (R-05), Fachl. Prüfstelle (R-07) | Liste offener Kommentare          | Filterbar nach Status        | M    |
| 10.02 | —    | Kommentar als erledigt markieren | Inventarisierende (R-05)                                                | Als «erledigt» markieren          | Status des Kommentars ändert | S    |
| 10.03 | —    | Rückgabe an Fachlektorat         | Inventarisierende (R-05)                                                | Erneute Zuweisung an Fachlektorat | Iteration möglich            | M    |

### 5.11 Übersetzungen, Freigabe

| ID    | Ref. | Anforderung          | Rolle               | Beschreibung                                   | Akzeptanzkriterium                                                    | Prio |
| ----- | ---- | -------------------- | ------------------- | ---------------------------------------------- | --------------------------------------------------------------------- | ---- |
| 11.01 | 0401 | Freigabe             | Fachl. Admin (R-03) | Formelle Freigabe mit dokumentiertem Entscheid | Audit-Eintrag mit Nutzer und Zeitstempel, Objekt gesperrt             | M    |
| 11.02 | —    | Neue Version anlegen | Fachl. Admin (R-03) | Neue Version für das gesamte Inventar erfassen | Neue Version auswählbar; Daten wieder bearbeitbar in neuester Version | S    |

### 5.12 Reports

| ID    | Ref. | Anforderung                        | Rolle                                         | Beschreibung                                                                                                              | Akzeptanzkriterium                                                                                       | Prio |
| ----- | ---- | ---------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---- |
| 12.01 | 0704 | Objekt-Report generieren           | Alle (R-01)                                   | Jeder authentifizierte Benutzer kann Reports erstellen                                                                    | Funktion für alle Rollen verfügbar; muss an Externe ohne Zugriff oder Personen ohne PC zustellbar sein   | M    |
| 12.03 | —    | Hinterlegung als Gesetzesgrundlage | Fachl. Admin (R-03), System                   | Verbindlicher Report und Karteneinträge werden unveränderlich (read-only) archiviert und als Gesetzesgrundlage hinterlegt | Report und Karte nach Hinterlegung unveränderbar; abrufbar inkl. Zeitstempel und verantwortlicher Person | M    |
| 12.04 | —    | Standard-Reports                   | Fachl. Admin (R-03), Reg. Koordination (R-04) | Vordefinierte Berichte (Bearbeitungsstand, Statistiken, Inventarliste)                                                    | Export PDF / Excel                                                                                       | S    |

---

## 6. Nicht-funktionale Anforderungen

| ID  | Anforderung                 | Beschreibung                                                                                                                           | Akzeptanzkriterium                                              | Prio |
| --- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---- |
| N01 | Sicherheit                  | eIAM-Integration, BIT-Sicherheitsstandards                                                                                             | BIT-Audit bestanden                                             | M    |
| N02 | Sicherheit                  | Rollenbasierte Zugriffsrechte (RBAC)                                                                                                   | Zugriffsmatrix dokumentiert und getestet                        | M    |
| N03 | Verfügbarkeit               | SLA gemäss BIT-Vorgaben                                                                                                                | Verträge unterzeichnet und akzeptiert                           | M    |
| N04 | Performance                 | Kartenansicht < 3 s Initial-Load                                                                                                       | Lasttest dokumentiert                                           | S    |
| N05 | Mehrsprachigkeit            | UI in DE/FR/IT                                                                                                                         | i18n-Verwaltung                                                 | M    |
| N06 | Browser-Support             | Chrome, Edge, Firefox, Safari (aktuell)                                                                                                | Cross-Browser-Test                                              | M    |
| N07 | Barrierefreiheit            | WCAG 2.1 AA (Bundes-Vorgabe P028)                                                                                                      | Audit bestanden                                                 | M    |
| N08 | Datenschutz                 | DSG/DSGVO                                                                                                                              | DSFA durchgeführt                                               | M    |
| N09 | Audit / Nachvollziehbarkeit | Vollständige Änderungshistorie pro Objekt                                                                                              | Audit-Log abrufbar                                              | M    |
| N10 | Skalierbarkeit              | Gleichzeitige Bearbeitende                                                                                                             | Lasttest mit Zielwert                                           | S    |
| N11 | Hosting                     | Betrieb beim Bund (BIT)                                                                                                                | Infrastruktur BIT-konform                                       | M    |
| N12 | Geräteunterstützung         | Webapplikation muss auf Tablets mit einer Bildschirmbreite von mindestens 768 Pixeln mit Touch bedienbar sein, inkl. Kartenoperationen | Manuelle Tests auf einem gängigen Android-Tablet und einem iPad | M    |
| N13 | Hilfekonzept                | Webapplikation zeigt Hilfestellungen zum Prozess                                                                                       | Kontextuelle Hilfe aufrufbar                                    | M    |
| N14 | Exklusive Bearbeitung       | Bearbeitung eines Objekts nur für einen Benutzer zeitgleich möglich                                                                    | Nur die zugewiesene Person kann Objekte bearbeiten              | M    |

---

## 7. Workflow-Stati (abgestimmt)

Spezifikation und User Story Map nennen Stati nur beispielhaft. Für das
Prototyping gilt diese konsolidierte Liste als verbindlich:

```
offen
  → zugewiesen
      → in_bearbeitung
          → bereit_zur_pruefung
              → in_pruefung
                  → korrektur ──┐ (zurück zu in_bearbeitung)
                  → geprueft    │
                      → freigegeben
                          → publiziert
```

Deutsche Bezeichnungen: Offen · Zugewiesen · In Bearbeitung · Bereit zur
Prüfung · In Prüfung · Korrektur · Geprüft · Freigegeben · Publiziert

**«Offen»** steht seit Entscheid 79 vor der Kette: Objekte, die noch
niemandem zugewiesen sind — sie tragen keine zuständige Person (Anzeige
«—»). Setzen dürfen ihn R-03 und R-04 (entzieht die Zuweisung); die
Zuweisung einer Person führt automatisch zu «Zugewiesen».

**Der Status wird auf Strecken-Ebene geführt** — alle untergeordneten
Objekte (Linienführungen, Abschnitte, Wegbegleiter) richten sich nach dem
Status ihrer Strecke (Entscheid 78).

Zusätzlich das orthogonale Kennzeichen **nicht-existent** (mit Pflicht-Begründung,
siehe 07.16).

Zuständigkeiten pro Übergang (aus den Rollen abgeleitet):

- **R-03 Fachliche Administration und R-04 Regionale Koordination** stellen
  Objekte mit `offen` in den unzugewiesenen Pool zurück (Entscheid 79)
- **R-05 Inventarisierende** bearbeiten in `zugewiesen`, `in_bearbeitung`,
  `korrektur` und übergeben an die Prüfung
- **R-06 Fachlektorat** bearbeitet in `bereit_zur_pruefung`, `in_pruefung`,
  setzt `geprueft` oder weist nach `korrektur` zurück
- **R-07 Fachliche Prüfstelle** kommentiert, prüft übergreifend und darf
  `publiziert` setzen (Entscheid 69)
- **R-03 Fachliche Administration** gibt frei (`freigegeben`) und setzt die
  Publikationsversion
- **R-04 Regionale Koordination** weist Objekte innerhalb ihres Gebiets zu

---

## 8. Verfügbare Testdaten

Projekt: **`/Users/wis/claude/ivs-map`** — statische Webkarte (ArcGIS Maps SDK
for JavaScript, swisstopo-WMTS-Hintergrund in Graustufen), Auswertungsergebnisse
aus `Results_ASTRA.gdb`, Testgebiet **Bern**. Die GeoJSON-Dateien liegen in
`data/` und sind nach WGS 84 reprojiziert.

| Datei                                                   | Inhalt                                                                                                                                                                       |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `routen_bern_korrigiert.geojson`                        | Routen-Linien (Basis)                                                                                                                                                        |
| `routen_bern_teilsegmente.geojson`                      | 2753 Teilsegmente; Attribute `seg_id`, `route_nr`, `seg_nr`, `seg_anzahl`, `seg_von_m`, `seg_bis_m`, `seg_laenge_m`, `ivs_ivsfk`, `ivs_signatur`                             |
| `routen_bern_segmentgrenzen.geojson`                    | Marken an den Segmentgrenzen                                                                                                                                                 |
| `prototyp2_ivs_punktobjekte_bern_with_text_new.geojson` | 176 Punktobjekte; Attribute `ivs_deutsc` (z. B. «Profanes Gebäude»), `ivs_franzo`, `easyocr` (erkannter Name, z. B. «Gasthaus Traube»), `weight`, `route_nr`, `route_dist_m` |
| `wegformen_segmented_lines.geojson`                     | Wegformen (Lockermaterial)                                                                                                                                                   |
| `wegoberflaechen_bern_segmentiert.geojson`              | Wegoberflächen                                                                                                                                                               |
| `detection_bruecken_raw.geojson`                        | Per Deep Learning erkannte Brücken                                                                                                                                           |

Mengengerüst: **1116 Routen**, längste rund 3.3 km. Die zehn längsten
`route_nr`: 964 (3.26 km), 916 (3.20), 968 (3.06), 917 (2.99), 966 (2.92),
761 (2.78), 762 (2.68), 983 (2.48), 969 (2.40), 1000 (2.32).

Diese Daten dürfen als Grundlage für Mock-Objekte verwendet werden: Strecken aus
`route_nr`, Abschnitte aus den Teilsegmenten, Wegbegleiter-Namen aus dem
`easyocr`-Feld der Punktobjekte; fachliche Texte fiktiv, aber im Stil der echten
Beschriebe (Abschnitt 3.2).

---

## 9. Vorgaben für das Prototyping

Bereits getroffene Entscheide. Sie gelten, bis sie ausdrücklich geändert werden.

### 9.1 Zweck und Zuschnitt

1. **Zweck:** UX-Validierung mit Stakeholdern; zugleich bereits feine Vorarbeit
   für die eigentliche Umsetzung.
2. **Fokus:** Kern-Workflow in voller Tiefe — Übersicht/Dashboard (04) →
   Objektbearbeitung (07) → Prüfen und Kommentieren (09/10). Nebenblöcke
   (Accounts, Stammdaten, Arbeitspakete, 360°, Reports) als einfachere, aber
   vorhandene Screens.
3. **Umfang:** Es wird **ein** Prototyp gebaut, keine Variantenreihe.

### 9.2 Rollen und Berechtigungen

4. **Rollen-Umschalter** ist gewünscht (Wechsel der Perspektive im Prototyp).
   Er liegt seit Entscheid 61 im **Account-Menü** unten links; der Button
   zeigt die aktive Rollen-Nummer, und die Rolle gilt **pro Tab**
   (Entscheid 67).
5. Wählbar sind die **fünf fachlich relevanten Rollen** R-03 bis R-07. R-01,
   R-02 und R-08 werden aufgelistet, aber nicht gewählt — seit der
   nie-disabled-Regel (Entscheid 52) sind sie nicht mehr ausgegraut,
   sondern erklären beim Klick im Modal, warum sie gesperrt sind.

### 9.3 Karte und Geometrie

6. **ESRI SDK real einbinden** — Vorgehen wie im Projekt `ivs-map`
   (ArcGIS Maps SDK mit swisstopo-WMTS-Hintergrund; für die Karte selbst wird
   kein Lizenzschlüssel benötigt). Ein Lizenzschlüssel existiert, steht für den
   Prototyp aber noch nicht zur Verfügung.
7. **Geometrie-Editing ist eine der zu validierenden Kern-Interaktionen** —
   inklusive Snapping/Tracing sowie **Verschneiden und Zusammenfügen**.
8. **Objekthierarchie** (Strecke → Linienführung → Abschnitt, plus Wegbegleiter)
   als voll navigierbarer Baum.

### 9.4 Weitere Funktionen

9. **360°:** echt drehbares Panorama, inklusive Vor-/Zurück-Navigation und
   Karten-Marker für Position und Blickrichtung. Platzhalter-Bilder genügen.
10. **Versionsvergleich:** Text-Diff mit Änderungsmarkierungen im Objektbeschrieb
    plus Geometrie-Overlay alt/neu auf der Karte. **Gebaut** — Ausgestaltung
    siehe Entscheid 66 (Wort-Diff, Overlay in normaler Darstellung mit je
    eigenem Deckkraft-Regler).
11. **Prüfregister:** ~~frei zu entwerfen~~ — **gebaut** als Prüfprotokoll
    des Fachlektorats (Entscheide 75/76, Fragenkatalog aus der
    Review-Vorlage). Für die in der Story Map erwähnte
    SBB-Referenz existiert keine Vorlage. Die überarbeitete Story Map gibt
    inhaltlich jedoch vor, was es leisten muss (Abschnitt 4.6): Befunde des
    Fachlektorats, Umsetzungsvermerk der Inventarisierenden, begründete
    Abweichungen, Kommentare der Fachlichen Prüfstelle pro Objekt — alles im
    Objektbeschrieb verankert, nicht als separates Dokument. Der Fragenteil ist
    mit Checkliste 1 (Abschnitt 4.7) vorgegeben.
12. **Exporte** (Excel-Listen, Einsatzlisten, PDF-Report, INTERLIS): funktionslose
    Buttons genügen.

### 9.5 Bewusste Vereinfachungen

13. **eIAM-Login:** komplett auslassen, direkt eingeloggt starten.
14. **Mehrsprachigkeit:** ein Sprachen-Wechsler wird platziert, ist aber **nicht
    funktional**.
15. **Barrierefreiheit:** Prototypen müssen nicht ernsthaft barrierefrei sein
    (WCAG-Konformität ist erst für die Umsetzung relevant).
16. **Tablet-Tauglichkeit** (N12, ab 768 px, Touch inkl. Karte) von Beginn an
    mitdenken.
17. **Gestaltung:** keine Bundes-CD-Vorgaben. Als Theme gilt das shadcn-Preset
    **`bInUyNX`** — Style `vega`, Farbthema `indigo` auf neutraler Basis, Radius
    `small` (0.45 rem), Schrift **Noto Sans**, Icons **Lucide**. Es ersetzt das
    zuvor vorgesehene neutrale Standard-Theme. Die Tokens sind zwischen shadcn
    und spartan/ui namensgleich und liegen in `src/styles.css`; der Style ist in
    `components.json` gesetzt und bestimmt den generierten Komponenten-Quellcode
    unter `libs/ui`.

### 9.6 Tablet-Tauglichkeit — gemessener Ausgangszustand

Gemessen an der Kitchen-Sink-Seite bei 768 × 1024 px (29.07.2026), also der
Mindestbreite aus N12. **Das Layout hält**, kein Umbruch, kein nennenswerter
horizontaler Überlauf (5 px durch das Seitengrössen-Select der Pagination).

Die **Trefferflächen** sind dagegen durchgehend zu klein. Von 143 sichtbaren
Bedienelementen liegen **139 unter 44 px** Höhe — der üblichen Mindestgrösse für
Touch (Apple 44 pt, Google 48 dp, WCAG 2.5.8 mindestens 24 px):

| Element                       | Grösse                       | Bemerkung |
| ----------------------------- | ---------------------------- | --------- |
| Checkbox, Radio, Slider-Griff | 16 × 16 px                   | kritisch  |
| Switch                        | 32 × 18 px, klein 24 × 14 px | kritisch  |
| Button `xs`                   | 24 px hoch                   | kritisch  |
| Button `sm`, Icon-Button      | 28–32 px hoch                | knapp     |
| Button Standard               | 36 px hoch                   | knapp     |
| Eingabefelder                 | 36 px hoch                   | knapp     |

Teilweise entschärft: Checkbox, Radio und Switch stehen in `<label>`-Elementen,
die sich über die volle Zeilenbreite erstrecken (rund 678 px) und den Schalter
mit auslösen. Die Trefferfläche ist damit **breit, aber nur 14–18 px hoch**.

**Drei Komponenten sind auf Touch grundsätzlich nicht bedienbar** — verifiziert
durch Auslösen der Ereignisse im laufenden DOM:

- **Hover Card** öffnet ausschliesslich auf `mouseenter`, nicht auf Klick.
- **Tooltip** ebenso.
- **Context Menu** hört nur auf das `contextmenu`-Ereignis. Long-press verhält
  sich zwischen iOS und Android uneinheitlich.

Für die als «Muss im Feld möglich sein» markierten Aufgaben (Abschnitt 4.2)
dürfen diese drei daher keine Information oder Aktion exklusiv tragen.

**Umgesetzte Massnahme.** In `src/styles.css` vergrössert ein Block unter
`@media (pointer: coarse)` alle Bedienelemente auf mindestens 44 px. Die
Erkennung läuft über die Eingabepräzision, nicht über User-Agent oder
Bildschirmbreite:

- Ein Tablet oder Telefon meldet `coarse` und bekommt grosse Ziele.
- Ein schmales Desktop-Fenster meldet `fine` und bleibt kompakt.
- Ein Tablet mit angeschlossener Maus meldet `fine` — bewusst so.

Es gibt **keinen Umschalter**; die Anpassung geschieht automatisch. Die Regeln
hängen an den `data-slot`-Attributen, die spartan/ui auf jedem Primitive setzt,
damit `libs/ui` unangetastet bleibt und neu generierte Primitives automatisch
abgedeckt sind. Checkbox, Radio, Switch und Slider-Griff behalten ihre
Darstellung und bekommen eine unsichtbare Trefferfläche über ein Pseudo-Element,
weil `hlm-checkbox` und `hlm-switch` auf `display: contents` stehen und selbst
keine Box erzeugen.

Nachgemessen mit aktivierter Regel: von 137 Bedienelementen liegen noch **drei**
unter 44 px — die visuell versteckten `input[type=radio]`, die hinter den
sichtbaren Radiobuttons liegen und nicht selbst angetippt werden.

### 9.7 Referenz-Prototyp

Ein älterer Prototyp existiert unter
**<https://ivs-prototyp-variant-b.vercel.app/>** (Listen-zentrierte Werkbank:
dunkle Seitenleiste mit Aufgaben/Objekte/360°/Reports, Aufgaben als
Status-Gruppen, Objekt-Tabelle, Detail als Seitenpanel).

Er darf **allenfalls als Inspiration** dienen, und auch dann ist er gemäss der
neuen Detailspezifikation zu überarbeiten — er kennt nur drei Rollen
(Bearbeiter/Administrator/Betrachter) und die Stati Backlog/In Arbeit/Done statt
des heutigen Workflows; Arbeitspakete, Prüfregister und der Freigabeprozess
fehlen.

### 9.8 Abgestimmte Detailentscheide (30.07.2026)

Beim Bau des Prototyps geklärt. Sie präzisieren die Vorgaben aus 9.1–9.5 und
gelten ebenfalls, bis sie ausdrücklich geändert werden.

**Daten und Modell**

18. **Stati:** Die acht Stati aus Abschnitt 7 werden geführt (seit
    Entscheid 79 sind es neun — «Offen» kam dazu). ~~Fürs
    Dashboard werden sie auf drei Gruppen gemappt (Backlog / In Arbeit /
    Done).~~ **Aufgehoben durch Entscheid 68** — das Dashboard gruppiert
    nach den echten Stati.
19. **Kennung:** Führend ist allein die **IVS-Signatur** (`BE 21.1.2`,
    Wegbegleiter `BE 21 W1`). Keine zweite technische Objekt-ID in der
    Oberfläche; für URLs wird aus der Signatur eine Id abgeleitet
    (`be-21-1-2`).
20. **Spalte «Bewertung»:** Substanz-Bewertung — der Durchschnitt der drei
    NHG-Punktwerte (Geschichte, Morphologie, Substanzwert, je 0–4), angezeigt
    als `Ø 3.3/4`.
21. **Testdaten:** Alle Mock-Objekte liegen im **Testgebiet Bern** mit echter
    Geometrie aus `ivs-map`; Namen und Beschriebe sind fiktiv, aber
    geografisch stimmig. Die Strecken mit **Wegoberflächen-Daten** sind
    bewusst enthalten (Routen 37, 38, 43, 265, 267, 312, 470, 471, 477, 537,
    538 → BE 21/22/23).
22. **Persistenz:** Änderungen überleben im **localStorage**; die Stores
    tragen eine Seed-Version, deren Erhöhung gespeicherte Stände verwirft.

**Aufbau und Rollen**

23. **Dashboard vs. Objekte:** Das Dashboard zeigt je Rolle vorgefilterte
    Aufgaben (Anforderung «Dashboard», Prio S), «Objekte» die vollständige
    Übersicht (04.01, Prio M).
24. **Rollenabhängigkeit ist echt:** Jede Rolle hat eigene Edit-Rechte
    (`editStati`) und eigene **setzbare** Stati. Löschen ist R-05 (in
    ihren Bearbeitungsstati) und R-03 vorbehalten. ~~Jede Rolle hat
    eigene Dashboard-Stati; die Statusübergänge sind je Rolle
    definiert.~~ **Überholt durch die Entscheide 69/70** — das Dashboard
    zeigt allen Rollen alle Stati (seit Entscheid 79 neun), und statt einer Übergangstabelle
    gibt es die frei wählbaren `setzbareStati`.
25. **Hierarchie-Dropdown:** Klick auf ein Objekt wechselt die Detailansicht,
    behält den Modus (View/Edit) bei und **wechselt die Kartenselektion mit**.
    Alle Ebenen inklusive Wegbegleiter sind voll bearbeitbar.
26. **Karte in neuem Tab:** mit **bidirektionaler Zustands-Synchronisation**
    (BroadcastChannel) — Objektwechsel im Hauptfenster selektiert dort,
    Objekt-Klick dort navigiert das Hauptfenster.
27. **View/Edit:** Objekte öffnen im View-Modus, der Stift wechselt in den
    Edit-Modus (nur wenn Rolle × Status es erlauben).
28. **Statuswechsel-Button** in der Kopfzeile ist generisch: Beschriftung und
    Verfügbarkeit ergeben sich aus Rolle und aktuellem Status. Löschen und
    Download bleiben funktionslose Attrappen.
29. **Kein Zahnrad** neben dem Rollen-Umschalter.
30. **Kartenlayer** samt Symbolisierung werden aus `ivs-map` übernommen.

**Zweite Ausbaustufe (Vorgaben aus derselben Session)**

31. **Objekte-Tab neu gedacht:** Die **Karte steht im Vordergrund**, die
    Objektliste ist dezent und schmal; ein Klick öffnet rechts ein
    **Side-Panel** mit dem Objektinhalt.
32. **Textbearbeitung:** ausgefeilte Editor-Techniken im Objektbeschrieb —
    markieren, einfärben, durchstreichen, fett, kursiv (07.17).
33. **Geometrie-Editing** auf der Karte: Linien- und Punktgeometrien
    zeichnen, verschieben, löschen, verlängern/verkürzen, verschneiden,
    zusammenfügen — inklusive Snapping und Tracing (05.05/05.09).
34. **Hintergrundkarte wechselbar**, mehrere Layer gleichzeitig aktivierbar
    (IVS-Geländekarte, Dufourkarte …) mit **Transparenzregler**; auch die
    Objekte selbst sind in der Deckkraft regelbar (05.04).
35. **Child-Objekte umteilen:** einem anderen Parent-Objekt zuweisen (07.09).
36. **Quellen:** Zusammenstellung aller Quellen aus dem Objektbeschrieb mit
    Abfrage über eine oder mehrere Literaturdatenbanken (07.18).
37. **360°-Tab:** Ablage aller Bilder der Begehung **plus Begehungsplanung** —
    Reihenfolge der Objekte, Logistik (Verkehrsmittel, Unterkunft,
    Zeitbedarf). Eine Begehung ist auch aus der Objektdetailansicht planbar.
38. **Kommentieren** auf jedem Parent- oder Child-Objekt sowie **frei auf der
    Karte** an beliebigem Ort; die Zuweisung zu einem Objekt ist dort
    optional. Gestaltung gemäss Screenshot: Suche, Sortierung, Filter
    (offen/geschlossen, Datum, eigene, Attribut), Threads mit Antworten,
    Erledigt-Schalter, Titel, `@`-Erwähnungen aller Benutzer mit Rolle und
    `#`-Attribut-Referenzen, die im Formular zum Attribut scrollen.
39. **Stammdatenverwaltung** als eigener Tab, **nur für die Fachliche
    Administration (R-03)** sichtbar.

**Dritte Ausbaustufe (Vorgaben aus derselben Session)**

40. **Objekte auf den bestehenden Layern:** Die Mock-Objekte haben keine
    eigenen Karten-Layer. Die `ivs-map`-Layer (Routen, Teilsegmente,
    Punktobjekte) werden beim Laden mit den Objekt-Attributen `signatur`,
    `lf`, `strecke`, `ebene` angereichert und tragen Selektion, Klick,
    Hover und Polygon-Filter. Optik = unverändert `ivs-map`.
41. **Karten-Interaktion:** Hover zeigt einen MapTip mit der Hierarchie der
    tatsächlich getroffenen Objekte (nicht der Gesamt-Hierarchie); Klick
    öffnet das getroffene Objekt direkt; nur bei mehreren echt
    verschiedenen Objekten (unterschiedliche Blatt-Signaturen) wird das
    MapTip zum Kontextmenü, in dem man das zu öffnende Objekt wählt.
42. **Selektion** wird mit SDK-Highlight hervorgehoben, alles andere
    abgeblendet.
43. **Symbolik:** Punktobjekte einheitlich rot (wie in der Legende); die
    Legende zeigt die Routengrenze als dicke durchgezogene und die
    Segmentgrenze als dünne gestrichelte schwarze Linie.
44. **Vollabdeckung:** Jede Geometrie der Testdaten gehört zu einem
    Mock-Objekt und reagiert auf Hover/Klick — kein Objekt besteht aus
    räumlich getrennten Stücken (Aufteilung nach Zusammenhangskomponenten).
    Die fünf kuratierten Strecken bleiben führend; generierte Objekte
    stehen auf «publiziert».
45. **spartan-Konformität** (aus dem Skill-Review): `hlm-collapsible` statt
    handgebauter Klapp-Trigger, Toasts (sonner) für diskrete Aktionen,
    Status-Signalfarben als Theme-Tokens, `hlm-empty` für Leerzustände,
    Touch-Nachrüstung app-eigener Elemente über Tailwinds
    `pointer-coarse:`-Variante.
46. **Trefferradius statt Pixelgenauigkeit:** Hover und Klick auf der Karte
    treffen Objekte in einem Umkreis um den Zeiger — 8 px mit Maus, 14 px
    auf Touch-Geräten. Pixelgenaues Treffen einer 3-px-Linie ist unzumutbar
    (technische Begründung in 12.6, Stichwort `hitTest`).
47. **Deployment:** Der Prototyp läuft öffentlich auf Vercel
    (<https://ivs-prototyp-v3.vercel.app>), Details in 12.7.

**Vierte Ausbaustufe — Review-Paket «Changes IVS» (PDF vom 30.07.2026,
Rückfragen in derselben Session geklärt)**

48. **Objekt-Taxonomie:** Unter einer Linienführung leben «Abschnitt mit
    Substanz», «Abschnitt mit viel Substanz» und die **Kunstbaute als
    spezifischer Abschnitt** (Typen Brücke, Stützmauer, Trockenmauer,
    Durchlass; Feld `kunstbauteTyp`, Ebene bleibt `abschnitt`). Kunstbauten
    werden bei rund **jeder sechsten Linienführung** generiert (kurzes
    Teilstück der Route, 5–20 % der Länge) plus zwei kuratierte Beispiele
    (BE 21.2.3, BE 22.1.3). Abschnittslängen sind **nur selten identisch**
    mit der Linienführung: Ein-Routen-Linienführungen werden über die
    Teilsegmente in Abschnitte zerlegt (noch 131 von 862 LFs mit einem
    deckungsgleichen Einzelabschnitt). Gesamthaft ~3742 Objekte.
49. **Einheitliche Legende** überall (Karte, Kartenbild-Panel,
    Hierarchie-Menü, MapTip, Side-Panel; `OBJEKT_TYP_SYMBOL` in
    karten-layer.ts, UI-Komponente `ivs-typ-symbol`): Strecke und
    Linienführung **orange, beide gleich dick** (auf der Karte
    unterscheiden die Grenzmarken); Abschnitte **blau durchgezogen, durch
    die Dicke unterschieden** — dünn = mit Substanz, mittel = mit viel
    Substanz, dick = Kunstbaute; Wegbegleiter roter Punkt. «Wenig/ohne
    Substanz» läuft unter der dünnen Linie «Abschnitt mit Substanz» (die
    Taxonomie kennt zwei Stufen); das Formularfeld Substanzgrad bleibt
    unverändert.
50. **Kartenbild-Panel** (vorher «Objekte»): Hintergründe (vier Basemaps
    und zwei Raster-Overlays) sind **additiv** über Augen kombinierbar,
    die Deckkraft je Hintergrund liegt hinter einem Blend-Icon mit initial
    verstecktem Slider. Der Abschnitt «Layer» heisst **«Objekte»**, die
    Objekt-Deckkraft gibt es nur global (gleiches Icon-Muster, initial
    versteckt). Technisch: sechs WebTileLayer zuunterst statt exklusiver
    Basemap.
51. **Status-Dropdown** in der Kopfzeile des Objekt-Details: der jeweils
    **nächste und vorherige Status** der Workflow-Kette; nicht erlaubte
    Übergänge erscheinen ebenfalls und erklären beim Klick im Modal, wem
    der Schritt vorbehalten ist.
52. **Nie-disabled-Regel:** Der Prototyp zeigt keine ausgegrauten
    Bedienelemente; gesperrte Aktionen bleiben aktiv und begründen sich im
    zentralen Hinweis-Dialog (`HinweisStore`, Shell und Kartenfenster).
    Bewusste Abgrenzung: Pflichtfeld-Validierung von Submit-Buttons,
    Listen-Navigation (erste/letzte Position) und gemäss 07.04 gesperrte
    Attributfelder (Signatur, Kanton) bleiben klassisch.
53. **Karten-Tab-Werkzeuge:** Geometrie-Editing und Karten-Kommentar
    erscheinen nur auf dem Karten-Tab, das Geometrie-Werkzeug zusätzlich
    nur im Edit-Modus; der Umschalter für die Layer-Auswahl entfällt —
    das Kartenbild-Panel ist eigenständig einklappbar.
54. **Hierarchie-Menü** als gemeinsame Komponente (`ivs-hierarchie-menu`):
    Legenden-Symbol und Typ-Tag je Eintrag («Abschnitt mit viel Substanz»,
    «Kunstbaute (Brücke)», Objektart der Wegbegleiter); **Umteilen (07.09)
    je Child-Zeile** über ein «…»-Kontextmenü mit Rechteprüfung — der
    Sammel-Eintrag am Menüende ist entfallen.
55. **Objekte-Side-Panel** zeigt **alle** Objektinformationen ungekürzt
    (inkl. NHG-Einzelbewertungen, Empfehlungen, Datierungsvermerken,
    Bibliografie, Prüfkommentar, Lognotizen, Inexistenz) und neben dem
    Titel dasselbe Hierarchie-Menü wie die Detailseite.
56. **Kommentare:** Standard-Filter «Offene», der Filter «Eigene»
    entfällt. Objektübergreifende Listen (Dashboard) zeigen nur noch die
    **eigenen** Kommentare: selbst verfasste oder beantwortete, per `@`
    erwähnte sowie Kommentare auf Objekten, die der Person zugewiesen sind
    oder laut Lognotizen einmal zugewiesen waren. Im geöffneten Objekt
    bleiben alle sichtbar (Prüf-Workflow).
57. ~~**Dashboard:** Liste und Zeilen-Dropdown arbeiten mit den
    rollenrelevanten Stati (`relevanteStati` in rollen.ts).~~
    **Aufgehoben durch die Entscheide 69 und 70** — die Dropdowns bieten
    die setzbaren Stati, die Liste filtert persönlich.
58. **Kartenfenster `/karte` mit Panel-Kopf:** Tabs (Karte, 360° Bilder
    mit Begehungsplanung, Kommentare) und Werkzeuge inklusive Zeichnen;
    Arbeitsgeometrien und Kommentare synchronisieren über
    `storage`-Ereignisse live mit dem Hauptfenster, die Selektion weiter
    über den BroadcastChannel (die Rolle seit Entscheid 67 nicht mehr —
    sie gilt pro Tab).

**Fünfte Ausbaustufe — Review-Paket «Neue ToDos» (PDF vom 02.08.2026,
Rückfragen in derselben Session geklärt)**

59. **Status-Dropdown frei wählbar:** Das «Status ändern»-Dropdown in der
    Kopfzeile und ~~das Workflow-Select im Formular~~ (mit Entscheid 80
    entfernt) bieten die
    **rollenrelevanten Stati zur freien Wahl** (aktueller markiert) —
    dieselbe Semantik wie das Dashboard-Zeilen-Dropdown. Ersetzt die
    Weiter/Zurück-Logik samt Berechtigungs-Modal aus Entscheid 51.
60. **Dashboard nur Strecken:** ToDos werden auf Strecken-Ebene zugewiesen;
    die Aufgabenliste filtert auf die Ebene Strecke. Gruppen, Suche,
    Schnellfilter und Polygon-Selektion bleiben.
61. **Rollen-Umschalter im Account-Menü:** «Perspektive wechseln» liegt im
    Account-Menü unten links (Rollen zuoberst, dann Name und «Demodaten
    zurücksetzen»); der Klick aufs IVS-Logo führt zum Dashboard. Ersetzt
    das versteckte Rollenmenü hinter dem Logo (Vorgabe 4 bleibt erfüllt).
62. **Back-Button mit Herkunft:** Links vom Titel im Objekt-Detail; der
    `HerkunftStore` merkt sich beim Öffnen, ob das Objekt aus dem Dashboard
    oder der Objekte-Übersicht kam — der Button führt dorthin zurück,
    unabhängig von zwischenzeitlichen Hierarchie-Wechseln (Standard bei
    Deep Links: Dashboard).
63. **Zeilen-Kontextmenü nur per Klick:** Das «…»-Menü im Hierarchie-Menü
    öffnet ausschliesslich per Klick und mit sichtbarem Symbol — als
    eigenes fixed-Overlay statt als verschachtelter Menü-Trigger (der vom
    CDK als Hover-Submenü behandelt würde, siehe 12.6).
64. **Objekte-Tab als Strecken-Baum:** Erste Ebene nur Strecken,
    Nachkommen mit Legenden-Symbol und Einrückung beim Aufklappen; bei
    aktiver Suche sind Treffer-Äste offen, Filter reduzieren die
    Kinderlisten; der Ebene-Filter entfällt. Ein **Karten-Klick öffnet in
    jedem Fall zuerst die Preview im Side-Panel**, nie direkt die
    Detail-Ansicht.
65. **Begehungen als eigener Tab** (`/begehungen`, losgelöst von den
    360°-Aufnahmen): Planen, Umstellen und Löschen nur für **R-03, R-04,
    R-06 und R-07** — andere Rollen sehen alles, der Klick erklärt die
    Sperre. Im Objekt-Detail ist die Einplanung sichtbar: Badge mit Datum
    in der Kopfzeile, Details (Begehung, Position) im 360°-Bereich des
    Kartenpanels.
66. **Versionsvergleich (08.05, Vorgabe 10) gebaut:** Einstieg im
    Historie-Menü; wortweiser Diff (LCS) der Beschriebe — Gestrichenes rot
    durchgestrichen, Neues markiert — plus Eckdaten-Änderungen und die
    **Vergleichskarte**, auf welcher der IVS-1.0-Verlauf in normaler
    Darstellung (nicht gestrichelt) über der heutigen Geometrie liegt;
    die **Deckkraft beider Stände ist separat regelbar**. Der 1.0-Stand
    wird für alle Objekte deterministisch abgeleitet (gestrichene
    Hinweise, fehlender Nachführungssatz, ältere Formulierungen,
    abweichende Eckdaten, versetzter und vereinfachter Verlauf);
    Schlüsselobjekte der Seed-Strecken haben kuratierte Erstbeschriebe
    (`core/version-vergleich.ts`).

**Sechste Ausbaustufe — Arbeitssitzung vom 05.08.2026 (Entscheide 67–78).**
Zuerst Perspektiven und Dashboard (67–70), dann das Review-Paket
«Bug-Fixes / Small Changes» (71–74), zuletzt Prüfprotokoll, Arbeitspakete
und die Status-Vererbung (75–78).

_Perspektiven und Dashboard_

67. **Rolle pro Tab:** Die aktive Rolle liegt im sessionStorage
    (`ivs-prototyp-v3.rolle`) — jeder Tab kann eine eigene Perspektive
    haben (z. B. R-05 und R-06 nebeneinander für den Prüf-Workflow). Der
    localStorage hält nur noch die zuletzt gewählte Rolle als Standard
    für neue Tabs; die Rollen-Synchronisation über `storage`-Ereignisse
    (Teil von Entscheid 58) entfällt. Das separate Kartenfenster `/karte`
    erbt die Rolle seines Ursprungs-Tabs über den URL-Parameter `rolle`
    (mit `noopener` wird der sessionStorage nicht kopiert); Vorrang:
    URL-Parameter > Tab-eigener Stand > localStorage-Standard > R-05.
    Der Account-Button unten links zeigt die aktive Rollen-Nummer statt
    des Personen-Icons. Dark-Mode bleibt fensterübergreifend synchron.
68. **Dashboard-Gruppen sind die echten Stati:** Die Aufgabenliste
    gruppiert nach den **rollenrelevanten Workflow-Stati** (in
    Workflow-Reihenfolge, mit Status-Farbpunkt im Gruppenkopf); das
    Mapping auf Backlog / In Arbeit / Done (Entscheid 18) ist entfernt,
    der Gruppen-Filter wurde zum Status-Filter mit den Stati der Rolle.
69. **Setzbare Stati je Rolle** (`setzbareStati` in rollen.ts, von
    `relevanteStati` getrennt): Die Status-Dropdowns (Dashboard-Zeile,
    Objekt-Kopfzeile, ~~Formular~~ — das Formular-Select ist mit
    Entscheid 80 entfernt) bieten nur noch die von der Rolle
    setzbaren Stati an. **«Korrektur» leitet allein das Fachlektorat
    (R-06) ein** — R-04 und R-05 sehen den Status weiterhin, setzen ihn
    aber nicht. Die **Fachliche Prüfstelle (R-07) darf «Publiziert»
    setzen**. Die seit Entscheid 59 tote Übergangs-Tabelle
    (`UEBERGAENGE` in status.ts) ist entfernt.
70. **Dashboard ist persönlich, alle Stati:** Für jede Rolle erscheinen
    **alle Stati** als Gruppen (präzisiert Entscheid 68; seit
    Entscheid 79 sind es neun); je Status
    stehen nur Objekte, die der **aktiven Person** zugewiesen sind oder
    laut Lognotizen einmal zugewiesen waren (gleiche Semantik wie der
    Kommentar-Filter, Entscheid 56). `relevanteStati` ist damit entfernt
    (ersetzt den Dashboard-Teil von Entscheid 57). Generierte Objekte
    sind neutral **«System» (R-08)** zugewiesen und erscheinen in keinem
    persönlichen Dashboard; der Status-Filter bietet alle Stati.
    Seed-Ergänzung: Zuweisungs- und Prüf-Lognotizen auf den Strecken
    BE 7/22/23/35, damit jede Rolle (inkl. R-04 T. Nyffenegger und
    R-07 S. Koch) eigene Einträge sieht.

_Review-Paket «Bug-Fixes / Small Changes» (PDF vom 05.08.2026)_

71. **Dashboard-Feinschliff:** Status-Gruppen ohne Objekte starten
    **zugeklappt**.
72. **Objekt-Kopfzeile:** Der Status-Badge neben dem Titel ist entfernt —
    das Dropdown zeigt statt «Status ändern» immer den **aktuellen
    Status** (Farbpunkt + Label). ~~Daneben ein **Personen-Dropdown** mit
    der zugewiesenen Person: alle Rollen dürfen wechseln, der Wechsel
    setzt `zustaendigName`/`zustaendigRolle` und wird als Lognotiz
    protokolliert.~~ **Überholt durch Entscheid 81** — die Zuweisung
    geschieht im Dashboard, das Objekt-Detail zeigt sie nur noch
    read-only. Die Personenliste (`PERSONEN` in seed-data.ts) umfasst
    die Personas der wählbaren Rollen plus L. Furrer (R-05).
73. **Karten folgen den Listen:** Die Dashboard-Karte zeigt nur die
    Objekte der (persönlichen, gefilterten) Strecken-Liste; auf der
    Objekte-Seite wird die Karte gefiltert, **sobald** Suche oder Filter
    aktiv sind — sonst zeigt sie alles. Technisch: Karte-Input
    `streckenFilter` setzt `definitionExpression` auf den Objekt-Layern
    (`strecke IN (…)`) und auf den routengebundenen Layern
    (Wegoberflächen, Böschung, Grenzmarken — `route_nr IN (…)` über die
    Objekt-Zuordnung); die Brücken-Detektion hat keine Routen-Referenz
    und bleibt ungefiltert.
74. **Hierarchie-Menü-Fixes:** Das «…»-Umteilen-Kontextmenü liegt als
    **natives Popover im Top-Layer** über dem Menü (vorher dahinter,
    siehe Fallstrick in 12.6); beim Öffnen ist nur noch das **aktive
    Objekt** markiert — der CDK-Fokus wird per Direktive
    (`ivsFokusAktiv`) vom ersten Eintrag auf die aktive Zeile verschoben.
_Prüfprotokoll, Arbeitspakete und Status-Vererbung_

75. **Prüfprotokoll gebaut** (Abschnitt 4.6; Vorlage vom 05.08.2026):
    Knopf **«Prüfung»** neben dem Stift öffnet eine **Seitenleiste** mit
    vier Fragegruppen (Allgemein, Gelände-, Geschichtsbeschrieb,
    Schutzbegründung; 8 Fragen — zwei kommen bewusst in zwei Gruppen vor
    und werden **separat** beantwortet). Der Katalog **ersetzt im
    Prototyp die Checkliste 1** (4.7). Antworten als **Ja/Nein**
    (`hlm-toggle-group`) statt Switches; ein Nein verlangt eine
    Begründung («Was muss überarbeitet werden?»). Ausfüllen kann
    **R-06 im Status «In Prüfung»**, alle anderen sehen das Protokoll
    read-only (Badges). Abschluss unten in der Leiste: **alle Ja →
    «Als geprüft kennzeichnen»** (setzt Status und Abschluss-Vermerk);
    **mindestens ein Nein → «Zur Korrektur zurückweisen»** — je Befund
    entsteht **beim Zurückweisen** ein Kommentar am Objekt (Titel
    «Prüfbefund: <Gruppe>», Text Frage + Begründung), das Objekt geht in
    «Korrektur». Der **Wechsel auf «Geprüft» ist überall geschützt**
    (Kopfzeilen-Dropdown, Formular-Select, Dashboard-Zeile, Knopf im
    Abschnitt Prüfen/Freigabe): ohne bestandenes Protokoll erklärt ein
    Modal die Voraussetzung, im Objekt-Detail öffnet sich zusätzlich die
    Prüfung. Persistiert am Objekt (`pruefprotokoll` mit
    Abschluss-Vermerk der letzten Runde); Umsetzungsvermerk der
    Inventarisierenden (4.6) folgt in einer späteren Etappe.
76. **Prüfungs-Knopf eingeschränkt:** Er erscheint nur im Status
    **«In Prüfung»** und nur für **R-06 und R-07**; die Einsicht für
    andere Rollen entfällt (die Befunde stehen als Kommentare am
    Objekt). R-07 sieht statt des Formulars einen **Platzhalter** — die
    Fachliche Prüfstelle erhält ein **eigenes Protokoll**, das später
    spezifiziert wird.
77. **Arbeitspakete im Dashboard** (03.02/03.03): Für die Paketrollen
    **R-03 und R-04** liegt über den Status-Gruppen der Bereich
    «Arbeitspakete». ~~**R-03** schnürt **Kantonspakete** — der Kanton
    Bern (alle 403 Strecken) lässt sich T. Nyffenegger (R-04) zuweisen;
    Wallis/Graubünden/Tessin sind Attrappen ohne Daten (Klick
    erklärt).~~ **Überholt durch Entscheid 82** — alle 26 Kantone sind
    echt zuweisbar, ohne Statuswechsel. ~~**R-04** schnürt freie Pakete
    für die Inventarisierenden: Auswahl über die **Zeilen-Checkboxen**
    oder ersatzweise die aktive **Polygon-Selektion**, Zielperson
    wählbar (B. Anderegg, L. Furrer). Eine Zuweisung ist ein
    **einmaliger Vorgang** (keine persistente Paket-Entität, dadurch
    exklusiv).~~ **Überholt durch Entscheid 83** — Pakete sind benannte,
    gespeicherte Entitäten. Die Zuweisung setzt weiterhin alle Objekte
    des Pakets in einem Zug auf **«Zugewiesen»**, mit Person und
    Lognotiz (`paketZuweisen` im ObjektStore).
    **Paketrollen sehen immer alle Objekte** (der persönliche Filter
    aus Entscheid 70 gilt nur noch für R-05/06/07; R-04 seit
    Entscheid 83 beschränkt auf ihre Kantone). ~~Sie können auf
    unterstellte Personen **absteigen**: Ein Ansicht-Umschalter zeigt
    deren persönliches Dashboard mit allen Aktionen.~~ **Entfernt mit
    Entscheid 83/84** — an seine Stelle tritt der Filter «Zuständige
    Person».
78. **Status auf Strecken-Ebene:** Der Workflow-Status wird nur auf
    Strecken gesetzt — **alle untergeordneten Objekte richten sich nach
    dem Status ihrer Strecke.** Umgesetzt als Vererbung: Ein
    Statuswechsel auf der Strecke (`statusWechseln`, `paketZuweisen`)
    zieht Status und Zuständigkeit still auf alle Nachkommen (Lognotiz
    nur an der Strecke); die Seed-Daten und die generierte Vollabdeckung
    sind entsprechend normalisiert (`statusVonStreckeErben`,
    SEED_VERSION 10 — frühere Child-Stati wie «Korrektur» auf
    BE 21.1.3 entfallen). Auf Child-Objekten erklärt der
    Status-Wechsel-Versuch im Modal, dass der Status auf der Strecke
    gesetzt wird; damit läuft auch das **Prüfprotokoll auf
    Strecken-Ebene** (der Knopf «Prüfung» erscheint nur auf Strecken —
    der Abschluss wechselt den Streckenstatus samt Nachkommen).

**Siebte Ausbaustufe — Review-Paket «Verbesserungen» (PDF vom 05.08.2026,
16 Rückfragen in derselben Session geklärt).** Status «Offen»,
Zuständigkeit über das Dashboard, echte Kantonspakete, persistente
Arbeitspakete und echte Filter.

79. **Status «Offen»:** Neuer erster Status vor «Zugewiesen» — Objekte,
    die noch niemandem zugewiesen sind. Sie tragen **keine zuständige
    Person** (`zustaendigName` leer, Anzeige «—»); das Setzen auf «Offen»
    entzieht die Zuweisung, die Zuweisung einer Person führt automatisch
    zu «Zugewiesen». Setzbar für **R-03 und R-04**. Im Seed stehen **3/4
    der publizierten Strecken auf «Offen»** (deterministisch: jede vierte
    generierte Strecken-Nummer bleibt publiziert); **BE 7 bleibt als
    Demo-Beispiel bewusst publiziert**. Statusfarbe: neutrales Grau
    (`--status-offen`). SEED_VERSION 11.
80. **Status-Dropdown nur in der Kopfzeile:** Das Feld «Workflow-Status»
    in den Eckdaten des Objekt-Formulars ist entfernt; im Edit-Modus
    steht dort nur noch die Read-only-Anzeige (der Anker `attr-status`
    für `#`-Referenzen bleibt). Der Wechsel läuft ausschliesslich über
    das Dropdown in der Kopfzeile (bzw. die Dashboard-Zeile).
81. **Zuständigkeit über das Dashboard:** Die zugewiesene Person steht
    als Spalte «Zuständig» in der Dashboard-Tabelle. **Nur R-03 und
    R-04** wechseln sie (Zeilen-Dropdown mit allen Personen); alle
    anderen Rollen sehen den Namen als Text. Die Zuständigkeit wird wie
    der Status **auf Strecken-Ebene geführt und vererbt**
    (`personZuweisen` im ObjektStore, Lognotiz an der Strecke). Der
    Workflow-Status bleibt beim Wechsel unberührt — einzig ein
    «offenes» Objekt wechselt mit der Zuweisung automatisch auf
    «Zugewiesen». Das Objekt-Detail zeigt die Person nur noch
    **read-only** (ersetzt das Personen-Dropdown aus Entscheid 72).
    Umgekehrt führen **Statuswechsel** die Zuständigkeit als
    **Rollen-Übergabe** nach (08.03): Die Person bleibt, wenn sie der
    neu zuständigen Rolle bereits angehört — explizite Zuweisungen
    gehen nicht verloren —, sonst übernimmt die Persona der Rolle,
    und der Wechsel steht mit in der Status-Lognotiz (Präzisierung
    aus dem Review der siebten Ausbaustufe).
82. **Kantonspakete echt** (ersetzt den R-03-Teil von Entscheid 77):
    Der Arbeitspakete-Bereich von R-03 listet **alle 26 Kantone**; jeder
    — auch ohne Testdaten, testweise — lässt sich per Dropdown einer
    **Regionalen Koordination** zuweisen. Die Zuweisung ist
    **persistent und änderbar** (`PaketStore`, localStorage-Schlüssel
    `ivs-prototyp-v3.pakete`; Seed: Bern → T. Nyffenegger) und
    **verändert den Objekt-Status nicht** — erst die Zuweisung an eine
    Person setzt «Zugewiesen» (Entscheid 79). Dafür gibt es **zwei
    weitere R-04-Personen** (A. Vaucher, G. Bernasconi). Grenzfälle:
    R-03 kann ausgewählte Strecken (Checkboxen oder Polygon) **einem
    anderen Kanton zuordnen** (`kantonZuordnen` im ObjektStore; im UI
    heisst die Aktion «In Kanton verschieben») — die Signatur bleibt
    unverändert, nur das `kanton`-Attribut wechselt, Nachkommen ziehen
    still mit (Lognotiz an der Strecke).
83. ~~**Arbeitspakete als Entitäten** (ersetzt den R-04-Teil von
    Entscheid 77): Die Regionale Koordination erstellt **benannte,
    gespeicherte, löschbare Pakete** (Name frei wählbar; Strecken über
    Checkboxen oder Polygon). Der **Inhalt ist änderbar**; ein Objekt
    gehört zu **höchstens einem Paket**. Die **Zuweisung an eine
    Inventarisierende geschieht pro Paket**.~~ **Aufgehoben durch
    Entscheid 85** — die R-04-Paket-Entitäten sind wieder entfallen.
    Bestehen bleiben aus diesem Entscheid: **R-04 sieht nur die ihr
    zugewiesenen Kantone** (Dashboard und Karte; Seed: Bern →
    T. Nyffenegger), und der **Ansicht-Umschalter ist entfernt** —
    Ersatz ist der Filter «Zuständige Person» (Entscheid 84).
84. **Echte Attributfilter** (Dashboard und Objekte-Übersicht,
    gemeinsames Prädikat in `core/objekt-filter.ts`): Das
    «Alle Filter»-Popover ist keine Attrappe mehr — es filtert
    **Kanton, Gemeinde (Teilstring), Aufnahmejahr,
    Bewertungs-Durchschnitt (mindestens Ø 1–3) und Inexistenz**; die
    Schnellfilter (Status, Bedeutung, Substanzgrad) bleiben. Die
    **Region-Attrappe ist ersetzt**. Auf erster Ebene stehen — **nur
    für R-03 und R-04** — die Filter **«Zuständige Person»** (alle
    Personen, «System», «Ohne Zuweisung») und **«Arbeitspaket»**
    (R-03: 26 Kantonspakete und alle R-04-Pakete; R-04: nur die
    eigenen Pakete; Nachkommen paketierter Strecken gelten als im
    Paket). Die persönliche Einschränkung für R-05/06/07 bleibt
    bestehen — diese Rollen sehen die beiden Filter nicht. Die
    **Karte folgt den Filtern** auf beiden Seiten (Entscheid 73).

**Achte Ausbaustufe — Review-Paket vom 06.08.2026 (14 Rückfragen in
derselben Session geklärt).** Rückbau der R-04-Pakete, Zuweisungs-Dialog,
Multi-Edit, Kommentar-Pflichtzuweisung, Begehungs-Ausbau,
Strecken-Anforderung und Geometrie-Werkzeuge.

85. **R-04-Arbeitspakete entfallen** (hebt den Paket-Teil von
    Entscheid 83 auf): Die Regionale Koordination bildet keine
    benannten Pakete mehr — **die Zuweisung an Inventarisierende läuft
    rein über die Zuständigkeit** (Zuständig-Spalte bzw. Multi-Edit).
    Der Arbeitspakete-Bereich im Dashboard gehört allein R-03
    (Kantonspakete, Entscheid 82); der Filter «Arbeitspaket» steht nur
    noch R-03 zur Verfügung und bietet die 26 Kantonspakete. Das
    Kanton-Scoping von R-04 bleibt.

**Bewusst nicht umgesetzt** (aus dem spartan-Review; nicht erneut
vorschlagen, ohne den Entscheid anzusprechen):

- **Die NHG-Punkteskala bleibt eine eigene Komponente.** `hlm-toggle-group`
  wäre für fünf Optionen (0–4) das Lehrbuch-Primitive, wurde aber
  ausdrücklich abgelehnt: Die Darstellung folgt der Content-Skizze (●●●○ ×)
  und das Verhalten «nochmaliger Klick setzt eine Stufe zurück» passt nicht
  ins Toggle-Group-Modell. Die Touch-Trefferflächen sind stattdessen per
  `pointer-coarse:` nachgerüstet.
- **`hlmCard` und `hlm-separator` bleiben ungenutzt** — die
  `rounded-md border`-Sections und `border-b`-Trenner sind bewusst gesetzt
  und funktionieren; es gibt keinen `<hr>`-Missbrauch.
- **Die 40 `hlm-native-select` bleiben**, wie sie sind: laut Forms-Regel
  legitim und von der Touch-Vergrösserung abgedeckt. Ein Wechsel auf
  `hlm-select` oder `combobox` lohnt nur dort, wo Listen wirklich lang
  werden (Objektart aus den Stammdaten, Zuweisung).

---

## 10. Offene Punkte und Ungereimtheiten der Spezifikation

Beim Lesen aufgefallen, noch nicht geklärt:

- **ID 04.01 ist doppelt vergeben** — einmal für «Übersicht», einmal für
  «Dashboard».
- **ID 08.05 existiert zweimal** — in Kapitel 8 als «Versionen vergleichen» und
  in Kapitel 9 als «Kommentare bearbeiten». Letztere ist in diesem Dokument als
  **09.05** geführt.
- **ID 12.02 fehlt** in der Nummerierung.
- **Rollenabgrenzung R-06/R-07:** Beide beanspruchen die «1. Stufe der
  Qualitätsprüfung». Die überarbeitete Story Map schärft das teilweise: R-06
  macht die fachliche und (als Sprachlektorat) die sprachliche Prüfung mit
  Prüfprotokoll pro Beschrieb, R-07 die übergreifende Prüfung mit Prüfbericht
  pro Kanton und Kommentaren pro Objekt. Die verbleibende Überschneidung ist das
  Kommentieren, das beide Rollen ausüben.
- **Kein separater Attributkatalog:** Für 07.04 («Validierung gemäss
  Datenmodell») existiert keine eigene Feldliste. Als Orientierung dienen der
  Referenz-Prototyp und der Aufbau der echten Objektbeschriebe.
- **Kein formales Statusdiagramm:** Die Stati in Abschnitt 7 sind aus
  Spezifikation und Story Map konsolidiert und abgestimmt, aber nicht aus einer
  verbindlichen Quelle übernommen.

Neu hinzugekommen mit der überarbeiteten User Story Map:

- **Wer gibt frei?** Die Story Map nennt für «Freigeben» sowohl R-07 als auch
  R-03. Abschnitt 7 und Anforderung 11.01 kennen nur R-03. Offen ist, ob R-07
  mitzeichnet, vorgängig zustimmt oder nur informiert wird.
- **Prüfprotokoll vs. Prüfregister:** Die Arbeitshilfe verlangt ein
  Prüfprotokoll auf Basis von Checkliste 1, integriert in jeden Objektbeschrieb.
  Der Workshop verlangt ein «Prüfregister QS wie SBB Tool». Ob das dasselbe
  Artefakt in zwei Formulierungen ist oder zwei getrennte Dinge, ist nicht
  geklärt. Checkliste 1 liegt inzwischen vor (Abschnitt 4.7).
- **Arbeitshilfe und Terminologie-Handbuch liegen nicht vor.** Checkliste 1
  verweist auf Arbeitshilfe Kap. 3.6, 4.7, 5.1, 5.2, 5.3 und auf das
  Terminologie-Handbuch. Für den Prototyp genügen Platzhalter-Links.
- **Fachgremium ist keine Rolle:** Strittige Fälle gehen «an das Fachgremium».
  In Abschnitt 2 taucht das Fachgremium nur als Referenz der Arbeitshilfe
  innerhalb von R-07 auf, nicht als eigene Zugriffsrolle. Ob das Gremium im Tool
  arbeitet oder ausserhalb entscheidet, ist offen — es soll aber «Kommentare zu
  einzelnen Beschrieben erfassen» können, was auf Tool-Zugriff hindeutet.
- **Keine Persona für «Verwalten von Auswahllisten» und «Zusammenfassung
  prüfen».** Für die Auswahllisten nennt Anforderung 02.01 den Fachlichen Admin
  (R-03); für die Zusammenfassung ist nichts festgelegt.
- **Persona für 360-Grad-Bilder und Reports weiterhin offen** (`?` auf dem
  Board), bei Reports zusätzlich das Ziel.
- **«Karte und Beschriebe in separaten Fenstern»** aus der Arbeitshilfe steht
  quer zu einer Single-Page-Werkbank. **Entschieden und gebaut:** zweites
  Browserfenster `/karte` mit vollem Panel-Kopf und Live-Synchronisation
  (Entscheide 26 und 58).

Aus dem Review-Paket «Neue ToDos» offen geblieben (bewusst so umgesetzt,
bei Bedarf nachschärfen):

- **Wer weist ToDos zu?** ~~Wie eine Zuweisung fachlich entsteht
  (Arbeitspaket, Regionale Koordination) ist noch nicht gebaut.~~
  **Gebaut mit Entscheid 77:** R-03 schnürt Kantonspakete für die
  Regionale Koordination, R-04 Pakete für die Inventarisierenden;
  offen bleiben Einsatzlisten (03.04) und persistente Paket-Entitäten.
- **Substanzstufen der Legende:** Die abgestimmte Taxonomie kennt «Abschnitt
  mit Substanz» und «mit viel Substanz» (Entscheid 48). Die Testdaten führen
  zusätzlich «wenig Substanz» (64 Features); diese laufen unter der dünnen
  Linie «Abschnitt mit Substanz», das Formularfeld Substanzgrad zeigt
  weiterhin den echten Wert.
- **IVS-1.0-Datenlage:** Der Erstbeschrieb-Stand ist im Prototyp
  deterministisch generiert (Entscheid 66). Ob und in welcher Form echte
  1.0-Daten für die Umsetzung vorliegen, ist nicht geklärt.

Aus der sechsten Ausbaustufe (05.08.2026) offen geblieben:

- **Protokoll der Fachlichen Prüfstelle:** R-07 hat laut Abstimmung ein
  **eigenes** Prüfprotokoll; sein Inhalt ist noch nicht spezifiziert
  (heute Platzhalter, Entscheid 76). Ebenso offen: der
  Umsetzungsvermerk der Inventarisierenden (4.6).
- **Fragenkatalog vs. Checkliste 1:** Der gebaute Katalog stammt aus der
  Review-Vorlage (vier Gruppen, 8 Fragen) und **ersetzt im Prototyp** die
  neun Fragen der Checkliste 1 aus der Arbeitshilfe (4.7). Ob die
  Arbeitshilfe nachgeführt wird oder beide Kataloge nebeneinander
  bestehen, ist nicht geklärt.
- ~~**Arbeitspakete ohne Entität:** Eine Zuweisung ist ein einmaliger
  Vorgang (Entscheid 77) — es gibt keine benannten, nachträglich
  änderbaren Pakete und keine Einsatzlisten (03.04). Der Kanton als
  Paketkriterium ist im Prototyp nur mit Bern belegt; die übrigen
  Kantone sind Attrappen.~~ **Überholt durch die Entscheide 82/83** —
  Kantons- und Objekt-Pakete sind persistent und änderbar. Offen
  bleiben die Einsatzlisten (03.04).
- ~~**Zuweisen darf jede Rolle:** Das Personen-Dropdown im Objekt-Detail
  (Entscheid 72) ist bewusst für alle Rollen offen. Ob die Zuweisung
  fachlich auf R-03/R-04 zu beschränken wäre, ist nicht abschliessend
  geklärt.~~ **Geklärt mit Entscheid 81:** Zuweisen dürfen nur R-03 und
  R-04, und zwar über die Zuständig-Spalte im Dashboard.
- **Prüfkommentar neben dem Prüfprotokoll:** Der Abschnitt
  «Prüfen / Freigabe» im Formular führt weiterhin das Freitextfeld
  `pruefkommentar` (fachliche Zusammenfassung der Prüfung, seit der
  ersten Ausbaustufe). Das strukturierte Protokoll (Entscheid 75) liegt
  daneben in der Seitenleiste. Ob das Feld bleibt, im Protokoll aufgeht
  oder zu dessen Gesamtbemerkung wird, ist offen — **nicht
  eigenmächtig zusammenlegen**.
- ~~**Region-Filter ist eine Attrappe:** Das Select «Region» in der
  Dashboard-Filterleiste (einziger Wert «Bern-Mittelland») wird bewusst
  **nicht ausgewertet** — die Testdaten kennen nur eine Region.
  Filterleiste und «Alle Filter»-Popover zeigen generell mehr Filter, als
  fachlich hinterlegt sind (vgl. Vorgabe 12: Attrappen sind zulässig).
  Kein Bug — nicht ungefragt «reparieren».~~ **Überholt durch
  Entscheid 84** — die Filter-Attrappen (Region, «Alle Filter») sind
  durch echte Attributfilter ersetzt.

---

## 11. Quellen

| Quelle                                                        | Pfad / URL                                                    |
| ------------------------------------------------------------- | ------------------------------------------------------------- |
| Detailspezifikation                                           | `~/Downloads/Detailspezifikation_IVS_IT_Fachapplikation.docx` |
| User Story Map (überarbeitete Fassung, eingelesen 28.07.2026) | `~/Downloads/IVS User Story Map.pdf`                          |
| Objektbeschrieb Strecke (VS 1, 19 Seiten)                     | `~/Downloads/Strecke.pdf`                                     |
| Objektbeschrieb Linienführung (VS 1.2)                        | `~/Downloads/Linienführung.pdf`                               |
| Objektbeschrieb Abschnitt (VS 1.2.14)                         | `~/Downloads/Abschnitt.pdf`                                   |
| Review «Bug-Fixes / Small Changes» (05.08.2026, Entscheide 71–74) | `~/Downloads/Bug-Fixes : Small Changes.pdf`                |
| Vorlage Prüfprotokoll (05.08.2026, Entscheid 75)              | Screenshots der Fragegruppen, in der Sitzung eingespielt      |
| Testdaten und Referenz-Kartenimplementation                   | `/Users/wis/claude/ivs-map`                                   |
| Älterer Prototyp (begrenzte Inspiration)                      | <https://ivs-prototyp-variant-b.vercel.app/>                  |
| Repository                                                    | <https://github.com/Schnitzelbaer/ivs-prototyp-v3> (privat)   |
| **Dieser Prototyp, live**                                     | <https://ivs-prototyp-v3.vercel.app> (siehe 12.7)             |
| spartan/ui-Skill (Regelwerk im Repo)                          | `.claude/skills/spartan/` → `.agents/skills/spartan/`         |

Zur Sprachregel siehe Abschnitt 13.5.

---

## 12. Technischer Stack

Der Stack ist gesetzt und über mehrere Entscheide gewachsen. Er gilt als
verbindlich — siehe die Leitplanken in Abschnitt 13.

### 12.1 Grundgerüst

| Baustein        | Version   | Bemerkung                                                                            |
| --------------- | --------- | ------------------------------------------------------------------------------------ |
| Angular         | 22        | standalone, **kein SSR** (der ArcGIS-SDK ist browser-only)                           |
| TypeScript      | 6.0       |                                                                                      |
| pnpm            | 11        | Paketmanager; Build-Skripte in `pnpm-workspace.yaml` unter `allowBuilds` freigegeben |
| Tailwind CSS    | 4.3       | via `@tailwindcss/postcss`, konfiguriert in `.postcssrc.json`                        |
| spartan/ui      | 1.1.2     | `@spartan-ng/brain` + generierter Helm-Code, CLI `@spartan-ng/cli`                   |
| ArcGIS Maps SDK | 5.1       | `@arcgis/core`; für die Karte selbst kein Lizenzschlüssel nötig                      |
| Icons           | Lucide    | `@ng-icons/lucide`                                                                   |
| Schrift         | Noto Sans | `@fontsource-variable/noto-sans`                                                     |

Weitere Abhängigkeiten kommen als Peers von spartan/ui: `ngx-scrollbar`
(Scroll Area), `embla-carousel` und `embla-carousel-angular` (Carousel),
`class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`.

### 12.2 spartan/ui im Detail

spartan/ui liefert Komponenten **nicht als Paket, sondern als generierten
Quellcode** im Projekt (shadcn-Prinzip). Alle **57 Primitives** sind bereits
generiert.

- Ablage: `libs/ui/<primitive>/src/`
- Import-Alias: `@spartan-ng/helm/<primitive>`, gemappt in `tsconfig.json`
- Generator-Konfiguration: `components.json` (`style: "vega"`)
- Nachgenerieren: `pnpm ng g @spartan-ng/cli:ui <name>`

Der Code unter `libs/ui` ist unserer und darf angepasst werden. **Ein Wechsel
des Styles verwirft aber alle Dateien** und generiert sie neu — eigene
Anpassungen gingen dabei verloren.

### 12.3 Theme

Aus dem shadcn-Preset-Builder, Code **`bInUyNX`**: Style `vega`, Farbthema
`indigo` auf neutraler Basis, Radius `small` (0.45 rem), Schrift Noto Sans,
Icons Lucide. Übernommen wurde nur der **Inhalt** des Presets, nicht der
Mechanismus — `shadcn apply --preset` zielt auf React und würde
`components.json` überschreiben.

Die Tokens liegen in `src/styles.css`, hell und dunkel. Die Variablennamen sind
zwischen shadcn und spartan/ui identisch. Ergänzt sind dort die Chart-Farben und
`--font-heading`, die Spartans `hlm-tailwind-preset` nicht auf
Tailwind-Utilities mappt.

### 12.4 Projektstruktur

```
README.md        Kurzüberblick — wird bei jeder Etappe mitgepflegt
docs/            Fachkontext (dieses Dokument) und Story-Map-PDF
libs/ui/         57 generierte spartan/ui-Primitives
public/data/     Geodaten (Kopien aus ivs-map)
src/styles.css   Theme-Tokens (inkl. --status-*), Touch-Regeln
src/app/
  app.ts, app.config.ts  Wurzelkomponente und Provider (Router, Icons, Sonner)
  app.routes.ts        Routen inkl. Guard für /stammdaten (nur R-03)
  core/                Modell, Stati, Rollen, Seed-Daten, Stores
    model.ts           IvsObjekt, ObjektTyp/objektTypText, WorkflowStatus, …
    status.ts          Status-Labels und -Farben
    rollen.ts          Rollen mit setzbareStati und editStati, darfEditieren
    seed-data.ts       48 kuratierte Mock-Objekte, NAME_FUER_ROLLE, PERSONEN,
                       statusVonStreckeErben, SEED_VERSION
    objekt-generierung.ts  Vollabdeckung: Objekte, Kunstbauten, Feature-Zuordnung
    objekt-store.ts    Objekte, statusWechseln (vererbt auf Nachkommen),
                       paketZuweisen, ergänzt generierte idempotent
    einstellungen-store.ts  Rolle pro Tab (sessionStorage), Dark-Mode (storage-Sync)
    kommentare.ts      Kommentar-Modell, parseKommentarText, jetztLokal, Store
    attribute.ts       Registry der #-referenzierbaren Attribute mit Ankern
    geometrie-store.ts Arbeitsgeometrien je Signatur (storage-Sync)
    begehungen.ts      Begehungsplanung, darfBegehungPlanen (R-03/04/06/07)
    paket-store.ts     KANTONE und Kanton→Koordination-Zuweisungen
                       (Entscheide 82/85)
    herkunft-store.ts  Herkunft des Objekt-Details (Back-Button)
    objekt-filter.ts   gemeinsame Attributfilter von Dashboard und Objekten
                       (Entscheid 84)
    pruefprotokoll.ts  Fragenkatalog und Regeln des Prüfprotokolls (Entscheid 75)
    hinweis-store.ts   zentraler «Warum nicht?»-Hinweis (nie-disabled-Regel)
    version-vergleich.ts  IVS-1.0-Ableitung, kuratierte Alttexte, Wort-Diff
    stammdaten.ts      Auswahllisten DE/FR/IT
  shell/               Icon-Leiste, Account-Menü (Rollen-Nummer als Button,
                       Perspektive + Profil), Hinweis-Dialog, Toaster
  dashboard/           Arbeitspakete + Aufgabenliste (nur Strecken, persönlich)
                       + Kartenpanel + Kommentare
  objekte/             Strecken-Baum, Karte und Side-Panel
  objekt/              Objektbearbeitung
    objekt-detail.*    Formular, Statusfluss, Personen-Zuweisung, Dialoge,
                       Prüfprotokoll-Sheet, Versionsvergleich
                       (das Template hat ~1700 Zeilen — Änderungen dort
                       gezielt suchen, nicht die Datei am Stück lesen)
    hierarchie-menu.ts Hierarchie-Menü mit Typ-Tags und Umteilen je Zeile
    versions-karte.ts  Vergleichskarte IVS 1.0/2.0 (zwei Deckkraft-Layer)
    text-editor.ts     Rich-Text-Editor (contenteditable, 07.17)
    bewertungs-punkte.ts  Punkteskala 0–4
  karte/               ArcGIS-Komponente und Umfeld
    karte.ts           View, Layer, Selektion/Highlight, MapTip, Kontextmenü,
                       Geometrie-Editing, Pins, Kartenbild-Panel
    karten-layer.ts    Layer-/Hintergrund-Definitionen, OBJEKT_TYP_SYMBOL,
                       Objekt-Anreicherung
    karte-fenster.ts   eigenständiges Kartenfenster /karte mit Panel-Kopf
    karte-sync.ts      BroadcastChannel-Synchronisation
    objekt-geo.ts      Objekt-Features, Bbox, Dufour-Situierungsbild (WMS)
    typ-symbol.ts      Legenden-Symbol eines Objekttyps (überall gleich)
  kommentare/          Kommentar-Panel (Threads, @/#, Filter)
  panorama/            360°-Galerie und Viewer
  begehungen/          Begehungsplanung (eigener Tab)
  stammdaten/          Auswahllisten-Verwaltung (R-03)
  kitchen-sink/        Referenzseite, ein Abschnitt je Themengruppe
```

**Zustand und Persistenz.** Alle Stores sind `providedIn: 'root'`, halten ihren
Zustand in Signals und spiegeln ihn per `effect` in den localStorage:

| Schlüssel                       | Inhalt                        | Version                           |
| ------------------------------- | ----------------------------- | --------------------------------- |
| `ivs-prototyp-v3.objekte`       | Objekte samt Lognotizen und Prüfprotokoll | `SEED_VERSION` in `seed-data.ts` (aktuell 10) |
| `ivs-prototyp-v3.kommentare`    | Kommentare und Antworten      | Konstante in `kommentare.ts`      |
| `ivs-prototyp-v3.geometrien`    | Arbeitsgeometrien je Signatur | Konstante in `geometrie-store.ts` |
| `ivs-prototyp-v3.begehungen`    | geplante Begehungen           | Konstante in `begehungen.ts`      |
| `ivs-prototyp-v3.stammdaten`    | Auswahllisten                 | Konstante in `stammdaten.ts`      |
| `ivs-prototyp-v3.pakete`        | Kanton→Koordination-Zuweisungen | Konstante in `paket-store.ts`   |
| `ivs-prototyp-v3.einstellungen` | Standard-Rolle neuer Tabs, Dark-Mode | —                          |
| `ivs-prototyp-v3.rolle` (**sessionStorage**) | Rolle dieses Tabs (Entscheid 67) | —                  |

Passt die gespeicherte Version nicht zur Konstante, wird der Stand verworfen
und neu geseedet. **Nach jeder Seed-Änderung die Version erhöhen**, sonst
sehen bestehende Browser die Änderung nie. «Demodaten zurücksetzen» im
Account-Menü setzt Objekte, Kommentare, Geometrien, Begehungen,
Stammdaten und Arbeitspakete zurück — die Einstellungen (Rolle,
Dark-Mode) bleiben.

Drei Stores (`kommentare`, `geometrien`, `einstellungen`) hören zusätzlich
auf das `storage`-Ereignis und übernehmen Änderungen aus anderen Fenstern —
so bleibt das separate Kartenfenster `/karte` live synchron (Entscheid 58).
Die **aktive Rolle gilt seit Entscheid 67 pro Tab** (sessionStorage
`ivs-prototyp-v3.rolle`) und synchronisiert nicht mehr; der localStorage
hält nur die Standard-Rolle für neue Tabs, das Kartenfenster erbt die
Rolle seines Ursprungs-Tabs über den URL-Parameter `rolle`.
Nicht persistiert sind `HerkunftStore` und `HinweisStore` (reiner
Sitzungszustand) sowie der IVS-1.0-Stand des Versionsvergleichs, der
deterministisch aus dem aktuellen Objekt abgeleitet wird.

**Geometrie-Zuordnung.** Die Mock-Objekte haben keine eigenen Geodaten:
`core/objekt-generierung.ts` leitet zur Laufzeit aus den drei Quelldateien
(Routen, Teilsegmente, Punktobjekte) sowohl die generierten Objekte als auch
die vollständige Zuordnung Feature → Signatur ab (Cache pro Sitzung).
`karten-layer.ts` stempelt die Attribute beim Laden auf die Features und
speist die Layer aus einer Blob-URL; die kuratierten Zuordnungen der fünf
Seed-Strecken sind dort als Tabellen hinterlegt. Das Dufour-Situierungsbild
(`objekt-geo.ts`) nutzt dieselbe Anreicherung.

### 12.5 Stand der Arbeit

Gebaut ist die **siebte Ausbaustufe des Kern-Workflows** (Stand 05.08.2026;
die Anpassungen der letzten Sitzungen sind als Entscheide 48–84 in
9.8 dokumentiert):

- **Shell**: Das IVS-Logo führt zum Dashboard; «Perspektive wechseln» liegt
  im Account-Menü unten links (R-03…R-07 wählbar, übrige erklären sich per
  Modal), zusammen mit Profil und «Demodaten zurücksetzen». Der
  Account-Button zeigt die **aktive Rollen-Nummer**; die Rolle gilt **pro
  Tab** (Entscheid 67). Dark-Mode, Sprachwechsler als Attrappe, zentraler
  Hinweis-Dialog (nie-disabled).
- **Dashboard (04)**: **nur Strecken** (ToDos auf Strecken-Ebene,
  Entscheid 60), **persönlich** — je Status nur Objekte, die der aktiven
  Person zugewiesen sind oder einmal zugewiesen waren (Entscheid 70) —,
  gruppiert **nach allen Workflow-Stati** (inkl. «Offen», Entscheid 79) in Workflow-Reihenfolge
  (Entscheide 68/70, mit Status-Farbpunkt; leere Gruppen starten
  zugeklappt, Entscheid 71), Suche, **echte Attributfilter** —
  Schnellfilter plus «Alle Filter»-Popover (Kanton, Gemeinde,
  Aufnahmejahr, Bewertung, Inexistenz) sowie für R-03/R-04 «Zuständige
  Person» und «Arbeitspaket» (Entscheid 84) —, Zeilen-Dropdown mit
  direktem Wechsel unter den **setzbaren Stati** (Entscheid 69),
  **Zuständig-Spalte** mit Personen-Dropdown für R-03/R-04
  (Entscheid 81), Polygon-Selektion als geographischer Filter (05.03).
  Die **Karte zeigt nur die Objekte der Liste** und wird von Suche und
  Filtern mitgezogen — inklusive Status-Filter (Entscheid 73). Für
  **R-03** liegt darüber der Bereich **Arbeitspakete** (Entscheide
  77/82/85): alle 26 Kantone an die Regionale Koordination zuweisbar
  (persistent und änderbar, ohne Statuswechsel), Grenzfall-Strecken
  einem anderen Kanton zuordenbar. R-04 bildet keine Pakete mehr —
  sie **weist rein über die Zuständigkeit zu** (Entscheid 85). R-03
  sieht alle Objekte, **R-04 nur die ihr zugewiesenen Kantone**.
- **Objektbearbeitung (07)**: View-/Edit-Modus mit automatischem Speichern
  und Rechteprüfung je Rolle × Status; Formular mit Eckdaten (inkl.
  Dufour-Situierungsausschnitt via swisstopo-WMS), NHG-Bewertung (drei
  Punkteskalen 0–4, Ø angezeigt), Empfehlungen, Geschichte & Gelände
  (3000-Zeichen-Limite), Anhang, Prüfen/Freigabe, Inexistent (07.16, mit
  Pflichtbegründung), Lognotizen; **Hierarchie-Menü** (Entscheid 54) mit
  Legenden-Symbolen, Typ-Tags und Umteilen je Child-Zeile (Kontextmenü
  nur per Klick, Entscheide 63/74); **Status-Dropdown**, das den
  aktuellen Status zeigt und die setzbaren zur Wahl stellt (Entscheide
  59/69/72) — Statuswechsel nur auf Strecken, Nachkommen erben ihn
  (Entscheid 78), das Eckdaten-Formular zeigt den Status nur noch
  read-only (Entscheid 80); die **zugewiesene Person read-only** in der
  Kopfzeile — der Wechsel geschieht in der Zuständig-Spalte des
  Dashboards (Entscheid 81);
  **Prüfprotokoll** als Seitenleiste hinter dem Knopf «Prüfung»
  (Entscheide 75/76); **Back-Button** zur gemerkten Herkunftsseite
  (Entscheid 62); **Versionsvergleich** im Historie-Menü (Entscheid 66);
  Begehungs-Einplanung sichtbar (Badge und 360°-Bereich, Entscheid 65);
  Bearbeitungslog als Sheet; Löschen immer aktiv mit Warn- bzw.
  Erklär-Modal (07.05, nie-disabled-Regel, Entscheid 52).
- **Karte**: ArcGIS Maps SDK mit swisstopo-WMTS und den Layern aus
  `ivs-map` — die Objekte liegen AUF diesen Layern (Anreicherung beim
  Laden, Entscheid 40); die **Symbolik folgt der einheitlichen Legende**
  (Entscheid 49: Abschnitte blau nach Typ, Strecken/LF orange, Kunstbauten
  als eigener generierter Layer). Selektion mit SDK-Highlight, Abblendung
  und Zoom; Hover-MapTip mit Hierarchie und Legenden-Symbolen; Klick öffnet
  direkt, Kontextmenü nur bei mehreren echt verschiedenen Objekten
  (Entscheid 41). Treffer werden über einen **Umkreis** gesucht (8 px Maus,
  14 px Touch — Entscheid 46), nicht per `hitTest`. Das
  **Kartenbild-Panel** steuert Hintergründe additiv samt Deckkraft je
  Eintrag (Entscheid 50). Separates Kartenfenster `/karte` mit Panel-Kopf
  (Tabs und Werkzeuge, Entscheid 58) und bidirektionaler Synchronisation
  (BroadcastChannel für die Selektion, storage-Ereignisse für Geometrien
  und Kommentare; die Rolle gilt pro Tab, Entscheid 67).
- **Mock-Daten**: 48 kuratierte Objekte im Testgebiet Bern — BE 7
  (Murtenstrasse, publiziert), BE 21 (Frauenkappelen–Gümmenen, in
  Bearbeitung, enthält alle Wegoberflächen-Routen), BE 22 (Wohleistrasse,
  in Prüfung), BE 23 (Kirchweg, zugewiesen an L. Furrer), BE 35
  (Freiburgstrasse, geprüft), inkl. zwei kuratierter Kunstbauten — plus
  generierte **Vollabdeckung** aller Testgeometrien (Entscheide 44/48):
  insgesamt ~3742 Objekte (403 Strecken, 862 Linienführungen, 2301
  Abschnitte inkl. 148 Kunstbauten, 176 Wegbegleiter), generierte zu 3/4
  im Status «Offen» ohne zuständige Person, der Rest «publiziert» und
  neutral «System» zugewiesen (Entscheide 70/79), mit
  aus `ivs_signatur` abgeleiteter Bedeutung/Substanz und
  Wegbegleiter-Namen aus dem `easyocr`-Feld. **Der Status gilt je
  Strecke** — alle Nachkommen tragen den Status ihrer Strecke
  (Entscheid 78). Persistenz im localStorage (~3.9 MB), `SEED_VERSION`
  erhöhen verwirft Stände.
- **Objekte-Übersicht (04.01)** unter `/objekte`: Kartenansicht — Karte im
  Vordergrund, links der **aufklappbare Strecken-Baum** (Entscheid 64), ein
  Klick (Liste oder Karte) öffnet rechts das Side-Panel mit dem
  **vollständigen** Objektinhalt und dem Hierarchie-Menü (Entscheid 55);
  dieselben **echten Attributfilter** wie im Dashboard (Entscheid 84);
  sobald Suche oder Filter aktiv sind, wird auch die **Karte gefiltert**
  (Entscheid 73).
- **360°-Aufnahmen (06, Vorgabe 9)** unter `/panorama`: Galerie der
  Befahrung mit drehbarem Platzhalter-Panorama (generierte, nahtlose SVGs),
  Vor-/Zurück-Navigation, Karte mit Standortpunkt und live mitdrehendem
  Blickrichtungskegel (07.08).
- **Begehungen** unter `/begehungen` (eigener Tab, Entscheid 65):
  Reihenfolge der Objekte, Verkehrsmittel, Unterkunft, Zeitbedarf; planbar
  nur für R-03/04/06/07, auch direkt aus der Objektbearbeitung.
- **Versionsvergleich (08.05, Vorgabe 10)**: Wort-Diff der Beschriebe und
  Eckdaten-Änderungen IVS 1.0 → 2.0 plus Vergleichskarte mit separat
  regelbarer Deckkraft beider Stände (Entscheid 66).
- **Kommentare (09/10)**: Panel mit Threads, Antworten, Erledigt-
  Kennzeichnung (10.02), Suche, Sortierung, Filtern (Standard «Offene»,
  objektübergreifend nur eigene — Entscheid 56); `@`-Erwähnungen
  (Benutzer mit Rolle) und `#`-Attribut-Referenzen, die im Objektformular
  zum Feld springen (09.03); Kommentare an Objekten jeder Ebene oder frei
  auf der Karte platzierbar (05.11), Objektzuweisung optional.
- **Detail-Werkzeuge**: Rich-Text-Editor für die Beschriebe (07.17: fett,
  kursiv, durchstreichen, Markerfarben), Geometrie-Editing auf der Karte
  (05.05: zeichnen, verschieben, Stützpunkte, verschneiden, zusammenfügen;
  Snapping 05.09 an bestehender Geometrie — TLM liegt nur als Raster vor),
  Hintergrundwechsel und Raster-Overlays mit Transparenz (05.04: IVS-
  Geländekarte, Dufourkarte, Luftbild) samt Objekt-Deckkraft, Umteilen an
  ein anderes Parent-Objekt (07.09), Quellen-Zusammenstellung mit
  simulierter Literaturdatenbank-Abfrage (07.18).
- **Stammdatenverwaltung (02.01/02.02)** unter `/stammdaten`, per Guard nur
  für R-03 (eigener Navigationspunkt): Auswahllisten DE/FR/IT inline
  pflegen, deaktivieren statt löschen; die Wegbegleiter-Typen speisen das
  Feld «Objektart» im Objektformular.
- **spartan-Konformität (Entscheid 45)**: Klapp-Abschnitte überall als
  `hlm-collapsible` (ARIA + Touch-data-slot), Toast-Rückmeldungen (sonner)
  bei Statuswechsel/Löschen/Umteilen/Geometrie-Übernahme/Demodaten-Reset,
  Status-Signalfarben als `--status-*`-Tokens (hell/dunkel) konsistent in
  Objektliste, Dashboard und Status-Badge, Leerzustände mit `hlm-empty`,
  Touch-Trefferflächen app-eigener Elemente über `pointer-coarse:`.
- **Kitchen Sink** unter `/kitchen-sink` als Nachschlagewerk;
  **Touch-Vergrösserung** aktiv (Abschnitt 9.6); keine Unit-Tests
  vorgesehen (`pnpm test` meldet «No tests found»).
- **Prüfprotokoll (4.6, Entscheide 75/76)**: Seitenleiste «Prüfung»
  (nur Status «In Prüfung», Rollen R-06/R-07 — R-07 mit Platzhalter für
  ihr späteres eigenes Protokoll) mit Ja/Nein-Fragen in vier Gruppen,
  Nein-Befunde werden beim Zurückweisen zu Kommentaren, «Geprüft» ist
  ohne bestandenes Protokoll überall gesperrt (Guard mit Erklär-Modal).
- **Arbeitspakete (03.02, Entscheide 77/82/85)**: Bereich im
  Dashboard nur für R-03 — alle 26 Kantone an die Regionale
  Koordination zuweisbar (persistent, änderbar, ohne Statuswechsel),
  Grenzfall-Strecken einem anderen Kanton zuordenbar. R-04 bildet
  keine Pakete mehr und weist rein über die Zuständigkeit zu
  (Zuständig-Spalte, Multi-Edit). R-03 sieht alle Objekte, R-04 nur
  die ihr zugewiesenen Kantone; statt des Ansicht-Umschalters
  filtert «Zuständige Person» (Entscheid 84).

**Personen im Prototyp** (`NAME_FUER_ROLLE` und `PERSONEN` in
`seed-data.ts`). Sie tragen das persönliche Dashboard (Entscheid 70), die
Zuweisung (Entscheide 81/82/83) und die `@`-Erwähnungen:

| Person          | Rolle | Bemerkung                                        |
| --------------- | ----- | ------------------------------------------------ |
| K. Aebischer    | R-03  | Fachliche Administration, weist Kantone zu       |
| T. Nyffenegger  | R-04  | Regionale Koordination (Persona), Kanton Bern    |
| A. Vaucher      | R-04  | weitere Regionale Koordination (Entscheid 82)    |
| G. Bernasconi   | R-04  | weitere Regionale Koordination (Entscheid 82)    |
| B. Anderegg     | R-05  | Inventarisierende (Persona der Rolle)            |
| L. Furrer       | R-05  | zweite Inventarisierende, ohne eigene Perspektive |
| M. Gerber       | R-06  | Fachlektorat, führt das Prüfprotokoll            |
| S. Koch         | R-07  | Fachliche Prüfstelle                             |

Beim Rollenwechsel schlüpft man in die Persona der Rolle; L. Furrer ist
bewusst niemandes Perspektive — ihre Objekte zeigen, dass das Dashboard
persönlich filtert. Generierte Objekte sind «System» (R-08) zugewiesen.

Noch nicht gebaut: Nebenblöcke (Accounts, Reports; Arbeitspakete-Rest
wie Einsatzlisten 03.04), Umsetzungsvermerk der Inventarisierenden und
das eigene Protokoll der Fachlichen Prüfstelle im Prüfprotokoll.

### 12.6 Fallstricke aus der bisherigen Arbeit

Fehler, die schon einmal Zeit gekostet haben:

- **Der Angular-Compiler prüft Attribut-Direktiven nicht.** Ein erfundener
  Direktiven-Name wie `hlmAlertIcon` kompiliert klaglos und tut nichts. Neue
  Markup-Muster gehören im Browser verifiziert, nicht nur gebaut.
- **`HlmScrollAreaImports` enthält nur die Direktive**, nicht die
  `NgScrollbar`-Komponente. Ohne zusätzlichen Import aus `ngx-scrollbar` gibt es
  gar keinen Scroll-Viewport — der Inhalt läuft einfach über.
- **`hlm-checkbox` und `hlm-switch` stehen auf `display: contents`** und
  erzeugen selbst keine Box. Styles müssen am inneren `button` hängen.
- **Trigger überschreiben `data-slot`.** Ein Button mit `hlmBtn` und
  `hlmDialogTrigger` trägt `data-slot="dialog-trigger"`, nicht `"button"`.
- **Beim Neugenerieren** hält der Generator vorhandene Primitives für
  installiert, solange die Pfade in `tsconfig.json` stehen — die müssen vorher
  geleert werden.
- **`hlm-native-select` bringt sein eigenes `<select>` mit**; Optionen gehören
  direkt hinein, nicht in ein zusätzliches Element. Ohne gesetzten `value`
  bleibt die Anzeige leer.
- **Touch-Regeln dürfen nur additiv sein.** Sobald sie `position`, `display`
  oder `height` eines Primitives überschreiben, bricht dessen internes Layout —
  so geschehen beim Slider-Griff, bei der Tabs-Leiste und bei der Menubar.
- **Erfundene Inputs sind stumm.** `side="right"` auf `hlm-popover-content`
  existiert nicht — das Popover öffnete am falschen Ort und wurde
  abgeschnitten. Ausrichtung steuert `align` auf `hlm-popover`.
- **Ein durchgehend `null`-wertiges Feld verwirft der GeoJSONLayer.** Der
  Typ ist nicht inferierbar, das Feld fehlt danach in `layer.fields`, und
  jede Query mit ihm in `outFields`/`where` schlägt fehl. Im Prototyp fiel
  dadurch der ganze Polygon-Filter samt Linienführungs-Zoom aus. Fix: leerer
  String statt `null` (siehe `signaturKette()` in `core/objekt-generierung.ts`).
- **`queryExtent` taugt für Einzelpunkte nicht.** Das Ergebnis ist ein
  degenerierter Extent (Meter-Puffer in einem Grad-Extent). Punkte-Extents
  aus den Geometrien selbst bilden.
- **Punkt-Schwelle mit UND, nicht ODER.** Eine flache Ost-West-Linie
  unterschreitet die Höhen-Schwelle und würde sonst als Punkt behandelt und
  bei fester Skala beidseitig abgeschnitten.
- **`SketchViewModel.cancel()` feuert synchron.** Der Abbruch löst sofort
  `update`/`create` mit `state: 'complete'` bzw. `'cancel'` aus — noch im
  selben Aufruf. Zwei Folgen im Prototyp: Beim Objektwechsel im
  Geometrie-Modus wären die Arbeitsgeometrien unter der bereits gewechselten
  Signatur gespeichert worden (Guard-Flag nötig), und `create()` cancelt
  intern, wodurch das eben gesetzte Werkzeug sofort wieder genullt wurde
  (erst cancel, dann Werkzeug setzen).
- **Signals: Referenzwechsel ≠ Wertwechsel.** `store.update` erzeugt pro
  Tastendruck eine neue Objektreferenz; ohne `equal` auf dem `computed`
  feuerten Karten-`goTo`, BroadcastChannel und Bild-Reload bei jedem Zeichen.
- **`untracked` für Fremd-Signals in Effects.** Ein Azimut-Read innerhalb der
  Marker-Funktion machte den Standort-Effect vom Azimut abhängig — die Karte
  sprang bei jeder Drehbewegung zurück.
- **Modul-Zähler taugen nicht als IDs bei localStorage-Persistenz.** Nach dem
  Reload beginnt der Zähler von vorn und vergibt bereits gespeicherte IDs
  erneut; Bearbeiten trifft dann zwei Zeilen und `@for … track` bricht.
  Zufalls-IDs für neu erzeugte Einträge verwenden.
- **Zeitstempel konsistent lokal.** `toISOString()` liefert UTC ohne
  Zonenkennung; gemischt mit lokal erzeugten Stempeln stimmen Anzeige und
  Sortierung nicht mehr. Im Prototyp gilt `jetztLokal()` aus
  `core/kommentare.ts`.
- **Rich-Text ist HTML.** Wo ein mit dem Editor gepflegtes Feld angezeigt
  wird, muss es per `[innerHTML]` gerendert werden — sonst erscheinen die
  Tags als Klartext (passiert im Side-Panel der Objekte-Ansicht).
- **Der Watcher übersieht neu angelegte Templates.** Wird eine `.html` neu
  erstellt, meldet der Dev-Server «Could not find template file», bis die
  zugehörige `.ts` einmal berührt wird (`touch`).
- **Verstecktes Browser-Pane drosselt WebGL.** Screenshots der Karte werden
  weiss und `hitTest`-, `goTo`- und `whenLayerView`-Promises hängen, sobald
  das Pane nicht im Vordergrund ist — kein Anwendungsfehler, aber
  irreführend beim Verifizieren. Der ferngesteuerte Hover des Panes erzeugt
  zudem keine `pointer-move`-Events; Hover-Interaktionen lassen sich dort
  nur über die Logik (Mock-Treffer) und mit echter Maus verifizieren.
  Folgefehler im Code: Ein boolescher In-Flight-Guard um `hitTest` bleibt
  nach einem hängenden Aufruf für immer gesperrt — deshalb ist der
  Hover-Guard in `karte.ts` zeitbasiert.
- **`hitTest` taugt nicht für Objekt-Interaktion auf GeoJSON-Layern.**
  Er prüft nur die gerenderten Symbolpixel (eine 3-px-Linie ist praktisch
  untreffbar) und liefert nur die im Renderer verwendeten Attribute — zur
  Laufzeit gestempelte Felder fehlen im Trefferobjekt. Hover und Klick der
  Karte suchen deshalb räumlich: Zeigerposition → `view.toMap` →
  `geometryEngine.buffer` (8 px, Touch 14 px) → `queryFeatures` mit
  `outFields` auf den Objekt-Layern. Kommentar-Pins werden synchron im
  Bildschirmraum (`view.toScreen`, Distanz) geprüft. Nebeneffekt: Dieser
  Pfad hängt nicht am gedrosselten WebGL und ist mit synthetischen
  Pointer-Events auch im versteckten Pane end-to-end verifizierbar.
- **hlm-accordion-content bringt Typografie-Meinungen mit**
  (`[&_p]:mb-4`, Link-Unterstreichung) — für Formular-Container deshalb
  `hlm-collapsible` verwenden: ungestylt, gleiche ARIA/Touch-Vorteile,
  Optik bleibt beim Konsumenten.
- **GeoJSONLayer aus einer Blob-URL** ist der saubere Weg, Features zur
  Laufzeit anzureichern: Original-Datei fetchen, Attribute stempeln,
  `URL.createObjectURL` als Layer-Quelle. Ein Feld, das nur auf manchen
  Features gesetzt ist, braucht auf allen übrigen leere Strings (siehe
  null-Fallstrick oben).
- **Vollabdeckung hat Kosten:** ~3742 Objekte bedeuten ~3.9 MB localStorage
  (Persistenz-Effect serialisiert bei jeder Änderung; die 5-MB-Limite rückt
  näher) und Dashboard-Gruppen mit Tausenden Zeilen (~100 ms pro
  Gruppen-Toggle bei R-03). Für den Prototyp akzeptiert; bei spürbarer
  Trägheit wäre Virtualisierung oder Debouncing der Persistenz der nächste
  Hebel.
- **`vercel.json` erlaubt keine Kommentare** — auch kein `comment`-Feld
  innerhalb von `rewrites`/`headers`. Das Schema lehnt zusätzliche
  Properties ab und der Deploy bricht mit «Schema verification failed» ab.
- **Zwei GeoJSONLayer auf derselben Blob-URL stören sich** beim parallelen
  Erstaufbau (sporadische «Failed to load layer/tile»-Fehler im Worker).
  Die beiden Abschnitts-Layer teilen sich deshalb den gestempelten Blob,
  bekommen aber **je eine eigene Objekt-URL** (`objektQuellUrl` in
  karten-layer.ts). Ein sehr seltener, kosmetischer Tile-Fehler beim
  allerersten Aufbau kann bleiben — die Kacheln werden nachgefordert,
  Feature-Zahlen und Rendering stimmen.
- **Das `storage`-Ereignis feuert nur in fremden Fenstern** — ideal für die
  Live-Synchronisation des separaten Kartenfensters (Geometrien, Kommentare,
  Rolle) ohne Ping-Pong: Das schreibende Fenster löst bei sich selbst kein
  Ereignis aus.
- **Overlay-Scrollbalken überlagern die letzte Spalte** eines scrollenden
  Dropdown-Menüs (macOS) — Zeilen mit rechtsbündigen Aktions-Buttons wie im
  Hierarchie-Menü brauchen ein rechtes Padding (`pr-2`).
- **Die nie-disabled-Regel bricht `hlmAlertDialogTrigger`.** Ein Trigger
  öffnet den Dialog unbedingt — soll der Klick erst eine Bedingung prüfen
  (löschen erlaubt? bearbeiten erlaubt?), muss der Dialog stattdessen über
  `[state]="offen() ? 'open' : 'closed'"` gesteuert und der Button ein
  gewöhnlicher Button mit Handler sein. Gleiches gilt für Dialoge, die aus
  einem Kontextmenü heraus geöffnet werden. `hlmAlertDialogCancel` schliesst
  das Overlay, setzt aber das eigene Signal nicht zurück — dort ein
  `(click)` ergänzen.
- **`hlm-native-select` behält seine Anzeige nach einem abgelehnten
  Wechsel.** Wird ein `(ngModelChange)` durch einen Guard abgefangen (z. B.
  «Geprüft» ohne Prüfprotokoll), zeigt das Select trotzdem den neuen Wert —
  das Signal hat sich ja nicht geändert, Angular schreibt nichts zurück.
  Abhilfe: Template-Referenz auf das Select mitgeben und im Guard
  `select.writeValue(alterWert)` aufrufen (so in Objekt-Detail und
  Dashboard-Zeile).
- **Abgeleitete Zustände gehören in EINE Funktion.** Der Status vererbt sich
  auf die Nachkommen (Entscheid 78) — das muss an allen Erzeugungspfaden
  passieren: kuratierter Seed **und** nachgeladene Vollabdeckung. Beim
  ersten Anlauf war nur der Seed normalisiert, worauf generierte
  Linienführungen unter kuratierten Strecken (BE 35.2 «publiziert» unter
  der geprüften BE 35) quer standen. Jetzt läuft beides über
  `statusVonStreckeErben`.
- **`inject(ElementRef<HTMLElement>)` kompiliert nicht** («Untyped function
  calls may not accept type arguments») — der Typparameter gehört an
  `inject`, nicht an das Token: `inject<ElementRef<HTMLElement>>(ElementRef)`.
- **CDK-Overlays liegen im Top-Layer des Browsers.** Der Overlay-Wrapper
  trägt das native `popover`-Attribut — gegen den Top-Layer gewinnt
  **kein** `z-index`, ein eigenes fixed-Overlay mit `z-[1200]` bleibt
  trotzdem hinter dem Menü. Eigene Overlays, die über einem offenen
  CDK-Menü liegen sollen, müssen selbst per `popover="manual"` +
  `showPopover()` in den Top-Layer (später gezeigt = weiter oben); die
  UA-Styles des Popovers (margin auto, border, background, fit-content)
  sind zurückzusetzen. So gebaut im Umteilen-Kontextmenü des
  Hierarchie-Menüs.
- **Der CDK fokussiert beim Öffnen eines Menüs den ersten Eintrag** —
  mit `focus:bg-accent` sieht der dann wie selektiert aus (im
  Hierarchie-Menü wirkte so die Strecke stets mitmarkiert). Abhilfe:
  nach dem Öffnen die gewünschte Zeile fokussieren (`ivsFokusAktiv` in
  hierarchie-menu.ts, `afterNextRender` + `setTimeout`, nach dem
  CDK-eigenen Fokus).
- **Verschachtelte `hlmDropdownMenuTrigger` sind eine Falle.** Das CDK
  behandelt einen Trigger innerhalb eines offenen Menüs als **Submenü**:
  Es öffnet bereits auf Hover. Zudem wird das Menü-Template im
  **Injector des äusseren Triggers** instanziert — `provideIcons` der
  Komponente, die das Template definiert, greifen dort nicht, und die
  `ng-icon`s bleiben stumm/leer (das «…»-Symbol fehlte deshalb). Lösung im
  Hierarchie-Menü: eigenes fixed-Overlay an der Klickposition (Muster des
  Karten-Kontextmenüs) mit Inline-SVG statt `ng-icon` im Menü-Template.

### 12.7 Deployment (Vercel)

Der Prototyp ist öffentlich erreichbar:

|                 |                                                             |
| --------------- | ----------------------------------------------------------- |
| Produktion      | <https://ivs-prototyp-v3.vercel.app>                        |
| Vercel-Projekt  | `simonjulianwirth-gmailcoms-projects/ivs-prototyp-v3`       |
| Repository      | <https://github.com/Schnitzelbaer/ivs-prototyp-v3> (privat) |
| Node auf Vercel | 24.x                                                        |

**Konfiguration** liegt in `vercel.json`:

- `buildCommand: pnpm build` (entspricht `ng build`, Default-Konfiguration
  ist `production`), `outputDirectory: dist/ivs-prototyp-v3/browser`.
- **SPA-Rewrite** `/(.*)` → `/index.html`. Ohne diesen laufen Deep Links
  wie `/objekt/be-21-1-2` und das separate Kartenfenster `/karte` beim
  direkten Aufruf in einen 404. Vercel prüft zuerst das Dateisystem,
  statische Assets bleiben davon unberührt.
- **Cache-Header** für `/data/*.geojson` (die Geodaten aus `ivs-map` sind
  unveränderlich).

**Auto-Deploy ist aktiv.** Das Repository ist mit dem Vercel-Projekt
verbunden, Produktions-Branch `main`: Jeder Push auf `main` löst einen
Produktions-Deploy aus. Ein Push während eines laufenden Builds bricht diesen
mit `CANCELED` ab und ersetzt ihn — erwartetes Verhalten, kein Fehler. Ein
manueller Deploy bleibt jederzeit möglich:

```bash
vercel --prod
```

Welcher Commit gerade live ist, zeigt `vercel ls ivs-prototyp-v3`.

Sollte die Verbindung je verloren gehen, scheitert `vercel git connect` mit
«Failed to connect … to project» — dann fehlt der Vercel-GitHub-App der
Zugriff auf dieses private Repository. Sie muss einmalig für
`Schnitzelbaer/ivs-prototyp-v3` freigegeben werden, unter
<https://github.com/settings/installations> → Vercel → _Repository access_
oder im Vercel-Dashboard über _Project Settings → Git_. Das ist eine
Berechtigung, die nur der Repository-Eigentümer erteilen kann.

Zum Verifizieren eines Deployments taugt ein reiner Statuscode-Check nicht —
der SPA-Rewrite liefert für **jeden** Pfad 200. Die App selbst muss im
Browser geprüft werden (Objektzahl im Store, Layer-Zuordnung, Konsole).

Verbindlich für die Zusammenarbeit an diesem Projekt.

### 13.1 Stack nicht ohne Rückfrage ändern

Der Stack aus Abschnitt 12 ist gesetzt. **Nicht davon abweichen** — keine
zusätzliche UI-Bibliothek, kein anderes Framework, kein Ersatz für den
ArcGIS-SDK, kein Wechsel des Paketmanagers.

Gibt es einen guten Grund für eine Abweichung, gilt: **zuerst fragen**, mit
Begründung und Alternativen. Erst nach ausdrücklicher Zustimmung umsetzen.
Dasselbe gilt für das Hinzufügen neuer Abhängigkeiten.

### 13.2 Keine neuen Komponenten ohne Rückfrage

Vor dem Bauen einer neuen Komponente ist zu prüfen, ob sich das Gewünschte aus
den vorhandenen 57 spartan/ui-Primitives zusammensetzen lässt — die Kitchen Sink
unter `/kitchen-sink` zeigt alle im Einsatz.

Reicht das nicht, wird die neue Komponente **zuerst vorgeschlagen und
abgestimmt**, nicht einfach gebaut. Zum Vorschlag gehört, warum die vorhandenen
Primitives nicht genügen.

### 13.3 Weitreichende Änderungen vorlegen

Änderungen, die schwer umkehrbar sind oder viele Dateien betreffen, werden
vorgelegt und nicht direkt ausgeführt. Dazu zählen insbesondere:

- Neugenerieren von `libs/ui` oder Wechsel des spartan-Styles
- Wechsel oder grössere Änderung des Themes
- Löschen von Verzeichnissen
- Umbau der Projektstruktur

Recherche, Lesen und das Zusammentragen von Informationen sind davon nicht
betroffen — nur schreibende Schritte am Projekt brauchen ein Ja.

### 13.4 Verifizieren statt annehmen

Ein erfolgreicher Build belegt nicht, dass etwas funktioniert (siehe 12.6).
Sichtbare Änderungen gehören im Browser geprüft, Messwerte statt Schätzungen.

### 13.5 Sprache

Alle Inhalte auf Deutsch in **Schweizer Rechtschreibung** — niemals «ß», immer
«ss». Das gilt für Oberflächentexte, Kommentare, Commit-Nachrichten und
Dokumentation.

### 13.6 Etappen und Verifikation

Bewährt hat sich: in Etappen bauen, jede Etappe **im Browser verifizieren**
und **einzeln committen**, mit deutscher Commit-Nachricht, die den fachlichen
Zweck nennt (nicht die Dateiliste). Zwischen den Etappen wird nicht auf
Freigabe gewartet, ausser eine Entscheidung ist wirklich offen.

**Dokumentation gehört zur Etappe.** Jeder abgestimmte Entscheid wird als
nummerierter Eintrag in 9.8 festgehalten (überholte Entscheide werden
durchgestrichen und mit dem ablösenden Entscheid versehen, nicht
gelöscht), der Stand in 12.5 und der `README.md` nachgeführt und neue
Fallstricke in 12.6 ergänzt — im selben Commit wie der Code.

**Direkt auf `main`.** Es wird ohne Feature-Branch und ohne Pull Request
gearbeitet; nach jedem Commit wird gepusht, was den Vercel-Deploy auslöst
(12.7).

Für grössere Blöcke wurde ein **adversarialer Code-Review** eingesetzt:
mehrere Reviewer prüfen parallel je eine Dimension (Fachlogik,
Angular/spartan-Fallen, ArcGIS/Karte, Sprache und Fachkonsistenz), jeder
Befund wird anschliessend von einem Skeptiker zu widerlegen versucht und nur
bei belegtem, beobachtbarem Fehlverhalten übernommen. Beide Durchgänge
zusammen fanden 20 bestätigte Fehler — die wichtigsten stehen als Lehre in
Abschnitt 12.6.

---

## 14. Nächste Schritte

Stand nach der siebten Ausbaustufe (05.08.2026, Entscheide 79–84);
Reihenfolge als Vorschlag.

1. **Prüfprotokoll ausbauen (Abschnitt 4.6).** Der Fragenteil ist gebaut
   (Entscheid 75, Katalog der Review-Vorlage statt Checkliste 1). Offen
   bleiben: das **eigene Protokoll der Fachlichen Prüfstelle** (R-07
   sieht heute einen Platzhalter, Entscheid 76 — Inhalt wird noch
   spezifiziert), der **Umsetzungsvermerk der Inventarisierenden**
   (welche Befunde umgesetzt, Abweichungen begründet), freie Befunde für
   Kartenkorrekturen und das Verhältnis zum «Prüfregister QS»
   (Abschnitt 10).
2. **Manuelle Prüfung der Karten-Interaktionen.** Hover-MapTip, Direktklick,
   Kontextmenü und Pin-Klick sind inzwischen end-to-end mit synthetischen
   Pointer-Events verifiziert (identischer Event-Pfad wie echte Eingabe);
   Geometrie-Zeichnen bleibt nur skriptbasiert geprüft — ein Durchgang mit
   echter Maus schadet weiterhin nicht. Dabei auch prüfen, ob der
   Trefferradius von 8 px (Entscheid 46) in der Praxis passt.
3. **Nebenblöcke** als einfache Screens: Accounts/Rollen (R-02),
   Reports (12.01–12.04), Arbeitspakete-Rest (Einsatzlisten 03.04 —
   die Zuweisung selbst ist mit Entscheid 77 gebaut).
4. **Tablet-Durchgang** bei 768 px über die neuen Seiten (Kommentar-Panel,
   Geometrie-Werkzeuge, Stammdaten-Tabelle) — die Touch-Vergrösserung aus
   Abschnitt 9.6 greift automatisch, das Layout ist aber ungeprüft.
5. **`hlmField` im Formular** (offener Punkt aus dem spartan-Review):
   37 handgebaute `grid gap-1.5`-Feldgruppen und 57 Beschreibungsabsätze
   liessen sich auf `hlmField` / `hlmFieldLabel` / `hlmFieldDescription`
   umstellen; die Pflichtbegründung bei «inexistent» hat bis heute kein
   `hlm-field-error`, nur ein handgeschriebenes `*`. Grosser Diff, geringe
   optische Wirkung.
6. **Performance der Vollabdeckung**, falls sie störend wird: Virtualisierung
   der langen Listen oder Debouncing der localStorage-Persistenz (12.6).

**Wo es weitergeht.** `pnpm start`, dann `/dashboard` — oder direkt
<https://ivs-prototyp-v3.vercel.app>. Die Rolle wechselt man im
**Account-Menü unten links** (Button mit der Rollen-Nummer, Rolle gilt
pro Tab); als R-03 erscheint zusätzlich die Stammdatenverwaltung.
«Demodaten zurücksetzen» liegt im selben Menü — nötig nach jeder Änderung
an den Seed-Daten, sonst zeigt der Browser den alten Stand (oder
`SEED_VERSION` erhöhen).

**Der Kern-Workflow zum Durchspielen** (jeweils Rolle im Account-Menü
wechseln, oder `?rolle=R-06` an die URL hängen — die Rolle gilt pro Tab):

1. **R-03** weist im Dashboard einen Kanton der Regionalen Koordination
   zu (persistent, ohne Statuswechsel — die Objekte bleiben «Offen»
   bzw. in ihrem Status).
2. **R-04** weist im Dashboard über die Zuständig-Spalte (oder per
   Multi-Edit für mehrere gewählte Strecken) einer Inventarisierenden
   zu → erst jetzt stehen die Strecken auf «Zugewiesen». Wo die
   Arbeit einer Person liegt, zeigt der Filter «Zuständige Person».
3. **R-05** (B. Anderegg) nimmt BE 21 in Bearbeitung, bearbeitet den
   Beschrieb und gibt die Strecke «Bereit zur Prüfung».
4. **R-06** (M. Gerber) setzt «In Prüfung», öffnet «Prüfung», beantwortet
   den Katalog — bei einem Nein mit Begründung geht die Strecke mit
   Kommentaren zurück in «Korrektur», sonst auf «Geprüft».
5. **R-03** gibt frei und publiziert; **R-07** kommentiert und darf
   ebenfalls publizieren.

Zum Anschauen ohne Zuweisen eignet sich BE 22 (steht auf «In Prüfung»,
zuständig M. Gerber) — dort ist der Prüfungs-Knopf sofort sichtbar.
