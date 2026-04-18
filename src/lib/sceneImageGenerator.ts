import type { ArchiveEntry, ScrapbookPage, ScrapbookSceneType } from "../types/archive";

const W = 400;
const H = 280;

type Palette = { skyTop: string; skyBot: string; ground: string; earth: string; accent: string; skin: string };

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) >>> 0;
}

function rnd(seed: number, i: number): number {
  const x = Math.sin((seed + i * 9973) * 0.0001) * 10000;
  return x - Math.floor(x);
}

function paletteFor(sceneType: ScrapbookSceneType, emotion: string): Palette {
  const e = emotion.toLowerCase();
  const grief = /grief|loss|fear/.test(e);
  const joy = /joy|warmth|love|wonder/.test(e);

  const base: Record<ScrapbookSceneType, Palette> = {
    cooking: {
      skyTop: "#f4e8d8",
      skyBot: "#e8d4bc",
      ground: "#d4b896",
      earth: "#8b6914",
      accent: "#c45c2a",
      skin: "#e8b896",
    },
    journey: {
      skyTop: "#6a7a8e",
      skyBot: "#c9b8a0",
      ground: "#a89880",
      earth: "#5c4a38",
      accent: "#d4a03c",
      skin: "#dcb090",
    },
    celebration: {
      skyTop: "#ffd8a8",
      skyBot: "#f0a868",
      ground: "#d87840",
      earth: "#8b4020",
      accent: "#f8e088",
      skin: "#f0c0a0",
    },
    ritual: {
      skyTop: "#e8e0d8",
      skyBot: "#c8b8a8",
      ground: "#a09078",
      earth: "#6b5040",
      accent: "#a87858",
      skin: "#d8b8a0",
    },
    loss: {
      skyTop: "#a8b0c0",
      skyBot: "#8898a8",
      ground: "#708090",
      earth: "#404850",
      accent: "#9098a0",
      skin: "#c0b0a0",
    },
    childhood: {
      skyTop: "#b8d8f8",
      skyBot: "#e8f0c8",
      ground: "#c8d8a8",
      earth: "#789868",
      accent: "#f8d868",
      skin: "#f0d0b8",
    },
    nature: {
      skyTop: "#88b8d8",
      skyBot: "#b8d8c8",
      ground: "#689878",
      earth: "#406848",
      accent: "#58a898",
      skin: "#d8c8b0",
    },
    home: {
      skyTop: "#f0e8d8",
      skyBot: "#e0d4c0",
      ground: "#d0c0a8",
      earth: "#907860",
      accent: "#c89868",
      skin: "#e8c8a8",
    },
    memory: {
      skyTop: "#d8d0c8",
      skyBot: "#c8b8a8",
      ground: "#b0a090",
      earth: "#786858",
      accent: "#a88868",
      skin: "#d8c0a8",
    },
  };

  const p = { ...base[sceneType] };
  if (grief) {
    p.skyTop = mixHex(p.skyTop, "#8898a8", 0.35);
    p.accent = mixHex(p.accent, "#708090", 0.3);
  }
  if (joy) {
    p.skyTop = mixHex(p.skyTop, "#fff0d0", 0.2);
    p.accent = mixHex(p.accent, "#f8c860", 0.15);
  }
  return p;
}

function mixHex(a: string, b: string, t: number): string {
  const pa = hexToRgb(a);
  const pb = hexToRgb(b);
  if (!pa || !pb) return a;
  const r = Math.round(pa.r + (pb.r - pa.r) * t);
  const g = Math.round(pa.g + (pb.g - pa.g) * t);
  const bl = Math.round(pa.b + (pb.b - pa.b) * t);
  return `rgb(${r},${g},${bl})`;
}

