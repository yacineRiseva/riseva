# Riseva - Spécification produit v1

Statut : figée le 20/08/2026. Toute modification passe par une entrée datée dans `DECISIONS.md`.

---

## 1. Ce qu'est Riseva

Plateforme SaaS B2B qui transforme l'engagement RSE d'une entreprise en un jeu collectif annuel.
L'entreprise s'abonne pour une **saison**. Ses salariés répondent à des **annonces** publiées par des
associations partenaires. Chaque action rapporte des **points**. Un **classement** compare les entreprises
entre elles. Des **trophées** sont remis chaque trimestre, un **rapport annuel** clôture la saison.

Les associations ne paient rien. Elles publient et valident. C'est leur seul travail.

## 2. Acteurs et rôles

| Rôle | Qui | Peut faire |
|---|---|---|
| `admin` | Riseva | Tout. Gère les saisons, valide les associations, ajuste le barème. |
| `entreprise_admin` | RH / RSE / dirigeant | Gère les salariés, voit les rapports, paie l'abonnement. |
| `salarie` | Employé de l'entreprise abonnée | Répond aux annonces, déclare ses missions, voit le classement. |
| `association` | Référent de l'asso | Publie des annonces, valide les missions réalisées. |

Un compte = un email. Un utilisateur appartient à une seule organisation (entreprise ou association).

## 2 bis. Comptes, places et départs

### Places
L'abonnement d'une entreprise ouvre un **nombre de places** égal à son effectif déclaré.
Un compte salarié occupe une place. La plateforme refuse toute création de compte au-delà.

### Inscription par lien
L'entreprise ne saisit aucune liste. À la création de son compte, elle reçoit **un lien unique**
contenant un code (`LAFARGE-7QK2`). Elle le diffuse comme elle veut : intranet, mail interne,
affiche. Chaque salarié crée son compte lui-même en trente secondes.

- Un seul lien actif à la fois par entreprise.
- Le lien porte son propre plafond de places, qui ne peut jamais dépasser celui de l'abonnement.
- Il expire au bout de 120 jours.
- L'entreprise peut le **révoquer** (plus aucune inscription) ou le **régénérer** (l'ancien meurt,
  un nouveau naît). Les comptes déjà créés ne sont jamais touchés.
- Une adresse email ne peut créer qu'un seul compte.

### Départ d'un salarié
Retirer un salarié ne supprime pas sa ligne : cela ferait disparaître des missions et des points
acquis à l'entreprise. On **vide son identité**, on garde la trace.

- Son nom devient « Salarié retiré 01 », son adresse est effacée, son compte est fermé.
- Il apparaît anonymisé partout, y compris dans l'historique des missions.
- Les points qu'il a rapportés **restent acquis à l'entreprise**.
- Sa **place est immédiatement rendue** à l'abonnement.
- L'opération est irréversible, et l'écran de confirmation le dit.

### Création de compte
- **Entreprise** : formulaire, puis le compte administrateur et le lien d'inscription sont créés
  dans la foulée.
- **Association** : formulaire, compte créé aussitôt mais fiche **non visible** tant que Riseva
  ne l'a pas validée.
- **Salarié** : uniquement par le lien de son entreprise. Aucune autre voie.

Aucun mot de passe ne transite par Riseva : l'authentification se fait par lien de connexion.

## 3. La saison

- Une saison dure **une année fiscale** (par défaut 1er janvier au 31 décembre, paramétrable par saison).
  Motif : faciliter le réabonnement et le rattachement budgétaire côté client.
- Quatre temps forts :
  1. **Ouverture** : l'entreprise découvre sa plateforme, les associations publient leurs premières annonces.
  2. **Action** : les missions se réalisent, le **classement est recalculé chaque semaine**.
  3. **Trimestre** : affiches, remise de trophées, rapport trimestriel allégé. Le **top 10 %** des entreprises
     est mis en avant à chaque trimestre.
  4. **Clôture** : remise finale et rapport annuel détaillé.
- Une saison a un état : `brouillon`, `ouverte`, `close`.

## 4. Les annonces

Publiées par une association. Trois types, et trois seulement en v1 :

| Type | Code | Points (v1) |
|---|---|---|
| Don financier | `don_financier` | 1 point par tranche de 10 € versés |
| Bénévolat demi-journée | `benevolat_demi_journee` | 150 points par demi-journée validée |
| Don de matériel | `don_materiel` | 100 points par don validé |

