import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCalendarPlus,
  lucideCamera,
  lucideMagnet,
  lucideMapPin,
  lucideMerge,
  lucideMessageSquarePlus,
  lucideScissors,
  lucideSpline,
  lucideTrash2,
} from '@ng-icons/lucide';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmNativeSelectImports } from '@spartan-ng/helm/native-select';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { HlmToasterImports } from '@spartan-ng/helm/sonner';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { darfBegehungPlanen } from '../core/begehungen';
import { EinstellungenStore } from '../core/einstellungen-store';
import { HinweisStore } from '../core/hinweis-store';
import { KommentarStore, jetztLokal } from '../core/kommentare';
import { ObjektStore } from '../core/objekt-store';
import { darfEditieren } from '../core/rollen';
import { NAME_FUER_ROLLE, rolleFuerStatus } from '../core/seed-data';
import { STATUS_LABEL } from '../core/status';
import { KommentarPanel } from '../kommentare/kommentar-panel';
import { BegehungDialog } from '../panorama/begehung-dialog';
import { HinweisDialog } from '../shell/hinweis-dialog';
import { Karte, KartenSelektion } from './karte';
import { KarteSync } from './karte-sync';

/**
 * Eigenständiges Kartenfenster («Karte in neuem Tab öffnen») — erfüllt die
 * Arbeitshilfe-Anforderung, Karte und Beschrieb in separaten Fenstern zu
 * öffnen. Der Panel-Kopf kommt mit: Tabs (Karte, 360° Bilder, Kommentare)
 * und Werkzeuge inklusive Geometrie-Editing und Karten-Kommentar; die
 * Stores gleichen sich über storage-Ereignisse mit dem Hauptfenster ab.
 * Der Zustand läuft über KarteSync: Die Selektion folgt der
 * Objektbearbeitung; ein Klick auf ein Objekt hier navigiert das
 * Hauptfenster dorthin.
 */
