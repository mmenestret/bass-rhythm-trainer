/*
 * Build des fichiers uniques français et anglais :
 *   - dist/bass-rhythm-trainer.html ;
 *   - dist/bass-rhythm-trainer-en.html.
 * Usage : node scripts/build-single-file.mjs
 *
 * Lit index.html (source unique de vérité, aucune logique dupliquée ici) et
 * inline tout ce qui est nécessaire à une ouverture en file:// sans réseau :
 *  (1) assets/fonts/fonts.css, chaque woff2 converti en data URI ;
 *  (2) les PNG des figures rythmiques en data URI ;
 *  (3) vendor/abcjs-basic-min.js, js/meter.js, js/generator.js, js/engine.js,
 *      js/i18n.js, js/preferences.js en <script> inline (le commentaire de licence abcjs
 *      est conservé tel quel) ;
 *  (4) tous les samples audio (assets/audio/*.wav|m4a) en base64 dans
 *      window.BRT_EMBEDDED_SAMPLES (clé = nom de fichier), consommé par
 *      index.html AVANT tout fetch.
 *  (5) THIRD-PARTY-NOTICES.txt dans un bloc texte masqué qui accompagne toute
 *      copie autonome.
 *
 * Le build vérifie lui-même son résultat :
 *  - aucun src=/href= vers un fichier local ou une URL http(s) dans le
 *    balisage produit (hors data URI et commentaires), aucun url() CSS
 *    non-data ;
 *  - node --check sur chaque bloc <script> extrait ;
 *  - liste des occurrences de fetch( restantes et preuve statique qu'aucune
 *    n'est exécutée au chargement (unique fetch dans loadSample, court-
 *    circuité par la constante embarquée) ;
 *  - taille totale affichée.
 * Code de sortie non nul si problème.
 */
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "dist");
const OUT_FILES = {
  fr: path.join(OUT_DIR, "bass-rhythm-trainer.html"),
  en: path.join(OUT_DIR, "bass-rhythm-trainer-en.html"),
};

const problems = [];
const fail = (msg) => problems.push(msg);
const read = (rel) => readFileSync(path.join(ROOT, rel));
const dataUri = (rel, mime) => `data:${mime};base64,${read(rel).toString("base64")}`;
const require = createRequire(import.meta.url);
const I18n = require(path.join(ROOT, "js/i18n.js"));
// Un `</script>` littéral dans un source inline terminerait le bloc HTML ;
// `<\/script` est strictement équivalent dans une chaîne ou une regex JS.
const escapeInlineScript = (js) => js.replace(/<\/script/gi, "<\\/script");
// String.replace interprète $&, $', $` dans une chaîne de remplacement — or on
// injecte du JS arbitraire (abcjs minifié en contient). Insertion littérale.
const replaceOnce = (haystack, needle, replacement) => haystack.replace(needle, () => replacement);

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* Traduit le balisage statique sans parser ni toucher aux scripts/styles.
   Les textes dynamiques restent gérés dans le navigateur par js/i18n.js. */
function localizeStaticMarkup(input, language) {
  const protectedBlocks = [];
  let localized = input.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, (block) => {
    const placeholder = `BRTLOCALIZEDBLOCK${protectedBlocks.length}END`;
    protectedBlocks.push(block);
    return placeholder;
  });

  localized = localized.replace(/<html lang="[^"]*">/, `<html lang="${language}">`);

  localized = localized.replace(/<[^>]+>/g, (tag) => {
    for (const attribute of I18n.translatableAttributes) {
      const marker = new RegExp(`data-i18n-${attribute}="([^"]+)"`);
      const match = marker.exec(tag);
      if (!match) continue;
      const attributePattern = new RegExp(`${attribute}="[^"]*"`);
      if (!attributePattern.test(tag)) {
        fail(`${language} : attribut ${attribute} absent pour la clé ${match[1]}`);
        continue;
      }
      tag = tag.replace(attributePattern, `${attribute}="${escapeHtml(I18n.translate(language, match[1]))}"`);
    }
    return tag;
  });

  const textMarkerCount = (localized.match(/\bdata-i18n="/g) || []).length;
  let translatedTextCount = 0;
  localized = localized.replace(
    /(<([a-z][a-z0-9-]*)\b[^>]*\bdata-i18n="([^"]+)"[^>]*>)([^<]*)(<\/\2>)/gi,
    (_, open, tagName, key, text, close) => {
      translatedTextCount++;
      return open + escapeHtml(I18n.translate(language, key)) + close;
    }
  );
  if (translatedTextCount !== textMarkerCount) {
    fail(`${language} : ${translatedTextCount} texte(s) statique(s) traduit(s) pour ${textMarkerCount} marqueur(s)`);
  }

  return localized.replace(/BRTLOCALIZEDBLOCK(\d+)END/g, (_, index) => protectedBlocks[Number(index)]);
}

/* ------------------------------------------------------------------ */
/* Assemblage                                                          */
/* ------------------------------------------------------------------ */

let html = read("index.html").toString("utf8");

