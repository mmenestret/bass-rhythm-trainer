/*
 * Harnais de test du moteur de lecture (partie pure, sans Web Audio).
 * Usage : node scripts/test-engine.mjs
 *
 * Vérifie :
 *  (a) instants de battement exacts à tempo fixe (60 BPM -> 1 s par temps,
 *      dérive nulle sur 200 temps ; idem à 120 BPM) ;
 *  (b) changement de tempo au milieu : les temps déjà programmés inchangés,
 *      le battement d'ancrage garde son instant planifié, les suivants au
 *      nouvel intervalle, position continue sans saut ni régression ;
 *  (c) mapping mesure/temps pour 2/4, 3/4, 4/4, 2/2, 3/2, 4/2 ;
 *  (d) décompte d'une mesure correct pour chaque signature (départ et
 *      reprise en cours de grille) ;
 *  (e) +5 BPM en vol sans dérive sur les 100 temps suivants ;
 *  (f) describeLoopedBeat : identique à describeBeat sous totalBeats, cycles
 *      repliés sans fin ni décompte tant que la boucle est armée, fin à la
 *      prochaine frontière de grille quand elle se coupe, jamais de fin en
 *      totalBeats infini (flux ∞).
 * Code de sortie non nul si échec.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const enginePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "js", "engine.js");
const {
  createBeatClock,
  meterBeats,
  countInBeats,
  barBeat,
  grooveVoicesAt,
  describeBeat,
  describeLoopedBeat,
} = require(enginePath);

let checks = 0;
const failures = [];
function expect(cond, msg) {
  checks++;
  if (!cond) failures.push(msg);
  return cond;
}
const close = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

/* ---------- (a) tempo fixe : instants exacts, dérive nulle ---------- */
{
  const clock = createBeatClock({ startTime: 10, bpm: 60 });
  let maxErr = 0;
  for (let k = 0; k < 200; k++) {
    const ev = clock.advance();
    expect(ev.index === k, `tempo fixe — index attendu ${k}, reçu ${ev.index}`);
    maxErr = Math.max(maxErr, Math.abs(ev.time - (10 + k)));
  }
  expect(maxErr <= 1e-9, `tempo fixe 60 BPM — dérive ${maxErr} s sur 200 temps`);
  expect(close(clock.positionAt(10 + 137.25), 137.25), "tempo fixe — positionAt(10+137.25) != 137.25");
}
{
  const clock = createBeatClock({ startTime: 5, bpm: 120 });
  let maxErr = 0;
  for (let k = 0; k < 200; k++) {
    const ev = clock.advance();
    maxErr = Math.max(maxErr, Math.abs(ev.time - (5 + k * 0.5)));
  }
  expect(maxErr <= 1e-9, `tempo fixe 120 BPM — dérive ${maxErr} s sur 200 temps`);
}

/* ---------- (b) changement de tempo au milieu ---------- */
{
  const clock = createBeatClock({ startTime: 0, bpm: 60 });
  const before = [];
  for (let k = 0; k < 10; k++) before.push(clock.advance());

  clock.setBpm(120);
  expect(clock.bpm() === 120, "setBpm — bpm() ne reflète pas le nouveau tempo");

  // Les temps déjà programmés restent 0, 1, …, 9.
  before.forEach((ev, k) => {
    expect(close(ev.time, k), `setBpm — temps déjà programmé ${k} modifié (${ev.time})`);
  });

  // Le battement d'ancrage (10) garde son instant planifié (10 s),
  // les suivants s'espacent au nouvel intervalle (0,5 s).
  const after = [];
  for (let k = 0; k < 100; k++) after.push(clock.advance());
  expect(close(after[0].time, 10), `setBpm — ancrage attendu à 10 s, reçu ${after[0].time}`);
  let maxErr = 0;
  after.forEach((ev, j) => {
    maxErr = Math.max(maxErr, Math.abs(ev.time - (10 + j * 0.5)));
  });
  expect(maxErr <= 1e-9, `setBpm — dérive ${maxErr} s après changement de tempo`);

  // Continuité de la position autour du ré-ancrage, sans saut ni régression.
  const eps = 1e-6;
  expect(
    Math.abs(clock.positionAt(10 + eps) - clock.positionAt(10 - eps)) < 1e-4,
    "setBpm — saut de position au ré-ancrage"
  );
  let prev = -Infinity;
  for (let t = 0; t <= 20.0001; t += 0.01) {
    const p = clock.positionAt(t);
    if (p < prev - 1e-12) {
      expect(false, `setBpm — position non monotone à t=${t.toFixed(2)}`);
      break;
    }
    prev = p;
  }
  expect(close(clock.positionAt(9.5), 9.5), "setBpm — position avant l'ancrage au mauvais intervalle");
  expect(close(clock.positionAt(10.5), 11), "setBpm — position après l'ancrage au mauvais intervalle");
}

