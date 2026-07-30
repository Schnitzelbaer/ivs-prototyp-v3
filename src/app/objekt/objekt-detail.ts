import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft,
  lucideArrowRight,
  lucideBookOpen,
  lucideCalendarPlus,
  lucideCamera,
  lucideCheck,
  lucideChevronDown,
  lucideDownload,
  lucideExternalLink,
  lucideHistory,
  lucideImagePlus,
  lucideMagnet,
  lucideMapPin,
  lucideMerge,
  lucideMessageSquarePlus,
  lucidePencil,
  lucidePlus,
  lucideScissors,
  lucideSpline,
  lucideTrash2,
  lucideTriangleAlert,
  lucideUpload,
} from '@ng-icons/lucide';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmAlertDialogImports } from '@spartan-ng/helm/alert-dialog';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCollapsibleImports } from '@spartan-ng/helm/collapsible';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmNativeSelectImports } from '@spartan-ng/helm/native-select';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { EinstellungenStore } from '../core/einstellungen-store';
import { HinweisStore } from '../core/hinweis-store';
import { KommentarStore, jetztLokal } from '../core/kommentare';
import {
  BewertungsTeil,
  EBENE_LABEL,
  IvsObjekt,
  NHG_LABEL,
  RolleId,
  SUBSTANZGRAD_LABEL,
  WorkflowStatus,
  bewertungText,
} from '../core/model';
import { ObjektStore } from '../core/objekt-store';
import { ROLLEN, darfEditieren } from '../core/rollen';
import { NAME_FUER_ROLLE, rolleFuerStatus } from '../core/seed-data';
import { StammdatenStore } from '../core/stammdaten';
import {
  STATUS_FARBE,
  STATUS_LABEL,
  StatusUebergang,
  nachbarStati,
  rollenFuerUebergang,
  uebergaengeFuer,
} from '../core/status';
import { Karte, KartenSelektion } from '../karte/karte';
import { KarteSync } from '../karte/karte-sync';
import { ObjektGeo } from '../karte/objekt-geo';
import { KommentarPanel } from '../kommentare/kommentar-panel';
import { BegehungDialog } from '../panorama/begehung-dialog';
import { BewertungsPunkte } from './bewertungs-punkte';
import { HierarchieMenu } from './hierarchie-menu';
import { TextEditor } from './text-editor';

type BewertungsSchluessel = 'geschichte' | 'morphologie' | 'substanzwert';

/**
 * Objektbearbeitung (07): Formular links, Karte rechts. View-Modus als
 * Lese-Ansicht, Edit-Modus mit automatischem Speichern in den Store.
 * Die Hierarchie hinter dem Chevron neben dem Titel wechselt zwischen
 * Parent- und Child-Objekten — der Modus bleibt dabei erhalten, die
 * Kartenselektion folgt.
 */
@Component({
  selector: 'ivs-objekt-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    NgIcon,
    HlmAlertDialogImports,
    HlmBadgeImports,
    HlmButtonImports,
    HlmCollapsibleImports,
    HlmDialogImports,
    HlmDropdownMenuImports,
    HlmEmptyImports,
    HlmInputImports,
    HlmLabelImports,
    HlmNativeSelectImports,
    HlmSheetImports,
    HlmTabsImports,
    HlmTextareaImports,
    HlmTooltipImports,
    BegehungDialog,
    BewertungsPunkte,
    HierarchieMenu,
    Karte,
    KommentarPanel,
    TextEditor,
  ],
  providers: [
    provideIcons({
      lucideArrowLeft,
      lucideArrowRight,
      lucideBookOpen,
      lucideCalendarPlus,
      lucideCamera,
      lucideCheck,
      lucideChevronDown,
      lucideDownload,
      lucideExternalLink,
      lucideHistory,
      lucideImagePlus,
      lucideMagnet,
      lucideMapPin,
      lucideMerge,
      lucideMessageSquarePlus,
      lucidePencil,
      lucidePlus,
      lucideScissors,
      lucideSpline,
      lucideTrash2,
      lucideTriangleAlert,
      lucideUpload,
    }),
  ],
  templateUrl: './objekt-detail.html',
})
export class ObjektDetail implements OnDestroy {
  private readonly store = inject(ObjektStore);
  private readonly router = inject(Router);
  private readonly sync = inject(KarteSync);
  private readonly geo = inject(ObjektGeo);
  private readonly kommentarStore = inject(KommentarStore);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly stammdaten = inject(StammdatenStore);
  private readonly hinweis = inject(HinweisStore);
  protected readonly einstellungen = inject(EinstellungenStore);

