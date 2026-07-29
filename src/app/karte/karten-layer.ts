import GeoJSONLayer from '@arcgis/core/layers/GeoJSONLayer.js';

/**
 * Layer-Definitionen der Karte — Symbolik übernommen aus dem Projekt
 * `ivs-map` (Testgebiet Bern). Die GeoJSON-Dateien liegen als Kopien in
 * public/data/. Dazu kommt der Layer «IVS-Objekte» mit den Geometrien der
 * Mock-Objekte (generiert von tools/build-objekte.mjs).
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
          effects: [{ type: 'CIMGeometricEffectOffset', offset: versatz, method: 'Rounded', option: 'Fast' }],
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
      `M-${halbeBreite},${von} L${halbeBreite},${von} ` + `L${halbeBreite},${bis} L-${halbeBreite},${bis} Z `;
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

const LINIENBREITE = { wegoberflaeche: 7, wegform: 4.5, route: 3, objekt: 4 };
const ROUTENFARBE = [255, 61, 0];
const WEGFORM_FARBE = [0, 145, 255];

/** Primärfarbe des Themes (Indigo) für den Objekt-Layer. */
const OBJEKT_FARBE = [79, 70, 229];

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

export type WegoberflaechenArt = 'Hartbelag' | 'Schotterung' | 'Lockermaterial' | 'Lockermaterial + Schotterung';

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
        { value: 'LEFT', label: 'links', symbol: versetzteLinie(WEGFORM_FARBE, LINIENBREITE.wegform, 8) },
        { value: 'RIGHT', label: 'rechts', symbol: versetzteLinie(WEGFORM_FARBE, LINIENBREITE.wegform, -8) },
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
      uniqueValueInfos: IVS_KLASSEN.map(([value, farbe]) => ({ value, label: value, symbol: punkt(farbe, 8) })),
    },
    legende: { form: 'punkt', farbe: [220, 38, 38] },
  },
  // Die Objekt-Geometrien liegen in zwei Dateien, weil ein GeoJSONLayer nur
  // einen Geometrietyp trägt: Linien (Abschnitte) und Punkte (Wegbegleiter).
  {
    id: 'objekte',
    titel: 'IVS-Objekte',
    datei: 'ivs-objekte',
    sichtbar: true,
    renderer: einfach(linie(OBJEKT_FARBE, LINIENBREITE.objekt), 'IVS-Objekt'),
    legende: { form: 'linie', farbe: OBJEKT_FARBE },
  },
  {
    id: 'objekte-wegbegleiter',
    titel: 'IVS-Wegbegleiter',
    datei: 'ivs-wegbegleiter',
    sichtbar: true,
    renderer: einfach(punkt(OBJEKT_FARBE, 11), 'IVS-Wegbegleiter'),
    legende: { form: 'punkt', farbe: OBJEKT_FARBE },
  },
];

/** Ids der beiden Objekt-Layer (Selektion, Klick, Polygon-Abfragen). */
export const OBJEKT_LAYER_IDS = ['objekte', 'objekte-wegbegleiter'] as const;

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