/* ---------- changements successifs (slider) : dernier tempo gagne ---------- */
{
  const clock = createBeatClock({ startTime: 0, bpm: 60 });
  for (let k = 0; k < 4; k++) clock.advance();
  clock.setBpm(80);
  clock.setBpm(100); // second appel sans battement programmé entre les deux
  const ev = clock.advance();
  expect(close(ev.time, 4), `setBpm successifs — ancrage attendu à 4 s, reçu ${ev.time}`);
  const ev2 = clock.advance();
  expect(close(ev2.time, 4 + 0.6), `setBpm successifs — intervalle attendu 0,6 s, reçu ${ev2.time - ev.time}`);
}

/* ---------- (c) mapping mesure/temps pour les 6 signatures ---------- */
const SIGNATURES = [
  ["2/4", 2], ["3/4", 3], ["4/4", 4],
  ["2/2", 2], ["3/2", 3], ["4/2", 4],
];
for (const [meter, bpbAttendu] of SIGNATURES) {
  const bpb = meterBeats(meter);
  expect(bpb === bpbAttendu, `${meter} — meterBeats attendu ${bpbAttendu}, reçu ${bpb}`);

  // Balayage de 4 mesures : mesure et temps 1-based, dans l'ordre.
  for (let g = 0; g < 4 * bpb; g++) {
    const bb = barBeat(g, bpb);
    const mExp = Math.floor(g / bpb) + 1;
    const bExp = (g % bpb) + 1;
    expect(
      bb.measure === mExp && bb.beat === bExp,
      `${meter} — barBeat(${g}) attendu ${mExp}/${bExp}, reçu ${bb.measure}/${bb.beat}`
    );
  }
}
{
  // Exemple du statut : en 4/4, le 10e temps de grille = « Mesure 3 · Temps 2 ».
  const bb = barBeat(9, 4);
  expect(bb.measure === 3 && bb.beat === 2, `barBeat(9, 4) attendu 3/2, reçu ${bb.measure}/${bb.beat}`);
}

