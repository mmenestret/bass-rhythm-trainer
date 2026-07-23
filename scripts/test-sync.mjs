/*
 * Harnais de synchronisation de bout en bout — mock AudioContext + pompe
 * simulée pas à pas (les timers setInterval/setTimeout du moteur sont
 * capturés et pilotés à la main, l'horloge audio avance par pas de 25 ms).
 * Usage : node scripts/test-sync.mjs
 *
 * Vérifie :
 *  (1) instants des clics exacts (t0 + k·60/BPM à 1e-9 près), premier clic
 *      programmé dans le futur et jamais sauté — 60 et 137 BPM ;
 *  (2) clics accentués EXACTEMENT aux débuts de mesure pour les 6 signatures,
 *      décompte d'une mesure inclus dans le référentiel : le temps 1 de la
 *      mesure 1 tombe pile après countInBeats battements ;
 *  (3) grille générée réelle (générateur + rng déterministe) : chaque attaque
 *      de note à startBeats ENTIER coïncide STRICTEMENT (===) avec l'instant
 *      du clic correspondant ; attaques fractionnaires à timeAt exact ;
 *  (4) aller-retour positionAt(instant du clic k) = k (1e-9) ;
 *  (5) changement de tempo en vol (60 -> 90 -> 95, +5 en plein milieu) :
 *      les égalités 1-4 restent vraies après les changements ;
 *  (6) pause puis reprise : point de reprise calé au début de la mesure en
 *      cours, re-décompte accentué, attaques === clics, notes antérieures au
 *      point de reprise jamais rejouées ;
 *  (7) curseur asservi aux notes (cursorXAt, géométrie factice) : x = x_i
 *      exactement à l'attaque, strictement monotone entre attaques, saut de
 *      ligne unique, jamais en avance sur la note allumée (litIndicesAt) ;
 *  (8) compensation de latence (80 ms factices) : la position visuelle à
 *      l'instant où un clic S'ENTEND est exactement le battement de ce clic
 *      (transport.visualNow), pastilles jamais déclenchées sur les instants
 *      programmés en avance, position de pause calculée sur l'entendu.
 *  (9) groove d'accompagnement (pulsationVoice "groove") : le décompte reste au
 *      clic, les battements de grille jouent la batterie de synthèse (grosse
 *      caisse / caisse claire / charley) au lieu du clic, comptes conformes à
 *      grooveVoicesAt, premier hit à la barre 1 ; mode clic (défaut) inchangé.
 * Code de sortie non nul si échec.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const {
  START_DELAY_S,
  createBeatClock,
  meterBeats,
  countInBeats,
  grooveVoicesAt,
  litIndicesAt,
  noteSoundEvents,
  outputLatencySeconds,
  cursorXAt,
  createTransport,
} = require(path.join(ROOT, "js", "engine.js"));
const { generateExercise } = require(path.join(ROOT, "js", "generator.js"));

let checks = 0;
const failures = [];
function expect(cond, msg) {
  checks++;
  if (!cond) failures.push(msg);
  return cond;
}
const close = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const note = (startBeats, durationBeats, tie = false) =>
  ({ startBeats, durationBeats, isRest: false, tiedToNext: tie });
const rest = (startBeats, durationBeats) =>
  ({ startBeats, durationBeats, isRest: true, tiedToNext: false });

/* ---------- timers capturés : la pompe du moteur est pilotée à la main ---------- */
const timers = [];
const realSetInterval = globalThis.setInterval;
const realClearInterval = globalThis.clearInterval;
const realSetTimeout = globalThis.setTimeout;
globalThis.setInterval = (fn) => { const h = { fn, cleared: false }; timers.push(h); return h; };
globalThis.clearInterval = (h) => { if (h && typeof h === "object") h.cleared = true; };
globalThis.setTimeout = (fn) => { fn(); return 0; }; // unique setTimeout : nettoyage du stop()

