# Travailler à trois : ChatGPT, Gemini et Claude

État au 23/08/2026. Ce document sert à préparer les audits, pas à les raconter.
Les conclusions retenues partent dans `DECISIONS.md`, qui reste seul à faire foi.

## 1. Ce qui ne marche pas aujourd'hui

Trois audits sont lancés sur la même question, avec le même contexte recollé à la
main à chaque fois, et on obtient trois avis en prose libre qui se contredisent
sans qu'on sache lequel pèse le plus. Il faut ensuite arbitrer à la majorité,
c'est-à-dire à peu près au hasard, parce que deux avis d'accord sur un point
peuvent l'être pour de mauvaises raisons.

Trois causes, trois corrections.

| Cause | Correction |
|---|---|
| Le contexte est recollé à la main, jamais tout à fait le même | Un espace persistant par modèle, avec le contexte figé dedans |
| Les trois répondent sur le même axe | Un axe distinct par modèle, la divergence devient de la couverture |
| La réponse est en prose libre | Un format de sortie imposé, notes chiffrées et verdict tranché |

## 2. Monter l'espace persistant, une fois pour toutes

**ChatGPT** : créer un *Projet* nommé « Riseva ». Coller le bloc du §3 dans les
instructions du projet, déposer le pack du §4 dans ses fichiers. Toutes les
conversations ouvertes dans ce projet héritent des deux.

**Gemini** : créer un *Gem* nommé « Riseva ». Même bloc en instructions, mêmes
fichiers en connaissances.

**Claude** : le fichier `riseva.skill` livré à part fait exactement la même chose,
et il porte en plus les règles de code et la procédure de recette. Il se charge
tout seul dès qu'une session touche au produit.

À partir de là, une demande d'audit tient en trois lignes au lieu de trois pages,
et surtout : les trois partent du même état du monde.

## 3. Le bloc à coller en instructions (ChatGPT et Gemini)

> Tu travailles sur Riseva, plateforme française qui organise l'engagement
> solidaire des entreprises sur une saison d'un an : bénévolat, mécénat de
> compétences, dons de matériel, dons en argent, parrainage et adoption
> d'animaux, plus la collecte des indicateurs sociaux et de sécurité des sites.
> Le client est l'entreprise, le bénéficiaire est l'association. Le produit se
> vend : il n'est pas une démonstration.
>
> **La ligne qui tient tout.** Riseva est un support, jamais un signataire. Elle
> rassemble ce que les gens saisissent, elle l'additionne, elle le rend. Elle
> n'audite pas, n'interprète pas, ne certifie pas, ne dépose rien et ne conseille
> pas. La responsabilité d'une valeur reste chez celui qui l'a écrite. Toute
> proposition qui entame cette ligne est refusée, même si je la demande.
>
> **Ce que Riseva ne fait jamais** : encaisser de l'argent pour le reverser ;
> émettre un reçu fiscal sans mandat écrit ; calculer un index réglementaire
> (Index Égalité, taux d'emploi OETH) ; produire le document unique ; présenter un
> score comme une mesure d'impact environnemental ; garantir un tarif à l'avance.
>
> **Règles de calcul.** Un taux de périmètre est un rapport de sommes, jamais une
> moyenne de taux. Une valeur absente reste absente, jamais zéro. Un taux dont les
> deux termes ne sont pas complets ne s'affiche pas. Plancher d'anonymat à cinq
> personnes sur tout agrégat.
>
> **Écriture.** Français, registre professionnel, ton direct. Pas de tiret
> cadratin dans les textes d'interface. Pas de section défensive du type « ce que
> nous ne faisons pas » sur les vitrines. Pas de légende sous les images. Pas
> d'emoji. Pas de vocabulaire de plaquette : « solution innovante », « au cœur
> de », « nous accompagnons », « levier », « écosystème ».
>
> **Visuel.** Encre `#131510` comme couleur d'action, papier `#F2F0E9` (jamais de
> blanc pur), forêt `#0B2620`, lime `#C9F24B` réservée aux fonds sombres, vert du
> logo `#6DBE45` jamais en texte sur clair. Aucun dégradé sur un bouton ou un
> titre. Aucune ombre visible. Texte à 15 px minimum. Aucun cliché écologique :
> feuille générique, main tenant une pousse, globe entouré de feuillage, flèches
> de recyclage.
>
> **Comment tu réponds.** Tu tranches, tu ne balances pas. Quand tu proposes une
> modification, tu écris ce qu'elle remplace et ce qu'elle coûte. Quand tu n'es pas
> sûr, tu le dis en un mot au lieu de nuancer trois paragraphes. Tu ne me félicites
> pas.

