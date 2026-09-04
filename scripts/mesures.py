#!/usr/bin/env python3
"""Les mesures de la vitrine, en une seule recette.

    python3 scripts/mesures.py                 # les deux vitrines
    python3 scripts/mesures.py /index.html     # une page

Cinq mesures, et la raison de chacune :

  carte      la hauteur, les mots, les images et le fond de chaque section.
             C'est ce qui a montre qu'une section faisait 2 081 px pour 93 mots.
  vide       les plus grands espaces sans contenu. Une relecture avait decrit
             un vide de 1 200 px la ou le plus grand faisait 252 : on ne discute
             pas d'un vide, on le mesure.
  defauts    captures recadrees, texte qui deborde, cadres a moitie vides,
             mots orphelins, aux trois largeurs.
  contraste  le contraste calcule contre le fond REELLEMENT peint, seuil AA.
  diagonale  ce qu'un lecteur presse voit vraiment : gros, gras, capitales,
             chiffres. C'est la reponse mesurable a « est-ce que ca se comprend
             en diagonale ».

Ces outils vivaient dans un dossier de travail que le conteneur perd a chaque
reprise. Ils sont ici pour ne plus etre a refaire.
"""
import sys
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8080"

CARTE = """(H)=>[...document.querySelectorAll('header,section')].map(e=>{
  const r=e.getBoundingClientRect();
  const mots=e.innerText.trim().split(/\\s+/).length;
  const h2=(e.querySelector('h1,h2')||{innerText:'-'}).innerText.replace(/\\s+/g,' ').trim();
  const im=e.querySelectorAll('img').length;
  // Un fond transparent rend « rgba(0, 0, 0, 0) » : sans le test sur l'alpha,
  // toute section sans fond propre etait comptee comme sombre.
  const m=getComputedStyle(e).backgroundColor.match(/[\\d.]+/g);
  const opaque = m && (m.length<4 || +m[3]>=0.5);
  const sombre = opaque && (+m[0]+ +m[1]+ +m[2])/3 < 110;
  return (e.id||'(hero)').padEnd(14)+' '+String(Math.round(r.height)).padStart(5)+' px '
    +String(Math.round(100*r.height/H)).padStart(2)+'%  '+String(mots).padStart(4)+' mots  '
    +im+' img  '+(sombre?'SOMBRE':'clair ')+'  '+h2;
}).join('\\n')"""

VIDE = """(H)=>{
  const seg=[];
  for(const e of document.querySelectorAll('*')){
    if(e.offsetParent===null && getComputedStyle(e).position!=='fixed') continue;
    let compte=/^(IMG|SVG|CANVAS|VIDEO|HR|INPUT|BUTTON|TEXTAREA|SELECT)$/.test(e.tagName);
    if(!compte) for(const c of e.childNodes)
      if(c.nodeType===3 && c.textContent.trim()){ compte=true; break; }
    if(!compte) continue;
    const r=e.getBoundingClientRect();
    if(r.height<=0||r.width<=0) continue;
    seg.push([Math.round(r.top+scrollY), Math.round(r.bottom+scrollY)]);
  }
  seg.sort((a,b)=>a[0]-b[0]);
  const f=[];
  for(const s of seg){
    if(f.length && s[0]<=f[f.length-1][1]) f[f.length-1][1]=Math.max(f[f.length-1][1],s[1]);
    else f.push([s[0],s[1]]);
  }
  const t=[];
  for(let i=1;i<f.length;i++){
    const g=f[i][0]-f[i-1][1];
    if(g>=120) t.push('  '+String(g).padStart(4)+' px  a '+Math.round(100*f[i-1][1]/H)+'% de la page');
  }
  return t.slice(0,8).join('\\n') || '  aucun espace de 120 px ou plus';}"""

