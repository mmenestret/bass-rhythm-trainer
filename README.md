# Rhythm Trainer

Application HTML d'entraînement à la lecture rythmique pour bassiste débutant,
inspirée du *Solfège Rythmique Vol. 1* de Dante Agostini (progression ronde →
triple croche avec silences, puis pointées/liaisons/syncopes et triolets), en
mesures simples comme en mesures composées (6/8, 9/8, 12/8).

Rythme pur sur une note fixe au choix (E à D grave, clé de Fa) : seule la
durée compte. Design « Apnée » : brume qui respire, hairlines, Cormorant
Garamond + Karla.

## Utilisation

Deux façons de lancer l'application, strictement équivalentes :

- **Fichier unique** : double-cliquer `dist/bass-rhythm-trainer.html` pour le
  français ou `dist/bass-rhythm-trainer-en.html` pour l'anglais. Tout est
  embarqué (partition, fontes, figures, samples) — aucune connexion réseau,
  fonctionne en `file://` depuis n'importe quel dossier.
- **Version dossier** (développement) : servir la racine du projet en HTTP
  local puis ouvrir `index.html` :

  ```sh
  python3 -m http.server 8000
  # puis http://localhost:8000/
  ```

  Le HTTP local est nécessaire : les samples audio sont chargés par `fetch`,
  bloqué en `file://` (symptôme : tous les sons retombent sur le même synthé).
  Ajouter `?lang=en` à l'URL affiche l'interface anglaise. Le paramètre de
  langue cohabite avec le fragment qui encode l'exercice partagé.

