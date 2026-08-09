import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  AfterViewInit,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import EsriMap from '@arcgis/core/Map.js';
import * as geometryEngine from '@arcgis/core/geometry/geometryEngine.js';
import type Polygon from '@arcgis/core/geometry/Polygon.js';
import Polyline from '@arcgis/core/geometry/Polyline.js';
import * as geometryJsonUtils from '@arcgis/core/geometry/support/jsonUtils.js';
import { GeometrieStore } from '../core/geometrie-store';
import { KommentarStore } from '../core/kommentare';
import GeoJSONLayer from '@arcgis/core/layers/GeoJSONLayer.js';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer.js';
import WebTileLayer from '@arcgis/core/layers/WebTileLayer.js';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol.js';
import SimpleLineSymbol from '@arcgis/core/symbols/SimpleLineSymbol.js';
import MapView from '@arcgis/core/views/MapView.js';
import SketchViewModel from '@arcgis/core/widgets/Sketch/SketchViewModel.js';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBlend, lucideChevronDown, lucideEye, lucideEyeOff } from '@ng-icons/lucide';
import { HlmCollapsibleImports } from '@spartan-ng/helm/collapsible';
import { ObjektStore } from '../core/objekt-store';
import Graphic from '@arcgis/core/Graphic.js';
import Extent from '@arcgis/core/geometry/Extent.js';
import Point from '@arcgis/core/geometry/Point.js';
import * as webMercatorUtils from '@arcgis/core/geometry/support/webMercatorUtils.js';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol.js';
import TextSymbol from '@arcgis/core/symbols/TextSymbol.js';
import { toast } from '@spartan-ng/brain/sonner';
import { Ebene, ObjektTyp, objektTyp } from '../core/model';
import { signaturKette } from '../core/objekt-generierung';
import { ObjektGeo } from './objekt-geo';
import {
  BASEMAP_DEFS,
  LAYER_DEFS,
  LayerDef,
  OBJEKT_LAYER_IDS,
  OVERLAY_DEFS,
  ROUTEN_REF_LAYER_IDS,
  erzeugeLayer,
  erzeugeObjektLayer,
  erzeugeWebTileLayer,
  routenNummernFuerStrecken,
} from './karten-layer';
import { TypSymbol } from './typ-symbol';

export interface KartenSelektion {
  ebene: Ebene;
  signatur: string;
}

/** Eintrag im Hover-MapTip bzw. Klick-Kontextmenü: ein getroffenes Objekt. */
interface Treffer {
  signatur: string;
  name: string;
  /** Einrücktiefe in der Hierarchie (0 = Strecke). */
  tiefe: number;
  /** Objekttyp fürs Legenden-Symbol (null, wenn das Objekt unbekannt ist). */
  typ: ObjektTyp | null;
}

/**
 * Trefferradius für Hover und Klick in Bildschirmpixeln. `hitTest` prüft
 * nur die gerenderten Symbolpixel (3-px-Linien wären kaum zu treffen) und
 * liefert bei GeoJSON-Layern zudem nur die Renderer-Attribute — deshalb
 * suchen wir stattdessen räumlich mit einem Umkreis um den Zeiger.
 */
const TREFFER_RADIUS_PX = 8;
const TREFFER_RADIUS_TOUCH_PX = 14;

/**
 * Wiederverwendbare ArcGIS-Karte: swisstopo-WMTS-Hintergrund und die Layer
 * aus `ivs-map` — die Objekt-Zuordnung ist in die bestehenden Layer
 * eingerechnet (siehe karten-layer.ts). Das Layer-Panel («Objekte») liegt
 * als Overlay unten rechts; Polygon-Selektion und Panel-Umschaltung werden
 * von der einbettenden Seite über die öffentlichen Methoden gesteuert.
 */
@Component({
  selector: 'ivs-karte',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, HlmCollapsibleImports, TypSymbol],
  providers: [provideIcons({ lucideBlend, lucideChevronDown, lucideEye, lucideEyeOff })],
  template: `
    <div class="relative h-full w-full overflow-hidden">
      <div #kartenDiv class="h-full w-full"></div>

      <!-- Hover-MapTip: Hierarchie der getroffenen Objekte am Cursor -->
      @if (mapTip(); as tip) {
        <div
          class="pointer-events-none absolute z-10 max-w-72 rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md"
          [style.left.px]="tip.x"
          [style.top.px]="tip.y"
        >
          @for (eintrag of tip.eintraege; track eintrag.signatur) {
            <div
              class="flex items-center gap-1.5 truncate leading-5"
              [style.padding-left.rem]="eintrag.tiefe * 0.75"
            >
              @if (eintrag.typ) {
                <ivs-typ-symbol [typ]="eintrag.typ" />
              }
              <span class="shrink-0 font-mono text-[10px] text-muted-foreground">{{
                eintrag.signatur
              }}</span>
              <span class="truncate">{{ eintrag.name }}</span>
            </div>
          }
        </div>
      }

      <!-- Kontextmenü bei Mehrfachtreffern: Objekt zum Öffnen wählen -->
      @if (kontextMenu(); as menu) {
        <div
          class="absolute z-10 min-w-64 max-w-80 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
          [style.left.px]="menu.x"
          [style.top.px]="menu.y"
        >
          <p class="px-2 pt-1 pb-0.5 text-xs text-muted-foreground">Getroffene Objekte</p>
          @for (eintrag of menu.eintraege; track eintrag.signatur) {
            <button
              type="button"
              class="flex w-full items-center gap-1.5 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
              [style.padding-left.rem]="0.5 + eintrag.tiefe * 0.75"
              (click)="kontextEintragWaehlen(eintrag.signatur)"
            >
              @if (eintrag.typ) {
                <ivs-typ-symbol [typ]="eintrag.typ" />
              }
              <span class="shrink-0 font-mono text-[11px] text-muted-foreground">{{
                eintrag.signatur
              }}</span>
              <span class="min-w-0 truncate">{{ eintrag.name }}</span>
            </button>
          }
        </div>
      }

      <!-- Kartenbild-Panel: Hintergründe additiv, Objekttypen mit Legende -->
      <div
        hlmCollapsible
        [expanded]="true"
        #panelAuf="brnCollapsible"
        class="absolute right-3 bottom-6 w-60 rounded-md border border-border bg-background/95 shadow-md backdrop-blur"
      >
        <button
          hlmCollapsibleTrigger
          class="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold"
        >
          Kartenbild
          <ng-icon
            name="lucideChevronDown"
            class="transition-transform"
            [class.rotate-180]="!panelAuf.expanded()"
          />
        </button>
        <div hlmCollapsibleContent class="max-h-96 overflow-y-auto px-1 pb-2">
          <!-- Hintergründe (05.04): additiv, je Eintrag Deckkraft und Auge -->
          <p class="px-2 pt-1 pb-0.5 text-xs font-medium text-muted-foreground">Hintergrund</p>
          @for (hintergrund of hintergruende; track hintergrund.id) {
            <div class="rounded-sm px-2 py-0.5 text-sm hover:bg-accent">
              <div class="flex items-center gap-1.5">
                <span
                  class="min-w-0 flex-1 truncate"
                  [class.text-muted-foreground]="!hintergrundSichtbar()[hintergrund.id]"
                >
                  {{ hintergrund.titel }}
                </span>
                <button
                  type="button"
                  class="relative text-muted-foreground hover:text-foreground pointer-coarse:after:absolute pointer-coarse:after:-inset-x-2 pointer-coarse:after:-inset-y-2.5 pointer-coarse:after:content-['']"
                  [class.text-primary]="deckkraftOffen()[hintergrund.id]"
                  (click)="deckkraftUmschalten(hintergrund.id)"
                  [attr.aria-label]="'Deckkraft ' + hintergrund.titel + ' einstellen'"
                >
                  <ng-icon name="lucideBlend" size="14" />
                </button>
                <button
                  type="button"
                  class="relative text-muted-foreground hover:text-foreground pointer-coarse:after:absolute pointer-coarse:after:-inset-x-2 pointer-coarse:after:-inset-y-2.5 pointer-coarse:after:content-['']"
                  (click)="hintergrundUmschalten(hintergrund.id)"
                  [attr.aria-label]="
                    hintergrund.titel + (hintergrundSichtbar()[hintergrund.id] ? ' ausblenden' : ' einblenden')
                  "
                >
                  <ng-icon
                    [name]="hintergrundSichtbar()[hintergrund.id] ? 'lucideEye' : 'lucideEyeOff'"
                    size="15"
                  />
                </button>
              </div>
              @if (deckkraftOffen()[hintergrund.id]) {
                <input
                  type="range"
                  min="0"
                  max="100"
                  class="mt-0.5 h-1.5 w-full accent-primary"
                  [value]="hintergrundDeckkraft()[hintergrund.id]"
                  (input)="hintergrundDeckkraftSetzen(hintergrund.id, $event)"
                  [attr.aria-label]="'Deckkraft ' + hintergrund.titel"
                />
              }
            </div>
          }

          <!-- Objekte: gemeinsame Deckkraft hinter dem Blend-Icon -->
          <div class="flex items-center gap-1.5 px-2 pt-2 pb-0.5">
            <span class="flex-1 text-xs font-medium text-muted-foreground">Objekte</span>
            <button
              type="button"
              class="relative text-muted-foreground hover:text-foreground pointer-coarse:after:absolute pointer-coarse:after:-inset-x-2 pointer-coarse:after:-inset-y-2.5 pointer-coarse:after:content-['']"
              [class.text-primary]="objektDeckkraftOffen()"
              (click)="objektDeckkraftOffen.set(!objektDeckkraftOffen())"
              aria-label="Deckkraft der Objekte einstellen"
            >
              <ng-icon name="lucideBlend" size="14" />
            </button>
          </div>
          @if (objektDeckkraftOffen()) {
            <div class="px-2 pb-1">
              <input
                type="range"
                min="10"
                max="100"
                class="h-1.5 w-full accent-primary"
                [value]="objektDeckkraft()"
                (input)="objektDeckkraftSetzen($event)"
                aria-label="Deckkraft der IVS-Objekte"
              />
            </div>
          }
          <ul>
            @for (def of layerDefs; track def.id) {
              <li>
                <div class="flex items-center gap-2 rounded-sm px-2 py-1 text-sm hover:bg-accent">
                  @switch (def.legende.form) {
                    @case ('linie') {
                      <span
                        class="h-0.75 w-4 shrink-0 rounded-full"
                        [style.background]="rgb(def.legende.farbe)"
                      ></span>
                    }
                    @case ('linie-duenn') {
                      <span
                        class="h-0.5 w-4 shrink-0 rounded-full"
                        [style.background]="rgb(def.legende.farbe)"
                      ></span>
                    }
                    @case ('linie-dick') {
                      <span
                        class="h-1.5 w-4 shrink-0 rounded-full"
                        [style.background]="rgb(def.legende.farbe)"
                      ></span>
                    }
                    @case ('linie-gestrichelt') {
                      <span
                        class="w-4 shrink-0 border-t border-dashed"
                        [style.border-color]="rgb(def.legende.farbe)"
                      ></span>
                    }
                    @case ('punkt') {
                      <span
                        class="size-2.5 shrink-0 rounded-full"
                        [style.background]="rgb(def.legende.farbe)"
                      ></span>
                    }
                    @case ('flaeche') {
                      <span
                        class="size-3 shrink-0 rounded-xs opacity-70"
                        [style.background]="rgb(def.legende.farbe)"
                      ></span>
                    }
                  }
                  <span
                    class="min-w-0 flex-1 truncate"
                    [class.text-muted-foreground]="!sichtbarkeit()[def.id]"
                  >
                    {{ def.titel }}
                  </span>
                  <button
                    type="button"
                    class="relative text-muted-foreground hover:text-foreground pointer-coarse:after:absolute pointer-coarse:after:-inset-x-2 pointer-coarse:after:-inset-y-2.5 pointer-coarse:after:content-['']"
                    (click)="layerUmschalten(def.id)"
                    [attr.aria-label]="
                      'Layer ' +
                      def.titel +
                      (sichtbarkeit()[def.id] ? ' ausblenden' : ' einblenden')
                    "
                  >
                    <ng-icon
                      [name]="sichtbarkeit()[def.id] ? 'lucideEye' : 'lucideEyeOff'"
                      size="15"
                    />
                  </button>
                </div>
              </li>
            }
          </ul>
        </div>
      </div>
    </div>
  `,
})
export class Karte implements AfterViewInit, OnDestroy {
  private readonly kartenDiv = viewChild.required<ElementRef<HTMLDivElement>>('kartenDiv');

