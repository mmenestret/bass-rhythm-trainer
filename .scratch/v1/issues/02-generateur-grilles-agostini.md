# 02 — Générateur de grilles Agostini

**What to build:** le bouton « Générer » produit une grille d'exercice aléatoire qui respecte la configuration : figures cochées × niveau (1 = notes seules, 2 = + silences équivalents, 3 = + pointées, liaisons, syncopes) × signature (2/4, 3/4, 4/4, 2/2, 3/2, 4/2) × nombre de mesures (4/8/16). Le tirage est calibré sur la progression du Solfège Rythmique Vol. 1 reconstituée dans le document de recherche du dossier docs : cellules rythmiques idiomatiques par palier (croche–deux doubles, syncopette, noire pointée–croche…), une notion nouvelle à la fois, chaque figure accompagnée de son silence équivalent au niveau 2.

**Blocked by:** 01 — Socle Apnée hors-ligne.

**Status:** done

- [x] Chaque mesure générée somme exactement à la signature choisie (aucune grille invalide sur 100 générations de chaque combinaison).
- [x] Seules les figures cochées apparaissent ; niveau 1 sans silences, niveau 2 avec silences, niveau 3 avec pointées/liaisons/syncopes.
- [x] Les grilles privilégient des cellules rythmiques idiomatiques (lisibles) plutôt que des suites arbitraires, ligatures correctes par temps.
- [x] Deux clics successifs sur « Générer » donnent des grilles différentes.
