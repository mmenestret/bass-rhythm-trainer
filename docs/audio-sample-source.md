# Source des samples audio — basse électrique

## Origine

- **Jeu de samples** : « Finger Bass YR » (version 2019-09-30), projet **FreePats**.
- **Instrument** : basse électrique Yamaha RBX, notes isolées jouées **au doigt** (fingered), son clair, sans effet, mono 24 bits / 44,1 kHz (FLAC).
- **Auteur** : samples créés par **Andrea Biasior** (reusenoise@gmail.com), édités par Roberto (zenvoid.org) pour l'intégration FreePats.
- **Page du jeu** : <https://freepats.zenvoid.org/ElectricGuitar/clean-electric-bass.html#BassYR>
- **Dépôt source (fichiers téléchargés)** : <https://github.com/freepats/electric-bass-YR> (branche `main`, dossier `samples/finger/`).

## Licence

**Creative Commons CC0 1.0 Universal (dédicace au domaine public)** — confirmée à trois endroits :

1. `LICENSE.txt` du dépôt (SPDX `CC0-1.0` détecté par GitHub) ;
2. `README.txt` du jeu : « Published under the terms of Creative Commons CC0 public domain dedication » ;
3. Page FreePats du jeu.

Aucune attribution requise. Mention de courtoisie possible : « Samples : Finger Bass YR par Andrea Biasior, projet FreePats, CC0 ».

## Correspondance notes / octaves

Les FLAC source sont nommés par note sans octave ; l'octave vient du mapping SFZ
officiel (`FingerBassYR 20190930.sfz`) : `E.flac` = MIDI 28 (E1) … `D.flac` = MIDI 38
(**D2**) … `D#.flac` = MIDI 39 (D#2). La hauteur de `D.flac` a été vérifiée par
autocorrélation : **73,26 Hz mesurés** pour un D2 théorique à 73,42 Hz (écart ≈ 4 cents).

Convention de nommage locale : les dièses sont notés `s` (`Fs1` = F#1, `Ds2` = D#2).

## Fichiers livrés (`assets/audio/`)

| Fichier | Note | Format | Taille |
|---|---|---|---|
| `bass-D2.wav` | **D2 (note retenue)** | WAV PCM 16 bits mono 44,1 kHz | 227 Ko |
| `bass-D2.m4a` | D2 | AAC-LC 96 kbit/s mono | 33 Ko |
| `bass-E1.m4a` … `bass-Ds2.m4a` | set chromatique E1 → D#2 (12 notes) | AAC-LC 96 kbit/s mono | 33–51 Ko chacun |

## Conversions effectuées (ffmpeg)

Depuis les FLAC 24 bits mono d'origine :

- passage en mono 44,1 kHz (inchangé), 16 bits pour le WAV ;
- troncature à 4 s max (`-t 4` ; le D2 dure 2,57 s, non tronqué ; E1 et D#2 dépassaient 5 s) ;
- fade-out anti-clic de 80 ms en fin de fichier (`areverse,afade=t=in:d=0.08,areverse`) ;
- encodage AAC 96 kbit/s pour les `.m4a`.

Le sustain utile du D2 est d'environ 2,5 s ; pour une ronde à 60 BPM (4 s), prolonger
via l'enveloppe applicative ou boucler la queue du sample.
