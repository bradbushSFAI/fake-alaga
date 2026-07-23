import Phaser from "phaser";
import { W, H, txtStyle } from "../const";
import { audio } from "../audio";
import { Starfield } from "../starfield";
import {
  RunState,
  Settings,
  loadSettings,
  scoreMult,
  speedFactor,
  scaleHp,
  highScore,
} from "../state";
import { LEVELS, WORLDS, ETYPES, BOSSES, worldOf, FINAL_LEVEL, LevelDef } from "../levels";
import { TouchControls, isTouchDevice } from "../touch";

const PLAYER_SPEED = 290;
const BULLET_SPEED = 560;

type EnemyState = "wait" | "enter" | "join" | "form" | "dive" | "beam" | "exit";

interface Enemy extends Phaser.Physics.Arcade.Sprite {
  tchar: string;
  hp: number;
  shieldHp: number;
  slotX: number;
  slotY: number;
  est: EnemyState;
  path?: Phaser.Curves.Path;
  pathT: number;
  pathLen: number;
  fireAcc: number;
  animAcc: number;
  animFrame: number;
  hasCaptured: boolean;
  captureIcon?: Phaser.GameObjects.Image;
  beamImg?: Phaser.GameObjects.Image;
  beamAcc: number;
  burstDone: boolean;
  mineAcc: number;
  bonusTrain: boolean;
}

interface BossState {
  spr: Phaser.Physics.Arcade.Sprite;
  key: string;
  name: string;
  hp: number;
  maxHp: number;
  score: number;
  t: number;
  attackAcc: number;
  attack2Acc: number;
  spawnAcc: number;
  angle: number;
  open: boolean;
  openAcc: number;
  phase: number;
  escortsSpawned: boolean;
  orbs: Phaser.Physics.Arcade.Sprite[];
  beamTelegraph?: Phaser.GameObjects.Rectangle;
  beamImg?: Phaser.GameObjects.Image;
  beamAcc: number;
  beamX: number;
  beaming: boolean;
}

interface GameData {
  run: RunState;
}

export class GameScene extends Phaser.Scene {
  private run!: RunState;
  private settings!: Settings;
  private mult = 1;
  private spdF = 1;

  private stars!: Starfield;
  private player!: Phaser.Physics.Arcade.Image;
  private dualImg: Phaser.GameObjects.Image | null = null;
  private shieldImg: Phaser.GameObjects.Image | null = null;
  private playerAlive = true;
  private capturing = false;
  private invuln = 0;
  private fireCd = 0;

  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private touch: TouchControls | null = null;

  private pBullets!: Phaser.Physics.Arcade.Group;
  private missiles!: Phaser.Physics.Arcade.Group;
  private eBullets!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private powerups!: Phaser.Physics.Arcade.Group;
  private mines!: Phaser.Physics.Arcade.Group;
  private droneShips: Phaser.Physics.Arcade.Image[] = [];
  private supplyShip: Phaser.Physics.Arcade.Image | null = null;

  private ldef!: LevelDef;
  private spawnedAll = false;
  private levelEnding = false;
  private paused = false;
  private pauseOverlay: Phaser.GameObjects.GameObject[] = [];

  private formT = 0;
  private diveAcc = 0;
  private formFireAcc = 0;
  private droneFireAcc = 0;

  private bonusActive = false;
  private bonusKills = 0;
  private bonusTotal = 0;
  private bonusTallied = false;

  private boss: BossState | null = null;

  private nextLifeAt = 30000;

  private hudScore!: Phaser.GameObjects.Text;
  private hudHi!: Phaser.GameObjects.Text;
  private hudLevel!: Phaser.GameObjects.Text;
  private hudWeapon!: Phaser.GameObjects.Text;
  private hudLives: Phaser.GameObjects.Image[] = [];
  private hudBossBar: Phaser.GameObjects.Rectangle | null = null;
  private hudBossBarBg: Phaser.GameObjects.Rectangle | null = null;
  private hudBonus: Phaser.GameObjects.Text | null = null;

  constructor() {
    super("Game");
  }

  // ------------------------------------------------------------------ create
  create(data: GameData): void {
    this.run = data.run;
    this.settings = loadSettings();
    this.mult = scoreMult(this.settings);
    this.spdF = speedFactor(this.settings);
    this.ldef = LEVELS[this.run.level - 1];

    this.playerAlive = true;
    this.capturing = false;
    this.invuln = 0;
    this.spawnedAll = false;
    this.levelEnding = false;
    this.paused = false;
    this.boss = null;
    this.bonusActive = !!this.ldef.bonus;
    this.bonusKills = 0;
    this.bonusTotal = 0;
    this.bonusTallied = false;
    this.diveAcc = 0;
    this.formFireAcc = 0;
    this.droneShips = [];
    this.supplyShip = null;
    this.dualImg = null;
    this.shieldImg = null;
    this.hudLives = [];
    this.hudBossBar = null;
    this.hudBossBarBg = null;
    this.hudBonus = null;
    this.pauseOverlay = [];

    const world = WORLDS[worldOf(this.run.level)];
    this.stars = new Starfield(this, world.starTint, world.bg);

    // groups
    this.pBullets = this.physics.add.group();
    this.missiles = this.physics.add.group();
    this.eBullets = this.physics.add.group();
    this.enemies = this.physics.add.group();
    this.powerups = this.physics.add.group();
    this.mines = this.physics.add.group();

    // player
    this.player = this.physics.add.image(W / 2, H - 80, "player");
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    (this.player.body as Phaser.Physics.Arcade.Body).setSize(24, 28);
    this.applyLoadout();

    // input
    this.keys = this.input.keyboard!.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,P,ESC,Q,M") as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;
    this.input.keyboard!.on("keydown-P", () => this.togglePause());
    this.input.keyboard!.on("keydown-ESC", () => this.togglePause());
    this.input.keyboard!.on("keydown-M", () => audio.toggleMute());
    this.input.once("pointerdown", () => audio.unlock());
    this.touch = isTouchDevice() ? new TouchControls(this, () => this.togglePause()) : null;

    // overlaps
    this.physics.add.overlap(this.pBullets, this.enemies, (b, e) =>
      this.hitEnemy(b as Phaser.Physics.Arcade.Image, e as Enemy, 1)
    );
    this.physics.add.overlap(this.missiles, this.enemies, (m, e) =>
      this.hitEnemy(m as Phaser.Physics.Arcade.Image, e as Enemy, 2)
    );
    this.physics.add.overlap(this.eBullets, this.player, (_p, b) =>
      this.playerHit(b as Phaser.Physics.Arcade.Image)
    );
    this.physics.add.overlap(this.enemies, this.player, (_p, e) => this.playerRam(e as Enemy));
    this.physics.add.overlap(this.mines, this.player, (_p, m) =>
      this.playerHit(m as Phaser.Physics.Arcade.Image)
    );
    this.physics.add.overlap(this.powerups, this.player, (_p, pu) =>
      this.collectPowerup(pu as Phaser.Physics.Arcade.Image)
    );

    // HUD
    this.buildHUD();

    // scanline overlay
    this.add.tileSprite(W / 2, H / 2, W, H, "scanline").setDepth(200).setAlpha(0.6);

    // music + banner + wave
    audio.play(this.ldef.boss ? "boss" : world.music);
    this.levelBanner();

    if (this.ldef.boss) {
      this.time.delayedCall(1600, () => this.spawnBoss());
    } else if (this.bonusActive) {
      this.time.delayedCall(1400, () => this.startBonus());
    } else {
      this.time.delayedCall(900, () => this.spawnWave());
    }

    if (this.ldef.supply) {
      this.time.delayedCall(9000, () => this.spawnSupply());
    }
  }

