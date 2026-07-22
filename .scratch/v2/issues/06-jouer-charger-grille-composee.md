# 06 — Jouer : charger la grille composée dans le lecteur

**What to build:** le bouton **« Jouer »** du tiroir Composer quitte l'atelier et
charge la grille composée dans le **lecteur normal**, exactement comme une grille
générée. Il passe l'artefact `{ abc, notes }` (issu du ticket 01) à la chaîne de
lecture existante ; toutes les aides (métronome, guide visuel, son), le tempo, le
décompte et la boucle (repeat) fonctionnent sans code spécifique. La grille
composée est finie (le mode ∞ ne s'y applique pas). Le mot **« Jouer »** est
réservé à cette action ; « Générer » reste le tirage aléatoire. Composer conserve
sa composition en cours pendant la session (rouvrir le tiroir ne l'efface pas) ;
il n'importe pas la grille affichée (page blanche — l'import est parké v2).

**Blocked by:** 01, 03.

**Status:** todo

- [ ] « Jouer » charge la grille composée dans le lecteur et ferme le tiroir ; la
      lecture démarre avec décompte, au tempo/son/note réglés dans Réglages.
- [ ] Métronome, guide visuel, son et boucle (repeat) se comportent comme pour
      une grille générée.
- [ ] Une grille composée finie ne déclenche jamais le mode ∞.
- [ ] Rouvrir Composer après « Jouer » retrouve la composition en cours (elle
      n'est pas réinitialisée par la lecture).
