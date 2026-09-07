# Refonte des vitrines : architecture des deux pages et messages principaux

Chaque section repond a une question que le lecteur se pose a ce moment de sa
lecture. Une section qui ne repond a aucune question n'existe pas. Les
formulations entre guillemets sont des propositions de texte, arretees dans la
phase d'ecriture apres controle croise ; les titres marques KEEP sont conserves
mot pour mot.

## A. Site entreprises (`index.html`)

Lecteur : responsable RSE, RH ou dirigeant d'une PME de 20 a 2 000 salaries,
souvent multi-sites, qui ouvre la page entre deux reunions parce qu'on vient de
lui poser une question (un client, un appel d'offres, sa direction).

Conversion principale : **reserver une place** (preinscription gratuite, sans
carte, `inscription.html`). Conversion secondaire : **calculer son tarif**
(simulateur, sur la page) et **ouvrir la demonstration** (`/app/`).

Cible de longueur : 8 sections, 8 500 px au plus a 1440, 12 000 au plus a 390.
Une seule surface sombre : la carte de la saison (section 5).

### 1. Heros : « c'est quoi, pour qui, et j'en fais quoi ? »

- Sur-titre supprime. Mentions reduites a une ligne.
- h1 KEEP : **« Tous vos sites dans un seul rapport. Et vos equipes sur le
  terrain. »** Variantes soumises au controle croise : B « Vos equipes sur le
  terrain, et le rapport qui va avec. » ; C « Le rapport RSE que vos sites
  remplissent, et que des associations confirment. »
- Sous-titre, le mecanisme en une phrase : « Des associations a moins de trente
  kilometres de chacun de vos sites publient ce dont elles ont besoin. Vos
  salaries y repondent. L'association confirme ce qui a eu lieu, et le fait entre
  dans votre rapport, date et source. »
- Bouton principal : « Calculer mon tarif » (ancre `#prix`). Secondaire :
  « Ouvrir la demonstration » (`/app/`, jeu de demonstration).
- Ligne de reassurance sous les boutons : « Tarif public, de 2 400 EUR HT la
  saison. Rien par salarie. Premiere saison : janvier 2027. »
- Preuve : la capture du tableau de bord, seule, grande, dans un cadre a 12 px,
  ombre verte a 8 %. Le badge « Jeu de demonstration » est dans l'interface
  capturee, pas en legende.

Supprimes : la bande des quatre piliers, la rangee des trois chiffres, la
citation du code de la commande publique (elle descend en 5).

### 2. Le mecanisme : « comment ca marche, concretement ? »

Titre : « Quatre moments, et vous n'ecrivez rien. » ou « Ce que vos equipes
font, et comment ca finit dans votre rapport. » Une bande horizontale de quatre
etapes, chacune avec un artefact reel du produit recadre serre :

1. **L'association publie** un besoin a moins de trente kilometres d'un site :
   la carte d'annonce telle que vos salaries la voient.
2. **Vos salaries repondent** depuis leur ecran : la liste « qui vient ».
3. **L'association confirme** ce qui a eu lieu, en un clic, depuis un courriel :
   la page de confirmation, une question, trois reponses.
4. **Le fait entre dans votre rapport** : la ligne de mission, son etat, sa date.

Sous la bande : « Sans confirmation sous quatorze jours, la mission est cloturee
automatiquement sans confirmation, et son resultat reste marque estime partout,
vos rapports compris. » (formule canonique, mot pour mot).

Lien croise discret : « Vous etes une association ? La page qui vous est
destinee. »

### 3. L'outil : « qu'est-ce que ca m'enleve comme travail ? »

Titre KEEP : **« Ce que vous ne referez plus a la main. »** Structure sur les
trois questions qu'on pose a un responsable RSE, chacune avec la capture qui y
repond :

- « Combien de vos sites ont repondu ? » : l'ecran Sites et quotas.
- « D'ou sort ce chiffre ? » : la fiche d'un taux, sa formule, ses sources.
- « Qu'est-ce que vos equipes ont fait cette annee ? » : le tableau des
  missions et leurs etats.

Une phrase de methode sous chaque capture (rapport de sommes, jamais moyenne de
taux ; qui a saisi, qui a approuve ; confirme ou estime). Les cinq onglets
disparaissent : trois captures visibles valent mieux qu'une visible et quatre
cachees. Les quatre mots-cles restants (dictionnaire, registre de securite,
fiche VSME, groupes et filiales) deviennent une ligne de liens vers la
demonstration.

### 4. Les equipes : « comment mes salaries s'y mettent ? »

Titre KEEP : **« Un lien, une affiche, et chacun peut se proposer. »**
L'affiche A3 en grand (le seul objet physique du produit), le bas de l'affiche
avec le code QR, et pour le lecteur sur telephone le lien cliquable equivalent.
Deux paragraphes : le lien d'inscription et l'affiche generee avec lui ; les
quatre envois compris dans la saison. Une phrase d'honnetete KEEP : « Leur
participation reste volontaire, et nous ne vous promettons pas un taux
d'engagement que nous n'avons pas encore mesure. »

### 5. La saison : « qu'est-ce que je pourrai en dire en fin d'annee ? »

La seule carte sombre de la page. Titre KEEP : **« Douze mois plus tard, vous
n'avez pas de bilan a ecrire. »** Les quatre temps de la saison (janvier :
lien ; fevrier a octobre : missions et confirmations ; chaque trimestre : le
rapport ; mi-janvier : le bilan annuel avec son dossier de tracabilite). Les
trois parametres (12 mois sans reconduction tacite, 4 rapports, 30 km).

