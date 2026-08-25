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
  04_seed.sql           saison, barème et durées de conservation
  04b_demonstration.sql le jeu de démonstration, jamais en production
  functions/            fonctions Edge : validation, rapports, reçus fiscaux
  404.html              page d'erreur
supabase/05_taches.sql  ce qui tourne tout seul : validation auto, fraîcheur,
                        rapports, classement (pg_cron)
supabase/emails/        gabarits des messages transactionnels
docs/ANNUAIRE-PUBLIC.md ce qu'on demande au registre public, et ce qu'il ne prouve pas
docs/DON-VIREMENT.md    pourquoi Riseva n'encaisse pas, et comment le don fonctionne quand même
docs/DOSSIER-FOURNISSEUR.md   ce qu'un acheteur demande, et où le trouver
docs/DPA.md             accord de sous-traitance, article 28 du RGPD
docs/AIPD.md            analyse d'impact protection des données
docs/INFORMATION-SALARIES.md  note aux salariés et trame de consultation du CSE
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

## Les audits

Trois passes visuelles et une passe de code avec ChatGPT (5.6 Sol, effort maximum),
plus une passe sur le parcours association. Chaque retour est consigné avec, en fin
de document, ce qui a été corrigé et ce qui reste ouvert :

- `docs/AUDIT-CHATGPT-SECURITE.md` — verdict NO-GO production, quatre blocages
  exploitables. Tout le P0 corrigé.
- `docs/AUDIT-CHATGPT-VISUEL.md` et `-VISUEL-2.md` — jusqu'à « prête à être montrée
  à un client ».
- `docs/AUDIT-CHATGPT-ASSOCIATIONS.md` — le parcours que traverse une association.
- `docs/PROCEDURE-EFFACEMENT.md` — ce qui, dans l'effacement, ne peut pas s'écrire
  en code.

## Tout vérifier d'un coup

    python3 scripts/verifier.py

Quatre passes, dans l'ordre où elles comptent :

1. **Syntaxe** des trois modules.
2. **Base** — `scripts/sql.py` détruit puis recrée une base vide, rejoue `00 → 05`
   et exécute `supabase/tests.sql` : une cinquantaine d'assertions qui disent ce
   qu'un visiteur, un salarié et une association peuvent et ne peuvent pas faire.
   Une installation à blanc qui échoue échoue ici, pas chez le client.
3. **Parcours** — `scripts/tests.py` ouvre Chromium et traverse les vrais écrans :
   toutes les vues de tous les rôles, une mission de bout en bout, le quota de
   places, le départ d'un salarié, le lien d'inscription, la suspension d'un accès.
4. **Contraste** — `scripts/contraste.py` mesure le rapport de contraste réel de
   chaque texte affiché sur douze pages, couleur héritée et fond effectif compris,
   et le compare au seuil WCAG AA. Pas d'échantillon, pas de maquette : ce que le
   navigateur dessine.

Le fichier `supabase/00_local.sql` recrée en local le peu de Supabase dont les
migrations dépendent — schéma `auth`, `auth.users`, `auth.uid()`, les rôles
`anon` / `authenticated` / `service_role`. Il n'est jamais déployé.

## Brancher Supabase

1. Créer un projet Supabase.
2. Exécuter dans l'ordre `01_schema.sql`, `02_logique.sql`, `03_rls.sql`, `04_seed.sql`,
   `05_taches.sql`, `06_catalogue.sql`, `07_ecritures.sql`. **Ne pas exécuter
   `04b_demonstration.sql`** : il pose une entreprise et des associations
   inventées, et une base de production doit s'ouvrir vide. L'ordre n'est pas indicatif : `03` retire tous les droits par
   défaut avant d'en rendre nommément, et `05` reprend la propriété des fonctions.
3. Copier `public/app/config.example.js` en `public/app/config.js` et y mettre l'URL du projet
   et la clé anonyme.
4. Figer la bibliothèque cliente : `./scripts/figer-dependance.sh`. Elle atterrit
   dans `public/app/vendor/`, avec son empreinte. Sans ce fichier, l'application
   refuse de démarrer sur le domaine de production plutôt que d'importer du code
   tiers modifiable à l'exécution.
5. Déployer les fonctions Edge : `supabase functions deploy demande-validation valider-mission rapport paiement helloasso effacement`.
6. La fonction `paiement` reste déployée pour le jour où un prestataire agréé entrerait
   dans le circuit, mais elle n'est branchée sur rien : les dons arrivent par virement
   direct, et c'est l'association qui confirme la réception (`confirmer_don_recu`).
   Riseva n'encaisse pas — voir `docs/DON-VIREMENT.md`.
7. `05_taches.sql` planifie déjà `private.moteur()` chaque nuit via pg_cron :
   validation automatique, fermeture des annonces, rapports, purges.

La clé anonyme est publique par nature : c'est RLS qui protège les données, jamais le secret
de la clé. La clé `service_role` ne doit exister que dans les variables d'environnement des
fonctions Edge, jamais dans `public/`.

## Déployer

Le dossier `public/` est un site statique. Sur Vercel : répertoire racine `public`, aucune
commande de build. Brancher ensuite `riseva.fr` sur le projet.

## Ce qui n'est pas encore branché

- Rien sur les dons : ils fonctionnent par virement direct, sans prestataire à brancher.
  Riseva n'encaisse pas — voir `docs/DON-VIREMENT.md`.
- L'envoi des mails attend une clé Resend. Sans elle, les fonctions journalisent au lieu d'envoyer.
- L'export PDF des rapports passe par l'impression du navigateur.
