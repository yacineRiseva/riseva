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
