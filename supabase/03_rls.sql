-- Riseva — droits et politiques de ligne
-- ---------------------------------------------------------------------------
-- On part de zéro. Sur Supabase, les tables du schéma `public` reçoivent par
-- défaut les droits CRUD pour `anon` et `authenticated`, et les fonctions le
-- droit EXECUTE : écrire des policies sans avoir d'abord tout retiré, c'est
-- verrouiller la porte en laissant la fenêtre ouverte.
--
-- Ensuite seulement, on rend, colonne par colonne et fonction par fonction. Un
-- objet oublié reste donc inaccessible — le bon sens d'un pare-feu : ce qui
-- n'est pas explicitement autorisé est refusé.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------- table rase
revoke all on all tables    in schema public from public, anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
revoke all on all tables    in schema private from public, anon, authenticated;

-- Et pour tout ce qui sera créé demain, par la prochaine migration.
alter default privileges in schema public
  revoke all on tables from public, anon, authenticated;
alter default privileges in schema public
  revoke all on functions from public, anon, authenticated;
alter default privileges in schema public
  revoke all on sequences from public, anon, authenticated;

grant usage on schema public to anon, authenticated;

-- ---------------------------------------------------------------- RLS partout
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t.tablename);
    execute format('alter table public.%I force row level security', t.tablename);
  end loop;
end $$;

-- Pas de RLS dans `private` : la frontière, c'est le schéma lui-même. Personne
-- n'a `usage` dessus à part le propriétaire des fonctions SECURITY DEFINER, et
-- lui doit tout lire — écrire des policies ici reviendrait à en écrire une seule,
-- « tout autorisé pour le seul rôle qui entre », c'est-à-dire rien.

-- ---------------------------------------------------------------- lectures
-- Saison et barème : publics, ce sont les règles du jeu.
grant select on public.saison, public.bareme to anon, authenticated;
create policy saison_lecture on public.saison for select to anon, authenticated using (true);
create policy bareme_lecture on public.bareme for select to anon, authenticated using (true);

-- Entreprise : aucune lecture directe. Le nom et le secteur passent par la vue
-- `entreprise_publique` ; le reste — CA, SIRET, adresse, coût journalier — ne
-- sort que pour l'entreprise concernée.
-- Rien en direct sur la table : le nom, le secteur et la ville passent par la
-- vue `entreprise_publique`, qui s'exécute avec les droits de son propriétaire.
--
-- Il y avait ici une policy `using (true)` destinée à servir cette vue. Les
-- policies PostgreSQL sont PERMISSIVES par défaut : elles s'additionnent en OU.
-- Celle-là annulait donc `entreprise_privee` juste en dessous, et ouvrait le CA,
-- le SIREN, le SIRET, l'adresse et le coût journalier de TOUTES les entreprises
-- à n'importe quel compte connecté — y compris une association. Le commentaire
-- affirmait le contraire, et la recette ne testait que `anon`.
grant select on public.entreprise_publique to anon, authenticated;
grant select (id, nom, secteur, ville, effectif, ca, cout_jour_moyen,
              siren, siret, adresse, lat, lon, groupe, visibilite, logo,
              objectif_mobilises)
  on public.entreprise to authenticated;
create policy entreprise_privee on public.entreprise for select to authenticated
  using (id = private.mon_entreprise()
         or private.dans_mon_groupe(id)
         or private.est_admin());

-- Association : lecture publique des associations vérifiées et non suspendues,
-- colonne par colonne. Un `grant select` sur la table entière laissait un
-- visiteur moissonner les IBAN, les BIC et les titulaires de compte de toutes
-- les associations validées — la matière première d'une fraude au changement de
-- RIB — ainsi que les noms des signataires et des mandants, qui sont des
-- personnes physiques sans nécessité publique.
-- Les coordonnées bancaires sont publiques *par construction* : c'est le
-- principe même du virement, et elles figurent sur la fiche que l'association
-- publie. Ce qui ne l'est pas, et qui sortait pourtant avec le `grant select`
-- sur la table entière : le nom du signataire des reçus, sa qualité, le nom du
-- mandant et l'état du mandat. Ce sont des personnes physiques, sans nécessité
-- publique. Elles passent maintenant par la vue `association_reglages`.
--
-- Les coordonnées bancaires, elles, ne sont PAS accordées à `anon`. « Publiques
-- par construction » vaut pour une association qui publie son RIB sur sa propre
-- page ; cela ne justifie pas qu'un visiteur non connecté moissonne en une
-- requête l'annuaire complet des IBAN du réseau, sans limite de débit. C'est
-- exactement la matière première d'une fraude au changement de RIB, et
-- `titulaire_compte` est du texte libre qui porte souvent le nom du trésorier.
-- La fiche publique d'une association les obtient une par une, par une fonction
-- qui n'en rend qu'une seule à la fois.
grant select (id, nom, nom_juridique, rna, siren, cause, ville, resume, adresse,
              lat, lon, site, photo, valide, suspendue, verifiee_le, a_reverifier_le,
              eligible_mecenat, helloasso, helloasso_slug, helloasso_lie_le, cree_le)
  on public.association to anon;
