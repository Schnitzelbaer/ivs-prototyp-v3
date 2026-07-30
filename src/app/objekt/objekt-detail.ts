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
  lucideMessageSquarePlus,
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
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmNativeSelectImports } from '@spartan-ng/helm/native-select';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { EinstellungenStore } from '../core/einstellungen-store';
import { KommentarStore } from '../core/kommentare';
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
import { KommentarPanel } from '../kommentare/kommentar-panel';
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
    HlmDialogImports,
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
    KommentarPanel,
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
      lucideMessageSquarePlus,
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
  private readonly kommentarStore = inject(KommentarStore);
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

  protected readonly istEdit = computed(() => this.gewuenschterModus() === 'edit' && this.darfBearbeiten());

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

  /** Aktiver Tab des Kartenpanels — wechselbar auch programmatisch (Pin-Klick). */
  protected readonly kartenTab = signal('karte');
  protected readonly kommentarModusAktiv = computed(() => this.karte()?.kommentarModus() ?? false);

  // Dialog «Kommentar auf Karte» (05.11)
  protected readonly kartenKommentarOffen = signal(false);
  protected readonly kartenKommentarPosition = signal<{ lon: number; lat: number } | null>(null);
  protected readonly kartenKommentarTitel = signal('');
  protected readonly kartenKommentarText = signal('');
  protected readonly kartenKommentarZuweisung = signal('');

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

    // Situierungsbild (Dufourkarte) beim Objektwechsel nachladen — getrackt
    // wird nur die Selektion (mit Wertvergleich), nicht die Objektreferenz,
    // sonst würde jeder Formular-Tastendruck das Bild neu aufbauen
    effect(() => {
      const auswahl = this.selektion();
      untracked(() => this.situierungsUrl.set(null));
      if (!auswahl) return;
      void this.geo.situierungsBild(auswahl.ebene, auswahl.signatur).then((url) => {
        // nur setzen, wenn das Objekt inzwischen nicht gewechselt hat
        if (untracked(() => this.objekt())?.signatur === auswahl.signatur) this.situierungsUrl.set(url);
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
    const rolle = this.einstellungen.aktiveRolleId();
    this.store.statusWechseln(o.id, status as WorkflowStatus, NAME_FUER_ROLLE[rolle], rolle);
  }

  protected uebergangAusfuehren(uebergang: StatusUebergang): void {
    this.statusSetzen(uebergang.nach);
  }

  // ------------------------------------------------------------- Aktionen

  protected loeschen(): void {
    const o = this.objekt();
    if (!o || !this.darfLoeschen()) return;
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

  // ----------------------------------------------------------- Kommentare

  /** Alle Objekte für die Zuweisungs-Auswahl im Karten-Kommentar-Dialog. */
  protected readonly alleObjekte = computed(() =>
    [...this.store.alle()].sort((a, b) => a.signatur.localeCompare(b.signatur, 'de-CH', { numeric: true })),
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
      zeit: new Date().toISOString().slice(0, 19),
      erledigt: false,
      antworten: [],
    });
    this.kartenKommentarOffen.set(false);
  }

  protected kommentarPinGeklickt(): void {
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
