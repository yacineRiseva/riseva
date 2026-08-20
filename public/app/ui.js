/* Petites briques d'interface partagées. Aucun framework. */

export const h = (html) => {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g,
  c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

export const nb  = (n) => new Intl.NumberFormat("fr-FR").format(Math.round(n));
export const eur = (n) => new Intl.NumberFormat("fr-FR",{ style:"currency", currency:"EUR",
  maximumFractionDigits:0 }).format(n);
export const dateFR = (s) => new Date(s).toLocaleDateString("fr-FR",
  { day:"numeric", month:"long", year:"numeric" });
export const dateCourte = (s) => new Date(s).toLocaleDateString("fr-FR",
  { day:"2-digit", month:"short" });

export const initiales = (nom) => nom.split(/\s+/).slice(0,2).map(m => m[0]).join("").toUpperCase();

/* Icônes : traits fins, 1.6px, jamais de pictos pleins. */
const P = (d) => `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor"
  stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
export const ICONS = {
  dashboard: P(`<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>`),
  megaphone: P(`<path d="M3 11v2a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1Z"/><path d="M15 8a4 4 0 0 1 0 8"/><path d="M18 5a8 8 0 0 1 0 14"/>`),
  check:     P(`<path d="M20 6 9 17l-5-5"/>`),
  trophy:    P(`<path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 5H5v2a3 3 0 0 0 3 3"/><path d="M16 5h3v2a3 3 0 0 1-3 3"/><path d="M12 13v4"/><path d="M9 21h6"/><path d="M10 17h4l1 4H9l1-4Z"/>`),
  users:     P(`<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5.5a3 3 0 0 1 0 5"/><path d="M18 20a5.5 5.5 0 0 0-3-4.9"/>`),
  report:    P(`<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5"/><path d="M9 13h6"/><path d="M9 17h4"/>`),
  card:      P(`<rect x="2.5" y="5.5" width="19" height="13" rx="2.5"/><path d="M2.5 10h19"/>`),
  building:  P(`<path d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16"/><path d="M15 9h3a2 2 0 0 1 2 2v10"/><path d="M8 7h3M8 11h3M8 15h3"/><path d="M2 21h20"/>`),
  heart:     P(`<path d="M12 20s-7-4.6-7-9.4A4.1 4.1 0 0 1 12 7a4.1 4.1 0 0 1 7 3.6C19 15.4 12 20 12 20Z"/>`),
  calendar:  P(`<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>`),
  settings:  P(`<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/>`),
  logout:    P(`<path d="M14 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2"/><path d="M18 15l3-3-3-3"/><path d="M21 12H9"/>`),
  plus:      P(`<path d="M12 5v14M5 12h14"/>`),
  coins:     P(`<ellipse cx="12" cy="6.5" rx="7" ry="3"/><path d="M5 6.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/><path d="M5 11.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/>`),
  hands:     P(`<path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V12"/><path d="M11 12V5.5a1.5 1.5 0 0 1 3 0V12"/><path d="M14 12V7.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6v-3a1.5 1.5 0 0 1 3 0"/>`),
  box:       P(`<path d="M21 8.5 12 4 3 8.5v7L12 20l9-4.5v-7Z"/><path d="M3 8.5 12 13l9-4.5M12 13v7"/>`),
  clock:     P(`<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>`)
};

export function toast(message){
  let el = document.querySelector(".toast");
  if (!el){ el = h(`<div class="toast"></div>`); document.body.appendChild(el); }
  el.textContent = message;
  el.classList.add("is-on");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("is-on"), 2600);
}

export function modal(titre, corps, actions = []){
  const ov = h(`<div class="overlay"></div>`);
  const md = h(`<div class="modal"><h3 style="margin-bottom:var(--s5)">${esc(titre)}</h3></div>`);
  md.appendChild(typeof corps === "string" ? h(`<div>${corps}</div>`) : corps);
  const bar = h(`<div class="row" style="justify-content:flex-end;margin-top:var(--s8)"></div>`);
  actions.forEach(a => {
    const b = h(`<button class="btn ${a.classe || "btn--ghost"}">${esc(a.label)}</button>`);
    b.onclick = () => { const r = a.onClick?.(md); if (r !== false) ov.remove(); };
    bar.appendChild(b);
  });
  md.appendChild(bar);
  ov.appendChild(md);
  ov.addEventListener("click", e => { if (e.target === ov) ov.remove(); });
  document.body.appendChild(ov);
  return ov;
}

export function kpi(label, valeur, delta = "", sens = "", classe = ""){
  return `<div class="card kpi ${classe}">
    <span class="kpi__label">${esc(label)}</span>
    <span class="kpi__value">${valeur}</span>
    ${delta ? `<span class="kpi__delta ${sens}">${esc(delta)}</span>` : ""}
  </div>`;
}

export function spark(valeurs){
  const max = Math.max(...valeurs, 1);
  return `<div class="spark">${valeurs.map(v =>
    `<i style="height:${Math.max(6, (v / max) * 100)}%" title="${nb(v)} points"></i>`).join("")}</div>`;
}

/* La rivière : la signature visuelle de Riseva, reprise du logo.
   Une courbe lissée, doublée d'un écho plus fin en dessous, comme le trait du monogramme.
   Sert partout où l'on montre une évolution dans le temps. */
export function riviere(valeurs, { hauteur = 150, legendes = [] } = {}){
  const L = 1000, H = hauteur, marge = 14;
  const max = Math.max(...valeurs, 1);
  const min = Math.min(...valeurs, 0);
  const pas = L / Math.max(valeurs.length - 1, 1);
  const pts = valeurs.map((v, i) => [
    i * pas,
    marge + (H - marge * 2) * (1 - (v - min) / Math.max(max - min, 1))
  ]);

  // Lissage Catmull-Rom converti en courbes de Bézier cubiques.
  const courbe = (p, decalage = 0) => {
    const q = p.map(([x, y]) => [x, y + decalage]);
    let d = `M ${q[0][0]} ${q[0][1]}`;
    for (let i = 0; i < q.length - 1; i++){
      const p0 = q[i - 1] || q[i], p1 = q[i], p2 = q[i + 1], p3 = q[i + 2] || q[i + 1];
      d += ` C ${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6},`
        +  ` ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6},`
        +  ` ${p2[0]} ${p2[1]}`;
    }
    return d;
  };

  const trait = courbe(pts);
  const dernier = pts[pts.length - 1];
  const id = "riv" + Math.abs(valeurs.reduce((a, b) => a + b, 0));

  return `<figure class="riviere" style="--h:${H}px">
    <svg viewBox="0 0 ${L} ${H}" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"  stop-color="var(--forest-600)" stop-opacity=".26"/>
        <stop offset="100%" stop-color="var(--forest-600)" stop-opacity="0"/>
      </linearGradient></defs>
      <path d="${trait} L ${L} ${H} L 0 ${H} Z" fill="url(#${id})"/>
      <path d="${courbe(pts, 9)}" fill="none" stroke="var(--brand)" stroke-opacity=".45"
            stroke-width="2" vector-effect="non-scaling-stroke" stroke-linecap="round"/>
      <path d="${trait}" fill="none" stroke="var(--forest-700)" stroke-width="2.5"
            vector-effect="non-scaling-stroke" stroke-linecap="round"/>
    </svg>
    <span class="riviere__fin" style="left:100%;top:${(dernier[1] / H) * 100}%"></span>
    ${legendes.length ? `<figcaption>${legendes.map(l => `<span>${esc(l)}</span>`).join("")}</figcaption>` : ""}
  </figure>`;
}
