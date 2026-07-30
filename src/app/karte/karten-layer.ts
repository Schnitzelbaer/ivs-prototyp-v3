import GeoJSONLayer from '@arcgis/core/layers/GeoJSONLayer.js';
import WebTileLayer from '@arcgis/core/layers/WebTileLayer.js';

/**
 * Layer-Definitionen der Karte — Symbolik übernommen aus dem Projekt
 * `ivs-map` (Testgebiet Bern). Die GeoJSON-Dateien liegen als Kopien in
 * public/data/.
 *
 * Die Mock-Objekte haben KEINE eigenen Layer: Die bestehenden Layer (Routen,
 * Teilsegmente, Punktobjekte) sind die Objekte. Beim Laden werden die
 * betroffenen Features über die Zuordnungstabellen unten mit den
 * Objekt-Attributen `signatur`, `lf`, `strecke`, `ebene` angereichert
 * (alle übrigen Features tragen leere Strings — ein durchgehend null-wertiges
 * Feld würde der GeoJSONLayer verwerfen).
 *
 * Reihenfolge in LAYER_DEFS = Zeichenreihenfolge (unten zuerst).
 */

type Symbolik = Record<string, unknown>;

const linie = (color: number[], width: number, style = 'solid'): Symbolik => ({
  type: 'simple-line',
  color,
  width,
  style,
});

const punkt = (color: number[], size = 6): Symbolik => ({
  type: 'simple-marker',
  style: 'circle',
  color,
  size,
  outline: { color: [255, 255, 255, 0.9], width: 0.8 },
});

const flaeche = (color: number[], outline: number[]): Symbolik => ({
  type: 'simple-fill',
  color,
  outline: { color: outline, width: 1 },
});

const einfach = (symbol: Symbolik, label: string): Symbolik => ({ type: 'simple', symbol, label });

/**
 * Seitlich versetzte Linie (Wegformen): Der Versatz steckt als geometrischer
 * Effekt im CIM-Symbol, damit der Abstand zur Route auf jeder Zoomstufe
 * gleich bleibt. Positiver Versatz liegt links der Digitalisierungsrichtung.
 */
const versetzteLinie = (farbe: number[], breite: number, versatz: number): Symbolik => ({
  type: 'cim',
  data: {
    type: 'CIMSymbolReference',
    symbol: {
      type: 'CIMLineSymbol',
      symbolLayers: [
        {
          type: 'CIMSolidStroke',
          enable: true,
          width: breite,
          color: [...farbe, 255],
          capStyle: 'Butt',
          joinStyle: 'Round',
          effects: [
            {
              type: 'CIMGeometricEffectOffset',
              offset: versatz,
              method: 'Rounded',
              option: 'Fast',
            },
          ],
        },
      ],
    },
  },
});

// Marke quer zur Route an Segment-/Routengrenzen, bildschirmfest; Ausrichtung
// über die Rotations-Visualisierungsvariable aus dem Feld `winkel`.
const GRENZMARKE_LAENGE = 18;
const GRENZMARKE_LUECKE = 1.4;

function grenzmarke(halbeBreite: number, striche: number): Symbolik {
  const luecken = (striche - 1) * GRENZMARKE_LUECKE;
  const strich = (GRENZMARKE_LAENGE - luecken) / striche;
  const r = (v: number) => +v.toFixed(3);
  let pfad = '';
  for (let i = 0; i < striche; i++) {
    const von = r(-9 + i * (strich + GRENZMARKE_LUECKE));
    const bis = r(von + strich);
    pfad +=
      `M-${halbeBreite},${von} L${halbeBreite},${von} ` +
      `L${halbeBreite},${bis} L-${halbeBreite},${bis} Z `;
  }
  return {
    type: 'simple-marker',
    style: 'path',
    path: pfad.trim(),
    size: GRENZMARKE_LAENGE,
    color: [0, 0, 0],
    outline: { width: 0 },
  };
}

