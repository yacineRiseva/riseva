# Riseva — Cahier des charges

**Objet.** Ce document dit ce que Riseva doit faire, et ce qu'elle n'a pas le droit de faire.
Il couvre la plateforme et les deux sites vitrines. Il est écrit pour être **audité ligne à
ligne** : chaque exigence porte un identifiant, une phrase vérifiable, et le moyen de la
vérifier.

**Ce qu'il n'est pas.** Ni une spécification d'écrans, ni une architecture. `SPEC.md` porte les
règles produit et leur raison ; `DECISIONS.md` le journal daté de ce qui a été décidé et de ce
que ça remplace ; `DESIGN.md` le visuel. En cas de contradiction, **ce cahier fait foi sur le
QUOI**, `DECISIONS.md` sur le POURQUOI.

**Comment lire une exigence.**

- `E-x.y` — exigence. Elle est **tenue** ou elle ne l'est pas ; il n'y a pas de demi-mesure.
- **(V)** — le moyen de vérification : un test nommé, un fichier, un geste reproductible.
- Le verbe **doit** est prescriptif. Le verbe **ne doit jamais** est une interdiction : elle
  prime sur toute demande contraire, y compris commerciale.
- Une exigence marquée **[v2]** est hors périmètre de la version 1 : elle est écrite ici pour
  qu'on sache qu'elle a été vue, et elle ne doit pas être construite.

**Version.** 25/08/2026. Toute modification passe par une entrée datée dans `DECISIONS.md`.

---

## 1. Objet du produit et périmètre

**E-1.1** — Riseva doit permettre à une entreprise abonnée de transformer l'engagement de ses
salariés auprès d'associations en un décompte vérifiable : points, réalisations constatées,
valorisation fiscale, indicateurs sociaux et sécurité, et rapports datés.
**(V)** parcours complet de la recette navigateur, section « Parcours d'une mission ».

**E-1.2** — Le produit doit être utilisable **le premier jour, sur une base vide**, sans qu'aucun
écran n'affiche `NaN`, `undefined`, une division par zéro, un podium vide ou un chiffre du jeu de
démonstration. **(V)** `scripts/vierge.py`, 128 vérifications.

**E-1.3** — L'association ne paie rien, à aucun moment, sous aucune forme. Aucun écran, aucun
document, aucun courriel ne doit lui proposer une option payante. **(V)** recette « Ce qu'on
promet ».

**E-1.4** — Riseva ne doit **jamais** encaisser un don, ni le détenir, ni le reverser. Aucun
compte de cantonnement, aucun « intermédiaire technique », aucun prestataire de paiement dans le
produit. Motif : articles L. 314-1 et L. 521-1 du code monétaire et financier ; l'exercice sans
agrément est puni de trois ans d'emprisonnement et 375 000 € (art. L. 572-5).
**(V)** absence de tout compte Riseva dans les circuits de don ; recette « Don en argent ».

**E-1.5** — Riseva **calcule**, elle ne **certifie** pas. Aucun écran, aucun document, aucune page
publique ne doit présenter un chiffre comme audité, certifié, ou conforme à une norme.
**(V)** recette « il ne se déclare pas conforme ».

**E-1.6 [v2]** — Application mobile native, site mobile dédié, boutique de merchandising : hors
périmètre. Le responsive suffit.

---

## 2. Acteurs et droits

**E-2.1** — Six rôles, et six seulement : `admin` (Riseva), `entreprise_admin`, `site_referent`,
`salarie`, `cse`, `association`. **(V)** contrainte de la colonne `role`.

**E-2.2** — Un compte appartient à **une seule** organisation, et — quand l'entreprise a plusieurs
sites — à **un seul** établissement. **(V)** `private.appartenance`, unicité par profil.

**E-2.3** — Le rôle d'une personne ne doit **jamais** être décidé par le navigateur. Il vient du
serveur, pour la personne connectée seulement. **(V)** `public.mon_profil()`.

**E-2.4** — Un salarié ne doit pouvoir lire ni le chiffre d'affaires, ni le SIRET, ni l'adresse,
ni le coût journalier moyen, ni les abonnements, ni les factures, ni le journal d'accès, ni
l'empreinte d'une invitation de son entreprise. **(V)** recette SQL, section « ce qu'un salarié ne
lit pas ».

**E-2.5** — Un salarié ne doit pouvoir ni se nommer administrateur, ni changer d'entreprise, ni
insérer une mission déjà validée, ni s'attribuer des points, ni ouvrir des places, ni retoucher
l'effectif de référence. **(V)** recette SQL, huit refus nommés.

**E-2.6** — Un `site_referent` n'écrit que dans le périmètre de **son** établissement : ses
invitations, ses indicateurs, son registre de sécurité. **(V)** recette SQL, section
« site_referent ».

**E-2.7** — Le dernier administrateur d'une entreprise ne doit pas pouvoir être retiré ni
rétrogradé. Il faut en nommer un autre d'abord. **(V)** recette navigateur.

**E-2.8** — Une personne extérieure à l'entreprise ne doit rien voir d'elle au-delà de ce que la
vue publique expose (nom, secteur, ville). **(V)** `public.entreprise_publique`.

### Le CSE

