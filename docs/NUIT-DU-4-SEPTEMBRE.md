# La nuit du 3 au 4 septembre 2026

Rapport de la refonte des deux vitrines, section par section, avec les mesures.
Tout ce qui est chiffre ici a ete mesure sur la page rendue, jamais estime.

---

## 0. Ce qu'il faut lire en premier

**riseva.fr ne sert pas ce que contient le depot, et l'ecart n'est pas de
quelques jours.**

Mesure faite cette nuit sur le site en ligne :

| | riseva.fr, en ligne | le depot |
|---|---|---|
| Titre | Riseva, le challenge solidaire des entreprises francaises | Riseva, la plateforme RSE qui commence par les associations |
| H1 | Vos equipes n'ont pas besoin d'un outil de plus. Il leur faut un defi. | Tous vos sites dans un seul rapport. Et vos equipes sur le terrain. |
| Menu | La saison, Cle en main, Les retombees, Le voyage, Le confluent, La FAQ | L'outil RSE, Le challenge, Les associations, Le prix, Questions |
| /associations.html | **404** | 7 161 px, 1 587 mots |
| /app/ | **404** | la demonstration complete |

Le H1 en ligne est celui qui a ete remplace il y a trois iterations. Aucune des
sections du menu actuel n'existe dans le depot. La page destinee aux
associations et la demonstration renvoient toutes les deux une erreur 404.

Deux consequences immediates :

1. **Les 1 005 courriels aux associations ne peuvent pas partir.** Le courriel
   les envoie vers riseva.fr, ou il n'y a aujourd'hui aucune page pour elles,
   seulement une adresse de contact. Une presidente d'association qui clique
   arrive sur une page qui parle de challenge d'entreprise.
2. **Tous les boutons « Ouvrir la demonstration » tomberaient en 404** si les
   pages actuelles etaient mises en ligne telles quelles, tant que /app/ n'est
   pas deploye.

Et un piege trouve en chemin : le depot local a **onze commits d'avance sur
GitHub**, et `pousser.bat`, dans sa version precedente, faisait
`git checkout -B main paquet/main` a partir de `riseva.bundle`, un paquet
ancien. Un double-clic aurait **efface les onze commits sans un message**. Le
script est corrige : il ne reecrit plus jamais le depot local, il annonce
combien de commits partent, et il pousse. La version corrigee est deja dans le
dossier Green.

**Ce qu'il reste a faire, et que je ne peux pas faire :** double-cliquer
`pousser.bat`, puis verifier dans Vercel que le projet qui sert riseva.fr est
bien branche sur `yacineRiseva/riseva`, branche `main`. GitHub est deja plus
recent que riseva.fr : le lien entre les deux est donc casse quelque part, et
pousser seul ne suffira peut-etre pas.

---

## 1. La methode

Trois relectures, menees **separement avant d'etre comparees**, pour eviter le
consensus de politesse.

- La premiere a recu la capture pleine page et une question de directeur de
  creation : les dix defauts qui comptent, et ce qu'il faudrait supprimer
  entierement.
- La seconde a recu la structure MESUREE au pixel, sans image, et la liste des
  titres : un avis structurel, pas une impression.
- La troisieme, la mienne, a mesure.

Elles ont converge sur trois points, ce qui rend ces trois-la solides : la page
raconte le produit plusieurs fois ; une section est un musee de captures
d'ecran ; l'alternance clair/sombre ne veut plus rien dire.

Elles ont diverge sur quatre points, et j'ai tranche sur la verite du produit,
pas sur la majorite. Le detail est au point 3.

---

## 2. Le chiffre d'ensemble