@Component({
  selector: 'ivs-karte-fenster',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    NgIcon,
    HlmButtonImports,
    HlmDialogImports,
    HlmInputImports,
    HlmLabelImports,
    HlmNativeSelectImports,
    HlmTabsImports,
    HlmToasterImports,
    HlmTooltipImports,
    BegehungDialog,
    HinweisDialog,
    Karte,
    KommentarPanel,
  ],
  providers: [
    provideIcons({
      lucideCalendarPlus,
      lucideCamera,
      lucideMagnet,
      lucideMapPin,
      lucideMerge,
      lucideMessageSquarePlus,
      lucideScissors,
      lucideSpline,
      lucideTrash2,
    }),
  ],
  template: `
    <div class="flex h-dvh w-full flex-col">
      <hlm-tabs
        [tab]="kartenTab()"
        (tabActivated)="kartenTab.set($event)"
        class="flex min-h-0 flex-1 flex-col"
      >
        <div class="flex items-center gap-2 border-b border-border px-2 py-1.5">
          <hlm-tabs-list aria-label="Kartenpanel">
            <button hlmTabsTrigger="karte">Karte</button>
            <button hlmTabsTrigger="bilder360">360° Bilder</button>
            <button hlmTabsTrigger="kommentare">Kommentare</button>
          </hlm-tabs-list>
          @if (selektionsTitel(); as titel) {
            <span class="min-w-0 truncate text-sm font-medium text-muted-foreground">
              {{ titel }}
            </span>
          }
          <div class="ml-auto flex items-center gap-1">
            @if (kartenTab() === 'karte') {
              <button
                hlmBtn
                [variant]="geometrieModus() ? 'secondary' : 'ghost'"
                size="icon"
                type="button"
                (click)="geometrieModusUmschalten()"
                [hlmTooltip]="
                  geometrieModus()
                    ? 'Geometrie-Bearbeitung abschliessen'
                    : 'Geometrie bearbeiten (05.05)'
                "
                aria-label="Geometrie bearbeiten"
              >
                <ng-icon name="lucideSpline" />
              </button>
              <button
                hlmBtn
                [variant]="kommentarModusAktiv() ? 'secondary' : 'ghost'"
                size="icon"
                type="button"
                (click)="kommentarWerkzeug()"
                hlmTooltip="Kommentar auf der Karte platzieren (Klick wählt die Position)"
                aria-label="Kommentar auf der Karte platzieren"
              >
                <ng-icon name="lucideMessageSquarePlus" />
              </button>
            }
          </div>
        </div>

        <!-- Geometrie-Werkzeuge (05.05/05.09) — wie im Kartenpanel des Objekt-Details -->
        @if (geometrieModus()) {
          <div
            class="flex flex-wrap items-center gap-1 border-b border-border bg-muted/40 px-2 py-1.5"
          >
            <button
              hlmBtn
              [variant]="editWerkzeug() === 'polyline' ? 'secondary' : 'ghost'"
              size="icon"
              type="button"
              (click)="karte()?.geometrieZeichnen('polyline')"
              hlmTooltip="Linie zeichnen (Doppelklick beendet)"
              aria-label="Linie zeichnen"
            >
              <ng-icon name="lucideSpline" />
            </button>
            <button
              hlmBtn
              [variant]="editWerkzeug() === 'point' ? 'secondary' : 'ghost'"
              size="icon"
              type="button"
              (click)="karte()?.geometrieZeichnen('point')"
              hlmTooltip="Punkt setzen"
              aria-label="Punkt setzen"
            >
              <ng-icon name="lucideMapPin" />
            </button>
            <div class="mx-1 h-5 w-px bg-border"></div>
            <button
              hlmBtn
              variant="ghost"
              size="icon"
              type="button"
              (click)="karte()?.geometrieZusammenfuegen()"
              hlmTooltip="Alle Linien zusammenfügen"
              aria-label="Linien zusammenfügen"
            >
              <ng-icon name="lucideMerge" />
            </button>
            <button
              hlmBtn
              [variant]="editWerkzeug() === 'verschneiden' ? 'secondary' : 'ghost'"
              size="icon"
              type="button"
              (click)="karte()?.geometrieVerschneiden()"
              hlmTooltip="Verschneiden: Schnittlinie zeichnen, die Linien teilt"
              aria-label="Verschneiden"
            >
              <ng-icon name="lucideScissors" />
            </button>
            <button
              hlmBtn
              variant="ghost"
              size="icon"
              type="button"
              [disabled]="editAuswahl() === 0"
              (click)="karte()?.geometrieLoeschen()"
              hlmTooltip="Selektierte Arbeitsgeometrie löschen"
              aria-label="Selektierte löschen"
            >
              <ng-icon name="lucideTrash2" />
            </button>
            <div class="mx-1 h-5 w-px bg-border"></div>
            <button
              hlmBtn
              [variant]="snappingAn() ? 'secondary' : 'ghost'"
              size="icon"
              type="button"
              (click)="karte()?.snappingUmschalten()"
              hlmTooltip="Snapping an bestehender Geometrie (05.09)"
              aria-label="Snapping umschalten"
            >
              <ng-icon name="lucideMagnet" />
            </button>
            <span class="ml-auto text-xs text-muted-foreground">
              Klick auf eine Zeichnung: verschieben und Stützpunkte ziehen
            </span>
          </div>
        }

        <div hlmTabsContent="karte" class="min-h-0 flex-1">
          <ivs-karte
            class="block h-full"
            [selektion]="selektion()"
            [geometrieEditObjekt]="geometrieModus() ? (selektion()?.signatur ?? null) : null"
            (geometrieGeaendert)="geometrieGeaendert($event)"
            (objektKlick)="objektKlick($event)"
            (kommentarKlick)="kommentarPinGeklickt($event)"
            (kommentarPosition)="kommentarPositionGewaehlt($event)"
          />
        </div>
        <div hlmTabsContent="bilder360" class="min-h-0 flex-1 overflow-y-auto p-4">
          @if (hat360Aufnahmen()) {
            <p class="text-sm text-muted-foreground">
              Entlang dieses Objekts liegen 360°-Aufnahmen der Befahrung 2025 (07.08).
            </p>
            <a hlmBtn variant="outline" size="sm" class="mt-3" routerLink="/panorama">
              <ng-icon name="lucideCamera" />
              360°-Aufnahmen öffnen
            </a>
          } @else {
            <p class="text-sm text-muted-foreground">
              Für dieses Objekt sind keine 360°-Aufnahmen verknüpft.
            </p>
          }
          <div class="mt-4 border-t border-border pt-4">
            <p class="text-sm text-muted-foreground">
              Eine Begehung lässt sich direkt von hier planen — das Objekt steht bereits auf der
              Liste.
            </p>
            <button
              hlmBtn
              variant="outline"
              size="sm"
              class="mt-2"
              type="button"
              (click)="begehungPlanenKlick()"
            >
              <ng-icon name="lucideCalendarPlus" />
              Begehung planen
            </button>
          </div>
        </div>
        <div hlmTabsContent="kommentare" class="min-h-0 flex-1">
          <ivs-kommentar-panel
            class="block h-full"
            [objektSignatur]="selektion()?.signatur ?? null"
            [zusatzKommentarId]="pinKommentarId()"
          />
        </div>
      </hlm-tabs>
    </div>

    <!-- Kommentar auf der Karte (05.11) -->
    <hlm-dialog
      [state]="kartenKommentarOffen() ? 'open' : 'closed'"
      (stateChanged)="kartenKommentarOffen.set($event === 'open')"
    >
      <hlm-dialog-content *hlmDialogPortal>
        <hlm-dialog-header>
          <h3 hlmDialogTitle>Kommentar auf der Karte</h3>
          <p hlmDialogDescription>
            Räumliche Notiz an der gewählten Position — die Zuweisung zu einem Objekt ist optional.
          </p>
        </hlm-dialog-header>
        <div class="grid gap-3 py-2">
          <div class="grid gap-1.5">
            <label hlmLabel for="kf-titel">Titel</label>
            <input
              hlmInput
              id="kf-titel"
              [ngModel]="kartenKommentarTitel()"
              (ngModelChange)="kartenKommentarTitel.set($event)"
            />
          </div>
          <div class="grid gap-1.5">
            <label hlmLabel for="kf-text">Kommentar <span class="text-destructive">*</span></label>
            <textarea
              hlmInput
              id="kf-text"
              class="min-h-20 w-full"
              [ngModel]="kartenKommentarText()"
              (ngModelChange)="kartenKommentarText.set($event)"
            ></textarea>
          </div>
          <div class="grid gap-1.5">
            <label hlmLabel for="kf-objekt">Objekt <span class="text-destructive">*</span></label>
            <hlm-native-select
              id="kf-objekt"
              [ngModel]="kartenKommentarZuweisung()"
              (ngModelChange)="kartenKommentarZuweisung.set($event)"
            >
              <option hlmNativeSelectOption value="">— Objekt wählen</option>
              @for (eintrag of alleObjekte(); track eintrag.id) {
                <option hlmNativeSelectOption [value]="eintrag.signatur">
                  {{ eintrag.signatur }} – {{ eintrag.name }}
                </option>
              }
            </hlm-native-select>
          </div>
        </div>
        <hlm-dialog-footer>
          <button hlmBtn variant="outline" type="button" (click)="kartenKommentarOffen.set(false)">
            Abbrechen
          </button>
          <button
            hlmBtn
            type="button"
            [disabled]="!kartenKommentarText().trim() || !kartenKommentarZuweisung()"
            (click)="kartenKommentarSpeichern()"
          >
            Kommentar speichern
          </button>
        </hlm-dialog-footer>
      </hlm-dialog-content>
    </hlm-dialog>

    <!-- Begehung planen (07.08) -->
    <ivs-begehung-dialog [(offen)]="begehungOffen" [vorauswahl]="selektion()?.signatur ?? null" />

    <hlm-toaster />
    <ivs-hinweis-dialog />
  `,
})
export class KarteFenster {
  private readonly store = inject(ObjektStore);
  private readonly kommentarStore = inject(KommentarStore);
  private readonly einstellungen = inject(EinstellungenStore);
  private readonly hinweis = inject(HinweisStore);
  private readonly sync = inject(KarteSync);

