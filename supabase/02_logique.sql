-- Riseva — logique métier
-- ---------------------------------------------------------------------------
-- Trois règles tenues partout dans ce fichier :
--
--   1. Toute fonction SECURITY DEFINER est déclarée `set search_path = ''` et
--      qualifie chacun de ses objets. Sans cela, il suffit de créer une table
--      `mission` dans un schéma qu'on contrôle et de la placer devant dans le
--      chemin de recherche pour faire exécuter son propre code avec les droits
--      du propriétaire de la fonction.
--   2. Aucune écriture métier ne passe par une table. Le client appelle une RPC,
--      la RPC fixe elle-même ce qui ne se négocie pas : l'auteur, l'entreprise,
--      les points, l'état, les dates.
--   3. Aucun compteur dénormalisé. Les scores se dérivent des missions à chaque
--      lecture ; c'est plus cher, et c'est juste.
--
-- Les droits d'exécution sont retirés en bloc dans 03_rls.sql, puis réaccordés
-- fonction par fonction. Une fonction oubliée est donc muette, jamais ouverte.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------- qui suis-je
-- Un salarié retiré, pseudonymisé ou désactivé n'est plus personne, même si son
-- jeton reste techniquement valable jusqu'à expiration : c'est ici qu'on le dit,
-- une fois, plutôt que dans quinze policies.
create or replace function private.moi()
returns private.appartenance
language sql stable security definer set search_path = '' as $$
  select a.* from private.appartenance a
   where a.profil = auth.uid()
     and a.actif and not a.pseudonymise
$$;

create or replace function private.mon_role() returns public.role_utilisateur
language sql stable security definer set search_path = '' as $$
  select (private.moi()).role
$$;

create or replace function private.mon_entreprise() returns uuid
language sql stable security definer set search_path = '' as $$
  select (private.moi()).entreprise
$$;

create or replace function private.mon_association() returns uuid
language sql stable security definer set search_path = '' as $$
  select (private.moi()).association
$$;

-- Le périmètre du site. Un référent de site ne voit que le sien : ce n'est pas un
-- filtre d'affichage, c'est la frontière.
create or replace function private.mon_etablissement() returns uuid
language sql stable security definer set search_path = '' as $$
  select (private.moi()).etablissement
$$;

-- Le périmètre de consolidation. Renseigné, il ouvre la vue de groupe — des
-- agrégats, jamais des identités d'une autre société. Appartenir au même groupe
-- ne donne aucun droit sur les personnes d'une filiale : deux sociétés sont deux
-- responsables de traitement distincts, et le lien capitalistique n'y change rien.
create or replace function private.mon_groupe() returns uuid
language sql stable security definer set search_path = '' as $$
  select (private.moi()).groupe
$$;

