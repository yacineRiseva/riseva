# Riseva, plateforme RSE de groupe — analyse et proposition

Document de conception. Il précède le code, exprès : ce qui suit change le modèle de
données, donc le contrat, la facture et le calcul fiscal. Se tromper ici coûte cher
plus tard.

Ma propre analyse d'abord. La confrontation avec ChatGPT est en fin de document.

---

## 1. Ce qui est demandé

Une entreprise mère achète un abonnement, distribue des liens d'invitation aux RH de
ses différents sites, chaque lien portant un quota de comptes. Chaque site a son
score. La mère paie pour tout et voit le consolidé. Elle veut aussi mutualiser des
données RSE entre sites — l'accidentologie, par exemple — et les retrouver dans le
rapport.

C'est la bonne direction. Mais le mot « site » recouvre deux choses très
différentes en droit français, et les confondre casse le produit.

---

## 2. Le modèle : trois niveaux, pas un

```
groupe                      le payeur, le périmètre de consolidation volontaire
  └── société  (SIREN)      la personne morale : contrat, facture, impôt, employeur
        └── établissement (SIRET)   le lieu : effectif, quota, score, accidentologie
              └── salarié
```

Aujourd'hui, Riseva n'a qu'un niveau : `entreprise`. Il faut en ajouter deux.

### Pourquoi « site = simple étiquette » ne tient pas

C'est la solution tentante — une colonne `site` sur le salarié — et elle casse sur
six points, tous vérifiables :

1. **Le plafond fiscal.** Les 20 000 € ou 5 ‰ du chiffre d'affaires s'appliquent
   **par redevable de l'impôt**, donc par société. Ni par groupe, ni par site. Une
   étiquette ne porte ni SIREN ni chiffre d'affaires : dès la deuxième société du
   groupe, le calcul de mécénat devient faux. Nous venons justement de refuser
   d'afficher un plafond que nous ne savons pas calculer ; ce serait le réintroduire
   par la porte de derrière.

2. **La facture.** Une facture doit porter l'identité et le SIREN des deux parties.
   Si la mère paie pour une filiale, c'est soit une facture par société, soit une
   refacturation intragroupe avec sa convention et sa TVA. Une étiquette ne permet
   ni l'un ni l'autre.

3. **La convention de mise à disposition.** Elle lie l'association, le salarié et
   **son employeur**. L'employeur, c'est la société. Un site n'est pas un employeur
   et ne peut pas signer.

4. **Les seuils sociaux.** L'accidentologie se suit par établissement, pour le CSE
   d'établissement, et se consolide au niveau de l'entreprise. L'index d'égalité
   professionnelle se calcule par entreprise, ou par UES quand elle existe. La BDESE
   est au niveau de l'entreprise. Le document unique descend jusqu'à l'unité de
   travail. Une étiquette ne sait pas à quel niveau agréger — donc elle agrège mal.

5. **Le RGPD.** Le responsable de traitement, c'est l'employeur, donc la société.
   Deux sociétés d'un même groupe sont deux responsables distincts : les données
   nominatives ne circulent pas librement de l'une à l'autre. Avec une étiquette,
   tout se retrouve dans la même table, sous le même contrat, et un administrateur
   de la mère lit les salariés d'une filiale. C'est la faute la plus coûteuse que ce
   produit puisse commettre.

6. **La sécurité.** Une étiquette est une colonne qu'on oublie dans un `where`. Un
   périmètre est une ligne dans `private.appartenance` et une politique RLS, comme
   l'entreprise aujourd'hui. Nous avons déjà écrit soixante-six assertions pour
   prouver le cloisonnement : elles doivent porter sur le nouveau niveau aussi.

---

## 3. Les rôles, et la circulation des droits

| Rôle | Périmètre | Ce qu'il voit | Ce qu'il ne voit pas |
|---|---|---|---|
| `admin_groupe` | le groupe | scores, indicateurs et coûts **agrégés** par société et par site | jamais le détail nominatif d'une société dont il n'est pas salarié |
| `referent_societe` | une société | contrat, factures, mécénat, données fiscales, tous ses établissements | les autres sociétés |
| `referent_site` | un établissement | ses salariés, ses missions, ses indicateurs, son score | les autres établissements |
| `salarie` | lui-même | ses missions, ses points | tout le reste |