  protected readonly karte = viewChild(Karte);

  /** Objekt-Id aus dem Query-Parameter «sig» (Initial-Selektion). */
  readonly sig = input<string>();

  protected readonly selektion = signal<KartenSelektion | null>(null);
  protected readonly kartenTab = signal('karte');
  protected readonly pinKommentarId = signal<string | null>(null);
  protected readonly begehungOffen = signal(false);

  // Geometrie-Editing (05.05)
  protected readonly geometrieModus = signal(false);
  protected readonly geometrieAnzahl = signal(0);
  private geometrieGeaendertFlag = false;
  protected readonly editWerkzeug = computed(() => this.karte()?.editWerkzeug() ?? null);
  protected readonly editAuswahl = computed(() => this.karte()?.editAuswahlAnzahl() ?? 0);
  protected readonly snappingAn = computed(() => this.karte()?.snappingAn() ?? true);
  protected readonly kommentarModusAktiv = computed(() => this.karte()?.kommentarModus() ?? false);

  // Dialog «Kommentar auf Karte» (05.11)
  protected readonly kartenKommentarOffen = signal(false);
  protected readonly kartenKommentarPosition = signal<{ lon: number; lat: number } | null>(null);
  protected readonly kartenKommentarTitel = signal('');
  protected readonly kartenKommentarText = signal('');
  protected readonly kartenKommentarZuweisung = signal('');

