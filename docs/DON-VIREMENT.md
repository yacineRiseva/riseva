# Le don en argent : par virement, et sans jamais y toucher

## Deux circuits, aucun qui passe par Riseva

| Circuit | Pour le donateur | Ce qu'il exige de l'association |
|---|---|---|
| **HelloAsso** | Carte bancaire, immédiat | un compte HelloAsso vérifié et un formulaire de don |
| **Virement** | Un virement depuis sa banque | un IBAN |

HelloAsso a été retenu comme circuit **complémentaire**, pas comme remplacement.
C'est plus fluide, c'est immédiat, et c'est **sans commission** : son modèle
repose sur une contribution volontaire du donateur, modifiable et supprimable.

Trois raisons de ne pas s'y limiter :

1. **Il faut un compte HelloAsso vérifié.** Depuis juin 2025, une association
   doit être vérifiée pour encaisser. Neuf petites associations sur dix n'ont pas
   ce compte, et leur demander de l'ouvrir contredit la seule promesse qu'on leur
   a faite : n'avoir rien à faire d'autre que publier leur besoin.
2. **Il ne délivre pas le reçu fiscal.** La documentation d'intégration le dit :
   les reçus sont à gérer en dehors du Checkout. Tout le travail de préparation
   sous mandat reste donc nécessaire.
3. **L'intégration serveur-à-serveur demande un compte partenaire**, obtenu par
   accord formel avec HelloAsso, ce qui suppose une personne morale. Riseva n'en
   a pas encore.

D'où le choix : **l'association colle l'adresse publique de son propre
formulaire**, et rien d'autre. Aucune clé d'API, aucun secret, aucun accès à son
compte, aucune démarche partenaire à attendre. Le donateur paie par carte, recopie
la référence Riseva dans le message du don, et l'association confirme la réception
comme pour un virement.

Le jour où l'accès partenaire existera, la confirmation deviendra automatique par
webhook — et ce sera la seule chose qui changera.

### Le lien est vérifié, et restreint

Ce lien est présenté à des donateurs sous la phrase « donnez ici ». Un champ libre
pointant n'importe où serait un détournement de dons offert à qui prendrait la main
sur un compte d'association. Il est donc contraint, **dans le navigateur et par
`CHECK` en base**, à `https://www.helloasso.com/associations/<asso>/<type>/<id>` —
HTTPS obligatoire, domaine exact, aucun paramètre après l'identifiant. Un
`helloasso.com.exemple.fr` est refusé.

## Pourquoi Riseva n'encaisse pas

Recevoir des fonds pour les reverser à un tiers, c'est **fournir un service de
paiement** au sens des articles **L. 314-1** et **L. 521-1** du code monétaire et
financier. L'exercer sans agrément est puni de **trois ans d'emprisonnement et
375 000 € d'amende** (art. **L. 572-5**).

Aucun montage ne change cette qualification : ni un « compte de cantonnement »,
ni « nous ne sommes que l'intermédiaire technique », ni « l'argent ne reste que
48 heures ». Le fait générateur est la réception de fonds pour le compte d'un
tiers, pas la durée pendant laquelle on les garde.

Les deux façons légales d'y aller sont l'agrément d'établissement de paiement —
capital minimum, dossier ACPR, dispositif LCB-FT, plusieurs mois — ou
l'intermédiation par un prestataire agréé (HelloAsso, Stripe, un PSP), qui impose
un accès partenaire, une commission, un délai de reversement, et une dépendance :
le jour où le prestataire ferme un compte, l'association n'a aucun recours chez
nous.

**On ne fait ni l'un ni l'autre.** Le donateur vire directement à l'association.

## Le circuit

1. **L'association renseigne son IBAN** dans son espace. Riseva en vérifie la clé
   mod-97 (ISO 13616) — dans le navigateur *et* par contrainte en base. Ce
   contrôle ne prouve pas que le compte existe ni qu'il est le sien ; il écarte
   l'erreur de saisie, qui est de très loin la plus fréquente. Sans IBAN, aucune
   annonce de don ne peut être publiée : demander de l'argent sans dire où le
   verser, c'est publier un besoin auquel personne ne peut répondre.
2. **Le donateur annonce une intention.** Riseva émet une référence
   `RSV-XXXX-XXXX` et affiche l'IBAN, le titulaire et le montant. Rien d'autre ne
   se passe : aucun point, aucun reçu, aucun mouvement.
3. **Le donateur fait le virement depuis sa banque**, en recopiant la référence
   dans le libellé.
4. **L'association retrouve la référence sur son relevé** et confirme le montant
   réellement crédité. C'est elle qui a le relevé : **son chiffre fait foi**, pas
   celui qui avait été annoncé.
5. **À ce moment seulement** : la mission est créée, les points sont crédités
   selon le barème, le reste à financer de l'annonce baisse, et le reçu fiscal est
   préparé.

## La référence

`RSV-` puis deux groupes de quatre caractères tirés de
`ACDEFGHJKLMNPQRSTUVWXYZ2345679`. Ni `0`/`O`, ni `1`/`I`, ni minuscules : cette
référence est recopiée à la main dans un formulaire de banque, parfois dictée au
téléphone. L'unicité est garantie par un index, côté base.

Elle ne sert qu'à une chose, et c'est la seule qui compte : permettre à
l'association de rapprocher une ligne de son relevé d'un don annoncé sur Riseva.
Sans elle, elle voit un virement anonyme et ne peut rien confirmer.

## Pourquoi aucune validation automatique

