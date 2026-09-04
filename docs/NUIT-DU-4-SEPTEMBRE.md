# La nuit du 3 au 4 septembre 2026

Refonte des deux vitrines. Tout ce qui est chiffre ici a ete mesure sur la page
rendue, jamais estime. Vingt-huit commits, 776 tests verts.

La matinee du 4 a servi a une seule chose, et elle a rapporte quatre defauts que
772 tests ne voyaient pas : regarder la page. Une capture pleine page, decoupee
en tranches de 2 400 pixels, lue tranche par tranche. Une image agrandie de
92 %, cinq cents pixels de vide dans la bande ou l'on decide, un code QR tranche
en deux, et une ligne du temps dont chaque point designait l'etape d'a cote.
Aucun n'etait dans le CSS : trois etaient dans des FICHIERS, et le quatrieme
dans un rapport entre deux systemes de coordonnees. C'est la lecon de la
matinee, et elle est ecrite en toutes lettres au point 16.

---

## 0. A LIRE EN PREMIER : riseva.fr ne sert pas ce depot

Verification faite sur le site en ligne cette nuit.

| | riseva.fr, en ligne | le depot |
|---|---|---|
| Titre | Riseva, le challenge solidaire des entreprises francaises | Riseva, la plateforme RSE qui commence par les associations |
| H1 | Vos equipes n'ont pas besoin d'un outil de plus. Il leur faut un defi. | Tous vos sites dans un seul rapport. Et vos equipes sur le terrain. |
| Menu | La saison, Cle en main, Les retombees, Le voyage, Le confluent, La FAQ | L'outil RSE, Le challenge, Les associations, Le prix, Questions |
| /associations.html | **404** | 7 161 px, 1 587 mots |
| /app/ | **404** | la demonstration complete |

Le H1 en ligne est celui remplace il y a trois iterations. Aucune des six entrees
du menu en ligne n'existe dans ce depot.

Deux consequences immediates :

1. **Les 1 005 courriels aux associations ne peuvent pas partir.** Ils renvoient
   vers riseva.fr, ou il n'y a aujourd'hui aucune page pour elles.
2. **Tous les boutons « Ouvrir la demonstration » tomberaient en 404.**

Et un piege trouve en chemin : le depot local avait **onze commits d'avance sur
GitHub**, et `pousser.bat` faisait `git checkout -B main paquet/main` a partir
d'un vieux `riseva.bundle`. Ce n'etait pas une mise a jour, c'etait une remise a
l'etat du paquet : **un double-clic aurait efface les onze commits sans un
message**. Le script est corrige et repose dans Green.

**Ce qu'il reste a faire, et que je ne peux pas faire :** double-cliquer
`pousser.bat`, puis verifier dans Vercel que le projet qui sert riseva.fr est
branche sur `yacineRiseva/riseva`, branche `main`. GitHub etait deja plus recent
que riseva.fr avant cette nuit : le lien entre les deux est casse quelque part,
et pousser seul ne suffira peut-etre pas.

---

## 1. Etat initial identifie

L'accueil faisait **16 844 px pour 3 172 mots et dix titres**, soit quinze a
dix-huit ecrans d'affilee. Mesure section par section, le diagnostic tenait en
quatre faits :

- **La page racontait le produit plusieurs fois.** « Chaque chiffre garde sa
  source » occupait 2 081 px pour 93 mots et cinq captures ; « Ce que vous ne
  referez plus a la main » en occupait 1 651 pour 182 mots et defendait le meme
  argument. Leurs deux listes de faits portaient un doublon mot pour mot.
- **Un quart de la page etait un seul bloc sombre.** Les sections associations et
  prix, sombres toutes les deux, se touchaient : 4 255 px de vert d'un seul
  tenant, sans un repere pour dire ou l'une finit.
- **Le mecanisme distinctif arrivait a 57 %.** Avant ce point, Riseva se lit
  comme un outil de reporting colle a un portail d'engagement.
- **Deux pages sur douze portaient une adresse canonique et des balises Open
  Graph.** Les deux pages de conversion n'avaient meme pas de description.

---

## 2. Changements majeurs realises