**E-2.9** — L'accès CSE est **nominatif**, ouvert par l'employeur, expire en trente jours s'il
n'est pas accepté, et **ne consomme aucune place** de l'abonnement.

**E-2.10** — Le CSE lit : les indicateurs **approuvés** site par site et consolidés, les rapports,
la participation en agrégat, le dictionnaire des données.

**E-2.11** — Le CSE ne lit **jamais** : un nom de salarié, une mission individuelle, un don
personnel, un montant de contrat, une pièce jointe du coffre de preuves.
**(V)** recette SQL « le CSE ne lit aucune piece jointe » ; recette navigateur « Le CSE, en
lecture seule ».

**E-2.12** — Aucun agrégat de **participation** portant sur moins de cinq salariés.

**E-2.13** — Aucun détail du registre de sécurité sous cinq événements, ni dans une société de
moins de cinq salariés. Quand l'effectif n'est renseigné nulle part, on ne restitue rien et
l'écran dit pourquoi — il ne prétend pas que l'effectif est sous le seuil.

**E-2.14** — Ce que le produit affiche au CSE comme protection doit être **exactement** ce que le
code applique. Une phrase promettant un plancher que le code ne mesure pas est un défaut, même si
le plancher réel est plus protecteur.

**E-2.15** — Le CSE n'écrit rien. Son menu ne propose aucune action d'écriture, plutôt que des
boutons désactivés.

**E-2.16** — L'écran doit écrire que Riseva **n'est pas la BDESE** de l'entreprise et ne s'y
substitue pas (articles L. 2312-8 et L. 2312-9 du code du travail).

---

## 3. Groupe, société, établissement

**E-3.1** — Trois niveaux : groupe → société (SIREN) → établissement (SIRET) → salarié. Les
écraser en un seul est interdit.

**E-3.2** — Le plafond de mécénat s'applique **par société**, jamais par groupe.

**E-3.3** — La convention de mise à disposition lie l'association, le salarié et **la société**.
Un établissement ne signe rien.

**E-3.4** — Deux sociétés d'un même groupe sont deux responsables de traitement distincts. Le
lien capitalistique ne crée **aucun** droit d'accès : le payeur reçoit les factures, rien d'autre.

**E-3.5** — Un consolidé est un **rapport de sommes**, jamais une moyenne de ratios. Score du
groupe = Σ points ÷ Σ effectifs. Idem pour un taux de fréquence.
**(V)** recette « le consolidé reste un rapport de sommes ».

**E-3.6** — Un taux dont le numérateur et le dénominateur ne portent pas sur le même nombre de
sites doit être signalé à l'écran, et **ne doit pas figurer** dans un document qui sort de
l'entreprise (fiche VSME, export). **(V)** recette « Une valeur absente reste absente ».

**E-3.7** — L'établissement qui reçoit les points d'une mission est figé **au moment de
l'engagement** et n'est jamais recalculé. Sans ce gel, une mutation réécrirait un classement
passé.

**E-3.8** — Le quota d'un établissement est borné par les places du contrat, et ne peut jamais
descendre sous le nombre de comptes déjà ouverts sur ce site.

**E-3.9** — Le classement entre sites est normalisé par l'effectif du site. **Aucun classement
sur la sécurité** : il créerait une incitation à sous-déclarer. Comparaison dans le temps
uniquement.

---

## 4. Comptes, places, entrée et sortie

**E-4.1** — Aucun mot de passe ne transite par Riseva. L'authentification se fait par lien de
connexion à usage unique. **(V)** absence de tout champ mot de passe dans le produit.

**E-4.2** — L'entreprise ne saisit **aucune liste de salariés**. Elle diffuse un lien ; chaque
salarié crée son compte lui-même.

**E-4.3** — Un lien d'inscription porte son propre plafond de places, qui ne peut jamais dépasser
celui de l'abonnement. Le serveur refuse au-delà. **(V)** recette SQL, refus de la place
surnuméraire.

**E-4.4** — Le code d'un lien n'est **jamais** stocké en clair : seule son empreinte SHA-256 l'est,
avec un indice court pour le reconnaître à l'écran. Il est montré **une seule fois**, et l'écran
dit qu'il ne pourra pas le remontrer.

**E-4.5** — L'inscription par lien est bornée par les **domaines de messagerie** déclarés par
l'entreprise. Une liste vide ferme l'inscription, et l'écran l'écrit — il ne dit pas « ouvert à
tous » quand plus personne ne peut entrer, ni l'inverse.

**E-4.6** — Un lien nominatif (référent de site, élu du CSE) n'ouvre qu'un compte, refuse toute
autre adresse, et se consume à l'usage.

**E-4.7** — Une personne déjà rattachée à une organisation ne peut pas en rejoindre une seconde.

**E-4.8** — Retirer un salarié **vide son identité** et conserve la trace : nom pseudonymisé,
adresse effacée, compte fermé, points acquis à l'entreprise, place immédiatement rendue.
L'opération est irréversible et l'écran de confirmation le dit.

**E-4.9** — Une entreprise peut ouvrir son compte **elle-même** depuis le site. Ce compte démarre
en **essai** : places plafonnées, aucun montant, aucune date de signature. Il n'entre pas au
classement public et ne reçoit pas d'affiches.

