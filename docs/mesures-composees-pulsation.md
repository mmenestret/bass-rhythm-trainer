# Mesures composées : tempo, clic et groove

Recherche documentaire préalable à l'ajout des mesures composées (6/8, 9/8,
12/8 ; le temps est la noire pointée, divisée en trois croches). Elle tranche
deux questions : **A**, ce que compte le BPM et ce que joue le clic ; **B**, le
motif de batterie sobre de référence. Public visé : des élèves bassistes,
débutants compris. Vocabulaire : voir `CONTEXT.md` ; contraintes du groove :
voir `docs/adr/0002-groove-accompagnement.md`.

## Statut des informations

Chaque affirmation est marquée :

- **[S]** = sourcée (manuel ou page officielle d'un fabricant ou d'un éditeur,
  code source publié, programme officiel, article scientifique) ;
- **[S-]** = sourcée de seconde main (pédagogue indépendant, forum, base
  communautaire), retenue faute de mieux et signalée comme telle ;
- **[R]** = raisonnée (déduction à partir des sources ou des contraintes du
  projet, non vérifiée par une source).

Sources consultées le 2 octobre 2026. Outils : recherche et lecture Exa pour
toutes les requêtes, sans bascule vers Firecrawl ni vers la recherche native.
Le code source de MuseScore et de Groove Scribe a été lu directement sur GitHub
(API `gh`) ; les PDF de Hudson Music, Vic Firth et Drumgenius ont été
téléchargés puis extraits en texte. Deux sources n'ont pas pu être lues en
première main : *Behind Bars* (Google Books refuse l'extraction) et la méthode
Agostini, vol. 2 (non accessible en ligne).

---

## Question A : tempo et clic en mesure composée

### A.1 Ce que compte le BPM

1. **Notation : le tempo se donne sur le temps ressenti, donc sur la noire
   pointée en 6/8, 9/8 et 12/8 [S].** Le guide de notation du département de
   composition de l'université d'Indiana, qui s'appuie sur Gould, demande
   d'exprimer le tempo « dans la durée qui sera battue ou ressentie comme
   pulsation ». Il fait une exception quand la signature n'exprime pas la
   pulsation : 5/8, 6/8 et 7/8 battus en noires et noires pointées.
   *Behind Bars* (Gould, Faber) consacre une section « Tempo indications » au
   chapitre « Metre » (table des matières officielle), mais le texte même n'a
   pas pu être lu : l'indication « ♩. = 60 » attribuée à Gould n'est **pas
   vérifiée en première main**.
2. **Théorie musicale : en 6/8, le temps est la noire pointée, deux par mesure
   [S].** ABRSM introduit les mesures composées au grade 3 de théorie.
   OpenLearn (Open University) fait identifier une signature composée en
   comptant les temps en noires pointées. Dorico définit la mesure composée
   comme une mesure dont chaque temps se divise en trois, « 6/8 contenant deux
   temps en noires pointées ».
3. **Logiciels de notation : le temps suit la signature, mais l'unité interne
   reste la noire [S].**
   - MuseScore Studio 4 : le raccourci Alt+Shift+T insère une indication
     métronomique dont la figure « suit l'information de temps de la
     signature ». En revanche, le réglage de vitesse et le « BPM » des
     propriétés comptent toujours des noires : ♪ = 100 s'affiche ♩ = 50.
   - Dans son code, MuseScore convertit le tempo en « battements par minute
     conventionnels » en divisant par trois en mesure composée : le temps y est
     la noire pointée.
   - Finale permet de choisir l'unité de tempo de lecture (noire pointée,
     blanche…).
   - Sibelius affiche le temps en noire pointée dans les mesures composées. Un
     utilisateur du forum officiel relève que 6/8 à ♩ = 100 s'affiche ♩. = 66
     [S-].