**Deux liens, pas un.** L'administrateur du groupe n'invite pas les salariés. Il
alloue un quota de comptes à un établissement et envoie un lien **nominatif** au
référent de ce site. Celui-ci l'accepte, devient `referent_site`, et c'est lui qui
produit le lien d'inscription de ses salariés, dans la limite de son quota.

Deux niveaux, deux liens, deux entrées au journal des accès. Sans ça, un groupe se
retrouve avec trois mille comptes ouverts par une personne qui ne connaît personne,
et plus aucune traçabilité de qui a autorisé quoi.

**Le quota est une ressource, pas un chiffre décoratif.** Le total des quotas
alloués ne peut pas dépasser les places du contrat ; un compte retiré rend sa place
à son établissement, pas au pot commun — sinon le premier site servi mange tout.

---

## 4. Le classement inter-sites : ce qui débloque le produit

C'est le point le plus important de cette note, et il n'était pas dans la demande.

Le classement inter-entreprises exige **dix entreprises dans une catégorie**, et nous
avons écrit noir sur blanc que nous ne garantissons aucune date pour ce seuil. C'est
honnête, mais ça vide le principal élément différenciant pendant toute la première
saison.

**Le classement inter-sites fonctionne dès le premier client.** Un groupe de trois
sites, c'est déjà un classement — et c'est un classement bien plus motivant :
Marseille contre Lyon, avec des gens qui se connaissent, qui se charrient en réunion
et qui ont un chef commun. Ça ne dépend de personne d'autre que du client lui-même.

Deux conditions pour que ce soit tenable :

- **Normaliser par l'effectif de l'établissement.** Sinon le siège de quatre cents
  personnes écrase l'agence de douze, et l'agence décroche à la deuxième semaine.
- **Ne jamais descendre au salarié.** Le classement compare des sites, jamais des
  personnes. C'est déjà la règle ; elle devient plus difficile à tenir quand les
  effectifs comparés sont petits, donc les agrégats sous cinq salariés ne
  s'affichent pas — même seuil que pour les dons personnels.

---

## 5. Facturation d'un groupe

- **Une facture au groupe**, ou une facture par société, selon ce que le client
  choisit à la commande. Les deux doivent exister : les groupes intégrés
  fiscalement veulent la première, les autres la seconde.
- **Une clé de répartition analytique** exportable en CSV : combien de comptes, donc
  quelle quote-part, par société et par établissement. C'est ce que réclame un
  contrôleur de gestion pour imputer la dépense, et ça coûte trois lignes de code.
- **Le mécénat reste calculé par société.** Le rapport de groupe additionne des
  réductions d'impôt calculées séparément, et le dit.

---

## 6. Les services RSE, classés par vitesse de signature

### 6.1 Registre des indicateurs sociaux et sécurité — *le vrai besoin*

Ce qui coûte cher à une ETI, ce n'est pas le calcul : c'est la **collecte**. Relancer
quatorze sites par courriel pour obtenir un tableur mal rempli, trois mois par an.

Riseva sait déjà faire exactement ça : demander à quelqu'un une réponse courte, par
un lien qui marche **sans connexion**, avec des rappels, un délai, et une clôture
explicite quand personne ne répond. C'est le mécanisme des quatorze jours, réemployé
tel quel.

Ce qui se collecte, par établissement et par période :

- effectif à la clôture, entrées, sorties, turnover ;
- heures travaillées ;
- accidents du travail avec arrêt, jours d'arrêt, accidents de trajet ;
- taux de fréquence (TF1, TF2) et taux de gravité, **calculés** par la plateforme
  selon des formules publiées, à partir des heures et des accidents saisis ;
- heures de formation et nombre de bénéficiaires ;
- répartition femmes / hommes par catégorie ;
- bénéficiaires de l'obligation d'emploi.

Ce que ça alimente : la BDESE, le bilan social, la déclaration d'emploi des
travailleurs handicapés, l'index d'égalité professionnelle, et le socle social du
référentiel VSME.

**Ce que nous ne faisons pas :** nous calculons, nous ne certifions pas. Chaque
valeur porte qui l'a saisie, quand, et si elle a été confirmée ou clôturée sans
réponse — exactement la même discipline que les missions. Et nous ne déposons rien à
la place du client.