**E-4.10** — La signature du contrat doit pouvoir se faire **sur le compte existant**, sans
recréer la société. Elle porte les places au nombre convenu, inscrit le montant, le palier et la
date. Elle ne doit jamais pouvoir ouvrir moins de places qu'il n'y a de comptes occupés.
**(V)** recette SQL « la signature porte les places au nombre convenu ».

**E-4.11** — Un compte association s'ouvre en quatre informations, immédiatement, mais la fiche
**n'est pas visible** tant que Riseva n'a pas vérifié son enregistrement administratif.

---

## 5. Saison

**E-5.1** — Une saison couvre une année fiscale, paramétrable, et porte un état : `brouillon`,
`ouverte`, `close`.

**E-5.2** — Le barème vit **en base**, versionné par saison. Un barème recalibré doit s'appliquer
partout, et figurer dans les rapports de la saison qu'il concerne.

**E-5.3** — Il n'y a **pas de reconduction tacite**. Le renouvellement est une décision explicite
du client, et l'écran la lui pose.

---

## 6. Annonces et missions

**E-6.1** — Trois types d'annonce, et trois seulement en v1 : don financier, bénévolat
demi-journée, don de matériel.

**E-6.2** — L'association choisit le type, la quantité et la description. **Elle ne choisit
jamais les points** : le barème est imposé par la plateforme.

**E-6.3** — Une annonce ne se publie que si l'association est **validée et non suspendue**.

**E-6.4** — Une annonce de don financier ne se publie pas sans moyen de recevoir l'argent : un
IBAN, ou un compte HelloAsso connecté.

**E-6.5** — Cycle d'une mission : `engagee` → `a_valider` → `validee` | `refusee` | `validee_auto`.

**E-6.6** — Après quatorze jours sans réponse de l'association, la mission est comptée
(`validee_auto`), les points sont crédités, et le résultat correspondant reste **estimé** et
identifié **non confirmé** partout où il apparaît, rapports compris.

**E-6.7** — Le délai de quatorze jours court à partir de la **déclaration**, pas de la date
prévue : une mission déclarée en retard laisse à l'association ses quatorze jours pleins.

**E-6.8** — L'association confirme depuis un courriel, **sans se connecter**, par un lien à jeton.
Le jeton est dérivé par HMAC d'un secret en base, jamais stocké en clair, et une relance réutilise
le même lien.

**E-6.9** — Un refus est motivé ; l'entreprise est prévenue et le besoin redevient disponible.

**E-6.10** — Une mission sur le temps de travail exige l'**accord exprès et écrit du salarié**,
horodaté, et le texte accepté est conservé — pas seulement la date.
**(V)** recette SQL « le texte accepte est conserve, pas seulement la date ».

**E-6.11** — Une association **non éligible au mécénat** ne peut pas recevoir de mise à
disposition sur le temps de travail. **(V)** recette SQL « L. 8241-3 ».

---

## 7. Points, classement, nommage

**E-7.1** — Le classement de référence est **normalisé par l'effectif**, lu par catégorie de
taille. Le total brut reste une lecture secondaire.

**E-7.2** — Le dénominateur du classement est `abonnement.effectif_reference`, figé à
l'ouverture, **hors de portée du client**.

**E-7.3** — Aucun format ne peut peser plus de **50 %** des points d'une entreprise sur la saison.
Les points au-delà sont affichés comme « écrêtés ».
**(V)** recette SQL « aucun format ne dépasse la moitié du retenu ».

**E-7.4** — Le plafond porte sur le **retenu**, pas sur le brut.

**E-7.5** — Seule la **moitié haute** de la cohorte est nommée ; une entreprise se voit toujours
elle-même à son rang réel ; trois réglages (`auto`, `nom`, `anonyme`), le défaut protégeant.

**E-7.6** — Un groupe d'ex æquo à cheval sur la médiane n'est **pas** nommé.

**E-7.7** — Quand le nom est retiré, l'**identifiant** l'est aussi, côté base comme à l'écran.
Une anonymisation qui laisse la clé primaire n'anonymise rien.

**E-7.8** — L'export CSV suit la règle de l'écran et retire l'effectif exact d'une entreprise
anonymisée.

**E-7.9** — Un compte dont le contrat n'est **pas signé** n'entre pas au classement public.

**E-7.10** — Le score mesure un **engagement**, jamais un impact environnemental. Le mot
« impact » ne doit apparaître nulle part comme qualificatif d'un chiffre de points.

---

## 8. Indicateurs sociaux et sécurité

**E-8.1** — Une campagne ouvre une période et une échéance. Chaque établissement a un état, et un
seul : `attendu`, `declare`, `approuve`, `clos_sans_reponse`.

**E-8.2** — Le contributeur saisit, l'approbateur verrouille. **La personne qui a saisi ne peut
pas approuver sa propre saisie.**

**E-8.3** — Corriger une valeur approuvée produit une **version**, jamais un écrasement.

**E-8.4** — Une campagne échue se referme ; les sites muets sont `clos_sans_reponse`. **On ne
recopie jamais la période précédente à leur place.**

**E-8.5** — Une valeur absente reste **absente**. Jamais de zéro à la place d'un non-déclaré.
**(V)** recette « Une valeur absente reste absente ».

