# Refonte des vitrines : ce que la recherche a change dans les decisions

Quatre recherches menees en parallele le 6 septembre 2026, sources en fin de
chaque annexe : references premium (Linear, Stripe, Vercel, Ramp, Wise, Mercury,
Attio, Raycast, Apple), secteur de l'engagement salarie et des outils RSE en
France, etat de l'art front-end 2026, copywriting B2B et associatif. Ce document
ne resume pas les annexes : il liste ce qu'elles font changer pour Riseva.

## 1. Le premier ecran

Regle observee partout : quatre objets, rien d'autre. Un h1 de 6 a 9 mots qui
nomme la categorie, un sous-titre d'une phrase qui nomme le beneficiaire et le
resultat, deux boutons, une preuve visible sans defiler. Vercel le formule :
« le premier ecran est l'argument, pas une enseigne ».

Consequence : le heros entreprises perd son sur-titre, ses cinq lignes de
mentions et sa legende. Il garde une phrase, un sous-titre, deux boutons, une
ligne de reassurance factuelle sous les boutons (pas de facturation par salarie,
tarif public), et la capture du produit en grand.

## 2. Ce que personne n'occupe dans le secteur

Le benchmark de vingt acteurs (Komeet ne Vendredi et Wenabi, Koeo, Day One,
microDON, Benevity, Goodera, Deed, Goodstack, HelloAsso, JeVeuxAider, Zei, Sami,
Greenly, kShuttle, Apiday) montre six angles vides. Riseva les tient tous :

1. **La PME nommee, avec un prix.** Aucun acteur francais de l'engagement
   n'affiche un tarif. Riseva a une grille publique : c'est l'argument que le
   secteur ne peut pas copier sans se renier.
2. **La confirmation par l'association comme garantie de la donnee.** Personne
   ne dit « ce qui figure dans votre rapport a ete confirme par celle qui l'a
   recu ». C'est la phrase centrale des deux sites.
3. **Le pont entre l'action de terrain et l'indicateur.** Les plateformes
   d'engagement ne disent jamais VSME ; les outils ESG ne parlent jamais de
   benevolat. Riseva est le seul a faire les deux dans un abonnement.
4. **Le multi-sites.** Personne ne parle d'agences, d'usines, de magasins.
5. **Le don de materiel**, absent de toutes les listes de formats.
6. **La saison.** Le mot n'existe nulle part ailleurs : le secteur vend des
   « programmes » continus.

Le vocabulaire sature, a ne plus ecrire : engagement dans un titre, impact,
sens et quete de sens, mobiliser, solidaire, « au coeur de », « acteurs de »,
« belle aventure », « trait d'union », « faire la difference », intérêt general
comme slogan, federateur, co-construction.

## 3. Ce que les associations attendent et que personne ne leur dit

Les etudes INJEP et Kimso relayees par Pro Bono Lab : l'accueil de salaries
est chronophage, l'association ne choisit pas toujours qui vient, le premier
risque d'echec est l'indisponibilite du salarie. Aucune page « associations »
du secteur ne repond a ces points. Le site associations de Riseva repondra a
quatre questions que les autres taisent : le droit de refuser sans penalite,
ce qui se passe si personne ne vient, qui assure le benevole, et **ce que
l'association gagne a confirmer** : une trace datee, exportable, qu'elle peut
montrer a ses propres financeurs. La confirmation se vend comme un service
rendu a l'association, pas comme une corvee.

Registre observe chez ceux qui font bien (HelloAsso, France Benevolat) :
vouvoiement, phrases courtes, boutons a la premiere personne (« Inscrire mon
association »), verbes du terrain : publier, recevoir, confirmer, refuser.

## 4. Les deux publics sur deux sites

Regles des places de marche bifaces : le cote payeur possede l'accueil ; le cote
gratuit a une page complete, jamais un paragraphe ; un bandeau croise discret
sur chaque site ; un pied de page commun ; aucun texte miroir. Le modele le plus
proche est Welcome to the Jungle. Le point de jonction a montrer des deux cotes
est la confirmation : c'est le seul moment ou les deux publics touchent le meme
objet.

## 5. L'imagerie que Riseva seule peut produire

Le secteur de l'engagement prouve par des photographies de terrain (t-shirts,
peinture, mains dans la terre) ; le secteur ESG prouve par des tableaux de
bord. Personne ne montre l'artefact du milieu : la fiche de mission, le
calendrier de la saison, la confirmation horodatee, l'affiche avec son code QR.
Ce sont des objets reels du produit Riseva, et aucun concurrent ne peut les
acheter en banque d'images. Les illustrations generees sortent des deux sites ;
les captures du produit entrent, recadrees au plus serre sur l'element qui
prouve la phrase d'a cote.

