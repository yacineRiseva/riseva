# Riseva - Spécification produit v1

Statut : figée le 20/08/2026. Toute modification passe par une entrée datée dans `DECISIONS.md`.

---

## 1. Ce qu'est Riseva

Plateforme SaaS B2B qui transforme l'engagement RSE d'une entreprise en un jeu collectif annuel.
L'entreprise s'abonne pour une **saison**. Ses salariés répondent à des **annonces** publiées par des
associations partenaires. Chaque action rapporte des **points**. Un **classement** compare les entreprises
entre elles. Des **trophées** sont remis chaque trimestre, un **rapport annuel** clôture la saison.

Les associations ne paient rien. Elles publient et valident. C'est leur seul travail.

## 2. Acteurs et rôles

| Rôle | Qui | Peut faire |
|---|---|---|
| `admin` | Riseva | Tout. Gère les saisons, valide les associations, ajuste le barème. |
| `entreprise_admin` | RH / RSE / dirigeant | Gère les salariés, voit les rapports, paie l'abonnement. |
| `salarie` | Employé de l'entreprise abonnée | Répond aux annonces, déclare ses missions, voit le classement. |
| `site_referent` | RH ou RSE d'un établissement | Invite les salariés de **son** site dans la limite de son quota, voit ses missions et son score, saisit ses indicateurs. |
| `association` | Référent de l'asso | Publie des annonces, valide les missions réalisées. |

Un compte = un email. Un utilisateur appartient à une seule organisation (entreprise ou
association), et — quand l'entreprise en a plusieurs — à un seul établissement.

Un `entreprise_admin` dont le périmètre porte un **groupe** ouvre en plus la vue consolidée :
des agrégats par société et par site, jamais l'identité d'un salarié d'une société dont il
n'est pas lui-même salarié.

### Le CSE, en lecture seule

- Rôle `cse`, rattaché à une **société**, jamais à un site : le comité ne se découpe pas par
  établissement dans ce que Riseva lui montre.
- **Ce qu'il lit** : les indicateurs sociaux et sécurité **approuvés**, site par site et
  consolidés ; les rapports trimestriels et annuel ; la participation en agrégat ; le
  dictionnaire des données.
- **Ce qu'il ne lit jamais** : aucun nom de salarié, aucune mission individuelle, aucun don
  personnel, aucun agrégat portant sur moins de **cinq** personnes, aucun montant de contrat.
  Ce n'est pas un réglage : un accès qui permettrait de savoir qui a fait quoi transformerait un
  droit d'information en outil de contrôle, et Riseva en moyen de surveillance.
- **Il n'écrit rien** : ni saisie, ni approbation, ni export au nom de l'entreprise. Son menu ne
  propose donc aucune de ces actions, plutôt que des boutons désactivés.
- L'accès est **nominatif**, ouvert par l'employeur, expire en trente jours s'il n'est pas
  accepté, et **ne consomme aucune place** de l'abonnement.
- Base légale du besoin : articles L. 2312-8 et L. 2312-9 du code du travail. **Riseva n'est pas
  la BDESE** de l'entreprise et ne s'y substitue pas — c'est écrit à l'écran.

## 2 ter. Groupe, société, établissement

Trois niveaux, parce que le droit français en compte trois, et parce que les écraser en un
seul casse quatre choses vérifiables.

```
groupe                      le payeur, le périmètre de consolidation volontaire
  └── société  (SIREN)      la personne morale : contrat, facture, impôt, employeur
        └── établissement   le lieu : effectif, quota de comptes, score, accidentologie
              └── salarié
```