-- Vrai si la société appartient au groupe que je consolide. Sert aux agrégats,
-- jamais à ouvrir une ligne nominative.
create or replace function private.dans_mon_groupe(p_entreprise uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.mon_groupe() is not null
     and exists (select 1 from public.entreprise e
                  where e.id = p_entreprise and e.groupe = private.mon_groupe())
$$;

-- Une policy s'exécute avec les droits de l'appelant. Écrire `exists (select 1
-- from private.appartenance ...)` directement dans une policy la fait donc échouer
-- pour `authenticated`, qui n'a aucun droit sur cette table — et une policy qui
-- échoue ne filtre pas, elle refuse tout. Le test « une société ne lit pas les
-- personnes d'une autre » l'a montré : plus personne ne pouvait lire un profil.
-- Toute interrogation du schéma privé depuis une policy passe donc par une
-- fonction SECURITY DEFINER, comme les autres.
create or replace function private.meme_entreprise(p_profil uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.mon_entreprise() is not null
     and exists (select 1 from private.appartenance a
                  where a.profil = p_profil
                    and a.entreprise = private.mon_entreprise())
$$;

create or replace function private.est_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(private.mon_role() = 'admin', false)
$$;

create or replace function private.saison_ouverte() returns uuid
language sql stable security definer set search_path = '' as $$
  select s.id from public.saison s where s.etat = 'ouverte' limit 1
$$;

-- ---------------------------------------------------------------- barème
-- Un barème manquant est une configuration cassée. Renvoyer zéro la masquerait :
-- les missions continueraient d'être créées, à zéro point, sans que personne
-- comprenne pourquoi le classement ne bouge plus.
create or replace function private.points_pour(
  p_saison uuid, p_type public.type_annonce, p_quantite numeric)
returns integer
language plpgsql stable security definer set search_path = '' as $$
declare v_points integer;
begin
  select b.points into v_points
    from public.bareme b where b.saison = p_saison and b.type = p_type;
  if v_points is null then
    raise exception 'Aucun barème pour % sur cette saison', p_type
      using errcode = 'no_data_found';
  end if;
  if p_type = 'don_financier' then
    return floor((p_quantite / 10) * v_points);
  end if;
  return floor(p_quantite * v_points);
end $$;

-- ---------------------------------------------------------------- score
-- Le plafond porte sur le total RETENU, pas sur le brut. `least(pts, brut-pts)`
-- dit exactement cela : la part d'un format ne peut pas dépasser la somme de
-- tous les autres. Avec (6 240, 780, 0), on retient 1 560, pas 4 290.
-- Le score détaillé d'une entreprise. Réservé à elle-même, à son groupe et à
-- Riseva : sans ce contrôle, la fonction rendait le `brut` et le `retenu` exacts
-- de n'importe quel identifiant, et le classement publie ces mêmes entiers sur
-- ses lignes anonymisées. Une jointure sur deux nombres levait le masque de
-- toute la moitié basse — l'anonymat tenait à un affichage, pas à une frontière.
create or replace function public.points_entreprise(p_entreprise uuid, p_saison uuid)
returns table (type public.type_annonce, brut bigint, retenu bigint)
language sql stable security definer set search_path = '' as $$
  with autorise as (
    select p_entreprise = private.mon_entreprise()
        or private.dans_mon_groupe(p_entreprise)
        or private.est_admin() as ok
  ), par_type as (
    select a.type, sum(m.points)::bigint as pts
      from public.mission m
      join public.annonce a on a.id = m.annonce
     where m.entreprise = p_entreprise
       and a.saison = p_saison
       and m.etat in ('validee','validee_auto')
       and m.origine = 'entreprise'
     group by a.type
  ), total as (select coalesce(sum(pts), 0)::bigint as brut from par_type)
  select p.type, p.pts, greatest(0, least(p.pts, t.brut - p.pts))::bigint
    from par_type p cross join total t, autorise
   where autorise.ok
$$;

-- Le classement, en un seul agrégat. L'ancienne version rappelait plusieurs
-- fonctions par entreprise, chacune rescannant les missions : coût quadratique
-- garanti dès la centième entreprise.
-- Nommée ou pas : la même règle qu'à l'écran, écrite une seule fois. La moitié
-- haute se compte en arrondissant au supérieur — sur une cohorte impaire, celle
-- du milieu est nommée.
create or replace function private.nommable(p_visibilite text, p_rang bigint, p_cohorte bigint)
returns boolean language sql immutable parallel safe set search_path = '' as $$
  select case p_visibilite
           when 'nom' then true
           when 'anonyme' then false
           else p_rang <= ceil(p_cohorte::numeric / 2)
         end
$$;

-- Le classement public. Il ne rend le nom d'une entreprise que si elle accepte
-- d'être nommée : dans la moitié haute de sa cohorte par défaut, toujours si elle
-- l'a choisi, jamais si elle a demandé le contraire. Sa propre fiche et Riseva
-- font exception, sinon personne ne saurait où il est.
--
-- L'identifiant est retiré en même temps que le nom. Le garder ne servirait qu'à
-- une chose : le joindre à `entreprise`, dont le nom, la ville et le secteur sont
-- lisibles publiquement. Une anonymisation qui laisse la clé primaire n'anonymise
-- rien du tout.
create or replace function public.classement_saison(p_saison uuid)
returns table (
  entreprise uuid, nom text, logo text, anonyme boolean, categorie text,
  brut bigint, retenu bigint, effectif_reference integer,
  par_salarie numeric, rang bigint, cohorte bigint)
language sql stable security definer set search_path = '' as $$
  with par_type as (
    select m.entreprise, a.type, sum(m.points)::bigint as pts
      from public.mission m
      join public.annonce a on a.id = m.annonce
     where a.saison = p_saison
       and m.etat in ('validee','validee_auto')
       and m.origine = 'entreprise'
     group by m.entreprise, a.type
  ), brut as (
    select p.entreprise, sum(p.pts)::bigint as brut from par_type p group by p.entreprise
  ), retenu as (
    select p.entreprise, sum(greatest(0, least(p.pts, b.brut - p.pts)))::bigint as retenu
      from par_type p join brut b on b.entreprise = p.entreprise
     group by p.entreprise
  ), base as (
    select ab.entreprise, e.nom, e.logo, e.secteur, e.visibilite, ab.effectif_reference,
           coalesce(b.brut, 0) as brut, coalesce(r.retenu, 0) as retenu,
           -- Les memes bornes que `CATEGORIES` dans data.js, et que la grille
           -- publiee sur le reglement : moins de 50, 50 a 199, 200 a 499, 500 et
           -- plus. Elles disaient 250 et 5 000 ici : une entreprise de deux cent
           -- vingt salaries changeait de cohorte selon qu'on la regardait dans
           -- le navigateur ou dans la base, et la mediane de la cohorte avec
           -- elle, donc qui est nomme et qui reste anonyme.
           case
             when ab.effectif_reference < 50   then 'TPE'
             when ab.effectif_reference < 200  then 'PME'
             when ab.effectif_reference < 500  then 'ETI'
             else 'GE' end as categorie
      from public.abonnement ab
      join public.entreprise e on e.id = ab.entreprise
      left join brut   b on b.entreprise = ab.entreprise
      left join retenu r on r.entreprise = ab.entreprise
     where ab.saison = p_saison
  ), classe as (
    select b.*,
           rank() over (partition by b.categorie
                        order by b.retenu::numeric / b.effectif_reference desc) as rang,
           count(*) over (partition by b.categorie) as cohorte,
           -- Les ex æquo. Un groupe d'ex æquo à cheval sur la médiane n'est pas
           -- nommé : départager par `row_number()` reviendrait à exposer l'un et
           -- protéger l'autre sur un ordre arbitraire, à score identique.
           count(*) over (partition by b.categorie,
                          b.retenu::numeric / b.effectif_reference) as exaequo
      from base b
  )
  select
    case when private.nommable(c.visibilite, c.rang + c.exaequo - 1, c.cohorte)
              or c.entreprise = private.mon_entreprise() or private.est_admin()
         then c.entreprise end,
    case when private.nommable(c.visibilite, c.rang + c.exaequo - 1, c.cohorte)
              or c.entreprise = private.mon_entreprise() or private.est_admin()
         then c.nom
         else 'Entreprise · ' || c.categorie end,
    -- Le logo suit le nom et disparaît avec lui : c'est un identifiant plus fort
    -- qu'une raison sociale, et le laisser sur une ligne anonymisée annulerait
    -- l'anonymisation tout en la laissant écrite à l'écran.
    case when private.nommable(c.visibilite, c.rang + c.exaequo - 1, c.cohorte)
              or c.entreprise = private.mon_entreprise() or private.est_admin()
         then c.logo end,
    not (private.nommable(c.visibilite, c.rang + c.exaequo - 1, c.cohorte)
         or c.entreprise = private.mon_entreprise() or private.est_admin()),
    c.categorie,
    -- Sur une ligne anonymisée, les totaux exacts sont retirés : ce sont des
    -- empreintes. Le brut, le retenu et l'effectif de référence suffisaient à
    -- rapprocher la ligne d'une entreprise nommée ailleurs. Reste ce qui sert à
    -- lire un classement : la position et la valeur normalisée, arrondie.
    case when private.nommable(c.visibilite, c.rang + c.exaequo - 1, c.cohorte)
              or c.entreprise = private.mon_entreprise() or private.est_admin()
         then c.brut end,
    case when private.nommable(c.visibilite, c.rang + c.exaequo - 1, c.cohorte)
              or c.entreprise = private.mon_entreprise() or private.est_admin()
         then c.retenu end,
    case when private.nommable(c.visibilite, c.rang + c.exaequo - 1, c.cohorte)
              or c.entreprise = private.mon_entreprise() or private.est_admin()
         then c.effectif_reference end,
    round(c.retenu::numeric / c.effectif_reference, 1),
    c.rang, c.cohorte
  from classe c
$$;

-- Un décile n'a aucun sens sur une poignée d'entreprises : sous dix, on ne le
-- calcule pas, plutôt que d'afficher « top 10 % » à un peloton de trois.
-- Même règle : un décile est une position, et une position rendue pour un
-- identifiant arbitraire est un moyen de situer les autres.
create or replace function public.decile_entreprise(p_entreprise uuid, p_saison uuid)
returns integer
language sql stable security definer set search_path = '' as $$
  select case when c.cohorte >= 10
              then ceil((c.rang::numeric / c.cohorte) * 10)::integer end
    from public.classement_saison(p_saison) c
   where c.entreprise = p_entreprise
     and (p_entreprise = private.mon_entreprise()
          or private.dans_mon_groupe(p_entreprise)
          or private.est_admin())
$$;

-- ---------------------------------------------------------------- réalisations
-- Confirmé et estimé, séparés jusqu'au bout.
create or replace function public.realisations(
  p_entreprise uuid default null, p_association uuid default null,
  p_saison uuid default null)
returns table (unite public.unite_realisation, confirme numeric, estime numeric,
               missions bigint, sans_reponse bigint)
language sql stable security definer set search_path = '' as $$
  select a.impact_unite,
         sum(case when m.etat = 'validee' and m.realise_confirme is not null
                  then m.realise_confirme else 0 end),
         sum(case when m.etat = 'validee' and m.realise_confirme is not null
                  then 0 else round(m.quantite * a.impact_par_unite) end),
         count(*) filter (where m.etat = 'validee' and m.realise_confirme is not null),
         count(*) filter (where m.etat = 'validee_auto' or m.realise_confirme is null)
    from public.mission m
    join public.annonce a on a.id = m.annonce
   where m.etat in ('validee','validee_auto')
     and a.impact_unite is not null
     -- Les dons personnels ne sont pas des réalisations de l'employeur. Sans ce
     -- filtre, la fonction les agrégeait dans ses chiffres, à rebours de
     -- `points_entreprise` — et donnait, par différence, ce que le seuil
     -- d'agrégation des dons personnels est censé rendre inaccessible.
     and m.origine = 'entreprise'
     and (p_entreprise  is null or m.entreprise = p_entreprise)
     and (p_association is null or a.association = p_association)
     and (p_saison      is null or a.saison = p_saison)
     -- Le total du réseau est public ; le détail d'une entreprise nommée ne
     -- l'est pas. Un visiteur ne peut donc pas cibler une entreprise.
     and (p_entreprise is null
          or p_entreprise = private.mon_entreprise()
          or private.dans_mon_groupe(p_entreprise)
          or private.est_admin())
   group by a.impact_unite
$$;

-- ---------------------------------------------------------------- sièges
create or replace function private.sieges_pris(p_abonnement uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.affectation_siege s
   where s.abonnement = p_abonnement and s.liberee_le is null
$$;

-- ---------------------------------------------------------------- invitation
-- Seize octets tirés du générateur cryptographique, présentés une seule fois,
-- stockés uniquement sous forme de condensat. Le préfixe visible sert à
-- reconnaître le lien dans l'interface, jamais à le deviner.
create or replace function public.creer_invitation(p_places integer, p_jours integer default 60)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_ent uuid := private.mon_entreprise();
  v_code text;
  v_indice text;
begin
  if v_ent is null or private.mon_role() <> 'entreprise_admin' then
    raise exception 'Réservé à l''administrateur de l''entreprise' using errcode = '42501';
  end if;
  if p_places is null or p_places <= 0 or p_places > 100000 then
    raise exception 'Nombre de places invalide' using errcode = '22023';
  end if;
  if p_jours is null or p_jours <= 0 or p_jours > 365 then
    raise exception 'Durée invalide' using errcode = '22023';
  end if;

  v_code := replace(replace(replace(
              encode(extensions.gen_random_bytes(16), 'base64'), '+', '-'), '/', '_'), '=', '');
  v_indice := substr(v_code, 1, 6);

  update public.invitation i set active = false
   where i.entreprise = v_ent and i.active;

  insert into public.invitation (entreprise, empreinte, indice, places, cree_par, expire_le)
  values (v_ent, extensions.digest(v_code, 'sha256'), v_indice, p_places,
          auth.uid(), now() + make_interval(days => p_jours));

  insert into public.acces (entreprise, profil, quoi, indice)
  values (v_ent, auth.uid(), 'creation_lien', v_indice);

  return v_code;    -- montré une fois, jamais relisible
end $$;

-- ---------------------------------------------------------------- quotas de site
-- Le quota est une ressource finie : la somme allouée aux établissements ne peut
-- pas dépasser les places du contrat. Sans cette borne, le premier site servi
-- mange les places des autres et le référent de Marseille découvre en septembre
-- qu'il n'a plus de comptes.
--
-- Et l'allocation ne se fait pas depuis une table : `etablissement.quota` n'est
-- accordé en écriture à personne. Une colonne modifiable depuis le navigateur,
-- c'est un abonnement qu'on s'agrandit soi-même.
create or replace function public.allouer_quota(p_etablissement uuid, p_places integer)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_ent uuid := private.mon_entreprise();
  v_societe uuid;
  v_total integer;
  v_alloue integer;
  v_pris integer;
begin
  if v_ent is null or private.mon_role() <> 'entreprise_admin' then
    raise exception 'Réservé à l''administrateur de la société' using errcode = '42501';
  end if;
  if p_places is null or p_places < 0 or p_places > 100000 then
    raise exception 'Nombre de places invalide' using errcode = '22023';
  end if;

  select et.societe into v_societe
    from public.etablissement et where et.id = p_etablissement;
  if v_societe is null or v_societe <> v_ent then
    raise exception 'Établissement hors de votre société' using errcode = '42501';
  end if;

  select ab.sieges into v_total
    from public.abonnement ab
   where ab.entreprise = v_ent and ab.saison = private.saison_ouverte();
  if v_total is null then
    raise exception 'Aucun abonnement ouvert pour cette société' using errcode = '22023';
  end if;

  select coalesce(sum(et.quota), 0) into v_alloue
    from public.etablissement et
   where et.societe = v_ent and et.id <> p_etablissement;

  if v_alloue + p_places > v_total then
    raise exception 'Le contrat ouvre % places, % sont déjà allouées ailleurs',
      v_total, v_alloue using errcode = '22023';
  end if;

  select count(*) into v_pris
    from private.appartenance a
   where a.etablissement = p_etablissement and a.actif and not a.pseudonymise;
  if p_places < v_pris then
    raise exception '% comptes sont déjà ouverts sur ce site', v_pris using errcode = '22023';
  end if;

  update public.etablissement et set quota = p_places where et.id = p_etablissement;

  insert into public.acces (entreprise, profil, quoi, indice)
  values (v_ent, auth.uid(), 'quota_site', p_places::text);
  return p_places;
end $$;

-- Déclarer un site. Sans cette fonction, une société qui vient d'ouvrir son
-- compte n'a aucun établissement : la collecte d'indicateurs n'a personne à qui
-- demander, et l'écran des quotas n'affiche rien. Le jeu de démonstration le
-- masquait, parce qu'il arrive avec ses sites déjà en place.
--
-- L'effectif du site est déclaré par le client, contrairement à celui de la
-- société. Ce n'est pas une inconséquence : le classement entre sites est
-- interne à l'entreprise, il ne se compare à personne d'autre. Le garde-fou est
-- ailleurs — la somme des effectifs de sites ne peut pas dépasser celui de la
-- société, sans quoi le rapporté-au-salarié se truquerait en une saisie.
create or replace function public.creer_etablissement(
  p_nom text, p_ville text, p_siret text default null,
  p_effectif integer default 0, p_adresse text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_ent uuid := private.mon_entreprise();
  v_siret text := nullif(regexp_replace(coalesce(p_siret, ''), '[^0-9]', '', 'g'), '');
  v_effectif integer := greatest(0, coalesce(p_effectif, 0));
  v_total integer;
  v_place integer;
  v_id uuid;
begin
  if v_ent is null or private.mon_role() <> 'entreprise_admin' then
    raise exception 'Réservé à l''administrateur de la société' using errcode = '42501';
  end if;
  if coalesce(length(trim(p_nom)), 0) < 2 then
    raise exception 'Donnez un nom à ce site' using errcode = '22023';
  end if;
  if coalesce(length(trim(p_ville)), 0) < 1 then
    raise exception 'La ville est nécessaire' using errcode = '22023';
  end if;
  if v_siret is not null and (length(v_siret) <> 14 or not private.luhn_ok(v_siret)) then
    raise exception 'Ce SIRET ne peut pas exister' using errcode = '22023';
  end if;
  if v_siret is not null and exists (
       select 1 from public.etablissement et where et.siret = v_siret) then
    raise exception 'Ce SIRET est déjà déclaré sur un autre site' using errcode = '22023';
  end if;

  select e.effectif into v_total from public.entreprise e where e.id = v_ent;
  if coalesce(v_total, 0) > 0 then
    select coalesce(sum(et.effectif), 0) into v_place
      from public.etablissement et where et.societe = v_ent;
    if v_place + v_effectif > v_total then
      raise exception 'Votre société déclare % salariés et % sont déjà répartis',
        v_total, v_place using errcode = '22023';
    end if;
  end if;

  insert into public.etablissement (societe, nom, ville, siret, effectif, adresse)
  values (v_ent, trim(p_nom), trim(p_ville), v_siret, v_effectif,
          nullif(trim(coalesce(p_adresse, '')), ''))
  returning id into v_id;

  insert into public.acces (entreprise, profil, quoi, indice)
  -- `indice` est court par construction : douze caractères, pas un journal.
  values (v_ent, auth.uid(), 'site_declare', left(trim(p_ville), 12));
  return v_id;
end $$;

-- Corriger un site déclaré. Une ville mal orthographiée, un effectif qui change
-- au 1er janvier : supprimer puis recréer emporterait les saisies déjà faites.
-- Un paramètre laissé à NULL ne touche pas à la colonne.
create or replace function public.modifier_etablissement(
  p_etablissement uuid, p_nom text default null, p_ville text default null,
  p_siret text default null, p_effectif integer default null,
  p_adresse text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_ent uuid := private.mon_entreprise();
  v_siret text := nullif(regexp_replace(coalesce(p_siret, ''), '[^0-9]', '', 'g'), '');
  v_total integer;
  v_autres integer;
begin
  if v_ent is null or private.mon_role() <> 'entreprise_admin' then
    raise exception 'Réservé à l''administrateur de la société' using errcode = '42501';
  end if;
  if not exists (select 1 from public.etablissement et
                  where et.id = p_etablissement and et.societe = v_ent) then
    raise exception 'Établissement hors de votre société' using errcode = '42501';
  end if;
  if p_nom is not null and length(trim(p_nom)) < 2 then
    raise exception 'Donnez un nom à ce site' using errcode = '22023';
  end if;
  if p_ville is not null and length(trim(p_ville)) < 1 then
    raise exception 'La ville est nécessaire' using errcode = '22023';
  end if;
  if v_siret is not null then
    if length(v_siret) <> 14 or not private.luhn_ok(v_siret) then
      raise exception 'Ce SIRET ne peut pas exister' using errcode = '22023';
    end if;
    if exists (select 1 from public.etablissement et
                where et.siret = v_siret and et.id <> p_etablissement) then
      raise exception 'Ce SIRET est déjà déclaré sur un autre site' using errcode = '22023';
    end if;
  end if;
  if p_effectif is not null then
    if p_effectif < 0 then
      raise exception 'Un effectif ne peut pas être négatif' using errcode = '22023';
    end if;
    select e.effectif into v_total from public.entreprise e where e.id = v_ent;
    if coalesce(v_total, 0) > 0 then
      select coalesce(sum(et.effectif), 0) into v_autres
        from public.etablissement et
       where et.societe = v_ent and et.id <> p_etablissement;
      if v_autres + p_effectif > v_total then
        raise exception 'Votre société déclare % salariés : il en reste % à placer',
          v_total, v_total - v_autres using errcode = '22023';
      end if;
    end if;
  end if;

  update public.etablissement et set
    nom      = coalesce(nullif(trim(coalesce(p_nom, '')), ''), et.nom),
    ville    = coalesce(nullif(trim(coalesce(p_ville, '')), ''), et.ville),
    siret    = coalesce(v_siret, et.siret),
    effectif = coalesce(p_effectif, et.effectif),
    adresse  = coalesce(nullif(trim(coalesce(p_adresse, '')), ''), et.adresse)
  where et.id = p_etablissement;

  insert into public.acces (entreprise, profil, quoi, indice)
  values (v_ent, auth.uid(), 'site_modifie', left(p_etablissement::text, 12));
  return p_etablissement;
end $$;

-- Le lien qui fait d'une personne le référent d'un site. Nominatif, à usage
-- unique, trente jours. Il ne crée pas de compte tout seul : il autorise une
-- adresse précise à en ouvrir un, sur un site précis, et sur rien d'autre.
create or replace function public.creer_invitation_referent(
  p_etablissement uuid, p_nom text, p_mail text)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_ent uuid := private.mon_entreprise();
  v_societe uuid;
  v_code text;
begin
  if v_ent is null or private.mon_role() <> 'entreprise_admin' then
    raise exception 'Réservé à l''administrateur de la société' using errcode = '42501';
  end if;
  if coalesce(length(trim(p_nom)), 0) < 2 or p_mail !~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$' then
    raise exception 'Un lien de référent est nominatif : nom et adresse' using errcode = '22023';
  end if;
  select et.societe into v_societe from public.etablissement et where et.id = p_etablissement;
  if v_societe is null or v_societe <> v_ent then
    raise exception 'Établissement hors de votre société' using errcode = '42501';
  end if;

  v_code := replace(replace(replace(
              encode(extensions.gen_random_bytes(16), 'base64'), '+', '-'), '/', '_'), '=', '');

  update public.invitation i set active = false
   where i.etablissement = p_etablissement and i.pour_referent and i.active;

  insert into public.invitation (entreprise, etablissement, pour_referent,
    destinataire_nom, destinataire_mail, empreinte, indice, places, cree_par, expire_le)
  values (v_ent, p_etablissement, true, trim(p_nom), lower(trim(p_mail)),
          extensions.digest(v_code, 'sha256'), substr(v_code, 1, 6), 1,
          auth.uid(), now() + interval '30 days');

  insert into public.acces (entreprise, profil, quoi, indice)
  values (v_ent, auth.uid(), 'lien_referent', substr(v_code, 1, 6));
  return v_code;
end $$;

-- L'acceptation. L'adresse est vérifiée contre `auth.users` : un lien nominatif
-- envoyé à quelqu'un ne doit pas pouvoir être utilisé par un autre, même s'il
-- circule. Et il ne confère jamais autre chose que le pilotage de son site.
create or replace function public.rejoindre_comme_referent(p_code text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_inv public.invitation;
  v_mail text := lower(auth.email());
begin
  if auth.uid() is null then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  select * into v_inv from public.invitation i
   where i.empreinte = extensions.digest(p_code, 'sha256')
     and i.pour_referent and i.active and i.expire_le > now();
  if v_inv.id is null then
    raise exception 'Lien invalide ou expiré' using errcode = '22023';
  end if;
  if v_mail is null or v_mail <> v_inv.destinataire_mail then
    raise exception 'Ce lien a été émis pour une autre adresse' using errcode = '42501';
  end if;
  if exists (select 1 from private.appartenance a where a.profil = auth.uid()) then
    raise exception 'Ce compte est déjà rattaché' using errcode = '22023';
  end if;

  insert into public.profil (id, nom) values (auth.uid(), v_inv.destinataire_nom)
    on conflict (id) do update set nom = excluded.nom;

  insert into private.appartenance (profil, role, entreprise, etablissement)
  values (auth.uid(), 'site_referent', v_inv.entreprise, v_inv.etablissement);

  update public.invitation i set active = false where i.id = v_inv.id;
  update public.etablissement et
     set referent_nom = v_inv.destinataire_nom, referent_mail = v_inv.destinataire_mail
   where et.id = v_inv.etablissement;

  insert into public.acces (entreprise, profil, quoi, indice)
  values (v_inv.entreprise, auth.uid(), 'referent_site', v_inv.indice);
  return v_inv.etablissement;
end $$;

-- ---------------------------------------------------------------- indicateurs
-- Ce qu'une campagne demande. Une campagne sans aucune rubrique demande tout :
-- c'est le comportement des campagnes ouvertes avant que les rubriques
-- existent, et elles ne doivent pas se vider du jour au lendemain.
create or replace function public.rubriques_de(p_campagne uuid) returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce(
    nullif(array(select cr.rubrique
                   from public.campagne_rubrique cr
                   join public.rubrique r on r.cle = cr.rubrique
                  where cr.campagne = p_campagne
                  order by r.ordre), '{}'),
    array(select r.cle from public.rubrique r where r.active order by r.ordre))
$$;

-- Les clés qu'un site doit renseigner pour cette campagne, dans l'ordre du
-- formulaire. C'est la même liste que celle qu'affiche l'application : elle est
-- lue ici plutôt que recopiée, parce qu'une liste recopiée finit par diverger.
create or replace function public.indicateurs_de(p_campagne uuid) returns setof public.indicateur
language sql stable security definer set search_path = '' as $$
  select i.* from public.indicateur i
   where i.active
     and i.rubrique = any (public.rubriques_de(p_campagne))
   order by i.ordre
$$;

-- Les rubriques ouvertes pour une entreprise. Aucune ligne veut dire « celles
-- par défaut » : une entreprise créée à l'instant a donc immédiatement les
-- bonnes sections, sans que personne ne recopie une liste.
create or replace function public.rubriques_entreprise(p_entreprise uuid) returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce(
    nullif(array(select er.rubrique
                   from public.entreprise_rubrique er
                   join public.rubrique r on r.cle = er.rubrique
                  where er.entreprise = p_entreprise and r.active
                  order by r.ordre), '{}'),
    array(select r.cle from public.rubrique r where r.active and r.defaut order by r.ordre))
$$;

-- Ouvrir une collecte. Ce que la RPC fixe elle-même et qui ne se négocie pas :
-- le groupe (celui de l'appelant), l'état, la date d'ouverture. Ce qu'elle
-- refuse : une période non terminée — les sites n'auraient rien à déclarer et
-- inventeraient ou se tairaient, deux réponses qui se ressemblent une fois
-- dans la base — et une échéance déjà passée.
create or replace function public.ouvrir_campagne(
  p_libelle text, p_periode text, p_debut date, p_fin date, p_echeance date,
  p_rubriques text[])
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_groupe uuid := private.mon_groupe();
  v_ent uuid := private.mon_entreprise();
  v_id uuid;
  v_n integer;
begin
  if private.mon_role() <> 'entreprise_admin' then
    raise exception 'Réservé à la société' using errcode = '42501';
  end if;
  if v_groupe is null and v_ent is null then
    raise exception 'Ce compte n''est rattaché à aucun périmètre' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_libelle, ''))) < 3 then
    raise exception 'Donnez un nom à la période' using errcode = '22023';
  end if;
  if p_fin < p_debut then
    raise exception 'La fin de la période précède son début' using errcode = '22023';
  end if;
  if p_fin > current_date then
    raise exception 'Cette période n''est pas terminée : les sites n''auraient rien à déclarer'
      using errcode = '22023';
  end if;
  if p_echeance <= current_date then
    raise exception 'L''échéance est déjà passée' using errcode = '22023';
  end if;
  select count(*) into v_n from public.rubrique r
   where r.active and r.cle = any (coalesce(p_rubriques, '{}'));
  if v_n = 0 then
    raise exception 'Choisissez au moins une rubrique à demander' using errcode = '22023';
  end if;

  insert into public.campagne_indicateurs
    (groupe, entreprise, periode, libelle, debut, fin, echeance)
  values (v_groupe, case when v_groupe is null then v_ent end,
          btrim(p_periode), btrim(p_libelle), p_debut, p_fin, p_echeance)
  returning id into v_id;

  insert into public.campagne_rubrique (campagne, rubrique)
  select v_id, r.cle from public.rubrique r
   where r.active and r.cle = any (p_rubriques);

  return v_id;
end $$;

-- Le contributeur saisit. L'approbateur verrouille. Deux gestes, et deux
-- personnes : sans cette séparation, un chiffre entre dans un document
-- contractuel sans que personne ne l'ait regardé.
create or replace function public.saisir_indicateurs(
  p_campagne uuid, p_etablissement uuid, p_valeurs jsonb,
  p_commentaire text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_ent uuid := private.mon_entreprise();
  v_role public.role_utilisateur := private.mon_role();
  v_societe uuid;
  v_id uuid;
  v_etat public.etat_collecte;
  v_version integer;
  v_ecarts jsonb;
  v_inconnues text;
  v_mot text := btrim(coalesce(p_commentaire, ''));
begin
  if v_ent is null or v_role not in ('entreprise_admin','site_referent') then
    raise exception 'Réservé à la société ou au référent du site' using errcode = '42501';
  end if;
  select et.societe into v_societe from public.etablissement et where et.id = p_etablissement;
  if v_societe is null or v_societe <> v_ent then
    raise exception 'Établissement hors de votre société' using errcode = '42501';
  end if;
  if v_role = 'site_referent' and private.mon_etablissement() <> p_etablissement then
    raise exception 'Vous ne saisissez que pour votre site' using errcode = '42501';
  end if;
  if not exists (select 1 from public.campagne_indicateurs c
                  where c.id = p_campagne and c.close_le is null) then
    raise exception 'Cette campagne est close' using errcode = '22023';
  end if;
  -- Des agrégats, jamais des personnes : le jsonb ne doit contenir que des nombres.
  if exists (select 1 from jsonb_each(p_valeurs) e
              where jsonb_typeof(e.value) not in ('number','null')) then
    raise exception 'Seules des valeurs numériques sont acceptées' using errcode = '22023';
  end if;
  -- Et seulement des clés du catalogue, appartenant à une rubrique que CETTE
  -- campagne demande. Une clé inconnue qui entre est une colonne qui n'existe
  -- nulle part, qui ne s'additionne pas, et qu'on retrouve six mois plus tard
  -- dans un export sans savoir qui l'a écrite ni ce qu'elle voulait dire.
  select string_agg(e.key, ', ') into v_inconnues
    from jsonb_each(p_valeurs) e
   where not exists (select 1 from public.indicateur i
                      where i.cle = e.key and i.active and i.nature = 'collecte'
                        and i.rubrique = any (public.rubriques_de(p_campagne)));
  if v_inconnues is not null then
    raise exception 'Clés hors du catalogue de cette collecte : %', v_inconnues
      using errcode = '22023';
  end if;

  select o.id, o.etat, o.version into v_id, v_etat, v_version
    from public.observation_indicateur o
   where o.campagne = p_campagne and o.etablissement = p_etablissement;

  -- Le refus porte sur l'absence d'explication, jamais sur la valeur. Une
  -- plateforme qui rejetterait un chiffre parce qu'il bouge trop finirait par
  -- obtenir des chiffres qui ne bougent pas.
  v_ecarts := private.ecarts_periode(p_campagne, p_etablissement,
    coalesce((select o.valeurs from public.observation_indicateur o where o.id = v_id),
             '{}'::jsonb) || p_valeurs);
  if jsonb_array_length(v_ecarts) > 0 and length(v_mot) < 10 then
    raise exception 'Variation de plus de % %% sur % indicateur(s) calculé(s) : expliquez en une phrase. Un événement réel et une erreur de saisie se ressemblent exactement dans une base.',
      round(private.seuil_ecart() * 100), jsonb_array_length(v_ecarts)
      using errcode = '22023';
  end if;

  if v_id is null then
    insert into public.observation_indicateur
      (campagne, etablissement, etat, valeurs, saisi_par, saisi_le, commentaire, ecarts)
    values (p_campagne, p_etablissement, 'declare', p_valeurs, auth.uid(), now(),
            nullif(v_mot, ''), v_ecarts)
    returning id into v_id;
  else
    -- Corriger une valeur approuvée produit une version, jamais un écrasement.
    update public.observation_indicateur o
       set valeurs = o.valeurs || p_valeurs,
           etat = 'declare',
           version = case when v_etat = 'approuve' then o.version + 1 else o.version end,
           saisi_par = auth.uid(), saisi_le = now(),
           commentaire = coalesce(nullif(v_mot, ''), o.commentaire),
           ecarts = v_ecarts,
           approuve_par = null, approuve_le = null, maj_le = now()
     where o.id = v_id;
  end if;
  return v_id;
end $$;

create or replace function public.approuver_indicateurs(
  p_campagne uuid, p_etablissement uuid)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_ent uuid := private.mon_entreprise();
  v_o public.observation_indicateur;
begin
  if v_ent is null or private.mon_role() <> 'entreprise_admin' then
    raise exception 'L''approbation appartient à la société, pas au site' using errcode = '42501';
  end if;
  select o.* into v_o from public.observation_indicateur o
   where o.campagne = p_campagne and o.etablissement = p_etablissement;
  if v_o.id is null then
    raise exception 'Rien à approuver pour ce site' using errcode = '22023';
  end if;
  if v_o.etat <> 'declare' then
    raise exception 'Seule une saisie déclarée s''approuve' using errcode = '22023';
  end if;
  if v_o.saisi_par = auth.uid() then
    raise exception 'La personne qui a saisi ne peut pas approuver sa propre saisie'
      using errcode = '42501';
  end if;
  if not exists (select 1 from public.etablissement et
                  where et.id = p_etablissement and et.societe = v_ent) then
    raise exception 'Établissement hors de votre société' using errcode = '42501';
  end if;

  update public.observation_indicateur o
     set etat = 'approuve', approuve_par = auth.uid(), approuve_le = now(), maj_le = now()
   where o.id = v_o.id;
  return v_o.id;
end $$;

-- Une seule porte d'entrée. L'adresse vient de `auth.users`, jamais d'un
-- paramètre : sinon il suffit de prétendre s'appeler quelqu'un@client.fr.
create or replace function public.rejoindre_entreprise(p_code text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_inv    public.invitation;
  v_abo    public.abonnement;
  v_email  text := auth.email();
  v_dom    text;
  v_num    integer;
  v_uid    uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  if v_email is null or position('@' in v_email) = 0 then
    raise exception 'Adresse professionnelle introuvable' using errcode = '42501';
  end if;
  v_dom := lower(split_part(v_email, '@', 2));

  -- Le verrou porte sur l'invitation ET sur l'abonnement : deux inscriptions
  -- simultanées ne peuvent plus voir le même siège libre.
  select * into v_inv from public.invitation i
   where i.empreinte = extensions.digest(p_code, 'sha256')
     for update;
  if not found or not v_inv.active or v_inv.expire_le < now() then
    raise exception 'Lien invalide ou expiré' using errcode = '42501';
  end if;

  -- Une entreprise sans domaine déclaré n'accepte personne : une liste vide
  -- valait « tout le monde », ce qui est l'inverse d'un contrôle.
  if not exists (select 1 from private.domaine_entreprise d
                  where d.entreprise = v_inv.entreprise and d.domaine = v_dom) then
    raise exception 'Cette adresse n''appartient pas à l''entreprise' using errcode = '42501';
  end if;

  select * into v_abo from public.abonnement a
   where a.entreprise = v_inv.entreprise
     and a.saison = private.saison_ouverte()
     for update;
  if not found then
    raise exception 'Aucun abonnement actif pour la saison en cours' using errcode = '42501';
  end if;

  select coalesce(max(s.numero), 0) + 1 into v_num
    from public.affectation_siege s where s.abonnement = v_abo.id;
  if v_num > least(v_abo.sieges, v_inv.places) then
    raise exception 'Toutes les places sont prises' using errcode = '23514';
  end if;

  insert into public.profil (id, nom) values (v_uid, split_part(v_email, '@', 1))
    on conflict (id) do nothing;
  -- Le rôle est imposé ici. Le client ne le propose même pas.
  insert into private.appartenance (profil, role, entreprise)
  values (v_uid, 'salarie', v_inv.entreprise)
    on conflict (profil) do nothing;

  insert into public.affectation_siege (abonnement, numero, profil, invitation)
  values (v_abo.id, v_num, v_uid, v_inv.id);

  insert into public.acces (entreprise, profil, quoi, indice)
  values (v_inv.entreprise, v_uid, 'inscription', v_inv.indice);

  return v_inv.entreprise;
end $$;

-- ---------------------------------------------------------------- annonces
create or replace function public.publier_annonce(
  p_titre text, p_description text, p_type public.type_annonce,
  p_quantite integer, p_date date, p_lieu text,
  p_temps_travail boolean default false,
  p_impact_unite public.unite_realisation default null,
  p_impact_par_unite numeric default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_asso public.association;
  v_saison uuid := private.saison_ouverte();
  v_id uuid;
begin
  select * into v_asso from public.association a where a.id = private.mon_association();
  if not found then
    raise exception 'Réservé aux associations' using errcode = '42501';
  end if;
  -- Une association non vérifiée ou suspendue ne publie pas. La policy seule ne
  -- suffisait pas : elle laissait insérer directement une annonce ouverte.
  if not v_asso.valide or v_asso.suspendue then
    raise exception 'Association non vérifiée ou suspendue' using errcode = '42501';
  end if;
  if v_saison is null then
    raise exception 'Aucune saison ouverte' using errcode = '42501';
  end if;
  -- Le temps de travail engage le mécénat de compétences : sans éligibilité au
  -- régime, la case ne peut pas être cochée.
  if p_temps_travail and not v_asso.eligible_mecenat then
    raise exception 'Association non éligible au mécénat de compétences' using errcode = '42501';
  end if;

  insert into public.annonce (association, saison, type, titre, description, lieu,
    temps_travail, quantite, restant, date_prevue, etat, impact_unite, impact_par_unite)
  values (v_asso.id, v_saison, p_type, p_titre, p_description, p_lieu,
    coalesce(p_temps_travail, false), p_quantite, p_quantite, p_date, 'ouverte',
    p_impact_unite, p_impact_par_unite)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.fermer_annonce(p_annonce uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.annonce a set etat = 'close'
   where a.id = p_annonce
     and (a.association = private.mon_association() or private.est_admin());
  if not found then
    raise exception 'Annonce introuvable ou non autorisée' using errcode = '42501';
  end if;
end $$;

-- ---------------------------------------------------------------- missions
-- L'état, les points, l'entreprise et le salarié sont fixés ici. Le client
-- pouvait auparavant insérer `etat = 'validee'` et se choisir ses points.
-- La signature a gagné un paramètre : sans ce drop, l'ancienne version à trois
-- arguments survivrait au rejeu et un appel ambigu pourrait la choisir — donc
-- engager une mise à disposition sans trace de consentement.
drop function if exists public.engager_mission(uuid, numeric, text);
-- ---------------------------------------------- le texte du consentement, ici
-- Un horodatage prouve qu'une case a été cochée. Il ne dit pas à QUOI. Or c'est
-- exactement la question posée en contentieux : le salarié a-t-il accepté cette
-- mission-là, ces dates-là, auprès de cet organisme-là ? L'article R. 8241-2 du
-- code du travail exige un accord exprès et écrit ; « exprès » qualifie le
-- contenu, pas la vitesse du clic.
--
-- Le texte est donc composé ICI, côté serveur, à partir de l'annonce. Il n'est
-- jamais envoyé par le client : une phrase fournie par le navigateur serait une
-- phrase que l'utilisateur peut réécrire, et un consentement rédigé par celui
-- qui le recueille ne prouve rien. Le client affiche la même phrase parce qu'il
-- applique le même gabarit, pas parce qu'il la transmet.
-- Elle n'est pas SECURITY DEFINER : elle ne doit rien pouvoir faire d'autre que
-- composer une phrase. Elle est appelée depuis engager_mission, qui s'exécute
-- déjà au nom de riseva_definer.
create or replace function private.texte_consentement(p_annonce uuid)
returns text
language sql stable set search_path = '' as $$
  select 'Je donne mon accord exprès à cette mise à disposition sur mon temps de '
      || 'travail : « ' || a.titre || ' », au profit de ' || asso.nom
      || coalesce(', le ' || to_char(a.date_prevue, 'DD/MM/YYYY'), '')
      || coalesce(' à ' || a.lieu, '')
      || '. Je sais que mon contrat de travail se poursuit sans changement '
      || 'pendant toute la durée de la mise à disposition, que je peux refuser '
      || 'sans que ce refus constitue une faute ni un motif de sanction, et que '
      || 'mon employeur reste mon employeur.'
    from public.annonce a
    join public.association asso on asso.id = a.association
   where a.id = p_annonce
$$;

create or replace function public.engager_mission(
  p_annonce uuid, p_quantite numeric, p_cle text default null,
  p_consentement boolean default false)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_a public.annonce;
  v_ent uuid := private.mon_entreprise();
  v_uid uuid := auth.uid();
  v_id uuid;
  v_texte text;
begin
  if v_ent is null or private.mon_role() not in ('salarie','entreprise_admin') then
    raise exception 'Réservé aux salariés de l''entreprise' using errcode = '42501';
  end if;
  select * into v_a from public.annonce a where a.id = p_annonce for update;
  if not found or v_a.etat <> 'ouverte' then
    raise exception 'Annonce fermée ou introuvable' using errcode = '42501';
  end if;
  if p_quantite is null or p_quantite <= 0 or p_quantite > v_a.restant then
    raise exception 'Quantité indisponible' using errcode = '23514';
  end if;
  -- Un don en argent ne s'ENGAGE pas : il s'annonce, se vire, et se confirme par
  -- l'association qui l'a recu. Le moteur du navigateur le refusait, la RPC non :
  -- un appel direct creditait donc des points sur une promesse de virement que
  -- personne ne confirmerait par le circuit prevu. Une regle qui n'existe que
  -- dans le navigateur n'est pas une regle.
  if v_a.type = 'don_financier' then
    raise exception 'Un don en argent passe par une intention de virement, pas par un engagement'
      using errcode = '23514';
  end if;
  if p_quantite <> floor(p_quantite) then
    raise exception 'Cette annonce se compte en unités entières' using errcode = '23514';
  end if;
  if not exists (select 1 from public.abonnement ab
                  where ab.entreprise = v_ent and ab.saison = v_a.saison) then
    raise exception 'Aucun abonnement pour la saison de cette annonce' using errcode = '42501';
  end if;
  -- L'éligibilité se revérifie ICI, pas seulement à la publication. L'article
  -- L. 8241-3 n'autorise le prêt gratuit qu'au profit des organismes visés aux a à g
  -- du 1 de l'article 238 bis. Si l'association a perdu cette qualité entre la
  -- publication et l'engagement, la mise à disposition retombe sous l'interdiction
  -- de l'article L. 8241-1 : c'est un délit pour l'entreprise cliente, pas une
  -- erreur de saisie. Une annonce ouverte n'est pas une autorisation permanente.
  if v_a.temps_travail and not exists (
       select 1 from public.association asso
        where asso.id = v_a.association and asso.eligible_mecenat) then
    raise exception 'Cette association ne déclare plus son éligibilité au mécénat de compétences : hors du régime de l''article L. 8241-3, la mise à disposition serait un prêt de main-d''oeuvre illicite'
      using errcode = '42501';
  end if;
  -- Deux fois sur la même annonce. Un pouce qui appuie deux fois, ou un salarié
  -- qui retombe sur l'annonce trois écrans plus bas sans reconnaître qu'il s'y
  -- est déjà mis : la place partait deux fois et l'association voyait deux
  -- inscriptions du même nom. La quantité existe pour prendre plusieurs places
  -- d'un coup. Un engagement refusé ou annulé ne compte pas : celui-là se
  -- reprend. Même règle que dans le moteur du navigateur, écrite ici aussi,
  -- parce qu'une règle qui n'existe que dans le navigateur n'est pas une règle.
  if exists (select 1 from public.mission m
              where m.annonce = p_annonce and m.salarie = v_uid
                and m.etat not in ('refusee','annulee')) then
    raise exception 'Vous êtes déjà positionné sur cette annonce' using errcode = '23505';
  end if;

  -- Une mise à disposition sur le temps de travail exige l'accord exprès, écrit et
  -- spécifique du salarié à CETTE mission (article R. 8241-2 du code du travail).
  -- Une acceptation générale des conditions d'utilisation ne le remplace pas. Sans
  -- lui, la convention de mécénat de compétences n'a pas de base et le prêt de
  -- main-d'œuvre redevient illicite : on refuse ici, pas au moment d'imprimer.
  if v_a.temps_travail and coalesce(p_consentement, false) is not true then
    raise exception 'Votre accord explicite est nécessaire pour une mission sur le temps de travail'
      using errcode = '42501';
  end if;

  -- On fige le texte accepté, et son empreinte. Le texte parce qu'il faut
  -- pouvoir le produire ; l'empreinte parce que si le gabarit change l'an
  -- prochain, c'est elle qui dit lequel des deux textes le salarié avait sous
  -- les yeux. Les deux sont écrits dans la même transaction que la mission :
  -- un consentement recueilli « juste après » n'est pas un consentement
  -- préalable.
  if v_a.temps_travail then
    v_texte := private.texte_consentement(p_annonce);
  end if;

  insert into public.mission (annonce, entreprise, salarie, etat, quantite, points,
                              date_mission, cle_idempotence, consentement_le,
                              consentement_texte, consentement_empreinte)
  values (p_annonce, v_ent, v_uid, 'engagee', p_quantite,
          private.points_pour(v_a.saison, v_a.type, p_quantite),
          coalesce(v_a.date_prevue, current_date), p_cle,
          case when v_a.temps_travail then clock_timestamp() end,
          v_texte,
          case when v_texte is not null
               then extensions.digest(v_texte, 'sha256') end)
  returning id into v_id;

  update public.annonce a set restant = a.restant - p_quantite where a.id = p_annonce;
  return v_id;
end $$;

create or replace function public.declarer_mission(p_mission uuid, p_propose numeric default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_m public.mission;
begin
  select * into v_m from public.mission m
   where m.id = p_mission and m.salarie = auth.uid() for update;
  if not found or v_m.etat <> 'engagee' then
    raise exception 'Mission introuvable ou déjà déclarée' using errcode = '42501';
  end if;
  update public.mission m
     set etat = 'a_valider', declaree_le = now(), realise_propose = p_propose
   where m.id = p_mission;
end $$;

-- L'association tranche, et elle seule. Le chiffre réalisé n'est enregistré que
-- si elle valide : une validation automatique donne des points, jamais une
-- réalisation confirmée.
create or replace function public.trancher_mission(
  p_mission uuid, p_ok boolean, p_realise numeric default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_m public.mission;
  v_a public.annonce;
begin
  select m.* into v_m from public.mission m where m.id = p_mission for update;
  if not found then
    raise exception 'Mission introuvable' using errcode = '42501';
  end if;
  select a.* into v_a from public.annonce a where a.id = v_m.annonce;
  if v_a.association is distinct from private.mon_association() and not private.est_admin() then
    raise exception 'Réservé à l''association bénéficiaire' using errcode = '42501';
  end if;
  if v_m.etat <> 'a_valider' then
    raise exception 'Cette mission n''attend pas de réponse' using errcode = '42501';
  end if;

  if p_ok then
    update public.mission m
       set etat = 'validee', tranchee_le = now(),
           realise_confirme = case when v_a.impact_unite is null then null
                                   else coalesce(p_realise,
                                        round(m.quantite * v_a.impact_par_unite)) end
     where m.id = p_mission;
  else
    update public.mission m
       set etat = 'refusee', tranchee_le = now(), points = 0, realise_confirme = null
     where m.id = p_mission;
    update public.annonce a set restant = least(a.quantite, a.restant + v_m.quantite)
     where a.id = v_m.annonce;
  end if;
end $$;

-- ---------------------------------------------------------------- dons agrégés
-- L'employeur ne voit jamais un don personnel rattaché à un nom, ni un agrégat
-- assez fin pour le reconstituer. Sous cinq donateurs distincts, rien ne sort —
-- pas même le total, qui permettrait une attaque par différence.
create or replace function public.dons_personnels_agreges(p_saison uuid)
returns table (donateurs integer, montant numeric, affichable boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_ent uuid := private.mon_entreprise();
  v_n integer;
  v_total numeric;
begin
  if v_ent is null then
    raise exception 'Réservé à une entreprise' using errcode = '42501';
  end if;
  select count(distinct m.salarie), coalesce(sum(d.montant), 0)
    into v_n, v_total
    from public.don d
    join public.mission m on m.id = d.mission
    join public.annonce a on a.id = m.annonce
   where d.origine = 'salarie'
     and m.entreprise = v_ent
     and a.saison = p_saison
     and d.etat = 'confirme';
  if v_n < 5 then
    return query select null::integer, null::numeric, false;
  else
    return query select v_n, v_total, true;
  end if;
end $$;

-- ---------------------------------------------------------------- paiements
-- Un don financier n'existe que si de l'argent a bougé. Cette fonction est le
-- seul chemin : elle est appelée par la fonction Edge qui reçoit le webhook du
-- prestataire de paiement, après vérification de la signature, et elle n'est
-- exécutable que par `service_role`. Sans elle, rien n'empêchait de valider une
-- mission financière sans la moindre ligne de paiement en face.
--
-- Elle est idempotente : un webhook rejoué retombe sur `(fournisseur, reference)`
-- et renvoie le don déjà enregistré, sans créer une seconde mission ni recompter
-- les points. Les prestataires rejouent, c'est leur métier ; c'est au receveur
-- de ne pas compter deux fois.
create or replace function public.confirmer_don(
  p_fournisseur text, p_reference text, p_annonce uuid,
  p_montant numeric, p_origine public.origine_don,
  p_salarie uuid default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_a public.annonce;
  v_ent uuid;
  v_don uuid;
  v_mission uuid;
begin
  -- Rejeu : on ressort le don existant, et on s'arrête là.
  select d.id into v_don from public.don d
   where d.fournisseur = p_fournisseur and d.reference = p_reference;
  if found then return v_don; end if;

  if p_montant is null or p_montant <= 0 then
    raise exception 'Montant invalide' using errcode = '22023';
  end if;

  select * into v_a from public.annonce a where a.id = p_annonce for update;
  if not found or v_a.type <> 'don_financier' then
    raise exception 'Annonce introuvable ou non financière' using errcode = '42501';
  end if;
  if v_a.etat <> 'ouverte' then
    raise exception 'Annonce fermée' using errcode = '42501';
  end if;

  if p_origine = 'entreprise' then
    if p_salarie is null then
      raise exception 'Un don d''entreprise est saisi par un salarié identifié' using errcode = '22023';
    end if;
    select a.entreprise into v_ent from private.appartenance a where a.profil = p_salarie;
    if v_ent is null then
      raise exception 'Salarié sans entreprise' using errcode = '42501';
    end if;
  end if;

  -- Un don personnel ne porte pas le nom de l'entreprise dans la donnée brute :
  -- la cause d'une association peut trahir une conviction ou un état de santé.
  insert into public.don (association, entreprise, origine, montant, etat,
                          fournisseur, reference, confirme_le)
  values (v_a.association, v_ent, p_origine, p_montant, 'confirme',
          p_fournisseur, p_reference, now())
  returning id into v_don;

  -- La mission qui porte les points. Un paiement confirmé vaut preuve : elle est
  -- validée d'emblée, mais elle ne produit aucune réalisation confirmée tant que
  -- l'association n'a pas déclaré ce que l'argent a permis de faire.
  insert into public.mission (annonce, entreprise, salarie, etat, quantite, points,
                              date_mission, declaree_le, tranchee_le, origine,
                              cle_idempotence)
  values (p_annonce,
          coalesce(v_ent, (select a.entreprise from private.appartenance a where a.profil = p_salarie)),
          p_salarie, 'validee', p_montant,
          private.points_pour(v_a.saison, 'don_financier', p_montant),
          current_date, now(), now(), p_origine,
          p_fournisseur || ':' || p_reference)
  returning id into v_mission;

  update public.don d set mission = v_mission where d.id = v_don;
  update public.annonce a set restant = greatest(0, a.restant - p_montant)
   where a.id = p_annonce;

  return v_don;
end $$;

-- ---------------------------------------------------------------- reçus
create or replace function public.emettre_recu(p_don uuid)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_d public.don;
  v_a public.association;
  v_num text;
  v_suite integer;
begin
  select * into v_d from public.don d where d.id = p_don;
  if not found or v_d.etat <> 'confirme' then
    raise exception 'Don introuvable ou non confirmé' using errcode = '42501';
  end if;
  -- Seule l'association bénéficiaire émet ses reçus. Sans ce contrôle, quiconque
  -- tenait l'identifiant d'un don émettait un reçu au nom d'une association et
  -- consommait sa numérotation — et c'est elle qui encourt l'amende de l'article
  -- 1740 A du CGI, pas celui qui a appelé la fonction.
  if v_d.association is distinct from private.mon_association()
     and not private.est_admin() then
    raise exception 'Réservé à l''association bénéficiaire' using errcode = '42501';
  end if;
  -- Le verrou sérialise la numérotation : deux reçus ne peuvent pas porter le
  -- même numéro, et aucun numéro n'est attribué côté navigateur.
  select * into v_a from public.association a where a.id = v_d.association for update;
  if not v_a.recus_actif then
    raise exception 'Cette association n''émet pas de reçus' using errcode = '42501';
  end if;
  -- Un reçu ne se prépare que sous mandat écrit : sans lui, Riseva n'a pas le
  -- droit d'agir au nom de l'association.
  if v_a.mandat_recus_le is null then
    raise exception 'Aucun mandat de préparation des reçus' using errcode = '42501';
  end if;

  select count(*) + 1 into v_suite from public.recu r where r.association = v_a.id;
  v_num := v_a.recu_prefixe || lpad(v_suite::text, 4, '0');

  insert into public.recu (don, association, numero, modele)
  values (p_don, v_a.id, v_num,
          case when v_d.origine = 'entreprise' then '16216*03' else '11580*05' end);
  return v_num;
end $$;

-- ---------------------------------------------------------------- départs
-- Ce n'est pas une anonymisation, et le nom de la fonction le dit désormais :
-- l'identifiant du compte survit dans les missions, donc la réidentification
-- par recoupement reste possible. On appelle cela une pseudonymisation, et la
-- suppression définitive est une autre fonction, réservée à Riseva.
create or replace function public.pseudonymiser_salarie(p_profil uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_ent uuid := private.mon_entreprise();
begin
  if private.mon_role() <> 'entreprise_admin' and not private.est_admin() then
    raise exception 'Réservé à l''administrateur' using errcode = '42501';
  end if;
  if not exists (select 1 from private.appartenance a
                  where a.profil = p_profil and a.entreprise = v_ent)
     and not private.est_admin() then
    raise exception 'Ce compte n''appartient pas à votre entreprise' using errcode = '42501';
  end if;

  update public.profil p set nom = 'Salarié retiré', maj_le = now() where p.id = p_profil;
  update private.appartenance a
     set actif = false, pseudonymise = true, retire_le = now(), maj_le = now()
   where a.profil = p_profil;
  update public.affectation_siege s set liberee_le = now()
   where s.profil = p_profil and s.liberee_le is null;
  -- Les traces d'accès d'un compte parti n'ont plus de finalité : on les
  -- rapproche de leur échéance au lieu d'attendre six mois.
  update public.acces c set purge_le = least(c.purge_le, now() + interval '30 days')
   where c.profil = p_profil and not c.legal_hold;
end $$;

-- Suppression définitive : Riseva seule, et après elle il ne reste que des
-- agrégats. `mission.salarie` passe à NULL grâce au ON DELETE SET NULL.
create or replace function public.supprimer_salarie(p_profil uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.est_admin() then
    raise exception 'Réservé à Riseva' using errcode = '42501';
  end if;
  delete from private.appartenance a where a.profil = p_profil;
  delete from public.profil p where p.id = p_profil;
  insert into private.journal_purge (ensemble, lignes, motif)
  values ('profil', 1, 'demande d''effacement');
end $$;

-- La fonction Edge d'effacement a besoin de savoir si l'appelant est Riseva,
-- sans lui donner accès au schéma privé pour autant. Elle ne renvoie qu'un
-- booléen sur l'appelant lui-même : rien qu'il ne sache déjà.
create or replace function public.suis_je_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select private.est_admin()
$$;

-- ---------------------------------------------------------------- modération
create or replace function public.signaler_annonce(
  p_annonce uuid, p_motif text, p_precisions text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  insert into public.signalement (annonce, auteur, motif, precisions)
  values (p_annonce, auth.uid(), p_motif, p_precisions)
  returning id into v_id;
  return v_id;
end $$;

-- DSA article 16 : la décision se motive, et la motivation part au signalant.
create or replace function public.decider_signalement(
  p_signalement uuid, p_decision text, p_motivation text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.est_admin() then
    raise exception 'Réservé à Riseva' using errcode = '42501';
  end if;
  if p_motivation is null or length(btrim(p_motivation)) < 10 then
    raise exception 'Une décision de modération se motive' using errcode = '23514';
  end if;
  update public.signalement s
     set decision = p_decision, motivation = p_motivation, decide_le = now()
   where s.id = p_signalement;
  if not found then
    raise exception 'Signalement introuvable' using errcode = '42501';
  end if;
end $$;

-- ---------------------------------------------------------------- vue publique
-- La RLS protège les lignes, pas les colonnes : `select *` sur `entreprise`
-- livrait le CA, le SIRET, l'adresse et le coût journalier moyen. Le public ne
-- voit plus qu'une projection.
-- La vue publique n'est PAS en `security_invoker` : elle s'exécute avec les
-- droits de son propriétaire, et c'est tout l'intérêt. En invoker, elle exigeait
-- un droit de lecture sur `public.entreprise`, donc une policy `using (true)`
-- pour la servir — et une policy permissive s'additionne en OU avec les autres,
-- ce qui ouvrait le CA, le SIRET et l'adresse de toutes les entreprises à
-- n'importe quel compte connecté. La vue est la frontière ; la table reste
-- fermée derrière.
create or replace view public.entreprise_publique as
  select e.id, e.nom, e.secteur, e.ville
    from public.entreprise e;

-- Les réglages qu'une association ne partage avec personne : qui signe ses reçus,
-- avec quelle qualité, sous quel mandat, et où en est sa numérotation. Sans
-- `security_invoker`, donc exécutée avec les droits de son propriétaire : c'est
-- la vue qui est la frontière, pas un droit sur la table.
create or replace view public.association_reglages as
  select a.id, a.recus_actif, a.signataire, a.qualite, a.recu_prefixe,
         a.mandat_recus_le, a.mandat_recus_nom, a.mandat_recus_qualite,
         a.mandat_recus_version
    from public.association a
   where a.id = private.mon_association() or private.est_admin();

-- ---------------------------------------------------------------------------
-- Contrôle au registre public
-- ---------------------------------------------------------------------------
-- Le navigateur interroge l'annuaire public — c'est une API ouverte, sans clé,
-- et la faire transiter par le serveur n'apporterait rien qu'une dépendance de
-- plus. En revanche la conclusion, elle, ne peut pas venir du client : elle est
-- recalculée ici à partir de la fiche brute, sinon il suffirait d'appeler la RPC
-- avec `etat => 'exact'` pour mettre en ligne n'importe quelle structure.
-- Sans accents, sans dépendre d'unaccent : l'extension n'est pas toujours
-- installable sur une base gérée, et une translation explicite se relit.
create or replace function public.sans_accents(p text)
returns text language sql immutable strict parallel safe set search_path = '' as $$
  select translate(p,
    'àáâãäåçèéêëìíîïñòóôõöùúûüýÿÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ',
    'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUY')
$$;

create or replace function private.mots_utiles(p text)
returns text[] language sql immutable parallel safe set search_path = '' as $$
  select coalesce(array(
    select distinct m
      from unnest(string_to_array(btrim(regexp_replace(
             upper(public.sans_accents(coalesce(p, ''))), '[^A-Z0-9]+', ' ', 'g')), ' ')) m
     where m <> ''
       and m not in ('ASSOCIATION','ASSOC','ASSO','LOI','1901','DE','DU','DES','LA','LE',
                     'LES','L','D','ET','POUR','EN','AU','AUX','UNION','COMITE')
     order by m), '{}'::text[])
$$;

-- Recouvrement de Jaccard sur les mots utiles, la même mesure que dans le
-- navigateur. Deux définitions différentes de « nom voisin » de part et d'autre
-- auraient donné deux verdicts pour la même association, et c'est l'association
-- qui aurait eu raison de ne plus rien croire.
create or replace function private.recouvrement(a text[], b text[])
returns numeric language sql immutable parallel safe set search_path = '' as $$
  select case
    when coalesce(array_length(a, 1), 0) = 0 or coalesce(array_length(b, 1), 0) = 0 then 0
    else cardinality(array(select unnest(a) intersect select unnest(b)))::numeric
       / cardinality(array(select unnest(a) union  select unnest(b)))::numeric
  end
$$;

create or replace function private.verdict_registre(
  p_association public.association, p_fiche jsonb)
returns text language plpgsql immutable set search_path = '' as $$
declare v_nom text[]; v_score numeric;
begin
  if p_fiche is null then return 'introuvable'; end if;
  if coalesce(p_fiche->>'etat', '') = 'C' then return 'fermee'; end if;

  v_nom := private.mots_utiles(coalesce(p_association.nom_juridique, p_association.nom, ''));
  v_score := greatest(
    private.recouvrement(v_nom, private.mots_utiles(p_fiche->>'nom')),
    private.recouvrement(v_nom, private.mots_utiles(p_fiche->>'nom_raison_sociale')),
    private.recouvrement(v_nom, private.mots_utiles(p_fiche->>'sigle')));

  if v_score = 1 then return 'exact'; end if;
  if v_score >= 0.5 then return 'proche'; end if;
  return 'different';
end $$;

-- L'association déclare elle-même son immatriculation : c'est la seule chose
-- qu'on lui demande, et elle lui évite d'envoyer le moindre justificatif.
create or replace function public.enregistrer_numeros_association(
  p_association uuid, p_siren text default null, p_rna text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_siren text := nullif(regexp_replace(coalesce(p_siren, ''), '\D', '', 'g'), '');
        v_rna   text := nullif(upper(btrim(coalesce(p_rna, ''))), '');
begin
  if p_association is distinct from private.mon_association() and not private.est_admin() then
    raise exception 'Réservé à l''association concernée' using errcode = '42501';
  end if;
  if v_siren is not null and (v_siren !~ '^[0-9]{9}$' or not private.luhn_ok(v_siren)) then
    raise exception 'Ce numéro SIREN ne peut pas exister : la clé de contrôle est fausse'
      using errcode = '22023';
  end if;
  if v_rna is not null and v_rna !~ '^W[0-9A-Z]{9}$' then
    raise exception 'Un numéro RNA s''écrit W suivi de neuf caractères' using errcode = '22023';
  end if;
  update public.association a
     set siren = coalesce(v_siren, a.siren), rna = coalesce(v_rna, a.rna)
   where a.id = p_association;
end $$;

-- Enregistre un contrôle. Réservé à Riseva : une association qui pourrait écrire
-- son propre verdict n'aurait plus de verdict du tout.
create or replace function public.controler_association(
  p_association uuid, p_fiche jsonb default null, p_panne boolean default false)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_a public.association; v_etat text; v_id uuid; v_ecarts jsonb := '[]'::jsonb;
begin
  if not private.est_admin() then
    raise exception 'Réservé à Riseva' using errcode = '42501';
  end if;
  select * into v_a from public.association a where a.id = p_association;
  if not found then raise exception 'Association inconnue' using errcode = '42704'; end if;

  if p_panne then v_etat := 'panne';
  elsif v_a.siren is null and p_fiche is null then v_etat := 'absent';
  else v_etat := private.verdict_registre(v_a, p_fiche);
  end if;

  if p_fiche is not null and coalesce(p_fiche->>'est_association', 'false') <> 'true' then
    v_ecarts := v_ecarts || jsonb_build_array(jsonb_build_object(
      'champ', 'nature', 'attendu', 'association',
      'registre', 'structure non signalée comme association'));
  end if;
  if p_fiche is not null and v_a.rna is not null and p_fiche->>'rna' is not null
     and upper(v_a.rna) <> upper(p_fiche->>'rna') then
    v_ecarts := v_ecarts || jsonb_build_array(jsonb_build_object(
      'champ', 'RNA', 'attendu', v_a.rna, 'registre', p_fiche->>'rna'));
  end if;

  insert into public.controle_association (association, par, etat, bloquant, numero, ecarts, fiche)
  values (p_association, auth.uid(), v_etat,
          v_etat in ('different','fermee','introuvable'), v_a.siren, v_ecarts, p_fiche)
  returning id into v_id;

  -- Un contrôle bloquant retire l'association de la vitrine. Ce n'est pas une
  -- sanction : c'est le refus d'exposer à des salariés une structure dont le
  -- registre dit qu'elle est fermée ou introuvable. Rien n'est effacé, et un
  -- contrôle refait la remet en ligne.
  if v_etat in ('fermee','introuvable') then
    update public.association a set valide = false where a.id = p_association;
  end if;
  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- Dons en argent : virement direct, sans jamais encaisser
-- ---------------------------------------------------------------------------
-- Riseva ne reçoit pas les fonds. Recevoir pour reverser, c'est fournir un
-- service de paiement au sens des articles L. 314-1 et L. 521-1 du code
-- monétaire et financier ; l'exercer sans agrément est puni de trois ans et
-- 375 000 € (art. L. 572-5). Le donateur vire donc directement à l'association,
-- avec une référence émise ici, et l'association confirme ce que sa banque a
-- crédité. Deux écritures, pas un centime en transit.

-- La référence portée par le virement. Elle est lue à voix haute, recopiée à la
-- main dans un formulaire de banque, parfois dictée au téléphone : l'alphabet
-- exclut donc 0/O, 1/I et les minuscules. L'unicité est garantie par l'index ;
-- en cas de collision on retire.
create or replace function private.reference_virement() returns text
language plpgsql volatile set search_path = '' as $$
declare a text := 'ACDEFGHJKLMNPQRSTUVWXYZ2345679'; s text := '';
begin
  for i in 1..8 loop
    s := s || substr(a, 1 + floor(random() * length(a))::int, 1);
  end loop;
  return 'RSV-' || substr(s, 1, 4) || '-' || substr(s, 5, 4);
end $$;

create or replace function public.enregistrer_iban(
  p_association uuid, p_iban text, p_bic text default null, p_titulaire text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_iban text := nullif(upper(replace(coalesce(p_iban, ''), ' ', '')), '');
begin
  if p_association is distinct from private.mon_association() and not private.est_admin() then
    raise exception 'Réservé à l''association concernée' using errcode = '42501';
  end if;
  if v_iban is not null and not private.iban_ok(v_iban) then
    raise exception 'Cet IBAN est incorrect : sa clé de contrôle ne tombe pas juste'
      using errcode = '22023';
  end if;
  update public.association a
     set iban = v_iban,
         bic = nullif(upper(replace(coalesce(p_bic, ''), ' ', '')), ''),
         titulaire_compte = nullif(btrim(coalesce(p_titulaire, '')), '')
   where a.id = p_association;
end $$;

create or replace function public.enregistrer_helloasso(p_association uuid, p_lien text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_association is distinct from private.mon_association() and not private.est_admin() then
    raise exception 'Réservé à l''association concernée' using errcode = '42501';
  end if;
  update public.association a set helloasso = nullif(btrim(coalesce(p_lien, '')), '')
   where a.id = p_association;
end $$;

create or replace function public.accepter_mandat_recus(
  p_association uuid, p_nom text, p_qualite text, p_version text default '2026.1')
returns void language plpgsql security definer set search_path = '' as $$
declare v_a public.association;
begin
  if p_association is distinct from private.mon_association() and not private.est_admin() then
    raise exception 'Réservé à l''association concernée' using errcode = '42501';
  end if;
  select * into v_a from public.association a where a.id = p_association;
  if not v_a.eligible_mecenat then
    raise exception 'Déclarez d''abord l''éligibilité au régime des articles 200 et 238 bis du CGI'
      using errcode = '42501';
  end if;
  if btrim(coalesce(p_nom, '')) = '' or btrim(coalesce(p_qualite, '')) = '' then
    raise exception 'Le mandat nomme la personne qui l''accorde et sa qualité' using errcode = '22023';
  end if;
  update public.association a
     set mandat_recus_le = current_date, mandat_recus_nom = btrim(p_nom),
         mandat_recus_qualite = btrim(p_qualite), mandat_recus_version = p_version
   where a.id = p_association;
end $$;

-- Révoquer n'efface rien de ce qui a été émis : ces reçus sont entre les mains
-- de donateurs, et l'association les conserve six ans (art. L. 102 B du LPF).
create or replace function public.revoquer_mandat_recus(p_association uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_association is distinct from private.mon_association() and not private.est_admin() then
    raise exception 'Réservé à l''association concernée' using errcode = '42501';
  end if;
  update public.association a
     set mandat_recus_le = null, mandat_recus_nom = null,
         mandat_recus_qualite = null, mandat_recus_version = null,
         recus_actif = false
   where a.id = p_association;
end $$;

create or replace function public.declarer_intention_don(
  p_annonce uuid, p_montant numeric, p_origine public.origine_don default 'salarie')
returns public.intention_don
language plpgsql security definer set search_path = '' as $$
declare v_an public.annonce; v_a public.association; v_ent uuid; v_i public.intention_don;
begin
  if private.moi() is null then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  select * into v_an from public.annonce a where a.id = p_annonce;
  if not found or v_an.type <> 'don_financier' or v_an.etat <> 'ouverte' then
    raise exception 'Annonce indisponible' using errcode = '42501';
  end if;
  select * into v_a from public.association a where a.id = v_an.association;
  if v_a.iban is null or not v_a.valide or v_a.suspendue then
    raise exception 'Cette association ne peut pas recevoir de virement pour l''instant'
      using errcode = '42501';
  end if;
  if p_montant is null or p_montant < 5 then
    raise exception 'Le minimum est de 5 €' using errcode = '22023';
  end if;

  -- Un don au nom de l'entreprise n'est déclarable que par qui l'engage.
  if p_origine = 'entreprise' then
    if private.mon_role() <> 'entreprise_admin' then
      raise exception 'Seul un administrateur de l''entreprise engage un don d''entreprise'
        using errcode = '42501';
    end if;
    v_ent := private.mon_entreprise();
  end if;

  insert into public.intention_don (annonce, association, salarie, entreprise, origine,
                                    montant, reference, expire_le)
  values (p_annonce, v_an.association, auth.uid(), v_ent, p_origine, p_montant,
          private.reference_virement(), current_date + 30)
  returning * into v_i;
  return v_i;
end $$;

-- L'association confirme ce que sa banque a crédité, et corrige le montant si le
-- donateur a viré autre chose. C'est elle qui a le relevé : c'est son chiffre qui
-- fait foi, exactement comme pour le bénévolat.
create or replace function public.confirmer_don_recu(
  p_intention uuid, p_montant numeric default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_i public.intention_don; v_an public.annonce; v_recu numeric;
        v_don uuid; v_mission uuid; v_ent uuid;
begin
  select * into v_i from public.intention_don i where i.id = p_intention for update;
  if not found then raise exception 'Intention introuvable' using errcode = '42704'; end if;
  if v_i.association is distinct from private.mon_association() and not private.est_admin() then
    raise exception 'Réservé à l''association bénéficiaire' using errcode = '42501';
  end if;
  if v_i.etat <> 'annoncee' then
    raise exception 'Ce don a déjà été traité' using errcode = '42501';
  end if;
  v_recu := coalesce(p_montant, v_i.montant);
  if v_recu <= 0 then raise exception 'Montant reçu invalide' using errcode = '22023'; end if;

  select * into v_an from public.annonce a where a.id = v_i.annonce for update;

  insert into public.don (association, entreprise, origine, montant, etat,
                          fournisseur, reference, confirme_le)
  values (v_i.association, v_i.entreprise, v_i.origine, v_recu, 'confirme',
          'virement', v_i.reference, now())
  returning id into v_don;

  select a.entreprise into v_ent from private.appartenance a where a.profil = v_i.salarie;
  insert into public.mission (annonce, entreprise, salarie, etat, quantite, points,
                              date_mission, declaree_le, tranchee_le, origine,
                              cle_idempotence)
  values (v_i.annonce, coalesce(v_i.entreprise, v_ent), v_i.salarie, 'validee', v_recu,
          private.points_pour(v_an.saison, 'don_financier', v_recu),
          current_date, v_i.declare_le, now(), v_i.origine,
          'virement:' || v_i.reference)
  returning id into v_mission;

  update public.don d set mission = v_mission where d.id = v_don;
  update public.annonce a set restant = greatest(0, a.restant - v_recu)
   where a.id = v_i.annonce;
  update public.intention_don i
     set etat = 'recue', montant_recu = v_recu, confirme_le = current_date, mission = v_mission
   where i.id = p_intention;
  return v_don;
end $$;

create or replace function public.abandonner_intention_don(
  p_intention uuid, p_motif text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_i public.intention_don;
begin
  select * into v_i from public.intention_don i where i.id = p_intention;
  if not found then return; end if;
  -- Le donateur peut renoncer, l'association peut constater que rien n'est arrivé.
  if v_i.salarie is distinct from auth.uid()
     and v_i.association is distinct from private.mon_association()
     and not private.est_admin() then
    raise exception 'Réservé au donateur ou à l''association' using errcode = '42501';
  end if;
  update public.intention_don i
     set etat = 'abandonnee', motif = left(coalesce(p_motif, 'sans motif'), 200)
   where i.id = p_intention and i.etat = 'annoncee';
end $$;

-- ---------------------------------------------------------------------------
-- Écarts entre périodes
-- ---------------------------------------------------------------------------
-- Un taux de fréquence qui triple d'un semestre à l'autre a deux causes
-- possibles : il s'est réellement passé quelque chose, ou quelqu'un a saisi des
-- heures payées au lieu d'heures travaillées. Les deux se ressemblent exactement
-- dans une base de données, et la seconde est la plus fréquente.
--
-- Riseva ne corrige rien et ne refuse aucune valeur : elle refuse le silence.
-- Le seuil vit ici et dans `data.js` sous le même nom, avec la même valeur —
-- deux seuils concurrents, ce sont deux produits.
create or replace function private.seuil_ecart() returns numeric
  language sql immutable parallel safe set search_path = '' as $$ select 0.30::numeric $$;

-- La campagne précédente du même groupe : celle dont la période s'achève avant
-- le début de celle-ci. Pas « la précédente par date de création » : une campagne
-- de point d'étape ouverte après coup fausserait la comparaison.
create or replace function private.campagne_precedente(p_campagne uuid) returns uuid
language sql stable set search_path = '' as $$
  select p.id from public.campagne_indicateurs c
    join public.campagne_indicateurs p
      on p.groupe = c.groupe and p.fin < c.debut
   where c.id = p_campagne
   order by p.fin desc
   limit 1
$$;

-- Les six indicateurs calculés, sous la forme (numérateur, dénominateur,
-- facteur). Les mêmes formules que dans `data.js` : un score, un plafond, un taux
-- de fréquence ne peuvent pas diverger entre ce qu'on montre et ce qu'on facture.
-- Les six indicateurs calculés. Les mêmes formules que dans `data.js` : un score,
-- un plafond, un taux de fréquence ne peuvent pas diverger entre ce qu'on montre
-- et ce qu'on facture.
--
-- Une valeur absente reste absente. La tentation d'écrire `coalesce(x, 0)` est
-- forte et fausse : elle transforme « ce site n'a pas déclaré ses entrées » en
-- « ce site n'a eu aucune entrée », ce qui fait chuter le taux de rotation de
-- cent pour cent et déclenche une alerte d'écart pour une donnée manquante.
create or replace function private.n(v jsonb, k text) returns numeric
  language sql immutable parallel safe set search_path = '' as $$
  select case when jsonb_typeof(v->k) = 'number' then (v->>k)::numeric end
$$;

create or replace function private.taux_calcules(v jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'tf1', case when private.n(v,'heures_travaillees') > 0
                then private.n(v,'at_avec_arret') * 1000000
                     / private.n(v,'heures_travaillees') end,
    'tf2', case when private.n(v,'heures_travaillees') > 0
                then (private.n(v,'at_avec_arret') + private.n(v,'at_sans_arret')) * 1000000
                     / private.n(v,'heures_travaillees') end,
    'tg',  case when private.n(v,'heures_travaillees') > 0
                then private.n(v,'jours_arret') * 1000
                     / private.n(v,'heures_travaillees') end,
    'if_', case when private.n(v,'effectif_fin') > 0
                then private.n(v,'at_avec_arret') * 1000
                     / private.n(v,'effectif_fin') end,
    'turnover', case when private.n(v,'effectif_fin') > 0
                then (private.n(v,'entrees') + private.n(v,'sorties')) / 2
                     / private.n(v,'effectif_fin') * 100 end,
    'part_femmes', case when private.n(v,'effectif_fin') > 0
                then private.n(v,'femmes')
                     / private.n(v,'effectif_fin') * 100 end,
    -- Quatre taux manquaient ici alors qu'ils existent dans data.js. La regle
    -- « expliquez toute variation de plus de trente pour cent » ne les couvrait
    -- donc pas en production : un site dont la part de dechets valorises
    -- s'effondrait de soixante pour cent etait bloque en demonstration et
    -- passait sans un mot chez un vrai client. Le commentaire de cette fonction
    -- affirmait « les memes formules que dans data.js » ; ce n'etait plus vrai.
    'part_valorise', case when private.n(v,'dechets_kg') > 0
                then private.n(v,'dechets_valorises_kg')
                     / private.n(v,'dechets_kg') * 100 end,
    'part_flotte_elec', case when private.n(v,'flotte') > 0
                then private.n(v,'flotte_electrique')
                     / private.n(v,'flotte') * 100 end,
    'part_achats_locaux', case when private.n(v,'achats_montant') > 0
                then private.n(v,'achats_locaux')
                     / private.n(v,'achats_montant') * 100 end,
    'elec_par_salarie', case when private.n(v,'effectif_fin') > 0
                then private.n(v,'elec_kwh')
                     / private.n(v,'effectif_fin') end
  ))
$$;

create or replace function private.ecarts_periode(
  p_campagne uuid, p_etablissement uuid, p_valeurs jsonb)
returns jsonb language plpgsql stable set search_path = '' as $$
declare v_prec uuid; v_avant jsonb; v_a jsonb; v_b jsonb;
        v_out jsonb := '[]'::jsonb; k text; av numeric; ap numeric; var numeric;
begin
  v_prec := private.campagne_precedente(p_campagne);
  if v_prec is null then return v_out; end if;
  select o.valeurs into v_avant from public.observation_indicateur o
   where o.campagne = v_prec and o.etablissement = p_etablissement
     and o.etat in ('declare','approuve');
  if v_avant is null then return v_out; end if;

  v_a := private.taux_calcules(v_avant);
  v_b := private.taux_calcules(p_valeurs);
  for k in select jsonb_object_keys(v_a) loop
    av := (v_a->>k)::numeric;
    ap := (v_b->>k)::numeric;
    if av is null or ap is null or av = 0 then continue; end if;
    var := (ap - av) / abs(av);
    if abs(var) >= private.seuil_ecart() then
      v_out := v_out || jsonb_build_array(jsonb_build_object(
        'cle', k, 'avant', round(av, 2), 'apres', round(ap, 2),
        'variation', round(var, 4)));
    end if;
  end loop;
  return v_out;
end $$;

-- ---------------------------------------------------------------------------
-- Places de lancement
-- ---------------------------------------------------------------------------
-- Vingt places à −10 %, jusqu'au 31 décembre 2026. Une remise sans limite n'est
-- pas une remise, c'est le prix — et une limite qui n'est pas tenue par la base
-- n'est pas une limite, c'est une intention. Le compte se relit dans les
-- abonnements, il n'est stocké nulle part : un compteur qu'on incrémente est un
-- compteur qu'on oublie de décrémenter.
create or replace function private.places_fondateur() returns integer
  language sql immutable parallel safe set search_path = '' as $$ select 20 $$;
create or replace function private.fin_fondateur() returns date
  language sql immutable parallel safe set search_path = '' as $$ select date '2026-12-31' $$;

create or replace function private.verifier_fondateur() returns trigger
language plpgsql set search_path = '' as $$
declare v_pris integer;
begin
  if not new.fondateur then return new; end if;
  if current_date > private.fin_fondateur() then
    raise exception 'Le tarif fondateur est clos depuis le %', private.fin_fondateur()
      using errcode = '23514';
  end if;
  select count(*) into v_pris from public.abonnement a
   where a.fondateur and a.id is distinct from new.id;
  if v_pris >= private.places_fondateur() then
    raise exception 'Les % places au tarif fondateur sont prises', private.places_fondateur()
      using errcode = '23514';
  end if;
  return new;
end $$;

create trigger abonnement_fondateur
  before insert or update of fondateur on abonnement
  for each row execute function private.verifier_fondateur();

-- ---------------------------------------------------------------------------
-- Registre des événements de sécurité
-- ---------------------------------------------------------------------------
-- Écriture réservée à qui pilote le site : son référent, ou la société. Un
-- salarié ne déclare pas un accident dans Riseva — ce n'est pas le canal, et
-- laisser croire le contraire retarderait une déclaration qui doit partir
-- ailleurs.
create or replace function private.pilote_le_site(p_etablissement uuid) returns boolean
language sql stable set search_path = '' as $$
  select private.est_admin() or exists (
    select 1 from public.etablissement et
     where et.id = p_etablissement
       and et.societe = private.mon_entreprise()
       and (private.mon_role() = 'entreprise_admin'
            or (private.mon_role() = 'site_referent'
                and private.mon_etablissement() = p_etablissement)))
$$;

-- Le champ « circonstances » est le seul endroit du registre où quelqu'un peut
-- écrire ce que le schéma refuse de stocker : un prénom, un nom, un numéro. La
-- limite de trois cents caractères décourage le récit, elle ne l'empêche pas.
-- Ce garde-fou-là refuse la ligne au lieu de la nettoyer en silence : nettoyer
-- apprendrait à l'utilisateur que le champ accepte tout, puisqu'il ne dit rien.
--
-- Deux familles, et elles n'ont pas la même nature. Les motifs universels —
-- adresse électronique, numéro à dix chiffres, numéro de sécurité sociale — se
-- reconnaissent seuls. Les noms, eux, ne se reconnaissent pas dans l'absolu :
-- « Meunier » est un métier avant d'être un patronyme. Mais Riseva connaît les
-- salariés de cette société, et c'est très exactement la liste de ceux dont
-- l'apparition dans un registre d'accidents transformerait une donnée de gestion
-- en donnée de santé. On ne compare donc qu'à cette liste, et seulement pour des
-- noms d'au moins quatre lettres, pour ne pas rejeter un site « Le Mans » à
-- cause d'un salarié qui s'appelle Le.
create or replace function private.trace_de_personne(p_texte text, p_etablissement uuid)
returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  v_t text := public.sans_accents(lower(coalesce(p_texte, '')));
  v_nom text;
begin
  if v_t = '' then return null; end if;
  if v_t ~ '[[:alnum:]._%+-]+@[[:alnum:].-]+\.[a-z]{2,}' then
    return 'une adresse électronique';
  end if;
  if v_t ~ '(^|[^0-9])0[1-9]([ .-]?[0-9]{2}){4}([^0-9]|$)' then
    return 'un numéro de téléphone';
  end if;
  if v_t ~ '(^|[^0-9])[12][0-9]{2}(0[1-9]|1[0-2])[0-9]{5,8}([^0-9]|$)' then
    return 'un numéro de sécurité sociale';
  end if;
  for v_nom in
    select distinct mot from (
      select unnest(string_to_array(public.sans_accents(lower(p.nom)), ' ')) as mot
        from public.profil p
        join private.appartenance ap on ap.profil = p.id
        join public.etablissement et on et.societe = ap.entreprise
       where et.id = p_etablissement and not ap.pseudonymise
    ) m where length(mot) >= 4
  loop
    if v_t ~ ('(^|[^[:alnum:]])' || v_nom || '([^[:alnum:]]|$)') then
      return 'le nom d''une personne de votre société';
    end if;
  end loop;
  return null;
end $$;

create or replace function public.declarer_evenement(
  p_etablissement uuid, p_date date, p_nature text, p_gravite text,
  p_type text, p_zone text default null, p_jours integer default 0,
  p_circonstances text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not private.pilote_le_site(p_etablissement) then
    raise exception 'Réservé au site et à sa société' using errcode = '42501';
  end if;
  if p_date is null or p_date > current_date then
    raise exception 'Un événement ne se déclare pas à une date future' using errcode = '22023';
  end if;
  declare v_trace text;
  begin
    v_trace := coalesce(private.trace_de_personne(p_circonstances, p_etablissement),
                        private.trace_de_personne(p_zone, p_etablissement));
    if v_trace is not null then
      raise exception 'Ce registre ne reçoit ni identité ni donnée de santé, et votre texte contient %. Décrivez la situation, pas la personne.', v_trace
        using errcode = '22023';
    end if;
  end;
  insert into public.evenement_securite
    (etablissement, date, nature, gravite, type_evenement, zone, jours_arret,
     circonstances, declare_par)
  values (p_etablissement, p_date, p_nature, p_gravite, p_type,
          nullif(btrim(coalesce(p_zone, '')), ''), coalesce(p_jours, 0),
          nullif(btrim(coalesce(p_circonstances, '')), ''), auth.uid())
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.annuler_evenement(p_evenement uuid, p_motif text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_site uuid;
begin
  select etablissement into v_site from public.evenement_securite where id = p_evenement;
  if v_site is null then raise exception 'Événement inconnu' using errcode = '42704'; end if;
  if not private.pilote_le_site(v_site) then
    raise exception 'Réservé au site et à sa société' using errcode = '42501';
  end if;
  if btrim(coalesce(p_motif, '')) = '' then
    raise exception 'Annuler une déclaration exige un motif' using errcode = '22023';
  end if;
  update public.evenement_securite
     set annule_le = current_date, motif_annulation = left(btrim(p_motif), 200)
   where id = p_evenement and annule_le is null;
end $$;

create or replace function public.activer_registre(p_etablissement uuid, p_actif boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.pilote_le_site(p_etablissement) then
    raise exception 'Réservé au site et à sa société' using errcode = '42501';
  end if;
  update public.etablissement set registre_actif = coalesce(p_actif, false)
   where id = p_etablissement;
end $$;

create or replace function public.ajouter_action(
  p_etablissement uuid, p_quoi text, p_responsable text, p_echeance date,
  p_evenement uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not private.pilote_le_site(p_etablissement) then
    raise exception 'Réservé au site et à sa société' using errcode = '42501';
  end if;
  insert into public.action_corrective (evenement, etablissement, quoi, responsable, echeance)
  values (p_evenement, p_etablissement, btrim(p_quoi), btrim(p_responsable), p_echeance)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.maj_action(p_action uuid, p_etat text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_site uuid;
begin
  select etablissement into v_site from public.action_corrective where id = p_action;
  if v_site is null then raise exception 'Action inconnue' using errcode = '42704'; end if;
  if not private.pilote_le_site(v_site) then
    raise exception 'Réservé au site et à sa société' using errcode = '42501';
  end if;
  update public.action_corrective
     set etat = p_etat,
         fait_le = case when p_etat = 'faite' then current_date end
   where id = p_action;
end $$;

-- Les quatre valeurs de sécurité, déduites du registre. La même définition que
-- dans le navigateur : un accident déclaré au fil de l'eau et un total recopié
-- en fin de période ne tombent jamais juste, et c'est exactement ce que cette
-- fonction supprime.
-- Réservée au périmètre de l'appelant. Sans ce filtre, tout compte connecté
-- obtenait l'accidentologie complète de n'importe quel site dont il tenait
-- l'identifiant — et les identifiants de sites circulent dans les missions.
create or replace function public.securite_du_registre(
  p_etablissement uuid, p_debut date, p_fin date)
returns table (at_avec_arret integer, at_sans_arret integer, at_trajet integer,
               jours_arret integer, sans_soin integer, evenements integer)
language sql stable security definer set search_path = '' as $$
  select
    count(*) filter (where e.nature = 'travail' and e.gravite = 'avec_arret')::int,
    count(*) filter (where e.nature = 'travail' and e.gravite = 'soin_sans_arret')::int,
    count(*) filter (where e.nature = 'trajet')::int,
    coalesce(sum(e.jours_arret) filter (where e.nature = 'travail'), 0)::int,
    count(*) filter (where e.gravite = 'sans_soin')::int,
    count(*)::int
  from public.evenement_securite e
 where e.etablissement = p_etablissement
   and e.annule_le is null
   and e.date between p_debut and p_fin
   and exists (select 1 from public.etablissement et
                where et.id = p_etablissement
                  and (et.societe = private.mon_entreprise()
                       or private.dans_mon_groupe(et.societe)
                       or private.est_admin()))
$$;

-- ---------------------------------------------------------------------------
-- Supports : ce qui part par la poste
-- ---------------------------------------------------------------------------
create or replace function public.expedier_kit(
  p_entreprise uuid, p_kit text, p_suivi text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_saison uuid := private.saison_ouverte();
begin
  if not private.est_admin() then
    raise exception 'Réservé à Riseva' using errcode = '42501';
  end if;
  if v_saison is null then
    raise exception 'Aucune saison ouverte' using errcode = '42501';
  end if;
  insert into public.expedition (entreprise, saison, kit, suivi)
  values (p_entreprise, v_saison, p_kit, nullif(btrim(coalesce(p_suivi, '')), ''))
  returning id into v_id;
  return v_id;
end $$;

-- C'est le client qui confirme, pas nous.
create or replace function public.confirmer_reception(p_expedition uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_ent uuid;
begin
  select entreprise into v_ent from public.expedition where id = p_expedition;
  if v_ent is null then raise exception 'Expédition inconnue' using errcode = '42704'; end if;
  if v_ent is distinct from private.mon_entreprise()
     or private.mon_role() <> 'entreprise_admin' then
    raise exception 'Réservé à l''entreprise destinataire' using errcode = '42501';
  end if;
  update public.expedition set recu_le = current_date
   where id = p_expedition and recu_le is null;
end $$;

-- Le Pareto des événements de sécurité, en agrégat. C'est ce que lit le comité
-- social et économique : le registre ligne à ligne se réidentifie, un décompte
-- par type ne le permet pas — au-dessus d'un seuil.
--
-- Sous ce seuil, on ne rend rien plutôt qu'un chiffre : « un accident de
-- manutention » dans une société de douze personnes désigne quelqu'un.
create or replace function public.pareto_securite(
  p_societe uuid, p_debut date, p_fin date)
returns table (type_evenement text, nombre integer)
language sql stable security definer set search_path = '' as $$
  with perimetre as (
    select e.type_evenement
      from public.evenement_securite e
      join public.etablissement et on et.id = e.etablissement
     where et.societe = p_societe
       and e.annule_le is null
       and e.date between p_debut and p_fin
       and (p_societe = private.mon_entreprise() or private.est_admin())
  )
  select p.type_evenement, count(*)::int
    from perimetre p
   where (select count(*) from perimetre) >= 5
   group by p.type_evenement
   order by count(*) desc
$$;

-- ---------------------------------------------------------------- lien de réponse
-- Le lien que l'association reçoit par courriel pour trancher une mission sans se
-- connecter. Trois précautions, et aucune n'est théorique :
--   — on stocke l'empreinte, jamais le jeton : une base qui fuit ne doit pas livrer
--     de quoi valider les missions de tout le monde ;
--   — le jeton expire avec le délai de validation de la saison : passé ce délai la
--     mission s'est de toute façon clôturée seule, le lien n'a plus rien à trancher ;
--   — il ne sert qu'une fois. Un lien de courriel survit des années dans des boîtes
--     partagées, et « la boîte asso » est rarement lue par une seule personne.
create or replace function private.jeton_mission(p_mission uuid)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_jeton text;
  v_delai integer;
begin
  select s.delai_validation_jours into v_delai
    from public.mission m
    join public.annonce a on a.id = m.annonce
    join public.saison  s on s.id = a.saison
   where m.id = p_mission;
  if not found then
    raise exception 'Mission introuvable' using errcode = '42501';
  end if;
  v_jeton := replace(replace(replace(
               encode(extensions.gen_random_bytes(32), 'base64'), '+', '-'), '/', '_'), '=', '');
  update public.mission m
     set jeton_empreinte  = extensions.digest(v_jeton, 'sha256'),
         jeton_expire_le  = coalesce(m.declaree_le, clock_timestamp())
                            + make_interval(days => v_delai),
         jeton_utilise_le = null
   where m.id = p_mission;
  return v_jeton;
end $$;

-- Trancher depuis le courriel. Trois réponses, pas deux : « comme prévu »,
-- « partiellement » — et là un chiffre est exigé, sinon « partiellement » ne veut
-- rien dire — et « non réalisée ». Les mêmes règles que trancher_mission
-- s'appliquent, écrites une seule fois : le stock de l'annonce est rendu sur un
-- refus, les points tombent à zéro, et le réalisé confirmé ne s'invente pas.
create or replace function public.trancher_par_jeton(
  p_jeton text, p_reponse text, p_realise numeric default null)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_m public.mission;
  v_a public.annonce;
begin
  if p_jeton is null or length(p_jeton) < 20 then
    return 'invalide';
  end if;
  if p_reponse not in ('oui', 'partiel', 'non') then
    return 'invalide';
  end if;
  select m.* into v_m from public.mission m
   where m.jeton_empreinte = extensions.digest(p_jeton, 'sha256')
   for update;
  if not found then
    return 'inconnu';
  end if;
  if v_m.jeton_utilise_le is not null then
    return 'deja';
  end if;
  if v_m.jeton_expire_le is not null and v_m.jeton_expire_le < clock_timestamp() then
    return 'expire';
  end if;
  if v_m.etat <> 'a_valider' then
    return 'deja';
  end if;
  select a.* into v_a from public.annonce a where a.id = v_m.annonce;

  -- « Partiellement » sans chiffre, c'est un silence de plus. On le refuse plutôt
  -- que de le traduire en « comme prévu » : c'est exactement l'écart que les
  -- rapports promettent de ne jamais combler tout seuls.
  if p_reponse = 'partiel'
     and v_a.impact_unite is not null
     and (p_realise is null or p_realise < 0) then
    return 'chiffre_manquant';
  end if;

  if p_reponse = 'non' then
    update public.mission m
       set etat = 'refusee', tranchee_le = clock_timestamp(), points = 0,
           realise_confirme = null, jeton_utilise_le = clock_timestamp()
     where m.id = v_m.id;
    update public.annonce a set restant = least(a.quantite, a.restant + v_m.quantite)
     where a.id = v_m.annonce;
  else
    update public.mission m
       set etat = 'validee', tranchee_le = clock_timestamp(),
           jeton_utilise_le = clock_timestamp(),
           realise_confirme = case
             when v_a.impact_unite is null then null
             when p_reponse = 'partiel'    then round(p_realise)
             else coalesce(round(p_realise), round(m.quantite * v_a.impact_par_unite)) end
     where m.id = v_m.id;
  end if;
  return p_reponse;
end $$;

-- Ce dont la fonction Edge a besoin pour composer UN courriel de demande de
-- confirmation, et rien de plus : le jeton fraîchement émis, de quoi écrire la
-- phrase, et l'identifiant du profil destinataire. L'adresse, elle, reste dans
-- `auth.users` et c'est la fonction Edge — qui détient déjà la clé de service —
-- qui va la chercher. Faire descendre les adresses jusqu'ici obligerait la base
-- à les recopier dans une table de file d'attente, où elles n'ont rien à faire.
create or replace function public.preparer_demande_validation(p_envoi uuid)
returns table (jeton text, titre text, entreprise text, salarie text,
               quantite numeric, unite text, destinataire uuid, rappel boolean)
language plpgsql security definer set search_path = '' as $$
declare v_e public.envoi;
begin
  select * into v_e from public.envoi e
   where e.id = p_envoi and e.type = 'demande_validation' and e.etat = 'a_envoyer'
   for update;
  if not found then
    return;
  end if;
  return query
    select private.jeton_mission(m.id),
           a.titre,
           coalesce(ent.nom, 'Une entreprise'),
           coalesce(p.nom, 'Un salarié'),
           m.quantite,
           a.impact_unite::text,
           v_e.destinataire_profil,
           v_e.cle not like '%:0'
      from public.mission m
      join public.annonce a on a.id = m.annonce
      left join public.entreprise ent on ent.id = m.entreprise
      left join public.profil p on p.id = m.salarie
     where m.id = v_e.mission and m.etat = 'a_valider';
end $$;

-- Le résultat de l'envoi, écrit par la fonction Edge : c'est elle, et elle seule,
-- qui sait si le courriel est parti. Une file d'attente qui se marque « envoyé »
-- toute seule ne prouve rien.
create or replace function public.marquer_envoi(p_envoi uuid, p_etat text,
                                                p_destinataire text default null)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_etat not in ('envoye', 'echec', 'sans_destinataire') then
    raise exception 'État d''envoi inconnu' using errcode = '23514';
  end if;
  update public.envoi e
     set etat = p_etat,
         destinataire = coalesce(left(p_destinataire, 240), e.destinataire)
   where e.id = p_envoi;
end $$;

-- Le logo de l'entreprise, réglé par son administrateur. La contrainte de forme est
-- portée par la colonne ; ici on vérifie seulement qui a le droit d'écrire.
create or replace function public.regler_logo(p_logo text)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_ent uuid := private.mon_entreprise();
begin
  if v_ent is null or private.mon_role() <> 'entreprise_admin' then
    raise exception 'Réservé à l''administrateur de l''entreprise' using errcode = '42501';
  end if;
  update public.entreprise e
     set logo = nullif(btrim(coalesce(p_logo, '')), '')
   where e.id = v_ent;
end $$;

-- La fiche que l'association tient elle-même : ce qu'elle raconte, sa ville, sa
-- photo. Ce qu'elle ne touche pas ici, et pourquoi : sa dénomination et ses
-- numéros viennent du registre public et ne se corrigent que par un contrôle,
-- sa validation reste une décision de Riseva, et son IBAN passe par sa propre
-- fonction, qui vérifie la clé.
--
-- Un paramètre laissé à NULL ne touche pas à la colonne. Effacer une photo est
-- donc un geste explicite, `p_effacer_photo`, sinon on ne saurait pas
-- distinguer « je n'y touche pas » de « je la retire ».
create or replace function public.maj_association(
  p_resume text default null, p_cause text default null, p_ville text default null,
  p_site text default null, p_photo text default null,
  p_effacer_photo boolean default false)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_asso uuid := private.mon_association();
begin
  if v_asso is null then
    raise exception 'Réservé à l''association elle-même' using errcode = '42501';
  end if;
  if p_resume is not null and length(btrim(p_resume)) < 40 then
    raise exception 'Une présentation de moins de quarante caractères ne dit rien'
      using errcode = '22023';
  end if;
  if p_ville is not null and length(btrim(p_ville)) < 1 then
    raise exception 'La ville est nécessaire' using errcode = '22023';
  end if;
  if p_site is not null and btrim(p_site) <> '' and p_site !~* '^https?://' then
    raise exception 'L''adresse de votre site commence par http ou https' using errcode = '22023';
  end if;
  if p_photo is not null and btrim(p_photo) <> ''
     and p_photo !~* '^(data:image/(png|jpeg|webp);|https://)' then
    raise exception 'Une photo est un fichier image ou une adresse https' using errcode = '22023';
  end if;

  update public.association a set
    resume = coalesce(nullif(btrim(coalesce(p_resume, '')), ''), a.resume),
    cause  = coalesce(nullif(btrim(coalesce(p_cause, '')), ''), a.cause),
    ville  = coalesce(nullif(btrim(coalesce(p_ville, '')), ''), a.ville),
    site   = coalesce(nullif(btrim(coalesce(p_site, '')), ''), a.site),
    photo  = case when p_effacer_photo then null
                  else coalesce(nullif(btrim(coalesce(p_photo, '')), ''), a.photo) end
  where a.id = v_asso;
end $$;

-- ------------------------------------------------- valorisation d'un don matériel
-- Ce que fait cette fonction : elle enregistre ce que l'entreprise DÉCLARE.
-- Ce qu'elle ne fait pas, et ne fera pas : calculer une valeur. La méthode
-- dépend du régime sous lequel le bien était inscrit — coût de revient pour un
-- stock, valeur de cession retenue pour la plus ou moins-value de sortie pour
-- une immobilisation — et le choix relève du donateur et de son
-- expert-comptable, pas d'un logiciel de gestion RSE. Une règle unique codée en
-- dur ici serait fausse une fois sur deux et opposable à personne.
--
-- La valeur reste donc nullable de bout en bout : un don sans valorisation est
-- un don réel, documenté, qui compte dans le registre AGEC et ne compte pas
-- dans l'assiette du mécénat. C'est un état légitime, pas une saisie incomplète.
create or replace function public.declarer_valeur_materiel(
  p_mission       uuid,
  p_valeur        numeric                    default null,
  p_categorie     public.categorie_materiel  default null,
  p_nature        text                       default null,
  p_reference     text                       default null,
  p_sortie_le     date                       default null,
  p_justificatif  text                       default null,
  p_effacement    boolean                    default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_ent  uuid := private.mon_entreprise();
  v_type public.type_annonce;
  v_etat public.etat_mission;
begin
  if v_ent is null or private.mon_role() <> 'entreprise_admin' then
    raise exception 'Réservé à l''administrateur de l''entreprise' using errcode = '42501';
  end if;

  select a.type, m.etat into v_type, v_etat
    from public.mission m
    join public.annonce a on a.id = m.annonce
   where m.id = p_mission and m.entreprise = v_ent;

  if not found then
    raise exception 'Mission inconnue' using errcode = 'P0002';
  end if;

  if v_type <> 'don_materiel' then
    raise exception 'Cette mission n''est pas un don de matériel' using errcode = '22023';
  end if;

  -- Une mission refusée n'a pas eu lieu. La valoriser reviendrait à porter dans
  -- le registre AGEC un réemploi qui n'a jamais quitté l'entrepôt.
  if v_etat = 'refusee' then
    raise exception 'Une mission refusée ne se valorise pas' using errcode = '22023';
  end if;

  -- Une valeur sans catégorie est refusée ici plutôt que par la contrainte :
  -- le message doit dire ce qui manque, pas nommer une contrainte.
  if p_valeur is not null and p_categorie is null then
    raise exception 'Indiquez la catégorie comptable : la méthode de valorisation en dépend'
      using errcode = '22023';
  end if;

  update public.mission m
     set valeur_declaree     = case when p_valeur is null then null
                                    else round(greatest(p_valeur, 0), 2) end,
         categorie_comptable = p_categorie,
         nature              = nullif(btrim(coalesce(p_nature, '')), ''),
         reference_actif     = nullif(btrim(coalesce(p_reference, '')), ''),
         sortie_le           = p_sortie_le,
         justificatif        = nullif(btrim(coalesce(p_justificatif, '')), ''),
         effacement_donnees  = p_effacement
   where m.id = p_mission;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
--  L'OFFRE ASSOCIATIVE AUTOUR D'UN SITE, ET CE QU'ON EN FAIT
--
--  La question qu'un responsable RSE se pose au bout de trois mois n'est pas
--  « combien de points » mais « pourquoi ça ne prend pas ». L'entonnoir
--  d'adoption écrivait déjà, comme cause probable, « l'offre locale est trop
--  loin ou ne correspond pas ». Il l'écrivait sans jamais la mesurer, et une
--  cause qu'on suggère sans la chiffrer n'est qu'une excuse polie faite au
--  client.
--
--  Trois choses décident, et aucune ne dépend de la bonne volonté des équipes.
--  LA DISTANCE : un site industriel est en périphérie ou en zone rurale, et
--  personne ne fait trente-cinq kilomètres après sa journée. LE JOUR : un chef
--  d'atelier ne libère pas un opérateur en 3×8 un mardi à quatorze heures, donc
--  une offre entièrement en semaine ouvrée exclut mécaniquement une grande part
--  d'un effectif industriel. LE FORMAT : le don de matériel ne demande la
--  disponibilité de personne — c'est la seule voie qui reste ouverte à
--  l'entreprise quand les deux contraintes précédentes se cumulent.
--
--  Ces fonctions vivent ici, dans la base, et pas seulement dans le moteur de
--  démonstration : ce sont des chiffres qu'un client lira dans son rapport de
--  fin de saison, et un chiffre calculé dans le navigateur est un chiffre que
--  personne ne peut refaire.
-- ═══════════════════════════════════════════════════════════════════════════

-- Distance orthodromique en kilomètres. Suffisamment juste à l'échelle d'un
-- pays, et sans dépendance : installer PostGIS pour ça serait absurde, et une
-- extension de plus est une extension de plus à maintenir et à auditer.
create or replace function private.distance_km(
  p_lat1 double precision, p_lon1 double precision,
  p_lat2 double precision, p_lon2 double precision)
returns integer
language sql immutable set search_path = '' as $$
  select case
    when p_lat1 is null or p_lon1 is null or p_lat2 is null or p_lon2 is null then null
    else round(2 * 6371 * asin(sqrt(
           power(sin(radians(p_lat2 - p_lat1) / 2), 2)
         + cos(radians(p_lat1)) * cos(radians(p_lat2))
         * power(sin(radians(p_lon2 - p_lon1) / 2), 2))))::integer
  end
$$;

-- Le rayon retenu, et le seuil d'offre suffisante pour cent salariés. Ils
-- vivent ici plutôt que dans le code des écrans : ce sont des paramètres de
-- méthode, et une méthode qui change doit se voir en un seul endroit.
create or replace function private.rayon_offre_km() returns integer
  language sql immutable as $$ select 30 $$;
create or replace function private.offre_min_pour_cent() returns integer
  language sql immutable as $$ select 4 $$;

create or replace function public.offre_locale(p_etablissement uuid)
returns table (
  etablissement uuid, site text, ville text, effectif integer,
  situe boolean, rayon integer, attendu integer, verdict text,
  ouvertes integer, places integer, plus_proche integer, mediane integer,
  benevolat integer, animal integer, materiel integer, financier integer,
  semaine integer, weekend integer, sans_date integer,
  non_situees integer, a_relancer integer, signalee_le timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_et  public.etablissement;
  v_r   integer := private.rayon_offre_km();
begin
  select * into v_et from public.etablissement e where e.id = p_etablissement;
  if not found then
    raise exception 'Site inconnu' using errcode = 'P0002';
  end if;
  -- Le cloisonnement d'abord : un site appartient à une société, et la RLS de
  -- `etablissement` a déjà tranché ce que l'appelant a le droit de voir. On la
  -- rejoue ici parce que cette fonction est SECURITY DEFINER et qu'elle
  -- contournerait sinon la frontière qu'elle est censée respecter.
  if not exists (select 1 from public.etablissement e where e.id = p_etablissement) then
    raise exception 'Site inconnu' using errcode = 'P0002';
  end if;

  return query
  with brut as (
    select a.id, a.type, a.restant, a.date_prevue,
           private.distance_km(v_et.lat, v_et.lon, asso.lat, asso.lon) as km,
           extract(isodow from a.date_prevue)::int as jour
      from public.annonce a
      join public.association asso on asso.id = a.association
     where a.etat = 'ouverte' and asso.valide and not asso.suspendue
  ),
  proches as (select * from brut where km is not null and km <= v_r),
  agg as (
    select
      count(*)::int                                            as n,
      -- Un besoin de financement se compte en euros, pas en places : additionner
      -- « 4 000 » euros restants et « 6 » ordinateurs donnerait 4 006 places,
      -- c'est-a-dire un chiffre qui ne veut rien dire et qui flatte.
      coalesce(sum(p.restant) filter (where p.type <> 'don_financier'), 0)::int as places,
      min(p.km)::int                                            as proche,
      -- La médiane et non la moyenne : une annonce à quatre-vingts kilomètres
      -- tirerait la moyenne et ferait croire à un désert autour du site.
      percentile_cont(0.5) within group (order by p.km)::int     as med,
      count(*) filter (where p.type in ('benevolat_demi_journee','benevolat_journee',
                                        'mecenat_competence'))::int as bene,
      count(*) filter (where p.type in ('parrainage_animal','adoption_animal'))::int as ani,
      count(*) filter (where p.type = 'don_materiel')::int           as mat,
      count(*) filter (where p.type = 'don_financier')::int          as fin,
      count(*) filter (where p.jour between 1 and 5)::int            as sem,
      count(*) filter (where p.jour in (6, 7))::int                  as we,
      count(*) filter (where p.jour is null)::int                    as sd
    from proches p
  ),
  relance as (
    select count(*)::int as n
      from public.association asso
     where asso.valide and not asso.suspendue
       and private.distance_km(v_et.lat, v_et.lon, asso.lat, asso.lon) <= v_r
       and not exists (select 1 from public.annonce a
                        where a.association = asso.id and a.etat = 'ouverte')
  )
  select
    v_et.id, v_et.nom, v_et.ville, v_et.effectif,
    (v_et.lat is not null and v_et.lon is not null),
    v_r,
    -- Le seuil suit l'effectif : trois annonces suffisent à un site de vingt
    -- personnes et ne suffisent pas à un site de quatre cents.
    greatest(2, round(v_et.effectif::numeric / 100 * private.offre_min_pour_cent()))::int,
    case
      when agg.n = 0 then 'aucune'
      when agg.n < greatest(2, round(v_et.effectif::numeric / 100
                                     * private.offre_min_pour_cent())) then 'mince'
      -- Tout en semaine ouvrée et aucun don de matériel : un salarié en poste
      -- ou en équipe ne peut pas s'y rendre. Ce n'est pas un problème d'envie.
      when agg.sem > 0 and agg.we = 0 and agg.mat = 0 and agg.ani = 0 then 'inaccessible'
      else 'suffisante'
    end,
    agg.n, agg.places, agg.proche, agg.med,
    agg.bene, agg.ani, agg.mat, agg.fin, agg.sem, agg.we, agg.sd,
    (select count(*)::int from brut where km is null),
    relance.n,
    (select s.le from public.sourcing s
      where s.etablissement = v_et.id and s.traite_le is null limit 1)
  from agg, relance;
end $$;

-- Tous les sites d'une société, du plus mal servi au mieux servi : c'est dans
-- cet ordre qu'on doit s'en occuper, et un tri par nom l'aurait caché.
create or replace function public.offre_par_site(p_entreprise uuid)
returns table (
  etablissement uuid, site text, ville text, effectif integer,
  situe boolean, rayon integer, attendu integer, verdict text,
  ouvertes integer, places integer, plus_proche integer, mediane integer,
  benevolat integer, animal integer, materiel integer, financier integer,
  semaine integer, weekend integer, sans_date integer,
  non_situees integer, a_relancer integer, signalee_le timestamptz)
language sql stable security definer set search_path = '' as $$
  select o.*
    from public.etablissement e
    cross join lateral public.offre_locale(e.id) o
   where e.societe = p_entreprise and e.ferme_le is null
   order by case o.verdict when 'aucune' then 0 when 'inaccessible' then 1
                           when 'mince' then 2 else 3 end,
            o.ouvertes
$$;

-- Signaler une zone, c'est nous donner du travail. Réservé à l'administrateur
-- de l'entreprise et au référent du site concerné : c'est une demande faite en
-- son nom, pas un vote.
create or replace function public.signaler_zone(p_etablissement uuid, p_motif text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_ent uuid := private.mon_entreprise();
  v_role public.role_utilisateur := private.mon_role();
begin
  if v_ent is null or v_role not in ('entreprise_admin', 'site_referent') then
    raise exception 'Réservé à l''administrateur de l''entreprise ou au référent du site'
      using errcode = '42501';
  end if;
  if not exists (select 1 from public.etablissement e
                  where e.id = p_etablissement and e.societe = v_ent) then
    raise exception 'Site inconnu' using errcode = 'P0002';
  end if;
  if v_role = 'site_referent' and not private.pilote_le_site(p_etablissement) then
    raise exception 'Vous ne pilotez pas ce site' using errcode = '42501';
  end if;

  -- Deux demandes ouvertes pour le même site ne sont pas deux fois plus
  -- urgentes : on rend celle qui existe déjà plutôt que d'en empiler une.
  select s.id into v_id from public.sourcing s
   where s.etablissement = p_etablissement and s.traite_le is null limit 1;
  if v_id is not null then return v_id; end if;

  insert into public.sourcing (etablissement, par, motif)
  values (p_etablissement, auth.uid(), nullif(btrim(coalesce(p_motif, '')), ''))
  returning id into v_id;
  return v_id;
end $$;


-- ═══════════════════════════════════════════════════════════════════════════
--  L'ENTONNOIR D'ADOPTION
--
--  Cinq marches entre un salarié inscrit et un salarié qui a fait quelque
--  chose. Trois précautions, et chacune corrige une façon de mentir avec un
--  chiffre juste.
--
--  1. UN PLANCHER D'ANONYMAT. Sur un site de trois comptes, dire « un seul
--     s'est engagé » revient à désigner quelqu'un, même sans le nommer. Le
--     même plancher de cinq que pour les agrégats du CSE, et pour la même
--     raison : un outil d'engagement qui devient un outil de surveillance perd
--     ses inscrits avant de perdre son client.
--
--  2. LE DÉLAI N'EST PAS UNE MOYENNE, ET IL DIT SON DÉNOMINATEUR. Il ne
--     concerne que ceux qui ont fini par agir. Les autres n'ont pas un délai
--     long : ils n'ont pas de délai. On rend donc aussi combien de comptes
--     n'ont rien fait, et depuis quand — sans quoi la médiane est une médiane
--     de survivants.
--
--  3. LA RÉTENTION N'EST PAS DANS L'ENTONNOIR. « Revenu une deuxième fois »
--     mesure ce que fait quelqu'un qui a déjà tout franchi ; les cinq marches
--     mesurent des franchissements. Mélangés, ils font chercher la cause d'un
--     décrochage au mauvais endroit.
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function private.plancher_adoption() returns integer
  language sql immutable as $$ select 5 $$;

create or replace function public.adoption(
  p_entreprise uuid, p_etablissement uuid default null)
returns table (
  effectif integer, comptes integer, engages integer, declarees integer,
  validees integer, revenus integer,
  lisible boolean, plancher integer,
  delai_median integer, delai_mesurable integer, delai_sur integer,
  sans_action integer, sans_action_median integer, sans_action_plus_90 integer)
language plpgsql stable security definer set search_path = '' as $$
declare v_plancher integer := private.plancher_adoption();
begin
  return query
  with gens as (
    select p.id, p.cree_le
      from public.profil p
      join private.appartenance ap on ap.profil = p.id
     where ap.entreprise = p_entreprise
       and ap.role in ('salarie', 'site_referent')
       and not ap.pseudonymise
       and (p_etablissement is null or ap.etablissement = p_etablissement)
  ),
  actes as (
    select m.salarie,
           count(*) filter (where true)                                       as engagees,
           count(*) filter (where m.etat in ('a_valider','validee','validee_auto')) as declarees,
           count(*) filter (where m.etat in ('validee','validee_auto'))        as validees,
           min(m.date_mission) filter (where m.etat in ('validee','validee_auto'))
                                                                              as premiere
      from public.mission m
     where m.entreprise = p_entreprise and m.salarie is not null
     group by m.salarie
  ),
  j as (
    select g.id, g.cree_le,
           coalesce(a.engagees, 0) as engagees,
           coalesce(a.declarees, 0) as declarees,
           coalesce(a.validees, 0) as validees,
           a.premiere
      from gens g left join actes a on a.salarie = g.id
  ),
  d as (
    select (j.premiere - j.cree_le::date)::int as jours
      from j where j.premiere is not null and j.cree_le is not null
       and (j.premiere - j.cree_le::date) >= 0
  ),
  att as (
    select (current_date - j.cree_le::date)::int as jours
      from j where j.premiere is null and j.cree_le is not null
       and (current_date - j.cree_le::date) >= 0
  )
  select
    coalesce((select e.effectif from public.etablissement e where e.id = p_etablissement),
             (select coalesce(ent.effectif, 0) from public.entreprise ent
               where ent.id = p_entreprise))::int,
    (select count(*)::int from j),
    (select count(*)::int from j where j.engagees > 0),
    (select count(*)::int from j where j.declarees > 0),
    (select count(*)::int from j where j.validees > 0),
    (select count(*)::int from j where j.validees > 1),
    ((select count(*) from j) >= v_plancher),
    v_plancher,
    (select percentile_cont(0.5) within group (order by d.jours)::int from d),
    (select count(*)::int from d),
    (select count(*)::int from j),
    (select count(*)::int from att),
    (select percentile_cont(0.5) within group (order by att.jours)::int from att),
    (select count(*)::int from att where att.jours > 90);
end $$;
