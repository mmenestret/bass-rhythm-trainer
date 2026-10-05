# Groove d'accompagnement : une voix du métronome, pas une aide de plus

L'aide de pulsation gagne une seconde voix — un **groove** de batterie de synthèse
sobre (grosse caisse sur le 1, caisse claire sur 2 & 4, charley sur les temps) —
que l'utilisateur choisit *à la place* du clic dans le tiroir « Jouer ». Le groove
**remplace** le clic (une seule pulsation à la fois), reste **binaire**, **fixe**
de 40 à 200 BPM, et est **synthétisé** (aucun sample embarqué). Défaut inchangé :
clic. Objectif : « lire avec un batteur » sans jamais masquer le rythme lu ni
alourdir le fichier unique.

## Considered Options

- **Une palette de styles (Simple, Jazz, Rock, Funk, Metal).** Explorée par
  recherche documentaire : Funk et Metal sont *définis* par une densité (charley
  en doubles-croches + ghost notes ; double grosse caisse continue) qui masque le
  rythme que l'utilisateur doit lire — en conflit frontal avec la promesse « lire
  son propre rythme ». Rejetée au profit d'un groove sobre unique.
- **Groove = 4ᵉ aide, empilable sur le clic.** Deux sources de pulsation
  simultanées aggravent le masquage et ajoutent une commande en vol. Rejetée : le
  groove est une *voix* du métronome, pas une aide de plus — le panneau d'aides
  reste à trois bascules.
- **Samples de batterie embarqués (comme les basses CC0).** Plus réaliste mais
  alourdit le fichier unique et demande sourcing + licences. Rejetée : un groove
  sobre mixé bas n'a pas besoin de réalisme ; la synthèse reste dans la lignée du
  clic sinus et de l'esthétique « Apnée ».
- **Feel ternaire (mélange binaire/ternaire d'Agostini).** Vraie valeur
  pédagogique, mais un ternaire honnête *réinterprète la grille lue* (notes +
  curseur), pas seulement la batterie — un chantier à part entière. Parké ; le MVP
  reste binaire (le swing purement cosmétique est écarté car il ment à l'oreille).
- **Densité adaptative au tempo.** Écartée : motif fixe, prévisible, sans surprise
  de masquage ; la rareté à tempo lent est assumée (à 40 BPM on travaille la
  lecture, pas le groove).

## Consequences

- Le décompte d'une mesure reste **au clic** même quand le groove est choisi (le
  décompte doit rester limpide) ; le groove entre à la barre 1. La grosse caisse
  sur le 1 porte le downbeat, comme l'accent aigu du clic.
- Le choix clic/groove est une **préférence de lecture locale**, au même titre que
  les bascules d'aides : il n'est **pas encodé dans le lien de partage** (qui ne
  porte que la grille et sa config de génération, cf. ADR 0001). Un lien reçu se
  joue avec les réglages d'aides du lecteur.

## Amendement : mesures composées et volume

- Avec l'arrivée des **mesures composées** (6/8, 9/8, 12/8), le groove n'est plus
  « binaire » : il suit la division de la signature. Grosse caisse et caisse
  claire restent sur les temps (temps impairs, temps pairs, appliqués à la noire
  pointée) ; le charley joue chaque croche, accentué sur les temps, mixé au plus
  bas. Ces croches sont celles de la grille écrite : elles ne mentent pas à
  l'oreille, contrairement au swing, qui reste écarté. Sources et raisonnement :
  `docs/mesures-composees-pulsation.md`.
- La **subdivision** (croches au clic et au charley) se coupe par une bascule
  visible seulement en mesure composée, active par défaut ; le décompte la joue
  aussi. Le tempo y compte la noire pointée et plafonne à 120.
- Le **volume de pulsation** devient réglable par voix (au-delà du niveau par
  défaut, sous un limiteur), depuis le panneau des aides ; le décompte prend le
  volume de la voix choisie. Volume, voix et subdivision sont des préférences de
  lecture mémorisées sur l'appareil, toujours hors du lien de partage.
- Un second curseur, sous celui de la pulsation, règle le **volume de la note**
  (son des notes, toutes basses confondues, du silence au triple). La note n'est
  jamais baissée automatiquement pour laisser passer la pulsation : seul
  l'utilisateur la règle. Chaque curseur est lié à l'icône de son aide
  (métronome, son), comme un volume de lecteur vidéo : aide coupée = curseur à
  zéro, monter le curseur la rallume. Le panneau s'ouvre à gauche du bouton des
  aides (sous la barre de lecture sur téléphone) pour ne jamais recouvrir la
  portée ; ordre des lignes : guide visuel, clic, note.