  /** Hervorzuhebendes Objekt; alles andere wird abgeblendet. */
  readonly selektion = input<KartenSelektion | null>(null);
  /** Standort einer 360°-Aufnahme (Marker mit Blickrichtungskegel). */
  readonly panoramaStandort = input<{ lon: number; lat: number } | null>(null);
  /** Blickrichtung der 360°-Aufnahme in Grad (0 = Nord, im Uhrzeigersinn). */
  readonly panoramaAzimut = input(0);
  /** Beim Klick auf ein Objekt der Objekt-Layer: Signatur. */
  readonly objektKlick = output<string>();
  /** Signaturen innerhalb des gezeichneten Polygons, null = Filter aufgehoben. */
  readonly polygonFilter = output<string[] | null>();
  /** Beim Klick auf einen Kommentar-Pin: Kommentar-Id. */
  readonly kommentarKlick = output<string>();
  /** Nach dem Platzieren mit dem Kommentar-Werkzeug: gewählte Position. */
  /**
   * Gewählte Kommentar-Position samt dem an der Stelle getroffenen Objekt
   * (Vorbelegung der Pflicht-Zuweisung, Entscheid 88) — null, wenn im
   * Umkreis nichts liegt.
   */
  readonly kommentarPosition = output<{ lon: number; lat: number; signatur: string | null }>();
  /** Geometrie-Editing (05.05): Signatur des zu bearbeitenden Objekts, null = aus. */
  readonly geometrieEditObjekt = input<string | null>(null);
  /**
   * Nur die Objekte dieser Strecken anzeigen (Signaturen, samt allen
   * Unterobjekten); null = kein Filter. Gedacht für Listen-Synchronisation:
   * Die Karte zeigt nur, was die Liste daneben aufführt.
   */
  readonly streckenFilter = input<readonly string[] | null>(null);

  /**
   * Begehungs-Route (Entscheid 89): nummerierte Ziele in Reihenfolge,
   * verbunden mit einer gestrichelten Linie; die Karte zoomt darauf.
   */
  readonly begehungsPunkte = input<
    readonly { lon: number; lat: number; nummer: number; titel: string }[] | null
  >(null);
  /** Nach jeder Geometrie-Änderung: aktuelle Anzahl Arbeitsgeometrien. */
  readonly geometrieGeaendert = output<number>();

  private readonly kommentarStore = inject(KommentarStore);
  private readonly geometrieStore = inject(GeometrieStore);
  private readonly objektStore = inject(ObjektStore);
  private readonly objektGeo = inject(ObjektGeo);

  protected readonly layerDefs = LAYER_DEFS;
  /** Hintergründe (Basemaps und Raster-Overlays), additiv kombinierbar. */
  protected readonly hintergruende = [
    ...BASEMAP_DEFS.map((b) => ({ ...b, deckkraft: 100, sichtbar: b.id === 'pk-grau' })),
    ...OVERLAY_DEFS.map((o) => ({ ...o, sichtbar: false })),
  ];
  readonly polygonAktiv = signal(false);
  /** Kommentar-Werkzeug aktiv: nächster Kartenklick wählt die Position. */
  readonly kommentarModus = signal(false);
  /** Snapping des Geometrie-Editings (05.09) — an bestehender Geometrie. */
  readonly snappingAn = signal(true);
  /** Anzahl aktuell im Update-Modus selektierter Arbeitsgeometrien. */
  readonly editAuswahlAnzahl = signal(0);
  /** Aktives Zeichenwerkzeug des Geometrie-Editings. */
  readonly editWerkzeug = signal<'polyline' | 'point' | 'verschneiden' | 'tracing' | null>(null);

  /** Hover-MapTip: Hierarchie der unter dem Cursor getroffenen Objekte. */
  protected readonly mapTip = signal<{ x: number; y: number; eintraege: Treffer[] } | null>(null);
  /** Klick-Kontextmenü bei Mehrfachtreffern. */
  protected readonly kontextMenu = signal<{ x: number; y: number; eintraege: Treffer[] } | null>(
    null,
  );

  protected readonly hintergrundSichtbar = signal<Record<string, boolean>>(
    Object.fromEntries(this.hintergruende.map((h) => [h.id, h.sichtbar])),
  );
  protected readonly hintergrundDeckkraft = signal<Record<string, number>>(
    Object.fromEntries(this.hintergruende.map((h) => [h.id, h.deckkraft])),
  );
  /** Aufgeklappte Deckkraft-Slider (standardmässig versteckt). */
  protected readonly deckkraftOffen = signal<Record<string, boolean>>({});
  protected readonly objektDeckkraft = signal(100);
  protected readonly objektDeckkraftOffen = signal(false);
  protected readonly sichtbarkeit = signal<Record<string, boolean>>(
    Object.fromEntries(LAYER_DEFS.map((d) => [d.id, d.sichtbar])),
  );

  private view: MapView | null = null;
  private map: EsriMap | null = null;
  private layers = new Map<string, GeoJSONLayer>();
  /** Die beiden Objekt-Layer (Linien + Wegbegleiter-Punkte). */
  private objektLayers: GeoJSONLayer[] = [];
  private skizzenLayer: GraphicsLayer | null = null;
  private markerLayer: GraphicsLayer | null = null;
  private kommentarLayer: GraphicsLayer | null = null;
  private begehungsLayer: GraphicsLayer | null = null;
  /**
   * Bearbeitete Geometrien ALLER Objekte (Entscheid 91): Sobald ein Objekt
   * Arbeitsgeometrien hat, ersetzen sie sein Original auf der Karte — sie
   * bleiben über die räumliche Treffersuche anwählbar wie zuvor.
   */
  private bearbeitetLayer: GraphicsLayer | null = null;
  /** Tracing (05.09): erster gewählter Punkt auf einer Original-Linie. */
  private tracingStart: { pfad: [number, number][]; s: number } | null = null;
  private tracingMarker: Graphic | null = null;
  private kegelGraphic: Graphic | null = null;
  private sketch: SketchViewModel | null = null;
  private erstZoomErledigt = false;

  private hintergrundLayers = new Map<string, WebTileLayer>();
  private editLayer: GraphicsLayer | null = null;
  private editSketch: SketchViewModel | null = null;
  private verschneideModus = false;
  private zerstoert = false;
  /**
   * Während des Objektwechsels im Geometrie-Modus feuert das cancel()
   * synchron ein update-complete-Event — ohne diesen Guard würde
   * geometrienSpeichern die Arbeitsgeometrien des ALTEN Objekts unter der
   * bereits gewechselten NEUEN Signatur ablegen und deren Stand zerstören.
   */
  private editWechselLaeuft = false;

