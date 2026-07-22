# Partage d'une grille composée : encodage du contenu, pas une graine

Une grille *générée* se partage via une **graine + config** compacte dans le hash
d'URL (`encodeShare`/`decodeShare` de `js/generator.js`), parce qu'elle est
entièrement déterminée par un PRNG : rejouer la graine reproduit la grille. Une
grille *composée* est du **contenu arbitraire** qu'aucune graine ne peut
représenter. On décide donc d'ajouter un **second format d'URL** qui sérialise la
suite complète des événements (signature + note d'entraînement + figures /
silences / liaisons / points), coexistant avec le format graine — le lecteur
détecte lequel des deux il lit.

## Considered Options

- **Grille composée éphémère (pas de partage).** La plus simple, mais rejetée :
  « toute grille est un lien » est une promesse centrale de l'app, et « partager
  une grille que j'ai faite pour mon élève » est un cas d'usage voulu.
- **Sauvegarde locale (localStorage).** Introduit un état persistant à
  contre-courant du fichier unique sans état ; parkée.

## Consequences

- Deux codecs d'URL coexistent : celui de la graine (court) et celui du contenu
  (plus long, ~130 caractères pour 16 mesures, acceptable). Le décodage doit
  distinguer les deux et valider le contenu (rejet silencieux si invalide).
- Le format contenu devient une **surface de compatibilité** : les liens
  partagés doivent rester lisibles par les versions futures (évolutions
  additives, versionnées si besoin).