4. **Métronomes et applications : aucune convention commune [S].**

   | Outil | Unité du BPM en 6/8 | Réglage 6/8 |
   |---|---|---|
   | Boss DB-90 | noire pointée (la base de connaissances Roland conseille 50–60 BPM) | aucun réglage 6/8 : un temps par battue, sous-division en triolet |
   | Boss DB-30, Korg KDM-3, Tama RW200 | tempo affiché « ♩ = » | aucun réglage 6/8 : nombre de temps de 0 à 9 et sous-divisions (triolet compris) |
   | Boss DR-01S | noire (« Quarter note = 40–300 ») | signature 6/8 sélectionnable |
   | Soundbrenner | dénominateur (croche en x/8) ; le manuel conseille de doubler le BPM pour garder la même noire | accents libres par temps |
   | Pro Metronome (EUMLab) | « BPM » par défaut ; option « noires par minute » conseillée pour 3/8 | sous-divisions, dont pointées |
   | Tempo (Frozen Ape) | non documentée | 6/8, 9/8 et 12/8 proposés, « 3 motifs rythmiques pour les mesures composées » |
   | Logic Pro | noire | clic par groupe (1 et 4 en 6/8) en option |
   | Groove Scribe | noire (tempo MIDI) | décompte sur les 6 croches en 6/8 |

5. **Conséquence observable : la base de tempos officielle de BeatBuddy mélange
   les unités [S-].** Le *Song Matcher* de Singular Sound associe le groove
   « Blues 3 – 6/8 » à *Hallelujah* à 171 BPM, soit environ 57 à la noire
   pointée compté en croches. Il associe « Blues 7 – 6/8 » à *Nothing Else
   Matters* à 69 BPM, soit environ 46 à la noire pointée compté en noires. Les
   tempos sont fournis par la communauté.
6. **[R]** Un BPM nu est donc ambigu dès qu'on quitte les x/4. Le seul choix
   cohérent avec le glossaire du projet est que le BPM compte le *temps* (la
   noire pointée), à condition d'**afficher l'unité** (« ♩. = 60 »), comme le
   font la notation et les logiciels qui suivent la signature.

### A.2 Ce que joue le clic par défaut

1. **Les éditeurs de partitions subdivisent par défaut en mesure composée
   [S].**
   - Dorico : « par défaut, Dorico ne subdivise le temps du clic que dans les
     mesures composées ». Trois sons distincts : premier temps, temps suivants,
     subdivisions.
   - Sibelius : aigu sur le premier temps, grave sur les temps suivants, et
     « en mesure composée comme 6/8, il subdivise aussi le temps en croches ».
     Le réglage « Subdivide beats » le désactive.
2. **MuseScore Studio 4 change de grain selon le tempo [S].**
   - Le clic tombe sur la noire pointée à partir de 60 noires pointées par
     minute, et sur chaque croche en dessous.
   - Le commentaire du code justifie ce choix : « les chefs battent l'unité
     simple aux tempos lents (< 60 unités composées par minute) ».
   - Le décompte suit la même règle.
   - Seul le premier temps est accentué (wood-block aigu) ; tous les autres
     clics sont identiques (wood-block grave), sans accent secondaire sur le 4.
3. **Les métronomes matériels obtiennent le 6/8 en superposant temps et triolet
   [S].**
   - La recette Roland pour le DB-90 : un temps par battue, curseurs ACCENT et
     triolet levés, 50–60 BPM. Le résultat est un 6/8 « avec l'accent sur les
     comptes 1 et 4 », c'est-à-dire sur chaque noire pointée.
   - Le Tama RW200 et le Korg KDM-3 donnent un volume séparé aux noires, aux
     croches et aux triolets, mais n'ont pas de réglage 6/8.
4. **Applications [S].**
   - Logic Pro propose un clic « Group » : en 6/8, il tombe sur 1 et 4 ; en
     12/8, sur 1, 4, 7 et 10. Apple le présente comme le moyen d'obtenir une
     pulsation utilisable.
   - Soundbrenner propose une grille de croches accentuée « X o o X o o »,
     pour sentir 6/8 « en deux grands temps ».
   - Le cours de batterie drumscore.com conseille à l'inverse de régler le
     métronome en croches en 6/8 [S-].
5. **Accents secondaires [S].** Aucune source ne met d'accent propre au 4ᵉ ou
   au 7ᵉ temps de croche *au-dessus* des autres temps. Dans toutes les sources,
   l'« accent sur 1 et 4 » est l'accent du *temps* sur la subdivision. Le
   modèle commun a trois niveaux : premier temps, autres temps, croches.

### A.3 Pédagogie, tempo lent et tempo rapide