const grenzRenderer = (symbol: Symbolik, label: string): Symbolik => ({
  type: 'simple',
  symbol,
  label,
  visualVariables: [{ type: 'rotation', field: 'winkel', rotationType: 'geographic' }],
});

const LINIENBREITE = { wegoberflaeche: 7, wegform: 4.5, route: 3 };
const ROUTENFARBE = [255, 61, 0];
const WEGFORM_FARBE = [0, 145, 255];

const IVS_KLASSEN: [string, number[]][] = [
  ['Einzelbaum', [21, 128, 61]],
  ['Profanes Gebäude', [120, 113, 108]],
  ['Anderer Wegbegleiter', [14, 165, 233]],
  ['Brunnen', [37, 99, 235]],
  ['Anderer Stein', [113, 113, 122]],
  ['Kirche', [147, 51, 234]],
  ['Distanzstein', [217, 70, 239]],
  ['Gewerbebetrieb', [234, 88, 12]],
  ['Burg, Schloss / Burgstelle, Ruine', [190, 18, 60]],
  ['Kapelle', [126, 34, 206]],
  ['Fähre', [8, 145, 178]],
  ['Inschrift', [202, 138, 4]],
];

export type WegoberflaechenArt =
  'Hartbelag' | 'Schotterung' | 'Lockermaterial' | 'Lockermaterial + Schotterung';

export const WEGOBERFLAECHEN: { art: WegoberflaechenArt; farbe: number[] }[] = [
  { art: 'Hartbelag', farbe: [124, 0, 255] },
  { art: 'Schotterung', farbe: [255, 145, 0] },
  { art: 'Lockermaterial', farbe: [255, 214, 0] },
  { art: 'Lockermaterial + Schotterung', farbe: [0, 230, 118] },
];

export interface LayerDef {
  id: string;
  titel: string;
  datei: string;
  sichtbar: boolean;
  renderer: Symbolik;
  /** Farbe für das Legenden-Symbol im Layer-Panel. */
  legende: { form: 'linie' | 'punkt' | 'flaeche'; farbe: number[] };
  /** Optionaler Attributfilter (definitionExpression). */
  filter?: string;
  /** Erst ab diesem Massstab anzeigen (z. B. 20000 = ab 1:20'000). */
  minScale?: number;
}

