/*
 * Harnais de test du son des notes — mode 3 (partie pure, sans Web Audio).
 * Usage : node scripts/test-son.mjs
 *
 * Vérifie :
 *  (a) noteSoundEvents(notes, soundOn) — les événements sonores
 *      { startBeats, holdBeats } d'une timeline :
 *      - une attaque par note, holdBeats = durée notée ;
 *      - les silences ne sonnent jamais ;
 *      - chaîne liée (tiedToNext) = UNE seule attaque à durée cumulée
 *        (chaînes de deux et de trois, liaison à travers la barre) ;
 *      - cas dégradés sans erreur : liaison vers un silence, liaison
 *        pendante en fin de timeline ;
 *      - timeline vide = aucun événement ;
 *      - soundOn false (mode sans son) = aucun événement.
 *  (b) noteCutSeconds(holdBeats, bpm, sampleDurationS) — la durée de coupe :
 *      - valeur notée plus courte que le sample -> coupe à la fin de la
 *        valeur (secondes exactes selon le BPM) ;
 *      - valeur notée >= sample -> null (décroissance naturelle, sample
 *        libre) — frontière exacte incluse.
 *  (c) scénario complet : timeline réaliste + BPM -> liste exacte des
 *      événements sonores et de leurs coupes.
 *  (d) createBeatClock(...).timeAt(pos) — l'instant des attaques
 *      fractionnaires : inverse exact de positionAt, y compris à travers un
 *      changement de tempo en vol.
 * Code de sortie non nul si échec.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const enginePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "js", "engine.js");
const { createBeatClock, noteSoundEvents, noteCutSeconds } = require(enginePath);

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
const fmt = (evs) => evs.map((e) => `${e.startBeats}+${e.holdBeats}`).join(" ");
function expectEvents(timeline, soundOn, want, label) {
  const got = noteSoundEvents(timeline, soundOn);
  const ok = got.length === want.length && got.every(
    (e, i) => close(e.startBeats, want[i].startBeats) && close(e.holdBeats, want[i].holdBeats)
  );
  expect(ok, `${label} — attendu [${fmt(want)}], reçu [${fmt(got)}]`);
}

/* ---------- (a) notes simples : une attaque par note, durée notée ---------- */
{
  // 4/4 : noire, noire, blanche.
  const A = [note(0, 1), note(1, 1), note(2, 2)];
  expectEvents(A, true, [
    { startBeats: 0, holdBeats: 1 },
    { startBeats: 1, holdBeats: 1 },
    { startBeats: 2, holdBeats: 2 },
  ], "notes simples — une attaque par note");
}

/* ---------- (a) silences jamais sonnés ---------- */
{
  // noire, soupir, blanche : le soupir ne produit aucun événement.
  const A = [note(0, 1), rest(1, 1), note(2, 2)];
  expectEvents(A, true, [
    { startBeats: 0, holdBeats: 1 },
    { startBeats: 2, holdBeats: 2 },
  ], "silence — le soupir ne sonne pas");

  // Pause pleine mesure entre deux rondes.
  const B = [note(0, 4), rest(4, 4), note(8, 4)];
  expectEvents(B, true, [
    { startBeats: 0, holdBeats: 4 },
    { startBeats: 8, holdBeats: 4 },
  ], "silence — pause pleine mesure muette");

  // Timeline entièrement en silences : aucun son.
  const C = [rest(0, 2), rest(2, 1), rest(3, 1)];
  expectEvents(C, true, [], "silence — timeline de silences = zéro événement");
}

/* ---------- (a) chaîne liée = UNE attaque à durée cumulée ---------- */
{
  // Noire liée à une blanche, puis noire : une attaque sur [0, 3), une sur [3, 4).
  const C = [note(0, 1, true), note(1, 2), note(3, 1)];
  expectEvents(C, true, [
    { startBeats: 0, holdBeats: 3 },
    { startBeats: 3, holdBeats: 1 },
  ], "liaison — deux têtes, une seule attaque cumulée");

  // Chaîne de trois à travers la barre : croche, puis croche->noire->blanche liées.
  const D = [note(0, 0.5), note(0.5, 0.5, true), note(1, 1, true), note(2, 2), note(4, 1)];
  expectEvents(D, true, [
    { startBeats: 0, holdBeats: 0.5 },
    { startBeats: 0.5, holdBeats: 3.5 },
    { startBeats: 4, holdBeats: 1 },
  ], "liaison — chaîne de trois, durée cumulée 3,5 temps");
}

/* ---------- (a) cas dégradés : liaisons irrégulières sans erreur ---------- */
{
  // Liaison vers un silence : la chaîne se clôt sur la valeur propre.
  const E = [note(0, 1, true), rest(1, 1), note(2, 1, true)];
  expectEvents(E, true, [
    { startBeats: 0, holdBeats: 1 },
    { startBeats: 2, holdBeats: 1 },
  ], "dégradé — liaison vers un silence et liaison pendante en fin de timeline");
}

/* ---------- (a) timeline vide ---------- */
expectEvents([], true, [], "timeline vide — aucun événement");

/* ---------- (a) mode sans son = zéro événement ---------- */
{
  const A = [note(0, 1, true), note(1, 2), rest(3, 1), note(4, 4)];
  expectEvents(A, false, [], "mode sans son — soundOn false = zéro événement");
  expect(noteSoundEvents([], false).length === 0, "mode sans son — timeline vide aussi");
}

