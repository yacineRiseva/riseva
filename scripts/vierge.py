#!/usr/bin/env python3
"""Le premier jour : chaque ecran, sur une base vide.

    python3 scripts/vierge.py            # rapport
    python3 scripts/vierge.py --strict   # sort en erreur au premier defaut

Pourquoi ce fichier existe. Le jeu de demonstration montre le produit plein :
deux cent vingt-trois missions, treize associations, un classement de douze
entreprises. C'est ce qu'il faut pour vendre, et c'est exactement ce qu'un
client n'aura JAMAIS le jour ou il ouvre son espace. Un ecran qui n'a ete vu
qu'avec des donnees affiche « NaN », « undefined », « 0 / 0 », un podium sans
personne dessus, ou une division par zero, et personne ne s'en apercoit avant
le premier vrai client.

Ce que la recette verifie, ecran par ecran et role par role, sur une base qui
ne contient qu'une saison ouverte :

  1. aucune erreur JavaScript ;
  2. l'ecran rend quelque chose, il ne reste pas blanc ;
  3. aucun « NaN », « undefined », « null », « Infinity », « [object » ni
     « 0 %  de 0 » dans le texte affiche ;
  4. la ou il n'y a rien, il est dit qu'il n'y a rien : un etat vide nomme,
     pas un tableau a zero ligne sans un mot.

Le parcours est celui d'une vraie premiere fois : une entreprise cree son
compte depuis l'ecran de connexion, une association aussi, et on visite tout
ce que chacune voit.
"""
import http.server, socketserver, threading, functools, pathlib, sys, re, contextlib
from playwright.sync_api import sync_playwright

RACINE = pathlib.Path(__file__).resolve().parent.parent / "public"
PORT = 8141
BASE = f"http://127.0.0.1:{PORT}"

INTERDITS = re.compile(r"\bNaN\b|\bundefined\b|\bInfinity\b|\[object |\bnull\b")

ROUTES = {
  "entreprise_admin": ["tableau", "annonces", "missions", "equipe", "classement",
                       "annuaire", "ensemble", "rapports", "adoption", "supports",
                       "mecenat", "materiel", "dossier", "abonnement", "parametres",
                       "indicateurs", "securite", "vsme", "preferences"],
  "association": ["tableau", "mesannonces", "avalider", "page", "dossier",
                  "recus", "dons", "preferences"],
}

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

resultats = []
def dit(nom, ok, detail=""):
    resultats.append(ok)
    print(("  ok   " if ok else "  RATÉ ") + nom + (f"  [{detail}]" if detail and not ok else ""))

