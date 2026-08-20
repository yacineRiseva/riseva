-- Riseva — schéma Postgres (Supabase)
-- Conventions : tout en snake_case, tout en français, identifiants uuid.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- types
create type role_utilisateur as enum ('admin','entreprise_admin','salarie','association');
create type type_annonce     as enum ('don_financier','benevolat_demi_journee','don_materiel');
create type etat_annonce     as enum ('brouillon','ouverte','close');
create type etat_mission     as enum ('engagee','a_valider','validee','validee_auto','refusee');
create type etat_saison      as enum ('brouillon','ouverte','close');
create type etat_preinscription as enum ('preinscrite','relancee','confirmee','abandonnee');

-- ---------------------------------------------------------------- saison
create table saison (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null,
  debut       date not null,
  fin         date not null,
  etat        etat_saison not null default 'brouillon',
  prix_min    integer not null default 3500,
  prix_max    integer not null default 4000,
  acompte     integer not null default 500,
  cree_le     timestamptz not null default now(),
  constraint saison_dates check (fin > debut)
);

-- Barème versionné par saison : jamais de valeur codée en dur dans l'application.
create table bareme (
  id       uuid primary key default gen_random_uuid(),
  saison   uuid not null references saison(id) on delete cascade,
  type     type_annonce not null,
  points   integer not null check (points > 0),
  unite    text not null,
  unique (saison, type)
);

-- ---------------------------------------------------------------- organisations
create table entreprise (
  id        uuid primary key default gen_random_uuid(),
  nom       text not null,
  siren     text,
  secteur   text,
  ville     text,
  effectif  integer check (effectif >= 0),
  sieges    integer not null default 0 check (sieges >= 0),  -- places de l'abonnement
  ca                integer,        -- chiffre d'affaires HT, pour le plafond de 5 pour mille
  cout_jour_moyen   integer,        -- coût chargé d'une journée salarié, pour la valorisation
  siret     text,
  adresse   text,
  -- Domaines de messagerie acceptés par le lien d'inscription. Vide = aucune restriction,
  -- ce que l'interface signale comme un risque.
  domaines  text[] not null default '{}',
  cree_le   timestamptz not null default now()
);

create table association (
  id        uuid primary key default gen_random_uuid(),
  nom       text not null,
  rna       text,
  siren     text,
  cause     text,
  ville     text,
  resume    text,
  site      text,
  valide    boolean not null default false,
  verifiee_le      date,          -- date de la dernière vérification d'éligibilité
  a_reverifier_le  date,          -- échéance de revérification
  suspendue        boolean not null default false,
  motif_suspension text,
  -- Réglages des reçus fiscaux. L'association est l'émetteur, Riseva ne fait que préparer.
  recus_actif      boolean not null default false,
  recus_eligible   boolean not null default false,   -- éligibilité au mécénat déclarée
  recus_signataire text,
  recus_qualite    text,
  recus_prefixe    text,
  recus_numero     integer not null default 1,       -- numérotation continue, propriété de l'asso
  cree_le   timestamptz not null default now()
);

create table abonnement (
  id            uuid primary key default gen_random_uuid(),
  entreprise    uuid not null references entreprise(id) on delete cascade,
  saison        uuid not null references saison(id) on delete cascade,
  montant_ht    integer not null,
  acompte_paye  integer not null default 0,
  paye_le       timestamptz,
  unique (entreprise, saison)
);

-- ---------------------------------------------------------------- utilisateurs
-- Le mot de passe et l'email vivent dans auth.users, géré par Supabase.
create table profil (
  id           uuid primary key references auth.users(id) on delete cascade,
  nom          text not null,
  role         role_utilisateur not null,
  entreprise   uuid references entreprise(id) on delete set null,
  association  uuid references association(id) on delete set null,
  actif        boolean not null default true,
  -- Un salarié retiré n'est pas supprimé : il est vidé. Voir anonymiser_salarie().
  anonyme      boolean not null default false,
  retire_le    date,
  cree_le      timestamptz not null default now(),
  constraint profil_une_seule_org check (
    (entreprise is null) or (association is null)
  ),
  constraint profil_org_coherente check (
    (role = 'admin'            and entreprise is null and association is null) or
    (role in ('entreprise_admin','salarie') and entreprise is not null)        or
    (role = 'association'      and association is not null)
  )
);

