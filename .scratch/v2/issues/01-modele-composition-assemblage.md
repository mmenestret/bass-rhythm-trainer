# 01 — Modèle de composition et assemblage réutilisé

**What to build:** une brique pure, sans DOM, qui transforme l'état d'une grille
composée — une suite de **mesures**, chacune une liste plate d'événements
`{ d (temps), rest, tie }` — en `{ abc, notes, bars, header }`, exactement au même
contrat que `generateExercise`. Concrètement, factoriser/exposer la logique
d'`assemble()` de `js/generator.js` (ligatures par temps, choix de l'unité `L:`,
timeline `notes`, découpage 4 mesures/système) pour qu'elle serve aussi bien au
tirage aléatoire qu'à la composition manuelle. Une grille composée devient alors
un artefact identique à une grille générée et se rebranche sur toute la chaîne de
lecture sans code spécifique. Voir `CONTEXT.md` (grille composée) pour le
vocabulaire.

**Blocked by:** —

**Status:** todo

- [ ] Une fonction pure `assembleComposed(measures, config)` (ou équivalent
      exporté) rend `{ abc, notes, bars, header }` au même contrat que
      `generateExercise` — aucune duplication de la logique d'assemblage.
- [ ] Point (note ×1,5) et liaison (`tie`/`tiedToNext`) produisent l'ABC et la
      timeline attendus, y compris une liaison à cheval sur la barre de mesure.
- [ ] Une liaison en toute fin de grille (sans note suivante) est neutralisée.
- [ ] Harnais Node `scripts/test-composer.mjs` : sommes de mesures exactes,
      ligatures, timeline cohérente, cas point/liaison — code de sortie non nul
      en cas d'échec.
- [ ] Le build fichier unique (`scripts/build-single-file.mjs`) reste vert
      (module inliné, aucune référence externe résiduelle).
