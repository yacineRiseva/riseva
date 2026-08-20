# Riseva — design system

Figé le 20/08/2026. Les valeurs vivent dans `public/styles/tokens.css`, ce document explique
pourquoi elles sont ce qu'elles sont. Si une valeur change ici, elle change là-bas, jamais l'inverse.

## 1. Le point de départ : le logo

Monogramme R géométrique enfermé dans un carré, traversé par une rivière qui serpente.
Wordmark RISEVA en capitales, sans-serif géométrique, graisse fine, interlettrage large.
Vert relevé sur le fichier : **#6DBE45**.

Deux conséquences directes :

- Le trait fin du logo interdit une interface épaisse. Bordures à 1 px, icônes à 1,6 px de trait,
  aucun aplat de couleur inutile.
- La rivière est le seul motif décoratif autorisé. Elle apparaît en trait, jamais en dégradé,
  et seulement en pied de section ou en fond de bloc sombre.

## 2. Couleur

### Le vert de marque ne sert jamais de texte sur fond blanc

#6DBE45 sur blanc donne un contraste de **2,31:1**, très en dessous du minimum de 4,5:1.
Le garder pour du texte rendrait l'interface illisible et, accessoirement, daterait immédiatement.
Donc :

| Rôle | Valeur | Usage |
|---|---|---|
| `--brand` | #6DBE45 | Logo, remplissage de graphiques, état actif, points de progression, accents sur fond sombre |
| `--brand-700` | #4F9A2E | Fond de bouton secondaire |
| `--brand-800` | #3B7C21 | Texte vert sur blanc (5,13:1), liens, chiffres de points |
| `--brand-050/100/200` | #F1F9EC / #DFF1D4 / #C2E4AF | Fonds de badge, pistes de barres, surlignage de ligne |

### Le bouton principal est noir, pas vert

C'est le choix qui écarte le plus sûrement l'effet « site associatif des années 2000 ».
Un vert saturé en aplat sur un grand bouton est le signal le plus daté qui soit. L'encre
`--ink` (#0D1512) sert de couleur d'action, le vert reste un accent. Bénéfice secondaire :
le contraste est acquis sans discuter.

### Les neutres sont teintés

Aucun gris pur. Tous les neutres portent une pointe de vert (#0D1512 → #F6F8F7), ce qui fait
tenir l'ensemble comme une palette et non comme un vert posé sur du gris.

## 3. Typographie

- **Instrument Sans** pour les titres et les chiffres. Grotesque contemporaine, un peu resserrée,
  qui supporte l'interlettrage négatif sans se déformer.
- **Inter** pour l'interface et le texte courant.
- Repli : `system-ui`, puis `-apple-system`, puis `Segoe UI`.

Échelle en `clamp()`, donc fluide, pas de palier brutal entre mobile et bureau.
Le corps de texte est à **15 px**, pas 13. Le petit texte est le premier signe de vieillissement
d'une interface.

Interlettrage : **-0,032em** sur le display, **-0,02em** sur les titres, 0 sur le texte.
Le seul interlettrage positif autorisé (+0,14em) est réservé aux sur-titres en capitales,
en écho au wordmark.

Chiffres en `tabular-nums` partout où ils s'empilent : KPI, classements, tableaux.

## 4. Formes et profondeur

- Rayons : 8 / 10 / 14 / 20 / 28 px, et `999px` pour les pastilles et les boutons.
  Pas de 4 px (daté), pas de 24 px partout (infantilisant).
- **Boutons en pilule**, cartes en 14 px. Le contraste entre les deux formes crée la hiérarchie.
- Ombres : trois niveaux, **jamais au-dessus de 0,10 d'alpha**, toujours doublées d'une hairline
  à 8 % d'opacité. Une ombre visible est une ombre ratée.
- Bordures : 1 px à `rgba(13,21,18,.08)`. Jamais de bordure grise à 1 px pleine.

## 5. Densité et grille

- Espacement sur une base de 4 px.
- Contenu marketing : 1180 px maximum. Application : 1560 px.
- Sections marketing : 96 px de respiration verticale. Le vide est ce qui distingue un site
  de 2026 d'un site de 2010, il n'y a pas à en avoir peur.
- Barre latérale de l'application : 252 px, fond `--ink`, éléments actifs en vert à 16 % d'opacité.

## 6. Les huit réflexes interdits

Liste de contrôle avant toute nouvelle page. Chaque ligne correspond à une chose qui fait
immédiatement « vieux ».

1. Dégradé de couleur sur un bouton ou un titre. À la place : aplat, ou rien.
2. Ombre portée visible, floue et grise. À la place : hairline + ombre à 0,05 d'alpha.
3. Texte à 12 ou 13 px pour du contenu. À la place : 15 px minimum.
4. Icônes pleines et multicolores. À la place : trait de 1,6 px, monochrome.
5. Tableaux zébrés avec bordures partout. À la place : ligne de séparation en haut, survol discret.
6. Tout centrer. À la place : alignement à gauche, le centrage réservé aux blocs courts.
7. Illustrations d'agence ou photos de banque d'images de gens qui rient. À la place : de la donnée
   réelle affichée dans l'interface, ou rien.
8. Coins à 4 px et boutons rectangulaires. À la place : les rayons du système.

## 7. Ce qu'on emprunte, et à qui

- **Linear** : la hiérarchie typographique et la retenue de l'ombre.
- **Vercel** : le bouton noir et la hairline.
- **Stripe** : la mise en page de la documentation tarifaire et la lisibilité des chiffres.
- **Attio** : la densité des tableaux sans lourdeur.
- **Notion** : la sobriété du vide.

On ne copie pas leur couleur, on copie leur discipline.

## 8. Structure type du tableau de bord

De haut en bas, sans exception :

1. Barre supérieure : titre de la page, pastille de saison, actions de la page à droite.
2. Rangée de quatre KPI. Le premier est toujours la métrique principale de la saison.
3. Deux colonnes : à gauche l'évolution dans le temps (graphique en barres), à droite l'objectif
   du trimestre et la liste des choses à faire.
4. Un bloc large en dessous : ce sur quoi l'utilisateur peut agir tout de suite.

Le classement n'est jamais la première chose affichée. C'est une conséquence, pas un but.
