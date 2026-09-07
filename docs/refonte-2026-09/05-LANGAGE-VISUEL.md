# Refonte des vitrines : langage visuel

Le design system (`DESIGN.md`, `tokens.css`) ne change pas. Ce document dit
comment la vitrine l'applique, la ou l'ancienne version l'appliquait mal ou pas.
Toute valeur ci-dessous vit dans `public/styles/vitrine.css`, reecrite.

Mis a jour apres la premiere implementation et le controle croise n. 3 et 4
(`04-ARCHITECTURE.md`, section E) : ce qui est ecrit ici est ce qui est en
place, pas ce qui etait prevu. Les ecarts entre le plan et le fait sont notes
en fin de section, en italique.

## 1. Ce qui change de regime

| Avant | Apres |
|---|---|
| Polices declarees, jamais servies | Instrument Sans et Inter en woff2 latin, versionnees, prechargees |
| Degrade radial vert, panneaux translucides, filigranes | Aplats du systeme, hairlines, grain sur la seule surface sombre |
| Quatre familles de style empilees, 118 Ko minifies | Une feuille ecrite a partir des jetons, 20 Ko minifies (plafond 24 dans la recette) |
| `.rv` sur chaque titre et paragraphe | Le texte est toujours visible ; seuls trois visuels bougent |
| Illustrations generees, scene composite de l'affiche | Captures du produit recadrees serre, l'affiche telle qu'elle sort |
| Trois a quatre surfaces sombres par page | Une carte de tete sombre par page, plus le pied |

## 2. Grille et rythme

- Conteneur 1180 px, gouttiere 20 px sous 640 px, 24 px jusqu'a 1240, 40 au-dela.
- Deux colonnes texte / visuel en 5 / 7 douziemes ; le texte ne depasse jamais
  640 px de large, et la recette mesure la ligne avec la police reellement
  dessinee : jamais plus de 82 signes.
- Colonne de lecture (FAQ, final) : 820 px, reponses a 724 px.
- Sections : 96 px de padding vertical au-dessus de 900 px, 64 px en dessous,
  48 px sous 640. Heros : 72 px en haut (40 sous 640). Entre un titre de section
  et son contenu : 40 px (32 sous 640).
- Base 4 px partout, echelle `--s1` a `--s32` du systeme.

## 3. Typographie

| Role | Famille | Taille | Graisse | Chasse | Interligne |
|---|---|---|---|---|---|
| h1 | Instrument Sans | clamp(2.5rem, 1.5rem + 2.9vw, 3.5rem) ; associations clamp(2.25rem, 1.3rem + 2.4vw, 3.125rem) | 600 | -0,03 em | 1,04 |
| h2 | Instrument Sans | clamp(1.75rem, 1.3rem + 1.6vw, 2.5rem) | 600 | -0,022 em | 1,1 |
| h3 | Instrument Sans | 1,25 rem | 600 | -0,01 em | 1,25 |
| Chapo | Inter | 1,1875 rem | 400 | 0 | 1,5 |
| Corps | Inter | 1,0625 rem (1 rem sous 640) | 400 | 0 | 1,55 |
| Petit | Inter | 0,875 rem | 400 | 0 | 1,5 |
| Etiquette | Inter | 0,8125 rem | 600 | +0,06 em, capitales | 1 |
| Chiffre | Instrument Sans | selon place | 600 | -0,02 em | 1, `tabular-nums` |

`text-wrap: balance` sur les titres, `pretty` sur les paragraphes. Les etiquettes
en capitales ne servent qu'aux sections dont le titre ne nomme pas la partie du
produit (« L'outil RSE », « Vos equipes », « La saison », « Pourquoi elles
viennent », « Les dons ») et a l'etiquette du simulateur : quatre au plus par
page, la recette compte. Repetees avant chaque titre, elles faisaient gabarit
(controle croise n. 3). Une `@font-face` de repli calee par `size-adjust` sur
Arial evite le decalage quand la police arrive apres le premier rendu.

Instrument Sans dessine une espace de 0,19 em la ou Inter en dessine 0,25 :
tout ce qui est compose dans cette police recoit `word-spacing: .08em`.

Chargement : `<link rel="preload" as="font">` sur les deux fichiers (78 Ko a
deux), `font-display: swap`. Aucune requete externe : les deux fichiers sont
dans `/brand/polices/`.

## 4. Couleur et surfaces