Une mission de bénévolat non tranchée en quatorze jours est **réputée faite** : un
silence n'est pas une faute, et la lenteur d'une association ne doit pas bloquer
les points d'un salarié.

De l'argent, non. **Un silence ne vaut pas encaissement.** Créditer des points
pour un virement que personne n'a vu arriver produirait un score faux, et un score
faux dans un rapport RSE est exactement ce qu'un acheteur cherche.

Symétriquement, une intention que personne n'honore **s'éteint au bout de trente
jours**, avec la mention « sans virement à l'échéance ». Sans échéance, le
« reste à financer » d'une annonce serait faux en permanence et l'association
verrait s'empiler des promesses. Rien n'est crédité, rien n'est reproché.

## Ce que ça coûte, et ce que ça rapporte

Le prix est assumé : **c'est moins fluide qu'un bouton « Donner »**. Le donateur
doit ouvrir sa banque, et l'association doit rapprocher son relevé.

En échange :

- **aucune commission** — Riseva ne prélève rien, et n'a aucun frais de paiement à
  répercuter, ce qui est aussi la raison pour laquelle le service reste gratuit
  pour les associations ;
- **aucun délai de reversement** — l'association reçoit 100 % du don le jour où sa
  banque le crédite ;
- **aucune dépendance** — pas de prestataire qui puisse fermer un compte, changer
  ses conditions, ou refuser une association ;
- **aucun agrément à obtenir**, donc aucun délai avant d'ouvrir le troisième
  format.

## Dons personnels et dons d'entreprise

Le modèle distingue les deux, et le cloisonnement est technique, pas cosmétique.

- **Don personnel** (`origine = 'salarie'`) : la ligne ne porte **pas**
  l'entreprise, ni dans `intention_don`, ni dans `don`. La cause d'une association
  peut trahir une conviction religieuse, politique, ou un état de santé. Ce lien
  ne doit pas exister, pas seulement être masqué par une policy. Il ne rapporte
  aucun point à l'employeur, qui n'en saura rien. Le donateur, lui, relève de
  l'article 200 du CGI : 66 % dans la limite de 20 % du revenu imposable.
- **Don d'entreprise** (`origine = 'entreprise'`) : déclarable par un
  administrateur de l'entreprise seulement. Il entre dans l'assiette du mécénat
  (art. 238 bis du CGI, 60 %), et il compte au classement — sous le plafond par
  format, qui interdit à un format de peser plus de la moitié des points retenus.

## Le reçu fiscal

Le reçu est délivré par **l'association**, et par elle seule. C'est elle qui
engage sa responsabilité, et c'est elle qui encourt l'amende de l'article
**1740 A** du CGI : une amende égale au **taux de la réduction d'impôt en cause**, appliqué
aux sommes portées sur le reçu — 60 % pour un don d'entreprise (art. 238 bis), 66 ou
75 % pour un don de particulier (art. 200).

Riseva ne peut donc préparer un reçu qu'à la condition d'un **mandat écrit, daté,
nominatif et révocable à tout moment sans motif**. Sans mandat, la plateforme
n'émet rien — ni brouillon, ni « modèle à signer ». Un mandat implicite ne se
plaide pas.

La révocation arrête immédiatement la préparation et désactive les reçus, sans
effet sur ceux déjà émis : ils sont entre les mains de donateurs, et l'association
les conserve **six ans** (art. **L. 102 B** du livre des procédures fiscales).

## Sur la page publique

La fiche publique d'une association affiche son IBAN et son titulaire, à côté de
sa dénomination — c'est le principe même du virement, et c'est une information
qu'elle publie déjà sur ses propres supports de collecte.

Elle n'y crée **pas** de référence : un don anonyme ne peut être rattaché à
personne, ne rapporte aucun point, et ne peut pas donner lieu à un reçu préparé
par Riseva, qui n'a ni le nom ni l'adresse du donateur. La page le dit, et renvoie
vers l'espace Riseva pour un don qui compte.

Le donateur est invité à **vérifier le nom du bénéficiaire affiché par sa banque**
avant de valider. C'est le seul contrôle qui protège vraiment d'un virement
détourné, et il vaut mieux qu'une promesse de « paiement sécurisé ».

## Ce qui est refusé, et par quoi

| Refus | Où |
|---|---|
| IBAN dont la clé mod-97 ne tombe pas juste | `private.iban_ok`, contrainte `CHECK` + moteur |
| Annonce de don sans IBAN renseigné | `creerAnnonce`, moteur |
| Don en argent « engagé » comme une demi-journée | `engager`, moteur |
| Don d'entreprise déclaré par un salarié | `declarer_intention_don`, RPC |
| Réception confirmée par quelqu'un d'autre que l'association | `confirmer_don_recu`, RPC |
| Confirmation rejouée sur un don déjà traité | `confirmer_don_recu`, RPC |
| Reçu actif sans mandat | contrainte `association_recus_complets` |
| Mandat sans éligibilité déclarée au mécénat | `accepter_mandat_recus`, RPC |
| Lecture d'une intention personnelle par l'employeur | policy `intention_lecture` |

Un piège mérite d'être signalé, parce qu'il a réellement laissé passer quelque
chose : `association <> private.mon_association()` vaut **NULL** quand l'appelant
n'est rattaché à aucune association, et un `NULL` ne déclenche pas le `raise`. Un
salarié passait donc au travers de tous ces contrôles. La forme juste est
`is distinct from`, et la recette le vérifie maintenant rôle par rôle.