Phrase KEEP en appui : **« Ce qui est confirme entre dans votre bilan. »** Et ce
qui ne l'est pas y reste marque comme tel.

Preuve, l'idee de Gemini rendue honnete : « Voir un rapport tel qu'il sort »,
lien vers l'ecran Rapports de la demonstration. En aparte, compact, la citation
du code de la commande publique (critere environnemental obligatoire depuis le
21 aout 2026, source), parce que c'est la question qu'un acheteur repondant aux
appels d'offres se pose ici.

Le bareme en points ne figure plus sur la page : « Le bareme complet est dans le
reglement. » Le classement est mentionne en une phrase : entre entreprises
comparables, la moitie basse jamais nommee.

### 6. Le prix : « combien ? »

Remonte de la position 7 a la position 6, juste apres la saison. Titre KEEP :
**« Un tarif public, avant de decider. »** La grille six lignes, lue depuis
`data.js`. Le simulateur (effectif, sites) en tete de section, pas en pied : il
est l'outil de conversion. « Ce qui est compris » en une colonne. Le tarif
fondateur et la regle de reglement en deux phrases, sans garantie de prix.
Bouton : « Reserver une place ».

### 7. Les objections : « ce que je voudrai verifier avant de signer »

Titre KEEP : **« Ce que vous voudrez verifier avant de signer. »** Les neuf
questions en accordeon `<details>`, toutes visibles, la premiere ouverte
(« Riseva a-t-elle deja des resultats a montrer ? Non. ») parce que c'est celle
qui decide de la confiance.

### 8. La decision : « et si ca ne marche pas chez moi ? »

Titre : « La saison commence quand l'outil marche chez vous. » Les cinq criteres
de demarrage, constates ensemble ; l'acompte rembourse et le solde non du s'il
en manque un. Bouton principal « Reserver une place », reassurance : gratuit,
sans carte, tarif fondateur pour les vingt premieres entreprises jusqu'au
31 decembre 2026, sur la premiere saison seulement.

Pied de page commun (trois colonnes, lien croise « Vous etes une association »),
identite legale des reception du Kbis.

## B. Site associations (`associations.html`)

Lecteur : presidente, tresorier ou benevole d'une petite association, qui lit
sur son temps libre, a deja ete sollicitee par des plateformes, et se demande
d'abord ce qu'on lui veut.

Conversion principale : **envoyer les quatre lignes** du formulaire (lien de
connexion, espace ouvert). Aucune conversion secondaire payante : tout est
gratuit.

Cible : 7 sections, 5 500 px au plus a 1440, 8 000 au plus a 390. Une seule
surface sombre : la carte de l'argent (section 5).

### 1. Heros : « qu'est-ce qu'on me veut, et combien ca coute ? »

- Sur-titre KEEP : **« Gratuit. Ce sont les entreprises qui paient. »**
- h1 KEEP : **« Ecrivez ce qui vous manque. Des entreprises d'a cote peuvent y
  repondre. »**
- Sous-titre KEEP : « Des bras pour une demi-journee, du materiel dont une
  entreprise n'a plus l'usage, ou un don. Vous decidez de ce que vous acceptez,
  et c'est vous qui confirmez ce qui a eu lieu. »