  protected readonly karte = viewChild(Karte);

  readonly id = input.required<string>();

  protected readonly statusLabel = STATUS_LABEL;
  protected readonly statusFarbe = STATUS_FARBE;
  protected readonly nhgLabel = NHG_LABEL;
  protected readonly substanzLabel = SUBSTANZGRAD_LABEL;
  protected readonly ebeneLabel = EBENE_LABEL;
  protected readonly bewertungText = bewertungText;

  protected readonly objekt = computed(() => this.store.byId(this.id()));

  /** Gewünschter Modus; effektiv nur, wenn die Rolle bearbeiten darf. */
  private readonly gewuenschterModus = signal<'view' | 'edit'>('view');

  protected readonly darfBearbeiten = computed(() => {
    const o = this.objekt();
    return !!o && darfEditieren(this.einstellungen.aktiveRolleId(), o.status);
  });

  /**
   * Löschen (07.05): den Inventarisierenden (R-05) in ihren Bearbeitungs-
   * stati sowie der Fachlichen Administration (R-03) vorbehalten; nach der
   * Publikation generell gesperrt.
   */
  protected readonly darfLoeschen = computed(() => {
    const o = this.objekt();
    if (!o || o.status === 'publiziert') return false;
    const rolle = this.einstellungen.aktiveRolleId();
    if (rolle === 'R-03') return true;
    return rolle === 'R-05' && darfEditieren(rolle, o.status);
  });

  protected readonly istEdit = computed(
    () => this.gewuenschterModus() === 'edit' && this.darfBearbeiten(),
  );

  protected readonly selektion = computed<KartenSelektion | null>(
    () => {
      const o = this.objekt();
      return o ? { ebene: o.ebene, signatur: o.signatur } : null;
    },
    // Formular-Edits erzeugen pro Tastendruck eine neue Objektreferenz —
    // ohne Wertvergleich würde jede Eingabe Karten-goTo und Broadcast auslösen
    { equal: (a, b) => a?.signatur === b?.signatur && a?.ebene === b?.ebene },
  );

  /** 360°-Aufnahmen liegen im Prototyp entlang von BE 7.2 (07.08). */
  protected readonly hat360Aufnahmen = computed(() => {
    const o = this.objekt();
    return !!o && (o.signatur === 'BE 7' || o.signatur.startsWith('BE 7.2'));
  });

  /**
   * Objektarten der Wegbegleiter aus den Stammdaten (02.01); ein auf dem
   * Objekt gespeicherter, inzwischen deaktivierter Wert bleibt wählbar.
   */
  protected readonly wegbegleiterTypen = computed(() => {
    const werte = this.stammdaten.aktiveWerte('wegbegleiter-typen');
    const aktuell = this.objekt()?.wegbegleiterTyp;
    return aktuell && !werte.includes(aktuell) ? [aktuell, ...werte] : werte;
  });

  protected readonly uebergaenge = computed<StatusUebergang[]>(() => {
    const o = this.objekt();
    if (!o) return [];
    return uebergaengeFuer(this.einstellungen.aktiveRolleId(), o.status);
  });

