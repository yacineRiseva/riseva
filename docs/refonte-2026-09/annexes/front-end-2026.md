# Annexe : etat de l'art front-end, septembre 2026, et ce qui est applique

Synthese des pratiques courantes sur les sites de reference et dans les guides
publics (web.dev, MDN, WCAG 2.2, les notes de Vercel, d'Emil Kowalski et de
Rauno Freiberg sur le mouvement). Chaque point dit ce qui est fait dans
`public/styles/vitrine.css`, `public/vitrine.js` et `scripts/vitrines.py`.

## Chargement et premier rendu

- Polices auto-hebergees en woff2, sous-ensemble latin, deux fichiers (78 Ko a
  deux), `<link rel="preload" as="font">` sur les deux, `font-display: swap`,
  et une `@font-face` de repli calee par `size-adjust` sur Arial pour que le
  texte ne saute pas quand la police arrive. Fait (`polices.css`).
- Feuille de style minifiee par le depot lui-meme (`scripts/css.py`), 20 Ko,
  une seule requete bloquante. Fait.
- Image de tete en `<img>` avec `fetchpriority="high"` et `loading="eager"`,
  jamais paresseuse ; toutes les autres en `loading="lazy"`. Fait.
- `<picture>` avec un `<source>` WebP et un `sizes` mesure sur la page rendue,
  et une source distincte sous 640 px pour la capture du heros (la mise en page
  telephone de l'application, pas le tableau de bord d'ordinateur reduit).
  Fait ; la recette verifie qu'aucune image n'est servie plus petite que sa
  boite.
- `width` et `height` sur chaque image (et sur chaque `<source>` de la version
  telephone) : aucun decalage de mise en page quand l'image arrive. Fait.
- Aucune requete vers un domaine tiers, aucun script externe, aucun
  traceur. Fait ; la recette verifie les requetes.

## Mise en page

- Fluide d'abord (`clamp()` sur les titres), puis quatre points de rupture de
  contenu : 1240, 1024, 900 et 640 px. Fait.
- Conteneur de 1180 px, colonnes 5 / 7 pour texte et visuel, 96 px entre
  sections (64 sous 900, 56 sous 640). Fait.
- Les enfants de grille portent `min-width: 0` : une image qui defile dans son
  cadre n'elargit jamais la page. Fait ; la recette mesure le defilement
  horizontal a 320, 360, 390 et 430 px.
- Les tableaux captures sont lisibles sur telephone : ils gardent une largeur
  de 640 px et se font glisser dans leur cadre (`overflow-x: auto`), plutot que
  d'etre reduits a 350 px illisibles. Fait.
- `text-wrap: balance` sur les titres, `pretty` sur les paragraphes. Fait.
- Mesure de lecture sous 80 caracteres partout : la recette la calcule avec la
  police reellement dessinee.

## Composants

- Barre de 64 px, `position: sticky`, filet qui apparait apres 8 px de
  defilement ; `scroll-padding-top` a la hauteur de la barre plus 16 px pour
  que les ancres ne cachent pas les titres (WCAG 2.4.11). Fait.
- Menu sous 900 px en `<dialog>` modal : focus, Echap et fond inerte geres par
  le navigateur ; le focus revient sur le bouton a la fermeture. Fait ; teste a
  quatre largeurs.
- FAQ en `<details>` / `<summary>` : bouton natif, contenu present dans le HTML
  (moteurs, lecteurs d'ecran, impression), une reponse repliee ne prend pas le
  focus. Fait ; teste au clavier.
- Boutons de 48 px (52 pour les grands), cibles tactiles au-dessus de 44 px,
  focus visible en anneau de 3 px (WCAG 2.5.8 et 2.4.7). Fait.
- Formulaire a trous : chaque champ a son `<label>` (lu par les lecteurs
  d'ecran, cache a l'oeil), `autocomplete` renseigne, et sous 640 px la phrase
  devient une liste de champs avec leurs libelles visibles. La ponctuation qui
  suit un champ est dans le bloc du champ, pour qu'une ligne ne commence jamais
  par une virgule. Fait ; teste.
- Simulateur de tarif : lit la grille rendue dans la page (une seule source,
  `data.js`), ne repond jamais un montant ferme sur la tranche a devis. Fait ;
  la recette compare au moteur de devis.

## Mouvement

- Trois mouvements : la capture du heros se pose (600 ms, `cubic-bezier(.22,
  .61,.36,1)`), la riviere se trace quand la bande des moments entre a l'ecran
  (900 ms, une fois, `IntersectionObserver`), le resultat du simulateur change
  en fondu (180 ms). Survols a 150 ms sur la couleur seulement. Fait.
- `transform` et `opacity` seulement, jamais de `top`, `height` ni `filter`.
  Fait.
- Rien sur le texte, aucune apparition au defilement : tout est en place sans
  script. Fait ; la recette retire la classe `js` et verifie.
- `prefers-reduced-motion: reduce` : aucun mouvement, la riviere est tracee, la
  capture est en place, le defilement doux est coupe. Fait ; teste.

## Accessibilite

- Contraste AA mesure sur la couleur calculee contre le fond peint, accordeons
  ouverts, sur les six pages publiques. Fait (`tests.py`, `contraste.py`).
- Un seul `h1` par page, `lang="fr"`, lien d'evitement vers le contenu, `alt`
  descriptif sur chaque capture (plus de 30 caracteres, verifie). Fait.
- Aucun texte sous 14 px ; les etiquettes en capitales a 13 px sont en graisse
  600 et espacees. Fait.

## Referencement

- Titre, description sous 160 signes, canonique, Open Graph (7 balises dont
  `og:image`) sur les deux pages. Fait ; teste.
- Donnees structurees `Organization` et `FAQPage`, generees depuis la meme
  liste que la page affiche ; aucune note, aucun avis, aucun effectif. Fait ;
  teste.
- Le texte visible est dans le HTML servi, pas construit par un script. Fait.
