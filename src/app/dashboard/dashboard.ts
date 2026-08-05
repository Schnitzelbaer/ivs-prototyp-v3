import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { toast } from '@spartan-ng/brain/sonner';
import {
  lucideChevronDown,
  lucideChevronLeft,
  lucideChevronRight,
  lucideDownload,
  lucideExternalLink,
  lucideInbox,
  lucideLasso,
  lucideListFilter,
  lucideMessageSquarePlus,
  lucideRotateCw,
  lucideSearch,
  lucideTrash2,
} from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmCollapsibleImports } from '@spartan-ng/helm/collapsible';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmNativeSelectImports } from '@spartan-ng/helm/native-select';
import { HlmPopoverImports } from '@spartan-ng/helm/popover';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { EinstellungenStore } from '../core/einstellungen-store';
import { HerkunftStore } from '../core/herkunft-store';
import { HinweisStore } from '../core/hinweis-store';
import { KommentarStore, jetztLokal } from '../core/kommentare';
import { pruefungBestanden } from '../core/pruefprotokoll';
import {
  IvsObjekt,
  NhgWert,
  Substanzgrad,
  WorkflowStatus,
  bewertungText,
  NHG_LABEL,
  SUBSTANZGRAD_LABEL,
} from '../core/model';
import {
  AttributFilter,
  OHNE_PERSON,
  attributFilterAktiv,
  leererAttributFilter,
  passtAttributFilter,
} from '../core/objekt-filter';
import { ObjektStore } from '../core/objekt-store';
import { Arbeitspaket, KANTONE, PaketStore } from '../core/paket-store';
import { NAME_FUER_ROLLE, PERSONEN } from '../core/seed-data';
import { ALLE_STATI, STATUS_FARBE, STATUS_LABEL } from '../core/status';
import { Karte } from '../karte/karte';
import { KommentarPanel } from '../kommentare/kommentar-panel';

interface StatusBlock {
  status: WorkflowStatus;
  label: string;
  objekte: IvsObjekt[];
}

interface StatusOption {
  wert: WorkflowStatus;
  label: string;
}

/**
 * Dashboard (04): persönliche Aufgabenliste, gruppiert nach allen
 * Workflow-Stati — je Status erscheinen nur Objekte, die der aktiven
 * Person zugewiesen sind oder laut Lognotizen einmal zugewiesen waren.
 * Die vollständige Übersicht liegt unter «Objekte».
 */
