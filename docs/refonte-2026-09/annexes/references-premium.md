# Annexe : ce que font les sites de reference, et ce qu'on en retient

Releve du 6 septembre 2026 sur les pages d'accueil publiques de Linear, Stripe,
Vercel, Ramp, Wise, Mercury, Attio, Raycast et Apple. Ce n'est pas un catalogue
d'idees a copier : c'est la liste des regles que ces sites tiennent tous, ou
presque, et qui manquaient aux vitrines de Riseva. Les observations sont
resumees ; les chiffres cites sont des ordres de grandeur mesures a la regle sur
un ecran de 1440 px, pas des specifications publiees par ces marques.

## Le premier ecran

Quatre objets et rien d'autre : un titre de six a neuf mots, un sous-titre
d'une phrase, un ou deux boutons, une preuve visible sans defiler (le produit,
toujours le produit). Aucun sur-titre en capitales sur Linear, Vercel ou Attio ;
Stripe et Ramp en gardent un, court. Aucune rangee de chiffres dans le premier
ecran, sauf Wise qui met un seul nombre (le taux) parce qu'il est le produit.

Ce que Riseva en retient : le heros perd son sur-titre, ses cinq lignes de
mentions, sa rangee de trois chiffres et sa legende. Il garde une phrase, un
sous-titre, deux boutons, une ligne de reassurance factuelle, et la capture du
produit en grand.

## La preuve par le produit

Tous montrent l'interface reelle, recadree sur ce qui prouve la phrase d'a
cote, jamais un ecran entier reduit a une vignette. Linear et Attio montrent un
fragment d'ecran (une ligne, une carte, un panneau) par argument. Vercel montre
le terminal et le tableau de deploiement tels quels. Aucun ne montre de
photographie de banque d'images ; Apple montre l'objet vendu.

Ce que Riseva en retient : une capture par phrase, prise sur le vrai produit,
recadree sur l'objet (la carte d'annonce, la liste de qui vient, la page de
confirmation, la ligne de mission), jamais legendee.

## La surface

Aplats, filets a 1 px entre 6 et 16 % d'opacite, ombres presque invisibles
(sous 10 %), un seul fond sombre par page au plus (Linear et Vercel sont
sombres partout ; Stripe, Ramp et Attio sont clairs avec une seule bande
sombre). Aucun verre depoli sur les pages d'accueil relevees, aucun degrade
decoratif sauf Stripe, dont le degrade est la signature historique de la
marque. Rayons entre 8 et 16 px, boutons rectangulaires.

Ce que Riseva en retient : le papier partout, une carte sombre par page, les
hairlines du systeme, le verre et les nappes lumineuses retires.

## Le rythme vertical

Entre 64 et 112 px entre deux sections, jamais plus. Les pages font entre 6 000
et 9 000 px a 1440 (Linear est plus longue mais chaque ecran est un argument).
Aucune section ne repete un argument deja fait : quand deux sections parlent de
la meme chose, elles sont fusionnees.

Ce que Riseva en retient : 96 px entre sections, huit sections sur la page
entreprises au lieu de douze, sept sur la page associations.

## La typographie

Une famille pour les titres, une pour le texte, parfois une monospace pour les
chiffres. Titres entre 48 et 64 px en tete, 28 a 40 px pour les sections, chasse
resserree (-0,01 a -0,03 em), interligne serre (1,0 a 1,1). Corps entre 16 et
18 px, interligne 1,5 a 1,6, mesure de 60 a 70 caracteres. Etiquettes en
capitales rares, petites, espacees.

Ce que Riseva en retient : Instrument Sans et Inter, enfin servies ; l'echelle
de `05-LANGAGE-VISUEL.md`.

## Le mouvement

Sur les pages d'accueil relevees, le texte ne bouge jamais : il est la des le
premier rendu. Ce qui bouge, c'est le produit (un ecran qui se pose, un curseur
qui suit un scenario chez Linear et Raycast, un graphe qui se dessine chez
Stripe). Durees courtes (100 a 400 ms), courbes en sortie douce, aucune
animation qui conditionne la lecture. `prefers-reduced-motion` est respecte
partout ou nous l'avons teste.

Ce que Riseva en retient : trois mouvements (la capture du heros se pose, la
riviere se trace, le resultat du simulateur change en fondu), rien sur le texte,
tout en place sans script et sous reduction de mouvement.

## Le prix

Quand il est public (Linear, Vercel, Attio, Raycast), il a sa page ou sa
section, avec une grille lisible d'un coup d'oeil et une reponse claire a « ce
qui est compris ». Aucun ne cache le prix derriere un formulaire quand il est
standardise.

Ce que Riseva en retient : la grille lue dans `data.js`, remontee juste apres
la demonstration du produit, avec le simulateur en tete et le bouton qui dit ce
qu'il fait (une preinscription, gratuite).

## Les boutons

Un bouton nomme l'action et l'objet (« Start building », « Get started with
Linear », « Open an account »). Jamais « Commencer » seul, jamais un verbe sans
complement. Le bouton principal est plein, le secondaire est un contour ou un
lien.

Ce que Riseva en retient : « Calculer mon tarif », « Ouvrir la demonstration »,
« Se preinscrire », « Ecrire ce qui nous manque », « Ouvrir notre espace ».