grant select (id, nom, nom_juridique, rna, siren, cause, ville, resume, adresse,
              lat, lon, site, photo, valide, suspendue, verifiee_le, a_reverifier_le,
              eligible_mecenat, helloasso, helloasso_slug, helloasso_lie_le,
              iban, bic, titulaire_compte, cree_le)
  on public.association to authenticated;
create policy association_lecture on public.association for select to anon, authenticated
  using ((valide and not suspendue) or id = private.mon_association() or private.est_admin());

-- Ses propres réglages, pour elle seule. Une vue plutôt qu'une policy
-- restrictive : une restrictive sur `association` se serait appliquée à chaque
-- sous-requête qui traverse cette table — celle de `annonce_lecture` en
-- particulier — et aurait rendu les annonces invisibles à tous les salariés.
grant select on public.association_reglages to authenticated;

-- Contrôle au registre : l'association concernée et Riseva. C'est son dossier,
-- elle doit pouvoir lire ce qui a été vérifié sur elle et le corriger ; personne
-- d'autre n'a à savoir qu'un contrôle a signalé un écart.
grant select on public.controle_association to authenticated;
create policy controle_lecture on public.controle_association for select to authenticated
  using (association = private.mon_association() or private.est_admin());

-- Intention de virement : l'association bénéficiaire, le donateur, Riseva. Un
-- don personnel n'est jamais lisible par l'employeur, même agrégé : la cause
-- d'une association peut trahir une conviction ou un état de santé.
grant select on public.intention_don to authenticated;
create policy intention_lecture on public.intention_don for select to authenticated
  using (association = private.mon_association()
         or salarie = auth.uid()
         or (origine = 'entreprise' and entreprise = private.mon_entreprise()
             and private.mon_role() = 'entreprise_admin')
         or private.est_admin());

-- Annonce : lecture publique des annonces ouvertes d'associations en règle.
grant select on public.annonce to anon, authenticated;
create policy annonce_lecture on public.annonce for select to anon, authenticated
  using (
    (etat <> 'brouillon' and exists (
       select 1 from public.association a
        where a.id = annonce.association and a.valide and not a.suspendue))
    or association = private.mon_association()
    or private.est_admin());

-- Profil : son propre profil, et les noms des collègues — rien de plus. Un
-- salarié n'a pas à lire la fiche de toute l'entreprise.
-- Le nom, et rien d'autre. `preferences` etait accordee ici avec un commentaire
-- qui affirmait le contraire : la policy laisse voir les lignes des collegues,
-- donc chaque salarie pouvait lire les reglages de tous les autres. Les
-- reglages d'une personne ne sortent que par la RPC, filtree sur auth.uid().
grant select (id, nom) on public.profil to authenticated;
create policy profil_lecture on public.profil for select to authenticated
  using (
    id = auth.uid()
    or private.est_admin()
    -- L'accès CSE est exclu explicitement : `meme_entreprise` suffirait à lui
    -- ouvrir la liste nominative de tout l'effectif, ce qui est exactement ce
    -- que cet accès ne doit pas permettre.
    or (private.mon_role() <> 'cse' and private.meme_entreprise(profil.id)));
