/*
 * Harnais de test de la grille composée (mode Composer).
 * Usage : node scripts/test-composer.mjs
 *
 * Vérifie la couche pure de js/generator.js dédiée à la composition manuelle :
 *  (a) assembleComposed : contrat identique à generateExercise
 *      ({ abc, notes, bars, header }), sommes de mesures exactes, ligatures,
 *      timeline cohérente ;
 *  (b) point (note ×1,5) : durée et jeton ABC attendus ;
 *  (c) liaison, y compris à cheval sur la barre de mesure, et neutralisation
 *      d'une liaison pendante (fin de grille ou vers un silence) ;
 *  (d) encodeComposed/decodeComposed : aller-retour exact du contenu, format
 *      sûr pour un fragment d'URL, distinction du format graine ;
 *  (e) rejet (null) des liens composés corrompus ou hors domaine ;
 *  (f) invariant bout-en-bout : contenu -> encode -> decode -> assembleComposed
 *      reproduit la grille d'origine.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const generatorPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "js", "generator.js");
const {
  assembleComposed, encodeComposed, decodeComposed, decodeShare, encodeShare,
  figureBeats, METERS
} = require(generatorPath);

let checks = 0;
const failures = [];
function expect(cond, ctx, msg) {
  checks++;
  if (!cond) failures.push(`${ctx} — ${msg}`);
  return cond;
}

/* Durée en temps d'une figure sous une signature (mêmes conventions que le
   générateur : en x/2 le temps vaut une blanche). */
const den = (meter) => parseInt(meter.split("/")[1], 10);
const beats = (meter) => parseInt(meter.split("/")[0], 10);
const figBeats = (fig, meter, dot) => figureBeats(fig, den(meter), dot);

/* Construit des mesures { d, rest, tie } à partir d'une liste plate rich
   { fig, rest, dot, tie } et d'une signature (remplissage strict). */
function measuresFromEvents(events, meter) {
  const b = beats(meter);
  const out = [];
  let bar = [], sum = 0;
  for (const e of events) {
    const d = figBeats(e.fig, meter, e.dot);
    bar.push({ d, rest: !!e.rest, tie: !!e.tie });
    sum += d;
    if (Math.abs(sum - b) < 1e-9) { out.push(bar); bar = []; sum = 0; }
  }
  if (bar.length) out.push(bar);
  return out;
}

/* ---------- (a) contrat + sommes + timeline ---------- */
(function () {
  const ctx = "assembleComposed";
  // 4/4 : quatre noires -> une mesure pleine.
  const res = assembleComposed([[
    { d: 1 }, { d: 1 }, { d: 1 }, { d: 1 }
  ]], { meter: "4/4", note: "D," });

  expect(typeof res.abc === "string" && res.abc.indexOf("K:C clef=bass") !== -1, ctx, "en-tête ABC présent");
  expect(Array.isArray(res.notes) && Array.isArray(res.bars), ctx, "notes et bars sont des tableaux");
  expect(res.header.indexOf("M:4/4") !== -1, ctx, "signature dans l'en-tête");
  expect(res.bars.length === 1, ctx, "une seule mesure");
  expect(res.notes.length === 4, ctx, "quatre événements de timeline");
  expect(res.notes.map((n) => n.startBeats).join(",") === "0,1,2,3", ctx, "attaques aux temps 0,1,2,3");
  expect(res.notes.every((n) => n.durationBeats === 1 && !n.isRest), ctx, "quatre noires d'un temps");
  expect(res.abc.trim().endsWith("|]"), ctx, "barre de fin");

  // Ligature par temps : deux croches sur le temps 1 forment un groupe.
  const lig = assembleComposed([[
    { d: 0.5 }, { d: 0.5 }, { d: 1 }, { d: 2 }
  ]], { meter: "4/4", note: "D," });
  expect(/D,D,\s/.test(lig.bars[0]), ctx, "deux croches ligaturées sur un temps (D,D,)");

  // Sommes exactes sur plusieurs mesures / signatures : la figure qui vaut un
  // temps est la noire en x/4, la blanche en x/2.
  for (const meter of METERS) {
    const b = beats(meter);
    const beatFig = den(meter) === 2 ? "blanche" : "noire";
    const measures = measuresFromEvents(
      Array.from({ length: b * 3 }, () => ({ fig: beatFig })), meter
    );
    const r = assembleComposed(measures, { meter, note: "E," });
    const totalBeats = r.notes.reduce((s, n) => s + n.durationBeats, 0);
    expect(r.bars.length === 3, ctx, `trois mesures pleines (${meter})`);
    expect(Math.abs(totalBeats - r.bars.length * b) < 1e-9, ctx, `sommes de mesures exactes (${meter})`);
  }
})();

