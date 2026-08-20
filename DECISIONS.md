# Riseva — journal des décisions

Une ligne par décision, avec sa date et ce qu'elle remplace. C'est ce fichier qui fait autorité,
pas les conversations. Toute nouvelle décision s'ajoute en haut de la section correspondante.

## Produit

| Date | Décision | Remplace |
|---|---|---|
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

## Paiement

| Date | Décision | Remplace |
|---|---|---|
| 30/07/2026 | Dons via HelloAsso, formulaire hébergé sur Riseva, encaissement direct par l'association, reçu fiscal généré et envoyé par Riseva. | La décision du 29/07 qui passait par Stripe. Motif du changement : ne rien demander aux associations côté technique. |
| 30/07/2026 | Demande d'accès partenaire à l'API HelloAsso déposée. **Statut : sans réponse.** Aucun SIREN à cette date. | — |
| 30/07/2026 | L'argent des dons ne transite jamais par Riseva. | — |

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
| 20/08/2026 | La rivière comme signature visuelle : toute évolution dans le temps est dessinée en courbe lissée doublée d'un écho, reprise du monogramme. | Les graphiques en barres génériques. Barres conservées uniquement pour les comparaisons entre entreprises. |
| 20/08/2026 | Boutons en rectangle arrondi, pilule réservée aux badges. Rayons ramenés à 8 / 12 / 20. | La pilule systématique et cinq valeurs de rayon. Motif : relecture externe, le pattern est daté. |
| 20/08/2026 | Neutres beaucoup moins teintés de vert. | Des neutres visiblement verts, jugés « éco attendu » à la relecture. |
| 20/08/2026 | Barre latérale allégée : 236 px, fond moins noir, état actif marqué par un filet vert. Le principe de la barre sombre est conservé. | La relecture externe recommandait de l'abandonner. Refusé : direction validée par le fondateur le 31/07. |
| 20/08/2026 | Bouton principal en encre noire, vert réservé aux accents et à la donnée. | Le vert en aplat sur les boutons, cause principale de l'effet daté. |
| 20/08/2026 | Design system figé dans `DESIGN.md` et `tokens.css`. On ne rediscute plus les valeurs page par page. | Six itérations rejetées entre le 28 et le 31/07. |
| 30/07/2026 | Logo reçu : monogramme R dans un carré, rivière, vert #6DBE45. | — |

## Encore ouvert

- Valeur définitive du barème, à recalibrer après la première saison.
- Prix exact dans la fourchette 3 500 à 4 000 €.
- Forme juridique. SASU évoquée le 30/07/2026, non actée, pas de SIREN.
- Financement des affiches et du merchandising.
- Réponse de HelloAsso.