| | avant | apres |
|---|---|---|
| Accueil, hauteur | 16 844 px | **14 308 px** (-15 %) |
| Accueil, titres H1+H2 | 10 | **9** |
| Accueil, sections | 11 | **9** |
| Plus grand espace sans contenu | 252 px | **211 px** |
| Bloc sombre continu le plus long | 4 255 px (25 % de la page) | **2 048 px**, et plus aucun colle a un autre |
| Feuille de style servie | 206 Ko (52 Ko compresses) | **117 Ko** (23 Ko compresses) |
| Pages avec adresse canonique et Open Graph | 2 sur 12 | **12 sur 12** |
| Pages sans description | 2 | **0** |
| Donnees structurees | aucune | organisation + FAQ, engendrees depuis la page |
| Contrastes sous le seuil AA | 4 | **0** |
| Liens focusables dans un bloc invisible | 4 | **0** |
| Appuis sur Tab pour traverser le sommaire de la FAQ | 9 | **1** |
| Texte cache expose aux lecteurs d'ecran | 5 125 signes | **0** |
| Tests automatises | 654 | **758** |

La page associations, refaite en debut de nuit, fait 7 161 px pour 1 587 mots.

---

## 3. Les quatre arbitrages, et pourquoi

**Supprimer « Trois questions, et personne n'a la reponse ». Refuse.**
La premiere relecture la voulait supprimee entierement. Mesure : 1 851 px pour
366 mots et trois maquettes commentees. La section d'a cote, « Chaque chiffre
garde sa source », faisait 2 081 px pour 93 mots et cinq captures. C'etait elle,
la galerie. Elle a ete fusionnee dans « Ce que vous ne referez plus a la main » :
les deux faisaient 3 732 px, la fusion en fait 1 948, et leurs listes de faits
contenaient un doublon mot pour mot. La relecture a reconnu son erreur : « j'ai
confondu masse visuelle et redondance ».

**Supprimer « Douze mois ». Refuse, mais le titre a change.**
C'est le seul endroit ou la page montre ce que l'entreprise A au bout d'un an, au
lieu de ce que le logiciel FAIT. En revanche les deux relectures ont designe ce
titre, chacune de son cote, comme l'endroit ou le lecteur decroche : l'une parce
qu'il sonne nostalgique, l'autre parce que « vos equipes y sont allees » donne
pour acquis ce que Riseva ne controle pas. Il dit maintenant **« Douze mois plus
tard, le bilan s'est ecrit tout seul. »**

**Supprimer les affiches. Refuse, mais la section a disparu.**
Pour un dirigeant multi-sites, la vraie question n'est pas la fonctionnalite,
c'est comment des gens repartis sur vingt sites commencent. Les affiches et les
ecrans salaries ont fusionne sous un seul titre : **« Un lien, une affiche, et
chacun peut se proposer. »** Le verbe a ete corrige apres coup, sur une remarque
juste : non, chacun ne se propose pas, chacun PEUT se proposer.

**Garder « Vingt places au tarif fondateur » comme levier de rarete. Refuse.**
Une relecture defendait le procede *parce qu'il n'y a pas de preuve sociale*.
C'est cet argument-la qui tranche contre lui : on ne comble pas une preuve
manquante par une pression fabriquee. Le dernier ecran dit maintenant **« On ne
vous facture pas une promesse »** et deroule une clause qui dormait dans les
engagements de service : cinq points constates avec le client, verifiables par
lui, et s'il en manque un, acompte rembourse et solde non du. Les vingt places
sont descendues sous le bouton, en condition. La relecture qui defendait la
rarete a abandonne sa position : « un responsable RSE ne signe pas parce qu'il a
peur de rater une promo ; il ne signe pas parce qu'il a peur de se tromper ».

---

## 4. Le pire defaut restant, et ce qui a ete fait

Formule par la premiere relecture, apres refonte : *le mecanisme qui distingue
Riseva arrivait a 57 % de la page.* Avant ce point, un lecteur peut encore lire
Riseva comme un outil de reporting colle a un portail d'engagement, c'est-a-dire
deux modules vendus ensemble.

La boucle est donc posee a **14 %** de la page, en cinq temps, sous la phrase qui
la resume : *ce que vous restituerez ne vient pas de vous, c'est l'association
qui l'a confirme.*

> L'association publie un besoin, a moins de trente kilometres d'un de vos sites
> -> Vos equipes le voient sur leur ecran et s'y rendent ensemble
> -> L'association confirme ce qui a eu lieu. Sans elle, le resultat reste estime
> -> Riseva consolide, avec la date et la source de chaque ligne
> -> Vous retrouvez le resultat dans votre rapport, sans l'avoir ecrit

