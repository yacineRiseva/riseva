#!/usr/bin/env python3
"""Une image de la page entiere, prise en la parcourant.

    python3 scripts/apercu.py /index.html /tmp/apercu.jpg 1100

Une capture « pleine page » ne declenche pas l'observateur d'intersection : tout
ce qui apparait au defilement reste a zero d'opacite, et l'image montre une page
a moitie vide. On descend donc par ecrans, on laisse chaque apparition se faire,
on remesure la hauteur — les images differees ne sont chargees qu'une fois
passees devant, et une page mesuree avant elles fait la moitie de sa taille —
puis on recolle.

Ce fichier existe pour l'audit de design : il faut pouvoir montrer la page telle
qu'elle est a quelqu'un qui ne peut pas l'ouvrir.
"""
import http.server, socketserver, threading, functools, pathlib, sys
from playwright.sync_api import sync_playwright
from PIL import Image

RACINE = pathlib.Path(__file__).resolve().parent.parent / "public"
PORT, VUE, LARGE = 8131, 900, 1440

def main():
    page = sys.argv[1] if len(sys.argv) > 1 else "/index.html"
    sortie = sys.argv[2] if len(sys.argv) > 2 else "/tmp/apercu.jpg"
    largeur = int(sys.argv[3]) if len(sys.argv) > 3 else 1100
    h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(RACINE))
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.TCPServer(("127.0.0.1", PORT), h)
    srv.RequestHandlerClass.log_message = lambda *a: None
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    morceaux = []
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        p = b.new_context(viewport={"width": LARGE, "height": VUE},
                          device_scale_factor=1, locale="fr-FR").new_page()
        p.goto(f"http://127.0.0.1:{PORT}{page}", wait_until="networkidle")
        # Le defilement doux de la page anime `scrollTo` : la capture part
        # pendant le trajet et le morceau recolle montre un entre-deux. On le
        # coupe pour la duree de l'apercu.
        p.add_style_tag(content="html{scroll-behavior:auto!important}")
        p.wait_for_timeout(900)
        y = 0
        while y < p.evaluate("()=>document.documentElement.scrollHeight"):
            p.evaluate(f"window.scrollTo(0,{y})"); p.wait_for_timeout(400)
            y += VUE - 80
        total = p.evaluate("()=>document.documentElement.scrollHeight")
        p.evaluate("window.scrollTo(0,0)"); p.wait_for_timeout(700)
        # La barre du haut est fixe : sans ca, elle se repete tous les neuf cents
        # pixels sur l'image recollee.
        p.add_style_tag(content=".nav{opacity:0!important}")
        y = 0
        while y < total:
            p.evaluate(f"window.scrollTo(0,{y})"); p.wait_for_timeout(240)
            f = f"/tmp/_apercu{len(morceaux)}.png"
            p.screenshot(path=f); morceaux.append((f, y)); y += VUE
        b.close()
    srv.shutdown()
    im = Image.new("RGB", (LARGE, total), "#F2F0E9")
    for f, y in morceaux:
        im.paste(Image.open(f).crop((0, 0, LARGE, min(VUE, total - y))), (0, y))
        pathlib.Path(f).unlink()
    im = im.resize((largeur, round(total * largeur / LARGE)), Image.LANCZOS)
    im.save(sortie, quality=86, optimize=True)
    print(sortie, im.size)

if __name__ == "__main__":
    main()