1. **En deux en principe, en six quand c'est lent [S].**
   - La méthode de piano Hoffman Academy : la façon « la plus facile » de
     compter 6/8 est en six croches, mais 6/8 « est fait pour être ressenti en
     deux ».
   - MuseScore code la même bascule (point A.2.2).
   - Un guide pour professeurs d'orchestre d'harmonie, qui reprend les
     *macro beats* et *micro beats* d'Edwin Gordon, défend au contraire que la
     pulsation de 6/8 est en deux « à tous les tempos, même très lents » [S-].
2. **La science du rythme fixe les limites [S].**
   - Repp (2003, *Journal of Motor Behavior*) : synchroniser un geste avec des
     clics devient plus régulier quand l'intervalle est subdivisé par des sons
     intermédiaires.
   - Ce bénéfice décroît avec la vitesse. Il devient un coût quand la
     subdivision descend sous 200–250 ms.
   - La synthèse de Repp (2005) situe la limite basse de la synchronisation
     autour de 1,8 s entre deux clics.
3. **Application aux tempos du projet [R].**
   - Une croche dure 60 / (3 × BPM) s en BPM de noire pointée. Le seuil de
     200–250 ms correspond donc à 80–100 noires pointées par minute.
   - Sous ce seuil, entendre les croches aide l'élève. Au-dessus, elles
     gênent.
   - La limite de 1,8 s tombe vers 33 noires pointées par minute : en dessous,
     un clic par temps ne suffit plus.
   - Le seuil de MuseScore (60) se trouve à l'intérieur de cette zone.
4. **Agostini [S].** Le volume 2 traite les mesures composées. Il n'a pas été
   consulté ; on ne sait donc pas comment il indique le tempo ni s'il fait
   compter en six (voir `docs/agostini-progression.md`).

---

## Question B : groove sobre en mesure composée

### B.1 Le motif de référence

1. **Grosse caisse sur le 1, caisse claire sur le 2ᵉ temps (4ᵉ croche) en 6/8
   [S-].**
   - C'est le premier groove 6/8 enseigné en pop-rock (drumscore.com, cours
     vidéo de Jon Dittert) : charley sur les six croches, grosse caisse sur 1,
     caisse claire sur 4.
   - Dittert précise qu'en 6/8 pop-rock, le temps fort secondaire, « là où on
     frapperait dans les mains », est la 4ᵉ croche.
   - drumscore.com suggère d'accentuer le charley sur 1 et 4.
2. **12/8 : grosse caisse sur les temps 1 et 3, caisse claire sur les temps 2
   et 4 [S].**
   - *A Fresh Approach to the Drumset* (Mark Wessels, publié avec Vic Firth)
     consacre une leçon au 12/8 : grooves, technique « Accented 3's » pour le
     charley, *12/8 Blues*, puis *12/8 Rock*.
   - Le texte de la leçon est payant, mais son descriptif public parle de
     « jouer le charley sur les grooves 12/8 » en accentuant les groupes de
     trois.
   - Drumgenius décrit son « Ballad 12/8 1 » comme un « motif de ride de base
     avec backbeat ».
   - Le cours DrumsTheWord donne le motif complet : grosse caisse sur 1 et 3,
     caisse claire sur 2 et 4, charley sur les douze croches [S-].
3. **9/8 : pas de motif standard trouvé [S].**
   - La Boss DR-01S ne propose que 3/4, 4/4 et 6/8.
   - Drumgenius a un « Gospel 9/8 » et des packs BeatBuddy comptent du 9/8,
     mais leurs motifs ne sont pas décrits en texte.
4. **Charley : en croches dans toutes les sources de batterie [S].**
   - Aucune source pédagogique ne propose de groove 6/8 ou 12/8 avec le
     charley seulement sur les noires pointées.
   - Le premier geste enseigné pour la main de cymbale est la suite continue
     de croches accentuée par groupes de trois.

### B.2 Ce que proposent les outils

1. **Boss DR-01S [S].**
   - Le 6/8 est l'une des trois signatures de l'appareil (3/4, 4/4, 6/8),
     avec deux motifs de batterie (« 6/8 » et « 6/8 Cross stick »).
   - Les motifs « 12/8 Feel » sont rangés **en 4/4**.
   - Le tempo est toujours en noires.
