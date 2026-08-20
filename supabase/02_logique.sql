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