export const LAYER_DEFS: LayerDef[] = [
  {
    id: 'bruecken',
    titel: 'Brücke',
    datei: 'detection_bruecken_raw',
    sichtbar: false,
    renderer: einfach(flaeche([109, 40, 217, 0.45], [109, 40, 217]), 'Brücke (Detektion)'),
    legende: { form: 'flaeche', farbe: [109, 40, 217] },
  },
  ...WEGOBERFLAECHEN.map(({ art, farbe }) => ({
    id: `wegoberflaeche-${art.toLowerCase().replace(/[^a-z]+/g, '-')}`,
    titel: art,
    datei: 'wegoberflaechen_bern_segmentiert',
    sichtbar: true,
    renderer: einfach(linie(farbe, LINIENBREITE.wegoberflaeche), art),
    legende: { form: 'linie' as const, farbe },
    filter: `ivs_wegoberflaeche_art = '${art.replace(/'/g, "''")}'`,
  })),
  {
    id: 'boeschung',
    titel: 'Böschung',
    datei: 'wegformen_segmented_lines',
    sichtbar: true,
    renderer: {
      type: 'unique-value',
      field: 'SIDE',
      uniqueValueInfos: [
        {
          value: 'LEFT',
          label: 'links',
          symbol: versetzteLinie(WEGFORM_FARBE, LINIENBREITE.wegform, 8),
        },
        {
          value: 'RIGHT',
          label: 'rechts',
          symbol: versetzteLinie(WEGFORM_FARBE, LINIENBREITE.wegform, -8),
        },
      ],
    },
    legende: { form: 'linie', farbe: WEGFORM_FARBE },
  },
  {
    id: 'teilsegmente',
    titel: 'Teilsegment',
    datei: 'routen_bern_teilsegmente',
    sichtbar: true,
    renderer: einfach(linie(ROUTENFARBE, LINIENBREITE.route), 'Teilsegment'),
    legende: { form: 'linie', farbe: ROUTENFARBE },
  },
  {
    id: 'routen',
    titel: 'Route',
    datei: 'routen_bern_korrigiert',
    sichtbar: true,
    renderer: einfach(linie(ROUTENFARBE, LINIENBREITE.route), 'Route'),
    legende: { form: 'linie', farbe: ROUTENFARBE },
  },
  {
    id: 'segmentgrenzen',
    titel: 'Segmentgrenze',
    datei: 'routen_bern_segmentgrenzen',
    sichtbar: true,
    // Bildschirmfeste Marken — auf Übersichts-Zoomstufen würden sie die
    // ganze Karte fluten, deshalb erst ab 1:20'000 sichtbar.
    minScale: 20000,
    renderer: grenzRenderer(grenzmarke(0.9, 5), 'Segmentgrenze'),
    legende: { form: 'punkt', farbe: [0, 0, 0] },
  },
  {
    id: 'routengrenzen',
    titel: 'Routengrenze',
    datei: 'routen_bern_routengrenzen',
    sichtbar: true,
    minScale: 20000,
    renderer: grenzRenderer(grenzmarke(1.8, 1), 'Routengrenze'),
    legende: { form: 'punkt', farbe: [0, 0, 0] },
  },
  {
    id: 'punktobjekte',
    titel: 'Punktobjekt',
    datei: 'prototyp2_ivs_punktobjekte_bern_with_text_new',
    sichtbar: true,
    renderer: {
      type: 'unique-value',
      field: 'ivs_deutsc',
      defaultSymbol: punkt([100, 100, 100], 7),
      uniqueValueInfos: IVS_KLASSEN.map(([value, farbe]) => ({
        value,
        label: value,
        symbol: punkt(farbe, 8),
      })),
    },
    legende: { form: 'punkt', farbe: [220, 38, 38] },
  },
];

/**
 * Ids der Layer, die die IVS-Objekte tragen (Selektion, Klick, Hover,
 * Polygon-Abfragen). Es sind die bestehenden Fach-Layer — angereichert über
 * `erzeugeObjektLayer`.
 */
export const OBJEKT_LAYER_IDS = ['routen', 'teilsegmente', 'punktobjekte'] as const;

// ---------------------------------------------------------------------------
// Zuordnung Mock-Objekte → Features der bestehenden Layer
// (übernommen aus tools/build-objekte.mjs)
// ---------------------------------------------------------------------------

/** Abschnitt-Signatur → ganze Route (Feld NR in routen_bern_korrigiert). */
const ROUTEN_ABSCHNITTE: Record<string, number> = {
  'BE 21.1.1': 37,
  'BE 21.1.2': 38,
  'BE 21.1.3': 312,
  'BE 21.2.1': 470,
  'BE 21.2.2': 471,
  'BE 22.1.1': 265,
  'BE 22.1.2': 267,
  'BE 22.2.1': 537,
  'BE 22.2.2': 538,
  'BE 23.1.1': 43,
  'BE 23.2.1': 477,
};

/** Abschnitt-Signatur → Teilsegment (route_nr, seg_nr). */
const SEGMENT_ABSCHNITTE: Record<string, [number, number]> = {
  'BE 7.1.1': [911, 1],
  'BE 7.1.2': [911, 2],
  'BE 7.1.3': [911, 3],
  'BE 7.1.4': [911, 4],
  // Route 916 ist von West (Riedbach) nach Ost (Bümpliz) segmentiert,
  // die Abschnitte BE 7.2.x sind aber von Bümpliz her benannt — gedreht.
  'BE 7.2.1': [916, 4],
  'BE 7.2.2': [916, 3],
  'BE 7.2.3': [916, 2],
  'BE 7.2.4': [916, 1],
  'BE 35.1.1': [964, 1],
  'BE 35.1.2': [964, 2],
  'BE 35.1.3': [964, 3],
};