/* ---------- mock AudioContext ---------- */
function mockParam() {
  return {
    value: 0,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
    cancelScheduledValues() {},
  };
}
function createMockCtx(opts = {}) {
  const ctx = {
    currentTime: opts.startAt ?? 0,
    destination: {},
    clickStarts: [], // { time, freq, scheduledAt } — oscillateurs sinus (clics)
    noteStarts: [],  // { time, scheduledAt } — AudioBufferSourceNode (attaques de notes)
    synthStarts: [], // oscillateurs triangle (repli synthé, non utilisé ici)
    createGain() { return { gain: mockParam(), connect() {}, disconnect() {} }; },
    createOscillator() {
      const osc = {
        type: "sine",
        frequency: mockParam(),
        onended: null,
        connect() {},
        start(t) {
          const rec = { time: t, freq: osc.frequency.value, scheduledAt: ctx.currentTime };
          (osc.type === "sine" ? ctx.clickStarts : ctx.synthStarts).push(rec);
        },
        stop() {},
      };
      return osc;
    },
    createBufferSource() {
      const src = {
        buffer: null,
        playbackRate: mockParam(),
        loop: false,
        loopStart: 0,
        loopEnd: 0,
        onended: null,
        connect() {},
        start(t) { ctx.noteStarts.push({ time: t, scheduledAt: ctx.currentTime }); },
        stop() {},
      };
      return src;
    },
    createBiquadFilter() {
      return { type: "", Q: mockParam(), frequency: mockParam(), connect() {} };
    },
    sampleRate: 44100,
    createBuffer(channels, length) {
      return { length, getChannelData: () => new Float32Array(length) };
    },
  };
  if ("outputLatency" in opts) ctx.outputLatency = opts.outputLatency;
  if ("baseLatency" in opts) ctx.baseLatency = opts.baseLatency;
  return ctx;
}
/* Avance l'horloge audio par pas de 25 ms (période réelle de la pompe) en
   déclenchant tous les timers vivants — pompe simulée pas à pas. */
