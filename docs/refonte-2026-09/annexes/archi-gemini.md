# Controle croise n. 2 (architecture et messages) par Gemini Pro, 6 septembre 2026

Reponse integrale au brief d'architecture (voir `04-ARCHITECTURE.md`, section
« Decisions apres controle croise »). Texte de Gemini, conserve tel quel,
apostrophes droites.

---

Le plan est rationnel. Vous avez expurgé la page des digressions philosophiques pour revenir à l'ingénierie de la preuve. C'est le travail qu'on attend d'une refonte. Je valide la réduction drastique de la hauteur et la concentration des surfaces sombres. Cependant, plusieurs éléments accrochent encore et révèlent une timidité sur vos partis pris. Voici mon arbitrage sur vos variantes et mon audit sur la structure.

## Tranchons les variantes de texte

Le titre principal de la page Entreprises (h1). La variante C s'impose sans discussion : « Le rapport RSE que vos sites remplissent, et que des associations confirment. » La variante A superposait deux idées sans les lier. La variante B était molle et oubliait le mot clé RSE. La variante C pose immédiatement le produit, le bénéfice et le mécanisme de vérification. C'est un titre de travailleur, pas de publicitaire, et c'est exactement ce qu'il faut pour vendre un outil B2B facturé plusieurs milliers d'euros.

Le titre de la section deux Entreprises. « Quatre moments, et vous n'écrivez rien » est acceptable. Il touche la douleur administrative. Mais il reste légèrement passif. Pour être définitif, raccourcissez le bénéfice. Ce titre passe le filtre.

La phrase de remplacement pour les associations. Oubliez « C'est pour vous rencontrer qu'elle paie » qui sonne comme un site de rencontres. Oubliez « Ce qu'elle achète, c'est le chemin jusqu'à vous » qui relève de la poésie hors de propos. La seule phrase valable est : « Elle paie pour vous trouver, pas l'inverse. » C'est frontal, brut, et cela restaure immédiatement l'équilibre des forces. L'association comprend qu'elle détient la ressource rare, à savoir le terrain.

Le libellé du bouton final des associations. « Envoyer, et préparer notre première annonce » est obèse. Un bouton déclenche une action univoque, il ne raconte pas une histoire. Vous demandez à l'utilisateur de cliquer sur une conjonction de coordination. Réduisez cela à l'action immédiate. « Envoyer notre demande » ou « Publier notre besoin ». Ne mélangez pas l'envoi du formulaire et la préparation de la suite dans le même espace cliquable.

## L'architecture Entreprises : ce qui fonctionne et ce qui casse

L'ordre global des huit sections est cohérent. Vous partez de la promesse, vous montrez la mécanique, vous traitez la douleur, vous affichez la méthode de déploiement physique avec l'affiche, puis le livrable final, le prix, les doutes et la garantie. C'est un tunnel de vente classique et robuste.

Afficher le prix et l'absence de coût par salarié dès le premier écran sous les boutons est une excellente décision. Vous purgez instantanément les curieux sans budget et vous qualifiez l'audience. La capture de l'interface marquée du badge de démonstration assoit l'honnêteté de la démarche.

Là où le lecteur décroche : la section cinq. Vous y avez placé la seule carte sombre. L'idée de montrer le livrable final (le bilan) est bonne. Mais y insérer la citation du code de la commande publique en aparté compact est une faute de conception. Vous mélangez l'aboutissement du produit, qui est une libération de charge mentale, avec un rappel à la loi aride. Le cerveau ne traite pas la joie de ne plus écrire de bilan et la terreur de la conformité légale en même temps. Sortez le code de la commande publique de cette carte sombre. Placez cet argument réglementaire dans la section trois (ce que vous ne referez plus à la main) ou dans la FAQ. La carte sombre doit rester pure : douze mois, zéro ligne à écrire, un rapport propre.

La section huit est votre meilleur atout de conversion. L'acompte remboursé si l'outil ne démarre pas renverse le risque. Maintenez cette condition mot pour mot.

## L'architecture Associations : l'épreuve du réel

