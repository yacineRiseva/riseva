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

-- Propriétaire dédié des fonctions SECURITY DEFINER. Sans login : personne ne
-- s'y connecte, on ne fait qu'exécuter en son nom. Il vivait dans `00_local.sql`,
-- qui n'est jamais déployé : en production, `alter function ... owner to` échouait
-- et, sans `ON_ERROR_STOP`, les soixante fonctions privilégiées restaient
-- propriété de `postgres` — superutilisateur, BYPASSRLS. C'est-à-dire exactement
-- le risque que ce rôle existe pour écarter.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'riseva_definer') then
    create role riseva_definer nologin noinherit;
  end if;
end $$;

create schema if not exists private;
revoke all on schema private from public;

-- Le schéma `private` n'est jamais exposé par PostgREST. Il faut aussi le dire
-- explicitement, sinon un `db-schemas` mal configuré suffirait à tout ouvrir.
revoke usage on schema private from anon, authenticated;

-- ---------------------------------------------------------------- clés SIREN
-- La clé de Luhn se vérifie ici, pas seulement dans le navigateur. Un SIREN qui
-- ne peut pas exister n'a rien à faire en base : il finirait recopié sur une
-- facture, dans un reçu fiscal, ou dans un questionnaire fournisseur, et c'est
-- à ce moment-là qu'on le découvrirait.
--
-- La Poste fait exception depuis toujours : ses numéros ne satisfont pas Luhn
-- mais la somme de leurs chiffres est divisible par cinq. C'est écrit dans la
-- documentation de l'INSEE, ce n'est pas une tolérance qu'on s'accorde.
create or replace function private.luhn_ok(p text)
  returns boolean language sql immutable parallel safe
  set search_path = ''
as $$
  select case
    when p is null then true
    when p !~ '^[0-9]+$' then false
    when left(p, 9) = '356000000'
      and (select sum(substr(p, i, 1)::int)
             from generate_series(1, length(p)) i) % 5 = 0 then true
    else (select sum(
            case when (length(p) - i) % 2 = 1
                 then case when substr(p, i, 1)::int * 2 > 9
                           then substr(p, i, 1)::int * 2 - 9
                           else substr(p, i, 1)::int * 2 end
                 else substr(p, i, 1)::int end)
            from generate_series(1, length(p)) i) % 10 = 0
  end
$$;

-- Contrôle mod-97 d'un IBAN (ISO 13616). Il ne prouve pas que le compte existe,
-- ni qu'il appartient à l'association : il prouve que le numéro n'a pas été saisi
-- de travers, ce qui est de très loin l'erreur la plus fréquente. Et comme cet
-- IBAN est affiché à des donateurs, une faute de frappe ici envoie l'argent
-- nulle part — ou chez quelqu'un d'autre.
create or replace function private.iban_ok(p text)
  returns boolean language plpgsql immutable parallel safe
  set search_path = ''
as $$
declare v text; reste integer := 0; c char; d text;
begin
  if p is null then return true; end if;
  v := upper(replace(p, ' ', ''));
  if v !~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$' then return false; end if;
  v := substr(v, 5) || substr(v, 1, 4);
  for i in 1..length(v) loop
    c := substr(v, i, 1);
    d := case when c between 'A' and 'Z' then (ascii(c) - 55)::text else c end;
    for j in 1..length(d) loop
      reste := (reste * 10 + substr(d, j, 1)::int) % 97;
    end loop;
  end loop;
  return reste = 1;
end $$;

-- ---------------------------------------------------------------- types
-- `cse` est un rôle de lecture. Il existe parce que le comité social et
-- économique a un droit d'information (art. L. 2312-8 et L. 2312-9 du code du
-- travail) et qu'il vaut mieux le servir avec des agrégats que laisser
-- l'employeur recopier des chiffres à la main. Ce qu'il ne doit jamais devenir :
-- un moyen de savoir qui a fait quoi.
create type role_utilisateur as enum ('admin','entreprise_admin','salarie','association','site_referent','cse');
create type etat_collecte    as enum ('attendu','declare','approuve','clos_sans_reponse');
-- Sept formats, et l'ordre compte : il est repris tel quel partout où la liste
-- s'affiche. Les trois premiers sont du temps, les deux suivants concernent un
-- animal de refuge, puis le matériel et l'argent. Un refuge demande d'abord des
-- parrains et des adoptants ; ne pas les inscrire au barème revenait à lui dire
-- que sa demande principale ne compte pas.
create type type_annonce     as enum ('benevolat_demi_journee','benevolat_journee',
                                      'mecenat_competence','parrainage_animal',
                                      'adoption_animal','don_materiel','don_financier');