function stepPump(ctx, until, stepS = 0.025) {
  while (ctx.currentTime + 1e-12 < until) {
    ctx.currentTime = Math.min(until, ctx.currentTime + stepS);
    for (const h of timers) if (!h.cleared) h.fn();
  }
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const ACCENT_FREQ = 1320; // fréquence du clic accentué (scheduleClick)
const BUFFER = { duration: 2.575 }; // mock du sample bass-D2

try {

  /* ================ (1) + (4) instants des clics exacts, 60 et 137 BPM ================ */
  for (const BPM of [60, 137]) {
    const ctx = createMockCtx();
    const t0 = ctx.currentTime + START_DELAY_S;
    const spb = 60 / BPM;
    const tr = createTransport({
      ctx, bpm: BPM, beatsPerBar: 4, totalBeats: 8,
      noteEvents: [], notesEnabled: false, getNoteVoice: () => null,
    });
    stepPump(ctx, t0 + (4 + 8 + 2) * spb);
    const clicks = ctx.clickStarts;

    expect(clicks.length === 12, `${BPM} BPM — ${clicks.length} clic(s) au lieu de 12 (décompte 4 + grille 8)`);
    expect(clicks.length > 0 && close(clicks[0].time, t0),
      `${BPM} BPM — premier clic à ${clicks[0] && clicks[0].time}, attendu t0 = ${t0}`);
    expect(clicks.length > 0 && clicks[0].scheduledAt < clicks[0].time,
      `${BPM} BPM — premier clic programmé dans le passé (sauté ou en retard)`);
    expect(clicks.every((c) => c.time >= c.scheduledAt),
      `${BPM} BPM — au moins un clic programmé dans le passé`);
    let maxErr = 0;
    clicks.forEach((c, k) => { maxErr = Math.max(maxErr, Math.abs(c.time - (t0 + k * spb))); });
    expect(maxErr <= 1e-9, `${BPM} BPM — dérive ${maxErr} s sur la grille t0 + k·60/BPM`);
    // (4) aller-retour : positionAt(instant du clic k) = k.
    clicks.forEach((c, k) => {
      expect(close(tr.positionAt(c.time).step, k),
        `${BPM} BPM — positionAt(clic ${k}) = ${tr.positionAt(c.time).step}, attendu ${k}`);
    });
    expect(tr.isFinished(ctx.currentTime), `${BPM} BPM — fin de grille non détectée`);
  }

  /* ================ (2) accents aux débuts de mesure, 6 signatures ================ */
  for (const meter of ["2/4", "3/4", "4/4", "2/2", "3/2", "4/2"]) {
    const bpb = meterBeats(meter);
    const countIn = countInBeats(bpb);
    const total = 3 * bpb; // 3 mesures
    const ctx = createMockCtx();
    const t0 = ctx.currentTime + START_DELAY_S;
    const spb = 60 / 120;
    const tr = createTransport({
      ctx, bpm: 120, beatsPerBar: bpb, totalBeats: total,
      noteEvents: [], notesEnabled: false, getNoteVoice: () => null,
    });
    stepPump(ctx, t0 + (countIn + total + 2) * spb);
    const clicks = ctx.clickStarts;

    expect(clicks.length === countIn + total, `${meter} — ${clicks.length} clic(s) au lieu de ${countIn + total}`);
    clicks.forEach((c, k) => {
      const wantAccent = k < countIn ? k === 0 : (k - countIn) % bpb === 0;
      expect((c.freq === ACCENT_FREQ) === wantAccent,
        `${meter} — clic ${k} : accent ${c.freq === ACCENT_FREQ}, attendu ${wantAccent}`);
    });
    // Le temps 1 de la mesure 1 tombe PILE après countInBeats battements.
    expect(clicks.length > countIn && close(clicks[countIn].time, t0 + countIn * spb),
      `${meter} — temps 1 de la mesure 1 à ${clicks[countIn] && clicks[countIn].time}, attendu t0 + ${countIn}·spb`);
    expect(clicks.length > countIn && clicks[countIn].freq === ACCENT_FREQ,
      `${meter} — le temps 1 de la mesure 1 n'est pas accentué`);
    void tr;
  }

  /* ================ (3) grille générée réelle : attaques = grille des clics ================ */
  {
    let notes = null, events = null;
    for (let seed = 1; seed <= 50 && !notes; seed++) {
      const ex = generateExercise({
        figures: ["blanche", "noire", "croche", "double"],
        level: 3, meter: "4/4", measures: 4, rng: mulberry32(seed),
      });
      const evs = noteSoundEvents(ex.notes);
      if (evs.some((e) => Number.isInteger(e.startBeats)) &&
          evs.some((e) => !Number.isInteger(e.startBeats))) {
        notes = ex.notes; events = evs;
      }
    }
    expect(!!notes, "grille générée — aucune graine ne produit d'attaques entières ET fractionnaires");

    if (notes) {
      const ctx = createMockCtx();
      const t0 = ctx.currentTime + START_DELAY_S;
      const ref = createBeatClock({ startTime: t0, bpm: 60 }); // grille de référence indépendante
      const tr = createTransport({
        ctx, bpm: 60, beatsPerBar: 4, totalBeats: 16,
        noteEvents: events, notesEnabled: true, getNoteVoice: () => ({ buffer: BUFFER }),
      });
      stepPump(ctx, t0 + (4 + 16 + 2) * 1);

      expect(ctx.clickStarts.length === 20, `grille générée — ${ctx.clickStarts.length} clic(s) au lieu de 20`);
      expect(ctx.noteStarts.length === events.length,
        `grille générée — ${ctx.noteStarts.length} attaque(s) programmée(s) pour ${events.length} événement(s)`);
      expect(ctx.noteStarts.every((n) => n.time >= n.scheduledAt),
        "grille générée — au moins une attaque programmée dans le passé");

      events.forEach((ev, j) => {
        const step = 4 + ev.startBeats;
        const t = ctx.noteStarts[j] && ctx.noteStarts[j].time;
        if (t === undefined) return;
        if (Number.isInteger(ev.startBeats)) {
          expect(t === ctx.clickStarts[step].time,
            `grille générée — attaque entière au temps ${ev.startBeats} : ${t} !== clic ${step} (${ctx.clickStarts[step].time}), égalité stricte exigée`);
        } else {
          expect(t === ref.timeAt(step),
            `grille générée — attaque fractionnaire au temps ${ev.startBeats} : ${t} !== timeAt(${step}) = ${ref.timeAt(step)}`);
          expect(close(tr.positionAt(t).step, step),
            `grille générée — positionAt(attaque ${ev.startBeats}) = ${tr.positionAt(t).step}, attendu ${step}`);
        }
      });
    }
  }

  /* ---------- timeline artisanale commune aux sections (5) et (6) ---------- */
  const T = [
    note(0, 1), note(1, 0.5), note(1.5, 0.5), note(2, 2),        // mesure 1
    note(4, 1, true), note(5, 1), rest(6, 1), note(7, 1),        // mesure 2 (liaison 4 -> 5)
    note(8, 2), note(10, 0.5), note(10.5, 1.5),                  // mesure 3 (syncope fractionnaire)
    note(12, 4),                                                 // mesure 4
  ];
  const EVENTS = noteSoundEvents(T); // attaques : 0, 1, 1.5, 2, 4(2), 7, 8, 10, 10.5, 12

  /* ================ (5) tempo en vol : 60 -> 90 -> 95 (+5) ================ */
  {
    const ctx = createMockCtx();
    const t0 = ctx.currentTime + START_DELAY_S;
    const tr = createTransport({
      ctx, bpm: 60, beatsPerBar: 4, totalBeats: 16,
      noteEvents: EVENTS, notesEnabled: true, getNoteVoice: () => ({ buffer: BUFFER }),
    });
    stepPump(ctx, t0 + 6.0);   // en plein milieu de l'intervalle [6, 7]
    tr.setBpm(90);
    stepPump(ctx, t0 + 9.0);
    expect(ctx.clickStarts.length < 20, "tempo en vol — tous les clics déjà programmés avant le second changement");
    tr.setBpm(95);             // +5 BPM
    expect(tr.bpm() === 95, `tempo en vol — bpm() = ${tr.bpm()}, attendu 95`);
    stepPump(ctx, t0 + 40);

    const clicks = ctx.clickStarts;
    expect(clicks.length === 20, `tempo en vol — ${clicks.length} clic(s) au lieu de 20`);
    for (let k = 1; k < clicks.length; k++) {
      if (!expect(clicks[k].time > clicks[k - 1].time,
        `tempo en vol — clics non strictement croissants au rang ${k}`)) break;
    }
    // (2) les accents restent aux débuts de mesure après les changements.
    clicks.forEach((c, k) => {
      const wantAccent = k < 4 ? k === 0 : (k - 4) % 4 === 0;
      expect((c.freq === ACCENT_FREQ) === wantAccent, `tempo en vol — clic ${k} : accent inattendu`);
    });
    // (4) l'aller-retour positionAt(clic k) = k traverse les changements.
    clicks.forEach((c, k) => {
      expect(close(tr.positionAt(c.time).step, k),
        `tempo en vol — positionAt(clic ${k}) = ${tr.positionAt(c.time).step}`);
    });
    // (1) après le dernier changement : intervalle stabilisé à 60/95.
    const d1 = clicks[19].time - clicks[18].time;
    const d2 = clicks[18].time - clicks[17].time;
    expect(close(d1, 60 / 95) && close(d2, 60 / 95),
      `tempo en vol — intervalles finaux ${d2} / ${d1}, attendu ${60 / 95}`);
    // (3) attaques : entières === clic correspondant (strict), fractionnaires
    // encadrées par leurs clics et exactes en position.
    expect(ctx.noteStarts.length === EVENTS.length,
      `tempo en vol — ${ctx.noteStarts.length} attaque(s) pour ${EVENTS.length} événement(s)`);
    EVENTS.forEach((ev, j) => {
      const step = 4 + ev.startBeats;
      const t = ctx.noteStarts[j] && ctx.noteStarts[j].time;
      if (t === undefined) return;
      if (Number.isInteger(ev.startBeats)) {
        expect(t === clicks[step].time,
          `tempo en vol — attaque entière au temps ${ev.startBeats} !== clic ${step} (égalité stricte)`);
      } else {
        expect(close(tr.positionAt(t).step, step),
          `tempo en vol — positionAt(attaque ${ev.startBeats}) = ${tr.positionAt(t).step}, attendu ${step}`);
        const lo = Math.floor(step), hi = Math.ceil(step);
        expect(clicks[lo].time < t && t < clicks[hi].time,
          `tempo en vol — attaque fractionnaire ${ev.startBeats} hors de l'intervalle des clics ${lo}..${hi}`);
      }
    });
  }

  /* ================ (6) pause puis reprise ================ */
  {
    // Lecture 60 BPM, pause à la position 5,5 (mi-mesure 2).
    const ctx = createMockCtx();
    const t0 = ctx.currentTime + START_DELAY_S;
    const tr = createTransport({
      ctx, bpm: 60, beatsPerBar: 4, totalBeats: 16,
      noteEvents: EVENTS, notesEnabled: true, getNoteVoice: () => ({ buffer: BUFFER }),
    });
    stepPump(ctx, t0 + 9.5); // décompte 4 temps + 5,5 temps de grille
    const info = tr.stop();
    expect(info !== null && close(info.position, 5.5),
      `pause — position ${info && info.position}, attendu 5,5`);
    expect(info !== null && info.resumeBeat === 4,
      `pause — reprise au temps ${info && info.resumeBeat}, attendu 4 (début de la mesure en cours)`);
    expect(tr.stop() === null, "pause — un second stop() doit rendre null");

    // Reprise à startGridBeat = 4 : re-décompte, temps 1 pile en début de mesure.
    const ctx2 = createMockCtx();
    const t0b = ctx2.currentTime + START_DELAY_S;
    const ref = createBeatClock({ startTime: t0b, bpm: 60 });
    const tr2 = createTransport({
      ctx: ctx2, bpm: 60, beatsPerBar: 4, totalBeats: 16, startGridBeat: 4,
      noteEvents: EVENTS, notesEnabled: true, getNoteVoice: () => ({ buffer: BUFFER }),
    });
    stepPump(ctx2, t0b + (4 + 12 + 2) * 1);
    const clicks = ctx2.clickStarts;

    expect(clicks.length === 16, `reprise — ${clicks.length} clic(s) au lieu de 16 (décompte 4 + 12 temps restants)`);
    let maxErr = 0;
    clicks.forEach((c, k) => { maxErr = Math.max(maxErr, Math.abs(c.time - (t0b + k))); });
    expect(maxErr <= 1e-9, `reprise — dérive ${maxErr} s sur la grille des clics`);
    clicks.forEach((c, k) => {
      const wantAccent = k < 4 ? k === 0 : (k - 4) % 4 === 0; // gridBeat 4, 8, 12 = temps 1
      expect((c.freq === ACCENT_FREQ) === wantAccent, `reprise — clic ${k} : accent inattendu`);
    });
    expect(clicks[4] && clicks[4].freq === ACCENT_FREQ,
      "reprise — le premier temps après le re-décompte doit être un temps 1 accentué");
    clicks.forEach((c, k) => {
      expect(close(tr2.positionAt(c.time).step, k), `reprise — positionAt(clic ${k}) faux`);
    });

    // Notes : seules les attaques >= 4 rejouées (4, 7, 8, 10, 10.5, 12).
    const expected = EVENTS.filter((e) => e.startBeats >= 4);
    expect(ctx2.noteStarts.length === expected.length,
      `reprise — ${ctx2.noteStarts.length} attaque(s) rejouée(s), attendu ${expected.length} (rien avant le point de reprise)`);
    expected.forEach((ev, j) => {
      const step = 4 + (ev.startBeats - 4);
      const t = ctx2.noteStarts[j] && ctx2.noteStarts[j].time;
      if (t === undefined) return;
      if (Number.isInteger(ev.startBeats)) {
        expect(t === clicks[step].time,
          `reprise — attaque entière au temps ${ev.startBeats} !== clic ${step} (égalité stricte)`);
      } else {
        expect(t === ref.timeAt(step),
          `reprise — attaque fractionnaire ${ev.startBeats} !== timeAt(${step})`);
      }
    });
    expect(ctx2.noteStarts.length > 0 && ctx2.noteStarts[0].time === clicks[4].time,
      "reprise — la note du point de reprise doit coïncider strictement avec le clic du temps 1");

    // Pause pendant le re-décompte : on ne recule jamais avant le point de reprise.
    const ctx3 = createMockCtx();
    const tr3 = createTransport({
      ctx: ctx3, bpm: 60, beatsPerBar: 4, totalBeats: 16, startGridBeat: 4,
      noteEvents: EVENTS, notesEnabled: true, getNoteVoice: () => ({ buffer: BUFFER }),
    });
    stepPump(ctx3, ctx3.currentTime + 2); // encore dans le décompte (4 s)
    const info3 = tr3.stop();
    expect(info3 !== null && info3.resumeBeat === 4 && close(info3.position, 4),
      `pause en décompte — reprise ${info3 && info3.resumeBeat} / position ${info3 && info3.position}, attendu 4 / 4`);
  }

  /* ================ (7) curseur asservi aux notes (géométrie factice) ================ */
  {
    const tl = [
      note(0, 1), note(1, 0.5), rest(1.5, 0.5), note(2, 2),   // ligne 0
      note(4, 1, true), note(5, 2), note(7, 1),                // ligne 1 (liaison 4 -> 5)
    ];
    const anchors = [
      { beat: 0, x: 10, line: 0 },
      { beat: 1, x: 30, line: 0 },
      { beat: 1.5, x: 45, line: 0 },
      { beat: 2, x: 60, line: 0 },
      { beat: 4, x: 12, line: 1 },
      { beat: 5, x: 40, line: 1 },
      { beat: 7, x: 70, line: 1 },
    ];
    const lineEnds = [100, 95];
    const TOTAL = 8;

    // À l'attaque de l'événement i : x = x_i EXACTEMENT (===), bonne ligne.
    anchors.forEach((a, i) => {
      const c = cursorXAt(anchors, lineEnds, TOTAL, a.beat);
      expect(c !== null && c.x === a.x && c.line === a.line,
        `curseur — à l'attaque de l'événement ${i} : (${c && c.x}, l${c && c.line}), attendu (${a.x}, l${a.line})`);
    });

    // Balayage fin : monotonie stricte par ligne, saut de ligne unique à 4.
    let prev = null;
    let lineJumps = 0;
    let monotone = true;
    let jumpAt = null;
    for (let k = 0; k <= 200 * TOTAL; k++) {
      const pos = k / 200;
      const c = cursorXAt(anchors, lineEnds, TOTAL, pos);
      if (prev) {
        if (c.line !== prev.line) { lineJumps++; jumpAt = pos; }
        else if (pos < TOTAL && c.x <= prev.x) { monotone = false; }
      }
      prev = c;
    }
    expect(monotone, "curseur — x non strictement monotone à l'intérieur d'une ligne");
    expect(lineJumps === 1, `curseur — ${lineJumps} changement(s) de ligne au lieu de 1`);
    expect(jumpAt === 4, `curseur — saut de ligne à ${jumpAt}, attendu pile à l'attaque du premier événement de la ligne 2`);

    // Approche de la fin de ligne puis saut net.
    const before = cursorXAt(anchors, lineEnds, TOTAL, 3.995);
    expect(before.line === 0 && before.x < 100 && before.x > 99,
      `curseur — juste avant le saut : (${before.x}, l${before.line}), attendu ~100 sur la ligne 0`);
    const at = cursorXAt(anchors, lineEnds, TOTAL, 4);
    expect(at.x === 12 && at.line === 1, "curseur — le saut de ligne doit atterrir exactement sur la première ancre");

    // Bornes : avant la première ancre, après la fin de grille.
    expect(cursorXAt(anchors, lineEnds, TOTAL, -1).x === 10, "curseur — clamp avant la première ancre");
    expect(cursorXAt(anchors, lineEnds, TOTAL, 8).x === 95, "curseur — fin de grille : fin de la dernière ligne");
    expect(cursorXAt(anchors, lineEnds, TOTAL, 12).x === 95, "curseur — au-delà de la fin : clampé");
    expect(cursorXAt([], lineEnds, TOTAL, 1) === null, "curseur — aucune ancre : null");
    expect(cursorXAt(null, lineEnds, TOTAL, 1) === null, "curseur — ancres nulles : null");

    // Cohérence totale avec litIndicesAt : jamais en avance sur la prochaine
    // attaque (donc jamais sur la note i+1 pendant que i est allumée sans elle).
    let coherent = true, notBehind = true, litCoherent = true;
    for (let k = 0; k <= 200 * TOTAL && (coherent || notBehind || litCoherent); k++) {
      const pos = k / 200;
      const c = cursorXAt(anchors, lineEnds, TOTAL, pos);
      let cur = -1;
      for (let i = 0; i < anchors.length; i++) if (anchors[i].beat <= pos) cur = i;
      const next = cur + 1 < anchors.length ? anchors[cur + 1] : null;
      if (next) {
        if (c.line > next.line || (c.line === next.line && c.x >= next.x)) coherent = false;
      }
      if (cur >= 0 && c.line === anchors[cur].line && c.x < anchors[cur].x) notBehind = false;
      const lit = litIndicesAt(tl, pos);
      for (const i of lit) {
        if (i + 1 < anchors.length && lit.indexOf(i + 1) === -1) {
          const n = anchors[i + 1];
          if (c.line > n.line || (c.line === n.line && c.x >= n.x)) litCoherent = false;
        }
      }
    }
    expect(coherent, "curseur — en avance sur la prochaine attaque (x >= x_suivant avant son beat)");
    expect(notBehind, "curseur — en retard sur l'attaque en cours (x < x_courant)");
    expect(litCoherent, "curseur — sur la note i+1 pendant que i est allumée sans elle (incohérence litIndicesAt)");
  }

  /* ================ (8) compensation de latence de sortie ================ */
  {
    // Fonction pure : outputLatency prioritaire, baseLatency en repli, 0 sinon.
    expect(outputLatencySeconds({ outputLatency: 0.08, baseLatency: 0.01 }) === 0.08,
      "latence — outputLatency doit primer");
    expect(outputLatencySeconds({ baseLatency: 0.012 }) === 0.012, "latence — repli baseLatency");
    expect(outputLatencySeconds({}) === 0, "latence — aucun champ : 0");
    expect(outputLatencySeconds({ outputLatency: 0, baseLatency: 0 }) === 0, "latence — zéros : 0");
    expect(outputLatencySeconds({ outputLatency: NaN, baseLatency: 0.01 }) === 0.01,
      "latence — outputLatency invalide : repli baseLatency");
    expect(outputLatencySeconds(null) === 0, "latence — contexte absent : 0");

    // Latence factice de 80 ms : la position visuelle à l'instant où un clic
    // S'ENTEND (T + 0,08) est exactement le battement de ce clic.
    const ctx = createMockCtx({ outputLatency: 0.08 });
    const t0 = ctx.currentTime + START_DELAY_S;
    const tr = createTransport({
      ctx, bpm: 60, beatsPerBar: 4, totalBeats: 8,
      noteEvents: [], notesEnabled: false, getNoteVoice: () => null,
    });
    stepPump(ctx, t0 + (4 + 8 + 2) * 1);
    const clicks = ctx.clickStarts;
    expect(clicks.length === 12, `latence — ${clicks.length} clic(s) au lieu de 12`);
    clicks.forEach((c, k) => {
      ctx.currentTime = c.time + 0.08; // l'instant où ce clic S'ENTEND
      const step = tr.positionAt(tr.visualNow()).step;
      expect(close(step, k), `latence — position visuelle ${step} au moment où le clic ${k} s'entend`);
    });

    // Les pastilles se déclenchent à l'instant ENTENDU, jamais à l'instant
    // programmé en avance : le battement k n'est dû qu'à T_k + latence.
    ctx.currentTime = clicks[0].time + 0.04; // programmé passé, pas encore entendu
    expect(tr.takeDueVisuals(tr.visualNow()).length === 0,
      "latence — pastille déclenchée avant que le clic ne s'entende");
    // Pile à l'instant entendu (+1 ns : (T + 0,08) − 0,08 retombe un ulp
    // sous T en flottant — artefact IEEE, pas un retard réel).
    ctx.currentTime = clicks[0].time + 0.08 + 1e-9;
    const due = tr.takeDueVisuals(tr.visualNow());
    expect(due.length === 1 && due[0].type === "countin" && due[0].countNumber === 1,
      "latence — le premier battement doit devenir dû pile quand il s'entend");

    // La position de pause se calcule sur l'ENTENDU : à currentTime = t0 +
    // 9,5 + latence, la position perçue est 5,5 -> reprise au début de la
    // mesure 2 (temps 4).
    const ctx2 = createMockCtx({ outputLatency: 0.08 });
    const t0b = ctx2.currentTime + START_DELAY_S;
    const tr2 = createTransport({
      ctx: ctx2, bpm: 60, beatsPerBar: 4, totalBeats: 16,
      noteEvents: EVENTS, notesEnabled: true, getNoteVoice: () => ({ buffer: BUFFER }),
    });
    stepPump(ctx2, t0b + 9.5 + 0.08);
    const info = tr2.stop();
    expect(info !== null && close(info.position, 5.5) && info.resumeBeat === 4,
      `latence — pause : position ${info && info.position} / reprise ${info && info.resumeBeat}, attendu 5,5 / 4`);
  }

  /* ================ (9) groove d'accompagnement : remplace le clic aux battements ================ */
  {
    const BPM = 60, bpb = 4, total = 8;
    const countIn = countInBeats(bpb);
    // Comptes attendus des voix sur la grille, dérivés de grooveVoicesAt.
    let expKick = 0, expSnare = 0, expHat = 0;
    for (let g = 0; g < total; g++) {
      const v = grooveVoicesAt((g % bpb) + 1);
      if (v.kick) expKick++;
      if (v.snare) expSnare++;
      if (v.hat) expHat++;
    }

    // Mode groove : le décompte reste au clic, les battements de grille jouent la batterie.
    const ctx = createMockCtx();
    const t0 = ctx.currentTime + START_DELAY_S;
    createTransport({
      ctx, bpm: BPM, beatsPerBar: bpb, totalBeats: total, pulsationVoice: "groove",
      noteEvents: [], notesEnabled: false, getNoteVoice: () => null,
    });
    stepPump(ctx, t0 + (countIn + total + 2) * (60 / BPM));

    // Clics sinus = UNIQUEMENT le décompte (les battements de grille ne cliquent plus).
    expect(ctx.clickStarts.length === countIn,
      `groove — ${ctx.clickStarts.length} clic(s) sinus, attendu ${countIn} (décompte seul)`);
    expect(ctx.clickStarts[0] && ctx.clickStarts[0].freq === ACCENT_FREQ,
      "groove — le temps 1 du décompte reste un clic accentué");
    // Grosse caisse = oscillateurs triangle (synthStarts) ; caisse claire + charley = bruit (noteStarts).
    expect(ctx.synthStarts.length === expKick,
      `groove — ${ctx.synthStarts.length} grosse(s) caisse(s), attendu ${expKick}`);
    expect(ctx.noteStarts.length === expSnare + expHat,
      `groove — ${ctx.noteStarts.length} coup(s) caisse claire + charley, attendu ${expSnare + expHat}`);
    // La première grosse caisse tombe pile au temps 1 de la grille (barre 1), après le décompte.
    const firstGrid = t0 + countIn * (60 / BPM);
    const kickTimes = ctx.synthStarts.map((s) => s.time).sort((a, b) => a - b);
    expect(kickTimes[0] !== undefined && close(kickTimes[0], firstGrid),
      `groove — première grosse caisse à ${kickTimes[0]}, attendu la barre 1 (${firstGrid})`);

    // Mode clic (défaut) : comportement inchangé — clics sur décompte + grille, aucune batterie.
    const ctx2 = createMockCtx();
    const t0b = ctx2.currentTime + START_DELAY_S;
    createTransport({
      ctx: ctx2, bpm: BPM, beatsPerBar: bpb, totalBeats: total,
      noteEvents: [], notesEnabled: false, getNoteVoice: () => null,
    });
    stepPump(ctx2, t0b + (countIn + total + 2) * (60 / BPM));
    expect(ctx2.clickStarts.length === countIn + total,
      `groove — mode clic : ${ctx2.clickStarts.length} clic(s), attendu ${countIn + total} (inchangé)`);
    expect(ctx2.synthStarts.length === 0 && ctx2.noteStarts.length === 0,
      "groove — mode clic : aucune voix de batterie");
  }

} finally {
  globalThis.setInterval = realSetInterval;
  globalThis.clearInterval = realClearInterval;
  globalThis.setTimeout = realSetTimeout;
}

/* ---------- bilan ---------- */
if (failures.length) {
  console.error(`ÉCHEC — ${failures.length} vérification(s) sur ${checks} en échec :`);
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
} else {
  console.log(`OK — ${checks} vérifications, 0 échec.`);
}
