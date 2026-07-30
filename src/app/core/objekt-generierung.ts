import { IvsObjekt } from './model';
import { SEED_OBJEKTE, Vorlage, objektAusVorlage } from './seed-data';

/** Felder generierter Objekte — der Status ist immer gesetzt. */
type GenerierteFelder = Partial<Vorlage> & Pick<Vorlage, 'status'>;

/**
 * Vollabdeckung der Testdaten mit Mock-Objekten: Jede Geometrie der drei
 * Objekt-Layer (Routen, Teilsegmente, Punktobjekte) gehört zu einem Objekt
 * und reagiert damit auf Hover und Klick.
 *
 * Die Ableitung folgt den echten Gruppierungen der Testdaten:
 * `ivs_ivsfk` fasst Routen zu Strecken zusammen, `ivs_signatur` (z. B.
 * 101/102) unterscheidet Linienführungen, die Routen sind die Abschnitte.
 * Damit kein Objekt aus räumlich getrennten Stücken besteht («keine
 * Lücken»), werden die Gruppen zusätzlich in Zusammenhangskomponenten
 * zerlegt (gemeinsame Linien-Endpunkte mit Toleranz); jede Komponente wird
 * ein eigenes Objekt.
 *
 * Die fünf kuratierten Strecken aus seed-data.ts (BE 7/21/22/23/35) bleiben
 * führend: Ihre Routen sind hier fest zugeordnet; übrige Routen derselben
 * ivs_ivsfk-Gruppe werden als zusätzliche Linienführungen unter der
 * kuratierten Strecke ergänzt. Alles ist deterministisch — gleicher Input,
 * gleiche Signaturen.
 */

// ---------------------------------------------------------------------------
// Kuratierte Zuordnung (Signatur → Feature der Testdaten)
// ---------------------------------------------------------------------------

/** Route (Feld NR) → kuratierte Signatur (Abschnitt oder Linienführung). */
const KURATIERTE_ROUTEN: Record<number, string> = {
  37: 'BE 21.1.1',
  38: 'BE 21.1.2',
  312: 'BE 21.1.3',
  470: 'BE 21.2.1',
  471: 'BE 21.2.2',
  265: 'BE 22.1.1',
  267: 'BE 22.1.2',
  537: 'BE 22.2.1',
  538: 'BE 22.2.2',
  43: 'BE 23.1.1',
  477: 'BE 23.2.1',
  // BE 7 und BE 35 sind über Teilsegmente abgeschnitten — die ganzen Routen
  // sind dort die Linienführungen.
  911: 'BE 7.1',
  916: 'BE 7.2',
  964: 'BE 35.1',
};

/** Teilsegment `${route_nr}/${seg_nr}` → kuratierter Abschnitt. */
const KURATIERTE_TEILSEGMENTE: Record<string, string> = {
  '911/1': 'BE 7.1.1',
  '911/2': 'BE 7.1.2',
  '911/3': 'BE 7.1.3',
  '911/4': 'BE 7.1.4',
  // Route 916 ist von West (Riedbach) nach Ost (Bümpliz) segmentiert,
  // die Abschnitte BE 7.2.x sind aber von Bümpliz her benannt — gedreht.
  '916/1': 'BE 7.2.4',
  '916/2': 'BE 7.2.3',
  '916/3': 'BE 7.2.2',
  '916/4': 'BE 7.2.1',
  '964/1': 'BE 35.1.1',
  '964/2': 'BE 35.1.2',
  '964/3': 'BE 35.1.3',
};

