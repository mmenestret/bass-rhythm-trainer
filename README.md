# Bass Rhythm Trainer

Page HTML unique d'entraînement à la lecture rythmique pour bassiste débutant,
inspirée du *Solfège Rythmique Vol. 1* de Dante Agostini (mesures simples,
progression ronde → triple croche avec silences, puis pointées/liaisons/syncopes).

Rythme pur sur une note fixe (Ré, corde à vide, clé de Fa) : seule la durée compte.

## Décisions validées

- Configuration : figures à cocher, niveau 1–3 (notes seules → + silences → + pointées/liaisons/syncopes), signature (2/4, 3/4, 4/4, 2/2, 3/2, 4/2), 4/8/16 mesures.
- Exercice : tempo 40–200 BPM (défaut 60), décompte d'une mesure, métronome accentué, démo optionnelle « Écouter la rythmique », curseur + note tenue colorée + pastilles de temps, guidage à 3 positions (Guidé / Curseur seul / À l'aveugle).
- Ludique sans scoring ; +5 BPM, Rejouer, Nouvelle grille.
- Technique : un seul fichier HTML autonome, abcjs embarqué, audio en Web Audio pur (100 % hors-ligne).
- Parké v2 : mesures composées (6/8…), streaks, détection micro.

## Prototype en cours

`prototype/` contient 5 variantes visuelles jetables, switchables via
`?variant=` (voir `prototype/index.html`). Servir en HTTP local puis choisir.
