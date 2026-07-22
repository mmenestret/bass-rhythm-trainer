/*
 * Harnais de test de la graine déterministe et du partage de grille.
 * Usage : node scripts/test-share.mjs
 *
 * Vérifie :
 *  (a) makeRng : même graine -> même suite ; graines différentes -> suites
 *      différentes ; tous les tirages dans [0,1) ;
 *  (b) reproductibilité : generateExercise avec makeRng(graine) redonne
 *      exactement la même grille (abc + timeline) ; graines différentes ->
 *      grilles différentes ;
 *  (c) flux ∞ : UNE instance de rng réutilisée d'une tranche à l'autre donne
 *      un flux varié et reproductible depuis la graine ; ré-instancier la rng
 *      à chaque tranche répéterait la même tranche (justifie la réutilisation) ;
 *  (d) encodeShare/decodeShare : aller-retour exact sur un large balayage de
 *      configurations, sortie sûre pour un fragment d'URL ;
 *  (e) decodeShare rejette (null) les chaînes corrompues ou hors domaine.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const generatorPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "js", "generator.js");
const { generateExercise, makeRng, encodeShare, decodeShare, METERS } = require(generatorPath);

let checks = 0;
const failures = [];
function expect(cond, ctx, msg) {
  checks++;
  if (!cond) failures.push(`${ctx} — ${msg}`);
  return cond;
}

/* ---------- (a) makeRng ---------- */
(function () {
  const ctx = "makeRng";
  const draw = (seed, n) => { const r = makeRng(seed); const out = []; for (let i = 0; i < n; i++) out.push(r()); return out; };

  const a1 = draw(12345, 30);
  const a2 = draw(12345, 30);
  expect(a1.every((v, i) => v === a2[i]), ctx, "même graine -> suites identiques");

  const b = draw(999, 30);
  expect(a1.some((v, i) => v !== b[i]), ctx, "graines différentes -> suites différentes");

  const all = [].concat(draw(0, 200), draw(4294967295, 200), draw(7, 200));
  expect(all.every((v) => v >= 0 && v < 1), ctx, "tous les tirages dans [0,1)");

  // Graine 0 et graine 2^32 (repliée par >>> 0) doivent différer d'une vraie
  // suite pseudo-aléatoire (pas dégénérée en constante).
  const uniq = new Set(draw(42, 50));
  expect(uniq.size > 40, ctx, "suite non dégénérée (variété des tirages)");
})();

/* ---------- (b) reproductibilité de la grille ---------- */
(function () {
  const ctx = "reproductibilité";
  const cfg = { figures: ["noire", "croche", "double"], level: 2, meter: "4/4", measures: 8, note: "D," };

  const g1 = generateExercise(Object.assign({}, cfg, { rng: makeRng(2024) }));
  const g2 = generateExercise(Object.assign({}, cfg, { rng: makeRng(2024) }));
  expect(g1.abc === g2.abc, ctx, "même graine -> ABC identique");
  expect(JSON.stringify(g1.notes) === JSON.stringify(g2.notes), ctx, "même graine -> timeline identique");

  let differ = 0;
  for (let s = 1; s <= 20; s++) {
    const a = generateExercise(Object.assign({}, cfg, { rng: makeRng(s) })).abc;
    const b = generateExercise(Object.assign({}, cfg, { rng: makeRng(s + 1000) })).abc;
    if (a !== b) differ++;
  }
  expect(differ >= 18, ctx, `graines distinctes -> grilles majoritairement différentes (${differ}/20)`);
})();