-- Une seule écriture possible, et elle ne touche que le nom. Le rôle, l'entreprise
-- et l'état du compte ne sont même pas dans cette table.
grant update (nom) on public.profil to authenticated;
create policy profil_ecriture on public.profil for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Mission : le salarié voit les siennes, l'administrateur voit celles de son
-- entreprise mais jamais les dons personnels, l'association voit celles de ses
-- annonces. Personne n'écrit directement : tout passe par les RPC.
grant select on public.mission to authenticated;
create policy mission_lecture on public.mission for select to authenticated
  using (
    salarie = auth.uid()
    or private.est_admin()
    or (entreprise = private.mon_entreprise()
        and private.mon_role() = 'entreprise_admin'
        and origine = 'entreprise')
    -- Le référent de site voit les missions de son site, et de son site seulement.
    or (entreprise = private.mon_entreprise()
        and private.mon_role() = 'site_referent'
        and etablissement = private.mon_etablissement()
        and origine = 'entreprise')
    or exists (select 1 from public.annonce a
                where a.id = mission.annonce and a.association = private.mon_association()));

-- Don : jamais lisible par l'employeur, même agrégé sans seuil. L'association
-- voit ce qui la concerne, Riseva voit tout.
grant select on public.don to authenticated;
create policy don_lecture on public.don for select to authenticated
  using (association = private.mon_association() or private.est_admin());

-- Reçus : l'association qui les émet, et Riseva.
grant select on public.recu to authenticated;
create policy recu_lecture on public.recu for select to authenticated
  using (association = private.mon_association() or private.est_admin());

-- Abonnement : l'entreprise concernée, et seulement elle. Les prix des autres
-- ne regardent personne.
grant select on public.abonnement to authenticated;
create policy abonnement_lecture on public.abonnement for select to authenticated
  using ((entreprise = private.mon_entreprise() and private.mon_role() = 'entreprise_admin')
         or private.est_admin());

-- Ses factures, pour son administrateur et pour Riseva. Un salarié n'a rien à
-- lire ici, et le CSE non plus : ce sont des pièces comptables, pas des données
-- sociales.
grant select on public.facture to authenticated;
create policy facture_lecture on public.facture for select to authenticated
  using (exists (select 1 from public.abonnement a
                  where a.id = facture.abonnement
                    and ((a.entreprise = private.mon_entreprise()
                          and private.mon_role() = 'entreprise_admin')
                         or private.est_admin())));


-- Invitation : l'administrateur voit l'indice et le quota, jamais de quoi
-- reconstituer un code — l'empreinte n'est pas accordée.
grant select (id, entreprise, etablissement, pour_referent, pour_cse, destinataire_nom,
              destinataire_mail, indice, places, active, cree_le, expire_le)
  on public.invitation to authenticated;
create policy invitation_lecture on public.invitation for select to authenticated
  using ((entreprise = private.mon_entreprise() and private.mon_role() = 'entreprise_admin')
         -- Un référent de site voit les liens de son site : celui qui l'a nommé,
         -- et celui qu'il produit pour ses salariés. Pas ceux des autres sites.
         or (entreprise = private.mon_entreprise()
             and private.mon_role() = 'site_referent'
             and etablissement = private.mon_etablissement())
         or private.est_admin());

-- ---------------------------------------------------------------- groupe et sites
-- Le groupe se lit, il ne se modifie pas depuis le navigateur.
grant select on public.groupe to authenticated;
create policy groupe_lecture on public.groupe for select to authenticated
  using (id = private.mon_groupe() or private.est_admin());

-- Un établissement est visible de sa société, du groupe qui la consolide, et du
-- référent qui le pilote. `quota` et `effectif` sont lisibles mais jamais
-- modifiables ici : ils passent par une RPC, sinon un administrateur s'ouvre
-- autant de places qu'il veut et se déclare trois salariés pour rafler le
-- classement normalisé.
grant select on public.etablissement to authenticated;
create policy etablissement_lecture on public.etablissement for select to authenticated
  using (societe = private.mon_entreprise()
         or private.dans_mon_groupe(societe)
         or private.est_admin());

-- --------------------------------------------------------- zones à travailler
-- L'entreprise lit ses propres demandes de prospection, et rien d'autre : elle
-- n'a pas à savoir quelles zones les autres clients ont signalées, ce qui
-- reviendrait à lire leur carte d'implantation. L'écriture passe par la RPC,
-- qui vérifie le rôle et le rattachement au site.
grant select on public.sourcing to authenticated;
create policy sourcing_lecture on public.sourcing for select to authenticated
  using (exists (select 1 from public.etablissement e
                  where e.id = sourcing.etablissement
                    and (e.societe = private.mon_entreprise()
                         or private.dans_mon_groupe(e.societe)))
         or private.est_admin());

