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
Une grille obtenue par tirage au sort à partir d'une configuration : figures
cochées, procédés cochés, signature, nombre de mesures.

**Procédé** :
Une écriture rythmique qu'on autorise ou non au tirage, indépendamment des
figures : *Silences*, *Points*, *Liaisons*, *Syncopes* (syncopes écrites sans
liaison), *Triolets*. Aucun procédé coché : des notes seules. En mesure
composée, les valeurs pointées d'un ou deux temps sont des figures ordinaires :
*Points* n'y gouverne que les pointées plus fines que le temps.
_Avoid_: niveau, ingrédient, option, difficulté

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

**Signature** :
Le nombre de temps d'une mesure et la valeur de ce temps (4/4, 5/4, 3/2, 6/8…).
Une signature est *simple* (temps divisé en deux) ou *composée* (temps divisé en
trois). En /8, elle est composée quand le numérateur est un multiple de 3 au
moins égal à 6 (6/8, 9/8, 12/8), simple sinon (3/8, 5/8, 7/8 : le temps est la
croche).
_Avoid_: chiffrage, métrique

**Temps** :
L'unité de pulsation fixée par la signature : la noire en /4, la blanche en /2,
la noire pointée en mesure composée. C'est l'unité qui règle la ligature et les
liaisons.
_Avoid_: battue, pulsation (réservé à l'aide de lecture)

**Mesure composée** :
Une signature dont le temps est une valeur pointée divisée en trois (6/8, 9/8,
12/8). C'est le seul sens de « ternaire » dans l'app.
_Avoid_: ternaire (ambigu : se confond avec le swing), mesure ternaire

**Liaison** :
Un arc qui relie une note à la suivante : une seule attaque, durées cumulées.
Une liaison se fait toujours sur un début de temps ; dans un même temps, on écrit
directement la valeur cumulée.
_Avoid_: tenue

**Triolet** :
Un groupe de trois notes égales qui occupe la durée de deux notes de la même
figure, dans une mesure simple (triolet de croches : trois croches dans un
temps ; en /2, triolet de noires). Il commence sur un début de temps et dure
un temps ; un silence peut en occuper une place. Ni en mesure composée ni en
/8.
_Avoid_: ternaire

### Aides de lecture

**Clic** :
La voix par défaut de l'aide de pulsation : un son court par temps, accent sur le
temps 1 ; en mesure composée, s'y ajoutent les croches de la subdivision, jouées
plus faiblement.
_Avoid_: bip

**Groove** :
La voix « accompagnement » de l'aide de pulsation, choisie *à la place* du clic :
un motif de batterie de synthèse sobre (grosse caisse sur les temps impairs,
caisse claire sur les temps pairs, charley sur les temps — sur chaque croche en
mesure composée), mixé sous le rythme lu. Une seule pulsation à la fois — le
groove remplace le clic, il ne s'y ajoute pas.
_Avoid_: accompagnement, backing track, rythmique

**Subdivision** :
Les croches qu'on entend entre les temps d'une mesure composée, au clic comme au
charley du groove. Elle est active par défaut et peut être coupée, pour ne garder
que les temps.
_Avoid_: swing, ternaire

**Volume de pulsation** :
Le niveau sonore de la voix de pulsation active (clic ou groove), réglable au-delà
du niveau par défaut pour passer par-dessus un instrument amplifié. Chaque voix
garde son propre volume.
_Avoid_: volume du métronome

**Volume de la note** :
Le niveau sonore des notes jouées par l'aide *Son*, du silence au triple du
niveau par défaut, le même pour toutes les basses. Réglable en cours de lecture,
à côté du volume de pulsation ; l'app ne le change jamais d'elle-même.
_Avoid_: volume de la basse, volume de l'instrument

**Préférence de lecture** :
Un réglage personnel du lecteur (voix de pulsation, volume de pulsation, volume
de la note, aides activées, subdivision), mémorisé sur l'appareil et jamais
transmis par un lien de partage.

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
_Avoid_: procédé (réservé au tirage), catégorie

**Modificateur** :
Un bloc de la famille *Modificateurs* qui altère l'écriture au curseur dans
Composer : le **point** (allonge la dernière note de moitié), la **liaison**
(relie la dernière note à la suivante, voir *Liaison* ; seul moyen de tenir un son
par-dessus une barre de mesure) ou le **triolet** (ouvre, en début de temps, un
triolet que les trois figures suivantes remplissent).

**Jouer** (action finale du mode Composer) :
Quitter l'atelier et charger la grille composée dans le lecteur. N'engendre aucun
tirage au sort.
_Avoid_: Générer (réservé au tirage au sort d'une grille générée)

**Générer** :
Tirer une grille au sort à partir de la configuration. Ne s'emploie jamais pour
le mode Composer.
