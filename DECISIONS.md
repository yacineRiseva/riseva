# Riseva — journal des décisions

Une ligne par décision, avec sa date et ce qu'elle remplace. C'est ce fichier qui fait autorité,
pas les conversations. Toute nouvelle décision s'ajoute en haut de la section correspondante.

## Produit

| Date | Décision | Remplace |
|---|---|---|
| 23/08/2026 | La recette traverse une **base vide**, écran par écran et rôle par rôle, jusqu'au premier rapport de collecte : `scripts/vierge.py`, 128 vérifications, dans `scripts/verifier.py`. Le mode s'ouvre avec `?vierge=1` et se persiste sous sa propre clé. | Une recette qui ne connaissait que le jeu de démonstration, c'est-à-dire l'état qu'aucun client n'aura le jour de son ouverture. Elle a trouvé sept défauts en une passe, dont deux qui rendaient le produit inutilisable pour un premier client. |
| 23/08/2026 | Une entreprise **déclare ses établissements elle-même**, depuis « Sites et quotas ». L'effectif d'un site est plafonné par la somme déclarée de la société : sans ce plafond, se déclarer trois salariés sur un site suffirait à truquer le rapporté-au-salarié. Mêmes règles dans `creer_etablissement` côté Postgres. | Aucun moyen d'en déclarer un. Le jeu de démonstration arrivait avec ses quatre sites, ce qui masquait le trou : une entreprise qui s'inscrivait ne pouvait ouvrir aucune collecte d'indicateurs, faute de site à qui demander. |
| 23/08/2026 | Chaque société reçoit **son périmètre** à la création du compte, même seule. L'interface ne parle de groupe qu'à partir de deux sociétés. | Un `groupe` réservé aux groupes multi-sociétés. La collecte d'indicateurs s'y rattache : sans périmètre, « une campagne appartient à un groupe » interdisait toute collecte à une société indépendante. |
| 23/08/2026 | « Sites et quotas », « Données sociales » et « Sécurité » sont dans le menu d'un administrateur d'entreprise **dès le premier jour**. | Une apparition à partir de deux établissements, c'est-à-dire une fois le travail déjà fait. Un menu qui se déplie quand le travail est fait est un menu qui empêche de le commencer. |
| 23/08/2026 | Une association **publie sa photo** depuis son espace, et l'annuaire ne montre jamais une carte sans image : la sienne, sinon celle de sa cause. La photo est réduite dans le navigateur avant d'être enregistrée. | Un écran « Ma page publique » dont le champ et le bouton n'étaient reliés à rien, et une grille de cartes en texte seul. |
| 23/08/2026 | Le dernier palier tarifaire porte **« à partir de »**, et l'attribut `sur_devis` suit le palier depuis `data.js` jusqu'à la vitrine. | Un prix ferme de 18 500 € dans la grille et une note en dessous parlant d'un devis. Un prospect à deux mille cinq cents salariés lisait les deux sans savoir lequel l'engageait. |
| 23/08/2026 | Les deux images de la section « Les affiches » sont **dérivées de la capture réelle** par `scripts/captures.py` : la scène entière et le détail du code QR. | Une affiche de synthèse, coupée en bas, montrée à côté de la vraie en vignette. Deux affiches différentes sur la même ligne, et c'est la fausse qui était en grand. |
| 23/08/2026 | Aucune promesse de vitrine sans son geste dans le produit. Trois retirées ou rendues vraies : « appelez-nous, nous rédigeons l'annonce avec vous » (aucun numéro nulle part) devient six modèles d'annonce dans le formulaire ; « nous vous disons combien d'entreprises sont autour de vous » devient un bloc calculé du tableau de bord, qui écrit zéro quand c'est zéro ; « aucun compte à ouvrir » disparaît d'une page dont le bouton en ouvre un. | Des phrases écrites pour rassurer, vérifiées par personne. La recette les vérifie maintenant. |
| 23/08/2026 | La liste de ce qui n'est **pas** compris quitte le bloc tarifaire et rejoint la question de la FAQ sur le périmètre. Elle reste écrite, mot pour mot, et le bloc du prix dit où la trouver. | Une colonne de quatre objections négatives affichée à la seconde où le lecteur évalue le montant. Relevé par les deux relectures du 23/08, sur deux axes différents. C'est le dernier reste de la section défensive retirée le 22/08. |
| 23/08/2026 | Le premier bouton de la page entreprise mène au tarif, la démonstration passe en lien secondaire. | « Explorer la plateforme » en action principale, qui ouvrait une visite et non un achat. Les deux relectures ont noté séparément qu'on comprend le produit sans savoir quoi faire ensuite. |
| 23/08/2026 | Aucune formulation ne dit qu'un chiffre Riseva « tient devant un contrôle » ni « se défend tout seul ». On écrit qu'il est daté et sourcé, et rien de plus. | Deux formules successives qui faisaient implicitement de Riseva le juge de ce qu'un client a le droit d'affirmer. C'est la ligne que le produit ne franchit pas. |
| 23/08/2026 | Le rapport distingue deux sources : les indicateurs sont saisis par le site et approuvés en interne, les missions sont confirmées par l'association. La vitrine ne les confond plus. | « Des chiffres datés, confirmés par un tiers nommé », qui promettait une confirmation externe sur la moitié des chiffres qui n'en ont pas. |
| 23/08/2026 | La fiche VSME couvre partiellement B3, B6 et B7 depuis que la collecte se fait par rubriques. Elle rend des consommations, jamais des émissions : passer de l'une à l'autre demande un facteur d'émission, donc un choix de méthode qui appartient au client. | Trois rubriques déclarées non couvertes, ce qui était vrai avant la collecte par rubriques et ne l'est plus. |
| 23/08/2026 | Seuls les caractères présents sur un clavier français sont autorisés dans le texte affiché. Tiret cadratin, apostrophe courbe, espace fine insécable, point médian, signes de multiplication et de division : deux cents occurrences retirées, et `scripts/clavier.py` fait échouer la recette si l'un revient. | Aucune règle. Ces caractères signent la machine, deviennent des losanges dans un courriel, et empêchent de retrouver un mot dans la page qui l'affiche. |
| 22/08/2026 | L'éligibilité au mécénat de compétences est revérifiée **à l'engagement**, plus seulement à la publication de l'annonce. L'article L. 8241-3 ne permet le prêt gratuit qu'au profit des organismes des a à g du 1 de l'article 238 bis : si l'association perd cette qualité entre les deux, la mise à disposition retombe sous l'interdiction de L. 8241-1, et c'est un délit pour l'entreprise cliente. La convention n'est plus éditable pour ces missions. | Un contrôle unique au moment de publier. Une annonce ouverte valait autorisation permanente. Trou relevé par l'audit de Gemini du 22/08. |
| 22/08/2026 | Fiche de durabilité VSME : les onze rubriques de la norme, remplies avec ce que Riseva sait, et « non couverte » écrit en toutes lettres partout ailleurs. Ce n'est pas un rapport de durabilité et la fiche le dit en premier. | Rien. Comble le vrai manque des services RSE pour PME : le questionnaire ESG du donneur d'ordre, celui de la banque et celui de l'acheteur public, tous différents. |
| 22/08/2026 | Le registre de sécurité refuse une déclaration dont le texte contient une adresse électronique, un numéro de téléphone, un numéro de sécurité sociale ou le nom d'un salarié de la société. Refusée, pas nettoyée : nettoyer apprend que le champ accepte tout puisqu'il ne dit rien. | La seule limite de trois cents caractères, qui décourageait le récit sans l'empêcher. |
| 22/08/2026 | Seule la moitié haute du classement est nommée, avec trois réglages dont le défaut protège, et l'identifiant retiré en même temps que le nom — dans la base comme à l'écran, et dans l'export. | Un classement nominatif de bout en bout. Il punissait ceux qui participent : ne pas s'inscrire était le choix rationnel d'un dirigeant qui doutait de son rang. |
| 22/08/2026 | Grille tarifaire par tranche d'effectif, de 2 400 à 18 500 € HT la saison, un à douze sites compris, 420 € par site supplémentaire. Affichée sur le site, lue par la vitrine dans le même fichier que celui qui facture. | Un prix unique de 3 500 à 4 000 €, qui demandait la même chose à quarante personnes qu'à mille cinq cents. Repères de marché relevés en août 2026 : 5 000 à 50 000 €/an sur le segment RSE français, 3 000 à 12 000 € pour les outils qui visent les PME. Riseva se place en dessous. |
| 22/08/2026 | Tarif fondateur : −10 % pour les vingt premières entreprises signataires, jusqu'au 31/12/2026. La remise porte sur la **première saison, et sur elle seule**. Le plafond est tenu par un trigger, pas par l'interface. | Rien. Une remise sans limite de nombre ni de date n'est pas une remise, c'est le prix. |
| 22/08/2026 | **Retiré le même jour** : le gel du tarif de la première saison pour la deuxième, que la première version du tarif fondateur promettait. C'est un tarif garanti à l'avance, exactement ce que la décision du 29/07/2026, reconfirmée le 30/07/2026, interdit — SPEC §9, « ne doit réapparaître nulle part ». Il avait réapparu. La remise demandée par Yacine était une remise, pas une garantie de prix. | Le gel introduit par erreur le matin même, sur la vitrine, dans les CGV et dans `TARIFS`. |
| 22/08/2026 | Acompte relevé à 40 % du HT, minimum 900 €, et escompte de 3 % pour règlement comptant. | Un acompte de 500 € qui ne couvrait pas le premier envoi d'affiches : Riseva finançait ses clients sur une saison où les supports partent tout au long de l'année. |
| 20/08/2026 | Classement principal normalisé : points par salarié, lu par catégorie de taille. Le total brut devient une lecture secondaire. | Le classement brut unique, structurellement injuste entre une PME et un grand groupe. Signalé à la relecture externe du 20/08. |
| 20/08/2026 | Plafond : aucun format ne peut peser plus de 50 % des points d'une entreprise sur une saison. | Rien. Ajout destiné à empêcher d'acheter la première place à coups de dons. |
| 20/08/2026 | Le score est présenté comme une mesure d'engagement, jamais comme une mesure d'impact environnemental. | Une formulation qui aurait été indéfendable face à un client sérieux. |
| 20/08/2026 | Validation en masse pour les associations, délai affiché en jours, refus motivé. | La validation une par une, qui faisait de l'association un goulot d'étranglement. |
| 20/08/2026 | Plusieurs administrateurs possibles dans une entreprise, le dernier ne peut pas être retiré. | Un administrateur unique, panne en attente. |
| 30/07/2026 | Le barème est fixé par la plateforme, par type d'annonce, appliqué automatiquement. | La version du même jour, 4 minutes plus tôt, où les associations choisissaient les points de leurs annonces. |
| 30/07/2026 | Préinscription gratuite, puis acompte de 500 € à la confirmation, remboursé si la saison ne démarre pas. | Rien, c'est un ajout tardif destiné à relancer la prospection avant la fin du développement. |
| 30/07/2026 | Trophées et rapport allégés à chaque trimestre, mise en avant du top 10 %. | Complète le rythme annuel, ne le remplace pas. |
| 30/07/2026 | Saison = une année fiscale, pour faciliter le réabonnement. | Durée non fixée auparavant. |
| 30/07/2026 | Prix cible de 3 500 à 4 000 € HT par an, positionnement bas de fourchette. | Aucune valeur antérieure. |
| 30/07/2026 | Pas d'application mobile ni de site mobile dédié en v1. | — |
| 30/07/2026 | Boutique de merchandising : idée gardée, non décidée, hors périmètre. | — |
| 29/07/2026 | Interdiction de promettre un tarif figé aux premières entreprises. Reconfirmée le 30/07. | Argument commercial abandonné. |
| 29/07/2026 | Un an, quatre temps forts : ouverture, action avec classement hebdomadaire, trimestre, clôture. | Découpage antérieur non structuré. |
| 29/07/2026 | Riseva n'assure rien. En cas d'incident, la responsabilité est entre l'entreprise et l'association. | — |
| 29/07/2026 | Aucune restriction territoriale. | Le discours parlait d'un engagement sur un territoire, retiré. |
| 25/07/2026 | Axe éditorial : projet fédérateur d'équipes et challenge annuel. | Axe précédent, centré sur le don. |
| 23/07/2026 | Nom retenu : Riseva. Domaine riseva.fr réservé, hébergement pris. | Nom ouvert. |