/** Kuratierte Wegbegleiter: Signatur → erstes Punktobjekt (route_nr, Typ). */
const KURATIERTE_WEGBEGLEITER: [string, number, string][] = [
  ['BE 7 W1', 911, 'Kirche'],
  ['BE 7 W2', 911, 'Profanes Gebäude'],
  ['BE 7 W3', 916, 'Distanzstein'],
  ['BE 7 W4', 916, 'Profanes Gebäude'],
  ['BE 21 W1', 910, 'Profanes Gebäude'],
  ['BE 21 W2', 917, 'Distanzstein'],
  ['BE 21 W3', 324, 'Kirche'],
  ['BE 22 W1', 446, 'Einzelbaum'],
  ['BE 35 W1', 964, 'Profanes Gebäude'],
  ['BE 35 W2', 964, 'Brunnen'],
];

/** ivs_ivsfk → kuratierte Strecke. */
const KURATIERTE_STRECKE_FUER_FK: Record<number, string> = {
  32044: 'BE 7',
  37324: 'BE 21',
  37323: 'BE 22',
  37326: 'BE 23',
  32592: 'BE 35',
};

/** Bereits vergebene Strecken-Nummern (werden beim Nummerieren übersprungen). */
const KURATIERTE_NUMMERN = new Set([7, 21, 22, 23, 35]);

// ---------------------------------------------------------------------------
// Signatur-Kette
// ---------------------------------------------------------------------------

/**
 * Eltern-Kette einer Signatur für die Layer-Attribute:
 * «BE 21.1.2» → lf «BE 21.1», strecke «BE 21» ·
 * «BE 7.1» (Linienführung) → lf sie selbst, strecke «BE 7» ·
 * «BE 7 W1» → keine lf, strecke «BE 7».
 * Leere Strings statt null: Ein durchgehend null-wertiges Feld kann der
 * GeoJSONLayer nicht typisieren und verwirft es.
 */
export function signaturKette(signatur: string): { lf: string; strecke: string } {
  if (/ W\d+$/.test(signatur)) {
    return { lf: '', strecke: signatur.replace(/ W\d+$/, '') };
  }
  const teile = signatur.split('.');
  if (teile.length === 3) return { lf: teile.slice(0, 2).join('.'), strecke: teile[0] };
  if (teile.length === 2) return { lf: signatur, strecke: teile[0] };
  return { lf: '', strecke: signatur };
}

// ---------------------------------------------------------------------------
// Modell
// ---------------------------------------------------------------------------

export interface ObjektZuordnung {
  /** Route (NR) → Signatur (Abschnitt oder Linienführung). */
  route: ReadonlyMap<number, string>;
  /** Teilsegment `${route_nr}/${seg_nr}` → Signatur. */
  teilsegment: ReadonlyMap<string, string>;
  /** Punktobjekt (Feature-Index in Dateireihenfolge) → Signatur. */
  punkt: ReadonlyMap<number, string>;
}

export interface ObjektModell {
  /** Generierte Objekte (ohne die kuratierten aus seed-data.ts). */
  generierte: IvsObjekt[];
  zuordnung: ObjektZuordnung;
}

interface GeoJsonFeature {
  properties: Record<string, unknown>;
  geometry: { type: string; coordinates: unknown };
}

interface RoutenInfo {
  nr: number;
  fk: number;
  code: number; // ivs_signatur (101, 102, …)
  feature: GeoJsonFeature;
}

let modellPromise: Promise<ObjektModell> | null = null;

/** Modell laden und generieren — einmal pro Sitzung, danach aus dem Cache. */
export function ladeObjektModell(): Promise<ObjektModell> {
  modellPromise ??= erzeugeModell();
  return modellPromise;
}

async function ladeGeoJson(datei: string): Promise<{ features: GeoJsonFeature[] }> {
  const antwort = await fetch(`/data/${datei}.geojson`);
  return (await antwort.json()) as { features: GeoJsonFeature[] };
}

