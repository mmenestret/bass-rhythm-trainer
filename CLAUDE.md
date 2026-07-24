# CLAUDE.md — Bass Rhythm Trainer

Instructions de projet pour les agents (Claude Code, Codex via `AGENTS.md`).
Elles complètent les règles user-level et **priment** en cas de conflit local.

## Style de code

**Suivre `STYLEGUIDE.md`** pour tout JS / HTML / CSS. Invariants durs :

- Vanilla **sans framework ni build** pour le code métier ; **100 % hors-ligne**
  (aucun CDN, import distant ou ressource externe — tout est embarqué/vendoré).
- JS : `"use strict"`, pattern **UMD** (marche en navigateur *et* sous Node),
  **double quotes**, points-virgules, `camelCase`, `===`, logique pure séparée
  du DOM / Web Audio.
- HTML/CSS : minuscules, indentation **2 espaces**, design tokens CSS dans
  `:root`, préférer les classes aux `id`, **une déclaration CSS par ligne**
  (voir le guide).
- **Aucun linter/formatter** : la cohérence est tenue à la main via le guide.
- Le **guide fait autorité, pas l'existant** : le code pré-guide sera refactoré
  vers les bonnes pratiques (voir « Écarts connus » dans `STYLEGUIDE.md`) ; tout
  nouveau code suit le guide d'emblée.

## Doctrine

- Documentation et commentaires **en français** ; identifiants en anglais.
- Ne pas mentionner d'agent IA dans le code, les commentaires ou les commits.

## Agent skills

### Issue tracker

Les issues vivent dans les GitHub Issues de ce repo (`mmenestret/bass-rhythm-trainer`), via la CLI `gh`. Voir `docs/agents/issue-tracker.md`.

### Triage labels

Vocabulaire par défaut : `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. Voir `docs/agents/triage-labels.md`.

### Domain docs

Layout single-context : `CONTEXT.md` + `docs/adr/` à la racine. Voir `docs/agents/domain.md`.
