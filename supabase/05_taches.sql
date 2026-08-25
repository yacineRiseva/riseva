-- Riseva — traitements automatiques
-- ---------------------------------------------------------------------------
-- Un seul moteur. Deux fonctions concurrentes qui écrivent le même état, c'est
-- deux vérités et aucune. Tout ce qui suit est idempotent : rejouer une journée
-- ne double aucun chiffre.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------- validation
-- Quatorze jours après la DÉCLARATION, jamais après la date prévue : une mission
-- déclarée treize jours en retard doit laisser à l'association ses quatorze
-- jours pleins pour répondre, pas vingt-quatre heures.
create or replace function private.tache_validation_auto()
returns integer
language plpgsql security definer set search_path = '' as $$
declare v_n integer;
begin
  with mures as (
    select m.id from public.mission m
      join public.annonce a on a.id = m.annonce
      join public.saison  s on s.id = a.saison
     where m.etat = 'a_valider'
       and m.declaree_le + make_interval(days => s.delai_validation_jours) < clock_timestamp()
     for update of m skip locked
  )
  update public.mission m
     set etat = 'validee_auto', tranchee_le = clock_timestamp()
    from mures where m.id = mures.id;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- ------------------------------------------------- demandes de confirmation
-- Ce que la page « Nos engagements » promet aux associations : le message le
-- jour de la déclaration, puis trois rappels — à trois jours, à sept, et un
-- dernier à douze. Pas un de plus : au-delà, c'est du harcèlement d'une équipe
-- bénévole, et le silence a déjà sa réponse (la clôture automatique).
--
-- Chaque rappel a sa propre clé d'idempotence. Sans elle, une tâche rejouée
-- deux fois dans la journée enverrait deux fois le même courriel, et une
-- association qui reçoit deux fois la même demande cesse de les lire.
--
-- On enfile ici, on n'envoie pas : composer un courriel demande une adresse, et
-- une adresse vit dans `auth.users`, que cette tâche n'a pas à pouvoir lire.
create or replace function private.tache_demandes_validation()
returns integer
language plpgsql security definer set search_path = '' as $$
declare v_n integer;
begin
  with rappels as (select * from (values (0), (3), (7), (12)) as r(jour)),
  candidats as (
    select m.id as mission, a.association, m.entreprise, r.jour,
           'validation:' || m.id || ':' || r.jour as cle,
           (select p.profil from private.appartenance p
             where p.association = a.association and p.actif
             order by p.maj_le limit 1) as destinataire,
           a.titre
      from public.mission m
      join public.annonce a on a.id = m.annonce
      join public.saison  s on s.id = a.saison
     cross join rappels r
     where m.etat = 'a_valider'
       and m.declaree_le is not null
       -- Le rappel est dû, et la mission n'est pas encore arrivée à échéance :
       -- relancer sur une mission déjà clôturée serait demander une réponse à
       -- une question qui ne se pose plus.
       and m.declaree_le + make_interval(days => r.jour) <= clock_timestamp()
       and m.declaree_le + make_interval(days => s.delai_validation_jours) > clock_timestamp()
  )
  insert into public.envoi (cle, type, entreprise, association, mission,
                            destinataire_profil, sujet, detail, date, etat)
  select c.cle, 'demande_validation', c.entreprise, c.association, c.mission,
         c.destinataire,
         case when c.jour = 0 then 'Une mission a-t-elle bien été réalisée ?'
              else 'Rappel : une mission attend votre réponse' end,
         left(c.titre, 400),
         current_date,
         case when c.destinataire is null then 'sans_destinataire' else 'a_envoyer' end
    from candidats c
  on conflict (cle) do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- ---------------------------------------------------------------- annonces
create or replace function private.tache_fermeture_annonces()
returns integer
language plpgsql security definer set search_path = '' as $$
declare v_n integer;
begin
  update public.annonce a set etat = 'close'
   where a.etat = 'ouverte' and a.fermeture_auto
     and a.date_prevue is not null
     and a.date_prevue < current_date - 7;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- -------------------------------------------------- intentions de virement
