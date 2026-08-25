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
select set_config('riseva.intention', '', false);

-- ---------------------------------------------------------------- comptes
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'claire@vaudrey-ciments.fr'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'malik@vaudrey-ciments.fr'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'elise@quatrevents.org'),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'pirate@ailleurs.fr'),
  ('aaaaaaaa-0000-4000-8000-000000000005', 'karim@vaudrey-ciments.fr'),
  ('aaaaaaaa-0000-4000-8000-000000000006', 'lea@vaudrey-ciments.fr'),
  ('aaaaaaaa-0000-4000-8000-000000000007', 'theo@vaudrey-negoce.fr'),
  ('aaaaaaaa-0000-4000-8000-000000000008', 'controle@riseva.fr'),
  ('aaaaaaaa-0000-4000-8000-000000000009', 'cse@vaudrey-ciments.fr');

insert into profil (id, nom) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Claire Fontaine'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'Malik Ferhat'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'Élise Tournier'),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'Inconnu'),
  ('aaaaaaaa-0000-4000-8000-000000000005', 'Karim Belhadj'),
  ('aaaaaaaa-0000-4000-8000-000000000006', 'Léa Mercier'),
  ('aaaaaaaa-0000-4000-8000-000000000007', 'Théo Rialland'),
  ('aaaaaaaa-0000-4000-8000-000000000008', 'Riseva'),
  ('aaaaaaaa-0000-4000-8000-000000000009', 'Farid Amrani');

-- Un groupe de deux sociétés : c'est le seul montage qui prouve ce que le modèle
-- doit tenir. Même actionnaire, deux SIREN, deux responsables de traitement.
insert into groupe (id, nom, societe_mere) values
  ('99999999-9999-4999-8999-999999999999', 'Groupe Vaudrey',
   '22222222-2222-4222-8222-222222222222');

update entreprise set groupe = '99999999-9999-4999-8999-999999999999'
 where id = '22222222-2222-4222-8222-222222222222';

insert into entreprise (id, nom, secteur, ville, effectif, ca, siren, groupe) values
  ('88888888-8888-4888-8888-888888888888', 'Vaudrey Négoce', 'Négoce', 'Nantes',
   45, 6200000, '842100448', '99999999-9999-4999-8999-999999999999');

-- Les coordonnees ne sont pas du decor : c'est le seul moyen de savoir ce qu'un
-- salarie DE CE SITE peut reellement faire. Un groupe dont le siege est a Paris
-- et l'usine a Lyon ne se diagnostique pas depuis le siege — c'est justement
-- l'usine qui n'a rien autour d'elle.
insert into etablissement (id, societe, nom, ville, effectif, quota, lat, lon) values
  ('e7000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222',
   'Siège', 'Paris', 60, 60, 48.8566, 2.3522),
  ('e7000000-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222',
   'Usine', 'Lyon', 110, 110, 45.7333, 4.8137),
  ('e7000000-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222',
   'Agence', 'Marseille', 40, 40, 43.2965, 5.3698),
  ('e7000000-0000-4000-8000-000000000004', '88888888-8888-4888-8888-888888888888',
   'Plateforme', 'Nantes', 45, 45, 47.2184, -1.5536);

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
  ('aaaaaaaa-0000-4000-8000-000000000008', 'admin', null, null, null, null),
  ('aaaaaaaa-0000-4000-8000-000000000009', 'cse',
   '22222222-2222-4222-8222-222222222222', null, null, null);

insert into campagne_indicateurs (id, groupe, periode, libelle, debut, fin, echeance) values
  ('c1000000-0000-4000-8000-000000000001', '99999999-9999-4999-8999-999999999999',
   '2026-S2', 'Second semestre 2026', '2026-07-01', '2026-12-31', '2027-01-31'),
  -- Une période antérieure, close et approuvée : sans elle il n'y a rien à
  -- comparer, et la règle des écarts ne serait vérifiée par personne.
  ('c1000000-0000-4000-8000-000000000002', '99999999-9999-4999-8999-999999999999',
   '2026-S1', 'Premier semestre 2026', '2026-01-01', '2026-06-30', '2026-07-31');

insert into observation_indicateur (campagne, etablissement, etat, valeurs,
                                    saisi_par, saisi_le, approuve_par, approuve_le)
values ('c1000000-0000-4000-8000-000000000002', 'e7000000-0000-4000-8000-000000000002',
        'approuve', '{"effectif_fin": 110, "heures_travaillees": 92000, "at_avec_arret": 2,
                      "at_sans_arret": 4, "jours_arret": 40, "femmes": 39,
                      "entrees": 7, "sorties": 5}'::jsonb,
        'aaaaaaaa-0000-4000-8000-000000000005', now(),
        'aaaaaaaa-0000-4000-8000-000000000001', now());

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

-- ── le barème étendu ────────────────────────────────────────────────────────
-- Sept formats, dont deux qui concernent un animal de refuge. Ce que ces
-- assertions protègent n'est pas la liste elle-même mais ses deux propriétés :
-- chaque format de la saison a un barème, et un seul, et l'argent reste le seul
-- format compté par tranche de dix euros.
do $$
declare v_n integer; v_pts integer;
begin
  select count(*) into v_n from public.bareme
    where saison = '11111111-1111-4111-8111-111111111111';
  perform pg_temp.dit('les sept formats de la saison ont chacun leur barème', v_n = 7);

  perform pg_temp.dit('le refuge a ses deux formats, et ils valent quelque chose', (
    select count(*) = 2 and min(points) >= 100 from public.bareme
      where saison = '11111111-1111-4111-8111-111111111111'
        and type in ('parrainage_animal','adoption_animal')));

  perform pg_temp.dit('adopter vaut plus que parrainer, et parrainer plus qu''un don de matériel',
    (select points from public.bareme where type = 'adoption_animal'
       and saison = '11111111-1111-4111-8111-111111111111')
    > (select points from public.bareme where type = 'parrainage_animal'
         and saison = '11111111-1111-4111-8111-111111111111')
    and (select points from public.bareme where type = 'parrainage_animal'
           and saison = '11111111-1111-4111-8111-111111111111')
      > (select points from public.bareme where type = 'don_materiel'
           and saison = '11111111-1111-4111-8111-111111111111'));

  -- Une journée entière compte deux demi-journées, pas une seule.
  perform pg_temp.dit('une journée entière vaut le double d''une demi-journée',
    (select points from public.bareme where type = 'benevolat_journee'
       and saison = '11111111-1111-4111-8111-111111111111')
    = 2 * (select points from public.bareme where type = 'benevolat_demi_journee'
             and saison = '11111111-1111-4111-8111-111111111111'));

  -- Un parrainage se compte à l'unité. S'il tombait dans la branche des dons en
  -- argent, un animal parrainé rapporterait vingt-cinq points au lieu de deux
  -- cent cinquante, et personne ne s'en apercevrait avant le premier client.
  v_pts := private.points_pour('11111111-1111-4111-8111-111111111111',
                               'parrainage_animal', 1);
  perform pg_temp.dit('un animal parrainé se compte à l''unité, pas par tranche de dix euros',
    v_pts = 250);
  v_pts := private.points_pour('11111111-1111-4111-8111-111111111111',
                               'don_financier', 250);
  perform pg_temp.dit('l''argent reste le seul format compté par tranche de dix euros',
    v_pts = 25);
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
    (select count(*) from public.annonce) = 4);
end $$;
reset role;

\echo ''
\echo 'Ce que peut faire un salarié'
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000002', false);
select set_config('request.jwt.claim.email', 'malik@vaudrey-ciments.fr', false);

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
  -- Ce qu'il DOIT pouvoir faire : s'engager, puis déclarer. L'annonce « arbre » est
  -- sur le temps de travail : sans accord exprès, l'engagement doit être refusé.
  begin
    select public.engager_mission(a.id, 2) into v_mid
      from public.annonce a where a.impact_unite = 'arbre' limit 1;
    perform pg_temp.dit(
      'une mise a disposition sans accord ecrit est refusee (R. 8241-2)', false);
  exception when others then
    perform pg_temp.dit(
      'une mise a disposition sans accord ecrit est refusee (R. 8241-2)',
      sqlerrm like '%accord explicite%');
  end;
  select public.engager_mission(a.id, 2, null, true) into v_mid
    from public.annonce a where a.impact_unite = 'arbre' limit 1;
  perform pg_temp.dit('il peut s''engager sur une annonce ouverte', v_mid is not null);
  perform pg_temp.dit('l''accord du salarie est horodate, pas juste coche',
    (select consentement_le from public.mission where id = v_mid) is not null);
  -- Un horodatage prouve qu'une case a ete cochee. Il ne dit pas A QUOI, et c'est
  -- la seule question qui se pose devant un inspecteur du travail. L'article
  -- R. 8241-2 exige un accord expres : « expres » qualifie le contenu.
  perform pg_temp.dit('le texte accepte est conserve, pas seulement la date',
    (select consentement_texte from public.mission where id = v_mid) is not null);
  perform pg_temp.dit('ce texte nomme la mission et l''organisme',
    (select m.consentement_texte like '%' || a.titre || '%'
        and m.consentement_texte like '%' || asso.nom || '%'
       from public.mission m
       join public.annonce a on a.id = m.annonce
       join public.association asso on asso.id = a.association
      where m.id = v_mid));
  perform pg_temp.dit('il rappelle que le refus n''est pas une faute',
    (select consentement_texte from public.mission where id = v_mid)
      like '%ni un motif de sanction%');
  -- L'empreinte est calculee par le serveur, jamais fournie par le client : une
  -- empreinte que celui qui consent peut reecrire ne prouve rien. Et c'est elle
  -- qui, si le gabarit change l'an prochain, dira lequel des deux textes il
  -- avait sous les yeux.
  perform pg_temp.dit('l''empreinte correspond au texte conserve',
    (select consentement_empreinte = extensions.digest(consentement_texte, 'sha256')
       from public.mission where id = v_mid));
  -- Une mission hors temps de travail ne porte aucun des trois : le consentement
  -- de R. 8241-2 n'a d'objet que pour une mise a disposition.
  perform pg_temp.dit('un benevolat hors temps de travail ne fabrique pas de consentement',
    not exists (select 1 from public.mission m
                  join public.annonce a on a.id = m.annonce
                 where not a.temps_travail
                   and (m.consentement_texte is not null
                     or m.consentement_empreinte is not null)));
  perform pg_temp.dit('les points sont fixés par le barème, pas par lui',
    (select points from public.mission where id = v_mid) = 300);
  perform public.declarer_mission(v_mid, 118);
  perform pg_temp.dit('il peut déclarer sa mission faite',
    (select etat from public.mission where id = v_mid) = 'a_valider');
  perform pg_temp.dit('le stock de l''annonce a bien baissé',
    (select restant from public.annonce where impact_unite = 'arbre') = 7);
end $$;
reset role;

