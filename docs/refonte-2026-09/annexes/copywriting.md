# Annexe : ecrire pour les deux pages

Regles d'ecriture tenues sur `index.html` et `associations.html`, tirees de la
lecture des sites de reference, des pages qui s'adressent bien aux associations
(HelloAsso, France Benevolat) et des deux controles croises. Ce qui est
verifiable est verifie par la recette (`scripts/tests.py`, `scripts/clavier.py`).

## Ce qu'une phrase doit faire

- Repondre a la question que le lecteur se pose a cet endroit de la page. Une
  section qui ne repond a aucune question n'existe pas.
- Nommer l'objet : la carte d'annonce, la liste de qui vient, la page de
  confirmation, la ligne de mission, le referent de site, le rapport du
  trimestre. Jamais « la plateforme », « la solution », « l'outil » quand
  l'objet a un nom.
- Dire ce qui se passe, pas ce que ca vaut. « L'association confirme ce qui a
  eu lieu » plutot que « une donnee fiable ». « Le rapport part tout seul »
  plutot que « un reporting simplifie ».

## Ce qui est interdit

- Les mots du secteur : engagement dans un titre, impact, sens, mobiliser,
  solidaire, au coeur de, acteurs de, belle aventure, trait d'union, faire la
  difference, federateur, co-construction, solution innovante, nous accompagnons,
  levier, ecosysteme.
- Les absolus faux : « vous n'ecrivez rien », « l'argent arrive directement chez
  vous », « trois gestes et c'est tout ». Chaque fois qu'un absolu a ete
  propose, un relecteur a trouve le cas qui le dement.
- Les promesses sans fait : un taux d'engagement, un delai de verification, un
  resultat, un nombre d'associations. La page dit « nous ne vous promettons pas
  un taux que nous n'avons pas encore mesure », et l'application affiche zero
  quand c'est zero.
- « Certifier », sous toutes ses formes, sauf pour dire que Riseva ne certifie
  pas.
- Les rangees de chiffres decoratifs (« 12 mois / 4 rapports / 30 km ») : un
  chiffre est dans une phrase, avec ce qu'il veut dire.
- La symetrie systematique : quatre moments parce que le mecanisme en a quatre,
  cinq criteres parce qu'ils sont cinq au contrat, et pas trois cartes partout.
- Le tiret cadratin, l'apostrophe courbe, les points de suspension en un signe,
  le point median : `clavier.py --strict` echoue s'ils s'affichent.
- Le prenom du fondateur, l'emoji, la legende sous une image, la section « ce
  que nous ne faisons pas » (ce qui n'est pas fait est dit dans la FAQ, la ou on
  le cherche).

## Ce qui a ete garde mot pour mot, et pourquoi

- « Tous vos sites dans un seul rapport. Et vos equipes sur le terrain. » :
  les deux moities du produit dans la seule ligne que tout le monde lit ;
  confirme par le client puis par les deux controles croises contre deux
  variantes.
- « Ce que vous ne referez plus a la main. » : la douleur exacte du responsable
  RSE, nommee sans adjectif.
- « Douze mois plus tard, vous n'avez pas de bilan a ecrire. » : le
  soulagement operationnel, pas la fonctionnalite.
- « Un lien, une affiche, et chacun peut se proposer. » : concret, visuel,
  memorisable.
- « Ce qui est confirme entre dans votre bilan. » : la difference entre
  communication et donnee, en une phrase.
- « Gratuit. Ce sont les entreprises qui paient. » et « Ecrivez ce qui vous
  manque. Des entreprises d'a cote peuvent y repondre. » : la reponse a « que me
  veut-on et combien ca coute » avant toute autre chose.
- « Vous decidez de ce que vous acceptez, et c'est vous qui confirmez ce qui a
  eu lieu. » : le controle, dit une fois pour toutes.
- « Quatre lignes, un lien, et votre espace est ouvert. » : la promesse du
  formulaire, tenue par le formulaire.

## Ce qui a ete reecrit, et pourquoi

- « Vous n'etes pas le produit, vous etes ce qu'elles cherchent » est devenu
  « Elle paie pour vous trouver, pas l'inverse » : la premiere cherchait
  l'applaudissement, la seconde donne une information.
- « Trois gestes, et c'est tout » est devenu « Publier, accueillir, confirmer » :
  ce n'est pas tout, et le titre ne le pretend plus.
- « L'argent arrive directement chez vous » est devenu « L'argent ne passe
  jamais par Riseva » : aucun argent n'arrive necessairement ; ce qui est vrai,
  c'est que Riseva n'encaisse rien.
- « Quatre moments, et vous n'ecrivez rien » est devenu « De l'annonce au
  rapport, sans ressaisir la mission » : les indicateurs se saisissent, la
  mission ne se ressaisit pas.
- « Reserver une place » est devenu « Se preinscrire » : c'est ce que la page
  d'inscription fait, gratuitement, sans carte.
- « Envoyer, et preparer notre premiere annonce » est devenu « Ouvrir notre
  espace » : un bouton fait une chose.
- Les trois phrases sur l'assurance sont ecrites au conditionnel de la charte
  (« depend de votre contrat », « en general », « pas forcement »), pas plus
  fort que le droit.
- « Le mecenat ouvre droit a une reduction d'impot » est devenu « peut lui
  ouvrir une reduction d'impot, selon la nature du don et de l'organisme ».

## Typographie francaise

Espace insecable (`&nbsp;` dans la source) avant les deux-points, les
points-virgules, les points d'interrogation et d'exclamation, et a l'interieur
des guillemets francais ; guillemets francais partout ; espace insecable dans
les nombres (`2&nbsp;400&nbsp;€`) ; majuscules accentuees ; sigles en capitales
sans points ; petits nombres en lettres en tete de phrase (« Quatre envois »),
montants en chiffres.
