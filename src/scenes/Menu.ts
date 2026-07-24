import Phaser from "phaser";
import { W, H, txtStyle } from "../const";
import { audio } from "../audio";
import {
  Settings,
  loadSettings,
  saveSettings,
  clampSetting,
  scoreMult,
  levelForCode,
  earnedCodes,
  loadScores,
  highScore,
  newRun,
} from "../state";
import { worldOf, WORLDS } from "../levels";
import { Starfield } from "../starfield";
import { LetterPad, isTouchDevice } from "../touch";

type Mode = "title" | "menu" | "options" | "scores" | "code";

const MENU_ITEMS = ["START GAME", "ENTER CODE", "OPTIONS", "HIGH SCORES"];

export class MenuScene extends Phaser.Scene {
  private mode: Mode = "title";
  private stars!: Starfield;
  private ui: Phaser.GameObjects.GameObject[] = [];
  private menuIdx = 0;
  private optIdx = 0;
  private settings!: Settings;
  private codeChars: string[] = [];
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private unlocked = false;
  private codePad: LetterPad | null = null;

  constructor() {
    super("Menu");
  }

  create(): void {
    this.settings = loadSettings();
    this.stars = new Starfield(this, 0xaaccff);
    this.mode = "title";
    this.menuIdx = 0;
    this.ui = [];

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,ENTER,ESC,BACKSPACE,M") as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;

    // Bind the raw DOM event: Phaser's generic "keydown" emit can deliver the
    // same physical press multiple times (and even during keyup processing).
    const domKey = (ev: KeyboardEvent) => this.onKey(ev);
    window.addEventListener("keydown", domKey);
    this.events.on("shutdown", () => window.removeEventListener("keydown", domKey));
    this.input.once("pointerdown", () => audio.unlock());

    // touch: tap-through on the passive screens (items handle their own taps)
    this.input.on("pointerdown", () => {
      if (this.mode === "title") {
        audio.sfx("menuSel");
        this.showMenu();
      } else if (this.mode === "scores") {
        audio.sfx("menuSel");
        this.showMenu();
      }
    });

    this.showTitle();

  }

  update(_t: number, dt: number): void {
    this.stars.update(dt);
  }

  private clearUI(): void {
    this.ui.forEach((o) => o.destroy());
    this.ui = [];
    if (this.codePad) {
      this.codePad.destroy();
      this.codePad = null;
    }
    this.codeSlotTexts = [];
    if (this.codeMsg) {
      this.codeMsg.destroy();
      this.codeMsg = null;
    }
  }

