import Phaser from "phaser";

// Draws a pixel-map (array of strings, one char per pixel) into a canvas texture.
// '.' or ' ' = transparent. Any other char looks up its color in the palette.
export function px(
  scene: Phaser.Scene,
  key: string,
  rows: string[],
  palette: Record<string, string>,
  scale = 3
): void {
  if (scene.textures.exists(key)) return;
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const tex = scene.textures.createCanvas(key, w * scale, h * scale);
  if (!tex) return;
  const ctx = tex.getContext();
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === "." || ch === " ") return;
      const c = palette[ch];
      if (!c) return;
      ctx.fillStyle = c;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    });
  });
  tex.refresh();
}

// Simple filled-rect texture (stars, beams, bars).
export function rect(scene: Phaser.Scene, key: string, w: number, h: number, color: string): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return;
  const ctx = tex.getContext();
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  tex.refresh();
}

// Diamond power-up token with a letter stamped on it.
export function token(scene: Phaser.Scene, key: string, letter: string, color: string): void {
  if (scene.textures.exists(key)) return;
  const s = 30;
  const tex = scene.textures.createCanvas(key, s, s);
  if (!tex) return;
  const ctx = tex.getContext();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(s / 2, 1);
  ctx.lineTo(s - 1, s / 2);
  ctx.lineTo(s / 2, s - 1);
  ctx.lineTo(1, s / 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#000000";
  ctx.font = "bold 13px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(letter, s / 2, s / 2 + 1);
  tex.refresh();
}

// Soft radial blob for nebulas / glows.
export function blob(scene: Phaser.Scene, key: string, size: number, color: string): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, size, size);
  if (!tex) return;
  const ctx = tex.getContext();
  const g = ctx.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size / 2);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  tex.refresh();
}