2. **Boss DB-90 [S].** Ses trente motifs de batterie n'en comptent aucun en
   6/8 ou en 12/8 ; le 6/8 n'existe que par le réglage de clic du point A.2.3.
3. **BeatBuddy [S-].** La bibliothèque par défaut range le 6/8 et le 12/8 dans
   la catégorie Blues (« Blues 3 – 6/8 » à « Blues 7 – 6/8 », « Blues 8 –
   12/8 » à « Blues 10 – 12/8 ») et compte un « Odd Time 3 – 6/8 ». Le contenu
   exact des motifs n'est pas publié.
4. **EZdrummer 3 (Toontrack) [S].**
   - La bibliothèque MIDI a des familles « Straight 6/8 », « Swing 6/8 » et
     « Straight 12/8 » (liste relevée sur le forum officiel [S-]).
   - Le manuel indique que la signature de piste n'admet que des subdivisions
     paires.
   - Un groove 4/4 se joue en 6/8 en ralentissant au facteur 2/3, ce que
     Toontrack démontre avec un clic 6/8.
5. **Groove Scribe (Mike Johnston) [S].**
   - Aucun preset 6/8 ou 12/8 : les grooves ternaires sont des grilles en
     triolets dans une mesure 4/4 (Jazz Shuffle, Half Time Shuffle, Purdie
     Shuffle).
   - Le motif généré par défaut est générique : grosse caisse et caisse claire
     alternent à chaque unité du dénominateur, donc à chaque croche en 6/8. Ce
     n'est pas un groove 6/8 musical.
6. **Drumgenius [S].**
   - Les boucles 6/8 sont surtout afro-cubaines (bembé, abakuá), avec le tempo
     noté à la noire pointée (« 97 bpm, ♩. »).
   - Le 12/8 n'apparaît qu'en ballade jazz et en gospel.
7. **GarageBand et Logic Drummer [S-].** Aucune documentation officielle n'a
   été trouvée sur ce que joue Drummer en 6/8. Le forum Apple confirme qu'il
   suit la signature du projet.
8. **Groove Essentials (Tommy Igoe, Hudson Music) [S].** Le seul 6/8 du
   volume 1 est un 6/8 afro-cubain (« Nañigo »). Ces grooves 6/8 « du monde »
   sont denses par nature et hors sujet ici [R].

### B.3 Le charley en croches masque-t-il la lecture ?

1. **Aucune source ne traite la question [S].** Rien n'a été trouvé sur l'effet
   d'un charley en croches sur un élève qui lit un rythme. La réponse ci-dessous
   est raisonnée.
2. **Densité [R].**
   - En 6/8, le charley en croches est la sous-division de base, comme les
     croches en 4/4. Ce n'est pas une densité de style comme les doubles
     croches du funk que l'ADR 0002 a écartées.
   - Le groove 4/4 actuel joue pourtant le charley sur les temps, plus sobre
     que le rock standard en croches. Le projet a donc déjà retiré la
     sous-division de la batterie.
3. **Pourquoi le charley sur les temps ne suffit plus [R].**
   - En 6/8, un charley sur les seules noires pointées (grosse caisse et
     charley sur 1, caisse claire et charley sur 4) ne dit rien de la division
     ternaire.
   - À tempo lent, ce motif ne se distingue pas d'un 2/4 joué en noires.
   - Or la division ternaire est précisément ce que l'élève apprend avec les
     mesures composées.
4. **Le charley en croches ne ment pas à l'oreille [R].**
   - L'ADR 0002 a écarté le swing décoratif parce qu'il fait entendre une
     division absente de la grille lue.
   - En mesure composée, les croches du charley sont celles de la grille
     écrite : il dit la vérité.
5. **Le risque réel est la vitesse [R].** D'après Repp, une subdivision devient
   un coût sous 200–250 ms, soit au-delà de 80–100 noires pointées par minute.
   Au-delà, des croches au charley se rapprochent de la zone où elles gênent la
   synchronisation.

---

## Recommandations

### A : tempo et clic