@Component({
  selector: 'ivs-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    NgIcon,
    HlmBadgeImports,
    HlmButtonImports,
    HlmCheckboxImports,
    HlmCollapsibleImports,
    HlmDialogImports,
    HlmEmptyImports,
    HlmInputImports,
    HlmInputGroupImports,
    HlmLabelImports,
    HlmNativeSelectImports,
    HlmPopoverImports,
    HlmTableImports,
    HlmTabsImports,
    HlmTextareaImports,
    HlmTooltipImports,
    Karte,
    KommentarPanel,
  ],
  providers: [
    provideIcons({
      lucideChevronDown,
      lucideChevronLeft,
      lucideChevronRight,
      lucideDownload,
      lucideExternalLink,
      lucideInbox,
      lucideLasso,
      lucideListFilter,
      lucideMessageSquarePlus,
      lucideRotateCw,
      lucideSearch,
      lucideTrash2,
    }),
  ],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  protected readonly einstellungen = inject(EinstellungenStore);
  private readonly store = inject(ObjektStore);
  protected readonly paketStore = inject(PaketStore);
  private readonly kommentarStore = inject(KommentarStore);
  private readonly router = inject(Router);
  private readonly herkunft = inject(HerkunftStore);
  private readonly hinweis = inject(HinweisStore);

  private readonly karte = viewChild(Karte);

  constructor() {
    // Rollenwechsel: Person- und Paket-Filter zurücksetzen — die beiden
    // Selects sind nur für die Paketrollen sichtbar und dürfen für
    // andere Rollen nicht unsichtbar weiterwirken (Entscheid 84)
    effect(() => {
      this.einstellungen.aktiveRolleId();
      this.personFilter.set('alle');
      this.paketFilter.set('alle');
    });
  }

  protected readonly statusLabel = STATUS_LABEL;
  protected readonly statusFarbe = STATUS_FARBE;
  protected readonly nhgLabel = NHG_LABEL;
  protected readonly substanzLabel = SUBSTANZGRAD_LABEL;
  protected readonly bewertungText = bewertungText;

  // Filterzustand (echte Attributfilter, Entscheid 84)
  protected readonly suche = signal('');
  protected readonly statusFilter = signal<'alle' | WorkflowStatus>('alle');
  protected readonly bedeutungFilter = signal<'alle' | NhgWert>('alle');
  protected readonly substanzFilter = signal<'alle' | Substanzgrad>('alle');
  protected readonly kantonFilter = signal<'alle' | string>('alle');
  protected readonly gemeindeFilter = signal('');
  protected readonly alterFilter = signal<'alle' | string>('alle');
  protected readonly bewertungMinFilter = signal<'alle' | string>('alle');
  protected readonly inexistentFilter = signal<'alle' | 'nur' | 'ohne'>('alle');
  protected readonly personFilter = signal<'alle' | string>('alle');
  protected readonly paketFilter = signal('alle');
  protected readonly polygonSignaturen = signal<ReadonlySet<string> | null>(null);

  protected readonly ohnePerson = OHNE_PERSON;

  /**
   * Gebündelter Attributfilter fürs gemeinsame Prädikat. Der Status
   * gehört dazu — nur so folgt auch die Karte dem Status-Filter
   * (die Gruppen blenden zusätzlich über bloecke() aus).
   */
  private readonly attributFilter = computed<AttributFilter>(() => ({
    ...leererAttributFilter(),
    status: this.statusFilter(),
    bedeutung: this.bedeutungFilter(),
    substanz: this.substanzFilter(),
    kanton: this.kantonFilter(),
    gemeinde: this.gemeindeFilter(),
    aufnahmejahr: this.alterFilter(),
    bewertungMin: this.bewertungMinFilter(),
    inexistent: this.inexistentFilter(),
    person: this.personFilter(),
    paket: this.paketFilter(),
  }));

  /** Optionen des Arbeitspaket-Filters: R-03 Kantone + alle Pakete, R-04 eigene. */
  protected readonly paketFilterOptionen = computed<{ wert: string; label: string }[]>(() => {
    const rolle = this.einstellungen.aktiveRolleId();
    if (rolle === 'R-03') {
      return [
        ...KANTONE.map((k) => ({ wert: `kanton:${k.kuerzel}`, label: `Kanton ${k.name}` })),
        ...this.paketStore
          .pakete()
          .map((p) => ({ wert: `paket:${p.id}`, label: `«${p.name}» (${p.koordinator})` })),
      ];
    }
    return this.meinePakete().map((p) => ({ wert: `paket:${p.id}`, label: `«${p.name}»` }));
  });

  protected readonly sortAufsteigend = signal(true);
  protected readonly ausgewaehlt = signal<ReadonlySet<string>>(new Set());
  protected readonly karteOffen = signal(true);

  /** Aktiver Tab des Kartenpanels — Pin-Klick wechselt auf «Kommentare». */
  protected readonly kartenTab = signal('karte');
  protected readonly kommentarModusAktiv = computed(() => this.karte()?.kommentarModus() ?? false);

  // Dialog «Kommentar auf Karte» (05.11)
  protected readonly kartenKommentarOffen = signal(false);
  protected readonly kartenKommentarPosition = signal<{ lon: number; lat: number } | null>(null);
  protected readonly kartenKommentarTitel = signal('');
  protected readonly kartenKommentarText = signal('');
  protected readonly kartenKommentarZuweisung = signal('');

  // -------------------------------------------- Arbeitspakete und Sichten

  /** Paketrollen (R-03/R-04) schnüren Arbeitspakete und sehen alle Objekte. */
  protected readonly istPaketRolle = computed(() => {
    const rolle = this.einstellungen.aktiveRolleId();
    return rolle === 'R-03' || rolle === 'R-04';
  });

  /** Inventarisierende als Zielpersonen der R-04-Pakete. */
  protected readonly paketPersonen = PERSONEN.filter((p) => p.rolle === 'R-05');

  /**
   * Kantone, die der aktiven Regionalen Koordination zugewiesen sind —
   * R-04 sieht und bewirtschaftet nur noch diese (Entscheid 83).
   */
  private readonly meineKantone = computed(() => {
    const ich = NAME_FUER_ROLLE['R-04'];
    return new Set(
      Object.entries(this.paketStore.kantonZuweisungen())
        .filter(([, name]) => name === ich)
        .map(([kuerzel]) => kuerzel),
    );
  });

  /** Die Arbeitspakete der aktiven Regionalen Koordination (Entscheid 83). */
  protected readonly meinePakete = computed(() =>
    this.paketStore.pakete().filter((p) => p.koordinator === NAME_FUER_ROLLE['R-04']),
  );

  /** Name für ein neues Arbeitspaket. */
  protected readonly paketName = signal('');

  /** Zielperson je Paket (Standard: erste Inventarisierende). */
  private readonly paketZiel = signal<Record<string, string>>({});

  protected zielFuer(paketId: string): string {
    return this.paketZiel()[paketId] ?? this.paketPersonen[0].name;
  }

  protected zielSetzen(paketId: string, name: string): void {
    this.paketZiel.update((z) => ({ ...z, [paketId]: name }));
  }

  protected signaturVon(objektId: string): string {
    return this.store.byId(objektId)?.signatur ?? objektId;
  }

  /** Personen für die Zuständig-Spalte (Wechsel nur durch R-03/R-04, Entscheid 81). */
  protected readonly allePersonen = PERSONEN;

  /**
   * Zuständigkeit in der Zeile wechseln: vererbt auf die Nachkommen der
   * Strecke; ein «offenes» Objekt wechselt automatisch auf «Zugewiesen»
   * (Entscheid 79), sonst bleibt der Status unberührt.
   */
  protected personWechseln(objekt: IvsObjekt, name: string): void {
    if (name === objekt.zustaendigName) return;
    const person = PERSONEN.find((p) => p.name === name);
    if (!person) return;
    const rolle = this.einstellungen.aktiveRolleId();
    const warOffen = objekt.status === 'offen';
    this.store.personZuweisen(objekt.id, person, NAME_FUER_ROLLE[rolle], rolle);
    toast.success(`Zugewiesen an ${person.name}`, {
      description: warOffen
        ? `${objekt.signatur} — Status «Zugewiesen» gesetzt, Zuweisung protokolliert.`
        : `${objekt.signatur} — Zuweisung protokolliert.`,
    });
  }

  /** Alle 26 Kantone — auch ohne Testdaten testweise zuweisbar (Entscheid 82). */
  protected readonly kantone = KANTONE;

  /** Regionale Koordinationen für die Kantonszuweisung. */
  protected readonly koordinationPersonen = PERSONEN.filter((p) => p.rolle === 'R-04');

  /** Zielkanton für das Umteilen ausgewählter Strecken (Entscheid 82). */
  protected readonly zielKanton = signal('FR');

  /** Strecken-Zahl je Kanton (für die Kantonsliste im Paketbereich). */
  protected readonly streckenProKanton = computed<Record<string, number>>(() => {
    const zaehler: Record<string, number> = {};
    for (const s of this.store.strecken()) zaehler[s.kanton] = (zaehler[s.kanton] ?? 0) + 1;
    return zaehler;
  });

  /** Aufgaben der aktiven Sicht nach allen Filtern. */
  private readonly gefiltert = computed(() => {
    const rolle = this.einstellungen.aktiveRolleId();
    // Paketrollen sehen alle Objekte (R-04 beschränkt auf ihre Kantone,
    // Entscheid 83); alle anderen sehen ihre persönliche Sicht.
    const ich = this.istPaketRolle() ? null : NAME_FUER_ROLLE[rolle];
    const meineKantone = rolle === 'R-04' ? this.meineKantone() : null;
    const filter = this.attributFilter();
    const paketInhalt = (paketId: string) =>
      this.paketStore.pakete().find((p) => p.id === paketId)?.objektIds;
    const begriff = this.suche().trim().toLowerCase();
    const polygon = this.polygonSignaturen();
    const richtung = this.sortAufsteigend() ? 1 : -1;

    return this.store
      .alle()
      .filter((o) => {
        // ToDos werden nur auf Strecken-Ebene zugewiesen — das Dashboard
        // listet deshalb ausschliesslich Strecken.
        if (o.ebene !== 'strecke') return false;
        // R-04: nur die der Koordination zugewiesenen Kantone
        if (meineKantone && !meineKantone.has(o.kanton)) return false;
        // Persönlich: aktuell zugewiesen oder laut Lognotizen einmal
        // beteiligt (gleiche Semantik wie der Kommentar-Filter, Entscheid 56)
        if (ich !== null && o.zustaendigName !== ich && !o.lognotizen.some((n) => n.autor === ich))
          return false;
        if (!passtAttributFilter(o, filter, paketInhalt)) return false;
        if (polygon && !polygon.has(o.signatur)) return false;
        if (begriff) {
          const text = `${o.signatur} ${o.name} ${o.gemeinden}`.toLowerCase();
          if (!text.includes(begriff)) return false;
        }
        return true;
      })
      .sort((a, b) => richtung * a.signatur.localeCompare(b.signatur, 'de-CH', { numeric: true }));
  });

  /** Alle Stati in Workflow-Reihenfolge (Gruppen und Filter). */
  protected readonly alleStati = ALLE_STATI;

  protected readonly bloecke = computed<StatusBlock[]>(() => {
    const objekte = this.gefiltert();
    return ALLE_STATI.filter(
      (s) => this.statusFilter() === 'alle' || this.statusFilter() === s,
    ).map((status) => ({
      status,
      label: STATUS_LABEL[status],
      objekte: objekte.filter((o) => o.status === status),
    }));
  });

  protected readonly polygonAktiv = computed(() => this.karte()?.polygonAktiv() ?? false);

  /**
   * Die Karte zeigt nur die Strecken der Liste (samt Unterobjekten);
   * Suche und Filter dezimieren sie mit. Wertvergleich: die Layer-Filter
   * sollen nur bei echten Änderungen neu gesetzt werden.
   */
  protected readonly kartenStrecken = computed(
    () => this.gefiltert().map((o) => o.signatur).sort(),
    { equal: (a, b) => a.length === b.length && a.every((s, i) => s === b[i]) },
  );

  /**
   * Workflow-Status-Optionen der Zeile: die von der Rolle setzbaren Stati
   * (plus der aktuelle), direkt wählbar — in der Reihenfolge des Workflows.
   */
  protected statusOptionen(objekt: IvsObjekt): StatusOption[] {
    const setzbare = this.einstellungen.aktiveRolle().setzbareStati;
    return ALLE_STATI.filter((s) => s === objekt.status || setzbare.includes(s)).map((s) => ({
      wert: s,
      label: STATUS_LABEL[s],
    }));
  }

  protected statusWechseln(
    objekt: IvsObjekt,
    status: string,
    select?: { writeValue(wert: unknown): void },
  ): void {
    if (status === objekt.status) return;
    // «Geprüft» setzt ein bestandenes Prüfprotokoll voraus (siehe Objekt-Detail)
    if (status === 'geprueft' && !pruefungBestanden(objekt.pruefprotokoll)) {
      select?.writeValue(objekt.status);
      this.hinweis.zeige(
        'Prüfprotokoll erforderlich',
        `${objekt.signatur} kann erst als geprüft gekennzeichnet werden, wenn das Fachlektorat ` +
          'das Prüfprotokoll vollständig mit Ja beantwortet hat — öffne das Objekt und ' +
          'schliesse die Prüfung über den Knopf «Prüfung» ab.',
      );
      return;
    }
    const rolle = this.einstellungen.aktiveRolleId();
    this.store.statusWechseln(objekt.id, status as WorkflowStatus, NAME_FUER_ROLLE[rolle], rolle);
    toast.success(`Status gewechselt: ${STATUS_LABEL[status as WorkflowStatus]}`, {
      description: `${objekt.signatur} — Übergang protokolliert.`,
    });
  }

  protected auswahlUmschalten(id: string, ausgewaehlt: boolean): void {
    this.ausgewaehlt.update((menge) => {
      const neu = new Set(menge);
      if (ausgewaehlt) neu.add(id);
      else neu.delete(id);
      return neu;
    });
  }

  protected oeffneObjekt(objekt: IvsObjekt): void {
    this.herkunft.uebersicht.set('/dashboard');
    void this.router.navigate(['/objekt', objekt.id]);
  }

  protected oeffneSignatur(signatur: string): void {
    const objekt = this.store.bySignatur(signatur);
    if (objekt) this.oeffneObjekt(objekt);
  }

  protected setzePolygon(signaturen: string[] | null): void {
    this.polygonSignaturen.set(signaturen ? new Set(signaturen) : null);
  }

  // -------------------------------------------------- Pakete schnüren

  /**
   * R-03: Kanton einer Regionalen Koordination zuweisen (Entscheid 82).
   * Persistent und änderbar; der Workflow-Status der Objekte bleibt
   * unberührt — erst die Zuweisung an eine Person setzt «Zugewiesen».
   */
  protected kantonZuweisen(kanton: { kuerzel: string; name: string }, personName: string): void {
    this.paketStore.kantonZuweisen(kanton.kuerzel, personName);
    if (personName) {
      toast.success(`Kanton ${kanton.name} zugewiesen an ${personName}`, {
        description: 'Zuweisung gespeichert — der Status der Objekte bleibt unberührt.',
      });
    } else {
      toast.success(`Zuweisung für den Kanton ${kanton.name} entfernt`);
    }
  }

  /**
   * R-03: die ausgewählten Strecken (Checkboxen; ersatzweise die aktive
   * Polygon-Selektion) einem anderen Kanton zuordnen (Entscheid 82).
   */
  protected inKantonVerschieben(): void {
    const ids = this.ausgewaehlteIds();
    if (ids.length === 0) {
      this.hinweis.zeige(
        'Keine Strecken ausgewählt',
        'Wähle die Strecken über die Checkboxen in den Status-Gruppen oder über die ' +
          'Polygon-Selektion auf der Karte aus.',
      );
      return;
    }
    const kanton = this.zielKanton();
    const kantonName = KANTONE.find((k) => k.kuerzel === kanton)?.name ?? kanton;
    const rolle = this.einstellungen.aktiveRolleId();
    const anzahl = this.store.kantonZuordnen(ids, kanton, NAME_FUER_ROLLE[rolle], rolle);
    this.ausgewaehlt.set(new Set());
    if (anzahl === 0) {
      this.hinweis.zeige(
        'Nichts zu verschieben',
        `Alle ausgewählten Strecken liegen bereits im Kanton ${kantonName}.`,
      );
      return;
    }
    toast.success(
      `${anzahl} Strecke${anzahl === 1 ? '' : 'n'} in den Kanton ${kantonName} verschoben`,
      { description: 'Die Signaturen bleiben unverändert; Nachkommen ziehen mit.' },
    );
  }

  /** Auswahl für Paket-Operationen: Checkboxen, ersatzweise Polygon-Selektion. */
  private ausgewaehlteIds(): string[] {
    const auswahl = this.ausgewaehlt();
    if (auswahl.size) return [...auswahl];
    return this.polygonSignaturen() ? this.gefiltert().map((o) => o.id) : [];
  }

  /**
   * R-04: aus den ausgewählten Strecken (Checkboxen; ersatzweise die
   * aktive Polygon-Selektion) ein benanntes Arbeitspaket erstellen
   * (Entscheid 83). Bereits paketierte Strecken wandern in das neue
   * Paket — ein Objekt gehört zu höchstens einem Paket.
   */
  protected paketErstellen(): void {
    const name = this.paketName().trim();
    if (!name) return;
    const ids = this.ausgewaehlteIds();
    if (ids.length === 0) {
      this.hinweis.zeige(
        'Keine Strecken ausgewählt',
        'Wähle die Strecken für das Paket über die Checkboxen in den Status-Gruppen oder ' +
          'über die Polygon-Selektion auf der Karte aus.',
      );
      return;
    }
    this.paketStore.paketErstellen(name, NAME_FUER_ROLLE['R-04'], ids);
    this.paketName.set('');
    this.ausgewaehlt.set(new Set());
    toast.success(`Arbeitspaket «${name}» erstellt`, {
      description: `${ids.length} Strecke${ids.length === 1 ? '' : 'n'} — Zuweisung an eine Inventarisierende über «Zuweisen».`,
    });
  }

  /** R-04: die aktuelle Auswahl einem bestehenden Paket hinzufügen. */
  protected paketObjekteHinzufuegen(paket: Arbeitspaket): void {
    const ids = this.ausgewaehlteIds();
    if (ids.length === 0) {
      this.hinweis.zeige(
        'Keine Strecken ausgewählt',
        'Wähle zuerst die Strecken über die Checkboxen in den Status-Gruppen oder die ' +
          'Polygon-Selektion aus — sie werden dann dem Paket hinzugefügt.',
      );
      return;
    }
    this.paketStore.objekteHinzufuegen(paket.id, ids);
    this.ausgewaehlt.set(new Set());
    toast.success(`${ids.length} Strecke${ids.length === 1 ? '' : 'n'} zu «${paket.name}» hinzugefügt`);
  }

  protected paketObjektEntfernen(paket: Arbeitspaket, objektId: string): void {
    this.paketStore.objektEntfernen(paket.id, objektId);
  }

  protected paketLoeschen(paket: Arbeitspaket): void {
    // Zeigt der Arbeitspaket-Filter auf dieses Paket, würde er sonst als
    // toter Wert weiterwirken und die Liste leeren (Review-Befund)
    if (this.paketFilter() === `paket:${paket.id}`) this.paketFilter.set('alle');
    this.paketStore.paketLoeschen(paket.id);
    toast.success(`Arbeitspaket «${paket.name}» gelöscht`, {
      description: 'Die Strecken selbst bleiben unverändert.',
    });
  }

  /**
   * R-04: das Paket einer Inventarisierenden zuweisen — alle Strecken
   * wechseln auf «Zugewiesen» und erhalten die Person als zuständig
   * (Entscheide 79/83).
   */
  protected paketZuweisen(paket: Arbeitspaket): void {
    if (paket.objektIds.length === 0) {
      this.hinweis.zeige(
        'Leeres Paket',
        `«${paket.name}» enthält keine Strecken — füge zuerst über «+ Auswahl» Strecken hinzu.`,
      );
      return;
    }
    const ziel = this.paketPersonen.find((p) => p.name === this.zielFuer(paket.id));
    if (!ziel) return;
    const rolle = this.einstellungen.aktiveRolleId();
    this.store.paketZuweisen(
      paket.objektIds,
      ziel,
      `Arbeitspaket «${paket.name}»`,
      NAME_FUER_ROLLE[rolle],
      rolle,
    );
    this.paketStore.paketZuweisungSetzen(paket.id, ziel.name);
    toast.success(`Arbeitspaket «${paket.name}» zugewiesen`, {
      description: `${paket.objektIds.length} Strecken an ${ziel.name} (${ziel.rolle}) — Status «Zugewiesen».`,
    });
  }

  protected filterZuruecksetzen(): void {
    this.suche.set('');
    this.statusFilter.set('alle');
    this.bedeutungFilter.set('alle');
    this.substanzFilter.set('alle');
    this.kantonFilter.set('alle');
    this.gemeindeFilter.set('');
    this.alterFilter.set('alle');
    this.bewertungMinFilter.set('alle');
    this.inexistentFilter.set('alle');
    this.personFilter.set('alle');
    this.paketFilter.set('alle');
    if (this.polygonSignaturen() !== null) this.karte()?.polygonUmschalten();
    this.polygonSignaturen.set(null);
  }

  protected polygonWerkzeug(): void {
    this.karte()?.polygonUmschalten();
  }

  protected inNeuemTabOeffnen(): void {
    // Rolle mitgeben: das Kartenfenster erbt die Perspektive dieses Tabs
    window.open(`/karte?rolle=${this.einstellungen.aktiveRolleId()}`, '_blank', 'noopener');
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
    this.kartenKommentarZuweisung.set('');
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

  protected kommentarPinGeklickt(): void {
    this.kartenTab.set('kommentare');
  }
}
