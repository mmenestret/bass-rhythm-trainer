/*
 * Bass Rhythm Trainer — textes d'interface français et anglais.
 *
 * Module UMD sans dépendance :
 *   - detectLanguage(location, documentElement) choisit `?lang=en|fr`, puis
 *     la langue déclarée sur <html> ;
 *   - createTranslator(language) traduit les messages dynamiques et remplace
 *     les variables `{name}` ;
 *   - applyTranslations(document, language) traduit les nœuds marqués par
 *     data-i18n et les attributs marqués par data-i18n-aria-label/title ;
 *   - init(document, location) applique la langue sans modifier l'URL ni son
 *     fragment, qui reste réservé au partage de l'exercice.
 *
 * Exposé sur window.BassRhythmI18n dans la page et module.exports sous Node.
 */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && typeof module.exports === "object") {
    module.exports = factory();
  } else {
    root.BassRhythmI18n = factory();
  }
}(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var messages = {
    fr: {
      "header.compose": "Composer",
      "header.composeAria": "Composer une grille",
      "header.play": "Jouer",
      "header.playAria": "Jouer — réglages et génération de l'exercice",
      "tempo.decrease": "Diminuer le tempo de 5 BPM",
      "tempo.input": "Tempo en BPM",
      "tempo.help": "Cliquer pour saisir · glisser verticalement ou utiliser la molette pour ajuster",
      "tempo.increase": "Augmenter le tempo de 5 BPM",
      "aids.title": "Aides de lecture",
      "aids.description": "Aides de lecture — métronome, guide visuel, son",
      "metronome.title": "Métronome — clics des temps",
      "metronome.label": "Métronome",
      "visual.title": "Guide visuel — durée des notes et curseur",
      "visual.label": "Guide visuel",
      "noteSound.title": "Son — rythmique jouée",
      "noteSound.label": "Son",
      "transport.rewind": "Retour au début",
      "transport.play": "Lancer la lecture",
      "transport.pause": "Suspendre la lecture",
      "transport.loop": "Boucler l'exercice",
      "transport.unlimited": "Exercice illimité — mesures générées en continu",
      "share.copy": "Copier le lien de la grille",
      "composer.viewTitle": "grille composée",
      "keyboard.hint": "Espace — lancer ou suspendre la lecture",
      "drawer.play": "Jouer",
      "drawer.playAria": "Jouer — réglages de l'exercice",
      "drawer.closePlay": "Fermer le panneau Jouer",
      "composer.loaded": "Grille composée chargée.",
      "composer.backGenerated": "Revenir à une grille générée",
      "field.sound": "Son",
      "sound.growl": "Basse growl",
      "sound.synth": "Synthé",
      "sound.ergo": "Basse Ergo",
      "sound.arco": "Contrebasse à l'archet",
      "sound.preview": "Écouter",
      "sound.previewGrowl": "Écouter la basse growl",
      "sound.previewSynth": "Écouter le synthé",
      "sound.previewErgo": "Écouter la basse Ergo",
      "sound.previewArco": "Écouter la contrebasse à l'archet",
      "field.practiceNote": "Note d'entraînement",
      "field.beat": "Pulsation",
      "beat.click": "Clic",
      "beat.groove": "Groove",
      "beat.previewGroove": "Écouter le groove",
      "field.procedes": "Procédés",
      "procede.rests": "Silences",
      "procede.dots": "Points",
      "procede.ties": "Liaisons",
      "procede.syncopes": "Syncopes",
      "procede.triplets": "Triolets",
      "procede.soon": "bientôt",
      "procede.needs": "nécessite {figures}",
      "procede.needsMore": "nécessite d'autres figures",
      "figureDefinite.whole": "la ronde",
      "figureDefinite.half": "la blanche",
      "figureDefinite.quarter": "la noire",
      "figureDefinite.eighth": "la croche",
      "figureDefinite.sixteenth": "la double croche",
      "figureDefinite.thirtySecond": "la triple croche",
      "figureDefinite.sixtyFourth": "la quadruple croche",
      "list.and": "et",
      "field.noteValues": "Figures de notes",
      "figure.whole": "Ronde",
      "figure.half": "Blanche",
      "figure.quarter": "Noire",
      "figure.eighth": "Croche",
      "figure.sixteenth": "Double croche",
      "figure.thirtySecond": "Triple croche",
      "figure.sixtyFourth": "Quadruple croche",
      "field.timeSignature": "Signature",
      "field.measures": "Mesures",
      "measures.unlimited": "Mesures illimitées, générées en continu",
      "action.generate": "Générer",
      "composer.title": "Composer",
      "composer.aria": "Composer une grille",
      "composer.close": "Fermer Composer",
      "field.families": "Familles",
      "composer.familiesAria": "Familles de la palette",
      "composer.backspace": "⌫ Effacer",
      "composer.backspaceAria": "Effacer le dernier élément",
      "composer.clear": "Tout effacer",
      "action.play": "Jouer",
      "lesson.long": "les valeurs longues",
      "lesson.long.rests": "les valeurs longues et leurs silences",
      "lesson.eighth": "la croche",
      "lesson.eighth.rests": "la croche et son demi-soupir",
      "lesson.sixteenth": "la double croche",
      "lesson.sixteenth.rests": "la double croche et son quart de soupir",
      "lesson.thirtySecond": "la triple croche",
      "lesson.thirtySecond.rests": "la triple croche et son huitième de soupir",
      "lesson.sixtyFourth": "la quadruple croche",
      "lesson.sixtyFourth.rests": "la quadruple croche et son seizième de soupir",
      "lesson.procede.dots": "pointées",
      "lesson.procede.ties": "liaisons",
      "lesson.procede.syncopes": "syncopes",
      "lesson.procede.triplets": "triolets",
      "lesson.withProcedes": "{lesson}, avec {procedes}",
      "score.unavailableOffline": "La partition n'a pas pu se charger (abcjs indisponible hors ligne).",
      "score.unavailable": "La partition n'a pas pu se charger.",
      "warning.guidance": "Guidage visuel désactivé : {svgCount} élément(s) SVG (notes/silences) pour {eventCount} événement(s) de timeline — mapping impossible.",
      "toast.linkCopied": "Lien copié",
      "toast.copyFailed": "Copie impossible",
      "error.sampleUnavailable": "sample indisponible",
      "error.copyDenied": "copie refusée",
      "composer.confirmMeter": "Changer la signature réinitialise la grille composée. Continuer ?",
      "rest.whole": "Pause",
      "rest.half": "Demi-pause",
      "rest.quarter": "Soupir",
      "rest.eighth": "Demi-soupir",
      "rest.sixteenth": "Quart de soupir",
      "rest.thirtySecond": "Huitième de soupir",
      "rest.sixtyFourth": "Seizième de soupir",
      "composer.measureOne": "1 mesure",
      "composer.measureMany": "{count} mesures",
      "composer.duplicateRight": "Dupliquer à droite",
      "composer.duplicateEnd": "Dupliquer à la fin",
      "action.delete": "Supprimer",
      "family.notes": "Notes",
      "family.rests": "Silences",
      "family.modifiers": "Modificateurs",
      "modifier.dotted": "Note<br>pointée",
      "modifier.tieNext": "Lier à<br>la suivante",
      "composer.tiePending": " · <b>liaison en attente</b>",
      "composer.readout": "Mesure en cours : <b>{placed} / {total}</b> temps · reste <b>{remaining}</b>{extra}"
    },
    en: {
      "header.compose": "Compose",
      "header.composeAria": "Compose an exercise",
      "header.play": "Play",
      "header.playAria": "Play — exercise settings and generation",
      "tempo.decrease": "Decrease tempo by 5 BPM",
      "tempo.input": "Tempo in BPM",
      "tempo.help": "Click to type · drag vertically or use the mouse wheel to adjust",
      "tempo.increase": "Increase tempo by 5 BPM",
      "aids.title": "Reading aids",
      "aids.description": "Reading aids — metronome, visual guide, note sound",
      "metronome.title": "Metronome — beat clicks",
      "metronome.label": "Metronome",
      "visual.title": "Visual guide — note lengths and cursor",
      "visual.label": "Visual guide",
      "noteSound.title": "Note sound — plays the written rhythm",
      "noteSound.label": "Note sound",
      "transport.rewind": "Back to the start",
      "transport.play": "Start playback",
      "transport.pause": "Pause playback",
      "transport.loop": "Loop the exercise",
      "transport.unlimited": "Unlimited exercise — measures generated continuously",
      "share.copy": "Copy the exercise link",
      "composer.viewTitle": "composed exercise",
      "keyboard.hint": "Space — start or pause playback",
      "drawer.play": "Play",
      "drawer.playAria": "Play — exercise settings",
      "drawer.closePlay": "Close the Play panel",
      "composer.loaded": "Composed exercise loaded.",
      "composer.backGenerated": "Return to a generated exercise",
      "field.sound": "Sound",
      "sound.growl": "Growl bass",
      "sound.synth": "Synth",
      "sound.ergo": "Ergo bass",
      "sound.arco": "Bowed double bass",
      "sound.preview": "Listen",
      "sound.previewGrowl": "Listen to the growl bass",
      "sound.previewSynth": "Listen to the synth",
      "sound.previewErgo": "Listen to the Ergo bass",
      "sound.previewArco": "Listen to the bowed double bass",
      "field.practiceNote": "Practice note",
      "field.beat": "Beat",
      "beat.click": "Click",
      "beat.groove": "Groove",
      "beat.previewGroove": "Listen to the groove",
      "field.procedes": "Techniques",
      "procede.rests": "Rests",
      "procede.dots": "Dots",
      "procede.ties": "Ties",
      "procede.syncopes": "Syncopation",
      "procede.triplets": "Triplets",
      "procede.soon": "coming soon",
      "procede.needs": "needs {figures}",
      "procede.needsMore": "needs other note values",
      "figureDefinite.whole": "whole notes",
      "figureDefinite.half": "half notes",
      "figureDefinite.quarter": "quarter notes",
      "figureDefinite.eighth": "eighth notes",
      "figureDefinite.sixteenth": "sixteenth notes",
      "figureDefinite.thirtySecond": "thirty-second notes",
      "figureDefinite.sixtyFourth": "sixty-fourth notes",
      "list.and": "and",
      "field.noteValues": "Note values",
      "figure.whole": "Whole note",
      "figure.half": "Half note",
      "figure.quarter": "Quarter note",
      "figure.eighth": "Eighth note",
      "figure.sixteenth": "Sixteenth note",
      "figure.thirtySecond": "Thirty-second note",
      "figure.sixtyFourth": "Sixty-fourth note",
      "field.timeSignature": "Time signature",
      "field.measures": "Measures",
      "measures.unlimited": "Unlimited measures, generated continuously",
      "action.generate": "Generate",
      "composer.title": "Compose",
      "composer.aria": "Compose an exercise",
      "composer.close": "Close Compose",
      "field.families": "Families",
      "composer.familiesAria": "Palette families",
      "composer.backspace": "⌫ Delete last",
      "composer.backspaceAria": "Delete the last item",
      "composer.clear": "Clear all",
      "action.play": "Play",
      "lesson.long": "long note values",
      "lesson.long.rests": "long note values and their rests",
      "lesson.eighth": "eighth notes",
      "lesson.eighth.rests": "eighth notes and eighth rests",
      "lesson.sixteenth": "sixteenth notes",
      "lesson.sixteenth.rests": "sixteenth notes and sixteenth rests",
      "lesson.thirtySecond": "thirty-second notes",
      "lesson.thirtySecond.rests": "thirty-second notes and thirty-second rests",
      "lesson.sixtyFourth": "sixty-fourth notes",
      "lesson.sixtyFourth.rests": "sixty-fourth notes and sixty-fourth rests",
      "lesson.procede.dots": "dotted notes",
      "lesson.procede.ties": "ties",
      "lesson.procede.syncopes": "syncopation",
      "lesson.procede.triplets": "triplets",
      "lesson.withProcedes": "{lesson}, with {procedes}",
      "score.unavailableOffline": "The score could not load (abcjs is unavailable offline).",
      "score.unavailable": "The score could not load.",
      "warning.guidance": "Visual guidance disabled: {svgCount} SVG note/rest element(s) for {eventCount} timeline event(s); mapping is not possible.",
      "toast.linkCopied": "Link copied",
      "toast.copyFailed": "Could not copy the link",
      "error.sampleUnavailable": "sample unavailable",
      "error.copyDenied": "copy denied",
      "composer.confirmMeter": "Changing the time signature resets the composed exercise. Continue?",
      "rest.whole": "Whole rest",
      "rest.half": "Half rest",
      "rest.quarter": "Quarter rest",
      "rest.eighth": "Eighth rest",
      "rest.sixteenth": "Sixteenth rest",
      "rest.thirtySecond": "Thirty-second rest",
      "rest.sixtyFourth": "Sixty-fourth rest",
      "composer.measureOne": "1 measure",
      "composer.measureMany": "{count} measures",
      "composer.duplicateRight": "Duplicate to the right",
      "composer.duplicateEnd": "Duplicate at the end",
      "action.delete": "Delete",
      "family.notes": "Notes",
      "family.rests": "Rests",
      "family.modifiers": "Modifiers",
      "modifier.dotted": "Dotted<br>note",
      "modifier.tieNext": "Tie to<br>next note",
      "composer.tiePending": " · <b>tie pending</b>",
      "composer.readout": "Current measure: <b>{placed} / {total}</b> beats · <b>{remaining}</b> remaining{extra}"
    }
  };

  var translatableAttributes = ["aria-label", "title"];

  function normalizeLanguage(value) {
    var language = String(value || "").toLowerCase().split("-")[0];
    return Object.prototype.hasOwnProperty.call(messages, language) ? language : "fr";
  }

  function detectLanguage(locationLike, documentElement) {
    var search = locationLike && typeof locationLike.search === "string" ? locationLike.search : "";
    var match = /(?:^|[?&])lang=([^&]+)/.exec(search);
    if (match) {
      try {
        var requested = decodeURIComponent(match[1]).toLowerCase().split("-")[0];
        if (Object.prototype.hasOwnProperty.call(messages, requested)) return requested;
      } catch (error) {}
    }
    return normalizeLanguage(documentElement && documentElement.getAttribute("lang"));
  }

  function translate(language, key, values) {
    var lang = normalizeLanguage(language);
    var message = messages[lang][key];
    if (typeof message !== "string") message = messages.fr[key];
    if (typeof message !== "string") return key;
    return message.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, function (_, name) {
      return values && values[name] !== undefined ? String(values[name]) : "{" + name + "}";
    });
  }

  function createTranslator(language) {
    var lang = normalizeLanguage(language);
    return function (key, values) {
      return translate(lang, key, values);
    };
  }

  function applyTranslations(doc, language) {
    var t = createTranslator(language);
    doc.querySelectorAll("[data-i18n]").forEach(function (element) {
      element.textContent = t(element.getAttribute("data-i18n"));
    });
    translatableAttributes.forEach(function (attribute) {
      var marker = "data-i18n-" + attribute;
      doc.querySelectorAll("[" + marker + "]").forEach(function (element) {
        element.setAttribute(attribute, t(element.getAttribute(marker)));
      });
    });
  }

  function init(doc, locationLike) {
    var language = detectLanguage(locationLike, doc.documentElement);
    doc.documentElement.setAttribute("lang", language);
    applyTranslations(doc, language);
    return {
      language: language,
      t: createTranslator(language)
    };
  }

  return {
    messages: messages,
    translatableAttributes: translatableAttributes,
    normalizeLanguage: normalizeLanguage,
    detectLanguage: detectLanguage,
    translate: translate,
    createTranslator: createTranslator,
    applyTranslations: applyTranslations,
    init: init
  };
}));
