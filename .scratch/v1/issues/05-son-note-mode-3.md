# 05 — Son de la note : sample de basse (mode 3)

**What to build:** en mode 3, en plus du mode 2, la page joue chaque note avec le vrai sample de basse électrique (Ré grave D2, CC0, livré dans les assets audio) : attaque au moment exact de la note, enveloppe coupée à la fin de la valeur notée — ce qu'on entend correspond à ce qui s'allume. Les silences sont muets. Le sample est décodé une fois au chargement (Web Audio), pas de latence à la lecture. Si le sample est indisponible, repli automatique sur une note de synthèse.

**Blocked by:** 04 — Guidage visuel : durée de la note (mode 2).

**Status:** ready-for-agent

- [ ] Le son démarre à l'attaque de chaque note, synchronisé avec l'allumage visuel et le métronome.
- [ ] La durée sonore suit la durée notée (une ronde sonne 4 temps, une croche un demi-temps), avec une fin de note propre (pas de clic).
- [ ] Mode 3 = mode 2 + son ; couper vers mode 2 ou 1 en cours de lecture arrête le son des notes sans arrêter la lecture.
- [ ] Repli synthé fonctionnel si le sample ne charge pas.
