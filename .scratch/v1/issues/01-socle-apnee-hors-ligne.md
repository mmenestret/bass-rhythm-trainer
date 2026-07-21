# 01 — Socle Apnée hors-ligne

**What to build:** l'app réelle démarre sur le design retenu (variante « Apnée » du prototype) : portée énorme centrée sur atmosphère brumeuse, tempo géant, un bouton play, toute la configuration dans le tiroir latéral. La page s'ouvre sans aucune connexion réseau : bibliothèque de gravure servie en local, figures rythmiques affichées via les images PNG (domaine public) au lieu des glyphes Unicode. Une partition de démonstration s'affiche au chargement. Le tiroir s'ouvre et se ferme, tous les contrôles de configuration sont présents (figures, niveau 1–3, signature, nombre de mesures, Générer).

**Blocked by:** None — can start immediately.

**Status:** done

- [x] La page s'ouvre et s'affiche complètement avec le réseau coupé (aucune requête CDN) — toutes les références sont locales (abcjs vendorisé, fontes woff2 locales, figures PNG), sous-ressources vérifiées en 200.
- [x] Le design Apnée est en place : portée centrée, tempo géant, tiroir de configuration fonctionnel.
- [x] Les 7 figures rythmiques sont représentées par les images PNG, lisiblement.
- [x] Une partition de démonstration (clé de Fa, Ré fixe) est rendue au chargement.
