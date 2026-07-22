# 05 — Duplication : sélection de plage sur la portée

**What to build:** dupliquer/supprimer des mesures **directement sur la portée**.
Cliquer une mesure la **sélectionne** (surlignée) ; glisser ou maj+clic étend à
une **plage contiguë** de mesures. Une **barrette flottante** apparaît sur la
sélection avec trois actions :

- **Dupliquer à droite** : insère la copie de la plage juste après la sélection.
- **Dupliquer à la fin** : ajoute la copie en bout de morceau (masqué si la
  sélection est déjà la dernière mesure).
- **Supprimer** : retire les mesures sélectionnées.

**Cliquer en dehors** de la sélection en sort (sans passer par un bouton). Comme
chaque mesure est une unité complète, ces opérations préservent toujours
l'invariant. Le repérage des mesures s'appuie sur les classes `abcjs-mm<n>` du
rendu, et fonctionne à travers les systèmes de 4 mesures.

**Blocked by:** 03.

**Status:** todo

- [ ] Cliquer une mesure la sélectionne ; glisser / maj+clic sélectionne une
      plage contiguë, y compris à cheval sur deux systèmes.
- [ ] La barrette propose Dupliquer à droite, Dupliquer à la fin (masqué si déjà
      en fin), Supprimer.
- [ ] Dupliquer à droite insère juste après ; à la fin ajoute en bout ; les
      mesures restent toutes pleines et valides.
- [ ] Cliquer en dehors de la sélection la désélectionne (la copie faite reste en
      place) ; « Supprimer » est la seule action destructrice.
