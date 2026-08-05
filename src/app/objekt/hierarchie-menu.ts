import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  TemplateRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideFolderInput } from '@ng-icons/lucide';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmNativeSelectImports } from '@spartan-ng/helm/native-select';
import { EinstellungenStore } from '../core/einstellungen-store';
import { HinweisStore } from '../core/hinweis-store';
import { IvsObjekt, objektTyp, objektTypText } from '../core/model';
import { ObjektStore } from '../core/objekt-store';
import { darfEditieren } from '../core/rollen';
import { NAME_FUER_ROLLE } from '../core/seed-data';
import { STATUS_LABEL } from '../core/status';
import { jetztLokal } from '../core/kommentare';
import { TypSymbol } from '../karte/typ-symbol';

/**
 * Fokussiert beim Öffnen des Menüs die aktive Zeile (`data-aktiv`) statt
 * des ersten Eintrags — der CDK-Standardfokus liess sonst zusätzlich zur
 * Markierung des aktiven Objekts immer die Strecke (erste Zeile) als
 * ausgewählt erscheinen.
 */
@Directive({ selector: '[ivsFokusAktiv]' })
export class HierarchieMenuFokus {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterNextRender(() => {
      // nach dem CDK-eigenen Fokus auf den ersten Eintrag
      setTimeout(() => {
        this.element.nativeElement.querySelector<HTMLElement>('[data-aktiv]')?.focus();
      });
    });
  }
}

/**
 * Hierarchie-Menü einer Strecke (Objekt-Detail und Objekte-Übersicht):
 * alle Ebenen mit Legenden-Symbol und Typ-Tag, ein Klick wählt das Objekt.
 * Das Umteilen (07.09) hängt je Child-Zeile am «…»-Kontextmenü; der
 * frühere Sammel-Eintrag am Menüende ist entfallen.
 *
 * Verwendung: `<ivs-hierarchie-menu #menu … />` und den Trigger-Button mit
 * `[hlmDropdownMenuTrigger]="menu.menuTemplate()"` verbinden.
 */
