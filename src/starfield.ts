import Phaser from "phaser";
import { W, H } from "./const";

interface Star {
  img: Phaser.GameObjects.Image;
  speed: number;
}

// Three-layer parallax starfield plus optional per-world decor.
export class Starfield {
  private stars: Star[] = [];
  private props: Star[] = [];

  constructor(scene: Phaser.Scene, tint = 0xffffff, bg?: "rim" | "asteroid" | "nebula" | "gate" | "core") {
    for (let i = 0; i < 70; i++) {
      const layer = i % 3;
      const img = scene.add.image(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), "star");
      img.setScale(layer === 2 ? 2 : 1).setAlpha(layer === 0 ? 0.35 : layer === 1 ? 0.6 : 0.95);
      img.setTint(tint);
      img.setDepth(-10);
      this.stars.push({ img, speed: 22 + layer * 34 });
    }

    if (bg === "asteroid") {
      for (let i = 0; i < 6; i++) {
        const img = scene.add.image(Phaser.Math.Between(20, W - 20), Phaser.Math.Between(0, H), "rock");
        img.setScale(Phaser.Math.FloatBetween(0.8, 2.2)).setAlpha(0.5).setDepth(-9);
        img.setAngle(Phaser.Math.Between(0, 360));
        this.props.push({ img, speed: 12 + i * 4 });
      }
    } else if (bg === "nebula") {
      for (let i = 0; i < 4; i++) {
        const img = scene.add.image(
          Phaser.Math.Between(40, W - 40),
          Phaser.Math.Between(0, H),
          i % 2 ? "neb_purple" : "neb_teal"
        );
        img.setScale(Phaser.Math.FloatBetween(1.2, 2.4)).setDepth(-9);
        this.props.push({ img, speed: 6 + i * 3 });
      }
    } else if (bg === "core") {
      for (let i = 0; i < 4; i++) {
        const img = scene.add.image(Phaser.Math.Between(40, W - 40), Phaser.Math.Between(0, H), "neb_red");
        img.setScale(Phaser.Math.FloatBetween(1.4, 2.6)).setDepth(-9);
        this.props.push({ img, speed: 8 + i * 3 });
      }
    } else if (bg === "gate") {
      for (let i = 0; i < 10; i++) {
        const img = scene.add.image(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), "pixel");
        img.setScale(Phaser.Math.Between(8, 30), 1).setAlpha(0.25).setTint(0xffdd88).setDepth(-9);
        this.props.push({ img, speed: 40 + i * 6 });
      }
    }
  }

  update(dt: number): void {
    const d = dt / 1000;
    for (const s of this.stars) {
      s.img.y += s.speed * d;
      if (s.img.y > H + 4) {
        s.img.y = -4;
        s.img.x = Phaser.Math.Between(0, W);
      }
    }
    for (const p of this.props) {
      p.img.y += p.speed * d;
      if (p.img.y > H + 120) {
        p.img.y = -120;
        p.img.x = Phaser.Math.Between(20, W - 20);
      }
    }
  }
}