---

## 5. Les defauts trouves, et le test qui protege chacun

Chaque correction est protegee par un test qui echoue sans elle. Verifie a
chaque fois en reintroduisant le defaut.

**Le menu injoignable sur telephone.** Sur un ecran de 390 px, le bouton de menu
allait de 371 a 415 : vingt-cinq pixels dehors, un carre de touche coupe. Et une
fois le menu ouvert, le panneau passait par-dessus la croix qui le ferme : un
menu qu'on ouvrait et qu'on ne pouvait plus refermer autrement qu'avec la touche
Echap, que personne n'a sur un telephone. Deux defauts, dont le premier avait ete
CREE en corrigeant un troisieme. Teste a quatre largeurs.

**La grille tarifaire illisible.** En passant la section du prix du vert fonce a
l'ivoire, deux teintes ecrites pour le fond sombre sont restees : le tableau
entier en blanc casse sur ivoire, et « a partir de » a 1,00 de contraste,
c'est-a-dire exactement la couleur du fond. Un test mesure maintenant le
contraste calcule contre le fond peint, au seuil AA, sur six pages.

**Des captures d'ecran coupees au milieu des mots.** Deux captures etaient
recadrees a hauteur fixe : « personnes » devenait « nnes », « Villeurbanne »
devenait « leurbanne ». La page montrait des ecrans casses pour prouver que le
produit marche. Regle desormais testee : une photographie peut etre recadree,
une capture jamais.

**Trois liens d'ancre morts.** La fusion de deux sections a laisse trois liens
pointant vers une section disparue. Un lien d'ancre mort ne casse rien de
visible. Teste sur douze pages.

**La FAQ a deux colonnes sur telephone.** En reglant la proportion des colonnes
de la FAQ, la regle a ete ecrite avec `.vd`, plus specifique que la regle mobile
qui remet une seule colonne : sur 390 px, la FAQ restait sur deux colonnes de
150 px et le texte debordait. Teste a trois largeurs sur les deux vitrines.

**Un cadre a moitie vide.** Les neuf fiches de reponse de la FAQ sont empilees
sur la meme case de grille pour que rien ne saute d'une question a l'autre : le
panneau garde donc la hauteur de la plus longue. Huit reponses tenaient entre 342
et 425 px, la neuvieme en faisait 778 parce qu'elle portait la liste de ce qui
n'est pas compris. Quatre cents pixels de cadre vide sous chacune des huit
autres. La liste est devenue la question qu'un acheteur pose de toute facon.

**Un generateur qui echouait en silence.** Un caractere `#` dans un argument de
f-string a arrete `vitrines.py`. La commande etait lancee avec `>/dev/null 2>&1`
et la recette a tourne trois minutes sur les pages de la veille avant de les
declarer vertes. Les generateurs tournent maintenant en tete de recette.

**Un tiret cadratin.** Entre dans une phrase, vu seulement en s'en souvenant.
`scripts/clavier.py` existait, tres bien documente, et n'etait lance par rien.
Il l'est.

**Quatre liens invisibles qui prenaient le focus au clavier.** Les neuf fiches de
reponse de la FAQ sont empilees sur la meme case de grille, et les huit qui ne
sont pas affichees etaient masquees a l'opacite seule. Une opacite nulle ne cache
rien a personne d'autre qu'a l'oeil : mesure faite, **cinq mille cent vingt-cinq
signes** de reponses restaient exposes aux lecteurs d'ecran, et **quatre liens**
prenaient le focus. En tabulant dans la FAQ, on atterrissait sur des liens
invisibles, dans des reponses qu'on n'avait pas ouvertes. Le test qui protege
cette correction est general et ne parle pas de la FAQ : rien de focusable ne
doit vivre dans un bloc transparent. Il distingue les deux cas legitimes, un bloc
qui est en train d'apparaitre au defilement, et une case a cocher invisible
derriere son etiquette, qui doit rester focusable puisque c'est elle le controle.

