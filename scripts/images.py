#!/usr/bin/env python3
"""Les variantes WebP des illustrations et des captures.

    python3 scripts/images.py

Le site servait 6,5 Mo de JPEG, dont une image de 413 Ko en tête de la vitrine
associations : c'est elle que le navigateur mesure comme LCP, et c'est elle qui
décide de la première impression sur un téléphone en 4G. Les JPEG restent, ils
sont la solution de repli ; le WebP est servi en premier quand le navigateur
l'accepte, ce que font tous les navigateurs en service depuis 2020.

Deux largeurs, pas cinq. Les photos s'affichent entre 390 et 680 pixels selon la
mise en page : 760 couvre le rendu simple et les petits écrans en densité double,
1120 couvre les grands écrans en densité double. Au-delà, on transporte des
pixels que personne ne regarde.

Les fichiers produits sont versionnés avec le site : aucune conversion ne se fait
au moment de servir la page.
"""
import pathlib, sys
from PIL import Image

RACINE = pathlib.Path(__file__).resolve().parent.parent
PUBLIC = RACINE / "public"
LARGEURS = (760, 1120)
QUALITE = 78

def variantes(src: pathlib.Path):
    """Écrit les WebP manquants ou périmés. Renvoie (ecrits, octets_gagnes)."""
    im = Image.open(src)
    if im.mode not in ("RGB", "RGBA"):
        im = im.convert("RGB")
    ecrits, gagnes = 0, 0
    for w in LARGEURS:
        # Une image plus petite que la cible n'est jamais agrandie : on ne
        # fabrique pas des pixels pour remplir un nom de fichier.
        if im.width < w and w != LARGEURS[0]:
            continue
        sortie = src.with_name(f"{src.stem}-{w}.webp")
        if sortie.exists() and sortie.stat().st_mtime >= src.stat().st_mtime:
            continue
        r = im.copy()
        r.thumbnail((w, 10 ** 5), Image.LANCZOS)
        r.save(sortie, "WEBP", quality=QUALITE, method=6)
        ecrits += 1
        gagnes += src.stat().st_size - sortie.stat().st_size
    return ecrits, gagnes

def main():
    total_ecrits = 0
    avant = apres = 0
    for dossier in ("photos", "captures"):
        d = PUBLIC / dossier
        if not d.is_dir():
            continue
        for src in sorted(d.rglob("*.jpg")):
            n, _ = variantes(src)
            total_ecrits += n
            avant += src.stat().st_size
            petites = sorted(src.parent.glob(f"{src.stem}-*.webp"))
            if petites:
                apres += min(p.stat().st_size for p in petites)
    print(f"  {total_ecrits} variantes écrites")
    if avant:
        print(f"  le plus petit WebP de chaque image pèse {apres//1024} Ko "
              f"contre {avant//1024} Ko en JPEG, soit {100 - 100*apres//avant} % de moins")
    return 0

if __name__ == "__main__":
    sys.exit(main())
