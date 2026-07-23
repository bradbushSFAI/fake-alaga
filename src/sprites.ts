import Phaser from "phaser";
import { px, rect, token, blob } from "./pixel";

// Generates every texture the game uses. Called once from Boot.
export function generateSprites(scene: Phaser.Scene): void {
  // ---- Player ship ----
  px(
    scene,
    "player",
    [
      ".....W.....",
      ".....W.....",
      "....WWW....",
      "....WRW....",
      "...WWRWW...",
      ".B.WWRWW.B.",
      ".BWWWRWWWB.",
      "BBWWRRRWWBB",
      "BWWWWRWWWWB",
      "BW.WWRWW.WB",
      "....O.O....",
      "...O...O...",
    ],
    { W: "#e8e8f8", R: "#ff3040", B: "#3a6cff", O: "#ffb020" }
  );

  // Rescued second fighter (green trim, for dual mode)
  px(
    scene,
    "player2",
    [
      ".....W.....",
      ".....W.....",
      "....WWW....",
      "....WGW....",
      "...WWGWW...",
      ".B.WWGWW.B.",
      ".BWWWGWWWB.",
      "BBWWGGGWWBB",
      "BWWWWGWWWWB",
      "BW.WWGWW.WB",
      "....O.O....",
      "...O...O...",
    ],
    { W: "#e8e8f8", G: "#30e060", B: "#3a6cff", O: "#ffb020" }
  );

  // Wingman drone
  px(
    scene,
    "drone",
    [
      "...C...",
      "..CCC..",
      ".CWWWC.",
      "CCWYWCC",
      ".CWWWC.",
      "..CCC..",
      "...O...",
    ],
    { C: "#30c8e0", W: "#d8f8ff", Y: "#ffe040", O: "#ffb020" }
  );

  // Supply ship (friendly, crosses between waves)
  px(
    scene,
    "supply",
    [
      "....GGGGGGGG....",
      "..GGWWWWWWWWGG..",
      ".GWWYYWWWWYYWWG.",
      "GGWWWWWGGWWWWWGG",
      "GWWGGGGWWGGGGWWG",
      ".GGWWWWWWWWWWGG.",
      "..GGGGGGGGGGGG..",
      "....O..OO..O....",
    ],
    { G: "#30b050", W: "#c8e8c8", Y: "#ffe040", O: "#ffb020" }
  );

  // ---- Enemies (two animation frames each where it matters) ----
  const droneRows = (f: number) => [
    f ? ".Y......Y." : "Y........Y",
    f ? ".Y.RRRR.Y." : ".Y.RRRR.Y.",
    "..RRRRRR..",
    ".RRYRRYRR.",
    ".RRRRRRRR.",
    "..RWWWWR..",
    f ? ".R..RR..R." : "..R.RR.R..",
    f ? "R...RR...R" : ".R..RR..R.",
  ];
  px(scene, "e_d0", droneRows(0), { R: "#ff4040", Y: "#ffe040", W: "#ffffff" });
  px(scene, "e_d1", droneRows(1), { R: "#ff4040", Y: "#ffe040", W: "#ffffff" });

  const strikerRows = (f: number) => [
    f ? "B..........B" : ".B........B.",
    f ? ".BB..BB..BB." : "B.B..BB..B.B",
    "..BBBBBBBB..",
    ".BBWBBBBWBB.",
    "BBBBBBBBBBBB",
    ".B.BYYYYB.B.",
    f ? "B..BYBBYB..B" : ".B.BYBBYB.B.",
    f ? "...B....B..." : "..B......B..",
  ];
  px(scene, "e_s0", strikerRows(0), { B: "#40a0ff", W: "#ffffff", Y: "#ffe040" });
  px(scene, "e_s1", strikerRows(1), { B: "#40a0ff", W: "#ffffff", Y: "#ffe040" });

  const spinnerRows = (f: number) =>
    f
      ? ["....P....", "..P.P.P..", ".PPPWPPP.", "P.PWWWP.P", ".PPPWPPP.", "..P.P.P..", "....P...."]
      : ["P...P...P", ".P..P..P.", "..PPWPP..", "PPPWWWPPP", "..PPWPP..", ".P..P..P.", "P...P...P"];
  px(scene, "e_p0", spinnerRows(0), { P: "#d060ff", W: "#ffffff" });
  px(scene, "e_p1", spinnerRows(1), { P: "#d060ff", W: "#ffffff" });

  // Splitter — chunky, breaks into minis
  px(
    scene,
    "e_x0",
    [
      "..OOOOOO..",
      ".OORROORO.",
      "OORRRRRROO",
      "ORORWWRORO",
      "OORRRRRROO",
      ".OORROORO.",
      "..OOOOOO..",
    ],
    { O: "#ff9020", R: "#c03010", W: "#ffffff" }
  );
  px(
    scene,
    "e_m0",
    ["..OO..", ".ORRO.", "ORWWRO", ".ORRO.", "..OO.."],
    { O: "#ff9020", R: "#c03010", W: "#ffffff" }
  );

  // Shielder — carries a frontal (bottom) shield plate
  px(
    scene,
    "e_h0",
    [
      "..GGGGGG..",
      ".GGWWWWGG.",
      "GGWGGGGWGG",
      "GGGGWWGGGG",
      ".GGGGGGGG.",
      "SSSSSSSSSS",
      "S.S.SS.S.S",
    ],
    { G: "#40d080", W: "#ffffff", S: "#a0f0ff" }
  );

  // Sniper — long barrel aimed at you
  px(
    scene,
    "e_n0",
    [
      ".V......V.",
      "VVV....VVV",
      ".VVVVVVVV.",
      "VVWVVVVWVV",
      ".VVVVVVVV.",
      "...VYYV...",
      "....YY....",
      "....YY....",
    ],
    { V: "#8080ff", W: "#ffffff", Y: "#ffe040" }
  );

  // Miner — drops mines
  px(
    scene,
    "e_e0",
    [
      "..TTTTTT..",
      ".TTWWWWTT.",
      "TTWTTTTWTT",
      "TTTTWWTTTT",
      ".TTTTTTTT.",
      "..T.TT.T..",
      ".M..MM..M.",
    ],
    { T: "#c0b040", W: "#ffffff", M: "#ff6060" }
  );

  // Warden — the capture-beam elite (Galaga boss homage)
  const wardenRows = (f: number) => [
    "K..K....K..K",
    ".KKK.KK.KKK.",
    ".KGGGGGGGGK.",
    "KGGWGGGGWGGK",
    "KGGGGGGGGGGK",
    ".KGGPPPPGGK.",
    ".KGPPWWPPGK.",
    f ? "K.GP.WW.PG.K" : ".KGP.WW.PGK.",
    f ? "..G......G.." : ".G........G.",
  ];
  px(scene, "e_w0", wardenRows(0), { K: "#ffe040", G: "#30c060", P: "#d060ff", W: "#ffffff" });
  px(scene, "e_w1", wardenRows(1), { K: "#ffe040", G: "#30c060", P: "#d060ff", W: "#ffffff" });

  // ---- Bosses (drawn larger via scale at spawn) ----
  px(
    scene,
    "boss_vex",
    [
      "K...KK....KK...K",
      ".K.KGGK..KGGK.K.",
      ".KKGGGGKKGGGGKK.",
      "KGGGWWGGGGWWGGGK",
      "KGGGGGGGGGGGGGGK",
      ".KGGPPPPPPPPGGK.",
      ".KGPPWWPPWWPPGK.",
      "K.GPP.WWWW.PPG.K",
      "..GP..PPPP..PG..",
      ".G....P..P....G.",
    ],
    { K: "#ffe040", G: "#30c060", P: "#d060ff", W: "#ffffff" }
  );
  px(
    scene,
    "boss_shell",
    [
      "....RRRRRRRR....",
      "..RRSSSSSSSSRR..",
      ".RSSRRSSSSRRSSR.",
      "RSSRRRSSSSRRRSSR",
      "RSSSSSWWWWSSSSSR",
      "RSSRRRSSSSRRRSSR",
      ".RSSRRSSSSRRSSR.",
      "..RRSSSSSSSSRR..",
      "....RRRRRRRR....",
    ],
    { R: "#b06030", S: "#807068", W: "#ff6040" }
  );
  px(
    scene,
    "boss_ghost",
    [
      "....CCCCCCCC....",
      "..CCDDDDDDDDCC..",
      ".CDDWWDDDDWWDDC.",
      "CDDDWWDDDDWWDDDC",
      "CDDDDDDDDDDDDDDC",
      ".CDDDCCCCCCDDDC.",
      "..CDC..CC..CDC..",
      ".C.C...CC...C.C.",
      "C......CC......C",
    ],
    { C: "#60e0e0", D: "#206080", W: "#ffffff" }
  );
  px(
    scene,
    "boss_gate",
    [
      "Y....YYYYYY....Y",
      ".Y..YMMMMMMY..Y.",
      ".YYMMYYYYYYMMYY.",
      "YMMYYWWYYWWYYMMY",
      "YMMYYYYYYYYYYMMY",
      ".YYMMYYYYYYMMYY.",
      ".Y..YMMMMMMY..Y.",
      "Y....YYYYYY....Y",
    ],
    { Y: "#ffe040", M: "#ff40a0", W: "#ffffff" }
  );
  px(
    scene,
    "boss_queen",
    [
      "R...RR.RR.RR...R",
      ".R.RQQRQQRQQR.R.",
      ".RRQQQQQQQQQQRR.",
      "RQQQWWQQQQWWQQQR",
      "RQQQQQQQQQQQQQQR",
      "RQQPPPPPPPPPPQQR",
      ".RQPPWWPPWWPPQR.",
      ".RQPP.WWWW.PPQR.",
      "R.QP...PP...PQ.R",
      "..Q....PP....Q..",
      ".Q.....PP.....Q.",
    ],
    { R: "#ff3060", Q: "#901830", P: "#ff80a0", W: "#ffffff" }
  );

  // ---- Bullets & effects ----
  px(scene, "pshot", ["Y", "W", "W", "Y"], { Y: "#ffe040", W: "#ffffff" }, 2);
  px(scene, "pmissile", [".W.", "WRW", "WRW", ".O."], { W: "#ffffff", R: "#ff3040", O: "#ffb020" }, 2);
  px(scene, "eshot", ["R", "P", "P", "R"], { R: "#ff5050", P: "#ffb0b0" }, 2);
  px(scene, "eorb", [".R.", "RPR", ".R."], { R: "#ff5050", P: "#ffd0d0" }, 3);
  px(scene, "mine", [".M.", "MWM", ".M."], { M: "#ff6060", W: "#ffe040" }, 3);

  const boomPal = { Y: "#ffe040", O: "#ff9020", R: "#ff3020", W: "#ffffff" };
  px(scene, "boom0", ["..Y..", ".YWY.", "YWWWY", ".YWY.", "..Y.."], boomPal);
  px(
    scene,
    "boom1",
    ["O..Y..O", ".OYWYO.", "YWWWWWY", ".OYWYO.", "O..Y..O"],
    boomPal
  );
  px(
    scene,
    "boom2",
    ["R..O..R", "..O.O..", "O..R..O", "..O.O..", "R..O..R"],
    boomPal
  );

  // Shield ring around player
  px(
    scene,
    "shieldring",
    [
      "...CCCCC...",
      ".CC.....CC.",
      ".C.......C.",
      "C.........C",
      "C.........C",
      "C.........C",
      ".C.......C.",
      ".CC.....CC.",
      "...CCCCC...",
    ],
    { C: "#40e0ff" },
    4
  );

  // Capture beam segment (tinted/stretched at runtime)
  rect(scene, "beam", 8, 8, "#80f0ff");
  rect(scene, "star", 2, 2, "#ffffff");
  rect(scene, "pixel", 2, 2, "#ffffff");

  // Scanline overlay tile
  const sl = scene.textures.createCanvas("scanline", 2, 4);
  if (sl) {
    const c = sl.getContext();
    c.fillStyle = "rgba(0,0,0,0.16)";
    c.fillRect(0, 0, 2, 1);
    sl.refresh();
  }

  // Asteroid piece (background prop, world 2)
  px(
    scene,
    "rock",
    ["..SS..", ".SSSS.", "SSDSSS", "SSSDSS", ".SSSS.", "..SS.."],
    { S: "#6a6058", D: "#403830" }
  );

  // Nebula blobs / glows
  blob(scene, "neb_purple", 220, "rgba(120,40,180,0.35)");
  blob(scene, "neb_teal", 220, "rgba(20,140,160,0.30)");
  blob(scene, "neb_red", 220, "rgba(200,40,60,0.30)");
  blob(scene, "glow", 64, "rgba(255,255,255,0.8)");

  // Power-up tokens
  token(scene, "pu_M", "M", "#40a0ff"); // multi-shot
  token(scene, "pu_T", "T", "#ff40a0"); // targeting missiles
  token(scene, "pu_B", "B", "#ff9020"); // front+back
  token(scene, "pu_R", "R", "#ffe040"); // rapid fire
  token(scene, "pu_S", "S", "#40e0ff"); // shield
  token(scene, "pu_D", "D", "#30c8e0"); // wingman drone
  token(scene, "pu_L", "1", "#30e060"); // extra life
}
