# 06 — Finitions + fichier unique

**What to build:** l'expérience complète est peaufinée : en-tête dynamique « Exercice nᵒ N — Leçon » qui reflète la configuration (idée de la variante Cahier), « Nouvelle grille » regénère sans quitter l'écran, micro-états soignés (fin d'exercice, tiroir, transitions). Puis l'app est empaquetée en UN SEUL fichier HTML autonome : bibliothèque de gravure, images des figures et sample audio inlinés (base64/data URI). Ce fichier s'ouvre d'un double-clic, sans réseau, et offre exactement la même expérience que la version dossier.

**Blocked by:** 05 — Son de la note : sample de basse (mode 3).

**Status:** ready-for-agent

- [ ] Le fichier unique fonctionne intégralement (génération, 3 modes, son) avec le réseau coupé, ouvert en double-clic depuis n'importe quel dossier.
- [ ] Aucune requête réseau au chargement (vérifié dans l'onglet Réseau).
- [ ] En-tête « Exercice nᵒ / Leçon » cohérent avec la configuration choisie.
- [ ] La version dossier (développement) et le fichier unique restent générés depuis la même source, avec une commande de build documentée dans le README.