async function erzeugeModell(): Promise<ObjektModell> {
  const [routenGeo, teilsegmenteGeo, punkteGeo] = await Promise.all([
    ladeGeoJson('routen_bern_korrigiert'),
    ladeGeoJson('routen_bern_teilsegmente'),
    ladeGeoJson('prototyp2_ivs_punktobjekte_bern_with_text_new'),
  ]);

  const routen: RoutenInfo[] = routenGeo.features.map((f) => ({
    nr: f.properties['NR'] as number,
    fk: f.properties['ivs_ivsfk'] as number,
    code: f.properties['ivs_signatur'] as number,
    feature: f,
  }));

  const routeZuSignatur = new Map<number, string>(
    Object.entries(KURATIERTE_ROUTEN).map(([nr, sig]) => [Number(nr), sig]),
  );
  const generierte: IvsObjekt[] = [];

  // ---- Gruppen bilden (ohne kuratierte Routen) ----------------------------
  const gruppen = new Map<number, RoutenInfo[]>();
  for (const route of routen) {
    if (routeZuSignatur.has(route.nr)) continue;
    const liste = gruppen.get(route.fk) ?? [];
    liste.push(route);
    gruppen.set(route.fk, liste);
  }

  // ---- Kuratierte Gruppen: Rest-Routen als zusätzliche Linienführungen ----
  for (const [fkText, strecke] of Object.entries(KURATIERTE_STRECKE_FUER_FK)) {
    const rest = gruppen.get(Number(fkText));
    if (!rest) continue;
    gruppen.delete(Number(fkText));
    let lfNummer = naechsteLfNummer(strecke);
    for (const komponente of komponenten(rest)) {
      const lfSignatur = `${strecke}.${lfNummer++}`;
      generierte.push(
        ...linienfuehrungMitAbschnitten(lfSignatur, strecke, komponente, routeZuSignatur),
      );
    }
  }

  // ---- Übrige Gruppen: je Zusammenhangskomponente eine Strecke ------------
  const streckenKandidaten: { minNr: number; fk: number; teil: number; routen: RoutenInfo[] }[] =
    [];
  for (const [fk, liste] of gruppen) {
    const teile = komponenten(liste);
    teile.forEach((komponente, i) => {
      streckenKandidaten.push({
        minNr: Math.min(...komponente.map((r) => r.nr)),
        fk,
        teil: teile.length > 1 ? i + 1 : 0,
        routen: komponente,
      });
    });
  }
  streckenKandidaten.sort((a, b) => a.minNr - b.minNr || a.fk - b.fk);

  let nummer = 0;
  for (const kandidat of streckenKandidaten) {
    do nummer++;
    while (KURATIERTE_NUMMERN.has(nummer));
    const streckeSignatur = `BE ${nummer}`;
    const codes = [...new Set(kandidat.routen.map((r) => r.code))].sort((a, b) => a - b);
    generierte.push(
      objektAusVorlage({
        signatur: streckeSignatur,
        ebene: 'strecke',
        name: `Verkehrsweg ${kandidat.fk}${kandidat.teil ? ` (Teil ${kandidat.teil})` : ''}`,
        parent: null,
        ...generierteFelder(Math.min(...codes)),
      }),
    );
    // Linienführungen: je ivs_signatur-Code, bei räumlicher Trennung weiter
    // in Komponenten zerlegt — auch hier keine Lücken.
    let lfNummer = 1;
    for (const code of codes) {
      const codeRouten = kandidat.routen.filter((r) => r.code === code);
      for (const komponente of komponenten(codeRouten)) {
        const lfSignatur = `${streckeSignatur}.${lfNummer++}`;
        generierte.push(
          ...linienfuehrungMitAbschnitten(lfSignatur, streckeSignatur, komponente, routeZuSignatur),
        );
      }
    }
  }

  // ---- Teilsegmente: kuratierte Ausnahmen, sonst Signatur der Route -------
  const teilsegmentZuSignatur = new Map<string, string>();
  for (const f of teilsegmenteGeo.features) {
    const schluessel = `${f.properties['route_nr']}/${f.properties['seg_nr']}`;
    const signatur =
      KURATIERTE_TEILSEGMENTE[schluessel] ??
      routeZuSignatur.get(f.properties['route_nr'] as number);
    if (signatur) teilsegmentZuSignatur.set(schluessel, signatur);
  }

  // ---- Punktobjekte: kuratierte zuerst (First-Match), Rest generieren -----
  const punktZuSignatur = new Map<number, string>();
  for (const [signatur, nr, art] of KURATIERTE_WEGBEGLEITER) {
    const index = punkteGeo.features.findIndex(
      (f, i) =>
        !punktZuSignatur.has(i) &&
        f.properties['route_nr'] === nr &&
        f.properties['ivs_deutsc'] === art,
    );
    if (index >= 0) punktZuSignatur.set(index, signatur);
  }
  const wNummern = new Map<string, number>();
  for (const objekt of SEED_OBJEKTE) {
    if (objekt.ebene !== 'wegbegleiter') continue;
    const strecke = signaturKette(objekt.signatur).strecke;
    wNummern.set(strecke, Math.max(wNummern.get(strecke) ?? 0, wNummer(objekt.signatur)));
  }
  punkteGeo.features.forEach((f, index) => {
    if (punktZuSignatur.has(index)) return;
    const routenSignatur = routeZuSignatur.get(f.properties['route_nr'] as number);
    if (!routenSignatur) return;
    const strecke = signaturKette(routenSignatur).strecke;
    const nummer = (wNummern.get(strecke) ?? 0) + 1;
    wNummern.set(strecke, nummer);
    const signatur = `${strecke} W${nummer}`;
    punktZuSignatur.set(index, signatur);
    const typ = (f.properties['ivs_deutsc'] as string) || 'Anderer Wegbegleiter';
    const name = ((f.properties['easyocr'] as string | null) ?? '').trim() || typ;
    generierte.push(
      objektAusVorlage({
        signatur,
        ebene: 'wegbegleiter',
        name,
        parent: strecke,
        wegbegleiterTyp: typ,
        substanzgrad: null,
        ...generierteFelder(null),
      }),
    );
  });

  return {
    generierte,
    zuordnung: {
      route: routeZuSignatur,
      teilsegment: teilsegmentZuSignatur,
      punkt: punktZuSignatur,
    },
  };
}

