# Bass Rhythm Trainer

Entraîneur de lecture rythmique pour bassiste : une note fixe, seule la durée
compte. Ce glossaire fixe le vocabulaire partagé du domaine (langage
ubiquitaire). Il ne contient aucun détail d'implémentation.

## Language

### Contenu rythmique

**Grille** :
L'exercice rythmique que l'utilisateur lit et joue : une suite de mesures sur
une note fixe. Une grille est soit *générée*, soit *composée* (voir plus bas) —
c'est le même objet dans les deux cas.
_Avoid_: partition, portée (au sens de « le morceau »)

**Grille générée** :
Une grille obtenue par tirage au sort à partir d'une configuration.

**Grille composée** :
Une grille construite à la main par l'utilisateur dans le mode Composer, figure
par figure. Même artefact qu'une grille générée, autre provenance.

**Figure** :
Une valeur rythmique de note : ronde, blanche, noire, croche, double, triple ou
quadruple croche.

**Silence** :
Une valeur rythmique de repos (soupir, demi-soupir…), de durée équivalente à une
figure.

**Note d'entraînement** :
L'unique hauteur (E à D, clé de Fa) sur laquelle toute la grille est jouée. Elle
est réglée globalement ; seul le rythme varie d'une note à l'autre.

**Mesure** :
Un segment de la grille dont la durée vaut exactement la signature. Toute mesure
d'une grille valide est pleine.

### Le mode Composer

**Composer** :
Le mode où l'utilisateur construit une grille à la main au lieu de la tirer au
sort. Produit une *grille composée*.
_Avoid_: mode expert

**Curseur** :
Le point d'insertion dans le mode Composer. Chaque figure posée s'ajoute au
curseur, qui avance ; quand la mesure courante est pleine, il passe à la mesure
suivante.

**Famille** :
Un regroupement de blocs de la palette de Composer : *Notes*, *Silences* ou
*Modificateurs*. Chaque famille s'affiche ou se masque indépendamment pour
épurer la palette. C'est un filtre d'affichage, sans effet sur la validité.
_Avoid_: niveau (réservé à l'échelle de génération), catégorie

**Modificateur** :
Un bloc de la famille *Modificateurs* qui altère une figure déjà posée dans
Composer : le **point** (allonge la dernière note de moitié) ou la **liaison**
(relie la dernière note à la suivante — une seule attaque, durées cumulées, seul
moyen de tenir un son par-dessus une barre de mesure).

**Jouer** (action finale du mode Composer) :
Quitter l'atelier et charger la grille composée dans le lecteur. N'engendre aucun
tirage au sort.
_Avoid_: Générer (réservé au tirage au sort d'une grille générée)

**Générer** :
Tirer une grille au sort à partir de la configuration. Ne s'emploie jamais pour
le mode Composer.
