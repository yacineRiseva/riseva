# Controle croise n. 6 : version quasi finale, relue par Gemini

Conversation « Audit strategique des sites Riseva », 7 septembre 2026, modele
« Pro Extended » (les quotas etaient revenus). Memes sept captures que pour
ChatGPT. Texte integral, apostrophes redressees.

---

L'évolution entre l'itération précédente et cette version finalisée démontre une véritable maturité dans l'exécution de l'interface. Le passage exclusif aux véritables écrans du produit, uniformément posés sur des tapis carrés, a littéralement sauvé la structure de la page dédiée aux entreprises. L'oeil du visiteur ne saute plus d'un format illustratif à un autre : la grille visuelle est enfin posée, le rythme de lecture devient prévisible, ce qui constitue la base absolue de la réassurance dans la vente de logiciels B2B. Le choix de remplacer les tableaux réduits par les vues mobiles natives du produit sur les déclinaisons à 390 pixels est incontestablement la meilleure décision de cette itération. Au lieu d'imposer un effort de déchiffrage sur des éléments rétrécis, l'interface devient tangible, l'utilisateur ressent presque le produit qu'il aura dans la poche. Le nettoyage typographique porte ses fruits : la suppression d'un tiers des sur-titres en capitales a calmé la page, laissant les véritables messages respirer. L'ajout d'une bordure plus marquée sur les champs du simulateur tarifaire les sort de leur invisibilité passée, rendant l'interaction évidente. Du côté des associations, la refonte du flux de lecture autour du triptyque « Publier, choisir, confirmer » et la réintégration de l'encart sur l'assurance dans le corps du texte fluidifient considérablement l'entonnoir d'engagement. Le message est frontal, le contrat est clair.

Un point de blocage ergonomique majeur empêche cependant la mise en ligne immédiate, et il se situe sur la page des associations, au niveau du formulaire d'inscription final. Ce module a été conçu comme un texte à trous (« Nous sommes votre association, à votre ville... »), ce qui est narratif et engageant. Néanmoins, en l'état actuel de la maquette, les variables à remplir sont simplement signalées par un texte gris souligné. De simples mots soulignés ne portent pas une affordance suffisante pour être identifiés comme des champs de saisie ; dans le web moderne, un trait simple évoque un lien hypertexte, pas une zone de frappe. Si le responsable associatif ne comprend pas instantanément qu'il doit cliquer sur ce soulignement pour y taper son texte, le taux d'activation s'effondrera à la toute dernière étape. La correction exacte consiste à injecter un léger fond grisé, reprenant la teinte exacte des champs de l'application, sous les mots à remplacer, ou à simuler un curseur clignotant au début du premier champ, afin de signaler sans aucune ambiguïté qu'il s'agit d'une zone interactive et modifiable.

Plusieurs éléments restent perfectibles mais ne justifient pas de retarder le lancement. Le grand bloc vert sombre « Douze mois plus tard, vous n'avez pas de bilan à écrire », sur la version mobile, génère un tunnel de défilement vertical particulièrement long. Là où la section précédente alternait efficacement textes courts et petites cartes claires, cette large zone unie impose un effort de lecture prolongé sur petit écran. Le contraste typographique est heureusement excellent, ce qui sauve l'ensemble, mais une future version du site devra scinder ce bloc ou l'aérer. Je note également votre refus catégorique de lisser la première question de la FAQ concernant l'absence de résultats. Assumer un « Non. » brut, isolé et cinglant est un choix éditorial très lourd. C'est une posture qui filtre violemment l'audience et qui va indéniablement braquer le profil corporate classique en quête de réassurance immédiate. Cependant, cela installe une sincérité radicale qui qualifie durement le prospect restant. Puisque ce risque est un choix stratégique arrêté de votre part, la page peut partir avec.

Trois passages textuels manquent de la rigueur attendue et doivent être corrigés en base de données avant la publication.

Premièrement, sur la page associations, dans la FAQ, la réponse inaugurale contient une formulation fautive et archaïque.
À remplacer : « Ce peut arriver, surtout la première saison : »
La formulation proposée : « Cela peut arriver, surtout la première saison : »

Deuxièmement, sur la page entreprises, dans la liste à puces détaillant les éléments compris dans l'abonnement, la définition de la norme européenne manque d'allure institutionnelle, et la personnification du logiciel y est maladroite.
À remplacer : « La fiche de durabilité CSRD : ce que Riseva sait, rangé dans les rubriques de la norme européenne volontaire, avec la liste de ce qu'elle ne couvre pas. »
La formulation proposée : « La fiche de durabilité CSRD : les données collectées par la plateforme, classées selon les rubriques de la norme européenne volontaire, avec la liste détaillée de ce qui n'est pas couvert. »

Troisièmement, sur la page associations, dans l'encart sombre décrivant les flux financiers, la transition entre les deux options de paiement est hachée, ce qui rend la lecture télégraphique.
À remplacer : « Le virement direct du donateur sur votre compte, avec une référence à retrouver sur votre relevé. Ou votre propre page HelloAsso, dont vous collez l'adresse : le donateur paie par carte chez HelloAsso, et l'argent arrive chez vous. »
La formulation proposée : « Soit par virement direct sur votre compte, avec une référence unique identifiable sur votre relevé. Soit via votre propre page HelloAsso, dont vous renseignez le lien : le donateur paie par carte et les fonds vous parviennent directement. »

Je signe pour la mise en ligne immédiate, à la stricte condition d'appliquer les fonds grisés sur les champs du formulaire associatif et d'intégrer les trois corrections de texte.

---

Note de lecture : deux des trois citations « a remplacer » sont mal lues. La
page ecrit « Ça peut arriver » (pas « Ce peut arriver ») et « La fiche de
durabilite VSME » (pas CSRD) ; la seconde phrase vient de `data.js`, la liste de
ce qui est compris, partagee avec l'application. L'affordance des champs et la
transition « Soit... soit... » sont retenues (`04-ARCHITECTURE.md`, section F).