  private applyLoadout(): void {
    if (this.run.dual) this.attachDual();
    if (this.run.shield > 0) this.attachShield();
    for (let i = 0; i < this.run.drones; i++) this.spawnDrone(false);
  }

  private buildHUD(): void {
    const style13 = txtStyle(13, "#8888aa");
    this.add.text(14, 8, "SCORE", style13).setDepth(150);
    this.hudScore = this.add.text(14, 24, "0000000", txtStyle(18, "#ffffff")).setDepth(150);
    this.add.text(W - 14, 8, "HI-SCORE", style13).setOrigin(1, 0).setDepth(150);
    this.hudHi = this.add
      .text(W - 14, 24, Math.max(highScore(), this.run.score).toString().padStart(7, "0"), txtStyle(18, "#ffe040"))
      .setOrigin(1, 0)
      .setDepth(150);
    this.add
      .text(W / 2, 8, `×${this.mult.toFixed(2)}`, txtStyle(13, "#40e0ff"))
      .setOrigin(0.5, 0)
      .setDepth(150);

    const world = WORLDS[worldOf(this.run.level)];
    this.hudLevel = this.add
      .text(W - 14, H - 26, `W${worldOf(this.run.level) + 1} · LVL ${this.run.level}`, txtStyle(13, "#8888aa"))
      .setOrigin(1, 0)
      .setDepth(150);
    this.hudWeapon = this.add
      .text(W / 2, H - 26, "", txtStyle(13, "#40e0ff"))
      .setOrigin(0.5, 0)
      .setDepth(150);
    this.updateHUD();
    void world;
  }

  private updateHUD(): void {
    this.hudScore.setText(this.run.score.toString().padStart(7, "0"));
    this.hudHi.setText(Math.max(highScore(), this.run.score).toString().padStart(7, "0"));
    const wnames: Record<string, string> = {
      single: "CANNON",
      rapid: "RAPID",
      spread: "MULTI",
      frontback: "FRONT+BACK",
      missile: "MISSILES",
    };
    this.hudWeapon.setText(
      `${wnames[this.run.weapon] ?? this.run.weapon}${this.run.dual ? " ·DUAL" : ""}${this.run.shield ? " ·SHLD" : ""}`
    );
    this.hudLives.forEach((i) => i.destroy());
    this.hudLives = [];
    for (let i = 0; i < Math.min(this.run.lives - 1, 6); i++) {
      this.hudLives.push(
        this.add
          .image(24 + i * 26, H - 20, "player")
          .setScale(0.55)
          .setDepth(150)
      );
    }
  }

  private levelBanner(): void {
    const world = WORLDS[worldOf(this.run.level)];
    const t1 = this.add
      .text(W / 2, H / 2 - 60, world.name, txtStyle(22, "#40e0ff"))
      .setOrigin(0.5)
      .setDepth(160);
    const label = this.ldef.boss
      ? `⚠ ${BOSSES[this.ldef.boss].name} ⚠`
      : this.ldef.bonus
        ? "BONUS STAGE"
        : `LEVEL ${this.run.level}`;
    const t2 = this.add
      .text(W / 2, H / 2 - 20, label, txtStyle(34, this.ldef.boss ? "#ff5050" : "#ffe040"))
      .setOrigin(0.5)
      .setDepth(160);
    if (this.ldef.boss) audio.sfx("warning");
    this.tweens.add({
      targets: [t1, t2],
      alpha: 0,
      delay: 1600,
      duration: 500,
      onComplete: () => {
        t1.destroy();
        t2.destroy();
      },
    });
  }

  private banner(msg: string, color = "#ffe040", y = H / 2 - 40): void {
    const t = this.add.text(W / 2, y, msg, txtStyle(26, color)).setOrigin(0.5).setDepth(160);
    this.tweens.add({
      targets: t,
      alpha: 0,
      delay: 1300,
      duration: 400,
      onComplete: () => t.destroy(),
    });
  }

  // ------------------------------------------------------------- wave spawn
  private makeEnemy(tchar: string, x: number, y: number): Enemy {
    const tdef = ETYPES[tchar];
    const e = this.physics.add.sprite(x, y, `${tdef.tex}0`) as Enemy;
    e.tchar = tchar;
    e.hp = scaleHp(tdef.hp, this.settings);
    e.shieldHp = tdef.special === "shield" ? 2 : 0;
    e.est = "wait";
    e.pathT = 0;
    e.pathLen = 1;
    e.fireAcc = Phaser.Math.Between(0, 1500);
    e.animAcc = 0;
    e.animFrame = 0;
    e.hasCaptured = false;
    e.beamAcc = 0;
    e.burstDone = false;
    e.mineAcc = 0;
    e.bonusTrain = false;
    e.slotX = x;
    e.slotY = y;
    this.enemies.add(e);
    (e.body as Phaser.Physics.Arcade.Body).setSize(e.width * 0.8, e.height * 0.8);
    return e;
  }

  private entryPath(variant: number, slotX: number): Phaser.Curves.Path {
    // Swooping Galaga-style entry curves ending near the formation area.
    const p = new Phaser.Curves.Path(0, 0);
    switch (variant % 4) {
      case 0:
        p.startPoint.set(-60, 240);
        p.cubicBezierTo(470, 320, 160, 660, 540, 620);
        p.cubicBezierTo(slotX, 200, 420, 120, slotX + 60, 140);
        break;
      case 1:
        p.startPoint.set(W + 60, 240);
        p.cubicBezierTo(70, 320, 380, 660, 0, 620);
        p.cubicBezierTo(slotX, 200, 120, 120, slotX - 60, 140);
        break;
      case 2:
        p.startPoint.set(140, -50);
        p.cubicBezierTo(420, 470, 140, 240, 460, 380);
        p.cubicBezierTo(slotX, 210, 300, 560, slotX - 40, 260);
        break;
      default:
        p.startPoint.set(W - 140, -50);
        p.cubicBezierTo(120, 470, W - 140, 240, 80, 380);
        p.cubicBezierTo(slotX, 210, 240, 560, slotX + 40, 260);
        break;
    }
    return p;
  }

  private spawnWave(): void {
    const rows = this.ldef.formation ?? [];
    const all: { tchar: string; slotX: number; slotY: number }[] = [];
    rows.forEach((row, r) => {
      [...row].forEach((ch, c) => {
        if (ch === "." || ch === " ") return;
        const slotX = W / 2 + (c - (row.length - 1) / 2) * 44;
        const slotY = 104 + r * 48;
        all.push({ tchar: ch, slotX, slotY });
      });
    });

    let groupIdx = 0;
    for (let i = 0; i < all.length; i += 8) {
      const group = all.slice(i, i + 8);
      const variant = groupIdx;
      this.time.delayedCall(groupIdx * 1100, () => {
        group.forEach((g, j) => {
          this.time.delayedCall(j * 140, () => {
            if (this.levelEnding) return;
            const e = this.makeEnemy(g.tchar, -100, -100);
            e.slotX = g.slotX;
            e.slotY = g.slotY;
            e.path = this.entryPath(variant + (g.tchar === "w" ? 2 : 0), g.slotX);
            e.pathLen = e.path.getLength();
            e.pathT = 0;
            e.est = "enter";
            const start = e.path.getPoint(0);
            e.setPosition(start.x, start.y);
          });
        });
      });
      groupIdx++;
    }
    const totalDelay = groupIdx * 1100 + 8 * 140 + 100;
    this.time.delayedCall(totalDelay, () => (this.spawnedAll = true));
  }

