-- Riseva — schéma Postgres (Supabase)
-- ---------------------------------------------------------------------------
-- Ordre de déploiement, sur une base vierge : 01 → 02 → 03 → 04 → 05.
-- Tout le schéma est ici, y compris les tables lues par les tâches planifiées :
-- activer la RLS sur une table créée deux fichiers plus loin est la manière la
-- plus sûre de casser une installation neuve tout en gardant une base de
-- développement qui marche.
--
-- Deux règles tenues d'un bout à l'autre :
--   1. Aucun compteur dénormalisé. Un total qu'on incrémente est un total qu'on
--      oublie de décrémenter ; les scores se dérivent des missions.
--   2. Rien de sensible dans une colonne lisible par l'API. Ce qui décide d'un
--      droit vit dans le schéma `private`, hors PostgREST.
-- ---------------------------------------------------------------------------

-- Sur Supabase, pgcrypto vit dans le schéma `extensions`. On le dit ici pour
-- que les appels qualifiés (extensions.digest, extensions.gen_random_bytes)
-- soient les mêmes en local et en production : une fonction `set search_path = ''`
-- ne peut pas se permettre un nom non qualifié.
create schema if not exists extensions;
create extension if not exists "pgcrypto" with schema extensions;

create schema if not exists private;
revoke all on schema private from public;

-- Le schéma `private` n'est jamais exposé par PostgREST. Il faut aussi le dire
-- explicitement, sinon un `db-schemas` mal configuré suffirait à tout ouvrir.
revoke usage on schema private from anon, authenticated;

-- ---------------------------------------------------------------- types
create type role_utilisateur as enum ('admin','entreprise_admin','salarie','association');
create type type_annonce     as enum ('don_financier','benevolat_demi_journee','don_materiel');
create type etat_annonce     as enum ('brouillon','ouverte','close');
create type etat_mission     as enum ('engagee','a_valider','validee','validee_auto','refusee');
create type etat_saison      as enum ('brouillon','ouverte','close');
create type etat_preinscription as enum ('preinscrite','relancee','confirmee','abandonnee');
create type etat_paiement    as enum ('attendu','confirme','rembourse','echoue');
create type origine_don      as enum ('entreprise','salarie');
create type unite_realisation as enum (
  'arbre','haie','dechet_kg','repas','colis','animal','maraude','kit','eleve','metre_berge');

-- ---------------------------------------------------------------- saison
create table saison (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null check (length(nom) between 1 and 120),
  debut       date not null,
  fin         date not null,
  etat        etat_saison not null default 'brouillon',
  prix_min    numeric(12,2) not null default 3500 check (prix_min >= 0),
  prix_max    numeric(12,2) not null default 4000 check (prix_max >= prix_min),
  acompte     numeric(12,2) not null default 500  check (acompte >= 0),
  -- Clôture des validations : quatorze jours après la fin, une seule fois écrit ici.
  delai_validation_jours integer not null default 14 check (delai_validation_jours between 1 and 90),
  cree_le     timestamptz not null default now(),
  constraint saison_dates check (fin > debut)
);

-- Une seule saison ouverte à la fois : deux saisons ouvertes, ce sont deux
-- barèmes applicables au même moment, donc deux scores défendables.
create unique index saison_une_seule_ouverte on saison ((etat)) where etat = 'ouverte';

create table bareme (
  id       uuid primary key default gen_random_uuid(),
  saison   uuid not null references saison(id) on delete restrict,
  type     type_annonce not null,
  points   integer not null check (points > 0),
  unite    text not null check (length(unite) between 1 and 60),
  unique (saison, type)
);