## Comptes et accès

| Date | Décision | Remplace |
|---|---|---|
| 22/08/2026 | Accès CSE en lecture seule : indicateurs approuvés, rapports, participation agrégée. Nominatif, sans place consommée, et sans rien de nominatif à l'intérieur. | Rien : c'est un ajout. Motif : le comité a un droit d'information, et il vaut mieux le servir avec des agrégats que laisser l'employeur recopier des chiffres à la main. |
| 22/08/2026 | Le rôle `cse` est exclu explicitement de `profil_lecture`. | `private.meme_entreprise` lui aurait ouvert la liste nominative de tout l'effectif — exactement ce que cet accès ne doit pas permettre. Trouvé en écrivant la policy, pas en production. |
| 22/08/2026 | Un lien de référent ou de CSE ne consomme pas une place de salarié. | Un contrôle de quota qui refusait un élu parce que l'entreprise avait rempli ses sièges. |
| 20/08/2026 | L'inscription des salariés passe par un lien unique avec plafond de places, révocable et régénérable. L'entreprise ne saisit aucune liste. | La saisie manuelle un par un. |
| 20/08/2026 | L'abonnement ouvre un nombre de places égal à l'effectif. Aucun compte au-delà, contrainte tenue par la base. | Un nombre de salariés illimité, non tenable économiquement. |
| 20/08/2026 | Retirer un salarié l'anonymise au lieu de le supprimer : identité vidée, points conservés à l'entreprise, place rendue. | La simple désactivation, qui laissait le nom et l'adresse en base. |
| 20/08/2026 | Une association crée son compte seule mais reste invisible tant que Riseva ne l'a pas validée. | — |
| 20/08/2026 | Aucun mot de passe : connexion par lien envoyé par mail. | — |

