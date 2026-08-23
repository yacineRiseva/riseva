@echo off
setlocal
chcp 65001 >nul
title Riseva - envoi vers GitHub

rem ---------------------------------------------------------------------
rem  Envoie le projet Riseva vers https://github.com/yacineRiseva/riseva
rem
rem  A poser dans C:\Users\Yacine\Documents\Green a cote de riseva.bundle,
rem  puis double-cliquer. Git ouvrira une fenetre de connexion GitHub la
rem  premiere fois : c'est normal, c'est Git qui demande, pas ce script.
rem
rem  Ce qui a change, et pourquoi. La version precedente commencait par
rem  "git bundle verify", qui exige d'etre DEJA dans un depot Git : le
rem  dossier Green n'en est pas un, donc la commande repondait "need a
rem  repository to verify a bundle" et le script s'arretait avant d'avoir
rem  rien fait. La verification est faite autrement : c'est le clone qui
rem  lit le paquet, et un paquet illisible le fait echouer avec son
rem  message. Une etape de moins, et elle marche.
rem ---------------------------------------------------------------------

cd /d "%~dp0"

where git >nul 2>&1
if errorlevel 1 (
  echo Git n'est pas installe. Telechargez-le sur https://git-scm.com/download/win
  echo puis relancez ce fichier.
  pause
  exit /b 1
)

if not exist "riseva.bundle" (
  echo Le fichier riseva.bundle est introuvable dans ce dossier.
  echo Placez-le a cote de ce script et relancez.
  pause
  exit /b 1
)

if exist "riseva-git\.git" goto majour

rem Un dossier riseva-git present mais sans depot dedans ferait echouer le
rem clone avec un message peu clair. On le dit avant.
if exist "riseva-git" (
  echo Le dossier riseva-git existe mais ne contient pas de depot Git.
  echo Renommez-le ou supprimez-le, puis relancez ce fichier.
  pause
  exit /b 1
)

echo.
echo [1/3] Lecture du paquet et extraction du depot...
git clone -b main riseva.bundle riseva-git
if errorlevel 1 (
  echo.
  echo Le paquet n'a pas pu etre lu. Redemandez-en un.
  pause
  exit /b 1
)
cd riseva-git
goto brancher

:majour
echo.
echo [1/3] Depot deja present, recuperation des nouveaux commits...
cd riseva-git
git remote remove paquet 2>nul
git remote add paquet "..\riseva.bundle"
git fetch paquet "+refs/heads/*:refs/remotes/paquet/*"
if errorlevel 1 (
  echo.
  echo Le paquet n'a pas pu etre lu. Redemandez-en un.
  git remote remove paquet 2>nul
  pause
  exit /b 1
)
git checkout -B main paquet/main
if errorlevel 1 goto erreur
git remote remove paquet

:brancher
echo.
echo [2/3] Branchement sur GitHub...
git remote remove origin 2>nul
git remote add origin https://github.com/yacineRiseva/riseva.git

echo.
echo [3/3] Envoi. Une fenetre de connexion GitHub peut s'ouvrir.
git push -u origin main
if errorlevel 1 goto erreur

echo.
echo ======================================================
echo  C'est envoye : https://github.com/yacineRiseva/riseva
echo ======================================================
pause
exit /b 0

:erreur
echo.
echo Quelque chose a echoue. Copiez le message ci-dessus et envoyez-le moi.
pause
exit /b 1
