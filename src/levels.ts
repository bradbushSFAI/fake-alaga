// Worlds, story, enemy types, and all 25 level definitions.

export interface WorldDef {
  name: string;
  bg: "rim" | "asteroid" | "nebula" | "gate" | "core";
  starTint: number;
  music: string;
  story: string[]; // cutscene lines shown before the world's first level
}

export const WORLDS: WorldDef[] = [
  {
    name: "THE HOME RIM",
    bg: "rim",
    starTint: 0xaaccff,
    music: "w0",
    story: [
      "YEAR 2287. THE HIVE ARMADA HAS",
      "CROSSED THE OUTER DARK.",
      "",
      "YOU ARE THE LAST MOTH-1 PILOT.",
      "HOLD THE HOME RIM. BUY US TIME.",
    ],
  },
  {
    name: "ASTEROID DRIFT",
    bg: "asteroid",
    starTint: 0xccbbaa,
    music: "w1",
    story: [
      "THE RIM HELD. BARELY.",
      "",
      "THE ARMADA RETREATS THROUGH THE",
      "ASTEROID DRIFT. THEIR MINERS ARE",
      "SEEDING THE ROCKS WITH TRAPS.",
      "FOLLOW THEM IN.",
    ],
  },
  {
    name: "GHOST NEBULA",
    bg: "nebula",
    starTint: 0xddaaff,
    music: "w2",
    story: [
      "SENSOR GHOSTS EVERYWHERE.",
      "",
      "THIS NEBULA SWALLOWED A FLEET",
      "A CENTURY AGO. NOW IT GLOWS",
      "WITH STOLEN SHIPS. STAY SHARP.",
      "SOME OF THEM PHASE.",
    ],
  },
  {
    name: "THE HIVE GATE",
    bg: "gate",
    starTint: 0xffdd88,
    music: "w3",
    story: [
      "THERE. THE GATE.",
      "",
      "A RING OF LIVING METAL, THE ONLY",
      "DOOR TO THE QUEEN'S CORE.",
      "IT KNOWS YOU ARE COMING.",
    ],
  },
  {
    name: "QUEEN'S CORE",
    bg: "core",
    starTint: 0xff8888,
    music: "w4",
    story: [
      "INSIDE THE HIVE.",
      "",
      "EVERY DRONE, EVERY WARDEN, EVERY",
      "STOLEN SHIP WAS BORN HERE.",
      "END HER. END ALL OF IT.",
      "",
      "FOR THE HOME RIM.",
    ],
  },
];

export const ENDING: string[] = [
  "THE QUEEN IS DUST.",
  "",
  "THE HIVE SCATTERS INTO THE DARK,",
  "MINDLESS AND QUIET.",
  "",
  "THE HOME RIM ENDURES.",
  "",
  "YOU FLY HOME ON A STOLEN WING,",
  "AND EVERY LIGHT IN THE BELT",
  "BURNS FOR YOU.",
];

export function worldOf(level: number): number {
  return Math.min(4, Math.floor((level - 1) / 5));
}

// --- Enemy catalog ---
export interface EnemyTypeDef {
  tex: string; // texture key prefix ("e_d" -> frames e_d0/e_d1 if animated)
  frames: number;
  hp: number;
  score: number;
  fire: "none" | "straight" | "aim" | "spiral";
  special?: "split" | "shield" | "mine" | "capture" | "sniper";
}

export const ETYPES: Record<string, EnemyTypeDef> = {
  d: { tex: "e_d", frames: 2, hp: 1, score: 100, fire: "straight" },
  s: { tex: "e_s", frames: 2, hp: 2, score: 200, fire: "aim" },
  p: { tex: "e_p", frames: 2, hp: 2, score: 250, fire: "spiral" },
  x: { tex: "e_x", frames: 1, hp: 3, score: 300, fire: "straight", special: "split" },
  m: { tex: "e_m", frames: 1, hp: 1, score: 80, fire: "none" },
  h: { tex: "e_h", frames: 1, hp: 2, score: 350, fire: "straight", special: "shield" },
  n: { tex: "e_n", frames: 1, hp: 2, score: 400, fire: "aim", special: "sniper" },
  e: { tex: "e_e", frames: 1, hp: 3, score: 350, fire: "none", special: "mine" },
  w: { tex: "e_w", frames: 2, hp: 5, score: 800, fire: "aim", special: "capture" },
};

// --- Bosses ---
export interface BossDef {
  key: string;
  tex: string;
  name: string;
  hp: number;
  scale: number;
  score: number;
}

export const BOSSES: Record<string, BossDef> = {
  vex: { key: "vex", tex: "boss_vex", name: "WARDEN PRIME", hp: 60, scale: 5, score: 5000 },
  shell: { key: "shell", tex: "boss_shell", name: "THE MEGALITH", hp: 80, scale: 5, score: 7000 },
  ghost: { key: "ghost", tex: "boss_ghost", name: "PHANTOM CARRIER", hp: 90, scale: 5, score: 9000 },
  gate: { key: "gate", tex: "boss_gate", name: "THE GATEKEEPER", hp: 110, scale: 5, score: 12000 },
  queen: { key: "queen", tex: "boss_queen", name: "THE QUEEN", hp: 170, scale: 6, score: 25000 },
};

