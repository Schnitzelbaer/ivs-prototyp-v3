import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronRight,
  lucideDownload,
  lucideRotateCw,
  lucideSearch,
  lucideX,
} from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmNativeSelectImports } from '@spartan-ng/helm/native-select';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { KommentarStore } from '../core/kommentare';
import {
  EBENE_LABEL,
  Ebene,
  IvsObjekt,
  NHG_LABEL,
  NhgWert,
  SUBSTANZGRAD_LABEL,
  Substanzgrad,
  WorkflowStatus,
  bewertungMittel,
  bewertungText,
} from '../core/model';
import { ObjektStore } from '../core/objekt-store';
import { ALLE_STATI, STATUS_LABEL } from '../core/status';
import { Karte, KartenSelektion } from '../karte/karte';

type SortSpalte = 'signatur' | 'name' | 'status' | 'bewertung';

/** Farbpunkt je Workflow-Status für die kompakte Liste. */
const STATUS_FARBE: Record<WorkflowStatus, string> = {
  zugewiesen: 'bg-slate-400',
  in_bearbeitung: 'bg-blue-500',
  bereit_zur_pruefung: 'bg-amber-500',
  in_pruefung: 'bg-orange-500',
  korrektur: 'bg-red-500',
  geprueft: 'bg-teal-500',
  freigegeben: 'bg-green-500',
  publiziert: 'bg-green-700',
};

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
    HlmInputGroupImports,
    HlmNativeSelectImports,
    HlmTooltipImports,
    Karte,
  ],
  providers: [provideIcons({ lucideChevronRight, lucideDownload, lucideRotateCw, lucideSearch, lucideX })],
  templateUrl: './objekte.html',
})
export class Objekte {
  private readonly store = inject(ObjektStore);
  private readonly kommentarStore = inject(KommentarStore);
  private readonly router = inject(Router);

  protected readonly statusLabel = STATUS_LABEL;
  protected readonly statusFarbe = STATUS_FARBE;
  protected readonly ebeneLabel = EBENE_LABEL;
  protected readonly nhgLabel = NHG_LABEL;
  protected readonly substanzLabel = SUBSTANZGRAD_LABEL;
  protected readonly alleStati = ALLE_STATI;
  protected readonly bewertungText = bewertungText;

  protected readonly suche = signal('');
  protected readonly statusFilter = signal<'alle' | WorkflowStatus>('alle');
  protected readonly ebeneFilter = signal<'alle' | Ebene>('alle');
  protected readonly bedeutungFilter = signal<'alle' | NhgWert>('alle');
  protected readonly substanzFilter = signal<'alle' | Substanzgrad>('alle');
  protected readonly sortierung = signal<SortSpalte>('signatur');

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

  protected readonly gefiltert = computed(() => {
    const begriff = this.suche().trim().toLowerCase();
    const sortierung = this.sortierung();

    return this.store
      .alle()
      .filter((o) => {
        if (this.statusFilter() !== 'alle' && o.status !== this.statusFilter()) return false;
        if (this.ebeneFilter() !== 'alle' && o.ebene !== this.ebeneFilter()) return false;
        if (this.bedeutungFilter() !== 'alle' && o.nhgWert !== this.bedeutungFilter()) return false;
        if (this.substanzFilter() !== 'alle' && o.substanzgrad !== this.substanzFilter()) return false;
        if (begriff) {
          const text = `${o.signatur} ${o.name} ${o.gemeinden} ${o.zustaendigName}`.toLowerCase();
          if (!text.includes(begriff)) return false;
        }
        return true;
      })
      .sort((a, b) => vergleiche(a, b, sortierung));
  });

  protected readonly gesamt = computed(() => this.store.alle().length);

  protected waehle(objekt: IvsObjekt): void {
    this.auswahlSignatur.set(objekt.signatur);
  }

  protected waehleSignatur(signatur: string): void {
    if (this.store.bySignatur(signatur)) this.auswahlSignatur.set(signatur);
  }

  protected schliessePanel(): void {
    this.auswahlSignatur.set(null);
  }

  protected oeffneAuswahl(): void {
    const o = this.auswahl();
    if (o) void this.router.navigate(['/objekt', o.id]);
  }

  protected filterZuruecksetzen(): void {
    this.suche.set('');
    this.statusFilter.set('alle');
    this.ebeneFilter.set('alle');
    this.bedeutungFilter.set('alle');
    this.substanzFilter.set('alle');
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