  /**
   * Einträge des Status-Dropdowns in der Kopfzeile: der jeweils nächste und
   * vorherige Status der Workflow-Kette. Nicht erlaubte Übergänge erscheinen
   * ebenfalls — der Klick erklärt dann im Modal, wem der Schritt vorbehalten
   * ist (nie-disabled-Regel).
   */
  protected readonly statusWahl = computed(() => {
    const o = this.objekt();
    if (!o) return [];
    const erlaubteZiele = new Set(this.uebergaenge().map((u) => u.nach));
    const { weiter, zurueck } = nachbarStati(o.status);
    return [
      ...weiter.map((status) => ({
        status,
        richtung: 'weiter' as const,
        erlaubt: erlaubteZiele.has(status),
      })),
      ...zurueck.map((status) => ({
        status,
        richtung: 'zurueck' as const,
        erlaubt: erlaubteZiele.has(status),
      })),
    ];
  });

  protected readonly statusOptionen = computed(() => {
    const o = this.objekt();
    if (!o) return [];
    return [
      { wert: o.status, label: STATUS_LABEL[o.status] },
      ...this.uebergaenge().map((u) => ({ wert: u.nach, label: STATUS_LABEL[u.nach] })),
    ];
  });

  protected readonly situierungsUrl = signal<string | null>(null);
  protected readonly inexistentBegruendung = signal('');
  protected readonly neueLognotiz = signal('');
  protected readonly logOffen = signal(false);
  protected readonly loeschenDialogOffen = signal(false);
  protected readonly inexistentDialogOffen = signal(false);

  /** Aktiver Tab des Kartenpanels — wechselbar auch programmatisch (Pin-Klick). */
  protected readonly kartenTab = signal('karte');
  protected readonly kommentarModusAktiv = computed(() => this.karte()?.kommentarModus() ?? false);

  // Geometrie-Editing (05.05)
  protected readonly geometrieModus = signal(false);
  protected readonly geometrieAnzahl = signal(0);
  private geometrieGeaendertFlag = false;
  protected readonly editWerkzeug = computed(() => this.karte()?.editWerkzeug() ?? null);
  protected readonly editAuswahl = computed(() => this.karte()?.editAuswahlAnzahl() ?? 0);
  protected readonly snappingAn = computed(() => this.karte()?.snappingAn() ?? true);

  // Quellen (07.18)
  protected readonly quellenOffen = signal(false);
  protected readonly quellen = signal<QuellenTreffer[]>([]);

  // Begehung planen (aus der Detailansicht, Objekt vorausgewählt)
  protected readonly begehungOffen = signal(false);

  // Dialog «Kommentar auf Karte» (05.11)
  protected readonly kartenKommentarOffen = signal(false);
  protected readonly kartenKommentarPosition = signal<{ lon: number; lat: number } | null>(null);
  protected readonly kartenKommentarTitel = signal('');
  protected readonly kartenKommentarText = signal('');
  protected readonly kartenKommentarZuweisung = signal('');

  /** Die drei Teile der NHG-Bewertung mit ihren Hinweistexten. */
  protected readonly bewertungsTeile: readonly {
    schluessel: BewertungsSchluessel;
    titel: string;
    hinweis: string;
  }[] = [
    {
      schluessel: 'geschichte',
      titel: 'Geschichte',
      hinweis: 'Verkehrshistorischer und allgemein historischer Wert.',
    },
    {
      schluessel: 'morphologie',
      titel: 'Morphologie',
      hinweis:
        'Landschaftsqualität, Anzahl Kunstbauten und Wegbegleiter, Seltenheit, Erhaltungszustand.',
    },
    {
      schluessel: 'substanzwert',
      titel: 'Substanzwert',
      hinweis: 'Wegform/Wegbegrenzung, Wegbreite, Wegoberfläche.',
    },
  ];

