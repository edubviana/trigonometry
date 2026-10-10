// Desenho do triângulo retângulo no Canvas (vértice A fixo, B arrastável).
export const TRI_COLORS = {
  hyp: "#8B5CF6",
  adj: "#0284C7",
  opp: "#EF4444",
};

const BG = "#0f172a";
const TEXT = "#e2e8f0";
const MUTED = "#94a3b8";
const PAD = { left: 64, right: 72, top: 56, bottom: 60 };
const ARC_R = 30;
const RIGHT_ANGLE = 14;
const MIN_SYMBOL = 3; // abaixo disso (px) o símbolo desaparece
const MIN_THETA_LABEL = 14; // raio do arco abaixo do qual o rótulo θ some
export const MIN_H = 0; // lados podem colapsar até 0
export const HIT_RADIUS = 18;

export class TriangleRenderer {
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

  /** Origem A (inferior esquerda). */
  get origin() {
    return { x: PAD.left, y: this.height - PAD.bottom };
  }

  /** Maiores catetos (px) que cabem na área visível. */
  get limits() {
    return {
      adj: Math.max(0, this.width - PAD.left - PAD.right),
      opp: Math.max(0, this.height - PAD.top - PAD.bottom),
    };
  }

  /** Maior hipotenusa que mantém B dentro da área visível para o ângulo θ. */
  maxH(theta) {
    const { x, y } = this.origin;
    const byX = (this.width - PAD.right - x) / Math.cos(theta);
    const byY = (y - PAD.top) / Math.sin(theta);
    return Math.max(MIN_H, Math.min(byX, byY));
  }

  /** Vértices A, B (hipotenusa) e C (ângulo reto) em pixels. */
  vertices(theta, H) {
    const A = this.origin;
    const B = { x: A.x + H * Math.cos(theta), y: A.y - H * Math.sin(theta) };
    const C = { x: B.x, y: A.y };
    return { A, B, C };
  }

  draw({ theta, H, hover, dragging, labels }) {
    const { ctx, width: w, height: h } = this;
    const { A, B, C } = this.vertices(theta, H);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = TEXT;
    ctx.font = `700 ${Math.max(13, Math.min(22, w * 0.035))}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("Triângulo Retângulo", w / 2, 14, w - 24);

    // Preenchimento suave
    ctx.fillStyle = "rgba(139, 92, 246, 0.10)";
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.lineTo(B.x, B.y);
    ctx.lineTo(C.x, C.y);
    ctx.closePath();
    ctx.fill();

    // Catetos e hipotenusa
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    this.#segment(A, C, TRI_COLORS.adj);
    this.#segment(C, B, TRI_COLORS.opp);
    this.#segment(A, B, TRI_COLORS.hyp);
    ctx.lineCap = "butt";

    // Catetos em pixels: os símbolos encolhem para caber e somem ao colapsar.
    const legA = C.x - A.x;
    const legO = C.y - B.y;
    this.#rightAngle(C, Math.min(RIGHT_ANGLE, (legA * legO) / (legA + legO || 1)));
    this.#thetaArc(A, theta, Math.min(ARC_R, legA / 1.5, legO));
    this.#sideLabels(A, B, C, theta, labels);
    this.#vertexLabels(A, B, C);
    this.#handle(B, hover, dragging);
  }

  #segment(p, q, color) {
    const { ctx } = this;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
  }

  /** Quadradinho com ponto central no vértice C (lados para A e para B). */
  #rightAngle(C, s) {
    const { ctx } = this;
    if (s < MIN_SYMBOL) return;
    ctx.strokeStyle = MUTED;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(C.x - s, C.y - s, s, s);
    ctx.fillStyle = MUTED;
    ctx.beginPath();
    ctx.arc(C.x - s / 2, C.y - s / 2, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  #thetaArc(A, theta, r) {
    const { ctx } = this;
    if (r < MIN_SYMBOL) return;
    ctx.strokeStyle = TEXT;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(A.x, A.y, r, -theta, 0);
    ctx.stroke();

    if (r < MIN_THETA_LABEL) return;
    const scale = r / ARC_R;
    ctx.fillStyle = TEXT;
    ctx.font = `italic 600 ${Math.max(10, 15 * scale)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const mid = theta / 2;
    const d = r * 1.45;
    ctx.fillText("θ", A.x + d * Math.cos(mid), A.y - d * Math.sin(mid));
  }

  #sideLabels(A, B, C, theta, labels) {
    const { ctx } = this;
    ctx.font = "600 14px system-ui, sans-serif";

    // Rótulos de lados muito curtos são omitidos para não se sobreporem.
    if (C.x - A.x >= 24) {
      ctx.fillStyle = TRI_COLORS.adj;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(labels.adj, (A.x + C.x) / 2, A.y + 10);
    }

    if (C.y - B.y >= 16) {
      ctx.fillStyle = TRI_COLORS.opp;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(labels.opp, C.x + 12, (B.y + C.y) / 2);
    }

    if (Math.hypot(B.x - A.x, B.y - A.y) >= 40) {
      ctx.fillStyle = TRI_COLORS.hyp;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const off = 18;
      ctx.fillText(
        labels.hyp,
        (A.x + B.x) / 2 - off * Math.sin(theta),
        (A.y + B.y) / 2 - off * Math.cos(theta),
      );
    }
  }

  #vertexLabels(A, B, C) {
    const { ctx } = this;
    ctx.fillStyle = MUTED;
    ctx.font = "700 14px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText("A", A.x - 8, A.y + 6);
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText("B", B.x + 10, B.y - 6);
    ctx.textBaseline = "top";
    ctx.fillText("C", C.x + 8, C.y + 6);
  }

  #handle(B, hover, dragging) {
    const { ctx } = this;
    const active = hover || dragging;
    if (active) {
      ctx.fillStyle = "rgba(139, 92, 246, 0.25)";
      ctx.beginPath();
      ctx.arc(B.x, B.y, 16, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = TRI_COLORS.hyp;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(B.x, B.y, active ? 9 : 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}
