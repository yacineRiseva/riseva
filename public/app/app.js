import { DB, BAREME, ETATS_MISSION, connecterSupabase } from "./data.js";
import { h, esc, nb, eur, dateFR, dateCourte, initiales, ICONS, toast, modal, kpi, spark, riviere } from "./ui.js";

/* ------------------------------------------------------------------ */
/* Session                                                             */
/* ------------------------------------------------------------------ */
const CLE = "riseva.session";
let session = null;
try { session = JSON.parse(localStorage.getItem(CLE) || "null"); } catch { session = null; }

const setSession = (uid) => {
  session = uid ? { uid } : null;
  uid ? localStorage.setItem(CLE, JSON.stringify(session)) : localStorage.removeItem(CLE);
};
const moi = () => (session ? DB.utilisateur(session.uid) : null);

/* ------------------------------------------------------------------ */
/* Menus par rôle                                                      */
/* ------------------------------------------------------------------ */
const MENUS = {
  entreprise_admin: [
    { groupe: "Saison", items: [
      ["tableau",    "Tableau de bord", "dashboard"],
      ["annonces",   "Annonces",        "megaphone"],
      ["missions",   "Nos missions",    "check"],
      ["classement", "Classement",      "trophy"]
    ]},
    { groupe: "Entreprise", items: [
      ["equipe",     "Équipe",       "users"],
      ["rapports",   "Rapports",     "report"],
      ["abonnement", "Abonnement",   "card"]
    ]}
  ],
  salarie: [
    { groupe: "Saison", items: [
      ["tableau",    "Tableau de bord", "dashboard"],
      ["annonces",   "Annonces",        "megaphone"],
      ["missions",   "Mes missions",    "check"],
      ["classement", "Classement",      "trophy"]
    ]}
  ],
  association: [
    { groupe: "Association", items: [
      ["tableau",   "Tableau de bord",   "dashboard"],
      ["mesannonces","Mes annonces",     "megaphone"],
      ["avalider",  "Missions à valider","check"],
      ["page",      "Ma page publique",  "heart"]
    ]}
  ],
  admin: [
    { groupe: "Réseau", items: [
      ["tableau",       "Tableau de bord", "dashboard"],
      ["entreprises",   "Entreprises",     "building"],
      ["assos",         "Associations",    "heart"],
      ["preinscriptions","Préinscriptions","users"]
    ]},
    { groupe: "Paramètres", items: [
      ["saison", "Saison et barème", "settings"]
    ]}
  ]
};

/* ------------------------------------------------------------------ */
/* Écran de connexion                                                  */
/* ------------------------------------------------------------------ */
function vueConnexion(){
  const comptes = [
    ["u2", "Espace entreprise",  "Claire Fontaine — Lafarge Ciments, administratrice"],
    ["u4", "Espace salarié",     "Sonia Delaunay — Lafarge Ciments"],
    ["u7", "Espace association", "Élise Tournier — Refuge des Quatre Vents"],
    ["u1", "Espace Riseva",      "Administration de la plateforme"]
  ];
  const el = h(`<div class="login">
    <aside class="login__aside">
      <svg class="login__river" viewBox="0 0 520 300" aria-hidden="true">
        <path d="M0 220 C 110 120, 190 270, 300 180 S 450 70, 520 150" fill="none" stroke="var(--brand)" stroke-width="4"/>
        <path d="M0 265 C 120 165, 200 305, 320 220 S 460 120, 520 195" fill="none" stroke="var(--brand)" stroke-width="4" opacity=".55"/>
      </svg>
      <img src="/brand/riseva-full-white.png" alt="Riseva">
      <div style="position:relative">
        <h2 style="color:#fff;max-width:16ch">Une saison. Des actes. Des chiffres.</h2>
        <p style="margin-top:var(--s5);color:rgba(255,255,255,.6);max-width:38ch">
          Les associations publient ce dont elles ont besoin, vos équipes y répondent,
          et le rapport s'écrit tout seul.</p>
      </div>
      <p style="font-size:var(--t-xs);color:rgba(255,255,255,.35)">© 2026 Riseva</p>
    </aside>
    <div class="login__form"><div class="login__box">
      <p class="eyebrow">Connexion</p>
      <h1 style="margin-top:var(--s4);font-size:var(--t-h2)">Bon retour</h1>
      <p class="muted" style="margin-top:var(--s3);font-size:var(--t-sm)">
        Environnement de démonstration : choisissez l'espace à visiter.</p>
      <div class="stack" style="--gap:var(--s3);margin-top:var(--s8)" id="roles"></div>
      <p class="hint" style="margin-top:var(--s6)">
        En production, l'authentification passe par Supabase (mot de passe ou lien magique)
        et chaque table est protégée par des politiques RLS.</p>
    </div></div>
  </div>`);
  const box = el.querySelector("#roles");
  comptes.forEach(([uid, titre, sous]) => {
    const b = h(`<button class="role">
      <span class="avatar">${initiales(DB.utilisateur(uid).nom)}</span>
      <span><b>${esc(titre)}</b><span>${esc(sous)}</span></span>
    </button>`);
    b.onclick = () => { setSession(uid); location.hash = "#/tableau"; rendre(); };
    box.appendChild(b);
  });
  return el;
}

