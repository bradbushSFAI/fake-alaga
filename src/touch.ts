import Phaser from "phaser";
import { W, H, txtStyle } from "./const";

// Touch detection. `?touch=1` forces controls on (handy for desktop preview).
export function isTouchDevice(): boolean {
  if (typeof location !== "undefined" && location.search.includes("touch=1")) return true;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

const STICK_RADIUS = 56;
const FIRE_X = W - 66;
const FIRE_Y = H - 116;
const FIRE_R = 46;
const PAUSE_X = W - 26;
const PAUSE_Y = 24;

// Floating virtual thumbstick (left thumb) + fire button (right thumb).
// Multi-touch: both work simultaneously via distinct pointer ids.
export class TouchControls {
  vec = { x: 0, y: 0 }; // analog, magnitude 0..1
  firing = false;
  active = false; // stick currently held
  blocked = false; // true while the game is paused — only the pause button responds

  private scene: Phaser.Scene;
  private stickId: number | null = null;
  private fireId: number | null = null;
  private anchor = { x: 0, y: 0 };
  private base: Phaser.GameObjects.Graphics;
  private knob: Phaser.GameObjects.Graphics;
  private fireBtn: Phaser.GameObjects.Graphics;
  private fireLabel: Phaser.GameObjects.Text;
  private pauseLabel: Phaser.GameObjects.Text | null = null;

  constructor(scene: Phaser.Scene, onPause?: () => void) {
    this.scene = scene;
    const need = 4 - scene.input.manager.pointers.length;
    if (need > 0) scene.input.addPointer(need);

    this.base = scene.add.graphics().setDepth(240).setAlpha(0);
    this.base.lineStyle(3, 0x40e0ff, 0.5).strokeCircle(0, 0, STICK_RADIUS);
    this.base.fillStyle(0x40e0ff, 0.08).fillCircle(0, 0, STICK_RADIUS);
    this.knob = scene.add.graphics().setDepth(241).setAlpha(0);
    this.knob.fillStyle(0x40e0ff, 0.45).fillCircle(0, 0, 22);

    this.fireBtn = scene.add.graphics().setDepth(240).setAlpha(0.4);
    this.fireBtn.lineStyle(3, 0xff5050, 0.9).strokeCircle(FIRE_X, FIRE_Y, FIRE_R);
    this.fireBtn.fillStyle(0xff5050, 0.15).fillCircle(FIRE_X, FIRE_Y, FIRE_R);
    this.fireLabel = scene.add
      .text(FIRE_X, FIRE_Y, "FIRE", txtStyle(15, "#ff8080"))
      .setOrigin(0.5)
      .setDepth(241)
      .setAlpha(0.6);

    if (onPause) {
      this.pauseLabel = scene.add
        .text(PAUSE_X, PAUSE_Y, "❚❚", txtStyle(18, "#8888aa"))
        .setOrigin(0.5)
        .setDepth(241)
        .setAlpha(0.7);
    }

    scene.input.on("pointerdown", (p: Phaser.Input.Pointer) => this.down(p, onPause));
    scene.input.on("pointermove", (p: Phaser.Input.Pointer) => this.move(p));
    scene.input.on("pointerup", (p: Phaser.Input.Pointer) => this.up(p));
    scene.input.on("pointerupoutside", (p: Phaser.Input.Pointer) => this.up(p));
  }

  private down(p: Phaser.Input.Pointer, onPause?: () => void): void {
    if (onPause && Phaser.Math.Distance.Between(p.x, p.y, PAUSE_X, PAUSE_Y) < 30) {
      onPause();
      return;
    }
    if (this.blocked) return;
    if (this.fireId === null && Phaser.Math.Distance.Between(p.x, p.y, FIRE_X, FIRE_Y) < FIRE_R + 26) {
      this.fireId = p.id;
      this.firing = true;
      this.fireBtn.setAlpha(0.85);
      return;
    }
    if (this.stickId === null && p.x < W * 0.62) {
      this.stickId = p.id;
      this.anchor = { x: p.x, y: p.y };
      this.active = true;
      this.vec = { x: 0, y: 0 };
      this.base.setPosition(p.x, p.y).setAlpha(0.9);
      this.knob.setPosition(p.x, p.y).setAlpha(0.9);
    }
  }

  private move(p: Phaser.Input.Pointer): void {
    if (p.id !== this.stickId) return;
    const dx = p.x - this.anchor.x;
    const dy = p.y - this.anchor.y;
    const len = Math.hypot(dx, dy);
    if (len < 5) {
      this.vec = { x: 0, y: 0 };
      this.knob.setPosition(this.anchor.x, this.anchor.y);
      return;
    }
    const cl = Math.min(len, STICK_RADIUS);
    this.vec = { x: (dx / len) * (cl / STICK_RADIUS), y: (dy / len) * (cl / STICK_RADIUS) };
    this.knob.setPosition(this.anchor.x + (dx / len) * cl, this.anchor.y + (dy / len) * cl);
  }

  private up(p: Phaser.Input.Pointer): void {
    if (p.id === this.stickId) {
      this.stickId = null;
      this.active = false;
      this.vec = { x: 0, y: 0 };
      this.base.setAlpha(0);
      this.knob.setAlpha(0);
    }
    if (p.id === this.fireId) {
      this.fireId = null;
      this.firing = false;
      this.fireBtn.setAlpha(0.4);
    }
  }
}

// On-screen A-Z pad for code entry / initials on touch devices.
export class LetterPad {
  private objs: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene, y: number, onLetter: (ch: string) => void, onDelete: () => void) {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const cols = 7;
    const cellW = 66;
    const cellH = 46;
    const startX = W / 2 - ((cols - 1) * cellW) / 2;
    [...letters].forEach((ch, i) => {
      const cx = startX + (i % cols) * cellW;
      const cy = y + Math.floor(i / cols) * cellH;
      this.objs.push(this.cell(scene, cx, cy, ch, "#e8e8ff", () => onLetter(ch)));
    });
    // DEL key at the end of the last row
    const delIdx = letters.length; // 26 -> row 3, col 5
    const dx = startX + (delIdx % cols) * cellW;
    const dy = y + Math.floor(delIdx / cols) * cellH;
    this.objs.push(this.cell(scene, dx + cellW / 2, dy, "DEL", "#ff8080", onDelete));
  }

  private cell(
    scene: Phaser.Scene,
    x: number,
    y: number,
    label: string,
    color: string,
    cb: () => void
  ): Phaser.GameObjects.Text {
    const t = scene.add
      .text(x, y, label, txtStyle(label === "DEL" ? 14 : 20, color))
      .setOrigin(0.5)
      .setPadding(12, 10, 12, 10)
      .setInteractive({ useHandCursor: true });
    t.on("pointerdown", cb);
    return t;
  }

  destroy(): void {
    this.objs.forEach((o) => o.destroy());
    this.objs = [];
  }
}
