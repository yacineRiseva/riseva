-- Riseva — le jeu de démonstration
-- ---------------------------------------------------------------------------
-- NE PAS INSTALLER SUR UNE BASE DE PRODUCTION.
--
-- Une entreprise, son abonnement, ses établissements, quatre associations
-- vérifiées et leurs annonces. Assez pour qu'une base d'essai montre le produit
-- plein, et pour que la recette ait de quoi vérifier ses règles.
--
-- Il s'installe après `04_seed.sql`, dont il dépend : la saison et le barème
-- sont posés là-bas.
-- ---------------------------------------------------------------------------

insert into entreprise (id, nom, secteur, ville, effectif, ca, cout_jour_moyen,
                        siret, adresse, lat, lon)
values ('22222222-2222-4222-8222-222222222222', 'Vaudrey Ciments', 'Industrie', 'Lyon',
        210, 48000000, 340, '90800005200005', '12 rue des Docks, 69009 Lyon', 45.7333, 4.8137);

insert into private.domaine_entreprise (entreprise, domaine)
values ('22222222-2222-4222-8222-222222222222', 'vaudrey-ciments.fr');


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
                         mandat_recus_version, iban, bic, titulaire_compte, helloasso)
values
 ('33333333-3333-4333-8333-333333333333', 'Refuge des Quatre Vents', 'W423001234', '428763304',
  'Protection animale', 'Saint-Étienne',
  'Refuge de 180 places qui recueille chiens et chats abandonnés depuis 1998.',
  '14 chemin du Bois, 42000 Saint-Étienne', 45.4397, 4.3872,
  true, current_date - 120, current_date + 240, true, true, 'Élise Tournier', 'Présidente', 'QV-2027-',
  current_date - 40, 'Élise Tournier', 'Présidente', '2026.1',
  'FR7530003004180001234567890', 'BREDFRPPXXX', 'Association Refuge des Quatre Vents', null),
 ('44444444-4444-4444-8444-444444444444', 'Racines Vives', 'W631004567', '512291048',
  'Reforestation', 'Clermont-Ferrand',
  'Replantation de haies bocagères et de forêts mixtes sur des parcelles agricoles.',
  '3 route des Prés, 63200 Riom', 45.8938, 3.1128,
  true, current_date - 60, current_date + 300, true, true, 'Marc Aubert', 'Trésorier', 'RV-2027-',
  current_date - 40, 'Marc Aubert', 'Trésorier', '2026.1',
  'FR5510278073000002047260146', 'CMCIFR2AXXX', 'Racines Vives',
  'https://www.helloasso.com/associations/racines-vives/formulaires/1');

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
  'Saint-Étienne', false, 3600, 3600, current_date + 60, 'ouverte', 'animal', 0.011),
 -- Le quatrième format : le don de matériel. Il manquait à la semence, et son
 -- absence rendait muets les tests de valorisation — c'est-à-dire précisément
 -- la partie où Riseva touche à de la comptabilité. Pas d'unité d'impact ici :
 -- un ordinateur réemployé ne se convertit pas en arbres ni en repas, et lui
 -- inventer une équivalence aurait été le premier chiffre faux du produit.
 ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111',
  'don_materiel', 'Ordinateurs pour le suivi des adoptions',
  'Nos trois postes datent de 2012 et le logiciel de suivi ne tourne plus dessus. Du matériel reconditionné convient parfaitement, à condition que les disques aient été effacés avant remise.',
  'Saint-Étienne', false, 10, 7, current_date + 30, 'ouverte', null, null);
