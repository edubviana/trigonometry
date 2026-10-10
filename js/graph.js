// Controlador da aba "Gráficos das Funções": estado, animação e HUD.
import {
  FUNCTIONS,
  formatNumber,
  formatPiFraction,
  toDegrees,
  toRadians,
} from "./math.js";
import { GraphRenderer } from "./graphRenderer.js";

const $ = (id) => document.getElementById(id);

const canvas = $("g-canvas");
const slider = $("g-slider");
const playBtn = $("g-play");
const renderer = new GraphRenderer(canvas);

const X_MIN = -2 * Math.PI;
const X_MAX = 2 * Math.PI;
const BASE_SPEED = Math.PI / 2; // rad/s: ~1 volta a cada 4 s

const state = {
  fnId: "sen",
  x: Math.PI / 4,
  playing: false,
  speed: 1,
  lastTime: 0,
  dragging: false,
};

const PRESET_ANGLES = [30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330, 360];
const chips = new Map();

let fromSlider = false;
let frame = 0;

// --- HUD ----------------------------------------------------------------

function updateProperties() {
  const fn = FUNCTIONS[state.fnId];
  $("g-period").textContent = fn.period;
  $("g-range").textContent = fn.range;
  $("g-parity").textContent = fn.parity;
  $("g-parity-eq").textContent = fn.parityEq;
  $("g-y-label").textContent = `f(x) = ${fn.label}`;
  for (const btn of $("g-fns").children) {
    const active = btn.dataset.fn === state.fnId;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", String(active));
  }
}

function updateHud() {
  const fn = FUNCTIONS[state.fnId];
  const deg = toDegrees(state.x);
  $("g-x").textContent = `${formatNumber(state.x)} rad`;
  $("g-deg").textContent = `${deg.toFixed(1).replace("-", "−")}°`;
  $("g-pi").textContent = formatPiFraction(state.x);

  const undefinedTan = fn.isTan && Math.abs(Math.cos(state.x)) < 0.01;
  $("g-y").textContent = undefinedTan ? "Indefinida / ±∞" : formatNumber(fn.f(state.x));
  $("g-y").style.color = fn.color;

  if (!fromSlider) slider.value = deg.toFixed(1);

  for (const [angle, chip] of chips) {
    chip.classList.toggle("active", Math.abs(deg - angle) < 0.05);
  }
}

// --- Render / animação ----------------------------------------------------

function render() {
  frame = 0;
  renderer.draw({ fn: FUNCTIONS[state.fnId], x: state.x });
  updateHud();
  fromSlider = false;
}

function requestRender() {
  if (!frame) frame = requestAnimationFrame(render);
}

function tick(time) {
  if (!state.playing) return;
  const dt = Math.min(0.1, (time - state.lastTime) / 1000);
  state.lastTime = time;
  state.x += BASE_SPEED * state.speed * dt;
  if (state.x > X_MAX) state.x = X_MIN;
  render();
  requestAnimationFrame(tick);
}

function setPlaying(playing) {
  if (state.playing === playing) return;
  state.playing = playing;
  playBtn.textContent = playing ? "Pausar" : "Animar";
  if (playing) {
    state.lastTime = performance.now();
    requestAnimationFrame(tick);
  }
}

function setX(x) {
  state.x = Math.min(X_MAX, Math.max(X_MIN, x));
  requestRender();
}

// --- Eventos --------------------------------------------------------------

$("g-fns").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-fn]");
  if (!btn) return;
  state.fnId = btn.dataset.fn;
  updateProperties();
  requestRender();
});

slider.addEventListener("input", () => {
  fromSlider = true;
  setX(toRadians(parseFloat(slider.value)));
});

for (const angle of PRESET_ANGLES) {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "chip";
  chip.textContent = `${angle}°`;
  chip.addEventListener("click", () => {
    setPlaying(false);
    setX(toRadians(angle));
  });
  chips.set(angle, chip);
  $("g-presets").append(chip);
}

playBtn.addEventListener("click", () => setPlaying(!state.playing));
$("g-speed").addEventListener("change", (e) => {
  state.speed = parseFloat(e.target.value);
});

function xFromEvent(e) {
  return renderer.pxToX(e.clientX - canvas.getBoundingClientRect().left);
}

canvas.addEventListener("pointerdown", (e) => {
  state.dragging = true;
  canvas.setPointerCapture(e.pointerId);
  canvas.classList.add("dragging");
  setX(xFromEvent(e));
});
canvas.addEventListener("pointermove", (e) => {
  if (state.dragging) setX(xFromEvent(e));
});
const endDrag = (e) => {
  state.dragging = false;
  canvas.classList.remove("dragging");
  if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
};
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);

// Pausa ao sair da aba
document.addEventListener("viewchange", (e) => {
  if (e.detail !== "view-graph") setPlaying(false);
});

new ResizeObserver(() => {
  renderer.resize();
  requestRender();
}).observe($("g-stage"));

updateProperties();
renderer.resize();
requestRender();