- Le **plafond de mécénat** (20 000 € ou 5 ‰ du chiffre d'affaires) s'applique par redevable
  de l'impôt, donc **par société**. Jamais par groupe. Le rapport de groupe additionne des
  réductions plafonnées séparément, et refuse de donner un total si l'une n'est pas calculable.
- La **convention de mise à disposition** lie l'association, le salarié et son **employeur** :
  la société. Un établissement n'est pas un employeur et ne signe rien.
- Deux sociétés d'un même groupe sont **deux responsables de traitement distincts**. Le lien
  capitalistique ne crée aucun droit d'accès : le payeur reçoit les factures, rien d'autre.
- Un **consolidé est un rapport de sommes**, jamais une moyenne de ratios. Le score du groupe,
  c'est Σ points ÷ Σ effectifs. Idem pour un taux de fréquence d'accidents.

### Deux liens, jamais un seul

1. La société **alloue un quota** de comptes à un établissement — borné par les places du
   contrat, et jamais en dessous des comptes déjà ouverts sur ce site.
2. Elle envoie un **lien nominatif** au référent de ce site. Le lien porte son nom et son
   adresse, expire en trente jours, n'ouvre qu'un compte, et **refuse toute autre adresse**.
3. Le référent produit ensuite le **lien d'inscription de ses salariés**, dans la limite de
   son quota. Un lien de salarié ne confère jamais de droit d'administration.

### L'affectation est datée, l'attribution est figée

Chaque mission enregistre l'établissement qui reçoit les points **au moment de l'engagement**,
et ne le recalcule jamais. Sans ce gel, un salarié muté de Lyon à Marseille emporterait son
passé avec lui et le classement de la saison précédente changerait tout seul.

### Le classement entre sites

Il compare des établissements d'un même périmètre, **normalisé par l'effectif du site**. Il
fonctionne dès le premier client, contrairement au classement entre entreprises qui attend
dix participantes dans une catégorie. Il compare des sites, jamais des personnes.

**Jamais de classement sur la sécurité** : un classement entre sites sur les accidents crée
une incitation à sous-déclarer. Comparaison dans le temps uniquement.

## 2 quater. Les indicateurs sociaux et sécurité

Une **campagne** ouvre une période et une échéance ; chaque établissement a un état, et un
seul, parmi : `attendu`, `declare`, `approuve`, `clos_sans_reponse`.

- Le **contributeur** saisit, l'**approbateur** verrouille. La personne qui a saisi ne peut
  pas approuver sa propre saisie.
- Corriger une valeur approuvée produit une **version**, jamais un écrasement silencieux.
- Une campagne arrivée à échéance se referme : les sites qui n'ont pas répondu sont marqués
  `clos_sans_reponse`. On ne recopie jamais la période précédente à leur place.
- Douze valeurs saisies, sept indicateurs calculés, chacun avec sa **formule publiée**.
- Aucune donnée de santé : ni diagnostic, ni nature de lésion, ni identité de victime. On
  compte des accidents et des journées, pas des personnes.
- Riseva **calcule**, Riseva ne **certifie** pas, et ne dépose rien à la place du client.

### Écarts entre périodes, et dictionnaire des données

- **Au-delà de 30 % de variation** sur un indicateur calculé par rapport à la période
  précédente, la saisie demande une phrase d'explication. Le refus porte sur le silence, jamais
  sur la valeur : une plateforme qui rejetterait un chiffre parce qu'il bouge trop finirait par
  obtenir des chiffres qui ne bougent pas. Le seuil vit sous le même nom dans `data.js`
  (`SEUIL_ECART`) et dans Postgres (`private.seuil_ecart()`).
- L'explication **suit la valeur jusque dans le rapport**. C'est elle qui répond, un an plus
  tard, à la seule question que posera un acheteur devant une courbe qui saute.
- Les écarts sont **calculés pendant la saisie**, pas au moment du refus : découvrir qu'on doit
  se justifier après avoir rempli douze champs est la meilleure façon d'obtenir « RAS ».
- **Une valeur absente reste absente.** Jamais de zéro à la place de « non déclaré » : le taux de
  rotation chuterait de 100 % et l'alerte se déclencherait sur une donnée manquante.
- Chaque indicateur déclaré porte ce qu'il **inclut** et ce qu'il **exclut**. C'est là que deux
  sites divergent sans le savoir — l'un compte les intérimaires, l'autre non — et c'est invisible
  une fois les chiffres additionnés.
- Le **dictionnaire des données** est produit avec la campagne, daté et versionné : définitions,
  sources, inclusions, exclusions, formules, numérateur et dénominateur, mode d'agrégation,
  limites, et les explications fournies par les sites. Une définition qui change plus tard ne
  réécrit pas un rapport déjà arrêté. Exportable en CSV.

### Le registre des événements de sécurité

Le site déclare ses événements **un par un, au fil de l'eau** ; les indicateurs de la période
s'en déduisent, pour lui comme pour la société. C'est ce qui supprime la double saisie — et avec
elle la seule cause sérieuse de divergence entre le chiffre d'un site et celui du siège.

- **Ce que ce registre n'est pas** : ni le registre des accidents bénins de l'article L. 441-4 du
  code de la sécurité sociale, ni le document unique. Les deux sont nominatifs ou relèvent de
  l'évaluation des risques, et ils restent chez l'employeur.
- **Aucune donnée de santé, aucune identité** : ni nom de victime, ni siège de la lésion, ni
  diagnostic. Ce sont des données de l'article 9 du RGPD. Ce qu'un préventeur utilise pour agir —
  la circonstance, la zone, le type, la gravité — n'en fait pas partie. Le champ « circonstances »
  est limité à 300 caractères : c'est ce qui l'empêche de devenir un récit où finit par apparaître
  un prénom.
- **Nature** (travail / trajet) et **gravité** (sans soin / soins sans arrêt / avec arrêt) sont
  deux axes distincts. Les accidents de trajet sont comptés à part, et les **presqu'accidents ne
  comptent dans aucun taux** : les compter ferait monter la fréquence au moment où la prévention
  s'améliore.
- **Typologie courte, onze entrées.** Une liste de quarante causes n'est jamais remplie
  correctement : les déclarants prennent la première qui ressemble, et le Pareto qui en sort ne
  veut plus rien dire.
- **Deux incohérences sont refusées** : un accident « avec arrêt » sans jour d'arrêt, et des
  journées d'arrêt sur un accident sans arrêt. On les voit dans tous les tableaux tenus à la main,
  et elles faussent le taux de gravité sans que personne ne le remarque.
- **On n'efface pas une ligne d'un registre** : on l'annule, avec un motif. Elle sort des taux et
  reste visible.
- **Activer le registre est une décision par site.** Tant qu'il ne l'a pas fait, le site saisit ses
  chiffres à la main. Une bascule automatique au premier événement ferait disparaître du rapport
  les trois autres accidents qu'il n'a pas encore déclarés. Une fois activé, les quatre champs
  correspondants sont **verrouillés** dans la campagne : les laisser modifiables et les écraser
  ensuite en silence serait pire que de les refuser.
- **Un site sans registre n'a pas « zéro accident »** : il n'a rien déclaré ici. La consolidation
  le nomme.
- **Plan d'actions.** Chaque événement peut porter des actions correctives, avec un responsable et
  une échéance, tous deux obligatoires : une action sans responsable est un vœu, une action sans
  échéance ne se fait jamais.
- **Qui écrit** : le référent du site, ou la société. Un salarié ne déclare pas un accident dans
  Riseva — ce n'est pas le canal, et laisser croire le contraire retarderait une déclaration qui
  doit partir ailleurs.

## 2 bis. Comptes, places et départs

### Places
L'abonnement d'une entreprise ouvre un **nombre de places** égal à son effectif déclaré.
Un compte salarié occupe une place. La plateforme refuse toute création de compte au-delà.

### Inscription par lien
L'entreprise ne saisit aucune liste. À la création de son compte, elle reçoit **un lien unique**
contenant un code (`LAFARGE-7QK2`). Elle le diffuse comme elle veut : intranet, mail interne,
affiche. Chaque salarié crée son compte lui-même en trente secondes.

- Un seul lien actif à la fois par entreprise.
- Le lien porte son propre plafond de places, qui ne peut jamais dépasser celui de l'abonnement.
- Il expire au bout de 120 jours.
- L'entreprise peut le **révoquer** (plus aucune inscription) ou le **régénérer** (l'ancien meurt,
  un nouveau naît). Les comptes déjà créés ne sont jamais touchés.
