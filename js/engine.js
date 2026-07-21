/*
 * Bass Rhythm Trainer — moteur de lecture + métronome (mode 1).
 *
 * Deux couches dans un même module :
 *
 * 1. PARTIE PURE (testable sous Node, aucune dépendance DOM / Web Audio)
 *    - createBeatClock({ startTime, bpm }) : grille temporelle des battements.
 *      Les instants sont calculés par multiplication depuis un ancrage, jamais
 *      par additions cumulées => dérive nulle à tempo fixe.
 *      setBpm(v) ré-ancre la grille au prochain battement non encore
 *      programmé : les instants déjà rendus par advance() restent figés, le
 *      battement d'ancrage garde l'instant déjà planifié, les suivants
 *      s'espacent au nouvel intervalle — continuité sans saut.
 *      positionAt(t) : position continue en battements, linéaire par morceaux
 *      entre les changements de tempo.
 *    - meterBeats("3/2") -> 3 : temps par mesure d'une signature.
 *    - countInBeats(bpb) -> bpb : le décompte occupe une mesure entière.
 *    - barBeat(gridBeat, bpb) -> { measure, beat } (1-based).
 *    - describeBeat(step, startGridBeat, bpb, totalBeats) : classe chaque pas
 *      du transport — décompte d'une mesure, puis battements de la grille à
 *      partir de startGridBeat (reprise après pause incluse), puis fin —
 *      avec accent sur le temps 1.
 *
 * 2. PARTIE WEB AUDIO
 *    - createTransport({ ctx, bpm, beatsPerBar, totalBeats, startGridBeat }) :
 *      horloge à lookahead (setInterval ~25 ms, horizon ~120 ms), chaque clic
 *      programmé sur ctx.currentTime — jamais de setTimeout cumulatif.
 *      Clic = oscillateur sinus court avec enveloppe douce (esthétique Apnée) ;
 *      accent du temps 1 plus aigu et plus fort. L'AudioContext est créé et
 *      repris par la page au geste utilisateur (bouton play), puis fourni ici.
 *
 * UMD minimal : window.BassRhythmEngine dans la page, module.exports sous Node.
 */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && typeof module.exports === "object") {
    module.exports = factory();
  } else {
    root.BassRhythmEngine = factory();
  }
}(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var LOOKAHEAD_MS = 25;         // période de la pompe de programmation
  var SCHEDULE_HORIZON_S = 0.12; // horizon programmé en avance sur l'horloge audio
  var START_DELAY_S = 0.1;       // marge entre le geste utilisateur et le premier clic

  /* ============================ partie pure ============================ */

  function createBeatClock(opts) {
    var spb = 60 / opts.bpm;        // secondes par battement
    var anchorBeat = 0;             // battement d'ancrage de la grille
    var anchorTime = opts.startTime;
    var next = 0;                   // prochain battement non encore programmé
    // Segments (temps, battement, intervalle) pour la position continue.
    var segs = [{ time: anchorTime, beat: 0, spb: spb }];

    function timeOf(k) { return anchorTime + (k - anchorBeat) * spb; }

    return {
      bpm: function () { return 60 / spb; },
      nextIndex: function () { return next; },
      nextTime: function () { return timeOf(next); },
      /* Fige l'instant du prochain battement et le rend : { index, time }. */
      advance: function () {
        var ev = { index: next, time: timeOf(next) };
        next += 1;
        return ev;
      },
      /* Changement de tempo en vol : ré-ancrage au prochain battement non
         encore programmé. Il conserve l'instant déjà planifié (aucun saut),
         les battements suivants suivent le nouvel intervalle. */
      setBpm: function (v) {
        anchorTime = timeOf(next);
        anchorBeat = next;
        spb = 60 / v;
        var last = segs[segs.length - 1];
        if (last.beat === anchorBeat) {
          last.time = anchorTime;
          last.spb = spb;
        } else {
          segs.push({ time: anchorTime, beat: anchorBeat, spb: spb });
        }
      },
      /* Position continue en battements à l'instant t (pour le curseur). */
      positionAt: function (t) {
        var s = segs[0];
        for (var i = 1; i < segs.length; i++) {
          if (segs[i].time <= t) s = segs[i];
          else break;
        }
        return s.beat + (t - s.time) / s.spb;
      }
    };
  }

  function meterBeats(meter) {
    var m = /^(\d+)\/(\d+)$/.exec(String(meter));
    if (!m) throw new Error("Signature invalide : " + meter);
    return parseInt(m[1], 10);
  }

  /* Le décompte occupe exactement une mesure de la signature courante. */
  function countInBeats(beatsPerBar) { return beatsPerBar; }

  function barBeat(gridBeat, beatsPerBar) {
    return {
      measure: Math.floor(gridBeat / beatsPerBar) + 1,
      beat: (gridBeat % beatsPerBar) + 1
    };
  }

  /* step = pas du transport (0, 1, 2, …) depuis le lancement, décompte inclus. */
  function describeBeat(step, startGridBeat, beatsPerBar, totalBeats) {
    var countIn = countInBeats(beatsPerBar);
    if (step < countIn) {
      return {
        type: "countin",
        countNumber: step + 1,
        pulseIndex: step,
        accent: step === 0
      };
    }
    var gridBeat = startGridBeat + (step - countIn);
    if (gridBeat >= totalBeats) {
      return { type: "end", gridBeat: gridBeat };
    }
    var bb = barBeat(gridBeat, beatsPerBar);
    return {
      type: "beat",
      gridBeat: gridBeat,
      measure: bb.measure,
      beatInBar: bb.beat,
      pulseIndex: gridBeat % beatsPerBar,
      accent: bb.beat === 1
    };
  }

  /* ========================== partie Web Audio ========================== */

  function createTransport(opts) {
    var ctx = opts.ctx;
    var bpb = opts.beatsPerBar;
    var totalBeats = opts.totalBeats;
    var startGridBeat = opts.startGridBeat || 0;
    if (startGridBeat < 0 || startGridBeat >= totalBeats) startGridBeat = 0;

    var clock = createBeatClock({ startTime: ctx.currentTime + START_DELAY_S, bpm: opts.bpm });
    var visuals = [];        // battements programmés, à consommer par la rAF de la page
    var live = [];           // nœuds audio programmés, pour un arrêt net à la pause
    var endTime = Infinity;  // instant de fin (un battement après le dernier clic)
    var allScheduled = false;
    var stopped = false;

    var master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);

    /* Clic doux : sinus court, attaque 2,5 ms, décroissance exponentielle.
       Accent du temps 1 : quinte + octave au-dessus, plus fort, un peu plus long. */
    function scheduleClick(time, accent) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = accent ? 1320 : 880;
      var peak = accent ? 0.4 : 0.18;
      var decay = accent ? 0.1 : 0.06;
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(peak, time + 0.0025);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + decay);
      gain.gain.linearRampToValueAtTime(0, time + decay + 0.01);
      osc.connect(gain);
      gain.connect(master);
      osc.start(time);
      osc.stop(time + decay + 0.03);
      var node = { osc: osc, gain: gain };
      live.push(node);
      osc.onended = function () {
        var i = live.indexOf(node);
        if (i !== -1) live.splice(i, 1);
        gain.disconnect();
      };
    }

    /* Pompe à lookahead : programme tous les battements qui tombent dans
       l'horizon, sur l'horloge audio (ctx.currentTime). */
    function pump() {
      if (stopped || allScheduled) return;
      var horizon = ctx.currentTime + SCHEDULE_HORIZON_S;
      while (clock.nextTime() < horizon) {
        var ev = clock.advance();
        var d = describeBeat(ev.index, startGridBeat, bpb, totalBeats);
        if (d.type === "end") {
          endTime = ev.time;
          allScheduled = true;
          clearInterval(timer);
          break;
        }
        scheduleClick(ev.time, d.accent);
        d.time = ev.time;
        visuals.push(d);
      }
    }

    var timer = setInterval(pump, LOOKAHEAD_MS);
    pump();

    return {
      /* Tempo en vol : ré-ancrage au prochain battement non programmé. */
      setBpm: function (v) { clock.setBpm(v); },
      bpm: function () { return clock.bpm(); },
      /* Position continue à l'instant t : { step, countIn, gridBeat }. */
      positionAt: function (t) {
        var step = clock.positionAt(t);
        return {
          step: step,
          countIn: step < countInBeats(bpb),
          gridBeat: startGridBeat + (step - countInBeats(bpb))
        };
      },
      /* Battements dont l'instant programmé est atteint (pour la rAF). */
      takeDueVisuals: function (t) {
        var due = [];
        while (visuals.length && visuals[0].time <= t) due.push(visuals.shift());
        return due;
      },
      isFinished: function (t) { return allScheduled && t >= endTime; },
      /* Arrêt net : coupe la pompe et les clics déjà programmés, et rend la
         position atteinte + le battement de grille où reprendre. */
      stop: function () {
        if (stopped) return null;
        stopped = true;
        clearInterval(timer);
        var now = ctx.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(master.gain.value, now);
        master.gain.linearRampToValueAtTime(0, now + 0.02);
        for (var i = 0; i < live.length; i++) {
          try {
            live[i].osc.onended = null;
            live[i].osc.stop(now + 0.03);
          } catch (e) { /* nœud déjà arrêté */ }
        }
        live.length = 0;
        // Unique setTimeout de nettoyage (pas de programmation cumulative).
        setTimeout(function () {
          try { master.disconnect(); } catch (e) { /* déjà déconnecté */ }
        }, 80);
        var pos = startGridBeat + (clock.positionAt(now) - countInBeats(bpb));
        var resumeBeat = Math.floor(pos);
        if (resumeBeat < startGridBeat) resumeBeat = startGridBeat;
        if (resumeBeat > totalBeats - 1) resumeBeat = totalBeats - 1;
        return { position: pos, resumeBeat: resumeBeat };
      }
    };
  }

  return {
    LOOKAHEAD_MS: LOOKAHEAD_MS,
    SCHEDULE_HORIZON_S: SCHEDULE_HORIZON_S,
    createBeatClock: createBeatClock,
    meterBeats: meterBeats,
    countInBeats: countInBeats,
    barBeat: barBeat,
    describeBeat: describeBeat,
    createTransport: createTransport
  };
}));