  constructor() {
    // Kartenselektion an das separate Kartenfenster melden
    effect(() => {
      this.sync.setzeSelektion(this.selektion());
    });

    // Situierungsbild (Dufourkarte) beim Objektwechsel nachladen — getrackt
    // wird nur die Selektion (mit Wertvergleich), nicht die Objektreferenz,
    // sonst würde jeder Formular-Tastendruck das Bild neu aufbauen
    effect(() => {
      const auswahl = this.selektion();
      untracked(() => this.situierungsUrl.set(null));
      if (!auswahl) return;
      void this.geo.situierungsBild(auswahl.ebene, auswahl.signatur).then((url) => {
        // nur setzen, wenn das Objekt inzwischen nicht gewechselt hat
        if (untracked(() => this.objekt())?.signatur === auswahl.signatur)
          this.situierungsUrl.set(url);
      });
    });
  }

  ngOnDestroy(): void {
    this.sync.setzeSelektion(null);
  }

  // ------------------------------------------------------------------ Modus

  protected modusUmschalten(): void {
    if (!this.darfBearbeiten()) {
      this.bearbeitenHinweis();
      return;
    }
    // Beim Abschliessen der Bearbeitung auch den Geometrie-Modus sauber
    // beenden (inkl. Protokoll/Toast) — sein Werkzeug lebt nur im Edit-Modus.
    if (this.istEdit() && this.geometrieModus()) this.geometrieModusUmschalten();
    this.gewuenschterModus.set(this.istEdit() ? 'view' : 'edit');
  }

  /** Modal, warum die Bearbeitung mit Rolle × Status gerade nicht möglich ist. */
  private bearbeitenHinweis(): void {
    const o = this.objekt();
    if (!o) return;
    const zustaendig = rolleFuerStatus(o.status);
    this.hinweis.zeige(
      'Bearbeitung nicht möglich',
      `Im Status «${STATUS_LABEL[o.status]}» kann die Rolle «${this.einstellungen.aktiveRolle().name}» ` +
        `dieses Objekt nicht bearbeiten. Am Zug ist: ${rollenName(zustaendig)}.`,
    );
  }

  // ------------------------------------------------------------- Formularwerte

  protected patch(patch: Partial<IvsObjekt>): void {
    const o = this.objekt();
    if (o) this.store.update(o.id, patch);
  }

  protected patchBewertung(
    schluessel: BewertungsSchluessel,
    aenderung: Partial<BewertungsTeil>,
  ): void {
    const o = this.objekt();
    if (!o) return;
    this.store.update(o.id, {
      bewertung: { ...o.bewertung, [schluessel]: { ...o.bewertung[schluessel], ...aenderung } },
    });
  }

  // ------------------------------------------------------------------ Status

  protected statusSetzen(status: string): void {
    const o = this.objekt();
    if (!o || status === o.status) return;
    const rolle = this.einstellungen.aktiveRolleId();
    this.store.statusWechseln(o.id, status as WorkflowStatus, NAME_FUER_ROLLE[rolle], rolle);
    toast.success(`Status gewechselt: ${STATUS_LABEL[status as WorkflowStatus]}`, {
      description: `${o.signatur} — Übergang protokolliert.`,
    });
  }

  /** Auswahl im Status-Dropdown: ausführen oder im Modal erklären. */
  protected statusWaehlen(eintrag: { status: WorkflowStatus; erlaubt: boolean }): void {
    const o = this.objekt();
    if (!o) return;
    if (eintrag.erlaubt) {
      this.statusSetzen(eintrag.status);
      return;
    }
    const berechtigt = rollenFuerUebergang(o.status, eintrag.status);
    this.hinweis.zeige(
      'Statuswechsel nicht möglich',
      `Der Wechsel von «${STATUS_LABEL[o.status]}» zu «${STATUS_LABEL[eintrag.status]}» ist mit der ` +
        `Rolle «${this.einstellungen.aktiveRolle().name}» nicht möglich. ` +
        (berechtigt.length
          ? `Vorgesehen ist dieser Schritt für: ${berechtigt.map(rollenName).join(', ')}.`
          : 'Dieser Rückschritt ist im Workflow nicht vorgesehen — zurück führt der Weg über die Korrektur.'),
    );
  }