**E-8.6** — Un taux dont l'un des termes manque **ne se calcule pas**.

**E-8.7** — Au-delà de **30 %** de variation par rapport à la période précédente, la saisie
demande une explication. Le refus porte sur le silence, jamais sur la valeur. Le seuil vit sous le
même nom des deux côtés (`SEUIL_ECART` / `private.seuil_ecart()`).

**E-8.8** — L'explication suit la valeur **jusque dans le rapport**.

**E-8.9** — Les écarts sont calculés **pendant** la saisie, pas au moment du refus.

**E-8.10** — Chaque indicateur porte ce qu'il **inclut** et ce qu'il **exclut**, daté et versionné
dans un **dictionnaire des données** produit avec la campagne, exportable en CSV. Une définition
qui change ne réécrit pas un rapport déjà arrêté.

**E-8.11** — Ce que demande une campagne est écrit **sur la campagne**, rubrique par rubrique, et
non sur l'entreprise : une campagne close doit continuer à dire ce qu'elle demandait à l'époque.

### Registre des événements de sécurité

**E-8.12** — Le registre de Riseva n'est **ni** le registre des accidents bénins de l'article
L. 441-4 du code de la sécurité sociale, **ni** le document unique. L'écran le dit.

**E-8.13** — **Aucune donnée de santé, aucune identité** : ni nom de victime, ni siège de la
lésion, ni diagnostic. Le serveur refuse une saisie qui en contient — pas seulement l'écran.
**(V)** recette SQL « le registre refuse une description de la blessure ».

**E-8.14** — Le champ « circonstances » est borné à 300 caractères, pour l'empêcher de devenir un
récit où finit par apparaître un prénom.

**E-8.15** — Nature (travail / trajet) et gravité (sans soin / soins sans arrêt / avec arrêt) sont
deux axes distincts. Les presqu'accidents ne comptent dans aucun taux.

**E-8.16** — Typologie fermée, onze entrées.

**E-8.17** — Deux incohérences sont refusées : « avec arrêt » sans jour d'arrêt, et des jours
d'arrêt sur un accident sans arrêt.

**E-8.18** — On n'efface pas une ligne d'un registre : on l'**annule** avec un motif. Elle sort
des taux et reste visible.

**E-8.19** — Activer le registre est une **décision par site**. Une fois activé, les champs
correspondants de la campagne sont verrouillés.

**E-8.20** — Un site sans registre n'a pas « zéro accident » : la consolidation le **nomme**.

**E-8.21** — Chaque événement peut porter des actions correctives, avec responsable **et**
échéance, tous deux obligatoires.

**E-8.22** — Un salarié ne déclare pas un accident dans Riseva : ce n'est pas le canal.

**E-8.23** — Le texte libre du registre porte une **durée de conservation exécutable** : passé
cinq ans révolus à compter de la fin de l'exercice, zone, circonstances et déclarant s'effacent ;
les compteurs restent, ils ne désignent personne.

---

## 9. Restitutions

**E-9.1** — Les rapports sont produits par la **base**, sans intervention humaine, une seule fois
par période, et scellés. Un rapport scellé ne bouge plus.

**E-9.2** — Un rapport trimestriel n'est scellé qu'une fois les quatorze jours de confirmation
écoulés pour la dernière mission de la période. Le sceller le dernier jour le figerait incomplet.

**E-9.3** — Le `retenu` d'un trimestre ne s'additionne pas d'un trimestre à l'autre (l'écrêtage
porte sur la période) ; le rapport le porte, plutôt que de laisser un client découvrir l'écart en
additionnant lui-même.

**E-9.4** — La **fiche VSME** range ce que Riseva sait dans les onze rubriques B1 à B11. Une
rubrique non couverte est écrite « non couverte », **jamais laissée vide et jamais remplie d'un
zéro**.

**E-9.5** — La fiche VSME ne prend que des observations **approuvées** et des résultats
**confirmés** — jamais une estimation.

**E-9.6** — La fiche VSME porte la **date de vérification** de la norme, parce que le texte bouge.

**E-9.7** — Le **dossier achats** répond aux questionnaires clients avec, pour chaque ligne, sa
provenance. Il ne se déclare conforme à rien.

**E-9.8** — Le **coffre de preuves** rattache une pièce à un chiffre, conserve son empreinte
SHA-256, et refuse le retrait d'une pièce déposée sur une valeur approuvée.

**E-9.9** — Aucun document de santé dans le coffre, et l'écran le dit avant le dépôt.

---

## 10. L'argent

### Abonnement

**E-10.1** — Grille par tranche d'effectif, publique, de 2 400 à 18 500 € HT par an, sites inclus
selon la tranche, 420 € par site supplémentaire. Elle vit **à un seul endroit** (`TARIFS`), lu par
la vitrine, le simulateur, le devis, le contrat et la facture.

**E-10.2** — Acompte de 40 % du montant HT, minimum 900 €, **intégralement remboursé si la saison
ne démarre pas**. Escompte de 3 % pour règlement intégral à la commande. Solde à trente jours.

**E-10.3** — Tarif fondateur : −10 %, vingt entreprises au maximum, jusqu'au 31/12/2026, sur la
**première saison et sur elle seule**. Le plafond de vingt est tenu **en base**, pas par l'écran.

