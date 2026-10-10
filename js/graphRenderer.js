// Desenho do gráfico de sen(x), cos(x) e tan(x) no Canvas.
import { COLORS } from "./renderer.js";
import { formatPiFraction, normalizeAngle, pointOnCircle } from "./math.js";

const PI = Math.PI;
const X_MIN = -2 * PI;
const X_MAX = 2 * PI;
const PAD = { left: 12, right: 20, top: 48, bottom: 36 };
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

  /** Largura da coluna do mini círculo (à esquerda do gráfico). */
  get sideW() {
    const half = (this.height - PAD.top - PAD.bottom) / 2;
    // Cap folgado: o círculo precisa caber na escala vertical (R = half / yMax)
    // para que a projeção coincida exatamente com a curva.
    return Math.max(0, Math.min(this.width * 0.5, (2 * half) / 1.5 + 24));
  }

  get plot() {
    return {
      left: PAD.left + this.sideW + 12,
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
    const mini = this.#miniCircle(fn, x);

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

    this.#marker(fn, x, mini);
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

  /**
   * Mini círculo na coluna esquerda, na mesma escala vertical do gráfico
   * (quando cabe), com θ = x mod 2π. Retorna o ponto do círculo de onde sai
   * a guia projetora (ou null se não há valor visível).
   */
  #miniCircle(fn, x) {
    const { ctx } = this;
    const half = (this.plot.bottom - this.plot.top) / 2;
    const R = Math.min(half / fn.yMax, (this.sideW - 24) / 2);
    if (R < 12) return null;

    const cx = PAD.left + this.sideW / 2;
    const cy = this.yToPx(0, fn.yMax);
    const theta = normalizeAngle(x);
    const P = pointOnCircle(cx, cy, R, theta);
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    const t = Math.tan(theta);
    // Tangente fora da altura visível: o segmento é cortado em ±yMax em vez de sumir
    const tanOk = fn.isTan && Math.abs(c) >= BREAK_EPS;
    const tc = Math.max(-fn.yMax, Math.min(fn.yMax, t));
    const tx = Math.abs(t) > fn.yMax ? cx + (R * tc) / t : cx + R;
    let marker = null;

    // Eixos e circunferência
    ctx.strokeStyle = COLORS.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - R - 8, cy);
    ctx.lineTo(cx + R + 8, cy);
    ctx.moveTo(cx, cy - R - 8);
    ctx.lineTo(cx, cy + R + 8);
    ctx.stroke();
    ctx.strokeStyle = COLORS.muted;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();

    if (fn.isTan) {
      ctx.strokeStyle = "rgba(251, 191, 36, 0.35)";
      ctx.beginPath();
      ctx.moveTo(cx + R, cy - R * fn.yMax);
      ctx.lineTo(cx + R, cy + R * fn.yMax);
      ctx.stroke();
    }

    // Projeção da função selecionada (e guia pontilhada do ponto P)
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = fn.color;
    ctx.beginPath();
    if (fn.id === "sen") {
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, P.y);
      marker = { x: P.x, y: P.y };
    } else if (fn.id === "cos") {
      ctx.moveTo(cx, cy);
      ctx.lineTo(P.x, cy);
      marker = { x: cx, y: cy - c * R };
    } else if (tanOk) {
      ctx.moveTo(cx + R, cy);
      ctx.lineTo(cx + R, cy - tc * R);
      marker = { x: cx + R, y: cy - tc * R };
    }
    ctx.stroke();
    ctx.lineCap = "butt";

    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 4]);
    if (fn.id === "cos") {
      // Compasso: transfere o cosseno do eixo X para o eixo Y
      ctx.beginPath();
      ctx.moveTo(P.x, P.y);
      ctx.lineTo(P.x, cy);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, Math.abs(c) * R, c >= 0 ? 0 : Math.PI, c >= 0 ? -Math.PI / 2 : Math.PI / 2, true);
      ctx.stroke();
    } else if (fn.id === "sen") {
      ctx.beginPath();
      ctx.moveTo(P.x, P.y);
      ctx.lineTo(P.x, cy);
      ctx.stroke();
    } else if (tanOk) {
      ctx.strokeStyle = "rgba(168, 85, 247, 0.6)";
      ctx.beginPath();
      ctx.moveTo(P.x, P.y);
      ctx.lineTo(tx, cy - tc * R);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Raio e ponto P
    ctx.strokeStyle = COLORS.radius;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(P.x, P.y);
    ctx.stroke();
    ctx.fillStyle = COLORS.radius;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(P.x, P.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COLORS.muted;
    ctx.font = "600 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(`θ = ${formatPiFraction(theta)}`, cx, this.plot.bottom + 8);
    return marker;
  }

  #marker(fn, x, mini) {
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

    // Guia projetora: do mini círculo até o ponto (x, f(x))
    if (mini) {
      ctx.strokeStyle = fn.color;
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([2, 5]);
      ctx.beginPath();
      ctx.moveTo(mini.x, mini.y);
      ctx.lineTo(this.plot.left, mini.y);
      ctx.lineTo(px, py);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

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
