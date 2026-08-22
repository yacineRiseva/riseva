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
  ('aaaaaaaa-0000-4000-8000-000000000004', 'pirate@ailleurs.fr'),
  ('aaaaaaaa-0000-4000-8000-000000000005', 'karim@lafarge-ciments.fr'),
  ('aaaaaaaa-0000-4000-8000-000000000006', 'lea@lafarge-ciments.fr'),
  ('aaaaaaaa-0000-4000-8000-000000000007', 'theo@lafarge-negoce.fr'),
  ('aaaaaaaa-0000-4000-8000-000000000008', 'controle@riseva.fr');

insert into profil (id, nom) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Claire Fontaine'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'Malik Ferhat'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'Élise Tournier'),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'Inconnu'),
  ('aaaaaaaa-0000-4000-8000-000000000005', 'Karim Belhadj'),
  ('aaaaaaaa-0000-4000-8000-000000000006', 'Léa Mercier'),
  ('aaaaaaaa-0000-4000-8000-000000000007', 'Théo Rialland'),
  ('aaaaaaaa-0000-4000-8000-000000000008', 'Riseva');

-- Un groupe de deux sociétés : c'est le seul montage qui prouve ce que le modèle
-- doit tenir. Même actionnaire, deux SIREN, deux responsables de traitement.
insert into groupe (id, nom, societe_mere) values
  ('99999999-9999-4999-8999-999999999999', 'Groupe Lafarge',
   '22222222-2222-4222-8222-222222222222');

update entreprise set groupe = '99999999-9999-4999-8999-999999999999'
 where id = '22222222-2222-4222-8222-222222222222';

insert into entreprise (id, nom, secteur, ville, effectif, ca, siren, groupe) values
  ('88888888-8888-4888-8888-888888888888', 'Lafarge Négoce', 'Négoce', 'Nantes',
   45, 6200000, '842100448', '99999999-9999-4999-8999-999999999999');

insert into etablissement (id, societe, nom, ville, effectif, quota) values
  ('e7000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222',
   'Siège', 'Paris', 60, 60),
  ('e7000000-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222',
   'Usine', 'Lyon', 110, 110),
  ('e7000000-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222',
   'Agence', 'Marseille', 40, 40),
  ('e7000000-0000-4000-8000-000000000004', '88888888-8888-4888-8888-888888888888',
   'Plateforme', 'Nantes', 45, 45);

insert into private.appartenance (profil, role, entreprise, association, etablissement, groupe) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'entreprise_admin',
   '22222222-2222-4222-8222-222222222222', null,
   'e7000000-0000-4000-8000-000000000001', '99999999-9999-4999-8999-999999999999'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'salarie',
   '22222222-2222-4222-8222-222222222222', null,
   'e7000000-0000-4000-8000-000000000002', null),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'association', null,
   '33333333-3333-4333-8333-333333333333', null, null),
  ('aaaaaaaa-0000-4000-8000-000000000005', 'site_referent',
   '22222222-2222-4222-8222-222222222222', null,
   'e7000000-0000-4000-8000-000000000002', null),
  ('aaaaaaaa-0000-4000-8000-000000000006', 'site_referent',
   '22222222-2222-4222-8222-222222222222', null,
   'e7000000-0000-4000-8000-000000000003', null),
  ('aaaaaaaa-0000-4000-8000-000000000007', 'entreprise_admin',
   '88888888-8888-4888-8888-888888888888', null,
   'e7000000-0000-4000-8000-000000000004', null),
  ('aaaaaaaa-0000-4000-8000-000000000008', 'admin', null, null, null, null);

