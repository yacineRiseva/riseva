# Refonte des vitrines : implementation

Ce que le depot contient a l'issue de la refonte, ou ca vit, et comment on le
refait. Les decisions sont dans `04-ARCHITECTURE.md` (sections D et E pour les
arbitrages apres controles croises) ; la forme est dans `05-LANGAGE-VISUEL.md`.

## 1. La chaine

```
scripts/captures.py   ->  public/captures/*.jpg (+ variantes WebP par images.py)
scripts/vitrines.py   ->  public/index.html, public/associations.html
public/styles/vitrine.css  -(scripts/css.py)->  public/styles/vitrine.min.css
public/vitrine.js     (servi tel quel)
scripts/tests.py      (Playwright ; regenere les pages avant de mesurer)
scripts/clavier.py --strict, scripts/contraste.py, scripts/verifier.py
```

Ordre pour tout refaire : `python3 scripts/captures.py && python3
scripts/vitrines.py && python3 scripts/css.py && python3 scripts/tests.py`.

## 2. Les captures (`scripts/captures.py`)

Prises sur la vraie application (`/app/?demo=1`, jeu de demonstration), avec
les vraies polices, a chaque execution. Chaque entree de `ECRANS` dit : le
fichier, l'utilisateur de demonstration (u2 Claire Fontaine, administratrice de
Vaudrey Ciments ; u7 Elise Tournier, Refuge des Quatre Vents ; u9 Paul Girard,
salarie a Lille), la route, l'element photographie, la largeur de fenetre, la
densite (2 par defaut, 3 pour les petites cartes), les styles injectes avant la
photo (masquer des lignes ou des colonnes de trop, remplacer une vignette
photographique par l'aplat de la charte), une action prealable.

Regles tenues :

- un element entier, jamais coupe au milieu d'une ligne : les lignes de trop
  sont masquees, la coupe `hauteur` ne sert que pour le heros (frontiere de
  carte) et le formulaire d'annonce ;
- chaque ecran complexe a sa variante `-mobile`, prise dans la mise en page
  telephone de l'application (fenetre de 430 px ; 390 pour la page de
  confirmation) ;
- la page de confirmation est reconstruite depuis le gabarit de la fonction
  `valider-mission` (feuille et formulaire extraits du source), pas recopiee ;
- l'affiche est prise dans l'application, le total de demonstration efface ;
- tout fichier de `public/captures/` que la liste n'a pas produit est retire,
  avec ses variantes.

Vingt-trois fichiers JPEG, tous en double densite au moins, aucune photo, aucune
illustration ; `public/photos/` ne contient plus que les vignettes de
l'application.

## 3. Le generateur (`scripts/vitrines.py`)

Deux pages ecrites deux fois, expres, dans un meme squelette (`page()`) : barre
(`nav()`), pied (`pied()`), titres de section (`entete()`, sur-titre facultatif),
accordeons (`details()`), captures (`capture()`), donnees structurees
(`donnees_structurees()`).

Ce que le generateur lit au lieu de recopier : la grille tarifaire, le tarif
fondateur, les regles de reglement et la liste de ce qui est compris ou exclu
(`TARIFS` dans `public/app/data.js`) ; les quatre envois de la saison et leur
mois (`KITS_SAISON`) ; les dimensions de chaque capture (lues dans le JPEG) ;
les variantes WebP disponibles. Un prix affiche ne peut pas diverger d'un prix
facture : la recette le verifie en plus.

`capture(nom, alt, tailles, eager, classe, dossier, nature, mobile, tapis,
densite)` produit `<figure class="shot"><picture>...</picture></figure>` :
source WebP en `srcset` avec `sizes` mesure sur la page rendue, `<img>` JPEG
avec `width`, `height`, `alt`, `loading`, `decoding` ; sous 640 px, une
`<source media>` vers la variante telephone ; `tapis` pose l'ecran sur une
plaque et borne sa taille a 112 % de nature.

Sections entreprises (`index.html`, 8) : `#hero`, `#mecanisme`, `#outil`,
`#equipes`, `#saison`, `#prix`, `#questions`, `#demarrer`. Associations
(`associations.html`, 7) : `#hero`, `#comment`, `#controle`, `#pourquoi`,
`#argent`, `#questions`, `#commencer`.

