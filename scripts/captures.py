#!/usr/bin/env python3
"""Les captures de la vitrine, prises dans l'application elle-même.

    python3 scripts/captures.py

Pourquoi ce fichier existe. La vitrine vendait le produit avec seize photos de
banque d'images, des cadres souriants en open space, pour un produit dont le
métier est le ramassage de déchets en rivière, la plantation d'arbres et les
refuges animaliers. Une photo d'illustration n'est pas une preuve, et une
légende « photo d'illustration, aucune mise en scène » ne la rachète pas : elle
confirme au lecteur que l'image ne prouve rien.

Faute de photographies réelles de chantier, Riseva n'en a aucune à ce stade, la
seule preuve disponible est le produit. Ces captures sont donc prises sur la
vraie application, avec le vrai jeu de démonstration, à chaque exécution. Elles
vieillissent avec le produit au lieu de vieillir contre lui : un écran qui
change casse la capture au prochain passage, et c'est exactement ce qu'on veut.

Chaque capture est recadrée sur l'objet qui prouve la phrase écrite à côté sur
la vitrine : une carte d'annonce, une ligne de mission, une page de
confirmation. Une page entière réduite à la largeur d'une colonne ne se lit pas,
et une capture illisible est une image décorative de plus.

Depuis la refonte de septembre 2026, les captures sont prises avec les vraies
polices du site (Instrument Sans et Inter, servies depuis /brand/polices/). La
substitution par Carlito qui compensait leur absence a disparu avec elle.

L'application est ouverte avec `?demo=1` : c'est ce qui fait apparaître le
bandeau « Démonstration » dans sa barre du haut. Sur les captures qui montrent
cette barre, la mention est donc dans l'image ; pour les autres, la vitrine dit
une fois, en clair, que les écrans viennent du jeu de démonstration.
"""
import http.server, socketserver, threading, functools, pathlib, contextlib, re, sys
from playwright.sync_api import sync_playwright
from PIL import Image

RACINE = pathlib.Path(__file__).resolve().parent.parent
PUBLIC = RACINE / "public"
SORTIE = PUBLIC / "captures"
PORT = 8099
BASE = f"http://127.0.0.1:{PORT}"

# Les vignettes des annonces sont les photographies de couverture du jeu de
# démonstration : des images d'illustration, exactement ce que la vitrine ne
# montre plus. Sur une capture de carte, elles sont remplacées par l'aplat de
# la charte ; la carte garde son bandeau, le nom de l'association et les points.
SANS_VIGNETTE = (".annonce__haut .vignette{visibility:hidden}"
                 ".annonce__haut{background:var(--forest-800)}")