/* ------------------------------------------------------------------ */
/* Coquille applicative                                                */
/* ------------------------------------------------------------------ */
function coquille(u, vue, titre, actions = ""){
  const route = (location.hash.split("/")[1] || "tableau");
  const menu = MENUS[u.role].map(g => `
    <div class="side__group">
      <p class="side__title">${esc(g.groupe)}</p>
      ${g.items.map(([id, label, ico]) => `
        <a class="side__link ${route === id ? "is-active" : ""}" href="#/${id}">
          ${ICONS[ico]}<span>${esc(label)}</span></a>`).join("")}
    </div>`).join("");

  const org = u.org ? (DB.entreprise(u.org) || DB.association(u.org)) : null;

  const el = h(`<div class="app">
    <aside class="side">
      <a class="side__brand" href="/"><img src="/brand/riseva-full-white.png" alt="Riseva"></a>
      ${menu}
      <div class="side__foot">
        <div class="row" style="gap:10px">
          <span class="avatar">${initiales(u.nom)}</span>
          <span style="min-width:0">
            <b style="display:block;color:#fff;font-size:var(--t-sm)">${esc(u.nom)}</b>
            <span style="font-size:var(--t-xs);color:rgba(255,255,255,.45);display:block;
              overflow:hidden;text-overflow:ellipsis">${esc(org ? org.nom : "Riseva")}</span>
          </span>
        </div>
        <a class="side__link" style="margin-top:var(--s3)" id="out">${ICONS.logout}<span>Se déconnecter</span></a>
      </div>
    </aside>
    <div class="main">
      <header class="topbar">
        <div class="row" style="gap:var(--s4)">
          <button class="btn btn--quiet btn--sm burger" id="burger" aria-label="Ouvrir le menu">
            <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
              stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
          <strong style="font-family:var(--font-display);font-size:var(--t-lg)">${esc(titre)}</strong>
          <span class="badge badge--brand"><span class="dot"></span>${esc(DB.saison().nom)}</span>
        </div>
        <div class="row">${actions}</div>
      </header>
      <div class="content" id="slot"></div>
    </div>
  </div>`);
  el.querySelector("#out").onclick = () => { setSession(null); location.hash = ""; rendre(); };
  const cote = el.querySelector(".side");
  el.querySelector("#burger").onclick = () => cote.classList.toggle("is-open");
  cote.addEventListener("click", (e) => { if (e.target.closest(".side__link")) cote.classList.remove("is-open"); });
  el.querySelector("#slot").appendChild(vue);
  return el;
}

/* ------------------------------------------------------------------ */
/* Vues entreprise                                                     */
/* ------------------------------------------------------------------ */
function tableauEntreprise(u){
  const eid = u.org;
  const e = DB.entreprise(eid);
  const rang = DB.rangDe(eid);
  const total = DB.entreprises().length;
  const ms = DB.missions({ entreprise: eid });
  const validees = ms.filter(m => m.etat === "validee" || m.etat === "validee_auto");
  const enCours = ms.filter(m => m.etat === "engagee" || m.etat === "a_valider");
  const salaries = DB.utilisateurs().filter(x => x.org === eid && x.role === "salarie" && x.actif);
  const engages = salaries.filter(x => (x.points || 0) > 0).length;
  const cl = DB.classement();
  const seuilTop = cl[Math.max(0, Math.ceil(total * 0.1) - 1)]?.points ?? 0;

  const el = h(`<div class="stack" style="--gap:var(--s5)">
    <div class="kpis">
      ${kpi("Points de la saison", nb(e.points), "+2 480 cette semaine", "up")}
      ${kpi("Rang", rang + "<sup style='font-size:.55em'>e</sup>", "sur " + total + " entreprises")}
      ${kpi("Missions validées", nb(validees.length), enCours.length + " en cours")}
      ${kpi("Salariés engagés", engages + " / " + salaries.length,
            Math.round((engages / Math.max(salaries.length,1)) * 100) + " % de l'effectif actif")}
    </div>

    <div class="two">
      <section class="card">
        <div class="between" style="margin-bottom:var(--s6)">
          <div><h3>Points par semaine</h3>
          <p class="muted" style="font-size:var(--t-sm);margin-top:4px">Douze dernières semaines</p></div>
          <span class="badge badge--ok"><span class="dot"></span>En progression</span>
        </div>
        ${riviere(DB.semaines(), { hauteur: 150, legendes: ["il y a 12 semaines", "aujourd\u2019hui"] })}
        <hr class="sep">
        <div class="three">
          ${Object.entries(BAREME).map(([k, b]) => {
            const pts = validees.filter(m => (DB.annonceDe(m) || {}).type === k)
                                .reduce((s, m) => s + m.points, 0);
            return `<div class="kpi">
              <span class="kpi__label">${esc(b.label)}</span>
              <span class="kpi__value" style="font-size:1.4rem">${nb(pts)}</span>
              <span class="kpi__delta">points</span></div>`;
          }).join("")}
        </div>
      </section>

      <div class="stack" style="--gap:var(--s5)">
        <section class="card">
          <h3>Objectif du trimestre</h3>
          <p class="muted" style="font-size:var(--t-sm);margin-top:6px">
            Il vous manque ${nb(Math.max(0, seuilTop - e.points))} points pour entrer
            dans les 10 % les plus actifs.</p>
          <div class="bar" style="margin-top:var(--s5)">
            <i style="width:${Math.min(100, (e.points / Math.max(seuilTop,1)) * 100)}%"></i></div>
          <div class="between" style="margin-top:var(--s3);font-size:var(--t-xs);color:var(--ink-400)">
            <span>${nb(e.points)}</span><span>${nb(seuilTop)}</span></div>
        </section>

        <section class="card">
          <div class="between" style="margin-bottom:var(--s4)">
            <h3>À faire</h3><a class="btn btn--quiet btn--sm" href="#/missions">Tout voir</a></div>
          <div class="stack" style="--gap:var(--s3)" id="todo"></div>
        </section>
      </div>
    </div>

    <section class="card">
      <div class="between" style="margin-bottom:var(--s5)">
        <h3>Annonces qui vous correspondent</h3>
        <a class="btn btn--ghost btn--sm" href="#/annonces">Voir les ${DB.annonces({ ouvertes:true }).length} annonces</a>
      </div>
      <div id="reco"></div>
    </section>
  </div>`);

  const todo = el.querySelector("#todo");
  const items = enCours.slice(0, 4);
  if (!items.length) todo.appendChild(h(`<p class="muted" style="font-size:var(--t-sm)">Rien en attente.</p>`));
  items.forEach(m => {
    const a = DB.annonceDe(m);
    todo.appendChild(h(`<div class="between" style="font-size:var(--t-sm)">
      <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.titre)}</span>
      <span class="badge ${ETATS_MISSION[m.etat].badge}">${ETATS_MISSION[m.etat].label}</span></div>`));
  });

  el.querySelector("#reco").appendChild(listeAnnonces(DB.annonces({ ouvertes:true }).slice(0, 3), u));
  return el;
}