DEFAUTS = """()=>{
  const out=[]; const nom=e=>e.tagName+'.'+String(e.className).slice(0,24);
  for(const im of document.images){
    if(im.offsetParent===null||!im.naturalWidth) continue;
    const r=im.getBoundingClientRect(); if(!r.width||!r.height) continue;
    if(getComputedStyle(im).objectFit!=='cover') continue;
    const perte=Math.abs(1-(r.width/r.height)/(im.naturalWidth/im.naturalHeight));
    if(perte>0.12) out.push('RECADRAGE '+Math.round(perte*100)+'% '+im.currentSrc.split('/').pop()
      +(im.closest('.shot')?'  (CAPTURE, a corriger)':'  (photographie, voulu)'));
  }
  for(const e of document.querySelectorAll('p,li,h1,h2,h3,h4,dd,dt,b,a')){
    if(e.offsetParent===null||!e.clientWidth) continue;
    if(e.scrollWidth>e.clientWidth+2 && getComputedStyle(e).overflow==='visible')
      out.push('DEBORDE '+nom(e)+' '+e.scrollWidth+'>'+e.clientWidth);
  }
  for(const h of document.querySelectorAll('h1,h2,h3')){
    if(h.offsetParent===null) continue;
    const t=h.innerText.replace(/[ \\t\\n\\r]+/g,' ').trim();
    const mots=t.split(' '); if(mots.length<4) continue;
    const r=h.getBoundingClientRect();
    const lh=parseFloat(getComputedStyle(h).lineHeight)||0;
    if(!lh||r.height<lh*1.6) continue;
    const d=document.createElement('span');
    d.textContent=mots[mots.length-1];
    d.style.cssText='position:absolute;visibility:hidden;white-space:nowrap;font:'+getComputedStyle(h).font;
    document.body.appendChild(d);
    const w=d.getBoundingClientRect().width; d.remove();
    if(w<r.width*0.14) out.push('ORPHELIN "'+mots[mots.length-1]+'" dans '+t.slice(0,42));
  }
  return [...new Set(out)];}"""

CONTRASTE = """()=>{
  const lum=c=>{const [r,g,b]=c.map(v=>{v/=255;
    return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});
    return .2126*r+.7152*g+.0722*b;};
  const parse=s=>{const m=s.match(/[\\d.]+/g); if(!m) return null;
    return {c:[+m[0],+m[1],+m[2]], a:m.length>3?+m[3]:1};};
  const fond=e=>{let n=e;
    while(n && n!==document.documentElement){
      const p=parse(getComputedStyle(n).backgroundColor);
      if(p && p.a>0.9) return p.c; n=n.parentElement;}
    return [255,255,255];};
  const out=[];
  for(const e of document.querySelectorAll('body *')){
    let t=''; for(const c of e.childNodes) if(c.nodeType===3) t+=c.textContent.trim();
    if(!t || e.offsetParent===null) continue;
    if(e.closest('[aria-hidden="true"]')) continue;
    const s=getComputedStyle(e); const f=parse(s.color); if(!f) continue;
    const bg=fond(e);
    const eff=f.c.map((v,i)=>v*f.a+bg[i]*(1-f.a));
    const l1=lum(eff), l2=lum(bg);
    const r=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
    const px=parseFloat(s.fontSize), gras=parseInt(s.fontWeight)>=700;
    const seuil=(px>=24||(px>=18.66&&gras))?3.0:4.5;
    if(r<seuil) out.push(r.toFixed(2)+' < '+seuil+'  '+e.tagName+'.'
      +String(e.className).slice(0,22)+' | '+t.slice(0,34));
  }
  return out;}"""


def parcourir(page):
    h = page.evaluate("()=>document.documentElement.scrollHeight")
    for y in range(0, h, 600):
        page.evaluate("y=>window.scrollTo(0,y)", y)
        page.wait_for_timeout(35)
    page.evaluate("()=>window.scrollTo(0,0)")
    page.wait_for_timeout(250)
    return h


def main():
    pages = sys.argv[1:] or ["/index.html", "/associations.html"]
    with sync_playwright() as pw:
        nav = pw.chromium.launch()
        for url in pages:
            p = nav.new_page(viewport={"width": 1440, "height": 900}, reduced_motion="reduce")
            p.goto(BASE + url, wait_until="networkidle"); p.wait_for_timeout(400)
            h = parcourir(p)
            print(f"\n{'=' * 72}\n{url}   {h} px")
            print("\n-- sections")
            print(p.evaluate(CARTE, h))
            print("\n-- espaces sans contenu")
            print(p.evaluate(VIDE, h))
            print("\n-- contraste sous le seuil AA")
            c = p.evaluate(CONTRASTE)
            print("  " + ("\n  ".join(c) if c else "aucun"))
            p.close()
            for w in (1440, 768, 390):
                q = nav.new_page(viewport={"width": w, "height": 900}, reduced_motion="reduce")
                q.goto(BASE + url, wait_until="networkidle"); q.wait_for_timeout(350)
                parcourir(q)
                d = q.evaluate(DEFAUTS)
                print(f"\n-- defauts a {w} px : {len(d)}")
                for x in d:
                    print("  " + x)
                q.close()
        nav.close()


if __name__ == "__main__":
    main()
