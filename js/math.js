// Cálculos puros: ângulos, conversões, quadrantes e funções trigonométricas.
// Nenhuma dependência de DOM/Canvas.

export const TWO_PI = 2 * Math.PI;
export const ASYMPTOTE_EPS = 0.01;

const PI_DENOMINATORS = [1, 2, 3, 4, 6, 8, 12];
const ZERO_EPS = 1e-9;

export const toRadians = (deg) => (deg * Math.PI) / 180;
export const toDegrees = (rad) => (rad * 180) / Math.PI;

/** Normaliza para [0, 2π[. */
export function normalizeAngle(theta) {
  let t = theta % TWO_PI;
  if (t < 0) t += TWO_PI;
  return t;
}

/** Ângulo (anti-horário, eixo Y matemático) a partir de um ponto do mouse. */
export function angleFromPoint(xm, ym, x0, y0) {
  return normalizeAngle(Math.atan2(-(ym - y0), xm - x0));
}

export function pointOnCircle(x0, y0, R, theta) {
  return { x: x0 + R * Math.cos(theta), y: y0 - R * Math.sin(theta) };
}

/** Seno, cosseno e tangente (= sen/cos) com detecção de assíntota. */
export function trig(theta) {
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const tanUndefined = Math.abs(cos) < ASYMPTOTE_EPS;
  return { cos, sin, tan: tanUndefined ? NaN : sin / cos, tanUndefined };
}

/** 1..4, com intervalos [0,90°[, [90°,180°[, [180°,270°[, [270°,360°[. */
export function quadrant(theta) {
  return Math.min(4, Math.floor(normalizeAngle(theta) / (Math.PI / 2)) + 1);
}

/** "+", "−" ou "0". */
export function signSymbol(value) {
  if (Math.abs(value) < ZERO_EPS) return "0";
  return value > 0 ? "+" : "−";
}

const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));

/** Representa θ como fração de π (ex.: "5π/6"), com "≈" quando aproximado. */
export function formatPiFraction(theta) {
  const ratio = theta / Math.PI;
  let best = { n: 0, d: 1, err: Infinity };
  for (const d of PI_DENOMINATORS) {
    const n = Math.round(ratio * d);
    const err = Math.abs(ratio - n / d);
    if (err < best.err - 1e-12) best = { n, d, err };
  }

  if (best.err > 0.002) return `≈ ${ratio.toFixed(3)}π`;

  const prefix = best.err > 1e-6 ? "≈ " : "";
  if (best.n === 0) return "0";
  const g = gcd(Math.abs(best.n), best.d);
  const n = best.n / g;
  const d = best.d / g;
  const num = n === 1 ? "π" : `${n}π`;
  return prefix + (d === 1 ? num : `${num}/${d}`);
}

/** Formata número com 4 casas, sem "-0.0000". */
export function formatNumber(value, digits = 4) {
  if (!Number.isFinite(value)) return "—";
  const s = value.toFixed(digits);
  return Number(s) === 0 ? (0).toFixed(digits) : s.replace("-", "−");
}
