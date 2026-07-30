/**
 * Generierte Platzhalter-Panoramen (Vorgabe 9: Platzhalter-Bilder genügen).
 *
 * Equirektangulares Format 3600 × 900 (x = Azimut × 10 px): oben eine
 * Gradskala mit Himmelsrichtungen, Hügelzüge aus Sinus-Summen mit
 * ganzzahligen Perioden (dadurch nahtlos), und der Weg als zwei Keile bei
 * Weg-Azimut und Gegenrichtung — blickt man entlang des Wegs, liegt er vor
 * einem, konsistent zum Blickrichtungskegel auf der Karte.
 */

const BREITE = 3600;
const HOEHE = 900;
const HORIZONT = 620;

interface PanoramaOptionen {
  /** Azimut des Wegverlaufs in Grad (Richtung «vorwärts»). */
  wegAzimut: number;
  /** Variiert Hügel und Farbton deterministisch. */
  seed: number;
}

export function erzeugePanorama({ wegAzimut, seed }: PanoramaOptionen): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${BREITE}" height="${HOEHE}" viewBox="0 0 ${BREITE} ${HOEHE}">` +
    defs(seed) +
    `<rect width="${BREITE}" height="${HORIZONT}" fill="url(#himmel)"/>` +
    `<rect y="${HORIZONT}" width="${BREITE}" height="${HOEHE - HORIZONT}" fill="url(#boden)"/>` +
    sonne(seed) +
    huegelzug(seed, 2, 60, HORIZONT - 40, '#b5c4cf') +
    huegelzug(seed + 3, 3, 90, HORIZONT - 6, '#8aa38b') +
    weg(wegAzimut) +
    huegelzug(seed + 7, 5, 26, HOEHE - 40, '#6d8a6e', 0.5) +
    gradskala() +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function defs(seed: number): string {
  const blau = 200 + (seed * 7) % 20;
  return (
    `<defs>` +
    `<linearGradient id="himmel" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="hsl(${blau} 65% 62%)"/>` +
    `<stop offset="1" stop-color="hsl(${blau} 55% 88%)"/>` +
    `</linearGradient>` +
    `<linearGradient id="boden" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#7d9a72"/>` +
    `<stop offset="1" stop-color="#5d7a56"/>` +
    `</linearGradient>` +
    `</defs>`
  );
}

function sonne(seed: number): string {
  const x = ((seed * 977) % BREITE + BREITE) % BREITE;
  return `<circle cx="${x}" cy="150" r="52" fill="#fff7d6" opacity="0.9"/>`;
}

/** Nahtloser Hügelzug: Sinus-Summe mit ganzzahligen Perioden über 360°. */
function huegelzug(seed: number, basisPeriode: number, amplitude: number, basisY: number, farbe: string, deckkraft = 1): string {
  const punkte: string[] = [];
  for (let x = 0; x <= BREITE; x += 30) {
    const t = (x / BREITE) * Math.PI * 2;
    const y =
      basisY -
      amplitude *
        (0.6 * Math.sin(basisPeriode * t + seed) +
          0.3 * Math.sin((basisPeriode + 2) * t + seed * 2.7) +
          0.1 * Math.sin((basisPeriode + 5) * t + seed * 1.3));
    punkte.push(`${x},${y.toFixed(1)}`);
  }
  return `<polygon points="${punkte.join(' ')} ${BREITE},${HOEHE} 0,${HOEHE}" fill="${farbe}" opacity="${deckkraft}"/>`;
}

/** Der Weg als Keil Richtung Weg-Azimut plus Gegenrichtung. */
function weg(wegAzimut: number): string {
  const keil = (azimut: number): string => {
    const x = (((azimut % 360) + 360) % 360) * (BREITE / 360);
    const teile: string[] = [];
    // Wegkörper, an der Bildnaht dupliziert, damit er nahtlos bleibt
    for (const versatz of [-BREITE, 0, BREITE]) {
      const cx = x + versatz;
      teile.push(
        `<path d="M ${cx - 300} ${HOEHE} L ${cx - 14} ${HORIZONT + 8} L ${cx + 14} ${HORIZONT + 8} L ${cx + 300} ${HOEHE} Z" fill="#c9b98f"/>` +
          `<path d="M ${cx - 150} ${HOEHE} L ${cx - 5} ${HORIZONT + 10} M ${cx + 150} ${HOEHE} L ${cx + 5} ${HORIZONT + 10}" stroke="#a8996f" stroke-width="6" fill="none"/>`,
      );
    }
    return teile.join('');
  };
  return keil(wegAzimut) + keil(wegAzimut + 180);
}

/** Gradskala mit Himmelsrichtungen am oberen Rand. */
function gradskala(): string {
  const teile: string[] = [];
  const richtungen: Record<number, string> = { 0: 'N', 45: 'NO', 90: 'O', 135: 'SO', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
  for (let grad = 0; grad < 360; grad += 15) {
    const x = grad * (BREITE / 360);
    const haupt = grad % 45 === 0;
    teile.push(
      `<line x1="${x}" y1="0" x2="${x}" y2="${haupt ? 46 : 26}" stroke="rgba(30,41,59,0.55)" stroke-width="${haupt ? 4 : 2}"/>`,
    );
    if (haupt) {
      teile.push(
        `<text x="${x}" y="86" font-family="sans-serif" font-size="40" font-weight="600" fill="rgba(30,41,59,0.75)" text-anchor="middle">${richtungen[grad]}</text>`,
      );
    }
  }
  return teile.join('');
}