## Paiement

| Date | Décision | Remplace |
|---|---|---|
| 23/08/2026 | Le don en argent passe par l'**API HelloAsso**. L'association autorise Riseva une fois, depuis la mire d'autorisation de HelloAsso (OAuth avec PKCE) ; Riseva ouvre ensuite une intention de paiement sur SON organisation, le donateur paie par carte, et l'argent va de la carte au compte de l'association. La confirmation revient par l'API : plus rien à rapprocher d'un relevé, plus de référence à recopier. Le jeton de rafraîchissement vit dans le schéma privé de Postgres et n'est manipulé que par la fonction Edge. | Le virement direct avec référence, décidé le 22/08. Il coûtait trois gestes manuels au donateur et une confirmation à la main à l'association, parfois trois semaines plus tard. Il reste en repli pour les associations sans compte HelloAsso. Ce qui a changé depuis le 22/08 : la vérification du programme partenaire, qui expose bien une délégation par l'association elle-même (privilège `Checkout`), et non une clé d'API à détenir. |
| 23/08/2026 | Riseva reste **hors du circuit des fonds**, et c'est ce qui rend le tout tenable : elle n'encaisse pas, elle ouvre une intention de paiement au nom d'une association qui l'a autorisée. Ni agrément d'établissement de paiement (art. L. 314-1 et L. 521-1 du CMF), ni commission, ni délai de reversement. | Rien. C'est la limite que le produit ne franchit pas, quel que soit le circuit. |
| 22/08/2026 | HelloAsso entre comme circuit **complémentaire** : l'association colle l'adresse publique de son formulaire, Riseva ne détient aucune clé et n'attend aucun accord partenaire. Le virement reste le socle universel. | Le choix binaire « HelloAsso ou virement ». HelloAsso exige un compte vérifié que neuf petites associations sur dix n'ont pas, ne délivre pas le reçu fiscal, et son API partenaire suppose une personne morale que Riseva n'a pas encore. |
| 22/08/2026 | Le lien de don est contraint au domaine helloasso.com en HTTPS, sans paramètre, dans le navigateur et par contrainte en base. | Un champ texte libre. Il est présenté à des donateurs sous « donnez ici » : c'était un détournement de dons offert à qui prendrait la main sur un compte d'association. |
| 22/08/2026 | Le don en argent passe par un **virement direct** du donateur à l'association, avec une référence émise par Riseva. Riseva n'encaisse jamais, n'a donc pas d'agrément à obtenir, ne prend aucune commission, et l'association touche 100 % du don le jour où sa banque le crédite. | L'attente d'un accès partenaire HelloAsso, qui bloquait le troisième format depuis le 30/07 sans date. Motif : encaisser pour reverser est un service de paiement (art. L. 314-1 et L. 521-1 du CMF), puni sans agrément de trois ans et 375 000 € (art. L. 572-5) ; et un prestataire agréé impose commission, délai de reversement et dépendance. |
| 22/08/2026 | Aucun point avant confirmation par l'association, et aucune validation automatique sur l'argent. Une intention non honorée s'éteint au bout de trente jours. | La symétrie avec le bénévolat, où quatorze jours de silence valent réalisation. Un silence n'est pas une faute ; un silence ne vaut pas encaissement. |
| 22/08/2026 | Riseva ne prépare un reçu fiscal que sous mandat écrit, daté, nominatif et révocable. Sans mandat, la plateforme n'émet rien. | Une préparation automatique dès que l'association cochait « reçus actifs ». L'amende de l'art. 1740 A du CGI — 60 % des sommes portées sur un reçu irrégulier — pèse sur l'association, et un mandat implicite ne se plaide pas. |
| 22/08/2026 | Aucune annonce de don sans IBAN renseigné, contrôle mod-97 compris. | Une demande d'argent à laquelle personne ne pouvait répondre. |
| 30/07/2026 | Dons via HelloAsso, formulaire hébergé sur Riseva, encaissement direct par l'association, reçu fiscal généré et envoyé par Riseva. | La décision du 29/07 qui passait par Stripe. Motif du changement : ne rien demander aux associations côté technique. |
| 30/07/2026 | Demande d'accès partenaire à l'API HelloAsso déposée. **Statut : sans réponse.** Aucun SIREN à cette date. | — |
| 30/07/2026 | L'argent des dons ne transite jamais par Riseva. | — |

## Confiance, preuve et ergonomie

| Date | Décision | Remplace |
|---|---|---|
| 21/08/2026 | Signalement de contenu sur chaque annonce, écran de modération, décision motivée obligatoire. | Rien. Riseva héberge des contenus de tiers : l'article 16 du règlement sur les services numériques s'applique quelle que soit sa taille. |
| 21/08/2026 | Un don personnel n'est jamais nominatif côté employeur, les points affichés sont ceux des missions, les agrégats de dons demandent cinq donateurs. | Un affichage qui laissait déduire la cause soutenue par un salarié, donc parfois sa conviction ou son état de santé. |
| 21/08/2026 | Base légale : intérêt légitime, pas consentement. L'accord mission par mission répond au code du travail. | Un consentement invoqué dans une relation employeur-salarié structurellement déséquilibrée. |
| 21/08/2026 | Suspendre l'accès et retirer définitivement deviennent deux actions distinctes. | Une seule action irréversible pour deux besoins différents. |
| 21/08/2026 | La jauge brut / écrêté / retenu remplace la courbe décorative comme signature graphique. | Deux courbes sans échelle ni légende, qui ne permettaient ni audit ni décision. |
| 21/08/2026 | Un seul taux de participation dans tout le produit, celui du protocole de mesure. | Trois définitions concurrentes sur trois écrans. |
| 21/08/2026 | Dossier de preuve exportable, chaque chiffre avec sa méthode. | Un rapport qui affirmait sans montrer d'où venaient les chiffres. |
| 21/08/2026 | Prix, acompte et durée d'engagement à taille normale sous le bouton d'accueil. | Une note en petit sous la ligne de flottaison. |