**E-10.4** — **Interdiction permanente** : promettre que le tarif restera identique — « gel »,
« prix garanti », « tarif bloqué », sous quelque forme que ce soit. Une remise n'est pas une
garantie de prix. Cette interdiction a déjà été violée deux fois ; elle ne doit réapparaître
nulle part.

**E-10.5** — Pénalités de retard et indemnité forfaitaire de recouvrement conformes aux articles
L. 441-9 et L. 441-10 du code de commerce, écrites sur la facture.

**E-10.6** — Facturation électronique : la plateforme agréée du client et son identifiant
d'annuaire sont conservés. **Tant que l'acheminement n'est pas branché, aucun écran ne doit
promettre que la facture y sera adressée.**

### Dons

**E-10.7** — Deux circuits, **aucun ne passe par Riseva** : HelloAsso (carte) et le virement
direct. Le virement est le socle.

**E-10.8** — Riseva ne détient **aucune clé d'API d'association**. L'adresse du formulaire
HelloAsso est contrainte au domaine `helloasso.com` en HTTPS, dans le navigateur **et** par
contrainte en base.

**E-10.9** — Le donateur vire directement, avec une référence émise par Riseva
(`RSV-XXXX-XXXX`), qui permet à l'association de rapprocher la ligne de son relevé.

**E-10.10** — **Aucun point avant confirmation.** Le montant que l'association a réellement reçu
fait foi, pas celui qui avait été annoncé. Pas de validation automatique à quatorze jours pour
l'argent : un silence ne vaut pas encaissement.

**E-10.11** — Une intention non honorée s'éteint au bout de trente jours, sans conséquence.

**E-10.12** — Le retour de paiement par carte doit être **signé** : personne ne doit pouvoir
rejouer le retour d'un don qui ne le concerne pas, ni confirmer un don depuis le navigateur.

### Reçus fiscaux

**E-10.13** — **Seule l'association bénéficiaire délivre le reçu.** Riseva prépare et transmet
**sous mandat écrit, daté, nominatif et révocable**. Sans mandat, la plateforme n'émet rien.

**E-10.14** — Aucune formulation, nulle part, ne doit laisser croire que Riseva émet le reçu
« au nom de » l'association.

**E-10.15** — Deux modèles, non interchangeables : **Cerfa 11580*05** pour un don de salarié
(art. 200 du CGI), **Cerfa 16216*03** pour un don d'entreprise (art. 238 bis). Le choix se fait
sur l'origine du don, et une origine inconnue **lève** plutôt que de retomber sur un modèle.

**E-10.16** — La numérotation est **continue et sans réemploi**. Le prochain numéro se déduit de
ceux déjà émis ; il n'est jamais saisi à la main.

**E-10.17** — Tant qu'un réglage manque (éligibilité, activation, signataire, qualité, préfixe,
mandat), **rien n'est émis**. Motif : l'amende de l'article 1740 A du CGI, égale au taux de la
réduction d'impôt appliqué aux sommes portées sur un reçu irrégulier.

**E-10.18** — Un don confirmé **avant** que les réglages soient complets doit pouvoir être
rattrapé — par une tâche de nuit et par un geste à l'écran. Un reçu qui n'est jamais émis sort de
la déclaration annuelle de l'association et prive son donateur de sa réduction.