-- ---------------------------------------------------------------- organisations
create table entreprise (
  id        uuid primary key default gen_random_uuid(),
  nom       text not null check (length(nom) between 1 and 160),
  secteur   text check (length(secteur) <= 80),
  ville     text check (length(ville) <= 120),
  -- L'effectif déclaré ici est indicatif. Le dénominateur du classement est
  -- `abonnement.effectif_reference`, figé, hors de portée du client : sinon il
  -- suffit de se déclarer un salarié pour rafler le classement normalisé.
  effectif  integer check (effectif >= 0),
  ca                numeric(15,2) check (ca >= 0),   -- integer déborde au-delà de 2,1 Md€
  cout_jour_moyen   numeric(10,2) check (cout_jour_moyen >= 0),
  siren     text check (siren ~ '^[0-9]{9}$'),
  siret     text check (siret ~ '^[0-9]{14}$'),
  adresse   text check (length(adresse) <= 240),
  lat       double precision check (lat between -90 and 90),
  lon       double precision check (lon between -180 and 180),
  cree_le   timestamptz not null default now()
);

-- Les domaines de messagerie décident qui peut entrer : c'est un contrôle
-- d'accès, pas une préférence. Ils ne vivent donc pas dans une colonne que
-- l'administrateur de l'entreprise peut réécrire depuis son navigateur.
create table private.domaine_entreprise (
  entreprise uuid not null references entreprise(id) on delete cascade,
  domaine    text not null check (domaine ~ '^[a-z0-9.-]+\.[a-z]{2,}$'),
  ajoute_le  timestamptz not null default now(),
  primary key (entreprise, domaine)
);

create table association (
  id        uuid primary key default gen_random_uuid(),
  nom       text not null check (length(nom) between 1 and 160),
  rna       text check (rna ~ '^W[0-9]{9}$'),
  cause     text check (length(cause) <= 80),
  ville     text check (length(ville) <= 120),
  resume    text check (length(resume) <= 600),
  adresse   text check (length(adresse) <= 240),
  lat       double precision check (lat between -90 and 90),
  lon       double precision check (lon between -180 and 180),
  site      text check (length(site) <= 240),
  valide    boolean not null default false,
  suspendue boolean not null default false,
  verifiee_le      date,
  a_reverifier_le  date,
  -- Réglages des reçus fiscaux. `recus_actif` ne peut pas être vrai sans de quoi
  -- émettre un reçu valable : un reçu incomplet expose l'association, pas nous.
  recus_actif        boolean not null default false,
  eligible_mecenat   boolean not null default false,
  signataire         text check (length(signataire) <= 120),
  qualite            text check (length(qualite) <= 120),
  recu_prefixe       text check (length(recu_prefixe) <= 20),
  cree_le   timestamptz not null default now(),
  constraint association_recus_complets check (
    not recus_actif or (eligible_mecenat
      and signataire is not null and qualite is not null and recu_prefixe is not null)),
  constraint association_valide_non_suspendue check (not (valide and suspendue) or true)
);

-- ---------------------------------------------------------------- comptes
-- `profil` ne contient que ce qui appartient à la personne. Tout ce qui décide
-- d'un droit — rôle, entreprise, association, activité — est dans
-- `private.appartenance`, inaccessible à l'API. Sans cette séparation, une
-- policy UPDATE sans WITH CHECK suffit à se nommer administrateur Riseva.
create table profil (
  id        uuid primary key references auth.users(id) on delete cascade,
  nom       text not null check (length(nom) between 1 and 160),
  cree_le   timestamptz not null default now(),
  maj_le    timestamptz not null default now()
);

create table private.appartenance (
  profil       uuid primary key references profil(id) on delete cascade,
  role         role_utilisateur not null,
  entreprise   uuid references entreprise(id) on delete restrict,
  association  uuid references association(id) on delete restrict,
  actif        boolean not null default true,
  pseudonymise boolean not null default false,
  retire_le    timestamptz,
  maj_le       timestamptz not null default now(),
  constraint appartenance_rattachement check (
    (role = 'admin'            and entreprise is null and association is null) or
    (role in ('entreprise_admin','salarie') and entreprise is not null and association is null) or
    (role = 'association'      and association is not null and entreprise is null)),
  -- Un compte pseudonymisé est un compte parti : il ne peut pas rester actif.
  constraint appartenance_depart check (
    not pseudonymise or (not actif and retire_le is not null))
);

