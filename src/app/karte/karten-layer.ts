import GeoJSONLayer from '@arcgis/core/layers/GeoJSONLayer.js';
import WebTileLayer from '@arcgis/core/layers/WebTileLayer.js';
import { ObjektTyp } from '../core/model';
import { ObjektZuordnung, ladeObjektModell, signaturKette } from '../core/objekt-generierung';

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

/** Einheitliche Farbe der Punktobjekte (rot, wie in der Legende). */
const PUNKTOBJEKT_FARBE = [220, 38, 38];

/** Farbe der Abschnitts-Typen (blau, durch die Liniendicke unterschieden). */
const ABSCHNITT_FARBE = [21, 101, 192];

/**
 * Einheitliche Legende je Objekttyp — dieselben Formen und Farben überall:
 * Karten-Renderer, Kartenbild-Panel, Hierarchie-Dropdown, MapTip und
 * Objektlisten. `dicke` ist zugleich Linienbreite auf der Karte (pt) und
 * Symbolhöhe im UI (px); Strecke und Linienführung sind bewusst identisch
 * (orange, gleich dick — auf der Karte unterscheiden sie die Grenzmarken).
 */
export const OBJEKT_TYP_SYMBOL: Record<
  ObjektTyp,
  { form: 'linie' | 'punkt'; dicke: number; farbe: number[] }
> = {
  strecke: { form: 'linie', dicke: 3, farbe: ROUTENFARBE },
  linienfuehrung: { form: 'linie', dicke: 3, farbe: ROUTENFARBE },
  abschnitt_substanz: { form: 'linie', dicke: 2, farbe: ABSCHNITT_FARBE },
  abschnitt_viel_substanz: { form: 'linie', dicke: 3.5, farbe: ABSCHNITT_FARBE },
  kunstbaute: { form: 'linie', dicke: 5, farbe: ABSCHNITT_FARBE },
  wegbegleiter: { form: 'punkt', dicke: 8, farbe: PUNKTOBJEKT_FARBE },
};

/** CSS-Farbwert eines Legenden-Symbols. */
export function symbolFarbe(farbe: number[]): string {
  return `rgb(${farbe.join(',')})`;
}

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
  /** Quelldatei in public/data/ — leer beim generierten Kunstbauten-Layer. */
  datei: string;
  sichtbar: boolean;
  renderer: Symbolik;
  /** Farbe für das Legenden-Symbol im Layer-Panel. */
  legende: {
    form: 'linie' | 'linie-duenn' | 'linie-dick' | 'linie-gestrichelt' | 'punkt' | 'flaeche';
    farbe: number[];
  };
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
  // Objekttypen gemäss einheitlicher Legende: Strecken/Linienführungen orange
  // zuunterst, darüber die blauen Abschnitts-Typen (nach Substanz), zuoberst
  // die Kunstbauten mit eigener, generierter Teilstück-Geometrie.
  {
    id: 'routen',
    titel: 'Strecke / Linienführung',
    datei: 'routen_bern_korrigiert',
    sichtbar: true,
    renderer: einfach(
      linie(ROUTENFARBE, OBJEKT_TYP_SYMBOL.strecke.dicke),
      'Strecke / Linienführung',
    ),
    legende: { form: 'linie', farbe: ROUTENFARBE },
  },
  {
    id: 'abschnitte-substanz',
    titel: 'Abschnitt mit Substanz',
    datei: 'routen_bern_teilsegmente',
    sichtbar: true,
    renderer: einfach(
      linie(ABSCHNITT_FARBE, OBJEKT_TYP_SYMBOL.abschnitt_substanz.dicke),
      'Abschnitt mit Substanz',
    ),
    legende: { form: 'linie-duenn', farbe: ABSCHNITT_FARBE },
    filter: "typ = 'abschnitt_substanz'",
  },
  {
    id: 'abschnitte-viel-substanz',
    titel: 'Abschnitt mit viel Substanz',
    datei: 'routen_bern_teilsegmente',
    sichtbar: true,
    renderer: einfach(
      linie(ABSCHNITT_FARBE, OBJEKT_TYP_SYMBOL.abschnitt_viel_substanz.dicke),
      'Abschnitt mit viel Substanz',
    ),
    legende: { form: 'linie', farbe: ABSCHNITT_FARBE },
    filter: "typ = 'abschnitt_viel_substanz'",
  },
  {
    id: 'kunstbauten',
    titel: 'Kunstbaute',
    datei: '',
    sichtbar: true,
    renderer: einfach(linie(ABSCHNITT_FARBE, OBJEKT_TYP_SYMBOL.kunstbaute.dicke), 'Kunstbaute'),
    legende: { form: 'linie-dick', farbe: ABSCHNITT_FARBE },
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
    legende: { form: 'linie-gestrichelt', farbe: [0, 0, 0] },
  },
  {
    id: 'routengrenzen',
    titel: 'Routengrenze',
    datei: 'routen_bern_routengrenzen',
    sichtbar: true,
    minScale: 20000,
    renderer: grenzRenderer(grenzmarke(1.8, 1), 'Routengrenze'),
    legende: { form: 'linie-dick', farbe: [0, 0, 0] },
  },
  {
    id: 'punktobjekte',
    titel: 'Wegbegleiter',
    datei: 'prototyp2_ivs_punktobjekte_bern_with_text_new',
    sichtbar: true,
    renderer: einfach(
      punkt(PUNKTOBJEKT_FARBE, OBJEKT_TYP_SYMBOL.wegbegleiter.dicke),
      'Wegbegleiter',
    ),
    legende: { form: 'punkt', farbe: PUNKTOBJEKT_FARBE },
  },
];