function hexToRgb(h: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(h.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function drawSoftFigure(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  skin: string,
  scale: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(0, -18, 14, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 8, 18, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLantern(ctx: CanvasRenderingContext2D, x: number, y: number, accent: string, seed: number) {
  const w = 18 + rnd(seed, 1) * 8;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") ctx.roundRect(-w / 2, -28, w, 36, 4);
  else ctx.rect(-w / 2, -28, w, 36);
  ctx.fill();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "#fff8e0";
  ctx.beginPath();
  ctx.arc(0, -12, w * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTrain(ctx: CanvasRenderingContext2D, x: number, y: number, accent: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#4a4038";
  ctx.fillRect(-40, -22, 88, 28);
  ctx.fillStyle = accent;
  ctx.fillRect(-36, -18, 20, 14);
  ctx.fillRect(-10, -18, 20, 14);
  ctx.fillStyle = "#303030";
  ctx.beginPath();
  ctx.arc(-24, 8, 6, 0, Math.PI * 2);
  ctx.arc(24, 8, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawRiver(ctx: CanvasRenderingContext2D, y: number, accent: string, seed: number) {
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(0, y);
  for (let x = 0; x <= W; x += 16) {
    ctx.lineTo(x, y + Math.sin(x * 0.04 + seed) * 4);
  }
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBowl(ctx: CanvasRenderingContext2D, x: number, y: number, accent: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "#fff8f0";
  ctx.beginPath();
  ctx.ellipse(-4, -3, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTrunk(ctx: CanvasRenderingContext2D, x: number, y: number, earth: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = earth;
  ctx.fillRect(-26, -32, 52, 40);
  ctx.strokeStyle = mixHex(earth, "#000", 0.25);
  ctx.lineWidth = 1;
  ctx.strokeRect(-26, -32, 52, 40);
  ctx.restore();
}

function drawPhone(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#2a2830";
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") ctx.roundRect(-10, -18, 20, 36, 3);
  else ctx.rect(-10, -18, 20, 36);
  ctx.fill();
  ctx.fillStyle = "#181820";
  ctx.fillRect(-7, -14, 14, 22);
  ctx.restore();
}

function drawSun(ctx: CanvasRenderingContext2D, accent: string, seed: number) {
  const x = 60 + rnd(seed, 40) * 80;
  const y = 40 + rnd(seed, 41) * 30;
  ctx.save();
  const g = ctx.createRadialGradient(x, y, 4, x, y, 48);
  g.addColorStop(0, mixHex(accent, "#fff", 0.5));
  g.addColorStop(1, "rgba(255,240,200,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, 48, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawObjectGlyph(
  ctx: CanvasRenderingContext2D,
  obj: string,
  x: number,
  baseY: number,
  palette: Palette,
  seed: number
) {
  const o = obj.toLowerCase();
  if (/lantern|light|golden|glow/.test(o)) drawLantern(ctx, x, baseY, palette.accent, seed);
  else if (/train|journey|suitcase|border|factory|road/.test(o)) drawTrain(ctx, x, baseY - 10, palette.accent);
  else if (/river|water|amazon|fish|dam/.test(o)) drawRiver(ctx, baseY + 20, palette.accent, seed);
  else if (/dumpling|food|soup|recipe|bowl|kitchen|oil|ginger|meal|cook/.test(o))
    drawBowl(ctx, x, baseY - 6, palette.accent);
  else if (/trunk|cedar|bracelet|belt|wedding/.test(o)) drawTrunk(ctx, x, baseY - 8, palette.earth);
  else if (/phone|record|song|sing|language|melody/.test(o)) drawPhone(ctx, x, baseY - 12);
  else {
    ctx.save();
    ctx.translate(x, baseY);
    ctx.fillStyle = palette.accent;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(0, -8, 10 + rnd(seed, 2) * 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/**
 * Renders a soft storybook-style scene from structured page data (no network).
 * Returns a PNG data URL for `<img src={...} />`.
 */
export function generateSceneImageDataUrl(page: ScrapbookPage, entry: ArchiveEntry): string {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const seed = hashSeed(`${entry.title}|${page.caption}|${page.sceneTitle}`);
  const palette = paletteFor(page.sceneType, page.visualDetails.emotion);

  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.75);
  sky.addColorStop(0, palette.skyTop);
  sky.addColorStop(0.55, palette.skyBot);
  sky.addColorStop(1, palette.ground);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  drawSun(ctx, palette.accent, seed);

  // Ground
  ctx.fillStyle = palette.earth;
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  ctx.moveTo(0, H * 0.68);
  ctx.bezierCurveTo(W * 0.25, H * 0.62, W * 0.75, H * 0.78, W, H * 0.7);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  if (page.sceneType === "nature" || /river|water|amazon/.test(page.caption.toLowerCase())) {
    drawRiver(ctx, H * 0.72, palette.accent, seed);
  }

  const nFig = Math.min(3, Math.max(1, page.visualDetails.characters.length || 1));
  for (let i = 0; i < nFig; i++) {
    const fx = 90 + i * 110 + rnd(seed, i + 3) * 40;
    const fy = H * 0.58 + rnd(seed, i + 7) * 18;
    drawSoftFigure(ctx, fx, fy, palette.skin, 0.85 + rnd(seed, i + 20) * 0.2);
  }

  const objs = page.visualDetails.importantObjects.slice(0, 4);
  const ox0 = 70 + rnd(seed, 50) * 40;
  objs.forEach((obj, i) => {
    drawObjectGlyph(ctx, obj, ox0 + i * 78, H * 0.78, palette, seed + i * 31);
  });

  // Soft vignette
  const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
  vig.addColorStop(0, "rgba(40,32,28,0)");
  vig.addColorStop(1, "rgba(40,32,28,0.22)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  return canvas.toDataURL("image/png");
}

/** Pre-generate all five images for a flipbook */
export function generateScrapbookImageUrls(pages: ScrapbookPage[], entry: ArchiveEntry): string[] {
  return pages.map((p) => generateSceneImageDataUrl(p, entry));
}