function listeAnnonces(annonces, u){
  const box = h(`<div></div>`);
  if (!annonces.length){ box.appendChild(h(`<p class="empty">Aucune annonce ouverte pour le moment.</p>`)); return box; }
  annonces.forEach(a => {
    const asso = DB.association(a.asso);
    const b = BAREME[a.type];
    const pts = a.type === "don_financier" ? `${b.points} pt / 10 €` : `${nb(b.points)} pts`;
    const restant = a.type === "don_financier"
      ? `${eur(a.restant)} restants sur ${eur(a.quantite)}`
      : `${a.restant} place${a.restant > 1 ? "s" : ""} sur ${a.quantite}`;
    const card = h(`<article class="offer">
      <div>
        <div class="row" style="gap:var(--s3)">
          <span class="badge badge--brand">${esc(b.label)}</span>
          <span class="muted" style="font-size:var(--t-sm)">${esc(asso.nom)}</span>
        </div>
        <h4 style="margin-top:var(--s3)">${esc(a.titre)}</h4>
        <p>${esc(a.description)}</p>
        <div class="offer__meta">
          <span>${esc(a.lieu)}</span><span>·</span>
          <span>${dateFR(a.date)}</span><span>·</span>
          <span>${esc(restant)}</span>
        </div>
      </div>
      <div class="offer__side">
        <span class="offer__pts">${pts}</span>
        <button class="btn btn--ghost btn--sm">Se positionner</button>
      </div>
    </article>`);
    card.querySelector("button").onclick = () => ouvrirEngagement(a, u);
    box.appendChild(card);
  });
  return box;
}