/** Linienführung samt Abschnitten (eine Route = ein Abschnitt) erzeugen. */
function linienfuehrungMitAbschnitten(
  lfSignatur: string,
  strecke: string,
  komponente: RoutenInfo[],
  routeZuSignatur: Map<number, string>,
): IvsObjekt[] {
  const sortiert = [...komponente].sort((a, b) => a.nr - b.nr);
  const code = Math.min(...sortiert.map((r) => r.code));
  const objekte: IvsObjekt[] = [
    objektAusVorlage({
      signatur: lfSignatur,
      ebene: 'linienfuehrung',
      name: `Linienführung ${code}`,
      parent: strecke,
      ...generierteFelder(code),
    }),
  ];
  sortiert.forEach((route, i) => {
    const signatur = `${lfSignatur}.${i + 1}`;
    routeZuSignatur.set(route.nr, signatur);
    objekte.push(
      objektAusVorlage({
        signatur,
        ebene: 'abschnitt',
        name: `Route ${route.nr}`,
        parent: lfSignatur,
        ...generierteFelder(route.code),
      }),
    );
  });
  return objekte;
}

/**
 * Gemeinsame Felder generierter Objekte. Bedeutung und Substanzgrad werden
 * aus dem ivs_signatur-Code abgeleitet (Hunderter: 1 = national, 2 =
 * regional, 3 = lokal; Einer: 1 = viel, 2 = mit, 3 = wenig Substanz) —
 * deterministisch und aus den Testdaten begründet.
 */