| | avant | apres |
|---|---|---|
| Accueil, hauteur | 16 844 px | **14 308 px** (-15 %) |
| Accueil, titres H1+H2 | 10 | **9** |
| Accueil, sections | 11 | **9** |
| Plus grand espace sans contenu | 252 px | **209 px** |
| Bloc sombre continu le plus long | 4 255 px (25 %) | **2 036 px**, aucun colle a un autre |
| Feuille de style servie | 206 Ko (52 Ko compresses) | **117 Ko** (23 Ko compresses) |
| Pages avec canonique + Open Graph | 2 sur 12 | **12 sur 12** |
| Pages sans description | 2 | **0** |
| Donnees structurees | aucune | organisation + FAQ, engendrees depuis la page |
| Contrastes sous le seuil AA | 4 | **0** |
| Liens focusables dans un bloc invisible | 4 | **0** |
| Texte cache expose aux lecteurs d'ecran | 5 125 signes | **0** |
| Appuis sur Tab pour traverser la FAQ | 9 | **1** |
| Accueil sur telephone | 21 314 px | **20 920 px** |
| Tests automatises | 654 | **768** |

La page associations fait 7 161 px pour 1 587 mots.

---

## 3. Choix UX importants

**Deux sections fusionnees en une.** « Chaque chiffre garde sa source » etait la
galerie : ses cinq captures sont devenues cinq onglets dans la section outil, qui
fait 1 948 px la ou les deux faisaient 3 732. Aucun fait unique perdu.

**Deux autres fusionnees.** Les ecrans salaries et les affiches repondaient a la
meme question : comment des gens repartis sur vingt sites commencent vraiment.
Un seul titre desormais.

**La boucle du produit remontee de 57 % a 14 %.** En cinq temps, sous la phrase
qui la resume : *ce que vous restituerez ne vient pas de vous, c'est
l'association qui l'a confirme.*

> L'association publie un besoin, a moins de trente kilometres d'un de vos sites
> -> Vos equipes le voient et s'y rendent ensemble
> -> L'association confirme. Sans elle, le resultat reste estime
> -> Riseva consolide, avec la date et la source de chaque ligne
> -> Vous retrouvez le resultat dans votre rapport, sans l'avoir ecrit

**La question qui derange, placee en premier.** « Riseva a-t-elle deja des
resultats a montrer ? » etait la huitieme et derniere de la FAQ. Elle est la
premiere, ouverte par defaut, et sa reponse commence par « Non, et cette page
n'en affiche aucun. »

**Une neuvieme question creee pour une raison mesuree.** La reponse sur le
perimetre faisait 778 px quand les huit autres tenaient entre 342 et 425, parce
qu'elle portait la liste de ce qui n'est pas compris. Comme les fiches sont
empilees sur une seule case de grille, le panneau gardait 778 px pour toutes :
quatre cents pixels de cadre vide sous chacune des autres. La liste est devenue
« Qu'est-ce qui reste a ma charge ? », la question qu'un acheteur pose de toute
facon.

**La lecture en diagonale, mesuree.** `scripts/diagonale.py` extrait ce qu'un
lecteur presse voit vraiment : ce qui est gros, gras, en petites capitales ou
chiffre. **757 mots sur 3 144.** Lus dans l'ordre, ils donnent un argumentaire
complet, de la promesse au remboursement.

---

## 4. Choix de design

**La section du prix passe du vert fonce a l'ivoire.** Le bloc sombre de 4 255 px
n'existe plus, et le fond sombre reprend un sens : il ne marque plus une section
de plus, il marque un changement de sujet.

**Trois cartes remplacees par trois colonnes.** Les chiffres du panneau de verre
etaient trois cartes arrondies avec fond et ombre interieure, dans un panneau de
verre, lui-meme dans une section arrondie : trois niveaux de conteneur pour trois
nombres. Un filet les separe maintenant, comme les quatre faits de la section
outil et comme les quatre temps de la saison juste en dessous. Et surtout comme
le tableau de bord de la plateforme, qui separe ses trois nombres par un filet
depuis toujours : la vitrine ne s'invente pas un idiome, elle rejoint celui du
produit qu'elle montre.

