#!/usr/bin/env bash
# Fige la bibliothèque cliente Supabase dans le dépôt.
#
# Un `import("https://…")` à l'exécution, c'est un tiers qui peut changer le code
# qui manipule les jetons de session de nos clients, sans qu'aucun fichier de ce
# dépôt ne bouge. On télécharge donc une fois, on vérifie l'empreinte, on
# versionne, et on n'y revient qu'en connaissance de cause.
#
#     ./scripts/figer-dependance.sh              # installe la version épinglée
#     ./scripts/figer-dependance.sh 2.46.1       # change de version, volontairement
set -euo pipefail

VERSION="${1:-2.45.4}"
CIBLE="public/app/vendor"
RACINE="$(cd "$(dirname "$0")/.." && pwd)"
cd "$RACINE"

mkdir -p "$CIBLE"
URL="https://esm.sh/@supabase/supabase-js@${VERSION}?bundle&target=es2020"

echo "Téléchargement de @supabase/supabase-js@${VERSION}…"
curl -fsSL "$URL" -o "$CIBLE/supabase.js"

EMPREINTE="$(sha256sum "$CIBLE/supabase.js" | cut -d' ' -f1)"
cat > "$CIBLE/EMPREINTE.txt" <<EOF
@supabase/supabase-js@${VERSION}
sha256 ${EMPREINTE}
figé le $(date -u +%Y-%m-%d)

Vérification :
  sha256sum public/app/vendor/supabase.js
Une empreinte différente de celle-ci veut dire que le fichier a changé.
Ce n'est pas forcément une attaque, mais ça se décide, ça ne se subit pas.
EOF

echo "Figé : $CIBLE/supabase.js"
echo "sha256 $EMPREINTE"
