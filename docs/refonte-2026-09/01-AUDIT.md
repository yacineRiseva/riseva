# Refonte des vitrines, septembre 2026 : audit de l'existant

Etat mesure le 6 septembre 2026 sur le commit `5fe8535`, rendu dans Chromium a
1440 et 390 pixels de large, avant toute modification. Ce document classe chaque
element en KEEP, IMPROVE, REBUILD ou REMOVE. Il decide, il ne suggere pas.

## 1. Les faits qui pesent le plus

**Les polices ne sont pas en production.** `polices.css` declare Instrument Sans,
Inter, Bricolage, Fraunces et IBM Plex Mono en `url('/brand/polices/*.woff2')`.
Le dossier `public/brand/polices/` n'existe ni dans le depot ni sur le poste.
Le site se rend donc en Segoe UI sous Windows et en DejaVu sous Linux, avec un
italique synthetise la ou Fraunces etait attendue. Toute la typographie que
`DESIGN.md` decrit n'a jamais ete vue par un visiteur. C'est le defaut numero un,
et il est invisible depuis le code.

**La page entreprises fait 14 569 pixels de haut a 1440, 21 183 a 390.** Seize
ecrans sur bureau, vingt-cinq sur telephone. Le premier ecran contient un
sur-titre, un h1 de trois lignes, un paragraphe de cinq lignes, deux boutons,
cinq lignes de mentions, une capture et sa legende. Puis, avant la premiere
section, quatre piliers, trois chiffres et une citation du code de la commande
publique. La page dit tout, tout de suite, et ne hierarchise rien.

**Le langage visuel contredit le brief de marque.** Le brief du 29/07 interdit
les degrades et le faux relief. Les sections `verre-sect` posent un degrade
radial vert sur fond foret et des panneaux translucides a `backdrop-filter`
(glassmorphism). Les numeros decoratifs geants « 2 » et « 3 » en filigrane
sont un motif de gabarit SaaS. C'est exactement l'effet « genere » a eviter.

**Les photographies sont des illustrations generees.** Sortie de chiens, ouvriers
au camion, tri alimentaire, chat au soleil. La page associations le dit
honnetement (« Illustration generee, aucune mission reelle ») dans une legende,
ce que le canon interdit par ailleurs. Une image qui a besoin d'un avertissement
ne devrait pas etre la. Le depot contient pourtant de vraies photographies libres
de droits (`berge-ramassage`, `maraude`, `collecte`, `depart-chantier`,
`atelier`) qui ne servent pas au premier ecran.

**Le mobile est un bureau compresse.** Le heros de la page entreprises occupe
deux ecrans et demi de texte avant la premiere image. Le lien secondaire
« Explorer la plateforme » se retrouve orphelin sous le bouton. Les mentions
fines s'empilent sur six lignes.

**118 Ko de CSS minifie sur le chemin critique**, pour deux pages statiques. Le
fichier a grossi par accretion : quatre vagues de style (Bricolage, Fraunces,
verre, rubans) coexistent, dont trois ne servent plus.

## 2. Ce qui est bon et qu'on garde

- **L'honnetete du fond.** Aucun chiffre invente, aucun logo, aucun temoignage.
  La FAQ dit « Non, cette page n'affiche aucun resultat ». Le premier ecran
  distingue jeu de demonstration et faits exterieurs. C'est rare, c'est un
  avantage, et la refonte le garde intact.
- **Le socle technique.** Statique, zero dependance, zero requete sortante, HTML
  semantique, `lang="fr"`, canonical, Open Graph, JSON-LD Organization et FAQPage,
  images responsives en WebP a trois largeurs, `loading="lazy"`, revelations
  ecrites `.js .rv` pour que le contenu existe sans script.
- **Le design system** : palette encre / papier / foret / lime, ombres vertes,
  grain sur les surfaces sombres, boutons en encre, rayons 8 / 12 / 20, la riviere
  comme seul motif proprietaire. On ne le rediscute pas, on l'applique enfin.
- **La grille tarifaire lue depuis `data.js`**, le simulateur de tranche, les
  mentions « tarif fondateur » et « regle du 40 % » : un prix public et exact est
  un argument de vente, il reste.
- **Le pied de page**, sa structure en trois colonnes et son texte de marque.
- **L'outillage de recette** : `verifier.py`, `contraste.py`, `tests.py`. Toute
  correction de la refonte s'y adosse.

## 3. Classement, page entreprises

