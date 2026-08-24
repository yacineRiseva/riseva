#!/usr/bin/env python3
"""Ce qui s'affiche doit pouvoir se taper.

    python3 scripts/clavier.py            # rapport
    python3 scripts/clavier.py --strict   # sort en erreur au premier caractère

Pourquoi cette recette existe. Un tiret cadratin, une apostrophe courbe, une
espace fine insécable ou un point médian ne sont sur aucun clavier français.
Trois conséquences, dans cet ordre d'importance :

  1. Ils signent la machine. Un texte commercial ponctué de tirets cadratins est
     immédiatement lu comme engendré, et ce jugement contamine le produit entier.
  2. Ils voyagent mal. Recopiés dans un courriel, un CRM, un tableur ou un devis,
     ils deviennent des points d'interrogation ou des losanges.
  3. On ne peut plus les chercher. Personne ne retrouve « rendez-vous » dans une
     page qui contient « rendez‑vous » avec un trait d'union insécable.

La mesure porte sur le TEXTE RENDU, pas sur les sources : ce sont les caractères
que le visiteur voit et copie qui comptent, et un commentaire de code peut
contenir ce qu'il veut. Les entités HTML sont donc résolues au moment où on
mesure, ce qui est exactement le bon niveau : `&nbsp;` est tapable, l'espace
insécable qu'il produit ne l'est pas, et c'est la première forme qui vit dans
le fichier source.
"""
from playwright.sync_api import sync_playwright
import sys, collections, unicodedata

# Le port est celui du serveur que `verifier.py` monte pour la recette. On le
# laisse surchargeable pour pouvoir relancer cette seule verification contre un
# serveur deja lance, sans attendre les dix minutes de la recette complete.
import os
BASE = "http://127.0.0.1:" + os.environ.get("RISEVA_PORT", "8080")

# Ce qu'un clavier français produit, directement ou avec la touche AltGr, plus
# les majuscules accentuées et les guillemets français, qui sont la ponctuation
# normale de la langue et non un artifice typographique.
CLAVIER = set(
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    " \t\n\r "
    "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~"
    "àâäçéèêëîïôöùûüÿœæÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸŒÆ"
    "€°²³§µ«»©®")

# Une espace fine insecable rendue par le navigateur n'est pas une espace fine
# ecrite par un auteur. Chrome restitue `&nbsp;` tantot en U+00A0, tantot en
# U+202F selon le chemin de rendu : le meme fichier, servi par le meme serveur,
# donne l'un ou l'autre d'une execution a l'autre. On a passe une heure a
# chercher dans les sources un caractere qui n'y etait pas.
#
# La regle ne change pas pour autant : ce qui doit etre interdit, c'est ce qu'un
# auteur ECRIT. La mesure sur le rendu garde donc tout son sens pour le tiret
# cadratin, l'apostrophe courbe et le point median, qui n'apparaissent jamais
# spontanement ; et les deux insecables sont ramenees l'une a l'autre, parce que
# la source, elle, ne contient que `&nbsp;`. Le controle des sources ci-dessous
# ferme la porte de l'autre cote.
EQUIVALENTS = {"\u202f": "\u00a0"}

PAGES = [
    ("accueil",            "/",                      None),
    ("associations",       "/associations.html",     None),
    ("fiche association",  "/asso.html?id=a2",       None),
    ("rejoindre",          "/rejoindre.html",        None),
    ("inscription",        "/inscription.html",      None),
    ("règlement",          "/reglement.html",        None),
    ("CGV",                "/cgv.html",              None),
    ("engagements",        "/engagements.html",      None),
    ("charte associations","/charte-associations.html", None),
    ("tableau de bord",    "/app/#/tableau",         "u2"),
    ("indicateurs",        "/app/#/indicateurs",     "u2"),
    ("rapports",           "/app/#/rapports",        "u2"),
    ("mécénat",            "/app/#/mecenat",         "u2"),
    ("abonnement",         "/app/#/abonnement",      "u2"),
    ("annonces",           "/app/#/annonces",        "u2"),
    ("classement",         "/app/#/classement",      "u2"),
    ("site référent",      "/app/#/indicateurs",     "u10"),
    ("association",        "/app/#/tableau",         "u7"),
    ("salarié",            "/app/#/tableau",         "u3"),
]

def main():
    trouve = collections.defaultdict(list)
    compte = collections.Counter()
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        ctx = b.new_context(viewport={"width": 1440, "height": 900}, locale="fr-FR")
        p = ctx.new_page()
        for nom, chemin, uid in PAGES:
            p.goto(BASE + "/app/", wait_until="domcontentloaded")
            if uid:
                p.evaluate("u=>localStorage.setItem('riseva.session',JSON.stringify({uid:u}))", uid)
            else:
                p.evaluate("()=>localStorage.removeItem('riseva.session')")
            p.goto(BASE + chemin.replace("/app/", "/app/?r=1"), wait_until="networkidle")
            p.wait_for_timeout(400)
            texte = p.evaluate("() => document.body.innerText")
            for avant, apres in EQUIVALENTS.items():
                texte = texte.replace(avant, apres)
            for i, ch in enumerate(texte):
                if ch in CLAVIER:
                    continue
                compte[ch] += 1
                if len(trouve[ch]) < 3:
                    trouve[ch].append((nom, texte[max(0, i - 34):i + 34].replace("\n", " ")))
        b.close()

    if not compte:
        print(f"{len(PAGES)} pages lues. Tout le texte affiché se tape sur un clavier.")
        return
    print(f"{sum(compte.values())} caractères hors clavier, "
          f"{len(compte)} distincts, sur {len(PAGES)} pages.\n")
    for ch, n in compte.most_common():
        print(f"U+{ord(ch):04X}  {unicodedata.name(ch, '?')[:38]:40} x{n}")
        for page, extrait in trouve[ch]:
            print(f"        {page:<18} ...{extrait.strip()}...")
        print()
    if "--strict" in sys.argv:
        sys.exit(1)


def sources():
    """Le meme interdit, mais sur ce qui est ECRIT.

    Deterministe, sans navigateur : on lit les fichiers produits et le
    generateur qui les ecrit. C'est ce controle-la qui empeche un tiret cadratin
    d'entrer dans le depot ; celui du rendu attrape ce qui aurait echappe."""
    import pathlib, re
    racine = pathlib.Path(__file__).resolve().parent.parent
    interdits = {"\u2014": "tiret cadratin", "\u2013": "tiret demi-cadratin",
                 "\u2019": "apostrophe courbe", "\u00b7": "point median",
                 "\u202f": "espace fine insecable", "\u2026": "points de suspension"}
    fautes = []
    for f in sorted((racine / "public").glob("*.html")):
        t = f.read_text(encoding="utf-8")
        # Les commentaires HTML et les blocs de script ne s'affichent pas.
        t = re.sub(r"<!--.*?-->", "", t, flags=re.S)
        t = re.sub(r"<script.*?</script>", "", t, flags=re.S)
        for ch, nom in interdits.items():
            n = t.count(ch)
            if n:
                i = t.index(ch)
                fautes.append((f.name, nom, n, t[max(0, i - 40):i + 30].replace("\n", " ")))
    if not fautes:
        print("Sources : aucun caractere interdit dans les pages produites.")
        return 0
    print("\nDans les sources :")
    for nom_f, nom_c, n, extrait in fautes:
        print(f"  {nom_f:<24} {nom_c} x{n}")
        print(f"      ...{extrait.strip()}...")
    return 1


main()
if sources() and "--strict" in sys.argv:
    sys.exit(1)