## 4. La feuille (`public/styles/vitrine.css`)

Vingt-six kilo-octets lisibles, vingt servis. Jetons recopies de `tokens.css`
(la recette compare), base, boutons, barre et menu `<dialog>`, captures et
tapis, heros, moments, outil, equipes, carte sombre, tarif, questions, final,
pied, composants des associations, mouvement, quatre points de rupture (1240,
1024, 900, 640). Plafonds mesures par la recette : deux ombres ecrites a la
main au plus, opacites de rgba bornees, aucun degrade, aucun verre, aucun
filtre, feuille servie sous 24 Ko.

## 5. Le script (`public/vitrine.js`)

Un fichier, sans module ni compilation. Cinq choses : la barre qui prend un
filet apres 8 px de defilement ; le menu `<dialog>` (focus, Echap, clic dehors,
retour du focus sur le bouton) ; la riviere qui se trace quand les moments
entrent a l'ecran (`IntersectionObserver`, tracee d'avance sous
`prefers-reduced-motion`) ; le simulateur, qui lit la grille rendue dans la
page et applique la meme formule que `devisPour` (tarif fondateur, acompte
40 % et 900 EUR au minimum, branche « a partir de » sur la tranche a devis,
jamais de division par salarie) ; la phrase a trous, qui dimensionne chaque
champ sur son contenu, valide, depose les quatre reponses dans
`localStorage` (`riseva.nouvelleAsso`) et emmene dans `/app/`, avec un repli
par courriel si le stockage est bloque.

Sans script : tout le texte est en place, la barre est une barre, les ancres
marchent, la FAQ s'ouvre (`<details>`), le formulaire envoie par `mailto`.

## 6. La recette (`scripts/tests.py`, bloc « Site public »)

Huit cent soixante-trois tests, tous verts. Ce qui est mesure sur les deux
vitrines, entre autres : le titre, les ancres de la barre, le nombre de
sections, le prix lu contre le module, le simulateur contre `devisPour`, la
formule des quatorze jours, les quatre moments et leurs tapis egaux, les
captures telephone reellement servies a 390 px, l'absence d'illustration et de
legende, les alt, la FAQ en accordeons natifs et son accessibilite clavier, les
cinq criteres du final, l'assurance dans le corps du texte, les mots interdits,
la longueur de ligne avec la police reellement dessinee (82 signes), le
contraste accordeons ouverts, le menu telephone a quatre largeurs, aucun
defilement horizontal de 320 a 430 px, aucune image agrandie au-dela de 85 %
de son fichier, aucune capture recadree par `object-fit`, la derive du systeme
de dessin, les metadonnees et les donnees structurees, aucune requete tierce.

## 7. Etat a la livraison

Les deux relecteurs ont signe la version quasi finale (controles n. 5 et 6,
`04-ARCHITECTURE.md` section F) ; leurs dernieres corrections sont appliquees.

- Hauteurs a 1440 px : entreprises 11 400 px environ, associations 8 100.
  A 390 px : 18 000 et 10 900 environ. Plus longues que la cible du plan (8 500 /
  5 500), sans repetition : ce qui allonge, ce sont les captures a taille
  lisible, et les deux relecteurs ont demande la lisibilite plutot que la
  brievete.
- Poids : `index.html` 45 Ko, `associations.html` 27 Ko, feuille 20 Ko,
  script 12 Ko, deux polices 78 Ko. Aucune requete vers un domaine tiers.
- `clavier.py --strict` : aucun caractere hors clavier francais sur le rendu.
- `contraste.py` : AA partout, accordeons ouverts.

## 8. Ce qui reste hors de cette refonte

`inscription.html` (preinscription) et `rejoindre.html` gardent leurs styles
d'origine ; les boutons « Se preinscrire » des vitrines menent a la premiere.
Son titre et son h1 disaient « Reserver une place » : ils disent maintenant
« Se preinscrire pour la saison 2027 », pour que le bouton et la page qu'il
ouvre disent la meme chose. Leur mise au langage visuel de la refonte est un
chantier a part, note ici pour ne pas l'oublier.
