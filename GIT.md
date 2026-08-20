# Mettre le projet sur GitHub

Le dépôt est déjà initialisé et contient deux commits. Il ne reste qu'à le pousser.
Je ne peux pas le faire à ta place : cela demanderait de manipuler un jeton d'accès à ton
compte, et c'est exactement le genre de chose que je ne touche pas.

## 1. Créer le dépôt

Sur github.com, connecté avec ton compte Google, crée un dépôt **vide** nommé `riseva`
(pas de README, pas de .gitignore, pas de licence, sinon il faudra fusionner).
Mets-le en privé.

## 2. Pousser

Décompresse `riseva.zip`, puis dans le dossier :

```bash
cd riseva
git remote add origin https://github.com/<ton-compte>/riseva.git
git branch -M main
git push -u origin main
```

Git te demandera tes identifiants. Utilise un jeton personnel (Settings → Developer settings →
Personal access tokens → Fine-grained tokens, portée : ce seul dépôt, permission Contents en
lecture-écriture). Colle-le à la place du mot de passe.

Si tu préfères éviter les jetons, installe `gh` (GitHub CLI) et fais `gh auth login` :
l'authentification passe par le navigateur, puis `gh repo create riseva --private --source=. --push`
fait les deux étapes d'un coup.

## 3. Brancher Vercel

Sur vercel.com, importe le dépôt. Réglages :

- Framework preset : **Other**
- Root directory : `public`
- Build command : aucune
- Output directory : laisser vide

Puis Settings → Domains → ajoute `riseva.fr` et suis les instructions DNS chez ton hébergeur.

## Ce qui ne doit jamais partir sur GitHub

`.gitignore` s'en charge déjà, mais pour mémoire :

- `public/app/config.js` (URL et clé Supabase de production)
- la clé `service_role` de Supabase, qui ne doit exister que dans les variables
  d'environnement des fonctions Edge