Papier `#F2F0E9` partout. Cartes en `--paper-raised` avec `--line` (1 px a 10 %),
sans ombre. Cadres de capture : rayon 12, `--line`, `--sh-2`. Tapis de capture
(voir Composants) : `--paper-sunk`, `--line`, rayon 20, sans ombre. Une carte
sombre par page en `--forest-900` avec `.grain`, texte en `--forest-100`
(mousse), le chiffre cle en `--lime`. Liens en encre soulignes d'un filet a 1 px, vert
`--brand` au survol. Le vert du logo `--brand` ne sert qu'en filet : la riviere,
le trait sous un mot, la ligne d'etapes.

Textes secondaires en `--ink-500` (`#63675C`, 5,5:1 sur papier). Aucun texte
sous 14 px, aucun texte en lime sur clair, aucun texte en `--brand` sur papier.

## 5. Composants

- **Barre de navigation** : 64 px, papier opaque, hairline en bas des que la
  page a defile de 8 px, liens en encre 15 px, un bouton. Sous 900 px : bouton
  menu ouvrant un `<dialog>` plein ecran, fermeture a Echap et au clic dehors.
- **Boutons** : rectangle 12 px, 48 px de haut, 15 px 600. Principal : fond
  encre, texte papier. Secondaire : fond transparent, `--line`, texte encre.
  Survol 150 ms (encre-800 / fond `--paper-sunk`). Actif `scale(.98)`. Focus :
  anneau 3 px `--sh-focus`. Cible tactile 44 px minimum.
- **Tapis de capture** (`.shot-tapis`) : une plaque de papier creuse, filet,
  rayon 20, 24 px de marge, et l'ecran pose dessus, centre, a ses proportions,
  jamais plus grand que 112 % de sa taille nature, avec son propre filet et
  `--sh-2`. Dans une sequence, c'est la plaque qui donne la masse : une carte et
  une page entiere font le meme poids sur la grille sans qu'aucune soit
  recadree. Sous 640 px la plaque n'impose plus de format (16 px de marge) :
  l'ecran telephone est deja etroit.
- **Les moments** (mecanisme) : une grille de deux colonnes, quatre moments,
  texte au-dessus et tapis carre en dessous, les tapis alignes en bas de
  chaque rangee. Un trait continu court au-dessus de la grille : c'est la
  riviere du systeme, la seule fois ou le motif sert un sens (le fait qui coule
  de l'association au rapport). Il se trace une fois quand la bande entre a
  l'ecran ; sous `prefers-reduced-motion` il est deja trace.
  *Ecart au plan : la bande horizontale de quatre colonnes prevue rendait
  les ecrans illisibles a 270 px ; la premiere implementation en grille les
  laissait pendre chacun a sa hauteur, et se lisait comme quatre objets de
  tailles accidentelles (controle croise n. 3). D'ou les tapis.*
- **Les etapes** (associations) : trois rangees texte / tapis en 5 / 7, le tapis
  a 320 px de haut au moins, un filet entre les rangees.
- **Accordeon** (FAQ) : `<details>`, `summary` en h3 17 px 600, hairline entre
  les questions, signe plus qui tourne a 45 degres en 180 ms, contenu en corps.
  Pas de carte autour.
- **Grille tarifaire** : lignes separees par hairline, prix en Instrument Sans
  28 px `tabular-nums`, libelle de tranche a gauche, sites inclus a droite en
  petit. La derniere ligne porte « a partir de ». Le simulateur est une carte
  raised, deux champs de 48 px a bordure encre 300 (1,5 px), une phrase de
  resultat qui se met a jour : le montant de la saison et l'acompte, jamais
  une division par salarie.
- **Formulaire a trous** : une seule colonne de 860 px, la phrase en Instrument
  Sans jusqu'a 30 px ; chaque champ est un `<input>` souligne d'une hairline,
  `<label>` present pour le lecteur d'ecran, la ponctuation dans le bloc du
  champ ; sous 640 px la phrase devient une liste de champs avec leurs libelles
  visibles. *Ecart au plan : la fiche qui se cochait a droite pendant la saisie
  a ete retiree, elle repetait les quatre champs (controle croise n. 3).*
- **Aparte** (`.assure`, `.moment-note`) : un filet vertical `--brand` de 2 px a
  gauche, 28 px de retrait ; quand la grille s'empile, le filet passe en haut.
- **Liste** (`.liste`) : un tiret `--brand` de 10 px, jamais de puce ronde ; les
  cinq criteres de demarrage, ce que la saison demande, ce que l'association
  garde en main.
- **Pied de page** : fond encre, quatre colonnes, textes en encre 200.

## 6. Images

Aucune illustration generee. Aucune photographie de banque. Les seules images
sont des captures du produit, prises par `scripts/captures.py` sur le jeu de
demonstration, avec les vraies polices, cadrees sur l'element qui prouve la
phrase d'a cote (un element entier : jamais coupe au milieu d'une ligne, les
lignes de trop sont masquees avant la photo). Ce qui est en place :