**Quatre piliers alignes sur une grille partagee.** Chacune des quatre grilles se
dimensionnait sur son propre contenu : un titre de deux lignes a cote d'un titre
de quatre, et les paragraphes demarraient a quatre hauteurs differentes.

**Une rangee de trois vignettes supprimee** sur la page associations : quatre
images pour la meme idee, juste sous une photographie de couverture. La
couverture reste, seule et grande.

**Une photographie qui apparaissait deux fois** sur la meme page, a mille deux
cents pixels d'ecart. Celle qui la remplace montre en plus ce que la page ne
montrait nulle part : des salaries en tenue de travail qui partent en mission,
alors que tout le reste etait du cote de la campagne et des animaux.

**Une ligne du temps qui suit le nombre d'etapes.** La grille avait quatre
colonnes et la ligne quatre points pour trois etapes : trois cent dix-neuf pixels
de colonne vide et un point pose au-dessus de rien.

**Le systeme de dessin, mesure.** Trois jetons d'ombre existent, deux sont
employes, seize ombres sont ecrites a la main ; vingt-cinq opacites differentes
du meme ivoire. Ce n'est pas un defaut qu'on corrige a la volee : ramener
vingt-cinq opacites a six change ce qu'on voit, et cela se decide en regardant.
Un test pose donc les comptes du jour comme **plafonds** : la derive ne peut plus
grandir, et le plafond des ombres est deja descendu de 18 a 16.

---

## 5. Ameliorations de copywriting

Regle appliquee partout : **une entreprise sans un seul client ne peut rien
affirmer qu'un lecteur ne puisse verifier.**

| avant | apres | pourquoi |
|---|---|---|
| Douze mois, et vos equipes y sont allees. | Douze mois plus tard, vous n'avez pas de bilan a ecrire. | donnait pour acquis ce que Riseva ne controle pas, puis promettait une automatisation totale que le produit n'offre pas |
| Deux ecrans, et chacun se propose. | Un lien, une affiche, et chacun peut se proposer. | non, chacun ne se propose pas |
| Ce qu'on nous demande vraiment. | Ce que vous voudrez verifier avant de signer. | personne ne nous a encore rien demande |
| Vingt places au tarif fondateur. | On ne vous facture pas une promesse. | on ne comble pas une preuve manquante par une pression |

Le dernier ecran deroule une clause qui dormait dans les engagements de service :
cinq points constates avec le client, verifiables par lui, et s'il en manque un,
acompte rembourse et solde non du. Les vingt places sont descendues sous le
bouton, en condition.

Le composant FAQ prend son titre et son chapeau en argument : les deux vitrines
partageaient le meme, et « les questions qui decident d'une signature »
s'adressait aussi a des associations, qui ne signent rien.

La question du prix ne recopie plus la grille affichee mille deux cents pixels
plus haut : elle ne dit que ce que la grille ne dit pas.

---

## 6. Optimisations techniques

**La feuille servie perd ses commentaires.** `vitrine.css` fait 206 Ko dont 42 %
de commentaires. Ils gardent la memoire de chaque decision et restent dans la
source ; ils n'ont rien a faire chez le visiteur, sur la ressource qui bloque le
premier rendu. `scripts/css.py` ecrit `vitrine.min.css` : **206 Ko -> 117 Ko**,
et **52 Ko -> 23 Ko** une fois compresses.

Le decoupage est fait par un automate a trois etats, pas par une expression
reguliere. La premiere version, qui protegeait les chaines par regex, a pris
l'apostrophe de « l'ecran » dans un commentaire francais pour un debut de chaine,
a mange le `:root{` et a rendu la page entiere en Times New Roman. Deux tests
surveillent : la feuille servie doit etre celle qu'on vient d'ecrire, et le style
**calcule** de chaque element doit etre identique entre les deux feuilles, a 1440
comme a 390 px.

**Les generateurs tournent en tete de recette.** Un « # » place dans un argument
de f-string a arrete `vitrines.py` ; la commande etait lancee avec
`>/dev/null 2>&1` et la recette a tourne trois minutes sur les pages de la veille
avant de les declarer vertes.

**`scripts/clavier.py` est branche sur la recette.** Il existait, tres bien
documente, et n'etait lance par rien : un tiret cadratin est entre dans une
phrase et n'a ete vu qu'en s'en souvenant.