insert into campagne_indicateurs (id, groupe, periode, libelle, debut, fin, echeance) values
  ('c1000000-0000-4000-8000-000000000001', '99999999-9999-4999-8999-999999999999',
   '2026-S2', 'Second semestre 2026', '2026-07-01', '2026-12-31', '2027-01-31');

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
\echo 'Paiements'
do $$
declare v_don uuid; v_bis uuid; v_n integer; v_an uuid;
begin
  -- Une annonce financière, pour avoir de quoi payer.
  insert into public.annonce (association, saison, type, titre, description, lieu,
    quantite, restant, date_prevue, etat, impact_unite, impact_par_unite)
  values ('44444444-4444-4444-8444-444444444444', '11111111-1111-4111-8111-111111111111',
    'don_financier', 'Financer les plants d''automne',
    'Un plant coûte 2,10 € livré. Objectif : sécuriser la campagne de plantation.',
    'Clermont-Ferrand', 2520, 2520, current_date + 40, 'ouverte', 'arbre', 0.4762)
  returning id into v_an;

  v_don := public.confirmer_don('demo', 'PAY-0001', v_an, 300, 'entreprise',
                                'aaaaaaaa-0000-4000-8000-000000000002');
  perform pg_temp.dit('un webhook confirmé crée le don et sa mission', v_don is not null);
  perform pg_temp.dit('les points du don viennent du barème',
    (select points from public.mission where cle_idempotence = 'demo:PAY-0001') = 30);
  perform pg_temp.dit('le reste à financer a baissé',
    (select restant from public.annonce where id = v_an) = 2220);

  -- Le même webhook, rejoué.
  v_bis := public.confirmer_don('demo', 'PAY-0001', v_an, 300, 'entreprise',
                                'aaaaaaaa-0000-4000-8000-000000000002');
  perform pg_temp.dit('un webhook rejoué ne crée pas un second don', v_bis = v_don);
  select count(*) into v_n from public.mission where cle_idempotence = 'demo:PAY-0001';
  perform pg_temp.dit('ni une seconde mission', v_n = 1);
  perform pg_temp.dit('le reste à financer n''a pas rebaissé',
    (select restant from public.annonce where id = v_an) = 2220);

  -- Un don personnel ne porte pas le nom de l'entreprise dans la donnée brute.
  perform public.confirmer_don('demo', 'PAY-0002', v_an, 50, 'salarie',
                               'aaaaaaaa-0000-4000-8000-000000000002');
  perform pg_temp.dit('un don personnel n''a pas d''entreprise dans la table des dons',
    (select entreprise from public.don where reference = 'PAY-0002') is null);
  perform pg_temp.dit('un paiement ne produit pas de réalisation confirmée',
    (select realise_confirme from public.mission where cle_idempotence = 'demo:PAY-0002') is null);
end $$;

do $$
begin
  perform pg_temp.dit('aucune mission financière ne peut exister sans don en face',
    not exists (
      select 1 from public.mission m
        join public.annonce a on a.id = m.annonce
       where a.type = 'don_financier'
         and m.etat in ('validee','validee_auto')
         and not exists (select 1 from public.don d where d.mission = m.id)));
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
\echo 'Groupe, sociétés, établissements'
-- Un groupe consolide, il ne fusionne pas. Appartenir au même groupe ne donne
-- aucun droit sur les personnes d'une autre société : deux responsables de
-- traitement distincts, et le lien capitalistique n'y change rien.
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.email', 'claire@lafarge-ciments.fr', false);

select pg_temp.dit('la mère voit les établissements des deux sociétés du groupe',
  (select count(*) from public.etablissement) = 4);
select pg_temp.dit('elle voit le groupe qu''elle consolide',
  (select count(*) from public.groupe) = 1);
select pg_temp.dit('elle ne lit pas les personnes de la filiale',
  not exists (select 1 from public.profil p
               where p.id = 'aaaaaaaa-0000-4000-8000-000000000007'));
select pg_temp.refuse('elle ne s''alloue pas des places qu''elle n''a pas achetées',
  'select public.allouer_quota(''e7000000-0000-4000-8000-000000000002'', 99999)');
select pg_temp.refuse('elle ne modifie pas un quota directement dans la table',
  'update public.etablissement set quota = 9999');
select pg_temp.refuse('elle ne modifie pas l''effectif de référence d''un site',
  'update public.etablissement set effectif = 3');
select pg_temp.refuse('elle n''alloue rien à un établissement d''une autre société',
  'select public.allouer_quota(''e7000000-0000-4000-8000-000000000004'', 10)');
select pg_temp.refuse('un lien de référent sans destinataire est refusé',
  'select public.creer_invitation_referent(''e7000000-0000-4000-8000-000000000003'', '''', '''')');
reset role;

\echo ''
\echo 'Ce que voit un référent de site'
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000005', false);
select set_config('request.jwt.claim.email', 'karim@lafarge-ciments.fr', false);

select pg_temp.dit('il voit les établissements de sa société',
  (select count(*) from public.etablissement
    where societe = '22222222-2222-4222-8222-222222222222') = 3);
select pg_temp.dit('il ne voit pas la vue de groupe',
  (select count(*) from public.groupe) = 0);
select pg_temp.dit('il ne lit pas l''abonnement de la société',
  (select count(*) from public.abonnement) = 0);
