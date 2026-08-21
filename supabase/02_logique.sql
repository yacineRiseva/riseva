-- Riseva — règles métier tenues par la base, pas par le client.

-- Calcul des points : seule source de vérité.
create or replace function points_pour(p_saison uuid, p_type type_annonce, p_quantite numeric)
returns integer language plpgsql stable as $$
declare v_points integer;
begin
  select points into v_points from bareme where saison = p_saison and type = p_type;
  if v_points is null then return 0; end if;
  if p_type = 'don_financier' then
    return floor(p_quantite / 10.0) * v_points;
  end if;
  return (p_quantite * v_points)::integer;
end $$;

-- À l'engagement : on décrémente le restant et on fige les points.
create or replace function mission_avant_insert() returns trigger language plpgsql as $$
declare a annonce%rowtype;
begin
  select * into a from annonce where id = new.annonce for update;
  if a.etat <> 'ouverte' then raise exception 'Annonce fermée'; end if;
  if new.quantite > a.restant then raise exception 'Quantité supérieure au besoin restant'; end if;

  new.points := points_pour(a.saison, a.type, new.quantite);

  update annonce
     set restant = restant - new.quantite,
         etat    = case when restant - new.quantite <= 0 then 'close' else etat end
   where id = a.id;
  return new;
end $$;

create trigger trg_mission_avant_insert before insert on mission
for each row execute function mission_avant_insert();

-- Si une mission est refusée ou annulée, le besoin redevient disponible.
create or replace function mission_apres_update() returns trigger language plpgsql as $$
begin
  if new.etat = 'refusee' and old.etat <> 'refusee' then
    update annonce set restant = restant + old.quantite,
                       etat    = case when etat = 'close' then 'ouverte' else etat end
     where id = new.annonce;
    new.points := 0;
  end if;
  return new;
end $$;

create trigger trg_mission_apres_update before update on mission
for each row execute function mission_apres_update();

-- Validation automatique au bout de quatorze jours sans réponse de l'association.
-- À appeler par une tâche planifiée quotidienne (pg_cron ou Edge Function).
create or replace function valider_missions_sans_reponse() returns integer language plpgsql as $$
declare n integer;
begin
  update mission
     set etat = 'validee_auto', tranchee_le = now()
   where etat = 'a_valider'
     and declaree_le < now() - interval '14 days';
  get diagnostics n = row_count;
  return n;
end $$;

-- Rafraîchissement hebdomadaire du classement.
create or replace function rafraichir_classement() returns void language sql as $$
  refresh materialized view concurrently classement;
$$;


-- ---------------------------------------------------------------- sièges
-- Une place occupée par salarié encore identifié. Un salarié anonymisé rend sa place.
create or replace function sieges_pris(p_entreprise uuid)
returns integer language sql stable as $$
  select count(*)::integer from profil
   where entreprise = p_entreprise and role = 'salarie' and not anonyme
$$;

create or replace function sieges_restants(p_entreprise uuid)
returns integer language sql stable as $$
  select greatest(0, (select sieges from entreprise where id = p_entreprise)
                     - sieges_pris(p_entreprise))
$$;

-- Aucun compte salarié ne peut être créé au-delà du nombre de places acheté.
create or replace function profil_avant_insert() returns trigger language plpgsql as $$
begin
  if new.role = 'salarie' and not new.anonyme then
    if sieges_restants(new.entreprise) <= 0 then
      raise exception 'Plus aucune place disponible sur cet abonnement';
    end if;
  end if;
  return new;
end $$;

create trigger trg_profil_avant_insert before insert on profil
for each row execute function profil_avant_insert();

-- ---------------------------------------------------------------- anonymisation
-- Retirer un salarié ne supprime pas sa ligne : cela viderait aussi ses missions et
-- ferait disparaître des points acquis à l'entreprise. On vide l'identité, on garde la trace.
create or replace function anonymiser_salarie(p_profil uuid)
returns void language plpgsql security definer as $$
declare v_entreprise uuid; v_rang integer;
begin
  select entreprise into v_entreprise from profil where id = p_profil and role = 'salarie';
  if v_entreprise is null then raise exception 'Profil salarié introuvable'; end if;

  select count(*) + 1 into v_rang
    from profil where entreprise = v_entreprise and anonyme;

  update profil
     set nom       = 'Salarié retiré ' || lpad(v_rang::text, 2, '0'),
         anonyme   = true,
         actif     = false,
         retire_le = current_date
   where id = p_profil;

  -- L'identité vit dans auth.users : on la neutralise aussi.
  update auth.users
     set email = 'retire+' || p_profil || '@riseva.invalid',
         raw_user_meta_data = '{}'::jsonb,
         phone = null
   where id = p_profil;

  -- La place est rendue au lien d'invitation en cours.
  update invitation set utilisees = greatest(0, utilisees - 1)
   where entreprise = v_entreprise and active;
end $$;

