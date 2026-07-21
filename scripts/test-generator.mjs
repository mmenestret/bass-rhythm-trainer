/*
 * Harnais de test du générateur de grilles rythmiques.
 * Usage : node scripts/test-generator.mjs
 *
 * Vérifie sur >= 100 générations par combinaison représentative :
 *  (a) chaque mesure somme exactement à la signature ;
 *  (b) seules les figures cochées apparaissent (silences équivalents,
 *      pointées d'une figure cochée au niveau 3) ;
 *  (c) niveau 1 : ni silence, ni pointée/liaison ; niveau 2 : silences
 *      autorisés, pas de pointées/liaisons ; niveau 3 : tout autorisé ;
 *  (d) deux générations successives diffèrent (configs non dégénérées).
 * Plus : structure ABC (en-tête, 4 mesures par ligne, « |] »), cohérence
 * ABC <-> timeline notes, densité de silences au niveau 2.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const generatorPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "js", "generator.js");
const { generateExercise, availableCells, FIGURE_64 } = require(generatorPath);

const METERS = ["2/4", "3/4", "4/4", "2/2", "3/2", "4/2"];
const LEVELS = [1, 2, 3];
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
  const [num, den] = cfg.meter.split("/").map(Number);
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

  measures.forEach((mtext, mi) => {
    let sum64 = 0;
    const measureTokens = [];
    for (const grp of mtext.split(/\s+/)) {
      const re = /(D,|z)(\d*)(-?)/g;
      let covered = "";
      let match;
      while ((match = re.exec(grp))) {
        covered += match[0];
        const rest = match[1] === "z";
        const mult = match[2] === "" ? 1 : Number(match[2]);
        const tie = match[3] === "-";
        const dur64 = mult * unit64;
        sum64 += dur64;
        if (rest) {
          expect(cfg.level >= 2, ctx, `silence présent au niveau ${cfg.level}`);
          expect(!tie, ctx, "liaison posée sur un silence");
          expect(fig64.has(dur64), ctx, `silence de durée ${dur64}/64 sans figure cochée équivalente`);
        } else {
          const dotted = mult % 3 === 0;
          if (dotted) {
            expect(cfg.level === 3, ctx, `note pointée au niveau ${cfg.level}`);
            expect(fig64.has((dur64 * 2) / 3), ctx, `pointée de durée ${dur64}/64 sans figure de base cochée`);
          } else {
            expect(fig64.has(dur64), ctx, `note de durée ${dur64}/64 hors figures cochées`);
          }
          if (tie) expect(cfg.level === 3, ctx, `liaison au niveau ${cfg.level}`);
        }
        const token = { rest, dur64, tie };
        measureTokens.push(token);
        allTokens.push(token);
      }
      expect(covered === grp, ctx, `tokens ABC invalides : « ${grp} »`);
    }
    expect(sum64 === target64, ctx,
      `mesure ${mi + 1} somme ${sum64}/64 au lieu de ${target64}/64`);
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

  /* cohérence timeline notes <-> ABC */
  expect(Array.isArray(res.notes), ctx, "notes absent du résultat");
  expect(res.notes.length === allTokens.length, ctx,
    `timeline ${res.notes.length} évènements, ABC ${allTokens.length} tokens`);
  let cursor = 0;
  res.notes.forEach((n, i) => {
    const tok = allTokens[i];
    if (!tok) return;
    expect(Math.abs(n.startBeats - cursor) < 1e-9, ctx,
      `évènement ${i} : startBeats ${n.startBeats} au lieu de ${cursor}`);
    expect(n.durationBeats > 0, ctx, `évènement ${i} : durée nulle`);
    expect(!!n.isRest === tok.rest, ctx, `évènement ${i} : isRest incohérent`);
    expect(!!n.tiedToNext === tok.tie, ctx, `évènement ${i} : tiedToNext incohérent`);
    expect(Math.round((n.durationBeats * 64) / den) === tok.dur64, ctx,
      `évènement ${i} : durée ${n.durationBeats} temps != ${tok.dur64}/64`);
    cursor += n.durationBeats;
  });
  expect(Math.abs(cursor - cfg.measures * num) < 1e-9, ctx,
    `durée totale ${cursor} temps au lieu de ${cfg.measures * num}`);

  return allTokens;
}