create type etat_annonce     as enum ('brouillon','ouverte','close');
create type etat_mission     as enum ('engagee','a_valider','validee','validee_auto','refusee');
create type etat_saison      as enum ('brouillon','ouverte','close');
create type etat_preinscription as enum ('preinscrite','relancee','confirmee','abandonnee');
create type etat_paiement    as enum ('attendu','confirme','rembourse','echoue');
create type origine_don      as enum ('entreprise','salarie');
-- La catégorie comptable du bien donné, et rien de plus. Riseva ne calcule
-- aucune valeur : elle demande sous quel régime le bien était inscrit, parce
-- que la méthode de valorisation en dépend, et laisse le montant au donateur.
create type categorie_materiel as enum ('stock','immobilisation','autre');
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
-- ---------------------------------------------------------------- groupe
-- Un groupe est un périmètre de consolidation *volontaire* et un payeur. Il n'a
-- aucune existence fiscale : il ne signe rien, ne déclare rien, et surtout il ne
-- mutualise aucun plafond. Ce qui signe et ce qui est imposé, c'est la société.
--
-- Le lien capitalistique ne crée aucun droit d'accès : appartenir au même groupe
-- ne donne jamais le droit de lire les données nominatives d'une autre société.
-- Deux sociétés d'un même groupe sont deux responsables de traitement distincts.
create table groupe (
  id           uuid primary key default gen_random_uuid(),
  nom          text not null check (length(nom) between 1 and 160),
  societe_mere uuid,                  -- FK posée après la création d'entreprise
  -- Le classement ordinal entre les sites du groupe est DESACTIVE par defaut. Un
  -- rang fabrique un dernier, et un dernier qui n'a pas encore de referent nomme
  -- est puni avant d'avoir commence. Le groupe l'active s'il le veut, en
  -- connaissance de cause ; par defaut chaque site porte un statut, pas une place.
  classement_sites boolean not null default false,
  cree_le      timestamptz not null default now()
);

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
  siren     text check (siren ~ '^[0-9]{9}$'  and private.luhn_ok(siren)),
  siret     text check (siret ~ '^[0-9]{14}$' and private.luhn_ok(siret)),
  adresse   text check (length(adresse) <= 240),
  lat       double precision check (lat between -90 and 90),
  lon       double precision check (lon between -180 and 180),
  groupe    uuid references groupe(id) on delete set null,
  -- Comment l'entreprise apparaît dans le classement inter-entreprises.
  -- « auto » — le défaut — la nomme dans la moitié haute et pas en dessous : un
  -- classement qui expose les derniers punit ceux qui participent et donne une
  -- raison rationnelle de ne pas s'inscrire.
  visibilite text not null default 'auto' check (visibilite in ('auto','nom','anonyme')),
  -- L'objectif de la saison, compté en PERSONNES mobilisées et jamais en points :
  -- un objectif en points s'atteint avec trois salariés très actifs, un objectif
  -- en personnes ne s'atteint qu'en allant chercher quelqu'un qui n'est pas
  -- encore venu. Il vit ici et pas dans l'écran parce qu'il est affiché à tous
  -- les salariés de l'entreprise, pas seulement à celui qui l'a posé.
  objectif_mobilises integer check (objectif_mobilises > 0),
  -- Le logo affiché à côté du nom dans le classement. Deux formes, et deux
  -- seulement : une adresse https, ou une image encodée. La contrainte est ici et
  -- pas seulement dans l'écran, parce que cette valeur finit dans un attribut
  -- `src` rendu chez TOUS les autres clients — un « javascript: » ou un
  -- « data:text/html » y serait une porte ouverte sur l'écran le plus partagé du
  -- produit. La taille est bornée pour la même raison qu'à l'écran : un logo plus
  -- lourd qu'une page ralentit chaque écran où il apparaît, et il apparaît partout.
  logo text check (
    logo ~ '^https://' or logo ~ '^data:image/(png|jpeg|webp|gif|svg\+xml);'),
  constraint entreprise_logo_borne check (logo is null or length(logo) <= 300000),
  cree_le   timestamptz not null default now()
);
create index entreprise_groupe on entreprise (groupe) where groupe is not null;

alter table groupe
  add constraint groupe_mere foreign key (societe_mere)
  references entreprise(id) on delete set null;

-- ---------------------------------------------------------------- établissement
-- Un établissement est un lieu, pas une personne morale : il porte un effectif,
-- un quota de comptes, un score et une accidentologie. Il ne porte ni contrat,
-- ni facture, ni plafond de mécénat.
--
-- Son SIRET est facultatif : un « site opérationnel » au sens du client peut
-- regrouper plusieurs SIRET, et un établissement distinct au sens du CSE ne
-- correspond pas forcément à un lieu. On modélise donc le site tel que le client
-- le pilote, et on garde le SIRET quand il y en a un seul.
create table etablissement (
  id        uuid primary key default gen_random_uuid(),
  societe   uuid not null references entreprise(id) on delete cascade,
  nom       text not null check (length(nom) between 1 and 120),
  ville     text check (length(ville) <= 120),
  siret     text check (siret ~ '^[0-9]{14}$' and private.luhn_ok(siret)),
  -- Le dénominateur du classement entre sites. Comme pour l'entreprise, il n'est
  -- pas modifiable par le client : se déclarer trois salariés suffirait sinon à
  -- rafler le classement normalisé.
  effectif  integer not null default 0 check (effectif >= 0),
  quota     integer not null default 0 check (quota >= 0),
  -- L'adresse du site et ses coordonnées. Ce n'est pas du confort : c'est le
  -- seul moyen de savoir ce qu'un salarié DE CE SITE peut réellement faire.
  -- L'entreprise a déjà les siennes, mais un groupe dont le siège est à Paris
  -- et l'usine à Lyon ne se diagnostique pas depuis le siège — c'est justement
  -- l'usine qui n'a rien autour d'elle.
  adresse   text check (length(adresse) <= 240),
  lat       double precision check (lat between -90 and 90),
  lon       double precision check (lon between -180 and 180),
  referent_nom   text check (length(referent_nom) <= 160),
  referent_mail  text check (length(referent_mail) <= 240),
  -- Tant qu'un site n'a pas activé son registre, il saisit ses chiffres de
  -- sécurité à la main. Basculer est une décision : sinon un site qui déclare un
  -- seul événement verrait ses trois autres accidents disparaître du rapport.
  registre_actif boolean not null default false,
  ferme_le  date,
  cree_le   timestamptz not null default now()
);
create index etablissement_societe on etablissement (societe);

