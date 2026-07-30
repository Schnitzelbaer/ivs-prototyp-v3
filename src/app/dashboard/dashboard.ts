import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
import { KommentarStore, jetztLokal } from '../core/kommentare';
import {
  IvsObjekt,
  NhgWert,
  StatusGruppe,
  Substanzgrad,
  WorkflowStatus,
  bewertungText,
  NHG_LABEL,
  SUBSTANZGRAD_LABEL,
} from '../core/model';
import { ObjektStore } from '../core/objekt-store';
import { NAME_FUER_ROLLE } from '../core/seed-data';
import {
  ALLE_GRUPPEN,
  GRUPPE_LABEL,
  STATUS_FARBE,
  STATUS_GRUPPE,
  STATUS_LABEL,
  uebergaengeFuer,
} from '../core/status';
import { Karte } from '../karte/karte';
import { KommentarPanel } from '../kommentare/kommentar-panel';

interface GruppenBlock {
  gruppe: StatusGruppe;
  label: string;
  objekte: IvsObjekt[];
}

interface StatusOption {
  wert: WorkflowStatus;
  label: string;
}

/**
 * Dashboard (04): rollenspezifisch vorgefilterte Aufgabenliste, gruppiert
 * nach Backlog / In Arbeit / Done, daneben die Karte. Die vollständige,
 * ungefilterte Übersicht liegt unter «Objekte».
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
  private readonly kommentarStore = inject(KommentarStore);
  private readonly router = inject(Router);

  private readonly karte = viewChild(Karte);

  protected readonly statusLabel = STATUS_LABEL;
  protected readonly statusFarbe = STATUS_FARBE;
  protected readonly nhgLabel = NHG_LABEL;
  protected readonly substanzLabel = SUBSTANZGRAD_LABEL;
  protected readonly bewertungText = bewertungText;

  // Filterzustand
  protected readonly suche = signal('');
  protected readonly gruppenFilter = signal<'alle' | StatusGruppe>('alle');
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

  /** Aufgaben der aktiven Rolle nach allen Filtern. */
  private readonly gefiltert = computed(() => {
    const rolle = this.einstellungen.aktiveRolle();
    const begriff = this.suche().trim().toLowerCase();
    const polygon = this.polygonSignaturen();
    const richtung = this.sortAufsteigend() ? 1 : -1;

    return this.store
      .alle()
      .filter((o) => {
        if (!rolle.dashboardStati.includes(o.status)) return false;
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

  protected readonly bloecke = computed<GruppenBlock[]>(() => {
    const objekte = this.gefiltert();
    return ALLE_GRUPPEN.filter(
      (g) => this.gruppenFilter() === 'alle' || this.gruppenFilter() === g,
    ).map((gruppe) => ({
      gruppe,
      label: GRUPPE_LABEL[gruppe],
      objekte: objekte.filter((o) => STATUS_GRUPPE[o.status] === gruppe),
    }));
  });

  protected readonly polygonAktiv = computed(() => this.karte()?.polygonAktiv() ?? false);

  /** Workflow-Status-Optionen der Zeile: aktueller Status + erlaubte Übergänge. */
  protected statusOptionen(objekt: IvsObjekt): StatusOption[] {
    const uebergaenge = uebergaengeFuer(this.einstellungen.aktiveRolleId(), objekt.status);
    return [
      { wert: objekt.status, label: STATUS_LABEL[objekt.status] },
      ...uebergaenge.map((u) => ({ wert: u.nach, label: STATUS_LABEL[u.nach] })),
    ];
  }

  protected statusWechseln(objekt: IvsObjekt, status: string): void {
    if (status === objekt.status) return;
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
    void this.router.navigate(['/objekt', objekt.id]);
  }

  protected oeffneSignatur(signatur: string): void {
    const objekt = this.store.bySignatur(signatur);
    if (objekt) this.oeffneObjekt(objekt);
  }

  protected setzePolygon(signaturen: string[] | null): void {
    this.polygonSignaturen.set(signaturen ? new Set(signaturen) : null);
  }

  protected filterZuruecksetzen(): void {
    this.suche.set('');
    this.gruppenFilter.set('alle');
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
    window.open('/karte', '_blank', 'noopener');
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
