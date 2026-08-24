#!/usr/bin/env python3
"""Riseva — tests de bout en bout.

Lance un serveur local, ouvre l'application dans Chromium et vérifie les parcours
qui comptent. Sortie lisible : une ligne par test, un résumé, code de sortie non nul
au premier échec.

    python3 scripts/tests.py
"""
import http.server, socketserver, threading, functools, pathlib, sys, contextlib, subprocess
from playwright.sync_api import sync_playwright
import re

RACINE = pathlib.Path(__file__).resolve().parent.parent / "public"
PORT = 8123
BASE = f"http://127.0.0.1:{PORT}"

resultats = []
def a_rupture_ailleurs(t):
    """La cause écrite dépend de la marche qui décroche : sur un jeu de données
    donné, ce n'est pas toujours celle des comptes ouverts."""
    return "premier écart observable" in t


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

def modules_valides():
    """Un littéral gabarit mal fermé passe `node --check` et casse à l'exécution.
    On importe réellement les trois modules avant d'ouvrir le navigateur : l'erreur
    arrive alors avec son message, pas sous la forme d'une page blanche."""
    import shutil, tempfile
    tmp = tempfile.mkdtemp()
    for f in ["data.js", "ui.js", "app.js"]:
        shutil.copy(RACINE / "app" / f, pathlib.Path(tmp) / f)
    ok = True
    for f in ["data.js", "ui.js", "app.js"]:
        r = subprocess.run(
            ["node", "--input-type=module", "-e",
             f"import('file://{tmp}/{f}').catch(e=>{{"
             "if(/SyntaxError|Missing|missing|Unexpected/.test(e.message))"
             "{console.error(e.message);process.exit(1)}})"],
            capture_output=True, text=True)
        if r.returncode:
            print(f"  RATÉ {f} — {r.stderr.strip()[:200]}")
            ok = False
    shutil.rmtree(tmp, ignore_errors=True)
    return ok


