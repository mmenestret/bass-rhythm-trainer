/*
 * Bass Rhythm Trainer — générateur de grilles rythmiques (calibrage Agostini vol. 1).
 *
 * Fonction pure, sans DOM : generateExercise(config) -> { abc, notes, bars, header }
 *   config = {
 *     figures:  ["ronde"|"blanche"|"noire"|"croche"|"double"|"triple"|"quadruple", ...],
 *     procedes: ["rests"|"dots"|"ties"|"syncopes"|"triplets", ...] — procédés
 *               cochés, indépendants (défaut [] : notes seules). « triplets »
 *               est accepté mais pas encore tiré,
 *     meter:    "2/4" | "3/4" | "4/4" | "2/2" | "3/2" | "4/2",
 *     measures: 4 | 8 | 16,
 *     note:     jeton ABC optionnel de la note d'entraînement (défaut "D,") —
 *               lettre naturelle A–G suivie d'éventuelles virgules d'octave,
 *     rng:      fonction aléatoire optionnelle (défaut Math.random)
 *   }
 *   abc    = partition ABC complète (clé de Fa, note fixe — config.note),
 *            découpée à 4 mesures par système.
 *   notes  = timeline [{ startBeats, durationBeats, isRest, tiedToNext }] pour le
 *            moteur de lecture (ticket 03). startBeats/durationBeats en temps.
 *   bars   = texte ABC de chaque mesure ; header = en-tête X/M/L/K. Avec
 *            joinBars(bars, perLine), le client re-découpe la même grille en
 *            2 ou 4 mesures par système (responsive) sans regénérer.
 *
 * Principe : chaque mesure est assemblée à partir de cellules rythmiques
 * idiomatiques d'une durée entière de temps (1, 2, 3 ou 4 temps), tirées des
 * paliers de docs/agostini-progression.md. Les cellules de base (notes seules)
 * sont toujours disponibles ; chaque autre cellule relève d'un procédé
 * (Silences, Points, Liaisons, Syncopes) et n'est tirée que s'il est coché.
 * Liaisons couvre aussi les liaisons par-dessus la barre ; Syncopes, les
 * syncopes écrites sans liaison. La densité découle des procédés cochés :
 * silences dosés à part, procédés spéciaux sous un budget commun par mesure.
 * procedeNeeds(config, procede) dit ce qui manque pour qu'un procédé soit
 * applicable avec les figures cochées (null s'il l'est). En x/2, le temps
 * vaut une blanche : les mêmes cellules se transposent automatiquement
 * (la noire y joue le rôle de la croche, etc.).
 *
 * Grille composée (mode Composer) : assembleComposed(measures, config) rend le
 * même { abc, notes, bars, header } à partir d'une suite de mesures construites
 * à la main — l'assemblage (chooseUnit + barText) est partagé, sans duplication.
 * encodeComposed / decodeComposed sérialisent son CONTENU dans le hash d'URL
 * (second format, coexistant avec la graine) : cf. docs/adr/0001-partage-grille-composee.md.
 *
 * Règle de liaison : endsOnBeat(start, duration) dit si la fin d'un événement
 * tombe sur un début de temps — seul cas où une liaison est permise. Le tirage
 * la respecte (catalogue vérifié au chargement, liaisons par-dessus la barre)
 * et les règles de pose de Composer en découlent, en fonctions pures qui
 * lisent l'état de composition { meter, measures } (mesures d'événements
 * { fig, rest, dot, tie }) sans le muter : canTie (peut-on lier la dernière
 * note ?) et canDot (le point peut-il être posé ou retiré sur la dernière
 * note ?).
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

  /* Figures de la plus longue à la plus courte. */
  const FIGURE_ORDER = Object.keys(FIGURE_64);

  var METERS = ["2/4", "3/4", "4/4", "2/2", "3/2", "4/2"];

  /* ---------- règle de liaison ----------
   *
   * Une liaison se fait toujours sur un début de temps : dans un même temps, on
   * écrit directement la valeur cumulée. endsOnBeat(start, duration) répond à
   * « la fin de cet événement tombe-t-elle sur un début de temps ? » — positions
   * et durées en temps (la blanche en x/2). Seul endroit où la règle est écrite :
   * le catalogue du tirage, les liaisons par-dessus la barre, les règles de
   * Composer et le décodage d'une grille composée s'y réfèrent.
   */
  const BEAT_EPSILON = 1e-6;

  function endsOnBeat(start, duration) {
    const end = start + duration;
    return Math.abs(end - Math.round(end)) < BEAT_EPSILON;
  }

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
    for (var i = 0; i < elems.length; i++) {
      /* Règle de liaison : le catalogue ne lie jamais au milieu d'un temps. */
      if (elems[i].tie && !endsOnBeat(len, elems[i].d)) {
        throw new Error("Liaison au milieu d'un temps : " + id);
      }
      len += elems[i].d;
    }
    var lenInt = Math.round(len);
    if (Math.abs(len - lenInt) > 1e-9) {
      throw new Error("Cellule non alignée sur le temps : " + id);
    }
    return { id: id, kind: kind, weight: weight, lenInt: lenInt, elems: elems };
  }

  /*
   * kind = "base"     : toujours disponible — notes seules (paliers A, B, C, E binaire) ;
   *        sinon le procédé qui la gouverne :
   *        "rests"    : silences équivalents aux figures cochées ;
   *        "dots"     : cellules pointées ;
   *        "ties"     : cellules liées (toujours sur un début de temps) ;
   *        "syncopes" : syncopes écrites sans liaison.
   * Les liaisons par-dessus la barre relèvent aussi de "ties" (addCrossBarTies).
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

    /* --- Silences : équivalents des figures (paliers A, B, C) --- */
    cell("beat-rest", "rests", 6, [silence(1)]),
    cell("two-beat-rest", "rests", 2, [silence(2)]),
    cell("four-beat-rest", "rests", 1, [silence(4)]),
    cell("half-halfrest", "rests", 4, [note(0.5), silence(0.5)]),
    cell("offbeat-half", "rests", 4, [silence(0.5), note(0.5)]),
    cell("quarterrest-three-quarters", "rests", 3, [silence(0.25), note(0.25), note(0.25), note(0.25)]),
    cell("quarter-rest-two-quarters", "rests", 2, [note(0.25), silence(0.25), note(0.25), note(0.25)]),
    cell("three-quarters-quarterrest", "rests", 3, [note(0.25), note(0.25), note(0.25), silence(0.25)]),
    cell("quarterrest-half-quarter", "rests", 2, [silence(0.25), note(0.5), note(0.25)]),
    cell("half-quarterrest-quarter", "rests", 2, [note(0.5), silence(0.25), note(0.25)]),
    cell("eighthrest-seven-eighths", "rests", 1, [silence(0.125)].concat(repeatElems([note(0.125)], 7))),

    /* --- Points : cellules pointées (paliers A, B, C) --- */
    /* noire pointée – croche */
    cell("dotted-beat-half", "dots", 5, [note(1.5), note(0.5)]),
    /* blanche pointée */
    cell("dotted-two-beats", "dots", 2, [note(3)]),
    /* croche pointée – double */
    cell("dotted-half-quarter", "dots", 4, [note(0.75), note(0.25)]),
    /* double – croche pointée */
    cell("quarter-dotted-half", "dots", 3, [note(0.25), note(0.75)]),

    /* --- Liaisons : toujours sur un début de temps (paliers A, B, C) --- */
    /* noire liée à blanche */
    cell("beat-tied-two-beats", "ties", 1, [tiedNote(1), note(2)]),
    /* croches liées d'un temps à l'autre */
    cell("tied-halves", "ties", 3, [note(0.5), tiedNote(0.5), note(0.5), note(0.5)]),
    /* doubles liées d'un temps à l'autre : croche – double – double ⌢ double – double – croche */
    cell("tied-quarters", "ties", 1,
      [note(0.5), note(0.25), tiedNote(0.25), note(0.25), note(0.25), note(0.5)]),

    /* --- Syncopes écrites sans liaison (palier D) --- */
    /* croche – noire – croche */
    cell("syncope-half-beat-half", "syncopes", 5, [note(0.5), note(1), note(0.5)]),
    /* croche – noire – noire – croche */
    cell("syncope-long", "syncopes", 2, [note(0.5), note(1), note(1), note(0.5)])
  ];

  /* Procédés reconnus, dans l'ordre d'affichage. « triplets » est réservé :
     aucune cellule ne le porte encore (triolets à venir). */
  var PROCEDES = ["rests", "dots", "ties", "syncopes", "triplets"];
  /* Procédés tirés comme cellules « spéciales » : ils se partagent un même
     budget par mesure, pour qu'une mesure reste lisible quand on les cumule. */
  var SPECIAL_PROCEDES = ["dots", "ties", "syncopes"];

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

  /* Durée en temps d'une figure sous une signature (dénominateur den),
     éventuellement pointée (×1,5). En x/2 le temps vaut une blanche : la même
     figure s'y transpose (la noire y vaut un demi-temps). Partagée par la
     composition manuelle (pose, invariant, codec) et ses tests. */
  function figureBeats(fig, den, dot) {
    return FIGURE_64[fig] * den / 64 * (dot ? 1.5 : 1);
  }

  /* ---------- règles de pose de Composer (fonctions pures) ----------
   *
   * L'état de composition est { meter, measures } : measures liste des mesures
   * d'événements { fig, rest, dot, tie }, toutes pleines sauf la dernière
   * (mesure ouverte, éventuellement vide). Les règles lisent cet état sans
   * jamais le muter ; la page ne fait que les appeler pour griser ses boutons.
   */

  /* Dernier événement posé, avec sa position de départ dans sa mesure et la
     place restante dans cette mesure (null si la grille est vide). */
  function lastPlacement(composition) {
    const parsed = parseMeter(composition.meter);
    const measures = composition.measures || [];
    for (let i = measures.length - 1; i >= 0; i--) {
      const bar = measures[i];
      if (!bar.length) continue;
      let start = 0;
      for (let j = 0; j < bar.length - 1; j++) {
        start += figureBeats(bar[j].fig, parsed.den, bar[j].dot);
      }
      const event = bar[bar.length - 1];
      const duration = figureBeats(event.fig, parsed.den, event.dot);
      return {
        event: event,
        den: parsed.den,
        start: start,
        duration: duration,
        remaining: parsed.beats - start - duration
      };
    }
    return null;
  }

  /* Peut-on lier la dernière note à la suivante ? Oui si c'est une note et
     qu'elle finit sur un début de temps (y compris sur la barre de mesure). */
  function canTie(composition) {
    const last = lastPlacement(composition);
    if (!last || last.event.rest) return false;
    return endsOnBeat(last.start, last.duration);
  }

  /* Le point (posé ou retiré) est-il permis sur la dernière note ? Le
     demi-temps ajouté doit tenir dans sa mesure, et une liaison déjà posée sur
     cette note doit rester sur un début de temps après la bascule. */
  function canDot(composition) {
    const last = lastPlacement(composition);
    if (!last || last.event.rest) return false;
    const toggled = figureBeats(last.event.fig, last.den, !last.event.dot);
    if (toggled - last.duration > last.remaining + BEAT_EPSILON) return false;
    if (last.event.tie && !endsOnBeat(last.start, toggled)) return false;
    return true;
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

  function hasProcede(config, procede) {
    return (config.procedes || []).indexOf(procede) !== -1;
  }

  function hasSpecialProcede(config) {
    for (let i = 0; i < SPECIAL_PROCEDES.length; i++) {
      if (hasProcede(config, SPECIAL_PROCEDES[i])) return true;
    }
    return false;
  }

  /*
   * Une cellule est disponible si son procédé est coché (les cellules de base
   * le sont toujours) et si toutes ses durées correspondent à une figure
   * cochée (les silences exigent la figure de durée équivalente ; les valeurs
   * pointées exigent leur figure de base).
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
      if (cc.kind !== "base" && !hasProcede(config, cc.kind)) continue;
      if (cc.lenInt > m.beats) continue;
      var ok = true;
      for (var e = 0; e < cc.elems.length; e++) {
        var el = cc.elems[e];
        var v = beatsTo64(el.d, m.den);
        if (fig64[v]) continue;
        if (!el.rest && cc.kind === "dots" && v % 3 === 0 && fig64[v * 2 / 3]) continue;
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

  /* Placements réellement tirables : { cell, pos } pour chaque cellule qui
     peut démarrer en pos sur un chemin qui remplit toute la mesure. */
  function placements(cells, beats) {
    const reach = reachable(cells, beats);
    const from = [];
    const out = [];
    for (let pos = 0; pos <= beats; pos++) from[pos] = pos === 0;
    for (let pos = 0; pos < beats; pos++) {
      if (!from[pos]) continue;
      for (let c = 0; c < cells.length; c++) {
        const end = pos + cells[c].lenInt;
        if (end > beats || !startAllowed(cells[c].lenInt, pos, beats) || !reach[end]) continue;
        from[end] = true;
        out.push({ cell: cells[c], pos: pos });
      }
    }
    return out;
  }

  /* Liaison par-dessus la barre : de la dernière note d'une mesure (un temps
     au plus) vers la première note de la suivante (deux temps au plus). */
  function crossBarTieFits(last, first) {
    return !last.rest && !first.rest && last.d <= 1 && first.d <= 2;
  }

  function crossBarTiePossible(usable, beats) {
    let canEnd = false;
    let canStart = false;
    for (let i = 0; i < usable.length; i++) {
      const elems = usable[i].cell.elems;
      const last = elems[elems.length - 1];
      if (usable[i].pos + usable[i].cell.lenInt === beats && !last.tie && crossBarTieFits(last, last)) {
        canEnd = true;
      }
      if (usable[i].pos === 0 && crossBarTieFits(elems[0], elems[0])) canStart = true;
    }
    return canEnd && canStart;
  }

  /* Un procédé est applicable si les figures cochées, sous la signature,
     permettent de le tirer au moins une fois. */
  function procedeApplicable(config, procede) {
    const beats = parseMeter(config.meter).beats;
    const usable = placements(availableCells({
      figures: config.figures,
      meter: config.meter,
      procedes: [procede]
    }), beats);
    for (let i = 0; i < usable.length; i++) {
      if (usable[i].cell.kind === procede) return true;
    }
    return procede === "ties" && crossBarTiePossible(usable, beats);
  }

  /*
   * Ce qui manque à un procédé : null s'il est applicable avec les figures
   * cochées ({ figures, meter }) ; sinon les figures à cocher en plus pour le
   * rendre applicable (une, ou deux à défaut, de la plus longue à la plus
   * courte), ou [] si aucune ne suffit. On propose d'abord les figures voisines
   * de celles déjà cochées, la plus courte d'abord à égale distance.
   */
  function procedeNeeds(config, procede) {
    if (procedeApplicable(config, procede)) return null;
    const checked = config.figures;
    const distance = function (fig) {
      let best = FIGURE_ORDER.length;
      for (let i = 0; i < checked.length; i++) {
        best = Math.min(best, Math.abs(FIGURE_ORDER.indexOf(fig) - FIGURE_ORDER.indexOf(checked[i])));
      }
      return best;
    };
    const candidates = FIGURE_ORDER.filter(function (fig) {
      return checked.indexOf(fig) === -1;
    }).sort(function (a, b) {
      return distance(a) - distance(b) || FIGURE_ORDER.indexOf(b) - FIGURE_ORDER.indexOf(a);
    });
    const tryFigures = function (extra) {
      return procedeApplicable({ figures: checked.concat(extra), meter: config.meter }, procede);
    };
    for (let i = 0; i < candidates.length; i++) {
      if (tryFigures([candidates[i]])) return [candidates[i]];
    }
    const pairs = [];
    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        pairs.push([candidates[i], candidates[j]]);
      }
    }
    pairs.sort(function (a, b) {
      return distance(a[0]) + distance(a[1]) - distance(b[0]) - distance(b[1]);
    });
    for (let i = 0; i < pairs.length; i++) {
      if (tryFigures(pairs[i])) {
        return pairs[i].sort(function (a, b) {
          return FIGURE_ORDER.indexOf(a) - FIGURE_ORDER.indexOf(b);
        });
      }
    }
    return [];
  }

  /* ---------- tirage d'une mesure ----------
   *
   * Dosage : les silences gardent leur densité propre (~1 par mesure) tant
   * qu'aucun autre procédé n'est coché, puis se raréfient (0 ou 1) ; les
   * procédés spéciaux (points, liaisons, syncopes) se partagent 1 à 2
   * cellules par mesure, quel que soit le nombre de procédés cochés.
   */
  function restTargetFor(config, rng) {
    if (!hasProcede(config, "rests")) return 0;
    if (!hasSpecialProcede(config)) {
      const x = rng();
      return x < 0.25 ? 0 : (x < 0.8 ? 1 : 2);
    }
    return rng() < 0.6 ? 0 : 1;
  }

  function specialTargetFor(config, rng) {
    if (!hasSpecialProcede(config)) return 0;
    return rng() < 0.55 ? 1 : 2;
  }

  function buildMeasure(cells, reach, beats, config, rng) {
    var hasPartial = false;
    for (var i = 0; i < cells.length; i++) {
      if (cells[i].lenInt < beats) { hasPartial = true; break; }
    }
    var events = null;
    for (var attempt = 0; attempt < 40; attempt++) {
      var plainOnly = attempt === 39; /* dernier recours : notes seules */
      events = [];
      var pos = 0;
      var restLeft = plainOnly ? 0 : restTargetFor(config, rng);
      var specialLeft = plainOnly ? 0 : specialTargetFor(config, rng);
      var dead = false;
      while (pos < beats) {
        var candidates = [], specials = [], rests = [], bases = [];
        for (var c = 0; c < cells.length; c++) {
          var cc = cells[c];
          if (cc.lenInt > beats - pos) continue;
          if (!startAllowed(cc.lenInt, pos, beats)) continue;
          if (!reach[pos + cc.lenInt]) continue;
          candidates.push(cc);
          if (SPECIAL_PROCEDES.indexOf(cc.kind) !== -1) specials.push(cc);
          else if (cc.kind === "rests") rests.push(cc);
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

  /* Liaisons à travers la barre de mesure (procédé Liaisons). La dernière note
     d'une mesure pleine finit sur la barre, donc sur un début de temps. */
  function addCrossBarTies(measures, beats, rng) {
    for (var i = 0; i + 1 < measures.length; i++) {
      if ((i + 1) % 4 === 0) continue; /* pas de liaison à travers un retour à la ligne */
      var a = measures[i], b = measures[i + 1];
      if (!a.length || !b.length) continue;
      var last = a[a.length - 1], first = b[0];
      if (last.tie || !crossBarTieFits(last, first)) continue;
      if (!endsOnBeat(beats - last.d, last.d)) continue;
      if (rng() < 0.22) last.tie = true;
    }
  }

  /* ---------- assemblage ABC + timeline ---------- */

  /*
   * Unité L: de la grille : la plus fine réellement présente, entre 1/8 et
   * 1/64 (une grille sans événement retombe sur 1/8). Partagée par le tirage
   * aléatoire et la composition manuelle — même choix d'unité des deux côtés.
   */
  function chooseUnit(measures, den) {
    var g = 0;
    for (var i = 0; i < measures.length; i++) {
      for (var j = 0; j < measures[i].length; j++) {
        g = gcd(g, beatsTo64(measures[i][j].d, den));
      }
    }
    return gcd(g, 8);
  }

  /*
   * Texte ABC d'une mesure. Une valeur d'au moins un temps reste isolée ; les
   * valeurs plus courtes sont ligaturées par temps (regroupées tant qu'elles
   * partagent le même temps entier). noteTok = jeton de la note (les silences
   * s'écrivent "z"), le suffixe "-" marque une liaison vers l'événement
   * suivant. Fonction pure, réutilisée par l'assemblage et la scène de
   * composition (mesure ouverte gravée en direct).
   */
  function barText(events, unit, den, noteTok) {
    var groups = [];   /* chaînes (tokens isolés) ou { beat, toks } (ligature par temps) */
    var current = null;
    var pos = 0;
    for (var j = 0; j < events.length; j++) {
      var e = events[j];
      var mult = beatsTo64(e.d, den) / unit;
      var tok = (e.rest ? "z" : noteTok) + (mult === 1 ? "" : mult) + (e.tie ? "-" : "");
      if (e.d >= 1) {
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
      pos += e.d;
    }
    var parts = [];
    for (var g = 0; g < groups.length; g++) {
      parts.push(typeof groups[g] === "string" ? groups[g] : groups[g].toks.join(""));
    }
    return parts.join(" ");
  }

  /* En-tête ABC commun (X/M/L/K) : note fixe en clé de Fa, unité L:1/lden.
     Un seul endroit décrit ce format — partagé par l'assemblage et la scène de
     composition (gravure en direct). */
  function abcHeader(meter, lden) {
    return "X:1\nM:" + meter + "\nL:1/" + lden + "\nK:C clef=bass\n";
  }

  function assemble(measures, config, m) {
    var den = m.den;
    var noteTok = config.note || "D,";
    var unit = chooseUnit(measures, den);
    var lden = 64 / unit;

    var notes = [];
    var barTexts = [];
    var globalStart = 0;

    for (var i = 0; i < measures.length; i++) {
      var events = measures[i];
      var pos = 0;
      for (var j = 0; j < events.length; j++) {
        var e = events[j];
        notes.push({
          startBeats: globalStart + pos,
          durationBeats: e.d,
          isRest: !!e.rest,
          tiedToNext: !!e.tie
        });
        pos += e.d;
      }
      globalStart += m.beats;
      barTexts.push(barText(events, unit, den, noteTok));
    }

    var header = abcHeader(config.meter, lden);

    /* abc : découpage par défaut (4 mesures par système) ; bars + header
       permettent au client de re-découper via joinBars sans regénérer. */
    return {
      abc: header + joinBars(barTexts, 4),
      notes: notes,
      bars: barTexts,
      header: header
    };
  }

  /*
   * Assemble une grille COMPOSÉE à la main — une suite de mesures d'événements
   * { d (temps), rest, tie } — au même contrat que generateExercise :
   * { abc, notes, bars, header }. Réutilise assemble (aucune logique
   * d'assemblage dupliquée) : une grille composée devient un artefact
   * strictement identique à une grille générée et se rebranche sur toute la
   * chaîne de lecture. Le point est déjà porté par la durée de l'événement
   * (noire pointée = d 1,5) ; une liaison n'est valide que vers une note
   * suivante : une liaison en fin de grille ou vers un silence est neutralisée
   * (la chaîne se referme proprement, comme le tolère déjà le moteur).
   */
  function assembleComposed(measures, config) {
    if (!config || typeof config !== "object") {
      throw new Error("Configuration manquante.");
    }
    var m = parseMeter(config.meter);
    var cleaned = [];
    var order = [];
    var i, j;
    for (i = 0; i < measures.length; i++) {
      var bar = [];
      for (j = 0; j < measures[i].length; j++) {
        var e = measures[i][j];
        var copy = { d: e.d, rest: !!e.rest, tie: !!e.tie };
        bar.push(copy);
        order.push(copy);
      }
      cleaned.push(bar);
    }
    for (i = 0; i < order.length; i++) {
      if (order[i].tie && (i + 1 >= order.length || order[i + 1].rest)) {
        order[i].tie = false;
      }
    }
    return assemble(cleaned, config, m);
  }

  /* Assemble les mesures en lignes ABC — perLine mesures par système (les
     retours à la ligne du texte ABC pilotent les systèmes gravés), barre de
     fin « |] ». */
  function joinBars(bars, perLine) {
    var lines = [];
    for (var i = 0; i < bars.length; i += perLine) {
      var chunk = bars.slice(i, i + perLine);
      var isLast = i + perLine >= bars.length;
      lines.push(chunk.join(" | ") + (isLast ? " |]" : " |"));
    }
    return lines.join("\n");
  }

  /* ---------- graine déterministe & partage d'une grille ----------
   *
   * makeRng(seed) : PRNG mulberry32, une graine uint32 -> fonction rng() dans
   * [0,1). Injectée dans generateExercise via config.rng, elle rend une grille
   * exactement reproductible. En flux ∞, la MÊME instance doit être réutilisée
   * d'une tranche à l'autre (l'état avance) pour un flux déterministe et varié.
   *
   * encodeShare / decodeShare : sérialisent l'état minimal qui détermine une
   * grille (graine + figures + procédés + signature + note + nombre de
   * mesures) en une chaîne compacte pour le hash d'URL, et l'inverse (null si
   * invalide). Les procédés tiennent dans la clé « p » (un caractère chacun,
   * vide si aucun). Un ancien lien à niveau (clé « l ») est rejeté : aucune
   * compatibilité n'est due (ADR 0001 amendé), l'app tire une grille neuve.
   */
  function makeRng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var FIG_CODE = {
    ronde: "r", blanche: "b", noire: "n", croche: "c",
    double: "d", triple: "t", quadruple: "q"
  };
  var CODE_FIG = {};
  for (var _f in FIG_CODE) {
    if (FIG_CODE.hasOwnProperty(_f)) CODE_FIG[FIG_CODE[_f]] = _f;
  }
  var MEASURE_CHOICES = ["4", "8", "16", "inf"];
  const PROCEDE_CODE = { rests: "r", dots: "d", ties: "t", syncopes: "s", triplets: "3" };

  function encodeShare(state) {
    var figs = "";
    for (var i = 0; i < state.figures.length; i++) {
      var code = FIG_CODE[state.figures[i]];
      if (code) figs += code;
    }
    let procedes = "";
    for (let p = 0; p < PROCEDES.length; p++) {
      if ((state.procedes || []).indexOf(PROCEDES[p]) !== -1) procedes += PROCEDE_CODE[PROCEDES[p]];
    }
    var meas = state.measures === "inf" ? "i" : String(state.measures);
    return "s=" + ((state.seed >>> 0).toString(36)) +
      "&f=" + figs +
      "&p=" + procedes +
      "&m=" + String(state.meter).replace("/", "") +
      "&n=" + state.note +
      "&x=" + meas;
  }

  function decodeShare(str) {
    if (typeof str !== "string" || !str) return null;
    var map = {};
    var parts = str.split("&");
    for (var i = 0; i < parts.length; i++) {
      var kv = parts[i].split("=");
      if (kv.length === 2 && kv[0]) map[kv[0]] = kv[1];
    }
    if (!("s" in map && "f" in map && "p" in map && "m" in map && "n" in map && "x" in map)) {
      return null;
    }
    /* Ancien lien à niveau : rejeté. */
    if ("l" in map) return null;

    var seed = parseInt(map.s, 36);
    if (!isFinite(seed) || seed < 0) return null;
    seed = seed >>> 0;

    var figures = [];
    for (i = 0; i < map.f.length; i++) {
      var fig = CODE_FIG[map.f.charAt(i)];
      if (!fig) return null;
      if (figures.indexOf(fig) === -1) figures.push(fig);
    }
    if (!figures.length) return null;

    const procedes = [];
    for (let c = 0; c < map.p.length; c++) {
      let known = false;
      for (let p = 0; p < PROCEDES.length; p++) {
        if (PROCEDE_CODE[PROCEDES[p]] === map.p.charAt(c)) known = true;
      }
      if (!known) return null;
    }
    for (let p = 0; p < PROCEDES.length; p++) {
      if (map.p.indexOf(PROCEDE_CODE[PROCEDES[p]]) !== -1) procedes.push(PROCEDES[p]);
    }

    if (!/^[2-4][2-4]$/.test(map.m)) return null;
    var meter = map.m.charAt(0) + "/" + map.m.charAt(1);
    if (METERS.indexOf(meter) === -1) return null;

    if (!/^[A-G]$/.test(map.n)) return null;

    var measures = map.x === "i" ? "inf" : map.x;
    if (MEASURE_CHOICES.indexOf(measures) === -1) return null;

    return {
      seed: seed,
      figures: figures,
      procedes: procedes,
      meter: meter,
      note: map.n,
      measures: measures
    };
  }

  /* ---------- partage d'une grille composée : contenu complet ----------
   *
   * Une grille composée n'est PAS une graine : aucun PRNG ne la représente. On
   * sérialise donc son CONTENU — signature + note d'entraînement + la suite des
   * événements (figures / silences / points / liaisons) — dans un second format
   * d'URL, coexistant avec le format graine (encodeShare/decodeShare). Chaque
   * événement tient sur un caractère base36 : une figure (0–6) éventuellement
   * pointée et/ou liée, ou un silence — 35 combinaisons (les silences ne sont
   * ni pointés ni liés). Le format porte un marqueur de version (c=1) et une
   * clé « e » ; decodeComposed le distingue du format graine (clés s/f/x) et
   * rejette proprement (null) tout lien hors domaine ou invalide (mesure qui
   * déborde, grille non close sur la signature). Cf. docs/adr/0001-*.
   */
  var COMPOSED_FIGS = ["ronde", "blanche", "noire", "croche", "double", "triple", "quadruple"];

  function encodeComposed(state) {
    var events = state.events || [];
    var chars = "";
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      var fi = COMPOSED_FIGS.indexOf(ev.fig);
      if (fi === -1) continue;
      var code = ev.rest ? 28 + fi : fi + (ev.dot ? 7 : 0) + (ev.tie ? 14 : 0);
      chars += code.toString(36);
    }
    return "c=1" +
      "&m=" + String(state.meter).replace("/", "") +
      "&n=" + state.note +
      "&e=" + chars;
  }

  function decodeComposed(str) {
    if (typeof str !== "string" || !str) return null;
    var map = {};
    var parts = str.split("&");
    for (var i = 0; i < parts.length; i++) {
      var kv = parts[i].split("=");
      if (kv.length === 2 && kv[0]) map[kv[0]] = kv[1];
    }
    if (!("c" in map && "m" in map && "n" in map && "e" in map)) return null;
    if (map.c !== "1") return null; /* version inconnue : rejet */

    if (!/^[2-4][2-4]$/.test(map.m)) return null;
    var meter = map.m.charAt(0) + "/" + map.m.charAt(1);
    if (METERS.indexOf(meter) === -1) return null;
    if (!/^[A-G]$/.test(map.n)) return null;

    var parsed = parseMeter(meter);
    var beats = parsed.beats;
    var den = parsed.den;

    var events = [];
    for (i = 0; i < map.e.length; i++) {
      var ch = map.e.charAt(i);
      if (!/^[0-9a-y]$/.test(ch)) return null;
      var code = parseInt(ch, 36);
      if (!isFinite(code) || code < 0 || code > 34) return null;
      var ev;
      if (code >= 28) {
        ev = { fig: COMPOSED_FIGS[code - 28], rest: true, dot: false, tie: false };
      } else {
        ev = {
          fig: COMPOSED_FIGS[code % 7],
          rest: false,
          dot: code >= 7 && code < 14 || code >= 21,
          tie: code >= 14
        };
      }
      events.push(ev);
    }
    if (!events.length) return null;

    /* Reconstruire les mesures : remplissage strict, chaque mesure close
       exactement sur la signature (invariant d'une grille valide). Tout
       dépassement ou reste non nul (grille incomplète) invalide le lien. */
    var measures = [];
    var bar = [];
    var sum = 0;
    for (i = 0; i < events.length; i++) {
      var e = events[i];
      var d = figureBeats(e.fig, den, e.dot);
      if (sum + d > beats + 1e-9) return null;
      /* Règle de liaison : une liaison au milieu d'un temps invalide le lien. */
      if (e.tie && !endsOnBeat(sum, d)) return null;
      bar.push(e);
      sum += d;
      if (Math.abs(sum - beats) < 1e-9) {
        measures.push(bar);
        bar = [];
        sum = 0;
      }
    }
    if (bar.length || !measures.length) return null;

    return { meter: meter, note: map.n, events: events, measures: measures };
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
    var procedes = config.procedes === undefined ? [] : config.procedes;
    if (Object.prototype.toString.call(procedes) !== "[object Array]") {
      throw new Error("Procédés invalides : " + procedes);
    }
    for (var p = 0; p < procedes.length; p++) {
      if (PROCEDES.indexOf(procedes[p]) === -1) {
        throw new Error("Procédé inconnu : " + procedes[p]);
      }
    }
    if (config.note !== undefined && !/^[A-G],{0,2}$/.test(config.note)) {
      throw new Error("Note d'entraînement invalide : " + config.note);
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
      measures.push(buildMeasure(cells, reach, m.beats, config, rng));
    }
    if (hasProcede(config, "ties")) addCrossBarTies(measures, m.beats, rng);

    return assemble(measures, config, m);
  }

  return {
    generateExercise: generateExercise,
    assembleComposed: assembleComposed,
    barText: barText,
    chooseUnit: chooseUnit,
    figureBeats: figureBeats,
    endsOnBeat: endsOnBeat,
    canTie: canTie,
    canDot: canDot,
    abcHeader: abcHeader,
    joinBars: joinBars,
    availableCells: availableCells,
    procedeNeeds: procedeNeeds,
    makeRng: makeRng,
    encodeShare: encodeShare,
    decodeShare: decodeShare,
    encodeComposed: encodeComposed,
    decodeComposed: decodeComposed,
    FIGURE_64: FIGURE_64,
    METERS: METERS,
    PROCEDES: PROCEDES
  };
}));