- Une adresse email ne peut créer qu'un seul compte.

### Départ d'un salarié
Retirer un salarié ne supprime pas sa ligne : cela ferait disparaître des missions et des points
acquis à l'entreprise. On **vide son identité**, on garde la trace.

- Son nom devient « Salarié retiré 01 », son adresse est effacée, son compte est fermé.
- Il apparaît anonymisé partout, y compris dans l'historique des missions.
- Les points qu'il a rapportés **restent acquis à l'entreprise**.
- Sa **place est immédiatement rendue** à l'abonnement.
- L'opération est irréversible, et l'écran de confirmation le dit.

### Création de compte
- **Entreprise** : formulaire, puis le compte administrateur et le lien d'inscription sont créés
  dans la foulée.
- **Association** : formulaire, compte créé aussitôt mais fiche **non visible** tant que Riseva
  ne l'a pas validée.
- **Salarié** : uniquement par le lien de son entreprise. Aucune autre voie.

Aucun mot de passe ne transite par Riseva : l'authentification se fait par lien de connexion.

## 3. La saison

- Une saison dure **une année fiscale** (par défaut 1er janvier au 31 décembre, paramétrable par saison).
  Motif : faciliter le réabonnement et le rattachement budgétaire côté client.
- Quatre temps forts :
  1. **Ouverture** : l'entreprise découvre sa plateforme, les associations publient leurs premières annonces.
  2. **Action** : les missions se réalisent, le **classement est recalculé chaque semaine**.
  3. **Trimestre** : affiches, remise de trophées, rapport trimestriel allégé. Le **top 10 %** des entreprises
     est mis en avant à chaque trimestre.
  4. **Clôture** : remise finale et rapport annuel détaillé.