- Bouton principal : « Ecrire ce qui nous manque » (ancre `#commencer`).
  Secondaire : « Voir comment ca marche ».
- Preuve : l'illustration generee disparait. A sa place, la carte d'annonce
  telle qu'un salarie la voit, avec ses places, sa date, son rayon, marquee
  « demonstration » dans l'interface.
- Trois reperes au lieu de quatre, la gratuite n'etant plus repetee :
  **5 minutes** pour une premiere annonce, six modeles deja ecrits ;
  **1 courriel** pour confirmer, sans se connecter ;
  **30 km** : le rayon dans lequel les salaries des entreprises abonnees voient
  vos besoins.

Le paragraphe « Vous ne changez rien a ce que vous faites deja » et la capture
« 81 animaux pris en charge » disparaissent.

### 2. Comment ca marche : « qu'est-ce que je dois faire, exactement ? »

Titre : « Publier, accueillir, confirmer. » (remplace « Trois gestes, et c'est
tout », qui promettait trop). Trois etapes, un artefact reel chacune :

1. Vous publiez : le formulaire d'annonce et ses six modeles, il suffit de
   changer la date et le nombre de places. Rien ne part sans relecture.
2. Ils viennent : la liste de qui vient et pour quelle date. Vous acceptez ou
   vous refusez, sans vous justifier.
3. Vous confirmez : la page qu'ouvre le courriel, une seule question, trois
   reponses dont « realisee partiellement » avec le chiffre reel.

Bouton repete pour les convaincus : « Ecrire ce qui nous manque ».

### 3. Votre controle : « qu'est-ce que je garde en main ? » (nouvelle)

Titre : « Vous gardez la main, du debut a la fin. » Une liste courte, en
phrases completes, pas en cartes : vous choisissez le besoin, la date et le
nombre de places ; vous acceptez ou refusez une proposition d'un clic ; vous
modifiez ou retirez une annonce quand vous voulez ; vous ne confirmez que ce
qui a eu lieu, et un silence n'est jamais une faute ; vous fermez votre compte
quand vous voulez et vos donnees suivent.

Et la question que personne ne pose a votre place : qui est assure. « Sur son
temps de travail, un salarie reste couvert par son employeur : un accident chez
vous est un accident du travail. Hors temps de travail, c'est un benevole :
votre responsabilite civile couvre ce qu'il cause, pas ce qu'il subit. La charte
detaille qui couvre quoi, et l'annonce doit le dire. »

### 4. Pourquoi elles viennent : « pourquoi une entreprise viendrait chez moi ? »

Trois phrases, sans photographie. « Une entreprise paie un abonnement a Riseva
pour que ses salaries trouvent une action concrete pres de leur lieu de travail,
et pour retrouver ce qu'ils ont fait dans son rapport RSE. Le mecenat de
competences et le don en nature lui ouvrent une reduction d'impot (article 238
bis du CGI). C'est pour vous rencontrer qu'elle paie. » La derniere phrase
remplace « Vous n'etes pas le produit, vous etes ce qu'elles cherchent » ;
variantes au controle croise.

Ce que ca vous donne, en une phrase que la recherche a fait ressortir : chaque
mission confirmee vous laisse une trace datee, exportable, que vous pouvez
montrer a vos propres financeurs.

### 5. L'argent : « qui touche l'argent ? »

La carte sombre. Titre : « L'argent ne passe jamais par Riseva. » (remplace
« L'argent arrive directement chez vous », trop absolu). Deux circuits, aucun ne
passe par Riseva : le virement direct du donateur sur votre compte, avec une
reference ; ou, si vous en avez une, votre propre page HelloAsso, dont vous
collez l'adresse publique. Aucune commission, aucun delai de reversement. Les
recus fiscaux restent les votres : sous mandat ecrit, Riseva prepare le
document, vous le relisez et le signez.

### 6. Vos questions : « ce que je voudrai verifier avant de m'inscrire »

Les sept questions en accordeon, la question « Et si personne ne vient ? »
mise en premier, ouverte : c'est celle qui fait la difference avec le secteur.
Ajout : « Qui est assure ? » renvoyant a la charte.

### 7. Commencer : « comment on s'inscrit ? »

