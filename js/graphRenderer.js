// Desenho do gráfico de sen(x), cos(x) e tan(x) no Canvas.
import { COLORS } from "./renderer.js";
import { formatPiFraction } from "./math.js";

const PI = Math.PI;
const X_MIN = -2 * PI;
const X_MAX = 2 * PI;
const PAD = { left: 44, right: 20, top: 48, bottom: 36 };
const BREAK_EPS = 0.01;

export class GraphRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.width = 0;
    this.height = 0;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // --- Conversões domínio <-> pixels ---------------------------------

  get plot() {
    return {
      left: PAD.left,
      right: this.width - PAD.right,
      top: PAD.top,
      bottom: this.height - PAD.bottom,
    };
  }

  xToPx(x) {
    const { left, right } = this.plot;
    return left + ((x - X_MIN) / (X_MAX - X_MIN)) * (right - left);
  }

  pxToX(px) {
    const { left, right } = this.plot;
    const x = X_MIN + ((px - left) / (right - left)) * (X_MAX - X_MIN);
    return Math.min(X_MAX, Math.max(X_MIN, x));
  }

  yToPx(y, yMax) {
    const { top, bottom } = this.plot;
    return (top + bottom) / 2 - (y / yMax) * ((bottom - top) / 2);
  }

  // --- Desenho -------------------------------------------------------

  draw({ fn, x }) {
    const { ctx, width: w, height: h } = this;
    const { left, right, top, bottom } = this.plot;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, w, h);
    if (right - left < 50 || bottom - top < 50) return;

    this.#title(fn, w);
    this.#grid(fn);

    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, right - left, bottom - top);
    ctx.clip();

    if (fn.isTan) this.#asymptotes(fn);

    // Curva completa de fundo (tracejada/transparente)
    ctx.strokeStyle = fn.color;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    this.#curve(fn, X_MIN, X_MAX);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Trecho percorrido até x (contínuo e brilhante)
    ctx.strokeStyle = fn.color;
    ctx.lineWidth = 3.5;
    ctx.lineJoin = "round";
    ctx.shadowColor = fn.color;
    ctx.shadowBlur = 10;
    this.#curve(fn, X_MIN, x);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();

    this.#marker(fn, x);
  }

  #title(fn, w) {
    const { ctx } = this;
    ctx.fillStyle = COLORS.text;
    ctx.font = `700 ${Math.max(13, Math.min(22, w * 0.035))}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(`Gráfico de f(x) = ${fn.label}`, w / 2, 14, w - 24);
  }

  #grid(fn) {
    const { ctx } = this;
    const { left, right, top, bottom } = this.plot;
    const x0 = this.xToPx(0);
    const y0 = this.yToPx(0, fn.yMax);
    const wide = right - left > 520;
    const stepPi = wide ? 0.5 : 1;

    ctx.font = "12px system-ui, sans-serif";

    // Verticais + rótulos do eixo X (múltiplos de π ou π/2)
    for (let m = -2 / stepPi; m <= 2 / stepPi; m++) {
      const x = m * stepPi * PI;
      const px = this.xToPx(x);
      ctx.strokeStyle = COLORS.grid;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, top);
      ctx.lineTo(px, bottom);
      ctx.stroke();
      ctx.globalAlpha = 1;

      if (m === 0) continue;
      ctx.fillStyle = COLORS.muted;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(formatPiFraction(x), px, y0 + 6 > bottom - 14 ? bottom + 6 : y0 + 6);
    }

    // Horizontais + rótulos do eixo Y
    const yTicks = Math.floor(fn.yMax);
    for (let v = -yTicks; v <= yTicks; v++) {
      const py = this.yToPx(v, fn.yMax);
      ctx.strokeStyle = COLORS.grid;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(left, py);
      ctx.lineTo(right, py);
      ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.fillStyle = COLORS.muted;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(String(v).replace("-", "−"), x0 - 6, py);
    }

    // Eixos principais
    ctx.strokeStyle = COLORS.axis;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(left, y0);
    ctx.lineTo(right, y0);
    ctx.moveTo(x0, top);
    ctx.lineTo(x0, bottom);
    ctx.stroke();

    ctx.fillStyle = COLORS.text;
    ctx.font = "italic 600 13px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText("x", right - 12, y0 - 6);
    ctx.fillText("y", x0 + 8, top + 14);
  }

  #asymptotes(fn) {
    const { ctx } = this;
    const { top, bottom } = this.plot;
    ctx.strokeStyle = "#ef4444";
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 6]);
    for (let k = -2; k <= 1; k++) {
      const px = this.xToPx(PI / 2 + k * PI);
      ctx.beginPath();
      ctx.moveTo(px, top);
      ctx.lineTo(px, bottom);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  /** Monta o caminho de xFrom a xTo, sem ligar pontos através de assíntotas. */
  #curve(fn, xFrom, xTo) {
    const { ctx } = this;
    ctx.beginPath();
    if (xTo <= xFrom) return;

    const { top, bottom } = this.plot;
    const span = bottom - top;
    const a = this.xToPx(xFrom);
    const b = this.xToPx(xTo);
    let penDown = false;
    let prevCell = null;

    for (let px = a; px < b + 1; px += 1) {
      const x = Math.min(this.pxToX(px), xTo);
      const y = fn.f(x);
      const cell = fn.isTan ? Math.floor((x - PI / 2) / PI) : 0;
      const nearAsymptote = fn.isTan && Math.abs(Math.cos(x)) < BREAK_EPS;

      if (cell !== prevCell || nearAsymptote || !Number.isFinite(y)) penDown = false;
      prevCell = cell;
      if (nearAsymptote) continue;

      const py = Math.max(top - span, Math.min(bottom + span, this.yToPx(y, fn.yMax)));
      const pxx = this.xToPx(x);
      if (penDown) ctx.lineTo(pxx, py);
      else ctx.moveTo(pxx, py);
      penDown = true;
    }
  }

  #marker(fn, x) {
    const { ctx } = this;
    const { top, bottom } = this.plot;
    const px = this.xToPx(x);
    const y0 = this.yToPx(0, fn.yMax);
    const x0 = this.xToPx(0);
    const y = fn.f(x);
    const undefinedTan = fn.isTan && Math.abs(Math.cos(x)) < BREAK_EPS;
    const outside = !Number.isFinite(y) || Math.abs(y) > fn.yMax;

    // Guia vertical até o eixo X sempre visível
    ctx.strokeStyle = fn.color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 5]);

    if (undefinedTan || outside) {
      ctx.beginPath();
      ctx.moveTo(px, top);
      ctx.lineTo(px, bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      return;
    }

    const py = this.yToPx(y, fn.yMax);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px, y0);
    ctx.moveTo(px, py);
    ctx.lineTo(x0, py);
    ctx.stroke();
    ctx.setLineDash([]);

    // Projeções nos eixos
    ctx.fillStyle = fn.color;
    for (const [cx, cy] of [[px, y0], [x0, py]]) {
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ponto (x, f(x))
    ctx.fillStyle = fn.color;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}
