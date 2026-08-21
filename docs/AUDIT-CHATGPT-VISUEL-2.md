# Audit visuel, deuxième passe — retour ChatGPT

> « L'interface ne fait plus amateur. La forêt, la carte, les vignettes et la
> jauge ont franchi le seuil de crédibilité. Ce qui sent encore la démo vient
> désormais surtout des données incohérentes, de quelques libellés imprécis et
> d'un tableau de bord qui veut raconter tout le produit à la fois. »

## Critique — ce qui détruit encore la confiance

- [x] **Les annonces ont l'air générées.** « Plantation de 400 arbres » affiche
  « Objectif : 480 arbres ». « Croquettes et couvertures » devient « 5 kits
  distribués ». La sortie des chiens dit 40 chiens dans le texte et 72 animaux en
  objectif. → Un objectif ne s'affiche que s'il est saisi explicitement, dans la
  même unité que le titre, sans conversion implicite, avec un aperçu avant
  publication.
- [x] **« 4 missions validées » contre « 3 missions ».** La logique est juste, la
  lecture ne l'est pas. → Badge « 3 missions avec résultat confirmé », et sous les
  KPI : « 4 missions validées, dont 3 avec un résultat confirmé par l'association ».
- [x] **Le classement des associations est faux visuellement.** « La plus
  sollicitée », « la deuxième », « la troisième », alors que chacune a une mission :
  l'ordre vient en réalité des points. → Supprimer l'ordinal, titre « Associations
  soutenues », tri par activité récente. Classer des associations par points serait
  de toute façon la mauvaise tonalité.
- [x] **« Vérifiées par Riseva » promet trop.** Identité ? Éligibilité fiscale ?
  Impact ? → Dire précisément ce qui est contrôlé, avec un lien « Ce que Riseva
  vérifie ».

## Très fort impact — le tableau de bord est encore trop long

Dix blocs fonctionnels. Les quatre premiers forment déjà un excellent tableau de bord.

- [x] « Mise en route » → dans Paramètres passé les premières missions.
- [x] « Annonces qui vous correspondent » → un lien, pas une grille.
- [x] La courbe hebdomadaire, dix semaines plates et un pic → dans Rapports, ou
  seulement au-delà de trois semaines actives.
- [x] Les 840 points écrêtés expliqués deux fois dans deux colonnes → une seule.
- [x] « À traiter » mélange ce qui demande une action et ce qui attend un tiers.
  → « Action requise » / « En attente d'un tiers ».
- [x] Le panneau « À faire » décrit des statuts, pas des actions → « Missions en cours ».

## Terminologie

- [x] « 960 points réalisés » rebrouille score et impact → « points bruts »,
  « points retenus », « points écrêtés », partout.
- [x] « des points d'un autre format » → « diversifiez les formats d'engagement ».
- [x] Décimales : `0.6` s'affiche encore avec un point → `Intl.NumberFormat('fr-FR')`
  partout.
- [x] « 50 % du retenu » est circulaire → « Chaque format peut représenter au
  maximum 50 % du score retenu. »
- [x] « Entreprises engagées » → « entreprises avec au moins une action validée ».

## Graphismes

| Élément | Verdict | Dernière correction |
|---|---|---|
| Forêt | distinctive et propre, plus amateur | Reste une illustration à paliers : écrire « 89 paliers de 25 franchis » plutôt que laisser croire que les icônes valent exactement 2 233 arbres |
| Carte | réussie, sobre, crédible | Agrandir le losange du siège et son halo de 25 % : illisible dans le groupe lyonnais |
| Vignettes | cohérentes, discrètes | Le motif n'est plus le problème, le cartouche lime l'est |
| Cartouches de points | trop dominants | −20 à 25 % de surface, et normaliser : « +150 pts / demi-journée » |
| Jauge | fonctionnelle et explicable | Atténuer les hachures : les points perdus attirent plus l'œil que le score |
| Courbe hebdomadaire | encore « données de démo » | La masquer tant qu'il n'y a pas assez de semaines actives |

## Redondances

- [x] Annuaire : « Les plus proches de vous » répète les trois premières cartes.
  → Commencer la grille à la quatrième, ou supprimer le panneau.
