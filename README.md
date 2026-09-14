# PLS Urgence — séquence illustrée

Application statique complète, sans dépendance ni compilation. Version du 14 septembre 2026.

https://philipperackette.github.io/PLS-Urgence-PWA/

## Ouvrir

Décompressez le ZIP et ouvrez `index.html`. Pour installer la PWA, publiez tout le contenu du dossier sur un hébergement HTTPS, puis ouvrez le site et utilisez « Ajouter à l’écran d’accueil » ou « Installer » selon le navigateur. Le guide devient disponible hors ligne après un premier chargement complet et l’affichage « Guide disponible hors ligne ». L’appel au 112 nécessite une connexion téléphonique ; la voix dépend des voix présentes sur l’appareil.

## Contenu

- 12 étapes, une nouvelle action par illustration.
- Choix du côté avant la PLS, après vérification de la réaction et de la respiration.
- À gauche / à droite désignent le côté de l’image, tête en haut ; le côté anatomique est aussi indiqué au choix.
- Une seule série SVG, inversée par symétrie verticale pour le côté opposé. Les textes restent hors de l’image.
- Corps entier et sauveteur visibles, géométrie commune, retour et progression manuels, lecture vocale, accès permanent au 112 et à la réanimation.
- `apercu.html` présente toute la séquence et permet d’inverser le côté.
- `DESCRIPTIF-IMAGES.md` décrit les positions à contrôler.
- Les SVG dans `images/` sont les sources éditables. Les essais d’images générées ne sont pas utilisés dans cette version : la construction vectorielle conserve explicitement les membres et les positions.

## Vérifications réalisées

Vérification de syntaxe JavaScript ; tests des 12 étapes dans les deux sens, précédent/suivant, changement de côté, minuteur, voix, accès à la réanimation ; existence des images ; test simulé de l’installation du cache, des ressources hors ligne, du repli de navigation et de la conservation des caches étrangers. Rendu des SVG pour contrôle visuel.

Le lancement du navigateur automatisé a été bloqué dans l’environnement d’exécution. Le rendu de l’application dans un navigateur réel et l’installation sur iOS/Android restent à vérifier. Les illustrations sont une réalisation graphique, sans validation par un formateur en secourisme.

## Référence des gestes

Croix-Rouge française, « L’inconscience » : https://www.croix-rouge.fr/les-gestes-de-premiers-secours/inconscience (consultée le 14 septembre 2026). Les textes sont reformulés. La référence visuelle fournie par l’utilisateur sert de repère de posture ; son texte n’a pas été repris comme consigne.

Suivez les instructions des secours. Le guide concerne une personne inconsciente qui respire normalement ; une respiration absente ou anormale conduit à l’écran de réanimation.