# Chaque capture : le fichier produit, l'utilisateur du jeu de démonstration,
# la route, et la façon de cadrer.
#   selecteur : l'élément photographié (sinon le haut de la fenêtre) ;
#   largeur   : largeur de la fenêtre, quand la mise en page doit être plus
#               étroite pour que l'objet soit lisible une fois réduit ;
#   hauteur   : hauteur retenue depuis le haut de l'objet, pour couper une
#               liste qu'on ne lirait pas en entier ;
#   css       : styles injectés avant la photo ;
#   avant     : une action à faire avant (un clic qui ouvre un formulaire).
# u2 : Claire Fontaine, administratrice de Vaudrey Ciments ; u7 : Élise
# Tournier, Refuge des Quatre Vents ; u9 : Paul Girard, salarié du Groupe
# Vidal à Lille, dont la première annonce visible est à zéro kilomètre.
ECRANS = [
    # Le seul plan large : celui-là doit montrer QUE c'est une application, avec
    # sa navigation et la barre qui dit « Démonstration ».
    # Coupé sous la carte des résultats, à une frontière de carte : le premier
    # écran de la vitrine montre la barre, les quatre chiffres et la carte
    # sombre, pas la liste des sites qui suit.
    dict(nom="admin-tableau", uid="u2", route="#/tableau", hauteur=568),
    # Le même écran, dans la mise en page que l'application prend sur un
    # téléphone : c'est lui que la vitrine sert sous 640 px, entier, plutôt
    # qu'un tableau de bord d'ordinateur réduit à 350 px ou découpé au milieu
    # d'une carte. Coupé sous la troisième carte, à une frontière de carte.
    dict(nom="admin-tableau-mobile", uid="u2", route="#/tableau", largeur=430, hauteur=830),
    # Le mécanisme, en quatre objets. Chacun a sa variante « -mobile », prise
    # dans la mise en page téléphone de l'application (fenêtre de 430 px) : la
    # vitrine la sert sous 640 px à la place de l'écran d'ordinateur réduit.
    dict(nom="annonce-carte", uid="u9", route="#/annonces",
         selecteur="article.annonce", largeur=1300, css=SANS_VIGNETTE),
    dict(nom="annonce-carte-mobile", uid="u9", route="#/annonces",
         selecteur="article.annonce", largeur=430, css=SANS_VIGNETTE),
    # La carte « qui vient » est petite par nature : prise en triple densité,
    # elle supporte d'être affichée un peu plus grande que nature sur son tapis.
    dict(nom="qui-vient", uid="u7", route="#/tableau", selecteur="section.card:has(#qui)", densite=3),
    # Trois lignes, trois états : en attente de l'association, engagée,
    # clôturée sans confirmation. C'est la phrase de la vitrine, en image. Les
    # colonnes association et points sont masquées : ce fragment tient dans une
    # colonne de la vitrine, et une ligne coupée au milieu ne prouve rien. Sur
    # téléphone, seules la mission et son état restent : c'est ce que la phrase
    # d'à côté démontre.
    dict(nom="mission-lignes", uid="u2", route="#/missions", selecteur="#tableMissions",
         largeur=1000,
         css="#tableMissions tbody tr:nth-child(-n+3),#tableMissions tbody tr:nth-child(n+7),"
             "#tableMissions th:nth-child(2),#tableMissions td:nth-child(2),"
             "#tableMissions th:nth-child(5),#tableMissions td:nth-child(5){display:none}"),
    dict(nom="mission-lignes-mobile", uid="u2", route="#/missions", selecteur="#tableMissions",
         largeur=430,
         css="#tableMissions tbody tr:nth-child(-n+3),#tableMissions tbody tr:nth-child(n+7),"
             + ",".join(f"#tableMissions th:nth-child({n}),#tableMissions td:nth-child({n})"
                        for n in (2, 3, 4, 5, 7)) + "{display:none}"),
    # Ce que l'entreprise ne refait plus à la main. Fenêtres étroites exprès :
    # ces tableaux s'affichent sur la vitrine entre 560 et 700 pixels de large,
    # et une capture prise à 1 440 y perd la moitié de sa taille de caractère.
    # « Combien de vos sites ont répondu ? » : la carte de la collecte répond
    # mot pour mot (sites qui ont répondu, approuvés, en attente, échéance).
    dict(nom="collecte", uid="u2", route="#/indicateurs",
         selecteur='section.card:has(h3:has-text("Collecte des indicateurs"))', largeur=1100),
    dict(nom="collecte-mobile", uid="u2", route="#/indicateurs",
         selecteur='section.card:has(h3:has-text("Collecte des indicateurs"))', largeur=430),
    # Deux indicateurs, avec leur formule : la carte s'arrete a une frontiere
    # de ligne, pas au milieu d'un texte.
    dict(nom="indicateurs-formule", uid="u2", route="#/indicateurs",
         selecteur="#consolide", css="#consolide tbody tr:nth-child(n+3),#consolide .hint{display:none}"),
    # Sur téléphone, le tableau consolidé garde son premier indicateur :
    # la formule, la valeur approuvée et la valeur provisoire, sans la page
    # entière qui ferait trois mille pixels.
    dict(nom="indicateurs-formule-mobile", uid="u2", route="#/indicateurs",
         selecteur="#consolide", largeur=430,
         css="#consolide tbody tr:nth-child(n+2),#consolide .hint{display:none}"),
    dict(nom="missions", uid="u2", route="#/missions", selecteur="#tableMissions",
         largeur=1200, css="#tableMissions tbody tr:nth-child(n+6){display:none}"),
    dict(nom="missions-mobile", uid="u2", route="#/missions", selecteur="#tableMissions",
         largeur=430,
         css="#tableMissions tbody tr:nth-child(n+6),"
             + ",".join(f"#tableMissions th:nth-child({n}),#tableMissions td:nth-child({n})"
                        for n in (2, 3, 4, 5, 7)) + "{display:none}"),
    dict(nom="rapports", uid="u2", route="#/rapports", selecteur="#tableRapports",
         largeur=1200, css="#tableRapports .hint{display:none}"),
    dict(nom="rapports-mobile", uid="u2", route="#/rapports", selecteur="#tableRapports",
         largeur=430,
         css=",".join(f"#tableRapports th:nth-child({n}),#tableRapports td:nth-child({n})"
                      for n in (2, 3, 5, 6)) + "{display:none}"),
    # Ce que l'association fait et garde en main.
    dict(nom="annonce-formulaire", uid="u7", route="#/mesannonces",
         avant="#np", selecteur=".modal", hauteur=520,
         # Le voile sombre derrière la fenêtre apparaissait dans ses coins
         # arrondis : pour la photo, il prend la couleur du papier.
         css=".overlay{background:var(--paper)!important;backdrop-filter:none!important}"),
    dict(nom="annonce-formulaire-mobile", uid="u7", route="#/mesannonces",
         avant="#np", selecteur=".modal", largeur=430, hauteur=610,
         css=".overlay{background:var(--paper)!important;backdrop-filter:none!important}"),
    # Fenêtre étroite exprès : à 1 440 le texte de cette carte n'occupe que la
    # moitié de sa largeur, et réduit sur la vitrine il ne se lit plus.
    dict(nom="autour", uid="u7", route="#/tableau", selecteur="#autour", largeur=1000),
    dict(nom="autour-mobile", uid="u7", route="#/tableau", selecteur="#autour", largeur=430),
    dict(nom="export-ca", uid="u7", route="#/tableau", selecteur="section.card:has(#expA)", densite=3),
]

