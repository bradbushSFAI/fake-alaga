import Phaser from "phaser";
import { W, H } from "./const";
import { BootScene } from "./scenes/Boot";
import { MenuScene } from "./scenes/Menu";
import { CutsceneScene } from "./scenes/Cutscene";
import { GameScene } from "./scenes/Game";
import { GameOverScene } from "./scenes/GameOver";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: W,
  height: H,
  backgroundColor: "#05050c",
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scene: [BootScene, MenuScene, CutsceneScene, GameScene, GameOverScene],
});

// Test/debug hook — lets automated playtests inspect scene state.
(window as unknown as { __game: Phaser.Game }).__game = game;
