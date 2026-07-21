# Bass Rhythm Trainer

Application HTML d'entraînement à la lecture rythmique pour bassiste débutant,
inspirée du *Solfège Rythmique Vol. 1* de Dante Agostini (mesures simples,
progression ronde → triple croche avec silences, puis pointées/liaisons/syncopes).

Rythme pur sur une note fixe (Ré, corde à vide, clé de Fa) : seule la durée compte.
Design « Apnée » : brume qui respire, hairlines, Cormorant Garamond + Karla.

## Utilisation

Deux façons de lancer l'application, strictement équivalentes :

- **Fichier unique** : double-cliquer `dist/bass-rhythm-trainer.html`.
  Tout est embarqué (partition, fontes, figures, sample de basse) — aucune
  connexion réseau, fonctionne en `file://` depuis n'importe quel dossier.
- **Version dossier** (développement) : servir la racine du projet en HTTP
  local puis ouvrir `index.html` :

  ```sh
  python3 -m http.server 8000
  # puis http://localhost:8000/
  ```

  Le HTTP local est nécessaire : le sample audio est chargé par `fetch`,
  bloqué en `file://`.

Dans l'application : figures à cocher, niveau 1–3, signature, nombre de
mesures ; tempo 40–200 BPM ajustable en vol ; décompte d'une mesure ; trois
modes de guidage (métronome seul, + guide visuel, + son) ; Rejouer et
Nouvelle grille sans quitter l'écran.

## Build du fichier unique

```sh
node scripts/build-single-file.mjs
```

Le script lit `index.html` (source unique, aucune logique dupliquée) et
produit `dist/bass-rhythm-trainer.html` en inlinant fontes (data URI),
figures (data URI), scripts (abcjs, générateur, moteur) et sample basse D2
(constante JS base64 `window.BRT_EMBEDDED_SAMPLE`, consommée avant tout
`fetch`). Il vérifie lui-même son résultat — aucune référence externe
restante, syntaxe de chaque bloc de script (`node --check`), unique `fetch`
résiduel bien court-circuité au chargement — et sort en erreur sinon.

## Structure du projet

```text
index.html                 # l'application complète : HTML, CSS Apnée, script applicatif
js/generator.js            # générateur de grilles (calibrage Agostini vol. 1), pur, testable sous Node
js/engine.js               # moteur de lecture Web Audio : métronome, transport, son des notes
vendor/abcjs-basic-min.js  # gravure de la partition (abcjs 6.6.4)
assets/fonts/              # Cormorant Garamond & Karla (woff2 + fonts.css)
assets/figures/            # glyphes des figures rythmiques (PNG)
assets/audio/              # samples de basse (D2 utilisé ; set chromatique E1–D#2 disponible)
docs/                      # progression Agostini reconstituée, provenance du sample
scripts/                   # build du fichier unique + harnais de test
dist/                      # fichier unique généré par le build
```

## Tests

Quatre harnais Node, sans dépendance ni navigateur (code de sortie non nul
en cas d'échec) :

```sh
node scripts/test-generator.mjs   # grilles : sommes de mesures, figures cochées, niveaux, variété
node scripts/test-engine.mjs      # transport : battements exacts, tempo en vol, décompte, signatures
node scripts/test-guidage.mjs     # allumage des notes : durées, liaisons, frontières, cas dégradés
node scripts/test-son.mjs         # son des notes : une attaque par note, liaisons cumulées, coupes
```

## Décisions validées

- Configuration : figures à cocher, niveau 1–3 (notes seules → + silences →
  + pointées/liaisons/syncopes), signature (2/4, 3/4, 4/4, 2/2, 3/2, 4/2),
  4/8/16 mesures.
- Exercice : tempo 40–200 BPM (défaut 60), décompte d'une mesure, métronome
  accentué, +5 BPM, Rejouer, Nouvelle grille ; en-tête « Exercice nᵒ / leçon »
  suivant la configuration.
- Ludique sans scoring ; un seul fichier HTML autonome généré depuis la même
  source que la version dossier.
- Parké v2 : mesures composées (6/8…), streaks, détection micro.

## Crédits et licences

- **abcjs** v6.6.4, Paul Rosen et Gregory Dyke — licence **MIT**
  (<https://abcjs.net>). Le commentaire de licence est conservé dans le
  fichier unique.
- **Sample de basse** : « Finger Bass YR » par Andrea Biasior, projet
  **FreePats** — **CC0 1.0** (dédicace au domaine public, aucune attribution
  requise ; mentionnée par courtoisie). Détails : `docs/audio-sample-source.md`.
- **Figures rythmiques** (PNG du tiroir de réglages) : images issues de
  **Wikimedia Commons**, domaine public.
- **Fontes** : Cormorant Garamond et Karla — **SIL Open Font License 1.1**
  (embarquées en woff2, inlinées dans le fichier unique).

L'application ne reproduit aucun contenu du *Solfège Rythmique* ;
`docs/agostini-progression.md` ne reconstitue que l'ordre d'introduction des
notions, à partir de sources publiques.