-- ---------------------------------------------------------- zones à travailler
-- Un site dont l'offre associative est trop faible, et que Riseva doit aller
-- démarcher. C'est le seul endroit du produit où le client nous donne du
-- travail plutôt que l'inverse, et c'est voulu : un diagnostic qui s'arrête au
-- diagnostic est une excuse préparée d'avance.
--
-- Aucune date de traitement n'est promise et aucune ne sera affichée comme un
-- engagement : une association décide seule de publier ou non, et promettre un
-- délai qui ne dépend pas de nous serait la première chose qu'on ne tiendrait
-- pas. `traite_le` sert à Riseva pour sa file, pas à l'entreprise pour compter.
create table sourcing (
  id            uuid primary key default gen_random_uuid(),
  etablissement uuid not null references etablissement(id) on delete cascade,
  -- `par` est ajouté plus bas, une fois `profil` créé : ce fichier se lit et
  -- s'exécute de haut en bas, et `sourcing` vient avant lui.
  motif         text check (length(motif) <= 400),
  le            timestamptz not null default now(),
  traite_le     timestamptz,
  constraint sourcing_traite_apres check (traite_le is null or traite_le >= le)
);
-- Une zone ne se signale qu'une fois tant qu'elle n'est pas traitée : deux
-- demandes ouvertes pour le même site ne sont pas deux fois plus urgentes,
-- elles sont juste deux lignes.
create unique index sourcing_ouvert on sourcing (etablissement)
  where traite_le is null;

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
  -- Le nom d'usage et la dénomination déposée sont rarement les mêmes. On garde
  -- les deux : c'est la dénomination qui figure sur un reçu fiscal, et c'est le
  -- nom d'usage que les salariés reconnaissent.
  nom_juridique text check (length(nom_juridique) <= 200),
  rna       text check (rna ~ '^W[0-9A-Z]{9}$'),
  -- Facultatif, et il le restera : neuf associations déclarées sur dix n'ont pas
  -- de SIREN. Exiger un numéro reviendrait à ne garder que les grosses.
  siren     text check (siren ~ '^[0-9]{9}$' and private.luhn_ok(siren)),
  cause     text check (length(cause) <= 80),
  ville     text check (length(ville) <= 120),
  resume    text check (length(resume) <= 600),
  adresse   text check (length(adresse) <= 240),
  lat       double precision check (lat between -90 and 90),
  lon       double precision check (lon between -180 and 180),
  site      text check (length(site) <= 240),
  -- La photo que l'association publie sur sa fiche. Une liste d'associations
  -- sans images se parcourt sans s'arrêter, et un salarié qui ne s'arrête pas
  -- ne s'engage sur rien. Elle est stockée telle quelle, en data-URI réduite
  -- par le navigateur avant l'envoi : six cents kilooctets au maximum, ce qui
  -- laisse largement de quoi faire une image nette de mille deux cents pixels.
  photo     text check (length(photo) <= 600000),
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
  -- Le mandat par lequel l'association autorise Riseva à préparer ses reçus.
  -- Écrit, daté, nominatif, révocable. Sans lui la plateforme n'émet rien : seul
  -- l'organisme bénéficiaire peut délivrer un reçu, et l'amende de l'article
  -- 1740 A du CGI — au taux de la réduction d'impôt en cause — pèse sur
  -- lui. Un mandat implicite ne se plaide pas.
  mandat_recus_le      date,
  mandat_recus_nom     text check (length(mandat_recus_nom) <= 120),
  mandat_recus_qualite text check (length(mandat_recus_qualite) <= 120),
  mandat_recus_version text check (length(mandat_recus_version) <= 20),
  -- Le compte sur lequel les donateurs virent. Riseva ne le touche jamais : elle
  -- l'affiche. Recevoir des fonds pour les reverser serait fournir un service de
  -- paiement (art. L. 314-1 et L. 521-1 du code monétaire et financier), ce qui
  -- exige un agrément qu'on n'a pas et qu'on ne cherche pas.
  iban              text check (private.iban_ok(iban)),
  -- L'adresse publique du formulaire HelloAsso, quand l'association en a un.
  -- Restreinte au domaine de HelloAsso : ce lien est présenté à des donateurs
  -- sous la phrase « donnez ici », et un champ libre pointant n'importe où serait
  -- un détournement de dons offert à qui prendrait la main sur un compte.
  -- Riseva ne détient aucune clé d'API d'association : l'intégration
  -- serveur-à-serveur suppose un compte partenaire, qui suppose une personne
  -- morale, et rien ici n'attend cette étape pour fonctionner.
  helloasso         text check (helloasso ~ '^https://(www\.)?helloasso\.com/associations/[a-z0-9-]+/(formulaires|collectes|evenements|adhesions|boutiques)/[a-zA-Z0-9-]+/?$'),
  bic               text check (bic ~ '^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$'),
  titulaire_compte  text check (length(titulaire_compte) <= 200),
  cree_le   timestamptz not null default now(),
  constraint association_recus_complets check (
    not recus_actif or (eligible_mecenat
      and signataire is not null and qualite is not null and recu_prefixe is not null
      and mandat_recus_le is not null)),
  constraint association_mandat_complet check (
    mandat_recus_le is null
    or (mandat_recus_nom is not null and mandat_recus_qualite is not null)),
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
  -- Les reglages d'une personne : ce qu'elle accepte de recevoir, ce qu'elle
  -- accepte de montrer. Un objet plutot que dix colonnes, parce qu'un reglage
  -- ajoute ne doit pas demander une migration. Borne : ce sont des cases a
  -- cocher, pas un espace de stockage.
  preferences jsonb not null default '{}'::jsonb,
  constraint profil_preferences_borne check (length(preferences::text) <= 4000),
  cree_le   timestamptz not null default now(),
  maj_le    timestamptz not null default now()
);

-- Le demandeur d'une prospection associative. Il peut partir ; la demande reste :
-- un site mal servi ne cesse pas de l'être parce que la personne qui l'a signalé
-- a changé d'entreprise.
alter table sourcing add column par uuid references profil(id) on delete set null;

