import Phaser from "phaser";
import { W, H, txtStyle } from "../const";
import { audio } from "../audio";
import { WORLDS, ENDING, worldOf } from "../levels";
import { RunState, codeForCompletedLevel, earnCode } from "../state";

interface CutsceneData {
  kind: "world" | "code" | "ending";
  run: RunState;
  completedLevel?: number; // for kind "code"
}

// Pixel-art story cards with typewriter text. Space skips/advances.
export class CutsceneScene extends Phaser.Scene {
  private lines: string[] = [];
  private lineIdx = 0;
  private charIdx = 0;
  private textObj!: Phaser.GameObjects.Text;
  private done = false;
  private data_!: CutsceneData;
  private typeTimer = 0;

  constructor() {
    super("Cutscene");
  }

  create(data: CutsceneData): void {
    this.data_ = data;
    this.done = false;
    this.lineIdx = 0;
    this.charIdx = 0;

    audio.play(data.kind === "ending" ? "victory" : "cutscene");

    this.add.rectangle(W / 2, H / 2, W, H, 0x05050c);

    const w = worldOf(data.run.level);
    const world = WORLDS[w];

    if (data.kind === "world") {
      this.lines = [...world.story];
      this.buildWorldArt(w);
      this.add.text(W / 2, 120, world.name, txtStyle(30, "#ffe040")).setOrigin(0.5);
      this.add.text(W / 2, 158, `WORLD ${w + 1} OF 5`, txtStyle(14, "#40e0ff")).setOrigin(0.5);
    } else if (data.kind === "code") {
      const code = codeForCompletedLevel(data.completedLevel!)!;
      earnCode(code);
      audio.sfx("code");
      this.lines = [
        `${WORLDS[worldOf(data.completedLevel!)].name} — CLEARED`,
        "",
        "TRANSMISSION FROM HOME RIM COMMAND:",
        "CHECKPOINT REACHED, PILOT.",
        "",
        `YOUR CODE IS:  ${code}`,
        "",
        "ENTER IT AT THE TITLE SCREEN TO",
        "RETURN TO THIS POINT ANY TIME.",
      ];
      this.add.text(W / 2, 120, "CHECKPOINT", txtStyle(30, "#30e060")).setOrigin(0.5);
      const codeArt = this.add.text(W / 2, 210, code, txtStyle(64, "#ffe040")).setOrigin(0.5);
      codeArt.setStroke("#ff3060", 8);
      this.tweens.add({ targets: codeArt, scale: 1.1, duration: 500, yoyo: true, repeat: -1 });
    } else {
      this.lines = [...ENDING];
      this.buildEndingArt();
      this.add.text(W / 2, 120, "VICTORY", txtStyle(40, "#ffe040")).setOrigin(0.5);
    }

    this.textObj = this.add.text(70, 300, "", { ...txtStyle(16), lineSpacing: 12 });

    const hint = this.add
      .text(W / 2, H - 50, "SPACE / TAP — CONTINUE", txtStyle(13, "#8888aa"))
      .setOrigin(0.5);
    this.tweens.add({ targets: hint, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });

    // Raw DOM listener — Phaser's key events can multi-deliver one press.
    const domKey = (ev: KeyboardEvent) => {
      if (ev.repeat) return;
      if (ev.key === " " || ev.key === "Enter") this.advance();
    };
    window.addEventListener("keydown", domKey);
    this.events.on("shutdown", () => window.removeEventListener("keydown", domKey));
    this.input.on("pointerdown", () => this.advance());
  }

  private buildWorldArt(w: number): void {
    // A little diorama: enemies of the world hovering over the player ship.
    const enemyTex: string[][] = [
      ["e_d0", "e_s0", "e_w0"],
      ["e_x0", "e_e0", "e_d0"],
      ["e_p0", "e_n0", "e_s0"],
      ["e_h0", "e_n0", "e_w0"],
      ["e_w0", "e_p0", "e_x0"],
    ];
    enemyTex[w].forEach((tex, i) => {
      const img = this.add.image(W / 2 - 90 + i * 90, 230, tex).setScale(1.4);
      this.tweens.add({
        targets: img,
        y: 222,
        duration: 800 + i * 150,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });
    });
  }

  private buildEndingArt(): void {
    const ship = this.add.image(W / 2, 230, "player").setScale(2);
    const ship2 = this.add.image(W / 2 - 60, 250, "player2").setScale(1.4);
    this.tweens.add({ targets: [ship, ship2], y: "-=10", duration: 900, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    for (let i = 0; i < 3; i++) {
      const g = this.add.image(Phaser.Math.Between(100, W - 100), Phaser.Math.Between(180, 280), "glow");
      g.setAlpha(0.3).setScale(Phaser.Math.FloatBetween(0.5, 1.5));
      this.tweens.add({ targets: g, alpha: 0.05, duration: 800 + i * 300, yoyo: true, repeat: -1 });
    }
  }

  update(_t: number, dt: number): void {
    if (this.done) return;
    this.typeTimer += dt;
    while (this.typeTimer > 28 && !this.done) {
      this.typeTimer -= 28;
      this.typeChar();
    }
  }

  private typeChar(): void {
    if (this.lineIdx >= this.lines.length) {
      this.done = true;
      return;
    }
    const line = this.lines[this.lineIdx];
    if (this.charIdx < line.length) {
      this.charIdx++;
      if (line[this.charIdx - 1] !== " ") audio.sfx("type");
    } else {
      this.lineIdx++;
      this.charIdx = 0;
    }
    this.render();
  }

  private render(): void {
    const shown = this.lines
      .slice(0, this.lineIdx + 1)
      .map((l, i) => (i === this.lineIdx ? l.slice(0, this.charIdx) : l));
    this.textObj.setText(shown.join("\n"));
  }

  private advance(): void {
    audio.unlock();
    if (!this.done) {
      // First press: reveal everything.
      this.lineIdx = this.lines.length;
      this.charIdx = 0;
      this.done = true;
      this.textObj.setText(this.lines.join("\n"));
      return;
    }
    audio.sfx("menuSel");
    audio.stop();
    const d = this.data_;
    if (d.kind === "world") {
      this.scene.start("Game", { run: d.run });
    } else if (d.kind === "code") {
      // After the code card, show the next world's story card.
      this.scene.start("Cutscene", { kind: "world", run: d.run });
    } else {
      this.scene.start("GameOver", {
        score: d.run.score,
        level: d.run.level,
        won: true,
      });
    }
  }
}