@Component({
  selector: 'ivs-hierarchie-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    NgIcon,
    HlmBadgeImports,
    HlmButtonImports,
    HlmDialogImports,
    HlmDropdownMenuImports,
    HlmLabelImports,
    HlmNativeSelectImports,
    HierarchieMenuFokus,
    TypSymbol,
  ],
  providers: [provideIcons({ lucideFolderInput })],
  template: `
    <ng-template #menuTpl>
      <hlm-dropdown-menu ivsFokusAktiv class="w-[27rem]">
        @for (eintrag of hierarchie(); track eintrag.id) {
          <!-- pr-2: Platz für den Overlay-Scrollbalken des Menüs -->
          <div class="flex items-center pr-2">
            <button
              hlmDropdownMenuItem
              class="min-w-0 flex-1"
              (triggered)="gewaehlt.emit(eintrag)"
              [attr.data-aktiv]="eintrag.id === objekt().id ? '' : null"
              [class.bg-accent]="eintrag.id === objekt().id"
              [class.font-semibold]="eintrag.id === objekt().id"
            >
              <span
                class="flex min-w-0 flex-1 items-center gap-2"
                [class.pl-0]="eintrag.ebene === 'strecke'"
                [class.pl-4]="
                  eintrag.ebene === 'linienfuehrung' || eintrag.ebene === 'wegbegleiter'
                "
                [class.pl-8]="eintrag.ebene === 'abschnitt'"
              >
                <ivs-typ-symbol [typ]="typ(eintrag)" />
                <span class="truncate">
                  @switch (eintrag.ebene) {
                    @case ('strecke') {
                      {{ eintrag.signatur }} {{ eintrag.name }}
                    }
                    @case ('wegbegleiter') {
                      {{ eintrag.name }}
                    }
                    @default {
                      {{ eintrag.signatur.slice(3) }} {{ eintrag.name }}
                    }
                  }
                </span>
                <span
                  hlmBadge
                  variant="outline"
                  class="ml-auto shrink-0 text-[10px] font-normal text-muted-foreground"
                >
                  {{ typText(eintrag) }}
                </span>
              </span>
            </button>
            @if (eintrag.ebene !== 'strecke') {
              <!-- Eigenes Klick-Kontextmenü: ein hlmDropdownMenuTrigger im
                   Menü würde vom CDK als Submenü behandelt (öffnet auf Hover)
                   und im Injector des äusseren Triggers instanziert (Icons
                   fehlen) — deshalb Inline-SVG und ein fixed-Overlay. -->
              <button
                type="button"
                class="relative shrink-0 rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-foreground pointer-coarse:after:absolute pointer-coarse:after:-inset-1.5 pointer-coarse:after:content-['']"
                (click)="kontextOeffnen($event, eintrag)"
                [attr.aria-label]="'Aktionen für ' + eintrag.signatur"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <circle cx="12" cy="5" r="1.8" />
                  <circle cx="12" cy="12" r="1.8" />
                  <circle cx="12" cy="19" r="1.8" />
                </svg>
              </button>
            }
          </div>
        }
      </hlm-dropdown-menu>
    </ng-template>

    <!-- Kontextmenü der Zeile (öffnet nur per Klick). Als natives Popover,
         weil das CDK-Menü im Top-Layer des Browsers liegt (popover-Attribut
         auf dem Overlay) — dort gewinnt kein z-index; nur ein später
         geöffnetes Popover liegt darüber. -->
    <div
      #kontextPopover
      popover="manual"
      class="fixed inset-0 m-0 size-auto overflow-visible border-0 bg-transparent p-0"
      (click)="kontextSchliessen()"
    >
      @if (kontext(); as k) {
        <div
          class="absolute w-56 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
          [style.left.px]="k.x"
          [style.top.px]="k.y"
        >
          <button
            type="button"
            class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
            (click)="umteilenStarten()"
          >
            <ng-icon name="lucideFolderInput" />
            Objekt umteilen …
          </button>
        </div>
      }
    </div>

    <!-- Objekt umteilen (07.09) -->
    <hlm-dialog
      [state]="umteilenOffen() ? 'open' : 'closed'"
      (stateChanged)="umteilenOffen.set($event === 'open')"
    >
      @if (umteilenObjekt(); as u) {
        <hlm-dialog-content *hlmDialogPortal>
          <hlm-dialog-header>
            <h3 hlmDialogTitle>{{ u.signatur }} umteilen</h3>
            <p hlmDialogDescription>
              Das Objekt wird einem anderen übergeordneten Objekt zugeteilt ({{
                u.ebene === 'abschnitt' ? 'Linienführung' : 'Strecke'
              }}). Die Signatur wird bei der Umsetzung neu vergeben — im Prototyp bleibt sie
              unverändert.
            </p>
          </hlm-dialog-header>
          <div class="grid gap-1.5 py-2">
            <label hlmLabel for="ut-ziel">Neues übergeordnetes Objekt</label>
            <hlm-native-select
              id="ut-ziel"
              [ngModel]="umteilenZiel()"
              (ngModelChange)="umteilenZiel.set($event)"
            >
              <option hlmNativeSelectOption value="">Bitte wählen …</option>
              @for (ziel of umteilenZiele(); track ziel.id) {
                <option hlmNativeSelectOption [value]="ziel.signatur">
                  {{ ziel.signatur }} – {{ ziel.name }}
                </option>
              }
            </hlm-native-select>
            <p class="text-xs text-muted-foreground">Bisher: {{ u.parent ?? '—' }}</p>
          </div>
          <hlm-dialog-footer>
            <button hlmBtn variant="outline" type="button" (click)="umteilenOffen.set(false)">
              Abbrechen
            </button>
            <button hlmBtn type="button" [disabled]="!umteilenZiel()" (click)="umteilenSpeichern()">
              Umteilen
            </button>
          </hlm-dialog-footer>
        </hlm-dialog-content>
      }
    </hlm-dialog>
  `,
})
export class HierarchieMenu {
  private readonly store = inject(ObjektStore);
  private readonly einstellungen = inject(EinstellungenStore);
  private readonly hinweis = inject(HinweisStore);

  /** Bezugsobjekt — bestimmt die Strecke und die Hervorhebung im Menü. */
  readonly objekt = input.required<IvsObjekt>();
  /** Klick auf einen Eintrag (Objekt öffnen bzw. auswählen). */
  readonly gewaehlt = output<IvsObjekt>();

