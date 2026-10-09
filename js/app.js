// Estado global, eventos de mouse/toque e sincronização do HUD.
import {
  TWO_PI,
  angleFromPoint,
  formatNumber,
  formatPiFraction,
  quadrant,
  signSymbol,
  toDegrees,
  toRadians,
  trig,
} from "./math.js";
import { Renderer } from "./renderer.js";

const $ = (id) => document.getElementById(id);

const canvas = $("canvas");
const slider = $("slider");
const renderer = new Renderer(canvas);

const state = { theta: toRadians(45), dragging: false };

const PRESETS = [0, 30, 45, 60, 90, 120, 180, 270, 360];

// --- HUD --------------------------------------------------------------

let fromSlider = false;

function updateHud(values) {
  const deg = toDegrees(state.theta);
  $("angle-deg").textContent = `${deg.toFixed(1)}°`;
  $("angle-rad").textContent = `${state.theta.toFixed(4)} rad`;
  $("angle-pi").textContent = formatPiFraction(state.theta);

  const q = quadrant(state.theta);
  $("quadrant").textContent = `${q}º quadrante`;
  $("sign-cos").textContent = signSymbol(values.cos);
  $("sign-sin").textContent = signSymbol(values.sin);
  $("sign-tan").textContent = values.tanUndefined ? "∞" : signSymbol(values.tan);

  $("v-cos").textContent = formatNumber(values.cos);
  $("v-sin").textContent = formatNumber(values.sin);
  $("v-tan").textContent = values.tanUndefined
    ? "Indefinida / ±∞"
    : formatNumber(values.tan);
  $("tan-warn").hidden = !values.tanUndefined;

  const sum = values.sin ** 2 + values.cos ** 2;
  $("identity").textContent =
    `sen²(θ) + cos²(θ) = ${formatNumber(values.sin ** 2, 3)} + ` +
    `${formatNumber(values.cos ** 2, 3)} = ${sum.toFixed(3)}`;

  if (!fromSlider) slider.value = deg.toFixed(1);
}

// --- Render loop ------------------------------------------------------

let frame = 0;
function render() {
  frame = 0;
  const values = trig(state.theta);
  renderer.draw({ theta: state.theta, values });
  updateHud(values);
  fromSlider = false;
}

function requestRender() {
  if (!frame) frame = requestAnimationFrame(render);
}

function setTheta(theta) {
  state.theta = theta;
  requestRender();
}

// --- Interação --------------------------------------------------------

function angleFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const { x0, y0 } = renderer.geometry;
  return angleFromPoint(e.clientX - rect.left, e.clientY - rect.top, x0, y0);
}

canvas.addEventListener("pointerdown", (e) => {
  state.dragging = true;
  canvas.setPointerCapture(e.pointerId);
  canvas.classList.add("dragging");
  setTheta(angleFromEvent(e));
});

canvas.addEventListener("pointermove", (e) => {
  if (state.dragging) setTheta(angleFromEvent(e));
});

const endDrag = (e) => {
  state.dragging = false;
  canvas.classList.remove("dragging");
  if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
};
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);

slider.addEventListener("input", () => {
  fromSlider = true;
  setTheta(Math.min(TWO_PI, toRadians(parseFloat(slider.value))));
});

for (const deg of PRESETS) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = `${deg}°`;
  btn.addEventListener("click", () => setTheta(toRadians(deg)));
  $("presets").append(btn);
}

new ResizeObserver(() => {
  renderer.resize();
  requestRender();
}).observe($("stage"));

renderer.resize();
requestRender();