## Automatisation et décompte

| Date | Décision | Remplace |
|---|---|---|
| 22/08/2026 | Les rapports partent tout seuls vers l'administrateur de l'entreprise dès la clôture de leur période, une fois et une seule — l'unicité est tenue par un index sur la clé, pas par un `if`. | Des rapports « générés automatiquement » qui restaient dans la base. Générer sans envoyer ne sert à personne, et un rapport reçu deux fois coûte la confiance dans tout le reste. |
| 22/08/2026 | La tâche d'envoi désigne un profil, jamais une adresse : elle ne lit pas `auth.users`. C'est la fonction Edge, qui détient la clé de service, qui résout l'adresse et l'inscrit. | Une tâche planifiée qui lisait la table des comptes pour composer un courriel — un privilège gagné pour un confort. |
| 22/08/2026 | Quatre envois d'affiches par saison, suivis par entreprise, avec numéro de suivi. La réception est confirmée par le client, jamais par Riseva. | Un calendrier tenu à la main. Sans trace, un client qui dit « on n'a rien reçu » a toujours raison ; et un suivi où l'expéditeur se déclare à lui-même que le colis est arrivé ne vaut rien. |
| 22/08/2026 | `administrateurs()` traite l'absence de `actif` comme actif : c'est `false` qui retire un compte. | Un filtre strict qui renvoyait une liste vide pour l'entreprise de démonstration — donc aucun destinataire pour ses rapports, et aucun garde-fou sur le dernier administrateur. |
| 22/08/2026 | Registre des événements de sécurité : le site déclare au fil de l'eau, les quatre indicateurs de sécurité de la période s'en déduisent et remontent seuls au siège. Activer le registre est une décision par site ; une fois activé, les champs correspondants sont verrouillés dans la campagne. | Une saisie de fin de période, recopiée d'un tableau tenu à part par chaque site. C'était la seule cause sérieuse de divergence entre le chiffre d'un site et celui du siège. |
| 22/08/2026 | Plan d'actions correctives adossé au registre, responsable et échéance obligatoires. | Rien. C'est la première question posée après un accident : qu'avez-vous fait ensuite. |
| 22/08/2026 | Pas de contrainte `CHECK (date <= current_date)`, bien que PostgreSQL l'accepte : le refus d'une date future est dans la RPC. | Une contrainte qui devient fausse en vieillissant, et qui aurait fait échouer une restauration de sauvegarde sur des lignes valides le jour où elles ont été écrites. |
| 22/08/2026 | Au-delà de 30 % de variation sur un indicateur calculé, la saisie demande une phrase d'explication, qui suit la valeur jusque dans le rapport. | Une saisie qu'on acceptait telle quelle. Un événement réel et une erreur de saisie se ressemblent exactement dans une base, et la seconde est la plus fréquente. |
| 22/08/2026 | Chaque campagne produit son dictionnaire des données : définitions, inclusions, exclusions, formules, agrégation, limites, explications des sites. Daté et versionné avec la campagne. | Des chiffres sans la pièce qui dit comment ils ont été obtenus. Un acheteur ne peut alors ni contester ni vérifier — seulement croire, ce qu'il refuse de faire. |
| 22/08/2026 | Une valeur absente reste absente dans les calculs, des deux côtés. | Un `coalesce(x, 0)` côté Postgres, qui transformait « ce site n'a pas déclaré ses entrées » en « ce site n'a eu aucune entrée » et déclenchait une alerte d'écart sur une donnée manquante. |
| 22/08/2026 | Quatre fenêtres modales appelaient `modal()` avec `{texte, action}` alors que l'interface attend `{label, onClick}` : leurs boutons s'affichaient sans libellé et ne faisaient rien. Corrigées, et elles restent ouvertes en cas d'erreur. | Un référent qu'on ne pouvait pas nommer, des indicateurs qu'on ne pouvait pas saisir, un salarié qu'on ne pouvait pas réaffecter, un matériel qu'on ne pouvait pas valoriser. |
| 21/08/2026 | Les annonces portent une unité de réalisation à catalogue fermé et un rendement par unité. Les totaux se cumulent seuls partout. | Rien. C'est ce qui rend le rapport annuel concret : « 280 arbres plantés » plutôt que « 12 480 points ». |
| 21/08/2026 | Le chiffre déclaré par l'association au moment de valider l'emporte sur l'estimation de l'annonce. | Une estimation figée, qui aurait fini par mentir. |
| 21/08/2026 | Les réalisations ne sont jamais appelées « impact » et portent toujours leur provenance. | — |
| 21/08/2026 | Quatre tâches planifiées côté base : validation sans retour, fraîcheur, rapports, classement. Journal auditable de chaque passage. | Des règles qui ne s'appliquaient qu'à l'ouverture d'une page. |
| 21/08/2026 | Tout ce qui est fait est enregistré automatiquement et retrouvé au retour, avec une remise à zéro offerte. | Un état perdu à chaque rechargement, qui faisait « démo » et non « produit ». |

## Fiscalité et conformité

