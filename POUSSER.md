# Pousser Riseva sur GitHub

Le dépôt est complet et contient cinq commits. Il ne manque que la connexion à ton compte,
que je ne peux pas faire à ta place : le proxy de mon environnement bloque github.com, et tu
n'es pas connecté à GitHub dans ton navigateur.

## La façon la plus simple

1. Va sur github.com et connecte-toi (ou crée ton compte si tu n'en as pas).
2. Installe GitHub CLI : https://cli.github.com — ou par winget dans un terminal Windows :
   ```
   winget install --id GitHub.cli
   ```
3. Décompresse `riseva.zip` où tu veux, par exemple dans `C:\Users\<toi>\source`.
4. Ouvre un terminal dans le dossier `riseva` et lance :
   ```
   gh auth login
   gh repo create riseva --private --source=. --push
   ```
   `gh auth login` ouvre ton navigateur, tu n'as aucun jeton à copier à la main.

C'est tout. Le dépôt est créé et l'historique est poussé.

## Sans GitHub CLI

1. Crée un dépôt **vide** nommé `riseva` sur github.com (privé, sans README ni .gitignore).
2. Dans le dossier `riseva` :
   ```
   git remote add origin https://github.com/<ton-compte>/riseva.git
   git branch -M main
   git push -u origin main
   ```
3. Git demandera un mot de passe : c'est en fait un jeton personnel, à créer dans
   Settings → Developer settings → Personal access tokens → Fine-grained tokens,
   portée limitée à ce dépôt, permission Contents en lecture-écriture.

## Si tu préfères ne rien installer

`riseva.bundle` contient tout l'historique dans un seul fichier. Depuis n'importe quelle
machine où git est installé :

```
git clone riseva.bundle riseva
cd riseva
git remote set-url origin https://github.com/<ton-compte>/riseva.git
git push -u origin main
```

## Ensuite, Vercel

1. vercel.com → Import Git Repository → choisis `riseva`.
2. Framework preset **Other**, Root directory **public**, aucune commande de build.
3. Settings → Domains → ajoute `riseva.fr` et suis les instructions DNS chez ton hébergeur.

## À ne jamais pousser

`.gitignore` s'en occupe déjà :

- `public/app/config.js` — URL et clé Supabase de production
- la clé `service_role` de Supabase, qui ne doit vivre que dans les variables
  d'environnement des fonctions Edge
