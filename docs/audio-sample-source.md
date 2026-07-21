# Source des samples audio

Un son échantillonné (+ un synthé Web Audio sans ressource). Tous les
samples sont sous **Creative Commons CC0 1.0** (dédicace au domaine public),
licence confirmée sur chaque dépôt source. Aucune attribution requise ;
mentions de courtoisie possibles ci-dessous.

Contrainte de sélection : chaque son doit pouvoir **tenir une ronde**
(4 s à 60 BPM, 6 s à 40 BPM), naturellement ou par boucle de sustain.

## Basse growl — `growl-Db2.m4a`

- **Jeu** : « Growlybass » de Karoryfer Samples — Squier Jazz Bass attaquée
  fort, cordes qui claquent contre les frettes, DI brut.
- **Dépôt** : <https://github.com/sfzinstruments/karoryfer.growlybass>
  (licence CC0 dans `LICENSE`), fichier `sustain/db2_f_rr1.wav`.
- **Hauteur** : nommage scientifique — `db2` = MIDI 37 (C#2, ~69,3 Hz),
  vérifié dans `growlybass_clean.sfz` (`pitch_keycenter=37`).
- **Sustain** : 6,0 s sans boucle — la ronde passe sur toute la plage de
  tempo (à 40 BPM, dernier souffle en fondu naturel).
- **Conversion** : normalisation du pic à −1 dBFS, fade-out anti-clic 80 ms,
  mono 44,1 kHz, AAC 96 kbit/s (ffmpeg).

## Transposition à la note d'entraînement

L'app propose 7 notes (E1 à D2 sonnant, écrit une octave au-dessus en clé de
fa). La voix prend le sample du son le plus proche de la cible et le
transpose par `playbackRate = 2^(Δ demi-tons/12)`. Le growl n'a qu'un sample
(C#2) : jusqu'à −9 demi-tons vers E1, timbre plus sombre et attaque plus
molle assumés. Sample indisponible → repli synthé à la hauteur choisie.

## Mentions de courtoisie

- « Growlybass » par Karoryfer Samples (karoryfer.com), CC0.

## Historique

Sons retirés — les mécaniques de boucle (`loopStart`/`loopEnd` dans le
registre `SOUNDS`, secondes de buffer) restent supportées par le moteur.

### Contrebasse à l'archet « Meatbass » (retirée juillet 2026, goût)

« Meatbass » de Karoryfer Samples — contrebasse Otto Rubner 1958 à l'archet.
Dépôt <https://github.com/sfzinstruments/karoryfer.meatbass> (CC0), dossier
`Samples/arco_looped/`, fichiers `<note>_vl2_down.wav`, hauteurs vérifiées
dans `Programs/arco_looped_basic_map.sfz` (`eb1`=27, `gb1`=30, `a1`=33,
`c2`=36, `eb2`=39). Conversion : 24→16 bits, pic à −1 dBFS, indices de frames
inchangés, WAV conservé (l'AAC décalerait les boucles — priming du codec).
Points de boucle (chunk `smpl`, en secondes, mesurés hors ligne) :

| Fichier | midi | loopStart | loopEnd |
|---|---|---|---|
| arco-Eb1.wav | 27 | 1.393991 | 6.561859 |
| arco-Gb1.wav | 30 | 0.974195 | 4.651610 |
| arco-A1.wav | 33 | 0.833696 | 3.633152 |
| arco-C2.wav | 36 | 1.087166 | 4.071746 |
| arco-Eb2.wav | 39 | 1.578163 | 4.296122 |

### Synthé FM « Lately Bass » (retiré juillet 2026, goût)

« Lately Bass » du projet FreePats (recréation Dexed du preset TX81Z), dépôt
<https://github.com/freepats/lately-bass> (CC0), fichiers `samples/F#1.wav`
(midi 30) et `samples/C2.wav` (midi 36). Boucle calculée hors ligne (fenêtre
~0,3 s alignée sur un nombre entier de périodes, corrélation 0,9997,
amplitude aplatie exponentiellement, fichier tronqué après la boucle) par un
script Node ponctuel (parse RIFF/smpl, corrélation en deux passes,
réécriture WAV 16 bits). Points retenus : fm-Gb1 (midi 30) 1.9→2.202154 ;
fm-C2 (midi 36) 1.8→2.105238.

### Basse au doigt « Finger Bass YR » (retirée, sustain insuffisant)

FreePats, basse Yamaha RBX au doigt, `bass-*.m4a`/`bass-D2.wav` : sustain
~2,5 s insuffisant pour tenir une ronde, timbre jugé décevant à l'usage.
Récupérable sur <https://github.com/freepats/electric-bass-YR> si besoin.
