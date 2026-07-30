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
> (abgestimmte Detailentscheide), 12.4 (Projektstruktur und Persistenz),
> 12.5 (was gebaut ist), 12.6 (Fallstricke) und 14 (nächste Schritte).
>
> **Stand:** 30.07.2026, dritte Ausbaustufe. Repository auf `main`.

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

### 4.7 Checkliste 1

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
zugewiesen
  → in_bearbeitung
      → bereit_zur_pruefung
          → in_pruefung
              → korrektur ──┐ (zurück zu in_bearbeitung)
              → geprueft    │
                  → freigegeben
                      → publiziert
```

Deutsche Bezeichnungen: Zugewiesen · In Bearbeitung · Bereit zur Prüfung ·
In Prüfung · Korrektur · Geprüft · Freigegeben · Publiziert

Zusätzlich das orthogonale Kennzeichen **nicht-existent** (mit Pflicht-Begründung,
siehe 07.16).

Zuständigkeiten pro Übergang (aus den Rollen abgeleitet):

- **R-05 Inventarisierende** bearbeiten in `zugewiesen`, `in_bearbeitung`,
  `korrektur` und übergeben an die Prüfung
- **R-06 Fachlektorat** bearbeitet in `bereit_zur_pruefung`, `in_pruefung`,
  setzt `geprueft` oder weist nach `korrektur` zurück
- **R-07 Fachliche Prüfstelle** kommentiert, prüft übergreifend
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
5. Wählbar sind die **fünf fachlich relevanten Rollen** R-03 bis R-07. R-01,
   R-02 und R-08 werden aufgelistet, aber **disabled**.

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
    plus Geometrie-Overlay alt/neu auf der Karte.
11. **Prüfregister:** frei zu entwerfen — für die in der Story Map erwähnte
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

18. **Stati:** Die acht Stati aus Abschnitt 7 werden geführt; fürs Dashboard
    werden sie auf drei Gruppen gemappt — `zugewiesen` → Backlog ·
    `in_bearbeitung`, `bereit_zur_pruefung`, `in_pruefung`, `korrektur` →
    In Arbeit · `geprueft`, `freigegeben`, `publiziert` → Done. Ein Objekt gilt
    als «in Arbeit», solange es im Prozess unterwegs ist, unabhängig davon,
    welche Rolle gerade am Zug ist.
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
24. **Rollenabhängigkeit ist echt:** Jede Rolle hat eigene Dashboard-Stati und
    eigene Edit-Rechte; die Statusübergänge sind je Rolle definiert. Löschen
    ist R-05 (in ihren Bearbeitungsstati) und R-03 vorbehalten.
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
  quer zu einer Single-Page-Werkbank. Für das Prototyping ist zu entscheiden, ob
  das als zweites Browserfenster, als abkoppelbares Panel oder als
  Split-View umgesetzt wird.

---

## 11. Quellen

| Quelle                                                        | Pfad / URL                                                    |
| ------------------------------------------------------------- | ------------------------------------------------------------- |
| Detailspezifikation                                           | `~/Downloads/Detailspezifikation_IVS_IT_Fachapplikation.docx` |
| User Story Map (überarbeitete Fassung, eingelesen 28.07.2026) | `~/Downloads/IVS User Story Map.pdf`                          |
| Objektbeschrieb Strecke (VS 1, 19 Seiten)                     | `~/Downloads/Strecke.pdf`                                     |
| Objektbeschrieb Linienführung (VS 1.2)                        | `~/Downloads/Linienführung.pdf`                               |
| Objektbeschrieb Abschnitt (VS 1.2.14)                         | `~/Downloads/Abschnitt.pdf`                                   |
| Testdaten und Referenz-Kartenimplementation                   | `/Users/wis/claude/ivs-map`                                   |
| Älterer Prototyp (begrenzte Inspiration)                      | <https://ivs-prototyp-variant-b.vercel.app/>                  |
| Repository                                                    | <https://github.com/Schnitzelbaer/ivs-prototyp-v3> (privat)   |

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
docs/            Fachkontext (dieses Dokument) und Story-Map-PDF
libs/ui/         57 generierte spartan/ui-Primitives
public/data/     Geodaten (Kopien aus ivs-map)
src/styles.css   Theme-Tokens (inkl. --status-*), Touch-Regeln
src/app/
  app.routes.ts        Routen inkl. Guard für /stammdaten (nur R-03)
  core/                Modell, Stati, Rollen, Seed-Daten, Stores
    model.ts           IvsObjekt, Ebene, WorkflowStatus, Bewertung, idAusSignatur
    status.ts          Status-Labels, -Farben, Gruppen-Mapping, Übergänge je Rolle
    rollen.ts          Rollen mit dashboardStati und editStati, darfEditieren
    seed-data.ts       46 kuratierte Mock-Objekte, NAME_FUER_ROLLE, SEED_VERSION
    objekt-generierung.ts  Vollabdeckung: generierte Objekte + Feature-Zuordnung
    objekt-store.ts    Objekte, statusWechseln, ergänzt generierte idempotent
    einstellungen-store.ts  aktive Rolle, Dark-Mode
    kommentare.ts      Kommentar-Modell, parseKommentarText, jetztLokal, Store
    attribute.ts       Registry der #-referenzierbaren Attribute mit Ankern
    geometrie-store.ts Arbeitsgeometrien je Signatur
    begehungen.ts      Begehungsplanung
    stammdaten.ts      Auswahllisten DE/FR/IT
  shell/               Icon-Leiste, Rollenmenü hinter dem IVS-Logo, Toaster
  dashboard/           Aufgabenliste + Kartenpanel + Kommentare
  objekte/             Kartenansicht mit dezenter Liste und Side-Panel
  objekt/              Objektbearbeitung
    objekt-detail.*    Formular, Hierarchie, Statusfluss, Dialoge
    text-editor.ts     Rich-Text-Editor (contenteditable, 07.17)
    bewertungs-punkte.ts  Punkteskala 0–4
  karte/               ArcGIS-Komponente und Umfeld
    karte.ts           View, Layer, Selektion/Highlight, MapTip, Kontextmenü,
                       Geometrie-Editing, Pins
    karten-layer.ts    Layer-/Basemap-/Overlay-Definitionen, Objekt-Anreicherung
    karte-fenster.ts   eigenständiges Kartenfenster /karte
    karte-sync.ts      BroadcastChannel-Synchronisation
    objekt-geo.ts      Bbox und Dufour-Situierungsbild (WMS)
  kommentare/          Kommentar-Panel (Threads, @/#, Filter)
  panorama/            360°-Galerie, Viewer, Begehungsplanung
  stammdaten/          Auswahllisten-Verwaltung (R-03)
  kitchen-sink/        Referenzseite, ein Abschnitt je Themengruppe
```

