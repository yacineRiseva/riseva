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

-- ---------------------------------------------------------------- rapports
-- Un rapport ne se scelle qu'une fois les validations closes. Le sceller à la
-- fin du trimestre le fige incomplet : quatorze jours de missions manquent, et
-- `on conflict do nothing` garantissait qu'on ne les ajouterait jamais.
create or replace function private.tache_rapports()
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  v_n integer := 0;
  v_fin date;
  v_scellable boolean;
begin
  for r in
    select ab.entreprise, ab.saison, ab.effectif_reference, s.fin, s.delai_validation_jours
      from public.abonnement ab
      join public.saison s on s.id = ab.saison
     where s.etat in ('ouverte','close')
  loop
    v_fin := r.fin;
    v_scellable := current_date > v_fin + r.delai_validation_jours;

    insert into public.rapport (entreprise, saison, periode, methode_version,
                                bareme_gele, effectif_reference, contenu, scelle_le, maj_le)
    select r.entreprise, r.saison, 'annuel', 'v1',
           (select jsonb_object_agg(b.type, b.points) from public.bareme b where b.saison = r.saison),
           r.effectif_reference,
           jsonb_build_object(
             'retenu', (select coalesce(sum(pe.retenu), 0)
                          from public.points_entreprise(r.entreprise, r.saison) pe),
             'brut',   (select coalesce(sum(pe.brut), 0)
                          from public.points_entreprise(r.entreprise, r.saison) pe),
             'realisations', (select coalesce(jsonb_object_agg(x.unite, x.confirme), '{}'::jsonb)
                                from public.realisations(r.entreprise, null, r.saison) x)),
           case when v_scellable then now() end, now()
    on conflict (entreprise, saison, periode) do update
       set contenu = excluded.contenu,
           bareme_gele = excluded.bareme_gele,
           effectif_reference = excluded.effectif_reference,
           maj_le = now(),
           scelle_le = coalesce(public.rapport.scelle_le, excluded.scelle_le)
     where public.rapport.scelle_le is null;   -- un rapport scellé ne bouge plus
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

-- ---------------------------------------------------------------- moteur
create or replace function private.moteur()
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v jsonb;
begin
  v := jsonb_build_object(
    'validations_auto', private.tache_validation_auto(),
    'annonces_fermees', private.tache_fermeture_annonces(),
    'intentions_expirees', private.tache_intentions_expirees(),
    'rapports',         private.tache_rapports(),
    'purges',           private.tache_retention());
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
  private.tache_rapports(), private.tache_retention(), private.moteur()
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
