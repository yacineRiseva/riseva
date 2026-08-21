#!/usr/bin/env sh
# Télécharge les deux polices une bonne fois et les range dans public/brand/polices/.
# À lancer depuis un poste qui a accès au réseau ; les fichiers sont ensuite versionnés,
# et le site n'appelle plus jamais Google.
set -eu
cd "$(dirname "$0")/.."
mkdir -p public/brand/polices
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36'

recuperer() {
  nom="$1"; requete="$2"
  css=$(curl -sfL -A "$UA" "https://fonts.googleapis.com/css2?family=$requete&display=swap")
  url=$(printf '%s' "$css" | grep -o "https://fonts.gstatic.com[^)]*\.woff2" | head -1)
  [ -n "$url" ] || { echo "échec : pas de woff2 pour $nom"; exit 1; }
  curl -sfL -A "$UA" "$url" -o "public/brand/polices/$nom.woff2"
  echo "$nom.woff2  $(wc -c < "public/brand/polices/$nom.woff2") octets"
}

recuperer instrument-sans 'Instrument+Sans:wght@400..700'
recuperer inter            'Inter:wght@400..600'
echo "Fait. Vérifier avec : python3 scripts/verifier.py"
