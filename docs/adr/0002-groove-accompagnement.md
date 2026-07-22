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
