-- ---------------------------------------------------------------------------
-- Les écritures qui manquaient
-- ---------------------------------------------------------------------------
-- Pourquoi ce fichier existe. La couche navigateur exposait une soixantaine de
-- méthodes qui modifient l'état ; vingt-six d'entre elles n'avaient aucune
-- fonction ici. Ce n'était pas visible : le proxy de `data.js` retombait sur le
-- moteur en mémoire, l'écran affichait « enregistré », et la modification
-- disparaissait au rechargement suivant. Le contrôle censé l'attraper
-- interrogeait ce même proxy et recevait toujours « oui ».
--
-- Une règle, pour toutes celles qui suivent : elles refont le contrôle de rôle
-- ici, en `security definer`. Une règle qui n'existe que dans le navigateur
-- n'est pas une règle — c'est une suggestion adressée à quelqu'un qui a la
-- console ouverte.

-- ----------------------------------------------------------------- entreprise
-- La fiche de la société, telle que son administrateur la corrige. Ce qui
-- n'est PAS modifiable ici, et pour cause : l'effectif de référence du
-- classement (il vit dans `abonnement`, figé à l'ouverture de la saison), le
-- SIREN (il identifie la personne morale au contrat) et le groupe.
create or replace function public.maj_entreprise(
  p_nom text default null, p_secteur text default null, p_siret text default null,
  p_adresse text default null, p_ca numeric default null,
  p_cout_jour_moyen numeric default null, p_effectif integer default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_ent uuid := private.mon_entreprise();
  v_siret text := nullif(regexp_replace(coalesce(p_siret, ''), '[^0-9]', '', 'g'), '');
begin
  if v_ent is null or private.mon_role() <> 'entreprise_admin' then
    raise exception 'Réservé à l''administrateur de la société' using errcode = '42501';
  end if;
  if p_nom is not null and length(btrim(p_nom)) < 1 then
    raise exception 'Une raison sociale ne peut pas être vide' using errcode = '22023';
  end if;
  if v_siret is not null and (length(v_siret) <> 14 or not private.luhn_ok(v_siret)) then
    raise exception 'Ce SIRET ne peut pas exister' using errcode = '22023';
  end if;
  if p_ca is not null and p_ca < 0 then
    raise exception 'Un chiffre d''affaires ne peut pas être négatif' using errcode = '22023';
  end if;

  update public.entreprise e set
    nom             = coalesce(nullif(btrim(coalesce(p_nom, '')), ''), e.nom),
    secteur         = coalesce(nullif(btrim(coalesce(p_secteur, '')), ''), e.secteur),
    siret           = coalesce(v_siret, e.siret),
    adresse         = coalesce(nullif(btrim(coalesce(p_adresse, '')), ''), e.adresse),
    ca              = coalesce(p_ca, e.ca),
    cout_jour_moyen = coalesce(p_cout_jour_moyen, e.cout_jour_moyen),
    -- L'effectif déclaré sert au plafond de mécénat et à la répartition des
    -- sites. Il ne sert PAS de dénominateur au classement : celui-là est figé
    -- dans l'abonnement, hors de portée du client.
    effectif        = coalesce(p_effectif, e.effectif)
  where e.id = v_ent;
end $$;

-- Les domaines de messagerie qui ouvrent l'inscription. Une liste vide ferme
-- l'entreprise : c'est le sens de la contrainte posée dans `rejoindre_entreprise`.
create or replace function public.maj_domaines(p_domaines text[])
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_ent uuid := private.mon_entreprise();
  v_propres text[];
  v_n integer;
begin
  if v_ent is null or private.mon_role() <> 'entreprise_admin' then
    raise exception 'Réservé à l''administrateur de la société' using errcode = '42501';
  end if;
  select coalesce(array_agg(distinct d), '{}')
    into v_propres
    from unnest(coalesce(p_domaines, '{}')) as x(d0),
         lateral (select lower(btrim(regexp_replace(d0, '^@', ''))) as d) t
   where d ~ '^[a-z0-9.-]+\.[a-z]{2,}$';

  delete from private.domaine_entreprise where entreprise = v_ent;
  insert into private.domaine_entreprise (entreprise, domaine)
  select v_ent, d from unnest(v_propres) as d;
  select count(*) into v_n from private.domaine_entreprise where entreprise = v_ent;

  insert into public.acces (entreprise, profil, quoi, indice)
  values (v_ent, auth.uid(), 'domaines', v_n::text);
  return v_n;
end $$;

-- Comment l'entreprise apparaît dans le classement. Le défaut protège ; ce
-- réglage permet d'en sortir, jamais d'y forcer quelqu'un d'autre.
create or replace function public.regler_visibilite(p_visibilite text)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_ent uuid := private.mon_entreprise();
begin
  if v_ent is null or private.mon_role() <> 'entreprise_admin' then
    raise exception 'Réservé à l''administrateur de la société' using errcode = '42501';
  end if;
  if p_visibilite not in ('auto', 'nom', 'anonyme') then
    raise exception 'Valeur de visibilité inconnue' using errcode = '22023';
  end if;
  update public.entreprise e set visibilite = p_visibilite where e.id = v_ent;
end $$;

-- L'objectif de la saison, compté en personnes. Il est borné par l'effectif de
-- référence : un objectif inatteignable ne motive personne, et il fait mentir
-- l'écran de tous les salariés qui le lisent.
create or replace function public.regler_objectif_saison(p_cible integer default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_ent uuid := private.mon_entreprise();
  v_base integer;
begin
  if v_ent is null or private.mon_role() <> 'entreprise_admin' then
    raise exception 'Réservé à l''administrateur de la société' using errcode = '42501';
  end if;
  if p_cible is null then
    update public.entreprise e set objectif_mobilises = null where e.id = v_ent;
    return;
  end if;
  if p_cible < 1 then
    raise exception 'Un objectif se compte en personnes, et il en faut au moins une'
      using errcode = '22023';
  end if;
  select a.effectif_reference into v_base from public.abonnement a
   where a.entreprise = v_ent and a.saison = private.saison_ouverte();
  if v_base is not null and p_cible > v_base then
    raise exception 'Vous n''avez que % salariés : viser plus haut rend l''objectif inatteignable',
      v_base using errcode = '22023';
  end if;
  update public.entreprise e set objectif_mobilises = p_cible where e.id = v_ent;
end $$;

-- Le classement ordinal entre les sites du groupe. Désactivé par défaut, et
-- c'est une décision du groupe, pas un réglage d'écran.
create or replace function public.activer_classement_sites(p_actif boolean)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_groupe uuid := private.mon_groupe();
begin
  if v_groupe is null or private.mon_role() <> 'entreprise_admin' then
    raise exception 'Réservé à l''administrateur du groupe' using errcode = '42501';
  end if;
  update public.groupe g set classement_sites = coalesce(p_actif, false)
   where g.id = v_groupe;
end $$;

-- ------------------------------------------------------------------- comptes
-- Promouvoir, rétrograder, suspendre. Trois gestes qui touchent au rôle d'une
-- personne : ils vivent dans `private.appartenance`, table qu'aucun client ne
-- peut écrire directement.
create or replace function public.promouvoir_admin(p_profil uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_ent uuid := private.mon_entreprise(); v_role public.role_utilisateur;
begin
  if v_ent is null or private.mon_role() <> 'entreprise_admin' then
    raise exception 'Réservé à l''administrateur de la société' using errcode = '42501';
  end if;
  select a.role into v_role from private.appartenance a
   where a.profil = p_profil and a.entreprise = v_ent;
  if v_role is null then
    raise exception 'Cette personne n''est pas dans votre entreprise' using errcode = '42501';
  end if;
  if v_role <> 'salarie' then
    raise exception 'Seul un salarié se promeut administrateur' using errcode = '22023';
  end if;
  update private.appartenance a set role = 'entreprise_admin'
   where a.profil = p_profil and a.entreprise = v_ent;
end $$;

create or replace function public.retrograder_admin(p_profil uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_ent uuid := private.mon_entreprise(); v_autres integer;
begin
  if v_ent is null or private.mon_role() <> 'entreprise_admin' then
    raise exception 'Réservé à l''administrateur de la société' using errcode = '42501';
  end if;
  select count(*) into v_autres from private.appartenance a
   where a.entreprise = v_ent and a.role = 'entreprise_admin'
     and a.profil <> p_profil and a.actif;
  if v_autres = 0 then
    raise exception 'Il doit rester au moins un administrateur' using errcode = '22023';
  end if;
  update private.appartenance a set role = 'salarie'
   where a.profil = p_profil and a.entreprise = v_ent and a.role = 'entreprise_admin';
end $$;

-- Suspendre un accès sans effacer la personne : ses missions restent, ses points
-- restent acquis à l'entreprise, sa place reste occupée. C'est une mise en
-- pause, pas un retrait — le retrait, lui, pseudonymise.
create or replace function public.suspendre_acces(p_profil uuid, p_suspendre boolean)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_ent uuid := private.mon_entreprise(); v_role public.role_utilisateur; v_actifs integer;
begin
  if v_ent is null or private.mon_role() <> 'entreprise_admin' then
    raise exception 'Réservé à l''administrateur de la société' using errcode = '42501';
  end if;
  select a.role into v_role from private.appartenance a
   where a.profil = p_profil and a.entreprise = v_ent;
  if v_role is null then
    raise exception 'Cette personne n''est pas dans votre entreprise' using errcode = '42501';
  end if;
  if p_suspendre and v_role = 'entreprise_admin' then
    select count(*) into v_actifs from private.appartenance a
     where a.entreprise = v_ent and a.role = 'entreprise_admin' and a.actif
       and a.profil <> p_profil;
    if v_actifs = 0 then
      raise exception 'C''est le dernier administrateur actif. Nommez-en un autre d''abord.'
        using errcode = '22023';
    end if;
  end if;
  update private.appartenance a set actif = not coalesce(p_suspendre, false)
   where a.profil = p_profil and a.entreprise = v_ent;
  insert into public.acces (entreprise, profil, quoi)
  values (v_ent, p_profil, case when p_suspendre then 'suspension' else 'reactivation' end);
end $$;

-- Rattacher quelqu'un au bon site. C'est une correction, pas une sanction : elle
-- doit rester possible sans passer par nous. Les missions déjà faites restent
-- comptées là où elles ont eu lieu.
create or replace function public.confirmer_affectation(
  p_profil uuid, p_etablissement uuid default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_ent uuid := private.mon_entreprise(); v_societe uuid; v_quota integer; v_pris integer;
begin
  if v_ent is null or private.mon_role() <> 'entreprise_admin' then
    raise exception 'Réservé à l''administrateur de la société' using errcode = '42501';
  end if;
  if not exists (select 1 from private.appartenance a
                  where a.profil = p_profil and a.entreprise = v_ent) then
    raise exception 'Cette personne n''est pas dans votre entreprise' using errcode = '42501';
  end if;
  if p_etablissement is not null then
    select et.societe, et.quota into v_societe, v_quota
      from public.etablissement et where et.id = p_etablissement;
    if v_societe is null or v_societe <> v_ent then
      raise exception 'Établissement hors de votre société' using errcode = '42501';
    end if;
    select count(*) into v_pris from private.appartenance a
     where a.etablissement = p_etablissement and a.actif and not a.pseudonymise
       and a.profil <> p_profil;
    if v_pris >= v_quota then
      raise exception 'Le quota de ce site est complet' using errcode = '23514';
    end if;
    update private.appartenance a set etablissement = p_etablissement,
                                      affectation_confirmee = true
     where a.profil = p_profil and a.entreprise = v_ent;
  else
    update private.appartenance a set affectation_confirmee = true
     where a.profil = p_profil and a.entreprise = v_ent;
  end if;
  insert into public.acces (entreprise, profil, quoi) values (v_ent, p_profil, 'affectation');
end $$;

-- Inviter une personne nommément. Le moteur de démonstration créait un compte de
-- toutes pièces ; ici un compte n'existe qu'après authentification, donc ce
-- qu'on crée est un lien nominatif à usage unique, comme pour un référent.
create or replace function public.inviter_salarie(p_nom text, p_mail text)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_ent uuid := private.mon_entreprise();
  v_abo public.abonnement;
  v_pris integer;
  v_code text;
begin
  if v_ent is null or private.mon_role() <> 'entreprise_admin' then
    raise exception 'Réservé à l''administrateur de la société' using errcode = '42501';
  end if;
  if coalesce(length(btrim(p_nom)), 0) < 2
     or p_mail !~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$' then
    raise exception 'Une invitation est nominative : nom et adresse' using errcode = '22023';
  end if;
  if not exists (select 1 from private.domaine_entreprise d
                  where d.entreprise = v_ent
                    and d.domaine = lower(split_part(p_mail, '@', 2))) then
    raise exception 'Cette adresse n''appartient pas à un domaine déclaré' using errcode = '22023';
  end if;
  select * into v_abo from public.abonnement a
   where a.entreprise = v_ent and a.saison = private.saison_ouverte();
  if not found then
    raise exception 'Aucun abonnement ouvert pour cette société' using errcode = '22023';
  end if;
  select count(*) into v_pris from public.affectation_siege s
   where s.abonnement = v_abo.id and s.liberee_le is null;
  if v_pris >= v_abo.sieges then
    raise exception 'Plus aucune place disponible sur cet abonnement' using errcode = '23514';
  end if;

  v_code := replace(replace(replace(
              encode(extensions.gen_random_bytes(16), 'base64'), '+', '-'), '/', '_'), '=', '');
  insert into public.invitation (entreprise, empreinte, indice, places,
    destinataire_nom, destinataire_mail, cree_par, expire_le)
  values (v_ent, extensions.digest(v_code, 'sha256'), substr(v_code, 1, 6), 1,
          btrim(p_nom), lower(btrim(p_mail)), auth.uid(), now() + interval '30 days');
  insert into public.acces (entreprise, profil, quoi, indice)
  values (v_ent, auth.uid(), 'creation_lien', substr(v_code, 1, 6));
  return v_code;
end $$;

create or replace function public.revoquer_invitation(p_invitation uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_ent uuid := private.mon_entreprise(); v_i public.invitation;
begin
  select * into v_i from public.invitation i where i.id = p_invitation;
  if not found then raise exception 'Lien inconnu' using errcode = '42704'; end if;
  if v_i.entreprise <> v_ent or private.mon_role() not in ('entreprise_admin', 'site_referent') then
    raise exception 'Réservé à votre société' using errcode = '42501';
  end if;
  update public.invitation i set active = false where i.id = p_invitation;
  insert into public.acces (entreprise, profil, quoi, indice)
  values (v_ent, auth.uid(), 'revocation_lien', v_i.indice);
end $$;

-- ----------------------------------------------------------------------- CSE
-- L'accès du comité social et économique : nominatif, une place, lecture seule.
create or replace function public.creer_invitation_cse(p_nom text, p_mail text)
returns text
language plpgsql security definer set search_path = '' as $$
declare v_ent uuid := private.mon_entreprise(); v_code text;
begin
  if v_ent is null or private.mon_role() <> 'entreprise_admin' then
    raise exception 'Réservé à l''administrateur de la société' using errcode = '42501';
  end if;
  if coalesce(length(btrim(p_nom)), 0) < 2
     or p_mail !~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$' then
    raise exception 'Un accès CSE est nominatif : nom et adresse' using errcode = '22023';
  end if;
  v_code := replace(replace(replace(
              encode(extensions.gen_random_bytes(16), 'base64'), '+', '-'), '/', '_'), '=', '');
  update public.invitation i set active = false
   where i.entreprise = v_ent and i.pour_cse and i.active;
  insert into public.invitation (entreprise, pour_cse, destinataire_nom, destinataire_mail,
    empreinte, indice, places, cree_par, expire_le)
  values (v_ent, true, btrim(p_nom), lower(btrim(p_mail)),
          extensions.digest(v_code, 'sha256'), substr(v_code, 1, 6), 1,
          auth.uid(), now() + interval '30 days');
  insert into public.acces (entreprise, profil, quoi, indice)
  values (v_ent, auth.uid(), 'lien_cse', substr(v_code, 1, 6));
  return v_code;
end $$;

create or replace function public.rejoindre_comme_cse(p_code text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_i public.invitation; v_uid uuid := auth.uid(); v_email text := auth.email();
begin
  if v_uid is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  select * into v_i from public.invitation i
   where i.empreinte = extensions.digest(p_code, 'sha256') for update;
  if not found or not v_i.pour_cse or not v_i.active or v_i.expire_le < now() then
    raise exception 'Lien invalide ou expiré' using errcode = '42501';
  end if;
  -- Un lien nominatif ne s'utilise pas au nom de quelqu'un d'autre, même s'il
  -- circule : c'est ce qui le distingue d'un lien d'inscription.
  if lower(coalesce(v_email, '')) <> v_i.destinataire_mail then
    raise exception 'Ce lien a été émis pour une autre adresse' using errcode = '42501';
  end if;
  insert into public.profil (id, nom) values (v_uid, v_i.destinataire_nom)
    on conflict (id) do nothing;
  insert into private.appartenance (profil, role, entreprise)
  values (v_uid, 'cse', v_i.entreprise)
    on conflict (profil) do update set role = 'cse', entreprise = excluded.entreprise;
  update public.invitation i set active = false where i.id = v_i.id;
  insert into public.acces (entreprise, profil, quoi, indice)
  values (v_i.entreprise, v_uid, 'acces_cse', v_i.indice);
  return v_i.entreprise;
end $$;

-- ----------------------------------------------------------------- préférences
create or replace function public.maj_preferences(p_preferences jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_new jsonb;
begin
  if v_uid is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  if p_preferences is null or jsonb_typeof(p_preferences) <> 'object' then
    raise exception 'Des réglages sont un objet' using errcode = '22023';
  end if;
  if length(p_preferences::text) > 4000 then
    raise exception 'Réglages trop volumineux' using errcode = '22023';
  end if;
  update public.profil p set preferences = p.preferences || p_preferences, maj_le = now()
   where p.id = v_uid
  returning p.preferences into v_new;
  return v_new;
end $$;

-- -------------------------------------------------------------------- annonces
create or replace function public.rouvrir_annonce(p_annonce uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_a public.annonce;
begin
  select * into v_a from public.annonce a where a.id = p_annonce;
  if not found or v_a.association is distinct from private.mon_association() then
    raise exception 'Réservé à l''association qui l''a publiée' using errcode = '42501';
  end if;
  if v_a.restant <= 0 then
    raise exception 'Cette annonce est complète : il n''y reste aucune place' using errcode = '22023';
  end if;
  update public.annonce a set etat = 'ouverte' where a.id = p_annonce;
end $$;

-- Supprimer, et seulement tant que personne ne s'est engagé. Au-delà, on ferme :
-- effacer une annonce sur laquelle des salariés se sont positionnés effacerait
-- aussi la trace de leur engagement.
create or replace function public.supprimer_annonce(p_annonce uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_a public.annonce; v_n integer;
begin
  select * into v_a from public.annonce a where a.id = p_annonce;
  if not found or v_a.association is distinct from private.mon_association() then
    raise exception 'Réservé à l''association qui l''a publiée' using errcode = '42501';
  end if;
  select count(*) into v_n from public.mission m
   where m.annonce = p_annonce and m.etat <> 'refusee';
  if v_n > 0 then
    raise exception 'Des salariés se sont déjà engagés : fermez l''annonce au lieu de la supprimer'
      using errcode = '23514';
  end if;
  delete from public.annonce a where a.id = p_annonce;
end $$;

-- --------------------------------------------------------------- reçus fiscaux
create or replace function public.maj_reglages_recus(
  p_actif boolean default null, p_eligible boolean default null,
  p_signataire text default null, p_qualite text default null, p_prefixe text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_a uuid := private.mon_association(); v_futur record;
begin
  if v_a is null then
    raise exception 'Réservé à l''association elle-même' using errcode = '42501';
  end if;
  update public.association a set
    eligible_mecenat = coalesce(p_eligible, a.eligible_mecenat),
    signataire   = coalesce(nullif(btrim(coalesce(p_signataire, '')), ''), a.signataire),
    qualite      = coalesce(nullif(btrim(coalesce(p_qualite, '')), ''), a.qualite),
    recu_prefixe = coalesce(nullif(btrim(coalesce(p_prefixe, '')), ''), a.recu_prefixe)
  where a.id = v_a;

  -- `recus_actif` se règle en dernier, et seulement si de quoi émettre un reçu
  -- valable est réuni : un reçu incomplet expose l'association, pas nous.
  if p_actif is not null then
    select eligible_mecenat, signataire, qualite, recu_prefixe, mandat_recus_le
      into v_futur from public.association a where a.id = v_a;
    if p_actif and (not v_futur.eligible_mecenat or v_futur.signataire is null
                    or v_futur.qualite is null or v_futur.recu_prefixe is null
                    or v_futur.mandat_recus_le is null) then
      raise exception 'Il manque de quoi émettre un reçu valable : éligibilité, signataire, qualité, préfixe et mandat'
        using errcode = '22023';
    end if;
    update public.association a set recus_actif = p_actif where a.id = v_a;
  end if;
end $$;

-- ------------------------------------------------------------------- collecte
create or replace function public.clore_campagne(p_campagne uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_c public.campagne_indicateurs;
begin
  select * into v_c from public.campagne_indicateurs c where c.id = p_campagne;
  if not found then raise exception 'Campagne inconnue' using errcode = '42704'; end if;
  if v_c.groupe is distinct from private.mon_groupe() or private.mon_role() <> 'entreprise_admin' then
    raise exception 'Réservé à l''administrateur du groupe' using errcode = '42501';
  end if;
  if v_c.etat = 'close' then
    raise exception 'Cette campagne est déjà close' using errcode = '22023';
  end if;
  if v_c.fin > current_date then
    raise exception 'La période court jusqu''au % : elle ne peut pas être clôturée avant',
      v_c.fin using errcode = '22023';
  end if;

  -- Les sites qui n'ont pas répondu sont clos SANS RÉPONSE, pas comblés avec la
  -- période précédente. Un chiffre absent reste absent : c'est la règle qui rend
  -- le rapport défendable.
  insert into public.observation_indicateur (campagne, etablissement, etat, valeurs)
  select p_campagne, et.id, 'clos_sans_reponse', '{}'::jsonb
    from public.etablissement et
    join public.entreprise e on e.id = et.societe
   where e.groupe = v_c.groupe
     and not exists (select 1 from public.observation_indicateur o
                      where o.campagne = p_campagne and o.etablissement = et.id);

  update public.campagne_indicateurs c set etat = 'close' where c.id = p_campagne;
end $$;

-- ---------------------------------------------------------------- Riseva seul
-- La préinscription vient du site public : elle est ouverte à `anon`, et c'est
-- le seul endroit où quelqu'un qui n'est pas connecté écrit dans cette base.
create or replace function public.preinscrire(
  p_entreprise text, p_contact text, p_effectif integer default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if coalesce(length(btrim(p_entreprise)), 0) < 1
     or coalesce(length(btrim(p_contact)), 0) < 3 then
    raise exception 'Nom de l''entreprise et contact sont nécessaires' using errcode = '22023';
  end if;
  if p_effectif is not null and (p_effectif < 0 or p_effectif > 1000000) then
    raise exception 'Effectif invalide' using errcode = '22023';
  end if;
  insert into public.preinscription (entreprise, contact, effectif)
  values (left(btrim(p_entreprise), 160), left(btrim(p_contact), 160), p_effectif)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.valider_association(p_association uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_bloquant boolean;
begin
  if not private.est_admin() then
    raise exception 'Réservé à Riseva' using errcode = '42501';
  end if;
  -- Un contrôle bloquant interdit la mise en ligne tant qu'il n'a pas été refait.
  -- L'ABSENCE de contrôle, elle, n'est pas bloquante : neuf associations
  -- déclarées sur dix n'ont pas de SIREN, et les exclure reviendrait à ne garder
  -- que les grosses.
  select c.bloquant into v_bloquant from public.controle_association c
   where c.association = p_association order by c.le desc limit 1;
  if coalesce(v_bloquant, false) then
    raise exception 'Le dernier contrôle au registre est bloquant : refaites-le avant la mise en ligne'
      using errcode = '22023';
  end if;
  update public.association a set
    valide = true, suspendue = false,
    verifiee_le = current_date,
    a_reverifier_le = current_date + interval '1 year'
  where a.id = p_association;
end $$;

create or replace function public.suspendre_association(p_association uuid, p_motif text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.est_admin() then
    raise exception 'Réservé à Riseva' using errcode = '42501';
  end if;
  if coalesce(length(btrim(p_motif)), 0) < 3 then
    raise exception 'Une suspension se motive' using errcode = '22023';
  end if;
  update public.association a set suspendue = true where a.id = p_association;
  -- Les annonces ouvertes se ferment avec elle : laisser un salarié s'engager
  -- sur l'annonce d'une association suspendue serait lui promettre une mission
  -- que personne ne confirmera.
  update public.annonce a set etat = 'close'
   where a.association = p_association and a.etat = 'ouverte';
end $$;

-- L'ouverture d'un compte association depuis le site public. La personne est
-- déjà authentifiée — lien de connexion envoyé par courriel — et n'a encore
-- aucune appartenance. Le compte s'ouvre NON VALIDÉ : il existe, il se remplit,
-- et il n'est visible des entreprises qu'après le contrôle au registre.
create or replace function public.ouvrir_compte_association(
  p_nom text, p_ville text, p_resume text default null, p_contact text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  if exists (select 1 from private.appartenance a where a.profil = v_uid) then
    raise exception 'Ce compte appartient déjà à une organisation' using errcode = '22023';
  end if;
  if coalesce(length(btrim(p_nom)), 0) < 2 then
    raise exception 'Le nom de l''association est nécessaire' using errcode = '22023';
  end if;
  if coalesce(length(btrim(p_ville)), 0) < 1 then
    raise exception 'La ville est nécessaire' using errcode = '22023';
  end if;

  insert into public.association (nom, ville, resume, valide)
  values (left(btrim(p_nom), 160), left(btrim(p_ville), 120),
          nullif(left(btrim(coalesce(p_resume, '')), 600), ''), false)
  returning id into v_id;

  insert into public.profil (id, nom)
  values (v_uid, coalesce(nullif(btrim(coalesce(p_contact, '')), ''), left(btrim(p_nom), 160)))
    on conflict (id) do nothing;
  insert into private.appartenance (profil, role, association)
  values (v_uid, 'association', v_id);
  return v_id;
end $$;

-- ---------------------------------------------------------------- exécution
-- `03_rls.sql` a retiré l'exécution par défaut sur tout ce qui serait créé
-- ensuite : sans les lignes ci-dessous, ces fonctions existent et ne sont
-- appelables par personne. On rend nommément, comme pour les autres.
grant execute on function
  public.maj_entreprise(text, text, text, text, numeric, numeric, integer),
  public.maj_domaines(text[]),
  public.regler_visibilite(text),
  public.regler_objectif_saison(integer),
  public.activer_classement_sites(boolean),
  public.promouvoir_admin(uuid),
  public.retrograder_admin(uuid),
  public.suspendre_acces(uuid, boolean),
  public.confirmer_affectation(uuid, uuid),
  public.inviter_salarie(text, text),
  public.revoquer_invitation(uuid),
  public.creer_invitation_cse(text, text),
  public.rejoindre_comme_cse(text),
  public.maj_preferences(jsonb),
  public.rouvrir_annonce(uuid),
  public.supprimer_annonce(uuid),
  public.maj_reglages_recus(boolean, boolean, text, text, text),
  public.clore_campagne(uuid),
  public.valider_association(uuid),
  public.suspendre_association(uuid, text),
  public.ouvrir_compte_association(text, text, text, text)
to authenticated;

-- La préinscription vient du site public : c'est la seule écriture ouverte à qui
-- n'est pas connecté. Elle n'écrit que dans sa propre table, ne lit rien, et ne
-- rend qu'un identifiant.
grant execute on function public.preinscrire(text, text, integer) to anon, authenticated;

-- ---------------------------------------------------------------- propriétaire
-- `03_rls.sql` transfère les SECURITY DEFINER à `riseva_definer`, mais il
-- s'exécute avant ce fichier : sans cette reprise, les fonctions ci-dessus
-- resteraient au superutilisateur, et la recette le dit — c'est exactement ce
-- qu'elle vérifie. Le bloc est le même, et il est idempotent.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      join pg_roles ro on ro.oid = p.proowner
     where n.nspname in ('public','private') and p.prosecdef
       and ro.rolname <> 'riseva_definer'
  loop
    execute format('alter function %s owner to riseva_definer', f.sig);
  end loop;
end $$;

grant execute on function private.luhn_ok(text) to riseva_definer;

-- --------------------------------------------------------- contrat et factures
-- Trois gestes de back-office, et un écran client qui en dépend : « Abonnement »
-- lisait des factures qui n'existaient que dans le jeu de démonstration.
create or replace function public.maj_contrat(
  p_plateforme text default null, p_annuaire text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_ent uuid := private.mon_entreprise();
begin
  if v_ent is null or private.mon_role() <> 'entreprise_admin' then
    raise exception 'Réservé à l''administrateur de la société' using errcode = '42501';
  end if;
  update public.abonnement a set
    plateforme_reception = coalesce(nullif(btrim(coalesce(p_plateforme, '')), ''),
                                    a.plateforme_reception),
    annuaire_id          = coalesce(nullif(btrim(coalesce(p_annuaire, '')), ''),
                                    a.annuaire_id)
  where a.entreprise = v_ent and a.saison = private.saison_ouverte();
end $$;

-- La reconduction est une décision du client, jamais un défaut. C'est ce
-- booléen qui tient la phrase « pas de reconduction tacite ».
create or replace function public.reconduire(p_oui boolean)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_ent uuid := private.mon_entreprise();
begin
  if v_ent is null or private.mon_role() <> 'entreprise_admin' then
    raise exception 'Réservé à l''administrateur de la société' using errcode = '42501';
  end if;
  update public.abonnement a set reconduction = coalesce(p_oui, false)
   where a.entreprise = v_ent and a.saison = private.saison_ouverte();
end $$;

-- Marquer une facture payée est un geste de Riseva : c'est notre banque qui
-- constate l'encaissement, pas le client. Un client qui pourrait déclarer ses
-- propres factures payées n'aurait aucune raison de payer.
create or replace function public.marquer_facture_payee(p_ref text, p_le date default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not private.est_admin() then
    raise exception 'Réservé à Riseva' using errcode = '42501';
  end if;
  select f.id into v_id from public.facture f where f.ref = p_ref;
  if v_id is null then raise exception 'Facture inconnue' using errcode = '42704'; end if;
  update public.facture f set payee_le = coalesce(p_le, current_date) where f.id = v_id;
end $$;

-- L'ouverture d'un compte entreprise, après signature. Elle crée la société, son
-- abonnement pour la saison ouverte, et fige l'effectif de référence du
-- classement : c'est le seul moment où ce nombre s'écrit, et il ne bouge plus.
create or replace function public.creer_compte_entreprise(
  p_nom text, p_effectif integer, p_secteur text default null, p_ville text default null,
  p_montant_ht numeric default 0, p_sieges integer default null,
  p_palier text default null, p_fondateur boolean default false)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_saison uuid := private.saison_ouverte(); v_groupe uuid;
begin
  if not private.est_admin() then
    raise exception 'Réservé à Riseva' using errcode = '42501';
  end if;
  if coalesce(length(btrim(p_nom)), 0) < 1 then
    raise exception 'Une raison sociale est nécessaire' using errcode = '22023';
  end if;
  if p_effectif is null or p_effectif < 1 then
    raise exception 'Un effectif d''au moins une personne est nécessaire' using errcode = '22023';
  end if;
  if v_saison is null then
    raise exception 'Aucune saison ouverte' using errcode = '22023';
  end if;

  -- Un périmètre, même d'une seule société : la collecte d'indicateurs s'y
  -- rattache, et sans lui une société indépendante ne peut ouvrir aucune
  -- campagne. L'interface ne parle de groupe qu'à partir de deux sociétés.
  insert into public.groupe (nom) values (left(btrim(p_nom), 160)) returning id into v_groupe;
  insert into public.entreprise (nom, secteur, ville, effectif, groupe)
  values (left(btrim(p_nom), 160), nullif(btrim(coalesce(p_secteur, '')), ''),
          nullif(btrim(coalesce(p_ville, '')), ''), p_effectif, v_groupe)
  returning id into v_id;
  update public.groupe g set societe_mere = v_id where g.id = v_groupe;

  insert into public.abonnement (entreprise, saison, montant_ht, sieges,
    effectif_reference, palier, fondateur, signe_le)
  values (v_id, v_saison, coalesce(p_montant_ht, 0), coalesce(p_sieges, p_effectif),
          p_effectif, p_palier, coalesce(p_fondateur, false), current_date);
  return v_id;
end $$;

grant execute on function
  public.maj_contrat(text, text),
  public.reconduire(boolean),
  public.marquer_facture_payee(text, date),
  public.creer_compte_entreprise(text, integer, text, text, numeric, integer, text, boolean)
to authenticated;

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      join pg_roles ro on ro.oid = p.proowner
     where n.nspname in ('public','private') and p.prosecdef
       and ro.rolname <> 'riseva_definer'
  loop
    execute format('alter function %s owner to riseva_definer', f.sig);
  end loop;
end $$;

-- `03_rls.sql` pose une policy `riseva_definer` sur chaque table existante au
-- moment ou il s'execute. `facture` est creee dans 01 mais la boucle de 03 la
-- couvre deja ; celle-ci rattrape toute table ajoutee apres coup.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public'
  loop
    if not exists (select 1 from pg_policies
                    where schemaname = 'public' and tablename = t.tablename
                      and policyname = 'moteur_' || t.tablename) then
      execute format(
        'create policy moteur_%I on public.%I to riseva_definer using (true) with check (true)',
        t.tablename, t.tablename);
    end if;
  end loop;
end $$;