  // ------------------------------------------------------------- bonus stage
  private startBonus(): void {
    this.bonusActive = true;
    const trains = 3;
    const perTrain = 8;
    this.bonusTotal = trains * perTrain;
    this.hudBonus = this.add
      .text(W / 2, 60, `HITS 0/${this.bonusTotal}`, txtStyle(16, "#30e060"))
      .setOrigin(0.5)
      .setDepth(150);
    for (let t = 0; t < trains; t++) {
      this.time.delayedCall(t * 3000, () => {
        if (this.levelEnding) return;
        for (let j = 0; j < perTrain; j++) {
          this.time.delayedCall(j * 220, () => {
            if (this.levelEnding) return;
            const e = this.makeEnemy("d", -100, -100);
            e.bonusTrain = true;
            e.path = this.entryPath(t, W / 2 + (t - 1) * 100);
            // extend the exit so the train leaves the screen
            e.path.cubicBezierTo(W / 2 + (t - 1) * 120, H + 80, W / 2, 400, W / 2 + (t - 1) * 60, H + 80);
            e.pathLen = e.path.getLength();
            e.est = "enter";
            const start = e.path.getPoint(0);
            e.setPosition(start.x, start.y);
          });
        }
      });
    }
    this.time.delayedCall(trains * 3000 + perTrain * 220 + 200, () => (this.spawnedAll = true));
  }

  // ------------------------------------------------------------- supply ship
  private spawnSupply(): void {
    if (this.levelEnding) return;
    this.supplyShip = this.physics.add.image(-60, H - 220, "supply");
    this.supplyShip.setDepth(5);
    this.supplyShip.setVelocityX(80);
    audio.sfx("bonus");
    const label = this.add
      .text(W / 2, H - 260, "SUPPLY SHIP — DOCK FOR UPGRADES", txtStyle(12, "#30e060"))
      .setOrigin(0.5)
      .setDepth(150);
    this.tweens.add({ targets: label, alpha: 0, delay: 2500, duration: 500, onComplete: () => label.destroy() });
    this.physics.add.overlap(this.supplyShip, this.player, () => this.dock());
  }

  private dock(): void {
    if (!this.supplyShip) return;
    const s = this.supplyShip;
    this.supplyShip = null;
    audio.sfx("dock");
    this.run.shield = 1;
    this.attachShield();
    const weapons = ["rapid", "spread", "frontback", "missile"].filter((w) => w !== this.run.weapon);
    this.run.weapon = Phaser.Math.RND.pick(weapons);
    this.addPoints(500);
    this.banner("DOCKED! SYSTEMS UPGRADED", "#30e060");
    this.updateHUD();
    this.tweens.add({
      targets: s,
      y: -80,
      x: s.x + 60,
      duration: 900,
      ease: "Cubic.in",
      onComplete: () => s.destroy(),
    });
  }

  // ------------------------------------------------------------------ bosses
  private spawnBoss(): void {
    const def = BOSSES[this.ldef.boss!];
    const spr = this.physics.add.sprite(W / 2, -120, def.tex);
    spr.setScale(def.scale / 3);
    spr.setDepth(6);
    (spr.body as Phaser.Physics.Arcade.Body).setSize(spr.width * 0.8, spr.height * 0.8);
    this.boss = {
      spr,
      key: def.key,
      name: def.name,
      hp: scaleHp(def.hp, this.settings),
      maxHp: scaleHp(def.hp, this.settings),
      score: def.score,
      t: 0,
      attackAcc: 0,
      attack2Acc: 0,
      spawnAcc: 0,
      angle: 0,
      open: true,
      openAcc: 0,
      phase: 1,
      escortsSpawned: false,
      orbs: [],
      beamAcc: 0,
      beamX: 0,
      beaming: false,
    };
    this.spawnedAll = true;
    this.tweens.add({ targets: spr, y: 160, duration: 1400, ease: "Cubic.out" });

    this.hudBossBarBg = this.add.rectangle(W / 2, 74, 360, 12, 0x331111).setDepth(150);
    this.hudBossBar = this.add.rectangle(W / 2 - 180, 74, 360, 8, 0xff4040).setOrigin(0, 0.5).setDepth(151);
    this.add.text(W / 2, 56, def.name, txtStyle(13, "#ff8080")).setOrigin(0.5).setDepth(150);

    this.physics.add.overlap(this.pBullets, spr, (_s, b) => this.hitBoss(b as Phaser.Physics.Arcade.Image, 1));
    this.physics.add.overlap(this.missiles, spr, (_s, m) => this.hitBoss(m as Phaser.Physics.Arcade.Image, 2));
    this.physics.add.overlap(spr, this.player, () => this.playerHit(null));

    if (def.key === "gate") this.spawnOrbs();
  }

  private spawnOrbs(): void {
    if (!this.boss) return;
    for (let i = 0; i < 3; i++) {
      const orb = this.physics.add.sprite(this.boss.spr.x, this.boss.spr.y, "eorb");
      orb.setScale(2).setDepth(6);
      orb.setData("hp", 3);
      orb.setData("orbIdx", i);
      this.boss.orbs.push(orb);
      this.physics.add.overlap(this.pBullets, orb, (_o, b) => {
        const img = b as Phaser.Physics.Arcade.Image;
        if (!img.active || !orb.active) return;
        img.destroy();
        orb.setData("hp", orb.getData("hp") - 1);
        audio.sfx("hit");
        if (orb.getData("hp") <= 0) {
          this.explode(orb.x, orb.y, false);
          this.radialBurst(orb.x, orb.y, 6, 150);
          orb.destroy();
        }
      });
    }
  }

  private hitBoss(bullet: Phaser.Physics.Arcade.Image, dmg: number): void {
    if (!this.boss || !bullet.active || this.levelEnding) return;
    const b = this.boss;
    if (b.spr.y < 0) return; // still entering
    if (b.key === "ghost" && b.spr.alpha < 0.5) return; // phased out
    bullet.destroy();
    if (b.key === "shell" && !b.open) dmg = Math.random() < 0.25 ? 1 : 0;
    if (dmg <= 0) {
      audio.sfx("hit");
      return;
    }
    b.hp -= dmg;
    audio.sfx("bosshit");
    b.spr.setTintFill(0xffffff);
    this.time.delayedCall(40, () => b.spr.clearTint());
    if (this.hudBossBar) this.hudBossBar.width = Math.max(0, (b.hp / b.maxHp) * 360);
    if (b.hp <= 0) this.killBoss();
  }

  private killBoss(): void {
    if (!this.boss) return;
    const b = this.boss;
    this.boss = null;
    b.orbs.forEach((o) => o.active && o.destroy());
    if (b.beamImg) b.beamImg.destroy();
    if (b.beamTelegraph) b.beamTelegraph.destroy();
    this.addPoints(b.score);
    audio.sfx("boomBig");
    // chain of explosions
    for (let i = 0; i < 10; i++) {
      this.time.delayedCall(i * 120, () => {
        this.explode(
          b.spr.x + Phaser.Math.Between(-50, 50),
          b.spr.y + Phaser.Math.Between(-40, 40),
          i % 3 === 0
        );
      });
    }
    this.time.delayedCall(1300, () => {
      b.spr.destroy();
      this.clearEnemyProjectiles();
    });
  }

  // ------------------------------------------------------------- projectiles
  private fireEnemyShot(x: number, y: number, kind: "straight" | "aim" | "orb", speed = 170): void {
    if (this.levelEnding || !this.playerAlive) return;
    const tex = kind === "orb" ? "eorb" : "eshot";
    const s = this.eBullets.create(x, y, tex) as Phaser.Physics.Arcade.Image;
    s.setDepth(4);
    const v = speed * this.spdF;
    if (kind === "aim") {
      const dx = this.player.x - x;
      const dy = this.player.y - y;
      const len = Math.max(1, Math.hypot(dx, dy));
      s.setVelocity((dx / len) * v, (dy / len) * v);
    } else {
      s.setVelocity(0, v);
    }
  }