create table private.appartenance (
  profil       uuid primary key references profil(id) on delete cascade,
  role         role_utilisateur not null,
  entreprise   uuid references entreprise(id) on delete restrict,
  association  uuid references association(id) on delete restrict,
  -- Le périmètre du site : un référent de site ne voit que le sien, et un salarié
  -- porte le sien pour que ses missions soient attribuées au bon endroit.
  etablissement uuid references etablissement(id) on delete restrict,
  -- Le périmètre de consolidation : renseigné, il ouvre la vue de groupe — des
  -- agrégats, jamais des identités d'une autre société.
  groupe       uuid references groupe(id) on delete set null,
  actif        boolean not null default true,
  pseudonymise boolean not null default false,
  retire_le    timestamptz,
  maj_le       timestamptz not null default now(),
  constraint appartenance_rattachement check (
    (role = 'admin'            and entreprise is null and association is null) or
    (role in ('entreprise_admin','salarie','site_referent','cse') and entreprise is not null and association is null) or
    (role = 'association'      and association is not null and entreprise is null)),
  -- Un référent de site sans site n'est référent de rien.
  constraint appartenance_site check (
    role <> 'site_referent' or etablissement is not null),
  -- Un accès CSE porte sur toute la société, jamais sur un site : le comité ne
  -- se découpe pas par établissement dans ce que Riseva lui montre.
  constraint appartenance_cse check (
    role <> 'cse' or etablissement is null),
  -- Un compte pseudonymisé est un compte parti : il ne peut pas rester actif.
  constraint appartenance_depart check (
    not pseudonymise or (not actif and retire_le is not null))
);

-- ---------------------------------------------------------------- envois
-- Ce qui est réellement parti. « Généré automatiquement » ne veut rien dire tant
-- que personne ne l'a reçu : ce qui compte pour un client, c'est que le document
-- tombe dans sa boîte sans qu'il ait pensé à le demander.
--
-- La clé porte l'unicité. Un rapport reçu deux fois est une erreur qu'on
-- remarque, et qui coûte la confiance dans tout le reste — l'index l'empêche,
-- plutôt qu'un `if` dans le code de la tâche planifiée.
create table envoi (
  id           uuid primary key default gen_random_uuid(),
  cle          text not null unique check (length(cle) between 3 and 160),
  type         text not null
                 check (type in ('rapport','recu','relance','recap','demande_validation')),
  entreprise   uuid references entreprise(id) on delete cascade,
  association  uuid references association(id) on delete cascade,
  -- `mission` est ajoutée plus bas, une fois la table mission créée : la demande
  -- de confirmation porte sur une mission précise, et sans ce lien la fonction
  -- d'envoi devrait relire le sujet du courriel pour savoir de quoi il parle.
  -- Un sujet de courriel n'est pas une clé étrangère.
  -- Qui, pas où. L'adresse vit dans `auth.users`, que la tâche planifiée n'a pas
  -- à pouvoir lire : lui ouvrir la table des comptes pour composer un courriel
  -- serait un privilège gagné pour un confort. La fonction Edge qui envoie
  -- réellement, elle, détient la clé de service et inscrit l'adresse utilisée.
  destinataire_profil uuid references profil(id) on delete set null,
  destinataire text check (length(destinataire) <= 240),
  sujet        text not null check (length(sujet) between 1 and 240),
  detail       text check (length(detail) <= 400),
  date         date not null default current_date,
  etat         text not null default 'a_envoyer'
                 check (etat in ('a_envoyer','envoye','sans_destinataire','echec'))
);
create index envoi_entreprise on envoi (entreprise, date desc);
create index envoi_a_envoyer on envoi (type, date) where etat = 'a_envoyer';

-- ---------------------------------------------------------------- expéditions
-- Quatre envois d'affiches dans la saison. Le suivi est ici parce que c'est le
-- seul endroit où il tient : sans lui, un client qui dit « on n'a rien reçu » a
-- toujours raison, et Riseva n'a rien à opposer.
--
-- La réception est confirmée par le client, jamais par Riseva : un suivi où
-- l'expéditeur se déclare à lui-même que le colis est arrivé ne vaut rien.
create table expedition (
  id           uuid primary key default gen_random_uuid(),
  entreprise   uuid not null references entreprise(id) on delete cascade,
  saison       uuid not null references saison(id) on delete cascade,
  kit          text not null check (kit in ('K1','K2','K3','K4')),
  expedie_le   date not null default current_date,
  suivi        text check (length(suivi) <= 60),
  recu_le      date,
  cree_le      timestamptz not null default now(),
  unique (entreprise, saison, kit),
  constraint expedition_reception check (recu_le is null or recu_le >= expedie_le)
);

-- ------------------------------------------------- sécurité : événements
-- Le site déclare ses événements un par un ; les indicateurs de la période s'en
-- déduisent, pour lui comme pour la société. C'est ce qui supprime la double
-- saisie, et avec elle la seule cause sérieuse de divergence entre le chiffre du
-- site et celui du siège.
--
-- Ce que cette table n'est PAS : ni le registre des accidents bénins de
-- l'article L. 441-4 du code de la sécurité sociale, ni le document unique. Les
-- deux sont nominatifs ou relèvent de l'évaluation des risques, et ils restent
-- chez l'employeur.
--
-- Aucune donnée de santé, aucune identité : ni nom de victime, ni siège de la
-- lésion, ni diagnostic. Ce sont des données de l'article 9 du RGPD, et une
-- plateforme qui les héberge devient responsable de quelque chose qu'elle n'a
-- aucune raison de porter. Ce qu'un préventeur utilise pour agir — la
-- circonstance, la zone, le type, la gravité — n'en fait pas partie.
create table evenement_securite (
  id            uuid primary key default gen_random_uuid(),
  etablissement uuid not null references etablissement(id) on delete cascade,
  date          date not null,
  nature        text not null check (nature in ('travail','trajet')),
  gravite       text not null check (gravite in ('sans_soin','soin_sans_arret','avec_arret')),
  type_evenement text not null check (type_evenement in
                  ('chute_plain_pied','chute_hauteur','manutention','engin','machine',
                   'chimique','thermique','electrique','routier','agression','autre')),
  zone          text check (length(zone) <= 80),
  jours_arret   integer not null default 0 check (jours_arret >= 0),
  -- Trois cents caractères : ce n'est pas une contrainte de stockage, c'est ce
  -- qui empêche le champ de devenir un récit où finit par apparaître un prénom.
  circonstances text check (length(circonstances) <= 300),
  declare_par   uuid references profil(id) on delete set null,
  declare_le    timestamptz not null default now(),
  -- On n'efface pas une ligne d'un registre : on l'annule, en disant pourquoi.
  annule_le     date,
  motif_annulation text check (length(motif_annulation) <= 200),
  constraint evenement_arret check (
    (gravite = 'avec_arret' and jours_arret >= 1) or
    (gravite <> 'avec_arret' and jours_arret = 0)),
  constraint evenement_annulation check (
    annule_le is null or motif_annulation is not null)
  -- Pas de contrainte « date <= current_date » ici, bien que PostgreSQL
  -- l'accepte : une contrainte CHECK doit rester vraie pour toujours, et
  -- celle-là devient fausse en vieillissant — une restauration de sauvegarde
  -- échouerait sur des lignes parfaitement valides le jour où on les a écrites.
  -- Le refus d'une date future est donc dans la RPC, où il a sa place.
);
create index evenement_securite_site on evenement_securite (etablissement, date desc);

