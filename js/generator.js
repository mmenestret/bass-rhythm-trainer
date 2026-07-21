/*
 * Bass Rhythm Trainer — générateur de grilles rythmiques (calibrage Agostini vol. 1).
 *
 * Fonction pure, sans DOM : generateExercise(config) -> { abc, notes }
 *   config = {
 *     figures:  ["ronde"|"blanche"|"noire"|"croche"|"double"|"triple"|"quadruple", ...],
 *     level:    1 | 2 | 3,
 *     meter:    "2/4" | "3/4" | "4/4" | "2/2" | "3/2" | "4/2",
 *     measures: 4 | 8 | 16,
 *     rng:      fonction aléatoire optionnelle (défaut Math.random)
 *   }
 *   abc   = partition ABC complète (clé de Fa, note fixe Ré grave « D, »).
 *   notes = timeline [{ startBeats, durationBeats, isRest, tiedToNext }] pour le
 *           moteur de lecture (ticket 03). startBeats/durationBeats en temps.
 *
 * Principe : chaque mesure est assemblée à partir de cellules rythmiques
 * idiomatiques d'une durée entière de temps (1, 2, 3 ou 4 temps), tirées du
 * mapping niveaux × paliers de docs/agostini-progression.md. En x/2, le temps
 * vaut une blanche : les mêmes cellules se transposent automatiquement
 * (la noire y joue le rôle de la croche, etc.).
 *
 * UMD minimal : window.BassRhythmGenerator dans la page, module.exports sous Node.
 */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && typeof module.exports === "object") {
    module.exports = factory();
  } else {
    root.BassRhythmGenerator = factory();
  }
}(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* Durées des figures en 64e de ronde (quadruple croche = 1). */
  var FIGURE_64 = {
    ronde: 64,
    blanche: 32,
    noire: 16,
    croche: 8,
    double: 4,
    triple: 2,
    quadruple: 1
  };

  var METERS = ["2/4", "3/4", "4/4", "2/2", "3/2", "4/2"];

  /* ---------- catalogue de cellules rythmiques (durées en temps) ---------- */

  function note(d) { return { d: d, rest: false, tie: false }; }
  function tiedNote(d) { return { d: d, rest: false, tie: true }; }
  function silence(d) { return { d: d, rest: true, tie: false }; }

  function repeatElems(groups, times) {
    var out = [];
    for (var i = 0; i < times; i++) {
      for (var j = 0; j < groups.length; j++) {
        out.push({ d: groups[j].d, rest: groups[j].rest, tie: groups[j].tie });
      }
    }
    return out;
  }

  function cell(id, kind, weight, elems) {
    var len = 0;
    for (var i = 0; i < elems.length; i++) len += elems[i].d;
    var lenInt = Math.round(len);
    if (Math.abs(len - lenInt) > 1e-9) {
      throw new Error("Cellule non alignée sur le temps : " + id);
    }
    return { id: id, kind: kind, weight: weight, lenInt: lenInt, elems: elems };
  }

  /*
   * kind = "base"    : niveau 1+ — notes seules (paliers A, B, C, E binaire) ;
   *        "rest"    : niveau 2+ — silences équivalents aux figures cochées ;
   *        "special" : niveau 3  — pointées, liaisons, syncopes, contretemps.
   */
  var CELLS = [
    /* --- base : valeurs longues (palier A) --- */
    cell("beat-note", "base", 10, [note(1)]),
    cell("two-beat-note", "base", 5, [note(2)]),
    cell("four-beat-note", "base", 2, [note(4)]),
    /* --- base : croches (palier B) --- */
    cell("two-halves", "base", 8, [note(0.5), note(0.5)]),
    /* --- base : doubles croches (palier C) --- */
    cell("four-quarters", "base", 6, repeatElems([note(0.25)], 4)),
    cell("half-two-quarters", "base", 5, [note(0.5), note(0.25), note(0.25)]),
    cell("two-quarters-half", "base", 5, [note(0.25), note(0.25), note(0.5)]),
    cell("syncopette", "base", 4, [note(0.25), note(0.5), note(0.25)]),
    /* --- base : triples croches (palier E, binaire) --- */
    cell("eight-eighths", "base", 4, repeatElems([note(0.125)], 8)),
    cell("half-four-eighths", "base", 3, [note(0.5), note(0.125), note(0.125), note(0.125), note(0.125)]),
    cell("four-eighths-half", "base", 3, [note(0.125), note(0.125), note(0.125), note(0.125), note(0.5)]),
    cell("quarter-two-eighths-x2", "base", 3, repeatElems([note(0.25), note(0.125), note(0.125)], 2)),
    cell("two-eighths-quarter-x2", "base", 3, repeatElems([note(0.125), note(0.125), note(0.25)], 2)),
    /* --- base : quadruples croches --- */
    cell("sixteen-sixteenths", "base", 2, repeatElems([note(0.0625)], 16)),
    cell("eighth-two-sixteenths-x4", "base", 2, repeatElems([note(0.125), note(0.0625), note(0.0625)], 4)),
    cell("quarter-four-sixteenths-x2", "base", 2,
      repeatElems([note(0.25), note(0.0625), note(0.0625), note(0.0625), note(0.0625)], 2)),

    /* --- silences : équivalents des figures (paliers A, B, C niveau 2) --- */
    cell("beat-rest", "rest", 6, [silence(1)]),
    cell("two-beat-rest", "rest", 2, [silence(2)]),
    cell("four-beat-rest", "rest", 1, [silence(4)]),
    cell("half-halfrest", "rest", 4, [note(0.5), silence(0.5)]),
    cell("offbeat-half", "rest", 4, [silence(0.5), note(0.5)]),
    cell("quarterrest-three-quarters", "rest", 3, [silence(0.25), note(0.25), note(0.25), note(0.25)]),
    cell("quarter-rest-two-quarters", "rest", 2, [note(0.25), silence(0.25), note(0.25), note(0.25)]),
    cell("three-quarters-quarterrest", "rest", 3, [note(0.25), note(0.25), note(0.25), silence(0.25)]),
    cell("quarterrest-half-quarter", "rest", 2, [silence(0.25), note(0.5), note(0.25)]),
    cell("half-quarterrest-quarter", "rest", 2, [note(0.5), silence(0.25), note(0.25)]),
    cell("eighthrest-seven-eighths", "rest", 1, [silence(0.125)].concat(repeatElems([note(0.125)], 7))),

    /* --- niveau 3 : pointées, liaisons, syncopes (paliers A, B, C, D niveau 3) --- */
    cell("dotted-beat-half", "special", 5, [note(1.5), note(0.5)]),          /* noire pointée – croche */
    cell("syncope-half-beat-half", "special", 5, [note(0.5), note(1), note(0.5)]), /* croche – noire – croche */
    cell("dotted-two-beats", "special", 2, [note(3)]),                       /* blanche pointée */
    cell("beat-tied-two-beats", "special", 1, [tiedNote(1), note(2)]),       /* noire liée à blanche */
    cell("tied-halves", "special", 3, [note(0.5), tiedNote(0.5), note(0.5), note(0.5)]), /* croches liées entre temps */
    cell("dotted-half-quarter", "special", 4, [note(0.75), note(0.25)]),     /* croche pointée – double */
    cell("quarter-dotted-half", "special", 3, [note(0.25), note(0.75)]),     /* double – croche pointée */
    cell("tied-quarters", "special", 1, [note(0.25), tiedNote(0.25), note(0.25), note(0.25)]), /* double liée */
    cell("syncope-long", "special", 2, [note(0.5), note(1), note(1), note(0.5)]) /* croche – noire – noire – croche */
  ];

  /* ---------- utilitaires ---------- */

  function parseMeter(meter) {
    if (METERS.indexOf(meter) === -1) {
      throw new Error("Signature non gérée : " + meter);
    }
    var parts = meter.split("/");
    return { beats: parseInt(parts[0], 10), den: parseInt(parts[1], 10) };
  }

  /* Convertit une durée en temps vers une durée en 64e de ronde. */
  function beatsTo64(d, den) {
    return Math.round(d * 64 / den);
  }

  function gcd(a, b) {
    while (b) { var t = a % b; a = b; b = t; }
    return a;
  }

  function pickWeighted(list, rng) {
    var total = 0, i;
    for (i = 0; i < list.length; i++) total += list[i].weight;
    var t = rng() * total;
    for (i = 0; i < list.length; i++) {
      t -= list[i].weight;
      if (t < 0) return list[i];
    }
    return list[list.length - 1];
  }

  /* ---------- disponibilité des cellules ---------- */

  /*
   * Une cellule est disponible si toutes ses durées correspondent à une figure
   * cochée (les silences exigent la figure de durée équivalente ; les valeurs
   * pointées du niveau 3 exigent leur figure de base).
   */
  function availableCells(config) {
    var m = parseMeter(config.meter);
    var fig64 = {};
    for (var i = 0; i < config.figures.length; i++) {
      fig64[FIGURE_64[config.figures[i]]] = true;
    }
    var out = [];
    for (var c = 0; c < CELLS.length; c++) {
      var cc = CELLS[c];
      if (cc.kind === "rest" && config.level < 2) continue;
      if (cc.kind === "special" && config.level < 3) continue;
      if (cc.lenInt > m.beats) continue;
      var ok = true;
      for (var e = 0; e < cc.elems.length; e++) {
        var el = cc.elems[e];
        var v = beatsTo64(el.d, m.den);
        if (fig64[v]) continue;
        if (!el.rest && cc.kind === "special" && v % 3 === 0 && fig64[v * 2 / 3]) continue;
        ok = false;
        break;
      }
      if (ok) out.push(cc);
    }
    return out;
  }

  /* Alignement : les cellules longues démarrent sur les appuis naturels. */
  function startAllowed(len, pos, beats) {
    if (len <= 1) return true;
    if (len === 2) return pos % 2 === 0 || beats % 2 === 1;
    return pos === 0; /* 3 ou 4 temps : départ de mesure */
  }

  /* reach[pos] = vrai si l'on peut compléter la mesure depuis la position pos. */
  function reachable(cells, beats) {
    var reach = [];
    var pos, c;
    for (pos = 0; pos <= beats; pos++) reach[pos] = false;
    reach[beats] = true;
    for (pos = beats - 1; pos >= 0; pos--) {
      for (c = 0; c < cells.length; c++) {
        var cc = cells[c];
        if (cc.lenInt <= beats - pos && startAllowed(cc.lenInt, pos, beats) && reach[pos + cc.lenInt]) {
          reach[pos] = true;
          break;
        }
      }
    }
    return reach;
  }

  /* ---------- tirage d'une mesure ---------- */

  function restTargetFor(level, rng) {
    if (level < 2) return 0;
    if (level === 2) { /* ~1 silence par mesure en moyenne */
      var x = rng();
      return x < 0.25 ? 0 : (x < 0.8 ? 1 : 2);
    }
    return rng() < 0.6 ? 0 : 1; /* niveau 3 : densité de silences réduite */
  }

  function specialTargetFor(level, rng) {
    if (level < 3) return 0;
    return rng() < 0.55 ? 1 : 2; /* 1–2 cellules pointées/liées/syncopées par mesure */
  }

  function buildMeasure(cells, reach, beats, level, rng) {
    var hasPartial = false;
    for (var i = 0; i < cells.length; i++) {
      if (cells[i].lenInt < beats) { hasPartial = true; break; }
    }
    var events = null;
    for (var attempt = 0; attempt < 40; attempt++) {
      var plainOnly = attempt === 39; /* dernier recours : notes seules */
      events = [];
      var pos = 0;
      var restLeft = plainOnly ? 0 : restTargetFor(level, rng);
      var specialLeft = plainOnly ? 0 : specialTargetFor(level, rng);
      var dead = false;
      while (pos < beats) {
        var candidates = [], specials = [], rests = [], bases = [];
        for (var c = 0; c < cells.length; c++) {
          var cc = cells[c];
          if (cc.lenInt > beats - pos) continue;
          if (!startAllowed(cc.lenInt, pos, beats)) continue;
          if (!reach[pos + cc.lenInt]) continue;
          candidates.push(cc);
          if (cc.kind === "special") specials.push(cc);
          else if (cc.kind === "rest") rests.push(cc);
          else bases.push(cc);
        }
        if (!candidates.length) { dead = true; break; } /* impossible en pratique (reach) */
        var pool;
        if (specialLeft > 0 && specials.length && rng() < 0.6) { pool = specials; specialLeft--; }
        else if (restLeft > 0 && rests.length && rng() < 0.55) { pool = rests; restLeft--; }
        else pool = bases.length ? bases : candidates;
        var chosen = pickWeighted(pool, rng);
        for (var e = 0; e < chosen.elems.length; e++) {
          var el = chosen.elems[e];
          events.push({ d: el.d, rest: el.rest, tie: el.tie });
        }
        pos += chosen.lenInt;
      }
      if (dead) continue;
      var allRest = true;
      for (var k = 0; k < events.length; k++) {
        if (!events[k].rest) { allRest = false; break; }
      }
      /* Jamais de mesure entièrement silencieuse, sauf si la pause pleine
         mesure est la seule combinaison possible. */
      if (allRest && hasPartial) continue;
      return events;
    }
    return events || [];
  }

  /* Liaisons à travers la barre de mesure (syncopes inter-mesures, niveau 3). */
  function addCrossBarTies(measures, rng) {
    for (var i = 0; i + 1 < measures.length; i++) {
      if ((i + 1) % 4 === 0) continue; /* pas de liaison à travers un retour à la ligne */
      var a = measures[i], b = measures[i + 1];
      if (!a.length || !b.length) continue;
      var last = a[a.length - 1], first = b[0];
      if (last.rest || first.rest || last.tie) continue;
      if (last.d > 1 || first.d > 2) continue;
      if (rng() < 0.22) last.tie = true;
    }
  }

  /* ---------- assemblage ABC + timeline ---------- */

  function assemble(measures, config, m) {
    var den = m.den;
    var i, j;

    /* Unité L: adaptée à la plus petite durée réellement générée (max 1/64). */
    var g = 0;
    for (i = 0; i < measures.length; i++) {
      for (j = 0; j < measures[i].length; j++) {
        g = gcd(g, beatsTo64(measures[i][j].d, den));
      }
    }
    var unit = gcd(g, 8); /* L: entre 1/8 et 1/64 */
    var lden = 64 / unit;

    var notes = [];
    var barTexts = [];
    var globalStart = 0;

    for (i = 0; i < measures.length; i++) {
      var events = measures[i];
      var groups = [];   /* chaînes (tokens isolés) ou { beat, toks } (ligature par temps) */
      var current = null;
      var pos = 0;
      for (j = 0; j < events.length; j++) {
        var e = events[j];
        var mult = beatsTo64(e.d, den) / unit;
        var tok = (e.rest ? "z" : "D,") + (mult === 1 ? "" : mult) + (e.tie ? "-" : "");
        if (e.d >= 1) {
          /* une valeur d'au moins un temps reste isolée */
          groups.push(tok);
          current = null;
        } else {
          var beatIdx = Math.floor(pos + 1e-6);
          if (current && current.beat === beatIdx) {
            current.toks.push(tok);
          } else {
            current = { beat: beatIdx, toks: [tok] };
            groups.push(current);
          }
        }
        notes.push({
          startBeats: globalStart + pos,
          durationBeats: e.d,
          isRest: !!e.rest,
          tiedToNext: !!e.tie
        });
        pos += e.d;
      }
      globalStart += m.beats;
      var parts = [];
      for (j = 0; j < groups.length; j++) {
        parts.push(typeof groups[j] === "string" ? groups[j] : groups[j].toks.join(""));
      }
      barTexts.push(parts.join(" "));
    }

    /* 4 mesures par ligne, barre de fin « |] ». */
    var lines = [];
    for (i = 0; i < barTexts.length; i += 4) {
      var chunk = barTexts.slice(i, i + 4);
      var isLast = i + 4 >= barTexts.length;
      lines.push(chunk.join(" | ") + (isLast ? " |]" : " |"));
    }

    var abc = "X:1\n" +
      "M:" + config.meter + "\n" +
      "L:1/" + lden + "\n" +
      "K:C clef=bass\n" +
      lines.join("\n");

    return { abc: abc, notes: notes };
  }

  /* ---------- point d'entrée ---------- */

  function generateExercise(config) {
    if (!config || typeof config !== "object") {
      throw new Error("Configuration manquante.");
    }
    var figures = config.figures;
    if (!figures || Object.prototype.toString.call(figures) !== "[object Array]" || figures.length === 0) {
      throw new Error("Aucune figure cochée.");
    }
    for (var i = 0; i < figures.length; i++) {
      if (!FIGURE_64.hasOwnProperty(figures[i])) {
        throw new Error("Figure inconnue : " + figures[i]);
      }
    }
    var level = config.level;
    if (level !== 1 && level !== 2 && level !== 3) {
      throw new Error("Niveau invalide : " + level);
    }
    var m = parseMeter(config.meter);
    var count = config.measures;
    if (typeof count !== "number" || !isFinite(count) || Math.floor(count) !== count || count < 1) {
      throw new Error("Nombre de mesures invalide : " + count);
    }
    var rng = typeof config.rng === "function" ? config.rng : Math.random;

    var cells = availableCells(config);
    var reach = cells.length ? reachable(cells, m.beats) : null;
    if (!cells.length || !reach[0]) {
      throw new Error("Impossible de remplir une mesure de " + config.meter + " avec ces figures.");
    }

    var measures = [];
    for (var k = 0; k < count; k++) {
      measures.push(buildMeasure(cells, reach, m.beats, level, rng));
    }
    if (level === 3) addCrossBarTies(measures, rng);

    return assemble(measures, config, m);
  }

  return {
    generateExercise: generateExercise,
    availableCells: availableCells,
    FIGURE_64: FIGURE_64,
    METERS: METERS
  };
}));
