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
  erzeugeWebTileLayer,
} from './karten-layer';

export interface KartenSelektion {
  ebene: Ebene;
  signatur: string;
}

/**
 * Wiederverwendbare ArcGIS-Karte: swisstopo-WMTS-Hintergrund, die Layer aus
 * `ivs-map` plus der Objekt-Layer des Prototyps. Das Layer-Panel («Objekte»)
 * liegt als Overlay unten rechts; Polygon-Selektion und Panel-Umschaltung
 * werden von der einbettenden Seite über die öffentlichen Methoden gesteuert.
 */
@Component({
  selector: 'ivs-karte',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon],
  providers: [provideIcons({ lucideChevronDown })],
  template: `
    <div class="relative h-full w-full overflow-hidden">
      <div #kartenDiv class="h-full w-full"></div>

      <!-- Layer-Panel («Objekte») -->
      <div
        class="absolute right-3 bottom-6 w-56 rounded-md border border-border bg-background/95 shadow-md backdrop-blur"
        [class.hidden]="!panelOffen()"
      >
        <button
          type="button"
          class="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold"
          (click)="panelEingeklappt.set(!panelEingeklappt())"
        >
          Objekte
          <ng-icon name="lucideChevronDown" class="transition-transform" [class.rotate-180]="panelEingeklappt()" />
        </button>
        @if (!panelEingeklappt()) {
          <div class="max-h-96 overflow-y-auto px-1 pb-2">
            <!-- Hintergrund (05.04) -->
            <p class="px-2 pt-1 pb-0.5 text-xs font-medium text-muted-foreground">Hintergrund</p>
            @for (basemap of basemaps; track basemap.id) {
              <label class="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-0.5 text-sm hover:bg-accent">
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
                      <span class="h-0.75 w-4 shrink-0 rounded-full" [style.background]="rgb(def.legende.farbe)"></span>
                    }
                    @case ('punkt') {
                      <span class="size-2.5 shrink-0 rounded-full" [style.background]="rgb(def.legende.farbe)"></span>
                    }
                    @case ('flaeche') {
                      <span class="size-3 shrink-0 rounded-xs opacity-70" [style.background]="rgb(def.legende.farbe)"></span>
                    }
                  }
                  <span class="min-w-0 flex-1 truncate" [class.text-muted-foreground]="!sichtbarkeit()[def.id]">
                    {{ def.titel }}
                  </span>
                  <button
                    type="button"
                    class="text-muted-foreground hover:text-foreground"
                    (click)="layerUmschalten(def.id)"
                    [attr.aria-label]="'Layer ' + def.titel + (sichtbarkeit()[def.id] ? ' ausblenden' : ' einblenden')"
                  >
                    <!-- Auge offen/geschlossen -->
                    @if (sichtbarkeit()[def.id]) {
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    } @else {
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="m3 3 18 18" />
                        <path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3 3.9M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a10.7 10.7 0 0 0 5.4-1.4" />
                      </svg>
                    }
                  </button>
                </div>
              </li>
            }
            </ul>
          </div>
        }
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

  protected readonly layerDefs = LAYER_DEFS;
  protected readonly basemaps = BASEMAP_DEFS;
  protected readonly overlays = OVERLAY_DEFS;
  protected readonly panelEingeklappt = signal(false);
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

  /** Zuletzt angewendete Selektion — verhindert redundante goTo/Query-Läufe,
   *  wenn sich nur die Objektreferenz, nicht aber die Selektion ändert. */
  private letzteSelektion: KartenSelektion | null | undefined;

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

    for (const def of this.layerDefs) {
      const layer = erzeugeLayer(def);
      this.layers.set(def.id, layer);
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
          { layer: this.layers.get('objekte')!, enabled: true },
          { layer: this.layers.get('routen')!, enabled: true },
        ],
      } as never,
    });
    this.editSketch.on('create', (ereignis) => {
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
      this.editAuswahlAnzahl.set(ereignis.state === 'complete' ? 0 : ereignis.graphics.length);
      if (ereignis.state === 'complete') this.geometrienSpeichern();
    });
    this.editSketch.on('delete', () => {
      this.editAuswahlAnzahl.set(0);
      this.geometrienSpeichern();
    });

    this.view.on('click', (ereignis) => {
      const view = this.view;
      if (!view) return;
      // Während des Geometrie-Editings gehören die Klicks dem Sketch
      if (this.geometrieEditObjekt()) return;
      // Kommentar-Werkzeug: Klick wählt die Position (05.11)
      if (this.kommentarModus()) {
        this.kommentarModus.set(false);
        view.container?.style.removeProperty('cursor');
        const geografisch = webMercatorUtils.webMercatorToGeographic(ereignis.mapPoint) as Point;
        this.kommentarPosition.emit({ lon: geografisch.longitude ?? 0, lat: geografisch.latitude ?? 0 });
        return;
      }
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
          const signatur = resultat.graphic.attributes?.['signatur'] as string | undefined;
          if (signatur) {
            this.objektKlick.emit(signatur);
            return;
          }
        }
      });
    });

    // Beim ersten Laden auf die Objekte zoomen, sofern keine Selektion
    // ansteht — erst wenn View UND Layer bereit sind, sonst verwirft die
    // View das goTo kommentarlos.
    void Promise.all([this.view.when(), ...this.objektLayers.map((l) => l.when())]).then(async () => {
      if (!this.erstZoomErledigt && !this.selektion() && !this.panoramaStandort()) {
        const extent = await this.objektExtent();
        if (extent && !this.erstZoomErledigt) {
          await this.view?.goTo(extent.expand(1.2), { animate: false });
        }
      }
      this.letzteSelektion = this.selektion();
      await this.wendeSelektionAn(this.letzteSelektion);
      this.setzePanoramaMarker(this.panoramaStandort());
    });

    // Debug-Handle für Verifikation im Browser (wie in ivs-map)
    Object.assign(window, { ivsKarte: { view: this.view, layers: this.layers } });
  }

  ngOnDestroy(): void {
    this.sketch?.destroy();
    this.editSketch?.destroy();
    this.view?.destroy();
    this.view = null;
  }

  /** Layer-Panel ein-/ausblenden (Toolbar-Knopf der einbettenden Seite). */
  panelUmschalten(): void {
    this.panelOffen.set(!this.panelOffen());
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
    this.editSketch.cancel();
    this.verschneideModus = false;
    this.editWerkzeug.set(null);
    this.editAuswahlAnzahl.set(0);
    this.editLayer.removeAll();
    if (!signatur) return;
    const graphics = this.geometrieStore.fuerObjekt(signatur).map(
      (json) =>
        new Graphic({
          geometry: geometryJsonUtils.fromJSON(json as never) ?? undefined,
          symbol: (json as { spatialReference?: unknown; x?: unknown })['x'] !== undefined
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
    this.verschneideModus = false;
    this.editWerkzeug.set(typ);
    this.editSketch.create(typ);
  }

  /** Verschneiden: eine Schnittlinie zeichnen, die die Linien teilt. */
  geometrieVerschneiden(): void {
    if (!this.editSketch) return;
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
    const vereint = geometryEngine.union(linien.map((g) => g.geometry!).toArray()) as Polyline | null;
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
   * Vereinigter Extent beider Objekt-Layer (WGS 84), optional mit
   * where-Klausel. Für den Punkte-Layer werden die Geometrien selbst
   * aggregiert — queryExtent liefert bei Einzelpunkten einen Meter-Puffer
   * in einem Grad-Extent und ist damit unbrauchbar.
   */
  private async objektExtent(where?: string): Promise<Extent | null> {
    let gesamt: Extent | null = null;
    const vereinige = (extent: Extent) => {
      gesamt = gesamt ? gesamt.union(extent) : extent;
    };

    for (const layer of this.objektLayers) {
      if (layer.geometryType === 'point') {
        const antwort = await layer.queryFeatures({
          where: where ?? '1=1',
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
        const { count, extent } = await layer.queryExtent(where ? { where } : undefined);
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