-- Le plan d'actions. Un registre sans actions est un cahier de doléances, et
-- c'est la première question posée après un accident : qu'avez-vous fait ensuite.
create table action_corrective (
  id            uuid primary key default gen_random_uuid(),
  evenement     uuid references evenement_securite(id) on delete set null,
  etablissement uuid not null references etablissement(id) on delete cascade,
  quoi          text not null check (length(quoi) between 3 and 240),
  -- Un responsable et une échéance, tous deux obligatoires : une action sans
  -- responsable est un vœu, une action sans échéance ne se fait jamais.
  responsable   text not null check (length(responsable) between 2 and 120),
  echeance      date not null,
  etat          text not null default 'a_faire'
                  check (etat in ('a_faire','en_cours','faite','abandonnee')),
  cree_le       timestamptz not null default now(),
  fait_le       date,
  constraint action_faite check (etat <> 'faite' or fait_le is not null)
);
create index action_corrective_site on action_corrective (etablissement, echeance);

-- ------------------------------------------------- contrôle au registre public
-- Riseva met des salariés en relation avec des associations et prépare des reçus
-- qui ouvrent droit à réduction d'impôt. Le jour où l'une d'elles se révèle
-- radiée, la question posée ne sera pas « aviez-vous un doute ? » mais « qu'aviez-
-- vous vérifié, quand, et qu'est-ce que ça disait ? ». D'où une trace datée, avec
-- la réponse brute du registre conservée à côté du verdict.
--
-- `fiche` est un instantané volontaire : le registre change, et un contrôle qui
-- ne garderait que sa conclusion serait invérifiable six mois plus tard.
create table controle_association (
  id          uuid primary key default gen_random_uuid(),
  association uuid not null references association(id) on delete cascade,
  le          date not null default current_date,
  par         uuid references profil(id) on delete set null,
  etat        text not null check (etat in
                ('exact','proche','different','fermee','introuvable','panne','absent')),
  bloquant    boolean not null default false,
  numero      text check (numero ~ '^[0-9]{9}$'),
  -- Les écarts constatés, champ par champ. Du texte, pas des identifiants : ce
  -- qu'on relit dans deux ans doit se comprendre sans le code qui l'a produit.
  ecarts      jsonb not null default '[]'::jsonb,
  fiche       jsonb,
  source      text not null default 'Annuaire des Entreprises (DINUM)',
  cree_le     timestamptz not null default now()
);
create index controle_association_asso on controle_association (association, le desc);

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
  -- La tranche appliquée et la remise de lancement, conservées avec le contrat.
  -- Un montant sans la règle qui l'a produit est indéfendable six mois plus tard,
  -- et une grille qui change ne doit pas réécrire un contrat déjà signé.
  palier      text check (palier in ('tpe','pme','eti','ge','ge2','ge3')),
  sites_factures integer not null default 0 check (sites_factures >= 0),
  fondateur   boolean not null default false,
  signe_le    date,
  -- Facturation électronique : à compter du 1er septembre 2026, toute entreprise
  -- doit pouvoir RECEVOIR ses factures par une plateforme agréée. Un PDF par
  -- courriel ne vaut plus facture. On demande donc la plateforme et l'identifiant
  -- d'annuaire dès la signature, sinon la première facture part dans le vide.
  plateforme_reception text check (length(plateforme_reception) <= 120),
  annuaire_id          text check (length(annuaire_id) <= 40),
  -- La reconduction est une DÉCISION, jamais un défaut. « Pas de reconduction
  -- tacite » est écrit sur la page de vente : ce booléen est ce qui le tient.
  reconduction boolean not null default false,
  cree_le     timestamptz not null default now(),
  unique (entreprise, saison),
  constraint abonnement_acompte check (acompte_paye <= montant_ht)
);