La suppression de l'illustration artificielle au profit d'une interface claire change totalement la perception. Vous passez d'un vague projet étudiant à un outil fonctionnel. L'ordre en sept sections est chirurgical.

L'ajout de la section trois sur l'assurance est vital. C'est le premier point de blocage physique pour accueillir du public sur un chantier de terrain. Les trois phrases exactes tirées de la charte démontrent que vous connaissez la réalité juridique des refuges et des associations. Ne touchez à aucune virgule de ce paragraphe.

La section quatre introduit une idée brillante : l'export d'une trace datée que l'association peut utiliser pour ses propres subventions. C'est un bénéfice collatéral massif. Vous transformez une corvée (confirmer la présence) en un actif pour l'association.

La brutalité de la section sept est votre signature de marque. Dire que le tableau de bord affichera zéro entreprise à moins de trente kilomètres si le chiffre réel est zéro crée une confiance aveugle. Dans un web inondé de fausses promesses, cette ligne fera s'inscrire les associations par pur respect pour votre franchise.

## Ce qui manque encore pour le décideur qui hésite

Votre plan oublie l'obstacle informatique. Le décideur B2B (DRH, directeur RSE, dirigeant) ne signe jamais seul. Il a toujours un responsable informatique ou un prestataire réseau dans l'ombre qui peut bloquer un achat par peur du surcroît de travail. Il manque une mention claire, probablement dans la section deux ou dans la FAQ, sur l'absence totale d'intégration technique. Précisez noir sur blanc qu'il n'y a pas d'annuaire à synchroniser, pas de SSO obligatoire, pas de déploiement sur les postes de travail. Si Riseva vit uniquement par un lien et des courriels, écrivez : « Zéro intégration informatique requise, aucun accès à votre réseau demandé. »

Le deuxième angle mort concerne la responsabilité fiscale. Vous évoquez la réduction d'impôt (238 bis) et les reçus fiscaux préparés sous mandat. Le directeur financier va tiquer ici. Il voudra savoir qui émet légalement le Cerfa. Si c'est l'association qui le valide et le signe, et Riseva qui le génère techniquement, il faut que la FAQ l'explicite avec des termes comptables précis. Le doute sur la fraude fiscale ou le redressement tue toute vente aux entreprises de plus de cinquante salariés.

## Ce qui ressemble encore à un gabarit généré

La structure de la section trois des entreprises (les trois questions et leurs captures associées) transpire le formatage SaaS classique. Ce schéma « question vague, capture d'écran, explication » est vu mille fois. Pour casser cet effet de gabarit, transformez les questions en affirmations de pilotage. Au lieu de « Combien de vos sites ont répondu ? », écrivez « Le taux de participation par site, calculé en direct. » Au lieu de « Qu'est-ce que vos équipes ont fait cette année ? », écrivez « La liste exacte des missions de terrain, sans aucun retraitement manuel. » Vous n'êtes pas un quiz, vous êtes un tableau de bord. Adoptez le ton de ce que vous vendez.

Le titre de la section cinq, « Douze mois plus tard, vous n'avez pas de bilan à écrire », utilise la mécanique classique de la pilule amaigrissante avant et après. C'est une rhétorique usée. Privilégiez une formulation factuelle centrée sur le livrable. « Juin 2028 : votre rapport de saison sort tout seul » ancre la promesse dans le temps réel et élimine le ton publicitaire.

Enfin, l'accordéon pour la FAQ est un composant technique pertinent, mais assurez-vous que son design ne soit pas celui de la bibliothèque par défaut. Pas de chevrons flottants sans alignement, pas d'animations élastiques à l'ouverture. Une typographie Instrument Sans stricte, une ligne de séparation fine de couleur encre, un signe plus ou moins basique. Le design de la réponse doit être compact, en Inter, sans gras inutile. La rigueur visuelle doit compenser la jeunesse du produit.

Signez ces corrections, intégrez les mentions informatiques et fiscales, et vous aurez deux pages capables d'encaisser le scepticisme de vos premiers visiteurs.
