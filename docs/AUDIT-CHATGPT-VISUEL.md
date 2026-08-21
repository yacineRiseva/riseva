# Audit visuel et ergonomique — retour ChatGPT (5.6 Sol, effort maximum)

Cinq captures réelles à 1440 px : Tous ensemble, annuaire, tableau de bord,
annonces, classement.

> « L'enveloppe générale fait désormais produit vendu : navigation stable, palette
> cohérente, composants réguliers, associations nommées, distances et limites
> méthodologiques visibles. Ce qui sent encore la démo vient surtout des données
> contradictoires, visualisations surdimensionnées et explications défensives. »

## P0 — ce qui détruit la confiance

- [ ] **Trois contradictions visibles.** Le tableau de bord dit 3 salariés sur 210,
  soit 1,4 % ; le classement dit 60 % de participation pour la même entreprise.
  Deux dénominateurs sous un seul mot. → « Participation dans l'effectif : 3/210 »
  d'un côté, « Activation des inscrits : 3/5 » de l'autre, et jamais « participation »
  pour les deux. Badge « Saison 2027 » alors que les annonces sont datées d'août 2026.
  « Tous ensemble » sous le badge de saison alors que la courbe part d'avril 2025 :
  choisir, et le dire — saison, ou historique depuis le lancement.
- [ ] **Le classement dit « non significatif » puis classe quand même.** Trois
  réserves affichées, puis un rang, des barres comparatives et « vous êtes 2e ».
  Le lecteur ne retient que « dernier ». → Sous dix entreprises : score, progression
  de cohorte, et rien d'autre. Aucun rang, aucune barre, aucun trophée.
- [ ] **« Objectif du trimestre » n'a aucun objectif.** Une barre à moitié pleine,
  un tiret à droite, ni cible ni maximum. → Score, médiane de catégorie si la
  cohorte le permet, sinon progression de cohorte — le seul objectif réel ici.

## P1 — hiérarchie et compréhension

- [ ] Tableau de bord : « Ce qui vous attend » deux fois trop haut pour deux lignes.
- [ ] Mettre « 3 salariés mobilisés » en valeur principale, le 1,4 % en secondaire.
- [ ] Sortir « 950 € par mission validée » des quatre KPI : à quatre missions, le
  ratio est instable. Le garder dans le rapport, avec la formule.
- [ ] Remonter « Vos associations » : justification plus forte que le classement,
  et invisible dans les 875 premiers pixels.
- [ ] **Jauge** : la légende présente trois valeurs comme trois catégories alors
  que 960 = 120 + 840. Deux segments, l'équation écrite, et le format responsable
  de l'écrêtement nommé. Titre : « Vos 960 points, après application du plafond ».
- [ ] **Annonces** : « Se positionner » ne convient à aucun des trois formats.
  → « Faire un don », « Proposer du matériel », « Participer ». Le badge lime
  affiche parfois un barème, pas un gain : écrire « Barème : +1 pt par tranche de
  10 € ». Masquer les indicateurs à zéro. Distinguer objectif et réalisation.
  Placeholder tronqué à 1440 px. Cinq filtres pour 22 annonces, c'est trop.

## P1 — graphismes

| Élément | Note | Problème | Correction |
|---|---|---|---|
| Forêt | concept 7/10, exécution 4/10 | Arbres qui se chevauchent, deux langages graphiques, haut presque vide, paliers impossibles à compter | −35 % de hauteur, groupes de dix sans chevauchement, éventuellement 1 arbre = 100 |
| Carte | visuel 5/10, outil 2/10 | France trop petite dans un cadre immense, contour fantôme, points minuscules, siège distingué par la seule couleur, tout dépend du survol | Carte compacte en colonne, contour plus sombre, siège en losange avec libellé, légende visible, distances sans survol |
| Vignettes | système 6/10, différenciation 3/10 | Trop hautes, répétitives, elles représentent le format et pas l'annonce | Bande de 70 à 85 px, texture de catégorie assumée |
| Jauge | concept 8/10, exécution 4/10 | Partie + partie + total dans la même légende | Deux segments, équation, format responsable |

> « L'absence d'animation est le bon choix. En revanche, la phrase sous la forêt
> expliquant que ce n'est pas une animation d'accueil doit disparaître : personne
> ne se pose la question avant que le produit ne la soulève. »

## P2 — ce qui est de trop

- [ ] « Tous ensemble » est 40 % trop longue. Supprimer : « calculées à chaque
  ouverture de page, pas recopiées », la phrase sur l'animation, la deuxième carte
  de France (déjà dans l'annuaire), le graphique historique dans sa forme actuelle,
  et les dix tuiles simultanées. Six cartes en 5 + 1 avec une deuxième ligne vide :
  marqueur visuel typique d'une démo.
- [ ] « Ce que ça a produit, en vrai » est trop affirmatif face à « Riseva additionne,
  elle n'audite pas ». → « Résultats déclarés par les associations », confirmés et
  estimés séparés visuellement, pas l'estimé en petit gris dans la même phrase.
- [ ] Annuaire : la carte occupe 60 % de la hauteur utile avant le premier résultat.
  → Carte en colonne de gauche (35–40 %), trois associations les plus proches à
  droite, filtres et annuaire dessous. Titre : « 12 associations partenaires en
  France ». Préciser « à vol d'oiseau ».
- [ ] Classement : le panneau de droite est un manuel embarqué sur un tiers de
  l'écran, plus volumineux que le classement lui-même. → Trois lignes et un lien.

## Contrastes

Mesures relevées par ChatGPT sur les JPEG. Notre propre mesure (`scripts/contraste.py`,
qui lit la couleur héritée et le fond effectif dans le navigateur) confirme les cas
et en a corrigé d'autres : 1 338 textes sur douze pages, zéro sous le seuil.

Restent à traiter, hors texte : le contour de la carte à ≈1,2:1 sur papier — un
élément graphique porteur d'information, donc soumis au 3:1 — et les légendes en
capitales de la forêt, trop petites.

## Ce qu'un responsable RSE ne comprend pas en dix secondes

1. Pourquoi sa participation vaut à la fois 1,4 % et 60 %.
2. Pourquoi il est 2e sur 2 alors que le classement est déclaré non significatif.
3. Ce que mesure la barre « Objectif du trimestre ».
4. Pourquoi 960 points réalisés deviennent 120 retenus, et quel format a écrêté.
5. Si 150 points sur une annonce est un gain total ou un barème par demi-journée.
6. Ce que signifie « 0 colis préparés » sur une annonce qui vise à en financer 300.
7. Si les distances sont routières ou à vol d'oiseau.
8. Si « Tous ensemble » décrit la saison 2027 ou l'historique depuis 2025.