1. **Le BPM compte le temps, c'est-à-dire la noire pointée [S → R].** C'est
   cohérent avec le glossaire, avec la notation et avec les logiciels qui
   suivent la signature. En mesure composée, **afficher l'unité** à côté du
   nombre (« ♩. = 60 ») : un BPM nu est ambigu, le constat A.1.5 le montre.
2. **Le clic joue trois niveaux en mesure composée [S → R].**
   - Premier temps : son accentué, comme aujourd'hui.
   - Autres temps (le 2ᵉ en 6/8, donc la 4ᵉ croche) : son normal.
   - Croches intermédiaires : son nettement plus faible.
   - C'est le défaut de Dorico et de Sibelius, et la recette Roland pour le
     DB-90. Le débutant entend la division ternaire sans rien régler, ce qui
     est l'objet même de l'apprentissage.
3. **Une seule option pour l'utilisateur avancé : « subdiviser » [R].**
   - Elle est **activée par défaut** en mesure composée. La désactiver ne
     laisse que les temps, pour travailler la pulsation intérieure.
   - Pas de bascule automatique selon le tempo, à la MuseScore : l'ADR 0002 a
     déjà préféré un comportement fixe et prévisible à une densité qui change
     avec le tempo.
   - C'est une préférence de lecture, au même titre que le choix clic ou
     groove.
4. **Le décompte suit le même clic, croches comprises [R].** Deux clics seuls
   pour une mesure de 6/8 lente (3 s à ♩. = 40) ne donnent ni le tempo ni la
   division. Groove Scribe et MuseScore à tempo lent décomptent d'ailleurs en
   croches.
5. **Conséquence sur le glossaire [R].** La définition du **Clic** (« un son
   court par temps ») devra mentionner la subdivision en mesure composée.

### B : groove

1. **Grosse caisse et caisse claire sur le temps, comme aujourd'hui [S → R].**
   - La règle actuelle (temps impairs : grosse caisse ; temps pairs : caisse
     claire) s'applique telle quelle aux noires pointées.
   - 6/8 : grosse caisse sur le 1, caisse claire sur le 2ᵉ temps (4ᵉ croche).
   - 12/8 : grosse caisse sur les temps 1 et 3, caisse claire sur les temps 2
     et 4.
   - 9/8 : grosse caisse, caisse claire, grosse caisse, comme le 3/4 actuel.
   - C'est le motif de référence pédagogique en 6/8 et en 12/8.
2. **Charley sur chaque croche, accentué sur les temps, au niveau de mixage le
   plus bas [S → R].** Toutes les sources de batterie jouent ainsi, et c'est la
   seule façon pour le groove de dire la division ternaire sans mentir (B.3).
3. **L'option « subdiviser » commande aussi le charley [R].**
   - Désactivée, le charley ne joue que sur les temps, comme en 4/4.
   - Un seul réglage gouverne alors la sous-division des deux voix de
     pulsation : simple pour le débutant, et l'avancé garde un groove
     dépouillé.

## Ce qui reste incertain

- **Le texte de Gould** sur les indications de tempo en mesure composée n'a pas
  été lu en première main.
- **La méthode Agostini, vol. 2** n'a pas été consultée : on ne sait pas si
  elle fait compter en six au départ.
- **Le masquage par le charley en croches** n'est étayé par aucune source.
  Seule une écoute en conditions réelles tranchera : élève débutant, tempo
  lent, croches écrites dans la grille.
- **La plage de tempo en mesure composée** reste à fixer.
  - Si le BPM compte la noire pointée, la plage actuelle de 40 à 200 donne
    des croches de 500 ms à 100 ms ; le haut de la plage est irréaliste.
  - Les seuils de Repp suggèrent un bas vers 30–40 et indiquent que la
    subdivision devient un coût au-delà de 80–100.
  - Le plafond exact est un choix de produit.
- **Le changement de signature avec un tempo en cours** reste ouvert : passer
  de 4/4 à ♩ = 90 à 6/8 conserve-t-il le nombre (♩. = 90, trois fois plus de
  croches par minute) ou la croche ? Soundbrenner conserve le nombre ; aucune
  source ne dit quelle option déroute le moins un débutant.
- **Le 9/8** n'a pas de groove de référence documenté. La règle « temps
  impairs, temps pairs » est une extrapolation du 3/4.