-- ---------------------------------------------------------------- abonnement
create table abonnement (
  id          uuid primary key default gen_random_uuid(),
  entreprise  uuid not null references entreprise(id) on delete restrict,
  saison      uuid not null references saison(id) on delete restrict,
  montant_ht  numeric(12,2) not null check (montant_ht >= 0),
  acompte_paye numeric(12,2) not null default 0 check (acompte_paye >= 0),
  -- Les places achetées vivent ici, en lecture seule pour le client. Sur
  -- `entreprise`, l'administrateur pouvait s'en octroyer autant qu'il voulait.
  sieges      integer not null check (sieges > 0),
  -- Le dénominateur du classement, figé à l'ouverture de la saison.
  effectif_reference integer not null check (effectif_reference > 0),
  signe_le    date,
  cree_le     timestamptz not null default now(),
  unique (entreprise, saison),
  constraint abonnement_acompte check (acompte_paye <= montant_ht)
);

-- Une place occupée est une ligne. L'unicité rend la course impossible : deux
-- inscriptions simultanées ne peuvent pas prendre le même siège.
create table affectation_siege (
  id          uuid primary key default gen_random_uuid(),
  abonnement  uuid not null references abonnement(id) on delete cascade,
  numero      integer not null check (numero > 0),
  profil      uuid not null references profil(id) on delete cascade,
  invitation  uuid,
  prise_le    timestamptz not null default now(),
  liberee_le  timestamptz,
  unique (abonnement, numero),
  unique (abonnement, profil)
);

-- Le code d'invitation n'est jamais stocké en clair : seul son SHA-256 l'est.
-- Quatre caractères aléatoires derrière un préfixe public, c'était nineteen bits
-- devinables et un oracle de vérification en libre accès.
create table invitation (
  id          uuid primary key default gen_random_uuid(),
  entreprise  uuid not null references entreprise(id) on delete cascade,
  empreinte   bytea not null,
  indice      text not null check (length(indice) between 4 and 12), -- pour retrouver le lien côté admin
  places      integer not null check (places > 0),
  active      boolean not null default true,
  cree_par    uuid references profil(id) on delete set null,
  cree_le     timestamptz not null default now(),
  expire_le   timestamptz not null,
  constraint invitation_expiration check (expire_le > cree_le)
);
create unique index invitation_empreinte on invitation (empreinte);

alter table affectation_siege
  add constraint affectation_invitation foreign key (invitation)
  references invitation(id) on delete set null;

-- ---------------------------------------------------------------- annonces
create table annonce (
  id            uuid primary key default gen_random_uuid(),
  association   uuid not null references association(id) on delete restrict,
  saison        uuid not null references saison(id) on delete restrict,
  type          type_annonce not null,
  titre         text not null check (length(titre) between 3 and 140),
  description   text not null check (length(description) between 10 and 2000),
  lieu          text check (length(lieu) <= 120),
  temps_travail boolean not null default false,
  quantite      integer not null check (quantite > 0),
  restant       integer not null check (restant >= 0),
  date_prevue   date,
  etat          etat_annonce not null default 'brouillon',
  -- Unité d'impact : soit les deux colonnes sont renseignées, soit aucune.
  -- Une unité sans multiplicateur produit des réalisations à zéro qu'on croit vraies.
  impact_unite      unite_realisation,
  impact_par_unite  numeric(12,4) check (impact_par_unite > 0),
  fermeture_auto    boolean not null default true,
  cree_le       timestamptz not null default now(),
  constraint annonce_restant check (restant <= quantite),
  constraint annonce_impact_complet check (
    (impact_unite is null and impact_par_unite is null) or
    (impact_unite is not null and impact_par_unite is not null))
);