-- ---------------------------------------------------------------- invitations
-- Un lien unique par entreprise. Les salariés créent leur compte eux-mêmes,
-- l'entreprise n'a aucune liste à saisir.
create table invitation (
  id          uuid primary key default gen_random_uuid(),
  entreprise  uuid not null references entreprise(id) on delete cascade,
  code        text not null unique,
  places      integer not null check (places > 0),
  utilisees   integer not null default 0 check (utilisees >= 0),
  active      boolean not null default true,
  cree_par    uuid references profil(id) on delete set null,
  cree_le     timestamptz not null default now(),
  expire_le   date not null default (current_date + interval '120 days'),
  constraint invitation_places check (utilisees <= places)
);
-- Un seul lien actif à la fois par entreprise.
create unique index invitation_une_seule_active on invitation (entreprise) where active;

-- ---------------------------------------------------------------- annonces et missions
create table annonce (
  id           uuid primary key default gen_random_uuid(),
  association  uuid not null references association(id) on delete cascade,
  saison       uuid not null references saison(id) on delete cascade,
  type         type_annonce not null,
  -- Mission proposée sur le temps de travail : conditionne le mécénat de compétences.
  temps_travail boolean not null default false,
  titre        text not null,
  description  text not null,
  quantite     numeric not null check (quantite > 0),   -- euros, ou nombre de demi-journées, ou nombre de dons
  restant      numeric not null check (restant >= 0),
  date_prevue  date,
  lieu         text,
  etat         etat_annonce not null default 'ouverte',
  cree_le      timestamptz not null default now()
);
create index on annonce (saison, etat);
create index on annonce (association);

create table mission (
  id          uuid primary key default gen_random_uuid(),
  annonce     uuid not null references annonce(id) on delete cascade,
  entreprise  uuid not null references entreprise(id) on delete cascade,
  salarie     uuid not null references profil(id)     on delete cascade,
  quantite    numeric not null check (quantite > 0),
  points      integer not null default 0,
  etat        etat_mission not null default 'engagee',
  declaree_le timestamptz,
  tranchee_le timestamptz,
  jeton       uuid not null default gen_random_uuid(), -- lien de validation envoyé par mail
  cree_le     timestamptz not null default now()
);
create index on mission (entreprise);
create index on mission (annonce);
create index on mission (etat);

-- ---------------------------------------------------------------- journal des accès
-- Qui a rejoint, quand, avec quel lien, et ce qui a été révoqué.
-- Demandé par tout acheteur qui prend la sécurité au sérieux.
create type evenement_acces as enum
  ('inscription','creation_lien','revocation_lien','retrait','connexion','export');

create table acces (
  id          uuid primary key default gen_random_uuid(),
  entreprise  uuid references entreprise(id) on delete cascade,
  utilisateur uuid references profil(id) on delete set null,
  quoi        evenement_acces not null,
  code        text,
  ip          inet,
  agent       text,
  cree_le     timestamptz not null default now()
);
create index on acces (entreprise, cree_le desc);

-- ---------------------------------------------------------------- dons
create type origine_don as enum ('particulier','entreprise');

create table don (
  id           uuid primary key default gen_random_uuid(),
  mission      uuid references mission(id) on delete set null,
  association  uuid not null references association(id) on delete cascade,
  entreprise   uuid references entreprise(id) on delete set null,
  montant      numeric not null check (montant > 0),
  origine      origine_don not null default 'particulier',
  fournisseur  text not null default 'helloasso',
  reference    text,                      -- identifiant de la transaction chez le fournisseur
  -- Modèle officiel retenu : 11580*05 pour un particulier (art. 200),
  -- 16216*01 pour une entreprise (art. 238 bis). Ils ne sont pas interchangeables.
  recu_modele  text,
  recu_numero  text,
  recu_emis_le timestamptz,
  cree_le      timestamptz not null default now()
);

-- ---------------------------------------------------------------- commercial
create table preinscription (
  id         uuid primary key default gen_random_uuid(),
  entreprise text not null,
  contact    text not null,
  email      text not null,
  telephone  text,
  effectif   text,
  message    text,
  etat       etat_preinscription not null default 'preinscrite',
  cree_le    timestamptz not null default now()
);

-- ---------------------------------------------------------------- classement
-- Vue matérialisée rafraîchie chaque lundi par une tâche planifiée.
create materialized view classement as
select
  e.id                                  as entreprise,
  a.saison                              as saison,
  coalesce(sum(m.points), 0)::integer   as points,
  rank() over (partition by a.saison order by coalesce(sum(m.points), 0) desc) as rang
from entreprise e
join mission  m on m.entreprise = e.id and m.etat in ('validee','validee_auto')
join annonce  a on a.id = m.annonce
group by e.id, a.saison;

create unique index on classement (entreprise, saison);