- **L'unité du BPM de Tempo (Frozen Ape)** et ce que joue Logic Drummer en 6/8
  ne sont pas documentés par leurs éditeurs.

## Sources

### Notation, théorie, pédagogie

- Gould, *Behind Bars*, table des matières (section « Tempo indications ») : <https://www.behindbarsnotation.co.uk/contents/toc.pdf>
- Indiana University, Jacobs School, *Music Notation Style Guide* (tempo exprimé dans la pulsation ressentie) : <https://blogs.iu.edu/jsomcomposition/music-notation-style-guide/>
- ABRSM, programme de théorie, grades 1 à 5 (mesures composées au grade 3) : <https://www.abrsm.org/sites/default/files/2023-09/music-theory-syllabus-outline-grades-1-5-from-2020.pdf>
- Open University, OpenLearn, *An introduction to music theory*, 3.8 et 3.10.1 : <https://www.open.edu/openlearn/history-the-arts/music/an-introduction-music-theory/content-section-3.8>
- Hoffman Academy, leçon 3/8 et 6/8 (compter en six, ressentir en deux) : <https://app.hoffmanacademy.com/lessons/piano/38-68-time-signatures/video/>
- Guide 6/8 pour professeurs d'orchestre d'harmonie, d'après Gordon (deux temps à tous les tempos) : <https://apromusic.com/download/6-8-band-teacher-guide.pdf>
- Repp, B. H. (2003), *Rate limits in sensorimotor synchronization…*, J. Motor Behavior 35(4), doi:10.1080/00222890309603156 ; résumé et synthèse dans Repp (2005), *Sensorimotor synchronization: A review of the tapping literature* : <http://users.df.uba.ar/anita/f1_labo/clase1/repp%20psycho%20bull%20rev%202006%20synchro%20tapping%20review.pdf>
- Agostini, *Solfège rythmique* vol. 2 (périmètre : mesures composées) : <https://www.bauermusique.com/solfeges-formation-musicale/8029-agostini-solfege-rythmique-v2-9790707005125.html>

### Logiciels de notation et DAW

- MuseScore Studio, manuel, indications de tempo : <https://handbook.musescore.org/text/tempo-markings>
- MuseScore Studio, manuel, contrôles de lecture (vitesse en noires) : <https://handbook.musescore.org/sound-and-playback/playback-controls>
- MuseScore, code `sig.h` (conversion en BPM de temps, seuil de 60) : <https://github.com/musescore/MuseScore/blob/4fa4e6183c63f0bad6aa020e4e3891ee3549a6e8/src/engraving/dom/sig.h#L62-L84>
- MuseScore, code `playbackeventsrenderer.cpp` (clic, accent, décompte) : <https://github.com/musescore/MuseScore/blob/661d88cbabb331d1374c26e9f906d49ff72524f4/src/engraving/playback/playbackeventsrenderer.cpp#L70-L91>
- Dorico Pro 6.1, réglages du clic (subdivision par défaut en mesure composée) : <https://www.steinberg.help/r/dorico-pro/6.1/en/dorico/topics/write_mode/write_mode_midi_recording/write_mode_midi_recording_click_settings_changing_t.html>
- Dorico Pro 6.1, types de signatures : <https://www.steinberg.help/r/dorico-pro/6.1/en/dorico/topics/notation_reference/notation_reference_time_signatures/notation_reference_time_signatures_types_r.html>
- Sibelius 6.1, *Reference* (réglages du clic) : <https://hub.sibelius.com/download/documentation/pdfs/sibelius610-reference-en.pdf>
- Sibelius, forum officiel (affichage ♩. = 66 en 6/8) [S-] : <http://www.sibelius.com/cgi-bin/helpcenter/chat/chat.pl?com=thread&groupid=3&guest=1&start=645144>
- Finale, *Playback Controls* (unité de tempo de lecture) : <https://usermanuals.finalemusic.com/Finale2009Win/Content/Finale/PLBAKCNT.htm>
- Logic Pro (Mac), réglages du métronome (clic « Group ») : <https://support.apple.com/guide/logicpro/metronome-project-settings-lgcpe1d6118e/mac>
- Logic Pro (iPad), réglages du métronome (6/8 : 1 et 4 ; 12/8 : 1, 4, 7 et 10) : <https://support.apple.com/guide/logicpro-ipad/metronome-project-settings-lpip5c02c2a4/ipados>