// --- Levels ---
export interface LevelDef {
  formation?: string[]; // rows of type chars; '.' = empty slot
  boss?: string;
  bonus?: boolean; // bonus stage: trains fly through, no shooting back
  supply?: boolean; // friendly supply ship crosses during the level
  diveEvery: number; // ms between dive launches (before speed scaling)
  maxDivers: number;
  formationFire?: number; // ms between formation pot-shots (0 = none)
}

export const LEVELS: LevelDef[] = [
  // ---- World 1: The Home Rim (1-5) ----
  {
    formation: ["..dddddd..", ".dddddddd."],
    diveEvery: 3200,
    maxDivers: 1,
    formationFire: 0,
  },
  {
    formation: ["..ssssss..", ".dddddddd.", "dddddddddd"],
    diveEvery: 2700,
    maxDivers: 2,
    formationFire: 4000,
  },
  {
    formation: ["...wsdsw...", ".ssssssss.", "dddddddddd"],
    supply: true,
    diveEvery: 2400,
    maxDivers: 2,
    formationFire: 3500,
  },
  {
    bonus: true,
    diveEvery: 99999,
    maxDivers: 0,
  },
  {
    boss: "vex",
    diveEvery: 99999,
    maxDivers: 0,
  },

  // ---- World 2: Asteroid Drift (6-10) ----
  {
    formation: ["..xxxxxx..", ".ssssssss.", "dddddddddd"],
    diveEvery: 2400,
    maxDivers: 2,
    formationFire: 3400,
  },
  {
    formation: ["...weew...", ".xxssssxx.", "dddddddddd"],
    diveEvery: 2200,
    maxDivers: 3,
    formationFire: 3200,
  },
  {
    formation: ["..eexxee..", ".ssssssss.", ".dddddddd.", "dddddddddd"],
    supply: true,
    diveEvery: 2100,
    maxDivers: 3,
    formationFire: 3000,
  },
  {
    formation: ["..wexxew..", "xxssssssxx", "dddddddddd"],
    diveEvery: 1900,
    maxDivers: 3,
    formationFire: 2800,
  },
  {
    boss: "shell",
    diveEvery: 99999,
    maxDivers: 0,
  },

  // ---- World 3: Ghost Nebula (11-15) ----
  {
    formation: ["..pppppp..", ".ssssssss.", "dddddddddd"],
    diveEvery: 2000,
    maxDivers: 3,
    formationFire: 2800,
  },
  {
    formation: ["...wnnw...", ".pppssppp.", "ssdddddss."],
    diveEvery: 1900,
    maxDivers: 3,
    formationFire: 2500,
  },
  {
    formation: ["..nnppnn..", ".pxpssxpp.", "dddddddddd"],
    supply: true,
    diveEvery: 1800,
    maxDivers: 4,
    formationFire: 2400,
  },
  {
    bonus: true,
    diveEvery: 99999,
    maxDivers: 0,
  },
  {
    boss: "ghost",
    diveEvery: 99999,
    maxDivers: 0,
  },

  // ---- World 4: The Hive Gate (16-20) ----
  {
    formation: ["..hhhhhh..", ".ssssssss.", "pppddddppp"],
    diveEvery: 1800,
    maxDivers: 4,
    formationFire: 2300,
  },
  {
    formation: ["..whhnnw..", ".hhpppphh.", "ssssssssss"],
    diveEvery: 1700,
    maxDivers: 4,
    formationFire: 2200,
  },
  {
    formation: [".nnhehhen.", ".xxpsspxx.", "dddddddddd"],
    supply: true,
    diveEvery: 1650,
    maxDivers: 4,
    formationFire: 2100,
  },
  {
    formation: ["wnhhehhnw.", "hhpppppphh", "ssssssssss", ".dddddddd."],
    diveEvery: 1550,
    maxDivers: 5,
    formationFire: 2000,
  },
  {
    boss: "gate",
    diveEvery: 99999,
    maxDivers: 0,
  },

  // ---- World 5: Queen's Core (21-25) ----
  {
    formation: ["..wnpnw...", ".hhxxxxhh.", "ssppppppss", "dddddddddd"],
    diveEvery: 1500,
    maxDivers: 5,
    formationFire: 1900,
  },
  {
    formation: [".wehhhhew.", ".nnppppnn.", "xxssssssxx", "dddddddddd"],
    diveEvery: 1400,
    maxDivers: 5,
    formationFire: 1800,
  },
  {
    formation: ["wnwhehewnw", "hhpppppphh", "ssxxssxxss", "dddddddddd"],
    supply: true,
    diveEvery: 1300,
    maxDivers: 6,
    formationFire: 1700,
  },
  {
    bonus: true,
    diveEvery: 99999,
    maxDivers: 0,
  },
  {
    boss: "queen",
    diveEvery: 99999,
    maxDivers: 0,
  },
];

export const FINAL_LEVEL = LEVELS.length; // 25