La phrase a trous est le dernier ecran, fusionnee avec le bandeau. Titre KEEP :
**« Quatre lignes, un lien, et votre espace est ouvert. »** Le bouton termine la
phrase et dit ce qui se passe vraiment : « Envoyer, et preparer notre premiere
annonce ». Sous le bouton : « Vous recevez un lien de connexion, sans mot de
passe. Votre annonce parait une fois votre enregistrement verifie, sous deux
jours ouvres. »

Et la phrase de lancement, en clair : « Premiere saison en janvier 2027. Vous
rejoignez un reseau qui se constitue : votre tableau de bord vous dira combien
d'entreprises abonnees ont un site a moins de trente kilometres de chez vous, et
il ecrira zero si c'est zero. »

Accessibilite du formulaire : chaque trou est un `<input>` avec son `<label>`
(visible au lecteur d'ecran, la phrase reste lisible a l'oeil), `autocomplete`
renseigne, 16 px minimum, cible de 44 px, ordre de tabulation dans l'ordre de
la phrase, erreurs sous la phrase, et une version empilee en dessous de 640 px
ou chaque champ passe sur sa ligne avec son libelle visible.

## C. Ce que les deux pages partagent

- Le pied de page, le lien croise, la formule canonique des quatorze jours, la
  mention « Riseva n'encaisse rien », la date de la premiere saison.
- Le point de jonction visible des deux cotes : la confirmation. Sur le site
  entreprises c'est le moment 3 du mecanisme ; sur le site associations c'est
  l'etape 3 et la FAQ. Meme artefact, meme phrase.
- Aucun texte miroir : la page associations ne parle jamais de rapport RSE ni
  de VSME. La page entreprises ne parle du recu fiscal qu'a un endroit, la
  question de la FAQ « Est-ce que la depense est deductible, et qui emet le
  recu ? », parce que le directeur financier la pose (controle croise n. 2,
  Gemini) ; elle n'en parle nulle part ailleurs, et jamais dans le premier
  ecran. (Regle amendee apres le controle n. 2 : elle disait « jamais ».)

## D. Decisions apres controle croise n. 2

Les deux critiques integrales sont dans `annexes/archi-chatgpt.md` et
`annexes/archi-gemini.md`. Ce qui suit est l'arbitrage, point par point, avec la
raison quand les deux relecteurs divergent. Les faits invoques ont ete verifies
dans `public/app/data.js`, `public/cgv.html`, `public/inscription.html` et
`public/charte-associations.html` avant de trancher.

### Entreprises

1. **h1 : A, conserve.** ChatGPT garde A ; Gemini prefere C. C est inexacte
   (les associations confirment une action, pas le rapport ; les sites ne
   « remplissent » rien) et fait passer Riseva pour un outil de reporting
   d'abord. L'objection de Gemini (« deux idees sans les lier ») est traitee par
   le sous-titre, qui nomme le mecanisme et la source : « L'association confirme
   ce qui a eu lieu, et c'est cette confirmation qui entre dans votre rapport,
   avec sa date. » Le mot « source » disparait.
2. **Ligne de reassurance : « a partir de 2 400 EUR HT la saison »**, jamais
   « de 2 400 EUR ». Le prix est un plancher.
3. **Section 2 : « De l'annonce au rapport, sans ressaisir la mission. »**
   « Quatre moments, et vous n'ecrivez rien » etait faux (les indicateurs
   sociaux se saisissent ailleurs dans le produit). Gemini l'acceptait ; le
   critere de verite l'emporte.
4. **La formule des quatorze jours** devient une note sous le moment 3 (la
   confirmation), mot pour mot. Ce n'est plus un slogan sous la bande.
5. **Section 3 : les trois questions restent la structure, mais les titres
   deviennent des affirmations** (Gemini : « vous n'etes pas un quiz, vous etes
   un tableau de bord ») et la question du lecteur ouvre le paragraphe. La mise
   en page casse la symetrie : une capture large, deux etroites, pas trois
   colonnes identiques. Aucun chiffre du jeu de demonstration n'est repris dans
   le texte.
6. **Section 4 fusionnee.** L'affiche perd son ecran entier (ChatGPT). Elle
   partage la section avec la charge cote client, la question que ChatGPT
   juge decisive et que Gemini formule cote informatique : qui declare les
   sites et nomme un referent, qui envoie le lien, qui saisit les indicateurs
   a chaque campagne, et ce qu'il n'y a pas a faire (rien a installer, aucun
   annuaire a synchroniser, pas d'acces a votre reseau : la connexion se fait
   par lien envoye par courriel, verifie dans `data.js`). Les « quatre envois »
   sont expliques ou rien : ce sont les quatre kits postaux de `KITS_SAISON`
   (lancement en janvier, resultats du premier trimestre en avril, besoins de
   rentree en aout, bilan en novembre), imprimes et envoyes a chaque site.
