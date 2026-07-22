# Guide de style — Bass Rhythm Trainer

Conventions de code pour ce projet : **JS / HTML / CSS vanilla, sans framework
ni outil de build**, pensé pour fonctionner 100 % hors-ligne (y compris en
`file://` via le fichier unique `dist/`).

Ce guide énonce les **bonnes pratiques** issues de deux références publiques
(créditées en bas de page), adaptées à un projet vanilla. **Le guide fait
autorité, pas l'existant** : là où le code actuel diverge d'une bonne pratique,
c'est le code qui doit être refactoré (voir « Écarts connus » en fin de
document), pas la règle qu'on assouplit. La seule liberté laissée au projet
concerne les points que les sources présentent explicitement comme un choix
(ex. simple vs double guillemet en JS) : on tranche une fois et on s'y tient.

> Il n'y a **aucun linter/formatter** (pas d'ESLint, pas de Prettier, pas de
> `package.json`). La cohérence est tenue à la main : ce document en est le
> garant. Un `.editorconfig` (indentation 2 espaces, UTF-8, LF, trim des
> espaces de fin) est le bienvenu ; un passage ponctuel de Prettier serait la
> façon la plus sûre d'aligner l'existant sur le formatage cible.

---

## 1. Règles générales (tous fichiers)

- **Indentation : 2 espaces**, jamais de tabulations. Ne jamais mélanger.
- **Encodage UTF-8** sans BOM. Les accents français sont écrits directement
  (pas d'entités HTML), y compris sur les majuscules.
- **Pas d'espaces en fin de ligne**, ni sur les lignes vides. Fin de ligne LF.
- **Aucune dépendance réseau** : polices, samples audio et bibliothèque abcjs
  sont embarqués/vendorés. Ne jamais introduire de CDN, d'import distant ou de
  ressource `http(s)://` externe.
- **Aucune étape de build pour le code métier** : `js/*.js` tourne tel quel
  dans le navigateur *et* sous Node (tests). Le build ne fait qu'assembler le
  fichier unique, il ne transpile rien.
- La **langue** : commentaires et documentation en français ; identifiants
  (fonctions, variables, fichiers, classes CSS) en anglais.

---

## 2. JavaScript

Base : *idiomatic.js* (Rick Waldron).

### Format

- Indentation 2 espaces ; **points-virgules** obligatoires.
- **Guillemets** : double quotes `"…"` (choix du projet ; idiomatic.js laisse
  ce point libre mais impose la cohérence — ne jamais mélanger).
- Espace après les mots-clés de contrôle : `if (…)`, `for (…)`, `while (…)`,
  `} else {`.
- Pas d'espace entre un nom de fonction et sa parenthèse d'appel : `foo(x)`.

### `"use strict"`

- Chaque module active `"use strict";` en tête de sa fonction/factory.

### Modules & architecture

- **Module UMD minimal** : exposition sur `window.<Nom>` dans la page et sur
  `module.exports` sous Node, via une IIFE `(function (root, factory) {…})`.
  Ce n'est pas un choix esthétique mais la contrainte du projet — le même code
  doit tourner sans build dans le navigateur *et* sous Node pour les tests
  `scripts/*.mjs`. À conserver tant que cette contrainte tient.
- **Séparer la logique pure du DOM / Web Audio.** Les fonctions pures
  (génération de grille, horloge, calculs) forment une couche testable sans
  navigateur ; les effets de bord (DOM, audio, `fetch`) sont isolés à part.
  C'est une bonne pratique déjà en place dans `engine.js` — la préserver.

### Nommage

- `camelCase` pour variables et fonctions.
- `PascalCase` pour les constructeurs.
- `SYMBOLIC_CONSTANTS_LIKE_THIS` pour les constantes symboliques.
- Tableaux au pluriel (`notes`, `bars`, `figures`).
- Noms explicites, pas d'abréviations cryptiques.

### Déclarations & logique

- `const` par défaut, `let` si réassignation ; éviter `var`. Déclarer au plus
  près de l'usage, en tête de bloc.
- **Égalité stricte `===` / `!==`** toujours (jamais `==` sauf coercition
  volontaire et commentée).
- Tester la véracité plutôt que comparer : `if (array.length)` /
  `if (!array.length)`.
- Privilégier les **retours anticipés** pour aplatir les conditions.
- Initialiser les littéraux : `const items = []`, `const config = {}`.

### Commentaires

- Commentaire **au-dessus** du code concerné, jamais en fin de ligne.
- Les **en-têtes de module** décrivent le contrat (entrées/sorties, invariants)
  en bloc `/* … */`, comme le font `engine.js` et `generator.js` — les tenir à
  jour avec le code.

---

## 3. HTML

Base : *Google HTML/CSS Style Guide*.

- `<!DOCTYPE html>` en tête, `<html lang="fr">`, `<meta charset="utf-8">`.
- **Tout en minuscules** : balises, attributs, valeurs d'attributs.
- **Double quotes** pour les valeurs d'attributs : `class="tempo"`.
- Indentation 2 espaces ; un élément de bloc par ligne.
- HTML **sémantique** : utiliser chaque élément pour ce à quoi il sert.
- **Omettre `type`** sur `<script>` et `<style>` (inutile en HTML5).
- **Préférer les classes aux `id`.** Réserver l'`id` aux vrais points d'ancrage
  (hooks JS, cibles de fragment). Quand un `id` est nécessaire, le nommer en
  **`kebab-case`** (`tempo-num`, pas `tempoNum`).
- Pas de ressource externe : styles et scripts sont locaux ou inline.

---

## 4. CSS

Base : *Google HTML/CSS Style Guide*.

### Structure & nommage

- **Tout en minuscules** (sélecteurs, propriétés, valeurs, hex).
- Classes en **`kebab-case`**, noms **sémantiques** (`.tempo-core`, `.breath`),
  jamais cryptiques ni purement présentationnels.
- **Préférer les classes aux sélecteurs `#id`** pour styler (spécificité
  maîtrisée, réutilisable). Les `id` restent des hooks JS, pas des cibles de
  style.
- **Design tokens** via variables CSS dans `:root` (`--ink`, `--mist-1`,
  `--accent`, `--ease-drift`…). Toute couleur/durée/easing récurrente passe par
  un token, jamais de valeur magique dupliquée. *(Bonne pratique déjà en place,
  à généraliser.)*
- **Un sélecteur par ligne** quand une règle en groupe plusieurs.
- Éviter `!important`.

### Formatage

- **Une déclaration par ligne**, chaque bloc de règle sur plusieurs lignes
  (lisibilité, diffs propres). Pas de règle multi-propriétés condensée sur une
  seule ligne.
- **Espace après les deux-points** : `margin: 0;`, `color: var(--ink);`.
- Point-virgule après **chaque** déclaration, y compris la dernière.
- **Propriétés raccourcies** (shorthand) quand c'est pertinent.
- `0` **sans unité** (`margin: 0`, pas `0px`).
- **Zéros initiaux présents** : `0.62`, `0.05s` (pas `.62` / `.05s`).
- Hex **en minuscules**, notation courte quand possible (`#dbe4e1`, `#ebc`).
- **Simple quote** en CSS pour les valeurs et sélecteurs d'attributs, sauf
  `url()` (reco Google).
- Commentaires de section pour regrouper thématiquement :
  `/* ---------- atmosphère : brume qui respire ---------- */`.

---

## 5. Écarts connus dans le code actuel (à refactorer)

Le code existant précède ce guide et diverge sur les points ci-dessous. Le
guide est la cible ; ces écarts sont à résorber (idéalement en une passe, un
formatter type Prettier étant le moyen le plus sûr). Aucun n'est urgent, mais
tout **nouveau** code suit d'emblée le guide.

- **CSS — règles condensées** : de nombreuses règles multi-propriétés sont
  écrites sur une seule ligne → passer à une déclaration par ligne, espace
  après `:`.
- **CSS — zéros initiaux omis** : `.62`, `.05s`, `.34` → `0.62`, `0.05s`,
  `0.34`.
- **CSS — guillemets doubles** : `"Karla"` → `'Karla'` (simple quote).
- **CSS / HTML — styles sur `#id`** : sélecteurs `#tempoNum`, `#settingsBtn`
  utilisés pour styler → migrer vers des classes.
- **HTML — `id` en camelCase** : `#tempoNum`, `#settingsBtn` → `kebab-case`.
  ⚠️ Ces `id` sont des hooks JS : tout renommage doit être fait de concert dans
  le JS (`getElementById`, sélecteurs) — refactor couplé, à faire d'un bloc.

---

## Sources

Ce guide adapte, pour un projet vanilla sans outillage, deux références
publiques — consulter l'original en cas de doute sur un point non couvert ici :

- **JavaScript** — *Principles of Writing Consistent, Idiomatic JavaScript*,
  Rick Waldron & contributeurs : <https://github.com/rwaldron/idiomatic.js>
- **HTML / CSS** — *Google HTML/CSS Style Guide* :
  <https://google.github.io/styleguide/htmlcssguide.html>
