/*
 * Harnais de test du guidage visuel (partie pure, sans DOM ni Web Audio).
 * Usage : node scripts/test-guidage.mjs
 *
 * Vérifie litIndicesAt(notes, gridBeat) — l'ensemble des indices de notes
 * « allumées » pour une timeline et une position en temps données :
 *  (a) note simple allumée pile sur [début, début + durée) ;
 *  (b) silence jamais allumé, sur tout son intervalle ;
 *  (c) chaîne liée allumée d'un seul tenant sur la durée cumulée
 *      (toutes les têtes ensemble, chaînes de deux et de trois) ;
 *  (d) frontières exactes : allumée à start, éteinte à start + durée ;
 *  (e) positions hors grille (avant 0 — décompte —, à la fin, au-delà) ;
 *  (f) cas dégradés : liaison vers un silence, liaison pendante en fin de
 *      timeline, timeline vide — sans erreur.
 * Code de sortie non nul si échec.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const enginePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "js", "engine.js");
const { litIndicesAt } = require(enginePath);

let checks = 0;
const failures = [];
function expect(cond, msg) {
  checks++;
  if (!cond) failures.push(msg);
  return cond;
}
const note = (startBeats, durationBeats, tie = false) =>
  ({ startBeats, durationBeats, isRest: false, tiedToNext: tie });
const rest = (startBeats, durationBeats) =>
  ({ startBeats, durationBeats, isRest: true, tiedToNext: false });
const same = (got, want) => got.length === want.length && got.every((v, i) => v === want[i]);
function expectLit(timeline, pos, want, label) {
  const got = litIndicesAt(timeline, pos);
  expect(same(got, want), `${label} — position ${pos} : attendu [${want}], reçu [${got}]`);
}

/* ---------- (a) + (d) note simple : [début, début + durée) exact ---------- */
{
  // 4/4 : noire, soupir, blanche (mesure de 4 temps).
  const A = [note(0, 1), rest(1, 1), note(2, 2)];
  expectLit(A, 0, [0], "note simple — allumée pile à l'attaque");
  expectLit(A, 0.5, [0], "note simple — allumée au milieu de sa valeur");
  expectLit(A, 0.999999, [0], "note simple — encore allumée juste avant la fin");
  expectLit(A, 1, [], "frontière — éteinte pile à start + durée");
  expectLit(A, 2, [2], "note simple — la blanche s'allume pile à son attaque");
  expectLit(A, 3.999999, [2], "note simple — la blanche tient jusqu'au bout de sa valeur");
  expectLit(A, 4, [], "frontière — fin de grille, plus rien d'allumé");
}

/* ---------- (b) silence jamais allumé ---------- */
{
  const A = [note(0, 1), rest(1, 1), note(2, 2)];
  for (let t = 1; t < 2; t += 0.05) {
    const got = litIndicesAt(A, t);
    if (!expect(got.indexOf(1) === -1 && got.length === 0,
      `silence — position ${t.toFixed(2)} : rien ne doit s'allumer, reçu [${got}]`)) break;
  }
  // Pause pleine mesure entre deux notes.
  const B = [note(0, 4), rest(4, 4), note(8, 4)];
  expectLit(B, 5.5, [], "silence — pause pleine mesure jamais allumée");
  expectLit(B, 8, [2], "silence — la note suivant la pause s'allume à son attaque");
}

/* ---------- (c) chaîne liée d'un seul tenant (deux têtes) ---------- */
{
  // Noire liée à une blanche, puis noire : chaîne 0–1 sur [0, 3).
  const C = [note(0, 1, true), note(1, 2), note(3, 1)];
  expectLit(C, 0, [0, 1], "liaison — les deux têtes s'allument ensemble à l'attaque");
  expectLit(C, 0.5, [0, 1], "liaison — les deux têtes restent allumées pendant la première valeur");
  expectLit(C, 1, [0, 1], "liaison — pas d'extinction au passage de la liaison");
  expectLit(C, 2.999999, [0, 1], "liaison — allumée jusqu'au bout de la durée cumulée");
  expectLit(C, 3, [2], "liaison — extinction pile à la fin cumulée, note suivante allumée");
  expectLit(C, 4, [], "liaison — plus rien après la dernière valeur");
}

/* ---------- (c) chaîne de trois têtes (liaison à travers la barre) ---------- */
{
  // croche, croche liée -> noire liée -> blanche (chaîne 1–3 sur [0.5, 4)), puis noire.
  const D = [note(0, 0.5), note(0.5, 0.5, true), note(1, 1, true), note(2, 2), note(4, 1)];
  expectLit(D, 0.25, [0], "chaîne de 3 — la note précédente s'allume seule");
  expectLit(D, 0.5, [1, 2, 3], "chaîne de 3 — les trois têtes s'allument ensemble à l'attaque");
  expectLit(D, 1.7, [1, 2, 3], "chaîne de 3 — toutes allumées au cœur de la chaîne");
  expectLit(D, 3.999999, [1, 2, 3], "chaîne de 3 — allumées jusqu'au bout de la durée cumulée");
  expectLit(D, 4, [4], "chaîne de 3 — extinction d'un seul tenant à la fin cumulée");
}

/* ---------- (e) positions hors grille ---------- */
{
  const A = [note(0, 1), rest(1, 1), note(2, 2)];
  expectLit(A, -0.25, [], "hors grille — position négative (décompte)");
  expectLit(A, -4, [], "hors grille — décompte complet avant la grille");
  expectLit(A, 4.5, [], "hors grille — au-delà de la fin");
  expectLit(A, 1000, [], "hors grille — très loin après la fin");
  expectLit([], 1, [], "hors grille — timeline vide, aucun allumage");
}

/* ---------- (f) cas dégradés : liaisons irrégulières sans erreur ---------- */
{
  // Liaison vers un silence : la chaîne s'arrête à la note liée.
  const E = [note(0, 1, true), rest(1, 1), note(2, 1, true)];
  expectLit(E, 0.5, [0], "dégradé — liaison vers un silence : la note s'allume sur sa seule valeur");
  expectLit(E, 1, [], "dégradé — liaison vers un silence : extinction à la fin de la valeur propre");
  expectLit(E, 1.5, [], "dégradé — le silence lié n'allume rien");
  // Liaison pendante en fin de timeline : pas de crash, valeur propre.
  expectLit(E, 2.5, [2], "dégradé — liaison pendante en fin de timeline");
  expectLit(E, 3, [], "dégradé — extinction après la liaison pendante");
}

/* ---------- frontières sur valeurs fractionnaires ---------- */
{
  // croche pointée – double : frontière à 0,75 temps.
  const F = [note(0, 0.75), note(0.75, 0.25)];
  expectLit(F, 0.749999, [0], "fractionnaire — croche pointée allumée jusqu'à 0,75");
  expectLit(F, 0.75, [1], "fractionnaire — bascule exacte à la frontière 0,75");
  expectLit(F, 1, [], "fractionnaire — extinction à la fin de la mesure de test");
}

/* ---------- bilan ---------- */
if (failures.length) {
  console.error(`ÉCHEC — ${failures.length} vérification(s) sur ${checks} en échec :`);
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
} else {
  console.log(`OK — ${checks} vérifications, 0 échec.`);
}
