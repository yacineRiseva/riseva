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

# nom, route, utilisateur, cadrage.
#
# Le cadrage est un nombre — la hauteur retenue depuis le haut de la fenêtre —
# ou un sélecteur CSS quand la capture doit tenir dans une demi-colonne. Une
# fenêtre de 1440 pixels réduite à 590 rend les chiffres illisibles : à cette
# taille il faut cadrer sur l'objet, pas sur l'écran.
# Le cadrage est décidé ici, pas à l'affichage : une page entière réduite à la
# largeur d'une colonne ne se lit pas, et une capture illisible est une image
# décorative de plus. On garde donc le haut de l'écran — celui qui porte les
# indicateurs et le bloc de résultats — et on coupe le reste.
ECRANS = [
    ("admin-tableau",  "#/tableau",     "u2", 900),
    ("salarie-saison", "#/tableau",     "u5", ".card--dark"),
    ("salarie-actions","#/annonces",    "u5", ("#liste", 620)),
    ("asso-tableau",   "#/tableau",     "u7", ".card--dark"),
    ("asso-valider",   "#/avalider",    "u7", 860),
    ("missions",       "#/missions",    "u2", 860),
    ("rapports",       "#/rapports",    "u2", 900),
    ("mecenat",        "#/mecenat",     "u2", 900),
    ("groupe",         "#/groupe",      "u2", 900),
    ("indicateurs",    "#/indicateurs", "u2", 900),
    ("classement",     "#/classement",  "u2", 860),
    ("materiel",       "#/materiel",    "u2", 860),
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
        for nom, route, uid, cadrage in ECRANS:
            p.goto(f"{BASE}/app/", wait_until="domcontentloaded")
            p.evaluate("()=>localStorage.removeItem('riseva.etat')")
            p.evaluate("u=>localStorage.setItem('riseva.session',JSON.stringify({uid:u}))", uid)
            p.goto(f"{BASE}/app/?c=1{route}", wait_until="networkidle")
            p.wait_for_timeout(700)
            p.evaluate("css=>{const s=document.createElement('style');s.textContent=css;"
                       "document.head.appendChild(s)}", FONTE)
            p.wait_for_timeout(300)
            brut = SORTIE / f"{nom}.png"
            haut = None
            if isinstance(cadrage, tuple):
                cadrage, haut = cadrage
            if isinstance(cadrage, str):
                el = p.query_selector(cadrage)
                if el is None:
                    erreurs.append(f"{nom} : aucun élément « {cadrage} »")
                    continue
                el.scroll_into_view_if_needed()
                p.wait_for_timeout(250)
                el.screenshot(path=str(brut))
            else:
                p.screenshot(path=str(brut), clip={"x": 0, "y": 0, "width": 1440,
                                                   "height": cadrage})
            # Le PNG en double densité pèse plusieurs mégaoctets : on redescend à
            # la largeur d'affichage réelle et on encode en JPEG. Une vitrine qui
            # met huit secondes à s'afficher chez un client en zone industrielle
            # n'a pas fini de prouver quoi que ce soit.
            im = Image.open(brut).convert("RGB")
            # Une liste de vingt-trois annonces prouve moins que trois : le
            # lecteur ne lit pas une capture de deux mètres de haut, il la
            # survole. On coupe donc au nombre d'éléments qui se lisent.
            if haut:
                im = im.crop((0, 0, im.width, min(im.height, haut * 2)))
            # Une capture s'affiche sur la vitrine jusqu'à 1 250 pixels de large.
            # Sur un écran à double densité, il en faut le double pour qu'elle
            # soit nette : à 1 440, la capture du tableau de bord était affichée
            # à 1 118 et paraissait molle. On ne descend donc plus en dessous de
            # 1 920, et les captures cadrées sur un élément gardent leur pleine
            # résolution.
            large = im.width if im.width <= 1920 else min(1920, im.width)
            im = im.resize((large, round(im.height * large / im.width)), Image.LANCZOS)
            im.save(SORTIE / f"{nom}.jpg", quality=78, optimize=True, progressive=True)
            brut.unlink()
            ecrites.append((nom, (SORTIE / f'{nom}.jpg').stat().st_size // 1024))

        # ── l'affiche ──────────────────────────────────────────────────────
        # Le seul support imprimé du produit, et il se fabrique dans
        # l'application avec le lien d'inscription de l'entreprise dedans.
        # Le montrer en photo posée sur un mur serait une mise en scène ; le
        # montrer tel qu'il sort de la machine est la même image en plus vrai.
        try:
            p.goto(f"{BASE}/app/", wait_until="domcontentloaded")
            p.evaluate("()=>localStorage.removeItem('riseva.etat')")
            p.evaluate("()=>localStorage.setItem('riseva.session',"
                       "JSON.stringify({uid:'u2'}))")
            p.goto(f"{BASE}/app/?c=1#/supports", wait_until="networkidle")
            p.wait_for_timeout(600)
            with p.expect_popup() as pop:
                p.click("#affiche")
            a = pop.value
            a.wait_for_load_state("domcontentloaded")
            a.add_style_tag(content=FONTE + ".noprint{display:none}")
            a.wait_for_timeout(400)
            brut = SORTIE / "affiche.png"
            a.locator(".a4").screenshot(path=str(brut))
            im = Image.open(brut).convert("RGB")
            large = min(1400, im.width)
            im = im.resize((large, round(im.height * large / im.width)), Image.LANCZOS)
            im.save(SORTIE / "affiche.jpg", quality=84, optimize=True, progressive=True)
            brut.unlink()
            ecrites.append(("affiche", (SORTIE / "affiche.jpg").stat().st_size // 1024))
            a.close()
        except Exception as exc:
            erreurs.append(f"affiche : {exc}")

        b.close()
    for nom, ko in ecrites:
        print(f"  {nom:<18} {ko} Ko")
    print("ERREURS:", "\n".join(sorted(set(erreurs))) if erreurs else "aucune")
    return 1 if erreurs else 0

if __name__ == "__main__":
    sys.exit(main())