-- ---------------------------------------------------------------- indicateurs
-- Le catalogue est un référentiel, pas une donnée d'entreprise : il ne contient
-- ni chiffre ni nom, seulement des définitions. Tout compte connecté le lit —
-- il le faut, puisque c'est ce qui permet à un formulaire d'afficher ce qu'on
-- compte et ce qu'on ne compte pas. Il ne s'écrit, lui, que par migration.
grant select on public.rubrique to authenticated;
create policy rubrique_lecture on public.rubrique for select to authenticated using (true);

grant select on public.indicateur to authenticated;
create policy indicateur_lecture on public.indicateur for select to authenticated using (true);

-- Ce qu'une campagne demande se lit exactement là où la campagne se lit : une
-- liste de rubriques sans la campagne qui la porte ne dit rien de plus que le
-- catalogue, mais elle trahirait quelles rubriques un groupe a choisies.
grant select on public.campagne_rubrique to authenticated;
create policy campagne_rubrique_lecture on public.campagne_rubrique for select to authenticated
  using (exists (select 1 from public.campagne_indicateurs c
                  where c.id = campagne_rubrique.campagne));

-- Les rubriques ouvertes pour une entreprise ne regardent que cette entreprise
-- et son groupe : c'est un réglage, et un réglage dit ce qu'on mesure.
grant select on public.entreprise_rubrique to authenticated;
create policy entreprise_rubrique_lecture on public.entreprise_rubrique for select to authenticated
  using (entreprise = private.mon_entreprise()
         or private.dans_mon_groupe(entreprise)
         or private.est_admin());

grant select on public.campagne_indicateurs to authenticated;
create policy campagne_lecture on public.campagne_indicateurs for select to authenticated
  using (entreprise = private.mon_entreprise()
         or (groupe is not null and groupe = private.mon_groupe())
         or (groupe is not null and exists (
               select 1 from public.entreprise e
                where e.id = private.mon_entreprise() and e.groupe = campagne_indicateurs.groupe))
         or private.est_admin());

-- Les observations sont des agrégats : nombre d'accidents, journées perdues,
-- heures travaillées. Aucune donnée de santé, aucune identité de victime. Elles
-- se lisent donc au niveau du site, de la société et du groupe — mais elles ne
-- s'écrivent que par RPC, avec contributeur et approbateur distincts.
grant select on public.observation_indicateur to authenticated;
create policy observation_lecture on public.observation_indicateur for select to authenticated
  using (private.est_admin() or exists (
    select 1 from public.etablissement et
     where et.id = observation_indicateur.etablissement
       and (et.societe = private.mon_entreprise()
            or private.dans_mon_groupe(et.societe))
       -- Le CSE ne lit que ce que la société a approuvé. Une saisie que personne
       -- n'a relue n'entre pas dans un rapport ; elle n'a pas à entrer non plus
       -- dans une réunion.
       and (private.mon_role() <> 'cse' or observation_indicateur.etat = 'approuve')));

-- ---------------------------------------------------------------- le coffre
-- Une pièce justificative se lit par ceux qui lisent le chiffre qu'elle
-- justifie, et par personne d'autre. Le CSE en est écarté : il lit des
-- agrégats approuvés, pas les factures d'un site — et une facture porte des
-- noms, des adresses et des références de contrat que l'agrégat, lui, ne porte
-- pas. C'est la même raison qui interdit les documents de santé à l'entrée.
--
-- Aucune écriture directe : le dépôt et le retrait passent par RPC, parce que
-- chacun a une règle que la table ne peut pas exprimer — le format, le rattachement
-- à un objet du bon périmètre, et l'interdiction de retirer une pièce d'une
-- observation déjà approuvée.
grant select on public.piece_jointe to authenticated;
create policy piece_lecture on public.piece_jointe for select to authenticated
  using (private.est_admin() or (
    private.mon_role() <> 'cse'
    and (piece_jointe.entreprise = private.mon_entreprise()
         or private.dans_mon_groupe(piece_jointe.entreprise))));