  /** Zuletzt angewendete Selektion — verhindert redundante goTo/Query-Läufe,
   *  wenn sich nur die Objektreferenz, nicht aber die Selektion ändert. */
  private letzteSelektion: KartenSelektion | null | undefined;
  /** SDK-Highlights der aktuellen Selektion (pro Layer-View ein Handle). */
  private highlightHandles: { remove(): void }[] = [];
  /**
   * Startzeit des laufenden Hover-hitTests (0 = keiner). Zeitbasiert statt
   * boolesch: Ein hitTest, dessen Promise nie auflöst (z. B. gedrosseltes
   * WebGL in verstecktem Fenster), darf den Hover nicht dauerhaft sperren.
   */
  private hoverLaeuftSeit = 0;

  constructor() {
    effect(() => {
      const auswahl = this.selektion();
      if (
        this.letzteSelektion !== undefined &&
        auswahl?.signatur === this.letzteSelektion?.signatur &&
        auswahl?.ebene === this.letzteSelektion?.ebene
      ) {
        return;
      }
      if (this.view && this.objektLayers.length) {
        this.letzteSelektion = auswahl;
        void this.wendeSelektionAn(auswahl);
      }
    });
    // Standortwechsel: Marker neu setzen und hinfahren
    effect(() => {
      const standort = this.panoramaStandort();
      if (this.view && this.markerLayer) {
        this.setzePanoramaMarker(standort);
      }
    });
    // Reine Drehung: nur das Kegel-Symbol rotieren
    effect(() => {
      const azimut = this.panoramaAzimut();
      if (this.kegelGraphic) {
        this.kegelGraphic.symbol = kegelSymbol(azimut);
      }
    });
    // Kommentar-Pins aus dem Store spiegeln (05.11: räumliche Notizen)
    effect(() => {
      this.kommentarStore.alle(); // Tracking
      this.zeichneKommentarPins();
    });
    // Deckkraft der Objekt-Layer
    effect(() => {
      const deckkraft = this.objektDeckkraft() / 100;
      for (const layer of this.objektLayers) layer.opacity = deckkraft;
    });
    // Geometrie-Editing an-/abschalten bzw. Objekt wechseln
    effect(() => {
      const signatur = this.geometrieEditObjekt();
      untracked(() => this.geometrieEditStarten(signatur));
    });
    // Strecken-Filter auf die Objekt-Layer anwenden
    effect(() => {
      const filter = this.streckenFilter();
      untracked(() => this.wendeStreckenFilterAn(filter));
    });
    // Begehungs-Route zeichnen (Entscheid 89)
    effect(() => {
      const punkte = this.begehungsPunkte();
      untracked(() => this.zeichneBegehungsRoute(punkte));
    });
    // Bearbeitete Geometrien spiegeln und die Originale ausblenden (E91):
    // hängt am Geometrie-Store (auch storage-synchron) und am Edit-Objekt
    effect(() => {
      this.geometrieStore.alle();
      this.geometrieEditObjekt();
      untracked(() => {
        this.zeichneBearbeitete();
        this.wendeStreckenFilterAn(this.streckenFilter());
      });
    });
  }

  /**
   * Bearbeitete Geometrien aller Objekte zeichnen — ausser des gerade
   * editierten (dessen Arbeitsgeometrien liegen im Edit-Layer). Die
   * Graphics tragen die Objektzuordnung für die räumliche Treffersuche.
   */
  private zeichneBearbeitete(): void {
    const layer = this.bearbeitetLayer;
    if (!layer) return;
    layer.removeAll();
    const editiert = this.geometrieEditObjekt();
    for (const [signatur, geometrien] of Object.entries(this.geometrieStore.alle())) {
      if (signatur === editiert || !geometrien.length) continue;
      const kette = signaturKette(signatur);
      for (const json of geometrien) {
        const geometry = geometryJsonUtils.fromJSON(json as never);
        if (!geometry) continue;
        layer.add(
          new Graphic({
            geometry,
            attributes: {
              signatur,
              lf: kette.lf,
              strecke: kette.strecke || signatur,
            },
            symbol: geometry.type === 'point' ? editPunktSymbol() : editLinienSymbol(),
          }),
        );
      }
    }
    // Neu gezeichnete Graphics respektieren eine bestehende Selektion
    this.bearbeiteteAbblenden(this.letzteSelektion ?? null);
  }

  /**
   * Nummerierte Begehungs-Ziele samt Verbindungslinie zeichnen und den
   * Ausschnitt darauf einpassen.
   */
  private zeichneBegehungsRoute(
    punkte: readonly { lon: number; lat: number; nummer: number; titel: string }[] | null,
  ): void {
    const layer = this.begehungsLayer;
    if (!layer) return;
    layer.removeAll();
    if (!punkte || punkte.length === 0) return;
    if (punkte.length > 1) {
      layer.add(
        new Graphic({
          geometry: new Polyline({
            paths: [punkte.map((p) => [p.lon, p.lat])],
            spatialReference: { wkid: 4326 },
          }),
          symbol: new SimpleLineSymbol({
            color: [79, 70, 229, 0.7],
            width: 2,
            style: 'short-dash',
          }),
        }),
      );
    }
    for (const punkt of punkte) {
      const position = new Point({ longitude: punkt.lon, latitude: punkt.lat });
      layer.add(
        new Graphic({
          geometry: position,
          symbol: new SimpleMarkerSymbol({
            color: [79, 70, 229],
            size: 22,
            outline: { color: [255, 255, 255], width: 2 },
          }),
          attributes: { titel: punkt.titel },
        }),
      );
      layer.add(
        new Graphic({
          geometry: position,
          symbol: new TextSymbol({
            text: String(punkt.nummer),
            color: [255, 255, 255],
            font: { size: 11, weight: 'bold' },
            yoffset: -5,
          }),
        }),
      );
    }
    // Ausschnitt auf die Route einpassen — und den Erstzoom auf alle
    // Objekte abbestellen, der ihn sonst gleich wieder übersteuern würde
    this.erstZoomErledigt = true;
    const lons = punkte.map((p) => p.lon);
    const lats = punkte.map((p) => p.lat);
    const rand = 0.004;
    void this.view?.goTo(
      new Extent({
        xmin: Math.min(...lons) - rand,
        ymin: Math.min(...lats) - rand,
        xmax: Math.max(...lons) + rand,
        ymax: Math.max(...lats) + rand,
        spatialReference: { wkid: 4326 },
      }),
      { animate: false },
    );
  }

  /** Laufnummer gegen überholende asynchrone Filter-Anwendungen. */
  private streckenFilterLauf = 0;

  /**
   * definitionExpression je Layer neu setzen: Objekt-Layer über das
   * gestempelte Feld `strecke`, die routengebundenen Layer (Wegoberflächen,
   * Böschung, Grenzmarken) über `route_nr` — deren Nummern kommen asynchron
   * aus der Objekt-Zuordnung. Die Brücken-Detektion hat keine Referenz.
   */
  private wendeStreckenFilterAn(filter: readonly string[] | null): void {
    const lauf = ++this.streckenFilterLauf;
    const basisVon = (id: string) => LAYER_DEFS.find((d) => d.id === id)?.filter;
    const setze = (id: string, ...zusaetze: (string | null)[]) => {
      const layer = this.layers.get(id);
      if (!layer) return;
      layer.definitionExpression = [basisVon(id), ...zusaetze].filter(Boolean).join(' AND ');
    };

    // Originale von Objekten mit bearbeiteter Geometrie ausblenden (E91):
    // die bearbeitete Version ersetzt sie auf der Karte. Bewusst nur über
    // das exakte signatur-Feld — eine Ausblendung über strecke/lf würde
    // sämtliche Kinder-Features mitreissen und unanwählbar machen
    // (Review-Befund); bei Strecken/Linienführungen mit eigener
    // Arbeitsgeometrie bleibt darum eine Überlagerung möglich.
    const bearbeitet = Object.entries(this.geometrieStore.alle())
      .filter(([, geometrien]) => geometrien.length)
      .map(([signatur]) => signatur);
    const ausblenden = bearbeitet.length
      ? [`signatur NOT IN (${bearbeitet.map((s) => `'${s.replace(/'/g, "''")}'`).join(', ')})`]
      : [];

    for (const id of OBJEKT_LAYER_IDS) {
      const werte = filter?.length
        ? filter.map((s) => `'${s.replace(/'/g, "''")}'`).join(', ')
        : "''";
      setze(id, filter === null ? null : `strecke IN (${werte})`, ...ausblenden);
    }

