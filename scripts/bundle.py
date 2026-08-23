import base64, re, pathlib
R = pathlib.Path("/root/riseva/public")
OUT = pathlib.Path("/root/riseva/dist"); OUT.mkdir(exist_ok=True)

def b64(p):
    return "data:image/png;base64," + base64.b64encode((R/p).read_bytes()).decode()

IMGS = {
    "/brand/riseva-full.png": b64("brand/riseva-full.png"),
    "/brand/riseva-full-white.png": b64("brand/riseva-full-white.png"),
    "/brand/riseva-mark.png": b64("brand/riseva-mark.png"),
}

def css(*names):
    return "\n".join((R/"styles"/n).read_text(encoding="utf-8") for n in names)

def inline(html, sheets):
    """Remplace les feuilles liées par un <style>, et les logos par leurs octets.

    Le `</head>` visé est le DERNIER du fichier, pas le premier. L'application
    fabrique des documents imprimables — convention, reçu, rapport — et leur
    gabarit est écrit dans une chaîne de app.js, `</head>` compris. Une
    substitution naïve tombait sur celui-là et injectait toute la feuille de
    style au milieu du script : le bundle ne s'exécutait plus, sans que rien
    dans les sources n'ait bougé. La page rendait un écran blanc et le seul
    indice était un « Unexpected identifier » sur un mot pris dans un
    commentaire CSS."""
    html = re.sub(r'\s*<link rel="stylesheet" href="/styles/[^"]+">', "", html)
    i = html.rindex("</head>")
    html = html[:i] + f"<style>\n{css(*sheets)}\n</style>\n</head>" + html[i + len("</head>"):]
    for k, v in IMGS.items():
        html = html.replace(k, v)
    return html

def strip_modules(src):
    src = re.sub(r'^\s*import[^;]+;\s*$', "", src, flags=re.M)
    src = re.sub(r'^\s*export\s+(const|function|async function|let)\s', r'\1 ', src, flags=re.M)
    src = re.sub(r'^\s*export\s+', "", src, flags=re.M)
    return src

# ---- les deux vitrines ------------------------------------------------
# Un fichier autonome par vitrine : styles, script et photos embarqués, pour
# qu'un double-clic suffise à montrer le site sans serveur.
def photos(html):
    """Les illustrations ET les captures d'écran, embarquées.

    Une vitrine autonome dont les images pointent vers des chemins absolus ne
    montre rien : c'est le cas d'usage — un double-clic, sans serveur — qui est
    perdu, et il n'y a aucun message d'erreur pour le dire."""
    for dossier in ("photos", "photos/vignettes", "captures", "video"):
        for f in sorted((R/dossier).glob("*.jpg")):
            cle = f"/{dossier}/" + f.name
            if cle in html:
                html = html.replace(cle, "data:image/jpeg;base64,"
                                    + base64.b64encode(f.read_bytes()).decode())
    # La boucle vidéo aussi : un fichier autonome dont la vidéo pointe vers un
    # chemin absolu affiche son affiche et rien d'autre — ce qui n'est pas faux,
    # mais ce n'est pas ce qu'on voulait montrer.
    for f in sorted((R/"video").glob("*.*")):
        if f.suffix not in (".mp4", ".webm"):
            continue
        cle = "/video/" + f.name
        if cle in html:
            mime = "video/mp4" if f.suffix == ".mp4" else "video/webm"
            html = html.replace(cle, f"data:{mime};base64,"
                                + base64.b64encode(f.read_bytes()).decode())
    return html

for source, cible in [("index.html", "riseva-site.html"),
                      ("associations.html", "riseva-associations.html")]:
    v = (R/source).read_text(encoding="utf-8")
    v = re.sub(r'\s*<script src="/app/config.js"[^>]*></script>', "", v)
    v = inline(v, ["polices.css", "vitrine.css"])
    v = photos(v)
    v = v.replace('<script src="/vitrine.js" defer></script>',
                  "<script>\n" + (R/"vitrine.js").read_text(encoding="utf-8") + "\n</script>")
    (OUT/cible).write_text(v, encoding="utf-8")

# ---- application ------------------------------------------------------
bundle = "\n".join(strip_modules((R/"app"/f).read_text(encoding="utf-8"))
                   for f in ["qr.js","tableur.js","data.js","ui.js","app.js"])
# Les logos vivent aussi dans les gabarits que le script fabrique — la barre
# latérale, l'en-tête des documents imprimables. Ils sont substitués ici, sur le
# script, parce que la substitution faite sur le HTML ne l'atteint plus depuis
# qu'on inline avant d'injecter.
for _k, _v in IMGS.items():
    bundle = bundle.replace(_k, _v)
app = (R/"app"/"index.html").read_text(encoding="utf-8")
app = re.sub(r'\s*<script src="/app/config.js"[^>]*></script>', "", app)
# L'ordre compte : on inline d'abord, on injecte le script ensuite. Dans l'autre
# sens, les gabarits de documents que app.js porte dans ses chaînes deviennent des
# cibles pour les substitutions faites sur le HTML.
app = inline(app, ["polices.css","tokens.css","base.css","components.css","app.css"])
# Les vignettes des annonces vivent dans le script, pas dans le HTML : elles sont
# fabriquees par `vignette()` au moment du rendu. Sans cette substitution, un
# fichier autonome affiche une carte sur deux avec un rectangle casse.
# Les vignettes ne sont jamais ecrites en clair dans le script : leur chemin est
# construit a l'execution. On remplit donc le tableau que `ui.js` laisse vide.
_vig = ",".join(
    '"%s":"data:image/jpeg;base64,%s"' % (f.stem,
        base64.b64encode(f.read_bytes()).decode())
    for f in sorted((R/"photos"/"vignettes").glob("*.jpg")))
bundle = bundle.replace("const VIGNETTES = {};", "const VIGNETTES = {%s};" % _vig)
app = app.replace('<script type="module" src="/app/app.js"></script>',
                  f"<script type=\"module\">\n{bundle}\n</script>")
(OUT/"riseva-app.html").write_text(app, encoding="utf-8")

# ---- page publique de rejointe ----------------------------------------
rej = (R/"rejoindre.html").read_text(encoding="utf-8")
rej = rej.replace('import { DB, BAREME } from "/app/data.js";', "")
rej = rej.replace('import { h, esc, nb, toast } from "/app/ui.js";', "")
rej = rej.replace('const code = new URLSearchParams(location.search).get("code") || "";',
                  'const code = new URLSearchParams(location.search).get("code") || "VAUDREY-7QK2";')
rej = inline(rej, ["polices.css","tokens.css","base.css","components.css","app.css"])
rej = rej.replace('<script type="module">',
                  '<script type="module">\n' + "\n".join(
                      strip_modules((R/"app"/f).read_text(encoding="utf-8"))
                      for f in ["data.js","ui.js"]))
(OUT/"riseva-rejoindre.html").write_text(rej, encoding="utf-8")

for f in OUT.iterdir():
    print(f.name, round(f.stat().st_size/1024), "Ko")