-- Le bucket. Les politiques de `storage.objects` ne peuvent s'ecrire que la ou
-- Supabase existe ; en bac a sable local, le schema `storage` n'est pas la et
-- l'installation doit passer quand meme. D'ou le garde.
--
-- La regle du bucket tient en une ligne : la cle d'un fichier commence par
-- l'identifiant de l'entreprise, et on ne lit que ce qui commence par le sien.
-- C'est pour cela que `joindre_piece` refuse toute cle qui ne commence pas par
-- l'entreprise de l'appelant : la politique protege le fichier, elle ne protege
-- pas le lien qu'on ecrirait vers celui d'un autre.
do $$
begin
  if to_regclass('storage.objects') is null then
    raise notice 'schema storage absent : politiques du coffre non posées (bac à sable local)';
    return;
  end if;

  insert into storage.buckets (id, name, public)
  values ('preuves', 'preuves', false)
  on conflict (id) do nothing;

  execute $p$
    drop policy if exists preuve_lecture on storage.objects;
    create policy preuve_lecture on storage.objects for select to authenticated
      using (bucket_id = 'preuves'
             and private.mon_role() is distinct from 'cse'
             and (split_part(name, '/', 1)::uuid = private.mon_entreprise()
                  or private.dans_mon_groupe(split_part(name, '/', 1)::uuid)));
  $p$;
  execute $p$
    drop policy if exists preuve_depot on storage.objects;
    create policy preuve_depot on storage.objects for insert to authenticated
      with check (bucket_id = 'preuves'
                  and private.mon_role() is distinct from 'cse'
                  and split_part(name, '/', 1)::uuid = private.mon_entreprise());
  $p$;
  -- Pas de politique de suppression, et c'est voulu : un fichier depose ne
  -- s'efface pas depuis le navigateur. Le retrait marque la ligne, la piece
  -- disparait des ecrans, et le fichier attend la purge decidee ailleurs.
end $$;

-- Registre de sécurité : le site qui le tient, sa société, le groupe qui la
-- consolide, et le CSE. Rien de nominatif n'y figure par construction — c'est
-- pour cela qu'il peut être lu par le comité sans précaution supplémentaire.
-- Ligne à ligne, un événement se réidentifie : sur un site de quelques
-- personnes, une date, une zone et un nombre de journées d'arrêt suffisent. Le
-- registre est donc réservé à ceux qui le tiennent — la société et le référent
-- de son site — et jamais aux collègues ni au comité, qui lisent des agrégats.
-- `declare_par` n'est accordé à personne : joint à `profil`, il nomme le
-- déclarant, et par ricochet souvent la victime.
grant select (id, etablissement, date, nature, gravite, type_evenement, zone,
              jours_arret, circonstances, declare_le, annule_le, motif_annulation)
  on public.evenement_securite to authenticated;
create policy evenement_lecture on public.evenement_securite for select to authenticated
  using (private.est_admin() or (
    private.mon_role() in ('entreprise_admin','site_referent') and exists (
      select 1 from public.etablissement et
       where et.id = evenement_securite.etablissement
         and (et.societe = private.mon_entreprise()
              or private.dans_mon_groupe(et.societe))
         and (private.mon_role() <> 'site_referent'
              or et.id = private.mon_etablissement()))));

grant select on public.action_corrective to authenticated;
create policy action_lecture on public.action_corrective for select to authenticated
  using (private.est_admin() or (
    private.mon_role() in ('entreprise_admin','site_referent') and exists (
      select 1 from public.etablissement et
       where et.id = action_corrective.etablissement
         and (et.societe = private.mon_entreprise()
              or private.dans_mon_groupe(et.societe)))));

-- Envois et expéditions : l'entreprise concernée et Riseva. Un client doit
-- pouvoir répondre à « ai-je bien reçu mon rapport du deuxième trimestre » par
-- une trace, pas par une conviction.
grant select on public.envoi to authenticated;
create policy envoi_lecture on public.envoi for select to authenticated
  using ((entreprise = private.mon_entreprise() and private.mon_role() = 'entreprise_admin')
         or association = private.mon_association()
         or private.est_admin());

grant select on public.expedition to authenticated;
create policy expedition_lecture on public.expedition for select to authenticated
  using (entreprise = private.mon_entreprise() or private.est_admin());

grant select on public.affectation_siege to authenticated;
create policy siege_lecture on public.affectation_siege for select to authenticated
  using (private.est_admin() or exists (
    select 1 from public.abonnement ab
     where ab.id = affectation_siege.abonnement
       and ab.entreprise = private.mon_entreprise()));