function ouvrirEngagement(a, u){
  if (u.role === "association" || u.role === "admin"){
    toast("Seuls les salariés d'une entreprise abonnée peuvent se positionner.");
    return;
  }
  const b = BAREME[a.type];
  const financier = a.type === "don_financier";
  const corps = h(`<div class="stack" style="--gap:var(--s5)">
    <p class="muted" style="font-size:var(--t-sm)">${esc(a.description)}</p>
    <div class="field">
      <label>${financier ? "Montant du don" : "Nombre de " + b.unite + "s"}</label>
      <input class="input" type="number" min="1" max="${a.restant}"
        value="${financier ? Math.min(50, a.restant) : 1}" id="q">
      <p class="hint" id="calc"></p>
    </div>
    ${financier ? `<p class="hint">Le paiement se fait sur la page de l'association.
      L'argent ne transite pas par Riseva et le reçu fiscal vous est envoyé automatiquement.</p>` : ""}
    ${a.type === "benevolat_demi_journee" ? `<p class="hint">Riseva n'assure pas les missions de
      bénévolat. En cas d'incident, la relation reste entre votre entreprise et l'association.</p>` : ""}
  </div>`);
  const q = corps.querySelector("#q"), calc = corps.querySelector("#calc");
  const maj = () => { calc.textContent = `Soit ${nb(DB.pointsPour(a.type, Number(q.value) || 0))} points pour votre entreprise.`; };
  q.oninput = maj; maj();

  modal(a.titre, corps, [
    { label: "Annuler" },
    { label: "Confirmer", classe: "btn--primary", onClick: () => {
        try {
          DB.engager({ annonce: a.id, entreprise: u.org, salarie: u.id, quantite: Number(q.value) });
          toast("Vous êtes positionné. L'association sera prévenue.");
          rendre();
        } catch (err){ toast(err.message); return false; }
      }}
  ]);
}

function vueAnnonces(u){
  const el = h(`<div class="stack" style="--gap:var(--s5)">
    <div class="tabs" id="tabs">
      <div class="tab is-active" data-t="">Toutes</div>
      ${Object.entries(BAREME).map(([k, b]) => `<div class="tab" data-t="${k}">${esc(b.label)}</div>`).join("")}
    </div>
    <section class="card" id="liste"></section>
  </div>`);
  const dessine = (type) => {
    const l = el.querySelector("#liste");
    l.innerHTML = "";
    l.appendChild(listeAnnonces(DB.annonces({ ouvertes:true, type: type || undefined }), u));
  };
  el.querySelectorAll(".tab").forEach(t => t.onclick = () => {
    el.querySelectorAll(".tab").forEach(x => x.classList.remove("is-active"));
    t.classList.add("is-active"); dessine(t.dataset.t);
  });
  dessine("");
  return el;
}

function vueMissions(u){
  const filtre = u.role === "salarie" ? { salarie: u.id } : { entreprise: u.org };
  const ms = DB.missions(filtre);
  const el = h(`<section class="card">
    <table class="table"><thead><tr>
      <th>Mission</th><th>Association</th><th>Salarié</th><th>Date</th>
      <th>Points</th><th>État</th><th></th></tr></thead><tbody></tbody></table>
  </section>`);
  const tb = el.querySelector("tbody");
  if (!ms.length) tb.appendChild(h(`<tr><td colspan="7" class="empty">Aucune mission pour l'instant.</td></tr>`));
  ms.forEach(m => {
    const a = DB.annonceDe(m), asso = DB.association(a.asso), s = DB.utilisateur(m.salarie);
    const tr = h(`<tr>
      <td><strong>${esc(a.titre)}</strong><br><span class="muted" style="font-size:var(--t-xs)">${esc(BAREME[a.type].label)}</span></td>
      <td class="muted">${esc(asso.nom)}</td>
      <td class="muted">${esc(s ? s.nom : "—")}</td>
      <td class="muted tnum">${dateCourte(m.date)}</td>
      <td class="tnum"><strong>${nb(m.points)}</strong></td>
      <td><span class="badge ${ETATS_MISSION[m.etat].badge}">${ETATS_MISSION[m.etat].label}</span></td>
      <td style="text-align:right"></td></tr>`);
    if (m.etat === "engagee"){
      const b = h(`<button class="btn btn--ghost btn--sm">Déclarer faite</button>`);
      b.onclick = () => { DB.declarerFaite(m.id); toast("L'association va recevoir le mail de confirmation."); rendre(); };
      tr.lastElementChild.appendChild(b);
    }
    tb.appendChild(tr);
  });
  return el;
}

function vueClassement(u){
  const cl = DB.classement();
  const seuil = Math.ceil(cl.length * 0.1);
  const max = cl[0].points;
  const el = h(`<div class="two">
    <section class="card">
      <div class="between" style="margin-bottom:var(--s5)">
        <div><h3>Classement de la saison</h3>
        <p class="muted" style="font-size:var(--t-sm);margin-top:4px">Recalculé chaque lundi matin</p></div>
        <span class="badge">Semaine 34</span>
      </div>
      <table class="table table--rank"><tbody></tbody></table>
    </section>
    <section class="card">
      <h3>Comment on marque</h3>
      <div class="stack" style="--gap:var(--s5);margin-top:var(--s5)">
        ${Object.entries(BAREME).map(([k, b]) => `
          <div class="row" style="align-items:flex-start;gap:var(--s4)">
            <span style="color:var(--brand-800)">${ICONS[b.icone]}</span>
            <div><strong>${esc(b.label)}</strong>
            <p class="muted" style="font-size:var(--t-sm);margin-top:2px">
              ${b.points} point${b.points > 1 ? "s" : ""} par ${esc(b.unite)}</p></div>
          </div>`).join("")}
      </div>
      <hr class="sep">
      <p class="muted" style="font-size:var(--t-sm)">
        Le barème est fixé par Riseva, identique pour toutes les associations et toutes les
        entreprises. Il sera recalibré à la fin de la première saison.</p>
    </section>
  </div>`);
  const tb = el.querySelector("tbody");
  cl.forEach(e => {
    const moiOrg = e.id === u.org;
    tb.appendChild(h(`<tr style="${moiOrg ? "background:var(--brand-050)" : ""}">
      <td>${e.rang}</td>
      <td><strong>${esc(e.nom)}</strong>${moiOrg ? ` <span class="muted">(vous)</span>` : ""}${e.rang <= seuil ? ` <span class="badge badge--brand" style="height:20px;margin-left:6px">top 10 %</span>` : ""}
        <br><span class="muted" style="font-size:var(--t-xs)">${esc(e.secteur)} · ${esc(e.ville)} · ${e.effectif} salariés</span></td>
      <td style="width:34%"><div class="bar"><i style="width:${(e.points / max) * 100}%"></i></div></td>
      <td class="tnum" style="text-align:right"><strong>${nb(e.points)}</strong></td></tr>`));
  });
  return el;
}

function vueEquipe(u){
  const eid = u.org;
  const gens = DB.utilisateurs().filter(x => x.org === eid && x.role === "salarie");
  const el = h(`<section class="card">
    <div class="between" style="margin-bottom:var(--s5)">
      <div><h3>Salariés</h3>
      <p class="muted" style="font-size:var(--t-sm);margin-top:4px">
        ${gens.filter(g => g.actif).length} comptes actifs sur ${gens.length}</p></div>
      <button class="btn btn--primary btn--sm" id="add">${ICONS.plus} Inviter</button>
    </div>
    <table class="table"><thead><tr>
      <th>Nom</th><th>Email</th><th>Points</th><th>État</th><th></th></tr></thead><tbody></tbody></table>
  </section>`);
  const tb = el.querySelector("tbody");
  gens.forEach(g => {
    const tr = h(`<tr>
      <td class="row" style="gap:10px"><span class="avatar">${initiales(g.nom)}</span><strong>${esc(g.nom)}</strong></td>
      <td class="muted">${esc(g.email)}</td>
      <td class="tnum">${nb(g.points || 0)}</td>
      <td><span class="badge ${g.actif ? "badge--ok" : ""}">${g.actif ? "Actif" : "Désactivé"}</span></td>
      <td style="text-align:right"></td></tr>`);
    if (g.actif){
      const b = h(`<button class="btn btn--quiet btn--sm">Désactiver</button>`);
      b.onclick = () => modal("Désactiver ce compte",
        `<p class="muted">Le compte de ${esc(g.nom)} sera fermé immédiatement.
         Les points déjà validés restent acquis à l'entreprise.</p>`,
        [{ label:"Annuler" },
         { label:"Désactiver", classe:"btn--primary", onClick: () => {
             DB.desactiverSalarie(g.id); toast("Compte désactivé."); rendre(); }}]);
      tr.lastElementChild.appendChild(b);
    }
    tb.appendChild(tr);
  });
  el.querySelector("#add").onclick = () => {
    const corps = h(`<div class="stack" style="--gap:var(--s4)">
      <div class="field"><label>Nom et prénom</label><input class="input" id="n" placeholder="Camille Roux"></div>
      <div class="field"><label>Email professionnel</label><input class="input" id="e" type="email" placeholder="camille@entreprise.fr"></div>
      <p class="hint">Un lien d'activation lui sera envoyé. Aucun mot de passe ne transite par Riseva.</p>
    </div>`);
    modal("Inviter un salarié", corps, [
      { label:"Annuler" },
      { label:"Envoyer l'invitation", classe:"btn--primary", onClick: () => {
          const n = corps.querySelector("#n").value.trim(), e = corps.querySelector("#e").value.trim();
          if (!n || !e){ toast("Nom et email sont nécessaires."); return false; }
          DB.inviterSalarie(u.org, n, e); toast("Invitation envoyée."); rendre();
        }}
    ]);
  };
  return el;
}

function vueRapports(u){
  const r = DB.rapport(u.org, "annuel");
  const maxT = Math.max(...r.trimestres.map(t => t.points), 1);
  const el = h(`<div class="stack" style="--gap:var(--s5)">
    <div class="tabs" id="pt">
      <div class="tab is-active" data-p="annuel">Rapport annuel</div>
      ${r.trimestres.map(t => `<div class="tab" data-p="${t.nom}">${t.nom}</div>`).join("")}
    </div>
    <section class="card" style="padding:var(--s10)">
      <div class="between" style="align-items:flex-start">
        <div>
          <p class="eyebrow" id="rTitre">Rapport annuel</p>
          <h2 style="margin-top:var(--s3)">${esc(r.entreprise.nom)} — ${esc(r.saison.nom)}</h2>
          <p class="muted" style="margin-top:var(--s3);font-size:var(--t-sm)">
            Généré automatiquement le ${dateFR(new Date().toISOString())} à partir des missions validées.</p>
          <p class="muted" style="margin-top:6px;font-size:var(--t-sm)" id="rNote">Cumul de la saison, tous trimestres confondus.</p>
        </div>
        <button class="btn btn--ghost btn--sm" id="pdf">Exporter en PDF</button>
      </div>
      <hr class="sep">
      <div class="kpis">
        <div class="card kpi"><span class="kpi__label">Points</span>
          <span class="kpi__value" id="rPoints">${nb(r.points)}</span></div>
        ${kpi("Rang final", r.rang + "<sup style='font-size:.55em'>e</sup>", "sur " + r.total)}
        ${kpi("Salariés engagés", r.salariesEngages + " / " + r.salariesTotal)}
        ${kpi("Associations soutenues", nb(r.associations))}
      </div>
      <hr class="sep">
      <div class="two">
        <div>
          <h3>Évolution par trimestre</h3>
          <div class="stack" style="--gap:var(--s4);margin-top:var(--s5)">
            ${r.trimestres.map(t => `
              <div><div class="between" style="font-size:var(--t-sm);margin-bottom:6px">
                <span class="muted">${esc(t.nom)}</span><span class="tnum">${nb(t.points)} pts</span></div>
                <div class="bar"><i style="width:${(t.points / maxT) * 100}%"></i></div></div>`).join("")}
          </div>
        </div>
        <div>
          <h3>Répartition</h3>
          <div class="stack" style="--gap:var(--s4);margin-top:var(--s5)">
            ${Object.entries(BAREME).map(([k, b]) => {
              const p = r.parType[k] || 0;
              const pct = r.points ? Math.round((p / r.points) * 100) : 0;
              return `<div><div class="between" style="font-size:var(--t-sm);margin-bottom:6px">
                <span class="muted">${esc(b.label)}</span><span class="tnum">${pct} %</span></div>
                <div class="bar"><i style="width:${pct}%"></i></div></div>`;
            }).join("")}
          </div>
          <hr class="sep">
          <p class="muted" style="font-size:var(--t-sm)">
            ${nb(r.demiJournees)} demi-journées de bénévolat et ${eur(r.euros)} de dons,
            versés directement aux associations.</p>
        </div>
      </div>
      <hr class="sep">
      <h3>Impact du réseau</h3>
      <p class="muted" style="margin-top:var(--s3);max-width:70ch;font-size:var(--t-sm)">
        Ce volet est commun à toutes les entreprises de la saison. Il rend compte de ce que les
        associations du réseau ont accompli grâce à l'ensemble des contributions, sans attribuer
        un résultat précis à une entreprise en particulier.</p>
    </section>
  </div>`);
  el.querySelector("#pdf").onclick = () => { toast("Ouverture de l'aperçu d'impression."); setTimeout(() => window.print(), 400); };
  el.querySelectorAll("#pt .tab").forEach(t => t.onclick = () => {
    el.querySelectorAll("#pt .tab").forEach(x => x.classList.remove("is-active"));
    t.classList.add("is-active");
    const p = t.dataset.p;
    const tri = r.trimestres.find(x => x.nom === p);
    el.querySelector("#rTitre").textContent = p === "annuel" ? "Rapport annuel" : "Rapport du trimestre " + p;
    el.querySelector("#rPoints").textContent = nb(tri ? tri.points : r.points);
    el.querySelector("#rNote").textContent = p === "annuel"
      ? "Cumul de la saison, tous trimestres confondus."
      : "Périmètre limité au trimestre " + p + ". Le rapport trimestriel est volontairement plus court.";
  });
  return el;
}

function vueAbonnement(u){
  const s = DB.saison();
  return h(`<div class="two">
    <section class="card" style="padding:var(--s8)">
      <div class="between"><h3>Abonnement ${esc(s.nom)}</h3>
        <span class="badge badge--ok"><span class="dot"></span>Actif</span></div>
      <hr class="sep">
      <div class="stack" style="--gap:var(--s4);font-size:var(--t-sm)">
        <div class="between"><span class="muted">Période</span>
          <span>${dateFR(s.debut)} — ${dateFR(s.fin)}</span></div>
        <div class="between"><span class="muted">Acompte versé</span><span>${eur(s.acompte)}</span></div>
        <div class="between"><span class="muted">Solde à régler</span>
          <span>${eur(s.prix_min - s.acompte)} à ${eur(s.prix_max - s.acompte)} HT</span></div>
        <div class="between"><span class="muted">Salariés couverts</span><span>illimité</span></div>
      </div>
      <hr class="sep">
      <p class="muted" style="font-size:var(--t-sm)">
        L'acompte de ${eur(s.acompte)} est remboursé intégralement si la saison ne démarre pas.
        Aucune commission n'est prélevée sur les dons faits par vos salariés.</p>
    </section>
    <section class="card">
      <h3>Factures</h3>
      <div class="stack" style="--gap:var(--s4);margin-top:var(--s5);font-size:var(--t-sm)">
        <div class="between"><span>Acompte ${esc(s.nom)}</span>
          <span class="row"><span class="tnum muted">${eur(s.acompte)}</span>
          <span class="badge badge--ok">Payée</span></span></div>
        <div class="between"><span>Solde ${esc(s.nom)}</span>
          <span class="row"><span class="tnum muted">à venir</span>
          <span class="badge">À l'ouverture</span></span></div>
      </div>
    </section>
  </div>`);
}

/* ------------------------------------------------------------------ */
/* Vues association                                                    */
/* ------------------------------------------------------------------ */
function tableauAsso(u){
  const aid = u.org;
  const asso = DB.association(aid);
  const annonces = DB.annonces({ asso: aid });
  const ms = DB.missions({ asso: aid });
  const aValider = ms.filter(m => m.etat === "a_valider");
  const el = h(`<div class="stack" style="--gap:var(--s5)">
    <div class="kpis">
      ${kpi("Annonces ouvertes", nb(annonces.filter(a => a.etat === "ouverte").length))}
      ${kpi("Missions engagées", nb(ms.filter(m => m.etat === "engagee").length))}
      ${kpi("À valider", nb(aValider.length), aValider.length ? "action attendue" : "rien en attente",
            aValider.length ? "down" : "")}
      ${kpi("Entreprises mobilisées", nb(new Set(ms.map(m => m.entreprise)).size))}
    </div>
    <div class="two">
      <section class="card">
        <div class="between" style="margin-bottom:var(--s5)">
          <h3>Vos annonces</h3>
          <button class="btn btn--primary btn--sm" id="new">${ICONS.plus} Publier</button></div>
        <div id="l"></div>
      </section>
      <section class="card">
        <h3>Votre fiche</h3>
        <div class="stack" style="--gap:var(--s3);margin-top:var(--s5);font-size:var(--t-sm)">
          <div class="between"><span class="muted">Association</span><strong>${esc(asso.nom)}</strong></div>
          <div class="between"><span class="muted">Cause</span><span>${esc(asso.cause)}</span></div>
          <div class="between"><span class="muted">Ville</span><span>${esc(asso.ville)}</span></div>
          <div class="between"><span class="muted">Statut</span>
            <span class="badge ${asso.valide ? "badge--ok" : "badge--warn"}">${asso.valide ? "Validée" : "En attente"}</span></div>
        </div>
        <hr class="sep">
        <p class="muted" style="font-size:var(--t-sm)">
          Riseva ne prélève rien sur vos dons et ne vous demande aucune intégration technique.</p>
        <a class="btn btn--ghost btn--block" style="margin-top:var(--s5)" href="/asso.html?id=${aid}">Voir ma page publique</a>
      </section>
    </div>
  </div>`);
  el.querySelector("#l").appendChild(tableAnnoncesAsso(annonces));
  el.querySelector("#new").onclick = () => formAnnonce(u);
  return el;
}

function tableAnnoncesAsso(annonces){
  const t = h(`<table class="table"><thead><tr>
    <th>Annonce</th><th>Format</th><th>Reste</th><th>État</th></tr></thead><tbody></tbody></table>`);
  const tb = t.querySelector("tbody");
  if (!annonces.length) tb.appendChild(h(`<tr><td colspan="4" class="empty">Aucune annonce publiée.</td></tr>`));
  annonces.forEach(a => tb.appendChild(h(`<tr>
    <td><strong>${esc(a.titre)}</strong><br><span class="muted" style="font-size:var(--t-xs)">${dateFR(a.date)}</span></td>
    <td class="muted">${esc(BAREME[a.type].label)}</td>
    <td class="tnum">${a.type === "don_financier" ? eur(a.restant) : a.restant + " / " + a.quantite}</td>
    <td><span class="badge ${a.etat === "ouverte" ? "badge--ok" : ""}">${a.etat === "ouverte" ? "Ouverte" : "Close"}</span></td>
  </tr>`)));
  return t;
}

function formAnnonce(u){
  const corps = h(`<div class="stack" style="--gap:var(--s4)">
    <div class="field"><label>Format</label>
      <select class="select" id="type">
        ${Object.entries(BAREME).map(([k, b]) =>
          `<option value="${k}">${esc(b.label)} — ${b.points} pt${b.points>1?"s":""} par ${esc(b.unite)}</option>`).join("")}
      </select>
      <p class="hint">Le nombre de points est fixé par Riseva, il ne se modifie pas.</p></div>
    <div class="field"><label>Titre</label><input class="input" id="titre" placeholder="Plantation de 400 arbres"></div>
    <div class="field"><label>Description</label>
      <textarea class="textarea" id="desc" placeholder="Dites concrètement ce dont vous avez besoin, le lieu, l'horaire et ce que vous fournissez."></textarea></div>
    <div class="row" style="gap:var(--s4)">
      <div class="field" style="flex:1"><label>Quantité attendue</label><input class="input" id="q" type="number" min="1" value="6"></div>
      <div class="field" style="flex:1"><label>Date</label><input class="input" id="d" type="date"></div>
    </div>
    <div class="field"><label>Lieu</label><input class="input" id="lieu" placeholder="Ville ou adresse"></div>
  </div>`);
  corps.querySelector("#d").value = new Date(Date.now() + 12 * 864e5).toISOString().slice(0, 10);
  modal("Publier une annonce", corps, [
    { label:"Annuler" },
    { label:"Publier", classe:"btn--primary", onClick: () => {
        const v = (id) => corps.querySelector("#" + id).value.trim();
        if (!v("titre") || !v("desc")){ toast("Le titre et la description sont nécessaires."); return false; }
        DB.creerAnnonce({ asso: u.org, type: v("type"), titre: v("titre"), description: v("desc"),
          quantite: Number(v("q")) || 1, date: v("d"), lieu: v("lieu") || DB.association(u.org).ville });
        toast("Annonce publiée."); rendre();
      }}
  ]);
}

function vueAValider(u){
  const ms = DB.missions({ asso: u.org }).filter(m => m.etat === "a_valider" || m.etat === "engagee");
  const el = h(`<section class="card">
    <div class="between" style="margin-bottom:var(--s5)">
      <div><h3>Missions à confirmer</h3>
      <p class="muted" style="font-size:var(--t-sm);margin-top:4px">
        Sans réponse de votre part sous quatorze jours, la mission est comptée comme réalisée.</p></div>
    </div>
    <table class="table"><thead><tr>
      <th>Mission</th><th>Entreprise</th><th>Salarié</th><th>Date</th><th>État</th><th></th>
    </tr></thead><tbody></tbody></table></section>`);
  const tb = el.querySelector("tbody");
  if (!ms.length) tb.appendChild(h(`<tr><td colspan="6" class="empty">Rien à confirmer. Tout est à jour.</td></tr>`));
  ms.forEach(m => {
    const a = DB.annonceDe(m), e = DB.entreprise(m.entreprise), s = DB.utilisateur(m.salarie);
    const tr = h(`<tr>
      <td><strong>${esc(a.titre)}</strong><br><span class="muted" style="font-size:var(--t-xs)">${esc(BAREME[a.type].label)} · ${nb(m.points)} pts</span></td>
      <td class="muted">${esc(e ? e.nom : "—")}</td>
      <td class="muted">${esc(s ? s.nom : "—")}</td>
      <td class="muted tnum">${dateCourte(m.date)}</td>
      <td><span class="badge ${ETATS_MISSION[m.etat].badge}">${ETATS_MISSION[m.etat].label}</span></td>
      <td style="text-align:right"></td></tr>`);
    if (m.etat === "a_valider"){
      const ok = h(`<button class="btn btn--brand btn--sm">Confirmer</button>`);
      const no = h(`<button class="btn btn--quiet btn--sm">Refuser</button>`);
      ok.onclick = () => { DB.validerMission(m.id, true);  toast("Mission confirmée, points crédités."); rendre(); };
      no.onclick = () => { DB.validerMission(m.id, false); toast("Mission refusée."); rendre(); };
      tr.lastElementChild.append(no, ok);
    }
    tb.appendChild(tr);
  });
  return el;
}

function vuePageAsso(u){
  const a = DB.association(u.org);
  return h(`<div class="two">
    <section class="card" style="padding:var(--s8)">
      <p class="eyebrow">Page publique</p>
      <h2 style="margin-top:var(--s3)">${esc(a.nom)}</h2>
      <p class="muted" style="margin-top:var(--s4)">${esc(a.resume)}</p>
      <hr class="sep">
      <div class="field"><label>Présentation affichée</label>
        <textarea class="textarea">${esc(a.resume)}</textarea></div>
      <div class="row" style="margin-top:var(--s5);gap:var(--s3)">
        <button class="btn btn--primary btn--sm">Enregistrer</button>
        <a class="btn btn--ghost btn--sm" href="/asso.html?id=${a.id}">Prévisualiser</a>
      </div>
    </section>
    <section class="card">
      <h3>Le don</h3>
      <p class="muted" style="font-size:var(--t-sm);margin-top:var(--s4)">
        Le formulaire est hébergé sur Riseva mais l'encaissement se fait chez vous. Nous n'avons
        aucun accès aux fonds. Le reçu fiscal est émis automatiquement à votre nom.</p>
      <hr class="sep">
      <div class="stack" style="--gap:var(--s3);font-size:var(--t-sm)">
        <div class="between"><span class="muted">Prestataire</span><span class="badge badge--warn">HelloAsso, en attente</span></div>
        <div class="between"><span class="muted">Commission Riseva</span><strong>0 %</strong></div>
        <div class="between"><span class="muted">Reçu fiscal</span><span>automatique</span></div>
      </div>
    </section>
  </div>`);
}

/* ------------------------------------------------------------------ */
/* Vues admin                                                          */
/* ------------------------------------------------------------------ */
function tableauAdmin(){
  const es = DB.entreprises(), as = DB.associations(), ps = DB.preinscriptions();
  const el = h(`<div class="stack" style="--gap:var(--s5)">
    <div class="kpis">
      ${kpi("Entreprises", nb(es.length), "saison en cours")}
      ${kpi("Associations", nb(as.filter(a => a.valide).length), as.filter(a => !a.valide).length + " en attente")}
      ${kpi("Préinscriptions", nb(ps.length), ps.filter(p => p.etat === "confirmee").length + " confirmées")}
      ${kpi("Points du réseau", nb(es.reduce((s, e) => s + e.points, 0)))}
    </div>
    <div class="two">
      <section class="card">
        <h3>Activité du réseau</h3>
        <div style="margin-top:var(--s6)">${riviere(DB.semaines(), { hauteur: 150, legendes: ["il y a 12 semaines", "aujourd\u2019hui"] })}</div>
      </section>
      <section class="card">
        <h3>À traiter</h3>
        <div class="stack" style="--gap:var(--s3);margin-top:var(--s5);font-size:var(--t-sm)">
          ${as.filter(a => !a.valide).map(a =>
            `<div class="between"><span>${esc(a.nom)}</span><span class="badge badge--warn">à valider</span></div>`).join("")
            || `<p class="muted">Rien en attente.</p>`}
        </div>
      </section>
    </div>
  </div>`);
  return el;
}

function vueAdminEntreprises(){
  const el = h(`<section class="card"><table class="table"><thead><tr>
    <th>Entreprise</th><th>Secteur</th><th>Effectif</th><th>Points</th><th>Rang</th>
  </tr></thead><tbody></tbody></table></section>`);
  const tb = el.querySelector("tbody");
  DB.classement().forEach(e => tb.appendChild(h(`<tr>
    <td><strong>${esc(e.nom)}</strong><br><span class="muted" style="font-size:var(--t-xs)">${esc(e.ville)}</span></td>
    <td class="muted">${esc(e.secteur)}</td>
    <td class="tnum">${nb(e.effectif)}</td>
    <td class="tnum"><strong>${nb(e.points)}</strong></td>
    <td class="tnum">${e.rang}</td></tr>`)));
  return el;
}

function vueAdminAssos(){
  const el = h(`<section class="card"><table class="table"><thead><tr>
    <th>Association</th><th>Cause</th><th>Ville</th><th>Annonces</th><th>État</th><th></th>
  </tr></thead><tbody></tbody></table></section>`);
  const tb = el.querySelector("tbody");
  DB.associations().forEach(a => {
    const tr = h(`<tr>
      <td><strong>${esc(a.nom)}</strong><br><span class="muted" style="font-size:var(--t-xs)">${esc(a.resume)}</span></td>
      <td class="muted">${esc(a.cause)}</td>
      <td class="muted">${esc(a.ville)}</td>
      <td class="tnum">${DB.annonces({ asso: a.id }).length}</td>
      <td><span class="badge ${a.valide ? "badge--ok" : "badge--warn"}">${a.valide ? "Validée" : "En attente"}</span></td>
      <td style="text-align:right"></td></tr>`);
    if (!a.valide){
      const b = h(`<button class="btn btn--brand btn--sm">Valider</button>`);
      b.onclick = () => { DB.validerAssociation(a.id); toast("Association validée."); rendre(); };
      tr.lastElementChild.appendChild(b);
    }
    tb.appendChild(tr);
  });
  return el;
}

function vueAdminPreinscriptions(){
  const etats = { preinscrite:["Préinscrite",""], relancee:["Relancée","badge--warn"], confirmee:["Confirmée","badge--ok"] };
  const el = h(`<section class="card"><table class="table"><thead><tr>
    <th>Entreprise</th><th>Contact</th><th>Effectif</th><th>Date</th><th>État</th>
  </tr></thead><tbody></tbody></table></section>`);
  const tb = el.querySelector("tbody");
  DB.preinscriptions().forEach(p => tb.appendChild(h(`<tr>
    <td><strong>${esc(p.entreprise)}</strong></td>
    <td class="muted">${esc(p.contact)}</td>
    <td class="tnum">${nb(p.effectif)}</td>
    <td class="muted tnum">${dateCourte(p.date)}</td>
    <td><span class="badge ${etats[p.etat][1]}">${etats[p.etat][0]}</span></td></tr>`)));
  return el;
}

function vueAdminSaison(){
  const s = DB.saison();
  return h(`<div class="two">
    <section class="card" style="padding:var(--s8)">
      <h3>${esc(s.nom)}</h3>
      <div class="stack" style="--gap:var(--s4);margin-top:var(--s6)">
        <div class="row" style="gap:var(--s4)">
          <div class="field" style="flex:1"><label>Début</label><input class="input" type="date" value="${s.debut}"></div>
          <div class="field" style="flex:1"><label>Fin</label><input class="input" type="date" value="${s.fin}"></div>
        </div>
        <div class="row" style="gap:var(--s4)">
          <div class="field" style="flex:1"><label>Prix plancher HT</label><input class="input" type="number" value="${s.prix_min}"></div>
          <div class="field" style="flex:1"><label>Prix plafond HT</label><input class="input" type="number" value="${s.prix_max}"></div>
        </div>
        <div class="field"><label>Acompte à la confirmation</label><input class="input" type="number" value="${s.acompte}">
          <p class="hint">Remboursé intégralement si la saison ne démarre pas.</p></div>
      </div>
      <button class="btn btn--primary" style="margin-top:var(--s6)">Enregistrer la saison</button>
    </section>
    <section class="card">
      <h3>Barème</h3>
      <p class="muted" style="font-size:var(--t-sm);margin-top:var(--s3)">
        Versionné par saison. Un changement en cours de saison fausserait le classement,
        il ne s'applique donc qu'à la saison suivante.</p>
      <div class="stack" style="--gap:var(--s4);margin-top:var(--s6)">
        ${Object.entries(BAREME).map(([k, b]) => `
          <div class="field"><label>${esc(b.label)} — par ${esc(b.unite)}</label>
            <input class="input" type="number" value="${b.points}"></div>`).join("")}
      </div>
    </section>
  </div>`);
}

/* ------------------------------------------------------------------ */
/* Routeur                                                             */
/* ------------------------------------------------------------------ */
const ROUTES = {
  entreprise_admin: {
    tableau:   [tableauEntreprise, "Tableau de bord"],
    annonces:  [vueAnnonces,       "Annonces"],
    missions:  [vueMissions,       "Nos missions"],
    classement:[vueClassement,     "Classement"],
    equipe:    [vueEquipe,         "Équipe"],
    rapports:  [vueRapports,       "Rapports"],
    abonnement:[vueAbonnement,     "Abonnement"]
  },
  salarie: {
    tableau:   [tableauEntreprise, "Tableau de bord"],
    annonces:  [vueAnnonces,       "Annonces"],
    missions:  [vueMissions,       "Mes missions"],
    classement:[vueClassement,     "Classement"]
  },
  association: {
    tableau:    [tableauAsso,  "Tableau de bord"],
    mesannonces:[(u) => { const d = h(`<section class="card"></section>`);
                          d.appendChild(tableAnnoncesAsso(DB.annonces({ asso: u.org }))); return d; }, "Mes annonces"],
    avalider:   [vueAValider,  "Missions à valider"],
    page:       [vuePageAsso,  "Ma page publique"]
  },
  admin: {
    tableau:        [tableauAdmin,             "Tableau de bord"],
    entreprises:    [vueAdminEntreprises,      "Entreprises"],
    assos:          [vueAdminAssos,            "Associations"],
    preinscriptions:[vueAdminPreinscriptions,  "Préinscriptions"],
    saison:         [vueAdminSaison,           "Saison et barème"]
  }
};

function rendre(){
  const root = document.getElementById("root");
  root.innerHTML = "";
  const u = moi();
  if (!u){ root.appendChild(vueConnexion()); return; }
  const table = ROUTES[u.role];
  const nom = (location.hash.split("/")[1] || "tableau");
  const [fn, titre] = table[nom] || table.tableau;
  let actions = "";
  if (u.role === "association" && nom === "mesannonces")
    actions = `<button class="btn btn--primary btn--sm" id="np">Publier une annonce</button>`;
  const el = coquille(u, fn(u), titre, actions);
  root.appendChild(el);
  el.querySelector("#np")?.addEventListener("click", () => formAnnonce(u));
}

window.addEventListener("hashchange", rendre);

/* Branche Supabase si window.RISEVA_CONFIG existe (défini dans /app/config.js),
   sinon l'application reste en mode démonstration. */
(async () => {
  if (window.RISEVA_CONFIG) { try { await connecterSupabase(window.RISEVA_CONFIG); } catch (e) { console.warn(e); } }
  rendre();
})();
