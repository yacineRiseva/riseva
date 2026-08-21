from playwright.sync_api import sync_playwright
import pathlib, sys
base="http://127.0.0.1:8080"
OVERRIDE = """*{font-family:'Carlito','DejaVu Sans',sans-serif !important}"""
pages=[("accueil","/",None,True),
       ("inscription","/inscription.html",None,True),
       ("associations","/associations.html",None,True),
       ("asso-publique","/asso.html?id=a1",None,True),
       ("reglement","/reglement.html",None,True),
       ("securite","/securite.html",None,True),
       ("app-annuaire","/app/#/annuaire","u2",False),
       ("app-parametres","/app/#/parametres","u2",False),
       ("app-missions","/app/#/missions","u2",False),
       ("app-abonnement","/app/#/abonnement","u2",False),
       ("admin-tableau","/app/#/tableau","u1",False),
       ("app-login","/app/",None,False),
       ("app-dashboard","/app/#/tableau","u2",False),
       ("app-annonces","/app/#/annonces","u2",False),
       ("app-classement","/app/#/classement","u2",False),
       ("app-equipe","/app/#/equipe","u2",False),
       ("app-rapports","/app/#/rapports","u2",False),
       ("app-mecenat","/app/#/mecenat","u2",False),
       ("asso-recus","/app/#/recus","u7",False),
       ("asso-dashboard","/app/#/tableau","u7",False),
       ("asso-valider","/app/#/avalider","u7",False),
       ("admin-assos","/app/#/assos","u1",False),
       ("admin-moteur","/app/#/moteur","u1",False),
       ("app-activite","/app/#/activite","u4",False),
       ("app-ensemble","/app/#/ensemble","u2",True)]
out=pathlib.Path("/root/riseva/shots"); out.mkdir(exist_ok=True)
errs=[]
with sync_playwright() as pw:
    b=pw.chromium.launch()
    ctx=b.new_context(viewport={"width":1440,"height":900},device_scale_factor=2,locale="fr-FR")
    p=ctx.new_page()
    p.on("console", lambda m: errs.append(m.text) if m.type=="error" else None)
    p.on("pageerror", lambda e: errs.append("PAGEERROR "+str(e)))
    for name,path,uid,full in pages:
        p.goto(base+"/app/", wait_until="domcontentloaded")
        if uid: p.evaluate("u=>localStorage.setItem('riseva.session',JSON.stringify({uid:u}))",uid)
        else:   p.evaluate("()=>localStorage.removeItem('riseva.session')")
        p.goto(base+path.replace("/app/","/app/?r=1"), wait_until="networkidle")
        p.wait_for_timeout(500)
        p.evaluate("css=>{const s=document.createElement('style');s.textContent=css;document.head.appendChild(s)}",OVERRIDE)
        p.wait_for_timeout(400)
        p.screenshot(path=str(out/f"{name}.png"), full_page=full)
    m=ctx.new_page(); m.set_viewport_size({"width":390,"height":844})
    m.goto(base+"/", wait_until="networkidle")
    m.evaluate("css=>{const s=document.createElement('style');s.textContent=css;document.head.appendChild(s)}",OVERRIDE)
    m.wait_for_timeout(400)
    m.screenshot(path=str(out/"accueil-mobile.png"), full_page=True)
    b.close()
print("ERREURS:", "\n".join(sorted(set(errs))) if errs else "aucune")
