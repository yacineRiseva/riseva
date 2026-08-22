# Deuxième audit de sécurité — 22/08/2026

Audit interne de la couche Postgres, conduit contre le modèle annoncé : révocation
totale puis restitution colonne par colonne, schéma `private` hors API, toute
écriture par une fonction `SECURITY DEFINER` à `search_path` vide appartenant à
`riseva_definer`.

Onze trouvailles. Ce qui suit est ce qui a été corrigé, et pourquoi c'était grave.

## 1. Une policy permissive annulait toute la fermeture de la table `entreprise`

`create policy entreprise_publique_lecture ... to anon, authenticated using (true)`
existait pour servir la vue `entreprise_publique`, qui était en `security_invoker`
et exigeait donc un droit de lecture sur la table de base.

Les policies PostgreSQL sont **permissives par défaut** : elles s'additionnent en
OU. Celle-là annulait donc `entreprise_privee` écrite trois lignes plus bas.
N'importe quel compte connecté — un salarié d'un autre client, une association —
lisait le **chiffre d'affaires, le SIREN, le SIRET, l'adresse, le coût journalier
moyen et l'effectif de toutes les entreprises clientes**.

Le commentaire au-dessus affirmait le contraire. La recette ne testait que `anon`,
qui n'avait effectivement pas les colonnes : l'angle mort était là.

**Correction.** La vue n'est plus en `security_invoker` : elle s'exécute avec les
droits de son propriétaire, donc elle n'a plus besoin qu'on ouvre la table. La
policy `using (true)` est supprimée. Deux tests ajoutés, l'un depuis une
association, l'autre depuis une filiale du même groupe.

## 2. Le classement anonymisé se levait par une jointure

`points_entreprise(p_entreprise, p_saison)` est `SECURITY DEFINER`, accordée à
`authenticated`, et ne vérifiait pas qui appelait : elle rendait le `brut` et le
`retenu` **exacts** de n'importe quel identifiant. `classement_saison` publiait
ces mêmes entiers sur ses lignes anonymisées.

Deux nombres suffisaient donc à rapprocher une ligne « Entreprise · 200 à 499
salariés · Industrie » d'une entreprise nommée. L'anonymat tenait à un affichage,
pas à une frontière. `decile_entreprise` avait le même défaut.

**Correction.** Les deux fonctions vérifient l'appelant (elle-même, son groupe, ou
Riseva). Et `classement_saison` retire `brut`, `retenu` et `effectif_reference`
des lignes anonymes : ce sont des empreintes. Reste ce qui sert à lire un
classement — la position et la valeur normalisée arrondie.

## 3. `emettre_recu` n'exigeait rien

Accordée à `authenticated`, sans aucun contrôle : quiconque tenait un identifiant
de don émettait un reçu fiscal **au nom d'une association** et consommait sa
numérotation. C'est elle qui encourt l'amende de l'article 1740 A du CGI, pas
l'appelant. La fonction contenait en prime une référence à un champ inexistant qui
la faisait échouer — le trou n'était pas exploitable en l'état, et le serait
redevenu à la première correction du bug.

**Correction.** Contrôle de l'association bénéficiaire, exigence d'un mandat en
cours, et suppression de la ligne morte.

## 4. Le rôle propriétaire n'existait pas dans le chemin de déploiement

`riseva_definer` n'était créé que dans `00_local.sql`, qui n'est jamais déployé. En
production, `alter function ... owner to riseva_definer` échouait ; sans
`ON_ERROR_STOP`, les soixante fonctions privilégiées restaient propriété de
`postgres` — superutilisateur, `BYPASSRLS`. C'est-à-dire exactement le risque que
ce rôle existe pour écarter.

**Correction.** Le rôle est créé par `01_schema.sql`. Et la recette rejoue
désormais **le chemin de production** : ce que Supabase fournit, puis 01 → 05, sans
le bac à sable local, avec un contrôle final qu'aucune fonction privilégiée n'est
restée au superutilisateur.

## 5. Le registre de sécurité était lisible ligne à ligne par tout salarié

La policy n'avait aucun filtre de rôle. Sur un site de quelques personnes, une
date, une zone et un nombre de journées d'arrêt réidentifient la victime — donnée
de santé au sens de l'article 9 du RGPD. `declare_par`, accordé avec le reste, se
joignait à `profil` pour nommer le déclarant.

**Correction.** Lecture réservée à la société et au référent de son propre site.
`declare_par` n'est accordé à personne. Le comité social et économique lit un
**agrégat** par type, et rien en dessous de cinq événements : « un accident de
manutention » dans une société de douze personnes désigne quelqu'un.

## 6. `securite_du_registre` ne vérifiait pas le périmètre

Tout compte connecté obtenait l'accidentologie complète de n'importe quel site
dont il tenait l'identifiant — et les identifiants de sites circulent dans les
missions.

**Correction.** Filtre sur la société de l'appelant ou son groupe.

## 7. Les noms des signataires sortaient avec la table entière

`grant select on public.association` accordait tout, contre la doctrine colonne
par colonne : nom du signataire des reçus, sa qualité, nom de la personne qui a
donné mandat. Des personnes physiques, sans nécessité publique.

**Correction.** Grant nominatif des colonnes de vitrine ; les réglages passent par
la vue `association_reglages`, qui ne rend que ceux de l'appelante.

Une policy `RESTRICTIVE` avait d'abord été essayée : elle s'applique à **chaque**
sous-requête qui traverse la table, y compris celle de `annonce_lecture`, et
rendait toutes les annonces invisibles aux salariés. Elle a été remplacée par la
vue. L'IBAN, lui, reste public : c'est le principe même du virement, et il figure
sur la fiche que l'association publie.

## 8. Deux tâches planifiées échappaient à la révocation

La liste nominative des fonctions privées à révoquer se périmait à chaque ajout.

**Correction.** Révocation en bloc sur tout le schéma `private`, plus
`alter default privileges` pour ce qui sera écrit demain.

## 9. `realisations` agrégeait les dons personnels et acceptait une cible

Accordée à `anon` avec un `p_entreprise` non contrôlé, elle reconstituait le détail
par unité d'impact entreprise par entreprise. Et elle ne filtrait pas l'origine :
les dons faits à titre privé entraient dans les chiffres de l'employeur.

**Correction.** `origine = 'entreprise'`, et le détail d'une entreprise nommée
n'est rendu qu'à elle-même, à son groupe ou à Riseva. Le total du réseau reste
public.

## 10. Le score se calculait autrement dans le navigateur qu'en base

`pointsDe()` n'excluait pas les dons personnels, alors que `points_entreprise` les
exclut. Deux scores pour la même entreprise le même jour — et, par différence avec
ce que l'employeur a le droit de voir salarié par salarié, **exactement le total
que le seuil d'agrégation des dons personnels est censé rendre inaccessible**.

**Correction.** Même règle des deux côtés, et un test qui vérifie que la
différence est nulle.

## 11. Le classement se normalisait sur un effectif que le client édite

Le SQL impose `abonnement.effectif_reference`, figé et hors de portée du client,
précisément pour qu'on ne puisse pas se déclarer trois salariés et rafler le
classement normalisé. Le navigateur, lui, utilisait le champ déclaratif.

**Correction.** `effectifReference()` lit l'effectif figé au contrat.

## Ce qui a tenu

Aucune fonction `SECURITY DEFINER` n'omettait `set search_path` (60 sur 60).
Aucune table métier n'est écrivable directement : les seules écritures accordées
sont `profil.nom` et le dépôt d'une préinscription. Les pièges du NULL dans les
RPC étaient déjà traités par `is distinct from`.