### 6.2 Registre des dons de matériel, au titre de la loi AGEC — *le plus proche de l'axe*

C'est le service qui relie le mieux la RSE et l'associatif, parce qu'il répond à une
**interdiction légale** : les invendus non alimentaires neufs ne peuvent plus être
éliminés, ils doivent être réemployés, réutilisés ou recyclés, et le don à une
association est la voie prévue par le texte.

Riseva devient la preuve de ce don : quoi, combien, à qui, quand, avec la déclaration
de réception de l'association et le reçu. **Aucun travail supplémentaire pour
l'association** : elle déclare « reçu », comme aujourd'hui.

Un piège à ne pas rater : un don en nature se valorise à sa **valeur nette
comptable**, pas à la valeur neuve. Afficher un prix catalogue fabriquerait une
réduction d'impôt indue — le même piège que le mécénat de compétences valorisé en
demi-journées. Le registre demande donc la valeur en stock, et le dit.

### 6.3 Le rapport assemblé, au format VSME

Le moteur existe déjà. On y branche le module social, on garde la séparation
confirmé / estimé, l'empreinte, la date d'arrêté et la mention « données déclarées,
non auditées par Riseva ». On couvre la partie sociale et communautés, et **on écrit
ce qu'on ne couvre pas**.

### 6.4 La banque de réponses aux questionnaires clients

Un coffre de réponses datées et sourcées, réutilisables d'un questionnaire
fournisseur à l'autre. C'est souvent le vrai déclencheur d'achat en PME : un client
important demande, il faut répondre en huit jours, personne ne sait où sont les
chiffres.

### 6.5 Plus tard, ou jamais

Le plan de mobilité et le forfait mobilités durables sont utiles mais loin de l'axe,
et déjà servis par des outils dédiés.

---

## 7. Les pièges — ce que je refuse d'intégrer

| Ce qui a l'air vendable | Pourquoi c'est un piège |
|---|---|
| Produire un bilan carbone | C'est un métier normé, avec des facteurs d'émission à tenir à jour. Un chiffre faux là-dessus est un scandale, pas un bug. Nous pouvons **héberger** le résultat d'un prestataire, pas le produire. |
| Donner une note RSE | Juge et partie. Sans méthodologie auditée, la note ne vaut rien, et elle décrédibilise tout le reste. |
| Télédéclarer à la place du client | Nous produisons le fichier, l'entreprise dépose. Prendre la responsabilité du dépôt, c'est prendre celle du retard et de l'erreur. |
| Consolider des données nominatives entre sociétés | Deux responsables de traitement distincts. On consolide des agrégats, jamais des personnes. |
| Promettre la conformité CSRD ou VSME | Nous produisons des données. La conformité est l'affaire de l'entreprise et de son commissaire aux comptes. |
| Un module « bien-être » ou « climat social » par questionnaire salarié | Collecte de données sensibles, faible valeur perçue, et un risque social interne dont nous n'avons pas les épaules. |

---

## 8. Ce que ça ne change pas, côté association

Une association publie un besoin et confirme qu'il a été satisfait. **Rien d'autre.**
Aucun des services ci-dessus ne lui demande une saisie supplémentaire : les
indicateurs sociaux viennent de l'entreprise, le registre de dons se remplit à partir
de la déclaration de réception qu'elle fait déjà, et le rapport est assemblé sans
elle.

Si un service futur exige un geste de plus de la part d'une association, ce service
ne se fait pas.

---

## 9. Confrontation avec ChatGPT

Je lui ai posé la question sans lui montrer mon analyse, pour ne pas l'orienter. Il a
cherché pendant six minutes et il est allé plus loin que moi sur quatre points. Voici
ce que je retiens, ce que je refuse, et ce que je corrige dans mon propre modèle.

### Ce sur quoi nous tombons d'accord

Le modèle à trois niveaux, la séparation société / établissement, le fait qu'une
étiquette casse la fiscalité, les droits et les dénominateurs, la nécessité de deux
liens d'invitation, le quota comme ressource finie, le refus du bilan carbone, du
score RSE unique et de la télédéclaration à notre place. Et surtout : **aucun service
nouveau ne doit coûter une minute de plus à une association.**

### Quatre corrections que j'adopte, parce qu'il a raison

