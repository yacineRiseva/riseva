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
    # remplace les <link rel=stylesheet local> par un <style>
    html = re.sub(r'\s*<link rel="stylesheet" href="/styles/[^"]+">', "", html)
    html = html.replace("</head>", f"<style>\n{css(*sheets)}\n</style>\n</head>")
    for k, v in IMGS.items():
        html = html.replace(k, v)
    return html

def strip_modules(src):
    src = re.sub(r'^\s*import[^;]+;\s*$', "", src, flags=re.M)
    src = re.sub(r'^\s*export\s+(const|function|async function|let)\s', r'\1 ', src, flags=re.M)
    src = re.sub(r'^\s*export\s+', "", src, flags=re.M)
    return src

# ---- site vitrine -----------------------------------------------------
site = (R/"index.html").read_text(encoding="utf-8")
# le compteur du réseau lit les vraies données : on embarque data.js et ui.js
site = site.replace('  import { DB } from "/app/data.js";\n  import { nb } from "/app/ui.js";',
                    "\n".join(strip_modules((R/"app"/f).read_text(encoding="utf-8"))
                              for f in ["data.js","ui.js"]))
site = inline(site, ["polices.css","tokens.css","base.css","components.css","marketing.css"])
(OUT/"riseva-site.html").write_text(site, encoding="utf-8")

# ---- application ------------------------------------------------------
bundle = "\n".join(strip_modules((R/"app"/f).read_text(encoding="utf-8"))
                   for f in ["data.js","ui.js","app.js"])
app = (R/"app"/"index.html").read_text(encoding="utf-8")
app = re.sub(r'\s*<script src="/app/config.js"[^>]*></script>', "", app)
app = app.replace('<script type="module" src="/app/app.js"></script>',
                  f"<script type=\"module\">\n{bundle}\n</script>")
app = inline(app, ["polices.css","tokens.css","base.css","components.css","app.css"])
(OUT/"riseva-app.html").write_text(app, encoding="utf-8")

# ---- page publique de rejointe ----------------------------------------
rej = (R/"rejoindre.html").read_text(encoding="utf-8")
rej = rej.replace('import { DB, BAREME } from "/app/data.js";', "")
rej = rej.replace('import { h, esc, nb, toast } from "/app/ui.js";', "")
rej = rej.replace('const code = new URLSearchParams(location.search).get("code") || "";',
                  'const code = new URLSearchParams(location.search).get("code") || "LAFARGE-7QK2";')
rej = rej.replace('<script type="module">',
                  '<script type="module">\n' + "\n".join(
                      strip_modules((R/"app"/f).read_text(encoding="utf-8"))
                      for f in ["data.js","ui.js"]))
rej = inline(rej, ["polices.css","tokens.css","base.css","components.css","app.css"])
(OUT/"riseva-rejoindre.html").write_text(rej, encoding="utf-8")

for f in OUT.iterdir():
    print(f.name, round(f.stat().st_size/1024), "Ko")