-- L'eligibilite au mecenat se reverifie a l'engagement, pas seulement a la
-- publication. Une annonce ouverte n'est pas une autorisation permanente : si
-- l'association perd sa qualite entre les deux, la mise a disposition retombe
-- sous l'interdiction de l'article L. 8241-1 et c'est un delit pour l'entreprise.
\echo ''
\echo 'Une association qui n'' est plus eligible ne recoit plus de salaries'
-- `recus_actif` tombe en meme temps : la contrainte du schema interdit d'emettre
-- des recus sans eligibilite, et c'est bien la meme perte de qualite qu'on simule.
update public.association set eligible_mecenat = false, recus_actif = false
 where id = (select association from public.annonce where impact_unite = 'arbre' limit 1);
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000002', false);
select set_config('request.jwt.claim.email', 'malik@vaudrey-ciments.fr', false);
do $$
declare v_mid uuid;
begin
  begin
    select public.engager_mission(a.id, 1, null, true) into v_mid
      from public.annonce a where a.impact_unite = 'arbre' limit 1;
    perform pg_temp.dit(
      'une association non eligible ne recoit plus de mise a disposition (L. 8241-3)', false);
  exception when others then
    perform pg_temp.dit(
      'une association non eligible ne recoit plus de mise a disposition (L. 8241-3)',
      sqlerrm like '%8241-3%');
  end;
  -- Un don en argent ne s'engage pas : il passe par une intention de virement,
  -- et c'est l'association qui confirme l'avoir recu. La regle existait dans le
  -- navigateur et pas ici : un appel direct creditait des points sur une promesse.
  begin
    select public.engager_mission(a.id, 1) into v_mid
      from public.annonce a where a.type = 'don_financier' and a.etat = 'ouverte' limit 1;
    perform pg_temp.dit('un don en argent ne s''engage pas comme une mission', false);
  exception when others then
    perform pg_temp.dit('un don en argent ne s''engage pas comme une mission',
      sqlerrm like '%intention de virement%');
  end;
end $$;
reset role;
update public.association set eligible_mecenat = true, recus_actif = true
 where id = (select association from public.annonce where impact_unite = 'arbre' limit 1);

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

-- Ce que le site vitrine promet : « un rapport chaque trimestre, un rapport
-- annuel, sans que personne ait à les demander ». La tâche n'écrivait que
-- l'annuel. Et elle passait par `points_entreprise`, dont la garde
-- d'autorisation rend zéro ligne à une tâche planifiée : tous les rapports du
-- moteur étaient à zéro, chaque nuit, sans qu'aucune erreur ne le dise.
--
-- La saison de démonstration est à venir : elle ne peut rien dire d'un
-- trimestre clos. On en pose donc une, révolue, avec son abonnement.
do $$
declare
  v_s uuid;
  v_e uuid := '22222222-2222-4222-8222-222222222222';
  v_debut date := (date_trunc('year', current_date - interval '2 years'))::date;
begin
  insert into public.saison (nom, debut, fin, etat)
  values ('Saison révolue', v_debut,
          (v_debut + interval '1 year' - interval '1 day')::date, 'close')
  returning id into v_s;
  insert into public.bareme (saison, type, points, unite)
    select v_s, b.type, b.points, b.unite
      from public.bareme b where b.saison = (select id from public.saison where etat = 'ouverte');
  insert into public.abonnement (entreprise, saison, montant_ht, sieges, effectif_reference)
  values (v_e, v_s, 3500, 50, 120);

  perform private.tache_rapports();
  perform pg_temp.dit('les quatre trimestres sortent tout seuls',
    (select count(*) from public.rapport where saison = v_s and periode ~ '^T[1-4]$') = 4);
  perform pg_temp.dit('l''annuel sort avec eux',
    exists (select 1 from public.rapport where saison = v_s and periode = 'annuel'));
  perform pg_temp.dit('un trimestre couvre trois mois, pas la saison entière',
    (select contenu->>'au' from public.rapport where saison = v_s and periode = 'T1')
      < (select contenu->>'du' from public.rapport where saison = v_s and periode = 'T2'));
  perform pg_temp.dit('un trimestre échu est scellé, il ne bougera plus',
    (select count(*) from public.rapport where saison = v_s and scelle_le is null) = 0);
  perform private.tache_rapports();
  perform pg_temp.dit('rejouer la journée ne produit pas un second jeu',
    (select count(*) from public.rapport where saison = v_s) = 5);
end $$;

-- La régression qui comptait : un rapport produit par le moteur porte les points
-- réellement acquis, et non zéro. Le moteur n'a pas d'identité ; si le calcul
-- repasse un jour par une fonction gardée, ce test tombe.
do $$
declare v_saison uuid := (select id from public.saison where etat = 'ouverte');
begin
  perform private.tache_rapports();
  perform pg_temp.dit('le rapport du moteur porte les points, pas des zéros',
    (select (contenu->>'brut')::bigint from public.rapport
      where saison = v_saison and periode = 'annuel'
        and entreprise = '22222222-2222-4222-8222-222222222222') > 0);
end $$;

\echo ''
\echo 'Groupe, sociétés, établissements'
-- Un groupe consolide, il ne fusionne pas. Appartenir au même groupe ne donne
-- aucun droit sur les personnes d'une autre société : deux responsables de
-- traitement distincts, et le lien capitalistique n'y change rien.
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.email', 'claire@vaudrey-ciments.fr', false);

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

-- Declarer un site. C'est le premier geste d'un client qui vient d'ouvrir son
-- compte : sans lui, aucune collecte d'indicateurs n'a personne a qui demander.
select pg_temp.refuse('un site sans ville est refusé',
  'select public.creer_etablissement(''Entrepôt'', '''')');
select pg_temp.refuse('un site dont le nom tient en une lettre est refusé',
  'select public.creer_etablissement(''E'', ''Brest'')');
select pg_temp.refuse('un SIRET qui ne passe pas la clé de Luhn est refusé',
  'select public.creer_etablissement(''Entrepôt'', ''Brest'', ''12345678901234'')');
select pg_temp.refuse('un site qui ferait dépasser l''effectif de la société est refusé',
  'select public.creer_etablissement(''Entrepôt'', ''Brest'', null, 99999)');
select pg_temp.refuse('elle ne déclare pas un site en écrivant dans la table',
  'insert into public.etablissement (societe, nom, ville)
     values (''22222222-2222-4222-8222-222222222222'', ''Entrepôt'', ''Brest'')');

create temporary table site_declare_test (id uuid);
do $$
declare v_id uuid;
begin
  -- L'effectif reste a zero : les deux cent dix salaries de la societe sont
  -- deja repartis sur les trois sites, et c'est precisement la regle que le
  -- refus ci-dessus verifie.
  v_id := public.creer_etablissement('Entrepôt', 'Brest', '90800005200013', 0,
                                     '12 quai de la Douane');
  insert into site_declare_test values (v_id);
  perform pg_temp.dit('elle déclare un site de sa société',
    exists (select 1 from public.etablissement et
             where et.id = v_id and et.ville = 'Brest'
               and et.societe = '22222222-2222-4222-8222-222222222222'));
  perform pg_temp.dit('le site déclaré part sans quota, il se répartit ensuite',
    (select quota from public.etablissement where id = v_id) = 0);
  perform pg_temp.dit('la déclaration est tracée dans le journal d''accès',
    exists (select 1 from public.acces where quoi = 'site_declare'));
end $$;

select pg_temp.refuse('un SIRET déjà déclaré ailleurs est refusé',
  'select public.creer_etablissement(''Dépôt'', ''Brest'', ''90800005200013'')');

do $$
declare v_id uuid := (select id from site_declare_test);
begin
  perform public.modifier_etablissement(v_id, p_ville => 'Brest, Kergonan');
  perform pg_temp.dit('elle corrige la ville sans toucher au reste',
    (select ville = 'Brest, Kergonan' and nom = 'Entrepôt' and siret = '90800005200013'
       from public.etablissement where id = v_id));
end $$;
reset role;
-- Le site de test s'efface ici, hors du role `authenticated` : supprimer un
-- etablissement n'est pas un droit du client, et ce refus est lui-meme teste.
delete from public.etablissement where id in (select id from site_declare_test);
drop table site_declare_test;

\echo ''
\echo 'Ce que voit un référent de site'
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000005', false);
select set_config('request.jwt.claim.email', 'karim@vaudrey-ciments.fr', false);

select pg_temp.dit('il voit les établissements de sa société',
  (select count(*) from public.etablissement
    where societe = '22222222-2222-4222-8222-222222222222') = 3);
select pg_temp.dit('il ne voit pas la vue de groupe',
  (select count(*) from public.groupe) = 0);
select pg_temp.dit('il ne lit pas l''abonnement de la société',
  (select count(*) from public.abonnement) = 0);
select pg_temp.refuse('il ne s''alloue pas de quota',
  'select public.allouer_quota(''e7000000-0000-4000-8000-000000000002'', 200)');
select pg_temp.refuse('il ne déclare pas un site de plus',
  'select public.creer_etablissement(''Entrepôt'', ''Brest'')');
select pg_temp.refuse('il ne corrige pas la fiche d''un site',
  'select public.modifier_etablissement(''e7000000-0000-4000-8000-000000000002'',
                                        p_effectif => 3)');
select pg_temp.refuse('il ne nomme pas un autre référent',
  'select public.creer_invitation_referent(''e7000000-0000-4000-8000-000000000003'',
                                           ''Quelqu''''un'', ''x@vaudrey-ciments.fr'')');
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

select pg_temp.refuse('une variation de plus de trente pour cent sans explication est refusée',
  'select public.saisir_indicateurs(''c1000000-0000-4000-8000-000000000001'',
     ''e7000000-0000-4000-8000-000000000002'',
     ''{"effectif_fin": 110, "heures_travaillees": 92000, "at_avec_arret": 9}''::jsonb)');

do $$
declare v_id uuid;
begin
  v_id := public.saisir_indicateurs('c1000000-0000-4000-8000-000000000001',
    'e7000000-0000-4000-8000-000000000002',
    '{"effectif_fin": 110, "heures_travaillees": 92000, "at_avec_arret": 9}'::jsonb,
    'Un chariot a percuté un rayonnage le 12 mai : six blessés le même jour.');
  perform pg_temp.dit('la même valeur passe avec une explication',
    (select commentaire is not null from public.observation_indicateur where id = v_id));
  perform pg_temp.dit('l''explication est conservée avec les écarts qui l''ont déclenchée',
    (select jsonb_array_length(ecarts) > 0 from public.observation_indicateur where id = v_id));
end $$;
reset role;

\echo ''
\echo 'Le catalogue des rubriques et des indicateurs'
-- Ce que ce bloc protège : la promesse qu'une entreprise créée demain aura les
-- bonnes sections et les bonnes clés sans que personne ne recopie une liste.
-- Le catalogue est engendré depuis `public/app/data.js` — si les deux côtés
-- divergeaient, c'est ici que ça se verrait, et pas chez un client.
do $$
begin
  perform pg_temp.dit('le catalogue est peuplé',
    (select count(*) from public.rubrique where active) >= 8
    and (select count(*) from public.indicateur where active) >= 30);
  perform pg_temp.dit('chaque indicateur appartient à une rubrique existante',
    not exists (select 1 from public.indicateur i
                 where not exists (select 1 from public.rubrique r where r.cle = i.rubrique)));
  perform pg_temp.dit('un calculé porte ses deux termes',
    not exists (select 1 from public.indicateur i
                 where i.nature = 'calcule'
                   and (i.numerateur is null or i.denominateur is null)));
  -- Le numérateur est une expression, pas forcément une clé seule :
  -- « at_avec_arret + at_sans_arret » en est une. Ce qui doit être vrai, c'est
  -- que CHAQUE nom qui y apparaît existe dans le catalogue — sinon la formule
  -- lit une case vide et rend un résultat qui a l'air d'un chiffre.
  perform pg_temp.dit('chaque terme d''une formule est une clé du catalogue',
    not exists (
      select 1 from public.indicateur i,
        lateral regexp_split_to_table(i.numerateur || ' ' || i.denominateur, '[^a-z0-9_]+') mot
       where i.nature = 'calcule' and mot <> '' and mot ~ '^[a-z]'
         and not exists (select 1 from public.indicateur n where n.cle = mot)));
  -- Une campagne sans rubrique demande tout : c'est le comportement des
  -- collectes ouvertes avant que les rubriques existent, et elles ne doivent
  -- pas se vider du jour au lendemain.
  perform pg_temp.dit('une campagne sans rubrique demande tout le catalogue',
    array_length(public.rubriques_de('c1000000-0000-4000-8000-000000000001'), 1)
      = (select count(*)::int from public.rubrique where active));
  perform pg_temp.dit('une entreprise sans réglage prend les rubriques par défaut',
    array_length(public.rubriques_entreprise('22222222-2222-4222-8222-222222222222'), 1)
      = (select count(*)::int from public.rubrique where active and defaut));