/** Wegbegleiter-Signatur → Punktobjekt (route_nr, ivs_deutsc). */
const WEGBEGLEITER: Record<string, [number, string]> = {
  'BE 7 W1': [911, 'Kirche'],
  'BE 7 W2': [911, 'Profanes Gebäude'],
  'BE 7 W3': [916, 'Distanzstein'],
  'BE 7 W4': [916, 'Profanes Gebäude'],
  'BE 21 W1': [910, 'Profanes Gebäude'],
  'BE 21 W2': [917, 'Distanzstein'],
  'BE 21 W3': [324, 'Kirche'],
  'BE 22 W1': [446, 'Einzelbaum'],
  'BE 35 W1': [964, 'Profanes Gebäude'],
  'BE 35 W2': [964, 'Brunnen'],
};

/**
 * «BE 21.1.1» → Linienführung «BE 21.1» und Strecke «BE 21»;
 * Wegbegleiter «BE 7 W1» → Strecke «BE 7» ohne Linienführung.
 */
function kette(signatur: string): { lf: string; strecke: string } {
  if (/ W\d+$/.test(signatur)) {
    return { lf: '', strecke: signatur.replace(/ W\d+$/, '') };
  }
  const teile = signatur.split('.');
  return {
    lf: teile.length === 3 ? teile.slice(0, 2).join('.') : '',
    strecke: teile[0],
  };
}

interface GeoJsonFeature {
  properties: Record<string, unknown>;
  geometry: { type: string; coordinates: unknown };
}

/** Objekt-Attribute auf ein Feature stempeln. */
function stemple(feature: GeoJsonFeature, signatur: string, ebene: string): void {
  const { lf, strecke } = kette(signatur);
  Object.assign(feature.properties, { signatur, ebene, lf, strecke });
}

/**
 * Objekt-Attribute in die Features des geladenen GeoJSON eintragen.
 * Nicht zugeordnete Features bekommen leere Strings.
 */
function reichereAn(layerId: string, features: GeoJsonFeature[]): void {
  for (const f of features) {
    Object.assign(f.properties, { signatur: '', ebene: '', lf: '', strecke: '' });
  }
  switch (layerId) {
    case 'routen':
      for (const [signatur, nr] of Object.entries(ROUTEN_ABSCHNITTE)) {
        const route = features.find((f) => f.properties['NR'] === nr);
        if (route) stemple(route, signatur, 'abschnitt');
      }
      break;
    case 'teilsegmente':
      for (const [signatur, [nr, seg]] of Object.entries(SEGMENT_ABSCHNITTE)) {
        const segment = features.find(
          (f) => f.properties['route_nr'] === nr && f.properties['seg_nr'] === seg,
        );
        if (segment) stemple(segment, signatur, 'abschnitt');
      }
      break;
    case 'punktobjekte':
      for (const [signatur, [nr, art]] of Object.entries(WEGBEGLEITER)) {
        const punktobjekt = features.find(
          (f) => f.properties['route_nr'] === nr && f.properties['ivs_deutsc'] === art,
        );
        if (punktobjekt) stemple(punktobjekt, signatur, 'wegbegleiter');
      }
      break;
  }
}

async function ladeGeoJson(datei: string): Promise<{ features: GeoJsonFeature[] }> {
  const antwort = await fetch(`/data/${datei}.geojson`);
  return (await antwort.json()) as { features: GeoJsonFeature[] };
}

/** Ein Feature mit gestempelter Objekt-Zuordnung. */
export interface ObjektFeature {
  properties: { signatur: string; ebene: string; lf: string; strecke: string };
  geometry: { type: string; coordinates: unknown };
}

/**
 * Alle Features mit Objekt-Zuordnung über die drei Objekt-Layer-Quellen —
 * für Abnehmer ausserhalb der Karte (z. B. das Dufour-Situierungsbild).
 */