**Referencement.** Les douze pages publiques portent titre, description sous 160
signes, adresse canonique et six balises Open Graph ; le gabarit du dossier
deduit le canonique du nom du fichier. L'accueil porte deux blocs de donnees
structurees, l'organisation et la FAQ, **engendres a partir de la meme liste que
la page affiche** : un test verifie que les deux listes sont identiques et dans
le meme ordre. Rien d'invente, ni note, ni avis, ni effectif, et un test le
verifie aussi.

---

## 7. Ameliorations responsive

Aucun debordement horizontal a **320, 360, 390, 430, 560, 768, 1440, 1920 et
2560 px**, sur les douze pages publiques. Aucun texte ne deborde de sa boite aux
trois largeurs testees sur les trois pages a formulaire.

Sur telephone, trois corrections :

- **le menu etait injoignable.** A 390 px, le bouton allait de 371 a 415 :
  vingt-cinq pixels dehors, un carre de touche coupe. Et une fois le menu ouvert,
  le panneau recouvrait la croix qui le ferme : un menu qu'on ouvrait et qu'on ne
  pouvait plus refermer autrement qu'avec Echap, que personne n'a sur un
  telephone.
- **la FAQ restait sur deux colonnes de 150 px**, parce que la regle de
  proportion avait ete ecrite avec `.vd`, plus specifique que la regle mobile.
- **le panneau de reponses gardait la hauteur de la plus longue**, ce qui
  laissait deux cents pixels de cadre vide sous les courtes. Sous mille pixels la
  raison tombe : les colonnes sont l'une sous l'autre et le script amene deja la
  reponse sous les yeux.

---

## 8. Ameliorations accessibilite

- **Zero texte sous le seuil AA** sur les six pages testees, contraste calcule
  contre le fond reellement peint.
- **Quatre liens invisibles prenaient le focus.** Les huit fiches de FAQ non
  affichees etaient masquees a l'opacite seule : cinq mille cent vingt-cinq
  signes exposes aux lecteurs d'ecran, et quatre liens dans le parcours de
  tabulation. En tabulant dans la FAQ, on atterrissait sur des liens invisibles.
- **Le motif ARIA du sommaire etait a moitie ecrit** : `role="tab"` et
  `aria-selected`, mais rien ne reliait un bouton a sa reponse. Chaque bouton
  designe maintenant sa reponse, chaque reponse nomme son bouton, un seul onglet
  est atteignable au Tab, et les fleches parcourent la liste en emmenant le focus.
- Avec `prefers-reduced-motion: reduce` : **zero element anime, zero transition**,
  tout le contenu opaque. Sans script, rien n'attend un defilement pour
  s'afficher.
- Tous les elements visibles focusables montrent leur focus. Un seul `h1` par
  page, `lang="fr"` partout, aucun saut de niveau de titre, tous les champs
  etiquetes.

---

## 9. Ameliorations performance

- Feuille de style : **52 Ko -> 23 Ko compresses**, sur la ressource bloquante.
- Accueil : **773 Ko** transferes apres defilement complet, 18 requetes, DOM pret
  en 241 ms.
- Images en WebP a deux largeurs, generees par `scripts/images.py` : le plus
  petit fichier de chaque image pese 85 % de moins qu'en JPEG.
- Deux polices renvoient encore 404 : voir le point 15.

---

## 10. Resultats des audits

Trois relectures, menees **separement avant d'etre comparees**. Elles ont
converge sur trois points, ce qui les rend solides : la page raconte le produit
plusieurs fois, une section est un musee de captures d'ecran, l'alternance
clair/sombre ne veut plus rien dire. Les trois ont ete traitees.

Et **trois fausses alertes, refutees a la mesure**. Elles comptent autant : agir
dessus aurait abime la page.

- *« Un vide de 1 100 a 1 200 px entre 86 et 93 %, comme une section
  manquante. »* Mesure bande par bande : le plus grand espace sans contenu de
  toute la page faisait 252 px, et la zone en question etait la FAQ, le bloc de
  texte le plus dense. La perception etait juste, la cause etait ailleurs.
