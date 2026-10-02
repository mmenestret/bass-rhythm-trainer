/*
 * Harnais de test des préférences de lecture (module pur, stockage injecté).
 * Usage : node scripts/test-preferences.mjs
 *
 * Vérifie :
 *  (a) défauts : voix clic, volumes 100 % pour chaque voix, aides par défaut
 *      de la page (métronome et guide visuel actifs, son coupé), subdivision
 *      active ;
 *  (b) aller-retour : ce qui est écrit est relu à l'identique, sous une seule
 *      clé versionnée ;
 *  (c) lecture tolérante : stockage absent ou vide, JSON corrompu, valeurs
 *      de mauvais type ou hors bornes -> défaut, champ par champ, sans
 *      jamais lever d'exception ;
 *  (d) stockage défaillant (mode privé, quota dépassé) : lecture et écriture
 *      n'échouent jamais ;
 *  (e) la borne haute du volume est celle du moteur.
 * Code de sortie non nul si échec.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const Preferences = require(path.join(ROOT, "js", "preferences.js"));
const Engine = require(path.join(ROOT, "js", "engine.js"));
const { STORAGE_KEY, defaultPreferences, readPreferences, writePreferences } = Preferences;

let checks = 0;
const failures = [];
function expect(cond, msg) {
  checks++;
  if (!cond) failures.push(msg);
  return cond;
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* Stockage en mémoire, même interface que localStorage. */
function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null),
    setItem: (key, value) => { data[key] = String(value); },
  };
}
/* Lecture sans exception : toute erreur échoue la vérification. */
function safeRead(storage, label) {
  try {
    return readPreferences(storage);
  } catch (err) {
    expect(false, `${label} — readPreferences a levé : ${err && err.message}`);
    return null;
  }
}

const DEFAULTS = {
  pulsationVoice: "clic",
  pulsationVolumes: { clic: 1, groove: 1 },
  aids: { click: true, visual: true, sound: false },
  subdivide: true,
};

/* ---------- (a) défauts ---------- */
{
  expect(same(defaultPreferences(), DEFAULTS),
    `défauts — attendu ${JSON.stringify(DEFAULTS)}, reçu ${JSON.stringify(defaultPreferences())}`);
  // Chaque appel rend une copie indépendante : la page peut la muter.
  const a = defaultPreferences();
  a.pulsationVolumes.clic = 2;
  a.aids.sound = true;
  expect(same(defaultPreferences(), DEFAULTS), "défauts — muter une copie altère les défauts suivants");
  expect(typeof STORAGE_KEY === "string" && /v\d+$/.test(STORAGE_KEY),
    `clé — attendu une clé versionnée (suffixe vN), reçu ${STORAGE_KEY}`);
}

/* ---------- (b) aller-retour sous une seule clé ---------- */
{
  const storage = memoryStorage();
  const prefs = {
    pulsationVoice: "groove",
    pulsationVolumes: { clic: 2.5, groove: 0 },
    aids: { click: false, visual: false, sound: true },
    subdivide: false,
  };
  expect(writePreferences(storage, prefs) === true, "aller-retour — l'écriture doit réussir");
  expect(Object.keys(storage.data).length === 1 && STORAGE_KEY in storage.data,
    `aller-retour — clés écrites : ${Object.keys(storage.data).join(", ")}`);
  const back = safeRead(storage, "aller-retour");
  expect(same(back, prefs), `aller-retour — relu ${JSON.stringify(back)}`);

  // Valeurs intermédiaires du curseur.
  writePreferences(storage, { ...DEFAULTS, pulsationVolumes: { clic: 1.35, groove: 0.6 } });
  const back2 = safeRead(storage, "aller-retour 2");
  expect(back2 && back2.pulsationVolumes.clic === 1.35 && back2.pulsationVolumes.groove === 0.6,
    `aller-retour — volumes intermédiaires relus ${JSON.stringify(back2 && back2.pulsationVolumes)}`);
}

