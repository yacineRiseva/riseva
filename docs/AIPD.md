# Analyse d'impact relative à la protection des données

Trois critères de la liste CNIL sont réunis : **évaluation ou notation** de personnes,
**personnes vulnérables** (des salariés, dans une relation déséquilibrée avec leur employeur) et
**risque d'inférence de données sensibles**. Deux suffisent à rendre l'analyse obligatoire. Elle
est donc conduite, et ce document en est la trace.

Version du 21 août 2026. À réexaminer à chaque changement de finalité, et au moins une fois par
saison.

---

## 1. Description du traitement

**Finalité.** Permettre aux salariés d'une entreprise abonnée de répondre à des annonces
d'associations, comptabiliser les actions réalisées, produire les rapports de l'entreprise.

**Personnes concernées.** Salariés de l'entreprise cliente, administrateurs, référents des
associations, donateurs particuliers.

**Données.** Identité professionnelle, missions engagées et réalisées, points, dates, journal des
accès. Facturation pour l'entreprise. Montant et bénéficiaire pour les dons.

**Durées.** Compte : durée de l'abonnement, puis anonymisation. Activité : abonnement plus un an.
Dons : six ans, obligation comptable. Journal des accès : douze mois. Facturation : dix ans.

## 2. Qui est responsable de quoi

| Flux | Riseva | Le client |
|---|---|---|
| Comptes et missions des salariés | sous-traitant | responsable |
| Facturation, sécurité de Riseva, prospection | responsable | — |
| Comptes des associations | responsable | — |
| Reçus et relation aux donateurs | sous-traitant de l'association | — |
| **Classement interentreprises, comparaison et modération** | **responsable autonome** | — |

Ce dernier point mérite d'être dit clairement : Riseva fixe seule le barème, les règles de
classement et les décisions de modération. Sur ce flux, elle détermine les finalités et les
moyens, elle est donc responsable de traitement, pas sous-traitant.

## 3. Base légale

| Traitement | Base |
|---|---|
| Comptes et missions | Intérêt légitime de l'employeur (article 6.1.f), programme volontaire, opposition possible sans conséquence |
| Missions sur le temps de travail | Accord exprès du salarié exigé par le **droit du travail** (R. 8241-2) |
| Facturation | Obligation légale |
| Dons | Exécution du contrat entre le donateur et l'association |

**Le consentement n'est pas retenu comme base RGPD** dans la relation employeur-salarié : elle est
structurellement déséquilibrée, et un consentement qu'on ne peut pas refuser librement n'en est
pas un. L'accord mission par mission demandé par la plateforme répond à une exigence du code du
travail, pas à l'article 6 du RGPD. Confondre les deux serait commode et faux.

## 4. Risques identifiés, et ce qui est fait

### Risque 1 — Inférence de données sensibles par le choix de l'association
**Gravité : élevée.** La cause d'une association peut révéler une opinion politique, une conviction
religieuse, un état de santé ou une appartenance syndicale.

Mesures en place :
- Un don personnel **n'est jamais nominatif** dans les écrans de l'employeur : ni le nom, ni le
  montant, ni l'association.
- Les points affichés dans l'espace Équipe sont ceux **des missions uniquement**.
- Les agrégats de dons ne s'affichent qu'à partir de **cinq donateurs**. En dessous, rien : un
  total et un effectif suffisent à remonter aux personnes.
- Le classement interne à l'entreprise ne sort jamais de l'entreprise.

*Risque résiduel : faible.* Une mission de bénévolat reste visible avec son association. Elle est
choisie sur le temps de travail à l'initiative de l'employeur, ce qui la rend légitime, mais
l'entreprise doit éviter de bâtir des annonces autour de causes clivantes.

### Risque 2 — Détournement en outil d'évaluation professionnelle
**Gravité : élevée.** Un classement individuel visible par l'employeur peut servir à noter.

Mesures :
- Engagement écrit à porter au procès-verbal du CSE : les données ne servent ni à l'évaluation,
  ni à une décision de carrière, de rémunération ou de discipline. Trame fournie dans
  `INFORMATION-SALARIES.md`.
- Aucune donnée individuelle n'est exportée vers les outils RH du client.
- Le classement public est **collectif**, jamais individuel.
- Participation volontaire, refus sans conséquence, écrit noir sur blanc dans la note aux salariés.

*Risque résiduel : moyen.* Il dépend du comportement du client, pas de la plateforme. C'est
pourquoi l'engagement est contractuel.

### Risque 3 — Accès non autorisé par un lien d'inscription qui fuite
**Gravité : moyenne.**

Mesures : restriction aux domaines de messagerie déclarés, plafond de places, révocation et
régénération immédiates, journal des accès non effaçable, connexion par lien à usage unique
valable une heure.

*Risque résiduel : faible.*

### Risque 4 — Persistance des données après le départ d'un salarié
**Gravité : moyenne.**

Mesures : anonymisation irréversible, y compris dans l'historique des missions ; identité
neutralisée aussi dans la table d'authentification ; place rendue immédiatement ; opération tracée.

*Risque résiduel : faible.*

### Risque 5 — Violation de données chez un sous-traitant
**Gravité : élevée.**

Mesures : sous-traitants tous dans l'Union européenne, liste datée et publique, préavis de trente
jours avant tout ajout, mêmes obligations imposées en aval, notification au client sous 24 heures.

*Risque résiduel : moyen.* Il ne peut pas être ramené à faible sans certification, qui n'existe
pas encore. C'est dit tel quel dans le dossier fournisseur.

## 5. Consultation

- Les salariés sont informés avant toute collecte, par la note fournie au client.
- Le comité social et économique est consulté par le client avant le déploiement.
- Aucun délégué à la protection des données n'est désigné à ce stade : Riseva n'effectue ni suivi
  systématique à grande échelle, ni traitement de données sensibles à titre principal. La question
  sera réexaminée au-delà de vingt entreprises clientes.

## 6. Conclusion

Le traitement peut être mis en œuvre, sous réserve des mesures décrites, qui sont toutes en place
à la date de ce document. Les deux risques résiduels moyens tiennent au comportement du client et
à l'absence de certification : ils sont assumés et déclarés, pas dissimulés.
