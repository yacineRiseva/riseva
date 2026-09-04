@echo off
setlocal
chcp 65001 >nul
title Riseva - envoi vers GitHub

rem ---------------------------------------------------------------------
rem  Envoie le projet Riseva vers https://github.com/yacineRiseva/riseva
rem
rem  A poser dans C:\Users\Yacine\Documents\Green a cote de riseva.bundle,
rem  puis double-cliquer.
rem
rem  CE QUI A CHANGE, ET POURQUOI C'ETAIT GRAVE.
rem  La version precedente, quand le dossier riseva-git existait deja,
rem  faisait "git checkout -B main paquet/main" a partir de riseva.bundle.
rem  Or ce paquet-la est une photo ancienne du depot : la commande ne
rem  mettait pas a jour, elle REMETTAIT le depot local a l'etat du paquet
rem  et jetait tout ce qui avait ete ajoute depuis. Au moment ou ceci est
rem  ecrit, le depot local avait onze commits d'avance sur GitHub : les
rem  onze auraient disparu sans un message.
rem
rem  Le depot local est desormais la reference. Ce script ne le reecrit
rem  jamais : il regarde ou il en est, le dit, et l'envoie.
rem ---------------------------------------------------------------------

cd /d "%~dp0"

where git >nul 2>&1
if errorlevel 1 (
  echo Git n'est pas installe. Telechargez-le sur https://git-scm.com/download/win
  echo puis relancez ce fichier.
  pause
  exit /b 1
)

if exist "riseva-git\.git" goto pousser

rem --- premier passage : le depot n'existe pas encore ---
if exist "riseva-git" (
  echo Le dossier riseva-git existe mais ne contient pas de depot Git.
  echo Renommez-le ou supprimez-le, puis relancez ce fichier.
  pause
  exit /b 1
)
if not exist "riseva.bundle" (
  echo Premier passage : il faut riseva.bundle a cote de ce script.
  pause
  exit /b 1
)
echo.
echo [1/3] Premier passage : extraction du depot depuis riseva.bundle...
git clone -b main riseva.bundle riseva-git
if errorlevel 1 (
  echo.
  echo Le paquet n'a pas pu etre lu. Redemandez-en un.
  pause
  exit /b 1
)
cd riseva-git
goto brancher

:pousser
cd riseva-git
echo.
echo [1/3] Depot deja present. Etat avant envoi :
git remote remove origin 2>nul
git remote add origin https://github.com/yacineRiseva/riseva.git
git fetch origin main 2>nul
for /f %%A in ('git rev-list --count origin/main..main 2^>nul') do set AVANCE=%%A
for /f %%A in ('git rev-list --count main..origin/main 2^>nul') do set RETARD=%%A
echo    commits a envoyer : %AVANCE%
echo    commits presents sur GitHub et absents ici : %RETARD%
git status --porcelain >"%TEMP%\riseva-etat.txt"
for %%A in ("%TEMP%\riseva-etat.txt") do set TAILLE=%%~zA
if not "%TAILLE%"=="0" (
  echo.
  echo Des fichiers sont modifies sans etre enregistres. Ils ne partiront pas.
  echo Ce n'est pas bloquant, mais verifiez que c'est voulu :
  type "%TEMP%\riseva-etat.txt"
  echo.
)
if "%AVANCE%"=="0" (
  echo.
  echo Rien de nouveau a envoyer. GitHub est deja a jour.
  pause
  exit /b 0
)
goto envoi

:brancher
echo.
echo [2/3] Branchement sur GitHub...
git remote remove origin 2>nul
git remote add origin https://github.com/yacineRiseva/riseva.git

:envoi
echo.
echo [3/3] Envoi. Une fenetre de connexion GitHub peut s'ouvrir.
git push -u origin main
if errorlevel 1 goto erreur

echo.
echo ======================================================
echo  C'est envoye : https://github.com/yacineRiseva/riseva
echo.
echo  Ensuite, verifier que riseva.fr suit : le site en
echo  ligne servait encore une version tres anterieure au
echo  moment ou ce script a ete ecrit.
echo ======================================================
pause
exit /b 0

:erreur
echo.
echo Quelque chose a echoue. Copiez le message ci-dessus et envoyez-le moi.
pause
exit /b 1
