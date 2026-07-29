import { Injectable } from '@angular/core';
import { Ebene } from '../core/model';

interface ObjektFeature {
  properties: { signatur: string; lf: string | null; strecke: string };
  geometry: { type: string; coordinates: unknown };
}

type Bbox = [number, number, number, number]; // xmin, ymin, xmax, ymax (WGS 84)

/**
 * Liefert Begrenzungsrahmen der Objektgeometrien (aus ivs-objekte.geojson
 * und ivs-wegbegleiter.geojson) für den «Kartenausschnitt zur Situierung» —
 * ein statisches WMS-Bild der historischen Dufourkarte von swisstopo.
 */
@Injectable({ providedIn: 'root' })
export class ObjektGeo {
  private features: ObjektFeature[] | null = null;
  private ladePromise: Promise<void> | null = null;

  private async lade(): Promise<void> {
    this.ladePromise ??= Promise.all(
      ['/data/ivs-objekte.geojson', '/data/ivs-wegbegleiter.geojson'].map((url) =>
        fetch(url).then((r) => r.json() as Promise<{ features: ObjektFeature[] }>),
      ),
    ).then((geojsons) => {
      this.features = geojsons.flatMap((g) => g.features);
    });
    return this.ladePromise;
  }

  /** Bbox eines Objekts über alle zugehörigen Features, null wenn unbekannt. */
  async bbox(ebene: Ebene, signatur: string): Promise<Bbox | null> {
    await this.lade();
    if (!this.features) return null;

    const passt = (f: ObjektFeature): boolean => {
      switch (ebene) {
        case 'strecke':
          return f.properties.strecke === signatur;
        case 'linienfuehrung':
          return f.properties.lf === signatur;
        default:
          return f.properties.signatur === signatur;
      }
    };

    let bbox: Bbox | null = null;
    for (const feature of this.features.filter(passt)) {
      bbox = erweitere(bbox, feature.geometry.coordinates);
    }
    return bbox;
  }

  /**
   * URL eines WMS-Bilds (Dufourkarte) um die Objekt-Bbox, mit Rand.
   * Für Punkte wird ein fester Ausschnitt von rund einem Kilometer gewählt.
   */
  async situierungsBild(ebene: Ebene, signatur: string, breite = 640, hoehe = 480): Promise<string | null> {
    const bbox = await this.bbox(ebene, signatur);
    if (!bbox) return null;

    let [xmin, ymin, xmax, ymax] = bbox;
    const minSpanX = 0.013; // ≈ 1 km in Längengrad auf Berner Breite
    const minSpanY = 0.009;
    const randFaktor = 0.35;

    const spanX = Math.max(xmax - xmin, minSpanX);
    const spanY = Math.max(ymax - ymin, minSpanY);
    const cx = (xmin + xmax) / 2;
    const cy = (ymin + ymax) / 2;

    // Seitenverhältnis des Bilds beibehalten
    const zielVerhaeltnis = breite / hoehe;
    let halbX = (spanX * (1 + randFaktor)) / 2;
    let halbY = (spanY * (1 + randFaktor)) / 2;
    // Längengrad-Verkürzung auf Breite ~46.95° einrechnen
    const verkuerzung = Math.cos((cy * Math.PI) / 180);
    if ((halbX * verkuerzung) / halbY < zielVerhaeltnis) {
      halbX = (halbY * zielVerhaeltnis) / verkuerzung;
    } else {
      halbY = (halbX * verkuerzung) / zielVerhaeltnis;
    }

    xmin = cx - halbX;
    xmax = cx + halbX;
    ymin = cy - halbY;
    ymax = cy + halbY;

    const params = new URLSearchParams({
      SERVICE: 'WMS',
      VERSION: '1.3.0',
      REQUEST: 'GetMap',
      FORMAT: 'image/png',
      TRANSPARENT: 'false',
      LAYERS: 'ch.swisstopo.hiks-dufour',
      CRS: 'EPSG:4326',
      // WMS 1.3 mit EPSG:4326: Achsreihenfolge lat/lon
      BBOX: `${ymin},${xmin},${ymax},${xmax}`,
      WIDTH: String(breite),
      HEIGHT: String(hoehe),
      STYLES: '',
    });
    return `https://wms.geo.admin.ch/?${params.toString()}`;
  }
}

function erweitere(bbox: Bbox | null, koordinaten: unknown): Bbox {
  let neu: Bbox = bbox ? [...bbox] : [Infinity, Infinity, -Infinity, -Infinity];
  const verarbeite = (k: unknown): void => {
    if (Array.isArray(k) && typeof k[0] === 'number' && typeof k[1] === 'number') {
      neu = [
        Math.min(neu[0], k[0]),
        Math.min(neu[1], k[1]),
        Math.max(neu[2], k[0]),
        Math.max(neu[3], k[1]),
      ];
    } else if (Array.isArray(k)) {
      for (const teil of k) verarbeite(teil);
    }
  };
  verarbeite(koordinaten);
  return neu;
}