  protected readonly alleObjekte = computed(() =>
    [...this.store.alle()].sort((a, b) =>
      a.signatur.localeCompare(b.signatur, 'de-CH', { numeric: true }),
    ),
  );

  protected readonly selektionsTitel = computed(() => {
    const auswahl = this.selektion();
    if (!auswahl) return null;
    const objekt = this.store.bySignatur(auswahl.signatur);
    return objekt ? `${objekt.signatur} – ${objekt.name}` : auswahl.signatur;
  });

  /** 360°-Aufnahmen liegen im Prototyp entlang von BE 7.2 (07.08). */
  protected readonly hat360Aufnahmen = computed(() => {
    const signatur = this.selektion()?.signatur;
    return !!signatur && (signatur === 'BE 7' || signatur.startsWith('BE 7.2'));
  });

  constructor() {
    // Initial-Selektion aus der URL, bis das Hauptfenster etwas meldet
    effect(() => {
      const id = this.sig();
      if (id && !this.selektion()) {
        const objekt = this.store.byId(id);
        if (objekt) this.selektion.set({ ebene: objekt.ebene, signatur: objekt.signatur });
      }
    });
    // Selektion des Hauptfensters übernehmen; ein laufendes Geometrie-Editing
    // wird dabei sauber beendet (die Karte speichert unter der Signatur)
    effect(() => {
      const vonAussen = this.sync.selektionVonAussen();
      if (vonAussen !== null) {
        if (this.selektion()?.signatur !== vonAussen?.signatur && this.geometrieModus()) {
          this.geometrieModus.set(false);
        }
        this.selektion.set(vonAussen);
      }
    });
    this.sync.frageSelektionAn();
  }

  protected objektKlick(signatur: string): void {
    const objekt = this.store.bySignatur(signatur);
    if (!objekt) return;
    this.selektion.set({ ebene: objekt.ebene, signatur: objekt.signatur });
    // Hauptfenster informieren — die Shell navigiert zur Objektbearbeitung
    this.sync.sendeObjektKlick(signatur);
  }

