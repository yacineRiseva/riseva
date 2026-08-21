# Audit de sécurité et de conformité — retour ChatGPT (5.6 Sol, effort maximum)

Fichiers audités : `supabase/01_schema.sql`, `02_logique.sql`, `03_rls.sql`,
`05_taches.sql`, `public/app/data.js`.

**Verdict rendu : NO-GO production, et NO-GO pilote avec des données réelles.**
Quatre blocages cumulés : migrations incohérentes, couche Supabase factice,
escalade de rôle triviale, fonctions privilégiées exécutables publiquement.

Ce document sert de plan de correction. Une ligne cochée est une ligne corrigée
*et* couverte par un test.

## P0 — exploitable ou bloquant

- [x] **1. Le schéma ne se déploie pas.** `mission.realise`, `mission.date_mission`,
  `mission.decide_le`, `entreprise.points`, `profil.points` n'existent pas.
  `03_rls.sql` active la RLS sur `rapport` et `moteur_journal` avant leur création
  dans `05`. → Tout dans `01`, puis fonctions, puis RLS, puis cron. Un seul nom :
  `tranchee_le`. Aucun compteur dénormalisé. Installation à blanc testée en CI.
- [x] **2. La couche Supabase n'existe pas.** `connecterSupabase()` ajoute
  `client: sb` au mock : tout continue à lire et écrire `localStorage`. Une
  configuration valide donne donc l'illusion de la production en servant la démo.
  → Implémenter, ou refuser de démarrer : `if (PRODUCTION && !config) throw`.
  Aucun repli mock sur le domaine de production.
- [x] **3. Fonctions privilégiées exposées.** `anonymiser_salarie()` et
  `creer_invitation()` sont `SECURITY DEFINER`, sans contrôle d'appelant, sans
  `search_path`, sans `REVOKE`. Un salarié qui connaît l'UUID d'un collègue peut
  l'anonymiser ; un anonyme peut désactiver le lien d'inscription d'une entreprise.
  → `REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon,
  authenticated`, `ALTER DEFAULT PRIVILEGES`, puis `GRANT` nominatif sur les seules
  RPC. Chaque `SECURITY DEFINER` : `SET search_path = ''`, noms qualifiés,
  propriétaire dédié sans login.
- [x] **4. Escalade immédiate en administrateur Riseva.** La policy `UPDATE` sur
  `profil` n'a pas de `WITH CHECK` : PostgreSQL réutilise `USING`, et `id = auth.uid()`
  reste vrai après modification. N'importe qui peut se donner `role = 'admin'`.
  → `REVOKE UPDATE ON profil`, `GRANT UPDATE (nom, ...)` colonne par colonne ;
  `role`, `entreprise`, `association`, `actif`, `anonyme`, `retire_le` dans une
  table `private.appartenance` hors API.
- [x] **5. Score et état de mission falsifiables.** Le salarié peut insérer
  `etat = 'validee'`, puis modifier `points`, `quantite`, `entreprise`, `annonce`.
  → Révoquer l'écriture directe sur `mission`, trois RPC (`engager_mission`,
  `declarer_mission`, `trancher_mission`), machine d'états et trigger d'immutabilité.
- [x] **6. Fuite intra-entreprise.** Tous les salariés lisent les missions de tous
  leurs collègues, donc les causes soutenues et les dons personnels ; plus les prix
  d'abonnement, les invitations, les IP du journal. Le seuil de cinq n'existe pas
  en SQL, et `donsPersonnelsAgreges()` renvoie encore donateurs et montant sous le
  seuil. → Cloisonnement par rôle, RPC agrégée à fenêtres fixes, rien sous cinq.
- [x] **7. Toutes les colonnes `entreprise` sont publiques** : CA, coût journalier,
  SIRET, adresse, domaines. La RLS protège les lignes, pas les colonnes.
  → Projection publique minimale (id, nom, catégorie) ; le classement lit une vue.
- [x] **8. Le filtrage par domaine n'est pas un contrôle.** `domaine_autorise()`
  n'est appelé nulle part, une liste vide autorise tout, l'adresse testée vient du
  client. → RPC unique `rejoindre_entreprise(code)`, adresse lue dans `auth.users`,
  verrous `FOR UPDATE`, siège alloué et journal écrits dans la même transaction.
- [x] **9. Quota contournable et soumis à une course.** Deux inscriptions
  simultanées voient chacune un siège libre ; l'admin augmente lui-même
  `entreprise.sieges`. → Droits achetés en lecture seule sur `abonnement`,
  table `affectation_siege` avec unicité.
- [x] **10. Un salarié retiré reste autorisé.** `mon_role()` et `mon_entreprise()`
  ignorent `actif` et `anonyme` ; un JWT reste valable jusqu'à expiration.
  → Helpers renvoyant `NULL`, suppression via l'API Auth Admin,
  `mission.salarie` nullable `ON DELETE SET NULL`.

## P1 — intégrité métier, RGPD

- [x] Jeton d'invitation faible : quatre caractères, ~19,8 bits, `random()` non
  cryptographique, oracle public. → `gen_random_bytes(16)`, stockage du SHA-256 seul.
