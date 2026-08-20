-- Riseva — jeu de départ minimal (saison et barème). À exécuter après le schéma.
insert into saison (nom, debut, fin, etat, prix_min, prix_max, acompte)
values ('Saison 2027', '2027-01-01', '2027-12-31', 'brouillon', 3500, 4000, 500);

insert into bareme (saison, type, points, unite)
select id, 'don_financier',          1,   '10 € versés'  from saison where nom = 'Saison 2027'
union all
select id, 'benevolat_demi_journee', 150, 'demi-journée' from saison where nom = 'Saison 2027'
union all
select id, 'don_materiel',           100, 'don validé'   from saison where nom = 'Saison 2027';
