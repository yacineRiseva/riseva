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
from PIL import Image, ImageFilter, ImageEnhance

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
    # Le seul plan large de la serie : celui-la doit montrer QUE c'est une
    # application, avec sa navigation. Tous les autres cadrent sur la carte qui
    # porte la preuve annoncee par la legende — le bandeau lateral repete douze
    # fois ne prouve rien de plus la douzieme fois, et il mange un sixieme de la
    # largeur au moment ou on a besoin de lire des chiffres.
    ("admin-tableau",  "#/tableau",     "u2", 900),
    # L'apercu du premier ecran de la vitrine entreprise. Ce qu'il doit prouver
    # en une image, a six cents pixels de large : que la plateforme rend des
    # RESULTATS, en gros chiffres, et que ces resultats sont du vivant — des
    # arbres, des animaux, des colis. Le tableau de bord entier, reduit a cette
    # taille, ne prouve qu'une chose : qu'il existe un tableau de bord.
    ("apercu-resultats", "#/tableau",    "u2", (".realis", 320, 1100)),
    ("salarie-saison", "#/tableau",     "u5", ".card--dark"),
    # Fenetre etroite exprès. La grille d'annonces tient trois colonnes a 1 440,
    # et ces trois colonnes reduites a la largeur d'une demi-page de vitrine
    # donnent des cartes de cent cinquante pixels : on voit qu'il y a du texte,
    # on ne le lit pas. A 1 000, la grille retombe a une colonne, la carte fait
    # six cents pixels, et la capture prouve enfin ce qu'elle montre.
    ("salarie-actions","#/annonces",    "u5", ("#liste", 390, 1000, 30)),
    ("asso-tableau",   "#/tableau",     "u7", ".card--dark"),
    # La legende dit « confirmer une mission » : on cadre sur la table des
    # missions a confirmer, pas sur l'ecran qui la contient.
    ("asso-valider",   "#/avalider",    "u7", ("#aConfirmer", 380, 1200)),
    # La liste des missions. Le cadrage sautait jusqu'ici l'encart « les dons
    # personnels ne sont pas nominatifs » : un paragraphe de doctrine en haut
    # d'une capture legendee « chaque mission, son association, son etat », et le
    # lecteur cherche pendant trois secondes ce qu'il est cense regarder.
    ("missions",       "#/missions",    "u2", ("#tableMissions", 560, 1300)),
    ("rapports",       "#/rapports",    "u2", ("#tableRapports", 600, 1300)),
    # Le mecenat s'ouvrait sur « Calcul incomplet, 2 controles sur 8 ». C'est
    # exact, c'est meme le comportement dont on est le plus fier, mais en vitrine
    # ca se lit comme un produit en panne. La legende annonce le calcul : on
    # montre le calcul, ligne par ligne.
    ("mecenat",        "#/mecenat",     "u2", ("#calcul", 620, 1200)),
    ("indicateurs",    "#/indicateurs", "u2", (".main", 640, 1440, 70)),
    # La legende « formule comprise » promettait une formule que la capture ne
    # montrait pas : c'etait deux fois le meme ecran de collecte sous deux
    # legendes differentes. Celle-ci montre le tableau consolide, ou chaque taux
    # porte sa formule sous son libelle.
    ("indicateurs-formule", "#/indicateurs", "u2", ("#consolide", 620, 1200)),
    ("groupe",         "#/groupe",      "u2", ("#societes", 520, 1300)),
    ("classement",     "#/classement",  "u2", 860),
    ("materiel",       "#/materiel",    "u2", 860),
]