- Une saison a un état : `brouillon`, `ouverte`, `close`.

## 4. Les annonces

Publiées par une association. Trois types, et trois seulement en v1 :

| Type | Code | Points (v1) |
|---|---|---|
| Don financier | `don_financier` | 1 point par tranche de 10 € versés |
| Bénévolat demi-journée | `benevolat_demi_journee` | 150 points par demi-journée validée |
| Don de matériel | `don_materiel` | 100 points par don validé |

**Le barème est fixe et imposé par la plateforme.** L'association ne choisit pas la valeur de son annonce :
elle choisit le type, la quantité attendue et la description. Les points sont calculés automatiquement.
Décision du 30/07/2026, elle annule la version où les associations fixaient elles-mêmes les points.

Le barème v1 ci-dessus est **provisoire et révisable à la fin de la première saison**. Il est stocké en base
(table `bareme`) et versionné par saison, pas codé en dur, pour pouvoir être ajusté sans migration.

## 5. Le cycle d'une mission

1. L'association publie une annonce (état `ouverte`).
2. Un salarié se positionne. La mission passe en `engagee`.
3. Après réalisation, un mail automatique part vers l'association : « la mission a-t-elle bien été faite ? »
4. L'association valide ou refuse. Validée -> `validee`, les points sont crédités à l'entreprise.
   Refusée -> `refusee`, aucun point.
5. Sans réponse de l'association sous 14 jours, la mission passe en `validee_auto` et les points sont crédités.
   Motif : ne pas bloquer indéfiniment un dossier sur une absence de réponse.
   Le résultat correspondant reste estimé et identifié comme non confirmé.

Les points sont crédités à l'**entreprise**, et attribués nominativement au salarié pour son propre suivi.

## 5 bis. Le classement, et pourquoi il est normalisé

Un classement brut entre une entreprise de 40 salariés et un groupe de 4 000 n'a aucun sens,
et un classement dont on peut acheter la première place n'en a pas davantage. Trois règles
protègent la crédibilité du jeu.

### Classement principal : points par salarié
Le classement de référence divise les points retenus par l'effectif déclaré, et se lit
**par catégorie de taille** : moins de 50, 50 à 199, 200 à 499, 500 et plus. Le total brut
reste consultable, mais comme lecture secondaire, jamais comme classement officiel.

### Plafond par format
**Aucun format ne peut peser plus de 50 % des points d'une entreprise sur la saison.**
Sans ce plafond, il suffirait de virer de l'argent pour truster le classement, ce qui viderait
le jeu de son sens. Les points au-delà du plafond sont affichés comme « écrêtés » : ils comptent
dans ce que l'entreprise a fait, pas dans son rang.

### Ce que le score n'est pas
Le score mesure un **engagement**, pas un impact environnemental. Riseva ne le présente jamais
comme une mesure scientifique, ni dans l'interface, ni dans les rapports, ni en démarchage.

### Qui est nommé, et qui ne l'est pas

- **Seule la moitié haute de la cohorte est nommée.** Un classement qui expose les derniers
  punit ceux qui participent : une entreprise qui n'entre pas n'apparaît nulle part, une
  entreprise qui entre et finit dernière est nommée dernière. Le calcul du dirigeant est vite
  fait, et il est rationnel. Nommer seulement la moitié haute retire la raison de rester dehors
  sans retirer la raison de bien faire.
