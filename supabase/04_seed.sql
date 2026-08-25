-- Riseva — le socle d'une installation neuve
-- ---------------------------------------------------------------------------
-- Ce fichier pose ce dont TOUTE installation a besoin, et rien de plus : la
-- saison ouverte, le barème de ses formats, et les durées de conservation.
--
-- Ce qu'il ne pose plus, et pourquoi. Il contenait aussi une entreprise, son
-- abonnement, quatre associations et leurs annonces — le jeu de démonstration.
-- Une base de production installée avec ce fichier s'ouvrait donc sur des
-- chiffres inventés : un client voyait « Vaudrey Ciments » et ses missions le
-- jour de son ouverture. Ce n'est pas un détail de confort. Un chiffre de
-- démonstration dans une base réelle finit par être exporté, consolidé, et cité
-- dans un rapport que quelqu'un signe.
--
-- La démonstration vit désormais dans `04b_demonstration.sql`, qui ne
-- s'installe QUE sur une base d'essai. La procédure de mise en ligne ne le
-- mentionne pas ; la recette, elle, le charge, parce que ses tests portent
-- justement sur ce jeu-là.
-- ---------------------------------------------------------------------------

insert into saison (id, nom, debut, fin, etat, prix_min, prix_max, acompte)
values ('11111111-1111-4111-8111-111111111111', 'Saison 2027',
        '2027-01-01', '2027-12-31', 'ouverte', 3500, 4000, 500);

insert into bareme (saison, type, points, unite) values
  ('11111111-1111-4111-8111-111111111111', 'benevolat_demi_journee', 150, 'demi-journée'),
  ('11111111-1111-4111-8111-111111111111', 'benevolat_journee',      300, 'journée'),
  ('11111111-1111-4111-8111-111111111111', 'mecenat_competence',     200, 'demi-journée'),
  ('11111111-1111-4111-8111-111111111111', 'parrainage_animal',      250, 'animal parrainé un an'),
  ('11111111-1111-4111-8111-111111111111', 'adoption_animal',        400, 'animal adopté'),
  ('11111111-1111-4111-8111-111111111111', 'don_materiel',           100, 'don validé'),
  ('11111111-1111-4111-8111-111111111111', 'don_financier',          1,   '10 € versés');

insert into private.retention (ensemble, duree, motif) values
  ('acces',          interval '6 months',  'journal de sécurité, durée glissante'),
  ('preinscription', interval '3 years',   'prospection commerciale'),
  ('invitation',     interval '12 months', 'preuve du rattachement à l''entreprise'),
  ('moteur_journal', interval '12 months', 'traçabilité des traitements automatiques');