  private radialBurst(x: number, y: number, count: number, speed = 140, angleOffset = 0): void {
    for (let i = 0; i < count; i++) {
      const a = angleOffset + (Math.PI * 2 * i) / count;
      const s = this.eBullets.create(x, y, "eorb") as Phaser.Physics.Arcade.Image;
      s.setDepth(4);
      s.setVelocity(Math.cos(a) * speed * this.spdF, Math.sin(a) * speed * this.spdF);
    }
  }

  private dropMine(x: number, y: number): void {
    const m = this.mines.create(x, y, "mine") as Phaser.Physics.Arcade.Image;
    m.setDepth(4);
    m.setVelocityY(60 * this.spdF);
    audio.sfx("mine");
    this.time.delayedCall(2600, () => {
      if (!m.active) return;
      this.explode(m.x, m.y, false);
      this.radialBurst(m.x, m.y, 4, 130, Math.PI / 4);
      m.destroy();
    });
  }

  // ------------------------------------------------------------- enemy logic
  private hitEnemy(bullet: Phaser.Physics.Arcade.Image, e: Enemy, dmg: number): void {
    if (!bullet.active || !e.active || e.est === "wait") return;
    bullet.destroy();
    if (e.shieldHp > 0) {
      e.shieldHp--;
      audio.sfx("hit");
      e.setTintFill(0xa0f0ff);
      this.time.delayedCall(50, () => e.active && e.clearTint());
      return;
    }
    e.hp -= dmg;
    if (e.hp > 0) {
      audio.sfx("hit");
      e.setTintFill(0xffffff);
      this.time.delayedCall(40, () => e.active && e.clearTint());
      return;
    }
    this.killEnemy(e, true);
  }

  private killEnemy(e: Enemy, scored: boolean): void {
    const tdef = ETYPES[e.tchar];
    if (scored) {
      const diving = e.est === "dive" || e.est === "beam";
      this.addPoints(Math.round(tdef.score * (diving ? 2 : 1)));
      if (e.bonusTrain) {
        this.bonusKills++;
        audio.sfx("bonus");
        if (this.hudBonus) this.hudBonus.setText(`HITS ${this.bonusKills}/${this.bonusTotal}`);
      }
    }
    this.explode(e.x, e.y, e.tchar === "w");
    audio.sfx(e.tchar === "w" ? "boomBig" : "boom");

    // rescue: killing a warden that holds your ship frees it
    if (e.hasCaptured) {
      this.rescueShip(e.x, e.y);
    }
    if (e.captureIcon) e.captureIcon.destroy();
    if (e.beamImg) e.beamImg.destroy();

    // splitter breaks into two minis that dive away
    if (tdef.special === "split" && !e.bonusTrain) {
      for (const side of [-1, 1]) {
        const mini = this.makeEnemy("m", e.x + side * 14, e.y);
        const p = new Phaser.Curves.Path(mini.x, mini.y);
        p.cubicBezierTo(mini.x + side * 130, H + 60, mini.x + side * 160, e.y + 120, mini.x + side * 40, H - 200);
        mini.path = p;
        mini.pathLen = p.getLength();
        mini.est = "dive";
        mini.bonusTrain = true; // exits without needing to be killed
      }
    }

    // power-up drops
    if (scored && !e.bonusTrain && Math.random() < (e.tchar === "w" ? 0.5 : 0.11)) {
      this.dropPowerup(e.x, e.y);
    }

    e.destroy();
  }

  private dropPowerup(x: number, y: number): void {
    const roll = Math.random();
    let kind: string;
    if (roll < 0.17) kind = "M";
    else if (roll < 0.34) kind = "R";
    else if (roll < 0.48) kind = "B";
    else if (roll < 0.62) kind = "T";
    else if (roll < 0.78) kind = "S";
    else if (roll < 0.93) kind = "D";
    else kind = "L";
    const pu = this.powerups.create(x, y, `pu_${kind}`) as Phaser.Physics.Arcade.Image;
    pu.setData("kind", kind);
    pu.setDepth(5);
    pu.setVelocityY(90);
    this.tweens.add({ targets: pu, angle: 360, duration: 1500, repeat: -1 });
  }

  private collectPowerup(pu: Phaser.Physics.Arcade.Image): void {
    if (!pu.active || !this.playerAlive) return;
    const kind = pu.getData("kind") as string;
    pu.destroy();
    switch (kind) {
      case "M":
        this.run.weapon = "spread";
        audio.sfx("powerup");
        this.banner("MULTI-SHOT!", "#40a0ff", H / 2 + 80);
        break;
      case "R":
        this.run.weapon = "rapid";
        audio.sfx("powerup");
        this.banner("RAPID FIRE!", "#ffe040", H / 2 + 80);
        break;
      case "B":
        this.run.weapon = "frontback";
        audio.sfx("powerup");
        this.banner("FRONT + BACK!", "#ff9020", H / 2 + 80);
        break;
      case "T":
        this.run.weapon = "missile";
        audio.sfx("powerup");
        this.banner("TARGETING MISSILES!", "#ff40a0", H / 2 + 80);
        break;
      case "S":
        this.run.shield = 1;
        this.attachShield();
        audio.sfx("shield");
        this.banner("SHIELD UP!", "#40e0ff", H / 2 + 80);
        break;
      case "D":
        if (this.run.drones < 2) {
          this.run.drones++;
          this.spawnDrone(true);
          this.banner("WINGMAN DEPLOYED!", "#30c8e0", H / 2 + 80);
        } else {
          this.addPoints(1000);
        }
        audio.sfx("powerup");
        break;
      case "L":
        if (this.run.lives < 7) this.run.lives++;
        audio.sfx("extraLife");
        this.banner("EXTRA SHIP!", "#30e060", H / 2 + 80);
        break;
    }
    this.updateHUD();
  }

  private attachShield(): void {
    if (!this.shieldImg) {
      this.shieldImg = this.add.image(this.player.x, this.player.y, "shieldring").setDepth(9).setAlpha(0.8);
    }
  }

  private attachDual(): void {
    if (!this.dualImg) {
      this.dualImg = this.add.image(this.player.x + 30, this.player.y, "player2").setDepth(10);
    }
  }

  private spawnDrone(announce: boolean): void {
    const idx = this.droneShips.length;
    const d = this.physics.add.image(this.player.x + (idx === 0 ? -44 : 44), this.player.y + 16, "drone");
    d.setDepth(9);
    this.droneShips.push(d);
    this.physics.add.overlap(this.eBullets, d, (_d, b) => {
      const img = b as Phaser.Physics.Arcade.Image;
      if (!img.active || !d.active) return;
      img.destroy();
      this.explode(d.x, d.y, false);
      audio.sfx("boom");
      this.droneShips = this.droneShips.filter((x) => x !== d);
      this.run.drones = this.droneShips.length;
      d.destroy();
      this.updateHUD();
    });
    if (announce) audio.sfx("powerup");
  }

  private rescueShip(x: number, y: number): void {
    audio.sfx("rescue");
    if (this.run.dual) {
      this.addPoints(2000);
      return;
    }
    const freed = this.add.image(x, y, "player2").setDepth(11);
    this.tweens.add({
      targets: freed,
      x: this.player.x + 30,
      y: this.player.y,
      duration: 900,
      ease: "Cubic.inOut",
      onComplete: () => {
        freed.destroy();
        this.run.dual = true;
        this.attachDual();
        this.banner("FIGHTER RESCUED — DUAL SHIP!", "#30e060");
        this.updateHUD();
      },
    });
  }

  // ------------------------------------------------------------ player logic
  private playerHit(bullet: Phaser.Physics.Arcade.Image | null): void {
    if (bullet && !bullet.active) return;
    if (bullet) bullet.destroy();
    if (!this.playerAlive || this.invuln > 0 || this.capturing || this.levelEnding) return;

    if (this.run.shield > 0) {
      this.run.shield = 0;
      if (this.shieldImg) {
        this.shieldImg.destroy();
        this.shieldImg = null;
      }
      audio.sfx("shield");
      this.invuln = 800;
      this.updateHUD();
      return;
    }
    if (this.run.dual) {
      this.run.dual = false;
      if (this.dualImg) {
        this.explode(this.dualImg.x, this.dualImg.y, false);
        this.dualImg.destroy();
        this.dualImg = null;
      }
      audio.sfx("boom");
      this.invuln = 1200;
      this.updateHUD();
      return;
    }
    this.killPlayer();
  }

