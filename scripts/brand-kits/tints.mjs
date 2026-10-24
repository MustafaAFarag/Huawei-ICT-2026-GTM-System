// Tint scale 50–900 around a base colour (500), interpolated in OKLab so steps look even.

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function hexToOklab(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => toLinear(parseInt(hex.slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToHex([L, A, B]) {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return `#${rgb
    .map((c) => Math.round(Math.min(1, Math.max(0, toSrgb(c))) * 255).toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
}

const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const WHITE = hexToOklab("#FFFFFF");
const BLACK = hexToOklab("#000000");

// Share of white (lighter steps) or black (darker steps) mixed into the base.
const STEPS = { 50: 0.92, 100: 0.82, 200: 0.64, 300: 0.46, 400: 0.24, 500: 0, 600: 0.16, 700: 0.32, 800: 0.48, 900: 0.62 };

export function tints(hex) {
  const base = hexToOklab(hex);
  return Object.fromEntries(
    Object.entries(STEPS).map(([step, t]) => [
      step,
      Number(step) === 500 ? hex.toUpperCase() : oklabToHex(mix(base, Number(step) < 500 ? WHITE : BLACK, t)),
    ]),
  );
}
