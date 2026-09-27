# PLS Urgence — séquence illustrée

Application statique complète, sans dépendance ni compilation. Version du 27 septembre 2026.

https://philipperackette.github.io/PLS-Urgence-PWA/

<p align="center"><img src="qr-code.svg" width="220" alt="QR code vers https://philipperackette.github.io/PLS-Urgence-PWA/"></p>

<p align="center">Scannez ce QR code avec l’appareil photo du téléphone pour ouvrir le guide.</p>

## Mettre une icône sur le téléphone (à faire une seule fois)

La page s’enregistre sur le téléphone et une icône **« PLS Urgence »** apparaît sur l’écran d’accueil. Il suffit de le faire une seule fois, à l’avance : ensuite le guide s’ouvre d’un geste, en plein écran, même sans connexion internet.

**iPhone / iPad**

1. Ouvrez https://philipperackette.github.io/PLS-Urgence-PWA/ dans **Safari** (ou scannez le QR code ci-dessus avec l’appareil photo).
2. Touchez le bouton **Partager** (carré avec une flèche vers le haut).
3. Choisissez **« Sur l’écran d’accueil »** (faites défiler la liste si besoin), puis **Ajouter**.

**Android**

1. Ouvrez https://philipperackette.github.io/PLS-Urgence-PWA/ dans **Chrome** (ou scannez le QR code ci-dessus avec l’appareil photo).
2. Touchez le menu **⋮** en haut à droite.
3. Choisissez **« Ajouter à l’écran d’accueil »** ou **« Installer l’application »**, puis confirmez.

**Pour vérifier :** touchez la nouvelle icône une première fois avec une connexion internet et attendez le message « Guide disponible hors ligne » en bas de l’écran.

Ces explications sont aussi dans l’application, via le lien « Mettre une icône sur mon téléphone » en bas de l’écran. Le lien disparaît quand l’application est ouverte depuis l’icône. Sur Android, un bouton permet d’ajouter l’icône directement quand le navigateur le propose.

L’appel au 112 passe par le téléphone et fonctionne sans internet ; la lecture vocale dépend des voix présentes sur l’appareil.

## Ouvrir en local

Décompressez le ZIP et ouvrez `index.html`. Le mode hors ligne et l’icône nécessitent une publication en HTTPS (par exemple GitHub Pages).

## Contenu

- 12 étapes, une nouvelle action par illustration.
- Choix du côté avant la PLS, après vérification de la réaction et de la respiration.
- À gauche / à droite désignent le côté de l’image, tête en haut ; le côté anatomique est aussi indiqué au choix.
- Une seule série SVG, inversée par symétrie verticale pour le côté opposé. Les textes restent hors de l’image. Des flèches orange montrent le geste de chaque étape.
- Corps entier et sauveteur visibles, géométrie commune, retour et progression manuels, lecture vocale, accès permanent au 112 et à la réanimation.
- Sur téléphone : les boutons « Étape suivante » et « Précédent » restent visibles en bas de l’écran, la consigne est affichée sous le titre, l’image s’adapte à la hauteur de l’écran.
- L’écran reste allumé pendant l’intervention (si le navigateur le permet).
- Un rechargement accidentel ramène à l’écran en cours ; le choix de la lecture vocale est mémorisé.
- Fin du décompte de 10 secondes : vibration et annonce pour les lecteurs d’écran. Flèches gauche / droite du clavier pour changer d’étape.
- `apercu.html` présente toute la séquence et permet d’inverser le côté.
- `DESCRIPTIF-IMAGES.md` décrit les positions à contrôler.
- Les SVG dans `images/` sont générés par `tools/generate-illustrations.mjs` (`node tools/generate-illustrations.mjs`, sans dépendance) : longueurs de membres fixes, coudes et genoux calculés, génération refusée si une position est impossible.
- `qr-code.svg` : QR code vers le site, affiché en haut de ce document.
- L’icône est `icons/icon.svg` (lettres « PLS » dessinées en tracés) ; les PNG sont exportés avec `tools/export-icons.cjs` (nécessite Playwright).

## Vérifications réalisées

Dans Chromium (Playwright), sur des écrans de 320 × 568, 360 × 640, 390 × 844, 412 × 915 et 844 × 390 (paysage) :

- parcours complet, 12 étapes dans les deux sens, précédent / suivant, changement de côté, minuteur, voix, accès à la réanimation, écran d’ajout de l’icône ;
- bouton « Étape suivante » visible sans défiler, pas de défilement horizontal, zones tactiles d’au moins 44 px ;
- enregistrement du service worker, 26 ressources en cache, ouverture hors ligne (y compris avec paramètres d’URL), reprise après rechargement, aucune erreur JavaScript ;
- chaque illustration contrôlée visuellement, à l’endroit et inversée ; icônes contrôlées de 40 à 240 px, carrées et rondes.

Restent à vérifier sur de vrais appareils : l’ajout de l’icône sur iPhone et sur Android, la lecture vocale et le maintien de l’écran allumé. Les illustrations sont une réalisation graphique, sans validation par un formateur en secourisme.

## Référence des gestes

Croix-Rouge française, « L’inconscience » : https://www.croix-rouge.fr/les-gestes-de-premiers-secours/inconscience (consultée le 14 septembre 2026). Les textes sont reformulés. La référence visuelle fournie par l’utilisateur sert de repère de posture ; son texte n’a pas été repris comme consigne.

Suivez les instructions des secours. Le guide concerne une personne inconsciente qui respire normalement ; une respiration absente ou anormale conduit à l’écran de réanimation.
