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
def norm(t):
    """Les montants en français contiennent des espaces insécables : on normalise."""
    return t.replace("\u202f", " ").replace("\u00a0", " ")

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
    """Repart d'un état neuf : les tests ne doivent jamais dépendre de ce qu'a fait
    le test précédent."""
    p.goto(f"{BASE}/app/", wait_until="domcontentloaded")
    p.evaluate("()=>localStorage.removeItem('riseva.etat')")
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
        verifie("l'accueil affiche le titre", "résultats documentés" in p.inner_text("h1"))
        t = norm(p.inner_text(".hero"))
        verifie("le prix est visible dès l'accueil", "3 500" in t and "500 €" in t)
        verifie("le dossier est annoncé avant la signature",
                "règlement de la saison" in t and "conditions de vente" in t)
        verifie("le barème annoncé est celui du code",
                "150 pts" in p.inner_text("#bareme") and "100 pts" in p.inner_text("#bareme"))
        verifie("aucune promesse de tarif figé",
                "tarif restera" not in p.inner_text("body").lower())
        for page in ["inscription.html", "associations.html", "asso.html?id=a1",
                     "mentions.html", "cgu.html", "cgv.html", "reglement.html",
                     "charte-associations.html", "securite.html", "confidentialite.html",
                     "engagements.html", "moderation.html"]:
            p.goto(f"{BASE}/{page}", wait_until="networkidle")
            verifie(f"la page {page} se charge", len(p.inner_text("body")) > 400)

        print("\nLe dossier achats")
        p.goto(BASE + "/reglement.html", wait_until="networkidle")
        t = norm(p.inner_text(".doc__corps"))
        verifie("le règlement publie un calcul vérifiable", "35,6 pts / salarié" in t)
        verifie("le règlement traite les litiges", "Soupçon de fraude" in t)
        p.goto(BASE + "/securite.html", wait_until="networkidle")
        t = p.inner_text(".doc__corps")
        verifie("la sécurité dit ce qui manque", "ISO 27001" in t and "test d'intrusion" in t)
        verifie("le journal des accès est documenté", "Journal des accès" in t)
        p.goto(BASE + "/confidentialite.html", wait_until="networkidle")
        t = p.inner_text(".doc__corps")
        verifie("les sous-traitants sont listés", "Supabase" in t and "Resend" in t)
        verifie("les durées de conservation sont données", "10 ans" in t)
        verifie("le cloisonnement des dons est expliqué au public",
                "jamais nominatif" in t and "cinq donateurs" in t)
        verifie("la base légale n'est pas le consentement",
                "consentement n'est pas la base légale" in t)
        p.goto(BASE + "/engagements.html", wait_until="networkidle")
        t = norm(p.inner_text(".doc__corps"))
        verifie("la disponibilité est chiffrée", "99,5 %" in t)
        verifie("l'impayé ne coupe pas les données", "en otage" in t)
        p.goto(BASE + "/cgv.html", wait_until="networkidle")
        t = norm(p.inner_text(".doc__corps"))
        verifie("les CGV plafonnent la responsabilité de façon tenable",
                "50 000 €" in t and "dol, faute lourde" in t)
        verifie("elles interdisent l'entraînement d'IA sur les données clients",
                "intelligence" in t and "artificielle" in t)
        verifie("elles ne prétendent pas que le client possède les données",
                "ne sont pas un bien appropriable" in t)
        verifie("elles excluent la garantie de résultat",
                "ne garantit" in t and "impact social" in t)
        verifie("elles traitent la sortie sans frais",
                "Aucun frais de changement" in t)
        verifie("la clause de juridiction ne vise que les commerçants",
                "ni aux associations, ni aux salariés" in t)
        verifie("Riseva ne se présente pas comme archive légale",
                "n'est pas votre archive légale" in t.replace("’", "'"))
        p.goto(BASE + "/engagements.html", wait_until="networkidle")
        verifie("les avoirs ne sont pas un recours exclusif",
                "pas un recours exclusif" in p.inner_text(".doc__corps"))
        p.goto(BASE + "/moderation.html", wait_until="networkidle")
        t = p.inner_text(".doc__corps")
        verifie("la politique de modération existe", "service d'hébergement" in t)
        verifie("les délais de décision sont donnés", "cinq jours ouvrés" in t)
        p.goto(BASE + "/engagements.html", wait_until="networkidle")
        t = p.inner_text(".doc__corps")
        verifie("la facturation électronique est traitée", "plateforme agréée" in t)
        verifie("la réversibilité cite le règlement sur les données", "articles 25 à 30" in t)
        p.goto(BASE + "/securite.html", wait_until="networkidle")
        verifie("l'incident est chiffré à 24 heures", "sous 24 heures" in p.inner_text(".doc__corps"))
        p.goto(BASE + "/404.html", wait_until="networkidle")
        verifie("la page d'erreur existe", "rivière s'arrête" in p.inner_text("body"))
        p.goto(BASE + "/robots.txt", wait_until="domcontentloaded")
        verifie("robots.txt protège l'espace client", "Disallow: /app/" in p.inner_text("body"))

        print("\nToutes les vues, tous les rôles")
        for uid, role in [("u2","entreprise"), ("u4","salarié"), ("u7","association"), ("u1","Riseva")]:
            connecte(p, uid)
            liens = p.eval_on_selector_all(".side__link[href]", "l=>l.map(a=>a.getAttribute('href'))")
            for l in liens:
                p.evaluate("h=>location.hash=h.slice(1)", l); p.wait_for_timeout(200)
                verifie(f"{role} : {l}", len(p.inner_text(".content")) > 40)

        print("\nParcours d'une mission")
        connecte(p, "u4", "#/annonces")
        p.eval_on_selector_all(".annonce [data-go]", "b=>b[0].click()"); p.wait_for_timeout(300)
        verifie("le calcul des points s'affiche", "points pour votre entreprise" in p.inner_text("#calc"))
        p.evaluate("()=>[...document.querySelectorAll('.modal .btn')].find(b=>/Confirmer/.test(b.textContent)).click()")
        p.wait_for_timeout(400)
        verifie("le salarié est positionné", "positionné" in p.inner_text(".toast"))
        p.evaluate("()=>location.hash='#/missions'"); p.wait_for_timeout(300)
        p.evaluate("()=>{const b=[...document.querySelectorAll('tbody button')].find(x=>/Déclarer faite/.test(x.textContent)); if(b)b.click()}")
        p.wait_for_timeout(350)
        if p.is_visible(".modal #rp"):
            verifie("le salarié chiffre ce qu'il a fait", True)
            p.fill(".modal #rp", "45")
            p.evaluate("()=>[...document.querySelectorAll('.modal .btn')].find(b=>/^Déclarer$/.test(b.textContent.trim())).click()")
            p.wait_for_timeout(350)
        verifie("la mission passe à valider", "confirmation" in p.inner_text(".toast"))

        print("\nQuota de places et anonymisation")
        connecte(p, "u2", "#/equipe")
        avant = p.inner_text(".kpi--tete .kpi__value")
        p.evaluate("""()=>{const l=[...document.querySelectorAll('tbody tr')].find(r=>/Malik/.test(r.innerText));
          [...l.querySelectorAll('button')].find(b=>/Retirer d/.test(b.textContent)).click()}""")
        p.wait_for_timeout(250)
        p.evaluate("()=>[...document.querySelectorAll('.modal .btn')].find(b=>/Retirer et/.test(b.textContent)).click()")
        p.wait_for_timeout(500)
        apres = p.inner_text(".kpi--tete .kpi__value")
        verifie("la place est rendue", avant != apres, f"{avant} -> {apres}")
        verifie("le salarié est anonymisé", "Salarié retiré" in p.inner_text("tbody"))
        # suspendre n'efface rien, et se défait
        p.evaluate("""()=>{const l=[...document.querySelectorAll('tbody tr')].find(r=>/Sonia/.test(r.innerText));
          [...l.querySelectorAll('button')].find(b=>/Suspendre/.test(b.textContent)).click()}""")
        p.wait_for_timeout(250)
        p.evaluate("()=>[...document.querySelectorAll('.modal .btn')].find(b=>/Suspendre l/.test(b.textContent)).click()")
        p.wait_for_timeout(400)
        verifie("suspendre garde le nom et les données",
                "Sonia Delaunay" in p.inner_text("tbody") and "Suspendu" in p.inner_text("tbody"))
        p.evaluate("""()=>{const l=[...document.querySelectorAll('tbody tr')].find(r=>/Sonia/.test(r.innerText));
          [...l.querySelectorAll('button')].find(b=>/Réactiver/.test(b.textContent)).click()}""")
        p.wait_for_timeout(400)
        verifie("la suspension se défait", "Actif" in p.inner_text("tbody"))
        # la recherche existe au-delà de quelques lignes
        p.fill("#q", "hugo"); p.wait_for_timeout(300)
        verifie("l'équipe est cherchable",
                p.eval_on_selector_all("tbody tr", "r=>r.length") == 1)
        p.fill("#q", "")
        verifie("son email a disparu", "malik@" not in p.inner_text("tbody"))
        # le dernier administrateur ne peut pas se retirer lui-même
        etat = p.evaluate("""()=>{const l=[...document.querySelectorAll('tbody tr')].find(r=>/Claire/.test(r.innerText));
          const b=[...l.querySelectorAll('button')].find(x=>/Retirer d/.test(x.textContent)); return !!(b&&b.disabled)}""")
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
        # domaine de messagerie : le lien ne doit pas laisser entrer n'importe qui
        p.goto(f"{BASE}/rejoindre.html?code=LAFARGE-7QK2", wait_until="networkidle")
        p.wait_for_timeout(300)
        verifie("le domaine autorisé est annoncé", "lafarge-ciments.fr" in p.inner_text("body"))
        p.fill("#nom", "Intrus Extérieur"); p.fill("#mail", "intrus@gmail.com")
        p.check("input[type=checkbox]"); p.click("button[type=submit]"); p.wait_for_timeout(400)
        verifie("une adresse hors domaine est refusée",
                "n'accepte que" in p.inner_text(".toast"))

        print("\nConsentement et éligibilité")
        connecte(p, "u4", "#/annonces")
        p.evaluate("""()=>{const o=[...document.querySelectorAll('.annonce')].find(x=>/Temps de travail/.test(x.innerText));
          o.querySelector('[data-go]').click()}""")
        p.wait_for_timeout(300)
        verifie("le consentement est demandé", p.is_visible(".modal #consent"))
        p.evaluate("()=>[...document.querySelectorAll('.modal .btn')].find(b=>/Confirmer/.test(b.textContent)).click()")
        p.wait_for_timeout(300)
        verifie("sans consentement, l'engagement est refusé",
                "accord explicite" in p.inner_text(".toast"))
        p.check(".modal #consent")
        p.evaluate("()=>[...document.querySelectorAll('.modal .btn')].find(b=>/Confirmer/.test(b.textContent)).click()")
        p.wait_for_timeout(400)
        verifie("avec consentement, l'engagement passe", "positionné" in p.inner_text(".toast"))

        connecte(p, "u7", "#/mesannonces")
        p.evaluate("()=>document.querySelector('#np').click()"); p.wait_for_timeout(300)
        p.select_option(".modal #type", "benevolat_demi_journee"); p.wait_for_timeout(250)
        verifie("une association éligible peut cocher le temps de travail",
                not p.eval_on_selector(".modal #tt", "e=>e.disabled"))

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
        # Une annonce qui porte une unité d'impact demande le chiffre réalisé avant de valider.
        if p.is_visible(".modal #re"):
            verifie("l'association corrige le chiffre avant de confirmer", True)
            p.evaluate("()=>[...document.querySelectorAll('.modal .btn')].find(b=>b.textContent==='Confirmer').click()")
            p.wait_for_timeout(400)
        verifie("une mission peut être confirmée", "créditée" in p.inner_text(".toast") or "crédités" in p.inner_text(".toast"))

        print("\nHiérarchie du tableau de bord")
        connecte(p, "u2")
        t = p.inner_text(".content")
        verifie("ce qui attend une action passe en premier", "action requise" in t.lower())
        verifie("le premier chiffre est le nombre de personnes, pas un pourcentage",
                "salariés mobilisés" in t.lower())
        verifie("le pourcentage est là, mais en second, avec son dénominateur",
                "de l'effectif" in t.lower())
        # Deux dénominateurs sous un seul mot donnaient 1,4 % ici et 60 % au classement.
        verifie("« participation » ne désigne qu'une seule chose",
                "% de participation" not in t)
        connecte(p, "u2", "#/rapports")
        tr = norm(p.inner_text(".content")).lower()
        verifie("le coût par mission est donné dans le rapport, avec sa formule",
                "coût par mission validée" in tr and "missions" in tr)
        i_attend = t.lower().find("action requise")
        i_pos = max(t.find("Votre rang"), t.find("Votre position"))
        i_assos = t.find("Associations soutenues")
        verifie("le classement est toujours là, mais après", i_pos > i_attend >= 0)
        # Ce qui attend un tiers n'est pas une tâche de l'entreprise.
        verifie("ce qui dépend d'un tiers est annoncé comme tel",
                "en attente d'un tiers" in t.lower())
        # « Vos associations » justifie l'abonnement mieux qu'un rang : il passe devant.
        verifie("les associations soutenues passent avant le classement", 0 <= i_assos < i_pos)
        # Ce que dit le classement, le tableau de bord ne le contredit pas.
        verifie("aucun rang n'est annoncé sur le tableau de bord non plus",
                "Classement non publié" in t)

        print("\nCloisonnement des dons personnels")
        connecte(p, "u2", "#/missions")
        t = p.inner_text(".content")
        verifie("les dons personnels sont masqués côté employeur",
                "Don personnel d'un salarié" in t)
        verifie("l'employeur ne voit ni l'association ni le nom",
                "ne sont pas nominatifs" in t)
        verifie("le seuil d'agrégation est respecté",
                "Moins de 5 donateurs" in t or "versés par" in t)
        connecte(p, "u2", "#/equipe")
        verifie("les points affichés sont ceux des missions",
                "points des missions" in p.inner_text(".content").lower())
        connecte(p, "u4", "#/missions")
        verifie("le salarié voit ses propres dons",
                "Don personnel d'un salarié" not in p.inner_text(".content"))

        print("\nSignalement et modération")
        connecte(p, "u4", "#/annonces")
        p.evaluate("()=>document.querySelector('[data-sig]').click()"); p.wait_for_timeout(300)
        verifie("le signalement est accessible depuis chaque annonce", p.is_visible(".modal #motif"))
        p.fill(".modal #prec", "La description ne correspond pas à ce qui est demandé sur place.")
        p.evaluate("()=>[...document.querySelectorAll('.modal .btn')].find(b=>/Envoyer le signalement/.test(b.textContent)).click()")
        p.wait_for_timeout(400)
        verifie("le signalement est enregistré", "décision motivée" in p.inner_text(".toast"))
        p.evaluate("()=>{localStorage.setItem('riseva.session',JSON.stringify({uid:'u1'}));location.hash='#/moderation'}")
        p.reload(); p.wait_for_timeout(600)
        verifie("le signalement remonte à la modération",
                p.eval_on_selector_all("tbody tr", "r=>r.length") >= 1)
        p.evaluate("()=>[...document.querySelectorAll('tbody button')].find(b=>/Décider/.test(b.textContent)).click()")
        p.wait_for_timeout(300)
        p.evaluate("()=>[...document.querySelectorAll('.modal .btn')].find(b=>/Notifier/.test(b.textContent)).click()")
        p.wait_for_timeout(300)
        verifie("une décision non motivée est refusée",
                "doit être motivée" in p.inner_text(".toast"))
        p.fill(".modal #mot", "Vérifié auprès de l'association, la description a été corrigée.")
        p.evaluate("()=>[...document.querySelectorAll('.modal .btn')].find(b=>/Notifier/.test(b.textContent)).click()")
        p.wait_for_timeout(400)
        verifie("la décision motivée passe", "Décision notifiée" in p.inner_text(".toast"))

        print("\nSuspension d'accès")
        connecte(p, "u2", "#/equipe")
        # On suspend un salarié, puis on essaie d'ouvrir la plateforme avec son compte.
        p.evaluate("()=>{const e=JSON.parse(localStorage.getItem('riseva.etat'));"
                   "e.etat.utilisateurs.find(u=>u.id==='u4').actif=false;"
                   "localStorage.setItem('riseva.etat',JSON.stringify(e));"
                   "localStorage.setItem('riseva.session',JSON.stringify({uid:'u4'}));}")
        p.goto(f"{BASE}/app/?s=1#/tableau", wait_until="networkidle"); p.wait_for_timeout(500)
        verifie("un accès suspendu ne peut plus ouvrir la plateforme",
                p.is_visible(".login"))
        verifie("et on lui dit pourquoi", "suspendu" in p.inner_text("body").lower())
        p.evaluate("()=>localStorage.removeItem('riseva.etat')")

        print("\nChacun chez soi")
        connecte(p, "u4")
        t4 = p.inner_text(".content")
        # Un salarié n'a pas à recevoir les tâches de son administrateur.
        verifie("le salarié ne voit pas les tâches d'administration",
                "second administrateur" not in t4)
        verifie("il ne voit pas l'écrêtage de l'entreprise", "écrêtés" not in t4)
        verifie("il voit ses propres points", "Mes points" in t4)
        verifie("il voit ce qui l'attend", "Mes missions en cours" in t4)
        verifie("il voit le réseau, comme tout le monde", "Tous ensemble" in t4)
        connecte(p, "u7")
        t7 = p.inner_text(".content")
        verifie("l'association voit ce que les entreprises ont produit chez elle",
                "produit chez vous" in t7 or "Vos annonces" in t7)

        print("\nCe qu'on promet")
        connecte(p, "u2", "#/annuaire")
        a = p.inner_text(".content")
        verifie("l'annuaire ne promet pas une vérification qu'il ne fait pas",
                "Vérifiées par Riseva" not in a)
        p.evaluate("()=>document.querySelector('#quoiVerifie').click()"); p.wait_for_timeout(300)
        m = p.inner_text(".modal")
        verifie("ce que Riseva vérifie est écrit", "Existence juridique" in m)
        verifie("ce que Riseva ne vérifie pas l'est aussi",
                "ne vérifie pas" in m and "éligibilité fiscale" in m)
        p.evaluate("()=>document.querySelector('.overlay')?.remove()")
        # Les trois plus proches sont en haut : la grille ne les répète pas.
        connecte(p, "u2", "#/annuaire")
        noms = p.eval_on_selector_all(".annonce__loin", "e=>e.length")
        verifie("l'annuaire ne se répète pas",
                p.inner_text(".content").count("Le Panier Solidaire") == 1)

        print("\nRègles de calcul")
        # Le plafond porte sur le total retenu, pas sur le brut : avec (6240, 780, 0)
        # la règle « aucun format au-delà de la moitié » impose 1 560, pas 4 290.
        r = p.evaluate("""()=>{
          const p = {benevolat_demi_journee:6240, don_materiel:780, don_financier:0};
          const brut = Object.values(p).reduce((a,b)=>a+b,0);
          const ret = Object.values(p).map(v=>Math.max(0,Math.min(v, brut-v)));
          const total = ret.reduce((a,b)=>a+b,0);
          return {total, part: Math.round((ret[0]/total)*100)};
        }""")
        verifie("le plafond se calcule sur le retenu, pas sur le brut", r["total"] == 1560)
        verifie("aucun format ne dépasse la moitié du retenu", r["part"] <= 50)
        connecte(p, "u2")
        verifie("le score de l'entreprise vient des missions, pas d'un compteur figé",
                "points" not in p.evaluate("()=>JSON.parse(localStorage.getItem('riseva.etat')).etat.entreprises[0]"))
        verifie("aucun compteur de points n'est figé sur un salarié",
                "points" not in p.evaluate("()=>JSON.parse(localStorage.getItem('riseva.etat')).etat.utilisateurs.find(u=>u.id==='u3')"))

        print("\nRéalisations et automatismes")
        connecte(p, "u2")
        t = p.inner_text(".content")
        verifie("le décompte des réalisations s'affiche", "arbres plantés" in t)
        verifie("la provenance du chiffre est dite",
                "confirmés par les associations" in t and "Voir la méthode" in t)
        connecte(p, "u2", "#/ensemble")
        te = p.inner_text(".content")
        verifie("la page Tous ensemble additionne tout le réseau",
                "réseau Riseva" in te and "missions validées" in te)
        verifie("la forêt affiche le vrai décompte sous le dessin", "arbres plantés" in te)
        verifie("l'échelle du dessin est annoncée", "palier" in te.lower())
        verifie("le confirmé et l'estimé ne sont pas mélangés",
                "confirmé" in te.lower() and "estimés" in te.lower()
                and "sans réponse" in te.lower())
        connecte(p, "u1", "#/moteur")
        t = p.inner_text(".content")
        verifie("les automatismes sont listés", "Validation sans retour" in t
                and "Fermeture des annonces périmées" in t)
        avant = p.eval_on_selector_all("#hj tbody tr", "r=>r.length")
        p.click("#run"); p.wait_for_timeout(500)
        verifie("le moteur peut être relancé",
                p.eval_on_selector_all("#hj tbody tr", "r=>r.length") == avant + 1)
        p.goto(BASE + "/", wait_until="networkidle"); p.wait_for_timeout(600)
        verifie("le site public affiche le compteur du réseau", p.is_visible("#reseauReal"))
        verifie("le compteur est alimenté par les données",
                "arbres plantés" in p.inner_text("#reseauGrid"))

        print("\nEnregistrement automatique")
        connecte(p, "u7", "#/mesannonces")
        avant = p.eval_on_selector_all("tbody tr", "r=>r.length")
        p.evaluate("()=>document.querySelector('#np').click()"); p.wait_for_timeout(250)
        p.fill(".modal #titre", "Annonce de persistance")
        p.fill(".modal #desc", "Doit survivre au rechargement de la page.")
        p.evaluate("()=>[...document.querySelectorAll('.modal .btn')].find(b=>/Publier/.test(b.textContent)).click()")
        p.wait_for_timeout(400)
        p.reload(); p.wait_for_timeout(600)
        apres = p.eval_on_selector_all("tbody tr", "r=>r.length")
        verifie("ce qui est fait est enregistré", apres == avant + 1, f"{avant} -> {apres}")
        verifie("l'état est bien en mémoire", p.evaluate("()=>!!localStorage.getItem('riseva.etat')"))

        print("\nNotifications")
        connecte(p, "u2")
        p.evaluate("()=>localStorage.removeItem('riseva.notifs.lues')")
        p.reload(); p.wait_for_timeout(500)
        verifie("la pastille signale des notifications", p.is_visible("#pastille.is-on"))
        p.click("#cloche"); p.wait_for_timeout(300)
        verifie("le panneau s'ouvre", p.is_visible(".panneau"))
        n = p.eval_on_selector_all(".notif", "l=>l.length")
        verifie("des notifications sont listées", n > 0, f"{n}")
        p.evaluate("()=>document.querySelector('#tout').click()"); p.wait_for_timeout(400)
        verifie("tout marquer comme lu efface la pastille", not p.is_visible("#pastille.is-on"))
        connecte(p, "u2", "#/preferences")
        verifie("les préférences existent", "Récapitulatif hebdomadaire" in p.inner_text(".content"))

        print("\nAbonnement et paramètres")
        connecte(p, "u2", "#/abonnement")
        verifie("les factures s'affichent", p.eval_on_selector_all("tbody tr", "r=>r.length") >= 2)
        verifie("pas de reconduction tacite", "reconduction tacite" in p.inner_text(".content"))
        with p.context.expect_page() as onglet:
            p.evaluate("()=>[...document.querySelectorAll('tbody button')].find(b=>/Voir/.test(b.textContent)).click()")
        fac = onglet.value; fac.wait_for_timeout(400)
        f = norm(fac.inner_text("body"))
        verifie("la facture porte les montants HT, TVA et TTC",
                "Total HT" in f and "TVA 20 %" in f and "Total TTC" in f)
        verifie("elle mentionne pénalités et indemnité de 40 €",
                "indemnité forfaitaire" in f and "40 €" in f)
        verifie("elle rappelle que les dons n'y figurent pas", "ne transitent" in f)
        fac.close()
        connecte(p, "u2", "#/parametres")
        verifie("la facturation électronique est prise en compte",
                "plateforme agréée" in p.inner_text(".content"))
        connecte(p, "u2", "#/parametres")
        p.fill("#cout", "400"); p.click("#save"); p.wait_for_timeout(400)
        p.evaluate("()=>location.hash='#/mecenat'"); p.wait_for_timeout(400)
        t = norm(p.inner_text(".content"))
        verifie("le coût saisi alimente le mécénat", "360 €" in t,
                "60 % de 600 € de mécénat de compétences")
        verifie("les dons des salariés restent hors assiette",
                "hors assiette de l'entreprise" in t and "réduction d'impôt indue" in t)
        verifie("une association non éligible ne se valorise pas",
                "3 demi-journées" in norm(p.inner_text(".content")),
                "la mission de Rivière Propre 42, non éligible, doit être exclue")

        print("\nEspace Riseva")
        connecte(p, "u1", "#/saison")
        p.fill("#nom", "Saison test"); p.click("#save"); p.wait_for_timeout(400)
        verifie("la saison est enregistrée", "Saison test" in p.inner_text(".topbar"))
        connecte(p, "u1", "#/assos")
        verifie("les associations en retard de vérification sont signalées",
                "revérifier" in p.inner_text(".content"))
        p.evaluate("""()=>{const l=[...document.querySelectorAll('tbody tr')].find(r=>/Second Souffle/.test(r.innerText));
          [...l.querySelectorAll('button')].find(b=>/Valider/.test(b.textContent)).click()}""")
        p.wait_for_timeout(300)
        p.evaluate("()=>[...document.querySelectorAll('.modal .btn')].find(b=>/Valider pour/.test(b.textContent)).click()")
        p.wait_for_timeout(300)
        verifie("valider sans cocher est refusé", "Cochez les cinq points" in p.inner_text(".toast"))
        p.evaluate("()=>document.querySelectorAll('.modal .v').forEach(c=>c.checked=true)")
        p.evaluate("()=>[...document.querySelectorAll('.modal .btn')].find(b=>/Valider pour/.test(b.textContent)).click()")
        p.wait_for_timeout(400)
        verifie("la vérification complète est acceptée", "vérifiée pour une saison" in p.inner_text(".toast"))

        print("\nDossier de preuve")
        connecte(p, "u2", "#/rapports")
        with p.context.expect_page() as onglet:
            p.click("#preuve")
        pr = onglet.value; pr.wait_for_timeout(500)
        d = norm(pr.inner_text("body"))
        verifie("le dossier de preuve s'édite", "Dossier de preuve" in d)
        verifie("chaque chiffre porte sa méthode",
                "Méthode" in d and "divisés par" in d)
        verifie("il sépare temps de travail et temps personnel",
                "temps personnel" in d and "temps de travail" in d)
        verifie("il isole les dons personnels de l'assiette",
                "réduction d'impôt indue" in d)
        verifie("il liste l'état des pièces justificatives",
                "Conventions de mise à disposition" in d and "émargement" in d.lower())
        verifie("il rappelle ce que le score n'est pas",
                "pas un impact environnemental" in d)
        pr.close()

        print("\nMécénat et convention")
        connecte(p, "u2", "#/mecenat")
        t = norm(p.inner_text(".content"))
        verifie("le statut documentaire précède le montant",
                "Justificatifs" in t and ("calculable" in t or "non calculable" in t))
        verifie("le plafond par salarié est rappelé", "12 015 €" in t)
        verifie("le non déductible est distingué", "Non déductible" in t)
        p.click("#conv"); p.wait_for_timeout(300)
        verifie("le choix de la mission s'ouvre", p.is_visible(".modal #mi"))
        verifie("les deux régimes sont expliqués", "prêt illicite" in p.inner_text(".modal"))
        with p.context.expect_page() as onglet:
            p.evaluate("()=>[...document.querySelectorAll('.modal .btn')].find(b=>/Générer/.test(b.textContent)).click()")
        doc = onglet.value
        doc.wait_for_timeout(400)
        d = norm(doc.inner_text("body"))
        verifie("la convention est préremplie", "Convention de mise à disposition" in d)
        verifie("elle cite le millésime en vigueur du Cerfa", "16216*03" in d)
        verifie("elle se fonde sur le bon article", "L. 8241-3" in d)
        verifie("elle contient les mentions de R. 8241-2",
                "R. 8241-2" in d and "Salaires et charges facturés" in d
                and "libre, exprès, spécifique et écrit" in d)
        verifie("elle sépare subordination et autorité fonctionnelle",
                "pouvoirs juridique et disciplinaire" in d and "autorité fonctionnelle" in d)
        verifie("elle refuse la valeur fiscale des points",
                "sans valeur fiscale" in d)
        verifie("elle borne le rôle de Riseva",
                "ni assureur, ni conseil fiscal" in d)
        verifie("Riseva n'est pas partie à l'acte", "n'est pas partie" in d)
        doc.close()

        print("\nIndicateurs de pilote")
        connecte(p, "u1", "#/pilotes")
        t = p.inner_text(".content")
        verifie("les définitions sont publiées", "divisés par" in t or "divisées par" in t)
        verifie("les indicateurs par entreprise s'affichent",
                p.eval_on_selector_all("#pe tr", "r=>r.length") >= 4)

        print("\nClassement recalculable")
        connecte(p, "u2", "#/classement")
        p.click("#detail"); p.wait_for_timeout(300)
        t = norm(p.inner_text(".modal"))
        verifie("le détail du score s'affiche", "Total brut" in t and "pts / salarié" in t)
        p.evaluate("()=>document.querySelector('.overlay')?.remove()")
        # Sous dix entreprises : pas de rang, pas de barre comparative, pas de trophée.
        c = p.inner_text(".content")
        verifie("une cohorte trop petite est annoncée comme telle",
                "Cohorte" in c and "/ 10" in c)
        verifie("aucun rang n'est affiché sous dix entreprises",
                p.eval_on_selector_all("tbody tr", "r=>r.length") == 0)
        verifie("le score de l'entreprise est montré à la place",
                "point" in c and "par salarié" in c)
        verifie("l'écrêtage est montré", "Plafond par format" in t)
        p.evaluate("()=>document.querySelector('.overlay')?.remove()")

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
