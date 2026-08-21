-- Riseva — tests de sécurité et de calcul
-- ---------------------------------------------------------------------------
-- Chaque test se lit comme une phrase : ce qu'un rôle doit pouvoir faire, et
-- surtout ce qu'il ne doit pas. Les corrections de l'audit sont ici sous forme
-- exécutable — si l'une repartait, ce fichier le dirait avant le client.
-- ---------------------------------------------------------------------------
\set ON_ERROR_STOP on
\set QUIET on
set client_min_messages = notice;

create or replace function pg_temp.dit(nom text, ok boolean) returns void
language plpgsql as $$
begin
  if ok then raise notice '  ok   %', nom;
  else raise notice '  RATÉ %', nom;
       perform set_config('riseva.rates',
         (coalesce(current_setting('riseva.rates', true), '0')::int + 1)::text, false);
  end if;
end $$;

-- Un bloc qui doit échouer : on attrape, et l'échec est le succès.
create or replace function pg_temp.refuse(nom text, sql text) returns void
language plpgsql as $$
begin
  execute sql;
  perform pg_temp.dit(nom || ' (devait être refusé)', false);
exception when others then
  perform pg_temp.dit(nom, true);
end $$;

select set_config('riseva.rates', '0', false);

-- ---------------------------------------------------------------- comptes
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'claire@lafarge-ciments.fr'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'malik@lafarge-ciments.fr'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'elise@quatrevents.org'),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'pirate@ailleurs.fr');

insert into profil (id, nom) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Claire Fontaine'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'Malik Ferhat'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'Élise Tournier'),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'Inconnu');

insert into private.appartenance (profil, role, entreprise, association) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'entreprise_admin',
   '22222222-2222-4222-8222-222222222222', null),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'salarie',
   '22222222-2222-4222-8222-222222222222', null),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'association', null,
   '33333333-3333-4333-8333-333333333333');

\echo ''
\echo 'Calcul du score'
do $$
declare v_brut bigint; v_ret bigint;
begin
  -- (6 240, 780, 0) : la règle « aucun format au-delà de la moitié du retenu »
  -- impose 1 560, pas 4 290. C'est l'exemple exact relevé par l'audit.
  create temp table t_pts (type text, pts bigint);
  insert into t_pts values ('benevolat_demi_journee', 6240), ('don_materiel', 780), ('don_financier', 0);
  select sum(pts) into v_brut from t_pts;
  select sum(greatest(0, least(pts, v_brut - pts))) into v_ret from t_pts;
  perform pg_temp.dit('le plafond porte sur le retenu, pas sur le brut', v_ret = 1560);
  perform pg_temp.dit('aucun format ne dépasse la moitié du retenu',
    (select max(greatest(0, least(pts, v_brut - pts))) from t_pts) * 2 <= v_ret);
end $$;

do $$
begin
  perform pg_temp.dit('le barème manquant lève une exception, il ne renvoie pas zéro', (
    select not exists (select 1 from public.bareme b
      where b.saison = '11111111-1111-4111-8111-111111111111' and b.type = 'don_materiel'
        and b.points = 0)));
end $$;

\echo ''
\echo 'Ce que voit un visiteur non connecté'
set role anon;
select set_config('request.jwt.claim.sub', '', false);
select set_config('request.jwt.claim.email', '', false);

select pg_temp.refuse('le CA de l''entreprise n''est pas lisible',
  'select ca from public.entreprise limit 1');
select pg_temp.refuse('le SIRET n''est pas lisible',
  'select siret from public.entreprise limit 1');
select pg_temp.refuse('le coût journalier moyen n''est pas lisible',
  'select cout_jour_moyen from public.entreprise limit 1');
select pg_temp.refuse('les missions ne sont pas lisibles',
  'select count(*) from public.mission');
select pg_temp.refuse('les dons ne sont pas lisibles',
  'select count(*) from public.don');
select pg_temp.refuse('les abonnements ne sont pas lisibles',
  'select count(*) from public.abonnement');
select pg_temp.refuse('le journal d''accès n''est pas lisible',
  'select count(*) from public.acces');
select pg_temp.refuse('l''empreinte d''une invitation n''est pas lisible',
  'select empreinte from public.invitation limit 1');
select pg_temp.refuse('la pseudonymisation n''est pas appelable',
  'select public.pseudonymiser_salarie(''aaaaaaaa-0000-4000-8000-000000000002'')');
