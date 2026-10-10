// Controlador da aba "Triângulo Retângulo": estado, interação e HUD.
import {
  clampTriangleAngle,
  formatNumber,
  formatPiFraction,
  toDegrees,
  toRadians,
  triangleSides,
} from "./math.js";
import { HIT_RADIUS, MIN_H, TriangleRenderer } from "./triangleRenderer.js";

const $ = (id) => document.getElementById(id);

const canvas = $("t-canvas");
const slider = $("t-slider");
const renderer = new TriangleRenderer(canvas);

const UNIT = 50; // px por unidade exibida no HUD
const PRESET_ANGLES = [0, 30, 45, 60, 90];

const state = { theta: toRadians(45), H: 280, dragging: false, hover: false };
const sideSliders = { h: $("t-h-slider"), ca: $("t-ca-slider"), co: $("t-co-slider") };
const SIDE_CHIP_MAX = 10;
const sideChips = new Map(); // key -> Map<inteiro, botão>
let editingSide = null; // slider de medida em uso (não é sobrescrito pelo HUD)
const chips = new Map();

let frame = 0;
let fromSlider = false;

// --- HUD ----------------------------------------------------------------

function updateHud(H) {
  const deg = toDegrees(state.theta);
  const s = triangleSides(H / UNIT, state.theta);
  const f = (v) => formatNumber(v, 3);

  $("t-deg").textContent = `${deg.toFixed(1)}°`;
  $("t-rad").textContent = `${state.theta.toFixed(4)} rad`;
  $("t-pi").textContent = formatPiFraction(state.theta);

  $("t-h").textContent = f(s.hypotenuse);
  $("t-ca").textContent = f(s.adjacent);
  $("t-co").textContent = f(s.opposite);

  $("t-sin-n").textContent = f(s.opposite);
  $("t-sin-d").textContent = f(s.hypotenuse);
  $("t-cos-n").textContent = f(s.adjacent);
  $("t-cos-d").textContent = f(s.hypotenuse);
  $("t-tan-n").textContent = f(s.opposite);
  $("t-tan-d").textContent = f(s.adjacent);
  $("t-sin").textContent = formatNumber(s.sin);
  $("t-cos").textContent = formatNumber(s.cos);
  $("t-tan").textContent = Number.isNaN(s.tan) ? "Indefinida" : formatNumber(s.tan);

  const sum = s.sin ** 2 + s.cos ** 2;
  $("t-identity").textContent =
    `sen²(θ) + cos²(θ) = ${formatNumber(s.sin ** 2, 3)} + ${formatNumber(s.cos ** 2, 3)} = ${sum.toFixed(3)}`;

  if (!fromSlider) slider.value = deg.toFixed(1);
  const { adj, opp } = renderer.limits;
  const values = { h: s.hypotenuse, ca: s.adjacent, co: s.opposite };
  const maxes = { h: Math.hypot(adj, opp), ca: adj, co: opp };
  for (const key of Object.keys(sideSliders)) {
    sideSliders[key].max = (maxes[key] / UNIT).toFixed(2);
    if (editingSide !== key) sideSliders[key].value = values[key].toFixed(2);
    for (const [n, chip] of sideChips.get(key)) {
      chip.classList.toggle("active", Math.abs(values[key] - n) < 0.005);
    }
  }
  for (const [angle, chip] of chips) {
    chip.classList.toggle("active", Math.abs(deg - angle) < 0.05);
  }
}

// --- Render -------------------------------------------------------------

function render() {
  frame = 0;
  if (renderer.width < 2) return;
  const H = currentH();
  const s = triangleSides(H / UNIT, state.theta);
  const f = (v) => formatNumber(v, 2);
  renderer.draw({
    theta: state.theta,
    H,
    hover: state.hover,
    dragging: state.dragging,
    labels: {
      hyp: `H = ${f(s.hypotenuse)}`,
      adj: `Cₐ = ${f(s.adjacent)}`,
      opp: `Cₒ = ${f(s.opposite)}`,
    },
  });
  updateHud(H);
  fromSlider = false;
}