select pg_temp.refuse('il ne s''alloue pas de quota',
  'select public.allouer_quota(''e7000000-0000-4000-8000-000000000002'', 200)');
select pg_temp.refuse('il ne nomme pas un autre référent',
  'select public.creer_invitation_referent(''e7000000-0000-4000-8000-000000000003'',
                                           ''Quelqu''''un'', ''x@lafarge-ciments.fr'')');
select pg_temp.refuse('il ne saisit pas les indicateurs d''un autre site',
  'select public.saisir_indicateurs(''c1000000-0000-4000-8000-000000000001'',
     ''e7000000-0000-4000-8000-000000000003'', ''{\"effectif_fin\": 40}''::jsonb)');
select pg_temp.refuse('il ne se promeut pas administrateur de la société',
  'update private.appartenance set role = ''entreprise_admin'' where profil = auth.uid()');

do $$
declare v_id uuid;
begin
  v_id := public.saisir_indicateurs('c1000000-0000-4000-8000-000000000001',
            'e7000000-0000-4000-8000-000000000002',
            '{"effectif_fin": 110, "heures_travaillees": 94200, "at_avec_arret": 2,
              "at_sans_arret": 4, "jours_arret": 38}'::jsonb);
  perform pg_temp.dit('il saisit les indicateurs de son site',
    (select etat from public.observation_indicateur where id = v_id) = 'declare');
end $$;
select pg_temp.refuse('des valeurs non numériques sont refusées',
  'select public.saisir_indicateurs(''c1000000-0000-4000-8000-000000000001'',
     ''e7000000-0000-4000-8000-000000000002'', ''{\"effectif_fin\": \"beaucoup\"}''::jsonb)');
select pg_temp.refuse('il n''approuve pas sa propre saisie',
  'select public.approuver_indicateurs(''c1000000-0000-4000-8000-000000000001'',
     ''e7000000-0000-4000-8000-000000000002'')');
reset role;

\echo ''
\echo 'Ce que voit une autre société du même groupe'
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000007', false);
select set_config('request.jwt.claim.email', 'theo@lafarge-negoce.fr', false);

select pg_temp.dit('la filiale ne voit que son propre établissement',
  (select count(*) from public.etablissement) = 1);
select pg_temp.dit('elle ne lit pas les personnes de la maison mère',
  not exists (select 1 from public.profil p
               where p.id = 'aaaaaaaa-0000-4000-8000-000000000002'));
select pg_temp.dit('elle ne lit pas l''abonnement de la maison mère',
  not exists (select 1 from public.abonnement ab
               where ab.entreprise = '22222222-2222-4222-8222-222222222222'));
select pg_temp.refuse('elle n''approuve pas les indicateurs d''un site de la mère',
  'select public.approuver_indicateurs(''c1000000-0000-4000-8000-000000000001'',
     ''e7000000-0000-4000-8000-000000000002'')');
reset role;

\echo ''
\echo 'L''approbation appartient à la société'
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.email', 'claire@lafarge-ciments.fr', false);
do $$
declare v_id uuid;
begin
  v_id := public.approuver_indicateurs('c1000000-0000-4000-8000-000000000001',
            'e7000000-0000-4000-8000-000000000002');
  perform pg_temp.dit('une saisie déclarée par le site s''approuve par la société',
    (select etat from public.observation_indicateur where id = v_id) = 'approuve');
  perform pg_temp.dit('et l''approbateur n''est pas le contributeur',
    (select approuve_par <> saisi_par from public.observation_indicateur where id = v_id));
end $$;
reset role;

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
\echo 'Contrôle au registre public'
reset role;
select set_config('request.jwt.claim.sub', '', false);
do $$
begin
  perform pg_temp.dit('la clé de contrôle d''un SIREN est vérifiée en base',
    private.luhn_ok('428763304') and not private.luhn_ok('428763305'));
  perform pg_temp.dit('La Poste, qui ne satisfait pas Luhn, reste acceptée',
    private.luhn_ok('356000000'));
  perform pg_temp.dit('les accents ne changent pas la comparaison des noms',
    public.sans_accents('Réfugé dès Quatre-Vents') = 'Refuge des Quatre-Vents');
  perform pg_temp.dit('la forme juridique ne compte pas dans la comparaison',
    private.mots_utiles('Association Refuge des Quatre Vents (loi 1901)')
      = private.mots_utiles('REFUGE DES QUATRE VENTS'));
  perform pg_temp.dit('le recouvrement se mesure comme dans le navigateur',
    private.recouvrement(private.mots_utiles('Les Quatre Vents'),
                         private.mots_utiles('Refuge des Quatre Vents')) = 2::numeric/3);
end $$;

select pg_temp.refuse('un SIREN à clé fausse n''entre pas en base',
  'update public.association set siren = ''428763305''
    where id = ''33333333-3333-4333-8333-333333333333''');