- la carte d'annonce telle qu'un salarie la voit (heros associations, moment 1) ;
- la liste de qui vient, cote association (moment 2 et etape 2), en triple
  densite ;
- la page de confirmation, une question, trois reponses (moment 3, etape 3),
  reconstruite depuis le gabarit de la fonction qui la sert ;
- trois lignes de mission avec leur etat (moment 4) ;
- la carte « Collecte des indicateurs », le tableau consolide avec ses
  formules, le tableau des missions (section 3) ; *ecart au plan : « Sites et
  quotas » repondait a une autre question que « combien de vos sites ont
  repondu ? », la carte de la collecte y repond mot pour mot* ;
- l'ecran Rapports (carte sombre) ;
- le formulaire d'annonce avec ses six modeles (etape 1) ;
- la carte « Qui peut venir chez vous » a zero (FAQ associations), la carte
  d'export pour le conseil d'administration ;
- l'affiche telle qu'elle sort de l'application, total de demonstration efface.

Chaque ecran complexe a sa variante « -mobile », prise dans la mise en page
telephone de l'application (fenetre de 430 px, ou 390 pour la confirmation) et
servie sous 640 px par `<picture>` : un tableau d'ordinateur reduit a 350 px,
ou qu'il faut faire glisser dans son cadre, n'est pas une preuve (controle
croise n. 3). *Ecart au plan : le detail du code QR (`photos/affiche-qr.jpg`)
a ete supprime avec le dossier `photos/` ; le QR est lisible sur l'affiche, et
le lien est dans la demonstration.*

La mention « Demonstration » est dans la barre de l'application, donc dans les
captures qui la montrent ; pour les autres, la page le dit une fois, en clair.
Aucune legende sous les images.

## 7. Mouvement

Trois mouvements, et pas un de plus :

1. La capture du heros se pose au chargement : opacite 0 a 1 et 12 px de
   translation, 600 ms, `cubic-bezier(.22,.61,.36,1)`.
2. Le trait de la bande des moments se trace quand elle entre a l'ecran, 900 ms,
   une seule fois.
3. Le resultat du simulateur change avec un fondu de 180 ms.

Survols : 150 ms sur couleur et fond, jamais de deplacement. Rien sur le texte.
`prefers-reduced-motion: reduce` : aucun mouvement, tout est en place. Aucune
video ne se lance seule.

## 8. Responsive

Fluide d'abord (`clamp()`, grilles `auto-fit`), puis quatre points de rupture
de contenu : 40 em (640 px) ou les colonnes s'empilent et la phrase a trous se
deplie, 56 em (900 px) ou la navigation passe au menu, 64 em (1024 px) ou les
deux colonnes prennent leurs proportions finales, et le conteneur a 1180 px.
Testes a 360, 390, 430, 768, 1024, 1280, 1440, 1920.

Sur telephone : le heros tient en un ecran et demi (titre, sous-titre, deux
boutons empiles, ligne de reassurance, capture prise dans la mise en page
telephone) ; les moments s'empilent, chacun avec sa capture telephone ; la
grille tarifaire garde ses six lignes en trois colonnes serrees ; la carte
sombre des dons empile ses deux colonnes ; la phrase a trous devient une liste
de champs. *Ecart au plan : pas de trait vertical entre les moments empiles, la
riviere reste le trait horizontal du haut.*

## 9. Ce qui reste interdit

Degrades, verre, filigranes, ombres grises, lime sur clair, pilule sur bouton,
texte sous 14 px, legende sous image, `.rv` sur du texte, emoji, tiret cadratin,
apostrophe courbe (la recette `clavier.py` le verifie), section « ce que nous ne
faisons pas », prenom du fondateur.
