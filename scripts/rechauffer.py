#!/usr/bin/env python3
"""Rechauffer les illustrations qui sortaient froides.

    python3 scripts/rechauffer.py

Pourquoi ce fichier existe. Trois illustrations restaient au bleu : une berge
dans la brume, un depart de chantier a l'aube sous un ciel d'acier, un tri de
denrees sous des neons. Le sujet de chacune est juste — des gens qui font
quelque chose — mais la lumiere disait le contraire de ce que la page raconte.
Une page qui vend l'engagement ne peut pas etre illustree en gris.

Ce n'est pas un filtre d'ambiance : on remonte la temperature de couleur, on
deverrouille les ombres et on rend un peu de saturation, sans toucher au cadre
ni au sujet. La retouche est ecrite ici plutot que faite a la main pour qu'elle
soit rejouable : une image regeneree demain repasse par la meme recette.
"""
import sys
from pathlib import Path
from PIL import Image, ImageEnhance
import numpy as np

RACINE = Path(__file__).resolve().parent.parent
PHOTOS = RACINE / "public" / "photos"
VIGNETTES = PHOTOS / "vignettes"

# nom : (gain rouge, gain bleu, ombres relevees, luminosite, saturation)
RECETTES = {
    "berge-ramassage": (1.10, 0.94, 22, 1.10, 1.22),
    "depart-chantier": (1.14, 0.88, 26, 1.14, 1.20),
    "collecte":        (1.08, 0.95, 16, 1.08, 1.18),
}


def rechauffer(im, gr, gb, ombres, lum, sat):
    a = np.asarray(im.convert("RGB")).astype(np.float32)
    # Les ombres d'abord : un voile clair ajoute dans les tons sombres
    # uniquement, dose par la luminance, pour ne pas laver les hautes lumieres.
    lumin = a.mean(axis=2, keepdims=True) / 255.0
    a += ombres * (1.0 - lumin) ** 2
    # Puis la temperature : plus de rouge, moins de bleu.
    a[:, :, 0] *= gr
    a[:, :, 2] *= gb
    im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    im = ImageEnhance.Brightness(im).enhance(lum)
    return ImageEnhance.Color(im).enhance(sat)


def main():
    faits = []
    for nom, r in RECETTES.items():
        f = PHOTOS / f"{nom}.jpg"
        if not f.exists():
            print(f"absente : {f}", file=sys.stderr)
            continue
        im = rechauffer(Image.open(f), *r)
        im.save(f, quality=86, optimize=True, progressive=True, subsampling=0)
        v = im.copy()
        v.thumbnail((640, 640), Image.LANCZOS)
        VIGNETTES.mkdir(parents=True, exist_ok=True)
        v.save(VIGNETTES / f"{nom}.jpg", quality=82, optimize=True, progressive=True)
        faits.append(f"{nom} ({f.stat().st_size // 1024} Ko)")
    print("rechauffees : " + ", ".join(faits) if faits else "rien a faire")
    return 0


if __name__ == "__main__":
    sys.exit(main())