-- Les factures d'un abonnement. Elles existaient dans le jeu de démonstration et
-- nulle part ailleurs : l'écran « Abonnement » d'un client en production était
-- donc vide, et « marquer payée » n'écrivait rien.
--
-- Ce que cette table ne fait pas : elle ne calcule aucun montant. Le devis se
-- calcule à partir de la grille et de l'effectif, une fois, et la facture porte
-- le montant retenu. Un montant recopié à la main est un montant qui finit par
-- ne plus correspondre au contrat.
create table facture (
  id          uuid primary key default gen_random_uuid(),
  abonnement  uuid not null references abonnement(id) on delete cascade,
  ref         text not null check (ref ~ '^[A-Z]{3}-[0-9]{4}-[0-9]{4}$'),
  libelle     text not null check (length(libelle) between 3 and 160),
  montant     numeric(12,2) not null check (montant >= 0),
  emise_le    date not null default current_date,
  echeance    date not null,
  payee_le    date,
  periode     text check (length(periode) <= 80),
  cree_le     timestamptz not null default now(),
  unique (ref),
  constraint facture_echeance check (echeance >= emise_le),
  constraint facture_paiement check (payee_le is null or payee_le >= emise_le)
);
create index facture_abonnement on facture (abonnement, echeance);

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
-- Deux niveaux d'invitation, et jamais un seul. Le groupe nomme un référent de
-- site par un lien *nominatif* et à usage unique ; le référent, lui, produit le
-- lien d'inscription de ses salariés, borné par son quota.
--
-- Un lien de salarié ne confère jamais un rôle d'administration : c'est ce qui
-- fait qu'un lien qui fuite reste sans conséquence grave.
create table invitation (
  id          uuid primary key default gen_random_uuid(),
  entreprise  uuid not null references entreprise(id) on delete cascade,
  etablissement uuid references etablissement(id) on delete cascade,
  pour_referent boolean not null default false,
  -- L'acces du comite social et economique : nominatif lui aussi, une seule
  -- place, et il n'ouvre qu'une lecture agregee. Il ne pouvait pas exister en
  -- base : l'ecran le proposait, la production n'avait pas de quoi le porter.
  pour_cse      boolean not null default false,
  -- Un lien de référent est nominatif : il porte le nom et l'adresse de la
  -- personne visée, et il n'ouvre qu'un seul compte.
  destinataire_nom  text check (length(destinataire_nom) <= 160),
  destinataire_mail text check (length(destinataire_mail) <= 240),
  empreinte   bytea not null,
  indice      text not null check (length(indice) between 4 and 12), -- pour retrouver le lien côté admin
  places      integer not null check (places > 0),
  active      boolean not null default true,
  cree_par    uuid references profil(id) on delete set null,
  cree_le     timestamptz not null default now(),
  expire_le   timestamptz not null,
  constraint invitation_expiration check (expire_le > cree_le),
  constraint invitation_referent check (
    not pour_referent or (etablissement is not null and places = 1
                          and destinataire_nom is not null and destinataire_mail is not null)),
  constraint invitation_cse check (
    not pour_cse or (etablissement is null and places = 1
                     and destinataire_nom is not null and destinataire_mail is not null)),
  constraint invitation_un_seul_role check (not (pour_referent and pour_cse))
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
  -- L'établissement qui reçoit les points, figé au moment de l'engagement et
  -- jamais recalculé. Sans ce gel, un salarié muté de Lyon à Marseille emporterait
  -- son passé avec lui et le classement de la saison dernière changerait tout seul.
  -- La société, elle, est déjà figée par `entreprise` : c'est elle qui porte la
  -- convention, la valorisation et le reçu.
  etablissement uuid references etablissement(id) on delete set null,
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
  -- Accord exprès et écrit du salarié à CETTE mise à disposition, exigé par
  -- l'article R. 8241-2 du code du travail. Ce n'est pas une case de confort :
  -- sans lui la convention de mécénat de compétences est sans base, et le prêt
  -- de main-d'œuvre redevient illicite. On garde l'horodatage, pas un booléen —
  -- un booléen ne prouve rien devant un inspecteur du travail.
  consentement_le timestamptz,
  -- Le texte exact auquel le salarié a consenti, et son empreinte. Un horodatage
  -- seul prouve qu'on a coché quelque chose, pas à quoi. Si la convention change
  -- l'an prochain, seule l'empreinte permet de dire lequel des deux textes il
  -- avait sous les yeux — et c'est précisément la question qu'on pose en
  -- contentieux. Le texte est conservé en clair parce qu'il n'a rien de secret
  -- et que reconstituer un texte à partir d'une empreinte est impossible.
  consentement_texte    text,
  consentement_empreinte bytea,
  -- ---- don de matériel : ce que l'entreprise déclare, jamais ce qu'on calcule
  -- La valorisation d'un don en nature relève du donateur et de son
  -- expert-comptable. La doctrine distingue au moins deux régimes — un bien
  -- inscrit en stock se valorise à son coût de revient, une immobilisation à la
  -- valeur de cession retenue pour la plus ou moins-value de sortie — et une
  -- règle unique écrite dans un logiciel serait fausse une fois sur deux. On
  -- enregistre donc une valeur *déclarée*, sous la catégorie qui la justifie.
  -- Le nom de la colonne le dit : `valeur_declaree`, pas `valeur_nette`.
  valeur_declaree      numeric(12,2) check (valeur_declaree >= 0),
  categorie_comptable  categorie_materiel,
  nature               text check (length(nature) <= 200),
  reference_actif      text check (length(reference_actif) <= 80),
  sortie_le            date,
  justificatif         text check (length(justificatif) <= 200),
  -- Un ordinateur donné porte des données. Le donateur atteste de leur
  -- effacement, ou il ne l'atteste pas — et NULL veut dire « pas encore
  -- répondu », ce qu'un booléen à deux états ne sait pas dire.
  effacement_donnees   boolean,
  -- Le lien de réponse envoyé à l'association. On stocke l'empreinte SHA-256, pas
  -- le jeton : une fuite de la base ne doit pas livrer de quoi trancher les
  -- missions de tout le monde. Il expire avec le délai de validation et ne sert
  -- qu'une fois — un lien de courriel traîne des années dans des boîtes partagées.
  jeton_empreinte  bytea,
  jeton_expire_le  timestamptz,
  jeton_utilise_le timestamptz,
  cle_idempotence text,
  cree_le     timestamptz not null default now(),
  constraint mission_declaration check (
    etat = 'engagee' or declaree_le is not null),
  constraint mission_tranchee check (
    etat in ('engagee','a_valider') or tranchee_le is not null),
  constraint mission_confirme_si_validee check (
    realise_confirme is null or etat = 'validee'),
  constraint mission_refus check (etat <> 'refusee' or points = 0),
  -- Le consentement ne peut pas être postdaté : il précède la mise à disposition
  -- ou il ne vaut rien. La borne haute est vérifiée dans le RPC, pas ici : un
  -- CHECK sur now() n'est pas immuable et casserait toute restauration.
  constraint mission_consentement_avant check (
    consentement_le is null or consentement_le <= cree_le + interval '1 minute'),
  -- Un consentement sans son texte est un consentement qu'on ne peut pas
  -- produire. Les trois colonnes tiennent ou tombent ensemble.
  constraint mission_consentement_complet check (
    (consentement_le is null and consentement_texte is null
       and consentement_empreinte is null)
    or (consentement_le is not null and consentement_texte is not null
       and consentement_empreinte is not null)),
  -- Une valeur sans catégorie n'est pas une valorisation, c'est un nombre. La
  -- catégorie seule, en revanche, est légitime : elle se choisit avant de
  -- connaître le montant.
  constraint mission_valeur_categorie check (
    valeur_declaree is null or categorie_comptable is not null),
  -- La date de sortie de l'actif ne peut pas précéder de beaucoup le don
  -- lui-même : elle le date, elle ne raconte pas une autre opération.
  constraint mission_sortie_apres check (
    sortie_le is null or sortie_le >= date_mission - 90)
);
create unique index mission_idempotence on mission (cle_idempotence)
  where cle_idempotence is not null;