- **Une entreprise se voit toujours elle-même**, à son rang réel, quel que soit ce rang.
- **Trois réglages**, le défaut protégeant : `auto` (nommée dans la moitié haute), `nom`
  (nommée quel que soit le rang), `anonyme` (jamais nommée, même en tête).
- **Un groupe d'ex æquo à cheval sur la médiane n'est pas nommé.** Départager deux scores
  identiques par leur ordre dans un tableau reviendrait à exposer l'un et protéger l'autre au
  hasard.
- **L'identifiant est retiré en même temps que le nom**, côté base comme à l'écran. Le garder ne
  servirait qu'à le joindre à la table `entreprise`, dont le nom, la ville et le secteur sont
  lisibles publiquement : une anonymisation qui laisse la clé primaire n'anonymise rien.
- **L'export CSV suit la même règle** que l'écran, et retire l'effectif exact d'une entreprise
  anonymisée — il la désignerait à lui seul.
- **Ce n'est pas de l'anonymat, et il ne faut pas le vendre comme tel.** Une entreprise qui
  communique elle-même sur sa participation se désigne. Riseva, elle, ne publie pas la liste de
  ses clients : sans cela, « absent de la moitié haute » se lirait comme « dans la moitié basse ».

## 5 ter. Le goulot de validation

Si les associations ne valident pas, les salariés n'ont pas leurs points, les entreprises voient
des données incomplètes et le jeu perd sa crédibilité. Quatre garde-fous :

- Délai affiché en clair sur chaque mission en attente, en jours.
- Validation en masse : l'association coche et confirme tout d'un coup.
- Validation automatique au bout de quatorze jours sans réponse.
- Refus motivé : l'association explique, l'entreprise est prévenue, le besoin redevient disponible.

## 5 quater. Les rôles dans l'entreprise

- **Administrateur** : gère l'équipe, le lien, les rapports, l'abonnement. Il peut en nommer d'autres.
- **Salarié** : répond aux annonces, voit le classement et son activité.

Un administrateur peut nommer un salarié administrateur. Le **dernier administrateur ne peut
pas être retiré** : il faut en nommer un autre avant. Un seul compte capable d'agir est une
panne en attente.

## 6. L'argent

### Abonnement entreprise
- **Préinscription gratuite**, sans engagement, ouverte avant que la plateforme soit complète.
- **Finalisation** de l'inscription avec un **acompte de 500 €**, intégralement **remboursé si la saison
  ne démarre pas**. Décision du 30/07/2026.
- Prix de l'abonnement annuel v1 : **fourchette 3 500 à 4 000 € HT / an**, positionnement volontairement bas
  en tant que nouvel entrant. Le prix exact est un paramètre de saison, pas une constante.
- Interdit : promettre que le tarif restera identique pour les premières entreprises. Retiré le 29/07/2026,
  reconfirmé le 30/07/2026. Ne doit réapparaître nulle part.

### Deux modèles de reçu, et ils ne sont pas interchangeables

| Qui donne | Modèle | Base légale |
|---|---|---|
| Un salarié, de sa poche | **Cerfa 11580*05** (2041-RD) | Article 200 du CGI |
| L'entreprise (don ou mécénat de compétences) | **Cerfa 16216*03** (2041-MEC-SD), millésime 2026 | Article 238 bis du CGI, obligatoire depuis le 01/01/2022 |

Les millésimes changent, et un modèle périmé peut être écarté en cas de contrôle. Ils vivent
donc dans l'objet `FISCAL` et sont datés de leur dernière vérification.

Un salarié qui donne personnellement reste un particulier, même si son geste rapporte des points
à son entreprise. Se tromper de modèle, c'est un reçu inopposable.

### Le reçu fiscal : qui l'émet

**Seule l'association bénéficiaire peut délivrer un reçu fiscal.** Le document doit émaner de
l'organisme, porter son numéro d'ordre dans une numérotation continue, et être signé par une
personne habilitée. Aucun tiers ne peut le délivrer à sa place.

Riseva **prépare et envoie**, l'association **émet et répond**. Concrètement :

- L'association déclare son éligibilité au mécénat, désigne un signataire habilité et sa qualité,
  et fournit son préfixe et son compteur de numérotation.