7. **Carte sombre allegee.** La rangee 12 mois / 4 rapports / 30 km disparait
   (ChatGPT ; c'est le composant « trois stats » d'un gabarit). La citation du
   code de la commande publique quitte la carte (les deux relecteurs) et devient
   une question de la FAQ. Le titre « Douze mois plus tard, vous n'avez pas de
   bilan a ecrire » reste : Gemini le juge use ici alors qu'il le classait
   parmi les phrases a garder mot pour mot dans son premier audit, et sa
   variante (« Juin 2028 ») invente une date qui ne correspond a rien (le bilan
   annuel sort mi-janvier). La carte culmine sur le rapport : lien « Voir un
   rapport tel qu'il sort » vers l'ecran Rapports de la demonstration.
8. **Le bouton ne dit plus « Reserver une place ».** Verifie dans
   `inscription.html` : la page est une preinscription gratuite, sans carte,
   sans engagement ; l'acompte vient plus tard, si l'entreprise signe. Le bouton
   dit donc ce qu'il fait, « Se preinscrire », et sa ligne d'appui fixe le
   moment de l'engagement : « Gratuit, sans carte, sans engagement. L'acompte
   vient plus tard, si vous signez. » Plus de contradiction gratuit / acompte.
9. **Section 8** : le titre reste parce que les cinq criteres sont
   contractuels (`engagements.html`, CGV article Demarrage) et sont listes
   exactement. La sequence est ecrite : preinscription, puis bon de commande et
   acompte de 40 % (900 EUR au minimum), puis demarrage constate sur les cinq
   criteres, sinon acompte rembourse et solde non du. Le tarif fondateur est
   rappele en une phrase (vingt places, jusqu'au 31 decembre 2026, premiere
   saison seulement). « On ne vous facture pas une promesse » disparait.
10. **FAQ** : conserve les neuf reponses existantes (elles sont deja franches),
    corrige « juste au-dessus », et ajoute trois questions : ce que Riseva
    demande a l'equipe pendant l'annee, s'il faut une integration informatique,
    et ce que ca vaut dans un appel d'offres (la citation du code de la commande
    publique y trouve sa place). Le recu fiscal y est precise avec les termes
    du produit : emis par l'association, seule habilitee, au modele Cerfa
    16216 (2041-MEC-SD), prepare par Riseva sous mandat ecrit et revocable,
    verifie et signe par l'association (`MANDAT_RECUS` dans `data.js`).

### Associations

11. **Ordre conserve** (les deux relecteurs).
12. **Assurance : reecrite avec la prudence de la charte, pas plus fort que le
    droit** (ChatGPT). Gemini demandait de ne pas toucher une virgule, mais le
    resume propose etait plus categorique que la charte elle-meme, qui parle de
    garantie individuelle accident et de convention d'assistance benevole. La
    vitrine dira : sur le temps de travail, le salarie reste salarie et un
    accident chez vous releve de son regime d'accident du travail ; hors temps
    de travail, il est benevole et la couverture depend de votre contrat, votre
    responsabilite civile couvrant en general ce qu'il cause, pas forcement ce
    qu'il subit ; la charte detaille qui couvre quoi et l'annonce doit le dire.
    Pas de version plus courte.
13. **« Elle paie pour vous trouver, pas l'inverse. »** retenue par les deux,
    placee en conclusion apres ce que comprend reellement l'abonnement.
14. **238 bis au conditionnel** : « peut lui ouvrir une reduction d'impot,
    selon la nature du don et de l'organisme ».
15. **La trace exportable** est decrite comme ce qu'elle est : la liste datee
    des missions confirmees, exportable, pour le conseil d'administration et
    les financeurs. Jamais « preuve d'impact ».
16. **Bouton final : « Ouvrir notre espace »** (ChatGPT). « Publier notre
    besoin » (Gemini) promettrait une publication que l'envoi ne declenche pas.
    Le titre « Quatre lignes, un lien, et votre espace est ouvert » reste.