  // ------------------------------------------------------------- Aktionen

  /** Löschen-Klick: Dialog öffnen oder im Modal erklären, warum nicht (07.05). */
  protected loeschenKlick(): void {
    const o = this.objekt();
    if (!o) return;
    if (this.darfLoeschen()) {
      this.loeschenDialogOffen.set(true);
      return;
    }
    this.hinweis.zeige(
      'Löschen nicht möglich',
      o.status === 'publiziert'
        ? `${o.signatur} ist publiziert. Publizierte Objekte sind Teil des rechtsverbindlichen ` +
            'Inventars und können nicht mehr gelöscht werden (07.05).'
        : 'Löschen ist den Inventarisierenden (R-05) in ihren Bearbeitungsstati und der ' +
            'Fachlichen Administration (R-03) vorbehalten.',
    );
  }

  protected loeschen(): void {
    const o = this.objekt();
    if (!o || !this.darfLoeschen()) return;
    this.loeschenDialogOffen.set(false);
    this.store.loeschen(o.id);
    toast.success(`${o.signatur} gelöscht`, { description: `${o.name} wurde entfernt (07.05).` });
    void this.router.navigate(['/dashboard']);
  }

  /** Versionsvergleich (08.05) ist noch nicht gebaut — erklären statt sperren. */
  protected versionsvergleichHinweis(): void {
    this.hinweis.zeige(
      'Versionsvergleich folgt',
      'Der Versionsvergleich (08.05) ist im Prototyp noch nicht umgesetzt und folgt in einer späteren Etappe.',
    );
  }

  /** «Als geprüft kennzeichnen» (09.02): ausführen oder im Modal erklären. */
  protected geprueftKennzeichnen(): void {
    const o = this.objekt();
    if (!o) return;
    const rolle = this.einstellungen.aktiveRolleId();
    if (rolle !== 'R-06' || o.status !== 'in_pruefung') {
      this.hinweis.zeige(
        'Kennzeichnen nicht möglich',
        rolle !== 'R-06'
          ? 'Nur das Fachlektorat (R-06) kennzeichnet Objekte als geprüft (09.02).'
          : `Möglich ist das nur im Status «In Prüfung» — aktuell steht das Objekt auf ` +
              `«${STATUS_LABEL[o.status]}».`,
      );
      return;
    }
    this.statusSetzen('geprueft');
  }

  protected inexistentKlick(): void {
    if (!this.darfBearbeiten()) {
      this.bearbeitenHinweis();
      return;
    }
    this.inexistentDialogOffen.set(true);
  }

  protected inexistentSetzen(): void {
    const o = this.objekt();
    const begruendung = this.inexistentBegruendung().trim();
    if (!o || !begruendung) return;
    this.inexistentDialogOffen.set(false);
    this.patch({ inexistent: { seit: heute(), begruendung } });
    this.protokolliere(o.id, `Auf inexistent gesetzt: ${begruendung}`);
    this.inexistentBegruendung.set('');
  }

  protected wiederExistentKlick(): void {
    if (!this.darfBearbeiten()) {
      this.bearbeitenHinweis();
      return;
    }
    this.wiederExistentSetzen();
  }

  protected wiederExistentSetzen(): void {
    const o = this.objekt();
    if (!o) return;
    this.patch({ inexistent: null });
    this.protokolliere(o.id, 'Wieder als existent geführt.');
  }

  protected lognotizHinzufuegen(): void {
    const o = this.objekt();
    const text = this.neueLognotiz().trim();
    if (!o || !text) return;
    this.protokolliere(o.id, text);
    this.neueLognotiz.set('');
  }

  private protokolliere(id: string, text: string): void {
    const rolle = this.einstellungen.aktiveRolleId();
    this.store.lognotizHinzufuegen(id, {
      datum: heute(),
      autor: NAME_FUER_ROLLE[rolle],
      rolle,
      text,
    });
  }