// Bandeau : fichier généré, ne pas éditer à la main.
html = html.replace(
  /^(<!--[^\n]*-->\n)/,
  `$1<!-- Fichier unique généré par scripts/build-single-file.mjs — éditer index.html puis relancer le build. -->\n`
);

// Les licences doivent rester attachées au lecteur lorsqu'il est transmis
// seul à un élève. Le bloc est masqué dans l'interface mais lisible dans la
// source HTML, sans dépendre d'un fichier voisin.
const notices = escapeHtml(read("THIRD-PARTY-NOTICES.txt").toString("utf8"));
html = replaceOnce(html, "<body>", `<body>\n<pre hidden id="third-party-notices">${notices}</pre>`);

// (1) Fontes : fonts.css inline, chaque woff2 en data URI.
const FONTS_LINK = `<link rel="stylesheet" href="assets/fonts/fonts.css">`;
if (!html.includes(FONTS_LINK)) fail(`balise introuvable dans index.html : ${FONTS_LINK}`);
const fontsCss = read("assets/fonts/fonts.css").toString("utf8").replace(
  /url\('([^']+\.woff2)'\)/g,
  (_, file) => `url('${dataUri(path.join("assets/fonts", file), "font/woff2")}')`
);
if (/\.woff2/.test(fontsCss.replace(/data:font\/woff2;base64,[A-Za-z0-9+/=]+/g, "")))
  fail("fonts.css : une référence woff2 n'a pas été convertie en data URI");
html = replaceOnce(
  html,
  FONTS_LINK,
  `<style>\n/* assets/fonts/fonts.css — fontes inlinées (Cormorant Garamond & Karla, licence SIL OFL) */\n${fontsCss}</style>`
);

// (2) Figures : PNG en data URI.
html = html.replace(
  /src="assets\/figures\/([a-z]+\.png)"/g,
  (_, file) => `src="${dataUri(path.join("assets/figures", file), "image/png")}"`
);

// (2b) Favicon : ICO + PNG (variantes claires du mode sombre incluses) en data URI.
html = html.replace(
  /href="assets\/favicon\/([a-z0-9-]+\.(?:png|ico))"/g,
  (_, file) => `href="${dataUri(path.join("assets/favicon", file), file.endsWith(".ico") ? "image/x-icon" : "image/png")}"`
);

// (3) Scripts inline (licence abcjs conservée : elle vit en tête du fichier).
// La balise peut porter un suffixe de version (?v=…) qui force le
// rechargement en ligne ; il n'a pas de sens dans le fichier unique.
for (const rel of ["vendor/abcjs-basic-min.js", "js/meter.js", "js/generator.js", "js/engine.js", "js/i18n.js", "js/preferences.js"]) {
  const found = html.match(new RegExp(`<script src="${rel.replace(/[.\/]/g, "\\$&")}(?:\\?v=[\\w.-]+)?"></script>`));
  if (!found) { fail(`balise introuvable dans index.html : <script src="${rel}">`); continue; }
  const tag = found[0];
  const js = escapeInlineScript(read(rel).toString("utf8"));
  html = replaceOnce(html, tag, `<script>\n/* ---- ${rel} (inline) ---- */\n${js}\n</script>`);
}

// (4) Samples audio en base64, AVANT les scripts applicatifs : index.html
// consomme window.BRT_EMBEDDED_SAMPLES (clé = nom de fichier) en priorité, le
// fetch ne sert que de repli pour la version dossier (fetch bloqué en file://).
const audioFiles = readdirSync(path.join(ROOT, "assets/audio"))
  .filter((f) => /\.(m4a|wav)$/.test(f))
  .sort();
if (!audioFiles.length) fail("aucun sample dans assets/audio/");
const samplesJs = audioFiles
  .map((f) => `  "${f}": "${read(path.join("assets/audio", f)).toString("base64")}"`)
  .join(",\n");
const ABCJS_MARK = "<script>\n/* ---- vendor/abcjs-basic-min.js (inline) ---- */";
if (!html.includes(ABCJS_MARK)) fail("point d'insertion des samples introuvable (bloc abcjs inline)");
html = replaceOnce(
  html,
  ABCJS_MARK,
  `<script>\n/* Samples audio embarqués pour l'ouverture en file:// — Karoryfer (Growlybass, Meatbass, Ergo), CC0 */\nwindow.BRT_EMBEDDED_SAMPLES = {\n${samplesJs}\n};\n</script>\n${ABCJS_MARK}`
);

const localizedHtml = {
  fr: localizeStaticMarkup(html, "fr"),
  en: localizeStaticMarkup(html, "en"),
};

mkdirSync(OUT_DIR, { recursive: true });
for (const language of Object.keys(OUT_FILES)) {
  writeFileSync(OUT_FILES[language], localizedHtml[language]);
}

/* ------------------------------------------------------------------ */
/* Vérifications                                                       */
/* ------------------------------------------------------------------ */

const noComments = html.replace(/<!--[\s\S]*?-->/g, "");