function requestRender() {
  if (!frame) frame = requestAnimationFrame(render);
}

function setTheta(theta) {
  state.theta = clampTriangleAngle(theta);
  requestRender();
}

// --- Interação ----------------------------------------------------------

/** Atualiza θ e H a partir da posição do mouse (atan2 com eixo Y invertido). */
function dragTo(e) {
  const rect = canvas.getBoundingClientRect();
  const xm = e.clientX - rect.left;
  const ym = e.clientY - rect.top;
  const { x: x0, y: y0 } = renderer.origin;
  state.theta = clampTriangleAngle(Math.atan2(-(ym - y0), xm - x0));
  const H = Math.hypot(xm - x0, ym - y0);
  state.H = Math.min(renderer.maxH(state.theta), Math.max(MIN_H, H));
  requestRender();
}

function isOverHandle(e) {
  const rect = canvas.getBoundingClientRect();
  const { B } = renderer.vertices(state.theta, currentH());
  return Math.hypot(e.clientX - rect.left - B.x, e.clientY - rect.top - B.y) <= HIT_RADIUS;
}

canvas.addEventListener("pointerdown", (e) => {
  state.dragging = true;
  canvas.setPointerCapture(e.pointerId);
  canvas.classList.add("dragging");
  dragTo(e);
});
canvas.addEventListener("pointermove", (e) => {
  if (state.dragging) return dragTo(e);
  const hover = isOverHandle(e);
  if (hover !== state.hover) {
    state.hover = hover;
    requestRender();
  }
});
const endDrag = (e) => {
  state.dragging = false;
  canvas.classList.remove("dragging");
  if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  requestRender();
};
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);
canvas.addEventListener("pointerleave", () => {
  if (state.hover && !state.dragging) {
    state.hover = false;
    requestRender();
  }
});

/** Botões com os valores inteiros 1..10 abaixo do slider de cada lado. */
function buildSideChips(key) {
  const box = $(`t-${key}-chips`);
  const map = new Map();
  for (let n = 1; n <= SIDE_CHIP_MAX; n++) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = String(n);
    chip.addEventListener("click", () => setSide(key, n));
    map.set(n, chip);
    box.appendChild(chip);
  }
  sideChips.set(key, map);
}

/** Hipotenusa efetiva (px), já limitada à área visível. */
function currentH() {
  return Math.min(renderer.maxH(state.theta), Math.max(MIN_H, state.H));
}

// H preserva θ; cada cateto preserva o outro e recalcula θ e H.
function setSide(key, units) {
  const px = Math.max(0, units * UNIT);
  const { adj, opp } = renderer.limits;
  const H = currentH();
  let a = H * Math.cos(state.theta);
  let o = H * Math.sin(state.theta);

  if (key === "h") {
    state.H = Math.min(px, renderer.maxH(state.theta));
  } else {
    if (key === "ca") a = Math.min(px, adj);
    else o = Math.min(px, opp);
    if (a > 0 || o > 0) state.theta = clampTriangleAngle(Math.atan2(o, a));
    state.H = Math.hypot(a, o);
  }
  requestRender();
}

for (const [key, input] of Object.entries(sideSliders)) {
  buildSideChips(key);
  input.addEventListener("input", () => {
    editingSide = key;
    setSide(key, parseFloat(input.value));
  });
  input.addEventListener("change", () => {
    editingSide = null;
    requestRender();
  });
}

slider.addEventListener("input", () => {
  fromSlider = true;
  setTheta(toRadians(parseFloat(slider.value)));
});

for (const angle of PRESET_ANGLES) {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "chip";
  chip.textContent = `${angle}°`;
  chip.addEventListener("click", () => setTheta(toRadians(angle)));
  chips.set(angle, chip);
  $("t-presets").appendChild(chip);
}

new ResizeObserver(() => {
  renderer.resize();
  requestRender();
}).observe($("t-stage"));

// A aba começa oculta (tamanho 0): redimensiona quando for exibida.
document.addEventListener("viewchange", (e) => {
  if (e.detail !== "view-triangle") return;
  renderer.resize();
  requestRender();
});

renderer.resize();
requestRender();