- Tant qu'un de ces réglages manque, **la plateforme n'émet rien**. Émettre un reçu irrégulier
  expose l'association à une amende égale à 25 % des sommes qui y figurent (article 1740 A du CGI).
- Riseva fournit à l'association le récapitulatif dont elle a besoin pour sa **déclaration annuelle
  des dons** (montant global porté sur les reçus et nombre de reçus), obligatoire depuis 2021,
  à déposer dans les trois mois suivant la clôture de son exercice.

Toute formulation laissant croire que Riseva émet le reçu « au nom de » l'association est à
proscrire, sur le site comme en démarchage.

### Dons aux associations — par virement direct
- **Riseva n'encaisse jamais.** Recevoir des fonds pour les reverser à un tiers, c'est fournir un
  service de paiement au sens des articles L. 314-1 et L. 521-1 du code monétaire et financier ;
  l'exercer sans agrément est puni de trois ans et 375 000 € (art. L. 572-5). Aucun montage — compte
  de cantonnement, « simple facilitation », « intermédiaire technique » — ne change cette
  qualification. On n'y touche pas, et il n'y a donc **aucun prestataire de paiement** dans le
  produit.
- Le donateur **vire directement** à l'association, sur l'IBAN qu'elle a renseigné, avec une
  **référence émise par Riseva** (`RSV-XXXX-XXXX`). C'est cette référence qui permet à l'association
  de rapprocher une ligne de son relevé d'un don annoncé.
- **Aucun point avant confirmation.** L'association retrouve la référence sur son relevé et confirme
  le montant réellement crédité — le sien fait foi, pas celui qui avait été annoncé. Contrairement au
  bénévolat, il n'y a pas de validation automatique au bout de quatorze jours : un silence n'est pas
  une faute, mais un silence ne vaut pas encaissement.
- Une intention non honorée **s'éteint au bout de trente jours**, sans conséquence pour personne.
  Sans échéance, le « reste à financer » d'une annonce serait faux en permanence.
- **Aucune annonce de don sans IBAN.** Demander de l'argent sans dire où le verser, c'est publier un
  besoin auquel personne ne peut répondre.
- Conséquences assumées : c'est moins fluide qu'un bouton « Donner ». En échange, il n'y a ni frais,
  ni délai de reversement, ni prestataire qui puisse fermer un compte, et l'association reçoit
  **100 %** du don le jour où sa banque le crédite.
- Le **reçu fiscal** est émis par l'association, jamais par Riseva. Riseva le prépare et le transmet
  **sous mandat écrit, daté, nominatif et révocable à tout moment**. Sans mandat, la plateforme
  n'émet rien.
- Détail dans `docs/DON-VIREMENT.md`.

## 5 quinquies. Les réalisations, et ce qui se compte tout seul

Les points classent, les réalisations décomptent. Ce sont deux choses différentes et elles ne
doivent jamais être mélangées.

Une annonce peut porter une **unité de réalisation** et un rendement : « 40 arbres par
demi-journée », « 90 colis par demi-journée », « 0,4 repas par euro ». Le catalogue d'unités est
**fermé** : laisser saisir du texte libre produirait « arbres », « arbre » et « Arbres plantés »,
soit trois totaux qu'on ne peut plus additionner.

Deux règles tiennent l'honnêteté du chiffre :

1. **Seules les missions validées comptent.** Une réservation ne produit rien.
2. **Le chiffre déclaré par l'association l'emporte** sur l'estimation de l'annonce. Elle était
   sur place, pas nous. Au moment de valider, elle corrige librement.

Les totaux remontent automatiquement : tableau de bord de l'entreprise, activité du salarié,
rapport de saison, page publique de l'association, et compteur du réseau sur le site. Nulle part
un chiffre n'est saisi à la main.

Partout où ils s'affichent, ils portent leur provenance : *chiffres déclarés par les associations
bénéficiaires, Riseva additionne, elle n'audite pas*. Et jamais le mot « impact ».

## 5 sexies. Ce qui se fait sans personne

Quatre automatismes, définis dans `supabase/05_taches.sql` et exécutés par la base, pas par
l'interface : ils doivent tourner même si personne n'ouvre la plateforme de la semaine.

