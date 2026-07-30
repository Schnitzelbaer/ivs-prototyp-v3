import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';

/**
 * Echt drehbares 360°-Panorama (Vorgabe 9): Das equirektangulare Bild (4:1)
 * läuft als horizontal wiederholter Hintergrund; Ziehen mit Maus oder Finger
 * dreht die Blickrichtung. `azimut` ist die Richtung der Bildmitte
 * (0 = Nord, im Uhrzeigersinn) und wird beim Ziehen laufend aktualisiert —
 * der Blickrichtungskegel auf der Karte dreht mit.
 */
@Component({
  selector: 'ivs-panorama-viewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      #box
      class="relative h-full w-full touch-none overflow-hidden bg-muted select-none"
      [class.cursor-grab]="!amZiehen()"
      [class.cursor-grabbing]="amZiehen()"
      [style.background-image]="'url(&quot;' + bild() + '&quot;)'"
      [style.background-repeat]="'repeat-x'"
      [style.background-size]="'auto 100%'"
      [style.background-position-x.px]="hintergrundX()"
      (pointerdown)="ziehenStart($event)"
      (pointermove)="ziehen($event)"
      (pointerup)="ziehenEnde($event)"
      (pointercancel)="ziehenEnde($event)"
      role="img"
      aria-label="360-Grad-Panorama, mit Ziehen drehbar"
    >
      <!-- Fadenkreuz der Blickrichtung -->
      <div class="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-foreground/25"></div>
      <!-- Kompassanzeige -->
      <div
        class="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-md border border-border bg-background/90 px-2.5 py-1 text-xs font-medium tabular-nums backdrop-blur"
      >
        Blickrichtung {{ azimutText() }}
      </div>
    </div>
  `,
})
export class PanoramaViewer implements AfterViewInit, OnDestroy {
  private readonly box = viewChild.required<ElementRef<HTMLDivElement>>('box');

  /** Data-URI des equirektangularen Panoramas (Breite = 4 × Höhe). */
  readonly bild = input.required<string>();
  /** Blickrichtung der Bildmitte in Grad, 0 = Nord. */
  readonly azimut = model(0);

  protected readonly amZiehen = signal(false);
  private readonly boxBreite = signal(0);
  private readonly boxHoehe = signal(0);

  private beobachter: ResizeObserver | null = null;
  private startX = 0;
  private startAzimut = 0;

  /** Bildbreite in Pixeln bei background-size auto 100 % (Bild ist 4:1). */
  private readonly bildBreite = computed(() => this.boxHoehe() * 4);

  protected readonly hintergrundX = computed(() => {
    const breite = this.bildBreite();
    if (!breite) return 0;
    // Pixelposition des Azimuts in der Containermitte ausrichten
    return this.boxBreite() / 2 - (this.azimut() / 360) * breite;
  });

  protected readonly azimutText = computed(() => {
    const grad = Math.round(((this.azimut() % 360) + 360) % 360);
    const richtungen = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
    const richtung = richtungen[Math.round(grad / 45) % 8];
    return `${grad}° ${richtung}`;
  });

  ngAfterViewInit(): void {
    const element = this.box().nativeElement;
    this.beobachter = new ResizeObserver(() => {
      this.boxBreite.set(element.clientWidth);
      this.boxHoehe.set(element.clientHeight);
    });
    this.beobachter.observe(element);
    this.boxBreite.set(element.clientWidth);
    this.boxHoehe.set(element.clientHeight);
  }

  ngOnDestroy(): void {
    this.beobachter?.disconnect();
  }

  protected ziehenStart(ereignis: PointerEvent): void {
    this.amZiehen.set(true);
    this.startX = ereignis.clientX;
    this.startAzimut = this.azimut();
    this.box().nativeElement.setPointerCapture(ereignis.pointerId);
  }

  protected ziehen(ereignis: PointerEvent): void {
    if (!this.amZiehen()) return;
    const breite = this.bildBreite();
    if (!breite) return;
    // Ziehen nach links dreht den Blick nach rechts (Azimut steigt)
    const delta = ((this.startX - ereignis.clientX) / breite) * 360;
    this.azimut.set((((this.startAzimut + delta) % 360) + 360) % 360);
  }

  protected ziehenEnde(ereignis: PointerEvent): void {
    if (!this.amZiehen()) return;
    this.amZiehen.set(false);
    this.box().nativeElement.releasePointerCapture(ereignis.pointerId);
  }
}