Dans l'application : tempo 40–200 BPM (40–120 en mesure composée, où il compte
la noire pointée) saisissable au clavier, aux boutons ±5, à la molette ou au
glisser vertical, avec l'unité du tempo affichée quand le temps n'est pas une
noire ; décompte d'une mesure ; trois aides
de lecture indépendantes (métronome, guide visuel, son) débrayables en vol ;
dans le même panneau, un curseur de **volume de pulsation** règle la voix
active (clic ou groove), du silence au triple de son niveau, en vol, sous un limiteur
qui évite toute saturation ; chaque voix garde son volume et le décompte prend
celui de la voix choisie ; en mesure composée, une bascule **Subdiviser**
(active par défaut) fait entendre ou coupe les croches entre les temps, au
clic comme au charley du groove ; ces **préférences de lecture** (voix,
volumes, aides, subdivision) sont mémorisées sur l'appareil et restaurées à
l'ouverture ;
bouclage de l'exercice (repeat, sans nouveau décompte) ; sur écran étroit,
partition en 2 mesures par système gravées pleine largeur (une seule pour une
mesure longue : 5/4, 7/4, 12/8…), avec fenêtre de
lecture de 3 systèmes qui garde la mesure jouée au centre ; mesures ∞ :
grille générée en continu pendant la lecture (fenêtre de rendu glissante) ;
bouton **copier le lien** (à côté du repeat/∞) : l'URL encode la grille
affichée — graine et réglages — et la rejoue à l'identique chez qui l'ouvre
(l'appli la restaure au chargement) ; réglages : son (basse growl, synthé,
basse Ergo, contrebasse à l'archet — avec préécoute), note d'entraînement
(E à D), procédés (Silences, Points, Liaisons, Syncopes, Triolets), figures
de notes, signature (2/4 · 3/4 · 4/4 · 6/8, ou
« Autre… » : numérateur de 1 à 12 sur 2, 4 ou 8), nombre de mesures.

**Composer** (bouton dans l'en-tête, à côté de **Jouer** — le panneau de
réglages et de génération) : construire une grille à la main figure par figure
au lieu de la tirer au sort. Tiroir à droite (signature, avec le même choix
qu'au tirage ; en mesure composée, la noire pointée et la blanche pointée
sont dans la palette ; familles Notes /
Silences / Modificateurs, palette, point, liaison et triolet), scène non grisée où la
portée en travail reste centrée et s'écarte depuis le centre au fil du
remplissage ; remplissage strict (chaque mesure vaut exactement la signature) ;
liaison grisée quand la dernière note finit au milieu d'un temps, point refusé
s'il y ferait tomber une liaison posée ; le modificateur **Triolet** ouvre, sur
un début de temps (jamais en mesure composée ni en /8), un groupe de trois
cases gravé en direct que les trois touches suivantes remplissent — croche ou
demi-soupir en /4, noire ou soupir en /2 — puis il se ferme seul ; pendant ce
temps les autres blocs sont grisés, et **Effacer** retire la dernière note du
triolet (ou le referme s'il est vide) ;
duplication de mesures par sélection sur la portée ; **Jouer** charge la grille
composée dans le lecteur comme une grille générée (une grille courte y est
recentrée, à l'allure d'une partition habituelle). Le panneau **Jouer** propose
alors un retour explicite vers une grille générée. Une grille composée se
partage aussi par lien (second format d'URL, contenu complet — cf.
`docs/adr/0001-*`).

## Hébergement

L'application publique vit sur <https://rythme.lambdalogic.fr>, servie par
Cloudflare Pages (projet `bass-rhythm-trainer`).

Chaque push sur `main` redéploie le site via `.github/workflows/deploy.yml`.
Le dépôt n'est pas connecté à Cloudflare par l'intégration git : le workflow
publie en *Direct Upload* avec `wrangler`, à partir de deux secrets de dépôt,
`CLOUDFLARE_API_TOKEN` (permission `Account · Cloudflare Pages · Edit`) et
`CLOUDFLARE_ACCOUNT_ID`.

Le même déploiement se lance à la main depuis n'importe quel poste disposant
d'un token :

```sh
export CLOUDFLARE_API_TOKEN=...
export CLOUDFLARE_ACCOUNT_ID=...
npx wrangler pages deploy . --project-name bass-rhythm-trainer --branch main
```

Le dépôt est un site statique sans build : c'est la racine qui est publiée
telle quelle. Tous les chemins de ressources d'`index.html` sont relatifs, le
site tourne donc à la racine d'un domaine comme dans un sous-dossier — l'URL
`bass-rhythm-trainer.pages.dev` et chaque URL de déploiement fonctionnent à
l'identique. Le fichier unique reste accessible à `/dist/bass-rhythm-trainer`
— Pages sert les pages sans leur extension et redirige `.html` en 308, la
forme longue marche donc aussi.

Côté DNS, `rythme` est un CNAME proxifié vers `bass-rhythm-trainer.pages.dev`
dans la zone `lambdalogic.fr` ; le certificat est émis par Cloudflare.

Le HTTPS change un détail de comportement : le bouton **copier le lien** passe
par l'API Clipboard native au lieu du repli `execCommand`.

## Build des fichiers uniques

```sh
node scripts/build-single-file.mjs
```

Le script lit `index.html` (source unique, aucune logique dupliquée) et produit
les fichiers autonomes français et anglais. Il inline les fontes (data URI),
les figures (data URI), les scripts (abcjs, signature, générateur, moteur,
i18n, préférences) et tous
les samples audio (table base64 `window.BRT_EMBEDDED_SAMPLES`, consommée avant
tout `fetch`). Il vérifie lui-même son résultat — aucune référence externe
restante, syntaxe de chaque bloc de script (`node --check`), unique `fetch`
résiduel bien court-circuité au chargement — et sort en erreur sinon.

## Structure du projet

```text
index.html                 # l'application complète : HTML, CSS Apnée, script applicatif
js/meter.js                # analyse d'une signature (temps, durée du temps, simple ou composée), source unique
js/generator.js            # générateur de grilles (calibrage Agostini vol. 1), pur, testable sous Node
js/engine.js               # moteur de lecture Web Audio : métronome, transport, voix des notes, préécoute
js/i18n.js                 # dictionnaires FR/EN, détection de langue et traduction de l'interface
js/preferences.js          # préférences de lecture : lecture tolérante et écriture, stockage injecté
vendor/abcjs-basic-min.js  # gravure de la partition (abcjs 6.6.4)
assets/fonts/              # Cormorant Garamond & Karla (woff2 + fonts.css)
assets/figures/            # glyphes des figures rythmiques (PNG)
assets/audio/              # samples de basse (growl, Ergo, arco bouclé) — cf. docs/audio-sample-source.md
docs/                      # progression Agostini reconstituée, provenance des samples
scripts/                   # build du fichier unique + harnais de test
dist/                      # fichiers uniques FR et EN générés par le build
```

## Tests

Dix harnais Node, sans dépendance de test ni navigateur (code de sortie non nul
en cas d'échec) :

```sh
node scripts/test-meter.mjs       # signatures : domaine permis, temps, durée du temps, mesures composées
node scripts/test-generator.mjs   # grilles : toutes signatures, figures et procédés cochés, règle de liaison, triolets, ligature, variété
node scripts/test-engine.mjs      # transport : battements exacts, tempo en vol et ses bornes, décompte, subdivision, groove
node scripts/test-guidage.mjs     # allumage des notes : durées, liaisons, frontières, cas dégradés
node scripts/test-son.mjs         # son des notes : une attaque par note, liaisons cumulées, coupes
node scripts/test-sync.mjs        # synchronisation de bout en bout (mock AudioContext, latence, volume, limiteur, 6/8 à 12/8, triolets)
node scripts/test-share.mjs       # graine + lien partageable : reproductibilité, flux ∞, aller-retour du codec d'URL
node scripts/test-composer.mjs    # grille composée : assemblage, point/liaison/triolet, codec de contenu, invariants
node scripts/test-i18n.mjs        # dictionnaires, marqueurs, ?lang=en et builds autonomes FR/EN
node scripts/test-preferences.mjs # préférences de lecture : défauts, aller-retour, valeurs corrompues, stockage défaillant
```

## Décisions validées

- Configuration : son + note d'entraînement, figures de notes à cocher,
  procédés à cocher indépendamment (Silences, Points, Liaisons, Syncopes
  écrites sans liaison, Triolets), tous décochés par défaut — des notes
  seules. Un procédé inapplicable avec les figures cochées est grisé, avec ce
  qui lui manque (« nécessite la croche ») ou la signature qui l'exclut
  (« pas en mesure composée »). 4/8/16 mesures.
- Triolets : un triolet dure un temps et commence toujours sur un début de
  temps — trois croches en /4, trois noires en /2 —, mêlé aux temps binaires ;
  avec *Silences*, un silence peut en occuper une des trois places. Il exige
  sa figure (la croche en /4, la noire en /2) et n'existe ni en mesure
  composée ni en /8. Gravé « (3 » en ABC ; les durées se comptent en ticks
  entiers (192 par ronde), de sorte que la timeline donne des instants exacts
  au tiers de temps sans changer de contrat. Une liaison qui sort d'un triolet
  part de sa dernière note, sur le temps suivant.
- Signatures : pastilles 2/4 · 3/4 · 4/4 · 6/8, plus « Autre… » qui déplie un
  numérateur (1 à 12) et un dénominateur (2, 4 ou 8), au tirage comme dans
  Composer ; une seule analyse de signature (`js/meter.js`) sert le
  générateur, le moteur et la page. En /8, un numérateur multiple de 3 au
  moins égal à 6 donne une mesure composée (6/8, 9/8, 12/8 : le temps est la
  noire pointée) ; les autres /8 sont des mesures simples à la croche. En
  5/4 ou 7/4, seul le 1 est accentué et le groove garde son motif.
- Mesures composées : catalogue de cellules propre (noire pointée, noire–
  croche, croche–noire, trois croches, doubles…), où la noire pointée et la
  blanche pointée sont des figures ordinaires ; *Points* n'y gouverne que la
  sicilienne, *Syncopes* l'hémiole (trois noires sur deux temps) ; croches
  ligaturées par trois, liaisons sur un début de temps de noire pointée. Le
  clic joue trois niveaux (1, autres temps, croches faibles), le décompte
  aussi ; le groove garde grosse caisse et caisse claire sur les temps et
  joue le charley sur chaque croche ; la bascule Subdiviser coupe ces croches
  (cf. `docs/mesures-composees-pulsation.md`, ADR 0002 amendé).
- Règle de liaison : une liaison se fait toujours sur un début de temps (la
  blanche en x/2), au tirage comme dans Composer ; dans un même temps, on écrit
  la valeur cumulée.
- Exercice : tempo 40–200 BPM (défaut 60) saisissable et ajustable en vol ;
  il compte le temps de la signature (blanche en /2, croche en /8 simple,
  noire pointée en mesure composée), dont l'unité s'affiche quand ce n'est
  pas une noire, et plafonne à 120 en mesure composée. Changer de signature
  garde le nombre affiché, ramené sous le plafond. Décompte d'une mesure
  toujours audible, aides de lecture indépendantes.
- Préférences de lecture : la voix de pulsation, le volume de chaque voix,
  les aides activées et la subdivision sont la seule persistance de l'app, rangée dans
  `localStorage` sous une clé versionnée ; une valeur absente ou invalide
  retombe sur son défaut, et un stockage indisponible (mode privé, quota)
  laisse simplement les réglages valoir pour la session. Elles n'entrent
  jamais dans le lien de partage (ADR 0001 et 0002 amendés).
- Sons : uniquement des sons capables de tenir une ronde (sustain long ou
  boucle) ; préécoute ~1,5 s dans les réglages ; la note choisie transpose
  le sample le plus proche et re-hausse la portée sans changer le rythme.
- Ludique sans scoring ; deux fichiers HTML autonomes, français et anglais,
  générés depuis la même source que la version dossier.
- Partage d'une grille par lien : la génération est seedée (`makeRng`,
  mulberry32 déterministe injectée dans le générateur) ; le hash de l'URL
  encode graine + réglages (dont les procédés), mis à jour en continu et
  restauré au chargement. Une grille composée se partage par son contenu
  (format `c=2`, triolets compris). Un lien ancien devenu invalide est rejeté
  et l'app tire une grille neuve (ADR 0001 amendé).
  Copie robuste (repli `execCommand` là où l'API Clipboard exige https).
  Volontairement dépouillé : pas de scoring, de défi ni de suivi.
- Parké v2 : streaks, détection micro.

## Crédits et licences

- **abcjs** v6.6.4, Paul Rosen et Gregory Dyke — licence **MIT**
  (<https://abcjs.net>). Le commentaire de licence est conservé dans le
  fichier unique.
- **Samples** : « Growlybass », « Meatbass » et « Ergo » par **Karoryfer
  Samples** — tous **CC0 1.0** (dédicace au domaine public, aucune attribution
  requise ; mentionnée par courtoisie).
  Détails et traitement : `docs/audio-sample-source.md`.
- **Figures rythmiques** (PNG du tiroir de réglages) : images issues de
  **Wikimedia Commons**, domaine public.
- **Fontes** : Cormorant Garamond et Karla — **SIL Open Font License 1.1**
  (embarquées en woff2, inlinées dans le fichier unique).

L'application ne reproduit aucun contenu du *Solfège Rythmique* ;
`docs/agostini-progression.md` ne reconstitue que l'ordre d'introduction des
notions, à partir de sources publiques.
