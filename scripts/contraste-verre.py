"""Le contraste REEL de la section de verre, mesure sur l'image.

La recette mesure le contraste a partir des couleurs declarees : elle remonte la
chaine des fonds jusqu'a trouver une couleur opaque. Sous un panneau de verre,
cette chaine ment : ce qui est derriere le texte n'est pas la couleur declaree du
panneau, c'est le resultat compose du panneau, de son flou, et de la nappe
lumineuse qui passe dessous. On mesure donc le pixel, pas la feuille de style.
"""
import asyncio, math
from playwright.async_api import async_playwright
from PIL import Image

PORT = 8199

def lum(c):
    def f(v):
        v /= 255
        return v/12.92 if v <= .03928 else ((v+.055)/1.055) ** 2.4
    return .2126*f(c[0]) + .7152*f(c[1]) + .0722*f(c[2])

def ratio(a, b):
    l1, l2 = sorted([lum(a), lum(b)], reverse=True)
    return (l1+.05)/(l2+.05)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={"width":1440,"height":950}, device_scale_factor=1)
        await pg.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="networkidle")
        await pg.wait_for_timeout(1200)
        cibles = await pg.evaluate("""() => {
          const s = document.querySelector('#plateforme');
          const sel = '.verre p, .verre h3, .verre-puce, .verre-chiffre b, .verre-chiffre span,'
                    + ' .verre-ecrans, .mini-ligne span, .mini-etat, .mini-note, .mini-barre span';
          return [...s.querySelectorAll(sel)].map(el => {
            const r = el.getBoundingClientRect(), c = getComputedStyle(el);
            return { nom: el.className || el.tagName, couleur: c.color, taille: c.fontSize,
                     poids: c.fontWeight,
                     x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2),
                     h: r.height };
          }).filter(o => o.h > 0);
        }""")
        el = await pg.query_selector("#plateforme")
        await el.scroll_into_view_if_needed()
        await pg.wait_for_timeout(900)
        # on relit les positions apres defilement
        cibles = await pg.evaluate("""() => {
          const s = document.querySelector('#plateforme');
          const sel = '.verre p, .verre h3, .verre-puce, .verre-chiffre b, .verre-chiffre span,'
                    + ' .verre-ecrans, .mini-ligne span, .mini-etat, .mini-note, .mini-barre span';
          return [...s.querySelectorAll(sel)].map(el => {
            const r = el.getBoundingClientRect(), c = getComputedStyle(el);
            return { nom: (el.className||el.tagName).toString().slice(0,28), couleur: c.color,
                     taille: parseFloat(c.fontSize), poids: c.fontWeight,
                     x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2),
                     vu: r.top > 0 && r.bottom < innerHeight };
          }).filter(o => o.vu);
        }""")
        # le texte disparait, le fond reste
        await pg.add_style_tag(content="#plateforme *{color:transparent !important;}")
        await pg.wait_for_timeout(400)
        await pg.screenshot(path="/tmp/fond.png")
        im = Image.open("/tmp/fond.png").convert("RGB")
        await b.close()

    pires = []
    for c in cibles:
        fond = im.getpixel((c["x"], c["y"]))
        txt = tuple(int(v) for v in c["couleur"].replace("rgb(","").replace("rgba(","").replace(")","").split(",")[:3])
        r = ratio(txt, fond)
        gros = c["taille"] >= 24 or (c["taille"] >= 18.66 and int(c["poids"]) >= 700)
        seuil = 3.0 if gros else 4.5
        pires.append((r - seuil, r, seuil, c["nom"], c["taille"], txt, fond))
    pires.sort()
    print(f"{len(pires)} textes mesures sur le pixel reel\n")
    for marge, r, seuil, nom, t, txt, fond in pires[:10]:
        etat = "OK " if marge >= 0 else "RATE"
        print(f"{etat} {r:5.2f} (seuil {seuil}) {t:5.1f}px  {nom:28s} texte{txt} fond{fond}")
    rates = [x for x in pires if x[0] < 0]
    print()
    print("Tout passe le seuil AA sur le pixel reel." if not rates
          else f"{len(rates)} textes sous le seuil.")

asyncio.run(main())