17. **« Sous deux jours ouvres » supprime** : la charte ne s'engage sur ce
    delai que pour l'accuse de reception d'un signalement, pas pour la
    verification d'un enregistrement. La phrase devient : « Votre premiere
    annonce parait des que nous avons verifie votre enregistrement. »
18. **Les trois reperes (5 minutes, 1 courriel, 30 km) ne forment plus une
    rangee de chiffres** : ils deviennent une phrase sous les boutons. Le
    rayon de trente kilometres, que Gemini veut mis en avant, est dans le
    sous-titre du heros et dans la phrase de lancement.

### Les deux pages

19. La symetrie n'est plus recherchee : quatre moments parce que le mecanisme
    en a quatre, trois ecrans avec une mise en page inegale, une liste de cinq
    criteres parce qu'ils sont cinq au contrat. Aucune rangee de chiffres.
20. FAQ : `<details>` sobre, signe plus, hairline encre, question en
    Instrument Sans, reponse compacte en Inter (Gemini). C'est ce que
    `05-LANGAGE-VISUEL.md` decrivait deja.

## E. Decisions apres controle croise n. 3 et 4 (premiere implementation)

Les deux relecteurs ont recu les memes sept captures de la premiere
implementation (`annexes/impl-chatgpt.md`, `annexes/impl-gemini.md`). ChatGPT a
travaille en raisonnement eleve ; Gemini en « Flash-Lite Extended », ses quotas
Pro et Flash etant epuises ce soir-la : sa relecture est pesee en consequence,
et deux de ses citations « a couper » ne figurent pas sur la page (note en fin
de son annexe). Ce qui suit est tranche point par point.

### Entreprises

1. **Sous-titre du heros raccourci** (ChatGPT). Il garde un ancrage concret,
   parce que c'est ce qui distingue Riseva d'un outil de reporting, mais en
   trois phrases : « A moins de trente kilometres de vos sites, des refuges, des
   epiceries solidaires, des chantiers de plantation publient ce qui leur
   manque. Vos salaries se proposent. L'association confirme ce qui a eu lieu,
   et cette confirmation, datee, entre dans votre rapport RSE. »
2. **La ligne sous les boutons cesse de ressembler a une mention legale**
   (ChatGPT) : corps 1 rem, encre 600, plus de gris clair. Elle porte le prix,
   « rien par salarie » et la date de la premiere saison : trois faits
   commerciaux, pas des reserves.
3. **Un tiers des sur-titres en capitales disparait** (ChatGPT). Ceux qui
   repetent le titre partent : « Comment ca marche », « Le tarif », « Vos
   questions », « Avant de vous engager ». Restent ceux qui situent une partie
   du produit que le titre ne nomme pas : « L'outil RSE », « Vos equipes », « La
   saison », et l'etiquette « Votre tranche » du simulateur.
4. **Les quatre moments prennent des masses comparables** (ChatGPT). Chaque
   ecran est pose sur un meme tapis (papier creuse, filet, rayon 20) au meme
   format ; l'ecran garde ses proportions dedans, jamais recadre. La sequence
   se lit comme quatre plaques egales, pas comme quatre objets de tailles
   accidentelles. L'ecran « qui vient » est repris en triple densite pour
   supporter d'etre affiche un peu plus grand que nature.
5. **La question 1 de l'outil change d'ecran.** « Combien de vos sites ont
   repondu ? » etait illustree par « Sites et quotas », qui repond a une autre
   question. L'ecran qui y repond mot pour mot est la carte « Collecte des
   indicateurs » (sites qui ont repondu, approuves, en attente, echeance), et
   elle est lisible telle quelle sur un telephone. Le paragraphe est reecrit
   sur cet ecran. L'introduction « Trois questions qu'on pose... » disparait :
   les questions en amorce suffisent.
6. **Captures telephone** (ChatGPT, indispensable n. 1). Sous 640 px, chaque
   ecran complexe est remplace par la capture du meme ecran dans la mise en
   page telephone de l'application (`<picture>`, comme le heros) : carte
   d'annonce, lignes de mission (colonnes mission et etat), collecte,
   consolide (deux indicateurs), missions (cinq lignes, mission et etat),
   rapports (rapport, etat, envoi), formulaire d'annonce, page de confirmation
   a 390 px, carte « qui peut venir ». Le defilement horizontal dans un cadre
   (`shot-defile`) disparait : un tableau qu'il faut faire glisser pour lire
   l'etat n'est pas une preuve.
