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
 *    - describeLoopedBeat(step, start, bpb, totalBeats, loopOn) : variante
 *      bouclée — battements repliés modulo totalBeats tant que loopOn (repeat
 *      sans couture, sans nouveau décompte), fin à la prochaine frontière de
 *      grille quand la boucle se coupe, jamais de fin si totalBeats infini
 *      (flux ∞).
 *    - litIndicesAt(notes, gridBeat) : indices des notes « allumées » à une
 *      position en temps (guidage visuel, mode 2) — silences exclus, chaînes
 *      liées allumées d'un seul tenant sur la durée cumulée.
 *    - noteSoundEvents(notes, soundOn) : événements sonores du mode 3 —
 *      { startBeats, holdBeats } par attaque. Silences muets, chaîne liée =
 *      UNE attaque à durée cumulée, soundOn false = aucun événement.
 *    - noteCutSeconds(holdBeats, bpm, sampleDurationS) : durée de coupe en
 *      secondes après l'attaque, ou null si la valeur notée dépasse le sample
 *      (décroissance naturelle, comportement réaliste d'une basse).
 *    - createBeatClock(...).timeAt(pos) : instant d'une position fractionnaire
 *      en battements (inverse exact de positionAt) — sert à programmer les
 *      attaques de notes entre les temps (croches, doubles…).
 *    - outputLatencySeconds(ctx) : latence de sortie audio (outputLatency,
 *      sinon baseLatency, sinon 0). Un événement programmé à T s'ENTEND à
 *      T + latence — jusqu'à 100 ms et plus en Bluetooth : tous les visuels
 *      doivent se caler sur currentTime − latence (transport.visualNow()).
 *    - cursorXAt(anchors, lineEnds, totalBeats, pos) : abscisse du curseur
 *      asservi aux notes. La gravure abcjs n'espace PAS les événements
 *      proportionnellement à leur durée : la position est interpolée en
 *      TEMPS entre les abscisses réellement gravées, avec saut net au
 *      changement de ligne — le curseur ne devance jamais la note allumée.
 *
 * 2. PARTIE WEB AUDIO
 *    - buildNoteVoice(ctx, dest, time, holdS, v) : voix d'une note — sample
 *      transposé (playbackRate), bouclé si v.loopStart/loopEnd (tenue
 *      infinie), ou synthé triangle à enveloppe pluck tenue. Partagée entre
 *      le transport et la préécoute.
 *    - playNotePreview(ctx, v, seconds) : préécoute hors transport (~1,5 s),
 *      rend { stop() }.
 *    - createTransport({ ctx, bpm, beatsPerBar, totalBeats, startGridBeat,
 *      noteEvents, notesEnabled, clicksEnabled, pulsationVoice, getNoteVoice,
 *      loop }) :
 *      horloge à lookahead (setInterval ~25 ms, horizon ~120 ms), chaque clic
 *      programmé sur ctx.currentTime — jamais de setTimeout cumulatif.
 *      Clic = oscillateur sinus court avec enveloppe douce (esthétique Apnée) ;
 *      accent du temps 1 plus aigu et plus fort. pulsationVoice "groove" joue,
 *      aux battements de grille, une batterie de synthèse sobre mixée bas à la
 *      place du clic (le décompte reste au clic). L'AudioContext est créé et
 *      repris par la page au geste utilisateur (bouton play), puis fourni ici.
 *      Notes : la même pompe programme chaque attaque à son instant exact,
 *      via buildNoteVoice sur la voix rendue par getNoteVoice() — lu à CHAQUE
 *      attaque : changer de son ou de note s'applique en vol. Valeur plus
 *      courte que la source : coupe en fin de valeur avec release court
 *      (~50 ms, pas de clic) ; plus longue : décroissance naturelle, sauf
 *      source bouclée qui tient toute la valeur. setNotesEnabled() bascule le
 *      son des notes en vol sans toucher au métronome ; setClicksEnabled()
 *      bascule le métronome sans toucher aux notes ni aux visuels (le
 *      décompte reste toujours audible). stop() et les coupures en vol
 *      arrêtent tous les nœuds actifs et annulent le programmé non joué.
 *      Mixage : basse à 0,8, clics inchangés, master à 0,8 — pire cas
 *      (attaque du sample pleine échelle + clic accentué) ≈ 0,96, sans
 *      saturation, la basse nette et le clic derrière.
 *      visualNow() : instant de position visuelle UNIQUE — currentTime moins
 *      la latence de sortie : ce qui s'affiche suit ce qui s'entend.
 *      stop() rend la position entendue et un point de reprise calé au début
 *      de la mesure en cours : après le re-décompte d'une mesure, le temps 1
 *      retombe exactement sur un début de mesure (le « 1 » du décompte reste
 *      en phase avec les temps forts).
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

  /* Son des notes (mode 3). */
  var NOTE_RELEASE_S = 0.05;     // release de coupe en fin de valeur (anti-clic)
  var SAMPLE_LEVEL = 0.8;        // niveau du sample (pic mesuré à pleine échelle)
  var MASTER_LEVEL = 0.8;        // marge anti-saturation : (0,8 + clic 0,4) × 0,8 < 1
  var SYNTH_FREQ_HZ = 73.42;     // D2 — hauteur par défaut du synthé
  var SYNTH_LEVEL = 0.5;         // le pluck synthé est plus dense que le sample

  /* Groove d'accompagnement (voix de pulsation alternative au clic). Mixé bas :
     lit sonore sous la voix du rythme lu. Pic par temps <= 0,4 (grosse caisse +
     charley), comme le clic accentué — même marge anti-saturation. */
  var GROOVE_KICK_LEVEL = 0.32;
  var GROOVE_SNARE_LEVEL = 0.16;
  var GROOVE_HAT_LEVEL = 0.08;
  var GROOVE_NOISE_S = 0.3;      // durée du buffer de bruit (caisse claire, charley)

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
      },
      /* Instant d'une position fractionnaire en battements — inverse exact de
         positionAt, linéaire par morceaux entre les changements de tempo.
         Au-delà du dernier ancrage : extrapolation au tempo courant (les
         attaques de notes ne sont programmées que dans l'horizon, comme les
         clics, donc l'écart en cas de changement de tempo reste borné). */
      timeAt: function (pos) {
        var s = segs[0];
        for (var i = 1; i < segs.length; i++) {
          if (segs[i].beat <= pos) s = segs[i];
          else break;
        }
        return s.time + (pos - s.beat) * s.spb;
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

  /*
   * Voix du groove d'accompagnement sobre à un temps donné (1-based). Motif
   * fixe, binaire, indépendant de la signature : charley sur CHAQUE temps,
   * grosse caisse sur les temps impairs (le 1 porte le downbeat, comme l'accent
   * aigu du clic), caisse claire sur les temps pairs (backbeat). En 4/4 : kick
   * 1 & 3, caisse claire 2 & 4 ; en 3/4 : kick 1 & 3, caisse claire 2 ; en 2/4 :
   * kick 1, caisse claire 2. Rend { kick, snare, hat } (booléens).
   */
  function grooveVoicesAt(beatInBar) {
    var even = beatInBar % 2 === 0;
    return { kick: !even, snare: even, hat: true };
  }

  /*
   * Variante bouclée de describeBeat, pour le repeat et le flux infini :
   *  - totalBeats infini : jamais de fin (flux ∞) ;
   *  - loopOn : les battements au-delà de totalBeats sont REPLIÉS
   *    (modulo totalBeats, champs wrapped recalculés, marqueur wrapped) —
   *    le cycle recommence sans couture, sans nouveau décompte ;
   *  - loop coupé en vol : la fin tombe sur la PROCHAINE frontière de grille
   *    (multiple de totalBeats) — le cycle en cours se termine toujours.
   * Sous totalBeats, rend exactement le même battement que describeBeat.
   */
  function describeLoopedBeat(step, startGridBeat, beatsPerBar, totalBeats, loopOn) {
    var d = describeBeat(step, startGridBeat, beatsPerBar, Infinity);
    if (d.type !== "beat" || d.gridBeat < totalBeats) return d;
    if (!loopOn && d.gridBeat % totalBeats === 0) {
      return { type: "end", gridBeat: d.gridBeat };
    }
    var w = d.gridBeat % totalBeats;
    var bb = barBeat(w, beatsPerBar);
    return {
      type: "beat",
      gridBeat: w,
      measure: bb.measure,
      beatInBar: bb.beat,
      pulseIndex: w % beatsPerBar,
      accent: bb.beat === 1,
      wrapped: true
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

  /*
   * Indices des événements de la timeline « allumés » à la position gridBeat
   * (en temps de grille). Une note est allumée sur [début, début + durée) :
   * allumée pile à l'attaque, éteinte pile à la fin de sa valeur. Une chaîne
   * liée (tiedToNext) s'allume et s'éteint d'un seul tenant sur la durée
   * cumulée, toutes les têtes ensemble. Les silences ne s'allument jamais.
   * Défensif : une liaison vers un silence ou en fin de timeline clôt la
   * chaîne sans erreur.
   */
  function litIndicesAt(notes, gridBeat) {
    var lit = [];
    var i = 0;
    while (i < notes.length) {
      if (notes[i].isRest) { i += 1; continue; }
      var j = i; /* dernier événement de la chaîne liée démarrant en i */
      while (notes[j].tiedToNext && j + 1 < notes.length && !notes[j + 1].isRest) j += 1;
      var start = notes[i].startBeats;
      var end = notes[j].startBeats + notes[j].durationBeats;
      if (gridBeat >= start && gridBeat < end) {
        for (var k = i; k <= j; k++) lit.push(k);
      }
      i = j + 1;
    }
    return lit;
  }

  /*
   * Événements sonores du mode 3 pour une timeline (triée par startBeats) :
   * un événement { startBeats, holdBeats } par ATTAQUE. Les silences ne
   * sonnent jamais ; une chaîne liée (tiedToNext) produit UNE seule attaque
   * dont holdBeats est la durée cumulée de la chaîne — même parcours que
   * litIndicesAt, mêmes cas dégradés (liaison vers un silence ou pendante en
   * fin de timeline : la chaîne se clôt sans erreur). soundOn false (mode
   * sans son) : aucun événement.
   */
  function noteSoundEvents(notes, soundOn) {
    if (soundOn === false) return [];
    var events = [];
    var i = 0;
    while (i < notes.length) {
      if (notes[i].isRest) { i += 1; continue; }
      var j = i;
      while (notes[j].tiedToNext && j + 1 < notes.length && !notes[j + 1].isRest) j += 1;
      events.push({
        startBeats: notes[i].startBeats,
        holdBeats: notes[j].startBeats + notes[j].durationBeats - notes[i].startBeats
      });
      i = j + 1;
    }
    return events;
  }

  /*
   * Durée de coupe en secondes après l'attaque pour une note tenue holdBeats
   * au tempo bpm, face à un sample de sampleDurationS secondes :
   * - valeur notée plus courte que le sample -> couper à la fin de la valeur
   *   (le release anti-clic s'ajoute ensuite) ;
   * - valeur notée >= sample -> null : le sample décroît naturellement,
   *   comme une vraie basse dont on laisse sonner la corde.
   */
  function noteCutSeconds(holdBeats, bpm, sampleDurationS) {
    var holdS = holdBeats * 60 / bpm;
    return holdS < sampleDurationS ? holdS : null;
  }

  /*
   * Latence de sortie audio en secondes : un événement programmé à T sur
   * l'horloge audio S'ENTEND à T + latence (outputLatency quand le
   * navigateur l'expose, baseLatency en repli, 0 sinon — jusqu'à 100 ms et
   * plus en Bluetooth). Les visuels calés sur currentTime brut seraient
   * systématiquement EN AVANCE sur le son de cette latence.
   */
  function outputLatencySeconds(ctx) {
    var l = ctx ? ctx.outputLatency : 0;
    if (typeof l === "number" && isFinite(l) && l > 0) return l;
    l = ctx ? ctx.baseLatency : 0;
    if (typeof l === "number" && isFinite(l) && l > 0) return l;
    return 0;
  }

  /*
   * Curseur asservi aux notes. La gravure abcjs n'espace PAS les événements
   * proportionnellement à leur durée : une interpolation linéaire par ligne
   * dérive donc de la note en cours (tantôt en avance, tantôt en retard).
   * Ici l'abscisse est interpolée en TEMPS entre les positions réellement
   * gravées :
   *  - anchors    : [{ beat, x, line }] triés par beat — une ancre par
   *    événement de la timeline (silences compris), x = abscisse gravée ;
   *  - lineEnds   : abscisse de fin de chaque ligne ;
   *  - totalBeats : borne temporelle du dernier événement de la grille.
   * Garanties : à l'attaque de l'événement i, x = x_i EXACTEMENT ; entre
   * deux événements d'une même ligne, interpolation linéaire en temps
   * (strictement monotone dès que la gravure l'est) ; pour le dernier
   * événement d'une ligne, interpolation vers la fin de ligne sur sa durée ;
   * changement de ligne = saut net à l'attaque du premier événement de la
   * ligne suivante ; le curseur n'atteint jamais x_{i+1} avant beat_{i+1} —
   * cohérence totale avec litIndicesAt. Rend { x, line }, ou null sans ancre.
   */
  function cursorXAt(anchors, lineEnds, totalBeats, pos) {
    if (!anchors || !anchors.length) return null;
    if (pos <= anchors[0].beat) return { x: anchors[0].x, line: anchors[0].line };
    var i = 0;
    for (var k = 1; k < anchors.length; k++) {
      if (anchors[k].beat <= pos) i = k;
      else break;
    }
    var a = anchors[i];
    var next = i + 1 < anchors.length ? anchors[i + 1] : null;
    if (next && next.line === a.line) {
      return { x: a.x + (next.x - a.x) * (pos - a.beat) / (next.beat - a.beat), line: a.line };
    }
    /* Dernier événement de sa ligne : interpolation vers la fin de ligne sur
       sa durée (borne = attaque suivante, ou fin de grille). */
    var endBeat = next ? next.beat : totalBeats;
    var endX = typeof lineEnds[a.line] === "number" ? lineEnds[a.line] : a.x;
    if (endBeat <= a.beat || pos >= endBeat) return { x: endX, line: a.line };
    return { x: a.x + (endX - a.x) * (pos - a.beat) / (endBeat - a.beat), line: a.line };
  }

  /* ========================== partie Web Audio ========================== */

  /*
   * Construit et démarre une voix de note sur dest à l'instant time, tenue
   * holdS secondes. v décrit la source :
   *  - { buffer, rate?, loopStart?, loopEnd?, gain? } : sample transposé par
   *    rate (playbackRate) ; si loopEnd > loopStart la source boucle sur cette
   *    fenêtre (secondes de buffer, insensibles à rate) et TIENT la note
   *    indéfiniment ;
   *  - { synthHz? } ou null : synthé triangle + passe-bas, enveloppe pluck
   *    tenue (corps bref puis palier de sustain) — tient n'importe quelle
   *    valeur, ronde à 40 BPM comprise.
   * Coupe de fin de valeur (release NOTE_RELEASE_S, pas de clic audible) posée
   * sur cutGain ; une source non bouclée plus courte que la valeur décroît
   * naturellement, comme une corde qu'on laisse sonner.
   * Rend { src, cut, start } — nœuds démarrés, cut connecté à dest.
   */
  function buildNoteVoice(ctx, dest, time, holdS, v) {
    var cutGain = ctx.createGain();
    cutGain.connect(dest);
    var src, level, tailS;
    if (v && v.buffer) {
      var rate = v.rate > 0 ? v.rate : 1;
      src = ctx.createBufferSource();
      src.buffer = v.buffer;
      src.playbackRate.value = rate;
      if (v.loopEnd > v.loopStart) {
        src.loop = true;
        src.loopStart = v.loopStart;
        src.loopEnd = v.loopEnd;
        tailS = Infinity; // la boucle tient : coupe toujours en fin de valeur
      } else {
        tailS = v.buffer.duration / rate;
      }
      src.connect(cutGain);
      level = SAMPLE_LEVEL * (v.gain > 0 ? v.gain : 1);
    } else {
      src = ctx.createOscillator();
      src.type = "triangle";
      src.frequency.value = v && v.synthHz > 0 ? v.synthHz : SYNTH_FREQ_HZ;
      var filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.Q.value = 0.7;
      filter.frequency.setValueAtTime(900, time);
      filter.frequency.exponentialRampToValueAtTime(180, time + 0.5);
      var env = ctx.createGain(); // pluck tenu : corps bref, palier de sustain
      env.gain.setValueAtTime(0.0001, time);
      env.gain.linearRampToValueAtTime(1, time + 0.005);
      env.gain.exponentialRampToValueAtTime(0.45, time + 0.35);
      env.gain.linearRampToValueAtTime(0.3, time + Math.max(holdS, 0.4));
      src.connect(filter);
      filter.connect(env);
      env.connect(cutGain);
      level = SYNTH_LEVEL;
      tailS = holdS + 0.3; // toujours > la valeur : la coupe de fin s'applique
    }
    cutGain.gain.setValueAtTime(level, time);
    var stopAt;
    if (holdS < tailS) {
      // Source plus longue que la valeur (ou bouclée) : coupe en fin de valeur.
      cutGain.gain.setValueAtTime(level, time + holdS);
      cutGain.gain.exponentialRampToValueAtTime(0.0001, time + holdS + NOTE_RELEASE_S);
      cutGain.gain.linearRampToValueAtTime(0, time + holdS + NOTE_RELEASE_S + 0.01);
      stopAt = time + holdS + NOTE_RELEASE_S + 0.02;
    } else {
      // Valeur plus longue que la source : décroissance naturelle.
      stopAt = time + tailS + 0.05;
    }
    src.start(time);
    src.stop(stopAt);
    return { src: src, cut: cutGain, start: time };
  }

  /*
   * Préécoute d'un son hors transport : joue la voix v (cf. buildNoteVoice)
   * pendant seconds (défaut 1,5 s) sur ctx.destination. Rend { stop() } pour
   * couper court quand une autre préécoute démarre par-dessus.
   */
  function playNotePreview(ctx, v, seconds) {
    var dur = seconds > 0 ? seconds : 1.5;
    var master = ctx.createGain();
    master.gain.value = MASTER_LEVEL;
    master.connect(ctx.destination);
    var voice = buildNoteVoice(ctx, master, ctx.currentTime + 0.02, dur, v);
    var done = false;
    voice.src.onended = function () {
      done = true;
      try { master.disconnect(); } catch (e) { /* déjà déconnecté */ }
    };
    return {
      stop: function () {
        if (done) return;
        done = true;
        var now = ctx.currentTime;
        try {
          var g = voice.cut.gain;
          g.cancelScheduledValues(now);
          g.setValueAtTime(g.value, now);
          g.exponentialRampToValueAtTime(0.0001, now + NOTE_RELEASE_S);
          g.linearRampToValueAtTime(0, now + NOTE_RELEASE_S + 0.01);
          voice.src.stop(now + NOTE_RELEASE_S + 0.02);
        } catch (e) { /* nœud déjà arrêté */ }
      }
    };
  }

  /*
   * Voix de batterie de synthèse du groove (mixées bas, esthétique « Apnée »).
   * Chaque voix rend { srcs, gain } — sources démarrées, gain final connecté à
   * dest — pour un suivi/arrêt uniforme (cf. `live` du transport). Aucun sample :
   * grosse caisse = triangle à chute de hauteur ; caisse claire & charley =
   * bruit filtré passe-haut, court. Le sinus reste réservé au clic.
   */
  function buildNoiseBuffer(ctx) {
    var sr = ctx.sampleRate || 44100;
    var buf = ctx.createBuffer(1, Math.max(1, Math.floor(sr * GROOVE_NOISE_S)), sr);
    var data = buf.getChannelData(0);
    for (var i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  function buildKick(ctx, dest, time) {
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(110, time);
    osc.frequency.exponentialRampToValueAtTime(48, time + 0.11);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(GROOVE_KICK_LEVEL, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);
    gain.gain.linearRampToValueAtTime(0, time + 0.19);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + 0.22);
    return { srcs: [osc], gain: gain };
  }

  /* Coup de bruit filtré passe-haut, court : sert la caisse claire (grave, hzCut
     bas, décroissance moyenne) et le charley (aigu, hzCut haut, très court). */
  function buildNoiseHit(ctx, dest, time, noise, hzCut, level, decayS) {
    var src = ctx.createBufferSource();
    src.buffer = noise;
    var hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = hzCut;
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(level, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + decayS);
    gain.gain.linearRampToValueAtTime(0, time + decayS + 0.01);
    src.connect(hp);
    hp.connect(gain);
    gain.connect(dest);
    src.start(time);
    src.stop(time + decayS + 0.02);
    return { srcs: [src], gain: gain };
  }

  function buildSnare(ctx, dest, time, noise) {
    return buildNoiseHit(ctx, dest, time, noise, 1500, GROOVE_SNARE_LEVEL, 0.14);
  }

  function buildHat(ctx, dest, time, noise) {
    return buildNoiseHit(ctx, dest, time, noise, 7000, GROOVE_HAT_LEVEL, 0.03);
  }

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
    var loopOn = !!opts.loop; // boucle sans couture (repeat) — bascule en vol via setLoop
    var everLooped = false;   // au moins un battement replié émis (pour la reprise)

    /* Son des notes : événements { startBeats, holdBeats } triés, fournis par
       noteSoundEvents. On ne rejoue jamais une attaque antérieure au point de
       départ (reprise après pause : la note en cours ne re-sonne pas, les
       suivantes oui). getNoteVoice() est lu à CHAQUE attaque : changer de son
       ou de note dans les réglages s'applique aux attaques suivantes en vol. */
    var noteEvents = opts.noteEvents || [];
    var notesOn = !!opts.notesEnabled;
    var clicksOn = opts.clicksEnabled !== false;
    var pulsationVoice = opts.pulsationVoice === "groove" ? "groove" : "clic";
    var noise = pulsationVoice === "groove" ? buildNoiseBuffer(ctx) : null;
    var getNoteVoice = opts.getNoteVoice || function () { return null; };
    var noteIdx = 0;
    var cycleBase = 0;       // décalage en temps des cycles de boucle déjà recyclés
    while (noteIdx < noteEvents.length && noteEvents[noteIdx].startBeats < startGridBeat) noteIdx += 1;
    var liveNotes = [];      // voix actives { src, cut, start } pour coupure/annulation

    var master = ctx.createGain();
    master.gain.value = MASTER_LEVEL;
    master.connect(ctx.destination);

    /* Suivi uniforme des voix de pulsation (clic ET groove) dans `live` :
       chaque entrée { srcs, gain } peut être coupée net (setClicksEnabled off,
       stop). onended sur la source primaire retire l'entrée et déconnecte. */
    function trackPulsation(entry) {
      live.push(entry);
      entry.srcs[0].onended = function () {
        var i = live.indexOf(entry);
        if (i !== -1) live.splice(i, 1);
        try { entry.gain.disconnect(); } catch (e) { /* déjà déconnecté */ }
      };
    }

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
      trackPulsation({ srcs: [osc], gain: gain });
    }

    /* Voix de pulsation à un battement : le décompte reste TOUJOURS au clic
       (repère de départ limpide) ; en mode groove, les battements de la grille
       jouent la batterie de synthèse (grosse caisse / caisse claire / charley
       selon le temps), le groove n'entrant donc qu'à la barre 1. */
    function schedulePulsation(time, d) {
      if (pulsationVoice === "clic" || d.type === "countin") {
        scheduleClick(time, d.accent);
        return;
      }
      var v = grooveVoicesAt(d.beatInBar);
      if (v.kick) trackPulsation(buildKick(ctx, master, time));
      if (v.snare) trackPulsation(buildSnare(ctx, master, time, noise));
      if (v.hat) trackPulsation(buildHat(ctx, master, time, noise));
    }

    /* Voix d'une note : construction partagée avec la préécoute
       (buildNoteVoice). getNoteVoice() est lu à chaque attaque. */
    function scheduleNoteVoice(time, holdBeats) {
      var holdS = holdBeats * 60 / clock.bpm();
      var voice = buildNoteVoice(ctx, master, time, holdS, getNoteVoice());
      liveNotes.push(voice);
      voice.src.onended = function () {
        var i = liveNotes.indexOf(voice);
        if (i !== -1) liveNotes.splice(i, 1);
        voice.cut.disconnect();
      };
    }

    /* Coupe toutes les voix de notes : release court sur la note en cours
       (pas de clic), annulation nette des attaques programmées non encore
       jouées (stop avant leur start : elles ne sonnent jamais). */
    function killNotes(releaseS) {
      var now = ctx.currentTime;
      for (var i = 0; i < liveNotes.length; i++) {
        var v = liveNotes[i];
        v.src.onended = null;
        try {
          var g = v.cut.gain;
          g.cancelScheduledValues(now);
          if (v.start <= now) {
            g.setValueAtTime(g.value, now);
            g.exponentialRampToValueAtTime(0.0001, now + releaseS);
            g.linearRampToValueAtTime(0, now + releaseS + 0.01);
            v.src.stop(now + releaseS + 0.02);
          } else {
            g.setValueAtTime(0, now);
            v.src.stop(now);
          }
        } catch (e) { /* nœud déjà arrêté */ }
      }
      liveNotes.length = 0;
    }

    /* Programme les attaques de notes qui tombent dans l'horizon, aux instants
       exacts de la grille (positions fractionnaires via clock.timeAt). Une
       attaque déjà passée — son coupé au moment où elle devait sonner — est
       sautée : réactiver le mode 3 fait sonner les prochaines notes, pas
       celle en cours. En boucle (repeat), le tableau est recyclé cycle après
       cycle avec un décalage de totalBeats — sans couture, sans décompte.
       Le tableau noteEvents est lu par référence : le flux ∞ y POUSSE de
       nouveaux événements en cours de lecture, programmés au fil de l'eau. */
    function scheduleNotes(horizon) {
      if (!notesOn) return;
      var now = ctx.currentTime;
      for (;;) {
        if (noteIdx >= noteEvents.length) {
          if (!loopOn || !isFinite(totalBeats) || !noteEvents.length) break;
          noteIdx = 0;
          cycleBase += totalBeats;
        }
        var ev = noteEvents[noteIdx];
        var step = countInBeats(bpb) + (cycleBase + ev.startBeats - startGridBeat);
        var t = clock.timeAt(step);
        if (t >= horizon) break;
        noteIdx += 1;
        if (t < now) continue;
        if (allScheduled && t >= endTime) break; // fin décidée : rien après la barre finale
        scheduleNoteVoice(t, ev.holdBeats);
      }
    }

    /* Pompe à lookahead : programme tous les battements — et les attaques de
       notes du mode 3 — qui tombent dans l'horizon, sur l'horloge audio
       (ctx.currentTime). Elle ne s'éteint que lorsque clics ET notes sont
       programmés ; notes coupées, elle reste en veille pour une réactivation
       en vol (stop() la coupe dans tous les cas).
       Le battement de FIN n'est jamais consommé sur l'horloge : tant qu'il
       n'est pas atteint, armer le repeat (setLoop) le transforme en premier
       battement du cycle suivant — boucle sans couture. */
    function pump() {
      if (stopped) return;
      var horizon = ctx.currentTime + SCHEDULE_HORIZON_S;
      if (!allScheduled) {
        while (clock.nextTime() < horizon) {
          var d = describeLoopedBeat(clock.nextIndex(), startGridBeat, bpb, totalBeats, loopOn);
          if (d.type === "end") {
            endTime = clock.nextTime();
            allScheduled = true;
            break;
          }
          var ev = clock.advance();
          if (d.wrapped) everLooped = true;
          // Métronome coupé : les battements avancent et les visuels restent
          // (pastilles), seuls les clics de grille se taisent. Le décompte
          // reste toujours audible : c'est le repère de départ.
          if (clicksOn || d.type === "countin") schedulePulsation(ev.time, d);
          d.time = ev.time;
          visuals.push(d);
        }
      }
      scheduleNotes(horizon);
      if (allScheduled && noteIdx >= noteEvents.length) clearInterval(timer);
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
      /* Instant de position visuelle UNIQUE : l'horloge audio moins la
         latence de sortie. Un événement programmé à T s'entend à T + latence :
         tous les visuels (pastilles, décompte, allumage, curseur, statut,
         fin) doivent se lire à visualNow(), jamais à currentTime brut. */
      visualNow: function () {
        return ctx.currentTime - outputLatencySeconds(ctx);
      },
      /* Battements dont l'instant programmé est atteint (pour la rAF). */
      takeDueVisuals: function (t) {
        var due = [];
        while (visuals.length && visuals[0].time <= t) due.push(visuals.shift());
        return due;
      },
      isFinished: function (t) { return allScheduled && t >= endTime; },
      /* Boucle (repeat) en vol. Armer la boucle avant que la fin ne soit
         atteinte ré-ouvre la grille : le battement de fin (jamais consommé)
         redevient le premier battement du cycle suivant. La couper laisse le
         cycle en cours se terminer (fin à la prochaine frontière de grille). */
      setLoop: function (on) {
        on = !!on;
        if (on === loopOn) return;
        loopOn = on;
        if (on && allScheduled && !stopped && ctx.currentTime < endTime) {
          allScheduled = false;
          endTime = Infinity;
          pump();
        }
      },
      /* Bascule du son des notes en vol (mode 3 <-> 1/2), sans toucher à la
         lecture ni au métronome : coupure = release court sur la note en
         cours + annulation des attaques programmées ; réactivation = les
         prochaines notes sonnent (la pompe rattrape dans l'horizon). */
      setNotesEnabled: function (on) {
        on = !!on;
        if (on === notesOn) return;
        notesOn = on;
        if (!on) killNotes(NOTE_RELEASE_S);
        else pump();
      },
      /* Bascule du métronome en vol, sans toucher lecture, visuels ni notes :
         coupure = arrêt net des clics déjà programmés non joués ;
         réactivation = les prochains battements cliquent (pompe/horizon). */
      setClicksEnabled: function (on) {
        on = !!on;
        if (on === clicksOn) return;
        clicksOn = on;
        if (!on) {
          var now = ctx.currentTime;
          for (var i = 0; i < live.length; i++) {
            var ent = live[i];
            for (var s = 0; s < ent.srcs.length; s++) {
              try {
                ent.srcs[s].onended = null;
                ent.srcs[s].stop(now);
              } catch (err) { /* nœud déjà arrêté */ }
            }
            try { ent.gain.disconnect(); } catch (err) { /* déjà déconnecté */ }
          }
          live.length = 0;
        }
      },
      /* Arrêt net : coupe la pompe, les clics déjà programmés et toutes les
         voix de notes actives, et rend la position atteinte + le battement de
         grille où reprendre. */
      stop: function () {
        if (stopped) return null;
        stopped = true;
        clearInterval(timer);
        var now = ctx.currentTime;
        killNotes(0.03); // aucun son de note ne survit à un arrêt
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(master.gain.value, now);
        master.gain.linearRampToValueAtTime(0, now + 0.02);
        for (var i = 0; i < live.length; i++) {
          var ent = live[i];
          for (var s = 0; s < ent.srcs.length; s++) {
            try {
              ent.srcs[s].onended = null;
              ent.srcs[s].stop(now + 0.03);
            } catch (err) { /* nœud déjà arrêté */ }
          }
        }
        live.length = 0;
        // Unique setTimeout de nettoyage (pas de programmation cumulative).
        setTimeout(function () {
          try { master.disconnect(); } catch (e) { /* déjà déconnecté */ }
        }, 80);
        /* Position ENTENDUE à l'arrêt (latence de sortie déduite), reprise
           calée au DÉBUT de la mesure en cours : le re-décompte d'une mesure
           est alors suivi pile d'un temps 1 — le « 1 » du décompte et les
           accents restent en phase avec les débuts de mesure. Une reprise à
           mi-mesure décalerait le métronome des barres pour tout le reste
           de la lecture. */
        var heard = now - outputLatencySeconds(ctx);
        var pos = startGridBeat + (clock.positionAt(heard) - countInBeats(bpb));
        if (pos < startGridBeat) pos = startGridBeat; // pause pendant le décompte
        if (pos > totalBeats) {
          // Cycles de boucle : position repliée dans la grille ; sinon
          // (léger dépassement en toute fin) borne à la fin.
          pos = everLooped ? pos % totalBeats : totalBeats;
        }
        var resumeBeat = Math.floor(pos / bpb) * bpb;
        if (isFinite(totalBeats) && resumeBeat > totalBeats - bpb) resumeBeat = totalBeats - bpb;
        if (resumeBeat < 0) resumeBeat = 0;
        return { position: pos, resumeBeat: resumeBeat };
      }
    };
  }

  return {
    LOOKAHEAD_MS: LOOKAHEAD_MS,
    SCHEDULE_HORIZON_S: SCHEDULE_HORIZON_S,
    START_DELAY_S: START_DELAY_S,
    NOTE_RELEASE_S: NOTE_RELEASE_S,
    createBeatClock: createBeatClock,
    meterBeats: meterBeats,
    countInBeats: countInBeats,
    barBeat: barBeat,
    grooveVoicesAt: grooveVoicesAt,
    describeBeat: describeBeat,
    describeLoopedBeat: describeLoopedBeat,
    litIndicesAt: litIndicesAt,
    noteSoundEvents: noteSoundEvents,
    noteCutSeconds: noteCutSeconds,
    outputLatencySeconds: outputLatencySeconds,
    cursorXAt: cursorXAt,
    buildNoteVoice: buildNoteVoice,
    playNotePreview: playNotePreview,
    createTransport: createTransport
  };
}));