/* ---------- (d) décompte d'une mesure pour chaque signature ---------- */
for (const [meter] of SIGNATURES) {
  const bpb = meterBeats(meter);
  const totalBeats = 8 * bpb;
  expect(countInBeats(bpb) === bpb, `${meter} — le décompte doit durer une mesure (${bpb} temps)`);

  for (let step = 0; step < bpb; step++) {
    const d = describeBeat(step, 0, bpb, totalBeats);
    expect(d.type === "countin", `${meter} — pas ${step} attendu en décompte, reçu ${d.type}`);
    expect(d.countNumber === step + 1, `${meter} — décompte pas ${step} : numéro ${d.countNumber}`);
    expect(d.pulseIndex === step, `${meter} — décompte pas ${step} : pastille ${d.pulseIndex}`);
    expect(d.accent === (step === 0), `${meter} — décompte pas ${step} : accent ${d.accent}`);
  }

  // Après le décompte : toute la grille dans l'ordre, accent sur chaque temps 1.
  for (let step = bpb; step < bpb + totalBeats; step++) {
    const g = step - bpb;
    const d = describeBeat(step, 0, bpb, totalBeats);
    if (!expect(d.type === "beat", `${meter} — pas ${step} attendu en battement, reçu ${d.type}`)) continue;
    expect(d.gridBeat === g, `${meter} — pas ${step} : gridBeat ${d.gridBeat} != ${g}`);
    expect(d.measure === Math.floor(g / bpb) + 1, `${meter} — pas ${step} : mesure ${d.measure}`);
    expect(d.beatInBar === (g % bpb) + 1, `${meter} — pas ${step} : temps ${d.beatInBar}`);
    expect(d.pulseIndex === g % bpb, `${meter} — pas ${step} : pastille ${d.pulseIndex}`);
    expect(d.accent === (g % bpb === 0), `${meter} — pas ${step} : accent ${d.accent}`);
  }
  const end = describeBeat(bpb + totalBeats, 0, bpb, totalBeats);
  expect(end.type === "end", `${meter} — fin de grille non détectée (${end.type})`);
}
{
  // Reprise en cours de grille (4/4, reprise au temps 9) : re-décompte d'une
  // mesure puis reprise exactement à « Mesure 3 · Temps 2 ».
  const d0 = describeBeat(0, 9, 4, 32);
  expect(d0.type === "countin" && d0.countNumber === 1 && d0.accent === true, "reprise — le re-décompte doit repartir à 1");
  const d4 = describeBeat(4, 9, 4, 32);
  expect(
    d4.type === "beat" && d4.gridBeat === 9 && d4.measure === 3 && d4.beatInBar === 2 && d4.accent === false,
    `reprise — pas 4 attendu mesure 3 temps 2, reçu ${d4.measure}/${d4.beatInBar}`
  );
  const end = describeBeat(4 + (32 - 9), 9, 4, 32);
  expect(end.type === "end", "reprise — fin de grille non détectée après les temps restants");
}

/* ---------- (e) +5 BPM en vol ---------- */
{
  const clock = createBeatClock({ startTime: 0, bpm: 60 });
  for (let k = 0; k < 8; k++) clock.advance();
  clock.setBpm(65);
  const spb = 60 / 65;
  let maxErr = 0;
  for (let j = 0; j <= 100; j++) {
    const ev = clock.advance();
    maxErr = Math.max(maxErr, Math.abs(ev.time - (8 + j * spb)));
  }
  expect(maxErr <= 1e-9, `+5 BPM — dérive ${maxErr} s sur les 100 temps suivants`);
  expect(close(clock.positionAt(8 + 10 * spb), 18), "+5 BPM — position continue incohérente après le changement");
}

/* ---------- (f) describeLoopedBeat : repeat sans couture, flux ∞ ---------- */
{
  // Sous totalBeats : champ pour champ identique à describeBeat (boucle ou non).
  for (let step = 0; step < 4 + 32; step++) {
    const a = describeBeat(step, 0, 4, 32);
    const b = describeLoopedBeat(step, 0, 4, 32, true);
    const c = describeLoopedBeat(step, 0, 4, 32, false);
    expect(
      a.type === b.type && a.gridBeat === b.gridBeat && a.pulseIndex === b.pulseIndex &&
      a.accent === b.accent && a.countNumber === b.countNumber && !b.wrapped,
      `boucle — pas ${step} : divergence describeBeat/describeLoopedBeat sous totalBeats (boucle armée)`
    );
    expect(
      a.type === c.type && a.gridBeat === c.gridBeat && a.pulseIndex === c.pulseIndex,
      `boucle — pas ${step} : divergence sous totalBeats (boucle coupée)`
    );
  }
  // Boucle coupée : fin exactement à la frontière (identique à describeBeat).
  expect(describeLoopedBeat(4 + 32, 0, 4, 32, false).type === "end",
    "boucle coupée — pas de fin à la frontière de grille");
  // Boucle armée : la frontière est un battement replié — temps 1 accentué,
  // jamais de décompte, cycles suivants idem.
  for (const cycles of [1, 2, 5]) {
    const d = describeLoopedBeat(4 + 32 * cycles, 0, 4, 32, true);
    expect(
      d.type === "beat" && d.gridBeat === 0 && d.pulseIndex === 0 && d.accent === true && d.wrapped === true,
      `boucle armée — frontière du cycle ${cycles} : attendu temps 1 replié, reçu ${JSON.stringify(d)}`
    );
  }
  const mid = describeLoopedBeat(4 + 32 + 13, 0, 4, 32, true);
  expect(
    mid.type === "beat" && mid.gridBeat === 13 && mid.pulseIndex === 1 &&
    mid.measure === 4 && mid.beatInBar === 2 && mid.accent === false,
    `boucle armée — cycle 2 temps 13 : mesure 4 temps 2 attendu, reçu ${JSON.stringify(mid)}`
  );
  // Reprise en cours de grille (startGridBeat 8) : le repli reste calé sur la
  // grille, pas sur le point de reprise.
  const res = describeLoopedBeat(4 + (32 - 8) + 5, 8, 4, 32, true);
  expect(
    res.type === "beat" && res.gridBeat === 5 && res.wrapped === true,
    `boucle armée — reprise à 8 : temps 5 du cycle suivant attendu, reçu ${JSON.stringify(res)}`
  );
  // Coupure en vol : fin à la PROCHAINE frontière seulement — les battements
  // du cycle en cours restent des battements.
  expect(describeLoopedBeat(4 + 32 + 13, 0, 4, 32, false).type === "beat",
    "boucle coupée en vol — le cycle en cours doit se terminer");
  expect(describeLoopedBeat(4 + 64, 0, 4, 32, false).type === "end",
    "boucle coupée en vol — pas de fin à la frontière suivante");
  // Flux ∞ : jamais de fin, quel que soit l'état de la boucle.
  for (const step of [4, 4 + 999, 4 + 100000]) {
    expect(describeLoopedBeat(step, 0, 4, Infinity, false).type === "beat",
      `flux ∞ — fin inattendue au pas ${step}`);
  }
  // Décompte : intact dans tous les modes.
  const ci = describeLoopedBeat(2, 0, 4, 32, true);
  expect(ci.type === "countin" && ci.countNumber === 3, "boucle — décompte altéré");
}

