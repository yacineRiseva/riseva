from playwright.sync_api import sync_playwright
import sys
B="http://127.0.0.1:8080"
JS = """() => {
  // Ce qu'un lecteur en diagonale voit vraiment : ce qui est gros, ce qui est
  // gras, ce qui est en petites capitales, et les nombres. Le reste est du
  // texte courant qu'il saute.
  const vus = [];
  const seen = new Set();
  const marque = (e, quoi) => {
    const t = e.innerText.replace(/\\s+/g, ' ').trim();
    if (!t || t.length < 2 || seen.has(t)) return;
    seen.add(t);
    const r = e.getBoundingClientRect();
    vus.push({ y: Math.round(r.top + scrollY), quoi, t });
  };
  for (const e of document.querySelectorAll('body *')) {
    if (e.offsetParent === null) continue;
    const s = getComputedStyle(e);
    const px = parseFloat(s.fontSize);
    const propre = [...e.childNodes].filter(n => n.nodeType === 3)
      .map(n => n.textContent.trim()).join(' ').trim();
    if (!propre) continue;
    if (/^H[1-4]$/.test(e.tagName)) { marque(e, e.tagName); continue; }
    if (px >= 26) { marque(e, 'gros'); continue; }
    if (s.textTransform === 'uppercase' || parseFloat(s.letterSpacing) > 0.5) {
      marque(e, 'capitales'); continue;
    }
    if (parseInt(s.fontWeight) >= 600 && px >= 15) { marque(e, 'gras'); continue; }
  }
  vus.sort((a, b) => a.y - b.y);
  return vus;
}"""
with sync_playwright() as pw:
    b=pw.chromium.launch()
    for url in sys.argv[1:] or ["/index.html"]:
        p=b.new_page(viewport={"width":1440,"height":900}, reduced_motion="reduce")
        p.goto(B+url, wait_until="networkidle"); p.wait_for_timeout(400)
        H=p.evaluate("()=>document.documentElement.scrollHeight")
        for y in range(0,H,600): p.evaluate(f"window.scrollTo(0,{y})"); p.wait_for_timeout(35)
        p.evaluate("window.scrollTo(0,0)"); p.wait_for_timeout(200)
        d=p.evaluate(JS)
        mots=sum(len(x["t"].split()) for x in d)
        total = p.evaluate("()=>document.body.innerText.trim().split(/\\s+/).length")
        print(f"=== {url} : {len(d)} elements vus en diagonale, {mots} mots sur {total}")
        for x in d:
            print(f"{100*x['y']//H:3d}%  {x['quoi']:9s} {x['t'][:96]}")
        p.close()
    b.close()