    void (async () => {
      const nummern = filter === null ? null : await routenNummernFuerStrecken(filter);
      if (lauf !== this.streckenFilterLauf || this.zerstoert) return;
      for (const id of ROUTEN_REF_LAYER_IDS) {
        setze(id, nummern === null ? null : `route_nr IN (${nummern.join(', ') || '-1'})`);
      }
    })();
  }

  /** Pins der räumlichen Kommentare auf den Kommentar-Layer zeichnen. */
  private zeichneKommentarPins(): void {
    const layer = this.kommentarLayer;
    if (!layer) return;
    layer.removeAll();
    layer.addMany(
      this.kommentarStore
        .alle()
        .filter((k) => k.position)
        .map(
          (k) =>
            new Graphic({
              geometry: webMercatorUtils.geographicToWebMercator(
                new Point({ longitude: k.position!.lon, latitude: k.position!.lat }),
              ),
              attributes: { kommentarId: k.id },
              symbol: sprechblasenSymbol(k.erledigt),
            }),
        ),
    );
  }

  ngAfterViewInit(): void {
    void this.initialisiere();
  }

  private async initialisiere(): Promise<void> {
    const map = new EsriMap();
    this.map = map;

    // Hintergründe additiv als unterste Layer (statt exklusiver Basemap):
    // Listenreihenfolge = Zeichenreihenfolge, Sichtbarkeit und Deckkraft
    // steuert das Kartenbild-Panel je Eintrag.
    for (const hintergrund of this.hintergruende) {
      const layer = erzeugeWebTileLayer(hintergrund.layerId, hintergrund.format, hintergrund.titel);
      layer.visible = this.hintergrundSichtbar()[hintergrund.id];
      layer.opacity = this.hintergrundDeckkraft()[hintergrund.id] / 100;
      this.hintergrundLayers.set(hintergrund.id, layer);
      map.add(layer);
    }

    // Die Objekt-Layer werden beim Laden mit den Objekt-Attributen
    // angereichert (asynchron); die Reihenfolge von LAYER_DEFS bleibt die
    // Zeichenreihenfolge.
    const objektIds = new Set<string>(OBJEKT_LAYER_IDS);
    const layerListe = await Promise.all(
      this.layerDefs.map(
        async (def) =>
          [
            def.id,
            objektIds.has(def.id) ? await erzeugeObjektLayer(def) : erzeugeLayer(def),
          ] as const,
      ),
    );
    if (this.zerstoert) return;
    for (const [id, layer] of layerListe) {
      this.layers.set(id, layer);
      map.add(layer);
    }
    this.objektLayers = OBJEKT_LAYER_IDS.map((id) => this.layers.get(id)).filter(
      (l): l is GeoJSONLayer => !!l,
    );
    // Ein vor dem Layer-Aufbau gesetzter Strecken-Filter greift jetzt
    this.wendeStreckenFilterAn(this.streckenFilter());

    this.skizzenLayer = new GraphicsLayer({ listMode: 'hide' });
    map.add(this.skizzenLayer);

    this.markerLayer = new GraphicsLayer({ listMode: 'hide' });
    map.add(this.markerLayer);

    this.kommentarLayer = new GraphicsLayer({ listMode: 'hide' });
    map.add(this.kommentarLayer);
    this.zeichneKommentarPins();

    // Begehungs-Route (Entscheid 89) — gezeichnet wird erst nach der
    // View-Erstellung, damit das goTo auf die Route nicht ins Leere läuft
    this.begehungsLayer = new GraphicsLayer({ listMode: 'hide' });
    map.add(this.begehungsLayer);

    // Bearbeitete Geometrien aller Objekte (Entscheid 91)
    this.bearbeitetLayer = new GraphicsLayer({ listMode: 'hide' });
    map.add(this.bearbeitetLayer);
    this.zeichneBearbeitete();

    // Arbeitsgeometrien des Geometrie-Editings (05.05)
    this.editLayer = new GraphicsLayer({ listMode: 'hide' });
    map.add(this.editLayer);

    this.view = new MapView({
      container: this.kartenDiv().nativeElement,
      map,
      center: [7.34, 46.945],
      zoom: 12,
      // snapToZoom aus, damit goTo Extents passgenau einpasst statt auf die
      // nächste ganze Zoomstufe aufzurunden
      constraints: { rotationEnabled: false, snapToZoom: false },
      popupEnabled: false,
    });
    this.view.ui.move('zoom', 'top-left');

    // Jetzt existiert die View: eine bereits gesetzte Begehungs-Route
    // nachziehen (ihr goTo markiert den Erstzoom als erledigt)
    this.zeichneBegehungsRoute(this.begehungsPunkte());

    this.sketch = new SketchViewModel({
      view: this.view,
      layer: this.skizzenLayer,
      polygonSymbol: new SimpleFillSymbol({
        color: [79, 70, 229, 0.12],
        outline: { color: [79, 70, 229], width: 2 },
      }),
    });
    this.sketch.on('create', (ereignis) => {
      if (ereignis.state === 'complete' && ereignis.graphic?.geometry?.type === 'polygon') {
        void this.polygonAuswerten(ereignis.graphic.geometry as Polygon);
      } else if (ereignis.state === 'cancel') {
        this.polygonAktiv.set(false);
      }
    });

    // Geometrie-Editing (05.05): Zeichnen, Verschieben, Stützpunkte,
    // Verschneiden, Zusammenfügen — mit Snapping an bestehender Geometrie
    // (05.09; TLM liegt nur als Rasterkarte vor, gesnappt wird an den
    // IVS-Objekten, den Routen und den eigenen Arbeitsgeometrien).
    this.editSketch = new SketchViewModel({
      view: this.view,
      layer: this.editLayer!,
      updateOnGraphicClick: true,
      polylineSymbol: editLinienSymbol(),
      pointSymbol: editPunktSymbol(),
      defaultUpdateOptions: { tool: 'reshape', toggleToolOnClick: true },
      snappingOptions: {
        enabled: this.snappingAn(),
        featureSources: [
          { layer: this.editLayer!, enabled: true },
          { layer: this.layers.get('routen')!, enabled: true },
          { layer: this.layers.get('abschnitte-substanz')!, enabled: true },
          { layer: this.layers.get('abschnitte-viel-substanz')!, enabled: true },
        ],
      } as never,
    });
    this.editSketch.on('create', (ereignis) => {
      if (this.editWechselLaeuft) return;
      if (ereignis.state === 'cancel') {
        this.editWerkzeug.set(null);
        return;
      }
      if (ereignis.state !== 'complete') return;
      const werkzeug = this.editWerkzeug();
      this.editWerkzeug.set(null);
      if (this.verschneideModus && ereignis.graphic?.geometry?.type === 'polyline') {
        this.verschneideModus = false;
        this.editLayer?.remove(ereignis.graphic);
        this.verschneiden(ereignis.graphic.geometry as Polyline);
        return;
      }
      if (werkzeug || ereignis.graphic) this.geometrienSpeichern();
    });
    this.editSketch.on('update', (ereignis) => {
      if (this.editWechselLaeuft) return;
      this.editAuswahlAnzahl.set(ereignis.state === 'complete' ? 0 : ereignis.graphics.length);
      // abgebrochene Updates (aborted) nicht speichern — sie stammen aus
      // cancel()-Aufrufen, nicht aus einer Nutzeraktion
      if (ereignis.state === 'complete' && !(ereignis as { aborted?: boolean }).aborted) {
        this.geometrienSpeichern();
      }
    });
    this.editSketch.on('delete', () => {
      if (this.editWechselLaeuft) return;
      this.editAuswahlAnzahl.set(0);
      this.geometrienSpeichern();
    });

    this.view.on('click', (ereignis) => {
      const view = this.view;
      if (!view) return;
      const menuWarOffen = this.kontextMenu() !== null;
      this.kontextMenu.set(null);
      // Tracing (05.09): zwei Klicks übernehmen das Teilstück einer Linie
      if (this.editWerkzeug() === 'tracing') {
        void this.tracingKlick(ereignis);
        return;
      }
      // Während des Geometrie-Editings gehören die Klicks dem Sketch
      if (this.geometrieEditObjekt() || this.polygonAktiv()) return;
      // Kommentar-Werkzeug: Klick wählt die Position (05.11)
      if (this.kommentarModus()) {
        this.kommentarModus.set(false);
        view.container?.style.removeProperty('cursor');
        const geografisch = webMercatorUtils.webMercatorToGeographic(ereignis.mapPoint) as Point;
        // Das an der Stelle getroffene Objekt als Vorbelegung der
        // Pflicht-Zuweisung mitgeben (Entscheid 88)
        void this.objektTrefferAmPunkt(ereignis).then((attribute) => {
          const blaetter = this.blattSignaturen(attribute);
          this.kommentarPosition.emit({
            lon: geografisch.longitude ?? 0,
            lat: geografisch.latitude ?? 0,
            signatur: blaetter[0] ?? null,
          });
        });
        return;
      }
      // Ein offenes Kontextmenü wird durch den Klick nur geschlossen
      if (menuWarOffen) return;
      // Kommentar-Pins haben Vorrang (liegen über den Objekten); die Prüfung
      // läuft synchron im Bildschirmraum — ohne hitTest.
      const kommentarId = this.pinAmPunkt(ereignis);
      if (kommentarId) {
        this.kommentarKlick.emit(kommentarId);
        return;
      }
      // Klick springt direkt ins getroffene Objekt. Nur wenn mehrere echt
      // verschiedene Objekte (unterschiedliche Blatt-Signaturen) getroffen
      // sind, wird das MapTip zum Kontextmenü — die Eltern-Kette allein
      // zählt nicht als Mehrfachtreffer.
      void this.objektTrefferAmPunkt(ereignis).then((attribute) => {
        const blaetter = this.blattSignaturen(attribute);
        if (blaetter.length === 0) return;
        if (blaetter.length === 1) {
          this.objektKlick.emit(blaetter[0]);
          return;
        }
        this.mapTip.set(null);
        this.kontextMenu.set({
          ...this.imSichtfeld(ereignis.x, ereignis.y),
          eintraege: this.trefferAuswerten(attribute),
        });
      });
    });

    // Hover: MapTip mit der Hierarchie der getroffenen Objekte am Cursor
    this.view.on('pointer-move', (ereignis) => {
      if (
        this.geometrieEditObjekt() ||
        this.kommentarModus() ||
        this.polygonAktiv() ||
        this.kontextMenu()
      ) {
        this.mapTip.set(null);
        return;
      }
      void this.hoverPruefen(ereignis);
    });
    this.view.on('drag', () => {
      this.mapTip.set(null);
      this.kontextMenu.set(null);
    });
    this.view.on('pointer-leave', () => this.mapTip.set(null));

    // Beim ersten Laden auf die Objekte zoomen, sofern keine Selektion
    // ansteht — erst wenn View UND Layer bereit sind, sonst verwirft die
    // View das goTo kommentarlos.
    void Promise.all([this.view.when(), ...this.objektLayers.map((l) => l.when())]).then(
      async () => {
        if (!this.erstZoomErledigt && !this.selektion() && !this.panoramaStandort()) {
          const extent = await this.objektExtent();
          if (extent && !this.erstZoomErledigt) {
            await this.view?.goTo(extent.expand(1.2), { animate: false });
          }
        }
        this.letzteSelektion = this.selektion();
        await this.wendeSelektionAn(this.letzteSelektion);
        this.setzePanoramaMarker(this.panoramaStandort());
      },
    );

    // Debug-Handle für Verifikation im Browser (wie in ivs-map)
    Object.assign(window, { ivsKarte: { view: this.view, layers: this.layers, komponente: this } });
  }

  ngOnDestroy(): void {
    this.zerstoert = true;
    this.sketch?.destroy();
    this.editSketch?.destroy();
    this.view?.destroy();
    this.view = null;
  }

  // ------------------------------------------- Hover-MapTip und Kontextmenü

  /**
   * Objekte im Umkreis weniger Bildschirmpixel um den Zeiger: räumliche
   * Abfrage auf den Objekt-Layern (statt hitTest — siehe TREFFER_RADIUS_PX).
   * Liefert die Objekt-Attribute der getroffenen Features.
   */
  private async objektTrefferAmPunkt(punkt: {
    x: number;
    y: number;
  }): Promise<Record<string, unknown>[]> {
    const view = this.view;
    if (!view || !this.objektLayers.length) return [];
    const zentrum = view.toMap(punkt);
    if (!zentrum) return [];
    const radiusPx = matchMedia('(pointer: coarse)').matches
      ? TREFFER_RADIUS_TOUCH_PX
      : TREFFER_RADIUS_PX;
    const umkreis = geometryEngine.buffer(
      zentrum as never,
      view.resolution * radiusPx,
      'meters',
    ) as Polygon | null;
    if (!umkreis) return [];
    const antworten = await Promise.all(
      this.objektLayers.map((layer) =>
        layer
          .queryFeatures({
            geometry: umkreis,
            spatialRelationship: 'intersects',
            where: "signatur <> ''",
            outFields: ['signatur', 'lf', 'strecke'],
            returnGeometry: false,
          })
          .catch(() => null),
      ),
    );
    const treffer = antworten.flatMap((antwort) => antwort?.features.map((f) => f.attributes) ?? []);
    // Bearbeitete Geometrien treffen wie Originale (Entscheid 91) — sie
    // liegen lokal als Graphics, die Prüfung läuft über die Distanz.
    const radiusMeter = view.resolution * radiusPx;
    for (const [signatur, geometrien] of Object.entries(this.geometrieStore.alle())) {
      if (!geometrien.length) continue;
      for (const json of geometrien) {
        const geometry = geometryJsonUtils.fromJSON(json as never);
        if (!geometry) continue;
        try {
          if (geometryEngine.distance(geometry as never, zentrum as never, 'meters') <= radiusMeter) {
            const kette = signaturKette(signatur);
            treffer.push({ signatur, lf: kette.lf, strecke: kette.strecke || signatur });
            break;
          }
        } catch {
          // Geometrie in fremder SR — überspringen
        }
      }
    }
    return treffer;
  }

  /**
   * Kommentar-Pin am Klickpunkt, geprüft im Bildschirmraum (die Sprechblase
   * ist 22 px gross und um 11 px nach oben versetzt).
   */
  private pinAmPunkt(punkt: { x: number; y: number }): string | null {
    const view = this.view;
    if (!view || !this.kommentarLayer) return null;
    for (const graphic of this.kommentarLayer.graphics) {
      const bildschirm = graphic.geometry ? view.toScreen(graphic.geometry as Point) : null;
      if (!bildschirm) continue;
      const dx = bildschirm.x - punkt.x;
      const dy = bildschirm.y - 11 - punkt.y;
      if (dx * dx + dy * dy <= 14 * 14) {
        return (graphic.attributes?.['kommentarId'] as string | undefined) ?? null;
      }
    }
    return null;
  }

  /**
   * Getroffene Objekte aus den Feature-Attributen: Für jedes Feature mit
   * Objekt-Zuordnung zählt die ganze Kette (Strecke → Linienführung →
   * Abschnitt/Wegbegleiter), denn die Parent-Objekte teilen sich die
   * Geometrie. Nicht enthalten ist die Gesamt-Hierarchie der Objekte —
   * nur, was am Cursor tatsächlich getroffen wurde.
   */
  private trefferAuswerten(attributListe: Record<string, unknown>[]): Treffer[] {
    const tiefen = new Map<string, number>();
    for (const attribute of attributListe) {
      const signatur = attribute['signatur'] as string | undefined;
      if (!signatur) continue;
      const strecke = attribute['strecke'] as string;
      const lf = attribute['lf'] as string;
      if (strecke) tiefen.set(strecke, 0);
      if (lf) tiefen.set(lf, 1);
      // Linienführungs-Features tragen sich selbst als lf — Tiefe 1, nicht 2
      if (signatur !== strecke && signatur !== lf) tiefen.set(signatur, lf ? 2 : 1);
    }
    return [...tiefen]
      .sort((a, b) => a[0].localeCompare(b[0], 'de-CH', { numeric: true }))
      .map(([signatur, tiefe]) => {
        const objekt = this.objektStore.bySignatur(signatur);
        return {
          signatur,
          tiefe,
          name: objekt?.name ?? '',
          typ: objekt ? objektTyp(objekt) : null,
        };
      });
  }

  /** Blatt-Signaturen der getroffenen Features (ohne Eltern-Kette), dedupliziert. */
  private blattSignaturen(attributListe: Record<string, unknown>[]): string[] {
    const signaturen = new Set<string>();
    for (const attribute of attributListe) {
      const signatur = attribute['signatur'] as string | undefined;
      if (signatur) signaturen.add(signatur);
    }
    return [...signaturen];
  }

  private async hoverPruefen(ereignis: { x: number; y: number }): Promise<void> {
    if (!this.view || !this.objektLayers.length) return;
    if (this.hoverLaeuftSeit !== 0 && Date.now() - this.hoverLaeuftSeit < 500) return;
    this.hoverLaeuftSeit = Date.now();
    try {
      const attribute = await this.objektTrefferAmPunkt(ereignis);
      const eintraege = this.trefferAuswerten(attribute);
      const container = this.view.container;
      if (container) {
        if (eintraege.length) container.style.cursor = 'pointer';
        else container.style.removeProperty('cursor');
      }
      this.mapTip.set(
        eintraege.length
          ? { ...this.imSichtfeld(ereignis.x + 14, ereignis.y + 14), eintraege }
          : null,
      );
    } finally {
      this.hoverLaeuftSeit = 0;
    }
  }

  /** Position so beschneiden, dass Tip/Menü nicht aus der Karte laufen. */
  private imSichtfeld(x: number, y: number): { x: number; y: number } {
    const breite = this.view?.width ?? Number.MAX_SAFE_INTEGER;
    const hoehe = this.view?.height ?? Number.MAX_SAFE_INTEGER;
    return { x: Math.max(0, Math.min(x, breite - 300)), y: Math.max(0, Math.min(y, hoehe - 170)) };
  }

  /** Auswahl aus dem Kontextmenü: Objekt melden und Menü schliessen. */
  protected kontextEintragWaehlen(signatur: string): void {
    this.kontextMenu.set(null);
    this.objektKlick.emit(signatur);
  }

  /** Kommentar-Werkzeug starten bzw. abbrechen: nächster Klick = Position. */
  kommentarWerkzeugUmschalten(): void {
    const aktiv = !this.kommentarModus();
    this.kommentarModus.set(aktiv);
    const container = this.view?.container;
    if (container) {
      if (aktiv) container.style.cursor = 'crosshair';
      else container.style.removeProperty('cursor');
    }
  }

  /** Polygon-Selektion starten bzw. aufheben. */
  polygonUmschalten(): void {
    if (!this.sketch || !this.skizzenLayer) return;
    if (this.polygonAktiv()) {
      this.sketch.cancel();
      this.skizzenLayer.removeAll();
      this.polygonAktiv.set(false);
      this.polygonFilter.emit(null);
    } else {
      this.skizzenLayer.removeAll();
      this.polygonAktiv.set(true);
      this.sketch.create('polygon');
    }
  }

  protected layerUmschalten(id: string): void {
    const layer = this.layers.get(id);
    if (!layer) return;
    const neu = { ...this.sichtbarkeit(), [id]: !this.sichtbarkeit()[id] };
    this.sichtbarkeit.set(neu);
    layer.visible = neu[id];
  }

  // ------------------------------------------- Hintergrund und Deckkraft

  protected hintergrundUmschalten(id: string): void {
    const sichtbar = !this.hintergrundSichtbar()[id];
    this.hintergrundSichtbar.update((s) => ({ ...s, [id]: sichtbar }));
    const layer = this.hintergrundLayers.get(id);
    if (layer) layer.visible = sichtbar;
  }

  protected hintergrundDeckkraftSetzen(id: string, ereignis: Event): void {
    const wert = Number((ereignis.target as HTMLInputElement).value);
    this.hintergrundDeckkraft.update((d) => ({ ...d, [id]: wert }));
    const layer = this.hintergrundLayers.get(id);
    if (layer) layer.opacity = wert / 100;
  }

  protected deckkraftUmschalten(id: string): void {
    this.deckkraftOffen.update((offen) => ({ ...offen, [id]: !offen[id] }));
  }

  protected objektDeckkraftSetzen(ereignis: Event): void {
    this.objektDeckkraft.set(Number((ereignis.target as HTMLInputElement).value));
  }

  // ------------------------------------------------- Geometrie-Editing

  /** Arbeitsgeometrien laden und den Edit-Sketch scharfstellen. */
  private geometrieEditStarten(signatur: string | null): void {
    if (!this.editLayer || !this.editSketch) return;
    this.editWechselLaeuft = true;
    try {
      this.editSketch.cancel();
    } finally {
      this.editWechselLaeuft = false;
    }
    this.verschneideModus = false;
    this.tracingBeenden();
    this.editWerkzeug.set(null);
    this.editAuswahlAnzahl.set(0);
    this.editLayer.removeAll();
    if (!signatur) return;
    const graphics = this.geometrieStore.fuerObjekt(signatur).map(
      (json) =>
        new Graphic({
          geometry: geometryJsonUtils.fromJSON(json as never) ?? undefined,
          symbol:
            (json as { spatialReference?: unknown; x?: unknown })['x'] !== undefined
              ? editPunktSymbol()
              : editLinienSymbol(),
        }),
    );
    this.editLayer.addMany(graphics);
  }

  /** Linie oder Punkt zeichnen. */
  geometrieZeichnen(typ: 'polyline' | 'point'): void {
    if (!this.editSketch) return;
    if (this.editWerkzeug() === typ) {
      this.editSketch.cancel();
      this.editWerkzeug.set(null);
      return;
    }
    // Laufenden Vorgang ZUERST abbrechen: create() cancelt sonst intern und
    // das synchron gefeuerte cancel-Event würde das eben gesetzte Werkzeug
    // gleich wieder nullen (Toolbar verlöre die Hervorhebung).
    this.editSketch.cancel();
    this.verschneideModus = false;
    this.tracingBeenden();
    this.editWerkzeug.set(typ);
    this.editSketch.create(typ);
  }

  /** Verschneiden: eine Schnittlinie zeichnen, die die Linien teilt. */
  geometrieVerschneiden(): void {
    if (!this.editSketch) return;
    this.editSketch.cancel();
    this.tracingBeenden();
    this.verschneideModus = true;
    this.editWerkzeug.set('verschneiden');
    this.editSketch.create('polyline');
  }

  /** Selektierte Arbeitsgeometrien löschen. */
  geometrieLoeschen(): void {
    this.editSketch?.delete();
  }

  /**
   * Originalgeometrie des editierten Objekts als Arbeitsgeometrie
   * übernehmen (Entscheid 91): Die Features werden kopiert und damit
   * bearbeitbar; das Original blendet die Karte aus, sobald
   * Arbeitsgeometrien existieren. Gibt die Zahl der Linien zurück.
   */
  async geometrieUebernehmen(): Promise<number> {
    const signatur = this.geometrieEditObjekt();
    if (!signatur || !this.editLayer) return 0;
    const features = await this.objektGeo.objektFeatures(ebeneAusSignatur(signatur), signatur);
    if (!features.length || this.geometrieEditObjekt() !== signatur) return 0;
    const graphics: Graphic[] = [];
    for (const feature of features) {
      const g = feature.geometry;
      const pfade = (
        g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : []
      ) as [number, number][][];
      if (pfade.length) {
        const linie = webMercatorUtils.geographicToWebMercator(
          new Polyline({ paths: pfade, spatialReference: { wkid: 4326 } }),
        ) as Polyline;
        graphics.push(new Graphic({ geometry: linie, symbol: editLinienSymbol() }));
      } else if (g.type === 'Point') {
        const [lon, lat] = g.coordinates as [number, number];
        graphics.push(
          new Graphic({
            geometry: webMercatorUtils.geographicToWebMercator(
              new Point({ longitude: lon, latitude: lat }),
            ) as Point,
            symbol: editPunktSymbol(),
          }),
        );
      }
    }
    if (!graphics.length) return 0;
    this.editLayer.addMany(graphics);
    this.geometrienSpeichern();
    return graphics.length;
  }

  /**
   * Tracing (05.09): Zeichnen entlang einer bestehenden Geometrie — zwei
   * Klicks auf eine Original-Linie übernehmen das Teilstück dazwischen
   * als neue Arbeitslinie.
   */
  geometrieTracing(): void {
    if (!this.editSketch) return;
    if (this.editWerkzeug() === 'tracing') {
      this.tracingBeenden();
      return;
    }
    this.editSketch.cancel();
    this.verschneideModus = false;
    this.tracingStart = null;
    // Während des Tracings darf ein Klick keine Arbeitsgeometrie in den
    // Reshape-Modus heben — sonst frisst das SketchViewModel den Klick
    this.editSketch.updateOnGraphicClick = false;
    this.editWerkzeug.set('tracing');
  }

  private tracingBeenden(): void {
    this.tracingStart = null;
    if (this.editSketch) this.editSketch.updateOnGraphicClick = true;
    if (this.tracingMarker) {
      this.skizzenLayer?.remove(this.tracingMarker);
      this.tracingMarker = null;
    }
    if (this.editWerkzeug() === 'tracing') this.editWerkzeug.set(null);
  }

  /** Klick im Tracing-Modus: Punkt auf der nächstgelegenen Original-Linie. */
  private async tracingKlick(punkt: { x: number; y: number }): Promise<void> {
    const view = this.view;
    if (!view) return;
    const zentrum = view.toMap(punkt);
    if (!zentrum) return;
    const radiusPx = matchMedia('(pointer: coarse)').matches
      ? TREFFER_RADIUS_TOUCH_PX
      : TREFFER_RADIUS_PX;

    if (this.tracingStart) {
      // Zweiter Klick: Teilstück zwischen beiden Punkten übernehmen
      const start = this.tracingStart;
      const s1 = naechsterAufPfad(start.pfad, [zentrum.x, zentrum.y]);
      const teil = teilstueckZwischen(start.pfad, start.s, s1.s);
      this.tracingBeenden();
      if (teil.length < 2 || !this.editLayer) return;
      this.editLayer.add(
        new Graphic({
          geometry: new Polyline({ paths: [teil], spatialReference: view.spatialReference }),
          symbol: editLinienSymbol(),
        }),
      );
      this.geometrienSpeichern();
      return;
    }

    // Erster Klick: nächstgelegene Original-Linie im Umkreis suchen
    let bester: { pfad: [number, number][]; s: number; distanz: number } | null = null;
    for (const layer of this.objektLayers) {
      const antwort = await layer
        .queryFeatures({
          geometry: zentrum,
          distance: view.resolution * radiusPx * 3,
          units: 'meters',
          spatialRelationship: 'intersects',
          where: "signatur <> ''",
          outFields: ['signatur'],
          returnGeometry: true,
          outSpatialReference: view.spatialReference,
        })
        .catch(() => null);
      for (const feature of antwort?.features ?? []) {
        const geometrie = feature.geometry;
        if (geometrie?.type !== 'polyline') continue;
        for (const pfad of (geometrie as Polyline).paths as [number, number][][]) {
          const kandidat = naechsterAufPfad(pfad, [zentrum.x, zentrum.y]);
          if (!bester || kandidat.distanz < bester.distanz) {
            bester = { pfad, s: kandidat.s, distanz: kandidat.distanz };
          }
        }
      }
    }
    if (!bester || this.editWerkzeug() !== 'tracing') return;
    this.tracingStart = { pfad: bester.pfad, s: bester.s };
    const startPunkt = punktBeiDistanz(bester.pfad, bester.s);
    this.tracingMarker = new Graphic({
      geometry: new Point({
        x: startPunkt[0],
        y: startPunkt[1],
        spatialReference: view.spatialReference,
      }),
      symbol: new SimpleMarkerSymbol({
        color: [79, 70, 229],
        size: 10,
        outline: { color: [255, 255, 255], width: 2 },
      }),
    });
    this.skizzenLayer?.add(this.tracingMarker);
  }

  /**
   * Linien zusammenfügen (05.05): die im Sketch selektierten Linien —
   * ersatzweise alle. Berührende Pfade werden zu durchgehenden Linien
   * verkettet; das frühere reine `union` liess sie als getrennte
   * Teilpfade stehen und wirkte darum folgenlos.
   */
  geometrieZusammenfuegen(): void {
    if (!this.editLayer || !this.editSketch) return;
    const selektiert = this.editSketch.updateGraphics
      .filter((g) => g.geometry?.type === 'polyline')
      .toArray();
    const kandidaten =
      selektiert.length >= 2
        ? selektiert
        : this.editLayer.graphics.filter((g) => g.geometry?.type === 'polyline').toArray();
    if (kandidaten.length < 2) {
      toast.info('Zum Zusammenfügen braucht es mindestens zwei Linien', {
        description: 'Mehrere Linien mit Shift-Klick auswählen — ohne Auswahl gelten alle.',
      });
      return;
    }
    this.editWechselLaeuft = true;
    try {
      this.editSketch.cancel();
    } finally {
      this.editWechselLaeuft = false;
    }
    this.editAuswahlAnzahl.set(0);
    const pfade: [number, number][][] = [];
    for (const graphic of kandidaten) {
      pfade.push(...((graphic.geometry as Polyline).paths as [number, number][][]));
    }
    const sr = (kandidaten[0].geometry as Polyline).spatialReference;
    // Toleranz fürs Verketten: ~15 m (WebMercator) bzw. ~15 m in Grad
    const toleranz = sr?.isGeographic ? 0.00015 : 15;
    const verkettet = verkettePfade(pfade, toleranz);
    this.editLayer.removeMany(kandidaten);
    this.editLayer.add(
      new Graphic({
        geometry: new Polyline({ paths: verkettet, spatialReference: sr }),
        symbol: editLinienSymbol(),
      }),
    );
    this.geometrienSpeichern();
  }

  /** Alle Linien an der Schnittlinie teilen. */
  private verschneiden(schnittlinie: Polyline): void {
    if (!this.editLayer) return;
    const linien = this.editLayer.graphics.filter((g) => g.geometry?.type === 'polyline').toArray();
    let geschnitten = 0;
    for (const graphic of linien) {
      const teile = geometryEngine.cut(graphic.geometry as Polyline, schnittlinie);
      if (teile.length > 1) {
        geschnitten++;
        this.editLayer.remove(graphic);
        this.editLayer.addMany(
          teile.map((teil) => new Graphic({ geometry: teil, symbol: editLinienSymbol() })),
        );
      }
    }
    if (geschnitten) {
      this.geometrienSpeichern();
      toast.success(`${geschnitten} Linie${geschnitten === 1 ? '' : 'n'} geteilt`, {
        description: 'Die Teile lassen sich einzeln auswählen, verschieben und löschen.',
      });
    } else {
      // Rückmeldung statt Stille — vorher wirkte das Werkzeug defekt
      toast.info('Nichts geschnitten', {
        description: 'Die Schnittlinie muss eine Arbeitslinie kreuzen.',
      });
    }
  }

  snappingUmschalten(): void {
    const neu = !this.snappingAn();
    this.snappingAn.set(neu);
    if (this.editSketch) this.editSketch.snappingOptions.enabled = neu;
  }

  /** Arbeitsgeometrien in den Store spiegeln und Änderung melden. */
  private geometrienSpeichern(): void {
    const signatur = this.geometrieEditObjekt();
    if (!signatur || !this.editLayer) return;
    const geometrien = this.editLayer.graphics
      .map((g) => g.geometry?.toJSON() as Record<string, unknown> | undefined)
      .filter((g): g is Record<string, unknown> => !!g)
      .toArray();
    this.geometrieStore.setzen(signatur, geometrien);
    this.geometrieGeaendert.emit(geometrien.length);
  }

  protected rgb(farbe: number[]): string {
    return `rgb(${farbe[0]} ${farbe[1]} ${farbe[2]})`;
  }

  private async polygonAuswerten(polygon: Polygon): Promise<void> {
    if (!this.objektLayers.length) return;
    // Auch die übergeordneten Signaturen mitgeben, damit die Liste Strecken
    // und Linienführungen behalten kann, deren Abschnitte im Polygon liegen.
    const signaturen = new Set<string>();
    for (const layer of this.objektLayers) {
      const antwort = await layer.queryFeatures({
        geometry: polygon,
        spatialRelationship: 'intersects',
        outFields: ['signatur', 'lf', 'strecke'],
        returnGeometry: false,
      });
      for (const f of antwort.features) {
        for (const feld of ['signatur', 'lf', 'strecke'] as const) {
          const wert = f.attributes[feld] as string | null;
          if (wert) signaturen.add(wert);
        }
      }
    }
    this.polygonFilter.emit([...signaturen]);
  }

  /**
   * Vereinigter Extent der Objekt-Layer (WGS 84), optional mit
   * where-Klausel; ohne Klausel zählen nur Features mit Objekt-Zuordnung
   * (`signatur <> ''`), nicht der ganze Testdatenbestand. Für Punkte-Layer
   * werden die Geometrien selbst aggregiert — queryExtent liefert bei
   * Einzelpunkten einen Meter-Puffer in einem Grad-Extent und ist damit
   * unbrauchbar.
   */
  private async objektExtent(where?: string): Promise<Extent | null> {
    const klausel = where ?? "signatur <> ''";
    let gesamt: Extent | null = null;
    const vereinige = (extent: Extent) => {
      gesamt = gesamt ? gesamt.union(extent) : extent;
    };

    for (const layer of this.objektLayers) {
      if (layer.geometryType === 'point') {
        const antwort = await layer.queryFeatures({
          where: klausel,
          returnGeometry: true,
          outFields: ['signatur'],
        });
        for (const feature of antwort.features) {
          const punkt = feature.geometry as Point | null;
          if (!punkt) continue;
          vereinige(
            new Extent({
              xmin: punkt.x,
              ymin: punkt.y,
              xmax: punkt.x,
              ymax: punkt.y,
              spatialReference: punkt.spatialReference,
            }),
          );
        }
      } else {
        const { count, extent } = await layer.queryExtent({ where: klausel });
        if (count > 0 && extent) vereinige(extent);
      }
    }
    return gesamt;
  }

  /** Marker (Standortpunkt + Blickkegel) setzen und die Karte hinfahren. */
  private setzePanoramaMarker(standort: { lon: number; lat: number } | null): void {
    if (!this.markerLayer || !this.view) return;
    this.markerLayer.removeAll();
    this.kegelGraphic = null;
    if (!standort) return;

    const punkt = webMercatorUtils.geographicToWebMercator(
      new Point({ longitude: standort.lon, latitude: standort.lat }),
    ) as Point;

    // untracked: sonst würde der Standort-Effect den Azimut mittracken und
    // bei jeder Drehbewegung Marker-Neuaufbau samt goTo auslösen
    const azimut = untracked(() => this.panoramaAzimut());
    this.kegelGraphic = new Graphic({ geometry: punkt, symbol: kegelSymbol(azimut) });
    const standortGraphic = new Graphic({
      geometry: punkt,
      symbol: new SimpleMarkerSymbol({
        style: 'circle',
        color: [37, 99, 235],
        size: 12,
        outline: { color: [255, 255, 255], width: 1.5 },
      }),
    });
    this.markerLayer.addMany([this.kegelGraphic, standortGraphic]);
    void this.view.goTo({ target: punkt, scale: 5000 });
  }

  private async wendeSelektionAn(auswahl: KartenSelektion | null): Promise<void> {
    if (!this.objektLayers.length || !this.view) return;
    for (const handle of this.highlightHandles) handle.remove();
    this.highlightHandles = [];
    if (!auswahl) {
      for (const layer of this.objektLayers) layer.featureEffect = null as never;
      this.beiwerkAbblenden(null);
      this.bearbeiteteAbblenden(null);
      return;
    }
    this.beiwerkAbblenden(auswahl);
    this.bearbeiteteAbblenden(auswahl);
    const where = whereFuerSelektion(auswahl);
    for (const layer of this.objektLayers) {
      layer.featureEffect = {
        filter: { where },
        excludedEffect: 'opacity(25%) grayscale(60%)',
      } as never;
      // Zusätzlich zur Abblendung: SDK-Highlight auf den selektierten Features
      void this.view.whenLayerView(layer).then(async (layerView) => {
        const antwort = await layer.queryFeatures({
          where,
          returnGeometry: false,
          outFields: [layer.objectIdField],
        });
        // Selektion könnte inzwischen gewechselt haben
        if (antwort.features.length && this.letzteSelektion === auswahl) {
          this.highlightHandles.push(
            (layerView as unknown as { highlight(f: unknown): { remove(): void } }).highlight(
              antwort.features,
            ),
          );
        }
      });
    }
    this.erstZoomErledigt = true;
    const extent = await this.objektExtent(where);
    if (!extent) return;
    // Grad-Schwelle: unter rund 150 m in BEIDEN Dimensionen gilt das Objekt
    // als Punkt und bekommt einen festen Massstab statt eines Extent-Fits —
    // flache, langgestreckte Linien müssen eingepasst werden (ODER würde sie
    // bei 1:5000 beidseitig abschneiden).
    const PUNKT_SCHWELLE = 0.002;
    if (extent.width < PUNKT_SCHWELLE && extent.height < PUNKT_SCHWELLE) {
      const zentrum = extent.center;
      const ziel = zentrum.spatialReference?.isWGS84
        ? webMercatorUtils.geographicToWebMercator(zentrum)
        : zentrum;
      await this.view?.goTo({ target: ziel, scale: 5000 });
    } else {
      await this.view?.goTo(extent.expand(1.4));
    }
  }

  /** Laufnummer gegen überholende Routen-Nummern-Abfragen der Abblendung. */
  private beiwerkLauf = 0;

  /**
   * Auch das Beiwerk blendet bei einer Selektion ab: Wegoberflächen,
   * Böschungsschraffuren und Grenzmarken über ihre Routen-Zuordnung
   * (die Bestandteile der selektierten Strecke bleiben hell), die
   * Brücken-Detektion pauschal — sie trägt keine Referenz.
   */
  private beiwerkAbblenden(auswahl: KartenSelektion | null): void {
    const lauf = ++this.beiwerkLauf;
    const ABBLENDUNG = 'opacity(25%) grayscale(60%)';
    const bruecken = this.layers.get('bruecken');
    if (bruecken) (bruecken as { effect?: string | null }).effect = auswahl ? ABBLENDUNG : null;
    if (!auswahl) {
      for (const id of ROUTEN_REF_LAYER_IDS) {
        const layer = this.layers.get(id);
        if (layer) layer.featureEffect = null as never;
      }
      return;
    }
    const strecke = signaturKette(auswahl.signatur).strecke || auswahl.signatur;
    void routenNummernFuerStrecken([strecke]).then((nummern) => {
      if (lauf !== this.beiwerkLauf || this.zerstoert) return;
      for (const id of ROUTEN_REF_LAYER_IDS) {
        const layer = this.layers.get(id);
        if (!layer) continue;
        layer.featureEffect = {
          filter: { where: `route_nr IN (${nummern.join(', ') || '-1'})` },
          excludedEffect: ABBLENDUNG,
        } as never;
      }
    });
  }

  /**
   * Bearbeitete Arbeitsgeometrien anderer Objekte blenden bei einer
   * Selektion ebenfalls ab — als GraphicsLayer über die Symbol-Deckkraft
   * statt über featureEffect.
   */
  private bearbeiteteAbblenden(auswahl: KartenSelektion | null): void {
    const layer = this.bearbeitetLayer;
    if (!layer) return;
    for (const graphic of layer.graphics) {
      const hell = !auswahl || passtZurSelektion(graphic.attributes, auswahl);
      const deckkraft = hell ? 1 : 0.25;
      graphic.symbol =
        graphic.geometry?.type === 'point' ? editPunktSymbol(deckkraft) : editLinienSymbol(deckkraft);
    }
  }
}