-- Journal d'accès : l'administrateur de l'entreprise, sans les adresses IP ni
-- les agents — ce sont des données de sécurité, pas un outil de surveillance
-- des salariés.
grant select (id, entreprise, profil, quoi, indice, cree_le) on public.acces to authenticated;
create policy acces_lecture on public.acces for select to authenticated
  using ((entreprise = private.mon_entreprise() and private.mon_role() = 'entreprise_admin')
         or private.est_admin());

grant select on public.rapport to authenticated;
create policy rapport_lecture on public.rapport for select to authenticated
  using ((entreprise = private.mon_entreprise()
          and private.mon_role() in ('entreprise_admin','cse'))
         or private.est_admin());

-- Signalement : son auteur et Riseva. Un signalement lisible par l'association
-- signalée dissuaderait de signaler.
grant select on public.signalement to authenticated;
create policy signalement_lecture on public.signalement for select to authenticated
  using (auteur = auth.uid() or private.est_admin());

-- Préinscription : dépôt public, lecture réservée à Riseva. Sans cela, la liste
-- des prospects est un fichier client en libre accès.
grant insert (entreprise, contact, effectif) on public.preinscription to anon, authenticated;
create policy preinscription_depot on public.preinscription for insert
  to anon, authenticated with check (etat = 'preinscrite');
grant select on public.preinscription to authenticated;
create policy preinscription_lecture on public.preinscription for select
  to authenticated using (private.est_admin());

grant select on public.moteur_journal to authenticated;
create policy moteur_lecture on public.moteur_journal for select
  to authenticated using (private.est_admin());

-- ---------------------------------------------------------------- exécution
-- Rien n'est exécutable par défaut ; on rend nommément.
grant execute on function
  public.rejoindre_entreprise(text, text),
  public.creer_invitation(integer, integer, uuid),
  public.engager_mission(uuid, numeric, text, boolean),
  public.declarer_mission(uuid, numeric),
  public.trancher_mission(uuid, boolean, numeric),
  public.publier_annonce(text, text, public.type_annonce, integer, date, text,
                         boolean, public.unite_realisation, numeric),
  public.fermer_annonce(uuid),
  public.regler_logo(text),
  public.maj_association(text, text, text, text, text, boolean),
  public.offre_locale(uuid),
  public.offre_par_site(uuid),
  public.signaler_zone(uuid, text),
  public.adoption(uuid, uuid),
  public.declarer_valeur_materiel(uuid, numeric, public.categorie_materiel,
                                  text, text, date, text, boolean),
  public.pseudonymiser_salarie(uuid),
  public.supprimer_salarie(uuid),
  public.signaler_annonce(uuid, text, text),
  public.decider_signalement(uuid, text, text),
  public.emettre_recu(uuid),
  public.dons_personnels_agreges(uuid),
  public.points_entreprise(uuid, uuid),
  public.classement_saison(uuid),
  public.decile_entreprise(uuid, uuid),
  public.realisations(uuid, uuid, uuid),
  public.suis_je_admin(),
  public.allouer_quota(uuid, integer),
  public.creer_etablissement(text, text, text, integer, text),
  public.modifier_etablissement(uuid, text, text, text, integer, text),
  public.creer_invitation_referent(uuid, text, text),
  public.rejoindre_comme_referent(text),
  public.saisir_indicateurs(uuid, uuid, jsonb, text),
  public.approuver_indicateurs(uuid, uuid),
  public.ouvrir_campagne(text, text, date, date, date, text[]),
  public.rubriques_de(uuid),
  public.indicateurs_de(uuid),
  public.rubriques_entreprise(uuid),
  public.controler_association(uuid, jsonb, boolean),
  public.enregistrer_numeros_association(uuid, text, text),
  public.sans_accents(text),
  public.enregistrer_iban(uuid, text, text, text),
  public.accepter_mandat_recus(uuid, text, text, text),
  public.revoquer_mandat_recus(uuid),
  public.declarer_intention_don(uuid, numeric, public.origine_don),
  public.confirmer_don_recu(uuid, numeric),
  public.abandonner_intention_don(uuid, text),
  public.declarer_evenement(uuid, date, text, text, text, text, integer, text),
  public.annuler_evenement(uuid, text),
  public.activer_registre(uuid, boolean),
  public.ajouter_action(uuid, text, text, date, uuid),
  public.maj_action(uuid, text),
  public.securite_du_registre(uuid, date, date),
  public.pareto_securite(uuid, date, date),
  public.enregistrer_helloasso(uuid, text),
  public.confirmer_reception(uuid),
  public.expedier_kit(uuid, text, text)
