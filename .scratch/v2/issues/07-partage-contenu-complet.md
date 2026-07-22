# 07 — Partage à contenu complet d'une grille composée

**What to build:** rendre une grille composée **partageable comme une générée**,
via un lien. Comme une grille composée n'est pas une graine, on ajoute un **second
format d'URL** qui sérialise son contenu complet — signature + note d'entraînement
+ la suite des événements (figures / silences / points / liaisons) — coexistant
avec le format graine existant (`encodeShare`/`decodeShare`). Le décodage détecte
lequel des deux formats il lit, valide le contenu et rejette silencieusement un
lien invalide. Le bouton « copier le lien » fonctionne pour une grille composée ;
ouvrir un tel lien restaure la grille, jouable immédiatement. Décision et
alternatives : voir `docs/adr/0001-partage-grille-composee.md`.

**Blocked by:** 01, 06.

**Status:** todo

- [ ] Encodage/décodage aller-retour d'une grille composée (signature + note +
      événements) : la grille restaurée est identique à l'originale.
- [ ] Le décodeur distingue format graine et format contenu ; un lien invalide
      est rejeté proprement (repli sans plantage).
- [ ] « copier le lien » produit un lien qui rejoue la grille composée ailleurs ;
      URL de longueur raisonnable (≈130 caractères pour 16 mesures).
- [ ] Harnais Node couvrant l'aller-retour et les entrées invalides ; build
      fichier unique vert.