class Silencieux(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

@contextlib.contextmanager
def serveur():
    h = functools.partial(Silencieux, directory=str(PUBLIC))
    socketserver.TCPServer.allow_reuse_address = True
    # Serveur à fils d'exécution : le navigateur ouvre six requêtes en parallèle
    # pour les polices et les modules, et un serveur qui les sert une à une
    # fait tomber la première capture en attente.
    class Fil(socketserver.ThreadingMixIn, socketserver.TCPServer):
        daemon_threads = True
    with Fil(("127.0.0.1", PORT), h) as srv:
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        try: yield
        finally: srv.shutdown()


def enregistrer(brut, nom, hauteur=None, large_max=2560, qualite=88, densite=2):
    """Le PNG en double densité devient un JPEG à la largeur utile.

    Une capture s'affiche sur la vitrine jusqu'à 1 250 pixels de large ; sur un
    écran à densité double il en faut le double pour qu'elle soit nette, d'où
    2 560. Les captures cadrées sur un petit élément gardent leur résolution."""
    im = Image.open(brut).convert("RGB")
    if hauteur:
        im = im.crop((0, 0, im.width, min(im.height, hauteur * densite)))
    large = min(im.width, large_max)
    im = im.resize((large, round(im.height * large / im.width)), Image.LANCZOS)
    im.save(SORTIE / f"{nom}.jpg", quality=qualite, optimize=True, progressive=True,
            subsampling=0)
    brut.unlink()
    return (SORTIE / f"{nom}.jpg").stat().st_size // 1024


def page_confirmation():
    """La page qu'ouvre le courriel de confirmation, telle que la sert la fonction.

    Le gabarit est lu dans `supabase/functions/valider-mission/index.ts`, pas
    recopié : si la page change, la capture change avec elle. On en extrait la
    feuille de style et le formulaire de la réponse GET, et on remplace les
    expressions du gabarit par des valeurs neutres."""
    src = (RACINE / "supabase" / "functions" / "valider-mission" / "index.ts").read_text(encoding="utf-8")
    style = re.search(r"<style>(.*?)</style>", src, re.S).group(1)
    pied = re.search(r'<p class="pied">(.*?)</p>', src, re.S).group(1)
    corps = re.search(r'return cadre\("Cette mission a-t-elle eu lieu \?", `(.*?)`\);', src, re.S).group(1)
    corps = re.sub(r"<!--.*?-->", "", corps, flags=re.S)
    corps = corps.replace("${echappe(url.origin + url.pathname)}", "#").replace("${echappe(jeton)}", "")
    # Le pied de page (la note des quatorze jours) n'est pas photographié : la
    # vitrine l'écrit à côté de l'image, et la capture doit tenir dans une
    # colonne sans être coupée, ce qu'une capture d'écran ne supporte pas.
    # La fonction sert la page avec la pile système du visiteur (sa politique
    # de sécurité n'autorise aucune police extérieure). Pour la capture, Inter,
    # la police d'interface du site, tient ce rôle : c'est la même page, avec
    # la police qu'un poste de bureau lui donnerait.
    return f"""<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<link rel="stylesheet" href="/styles/polices.css">
<style>{style}
body{{font-family:'Inter',system-ui,sans-serif;padding:36px 24px 28px}}
.pied{{display:none}}</style></head>
<body><h1>Cette mission a-t-elle eu lieu ?</h1>{corps}
<p class="pied">{pied}</p></body></html>"""


def main():
    SORTIE.mkdir(parents=True, exist_ok=True)
    erreurs, ecrites = [], []
    # La page de confirmation est servie depuis le dossier public le temps de
    # la capture, puis retirée : ce n'est pas une page du site.
    conf = PUBLIC / "_confirmation-capture.html"
    conf.write_text(page_confirmation(), encoding="utf-8")
    try:
        with serveur(), sync_playwright() as pw:
            b = pw.chromium.launch()
            contextes = {}
            def contexte(densite):
                if densite not in contextes:
                    c = b.new_context(viewport={"width": 1440, "height": 900},
                                      device_scale_factor=densite, locale="fr-FR")
                    q = c.new_page()
                    q.on("pageerror", lambda err: erreurs.append(str(err)))
                    contextes[densite] = q
                return contextes[densite]
            for e in ECRANS:
                nom = e["nom"]
                p = contexte(e.get("densite", 2))
                p.set_viewport_size({"width": e.get("largeur", 1440), "height": 900})
                p.goto(f"{BASE}/app/", wait_until="domcontentloaded")
                p.evaluate("()=>localStorage.removeItem('riseva.etat')")
                p.evaluate("u=>localStorage.setItem('riseva.session',JSON.stringify({uid:u}))", e["uid"])
                p.goto(f"{BASE}/app/?demo=1{e['route']}", wait_until="networkidle")
                # Certains champs se remplissent après le premier rendu (les
                # quotas des sites, par exemple) : on leur laisse le temps.
                p.wait_for_timeout(1000)
                p.evaluate("()=>document.fonts.ready")
                if e.get("css"):
                    p.add_style_tag(content=e["css"])
                if e.get("avant"):
                    p.evaluate("s=>document.querySelector(s).click()", e["avant"])
                    p.wait_for_timeout(400)
                brut = SORTIE / f"{nom}.png"
                if e.get("selecteur"):
                    # La barre du haut est collante : elle se repeint par-dessus
                    # l'élément visé. On la retire pour la photo.
                    p.add_style_tag(content=".topbar{display:none!important}")
                    p.wait_for_timeout(150)
                    el = p.query_selector(e["selecteur"])
                    if el is None:
                        erreurs.append(f"{nom} : aucun élément « {e['selecteur']} »"); continue
                    el.scroll_into_view_if_needed(); p.wait_for_timeout(250)
                    el.screenshot(path=str(brut))
                else:
                    p.screenshot(path=str(brut), clip={"x": 0, "y": 0, "width": e.get("largeur", 1440),
                                                       "height": e.get("hauteur", 900)})
                ecrites.append((nom, enregistrer(brut, nom, e.get("hauteur") if e.get("selecteur") else None,
                                                 densite=e.get("densite", 2))))

            # ── la page de confirmation ─────────────────────────────────────
            # Deux largeurs : celle d'une colonne de la vitrine, et celle d'un
            # téléphone, puisque c'est là qu'un courriel s'ouvre le plus souvent.
            p = contexte(2)
            for largeur, nom in ((640, "confirmation"), (390, "confirmation-mobile")):
                p.set_viewport_size({"width": largeur, "height": 900})
                p.goto(f"{BASE}/_confirmation-capture.html", wait_until="networkidle")
                p.evaluate("()=>document.fonts.ready"); p.wait_for_timeout(300)
                brut = SORTIE / f"{nom}.png"
                p.locator("body").screenshot(path=str(brut))
                ecrites.append((nom, enregistrer(brut, nom)))

            # ── l'affiche ──────────────────────────────────────────────────
            # Le seul support imprimé du produit, fabriqué dans l'application
            # avec le lien d'inscription de l'entreprise dedans. La montrer telle
            # qu'elle sort de la machine est plus vrai qu'une mise en scène.
            try:
                p.set_viewport_size({"width": 1440, "height": 900})
                p.goto(f"{BASE}/app/", wait_until="domcontentloaded")
                p.evaluate("()=>localStorage.removeItem('riseva.etat')")
                p.evaluate("()=>localStorage.setItem('riseva.session',JSON.stringify({uid:'u2'}))")
                p.goto(f"{BASE}/app/?demo=1#/supports", wait_until="networkidle")
                p.wait_for_timeout(600)
                with p.expect_popup() as pop:
                    p.click("#affiche")
                a = pop.value
                a.wait_for_load_state("domcontentloaded")
                # Le pied de l'affiche additionne les associations et les missions du
                # jeu de démonstration : un total inventé n'a rien à faire sur la
                # vitrine, même en petits caractères. Il est effacé, l'adresse reste.
                a.add_style_tag(content=".noprint{display:none}.pied span:first-child{visibility:hidden}")
                a.evaluate("()=>document.fonts.ready"); a.wait_for_timeout(400)
                brut = SORTIE / "affiche.png"
                a.locator(".a4").screenshot(path=str(brut))
                im = Image.open(brut).convert("RGB")
                large = min(2000, im.width)
                im = im.resize((large, round(im.height * large / im.width)), Image.LANCZOS)
                im.save(SORTIE / "affiche.jpg", quality=90, optimize=True, progressive=True,
                        subsampling=0)
                brut.unlink()
                ecrites.append(("affiche", (SORTIE / "affiche.jpg").stat().st_size // 1024))

                a.close()
            except Exception as ex:  # noqa: BLE001
                erreurs.append(f"affiche : {ex}")
            b.close()
    finally:
        conf.unlink(missing_ok=True)

    for nom, ko in ecrites:
        print(f"  {nom}.jpg  {ko} Ko")

    # Les variantes WebP se refont ici, dans le même passage : une capture
    # refaite dont les variantes datent de la précédente est servie dans son
    # ancienne version par tous les navigateurs modernes, et personne ne le
    # voit en ouvrant le JPEG.
    import importlib.util
    spec = importlib.util.spec_from_file_location("images", RACINE / "scripts" / "images.py")
    images = importlib.util.module_from_spec(spec); spec.loader.exec_module(images)
    # Une capture qui n'est plus dans la liste part, avec ses variantes : un
    # fichier orphelin dans public/ est une image que plus personne ne relit.
    produites = {nom for nom, _ in ecrites}
    if not erreurs:
        for jpg in SORTIE.glob("*.jpg"):
            if jpg.stem not in produites:
                jpg.unlink(); print(f"  {jpg.name} retirée (plus dans la liste)")
    for dossier in (SORTIE, PUBLIC / "photos"):
        for webp in dossier.glob("*-*.webp"):
            racine = re.sub(r"-\d+$", "", webp.stem)
            if not (dossier / f"{racine}.jpg").exists():
                webp.unlink()
    n = sum(images.variantes(src)[0] for d in (SORTIE, PUBLIC / "photos") for src in d.glob("*.jpg"))
    print(f"  {n} variantes WebP refaites")
    if erreurs:
        print("\nErreurs :"); [print("  ", e) for e in erreurs]
        sys.exit(1)


if __name__ == "__main__":
    main()