  private playerRam(e: Enemy): void {
    if (!e.active || e.est === "wait" || e.est === "form") {
      // formation enemies are high above the player; only divers can ram
      if (e.est !== "form") return;
    }
    if (!this.playerAlive || this.invuln > 0 || this.capturing) return;
    this.killEnemy(e, true);
    this.playerHit(null);
  }

  private killPlayer(): void {
    if (!this.playerAlive) return;
    this.playerAlive = false;
    audio.sfx("playerDie");
    this.explode(this.player.x, this.player.y, true);
    this.player.setVisible(false);
    (this.player.body as Phaser.Physics.Arcade.Body).enable = false;
    // dying costs your upgrades — classic arcade rules
    this.run.weapon = "single";
    this.run.dual = false;
    if (this.dualImg) {
      this.dualImg.destroy();
      this.dualImg = null;
    }
    this.droneShips.forEach((d) => {
      this.explode(d.x, d.y, false);
      d.destroy();
    });
    this.droneShips = [];
    this.run.drones = 0;
    this.run.lives--;
    this.updateHUD();

    if (this.run.lives <= 0) {
      this.time.delayedCall(1600, () => {
        audio.stop();
        this.scene.start("GameOver", { score: this.run.score, level: this.run.level, won: false });
      });
      return;
    }
    this.time.delayedCall(1500, () => this.respawn());
  }

  private respawn(): void {
    this.player.setPosition(W / 2, H - 80);
    this.player.setVisible(true);
    (this.player.body as Phaser.Physics.Arcade.Body).enable = true;
    this.playerAlive = true;
    this.invuln = 2200;
    this.updateHUD();
  }

  // capture sequence (warden tractor beam)
  private captureShip(warden: Enemy): void {
    if (this.capturing || !this.playerAlive || this.invuln > 0) return;
    if (this.run.shield > 0) {
      // shield breaks the beam
      this.run.shield = 0;
      if (this.shieldImg) {
        this.shieldImg.destroy();
        this.shieldImg = null;
      }
      audio.sfx("shield");
      this.invuln = 1000;
      this.updateHUD();
      return;
    }
    this.capturing = true;
    audio.sfx("capture");
    this.banner("SHIP CAPTURED!", "#ff5050");
    (this.player.body as Phaser.Physics.Arcade.Body).enable = false;
    this.tweens.add({
      targets: this.player,
      x: warden.x,
      y: warden.y - 20,
      scale: 0.6,
      angle: 360,
      duration: 1100,
      ease: "Cubic.in",
      onComplete: () => {
        this.player.setVisible(false);
        this.player.setScale(1).setAngle(0);
        warden.hasCaptured = true;
        if (warden.active) {
          warden.captureIcon = this.add.image(warden.x, warden.y - 26, "player2").setScale(0.7).setDepth(7);
        }
        this.run.lives--;
        this.run.weapon = "single";
        this.run.dual = false;
        if (this.dualImg) {
          this.dualImg.destroy();
          this.dualImg = null;
        }
        this.updateHUD();
        this.capturing = false;
        this.playerAlive = false;
        if (this.run.lives <= 0) {
          this.time.delayedCall(1400, () => {
            audio.stop();
            this.scene.start("GameOver", { score: this.run.score, level: this.run.level, won: false });
          });
        } else {
          this.time.delayedCall(1300, () => this.respawn());
        }
      },
    });
  }

  // ---------------------------------------------------------------- scoring
  private addPoints(base: number): void {
    this.run.score += Math.round(base * this.mult);
    if (this.run.score >= this.nextLifeAt) {
      this.nextLifeAt += 70000;
      if (this.run.lives < 7) {
        this.run.lives++;
        audio.sfx("extraLife");
        this.banner("EXTRA SHIP!", "#30e060", H / 2 + 110);
      }
    }
    this.updateHUD();
  }

  private explode(x: number, y: number, big: boolean): void {
    const boom = this.add.sprite(x, y, "boom0").setDepth(20);
    if (big) boom.setScale(2);
    this.time.delayedCall(80, () => boom.active && boom.setTexture("boom1"));
    this.time.delayedCall(160, () => boom.active && boom.setTexture("boom2"));
    this.time.delayedCall(260, () => boom.destroy());
  }

  private clearEnemyProjectiles(): void {
    this.eBullets.getChildren().forEach((b) => (b as Phaser.Physics.Arcade.Image).destroy());
    this.mines.getChildren().forEach((m) => (m as Phaser.Physics.Arcade.Image).destroy());
  }

