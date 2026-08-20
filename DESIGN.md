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

> Cette palette n'est pas nouvelle. Elle a été verrouillée le 29/07/2026 dans le brief envoyé
> au graphiste du logo, puis oubliée. Elle est remise en service ici, c'est elle qui donne au
> produit sa profondeur et son caractère.

| Rôle | Valeur | Usage |
|---|---|---|
| Encre | `#131510` | Couleur primaire de la marque. Titres, boutons d'action, texte fort. |
| Papier | `#F2F0E9` | Fond général. **Jamais de blanc pur.** Surfaces posées : `#FAF9F5`, flottantes : `#FCFBF8`, creusées : `#EAE7DE`. |
| Forêt | `#0B2620` / `#0F3D30` / `#1F5C4A` / `#2E7A62` | La profondeur. Barre latérale, sections sombres, carte de tête, courbes. |
| Lime | `#C9F24B` | **Accent uniquement, et seulement sur fond sombre.** Illisible sur clair. |
| Mousse | `#DFE6D0` | Fond doux, badges, textes sur forêt. |
| Bleu eau | `#3D82AD` | Accent secondaire, information. |
| Ambre | `#C97F1E` | Attention, attente. |
| Vert du logo | `#6DBE45` | Le pont entre forêt et lime. Écho de la rivière, filets. |

### Comment la profondeur est obtenue

Pas par des dégradés ni du faux relief, tous deux explicitement interdits par le brief de marque.
Par quatre choses :

1. **L'empilement des surfaces.** Papier `#F2F0E9`, carte `#FAF9F5`, modale `#FCFBF8`, champ creusé
   `#EAE7DE`. Quatre niveaux qui se distinguent sans une seule bordure marquée.
2. **Les ombres sont vertes.** Elles sont teintées `rgba(11,38,32,…)`, pas noires. Une ombre noire
   sur un papier chaud fait sale ; une ombre forêt fait profond.
3. **Les surfaces sombres portent un grain.** Une texture de bruit à très faible opacité en
   `mix-blend-mode: overlay` (`.grain`). C'est ce qui empêche un aplat de vert profond de paraître
   plat, sans dégradé.
4. **Une carte de tête par écran.** Une seule carte en `#0B2620` avec son chiffre en lime. C'est
   l'ancre visuelle. Deux, et l'effet disparaît.

### Ce qui reste interdit

Le vert lime en texte sur fond clair. Le vert du logo en texte sur papier (contraste 2,3:1) :
seul `#3B6D11` passe. Et tous les clichés écologiques listés dans le brief de marque : feuille
générique, main tenant une pousse, globe entouré de feuillage, flèches de recyclage.

## 2 bis. Ancienne note sur le vert

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

## 8. La rivière

C'est la seule chose du système qui n'appartienne qu'à Riseva. Partout où l'on montre une
évolution dans le temps, on ne dessine pas des barres : on dessine une rivière. Une courbe lissée
avec un aplat dégradé sous elle, doublée d'un écho plus fin en dessous, exactement comme le double
trait du monogramme. Un point plein marque la valeur du jour.

C'est implémenté dans `riviere()` (`public/app/ui.js`), à partir d'un lissage Catmull-Rom.
Les barres restent réservées aux comparaisons entre entreprises, où la longueur doit se lire
au pixel près.

Sans cet élément, le système produirait un très bon SaaS générique. C'est la différence entre
une interface propre et une interface reconnaissable sans son logo.

## 9. Structure type du tableau de bord

De haut en bas, sans exception :

1. Barre supérieure : titre de la page, pastille de saison, actions de la page à droite.
2. Rangée de quatre KPI. Le premier est toujours la métrique principale de la saison.
3. Deux colonnes : à gauche l'évolution dans le temps (graphique en barres), à droite l'objectif
   du trimestre et la liste des choses à faire.
4. Un bloc large en dessous : ce sur quoi l'utilisateur peut agir tout de suite.

Le classement n'est jamais la première chose affichée. C'est une conséquence, pas un but.

## 10. Relecture externe

Le système a été soumis à une critique extérieure (ChatGPT, 20/08/2026). Ce qui a été retenu,
et ce qui a été écarté.

**Retenu**

- *« Pilule systématique pour les boutons : la pilule permanente sent le pattern générique. »*
  Les boutons passent en rectangle arrondi (12 px, 14 px en grande taille). La pilule est
  désormais réservée aux badges et aux étiquettes.
- *« Le vocabulaire de rayons est trop large. »* Ramené de cinq valeurs à trois : 8, 12, 20.
- *« Des neutres trop visiblement verts font poussiéreux et attendu pour une marque RSE.
  Les neutres doivent paraître neutres avant qu'on remarque leur sous-ton. »* La teinte a été
  fortement réduite, elle reste présente mais n'est plus perceptible au premier regard.
- *« Corps 15 px acceptable pour une application dense, 16 px sur le marketing. »* Appliqué :
  16 px sur les pages publiques, 15 px dans l'application.
- *« Il manque un élément réellement propriétaire, sinon c'est un très bon SaaS générique. »*
  C'est ce qui a donné la rivière de la section 8.

**Écarté, et pourquoi**

- *« La barre latérale sombre fixe est le pattern le plus datable. »* C'est la direction que
  le fondateur a validée le 31/07/2026 après six rejets, on ne la remet pas en cause. Elle a en
  revanche été allégée : 236 px au lieu de 252, fond moins noir, état actif signalé par un filet
  vert de 2 px plutôt que par un aplat vert.
- *« Instrument Sans + Inter, c'est safe et peu propriétaire. »* Exact, mais changer de fonte
  au moment de figer le système, c'est rouvrir la porte à six nouvelles itérations. Le caractère
  passe par la hiérarchie typographique et par la rivière, pas par une fonte exotique.

Verdict de la relecture sur le point le plus important : *« Je ne changerais ni le noir ni le
vert. Le vrai risque n'est pas d'être vieillot, c'est d'être un très bon SaaS générique. »*