def main():
    print("Syntaxe des modules")
    if not modules_valides():
        print("\nUn module ne se charge pas : inutile d'ouvrir un navigateur.")
        sys.exit(1)
    print("  ok   les trois modules se chargent")

    erreurs_js = []
    with serveur(), sync_playwright() as pw:
        nav = pw.chromium.launch()
        ctx = nav.new_context(viewport={"width": 1440, "height": 900}, locale="fr-FR")
        p = ctx.new_page()
        p.on("pageerror", lambda e: erreurs_js.append(str(e)))

        print("\nSite public")
        p.goto(BASE + "/", wait_until="networkidle")
        # Les deux anciennes accroches étaient négatives : « vos équipes n'ont pas
        # besoin d'un outil de plus » rappelle à l'acheteur qu'il pourrait ne rien
        # acheter, et « il vous faut des bras » réduisait la relation associative à
        # une fourniture de main-d'œuvre. Le titre dit maintenant ce qu'on vend.
        verifie("l'accueil affiche le titre",
                "Un refuge cherche des bras" in p.inner_text("h1")
                and "votre rapport RSE s'écrit" in p.inner_text("h1"))
        # Le premier ecran doit porter, AVANT tout defilement, une image du
        # produit et quatre chiffres. C'est la demande a l'origine de sa
        # refonte, et rien n'empeche une refonte suivante de la reperdre.
        verifie("le premier écran montre le produit",
                p.locator(".hero .apercu img").count() == 1)
        verifie("le premier écran porte quatre chiffres",
                p.locator(".hero .chiffres--hero li").count() == 4)
        t = norm(p.inner_text(".hero"))
        verifie("le prix est visible dès l'accueil", "2 400" in t and "18 500 €" in t)
        verifie("la remise de lancement est plafonnée en nombre",
                "10 % pour les 20 premières" in t)
        # Le prix affiché sur la vitrine et le prix facturé par la plateforme ne
        # doivent pas pouvoir diverger : la page est comparée à la grille du module.
        grille = p.evaluate("""async () => {
          const d = await import('/app/data.js');
          const lignes = [...document.querySelectorAll('#prix .tar-t tbody tr')].map(tr => ({
            label: tr.children[0].textContent.trim(),
            prix: parseInt(tr.children[1].querySelector('b').textContent.replace(/\\D/g,''), 10),
            sites: parseInt(tr.children[2].textContent.replace(/\\D/g,''), 10)
          }));
          return { page: lignes,
                   module: d.TARIFS.paliers.map(x => ({ label:x.label, prix:x.prix, sites:x.sites })),
                   supp: d.TARIFS.site_supplementaire,
                   devis: d.devisPour({ effectif:150, sites:1, fondateur:true }) };
        }""")
        verifie("la grille affichée est exactement celle que la plateforme facture",
                grille["page"] == grille["module"], str(grille["page"])[:200])
        p.fill("#simEff", "150"); p.dispatch_event("#simEff", "input")
        p.fill("#simSites", "1"); p.dispatch_event("#simSites", "input")
        p.wait_for_timeout(200)
        sim = norm(p.inner_text("#simOut"))
        verifie("le simulateur donne le même montant que le moteur de devis",
                f"{grille['devis']['ht']:,}".replace(",", " ") + " € HT" in sim, sim)
        verifie("il donne aussi l'acompte, qui est ce qu'on demande à la commande",
                f"{grille['devis']['acompte']:,}".replace(",", " ") + " €" in sim, sim)
        prixT = norm(p.inner_text("#prix"))
        # Les exclusions ne sont plus a cote du prix : quatre objections negatives
        # a la seconde ou le lecteur evalue le montant faisaient redescendre
        # l'intention. Elles sont dans la question de la FAQ qui traite deja du
        # perimetre, ou elles repondent a quelqu'un qui les cherche. Ce qui doit
        # rester vrai, et que ce test protege : elles sont ECRITES, et le bloc du
        # prix dit ou les trouver.
        pageT = norm(p.inner_text("body"))
        verifie("la page dit ce qui n'est pas compris, pas seulement ce qui l'est",
                "bilan carbone réglementaire" in pageT and "document unique" in pageT)
        verifie("le bloc du prix renvoie a ces limites au lieu de les afficher",
                "le périmètre exact de la plateforme" in prixT
                and "bilan carbone réglementaire" not in prixT)
        verifie("la remise fondateur est datée et plafonnée",
                "31 décembre 2026" in prixT and "20 premières" in prixT)
        verifie("aucun tarif n'est promis au-delà de la première saison",
                "gel" not in prixT.lower() and "première saison, et sur elle seule" in prixT,
                "SPEC §9 interdit tout prix garanti à l'avance, sous quelque nom que ce soit")
        verifie("l'acompte est justifié par ce qu'il paie",
                "premier envoi d'affiches" in prixT)

        verifie("l'accueil positionne la plateforme RSE sans lâcher l'axe associatif",
                "outil RSE" in t and "associations vérifiées" in t)
        # Les quatre dimensions du produit doivent se lire sans défiler : le
        # terrain, le collectif, l'outil, la preuve. Dissoutes dans un
        # paragraphe, un visiteur en retenait une sur quatre.
        # Les clés sont capitalisées par la feuille de style : on compare donc
        # sans la casse, sinon le test mesure `text-transform` et pas le texte.
        verifie("les quatre dimensions se lisent dès le haut de page",
                all(x in t.lower() for x in ["le terrain", "le collectif",
                                             "l'outil rse", "la preuve"]))
        verifie("le challenge est annoncé comme ce qui fédère les équipes",
                "qui fédère les équipes" in t)
        verifie("la dimension environnementale est nommée, pas suggérée",
                "Refuges animaliers, plantations, berges de rivière" in t)
        verifie("l'étendue de l'outil est chiffrée, pas promise",
                "Huit rubriques" in t and "vingt-sept valeurs" in t)
        verifie("il annonce que la moitié basse du classement n'est pas nommée",
                "sans nommer la moitié basse" in t)
        verifie("les services RSE sont annoncés comme compris",
                "sans module en supplément" in t)
        verifie("le dossier est annoncé avant la signature",
                "règlement de la saison" in t and "conditions de vente" in t)
        # Le barème n'a plus son encadré sur l'accueil : sa place est le règlement,
        # qui le détaille avec un exemple chiffré. L'accueil en donne les trois
        # valeurs en une phrase — assez pour comprendre l'ordre de grandeur, pas
        # assez pour croire qu'on a lu la règle.
        # `inner_text` rend le texte tel qu'il s'affiche, capitales de la feuille
        # de style comprises : les points sont écrits « 150 PTS » à l'écran.
        bar = norm(p.inner_text(".fmt-bloc")).lower()
        verifie("le barème annoncé est celui du code",
                "150 pts" in bar and "100 pts" in bar and "1 pt" in bar
                and "250 pts" in bar and "400 pts" in bar)
        verifie("l'accueil renvoie au règlement pour le calcul complet",
                "règlement" in bar and "écrêtage" in bar)
        corps = norm(p.inner_text("body"))
        # La vitrine ne vend que ce qui fonctionne, et ne montre aucun résultat.
        verifie("l'accueil annonce tout ce qu'une association peut proposer",
                "Ce qu'une association peut proposer" in corps
                and "Parrainage d'un animal" not in corps  # le libellé du produit
                and "parrainage d'un animal" in corps.lower()
                and "adoption d'un animal" in corps.lower()
                and "attend son prestataire" not in corps)
        verifie("le don en argent est annoncé sans intermédiaire",
                "sans transiter par Riseva" in corps and "aucune commission" in corps
                and "Riseva n'encaisse rien" in corps)
        # Le don par carte se confirme par le paiement, pas par un silence : la
        # page doit dire quand les points tombent, et ce n'est plus « quand
        # l'association confirme la reception ».
        verifie("les points d'un don ne sont crédités qu'après le paiement",
                "quand le paiement est confirmé" in corps)
        verifie("la vitrine dit qui encaisse, et que ce n'est pas Riseva",
                "HelloAsso" in corps and "sans transiter par Riseva" in corps)
        # L'aveu tenait une section entière, avec un titre « Ce qu'on ne promet
        # pas » et une colonne de tout ce que Riseva ne fait pas. Énumérer ses
        # propres manques en grand sur une page qui vend est un mauvais calcul :
        # le lecteur retient la liste, pas la nuance. Ce qui doit être dit l'est
        # toujours, mais à l'endroit où on va le chercher, c'est-à-dire la FAQ.
        verifie("la page ne se défend plus par une section entière",
                "Ce qu'on ne promet pas" not in corps
                and "Rien encore, et nous n'allons pas l'inventer" not in corps
                and "Ce que Riseva ne prétend pas faire" not in corps)
        verifie("mais la FAQ dit toujours qu'il n'y a pas encore de résultat",
                "Riseva a-t-elle déjà des résultats" in corps
                and "jeu de démonstration" in corps)
        verifie("et la FAQ dit toujours ce que Riseva ne fait pas",
                "ne certifie pas un impact" in corps
                and "ne produit pas de bilan carbone" in corps
                and "aucune déclaration à votre place" in corps)
        # La vitrine ne porte plus une seule photo de banque d'images. Seize cadres
        # souriants en open space illustraient un produit dont le métier est le
        # ramassage de déchets en rivière et les refuges animaliers ; et une légende
        # « photo d'illustration » ne rachète pas une image qui ne prouve rien, elle
        # confirme au lecteur qu'elle n'en est pas une. Riseva n'ayant aucune
        # photographie réelle de chantier, la seule preuve disponible est le produit.
        vues = p.evaluate("""()=>[...document.images].map(i=>i.getAttribute('src'))""")
        verifie("ce qu'elle montre d'abord, ce sont des captures de l'application",
                len([x for x in vues if "/captures/" in (x or "")]) >= 5, str(vues))
        # Elle porte aussi des illustrations, et c'est voulu : une page qui vend
        # du ramassage de berge sans jamais montrer de berge demande au lecteur
        # un effort d'imagination qu'il ne fera pas. Ce qui est interdit, c'est
        # de les faire passer pour des preuves.
        verifie("elle montre aussi de quoi on parle",
                len([x for x in vues if "/photos/" in (x or "")]) >= 3, str(vues))
        # Les mentions posées sous chaque image ont été retirées. Elles étaient
        # honnêtes et elles étaient contre-productives : « image générée, ce
        # n'est pas une mission Riseva » sous chaque photographie transforme la
        # page en avertissement continu, et le lecteur finit par lire la mention
        # au lieu de regarder ce qu'on lui montre. La règle qui compte reste,
        # et elle est vérifiée plus bas : aucune image ne prétend être la trace
        # d'un résultat, aucune ne nomme personne.
        legendesP = p.evaluate(
            """()=>[...document.querySelectorAll('.photo')].map(f=>f.textContent.trim())""")
        verifie("les illustrations ne portent plus de mention sous elles",
                all(x == "" for x in legendesP), str(legendesP)[:200])
        # La boucle vidéo : muette, sans contrôle de son, avec son affiche servie
        # tout de suite. Une page qui parle sans qu'on le lui demande se fait
        # fermer, et un rectangle vide pendant le chargement est un premier écran
        # perdu.
        # La boucle vidéo a été retirée : au format où elle tenait, une rivière
        # dans la brume se lit comme une photographie qui bouge un peu, donc
        # comme un défaut d'affichage plutôt que comme du mouvement voulu.
        verifie("aucune vidéo ne se lance toute seule sur la vitrine",
                p.eval_on_selector_all("video", "v=>v.length") == 0)
        # Aucun visage identifiable, aucune association nommée sur une image :
        # une illustration qui nomme quelqu'un devient une affirmation le
        # concernant.
        alts = p.evaluate(
            """()=>[...document.querySelectorAll('.photo img')].map(i=>i.alt)""")
        verifie("les illustrations décrivent une scène, pas des personnes nommées",
                all(a and len(a) > 20 for a in alts), str(alts)[:200])
        # Et chacune dit d'où elle vient : une capture sans cette mention se lit
        # comme un résultat obtenu, et Riseva n'en a aucun.
        legendes = p.evaluate(
            """()=>[...document.querySelectorAll('.shot figcaption')]
                     .map(f=>f.textContent.trim())""")
        # Une capture peut ne rien porter du tout : celle de l'affiche a son
        # libellé posé à côté d'elle, dans la composition, et le répéter sous
        # l'image en ferait une légende de musée. Ce qui reste interdit, c'est
        # la phrase : un titre de capture qui dépasse la ligne redevient du
        # texte qu'on saute.
        verifie("aucun titre de capture ne devient une phrase",
                legendes and all(len(x) <= 62 for x in legendes),
                str(legendes)[:300])
        verifie("la plupart des captures portent quand même un titre",
                len([x for x in legendes if x]) >= len(legendes) - 1,
                str(legendes)[:300])
        # Le contenu ne doit dépendre d'aucun défilement : une animation peut
        # accompagner une apparition, jamais la conditionner.
        # Les apparitions au défilement sont revenues, et la règle qui les
        # encadre n'a pas bougé : une animation accompagne un contenu, elle ne
        # le conditionne jamais. Elles sont donc écrites « .js .rv ». Sans
        # script, la classe n'existe pas, la règle ne s'applique pas, et la page
        # s'affiche entière. On le vérifie en retirant la classe.
        caches = p.evaluate("""()=>{
            const h=document.documentElement, avait=h.classList.contains('js');
            h.classList.remove('js');
            const n=[...document.querySelectorAll('.rv,.rl')]
              .filter(e=>getComputedStyle(e).opacity !== '1').length;
            if (avait) h.classList.add('js');
            return n; }""")
        verifie("sans script, rien n'attend un défilement pour s'afficher",
                caches == 0, str(caches))
        verifie("le seuil du classement est dit sur la vitrine",
                "dix entreprises" in corps)
        # ── les affiches ────────────────────────────────────────────────────
        # C'est le seul objet Riseva qu'un salarié voit sans ouvrir un écran, et
        # la section qui le montre avait disparu. Elle montre l'affiche telle
        # qu'elle sort de la plateforme, pas une photo d'affiche posée sur un mur.
        aff = norm(p.inner_text("#affiches"))
        verifie("la vitrine montre l'affiche et ce qu'elle porte",
                "code QR" in aff and "lien d'inscription" in aff
                and "quatre moments de la saison" in aff)
        # Les deux images de cette section sont fabriquees par
        # `scripts/captures.py` a partir de l'affiche que la plateforme genere :
        # la scene entiere et le detail du code QR. La section montrait aupavant
        # une affiche de synthese, coupee en bas, a cote de la vraie.
        srcs = p.eval_on_selector_all("#affiches img", "l=>l.map(e=>e.getAttribute('src'))")
        verifie("l'affiche montrée est une vraie sortie de la plateforme",
                len(srcs) == 2 and all("/photos/affiche-" in x for x in srcs), str(srcs))
        gen = (RACINE.parent / "scripts" / "captures.py").read_text(encoding="utf-8")
        verifie("ces deux images se refabriquent avec l'affiche, elles ne se dessinent pas",
                'photos / "affiche-qr.jpg"' in gen and 'photos / "affiche-bureau.jpg"' in gen)
        # ── ce que ça change ────────────────────────────────────────────────
        # Trois effets, et chacun porte son chiffre. Dans la version précédente
        # celui du milieu n'en avait pas : au lieu de trois colonnes, l'œil
        # voyait deux colonnes et un trou.
        chiffres3 = p.eval_on_selector_all("#change .ret > li",
            "l=>l.map(e=>!!e.querySelector('.ret-fact'))")
        verifie("chacun des trois effets porte un chiffre",
                len(chiffres3) == 3 and all(chiffres3), str(chiffres3))
        ordre = p.eval_on_selector_all("#change .ret h3", "l=>l.map(e=>e.textContent)")
        verifie("les échéances réglementaires viennent avant les équipes qui se parlent",
                len(ordre) == 3 and "reprendre" in ordre[1] and "équipes" in ordre[2],
                str(ordre))
        # Le champ a remplir se dimensionne sur son propre texte. Quand la
        # mesure est trop courte, le placeholder perd ses dernieres lettres et
        # « des bras un samedi matin » devient « des bras un samedi matir ». Le
        # defaut ne se voit pas en survolant la page : il faut le mesurer, et un
        # placeholder ne deborde jamais, il est coupe en silence. On le pose
        # donc comme valeur le temps de la mesure.
        p.goto(f"{BASE}/associations.html", wait_until="networkidle"); p.wait_for_timeout(500)
        coupes = p.evaluate("""()=>[...document.querySelectorAll('.blank input')].map(i=>{
            i.value = i.placeholder;
            const c = { ph: i.placeholder, coupe: i.scrollWidth > i.clientWidth };
            i.value = ''; return c; }).filter(x => x.coupe).map(x => x.ph)""")
        verifie("aucun placeholder n'est coupé dans la phrase à remplir",
                not coupes, str(coupes))

        # ── la longueur de ligne ────────────────────────────────────────────
        # Au-dela de quatre-vingts signes par ligne, l'oeil rate le retour a la
        # ligne suivante et relit la meme. Un texte qu'on relit deux fois passe
        # pour un texte obscur, et c'est la page qui en paie le prix.
        # La mesure se fait avec la police REELLEMENT dessinee : le raccourci
        # `font` de `getComputedStyle` revient parfois vide, et le canevas
        # retombe alors sur 10 px sans que rien ne le dise. On reconstruit donc
        # la declaration a partir de ses morceaux.
        MESURE_LIGNE = """()=>{
          const c = document.createElement('canvas').getContext('2d'), out = [];
          document.querySelectorAll('p,li,dd').forEach(el => {
            const propre = [...el.childNodes].filter(n => n.nodeType === 3)
              .map(n => n.textContent.trim()).join(' ').trim();
            if (propre.length < 90) return;
            const s = getComputedStyle(el), w = el.getBoundingClientRect().width;
            if (!w) return;
            c.font = s.fontStyle + ' ' + s.fontWeight + ' ' + s.fontSize + ' ' + s.fontFamily;
            const moy = c.measureText('abcdefghijklmnopqrstuvwxyz eaiou').width / 32;
            const signes = Math.round(w / moy);
            if (signes > 82) out.push({ ou: el.className || el.tagName, signes });
          });
          return out;
        }"""
        for page in ("/", "/associations.html", "/reglement.html", "/cgv.html",
                     "/inscription.html", "/asso.html?id=a2"):
            p.goto(BASE + page, wait_until="networkidle"); p.wait_for_timeout(350)
            longues = p.evaluate(MESURE_LIGNE)
            verifie(f"aucune ligne au-dela de quatre-vingts signes sur {page}",
                    not longues, str(longues[:3]))

        # ── plus de prénom nulle part ───────────────────────────────────────
        # Les pages parlent au nom d'une équipe. Une vitrine qui met en avant une
        # personne seule vend une dépendance, pas un service.
        for page in ("/", "/associations.html", "/inscription.html"):
            p.goto(BASE + page, wait_until="networkidle"); p.wait_for_timeout(250)
            verifie(f"aucun prénom de fondateur sur {page}",
                    "Yacine" not in p.inner_text("body"))
        p.goto(BASE + "/", wait_until="networkidle"); p.wait_for_timeout(400)
        # ── plus un seul tiret cadratin ─────────────────────────────────────
        # Ils ne sont pas fautifs, ils sont reconnaissables : sur une page
        # française, une incise entre tirets cadratins à chaque paragraphe est
        # le premier signe qui fait dire « c'est écrit par une machine ».
        for page in ("/", "/associations.html"):
            p.goto(BASE + page, wait_until="networkidle"); p.wait_for_timeout(250)
            n = p.inner_text("body").count("\u2014")
            verifie(f"aucun tiret cadratin sur {page}", n == 0, str(n))
        p.goto(BASE + "/", wait_until="networkidle"); p.wait_for_timeout(400)
        corps = norm(p.inner_text("body"))
        # Les quatre chiffres du premier écran sont des faits extérieurs, datés
        # et sourcés, ou des propriétés du produit qui ne dépendent que de nous.
        # Un chiffre de performance client à cet endroit serait le premier
        # mensonge de la page, puisqu'il n'existe aucun client.
        # On lit le HTML SERVI, pas le DOM animé : le compteur remplace
        # temporairement la valeur pendant sa montée, et c'est justement le
        # point — le nombre final doit être dans la source, là où le lisent un
        # moteur d'indexation, un lecteur d'écran et un navigateur sans script.
        src = norm(p.evaluate("()=>fetch('/').then(r=>r.text())"))
        verifie("les chiffres de tête sont dans le HTML, pas seulement animés",
                "21 août 2026" in src and "14 j" in src and "0 €" in src)
        # `.chiffres` designe maintenant deux blocs : la bande du premier ecran
        # et celle du corps de page. On les mesure separement, sinon le premier
        # repond pour le second et la source du second n'est plus verifiee.
        ch = norm(p.inner_text(".chiffres:not(.chiffres--hero)"))
        verifie("les chiffres de tête sont sourcés ou ne dépendent que de nous",
                "L. 2152-7" in ch and "238 bis" in ch)
        # Les sources sont composees en capitales par la feuille de style : on
        # compare donc sur le texte replie en minuscules, sinon la recette
        # depend d'un `text-transform`.
        hero = norm(p.inner_text(".chiffres--hero")).lower()
        verifie("les chiffres du premier écran portent leur source",
                "238 bis" in hero and "catalogue de la plateforme" in hero
                and "grille publique" in hero)
        verifie("aucun n'est présenté comme un résultat obtenu par un client",
                "clients" not in ch and "nos clients" not in ch
                and "satisfaction" not in ch)
        # Le mécénat est à deux taux depuis la loi de finances 2020 : 60 % jusqu'à
        # deux millions d'euros de dons sur l'exercice, 40 % au-delà. Le second ne
        # concernera probablement aucune PME de la cible — mais une phrase juste
        # aux trois quarts est une phrase qu'on nous opposera le jour où elle
        # comptera, et une page de vente n'a pas le droit d'être approximative sur
        # un chiffre fiscal.
        verifie("les deux taux du mécénat sont donnés, pas seulement le flatteur",
                "60 %" in corps and "40 %" in corps
                and "2 millions d'euros de dons" in corps)
        # Le critère environnemental de la commande publique vaut pour les nouvelles
        # consultations, sans seuil : le dire ainsi est ce qui rend l'argument
        # opposable plutôt que séduisant.
        verifie("l'obligation de la commande publique est datée et bornée",
                "nouvelle consultation" in corps and "L. 2152-7" in corps
                and "2022-767" in corps)
        verifie("l'offre groupe est présentée avec ses trois niveaux",
                "Trois niveaux" in corps and "SIREN" in corps and "établissements" in corps)
        verifie("le cloisonnement du groupe est annoncé, pas suggéré",
                "ne donne pas accès aux" in corps.lower()
                or "Payer la facture" in corps)
        verifie("les services RSE disent ce qu'ils ne font pas",
                "bilan carbone" in corps and "juge et partie" in corps
                and "sous-déclarer" in corps)
        verifie("le prix de l'offre groupe n'est pas inventé",
                "sur devis" in corps)
        verifie("aucune promesse de tarif figé",
                "tarif restera" not in p.inner_text("body").lower())
        for page in ["inscription.html", "associations.html", "asso.html?id=a1",
                     "mentions.html", "cgv.html", "reglement.html",
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
        verifie("le cloisonnement entre sociétés d'un groupe est écrit",
                "responsable des données de son périmètre" in t
                and "responsabilité conjointe" in t)
        verifie("aucune donnée de santé n'est traitée, et c'est écrit",
                "Aucune donnée de santé n'est traitée" in t)
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
        # Un don en argent ne suit plus ce chemin : il s'annonce et se vire. On ouvre
        # donc explicitement une annonce non financière.
        p.eval_on_selector_all(".annonce [data-go]",
            "b=>b.find(x=>!/Faire un don/.test(x.textContent)).click()"); p.wait_for_timeout(300)
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

        print("\nOù ça bloque : l'adoption")
        connecte(p, "u2", "#/adoption")
        # L'écran attend maintenant la base : les chiffres d'offre locale sont
        # calculés par PostgreSQL, pas dans le navigateur, et même en
        # démonstration le rendu passe par une promesse. Un test qui lit le DOM
        # trop tôt mesure une page vide.
        p.wait_for_selector(".offre", timeout=5000)
        ad = norm(p.inner_text(".content"))
        verifie("l'entonnoir montre les cinq marches",
                all(x in ad for x in ["Salariés du périmètre", "Comptes ouverts",
                                      "Se sont engagés",
                                      "Ont déclaré une mission faite",
                                      "Ont au moins une action validée"]))
        # « Revenu une deuxième fois » mesure ce que fait quelqu'un qui a déjà
        # tout franchi, pas un franchissement de plus. Mélangé aux cinq marches,
        # il faisait chercher la cause d'un décrochage au mauvais endroit.
        verifie("la rétention est sortie de l'entonnoir et dite avec son dénominateur",
                "Et ceux qui reviennent" in ad and "après une première action validée" in ad)
        # « C'est ici » sonnait comme un verdict. « Premier écart observable »
        # dit ce que c'est vraiment : l'endroit où le décompte décroche le plus,
        # pas la preuve d'une cause.
        verifie("il désigne la marche où l'on perd le plus de monde",
                "premier écart observable" in ad)
        # « 203 personnes perdues » était faux : Riseva sait qu'elles n'ont pas
        # ouvert de compte, elle ne sait pas si le lien leur est parvenu.
        verifie("et il dit la cause probable, pas seulement le chiffre",
                "de moins qu'à la marche précédente" in ad)
        verifie("il ne prétend pas savoir ce qu'il ignore",
                "personnes perdues ici" not in ad
                and ("ne sait pas combien ont effectivement vu le lien" in ad
                     or a_rupture_ailleurs(ad)))
        verifie("le délai avant la première action est une médiane, pas une moyenne",
                ("jours, en médiane" in ad and "Médiane et non moyenne" in ad)
                or "Pas encore assez" in ad)
        # Une médiane calculée sur les seuls survivants est une médiane de
        # survivants : ceux qui n'ont rien fait n'ont pas un délai long, ils
        # n'ont pas de délai.
        verifie("le délai porte son dénominateur",
                "obtenu une première action validée" in ad or "Pas encore assez" in ad)
        verifie("l'écran refuse de devenir un outil de surveillance",
                "jamais la liste de ceux qui ne sont pas venus" in ad
                and "surveillance" in ad)
        verifie("il rappelle qu'un taux bas ne mesure pas la bonne volonté",
                "offre associative disponible" in ad)
        ade = p.evaluate("""async () => {
          const d = await import('/app/data.js');
          const a = d.DB.adoption({ entreprise:'e1' });
          const s = d.DB.adoption({ entreprise:'e1', etablissement:'et2' });
          return { rupture:a.rupture, marches:a.marches.length,
                   siteEffectif:s.effectif, societeEffectif:a.effectif,
                   croissant: a.marches.slice(1).every((m,i)=> m.n <= a.marches[i].n),
                   mesurable:a.delaiMesurable };
        }""")
        verifie("un entonnoir ne remonte jamais", ade["croissant"], str(ade))
        verifie("le filtre par site change bien le périmètre",
                ade["siteEffectif"] < ade["societeEffectif"], str(ade))
        verifie("la médiane n'est calculée que sur assez de monde",
                ade["mesurable"] >= 3 or "Pas encore assez" in ad)

        # L'écran écrivait « l'offre locale est trop loin ou ne correspond pas »
        # comme cause probable, sans jamais la mesurer. Une cause qu'on suggère
        # sans la chiffrer n'est qu'une excuse polie faite au client.
        # Deux distances pour deux annonces n'apprennent rien : en dessous de
        # quatre, la médiane laisse la place au nombre de places prenables.
        verifie("l'offre associative autour de chaque site est mesurée, pas supposée",
                "L'offre autour de vos sites" in ad
                and "annonces ouvertes à moins de 30 km" in ad
                and ("distance médiane" in ad or "places encore ouvertes" in ad))
        verifie("le tableau désigne un travail pour nous, pas un reproche au client",
                "c'est notre travail, pas le vôtre" in ad
                and "c'est dans cet ordre que nous nous en occupons" in ad)
        off = p.evaluate("""async () => {
          const d = await import('/app/data.js');
          const t = d.DB.offreParSite('e1');
          const rang = { aucune:0, inaccessible:1, mince:2, suffisante:3 };
          return { n:t.length,
                   trie: t.slice(1).every((o,i)=> rang[o.verdict] >= rang[t[i].verdict]),
                   verdicts: t.map(o=>o.verdict),
                   sommes: t.map(o => o.parFormat.temps + o.parFormat.animal
                                    + o.parFormat.materiel
                                    + o.parFormat.argent === o.ouvertes),
                   jours: t.map(o => o.semaine + o.weekend + o.sansDate === o.ouvertes),
                   rayon: t.every(o => o.rayon === d.DB.RAYON_OFFRE_KM),
                   attendus: t.map(o => [o.site.effectif, o.attendu]) };
        }""")
        verifie("les sites sont classés du plus mal servi au mieux servi",
                off["trie"], str(off["verdicts"]))
        # Un decompte par format ou par jour qui ne retombe pas sur le total est
        # un decompte dont une annonce est tombee quelque part sans qu'on le voie.
        verifie("chaque annonce comptée à portée l'est une fois et une seule",
                all(off["sommes"]) and all(off["jours"]), str(off))
        # Le seuil est proportionne a l'effectif : trois annonces suffisent a un
        # site de vingt personnes et ne suffisent pas a un site de quatre cents.
        verifie("le seuil d'offre suffisante suit l'effectif du site",
                len({tuple(x) for x in off["attendus"]}) > 1
                and all(a >= 2 for _, a in off["attendus"]), str(off["attendus"]))
        verifie("le rayon annoncé est celui qui a servi au calcul", off["rayon"])
        # Un diagnostic qui s'arrête au diagnostic est une excuse préparée
        # d'avance : le client lit « offre trop mince », comprend « ce n'est pas
        # de notre faute », et retient surtout que personne ne fera rien.
        verifie("un verdict négatif ouvre deux issues, il n'est pas une impasse",
                "Nous demander de chercher ici" in ad
                and "Inviter une association que vous connaissez" in ad)
        verifie("aucun délai n'est promis sur une chose qui ne dépend pas de nous",
                "une association décide seule de publier" in ad)
        p.evaluate("""()=>document.querySelector('.js-signal').click()""")
        p.wait_for_timeout(400)
        ad2 = norm(p.inner_text(".content"))
        verifie("le signalement est daté et visible sur l'écran", "Zone signalée le" in ad2)
        # Le texte d'invitation part chez des gens que nous ne connaissons pas :
        # il engage Riseva autant qu'une page publique, et il ne promet rien
        # qu'on ne tienne.
        p.evaluate("""()=>[...document.querySelectorAll('.js-inviter')][0].click()""")
        p.wait_for_timeout(400)
        # Le corps du message vit dans un textarea : sa valeur n'est pas du texte
        # rendu, donc inner_text ne la voit pas.
        inv = norm(p.input_value(".modal #inv-c") + " " + p.input_value(".modal #inv-o")
                   + " " + p.inner_text(".modal"))
        verifie("le message d'invitation est écrit d'avance et nominatif",
                "Vaudrey" in inv and "gratuite et le restera" in inv
                and "aucune commission" in inv)
        verifie("il ne promet ni argent ni bénévoles",
                "que quelqu'un vienne" in inv and "personne ne peut le garantir" in inv)
        p.evaluate("()=>document.querySelector('.overlay')?.remove()")
        zs = p.evaluate("""async () => {
          const d = await import('/app/data.js');
          const a = d.DB.signalerZone('et2');
          const b = d.DB.signalerZone('et2');
          return { memeId: a.id === b.id, n: d.DB.zonesSignalees('e1').length };
        }""")
        verifie("signaler deux fois la même zone ne la met pas deux fois dans la file",
                zs["memeId"], str(zs))

        print("\nNotre saison, et qui vient avec moi")
        connecte(p, "u3", "#/tableau")
        ts = norm(p.inner_text(".content"))
        verifie("le salarié voit l'objectif collectif de son périmètre",
                "Notre saison" in ts and "mobilisée" in ts or "mobilisées" in ts)
        verifie("l'objectif se compte en personnes, pas en points",
                "sur 11" in ts or "personnes mobilisées sur" in ts or "personne mobilisée sur" in ts,
                "un objectif en points s'atteint à trois et n'élargit rien")
        verifie("il dit ce qu'il manque, et quoi faire",
                "Il manque" in ts and "en amener une avec vous" in ts)
        ns = p.evaluate("""async () => {
          const d = await import('/app/data.js');
          const n = d.DB.notreSaison('u3');
          const o = d.DB.objectifSaison('e1');
          let trop = null, zero = null;
          try { d.DB.reglerObjectifSaison('e1', 99999); } catch (e){ trop = e.message; }
          try { d.DB.reglerObjectifSaison('e1', 0); } catch (e){ zero = e.message; }
          return { site:n.site && n.site.nom, cible:n.cible, mobilises:n.mobilises,
                   effectif:n.effectif, propose:o.propose, choisi:o.choisi, trop, zero };
        }""")
        verifie("le périmètre est le site du salarié, pas l'entreprise entière",
                ns["site"] is not None, str(ns["site"]))
        verifie("l'objectif du site est proratisé à son effectif",
                0 < ns["cible"] <= ns["effectif"], str(ns))
        verifie("un objectif par défaut est proposé, pas demandé",
                ns["propose"] >= 3 and ns["choisi"] is False, str(ns["propose"]))
        verifie("un objectif plus grand que l'effectif est refusé",
                ns["trop"] is not None and "inatteignable" in ns["trop"], str(ns["trop"]))
        verifie("un objectif nul est refusé", ns["zero"] is not None)

        connecte(p, "u3", "#/annonces")
        an = norm(p.inner_text(".content"))
        verifie("les cartes disent qui vient, pas seulement combien de places",
                "y va" in an or "y vont" in an)
        verifie("et elles disent quand on y va soi-même", "Vous y allez" in an)
        qv = p.evaluate("""async () => {
          const d = await import('/app/data.js');
          return { don: d.DB.quiVient('an4', 'u3'),
                   benevolat: d.DB.quiVient('an2', 'u3'),
                   sansOptIn: d.DB.quiVient('an2', 'u5') };
        }""")
        verifie("aucune preuve sociale sur un don en argent",
                qv["don"]["total"] == 0 and qv["don"]["collegues"] == 0,
                "qui donne, à qui et combien est la donnée la mieux protégée du produit")
        verifie("le nombre de collègues est toujours donné",
                qv["benevolat"]["collegues"] >= 1)
        verifie("le prénom ne sort que pour qui l'a choisi",
                "Sonia" in qv["benevolat"]["noms"], str(qv["benevolat"]["noms"]))
        vis = p.evaluate("""async () => {
          const d = await import('/app/data.js');
          d.DB.reglerVisibiliteParis('u4', false);
          const apres = d.DB.quiVient('an2', 'u3');
          d.DB.reglerVisibiliteParis('u4', true);
          return { noms: apres.noms, collegues: apres.collegues };
        }""")
        verifie("retirer sa visibilité retire le prénom, pas le compteur",
                vis["noms"] == [] and vis["collegues"] >= 1, str(vis))

        connecte(p, "u3", "#/preferences")
        pr = norm(p.inner_text(".content"))
        verifie("le réglage de visibilité est offert au salarié, décoché par défaut",
                "Mes collègues peuvent voir que je participe" in pr)
        verifie("il explique pourquoi il est décoché par défaut",
                "convictions" in pr and "jamais pour un don en argent" in pr)

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
        p.goto(f"{BASE}/rejoindre.html?code=VAUDREY-7QK2", wait_until="networkidle")
        p.wait_for_timeout(300)
        verifie("le nom de l'entreprise s'affiche", "Vaudrey" in p.inner_text("h1"))
        p.fill("#nom", "Test Automatique"); p.fill("#mail", "test.auto@vaudrey-ciments.fr")
        p.click("button[type=submit]"); p.wait_for_timeout(400)
        verifie("le compte est créé", "Bienvenue" in p.inner_text("h1"))
        p.goto(f"{BASE}/rejoindre.html?code=INEXISTANT-0000", wait_until="networkidle")
        p.wait_for_timeout(300)
        verifie("un code inconnu est refusé", "n'existe pas" in p.inner_text("body"))
        # domaine de messagerie : le lien ne doit pas laisser entrer n'importe qui
        p.goto(f"{BASE}/rejoindre.html?code=VAUDREY-7QK2", wait_until="networkidle")
        p.wait_for_timeout(300)
        verifie("le domaine autorisé est annoncé", "vaudrey-ciments.fr" in p.inner_text("body"))
        # La base légale est l'intérêt légitime : pas de case « j'accepte » qu'on ne
        # peut pas décocher sans perdre l'accès, mais une information avant l'entrée.
        corps = p.inner_text("body")
        verifie("on informe au lieu de faire semblant de demander un consentement",
                "J'accepte que mon nom" not in corps and "Ce que votre entreprise verra" in corps)
        verifie("le cloisonnement des dons personnels est dit dès l'inscription",
                "de votre poche" in corps)
        p.fill("#nom", "Intrus Extérieur"); p.fill("#mail", "intrus@gmail.com")
        p.click("button[type=submit]"); p.wait_for_timeout(400)
        verifie("une adresse hors domaine est refusée",
                "n'accepte que" in p.inner_text(".toast"))

        print("\nConsentement et éligibilité")
        connecte(p, "u4", "#/annonces")
        # Explicitement une annonce sur le temps de travail portée par une association
        # ÉLIGIBLE : depuis que le régime de L. 8241-3 est vérifié à l'engagement, une
        # annonce hors régime n'ouvre plus le formulaire mais un refus motivé.
        p.evaluate("""()=>{const o=[...document.querySelectorAll('.annonce')]
            .find(x=>/Temps de travail/.test(x.innerText) && !/secteur aval/.test(x.innerText));
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

        # Une annonce sur le temps de travail portée par une association qui ne
        # déclare pas son éligibilité : hors L. 8241-3, c'est un prêt illicite.
        connecte(p, "u4", "#/annonces")
        ouvert = p.evaluate("""()=>{
          const o = [...document.querySelectorAll('.annonce')]
            .find(x => /secteur aval/.test(x.innerText));
          if (!o) return false; o.querySelector('[data-go]').click(); return true;
        }""")
        p.wait_for_timeout(350)
        verifie("l'annonce de démonstration hors régime existe bien", ouvert)
        md = norm(p.inner_text(".modal"))
        verifie("une mise à disposition hors régime est refusée avant le formulaire",
                "ne peut pas se faire sur le temps de travail" in norm(p.inner_text(".modal-titre, .modal h2, .modal")))
        verifie("le refus cite l'article et dit pourquoi",
                "L. 8241-3" in md and "prêt de main-d'œuvre gratuit redevient illicite" in md)
        verifie("il n'y a plus de formulaire d'engagement derrière",
                not p.is_visible(".modal #q"))
        verifie("et il propose la seule voie qui reste : le temps personnel",
                "sur votre temps personnel" in md and "bénévolat" in md)
        rej = p.evaluate("""async () => {
          const d = await import('/app/data.js');
          try { d.DB.engager({ annonce:'an24', entreprise:'e1', salarie:'u3',
            quantite:1, consentement:true }); return null; }
          catch (e){ return e.message; }
        }""")
        verifie("le modèle refuse aussi, pas seulement l'écran",
                rej is not None and "L. 8241-3" in rej, str(rej))

        connecte(p, "u2", "#/mecenat")
        p.click("#conv"); p.wait_for_timeout(350)
        cv = norm(p.inner_text(".modal"))
        verifie("la convention ne propose pas les missions hors régime",
                "ne déclare pas leur éligibilité au mécénat" in cv
                or "ne déclare pas leur éligibilité" in cv, cv[:300])
        p.evaluate("()=>[...document.querySelectorAll('.modal .btn')].find(b=>/Annuler/.test(b.textContent)).click()")
        p.wait_for_timeout(200)

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
                "coût saas par mission" in tr and "d'abonnement /" in tr)
        verifie("et il dit ce qu'il n'inclut pas",
                "n'inclut pas" in tr and "temps de vos salariés" in tr)
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

        print("\nLe silence d'une association")
        # Les quatorze jours racontaient trois histoires différentes selon la page.
        # Une seule formulation, et surtout : un silence n'est pas une faute.
        pages = {}
        for nom, url in [("acquisition", "/associations.html"), ("charte", "/charte-associations.html"),
                         ("règlement", "/reglement.html"), ("accueil", "/")]:
            p.goto(BASE + url, wait_until="networkidle"); p.wait_for_timeout(200)
            pages[nom] = p.inner_text("body")
        for nom, corps in pages.items():
            verifie(f"la clôture automatique est nommée telle quelle ({nom})",
                    "clôturée automatiquement sans confirmation" in corps
                    or "clôture automatique" in corps)
        verifie("aucune page ne dit qu'un silence vaut réalisation",
                all("comptée comme réalisée" not in c and "considérée comme réalisée" not in c
                    for c in pages.values()))
        verifie("la charte dit qu'un silence n'entraîne pas de suspension",
                "n'entraîne aucune suspension" in pages["charte"])
        verifie("la charte distingue le silence de la fausse confirmation",
                "volontairement fausse" in pages["charte"])
        connecte(p, "u7", "#/avalider")
        verifie("l'association lit la même phrase dans son espace",
                "clôturée automatiquement" in p.inner_text(".content"))

        print("\nLe don en argent sur la page publique")
        p.goto(f"{BASE}/asso.html?id=a2", wait_until="networkidle"); p.wait_for_timeout(500)
        fiche = norm(p.inner_text("body"))
        verifie("aucun bouton de paiement : Riseva n'encaisse pas",
                p.eval_on_selector_all("#go", "e=>e.length") == 0)
        verifie("le compte affiché est celui de l'association",
                "FR55 1027 8073 0000 0204 7260 146" in fiche and "Racines Vives" in fiche)
        verifie("il est dit que Riseva ne reçoit rien et ne prélève rien",
                "Riseva n'encaisse rien" in fiche and "sans intermédiaire" in fiche)
        verifie("le donateur est invité à vérifier le bénéficiaire chez sa banque",
                "nom du bénéficiaire affiché par" in fiche)
        verifie("le reçu reste délivré par l'association",
                "seule habilitée" in fiche)
        verifie("aucune promesse de paiement sécurisé", "Paiement sécurisé" not in fiche)
        # Une association sans IBAN ne montre pas de moyen de lui donner de l'argent.
        p.goto(f"{BASE}/asso.html?id=a3", wait_until="networkidle"); p.wait_for_timeout(400)
        sans = norm(p.inner_text("body"))
        verifie("sans IBAN, aucun circuit n'est proposé",
                "n'est pas ouvert ici" in sans and "nulle part où envoyer" in sans)
        p.goto(f"{BASE}/asso.html?id=a2", wait_until="networkidle"); p.wait_for_timeout(400)
        fiche = norm(p.inner_text("body"))
        verifie("un don personnel ne rapporte rien à l'employeur",
                "points pour l'entreprise du donateur" not in fiche)
        # La fiche publique suit les mêmes règles que la page Annonces.
        verifie("l'objectif est un objectif, pas un multiplicateur",
                "Objectif : 400 arbres plantés" in fiche)
        # « 1 200 arbres plantés » contient « 0 arbres plantés » : on cherche un zéro
        # isolé, pas une chaîne de caractères.
        verifie("aucun objectif à zéro n'est affiché",
                re.search(r"Objectif\s*:\s*0\s", fiche) is None)

        print("\nLa page que l'association partage")
        p.goto(f"{BASE}/asso.html?id=a2", wait_until="networkidle"); p.wait_for_timeout(400)
        f = p.inner_text("body")
        verifie("son nom juridique et son RNA y figurent", "loi 1901" in f and "W631004567" in f)
        verifie("ses propres liens y figurent", "Leur site" in f and "Instagram" in f)
        verifie("elle peut partager la page", "Partager cette page" in f)
        verifie("ce que Riseva vérifie est daté", "Riseva a vérifié le" in f)
        verifie("ce que Riseva ne vérifie pas est dit aussi",
                "ne vérifie pas" in f and "éligibilité fiscale" in f)
        verifie("le résultat est attribué à l'association",
                "Résultats déclarés par Racines Vives" in f)

        print("\nLes formulaires publics")
        # Une association ne demande pas un rendez-vous, elle demande un compte. Le
        # formulaire ouvrait une conversation et promettait un rappel sous deux
        # jours ouvres : un delai de plus entre l'envie et l'inscription, et une
        # promesse a tenir a la main. Les quatre champs suffisent a ouvrir le
        # compte, et c'est ce que ce bloc verifie de bout en bout.
        p.goto(f"{BASE}/associations.html#commencer", wait_until="networkidle")
        p.evaluate("()=>{localStorage.removeItem('riseva.session');"
                   "localStorage.removeItem('riseva.etat');"
                   "localStorage.removeItem('riseva.nouvelleAsso')}")
        p.fill("#fa-asso", "Les Amis du Bocage"); p.fill("#fa-ville", "Rennes")
        p.fill("#fa-mot", "des bras un samedi matin")
        p.fill("#fa-mail", "contact@bocage.org")
        # Le bulletin se remplit pendant la frappe : c'est ce qui donne envie d'aller
        # au bout d'un formulaire.
        verifie("le bulletin se remplit à mesure",
                "4 / 4" in norm(p.inner_text("#bulletin")))
        # Et la barre de progression suit reellement ce qui est saisi. Elle etait
        # une courbe ondulee etiree en largeur : a deux champs sur quatre le trait
        # ne tombait pas au milieu, et l'erreur changeait avec la fenetre.
        # La largeur est animee : on laisse la transition finir avant de mesurer,
        # sinon on mesure le depart et pas l'arrivee.
        p.wait_for_timeout(700)
        barre = p.evaluate("""()=>{const f=document.querySelector('#blBar');
            return Math.round(f.getBoundingClientRect().width
                   / f.parentElement.getBoundingClientRect().width * 100);}""")
        verifie("la barre de progression est pleine quand les quatre champs le sont",
                barre >= 99, str(barre) + " %")
        p.fill("#fa-mail", ""); p.wait_for_timeout(650)
        moitie = p.evaluate("""()=>{const f=document.querySelector('#blBar');
            return Math.round(f.getBoundingClientRect().width
                   / f.parentElement.getBoundingClientRect().width * 100);}""")
        verifie("et elle redescend exactement d'un quart quand un champ se vide",
                73 <= moitie <= 77, str(moitie) + " %")
        p.fill("#fa-mail", "contact@bocage.org"); p.wait_for_timeout(400)

        p.click("#formAsso [type=submit]")
        p.wait_for_url("**/app/**", timeout=8000)
        p.wait_for_timeout(900)
        verifie("le formulaire ouvre un compte au lieu de promettre un rappel",
                "/app/" in p.url and "dossier" in p.url)
        ecran = norm(p.inner_text("body"))
        verifie("l'association arrive directement dans son dossier",
                "Les Amis du Bocage" in ecran)
        cree = p.evaluate("""async()=>{const m=await import('/app/data.js');
            const a=m.DB.associations().find(x=>x.nom==='Les Amis du Bocage');
            return a ? {ville:a.ville, valide:a.valide, resume:a.resume} : null}""")
        verifie("la fiche existe dans la base avec ce qui a été saisi",
                cree and cree["ville"] == "Rennes"
                and "des bras un samedi matin" in (cree["resume"] or ""), str(cree))
        # Elle existe, et elle n'est pas encore visible : la verification passe
        # avant la mise en ligne, c'est la decision du 20/08 et elle tient.
        verifie("mais elle n'est pas visible avant vérification",
                cree and cree["valide"] is False)

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
        # Le tableau de bord d'une association doit répondre à ses quatre questions,
        # pas afficher les chiffres qui nous intéressent, nous.
        verifie("elle voit d'abord ce qu'elle doit confirmer", "À confirmer" in t7)
        verifie("elle voit qui vient et quand", "Qui vient" in t7)
        verifie("elle voit ce qu'elle a réalisé, pas ce que les entreprises ont produit",
                "réalisé avec le soutien" in t7 and "produit chez vous" not in t7)
        verifie("elle peut sortir un tableau pour son conseil d'administration",
                "conseil d'administration" in t7)
        verifie("sa page publique est présentée comme la sienne",
                "Votre page publique" in t7 and "% complète" in t7)
        verifie("les places restantes se lisent en places, pas en fraction",
                "place" in t7 and "4 / 6" not in t7)

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

        print("\nLa fiche que l'association tient elle-même")
        # Cet ecran avait un champ, un bouton, et aucun des deux n'etait branche :
        # une association qui s'inscrivait seule ne pouvait rien dire d'elle.
        connecte(p, "u7", "#/page")
        verifie("la page publique s'édite depuis l'espace de l'association",
                p.locator("#pa-res").count() == 1 and p.locator("#pa-save").count() == 1)
        verifie("elle peut publier une photo de ce qu'elle fait",
                p.locator("#phB").count() == 1)
        p.evaluate("""()=>{const t=document.querySelector('#pa-res');
          t.value="Nous ramassons les dechets des berges de la Loire avec des benevoles, "
                 +"et nous replantons ce qui peut l'etre sur les rives abimees.";
          t.dispatchEvent(new Event('input'));
          document.querySelector('#pa-save').click();}""")
        p.wait_for_timeout(350)
        verifie("ce qu'elle écrit est enregistré",
                "berges de la Loire" in p.evaluate(
                  """async()=>{const m=await import('/app/data.js');
                     return m.DB.association('a1').resume;}"""))
        # Une presentation de deux mots ne dit rien a un salarie qui decouvre.
        refus = p.evaluate("""async()=>{const m=await import('/app/data.js');
          try{ m.DB.majAssociation('a1',{resume:'Trop court.'}); return 'aucun refus'; }
          catch(e){ return e.message; }}""")
        verifie("une présentation de deux mots est refusée, avec la raison",
                "quarante caractères" in refus, refus[:80])
        photo = p.evaluate("""async()=>{const m=await import('/app/data.js');
          try{ m.DB.majAssociation('a1',{photo:'javascript:alert(1)'}); return 'aucun refus'; }
          catch(e){ return e.message; }}""")
        verifie("une adresse de photo qui n'est ni un fichier ni https est refusée",
                "https" in photo, photo[:80])

        connecte(p, "u2", "#/annuaire")
        p.wait_for_timeout(250)
        cartes = p.eval_on_selector_all("#liste article", "e=>e.length")
        avec = p.eval_on_selector_all("#liste article .couv", "e=>e.length")
        verifie("chaque association de l'annuaire porte une image",
                cartes > 0 and avec == cartes, f"{avec} / {cartes}")

        print("\nUne valeur absente reste absente")
        # La regle la plus structurante du produit, et elle etait violee dans la
        # consolidation : une cle qu'aucun site n'avait declaree valait zero.
        connecte(p, "u2", "#/indicateurs")
        r = p.evaluate("""async()=>{const m=await import('/app/data.js');
          const D=m.DB, out={};
          const c=D.campagnes()[0];
          const ind=D.indicateursDe({campagne:c.id, groupe:'g1'});
          // Une cle du catalogue que le jeu de demonstration ne renseigne pas.
          const jamais=Object.keys(ind.somme).filter(k=>ind.somme[k]===null);
          out.aDesNull = jamais.length > 0;
          out.zeroInvente = Object.keys(ind.somme).some(k =>
            ind.somme[k] === 0 && (ind.sitesParCle[k] || 0) === 0);
          out.assise = typeof ind.assise === 'object';
          return out;}""")
        verifie("une valeur qu'aucun site n'a déclarée vaut « absente », pas zéro",
                r["aDesNull"] and not r["zeroInvente"], str(r))
        verifie("chaque taux dit sur quelle assise il repose", r["assise"])

        # Le rapport de l'employeur ne contient pas les dons personnels de ses
        # salaries : le seuil d'agregation de cinq donateurs ne vaut rien si le
        # detail ressort ligne a ligne dans l'export.
        fuite = p.evaluate("""async()=>{const m=await import('/app/data.js');
          const D=m.DB;
          const r=D.rapport('e1');
          const perso=D.missions({entreprise:'e1'}).filter(x=>D.estDonPersonnel(x));
          const euros=perso.reduce((n,x)=>n+(Number(x.quantite)||0),0);
          return {dons:perso.length, euros, rapportEuros:r.euros,
                  points:r.parType.don_financier||0};}""")
        verifie("le rapport de l'entreprise ignore les dons personnels",
                fuite["dons"] > 0 and fuite["rapportEuros"] < fuite["euros"] + 1
                and fuite["rapportEuros"] != fuite["euros"], str(fuite))

        print("\nCe que la vitrine promet existe dans le produit")
        # Une phrase de vitrine qui n'a pas son geste dans l'application est une
        # promesse qu'on decouvre fausse le jour de l'inscription.
        connecte(p, "u7", "#/mesannonces")
        p.evaluate("()=>document.querySelector('#np')?.click()"); p.wait_for_timeout(300)
        verifie("le formulaire d'annonce propose des modèles",
                p.locator(".modal #modeles [data-m]").count() >= 4)
        p.evaluate("()=>document.querySelector('#modeles [data-m=\"0\"]').click()")
        p.wait_for_timeout(200)
        rempli = p.evaluate("""()=>({t:document.querySelector('#titre').value,
          d:document.querySelector('#desc').value, q:document.querySelector('#q').value})""")
        verifie("un modèle remplit le titre, la description et la quantité",
                len(rempli["t"]) > 5 and len(rempli["d"]) > 40 and rempli["q"] not in ("", "0"))
        p.evaluate("()=>document.querySelector('.overlay')?.remove()")

        connecte(p, "u7", "#/tableau")
        t = p.inner_text(".content")
        verifie("l'association lit combien d'entreprises peuvent venir chez elle",
                "Qui peut venir chez vous" in t)
        vide_autour = p.evaluate("""async()=>{const m=await import('/app/data.js');
          const r = m.DB.entreprisesAutour('a1');
          return typeof r.entreprises === 'number' && typeof r.rayon === 'number';}""")
        verifie("ce chiffre se calcule, il ne s'écrit pas", vide_autour)

        vit = (RACINE / "associations.html").read_text(encoding="utf-8")
        verifie("la page association ne promet aucun appel téléphonique",
                "appelez-nous" not in vit and "nous vous rappelons" not in vit)
        verifie("elle ne dit pas « aucun compte à ouvrir » sous un bouton qui en ouvre un",
                "Aucun compte à ouvrir" not in vit)

        print("\nUn document contractuel ne contredit pas le produit")
        reg = (RACINE / "reglement.html").read_text(encoding="utf-8")
        formats = p.evaluate("""async()=>{const m=await import('/app/data.js');
          return Object.values(m.BAREME).map(b=>b.label);}""")
        manque = [f for f in formats if f not in reg]
        verifie("le règlement liste les sept formats du barème, pas trois",
                not manque, ", ".join(manque))

        eng = (RACINE / "engagements.html").read_text(encoding="utf-8")
        verifie("les cinq critères de démarrage sont écrits dans les engagements",
                "Le démarrage" in eng and "acompte est remboursé" in eng)
        rayon = p.evaluate("""async()=>{const m=await import('/app/data.js');
          return m.DB.RAYON_OFFRE_KM;}""")
        verifie("le rayon sur lequel on s'engage est celui que l'écran montre",
                f"{rayon} km" in eng and "50 km" not in eng, str(rayon))

        vit = (RACINE / "associations.html").read_text(encoding="utf-8")
        verifie("la page association ne promet pas que rien ne compte sans elle",
                "ne rapporte rien à personne" not in vit and "quatorze jours" in vit)

        sql = (RACINE.parent / "supabase" / "02_logique.sql").read_text(encoding="utf-8")
        bornes = p.evaluate("""async()=>{const m=await import('/app/data.js');
          return m.CATEGORIES.map(c=>c.max).slice(0,3);}""")
        verifie("les tranches d'effectif sont les mêmes dans le navigateur et dans la base",
                all(f"< {b + 1}" in sql for b in bornes), str(bornes))

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
        # Le compteur du réseau ne doit apparaître que si les chiffres viennent de la
        # vraie base. En démonstration, l'accueil doit dire qu'il n'y a rien, pas
        # afficher des totaux inventés qu'un acheteur lira comme des références.
        p.goto(BASE + "/", wait_until="networkidle"); p.wait_for_timeout(600)
        acc = norm(p.inner_text("body"))
        verifie("aucun total de démonstration sur la page d'accueil",
                "199 missions" not in acc and "3 042" not in acc and "31 400" not in acc)
        # L'aveu tient maintenant en un bandeau et non en une section entiere avec
        # trois grands chiffres : mettre en scene l'absence de resultats lui
        # donnait autant de place qu'a une preuve. Il reste au meme endroit, et il
        # dit toujours la meme chose.
        pr = norm(p.inner_text("#faq"))
        verifie("la FAQ dit qu'il n'y a encore rien à montrer",
                "jeu de démonstration" in pr
                and "La première saison démarre en janvier" in pr)
        cumul = p.evaluate("""async()=>{const m=await import('/app/data.js');
                    const r=m.DB.impactReseau();
                    return [r.confirmees, r.closesSansReponse, r.missions]}""")
        verifie("le cumul distingue les confirmations des clôtures d'office",
                cumul[0] + cumul[1] == cumul[2] and cumul[1] > 0, str(cumul))

        print("\nL'affiche et son code QR")
        # L'affiche est le seul support papier du produit. Un lien de cinquante
        # caracteres recopie a la main au-dessus d'une machine a cafe n'est
        # jamais recopie : sans code QR, c'est une affiche qu'on regarde.
        connecte(p, "u2", "#/supports")
        with p.context.expect_page() as onglet:
            p.click("#affiche")
        aff = onglet.value
        aff.wait_for_load_state("domcontentloaded"); aff.wait_for_timeout(300)
        verifie("l'affiche porte le logo de Riseva",
                aff.eval_on_selector_all("img[src*='riseva-full']", "l=>l.length") == 1)
        verifie("elle porte un code QR dessine sur place, pas une image appelee dehors",
                aff.eval_on_selector_all("svg.qr path", "l=>l.length") == 1)
        verifie("elle porte le lien d'inscription en clair aussi",
                "rejoindre.html?code=" in aff.inner_text(".lien"))
        verifie("le code QR est fabrique a partir de ce lien-la",
                aff.evaluate("()=>document.querySelector('svg.qr path')"
                             ".getAttribute('d').length") > 400)
        aff.close()

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
        # Une facture d'acompte pour une saison non reconduite crée une créance qui
        # n'existe pas, et contredit « pas de reconduction tacite » sur le même écran.
        connecte(p, "u2", "#/abonnement")
        ct = norm(p.inner_text(".content"))
        verifie("rien n'est dû tant que le renouvellement n'est pas décidé",
                "Non décidée" in ct and "Reste à régler" in ct and "tout est à jour" in ct)
        verifie("la saison suivante est proposée, pas facturée",
                "Proposition de renouvellement" in ct and "Devis, pas une facture" in ct)
        verifie("l'acompte est donné HT et TTC", "engagement ferme" in ct
                and re.search(r"\d[\d ]* € HT", ct) is not None)
        avantF = p.eval_on_selector_all("tbody tr", "r=>r.length")
        p.click("#rec"); p.wait_for_timeout(400)
        verifie("accepter le renouvellement émet alors la facture",
                p.eval_on_selector_all("tbody tr", "r=>r.length") == avantF + 1)
        p.click("#rec"); p.wait_for_timeout(400)
        verifie("annuler la retire, tant qu'elle n'est pas payée",
                p.eval_on_selector_all("tbody tr", "r=>r.length") == avantF)
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
                "2 demi-journées" in norm(p.inner_text(".content")),
                "la mission de Rivière Propre 42, non éligible, doit être exclue")
        verifie("une mission close sans réponse ne fabrique pas de réduction d'impôt",
                "attendent une confirmation" in t and "pas dans votre assiette fiscale" in t,
                "article 238 bis : on valorise ce qui a été fait, pas un silence")
        verifie("elle reste comptée en points, et on dit à qui écrire",
                "compte dans vos points" in t or "comptent dans vos points" in t)
        verifie("le plafond de 20 % du revenu des salariés n'est pas passé sous silence",
                "20 % de son revenu imposable" in t and "Au plus" in t)

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
        verifie("le dossier de traçabilité s'édite", "Dossier de traçabilité" in d)
        verifie("il ne se présente pas comme un audit",
                "non auditées par Riseva" in d and "empreinte" in d.lower())
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
                "Justificatifs" in t and ("Calcul incomplet" in t or "Contrôles complets" in t))
        verifie("un calcul incomplet n'est pas présenté comme déclarable",
                "Non utilisable pour la déclaration" in t
                and "Estimation maximale potentielle" in t)
        verifie("le plafond et le report ne sont pas inventés",
                t.count("non calculé") >= 2)
        # Et une fois l'exercice déclaré, le calcul redevient possible : sinon on aurait
        # remplacé un chiffre faux par une impasse.
        connecte(p, "u2", "#/parametres")
        p.fill("#exdeb", "2026-01-01"); p.fill("#exfin", "2026-12-31")
        p.fill("#dhors", "0"); p.fill("#rant", "0")
        p.click("#save"); p.wait_for_timeout(400)
        p.evaluate("()=>location.hash='#/mecenat'"); p.wait_for_timeout(400)
        tm = norm(p.inner_text(".content"))
        verifie("l'exercice déclaré rend le plafond calculable",
                "non calculé" not in tm and "Réduction d'impôt estimée" in tm)
        verifie("la piste d'audit est donnée salarié par salarié",
                "piste d'audit" in t and "Coût retenu" in t and "Convention" in t)
        verifie("une durée conventionnelle est signalée comme telle",
                "durée conventionnelle" in t)
        verifie("le plafond par salarié est rappelé", "12 015 €" in t)
        verifie("le non déductible est distingué", "Non déductible" in t)
        p.click("#conv"); p.wait_for_timeout(300)
        verifie("le choix de la mission s'ouvre", p.is_visible(".modal #mi"))
        md = norm(p.inner_text(".modal"))
        verifie("le prêt de main-d'œuvre est nommé pour ce qu'il est",
                "prêt de main-d'œuvre" in md and "jamais une prestation de service" in md)
        verifie("la durée ne change pas le régime",
                "une demi-journée relève du même régime que six mois" in md)
        verifie("le bon régime est cité, et le mauvais écarté",
                "L. 8241-3" in md and "L. 8241-2" in md and "pas d'avenant" in md)
        verifie("l'accord écrit du salarié est posé en condition",
                "accord exprès" in md and "R. 8241-2" in md)
        # Un horodatage prouve qu'une case a été cochée ; il ne dit pas à quoi.
        # « Exprès », à l'article R. 8241-2, qualifie le contenu de l'accord.
        cons = p.evaluate("""async () => {
          const d = await import('/app/data.js');
          const t = d.DB.texteConsentement('an1');
          const a = d.DB.annonce('an1');
          const asso = d.DB.association(a.asso);
          const m = d.DB.missions({ entreprise:'e1' }).find(x => x.consentement);
          return { t, titre:a.titre, asso:asso.nom,
                   fige: m ? m.consentement.texte : null };
        }""")
        verifie("le texte du consentement nomme la mission et l'organisme",
                cons["titre"] in cons["t"] and cons["asso"] in cons["t"])
        verifie("il rappelle que le contrat de travail se poursuit",
                "contrat de travail se poursuit" in cons["t"])
        verifie("il rappelle que le refus n'est pas une faute",
                "ni un motif de sanction" in cons["t"])
        verifie("chaque mission consentie porte son propre texte, figé",
                bool(cons["fige"]) and "accord exprès" in cons["fige"])
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
        # La convention doit produire le texte accepté, mot pour mot. Une date
        # seule atteste qu'on a coché, pas ce qu'on a lu.
        verifie("la convention reproduit le texte accepté par le salarié",
                "Texte accepté par le Salarié" in d
                and "accord exprès à cette mise à disposition" in d)
        doc.close()

        # Le bon Cerfa selon l'origine du don, et pas l'inverse. Les deux modèles
        # ouvrent des droits à deux contribuables différents ; un reçu au mauvais
        # formulaire peut être écarté en contrôle, et l'article 1740 A du CGI
        # sanctionne l'association qui l'a signé, pas l'outil qui l'a préparé.
        cf = p.evaluate("""async () => {
          const d = await import('/app/data.js');
          let refus = false;
          try { d.cerfaPour('autre'); } catch { refus = true; }
          return { sal: d.cerfaPour('salarie'), ent: d.cerfaPour('entreprise'), refus };
        }""")
        verifie("le don personnel d'un salarié relève du 2041-RD, article 200",
                cf["sal"]["numero"] == "11580*05" and cf["sal"]["modele"] == "2041-RD"
                and cf["sal"]["article"] == "200 du CGI")
        verifie("le don de l'entreprise relève du 2041-MEC-SD, article 238 bis",
                cf["ent"]["numero"] == "16216*03" and cf["ent"]["modele"] == "2041-MEC-SD"
                and cf["ent"]["article"] == "238 bis du CGI")
        verifie("les deux modèles ne se confondent jamais",
                cf["sal"]["numero"] != cf["ent"]["numero"])
        verifie("une origine inconnue ne produit pas un modèle par défaut", cf["refus"])

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
        # Un rang est un fait dès trois entreprises ; un décile est une statistique
        # qui en demande dix. Confondre les deux vidait l'écran toute la saison.
        verifie("le classement s'affiche dès trois entreprises",
                p.eval_on_selector_all("tbody tr", "r=>r.length") >= 3)
        verifie("le rang de l'entreprise est mis en avant",
                "Votre rang" in c and "sur" in c)
        verifie("son nom et ses points y figurent",
                "points retenus" in c and "points par salarié" in c)
        verifie("la cohorte reste trop petite pour parler de décile",
                "trop petite pour parler de décile" in c and "top 10 %" not in c)
        verifie("le score de l'entreprise est montré à la place",
                "point" in c and "par salarié" in c)
        verifie("chaque ligne porte un écusson, logo ou initiales",
                p.eval_on_selector_all("tbody tr img, tbody tr span[aria-hidden]",
                                       "r=>r.length") >= 3)
        verifie("une ligne anonyme n'affiche ni logo ni secteur",
                p.evaluate("""()=>{
                  const l=[...document.querySelectorAll('tbody tr')]
                    .find(r=>/non nommée/.test(r.textContent));
                  return !l || (!l.querySelector('img') && !/Logistique|Industrie|Conseil/.test(l.textContent));
                }"""),
                "un logo est un identifiant plus fort qu'un nom")
        verifie("l'écrêtage est montré", "Plafond par format" in t)
        verifie("le classement ne se confond pas avec une assiette fiscale",
                "n'est pas non plus une assiette fiscale" in norm(c)
                and "aucun taux de conversion" in norm(c),
                "un point n'est pas un euro déductible, et rien ne convertit l'un en l'autre")
        p.evaluate("()=>document.querySelector('.overlay')?.remove()")

        connecte(p, "u1", "#/journal")
        verifie("le journal liste des envois", p.eval_on_selector_all("tbody tr", "r=>r.length") > 3)

        print("\nGroupe, sites et quotas")
        # Un groupe consolide, il ne fusionne pas : chaque société garde son SIREN, son
        # plafond et ses salariés. Et un référent de site ne voit que son site.
        connecte(p, "u2", "#/groupe")
        g = norm(p.inner_text(".content"))
        verifie("la vue de groupe agrège les sociétés et les sites",
                "Vaudrey Ciments" in g and "Vaudrey Négoce" in g and "Marseille" in g)
        verifie("le consolidé est un rapport de sommes, et le dit",
                "somme des points / somme des effectifs" in g)
        verifie("la réduction d'impôt n'est pas un chiffre de groupe",
                "société par société" in g and "calcul fiscal complet" in g)
        verifie("le classement entre sites est désactivé par défaut",
                "Désactivé par défaut" in g and "fabrique un dernier" in g)
        verifie("un site qui n'a pas commencé n'est pas classé dernier",
                "En lancement" in g)
        verifie("le nombre de mobilisés et de missions accompagne le score",
                "mobilisé" in g and "mission" in g)
        verifie("ce n'est pas présenté comme une performance RSE des sites",
                "challenge d'engagement associatif" in g
                and "aucune incidence sur l'évaluation" in g)
        verifie("le classement entre sites est normalisé par l'effectif",
                "pts / salarié" in g)

        connecte(p, "u2", "#/sites")
        s2 = norm(p.inner_text(".content"))
        verifie("les compteurs de quota ne sont pas trompeurs",
                "Capacité achetée" in s2 and "Réparties en quotas" in s2
                and "Comptes ouverts" in s2 and "Encore activables" in s2)
        verifie("le lien de référent est présenté comme nominatif",
                "nominatif" in s2)

        # Le cloisonnement : c'est le point qui décide, pour un groupe.
        connecte(p, "u10", "#/equipe")
        r1 = norm(p.inner_text(".content"))
        verifie("un référent de site ne voit que les salariés de son site",
                "Malik" in r1 and "Sonia" not in r1 and "Hugo" not in r1)
        verifie("il n'a pas accès au contrat ni au mécénat",
                not p.eval_on_selector_all(".side__link[href='#/mecenat']", "l=>l.length")
                and not p.eval_on_selector_all(".side__link[href='#/abonnement']", "l=>l.length"))
        verifie("il n'a pas la vue consolidée du groupe",
                not p.eval_on_selector_all(".side__link[href='#/groupe']", "l=>l.length"))

        # Un lien de site n'établit pas l'appartenance à ce site : une adresse
        # professionnelle est souvent commune à tout le groupe. Tant que le
        # rattachement n'est pas confirmé, les points iraient au mauvais endroit.
        bloque = p.evaluate("""async()=>{const m=await import('/app/data.js');
            const i=m.DB.creerInvitation('e1', 5, 'et2');
            const r=m.DB.rejoindre(i.code, 'Test Rattachement', 'test.rattach@vaudrey-ciments.fr');
            let err='';
            try{ m.DB.engager({annonce:'an1', entreprise:'e1', salarie:r.utilisateur.id, quantite:1}) }
            catch(e){ err=e.message }
            const avant=m.DB.affectationsAConfirmer('e1','et2').length;
            m.DB.confirmerAffectation(r.utilisateur.id,'et2');
            let ok=true; try{ m.DB.engager({annonce:'an1', entreprise:'e1', salarie:r.utilisateur.id, quantite:1}) }
            catch(e){ ok=false }
            return [err, avant, ok]}""")
        verifie("un compte non rattaché ne peut pas s'engager",
                "confirmé par votre référent" in bloque[0], bloque[0])
        verifie("il apparaît dans la liste à confirmer du site", bloque[1] >= 1, str(bloque[1]))
        verifie("une fois rattaché, il peut s'engager", bloque[2] is True)

        # Une mutation ne doit pas déplacer le passé.
        fige = p.evaluate("""async()=>{const m=await import('/app/data.js');
            const av=m.DB.classementSites({groupe:'g1'}).find(x=>x.ville==='Lyon').points;
            const u=m.DB.utilisateur('u3'); const avant=u.etablissement;
            u.etablissement='et3';
            const ap=m.DB.classementSites({groupe:'g1'}).find(x=>x.ville==='Lyon').points;
            u.etablissement=avant;
            return [av, ap]}""")
        verifie("une mutation ne déplace pas les missions déjà faites",
                fige[0] == fige[1], str(fige))

        # Le tableau de bord d'une entreprise multi-sites montre ses sites, et la
        # facturation donne de quoi imputer la dépense.
        connecte(p, "u2", "#/tableau")
        tb = norm(p.inner_text(".content"))
        verifie("le tableau de bord montre les sites, normalisés par l'effectif",
                "Vos sites" in tb and "par salarié" in tb.replace("/ salarié", "par salarié"))
        connecte(p, "u2", "#/abonnement")
        verifie("une clé de répartition analytique est proposée",
                p.eval_on_selector_all("#csvR", "l=>l.length") == 1)

        print("\nIndicateurs sociaux et sécurité")
        connecte(p, "u2", "#/indicateurs")
        i = norm(p.inner_text(".content"))
        verifie("les états de la collecte sont nommés sans ambiguïté",
                "Approuvé" in i and "En attente d'approbation" in i and "Soumis" in i)
        verifie("la couverture est dite en sites et en effectifs",
                "salariés sur" in i)
        verifie("un aperçu non approuvé est annoncé comme provisoire",
                "Aperçu provisoire" in i and "seule qui entre dans un rapport" in i)
        verifie("les taux sont annoncés comme internes, pas réglementaires",
                "Fréquence interne" in i and "accidents en premier règlement" in i)
        verifie("le taux d'emploi OETH n'est pas calculé au niveau du site",
                "ne calcule pas le taux d'emploi" in i)
        verifie("les formules sont écrites à côté des taux",
                "x 1 000 000 / heures travaillées" in i)
        verifie("le consolidé n'est pas une moyenne de taux",
                "rapport de sommes" in i)
        verifie("aucun classement entre sites sur la sécurité",
                "incitation à sous-déclarer" in i)
        verifie("Riseva ne se présente pas comme auditeur des indicateurs",
                "ne les audite pas" in i and "ne produit pas le document unique" in i)
        verifie("aucune donnée de santé nominative n'est collectée",
                "ni diagnostic" in i)
        # Le contrôle qui compte : celui qui saisit n'approuve pas.
        seul = p.evaluate("""async()=>{const m=await import('/app/data.js');
            try{ m.DB.approuverIndicateurs('c2','et1','u2'); return 'passé' }
            catch(e){ return e.message }}""")
        verifie("la personne qui saisit ne peut pas approuver sa propre saisie",
                "ne peut pas approuver" in seul, seul)

        print("\nLe rapport de collecte, et ce qu'il remplace")
        # Ce que ce bloc protège : la promesse tenue au responsable RSE — il ne
        # relance personne, il reçoit. Si le rapport disparaissait de l'écran, il
        # ne resterait qu'un tableau d'états, c'est-à-dire le travail à faire.
        verifie("le rapport de collecte est sur la page, pas dans un export",
                "Rapport de collecte" in i)
        verifie("il dit combien de sites ont répondu avant de donner un chiffre",
                "sur 4 a répondu" in i or "sur 4 ont répondu" in i)
        verifie("un total dit sur combien de sites il porte",
                "Sites renseignés" in i)
        verifie("un taux dont les termes sont incomplets n'est pas affiché",
                "non disponible" in i)
        verifie("une case vide reste vide, elle ne devient pas zéro",
                "n'écrit jamais" in i and "zéro à la place" in i)
        verifie("les trois sorties sont proposées ensemble",
                p.eval_on_selector_all("#docR,#csvR,#xlsR", "l=>l.length") == 3)

        # Le classeur est fabriqué dans l'onglet, sans rien appeler dehors. On ne
        # clique pas sur le bouton : on refait ce qu'il fait, et on regarde les
        # octets. Un `.xlsx` qui ne commence pas par « PK » n'est pas une archive.
        cl = p.evaluate("""async()=>{
            const d=await import('/app/data.js'), t=await import('/app/tableur.js');
            const b=t.classeur(d.DB.classeurCollecte('c2'));
            const o=new Uint8Array(await b.arrayBuffer());
            return { taille:o.length, pk:o[0]===80&&o[1]===75,
                     type:b.type, onglets:d.DB.classeurCollecte('c2').map(x=>x.nom) }}""")
        verifie("le classeur est une vraie archive, fabriquée sans réseau",
                cl["pk"] and cl["taille"] > 2000, str(cl["taille"]))
        verifie("il porte le type d'un classeur, pas d'un fichier inconnu",
                "spreadsheetml" in cl["type"])
        verifie("un onglet par rubrique, puis les ratios, puis les définitions",
                cl["onglets"][-1] == "Définitions" and cl["onglets"][-2] == "Ratios"
                and "Sécurité" in cl["onglets"], str(cl["onglets"]))

        print("\nOn ne relance plus, on notifie")
        # La phrase du client : « ça rassemble toutes les informations de tous les
        # sites sans avoir à les relancer à chaque fois, juste ça les notifie sur
        # leur plateforme ». C'est ici que ça se vérifie, des deux côtés.
        nsiege = p.evaluate("""async()=>{const m=await import('/app/data.js');
            return m.DB.notifications('u2').map(n=>n.titre+' | '+n.texte)}""")
        siege = norm(" ".join(nsiege))
        verifie("le siège voit qui n'a pas répondu, nommément",
                "pas encore répondu" in siege)
        verifie("et il lui est dit qu'il n'a personne à relancer",
                "personne à relancer" in siege)
        verifie("les saisies en attente d'approbation lui sont rappelées",
                "à approuver" in siege)

        nsite = p.evaluate("""async()=>{const m=await import('/app/data.js');
            return m.DB.notifications('u11').map(n=>n.titre+' | '+n.texte)}""")
        site = norm(" ".join(nsite))
        verifie("le site à qui l'on demande quelque chose l'apprend sur son écran",
                "Le siège attend vos chiffres" in site)
        verifie("la demande dit ce qu'on attend et pour quand",
                "avant l'échéance" in site)
        relu = p.evaluate("""async()=>{const m=await import('/app/data.js');
            return m.DB.notifications('u10').map(n=>n.titre).join(' ; ')}""")
        verifie("un site qui a saisi sait que sa saisie attend une relecture",
                "attend une relecture" in relu, relu)

        print("\nCe qu'on demande, et ce qu'on ne demande pas")
        # Une collecte demande des rubriques, pas le catalogue entier. Un
        # formulaire de vingt-sept champs revient à moitié rempli ; six champs
        # reviennent entiers. C'est la seule variable qui prédit le taux de réponse.
        rub = p.evaluate("""async()=>{const m=await import('/app/data.js');
            const c=m.DB.campagne('c2');
            return { demandees:m.sectionsDe(c).map(r=>r.libelle),
                     champs:m.saisisDe(c).length, tout:m.INDICATEURS.saisis.length }}""")
        verifie("une campagne ne demande que les rubriques qu'elle a choisies",
                "Mobilité et flotte" not in rub["demandees"]
                and "Énergie et eau" in rub["demandees"], str(rub["demandees"]))
        verifie("elle demande donc moins de champs que le catalogue entier",
                rub["champs"] < rub["tout"], f'{rub["champs"]}/{rub["tout"]}')

        connecte(p, "u2", "#/indicateurs")
        p.click("#newC"); p.wait_for_timeout(300)
        m = norm(p.inner_text(".modal"))
        verifie("ouvrir une collecte, c'est d'abord choisir ce qu'on demande",
                "Ce que vous demandez" in m)
        verifie("chaque rubrique dit combien de valeurs elle coûte au site",
                "valeurs" in m and "Effectifs et mouvements" in m)
        verifie("le total des valeurs demandées est affiché avant l'envoi",
                "à trouver pour chaque site" in m)
        verifie("l'écran promet qu'il n'y aura personne à relancer",
                "personne à relancer" in m)
        # Une période non terminée ne se collecte pas : le site n'aurait rien à
        # déclarer, il inventerait ou se tairait, et les deux se ressemblent.
        refus = p.evaluate("""async()=>{const m=await import('/app/data.js');
            try{ m.DB.ouvrirCampagne({groupe:'g1',libelle:'Trop tôt',periode:'2027-S1',
                 debut:'2027-01-01',fin:'2027-06-30',echeance:'2027-12-31',
                 rubriques:['social']}); return 'passé' }
            catch(e){ return e.message }}""")
        verifie("une période qui n'est pas finie ne se collecte pas",
                "pas terminée" in refus, refus)
        vide = p.evaluate("""async()=>{const m=await import('/app/data.js');
            try{ m.DB.ouvrirCampagne({groupe:'g1',libelle:'Vide',periode:'2026-X9',
                 debut:'2026-01-01',fin:'2026-06-30',echeance:'2026-12-31',
                 rubriques:[]}); return 'passé' }
            catch(e){ return e.message }}""")
        verifie("une collecte sans rubrique ne s'ouvre pas",
                "au moins une rubrique" in vide, vide)

        print("\nLe lien de référent, de bout en bout")
        # Le parcours entier : la société nomme, la personne accepte, elle ne pilote
        # que son site, et elle ne peut pas accepter avec une autre adresse.
        code = p.evaluate("""async()=>{const m=await import('/app/data.js');
            const i=m.DB.creerInvitationReferent('et1','Inès Rocher','ines@vaudrey-ciments.fr');
            await new Promise(r=>setTimeout(r,250));   // l'écriture locale est débouncée
            return i.code}""")
        p.goto(f"{BASE}/rejoindre.html?code={code}&role=referent", wait_until="networkidle")
        p.wait_for_timeout(300)
        r = norm(p.inner_text(".login__box"))
        verifie("le lien de référent annonce le site qu'il confie",
                "Piloter" in r and "Paris" in r)
        verifie("il dit à qui il a été émis et ce qu'il n'ouvre pas",
                "ines@vaudrey-ciments.fr" in r and "les autres sites" in r)
        p.fill("#rmail", "quelquun.dautre@vaudrey-ciments.fr")
        p.click("#fr [type=submit]"); p.wait_for_timeout(300)
        verifie("il refuse une autre adresse que celle visée",
                "autre adresse" in norm(p.inner_text(".toast")))
        p.fill("#rmail", "ines@vaudrey-ciments.fr")
        p.click("#fr [type=submit]"); p.wait_for_timeout(400)
        verifie("l'acceptation crée le compte du référent",
                "Compte créé" in norm(p.inner_text(".login__box")))
        p.goto(f"{BASE}/app/?r=1#/tableau", wait_until="networkidle"); p.wait_for_timeout(400)
        verifie("il arrive sur le tableau de bord de son site",
                "Comptes ouverts" in norm(p.inner_text(".content")))
        verifie("et il n'a ni contrat ni mécénat dans son menu",
                not p.eval_on_selector_all(".side__link[href='#/abonnement']", "l=>l.length"))

        print("\nRegistre des dons de matériel")
        connecte(p, "u2", "#/materiel")
        m = norm(p.inner_text(".content"))
        verifie("le registre existe et cite la loi anti-gaspillage",
                "gaspillage" in m and "ne peuvent plus être éliminés" in m)
        verifie("la méthode de valorisation dépend de la catégorie comptable",
                "Bien inscrit en stock" in m and "Immobilisation" in m
                and "coût de revient" in m and "plus ou moins-value" in m)
        verifie("Riseva ne choisit pas la méthode à la place du comptable",
                "relève de votre responsabilité" in m and "n'en choisit aucune" in m)
        verifie("l'estimation fiscale n'est pas présentée comme acquise",
                "Estimation fiscale maximale" in m and "non déclarable à ce stade" in m)
        verifie("un don non valorisé est signalé, pas estimé",
                "à valoriser" in m)
        verifie("chaque don porte l'état de sa réception et de son reçu",
                "Réception" in m and "Reçu" in m and "En attente de l'association" in m)

        print("\nCloisonnement : ce qui ne doit pas se déduire")
        connecte(p, "u2", "#/tableau")
        cl2 = p.evaluate("""async () => {
          const d = await import('/app/data.js');
          const brut = d.DB.pointsDe('e1').brut;
          const visible = d.DB.salaries('e1')
            .reduce((n, u) => n + d.DB.pointsVisiblesEmployeur(u.id), 0);
          const perso = d.DB.missions({ entreprise:'e1' })
            .filter(m => d.DB.estDonPersonnel(m)).length;
          const cl = d.DB.classement({ pour:'e1' }).find(x => x.id === 'e1');
          return { brut, visible, perso, base: d.DB.effectifReference('e1'),
                   parSalarie: cl.parSalarie };
        }""")
        verifie("le score de l'entreprise n'inclut pas les dons personnels",
                cl2["brut"] == cl2["visible"],
                f"brut {cl2['brut']} vs visible {cl2['visible']}")
        verifie("la différence ne révèle donc rien qu'un seuil devait protéger",
                cl2["brut"] - cl2["visible"] == 0)
        verifie("le classement se normalise sur l'effectif figé au contrat",
                cl2["base"] == 210, str(cl2["base"]))

        print("\nLes rapports arrivent tout seuls")
        connecte(p, "u2", "#/rapports")
        rp = norm(p.inner_text(".content"))
        verifie("le client n'a rien à demander",
                "Vous n'avez rien à demander" in rp and "une fois et une seule" in rp)
        verifie("chaque rapport généré porte sa date d'envoi et son destinataire",
                "Envoyé le" in rp and "@vaudrey-ciments.fr" in rp)
        env = p.evaluate("""async () => {
          const d = await import('/app/data.js');
          const avant = d.DB.envois({ entreprise:'e1', type:'rapport' }).length;
          const f = d.DB.moteur('2026-08-20');
          const apres = d.DB.envois({ entreprise:'e1', type:'rapport' }).length;
          const cles = d.DB.envois({ type:'rapport' }).map(x => x.cle);
          return { avant, apres, rapports:f.rapports,
                   doublons: cles.length - new Set(cles).size };
        }""")
        verifie("un rapport déjà envoyé n'est jamais renvoyé",
                env["avant"] == env["apres"] and env["rapports"] == 0, str(env))
        verifie("aucun envoi en double dans le journal", env["doublons"] == 0)

        print("\nLes affiches, tout au long de l'année")
        connecte(p, "u2", "#/supports")
        su = norm(p.inner_text(".content"))
        verifie("les quatre envois de la saison sont annoncés",
                "Lancement" in su and "Clôture" in su and "Rentrée" in su)
        verifie("le client confirme lui-même la réception",
                "C'est vous qui confirmez" in su)
        verifie("un envoi en retard est signalé au client aussi",
                "en retard sur le calendrier" in su)
        sup = p.evaluate("""async () => {
          const d = await import('/app/data.js');
          const l = d.DB.supportsDe('e1');
          let doublon = null;
          const k = l.find(x => x.etat === 'a_preparer');
          d.DB.expedier('e1', k.kit.code, { suivi:'6A99999999999' });
          try { d.DB.expedier('e1', k.kit.code, {}); } catch (e){ doublon = e.message; }
          const apres = d.DB.supportsDe('e1').find(x => x.kit.code === k.kit.code);
          const ex = apres.expedition;
          d.DB.confirmerReception(ex.id);
          const fin = d.DB.supportsDe('e1').find(x => x.kit.code === k.kit.code);
          return { vagues:l.length, doublon, apresEtat:apres.etat, finEtat:fin.etat,
                   suivi: ex.suivi };
        }""")
        verifie("quatre vagues par saison, pas une de plus", sup["vagues"] == 4)
        verifie("une vague déjà expédiée ne part pas deux fois", sup["doublon"] is not None)
        verifie("l'expédition passe à « expédié », la confirmation à « reçu »",
                sup["apresEtat"] == "expedie" and sup["finEtat"] == "recu", str(sup))
        verifie("le numéro de suivi est conservé", sup["suivi"] == "6A99999999999")

        connecte(p, "u1", "#/expeditions")
        ex = norm(p.inner_text(".content"))
        verifie("Riseva voit ce qu'il reste à préparer, et pour combien de sites",
                "À préparer" in ex and "Sites" in ex)
        verifie("les retards sortent avant que le client les signale",
                "en retard" in ex)

        print("\nRegistre de sécurité et consolidation multi-sites")
        connecte(p, "u2", "#/securite")
        sc = norm(p.inner_text(".content"))
        verifie("le registre annonce ce qu'il ne collecte pas",
                "Aucun nom, aucune donnée de santé" in sc
                and "ni siège de la lésion" in sc)
        verifie("les presqu'accidents sont suivis à part des taux",
                "presqu'accidents" in sc)
        verifie("le registre dit qu'il ne remplace aucune obligation légale",
                "ne remplace aucune de vos obligations légales" in sc)
        verifie("il nomme les trois obligations qui restent à l'employeur",
                "R. 441-3" in sc and "L. 441-4" in sc and "R. 4121-1" in sc,
                "déclaration 48 h à la caisse, registre des accidents bénins, document unique")
        verifie("un site sans registre n'est pas un site sans accident",
                "n'ont pas « zéro accident »" in sc or "n'a pas « zéro accident »" in sc)
        verifie("le Pareto dit par où commencer",
                "Manutention manuelle" in sc and "cumul" in sc)
        verifie("le plan d'actions signale ce qui est en retard",
                "en retard" in sc)

        sec = p.evaluate("""async () => {
          const d = await import('/app/data.js');
          const sy = d.DB.syntheseSecurite({ societe:'e1', debut:'2026-01-01', fin:'2026-12-31' });
          const c = d.DB.campagnes('g1').find(x => x.etat === 'ouverte');
          const derive = d.DB.valeursDeriveesDuRegistre(c.id, 'et2');
          const sansRegistre = d.DB.valeursDeriveesDuRegistre(c.id, 'et1');
          let futur = null, incoherent = null, sansMotif = null, sansResp = null;
          try { d.DB.declarerEvenement('et2', { date:'2027-01-01', nature:'travail',
            gravite:'sans_soin', type:'machine' }, 'u2'); } catch (e){ futur = e.message; }
          try { d.DB.declarerEvenement('et2', { date:'2026-08-01', nature:'travail',
            gravite:'avec_arret', type:'machine', jours_arret:0 }, 'u2'); }
          catch (e){ incoherent = e.message; }
          try { d.DB.annulerEvenement('ev1', ''); } catch (e){ sansMotif = e.message; }
          try { d.DB.ajouterAction({ etablissement:'et2', quoi:'X', responsable:'',
            echeance:'2026-09-01' }); } catch (e){ sansResp = e.message; }
          const nomme = (txt) => { try {
            d.DB.declarerEvenement('et2', { date:'2026-08-01', nature:'travail',
              gravite:'sans_soin', type:'chute_plain_pied', circonstances:txt }, 'u2');
            return null;
          } catch (e){ return e.message; } };
          const traces = {
            mail: nomme('prevenu par jean.martin@exemple.fr'),
            tel: nomme('appeler le 06 12 34 56 78'),
            nir: nomme('assure 1850675123456'),
            nom: nomme('chute de Ferhat dans l escalier'),
            propre: nomme('chute de plain-pied sur sol humide, quai de chargement')
          };
          return { total:sy.total, derive, sansRegistre,
                   sansRegistreNoms:sy.sites_sans_registre,
                   pareto:sy.pareto[0], futur, incoherent, sansMotif, sansResp, traces };
        }""")
        verifie("les indicateurs du site sont déduits du registre, sans double saisie",
                sec["derive"] is not None and sec["derive"]["at_avec_arret"] >= 0, str(sec["derive"]))
        verifie("un site qui ne tient pas le registre continue de saisir à la main",
                sec["sansRegistre"] is None)
        verifie("les sites sans registre sont nommés, pas comptés à zéro",
                len(sec["sansRegistreNoms"]) > 0, str(sec["sansRegistreNoms"]))
        verifie("trajet et travail ne se mélangent pas dans la consolidation",
                sec["total"]["at_trajet"] >= 1 and sec["total"]["jours_arret"] > 0, str(sec["total"]))
        verifie("une déclaration à une date future est refusée", sec["futur"] is not None)
        tr = sec["traces"]
        verifie("une adresse électronique n'entre pas au registre",
                tr["mail"] is not None and "adresse électronique" in tr["mail"], str(tr["mail"]))
        verifie("un numéro de téléphone non plus",
                tr["tel"] is not None and "téléphone" in tr["tel"], str(tr["tel"]))
        verifie("un numéro de sécurité sociale non plus",
                tr["nir"] is not None and "sécurité sociale" in tr["nir"], str(tr["nir"]))
        verifie("le nom d'un salarié de la société non plus",
                tr["nom"] is not None and "nom d'une personne" in tr["nom"], str(tr["nom"]))
        verifie("mais une description de la situation passe",
                tr["propre"] is None, str(tr["propre"]))
        verifie("le refus dit quoi faire, pas seulement non",
                tr["nom"] is not None and "Décrivez la situation, pas la personne" in tr["nom"])
        verifie("un accident avec arrêt sans jour d'arrêt est refusé",
                sec["incoherent"] is not None)
        verifie("on n'annule pas une déclaration sans motif", sec["sansMotif"] is not None)
        verifie("une action sans responsable est refusée",
                sec["sansResp"] and "vœu" in sec["sansResp"], str(sec["sansResp"]))

        # La campagne du site qui tient son registre : les quatre champs sont verrouillés.
        connecte(p, "u2", "#/indicateurs")
        p.select_option("#camp", "c2"); p.wait_for_timeout(400)
        p.evaluate("""()=>{
          const tr = [...document.querySelectorAll('tbody tr')].find(x => /Usine/.test(x.textContent));
          // On vise le bouton par son libelle, pas par son rang. La ligne porte
          // maintenant aussi le coffre de preuves, et « le premier bouton de la
          // ligne » ne designait plus celui qu'on croyait.
          const b = tr && [...tr.querySelectorAll('button')]
            .find(x => /Saisir|Modifier/.test(x.textContent));
          if (b) b.click();
        }""")
        p.wait_for_timeout(400)
        md = norm(p.inner_text(".modal"))
        verifie("la campagne annonce que ce site tient son registre",
                "tient son registre de sécurité" in md and "rien à recopier" in md)
        verifie("les quatre champs déduits sont verrouillés",
                p.eval_on_selector("#i-at_avec_arret", "e=>e.disabled") is True)
        verifie("et ils portent leur provenance", "déduit du registre" in md)
        p.evaluate("()=>[...document.querySelectorAll('.modal .btn')].find(b=>/Annuler/.test(b.textContent)).click()")
        p.wait_for_timeout(200)

        print("\nLa fiche de durabilité VSME")
        connecte(p, "u2", "#/vsme")
        vt = norm(p.inner_text(".content"))
        verifie("la fiche dit d'abord ce qu'elle n'est pas",
                "n'est pas un rapport de durabilité" in vt
                and "ne vaut pas publication" in vt)
        verifie("elle cite la norme et la date de sa vérification",
                "2025/1710" in vt and "réserve" not in vt.lower()[:200])
        verifie("elle prévient que le texte est en cours de reprise",
                "acte délégué" in vt)
        verifie("les onze rubriques sont là", all(f"B{n}," in vt for n in range(1, 12)))
        verifie("ce que Riseva sait est rempli",
                "Renseignée par Riseva" in vt and "Missions confirmées par les associations" in vt)
        verifie("les résultats retenus sont les confirmés, pas les estimations",
                "hors estimations" in vt)
        verifie("ce qu'elle ne sait pas est dit, pas laissé vide",
                "Non couverte" in vt and "Ce que Riseva n'a pas" in vt)
        verifie("une rubrique non couverte n'est jamais montrée à zéro",
                "Rejets et polluants déclarés" in vt
                and "Non couverte" in vt)
        # La distinction qui protège : Riseva rend des kilowattheures, elle ne
        # les convertit pas en tonnes de CO2. Passer de l'un à l'autre demande
        # un facteur d'émission, donc un choix de méthode qui appartient au
        # client. Si cette phrase disparaissait, la fiche laisserait croire à un
        # bilan carbone.
        verifie("une consommation n'est pas présentée comme une émission",
                "elle ne les convertit pas en tonnes de CO2" in vt)
        verifie("la sécurité y remonte avec ses taux calculés",
                "Accidents du travail avec arrêt" in vt and "(calculé)" in vt)
        verifie("les décès et maladies professionnelles sont explicitement hors périmètre",
                "décès et les maladies professionnelles" in vt)
        verifie("le réemploi de matériel alimente la rubrique économie circulaire",
                "Valeur déclarée par l'entreprise, matériel réemployé" in vt)
        # Un indicateur VSME qui nomme une méthode engage l'entreprise sur cette
        # méthode devant son commissaire aux comptes. Riseva n'en applique aucune :
        # elle enregistre ce que le donateur déclare, sous la catégorie qui le
        # justifie. Le libellé ne doit donc plus prononcer « valeur nette comptable ».
        verifie("la fiche VSME ne prête plus de méthode de valorisation à Riseva",
                "aleur nette comptable" not in vt)
        vf = p.evaluate("""async () => {
          const d = await import('/app/data.js');
          const f = d.DB.ficheVSME('e1');
          const vides = f.rubriques.filter(r => !r.renseignee).map(r => r.cle);
          const b9 = f.rubriques.find(r => r.cle === 'B9');
          return { couvertes:f.couvertes, total:f.total, vides,
                   b9: b9.lignes.map(l => [l.cle, l.valeur]) };
        }""")
        verifie("la couverture annoncée correspond aux rubriques réellement remplies",
                vf["couvertes"] == vf["total"] - len(vf["vides"]), str(vf["vides"]))
        verifie("les rubriques que Riseva ne collecte pas restent vides",
                set(["B4", "B5", "B11"]).issubset(set(vf["vides"])), str(vf["vides"]))
        verifie("la sécurité ne sort pas des valeurs nulles",
                all(v is not None for _, v in vf["b9"]), str(vf["b9"]))

        print("\nLe CSE, en lecture seule")
        connecte(p, "u12", "#/tableau")
        cs = norm(p.inner_text(".content"))
        verifie("l'accès est annoncé comme une lecture seule",
                "lecture seule" in cs.lower())
        verifie("il montre les indicateurs approuvés, pas les brouillons",
                "Uniquement les valeurs approuvées" in cs)
        verifie("l'accès n'est pas présenté comme se substituant aux droits du CSE",
                "s'ajoute à vos droits, il ne les remplace pas" in cs
                and "Aucun contrat entre Riseva et votre entreprise ne peut les restreindre" in cs)
        verifie("la participation est masquée sous le seuil de restitution",
                "moins de 5 personnes" in cs)
        verifie("il dit ce qu'il ne montre pas",
                "Aucun nom de salarié" in cs and "Aucune donnée de santé" in cs)
        verifie("et il ne se fait pas passer pour la BDESE",
                "ne s'y substitue pas" in cs)
        liens = p.eval_on_selector_all(".side__link[href]", "l=>l.map(a=>a.getAttribute('href'))")
        verifie("son menu ne propose rien à saisir ni à valider",
                all(x.split("/")[-1] in ("tableau", "ensemble", "preferences") for x in liens),
                str(liens))
        boutons = norm(" ".join(p.eval_on_selector_all(".content button", "b=>b.map(x=>x.textContent)")))
        verifie("aucun bouton d'écriture sur son écran",
                not any(m in boutons for m in ["Saisir", "Approuver", "Enregistrer", "Valider", "Publier"]),
                boutons[:160])
        p.evaluate("()=>{const b=[...document.querySelectorAll('button')].find(x=>/Lire/.test(x.textContent)); if(b)b.click()}")
        p.wait_for_timeout(350)
        if p.is_visible(".modal"):
            rp = norm(p.inner_text(".modal"))
            verifie("le rapport lu par le CSE ne nomme personne",
                    "Aucun nom de salarié ne figure" in rp)
            p.evaluate("()=>[...document.querySelectorAll('.modal .btn')].find(b=>/Fermer/.test(b.textContent)).click()")
            p.wait_for_timeout(200)
        else:
            verifie("le rapport lu par le CSE ne nomme personne", False, "aperçu non ouvert")

        # L'employeur ouvre l'accès, et cet accès ne consomme pas une place.
        connecte(p, "u2", "#/equipe")
        eq = norm(p.inner_text(".content"))
        verifie("l'employeur voit à quoi sert l'accès CSE",
                "Accès du CSE" in eq and "rien sous 5 personnes" in eq)
        cse2 = p.evaluate("""async () => {
          const d = await import('/app/data.js');
          const avant = d.DB.sieges('e1').restants;
          const inv = d.DB.creerInvitationCSE('e1', 'Nadia Élue', 'nadia.elue@vaudrey-ciments.fr');
          const u = d.DB.accepterInvitationCSE(inv.code);
          const dossier = d.DB.dossierCSE('e1');
          let refus = null;
          try { d.DB.creerInvitationCSE('e1', '', ''); } catch (e){ refus = e.message; }
          return { avant, apres: d.DB.sieges('e1').restants, role: u.role,
                   sansNom: refus,
                   nominatif: inv.nom === 'Nadia Élue',
                   exclus: dossier.exclus.length };
        }""")
        verifie("un accès CSE ne consomme aucune place de salarié",
                cse2["avant"] == cse2["apres"], f"{cse2['avant']} → {cse2['apres']}")
        verifie("le compte créé est bien un compte CSE", cse2["role"] == "cse")
        verifie("le lien est nominatif et le refuse sinon",
                cse2["nominatif"] and cse2["sansNom"] is not None)

        print("\nClassement : la moitié basse n'est pas nommée")
        connecte(p, "u2", "#/classement")
        cl = p.evaluate("""async () => {
          const d = await import('/app/data.js');
          const l = d.DB.classement({ pour:'e1' });
          return { total:l.length, mediane:l[0].mediane,
                   anonymes:l.filter(x => x.anonyme).length,
                   moi:l.find(x => x.id === 'e1'),
                   noms:l.map(x => ({ rang:x.rang, anonyme:x.anonyme, nom:x.nomAffiche })) };
        }""")
        verifie("une partie du classement est anonymisée",
                0 < cl["anonymes"] < cl["total"], str(cl["anonymes"]) + "/" + str(cl["total"]))
        verifie("aucune entreprise anonymisée ne laisse voir son nom",
                all(not x["anonyme"] or x["nom"].startswith("Entreprise,") for x in cl["noms"]),
                str(cl["noms"]))
        verifie("l'entreprise se voit toujours elle-même, même sous la médiane",
                cl["moi"]["anonyme"] is False and cl["moi"]["rang"] > cl["mediane"],
                str(cl["moi"]["rang"]) + " / médiane " + str(cl["mediane"]))
        # Toutes catégories confondues : c'est la vue où la cohorte est constituée.
        p.select_option("#cat", ""); p.wait_for_timeout(400)
        tab = norm(p.inner_text(".content"))
        verifie("le tableau affiche le libellé anonymisé, pas le nom",
                "Entreprise," in tab)
        verifie("et il dit pourquoi", "moitié basse du classement" in tab)

        rg = p.evaluate("""async () => {
          const d = await import('/app/data.js');
          d.DB.reglerVisibilite('e5', 'nom');
          const nomme = d.DB.classement({ pour:'e1' }).find(x => x.id === 'e5');
          d.DB.reglerVisibilite('e5', 'anonyme');
          const cache = d.DB.classement({ pour:'e1' }).find(x => x.id === 'e5');
          d.DB.reglerVisibilite('e5', 'auto');
          let refus = null;
          try { d.DB.reglerVisibilite('e5', 'invisible'); } catch (e){ refus = e.message; }
          return { nomme:nomme.anonyme, cache:cache.anonyme, rang:nomme.rang, refus };
        }""")
        verifie("choisir d'être nommée l'emporte, quel que soit le rang", rg["nomme"] is False)
        verifie("choisir de ne jamais l'être l'emporte aussi, même en tête",
                rg["cache"] is True, "rang " + str(rg["rang"]))
        verifie("un réglage inconnu est refusé", rg["refus"] is not None)

        connecte(p, "u2", "#/parametres")
        pa = norm(p.inner_text(".content"))
        verifie("le réglage est expliqué par ce qu'il évite",
                "punit ceux qui participent" in pa)
        verifie("et il ne se fait pas passer pour de l'anonymat",
                "Ce n'est pas de l'anonymat" in pa
                and "ne publie pas la liste de ses clients" in pa)

        print("\nÉcarts entre périodes et dictionnaire des données")
        connecte(p, "u2", "#/indicateurs")
        # On se place sur la campagne en cours, qui a une période précédente.
        p.select_option("#camp", "c2"); p.wait_for_timeout(400)
        p.evaluate("()=>{const b=[...document.querySelectorAll('tbody button')]"
                   ".find(x=>/Saisir|Corriger|Modifier/.test(x.textContent)); if(b)b.click()}")
        p.wait_for_timeout(400)
        verifie("le formulaire dit ce qu'on compte et ce qu'on ne compte pas",
                "On compte :" in norm(p.inner_text(".modal"))
                and "On ne compte pas :" in norm(p.inner_text(".modal")))
        verifie("il demande une explication au-delà du seuil",
                "Au-delà de 30 % de variation" in norm(p.inner_text(".modal")))
        p.fill(".modal #i-at_avec_arret", "30")
        p.dispatch_event(".modal #i-at_avec_arret", "input")
        p.wait_for_timeout(300)
        verifie("l'écart s'affiche pendant la saisie, pas au moment du refus",
                "Variation notable" in norm(p.inner_text(".modal")))
        p.evaluate("()=>[...document.querySelectorAll('.modal .btn')]"
                   ".find(b=>/Enregistrer/.test(b.textContent)).click()")
        p.wait_for_timeout(400)
        verifie("sans explication, la saisie est refusée",
                "expliquez" in norm(p.inner_text(".toast")))
        verifie("et la fenêtre reste ouverte, la saisie n'est pas perdue",
                p.is_visible(".modal #i-at_avec_arret")
                and p.input_value(".modal #i-at_avec_arret") == "30")
        p.fill(".modal #i-com", "Un chariot a percuté un rayonnage le 12 mai : six blessés le même jour.")
        p.evaluate("()=>[...document.querySelectorAll('.modal .btn')]"
                   ".find(b=>/Enregistrer/.test(b.textContent)).click()")
        p.wait_for_timeout(500)
        verifie("avec une explication, la même valeur passe",
                "enregistrée" in norm(p.inner_text(".toast")))

        p.evaluate("()=>location.hash='#/indicateurs'"); p.wait_for_timeout(400)
        p.click("#dicoI"); p.wait_for_timeout(400)
        dc = norm(p.inner_text(".modal"))
        verifie("le dictionnaire donne la formule et les deux termes du rapport",
                "accidents avec arrêt x 1 000 000 / heures travaillées" in dc
                and "at_avec_arret / heures_travaillees" in dc)
        verifie("il dit qu'un taux de périmètre est un rapport de sommes",
                "jamais une moyenne de taux" in dc)
        verifie("il porte les inclusions et les exclusions de chaque indicateur",
                "intérimaires, stagiaires, prestataires, sous-traitants" in dc)
        verifie("il dit qu'aucun de ces taux n'est réglementaire", "non" in dc)
        verifie("il reprend les explications données par les sites",
                "chariot" in dc)
        verifie("il rappelle ce que Riseva ne fait pas",
                "ne calcule pas le taux d'emploi de travailleurs handicapés" in dc)
        p.evaluate("()=>[...document.querySelectorAll('.modal .btn')]"
                   ".find(b=>/Fermer/.test(b.textContent)).click()")
        p.wait_for_timeout(200)

        print("\nDon en argent : annoncer, virer, confirmer")
        connecte(p, "u4", "#/annonces")
        p.eval_on_selector_all(".annonce [data-go]",
            "b=>b.find(x=>/Faire un don/.test(x.textContent)"
            "&&/Racines Vives/.test(x.closest('.annonce').textContent)).click()")
        p.wait_for_timeout(350)
        md = norm(p.inner_text(".modal"))
        verifie("un salarié ne peut donner qu'à titre personnel",
                "Ce don est personnel" in md and "66 %" in md)
        p.fill(".modal #q", "120")
        p.evaluate("()=>[...document.querySelectorAll('.modal .btn')]"
                   ".find(b=>/Obtenir la référence/.test(b.textContent)).click()")
        p.wait_for_timeout(400)
        bon = norm(p.inner_text(".modal"))
        verifie("la référence de virement est délivrée",
                re.search(r"RSV-[A-Z0-9]{4}-[A-Z0-9]{4}", bon) is not None, bon[:120])
        verifie("l'IBAN de l'association est affiché en entier",
                "FR" in bon and re.search(r"FR\d\d( \w{4})+", bon) is not None)
        verifie("il est écrit que Riseva ne reçoit pas cet argent",
                "Riseva ne reçoit pas cet argent" in bon and "ne prélève rien" in bon)
        verifie("les points ne sont crédités qu'après confirmation",
                "et pas avant, que les points sont crédités" in bon)
        verifie("l'intention porte une échéance", "s'éteint d'elle-même" in bon)
        ref = re.search(r"RSV-[A-Z0-9]{4}-[A-Z0-9]{4}", bon).group(0)
        p.evaluate("()=>[...document.querySelectorAll('.modal .btn')]"
                   ".find(b=>/C'est noté/.test(b.textContent)).click()")
        p.wait_for_timeout(300)

        avant = p.evaluate("""async () => {
          const d = await import('/app/data.js');
          const i = d.DB.intentionParReference(arguments0);
          return { etat:i.etat, montant:i.montant, asso:i.association,
                   pts: d.DB.pointsDe('e1').brut };
        }""".replace("arguments0", '"' + ref + '"'))
        verifie("une intention ne rapporte aucun point tant qu'elle n'est pas confirmée",
                avant["etat"] == "annoncee")

        # L'association rapproche la référence de son relevé, et corrige le montant.
        apres = p.evaluate("""async () => {
          const d = await import('/app/data.js');
          const i = d.DB.intentionParReference(arguments0);
          const r = d.DB.confirmerDonRecu(i.id, { montant: 100 });
          let rejeu = null;
          try { d.DB.confirmerDonRecu(i.id, { montant: 100 }); }
          catch (e){ rejeu = e.message; }
          return { etat:r.intention.etat, recu:r.intention.montant_recu,
                   points:r.mission.points, entreprise:r.mission.entreprise,
                   origine:r.mission.origine, rejeu };
        }""".replace("arguments0", '"' + ref + '"'))
        verifie("le montant confirmé par l'association fait foi, pas celui annoncé",
                apres["recu"] == 100, str(apres))
        verifie("les points suivent le montant réellement reçu",
                apres["points"] == 10, str(apres))
        verifie("un don personnel ne porte pas l'entreprise du donateur",
                apres["entreprise"] is None and apres["origine"] == "salarie", str(apres))
        verifie("un don déjà confirmé ne se confirme pas deux fois",
                apres["rejeu"] is not None, str(apres["rejeu"]))

        # Côté association : le compte, le mandat, et ce qui reste à confirmer.
        connecte(p, "u7", "#/dons")
        dn = norm(p.inner_text(".content"))
        verifie("l'association lit que l'argent ne passe pas par Riseva",
                "L'argent ne passe pas par Riseva" in dn
                and "nous n'encaissons pas" in dn)
        verifie("son IBAN et son titulaire sont affichés",
                "FR75 3000 3004 1800 0123 4567 890" in dn)
        verifie("le mandat sur les reçus est daté et nominatif",
                "Mandat accordé le" in dn and "Élise Tournier" in dn)
        verifie("le mandat rappelle que l'association reste seule émettrice",
                "reste seule émettrice" in dn and "révocable à tout moment" in dn)
        # Le circuit principal est la carte : le don se confirme tout seul, et
        # l'association n'a plus de releve a rapprocher. Le virement reste le
        # repli, et lui demande toujours une confirmation a la main.
        verifie("le don par carte se confirme sans rapprochement bancaire",
                "vous n'avez rien à rapprocher" in dn)
        verifie("l'argent ne transite toujours pas par Riseva",
                "nous n'encaissons pas" in dn
                and "pas d'agrément d'établissement de paiement" in dn)

        r3 = p.evaluate("""async () => {
          const d = await import('/app/data.js');
          let ib = null, sansMandat = null, mandatSansEligibilite = null;
          try { d.DB.enregistrerIban('a1', { iban:'FR7630006000011234567890188' }); }
          catch (e){ ib = e.message; }
          d.DB.revoquerMandatRecus('a1');
          sansMandat = d.DB.recusPrets('a1');
          try { d.DB.accepterMandatRecus('a5', { nom:'X', qualite:'Président' }); }
          catch (e){ mandatSansEligibilite = e.message; }
          let engage = null;
          const an = d.DB.annonces({ type:'don_financier', ouvertes:true })[0];
          try { d.DB.engager({ annonce:an.id, entreprise:'e1', salarie:'u4', quantite:50 }); }
          catch (e){ engage = e.message; }
          return { ib, sansMandat, mandatSansEligibilite, engage };
        }""")
        verifie("un IBAN dont la clé ne tombe pas juste est refusé",
                r3["ib"] and "clé de contrôle" in r3["ib"], str(r3["ib"]))
        verifie("sans mandat, Riseva ne prépare aucun reçu",
                r3["sansMandat"] is False, str(r3["sansMandat"]))
        verifie("pas de mandat sans éligibilité déclarée",
                r3["mandatSansEligibilite"] and "éligibilité" in r3["mandatSansEligibilite"],
                str(r3["mandatSansEligibilite"]))
        verifie("un don en argent ne s'engage pas comme une demi-journée",
                r3["engage"] and "intention de virement" in r3["engage"], str(r3["engage"]))

        print("\nHelloAsso, en circuit complémentaire")
        p.goto(f"{BASE}/asso.html?id=a2", wait_until="networkidle"); p.wait_for_timeout(500)
        pa = norm(p.inner_text("body"))
        verifie("la page publique propose la carte quand l'association a un formulaire",
                "Donner par carte" in pa and "sans commission" in pa)
        verifie("et garde le virement à côté", "Ou par virement" in pa)
        verifie("le lien de don pointe bien chez HelloAsso",
                p.eval_on_selector_all("a[href*='helloasso.com']", "a=>a.length") >= 1)
        verifie("il s'ouvre sans donner la main à la page ouverte",
                p.eval_on_selector("a[href*='helloasso.com']",
                  "a=>a.rel.includes('noopener') && a.rel.includes('noreferrer')") is True)
        p.goto(f"{BASE}/asso.html?id=a1", wait_until="networkidle"); p.wait_for_timeout(400)
        verifie("sans formulaire HelloAsso, le virement suffit et rien ne manque",
                "Donner par carte" not in norm(p.inner_text("body"))
                and "IBAN" in norm(p.inner_text("body")))

        ha = p.evaluate("""async () => {
          const d = await import('/app/data.js');
          const out = {};
          out.circuits = d.DB.circuitsDon('a2').map(x => x.cle);
          out.sansHa = d.DB.circuitsDon('a1').map(x => x.cle);
          try { d.DB.enregistrerHelloAsso('a1', 'https://evil.example/associations/x/formulaires/1'); }
          catch (e){ out.refus = e.message; }
          try { d.DB.enregistrerHelloAsso('a1', 'http://www.helloasso.com/associations/x/formulaires/1'); }
          catch (e){ out.refusHttp = e.message; }
          d.DB.enregistrerHelloAsso('a1', 'https://www.helloasso.com/associations/refuge/formulaires/3');
          out.apres = d.DB.circuitsDon('a1').map(x => x.cle);
          out.options = d.DB.optionsDon('a2').length;
          return out;
        }""")
        verifie("la carte passe devant le virement quand elle existe",
                ha["circuits"] == ["helloasso", "virement"], str(ha["circuits"]))
        verifie("le virement reste le socle universel",
                ha["sansHa"] == ["virement"], str(ha["sansHa"]))
        verifie("un lien hors du domaine HelloAsso est refusé", ha.get("refus") is not None)
        verifie("un lien en http est refusé", ha.get("refusHttp") is not None)
        verifie("ajouter un formulaire ouvre le circuit carte",
                ha["apres"] == ["helloasso", "virement"], str(ha["apres"]))
        # Connecter son compte n'est plus une option de confort : c'est ce qui
        # transforme un virement recopie a la main en un paiement par carte qui
        # se confirme seul. L'ecran le propose donc, en tete.
        verifie("connecter HelloAsso est proposé, pas relégué",
                ha["options"] == 1, str(ha["options"]))

        connecte(p, "u7", "#/dons")
        dh = norm(p.inner_text(".content"))
        verifie("l'association autorise depuis HelloAsso, sans livrer d'identifiants",
                "Nous ne voyons jamais vos identifiants" in dh)
        verifie("le virement reste offert à celles qui n'ont pas de compte",
                "le virement ci-contre fonctionne" in dh)
        verifie("elle peut retirer son autorisation quand elle veut",
                "vous pouvez retirer l'autorisation" in dh)

        # La liaison elle-meme : elle ouvre le paiement par carte, et sa rupture
        # le referme sans toucher aux dons deja recus.
        li = p.evaluate("""async () => {
          const d = await import('/app/data.js');
          const out = {};
          out.avant = d.DB.helloassoLie('a2');
          d.DB.lierHelloAsso('a2', 'refuge-des-quatre-vents');
          out.apres = d.DB.helloassoLie('a2');
          out.circuits = d.DB.circuitsDon('a2').map(x => x.cle);
          out.options = d.DB.optionsDon('a2').length;
          try { d.DB.lierHelloAsso('a2', 'https://helloasso.com/x'); out.refus = null; }
          catch (e){ out.refus = e.message; }
          d.DB.delierHelloAsso('a2');
          out.rompu = d.DB.helloassoLie('a2');
          return out;
        }""")
        verifie("connecter le compte ouvre le paiement par carte",
                not li["avant"] and li["apres"] and li["circuits"][0] == "helloasso",
                str(li))
        verifie("une adresse complète n'est pas un nom d'organisation",
                li["refus"] is not None)
        verifie("une fois connecté, plus rien n'est réclamé", li["options"] == 0)
        verifie("l'association peut rompre la liaison", not li["rompu"])

        print("\nRegistre public et dossier de l'association")
        connecte(p, "u7", "#/dossier")
        dr = norm(p.inner_text(".content"))
        verifie("l'association ne se voit demander qu'un numéro",
                "Votre immatriculation" in dr
                and "aucun justificatif à envoyer" in dr)
        verifie("le champ est prérempli avec ce qu'on sait déjà",
                p.input_value("#q-registre") == "428763304")
        verifie("l'absence de SIREN est dite non bloquante",
                "ce n'est pas bloquant" in dr)
        verifie("la source du registre est citée, licence comprise",
                "Annuaire des Entreprises" in dr and "Licence Ouverte" in dr)
        verifie("le dossier dit ce que le contrôle ne prouve pas",
                "Il ne prouve pas qu'elle est éligible au mécénat" in dr)
        verifie("et que la tranche d'effectif ne sert ni au score ni au prix",
                "ni au quota, ni au score, ni au prix" in dr)

        # Le registre n'est pas joignable depuis la recette : on éprouve le
        # moteur, pas le réseau. Ce qui compte est ce que le contrôle produit.
        r = p.evaluate("""async () => {
          const d = await import('/app/data.js');
          const fiche = { siren:'428763304', nom:'REFUGE DES QUATRE VENTS',
            nom_raison_sociale:'REFUGE DES QUATRE VENTS', etat:'A',
            est_association:true, rna:'W423001234', code_postal:'42000' };
          const bon = d.DB.controlerEnregistrement('a1', { fiche });
          const autre = d.DB.controlerEnregistrement('a1', { fiche:
            { ...fiche, nom:'SOCIETE GENERALE DE TRAVAUX',
              nom_raison_sociale:'SOCIETE GENERALE DE TRAVAUX', est_association:false } });
          const ferme = d.DB.controlerEnregistrement('a1', { fiche: { ...fiche, etat:'C' } });
          const panne = d.DB.controlerEnregistrement('a1', { panne:true });
          let refus = null;
          try { d.DB.validerAssociation('a1'); } catch (e){ refus = e.message; }
          const dossier = d.DB.dossierAdministratif('a1');
          return { bon:bon.etat, bonBloquant:bon.bloquant, autre:autre.etat,
                   autreBloquant:autre.bloquant, ecarts:autre.ecarts.map(x=>x.champ),
                   ferme:ferme.etat, panne:panne.etat, panneBloquant:panne.bloquant,
                   refus, nb:d.DB.controlesDe('a1').length,
                   perime:dossier.controle_perime };
        }""")
        verifie("un nom identique au registre ne bloque rien",
                r["bon"] == "exact" and r["bonBloquant"] is False, str(r))
        verifie("un nom sans rapport est signalé et bloque",
                r["autre"] == "different" and r["autreBloquant"] is True, str(r))
        verifie("une structure non signalée comme association apparaît dans les écarts",
                "nature" in r["ecarts"], str(r["ecarts"]))
        verifie("une structure fermée au registre est reconnue", r["ferme"] == "fermee")
        verifie("un registre injoignable est consigné sans bloquer personne",
                r["panne"] == "panne" and r["panneBloquant"] is False)
        verifie("les contrôles s'empilent, aucun ne s'écrase",
                r["nb"] >= 4, str(r["nb"]))
        verifie("un contrôle du jour n'est pas périmé", r["perime"] is False)
        verifie("le dernier contrôle décide : une panne ne bloque pas la mise en ligne",
                r["refus"] is None, str(r["refus"]))

        r2 = p.evaluate("""async () => {
          const d = await import('/app/data.js');
          d.DB.controlerEnregistrement('a1', { fiche:
            { siren:'428763304', nom:'AUTRE CHOSE', etat:'A', est_association:true } });
          let refus = null;
          try { d.DB.validerAssociation('a1'); } catch (e){ refus = e.message; }
          let cle = null;
          try { d.DB.enregistrerNumeros('a1', { siren:'428763305' }); }
          catch (e){ cle = e.message; }
          return { refus, cle };
        }""")
        verifie("un contrôle bloquant interdit la mise en ligne",
                r2["refus"] and "registre public" in r2["refus"], str(r2["refus"]))
        verifie("un SIREN à clé fausse est refusé avant tout appel réseau",
                r2["cle"] and "clé de contrôle" in r2["cle"], str(r2["cle"]))

        print("\nRéponses aux questionnaires clients")
        connecte(p, "u2", "#/dossier")
        dd = norm(p.inner_text(".content"))
        verifie("le dossier montre ce qui manque autant que ce qui est là",
                "non disponible" in dd and "Lignes renseignées" in dd)
        verifie("chaque ligne porte sa provenance",
                "Déclaré par les sites" in dd and "dérivé des missions" in dd)
        verifie("il ne se déclare pas conforme",
                "n'est pas une conformité" in dd and "ni auditeur" in dd)
        verifie("le carbone est annoncé comme non collecté, pas estimé",
                "gaz à effet de serre" in dd
                and "Riseva ne collecte pas cette donnée" in dd)

        print("\nRapport consolidé de groupe")
        connecte(p, "u2", "#/groupe")
        with p.context.expect_page() as onglet:
            p.click("#rapG")
        rg = onglet.value; rg.wait_for_timeout(500)
        d = norm(rg.inner_text("body"))
        verifie("le rapport de groupe s'édite", "Rapport consolidé" in d)
        verifie("il porte une empreinte et une date d'arrêté",
                "empreinte" in d and "arrêté au" in d)
        verifie("il refuse d'additionner des réductions non plafonnées",
                "non calculée" in d and "produirait un chiffre faux" in d)
        verifie("il dit ce que le périmètre manquant représente en effectifs",
                "pas de valeur approuvée" in d and "salariés sur" in d)
        verifie("il ne donne un total fiscal qu'à titre informatif",
                "n'existe que par société donatrice" in d)
        verifie("il ne se présente pas comme un audit",
                "n'est pas un rapport d'audit" in d and "non auditées par Riseva" in d)
        verifie("le consolidé est présenté comme un rapport de sommes",
                "rapport de sommes" in d)
        rg.close()

        print("\nRien ne sort du domaine")
        # Une police chargée depuis fonts.googleapis.com transmet l'IP du visiteur à un
        # tiers avant qu'il ait cliqué. La page Confidentialité promet le contraire :
        # on le vérifie plutôt que de l'écrire.
        pages_publiques = ["/", "/inscription.html", "/associations.html", "/asso.html?id=a1",
                           "/reglement.html", "/confidentialite.html", "/securite.html",
                           "/charte-associations.html", "/cgv.html",
                           "/mentions.html", "/engagements.html", "/moderation.html",
                           "/rejoindre.html", "/404.html", "/app/"]
        externes = []
        ext = nav.new_page()
        ext.on("request", lambda r: externes.append(r.url)
               if not r.url.startswith((BASE, "data:", "blob:", "about:")) else None)
        for chemin in pages_publiques:
            ext.goto(BASE + chemin, wait_until="networkidle")
        verifie("aucune page n'appelle un domaine tiers", not externes,
                "; ".join(sorted(set(externes))[:3]))
        feuilles = ext.eval_on_selector_all(
            "link[rel=stylesheet]", "l=>l.map(e=>e.href).filter(h=>!h.startsWith(location.origin))")
        verifie("aucune feuille de style distante", not feuilles, "; ".join(feuilles[:3]))

        # Un lien mort dans un document contractuel coûte plus cher qu'un bug : c'est
        # la clause qu'on ne peut pas lire. On les suit tous.
        import urllib.request
        cibles = set()
        for f in list(RACINE.rglob("*.html")) + list((RACINE / "app").glob("*.js")):
            src = f.read_text(encoding="utf-8")
            for motif in (r'href="(/[^"#?${]*)"', r'src="(/[^"#?${]*)"'):
                cibles.update(m.group(1) for m in re.finditer(motif, src))
        morts = []
        for lien in sorted(cibles):
            if not lien or lien.endswith("/") or lien == "/app/config.js":
                continue  # config.js n'existe qu'en production, le chargeur l'assume
            try:
                urllib.request.urlopen(BASE + lien, timeout=5).read(1)
            except Exception:
                morts.append(lien)
        p.goto(f"{BASE}/mentions.html", wait_until="domcontentloaded"); p.wait_for_timeout(200)
        mn = norm(p.inner_text("body"))
        verifie("les mentions légales citent la base légale en vigueur",
                "article 1-1" in mn and "21 mai 2024" in mn and "6 III" not in mn,
                "depuis la loi SREN, l'obligation n'est plus à l'article 6 de la LCEN")
        verifie("l'hébergeur et les sous-traitants de stockage sont nommés",
                "Vercel Inc." in mn and "Supabase, Inc." in mn and "sous-traitants" in mn)
        verifie("le directeur de la publication est désigné",
                "Directeur de la publication" in mn)
        verifie("ce qui manque est dit, pas passé sous silence",
                "Immatriculation en cours" in mn)
        verifie("la voie de réclamation CNIL est ouverte", "informatique et des libertés" in mn)

        verifie("aucun lien interne ne pointe dans le vide", not morts, "; ".join(morts[:3]))
        ext.close()

        print("\nAccessibilité et robustesse")
        p.goto(BASE + "/", wait_until="networkidle")
        sans_alt = p.eval_on_selector_all("img", "l=>l.filter(i=>!i.hasAttribute('alt')).length")
        verifie("toutes les images ont un alt", sans_alt == 0, f"{sans_alt} sans alt")

        # Un champ sans libellé relié ne s'annonce pas : la personne qui n'y voit rien
        # entend « zone de saisie » et doit deviner laquelle.
        SANS_ETIQUETTE = """()=>{const out=[];
          document.querySelectorAll('input,select,textarea').forEach(e=>{
            if(['hidden','submit','button'].includes(e.type))return;
            const lab=e.id?document.querySelector('label[for="'+CSS.escape(e.id)+'"]'):null;
            if(!lab&&!e.closest('label')&&!e.getAttribute('aria-label')&&!e.getAttribute('aria-labelledby'))
              out.push(e.name||e.id||e.type||e.tagName)});return out}"""
        nus = []
        for chemin in ["/", "/inscription.html", "/associations.html", "/asso.html?id=a1",
                       "/rejoindre.html"]:
            p.goto(BASE + chemin, wait_until="networkidle")
            nus += [f"{chemin}:{c}" for c in p.evaluate(SANS_ETIQUETTE)]
        for uid, route in [("u2", "#/annonces"), ("u2", "#/equipe"), ("u2", "#/parametres"),
                           ("u2", "#/annuaire"), ("u7", "#/avalider"), ("u1", "#/moteur")]:
            connecte(p, uid, route)
            nus += [f"{route}:{c}" for c in p.evaluate(SANS_ETIQUETTE)]
        verifie("tout champ de saisie porte un libellé", not nus, "; ".join(nus[:4]))
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