/* ---------- (g) grooveVoicesAt : motif de groove sobre par temps ---------- */
{
  // Charley sur chaque temps ; grosse caisse sur les temps impairs (downbeat sur
  // le 1) ; caisse claire sur les temps pairs (backbeat).
  const v1 = grooveVoicesAt(1);
  expect(v1.kick && !v1.snare && v1.hat, "groove — temps 1 : grosse caisse + charley (downbeat)");
  const v2 = grooveVoicesAt(2);
  expect(!v2.kick && v2.snare && v2.hat, "groove — temps 2 : caisse claire + charley (backbeat)");
  const v3 = grooveVoicesAt(3);
  expect(v3.kick && !v3.snare && v3.hat, "groove — temps 3 : grosse caisse + charley");
  const v4 = grooveVoicesAt(4);
  expect(!v4.kick && v4.snare && v4.hat, "groove — temps 4 : caisse claire + charley");

  // Charley sur TOUS les temps, exactement une percussion grosse caisse/caisse
  // claire par temps.
  for (let b = 1; b <= 4; b++) {
    const v = grooveVoicesAt(b);
    expect(v.hat === true, `groove — charley attendu sur le temps ${b}`);
    expect(v.kick !== v.snare, `groove — temps ${b} : exactement une de grosse caisse / caisse claire`);
  }

  // 4/4 : grosse caisse sur 1 & 3, caisse claire sur 2 & 4.
  const kicks = [1, 2, 3, 4].filter((b) => grooveVoicesAt(b).kick);
  const snares = [1, 2, 3, 4].filter((b) => grooveVoicesAt(b).snare);
  expect(kicks.join(",") === "1,3", `groove 4/4 — grosse caisse attendue sur 1 & 3, reçue ${kicks}`);
  expect(snares.join(",") === "2,4", `groove 4/4 — caisse claire attendue sur 2 & 4, reçue ${snares}`);

  // 3/4 : grosse caisse 1 & 3, caisse claire 2. 2/4 : grosse caisse 1, caisse claire 2.
  expect(grooveVoicesAt(1).kick && grooveVoicesAt(2).snare && grooveVoicesAt(3).kick,
    "groove 3/4 — grosse caisse 1 & 3, caisse claire 2");
}

/* ---------- bilan ---------- */
if (failures.length) {
  console.error(`ÉCHEC — ${failures.length} vérification(s) sur ${checks} en échec :`);
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
} else {
  console.log(`OK — ${checks} vérifications, 0 échec.`);
}
