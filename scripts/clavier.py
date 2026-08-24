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

main()
