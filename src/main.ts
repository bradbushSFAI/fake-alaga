import Phaser from "phaser";
import { W, H } from "./const";
import { BootScene } from "./scenes/Boot";
import { MenuScene } from "./scenes/Menu";
import { CutsceneScene } from "./scenes/Cutscene";
import { GameScene } from "./scenes/Game";
import { GameOverScene } from "./scenes/GameOver";
import { audio } from "./audio";

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

// Test/debug hooks — let automated playtests inspect game and audio state.
const testWindow = window as unknown as { __game: Phaser.Game; __audio: typeof audio };
testWindow.__game = game;
testWindow.__audio = audio;
