/*
 * Harnais de test de l'analyse de signature (source unique du générateur,
 * du moteur et de la page).
 * Usage : node scripts/test-meter.mjs
 *
 * Vérifie :
 *  (a) toute signature n/d permise (n de 1 à 12, d parmi 2, 4 et 8) est
 *      analysée, et elle seule : le reste lève une erreur et isMeter la
 *      refuse ;
 *  (b) mesure simple : le temps est la figure du dénominateur (blanche en /2,
 *      noire en /4, croche en /8), un temps par unité du numérateur ;
 *  (c) mesure composée : en /8, un numérateur multiple de 3 au moins égal à
 *      6 donne un temps de noire pointée (trois croches), le numérateur
 *      compte des croches (6/8 = 2 temps) ; 3/8, 5/8, 7/8 restent simples ;
 *  (d) la durée d'une mesure vaut toujours le numérateur sur le
 *      dénominateur (temps × durée du temps) ;
 *  (e) allMeters() liste exactement les signatures permises.
 * Code de sortie non nul si échec.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { analyzeMeter, isMeter, allMeters } = require(path.join(ROOT, "js", "meter.js"));

let checks = 0;
const failures = [];
function expect(cond, msg) {
  checks++;
  if (!cond) failures.push(msg);
  return cond;
}

const NUMERATORS = Array.from({ length: 12 }, (_, i) => i + 1);
const DENOMINATORS = [2, 4, 8];

/* ---------- (a) domaine ---------- */
for (const n of NUMERATORS) {
  for (const d of DENOMINATORS) {
    const meter = `${n}/${d}`;
    expect(isMeter(meter), `${meter} — signature permise refusée`);
    let info = null;
    try {
      info = analyzeMeter(meter);
    } catch (err) {
      expect(false, `${meter} — analyse en erreur : ${err.message}`);
      continue;
    }
    expect(info.meter === meter && info.numerator === n && info.denominator === d,
      `${meter} — numérateur et dénominateur mal relus (${JSON.stringify(info)})`);
  }
}
for (const bad of ["0/4", "13/4", "4/1", "4/3", "4/16", "6/16", "4", "4/", "/4", "a/b", "04/4", " 4/4", "4/4 ", "", null, undefined, 44]) {
  expect(!isMeter(bad), `${JSON.stringify(bad)} — signature hors domaine acceptée`);
  let threw = false;
  try {
    analyzeMeter(bad);
  } catch (err) {
    threw = true;
  }
  expect(threw, `${JSON.stringify(bad)} — l'analyse aurait dû lever une erreur`);
}

/* ---------- (b) + (c) temps, durée du temps, simple ou composée ---------- */
const CASES = [
  // [signature, composée, temps, durée du temps en 64e de ronde, figure, pointée, subdivision]
  ["2/4", false, 2, 16, "noire", false, 1],
  ["3/4", false, 3, 16, "noire", false, 1],
  ["4/4", false, 4, 16, "noire", false, 1],
  ["5/4", false, 5, 16, "noire", false, 1],
  ["7/4", false, 7, 16, "noire", false, 1],
  ["6/4", false, 6, 16, "noire", false, 1],
  ["2/2", false, 2, 32, "blanche", false, 1],
  ["3/2", false, 3, 32, "blanche", false, 1],
  ["4/2", false, 4, 32, "blanche", false, 1],
  ["1/8", false, 1, 8, "croche", false, 1],
  ["3/8", false, 3, 8, "croche", false, 1],
  ["5/8", false, 5, 8, "croche", false, 1],
  ["7/8", false, 7, 8, "croche", false, 1],
  ["6/8", true, 2, 24, "noire", true, 3],
  ["9/8", true, 3, 24, "noire", true, 3],
  ["12/8", true, 4, 24, "noire", true, 3],
];
for (const [meter, compound, beats, beat64, figure, dotted, subdivision] of CASES) {
  const info = analyzeMeter(meter);
  expect(info.compound === compound, `${meter} — composée ${info.compound}, attendu ${compound}`);
  expect(info.beats === beats, `${meter} — ${info.beats} temps, attendu ${beats}`);
  expect(info.beat64 === beat64, `${meter} — temps de ${info.beat64}/64, attendu ${beat64}/64`);
  expect(info.beatFigure === figure && info.beatDotted === dotted,
    `${meter} — figure du temps ${info.beatFigure}${info.beatDotted ? " pointée" : ""}, attendu ${figure}${dotted ? " pointée" : ""}`);
  expect(info.subdivision === subdivision, `${meter} — subdivision ${info.subdivision}, attendu ${subdivision}`);
}
for (const n of NUMERATORS) {
  const info = analyzeMeter(`${n}/8`);
  const want = n % 3 === 0 && n >= 6;
  expect(info.compound === want, `${n}/8 — composée ${info.compound}, attendu ${want}`);
  expect(!analyzeMeter(`${n}/4`).compound && !analyzeMeter(`${n}/2`).compound,
    `${n}/4 et ${n}/2 — toujours simples`);
}

/* ---------- (d) durée d'une mesure ---------- */
for (const meter of allMeters()) {
  const info = analyzeMeter(meter);
  expect(info.beats * info.beat64 === info.numerator * 64 / info.denominator,
    `${meter} — mesure de ${info.beats * info.beat64}/64, attendu ${info.numerator * 64 / info.denominator}/64`);
}

/* ---------- (e) liste des signatures permises ---------- */
{
  const list = allMeters();
  expect(list.length === 36, `allMeters — ${list.length} signatures, attendu 36`);
  expect(new Set(list).size === list.length, "allMeters — doublons");
  expect(list.every(isMeter), "allMeters — une signature listée n'est pas permise");
  list.push("13/4");
  expect(allMeters().length === 36, "allMeters — la liste rendue est partagée (mutée par l'appelant)");
}

/* ---------- bilan ---------- */
if (failures.length) {
  console.error(`ÉCHEC — ${failures.length} vérification(s) sur ${checks} en échec :`);
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
} else {
  console.log(`OK — ${checks} vérifications, 0 échec.`);
}
