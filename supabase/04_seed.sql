-- Riseva — jeu de démonstration
-- ---------------------------------------------------------------------------
-- Assez de données pour qu'une installation neuve montre quelque chose, pas
-- assez pour qu'on la confonde avec de la production. Les comptes sont créés
-- côté Auth : ici on ne pose que ce qui vit dans le schéma applicatif.
-- ---------------------------------------------------------------------------

insert into saison (id, nom, debut, fin, etat, prix_min, prix_max, acompte)
values ('11111111-1111-4111-8111-111111111111', 'Saison 2027',
        '2027-01-01', '2027-12-31', 'ouverte', 3500, 4000, 500);

insert into bareme (saison, type, points, unite) values
  ('11111111-1111-4111-8111-111111111111', 'don_financier',          1,   '10 € versés'),
  ('11111111-1111-4111-8111-111111111111', 'benevolat_demi_journee', 150, 'demi-journée'),
  ('11111111-1111-4111-8111-111111111111', 'don_materiel',           100, 'don validé');

insert into entreprise (id, nom, secteur, ville, effectif, ca, cout_jour_moyen,
                        siret, adresse, lat, lon)
values ('22222222-2222-4222-8222-222222222222', 'Lafarge Ciments', 'Industrie', 'Lyon',
        210, 48000000, 340, '39312091000020', '12 rue des Docks, 69009 Lyon', 45.7333, 4.8137);

insert into private.domaine_entreprise (entreprise, domaine)
values ('22222222-2222-4222-8222-222222222222', 'lafarge-ciments.fr');

-- 210 salariés, trois sites : tranche « 200 à 499 », 6 900 € HT, trois sites
-- compris, moins 10 % au tarif fondateur = 6 210 €. Acompte de 40 % = 2 484 €.
insert into abonnement (entreprise, saison, montant_ht, acompte_paye, sieges,
                        effectif_reference, palier, sites_factures, fondateur, signe_le)
values ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111',
        6210, 2484, 210, 210, 'eti', 0, true, '2026-11-02');

insert into association (id, nom, rna, siren, cause, ville, resume, adresse, lat, lon,
                         valide, verifiee_le, a_reverifier_le,
                         recus_actif, eligible_mecenat, signataire, qualite, recu_prefixe,
                         mandat_recus_le, mandat_recus_nom, mandat_recus_qualite,
                         mandat_recus_version, iban, bic, titulaire_compte)
values
 ('33333333-3333-4333-8333-333333333333', 'Refuge des Quatre Vents', 'W423001234', '428763304',
  'Protection animale', 'Saint-Étienne',
  'Refuge de 180 places qui recueille chiens et chats abandonnés depuis 1998.',
  '14 chemin du Bois, 42000 Saint-Étienne', 45.4397, 4.3872,
  true, current_date - 120, current_date + 240, true, true, 'Élise Tournier', 'Présidente', 'QV-2027-',
  current_date - 40, 'Élise Tournier', 'Présidente', '2026.1',
  'FR7530003004180001234567890', 'BREDFRPPXXX', 'Association Refuge des Quatre Vents'),
 ('44444444-4444-4444-8444-444444444444', 'Racines Vives', 'W631004567', '512291048',
  'Reforestation', 'Clermont-Ferrand',
  'Replantation de haies bocagères et de forêts mixtes sur des parcelles agricoles.',
  '3 route des Prés, 63200 Riom', 45.8938, 3.1128,
  true, current_date - 60, current_date + 300, true, true, 'Marc Aubert', 'Trésorier', 'RV-2027-',
  current_date - 40, 'Marc Aubert', 'Trésorier', '2026.1',
  'FR5510278073000002047260146', 'CMCIFR2AXXX', 'Racines Vives');

insert into annonce (association, saison, type, titre, description, lieu, temps_travail,
                     quantite, restant, date_prevue, etat, impact_unite, impact_par_unite)
values
 ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111',
  'benevolat_demi_journee', 'Sortie des chiens et entretien des box',
  'Nous manquons de bras le samedi matin. Six personnes suffisent pour sortir 40 chiens et remettre les box en état.',
  'Saint-Étienne', false, 6, 4, current_date + 9, 'ouverte', 'animal', 12),
 ('44444444-4444-4444-8444-444444444444', '11111111-1111-4111-8111-111111111111',
  'benevolat_demi_journee', 'Plantation de 400 arbres à Beaumont',
  'Chantier de plantation sur une parcelle de deux hectares. Aucune compétence particulière requise, on fournit le matériel.',
  'Beaumont (63)', true, 12, 9, current_date + 16, 'ouverte', 'arbre', 40),
 -- Un besoin en argent : le troisième format, par virement direct. L'IBAN de
 -- l'association est renseigné, sinon cette annonce n'aurait aucune réponse
 -- possible et la contrainte produit l'interdirait.
 ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111',
  'don_financier', 'Vaccins et stérilisations pour l''hiver',
  'Chaque prise en charge coûte environ 90 € en soins vétérinaires. Nous en avons quarante devant nous.',
  'Saint-Étienne', false, 3600, 3600, current_date + 60, 'ouverte', 'animal', 0.011);

insert into private.retention (ensemble, duree, motif) values
  ('acces',          interval '6 months',  'journal de sécurité, durée glissante'),
  ('preinscription', interval '3 years',   'prospection commerciale'),
  ('invitation',     interval '12 months', 'preuve du rattachement à l''entreprise'),
  ('moteur_journal', interval '12 months', 'traçabilité des traitements automatiques');