  // ------------------------------------------------------------ Navigation

  protected wechsleZu(objekt: IvsObjekt): void {
    void this.router.navigate(['/objekt', objekt.id]);
  }

  protected oeffneSignatur(signatur: string): void {
    const objekt = this.store.bySignatur(signatur);
    if (objekt) this.wechsleZu(objekt);
  }

  protected inNeuemTabOeffnen(): void {
    const o = this.objekt();
    window.open(o ? `/karte?sig=${encodeURIComponent(o.id)}` : '/karte', '_blank', 'noopener');
  }

  // ------------------------------------------------------ Rich-Text-Anzeige

  /**
   * Formatierter Objektbeschrieb (07.17) im Lesemodus: Der HTML-Wert stammt
   * aus dem eigenen Editor bzw. localStorage — fürs Prototyping wird er ohne
   * weitere Bereinigung dargestellt.
   */
  protected alsHtml(text: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(text);
  }

  // ------------------------------------------------------ Geometrie-Editing

  protected geometrieModusUmschalten(): void {
    const neu = !this.geometrieModus();
    if (!neu && this.geometrieGeaendertFlag) {
      const o = this.objekt();
      if (o) {
        this.protokolliere(
          o.id,
          `Kartengeometrie bearbeitet — ${this.geometrieAnzahl()} Arbeitsgeometrie(n) (05.07).`,
        );
        toast.success('Geometrie übernommen', {
          description: `${o.signatur} — ${this.geometrieAnzahl()} Arbeitsgeometrie(n) gespeichert und historisiert.`,
        });
      }
      this.geometrieGeaendertFlag = false;
    }
    this.geometrieModus.set(neu);
    if (neu) this.kartenTab.set('karte');
  }

  protected geometrieGeaendert(anzahl: number): void {
    this.geometrieAnzahl.set(anzahl);
    this.geometrieGeaendertFlag = true;
  }

  // ------------------------------------------------------------- Umteilen

  /** Mögliche neue Parent-Objekte (07.09): eine Ebene über dem Objekt. */
  // ------------------------------------------------------------- Quellen

  /** Quellen aus dem Beschrieb zusammenstellen und «abfragen» (07.18). */
  protected quellenZusammenstellen(): void {
    const o = this.objekt();
    if (!o) return;
    const texte = [
      o.geschichteText,
      o.gelaendeText,
      o.bewertung.geschichte.text,
      o.bewertung.morphologie.text,
      o.bewertung.substanzwert.text,
      o.gefahrenMassnahmen,
    ].join('\n');
    const muster = /\(([A-ZÄÖÜ][A-ZÄÖÜa-zäöü-]+) (\d{4}(?:\/[IVXLC]+)?): ?(\d+)\)/g;
    const gefunden = new Map<string, QuellenTreffer>();
    for (const treffer of texte.matchAll(muster)) {
      const [, name, jahr, seite] = treffer;
      const schluessel = `${name} ${jahr}`;
      if (!gefunden.has(schluessel)) {
        // Simulierte Abfrage der Literaturdatenbanken — deterministisch
        const hash = [...schluessel].reduce((s, z) => s + z.charCodeAt(0), 0);
        gefunden.set(schluessel, {
          name,
          jahr,
          seiten: [seite],
          helveticat: hash % 3 !== 0,
          swissbib: hash % 2 === 0,
          inBibliografie: o.bibliografie.toLowerCase().includes(name.toLowerCase()),
        });
      } else {
        const eintrag = gefunden.get(schluessel)!;
        if (!eintrag.seiten.includes(seite)) eintrag.seiten.push(seite);
      }
    }
    this.quellen.set([...gefunden.values()].sort((a, b) => a.name.localeCompare(b.name)));
    this.quellenOffen.set(true);
  }