  // ------------------------------------------------------------------ pause
  private togglePause(): void {
    if (this.levelEnding) return;
    this.paused = !this.paused;
    if (this.touch) this.touch.blocked = this.paused;
    if (this.paused) {
      this.physics.pause();
      this.tweens.pauseAll();
      this.time.paused = true;
      const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.6).setDepth(300);
      const t1 = this.add.text(W / 2, H / 2 - 60, "PAUSED", txtStyle(36, "#ffe040")).setOrigin(0.5).setDepth(301);
      const bResume = this.add
        .text(W / 2, H / 2 + 10, "▶ RESUME", txtStyle(20, "#30e060"))
        .setOrigin(0.5)
        .setDepth(301)
        .setPadding(14, 8, 14, 8)
        .setInteractive({ useHandCursor: true });
      bResume.on("pointerdown", () => this.togglePause());
      const bQuit = this.add
        .text(W / 2, H / 2 + 60, "✕ QUIT TO TITLE", txtStyle(16, "#ff8080"))
        .setOrigin(0.5)
        .setDepth(301)
        .setPadding(14, 8, 14, 8)
        .setInteractive({ useHandCursor: true });
      bQuit.on("pointerdown", () => {
        audio.stop();
        this.scene.start("Menu");
      });
      const t2 = this.add
        .text(W / 2, H / 2 + 110, "P — RESUME · Q — QUIT", txtStyle(12, "#8888aa"))
        .setOrigin(0.5)
        .setDepth(301);
      this.pauseOverlay = [dim, t1, bResume, bQuit, t2];
      const quit = () => {
        this.input.keyboard!.off("keydown-Q", quit);
        audio.stop();
        this.scene.start("Menu");
      };
      this.input.keyboard!.on("keydown-Q", quit);
    } else {
      this.physics.resume();
      this.tweens.resumeAll();
      this.time.paused = false;
      this.pauseOverlay.forEach((o) => o.destroy());
      this.pauseOverlay = [];
    }
  }

  // ----------------------------------------------------------------- update
  update(_t: number, dt: number): void {
    if (this.paused) return;
    this.stars.update(dt);
    this.formT += dt;
    if (this.invuln > 0) this.invuln -= dt;

    this.updatePlayer(dt);
    this.updateEnemies(dt);
    this.updateBoss(dt);
    this.updateProjectiles(dt);
    this.updateSupply(dt);
    this.checkLevelEnd();
  }

  private updatePlayer(dt: number): void {
    const p = this.player;
    const body = p.body as Phaser.Physics.Arcade.Body;

    if (this.playerAlive && !this.capturing) {
      if (this.touch?.active) {
        // analog thumbstick: magnitude scales speed
        body.setVelocity(this.touch.vec.x * PLAYER_SPEED, this.touch.vec.y * PLAYER_SPEED);
      } else {
        let vx = 0;
        let vy = 0;
        if (this.keys.A.isDown || this.keys.LEFT.isDown) vx -= 1;
        if (this.keys.D.isDown || this.keys.RIGHT.isDown) vx += 1;
        if (this.keys.W.isDown || this.keys.UP.isDown) vy -= 1;
        if (this.keys.S.isDown || this.keys.DOWN.isDown) vy += 1;
        const len = Math.hypot(vx, vy) || 1;
        body.setVelocity((vx / len) * PLAYER_SPEED, (vy / len) * PLAYER_SPEED);
      }

      // blink while invulnerable
      p.setAlpha(this.invuln > 0 ? (Math.floor(this.formT / 90) % 2 ? 0.25 : 1) : 1);

      // shooting
      this.fireCd -= dt;
      if ((this.keys.SPACE.isDown || this.touch?.firing) && this.fireCd <= 0) {
        this.firePlayer();
      }
    } else {
      body.setVelocity(0, 0);
    }

    // followers
    if (this.dualImg) {
      this.dualImg.setPosition(p.x + 30, p.y);
      this.dualImg.setVisible(p.visible);
      this.dualImg.setAlpha(p.alpha);
    }
    if (this.shieldImg) {
      this.shieldImg.setPosition(p.x, p.y);
      this.shieldImg.setVisible(p.visible);
      this.shieldImg.setAngle(this.shieldImg.angle + dt * 0.1);
    }
    this.droneFireAcc += dt;
    this.droneShips.forEach((d, i) => {
      const tx = p.x + (i === 0 ? -44 : 44);
      const ty = p.y + 16;
      d.x += (tx - d.x) * Math.min(1, dt / 120);
      d.y += (ty - d.y) * Math.min(1, dt / 120);
      if (this.droneFireAcc > 520 && this.playerAlive) {
        const b = this.pBullets.create(d.x, d.y - 12, "pshot") as Phaser.Physics.Arcade.Image;
        b.setVelocityY(-BULLET_SPEED * 0.8);
        b.setDepth(3);
      }
    });
    if (this.droneFireAcc > 520) this.droneFireAcc = 0;
  }

  private firePlayer(): void {
    const shots: { x: number; y: number; vx: number; vy: number; tex?: string }[] = [];
    const px = this.player.x;
    const py = this.player.y - 18;
    const origins = this.run.dual ? [px, px + 30] : [px];

    switch (this.run.weapon) {
      case "rapid":
        origins.forEach((x) => shots.push({ x, y: py, vx: 0, vy: -BULLET_SPEED }));
        this.fireCd = 120;
        break;
      case "spread":
        origins.forEach((x) => {
          shots.push({ x, y: py, vx: 0, vy: -BULLET_SPEED });
          shots.push({ x, y: py, vx: -140, vy: -BULLET_SPEED * 0.92 });
          shots.push({ x, y: py, vx: 140, vy: -BULLET_SPEED * 0.92 });
        });
        this.fireCd = 310;
        break;
      case "frontback":
        origins.forEach((x) => {
          shots.push({ x, y: py, vx: 0, vy: -BULLET_SPEED });
          shots.push({ x, y: py + 36, vx: 0, vy: BULLET_SPEED });
        });
        this.fireCd = 230;
        break;
      case "missile":
        origins.forEach((x) => {
          const m = this.missiles.create(x, py, "pmissile") as Phaser.Physics.Arcade.Image;
          m.setVelocityY(-260);
          m.setDepth(3);
        });
        audio.sfx("missile");
        this.fireCd = 430;
        return;
      default:
        origins.forEach((x) => shots.push({ x, y: py, vx: 0, vy: -BULLET_SPEED }));
        this.fireCd = 220;
        break;
    }
    shots.forEach((s) => {
      const b = this.pBullets.create(s.x, s.y, s.tex ?? "pshot") as Phaser.Physics.Arcade.Image;
      b.setVelocity(s.vx, s.vy);
      b.setDepth(3);
    });
    audio.sfx("shoot");
  }

  private updateEnemies(dt: number): void {
    const d = dt / 1000;
    const swayX = Math.sin(this.formT / 900) * 26;
    const pathSpeed = 260 * this.spdF;

    let formCount = 0;
    let diveCount = 0;
    const list = this.enemies.getChildren() as Enemy[];

    for (const e of list) {
      if (!e.active) continue;
      const tdef = ETYPES[e.tchar];

      // animation
      if (tdef.frames > 1) {
        e.animAcc += dt;
        if (e.animAcc > 380) {
          e.animAcc = 0;
          e.animFrame = 1 - e.animFrame;
          e.setTexture(`${tdef.tex}${e.animFrame}`);
        }
      }

      switch (e.est) {
        case "enter":
        case "dive": {
          if (!e.path) break;
          e.pathT += (pathSpeed * d) / Math.max(1, e.pathLen);
          if (e.pathT >= 1) {
            if (e.bonusTrain) {
              e.destroy();
              break;
            }
            if (e.est === "dive") {
              // reappear above and rejoin formation
              e.setPosition(e.slotX, -40);
              e.est = "join";
              this.tweens.add({
                targets: e,
                x: e.slotX,
                y: e.slotY,
                angle: 0,
                duration: 650,
                ease: "Sine.out",
                onComplete: () => {
                  if (e.active) e.est = "form";
                },
              });
            } else {
              e.est = "join";
              this.tweens.add({
                targets: e,
                x: e.slotX,
                y: e.slotY,
                angle: 0,
                duration: 550,
                ease: "Sine.out",
                onComplete: () => {
                  if (e.active) e.est = "form";
                },
              });
            }
            break;
          }
          const pos = e.path.getPoint(Math.min(1, e.pathT));
          const ahead = e.path.getPoint(Math.min(1, e.pathT + 0.012));
          e.setPosition(pos.x, pos.y);
          e.setAngle(Phaser.Math.RadToDeg(Math.atan2(ahead.y - pos.y, ahead.x - pos.x)) - 90);

          // firing during a dive
          if (e.est === "dive" && !e.bonusTrain) {
            e.fireAcc += dt;
            if (tdef.fire === "spiral" && !e.burstDone && e.pathT > 0.35) {
              e.burstDone = true;
              this.radialBurst(e.x, e.y, 8, 130);
            } else if (tdef.special === "mine") {
              e.mineAcc += dt;
              if (e.mineAcc > 900 && this.mines.countActive() < 5) {
                e.mineAcc = 0;
                this.dropMine(e.x, e.y);
              }
            } else if (tdef.fire !== "none" && tdef.fire !== "spiral" && e.fireAcc > 750) {
              e.fireAcc = 0;
              this.fireEnemyShot(e.x, e.y, tdef.fire === "aim" ? "aim" : "straight");
            }
          }
          if (e.est === "dive") diveCount++;
          break;
        }
        case "beam": {
          // warden hovers, tractor beam on
          e.beamAcc += dt;
          const beamLen = 190;
          if (!e.beamImg) {
            e.beamImg = this.add.image(e.x, e.y + 24 + beamLen / 2, "beam").setDepth(3);
            e.beamImg.setAlpha(0.55);
            audio.sfx("beam");
          }
          const widthPulse = 30 + Math.sin(e.beamAcc / 90) * 16;
          e.beamImg.setPosition(e.x, e.y + 24 + beamLen / 2);
          e.beamImg.setDisplaySize(widthPulse, beamLen);

          // capture check
          if (this.playerAlive && !this.capturing && this.invuln <= 0) {
            const bx = e.x;
            const by = e.y + 24;
            const p = this.player;
            if (Math.abs(p.x - bx) < widthPulse / 2 + 12 && p.y > by && p.y < by + beamLen) {
              if (e.beamImg) {
                e.beamImg.destroy();
                e.beamImg = undefined;
              }
              e.est = "dive";
              this.captureShip(e);
              break;
            }
          }
          if (e.beamAcc > 1700) {
            if (e.beamImg) {
              e.beamImg.destroy();
              e.beamImg = undefined;
            }
            // resume dive out the bottom
            const p2 = new Phaser.Curves.Path(e.x, e.y);
            p2.cubicBezierTo(e.x + Phaser.Math.Between(-80, 80), H + 60, e.x, e.y + 150, e.x, H - 60);
            e.path = p2;
            e.pathLen = p2.getLength();
            e.pathT = 0;
            e.est = "dive";
          }
          break;
        }
        case "form": {
          formCount++;
          e.setPosition(
            e.slotX + swayX,
            e.slotY + Math.sin(this.formT / 600 + e.slotX / 60) * 4
          );
          e.setAngle(0);
          // formation pot-shots
          if (this.ldef.formationFire && this.playerAlive) {
            e.fireAcc += dt;
            const interval =
              (tdef.special === "sniper" ? this.ldef.formationFire * 0.6 : this.ldef.formationFire * 3) /
              this.spdF;
            if (e.fireAcc > interval) {
              e.fireAcc = Phaser.Math.Between(0, 600);
              if (Math.random() < (tdef.special === "sniper" ? 0.8 : 0.25)) {
                this.fireEnemyShot(
                  e.x,
                  e.y + 14,
                  tdef.fire === "aim" ? "aim" : "straight",
                  tdef.special === "sniper" ? 260 : 170
                );
              }
            }
          }
          break;
        }
        default:
          break;
      }

      // update captured-ship icon position
      if (e.captureIcon && e.active) {
        e.captureIcon.setPosition(e.x, e.y - 26);
      }
    }

    // launch dives
    if (!this.bonusActive && !this.boss && formCount > 0 && this.playerAlive && !this.levelEnding) {
      this.diveAcc += dt;
      const interval = this.ldef.diveEvery / this.spdF;
      if (this.diveAcc > interval && diveCount < this.ldef.maxDivers) {
        this.diveAcc = 0;
        const formEnemies = list.filter((e) => e.active && e.est === "form");
        if (formEnemies.length) {
          const e = Phaser.Math.RND.pick(formEnemies);
          this.launchDive(e);
        }
      }
    }
  }

  private launchDive(e: Enemy): void {
    const tdef = ETYPES[e.tchar];
    const side = e.x < W / 2 ? 1 : -1;
    if (tdef.special === "capture" && !e.hasCaptured && this.playerAlive && Math.random() < 0.65) {
      // beam dive: descend to a hover point above the player's column
      const hoverX = Phaser.Math.Clamp(this.player.x, 70, W - 70);
      const hoverY = Phaser.Math.Clamp(this.player.y - 240, 260, H - 300);
      const p = new Phaser.Curves.Path(e.x, e.y);
      p.cubicBezierTo(hoverX, hoverY, e.x + side * 140, e.y + 120, hoverX - side * 60, hoverY - 60);
      e.path = p;
      e.pathLen = p.getLength();
      e.pathT = 0;
      e.est = "dive";
      // when the dive path completes we intercept: switch to beam instead of rejoin
      this.time.delayedCall((e.pathLen / (260 * this.spdF)) * 1000 + 60, () => {
        if (e.active && e.est === "dive") {
          e.est = "beam";
          e.beamAcc = 0;
          e.setAngle(0);
        }
      });
      return;
    }
    const px = Phaser.Math.Clamp(this.player.x + Phaser.Math.Between(-60, 60), 40, W - 40);
    const p = new Phaser.Curves.Path(e.x, e.y);
    p.cubicBezierTo(px, H - 200, e.x + side * 150, e.y + 160, px - side * 120, H - 340);
    p.cubicBezierTo(e.x + side * 80, H + 70, px + side * 60, H - 80, e.x, H + 70);
    e.path = p;
    e.pathLen = p.getLength();
    e.pathT = 0;
    e.est = "dive";
    e.burstDone = false;
  }

  // ------------------------------------------------------------ boss update
  private updateBoss(dt: number): void {
    if (!this.boss) return;
    const b = this.boss;
    const spr = b.spr;
    if (!spr.active) return;
    b.t += dt;
    const d = dt / 1000;

    // movement
    const speedScale = b.key === "queen" && b.phase === 3 ? 1.6 : 1;
    spr.x = W / 2 + Math.sin((b.t / 1900) * this.spdF * speedScale) * 170;
    if (spr.y >= 100) spr.y = 160 + Math.sin(b.t / 2100) * 26;

    // phase bookkeeping
    const frac = b.hp / b.maxHp;
    if (b.key === "queen") {
      b.phase = frac > 0.66 ? 1 : frac > 0.33 ? 2 : 3;
    }

    b.attackAcc += dt;
    b.attack2Acc += dt;
    b.spawnAcc += dt;

    switch (b.key) {
      case "vex": {
        if (b.attackAcc > 1700 / this.spdF) {
          b.attackAcc = 0;
          for (let i = -2; i <= 2; i++) {
            const s = this.eBullets.create(spr.x + i * 14, spr.y + 30, "eshot") as Phaser.Physics.Arcade.Image;
            s.setVelocity(i * 60 * this.spdF, 190 * this.spdF);
            s.setDepth(4);
          }
        }
        // vertical beam attack
        if (!b.beaming && b.attack2Acc > 6000 / this.spdF) {
          b.attack2Acc = 0;
          b.beaming = true;
          b.beamX = Phaser.Math.Clamp(this.player.x, 60, W - 60);
          b.beamTelegraph = this.add
            .rectangle(b.beamX, H / 2 + 60, 26, H - 260, 0xff5050, 0.18)
            .setDepth(3);
          audio.sfx("warning");
          this.time.delayedCall(750, () => {
            if (b.beamTelegraph) {
              b.beamTelegraph.destroy();
              b.beamTelegraph = undefined;
            }
            if (!spr.active) return;
            b.beamImg = this.add.image(b.beamX, H / 2 + 60, "beam").setDepth(3).setAlpha(0.7);
            b.beamImg.setDisplaySize(30, H - 260);
            audio.sfx("beam");
            b.beamAcc = 0;
          });
        }
        if (b.beamImg) {
          b.beamAcc += dt;
          if (
            this.playerAlive &&
            this.invuln <= 0 &&
            Math.abs(this.player.x - b.beamX) < 24 &&
            this.player.y > 180
          ) {
            this.playerHit(null);
          }
          if (b.beamAcc > 1100) {
            b.beamImg.destroy();
            b.beamImg = undefined;
            b.beaming = false;
          }
        }
        if (!b.escortsSpawned && frac < 0.5) {
          b.escortsSpawned = true;
          this.spawnEscorts(["w", "w"]);
        }
        break;
      }
      case "shell": {
        b.openAcc += dt;
        if (b.openAcc > 2600) {
          b.openAcc = 0;
          b.open = !b.open;
          spr.setTint(b.open ? 0xffffff : 0x777777);
        }
        if (b.attackAcc > 2100 / this.spdF) {
          b.attackAcc = 0;
          this.radialBurst(spr.x, spr.y + 10, 8, 130, b.t / 900);
        }
        if (b.attack2Acc > 2900 / this.spdF) {
          b.attack2Acc = 0;
          this.dropMine(spr.x + Phaser.Math.Between(-120, 120), spr.y + 40);
        }
        break;
      }
      case "ghost": {
        const cyc = (b.t % 5200) / 5200;
        spr.setAlpha(cyc < 0.55 ? 1 : 0.18);
        if (spr.alpha > 0.5 && b.attackAcc > 1500 / this.spdF) {
          b.attackAcc = 0;
          for (let i = -1; i <= 1; i++) {
            const dx = this.player.x - spr.x;
            const dy = this.player.y - spr.y;
            const len = Math.max(1, Math.hypot(dx, dy));
            const s = this.eBullets.create(spr.x + i * 20, spr.y + 24, "eshot") as Phaser.Physics.Arcade.Image;
            const v = 200 * this.spdF;
            s.setVelocity((dx / len) * v + i * 40, (dy / len) * v);
            s.setDepth(4);
          }
        }
        if (b.spawnAcc > 5200 && this.enemies.countActive() < 5) {
          b.spawnAcc = 0;
          this.spawnEscorts(["d", "d"]);
        }
        break;
      }
      case "gate": {
        b.angle += d * 2.4;
        if (b.attackAcc > 420 / this.spdF) {
          b.attackAcc = 0;
          for (const off of [0, Math.PI]) {
            const a = b.angle + off;
            const s = this.eBullets.create(spr.x, spr.y, "eorb") as Phaser.Physics.Arcade.Image;
            s.setVelocity(Math.cos(a) * 160 * this.spdF, Math.abs(Math.sin(a)) * 160 * this.spdF + 40);
            s.setDepth(4);
          }
        }
        if (b.attack2Acc > 3400 / this.spdF) {
          b.attack2Acc = 0;
          this.fireEnemyShot(spr.x, spr.y + 30, "aim", 240);
        }
        // orbit orbs
        b.orbs.forEach((o, i) => {
          if (!o.active) return;
          const a = b.angle * 1.4 + (i * Math.PI * 2) / 3;
          o.setPosition(spr.x + Math.cos(a) * 90, spr.y + Math.sin(a) * 60);
        });
        break;
      }
      case "queen": {
        const atkInt = (b.phase === 1 ? 1700 : b.phase === 2 ? 1400 : 1000) / this.spdF;
        if (b.attackAcc > atkInt) {
          b.attackAcc = 0;
          if (b.phase >= 1) {
            for (let i = -2; i <= 2; i++) {
              const dx = this.player.x - spr.x;
              const dy = this.player.y - spr.y;
              const len = Math.max(1, Math.hypot(dx, dy));
              const s = this.eBullets.create(spr.x, spr.y + 30, "eshot") as Phaser.Physics.Arcade.Image;
              const v = 190 * this.spdF;
              s.setVelocity((dx / len) * v + i * 55, (dy / len) * v);
              s.setDepth(4);
            }
          }
          if (b.phase >= 2) {
            this.radialBurst(spr.x, spr.y, 10, 120, b.t / 700);
          }
        }
        if (b.phase >= 2 && b.spawnAcc > 6000 && this.enemies.countActive() < 6) {
          b.spawnAcc = 0;
          this.spawnEscorts(["m", "m", "m"]);
        }
        if (b.phase === 3 && b.attack2Acc > 2600 / this.spdF) {
          b.attack2Acc = 0;
          const bx = Phaser.Math.Clamp(this.player.x, 60, W - 60);
          const tel = this.add.rectangle(bx, H / 2 + 60, 22, H - 260, 0xff5050, 0.2).setDepth(3);
          audio.sfx("warning");
          this.time.delayedCall(650, () => {
            tel.destroy();
            if (!spr.active || this.levelEnding) return;
            const beam = this.add.image(bx, H / 2 + 60, "beam").setDepth(3).setAlpha(0.7);
            beam.setDisplaySize(26, H - 260);
            audio.sfx("beam");
            const check = this.time.addEvent({
              delay: 60,
              repeat: 13,
              callback: () => {
                if (this.playerAlive && this.invuln <= 0 && Math.abs(this.player.x - bx) < 22 && this.player.y > 180) {
                  this.playerHit(null);
                }
              },
            });
            this.time.delayedCall(900, () => {
              beam.destroy();
              check.remove();
            });
          });
        }
        break;
      }
    }
  }

  private spawnEscorts(chars: string[]): void {
    chars.forEach((ch, i) => {
      const e = this.makeEnemy(ch, -100, -100);
      e.slotX = W / 2 + (i - (chars.length - 1) / 2) * 90;
      e.slotY = 250;
      e.path = this.entryPath(i, e.slotX);
      e.pathLen = e.path.getLength();
      e.est = "enter";
      const start = e.path.getPoint(0);
      e.setPosition(start.x, start.y);
    });
  }

  // ---------------------------------------------------------- housekeeping
  private updateProjectiles(dt: number): void {
    const cull = (g: Phaser.Physics.Arcade.Group) => {
      g.getChildren().forEach((obj) => {
        const img = obj as Phaser.Physics.Arcade.Image;
        if (!img.active) return;
        if (img.y < -40 || img.y > H + 40 || img.x < -40 || img.x > W + 40) img.destroy();
      });
    };
    cull(this.pBullets);
    cull(this.eBullets);
    cull(this.powerups);
    cull(this.mines);

    // homing missiles
    this.missiles.getChildren().forEach((obj) => {
      const m = obj as Phaser.Physics.Arcade.Image;
      if (!m.active) return;
      if (m.y < -40 || m.y > H + 40) {
        m.destroy();
        return;
      }
      let target: { x: number; y: number } | null = null;
      let best = Infinity;
      (this.enemies.getChildren() as Enemy[]).forEach((e) => {
        if (!e.active || e.est === "wait") return;
        const dist = Phaser.Math.Distance.Between(m.x, m.y, e.x, e.y);
        if (dist < best) {
          best = dist;
          target = e;
        }
      });
      if (!target && this.boss && this.boss.spr.active) target = this.boss.spr;
      if (target) {
        const t = target as { x: number; y: number };
        const body = m.body as Phaser.Physics.Arcade.Body;
        const dx = t.x - m.x;
        const dy = t.y - m.y;
        const len = Math.max(1, Math.hypot(dx, dy));
        const want = { x: (dx / len) * 340, y: (dy / len) * 340 };
        const lerp = Math.min(1, dt / 220);
        body.setVelocity(
          body.velocity.x + (want.x - body.velocity.x) * lerp,
          body.velocity.y + (want.y - body.velocity.y) * lerp
        );
        m.setAngle(Phaser.Math.RadToDeg(Math.atan2(body.velocity.y, body.velocity.x)) + 90);
      }
    });
  }

  private updateSupply(dt: number): void {
    void dt;
    if (this.supplyShip && this.supplyShip.active) {
      this.supplyShip.y = H - 220 + Math.sin(this.formT / 400) * 10;
      if (this.supplyShip.x > W + 70) {
        this.supplyShip.destroy();
        this.supplyShip = null;
      }
    }
  }

  private checkLevelEnd(): void {
    if (this.levelEnding || !this.spawnedAll) return;
    const enemiesLeft = this.enemies.countActive();
    if (this.boss || enemiesLeft > 0) return;
    if (!this.playerAlive) return;

    this.levelEnding = true;
    this.clearEnemyProjectiles();

    if (this.bonusActive && !this.bonusTallied) {
      this.bonusTallied = true;
      const perfect = this.bonusKills >= this.bonusTotal;
      const pts = this.bonusKills * 150 + (perfect ? 5000 : 0);
      this.addPoints(pts);
      this.banner(perfect ? `PERFECT! +${pts}` : `BONUS +${pts}`, "#30e060");
    } else {
      this.banner(this.run.level === FINAL_LEVEL ? "THE HIVE FALLS" : "LEVEL CLEAR", "#ffe040");
    }

    const finished = this.run.level;
    this.time.delayedCall(2100, () => {
      audio.stop();
      if (finished === FINAL_LEVEL) {
        this.scene.start("Cutscene", { kind: "ending", run: this.run });
      } else if (finished % 5 === 0) {
        const next: RunState = { ...this.run, level: finished + 1 };
        this.scene.start("Cutscene", { kind: "code", run: next, completedLevel: finished });
      } else {
        const next: RunState = { ...this.run, level: finished + 1 };
        this.scene.start("Game", { run: next });
      }
    });
  }
}
