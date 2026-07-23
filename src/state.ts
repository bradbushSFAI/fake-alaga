// Pure game state: difficulty settings, score multiplier, checkpoint codes,
// and localStorage persistence for scores/settings/earned codes.

export interface Settings {
  speed: number; // 1..10 enemy speed
  tough: number; // 1..10 enemy toughness
}

export const DEFAULT_SETTINGS: Settings = { speed: 5, tough: 5 };

export function clampSetting(v: number): number {
  return Math.min(10, Math.max(1, Math.round(v)));
}

// Score multiplier rewards harder settings. 5/5 => x1.00, 10/10 => x1.60, 1/1 => x0.52.
export function scoreMult(s: Settings): number {
  return Math.round((0.4 + 0.06 * s.speed + 0.06 * s.tough) * 100) / 100;
}

// Enemy speed scale. 5 => 1.0
export function speedFactor(s: Settings): number {
  return 0.55 + 0.09 * s.speed;
}

// Enemy HP scale. 5 => 1.0
export function hpFactor(s: Settings): number {
  return 0.55 + 0.09 * s.tough;
}

export function scaleHp(baseHp: number, s: Settings): number {
  return Math.max(1, Math.round(baseHp * hpFactor(s)));
}

// --- Checkpoint codes ---
// Earn a code by finishing each world (levels 5/10/15/20). Enter it at the
// title screen to start from that world's first level.
export const CODES: Record<string, number> = {
  DFT: 6, // Asteroid Drift (world 2)
  GST: 11, // Ghost Nebula (world 3)
  GTE: 16, // Hive Gate (world 4)
  QNC: 21, // Queen's Core (world 5)
};

export function codeForCompletedLevel(level: number): string | null {
  const entry = Object.entries(CODES).find(([, start]) => start === level + 1);
  return entry ? entry[0] : null;
}

export function levelForCode(code: string): number | null {
  return CODES[code.toUpperCase()] ?? null;
}

// --- Persistence ---
export interface ScoreEntry {
  name: string;
  score: number;
  mult: number;
  level: number;
  won: boolean;
}

interface Store {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

const mem: Record<string, string> = {};
const store: Store =
  typeof localStorage !== "undefined"
    ? localStorage
    : { getItem: (k) => mem[k] ?? null, setItem: (k, v) => (mem[k] = v) };

const KEY_SCORES = "fakealaga.scores";
const KEY_SETTINGS = "fakealaga.settings";
const KEY_CODES = "fakealaga.codes";

export function loadSettings(): Settings {
  try {
    const raw = store.getItem(KEY_SETTINGS);
    if (raw) {
      const s = JSON.parse(raw) as Settings;
      return { speed: clampSetting(s.speed), tough: clampSetting(s.tough) };
    }
  } catch {
    /* fall through */
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(s: Settings): void {
  store.setItem(KEY_SETTINGS, JSON.stringify(s));
}

export function loadScores(): ScoreEntry[] {
  try {
    const raw = store.getItem(KEY_SCORES);
    if (raw) return JSON.parse(raw) as ScoreEntry[];
  } catch {
    /* fall through */
  }
  return [];
}

export function qualifies(score: number): boolean {
  if (score <= 0) return false;
  const scores = loadScores();
  return scores.length < 10 || score > scores[scores.length - 1].score;
}

export function addScore(entry: ScoreEntry): ScoreEntry[] {
  const scores = loadScores();
  scores.push(entry);
  scores.sort((a, b) => b.score - a.score);
  const top = scores.slice(0, 10);
  store.setItem(KEY_SCORES, JSON.stringify(top));
  return top;
}

export function highScore(): number {
  const scores = loadScores();
  return scores.length ? scores[0].score : 0;
}

export function earnedCodes(): string[] {
  try {
    const raw = store.getItem(KEY_CODES);
    if (raw) return JSON.parse(raw) as string[];
  } catch {
    /* fall through */
  }
  return [];
}

export function earnCode(code: string): void {
  const codes = earnedCodes();
  if (!codes.includes(code)) {
    codes.push(code);
    store.setItem(KEY_CODES, JSON.stringify(codes));
  }
}

// --- Cross-level run state carried between scenes ---
export interface RunState {
  level: number;
  score: number;
  lives: number;
  weapon: string;
  dual: boolean;
  drones: number;
  shield: number;
}

export function newRun(level = 1): RunState {
  return { level, score: 0, lives: 3, weapon: "single", dual: false, drones: 0, shield: 0 };
}