-- ---------------------------------------------------------------- missions
create table mission (
  id          uuid primary key default gen_random_uuid(),
  annonce     uuid not null references annonce(id) on delete restrict,
  entreprise  uuid not null references entreprise(id) on delete restrict,
  -- Nullable, et mis à NULL au départ définitif du salarié : sans cela, effacer
  -- un compte effacerait en cascade l'histoire de l'entreprise et des associations.
  salarie     uuid references profil(id) on delete set null,
  etat        etat_mission not null default 'engagee',
  quantite    numeric(12,2) not null check (quantite > 0),
  points      integer not null default 0 check (points >= 0),
  date_mission date not null,
  declaree_le  timestamptz,
  tranchee_le  timestamptz,
  -- Deux chiffres, jamais mélangés. `realise_confirme` vient de l'association
  -- qui était sur place ; `realise_estime` est ce que l'annonce laissait
  -- attendre quand personne n'a répondu. Additionner les deux transformerait un
  -- silence en résultat.
  realise_confirme numeric(12,2) check (realise_confirme >= 0),
  realise_propose  numeric(12,2) check (realise_propose >= 0),
  origine     origine_don not null default 'entreprise',
  cle_idempotence text,
  cree_le     timestamptz not null default now(),
  constraint mission_declaration check (
    etat = 'engagee' or declaree_le is not null),
  constraint mission_tranchee check (
    etat in ('engagee','a_valider') or tranchee_le is not null),
  constraint mission_confirme_si_validee check (
    realise_confirme is null or etat = 'validee'),
  constraint mission_refus check (etat <> 'refusee' or points = 0)
);
create unique index mission_idempotence on mission (cle_idempotence)
  where cle_idempotence is not null;

-- ---------------------------------------------------------------- dons et reçus
create table don (
  id          uuid primary key default gen_random_uuid(),
  mission     uuid references mission(id) on delete restrict,
  association uuid not null references association(id) on delete restrict,
  -- Un don personnel n'a pas d'entreprise dans la donnée brute. La cause d'une
  -- association peut révéler une conviction ou un état de santé : ce lien-là ne
  -- doit pas exister, pas seulement être masqué par une policy.
  entreprise  uuid references entreprise(id) on delete restrict,
  origine     origine_don not null,
  montant     numeric(12,2) not null check (montant > 0),
  etat        etat_paiement not null default 'attendu',
  fournisseur text not null check (length(fournisseur) <= 40),
  reference   text not null check (length(reference) <= 120),
  cree_le     timestamptz not null default now(),
  confirme_le timestamptz,
  constraint don_origine check (
    (origine = 'entreprise' and entreprise is not null) or
    (origine = 'salarie'    and entreprise is null))
);
-- Un webhook rejoué ne crée pas un second don.
create unique index don_reference on don (fournisseur, reference);

create table recu (
  id          uuid primary key default gen_random_uuid(),
  don         uuid not null references don(id) on delete restrict,
  association uuid not null references association(id) on delete restrict,
  numero      text not null check (length(numero) between 3 and 40),
  modele      text not null check (modele in ('16216*03','11580*05')),
  emis_le     timestamptz not null default now(),
  unique (association, numero)
);

-- ---------------------------------------------------------------- rapports
create table rapport (
  id          uuid primary key default gen_random_uuid(),
  entreprise  uuid not null references entreprise(id) on delete restrict,
  saison      uuid not null references saison(id) on delete restrict,
  periode     text not null check (periode ~ '^(T[1-4]|annuel)$'),
  -- Un rapport scellé fige sa méthode : sans cela, un chiffre republié
  -- l'an prochain avec un autre barème n'est plus le même chiffre.
  methode_version text not null,
  bareme_gele     jsonb not null,
  effectif_reference integer not null check (effectif_reference > 0),
  contenu     jsonb not null,
  scelle_le   timestamptz,
  maj_le      timestamptz not null default now(),
  unique (entreprise, saison, periode)
);