**Zustand und Persistenz.** Alle Stores sind `providedIn: 'root'`, halten ihren
Zustand in Signals und spiegeln ihn per `effect` in den localStorage:

| Schlüssel                       | Inhalt                        | Version                           |
| ------------------------------- | ----------------------------- | --------------------------------- |
| `ivs-prototyp-v3.objekte`       | Objekte samt Lognotizen       | `SEED_VERSION` in `seed-data.ts`  |
| `ivs-prototyp-v3.kommentare`    | Kommentare und Antworten      | Konstante in `kommentare.ts`      |
| `ivs-prototyp-v3.geometrien`    | Arbeitsgeometrien je Signatur | Konstante in `geometrie-store.ts` |
| `ivs-prototyp-v3.begehungen`    | geplante Begehungen           | Konstante in `begehungen.ts`      |
| `ivs-prototyp-v3.stammdaten`    | Auswahllisten                 | Konstante in `stammdaten.ts`      |
| `ivs-prototyp-v3.einstellungen` | aktive Rolle, Dark-Mode       | —                                 |

Passt die gespeicherte Version nicht zur Konstante, wird der Stand verworfen
und neu geseedet. **Nach jeder Seed-Änderung die Version erhöhen**, sonst
sehen bestehende Browser die Änderung nie. «Demodaten zurücksetzen» im
Profil-Popover leert alle Stores auf einmal.