/* ---------- (c) flux ∞ : une seule rng réutilisée ---------- */
(function () {
  const ctx = "flux ∞";
  const cfg = { figures: ["noire", "croche"], level: 1, meter: "4/4", measures: 8, note: "D," };
  const CHUNKS = 4;

  // Approche appli : une rng, réutilisée -> l'état avance d'une tranche à l'autre.
  const flow = (seed) => {
    const rng = makeRng(seed);
    const out = [];
    for (let i = 0; i < CHUNKS; i++) out.push(generateExercise(Object.assign({}, cfg, { rng })).abc);
    return out;
  };
  const f1 = flow(77);
  const f2 = flow(77);
  expect(f1.every((c, i) => c === f2[i]), ctx, "même graine -> flux reproductible tranche à tranche");
  expect(new Set(f1).size >= 2, ctx, "rng réutilisée -> tranches variées (le flux ne se répète pas)");

  // Contre-exemple documentaire : ré-instancier la rng à chaque tranche répète
  // la même tranche — c'est précisément ce que la réutilisation évite.
  const reseeded = [];
  for (let i = 0; i < CHUNKS; i++) reseeded.push(generateExercise(Object.assign({}, cfg, { rng: makeRng(77) })).abc);
  expect(new Set(reseeded).size === 1, ctx, "rng ré-instanciée par tranche -> même tranche répétée");
})();

/* ---------- (d) aller-retour encode/decode ---------- */
(function () {
  const ctx = "encode/decode";
  const FIGURE_SETS = [
    ["blanche", "noire"],
    ["noire", "croche"],
    ["ronde", "blanche", "noire", "croche"],
    ["croche", "double", "triple"],
    ["quadruple"],
    ["ronde", "blanche", "noire", "croche", "double", "triple", "quadruple"],
  ];
  const NOTES = ["E", "F", "G", "A", "B", "C", "D"];
  const MEAS = ["4", "8", "16", "inf"];
  const SEEDS = [0, 1, 42, 65535, 2147483647, 4294967295];

  const eq = (a, b) =>
    a.seed === b.seed &&
    a.level === b.level &&
    a.meter === b.meter &&
    a.note === b.note &&
    a.measures === b.measures &&
    a.figures.slice().sort().join(",") === b.figures.slice().sort().join(",");

  let round = 0;
  for (const meter of METERS)
    for (const level of [1, 2, 3])
      for (const figs of FIGURE_SETS)
        for (const note of NOTES)
          for (const measures of MEAS)
            for (const seed of SEEDS) {
              const st = { seed, figures: figs, level, meter, note, measures };
              const enc = encodeShare(st);
              expect(/^[0-9a-zA-Z=&]+$/.test(enc), ctx, `encodage sûr pour un fragment d'URL (${enc})`);
              const dec = decodeShare(enc);
              if (!expect(dec !== null, ctx, `décodage non nul (${enc})`)) continue;
              expect(eq(st, dec), ctx, `aller-retour exact (${enc})`);
              round++;
            }
  expect(round > 500, ctx, `balayage suffisant (${round} configurations)`);
})();

/* ---------- (e) rejet des chaînes invalides ---------- */
(function () {
  const ctx = "decode invalide";
  const good = encodeShare({ seed: 42, figures: ["noire", "croche"], level: 2, meter: "4/4", note: "D", measures: "8" });
  expect(decodeShare(good) !== null, ctx, "témoin valide accepté");

  const bad = [
    ["", "chaîne vide"],
    [null, "null"],
    [undefined, "undefined"],
    [42, "non-chaîne"],
    ["s=2a&f=nc&l=2&m=44&n=D", "clé x manquante"],
    ["f=nc&l=2&m=44&n=D&x=8", "clé s manquante"],
    ["s=2a&f=nz&l=2&m=44&n=D&x=8", "code de figure inconnu (z)"],
    ["s=2a&f=&l=2&m=44&n=D&x=8", "aucune figure"],
    ["s=2a&f=nc&l=4&m=44&n=D&x=8", "niveau hors 1–3"],
    ["s=2a&f=nc&l=2&m=23&n=D&x=8", "signature hors liste (2/3)"],
    ["s=2a&f=nc&l=2&m=444&n=D&x=8", "signature mal formée"],
    ["s=2a&f=nc&l=2&m=44&n=H&x=8", "note hors A–G"],
    ["s=2a&f=nc&l=2&m=44&n=D&x=32", "nombre de mesures hors liste"],
    ["s=zz&f=nc&l=x&m=44&n=D&x=8", "niveau non numérique"],
  ];
  for (const [str, why] of bad) {
    expect(decodeShare(str) === null, ctx, `rejeté : ${why}`);
  }
})();