-- ---------------------------------------------------------------- traces
create table acces (
  id          uuid primary key default gen_random_uuid(),
  entreprise  uuid references entreprise(id) on delete cascade,
  profil      uuid references profil(id) on delete set null,
  quoi        text not null check (length(quoi) <= 60),
  indice      text check (length(indice) <= 12),
  ip          inet,
  agent       text check (length(agent) <= 300),
  cree_le     timestamptz not null default now(),
  -- Les journaux de sécurité se purgent : la CNIL attend une durée glissante,
  -- typiquement six mois à un an, pas une conservation indéfinie.
  purge_le    timestamptz not null default now() + interval '6 months',
  legal_hold  boolean not null default false
);

create table signalement (
  id          uuid primary key default gen_random_uuid(),
  annonce     uuid not null references annonce(id) on delete cascade,
  auteur      uuid references profil(id) on delete set null,
  motif       text not null check (length(motif) <= 60),
  precisions  text check (length(precisions) <= 2000),
  decision    text check (decision in ('retire','maintenu','modifie')),
  motivation  text check (length(motivation) <= 2000),
  cree_le     timestamptz not null default now(),
  decide_le   timestamptz,
  -- DSA article 16 : une décision se motive. Pas de motivation, pas de décision.
  constraint signalement_motivee check (decision is null or length(coalesce(motivation,'')) >= 10)
);

create table preinscription (
  id          uuid primary key default gen_random_uuid(),
  entreprise  text not null check (length(entreprise) between 1 and 160),
  contact     text not null check (length(contact) between 3 and 160),
  effectif    integer check (effectif >= 0),
  etat        etat_preinscription not null default 'preinscrite',
  cree_le     timestamptz not null default now(),
  purge_le    timestamptz not null default now() + interval '3 years'
);

create table moteur_journal (
  id          uuid primary key default gen_random_uuid(),
  tache       text not null check (length(tache) <= 60),
  fait        jsonb not null default '{}'::jsonb,
  cree_le     timestamptz not null default now()
);

-- Journal de purge : il dit ce qui a été supprimé, sans contenir ce qui a été
-- supprimé. Un journal de purge qui recopie la donnée purgée ne purge rien.
create table private.journal_purge (
  id          uuid primary key default gen_random_uuid(),
  ensemble    text not null,
  lignes      integer not null check (lignes >= 0),
  motif       text not null,
  cree_le     timestamptz not null default now()
);

-- Durées de conservation promises, versionnées : ce qui est écrit dans la
-- politique de confidentialité doit être exécutable, pas seulement affiché.
create table private.retention (
  ensemble    text primary key,
  duree       interval not null,
  motif       text not null,
  depuis_le   date not null default current_date
);

-- ---------------------------------------------------------------- index
create index profil_maj                on profil (maj_le);
create index appartenance_entreprise   on private.appartenance (entreprise, role)
  where not pseudonymise;
create index appartenance_association  on private.appartenance (association)
  where association is not null;
create index annonce_association       on annonce (association, etat);
create index annonce_fermeture_auto    on annonce (date_prevue) where etat = 'ouverte';
create index mission_validation_auto   on mission (declaree_le) where etat = 'a_valider';
create index mission_classement        on mission (entreprise, date_mission, annonce)
  include (points, salarie, realise_confirme)
  where etat in ('validee','validee_auto');
create index mission_salarie           on mission (salarie);
create index mission_annonce           on mission (annonce);
create index don_association_date      on don (association, cree_le);
create index don_entreprise_date       on don (entreprise, cree_le) where entreprise is not null;
create index abonnement_saison         on abonnement (saison);
create index rapport_saison            on rapport (saison);
create index acces_purge               on acces (purge_le) where not legal_hold;
create index affectation_ouverte       on affectation_siege (abonnement) where liberee_le is null;
