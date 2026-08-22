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
create or replace function public.points_entreprise(p_entreprise uuid, p_saison uuid)
returns table (type public.type_annonce, brut bigint, retenu bigint)
language sql stable security definer set search_path = '' as $$
  with par_type as (
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
    from par_type p cross join total t
$$;

-- Le classement, en un seul agrégat. L'ancienne version rappelait plusieurs
-- fonctions par entreprise, chacune rescannant les missions : coût quadratique
-- garanti dès la centième entreprise.
create or replace function public.classement_saison(p_saison uuid)
returns table (
  entreprise uuid, nom text, categorie text,
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
    select ab.entreprise, e.nom, ab.effectif_reference,
           coalesce(b.brut, 0) as brut, coalesce(r.retenu, 0) as retenu,
           case
             when ab.effectif_reference < 50   then 'TPE'
             when ab.effectif_reference < 250  then 'PME'
             when ab.effectif_reference < 5000 then 'ETI'
             else 'GE' end as categorie
      from public.abonnement ab
      join public.entreprise e on e.id = ab.entreprise
      left join brut   b on b.entreprise = ab.entreprise
      left join retenu r on r.entreprise = ab.entreprise
     where ab.saison = p_saison
  )
  select b.entreprise, b.nom, b.categorie, b.brut, b.retenu, b.effectif_reference,
         round(b.retenu::numeric / b.effectif_reference, 1) as par_salarie,
         rank() over (partition by b.categorie
                      order by b.retenu::numeric / b.effectif_reference desc) as rang,
         count(*) over (partition by b.categorie) as cohorte
    from base b
$$;

-- Un décile n'a aucun sens sur une poignée d'entreprises : sous dix, on ne le
-- calcule pas, plutôt que d'afficher « top 10 % » à un peloton de trois.
create or replace function public.decile_entreprise(p_entreprise uuid, p_saison uuid)
returns integer
language sql stable security definer set search_path = '' as $$
  select case when c.cohorte >= 10
              then ceil((c.rang::numeric / c.cohorte) * 10)::integer end
    from public.classement_saison(p_saison) c
   where c.entreprise = p_entreprise
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
     and (p_entreprise  is null or m.entreprise = p_entreprise)
     and (p_association is null or a.association = p_association)
     and (p_saison      is null or a.saison = p_saison)
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
-- Le contributeur saisit. L'approbateur verrouille. Deux gestes, et deux
-- personnes : sans cette séparation, un chiffre entre dans un document
-- contractuel sans que personne ne l'ait regardé.
create or replace function public.saisir_indicateurs(
  p_campagne uuid, p_etablissement uuid, p_valeurs jsonb)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_ent uuid := private.mon_entreprise();
  v_role public.role_utilisateur := private.mon_role();
  v_societe uuid;
  v_id uuid;
  v_etat public.etat_collecte;
  v_version integer;
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

  select o.id, o.etat, o.version into v_id, v_etat, v_version
    from public.observation_indicateur o
   where o.campagne = p_campagne and o.etablissement = p_etablissement;

  if v_id is null then
    insert into public.observation_indicateur
      (campagne, etablissement, etat, valeurs, saisi_par, saisi_le)
    values (p_campagne, p_etablissement, 'declare', p_valeurs, auth.uid(), now())
    returning id into v_id;
  else
    -- Corriger une valeur approuvée produit une version, jamais un écrasement.
    update public.observation_indicateur o
       set valeurs = o.valeurs || p_valeurs,
           etat = 'declare',
           version = case when v_etat = 'approuve' then o.version + 1 else o.version end,
           saisi_par = auth.uid(), saisi_le = now(),
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
create or replace function public.engager_mission(
  p_annonce uuid, p_quantite numeric, p_cle text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_a public.annonce;
  v_ent uuid := private.mon_entreprise();
  v_uid uuid := auth.uid();
  v_id uuid;
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
  if v_a.type <> 'don_financier' and p_quantite <> floor(p_quantite) then
    raise exception 'Cette annonce se compte en unités entières' using errcode = '23514';
  end if;
  if not exists (select 1 from public.abonnement ab
                  where ab.entreprise = v_ent and ab.saison = v_a.saison) then
    raise exception 'Aucun abonnement pour la saison de cette annonce' using errcode = '42501';
  end if;

  insert into public.mission (annonce, entreprise, salarie, etat, quantite, points,
                              date_mission, cle_idempotence)
  values (p_annonce, v_ent, v_uid, 'engagee', p_quantite,
          private.points_pour(v_a.saison, v_a.type, p_quantite),
          coalesce(v_a.date_prevue, current_date), p_cle)
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
  -- Le verrou sérialise la numérotation : deux reçus ne peuvent pas porter le
  -- même numéro, et aucun numéro n'est attribué côté navigateur.
  select * into v_a from public.association a where a.id = v_d.association for update;
  if not v_a.recus_actif then
    raise exception 'Cette association n''émet pas de reçus' using errcode = '42501';
  end if;
  if v_a.association is not null then null; end if;

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
create or replace view public.entreprise_publique
with (security_invoker = true) as
  select e.id, e.nom, e.secteur, e.ville
    from public.entreprise e;

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
