#!/usr/bin/env python3
"""Le contraste REEL de la section de verre, mesure sur le pixel, et pas une fois.

    python3 scripts/contraste-verre.py [port]

Pourquoi ce script existe a cote de la mesure de contraste de la recette. La
recette part des couleurs DECLAREES : elle remonte la chaine des fonds jusqu'a
une couleur opaque. Sous un panneau de verre, cette chaine ment. Ce qu'il y a
derriere un texte, ce n'est pas le fond declare du panneau : c'est le resultat
compose du panneau, de son flou, des nappes lumineuses qui passent dessous et du
reflet qui suit le pointeur.

Pourquoi il mesure PLUSIEURS fois. Ce fond bouge. Les nappes derivent sur
vingt-six, trente et une et trente-sept secondes ; le reflet se deplace avec le
curseur. Une mesure unique dit ce qui se passe a un instant et a une position,
pas le pire cas. On echantillonne donc plusieurs phases d'animation et
plusieurs positions de pointeur, et on garde le minimum.

Methode : on rend tout le texte de la section transparent, on prend l'image, et
on lit le pixel au centre de chaque texte. C'est exactement ce que voit l'oeil
derriere les lettres.
"""
import asyncio, sys, os
from playwright.async_api import async_playwright
from PIL import Image

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get("PORT_VERRE", 8199))
PHASES = (0, -9, -18)          # secondes, sur des cycles de 26 / 31 / 37 s
POINTEURS = ((.15,.25), (.5,.2), (.85,.3), (.3,.7), (.7,.75))

TAMPON = "/tmp/fond-verre.png"

def lum(c):
    def f(v):
        v /= 255
        return v/12.92 if v <= .03928 else ((v+.055)/1.055) ** 2.4
    return .2126*f(c[0]) + .7152*f(c[1]) + .0722*f(c[2])

def ratio(a, b):
    l1, l2 = sorted([lum(a), lum(b)], reverse=True)
    return (l1+.05)/(l2+.05)

SEL = ('.verre p, .verre h3, .verre-puce, .verre-chiffre b, .verre-chiffre span,'
       ' .verre-ecrans, .mini-ligne span, .mini-etat, .mini-note, .mini-barre span')

LIRE = """(sel) => {
  const s = document.querySelector('#plateforme');
  return [...s.querySelectorAll(sel)].map(el => {
    const r = el.getBoundingClientRect(), c = getComputedStyle(el);
    return { nom: (el.className||el.tagName).toString().slice(0,28), couleur: c.color,
             taille: parseFloat(c.fontSize), poids: c.fontWeight,
             x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2),
             vu: r.top > 4 && r.bottom < innerHeight - 4 };
  }).filter(o => o.vu);
}"""

async def main():
    pires = {}
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={"width":1440,"height":950}, device_scale_factor=1)
        await pg.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="networkidle")
        el = await pg.query_selector("#plateforme")
        await el.scroll_into_view_if_needed()
        await pg.wait_for_timeout(1100)
        boite = await el.bounding_box()
        mesures = 0
        for phase in PHASES:
            # Les nappes sont arretees a une phase choisie : sans cet arret, deux
            # captures ne montrent jamais le meme fond et rien n'est reproductible.
            await pg.add_style_tag(content=(
                f"#plateforme .verre-champ i, #plateforme .verre-lianes .rib"
                f"{{animation-play-state:paused !important;"
                f"animation-delay:{phase}s !important}}"))
            for fx, fy in POINTEURS:
                await pg.mouse.move(boite["x"] + boite["width"]*fx,
                                    max(6, boite["y"]) + 700*fy)
                await pg.wait_for_timeout(320)
                cibles = await pg.evaluate(LIRE, SEL)
                masque = await pg.add_style_tag(content="#plateforme *{color:transparent !important}")
                await pg.wait_for_timeout(120)
                await pg.screenshot(path=TAMPON)
                await pg.evaluate("(n) => n.remove()", masque)
                im = Image.open(TAMPON).convert("RGB")
                for c in cibles:
                    fond = im.getpixel((c["x"], c["y"]))
                    txt = tuple(int(v) for v in c["couleur"]
                                .replace("rgb(","").replace("rgba(","").replace(")","")
                                .split(",")[:3])
                    r = ratio(txt, fond)
                    gros = c["taille"] >= 24 or (c["taille"] >= 18.66 and int(c["poids"]) >= 700)
                    seuil = 3.0 if gros else 4.5
                    cle = (c["nom"], c["taille"])
                    mesures += 1
                    if cle not in pires or r < pires[cle][0]:
                        pires[cle] = (r, seuil, txt, fond, phase, (fx, fy))
        await b.close()

    classe = sorted(pires.items(), key=lambda kv: kv[1][0] - kv[1][1])
    print(f"{mesures} mesures, {len(PHASES)} phases d'animation x {len(POINTEURS)} positions de pointeur")
    print(f"{len(classe)} textes distincts, chacun retenu a son pire moment\n")
    for (nom, taille), (r, seuil, txt, fond, phase, pos) in classe[:8]:
        etat = "OK " if r >= seuil else "RATE"
        print(f"{etat} {r:5.2f} (seuil {seuil})  {taille:4.1f}px  {nom:28s}"
              f"  texte{txt} fond{fond}  phase {phase}s pointeur {pos}")
    rates = [x for x in classe if x[1][0] < x[1][1]]
    print()
    if rates:
        print(f"{len(rates)} textes sous le seuil AA a leur pire moment.")
        sys.exit(1)
    print("Tout passe le seuil AA, a tous les moments mesures.")

asyncio.run(main())