  private add_<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.ui.push(obj);
    return obj;
  }

  private text(x: number, y: number, s: string, size: number, color = "#e8e8ff", origin = 0.5) {
    return this.add_(this.add.text(x, y, s, txtStyle(size, color)).setOrigin(origin));
  }

  // ---------- screens ----------
  private showTitle(): void {
    this.clearUI();
    this.mode = "title";
    audio.play("menu");

    const logo = this.text(W / 2, 190, "FAKE-ALAGA", 52, "#ffe040");
    logo.setStroke("#ff3060", 8);
    this.text(W / 2, 240, "— GALACTIC REMIX —", 16, "#40e0ff");

    // little enemy parade
    ["e_d0", "e_s0", "e_p0", "e_w0"].forEach((tex, i) => {
      const spr = this.add_(this.add.image(W / 2 - 120 + i * 80, 320, tex));
      this.tweens.add({
        targets: spr,
        y: 312,
        duration: 700 + i * 120,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });
    });
    const ship = this.add_(this.add.image(W / 2, 400, "player"));
    this.tweens.add({ targets: ship, x: W / 2 + 40, duration: 1600, yoyo: true, repeat: -1, ease: "Sine.inOut" });

    const press = this.text(W / 2, 500, isTouchDevice() ? "TAP TO START" : "PRESS SPACE", 22, "#ffffff");
    this.tweens.add({ targets: press, alpha: 0.2, duration: 550, yoyo: true, repeat: -1 });

    this.text(W / 2, 585, `HIGH SCORE  ${highScore().toString().padStart(6, "0")}`, 16, "#ffe040");
    this.text(W / 2, 640, "WASD MOVE · SPACE FIRE · P PAUSE · M MUTE", 12, "#8888aa");
    this.text(W / 2, 664, "©2287 HOME RIM DEFENSE FORCE", 11, "#555577");
  }

  private showMenu(): void {
    this.clearUI();
    this.mode = "menu";
    this.text(W / 2, 150, "FAKE-ALAGA", 40, "#ffe040").setStroke("#ff3060", 6);
    MENU_ITEMS.forEach((item, i) => {
      const t = this.text(W / 2, 300 + i * 52, item, 24, i === this.menuIdx ? "#ffe040" : "#8888aa");
      (t as Phaser.GameObjects.Text)
        .setPadding(16, 10, 16, 10)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => {
          ev?.stopPropagation?.();
          this.menuIdx = i;
          audio.sfx("menuSel");
          this.activateMenuItem();
        });
    });
    this.text(W / 2, 560, `DIFFICULTY  SPD ${this.settings.speed} / TGH ${this.settings.tough}  ·  SCORE ×${scoreMult(this.settings).toFixed(2)}`, 13, "#40e0ff");
    this.text(W / 2, 640, "W/S SELECT · SPACE CONFIRM", 12, "#8888aa");
  }

  private showOptions(): void {
    this.clearUI();
    this.mode = "options";
    this.text(W / 2, 140, "OPTIONS", 34, "#ffe040");

    const rows = [
      { label: "ENEMY SPEED", val: this.settings.speed },
      { label: "ENEMY TOUGHNESS", val: this.settings.tough },
    ];
    rows.forEach((r, i) => {
      const sel = this.optIdx === i;
      const y = 280 + i * 90;
      this.text(W / 2, y - 26, r.label, 18, sel ? "#ffe040" : "#8888aa");
      // slider bar
      const barW = 300;
      for (let seg = 0; seg < 10; seg++) {
        const on = seg < r.val;
        const cell = this.add_(
          this.add.rectangle(W / 2 - barW / 2 + seg * (barW / 10) + barW / 20, y + 6, barW / 10 - 6, 18, on ? (sel ? 0xffe040 : 0x8888aa) : 0x222244)
        );
        cell.setStrokeStyle(1, 0x444466);
        // tap a segment to set that value directly
        cell.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
          this.optIdx = i;
          if (i === 0) this.settings.speed = clampSetting(seg + 1);
          else this.settings.tough = clampSetting(seg + 1);
          saveSettings(this.settings);
          audio.sfx("menuMove");
          this.showOptions();
        });
      }
      this.text(W / 2 + barW / 2 + 30, y + 6, `${r.val}`, 18, sel ? "#ffe040" : "#8888aa");
    });

    const back = this.optIdx === 2;
    const backT = this.text(W / 2, 500, "BACK", 20, back ? "#ffe040" : "#8888aa");
    (backT as Phaser.GameObjects.Text)
      .setPadding(16, 10, 16, 10)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        audio.sfx("menuSel");
        this.showMenu();
      });

    this.text(W / 2, 570, `SCORE MULTIPLIER  ×${scoreMult(this.settings).toFixed(2)}`, 16, "#40e0ff");
    this.text(W / 2, 596, "HARDER ENEMIES = BIGGER SCORES", 12, "#8888aa");
    this.text(W / 2, 650, "W/S SELECT · A/D ADJUST · SPACE BACK", 12, "#8888aa");
  }

  private showScores(): void {
    this.clearUI();
    this.mode = "scores";
    this.text(W / 2, 120, "HIGH SCORES", 32, "#ffe040");
    const scores = loadScores();
    if (!scores.length) {
      this.text(W / 2, 340, "NO SCORES YET.", 18, "#8888aa");
      this.text(W / 2, 375, "GO MAKE HISTORY, PILOT.", 18, "#8888aa");
    }
    scores.forEach((s, i) => {
      const y = 190 + i * 40;
      const color = i === 0 ? "#ffe040" : "#e8e8ff";
      this.text(70, y, `${(i + 1).toString().padStart(2)}.`, 16, color, 0);
      this.text(130, y, s.name, 16, color, 0);
      this.text(320, y, s.score.toString().padStart(7, "0"), 16, color, 0);
      this.text(430, y, `×${s.mult.toFixed(2)}`, 13, "#40e0ff", 0);
      this.text(500, y, s.won ? "★" : `L${s.level}`, 13, s.won ? "#ffe040" : "#8888aa", 0);
    });
    this.text(W / 2, 650, "SPACE TO GO BACK", 12, "#8888aa");
  }

  private showCode(): void {
    this.clearUI();
    this.mode = "code";
    this.codeChars = [];
    this.unlocked = false;
    const touch = isTouchDevice();
    this.text(W / 2, 150, "ENTER CODE", 32, "#ffe040");
    this.text(W / 2, 205, touch ? "TAP IN THE 3-LETTER CHECKPOINT CODE" : "TYPE THE 3-LETTER CHECKPOINT CODE", 14, "#8888aa");
    this.renderCodeSlots();
    const earned = earnedCodes();
    if (earned.length) {
      this.text(W / 2, touch ? 245 : 480, "CODES YOU HAVE EARNED:", 13, "#40e0ff");
      this.text(W / 2, touch ? 270 : 510, earned.join("   "), 16, "#ffe040");
    }
    if (touch) {
      this.codePad = new LetterPad(this, 460, (ch) => this.addCodeChar(ch), () => this.delCodeChar());
      const backT = this.text(W / 2, 665, "◀ BACK", 16, "#8888aa");
      (backT as Phaser.GameObjects.Text)
        .setPadding(14, 8, 14, 8)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => {
          audio.sfx("menuSel");
          this.showMenu();
        });
    } else {
      this.text(W / 2, 650, "TYPE LETTERS · BACKSPACE ERASE · ESC BACK", 12, "#8888aa");
    }
  }

  private addCodeChar(ch: string): void {
    if (this.mode !== "code" || this.unlocked || this.codeChars.length >= 3) return;
    this.codeChars.push(ch.toUpperCase());
    audio.sfx("type");
    this.renderCodeSlots();
    if (this.codeChars.length === 3) {
      const code = this.codeChars.join("");
      const level = levelForCode(code);
      if (level) {
        this.unlocked = true;
        audio.sfx("code");
        const w = worldOf(level);
        this.setCodeMsg(`CHECKPOINT ACCEPTED — ${WORLDS[w].name}`, "#30e060");
        this.time.delayedCall(1100, () => this.startGame(level));
      } else {
        audio.sfx("hit");
        this.setCodeMsg("UNKNOWN CODE", "#ff5050");
        this.time.delayedCall(700, () => {
          this.codeChars = [];
          this.renderCodeSlots();
          if (this.codeMsg) this.codeMsg.destroy();
          this.codeMsg = null;
        });
      }
    }
  }

  private delCodeChar(): void {
    if (this.mode !== "code" || this.unlocked) return;
    this.codeChars.pop();
    this.renderCodeSlots();
  }

  private codeSlotTexts: Phaser.GameObjects.Text[] = [];
  private codeMsg: Phaser.GameObjects.Text | null = null;

  private renderCodeSlots(): void {
    this.codeSlotTexts.forEach((t) => t.destroy());
    this.codeSlotTexts = [];
    for (let i = 0; i < 3; i++) {
      const ch = this.codeChars[i] ?? "_";
      const t = this.text(W / 2 - 60 + i * 60, 320, ch, 44, this.codeChars[i] ? "#ffffff" : "#444466");
      this.codeSlotTexts.push(t as Phaser.GameObjects.Text);
    }
  }

  private setCodeMsg(msg: string, color: string): void {
    if (this.codeMsg) this.codeMsg.destroy();
    this.codeMsg = this.text(W / 2, 400, msg, 16, color) as Phaser.GameObjects.Text;
  }

  // ---------- input ----------
  private onKey(ev: KeyboardEvent): void {
    audio.unlock();
    if (ev.repeat) return;
    const k = ev.key;

    if (k === "m" || k === "M") {
      audio.toggleMute();
      return;
    }

    if (this.mode === "title") {
      if (k === " " || k === "Enter") {
        audio.sfx("menuSel");
        this.showMenu();
      }
      return;
    }

    if (this.mode === "menu") {
      if (k === "w" || k === "W" || k === "ArrowUp") {
        this.menuIdx = (this.menuIdx + MENU_ITEMS.length - 1) % MENU_ITEMS.length;
        audio.sfx("menuMove");
        this.showMenu();
      } else if (k === "s" || k === "S" || k === "ArrowDown") {
        this.menuIdx = (this.menuIdx + 1) % MENU_ITEMS.length;
        audio.sfx("menuMove");
        this.showMenu();
      } else if (k === " " || k === "Enter") {
        audio.sfx("menuSel");
        this.activateMenuItem();
      } else if (k === "Escape") {
        this.showTitle();
      }
      return;
    }

    if (this.mode === "options") {
      if (k === "w" || k === "W" || k === "ArrowUp") {
        this.optIdx = (this.optIdx + 2) % 3;
        audio.sfx("menuMove");
        this.showOptions();
      } else if (k === "s" || k === "S" || k === "ArrowDown") {
        this.optIdx = (this.optIdx + 1) % 3;
        audio.sfx("menuMove");
        this.showOptions();
      } else if (k === "a" || k === "A" || k === "ArrowLeft" || k === "d" || k === "D" || k === "ArrowRight") {
        const delta = k === "a" || k === "A" || k === "ArrowLeft" ? -1 : 1;
        if (this.optIdx === 0) this.settings.speed = clampSetting(this.settings.speed + delta);
        if (this.optIdx === 1) this.settings.tough = clampSetting(this.settings.tough + delta);
        saveSettings(this.settings);
        audio.sfx("menuMove");
        this.showOptions();
      } else if (k === " " || k === "Enter" || k === "Escape") {
        audio.sfx("menuSel");
        this.showMenu();
      }
      return;
    }

    if (this.mode === "scores") {
      if (k === " " || k === "Enter" || k === "Escape") {
        audio.sfx("menuSel");
        this.showMenu();
      }
      return;
    }

    if (this.mode === "code") {
      if (this.unlocked) return; // transition pending
      if (/^[a-zA-Z]$/.test(k)) {
        this.addCodeChar(k);
      } else if (k === "Backspace") {
        this.delCodeChar();
      } else if (k === "Escape") {
        audio.sfx("menuSel");
        this.showMenu();
      }
      return;
    }
  }

  private activateMenuItem(): void {
    switch (this.menuIdx) {
      case 0:
        this.startGame(1);
        break;
      case 1:
        this.showCode();
        break;
      case 2:
        this.optIdx = 0;
        this.showOptions();
        break;
      case 3:
        this.showScores();
        break;
    }
  }

  private startGame(level: number): void {
    audio.stop();
    this.scene.start("Cutscene", { kind: "world", run: newRun(level) });
  }
}
