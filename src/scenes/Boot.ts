import Phaser from "phaser";
import { generateSprites } from "../sprites";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create(): void {
    generateSprites(this);
    this.scene.start("Menu");
  }
}
