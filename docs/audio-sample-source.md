# Source des samples audio

Trois sons échantillonnés (+ un synthé Web Audio sans ressource). Tous les
samples sont sous **Creative Commons CC0 1.0** (dédicace au domaine public),
licence confirmée sur chaque dépôt source. Aucune attribution requise ;
mentions de courtoisie possibles ci-dessous.

Contrainte de sélection : chaque son doit pouvoir **tenir une ronde**
(4 s à 60 BPM, 6 s à 40 BPM), naturellement ou par boucle de sustain.

## Basse growl — `growl-Db1.m4a`

- **Jeu** : « Growlybass » de Karoryfer Samples — Squier Jazz Bass attaquée
  fort, cordes qui claquent contre les frettes, DI brut.
- **Dépôt** : <https://github.com/sfzinstruments/karoryfer.growlybass>
  (licence CC0 dans `LICENSE`), fichier `sustain/db2_f_rr1.wav`.
- **Hauteur** : le nommage source (`db2`, `pitch_keycenter=37` dans le sfz)
  est décalé d'une octave vs la hauteur sonnante — même décalage que
  constaté sur l'Ergo. Hauteur réelle **vérifiée par autocorrélation et
  spectre** (série harmonique espacée de ~34,6 Hz) : **C#1, MIDI 25**
  (juste à ±10 cents). Fichier renommé `growl-Db1.m4a` en conséquence ;
  avec l'ancien MIDI 37, tout sonnait une octave sous les autres sons.
- **Sustain** : 6,0 s sans boucle — la ronde passe sur toute la plage de
  tempo (à 40 BPM, dernier souffle en fondu naturel).
- **Conversion** : normalisation du pic à −1 dBFS, fade-out anti-clic 80 ms,
  mono 44,1 kHz, AAC 96 kbit/s (ffmpeg).

## Basse Ergo — `ergo-*.wav`

- **Jeu** : « Ergo » de Karoryfer Samples — contrebasse électrique (electric
  upright bass), articulation pizz.
- **Dépôt** : <https://github.com/sfzinstruments/karoryfer.ergo> (licence
  CC0-1.0), dossier `ergo/pizz/`, une prise par note retenue à l'audition.
- **Hauteurs** : le nommage source est décalé vs la hauteur sonnante — les
  fichiers ont été renommés à la hauteur réelle, **vérifiée par
  autocorrélation** (médiane sur fenêtres de 0,5 s couvrant le corps de la
  note) : `ergo-C1`=23,98, `ergo-Eb1`=27,03, `ergo-Gb1`=**30,06**,
  `ergo-A1`=**33,08**, `ergo-C2`=36,00. Les deux prises hautes de 6 et
  8 cents portent leur valeur mesurée dans le registre `SOUNDS` (les trois
  autres restent à l'entier, écart ≤ 3 cents) : F, G et A sonnent juste.
- **Sustain** : décroissance naturelle 3,5–6,2 s, sans boucle — la ronde aux
  tempos lents (6 s à 40 BPM) s'éteint en fondu, limite assumée au choix du
  son.
- **Conversion** : float32 → 16 bits PCM mono 44,1 kHz, pic normalisé à
  −1 dBFS, fondu de fin 30 ms anti-clic.

## Contrebasse à l'archet — `arco-*.wav`

- **Jeu** : « Meatbass » de Karoryfer Samples — contrebasse Otto Rubner 1958
  à l'archet, samples bouclés.
- **Dépôt** : <https://github.com/sfzinstruments/karoryfer.meatbass>
  (licence CC0), dossier `Samples/arco_looped/`, fichiers `<note>_vl2_down.wav`.
- **Hauteurs** : nommage scientifique vérifié dans
  `Programs/arco_looped_basic_map.sfz` — `eb1`=27, `gb1`=30, `a1`=33,
  `c2`=36, `eb2`=39 (5 fichiers livrés : `arco-Eb1/Gb1/A1/C2/Eb2.wav`).
  Hauteur sonnante mesurée par autocorrélation : `gb1/a1/c2/eb2` justes
  (±3 cents), mais la prise `eb1` est **23 cents basse** (MIDI mesuré
  26,77, stable sur toute la durée) — registre `SOUNDS` à 26,77 pour que
  le E (transposé depuis ce sample) tombe juste sur 41,2 Hz.
- **Sustain** : **tenue infinie** — points de boucle lus dans le chunk `smpl`
  de chaque WAV source et recopiés dans le registre `SOUNDS` d'index.html
  (`loopStart`/`loopEnd` en secondes ; la lecture boucle sur cette fenêtre).
- **Conversion** : 24 bits → 16 bits, pic normalisé à −1 dBFS, indices de
  frames inchangés (les points de boucle restent exacts à l'échantillon près).
  WAV conservé (l'AAC décalerait les points de boucle — priming du codec).

## Transposition à la note d'entraînement

L'app propose 7 notes (E1 à D2 sonnant, écrit une octave au-dessus en clé de
fa). La voix prend le sample du son le plus proche de la cible et le
transpose par `playbackRate = 2^(Δ demi-tons/12)` — au plus ±1 demi-ton pour
l'archet, ±2 pour l'Ergo. Le `midi` du registre est la hauteur sonnante
MESURÉE de chaque fichier (pas le nommage source) : chaque note tombe ainsi
sur sa hauteur cible — E sur le E1 d'une basse (41,2 Hz) — vérifié à
±7 cents près sur les 7 notes × 4 sons (médiane multi-fenêtres, boucle de
sustain pour l'archet ; le growl, à −6 cents constants, fluctue lui-même de
±15 cents sur sa durée). Le growl n'a qu'un sample (C#1) : de +3 demi-tons (E1) à +13 (D2)
vers l'aigu — timbre plus brillant et tenue raccourcie en montant (6 s
source → ~5 s en E1, ~2,8 s en D2), assumés. Sample indisponible → repli
synthé à la hauteur choisie.

## Mentions de courtoisie

- « Growlybass », « Meatbass » et « Ergo » par Karoryfer Samples
  (karoryfer.com), CC0.

## Historique

Sons retirés — les mécaniques de boucle (`loopStart`/`loopEnd` dans le
registre `SOUNDS`, secondes de buffer) restent supportées par le moteur.
La contrebasse à l'archet (Meatbass) et la basse Ergo, écartées un temps,
ont été réintégrées après audition comparative (juillet 2026).

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