-- Une intention que personne n'a honorée s'éteint. Sans échéance, le « reste à
-- financer » d'une annonce serait faux en permanence et l'association verrait
-- s'empiler des promesses. Rien n'est crédité, rien n'est reproché.
create or replace function private.tache_intentions_expirees()
returns integer
language plpgsql security definer set search_path = '' as $$
declare v_n integer;
begin
  update public.intention_don i
     set etat = 'abandonnee', motif = 'sans virement à l''échéance'
   where i.etat = 'annoncee' and i.expire_le < current_date;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- ---------------------------------------------------- envoi des rapports
-- Un rapport arrêté qui reste dans la base n'a servi à personne. La tâche crée
-- une ligne d'envoi par rapport scellé, une seule fois : c'est l'index unique
-- sur la clé qui le garantit, pas un `if` dans cette fonction.
--
-- La clé porte l'identifiant du rapport, pas le couple entreprise+période. Avec
-- l'ancienne clé, le rapport annuel de la deuxième saison portait la même que
-- celui de la première : `on conflict do nothing` l'absorbait en silence et le
-- client ne recevait plus jamais de rapport après sa première année.
create or replace function private.tache_envoi_rapports()
returns integer
language plpgsql security definer set search_path = '' as $$
declare v_n integer;
begin
  with candidats as (
    select r.id, r.entreprise, r.periode,
           'rapport:' || r.id as cle,
           (select p.profil from private.appartenance p
             where p.entreprise = r.entreprise and p.role = 'entreprise_admin' and p.actif
             order by p.maj_le limit 1) as destinataire
      from public.rapport r
     where r.scelle_le is not null
  )
  insert into public.envoi (cle, type, entreprise, destinataire_profil, sujet, detail, date, etat)
  select c.cle, 'rapport', c.entreprise, c.destinataire,
         case when c.periode = 'annuel' then 'Votre rapport annuel est disponible'
              else 'Votre rapport ' || c.periode || ' est disponible' end,
         'Période scellée, disponible dans votre espace.',
         current_date,
         case when c.destinataire is null then 'sans_destinataire' else 'a_envoyer' end
    from candidats c
  on conflict (cle) do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- ---------------------------------------------------------------- rapports
-- Un rapport ne se scelle qu'une fois les validations closes. Le sceller à la
-- fin du trimestre le fige incomplet : quatorze jours de missions manquent, et
-- `on conflict do nothing` garantissait qu'on ne les ajouterait jamais.
--
-- Quatre trimestres et un annuel, écrits par la même boucle. Le site vitrine
-- promet des rapports trimestriels ; cette tâche n'écrivait que `'annuel'`, et
-- la promesse n'était donc tenue qu'une fois par an.
--
-- Le calcul passe par `private.points_bruts` et non par `public.points_entreprise` :
-- cette dernière porte une garde d'autorisation, une tâche planifiée n'a pas
-- d'identité, et la garde lui rendait donc zéro ligne. Tous les rapports
-- produits par le moteur étaient à zéro, sans qu'aucune erreur ne le signale.
create or replace function private.tache_rapports()
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  t record;
  v_n integer := 0;
