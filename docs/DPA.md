# Accord de sous-traitance

Annexé au devis, signé avec le contrat. Article 28 du règlement général sur la protection des
données. Ce modèle est à faire relire par un juriste avant la première signature ; il est publié
parce qu'un acheteur préfère un document imparfait mais disponible à un document promis.

---

## 1. Qualification des flux

Une politique publique ne remplace ni le registre des traitements, ni les accords contractuels.
Chaque flux est qualifié séparément.

| Flux | Riseva est | Le client est |
|---|---|---|
| Comptes et activité des salariés du client | sous-traitant | responsable de traitement |
| Facturation et relation commerciale | responsable de traitement | — |
| Comptes des associations partenaires | responsable de traitement | — |
| Dons des particuliers vers une association | sous-traitant de l'association | — |
| Journal des accès et sécurité | sous-traitant | responsable de traitement |

Riseva n'est **jamais** responsable conjoint avec le client, et n'utilise jamais les données d'un
client pour son propre compte, y compris pour améliorer son service.

## 2. Objet, durée, nature et finalité

- **Objet** : mise à disposition de la plateforme Riseva.
- **Durée** : celle du contrat, plus les délais de conservation légaux.
- **Nature des opérations** : collecte, enregistrement, organisation, consultation, extraction,
  effacement.
- **Finalité** : permettre aux salariés du client de répondre à des annonces d'associations,
  comptabiliser les actions, produire les rapports.

## 3. Catégories de personnes et de données

| Personnes | Données |
|---|---|
| Salariés du client | Nom, prénom, adresse professionnelle, missions, points, dates |
| Administrateurs | Les mêmes, plus les événements du journal des accès |
| Référents du client | Nom, fonction, coordonnées professionnelles |

**Aucune donnée sensible** au sens de l'article 9. Aucune donnée de mineur. Aucun transfert hors
Union européenne dans le fonctionnement normal du service.

## 4. Obligations de Riseva

- Ne traiter que sur instruction documentée du client, sauf obligation légale, auquel cas le
  client en est informé avant, sauf interdiction.
- Garantir la confidentialité et former les personnes autorisées.
- Mettre en œuvre les mesures techniques et organisationnelles décrites en annexe.
- Aider le client à répondre aux demandes d'exercice de droits, sous trente jours.
- Aider le client pour les analyses d'impact et les consultations préalables.
- Notifier toute violation de données **sous 24 heures**, même si l'analyse n'est pas terminée.
- Supprimer ou restituer les données à la fin du contrat, au choix du client.
- Tenir un registre des traitements effectués pour le compte du client.
- Mettre à disposition tout ce qui est nécessaire pour démontrer le respect de l'article 28, et
  permettre les audits, y compris les inspections.

## 5. Sous-traitants ultérieurs

Autorisation générale, avec information préalable de **trente jours** avant tout ajout ou
remplacement, et droit d'objection motivé du client.

| Prestataire | Fonction | Hébergement |
|---|---|---|
| Supabase | Base de données et authentification | Union européenne |
| Vercel | Diffusion de l'application | Union européenne |
| Resend | Messages transactionnels | Union européenne |
| Prestataire de don | Encaissement pour le compte des associations | France |

La liste à jour est publiée sur `riseva.fr/confidentialite.html`, datée et versionnée.

## 6. Mesures techniques et organisationnelles

Décrites sur `riseva.fr/securite.html`, qui fait partie intégrante du présent accord. En résumé :
chiffrement en transit et au repos, connexion sans mot de passe par lien à usage unique,
cloisonnement par ligne dans la base, restriction du lien d'inscription aux domaines déclarés,
journal des accès non effaçable, sauvegardes chiffrées avec rétention de trente jours,
double facteur obligatoire pour les comptes d'administration Riseva.

## 7. Ce qui n'est pas en place

- Pas de certification ISO 27001 ni SOC 2.
- Pas encore de test d'intrusion externe. Prévu avant la deuxième saison, rapport de synthèse
  communicable.
- Pas d'authentification unique SAML à ce jour.

Le dire vaut mieux que de le laisser découvrir au questionnaire sécurité.

## 8. Sort des données

À la fin du contrat : accès en lecture pendant trente jours, export complet en CSV à tout moment,
puis suppression sur demande avec certificat, ou conservation limitée aux obligations légales
(dix ans pour la facturation, six ans pour les pièces liées aux dons).
