# Riseva

Plateforme RSE. Les entreprises s'abonnent pour une saison, leurs salariés répondent aux annonces
d'associations, chaque action rapporte des points, un classement les compare, et un rapport annuel
clôture l'année.

Trois documents font autorité, dans cet ordre :

0. `docs/DOSSIER-FOURNISSEUR.md` — ce qu'il faut avoir sous la main pour vendre.
1. `SPEC.md` — les règles produit figées.
2. `DECISIONS.md` — le journal daté des décisions et de ce qu'elles remplacent.
3. `DESIGN.md` — le design system et ses interdits.

Le code ne décide de rien. Si le code et ces documents divergent, c'est le code qui a tort.

## Ce qu'il y a dans le dépôt

```
public/                 le site et l'application, servis tels quels
  index.html            site vitrine
  inscription.html      préinscription entreprise
  associations.html     page destinée aux associations
  rejoindre.html        inscription d'un salarié depuis le lien de son entreprise
  asso.html             page publique d'une association, avec le don
  app/                  l'application (entreprise, salarié, association, administration)
    data.js             couche de données : démonstration en mémoire ou Supabase
    ui.js               briques d'interface et icônes
    app.js              routeur et vues
  styles/               tokens, base, composants, marketing, application
  brand/                le logo et ses variantes
supabase/
  01_schema.sql         tables, types, vue matérialisée du classement
  02_logique.sql        calcul des points, triggers, validation automatique
  03_rls.sql            politiques de sécurité ligne à ligne
  04_seed.sql           saison et barème de départ
  functions/            fonctions Edge : validation, rapports, reçus fiscaux
  404.html              page d'erreur
supabase/emails/        gabarits des messages transactionnels
docs/DOSSIER-FOURNISSEUR.md   ce qu'un acheteur demande, et où le trouver
docs/modeles/           convention de mécénat de compétences, feuille d'émargement
scripts/shots.py        captures d'écran automatiques (Playwright)
scripts/tests.py        tests de bout en bout (49 vérifications)
```

## Faire tourner en local

Aucune dépendance, aucune installation.

```bash
python3 -m http.server 8080 --directory public
# puis http://localhost:8080
```

L'application démarre sur un jeu de démonstration en mémoire. L'écran de connexion propose
les quatre espaces (entreprise, salarié, association, administration).

## Vérifier que tout marche

```bash
python3 scripts/tests.py
```

Le script lance un serveur, ouvre Chromium et parcourt les vrais écrans : toutes les vues de
tous les rôles, le parcours d'une mission de bout en bout, le quota de places, l'anonymisation
d'un départ, le lien d'inscription, la publication d'une annonce, les réglages de saison.
Il sort en erreur au premier échec.

## Brancher Supabase

1. Créer un projet Supabase.
2. Exécuter dans l'ordre `01_schema.sql`, `02_logique.sql`, `03_rls.sql`, `04_seed.sql`.
3. Copier `public/app/config.example.js` en `public/app/config.js` et y mettre l'URL du projet
   et la clé anonyme.
4. Déployer les fonctions Edge : `supabase functions deploy demande-validation valider-mission rapport recu-fiscal`.
5. Planifier `valider_missions_sans_reponse()` une fois par jour et `rafraichir_classement()`
   chaque lundi.

La clé anonyme est publique par nature : c'est RLS qui protège les données, jamais le secret
de la clé. La clé `service_role` ne doit exister que dans les variables d'environnement des
fonctions Edge, jamais dans `public/`.

## Déployer

Le dossier `public/` est un site statique. Sur Vercel : répertoire racine `public`, aucune
commande de build. Brancher ensuite `riseva.fr` sur le projet.

## Ce qui n'est pas encore branché

- Le paiement des dons attend l'accès partenaire HelloAsso. En attendant, le bouton affiche
  un message explicite plutôt que de simuler une transaction.
- L'envoi des mails attend une clé Resend. Sans elle, les fonctions journalisent au lieu d'envoyer.
- L'export PDF des rapports passe par l'impression du navigateur.