- [x] Une association non validée ou suspendue peut publier. → Création par RPC.
- [x] **Plafond à 50 % faux** : le code plafonnait chaque format à la moitié du
  *brut*. Avec (6 240, 780, 0) il retenait 4 290 points dont 82 % de bénévolat.
  La forme juste est `min(v, brut - v)`, soit 1 560. *Corrigé dans `data.js`,
  couvert par un test.*
- [x] Points synthétiques de démonstration (`p.retenu || e.points`) qui
  rétablissaient le brut. *Supprimés, avec les compteurs figés sur l'entreprise
  et sur le salarié.*
- [x] Trois classements incompatibles (vue SQL brute, vue matérialisée toutes
  saisons, JS synthétique). → Un seul agrégat `(entreprise, saison, type)`.
- [x] Dénominateur manipulable : l'admin peut réduire `effectif` à 1.
  → `abonnement.effectif_reference`, figé à l'ouverture, modifiable par Riseva seule.
- [x] **Validation automatique** : le JS comptait quatorze jours depuis la date
  prévue, le SQL depuis `declaree_le`. *Le JS compte désormais depuis
  `declaree_le`, via la constante partagée `DELAI_VALIDATION_JOURS`.*
- [x] Deux moteurs automatiques concurrents (`02` et `05`). → Un seul.
- [x] Rapports scellés à la fin du trimestre alors que les validations restent
  ouvertes quatorze jours, avec `ON CONFLICT DO NOTHING`. → Sceller à fin + 14 j.
- [x] **Réalisations estimées présentées comme réalisées** : sans réponse de
  l'association, le produit reprenait `quantité × impact`. *Séparé : `realiseDe()`
  distingue confirmé et estimé, l'interface les affiche séparément et dit combien
  de missions se sont validées sans réponse.*
- [x] Dons financiers non liés à un paiement confirmé, webhook non idempotent.
- [x] Reçus fiscaux : `recu_numero` libre, sans unicité ; commentaire encore en
  16216*01 alors que le JS est en 16216*03.
- [x] **L'« anonymisation » n'en est pas une** : même UUID conservé partout,
  réidentification par recoupement, `acces.ip` et `acces.agent` intacts, Auth et
  sauvegardes non traités. → Renommer en pseudonymisation tant que ces liens
  existent, puis supprimer réellement.
- [x] Aucune purge : `conservation_ans` n'a aucun effet technique.
  → `purge_le`, `legal_hold`, `tache_retention()` quotidienne, journal de purge.

## P2 — contraintes, index, échelle

- [x] Contraintes : `annonce.restant <= quantite`, unité et multiplicateur tous
  deux nuls ou tous deux renseignés, `mission.points >= 0`, machine d'états,
  `profil.anonyme ⇒ not actif`, `abonnement.acompte_paye <= montant_ht`.
- [x] `points_pour()` doit lever si le barème manque : renvoyer zéro masque une
  configuration cassée.
- [x] `ON DELETE CASCADE` sur saisons, associations et annonces → `RESTRICT`.
- [x] Index manquants : `profil(entreprise, role)`, `mission(declaree_le) where
  etat='a_valider'`, `mission(entreprise, date_mission, annonce)`, `annonce(date_prevue)
  where etat='ouverte'`, `acces(cree_le)`, `don(association, cree_le)`.
- [x] `classement_saison` rescanne `mission` par entreprise. → Agrégat set-based.
- [x] `ca integer` déborde au-delà de 2 147 483 647 €. → `numeric(15,2)`.
- [x] Import navigateur d'une dépendance tierce mutable. → Version bundlée.

## Ce qui n'a pas été trouvé

Pas de SQL dynamique, pas de concaténation : pas d'injection SQL classique. La
surface dangereuse est ailleurs — `search_path`, `SECURITY DEFINER` exposées,
autorisations de colonnes trop larges.


## Où en est la correction

Tout le P0 est corrigé, ainsi que le P1 et le P2 sauf trois points listés plus bas.
Les quatre fichiers SQL ont été réécrits et une installation à blanc est désormais
**vérifiable** :

    python3 scripts/sql.py

recrée une base vide, rejoue `00 → 05` puis exécute `supabase/tests.sql` — 47
assertions qui disent, une par une, ce qu'un visiteur, un salarié et une
association peuvent et ne peuvent pas faire. Un test qui repasse au rouge, c'est
une régression de sécurité nommée, pas un doute.

Ce qui reste ouvert, et pourquoi :

- **Prestataire de paiement.** `public.confirmer_don()` et la fonction Edge
  `supabase/functions/paiement` sont écrites et testées — signature comparée en
  temps constant, idempotence sur `(fournisseur, référence)`, points calculés par
  le barème en SQL, reçu émis dans la foulée. Ne manque que le nom du prestataire
  et le format exact de sa signature.
- **Suppression réellement irréversible.** `supprimer_salarie()` existe et
  `mission.salarie` passe à NULL, mais l'appel à l'API Auth Admin et le rejeu des
  demandes d'effacement sur les sauvegardes sont une procédure d'exploitation,
  pas une migration.
- **Dépendance navigateur.** `scripts/figer-dependance.sh` télécharge une version
  exacte dans `public/app/vendor/`, en consigne l'empreinte SHA-256, et
  `connecterSupabase()` charge cette copie en priorité ; le repli CDN est épinglé
  et refusé sur le domaine de production. Reste à lancer le script une fois, dans
  un environnement qui a accès au registre — le conteneur de développement ne
  l'a pas.
