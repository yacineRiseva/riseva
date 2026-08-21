-- Riseva — politiques de sécurité au niveau ligne.
-- Principe : le client n'a aucun droit qu'une politique ne lui donne explicitement.

alter table profil          enable row level security;
alter table entreprise      enable row level security;
alter table association     enable row level security;
alter table annonce         enable row level security;
alter table mission         enable row level security;
alter table don             enable row level security;
alter table abonnement      enable row level security;
alter table preinscription  enable row level security;
alter table saison          enable row level security;
alter table bareme          enable row level security;
alter table invitation      enable row level security;
alter table acces           enable row level security;
alter table rapport         enable row level security;
alter table moteur_journal  enable row level security;

-- Helpers
create or replace function mon_role() returns role_utilisateur
language sql stable security definer as $$ select role from profil where id = auth.uid() $$;
create or replace function mon_entreprise() returns uuid
language sql stable security definer as $$ select entreprise from profil where id = auth.uid() $$;
create or replace function mon_association() returns uuid
language sql stable security definer as $$ select association from profil where id = auth.uid() $$;

-- Lecture publique du catalogue
create policy p_saison_lecture      on saison      for select using (true);
create policy p_bareme_lecture      on bareme      for select using (true);
create policy p_asso_lecture        on association for select using (valide or mon_role() = 'admin');
create policy p_annonce_lecture     on annonce     for select using (etat <> 'brouillon' or association = mon_association());

-- Profils : chacun se voit, et voit les membres de son organisation
create policy p_profil_lecture on profil for select using (
  id = auth.uid()
  or mon_role() = 'admin'
  or (entreprise is not null and entreprise = mon_entreprise())
);
create policy p_profil_maj on profil for update using (
  id = auth.uid() or mon_role() = 'admin'
  or (mon_role() = 'entreprise_admin' and entreprise = mon_entreprise())
);

-- Entreprises : visibles de tous pour le classement, modifiables par leur admin
create policy p_entreprise_lecture on entreprise for select using (true);
create policy p_entreprise_maj on entreprise for update using (
  mon_role() = 'admin' or (mon_role() = 'entreprise_admin' and id = mon_entreprise())
);

-- Annonces : l'association gère les siennes
create policy p_annonce_ecriture on annonce for insert with check (association = mon_association());
create policy p_annonce_maj      on annonce for update using (association = mon_association() or mon_role() = 'admin');

-- Missions : le salarié crée la sienne, l'entreprise voit les siennes,
-- l'association voit celles qui portent sur ses annonces
create policy p_mission_lecture on mission for select using (
  mon_role() = 'admin'
  or entreprise = mon_entreprise()
  or exists (select 1 from annonce a where a.id = mission.annonce and a.association = mon_association())
);
create policy p_mission_creation on mission for insert with check (
  salarie = auth.uid() and entreprise = mon_entreprise()
);
-- L'association tranche, le salarié ne peut que déclarer sa mission faite.
create policy p_mission_maj on mission for update using (
  mon_role() = 'admin'
  or salarie = auth.uid()
  or exists (select 1 from annonce a where a.id = mission.annonce and a.association = mon_association())
);

-- Dons : lecture par l'association bénéficiaire et l'entreprise donatrice
create policy p_don_lecture on don for select using (
  mon_role() = 'admin' or association = mon_association() or entreprise = mon_entreprise()
);

-- Abonnements : uniquement l'entreprise concernée
create policy p_abo_lecture on abonnement for select using (
  mon_role() = 'admin' or entreprise = mon_entreprise()
);

-- Préinscriptions : écriture ouverte au public (formulaire), lecture réservée à Riseva
create policy p_prein_ecriture on preinscription for insert with check (true);
create policy p_prein_lecture  on preinscription for select using (mon_role() = 'admin');


