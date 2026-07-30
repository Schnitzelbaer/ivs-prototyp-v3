import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown, lucideDownload, lucideRotateCw, lucideSearch } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmNativeSelectImports } from '@spartan-ng/helm/native-select';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
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

type SortSpalte = 'signatur' | 'name' | 'ebene' | 'gemeinden' | 'nhg' | 'substanz' | 'bewertung' | 'status' | 'zustaendig';

const EBENEN_REIHENFOLGE: Ebene[] = ['strecke', 'linienfuehrung', 'abschnitt', 'wegbegleiter'];
const SUBSTANZ_REIHENFOLGE: (Substanzgrad | null)[] = [
  'viel_substanz',
  'mit_substanz',
  'wenig_substanz',
  'ohne_substanz',
  null,
];

/**
 * Objekte (04.01): vollständige Übersicht aller Objekte — im Unterschied zum
 * rollenspezifisch vorgefilterten Dashboard. Volltextsuche, Attributfilter,
 * Sortierung über alle Spalten (04.03), Export als Attrappe (04.05).
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
    HlmTableImports,
    HlmTooltipImports,
  ],
  providers: [provideIcons({ lucideChevronDown, lucideDownload, lucideRotateCw, lucideSearch })],
  templateUrl: './objekte.html',
})
export class Objekte {
  private readonly store = inject(ObjektStore);
  private readonly router = inject(Router);

  protected readonly statusLabel = STATUS_LABEL;
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

  protected readonly sortSpalte = signal<SortSpalte>('signatur');
  protected readonly sortAufsteigend = signal(true);

  protected readonly spalten: { id: SortSpalte; label: string }[] = [
    { id: 'signatur', label: 'Signatur' },
    { id: 'name', label: 'Bezeichnung' },
    { id: 'ebene', label: 'Ebene' },
    { id: 'gemeinden', label: 'Gemeinden' },
    { id: 'nhg', label: 'Bedeutung' },
    { id: 'substanz', label: 'Substanzgrad' },
    { id: 'bewertung', label: 'Bewertung' },
    { id: 'status', label: 'Workflow-Status' },
    { id: 'zustaendig', label: 'Zuständig' },
  ];

  protected readonly gefiltert = computed(() => {
    const begriff = this.suche().trim().toLowerCase();
    const spalte = this.sortSpalte();
    const richtung = this.sortAufsteigend() ? 1 : -1;

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
      .sort((a, b) => {
        // Objekte ohne Wert bleiben unabhängig von der Richtung am Ende
        const leerA = istLeer(a, spalte);
        const leerB = istLeer(b, spalte);
        if (leerA !== leerB) return leerA ? 1 : -1;
        return richtung * vergleiche(a, b, spalte);
      });
  });

  protected readonly gesamt = computed(() => this.store.alle().length);

  protected sortiere(spalte: SortSpalte): void {
    if (this.sortSpalte() === spalte) {
      this.sortAufsteigend.set(!this.sortAufsteigend());
    } else {
      this.sortSpalte.set(spalte);
      this.sortAufsteigend.set(true);
    }
  }

  protected filterZuruecksetzen(): void {
    this.suche.set('');
    this.statusFilter.set('alle');
    this.ebeneFilter.set('alle');
    this.bedeutungFilter.set('alle');
    this.substanzFilter.set('alle');
  }

  protected oeffne(objekt: IvsObjekt): void {
    void this.router.navigate(['/objekt', objekt.id]);
  }
}

function istLeer(objekt: IvsObjekt, spalte: SortSpalte): boolean {
  switch (spalte) {
    case 'bewertung':
      return bewertungMittel(objekt.bewertung) === null;
    case 'substanz':
      return objekt.substanzgrad === null;
    default:
      return false;
  }
}

function vergleiche(a: IvsObjekt, b: IvsObjekt, spalte: SortSpalte): number {
  switch (spalte) {
    case 'signatur':
      return a.signatur.localeCompare(b.signatur, 'de-CH', { numeric: true });
    case 'name':
      return a.name.localeCompare(b.name, 'de-CH');
    case 'ebene':
      return EBENEN_REIHENFOLGE.indexOf(a.ebene) - EBENEN_REIHENFOLGE.indexOf(b.ebene);
    case 'gemeinden':
      return a.gemeinden.localeCompare(b.gemeinden, 'de-CH');
    case 'nhg':
      return a.nhgWert.localeCompare(b.nhgWert, 'de-CH');
    case 'substanz':
      return SUBSTANZ_REIHENFOLGE.indexOf(a.substanzgrad) - SUBSTANZ_REIHENFOLGE.indexOf(b.substanzgrad);
    case 'bewertung': {
      // ohne Wertung ans Ende, sonst absteigend aussagekräftig — hier neutral aufsteigend
      const wa = bewertungMittel(a.bewertung);
      const wb = bewertungMittel(b.bewertung);
      if (wa === null && wb === null) return 0;
      if (wa === null) return 1;
      if (wb === null) return -1;
      return wa - wb;
    }
    case 'status':
      return ALLE_STATI.indexOf(a.status) - ALLE_STATI.indexOf(b.status);
    case 'zustaendig':
      return a.zustaendigName.localeCompare(b.zustaendigName, 'de-CH');
  }
}
