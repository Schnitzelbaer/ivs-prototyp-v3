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
import { ObjektStore } from '../core/objekt-store';
import { KANTONE, PaketStore } from '../core/paket-store';
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
    // Ein Rollenwechsel setzt die Absteigen-Ansicht zurück
    effect(() => {
      this.einstellungen.aktiveRolleId();
      this.ansichtPerson.set('eigene');
    });
  }

  protected readonly statusLabel = STATUS_LABEL;
  protected readonly statusFarbe = STATUS_FARBE;
  protected readonly nhgLabel = NHG_LABEL;
  protected readonly substanzLabel = SUBSTANZGRAD_LABEL;
  protected readonly bewertungText = bewertungText;

  // Filterzustand
  protected readonly suche = signal('');
  protected readonly statusFilter = signal<'alle' | WorkflowStatus>('alle');
  protected readonly bedeutungFilter = signal<'alle' | NhgWert>('alle');
  protected readonly substanzFilter = signal<'alle' | Substanzgrad>('alle');
  protected readonly regionFilter = signal<'alle' | 'bern_mittelland'>('alle');
  protected readonly alterFilter = signal<'alle' | '2024' | '2025'>('alle');
  protected readonly polygonSignaturen = signal<ReadonlySet<string> | null>(null);

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

  /**
   * «Absteigen»: Personen, deren persönliches Dashboard die Paketrolle
   * einsehen kann — R-03 die Koordinatoren und Inventarisierenden,
   * R-04 die Inventarisierenden.
   */
  protected readonly absteigPersonen = computed(() => {
    const rolle = this.einstellungen.aktiveRolleId();
    if (rolle === 'R-03') return PERSONEN.filter((p) => p.rolle === 'R-04' || p.rolle === 'R-05');
    if (rolle === 'R-04') return PERSONEN.filter((p) => p.rolle === 'R-05');
    return [];
  });

  /** Gewählte Ansicht: 'eigene' oder der Name einer unterstellten Person. */
  protected readonly ansichtPerson = signal<'eigene' | string>('eigene');

  /** Zielperson des R-04-Pakets. */
  protected readonly paketPerson = signal('B. Anderegg');
  protected readonly paketPersonen = PERSONEN.filter((p) => p.rolle === 'R-05');

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
    const ansicht = this.ansichtPerson();
    // Paketrollen sehen alles; das Absteigen zeigt die persönliche Sicht
    // einer unterstellten Person; alle anderen sehen ihre eigene.
    const ich =
      ansicht !== 'eigene'
        ? ansicht
        : this.istPaketRolle()
          ? null
          : NAME_FUER_ROLLE[this.einstellungen.aktiveRolleId()];
    const begriff = this.suche().trim().toLowerCase();
    const polygon = this.polygonSignaturen();
    const richtung = this.sortAufsteigend() ? 1 : -1;

    return this.store
      .alle()
      .filter((o) => {
        // ToDos werden nur auf Strecken-Ebene zugewiesen — das Dashboard
        // listet deshalb ausschliesslich Strecken.
        if (o.ebene !== 'strecke') return false;
        // Persönlich: aktuell zugewiesen oder laut Lognotizen einmal
        // beteiligt (gleiche Semantik wie der Kommentar-Filter, Entscheid 56)
        if (ich !== null && o.zustaendigName !== ich && !o.lognotizen.some((n) => n.autor === ich))
          return false;
        if (this.bedeutungFilter() !== 'alle' && o.nhgWert !== this.bedeutungFilter()) return false;
        if (this.substanzFilter() !== 'alle' && o.substanzgrad !== this.substanzFilter())
          return false;
        if (this.alterFilter() !== 'alle' && String(o.aufnahmejahr) !== this.alterFilter())
          return false;
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
    const rolle = this.einstellungen.aktiveRolleId();
    const anzahl = this.store.kantonZuordnen(ids, kanton, NAME_FUER_ROLLE[rolle], rolle);
    this.ausgewaehlt.set(new Set());
    if (anzahl === 0) {
      this.hinweis.zeige(
        'Nichts zu verschieben',
        `Alle ausgewählten Strecken liegen bereits im Kanton ${kanton}.`,
      );
      return;
    }
    toast.success(`${anzahl} Strecke${anzahl === 1 ? '' : 'n'} in den Kanton ${kanton} verschoben`, {
      description: 'Die Signaturen bleiben unverändert; Nachkommen ziehen mit.',
    });
  }

  /** Auswahl für Paket-Operationen: Checkboxen, ersatzweise Polygon-Selektion. */
  private ausgewaehlteIds(): string[] {
    const auswahl = this.ausgewaehlt();
    if (auswahl.size) return [...auswahl];
    return this.polygonSignaturen() ? this.gefiltert().map((o) => o.id) : [];
  }

  /**
   * R-04: die ausgewählten Strecken (Checkboxen; ersatzweise die aktive
   * Polygon-Selektion) als Paket einer Inventarisierenden zuweisen.
   */
  protected paketZuweisen(): void {
    const ids = this.ausgewaehlteIds();
    if (ids.length === 0) {
      this.hinweis.zeige(
        'Keine Strecken ausgewählt',
        'Wähle die Strecken für das Paket über die Checkboxen in den Status-Gruppen oder ' +
          'über die Polygon-Selektion auf der Karte aus.',
      );
      return;
    }
    const ziel = this.paketPersonen.find((p) => p.name === this.paketPerson());
    if (!ziel) return;
    const rolle = this.einstellungen.aktiveRolleId();
    this.store.paketZuweisen(
      ids,
      ziel,
      `Arbeitspaket (${ids.length} Strecken)`,
      NAME_FUER_ROLLE[rolle],
      rolle,
    );
    this.ausgewaehlt.set(new Set());
    toast.success('Arbeitspaket zugewiesen', {
      description: `${ids.length} Strecken an ${ziel.name} (${ziel.rolle}) — Status «Zugewiesen».`,
    });
  }

  protected filterZuruecksetzen(): void {
    this.suche.set('');
    this.statusFilter.set('alle');
    this.bedeutungFilter.set('alle');
    this.substanzFilter.set('alle');
    this.regionFilter.set('alle');
    this.alterFilter.set('alle');
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