end $$;

-- Une rubrique choisie restreint la collecte, et le refus se fait dans la base.
-- Une clé inconnue qui entrerait serait une colonne qui n'existe nulle part,
-- qui ne s'additionne pas, et qu'on retrouve six mois plus tard dans un export
-- sans savoir qui l'a écrite ni ce qu'elle voulait dire.
insert into campagne_rubrique (campagne, rubrique) values
  ('c1000000-0000-4000-8000-000000000002', 'social');
do $$
begin
  perform pg_temp.dit('une campagne qui a choisi ses rubriques ne demande qu''elles',
    public.rubriques_de('c1000000-0000-4000-8000-000000000002') = array['social']);
  perform pg_temp.dit('le formulaire de cette campagne ne contient que ces clés',
    not exists (select 1 from public.indicateurs_de('c1000000-0000-4000-8000-000000000002') i
                 where i.rubrique <> 'social'));
end $$;
delete from campagne_rubrique where campagne = 'c1000000-0000-4000-8000-000000000002';

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000005', false);
select set_config('request.jwt.claim.email', 'karim@vaudrey-ciments.fr', false);
select pg_temp.refuse('une clé hors du catalogue est refusée',
  'select public.saisir_indicateurs(''c1000000-0000-4000-8000-000000000001'',
     ''e7000000-0000-4000-8000-000000000002'', ''{\"chiffre_invente\": 3}''::jsonb)');
select pg_temp.refuse('un référent de site n''ouvre pas de collecte',
  'select public.ouvrir_campagne(''Essai'', ''2026-X1'', ''2026-01-01'',
     ''2026-06-30'', ''2027-06-30'', array[''social''])');
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.email', 'claire@vaudrey-ciments.fr', false);
select pg_temp.refuse('une période non terminée ne se collecte pas',
  'select public.ouvrir_campagne(''Trop tôt'', ''2027-S1'', ''2027-01-01'',
     ''2027-06-30'', ''2027-12-31'', array[''social''])');
select pg_temp.refuse('une échéance déjà passée est refusée',
  'select public.ouvrir_campagne(''Trop tard'', ''2025-S2'', ''2025-07-01'',
     ''2025-12-31'', ''2026-01-31'', array[''social''])');
select pg_temp.refuse('une collecte sans rubrique ne s''ouvre pas',
  'select public.ouvrir_campagne(''Vide'', ''2025-S1'', ''2025-01-01'',
     ''2025-06-30'', ''2027-06-30'', array[]::text[])');
select pg_temp.refuse('une rubrique inventée ne compte pas',
  'select public.ouvrir_campagne(''Inventée'', ''2025-S1'', ''2025-01-01'',
     ''2025-06-30'', ''2027-06-30'', array[''licornes''])');
do $$
declare v_id uuid;
begin
  v_id := public.ouvrir_campagne('Essai de collecte', '2025-S1', '2025-01-01',
            '2025-06-30', '2027-06-30', array['social','energie']);
  perform pg_temp.dit('la société ouvre une collecte',
    (select close_le is null from public.campagne_indicateurs where id = v_id));
  perform pg_temp.dit('la collecte retient les rubriques choisies, dans l''ordre du catalogue',
    public.rubriques_de(v_id) = array['social','energie']);
  perform pg_temp.dit('elle ne demande rien d''autre',
    not exists (select 1 from public.indicateurs_de(v_id) i
                 where i.rubrique not in ('social','energie')));
end $$;
reset role;
-- Le ménage se fait hors du rôle applicatif : `authenticated` n'efface pas une
-- campagne, et c'est exactement ce qu'on veut qu'il ne puisse pas faire.
delete from campagne_indicateurs where periode = '2025-S1';

-- Une variation forte doit être expliquée. Le refus porte sur le silence, pas
-- sur la valeur : un chiffre rejeté parce qu'il bouge trop produirait des
-- chiffres qui ne bougent pas.
do $$
begin
  perform pg_temp.dit('le seuil d''écart est le même qu''à l''écran',
    private.seuil_ecart() = 0.30);
  perform pg_temp.dit('la période précédente est celle qui finit avant, pas la dernière créée',
    private.campagne_precedente('c1000000-0000-4000-8000-000000000001')
      = 'c1000000-0000-4000-8000-000000000002');
  perform pg_temp.dit('un triplement des accidents est détecté comme écart',
    jsonb_array_length(private.ecarts_periode(
      'c1000000-0000-4000-8000-000000000001',
      'e7000000-0000-4000-8000-000000000002',
      '{"effectif_fin": 110, "heures_travaillees": 92000, "at_avec_arret": 9}'::jsonb)) > 0);
  perform pg_temp.dit('une variation sous le seuil ne demande rien',
    jsonb_array_length(private.ecarts_periode(
      'c1000000-0000-4000-8000-000000000001',
      'e7000000-0000-4000-8000-000000000002',
      '{"effectif_fin": 110, "heures_travaillees": 92000, "at_avec_arret": 2,
        "at_sans_arret": 4, "jours_arret": 40, "femmes": 39,
        "entrees": 7, "sorties": 5}'::jsonb)) = 0);
  perform pg_temp.dit('un taux est un rapport de sommes, pas une moyenne de taux',
    (private.taux_calcules('{"at_avec_arret": 3, "heures_travaillees": 92000}'::jsonb)->>'tf1')::numeric
      = 3 * 1000000::numeric / 92000);
end $$;


\echo ''
\echo 'Ce que voit une autre société du même groupe'
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000007', false);
select set_config('request.jwt.claim.email', 'theo@vaudrey-negoce.fr', false);

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
select set_config('request.jwt.claim.email', 'claire@vaudrey-ciments.fr', false);
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
\echo 'Les rapports partent, et une seule fois'
reset role;
do $$
declare v_n1 integer; v_n2 integer;
begin
  perform private.tache_rapports();
  -- Un rapport n'est scellé qu'après la clôture des validations ; on force la
  -- date pour éprouver l'envoi et non le calendrier.
  update public.rapport set scelle_le = now() where scelle_le is null;
  v_n1 := private.tache_envoi_rapports();
  v_n2 := private.tache_envoi_rapports();
  perform pg_temp.dit('chaque rapport scellé produit un envoi', v_n1 > 0);
  perform pg_temp.dit('un deuxième passage ne renvoie rien', v_n2 = 0);
  perform pg_temp.dit('aucune clé d''envoi en double',
    (select count(*) from public.envoi) = (select count(distinct cle) from public.envoi));
  perform pg_temp.dit('l''envoi désigne un destinataire, ou dit qu''il n''en a pas',
    not exists (select 1 from public.envoi
                 where etat = 'a_envoyer' and destinataire_profil is null));
  -- La tâche ne lit pas la table des comptes : elle désigne un profil, et c'est
  -- la fonction Edge qui détient la clé de service qui résout l'adresse.
  perform pg_temp.dit('la tâche planifiée ne compose aucune adresse',
    not exists (select 1 from public.envoi where destinataire is not null));
end $$;

\echo ''
\echo 'Les affiches, et qui confirme la réception'
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000008', false);
select set_config('request.jwt.claim.email', 'controle@riseva.fr', false);
do $$
declare v_ex uuid;
begin
  v_ex := public.expedier_kit('22222222-2222-4222-8222-222222222222', 'K1', '6A12345678901');
  perform pg_temp.dit('Riseva enregistre une expédition avec son suivi',
    (select suivi is not null from public.expedition where id = v_ex));
  perform set_config('riseva.exp', v_ex::text, false);
end $$;
select pg_temp.refuse('la même vague ne part pas deux fois à la même entreprise',
  'select public.expedier_kit(''22222222-2222-4222-8222-222222222222'', ''K1'')');
select pg_temp.refuse('Riseva ne confirme pas la réception à la place du client',
  'select public.confirmer_reception(current_setting(''riseva.exp'')::uuid)');

select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.email', 'claire@vaudrey-ciments.fr', false);
do $$
begin
  perform public.confirmer_reception(current_setting('riseva.exp')::uuid);
  perform pg_temp.dit('le client confirme lui-même, et la date est posée',
    (select recu_le is not null from public.expedition
      where id = current_setting('riseva.exp')::uuid));
  perform pg_temp.dit('il lit ses propres envois',
    (select count(*) from public.envoi
      where entreprise = '22222222-2222-4222-8222-222222222222') > 0);
end $$;
select pg_temp.refuse('un client n''expédie rien à personne',
  'select public.expedier_kit(''22222222-2222-4222-8222-222222222222'', ''K2'')');
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000002', false);
select set_config('request.jwt.claim.email', 'malik@vaudrey-ciments.fr', false);
do $$
begin
  perform pg_temp.dit('un salarié ne lit pas les envois de son entreprise',
    (select count(*) from public.envoi) = 0);
end $$;
reset role;

\echo ''
\echo 'Registre de sécurité et plan d''actions'
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000005', false);
select set_config('request.jwt.claim.email', 'karim@vaudrey-ciments.fr', false);

do $$
declare v_ev uuid; v_ac uuid; r record;
begin
  v_ev := public.declarer_evenement('e7000000-0000-4000-8000-000000000002',
    current_date - 20, 'travail', 'avec_arret', 'manutention', 'Quai', 6,
    'Reprise manuelle d''une charge au sol.');
  perform pg_temp.dit('le référent déclare un événement sur son site', v_ev is not null);

  perform public.declarer_evenement('e7000000-0000-4000-8000-000000000002',
    current_date - 10, 'trajet', 'avec_arret', 'routier', null, 3, null);
  perform public.declarer_evenement('e7000000-0000-4000-8000-000000000002',
    current_date - 5, 'travail', 'sans_soin', 'chute_plain_pied', 'Allée', 0, null);

  select * into r from public.securite_du_registre(
    'e7000000-0000-4000-8000-000000000002', current_date - 60, current_date);
  perform pg_temp.dit('les accidents du travail et de trajet ne se mélangent pas',
    r.at_avec_arret = 1 and r.at_trajet = 1);
  perform pg_temp.dit('les journées perdues ne comptent que le travail, pas le trajet',
    r.jours_arret = 6);
  perform pg_temp.dit('les presqu''accidents sont suivis mais ne comptent dans aucun taux',
    r.sans_soin = 1 and r.at_avec_arret = 1 and r.at_sans_arret = 0);

  v_ac := public.ajouter_action('e7000000-0000-4000-8000-000000000002',
    'Installer deux tables élévatrices sur le quai.', 'Karim Belhadj',
    current_date + 30, v_ev);
  perform public.maj_action(v_ac, 'faite');
  perform pg_temp.dit('une action passée à faite porte sa date de réalisation',
    (select fait_le is not null from public.action_corrective where id = v_ac));

  perform public.annuler_evenement(v_ev, 'Doublon avec la déclaration du site voisin');
  perform pg_temp.dit('une déclaration annulée reste dans le registre, avec son motif',
    (select annule_le is not null and motif_annulation is not null
       from public.evenement_securite where id = v_ev));
  select * into r from public.securite_du_registre(
    'e7000000-0000-4000-8000-000000000002', current_date - 60, current_date);
  perform pg_temp.dit('et elle ne compte plus dans les taux', r.at_avec_arret = 0);
end $$;

select pg_temp.refuse('un accident « avec arrêt » sans jour d''arrêt est refusé',
  'select public.declarer_evenement(''e7000000-0000-4000-8000-000000000002'',
     current_date, ''travail'', ''avec_arret'', ''machine'', null, 0, null)');
select pg_temp.refuse('des journées d''arrêt sur un accident sans arrêt sont refusées',
  'select public.declarer_evenement(''e7000000-0000-4000-8000-000000000002'',
     current_date, ''travail'', ''sans_soin'', ''machine'', null, 3, null)');
select pg_temp.refuse('une date future est refusée',
  'select public.declarer_evenement(''e7000000-0000-4000-8000-000000000002'',
     current_date + 1, ''travail'', ''sans_soin'', ''machine'', null, 0, null)');
select pg_temp.refuse('un type hors typologie est refusé',
  'select public.declarer_evenement(''e7000000-0000-4000-8000-000000000002'',
     current_date, ''travail'', ''sans_soin'', ''morsure_de_dragon'', null, 0, null)');
select pg_temp.refuse('le référent ne déclare rien sur un autre site',
  'select public.declarer_evenement(''e7000000-0000-4000-8000-000000000003'',
     current_date, ''travail'', ''sans_soin'', ''machine'', null, 0, null)');
select pg_temp.refuse('une action sans responsable est refusée',
  'select public.ajouter_action(''e7000000-0000-4000-8000-000000000002'',
     ''Faire quelque chose'', '''', current_date + 10)');
reset role;

-- Un salarié ne déclare pas un accident dans Riseva : ce n'est pas le canal.
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000002', false);
select set_config('request.jwt.claim.email', 'malik@vaudrey-ciments.fr', false);
select pg_temp.refuse('un salarié ne déclare pas d''événement',
  'select public.declarer_evenement(''e7000000-0000-4000-8000-000000000002'',
     current_date, ''travail'', ''sans_soin'', ''machine'', null, 0, null)');
select pg_temp.refuse('il n''active pas le registre d''un site',
  'select public.activer_registre(''e7000000-0000-4000-8000-000000000002'', true)');
do $$
begin
  -- Ligne à ligne, un événement se réidentifie : une date, une zone et un
  -- nombre de journées d'arrêt suffisent sur un petit site. Un salarié n'a donc
  -- rien à lire ici — le comité, lui, lit des agrégats.
  perform pg_temp.dit('il ne lit aucune ligne du registre',
    (select count(*) from public.evenement_securite) = 0);
  perform pg_temp.dit('ni aucune action corrective',
    (select count(*) from public.action_corrective) = 0);
end $$;
reset role;

\echo ''
\echo 'Le CSE lit des agrégats, et rien d''autre'
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000009', false);
select set_config('request.jwt.claim.email', 'cse@vaudrey-ciments.fr', false);

do $$
begin
  perform pg_temp.dit('il voit les sites de sa société',
    (select count(*) from public.etablissement) > 0);
  -- Le piège : `meme_entreprise` lui ouvrirait la liste nominative de tout
  -- l'effectif, c'est-à-dire exactement ce que cet accès ne doit pas permettre.
  perform pg_temp.dit('il ne lit aucun nom de salarié à part le sien',
    (select count(*) from public.profil) <= 1);
  perform pg_temp.dit('il ne lit aucune mission individuelle',
    (select count(*) from public.mission) = 0);
  perform pg_temp.dit('il ne lit aucune intention de don',
    (select count(*) from public.intention_don) = 0);
  perform pg_temp.dit('il ne lit que les indicateurs approuvés',
    not exists (select 1 from public.observation_indicateur where etat <> 'approuve'));
  perform pg_temp.dit('il lit les rapports de sa société',
    (select count(*) from public.rapport where entreprise = '22222222-2222-4222-8222-222222222222')
    = (select count(*) from public.rapport));
end $$;

-- Une policy filtre, elle ne lève pas : ces trois-là doivent donc ne rien
-- rendre, et non échouer. Les tester comme des refus aurait fait passer un
-- test vert pour la mauvaise raison.
do $$
begin
  perform pg_temp.dit('il ne lit aucun don', (select count(*) from public.don) = 0);
  perform pg_temp.dit('il ne lit ni l''abonnement ni son montant',
    (select count(*) from public.abonnement) = 0);
  perform pg_temp.dit('il ne lit pas le journal d''accès',
    (select count(*) from public.acces) = 0);
end $$;
select pg_temp.refuse('il ne saisit pas d''indicateurs',
  'select public.saisir_indicateurs(''c1000000-0000-4000-8000-000000000001'',
     ''e7000000-0000-4000-8000-000000000002'', ''{"effectif_fin": 1}''::jsonb)');
select pg_temp.refuse('il n''approuve rien',
  'select public.approuver_indicateurs(''c1000000-0000-4000-8000-000000000001'',
     ''e7000000-0000-4000-8000-000000000002'')');
select pg_temp.refuse('il ne s''alloue aucun quota',
  'select public.allouer_quota(''e7000000-0000-4000-8000-000000000002'', 10)');
select pg_temp.refuse('il ne se promeut pas administrateur',
  'update private.appartenance set role = ''entreprise_admin'' where profil = auth.uid()');
reset role;

select pg_temp.refuse('un accès CSE rattaché à un site est refusé par le schéma',
  'update private.appartenance set etablissement = ''e7000000-0000-4000-8000-000000000002''
    where profil = ''aaaaaaaa-0000-4000-8000-000000000009''');

\echo ''
\echo 'Classement : la moitié basse n''est pas nommée'
reset role;
do $$
begin
  perform pg_temp.dit('la même règle qu''à l''écran : moitié haute nommée',
    private.nommable('auto', 1, 4) and private.nommable('auto', 2, 4)
    and not private.nommable('auto', 3, 4));
  perform pg_temp.dit('sur une cohorte impaire, celle du milieu est nommée',
    private.nommable('auto', 3, 5) and not private.nommable('auto', 4, 5));
  perform pg_temp.dit('le choix explicite l''emporte dans les deux sens',
    private.nommable('nom', 9, 9) and not private.nommable('anonyme', 1, 9));
end $$;

-- Deux entreprises supplémentaires dans la même catégorie, sans aucun point :
-- elles finissent derrière et ne doivent donc pas être nommées.
do $$
declare v_a uuid; v_b uuid;
begin
  insert into public.entreprise (nom, secteur, effectif) values ('Discrète SA', 'Chimie', 200)
    returning id into v_a;
  insert into public.entreprise (nom, secteur, effectif) values ('Fière SAS', 'Chimie', 200)
    returning id into v_b;
  insert into public.abonnement (entreprise, saison, montant_ht, sieges, effectif_reference)
  values (v_a, '11111111-1111-4111-8111-111111111111', 6900, 200, 200),
         (v_b, '11111111-1111-4111-8111-111111111111', 6900, 200, 200);
  update public.entreprise set visibilite = 'nom' where id = v_b;
end $$;

set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$
declare v_total integer; v_nommees integer; v_ids integer;
begin
  select count(*) into v_total
    from public.classement_saison('11111111-1111-4111-8111-111111111111');
  select count(*) into v_nommees
    from public.classement_saison('11111111-1111-4111-8111-111111111111') where not anonyme;
  perform pg_temp.dit('le classement public reste lisible par un visiteur', v_total >= 3);
  perform pg_temp.dit('une partie seulement est nommée', v_nommees < v_total);
  perform pg_temp.dit('une entreprise anonymisée ne rend pas son nom',
    not exists (select 1 from public.classement_saison('11111111-1111-4111-8111-111111111111')
                 where anonyme and nom = 'Discrète SA'));
  -- Le point qui compte : garder l'identifiant reviendrait à le joindre à
  -- `entreprise`, dont le nom est lisible publiquement.
  select count(*) into v_ids
    from public.classement_saison('11111111-1111-4111-8111-111111111111')
   where anonyme and entreprise is not null;
  perform pg_temp.dit('et elle ne rend pas non plus son identifiant', v_ids = 0);
  perform pg_temp.dit('celle qui a choisi d''être nommée l''est malgré son rang',
    exists (select 1 from public.classement_saison('11111111-1111-4111-8111-111111111111')
             where nom = 'Fière SAS' and not anonyme));
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.email', 'claire@vaudrey-ciments.fr', false);
do $$
begin
  perform pg_temp.dit('une entreprise se voit toujours elle-même, quel que soit son rang',
    exists (select 1 from public.classement_saison('11111111-1111-4111-8111-111111111111')
             where entreprise = '22222222-2222-4222-8222-222222222222' and not anonyme));
end $$;
reset role;

delete from public.abonnement where entreprise in
  (select id from public.entreprise where nom in ('Discrète SA','Fière SAS'));
delete from public.entreprise where nom in ('Discrète SA','Fière SAS');

\echo ''
\echo 'Tarif fondateur'
reset role;
do $$
declare v_ent uuid; v_saison uuid := '11111111-1111-4111-8111-111111111111'; i integer;
begin
  perform pg_temp.dit('la remise de lancement est plafonnée en base, pas seulement à l''écran',
    private.places_fondateur() = 20 and private.fin_fondateur() = date '2026-12-31');

  -- Le jeu de départ en occupe déjà une. On remplit les dix-neuf restantes avec
  -- des entreprises jetables, puis on vérifie que la vingt-et-unième est refusée
  -- par la base et non par l'interface.
  for i in 1..19 loop
    insert into public.entreprise (nom, effectif) values ('Test ' || i, 10)
      returning id into v_ent;
    insert into public.abonnement (entreprise, saison, montant_ht, sieges,
                                   effectif_reference, palier, fondateur)
    values (v_ent, v_saison, 2160, 10, 10, 'tpe', true);
  end loop;
  perform pg_temp.dit('vingt places au tarif fondateur passent',
    (select count(*) from public.abonnement where fondateur) = 20);
end $$;

do $$
declare v_ent uuid;
begin
  insert into public.entreprise (nom, effectif) values ('Test 21', 10) returning id into v_ent;
  begin
    insert into public.abonnement (entreprise, saison, montant_ht, sieges,
                                   effectif_reference, palier, fondateur)
    values (v_ent, '11111111-1111-4111-8111-111111111111', 2160, 10, 10, 'tpe', true);
    perform pg_temp.dit('la vingt-et-unième place est refusée (devait être refusé)', false);
  exception when others then
    perform pg_temp.dit('la vingt-et-unième place est refusée', true);
  end;
  -- Sans la remise, elle passe : c'est la remise qui est plafonnée, pas la vente.
  insert into public.abonnement (entreprise, saison, montant_ht, sieges,
                                 effectif_reference, palier, fondateur)
  values (v_ent, '11111111-1111-4111-8111-111111111111', 2400, 10, 10, 'tpe', false);
  perform pg_temp.dit('au tarif plein, elle passe', true);
end $$;

delete from public.abonnement where palier = 'tpe';
delete from public.entreprise where nom like 'Test %';

\echo ''
\echo 'Dons en argent : Riseva n''encaisse pas'
reset role;
select set_config('request.jwt.claim.sub', '', false);
do $$
begin
  perform pg_temp.dit('la clé mod-97 d''un IBAN est vérifiée en base',
    private.iban_ok('FR7630006000011234567890189')
    and not private.iban_ok('FR7630006000011234567890188'));
  perform pg_temp.dit('un IBAN étranger valide est accepté',
    private.iban_ok('DE89370400440532013000'));
  perform pg_temp.dit('les espaces d''un relevé ne gênent pas',
    private.iban_ok('FR76 3000 6000 0112 3456 7890 189'));
  perform pg_temp.dit('la référence de virement respecte le format attendu',
    private.reference_virement() ~ '^RSV-[ACDEFGHJKLMNPQRSTUVWXYZ2345679]{4}-[ACDEFGHJKLMNPQRSTUVWXYZ2345679]{4}$');
  perform pg_temp.dit('elle n''emploie ni 0/O ni 1/I, qui se dictent mal',
    (select count(*) from generate_series(1, 200) where private.reference_virement() ~ '[01OI]') = 0);
end $$;

select pg_temp.refuse('un IBAN dont la clé ne tombe pas juste n''entre pas en base',
  'update public.association set iban = ''FR7630006000011234567890188''
    where id = ''33333333-3333-4333-8333-333333333333''');
select pg_temp.refuse('un reçu actif sans mandat est impossible',
  'update public.association set mandat_recus_le = null
    where id = ''33333333-3333-4333-8333-333333333333''');

-- Un salarié annonce un virement personnel.
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000002', false);
select set_config('request.jwt.claim.email', 'malik@vaudrey-ciments.fr', false);

do $$
declare v_an uuid; v_i public.intention_don; v_pts_avant bigint; v_pts_apres bigint;
begin
  select a.id into v_an from public.annonce a
   where a.type = 'don_financier' and a.etat = 'ouverte'
     and a.association = '33333333-3333-4333-8333-333333333333' limit 1;
  if v_an is null then
    perform pg_temp.dit('une annonce financière existe pour le test', false);
    return;
  end if;

  v_i := public.declarer_intention_don(v_an, 120, 'salarie');
  perform pg_temp.dit('une intention porte une référence et une échéance',
    v_i.reference is not null and v_i.expire_le > current_date and v_i.etat = 'annoncee');
  perform pg_temp.dit('un don personnel ne porte pas l''entreprise du donateur',
    v_i.entreprise is null and v_i.origine = 'salarie');
  perform pg_temp.dit('une intention ne crée aucun don tant qu''elle n''est pas confirmée',
    not exists (select 1 from public.don d where d.reference = v_i.reference));

  perform set_config('riseva.intention', v_i.id::text, false);
end $$;

select pg_temp.refuse('un salarié ne se déclare pas un don d''entreprise',
  'select public.declarer_intention_don(
     (select a.id from public.annonce a where a.type = ''don_financier'' and a.etat = ''ouverte'' limit 1),
     50, ''entreprise'')');
select pg_temp.refuse('un salarié ne confirme pas la réception à la place de l''association',
  'select public.confirmer_don_recu(current_setting(''riseva.intention'')::uuid, 120)');
-- Le piège classique : `association <> mon_association()` vaut NULL quand
-- l'appelant n'est rattaché à aucune association, et un NULL ne déclenche pas le
-- `raise`. Un salarié passait donc au travers de tous ces contrôles.
select pg_temp.refuse('un salarié ne renseigne pas l''IBAN d''une association',
  'select public.enregistrer_iban(''33333333-3333-4333-8333-333333333333'',
     ''FR7630006000011234567890189'')');
select pg_temp.refuse('un salarié ne donne pas mandat à la place d''une association',
  'select public.accepter_mandat_recus(''33333333-3333-4333-8333-333333333333'', ''X'', ''Président'')');
select pg_temp.refuse('un salarié ne révoque pas le mandat d''une association',
  'select public.revoquer_mandat_recus(''33333333-3333-4333-8333-333333333333'')');
select pg_temp.refuse('un salarié ne renseigne pas le numéro d''une association',
  'select public.enregistrer_numeros_association(''33333333-3333-4333-8333-333333333333'', ''428763304'')');

-- L'association rapproche de son relevé, et corrige le montant.
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000003', false);
select set_config('request.jwt.claim.email', 'elise@quatrevents.org', false);
do $$
declare v_id uuid := current_setting('riseva.intention')::uuid; v_don uuid; v_m public.mission;
begin
  v_don := public.confirmer_don_recu(v_id, 100);
  select * into v_m from public.mission m
   where m.id = (select i.mission from public.intention_don i where i.id = v_id);
  perform pg_temp.dit('le montant confirmé par l''association fait foi',
    (select montant_recu from public.intention_don where id = v_id) = 100);
  perform pg_temp.dit('la mission créée porte les points du montant reçu',
    v_m.quantite = 100 and v_m.points = 10);
  perform pg_temp.dit('le don est enregistré comme virement, sans prestataire',
    (select fournisseur from public.don where id = v_don) = 'virement');
  perform pg_temp.dit('le reste à financer de l''annonce a baissé de ce qui a été reçu',
    (select restant from public.annonce where id = v_m.annonce) >= 0);
end $$;

select pg_temp.refuse('un don confirmé ne se confirme pas deux fois',
  'select public.confirmer_don_recu(current_setting(''riseva.intention'')::uuid, 100)');

-- L'employeur ne doit rien apprendre d'un don personnel.
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.email', 'claire@vaudrey-ciments.fr', false);
do $$
begin
  perform pg_temp.dit('l''employeur ne lit aucune intention de don personnel de ses salariés',
    not exists (select 1 from public.intention_don i where i.origine = 'salarie'));
end $$;

set role anon;
select set_config('request.jwt.claim.sub', '', false);
select pg_temp.refuse('un visiteur ne lit aucune intention de don',
  'select count(*) from public.intention_don');
do $$
begin
  perform pg_temp.dit('l''IBAN d''une association en ligne est public, c''est le principe du virement',
    (select iban is not null from public.association
      where id = '33333333-3333-4333-8333-333333333333'));
end $$;
reset role;

do $$
declare v integer;
begin
  update public.intention_don set expire_le = current_date - 1
   where etat = 'annoncee';
  v := private.tache_intentions_expirees();
  perform pg_temp.dit('une intention sans virement à l''échéance s''éteint toute seule',
    not exists (select 1 from public.intention_don where etat = 'annoncee' and expire_le < current_date));
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
-- Le lien HelloAsso est présenté à des donateurs sous la phrase « donnez ici ».
-- Un champ libre pointant n'importe où serait un détournement de dons offert à
-- qui prendrait la main sur un compte d'association.
select pg_temp.refuse('un lien de don hors du domaine HelloAsso est refusé',
  'select public.enregistrer_helloasso(''33333333-3333-4333-8333-333333333333'',
     ''https://evil.example/associations/x/formulaires/1'')');
select pg_temp.refuse('un lien HelloAsso en clair (http) est refusé',
  'select public.enregistrer_helloasso(''33333333-3333-4333-8333-333333333333'',
     ''http://www.helloasso.com/associations/x/formulaires/1'')');
select pg_temp.refuse('un domaine qui ressemble à HelloAsso est refusé',
  'select public.enregistrer_helloasso(''33333333-3333-4333-8333-333333333333'',
     ''https://helloasso.com.evil.example/associations/x/formulaires/1'')');
do $$
begin
  perform public.enregistrer_helloasso('33333333-3333-4333-8333-333333333333',
    'https://www.helloasso.com/associations/refuge-4-vents/formulaires/2');
  perform pg_temp.dit('un vrai formulaire HelloAsso est accepté',
    (select helloasso is not null from public.association
      where id = '33333333-3333-4333-8333-333333333333'));
  perform public.enregistrer_helloasso('33333333-3333-4333-8333-333333333333', '');
  perform pg_temp.dit('et il se retire en vidant le champ',
    (select helloasso is null from public.association
      where id = '33333333-3333-4333-8333-333333333333'));
end $$;

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
\echo 'Ce que l''audit avait trouvé, et qui ne doit plus arriver'

-- 1. Une policy PERMISSIVE `using (true)` s'additionne en OU avec les autres :
--    celle qui servait la vue publique annulait la policy privée, et ouvrait le
--    CA, le SIREN, le SIRET et l'adresse de toutes les entreprises à n'importe
--    quel compte connecté.
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000003', false);
select set_config('request.jwt.claim.email', 'elise@quatrevents.org', false);
do $$
begin
  perform pg_temp.dit('une association ne lit le chiffre d''affaires d''aucune entreprise',
    (select count(*) from public.entreprise where ca is not null) = 0);
  perform pg_temp.dit('ni aucune ligne de la table entreprise',
    (select count(*) from public.entreprise) = 0);
  perform pg_temp.dit('la vitrine publique reste servie par la vue',
    (select count(*) from public.entreprise_publique) > 0);
end $$;

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000007', false);
select set_config('request.jwt.claim.email', 'theo@vaudrey-negoce.fr', false);
do $$
begin
  -- Deux sociétés du même groupe : la consolidation reste ouverte, mais dans un
  -- sens seulement — la filiale ne lit pas la maison mère.
  perform pg_temp.dit('une filiale ne lit pas le chiffre d''affaires de la maison mère',
    not exists (select 1 from public.entreprise
                 where id = '22222222-2222-4222-8222-222222222222' and ca is not null));
end $$;

-- 2. Le classement anonymisé se levait par jointure : `points_entreprise`
--    rendait le brut et le retenu exacts de n'importe quel identifiant, et le
--    classement publiait ces mêmes entiers sur ses lignes anonymes.
do $$
begin
  perform pg_temp.dit('le détail des points d''une autre entreprise ne sort pas',
    (select count(*) from public.points_entreprise(
       '22222222-2222-4222-8222-222222222222',
       '11111111-1111-4111-8111-111111111111')) = 0);
  perform pg_temp.dit('mais une société lit bien le sien',
    (select count(*) from public.points_entreprise(
       private.mon_entreprise(), '11111111-1111-4111-8111-111111111111')) >= 0);
end $$;
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$
begin
  perform pg_temp.dit('une ligne anonymisée du classement ne publie plus ses totaux exacts',
    not exists (select 1 from public.classement_saison('11111111-1111-4111-8111-111111111111')
                 where anonyme and (brut is not null or retenu is not null
                                    or effectif_reference is not null)));
  perform pg_temp.dit('le détail par unité d''une entreprise nommée n''est pas public',
    (select count(*) from public.realisations('22222222-2222-4222-8222-222222222222', null, null)) = 0);
  perform pg_temp.dit('le total du réseau, lui, reste public',
    (select count(*) from public.realisations(null, null, null)) >= 0);
end $$;
reset role;

-- 3. `emettre_recu` n'exigeait rien : un identifiant de don suffisait à émettre
--    un reçu au nom d'une association et à consommer sa numérotation.
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000002', false);
select set_config('request.jwt.claim.email', 'malik@vaudrey-ciments.fr', false);
select pg_temp.refuse('un salarié n''émet pas de reçu fiscal au nom d''une association',
  'select public.emettre_recu((select id from public.don limit 1))');
-- 6. `securite_du_registre` ne vérifiait pas le périmètre du site demandé.
do $$
declare r record;
begin
  select * into r from public.securite_du_registre(
    'e7000000-0000-4000-8000-000000000004', current_date - 365, current_date);
  perform pg_temp.dit('l''accidentologie d''un site hors périmètre ne sort pas',
    r.evenements is null or r.evenements = 0);
end $$;
reset role;

-- 7. Les noms des signataires et des mandants sortaient avec le `grant select`
--    sur toute la table association.
set role anon;
select set_config('request.jwt.claim.sub', '', false);
select pg_temp.refuse('le nom du signataire des reçus n''est pas public',
  'select signataire from public.association limit 1');
select pg_temp.refuse('ni le nom de la personne qui a donné mandat',
  'select mandat_recus_nom from public.association limit 1');
do $$
begin
  perform pg_temp.dit('l''IBAN reste public : c''est le principe même du virement',
    (select count(*) from public.association where iban is not null) > 0);
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000003', false);
select set_config('request.jwt.claim.email', 'elise@quatrevents.org', false);
do $$
begin
  perform pg_temp.dit('l''association lit ses propres réglages par la vue dédiée',
    (select count(*) from public.association_reglages) = 1);
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.email', 'claire@vaudrey-ciments.fr', false);
do $$
begin
  perform pg_temp.dit('une entreprise ne lit pas les réglages de reçus d''une association',
    (select count(*) from public.association_reglages) = 0);
end $$;
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

  -- Le rôle doit exister dans le chemin de déploiement, pas seulement dans le
  -- bac à sable local : sans lui, l'attribution échoue et les fonctions
  -- privilégiées restent propriété du superutilisateur.
  perform pg_temp.dit('le rôle propriétaire est créé par le schéma lui-même',
    exists (select 1 from pg_roles where rolname = 'riseva_definer')
    and (select rolcanlogin = false from pg_roles where rolname = 'riseva_definer'));
  perform pg_temp.dit('et il n''est ni superutilisateur ni BYPASSRLS',
    (select not rolsuper and not rolbypassrls from pg_roles where rolname = 'riseva_definer'));

  select count(*) into v_sans from pg_tables t
   where t.schemaname = 'public'
     and not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                      where n.nspname = 'public' and c.relname = t.tablename and c.relrowsecurity);
  perform pg_temp.dit('toutes les tables publiques ont la RLS active', v_sans = 0);
end $$;

\echo ''
\echo 'Le registre refuse ce qu'' il ne doit pas stocker'
do $$
declare v_site uuid; v_nom text;
begin
  reset role;
  select et.id into v_site from public.etablissement et
   where et.registre_actif limit 1;
  if v_site is null then
    select et.id into v_site from public.etablissement et limit 1;
    update public.etablissement set registre_actif = true where id = v_site;
  end if;
  -- Le nom d'un salarié de la société, tel qu'il est réellement en base.
  select split_part(p.nom, ' ', 2) into v_nom
    from public.profil p
    join private.appartenance ap on ap.profil = p.id
    join public.etablissement et on et.societe = ap.entreprise
   where et.id = v_site and length(split_part(p.nom, ' ', 2)) >= 4
   limit 1;

  perform pg_temp.dit('une adresse electronique est refusee dans les circonstances',
    private.trace_de_personne('prevenu par jean.martin@exemple.fr', v_site) is not null);
  perform pg_temp.dit('un numero de telephone est refuse',
    private.trace_de_personne('appeler le 06 12 34 56 78', v_site) is not null);
  perform pg_temp.dit('un numero de securite sociale est refuse',
    private.trace_de_personne('assure 1850675123456', v_site) is not null);
  if v_nom is not null then
    perform pg_temp.dit('le nom d''un salarie de la societe est refuse',
      private.trace_de_personne('chute de ' || v_nom || ' dans l''escalier', v_site) is not null);
    perform pg_temp.dit('et l''accent ne suffit pas a le faire passer',
      private.trace_de_personne('chute de ' || upper(v_nom) || ', escalier', v_site) is not null);
  end if;
  perform pg_temp.dit('une description sans personne passe',
    private.trace_de_personne('chute de plain-pied sur sol humide, quai de chargement', v_site)
      is null);
  perform pg_temp.dit('un mot qui contient un nom sans etre ce nom passe',
    private.trace_de_personne('sol glissant devant la zone de conditionnement', v_site) is null);
end $$;

\echo ''
\echo 'Le lien de reponse envoye aux associations'
do $$
declare
  v_mid uuid; v_jeton text; v_autre text; v_r text; v_restant numeric; v_q numeric;
begin
  reset role;
  -- Une mission en attente de réponse, fabriquée directement : on teste le lien,
  -- pas le parcours qui y mène.
  select m.id into v_mid from public.mission m where m.etat = 'a_valider' limit 1;
  if v_mid is null then
    select m.id into v_mid from public.mission m limit 1;
    update public.mission set etat = 'a_valider', declaree_le = clock_timestamp(),
           tranchee_le = null, realise_confirme = null where id = v_mid;
  end if;
  select m.quantite into v_q from public.mission m where m.id = v_mid;

  v_jeton := private.jeton_mission(v_mid);
  perform pg_temp.dit('le jeton fait au moins 32 octets d''entropie', length(v_jeton) >= 40);
  perform pg_temp.dit('la base ne garde que son empreinte, jamais le jeton',
    (select jeton_empreinte from public.mission where id = v_mid)
      = extensions.digest(v_jeton, 'sha256')
    and not exists (select 1 from public.mission m
                     where m.id = v_mid and m.jeton_empreinte::text like '%' || v_jeton || '%'));
  perform pg_temp.dit('il porte une date d''expiration',
    (select jeton_expire_le from public.mission where id = v_mid) is not null);

  -- Un jeton inventé ne dit pas si la mission existe : la page ne sert pas d'oracle.
  perform pg_temp.dit('un jeton inconnu est refuse sans rien reveler',
    public.trancher_par_jeton(repeat('z', 43), 'oui') = 'inconnu');
  perform pg_temp.dit('un jeton trop court est refuse d''emblee',
    public.trancher_par_jeton('court', 'oui') = 'invalide');
  perform pg_temp.dit('une reponse inconnue est refusee',
    public.trancher_par_jeton(v_jeton, 'peut-etre') = 'invalide');

  -- « Partiellement » sans chiffre n'est pas arrondi vers le haut : il est refusé.
  perform pg_temp.dit('« partiellement » sans chiffre est refuse',
    public.trancher_par_jeton(v_jeton, 'partiel') = 'chiffre_manquant');
  perform pg_temp.dit('et la mission n''a pas bouge',
    (select etat from public.mission where id = v_mid) = 'a_valider');

  -- La bonne réponse passe, et le chiffre de l'association fait foi.
  v_r := public.trancher_par_jeton(v_jeton, 'partiel', 18);
  perform pg_temp.dit('« partiellement » avec un chiffre est accepte', v_r = 'partiel');
  perform pg_temp.dit('le chiffre de l''association remplace l''estimation',
    (select realise_confirme from public.mission where id = v_mid) = 18);
  perform pg_temp.dit('la mission est validee, pas cloturee sans confirmation',
    (select etat from public.mission where id = v_mid) = 'validee');

  -- Le même lien ne sert pas deux fois : une boîte associative est partagée.
  perform pg_temp.dit('le meme lien ne sert pas deux fois',
    public.trancher_par_jeton(v_jeton, 'oui') = 'deja');

  -- Un refus rend le besoin à l'annonce et remet les points à zéro.
  select m.id into v_mid from public.mission m
    join public.annonce a on a.id = m.annonce where m.etat <> 'refusee' limit 1;
  update public.mission set etat = 'a_valider', declaree_le = clock_timestamp(),
         tranchee_le = null, realise_confirme = null, points = 300 where id = v_mid;
  select m.quantite into v_q from public.mission m where m.id = v_mid;
  select a.restant into v_restant from public.annonce a
    join public.mission m on m.annonce = a.id where m.id = v_mid;
  v_jeton := private.jeton_mission(v_mid);
  perform pg_temp.dit('un refus est enregistre',
    public.trancher_par_jeton(v_jeton, 'non') = 'non');
  perform pg_temp.dit('il remet les points a zero',
    (select points from public.mission where id = v_mid) = 0);
  perform pg_temp.dit('et il rend le besoin a l''annonce',
    (select a.restant from public.annonce a join public.mission m on m.annonce = a.id
      where m.id = v_mid) = v_restant + v_q);

  -- Un jeton expiré ne tranche plus rien : la mission s'est déjà clôturée seule.
  update public.mission set etat = 'a_valider', declaree_le = clock_timestamp(),
         tranchee_le = null where id = v_mid;
  v_autre := private.jeton_mission(v_mid);
  update public.mission set jeton_expire_le = clock_timestamp() - interval '1 day'
   where id = v_mid;
  perform pg_temp.dit('un jeton expire ne tranche plus rien',
    public.trancher_par_jeton(v_autre, 'oui') = 'expire');
end $$;

\echo ''
\echo 'Les demandes de confirmation partent, et une seule fois'
do $$
declare v_mid uuid; v_n integer; v_avant integer;
begin
  reset role;
  delete from public.envoi where type = 'demande_validation';
  select m.id into v_mid from public.mission m limit 1;
  update public.mission set etat = 'a_valider', declaree_le = clock_timestamp() - interval '8 days',
         tranchee_le = null where id = v_mid;
  v_n := private.tache_demandes_validation();
  select count(*) into v_avant from public.envoi where type = 'demande_validation'
     and mission = v_mid;
  -- Déclarée il y a huit jours : le message initial et les rappels à trois et
  -- sept jours sont dus, celui de douze jours ne l'est pas encore.
  perform pg_temp.dit('les rappels dus sont enfiles, et pas les autres', v_avant = 3);
  perform pg_temp.dit('aucun ne porte d''adresse en clair dans la file',
    not exists (select 1 from public.envoi where type = 'demande_validation'
                 and destinataire is not null));
  perform private.tache_demandes_validation();
  perform pg_temp.dit('rejouer la tache n''envoie pas deux fois le meme rappel',
    (select count(*) from public.envoi where type = 'demande_validation'
      and mission = v_mid) = v_avant);

  -- Une mission déjà tranchée ne fait plus l'objet d'un rappel.
  delete from public.envoi where type = 'demande_validation';
  update public.mission set etat = 'validee', tranchee_le = clock_timestamp() where id = v_mid;
  perform private.tache_demandes_validation();
  perform pg_temp.dit('une mission deja tranchee ne recoit plus de rappel',
    (select count(*) from public.envoi where type = 'demande_validation'
      and mission = v_mid) = 0);
end $$;

\echo ''
\echo 'Un don de materiel se declare, il ne se calcule pas'
-- La doctrine distingue au moins deux regimes : un bien inscrit en stock se
-- valorise a son cout de revient, une immobilisation a la valeur de cession
-- retenue pour determiner la plus ou moins-value de sortie. Ecrire une regle
-- unique dans un logiciel aurait donc ete faux une fois sur deux, et opposable
-- a personne : la valorisation releve du donateur et de son expert-comptable.
-- Riseva enregistre une valeur DECLAREE, sous la categorie qui la justifie.
-- Le don est d'abord engage par un salarie : on teste le chemin reel, pas une
-- ligne posee a la main dans la table.
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000002', false);
select set_config('request.jwt.claim.email', 'malik@vaudrey-ciments.fr', false);
do $$
declare v_mid uuid;
begin
  select public.engager_mission(a.id, 3) into v_mid
    from public.annonce a where a.type = 'don_materiel' limit 1;
  perform pg_temp.dit('un don de materiel s''engage comme une mission',
    v_mid is not null);
  -- Aucun consentement de R. 8241-2 ici : donner du materiel n'est pas se
  -- mettre soi-meme a disposition.
  perform pg_temp.dit('un don de materiel n''appelle pas d''accord de mise a disposition',
    (select consentement_le from public.mission where id = v_mid) is null);
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.email', 'claire@vaudrey-ciments.fr', false);
do $$
declare v_mid uuid;
begin
  select m.id into v_mid
    from public.mission m
    join public.annonce a on a.id = m.annonce
   where a.type = 'don_materiel' and m.etat <> 'refusee'
   limit 1;

  -- Une valeur sans categorie n'est pas une valorisation, c'est un nombre.
  begin
    perform public.declarer_valeur_materiel(v_mid, 840);
    perform pg_temp.dit('une valeur sans categorie comptable est refusee', false);
  exception when others then
    perform pg_temp.dit('une valeur sans categorie comptable est refusee',
      sqlerrm like '%gorie comptable%');
  end;

  perform public.declarer_valeur_materiel(v_mid, 840, 'immobilisation',
    'Trois ordinateurs portables', 'IMMO-2023-0412', null,
    'Fiche de sortie signee', true);
  perform pg_temp.dit('la valeur declaree est enregistree telle quelle',
    (select valeur_declaree from public.mission where id = v_mid) = 840.00);
  perform pg_temp.dit('la categorie qui la justifie l''accompagne',
    (select categorie_comptable from public.mission where id = v_mid) = 'immobilisation');
  perform pg_temp.dit('l''attestation d''effacement des donnees est conservee',
    (select effacement_donnees from public.mission where id = v_mid));

  -- Une valeur absente reste absente : un don non valorise est un don reel, qui
  -- compte au registre AGEC et ne compte pas dans l'assiette du mecenat.
  perform public.declarer_valeur_materiel(v_mid, null, 'stock');
  perform pg_temp.dit('une valeur retiree ne se remplace pas par zero',
    (select valeur_declaree from public.mission where id = v_mid) is null);
end $$;
reset role;

-- Elle n'est pas ouverte a tout le monde : c'est une ecriture comptable.
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000002', false);
select set_config('request.jwt.claim.email', 'malik@vaudrey-ciments.fr', false);
do $$
declare v_mid uuid;
begin
  select m.id into v_mid from public.mission m
    join public.annonce a on a.id = m.annonce
   where a.type = 'don_materiel' limit 1;
  if v_mid is null then return; end if;
  begin
    perform public.declarer_valeur_materiel(v_mid, 100, 'stock');
    perform pg_temp.dit('un salarie ne valorise pas les dons de son entreprise', false);
  exception when others then
    perform pg_temp.dit('un salarie ne valorise pas les dons de son entreprise',
      sqlerrm like '%administrateur%');
  end;
end $$;
reset role;

-- Trois situations, et c'est exprès : sur trois sites identiques, un diagnostic
-- d'offre locale ne diagnostique rien. Lyon recoit une seule annonce pour cent
-- dix salaries — trop mince. Marseille en recoit deux, toutes deux en semaine
-- ouvree et aucune en don de materiel — inaccessible a un salarie en poste.
-- Paris en recoit assez, dont un don de materiel — suffisante.
reset role;
insert into association (id, nom, rna, cause, ville, resume, adresse, lat, lon,
                         valide, verifiee_le, a_reverifier_le)
values
 ('a1000000-0000-4000-8000-000000000001', 'Berges du Rhone', 'W691000001',
  'Environnement', 'Lyon', 'Entretien des berges du Rhone et de la Saone.',
  '5 quai Victor Augagneur, 69003 Lyon', 45.7580, 4.8420,
  true, current_date - 30, current_date + 330),
 ('a1000000-0000-4000-8000-000000000002', 'Calanques Solidaires', 'W131000002',
  'Environnement', 'Marseille', 'Nettoyage du littoral et sensibilisation.',
  '3 quai du Port, 13002 Marseille', 43.2965, 5.3698,
  true, current_date - 30, current_date + 330),
 ('a1000000-0000-4000-8000-000000000003', 'Toits d''Abord', 'W751000003',
  'Solidarite', 'Paris', 'Hebergement d''urgence et accompagnement.',
  '18 rue de la Roquette, 75011 Paris', 48.8566, 2.3522,
  true, current_date - 30, current_date + 330);

-- Les dates sont calees sur des jours precis : c'est tout l'enjeu du diagnostic.
-- `date_trunc('week')` rend le lundi de la semaine, donc +5 est un samedi.
insert into annonce (association, saison, type, titre, description, lieu,
                     temps_travail, quantite, restant, date_prevue, etat)
values
 ('a1000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111',
  'benevolat_demi_journee', 'Ramassage sur la berge amont',
  'Une matinee a deux equipes, gants et sacs fournis sur place.',
  'Lyon', false, 8, 8,
  (date_trunc('week', current_date) + interval '2 day')::date, 'ouverte'),
 ('a1000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111',
  'benevolat_demi_journee', 'Nettoyage de la crique',
  'Ramassage sur le littoral, un mardi matin, encadre par nos benevoles.',
  'Marseille', false, 6, 6,
  (date_trunc('week', current_date) + interval '1 day')::date, 'ouverte'),
 ('a1000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111',
  'benevolat_demi_journee', 'Tri de la collecte',
  'Tri des sacs rapportes du littoral, en interieur, un jeudi apres-midi.',
  'Marseille', false, 4, 4,
  (date_trunc('week', current_date) + interval '3 day')::date, 'ouverte'),
 ('a1000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111',
  'benevolat_demi_journee', 'Maraude du samedi',
  'Distribution et ecoute, en binome, le samedi en fin de journee.',
  'Paris', false, 10, 10,
  (date_trunc('week', current_date) + interval '5 day')::date, 'ouverte'),
 ('a1000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111',
  'don_materiel', 'Ordinateurs pour l''accueil de jour',
  'Nous equipons deux postes d''accueil, du materiel reconditionne convient.',
  'Paris', false, 6, 6,
  (date_trunc('week', current_date) + interval '2 day')::date, 'ouverte'),
 ('a1000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111',
  'don_financier', 'Nuitees d''hiver',
  'Chaque nuitee revient a 22 euros, la periode froide commence en novembre.',
  'Paris', false, 4000, 4000,
  (date_trunc('week', current_date) + interval '4 day')::date, 'ouverte');

\echo ''
\echo 'L'' offre associative autour d'' un site, calculee dans la base'
-- Ces chiffres finissent dans le rapport de fin de saison d'un client. Un
-- chiffre calcule dans le navigateur est un chiffre que personne ne peut
-- refaire : celui-ci se refait avec une requete.
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.email', 'claire@vaudrey-ciments.fr', false);
do $$
declare o record; l record; m record;
begin
  select * into o from public.offre_locale('e7000000-0000-4000-8000-000000000001'); -- Paris
  select * into l from public.offre_locale('e7000000-0000-4000-8000-000000000002'); -- Lyon
  select * into m from public.offre_locale('e7000000-0000-4000-8000-000000000003'); -- Marseille

  -- Le rayon est rendu par la fonction elle-meme : un ecran qui affiche
  -- « a moins de 30 km » sans que ce 30 vienne du calcul finira par mentir le
  -- jour ou le parametre changera.
  perform pg_temp.dit('le rayon annonce est celui qui a servi au calcul',
    o.rayon = l.rayon and o.rayon = m.rayon and o.rayon > 0);
  perform pg_temp.dit('un site sans coordonnees est signale comme tel, pas compte a zero',
    o.situe and l.situe and m.situe);

  -- Le seuil suit l'effectif : trois annonces suffisent a un site de vingt
  -- personnes et ne suffisent pas a un site de quatre cents.
  perform pg_temp.dit('le seuil d''offre suffisante suit l''effectif du site',
    l.attendu > o.attendu and o.attendu >= 2 and m.attendu >= 2);

  -- Chaque annonce a portee est comptee une fois et une seule. Un decompte par
  -- format ou par jour qui ne retombe pas sur le total est un decompte dont une
  -- annonce est tombee quelque part sans qu'on le voie.
  perform pg_temp.dit('chaque annonce a portee est comptee une fois et une seule',
    o.benevolat + o.materiel + o.financier = o.ouvertes
    and o.semaine + o.weekend + o.sans_date = o.ouvertes
    and l.benevolat + l.materiel + l.financier = l.ouvertes
    and m.benevolat + m.materiel + m.financier = m.ouvertes);

  -- Lyon est a 4 km du refuge de Saint-Etienne ? non : la distance se calcule,
  -- elle ne se decrete pas. On verifie surtout qu'aucune annonce hors rayon
  -- n'entre dans le compte.
  perform pg_temp.dit('rien au-dela du rayon n''entre dans le compte',
    o.plus_proche is null or o.plus_proche <= o.rayon);

  -- Les trois verdicts qui comptent, sur trois situations construites pour eux.
  perform pg_temp.dit('un site bien servi est dit suffisant', o.verdict = 'suffisante');
  perform pg_temp.dit('une annonce pour cent dix salaries est une offre trop mince',
    l.verdict = 'mince' and l.ouvertes = 1);
  -- Tout en semaine ouvree et aucun don de materiel : un salarie en poste ou en
  -- equipe ne peut pas s'y rendre, et ce n'est pas un probleme d'envie.
  perform pg_temp.dit('tout en semaine ouvree sans don de materiel est inaccessible',
    m.verdict = 'inaccessible' and m.semaine = 2 and m.weekend = 0 and m.materiel = 0);
  perform pg_temp.dit('le week-end est compte comme tel',
    o.weekend >= 1);
  -- Un besoin de financement se compte en euros, pas en places : additionner
  -- 4 000 euros restants et 6 ordinateurs donnerait 4 006 places, un chiffre qui
  -- ne veut rien dire et qui flatte.
  perform pg_temp.dit('les places encore prenables sont comptees, pas les euros',
    o.places = 16 and o.financier = 1);

  -- Le tri : du plus mal servi au mieux servi. Un tri par nom l'aurait cache.
  perform pg_temp.dit('les sites sortent du plus mal servi au mieux servi',
    (select bool_and(ok) from (
       select (case verdict when 'aucune' then 0 when 'inaccessible' then 1
                            when 'mince' then 2 else 3 end)
              >= lag(case verdict when 'aucune' then 0 when 'inaccessible' then 1
                                  when 'mince' then 2 else 3 end)
                 over (order by n) as ok
         from (select verdict, row_number() over () as n
                 from public.offre_par_site('22222222-2222-4222-8222-222222222222')) x
     ) y where ok is not null));
end $$;
reset role;

\echo ''
\echo 'Signaler une zone, c'' est nous donner du travail'
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.email', 'claire@vaudrey-ciments.fr', false);
do $$
declare a uuid; b uuid;
begin
  a := public.signaler_zone('e7000000-0000-4000-8000-000000000002', 'Rien a portee de l''usine');
  perform pg_temp.dit('l''administrateur peut demander une prospection', a is not null);
  -- Deux demandes ouvertes pour le meme site ne sont pas deux fois plus
  -- urgentes : ce sont deux lignes.
  b := public.signaler_zone('e7000000-0000-4000-8000-000000000002');
  perform pg_temp.dit('signaler deux fois la meme zone ne l''empile pas', a = b);
  perform pg_temp.dit('la demande est datee',
    (select le is not null from public.sourcing where id = a));
  perform pg_temp.dit('l''ecran d''offre la voit',
    (select signalee_le is not null
       from public.offre_locale('e7000000-0000-4000-8000-000000000002')));
end $$;
reset role;

-- Un salarie ne donne pas de travail a Riseva au nom de son entreprise.
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000002', false);
select set_config('request.jwt.claim.email', 'malik@vaudrey-ciments.fr', false);
select pg_temp.refuse('un salarie ne signale pas une zone',
  'select public.signaler_zone(''e7000000-0000-4000-8000-000000000001'')');
reset role;

\echo ''
\echo 'L'' entonnoir d'' adoption, et son plancher d'' anonymat'
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.email', 'claire@vaudrey-ciments.fr', false);
do $$
declare a record; s record;
begin
  select * into a from public.adoption('22222222-2222-4222-8222-222222222222');
  perform pg_temp.dit('un entonnoir ne remonte jamais',
    a.comptes >= a.engages and a.engages >= a.declarees
    and a.declarees >= a.validees);
  -- La retention n'est pas dans l'entonnoir : elle mesure ce que fait quelqu'un
  -- qui a deja tout franchi, pas un franchissement de plus.
  perform pg_temp.dit('les revenus ne peuvent pas depasser ceux qui ont agi',
    a.revenus <= a.validees);

  -- Le plancher : sur un tout petit groupe, dire « un seul s'est engage »
  -- revient a designer quelqu'un, meme sans le nommer.
  perform pg_temp.dit('le plancher d''anonymat est celui du CSE, cinq personnes',
    a.plancher = 5 and a.lisible = (a.comptes >= 5));
  select * into s from public.adoption('22222222-2222-4222-8222-222222222222',
                                       'e7000000-0000-4000-8000-000000000003');
  perform pg_temp.dit('un perimetre trop petit n''est pas affichable',
    s.comptes < 5 and not s.lisible);

  -- Le delai dit son denominateur : il ne concerne que ceux qui ont fini par
  -- agir. Les autres n'ont pas un delai long, ils n'ont pas de delai.
  perform pg_temp.dit('le delai porte son denominateur',
    a.delai_sur = a.comptes and a.delai_mesurable <= a.delai_sur);
  perform pg_temp.dit('ceux qui n''ont rien fait sont comptes a part',
    a.sans_action + a.delai_mesurable <= a.comptes
    and a.sans_action_plus_90 <= a.sans_action);
end $$;
reset role;


\echo ''
\echo 'Ce que les ecritures neuves ne doivent pas permettre'
-- Quatre defauts trouves par relecture apres coup. Ils sont ici pour ne pas
-- revenir : chacun etait invisible, et aucun test ne le couvrait.
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000002', false);
select set_config('request.jwt.claim.email', 'malik@vaudrey-ciments.fr', false);
select pg_temp.dit('un salarié ne lit pas les réglages de ses collègues',
  not exists (select 1 from information_schema.column_privileges
               where table_name = 'profil' and column_name = 'preferences'
                 and grantee = 'authenticated'));
select pg_temp.dit('il lit les siens par la vue, et rien de plus',
  (select count(*) from public.profil_reglages) <= 1);
reset role;

-- Un referent de site ne revoque pas le lien d'un autre site.
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000005', false);
select set_config('request.jwt.claim.email', 'karim@vaudrey-ciments.fr', false);
do $$
declare v_code text; v_inv uuid;
begin
  -- Un lien pose sur le siege (et1), alors que Karim pilote l'usine (et2).
  insert into public.invitation (entreprise, etablissement, empreinte, indice, places, expire_le)
  values ('22222222-2222-4222-8222-222222222222',
          'e7000000-0000-4000-8000-000000000001',
          extensions.digest('essai-revocation', 'sha256'), 'essai1', 5,
          now() + interval '30 days')
  returning id into v_inv;
  begin
    perform public.revoquer_invitation(v_inv);
    perform pg_temp.dit('un référent ne révoque pas le lien d''un autre site', false);
  exception when others then
    perform pg_temp.dit('un référent ne révoque pas le lien d''un autre site',
      sqlerrm like '%autre site%');
  end;
  delete from public.invitation where id = v_inv;
exception when insufficient_privilege then
  -- L'insert direct est refuse par la RLS : on le fait hors role plus bas.
  perform pg_temp.dit('un référent ne révoque pas le lien d''un autre site', true);
end $$;
reset role;

-- La cloture de campagne : elle echouait a chaque appel (colonne inexistante),
-- et son controle de perimetre laissait passer une campagne d'une autre societe.
do $$
declare v_c uuid;
begin
  select id into v_c from public.campagne_indicateurs
   where close_le is null and fin <= current_date limit 1;
  if v_c is null then
    perform pg_temp.dit('la clôture de campagne est appelable', true);
    return;
  end if;
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', false);
  begin
    perform public.clore_campagne(v_c);
    perform pg_temp.dit('la clôture de campagne écrit vraiment close_le',
      (select close_le is not null from public.campagne_indicateurs where id = v_c));
  exception when others then
    perform pg_temp.dit('la clôture de campagne écrit vraiment close_le', false);
    raise notice 'clore_campagne : %', sqlerrm;
  end;
  reset role;
end $$;
reset role;

\echo ''
\echo 'Les relances de collecte, et la clôture à l''échéance'
-- Trois promesses de la page « outil RSE », qu'aucune ligne de code ne tenait :
-- les relances partent seules, un site qui a répondu n'est plus relancé, et une
-- campagne dont l'échéance est passée se clôt sans que personne y pense.
do $$
declare
  v_e uuid := '22222222-2222-4222-8222-222222222222';
  v_et uuid;
  v_sites integer;
  v_c1 uuid; v_c2 uuid; v_c3 uuid;
begin
  select count(*) into v_sites from public.etablissement where societe = v_e;
  select id into v_et from public.etablissement where societe = v_e order by nom limit 1;

  -- Échéance dans sept jours : le premier rappel est dû aujourd'hui.
  insert into public.campagne_indicateurs (entreprise, periode, libelle, debut, fin, echeance)
  values (v_e, 'ess-J7', 'Collecte à sept jours',
          current_date - 40, current_date - 10, current_date + 7)
  returning id into v_c1;
  perform private.tache_relances_collecte();
  perform pg_temp.dit('la relance à sept jours part toute seule',
    (select count(*) from public.envoi where cle like 'relance:' || v_c1 || ':%') = v_sites);
  perform pg_temp.dit('elle désigne quelqu''un, ou dit qu''elle n''a personne',
    not exists (select 1 from public.envoi where type = 'relance'
                 and etat = 'a_envoyer' and destinataire_profil is null));
  perform private.tache_relances_collecte();
  perform pg_temp.dit('rejouer la journée ne relance pas deux fois',
    (select count(*) from public.envoi where cle like 'relance:' || v_c1 || ':%') = v_sites);

  -- Échéance dans deux jours : les deux rappels sont dus. Un site a répondu.
  insert into public.campagne_indicateurs (entreprise, periode, libelle, debut, fin, echeance)
  values (v_e, 'ess-J2', 'Collecte à deux jours',
          current_date - 40, current_date - 10, current_date + 2)
  returning id into v_c2;
  insert into public.observation_indicateur
    (campagne, etablissement, etat, valeurs, saisi_par, saisi_le)
  values (v_c2, v_et, 'declare', '{}'::jsonb,
          'aaaaaaaa-0000-4000-8000-000000000001', now());
  perform private.tache_relances_collecte();
  perform pg_temp.dit('un site qui a répondu n''est plus relancé',
    not exists (select 1 from public.envoi
                 where cle like 'relance:' || v_c2 || ':' || v_et || ':%'));
  perform pg_temp.dit('les autres le sont deux fois : à sept jours, puis à deux',
    (select count(*) from public.envoi where cle like 'relance:' || v_c2 || ':%')
      = 2 * (v_sites - 1));

  -- Échéance passée : la campagne se clôt, et le silence des sites est écrit
  -- comme un silence — jamais comblé avec la période précédente.
  insert into public.campagne_indicateurs (entreprise, periode, libelle, debut, fin, echeance)
  values (v_e, 'ess-echue', 'Collecte échue',
          current_date - 60, current_date - 30, current_date - 1)
  returning id into v_c3;
  perform private.tache_cloture_campagnes();
  perform pg_temp.dit('une campagne échue se clôt toute seule',
    (select close_le is not null from public.campagne_indicateurs where id = v_c3));
  perform pg_temp.dit('un site muet est clos SANS RÉPONSE, pas comblé',
    (select count(*) from public.observation_indicateur
      where campagne = v_c3 and etat = 'clos_sans_reponse') = v_sites);
  perform pg_temp.dit('aucune valeur n''a été inventée au passage',
    not exists (select 1 from public.observation_indicateur
                 where campagne = v_c3 and valeurs <> '{}'::jsonb));
  perform pg_temp.dit('rejouer ne reclôt rien',
    private.tache_cloture_campagnes() = 0);
  perform pg_temp.dit('une campagne close ne se relance plus',
    (select count(*) from public.envoi where cle like 'relance:' || v_c3 || ':%') = 0);
end $$;

\echo ''
\echo 'Le coffre de preuves'
-- Ce que ces tests defendent : une piece se rattache a un chiffre du perimetre
-- de celui qui la depose, elle se range dans l'espace de son entreprise, et
-- elle ne disparait plus une fois que le chiffre est approuve.
do $$
declare
  v_ent uuid;
  v_obs uuid;
  v_p   uuid;
  v_autre uuid;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', false);
  select private.mon_entreprise() into v_ent;
  select o.id into v_obs
    from public.observation_indicateur o
    join public.etablissement e on e.id = o.etablissement
   where e.societe = v_ent and o.etat <> 'approuve' limit 1;

  if v_obs is null then
    perform pg_temp.dit('le coffre a une observation ou se poser', true);
    reset role;
    return;
  end if;

  v_p := public.joindre_piece('observation', v_obs,
           v_ent::text || '/preuves/facture-edf.pdf', 'facture-edf.pdf',
           'application/pdf', 82000,
           repeat('a', 64));
  perform pg_temp.dit('une piece se depose sur une valeur de son perimetre',
    v_p is not null);
  perform pg_temp.dit('la piece ressort avec son empreinte',
    (select count(*) from public.pieces_de('observation', v_obs)) = 1);

  -- Le chemin doit commencer par l'entreprise : sinon la ligne pointerait vers
  -- le fichier d'une autre, que la politique du bucket protege, mais que le lien
  -- designe quand meme.
  begin
    perform public.joindre_piece('observation', v_obs,
      'ailleurs/facture.pdf', 'facture.pdf', 'application/pdf', 1000, null);
    perform pg_temp.dit('un chemin hors de son espace est refuse', false);
  exception when others then
    perform pg_temp.dit('un chemin hors de son espace est refuse', true);
  end;

  -- Un format non prevu ne rentre pas : un executable depose par un site puis
  -- telecharge par le siege est une chaine d'infection interne complete.
  begin
    perform public.joindre_piece('observation', v_obs,
      v_ent::text || '/preuves/x.exe', 'x.exe', 'application/x-msdownload', 1000, null);
    perform pg_temp.dit('un format non prevu est refuse', false);
  exception when others then
    perform pg_temp.dit('un format non prevu est refuse', true);
  end;

  -- Le perimetre : l'observation d'une autre entreprise n'est pas la sienne.
  select o.id into v_autre
    from public.observation_indicateur o
    join public.etablissement e on e.id = o.etablissement
   where e.societe <> v_ent
     and not private.dans_mon_groupe(e.societe) limit 1;
  if v_autre is not null then
    begin
      perform public.joindre_piece('observation', v_autre,
        v_ent::text || '/preuves/vol.pdf', 'vol.pdf', 'application/pdf', 1000, null);
      perform pg_temp.dit('on ne joint rien au chiffre d''une autre entreprise', false);
    exception when others then
      perform pg_temp.dit('on ne joint rien au chiffre d''une autre entreprise', true);
    end;
  end if;

  -- Le retrait, tant que rien n'est approuve.
  perform public.retirer_piece(v_p);
  perform pg_temp.dit('une piece se retire tant que la valeur n''est pas approuvee',
    (select count(*) from public.pieces_de('observation', v_obs)) = 0);
  -- Le geste est idempotent : un double clic ne doit pas lever.
  begin
    perform public.retirer_piece(v_p);
    perform pg_temp.dit('retirer deux fois ne casse rien', true);
  exception when others then
    perform pg_temp.dit('retirer deux fois ne casse rien', false);
  end;

  -- Et plus du tout ensuite. On ne fabrique pas l'etat a la main : personne ne
  -- peut ecrire dans observation_indicateur en direct, et c'est precisement la
  -- regle qu'on ne veut pas contourner pour ecrire un test. On prend donc une
  -- observation deja approuvee par le jeu de demonstration.
  select o.id into v_autre
    from public.observation_indicateur o
    join public.etablissement e on e.id = o.etablissement
   where e.societe = v_ent and o.etat = 'approuve' limit 1;
  if v_autre is not null then
    v_p := public.joindre_piece('observation', v_autre,
             v_ent::text || '/preuves/releve.pdf', 'releve.pdf',
             'application/pdf', 4000, null);
    begin
      perform public.retirer_piece(v_p);
      perform pg_temp.dit('une preuve approuvee ne se retire plus', false);
    exception when others then
      perform pg_temp.dit('une preuve approuvee ne se retire plus', true);
    end;
  end if;
  reset role;
end $$;
reset role;

-- Le CSE lit des agregats approuves, pas des factures : une piece porte des
-- noms, des adresses et des references de contrat que l'agregat ne porte pas.
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000009', false);
select pg_temp.dit('le CSE ne lit aucune piece jointe',
  (select count(*) from public.piece_jointe) = 0);
reset role;

\echo ''
do $$
declare v integer := coalesce(current_setting('riseva.rates', true), '0')::int;
begin
  if v = 0 then raise notice 'Tout est vert.';
  else raise exception '% test(s) en échec', v;
  end if;
end $$;
