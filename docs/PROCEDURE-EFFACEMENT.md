# Effacement d'un compte — procédure

Ce document existe parce qu'une partie de l'effacement ne peut pas être écrite
dans une migration. Le code fait ce qu'il peut faire ; le reste se fait à la main,
et se prouve.

## Deux gestes différents, deux noms différents

**Retirer un salarié** — `pseudonymiser_salarie(profil)`, déclenché par
l'administrateur de l'entreprise. Le compte perd son nom, son siège est libéré,
il ne peut plus se connecter. Mais son identifiant survit dans `mission.salarie`,
et l'entreprise, les associations soutenues et les dates permettent une
réidentification par recoupement. **Ce n'est pas une anonymisation**, et rien dans
le produit ne prétend le contraire. La CNIL distingue explicitement l'alias
indirectement identifiant de l'anonymisation irréversible.

**Effacer un compte** — fonction Edge `effacement`, demandée par la personne
elle-même ou par Riseva. Là, on supprime.

## Ce que fait la fonction

1. Vérifie le jeton de l'appelant avec la clé publique. La clé de service ne sert
   jamais à décider qui parle.
2. Refuse si l'appelant n'est ni la personne concernée ni Riseva. Un administrateur
   d'entreprise peut retirer quelqu'un de son équipe, pas l'effacer : l'effacement
   appartient à la personne.
3. Appelle `supprimer_salarie()` : `private.appartenance` et `profil` disparaissent.
   `mission.salarie` passe à NULL grâce au `ON DELETE SET NULL` — sans lui, la
   cascade effacerait l'histoire de l'entreprise et des associations avec celle de
   la personne, ce que personne n'a demandé.
4. Supprime le compte d'authentification via l'API Auth Admin. Le jeton de
   rafraîchissement meurt immédiatement ; le jeton d'accès en cours vit jusqu'à son
   expiration, mais `private.moi()` renvoie NULL dès que le profil a disparu, donc
   il n'ouvre plus rien.
5. Consigne la purge dans `private.journal_purge` : l'ensemble, le nombre de lignes,
   le motif. Jamais le contenu.

## Ce qui reste à faire à la main

**Les sauvegardes.** Supabase conserve des sauvegardes automatiques. Une personne
effacée aujourd'hui reste dans la sauvegarde d'hier, et c'est normal : le RGPD
n'exige pas de réécrire les sauvegardes, il exige que la demande soit rejouée si
l'on restaure.

Tenir un registre, hors base, de chaque demande d'effacement : date, identifiant
technique, périmètre. Après toute restauration :

    1. Restaurer.
    2. Rejouer chaque demande postérieure à la date de la sauvegarde.
    3. Consigner le rejeu dans le registre.

Sans ce registre, une restauration ressuscite des comptes effacés, et personne ne
s'en aperçoit.

**Les exports déjà produits.** Un CSV téléchargé par un client la semaine dernière
contient encore le nom. On ne peut pas le rappeler, mais on peut le dire : les
conditions d'utilisation précisent que l'entreprise est responsable des exports
qu'elle conserve, et l'interface le rappelle au moment de l'export.

**Les rapports scellés.** Ils gardent des agrégats, pas des noms. C'est voulu : ce
qu'une entreprise a fait une année-là reste vrai après le départ d'un salarié.

## Ce qu'il faut vérifier avant de qualifier un jeu d'« anonyme »

Trois tests, dans cet ordre, et avec les données réellement accessibles à
l'employeur :

- **singularisation** — peut-on isoler un individu dans le jeu ?
- **corrélation** — peut-on relier deux enregistrements du même individu ?
- **inférence** — peut-on déduire une information sur un individu ?

Tant que l'un des trois passe, le jeu contient des données personnelles, et le mot
« anonyme » est faux. Dans Riseva, le seuil de cinq donateurs sur les agrégats de
dons personnels existe exactement pour l'inférence : sous ce seuil, aucun montant
ni effectif ne sort, même pas le total — sinon deux requêtes suffisent à isoler
une personne par différence.