  // ------------------------------------------------------ Geometrie-Editing

  protected geometrieModusUmschalten(): void {
    const auswahl = this.selektion();
    if (!auswahl) {
      this.hinweis.zeige(
        'Geometrie bearbeiten nicht möglich',
        'Zuerst ein Objekt wählen (Klick auf der Karte oder Auswahl im Hauptfenster) — die Arbeitsgeometrien gehören zu einem Objekt.',
      );
      return;
    }
    const objekt = this.store.bySignatur(auswahl.signatur);
    const rolle = this.einstellungen.aktiveRolleId();
    if (!this.geometrieModus() && objekt && !darfEditieren(rolle, objekt.status)) {
      this.hinweis.zeige(
        'Geometrie bearbeiten nicht möglich',
        `Im Status «${STATUS_LABEL[objekt.status]}» kann die Rolle ` +
          `«${this.einstellungen.aktiveRolle().name}» dieses Objekt nicht bearbeiten. ` +
          `Am Zug ist: ${rolleFuerStatus(objekt.status)}.`,
      );
      return;
    }
    const neu = !this.geometrieModus();
    if (!neu && this.geometrieGeaendertFlag && objekt) {
      this.store.lognotizHinzufuegen(objekt.id, {
        datum: jetztLokal().slice(0, 10),
        autor: NAME_FUER_ROLLE[rolle],
        rolle,
        text: `Kartengeometrie bearbeitet — ${this.geometrieAnzahl()} Arbeitsgeometrie(n) (05.07).`,
      });
      toast.success('Geometrie übernommen', {
        description: `${objekt.signatur} — ${this.geometrieAnzahl()} Arbeitsgeometrie(n) gespeichert und historisiert.`,
      });
      this.geometrieGeaendertFlag = false;
    }
    this.geometrieModus.set(neu);
  }

  protected geometrieGeaendert(anzahl: number): void {
    this.geometrieAnzahl.set(anzahl);
    this.geometrieGeaendertFlag = true;
  }

  /** «Begehung planen»: nur R-03/04/06/07 — sonst erklärt ein Modal. */
  protected begehungPlanenKlick(): void {
    if (!darfBegehungPlanen(this.einstellungen.aktiveRolleId())) {
      this.hinweis.zeige(
        'Begehungsplanung nicht möglich',
        `Begehungen planen können die Fachliche Administration (R-03), die Regionale ` +
          `Koordination (R-04), das Fachlektorat (R-06) und die Fachliche Prüfstelle (R-07) — ` +
          `nicht die Rolle «${this.einstellungen.aktiveRolle().name}».`,
      );
      return;
    }
    this.begehungOffen.set(true);
  }

  // ------------------------------------------------------------- Kommentare

  protected kommentarWerkzeug(): void {
    this.karte()?.kommentarWerkzeugUmschalten();
  }

  protected kommentarPinGeklickt(id: string): void {
    this.pinKommentarId.set(id);
    this.kartenTab.set('kommentare');
  }

  protected kommentarPositionGewaehlt(position: {
    lon: number;
    lat: number;
    signatur: string | null;
  }): void {
    this.kartenKommentarPosition.set(position);
    // Pflicht-Zuweisung (Entscheid 88): getroffenes Objekt, sonst Selektion
    this.kartenKommentarZuweisung.set(position.signatur ?? this.selektion()?.signatur ?? '');
    this.kartenKommentarTitel.set('');
    this.kartenKommentarText.set('');
    this.kartenKommentarOffen.set(true);
  }

  protected kartenKommentarSpeichern(): void {
    const position = this.kartenKommentarPosition();
    const text = this.kartenKommentarText().trim();
    if (!position || !text || !this.kartenKommentarZuweisung()) return;
    const rolle = this.einstellungen.aktiveRolleId();
    this.kommentarStore.hinzufuegen({
      objektSignatur: this.kartenKommentarZuweisung(),
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
}