to authenticated;

-- Le paiement n'est jamais confirmé par le navigateur. Seule la fonction Edge,
-- qui détient la clé de service et vérifie la signature du prestataire, peut
-- appeler celle-ci.
grant execute on function
  public.confirmer_don(text, text, uuid, numeric, public.origine_don, uuid),
  -- La fonction Edge d'effacement l'appelle avec la clé de service, APRÈS avoir
  -- vérifié l'identité de la personne avec la clé publique. Sans ce droit, le
  -- droit à l'effacement de notre politique de confidentialité n'était pas
  -- exerçable : la fonction répondait « permission denied ».
  public.supprimer_salarie(uuid)
to service_role;

-- Le lien de réponse envoyé aux associations n'est pas ouvert au public : c'est la
-- fonction Edge qui le présente, qui exige une confirmation POST et qui appelle
-- celle-ci. L'ouvrir à `anon` reviendrait à laisser n'importe qui tenter des jetons
-- au rythme de l'API, sans jamais passer devant un écran.
grant execute on function
  public.trancher_par_jeton(text, text, numeric),
  public.preparer_demande_validation(uuid),
  public.marquer_envoi(uuid, text, text)
to service_role;

-- Le classement et les réalisations du réseau sont montrés sur le site public :
-- ce sont des agrégats, sans nom de salarié.
grant execute on function public.classement_saison(uuid), public.realisations(uuid, uuid, uuid)
to anon;

-- Les fonctions internes ne sont appelables par personne d'autre que le moteur.
revoke all on function
  private.moi(), private.mon_role(), private.mon_entreprise(), private.mon_association(),
  private.est_admin(), private.saison_ouverte(), private.points_pour(uuid, public.type_annonce, numeric),
  private.sieges_pris(uuid), private.mon_etablissement(), private.mon_groupe(),
  private.dans_mon_groupe(uuid), private.meme_entreprise(uuid)
from public, anon, authenticated;
-- Et tout le reste du schéma privé, y compris ce qui sera écrit demain. Deux
-- tâches planifiées manquaient à la liste nominative ci-dessus : une énumération
-- se périme, une révocation en bloc non.
revoke all on all functions in schema private from public, anon, authenticated;
alter default privileges in schema private
  revoke all on functions from public, anon, authenticated;
alter default privileges in schema private
  revoke all on tables from public, anon, authenticated;
revoke all on all tables in schema private from anon, authenticated;

-- Les policies s'exécutent au nom de l'appelant : pour qu'elles puissent
-- demander « qui es-tu », il faut que le rôle ait le droit de traverser le
-- schéma privé. `usage` seul n'ouvre rien — aucune table, aucune autre
-- fonction n'est accordée — et les cinq helpers ci-dessous sont des
-- SECURITY DEFINER qui ne renvoient que ce que l'appelant sait déjà de
-- lui-même. Sans cela, une policy échoue au lieu de filtrer, ce qui est pire :
-- elle laisserait passer les lignes où PostgreSQL court-circuite le OR.
grant usage on schema private to anon, authenticated;

grant execute on function
  private.moi(), private.mon_role(), private.mon_entreprise(),
  private.mon_association(), private.est_admin(),
  private.mon_etablissement(), private.mon_groupe(), private.dans_mon_groupe(uuid),
  private.meme_entreprise(uuid)
to anon, authenticated;

-- ---------------------------------------------------------------- propriétaire
-- Chaque SECURITY DEFINER appartient à un rôle dédié, sans login et sans droit
-- superflu : si l'une d'elles est détournée, l'attaquant hérite de ces droits-là
-- et pas de ceux de `postgres`.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public','private') and p.prosecdef
  loop
    execute format('alter function %s owner to riseva_definer', f.sig);
  end loop;
end $$;

-- Les VUES aussi. Une vue s'exécute par défaut avec les droits de son
-- propriétaire, exactement comme un SECURITY DEFINER : laissée à `postgres`,
-- elle contourne la RLS avec les droits du superutilisateur. La boucle
-- ci-dessus ne regardait que `pg_proc`, et la recette non plus. Aucune des
-- quatre ne fuit aujourd'hui — trois portent leur propre `where` — mais la
-- prochaine modification ne rencontrerait aucune barrière.
do $$
declare v record;
begin
  for v in
    select c.oid::regclass as nom
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'v'
  loop
    execute format('alter view %s owner to riseva_definer', v.nom);
  end loop;
