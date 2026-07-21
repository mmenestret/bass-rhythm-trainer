# 04 — Guidage visuel : durée de la note (mode 2)

**What to build:** en mode 2, pendant la lecture, chaque note s'allume (prend la couleur d'accent) exactement à son attaque et s'éteint exactement à la fin de sa valeur — on voit quoi jouer et combien de temps le tenir ; les silences ne s'allument pas. Un curseur discret suit la position pour guider l'œil entre les lignes. Le sélecteur des 3 modes de guidage est en place : mode 1 = métronome seul (aucune aide visuelle sur la portée), mode 2 = métronome + durée visuelle. Le passage d'un mode à l'autre est possible même en cours de lecture.

**Blocked by:** 03 — Moteur de lecture + métronome (mode 1).

**Status:** done

- [x] L'allumage/extinction de chaque note correspond à sa durée notée (vérifiable à l'œil sur rondes et blanches à 60 BPM).
- [x] Les silences n'allument rien ; les notes liées restent allumées d'un seul tenant.
- [x] En mode 1, la portée reste vierge de toute aide visuelle ; les pastilles du métronome restent actives dans tous les modes.
- [x] Changement de mode en cours de lecture sans arrêt ni désynchronisation.
