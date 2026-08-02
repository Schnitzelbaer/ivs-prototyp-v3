import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronDown,
  lucideChevronRight,
  lucideDownload,
  lucideRotateCw,
  lucideSearch,
  lucideSearchX,
  lucideX,
} from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmNativeSelectImports } from '@spartan-ng/helm/native-select';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { HerkunftStore } from '../core/herkunft-store';
import { KommentarStore } from '../core/kommentare';
import {
  EBENE_LABEL,
  IvsObjekt,
  NHG_LABEL,
  NhgWert,
  SUBSTANZGRAD_LABEL,
  Substanzgrad,
  WorkflowStatus,
  bewertungMittel,
  bewertungText,
  objektTyp,
  objektTypText,
} from '../core/model';
import { signaturKette } from '../core/objekt-generierung';
import { ObjektStore } from '../core/objekt-store';
import { ALLE_STATI, STATUS_FARBE, STATUS_LABEL } from '../core/status';
import { Karte, KartenSelektion } from '../karte/karte';
import { TypSymbol } from '../karte/typ-symbol';
import { HierarchieMenu } from '../objekt/hierarchie-menu';

type SortSpalte = 'signatur' | 'name' | 'status' | 'bewertung';

/** Eine Strecke der Baumliste samt ihrer (gefilterten) Nachkommen. */
interface StreckenAst {
  strecke: IvsObjekt;
  kinder: IvsObjekt[];
}

/**
 * Objekte (04.01) — Kartenansicht: Die Karte steht im Vordergrund, links
 * eine dezente, kompakte Objektliste. Ein Klick (Liste oder Karte) öffnet
 * rechts ein Side-Panel mit dem Objektinhalt und dem Sprung zur Bearbeitung.
 */
@Component({
  selector: 'ivs-objekte',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    NgIcon,
    HlmBadgeImports,
    HlmButtonImports,
    HlmDropdownMenuImports,
    HlmEmptyImports,
    HlmInputGroupImports,
    HlmNativeSelectImports,
    HlmTooltipImports,
    HierarchieMenu,
    Karte,
    TypSymbol,
  ],
  providers: [
    provideIcons({
      lucideChevronDown,
      lucideChevronRight,
      lucideDownload,
      lucideRotateCw,
      lucideSearch,
      lucideSearchX,
      lucideX,
    }),
  ],
  templateUrl: './objekte.html',
})
export class Objekte {
  private readonly store = inject(ObjektStore);
  private readonly kommentarStore = inject(KommentarStore);
  private readonly router = inject(Router);
  private readonly herkunft = inject(HerkunftStore);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly statusLabel = STATUS_LABEL;
  protected readonly statusFarbe = STATUS_FARBE;
  protected readonly ebeneLabel = EBENE_LABEL;
  protected readonly nhgLabel = NHG_LABEL;
  protected readonly substanzLabel = SUBSTANZGRAD_LABEL;
  protected readonly alleStati = ALLE_STATI;
  protected readonly bewertungText = bewertungText;
  protected readonly objektTyp = objektTyp;
  protected readonly objektTypText = objektTypText;

  /** Die drei Teile der NHG-Bewertung fürs Side-Panel. */
  protected readonly bewertungsTeile: readonly {
    schluessel: 'geschichte' | 'morphologie' | 'substanzwert';
    titel: string;
  }[] = [
    { schluessel: 'geschichte', titel: 'Geschichte' },
    { schluessel: 'morphologie', titel: 'Morphologie' },
    { schluessel: 'substanzwert', titel: 'Substanzwert' },
  ];

  protected readonly suche = signal('');
  protected readonly statusFilter = signal<'alle' | WorkflowStatus>('alle');
  protected readonly bedeutungFilter = signal<'alle' | NhgWert>('alle');
  protected readonly substanzFilter = signal<'alle' | Substanzgrad>('alle');
  protected readonly sortierung = signal<SortSpalte>('signatur');

  /** Manuell aufgeklappte Strecken (bei aktiver Suche sind alle offen). */
  protected readonly aufgeklappt = signal<ReadonlySet<string>>(new Set());

  /** Signatur des im Side-Panel geöffneten Objekts. */
  protected readonly auswahlSignatur = signal<string | null>(null);

  protected readonly auswahl = computed(() => {
    const signatur = this.auswahlSignatur();
    return signatur ? (this.store.bySignatur(signatur) ?? null) : null;
  });

  protected readonly kartenSelektion = computed<KartenSelektion | null>(
    () => {
      const o = this.auswahl();
      return o ? { ebene: o.ebene, signatur: o.signatur } : null;
    },
    { equal: (a, b) => a?.signatur === b?.signatur && a?.ebene === b?.ebene },
  );

  protected readonly kommentarAnzahl = computed(() => {
    const o = this.auswahl();
    return o ? this.kommentarStore.fuerObjekt(o.signatur).length : 0;
  });

  /** Filterprädikat ohne Ebenen-Bezug (wirkt auf alle Ebenen gleich). */
  private passtFilter(o: IvsObjekt, begriff: string): boolean {
    if (this.statusFilter() !== 'alle' && o.status !== this.statusFilter()) return false;
    if (this.bedeutungFilter() !== 'alle' && o.nhgWert !== this.bedeutungFilter()) return false;
    if (this.substanzFilter() !== 'alle' && o.substanzgrad !== this.substanzFilter()) return false;
    if (begriff) {
      const text = `${o.signatur} ${o.name} ${o.gemeinden} ${o.zustaendigName}`.toLowerCase();
      if (!text.includes(begriff)) return false;
    }
    return true;
  }