end $$;

-- Les fonctions SECURITY DEFINER s'exécutent au nom de `riseva_definer`, qui
-- reste soumis à la RLS comme tout le monde : sans policy, une RPC ne verrait
-- plus rien et refuserait tout. On lui ouvre donc explicitement les tables du
-- schéma public. Ce n'est pas un contournement : c'est le seul rôle qui écrit,
-- il n'a pas de login, et chaque fonction fait sa propre vérification de droits
-- avant d'écrire quoi que ce soit.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format(
      'create policy moteur_%I on public.%I to riseva_definer using (true) with check (true)',
      t.tablename, t.tablename);
  end loop;
end $$;

grant usage on schema private to riseva_definer;
-- `riseva_definer` est un rôle créé de zéro, `nologin noinherit` : il n'hérite
-- de rien. Supabase accorde `net` et `auth` à ses rôles à lui, jamais au nôtre.
-- Sans ces trois lignes, `private.tache_courriels()` levait « permission denied
-- for schema net » LE LENDEMAIN du jour où l'exploitant installait pg_net comme
-- la procédure le lui demande — et comme le moteur est une seule transaction,
-- c'est toute la nuit qui était annulée. Le geste censé réparer l'envoi cassait
-- tout le reste. `auth` était accordé dans `00_local.sql`, qui n'est jamais
-- déployé : en production, chaque `auth.uid()` d'une fonction SECURITY DEFINER
-- reposait sur un droit posé par Supabase et non par nous.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'net') then
    execute 'grant usage on schema net to riseva_definer';
    execute 'grant execute on all functions in schema net to riseva_definer';
  end if;
  if exists (select 1 from pg_namespace where nspname = 'auth') then
    execute 'grant usage on schema auth to riseva_definer';
  end if;
end $$;
-- `luhn_ok` est appelée par une contrainte CHECK, donc au nom de celui qui écrit ;
-- `verdict_registre` est appelée depuis une RPC. Ni l'une ni l'autre n'est
-- SECURITY DEFINER — elles ne doivent rien pouvoir faire d'autre que calculer —
-- donc elles n'appartiennent pas à `riseva_definer` et la table rase du début
-- leur a retiré l'EXECUTE de tout le monde. On le rend, à ce seul rôle.
grant execute on function private.trimestres(date, date) to riseva_definer;
grant execute on function private.clore_campagne_effet(uuid) to riseva_definer;
grant execute on function private.points_bruts(uuid, uuid, date, date) to riseva_definer;
grant execute on function private.realisations_brutes(uuid, uuid, uuid, date, date) to riseva_definer;
grant execute on function private.luhn_ok(text) to riseva_definer;
grant execute on function private.verdict_registre(public.association, jsonb) to riseva_definer;
grant execute on function private.mots_utiles(text) to riseva_definer;
grant execute on function private.recouvrement(text[], text[]) to riseva_definer;
grant execute on function public.sans_accents(text) to riseva_definer;
grant execute on function private.iban_ok(text) to riseva_definer;
grant execute on function private.pilote_le_site(uuid) to riseva_definer;
grant execute on function private.texte_consentement(uuid) to riseva_definer;
grant execute on function private.distance_km(double precision, double precision,
                                              double precision, double precision)
  to riseva_definer;
grant execute on function private.rayon_offre_km() to riseva_definer;
grant execute on function private.offre_min_pour_cent() to riseva_definer;
grant execute on function private.plancher_adoption() to riseva_definer;
grant execute on function private.reference_virement() to riseva_definer;
grant execute on function private.seuil_ecart() to riseva_definer;
grant execute on function private.campagne_precedente(uuid) to riseva_definer;
grant execute on function private.nommable(text, bigint, bigint) to riseva_definer;
grant execute on function private.n(jsonb, text) to riseva_definer;
grant execute on function private.taux_calcules(jsonb) to riseva_definer;
grant execute on function private.ecarts_periode(uuid, uuid, jsonb) to riseva_definer;
grant execute on function private.jeton_mission(uuid) to riseva_definer;
grant execute on function private.trace_de_personne(text, uuid) to riseva_definer;
grant usage on schema extensions to riseva_definer;
grant select, insert, update, delete on all tables in schema public to riseva_definer;
grant select, insert, update, delete on all tables in schema private to riseva_definer;
