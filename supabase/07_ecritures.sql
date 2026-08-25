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
  p_cout_jour_moyen numeric default null, p_effectif integer default null,
  -- Le dossier fiscal. Ces cinq-là étaient saisis à l'écran et jetés ici : la
  -- fonction ne les prenait même pas en paramètre. Résultat, `plafondCalculable`
  -- restait faux chez tout client de production et le plafond de l'article
  -- 238 bis n'était jamais appliqué. Contrairement aux autres, ils s'EFFACENT :
  -- `p_efface_vides` permet de remettre à null un montant saisi par erreur,
  -- parce que « zéro don hors Riseva » et « je ne sais pas » ne donnent pas le
  -- même plafond, et que le produit refuse d'affirmer le premier pour l'autre.
  p_cout_heure_charge numeric default null,
  p_exercice_debut date default null, p_exercice_fin date default null,
  p_dons_hors_riseva numeric default null, p_report_anterieur numeric default null,
  p_efface_vides boolean default false,
  p_referent_nom text default null, p_referent_mail text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_ent uuid := private.mon_entreprise();
  v_siret text := nullif(regexp_replace(coalesce(p_siret, ''), '[^0-9]', '', 'g'), '');
  v_deb date; v_fin date;
begin
  -- L'effectif de la société ne peut pas descendre sous la somme de ses sites.
  -- `creer_etablissement` et `modifier_etablissement` appliquent la règle dans
  -- un sens ; celle-ci ne l'appliquait pas dans l'autre. Une société de 210
  -- salariés répartis sur trois sites passée à 3 se retrouvait avec « il reste
  -- -167 places à placer » et l'administrateur ne pouvait plus toucher à aucun
  -- site, pas même pour revenir en arrière.
  if p_effectif is not null and p_effectif < coalesce(
       (select sum(et.effectif) from public.etablissement et
         where et.societe = private.mon_entreprise() and et.ferme_le is null), 0) then
    raise exception 'Vos sites déclarent déjà % salariés : corrigez-les d''abord',
      (select sum(et.effectif) from public.etablissement et
        where et.societe = private.mon_entreprise() and et.ferme_le is null)
      using errcode = '23514';
  end if;
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
  -- Les deux bornes d'exercice se tiennent. Poser la nouvelle date de début sans
  -- la nouvelle date de fin laissait `coalesce` remettre l'ancienne : la
  -- contrainte de table refusait la ligne, et l'écran rendait une erreur 23514
  -- illisible sur un formulaire où rien ne semblait faux. On calcule donc les
  -- deux valeurs EFFECTIVES — exactement comme l'`update` plus bas les calcule —
  -- et on refuse avec une phrase que quelqu'un peut lire.
  select e.exercice_debut, e.exercice_fin into v_deb, v_fin
    from public.entreprise e where e.id = v_ent;
  v_deb := case when p_efface_vides then p_exercice_debut else coalesce(p_exercice_debut, v_deb) end;
  v_fin := case when p_efface_vides then p_exercice_fin   else coalesce(p_exercice_fin, v_fin) end;
  if v_deb is not null and v_fin is not null and v_fin <= v_deb then
    raise exception 'La fin de l''exercice doit suivre son début : corrigez les deux dates ensemble'
      using errcode = '22023';
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
    effectif        = coalesce(p_effectif, e.effectif),
    -- `p_efface_vides` dit que le FORMULAIRE COMPLET des paramètres a été soumis :
    -- une case laissée vide y est alors une décision, pas une absence, et doit
    -- effacer. Sans ce drapeau, un champ rempli par erreur — l'adresse
    -- personnelle d'un référent parti, un montant de dons faux — ne pouvait plus
    -- jamais être retiré : le `coalesce` le faisait revenir à chaque
    -- enregistrement, et l'écran disait « enregistré ».
    cout_heure_charge = case when p_efface_vides then p_cout_heure_charge
                             else coalesce(p_cout_heure_charge, e.cout_heure_charge) end,
    exercice_debut  = case when p_efface_vides then p_exercice_debut
                           else coalesce(p_exercice_debut, e.exercice_debut) end,
    exercice_fin    = case when p_efface_vides then p_exercice_fin
                           else coalesce(p_exercice_fin, e.exercice_fin) end,
    dons_hors_riseva = case when p_efface_vides then p_dons_hors_riseva
                            else coalesce(p_dons_hors_riseva, e.dons_hors_riseva) end,
    report_anterieur = case when p_efface_vides then p_report_anterieur
                            else coalesce(p_report_anterieur, e.report_anterieur) end,
    referent_nom    = case when p_efface_vides then nullif(btrim(coalesce(p_referent_nom, '')), '')
                           else coalesce(nullif(btrim(coalesce(p_referent_nom, '')), ''), e.referent_nom) end,
    referent_mail   = case when p_efface_vides then nullif(btrim(coalesce(p_referent_mail, '')), '')
                           else coalesce(nullif(btrim(coalesce(p_referent_mail, '')), ''), e.referent_mail) end
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
  -- Un referent de site ne revoque que les liens de SON site. La policy de
  -- lecture le bornait deja ainsi ; l'ecriture etait plus large que la lecture,
  -- ce qui lui permettait de couper le lien d'inscription d'un autre site.
  if private.mon_role() = 'site_referent'
     and v_i.etablissement is distinct from private.mon_etablissement() then
    raise exception 'Ce lien appartient à un autre site' using errcode = '42501';
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
-- Ses propres reglages, pour lui seul. Une vue plutot qu'une colonne accordee :
-- la policy de lecture de `profil` laisse voir les lignes des collegues, donc
-- accorder la colonne revenait a publier les reglages de tout le monde.
create or replace view public.profil_reglages as
  select p.id, p.preferences
    from public.profil p
   where p.id = auth.uid();