| Element | Verdict | Pourquoi |
|---|---|---|
| Navigation, cinq ancres et un bouton | IMPROVE | Bon principe. « Ouvrir la demonstration » n'est pas la conversion premiere d'un directeur RSE, qui veut d'abord comprendre. |
| Heros | REBUILD | Trop de messages. Le h1 est bon en substance, le reste noie. La capture merite l'ecran, pas un coin. |
| Bande « quatre piliers » | REMOVE | Repete la section suivante en plus court. Un lecteur qui lit les piliers puis la section lit deux fois la meme chose. |
| Trois chiffres (60 %, 1 lien, 2 400 EUR) | IMPROVE | Vrais et sources, mais poses avant qu'on ait compris le produit. Ils reviennent la ou ils repondent a une question. |
| Citation du code de la commande publique | IMPROVE | Argument reel et rare. Deplace dans le bloc « pourquoi maintenant », pas en ouverture. |
| Section « Trois questions » (verre sombre) | REBUILD | Le meilleur contenu de la page (les trois questions qu'on pose a un responsable RSE) dans le pire habillage (degrade, verre, numeros geants, illustration generee). |
| Section « L'outil RSE » (trois colonnes, ligne du temps, cinq onglets de captures) | IMPROVE | Structure juste. Les onglets cachent quatre captures sur cinq : montrer, pas cacher. |
| Section « Le challenge » (carte sombre) | IMPROVE | Bonne carte de tete. Deuxieme surface sombre de la page : `DESIGN.md` en veut une par ecran. |
| Section « Cote salaries » (affiche, QR) | IMPROVE | L'affiche est un vrai objet du produit, c'est un atout. Le bloc est mal compose (images orphelines, mentions eparses). |
| Section « La confirmation » (sombre, bareme) | REBUILD | Troisieme surface sombre. Le bareme en points s'adresse au produit, pas a l'acheteur : il descend dans le reglement, un resume suffit. |
| Section « Le prix » | KEEP, retouches | La grille est claire. Le simulateur est le meilleur outil de conversion de la page : il monte. |
| FAQ, neuf questions | IMPROVE | Contenu excellent, gabarit liste + panneau qui cache huit reponses sur neuf. |
| Bandeau final « On ne vous facture pas une promesse » | KEEP | Le meilleur titre de la page. |
| Pied de page | KEEP | |
| Legendes sous les images | REMOVE | Interdites par le canon. L'information « jeu de demonstration » passe dans l'interface montree, ou dans l'attribut `alt`. |

## 4. Classement, page associations

| Element | Verdict | Pourquoi |
|---|---|---|
| Heros | IMPROVE | « Ecrivez ce qui vous manque. Des entreprises d'a cote peuvent y repondre. » est le meilleur h1 des deux sites. L'illustration generee et sa legende partent. |
| Quatre chiffres (0 EUR, 5 minutes, 1 courriel, 30 km) | KEEP | Concrets, verifiables, ils repondent aux quatre premieres questions d'une presidente. |
| Capture du tableau de bord association | IMPROVE | Bonne idee, mal cadree (une seule ligne visible), legende en capitales monospace. |
| « Trois gestes » | IMPROVE | Le rail 01 / 02 / 03 est desaligne : « 02 » n'est pas sur la ligne des deux autres. |
| « Ce qu'une entreprise vient chercher ici » | REBUILD | Trois illustrations generees pour trois paragraphes. Le fond est bon : c'est la section qui explique pourquoi c'est gratuit. |
| « Les dons » (sombre) | IMPROVE | Vrai contenu differenciant (l'argent ne passe pas par Riseva). A garder en surface sombre : c'est la carte de tete de cette page. |
| FAQ, sept questions | IMPROVE | Meme gabarit que la page entreprises, meme defaut. |
| Formulaire « quatre lignes » | KEEP, retouches | La phrase a trous est une excellente idee de conversion. Elle merite d'etre l'objet central du dernier ecran. |
| Bandeau final | IMPROVE | Redondant avec le formulaire juste au-dessus. Fusionner. |

## 5. Ce que les deux pages partagent, et qui change

1. **Une police qui se charge.** Instrument Sans et Inter versionnees dans
   `public/brand/polices/`, chargees en `font-display: swap` avec un `preload`.
2. **Une seule surface sombre par page**, la carte de tete. Le reste en papier.
3. **Plus de degrade, plus de verre, plus de filigrane.** Profondeur par
   empilement de surfaces, grain et ombres vertes, comme le systeme le prescrit.
4. **Le produit a la place des illustrations.** Les captures existent, elles sont
   bonnes, elles sont vraies. Quand une photographie est necessaire, une vraie,
   documentaire, sans sourire de banque d'images.
5. **Le heros passe le test des cinq secondes** : qui, pour qui, quel probleme,
   quelle action. Une phrase, un sous-titre, un bouton, une preuve visuelle.
6. **Une progression** par question du lecteur, pas par rubrique du produit.
7. **Un mobile compose pour le pouce**, pas le bureau replie.
8. **Le CSS reecrit** a partir des jetons : un fichier par page ou une base
   commune, sans les couches mortes.

## 6. Ce qu'on ne touche pas, parce que ce serait sortir du projet

La palette, l'encre en couleur d'action, l'interdiction des degrades, la riviere,
la grille tarifaire et ses regles, l'absence de toute preuve inventee, les
formulations juridiques validees (quatorze jours, cloture automatique sans
confirmation, « ne doit reapparaitre nulle part »), l'interdiction des sections
« ce que nous ne faisons pas » et des legendes sous image.