7. **« Soit 25,2 EUR par salarie » quitte le simulateur** (ChatGPT). Le heros dit
   « rien par salarie » ; une division arithmetique a cote fabrique une
   ambiguite. Le simulateur donne le montant de la saison et l'acompte.
8. **La FAQ s'elargit** a 820 px (ChatGPT) : des questions sur deux lignes dans
   une colonne de 720 laissaient trop de papier vide.
9. **Le final montre cinq criteres, pas un paragraphe** (ChatGPT) : une phrase
   d'amorce, une liste de cinq, une phrase sur le remboursement, puis les trois
   etapes. Gemini demandait de garder la condition de remboursement mot pour
   mot : elle l'est.
10. **« Ce que ca demande chez vous » passe avant l'affiche** (ChatGPT), en
    premiere colonne, plus large ; l'affiche est a droite, reduite a 400 px.
    Les deux paragraphes sur le lien et l'affiche deviennent un seul.
11. **Champs du simulateur plus lisibles** (Gemini) : bordure encre 300 a
    1,5 px sur fond haut, etiquettes en encre 600.
12. **La premiere question de la FAQ reste « Riseva a-t-elle deja des resultats
    a montrer ? Non. »** Gemini voulait la remplacer par « Comment une
    plateforme qui lance sa premiere saison garantit-elle son serieux ? Par des
    engagements contractuels stricts adosses a des criteres de demarrage
    verifiables. » Refuse : c'est le jargon que la page bannit, et la question
    cache ce que la vitrine a decide d'assumer (voir section D, et l'audit n. 1
    de ChatGPT : « assumer visiblement premiere saison janvier 2027 »). La
    reponse, elle, enchaine deja sur ce qui est contractuel des le premier jour.
13. **Introduction du mecanisme** reecrite (ChatGPT) : « Quatre ecrans du
    produit, issus du jeu de demonstration. L'interface est reelle, les noms et
    les chiffres sont fictifs. »

### Associations

14. **« Ils viennent » devient « Des salaries se proposent »**, et le titre
    « Publier, accueillir, confirmer » devient « Publier, choisir, confirmer »
    (ChatGPT). A ce moment, personne n'est encore venu.
15. **La note sous les boutons du heros explique les points** (ChatGPT, test
    des cinq secondes : « pourquoi des points ? »). La carte d'annonce reste
    telle que le salarie la voit, points compris ; la phrase dit qu'ils
    comptent pour l'entreprise et jamais pour l'association. Pas de libelle
    au-dessus de l'image : la regle « aucune legende » tient, l'explication est
    dans le texte.
16. **L'assurance quitte l'encart** (ChatGPT et Gemini, convergents). Elle
    devient la seconde colonne de « Vous gardez la main », en texte courant :
    un titre « Qui est assure ? », deux paragraphes, le lien vers la charte.
    Plus courte que l'encart, pas plus forte que le droit (section D, n. 12).
17. **La fiche « Votre fiche » disparait** (ChatGPT) : elle repetait les quatre
    champs qu'on venait de remplir. Le formulaire occupe toute la largeur de
    lecture ; le script ne garde que la validation et l'envoi.
18. **L'export rejoint la phrase qu'il prouve** (ChatGPT) : la section
    « Pourquoi elles viennent » devient une colonne de lecture, et la carte
    « Pour votre conseil d'administration » est posee sous « Ce que ca vous
    laisse », sur son tapis. Une phrase de plus dit ce que sont les points :
    un classement entre entreprises, jamais entre associations.
19. **« Vous ne perdez rien » disparait** de « Et si personne ne vient ? »
    (ChatGPT) : une annonce sans reponse coute du temps. « Ca peut arriver,
    surtout la premiere saison. Votre annonce reste publiee et le tableau de
    bord indique combien d'entreprises abonnees ont un site a moins de trente
    kilometres, y compris zero. »
20. **La publication apres verification est dite sans automatisme** (ChatGPT) :
    « Apres verification de votre enregistrement, vous publiez votre premiere
    annonce. »
21. **La carte sombre s'empile sous 640 px** (ChatGPT, indispensable n. 2) : les
    deux colonnes des dons etaient cote a cote sur 390 px. Son premier
    paragraphe est raccourci d'une ligne.
22. **La phrase sur les recus fiscaux ne change pas.** Gemini proposait « Vous
    emettez vos propres recus fiscaux apres validation, sur un cadre valide
    ensemble » : « cadre valide ensemble » ne veut rien dire, et la version en
    place dit le mandat ecrit, la relecture et la revocation.