| Date | Décision | Remplace |
|---|---|---|
| 22/08/2026 | Une association ne fournit qu'un numéro : le registre public remplit sa fiche. Chaque contrôle est daté, conserve la réponse brute du registre et vaut un an. | Une validation à cinq cases cochées de bonne foi, dont la première — « existence juridique confirmée » — était la seule qu'une machine pouvait vérifier mieux qu'un humain pressé. |
| 22/08/2026 | Le verdict du contrôle est recalculé côté base à partir de la fiche brute, jamais reçu du navigateur. Les deux moteurs partagent la même mesure : mots utiles, sans forme juridique, recouvrement de Jaccard. | Un état envoyé par le client, qu'il suffisait de forger pour mettre en ligne n'importe quelle structure. |
| 22/08/2026 | La clé de Luhn d'un SIREN et d'un SIRET est vérifiée en base, par contrainte. Exception La Poste comprise. | Un contrôle de forme au regex seul, qui laissait entrer des numéros impossibles — recopiés ensuite sur une facture ou un reçu fiscal. |
| 22/08/2026 | Un contrôle « introuvable » ne sanctionne pas. Dix à quinze pour cent des associations déclarées ont un SIREN ; l'absence de résultat ne veut rien dire. | Rien : c'est la garde-fou posée en même temps que la fonctionnalité. |
| 21/08/2026 | Les dons personnels des salariés sortent de l'assiette de l'entreprise et sont comptés à part, avec leur propre réduction à 66 % à l'IR. | Une assiette qui additionnait dons des salariés et mécénat de compétences. C'était une réduction d'impôt indue que le client aurait déclarée de bonne foi. Erreur relevée à la relecture externe du 21/08. |
| 21/08/2026 | Le plafond par salarié est présenté avec sa règle et son incertitude : le BOFiP ne dit pas si le plafond de L. 241-3 est mensuel ou annuel. Lecture basse retenue, valeur paramétrable. | Un chiffre affirmé sans réserve. |
| 21/08/2026 | Le décile n'est affiché qu'au-dessus de dix entreprises dans la catégorie. En dessous, le rang est donné tel quel. | « Top 10 % » sur une cohorte de deux, indéfendable devant un acheteur. |
| 21/08/2026 | Le tableau de bord dit « points retenus au classement, sur X réalisés, Y écrêtés ». | « Points de la saison », qu'on pouvait lire comme le total avant écrêtage. |
| 20/08/2026 | Le reçu fiscal est émis par l'association, Riseva le prépare et l'envoie. Sans signataire, qualité, éligibilité déclarée et numérotation, la plateforme n'émet rien. | « Riseva génère et envoie le reçu fiscal au nom de l'association. » Formulation juridiquement fausse : seul l'organisme bénéficiaire peut délivrer un reçu, et il porte seul la responsabilité (art. 1740 A du CGI). Corrigée sur tout le site. |
| 20/08/2026 | Riseva fournit à l'association le récapitulatif de sa déclaration annuelle des dons, obligatoire depuis 2021. | Rien, c'est un ajout. |
| 20/08/2026 | Distinction entre mission sur le temps de travail (mécénat de compétences, déductible) et sur le temps personnel (bénévolat, non déductible). Portée par l'annonce. | Un format de bénévolat unique, qui aurait laissé croire que tout est valorisable. |
| 20/08/2026 | Écran Mécénat côté entreprise : assiette, plafonds, report, réduction estimée à 60 %. Valeurs fiscales regroupées dans un objet paramétrable, jamais codées en dur. | Rien. C'est l'argument qui justifie économiquement l'abonnement. |

## Technique

| Date | Décision | Remplace |
|---|---|---|
| 20/08/2026 | Front sans étape de compilation : HTML, CSS et modules ES natifs. Déployable tel quel sur Vercel ou Netlify. | Un projet Next.js, écarté parce qu'il impose une chaîne de build pour un gain nul à ce stade. |
| 20/08/2026 | Le calcul des points vit dans Postgres (fonction `points_pour` + trigger), jamais dans le client. | — |
| 20/08/2026 | Sécurité par RLS sur toutes les tables. Le client n'a que les droits accordés par une politique. | — |
| 30/07/2026 | Base et authentification sur Supabase. | — |
| 30/07/2026 | Plateforme de type SaaS, développée avec Claude Code, estimation de deux mois. | — |
| 23/07/2026 | Abandon de Bubble. | Bubble, retenu le 22/07 puis écarté le lendemain. |

## Design