/* ---------- (b) durées de coupe ---------- */
{
  const SAMPLE_S = 2.575; // sustain mesuré du sample bass-D2

  // Notes plus courtes que le sample : coupe pile à la fin de la valeur.
  expect(close(noteCutSeconds(1, 60, SAMPLE_S), 1), "coupe — noire à 60 BPM : 1 s");
  expect(close(noteCutSeconds(0.5, 60, SAMPLE_S), 0.5), "coupe — croche à 60 BPM : 0,5 s");
  expect(close(noteCutSeconds(0.5, 120, SAMPLE_S), 0.25), "coupe — croche à 120 BPM : 0,25 s");
  expect(close(noteCutSeconds(2, 60, SAMPLE_S), 2), "coupe — blanche à 60 BPM : 2 s");
  expect(close(noteCutSeconds(4, 200, SAMPLE_S), 1.2), "coupe — ronde à 200 BPM : 1,2 s");
  expect(close(noteCutSeconds(0.25, 40, SAMPLE_S), 0.375), "coupe — double croche à 40 BPM : 0,375 s");

  // Notes plus longues que le sample : pas de coupe, décroissance naturelle.
  expect(noteCutSeconds(4, 60, SAMPLE_S) === null, "sample libre — ronde à 60 BPM (4 s > sample)");
  expect(noteCutSeconds(3, 60, SAMPLE_S) === null, "sample libre — blanche pointée à 60 BPM (3 s > sample)");
  expect(noteCutSeconds(8, 120, SAMPLE_S) === null, "sample libre — deux rondes liées à 120 BPM");

  // Frontière exacte : valeur notée = durée du sample -> décroissance naturelle.
  expect(noteCutSeconds(2.575, 60, SAMPLE_S) === null, "frontière — valeur exactement égale au sample : pas de coupe");
  expect(noteCutSeconds(2.5749, 60, SAMPLE_S) !== null, "frontière — un cheveu plus court : coupe");
}

/* ---------- (c) scénario complet : timeline + BPM -> événements et coupes ---------- */
{
  // Deux mesures de 4/4 à 120 BPM (0,5 s par temps) :
  // noire, croche, croche liée -> blanche, | soupir, noire, blanche(fin).
  const T = [
    note(0, 1),
    note(1, 0.5),
    note(1.5, 0.5, true),
    note(2, 2),
    rest(4, 1),
    note(5, 1),
    note(6, 2),
  ];
  const SAMPLE_S = 2.575;
  const BPM = 120;
  expectEvents(T, true, [
    { startBeats: 0, holdBeats: 1 },
    { startBeats: 1, holdBeats: 0.5 },
    { startBeats: 1.5, holdBeats: 2.5 },
    { startBeats: 5, holdBeats: 1 },
    { startBeats: 6, holdBeats: 2 },
  ], "scénario — attaques attendues (silence muet, liaison cumulée)");
  const cuts = noteSoundEvents(T, true).map((e) => noteCutSeconds(e.holdBeats, BPM, SAMPLE_S));
  const wantCuts = [0.5, 0.25, 1.25, 0.5, 1]; // toutes < 2,575 s à 120 BPM -> toutes coupées
  expect(
    cuts.length === wantCuts.length && cuts.every((c, i) => c !== null && close(c, wantCuts[i])),
    `scénario — coupes à 120 BPM attendues [${wantCuts}], reçues [${cuts}]`
  );
  // La même chaîne liée à 40 BPM (1,5 s par temps) dépasse le sample : libre.
  expect(noteCutSeconds(2.5, 40, SAMPLE_S) === null, "scénario — chaîne liée à 40 BPM : sample libre");
}

/* ---------- (d) timeAt : instant des attaques fractionnaires ---------- */
{
  // Tempo fixe 60 BPM : timeAt est l'identité décalée du départ.
  const clock = createBeatClock({ startTime: 10, bpm: 60 });
  expect(close(clock.timeAt(0), 10), "timeAt — position 0 au départ");
  expect(close(clock.timeAt(2.5), 12.5), "timeAt — position fractionnaire 2,5");
  expect(close(clock.timeAt(7.75), 17.75), "timeAt — position fractionnaire 7,75");
  expect(close(clock.positionAt(clock.timeAt(3.3)), 3.3), "timeAt — inverse de positionAt");
}
{
  // Changement de tempo en vol : 60 -> 120 BPM après 10 temps programmés.
  const clock = createBeatClock({ startTime: 0, bpm: 60 });
  for (let k = 0; k < 10; k++) clock.advance();
  clock.setBpm(120);
  expect(close(clock.timeAt(9.5), 9.5), "timeAt — avant l'ancrage, ancien intervalle");
  expect(close(clock.timeAt(10), 10), "timeAt — l'ancrage garde son instant planifié");
  expect(close(clock.timeAt(10.5), 10.25), "timeAt — après l'ancrage, nouvel intervalle");
  expect(close(clock.timeAt(12), 11), "timeAt — extrapolation au tempo courant");
  for (const p of [8.25, 9.999, 10.001, 11.5, 14.75]) {
    expect(close(clock.positionAt(clock.timeAt(p)), p, 1e-6),
      `timeAt — aller-retour positionAt(timeAt(${p})) != ${p}`);
  }
}

/* ---------- bilan ---------- */
if (failures.length) {
  console.error(`ÉCHEC — ${failures.length} vérification(s) sur ${checks} en échec :`);
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
} else {
  console.log(`OK — ${checks} vérifications, 0 échec.`);
}