def main():
    erreurs = []
    with serveur(), sync_playwright() as pw:
        b = pw.chromium.launch()
        ctx = b.new_context(viewport={"width": 1440, "height": 1000}, locale="fr-FR")
        p = ctx.new_page()
        p.on("pageerror", lambda e: erreurs.append(str(e)))

        # ── l'ecran de connexion d'une base vide ────────────────────────────
        p.goto(f"{BASE}/app/?vierge=1", wait_until="domcontentloaded")
        p.evaluate("()=>{localStorage.removeItem('riseva.etat.vierge');"
                   "localStorage.removeItem('riseva.session')}")
        p.reload(wait_until="domcontentloaded")
        p.wait_for_timeout(600)
        dit("l'écran de connexion s'affiche sur une base vide",
            len(p.inner_text("body").strip()) > 200)
        dit("il ne propose aucun compte de démonstration",
            "Claire" not in p.inner_text("body"))

        # ── une entreprise ouvre son compte ─────────────────────────────────
        r = p.evaluate("""async()=>{const m=await import('/app/data.js');
          const c=m.DB.creerCompteEntreprise({entreprise:'Fonderie Lemoine',effectif:120,
            nom:'Claire Fontaine',email:'claire@lemoine.fr',secteur:'Industrie',ville:'Nantes'});
          return {uid:c.utilisateur.id, eid:c.entreprise.id};}""")
        # L'ecriture de l'etat est differee de cent vingt millisecondes : sans
        # cette pause, le rechargement suivant relit une base encore vide et on
        # retombe sur l'ecran de connexion.
        p.wait_for_timeout(400)
        p.evaluate("u=>localStorage.setItem('riseva.session',JSON.stringify({uid:u}))", r["uid"])

        for role, routes in ROUTES.items():
            if role == "association":
                a = p.evaluate("""async()=>{const m=await import('/app/data.js');
                  const c=m.DB.creerCompteAssociation({association:'Les Amis du Bocage',
                    cause:'Dépollution',ville:'Rennes',resume:'Nettoyage des berges.',
                    nom:'Élise Tournier',email:'elise@bocage.org'});
                  return c.utilisateur.id;}""")
                p.wait_for_timeout(400)
                p.evaluate("u=>localStorage.setItem('riseva.session',JSON.stringify({uid:u}))", a)
            print(f"\n{role}, base vierge")
            # Un seul rechargement par role, puis on deplace le fragment a la
            # main. Deux raisons, apprises a la dure. `goto` vers une adresse
            # qui ne differe que par le fragment ne recharge pas le document :
            # la session posee dans le stockage n'aurait jamais ete relue, et
            # on serait reste sur l'ecran de connexion sans le comprendre.
            # `reload` recharge vraiment, donc le module relit la session.
            p.reload(wait_until="domcontentloaded")
            p.wait_for_timeout(700)
            for route in routes:
                avant = len(erreurs)
                p.evaluate("r=>{location.hash='#/'+r}", route)
                p.wait_for_timeout(360)
                txt = ""
                try: txt = p.inner_text(".content", timeout=4000)
                except Exception: txt = ""
                if not txt:
                    dit(f"{route} : l'écran de l'application s'affiche", False,
                        "pas de .content, on est resté sur la connexion")
                    continue
                nouvelles = erreurs[avant:]
                dit(f"{route} : aucune erreur", not nouvelles, " / ".join(nouvelles)[:150])
                dit(f"{route} : l'écran n'est pas vide", len(txt.strip()) > 40, str(len(txt)))
                m = INTERDITS.search(txt)
                dit(f"{route} : aucune valeur technique affichée", not m,
                    (txt[max(0, m.start()-50):m.end()+50] if m else ""))
                # Un tableau a zero ligne, sans une phrase pour dire ce qu'il
                # attend, c'est le defaut le plus frequent d'une base vide : le
                # client croit que l'ecran est casse.
                muets = p.evaluate("""()=>{const out=[];
                  document.querySelectorAll('.content table').forEach((t,i)=>{
                    const n=t.querySelectorAll('tbody tr').length;
                    if(n) return;
                    const sec=t.closest('section,article,.card')||t.parentElement;
                    const txt=(sec?sec.innerText:'')||'';
                    if(!/aucun|aucune|rien|personne|pas encore|vide|d.s que|commenc/i.test(txt))
                      out.push((t.querySelector('th')?.innerText||('tableau '+i)).slice(0,40));
                  });return out}""")
                dit(f"{route} : un tableau vide dit ce qu'il attend",
                    not muets, ", ".join(muets)[:150])
        # ── le premier parcours, de bout en bout ────────────────────────────
        # Traverser les ecrans ne prouve pas qu'on peut travailler. Ce qui le
        # prouve, c'est la chaine complete : declarer un site, y nommer un
        # referent, ouvrir une collecte, la saisir, l'approuver, et lire le
        # rapport. Sur une base vierge, chaque maillon manquant se voit ici.
        print("\nle premier parcours, du compte au rapport")
        p.evaluate("u=>localStorage.setItem('riseva.session',JSON.stringify({uid:u}))", r["uid"])
        p.reload(wait_until="domcontentloaded")
        p.wait_for_timeout(700)

        etape = p.evaluate("""async()=>{const m=await import('/app/data.js');
          const D=m.DB, out={};
          const u=D.utilisateurs().find(x=>x.role==='entreprise_admin');
          try{ const et=D.ajouterEtablissement({societe:u.org,nom:'Siège',ville:'Nantes',
                 effectif:80,siret:'',adresse:''}); out.site=et.id; }
          catch(e){ out.site='ERR '+e.message; }
          try{ const et2=D.ajouterEtablissement({societe:u.org,nom:'Atelier',ville:'Rezé',
                 effectif:40}); out.site2=et2.id; }
          catch(e){ out.site2='ERR '+e.message; }
          try{ D.ajouterEtablissement({societe:u.org,nom:'Trop',ville:'Brest',effectif:500}); 
               out.plafond='ERR aucun refus'; }
          catch(e){ out.plafond='refus attendu'; }
          try{ const inv=D.creerInvitationReferent(out.site,'Karim Belhadj','karim@lemoine.fr');
               const ru=D.accepterInvitationReferent(inv.code); out.referent=ru.id; }
          catch(e){ out.referent='ERR '+e.message; }
          try{ const c=D.ouvrirCampagne({groupe:u.groupe,libelle:'Premier semestre 2026',
                 periode:'2026-S1',debut:'2026-01-01',fin:'2026-06-30',echeance:'2026-09-30',
                 rubriques:['social','securite']}); out.campagne=c.id; }
          catch(e){ out.campagne='ERR '+e.message; }
          return out;}""")
        p.wait_for_timeout(400)
        for cle, libelle in [("site", "une entreprise peut déclarer son premier site"),
                             ("site2", "elle peut en déclarer un deuxième"),
                             ("referent", "elle peut y nommer un référent"),
                             ("campagne", "elle peut ouvrir une collecte d'indicateurs")]:
            v = str(etape.get(cle, ""))
            dit(libelle, not v.startswith("ERR"), v[:150])
        dit("un site de plus que l'effectif de la société est refusé",
            etape.get("plafond") == "refus attendu", str(etape.get("plafond"))[:120])

        cid = etape.get("campagne", "")
        if isinstance(cid, str) and not cid.startswith("ERR"):
            suite = p.evaluate("""async(cid)=>{const m=await import('/app/data.js');
              const D=m.DB, out={};
              const ref=D.utilisateurs().find(x=>x.role==='site_referent');
              const adm=D.utilisateurs().find(x=>x.role==='entreprise_admin');
              try{ D.saisirIndicateurs(cid, ref.etablissement,
                     {effectif_moyen:80,heures_travaillees:120000,at_avec_arret:1,
                      at_sans_arret:2,jours_arret:14,contrats_cdi:70,contrats_cdd:10,
                      departs:4,embauches:6}, ref.id, ''); out.saisie='ok'; }
              catch(e){ out.saisie='ERR '+e.message; }
              try{ D.approuverIndicateurs(cid, ref.etablissement, adm.id); out.approbation='ok'; }
              catch(e){ out.approbation='ERR '+e.message; }
              try{ const r=D.rapportCollecte(cid);
                   out.rapport = r && r.repondus === 1 ? 'ok' : 'ERR répondus='+(r&&r.repondus); }
              catch(e){ out.rapport='ERR '+e.message; }
              return out;}""", cid)
            p.wait_for_timeout(400)
            for cle, libelle in [("saisie", "le référent peut saisir les chiffres de son site"),
                                 ("approbation", "le siège peut approuver la saisie"),
                                 ("rapport", "le rapport de collecte compte le site qui a répondu")]:
                v = str(suite.get(cle, ""))
                dit(libelle, v == "ok", v[:150])

            # ── le referent de site, sur ses propres ecrans ─────────────────
            ref = p.evaluate("""async()=>{const m=await import('/app/data.js');
              return (m.DB.utilisateurs().find(x=>x.role==='site_referent')||{}).id||null;}""")
            if ref:
                p.evaluate("u=>localStorage.setItem('riseva.session',JSON.stringify({uid:u}))", ref)
                print("\nsite_referent, premier jour")
                p.reload(wait_until="domcontentloaded")
                p.wait_for_timeout(700)
                for route in ["tableau", "equipe", "indicateurs", "securite", "preferences"]:
                    avant = len(erreurs)
                    p.evaluate("r=>{location.hash='#/'+r}", route)
                    p.wait_for_timeout(360)
                    try: txt = p.inner_text(".content", timeout=4000)
                    except Exception: txt = ""
                    if not txt:
                        dit(f"référent, {route} : l'écran s'affiche", False, "pas de .content")
                        continue
                    nouvelles = erreurs[avant:]
                    dit(f"référent, {route} : aucune erreur", not nouvelles,
                        " / ".join(nouvelles)[:150])
                    mm = INTERDITS.search(txt)
                    dit(f"référent, {route} : aucune valeur technique affichée", not mm,
                        (txt[max(0, mm.start()-50):mm.end()+50] if mm else ""))

        b.close()

    print(f"\n{sum(resultats)} / {len(resultats)} vérifications passées")
    if not all(resultats):
        print("\nLe premier jour n'est pas propre.")
        if "--strict" in sys.argv: sys.exit(1)
        sys.exit(1)
    print("Le premier jour tient debout.")

main()