| Date | Décision | Remplace |
|---|---|---|
| 22/08/2026 | Le site vitrine est écrit sur les jetons de l'application : une seule famille typographique (plus la monospace pour les numéros), l'échelle de titres du produit, les rayons 8/12/20, et le vert du logo à la place du lime pour tout ce qui doit se voir sur papier. | Quatre familles typographiques, un h1 à 101 px, des rayons de 2 à 5 px, du lime à 1,1:1 employé comme trait, et un curseur dessiné en JavaScript. Motif : « c'est moche et vieillot », et le site ne ressemblait pas au produit. |
| 22/08/2026 | Plus aucun texte sous douze pixels sur les pages publiques. | Des micro-libellés à 9 et 10,5 px en capitales monospace, lisibles à la loupe. |
| 20/08/2026 | Remise en service de la palette verrouillée le 29/07 : encre #131510, papier chaud #F2F0E9, verts forêt #0B2620/#0F3D30/#1F5C4A, lime #C9F24B en accent, mousse #DFE6D0, bleu eau #3D82AD. | Le blanc pur et le vert clair unique de la première version, qui manquaient de profondeur. |
| 20/08/2026 | Profondeur obtenue par empilement de surfaces, ombres teintées vert et grain sur les surfaces sombres. Aucun dégradé, aucun faux relief. | — Le brief de marque du 29/07 les interdit explicitement. |
| 20/08/2026 | La rivière comme signature visuelle : toute évolution dans le temps est dessinée en courbe lissée doublée d'un écho, reprise du monogramme. | Les graphiques en barres génériques. Barres conservées uniquement pour les comparaisons entre entreprises. |
| 20/08/2026 | Boutons en rectangle arrondi, pilule réservée aux badges. Rayons ramenés à 8 / 12 / 20. | La pilule systématique et cinq valeurs de rayon. Motif : relecture externe, le pattern est daté. |
| 20/08/2026 | Neutres beaucoup moins teintés de vert. | Des neutres visiblement verts, jugés « éco attendu » à la relecture. |
| 20/08/2026 | Barre latérale allégée : 236 px, fond moins noir, état actif marqué par un filet vert. Le principe de la barre sombre est conservé. | La relecture externe recommandait de l'abandonner. Refusé : direction validée par le fondateur le 31/07. |
| 20/08/2026 | Bouton principal en encre noire, vert réservé aux accents et à la donnée. | Le vert en aplat sur les boutons, cause principale de l'effet daté. |
| 20/08/2026 | Design system figé dans `DESIGN.md` et `tokens.css`. On ne rediscute plus les valeurs page par page. | Six itérations rejetées entre le 28 et le 31/07. |
| 21/08/2026 | Rien n'est accordé par défaut côté base : `03_rls.sql` commence par retirer tous les droits sur les tables, les fonctions et les séquences, puis rend colonne par colonne et fonction par fonction. Un objet oublié est muet, jamais ouvert. | Des policies écrites par-dessus les droits CRUD que Supabase accorde d'office. Motif : audit externe, quatre blocages exploitables. |
| 21/08/2026 | Ce qui décide d'un droit — rôle, entreprise, association, activité — sort de `profil` et vit dans `private.appartenance`, hors API. | Un `UPDATE` sur `profil` sans `WITH CHECK` : n'importe qui pouvait se nommer administrateur Riseva. |
| 21/08/2026 | Aucune écriture métier directe : trois RPC pour les missions, une pour rejoindre une entreprise, une pour publier une annonce. Elles fixent serveur-side l'auteur, l'entreprise, les points, l'état et les dates. | Des policies `INSERT`/`UPDATE` sur `mission`, qui laissaient un salarié s'attribuer un état validé et ses propres points. |
| 21/08/2026 | Le plafond par format porte sur le total RETENU : `min(v, brut − v)`. | `min(v, brut / 2)`, qui laissait passer un score où un format pesait 82 %. |
| 21/08/2026 | Confirmé et estimé ne sont plus additionnés. Une validation automatique donne des points, jamais une réalisation confirmée ; l'interface dit combien de missions sont dans ce cas. | Un chiffre estimé présenté comme un résultat. |
| 21/08/2026 | Plus aucun compteur dénormalisé : `entreprise.points`, `profil.points`, les douze semaines et les quatre trimestres sont dérivés des missions à chaque lecture. | Des totaux figés, et des courbes écrites à la main qui montaient joliment sans rien dire. |
| 21/08/2026 | Le contraste est mesuré, pas discuté : `scripts/contraste.py` compare chaque texte affiché à son fond réel sur douze pages. `--ink-400` redescendu à #62675B, quatre couleurs de texte d'état ajoutées, bloc d'appel de l'accueil corrigé (il écrivait en gris foncé sur fond forêt, 1,9:1). | L'appréciation à l'œil. |
| 21/08/2026 | Une seule phrase pour les quatorze jours, identique sur les quatre surfaces : « clôturée automatiquement sans confirmation ». Un silence n'est pas une faute et n'entraîne aucune suspension ; seule une confirmation volontairement fausse peut l'être. | Trois formulations contradictoires — « les points ne sont crédités qu'après votre réponse », « comptée comme réalisée », « une mission validée qui n'a pas eu lieu peut entraîner une suspension ». Motif : audit du parcours association. |
| 21/08/2026 | `PAIEMENT.ouvert = false` : tant que le circuit de paiement n'existe pas, la fiche publique n'affiche ni bouton, ni « paiement sécurisé », ni promesse de reçu automatique. Un encart « Aperçu » explique pourquoi. | Un formulaire de don actif sur une page publique alors que l'accès partenaire n'est pas obtenu. |
| 21/08/2026 | La charte s'ouvre sur « Vos cinq engagements / Nos cinq engagements », la suspension passe après les droits, quinze jours pour corriger, suspension immédiate réservée à la fraude, au risque de sécurité et aux reçus gravement irréguliers. | Une charte qui commençait par la réputation et la fiscalité des entreprises et s'étendait sur la suspension. |
| 21/08/2026 | Un tableau de bord par rôle. Le salarié voit ses points, ses missions et les besoins proches ; l'association voit ce qu'elle doit confirmer, qui vient, ses annonces et ce qu'elle peut exporter. | Les trois rôles partageaient le tableau de bord de l'administrateur d'entreprise. |
| 21/08/2026 | Aucun consentement demandé à l'inscription d'un salarié : la base légale est l'intérêt légitime, et une case qu'on ne peut pas décocher sans perdre l'accès n'est pas un consentement libre. On informe avant l'entrée. | Une case « J'accepte que mon nom et mes actions soient visibles ». |
| 21/08/2026 | Un formulaire public qui affiche « envoyé » écrit vraiment en base ; sans base configurée, il ouvre le courriel pré-rempli et dit qu'il n'a rien envoyé. | Deux formulaires qui affichaient un accusé de réception sans rien transmettre. |
| 30/07/2026 | Logo reçu : monogramme R dans un carré, rivière, vert #6DBE45. | — |

## Encore ouvert

- Valeur définitive du barème, à recalibrer après la première saison.
- Prix exact dans la fourchette 3 500 à 4 000 €.
- Forme juridique. SASU évoquée le 30/07/2026, non actée, pas de SIREN.
- Financement des affiches et du merchandising.

## Le webhook `recu-fiscal` est supprimé, pas réparé

*24/08/2026.* Un audit croisé a trouvé, dans `supabase/functions/recu-fiscal/`,
une seconde chaîne d'émission de reçus fiscaux, parallèle à `emettre_recu` et
plus faible qu'elle sur trois points : elle ne vérifiait pas le **mandat écrit**
de l'association, elle attribuait le numéro d'ordre sans le verrou qui empêche
deux reçus de porter le même, et elle lisait des colonnes qui n'existent pas
dans le schéma (`recus_eligible`, `recus_signataire`, `recus_numero`). Elle
était donc à la fois cassée et dangereuse : cassée, elle ne produisait rien ;
réparée, elle aurait émis des reçus sans mandat.

Elle n'est pas réparée, elle est retirée, et la ligne de déploiement du README
avec elle. Il n'existe qu'un seul chemin d'émission : l'association, depuis son
espace, appelle `emettre_recu`, qui exige le don confirmé, l'association
bénéficiaire, le mandat écrit et la sérialisation du numéro. C'est elle qui
émet, c'est elle qui encourt l'amende de l'article 1740 A du CGI, et c'est
exactement pour cela qu'aucun automate ne doit pouvoir le faire à sa place.

La règle qui en sort, et qui vaut au-delà de ce cas : **une règle de droit ne
s'écrit qu'à un seul endroit.** Deux implémentations d'une même obligation, ce
n'est pas une redondance de sécurité, c'est la garantie que la plus faible des
deux finira par être celle qui tourne.

## Trois fonctions `SECURITY DEFINER` acceptaient n'importe quel identifiant

*24/08/2026.* Même audit. `adoption()`, `offre_par_site()` et `offre_locale()`
traversent la RLS par construction et prenaient l'entreprise ou le site en
paramètre sans jamais vérifier que l'appelant y avait droit. N'importe quel
compte connecté pouvait lire l'entonnoir d'adoption d'un concurrent, la liste de
ses établissements avec leurs effectifs, ou l'offre associative autour d'un site
dont il avait ramassé l'identifiant dans une mission.