### Métronomes

- Roland, base de connaissances, *DB-90: Creating a 6/8 Rhythm* : <https://support.roland.com/hc/en-us/articles/206355236-DB-90-Creating-a-6-8-Rhythm>
- Boss DB-90, caractéristiques et liste des motifs : <https://www.boss.info/global/products/db-90/downloads/>
- Boss DB-30, caractéristiques : <https://www.boss.info/global/products/db-30/specifications/>
- Korg KDM-3, caractéristiques : <https://www.korg.com/us/products/tuners/kdm_3/specifications.php>
- Tama RW200, fiche produit et manuel : <https://www.tama.com/usa/products/detail/rw200.html>, <https://www.tama.com/pdf/support/faq/RW200.pdf>
- Soundbrenner, manuel de l'application (unité du BPM) : <https://www.soundbrenner.com/pages/manual-the-metronome-app>
- Soundbrenner, motifs d'accents en 6/8 : <https://www.soundbrenner.com/blogs/articles/metronome-accent-patterns-better-groove-without-rushing>
- EUMLab, aide de Pro Metronome : <https://eumlab.com/support/>
- Frozen Ape, Tempo : <https://www.frozenape.com/tempo.html>

### Batterie

- Boss DR-01S, caractéristiques et liste des motifs : <https://www.boss.info/us/products/dr-01s/>, <https://static.roland.com/assets/media/pdf/DR-01S_PatternList_en.pdf>
- Singular Sound, *Song Matcher* (BeatBuddy, tempos par morceau) [S-] : <https://songmatcher.singularsound.com/>
- Toontrack, manuel d'EZdrummer 3 (copie hébergée par un tiers) : <https://www.mslinn.com/av_studio/EZdrummer%203%20_%20Manual%20_%20Toontrack.pdf>
- Toontrack, forum officiel (liste des familles MIDI d'EZdrummer 3) [S-] : <https://www.toontrack.com/forums/topic/ezdrummer-3-list-of-included-midi-grooves-variations-fills/>
- Groove Scribe, presets : <https://github.com/montulli/GrooveScribe/blob/9ee0e7e66de709a9724d5b07dd8371cf00b517f0/js/grooves.js>
- Groove Scribe, motif par défaut : <https://github.com/montulli/GrooveScribe/blob/9ee0e7e66de709a9724d5b07dd8371cf00b517f0/js/noteArrays.js#L387-L444>
- Groove Scribe, décompte : <https://github.com/montulli/GrooveScribe/blob/9ee0e7e66de709a9724d5b07dd8371cf00b517f0/js/midiFile.js#L64-L96>
- Drumgenius 1.6, index des boucles (tempos à la noire pointée en 6/8) : <https://www.projazzlab.com/wp-content/uploads/2012/08/Drumgenius%201.6%20Index.pdf>
- Wessels, *A Fresh Approach to the Drumset*, table des matières (leçons 20 à 22 : 12/8) : <https://ae.vicfirth.com/wp-content/uploads/Lesson-32.pdf>
- Stanton Moore Drum Academy, leçons 20A à 20D (*Accented 3's*, *12/8 Blues*) : <https://www.stantonmooredrumacademy.com/intermediate-fresh-approach>
- Hudson Music, *Groove Essentials 1.0*, extrait (6/8 afro-cubain uniquement) : <https://hudsonmusic.com/wp-content/uploads/grooveessentials1-sample.pdf>
- drumscore.com, *6/8 Grooves* [S-] : <https://bypass.drumscore.com/lessons/level-1/grooves/grooves-in-different-time-signatures/grooves-in-6-8>
- Jon Dittert, *How To Play 6/8 Drum Beats* (vidéo) [S-] : <https://www.youtube.com/watch?v=eWy1gkCP7iI>
- DrumsTheWord, *12/8 Basic Drum Beats* [S-] : <https://www.drumstheword.com/free-drum-lesson-beginner-lesson-4-128-basic-drum-beats-and-grooves/>
- Apple Community, Drummer en 6/8 [S-] : <https://discussions.apple.com/thread/5577028>