**Geometrie-Zuordnung.** Die Mock-Objekte haben keine eigenen Geodaten:
`core/objekt-generierung.ts` leitet zur Laufzeit aus den drei Quelldateien
(Routen, Teilsegmente, Punktobjekte) sowohl die generierten Objekte als auch
die vollständige Zuordnung Feature → Signatur ab (Cache pro Sitzung).
`karten-layer.ts` stempelt die Attribute beim Laden auf die Features und
speist die Layer aus einer Blob-URL; die kuratierten Zuordnungen der fünf
Seed-Strecken sind dort als Tabellen hinterlegt. Das Dufour-Situierungsbild
(`objekt-geo.ts`) nutzt dieselbe Anreicherung.

### 12.5 Stand der Arbeit

Gebaut ist die **dritte Ausbaustufe des Kern-Workflows** (Stand 30.07.2026):

- **Shell** mit verstecktem Rollenmenü (Klick aufs IVS-Logo; R-03…R-07
  wählbar, R-01/R-02/R-08 aufgeführt aber gesperrt), Dark-Mode, Profil mit
  «Demodaten zurücksetzen», Sprachwechsler als Attrappe.
- **Dashboard (04)**: je Rolle vorgefilterte Aufgaben, gruppiert
  Backlog / In Arbeit / Done (Mapping der acht Stati: zugewiesen → Backlog ·
  in Bearbeitung, Korrektur, bereit zur Prüfung, in Prüfung → In Arbeit ·
  geprüft, freigegeben, publiziert → Done), Suche, Schnellfilter,
  Inline-Statuswechsel gemäss Rollenrechten, Polygon-Selektion als
  geographischer Filter (05.03).
- **Objektbearbeitung (07)**: View-/Edit-Modus mit automatischem Speichern
  und Rechteprüfung je Rolle × Status; Formular mit Eckdaten (inkl.
  Dufour-Situierungsausschnitt via swisstopo-WMS), NHG-Bewertung (drei
  Punkteskalen 0–4, Ø angezeigt), Empfehlungen, Geschichte & Gelände
  (3000-Zeichen-Limite), Anhang, Prüfen/Freigabe, Inexistent (07.16, mit
  Pflichtbegründung), Lognotizen; Hierarchie-Dropdown (Strecke → LF →
  Abschnitt, Wegbegleiter) zum Objektwechsel; Statusübergänge je Rolle mit
  automatischem Logeintrag; Bearbeitungslog als Sheet; Löschen mit
  Warndialog (07.05, gesperrt nach Publikation).
- **Karte**: ArcGIS Maps SDK mit swisstopo-WMTS und den Layern aus
  `ivs-map` — die Objekte liegen AUF diesen Layern (Anreicherung beim
  Laden, Entscheid 40), keine eigenen Objekt-Layer. Selektion mit
  SDK-Highlight, Abblendung und Zoom; Hover-MapTip mit der Hierarchie der
  getroffenen Objekte; Klick öffnet direkt, Kontextmenü nur bei mehreren
  echt verschiedenen Objekten (Entscheid 41). Punktobjekte einheitlich
  rot, Grenzmarken-Legende als Linienformen (Entscheid 43). Separates
  Kartenfenster `/karte` mit bidirektionaler Synchronisation über
  BroadcastChannel (Selektion hin, Objekt-Klick zurück).
- **Mock-Daten**: 46 kuratierte Objekte im Testgebiet Bern — BE 7
  (Murtenstrasse, publiziert/freigegeben), BE 21 (Frauenkappelen–Gümmenen,
  in Arbeit, enthält alle Wegoberflächen-Routen), BE 22 (Wohleistrasse, in
  Prüfung), BE 23 (Kirchweg, Backlog), BE 35 (Freiburgstrasse, geprüft) —
  plus generierte **Vollabdeckung** aller Testgeometrien (Entscheid 44):
  insgesamt ~2565 Objekte (403 Strecken, 862 Linienführungen, 1124
  Abschnitte, 176 Wegbegleiter), generierte im Status «publiziert» mit aus
  `ivs_signatur` abgeleiteter Bedeutung/Substanz und Wegbegleiter-Namen aus
  dem `easyocr`-Feld. Persistenz im localStorage (~2.6 MB), `SEED_VERSION`
  erhöhen verwirft Stände.
- **Objekte-Übersicht (04.01)** unter `/objekte`: Kartenansicht — Karte im
  Vordergrund, links eine dezente Objektliste mit Suche und Filtern, ein
  Klick öffnet rechts das Side-Panel mit dem Objektinhalt.