`offre_locale()` est le cas le plus instructif : le commentaire annonçait qu'on
« rejouait la RLS ici parce que la fonction est SECURITY DEFINER », et le code
en dessous ne faisait qu'un second test d'existence, mot pour mot celui de la
ligne précédente. Le commentaire décrivait un garde que personne n'avait écrit,
et il a suffi à ce que trois relectures passent à côté.

Les trois portent désormais le même contrôle : `mon_entreprise()`,
`dans_mon_groupe()` ou `est_admin()`.

L'audit demandait une seconde correction, et elle a été **refusée** : renvoyer
`null` sous le plancher de cinq dans `adoption()`. Le plancher protège une
personne d'un tiers — le CSE qui lit un agrégat, le classement qui publie une
ligne, l'employeur qui verrait qui a donné de sa poche. Une fois le garde
ci-dessus posé, l'appelant d'`adoption()` est l'entreprise elle-même, qui a déjà
sous les yeux la liste nominative de « Nos missions ». Masquer « 1 engagé sur
3 » ne protégerait personne et rendrait l'écran aveugle pendant les semaines où
il sert justement à voir si le lancement prend. `lisible` reste un avis rendu à
l'écran. Un audit qui trouve un vrai trou n'a pas raison sur tout ce qu'il
propose autour.

## Une espace fine que personne n'avait écrite

*24/08/2026.* La recette « ce qui s'affiche doit pouvoir se taper » signalait
trois espaces fines insécables (U+202F) sur la page d'accueil et trois sur celle
des associations. Elles n'étaient dans aucun fichier : ni dans le générateur, ni
dans le HTML produit, ni dans les octets servis par le serveur. Un `curl` sur la
page rendait une espace ordinaire ; le navigateur, lui, en rendait une fine.

L'explication tient en une ligne de CSS, `white-space:nowrap`, posée sur les
gros chiffres du premier écran pour empêcher « 2 400 à 13 800 € » de se couper
en deux. Chrome rend alors l'espace comme insécable, et `document.body.innerText`
la restitue en U+202F. La recette avait donc raison, et personne ne pouvait la
satisfaire : le caractère fautif n'existait dans aucune source.

La règle qui en sort : **une insécable se décide mot par mot, dans le texte, pas
par une règle de style qui vaut pour tout un bloc.** On écrit `&nbsp;` là où la
coupure serait laide — c'est tapable, c'est visible dans la source, et c'est
retirable par celui qui le lit. Une propriété CSS qui produit un caractère
invisible qu'aucun auteur ne peut retirer est un piège, même quand elle rend le
bon résultat à l'écran.

## Le jour où la production ne s'ouvrait pour personne

*25/08/2026.* Trois audits croisés, menés en parallèle sur les inscriptions, les
invitations et l'authentification. Le verdict tenait en une phrase : **la
démonstration marchait, la production non**, et rien dans la recette ne pouvait
le dire, parce que la recette traverse le produit avec le moteur en mémoire.

Ce qui manquait, dans l'ordre de gravité :

**Le rôle n'était jamais transmis.** Le rôle d'une personne vit dans le schéma
privé et n'en sort pas — c'est correct. Mais rien ne le rendait au navigateur :
`chargerEtat` posait `role: null` sur chaque profil, le routeur cherchait
`ROUTES[null]`, et l'application ne s'ouvrait pour personne. La démonstration,
dont le jeu de données porte les rôles, marchait parfaitement. `mon_profil()`
répare cela, et ne rend que la ligne de l'appelant.

**Le lien d'inscription était un lien mort.** La base ne garde qu'une empreinte
du code ; elle expose l'`indice`, six caractères qui servent à reconnaître un
lien dans une liste et *à rien d'autre* — la RLS le dit explicitement. L'écran
en faisait le code du lien diffusé à tout l'effectif. `rejoindre_entreprise`
hache ce qu'on lui donne : six caractères ne correspondent à aucune empreinte.
La règle qui en sort : **une valeur que la base classe comme non-secrète ne peut
pas devenir le secret d'un écran.** Le code se montre une fois, au retour de la
fonction qui le crée, et l'écran dit qu'il ne se réaffichera pas.

**La porte d'entrée lisait une table qui lui était fermée.** `rejoindre.html`
résolvait le code en interrogeant `invitation`, réservée à l'administrateur : le
salarié recevait une table vide et lisait « Ce code n'existe pas ». Une fonction
dédiée, ouverte à qui n'est pas connecté, rend maintenant le strict nécessaire.

**Rien ne vidait la file des courriels.** La base rangeait chaque nuit ce qui
devait partir. Aucun ordonnanceur n'appelait la moindre fonction Edge — ni
`cron.schedule`, ni `vercel.json`, ni la procédure de mise en ligne. « Le rapport
part tout seul » était une phrase de page de vente. Et deux des trois files
n'avaient même pas de fonction pour les lire.

**Tout était figé au 20 août 2026.** Quatorze dates écrites en dur dans le
moteur, qui est le *même code* en démonstration et en production. La liste des
rapports d'un vrai client restait au deuxième trimestre pour toujours, et le
contrôle « un événement ne se déclare pas à une date future » aurait refusé,
dès le 21 août, toute déclaration portant la date du jour.

**Les rapports du moteur sortaient tous à zéro.** La tâche planifiée passait par
`points_entreprise`, qui porte une garde d'autorisation. Une tâche planifiée n'a
pas d'identité : la garde lui rendait zéro ligne. Aucune erreur, aucune trace,
des rapports vides chaque nuit. La règle : **une garde d'autorisation et un
calcul ne sont pas la même fonction.** Le calcul vit dans le schéma privé, la
garde dans la fonction publique qui l'appelle.

Deux règles générales sortent de cette journée. La première : **une couche qui
n'est traversée par aucun test n'est pas écrite, elle est espérée.** La seconde,
plus dure : **quand la démonstration et la production partagent le code mais pas
les données, chaque divergence de données est un défaut invisible.** Les deux
moteurs disaient le contraire l'un de l'autre sur le seul contrôle d'accès du
produit — les domaines de messagerie — et personne ne pouvait s'en apercevoir en
regardant l'écran.

## Un bouton qui se dérobe sous le doigt

*25/08/2026.* Le formulaire d'inscription des associations ne partait pas. Pas
d'erreur, pas de message : le clic ne produisait rien. La cause n'était pas dans
le formulaire mais trois lignes au-dessus : la ligne d'aide sous les champs
change de texte selon le champ survolé, et les textes n'ont pas la même
longueur. Au moment où l'on appuie sur le bouton, le champ perd le focus, l'aide
reprend son texte long, passe de une à quatre lignes, et **tout ce qui est en
dessous descend de soixante pixels** — dont le bouton. Entre l'appui et le
relâchement, il n'est plus là. Le navigateur ne compte pas de clic.