- [x] Deux appels concurrents par carte, douze fois : « Sa page » et « Ses annonces ».
  → La carte entière mène à la fiche, un seul bouton « Voir les annonces ».
- [x] « Sa page » fait maquette → « Voir la fiche ».
- [x] Tous ensemble : le badge « 25 missions sans réponse » est dans le bloc des
  résultats confirmés. → Le déplacer dans le bloc ambre : « 25 missions
  auto-validées après 14 jours sans réponse ».
- [x] « la production est déduite de l'annonce » → « Le résultat est estimé à partir
  de l'objectif annoncé : il n'a pas été constaté par l'association. »
- [x] Les « + Voir… » font liens artisanaux → chevron et vrai état ouvert/fermé.

## Page Classement

- [x] Le titre « Classement de la saison » ouvre une page sans classement.
  → Conditionnel : « Votre score de saison » + badge « Classement à venir » sous dix.
- [x] Raccourcir : « 2 entreprises sur les 10 nécessaires. Le classement sera publié
  lorsque la cohorte atteindra ce seuil. » Et ne pas remplir le vide artificiellement.

## Test des dix secondes — ce qui échoue encore

1. Pourquoi quatre missions validées ne produisent que trois résultats.
2. Pourquoi trois associations à une mission chacune sont première, deuxième, troisième.
3. Si « vérifiée par Riseva » couvre l'identité, l'éligibilité fiscale ou l'impact.
4. Pourquoi une mission de 400 arbres poursuit un objectif de 480.
5. Si « points réalisés » désigne des actions, des impacts ou un score.
6. Pourquoi « Classement » mène à une page sans classement.
7. Ce qu'il faut réellement faire dans « À traiter » et « À faire ».


## Où en est la correction

Tout est appliqué.

- **Annonces.** Les vingt-et-un objectifs du jeu de démonstration ont été repris un
  par un pour coller à leur titre : 400 arbres annoncés valent 400 affichés, la
  sortie des chiens dit 42 chiens des deux côtés, les croquettes et les ordinateurs
  ont perdu un décompte en « kits » qui n'avait aucun sens. Surtout, le formulaire
  demande désormais **l'objectif total**, plus un multiplicateur par unité : c'est
  la saisie « 40 arbres par demi-journée » sur douze demi-journées qui produisait
  480 sous un titre annonçant 400. Un aperçu écrit la phrase exacte qui partira,
  et prévient quand le chiffre du titre ne correspond pas.
- **4 validées / 3 confirmées.** Écrit sous le KPI, en toutes lettres.
- **Associations.** Plus d'ordinal, plus de tri par points : « Associations
  soutenues », les plus récentes d'abord, avec la date de la dernière mission.
- **Vérification.** « Existence juridique et coordonnées contrôlées », et un bouton
  qui ouvre les cinq points vérifiés — ainsi que les deux qui ne le sont pas :
  l'éligibilité fiscale et l'impact réel.
- **Tableau de bord.** De 5 200 à 3 880 pixels. « Action requise » et « En attente
  d'un tiers » séparés, « Missions en cours » au lieu de « À faire », mise en route
  retirée passé trois missions validées, grille d'annonces remplacée par une ligne
  et un lien, courbe hebdomadaire masquée sous trois semaines actives, écrêtage
  expliqué une seule fois.
- **Terminologie.** Points bruts / retenus / écrêtés partout, « chaque format peut
  représenter au maximum 50 % du score retenu », « diversifiez les formats
  d'engagement », « entreprises avec au moins une action validée », et les décimales
  en français via `Intl.NumberFormat('fr-FR')`.
- **Graphismes.** Losange du siège et son halo agrandis d'un tiers, cartouche de
  points passé sur une ligne et réduit d'un quart, hachures de l'écrêtage
  atténuées, légende de la forêt en « 89 paliers de 25 franchis ».
- **Redondances.** L'annuaire commence la grille à la quatrième association, la
  carte entière mène à la fiche et un seul bouton mène aux annonces. Le badge des
  missions sans réponse a rejoint le bloc ambre des estimations. Les volets ont un
  chevron et un vrai état.
- **Classement.** Sous dix entreprises, le titre devient « Votre score de saison »
  et le badge « Classement à venir ».