create or replace function public.maj_preferences(p_preferences jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_new jsonb;
begin
  if v_uid is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  if p_preferences is null or jsonb_typeof(p_preferences) <> 'object' then
    raise exception 'Des réglages sont un objet' using errcode = '22023';
  end if;
  -- La borne porte sur le RESULTAT fusionne : borner la seule entree laissait
  -- passer un cumul au-dela de quatre mille caracteres, et la contrainte de la
  -- table levait alors une erreur brute a la place d'un message lisible.
  if length(((select p.preferences from public.profil p where p.id = v_uid)
             || p_preferences)::text) > 4000 then
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

  -- Une campagne appartient a un groupe OU a une societe, jamais aux deux. Le
  -- controle portait sur le seul groupe : pour une campagne de societe, les
  -- deux cotes valaient NULL, `is distinct from` rendait faux, et n'importe quel
  -- administrateur sans groupe pouvait clore la campagne d'une autre societe.
  if private.mon_role() <> 'entreprise_admin'
     or (v_c.groupe is not null and v_c.groupe is distinct from private.mon_groupe())
     or (v_c.groupe is null and v_c.entreprise is distinct from private.mon_entreprise()) then
    raise exception 'Réservé à l''administrateur du périmètre de cette campagne'
      using errcode = '42501';
  end if;
  -- L'etat de cloture est porte par `close_le`, pas par une colonne `etat` :
  -- celle-ci n'existe pas, et la fonction echouait donc a chaque appel.
  if v_c.close_le is not null then
    raise exception 'Cette campagne est déjà close' using errcode = '22023';
  end if;
  if v_c.fin > current_date then
    raise exception 'La période court jusqu''au % : elle ne peut pas être clôturée avant',
      v_c.fin using errcode = '22023';
  end if;

  -- L'effet lui-meme est ecrit une seule fois, dans `private.clore_campagne_effet` :
  -- la tache planifiee qui clot a l'echeance doit produire exactement le meme
  -- etat que cette fonction-ci, et deux copies d'une regle finissent toujours
  -- par diverger.
  perform private.clore_campagne_effet(p_campagne);
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
  -- Son ABSENCE l'interdit aussi, désormais : la vitrine promet que Riseva
  -- vérifie l'enregistrement administratif de chaque structure avant de la
  -- rendre visible, et cette phrase était fausse tant qu'on pouvait valider sans
  -- avoir rien regardé. Ça n'exclut pas les petites : `controler_association`
  -- accepte une association sans SIREN et conclut « absent », ce qui est une
  -- réponse datée et conservée. Ce qu'on exige, c'est d'avoir regardé.
  -- `cree_le` départage : `le` est une DATE, et deux contrôles du même jour
  -- étaient à égalité — l'index rendait alors l'ancien d'abord. Un contrôle
  -- bloquant refait dans la foulée, et corrigé, ne débloquait rien avant le
  -- lendemain, alors que les deux messages ci-dessous disent « refaites-le ».
  select c.bloquant into v_bloquant from public.controle_association c
   where c.association = p_association order by c.le desc, c.cree_le desc limit 1;
  if not found then
    raise exception 'Aucun contrôle au registre n''a été consigné : faites-le avant la mise en ligne'
      using errcode = '22023';
  end if;
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

-- ------------------------------------------ un don par carte, en un seul geste
-- `confirmer_don` crée le don et la mission ; elle ne touche pas à l'intention.
-- Le chemin virement, lui, la solde. Résultat : un don payé PAR CARTE laissait
-- son intention en « annoncée », l'association la voyait dans sa liste de
-- virements attendus, cliquait « j'ai bien reçu » — et un SECOND don était créé,
-- avec ses points et son reçu, pour de l'argent encaissé une seule fois. Deux
-- cents euros versés, quatre cents déclarés. À défaut de ce double comptage, la
-- tâche de nuit finissait par marquer l'intention « abandonnée, sans virement à
-- l'échéance », ce qui est faux pour un paiement carte abouti.
--
-- Les deux écritures sont donc faites ensemble, ici, et pas par deux allers-
-- retours réseau qu'une coupure peut séparer.
create or replace function public.confirmer_don_carte(
  p_intention uuid, p_fournisseur text, p_reference text, p_montant numeric)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_i public.intention_don; v_don uuid;
begin
  select * into v_i from public.intention_don i where i.id = p_intention for update;
  if not found then raise exception 'Intention introuvable' using errcode = '42704'; end if;

  -- Idempotente comme `confirmer_don` : un retour rejoué ne crée pas un deuxième
  -- don, il ressort le premier.
  if v_i.etat = 'recue' then
    return v_i.mission;
  end if;

  v_don := public.confirmer_don(p_fournisseur, p_reference, v_i.annonce,
                                p_montant, v_i.origine, v_i.salarie);
  update public.intention_don i
     set etat = 'recue', montant_recu = p_montant, confirme_le = now(),
         mission = (select d.mission from public.don d where d.id = v_don)
   where i.id = p_intention;
  return v_don;
end $$;

-- ------------------------------------------- le RIB d'UNE association, à la fois
-- La fiche publique d'une association affiche son RIB : c'est le principe même
-- du don par virement, et l'association le publie déjà sur son propre site.
-- Ce qui n'est pas acceptable, c'est de les rendre TOUS d'un coup à qui n'est
-- pas connecté. Cette fonction en rend un seul, pour l'association qu'on
-- regarde, et seulement si elle est vérifiée et non suspendue — les mêmes
-- conditions que la fiche elle-même.
create or replace function public.coordonnees_don(p_association uuid)
returns table (titulaire text, iban text, bic text)
language sql stable security definer set search_path = '' as $$
  select a.titulaire_compte, a.iban, a.bic
    from public.association a
   where a.id = p_association
     and ((a.valide and not a.suspendue)
          or a.id = private.mon_association()
          or private.est_admin())
$$;

-- --------------------------------------------------- résoudre un lien d'entrée
-- Ce que la porte d'entrée doit savoir AVANT que quiconque soit connecté : de
-- quelle entreprise il s'agit, de quel site, s'il reste des places, et si le
-- lien nomme quelqu'un. La table `invitation` n'est lisible que par
-- l'administrateur et Riseva — c'est correct, elle porte des adresses — et la
-- page `rejoindre.html` la lisait quand même : elle recevait une table vide et
-- répondait « Ce code n'existe pas » à TOUS les salariés. Le seul chemin prévu
-- pour faire entrer quelqu'un était mort au seuil.
--
-- Le code EST le secret : le rendre à qui le détient déjà n'ouvre rien de neuf.
-- On ne rend rien d'autre — ni l'empreinte, ni les autres liens, ni la liste des
-- personnes — et un code inconnu ne rend aucune ligne, pas un message qui
-- distinguerait « inconnu » de « expiré ».
create or replace function public.resoudre_invitation(p_code text)
returns table (
  entreprise uuid, entreprise_nom text,
  etablissement uuid, etablissement_nom text, etablissement_ville text,
  etablissement_quota integer,
  pour_referent boolean, pour_cse boolean,
  destinataire_nom text, destinataire_mail text,
  places integer, utilisees integer, restantes integer,
  restantes_abonnement integer, active boolean, expire_le timestamptz,
  domaines text[])
language sql stable security definer set search_path = '' as $$
  select
    i.entreprise, e.nom,
    i.etablissement, et.nom, et.ville, et.quota,
    i.pour_referent, coalesce(i.pour_cse, false),
    i.destinataire_nom, i.destinataire_mail,
    i.places,
    (select count(*)::integer from public.affectation_siege s
      where s.invitation = i.id and s.liberee_le is null),
    greatest(0, i.places - (select count(*)::integer from public.affectation_siege s
                             where s.invitation = i.id and s.liberee_le is null)),
    coalesce((select ab.sieges - (select count(*)::integer from public.affectation_siege s
                                   where s.abonnement = ab.id and s.liberee_le is null)
                from public.abonnement ab
               where ab.entreprise = i.entreprise and ab.saison = private.saison_ouverte()), 0),
    i.active and i.expire_le > now(),
    i.expire_le,
    -- Les domaines acceptés, pour que la page puisse le dire AVANT la saisie
    -- plutôt que de refuser après. Ce ne sont pas des données personnelles :
    -- c'est le nom de domaine de l'employeur.
    coalesce((select array_agg(d.domaine order by d.domaine)
                from private.domaine_entreprise d where d.entreprise = i.entreprise),
             '{}'::text[])
  from public.invitation i
  join public.entreprise e on e.id = i.entreprise
  left join public.etablissement et on et.id = i.etablissement
 where i.empreinte = extensions.digest(p_code, 'sha256')
$$;

-- --------------------------------------------------------------- mon équipe
-- Le rôle, le site et l'état de chaque personne de MA société. Ces colonnes
-- vivent dans le schéma privé et n'en sortent pas : ouvrir `appartenance` à
-- `authenticated` donnerait à chaque salarié l'organigramme de toute la base.
--
-- Sans cette fonction, l'application recevait bien les NOMS de ses collègues —
-- la policy de `profil` les rend — mais aucun rôle, aucune société, aucun site :
-- `chargerEtat` les posait à `null`. Toutes les dérivations qui filtrent sur le
-- rôle rendaient donc une liste vide. L'écran Équipe d'un client de deux cents
-- personnes affichait « Personne pour l'instant » et « 0 place occupée », la
-- carte du CSE disait toujours « pas ouvert », aucun bouton « nommer
-- administrateur » n'apparaissait sur personne, et le rapport annuel comptait
-- un salarié. La démonstration, dont le jeu de données porte les rôles,
-- marchait parfaitement.
--
-- Elle ne rend que MA société : ni les autres sociétés du groupe — un groupe
-- consolide des agrégats, jamais des identités — ni qui que ce soit d'ailleurs.
-- Un compte CSE en est exclu : il lit des chiffres, pas une liste de personnes.
create or replace function public.mon_equipe()
returns table (id uuid, nom text, role public.role_utilisateur,
               etablissement uuid, actif boolean, pseudonymise boolean,
               retire_le timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id, p.nom, a.role, a.etablissement, a.actif, a.pseudonymise, a.retire_le
    from private.appartenance a
    join public.profil p on p.id = a.profil
   where private.mon_entreprise() is not null
     and private.mon_role() in ('entreprise_admin','site_referent','salarie')
     and a.entreprise = private.mon_entreprise()
$$;

-- ------------------------------------------------------------- qui suis-je
-- Le rôle d'une personne, son entreprise, son site, son groupe. Ces colonnes
-- vivent dans le schéma privé et n'en sortent pas : ouvrir `appartenance` à
-- `authenticated` donnerait à chaque salarié l'organigramme de toute la base.
--
-- Sans cette fonction, l'application n'avait AUCUN moyen de connaître le rôle de
-- la personne connectée : `chargerEtat` posait `role: null` sur chaque profil,
-- le routeur cherchait `ROUTES[null]`, et l'écran restait blanc. La
-- démonstration marchait — son jeu de données porte les rôles — et la
-- production ne s'ouvrait pour personne.
--
-- Elle ne rend QUE la ligne de l'appelant. Pas de paramètre : il n'y a rien à
-- demander, la réponse est celle du jeton.
create or replace function public.mon_profil()
returns table (id uuid, nom text, role public.role_utilisateur,
               entreprise uuid, association uuid, etablissement uuid,
               groupe uuid, actif boolean)
language sql stable security definer set search_path = '' as $$
  -- Pas d'adresse : elle vit dans `auth.users`, que cette fonction n'a pas à
  -- pouvoir lire. Le navigateur a déjà la sienne par sa propre session.
  select p.id, p.nom, a.role, a.entreprise, a.association, a.etablissement,
         a.groupe, a.actif
    from private.appartenance a
    join public.profil p on p.id = a.profil
   where a.profil = auth.uid() and a.actif and not a.pseudonymise
$$;

-- ---------------------------------------------------------------- exécution
-- `03_rls.sql` a retiré l'exécution par défaut sur tout ce qui serait créé
-- ensuite : sans les lignes ci-dessous, ces fonctions existent et ne sont
-- appelables par personne. On rend nommément, comme pour les autres.
grant select on public.profil_reglages to authenticated;

grant execute on function
  public.maj_entreprise(text, text, text, text, numeric, numeric, integer,
                        numeric, date, date, numeric, numeric, boolean, text, text),
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
  public.ouvrir_compte_association(text, text, text, text),
  public.mon_profil(),
  public.mon_equipe()
to authenticated;

-- La porte d'entrée est ouverte à qui n'est pas encore connecté : c'est tout
-- l'objet d'un lien d'inscription.
grant execute on function public.resoudre_invitation(text) to anon, authenticated;
grant execute on function public.coordonnees_don(uuid) to anon, authenticated;
grant execute on function public.confirmer_don_carte(uuid, text, text, numeric) to service_role;

-- La préinscription vient du site public : c'est la seule écriture ouverte à qui
-- n'est pas connecté. Elle n'écrit que dans sa propre table, ne lit rien, et ne
-- rend qu'un identifiant.
grant execute on function public.preinscrire(text, text, integer) to anon, authenticated;

-- ---------------------------------------------------------------- propriétaire
-- `03_rls.sql` transfère les SECURITY DEFINER à `riseva_definer`, mais il
-- s'exécute avant ce fichier : sans cette reprise, les fonctions ci-dessus
-- resteraient au superutilisateur, et la recette le dit — c'est exactement ce
-- qu'elle vérifie. Le bloc est le même, et il est idempotent.

-- ═══════════════════════════════════════════════════════════════════════════
-- LE COFFRE DE PREUVES
--
-- Trois fonctions, et une seule idée : un chiffre qu'on ne peut pas remonter à
-- sa source n'est pas un chiffre, c'est une affirmation. Le dépôt attache une
-- pièce à un objet du périmètre de l'appelant ; la lecture rend la liste avec
-- son empreinte ; le retrait est possible tant que personne n'a approuvé, et
-- plus jamais après.
--
-- Ce que ces fonctions ne font pas : toucher au fichier. Il est déposé dans le
-- stockage objet par le navigateur, sous une clé qui commence par
-- l'identifiant de l'entreprise, et la politique du bucket tranche là-dessus.
-- La base ne voit passer que le nom, le poids, le type et l'empreinte.
-- ═══════════════════════════════════════════════════════════════════════════

-- L'identifiant de l'entreprise de l'appelant. Le navigateur en a besoin pour
-- construire la cle de stockage, et il n'a aucun autre moyen de le connaitre
-- sans lire une table qu'on ne lui ouvre pas pour ca.
create or replace function public.mon_entreprise_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select private.mon_entreprise()
$$;

create or replace function public.joindre_piece(
  p_objet text, p_cible uuid, p_chemin text, p_nom text,
  p_type text, p_taille integer, p_empreinte text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_ent uuid := private.mon_entreprise();
  v_id  uuid;
  v_ok  boolean := false;
begin
  -- Le comité ne dépose rien. La policy de lecture, `pieces_de` et les deux
  -- politiques du bucket l'écartent toutes explicitement du coffre ; les deux
  -- écritures, non. Un accès de lecture seule qui peut écrire n'est pas un
  -- accès de lecture seule.
  if private.mon_role() = 'cse' then
    raise exception 'Un accès CSE est en lecture seule' using errcode = '42501';
  end if;
  if v_ent is null then
    raise exception 'Réservé aux comptes d''entreprise' using errcode = '42501';
  end if;

  -- Le rattachement se vérifie objet par objet : c'est le seul endroit où l'on
  -- s'assure qu'un site ne joint pas sa facture au chiffre d'un autre.
  if p_objet = 'observation' then
    select exists (
      select 1 from public.observation_indicateur o
        join public.etablissement e on e.id = o.etablissement
       where o.id = p_cible
         and (e.societe = v_ent or private.dans_mon_groupe(e.societe))) into v_ok;
  elsif p_objet = 'mission' then
    select exists (select 1 from public.mission m
                    where m.id = p_cible and m.entreprise = v_ent) into v_ok;
  elsif p_objet = 'don' then
    select exists (select 1 from public.don d
                    where d.id = p_cible and d.entreprise = v_ent) into v_ok;
  else
    raise exception 'Objet inconnu : %', p_objet using errcode = '22023';
  end if;

  if not v_ok then
    raise exception 'Cet élément n''est pas dans votre périmètre' using errcode = '42501';
  end if;

  -- La clé du stockage doit commencer par l'entreprise. Sans cette contrainte,
  -- une ligne pourrait pointer vers le fichier d'une autre : la politique du
  -- bucket protège le fichier, elle ne protège pas le lien qu'on écrit vers lui.
  if p_chemin not like v_ent::text || '/%' then
    raise exception 'Chemin de stockage hors de votre espace' using errcode = '42501';
  end if;

  insert into public.piece_jointe (
    entreprise, objet, observation, mission, don,
    chemin, nom, type_mime, taille, empreinte, depose_par)
  values (
    v_ent, p_objet::public.objet_piece,
    case when p_objet = 'observation' then p_cible end,
    case when p_objet = 'mission'     then p_cible end,
    case when p_objet = 'don'         then p_cible end,
    p_chemin, p_nom, p_type, p_taille, p_empreinte, auth.uid())
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.retirer_piece(p_piece uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_p public.piece_jointe; v_etat public.etat_collecte;
begin
  if private.mon_role() = 'cse' then
    raise exception 'Un accès CSE est en lecture seule' using errcode = '42501';
  end if;
  select * into v_p from public.piece_jointe p where p.id = p_piece;
  if not found then
    raise exception 'Pièce introuvable' using errcode = 'P0002';
  end if;
  if not (v_p.entreprise = private.mon_entreprise()
          or private.dans_mon_groupe(v_p.entreprise)) then
    raise exception 'Cette pièce n''est pas dans votre périmètre' using errcode = '42501';
  end if;
  if v_p.retire_le is not null then
    return;                                   -- déjà retirée : geste idempotent
  end if;

  -- Une pièce accrochée à une observation approuvée ne se retire plus. Le
  -- chiffre est entré dans un rapport ; sa justification part avec lui.
  if v_p.observation is not null then
    select o.etat into v_etat from public.observation_indicateur o where o.id = v_p.observation;
    if v_etat = 'approuve' then
      raise exception 'Cette valeur est approuvée : sa pièce ne se retire plus'
        using errcode = '42501';
    end if;
  end if;

  update public.piece_jointe p
     set retire_le = now(), retire_par = auth.uid()
   where p.id = p_piece;
end $$;

-- La liste des pièces d'un objet, avec de quoi les afficher et les vérifier.
create or replace function public.pieces_de(p_objet text, p_cible uuid)
returns table (id uuid, nom text, type_mime text, taille integer,
               empreinte text, chemin text, depose_le timestamptz, depose_par text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.nom, p.type_mime, p.taille, p.empreinte, p.chemin, p.depose_le,
         coalesce(pr.nom, 'compte retiré')
    from public.piece_jointe p
    left join public.profil pr on pr.id = p.depose_par
   where p.retire_le is null
     and ((p_objet = 'observation' and p.observation = p_cible)
       or (p_objet = 'mission'     and p.mission     = p_cible)
       or (p_objet = 'don'         and p.don         = p_cible))
     and (p.entreprise = private.mon_entreprise()
          or private.dans_mon_groupe(p.entreprise)
          or private.est_admin())
     and private.mon_role() is distinct from 'cse'
   order by p.depose_le;
$$;

grant execute on function public.mon_entreprise_id() to authenticated;
grant execute on function public.joindre_piece(text, uuid, text, text, text, integer, text)
  to authenticated;
grant execute on function public.retirer_piece(uuid) to authenticated;
grant execute on function public.pieces_de(text, uuid) to authenticated;

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

-- La signature d'un contrat sur un compte DÉJÀ OUVERT.
--
-- Elle manquait, et son absence était un piège. Un compte ouvert en libre-service
-- démarre avec l'abonnement de l'essai : dix places, zéro euro, aucune date de
-- signature. `creer_compte_entreprise`, juste en dessous, ne pouvait pas servir à
-- le convertir — elle CRÉE une société et un abonnement, et `abonnement` porte
-- `unique (entreprise, saison)`. Autrement dit, une entreprise de six cents
-- personnes pouvait signer, payer, et rester à dix places pour toute la saison,
-- pendant que l'écran lui promettait le contraire. La seule issue aurait été de
-- recréer la société en double, en abandonnant ses salariés et ses missions.
--
-- Ce qu'elle NE touche PAS : `effectif_reference`. Il a été figé à l'ouverture,
-- c'est le dénominateur du classement normalisé, et le laisser bouger après coup
-- reviendrait à laisser réécrire un classement déjà publié.
create or replace function public.signer_contrat(
  p_entreprise uuid, p_montant_ht numeric, p_sieges integer,
  p_palier text default null, p_fondateur boolean default false,
  p_le date default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_saison uuid := private.saison_ouverte(); v_pris integer; v_abo uuid;
begin
  if not private.est_admin() then
    raise exception 'Réservé à Riseva' using errcode = '42501';
  end if;
  if p_sieges is null or p_sieges < 1 then
    raise exception 'Un contrat ouvre au moins une place' using errcode = '22023';
  end if;
  if p_montant_ht is null or p_montant_ht < 0 then
    raise exception 'Un montant ne peut pas être négatif' using errcode = '22023';
  end if;
  if p_palier is not null and p_palier not in ('tpe','pme','eti','ge','ge2','ge3') then
    raise exception 'Palier inconnu : %', p_palier using errcode = '22023';
  end if;
  select a.id into v_abo from public.abonnement a
   where a.entreprise = p_entreprise and a.saison = v_saison;
  if v_abo is null then
    raise exception 'Aucun abonnement à signer pour cette entreprise sur la saison ouverte'
      using errcode = '42704';
  end if;
  -- On ne descend pas sous ce qui est déjà occupé : réduire les places en dessous
  -- des comptes existants laisserait des salariés inscrits sur des sièges qui
  -- n'existent plus, et personne ne saurait lesquels retirer.
  --
  -- `sieges_pris` prend un ABONNEMENT, pas une entreprise. Lui passer l'un pour
  -- l'autre ne lève rien — les deux sont des uuid — et la fonction rendait
  -- silencieusement zéro : la garde ne se déclenchait jamais, et un contrat à
  -- dix places pouvait être enregistré sur une société qui en occupait quarante.
  v_pris := private.sieges_pris(v_abo);
  if p_sieges < v_pris then
    raise exception '% places sont déjà occupées : le contrat ne peut pas en ouvrir moins',
      v_pris using errcode = '23514';
  end if;
  update public.abonnement a set
    montant_ht = p_montant_ht,
    sieges     = p_sieges,
    palier     = coalesce(p_palier, a.palier),
    fondateur  = coalesce(p_fondateur, a.fondateur),
    signe_le   = coalesce(p_le, current_date)
   where a.id = v_abo;
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

-- ----------------------------------------------- une entreprise s'inscrit seule
-- La fonction du dessus est l'outil de Riseva : elle exige `est_admin()`, et
-- c'est bien ainsi — elle fixe un montant et un palier, c'est-à-dire un contrat.
-- Mais l'écran d'accueil propose « Créer un compte entreprise » à n'importe quel
-- visiteur, et ce bouton n'a JAMAIS pu aboutir : chaque clic finissait sur
-- « Réservé à Riseva ». Pire, même en levant la garde, personne ne serait
-- devenu administrateur de l'entreprise créée — aucune ligne d'appartenance
-- n'était écrite nulle part — et l'application, incapable de dire quel rôle
-- avait la personne, la renvoyait indéfiniment à l'écran de connexion.
--
-- Celle-ci ouvre un compte pour la personne connectée, la nomme administratrice,
-- déclare le domaine de son adresse et rend le premier lien d'inscription. Elle
-- ne fixe aucun montant : le contrat se signe ensuite, et un abonnement sans
-- date de signature est exactement ce que l'écran doit montrer.
create or replace function private.domaine_grand_public(p_domaine text)
returns boolean language sql immutable parallel safe set search_path = '' as $$
  -- Un domaine de messagerie grand public n'identifie pas un employeur : le
  -- déclarer ouvrirait le lien d'inscription à la moitié de la France.
  select p_domaine = any (array[
    'gmail.com','googlemail.com','outlook.com','outlook.fr','hotmail.com','hotmail.fr',
    'live.com','live.fr','msn.com','yahoo.com','yahoo.fr','free.fr','orange.fr',
    'wanadoo.fr','laposte.net','sfr.fr','bbox.fr','numericable.fr','icloud.com',
    'me.com','mac.com','protonmail.com','proton.me','gmx.fr','gmx.com','aol.com'])
$$;

create or replace function public.ouvrir_compte_entreprise(
  p_nom text, p_effectif integer, p_secteur text default null, p_ville text default null,
  p_contact text default null)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_mail text := auth.email();
  v_dom text;
  v_saison uuid := private.saison_ouverte();
  v_groupe uuid; v_id uuid; v_abo uuid;
  v_code text; v_indice text;
  -- Le plafond de l'essai. Un compte ouvert en libre-service n'a rien acheté :
  -- il ouvrait pourtant autant de places que l'effectif déclaré, c'est-à-dire
  -- tout le produit, gratuitement et pour toute la saison. Dix places suffisent
  -- pour faire tourner une première mission avec une équipe, et pas pour équiper
  -- une entreprise de six cents personnes sans jamais signer. La signature du
  -- contrat porte les places au nombre convenu ; c'est `signer_contrat`, du
  -- côté de Riseva, qui l'écrit.
  v_essai constant integer := 10;
begin
  if v_uid is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  if v_mail is null or position('@' in v_mail) = 0 then
    raise exception 'Adresse professionnelle introuvable' using errcode = '42501';
  end if;
  if exists (select 1 from private.appartenance a where a.profil = v_uid) then
    raise exception 'Ce compte appartient déjà à une organisation' using errcode = '22023';
  end if;
  if coalesce(length(btrim(p_nom)), 0) < 2 then
    raise exception 'Une raison sociale est nécessaire' using errcode = '22023';
  end if;
  if p_effectif is null or p_effectif < 1 then
    raise exception 'Un effectif d''au moins une personne est nécessaire' using errcode = '22023';
  end if;
  if v_saison is null then
    raise exception 'Aucune saison ouverte' using errcode = '22023';
  end if;

  insert into public.groupe (nom) values (left(btrim(p_nom), 160)) returning id into v_groupe;
  insert into public.entreprise (nom, secteur, ville, effectif, groupe)
  values (left(btrim(p_nom), 160), nullif(btrim(coalesce(p_secteur, '')), ''),
          nullif(btrim(coalesce(p_ville, '')), ''), p_effectif, v_groupe)
  returning id into v_id;
  update public.groupe g set societe_mere = v_id where g.id = v_groupe;

  -- Aucun montant, aucune date de signature : rien n'est vendu ici. Les places
  -- sont donc celles de l'essai, pas celles de l'effectif déclaré.
  insert into public.abonnement (entreprise, saison, montant_ht, sieges, effectif_reference)
  values (v_id, v_saison, 0, least(p_effectif, v_essai), p_effectif)
  returning id into v_abo;

  insert into public.profil (id, nom)
  values (v_uid, coalesce(nullif(btrim(coalesce(p_contact, '')), ''),
                          split_part(v_mail, '@', 1)))
    on conflict (id) do nothing;
  insert into private.appartenance (profil, role, entreprise, groupe)
  values (v_uid, 'entreprise_admin', v_id, v_groupe);

  -- Le domaine de la fondatrice, sauf s'il s'agit d'une messagerie grand
  -- public : dans ce cas on n'en déclare aucun, et l'écran le dit — mieux vaut
  -- une entreprise qui sait qu'il lui manque un domaine qu'un lien d'inscription
  -- ouvert à toute la planète.
  v_dom := lower(split_part(v_mail, '@', 2));
  if not private.domaine_grand_public(v_dom) then
    insert into private.domaine_entreprise (entreprise, domaine)
    values (v_id, v_dom) on conflict do nothing;
  end if;

  -- Le premier lien d'inscription, rendu UNE fois : c'est la seule occasion de
  -- le lire, la base n'en garde que l'empreinte.
  v_code := replace(replace(replace(
              encode(extensions.gen_random_bytes(16), 'base64'), '+', '-'), '/', '_'), '=', '');
  v_indice := substr(v_code, 1, 6);
  insert into public.invitation (entreprise, empreinte, indice, places, cree_par, expire_le)
  values (v_id, extensions.digest(v_code, 'sha256'), v_indice, least(p_effectif, v_essai),
          v_uid, now() + interval '60 days');
  insert into public.acces (entreprise, profil, quoi, indice)
  values (v_id, v_uid, 'creation_lien', v_indice);

  return v_code;
end $$;

-- ------------------------------------------------------ mes domaines à moi
-- `private.domaine_entreprise` ne sort pas du schéma privé : c'est un contrôle
-- d'accès, pas une préférence. Mais l'application posait `domaines: []` en dur
-- pour toute entreprise chargée depuis la base, donc l'écran Équipe affichait
-- éternellement le badge rouge « Ouvert à tous » — y compris à un client qui
-- venait de déclarer ses trois domaines et dont la base était correctement
-- verrouillée. On rend donc la liste, à celle qu'elle concerne, et à elle seule.
create or replace function public.mes_domaines()
returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce((select array_agg(d.domaine order by d.domaine)
                     from private.domaine_entreprise d
                    where d.entreprise = private.mon_entreprise()), '{}'::text[])
   where private.mon_entreprise() is not null
$$;

grant execute on function
  public.maj_contrat(text, text),
  public.reconduire(boolean),
  public.marquer_facture_payee(text, date),
  public.ouvrir_compte_entreprise(text, integer, text, text, text),
  public.mes_domaines(),
  public.creer_compte_entreprise(text, integer, text, text, numeric, integer, text, boolean),
  public.signer_contrat(uuid, numeric, integer, text, boolean, date)
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

-- ------------------------------------------------------------- HelloAsso
-- Le don en argent passe par HelloAsso. Ce que cela change pour une association
-- et pour un donateur, et pourquoi c'est ici plutot que dans le navigateur.
--
-- Avant : le donateur recevait un IBAN et une reference, ouvrait son application
-- bancaire, recopiait les deux, et l'association devait confirmer a la main
-- avoir recu l'argent, parfois trois semaines plus tard. Trois gestes manuels,
-- trois occasions d'abandonner, et un delai entre le clic et le point marque.
--
-- Maintenant : l'association autorise Riseva depuis la mire d'autorisation de
-- HelloAsso, une fois. Le donateur paie par carte sur une page HelloAsso.
-- L'argent va DIRECTEMENT sur le compte de l'association, jamais par nous : ce
-- n'est donc toujours pas un service de paiement au sens des articles L. 314-1
-- et L. 521-1 du code monetaire et financier, et Riseva n'a aucun agrement a
-- obtenir. La confirmation revient toute seule.
--
-- Ce qui reste dans le navigateur : rien. Le jeton qui permet d'agir au nom
-- d'une association vit dans `private.helloasso_lien`, que personne n'a le droit
-- de lire, et seule la fonction Edge le manipule.

-- L'association voit l'etat de sa liaison, jamais le jeton.
create or replace view public.helloasso_etat_liaison as
  select a.id as association,
         a.helloasso_slug as slug,
         a.helloasso_lie_le as lie_le,
         (a.helloasso_slug is not null) as lie
    from public.association a
   where a.id = private.mon_association() or private.est_admin();

-- Rompre la liaison. Le geste appartient a l'association : elle a autorise, elle
-- peut retirer. Le jeton est efface, pas seulement oublie.
create or replace function public.delier_helloasso()
returns void
language plpgsql security definer set search_path = '' as $$
declare v_a uuid := private.mon_association();
begin
  if v_a is null then
    raise exception 'Réservé à l''association elle-même' using errcode = '42501';
  end if;
  delete from private.helloasso_lien where association = v_a;
  update public.association a
     set helloasso_slug = null, helloasso_lie_le = null
   where a.id = v_a;
end $$;

grant select on public.helloasso_etat_liaison to authenticated;
grant execute on function public.delier_helloasso() to authenticated;

-- Les fonctions appelees par la fonction Edge, et par elle seule : elle detient
-- la cle de service. Aucune n'est accordee a `authenticated`.

-- Ouvrir une autorisation : on pose l'etat et le verificateur PKCE, qui ne
-- peuvent pas voyager par le navigateur.
create or replace function public.helloasso_ouvrir_autorisation(
  p_association uuid, p_etat text, p_verificateur text, p_retour text default null)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from private.helloasso_etat where cree_le < now() - interval '1 hour';
  insert into private.helloasso_etat (etat, association, verificateur, retour)
  values (p_etat, p_association, p_verificateur, p_retour);
end $$;

-- Reprendre une autorisation : l'etat est a usage unique, il est efface en meme
-- temps qu'il est lu. Un code d'autorisation rejoue ne trouve plus rien.
create or replace function public.helloasso_reprendre_autorisation(p_etat text)
returns table (association uuid, verificateur text, retour text)
language plpgsql security definer set search_path = '' as $$
begin
  return query
    delete from private.helloasso_etat e
     where e.etat = p_etat and e.cree_le > now() - interval '1 hour'
    returning e.association, e.verificateur, e.retour;
end $$;

-- Enregistrer la liaison, une fois le jeton obtenu.
create or replace function public.helloasso_enregistrer_lien(
  p_association uuid, p_slug text, p_jeton text, p_privileges text[] default '{}')
returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into private.helloasso_lien (association, slug, jeton, privileges)
  values (p_association, p_slug, p_jeton, coalesce(p_privileges, '{}'))
  on conflict (association) do update
    set slug = excluded.slug, jeton = excluded.jeton,
        privileges = excluded.privileges, obtenu_le = now();
  update public.association a
     set helloasso_slug = p_slug, helloasso_lie_le = now()
   where a.id = p_association;
end $$;

-- Lire la liaison. Rendue au seul role de service : c'est le jeton.
-- Le verrou est ici, et pas ailleurs. La lecture du jeton et sa réécriture
-- étaient deux appels séparés : deux donateurs simultanés lisaient le MÊME jeton
-- de rafraîchissement, HelloAsso invalidait l'ancien au premier échange, le
-- second recevait un 401 — et selon l'ordre d'écriture, c'est un jeton mort qui
-- restait en base. Plus aucun don par carte jusqu'à ce que l'association
-- réautorise, sans que personne ne comprenne pourquoi.
--
-- `for update` sérialise les deux donateurs : le second attend, relit le jeton
-- neuf, et repart avec. Le verrou tient jusqu'à la fin de la transaction ; la
-- fonction Edge appelle donc `helloasso_rafraichir_jeton` immédiatement après.
create or replace function public.helloasso_lien(p_association uuid)
returns table (slug text, jeton text)
language sql security definer set search_path = '' as $$
  select l.slug, l.jeton from private.helloasso_lien l
   where l.association = p_association
   for update;
$$;

-- HelloAsso rend un jeton neuf a chaque rafraichissement : celui d'avant cesse
-- de valoir. Ne pas le reecrire, c'est perdre la liaison au bout de trente jours.
create or replace function public.helloasso_rafraichir_jeton(
  p_association uuid, p_jeton text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  update private.helloasso_lien l set jeton = p_jeton, obtenu_le = now()
   where l.association = p_association;
end $$;

-- Poser l'intention de paiement sur une intention de don deja creee : c'est ce
-- qui permet, au retour, de retrouver le don a partir de ce que HelloAsso rend.
alter table public.intention_don
  add column if not exists helloasso_intent bigint;

create or replace function public.helloasso_poser_intent(
  p_intention uuid, p_intent bigint)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.intention_don i set helloasso_intent = p_intent where i.id = p_intention;
end $$;

create or replace function public.helloasso_intention(p_intention uuid)
returns table (id uuid, annonce uuid, association uuid, salarie uuid,
               origine public.origine_don, montant numeric, reference text,
               etat text, helloasso_intent bigint, slug text)
language sql security definer set search_path = '' as $$
  select i.id, i.annonce, i.association, i.salarie, i.origine, i.montant,
         i.reference, i.etat, i.helloasso_intent, a.helloasso_slug
    from public.intention_don i
    join public.association a on a.id = i.association
   where i.id = p_intention;
$$;

-- De quelle association releve un profil : la fonction Edge tourne avec la cle
-- de service, donc `private.mon_association()` ne lui apprend rien. Elle ne doit
-- pas non plus croire le corps de la requete sur parole.
create or replace function public.mon_association_de(p_profil uuid)
returns uuid
language sql security definer set search_path = '' as $$
  select a.association from private.appartenance a
   where a.profil = p_profil and a.role = 'association' and a.actif;
$$;

-- L'intention de don, ouverte pour un profil donne. C'est la meme regle que
-- `declarer_intention_don`, a une difference pres : l'appelant est la fonction
-- Edge, pas la personne. Elle passe donc le profil, et TOUT le reste est
-- controle ici — l'annonce, son etat, le montant, le role pour un don
-- d'entreprise. Une fonction de service qui ferait confiance a son appelant
-- serait une porte ouverte sur les points de n'importe quelle entreprise.
create or replace function public.declarer_intention_don_pour(
  p_annonce uuid, p_montant numeric, p_origine public.origine_don, p_profil uuid)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_an public.annonce; v_a public.association; v_ent uuid; v_role public.role_utilisateur;
        v_id uuid;
begin
  select a.role, a.entreprise into v_role, v_ent
    from private.appartenance a where a.profil = p_profil and a.actif;
  if v_role is null then
    raise exception 'Compte inconnu ou suspendu' using errcode = '42501';
  end if;
  select * into v_an from public.annonce a where a.id = p_annonce;
  if not found or v_an.type <> 'don_financier' or v_an.etat <> 'ouverte' then
    raise exception 'Annonce indisponible' using errcode = '42501';
  end if;
  select * into v_a from public.association a where a.id = v_an.association;
  if not v_a.valide or v_a.suspendue then
    raise exception 'Cette association ne peut pas recevoir de don pour l''instant'
      using errcode = '42501';
  end if;
  if v_a.helloasso_slug is null then
    raise exception 'Cette association n''a pas connecté son compte HelloAsso'
      using errcode = '42501';
  end if;
  if p_montant is null or p_montant < 5 then
    raise exception 'Le minimum est de 5 €' using errcode = '22023';
  end if;
  if p_origine = 'entreprise' then
    if v_role <> 'entreprise_admin' then
      raise exception 'Seul un administrateur de l''entreprise engage un don d''entreprise'
        using errcode = '42501';
    end if;
  else
    v_ent := null;   -- un don personnel ne porte pas l'entreprise
  end if;

  insert into public.intention_don (annonce, association, salarie, entreprise, origine,
                                    montant, reference, expire_le)
  values (p_annonce, v_an.association, p_profil, v_ent, p_origine, p_montant,
          private.reference_virement(), current_date + 30)
  returning id into v_id;
  return v_id;
end $$;

grant execute on function
  public.mon_association_de(uuid),
  public.declarer_intention_don_pour(uuid, numeric, public.origine_don, uuid),
  public.helloasso_ouvrir_autorisation(uuid, text, text, text),
  public.helloasso_reprendre_autorisation(text),
  public.helloasso_enregistrer_lien(uuid, text, text, text[]),
  public.helloasso_lien(uuid),
  public.helloasso_rafraichir_jeton(uuid, text),
  public.helloasso_poser_intent(uuid, bigint),
  public.helloasso_intention(uuid)
to service_role;

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

-- Les vues créées après `03_rls.sql` passent elles aussi sous le rôle dédié :
-- une vue laissée au superutilisateur contourne la RLS avec ses droits.
do $$
declare v record;
begin
  for v in
    select c.oid::regclass as nom
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      join pg_roles ro on ro.oid = c.relowner
     where n.nspname = 'public' and c.relkind = 'v' and ro.rolname <> 'riseva_definer'
  loop
    execute format('alter view %s owner to riseva_definer', v.nom);
  end loop;
end $$;

-- ------------------------------------------------- signatures abandonnées
-- PostgreSQL n'identifie pas une fonction par son nom mais par sa SIGNATURE.
-- `create or replace function public.maj_entreprise(... , p_referent_mail text)`
-- sur une fonction qui en prenait sept ne remplace RIEN : il en crée une
-- seconde. L'ancienne survit, garde son `grant execute`, et PostgREST peut très
-- bien continuer de l'appeler — ou refuser l'appel pour ambiguïté, ce qui est
-- encore le meilleur cas parce qu'au moins ça se voit.
--
-- Sur une base neuve — celle que la recette installe — le problème n'existe pas.
-- Il n'apparaît que sur une base de PRODUCTION qu'on met à jour, c'est-à-dire
-- exactement là où il coûte le plus cher : la moitié des corrections d'une
-- journée n'arrive jamais chez le client, sans une seule erreur nulle part.
--
-- Aucune fonction de ce schéma n'a de surcharge voulue : deux signatures pour un
-- même nom sont donc toujours un reste d'une version précédente. On garde la plus
-- récente — celle que ce déploiement vient d'écrire — et on retire les autres.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig, p.proname
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public','private')
       and p.prokind = 'f'
       and exists (
         select 1 from pg_proc q join pg_namespace m on m.oid = q.pronamespace
          where m.nspname = n.nspname and q.proname = p.proname and q.oid > p.oid)
  loop
    -- Sans `cascade` : si une vue ou une contrainte s'appuie encore dessus, on
    -- veut le savoir, pas emporter la dépendance en silence.
    begin
      execute format('drop function %s', f.sig);
      raise notice 'signature abandonnée retirée : %', f.sig;
    exception when others then
      raise notice 'signature abandonnée conservée (dépendance) : % — %', f.sig, sqlerrm;
    end;
  end loop;
end $$;