**Le barème est fixe et imposé par la plateforme.** L'association ne choisit pas la valeur de son annonce :
elle choisit le type, la quantité attendue et la description. Les points sont calculés automatiquement.
Décision du 30/07/2026, elle annule la version où les associations fixaient elles-mêmes les points.

Le barème v1 ci-dessus est **provisoire et révisable à la fin de la première saison**. Il est stocké en base
(table `bareme`) et versionné par saison, pas codé en dur, pour pouvoir être ajusté sans migration.

## 5. Le cycle d'une mission

1. L'association publie une annonce (état `ouverte`).
2. Un salarié se positionne. La mission passe en `engagee`.
3. Après réalisation, un mail automatique part vers l'association : « la mission a-t-elle bien été faite ? »
4. L'association valide ou refuse. Validée -> `validee`, les points sont crédités à l'entreprise.
   Refusée -> `refusee`, aucun point.
5. Sans réponse de l'association sous 14 jours, la mission passe en `validee_auto` et les points sont crédités.
   Motif : ne pas bloquer le client sur l'inaction d'un partenaire non payant.

Les points sont crédités à l'**entreprise**, et attribués nominativement au salarié pour son propre suivi.

## 6. L'argent

### Abonnement entreprise
- **Préinscription gratuite**, sans engagement, ouverte avant que la plateforme soit complète.
- **Finalisation** de l'inscription avec un **acompte de 500 €**, intégralement **remboursé si la saison
  ne démarre pas**. Décision du 30/07/2026.
- Prix de l'abonnement annuel v1 : **fourchette 3 500 à 4 000 € HT / an**, positionnement volontairement bas
  en tant que nouvel entrant. Le prix exact est un paramètre de saison, pas une constante.
- Interdit : promettre que le tarif restera identique pour les premières entreprises. Retiré le 29/07/2026,
  reconfirmé le 30/07/2026. Ne doit réapparaître nulle part.

### Dons aux associations
- Le formulaire de don est **hébergé sur Riseva** (widget partenaire HelloAsso intégré).
- L'argent **ne transite pas par Riseva**. Il va directement à l'association.
- Le **reçu fiscal est généré et envoyé automatiquement** par Riseva au nom de l'association.
- Statut du partenariat HelloAsso : **demande d'accès API déposée le 30/07/2026, sans réponse à ce jour.**
  Tant qu'elle n'a pas abouti, le code passe par une couche `PaiementProvider` avec deux implémentations
  possibles (`helloasso`, `stripe`) et une implémentation `mock` pour le développement.

## 7. Les associations

- Gratuit pour elles, toujours.
- Aucune contrainte technique de leur côté : elles n'ont rien à installer, rien à brancher sur leur back-office.
  C'est la raison du choix HelloAsso plutôt qu'une intégration Stripe chez chaque asso (décision du 30/07/2026).
- **Aucune restriction territoriale.** Riseva ne s'engage pas sur une région donnée.
- Riseva **n'assure rien**. En cas d'incident pendant une mission de bénévolat, la responsabilité est
  entre l'entreprise et l'association. Ce point doit apparaître dans les CGU et sur la fiche mission.
- Recrutement des associations : à faire **après** la mise en ligne de la plateforme, pas avant.

## 8. Les rapports

Générés automatiquement à partir de la base, sans intervention manuelle.

- **Trimestriel** : allégé. Points du trimestre, rang, top actions, participation des salariés.
- **Annuel** : détaillé. Cumul de la saison, évolution trimestre par trimestre, nombre de salariés engagés,
  nombre de missions par type, montant total donné, et un **volet impact global du réseau** identique pour
  toutes les entreprises (ce que les associations du réseau ont accompli dans l'année).
- Format : consultable en ligne + export PDF.

## 9. Hors périmètre v1

Explicitement exclus, ne pas les construire :

- Application mobile native et site mobile dédié. Le responsive suffit.
- Boutique de merchandising (t-shirts, mugs, parapluies en matériaux recyclés co-brandés). Idée conservée,
  non décidée.
- Toute forme de tarif garanti à vie ou de statut « entreprise fondatrice » avec avantage tarifaire.

## 10. Points encore ouverts

À trancher avant la première saison réelle, tracés ici pour ne pas les oublier :

- Valeur exacte du barème après calibrage sur les premières entreprises.
- Prix final de l'abonnement dans la fourchette annoncée.
- Forme juridique (SASU évoquée le 30/07/2026, non actée). Pas de SIREN au 30/07/2026.
- Financement des affiches et du merchandising.