/* ---------- (c) lecture tolérante ---------- */
{
  expect(same(safeRead(null, "sans stockage"), DEFAULTS), "sans stockage — défauts attendus");
  expect(same(safeRead(undefined, "stockage indéfini"), DEFAULTS), "stockage indéfini — défauts attendus");
  expect(same(safeRead(memoryStorage(), "stockage vide"), DEFAULTS), "stockage vide — défauts attendus");

  const corrupted = ["{", "not json", "null", "42", "\"groove\"", "[]", "true", ""];
  for (const raw of corrupted) {
    const got = safeRead(memoryStorage({ [STORAGE_KEY]: raw }), `JSON ${raw}`);
    expect(same(got, DEFAULTS), `JSON corrompu ${JSON.stringify(raw)} — reçu ${JSON.stringify(got)}`);
  }

  // Champ par champ : une valeur invalide retombe sur SON défaut, les autres restent.
  const cases = [
    [{ pulsationVoice: "cowbell" }, DEFAULTS],
    [{ pulsationVoice: 3 }, DEFAULTS],
    [{ pulsationVoice: "groove" }, { ...DEFAULTS, pulsationVoice: "groove" }],
    [{ pulsationVolumes: { clic: 3.1, groove: -0.1 } }, DEFAULTS],
    [{ pulsationVolumes: { clic: "2", groove: null } }, DEFAULTS],
    [{ pulsationVolumes: { clic: 1.8, groove: Number.NaN } },
      { ...DEFAULTS, pulsationVolumes: { clic: 1.8, groove: 1 } }],
    [{ pulsationVolumes: { clic: 0, groove: 2.5 } },
      { ...DEFAULTS, pulsationVolumes: { clic: 0, groove: 2.5 } }],
    [{ pulsationVolumes: [2, 2] }, DEFAULTS],
    [{ pulsationVolumes: "loud" }, DEFAULTS],
    [{ aids: { click: "yes", visual: 0, sound: null } }, DEFAULTS],
    [{ aids: { click: false } }, { ...DEFAULTS, aids: { click: false, visual: true, sound: false } }],
    [{ aids: true }, DEFAULTS],
    [{ subdivide: false }, { ...DEFAULTS, subdivide: false }],
    [{ subdivide: "non" }, DEFAULTS],
    [{ subdivide: 0 }, DEFAULTS],
    [{ pulsationVoice: "groove", pulsationVolumes: { groove: 2 }, aids: { sound: true }, unknown: 1 },
      { pulsationVoice: "groove", pulsationVolumes: { clic: 1, groove: 2 }, aids: { click: true, visual: true, sound: true }, subdivide: true }],
  ];
  for (const [stored, want] of cases) {
    const got = safeRead(memoryStorage({ [STORAGE_KEY]: JSON.stringify(stored) }), JSON.stringify(stored));
    expect(same(got, want), `tolérance ${JSON.stringify(stored)} — attendu ${JSON.stringify(want)}, reçu ${JSON.stringify(got)}`);
  }

  // Une écriture invalide est assainie : relue, elle retombe sur les défauts.
  const storage = memoryStorage();
  writePreferences(storage, { pulsationVoice: "cowbell", pulsationVolumes: { clic: 9 }, aids: null });
  expect(same(safeRead(storage, "écriture invalide"), DEFAULTS), "écriture invalide — relue comme défauts");
}

/* ---------- (d) stockage défaillant ---------- */
{
  const throwing = {
    getItem() { throw new Error("SecurityError"); },
    setItem() { throw new Error("QuotaExceededError"); },
  };
  expect(same(safeRead(throwing, "getItem levant"), DEFAULTS), "getItem levant — défauts attendus");
  let wrote;
  try {
    wrote = writePreferences(throwing, DEFAULTS);
  } catch (err) {
    expect(false, `setItem levant — writePreferences a levé : ${err && err.message}`);
  }
  expect(wrote === false, "setItem levant — writePreferences doit rendre false");
  let wroteNull;
  try {
    wroteNull = writePreferences(null, DEFAULTS);
  } catch (err) {
    expect(false, `sans stockage — writePreferences a levé : ${err && err.message}`);
  }
  expect(wroteNull === false, "sans stockage — writePreferences doit rendre false");
}

/* ---------- (e) borne haute commune avec le moteur ---------- */
{
  expect(Preferences.PULSATION_VOLUME_MAX === 3, `borne — attendu 3, reçu ${Preferences.PULSATION_VOLUME_MAX}`);
  expect(Preferences.PULSATION_VOLUME_MAX === Engine.PULSATION_VOLUME_MAX,
    "borne — le maximum des préférences diffère de celui du moteur");
}

/* ---------- bilan ---------- */
if (failures.length) {
  console.error(`ÉCHEC — ${failures.length} vérification(s) sur ${checks} en échec :`);
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
} else {
  console.log(`OK — ${checks} vérifications, 0 échec.`);
}
