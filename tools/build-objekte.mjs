#!/usr/bin/env node
/**
 * Erzeugt die Geometrien der Mock-Objekte aus src/app/core/seed-data.ts,
 * abgeleitet aus den Testdaten in public/data/ (Kopien aus dem Projekt
 * ivs-map, Testgebiet Bern):
 *
 *   - public/data/ivs-objekte.geojson       Linien (Abschnitte)
 *   - public/data/ivs-wegbegleiter.geojson  Punkte (Wegbegleiter)
 *
 * Zwei Dateien, weil ein ArcGIS-GeoJSONLayer nur einen Geometrietyp trägt.
 *
 * Zuordnung:
 *   - Abschnitte der Strecken BE 21/22/23 → ganze Routen (routen_bern_korrigiert)
 *   - Abschnitte der Strecken BE 7/35     → Teilsegmente (routen_bern_teilsegmente)
 *   - Wegbegleiter                        → Punktobjekte (prototyp2_…)
 *
 * Die Features tragen nur Signatur/Ebene/Parent-Kette; Namen und Fachdaten
 * werden zur Laufzeit aus dem ObjektStore aufgelöst (keine doppelte Pflege).
 *
 * Aufruf:  node tools/build-objekte.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const daten = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data');

const lies = (name) => JSON.parse(readFileSync(join(daten, `${name}.geojson`), 'utf8')).features;

const routen = lies('routen_bern_korrigiert');
const teilsegmente = lies('routen_bern_teilsegmente');
const punkte = lies('prototyp2_ivs_punktobjekte_bern_with_text_new');

/** Abschnitt-Signatur → ganze Route (NR). */
const ROUTEN_ABSCHNITTE = {
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
const SEGMENT_ABSCHNITTE = {
  'BE 7.1.1': [911, 1],
  'BE 7.1.2': [911, 2],
  'BE 7.1.3': [911, 3],
  'BE 7.1.4': [911, 4],
  'BE 7.2.1': [916, 1],
  'BE 7.2.2': [916, 2],
  'BE 7.2.3': [916, 3],
  'BE 7.2.4': [916, 4],
  'BE 35.1.1': [964, 1],
  'BE 35.1.2': [964, 2],
  'BE 35.1.3': [964, 3],
};

/** Wegbegleiter-Signatur → Punktobjekt (route_nr, ivs_deutsc). */
const WEGBEGLEITER = {
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

const idAusSignatur = (signatur) => signatur.toLowerCase().replace(/[\s.]+/g, '-');

/** «BE 21.1.1» → Linienführung «BE 21.1» und Strecke «BE 21». */
function kette(signatur) {
  if (/ W\d+$/.test(signatur)) {
    return { lf: null, strecke: signatur.replace(/ W\d+$/, '') };
  }
  const teile = signatur.split('.');
  return {
    lf: teile.length === 3 ? teile.slice(0, 2).join('.') : null,
    strecke: teile[0],
  };
}

function feature(signatur, ebene, geometry) {
  const { lf, strecke } = kette(signatur);
  return {
    type: 'Feature',
    properties: { id: idAusSignatur(signatur), signatur, ebene, lf, strecke },
    geometry,
  };
}

const linienFeatures = [];
const punktFeatures = [];
const fehler = [];

for (const [signatur, nr] of Object.entries(ROUTEN_ABSCHNITTE)) {
  const route = routen.find((f) => f.properties.NR === nr);
  if (!route) {
    fehler.push(`Route ${nr} für ${signatur} nicht gefunden`);
    continue;
  }
  linienFeatures.push(feature(signatur, 'abschnitt', route.geometry));
}

for (const [signatur, [nr, seg]] of Object.entries(SEGMENT_ABSCHNITTE)) {
  const teilsegment = teilsegmente.find((f) => f.properties.route_nr === nr && f.properties.seg_nr === seg);
  if (!teilsegment) {
    fehler.push(`Teilsegment ${nr}/${seg} für ${signatur} nicht gefunden`);
    continue;
  }
  linienFeatures.push(feature(signatur, 'abschnitt', teilsegment.geometry));
}

for (const [signatur, [nr, art]] of Object.entries(WEGBEGLEITER)) {
  const punkt = punkte.find((f) => f.properties.route_nr === nr && f.properties.ivs_deutsc === art);
  if (!punkt) {
    fehler.push(`Punktobjekt ${nr}/${art} für ${signatur} nicht gefunden`);
    continue;
  }
  punktFeatures.push(feature(signatur, 'wegbegleiter', punkt.geometry));
}

if (fehler.length) {
  console.error('Zuordnung unvollständig:');
  for (const f of fehler) console.error('  - ' + f);
  process.exit(1);
}

writeFileSync(join(daten, 'ivs-objekte.geojson'), JSON.stringify({ type: 'FeatureCollection', features: linienFeatures }));
writeFileSync(
  join(daten, 'ivs-wegbegleiter.geojson'),
  JSON.stringify({ type: 'FeatureCollection', features: punktFeatures }),
);
console.log(`ivs-objekte.geojson: ${linienFeatures.length} Linien, ivs-wegbegleiter.geojson: ${punktFeatures.length} Punkte`);
