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
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideAlignJustify,
  lucideCamera,
  lucideCheck,
  lucideChevronDown,
  lucideCircleSmall,
  lucideDownload,
  lucideExternalLink,
  lucideHistory,
  lucideImagePlus,
  lucideLayers,
  lucideMinus,
  lucidePencil,
  lucidePlus,
  lucideSlash,
  lucideTrash2,
  lucideTriangleAlert,
  lucideUpload,
} from '@ng-icons/lucide';
import { HlmAlertDialogImports } from '@spartan-ng/helm/alert-dialog';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmNativeSelectImports } from '@spartan-ng/helm/native-select';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { EinstellungenStore } from '../core/einstellungen-store';
import {
  BewertungsTeil,
  EBENE_LABEL,
  IvsObjekt,
  NHG_LABEL,
  SUBSTANZGRAD_LABEL,
  WorkflowStatus,
  bewertungText,
} from '../core/model';
import { ObjektStore } from '../core/objekt-store';
import { darfEditieren } from '../core/rollen';
import { NAME_FUER_ROLLE } from '../core/seed-data';
import { STATUS_LABEL, StatusUebergang, uebergaengeFuer } from '../core/status';
import { Karte, KartenSelektion } from '../karte/karte';
import { KarteSync } from '../karte/karte-sync';
import { ObjektGeo } from '../karte/objekt-geo';
import { BewertungsPunkte } from './bewertungs-punkte';

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
    HlmDropdownMenuImports,
    HlmInputImports,
    HlmLabelImports,
    HlmNativeSelectImports,
    HlmSheetImports,
    HlmTabsImports,
    HlmTextareaImports,
    HlmTooltipImports,
    BewertungsPunkte,
    Karte,
  ],
  providers: [
    provideIcons({
      lucideAlignJustify,
      lucideCamera,
      lucideCheck,
      lucideChevronDown,
      lucideCircleSmall,
      lucideDownload,
      lucideExternalLink,
      lucideHistory,
      lucideImagePlus,
      lucideLayers,
      lucideMinus,
      lucidePencil,
      lucidePlus,
      lucideSlash,
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
  protected readonly einstellungen = inject(EinstellungenStore);

  private readonly karte = viewChild(Karte);

  readonly id = input.required<string>();

  protected readonly statusLabel = STATUS_LABEL;
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

  protected readonly istEdit = computed(() => this.gewuenschterModus() === 'edit' && this.darfBearbeiten());

  protected readonly selektion = computed<KartenSelektion | null>(() => {
    const o = this.objekt();
    return o ? { ebene: o.ebene, signatur: o.signatur } : null;
  });

  /** 360°-Aufnahmen liegen im Prototyp entlang von BE 7.2 (07.08). */
  protected readonly hat360Aufnahmen = computed(() => {
    const o = this.objekt();
    return !!o && (o.signatur === 'BE 7' || o.signatur.startsWith('BE 7.2'));
  });

  /** Flache Hierarchie der ganzen Strecke für das Dropdown. */
  protected readonly hierarchie = computed<IvsObjekt[]>(() => {
    const o = this.objekt();
    if (!o) return [];
    const strecke = this.store.strecke(o);
    const sortiert = (liste: IvsObjekt[]) =>
      [...liste].sort((a, b) => a.signatur.localeCompare(b.signatur, 'de-CH', { numeric: true }));
    const eintraege: IvsObjekt[] = [strecke];
    for (const lf of sortiert(this.store.kinder(strecke.signatur).filter((k) => k.ebene === 'linienfuehrung'))) {
      eintraege.push(lf, ...sortiert(this.store.kinder(lf.signatur)));
    }
    eintraege.push(...sortiert(this.store.kinder(strecke.signatur).filter((k) => k.ebene === 'wegbegleiter')));
    return eintraege;
  });

  protected readonly uebergaenge = computed<StatusUebergang[]>(() => {
    const o = this.objekt();
    if (!o) return [];
    return uebergaengeFuer(this.einstellungen.aktiveRolleId(), o.status);
  });

  protected readonly statusOptionen = computed(() => {
    const o = this.objekt();
    if (!o) return [];
    return [
      { wert: o.status, label: STATUS_LABEL[o.status] },
      ...this.uebergaenge().map((u) => ({ wert: u.nach, label: STATUS_LABEL[u.nach] })),
    ];
  });

  protected readonly eingeklappt = signal<ReadonlySet<string>>(new Set());
  protected readonly situierungsUrl = signal<string | null>(null);
  protected readonly inexistentBegruendung = signal('');
  protected readonly neueLognotiz = signal('');
  protected readonly logOffen = signal(false);

  /** Die drei Teile der NHG-Bewertung mit ihren Hinweistexten. */
  protected readonly bewertungsTeile: readonly { schluessel: BewertungsSchluessel; titel: string; hinweis: string }[] = [
    {
      schluessel: 'geschichte',
      titel: 'Geschichte',
      hinweis: 'Verkehrshistorischer und allgemein historischer Wert.',
    },
    {
      schluessel: 'morphologie',
      titel: 'Morphologie',
      hinweis: 'Landschaftsqualität, Anzahl Kunstbauten und Wegbegleiter, Seltenheit, Erhaltungszustand.',
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

    // Situierungsbild (Dufourkarte) beim Objektwechsel nachladen
    effect(() => {
      const o = this.objekt();
      untracked(() => this.situierungsUrl.set(null));
      if (!o) return;
      void this.geo.situierungsBild(o.ebene, o.signatur).then((url) => {
        // nur setzen, wenn das Objekt inzwischen nicht gewechselt hat
        if (untracked(() => this.objekt())?.id === o.id) this.situierungsUrl.set(url);
      });
    });
  }

  ngOnDestroy(): void {
    this.sync.setzeSelektion(null);
  }

  // ------------------------------------------------------------------ Modus

  protected modusUmschalten(): void {
    this.gewuenschterModus.set(this.istEdit() ? 'view' : 'edit');
  }

  // ------------------------------------------------------------- Formularwerte

  protected patch(patch: Partial<IvsObjekt>): void {
    const o = this.objekt();
    if (o) this.store.update(o.id, patch);
  }

  protected patchBewertung(schluessel: BewertungsSchluessel, aenderung: Partial<BewertungsTeil>): void {
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
    this.store.setStatus(o.id, status as WorkflowStatus);
    this.protokolliere(o.id, `Status: ${STATUS_LABEL[o.status]} → ${STATUS_LABEL[status as WorkflowStatus]}`);
  }

  protected uebergangAusfuehren(uebergang: StatusUebergang): void {
    this.statusSetzen(uebergang.nach);
  }

  // ------------------------------------------------------------- Aktionen

  protected loeschen(): void {
    const o = this.objekt();
    if (!o) return;
    this.store.loeschen(o.id);
    void this.router.navigate(['/dashboard']);
  }

  protected inexistentSetzen(): void {
    const o = this.objekt();
    const begruendung = this.inexistentBegruendung().trim();
    if (!o || !begruendung) return;
    this.patch({ inexistent: { seit: heute(), begruendung } });
    this.protokolliere(o.id, `Auf inexistent gesetzt: ${begruendung}`);
    this.inexistentBegruendung.set('');
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
    this.store.lognotizHinzufuegen(id, { datum: heute(), autor: NAME_FUER_ROLLE[rolle], rolle, text });
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

  protected abschnittUmschalten(schluessel: string): void {
    this.eingeklappt.update((menge) => {
      const neu = new Set(menge);
      if (neu.has(schluessel)) neu.delete(schluessel);
      else neu.add(schluessel);
      return neu;
    });
  }

  protected layerPanel(): void {
    this.karte()?.panelUmschalten();
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
