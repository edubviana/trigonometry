// Desenho no Canvas: eixos, círculo, projeções e suporte a HiDPI.
import { pointOnCircle } from "./math.js";

export const COLORS = {
  cos: "#38bdf8",
  sin: "#f87171",
  tan: "#fbbf24",
  radius: "#a855f7",
  axis: "#475569",
  grid: "#334155",
  text: "#e2e8f0",
  muted: "#94a3b8",
  bg: "#0f172a",
};

const TITLE = "Círculo Trigonométrico: Seno, Cosseno e Tangente";
const RADIUS_FACTOR = 0.35;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.width = 0;
    this.height = 0;
    this.geometry = { x0: 0, y0: 0, R: 0 };
  }

  /** Ajusta o buffer para o tamanho CSS atual e o devicePixelRatio. */
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.geometry = {
      x0: this.width / 2,
      y0: this.height / 2,
      R: Math.min(this.width, this.height) * RADIUS_FACTOR,
    };
  }

  /** Posição do ponto P para hit-testing. */
  pointP(theta) {
    const { x0, y0, R } = this.geometry;
    return pointOnCircle(x0, y0, R, theta);
  }

  draw({ theta, values }) {
    const { ctx, width: w, height: h } = this;
    const { x0, y0, R } = this.geometry;
    const P = pointOnCircle(x0, y0, R, theta);
    const margin = 10;
    const yTop = Math.min(48, h * 0.12);
    const yBottom = h - margin;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, w, h);

    this.#title(w);
    this.#quadrantLabels(x0, y0, R);
    this.#axes(x0, y0, R, w, yTop, yBottom, margin);
    this.#tangentAxis(x0, y0, R, yTop, yBottom);

    // Círculo unitário
    ctx.strokeStyle = COLORS.muted;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x0, y0, R, 0, Math.PI * 2);
    ctx.stroke();

    this.#projections(x0, y0, P, theta);
    this.#tangent(x0, y0, R, P, values, yTop, yBottom);
    this.#angleArc(x0, y0, R, theta);

    // Raio
    ctx.strokeStyle = COLORS.radius;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(P.x, P.y);
    ctx.stroke();

    // Ponto P
    ctx.fillStyle = COLORS.radius;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(P.x, P.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (values.tanUndefined) {
      ctx.font = "600 13px system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = COLORS.tan;
      ctx.fillText("tan(θ) indefinida / ±∞", w - 12, h - 14);
    }
  }

  #title(w) {
    const { ctx } = this;
    ctx.fillStyle = COLORS.text;
    ctx.font = `700 ${Math.max(13, Math.min(22, w * 0.035))}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(TITLE, w / 2, 14, w - 24);
  }

  #quadrantLabels(x0, y0, R) {
    const { ctx } = this;
    const d = R * 0.55;
    ctx.fillStyle = "rgba(148, 163, 184, 0.25)";
    ctx.font = `700 ${Math.max(14, R * 0.18)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("I", x0 + d, y0 - d);
    ctx.fillText("II", x0 - d, y0 - d);
    ctx.fillText("III", x0 - d, y0 + d);
    ctx.fillText("IV", x0 + d, y0 + d);
  }

  #axes(x0, y0, R, w, yTop, yBottom, margin) {
    const { ctx } = this;
    ctx.strokeStyle = COLORS.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin, y0);
    ctx.lineTo(w - margin, y0);
    ctx.moveTo(x0, yTop);
    ctx.lineTo(x0, yBottom);
    ctx.stroke();

    // Marcas em ±1
    const t = 5;
    ctx.beginPath();
    for (const s of [-1, 1]) {
      ctx.moveTo(x0 + s * R, y0 - t);
      ctx.lineTo(x0 + s * R, y0 + t);
      ctx.moveTo(x0 - t, y0 + s * R);
      ctx.lineTo(x0 + t, y0 + s * R);
    }
    ctx.stroke();

    ctx.fillStyle = COLORS.muted;
    ctx.font = "12px system-ui, sans-serif";
    ctx.textBaseline = "alphabetic";

    // Valores ±1
    ctx.textAlign = "right";
    ctx.fillText("1", x0 + R - 5, y0 + 16);
    ctx.textAlign = "left";
    ctx.fillText("−1", x0 - R + 5, y0 + 16);
    ctx.fillText("1", x0 + 9, y0 - R + 14);
    ctx.fillText("−1", x0 + 9, y0 + R - 6);

    // Ângulos notáveis
    ctx.fillStyle = COLORS.text;
    ctx.font = "600 12px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("0° / 360°", x0 + R + 8, y0 + 18);
    ctx.textAlign = "center";
    ctx.fillText("90°", x0, y0 - R - 10);
    ctx.fillText("270°", x0, y0 + R + 20);
    ctx.textAlign = "right";
    ctx.fillText("180°", x0 - R - 8, y0 + 18);
  }

  #tangentAxis(x0, y0, R, yTop, yBottom) {
    const { ctx } = this;
    const xt = x0 + R;
    ctx.strokeStyle = "rgba(251, 191, 36, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(xt, yTop);
    ctx.lineTo(xt, yBottom);
    ctx.stroke();

    ctx.fillStyle = "rgba(251, 191, 36, 0.7)";
    ctx.font = "italic 12px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("eixo tan (x = 1)", xt + 8, yTop + 12);
  }

  #projections(x0, y0, P, theta) {
    const { ctx } = this;
    const hasCos = Math.abs(P.x - x0) > 0.5;
    const hasSin = Math.abs(P.y - y0) > 0.5;

    // Segmentos sobre os eixos
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.strokeStyle = COLORS.cos;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(P.x, y0);
    ctx.stroke();
    ctx.strokeStyle = COLORS.sin;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0, P.y);
    ctx.stroke();

    // Linhas-guia pontilhadas de P até os eixos
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 5]);
    ctx.lineCap = "butt";
    ctx.strokeStyle = COLORS.cos;
    ctx.beginPath();
    ctx.moveTo(P.x, P.y);
    ctx.lineTo(P.x, y0);
    ctx.stroke();
    ctx.strokeStyle = COLORS.sin;
    ctx.beginPath();
    ctx.moveTo(P.x, P.y);
    ctx.lineTo(x0, P.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Rótulos nos segmentos
    ctx.font = "700 13px system-ui, sans-serif";
    ctx.textBaseline = "middle";
    if (hasCos && Math.abs(P.x - x0) > 28) {
      ctx.fillStyle = COLORS.cos;
      ctx.textAlign = "center";
      ctx.fillText("cos θ", (x0 + P.x) / 2, y0 + (P.y < y0 ? 14 : -14));
    }
    if (hasSin && Math.abs(P.y - y0) > 28) {
      ctx.fillStyle = COLORS.sin;
      ctx.textAlign = P.x >= x0 ? "right" : "left";
      ctx.fillText("sen θ", x0 + (P.x >= x0 ? -8 : 8), (y0 + P.y) / 2);
    }
  }

  #tangent(x0, y0, R, P, values, yTop, yBottom) {
    if (values.tanUndefined) return;
    const { ctx } = this;
    const xt = x0 + R;
    const yT = y0 - R * values.tan;
    const visible = yT >= yTop && yT <= yBottom;
    const yEnd = Math.min(yBottom, Math.max(yTop, yT));

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, yTop, this.width, yBottom - yTop);
    ctx.clip();

    // Reta suporte do raio até a tangente
    ctx.strokeStyle = "rgba(168, 85, 247, 0.55)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(P.x, P.y);
    ctx.lineTo(xt, yT);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Segmento da tangente em x = 1
    ctx.strokeStyle = COLORS.tan;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(xt, y0);
    ctx.lineTo(xt, yEnd);
    ctx.stroke();

    if (visible) {
      ctx.fillStyle = COLORS.tan;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(xt, yT, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (Math.abs(yT - y0) > 28) {
        ctx.font = "700 13px system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText("tan θ", xt + 12, (y0 + yT) / 2);
      }
    } else {
      // Fora da tela: seta indicando o infinito
      const dir = yT < yTop ? 1 : -1;
      ctx.fillStyle = COLORS.tan;
      ctx.beginPath();
      ctx.moveTo(xt, yEnd);
      ctx.lineTo(xt - 7, yEnd + dir * 12);
      ctx.lineTo(xt + 7, yEnd + dir * 12);
      ctx.closePath();
      ctx.fill();
    }
  }

  #angleArc(x0, y0, R, theta) {
    if (theta < 0.001) return;
    const { ctx } = this;
    const r = R * 0.22;
    ctx.strokeStyle = COLORS.text;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x0, y0, r, 0, -theta, true);
    ctx.stroke();

    const mid = theta / 2;
    const lr = r + 14;
    ctx.fillStyle = COLORS.text;
    ctx.font = "italic 600 14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("θ", x0 + lr * Math.cos(mid), y0 - lr * Math.sin(mid));
  }
}