**E-10.19** — Le récapitulatif de la **déclaration annuelle des dons** (article 222 bis, dépôt
dans les trois mois suivant la clôture de l'exercice) compte les **reçus délivrés**, pas les dons
reçus, et se borne à l'exercice affiché.

---

## 11. Mécénat et fiscalité

**E-11.1** — La mise à disposition se place sous l'**article L. 8241-3 du code du travail** :
prêt gratuit au profit des organismes visés aux a à g du 1 de l'article 238 bis du CGI.

**E-11.2** — La convention générée porte les cinq mentions de l'article **R. 8241-2** : identité
et qualification du salarié, mode de détermination des coûts, durée, finalité et missions. Riseva
n'est pas partie à la convention et ne la signe pas.

**E-11.3** — Les **dons personnels des salariés n'entrent jamais** dans l'assiette de
l'entreprise. Les additionner fabriquerait une réduction d'impôt indue.
**(V)** recette « Cloisonnement des dons personnels ».

**E-11.4** — Réduction d'impôt : **60 %**, ramenée à **40 %** pour la fraction des versements de
l'exercice qui dépasse 2 000 000 €. L'écran affiche le taux **qui a servi**, jamais un autre.

**E-11.5** — Plafond annuel : le plus élevé entre **20 000 €** et **5 ‰ du chiffre d'affaires
HT**. L'excédent est reportable sur **cinq** exercices.

**E-11.6** — Le plafond ne se calcule qu'avec ce que l'entreprise a déclaré : chiffre d'affaires,
bornes d'exercice, dons faits hors Riseva, report antérieur. Sans eux, plafond et report valent
`null`, **jamais zéro**, et l'écran le dit.

**E-11.7** — Les champs que l'écran demande pour ce calcul doivent exister en base, être écrits
par la RPC et relus par le moteur **sous le même nom**. Un champ saisi qui n'atterrit nulle part
est un défaut majeur : le client lit « enregistré » et le plafond n'est jamais appliqué.

**E-11.8** — Mécénat de compétences valorisé au **coût de revient** — rémunération brute chargée
au prorata du temps —, plafonné à 3 × le plafond de l'article L. 241-3 du code de la sécurité
sociale, lecture mensuelle retenue (12 015 € par salarié et par an), **paramétrable**.

**E-11.9** — Tant que les heures réelles ne sont pas saisies, la durée conventionnelle s'applique
**et l'écran l'écrit à côté du chiffre**.

**E-11.10** — Riseva produit une **estimation**. Jamais de promesse de montant, jamais de
déclaration prête à déposer. L'expert-comptable arrête les chiffres.

**E-11.11** — Les valeurs fiscales vivent dans un objet `FISCAL` daté, pas dans le code des
écrans : elles changent chaque année.

---

## 12. Modération, signalement, DSA

**E-12.1** — Toute annonce doit porter un mécanisme de signalement accessible et facile
d'utilisation (article 16 du règlement (UE) 2022/2065).

**E-12.2** — Une décision de modération se **motive**, au minimum dix caractères. Sans motivation,
pas de décision — la contrainte est en base.

**E-12.3** — Trois décisions, et trois seulement : `maintenu`, `retire`, `modifie`.

**E-12.4** — « Retirer » **retire** : l'annonce est fermée par la même transaction. Une décision
qui ne modère rien est pire qu'une absence de décision.

**E-12.5** — Le **signalant** dont on connaît les coordonnées est informé sans retard indu de la
décision **et des voies de recours** (art. 16). L'**association** visée reçoit la déclaration des
motifs (art. 17). Les deux partent réellement, et le journal des envois le montre.

**E-12.6** — La motivation transmise est **complète**, jamais tronquée en silence.

**E-12.7** — Rejouer la même décision ne renotifie personne ; une décision **révisée**, elle,
repart.

**E-12.8** — Un signalement se conserve douze mois.

---

## 13. Automatismes et courriels

**E-13.1** — Les automatismes s'exécutent **dans la base**, pas dans l'interface : ils doivent
tourner même si personne n'ouvre la plateforme de la semaine.

**E-13.2** — Douze tâches : validation automatique, fermeture des annonces échues, expiration des
intentions, demandes de confirmation, relances de collecte, clôture des campagnes, rapports,
envoi des rapports, rattrapage des reçus, rétention, verdicts d'envoi sortants, file de courriels.

**E-13.3** — **Une tâche qui échoue ne doit pas annuler les autres.** Chaque tâche a son propre
bloc d'exception et le passage consigne la liste des erreurs.

**E-13.4** — Chaque passage est consigné : date, compteurs, erreurs. L'administration Riseva le
consulte. Une automatisation qu'on ne peut pas auditer inquiète plus qu'elle ne rassure.

**E-13.5** — Un courriel enfilé n'est pas un courriel envoyé. L'état d'envoi est écrit par la
fonction qui envoie, jamais par la file elle-même.

**E-13.6** — Un échec passager doit être **réessayé**, dans la limite de trois tentatives, et une
ligne qui ne partira jamais doit finir dans un état terminal **visible**, jamais perdue en
silence.

**E-13.7** — Les relances de collecte partent à J-7 et J-2, une seule fois par site et par jour,
et ne sont pas envoyées à un site fermé ou qui a déjà répondu.

**E-13.8** — Aucune tâche ne doit tenir un verrou sur une ligne que l'utilisateur peut vouloir
modifier pendant la nuit.

---

## 14. Données personnelles

**E-14.1** — Base légale de la relation employeur-salarié : l'**intérêt légitime**, pas le
consentement — un consentement qu'on ne peut pas refuser librement n'en est pas un. L'accord
demandé mission par mission répond au code du travail, pas à l'article 6 du RGPD.

**E-14.2** — Un don personnel n'est **jamais nominatif** côté employeur : ni le nom, ni le
montant, ni l'association. Motif : la cause peut révéler une conviction, une opinion, un état de
santé ou une appartenance syndicale (article 9 du RGPD).

**E-14.3** — Un agrégat de dons ne s'affiche qu'à partir de **cinq donateurs**.

**E-14.4** — Une mission masquée l'est **vraiment** : ni salarié, ni quantité, ni points, et la
date ramenée au mois. Masquer le nom en laissant le montant ne masque rien.

**E-14.5** — Le **droit à l'effacement** est exerçable de bout en bout : la personne demande, la
fonction authentifie, la RPC accepte l'appel de service **et** l'auto-effacement, et le compte
d'authentification est supprimé. Une chaîne qui s'arrête sur une garde n'est pas un droit.

**E-14.6** — Chaque ensemble de données personnelles porte une **durée de conservation
exécutable**, et la purge consigne le nombre de lignes sans recopier ce qu'elle supprime.

**E-14.7** — Les journaux d'accès se purgent : durée glissante, six mois.

**E-14.8** — Aucune donnée personnelle ne doit passer dans une URL ou une chaîne de requête.

**E-14.9** — Les pages publiques doivent nommer l'hébergeur, les sous-traitants de stockage, le
directeur de la publication, la base légale, et la voie de réclamation CNIL.
**(V)** recette « Les formulaires publics » et « mentions légales ».

---

## 15. Sécurité

**E-15.1** — La sécurité est **dans la base**, jamais dans le navigateur. Toute règle d'accès
doit être vraie même si l'interface est contournée.

**E-15.2** — `revoke all` d'abord, puis on accorde nommément. Aucune table, aucune fonction n'est
accessible par défaut.

**E-15.3** — Les fonctions `SECURITY DEFINER` appartiennent à un rôle dédié sans login, jamais au
superutilisateur. Les **vues** aussi : une vue s'exécute avec les droits de son propriétaire.
**(V)** recette « aucune fonction privilégiée ne reste au superutilisateur », « aucune vue ».

**E-15.4** — Toute fonction `SECURITY DEFINER` fixe un `search_path` vide.

**E-15.5** — Les colonnes sensibles sont accordées **colonne par colonne**, jamais par table :
chiffre d'affaires, empreinte d'invitation, circonstances d'un accident, coordonnées bancaires.

**E-15.6** — `anon` ne doit **jamais** obtenir en masse les coordonnées bancaires des
associations : la page publique d'une association les obtient **une par une**.

**E-15.7** — Un logo ou une photo fournis par un client sont contraints à `https://` ou
`data:image/…`, et bornés en taille : cette valeur finit dans un attribut `src` rendu chez tous
les autres clients.

**E-15.8** — Les jetons de réponse par courriel sont dérivés par HMAC d'un secret en base, jamais
stockés en clair, jamais devinables, et à usage borné.

**E-15.9** — Aucune clé secrète, aucun jeton de service ne doit se trouver dans le code livré au
navigateur.

**E-15.10** — Une fonction dont la **signature** change doit retirer l'ancienne. PostgreSQL
n'identifie pas une fonction par son nom : `create or replace` avec un paramètre de plus crée une
**seconde** fonction, l'ancienne survit avec ses droits, et sur une base en service la moitié
d'une mise à jour n'arrive jamais.
**(V)** recette « aucune fonction ne traîne une signature abandonnée ».

---

## 16. Les deux sites vitrines

**E-16.1** — Deux sites : un pour les entreprises (`/`), un pour les associations
(`/associations.html`). Ils sont **produits par un script** (`scripts/vitrines.py`) et jamais
modifiés à la main.

**E-16.2** — **Toute affirmation vérifiable de la vitrine doit être tenue par le code.** Un
chiffre, un délai, une garantie, un « automatiquement », un « sans rien demander ». Une promesse
que le produit ne tient pas est un défaut de la même gravité qu'un calcul faux.
**(V)** recette « Ce que la vitrine promet existe dans le produit ».

**E-16.3** — Un document contractuel (CGV, charte, règlement) ne doit **jamais** contredire le
produit ni la vitrine. **(V)** recette « Un document contractuel ne contredit pas le produit ».

**E-16.4** — La grille tarifaire affichée et le simulateur lisent `TARIFS`. Le simulateur gère le
champ vide, la borne haute et la tranche « sur devis ».

**E-16.5** — Aucune promesse de gel de tarif, sous aucune forme (rappel de E-10.4).

**E-16.6** — Les formulaires publics doivent **fonctionner** : un clic qui ne produit rien est un
défaut bloquant. Rien de ce qui se trouve au-dessus d'un bouton n'a le droit de changer de hauteur
pendant qu'on appuie dessus.

**E-16.7** — Aucune requête vers un tiers : ni police distante, ni script d'analyse, ni image
hébergée ailleurs. **(V)** recette « Rien ne sort du domaine ».

**E-16.8** — Aucun bandeau de consentement, parce qu'il n'y a rien à consentir : pas de traceur.

**E-16.9** — Tout texte affiché doit pouvoir se taper sur un clavier français : pas de caractère
exotique, pas de tiret cadratin dans les pages produites.
**(V)** recette « Ce qui s'affiche doit pouvoir se taper ».

**E-16.10** — Toutes les images portent un `alt`, tout champ porte un libellé, le menu mobile
existe et s'ouvre, et aucune erreur JavaScript ne doit apparaître à l'ouverture d'une page.

**E-16.11** — Tout texte affiché doit passer le seuil de contraste **WCAG AA**.
**(V)** `scripts/contraste.py`, mesuré sur chaque page.

**E-16.12** — Aucun lien interne ne pointe dans le vide.

**E-16.13** — La page publique d'une association doit afficher **la vraie** association demandée,
ses annonces, ses réalisations et son moyen de recevoir un don — jamais une fiche de démonstration
ni le RIB d'une autre.

**E-16.14** — La page publique doit offrir un moyen de **joindre** l'association.

**E-16.15** — Le site public ne doit jamais afficher un chiffre du jeu de démonstration.

---

## 17. Documents et pages légales

**E-17.1** — Doivent exister et être atteignables : mentions légales, politique de
confidentialité, CGV, charte des associations, règlement du jeu, politique de modération,
engagements, page de sécurité.

**E-17.2** — Chaque document dit **ce qui manque** plutôt que de le passer sous silence — une
forme juridique non encore constituée, par exemple, est écrite comme telle.

**E-17.3** — Riseva **n'assure rien**. La responsabilité en cas d'incident pendant une mission
est entre l'entreprise et l'association ; c'est écrit dans les CGU et sur la fiche mission.

---

## 18. Qualité et recette

**E-18.1** — Une seule commande doit vérifier l'ensemble : `python3 scripts/verifier.py`. Elle
contrôle la syntaxe des modules, installe la base à blanc, joue les tests SQL, ouvre un
navigateur, refait les parcours, mesure les contrastes et relit les caractères affichés.

**E-18.2** — **Ce qui n'est pas vert ne part pas.** Il n'y a pas de test « connu comme cassé ».

**E-18.3** — La recette doit couvrir les deux moteurs : le jeu de démonstration **et** la
traduction depuis PostgreSQL. Une couche qu'aucun test ne traverse n'est pas écrite, elle est
espérée.

**E-18.4** — Tout champ présent sur un objet du jeu de démonstration doit exister sur l'objet
correspondant chargé depuis la base, **sous le même nom**. La divergence entre les deux moteurs
est le défaut le plus coûteux du produit, parce qu'il est invisible à l'écran.
**(V)** `scripts/postgres-vers-moteur.mjs`, « aucun champ du jeu de démonstration ne disparaît en
production ».

**E-18.5** — La recette ne doit dépendre ni de l'ordre des lignes rendues par la base, ni de
l'ordre dans lequel les tests s'exécutent.

**E-18.6** — Le premier jour sur une base vide est testé pour chaque rôle.

**E-18.7** — Aucune écriture ne doit être annoncée comme faite avant que le serveur l'ait
acceptée. En production, une écriture est un aller-retour : l'écran garde l'état d'avant pendant
ce temps, et une fenêtre de saisie ne se ferme pas sur un refus.

---

## 19. Exploitation

**E-19.1** — La mise en ligne doit être décrite pas à pas, dans un document lisible par quelqu'un
qui n'est pas développeur, et ce document doit suffire.
**(V)** `docs/MISE-EN-LIGNE.txt`.

**E-19.2** — La mise à jour d'une base **déjà en service** est décrite, y compris ce qu'elle
nettoie (signatures abandonnées) et ce qu'il ne faut pas rejouer (le jeu de démonstration).

**E-19.3** — Les secrets d'exploitation vivent en base ou dans les variables d'environnement de la
fonction concernée, jamais dans le dépôt.

**E-19.4** — L'ordonnanceur, le secret de cron et le transport de courriel font partie de
l'installation : tant qu'ils ne sont pas en service, les promesses d'envoi automatique ne sont pas
tenues, et l'installation ne doit pas être déclarée prête.

**E-19.5** — Les sauvegardes sont décrites : le code, les données, les fichiers du coffre.

**E-19.6** — On ne modifie **jamais** une donnée client directement dans l'éditeur de tables : les
règles métier vivent dans les fonctions, et les contourner produit un état que le produit ne sait
pas relire.

---

## 20. Invariants de conception

Ces cinq règles sont transversales. Une exigence qui les contredirait serait mal écrite.

**E-20.1** — **Une garde et un calcul ne sont pas la même fonction.** Le calcul vit dans le schéma
privé, la garde dans la fonction publique qui l'appelle. Sans quoi une tâche de nuit, qui n'a pas
d'identité, se voit refuser ses propres données.

**E-20.2** — **`NULL <> x` vaut NULL**, donc un `if` construit dessus ne se déclenche jamais.
Toute comparaison qui doit arrêter quelque chose s'écrit `is distinct from`.

**E-20.3** — **Une valeur que la base classe comme non secrète ne peut pas devenir le secret d'un
écran**, et réciproquement : les deux moteurs doivent dire la même chose du même champ.

**E-20.4** — **Rien de ce qui se trouve au-dessus d'un bouton n'a le droit de changer de hauteur
pendant qu'on appuie dessus.**

**E-20.5** — **Un champ qu'un écran demande doit avoir une colonne, une RPC qui la prend, et un
mappeur qui la rend sous le même nom.** Trois maillons ; il suffit qu'un manque pour que
l'utilisateur écrive dans le vide en lisant « enregistré ».

---

## 21. Critères de réception

La version 1 est réputée opérationnelle quand, **et seulement quand** :

**R-1** — `python3 scripts/verifier.py` est vert de bout en bout : syntaxe, installation à blanc,
recette SQL, recette navigateur, base vierge, caractères, contrastes.

**R-2** — Aucune exigence de ce cahier n'est marquée « non tenue » sans une entrée datée dans
`DECISIONS.md` qui l'assume et dit ce qui la remplace.

**R-3** — Une installation neuve, faite en suivant `docs/MISE-EN-LIGNE.txt` et rien d'autre,
aboutit à une plateforme où une entreprise peut ouvrir son compte, inviter, publier, collecter et
recevoir son premier rapport.

**R-4** — Les deux vitrines sont en ligne, et chacune de leurs promesses vérifiables est tenue par
le code.

**R-5** — Les huit points de droit — 238 bis, 1740 A, 222 bis, R. 8241-2, L. 8241-3, L. 314-1 et
L. 521-1, RGPD art. 9, DSA art. 16 et 17 — sont tenus par le code, pas seulement écrits dans un
document.

**R-6** — Le premier jour sur une base vide ne montre aucun chiffre inventé, à aucun rôle.
