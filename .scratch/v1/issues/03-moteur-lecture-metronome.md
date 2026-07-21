# 03 — Moteur de lecture + métronome (mode 1)

**What to build:** on lance l'exercice : décompte visuel d'une mesure, puis le métronome clique chaque temps (accent sur le 1er) au tempo choisi (40–200 BPM, défaut 60), sans dérive. Les pastilles de temps pulsent en rythme, le statut affiche « Mesure 3/8 · Temps 2 ». Le tempo est modifiable en cours de lecture sans saut, « +5 BPM » applique l'incrément immédiatement. Play/Pause et Rejouer fonctionnent. C'est le mode de guidage 1 (métronome seul) complet.

**Blocked by:** 02 — Générateur de grilles Agostini.

**Status:** done

- [x] Horloge audio à lookahead : aucun décalage audible ni dérive sur 2 minutes de lecture.
- [x] Décompte d'une mesure complète avant le départ, calé sur la signature.
- [x] Accent net sur le temps 1, pastilles synchronisées avec les clics.
- [x] Changement de tempo et +5 BPM en vol sans interrompre ni désynchroniser la lecture.