1. **L'affectation doit être datée, et l'attribution figée sur la mission.**
   C'était un vrai défaut dans ce que je venais d'écrire : je calculais le score d'un
   site à partir de l'établissement *actuel* du salarié. Un salarié muté de Lyon à
   Marseille aurait donc déplacé son passé avec lui, et le classement de la saison
   dernière aurait changé tout seul. Chaque mission fige désormais **deux
   attributions** : l'établissement qui reçoit les points, et la société employeuse
   qui porte les conséquences fiscales.

2. **Un consolidé est un rapport de sommes, jamais une moyenne de ratios.**
   Le score du groupe, c'est la somme des points divisée par la somme des effectifs.
   Pas la moyenne des scores de Paris, Lyon et Marseille. Idem pour un taux de
   fréquence d'accidents. C'est l'erreur classique, et elle est invisible à l'œil.

3. **Le lien capitalistique ne crée aucun droit d'accès.**
   Je l'avais écrit pour le nominatif ; il va plus loin, et il a raison : le payeur
   reçoit les factures, cela ne lui donne rien d'autre. Un « responsable RSE groupe »
   voit des consolidés, pas des identités, sauf habilitation nommée et journalisée.

4. **Séparer celui qui saisit un indicateur de celui qui l'approuve.**
   Contributeur et approbateur sont deux rôles. Sans ça, un chiffre entre dans un
   rapport contractuel sans que personne ne l'ait regardé. Et un indicateur verrouillé
   ne se modifie pas en silence : il se corrige avec une nouvelle version.

Trois précisions supplémentaires que je reprends telles quelles :

- **L'UES n'est pas un niveau de l'arbre**, c'est un périmètre transversal, daté et
  fondé sur un accord ou une décision de justice. Un « établissement distinct » au
  sens du CSE peut regrouper plusieurs SIRET et ne correspond pas forcément à un lieu.
- **Un site opérationnel peut regrouper plusieurs SIRET.** Le site de Lyon n'est pas
  toujours un établissement Insee : c'est un objet interne. Le score se calcule sur le
  site, la fiscalité sur la société.
- **En accidentologie, jamais de classement entre sites.** Un classement crée une
  incitation à sous-déclarer les accidents. Comparaison dans le temps uniquement.

### Ce que j'apporte et qu'il n'a pas vu

**Le registre des dons de matériel au titre de la loi AGEC.** C'est le seul service de
toute la liste qui soit à la fois une obligation légale pour le client, un
prolongement direct de l'axe associatif, et un coût nul pour l'association — elle
déclare « reçu », comme aujourd'hui. Il ne figure dans aucune de ses neuf lignes. Je
le garde, avec sa mise en garde : valorisation à la valeur nette comptable, jamais au
prix catalogue.

**Le classement entre sites comme réponse au démarrage à froid.** Il traite le
classement comme un mécanisme parmi d'autres ; pour moi c'est ce qui débloque la
première saison, puisqu'il fonctionne avec un seul client.

### Ce que je refuse dans sa liste

- **La BDESE complète.** Il le dit lui-même : elle contient des données financières,
  d'investissement et de rémunération très au-delà de notre périmètre. Nous
  fournissons **des volets** — social, sécurité, environnement, engagement — et un
  accès en lecture au CSE. Rien de plus, et c'est écrit.
- **Le carbone, même en « préparation de données ».** Collecter des kilomètres et des
  factures d'énergie sans moteur de facteurs d'émission, c'est fabriquer un fichier
  que quelqu'un d'autre transformera en chiffre dont nous porterons le nom. Plus tard,
  ou avec un partenaire nommé au contrat.
- **Le workflow Index égalité et le tableau OETH**, pour l'instant. L'État fournit
  déjà les outils de déclaration, la valeur ajoutée se limite à la collecte
  multi-SIREN, et nous avons mieux à faire d'ici la première saison.

### Ordre de construction retenu

1. Le modèle multi-entités et les droits par périmètre — sans lui, tout le reste est faux.
2. La collecte d'indicateurs par établissement, avec contributeur et approbateur.
3. L'accidentologie et ses taux, calculés en rapport de sommes, sans classement.
4. Le rapport de groupe et le dossier VSME, avec provenance ligne à ligne.
5. Le registre des dons de matériel au titre de la loi AGEC.
6. Les volets BDESE et l'accès CSE en lecture.

### Ce qui reste à trancher par Yacine

