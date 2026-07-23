# 01 — Voix de groove synthétisée dans le moteur

**What to build:** Le moteur de lecture sait jouer un *groove* d'accompagnement
sobre à la place du clic. Quand la pulsation est en mode groove, le transport
programme, mesure par mesure, une batterie de synthèse — grosse caisse sur le 1
(et 3), caisse claire sur 2 & 4, charley sur les temps — au lieu du clic sinus. Le
décompte d'une mesure reste **au clic** ; le groove n'entre qu'à la première mesure
jouée. La grosse caisse sur le 1 porte le downbeat (repère équivalent à l'accent
aigu du clic). Motif fixe de 40 à 200 BPM, binaire, synthétisé (aucun sample).
Prefactor d'abord : généraliser le drapeau `clicksEnabled` du transport en un mode
de pulsation `clic | groove` (l'absence de pulsation reste supportée), sans changer
le comportement du clic existant. Vocabulaire : voir `CONTEXT.md` (Clic, Groove) et
`docs/adr/0002-groove-accompagnement.md`.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Un mode de pulsation remplace le booléen clic : `clic` (défaut, comportement
      inchangé), `groove`, et l'absence de pulsation reste supportée.
- [ ] En mode groove, chaque mesure jouée déclenche grosse caisse (1 [& 3]), caisse
      claire (2 & 4) et charley (sur chaque temps), en synthèse (oscillateur +
      bruit filtré) — une attaque par voix et par position.
- [ ] Le décompte d'une mesure reste au clic quel que soit le mode ; le groove
      démarre exactement à la barre 1.
- [ ] `scripts/test-engine.mjs` et `scripts/test-son.mjs` couvrent : hits aux bons
      temps, décompte intact, mode clic inchangé — code de sortie non nul si échec.