- **360°-Aufnahmen (06, Vorgabe 9)** unter `/panorama`: Galerie der
  Befahrung mit drehbarem Platzhalter-Panorama (generierte, nahtlose SVGs),
  Vor-/Zurück-Navigation, Karte mit Standortpunkt und live mitdrehendem
  Blickrichtungskegel (07.08); dazu die **Begehungsplanung** — Reihenfolge
  der Objekte, Verkehrsmittel, Unterkunft, Zeitbedarf — auch direkt aus der
  Objektbearbeitung.
- **Kommentare (09/10)**: Panel mit Threads, Antworten, Erledigt-
  Kennzeichnung (10.02), Suche, Sortierung, Filtern; `@`-Erwähnungen
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

Noch nicht gebaut: Prüfprotokoll/Checkliste 1 (Etappe folgt),
Versionsvergleich, Nebenblöcke (Accounts, Arbeitspakete, Reports).

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
- **Vollabdeckung hat Kosten:** ~2565 Objekte bedeuten ~2.6 MB localStorage
  (Persistenz-Effect serialisiert bei jeder Änderung) und Dashboard-Gruppen
  mit Tausenden Zeilen (~100 ms pro Gruppen-Toggle bei R-03). Für den
  Prototyp akzeptiert; bei spürbarer Trägheit wäre Virtualisierung oder
  Debouncing der Persistenz der nächste Hebel.

---

## 13. Arbeitsweise und Leitplanken

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

Für grössere Blöcke wurde ein **adversarialer Code-Review** eingesetzt:
mehrere Reviewer prüfen parallel je eine Dimension (Fachlogik,
Angular/spartan-Fallen, ArcGIS/Karte, Sprache und Fachkonsistenz), jeder
Befund wird anschliessend von einem Skeptiker zu widerlegen versucht und nur
bei belegtem, beobachtbarem Fehlverhalten übernommen. Beide Durchgänge
zusammen fanden 20 bestätigte Fehler — die wichtigsten stehen als Lehre in
Abschnitt 12.6.

---

## 14. Nächste Schritte

Stand nach der zweiten Ausbaustufe (30.07.2026); Reihenfolge als Vorschlag.

1. **Prüfprotokoll / Checkliste 1 (Abschnitt 4.6/4.7).** Der grösste noch
   offene Fachblock: neun binäre Prüffragen mit Kommentarfeld bei «nicht
   erfüllt», freie Befunde für Kartenkorrekturen, Umsetzungsvermerk der
   Inventarisierenden und begründete Abweichungen — integriert im
   Objektbeschrieb, nicht als separates Dokument. Abschnitt «Prüfen /
   Freigabe» im Formular ist der vorgesehene Ort; das Verhältnis zum
   «Prüfregister QS» (Abschnitt 10) bleibt zu klären.
2. **Versionsvergleich (08.05, Vorgabe 10).** Text-Diff mit
   Änderungsmarkierungen plus Geometrie-Overlay alt/neu; der Einstieg
   existiert bereits als deaktivierter Eintrag im Historie-Menü.
3. **Manuelle Prüfung der Karten-Interaktionen.** Hover-MapTip, Direktklick,
   Kontextmenü und Pin-Klick sind inzwischen end-to-end mit synthetischen
   Pointer-Events verifiziert (identischer Event-Pfad wie echte Eingabe);
   Geometrie-Zeichnen bleibt nur skriptbasiert geprüft — ein Durchgang mit
   echter Maus schadet weiterhin nicht.
4. **Nebenblöcke** als einfache Screens: Accounts/Rollen (R-02),
   Arbeitspakete (03.01–03.04), Reports (12.01–12.04).
5. **Tablet-Durchgang** bei 768 px über die neuen Seiten (Kommentar-Panel,
   Geometrie-Werkzeuge, Stammdaten-Tabelle) — die Touch-Vergrösserung aus
   Abschnitt 9.6 greift automatisch, das Layout ist aber ungeprüft.

**Wo es weitergeht.** `pnpm start`, dann `/dashboard`. Die Rolle wechselt man
über einen Klick auf das **IVS-Logo** oben links; als R-03 erscheint zusätzlich
die Stammdatenverwaltung. «Demodaten zurücksetzen» liegt im Profil-Popover
unten links.