- **Le prix de l'abonnement groupe.** Par société, par établissement, par compte, ou
  socle plus compte ? Ma proposition : un socle de groupe, plus un prix par
  établissement raccordé, plus un prix par compte au-delà d'un inclus — mais c'est une
  décision commerciale, pas technique.
- **L'accidentologie dès la première saison, ou après ?** C'est le service qui parle
  le plus à un groupe industriel, et c'est aussi celui qui demande le plus de rigueur.
- **Faut-il un accès en lecture pour le CSE ?** C'est un argument de vente fort auprès
  d'une direction, et une contrainte de plus sur le cloisonnement.

---

## 10. Deuxième confrontation : ce qui n'aurait pas survécu à la première réunion

Écrans en main, j'ai redemandé à ChatGPT ce qui casserait devant un directeur RSE de
groupe ou un préventeur HSE. Son verdict : *« crédible pour vendre un pilote
d'engagement associatif multi-sites ; pas encore vendable comme plateforme RSE/HSE de
groupe. »* Il avait raison sur six points, dont trois qui étaient des **erreurs de ma
part**, pas des manques.

### Ce que j'avais faux

1. **Ma règle de valorisation des dons en nature était fausse.** J'avais écrit « la
   valeur nette comptable », comme s'il n'y avait qu'une méthode. Il y en a au moins
   deux — un bien en stock se valorise à son coût de revient, une immobilisation à la
   valeur de cession retenue pour la plus ou moins-value de sortie — et la
   valorisation relève de toute façon du donateur. Riseva demande donc la **catégorie
   comptable**, rappelle la méthode qui s'y applique, et enregistre une *valeur
   déclarée par l'entreprise*. Elle ne choisit plus à la place du comptable.

2. **Le « taux d'emploi de travailleurs handicapés » ne se calcule pas comme je le
   faisais.** Diviser les bénéficiaires d'un site par l'effectif de ce site n'a pas de
   sens : l'obligation d'emploi est annuelle, s'apprécie au niveau de la société, sur
   des effectifs moyens annuels, avec ses propres règles de décompte. L'indicateur est
   **retiré**. Reste un comptage interne, nommé comme tel.

3. **Mes taux de fréquence et de gravité portaient un nom réglementaire sans en
   reprendre le numérateur.** Les indicateurs de l'assurance maladie reposent sur les
   accidents *en premier règlement*. Les miens reposent sur ce que le site déclare.
   Ils s'appellent maintenant **fréquence interne** et **gravité interne**, et chaque
   ligne dit qu'ils ne se comparent pas aux taux publiés.

### Ce qui manquait

4. **Un consolidé s'affichait alors que rien n'était approuvé.** Le compteur disait
   « 0 approuvé » et les taux étaient là. Corrigé : deux colonnes, *approuvé* et
   *provisoire*, la seconde annoncée comme telle et exclue des rapports. Et le bouton
   « Approuver » ne s'affiche plus à celui qui a saisi — le serveur le refusait déjà,
   mais l'écran affirmait le contraire.

5. **La couverture se disait en sites, pas en effectifs.** « Deux sites sur quatre »
   peut vouloir dire vingt pour cent du groupe comme quatre-vingt-quinze. Partout
   maintenant : *« 210 salariés sur 255 »*.

6. **Un lien de site n'établit pas l'appartenance à ce site.** Avec un domaine de
   messagerie commun à tout le groupe, n'importe qui peut utiliser le lien de Lyon ; le
   quota empêche de dépasser cent dix comptes, pas de mal affecter quelqu'un — et une
   mauvaise affectation fausse ensuite le score, les rapports et les droits. Un compte
   créé par un lien de site attend désormais **un clic du référent** avant de pouvoir
   s'engager.

7. **Les compteurs de quota étaient trompeurs.** « 0 libres » alors que deux cent
   quarante-huit comptes restaient activables dans les quotas déjà répartis. Cinq
   compteurs distincts désormais : capacité achetée, répartie, comptes ouverts, encore
   activables.

8. **Une période se clôturait avant sa fin.** On ne demande pas le second semestre au
   mois d'août. Une campagne dont la période n'est pas terminée s'appelle un *point
   d'étape*, et la clôture est refusée avant la date de fin.

### Le classement entre sites : il avait raison, j'allais trop vite

