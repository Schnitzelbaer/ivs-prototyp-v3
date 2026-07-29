import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { ObjektStore } from '../core/objekt-store';
import { Karte, KartenSelektion } from './karte';
import { KarteSync } from './karte-sync';

/**
 * Eigenständiges Kartenfenster («Karte in neuem Tab öffnen») — erfüllt die
 * Arbeitshilfe-Anforderung, Karte und Beschrieb in separaten Fenstern zu
 * öffnen. Der Zustand wird über KarteSync mit dem Hauptfenster abgeglichen:
 * Die Selektion folgt der Objektbearbeitung; ein Klick auf ein Objekt hier
 * navigiert das Hauptfenster dorthin.
 */
@Component({
  selector: 'ivs-karte-fenster',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Karte],
  template: `
    <div class="relative h-dvh w-full">
      <ivs-karte class="block h-full" [selektion]="selektion()" (objektKlick)="objektKlick($event)" />
      @if (selektionsTitel(); as titel) {
        <div class="absolute top-3 left-1/2 -translate-x-1/2 rounded-md border border-border bg-background/95 px-3 py-1.5 text-sm font-medium shadow-md backdrop-blur">
          {{ titel }}
        </div>
      }
    </div>
  `,
})
export class KarteFenster {
  private readonly store = inject(ObjektStore);
  private readonly sync = inject(KarteSync);

  /** Objekt-Id aus dem Query-Parameter «sig» (Initial-Selektion). */
  readonly sig = input<string>();

  protected readonly selektion = signal<KartenSelektion | null>(null);

  protected readonly selektionsTitel = computed(() => {
    const auswahl = this.selektion();
    if (!auswahl) return null;
    const objekt = this.store.bySignatur(auswahl.signatur);
    return objekt ? `${objekt.signatur} – ${objekt.name}` : auswahl.signatur;
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
    // Selektion des Hauptfensters übernehmen
    effect(() => {
      const vonAussen = this.sync.selektionVonAussen();
      if (vonAussen !== null) this.selektion.set(vonAussen);
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
}