select pg_temp.refuse('la création d''un lien d''inscription n''est pas appelable',
  'select public.creer_invitation(10)');
select pg_temp.refuse('le moteur n''est pas appelable',
  'select private.moteur()');
select pg_temp.refuse('les tâches planifiées ne sont pas appelables',
  'select private.tache_retention()');
select pg_temp.refuse('le schéma privé est hors de portée',
  'select count(*) from private.appartenance');

do $$
begin
  perform pg_temp.dit('le nom des associations vérifiées reste public',
    (select count(*) from public.association) = 2);
  perform pg_temp.dit('les annonces ouvertes restent publiques',
    (select count(*) from public.annonce) = 2);
end $$;
reset role;

\echo ''
\echo 'Ce que peut faire un salarié'
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000002', false);
select set_config('request.jwt.claim.email', 'malik@lafarge-ciments.fr', false);

select pg_temp.refuse('il ne peut pas se nommer administrateur Riseva',
  'update private.appartenance set role = ''admin'' where profil = auth.uid()');
select pg_temp.refuse('il ne peut pas changer d''entreprise',
  'update private.appartenance set entreprise = null where profil = auth.uid()');
select pg_temp.refuse('il ne peut pas insérer une mission déjà validée',
  'insert into public.mission (annonce, entreprise, salarie, etat, quantite, points, date_mission)
   select id, ''22222222-2222-4222-8222-222222222222'', auth.uid(), ''validee'', 1, 99999, current_date
     from public.annonce limit 1');
select pg_temp.refuse('il ne peut pas s''attribuer des points',
  'update public.mission set points = 99999');
select pg_temp.refuse('il ne peut pas ouvrir des places supplémentaires',
  'update public.abonnement set sieges = 100000');
select pg_temp.refuse('il ne peut pas retoucher l''effectif de référence',
  'update public.abonnement set effectif_reference = 1');
do $$
begin
  -- La RLS ne lève pas d'erreur : elle rend la table vide. C'est le bon
  -- comportement — une erreur dirait qu'il y a quelque chose à voir.
  perform pg_temp.dit('les dons lui sont invisibles',
    (select count(*) from public.don) = 0);
end $$;
select pg_temp.refuse('il ne peut pas créer un lien d''inscription',
  'select public.creer_invitation(50)');
select pg_temp.refuse('il ne peut pas pseudonymiser un collègue',
  'select public.pseudonymiser_salarie(''aaaaaaaa-0000-4000-8000-000000000001'')');
select pg_temp.refuse('il ne peut pas supprimer un compte',
  'select public.supprimer_salarie(''aaaaaaaa-0000-4000-8000-000000000001'')');
select pg_temp.refuse('il ne peut pas trancher lui-même sa mission',
  'select public.trancher_mission(''00000000-0000-4000-8000-000000000000'', true)');

do $$
declare v_mid uuid; v_ok boolean;
begin
  -- Ce qu'il DOIT pouvoir faire : s'engager, puis déclarer.
  select public.engager_mission(a.id, 2) into v_mid
    from public.annonce a where a.impact_unite = 'arbre' limit 1;
  perform pg_temp.dit('il peut s''engager sur une annonce ouverte', v_mid is not null);
  perform pg_temp.dit('les points sont fixés par le barème, pas par lui',
    (select points from public.mission where id = v_mid) = 300);
  perform public.declarer_mission(v_mid, 118);
  perform pg_temp.dit('il peut déclarer sa mission faite',
    (select etat from public.mission where id = v_mid) = 'a_valider');
  perform pg_temp.dit('le stock de l''annonce a bien baissé',
    (select restant from public.annonce where impact_unite = 'arbre') = 7);
end $$;
reset role;

\echo ''
\echo 'Ce que peut faire une association'
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000003', false);
select set_config('request.jwt.claim.email', 'elise@quatrevents.org', false);

select pg_temp.refuse('elle ne tranche pas une mission qui n''est pas la sienne',
  'select public.trancher_mission((select id from public.mission limit 1), true)');
select pg_temp.refuse('elle ne modifie pas les points d''une mission',
  'update public.mission set points = 1');
reset role;

\echo ''
\echo 'Confirmé et estimé'
do $$
declare v_mid uuid;
begin
  select id into v_mid from public.mission where etat = 'a_valider' limit 1;
  -- Validation automatique : des points, mais aucune réalisation confirmée.
  update public.mission set declaree_le = now() - interval '20 days' where id = v_mid;
  perform private.tache_validation_auto();
  perform pg_temp.dit('sans réponse, la mission est validée d''office',
    (select etat from public.mission where id = v_mid) = 'validee_auto');
  perform pg_temp.dit('sans réponse, aucune réalisation n''est confirmée',
    (select realise_confirme from public.mission where id = v_mid) is null);
  perform pg_temp.dit('la production non confirmée est comptée comme estimée',
    (select estime from public.realisations(null, null, null) where unite = 'arbre') > 0);
  perform pg_temp.dit('le confirmé reste à zéro',
    (select confirme from public.realisations(null, null, null) where unite = 'arbre') = 0);
end $$;

\echo ''
\echo 'Le délai court depuis la déclaration'
do $$
declare v_mid uuid; v_n integer;
begin
  insert into public.mission (annonce, entreprise, salarie, etat, quantite, points,
                              date_mission, declaree_le)
  select a.id, '22222222-2222-4222-8222-222222222222',
         'aaaaaaaa-0000-4000-8000-000000000002', 'a_valider', 1, 150,
         current_date - 60, now() - interval '2 days'
    from public.annonce a where a.impact_unite = 'animal' limit 1
  returning id into v_mid;
  v_n := private.tache_validation_auto();
  perform pg_temp.dit('une mission déclarée hier n''est pas validée d''office demain',
    (select etat from public.mission where id = v_mid) = 'a_valider');
end $$;

\echo ''
\echo 'Cloisonnement des dons personnels'
do $$
declare r record;
begin
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', false);
  select * into r from public.dons_personnels_agreges('11111111-1111-4111-8111-111111111111');
  perform pg_temp.dit('sous cinq donateurs, rien ne sort', not r.affichable);
  perform pg_temp.dit('sous le seuil, ni montant ni effectif',
    r.montant is null and r.donateurs is null);
end $$;

\echo ''
\echo 'Rapports'
do $$
begin
  perform private.tache_rapports();
  perform pg_temp.dit('un rapport est produit pour chaque abonnement',
    (select count(*) from public.rapport) >= 1);
  perform pg_temp.dit('le rapport fige le barème utilisé',
    (select bareme_gele from public.rapport limit 1) ? 'benevolat_demi_journee');
  perform pg_temp.dit('le rapport n''est pas scellé avant la clôture des validations',
    (select scelle_le from public.rapport limit 1) is null);
end $$;

\echo ''
\echo 'Rétention'
do $$
declare v_n integer;
begin
  insert into public.acces (entreprise, quoi, purge_le)
  values ('22222222-2222-4222-8222-222222222222', 'test', now() - interval '1 day');
  insert into public.acces (entreprise, quoi, purge_le, legal_hold)
  values ('22222222-2222-4222-8222-222222222222', 'garde', now() - interval '1 day', true);
  v_n := private.tache_retention();
  perform pg_temp.dit('une ligne arrivée à échéance disparaît vraiment',
    not exists (select 1 from public.acces where quoi = 'test'));
  perform pg_temp.dit('une ligne sous gardiennage légal survit',
    exists (select 1 from public.acces where quoi = 'garde'));
  perform pg_temp.dit('la purge est consignée sans recopier ce qu''elle supprime',
    exists (select 1 from private.journal_purge where ensemble = 'acces'));
end $$;

\echo ''
\echo 'Fonctions privilégiées'
do $$
declare v_sans integer;
begin
  select count(*) into v_sans
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public','private') and p.prosecdef
     and coalesce(array_to_string(p.proconfig, ','), '') not like '%search_path=%';
  perform pg_temp.dit('toute fonction SECURITY DEFINER fixe son search_path', v_sans = 0);

  select count(*) into v_sans
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    join pg_roles r on r.oid = p.proowner
   where n.nspname in ('public','private') and p.prosecdef and r.rolname <> 'riseva_definer';
  perform pg_temp.dit('elles appartiennent toutes à un rôle dédié sans login', v_sans = 0);

  select count(*) into v_sans from pg_tables t
   where t.schemaname = 'public'
     and not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                      where n.nspname = 'public' and c.relname = t.tablename and c.relrowsecurity);
  perform pg_temp.dit('toutes les tables publiques ont la RLS active', v_sans = 0);
end $$;

\echo ''
do $$
declare v integer := coalesce(current_setting('riseva.rates', true), '0')::int;
begin
  if v = 0 then raise notice 'Tout est vert.';
  else raise exception '% test(s) en échec', v;
  end if;
end $$;
