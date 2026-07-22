# 03 — Construction : pose des figures, curseur + remplissage strict

**What to build:** le cœur de la composition. La palette Notes affiche les 7
figures ; la famille Silences ajoute leurs silences. Chaque clic sur une figure
la **pose au curseur**, qui avance ; quand la mesure courante est pleine, le
curseur passe automatiquement à une **nouvelle mesure vide** (croissance
dynamique, aucun nombre de mesures à fixer). Invariant strict : chaque mesure vaut
**exactement** la signature à tout instant ; une figure trop grande pour la place
restante est **grisée**. **Effacer** retire le dernier élément (retour arrière),
**Tout effacer** repart de zéro. Changer la signature demande confirmation et
réinitialise la grille. La scène grave la grille composée **en direct, comme la
vue de jeu** : centrée, 4 mesures par système qui s'enchaînent, tout le morceau
déroulé (pas de fenêtre de 3 systèmes), aux mêmes options abcjs (`responsive`,
sans `staffwidth` forcé) — donc mêmes petites notes.

**Blocked by:** 01, 02.

**Status:** todo

- [ ] Poser des figures/silences remplit les mesures ; chaque mesure somme
      exactement à la signature ; une nouvelle mesure vide s'ouvre au bout.
- [ ] Une figure qui ne rentre pas dans la place restante est grisée (inactive).
- [ ] Effacer (retour arrière) et Tout effacer fonctionnent ; l'état reste
      toujours valide (jamais de mesure à moitié pleine gravée de travers).
- [ ] Changer la signature réinitialise la grille après confirmation.
- [ ] La portée est gravée comme en JOUER (centrée, 4 mesures/système, tout le
      morceau, même taille de notes) et se met à jour à chaque pose.