/* ---------- (f) invariant bout-en-bout : le lien reproduit la grille ----------
   C'est LA garantie de la feature. On enchaîne l'exact chemin d'un partage :
   état -> encodeShare -> (chaîne d'URL) -> decodeShare -> génération, et l'on
   exige que la grille obtenue soit identique à celle de l'état d'origine. Un
   champ perdu ou corrompu par le codec ferait diverger les deux grilles.
   La note est passée comme jeton (lettre A–G, 0 virgule, valide pour le
   générateur) : même jeton des deux côtés -> mêmes hauteurs, rythme inchangé. */
(function () {
  const ctx = "invariant de partage";
  // Jeux de figures qui remplissent n'importe laquelle des 6 signatures.
  const SAFE_FIGURES = [
    ["blanche", "noire"],
    ["noire", "croche"],
    ["noire", "croche", "double"],
    ["blanche", "noire", "croche", "double"],
  ];
  const NOTES = ["E", "G", "D"];

  // Grille bornée : un seul appel, comme l'appli en mode 4/8/16 mesures.
  const boundedAbc = (st) => generateExercise({
    figures: st.figures, level: st.level, meter: st.meter,
    measures: Number(st.measures), note: st.note, rng: makeRng(st.seed)
  }).abc;

  // Flux ∞ : une rng réutilisée sur plusieurs tranches, comme extendStream.
  const flowAbc = (st, chunks) => {
    const rng = makeRng(st.seed);
    const cfg = { figures: st.figures, level: st.level, meter: st.meter, measures: 8, note: st.note };
    const out = [];
    for (let i = 0; i < chunks; i++) out.push(generateExercise(Object.assign({}, cfg, { rng })).abc);
    return out.join("|");
  };

  let boundedRounds = 0;
  let infRounds = 0;
  const SEEDS = [3, 88, 100000, 4294967290];

  for (const meter of METERS)
    for (const level of [1, 2, 3])
      for (const figures of SAFE_FIGURES)
        for (const note of NOTES)
          for (const seed of SEEDS) {
            // -- bornée (8 mesures) --
            const st = { seed, figures, level, meter, note, measures: "8" };
            const original = boundedAbc(st);
            const restored = decodeShare(encodeShare(st));
            if (expect(restored !== null, ctx, `décodage du partage (${encodeShare(st)})`)) {
              expect(boundedAbc(restored) === original, ctx,
                `grille bornée reproduite après aller-retour (${encodeShare(st)})`);
              boundedRounds++;
            }

            // -- flux ∞ (3 tranches) --
            const stInf = { seed, figures, level, meter, note, measures: "inf" };
            const originalFlow = flowAbc(stInf, 3);
            const restoredInf = decodeShare(encodeShare(stInf));
            if (expect(restoredInf !== null && restoredInf.measures === "inf", ctx,
              `décodage du partage ∞ (${encodeShare(stInf)})`)) {
              expect(flowAbc(restoredInf, 3) === originalFlow, ctx,
                `flux ∞ reproduit après aller-retour (${encodeShare(stInf)})`);
              infRounds++;
            }
          }
  expect(boundedRounds > 200, ctx, `balayage borné suffisant (${boundedRounds})`);
  expect(infRounds > 200, ctx, `balayage ∞ suffisant (${infRounds})`);

  // Sécurité : deux graines différentes NE doivent PAS donner la même grille
  // (sinon l'« invariant » serait trivialement vrai et sans valeur).
  const base = { figures: ["noire", "croche", "double"], level: 2, meter: "4/4", note: "D", measures: "8" };
  const gA = boundedAbc(Object.assign({}, base, { seed: 1 }));
  const gB = boundedAbc(Object.assign({}, base, { seed: 2 }));
  expect(gA !== gB, ctx, "graines différentes -> grilles différentes (invariant non trivial)");
})();

/* ---------- rapport ---------- */
if (failures.length) {
  console.error(`test-share : ÉCHEC — ${failures.length} problème(s) sur ${checks} vérifications :`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`test-share : OK — ${checks} vérifications passées.`);
