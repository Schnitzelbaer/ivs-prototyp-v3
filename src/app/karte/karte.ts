import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  AfterViewInit,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import Basemap from '@arcgis/core/Basemap.js';
import EsriMap from '@arcgis/core/Map.js';
import type Polygon from '@arcgis/core/geometry/Polygon.js';
import GeoJSONLayer from '@arcgis/core/layers/GeoJSONLayer.js';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer.js';
import WebTileLayer from '@arcgis/core/layers/WebTileLayer.js';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol.js';
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
import { LAYER_DEFS, LayerDef, OBJEKT_LAYER_IDS, erzeugeLayer } from './karten-layer';

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
          <ul class="max-h-72 overflow-y-auto px-1 pb-1">
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

  protected readonly layerDefs = LAYER_DEFS;
  protected readonly panelEingeklappt = signal(false);
  readonly panelOffen = signal(true);
  readonly polygonAktiv = signal(false);
  protected readonly sichtbarkeit = signal<Record<string, boolean>>(
    Object.fromEntries(LAYER_DEFS.map((d) => [d.id, d.sichtbar])),
  );

  private view: MapView | null = null;
  private layers = new Map<string, GeoJSONLayer>();
  /** Die beiden Objekt-Layer (Linien + Wegbegleiter-Punkte). */
  private objektLayers: GeoJSONLayer[] = [];
  private skizzenLayer: GraphicsLayer | null = null;
  private markerLayer: GraphicsLayer | null = null;
  private kegelGraphic: Graphic | null = null;
  private sketch: SketchViewModel | null = null;
  private erstZoomErledigt = false;

  constructor() {
    effect(() => {
      const auswahl = this.selektion();
      if (this.view && this.objektLayers.length) {
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

    this.view.on('click', (ereignis) => {
      const view = this.view;
      if (!view || !this.objektLayers.length) return;
      void view.hitTest(ereignis, { include: this.objektLayers }).then((treffer) => {
        const erster = treffer.results.find((r) => r.type === 'graphic');
        if (erster && erster.type === 'graphic') {
          const signatur = erster.graphic.attributes?.['signatur'] as string | undefined;
          if (signatur) this.objektKlick.emit(signatur);
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
      await this.wendeSelektionAn(this.selektion());
      this.setzePanoramaMarker(this.panoramaStandort());
    });

    // Debug-Handle für Verifikation im Browser (wie in ivs-map)
    Object.assign(window, { ivsKarte: { view: this.view, layers: this.layers } });
  }

  ngOnDestroy(): void {
    this.sketch?.destroy();
    this.view?.destroy();
    this.view = null;
  }

  /** Layer-Panel ein-/ausblenden (Toolbar-Knopf der einbettenden Seite). */
  panelUmschalten(): void {
    this.panelOffen.set(!this.panelOffen());
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

    this.kegelGraphic = new Graphic({ geometry: punkt, symbol: kegelSymbol(this.panoramaAzimut()) });
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
    // Grad-Schwelle: unter rund 150 m gilt das Objekt als Punkt und bekommt
    // einen festen Massstab statt eines Extent-Fits.
    const PUNKT_SCHWELLE = 0.002;
    if (extent.width < PUNKT_SCHWELLE || extent.height < PUNKT_SCHWELLE) {
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