  /** Fehlende Quellen formatiert in die Bibliografie übernehmen. */
  protected quellenUebernehmen(): void {
    const o = this.objekt();
    if (!o) return;
    const neue = this.quellen()
      .filter((q) => !q.inBibliografie)
      .map((q) => {
        const nachweis = [q.helveticat ? 'Helveticat' : null, q.swissbib ? 'Swisscovery' : null]
          .filter(Boolean)
          .join(', ');
        return `${titelSchreibweise(q.name)} (${q.jahr}). — Nachweis: ${nachweis || 'kein Treffer'}.`;
      });
    if (neue.length === 0) return;
    const bibliografie = [o.bibliografie.trim(), ...neue].filter(Boolean).join('\n');
    this.patch({ bibliografie });
    this.quellen.update((liste) => liste.map((q) => ({ ...q, inBibliografie: true })));
  }

  // ----------------------------------------------------------- Kommentare

  /** Alle Objekte für die Zuweisungs-Auswahl im Karten-Kommentar-Dialog. */
  protected readonly alleObjekte = computed(() =>
    [...this.store.alle()].sort((a, b) =>
      a.signatur.localeCompare(b.signatur, 'de-CH', { numeric: true }),
    ),
  );

  protected kommentarWerkzeug(): void {
    this.karte()?.kommentarWerkzeugUmschalten();
  }

  protected kommentarPositionGewaehlt(position: { lon: number; lat: number }): void {
    this.kartenKommentarPosition.set(position);
    this.kartenKommentarZuweisung.set(this.objekt()?.signatur ?? '');
    this.kartenKommentarTitel.set('');
    this.kartenKommentarText.set('');
    this.kartenKommentarOffen.set(true);
  }

  protected kartenKommentarSpeichern(): void {
    const position = this.kartenKommentarPosition();
    const text = this.kartenKommentarText().trim();
    if (!position || !text) return;
    const rolle = this.einstellungen.aktiveRolleId();
    this.kommentarStore.hinzufuegen({
      objektSignatur: this.kartenKommentarZuweisung() || null,
      position,
      titel: this.kartenKommentarTitel().trim(),
      text,
      autor: NAME_FUER_ROLLE[rolle],
      rolle,
      zeit: jetztLokal(),
      erledigt: false,
      antworten: [],
    });
    this.kartenKommentarOffen.set(false);
  }

  /** Beim Pin-Klick angeforderter Kommentar — auch fremder oder freier. */
  protected readonly pinKommentarId = signal<string | null>(null);

  protected kommentarPinGeklickt(id: string): void {
    this.pinKommentarId.set(id);
    this.kartenTab.set('kommentare');
  }

  /** Scrollt im Formular zum referenzierten Attribut und hebt es kurz hervor. */
  protected scrolleZuAttribut(anker: string): void {
    const element = document.getElementById(anker);
    if (!element) return;
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.classList.add('ring-2', 'ring-primary', 'rounded-md');
    setTimeout(() => element.classList.remove('ring-2', 'ring-primary', 'rounded-md'), 1800);
  }

  protected lognotizenAbsteigend = computed(() => {
    const o = this.objekt();
    return o ? [...o.lognotizen].reverse() : [];
  });

  protected formatDatum(iso: string | null): string {
    if (!iso) return '—';
    const [j, m, t] = iso.split('-');
    return `${t}.${m}.${j}`;
  }
}

function heute(): string {
  return new Date().toISOString().slice(0, 10);
}

/** «R-06» → «Fachlektorat (R-06)» für Hinweistexte. */
function rollenName(id: RolleId): string {
  const name = ROLLEN.find((rolle) => rolle.id === id)?.name;
  return name ? `${name} (${id})` : id;
}

interface QuellenTreffer {
  name: string;
  jahr: string;
  seiten: string[];
  helveticat: boolean;
  swissbib: boolean;
  inBibliografie: boolean;
}

/** «ANDEREGG» → «Anderegg» für die Bibliografie-Übernahme. */
function titelSchreibweise(name: string): string {
  return name.charAt(0) + name.slice(1).toLowerCase();
}