for (const notice of [
  'id="third-party-notices"',
  "Permission is hereby granted, free of charge",
  "SIL OPEN FONT LICENSE Version 1.1",
  "Copyright 2015 the Cormorant Project Authors",
  "Copyright 2019 The Karla Project Authors",
]) {
  if (!html.includes(notice)) fail(`notice tierce absente du fichier produit : ${notice}`);
}

// A. Balisage (contenu des <script> exclu — le JS peut fabriquer des chaînes
// `href=` sans que ce soit une référence chargée) : tout src=/href= doit être
// un data URI ou une ancre, tout url() CSS doit être data: ou un fragment.
const markup = noComments.replace(/(<script[^>]*>)[\s\S]*?(<\/script>)/gi, "$1$2");
for (const m of markup.matchAll(/\b(?:src|href)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
  const value = m[1] ?? m[2] ?? "";
  if (!value.startsWith("data:") && !value.startsWith("#"))
    fail(`référence externe restante dans le balisage : ${m[0].slice(0, 90)}`);
}
for (const m of markup.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
  const value = m[1];
  if (!value.startsWith("data:") && !value.startsWith("#") && !value.startsWith("%23"))
    fail(`url() CSS non inliné : ${m[0].slice(0, 90)}`);
}

// B. Filet global (scripts compris) : aucun attribut src/href pointant vers
// http(s) ou vers un chemin local du projet.
for (const [pat, label] of [
  [/(?:src|href)=["']https?:\/\//, "src/href vers une URL http(s)"],
  [/src=["'](?:assets|vendor|js)\//, "src vers un fichier local du projet"],
  [/href=["'](?:assets|vendor|js)\//, "href vers un fichier local du projet"],
]) {
  if (pat.test(noComments)) fail(`${label} détecté dans le fichier produit`);
}

// C. node --check sur chaque bloc <script> inline extrait.
const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const EXPECTED_BLOCKS = 8; // samples, abcjs, meter, generator, engine, i18n, preferences, script applicatif
if (blocks.length !== EXPECTED_BLOCKS)
  fail(`${blocks.length} bloc(s) <script> inline au lieu de ${EXPECTED_BLOCKS}`);
const tmp = mkdtempSync(path.join(os.tmpdir(), "brt-build-"));
try {
  blocks.forEach((code, i) => {
    const file = path.join(tmp, `block-${i}.js`);
    writeFileSync(file, code);
    const res = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    if (res.status !== 0)
      fail(`node --check en échec sur le bloc <script> nᵒ ${i + 1} :\n${(res.stderr || "").trim()}`);
  });
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

// D. fetch( restants : listés avec contexte ; le seul autorisé est celui de
// fetchSampleData (repli version dossier), court-circuité au chargement par
// la table embarquée — dont on vérifie la définition et la consommation.
const fetchOccurrences = [];
for (let i = html.indexOf("fetch("); i !== -1; i = html.indexOf("fetch(", i + 1))
  fetchOccurrences.push({ offset: i, context: html.slice(Math.max(0, i - 30), i + 50).replace(/\s+/g, " ") });
console.log(`fetch( restant(s) dans le fichier produit : ${fetchOccurrences.length}`);
for (const f of fetchOccurrences) console.log(`  @${f.offset} … ${f.context} …`);
if (fetchOccurrences.length !== 1)
  fail(`${fetchOccurrences.length} occurrence(s) de fetch( au lieu de 1 (repli fetchSampleData uniquement)`);
const defIdx = html.indexOf("window.BRT_EMBEDDED_SAMPLES = {");
const guardIdx = html.indexOf("= window.BRT_EMBEDDED_SAMPLES;");
if (defIdx === -1) fail("table window.BRT_EMBEDDED_SAMPLES absente du fichier produit");
if (guardIdx === -1) fail("consommation de la table embarquée absente (le fetch s'exécuterait au chargement)");
if (defIdx !== -1 && guardIdx !== -1 && defIdx > guardIdx)
  fail("la table embarquée est définie APRÈS le code qui la consomme");
// L'unique fetch doit vivre dans le script applicatif (après le dernier bloc
// inliné), c'est-à-dire dans fetchSampleData — jamais dans une bibliothèque.
const appScriptIdx = html.indexOf("/* ---- js/engine.js (inline) ---- */");
if (fetchOccurrences.length === 1 && appScriptIdx !== -1 && fetchOccurrences[0].offset < appScriptIdx)
  fail("le fetch restant n'est pas celui de fetchSampleData (il précède le script applicatif)");

/* ------------------------------------------------------------------ */
/* Rapport                                                             */
/* ------------------------------------------------------------------ */

console.log("\nFichiers produits :");
for (const language of Object.keys(OUT_FILES)) {
  const bytes = Buffer.byteLength(localizedHtml[language]);
  console.log(`  ${path.relative(ROOT, OUT_FILES[language])} : ${bytes} octets (${(bytes / 1024 / 1024).toFixed(2)} Mo)`);
}
console.log(`Blocs <script>  : ${blocks.length} — node --check OK sur chacun`);

if (problems.length) {
  console.error(`\nBUILD EN ÉCHEC — ${problems.length} problème(s) :`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}
console.log("\nBuild OK — aucune référence externe, prêt pour une ouverture en file:// sans réseau.");
