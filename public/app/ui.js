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

export const rangFR = (n) => n + "<sup style='font-size:.55em'>" + (n === 1 ? "er" : "e") + "</sup>";

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
  clock:     P(`<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>`),
  cloche:    P(`<path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6"/><path d="M13.7 20a2 2 0 0 1-3.4 0"/>`),
  leaf:      P(`<path d="M20 4C10 4 4 10 4 20c8 0 16-6 16-16Z"/><path d="M4 20C8 16 12 13 17 11"/>`),
  arrow:     P(`<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>`),
  pin:       P(`<path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/>`)
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

/* Export CSV. Point-virgule et BOM : c'est ce qu'Excel en français attend,
   sans quoi les accents cassent et tout se retrouve dans une seule colonne. */
export function versCSV(nomFichier, entetes, lignes){
  const cellule = (v) => {
    const t = String(v ?? "");
    return /[;"\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  };
  const contenu = "\uFEFF" + [entetes, ...lignes].map(l => l.map(cellule).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([contenu], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = nomFichier;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* État vide : un titre, une phrase, et si possible une action. Jamais un simple « aucun résultat ». */
export function vide({ titre, texte, action }){
  const el = h(`<div class="empty">
    <svg viewBox="0 0 120 44" style="width:120px;margin:0 auto var(--s5);opacity:.5">
      <path d="M2 32 C 24 12, 44 44, 64 26 S 100 6, 118 20" fill="none"
        stroke="var(--forest-600)" stroke-width="2" stroke-linecap="round"/>
      <path d="M2 40 C 26 20, 46 52, 66 34 S 102 14, 118 28" fill="none"
        stroke="var(--brand)" stroke-width="2" stroke-linecap="round" opacity=".45"/>
    </svg>
    <h3 style="margin-bottom:var(--s2)">${esc(titre)}</h3>
    <p class="muted" style="max-width:44ch;margin-inline:auto">${esc(texte)}</p>
  </div>`);
  if (action){
    const b = h(`<button class="btn btn--ghost" style="margin-top:var(--s6)">${esc(action.label)}</button>`);
    b.onclick = action.onClick;
    el.appendChild(b);
  }
  return el;
}

/* Bandeau de réalisations : ce que les missions ont produit dans le monde réel.
   Toujours accompagné de sa provenance, jamais présenté comme un impact mesuré. */
export function bandeauRealisations(r, { titre = "Ce que ça a produit", sombre = false,
  note = "Chiffres déclarés par les associations bénéficiaires, qui étaient sur place. Riseva additionne, elle n'audite pas." } = {}){
  if (!r || !r.liste || !r.liste.length) return null;
  const el = h(`<section class="card ${sombre ? "card--dark grain" : ""} realis">
    <div class="between" style="margin-bottom:var(--s6)">
      <h3>${esc(titre)}</h3>
      <span class="badge ${sombre ? "badge--lime" : "badge--brand"}">${nb(r.missions)} mission${r.missions > 1 ? "s" : ""}</span>
    </div>
    <div class="realis__grid">
      ${r.liste.map(x => `<div class="realis__c">
        <span class="realis__n">${nb(Math.round(x.quantite))}</span>
        <span class="realis__l">${esc(x.pl)}</span>
        ${x.estime ? `<span class="realis__e">+ ${nb(Math.round(x.estime))} estimés</span>` : ""}
      </div>`).join("")}
    </div>
    <p class="hint" style="margin-top:var(--s6)">${esc(note)}${r.sansReponse ? `
      Les gros chiffres sont ceux que les associations ont confirmés. ${nb(r.sansReponse)}
      mission${r.sansReponse > 1 ? "s ont" : " a"} été validée${r.sansReponse > 1 ? "s" : ""} faute de
      réponse sous quatorze jours : ce qu'elle${r.sansReponse > 1 ? "s ont" : " a"} produit reste une
      estimation, comptée à part.` : ""}</p>
  </section>`);
  return el;
}

/* Jauge brut / écrêté / retenu.
   C'est la signature graphique de Riseva : elle montre le mécanisme au lieu de le
   décorer. Une barre, trois portions, le dénominateur en clair, et la taille de la
   cohorte. Tout y est vérifiable à l'œil, ce qu'une courbe sans échelle ne permet pas. */
export function jauge({ brut, ecrete, retenu, diviseur, cohorte, unite = "points" }){
  const total = Math.max(brut, 1);
  const pRetenu = (retenu / total) * 100;
  const pEcrete = (ecrete / total) * 100;
  const parTete = diviseur ? Math.round((retenu / diviseur) * 10) / 10 : null;
  return h(`<div class="jauge">
    <div class="jauge__barre" role="img"
      aria-label="${nb(retenu)} ${unite} retenus sur ${nb(brut)} réalisés, ${nb(ecrete)} écrêtés">
      <i class="jauge__retenu" style="width:${pRetenu}%"></i>
      <i class="jauge__ecrete" style="width:${pEcrete}%"></i>
    </div>
    <div class="jauge__legende">
      <span><b class="jauge__pastille jauge__pastille--retenu"></b>
        <strong>${nb(retenu)}</strong> retenus</span>
      ${ecrete ? `<span><b class="jauge__pastille jauge__pastille--ecrete"></b>
        <strong>${nb(ecrete)}</strong> écrêtés</span>` : ""}
      <span class="muted">${nb(brut)} réalisés</span>
    </div>
    ${parTete !== null ? `<div class="jauge__calcul">
      <span>${nb(retenu)} ÷ ${nb(diviseur)} salariés</span>
      <strong>${parTete} ${unite} par salarié</strong>
    </div>` : ""}
    ${cohorte ? `<p class="hint">Comparé à ${cohorte} entreprise${cohorte > 1 ? "s" : ""} de la
      même taille.${cohorte < 10 ? " Cohorte trop petite pour un percentile." : ""}</p>` : ""}
  </div>`);
}

/* ------------------------------------------------------------------ */
/* Vignettes d'annonce                                                 */
/* ------------------------------------------------------------------ */
/* Pas de photo de banque d'images : elles se reconnaissent, elles vieillissent, et
   elles ne disent rien de la mission. On dessine la scène à partir de ce que la
   mission produit réellement. Le motif est déterministe : la même annonce donne
   toujours la même image, ce qui évite l'effet loterie au rechargement. */
const graine = (txt) => {
  let n = 0;
  for (let i = 0; i < txt.length; i++) n = (n * 31 + txt.charCodeAt(i)) >>> 0;
  return () => { n = (n * 1103515245 + 12345) >>> 0; return (n >>> 16) / 65535; };
};

const MOTIFS = {
  arbre:       "foret",
  haie:        "foret",
  metre_berge: "riviere",
  dechet_kg:   "riviere",
  repas:       "caisses",
  colis:       "caisses",
  kit:         "caisses",
  animal:      "pattes",
  eleve:       "silhouettes",
  maraude:     "silhouettes"
};
const MOTIF_TYPE = {
  benevolat_demi_journee: "silhouettes",
  don_materiel: "caisses",
  don_financier: "riviere"
};

function dessinFore(al){
  let d = "";
  for (let i = 0; i < 9; i++){
    const x = 14 + i * 36 + al() * 10;
    const y = 96 - al() * 8;
    const hh = 26 + al() * 22;
    const w = hh * 0.42;
    d += `<path d="M${x} ${y} L${x - w} ${y} L${x} ${y - hh} L${x + w} ${y} Z"
      fill="none" stroke="var(--lime)" stroke-opacity="${0.35 + al() * 0.45}" stroke-width="1.6"/>
      <path d="M${x} ${y} v7" stroke="var(--lime)" stroke-opacity=".3" stroke-width="1.4"/>`;
  }
  return d;
}
function dessinRiviere(al){
  let d = "";
  for (let i = 0; i < 4; i++){
    const y = 40 + i * 16 + al() * 6;
    d += `<path d="M-10 ${y} C 60 ${y - 12 - al() * 8}, 120 ${y + 14}, 190 ${y - 4}
      S 300 ${y - 16}, 370 ${y + 6}" fill="none" stroke="var(--lime)"
      stroke-opacity="${0.5 - i * 0.09}" stroke-width="1.8" stroke-linecap="round"/>`;
  }
  return d;
}
function dessinCaisses(al){
  let d = "";
  for (let i = 0; i < 7; i++){
    const w = 26 + al() * 16, hh = 20 + al() * 12;
    const x = 18 + i * 44 + al() * 8, y = 98 - hh;
    d += `<rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="2" fill="none"
      stroke="var(--lime)" stroke-opacity="${0.35 + al() * 0.4}" stroke-width="1.6"/>
      <path d="M${x} ${y + hh / 2} h${w}" stroke="var(--lime)" stroke-opacity=".25" stroke-width="1.3"/>`;
  }
  return d;
}
function dessinPattes(al){
  let d = "";
  for (let i = 0; i < 11; i++){
    const x = 20 + i * 30 + al() * 12, y = 34 + al() * 56, r = 3.4 + al() * 1.6;
    const o = 0.3 + al() * 0.45;
    d += `<circle cx="${x}" cy="${y}" r="${r * 1.5}" fill="none" stroke="var(--lime)"
      stroke-opacity="${o}" stroke-width="1.5"/>
      <circle cx="${x - r * 1.8}" cy="${y - r * 1.9}" r="${r * 0.6}" fill="var(--lime)" fill-opacity="${o}"/>
      <circle cx="${x}" cy="${y - r * 2.5}" r="${r * 0.6}" fill="var(--lime)" fill-opacity="${o}"/>
      <circle cx="${x + r * 1.8}" cy="${y - r * 1.9}" r="${r * 0.6}" fill="var(--lime)" fill-opacity="${o}"/>`;
  }
  return d;
}
function dessinSilhouettes(al){
  let d = "";
  for (let i = 0; i < 8; i++){
    const x = 22 + i * 42 + al() * 10, y = 98 - al() * 6;
    const hh = 30 + al() * 16, o = 0.3 + al() * 0.45;
    d += `<circle cx="${x}" cy="${y - hh}" r="5" fill="none" stroke="var(--lime)"
      stroke-opacity="${o}" stroke-width="1.6"/>
      <path d="M${x} ${y - hh + 6} v${hh * 0.45} M${x - 8} ${y - hh + 12} h16
        M${x} ${y - hh * 0.5} l-7 ${hh * 0.5} M${x} ${y - hh * 0.5} l7 ${hh * 0.5}"
        fill="none" stroke="var(--lime)" stroke-opacity="${o}" stroke-width="1.6"
        stroke-linecap="round"/>`;
  }
  return d;
}

export function vignette(annonce, { hauteur = 132 } = {}){
  const cle = (annonce.impact && annonce.impact.unite) || "";
  const motif = MOTIFS[cle] || MOTIF_TYPE[annonce.type] || "riviere";
  const al = graine(annonce.id + annonce.titre);
  const dessins = { foret: dessinFore, riviere: dessinRiviere, caisses: dessinCaisses,
                    pattes: dessinPattes, silhouettes: dessinSilhouettes };
  return `<svg class="vignette" viewBox="0 0 360 110" preserveAspectRatio="xMidYMid slice"
    style="height:${hauteur}px" role="img" aria-hidden="true">
    <rect width="360" height="110" fill="var(--forest-900)"/>
    ${dessins[motif](al)}
  </svg>`;
}

/* ------------------------------------------------------------------ */
/* Carte de France                                                     */
/* ------------------------------------------------------------------ */
/* Le contour est une polyligne de vraies coordonnées géographiques, projetée
   par la même fonction que les points posés dessus : impossible qu'un siège
   tombe à côté de la côte, puisque le trait et le point passent par le même
   calcul. La projection est équirectangulaire corrigée par le cosinus de la
   latitude moyenne, sans quoi la France s'étale en largeur.
   Pas de fond de carte tiers : aucune requête ne part vers un serveur de
   tuiles, donc aucune adresse IP d'utilisateur ne se promène chez un
   prestataire pour afficher trois points. */
const HEXAGONE = [
  [2.38,51.03],[1.85,50.95],[1.58,50.87],[1.61,50.72],[1.55,50.22],[1.08,49.93],
  [0.11,49.49],[-0.37,49.34],[-1.25,49.30],[-1.62,49.65],[-1.79,49.37],[-1.60,48.83],
  [-1.51,48.63],[-2.02,48.65],[-2.76,48.53],[-3.05,48.78],[-3.98,48.72],[-4.49,48.39],
  [-4.74,48.04],[-4.35,47.80],[-3.37,47.72],[-3.12,47.48],[-2.76,47.53],[-2.20,47.28],
  [-2.25,46.98],[-1.78,46.49],[-1.15,46.16],[-1.03,45.62],[-1.16,44.66],[-1.32,44.00],
  [-1.56,43.48],[-1.78,43.36],[-0.75,42.80],[0.66,42.69],[1.44,42.50],[1.73,42.50],
  [2.65,42.34],[3.03,42.55],[3.15,43.15],[3.70,43.40],[4.55,43.37],[5.37,43.29],
  [5.93,43.12],[6.64,43.27],[7.27,43.70],[7.50,43.79],[6.90,44.36],[7.02,44.85],
  [6.80,45.15],[6.98,45.65],[6.86,45.90],[6.15,46.20],[6.10,46.42],[5.97,46.75],
  [6.45,47.00],[7.00,47.35],[7.59,47.58],[7.80,48.60],[8.23,48.97],[7.95,49.03],
  [7.05,49.11],[6.36,49.47],[5.82,49.55],[4.85,49.79],[4.87,50.15],[4.20,49.95],
  [4.23,50.28],[3.66,50.35],[3.20,50.53],[2.87,50.70],[2.55,51.00]
];
const CORSE = [
  [9.35,43.02],[9.55,42.75],[9.53,42.35],[9.45,41.95],[9.40,41.60],[9.28,41.38],
  [8.80,41.55],[8.75,41.90],[8.60,42.25],[8.70,42.55],[9.00,42.70],[9.10,42.95]
];
const CADRE = { ouest: -5.4, est: 9.9, sud: 41.2, nord: 51.3 };
const COS = Math.cos((46.5 * Math.PI) / 180);

function projeter(L, H, marge){
  const dx = (CADRE.est - CADRE.ouest) * COS;
  const dy = CADRE.nord - CADRE.sud;
  const k = Math.min((L - marge * 2) / dx, (H - marge * 2) / dy);
  const gx = (L - dx * k) / 2, gy = (H - dy * k) / 2;
  return {
    x: (lon) => gx + (lon - CADRE.ouest) * COS * k,
    y: (lat) => gy + (CADRE.nord - lat) * k
  };
}

const trace = (pts, p) => "M" + pts.map(([lo, la]) =>
  `${p.x(lo).toFixed(1)} ${p.y(la).toFixed(1)}`).join(" L") + " Z";

export function carteFrance(points, { hauteur = 340, legende = "" } = {}){
  const L = 460, H = 440;
  const p = projeter(L, H, 16);
  const dessines = points.filter(x => x.lat != null && x.lon != null);
  return h(`<div class="carte">
    <svg viewBox="0 0 ${L} ${H}" style="height:${hauteur}px" role="img"
      aria-label="Carte de France, ${dessines.length} lieu${dessines.length > 1 ? "x" : ""}">
      <path d="${trace(HEXAGONE, p)}" fill="var(--forest-050)" stroke="var(--forest-100)"
        stroke-width="1.6" stroke-linejoin="round"/>
      <path d="${trace(CORSE, p)}" fill="var(--forest-050)" stroke="var(--forest-100)"
        stroke-width="1.6" stroke-linejoin="round"/>
      ${dessines.map(pt => `
        <g class="carte__pt ${pt.principal ? "carte__pt--moi" : ""}">
          <circle cx="${p.x(pt.lon).toFixed(1)}" cy="${p.y(pt.lat).toFixed(1)}"
            r="${pt.principal ? 10 : 7}" class="carte__halo"/>
          <circle cx="${p.x(pt.lon).toFixed(1)}" cy="${p.y(pt.lat).toFixed(1)}"
            r="${pt.principal ? 5 : 3.4}" class="carte__coeur"/>
          <title>${esc(pt.nom || "")}${pt.distance != null ? ` — ${pt.distance} km` : ""}</title>
        </g>`).join("")}
    </svg>
    ${legende ? `<p class="hint">${esc(legende)}</p>` : ""}
  </div>`);
}

/* ------------------------------------------------------------------ */
/* La forêt                                                            */
/* ------------------------------------------------------------------ */
/* Un compteur qu'on regarde au lieu de le lire. Chaque arbre dessiné vaut un
   nombre fixe d'arbres réellement plantés ; quand le total monte, un arbre de
   plus apparaît, toujours au même endroit — les positions viennent d'une suite
   de Halton, déterministe : l'arbre numéro 41 est au même pixel aujourd'hui et
   dans six mois. Rien ne s'anime au chargement : ce n'est pas une animation
   d'accueil, c'est l'état du compteur à l'instant où on ouvre la page. Le vrai
   chiffre est écrit dessous, en toutes lettres, parce qu'un dessin ne prouve
   rien tout seul. */
const MAX_ARBRES_DESSINES = 120;

function halton(i, base){
  let f = 1, r = 0, n = i;
  while (n > 0){ f /= base; r += f * (n % base); n = Math.floor(n / base); }
  return r;
}

/* Une échelle ronde, choisie pour que la forêt reste lisible : on ne dessine
   jamais plus de 120 arbres, et le pas est un nombre qu'on peut annoncer. */
function echelleForet(total){
  const paliers = [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000];
  return paliers.find(p => total / p <= MAX_ARBRES_DESSINES) || 50000;
}

/* Du vert profond au fond, du vert clair devant : c'est la perspective
   atmosphérique, et c'est ce qui donne une profondeur sans dégradé tape-à-l'œil. */
function teinteArbre(p){
  const m = p * p;                       /* l'avant-plan s'éclaircit tard */
  const r = Math.round(28 + 122 * m);
  const v = Math.round(74 + 122 * m);
  const b = Math.round(58 + 20 * m);
  return `rgb(${r},${v},${b})`;
}

/* x et y arrivent en nombres, et le restent : un `${x + r}` sur une chaîne
   colle deux nombres bout à bout et l'attribut d= devient illisible. */
function arbre(i, xb, yb, t){
  const x = Math.round(xb * 10) / 10, y = Math.round(yb * 10) / 10;
  const c = teinteArbre((t - 24) / 52);
  const troncH = t * 0.3;
  const tronc = `<path d="M${x} ${y} v${-troncH}" stroke="rgb(58,48,36)"
    stroke-width="${Math.max(1.1, t * 0.06)}" stroke-linecap="round" opacity=".55"/>`;
  const forme = i % 6;
  if (forme === 1 && t < 42){
    /* jeune pousse : une tige, deux feuilles, rien de plus */
    return tronc + `<path d="M${x} ${y - t * 0.28} q${-t * 0.2} ${-t * 0.06} ${-t * 0.03} ${-t * 0.24}
      q${t * 0.19} ${t * 0.06} ${t * 0.03} ${t * 0.24} Z" fill="${c}"/>
      <path d="M${x} ${y - t * 0.4} q${t * 0.2} ${-t * 0.06} ${t * 0.03} ${-t * 0.26}
      q${-t * 0.19} ${t * 0.07} ${-t * 0.03} ${t * 0.26} Z" fill="${c}" opacity=".82"/>`;
  }
  if (forme === 0 || forme === 3 || forme === 5){
    /* feuillu : une couronne large, une masse d'ombre décalée */
    const r = t * 0.31, base = y - troncH;
    return tronc + `<ellipse cx="${x}" cy="${base - r * 0.62}" rx="${r * 1.1}" ry="${r * 0.95}" fill="${c}"/>
      <ellipse cx="${x - r * 0.4}" cy="${base - r * 1.12}" rx="${r * 0.64}" ry="${r * 0.58}"
        fill="${c}" opacity=".88"/>
      <ellipse cx="${x + r * 0.48}" cy="${base - r * 1.02}" rx="${r * 0.5}" ry="${r * 0.46}"
        fill="${c}" opacity=".74"/>`;
  }
  /* conifère : trois étages, large en bas */
  const l = t * 0.34, base = y - troncH;
  return tronc + `<path d="M${x} ${base - t * 0.78} L${x - l * 0.62} ${base - t * 0.44}
      L${x + l * 0.62} ${base - t * 0.44} Z" fill="${c}"/>
    <path d="M${x} ${base - t * 0.58} L${x - l * 0.84} ${base - t * 0.2}
      L${x + l * 0.84} ${base - t * 0.2} Z" fill="${c}" opacity=".92"/>
    <path d="M${x} ${base - t * 0.34} L${x - l} ${base} L${x + l} ${base} Z" fill="${c}" opacity=".85"/>`;
}

export function foret(total, { unite = "arbres plantés", legende = true } = {}){
  const n = Math.max(0, Math.round(Number(total) || 0));
  const pas = echelleForet(n);
  const dessines = Math.min(MAX_ARBRES_DESSINES, Math.floor(n / pas));
  /* Le dessin garde son rapport : pas de hauteur en pixels imposée, donc pas de
     recadrage qui couperait la cime des arbres selon la largeur de l'écran. */
  const L = 1200, H = 336, sol = 314, ciel = 104;

  const plants = [];
  for (let i = 0; i < dessines; i++){
    const profondeur = halton(i + 1, 3);            /* 0 = horizon, 1 = premier plan */
    const x = 26 + halton(i + 1, 2) * (L - 52);
    const y = ciel + profondeur * (sol - ciel);
    plants.push({ i, x, y, taille: 24 + profondeur * 52, profondeur });
  }
  plants.sort((a, b) => a.profondeur - b.profondeur);   /* l'arrière se dessine d'abord */

  const el = h(`<figure class="foret">
    <svg class="foret__svg" viewBox="0 0 ${L} ${H}" preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="${nb(n)} ${esc(unite)}, représentés par ${dessines} arbre${dessines > 1 ? "s" : ""} dessiné${dessines > 1 ? "s" : ""}">
      <defs>
        <linearGradient id="foretCiel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#0B2620"/>
          <stop offset=".55" stop-color="#10352B"/>
          <stop offset="1" stop-color="#16412F"/>
        </linearGradient>
      </defs>
      <rect width="${L}" height="${H}" fill="url(#foretCiel)"/>
      <path d="M0 ${ciel + 4} C 150 ${ciel - 26}, 330 ${ciel + 14}, 500 ${ciel - 8}
        S 800 ${ciel + 16}, ${L} ${ciel - 14} L${L} ${H} L0 ${H} Z"
        fill="#123A2C" opacity=".55"/>
      ${plants.map(p => arbre(p.i, p.x, p.y, p.taille)).join("")}
      ${dessines === 0 ? `<text x="${L / 2}" y="${(ciel + sol) / 2}" text-anchor="middle"
        fill="var(--forest-100)" opacity=".55" font-size="18">Le terrain est prêt. Les premiers arbres arrivent.</text>` : ""}
    </svg>
    <figcaption class="foret__pied">
      <span class="foret__nb tnum">${nb(n)}</span>
      <span class="foret__unite">${esc(unite)}</span>
      ${legende && dessines > 0 ? `<span class="foret__echelle">1 arbre dessiné = ${nb(pas)} ${pas > 1 ? "arbres réels" : "arbre réel"}</span>` : ""}
    </figcaption>
  </figure>`);
  return el;
}