/**
 * Ids der Layer, die die IVS-Objekte tragen (Selektion, Klick, Hover,
 * Polygon-Abfragen). Es sind die bestehenden Fach-Layer — angereichert über
 * `erzeugeObjektLayer` — plus der generierte Kunstbauten-Layer.
 */
export const OBJEKT_LAYER_IDS = [
  'routen',
  'abschnitte-substanz',
  'abschnitte-viel-substanz',
  'kunstbauten',
  'punktobjekte',
] as const;

/** Quelldateien der Objekt-Features (die Kunstbauten kommen aus der Generierung). */
const OBJEKT_QUELLDATEIEN = [
  'routen_bern_korrigiert',
  'routen_bern_teilsegmente',
  'prototyp2_ivs_punktobjekte_bern_with_text_new',
] as const;

// ---------------------------------------------------------------------------
// Objekt-Anreicherung: die Zuordnung liefert core/objekt-generierung.ts
// (kuratierte Objekte plus generierte Vollabdeckung — jede Geometrie gehört
// zu einem Objekt).
// ---------------------------------------------------------------------------

interface GeoJsonFeature {
  properties: Record<string, unknown>;
  geometry: { type: string; coordinates: unknown };
}

/** Objekt-Attribute auf ein Feature stempeln. */
function stemple(
  feature: GeoJsonFeature,
  signatur: string,
  ebene: string,
  typProSignatur: ReadonlyMap<string, ObjektTyp>,
): void {
  const { lf, strecke } = signaturKette(signatur);
  Object.assign(feature.properties, {
    signatur,
    ebene,
    lf,
    strecke,
    typ: typProSignatur.get(signatur) ?? '',
  });
}

function ebeneAusSignatur(signatur: string): string {
  if (/ W\d+$/.test(signatur)) return 'wegbegleiter';
  const teile = signatur.split('.').length;
  return teile === 3 ? 'abschnitt' : teile === 2 ? 'linienfuehrung' : 'strecke';
}

/**
 * Objekt-Attribute in die Features des geladenen GeoJSON eintragen (je
 * Quelldatei). Nicht zugeordnete Features bekommen leere Strings (ein
 * durchgehend null-wertiges Feld würde der GeoJSONLayer verwerfen).
 */
