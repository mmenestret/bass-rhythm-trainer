/*
 * Bass Rhythm Trainer — analyse d'une signature, source unique du
 * générateur, du moteur et de la page.
 *
 * Fonction pure, sans DOM : analyzeMeter("6/8") ->
 *   { meter, numerator, denominator, compound, beats, beat64, beatFigure,
 *     beatDotted, subdivision }
 *   - signature permise : numérateur de 1 à 12, dénominateur parmi 2, 4 et 8,
 *     écrits sans zéro initial ni espace ; toute autre valeur lève une erreur
 *     (isMeter(meter) dit si elle est permise, sans lever) ;
 *   - mesure composée : en /8, un numérateur multiple de 3 au moins égal à 6
 *     (6/8, 9/8, 12/8). Le temps est la noire pointée, divisée en trois
 *     croches : le numérateur compte des croches, beats = numérateur / 3 ;
 *   - sinon mesure simple : le temps est la figure du dénominateur (blanche
 *     en /2, noire en /4, croche en /8 — 3/8, 5/8, 7/8 se battent à la
 *     croche), beats = numérateur ;
 *   - beat64 : durée du temps en 64e de ronde (32, 16 ou 8 ; 24 en
 *     composée). Une mesure dure toujours beats × beat64 ;
 *   - beatFigure / beatDotted : figure du temps, c'est-à-dire l'unité du
 *     tempo (« noire » pointée en composée) ;
 *   - subdivision : croches par temps entendues en composée (3), 1 sinon.
 * allMeters() rend la liste (copie neuve) de toutes les signatures permises.
 *
 * UMD minimal : window.BassRhythmMeter dans la page, module.exports sous Node.
 */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && typeof module.exports === "object") {
    module.exports = factory();
  } else {
    root.BassRhythmMeter = factory();
  }
}(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const METER_NUMERATOR_MAX = 12;
  const METER_DENOMINATORS = [2, 4, 8];
  const COMPOUND_SUBDIVISION = 3;
  const BEAT_FIGURES = { 2: "blanche", 4: "noire", 8: "croche" };
  const METER_PATTERN = /^([1-9]|1[0-2])\/([248])$/;

  function isMeter(meter) {
    return typeof meter === "string" && METER_PATTERN.test(meter);
  }

  function analyzeMeter(meter) {
    const match = typeof meter === "string" ? METER_PATTERN.exec(meter) : null;
    if (!match) throw new Error("Signature non gérée : " + meter);
    const numerator = parseInt(match[1], 10);
    const denominator = parseInt(match[2], 10);
    const compound = denominator === 8 && numerator >= 6 && numerator % 3 === 0;
    const subdivision = compound ? COMPOUND_SUBDIVISION : 1;
    return {
      meter: meter,
      numerator: numerator,
      denominator: denominator,
      compound: compound,
      beats: numerator / subdivision,
      beat64: subdivision * 64 / denominator,
      beatFigure: compound ? "noire" : BEAT_FIGURES[denominator],
      beatDotted: compound,
      subdivision: subdivision
    };
  }

  function allMeters() {
    const meters = [];
    for (let n = 1; n <= METER_NUMERATOR_MAX; n++) {
      for (let i = 0; i < METER_DENOMINATORS.length; i++) {
        meters.push(n + "/" + METER_DENOMINATORS[i]);
      }
    }
    return meters;
  }

  return {
    METER_NUMERATOR_MAX: METER_NUMERATOR_MAX,
    METER_DENOMINATORS: METER_DENOMINATORS.slice(),
    isMeter: isMeter,
    analyzeMeter: analyzeMeter,
    allMeters: allMeters
  };
}));
