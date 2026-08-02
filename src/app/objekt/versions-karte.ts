import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  AfterViewInit,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import EsriMap from '@arcgis/core/Map.js';
import Graphic from '@arcgis/core/Graphic.js';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer.js';
import MapView from '@arcgis/core/views/MapView.js';
import SimpleLineSymbol from '@arcgis/core/symbols/SimpleLineSymbol.js';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol.js';
import { Ebene } from '../core/model';
import { erzeugeWebTileLayer } from '../karte/karten-layer';
import { ObjektGeo } from '../karte/objekt-geo';

/** Farben der beiden Stände — auch für die Slider-Beschriftung im Dialog. */
export const VERSION_10_FARBE = [90, 90, 90];
export const VERSION_20_FARBE = [21, 101, 192];

/**
 * Vergleichskarte des Versionsvergleichs (08.05): Der IVS-1.0-Verlauf liegt
 * in normaler Darstellung über der heutigen Geometrie; die Deckkraft beider
 * Stände ist separat regelbar. Der 1.0-Verlauf wird im Prototyp
 * deterministisch aus der heutigen Geometrie abgeleitet (leicht versetzt
 * und vereinfacht — die Nachführung hat die Lage präzisiert).
 */
@Component({
  selector: 'ivs-versions-karte',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div #kartenDiv class="h-full w-full"></div>`,
})
export class VersionsKarte implements AfterViewInit, OnDestroy {
  private readonly geo = inject(ObjektGeo);
  private readonly kartenDiv = viewChild.required<ElementRef<HTMLDivElement>>('kartenDiv');

  readonly ebene = input.required<Ebene>();
  readonly signatur = input.required<string>();
  /** Deckkraft in Prozent, je Stand separat. */
  readonly deckkraft10 = input(80);
  readonly deckkraft20 = input(100);

  private view: MapView | null = null;
  private layer10: GraphicsLayer | null = null;
  private layer20: GraphicsLayer | null = null;
  private zerstoert = false;

  constructor() {
    effect(() => {
      const wert = this.deckkraft10() / 100;
      if (this.layer10) this.layer10.opacity = wert;
    });
    effect(() => {
      const wert = this.deckkraft20() / 100;
      if (this.layer20) this.layer20.opacity = wert;
    });
  }

  ngAfterViewInit(): void {
    void this.initialisiere();
  }

  ngOnDestroy(): void {
    this.zerstoert = true;
    this.view?.destroy();
    this.view = null;
  }

  private async initialisiere(): Promise<void> {
    const map = new EsriMap();
    map.add(erzeugeWebTileLayer('ch.swisstopo.pixelkarte-grau', 'jpeg', 'Landeskarte grau'));

    // 1.0 unter 2.0, beide über der Basemap
    this.layer10 = new GraphicsLayer({ opacity: this.deckkraft10() / 100 });
    this.layer20 = new GraphicsLayer({ opacity: this.deckkraft20() / 100 });
    map.add(this.layer10);
    map.add(this.layer20);

    const features = await this.geo.objektFeatures(this.ebene(), this.signatur());
    if (this.zerstoert) return;

    for (const feature of features) {
      const pfade = alsPfade(feature.geometry);
      if (pfade.length) {
        this.layer20.add(linienGraphic(pfade, VERSION_20_FARBE));
        this.layer10.add(linienGraphic(pfade.map((p) => versetze(p, this.signatur())), VERSION_10_FARBE));
      } else if (feature.geometry.type === 'Point') {
        const [lon, lat] = feature.geometry.coordinates as [number, number];
        this.layer20.add(punktGraphic(lon, lat, VERSION_20_FARBE));
        const [dLon, dLat] = versatzFuer(this.signatur());
        this.layer10.add(punktGraphic(lon + dLon, lat + dLat, VERSION_10_FARBE));
      }
    }

    this.view = new MapView({
      container: this.kartenDiv().nativeElement,
      map,
      center: [7.34, 46.945],
      zoom: 13,
      constraints: { rotationEnabled: false, snapToZoom: false },
      popupEnabled: false,
    });
    this.view.ui.components = [];

    const alle = [...this.layer20.graphics.toArray(), ...this.layer10.graphics.toArray()];
    if (alle.length) {
      await this.view.when();
      if (!this.zerstoert) await this.view.goTo(alle, { animate: false }).catch(() => undefined);
    }
  }
}

type Pfad = [number, number][];

function alsPfade(geometrie: { type: string; coordinates: unknown }): Pfad[] {
  if (geometrie.type === 'LineString') return [geometrie.coordinates as Pfad];
  if (geometrie.type === 'MultiLineString') return geometrie.coordinates as Pfad[];
  return [];
}

function linienGraphic(pfade: Pfad[], farbe: number[]): Graphic {
  return new Graphic({
    geometry: { type: 'polyline', paths: pfade, spatialReference: { wkid: 4326 } } as never,
    symbol: new SimpleLineSymbol({ color: farbe, width: 3.5 }),
  });
}

function punktGraphic(lon: number, lat: number, farbe: number[]): Graphic {
  return new Graphic({
    geometry: { type: 'point', longitude: lon, latitude: lat } as never,
    symbol: new SimpleMarkerSymbol({
      style: 'circle',
      color: farbe,
      size: 9,
      outline: { color: [255, 255, 255, 0.9], width: 0.8 },
    }),
  });
}

/** Deterministischer Lageversatz (~15–30 m) des 1.0-Verlaufs. */
function versatzFuer(signatur: string): [number, number] {
  let h = 0;
  for (let i = 0; i < signatur.length; i++) h = (h * 31 + signatur.charCodeAt(i)) >>> 0;
  const richtung = ((h % 360) * Math.PI) / 180;
  const distanz = 0.00018 + ((h >>> 5) % 100) / 100 * 0.00012;
  return [Math.cos(richtung) * distanz, Math.sin(richtung) * distanz];
}

/** 1.0-Verlauf: versetzt und vereinfacht (jeder zweite Stützpunkt entfällt). */
function versetze(pfad: Pfad, signatur: string): Pfad {
  const [dLon, dLat] = versatzFuer(signatur);
  return pfad
    .filter((_, index) => index % 2 === 0 || index === pfad.length - 1)
    .map(([lon, lat]) => [lon + dLon, lat + dLat]);
}