class Silencieux(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

@contextlib.contextmanager
def serveur():
    h = functools.partial(Silencieux, directory=str(RACINE))
    socketserver.TCPServer.allow_reuse_address = True
    # Serveur a fils d'execution. Le serveur simple traite une requete a la
    # fois : le navigateur en ouvre six en parallele pour les polices et les
    # modules, la sixieme attend la premiere, et au bout de trente secondes la
    # capture tombe en timeout sans qu'aucune page soit en cause.
    class Fil(socketserver.ThreadingMixIn, socketserver.TCPServer):
        daemon_threads = True
    with Fil(("127.0.0.1", PORT), h) as srv:
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
            large_vue = cadrage[2] if isinstance(cadrage, tuple) and len(cadrage) > 2 else 1440
            cadrage_y0 = cadrage[3] if isinstance(cadrage, tuple) and len(cadrage) > 3 else 0
            p.set_viewport_size({"width": large_vue, "height": 900})
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
                cadrage, haut = cadrage[0], cadrage[1]
            if isinstance(cadrage, str):
                # La barre du haut est collante : elle se repeint par-dessus le
                # haut de l'element vise, et la capture commence par un bout de
                # titre coupe en deux. On la retire pour la photo.
                p.evaluate("()=>{const s=document.createElement('style');"
                           "s.textContent='.topbar{display:none!important}';"
                           "document.head.appendChild(s)}")
                p.wait_for_timeout(150)
                el = p.query_selector(cadrage)
                if el is None:
                    erreurs.append(f"{nom} : aucun élément « {cadrage} »")
                    continue
                el.scroll_into_view_if_needed()
                p.wait_for_timeout(250)
                el.screenshot(path=str(brut))
            else:
                p.screenshot(path=str(brut), clip={"x": 0, "y": 0, "width": large_vue,
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
                # `y0` coupe le haut : la ligne « 25 annonces ouvertes » est deja
                # dite par la legende de la vitrine, et son « 2 » se faisait
                # rogner par le coin arrondi du cadre.
                y0 = cadrage_y0 * 2
                im = im.crop((0, y0, im.width, min(im.height, y0 + haut * 2)))
            # Une capture s'affiche sur la vitrine jusqu'à 1 250 pixels de large.
            # Sur un écran à double densité, il en faut le double pour qu'elle
            # soit nette : à 1 440, la capture du tableau de bord était affichée
            # à 1 118 et paraissait molle. On ne descend donc plus en dessous de
            # 1 920, et les captures cadrées sur un élément gardent leur pleine
            # résolution.
            # 1 920 ne suffisait pas. Une capture affichee a 1 238 pixels de
            # large sur un ecran a densite double en reclame 2 476 : a 1 920 il
            # manque un tiers de la matiere, et le manque se voit sur les petits
            # caracteres d'interface et sur les aplats clairs, ou la compression
            # laisse un halo. On monte donc a 2 560 et la qualite a 88. Le poids
            # double, et c'est le prix d'une capture qui prouve quelque chose :
            # une capture illisible ne prouve rien du tout.
            large = im.width if im.width <= 2560 else 2560
            im = im.resize((large, round(im.height * large / im.width)), Image.LANCZOS)
            im.save(SORTIE / f"{nom}.jpg", quality=88, optimize=True, progressive=True,
                    subsampling=0)
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
            large = min(2000, im.width)
            im = im.resize((large, round(im.height * large / im.width)), Image.LANCZOS)
            im.save(SORTIE / "affiche.jpg", quality=90, optimize=True, progressive=True,
                    subsampling=0)
            brut.unlink()
            ecrites.append(("affiche", (SORTIE / "affiche.jpg").stat().st_size // 1024))

            # Deux images derivees, ecrites ici pour qu'elles ne puissent pas
            # dater d'une version anterieure de l'affiche. La vitrine montrait
            # une affiche de synthese, coupee en bas, a cote de la vraie : deux
            # affiches differentes sur la meme ligne, et aucune des deux n'etait
            # celle que le client recevra.
            photos = RACINE / "photos"

            # 1. Le detail du bas : le code QR et le lien qu'il ouvre.
            w, h = im.size
            det = im.crop((int(w*0.055), int(h*0.655), int(w*0.945), int(h*0.815)))
            det = det.resize((1400, round(det.height * 1400 / det.width)), Image.LANCZOS)
            det.save(photos / "affiche-qr.jpg", quality=92, subsampling=0)
            ecrites.append(("affiche-qr", (photos / "affiche-qr.jpg").stat().st_size // 1024))

            # 2. L'affiche entiere, posee devant un plateau de bureaux. Le fond
            #    est l'ancienne mise en scene, floutee : il n'en reste que la
            #    lumiere et la paroi vitree, ce qu'on lui demandait.
            fond_src = photos / "bureau-flou.jpg"
            if fond_src.exists():
                fond = Image.open(fond_src).convert("RGB")
                fond = fond.resize((1640, 1140), Image.LANCZOS)
                aff = im.copy()
                HA = 1010
                WA = round(aff.width * HA / aff.height)
                aff = aff.resize((WA, HA), Image.LANCZOS).convert("RGBA")
                dh = round(HA * 0.022)
                cible = (WA, HA + 2*dh)
                pose = Image.new("RGBA", cible, (0, 0, 0, 0))
                pose.paste(aff.transform(cible, Image.QUAD,
                    (0, 0, 0, HA, WA, HA + dh, WA, -dh), Image.BICUBIC), (0, 0))
                ombre = Image.new("RGBA", pose.size, (0, 0, 0, 0))
                ombre.paste((18, 24, 20, 110), (0, 0), pose.split()[3])
                ombre = ombre.filter(ImageFilter.GaussianBlur(20))
                scene = fond.convert("RGBA")
                x = (scene.width - WA)//2
                y = (scene.height - pose.height)//2
                scene.alpha_composite(ombre, (x+10, y+16))
                scene.alpha_composite(pose, (x, y))
                scene.convert("RGB").save(photos / "affiche-bureau.jpg",
                                          quality=90, subsampling=0)
                ecrites.append(("affiche-bureau",
                                (photos / "affiche-bureau.jpg").stat().st_size // 1024))
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