**Un jeu d'onglets a moitie ecrit.** Le sommaire de la FAQ portait
`role="tab"` et `aria-selected`, mais rien ne reliait un bouton a sa reponse :
un lecteur d'ecran annoncait « onglet, selectionne » sans pouvoir dire de quoi.
Et les neuf boutons etaient dans le parcours de tabulation, donc il fallait
appuyer neuf fois sur Tab pour traverser un sommaire. Le motif est complet :
chaque bouton designe sa reponse, chaque reponse nomme son bouton, un seul
onglet est atteignable au Tab, et les fleches parcourent la liste en emmenant le
focus avec elles.

**Trois cartes pour trois nombres.** Les trois chiffres du panneau de verre
etaient trois cartes arrondies, avec fond et ombre interieure, dans un panneau de
verre, lui-meme dans une section arrondie : trois niveaux de conteneur pour trois
nombres. Ils sont separes par un filet, comme les quatre faits de la section
outil et comme les quatre temps de la saison juste en dessous. Et surtout comme
le tableau de bord de la plateforme, qui separe ses trois nombres par un filet
depuis toujours : la vitrine ne s'invente pas un idiome, elle rejoint celui du
produit qu'elle montre.

**Quatre piliers qui ne commencaient pas a la meme hauteur.** Chacune des quatre
grilles se dimensionnait sur son propre contenu : un titre de deux lignes a cote
d'un titre de quatre, et les quatre paragraphes demarraient a quatre hauteurs
differentes. Les rangees sont maintenant partagees.

**Une ligne du temps qui annoncait quatre moments pour trois etapes.** La grille
avait quatre colonnes et la ligne quatre points, la section trois etapes : trois
cent dix-neuf pixels de colonne vide et un point pose au-dessus de rien.

**La meme photographie deux fois sur la page associations**, a mille deux cents
pixels d'ecart. Celle qui la remplace montre en plus ce que la page ne montrait
nulle part, des salaries en tenue de travail qui partent en mission, alors que
tout le reste etait du cote de la campagne et des animaux.

---

## 5 bis. La lecture en diagonale, mesuree

C'etait la demande d'origine : « qu'on comprenne bien le concept en lisant en
diagonale ». Un outil extrait ce qu'un lecteur presse voit vraiment, c'est-a-dire
ce qui est gros, gras, en petites capitales ou chiffre, et rien d'autre.

**757 mots sur 3 144**, soit un quart de la page. Lus dans l'ordre, ils donnent :
la promesse et la fourchette de prix des les huit premiers pour cent, les quatre
piliers, les trois questions puis la boucle L'ASSOCIATION -> VOS EQUIPES ->
RISEVA -> VOUS, les trois benefices de l'outil et son calendrier, douze mois plus
tard le bilan s'ecrit tout seul, un lien et une affiche, l'association publie
puis confirme avec son bareme, un tarif public avec sa grille et son simulateur,
neuf questions dont la premiere est « avez-vous des resultats », et enfin « on ne
vous facture pas une promesse » avec sa clause de remboursement.

C'est un argumentaire complet et verifiable en 757 mots. La reponse a la question
est oui, avec le chiffre a cote.

---

## 6. Trois fausses alertes, refutees a la mesure

Elles comptent autant que les vraies : agir sur elles aurait abime la page.

**« Un vide de 1 100 a 1 200 px entre 86 et 93 % de la page, comme une section
manquante. »** Mesure bande par bande : le plus grand espace sans contenu de
toute la page faisait 252 px, et la zone en question etait la FAQ, le bloc de
texte le plus dense de la page. La perception etait juste, la cause etait
ailleurs : le desequilibre entre les deux colonnes de la FAQ, corrige au point 5.
La relecture a change sa regle : *« sur une pleine page comprimee, je peux dire
que cette zone parait vide, mais je ne lui attribuerai plus un nombre de pixels
sans source »*.

**« Vingt blocs restent invisibles au defilement. »** Ma propre mesure, par bonds
de cinq cents pixels toutes les cent millisecondes. Refaite au rythme d'une main
humaine, avec la touche Fin, avec un lien d'ancre et avec une adresse portant
deja son ancre : aucun bloc present a l'ecran n'est transparent. C'est cette
phrase qui est devenue l'invariant teste.

