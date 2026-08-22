# Riseva — journal des décisions

Une ligne par décision, avec sa date et ce qu'elle remplace. C'est ce fichier qui fait autorité,
pas les conversations. Toute nouvelle décision s'ajoute en haut de la section correspondante.

## Produit

| Date | Décision | Remplace |
|---|---|---|
| 22/08/2026 | Seule la moitié haute du classement est nommée, avec trois réglages dont le défaut protège, et l'identifiant retiré en même temps que le nom — dans la base comme à l'écran, et dans l'export. | Un classement nominatif de bout en bout. Il punissait ceux qui participent : ne pas s'inscrire était le choix rationnel d'un dirigeant qui doutait de son rang. |
| 22/08/2026 | Grille tarifaire par tranche d'effectif, de 2 400 à 18 500 € HT la saison, un à douze sites compris, 420 € par site supplémentaire. Affichée sur le site, lue par la vitrine dans le même fichier que celui qui facture. | Un prix unique de 3 500 à 4 000 €, qui demandait la même chose à quarante personnes qu'à mille cinq cents. Repères de marché relevés en août 2026 : 5 000 à 50 000 €/an sur le segment RSE français, 3 000 à 12 000 € pour les outils qui visent les PME. Riseva se place en dessous. |
| 22/08/2026 | Tarif fondateur : −10 % sur la première saison pour les vingt premières entreprises signataires, jusqu'au 31/12/2026, puis gel du tarif pour la deuxième saison. Le plafond est tenu par un trigger, pas par l'interface. | Rien. Une remise sans limite de nombre ni de date n'est pas une remise, c'est le prix. |
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
