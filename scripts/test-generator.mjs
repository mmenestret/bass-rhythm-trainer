/*
 * Harnais de test du générateur de grilles rythmiques.
 * Usage : node scripts/test-generator.mjs
 *
 * Vérifie sur >= 100 générations par combinaison (figures × procédés ×
 * toutes les signatures permises, n de 1 à 12 et d parmi 2, 4 et 8) :
 *  (a) chaque mesure somme exactement à la signature ;
 *  (b) seules les figures cochées apparaissent (silences équivalents,
 *      pointées d'une figure cochée) ;
 *  (c) un procédé non coché n'apparaît jamais (silence, pointée plus fine que
 *      le temps, liaison, syncope écrite sans liaison) et un procédé coché
 *      applicable finit par apparaître ;
 *  (d) règle de liaison : aucune liaison ne se termine ailleurs que sur un
 *      début de temps, toutes signatures et tous procédés confondus (la
 *      noire pointée en mesure composée) ;
 *  (e) deux générations successives diffèrent (configs non dégénérées) ;
 *  (f) ligature par temps : les valeurs plus courtes que le temps sont
 *      ligaturées par temps (les croches par trois en mesure composée) ;
 *  (g) mesure composée : la noire pointée et la blanche pointée sont des
 *      figures ordinaires (présentes sans Points), la sicilienne n'apparaît
 *      qu'avec Points ; les temps entiers de la timeline sont exacts ;
 *  (h) triolets : gravés « (3 » sur la figure de base (croche en /4, noire
 *      en /2), chaque triolet commence sur un début de temps et dure
 *      exactement un temps, silences internes avec Silences, jamais en
 *      mesure composée ni en /8, jamais sans Triolets ; la timeline donne
 *      des instants exacts au tiers de temps.
 * Plus : structure ABC (en-tête, 4 mesures par ligne, « |] »), cohérence
 * ABC <-> timeline notes, densité des procédés, applicabilité d'un procédé
 * selon les figures cochées (procedeNeeds).
 *
 * Les durées lues dans l'ABC sont converties en ticks (192 par ronde) : la
 * valeur écrite d'une note de triolet compte pour ses deux tiers, ce qui
 * reste entier (croche de triolet = 16 ticks).
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { generateExercise, availableCells, procedeNeeds, FIGURE_64 } = require(path.join(ROOT, "js", "generator.js"));
const { analyzeMeter, allMeters } = require(path.join(ROOT, "js", "meter.js"));

const METERS = allMeters();
const COMPOUND_METERS = ["6/8", "9/8", "12/8"];
/* Figures qui remplissent toute signature permise. */
const FILL_ALL_FIGURES = ["noire", "croche", "double"];
const PROCEDE_SETS = [
  [],
  ["rests"],
  ["dots"],
  ["ties"],
  ["syncopes"],
  ["triplets"],
  ["rests", "dots"],
  ["ties", "syncopes"],
  ["rests", "triplets"],
  ["rests", "dots", "ties", "syncopes"],
  ["rests", "dots", "ties", "syncopes", "triplets"],
];
/* Procédés repérables dans la grille gravée. */
const DRAWN_PROCEDES = ["rests", "dots", "ties", "syncopes", "triplets"];
/* Ticks par 64e de ronde : 192 ticks par ronde, le tiers de temps y est entier. */
const TICKS_PER_64 = 3;
/* Figure du triolet sur un temps (valeur écrite en 64e) : croche en /4, noire
   en /2 ; aucun triolet en /8 ni en mesure composée. */
function tripletWritten64(meterInfo) {
  if (meterInfo.compound || meterInfo.denominator === 8) return null;
  return meterInfo.beat64 / 2;
}
const FIGURE_SETS = [
  ["blanche", "noire"],
  ["noire", "croche"],
  ["blanche", "noire", "croche"],
  ["noire", "croche", "double"],
  ["croche", "double", "triple"],
  ["ronde", "blanche", "noire", "croche", "double"],
  ["double"],
  ["noire", "croche", "double", "triple", "quadruple"],
];
const GENS_PER_COMBO = 100;

let generations = 0;
let checks = 0;
let combos = 0;
const failures = [];

function expect(cond, ctx, msg) {
  checks++;
  if (!cond) failures.push(`${ctx} — ${msg}`);
  return cond;
}