  private filterAktiv(begriff: string): boolean {
    return (
      !!begriff ||
      this.statusFilter() !== 'alle' ||
      this.bedeutungFilter() !== 'alle' ||
      this.substanzFilter() !== 'alle'
    );
  }

  /**
   * Baumliste: nur Strecken auf erster Ebene, die Nachkommen (Linienführungen
   * mit ihren Abschnitten, dann Wegbegleiter) erscheinen beim Aufklappen.
   * Bei aktiven Filtern bleiben Strecken stehen, wenn sie selbst oder ein
   * Nachkomme passt — die Kinderliste ist dann auf die Treffer reduziert.
   */
  protected readonly baum = computed<StreckenAst[]>(() => {
    const begriff = this.suche().trim().toLowerCase();
    const aktiv = this.filterAktiv(begriff);
    const sortierung = this.sortierung();

    const strecken: IvsObjekt[] = [];
    const proParent = new Map<string, IvsObjekt[]>();
    for (const o of this.store.alle()) {
      if (o.ebene === 'strecke') {
        strecken.push(o);
      } else if (o.parent) {
        const liste = proParent.get(o.parent) ?? [];
        liste.push(o);
        proParent.set(o.parent, liste);
      }
    }
    const sortiert = (liste: IvsObjekt[]) =>
      liste.sort((a, b) => a.signatur.localeCompare(b.signatur, 'de-CH', { numeric: true }));
    for (const liste of proParent.values()) sortiert(liste);

    const aeste: StreckenAst[] = [];
    for (const strecke of strecken.sort((a, b) => vergleiche(a, b, sortierung))) {
      const direkte = proParent.get(strecke.signatur) ?? [];
      const kinder: IvsObjekt[] = [];
      for (const lf of direkte.filter((k) => k.ebene === 'linienfuehrung')) {
        kinder.push(lf, ...(proParent.get(lf.signatur) ?? []));
      }
      kinder.push(...direkte.filter((k) => k.ebene === 'wegbegleiter'));

      const passende = aktiv ? kinder.filter((k) => this.passtFilter(k, begriff)) : kinder;
      if (!aktiv || this.passtFilter(strecke, begriff) || passende.length) {
        aeste.push({ strecke, kinder: passende });
      }
    }
    return aeste;
  });

  protected readonly streckenGesamt = computed(
    () => this.store.alle().filter((o) => o.ebene === 'strecke').length,
  );

  /** Bei aktiver Suche sind alle Äste offen, sonst die manuell aufgeklappten. */
  protected istOffen(signatur: string): boolean {
    return this.suche().trim() !== '' || this.aufgeklappt().has(signatur);
  }

  protected aufklappen(signatur: string): void {
    this.aufgeklappt.update((menge) => {
      const neu = new Set(menge);
      if (neu.has(signatur)) neu.delete(signatur);
      else neu.add(signatur);
      return neu;
    });
  }

  protected waehle(objekt: IvsObjekt): void {
    this.auswahlSignatur.set(objekt.signatur);
    // Die zugehörige Strecke aufklappen, damit die Markierung sichtbar ist
    if (objekt.ebene !== 'strecke') {
      const strecke = signaturKette(objekt.signatur).strecke;
      if (strecke) this.aufgeklappt.update((menge) => new Set(menge).add(strecke));
    }
  }

  /** Karten-Klick öffnet in jedem Fall zuerst die Preview im Side-Panel. */
  protected oeffneSignatur(signatur: string): void {
    const objekt = this.store.bySignatur(signatur);
    if (objekt) this.waehle(objekt);
  }

  protected schliessePanel(): void {
    this.auswahlSignatur.set(null);
  }

  protected oeffneAuswahl(): void {
    const o = this.auswahl();
    if (!o) return;
    this.herkunft.uebersicht.set('/objekte');
    void this.router.navigate(['/objekt', o.id]);
  }

  protected filterZuruecksetzen(): void {
    this.suche.set('');
    this.statusFilter.set('alle');
    this.bedeutungFilter.set('alle');
    this.substanzFilter.set('alle');
  }

  /** Beschriebe sind seit dem Rich-Text-Editor HTML — wie im Detail rendern. */
  protected alsHtml(text: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(text);
  }
}

function vergleiche(a: IvsObjekt, b: IvsObjekt, spalte: SortSpalte): number {
  switch (spalte) {
    case 'signatur':
      return a.signatur.localeCompare(b.signatur, 'de-CH', { numeric: true });
    case 'name':
      return a.name.localeCompare(b.name, 'de-CH');
    case 'status':
      return ALLE_STATI.indexOf(a.status) - ALLE_STATI.indexOf(b.status);
    case 'bewertung': {
      const wa = bewertungMittel(a.bewertung);
      const wb = bewertungMittel(b.bewertung);
      if (wa === null && wb === null) return 0;
      if (wa === null) return 1;
      if (wb === null) return -1;
      return wb - wa; // beste zuerst
    }
  }
}