  readonly menuTemplate = viewChild.required<TemplateRef<unknown>>('menuTpl');
  private readonly kontextPopover =
    viewChild.required<ElementRef<HTMLElement>>('kontextPopover');

  protected readonly typ = objektTyp;
  protected readonly typText = objektTypText;

  /** Offenes «…»-Kontextmenü: Position (fixed) und betroffene Zeile. */
  protected readonly kontext = signal<{ x: number; y: number; objekt: IvsObjekt } | null>(null);
  protected readonly umteilenObjekt = signal<IvsObjekt | null>(null);
  protected readonly umteilenOffen = signal(false);
  protected readonly umteilenZiel = signal('');

  /** Flache Hierarchie der ganzen Strecke. */
  protected readonly hierarchie = computed<IvsObjekt[]>(() => {
    const o = this.objekt();
    const strecke = this.store.strecke(o);
    const sortiert = (liste: IvsObjekt[]) =>
      [...liste].sort((a, b) => a.signatur.localeCompare(b.signatur, 'de-CH', { numeric: true }));
    const eintraege: IvsObjekt[] = [strecke];
    for (const lf of sortiert(
      this.store.kinder(strecke.signatur).filter((k) => k.ebene === 'linienfuehrung'),
    )) {
      eintraege.push(lf, ...sortiert(this.store.kinder(lf.signatur)));
    }
    eintraege.push(
      ...sortiert(this.store.kinder(strecke.signatur).filter((k) => k.ebene === 'wegbegleiter')),
    );
    return eintraege;
  });

  protected readonly umteilenZiele = computed(() => {
    const u = this.umteilenObjekt();
    if (!u || u.ebene === 'strecke') return [];
    const zielEbene = u.ebene === 'abschnitt' ? 'linienfuehrung' : 'strecke';
    return this.store
      .alle()
      .filter((k) => k.ebene === zielEbene && k.signatur !== u.parent)
      .sort((a, b) => a.signatur.localeCompare(b.signatur, 'de-CH', { numeric: true }));
  });

  /** «…»-Klick: Kontextmenü an der Klickposition öffnen (nur per Klick). */
  protected kontextOeffnen(ereignis: MouseEvent, objekt: IvsObjekt): void {
    const x = Math.min(ereignis.clientX, window.innerWidth - 240);
    const y = Math.min(ereignis.clientY, window.innerHeight - 60);
    this.kontext.set({ x, y, objekt });
    // ins Top-Layer heben — nach dem offenen Menü, also über ihm
    this.kontextPopover().nativeElement.showPopover();
  }

  protected kontextSchliessen(): void {
    this.kontext.set(null);
    this.kontextPopover().nativeElement.hidePopover();
  }

  protected umteilenStarten(): void {
    const u = this.kontext()?.objekt;
    this.kontextSchliessen();
    if (!u) return;
    const rolle = this.einstellungen.aktiveRolleId();
    if (!darfEditieren(rolle, u.status)) {
      this.hinweis.zeige(
        'Umteilen nicht möglich',
        `Im Status «${STATUS_LABEL[u.status]}» kann die Rolle ` +
          `«${this.einstellungen.aktiveRolle().name}» das Objekt ${u.signatur} nicht umteilen (07.09).`,
      );
      return;
    }
    this.umteilenObjekt.set(u);
    this.umteilenZiel.set('');
    this.umteilenOffen.set(true);
  }

  protected umteilenSpeichern(): void {
    const u = this.umteilenObjekt();
    const ziel = this.umteilenZiel();
    if (!u || !ziel) return;
    const vorher = u.parent;
    const rolle = this.einstellungen.aktiveRolleId();
    this.store.update(u.id, { parent: ziel });
    this.store.lognotizHinzufuegen(u.id, {
      datum: jetztLokal().slice(0, 10),
      autor: NAME_FUER_ROLLE[rolle],
      rolle,
      text: `Umgeteilt: von ${vorher ?? '—'} zu ${ziel} (07.09). Die Signatur wird bei der Umsetzung neu vergeben.`,
    });
    this.umteilenOffen.set(false);
    toast.success(`${u.signatur} umgeteilt`, { description: `Neues Parent-Objekt: ${ziel}.` });
  }
}