function runCombo(cfg, label) {
  const av = availableCells(cfg);
  const seen = new Set();
  let restTokens = 0;
  let restSeen = false;
  let specialSeen = false;

  for (let g = 0; g < GENS_PER_COMBO; g++) {
    let res;
    try {
      res = generateExercise(cfg);
    } catch (e) {
      expect(false, label, `exception à la génération ${g + 1} : ${e.message}`);
      return;
    }
    generations++;
    const toks = verifyExercise(cfg, res, `${label} · gén. ${g + 1}`);
    if (!toks) return;
    seen.add(res.abc);
    for (const t of toks) {
      if (t.rest) { restTokens++; restSeen = true; }
      if (t.tie || (!t.rest && t.dur64 % 3 === 0)) specialSeen = true;
    }
  }
  combos++;

  /* (d) variété : deux tirages doivent pouvoir différer dès que le
     vocabulaire le permet (>= 2 cellules disponibles) */
  if (av.length >= 2) {
    expect(seen.size >= 2, label, `aucune variété sur ${GENS_PER_COMBO} générations`);
  }
  const hasRestCell = av.some((c) => c.kind === "rest");
  if (cfg.level >= 2 && hasRestCell) {
    expect(restSeen, label, `aucun silence apparu au niveau ${cfg.level}`);
  }
  const hasSpecialCell = av.some((c) => c.kind === "special");
  if (cfg.level === 3 && hasSpecialCell) {
    expect(specialSeen, label, "aucune pointée/liaison/syncope apparue au niveau 3");
  }
  if (cfg.level === 2 && hasRestCell) {
    const avg = restTokens / (GENS_PER_COMBO * cfg.measures);
    expect(avg > 0.15 && avg < 2.5, label,
      `densité de silences par mesure hors plage raisonnable : ${avg.toFixed(2)}`);
  }
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

/* ---------- matrice principale : niveaux × signatures × jeux de figures ---------- */
for (const figures of FIGURE_SETS) {
  for (const level of LEVELS) {
    for (const meter of METERS) {
      const cfg = { figures, level, meter, measures: 8 };
      runCombo(cfg, `[${figures.join("+")}] · niv ${level} · ${meter} · 8 mes`);
    }
  }
}

/* ---------- variantes de nombre de mesures ---------- */
for (const measures of [4, 16]) {
  runCombo(
    { figures: ["blanche", "noire", "croche"], level: 3, meter: "4/4", measures },
    `[blanche+noire+croche] · niv 3 · 4/4 · ${measures} mes`
  );
  runCombo(
    { figures: ["noire", "croche", "double"], level: 2, meter: "3/4", measures },
    `[noire+croche+double] · niv 2 · 3/4 · ${measures} mes`
  );
}

/* ---------- (d) deux clics successifs (config par défaut de la page) ---------- */
{
  const dcfg = { figures: ["blanche", "noire", "croche"], level: 1, meter: "4/4", measures: 8 };
  const a = generateExercise(dcfg);
  const b = generateExercise(dcfg);
  generations += 2;
  expect(a.abc !== b.abc, "config par défaut", "deux générations successives identiques");
}

/* ---------- cas d'erreur attendus ---------- */
expectThrows({ figures: [], level: 1, meter: "4/4", measures: 8 }, "figures vides");
expectThrows({ figures: ["swing"], level: 1, meter: "4/4", measures: 8 }, "figure inconnue");
expectThrows({ figures: ["noire"], level: 4, meter: "4/4", measures: 8 }, "niveau invalide");
expectThrows({ figures: ["noire"], level: 1, meter: "6/8", measures: 8 }, "signature non gérée");
expectThrows({ figures: ["noire"], level: 1, meter: "4/4", measures: 0 }, "mesures invalides");
expectThrows({ figures: ["ronde"], level: 1, meter: "3/4", measures: 8 }, "ronde seule en 3/4");
expectThrows({ figures: ["blanche"], level: 1, meter: "3/4", measures: 8 }, "blanche seule en 3/4");

/* ---------- résumé ---------- */
console.log("Harnais du générateur de grilles");
console.log(`  Combinaisons testées : ${combos}`);
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
