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
 *      reproduit la grille d'origine ;
 *  (g) règle de liaison (endsOnBeat) et règles de pose de Composer (canTie,
 *      canDot) en /4, en /2, en /8 simple et en mesure composée (le temps y
 *      est la noire pointée), sans mutation de l'état ; rejet d'un lien
 *      composé qui lie au milieu d'un temps ;
 *  (h) triolets : assemblage (« (3 », ligature, instants exacts au tiers de
 *      temps, triolet de noires en /2), règles pures de Composer (ouvrir un
 *      triolet, figures permises dans un triolet ouvert, cases remplies,
 *      liaison et point autour d'un triolet), aller-retour du lien composé
 *      et rejet des triolets invalides.
 * Les balayages couvrent toutes les signatures permises.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const {
  assembleComposed, encodeComposed, decodeComposed, decodeShare, encodeShare,
  figureBeats, eventBeats, endsOnBeat, canTie, canDot,
  canOpenTriplet, tripletFigures, tripletFilled
} = require(path.join(ROOT, "js", "generator.js"));
const { analyzeMeter, allMeters } = require(path.join(ROOT, "js", "meter.js"));
const METERS = allMeters();

let checks = 0;
const failures = [];
function expect(cond, ctx, msg) {
  checks++;
  if (!cond) failures.push(`${ctx} — ${msg}`);
  return cond;
}

/* Durée en temps d'une figure sous une signature (mêmes conventions que le
   générateur : en x/2 le temps vaut une blanche, en mesure composée une
   noire pointée). */
const beats = (meter) => analyzeMeter(meter).beats;
const figBeats = (fig, meter, dot) => figureBeats(fig, meter, dot);
/* L'événement qui vaut un temps : la figure du temps, pointée en composée. */
const beatEvent = (meter) => {
  const info = analyzeMeter(meter);
  return { fig: info.beatFigure, dot: info.beatDotted };
};
/* Nombre de croches dans une mesure. */
const eighthsPerBar = (meter) => analyzeMeter(meter).numerator * 8 / analyzeMeter(meter).denominator;

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
  // temps est la noire en x/4, la blanche en x/2, la croche en /8 simple, la
  // noire pointée en mesure composée.
  for (const meter of METERS) {
    const b = beats(meter);
    const measures = measuresFromEvents(
      Array.from({ length: b * 3 }, () => beatEvent(meter)), meter
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
  // Mesure composée : une noire pointée par temps, des croches ligaturées par trois.
  const six = assembleComposed([
    [{ d: 1 }, { d: 1 / 3 }, { d: 1 / 3 }, { d: 1 / 3 }]
  ], { meter: "6/8", note: "D," });
  expect(six.bars[0] === "D,3 D,D,D,", "6/8", `noire pointée puis trois croches ligaturées (${six.bars[0]})`);
  expect(six.notes.map((n) => n.startBeats).join(",") === "0,1," + (1 + 1 / 3) + "," + (1 + 2 / 3) ||
    six.notes[1].startBeats === 1, "6/8", "le deuxième temps commence pile à 1");

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
  // Motifs valides pour toute signature (remplissent une mesure entière) :
  // une mesure de temps, puis une mesure de croches dont la première est un
  // demi-soupir et la dernière est liée à la mesure suivante.
  const patterns = (meter) => {
    const beatsBar = Array.from({ length: beats(meter) }, () => beatEvent(meter));
    const eighths = Array.from({ length: eighthsPerBar(meter) }, (_, i) => ({ fig: "croche", rest: i === 0 }));
    // (un silence n'est jamais lié : en 1/8, l'unique croche reste un demi-soupir)
    eighths[eighths.length - 1].tie = !eighths[eighths.length - 1].rest;
    return beatsBar.concat(eighths, beatsBar);
  };

  let round = 0;
  for (const meter of METERS) {
    for (const note of NOTES) {
      const events = patterns(meter);
      const st = { meter, note, events };
      const enc = encodeComposed(st);
      expect(/^[0-9a-zA-Z=&]+$/.test(enc), ctx, `encodage sûr pour un fragment d'URL (${enc})`);
      const dec = decodeComposed(enc);
      if (!expect(dec !== null, ctx, `décodage non nul (${enc})`)) continue;
      expect(dec.meter === meter && dec.note === note, ctx, `signature + note préservées (${enc})`);
      expect(JSON.stringify(dec.events) === JSON.stringify(events.map((e) => ({
        fig: e.fig, rest: !!e.rest, dot: !!e.dot, tie: !!e.tie, triplet: false
      }))), ctx, `suite d'événements préservée (${enc})`);
      round++;
    }
  }
  expect(round === METERS.length * NOTES.length, ctx, `balayage suffisant (${round})`);

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
  const seed = encodeShare({ seed: 42, figures: ["noire", "croche"], techniques: ["rests"], meter: "4/4", note: "D", measures: "8" });
  expect(decodeComposed(seed) === null, ctx, "format graine rejeté par decodeComposed");
  expect(decodeShare(good) === null, ctx, "format contenu rejeté par decodeShare");

  const bad = [
    ["", "chaîne vide"],
    [null, "null"],
    [42, "non-chaîne"],
    ["c=2&m=44&n=D", "clé e manquante"],
    ["m=44&n=D&e=nnnn", "marqueur c manquant"],
    ["c=1&m=44&n=D&e=2222", "ancienne version (c=1)"],
    ["c=3&m=44&n=D&e=2222", "version inconnue"],
    ["c=2&m=23&n=D&e=", "flux vide"],
    ["c=2&m=99&n=D&e=222", "signature hors domaine"],
    ["c=2&m=134&n=D&e=222", "numérateur au-delà de 12"],
    ["c=2&m=416&n=D&e=222", "dénominateur /16"],
    ["c=2&m=04&n=D&e=2", "numérateur nul"],
    ["c=2&m=44&n=H&e=222", "note hors A–G"],
    ["c=2&m=44&n=D&e=zzz", "caractère hors base36 utile (z)"],
    ["c=2&m=44&n=D&e=22", "grille non close sur la signature (reste)"],
    ["c=2&m=24&n=D&e=0", "ronde qui déborde une mesure de 2/4"]
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
    "4/2": [{ fig: "blanche" }, { fig: "blanche" }, { fig: "blanche" }, { fig: "blanche" },
            { fig: "noire" }, { fig: "noire" }, { fig: "blanche" }, { fig: "blanche" }, { fig: "blanche" }],
    // 6/8 : noire–croche, sicilienne | noire pointée liée à la blanche pointée suivante
    "6/8": [{ fig: "noire" }, { fig: "croche" }, { fig: "croche", dot: true }, { fig: "double" }, { fig: "croche" },
            { fig: "noire", dot: true }, { fig: "noire", dot: true, tie: true }, { fig: "blanche", dot: true }],
    // 7/8 simple : sept croches, puis noire pointée + blanche
    "7/8": [{ fig: "croche" }, { fig: "croche" }, { fig: "croche" }, { fig: "croche" },
            { fig: "croche" }, { fig: "croche" }, { fig: "croche" },
            { fig: "noire", dot: true }, { fig: "blanche" }]
  };
  // Les autres signatures : une mesure de temps puis une mesure de croches.
  for (const meter of METERS) {
    if (build[meter]) continue;
    build[meter] = Array.from({ length: beats(meter) }, () => beatEvent(meter))
      .concat(Array.from({ length: eighthsPerBar(meter) }, () => ({ fig: "croche" })));
  }

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
  expect(rounds === METERS.length * NOTES.length, ctx, `balayage suffisant (${rounds})`);
})();

/* ---------- (g) règle de liaison et règles de pose (fonctions pures) ---------- */
(function () {
  const ctx = "règle de liaison";
  // Une liaison se fait toujours sur un début de temps : la fin de l'événement
  // lié doit tomber sur un temps entier.
  expect(endsOnBeat(0, 1) === true, ctx, "noire sur le temps : fin sur le temps 2");
  expect(endsOnBeat(0.5, 0.5) === true, ctx, "croche du contretemps : fin sur le temps suivant");
  expect(endsOnBeat(0.25, 0.25) === false, ctx, "double au milieu du temps : fin au milieu du temps");
  expect(endsOnBeat(0, 1.5) === false, ctx, "noire pointée : fin au milieu du temps 2");
  expect(endsOnBeat(2.5, 1.5) === true, ctx, "noire pointée du contretemps : fin sur le temps 4");
  expect(endsOnBeat(3, 1) === true, ctx, "fin sur la barre de mesure");
  // Mesure composée : positions et durées en noires pointées (la croche vaut 1/3).
  expect(endsOnBeat(2 / 3, 1 / 3) === true, ctx, "6/8 : troisième croche du temps, fin sur le temps 2");
  expect(endsOnBeat(1 / 3, 1 / 3) === false, ctx, "6/8 : deuxième croche, fin au milieu du temps");
  expect(endsOnBeat(0, figureBeats("noire", "6/8", false)) === false, ctx, "6/8 : noire sur le temps, fin au milieu du temps");
  expect(endsOnBeat(0, figureBeats("noire", "6/8", true)) === true, ctx, "6/8 : noire pointée, fin sur le temps 2");
})();

(function () {
  const ctx = "peut lier";
  // Construit l'état de composition : mesures pleines + mesure ouverte, comme la page.
  const comp = (meter, events) => {
    const b = beats(meter);
    const measures = [];
    let bar = [], sum = 0;
    for (const e of events) {
      const ev = { fig: e.fig, rest: !!e.rest, dot: !!e.dot, tie: !!e.tie };
      bar.push(ev);
      sum += figBeats(ev.fig, meter, ev.dot);
      if (Math.abs(sum - b) < 1e-9) { measures.push(bar); bar = []; sum = 0; }
    }
    measures.push(bar);
    return { meter, measures };
  };
  const N = (fig, extra) => Object.assign({ fig }, extra || {});

  expect(canTie(comp("4/4", [])) === false, ctx, "grille vide : rien à lier");
  expect(canTie(comp("4/4", [N("noire")])) === true, ctx, "noire sur le temps 1 : liaison permise");
  expect(canTie(comp("4/4", [N("croche")])) === false, ctx, "croche seule : fin au milieu du temps");
  expect(canTie(comp("4/4", [N("croche"), N("croche")])) === true, ctx, "deuxième croche : fin sur le temps 2");
  expect(canTie(comp("4/4", [N("double"), N("double")])) === false, ctx, "deux doubles : fin au milieu du temps");
  expect(canTie(comp("4/4", [N("noire", { dot: true })])) === false, ctx, "noire pointée : fin au milieu du temps");
  expect(canTie(comp("4/4", [N("noire", { dot: true }), N("croche")])) === true, ctx, "croche après la pointée : fin sur le temps");
  expect(canTie(comp("4/4", [N("noire", { rest: true })])) === false, ctx, "silence : jamais lié");
  expect(canTie(comp("2/4", [N("blanche")])) === true, ctx, "note qui ferme la mesure : liaison par-dessus la barre");
  expect(canTie(comp("2/4", [N("blanche"), N("croche")])) === false, ctx, "croche en début de mesure suivante : fin au milieu du temps");
  // En /2, le temps est la blanche.
  expect(canTie(comp("2/2", [N("noire")])) === false, ctx, "2/2 : noire seule finit au milieu du temps (blanche)");
  expect(canTie(comp("2/2", [N("noire"), N("noire")])) === true, ctx, "2/2 : deux noires finissent sur le temps");
  expect(canTie(comp("3/2", [N("croche"), N("croche")])) === false, ctx, "3/2 : deux croches finissent au milieu du temps");
  expect(canTie(comp("4/2", [N("blanche")])) === true, ctx, "4/2 : blanche sur le temps");
  // En mesure composée, le temps est la noire pointée.
  expect(canTie(comp("6/8", [N("noire", { dot: true })])) === true, ctx, "6/8 : noire pointée sur le temps");
  expect(canTie(comp("6/8", [N("noire")])) === false, ctx, "6/8 : noire seule finit au milieu du temps");
  expect(canTie(comp("6/8", [N("noire"), N("croche")])) === true, ctx, "6/8 : noire–croche finit sur le temps");
  expect(canTie(comp("6/8", [N("croche"), N("croche")])) === false, ctx, "6/8 : deux croches finissent au milieu du temps");
  expect(canTie(comp("9/8", [N("croche"), N("croche"), N("croche")])) === true, ctx, "9/8 : trois croches finissent sur le temps");
  expect(canTie(comp("12/8", [N("blanche", { dot: true }), N("croche"), N("noire")])) === true, ctx,
    "12/8 : croche–noire du troisième temps finit sur le temps 4");
  // En /8 simple, le temps est la croche.
  expect(canTie(comp("7/8", [N("croche")])) === true, ctx, "7/8 : croche sur le temps");
  expect(canTie(comp("5/8", [N("double")])) === false, ctx, "5/8 : double seule finit au milieu du temps");

  // L'état n'est jamais muté.
  const st = comp("4/4", [N("croche"), N("croche", { tie: true }), N("noire")]);
  const before = JSON.stringify(st);
  canTie(st);
  canDot(st);
  expect(JSON.stringify(st) === before, ctx, "état de composition intact après appel");
})();

(function () {
  const ctx = "point permis";
  const comp = (meter, events) => {
    const b = beats(meter);
    const measures = [];
    let bar = [], sum = 0;
    for (const e of events) {
      const ev = { fig: e.fig, rest: !!e.rest, dot: !!e.dot, tie: !!e.tie };
      bar.push(ev);
      sum += figBeats(ev.fig, meter, ev.dot);
      if (Math.abs(sum - b) < 1e-9) { measures.push(bar); bar = []; sum = 0; }
    }
    measures.push(bar);
    return { meter, measures };
  };
  const N = (fig, extra) => Object.assign({ fig }, extra || {});

  expect(canDot(comp("4/4", [])) === false, ctx, "grille vide : rien à pointer");
  expect(canDot(comp("4/4", [N("noire")])) === true, ctx, "noire libre : point permis");
  expect(canDot(comp("4/4", [N("noire", { rest: true })])) === false, ctx, "silence : jamais pointé");
  expect(canDot(comp("2/4", [N("noire"), N("noire")])) === false, ctx, "la note ferme sa mesure : le point ne tient pas");
  expect(canDot(comp("4/4", [N("noire"), N("croche"), N("blanche")])) === false, ctx, "le temps ajouté déborde la mesure");
  // Le point déplacerait une liaison posée au milieu d'un temps.
  expect(canDot(comp("4/4", [N("noire", { tie: true })])) === false, ctx, "noire liée : la pointée finirait au milieu du temps");
  expect(canDot(comp("4/4", [N("blanche", { tie: true })])) === true, ctx, "blanche liée : la pointée finit sur le temps 4");
  expect(canDot(comp("4/4", [N("croche"), N("croche", { tie: true })])) === false, ctx, "croche liée : la croche pointée finirait au milieu du temps");
  // Retirer le point obéit à la même règle.
  expect(canDot(comp("4/4", [N("croche"), N("noire", { dot: true, tie: true })])) === false, ctx,
    "retirer le point ferait tomber la liaison au milieu du temps");
  expect(canDot(comp("4/4", [N("croche"), N("noire", { dot: true })])) === true, ctx, "sans liaison, le point se retire");
  // En /2, la règle se mesure au temps de la blanche.
  expect(canDot(comp("4/2", [N("noire"), N("blanche", { dot: true, tie: true })])) === false, ctx,
    "4/2 : retirer le point laisserait la liaison au milieu d'un temps (blanche)");
  expect(canDot(comp("4/4", [N("noire"), N("blanche", { dot: true, tie: true })])) === true, ctx,
    "4/4 : les mêmes figures restent sur le temps (noire)");
  expect(canDot(comp("2/2", [N("blanche", { tie: true })])) === false, ctx, "2/2 : blanche liée pointée finirait au milieu du temps");
  // Mesure composée : la noire pointée remplit le temps.
  expect(canDot(comp("6/8", [N("noire")])) === true, ctx, "6/8 : noire pointée permise");
  expect(canDot(comp("6/8", [N("croche")])) === true, ctx, "6/8 : croche pointée (sicilienne) permise");
  expect(canDot(comp("6/8", [N("noire", { dot: true }), N("blanche")])) === false, ctx,
    "6/8 : la blanche pointée déborderait la mesure");
  expect(canDot(comp("6/8", [N("noire", { dot: true, tie: true })])) === false, ctx,
    "6/8 : retirer le point laisserait la liaison au milieu du temps");
  expect(canDot(comp("6/8", [N("noire", { tie: true })])) === true, ctx,
    "6/8 : pointer une noire liée la ramène sur le temps");
})();

(function () {
  const ctx = "decode composé : règle de liaison";
  const midBeat = encodeComposed({ meter: "4/4", note: "D", events: [
    { fig: "croche", tie: true }, { fig: "croche" }, { fig: "noire" }, { fig: "blanche" }
  ] });
  expect(decodeComposed(midBeat) === null, ctx, "liaison au milieu d'un temps rejetée");
  const onBeat = encodeComposed({ meter: "4/4", note: "D", events: [
    { fig: "croche" }, { fig: "croche", tie: true }, { fig: "noire" }, { fig: "blanche" }
  ] });
  expect(decodeComposed(onBeat) !== null, ctx, "liaison sur un début de temps acceptée");
})();

/* ---------- (h) triolets ---------- */
const T = (fig, extra) => Object.assign({ fig, triplet: true }, extra || {});
const N = (fig, extra) => Object.assign({ fig }, extra || {});
/* État de composition comme la page : mesures pleines + mesure ouverte. */
function composition(meter, events, openTriplet) {
  const b = beats(meter);
  const measures = [];
  let bar = [], sum = 0;
  for (const e of events) {
    const ev = { fig: e.fig, rest: !!e.rest, dot: !!e.dot, tie: !!e.tie, triplet: !!e.triplet };
    bar.push(ev);
    sum += eventBeats(ev, meter);
    if (Math.abs(sum - b) < 1e-9) { measures.push(bar); bar = []; sum = 0; }
  }
  measures.push(bar);
  return { meter, measures, openTriplet: !!openTriplet };
}
/* Mesures { d, rest, tie, triplet } d'une liste d'événements riches. */
const toD = (meter, events) => composition(meter, events).measures
  .filter((bar) => bar.length)
  .map((bar) => bar.map((e) => ({ d: eventBeats(e, meter), rest: e.rest, tie: e.tie, triplet: e.triplet })));

(function () {
  const ctx = "triolet · assemblage";
  expect(Math.abs(eventBeats(T("croche"), "4/4") - 1 / 3) < 1e-12, ctx, "croche de triolet : 1/3 de temps en 4/4");
  expect(Math.abs(eventBeats(T("noire"), "2/2") - 1 / 3) < 1e-12, ctx, "noire de triolet : 1/3 de temps en 2/2");
  expect(eventBeats(N("noire", { dot: true }), "4/4") === 1.5, ctx, "eventBeats suit figureBeats hors triolet");

  const four = assembleComposed(toD("4/4", [
    T("croche"), T("croche", { rest: true }), T("croche"), N("noire"), N("blanche")
  ]), { meter: "4/4", note: "D," });
  expect(four.bars[0] === "(3D,zD, D,2 D,4", ctx, `triolet gravé « (3 » et ligaturé (${four.bars[0]})`);
  const starts = four.notes.map((n) => n.startBeats);
  expect(starts[0] === 0 && starts[3] === 1 && starts[4] === 2, ctx, `débuts de temps entiers exacts (${starts})`);
  expect(Math.abs(starts[1] - 1 / 3) < 1e-12 && Math.abs(starts[2] - 2 / 3) < 1e-12, ctx, `tiers de temps exacts (${starts})`);
  expect(four.notes[1].isRest && !four.notes[0].isRest, ctx, "silence interne au triolet dans la timeline");
  expect(four.notes.slice(0, 3).every((n) => Math.abs(n.durationBeats - 1 / 3) < 1e-12), ctx, "trois tiers de temps");

  const half = assembleComposed(toD("2/2", [T("noire"), T("noire"), T("noire"), N("blanche")]), { meter: "2/2", note: "D," });
  expect(half.bars[0] === "(3D,2D,2D,2 D,4", ctx, `triolet de noires en 2/2 (${half.bars[0]})`);
  expect(half.header.indexOf("L:1/8") !== -1, ctx, "unité L:1/8 en 2/2 avec des noires de triolet");

  // Deux triolets de suite, puis une liaison qui sort du second par-dessus la barre.
  const chain = assembleComposed(toD("2/4", [
    T("croche"), T("croche"), T("croche"), T("croche"), T("croche"), T("croche", { tie: true }),
    N("blanche")
  ]), { meter: "2/4", note: "D," });
  expect(chain.bars[0] === "(3D,D,D, (3D,D,D,-", ctx, `deux triolets, liaison sortante (${chain.bars[0]})`);
  expect(chain.notes[5].tiedToNext === true && chain.notes[6].startBeats === 2, ctx, "la liaison sortante tombe sur la barre");

  // Somme exacte sur de nombreuses mesures de triolets.
  const many = assembleComposed(toD("3/4", Array.from({ length: 9 * 30 }, () => T("croche"))), { meter: "3/4", note: "D," });
  expect(many.bars.length === 30, ctx, `30 mesures de triolets (${many.bars.length})`);
  expect(many.notes.every((n, i) => i % 3 !== 0 || n.startBeats === i / 3), ctx, "chaque triolet commence sur un temps entier exact");
})();

(function () {
  const ctx = "triolet · peut ouvrir";
  expect(canOpenTriplet(composition("4/4", [])) === true, ctx, "grille vide en 4/4");
  expect(canOpenTriplet(composition("4/4", [N("noire")])) === true, ctx, "après une noire : début de temps");
  expect(canOpenTriplet(composition("4/4", [N("croche")])) === false, ctx, "après une croche : milieu de temps");
  expect(canOpenTriplet(composition("4/4", [N("croche"), N("croche")])) === true, ctx, "après deux croches : début de temps");
  expect(canOpenTriplet(composition("4/4", [N("noire", { dot: true })])) === false, ctx, "après une noire pointée : milieu de temps");
  expect(canOpenTriplet(composition("2/4", [N("blanche")])) === true, ctx, "mesure pleine : début de la suivante");
  expect(canOpenTriplet(composition("4/4", [T("croche"), T("croche"), T("croche")])) === true, ctx, "après un triolet complet");
  expect(canOpenTriplet(composition("4/4", [], true)) === false, ctx, "triolet déjà ouvert");
  expect(canOpenTriplet(composition("4/4", [T("croche")], true)) === false, ctx, "triolet en cours");
  expect(canOpenTriplet(composition("2/2", [])) === true, ctx, "2/2 : début de temps");
  expect(canOpenTriplet(composition("2/2", [N("noire")])) === false, ctx, "2/2 : noire seule, milieu du temps (blanche)");
  expect(canOpenTriplet(composition("3/2", [N("noire"), N("noire")])) === true, ctx, "3/2 : deux noires, début de temps");
  expect(canOpenTriplet(composition("4/4", [N("noire", { tie: true })])) === true, ctx, "liaison en attente : le triolet peut l'accueillir");
  for (const meter of ["6/8", "9/8", "12/8"]) {
    expect(canOpenTriplet(composition(meter, [])) === false, ctx, `${meter} : jamais en mesure composée`);
  }
  for (const meter of ["3/8", "5/8", "7/8"]) {
    expect(canOpenTriplet(composition(meter, [])) === false, ctx, `${meter} : jamais en /8`);
  }
  for (const meter of METERS) {
    const info = analyzeMeter(meter);
    const want = !info.compound && info.denominator !== 8;
    expect(canOpenTriplet(composition(meter, [])) === want, ctx, `${meter} : ouverture ${want ? "permise" : "refusée"}`);
  }
})();

(function () {
  const ctx = "triolet · figures permises";
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  expect(same(tripletFigures(composition("4/4", [])), []), ctx, "aucun triolet ouvert : rien");
  expect(same(tripletFigures(composition("4/4", [], true)),
    [{ fig: "croche", rest: false }, { fig: "croche", rest: true }]), ctx, "4/4 : croche ou demi-soupir");
  expect(same(tripletFigures(composition("3/4", [T("croche"), T("croche", { rest: true })], true)),
    [{ fig: "croche", rest: false }, { fig: "croche", rest: true }]), ctx, "3/4 : après un silence interne");
  expect(same(tripletFigures(composition("2/2", [N("blanche")], true)),
    [{ fig: "noire", rest: false }, { fig: "noire", rest: true }]), ctx, "2/2 : noire ou soupir");
  expect(same(tripletFigures(composition("4/4", [N("noire", { tie: true })], true)),
    [{ fig: "croche", rest: false }]), ctx, "liaison en attente : pas de silence");

  expect(tripletFilled(composition("4/4", [])) === null, ctx, "aucun triolet ouvert : null");
  expect(tripletFilled(composition("4/4", [N("noire")], true)) === 0, ctx, "triolet vide : 0");
  expect(tripletFilled(composition("4/4", [N("noire"), T("croche")], true)) === 1, ctx, "une case remplie");
  expect(tripletFilled(composition("4/4", [T("croche"), T("croche"), T("croche"), T("croche"), T("croche")], true)) === 2, ctx,
    "deux cases du second triolet");
})();

(function () {
  const ctx = "triolet · liaison et point";
  expect(canTie(composition("4/4", [T("croche")], true)) === false, ctx, "première note d'un triolet : jamais liée");
  expect(canTie(composition("4/4", [N("noire")], true)) === false, ctx, "triolet ouvert : la liaison est grisée");
  expect(canTie(composition("4/4", [T("croche"), T("croche"), T("croche")])) === true, ctx,
    "troisième note du triolet : la liaison tombe sur le temps");
  expect(canTie(composition("4/4", [T("croche"), T("croche"), T("croche", { rest: true })])) === false, ctx,
    "silence final du triolet : jamais lié");
  expect(canDot(composition("4/4", [T("croche"), T("croche"), T("croche")])) === false, ctx, "note de triolet : jamais pointée");
  expect(canDot(composition("4/4", [N("noire")], true)) === false, ctx, "triolet ouvert : le point est grisé");

  const st = composition("4/4", [N("noire"), T("croche")], true);
  const before = JSON.stringify(st);
  canOpenTriplet(st); tripletFigures(st); tripletFilled(st); canTie(st); canDot(st);
  expect(JSON.stringify(st) === before, ctx, "état de composition intact après appel");
})();

(function () {
  const ctx = "triolet · lien composé";
  const NOTES = ["E", "D"];
  const grids = {
    "4/4": [T("croche"), T("croche", { rest: true }), T("croche"), N("noire"), N("croche"), N("croche"),
      T("croche"), T("croche"), T("croche", { tie: true }),
      N("noire"), T("croche", { rest: true }), T("croche"), T("croche"), N("blanche")],
    "2/2": [T("noire"), T("noire"), T("noire", { tie: true }), N("blanche")],
    "3/4": [N("noire", { tie: true }), T("croche"), T("croche"), T("croche"), N("noire")],
    "2/4": [T("croche"), T("croche"), T("croche"), T("croche"), T("croche"), T("croche")]
  };
  for (const meter of Object.keys(grids)) {
    for (const note of NOTES) {
      const events = grids[meter];
      const enc = encodeComposed({ meter, note, events });
      expect(/^[0-9a-zA-Z=&]+$/.test(enc), ctx, `encodage sûr pour un fragment d'URL (${enc})`);
      const dec = decodeComposed(enc);
      if (!expect(dec !== null, ctx, `décodage non nul (${meter} : ${enc})`)) continue;
      expect(JSON.stringify(dec.events) === JSON.stringify(events.map((e) => ({
        fig: e.fig, rest: !!e.rest, dot: !!e.dot, tie: !!e.tie, triplet: !!e.triplet
      }))), ctx, `triolets préservés (${meter} : ${enc})`);
      const original = assembleComposed(toD(meter, events), { meter, note: note + "," });
      const rebuilt = assembleComposed(dec.measures.map((bar) => bar.map((e) => ({
        d: eventBeats(e, meter), rest: e.rest, tie: e.tie, triplet: e.triplet
      }))), { meter, note: note + "," });
      expect(rebuilt.abc === original.abc, ctx, `grille reproduite après aller-retour (${meter})`);
      expect(JSON.stringify(rebuilt.notes) === JSON.stringify(original.notes), ctx, `timeline reproduite (${meter})`);
    }
  }

  // Liens invalides : triolet mal placé, mal formé ou hors signature.
  const encode = (meter, events) => encodeComposed({ meter, note: "D", events });
  const bad = [
    [encode("4/4", [N("croche"), T("croche"), T("croche"), T("croche"), N("croche"), N("noire"), N("noire")]),
      "triolet hors d'un début de temps"],
    [encode("4/4", [T("croche", { tie: true }), T("croche"), T("croche"), N("noire"), N("blanche")]),
      "liaison au milieu d'un triolet"],
    [encode("4/4", [T("noire"), T("noire"), T("noire"), N("blanche")]), "figure de triolet invalide en 4/4"],
    [encode("4/4", [T("croche", { dot: true }), T("croche"), T("croche"), N("noire"), N("blanche")]), "note de triolet pointée"],
    ["c=2&m=44&n=D&e=T33", "triolet incomplet"],
    ["c=2&m=44&n=D&e=T3332T", "marqueur de triolet sans notes"],
    ["c=2&m=68&n=D&e=T333T333", "triolet en mesure composée"],
    ["c=2&m=38&n=D&e=T444", "triolet en /8"]
  ];
  for (const [str, why] of bad) {
    expect(decodeComposed(str) === null, ctx, `rejeté : ${why} (${str})`);
  }
})();

/* ---------- rapport ---------- */
if (failures.length) {
  console.error(`test-composer : ÉCHEC — ${failures.length} problème(s) sur ${checks} vérifications :`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`test-composer : OK — ${checks} vérifications passées.`);