create unique index mission_jeton on mission (jeton_empreinte)
  where jeton_empreinte is not null;

-- Le lien annoncé plus haut : `envoi` précède `mission` dans ce fichier parce que
-- les envois existent aussi sans mission (rapports, reçus, récapitulatifs).
alter table envoi add column mission uuid references mission(id) on delete cascade;

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

-- ------------------------------------------------------- intention de virement
-- Ce qu'un donateur annonce, avec la référence qu'il portera sur son virement.
-- C'est le seul objet que Riseva crée dans ce circuit : elle ne voit pas passer
-- l'argent, elle ne fait que permettre à l'association de rapprocher une ligne
-- de son relevé bancaire d'une intention déclarée ici.
--
-- Une intention ne vaut pas encaissement et ne rapporte aucun point. C'est la
-- différence avec le bénévolat : une mission non tranchée en quatorze jours est
-- réputée faite, parce qu'un silence n'est pas une faute ; un virement que
-- personne n'a vu arriver, lui, n'a pas eu lieu.
create table intention_don (
  id          uuid primary key default gen_random_uuid(),
  annonce     uuid not null references annonce(id) on delete cascade,
  association uuid not null references association(id) on delete cascade,
  -- Un don personnel ne porte pas l'entreprise, ici non plus : la cause d'une
  -- association peut trahir une conviction ou un état de santé.
  salarie     uuid references profil(id) on delete set null,
  entreprise  uuid references entreprise(id) on delete restrict,
  origine     origine_don not null,
  montant     numeric(12,2) not null check (montant > 0),
  montant_recu numeric(12,2) check (montant_recu > 0),
  reference   text not null unique
                check (reference ~ '^RSV-[ACDEFGHJKLMNPQRSTUVWXYZ2345679]{4}-[ACDEFGHJKLMNPQRSTUVWXYZ2345679]{4}$'),
  etat        text not null default 'annoncee'
                check (etat in ('annoncee','recue','abandonnee')),
  motif       text check (length(motif) <= 200),
  declare_le  date not null default current_date,
  expire_le   date not null,
  confirme_le date,
  mission     uuid references mission(id) on delete set null,
  constraint intention_origine check (
    (origine = 'entreprise' and entreprise is not null) or
    (origine = 'salarie'    and entreprise is null)),
  constraint intention_confirmee check (
    etat <> 'recue' or (montant_recu is not null and confirme_le is not null))
);
create index intention_don_asso on intention_don (association, etat);
create index intention_don_salarie on intention_don (salarie) where salarie is not null;

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
-- ------------------------------------------------------- indicateurs sociaux
-- Ce qui coûte cher à un groupe, ce n'est pas le calcul : c'est d'obtenir les
-- chiffres de chaque site. On réemploie donc le mécanisme des missions — on
-- demande, on rappelle, et si personne ne répond la période se clôt *sans
-- réponse*, plutôt que d'être comblée avec celle d'avant.
-- ---------------------------------------------------- catalogue des rubriques
-- Une rubrique est une famille de valeurs qui viennent de la même source et de
-- la même personne : la paie pour les effectifs, le registre pour la sécurité,
-- les factures pour l'énergie. C'est l'unité qui compte pour celui qui remplit,
-- et donc l'unité qu'on demande, qu'on affiche et qu'on exporte.
--
-- Pourquoi une table et non un enum. Ajouter une rubrique doit être une ligne
-- insérée, pas un déploiement : le jour où un client demande « eau » ou
-- « biodiversité », personne ne doit attendre une migration. Un enum aurait
-- rendu chaque ajout bloquant, et chaque retrait impossible.
--
-- `cle` est la clé stable, écrite en clair, jamais renommée : c'est elle qu'on
-- retrouve dans les valeurs saisies, dans les exports déjà partis chez un
-- client, et dans les rapports scellés. Un libellé se corrige ; une clé, non.
create table rubrique (
  cle       text primary key check (cle ~ '^[a-z][a-z0-9_]{1,30}$'),
  libelle   text not null check (length(libelle) between 2 and 80),
  aide      text check (length(aide) <= 400),
  ordre     integer not null default 0,
  -- Ce qu'on demande à un groupe qui commence, tant qu'il n'a rien choisi.
  defaut    boolean not null default false,
  -- On désactive, on ne supprime pas : les valeurs déjà saisies sous cette
  -- rubrique doivent rester lisibles, sinon un rapport de l'an dernier perd la
  -- moitié de ses lignes sans que personne ne s'en aperçoive.
  active    boolean not null default true
);

