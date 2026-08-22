# Le registre public, et ce qu'on lui demande

Riseva interroge une seule source publique pour vérifier une structure :
l'**API Recherche d'entreprises** de la DINUM, servie sur
`recherche-entreprises.api.gouv.fr`. Gratuite, sans clé, sans compte, sans quota
contractuel, sous **Licence Ouverte 2.0** — l'attribution est obligatoire et
figure sur chaque écran qui s'en sert.

Elle agrège l'INSEE (Sirene), l'INPI (RNE) et la DILA. Le RNA — le numéro des
associations déclarées — y apparaît sous `complements.identifiant_association`,
mais **seulement pour les associations qui ont un SIREN**.

## Ce qu'on lui demande, exactement

```
GET /search?q=<numéro ou nom>&minimal=true&include=siege,complements&per_page=8
```

`minimal=true` n'est pas un réglage de performance. Sans lui, la réponse contient
les **dirigeants** : noms, prénoms, dates de naissance de personnes physiques que
Riseva n'a aucune raison de recevoir. On ne filtre pas après coup ce qu'on peut
ne pas demander. C'est aussi ce qui permet d'écrire, dans l'AIPD, que
l'interrogation du registre ne traite aucune donnée personnelle.

`include=siege,complements` ramène l'adresse du siège, ses coordonnées
géographiques, l'état administratif, et le triplet
`est_association` / `est_ess` / `identifiant_association`.

L'appel part **du navigateur**, pas du serveur. C'est une API ouverte ; la faire
transiter par Riseva n'ajouterait qu'une dépendance et un journal de plus.

## Ce que le registre prouve

- La structure est immatriculée, et son état administratif est `A` (ouverte) ou
  `C` (fermée).
- Sa dénomination déposée, son adresse de siège, sa date d'immatriculation.
- Qu'elle est signalée comme association, et le cas échéant son numéro RNA.

## Ce qu'il ne prouve pas

1. **L'éligibilité au mécénat.** Aucun registre public ne la porte. Elle relève
   des articles 200 et 238 bis du CGI, s'apprécie au cas par cas, et seule
   l'association peut l'affirmer — au besoin après un rescrit fiscal. Riseva
   demande la déclaration, la date, et ne certifie rien.
2. **L'existence d'une association sans SIREN.** Environ **10 à 15 %** des
   associations déclarées en ont un. Pour les autres, l'absence de résultat ne
   veut rien dire, et le produit le dit à l'écran. C'est pour ça qu'un contrôle
   « introuvable » n'entraîne aucune sanction automatique, et qu'une association
   sans numéro reste parfaitement utilisable.
3. **L'effectif.** Les tranches INSEE sont des intervalles datés de deux à trois
   ans, absents pour une structure sur deux. Elles ne servent ni au quota, ni au
   score, ni au prix — jamais.
4. **La liste des sites d'un client.** `nombre_etablissements` donne un ordre de
   grandeur. Le champ `matching_etablissements`, lui, est le sous-ensemble qui
   correspond à la requête — **jamais** l'inventaire des établissements d'un
   SIREN. Une fonction qui l'aurait présenté comme tel aurait affiché à un client
   une liste incomplète de ses propres sites sans que rien ne le signale. Les
   sites se déclarent, ils ne se devinent pas.
5. **Le droit local.** Les associations d'Alsace-Moselle relèvent de la loi de
   1908 et d'un registre distinct ; leur numéro n'est pas un RNA.

## Le verdict, et où il est calculé

Le navigateur envoie la **fiche brute** du registre ; il n'envoie jamais sa
conclusion. Le verdict est recalculé côté base par
`private.verdict_registre(association, jsonb)` — sinon il suffirait d'appeler la
RPC avec « nom identique » pour mettre en ligne n'importe quelle structure.

Les deux moteurs, JavaScript et Postgres, utilisent **la même mesure** :
normalisation sans accents, retrait des formes juridiques
(`ASSOCIATION`, `LOI`, `1901`, articles), puis recouvrement de Jaccard sur les
mots restants.

| Recouvrement | Verdict | Bloquant |
|---|---|---|
| 1 | `exact` | non |
| ≥ 0,5 | `proche` | non |
| < 0,5 | `different` | oui |
| état `C` au registre | `fermee` | oui |
| aucun résultat | `introuvable` | oui |
| registre injoignable | `panne` | non |
| aucun numéro déclaré | `absent` | non |

Une panne du registre est un incident d'exploitation, pas une faute de
l'association : elle est consignée et ne bloque personne.

`exact` se juge sur les mots utiles, pas sur la chaîne : « Association Refuge des
Quatre Vents (loi 1901) » et « REFUGE DES QUATRE VENTS » sont le même nom. Un
verdict littéral aurait signalé un écart à chaque contrôle, et un écart qui se
produit toujours n'est plus lu par personne.

## Clés de contrôle

Le SIREN (9 chiffres) et le SIRET (14) portent une clé de Luhn, vérifiée **dans
le navigateur et dans la base** (`private.luhn_ok`, appelée par une contrainte
`CHECK`). Un numéro qui ne peut pas exister n'entre pas en base : il finirait
recopié sur une facture, dans un reçu fiscal ou dans un questionnaire
fournisseur, et c'est là qu'on le découvrirait.

**Exception La Poste** : les numéros commençant par `356000000` ne satisfont pas
Luhn, mais la somme de leurs chiffres est divisible par cinq. C'est écrit dans la
documentation de l'INSEE ; ce n'est pas une tolérance qu'on s'accorde.

## Ce qui est conservé

Chaque contrôle est une ligne de `controle_association` : la date, l'auteur, le
verdict, les écarts champ par champ, et **la réponse brute du registre**. Le
registre change ; un contrôle qui ne garderait que sa conclusion serait
invérifiable six mois plus tard. Le jour où une association se révèle radiée, la
question posée à Riseva ne sera pas « aviez-vous un doute ? » mais « qu'aviez-vous
vérifié, quand, et qu'est-ce que ça disait ? ».

Un contrôle vaut **un an**. Au-delà, le dossier le signale comme périmé.

## Ce que ça change pour l'association

Un numéro, et rien d'autre. Dénomination déposée, adresse, coordonnées
géographiques et RNA sont remplis à sa place. Aucun justificatif n'est demandé,
et il ne faut pas en demander : c'est la règle qu'on s'est donnée — une
association ne doit rien avoir à faire d'autre que publier son besoin.

Le registre **complète**, il n'**écrase** pas. Une association qui a corrigé son
adresse dans Riseva sait mieux qu'un fichier où elle reçoit son courrier.

## À l'inverse : ce qu'on n'a pas pris

- **API Sirene de l'INSEE.** Elle donne l'inventaire des établissements d'un
  SIREN, ce que l'API ouverte ne donne pas. Elle exige la création d'un compte.
  Décision en attente ; sans elle, les sites d'un client se déclarent à la main,
  ce qui reste de toute façon le seul périmètre défendable.
- **RNA en données ouvertes (Waldec).** Un fichier mensuel de 500 à 600 Mo qui
  couvre les 85 à 90 % d'associations sans SIREN. Décision en attente : c'est un
  import à héberger et à tenir à jour, pas un appel d'API.