| Tâche | Quand | Règle |
|---|---|---|
| Validation sans retour | tous les jours à 3 h | Quatorze jours après la déclaration, une mission sans réponse est comptée comme réalisée |
| Fraîcheur des annonces | tous les jours à 3 h 30 | Une annonce dépassée depuis plus de sept jours est fermée |
| Rapports de période | tous les jours à 4 h | Chaque période close produit son rapport, une seule fois |
| Classement | le lundi à 6 h | Vue rafraîchie. Aucun rang n'est stocké : il se déduit des points |
| Relances de validation | tous les jours à 13 h | Un mail à 3 h du matin se lit mal |

Chaque passage est consigné avec sa date, son nombre de lignes touchées et sa durée, et
l'administration Riseva le consulte. Une automatisation qu'on ne peut pas auditer inquiète plus
qu'elle ne rassure.

## 5 septies. Ce que l'employeur ne doit pas pouvoir déduire

La cause d'une association peut révéler une conviction religieuse, une opinion politique, un état
de santé ou une appartenance syndicale : des catégories particulières au sens du RGPD. Rattacher
un don personnel à un nom dans les écrans de l'employeur revient à lui livrer cette déduction.

- Un don personnel n'est **jamais nominatif** côté employeur : ni le nom, ni le montant, ni
  l'association.
- Les points affichés dans l'espace Équipe sont ceux **des missions uniquement**.
- Un agrégat de dons ne s'affiche qu'à partir de **cinq donateurs**. En dessous, rien : un total
  et un effectif suffisent à remonter aux personnes.
- Le classement interne à l'entreprise ne sort jamais de l'entreprise. Vers l'extérieur, seul le
  total collectif est publié.
- Le salarié, lui, voit tout ce qui le concerne dans son espace.

**Base légale : l'intérêt légitime, pas le consentement.** La relation employeur-salarié est
structurellement déséquilibrée, et un consentement qu'on ne peut pas refuser librement n'en est
pas un. L'accord demandé mission par mission pour les missions sur le temps de travail répond à
une exigence du code du travail, pas à l'article 6 du RGPD.

## 6 bis. Le mécénat, et ce qu'il rapporte au client

C'est l'argument économique du produit, et il doit être exact.

### Le fondement juridique de la mise à disposition

Prêter un salarié à titre lucratif est interdit. Riseva se place sous l'**article L. 8241-3 du
code du travail**, qui autorise le prêt gratuit au profit des organismes visés aux a à g du 1 de
l'article 238 bis du CGI. Dans ce cadre : aucune condition d'effectif pour l'entreprise prêteuse,
gratuité expressément permise, durée maximale de trois ans, et pas de but lucratif à démontrer.

La convention doit contenir les cinq mentions de l'article R. 8241-2, et il faut l'accord exprès
et écrit du salarié ainsi que l'information du CSE. La plateforme génère la convention préremplie
avec ces mentions.

### Qui donne détermine tout

| Qui verse | Entre dans l'assiette de l'entreprise | Reçu | Réduction |
|---|---|---|---|
| L'entreprise, don financier | **oui** | Cerfa 16216*03 au nom de l'entreprise | 60 % à l'IS |
| L'entreprise, mise à disposition sur le temps de travail | **oui** | Cerfa 16216*03 | 60 % à l'IS |
| **Un salarié, de sa poche** | **non** | Cerfa 11580*05 à son nom | 66 % à l'IR, pour lui |
| Une mission sur le temps personnel | non | — | aucune |

C'est le point où l'on se trompe le plus, et l'erreur coûte cher : **les dons personnels des
salariés ne peuvent pas entrer dans l'assiette de l'entreprise.** L'article 238 bis vise les
versements effectués par l'entreprise elle-même. Les additionner fabriquerait une réduction
d'impôt indue, au détriment du client qui la déclarerait. La plateforme les compte séparément
et le dit à l'écran.

La distinction est portée par l'annonce : l'association coche « sur le temps de travail » quand
la mission est proposée pendant les heures ouvrées. Elle se propage à la mission et au calcul.

### Les chiffres (millésime 2026, paramétrables)

- **Réduction d'impôt : 60 %** du montant, ramenée à 40 % pour la fraction d'un même don qui
  dépasse 2 M€.
- **Plafond annuel** : le plus élevé entre **20 000 €** et **5 ‰ du chiffre d'affaires HT**.
  L'excédent est reportable sur les **cinq exercices** suivants.