-- ---------------------------------------------------------------- invitations
-- Seul l'administrateur de l'entreprise voit et gère ses liens.
create policy p_invit_lecture on invitation for select using (
  mon_role() = 'admin' or entreprise = mon_entreprise()
);
create policy p_invit_ecriture on invitation for insert with check (
  mon_role() in ('admin','entreprise_admin') and entreprise = mon_entreprise()
);
create policy p_invit_maj on invitation for update using (
  mon_role() = 'admin' or (mon_role() = 'entreprise_admin' and entreprise = mon_entreprise())
);

-- La page publique de rejointe ne lit jamais la table directement : elle appelle cette
-- fonction, qui ne renvoie que ce qui est nécessaire pour afficher l'écran d'inscription.
create or replace function invitation_publique(p_code text)
returns table (entreprise_nom text, places_restantes integer, valide boolean)
language sql stable security definer as $$
  select e.nom,
         least(i.places - i.utilisees, sieges_restants(e.id)),
         (i.active and i.expire_le >= current_date
          and i.utilisees < i.places and sieges_restants(e.id) > 0)
    from invitation i join entreprise e on e.id = i.entreprise
   where upper(i.code) = upper(p_code)
$$;
revoke all on function invitation_publique(text) from public;
grant execute on function invitation_publique(text) to anon, authenticated;

-- Journal des accès : lecture réservée à l'entreprise concernée et à Riseva.
-- Personne ne peut l'effacer, pas même l'administrateur de l'entreprise.
create policy p_acces_lecture on acces for select using (
  mon_role() = 'admin' or entreprise = mon_entreprise()
);

-- Le lien d'inscription ne peut créer un compte que sur un domaine déclaré.
create or replace function domaine_autorise(p_entreprise uuid, p_email text)
returns boolean language sql stable as $$
  select case
    when coalesce(array_length(domaines, 1), 0) = 0 then true
    else lower(split_part(p_email, '@', 2)) = any (
      select lower(d) from unnest(domaines) as d)
  end
  from entreprise where id = p_entreprise
$$;

-- L'anonymisation n'est ouverte qu'à l'administrateur de l'entreprise concernée.
create or replace function retirer_salarie(p_profil uuid)
returns void language plpgsql security definer as $$
begin
  if not exists (
    select 1 from profil p
     where p.id = p_profil and p.role = 'salarie'
       and (mon_role() = 'admin'
            or (mon_role() = 'entreprise_admin' and p.entreprise = mon_entreprise()))
  ) then
    raise exception 'Non autorisé';
  end if;
  perform anonymiser_salarie(p_profil);
end $$;


-- ---------------------------------------------------------------- rapports
-- Une entreprise lit ses rapports, personne d'autre. Ils sont écrits par la tâche
-- planifiée, jamais par un utilisateur : aucune politique d'insertion.
create policy p_rapport_lecture on rapport for select using (
  mon_role() = 'admin' or entreprise = mon_entreprise()
);

-- ---------------------------------------------------------------- journal du moteur
-- Lisible par Riseva seule. Personne ne peut l'effacer, pas même l'administration :
-- un journal d'automatismes effaçable ne prouve rien.
create policy p_moteur_lecture on moteur_journal for select using (mon_role() = 'admin');

-- ---------------------------------------------------------------- réalisations
-- Seule l'association bénéficiaire peut déclarer ce qui a réellement été fait, et
-- seulement au moment où elle valide. L'entreprise ne peut pas corriger son propre score.
create or replace function declarer_realise(p_mission uuid, p_quantite numeric)
returns void language plpgsql security definer as $$
begin
  if not exists (
    select 1 from mission m join annonce a on a.id = m.annonce
     where m.id = p_mission
       and (mon_role() = 'admin' or a.association = mon_association())
  ) then
    raise exception 'Non autorisé';
  end if;
  if p_quantite < 0 then raise exception 'Quantité négative'; end if;
  update mission set realise = p_quantite where id = p_mission;
end $$;