-- Le catalogue des indicateurs. Il porte la définition, pas la valeur : ce qui
-- est compté, ce qui ne l'est pas, d'où ça sort, et si le nom correspond ou non
-- à une définition réglementaire. Sans ce dictionnaire, deux sites saisissent le
-- même champ en comptant l'un les intérimaires et l'autre non, on additionne les
-- deux, et l'écart ne se voit plus jamais.
--
-- `nature` sépare ce qu'un site saisit de ce que la plateforme calcule. Un
-- calculé n'a pas de colonne dans un formulaire ; il a une formule et deux
-- termes, et il ne s'affiche que si ses deux termes sont complets.
create table indicateur (
  cle       text primary key check (cle ~ '^[a-z][a-z0-9_]{1,40}$'),
  rubrique  text not null references rubrique(cle) on update cascade,
  libelle   text not null check (length(libelle) between 2 and 120),
  unite     text check (length(unite) <= 40),
  nature    text not null default 'collecte'
              check (nature in ('collecte', 'calcule')),
  -- Le niveau auquel l'indicateur a un sens. Un taux affiché au mauvais niveau
  -- porte le bon nom et dit autre chose.
  niveau    text check (length(niveau) <= 40),
  source    text check (length(source) <= 120),
  aide      text check (length(aide) <= 400),
  inclut    text check (length(inclut) <= 400),
  exclut    text check (length(exclut) <= 400),
  -- Pour un calculé : la formule en clair, et ses deux termes. Ce sont des
  -- EXPRESSIONS, pas forcément des clés seules — « at_avec_arret +
  -- at_sans_arret » en est une — mais chaque nom qui y apparaît doit exister
  -- dans le catalogue, sinon la formule lit une case vide et rend un résultat
  -- qui a l'air d'un chiffre.
  formule   text check (length(formule) <= 200),
  numerateur   text check (length(numerateur) <= 40),
  denominateur text check (length(denominateur) <= 40),
  note      text check (length(note) <= 600),
  -- Faux par défaut, et c'est volontaire : affirmer qu'un chiffre correspond à
  -- une définition réglementaire quand ce n'est pas le cas est la seule erreur
  -- de ce fichier qui puisse se retourner contre celui qui l'a publié.
  reglementaire boolean not null default false,
  ordre     integer not null default 0,
  -- La version du dictionnaire au moment où la ligne a été posée. Un rapport
  -- scellé cite cette version : une définition qui change plus tard ne réécrit
  -- pas ce qui a déjà été arrêté.
  version   text not null,
  active    boolean not null default true,
  constraint indicateur_calcule check (
    nature <> 'calcule' or (numerateur is not null and denominateur is not null))
);
create index indicateur_rubrique on indicateur (rubrique) where active;

-- Les rubriques ouvertes pour une entreprise. C'est ce qui permet de créer une
-- entrée neuve — une entreprise — et qu'elle ait immédiatement les bonnes
-- sections et les bonnes clés, sans que personne ne recopie une liste.
-- Une entreprise sans aucune ligne prend les rubriques marquées par défaut.
create table entreprise_rubrique (
  entreprise uuid not null references entreprise(id) on delete cascade,
  rubrique   text not null references rubrique(cle) on update cascade,
  ouverte_le timestamptz not null default now(),
  primary key (entreprise, rubrique)
);

create table campagne_indicateurs (
  id        uuid primary key default gen_random_uuid(),
  groupe    uuid references groupe(id) on delete cascade,
  entreprise uuid references entreprise(id) on delete cascade,
  periode   text not null check (length(periode) between 4 and 20),
  libelle   text not null check (length(libelle) between 1 and 120),
  debut     date not null,
  fin       date not null,
  echeance  date not null,
  close_le  timestamptz,
  cree_le   timestamptz not null default now(),
  constraint campagne_periode check (fin >= debut and echeance >= fin),
  -- Une campagne appartient à un groupe ou à une société, jamais aux deux.
  constraint campagne_portee check (
    (groupe is not null and entreprise is null) or
    (groupe is null and entreprise is not null))
);

-- Ce qu'une campagne demande, rubrique par rubrique. Écrit sur la campagne et
-- non sur l'entreprise : ce qu'on demande varie d'une période à l'autre, et une
-- campagne close doit continuer à dire ce qu'elle demandait à l'époque. Sans
-- cela, ajouter une rubrique au catalogue rendrait illisibles les totaux de
-- toutes les collectes déjà terminées.
--
-- Une campagne sans aucune ligne demande tout : c'est le comportement des
-- campagnes ouvertes avant que les rubriques existent, et elles ne doivent pas
-- se vider du jour au lendemain.
create table campagne_rubrique (
  campagne uuid not null references campagne_indicateurs(id) on delete cascade,
  rubrique text not null references rubrique(cle) on update cascade,
  primary key (campagne, rubrique)
);

-- Une observation : une valeur, pour un site, une période, un indicateur.
-- Les valeurs vivent dans un jsonb parce que la liste des indicateurs évolue ;
-- la définition, elle, est versionnée et figée dans les rapports.
--
-- Deux gestes distincts : le contributeur saisit, l'approbateur verrouille. Sans
-- cette séparation, un chiffre entre dans un document contractuel sans que
-- personne ne l'ait regardé. Corriger une valeur approuvée produit une version,
-- jamais un écrasement silencieux.
create table observation_indicateur (
  id            uuid primary key default gen_random_uuid(),
  campagne      uuid not null references campagne_indicateurs(id) on delete cascade,
  etablissement uuid not null references etablissement(id) on delete cascade,
  etat          etat_collecte not null default 'attendu',
  version       integer not null default 1 check (version > 0),
  valeurs       jsonb not null default '{}'::jsonb,
  saisi_par     uuid references profil(id) on delete set null,
  saisi_le      timestamptz,
  approuve_par  uuid references profil(id) on delete set null,
  approuve_le   timestamptz,
  -- L'explication d'une variation forte. Elle suit la valeur jusque dans le
  -- rapport : c'est elle qui répond, un an plus tard, à la seule question que
  -- posera un acheteur devant une courbe qui saute.
  commentaire   text check (length(commentaire) <= 600),
  ecarts        jsonb not null default '[]'::jsonb,
  maj_le        timestamptz not null default now(),
  unique (campagne, etablissement),
  -- Aucune donnée de santé : ni diagnostic, ni nature de lésion, ni identité de
  -- la victime. On compte des accidents et des journées, pas des personnes.
  constraint observation_agregats check (jsonb_typeof(valeurs) = 'object'),
  constraint observation_declare check (
    etat <> 'declare' or (saisi_par is not null and saisi_le is not null)),
  constraint observation_approuve check (
    etat <> 'approuve' or (approuve_par is not null and approuve_le is not null
                           and approuve_par is distinct from saisi_par))
);
create index observation_campagne on observation_indicateur (campagne);

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