/* ---------- (b) point (note ×1,5) ---------- */
(function () {
  const ctx = "point";
  // Noire pointée (1,5) + croche (0,5) + deux noires -> mesure pleine 4/4.
  const res = assembleComposed([[
    { d: 1.5 }, { d: 0.5 }, { d: 1 }, { d: 1 }
  ]], { meter: "4/4", note: "D," });
  expect(res.notes[0].durationBeats === 1.5, ctx, "première note tient 1,5 temps");
  expect(res.abc.indexOf("D,3") !== -1, ctx, "noire pointée gravée D,3 (L:1/8)");
  expect(Math.abs(res.notes.reduce((s, n) => s + n.durationBeats, 0) - 4) < 1e-9, ctx, "mesure pleine");
})();

/* ---------- (c) liaison + neutralisation ---------- */
(function () {
  const ctx = "liaison";
  // Liaison à cheval sur la barre : dernier événement de la mesure 1 lié au
  // premier de la mesure 2.
  const cross = assembleComposed([
    [{ d: 2 }, { d: 1 }, { d: 1, tie: true }],
    [{ d: 1 }, { d: 1 }, { d: 2 }]
  ], { meter: "4/4", note: "D," });
  expect(cross.notes[2].tiedToNext === true, ctx, "événement frontière lié");
  expect(cross.notes[3].tiedToNext === false, ctx, "cible de la liaison non liée");
  expect(/D,2-\s*\|/.test(cross.abc), ctx, "liaison gravée avant la barre (D,2-)");

  // Liaison pendante en fin de grille : neutralisée.
  const trailing = assembleComposed([
    [{ d: 2 }, { d: 2, tie: true }]
  ], { meter: "4/4", note: "D," });
  expect(trailing.notes[1].tiedToNext === false, ctx, "liaison finale neutralisée (timeline)");
  expect(trailing.abc.indexOf("-") === -1, ctx, "aucune liaison gravée en fin de grille");

  // Liaison vers un silence : neutralisée.
  const toRest = assembleComposed([
    [{ d: 2, tie: true }, { d: 2, rest: true }]
  ], { meter: "4/4", note: "D," });
  expect(toRest.notes[0].tiedToNext === false, ctx, "liaison vers un silence neutralisée");
})();

/* ---------- (d) aller-retour encode/decode ---------- */
(function () {
  const ctx = "encode/decode composé";
  const NOTES = ["E", "F", "G", "A", "B", "C", "D"];
  // Motifs valides pour toute signature (remplissent une mesure entière).
  const patterns = {
    "4/4": [
      [{ fig: "noire" }, { fig: "noire" }, { fig: "noire" }, { fig: "noire" }],
      [{ fig: "blanche" }, { fig: "noire", dot: true }, { fig: "croche" }],
      [{ fig: "noire" }, { fig: "croche", rest: true }, { fig: "croche" }, { fig: "blanche" }]
    ],
    "3/4": [[{ fig: "noire" }, { fig: "noire" }, { fig: "noire" }]],
    "2/4": [[{ fig: "noire" }, { fig: "croche" }, { fig: "croche" }]],
    "4/2": [[{ fig: "blanche" }, { fig: "blanche" }, { fig: "blanche" }, { fig: "blanche" }]],
    "3/2": [[{ fig: "blanche" }, { fig: "blanche" }, { fig: "blanche" }]],
    "2/2": [[{ fig: "blanche" }, { fig: "noire" }, { fig: "noire" }]]
  };

  let round = 0;
  for (const meter of METERS) {
    for (const note of NOTES) {
      // Concatène deux mesures pour une grille non triviale.
      const pats = patterns[meter];
      const events = pats[0].concat(pats[pats.length - 1]);
      const st = { meter, note, events };
      const enc = encodeComposed(st);
      expect(/^[0-9a-zA-Z=&]+$/.test(enc), ctx, `encodage sûr pour un fragment d'URL (${enc})`);
      const dec = decodeComposed(enc);
      if (!expect(dec !== null, ctx, `décodage non nul (${enc})`)) continue;
      expect(dec.meter === meter && dec.note === note, ctx, `signature + note préservées (${enc})`);
      expect(JSON.stringify(dec.events) === JSON.stringify(events.map((e) => ({
        fig: e.fig, rest: !!e.rest, dot: !!e.dot, tie: !!e.tie
      }))), ctx, `suite d'événements préservée (${enc})`);
      round++;
    }
  }
  expect(round > 30, ctx, `balayage suffisant (${round})`);

  // Longueur raisonnable : 16 mesures de noires en 4/4 -> ~70 caractères.
  const long = encodeComposed({
    meter: "4/4", note: "D",
    events: Array.from({ length: 64 }, () => ({ fig: "noire" }))
  });
  expect(long.length < 140, ctx, `URL de longueur raisonnable pour 16 mesures (${long.length} car.)`);

  // Un événement par caractère dans le flux « e ».
  expect(long.split("e=")[1].length === 64, ctx, "un caractère par événement");
})();

