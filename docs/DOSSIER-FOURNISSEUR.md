# Dossier fournisseur

Ce qu'un acheteur demande avant de signer, et où le trouver. L'ordre compte : un document
promis pour plus tard vaut moins qu'un document imparfait mais disponible tout de suite.

## Ce qui est publié en ligne, donc consultable sans nous le demander

| Sujet | Où |
|---|---|
| Règles de la saison, calcul du score, litiges | [riseva.fr/reglement.html](https://riseva.fr/reglement.html) |
| Sélection et suivi des associations | [riseva.fr/charte-associations.html](https://riseva.fr/charte-associations.html) |
| Sécurité, hébergement, incident | [riseva.fr/securite.html](https://riseva.fr/securite.html) |
| Données personnelles, sous-traitants, durées | [riseva.fr/confidentialite.html](https://riseva.fr/confidentialite.html) |
| Disponibilité, support, réversibilité | [riseva.fr/engagements.html](https://riseva.fr/engagements.html) |
| Conditions de vente | [riseva.fr/cgv.html](https://riseva.fr/cgv.html) |
| Conditions d'utilisation | [riseva.fr/cgu.html](https://riseva.fr/cgu.html) |

## Ce qui est fourni avec le devis

- [ ] Devis nominatif : périmètre, nombre de places, prix ferme, échéances, durée
- [ ] Accord de sous-traitance (article 28 du RGPD), annexé au devis
- [ ] Extrait RNE ou Kbis, RIB au même nom
- [ ] Attestation de responsabilité civile professionnelle
- [ ] Attestation de vigilance URSSAF
- [ ] Modèle de convention de mécénat de compétences et feuille d'émargement
      (`docs/modeles/`)
- [ ] Rapport annuel de démonstration, avec données exportables

## Ce qui est fourni sur demande

- [ ] Note d'architecture technique
- [ ] Matrice des rôles et des accès
- [ ] Résumé du plan de tests et son dernier résultat
- [ ] Historique des sauvegardes et du dernier test de restauration
- [ ] Procédure d'incident et de notification
- [ ] Certificat de suppression des données en fin de contrat

## Ce qui n'existe pas encore, et qu'il ne faut pas prétendre avoir

- Certification ISO 27001 ou SOC 2
- Rapport de test d'intrusion externe (prévu avant la deuxième saison)
- Authentification unique d'entreprise en SAML
- Références clients nommées, tant que les premiers pilotes n'ont pas donné leur accord écrit

Dire « pas encore, voici quand » passe. Laisser croire que c'est en place ne passe pas, et se
découvre au premier questionnaire sécurité.

## Les questions qui reviennent, et la réponse courte

**« Qui héberge, et où ? »**
Base de données et application dans l'Union européenne. Liste datée des sous-traitants sur la
page Données personnelles. Aucun transfert hors UE en fonctionnement normal.

**« Que se passe-t-il si on arrête ? »**
Export complet en CSV à tout moment depuis l'espace client. Trente jours d'accès en lecture
après la fin du contrat. Suppression sur demande avec certificat.

**« Vous garantissez la réduction d'impôt ? »**
Non. Nous calculons une estimation à partir de ce qui s'est passé sur la plateforme et du coût
journalier que vous renseignez. Votre expert-comptable arrête les chiffres. L'éligibilité de
chaque association relève d'elle seule.

**« Le classement, il est calculé comment ? »**
Points par salarié, par catégorie de taille, plafond de 50 % par format. Le règlement est
public, avec un exemple chiffré. Vous exportez vos missions et vous refaites l'addition.

**« Et si un salarié part ? »**
Son compte est anonymisé, y compris dans l'historique. Les points restent à l'entreprise,
la place est rendue immédiatement.

**« Qui peut créer un compte avec le lien ? »**
Seules les adresses des domaines que vous déclarez. Le lien est révocable et régénérable à
tout moment, et tout est tracé dans un journal que vous exportez.