## 6. Motion

Convergence des sources (Vercel, Emil Kowalski, Rauno Freiberg, Apple) : sur le
marketing, seuls les visuels produit bougent, le texte n'apparait jamais en
fondu, « default to stillness », « never gate reading behind animation ».
Interface : 100 a 250 ms en ease-out, `transform` et `opacity` seulement, actif
a `scale(.97)`.

Consequence : la classe `.rv` posee sur chaque titre et paragraphe disparait.
Le mouvement se concentre sur trois choses : la capture du heros qui se pose,
le simulateur de tarif qui recalcule, la ligne de la saison qui se trace au
defilement. `prefers-reduced-motion` coupe la translation, garde l'opacite.

## 7. Typographie et technique

- Instrument Sans et Inter versionnees en woff2, `preload` de la police de
  titre, `font-display: swap` sur le titre et `optional` sur le corps, une
  `@font-face` de repli calee par `size-adjust` pour supprimer le decalage.
- h1 entre 48 et 64 px, h2 24 a 32, corps 16 a 18 a interligne 1,5 a 1,6,
  chasse -0,01 a -0,02 em sur les titres, mesure de 60 a 68 caracteres.
- `text-wrap: balance` sur les titres, `pretty` sur les paragraphes.
- Image du heros en `<img>` avec `fetchpriority="high"`, jamais `loading="lazy"`.
- Conteneur 1120 a 1280 px (le systeme dit 1180 : on garde), prose sur 600 a
  720 px, 64 a 96 px entre sections.
- Bordures 1 px a 8-16 % d'alpha, ombres sous 10 %, aucun texte en blanc ou noir
  purs, focus visible de 2 a 3 px, cibles de 24 px minimum (WCAG 2.2, 2.5.8),
  `scroll-padding-top` a la hauteur de la barre (2.4.11).
- Menu mobile en `<dialog>`, FAQ en `<details>` stylise, onglets remplaces par
  des sections empilees quand c'est possible.
- CSS vise : 20 a 40 Ko compresses, au lieu de 118 Ko minifies.

## 8. Ecriture

- Titres de 3 a 8 mots, categorie puis public puis resultat, aucun adjectif de
  valeur. Sous-titre d'une phrase, 11 a 17 mots.
- Un bouton nomme l'action et l'objet obtenu. Jamais « Commencer » seul.
- Pas de preuve : l'honnetete est la preuve. « Premiere saison : janvier 2027 »
  vaut mieux qu'un « beta ».
- Marqueurs d'ecriture generee a traquer : groupes de trois, « ce n'est pas X,
  c'est Y », questions rhetoriques en serie, phrases de longueur identique,
  « dans un monde ou », « que vous soyez... ou... », connecteurs systematiques,
  promesses sans detail vecu.
- Typographie francaise : espace insecable avant les deux-points et les
  guillemets fermants, fine insecable avant ; ! ?, guillemets francais, espace
  dans les nombres, majuscules accentuees, sigles en capitales sans points.

## 9. Faits reglementaires a ecrire juste

- VSME : recommandation (UE) 2025/1710 du 30 juillet 2025, volontaire. Ses
  rubriques B1 a B11 et C1 a C9 ne contiennent aucune ligne mecenat ou
  benevolat : Riseva vend une annexe utile aux questionnaires clients, pas une
  conformite. La pression vient des donneurs d'ordre, pas de la loi.
- CSRD apres la directive Omnibus : seuils releves a 1 000 salaries et 450 M EUR,
  les PME sortent du champ obligatoire. Les deux annexes divergent sur la date
  exacte de la directive : on ne l'ecrit pas sur le site.
- Article 238 bis : 60 % jusqu'a 2 M EUR de dons, 40 % au-dela, plafond de
  20 000 EUR ou 5 pour mille du chiffre d'affaires. Mecenat de competences
  valorise au cout de revient, plafond de trois PASS mensuels par salarie.
- Marche : 97 % des entreprises mecenes sont des TPE et PME (Admical 2024).
  Les responsables engagement citent d'abord la difficulte a faire passer les
  salaries a l'action (80 %) et le manque de temps (73 %), pas le manque de
  missions (etude Komeet, octobre 2025, 131 entreprises).

Annexes : `annexes/references-premium.md`, `annexes/secteur-rse.md`,
`annexes/front-end-2026.md`, `annexes/copywriting.md`.