- *« Vingt blocs restent invisibles au defilement. »* Ma propre mesure, par bonds
  de 500 px toutes les 100 ms. Refaite au rythme d'une main humaine, avec la
  touche Fin, avec un lien d'ancre et avec une adresse portant deja son ancre :
  aucun bloc present a l'ecran n'est transparent.
- *« Les trois etapes de la page associations sont mal alignees. »* Le decalage
  est ecrit dans la feuille : il suit la courbe de la ligne du temps. En le
  verifiant, un vrai defaut est apparu : quatre colonnes et quatre points pour
  trois etapes.

---

## 11. Ce que ChatGPT a recommande

**Retenu, derniere passe.** La contradiction tarifaire entre le premier ecran et
la grille, qu'il a placee en tete de sa liste et qui etait bien reelle. Et que
« le bilan s'est ecrit tout seul » promet plus que le produit : le logiciel
collecte, relance, consolide et prepare, mais des humains saisissent, valident et
confirment. Quelqu'un qui connait le reporting entend une formule publicitaire au
milieu d'une page qui vient de construire sa credibilite sur des faits. Le titre
dit maintenant ce qui est vrai : vous n'avez pas de bilan a ecrire.

**Retenu.** La page raconte le produit plusieurs fois. La galerie de captures est
le vrai coupable, pas la section qui l'entoure. « Vingt places au tarif
fondateur » est un tic de startup traduite. « Douze mois, et vos equipes y sont
allees » donne pour acquis ce que Riseva ne controle pas. Et surtout, apres
refonte, sa reponse a la question du pire defaut restant : **le mecanisme qui
distingue Riseva arrive trop tard dans la page** : c'est ce qui a produit la
boucle en cinq temps a 14 %.

Il a aussi pose la condition qui rend le nouveau dernier ecran solide : la
promesse anti-promesse ne tient que si les cinq criteres sont objectifs et
verifiables par le client. Verification faite dans les engagements de service :
ils le sont, et la page le dit.

**Rejete.** Supprimer entierement la section « Trois questions » : voir le point
13. Il a reconnu son erreur : « j'ai confondu masse visuelle et redondance ».

---

## 12. Ce que Gemini a recommande

**Retenu.** Le diagnostic des densites, section par section, qui a designe la
galerie. Le trou noir de 4 255 px, qualifie d'erreur majeure d'UX. Le titre
« Douze mois » comme point de decrochage, trouve independamment de ChatGPT. Et
l'abandon assume de sa propre position sur la rarete : *« un responsable RSE ne
signe pas parce qu'il a peur de rater une promo ; il ne signe pas parce qu'il a
peur de se tromper. »*

**Rejete.** Supprimer la section « Douze mois », supprimer les affiches,
supprimer la FAQ : voir le point 13.

---

## 13. Recommandations rejetees, et pourquoi

**Supprimer « Trois questions, et personne n'a la reponse ».** Mesure : 1 851 px
pour 366 mots et trois maquettes commentees, la meilleure densite de sens de la
page. La vraie galerie etait la section d'a cote, 2 081 px pour 93 mots et cinq
captures. C'est elle qui a fusionne.

**Supprimer « Douze mois ».** C'est le seul endroit ou la page montre ce que
l'entreprise A au bout d'un an, au lieu de ce que le logiciel FAIT. Gardee, avec
un titre corrige.

**Supprimer les affiches** (« micro-feature de com interne »). Pour un dirigeant
multi-sites, la vraie question n'est pas la fonctionnalite, c'est comment des
gens repartis sur vingt sites commencent. L'argument reste, le titre disparait.

**Supprimer la FAQ** (« tu n'as pas de clients, tu n'as pas de FAQ »). L'inverse
a ete fait, en partant du meme diagnostic : une entreprise sans preuve sociale ne
peut pas dire « ils nous font confiance » ; elle peut repondre d'abord a la
question que tout le monde se pose.

**Garder la rarete comme levier.** C'est l'argument « puisqu'il n'y a pas de
preuve sociale » qui a tranche contre lui : on ne comble pas une preuve manquante
par une pression fabriquee.

---

## 14. Bugs corriges

Chacun est protege par un test qui echoue sans lui, verifie en reintroduisant le
defaut.

