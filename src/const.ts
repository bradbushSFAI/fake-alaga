export const W = 540;
export const H = 720;

export const FONT = "'Courier New', monospace";

export function txtStyle(size: number, color = "#e8e8ff"): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT,
    fontSize: `${size}px`,
    color,
    fontStyle: "bold",
  };
}
