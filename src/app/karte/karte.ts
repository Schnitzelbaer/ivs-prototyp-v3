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
import Basemap from '@arcgis/core/Basemap.js';
import EsriMap from '@arcgis/core/Map.js';
import * as geometryEngine from '@arcgis/core/geometry/geometryEngine.js';
import type Polygon from '@arcgis/core/geometry/Polygon.js';
import type Polyline from '@arcgis/core/geometry/Polyline.js';
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
import { lucideChevronDown } from '@ng-icons/lucide';
import { HlmCollapsibleImports } from '@spartan-ng/helm/collapsible';
import { ObjektStore } from '../core/objekt-store';
import Graphic from '@arcgis/core/Graphic.js';
import Extent from '@arcgis/core/geometry/Extent.js';
import Point from '@arcgis/core/geometry/Point.js';
import * as webMercatorUtils from '@arcgis/core/geometry/support/webMercatorUtils.js';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol.js';
import { Ebene } from '../core/model';
import {
  BASEMAP_DEFS,
  LAYER_DEFS,
  LayerDef,
  OBJEKT_LAYER_IDS,
  OVERLAY_DEFS,
  erzeugeLayer,
  erzeugeObjektLayer,
  erzeugeWebTileLayer,
} from './karten-layer';

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
}

type HitTestErgebnis = Awaited<ReturnType<MapView['hitTest']>>;
type BildschirmPunkt = Parameters<MapView['hitTest']>[0];

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
  imports: [NgIcon, HlmCollapsibleImports],
  providers: [provideIcons({ lucideChevronDown })],
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
              class="flex items-baseline gap-1.5 truncate leading-5"
              [style.padding-left.rem]="eintrag.tiefe * 0.75"
            >
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
              class="flex w-full items-baseline gap-1.5 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
              [style.padding-left.rem]="0.5 + eintrag.tiefe * 0.75"
              (click)="kontextEintragWaehlen(eintrag.signatur)"
            >
              <span class="shrink-0 font-mono text-[11px] text-muted-foreground">{{
                eintrag.signatur
              }}</span>
              <span class="min-w-0 truncate">{{ eintrag.name }}</span>
            </button>
          }
        </div>
      }

      <!-- Layer-Panel («Objekte») -->
      <div
        hlmCollapsible
        [expanded]="true"
        #panelAuf="brnCollapsible"
        class="absolute right-3 bottom-6 w-56 rounded-md border border-border bg-background/95 shadow-md backdrop-blur"
        [class.hidden]="!panelOffen()"
      >
        <button
          hlmCollapsibleTrigger
          class="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold"
        >
          Objekte
          <ng-icon
            name="lucideChevronDown"
            class="transition-transform"
            [class.rotate-180]="!panelAuf.expanded()"
          />
        </button>
        <div hlmCollapsibleContent class="max-h-96 overflow-y-auto px-1 pb-2">
          <!-- Hintergrund (05.04) -->
          <p class="px-2 pt-1 pb-0.5 text-xs font-medium text-muted-foreground">Hintergrund</p>
          @for (basemap of basemaps; track basemap.id) {
            <label
              class="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-0.5 text-sm hover:bg-accent"
            >
              <input
                type="radio"
                name="ivs-basemap"
                class="accent-primary"
                [checked]="basemapId() === basemap.id"
                (change)="basemapWechseln(basemap.id)"
              />
              {{ basemap.titel }}
            </label>
          }
          @for (overlay of overlays; track overlay.id) {
            <div class="rounded-sm px-2 py-0.5 text-sm hover:bg-accent">
              <label class="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  class="accent-primary"
                  [checked]="overlaySichtbar()[overlay.id]"
                  (change)="overlayUmschalten(overlay.id)"
                />
                <span class="min-w-0 flex-1 truncate">{{ overlay.titel }}</span>
              </label>
              @if (overlaySichtbar()[overlay.id]) {
                <input
                  type="range"
                  min="0"
                  max="100"
                  class="mt-0.5 h-1.5 w-full accent-primary"
                  [value]="overlayDeckkraft()[overlay.id]"
                  (input)="overlayDeckkraftSetzen(overlay.id, $event)"
                  [attr.aria-label]="'Deckkraft ' + overlay.titel"
                />
              }
            </div>
          }

          <!-- Objekt-Deckkraft -->
          <p class="px-2 pt-2 pb-0.5 text-xs font-medium text-muted-foreground">Objekt-Deckkraft</p>
          <div class="px-2">
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

          <p class="px-2 pt-2 pb-0.5 text-xs font-medium text-muted-foreground">Layer</p>
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
                    <!-- Auge offen/geschlossen -->
                    @if (sichtbarkeit()[def.id]) {
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    } @else {
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path d="m3 3 18 18" />
                        <path
                          d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3 3.9M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a10.7 10.7 0 0 0 5.4-1.4"
                        />
                      </svg>
                    }
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
  readonly kommentarPosition = output<{ lon: number; lat: number }>();
  /** Geometrie-Editing (05.05): Signatur des zu bearbeitenden Objekts, null = aus. */
  readonly geometrieEditObjekt = input<string | null>(null);
  /** Nach jeder Geometrie-Änderung: aktuelle Anzahl Arbeitsgeometrien. */
  readonly geometrieGeaendert = output<number>();

  private readonly kommentarStore = inject(KommentarStore);
  private readonly geometrieStore = inject(GeometrieStore);
  private readonly objektStore = inject(ObjektStore);

  protected readonly layerDefs = LAYER_DEFS;
  protected readonly basemaps = BASEMAP_DEFS;
  protected readonly overlays = OVERLAY_DEFS;
  readonly panelOffen = signal(true);
  readonly polygonAktiv = signal(false);
  /** Kommentar-Werkzeug aktiv: nächster Kartenklick wählt die Position. */
  readonly kommentarModus = signal(false);
  /** Snapping des Geometrie-Editings (05.09) — an bestehender Geometrie. */
  readonly snappingAn = signal(true);
  /** Anzahl aktuell im Update-Modus selektierter Arbeitsgeometrien. */
  readonly editAuswahlAnzahl = signal(0);
  /** Aktives Zeichenwerkzeug des Geometrie-Editings. */
  readonly editWerkzeug = signal<'polyline' | 'point' | 'verschneiden' | null>(null);

  /** Hover-MapTip: Hierarchie der unter dem Cursor getroffenen Objekte. */
  protected readonly mapTip = signal<{ x: number; y: number; eintraege: Treffer[] } | null>(null);
  /** Klick-Kontextmenü bei Mehrfachtreffern. */
  protected readonly kontextMenu = signal<{ x: number; y: number; eintraege: Treffer[] } | null>(
    null,
  );

  protected readonly basemapId = signal('pk-grau');
  protected readonly overlaySichtbar = signal<Record<string, boolean>>(
    Object.fromEntries(OVERLAY_DEFS.map((o) => [o.id, false])),
  );
  protected readonly overlayDeckkraft = signal<Record<string, number>>(
    Object.fromEntries(OVERLAY_DEFS.map((o) => [o.id, o.deckkraft])),
  );
  protected readonly objektDeckkraft = signal(100);
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
  private kegelGraphic: Graphic | null = null;
  private sketch: SketchViewModel | null = null;
  private erstZoomErledigt = false;

  private basemapCache = new Map<string, Basemap>();
  private overlayLayers = new Map<string, WebTileLayer>();
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
    const basemap = new Basemap({
      baseLayers: [
        new WebTileLayer({
          urlTemplate:
            'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-grau/default/current/3857/{level}/{col}/{row}.jpeg',
          title: 'Landeskarte grau',
          copyright: '© <a href="https://www.swisstopo.admin.ch/">swisstopo</a>',
          maxScale: 250,
        }),
      ],
      id: 'swisstopo-pk-grau',
    });

    const map = new EsriMap({ basemap });
    this.map = map;
    this.basemapCache.set('pk-grau', basemap);

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

    this.skizzenLayer = new GraphicsLayer({ listMode: 'hide' });
    map.add(this.skizzenLayer);

    this.markerLayer = new GraphicsLayer({ listMode: 'hide' });
    map.add(this.markerLayer);

    this.kommentarLayer = new GraphicsLayer({ listMode: 'hide' });
    map.add(this.kommentarLayer);
    this.zeichneKommentarPins();

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
          { layer: this.layers.get('teilsegmente')!, enabled: true },
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
      // Während des Geometrie-Editings gehören die Klicks dem Sketch
      if (this.geometrieEditObjekt() || this.polygonAktiv()) return;
      // Kommentar-Werkzeug: Klick wählt die Position (05.11)
      if (this.kommentarModus()) {
        this.kommentarModus.set(false);
        view.container?.style.removeProperty('cursor');
        const geografisch = webMercatorUtils.webMercatorToGeographic(ereignis.mapPoint) as Point;
        this.kommentarPosition.emit({
          lon: geografisch.longitude ?? 0,
          lat: geografisch.latitude ?? 0,
        });
        return;
      }
      // Ein offenes Kontextmenü wird durch den Klick nur geschlossen
      if (menuWarOffen) return;
      const ziele = [...(this.kommentarLayer ? [this.kommentarLayer] : []), ...this.objektLayers];
      if (!ziele.length) return;
      void view.hitTest(ereignis, { include: ziele }).then((treffer) => {
        for (const resultat of treffer.results) {
          if (resultat.type !== 'graphic') continue;
          const kommentarId = resultat.graphic.attributes?.['kommentarId'] as string | undefined;
          if (kommentarId) {
            this.kommentarKlick.emit(kommentarId);
            return;
          }
        }
        // Klick springt direkt ins getroffene Objekt. Nur wenn mehrere echt
        // verschiedene Objekte (unterschiedliche Blatt-Signaturen) getroffen
        // sind, wird das MapTip zum Kontextmenü — die Eltern-Kette allein
        // zählt nicht als Mehrfachtreffer.
        const blaetter = this.blattSignaturen(treffer);
        if (blaetter.length === 0) return;
        if (blaetter.length === 1) {
          this.objektKlick.emit(blaetter[0]);
          return;
        }
        this.mapTip.set(null);
        this.kontextMenu.set({
          ...this.imSichtfeld(ereignis.x, ereignis.y),
          eintraege: this.trefferAuswerten(treffer),
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

  /** Layer-Panel ein-/ausblenden (Toolbar-Knopf der einbettenden Seite). */
  panelUmschalten(): void {
    this.panelOffen.set(!this.panelOffen());
  }

  // ------------------------------------------- Hover-MapTip und Kontextmenü

  /**
   * Getroffene Objekte aus einem hitTest: Für jedes Feature mit
   * Objekt-Zuordnung zählt die ganze Kette (Strecke → Linienführung →
   * Abschnitt/Wegbegleiter), denn die Parent-Objekte teilen sich die
   * Geometrie. Nicht enthalten ist die Gesamt-Hierarchie der Objekte —
   * nur, was am Cursor tatsächlich getroffen wurde.
   */
  private trefferAuswerten(treffer: HitTestErgebnis): Treffer[] {
    const tiefen = new Map<string, number>();
    for (const resultat of treffer.results) {
      if (resultat.type !== 'graphic') continue;
      const attribute = resultat.graphic.attributes ?? {};
      const signatur = attribute['signatur'] as string | undefined;
      if (!signatur) continue;
      const strecke = attribute['strecke'] as string;
      const lf = attribute['lf'] as string;
      if (strecke) tiefen.set(strecke, 0);
      if (lf) tiefen.set(lf, 1);
      tiefen.set(signatur, lf ? 2 : 1);
    }
    return [...tiefen]
      .sort((a, b) => a[0].localeCompare(b[0], 'de-CH', { numeric: true }))
      .map(([signatur, tiefe]) => ({
        signatur,
        tiefe,
        name: this.objektStore.bySignatur(signatur)?.name ?? '',
      }));
  }

  /** Blatt-Signaturen der getroffenen Features (ohne Eltern-Kette), dedupliziert. */
  private blattSignaturen(treffer: HitTestErgebnis): string[] {
    const signaturen = new Set<string>();
    for (const resultat of treffer.results) {
      if (resultat.type !== 'graphic') continue;
      const signatur = resultat.graphic.attributes?.['signatur'] as string | undefined;
      if (signatur) signaturen.add(signatur);
    }
    return [...signaturen];
  }

  private async hoverPruefen(ereignis: { x: number; y: number }): Promise<void> {
    if (!this.view || !this.objektLayers.length) return;
    if (this.hoverLaeuftSeit !== 0 && Date.now() - this.hoverLaeuftSeit < 500) return;
    this.hoverLaeuftSeit = Date.now();
    try {
      const treffer = await this.view.hitTest(ereignis as BildschirmPunkt, {
        include: this.objektLayers,
      });
      const eintraege = this.trefferAuswerten(treffer);
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

  protected basemapWechseln(id: string): void {
    if (!this.map) return;
    let basemap = this.basemapCache.get(id);
    if (!basemap) {
      const def = BASEMAP_DEFS.find((b) => b.id === id);
      if (!def) return;
      basemap = new Basemap({
        baseLayers: [erzeugeWebTileLayer(def.layerId, def.format, def.titel)],
        id: def.id,
      });
      this.basemapCache.set(id, basemap);
    }
    this.map.basemap = basemap;
    this.basemapId.set(id);
  }

  protected overlayUmschalten(id: string): void {
    if (!this.map) return;
    const sichtbar = !this.overlaySichtbar()[id];
    this.overlaySichtbar.update((s) => ({ ...s, [id]: sichtbar }));
    let layer = this.overlayLayers.get(id);
    if (!layer && sichtbar) {
      const def = OVERLAY_DEFS.find((o) => o.id === id);
      if (!def) return;
      layer = erzeugeWebTileLayer(def.layerId, def.format, def.titel);
      layer.opacity = this.overlayDeckkraft()[id] / 100;
      this.overlayLayers.set(id, layer);
    }
    if (!layer) return;
    if (sichtbar) {
      // Raster-Overlays gehören unter die Fach-Layer
      this.map.add(layer, 0);
    } else {
      this.map.remove(layer);
    }
  }

  protected overlayDeckkraftSetzen(id: string, ereignis: Event): void {
    const wert = Number((ereignis.target as HTMLInputElement).value);
    this.overlayDeckkraft.update((d) => ({ ...d, [id]: wert }));
    const layer = this.overlayLayers.get(id);
    if (layer) layer.opacity = wert / 100;
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
    this.editWerkzeug.set(typ);
    this.editSketch.create(typ);
  }

  /** Verschneiden: eine Schnittlinie zeichnen, die die Linien teilt. */
  geometrieVerschneiden(): void {
    if (!this.editSketch) return;
    this.editSketch.cancel();
    this.verschneideModus = true;
    this.editWerkzeug.set('verschneiden');
    this.editSketch.create('polyline');
  }

  /** Selektierte Arbeitsgeometrien löschen. */
  geometrieLoeschen(): void {
    this.editSketch?.delete();
  }

  /** Alle Linien der Arbeitsgeometrien zu einer zusammenfügen (05.05). */
  geometrieZusammenfuegen(): void {
    if (!this.editLayer) return;
    const linien = this.editLayer.graphics.filter((g) => g.geometry?.type === 'polyline');
    if (linien.length < 2) return;
    const vereint = geometryEngine.union(
      linien.map((g) => g.geometry!).toArray(),
    ) as Polyline | null;
    if (!vereint) return;
    this.editLayer.removeMany(linien.toArray());
    this.editLayer.add(new Graphic({ geometry: vereint, symbol: editLinienSymbol() }));
    this.geometrienSpeichern();
  }

  /** Alle Linien an der Schnittlinie teilen. */
  private verschneiden(schnittlinie: Polyline): void {
    if (!this.editLayer) return;
    const linien = this.editLayer.graphics.filter((g) => g.geometry?.type === 'polyline').toArray();
    let geschnitten = false;
    for (const graphic of linien) {
      const teile = geometryEngine.cut(graphic.geometry as Polyline, schnittlinie);
      if (teile.length > 1) {
        geschnitten = true;
        this.editLayer.remove(graphic);
        this.editLayer.addMany(
          teile.map((teil) => new Graphic({ geometry: teil, symbol: editLinienSymbol() })),
        );
      }
    }
    if (geschnitten) this.geometrienSpeichern();
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
      return;
    }
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
function editLinienSymbol(): SimpleLineSymbol {
  return new SimpleLineSymbol({ color: [234, 88, 12], width: 3.5, style: 'short-dash' });
}

function editPunktSymbol(): SimpleMarkerSymbol {
  return new SimpleMarkerSymbol({
    style: 'circle',
    color: [234, 88, 12],
    size: 11,
    outline: { color: [255, 255, 255], width: 1.2 },
  });
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

/** Referenz auf die Layer-Definitionen für einbettende Seiten. */
export { LAYER_DEFS as KARTEN_LAYER_DEFS };
export type { LayerDef };