/**
 * Blickrichtungskegel: Keil, der vom Standort nach oben (Norden) öffnet und
 * über `angle` mitdreht. Der winzige Gegenpfad unten hält die Bounding-Box
 * symmetrisch, damit die Kegelspitze exakt am Standort liegt — der Pfad wird
 * von SimpleMarkerSymbol sonst um seine Box-Mitte zentriert.
 */
function kegelSymbol(azimut: number): SimpleMarkerSymbol {
  return new SimpleMarkerSymbol({
    style: 'path',
    path: 'M 0 0 L -13 -30 A 34 34 0 0 1 13 -30 Z M -0.2 30 L 0.2 30 L 0 29.7 Z',
    size: 56,
    color: [34, 197, 94, 0.45],
    angle: azimut,
    outline: { color: [22, 163, 74, 0.9], width: 1 },
  });
}

/** Arbeitsgeometrien: kräftiges Orange, klar von den Objekt-Layern getrennt. */
function editLinienSymbol(deckkraft = 1): SimpleLineSymbol {
  return new SimpleLineSymbol({
    color: [234, 88, 12, deckkraft],
    width: 3.5,
    style: 'short-dash',
  });
}

function editPunktSymbol(deckkraft = 1): SimpleMarkerSymbol {
  return new SimpleMarkerSymbol({
    style: 'circle',
    color: [234, 88, 12, deckkraft],
    size: 11,
    outline: { color: [255, 255, 255, deckkraft], width: 1.2 },
  });
}