### Les deux pages

23. **Telephone** : sections a 48 px, moments et etapes resserres, texte des
    moments un cran plus court (Gemini n. 5, ChatGPT « couloir vertical »).
24. **Le badge « Demonstration »** de la barre de l'application n'est pas
    retouche (Gemini n. 4) : c'est le produit, et il n'apparait que sur les
    ecrans qui montrent la barre.
25. Les captures qui n'illustrent plus rien (« Sites et quotas ») sont
    supprimees avec leurs variantes ; `captures.py` retire desormais de
    `public/captures/` tout fichier qu'il n'a pas produit.

## F. Decisions apres controle croise n. 5 et 6 (version quasi finale)

Les deux relecteurs signent la mise en ligne (`annexes/final-chatgpt.md`,
`annexes/final-gemini.md`), l'un sans nouvelle passe de creation, l'autre a la
condition de deux corrections. Ce qui est retenu, et ce qui ne l'est pas :

1. **« Cinq minutes pour une annonce » disparait** (ChatGPT). La duree n'a
   jamais ete mesuree ; la regle « aucun chiffre invente » vaut aussi pour un
   chronometre. La note du heros dit « Six modeles pour ecrire votre premiere
   annonce, un courriel pour confirmer », la FAQ « Le temps d'ecrire une annonce
   a partir d'un des six modeles ».
2. **« Les missions ne vous demandent rien » devient « Pour les missions,
   l'association confirme le resultat : vous n'avez pas a le ressaisir »**
   (ChatGPT), dans la liste et dans la FAQ : promettre ce que le produit fait,
   pas plus.
3. **Les cinq criteres du final et de la FAQ sont ceux des engagements de
   service, mot pour mot** (ChatGPT, verification de coherence). La
   verification a trouve un ecart : « l'inventaire associatif convenu est
   disponible » n'existe pas dans les engagements, qui disent « des
   associations verifiees et actives sont presentes autour de vos sites, et
   leur nombre vous est donne site par site ». Corrige, avec le lien vers la
   page, et un test compare desormais les deux textes. Le tarif fondateur,
   l'acompte, le solde et l'escompte ont ete relus contre les CGV : conformes.
4. **La participation : « La participation reste volontaire. Aucun taux de
   participation n'est promis. »** (ChatGPT ; « taux d'engagement » evite,
   c'est le mot du secteur).
5. **Le sous-titre du heros en deux phrases nettes** (ChatGPT) : « L'association
   confirme ce qui a eu lieu. Cette confirmation, datee, entre dans votre
   rapport RSE. »
6. **Les champs de la phrase a trous prennent un fond** (Gemini, condition de
   signature) : papier releve sur la section creusee, coins hauts arrondis, le
   filet reste. Un mot souligne seul se lit comme un lien, pas comme une zone de
   saisie.
7. **Les deux chemins de l'argent en « Soit... soit... »** (Gemini), avec les
   mots de la page : « Soit un virement du donateur sur votre compte, avec une
   reference a retrouver sur votre releve. Soit votre propre page HelloAsso,
   dont vous collez l'adresse : le donateur paie par carte chez HelloAsso, et
   l'argent arrive chez vous. » Pas « via », pas « les fonds vous
   parviennent ».
8. **Refuse** : « Cela peut arriver » a la place de « Ça peut arriver »
   (Gemini a lu « Ce peut arriver », qui n'est pas sur la page ; « Ça » est le
   registre de la page, et c'est la formulation que ChatGPT avait proposee) ;
   la reecriture de « La fiche de durabilite VSME : ce que Riseva sait... »
   (Gemini a lu CSRD ; la phrase vient de `data.js` et dit en clair ce que la
   fiche contient, la version proposee est du vocabulaire de plaquette).
9. **Note pour plus tard, sans bloquer** (les deux) : la carte sombre est un
   long tunnel sur telephone ; la FAQ entreprises pourrait fusionner
   « perimetre exact » et « ce qui reste a ma charge » ; le rythme titre,
   paragraphe, capture se repete. Aucun des deux n'en fait une condition.
10. **Hors vitrine** : `inscription.html` disait « Reserver une place » en
    titre ; le bouton de la vitrine dit « Se preinscrire ». Le titre et le h1
    de la page de preinscription sont alignes sur le bouton.