- **Mécénat de compétences** : valorisation au **coût de revient** (rémunération brute chargée,
  au prorata du temps mis à disposition), plafonnée à « trois fois le montant du plafond mentionné
  à l'article L. 241-3 du code de la Sécurité sociale » (BOI-BIC-RICI-20-30-10-20).
  **Le BOFiP ne précise pas si ce plafond est mensuel ou annuel, et les sources divergent.**
  Nous retenons la lecture basse, mensuelle : 3 × 4 005 € = **12 015 €** par salarié et par an.
  Elle sous-estime plutôt qu'elle ne promet trop, et la valeur est paramétrable pour que
  l'expert-comptable du client tranche.

Ces valeurs vivent dans un objet `FISCAL` et non dans le code des écrans : elles changent chaque
année, le produit ne doit pas être redéployé pour ça.

### Ce que Riseva dit, et ne dit pas

Riseva produit une **estimation**, à partir de ce qui s'est réellement passé sur la plateforme et
du coût journalier moyen renseigné par l'entreprise. C'est l'expert-comptable qui arrête les
chiffres, et l'éligibilité de chaque association au mécénat reste à vérifier. Jamais de promesse
de montant, jamais de « déclaration » prête à déposer.

## 7. Les associations

- Gratuit pour elles, toujours.
- Aucune contrainte technique de leur côté : elles n'ont rien à installer, rien à brancher sur leur back-office.
  C'est la raison du virement direct plutôt que d'une intégration de paiement chez chaque asso :
  un IBAN, elles en ont déjà un.
- **Aucune restriction territoriale.** Riseva ne s'engage pas sur une région donnée.
- Riseva **n'assure rien**. En cas d'incident pendant une mission de bénévolat, la responsabilité est
  entre l'entreprise et l'association. Ce point doit apparaître dans les CGU et sur la fiche mission.
- Recrutement des associations : à faire **après** la mise en ligne de la plateforme, pas avant.
- **Une association ne fournit qu'un numéro.** Riseva interroge le registre public
  (Annuaire des Entreprises, licence ouverte) et remplit la fiche à sa place :
  dénomination déposée, adresse, coordonnées, RNA. Aucun justificatif n'est
  demandé, et il ne faut pas en demander.
- **Un contrôle daté, jamais une sanction automatique.** Le contrôle conserve la
  réponse brute du registre à côté de son verdict, et vaut un an. Un contrôle
  bloquant — structure fermée, numéro introuvable, dénomination sans rapport —
  interdit la mise en ligne tant qu'il n'a pas été refait. L'absence de contrôle,
  elle, ne bloque rien : neuf associations déclarées sur dix n'ont pas de SIREN,
  et les exclure reviendrait à ne garder que les grosses.
- **Le registre ne prouve pas l'éligibilité au mécénat.** Aucun registre public ne
  la porte. Seule l'association peut l'affirmer. Détail dans `docs/ANNUAIRE-PUBLIC.md`.

## 8. Les rapports

Générés automatiquement à partir de la base, sans intervention manuelle.

- **Trimestriel** : allégé. Points du trimestre, rang, top actions, participation des salariés.
- **Annuel** : détaillé. Cumul de la saison, évolution trimestre par trimestre, nombre de salariés engagés,
  nombre de missions par type, montant total donné, et un **volet impact global du réseau** identique pour
  toutes les entreprises (ce que les associations du réseau ont accompli dans l'année).
- Format : consultable en ligne + export PDF.

## 9. Hors périmètre v1

Explicitement exclus, ne pas les construire :

- Application mobile native et site mobile dédié. Le responsive suffit.
- Boutique de merchandising (t-shirts, mugs, parapluies en matériaux recyclés co-brandés). Idée conservée,
  non décidée.
- Toute forme de tarif garanti à vie ou de statut « entreprise fondatrice » avec avantage tarifaire.

## 10. Points encore ouverts

À trancher avant la première saison réelle, tracés ici pour ne pas les oublier :

- Valeur exacte du barème après calibrage sur les premières entreprises.
- Prix final de l'abonnement dans la fourchette annoncée.
- Forme juridique (SASU évoquée le 30/07/2026, non actée). Pas de SIREN au 30/07/2026.
- Financement des affiches et du merchandising.