/* Analyse l'ABC généré et le confronte à la config et à la timeline. */
function verifyExercise(cfg, res, ctx) {
  const meterInfo = analyzeMeter(cfg.meter);
  const num = meterInfo.numerator;
  const den = meterInfo.denominator;
  const beats = meterInfo.beats;
  const lines = res.abc.split("\n");

  expect(lines[0] === "X:1", ctx, `en-tête X: invalide (${lines[0]})`);
  expect(lines[1] === "M:" + cfg.meter, ctx, `en-tête M: invalide (${lines[1]})`);
  const mL = /^L:1\/(8|16|32|64)$/.exec(lines[2] || "");
  if (!expect(!!mL, ctx, `en-tête L: invalide (${lines[2]})`)) return null;
  const lden = Number(mL[1]);
  expect(lines[3] === "K:C clef=bass", ctx, `en-tête K: invalide (${lines[3]})`);
  expect(res.abc.trimEnd().endsWith("|]"), ctx, "la partition ne se termine pas par |]");

  const bodyLines = lines.slice(4).filter((l) => l.trim() !== "");
  expect(bodyLines.length === Math.ceil(cfg.measures / 4), ctx,
    `nombre de lignes ${bodyLines.length} au lieu de ${Math.ceil(cfg.measures / 4)}`);

  const measures = [];
  bodyLines.forEach((line, li) => {
    const segs = line.split("|").map((s) => s.trim()).filter((s) => s !== "" && s !== "]");
    const isLast = li === bodyLines.length - 1;
    const wanted = isLast ? cfg.measures - 4 * li : 4;
    expect(segs.length === wanted, ctx, `ligne ${li + 1} : ${segs.length} mesures au lieu de ${wanted}`);
    measures.push(...segs);
  });
  expect(measures.length === cfg.measures, ctx,
    `${measures.length} mesures au lieu de ${cfg.measures}`);

  const unit64 = 64 / lden;
  const fig64 = new Set(cfg.figures.map((f) => FIGURE_64[f]));
  const allTokens = [];
  const target64 = (num * 64) / den;

  const beat64 = meterInfo.beat64;
  const beatTicks = beat64 * TICKS_PER_64;
  const triplet64 = tripletWritten64(meterInfo);
  const has = (procede) => cfg.procedes.includes(procede);

  measures.forEach((mtext, mi) => {
    let sumTicks = 0;
    const measureTokens = [];
    let previousShort = null; /* { beat, group } de la dernière valeur plus courte que le temps */
    let tripletLeft = 0;
    let tripletStart = 0;
    mtext.split(/\s+/).forEach((grp, gi) => {
      const re = /(\(3)?(D,|z)(\d*)(-?)/g;
      let covered = "";
      let match;
      let groupBeat = null;
      let groupSize = 0;
      while ((match = re.exec(grp))) {
        covered += match[0];
        const opensTriplet = match[1] === "(3";
        const rest = match[2] === "z";
        const mult = match[3] === "" ? 1 : Number(match[3]);
        const tie = match[4] === "-";
        const written64 = mult * unit64;
        const startTicks = sumTicks;
        if (opensTriplet) {
          expect(tripletLeft === 0, ctx, `triolet ouvert dans un triolet (mesure ${mi + 1})`);
          expect(groupSize === 0, ctx, `triolet ligaturé avec d'autres valeurs (« ${grp} », mesure ${mi + 1})`);
          tripletLeft = 3;
          tripletStart = startTicks;
        }
        const triplet = tripletLeft > 0;
        const tripletIndex = triplet ? 3 - tripletLeft : -1;
        /* Une note de triolet vaut les deux tiers de sa valeur écrite. */
        const durTicks = triplet ? written64 * 2 : written64 * TICKS_PER_64;
        const dur64 = durTicks / TICKS_PER_64;
        const endTicks = startTicks + durTicks;
        sumTicks += durTicks;
        /* Valeur pointée ; en mesure composée, les pointées d'au moins un
           temps (noire pointée, blanche pointée…) sont des figures
           ordinaires, seules les plus fines relèvent de Points. */
        const pointed = !triplet && written64 % 3 === 0;
        const ordinaryPointed = pointed && meterInfo.compound && written64 >= beat64;
        const dotted = !rest && pointed && !ordinaryPointed;
        /* Syncope écrite sans liaison : une note attaquée hors d'un début de
           temps qui déborde sur le temps suivant. */
        const syncope = !rest && startTicks % beatTicks !== 0 &&
          endTicks > (Math.floor(startTicks / beatTicks) + 1) * beatTicks;
        if (triplet) {
          expect(has("triplets"), ctx, "triolet présent sans le procédé Triolets");
          expect(triplet64 !== null, ctx, `triolet dans une signature qui n'en permet pas (${cfg.meter})`);
          expect(written64 === triplet64, ctx,
            `note de triolet écrite ${written64}/64 au lieu de la figure du triolet (${triplet64}/64)`);
          expect(fig64.has(written64), ctx, "triolet sans sa figure de base cochée");
          if (rest) expect(has("rests"), ctx, "silence de triolet sans le procédé Silences");
          expect(!tie || tripletIndex === 2, ctx, `liaison au milieu d'un triolet (mesure ${mi + 1})`);
          tripletLeft--;
          if (tripletLeft === 0) {
            expect(tripletStart % beatTicks === 0, ctx,
              `triolet hors d'un début de temps (mesure ${mi + 1}, à ${tripletStart} ticks)`);
            expect(endTicks - tripletStart === beatTicks, ctx,
              `triolet de ${endTicks - tripletStart} ticks au lieu d'un temps (mesure ${mi + 1})`);
          }
        } else if (rest) {
          expect(has("rests"), ctx, "silence présent sans le procédé Silences");
          expect(!tie, ctx, "liaison posée sur un silence");
          expect(fig64.has(ordinaryPointed ? (written64 * 2) / 3 : written64), ctx,
            `silence de durée ${written64}/64 sans figure cochée équivalente`);
        } else if (pointed) {
          if (dotted) expect(has("dots"), ctx, "note pointée plus fine que le temps sans le procédé Points");
          expect(fig64.has((written64 * 2) / 3), ctx, `pointée de durée ${written64}/64 sans figure de base cochée`);
        } else {
          expect(fig64.has(written64), ctx, `note de durée ${written64}/64 hors figures cochées`);
        }
        if (triplet && rest) expect(!tie, ctx, "liaison posée sur un silence de triolet");
        /* (f) ligature par temps : une valeur d'au moins un temps reste
           isolée ; les plus courtes d'un même temps forment un seul groupe. */
        if (durTicks >= beatTicks) {
          expect(grp === match[0], ctx, `valeur d'un temps ou plus ligaturée (« ${grp} »)`);
          previousShort = null;
        } else {
          const beatIdx = Math.floor(startTicks / beatTicks);
          if (groupSize === 0) groupBeat = beatIdx;
          expect(beatIdx === groupBeat, ctx, `ligature à cheval sur deux temps (« ${grp} », mesure ${mi + 1})`);
          expect(!(groupSize === 0 && previousShort && previousShort.beat === beatIdx), ctx,
            `deux valeurs d'un même temps non ligaturées (mesure ${mi + 1} : « ${mtext} »)`);
          previousShort = { beat: beatIdx, group: gi };
          groupSize++;
        }
        if (tie) {
          expect(has("ties"), ctx, "liaison sans le procédé Liaisons");
          expect(endTicks % beatTicks === 0, ctx,
            `liaison au milieu d'un temps (mesure ${mi + 1}, fin à ${endTicks} ticks)`);
        }
        if (syncope) expect(has("syncopes"), ctx, "syncope sans le procédé Syncopes");
        const token = { rest, dur64, durTicks, startTicks, written64, tie, dotted, syncope, triplet, tripletIndex };
        measureTokens.push(token);
        allTokens.push(token);
      }
      expect(covered === grp, ctx, `tokens ABC invalides : « ${grp} »`);
    });
    expect(tripletLeft === 0, ctx, `triolet incomplet (mesure ${mi + 1})`);
    expect(sumTicks === target64 * TICKS_PER_64, ctx,
      `mesure ${mi + 1} somme ${sumTicks} ticks au lieu de ${target64 * TICKS_PER_64}`);
    if (measureTokens.length && measureTokens.every((t) => t.rest)) {
      expect(measureTokens.length === 1, ctx,
        `mesure ${mi + 1} entièrement silencieuse sans être une pause seule`);
    }
  });

  /* liaisons : jamais en fin d'exercice, toujours suivies d'une note */
  if (allTokens.length) {
    expect(!allTokens[allTokens.length - 1].tie, ctx, "liaison pendante en fin d'exercice");
    for (let i = 0; i + 1 < allTokens.length; i++) {
      if (allTokens[i].tie) {
        expect(!allTokens[i + 1].rest, ctx, "liaison vers un silence");
      }
    }
  }

  /* cohérence timeline notes <-> ABC : instants exacts au tick près */
  expect(Array.isArray(res.notes), ctx, "notes absent du résultat");
  expect(res.notes.length === allTokens.length, ctx,
    `timeline ${res.notes.length} évènements, ABC ${allTokens.length} tokens`);
  let cursorTicks = 0;
  res.notes.forEach((n, i) => {
    const tok = allTokens[i];
    if (!tok) return;
    expect(Math.abs(n.startBeats * beatTicks - cursorTicks) < 1e-9, ctx,
      `évènement ${i} : startBeats ${n.startBeats} au lieu de ${cursorTicks / beatTicks}`);
    expect(n.durationBeats > 0, ctx, `évènement ${i} : durée nulle`);
    expect(!!n.isRest === tok.rest, ctx, `évènement ${i} : isRest incohérent`);
    expect(!!n.tiedToNext === tok.tie, ctx, `évènement ${i} : tiedToNext incohérent`);
    expect(Math.abs(n.durationBeats * beatTicks - tok.durTicks) < 1e-9, ctx,
      `évènement ${i} : durée ${n.durationBeats} temps != ${tok.durTicks} ticks`);
    /* Un début de temps est un nombre entier exact (synchronisation avec
       les clics du moteur), mesure composée et triolets compris. */
    if (cursorTicks % beatTicks === 0) {
      expect(n.startBeats === cursorTicks / beatTicks, ctx, `évènement ${i} : début de temps inexact (${n.startBeats})`);
    }
    cursorTicks += tok.durTicks;
  });
  expect(cursorTicks === cfg.measures * beats * beatTicks, ctx,
    `durée totale ${cursorTicks / beatTicks} temps au lieu de ${cfg.measures * beats}`);

  return allTokens;
}

/* Procédés repérés dans une suite de jetons. */
function procedesSeen(toks) {
  const seen = new Set();
  for (const t of toks) {
    if (t.rest) seen.add("rests");
    if (t.dotted) seen.add("dots");
    if (t.tie) seen.add("ties");
    if (t.syncope) seen.add("syncopes");
    if (t.triplet) seen.add("triplets");
  }
  return seen;
}

/* Densité moyenne par mesure, procédés confondus (silences, pointées,
   liaisons, syncopes, triolets comptés une fois par groupe) — sert à
   vérifier qu'une mesure reste lisible. */
function procedeCount(toks) {
  let n = 0;
  for (const t of toks) {
    if (t.rest) n++;
    if (t.dotted) n++;
    if (t.tie) n++;
    if (t.syncope) n++;
    if (t.tripletIndex === 0) n++;
  }
  return n;
}

let impossibleCombos = 0;

function runCombo(cfg, label) {
  const av = availableCells(cfg);
  const seen = new Set();
  const procedes = new Set();
  let restTokens = 0;
  let procedeTokens = 0;

  for (let g = 0; g < GENS_PER_COMBO; g++) {
    let res;
    try {
      res = generateExercise(cfg);
    } catch (e) {
      /* Figures incapables de remplir la signature (ronde seule en 3/4…) :
         refus net dès le premier tirage, jamais des figures qui remplissent
         toute signature. */
      const fillAll = FILL_ALL_FIGURES.every((f) => cfg.figures.includes(f));
      if (g === 0 && !fillAll && /^Impossible de remplir/.test(e.message)) {
        impossibleCombos++;
        return;
      }
      expect(false, label, `exception à la génération ${g + 1} : ${e.message}`);
      return;
    }
    generations++;
    const toks = verifyExercise(cfg, res, `${label} · gén. ${g + 1}`);
    if (!toks) return;
    seen.add(res.abc);
    for (const p of procedesSeen(toks)) procedes.add(p);
    restTokens += toks.filter((t) => t.rest).length;
    procedeTokens += procedeCount(toks);
  }
  combos++;

  /* (e) variété : deux tirages doivent pouvoir différer dès que le
     vocabulaire le permet (>= 2 cellules d'un temps, placées partout) */
  if (av.filter((c) => c.lenInt === 1).length >= 2) {
    expect(seen.size >= 2, label, `aucune variété sur ${GENS_PER_COMBO} générations`);
  }
  /* (c) un procédé coché et applicable finit par apparaître */
  for (const procede of cfg.procedes) {
    if (!DRAWN_PROCEDES.includes(procede)) continue;
    if (procedeNeeds({ figures: cfg.figures, meter: cfg.meter, procedes: cfg.procedes }, procede) !== null) {
      expect(!procedes.has(procede), label, `procédé ${procede} jugé inapplicable mais présent`);
      continue;
    }
    expect(procedes.has(procede), label, `procédé ${procede} coché mais jamais apparu`);
  }
  const perMeasure = (n) => n / (GENS_PER_COMBO * cfg.measures);
  if (cfg.procedes.length === 1 && cfg.procedes[0] === "rests" && procedeNeeds(cfg, "rests") === null) {
    const avg = perMeasure(restTokens);
    expect(avg > 0.15 && avg < 2.5, label,
      `densité de silences par mesure hors plage raisonnable : ${avg.toFixed(2)}`);
  }
  /* densité lisible : procédés confondus, quelques occurrences par mesure */
  const avgAll = perMeasure(procedeTokens);
  expect(avgAll < 3, label, `densité de procédés par mesure trop forte : ${avgAll.toFixed(2)}`);
}

function expectThrows(cfg, label) {
  checks++;
  try {
    generateExercise(cfg);
    failures.push(`${label} — aurait dû lever une erreur`);
  } catch {
    /* attendu */
  }
}

/* ---------- matrice principale : procédés × signatures × jeux de figures ---------- */
for (const figures of FIGURE_SETS) {
  for (const procedes of PROCEDE_SETS) {
    for (const meter of METERS) {
      const cfg = { figures, procedes, meter, measures: 8 };
      runCombo(cfg, `[${figures.join("+")}] · {${procedes.join("+")}} · ${meter} · 8 mes`);
    }
  }
}

/* ---------- variantes de nombre de mesures ---------- */
for (const measures of [4, 16]) {
  runCombo(
    { figures: ["blanche", "noire", "croche"], procedes: ["rests", "dots", "ties", "syncopes"], meter: "4/4", measures },
    `[blanche+noire+croche] · tous procédés · 4/4 · ${measures} mes`
  );
  runCombo(
    { figures: ["noire", "croche", "double"], procedes: ["rests"], meter: "3/4", measures },
    `[noire+croche+double] · {rests} · 3/4 · ${measures} mes`
  );
}

/* ---------- (d) règle de liaison sur un large balayage ----------
   Liaisons cochées, toutes signatures, figures fines comprises : des milliers
   de liaisons tirées, aucune ne finit au milieu d'un temps (vérifié par
   verifyExercise), et les doubles liées existent encore d'un temps à l'autre. */
{
  let sixteenthTies = 0;
  for (const meter of METERS) {
    for (const procedes of [["ties"], ["ties", "dots", "syncopes", "rests"]]) {
      const cfg = { figures: ["noire", "croche", "double", "triple"], procedes, meter, measures: 8 };
      for (let g = 0; g < 150; g++) {
        const res = generateExercise(cfg);
        generations++;
        const toks = verifyExercise(cfg, res, `règle de liaison · ${meter} · {${procedes.join("+")}} · gén. ${g + 1}`);
        if (!toks) continue;
        for (const t of toks) {
          if (t.tie && t.dur64 === 4) sixteenthTies++;
        }
      }
    }
  }
  expect(sixteenthTies > 0, "règle de liaison", "aucune double liée d'un temps à l'autre");
}

/* ---------- (g) mesures composées : figures ordinaires, sicilienne, ligature ---------- */
{
  for (const meter of COMPOUND_METERS) {
    const beat64 = analyzeMeter(meter).beat64;
    const draw = (figures, procedes, n) => {
      const toks = [];
      for (let g = 0; g < n; g++) {
        const cfg = { figures, procedes, meter, measures: 8 };
        const res = generateExercise(cfg);
        generations++;
        const got = verifyExercise(cfg, res, `composée · ${meter} · [${figures.join("+")}] · {${procedes.join("+")}}`);
        if (got) toks.push(...got);
      }
      return toks;
    };
    const plain = draw(["blanche", "noire", "croche"], [], 300);
    expect(plain.some((t) => !t.rest && t.dur64 === beat64), meter, "noire pointée absente sans Points");
    expect(plain.some((t) => !t.rest && t.dur64 === 2 * beat64), meter, "blanche pointée absente sans Points");
    expect(plain.every((t) => !t.dotted), meter, "pointée plus fine que le temps sans Points");
    expect(plain.some((t) => t.dur64 === 8), meter, "croches absentes");
    const sicilienne = draw(["noire", "croche", "double"], ["dots"], 300);
    expect(sicilienne.some((t) => !t.rest && t.dur64 === 12), meter, "sicilienne (croche pointée) absente avec Points");
    const eighths = draw(["croche"], [], 50);
    expect(eighths.every((t) => t.dur64 === 8), meter, "croche seule : autre valeur tirée");
    expect(eighths.length === 50 * 8 * analyzeMeter(meter).numerator, meter, "croche seule : mesure non pleine de croches");
  }
  /* Croches ligaturées par trois, par temps (ABC brut) : 6/8 en croches seules. */
  const res = generateExercise({ figures: ["croche"], procedes: [], meter: "6/8", measures: 4 });
  expect(res.bars.every((bar) => bar === "D,D,D, D,D,D,"), "ligature 6/8", `croches non groupées par trois : ${res.bars.join(" | ")}`);
  const nine = generateExercise({ figures: ["croche"], procedes: [], meter: "9/8", measures: 2 });
  expect(nine.bars.every((bar) => bar === "D,D,D, D,D,D, D,D,D,"), "ligature 9/8", `croches non groupées par trois : ${nine.bars.join(" | ")}`);
  const ex = generateExercise({ figures: ["noire"], procedes: [], meter: "12/8", measures: 2 });
  expect(ex.header.indexOf("M:12/8") !== -1, "en-tête 12/8", `signature absente de l'en-tête : ${ex.header}`);
  expect(ex.notes.every((n) => Number.isInteger(n.startBeats) && n.durationBeats === 1), "12/8 · noire",
    "noire seule : une noire pointée par temps attendue");
}

/* ---------- (h) triolets : début de temps, un temps, silences internes ---------- */
{
  const ctx = "triolets";
  const SIMPLE_TRIPLET_METERS = ["2/4", "3/4", "4/4", "5/4", "2/2", "3/2", "4/2"];
  let groups = 0;
  const restSlots = new Set();
  let mixedMeasures = 0;
  for (const meter of SIMPLE_TRIPLET_METERS) {
    const halfBeat = analyzeMeter(meter).denominator === 2;
    const figures = halfBeat ? ["blanche", "noire"] : ["noire", "croche"];
    for (const procedes of [["triplets"], ["rests", "triplets"], ["rests", "dots", "ties", "syncopes", "triplets"]]) {
      const cfg = { figures, procedes, meter, measures: 8 };
      for (let g = 0; g < 200; g++) {
        const res = generateExercise(cfg);
        generations++;
        const toks = verifyExercise(cfg, res, `${ctx} · ${meter} · {${procedes.join("+")}} · gén. ${g + 1}`);
        if (!toks) continue;
        expect(toks.some((t) => t.triplet) === res.abc.includes("(3"), ctx, "triolet gravé sans « (3 »");
        for (const t of toks) {
          if (t.tripletIndex === 0) groups++;
          if (t.triplet && t.rest) restSlots.add(t.tripletIndex);
        }
        /* Mélange binaire / ternaire : des mesures portent à la fois un
           triolet et un temps binaire. */
        const barTicks = analyzeMeter(meter).beats * analyzeMeter(meter).beat64 * TICKS_PER_64;
        const byBar = new Map();
        for (const t of toks) {
          const bar = Math.floor(t.startTicks / barTicks);
          if (!byBar.has(bar)) byBar.set(bar, []);
          byBar.get(bar).push(t);
        }
        for (const barToks of byBar.values()) {
          if (barToks.some((t) => t.triplet) && barToks.some((t) => !t.triplet)) mixedMeasures++;
        }
      }
    }
    /* En /2, le triolet est un triolet de noires, gravé en L:1/8 (D,2). */
    if (halfBeat) {
      const half = generateExercise({ figures: ["blanche", "noire"], procedes: ["triplets"], meter, measures: 16 });
      generations++;
      expect(/\(3D,2D,2D,2/.test(half.abc) || !half.abc.includes("(3"), ctx, `${meter} : triolet de noires attendu (D,2) — ${half.abc}`);
      expect(half.abc.indexOf("L:1/8") !== -1, ctx, `${meter} : unité L:1/8 attendue avec des noires de triolet`);
    }
  }
  expect(groups > 1000, ctx, `trop peu de triolets tirés (${groups})`);
  expect(restSlots.size === 3, ctx, `silence interne absent d'une des trois places (${[...restSlots].join(",")})`);
  expect(mixedMeasures > 0, ctx, "aucun mélange de triolets et de temps binaires");

  /* Sans la figure de base ou en mesure composée, Triolets coché ne tire rien. */
  for (const [figures, meter] of [[["blanche", "noire"], "4/4"], [["ronde", "blanche"], "2/2"],
    [["noire", "croche"], "6/8"], [["noire", "croche"], "12/8"], [["croche", "double"], "7/8"]]) {
    for (let g = 0; g < 50; g++) {
      const res = generateExercise({ figures, procedes: ["triplets"], meter, measures: 8 });
      generations++;
      expect(!res.abc.includes("(3"), ctx, `triolet tiré en ${meter} avec [${figures.join("+")}]`);
    }
  }
}

/* ---------- toute signature permise se remplit ---------- */
{
  for (const meter of METERS) {
    for (const procedes of [[], ["rests", "dots", "ties", "syncopes", "triplets"]]) {
      const cfg = { figures: FILL_ALL_FIGURES, procedes, meter, measures: 16 };
      for (let g = 0; g < 60; g++) {
        let res = null;
        try {
          res = generateExercise(cfg);
        } catch (e) {
          expect(false, meter, `figures ${FILL_ALL_FIGURES.join("+")} : exception ${e.message}`);
          break;
        }
        generations++;
        verifyExercise(cfg, res, `remplissage · ${meter} · {${procedes.join("+")}} · gén. ${g + 1}`);
      }
    }
  }
  expect(impossibleCombos < combos, "matrice", `${impossibleCombos} combinaisons impossibles sur ${combos}`);
}

/* ---------- (e) deux clics successifs (config par défaut de la page) ---------- */
{
  const dcfg = { figures: ["blanche", "noire", "croche"], procedes: [], meter: "4/4", measures: 8 };
  const a = generateExercise(dcfg);
  const b = generateExercise(dcfg);
  generations += 2;
  expect(a.abc !== b.abc, "config par défaut", "deux générations successives identiques");
}

/* ---------- applicabilité d'un procédé selon les figures cochées ---------- */
{
  const ctx = "procedeNeeds";
  const needs = (figures, meter, procede) => procedeNeeds({ figures, meter }, procede);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  expect(needs(["noire", "croche"], "4/4", "syncopes") === null, ctx, "syncopes applicables avec noire + croche");
  expect(same(needs(["blanche", "noire"], "4/4", "syncopes"), ["croche"]), ctx, "syncopes : nécessite la croche (4/4)");
  expect(same(needs(["ronde", "blanche"], "2/2", "syncopes"), ["noire"]), ctx, "syncopes : nécessite la noire (2/2)");
  expect(same(needs(["double"], "4/4", "syncopes"), ["noire", "croche"]), ctx, "syncopes : nécessite la noire et la croche");
  expect(needs(["blanche", "noire"], "2/4", "ties") === null, ctx, "liaisons applicables par-dessus la barre");
  expect(same(needs(["ronde"], "4/4", "ties"), ["noire"]), ctx, "liaisons : nécessite la noire (ronde seule)");
  expect(needs(["noire", "croche"], "4/4", "dots") === null, ctx, "points applicables avec noire + croche");
  expect(same(needs(["noire"], "2/4", "dots"), ["croche"]), ctx, "points : nécessite la croche");
  expect(needs(["quadruple"], "4/4", "rests") !== null, ctx, "silences inapplicables avec la quadruple seule");
  expect(same(needs(["quadruple"], "4/4", "rests"), ["triple"]), ctx, "silences : nécessite la triple croche");
  expect(needs(["noire"], "4/4", "rests") === null, ctx, "silences applicables avec la noire");
  // Triolets : la figure de base (croche en /4, noire en /2), jamais en mesure composée ni en /8.
  expect(needs(["noire", "croche"], "4/4", "triplets") === null, ctx, "triolets applicables avec la croche (4/4)");
  expect(needs(["croche"], "3/4", "triplets") === null, ctx, "triolets applicables avec la croche seule (3/4)");
  expect(same(needs(["blanche", "noire"], "4/4", "triplets"), ["croche"]), ctx, "triolets : nécessite la croche (4/4)");
  expect(needs(["blanche", "noire"], "2/2", "triplets") === null, ctx, "triolets de noires applicables (2/2)");
  expect(same(needs(["ronde", "blanche"], "2/2", "triplets"), ["noire"]), ctx, "triolets : nécessite la noire (2/2)");
  expect(same(needs(["noire", "croche"], "6/8", "triplets"), []), ctx, "triolets : jamais en mesure composée (6/8)");
  expect(same(needs(["noire", "croche", "double"], "12/8", "triplets"), []), ctx, "triolets : jamais en mesure composée (12/8)");
  expect(same(needs(["croche", "double"], "7/8", "triplets"), []), ctx, "triolets : jamais en /8 simple");
  // Mesures composées : Points ne gouverne que la sicilienne (croche pointée – double – croche).
  expect(same(needs(["noire", "croche"], "6/8", "dots"), ["double"]), ctx, "6/8 · points : nécessite la double croche");
  expect(needs(["croche", "double"], "6/8", "dots") === null, ctx, "6/8 · points applicables avec croche + double");
  expect(needs(["noire", "croche"], "9/8", "syncopes") === null, ctx, "9/8 · syncopes (hémiole) applicables avec la noire");
  expect(same(needs(["croche"], "6/8", "syncopes"), ["noire"]), ctx, "6/8 · syncopes : nécessite la noire");
  expect(needs(["noire"], "12/8", "ties") === null, ctx, "12/8 · liaisons applicables avec la noire (pointée)");
  expect(needs(["noire"], "6/8", "rests") === null, ctx, "6/8 · silences applicables avec la noire (soupir pointé)");
  // Signatures simples nouvelles : le temps est la noire en 7/4, la croche en 7/8.
  expect(needs(["noire", "croche"], "7/4", "syncopes") === null, ctx, "7/4 · syncopes applicables avec noire + croche");
  expect(same(needs(["croche"], "7/8", "syncopes"), ["double"]), ctx, "7/8 · syncopes : nécessite la double croche");
}

/* ---------- cas d'erreur attendus ---------- */
expectThrows({ figures: [], procedes: [], meter: "4/4", measures: 8 }, "figures vides");
expectThrows({ figures: ["swing"], procedes: [], meter: "4/4", measures: 8 }, "figure inconnue");
expectThrows({ figures: ["noire"], procedes: ["swing"], meter: "4/4", measures: 8 }, "procédé inconnu");
expectThrows({ figures: ["noire"], procedes: "rests", meter: "4/4", measures: 8 }, "procédés hors tableau");
expectThrows({ figures: ["noire"], procedes: [], meter: "4/16", measures: 8 }, "signature non gérée (/16)");
expectThrows({ figures: ["noire"], procedes: [], meter: "13/4", measures: 8 }, "signature non gérée (13 temps)");
expectThrows({ figures: ["ronde"], procedes: [], meter: "6/8", measures: 8 }, "ronde seule en 6/8");
expectThrows({ figures: ["blanche"], procedes: [], meter: "9/8", measures: 8 }, "blanche seule en 9/8");
expectThrows({ figures: ["noire"], procedes: [], meter: "4/4", measures: 0 }, "mesures invalides");
expectThrows({ figures: ["ronde"], procedes: [], meter: "3/4", measures: 8 }, "ronde seule en 3/4");
expectThrows({ figures: ["blanche"], procedes: [], meter: "3/4", measures: 8 }, "blanche seule en 3/4");

/* ---------- résumé ---------- */
console.log("Harnais du générateur de grilles");
console.log(`  Combinaisons testées : ${combos} (+ ${impossibleCombos} refusées : figures incapables de remplir la signature)`);
console.log(`  Générations          : ${generations}`);
console.log(`  Vérifications        : ${checks}`);
console.log(`  Échecs               : ${failures.length}`);
if (failures.length) {
  console.log("");
  for (const f of failures.slice(0, 25)) console.log("  ✗ " + f);
  if (failures.length > 25) console.log(`  … et ${failures.length - 25} autres`);
  process.exit(1);
}
console.log("  Tout est vert.");
process.exit(0);