function generierteFelder(code: number | null): GenerierteFelder {
  const basis: GenerierteFelder = {
    status: 'publiziert',
    gemeinden: '',
    geschichteText:
      'Übernommen aus IVS 1.0; Beschrieb im Rahmen der Nachführung noch nicht überarbeitet.',
  };
  if (code === null) return basis;
  const bedeutung = Math.floor(code / 100);
  const substanz = code % 10;
  return {
    ...basis,
    nhgWert: bedeutung === 2 ? 'regional' : bedeutung === 3 ? 'lokal' : 'national',
    substanzgrad:
      substanz === 1
        ? 'viel_substanz'
        : substanz === 2
          ? 'mit_substanz'
          : substanz === 3
            ? 'wenig_substanz'
            : 'ohne_substanz',
  };
}

function wNummer(signatur: string): number {
  const treffer = / W(\d+)$/.exec(signatur);
  return treffer ? Number(treffer[1]) : 0;
}

/** Nächste freie Linienführungs-Nummer unter einer kuratierten Strecke. */
function naechsteLfNummer(strecke: string): number {
  let max = 0;
  for (const objekt of SEED_OBJEKTE) {
    if (objekt.ebene !== 'linienfuehrung' || objekt.parent !== strecke) continue;
    const nummer = Number(objekt.signatur.split('.')[1]);
    if (Number.isFinite(nummer)) max = Math.max(max, nummer);
  }
  return max + 1;
}

// ---------------------------------------------------------------------------
// Zusammenhangskomponenten über gemeinsame Linien-Endpunkte
// ---------------------------------------------------------------------------

/** Toleranz fürs Zusammenfassen von Endpunkten (~11 m in Grad). */
const ENDPUNKT_TOLERANZ = 1e-4;

function endpunkte(feature: GeoJsonFeature): [number, number][] {
  const g = feature.geometry;
  const linien = (g.type === 'LineString' ? [g.coordinates] : g.coordinates) as [
    number,
    number,
  ][][];
  const punkte: [number, number][] = [];
  for (const linie of linien) {
    if (linie.length) punkte.push(linie[0], linie[linie.length - 1]);
  }
  return punkte;
}

function rasterSchluessel(punkt: [number, number]): string {
  return `${Math.round(punkt[0] / ENDPUNKT_TOLERANZ)}/${Math.round(punkt[1] / ENDPUNKT_TOLERANZ)}`;
}

/** Routen einer Gruppe in Zusammenhangskomponenten zerlegen (Union-Find). */
function komponenten(routen: RoutenInfo[]): RoutenInfo[][] {
  const eltern = routen.map((_, i) => i);
  const finde = (i: number): number => {
    while (eltern[i] !== i) {
      eltern[i] = eltern[eltern[i]];
      i = eltern[i];
    }
    return i;
  };
  const vereine = (a: number, b: number): void => {
    const ra = finde(a);
    const rb = finde(b);
    if (ra !== rb) eltern[ra] = rb;
  };

  const punktZuIndex = new Map<string, number[]>();
  routen.forEach((route, i) => {
    for (const punkt of endpunkte(route.feature)) {
      const schluessel = rasterSchluessel(punkt);
      const liste = punktZuIndex.get(schluessel) ?? [];
      liste.push(i);
      punktZuIndex.set(schluessel, liste);
    }
  });
  for (const indizes of punktZuIndex.values()) {
    for (let i = 1; i < indizes.length; i++) vereine(indizes[0], indizes[i]);
  }

  const proWurzel = new Map<number, RoutenInfo[]>();
  routen.forEach((route, i) => {
    const wurzel = finde(i);
    const liste = proWurzel.get(wurzel) ?? [];
    liste.push(route);
    proWurzel.set(wurzel, liste);
  });
  // Deterministische Reihenfolge: Komponente mit kleinster Routen-Nummer zuerst
  return [...proWurzel.values()].sort(
    (a, b) => Math.min(...a.map((r) => r.nr)) - Math.min(...b.map((r) => r.nr)),
  );
}
