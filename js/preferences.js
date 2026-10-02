/*
 * Bass Rhythm Trainer — préférences de lecture (voix et volumes de
 * pulsation, aides activées), mémorisées sur l'appareil.
 *
 * Module pur : le stockage est injecté (localStorage dans la page, un objet
 * { getItem, setItem } sous Node). Contrat :
 *   - defaultPreferences() rend une copie neuve des défauts :
 *     { pulsationVoice: "clic", pulsationVolumes: { clic: 1, groove: 1 },
 *       aids: { click: true, visual: true, sound: false } } ;
 *   - readPreferences(storage) lit l'unique clé versionnée STORAGE_KEY et
 *     rend des préférences complètes. La lecture est tolérante, champ par
 *     champ : stockage absent ou défaillant, JSON corrompu, valeur de mauvais
 *     type ou hors bornes -> défaut du champ. Elle ne lève jamais ;
 *   - writePreferences(storage, prefs) assainit puis écrit sous STORAGE_KEY,
 *     et rend true si l'écriture a réussi, false sinon (mode privé, quota
 *     dépassé, stockage absent). Elle ne lève jamais.
 *
 * Un volume de pulsation est un facteur appliqué au niveau par défaut de la
 * voix, de 0 (silence) à PULSATION_VOLUME_MAX (même borne que le moteur).
 * Ces réglages ne passent jamais dans le lien de partage (ADR 0001 et 0002).
 *
 * UMD minimal : window.BassRhythmPreferences dans la page, module.exports
 * sous Node.
 */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && typeof module.exports === "object") {
    module.exports = factory();
  } else {
    root.BassRhythmPreferences = factory();
  }
}(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const STORAGE_KEY = "bass-rhythm-trainer.preferences.v1";
  const PULSATION_VOICES = ["clic", "groove"];
  const PULSATION_VOLUME_MIN = 0;
  const PULSATION_VOLUME_MAX = 2.5;
  const AIDS = ["click", "visual", "sound"];

  function defaultPreferences() {
    return {
      pulsationVoice: "clic",
      pulsationVolumes: { clic: 1, groove: 1 },
      aids: { click: true, visual: true, sound: false }
    };
  }

  function isPlainObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  function isPulsationVolume(value) {
    return typeof value === "number" &&
      isFinite(value) &&
      value >= PULSATION_VOLUME_MIN &&
      value <= PULSATION_VOLUME_MAX;
  }

  /* Complète et assainit des préférences quelconques : chaque champ invalide
     prend sa valeur par défaut, les champs inconnus sont ignorés. */
  function normalizePreferences(raw) {
    const prefs = defaultPreferences();
    if (!isPlainObject(raw)) return prefs;
    if (PULSATION_VOICES.indexOf(raw.pulsationVoice) !== -1) {
      prefs.pulsationVoice = raw.pulsationVoice;
    }
    if (isPlainObject(raw.pulsationVolumes)) {
      PULSATION_VOICES.forEach(function (voice) {
        const volume = raw.pulsationVolumes[voice];
        if (isPulsationVolume(volume)) prefs.pulsationVolumes[voice] = volume;
      });
    }
    if (isPlainObject(raw.aids)) {
      AIDS.forEach(function (aid) {
        if (typeof raw.aids[aid] === "boolean") prefs.aids[aid] = raw.aids[aid];
      });
    }
    return prefs;
  }

  function readPreferences(storage) {
    try {
      if (!storage) return defaultPreferences();
      const text = storage.getItem(STORAGE_KEY);
      if (typeof text !== "string" || !text) return defaultPreferences();
      return normalizePreferences(JSON.parse(text));
    } catch (err) {
      // Stockage inaccessible ou contenu corrompu : on repart des défauts.
      return defaultPreferences();
    }
  }

  function writePreferences(storage, prefs) {
    try {
      if (!storage) return false;
      storage.setItem(STORAGE_KEY, JSON.stringify(normalizePreferences(prefs)));
      return true;
    } catch (err) {
      // Mode privé ou quota dépassé : la préférence reste valable pour la session.
      return false;
    }
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    PULSATION_VOICES: PULSATION_VOICES,
    PULSATION_VOLUME_MIN: PULSATION_VOLUME_MIN,
    PULSATION_VOLUME_MAX: PULSATION_VOLUME_MAX,
    defaultPreferences: defaultPreferences,
    normalizePreferences: normalizePreferences,
    readPreferences: readPreferences,
    writePreferences: writePreferences
  };
}));