/* ---------- (e) distinction des formats + rejet des liens invalides ---------- */
(function () {
  const ctx = "decode composé invalide";
  const good = encodeComposed({ meter: "4/4", note: "D", events: [
    { fig: "noire" }, { fig: "noire" }, { fig: "noire" }, { fig: "noire" }
  ] });
  expect(decodeComposed(good) !== null, ctx, "témoin composé valide accepté");

  // Distinction stricte des deux formats.
  const seed = encodeShare({ seed: 42, figures: ["noire", "croche"], level: 2, meter: "4/4", note: "D", measures: "8" });
  expect(decodeComposed(seed) === null, ctx, "format graine rejeté par decodeComposed");
  expect(decodeShare(good) === null, ctx, "format contenu rejeté par decodeShare");

  const bad = [
    ["", "chaîne vide"],
    [null, "null"],
    [42, "non-chaîne"],
    ["c=1&m=44&n=D", "clé e manquante"],
    ["m=44&n=D&e=nnnn", "marqueur c manquant"],
    ["c=2&m=44&n=D&e=aaaa", "version inconnue"],
    ["c=1&m=23&n=D&e=", "flux vide"],
    ["c=1&m=99&n=D&e=222", "signature hors domaine"],
    ["c=1&m=44&n=H&e=222", "note hors A–G"],
    ["c=1&m=44&n=D&e=zzz", "caractère hors base36 utile (z)"],
    ["c=1&m=44&n=D&e=22", "grille non close sur la signature (reste)"],
    ["c=1&m=24&n=D&e=0", "ronde qui déborde une mesure de 2/4"]
  ];
  for (const [str, why] of bad) {
    expect(decodeComposed(str) === null, ctx, `rejeté : ${why}`);
  }
})();

/* ---------- (f) invariant bout-en-bout ---------- */
(function () {
  const ctx = "invariant de partage composé";
  const NOTES = ["E", "G", "D"];
  // Chaque motif ferme des mesures entières ; certains portent point et liaison.
  const build = {
    // mesure 1 (blanche, noire pointée, croche = 4) ; mesure 2 (quatre noires)
    "4/4": [{ fig: "blanche" }, { fig: "noire", dot: true }, { fig: "croche" },
            { fig: "noire" }, { fig: "noire" }, { fig: "noire" }, { fig: "noire" }],
    // liaison à cheval sur la barre (dernière noire de la mesure 1 liée)
    "3/4": [{ fig: "noire" }, { fig: "noire" }, { fig: "noire", tie: true },
            { fig: "noire" }, { fig: "croche" }, { fig: "croche" }, { fig: "noire" }],
    "2/4": [{ fig: "noire" }, { fig: "noire" },
            { fig: "croche" }, { fig: "croche" }, { fig: "noire" }],
    "4/2": [{ fig: "blanche" }, { fig: "blanche" }, { fig: "blanche" }, { fig: "blanche" },
            { fig: "noire" }, { fig: "noire" }, { fig: "blanche" }, { fig: "blanche" }, { fig: "blanche" }],
    "3/2": [{ fig: "blanche" }, { fig: "blanche" }, { fig: "blanche" }],
    "2/2": [{ fig: "blanche" }, { fig: "blanche" }]
  };

  let rounds = 0;
  for (const meter of METERS) {
    for (const note of NOTES) {
      const events = build[meter];
      const measures = measuresFromEvents(events, meter);
      const original = assembleComposed(measures, { meter, note: note + "," });

      const restored = decodeComposed(encodeComposed({ meter, note, events }));
      if (!expect(restored !== null, ctx, `décodage du partage (${meter}/${note})`)) continue;
      const rebuilt = assembleComposed(restored.measures.map((bar) => bar.map((e) => ({
        d: figBeats(e.fig, meter, e.dot), rest: e.rest, tie: e.tie
      }))), { meter, note: note + "," });
      expect(rebuilt.abc === original.abc, ctx, `grille composée reproduite après aller-retour (${meter}/${note})`);
      rounds++;
    }
  }
  expect(rounds >= 15, ctx, `balayage suffisant (${rounds})`);
})();

/* ---------- rapport ---------- */
if (failures.length) {
  console.error(`test-composer : ÉCHEC — ${failures.length} problème(s) sur ${checks} vérifications :`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`test-composer : OK — ${checks} vérifications passées.`);
