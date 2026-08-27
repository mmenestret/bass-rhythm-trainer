/*
 * Harnais de test de l'interface bilingue et des builds autonomes.
 * Usage : node scripts/test-i18n.mjs
 *
 * Vérifie :
 *  (a) mêmes clés et mêmes variables dans les dictionnaires français/anglais ;
 *  (b) chaque marqueur data-i18n du HTML pointe vers une clé connue ;
 *  (c) `?lang=en` sélectionne l'anglais sans toucher au fragment d'exercice ;
 *  (d) le build produit deux fichiers autonomes, dont une version anglaise
 *      sans principaux textes français visibles dans son balisage ;
 *  (e) les traductions statiques et dynamiques principales sont présentes.
 * Code de sortie non nul si échec.
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const I18n = require(path.join(ROOT, "js/i18n.js"));

let checks = 0;
const failures = [];
function expect(condition, message) {
  checks++;
  if (!condition) failures.push(message);
  return condition;
}

function variables(message) {
  return [...String(message).matchAll(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g)]
    .map((match) => match[1])
    .sort()
    .join(",");
}

function markupOnly(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "");
}

/* ---------- dictionnaires ---------- */
const frKeys = Object.keys(I18n.messages.fr).sort();
const enKeys = Object.keys(I18n.messages.en).sort();
expect(frKeys.join("\n") === enKeys.join("\n"), "i18n — les dictionnaires n'ont pas les mêmes clés");
for (const key of frKeys) {
  expect(typeof I18n.messages.fr[key] === "string" && I18n.messages.fr[key].length > 0, `i18n — texte français vide : ${key}`);
  expect(typeof I18n.messages.en[key] === "string" && I18n.messages.en[key].length > 0, `i18n — texte anglais vide : ${key}`);
  expect(
    variables(I18n.messages.fr[key]) === variables(I18n.messages.en[key]),
    `i18n — variables différentes pour ${key} : {${variables(I18n.messages.fr[key])}} / {${variables(I18n.messages.en[key])}}`
  );
}

expect(I18n.translate("en", "figure.quarter") === "Quarter note", "i18n — traduction anglaise d'une figure");
expect(
  I18n.translate("en", "composer.measureMany", { count: 7 }) === "7 measures",
  "i18n — interpolation anglaise"
);
expect(I18n.normalizeLanguage("en-US") === "en", "i18n — normalisation en-US");
expect(I18n.normalizeLanguage("fr-FR") === "fr", "i18n — normalisation fr-FR");

/* ---------- marqueurs statiques et appels dynamiques ---------- */
const source = readFileSync(path.join(ROOT, "index.html"), "utf8");
const markerKeys = [...source.matchAll(/\bdata-i18n(?:-aria-label|-title)?="([^"]+)"/g)]
  .map((match) => match[1]);
expect(markerKeys.length >= 60, `marqueurs — couverture statique trop faible (${markerKeys.length})`);
for (const key of markerKeys) {
  expect(Object.prototype.hasOwnProperty.call(I18n.messages.fr, key), `marqueurs — clé française inconnue : ${key}`);
  expect(Object.prototype.hasOwnProperty.call(I18n.messages.en, key), `marqueurs — clé anglaise inconnue : ${key}`);
}

const dynamicKeys = [...source.matchAll(/\bt\("([^"]+)"/g)].map((match) => match[1]);
expect(dynamicKeys.length >= 25, `messages dynamiques — couverture trop faible (${dynamicKeys.length})`);
for (const key of dynamicKeys) {
  expect(Object.prototype.hasOwnProperty.call(I18n.messages.en, key), `messages dynamiques — clé inconnue : ${key}`);
}
expect(source.includes("window.BassRhythmI18n.init(document, window.location)"), "initialisation — couche i18n non initialisée");

/* ---------- choix de langue et fragment ---------- */
const locationLike = { search: "?lang=en", hash: "#s1-demo-exercise" };
const hashBefore = locationLike.hash;
expect(I18n.detectLanguage(locationLike, { getAttribute: () => "fr" }) === "en", "URL — ?lang=en ne sélectionne pas l'anglais");
expect(locationLike.hash === hashBefore, "URL — la détection de langue a modifié le fragment d'exercice");
expect(
  I18n.detectLanguage({ search: "", hash: "#s1-demo-exercise" }, { getAttribute: () => "en" }) === "en",
  "URL — le build anglais n'utilise pas la langue de <html> par défaut"
);
expect(
  I18n.detectLanguage({ search: "?lang=%E0%A4%A", hash: "#s1-demo-exercise" }, { getAttribute: () => "en" }) === "en",
  "URL — un paramètre de langue mal formé ne revient pas à la langue du document"
);

/* ---------- build bilingue ---------- */
const build = spawnSync(process.execPath, [path.join(ROOT, "scripts/build-single-file.mjs")], {
  cwd: ROOT,
  encoding: "utf8",
});
expect(build.status === 0, `build — échec :\n${(build.stderr || build.stdout || "").trim()}`);

const frBuild = readFileSync(path.join(ROOT, "dist/bass-rhythm-trainer.html"), "utf8");
const enBuild = readFileSync(path.join(ROOT, "dist/bass-rhythm-trainer-en.html"), "utf8");
const frMarkup = markupOnly(frBuild);
const enMarkup = markupOnly(enBuild);

expect(/<html lang="fr">/.test(frBuild), "build FR — attribut lang absent");
expect(/<html lang="en">/.test(enBuild), "build EN — attribut lang absent");
expect(enBuild.includes("/* ---- js/i18n.js (inline) ---- */"), "build EN — module i18n non embarqué");
expect(enBuild.includes("window.BRT_EMBEDDED_SAMPLES = {"), "build EN — samples audio non embarqués");
expect(!/\b(?:src|href)="(?:assets|vendor|js)\//.test(enMarkup), "build EN — référence locale externe restante");
expect(!/\b(?:src|href)="https?:\/\//.test(enMarkup), "build EN — référence réseau restante");

for (const text of [
  "Compose",
  "Play",
  "Space — start or pause playback",
  "Bowed double bass",
  "Notes only",
  "Sixteenth note",
  "Time signature",
  "Generate",
  "Clear all",
]) {
  expect(enMarkup.includes(text), `build EN — texte statique absent : ${text}`);
}

for (const frenchPattern of [
  />Jouer</,
  />Son</,
  />Pulsation</,
  />Niveau</,
  />Mesures</,
  />Générer</,
  />Ronde</,
  />Blanche</,
  />Noire</,
  />Croche</,
  /grille composée/,
  /Retour au début/,
  /Écouter/,
]) {
  expect(!frenchPattern.test(enMarkup), `build EN — texte français visible : ${frenchPattern}`);
}

for (const dynamicText of [
  "Link copied",
  "Could not copy the link",
  "Changing the time signature resets the composed exercise. Continue?",
  "Whole rest",
  "Tie to<br>next note",
  "Current measure:",
]) {
  expect(enBuild.includes(dynamicText), `build EN — traduction dynamique absente : ${dynamicText}`);
}

expect(frMarkup.includes("Jouer"), "build FR — interface française altérée");
expect(frMarkup.includes("Figures de notes"), "build FR — réglages français altérés");

if (failures.length) {
  console.error(`\nÉCHEC — ${failures.length} problème(s) sur ${checks} vérifications :`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}

console.log(`OK — ${checks} vérifications i18n et builds bilingues.`);