Je le présentais comme ce qui débloque la première saison. C'est vrai comme mécanisme
de lancement, et faux comme réglage par défaut. Dans la démonstration, **trois salariés
mobilisés** suffisaient à placer Marseille à 16,25 points par salarié et Paris à 2,5 :
on mesurait la volatilité des petits nombres et la date de démarrage, pas l'engagement.
Et Nantes se retrouvait dernier alors que son référent n'était même pas nommé — puni
avant d'avoir commencé.

Les effets pervers qu'il liste sont réels : pression managériale sur une participation
censée être volontaire, rattachements opportunistes, préférence pour les formats qui
rapportent vite, usage du résultat dans l'évaluation d'un directeur de site, honte
publique d'un site à zéro.

Ce qui est en place maintenant :

- le classement ordinal est **désactivé par défaut**, activé par le groupe, et
  l'activation est journalisée ;
- aucun rang tant qu'un site n'a pas **cinq salariés mobilisés et cinq missions** ;
- un site sans activité est **« en lancement »**, jamais dernier ;
- le nombre de mobilisés et de missions s'affiche **à côté** du score, pour qu'on voie
  sur quoi il repose ;
- c'est nommé **challenge d'engagement associatif**, jamais performance RSE d'un site,
  et il est écrit que cela n'a aucune incidence sur l'évaluation de qui que ce soit.

### La tarification qu'il propose, et ce que j'en pense

Sa règle : **ne pas facturer à la fois un socle, chaque site et chaque compte.** Trois
compteurs variables rendent la proposition illisible et pénalisent l'adoption. Trois
unités contractuelles suffisent : **tranche d'effectif, sites actifs, sociétés
bénéficiaires.**

| Composant | Prix HT |
|---|---|
| Engagement Groupe — jusqu'à 250 salariés, 3 sites actifs, 2 SIREN | 6 900 €/an |
| Module Données sociales et sécurité | + 2 000 €/an |
| Paramétrage initial : structure, rôles, dictionnaire, lancement | 1 500 € une fois |
| Site actif supplémentaire | + 750 €/an |
| SIREN bénéficiaire supplémentaire | + 1 000 €/an |
| Tranche 251 – 500 salariés | + 1 500 €/an |

Pour le groupe de démonstration — deux sociétés, trois sites, 250 salariés :
**8 900 € HT par an**, soit 10 400 € la première année avec le paramétrage. Avec une
remise pilote de 20 % limitée à une saison : environ 7 100 € plus le paramétrage.

Son conseil, que je partage : **ne vendre d'abord que l'offre Engagement Groupe**, à
6 900 – 7 500 €. Les 2 000 € du module social ne deviennent défendables qu'une fois les
niveaux, les sources et les approbations corrigés — ce qui vient d'être fait, mais qui
demande d'être éprouvé sur un vrai client avant d'être facturé.

Trois définitions doivent figurer au contrat, sinon la grille devient ingérable au bout
de deux ans :

- **site actif** : une unité à laquelle un quota ou une collecte est réellement ouvert,
  pas tout SIRET administratif ;
- **effectif éligible** : arrêté à la signature puis au renouvellement, sans ajustement
  mensuel ;
- **société bénéficiaire** : personne morale incluse au périmètre, qu'elle paie ou non.

### Une nuance juridique que j'avais durcie à tort

J'écrivais « deux sociétés d'un même groupe sont deux responsables de traitement
distincts ». C'est vrai la plupart du temps, mais c'est trop absolu : la qualification
dépend de qui détermine les finalités et les moyens, et une responsabilité conjointe
reste possible. La formulation retenue est désormais : *« chaque entité reste
responsable des données de son périmètre ; les accès consolidés et les responsabilités
sont documentés contractuellement. »*

### Ce qui reste ouvert

- Séparer davantage les rôles : coordinateur engagement, gestionnaire RH des comptes,
  contributeur et approbateur, valideur finance, lecteur groupe, suppléant temporaire.
  Aujourd'hui le référent de site les cumule, et cela ne tiendra pas dans une vraie
  organisation.
- Le tableau de bord de site reste léger : il lui manque les échéances à venir, les
  associations proches et un export.
- Un dictionnaire d'indicateurs versionné, avec inclusions et exclusions écrites,
  numérateur et dénominateur bruts, et pièce justificative éventuelle.
