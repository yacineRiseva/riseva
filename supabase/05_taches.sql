-- Riseva — ce qui se fait tout seul.
--
-- Quatre règles tournent sans que personne les déclenche. Elles vivent ici, dans la base,
-- et pas dans le code d'interface : elles doivent s'exécuter même si personne n'ouvre la
-- plateforme de la semaine. Chaque passage est consigné dans `moteur_journal`, parce qu'une
-- automatisation qu'on ne peut pas auditer inquiète plus qu'elle ne rassure.

create extension if not exists pg_cron;

create table if not exists moteur_journal (
  id                uuid primary key default gen_random_uuid(),
  tache             text not null,
  lignes_touchees   integer not null default 0,
  detail            jsonb,
  duree_ms          integer,
  passe_le          timestamptz not null default now()
);
create index if not exists moteur_journal_date on moteur_journal (passe_le desc);

-- ---------------------------------------------------------------- 1. validation sans retour
-- Quatorze jours après la déclaration du salarié, une mission qui n'a reçu aucune réponse
-- est comptée comme réalisée. L'inaction d'une association, qui ne paie rien, ne doit pas
-- pénaliser une entreprise qui paie.
create or replace function tache_validation_auto() returns integer
language plpgsql security definer as $$
declare v_n integer; v_t0 timestamptz := clock_timestamp();
begin
  with echues as (
    update mission set etat = 'validee_auto', decide_le = now()
     where etat = 'a_valider'
       and declaree_le is not null
       and declaree_le < now() - interval '14 days'
    returning id, entreprise, salarie, points
  ), maj_entreprise as (
    update entreprise e set points = e.points + x.total
      from (select entreprise, sum(points) total from echues group by entreprise) x
     where e.id = x.entreprise
  ), maj_profil as (
    update profil p set points = coalesce(p.points, 0) + x.total
      from (select salarie, sum(points) total from echues group by salarie) x
     where p.id = x.salarie
  )
  select count(*) into v_n from echues;

  insert into moteur_journal (tache, lignes_touchees, duree_ms)
  values ('validation_auto', v_n,
          extract(milliseconds from clock_timestamp() - v_t0)::integer);
  return v_n;
end $$;

-- ---------------------------------------------------------------- 2. fraîcheur des annonces
-- Une annonce dont la date est dépassée depuis plus de sept jours est fermée.
-- C'est l'engagement de fraîcheur pris envers les clients, tenu par la machine.
create or replace function tache_fermeture_annonces() returns integer
language plpgsql security definer as $$
declare v_n integer; v_t0 timestamptz := clock_timestamp();
begin
  with fermees as (
    update annonce set etat = 'close', fermeture_auto = true
     where etat = 'ouverte' and date_prevue < current_date - interval '7 days'
    returning id
  )
  select count(*) into v_n from fermees;

  insert into moteur_journal (tache, lignes_touchees, duree_ms)
  values ('fermeture_annonces', v_n,
          extract(milliseconds from clock_timestamp() - v_t0)::integer);
  return v_n;
end $$;

-- ---------------------------------------------------------------- 3. rapports de période
-- Chaque période close produit son rapport, une seule fois, sans que personne le demande.
create table if not exists rapport (
  id          uuid primary key default gen_random_uuid(),
  entreprise  uuid not null references entreprise(id) on delete cascade,
  saison      uuid not null references saison(id) on delete cascade,
  portee      text not null check (portee in ('trimestriel','annuel')),
  periode     text not null,
  debut       date not null,
  fin         date not null,
  donnees     jsonb not null,
  genere_le   timestamptz not null default now(),
  unique (entreprise, saison, portee, periode)
);

create or replace function tache_rapports() returns integer
language plpgsql security definer as $$
declare v_n integer := 0; v_t0 timestamptz := clock_timestamp();
begin
  insert into rapport (entreprise, saison, portee, periode, debut, fin, donnees)
  select e.id, s.id, p.portee, p.periode, p.debut, p.fin,
         jsonb_build_object(
           'points',        points_retenus(e.id, p.debut, p.fin),
           'points_bruts',  points_bruts(e.id, p.debut, p.fin),
           'missions',      (select count(*) from mission m
                              where m.entreprise = e.id
                                and m.etat in ('validee','validee_auto')
                                and m.date_mission between p.debut and p.fin),
           'realisations',  realisations_entreprise(e.id, p.debut, p.fin),
           'salaries_engages', (select count(distinct m.salarie) from mission m
                                 where m.entreprise = e.id
                                   and m.etat in ('validee','validee_auto')
                                   and m.date_mission between p.debut and p.fin))
    from entreprise e
    cross join saison s
    cross join lateral periodes_de(s.id) p
   where s.etat = 'ouverte' and p.fin <= current_date
  on conflict (entreprise, saison, portee, periode) do nothing;

  get diagnostics v_n = row_count;
  insert into moteur_journal (tache, lignes_touchees, duree_ms)
  values ('rapports', v_n, extract(milliseconds from clock_timestamp() - v_t0)::integer);
  return v_n;
end $$;

-- ---------------------------------------------------------------- 4. classement
-- Aucun rang n'est stocké : il se déduit des points à la lecture, ce qui interdit tout
-- écart entre ce qui est affiché et ce qui est réel. La vue est rafraîchie chaque lundi
-- uniquement pour éviter qu'un classement bouge en pleine semaine sous les yeux du client.
create materialized view if not exists classement_saison as
with base as (
  select e.id, e.nom, e.secteur, e.ville, e.effectif,
         points_retenus(e.id, null, null) as points,
         points_bruts(e.id, null, null)   as brut,
         greatest(e.effectif, 1)          as diviseur,
         (select count(*) from profil p
           where p.entreprise = e.id and p.role = 'salarie' and not p.anonyme) as comptes,
         (select count(distinct m.salarie) from mission m
           where m.entreprise = e.id and m.etat in ('validee','validee_auto')) as engages
    from entreprise e
)
select *,
       round(points::numeric / diviseur, 1) as par_salarie,
       case when comptes > 0 then round(100.0 * engages / comptes) else 0 end as participation,
       case
         when effectif < 50  then 'tpe'
         when effectif < 200 then 'pme'
         when effectif < 500 then 'eti'
         else 'ge'
       end as categorie
  from base;

create unique index if not exists classement_saison_id on classement_saison (id);

create or replace function tache_classement() returns integer
language plpgsql security definer as $$
declare v_t0 timestamptz := clock_timestamp();
begin
  refresh materialized view concurrently classement_saison;
  insert into moteur_journal (tache, lignes_touchees, duree_ms)
  values ('classement', (select count(*) from classement_saison),
          extract(milliseconds from clock_timestamp() - v_t0)::integer);
  return 1;
end $$;

-- ---------------------------------------------------------------- planification
-- Heures creuses, et le classement le lundi matin avant l'arrivée au bureau.
select cron.schedule('riseva-validation-auto',  '0 3 * * *',   $$select tache_validation_auto()$$);
select cron.schedule('riseva-fraicheur',        '30 3 * * *',  $$select tache_fermeture_annonces()$$);
select cron.schedule('riseva-rapports',         '0 4 * * *',   $$select tache_rapports()$$);
select cron.schedule('riseva-classement',       '0 6 * * 1',   $$select tache_classement()$$);

-- Les relances de validation, elles, partent en milieu de journée : un mail à 3 h du matin
-- se lit mal.
select cron.schedule('riseva-relances', '0 13 * * *', $$
  select net.http_post(
    url     := current_setting('app.edge_url') || '/relance-validation',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.edge_key'))
  )
$$);