La tentation était de rendre la recette indulgente : faire défiler la page,
attendre, cliquer par programme. Cela aurait caché le défaut au lieu de le
corriger, et un vrai visiteur aurait continué à ne pas pouvoir s'inscrire. On
réserve donc la hauteur du plus long des messages d'aide, une fois pour toutes,
et la recette clique comme un visiteur clique.

La règle : **rien de ce qui se trouve au-dessus d'un bouton n'a le droit de
changer de hauteur pendant qu'on appuie dessus.**

## Quatre écrans qui écrivaient dans le vide

*25/08/2026.* L'écran « Paramètres » demande à l'entreprise son exercice
comptable, ses dons faits hors Riseva et son report antérieur. Ces quatre
champs commandent le plafond de mécénat de l'article 238 bis : sans eux, le
plafond ne se calcule pas et l'écran bascule sur une « estimation maximale ». Le
client les remplissait, cliquait « Enregistrer », lisait « Paramètres
enregistrés » — et les retrouvait vides au rechargement suivant. La RPC ne
prenait pas ces paramètres, la table n'avait pas ces colonnes, et le mappeur les
posait à `null` en dur avec un commentaire honnête qui disait « chantier
ouvert ». Le chantier ouvert, c'était **le plafond fiscal jamais appliqué chez
aucun client de production.** Même histoire pour le nom du référent Riseva, pour
l'adresse de contact d'une association — dont le bouton « Les contacter »
n'apparaissait sur aucune page réelle — et pour les cinq colonnes du registre
AGEC, qui revenaient bien de la base mais que le mappeur renommait sous le nez
de la fonction qui les lit.

La règle : **un champ qu'un écran demande doit avoir une colonne, une RPC qui la
prend et un mappeur qui la rend sous le même nom.** Trois maillons, et il suffit
qu'un manque pour que l'utilisateur écrive dans le vide en lisant « enregistré ».

Ce défaut-là ne se voit sur aucun écran, parce que la démonstration, elle, porte
toujours le champ. La recette compare donc désormais **les deux formes** : pour
chaque collection, tout champ présent sur un objet du jeu de démonstration doit
exister sur l'objet correspondant chargé depuis Postgres. Le test a trouvé neuf
divergences le jour où il a été écrit.

## Le contrat qu'on ne pouvait plus signer

*25/08/2026.* Un compte ouvert en libre-service démarre avec l'abonnement de
l'essai : dix places, zéro euro, aucune date de signature. Aucune fonction ne
savait relever ces places. Celle qui semblait faite pour ça crée une société et
un abonnement, et `abonnement` porte `unique (entreprise, saison)` : elle ne
pouvait donc pas convertir un compte existant. Une entreprise de six cents
personnes pouvait signer, payer, et rester à dix places pour toute la saison —
la seule issue étant de recréer la société en double, en abandonnant ses
salariés et ses missions.

La règle : **une limite qu'on pose doit avoir, écrite le même jour, la fonction
qui la lève.** Un plafond sans son geste de sortie n'est pas une protection,
c'est une impasse.

Et sa garde était morte elle aussi : `sieges_pris` prend un abonnement, on lui
passait une entreprise. Les deux sont des `uuid`, PostgreSQL ne dit rien, la
fonction rendait zéro, et le contrôle « on ne descend pas sous ce qui est déjà
occupé » ne s'est jamais déclenché. **Deux identifiants du même type sont deux
paramètres différents ; le typage ne les distingue pas, la relecture si.**

## « Retirer l'annonce » ne retirait rien

*25/08/2026.* L'écran de modération propose trois décisions, dont « Retirer
l'annonce ». La fonction écrivait la décision dans une colonne — et rien d'autre.
Aucune ligne du produit ne lisait cette colonne : l'annonce restait ouverte,
visible, offerte aux engagements. Tant que personne n'était prévenu, le défaut
dormait. Le jour où l'on a branché la notification que l'article 16 du règlement
sur les services numériques impose, il est devenu **un mensonge écrit, envoyé à
la personne la mieux placée pour le constater.**

La règle : **avant de notifier une décision, vérifier qu'elle a un effet.** Une
décision de modération qui ne modère rien est pire qu'une absence de décision.

## Le cahier des charges, et ce qu'il a trouvé

*25/08/2026.* Écrire le cahier des charges — 199 exigences numérotées, six critères de
réception — puis le soumettre au code a produit plus de défauts qu'aucun audit précédent. Pas
parce que le code était moins bon : parce qu'une exigence numérotée se vérifie, alors qu'une
intention se raconte.

Quatre défauts en sont sortis qui rendaient le produit **inutilisable en production**, et
qu'aucune recette ne pouvait voir puisqu'elles tournent toutes sur le jeu de démonstration :

1. **Aucune saisie d'indicateurs n'était enregistrable.** L'écran envoyait la valeur d'un champ,
   c'est-à-dire une chaîne ; la base n'accepte que des nombres. Toute la collecte — campagnes,
   approbation, écarts, rapport, dictionnaire — était inatteignable chez un vrai client.
2. **Le classement n'existait pas.** Le navigateur le dérivait des sociétés que la RLS le laisse
   lire : la sienne. La cohorte comptait une ligne, et l'écran annonçait « classement non
   publié » pour toujours. La fonction qui calcule le vrai classement existait depuis le premier
   jour et n'était appelée nulle part.
3. **Le chiffre d'affaires, le coût journalier moyen, le SIRET et l'adresse étaient lisibles par
   chaque salarié**, en une requête. Une policy protège les lignes, jamais les colonnes.
4. **Un lien CSE pouvait arracher un compte à un autre client.** Deux des trois portes d'entrée
   refusaient un compte déjà rattaché ; la troisième écrasait l'appartenance.

La règle qui en sort : **une exigence sans identifiant ne se vérifie pas.** Tant qu'une règle
vit dans une phrase au milieu d'un document, elle est vraie pour celui qui l'a écrite. Numérotée,
elle devient une question à laquelle le code répond oui ou non.

Et une seconde, plus dure : **le cahier suit le code quand c'est le cahier qui a tort.** Sept
formats d'annonce tournent depuis des mois, la spécification en promettait trois. On ne retire
pas quatre formats pour faire plaisir à un document : on corrige le document, et on date la
correction.