function reichereAn(
  datei: string,
  features: GeoJsonFeature[],
  zuordnung: ObjektZuordnung,
  typProSignatur: ReadonlyMap<string, ObjektTyp>,
): void {
  for (const f of features) {
    Object.assign(f.properties, { signatur: '', ebene: '', lf: '', strecke: '', typ: '' });
  }
  switch (datei) {
    case 'routen_bern_korrigiert':
      for (const f of features) {
        const signatur = zuordnung.route.get(f.properties['NR'] as number);
        if (signatur) stemple(f, signatur, ebeneAusSignatur(signatur), typProSignatur);
      }
      break;
    case 'routen_bern_teilsegmente':
      for (const f of features) {
        const signatur = zuordnung.teilsegment.get(
          `${f.properties['route_nr']}/${f.properties['seg_nr']}`,
        );
        if (signatur) stemple(f, signatur, ebeneAusSignatur(signatur), typProSignatur);
      }
      break;
    default:
      features.forEach((f, index) => {
        const signatur = zuordnung.punkt.get(index);
        if (signatur) stemple(f, signatur, 'wegbegleiter', typProSignatur);
      });
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
  const [modell, ...geojsons] = await Promise.all([
    ladeObjektModell(),
    ...OBJEKT_QUELLDATEIEN.map((d) => ladeGeoJson(d)),
  ]);
  const features: ObjektFeature[] = [];
  for (const [i, geojson] of geojsons.entries()) {
    reichereAn(OBJEKT_QUELLDATEIEN[i], geojson.features, modell.zuordnung, modell.typProSignatur);
    features.push(
      ...(geojson.features as unknown as ObjektFeature[]).filter(
        (f) => f.properties.signatur !== '',
      ),
    );
  }
  // Kunstbauten kommen bereits gestempelt aus der Generierung
  features.push(...(modell.kunstbautenFeatures as unknown as ObjektFeature[]));
  return features;
}

/**
 * Gestempelte GeoJSON-Quelle als Blob — je Quelldatei einmal erzeugt, auch
 * wenn mehrere Layer sie verwenden (die beiden Abschnitts-Layer teilen sich
 * die Teilsegmente und filtern per definitionExpression). Die Blob-URL wird
 * dagegen je Layer vergeben — zwei GeoJSONLayer auf derselben URL kommen
 * sich beim parallelen Erstaufbau in die Quere.
 */
const quellBlobCache = new Map<string, Promise<Blob>>();
const quellUrlCache = new Map<string, Promise<string>>();

function objektQuellBlob(datei: string): Promise<Blob> {
  const schluessel = datei || 'kunstbauten';
  let blob = quellBlobCache.get(schluessel);
  if (!blob) {
    blob = (async () => {
      const modell = await ladeObjektModell();
      const geojson = datei
        ? await ladeGeoJson(datei)
        : { type: 'FeatureCollection', features: modell.kunstbautenFeatures };
      if (datei) {
        reichereAn(datei, geojson.features, modell.zuordnung, modell.typProSignatur);
      }
      return new Blob([JSON.stringify(geojson)], { type: 'application/json' });
    })();
    quellBlobCache.set(schluessel, blob);
  }
  return blob;
}

function objektQuellUrl(def: LayerDef): Promise<string> {
  let url = quellUrlCache.get(def.id);
  if (!url) {
    url = objektQuellBlob(def.datei).then((blob) => URL.createObjectURL(blob));
    quellUrlCache.set(def.id, url);
  }
  return url;
}

/**
 * Layer mit Objekt-Anreicherung erzeugen: GeoJSON laden, Attribute stempeln
 * und den Layer aus einer Blob-URL speisen. Der Kunstbauten-Layer (ohne
 * Quelldatei) wird aus den generierten Teilstück-Geometrien gespeist.
 */
export async function erzeugeObjektLayer(def: LayerDef): Promise<GeoJSONLayer> {
  const url = await objektQuellUrl(def);
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
