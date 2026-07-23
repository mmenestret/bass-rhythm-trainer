# 02 — Choix clic/groove dans le tiroir « Jouer » + préécoute

**What to build:** Dans le tiroir « Jouer », l'utilisateur choisit la voix de la
pulsation — **clic** (défaut) ou **groove** — et peut la préécouter (~1,5 s, comme
la section Son). Le choix est câblé dans la création du transport : lancer la
lecture avec « groove » sélectionné joue le groove. C'est une préférence de lecture
locale — elle n'est **pas encodée dans le lien de partage** (un lien reçu se joue
avec les réglages du lecteur). Le groove est mixé **sous** la voix du rythme lu,
pour ne pas masquer la lecture. Vocabulaire : voir `CONTEXT.md` (Clic, Groove) et
`docs/adr/0002-groove-accompagnement.md`.

**Blocked by:** 01 — Voix de groove synthétisée dans le moteur.

**Status:** ready-for-agent

- [ ] Le tiroir « Jouer » propose le choix clic/groove, défaut **clic**, opt-in.
- [ ] Une préécoute (~1,5 s) fait entendre le groove sans lancer l'exercice.
- [ ] Lancer la lecture avec « groove » sélectionné joue le groove ; « clic »
      conserve exactement le comportement actuel.
- [ ] Le choix n'apparaît pas dans le lien de partage (codec d'URL inchangé).
- [ ] Groove mixé sous la voix du rythme lu ; `node scripts/build-single-file.mjs`
      reste vert.