**« Les trois etapes de la page associations sont mal alignees. »** Verification
dans la feuille de style : le decalage est ecrit, il suit la courbe de la ligne
du temps. En revanche, en le verifiant, un vrai defaut est apparu : la grille
avait quatre colonnes et la ligne quatre points pour trois etapes. Trois cent
dix-neuf pixels de quatrieme colonne vide et un point pose au-dessus de rien. La
ligne et la grille suivent maintenant le nombre d'etapes.

---

## 7. Systeme de dessin

Etat mesure : trois jetons d'ombre existent, **deux sont employes**, et
**dix-huit ombres sont ecrites a la main**, chacune avec ses propres decalages.
Vingt-cinq opacites differentes du meme ivoire, vingt-et-une du meme encre.

Ce n'est pas un defaut qu'on corrige a la volee : ramener vingt-cinq opacites a
six, ou dix-huit ombres a trois, change ce qu'on voit, et cela se decide en
regardant le resultat. Un test pose donc les comptes du jour comme **plafonds** :
la derive ne peut plus grandir. Les cinq rayons ecrits « 999px » ont repris leur
jeton, le rendu etant identique au pixel.

C'est le chantier P1 le mieux documente qui reste.

---

## 8. Copie et honnetete

Regle appliquee partout : **une entreprise sans un seul client ne peut rien
affirmer qu'un lecteur ne puisse verifier.**

- « et vos equipes y sont allees » -> « le bilan s'est ecrit tout seul »
- « et chacun se propose » -> « et chacun peut se proposer »
- « Ce qu'on nous demande vraiment » -> « Ce que vous voudrez verifier avant de
  signer ». Personne ne nous a encore rien demande : le titre etait une petite
  fiction de plus.
- « Vingt places au tarif fondateur » -> « On ne vous facture pas une promesse »
- La question **« Riseva a-t-elle deja des resultats a montrer ? »** est passee
  de huitieme et derniere a **premiere, ouverte par defaut**. Sa reponse commence
  par « Non, et cette page n'en affiche aucun. » Une entreprise sans preuve
  sociale ne peut pas dire « ils nous font confiance » ; elle peut repondre
  d'abord a la question que tout le monde se pose.
- Le composant FAQ prend maintenant son titre et son chapeau en argument : les
  deux vitrines partageaient le meme, et « les questions qui decident d'une
  signature » s'adressait aussi a des associations, qui ne signent rien.

---

## 9. Referencement

Dix des douze pages publiques n'avaient ni adresse canonique ni Open Graph : un
lien partage dans un message tombait sans titre ni resume. Les deux pages ou l'on
convertit n'avaient meme pas de description. Celle de l'accueil faisait 269
signes la ou les moteurs en affichent environ 155.

Toutes les douze portent maintenant titre, description sous 160 signes, adresse
canonique et six balises Open Graph. Le gabarit du dossier deduit le canonique du
nom du fichier : il n'y a rien a tenir a jour a cote.

L'accueil porte deux blocs de donnees structurees, l'organisation et la FAQ. Les
neuf questions ne sont pas recopiees : elles sont **engendrees a partir de la
meme liste que la page affiche**, et un test verifie que les deux listes sont
identiques et dans le meme ordre. Rien d'invente : ni note moyenne, ni avis, ni
effectif, et un test le verifie aussi.

---

## 10. Performance

- Feuille de style servie : **206 Ko -> 117 Ko**, soit **52 Ko -> 23 Ko** une
  fois compressee. 42 % du fichier etait des commentaires : ils gardent la
  memoire de chaque decision et restent dans la source, ils ne partent plus chez
  le visiteur sur la ressource qui bloque le premier rendu.
- Le decoupage est fait par un automate a trois etats, pas par une expression
  reguliere. La premiere version, qui protegeait les chaines avec une expression
  reguliere, a pris l'apostrophe de « l'ecran » dans un commentaire francais pour
  un debut de chaine, a mange le `:root{` et a rendu la page entiere en Times New
  Roman. Deux tests surveillent : la feuille servie doit etre celle qu'on vient
  d'ecrire, et le style **calcule** de chaque element doit etre identique entre
  les deux feuilles, a 1440 px comme a 390.