1. **Le menu injoignable sur telephone**, deux defauts dont le premier avait ete
   cree en corrigeant un troisieme. Teste a quatre largeurs.
2. **La grille tarifaire illisible** apres le passage a l'ivoire : le tableau
   entier en blanc casse sur ivoire, et « a partir de » a **1,00 de contraste**,
   exactement la couleur du fond.
3. **Des captures d'ecran coupees au milieu des mots** : « personnes » devenait
   « nnes », « Villeurbanne » devenait « leurbanne ». Regle desormais testee :
   une photographie peut etre recadree, une capture jamais.
4. **Trois liens d'ancre morts** apres la fusion de deux sections. Teste sur
   douze pages.
5. **La FAQ a deux colonnes de 150 px sur telephone.**
6. **Quatre liens invisibles dans le parcours de tabulation**, et 5 125 signes
   exposes aux lecteurs d'ecran.
7. **Un cadre a moitie vide** sous huit reponses de FAQ sur neuf.
8. **Trois chiffres inventes sur la page d'inscription des salaries** : « 12
   associations verifiees », « 220 missions confirmees », « 1 096 heures de
   benevolat », c'est-a-dire les totaux du jeu de demonstration, sans un mot pour
   le dire, sur la page qui recoit les gens venus par le lien de leur entreprise.
   Ils ne s'affichent plus que sur des donnees reelles.
9. **Le bareme casse sur cette meme page** : une regle de grille declarait trois
   colonnes tout en retirant la premiere du flux, si bien que « Benevolat,
   demi-journee » se cassait en trois morceaux avec « +150 » ecrit par-dessus,
   sur les sept lignes.
10. **Un generateur qui echouait en silence** et une recette qui tournait sur les
    pages de la veille.
11. **Un tiret cadratin** entre dans une phrase, vu seulement en s'en souvenant.
12. **Une ligne du temps** annoncant quatre moments pour trois etapes.
13. **Une contradiction tarifaire sur la meme page.** Le chiffre du premier ecran
    disait « 2 400 a 13 800 EUR » quand la grille, mille pixels plus bas, va
    jusqu'a « a partir de 18 500 EUR ». Lu seul, comme le lit quelqu'un qui
    parcourt la page, il annoncait une fourchette que la page depasse ensuite. Sur
    une entreprise sans client, c'est la donnee qui ne supporte pas l'a-peu-pres :
    la premiere question devient « quel est le vrai prix ». Le chiffre dit
    maintenant « A partir de 2 400 EUR », et sa legende « jusqu'a 13 800 selon
    l'effectif, puis sur devis ». Teste contre le module de tarification.

Les quatre suivants ont ete trouves le lendemain matin, en REGARDANT la page
plutot qu'en lisant du code : une capture pleine page decoupee en tranches, puis
lue tranche par tranche. Les quatre etaient invisibles pour les 772 tests qui
existaient, et chacun a produit sa propre recette.

14. **La photographie de couverture etait agrandie de 92 %.** Elle avait change
    de place la veille, d'une demi-colonne vers toute la largeur de la bande, et
    son attribut `sizes` etait reste a 46vw. Le navigateur, croyant remplir 662
    pixels, servait le fichier de 760 dans une boite de 1 273. La plus grande
    image de la page d'accueil etait donc floue.

    Le rapport mesure, largeur du fichier REELLEMENT choisi contre largeur de
    la boite ou il est peint, est passe de **0,60 a 0,88** (la source de 1 358
    pixels est le plafond). Trois captures qui plafonnaient a 0,90 sont montees
    a 1,16 grace a une variante 1440, produite seulement quand la source la
    porte : on n'agrandit jamais une source pour remplir un nom de fichier.

    Le piege du test : `naturalWidth` ne pouvait pas servir de reference. Avec un
    srcset en `w`, il rend la valeur de `sizes` elle-meme, si bien qu'une
    recette batie dessus aurait valide sa propre erreur. On lit donc la largeur du fichier sur
    le disque.

