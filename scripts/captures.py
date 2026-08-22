#!/usr/bin/env python3
"""Les captures de la vitrine, prises dans l'application elle-même.

    python3 scripts/captures.py

Pourquoi ce fichier existe. La vitrine vendait le produit avec seize photos de
banque d'images — des cadres souriants en open space — pour un produit dont le
métier est le ramassage de déchets en rivière, la plantation d'arbres et les
refuges animaliers. Une photo d'illustration n'est pas une preuve, et une
légende « photo d'illustration, aucune mise en scène » ne la rachète pas : elle
confirme au lecteur que l'image ne prouve rien.

Faute de photographies réelles de chantier — Riseva n'en a aucune à ce stade —
la seule preuve disponible est le produit. Ces captures sont donc prises sur la
vraie application, avec le vrai jeu de démonstration, à chaque exécution. Elles
vieillissent avec le produit au lieu de vieillir contre lui : un écran qui
change casse la capture au prochain passage, et c'est exactement ce qu'on veut.

Chaque capture est recadrée sur la zone qui porte l'information. Une page
entière réduite à la largeur d'une colonne ne se lit pas, et une capture
illisible est une image décorative de plus.
"""
import http.server, socketserver, threading, functools, pathlib, contextlib, sys
from playwright.sync_api import sync_playwright
from PIL import Image

RACINE = pathlib.Path(__file__).resolve().parent.parent / "public"
SORTIE = RACINE / "captures"
PORT = 8099
BASE = f"http://127.0.0.1:{PORT}"

# Les polices de marque ne sont pas dans le conteneur ; sans cette substitution
# les captures partiraient dans une fonte de repli différente de celle du site.
FONTE = "*{font-family:'Carlito','DejaVu Sans',sans-serif !important}"

# nom, route, utilisateur, hauteur retenue depuis le haut du contenu
ECRANS = [
    ("admin-tableau",  "#/tableau",     "u2", 1180),
    ("salarie-saison", "#/tableau",     "u5", 1180),
    ("salarie-actions","#/annonces",    "u5", 1180),
    ("asso-tableau",   "#/tableau",     "u7", 1000),
    ("asso-valider",   "#/avalider",    "u7", 1000),
    ("missions",       "#/missions",    "u2", 1100),
    ("rapports",       "#/rapports",    "u2", 1200),
    ("mecenat",        "#/mecenat",     "u2", 1300),
    ("groupe",         "#/groupe",      "u2", 1200),
    ("indicateurs",    "#/indicateurs", "u2", 1200),
    ("classement",     "#/classement",  "u2", 1100),
    ("materiel",       "#/materiel",    "u2", 1000),
]

class Silencieux(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

@contextlib.contextmanager
def serveur():
    h = functools.partial(Silencieux, directory=str(RACINE))
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", PORT), h) as srv:
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        try: yield
        finally: srv.shutdown()

def main():
    SORTIE.mkdir(parents=True, exist_ok=True)
    erreurs, ecrites = [], []
    with serveur(), sync_playwright() as pw:
        b = pw.chromium.launch()
        ctx = b.new_context(viewport={"width": 1440, "height": 900},
                            device_scale_factor=2, locale="fr-FR")
        p = ctx.new_page()
        p.on("pageerror", lambda e: erreurs.append(str(e)))
        for nom, route, uid, hauteur in ECRANS:
            p.goto(f"{BASE}/app/", wait_until="domcontentloaded")
            p.evaluate("()=>localStorage.removeItem('riseva.etat')")
            p.evaluate("u=>localStorage.setItem('riseva.session',JSON.stringify({uid:u}))", uid)
            p.goto(f"{BASE}/app/?c=1{route}", wait_until="networkidle")
            p.wait_for_timeout(700)
            p.evaluate("css=>{const s=document.createElement('style');s.textContent=css;"
                       "document.head.appendChild(s)}", FONTE)
            p.wait_for_timeout(300)
            brut = SORTIE / f"{nom}.png"
            p.screenshot(path=str(brut), clip={"x": 0, "y": 0, "width": 1440,
                                               "height": hauteur})
            # Le PNG en double densité pèse plusieurs mégaoctets : on redescend à
            # la largeur d'affichage réelle et on encode en JPEG. Une vitrine qui
            # met huit secondes à s'afficher chez un client en zone industrielle
            # n'a pas fini de prouver quoi que ce soit.
            im = Image.open(brut).convert("RGB")
            im = im.resize((1440, round(im.height * 1440 / im.width)), Image.LANCZOS)
            im.save(SORTIE / f"{nom}.jpg", quality=82, optimize=True, progressive=True)
            brut.unlink()
            ecrites.append((nom, (SORTIE / f'{nom}.jpg').stat().st_size // 1024))
        b.close()
    for nom, ko in ecrites:
        print(f"  {nom:<18} {ko} Ko")
    print("ERREURS:", "\n".join(sorted(set(erreurs))) if erreurs else "aucune")
    return 1 if erreurs else 0

if __name__ == "__main__":
    sys.exit(main())