export async function ladeObjektFeatures(): Promise<ObjektFeature[]> {
  const defs = LAYER_DEFS.filter((d) => (OBJEKT_LAYER_IDS as readonly string[]).includes(d.id));
  const geojsons = await Promise.all(defs.map((d) => ladeGeoJson(d.datei)));
  const features: ObjektFeature[] = [];
  for (const [i, geojson] of geojsons.entries()) {
    reichereAn(defs[i].id, geojson.features);
    features.push(
      ...(geojson.features as unknown as ObjektFeature[]).filter(
        (f) => f.properties.signatur !== '',
      ),
    );
  }
  return features;
}

/**
 * Layer mit Objekt-Anreicherung erzeugen: GeoJSON laden, Attribute stempeln
 * und den Layer aus einer Blob-URL speisen.
 */
export async function erzeugeObjektLayer(def: LayerDef): Promise<GeoJSONLayer> {
  const geojson = await ladeGeoJson(def.datei);
  reichereAn(def.id, geojson.features);
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(geojson)], { type: 'application/json' }),
  );
  return new GeoJSONLayer({
    url,
    title: def.titel,
    visible: def.sichtbar,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderer: def.renderer as any,
    definitionExpression: def.filter,
    minScale: def.minScale ?? 0,
    copyright: 'ASTRA / IVS',
  });
}

// ---------------------------------------------------------------------------
// Hintergrundkarten und Raster-Overlays (05.04: Inhalte aus der BGDI)
// ---------------------------------------------------------------------------

export interface BasemapDef {
  id: string;
  titel: string;
  /** BGDI-Layer-Id auf wmts.geo.admin.ch */
  layerId: string;
  format: 'jpeg' | 'png';
}

export const BASEMAP_DEFS: readonly BasemapDef[] = [
  {
    id: 'pk-grau',
    titel: 'Landeskarte grau',
    layerId: 'ch.swisstopo.pixelkarte-grau',
    format: 'jpeg',
  },
  {
    id: 'pk-farbe',
    titel: 'Landeskarte farbig',
    layerId: 'ch.swisstopo.pixelkarte-farbe',
    format: 'jpeg',
  },
  {
    id: 'dufour',
    titel: 'Dufourkarte (historisch)',
    layerId: 'ch.swisstopo.hiks-dufour',
    format: 'png',
  },
  { id: 'luftbild', titel: 'Luftbild', layerId: 'ch.swisstopo.swissimage', format: 'jpeg' },
];

export interface OverlayDef {
  id: string;
  titel: string;
  layerId: string;
  format: 'jpeg' | 'png';
  /** Start-Deckkraft in Prozent. */
  deckkraft: number;
}

export const OVERLAY_DEFS: readonly OverlayDef[] = [
  {
    id: 'ivs-gelaende',
    titel: 'IVS-Geländekarte',
    layerId: 'ch.astra.ivs-gelaendekarte',
    format: 'png',
    deckkraft: 70,
  },
  {
    id: 'dufour-overlay',
    titel: 'Dufourkarte (Overlay)',
    layerId: 'ch.swisstopo.hiks-dufour',
    format: 'png',
    deckkraft: 50,
  },
];

export function erzeugeWebTileLayer(
  layerId: string,
  format: 'jpeg' | 'png',
  titel: string,
): WebTileLayer {
  return new WebTileLayer({
    urlTemplate: `https://wmts.geo.admin.ch/1.0.0/${layerId}/default/current/3857/{level}/{col}/{row}.${format}`,
    title: titel,
    copyright: '© <a href="https://www.swisstopo.admin.ch/">swisstopo</a> / BGDI',
    maxScale: 250,
  });
}

export function erzeugeLayer(def: LayerDef): GeoJSONLayer {
  return new GeoJSONLayer({
    url: `/data/${def.datei}.geojson`,
    title: def.titel,
    visible: def.sichtbar,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderer: def.renderer as any,
    definitionExpression: def.filter,
    minScale: def.minScale ?? 0,
    copyright: 'ASTRA / IVS',
  });
}