-- Riseva contrôle. Le verdict est recalculé ici : le navigateur envoie la fiche
-- brute du registre, jamais sa conclusion.
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000008', false);
select set_config('request.jwt.claim.email', 'controle@riseva.fr', false);

do $$
declare v_id uuid; v_etat text; v_bloq boolean;
begin
  v_id := public.controler_association('33333333-3333-4333-8333-333333333333',
    jsonb_build_object('nom','REFUGE DES QUATRE VENTS','nom_raison_sociale','REFUGE DES QUATRE VENTS',
                       'etat','A','est_association',true,'rna','W423001234'));
  select etat, bloquant into v_etat, v_bloq from public.controle_association where id = v_id;
  perform pg_temp.dit('un nom identique au registre donne un contrôle non bloquant',
    v_etat = 'exact' and not v_bloq);

  v_id := public.controler_association('33333333-3333-4333-8333-333333333333',
    jsonb_build_object('nom','SOCIETE GENERALE DE TRAVAUX','etat','A','est_association',false));
  select etat, bloquant into v_etat, v_bloq from public.controle_association where id = v_id;
  perform pg_temp.dit('un nom sans rapport est signalé, et il bloque',
    v_etat = 'different' and v_bloq);
  perform pg_temp.dit('une structure non signalée comme association apparaît dans les écarts',
    exists (select 1 from public.controle_association c,
                 jsonb_array_elements(c.ecarts) e
             where c.id = v_id and e->>'champ' = 'nature'));

  v_id := public.controler_association('44444444-4444-4444-8444-444444444444',
    jsonb_build_object('nom','RACINES VIVES','etat','C','est_association',true));
  select etat into v_etat from public.controle_association where id = v_id;
  perform pg_temp.dit('une structure fermée au registre est reconnue', v_etat = 'fermee');
  perform pg_temp.dit('et elle sort de la vitrine sans être effacée',
    (select not valide from public.association
      where id = '44444444-4444-4444-8444-444444444444'));

  v_id := public.controler_association('33333333-3333-4333-8333-333333333333', null, true);
  select etat, bloquant into v_etat, v_bloq from public.controle_association where id = v_id;
  perform pg_temp.dit('un registre injoignable est consigné, et ne bloque personne',
    v_etat = 'panne' and not v_bloq);
end $$;

-- L'association concernée lit son dossier, et rien d'autre.
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000003', false);
select set_config('request.jwt.claim.email', 'elise@quatrevents.org', false);
do $$
begin
  perform pg_temp.dit('l''association lit les contrôles qui la concernent',
    (select count(*) from public.controle_association) > 0);
  perform pg_temp.dit('et aucun de ceux d''une autre association',
    not exists (select 1 from public.controle_association
                 where association <> '33333333-3333-4333-8333-333333333333'));
end $$;

select pg_temp.refuse('une association n''écrit pas son propre verdict',
  'select public.controler_association(''33333333-3333-4333-8333-333333333333'',
     jsonb_build_object(''nom'',''REFUGE DES QUATRE VENTS'',''etat'',''A''))');
select pg_temp.refuse('elle ne renseigne pas le numéro d''une autre association',
  'select public.enregistrer_numeros_association(
     ''44444444-4444-4444-8444-444444444444'', ''428763304'', null)');
select pg_temp.refuse('un SIREN à clé fausse est refusé par la RPC',
  'select public.enregistrer_numeros_association(
     ''33333333-3333-4333-8333-333333333333'', ''428763305'', null)');
select pg_temp.refuse('un RNA mal formé est refusé',
  'select public.enregistrer_numeros_association(
     ''33333333-3333-4333-8333-333333333333'', null, ''423001234'')');

do $$
begin
  perform public.enregistrer_numeros_association(
    '33333333-3333-4333-8333-333333333333', '428763304', 'W423001234');
  perform pg_temp.dit('elle renseigne les siens',
    (select siren = '428763304' from public.association
      where id = '33333333-3333-4333-8333-333333333333'));
end $$;

set role anon;
select set_config('request.jwt.claim.sub', '', false);
select pg_temp.refuse('un visiteur ne lit aucun contrôle',
  'select count(*) from public.controle_association');
reset role;

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
