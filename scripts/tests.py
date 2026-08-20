#!/usr/bin/env python3
"""Riseva — tests de bout en bout.

Lance un serveur local, ouvre l'application dans Chromium et vérifie les parcours
qui comptent. Sortie lisible : une ligne par test, un résumé, code de sortie non nul
au premier échec.

    python3 scripts/tests.py
"""
import http.server, socketserver, threading, functools, pathlib, sys, contextlib
from playwright.sync_api import sync_playwright

RACINE = pathlib.Path(__file__).resolve().parent.parent / "public"
PORT = 8123
BASE = f"http://127.0.0.1:{PORT}"

resultats = []
def verifie(nom, condition, detail=""):
    resultats.append((nom, bool(condition), detail))
    print(("  ok   " if condition else "  RATÉ ") + nom + (f"  [{detail}]" if detail and not condition else ""))

class Silencieux(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

@contextlib.contextmanager
def serveur():
    h = functools.partial(Silencieux, directory=str(RACINE))
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", PORT), h) as srv:
        t = threading.Thread(target=srv.serve_forever, daemon=True); t.start()
        try: yield
        finally: srv.shutdown()

def connecte(p, uid, route="#/tableau"):
    p.goto(f"{BASE}/app/", wait_until="domcontentloaded")
    p.evaluate("u=>localStorage.setItem('riseva.session',JSON.stringify({uid:u}))", uid)
    p.goto(f"{BASE}/app/?t=1{route}", wait_until="networkidle")
    p.wait_for_timeout(350)

def main():
    erreurs_js = []
    with serveur(), sync_playwright() as pw:
        nav = pw.chromium.launch()
        ctx = nav.new_context(viewport={"width": 1440, "height": 900}, locale="fr-FR")
        p = ctx.new_page()
        p.on("pageerror", lambda e: erreurs_js.append(str(e)))

        print("\nSite public")
        p.goto(BASE + "/", wait_until="networkidle")
        verifie("l'accueil affiche le titre", "Riseva le rend visible" in p.inner_text("h1"))
        verifie("le barème annoncé est celui du code",
                "150 pts" in p.inner_text("#bareme") and "100 pts" in p.inner_text("#bareme"))
        verifie("aucune promesse de tarif figé",
                "tarif restera" not in p.inner_text("body").lower())
        for page in ["inscription.html", "associations.html", "asso.html?id=a1",
                     "mentions.html", "cgu.html"]:
            p.goto(f"{BASE}/{page}", wait_until="networkidle")
            verifie(f"la page {page} se charge", len(p.inner_text("body")) > 400)

        print("\nToutes les vues, tous les rôles")
        for uid, role in [("u2","entreprise"), ("u4","salarié"), ("u7","association"), ("u1","Riseva")]:
            connecte(p, uid)
            liens = p.eval_on_selector_all(".side__link[href]", "l=>l.map(a=>a.getAttribute('href'))")
            for l in liens:
                p.evaluate("h=>location.hash=h.slice(1)", l); p.wait_for_timeout(200)
                verifie(f"{role} : {l}", len(p.inner_text(".content")) > 40)

        print("\nParcours d'une mission")
        connecte(p, "u4", "#/annonces")
        p.eval_on_selector_all(".offer button", "b=>b[0].click()"); p.wait_for_timeout(300)
        verifie("le calcul des points s'affiche", "points pour votre entreprise" in p.inner_text("#calc"))
        p.evaluate("()=>[...document.querySelectorAll('.modal .btn')].find(b=>/Confirmer/.test(b.textContent)).click()")
        p.wait_for_timeout(400)
        verifie("le salarié est positionné", "positionné" in p.inner_text(".toast"))
        p.evaluate("()=>location.hash='#/missions'"); p.wait_for_timeout(300)
        p.evaluate("()=>{const b=[...document.querySelectorAll('tbody button')].find(x=>/Déclarer/.test(x.textContent)); if(b)b.click()}")
        p.wait_for_timeout(300)
        verifie("la mission passe à valider", "confirmation" in p.inner_text(".toast"))

        print("\nQuota de places et anonymisation")
        connecte(p, "u2", "#/equipe")
        avant = p.inner_text(".kpi--tete .kpi__value")
        p.evaluate("""()=>{const l=[...document.querySelectorAll('tbody tr')].find(r=>/Malik/.test(r.innerText));
          [...l.querySelectorAll('button')].find(b=>b.textContent==='Retirer').click()}""")
        p.wait_for_timeout(250)
        p.evaluate("()=>[...document.querySelectorAll('.modal .btn')].find(b=>/Retirer et/.test(b.textContent)).click()")
        p.wait_for_timeout(500)
        apres = p.inner_text(".kpi--tete .kpi__value")
        verifie("la place est rendue", avant != apres, f"{avant} -> {apres}")
        verifie("le salarié est anonymisé", "Salarié retiré" in p.inner_text("tbody"))
        verifie("son email a disparu", "malik@" not in p.inner_text("tbody"))
        # le dernier administrateur ne peut pas se retirer lui-même
        etat = p.evaluate("""()=>{const l=[...document.querySelectorAll('tbody tr')].find(r=>/Claire/.test(r.innerText));
          const b=[...l.querySelectorAll('button')].find(x=>x.textContent==='Retirer'); return !!(b&&b.disabled)}""")
        verifie("le dernier administrateur est protégé", etat)
        p.evaluate("()=>location.hash='#/missions'"); p.wait_for_timeout(300)
        verifie("l'historique est anonymisé aussi", "Salarié retiré" in p.inner_text("tbody"))

        print("\nLien d'inscription")
        p.goto(f"{BASE}/rejoindre.html?code=LAFARGE-7QK2", wait_until="networkidle")
        p.wait_for_timeout(300)
        verifie("le nom de l'entreprise s'affiche", "Lafarge" in p.inner_text("h1"))
        p.fill("#nom", "Test Automatique"); p.fill("#mail", "test.auto@lafarge-ciments.fr")
        p.check("input[type=checkbox]"); p.click("button[type=submit]"); p.wait_for_timeout(400)
        verifie("le compte est créé", "Bienvenue" in p.inner_text("h1"))
        p.goto(f"{BASE}/rejoindre.html?code=INEXISTANT-0000", wait_until="networkidle")
        p.wait_for_timeout(300)
        verifie("un code inconnu est refusé", "n'existe pas" in p.inner_text("body"))

        print("\nAssociation")
        connecte(p, "u7", "#/mesannonces")
        n0 = p.eval_on_selector_all("tbody tr", "r=>r.length")
        p.evaluate("()=>document.querySelector('#np').click()"); p.wait_for_timeout(250)
        p.fill("#titre", "Test"); p.fill("#desc", "Description de test.")
        p.evaluate("()=>[...document.querySelectorAll('.modal .btn')].find(b=>/Publier/.test(b.textContent)).click()")
        p.wait_for_timeout(400)
        verifie("une annonce peut être publiée", p.eval_on_selector_all("tbody tr", "r=>r.length") == n0 + 1)
        p.evaluate("()=>[...document.querySelectorAll('tbody button')].find(b=>b.textContent==='Fermer').click()")
        p.wait_for_timeout(300)
        verifie("une annonce peut être fermée", "Close" in p.inner_text("tbody"))
        connecte(p, "u7", "#/avalider")
        p.evaluate("()=>{const b=[...document.querySelectorAll('tbody button')].find(x=>x.textContent==='Confirmer'); if(b)b.click()}")
        p.wait_for_timeout(400)
        verifie("une mission peut être confirmée", "créditée" in p.inner_text(".toast") or "crédités" in p.inner_text(".toast"))

        print("\nEspace Riseva")
        connecte(p, "u1", "#/saison")
        p.fill("#nom", "Saison test"); p.click("#save"); p.wait_for_timeout(400)
        verifie("la saison est enregistrée", "Saison test" in p.inner_text(".topbar"))
        connecte(p, "u1", "#/journal")
        verifie("le journal liste des envois", p.eval_on_selector_all("tbody tr", "r=>r.length") > 3)

        print("\nAccessibilité et robustesse")
        p.goto(BASE + "/", wait_until="networkidle")
        sans_alt = p.eval_on_selector_all("img", "l=>l.filter(i=>!i.hasAttribute('alt')).length")
        verifie("toutes les images ont un alt", sans_alt == 0, f"{sans_alt} sans alt")
        p.set_viewport_size({"width": 390, "height": 844})
        connecte(p, "u2")
        verifie("le menu mobile existe", p.is_visible("#burger"))
        p.click("#burger"); p.wait_for_timeout(300)
        verifie("le menu mobile s'ouvre", p.eval_on_selector(".side", "e=>e.classList.contains('is-open')"))

        nav.close()

    verifie("aucune erreur JavaScript", not erreurs_js, "; ".join(erreurs_js[:3]))

    total = len(resultats); rates = [r for r in resultats if not r[1]]
    print(f"\n{total - len(rates)} / {total} tests passés")
    if rates:
        print("\nÉchecs :")
        for nom, _, detail in rates: print(f"  - {nom} {detail}")
        sys.exit(1)
    print("Tout est vert.")

if __name__ == "__main__":
    main()