## 4. Le pack de référence à déposer dans les deux espaces

- `DECISIONS.md` — le journal des décisions, seul à faire autorité.
- `DESIGN.md` — pourquoi les valeurs du système sont ce qu'elles sont.
- `SPEC.md` — le produit.
- Les captures à jour des deux vitrines et de la plateforme (`public/captures/`).
- La grille tarifaire (le tableau du §1 de `references/commerce.md`).

À redéposer quand `DECISIONS.md` change. C'est la seule maintenance de ce
dispositif.

## 5. Un axe par modèle

Poser la même question aux trois produit trois fois le même avis moyen. Poser
trois questions différentes produit une couverture.

| Modèle | Axe | Ce qu'on lui demande vraiment |
|---|---|---|
| **ChatGPT** | Vendre | Est-ce qu'un directeur RSE qui arrive de LinkedIn comprend en huit secondes ce qu'il achète, combien ça coûte, et ce qu'il doit faire ensuite ? Ordre des blocs, promesse, preuve, objections non traitées, appel à l'action. |
| **Gemini** | Voir | Est-ce que la page tient debout visuellement : hiérarchie, rythme vertical, densité, cohérence avec le système, qualité des images, ce qui fait daté. |
| **Claude** | Tenir | Est-ce que ce qui est promis à l'écran existe dans le code et dans la base : cohérence des chiffres, états impossibles, contraste réel, accessibilité, ce qui casse au premier client. |

Chacun voit les captures des autres axes, mais ne note que le sien. C'est ce qui
empêche les trois de converger vers la même banalité.

## 6. Le format de sortie imposé

À coller à la fin de chaque demande d'audit. Sans lui, l'arbitrage se refait à la
main à chaque tour.

> Réponds en trois parties, dans cet ordre, et rien d'autre.
>
> **1. Notes** — chaque critère de 0 à 10, avec une phrase de justification, pas
> deux. Critères : clarté de la promesse ; crédibilité de la preuve ; hiérarchie
> visuelle ; rythme et densité ; qualité des images ; cohérence avec le système ;
> ce qui fait daté ; friction avant l'achat.
>
> **2. Les cinq corrections qui comptent** — classées de la plus rentable à la
> moins. Pour chacune : ce qu'on change, ce que ça remplace, ce que ça coûte, et
> comment on saura que c'était mieux.
>
> **3. Une chose que tu retirerais** — une seule, celle dont l'absence améliore la
> page. Si tu ne retires rien, écris « rien », et explique en une ligne.
>
> Ne me félicite pas. Ne récapitule pas ce que tu vois. Si un point te paraît hors
> de ta compétence, écris « hors axe » et passe.

## 7. Comment on arbitre

1. **Deux modèles d'accord sur un même point, sur des axes différents** : retenu.
   L'accord entre deux regards différents vaut mieux qu'entre deux regards identiques.
2. **Un modèle seul, mais avec un mécanisme** : retenu s'il explique *pourquoi* ça
   marche mieux. Un avis sans mécanisme n'est qu'un goût.
3. **Contradiction franche** : on tranche par l'essai, pas par le vote. On fabrique
   les deux versions et on les regarde côte à côte.
4. **Tout ce qui touche à la ligne du §3** : refusé sans arbitrage.

Ce qui est retenu part dans `DECISIONS.md` avec sa date et ce qu'il remplace.
Ce qui est écarté aussi, quand l'écart est instructif : c'est le seul endroit où
l'on se souvient d'avoir déjà essayé.

## 8. Trois réglages qui changent la qualité des réponses

- **Donner l'image, pas la description de l'image.** Une capture pleine page vaut
  dix lignes de description, et supprime les hallucinations sur des blocs qui
  n'existent pas. `python3 scripts/apercu.py` fabrique la capture cousue.
- **Demander un désaccord explicite.** Ajouter en fin de demande : « Dis-moi
  aussi sur quel point tu penses que l'autre modèle se trompera. » On obtient les
  angles morts au lieu du consensus.
- **Ne jamais demander « qu'est-ce que tu en penses ».** Toujours « note, classe,
  et retire une chose ». La contrainte de retirer quelque chose est ce qui produit
  les meilleures remarques : c'est la seule qui interdise d'empiler.