begin
  for r in
    select ab.entreprise, ab.saison, ab.effectif_reference,
           s.debut, s.fin, s.delai_validation_jours
      from public.abonnement ab
      join public.saison s on s.id = ab.saison
     where s.etat in ('ouverte','close')
  loop
    -- Deux jeux de dates, et ce n'est pas un doublon. `du`/`au` sont ce que le
    -- rapport AFFICHE ; `borne_du`/`borne_au` sont ce qu'il COMPTE. Le premier
    -- trimestre n'a pas de borne basse et le dernier pas de borne haute, sinon
    -- une mission datée hors du calendrier de la saison — un décalage de saisie,
    -- une annonce reportée — n'entrerait dans aucun trimestre : la somme des
    -- quatre ne ferait plus l'annuel, et personne ne saurait où sont passés les
    -- points manquants. L'annuel, lui, n'a que la saison pour frontière.
    for t in
      select 'annuel'::text as periode, r.debut as du, r.fin as au,
             null::date as borne_du, null::date as borne_au
       union all
      select q.periode, q.debut, q.fin,
             case when q.periode = 'T1' then null else q.debut end,
             case when q.fin >= r.fin then null else q.fin end
        from private.trimestres(r.debut, r.fin) q
    loop
      -- Un trimestre qui n'a pas commencé n'a pas de rapport : une page vide
      -- datée du futur n'est pas un document, c'est du bruit dans une liste.
      -- L'annuel, lui, existe dès l'ouverture de la saison : c'est le document
      -- qui se remplit sous les yeux du client, et le voir à zéro le premier
      -- jour est exact, pas trompeur.
      continue when t.periode <> 'annuel' and t.du > current_date;

      insert into public.rapport (entreprise, saison, periode, methode_version,
                                  bareme_gele, effectif_reference, contenu, scelle_le, maj_le)
      select r.entreprise, r.saison, t.periode, 'v1',
             (select jsonb_object_agg(b.type, b.points) from public.bareme b where b.saison = r.saison),
             r.effectif_reference,
             jsonb_build_object(
               'du', t.du, 'au', t.au,
               -- Le `brut` s'additionne d'un trimestre à l'autre ; le `retenu`,
               -- non. L'écrêtage par format (`least(pts, brut - pts)`) porte sur
               -- le total de la période : additionner quatre `retenu`
               -- trimestriels ne redonne pas le `retenu` annuel, et c'est
               -- normal. Le rapport le porte, plutôt que de laisser un client
               -- découvrir l'écart en additionnant lui-même.
               'retenu_additif', t.periode = 'annuel',
               'retenu', (select coalesce(sum(pb.retenu), 0)
                            from private.points_bruts(r.entreprise, r.saison, t.borne_du, t.borne_au) pb),
               'brut',   (select coalesce(sum(pb.brut), 0)
                            from private.points_bruts(r.entreprise, r.saison, t.borne_du, t.borne_au) pb),
               'realisations', (select coalesce(jsonb_object_agg(x.unite, x.confirme), '{}'::jsonb)
                                  from private.realisations_brutes(
                                         r.entreprise, null, r.saison,
                                         t.borne_du, t.borne_au) x)),
             case when current_date > t.au + r.delai_validation_jours then now() end, now()
      on conflict (entreprise, saison, periode) do update
         set contenu = excluded.contenu,
             bareme_gele = excluded.bareme_gele,
             effectif_reference = excluded.effectif_reference,
             maj_le = now(),
             scelle_le = coalesce(public.rapport.scelle_le, excluded.scelle_le)
       where public.rapport.scelle_le is null;   -- un rapport scellé ne bouge plus
      v_n := v_n + 1;
    end loop;
  end loop;
  return v_n;
end $$;

