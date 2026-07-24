# Issue tracker : GitHub

Les issues et PRD de ce repo vivent dans les issues GitHub. Utiliser la CLI `gh` pour toutes les opérations.

## Conventions

- **Créer une issue** : `gh issue create --title "..." --body "..."`. Utiliser un heredoc pour les corps multi-lignes.
- **Lire une issue** : `gh issue view <number> --comments`, en filtrant les commentaires avec `jq` et en récupérant aussi les labels.
- **Lister les issues** : `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` avec les filtres `--label` et `--state` appropriés.
- **Commenter une issue** : `gh issue comment <number> --body "..."`
- **Appliquer / retirer des labels** : `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Fermer** : `gh issue close <number> --comment "..."`

Le repo est déduit de `git remote -v` — `gh` le fait automatiquement dans un clone.

## Pull requests comme surface de triage

**PR comme surface de requête : non.** _(Passer à `oui` si ce repo traite les PR externes comme des demandes de fonctionnalité ; `/triage` lit ce flag.)_

Si passé à `oui`, les PR suivent les mêmes labels et états que les issues, via les équivalents `gh pr` :

- **Lire une PR** : `gh pr view <number> --comments` et `gh pr diff <number>` pour le diff.
- **Lister les PR externes à trier** : `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments` puis ne garder que les `authorAssociation` `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR` ou `NONE` (écarter `OWNER`/`MEMBER`/`COLLABORATOR`).
- **Commenter / labelliser / fermer** : `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

GitHub partage un seul espace de numérotation entre issues et PR, donc un `#42` isolé peut désigner l'un ou l'autre — résoudre avec `gh pr view 42` puis, en fallback, `gh issue view 42`.

## Quand un skill dit « publier sur l'issue tracker »

Créer une issue GitHub.

## Quand un skill dit « récupérer le ticket concerné »

Exécuter `gh issue view <number> --comments`.

## Opérations de wayfinding

Utilisées par `/wayfinder`. La **map** est une issue unique avec des issues **enfants** comme tickets.

- **Map** : une issue unique labellisée `wayfinder:map`, portant le corps Notes / Décisions à date / Zones d'ombre. `gh issue create --label wayfinder:map`.
- **Ticket enfant** : une issue liée à la map comme sub-issue GitHub (`gh api` sur l'endpoint sub-issues). Si les sub-issues ne sont pas activées, ajouter l'enfant à une task list dans le corps de la map et mettre `Part of #<map>` en tête du corps de l'enfant. Labels : `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Une fois réclamé, le ticket est assigné au dev qui le porte.
- **Blocage** : les **dépendances d'issue natives** de GitHub — la représentation canonique, visible dans l'UI. Ajouter un lien avec `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, où `<blocker-db-id>` est l'**id numérique en base** du bloqueur (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`, pas le `#number` ni le `node_id`). GitHub rapporte `issue_dependencies_summary.blocked_by` (bloqueurs ouverts uniquement — la porte vivante). Si les dépendances ne sont pas disponibles, fallback sur une ligne `Blocked by: #<n>, #<n>` en tête du corps de l'enfant. Un ticket est débloqué quand tous ses bloqueurs sont fermés.
- **Requête de frontière** : lister les enfants ouverts de la map (`gh issue list --state open`, scopé aux sub-issues / task list de la map), écarter ceux avec un bloqueur ouvert (`issue_dependencies_summary.blocked_by > 0`, ou une issue ouverte dans la ligne `Blocked by`) ou un assigné ; le premier dans l'ordre de la map gagne.
- **Réclamer** : `gh issue edit <n> --add-assignee @me` — la première écriture de la session.
- **Résoudre** : `gh issue comment <n> --body "<réponse>"`, puis `gh issue close <n>`, puis ajouter un pointeur de contexte (gist + lien) aux Décisions à date de la map.
