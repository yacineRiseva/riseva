#!/usr/bin/env python3
"""Mesure le contraste réel de chaque texte affiché, page par page.

On ne juge pas une palette sur une maquette : on mesure ce que le navigateur
dessine vraiment, avec la couleur héritée, le fond effectif derrière l'élément,
et la taille finale du texte. Le seuil WCAG AA est 4,5:1, ramené à 3:1 pour un
texte large (18,66 px en gras, ou 24 px).

    python3 scripts/contraste.py          # rapport
    python3 scripts/contraste.py --strict # sort en erreur au premier manquement
"""
from playwright.sync_api import sync_playwright
import sys, collections

BASE = "http://127.0.0.1:8080"
PAGES = [("accueil", "/", None), ("associations", "/associations.html", None),
         ("inscription", "/inscription.html", None), ("règlement", "/reglement.html", None),
         ("tableau de bord", "/app/#/tableau", "u2"), ("annonces", "/app/#/annonces", "u2"),
         ("tous ensemble", "/app/#/ensemble", "u2"), ("annuaire", "/app/#/annuaire", "u2"),
         ("classement", "/app/#/classement", "u2"), ("mécénat", "/app/#/mecenat", "u2"),
         ("association", "/app/#/tableau", "u7"), ("Riseva", "/app/#/tableau", "u1")]

MESURE = r"""
() => {
  const lum = (c) => {
    const [r,g,b] = c.map(v => { v/=255; return v <= .03928 ? v/12.92 : Math.pow((v+.055)/1.055, 2.4); });
    return .2126*r + .7152*g + .0722*b;
  };
  const rgb = (s) => { const m = s.match(/[\d.]+/g); return m ? m.slice(0,3).map(Number) : null; };
  const alpha = (s) => { const m = s.match(/[\d.]+/g); return m && m.length > 3 ? Number(m[3]) : 1; };
  const melange = (av, ar, a) => av.map((v,i) => v*a + ar[i]*(1-a));
  const fond = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const s = getComputedStyle(n);
      const c = rgb(s.backgroundColor), a = alpha(s.backgroundColor);
      if (c && a > .95) return c;
      if (c && a > 0) { const dessous = fond(n.parentElement || document.body); return melange(c, dessous, a); }
      n = n.parentElement;
    }
    return [255,255,255];
  };
  const res = [];
  document.querySelectorAll('body *').forEach(el => {
    const texte = [...el.childNodes].filter(n => n.nodeType === 3)
      .map(n => n.textContent.trim()).join(' ').trim();
    if (!texte || texte.length < 2) return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.opacity === '0') return;
    const av = rgb(s.color); if (!av) return;
    const a = alpha(s.color);
    const ar = fond(el);
    const c = melange(av, ar, a);
    const L1 = lum(c), L2 = lum(ar);
    const ratio = (Math.max(L1,L2) + .05) / (Math.min(L1,L2) + .05);
    const px = parseFloat(s.fontSize);
    const gras = parseInt(s.fontWeight) >= 700 || s.fontWeight === 'bold';
    const large = px >= 24 || (px >= 18.66 && gras);
    res.push({ texte: texte.slice(0,60), ratio: Math.round(ratio*100)/100,
               px: Math.round(px*10)/10, large, seuil: large ? 3 : 4.5,
               ou: el.className && typeof el.className === 'string'
                   ? el.tagName.toLowerCase() + '.' + el.className.split(' ')[0]
                   : el.tagName.toLowerCase() });
  });
  return res;
}
"""

def main():
    faibles = collections.defaultdict(list)
    total = 0
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        ctx = b.new_context(viewport={"width":1440,"height":900}, locale="fr-FR")
        p = ctx.new_page()
        for nom, chemin, uid in PAGES:
            p.goto(BASE + "/app/", wait_until="domcontentloaded")
            if uid: p.evaluate("u=>localStorage.setItem('riseva.session',JSON.stringify({uid:u}))", uid)
            else:   p.evaluate("()=>localStorage.removeItem('riseva.session')")
            p.goto(BASE + chemin.replace("/app/", "/app/?r=1"), wait_until="networkidle")
            p.wait_for_timeout(400)
            for m in p.evaluate(MESURE):
                total += 1
                if m["ratio"] < m["seuil"]:
                    faibles[nom].append(m)
        b.close()

    print(f"{total} textes mesurés sur {len(PAGES)} pages.\n")
    if not faibles:
        print("Tout passe le seuil WCAG AA.")
        return
    n = 0
    for page, l in faibles.items():
        vus = set()
        print(f"{page}")
        for m in sorted(l, key=lambda x: x["ratio"]):
            cle = (m["ou"], m["ratio"])
            if cle in vus: continue
            vus.add(cle); n += 1
            print(f"  {m['ratio']:>5}:1  (seuil {m['seuil']})  {m['px']}px  {m['ou']:<28} « {m['texte']} »")
        print()
    print(f"{n} cas distincts sous le seuil.")
    if "--strict" in sys.argv: sys.exit(1)

main()