-- ------------------------------------------------------ relances de collecte
-- Ce que la page « outil RSE » promet : les relances partent toutes seules. Le
-- code ne les écrivait nulle part — aucune ligne de la base ne portait le type
-- `'relance'`, et le chef de projet RSE relançait donc ses sites à la main,
-- exactement comme avant Riseva.
--
-- Deux rappels, à sept jours puis à deux jours de l'échéance. Pas davantage :
-- au-delà on n'obtient pas un chiffre, on obtient un filtre de messagerie.
-- Chaque rappel a sa clé, donc rejouer la journée n'envoie rien deux fois.
--
-- Le destinataire est le référent du site, à défaut l'administrateur de la
-- société : relancer le siège pour un site qui a son propre référent, c'est
-- faire remonter le travail d'un cran à chaque rappel.
create or replace function private.tache_relances_collecte()
returns integer
language plpgsql security definer set search_path = '' as $$
declare v_n integer;
begin
  with rappels as (select * from (values (7), (2)) as r(jour)),
  attendus as (
    select c.id as campagne, c.libelle, et.id as etablissement, et.nom as site,
           e.id as entreprise, r.jour,
           coalesce(
             (select p.profil from private.appartenance p
               where p.etablissement = et.id and p.role = 'site_referent' and p.actif
               order by p.maj_le limit 1),
             (select p.profil from private.appartenance p
               where p.entreprise = e.id and p.role = 'entreprise_admin' and p.actif
               order by p.maj_le limit 1)) as destinataire
      from public.campagne_indicateurs c
      join public.entreprise e
        on (c.groupe is not null and e.groupe = c.groupe)
        or (c.groupe is null and e.id = c.entreprise)
      -- Un site fermé ne reçoit pas de relance : son référent est parti et son
      -- siège recevrait deux courriels par campagne pour un lieu qui n'existe
      -- plus.
      join public.etablissement et on et.societe = e.id and et.ferme_le is null
     cross join rappels r
     where c.close_le is null
       and current_date >= c.echeance - r.jour
       and current_date <= c.echeance
       -- Un site qui a déjà répondu n'est pas relancé. `attendu` en fait partie :
       -- la ligne existe, mais elle ne porte encore aucun chiffre.
       and not exists (select 1 from public.observation_indicateur o
                        where o.campagne = c.id and o.etablissement = et.id
                          and o.etat in ('declare','approuve'))
  )
  insert into public.envoi (cle, type, entreprise, destinataire_profil,
                            sujet, detail, date, etat)
  select 'relance:' || a.campagne || ':' || a.etablissement || ':' || a.jour,
         'relance', a.entreprise, a.destinataire,
         case when a.jour = 2 then 'Dernier rappel : vos indicateurs sont attendus'
              else 'Vos indicateurs sont attendus dans une semaine' end,
         left(a.libelle || ' — ' || a.site, 400),
         current_date,
         case when a.destinataire is null then 'sans_destinataire' else 'a_envoyer' end
    from attendus a
  on conflict (cle) do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- --------------------------------------------------- clôture des collectes
-- La doctrine — un site muet est clos SANS RÉPONSE, jamais comblé — était
-- correctement écrite dans `clore_campagne`, et rien ne l'appelait. Une campagne
-- dont l'échéance était passée restait ouverte indéfiniment, et le rapport
-- attendait un chiffre qui ne viendrait plus.
create or replace function private.tache_cloture_campagnes()
returns integer
language plpgsql security definer set search_path = '' as $$
declare c record; v_n integer := 0;
begin
  for c in
    select id from public.campagne_indicateurs
     where close_le is null and echeance < current_date
     order by echeance
  loop
    perform private.clore_campagne_effet(c.id);
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

-- ---------------------------------------------------------------- rétention
-- Une durée de conservation qui n'est pas exécutable n'est pas une durée de
-- conservation, c'est une phrase dans une politique. Celle-ci supprime, et
-- consigne combien de lignes — sans recopier ce qu'elle vient de supprimer.
create or replace function private.tache_retention()
returns integer
language plpgsql security definer set search_path = '' as $$
declare v_total integer := 0; v_n integer;
begin
  delete from public.acces a where a.purge_le < now() and not a.legal_hold;
  get diagnostics v_n = row_count;
  if v_n > 0 then
    insert into private.journal_purge (ensemble, lignes, motif)
    values ('acces', v_n, 'durée de conservation échue');
    v_total := v_total + v_n;
  end if;

  delete from public.preinscription p where p.purge_le < now();
  get diagnostics v_n = row_count;
  if v_n > 0 then
    insert into private.journal_purge (ensemble, lignes, motif)
    values ('preinscription', v_n, 'durée de conservation échue');
    v_total := v_total + v_n;
  end if;

  delete from public.invitation i
   where i.expire_le < now() - interval '12 months'
     and not exists (select 1 from public.affectation_siege s where s.invitation = i.id);
  get diagnostics v_n = row_count;
  if v_n > 0 then
    insert into private.journal_purge (ensemble, lignes, motif)
    values ('invitation', v_n, 'lien expiré et sans rattachement');
    v_total := v_total + v_n;
  end if;

  delete from public.moteur_journal j where j.cree_le < now() - interval '12 months';
  get diagnostics v_n = row_count;
  if v_n > 0 then
    insert into private.journal_purge (ensemble, lignes, motif)
    values ('moteur_journal', v_n, 'durée de conservation échue');
    v_total := v_total + v_n;
  end if;

  return v_total;
end $$;

