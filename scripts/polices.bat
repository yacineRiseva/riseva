@echo off
rem Recupere les polices et les range dans public\brand\polices\.
rem A lancer une seule fois, par double-clic, depuis un poste connecte a Internet.
rem Les fichiers sont ensuite versionnes : le site n'appelle plus jamais Google.
setlocal
cd /d "%~dp0.."
if not exist "public\brand\polices" mkdir "public\brand\polices"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ua='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36';" ^
  "$familles=[ordered]@'bricolage-grotesque'='Bricolage+Grotesque:wght@400..800';'instrument-sans'='Instrument+Sans:wght@400..700';'fraunces'='Fraunces:ital,wght@1,400..700';'ibm-plex-mono'='IBM+Plex+Mono:wght@400;500';'inter'='Inter:wght@400..600';" ^
  "foreach($n in $familles.Keys){" ^
  "  $css=(Invoke-WebRequest -UseBasicParsing -UserAgent $ua -Uri ('https://fonts.googleapis.com/css2?family='+$familles[$n]+'&display=swap')).Content;" ^
  "  $url=([regex]'https://fonts\.gstatic\.com[^)]*\.woff2').Match($css).Value;" ^
  "  if(-not $url){Write-Host ('echec : pas de woff2 pour '+$n); exit 1};" ^
  "  Invoke-WebRequest -UseBasicParsing -UserAgent $ua -Uri $url -OutFile ('public\brand\polices\'+$n+'.woff2');" ^
  "  Write-Host ($n+'.woff2  '+(Get-Item ('public\brand\polices\'+$n+'.woff2')).Length+' octets')}"

echo.
echo Fait. Relancer ensuite pousser.bat pour envoyer les fichiers sur GitHub.
pause
