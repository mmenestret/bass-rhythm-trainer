# 04 — Modificateurs : point et liaison

**What to build:** la famille **Modificateurs** de la palette, avec deux blocs qui
altèrent la dernière note posée (cf. `CONTEXT.md` → Modificateur).

- **Point** : allonge la **dernière note** de moitié (noire pointée = 1,5 temps).
  Le bloc est **grisé** si le demi-temps supplémentaire ne rentre pas dans la
  place restante (même logique que les figures). S'applique aux notes seulement
  (pas de silence pointé).
- **Liaison** : marque la **dernière note** « liée à la suivante » ; la prochaine
  figure posée lui est liée (une seule attaque, durées cumulées). Tant qu'une
  liaison est en attente, les **silences sont grisés** (on ne lie pas vers un
  silence) ; **re-cliquer sur liaison annule**. La liaison fonctionne **à cheval
  sur la barre** de mesure (seul moyen de tenir un son par-dessus la barre) et
  une liaison laissée en fin de morceau est ignorée à « Jouer ».

**Blocked by:** 03.

**Status:** todo

- [ ] Point applique ×1,5 à la dernière note ; grisé s'il ne rentre pas ; jamais
      sur un silence.
- [ ] Liaison relie la dernière note à la suivante ; silences grisés pendant
      l'attente ; re-clic annule.
- [ ] Une liaison à cheval sur la barre est gravée et jouée comme une seule
      tenue ; une liaison pendante en fin de grille est neutralisée.
- [ ] Point et liaison se gravent correctement (abcjs) et se jouent correctement
      (une attaque, durée cumulée) une fois la grille chargée.