-- ------------------------------------------------------- envoi des courriels
-- Le maillon qui manquait entre la base et les boîtes aux lettres. La base enfile
-- ce qui doit partir ; la fonction Edge `courriels` écrit et envoie. Entre les
-- deux, il n'y avait RIEN : pas un `cron.schedule`, pas un appel HTTP, rien dans
-- la procédure de mise en ligne. Les trois files se remplissaient et ne se
-- vidaient jamais, et « le rapport part tout seul » restait une phrase.
--
-- Deux réglages, posés une fois à l'installation (voir docs/MISE-EN-LIGNE.txt) :
--   insert into private.reglage (cle, valeur) values
--     ('url_fonctions', 'https://<projet>.supabase.co/functions/v1'),
--     ('cron_secret',   '<le même secret que CRON_SECRET côté fonction>');
-- Tant qu'ils manquent, la tâche ne fait rien et ne casse rien : une base de
-- développement n'a pas de fonctions Edge à appeler.
create or replace function private.tache_courriels()
returns integer
language plpgsql security definer set search_path = '' as $$
declare v_url text; v_secret text;
begin
  if to_regproc('net.http_post') is null then return 0; end if;
  select r.valeur into v_url    from private.reglage r where r.cle = 'url_fonctions';
  select r.valeur into v_secret from private.reglage r where r.cle = 'cron_secret';
  if v_url is null or v_secret is null then return 0; end if;
  perform net.http_post(
    url := rtrim(v_url, '/') || '/courriels',
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'x-riseva-cron', v_secret),
    body := '{}'::jsonb);
  return 1;
end $$;

-- ---------------------------------------------------------------- moteur
create or replace function private.moteur()
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v jsonb;
begin
  -- L'ordre n'est pas décoratif : on clôt les collectes échues avant d'arrêter
  -- les rapports, et on arrête les rapports avant de les envoyer. Envoyer avant
  -- d'arrêter, c'était attendre la nuit suivante pour poster un rapport scellé
  -- le soir même — et l'ancien ordre faisait exactement cela.
  v := jsonb_build_object(
    'validations_auto',    private.tache_validation_auto(),
    'annonces_fermees',    private.tache_fermeture_annonces(),
    'intentions_expirees', private.tache_intentions_expirees(),
    'demandes_validation', private.tache_demandes_validation(),
    'relances_collecte',   private.tache_relances_collecte(),
    'campagnes_closes',    private.tache_cloture_campagnes(),
    'rapports',            private.tache_rapports(),
    'rapports_envoyes',    private.tache_envoi_rapports(),
    'purges',              private.tache_retention(),
    -- En dernier, une fois les trois files remplies : un seul appel sortant par
    -- nuit, et il part avec tout ce que la nuit a produit.
    'courriels',           private.tache_courriels());
  insert into public.moteur_journal (tache, fait) values ('moteur', v);
  return v;
end $$;

-- ---------------------------------------------------------------- planification
-- pg_cron n'existe pas partout : sur un poste de développement, on installe le
-- schéma sans le planificateur plutôt que de faire échouer la migration.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('riseva-moteur', '17 3 * * *', 'select private.moteur()');
  else
    raise notice 'pg_cron absent : le moteur devra être appelé par un ordonnanceur externe.';
  end if;
end $$;

revoke all on function
  private.tache_validation_auto(), private.tache_fermeture_annonces(),
  private.tache_intentions_expirees(), private.tache_demandes_validation(),
  private.tache_relances_collecte(), private.tache_cloture_campagnes(),
  private.tache_rapports(), private.tache_envoi_rapports(),
  private.tache_retention(), private.tache_courriels(), private.moteur()
from public, anon, authenticated;

-- Les fonctions créées ici sont elles aussi SECURITY DEFINER : elles doivent
-- passer sous le même propriétaire dédié que celles de 02. Le faire seulement
-- dans 03 laissait les tâches planifiées tourner au nom de `postgres`, c'est-à-dire
-- avec tous les droits, pour un travail qui n'en demande presque aucun.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      join pg_roles r on r.oid = p.proowner
     where n.nspname in ('public','private') and p.prosecdef and r.rolname <> 'riseva_definer'
  loop
    execute format('alter function %s owner to riseva_definer', f.sig);
  end loop;
end $$;