15. **La derniere bande de la page laissait cinq cents pixels de vert vide.**
    #rejoindre empilait le titre, le paragraphe et l'appel a gauche ; le titre
    plafonne a 13 caracteres et le paragraphe a 52. Le reste de la page place
    deja le titre a gauche et le paragraphe a droite ; ce bloc etait le seul a ne
    pas le faire. Au passage, `.vd .bandeau-cta` etait declare deux fois a dix
    lignes d'intervalle, la seconde annulant la premiere.

    Et la mention sous le bouton tenait sur quatre lignes de capitales de dix
    pixels : `ch` mesure la largeur du zero SANS interlettrage, si bien que 40ch
    ne tenaient que trente caracteres. Deux lignes desormais.

16. **Le gros plan du code QR de l'affiche etait ampute.** La decoupe s'arretait
    a 81,5 % de la hauteur de l'affiche, la carte descend jusqu'a 84,0 % : la
    vitrine montrait une carte a bord arrondi sans bord du bas, et un carre de
    code QR tranche net.

    Aucun controle ne pouvait le voir. Le test de recadrage compare les
    proportions de la BOITE a celles du FICHIER, et elles concordaient
    parfaitement : c'est le fichier qui etait ampute. Le nouveau test lit
    l'image : cinq pixels le long de chaque bord, aucune encre. Temoin :
    l'ancienne decoupe donne 0,57 % de pixels sombres en bas, la nouvelle zero.

17. **Chaque point de la ligne du temps designait l'etape d'a cote.** Les points
    etaient des `<circle>` dans un SVG etire, poses au MILIEU de chaque colonne,
    alors que le texte de l'etape est cale a GAUCHE de la sienne. Mesure a 1 440
    px sur la vitrine associations : etiquettes a 2, 428 et 854 pixels, points a
    207, 620 et 1 033. Sur l'accueil, ou la ligne compte cinq etapes, le dernier
    point tombait au-dela de la derniere.

    Corriger le calcul n'aurait pas suffi : le SVG est etire alors que les
    colonnes sont separees par une gouttiere en `clamp()`, donc la position juste
    depend d'un rapport gouttiere / largeur qui change avec la fenetre. Les
    points sont desormais poses par la MEME grille que les etapes, en
    superposition. Le test ne verifie pas une formule, il compare les positions
    reelles, sur les deux vitrines et a deux largeurs.

---

## 15. Problemes encore presents

**Le deploiement** (point 0) : c'est le seul qui compte vraiment aujourd'hui.

**Deux polices renvoient 404** a chaque chargement, `instrument-sans.woff2` et
`inter.woff2`. Les cinq fichiers ne peuvent etre telecharges ni depuis mon
environnement ni depuis ta machine virtuelle : le proxy bloque les deux
fonderies aux deux endroits, verifie cette nuit. Il faut lancer
`scripts\polices.bat` depuis Windows. Le repli est deliberat et documente, mais
ce n'est pas ce qui a ete dessine.

**Le systeme de dessin** : seize ombres ecrites a la main pour trois jetons,
vingt-cinq opacites du meme ivoire. Le test empeche que ca empire.

**Deux respirations mesurees et assumees** : 160 px sous la zone 2 du panneau de
verre, et 143 px d'ecart entre les deux colonnes de la FAQ associations, contre
8 px sur l'accueil.

---

## 16. Idees pour la prochaine iteration

**Le vocabulaire visuel.** La critique la plus profonde n'a pas ete traitee : *on
pourrait remplacer Riseva par un logiciel de finance et une grande partie de la
grammaire graphique survivrait.* Les photographies sont le seul contrepoids, et
la vitrine entreprises n'en compte que quatre. Une piste concrete : les trente
kilometres autour de chaque site sont la contrainte la plus distinctive du
produit, dite trois fois en mots et montree nulle part. La montrer sans inventer
une densite d'associations qu'on ne peut pas prouver demande d'y reflechir.

**La section « Trois questions »** fait 2 036 px pour 369 mots juste apres un
premier ecran de 1 538 px. Sa hauteur est portee par ses maquettes, pas par son
texte : la reduire demande de decider quelles maquettes sautent.

**Les deux grands ecrans de l'application**, indicateurs (5 496 px) et annonces
(4 762 px), n'ont pas ete regardes cette nuit.

