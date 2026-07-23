import { describe, it, expect } from "vitest";
import {
  scoreMult,
  speedFactor,
  hpFactor,
  scaleHp,
  clampSetting,
  CODES,
  codeForCompletedLevel,
  levelForCode,
  DEFAULT_SETTINGS,
} from "../src/state";
import { LEVELS, WORLDS, ETYPES, BOSSES, worldOf, FINAL_LEVEL } from "../src/levels";

describe("difficulty settings", () => {
  it("default settings give a 1.00 score multiplier", () => {
    expect(scoreMult(DEFAULT_SETTINGS)).toBe(1.0);
  });

  it("max difficulty gives the biggest multiplier", () => {
    expect(scoreMult({ speed: 10, tough: 10 })).toBeGreaterThan(scoreMult({ speed: 1, tough: 1 }));
    expect(scoreMult({ speed: 10, tough: 10 })).toBe(1.6);
  });

  it("speed and toughness factors scale monotonically", () => {
    expect(speedFactor({ speed: 10, tough: 5 })).toBeGreaterThan(speedFactor({ speed: 1, tough: 5 }));
    expect(hpFactor({ speed: 5, tough: 10 })).toBeGreaterThan(hpFactor({ speed: 5, tough: 1 }));
  });

  it("clampSetting keeps sliders in 1..10", () => {
    expect(clampSetting(0)).toBe(1);
    expect(clampSetting(99)).toBe(10);
    expect(clampSetting(7)).toBe(7);
  });

  it("scaled hp never drops below 1", () => {
    expect(scaleHp(1, { speed: 1, tough: 1 })).toBe(1);
    expect(scaleHp(5, { speed: 10, tough: 10 })).toBeGreaterThan(5);
  });
});

describe("checkpoint codes", () => {
  it("every code maps to the first level of a world", () => {
    for (const level of Object.values(CODES)) {
      expect((level - 1) % 5).toBe(0);
      expect(level).toBeGreaterThan(1);
      expect(level).toBeLessThanOrEqual(FINAL_LEVEL);
    }
  });

  it("finishing each world boss level earns a code", () => {
    for (const bossLevel of [5, 10, 15, 20]) {
      const code = codeForCompletedLevel(bossLevel);
      expect(code).toBeTruthy();
      expect(levelForCode(code!)).toBe(bossLevel + 1);
    }
  });

  it("finishing the final level earns no code (game is over)", () => {
    expect(codeForCompletedLevel(25)).toBeNull();
  });

  it("codes are case-insensitive and 3 letters", () => {
    for (const code of Object.keys(CODES)) {
      expect(code).toMatch(/^[A-Z]{3}$/);
      expect(levelForCode(code.toLowerCase())).toBe(CODES[code]);
    }
    expect(levelForCode("ZZZ")).toBeNull();
  });
});

describe("level data integrity", () => {
  it("has exactly 25 levels across 5 worlds", () => {
    expect(LEVELS.length).toBe(25);
    expect(WORLDS.length).toBe(5);
    expect(worldOf(1)).toBe(0);
    expect(worldOf(25)).toBe(4);
  });

  it("every 5th level is a boss with a valid boss key", () => {
    for (const lvl of [5, 10, 15, 20, 25]) {
      const def = LEVELS[lvl - 1];
      expect(def.boss).toBeTruthy();
      expect(BOSSES[def.boss!]).toBeTruthy();
    }
  });

  it("every formation char is a known enemy type", () => {
    LEVELS.forEach((def) => {
      (def.formation ?? []).forEach((row) => {
        [...row].forEach((ch) => {
          if (ch === "." || ch === " ") return;
          expect(ETYPES[ch], `unknown enemy char '${ch}'`).toBeTruthy();
        });
      });
    });
  });

  it("non-boss, non-bonus levels all have formations", () => {
    LEVELS.forEach((def, i) => {
      if (!def.boss && !def.bonus) {
        expect(def.formation, `level ${i + 1} missing formation`).toBeTruthy();
        expect(def.formation!.length).toBeGreaterThan(0);
      }
    });
  });

  it("formations fit on screen (max 12 columns)", () => {
    LEVELS.forEach((def) => {
      (def.formation ?? []).forEach((row) => {
        expect(row.length).toBeLessThanOrEqual(12);
      });
    });
  });
});
