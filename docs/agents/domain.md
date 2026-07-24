# Documentation de domaine

Comment les skills d'ingénierie doivent consommer la documentation de domaine de ce repo lors de l'exploration du code.

## Avant d'explorer, lire ceci

- **`CONTEXT.md`** à la racine du repo, ou
- **`CONTEXT-MAP.md`** à la racine s'il existe — il pointe vers un `CONTEXT.md` par contexte. Lire ceux pertinents pour le sujet.
- **`docs/adr/`** — lire les ADR qui touchent la zone sur laquelle on va travailler. Dans un repo multi-contexte, vérifier aussi `src/<contexte>/docs/adr/` pour les décisions scopées au contexte.

Si l'un de ces fichiers n'existe pas, **continuer silencieusement**. Ne pas signaler son absence ; ne pas suggérer de le créer d'emblée. Le skill `/domain-modeling` (atteint via `/grill-with-docs` et `/improve-codebase-architecture`) les crée paresseusement quand des termes ou décisions se résolvent réellement.

## Structure de fichiers

Repo single-context (ce repo) :

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-partage-grille-composee.md
│   └── 0002-groove-accompagnement.md
├── js/
├── assets/
└── index.html
```

## Utiliser le vocabulaire du glossaire

Quand une sortie nomme un concept de domaine (titre d'issue, proposition de refactor, hypothèse, nom de test), utiliser le terme tel que défini dans `CONTEXT.md`. Ne pas dériver vers des synonymes que le glossaire évite explicitement.

Si le concept nécessaire n'est pas encore dans le glossaire, c'est un signal — soit on invente un langage que le projet n'utilise pas (à reconsidérer), soit il y a un vrai manque (à noter pour `/domain-modeling`).

## Signaler les conflits avec les ADR

Si une sortie contredit un ADR existant, le signaler explicitement plutôt que de l'écraser silencieusement :

> _Contredit l'ADR-0002 (groove d'accompagnement) — mais mérite d'être rouvert car…_