**Regarder la page, systematiquement.** Les quatre defauts de la matinee ont un
point commun : aucun n'etait dans le CSS. Trois etaient dans des FICHIERS (une
image trop petite pour sa boite, une decoupe qui coupait la carte qu'elle
montrait) et le quatrieme dans un rapport entre deux systemes de coordonnees,
un SVG etire d'un cote, une grille en `clamp()` de l'autre. Une recette qui lit
le DOM ne peut voir aucun des quatre : elle verifie que les proportions
concordent, et elles concordaient.

Ce qui les a trouves : `scripts/apercu.py`, une capture pleine page prise en
defilant, decoupee en tranches de 2 400 pixels, lue tranche par tranche. Trois
quarts d'heure pour l'accueil et la vitrine associations. C'est le meilleur
rapport trouve / temps de toute la session, et cela devrait etre fait apres
chaque serie de changements visuels, pas une fois.

**Le tableau de bord d'une association** (`asso-tableau`) montre une seule ligne
de resultat pour sept cents pixels de panneau vide. Ce n'est pas un defaut de
mise en page, c'est le jeu de demonstration qui ne remplit pas l'ecran : la
capture montre le produit comme s'il etait vide. A reprendre du cote des donnees
de demonstration, pas du cote de la decoupe : recadrer pour cacher le vide
serait mentir sur l'ecran.

**La reponse ouverte d'une FAQ occupe 111 pixels dans une boite de 291.** La
boite est calee sur la reponse la plus longue pour que la page ne saute pas
quand on change de question ; c'est le bon compromis, mais il se paie en vide
sur les reponses courtes. Une transition de hauteur reglerait les deux, au prix
d'un risque sur les tests d'apparition.

---

## 17. Fichiers principaux modifies

| fichier | quoi |
|---|---|
| `scripts/vitrines.py` | le generateur des deux vitrines : sections fusionnees, titres, FAQ, donnees structurees |
| `scripts/tests.py` | +122 tests : ancres, contraste, barre mobile, referencement, derive du dessin, apparitions, recadrage, debordement, pieges au clavier, motif onglets, nettete des images, integrite d'un detail decoupe, alignement de la ligne du temps |
| `public/styles/vitrine.css` | prix en clair, filets a la place des cartes, sous-grille des piliers, colonnes de FAQ, captures non recadrees |
| `public/styles/vitrine.min.css` | **nouveau**, engendre : la feuille servie |
| `scripts/css.py` | **nouveau** : l'automate qui l'engendre, et sa verification |
| `scripts/mesures.py` | **nouveau** : les cinq mesures de la nuit en une commande |
| `scripts/diagonale.py` | **nouveau** : ce qu'un lecteur presse voit reellement |
| `scripts/pages.py` | canonique et Open Graph deduits du nom de fichier |
| `public/rejoindre.html` | chiffres de demonstration retires, bareme repare |
| `public/styles/app.css` | la grille du bareme |
| `public/vitrine.js` | roving tabindex du sommaire de FAQ |
| `scripts/images.py` | variante 1440 quand la source la porte, jamais au-dela |
| `scripts/captures.py` | la decoupe du code QR contient enfin la carte entiere |
| `pousser.bat` | ne reecrit plus le depot local |
| les dix pages du dossier | canonique, Open Graph, theme-color |

---

## 18. Etat du build et des tests

```
python3 scripts/tests.py
776 / 776 tests passes
Tout est vert.
```

Les generateurs tournent en tete de recette : `vitrines.py`, `pages.py` et
`css.py` doivent produire leurs fichiers sans un mot sur la sortie d'erreur avant
que le premier navigateur s'ouvre.

Zero erreur JavaScript sur les douze pages. Zero lien interne casse sur treize
cibles distinctes. Trois requetes en echec, toutes connues : `config.js`, qui
n'existe qu'en production par construction, et les deux polices du point 15.

Vingt-huit commits, chacun avec son raisonnement complet dans son message. Le
depot local du dossier Green est a jour et propre ; il a vingt-sept commits
d'avance sur GitHub.

Les huit derniers tests sont ceux de la matinee : la nettete des images sur deux
pages et trois largeurs, l'integrite du gros plan du code QR, et l'alignement des
points de la ligne du temps sur deux vitrines et deux largeurs. Chacun a ete
verifie en reintroduisant le defaut : sans sa correction, il tombe.
