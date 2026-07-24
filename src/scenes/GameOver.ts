import Phaser from "phaser";
import { W, H, txtStyle } from "../const";
import { audio } from "../audio";
import { Starfield } from "../starfield";
import { qualifies, addScore, loadScores, loadSettings, scoreMult } from "../state";
import { LetterPad, isTouchDevice } from "../touch";

interface GameOverData {
  score: number;
  level: number;
  won: boolean;
}

// Game-over / victory wrap-up with classic 3-initial high-score entry.
export class GameOverScene extends Phaser.Scene {
  private data_!: GameOverData;
  private entering = false;
  private initials: string[] = [];
  private slotTexts: Phaser.GameObjects.Text[] = [];
  private stars!: Starfield;
  private inputReady = false;
  private pad: LetterPad | null = null;

  constructor() {
    super("GameOver");
  }

  create(data: GameOverData): void {
    this.data_ = data;
    this.initials = [];
    this.stars = new Starfield(this, data.won ? 0xffe088 : 0x8888aa);

    const title = data.won ? "MISSION COMPLETE" : "GAME OVER";
    const color = data.won ? "#ffe040" : "#ff5050";
    this.add.text(W / 2, 150, title, txtStyle(36, color)).setOrigin(0.5);
    this.add
      .text(W / 2, 220, `FINAL SCORE  ${data.score.toString().padStart(7, "0")}`, txtStyle(20, "#ffffff"))
      .setOrigin(0.5);
    const mult = scoreMult(loadSettings());
    this.add
      .text(W / 2, 252, `DIFFICULTY ×${mult.toFixed(2)}  ·  REACHED LEVEL ${data.level}`, txtStyle(13, "#40e0ff"))
      .setOrigin(0.5);

    this.entering = qualifies(data.score);
    if (this.entering) {
      audio.play("menu");
      this.add.text(W / 2, 320, "NEW HIGH SCORE!", txtStyle(22, "#30e060")).setOrigin(0.5);
      this.add.text(W / 2, 355, "ENTER YOUR INITIALS", txtStyle(14, "#8888aa")).setOrigin(0.5);
      this.renderSlots();
      if (isTouchDevice()) {
        this.pad = new LetterPad(this, 490, (ch) => this.addInitial(ch), () => this.delInitial());
      } else {
        this.add
          .text(W / 2, 500, "TYPE 3 LETTERS · BACKSPACE ERASE", txtStyle(12, "#8888aa"))
          .setOrigin(0.5);
      }
    } else {
      this.showTable();
    }

    // Grace period so held/repeating movement keys can't type initials.
    this.inputReady = false;
    this.time.delayedCall(700, () => (this.inputReady = true));
    // Raw DOM listener — Phaser's generic "keydown" emit can multi-deliver one press.
    const domKey = (ev: KeyboardEvent) => this.onKey(ev);
    window.addEventListener("keydown", domKey);
    this.events.on("shutdown", () => window.removeEventListener("keydown", domKey));
    // tap-to-continue once the table is showing
    this.input.on("pointerdown", () => {
      if (!this.entering && this.inputReady) {
        audio.sfx("menuSel");
        audio.stop();
        this.scene.start("Menu");
      }
    });
  }

  update(_t: number, dt: number): void {
    this.stars.update(dt);
  }

  private renderSlots(): void {
    this.slotTexts.forEach((t) => t.destroy());
    this.slotTexts = [];
    for (let i = 0; i < 3; i++) {
      const ch = this.initials[i] ?? "_";
      this.slotTexts.push(
        this.add
          .text(W / 2 - 60 + i * 60, 430, ch, txtStyle(44, this.initials[i] ? "#ffffff" : "#444466"))
          .setOrigin(0.5)
      );
    }
  }

  private showTable(): void {
    const scores = loadScores();
    const startY = 330;
    this.add.text(W / 2, startY - 30, "— HALL OF PILOTS —", txtStyle(16, "#ffe040")).setOrigin(0.5);
    scores.slice(0, 8).forEach((s, i) => {
      const y = startY + 10 + i * 32;
      const c = i === 0 ? "#ffe040" : "#e8e8ff";
      this.add.text(120, y, `${i + 1}.`, txtStyle(14, c)).setOrigin(0, 0.5);
      this.add.text(170, y, s.name, txtStyle(14, c)).setOrigin(0, 0.5);
      this.add.text(320, y, s.score.toString().padStart(7, "0"), txtStyle(14, c)).setOrigin(0, 0.5);
      this.add.text(440, y, s.won ? "★" : `L${s.level}`, txtStyle(12, "#8888aa")).setOrigin(0, 0.5);
    });
    const hint = this.add.text(W / 2, H - 80, "SPACE — TITLE SCREEN", txtStyle(14, "#8888aa")).setOrigin(0.5);
    this.tweens.add({ targets: hint, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });
  }

  private addInitial(ch: string): void {
    if (!this.entering || !this.inputReady || this.initials.length >= 3) return;
    this.initials.push(ch.toUpperCase());
    audio.sfx("type");
    this.renderSlots();
    if (this.initials.length === 3) {
      this.entering = false;
      audio.sfx("code");
      addScore({
        name: this.initials.join(""),
        score: this.data_.score,
        mult: scoreMult(loadSettings()),
        level: this.data_.level,
        won: this.data_.won,
      });
      // block the same tap from also triggering tap-to-continue
      this.inputReady = false;
      this.time.delayedCall(400, () => {
        if (this.pad) {
          this.pad.destroy();
          this.pad = null;
        }
        this.showTable();
        this.time.delayedCall(500, () => (this.inputReady = true));
      });
    }
  }

  private delInitial(): void {
    if (!this.entering) return;
    this.initials.pop();
    this.renderSlots();
  }

  private onKey(ev: KeyboardEvent): void {
    audio.unlock();
    if (!this.inputReady || ev.repeat) return;
    const k = ev.key;
    if (this.entering) {
      if (/^[a-zA-Z]$/.test(k)) {
        this.addInitial(k);
      } else if (k === "Backspace") {
        this.delInitial();
      }
      return;
    }
    if (k === " " || k === "Enter") {
      audio.sfx("menuSel");
      audio.stop();
      this.scene.start("Menu");
    }
  }
}