/** Passt ein Graphic der bearbeiteten Geometrien zur Selektion? */
function passtZurSelektion(
  attribute: { signatur?: string; lf?: string; strecke?: string } | null,
  auswahl: KartenSelektion,
): boolean {
  if (!attribute) return false;
  switch (auswahl.ebene) {
    case 'strecke':
      return attribute.strecke === auswahl.signatur;
    case 'linienfuehrung':
      return attribute.lf === auswahl.signatur;
    default:
      return attribute.signatur === auswahl.signatur;
  }
}

/** Sprechblasen-Pin für räumliche Kommentare; erledigte in Grau. */
function sprechblasenSymbol(erledigt: boolean): SimpleMarkerSymbol {
  return new SimpleMarkerSymbol({
    style: 'path',
    path: 'M12 2 C6.5 2 2 5.6 2 10 C2 14.4 6.5 18 12 18 L13.5 18 L18 22.5 L18 16.9 C20.5 15.4 22 12.9 22 10 C22 5.6 17.5 2 12 2 Z',
    size: 22,
    color: erledigt ? [148, 163, 184] : [245, 158, 11],
    outline: { color: [255, 255, 255], width: 1.2 },
    yoffset: 11,
  });
}

function whereFuerSelektion(auswahl: KartenSelektion): string {
  const wert = auswahl.signatur.replace(/'/g, "''");
  switch (auswahl.ebene) {
    case 'strecke':
      return `strecke = '${wert}'`;
    case 'linienfuehrung':
      return `lf = '${wert}'`;
    default:
      return `signatur = '${wert}'`;
  }
}

/**
 * Ebene aus dem Signaturformat ableiten («BE 21» → Strecke, «BE 21.1» →
 * Linienführung, «BE 21.1.2» → Abschnitt, «BE 21 W1» → Wegbegleiter) —
 * für Ausblendung und Übernahme bearbeiteter Geometrien (Entscheid 91).
 */
function ebeneAusSignatur(signatur: string): Ebene {
  if (/ W\d+$/.test(signatur)) return 'wegbegleiter';
  const teile = signatur.split('.');
  return teile.length >= 3 ? 'abschnitt' : teile.length === 2 ? 'linienfuehrung' : 'strecke';
}

/**
 * Pfade zu möglichst wenigen durchgehenden Linien verketten: Solange sich
 * zwei Pfad-Enden innerhalb der Toleranz berühren, werden die Pfade
 * (bei Bedarf umgedreht) aneinandergehängt.
 */
function verkettePfade(pfade: [number, number][][], toleranz: number): [number, number][][] {
  const offen = pfade.map((p) => [...p]);
  const nah = (a: [number, number], b: [number, number]) =>
    Math.hypot(a[0] - b[0], a[1] - b[1]) <= toleranz;
  const ergebnis: [number, number][][] = [];
  while (offen.length) {
    let aktuell = offen.shift()!;
    let gewachsen = true;
    while (gewachsen) {
      gewachsen = false;
      for (let i = 0; i < offen.length; i++) {
        const kandidat = offen[i];
        const aStart = aktuell[0];
        const aEnde = aktuell[aktuell.length - 1];
        const kStart = kandidat[0];
        const kEnde = kandidat[kandidat.length - 1];
        if (nah(aEnde, kStart)) aktuell = [...aktuell, ...kandidat.slice(1)];
        else if (nah(aEnde, kEnde)) aktuell = [...aktuell, ...[...kandidat].reverse().slice(1)];
        else if (nah(aStart, kEnde)) aktuell = [...kandidat, ...aktuell.slice(1)];
        else if (nah(aStart, kStart))
          aktuell = [...[...kandidat].reverse(), ...aktuell.slice(1)];
        else continue;
        offen.splice(i, 1);
        gewachsen = true;
        break;
      }
    }
    ergebnis.push(aktuell);
  }
  return ergebnis;
}

/**
 * Projektion eines Punkts auf einen Pfad: kumulative Distanz `s` entlang
 * des Pfads und der Abstand zum Pfad (alles planar in Karteneinheiten).
 */
function naechsterAufPfad(
  pfad: [number, number][],
  punkt: [number, number],
): { s: number; distanz: number } {
  let besteS = 0;
  let besteDistanz = Number.POSITIVE_INFINITY;
  let laufend = 0;
  for (let i = 1; i < pfad.length; i++) {
    const [ax, ay] = pfad[i - 1];
    const [bx, by] = pfad[i];
    const dx = bx - ax;
    const dy = by - ay;
    const laenge2 = dx * dx + dy * dy;
    const t = laenge2 === 0 ? 0 : Math.max(0, Math.min(1, ((punkt[0] - ax) * dx + (punkt[1] - ay) * dy) / laenge2));
    const px = ax + t * dx;
    const py = ay + t * dy;
    const distanz = Math.hypot(punkt[0] - px, punkt[1] - py);
    const segmentLaenge = Math.sqrt(laenge2);
    if (distanz < besteDistanz) {
      besteDistanz = distanz;
      besteS = laufend + t * segmentLaenge;
    }
    laufend += segmentLaenge;
  }
  return { s: besteS, distanz: besteDistanz };
}

/** Punkt bei kumulativer Distanz `s` entlang eines Pfads. */
function punktBeiDistanz(pfad: [number, number][], s: number): [number, number] {
  let laufend = 0;
  for (let i = 1; i < pfad.length; i++) {
    const [ax, ay] = pfad[i - 1];
    const [bx, by] = pfad[i];
    const laenge = Math.hypot(bx - ax, by - ay);
    if (laufend + laenge >= s && laenge > 0) {
      const t = (s - laufend) / laenge;
      return [ax + t * (bx - ax), ay + t * (by - ay)];
    }
    laufend += laenge;
  }
  return pfad[pfad.length - 1];
}

/** Teilstück eines Pfads zwischen zwei kumulativen Distanzen (Tracing). */
function teilstueckZwischen(
  pfad: [number, number][],
  s0: number,
  s1: number,
): [number, number][] {
  const [von, bis] = s0 <= s1 ? [s0, s1] : [s1, s0];
  if (bis - von <= 0) return [];
  const punkte: [number, number][] = [punktBeiDistanz(pfad, von)];
  let laufend = 0;
  for (let i = 1; i < pfad.length; i++) {
    const [ax, ay] = pfad[i - 1];
    const [bx, by] = pfad[i];
    const laenge = Math.hypot(bx - ax, by - ay);
    const ende = laufend + laenge;
    if (ende > von && ende < bis) punkte.push([bx, by]);
    laufend = ende;
  }
  punkte.push(punktBeiDistanz(pfad, bis));
  return punkte;
}

/** Referenz auf die Layer-Definitionen für einbettende Seiten. */
export { LAYER_DEFS as KARTEN_LAYER_DEFS };
export type { LayerDef };