-- ---------------------------------------------------------------- invitations
-- Génère un code lisible, sans caractères ambigus.
create or replace function nouveau_code(p_entreprise uuid)
returns text language plpgsql as $$
declare v_base text; v_suffixe text;
begin
  select upper(regexp_replace(nom, '[^A-Za-z]', '', 'g')) into v_base
    from entreprise where id = p_entreprise;
  v_base := coalesce(nullif(left(v_base, 7), ''), 'RISEVA');
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
                           (random() * 31)::integer + 1, 1), '')
    into v_suffixe from generate_series(1, 4);
  return v_base || '-' || v_suffixe;
end $$;

-- Crée un lien et désactive le précédent, en une transaction.
create or replace function creer_invitation(p_entreprise uuid, p_places integer)
returns invitation language plpgsql security definer as $$
declare v invitation%rowtype;
begin
  update invitation set active = false where entreprise = p_entreprise and active;
  insert into invitation (entreprise, code, places, cree_par)
  values (p_entreprise, nouveau_code(p_entreprise),
          least(p_places, (select sieges from entreprise where id = p_entreprise)),
          auth.uid())
  returning * into v;
  return v;
end $$;


-- ---------------------------------------------------------------- réalisations
-- Deux règles tiennent l'honnêteté du chiffre :
--   1. seules les missions validées comptent, jamais une réservation ;
--   2. le nombre déclaré par l'association l'emporte sur l'estimation de l'annonce.
-- Riseva additionne, elle n'audite pas, et l'interface le dit.
create or replace function realise_de(p_mission uuid)
returns numeric language sql stable as $$
  select case
    when m.etat not in ('validee','validee_auto') then 0
    when a.impact_unite is null then 0
    else coalesce(m.realise, round(m.quantite * a.impact_par_unite))
  end
  from mission m join annonce a on a.id = m.annonce
 where m.id = p_mission
$$;

create or replace function realisations_entreprise(
  p_entreprise uuid, p_debut date default null, p_fin date default null)
returns jsonb language sql stable as $$
  select coalesce(jsonb_object_agg(unite, total), '{}'::jsonb)
    from (
      select a.impact_unite::text as unite,
             sum(coalesce(m.realise, round(m.quantite * a.impact_par_unite))) as total
        from mission m join annonce a on a.id = m.annonce
       where m.entreprise = p_entreprise
         and m.etat in ('validee','validee_auto')
         and a.impact_unite is not null
         and (p_debut is null or m.date_mission >= p_debut)
         and (p_fin   is null or m.date_mission <= p_fin)
       group by a.impact_unite
    ) x
$$;

create or replace function realisations_reseau()
returns jsonb language sql stable as $$
  select coalesce(jsonb_object_agg(unite, total), '{}'::jsonb)
    from (
      select a.impact_unite::text as unite,
             sum(coalesce(m.realise, round(m.quantite * a.impact_par_unite))) as total
        from mission m join annonce a on a.id = m.annonce
       where m.etat in ('validee','validee_auto') and a.impact_unite is not null
       group by a.impact_unite
    ) x
$$;

-- ---------------------------------------------------------------- points
-- Le plafond par format vit dans la base, pas seulement dans l'interface : un client
-- qui interroge ses données directement doit trouver le même chiffre que son écran.
create or replace function points_bruts(
  p_entreprise uuid, p_debut date default null, p_fin date default null)
returns integer language sql stable as $$
  select coalesce(sum(m.points), 0)::integer
    from mission m
   where m.entreprise = p_entreprise
     and m.etat in ('validee','validee_auto')
     and (p_debut is null or m.date_mission >= p_debut)
     and (p_fin   is null or m.date_mission <= p_fin)
$$;

create or replace function points_retenus(
  p_entreprise uuid, p_debut date default null, p_fin date default null)
returns integer language sql stable as $$
  with par_type as (
    select a.type, sum(m.points) as pts
      from mission m join annonce a on a.id = m.annonce
     where m.entreprise = p_entreprise
       and m.etat in ('validee','validee_auto')
       and (p_debut is null or m.date_mission >= p_debut)
       and (p_fin   is null or m.date_mission <= p_fin)
     group by a.type
  ), total as (select coalesce(sum(pts), 0) as brut from par_type)
  select coalesce(sum(least(pts, floor(brut * 0.5))), 0)::integer
    from par_type, total
$$;

-- Découpage d'une saison en quatre trimestres plus le bilan annuel.
create or replace function periodes_de(p_saison uuid)
returns table (portee text, periode text, debut date, fin date)
language sql stable as $$
  select 'trimestriel', 'T' || i,
         (s.debut + ((i - 1) * interval '3 months'))::date,
         (s.debut + (i * interval '3 months') - interval '1 day')::date
    from saison s, generate_series(1, 4) i
   where s.id = p_saison
  union all
  select 'annuel', s.nom, s.debut, s.fin from saison s where s.id = p_saison
$$;