- Accueil : 772 Ko transferes au total apres defilement complet, 18 requetes,
  DOM pret en 241 ms.
- Deux polices renvoient encore 404 (`instrument-sans.woff2`, `inter.woff2`).
  Voir le point 12.

---

## 11. Accessibilite, mouvement, responsive

- **Contraste** : zero texte sous le seuil AA sur les six pages testees.
- **Mouvement** : avec `prefers-reduced-motion: reduce`, zero element anime, zero
  transition, et tout le contenu opaque. Sans script, rien n'attend un
  defilement pour s'afficher, ce qui etait deja teste.
- **Responsive** : aucun debordement horizontal a 320, 360, 390, 430, 560, 768,
  1440 et 1920 px. Aucun texte ne deborde de sa boite aux trois largeurs testees
  sur les deux vitrines.
- Un seul `h1` par page, `lang="fr"` partout, aucun saut de niveau de titre.

---

## 12. Ce qui reste, par priorite

**P0, et je ne peux pas le faire a ta place**

1. Double-cliquer `pousser.bat` (la version corrigee, deja dans Green). Onze
   commits partent.
2. Verifier dans Vercel que le projet qui sert riseva.fr est branche sur
   `yacineRiseva/riseva`, branche `main`. GitHub est deja plus recent que
   riseva.fr : le lien est casse quelque part.
3. Ne pas envoyer les 1 005 courriels aux associations tant que
   riseva.fr/associations.html renvoie 404.
4. Lancer `scripts\polices.bat` depuis Windows. Les cinq fichiers `.woff2` ne
   peuvent pas etre telecharges depuis mon environnement ni depuis le tien : le
   proxy bloque les deux fonderies. Sans eux, deux requetes echouent a chaque
   chargement et la page tombe sur la pile systeme. Le repli est deliberat et
   documente, mais il n'est pas ce qui a ete dessine.

**P1, faisable ensuite**

5. Consolider les ombres : dix-huit ecrites a la main pour trois jetons. Le test
   empeche que ca empire ; il faudra regarder le resultat pour baisser le
   plafond.
6. Meme chose pour les opacites : vingt-cinq nuances du meme ivoire.
7. Le vocabulaire visuel. La critique la plus profonde des relectures n'a pas ete
   traitee : *on pourrait remplacer Riseva par un logiciel de finance et une
   grande partie de la grammaire graphique survivrait.* Les photographies sont
   aujourd'hui le seul contrepoids, et sur la vitrine entreprises il n'y en a
   que trois. Une piste concrete : les trente kilometres autour de chaque site
   sont la contrainte la plus distinctive du produit, dite trois fois en mots et
   montree nulle part. Attention : la montrer sans inventer une densite
   d'associations qu'on ne peut pas prouver demande d'y reflechir.
8. La section « Trois questions » fait 2 048 px pour 386 mots juste apres un
   premier ecran de 1 569 px. Une relecture la veut sous 1 000 px. Mesure faite,
   sa hauteur est portee par ses maquettes, pas par son texte : la reduire
   demande de decider quelles maquettes sautent.

**P2, quand il n'y aura plus rien d'autre**

9. La zone 2 du panneau de verre garde 160 px de respiration sous son contenu.
   Les deux libelles sont alignes, le bas de bloc est propre, mais l'espace est
   la.
10. La page associations : 143 px d'ecart entre les deux colonnes de sa FAQ,
    contre 8 px sur l'accueil.

---

## 13. Ce qui a ete ecrit cette nuit

Quatre commits, chacun avec le raisonnement complet dans son message :

- `cef599a` Deux mille quatre cents pixels de redite, et un menu qu'on ne
  pouvait plus fermer
- `6591014` Dix pages qui se partageaient sans titre, et une FAQ qu'aucun moteur
  ne voyait
- `03e2547` Quatre-vingt-neuf kilo-octets de commentaires partaient chez le
  visiteur
- `f3c24bf` Des captures d'ecran coupees au milieu des mots, et un cadre a
  moitie vide

Un nouveau script : `scripts/css.py`. Quatre-vingt-quatorze nouveaux tests, portant
la recette a **748**, tous verts.

