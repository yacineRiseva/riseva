#!/usr/bin/env python3
"""Le code QR de l'affiche, vérifié en le relisant.

    python3 scripts/test_qr.py

Un encodeur de code QR écrit à la main peut produire un carré parfaitement
crédible que personne ne lit : les motifs de repérage sont là, les proportions
sont bonnes, et le téléphone ne s'accroche pas. Le seul test qui vaut est donc
un aller-retour complet — on encode, on rend l'image, et on la relit avec un
décodeur qui n'est pas le nôtre.

Le premier passage a justement produit trois carrés parfaits et illisibles :
polynôme générateur construit à l'envers, puis information de format écrite du
bit de poids faible vers le bit de poids fort. Aucune des deux erreurs ne se
voit à l'œil.
"""
import json, pathlib, subprocess, sys, tempfile
import numpy as np, cv2

RACINE = pathlib.Path(__file__).resolve().parent.parent
QR = RACINE / "public" / "app" / "qr.js"

TEXTES = [
    "A",
    "https://riseva.fr/rejoindre.html?code=VAUDREY-7QK2",
    "https://riseva.fr/rejoindre.html?code=A1",
    "https://riseva.fr/rejoindre.html?code=" + "M" * 30,
    "https://riseva.fr/rejoindre.html?code=" + "M" * 60,
    "Accents : éàüçîô, et des chiffres 0123456789.",
    "0123456789" * 10,
]

def matrices():
    with tempfile.TemporaryDirectory() as d:
        mod = pathlib.Path(d) / "qr.mjs"
        mod.write_text(QR.read_text(encoding="utf-8"), encoding="utf-8")
        prog = pathlib.Path(d) / "run.mjs"
        prog.write_text(
            f'import {{ qrMatrice }} from "{mod}";\n'
            f'const t = {json.dumps(TEXTES)};\n'
            'console.log(JSON.stringify(t.map(x => qrMatrice(x))));\n',
            encoding="utf-8")
        r = subprocess.run(["node", str(prog)], capture_output=True, text=True)
        if r.returncode:
            print(r.stderr); sys.exit(1)
        return json.loads(r.stdout)

def relire(g, echelle=10, marge=4):
    n = len(g)
    img = np.ones(((n + 2 * marge) * echelle, (n + 2 * marge) * echelle), np.uint8) * 255
    for r in range(n):
        for c in range(n):
            if g[r][c]:
                img[(r + marge) * echelle:(r + marge + 1) * echelle,
                    (c + marge) * echelle:(c + marge + 1) * echelle] = 0
    txt, _, _ = cv2.QRCodeDetector().detectAndDecode(img)
    return txt

def main():
    ms = matrices()
    ko = 0
    for texte, m in zip(TEXTES, ms):
        if m is None:
            print(f"  ✗ {texte[:44]!r} : aucune matrice"); ko += 1; continue
        lu = relire(m)
        bon = lu == texte
        ko += not bon
        print(f"  {'✓' if bon else '✗'} v{(len(m) - 17) // 4:<2} {len(texte):>3} car. "
              f"{texte[:40]!r}" + ("" if bon else f"  →  relu {lu!r}"))
    print(f"{len(TEXTES) - ko}/{len(TEXTES)} codes QR relus")
    return 1 if ko else 0

if __name__ == "__main__":
    sys.exit(main())
