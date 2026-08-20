import { DB, BAREME, ETATS_MISSION, CATEGORIES, PLAFOND_PAR_FORMAT, connecterSupabase } from "./data.js";
import { h, esc, nb, eur, dateFR, dateCourte, initiales, rangFR, ICONS, toast, modal, kpi, spark, riviere, versCSV, vide } from "./ui.js";

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
    ]},
    { groupe: "Moi", items: [
      ["activite", "Mon activité", "users"]
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
      ["saison",  "Saison et barème", "settings"],
      ["journal", "Journal des envois", "report"]
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
    <aside class="login__aside grain">
      <svg class="login__river" viewBox="0 0 520 300" aria-hidden="true">
        <path d="M0 220 C 110 120, 190 270, 300 180 S 450 70, 520 150" fill="none" stroke="var(--lime)" stroke-width="4"/>
        <path d="M0 265 C 120 165, 200 305, 320 220 S 460 120, 520 195" fill="none" stroke="var(--brand)" stroke-width="4" opacity=".55"/>
      </svg>
      <img src="/brand/riseva-full-white.png" alt="Riseva">
      <div style="position:relative">
        <h2 style="color:var(--paper);max-width:16ch">Une saison. Des actes. Des chiffres.</h2>
        <p style="margin-top:var(--s5);color:rgba(223,230,208,.62);max-width:38ch">
          Les associations publient ce dont elles ont besoin, vos équipes y répondent,
          et le rapport s'écrit tout seul.</p>
      </div>
      <p style="font-size:var(--t-xs);color:rgba(223,230,208,.4)">© 2026 Riseva</p>
    </aside>
    <div class="login__form"><div class="login__box">
      <p class="eyebrow">Connexion</p>
      <h1 style="margin-top:var(--s4);font-size:var(--t-h2)">Bon retour</h1>
      <p class="muted" style="margin-top:var(--s3);font-size:var(--t-sm)">
        Environnement de démonstration : choisissez l'espace à visiter.</p>
      <div class="stack" style="--gap:var(--s3);margin-top:var(--s8)" id="roles"></div>
      <hr class="sep">
      <p class="muted" style="font-size:var(--t-sm)">Pas encore de compte ?</p>
      <div class="row" style="gap:var(--s2);margin-top:var(--s3)">
        <button class="btn btn--ghost btn--sm" id="newEnt">Créer un compte entreprise</button>
        <button class="btn btn--ghost btn--sm" id="newAsso">Inscrire mon association</button>
      </div>
      <p class="hint" style="margin-top:var(--s6)">
        Vous êtes salarié d'une entreprise déjà abonnée ? Utilisez le lien d'inscription
        que votre employeur vous a transmis.</p>
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

  el.querySelector("#newEnt").onclick = () => {
    const c = h(`<div class="stack" style="--gap:var(--s4)">
      <div class="row" style="gap:var(--s4);align-items:stretch">
        <div class="field" style="flex:1"><label>Entreprise</label><input class="input" id="ent"></div>
        <div class="field" style="width:130px"><label>Salariés</label><input class="input" id="eff" type="number" min="1" value="50"></div>
      </div>
      <div class="row" style="gap:var(--s4);align-items:stretch">
        <div class="field" style="flex:1"><label>Secteur</label><input class="input" id="sec" placeholder="Industrie, conseil..."></div>
        <div class="field" style="flex:1"><label>Ville</label><input class="input" id="vil"></div>
      </div>
      <div class="field"><label>Votre nom</label><input class="input" id="nom"></div>
      <div class="field"><label>Votre email professionnel</label><input class="input" id="mail" type="email"></div>
      <p class="hint">Le nombre de salariés fixe le nombre de places de votre abonnement.
        Vous recevrez un lien unique à diffuser en interne : chacun crée son compte lui-même.</p>
    </div>`);
    modal("Créer un compte entreprise", c, [
      { label:"Annuler" },
      { label:"Créer le compte", classe:"btn--primary", onClick: () => {
          const v = (k) => c.querySelector("#" + k).value.trim();
          if (!v("ent") || !v("nom") || !v("mail")){ toast("Entreprise, nom et email sont nécessaires."); return false; }
          const r = DB.creerCompteEntreprise({ entreprise:v("ent"), effectif:v("eff"),
            nom:v("nom"), email:v("mail"), secteur:v("sec"), ville:v("vil") });
          setSession(r.utilisateur.id);
          location.hash = "#/equipe";
          rendre();
          toast("Compte créé. Voici votre lien d'inscription.");
        }}
    ]);
  };

  el.querySelector("#newAsso").onclick = () => {
    const c = h(`<div class="stack" style="--gap:var(--s4)">
      <div class="field"><label>Association</label><input class="input" id="asso"></div>
      <div class="row" style="gap:var(--s4);align-items:stretch">
        <div class="field" style="flex:1"><label>Cause</label><input class="input" id="cause" placeholder="Reforestation, aide alimentaire..."></div>
        <div class="field" style="flex:1"><label>Ville</label><input class="input" id="vil"></div>
      </div>
      <div class="field"><label>En deux phrases, ce que vous faites</label><textarea class="textarea" id="res"></textarea></div>
      <div class="field"><label>Votre nom</label><input class="input" id="nom"></div>
      <div class="field"><label>Votre email</label><input class="input" id="mail" type="email"></div>
      <p class="hint">C'est gratuit et ça le restera. Votre fiche est vérifiée par Riseva avant
        d'être visible par les entreprises.</p>
    </div>`);
    modal("Inscrire mon association", c, [
      { label:"Annuler" },
      { label:"Envoyer", classe:"btn--primary", onClick: () => {
          const v = (k) => c.querySelector("#" + k).value.trim();
          if (!v("asso") || !v("nom") || !v("mail")){ toast("Association, nom et email sont nécessaires."); return false; }
          const r = DB.creerCompteAssociation({ association:v("asso"), cause:v("cause"),
            ville:v("vil"), resume:v("res"), nom:v("nom"), email:v("mail") });
          setSession(r.utilisateur.id);
          location.hash = "#/tableau";
          rendre();
          toast("Compte créé. Votre fiche attend la validation de Riseva.");
        }}
    ]);
  };
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
    <aside class="side grain">
      <a class="side__brand" href="/"><img src="/brand/riseva-full-white.png" alt="Riseva"></a>
      <svg class="side__river" viewBox="0 0 240 90" aria-hidden="true">
        <path d="M-10 66 C 40 26, 82 88, 130 52 S 200 14, 250 44" fill="none" stroke="var(--lime)" stroke-width="2" opacity=".5"/>
        <path d="M-10 80 C 45 40, 88 102, 136 66 S 205 28, 250 58" fill="none" stroke="var(--brand)" stroke-width="2" opacity=".35"/>
      </svg>
      ${menu}
      <div class="side__foot">
        <div class="row" style="gap:10px">
          <span class="avatar">${initiales(u.nom)}</span>
          <span style="min-width:0">
            <b style="display:block;color:var(--paper);font-size:var(--t-sm)">${esc(u.nom)}</b>
            <span style="font-size:var(--t-xs);color:rgba(223,230,208,.45);display:block;
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
  const clCat = DB.classement();
  const moiCl = clCat.find(x => x.id === eid) || {};
  const catId = moiCl.categorie ? moiCl.categorie.id : null;
  const dansCat = DB.classement({ categorie: catId });
  const rang = dansCat.findIndex(x => x.id === eid) + 1;
  const total = dansCat.length;
  const pts = DB.pointsDe(eid);
  const ms = DB.missions({ entreprise: eid });
  const validees = ms.filter(m => m.etat === "validee" || m.etat === "validee_auto");
  const enCours = ms.filter(m => m.etat === "engagee" || m.etat === "a_valider");
  const salaries = DB.salaries(eid).filter(x => x.actif);
  const engages = salaries.filter(x => (x.points || 0) > 0).length;
  const seuilTop = dansCat[Math.max(0, Math.ceil(total * 0.1) - 1)]?.parSalarie ?? 0;
  const monParSalarie = moiCl.parSalarie || 0;

  const el = h(`<div class="stack" style="--gap:var(--s5)">
    <div class="kpis">
      ${kpi("Points de la saison", nb(pts.retenu), pts.ecrete
            ? nb(pts.ecrete) + " points écrêtés" : "+2 480 cette semaine",
            pts.ecrete ? "" : "up", "kpi--tete grain")}
      ${kpi("Rang", rangFR(rang),
            "sur " + total + " · " + (moiCl.categorie ? moiCl.categorie.label.toLowerCase() : ""))}
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
            const v = pts.parType[k] || 0;
            const r = pts.retenuParType[k] || 0;
            return `<div class="kpi">
              <span class="kpi__label">${esc(b.label)}</span>
              <span class="kpi__value" style="font-size:1.4rem">${nb(r)}</span>
              <span class="kpi__delta">${v > r ? nb(v - r) + " au-delà du plafond" : "points retenus"}</span></div>`;
          }).join("")}
        </div>
      </section>

      <div class="stack" style="--gap:var(--s5)">
        <section class="card">
          <h3>Objectif du trimestre</h3>
          <p class="muted" style="font-size:var(--t-sm);margin-top:6px">
            ${monParSalarie >= seuilTop
              ? "Vous êtes dans les 10 % les plus actifs de votre catégorie."
              : `Il vous manque ${Math.max(0, Math.round((seuilTop - monParSalarie) * 10) / 10)} points par salarié pour entrer dans les 10 % de votre catégorie.`}</p>
          <div class="bar" style="margin-top:var(--s5)">
            <i style="width:${Math.min(100, (monParSalarie / Math.max(seuilTop, 0.1)) * 100)}%"></i></div>
          <div class="between" style="margin-top:var(--s3);font-size:var(--t-xs);color:var(--ink-400)">
            <span>${monParSalarie} pts/salarié</span><span>${seuilTop}</span></div>
          ${pts.ecrete ? `<p class="hint" style="margin-top:var(--s4)">
            ${nb(pts.ecrete)} points ne comptent pas au classement : un format ne peut pas
            peser plus de la moitié de votre total.</p>` : ""}
        </section>

        <section class="card">
          <div class="between" style="margin-bottom:var(--s4)">
            <h3>À faire</h3><a class="btn btn--quiet btn--sm" href="#/missions">Tout voir</a></div>
          <div class="stack" style="--gap:var(--s3)" id="todo"></div>
        </section>
      </div>
    </div>

    <section class="card" id="demarrage" style="display:none">
      <div class="between" style="margin-bottom:var(--s5)">
        <div><h3>Mise en route</h3>
        <p class="muted" style="font-size:var(--t-sm);margin-top:4px">
          Quatre choses à faire avant que la saison prenne vraiment.</p></div>
        <span class="badge badge--brand" id="dprogres"></span>
      </div>
      <div class="stack" style="--gap:var(--s3)" id="dliste"></div>
    </section>

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

  if (u.role === "entreprise_admin"){
    const inv = DB.invitationActive(eid);
    const si = DB.sieges(eid);
    const etapes = [
      { fait: !!inv, titre: "Créer le lien d'inscription",
        texte: "Un seul lien, à diffuser en interne.", vers: "#/equipe" },
      { fait: !!(inv && inv.teste), titre: "Tester le lien avant de le diffuser",
        texte: "Ouvrez-le vous-même une fois : c'est la meilleure façon d'éviter d'envoyer un lien mort à trois cents personnes.",
        action: inv ? { label: "Ouvrir le lien", fn: () => {
          window.open(`/rejoindre.html?code=${inv.code}`, "_blank");
          inv.teste = true; toast("Lien ouvert dans un nouvel onglet."); } } : null },
      { fait: si.pris > 1, titre: "Diffuser le lien à vos équipes",
        texte: si.pris > 1 ? `${si.pris} personnes ont déjà créé leur compte.`
                           : "Personne n'a encore rejoint. Intranet, mail interne, affiche : au choix.",
        vers: "#/equipe" },
      { fait: DB.administrateurs(eid).length > 1, titre: "Nommer un deuxième administrateur",
        texte: "Un seul compte qui peut agir, c'est une panne en cas d'absence.", vers: "#/equipe" }
    ];
    const restantes = etapes.filter(e => !e.fait);
    if (restantes.length){
      const bloc = el.querySelector("#demarrage");
      bloc.style.display = "";
      el.querySelector("#dprogres").textContent =
        `${etapes.length - restantes.length} / ${etapes.length}`;
      const liste = el.querySelector("#dliste");
      etapes.forEach(et => {
        const ligne = h(`<div class="row" style="align-items:flex-start;gap:var(--s4);
          padding:var(--s3) 0;border-top:var(--line-soft)">
          <span style="color:${et.fait ? "var(--forest-700)" : "var(--ink-300)"};margin-top:2px">
            ${et.fait ? ICONS.check : ICONS.clock}</span>
          <div style="flex:1">
            <strong style="${et.fait ? "color:var(--ink-400);text-decoration:line-through" : ""}">${esc(et.titre)}</strong>
            <p class="muted" style="font-size:var(--t-sm);margin-top:2px">${esc(et.texte)}</p>
          </div></div>`);
        if (!et.fait && et.action){
          const b = h(`<button class="btn btn--ghost btn--sm">${esc(et.action.label)}</button>`);
          b.onclick = () => { et.action.fn(); };
          ligne.appendChild(b);
        } else if (!et.fait && et.vers){
          ligne.appendChild(h(`<a class="btn btn--ghost btn--sm" href="${et.vers}">Y aller</a>`));
        }
        liste.appendChild(ligne);
      });
    }
  }
  return el;
}

function listeAnnonces(annonces, u){
  const box = h(`<div></div>`);
  if (!annonces.length){
    box.appendChild(vide({ titre:"Aucune annonce ouverte",
      texte:"Les associations du réseau publient au fil de leurs besoins. Revenez dans quelques jours, ou élargissez vos filtres." }));
    return box;
  }
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
  const assos = DB.associations().filter(a => a.valide);
  const el = h(`<div class="stack" style="--gap:var(--s5)">
    <section class="card card--pad-sm">
      <div class="row" style="gap:var(--s3);flex-wrap:wrap">
        <input class="input" id="q" placeholder="Rechercher un besoin, une ville, une association" style="flex:1;min-width:240px">
        <select class="select" id="type" style="width:200px">
          <option value="">Tous les formats</option>
          ${Object.entries(BAREME).map(([k, b]) => `<option value="${k}">${esc(b.label)}</option>`).join("")}
        </select>
        <select class="select" id="asso" style="width:220px">
          <option value="">Toutes les associations</option>
          ${assos.map(a => `<option value="${a.id}">${esc(a.nom)}</option>`).join("")}
        </select>
        <select class="select" id="tri" style="width:180px">
          <option value="date">Date la plus proche</option>
          <option value="points">Plus de points</option>
        </select>
      </div>
    </section>
    <section class="card"><div id="liste"></div></section>
  </div>`);

  const dessine = () => {
    const q = el.querySelector("#q").value.trim().toLowerCase();
    const type = el.querySelector("#type").value;
    const asso = el.querySelector("#asso").value;
    const tri = el.querySelector("#tri").value;
    let l = DB.annonces({ ouvertes: true, type: type || undefined });
    if (asso) l = l.filter(a => a.asso === asso);
    if (q) l = l.filter(a => {
      const nomAsso = (DB.association(a.asso) || {}).nom || "";
      return (a.titre + " " + a.description + " " + a.lieu + " " + nomAsso).toLowerCase().includes(q);
    });
    l = [...l].sort((a, b) => tri === "points"
      ? DB.pointsPour(b.type, b.restant) - DB.pointsPour(a.type, a.restant)
      : String(a.date).localeCompare(String(b.date)));
    const box = el.querySelector("#liste");
    box.innerHTML = "";
    box.appendChild(h(`<p class="muted" style="font-size:var(--t-sm);margin-bottom:var(--s4)">
      ${l.length} annonce${l.length > 1 ? "s" : ""} ouverte${l.length > 1 ? "s" : ""}</p>`));
    box.appendChild(listeAnnonces(l, u));
  };
  el.querySelector("#q").addEventListener("input", dessine);
  ["type","asso","tri"].forEach(id => el.querySelector("#" + id).addEventListener("change", dessine));
  dessine();
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
  if (!ms.length) tb.appendChild(h(`<tr><td colspan="7" class="empty">
    Aucune mission pour l'instant. Tout part d'une annonce à laquelle quelqu'un répond.</td></tr>`));
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
  const monEnt = DB.entreprise(u.org);
  const maCat = monEnt ? monEnt : null;
  let mode = "normalise";
  let categorie = maCat ? DB.classement().find(e => e.id === u.org)?.categorie.id : null;

  const el = h(`<div class="stack" style="--gap:var(--s5)">
    <section class="card card--pad-sm">
      <div class="row" style="gap:var(--s3);flex-wrap:wrap">
        <div class="tabs" style="border:0;margin:0" id="modes">
          <div class="tab is-active" data-m="normalise">Points par salarié</div>
          <div class="tab" data-m="brut">Total brut</div>
        </div>
        <span style="flex:1"></span>
        <select class="select" id="cat" style="width:230px">
          <option value="">Toutes les tailles</option>
          ${CATEGORIES.map(c => `<option value="${c.id}">${esc(c.label)}</option>`).join("")}
        </select>
        <button class="btn btn--ghost btn--sm" id="csvCl">Exporter</button>
      </div>
    </section>

    <div class="two">
      <section class="card">
        <div class="between" style="margin-bottom:var(--s5)">
          <div><h3>Classement de la saison</h3>
          <p class="muted" style="font-size:var(--t-sm);margin-top:4px" id="sousTitre"></p></div>
          <span class="badge">Semaine 34</span>
        </div>
        <table class="table table--rank"><thead><tr>
          <th></th><th>Entreprise</th><th></th><th style="text-align:right">Score</th>
        </tr></thead><tbody></tbody></table>
      </section>

      <div class="stack" style="--gap:var(--s5)">
        <section class="card">
          <h3>Comment le score est calculé</h3>
          <div class="stack" style="--gap:var(--s4);margin-top:var(--s5);font-size:var(--t-sm)">
            <div><strong>Points par salarié</strong>
              <p class="muted" style="margin-top:2px">Les points retenus divisés par l'effectif.
              C'est la lecture principale : une entreprise de quarante personnes et un groupe de
              quatre mille n'ont ni le même potentiel, ni le même taux de participation.</p></div>
            <div><strong>Plafond par format</strong>
              <p class="muted" style="margin-top:2px">Aucun format ne peut peser plus de
              ${Math.round(PLAFOND_PAR_FORMAT * 100)} % des points d'une entreprise.
              Sans ce plafond, il suffirait de virer de l'argent pour truster le classement.</p></div>
            <div><strong>Total brut</strong>
              <p class="muted" style="margin-top:2px">Gardé comme lecture secondaire, jamais
              comme classement de référence.</p></div>
          </div>
        </section>

        <section class="card">
          <h3>Le barème</h3>
          <div class="stack" style="--gap:var(--s4);margin-top:var(--s5)">
            ${Object.entries(BAREME).map(([k, b]) => `
              <div class="row" style="align-items:flex-start;gap:var(--s4)">
                <span style="color:var(--forest-700)">${ICONS[b.icone]}</span>
                <div><strong>${esc(b.label)}</strong>
                <p class="muted" style="font-size:var(--t-sm);margin-top:2px">
                  ${b.points} point${b.points > 1 ? "s" : ""} par ${esc(b.unite)}</p></div>
              </div>`).join("")}
          </div>
          <hr class="sep">
          <p class="hint">Le score mesure un engagement, pas un impact environnemental.
            Riseva ne le présente jamais comme une mesure scientifique.</p>
        </section>
      </div>
    </div>
  </div>`);

  const dessine = () => {
    const cl = DB.classement({ mode, categorie: categorie || null });
    const seuil = Math.max(1, Math.ceil(cl.length * 0.1));
    const cle = mode === "brut" ? "points" : "parSalarie";
    const max = Math.max(...cl.map(e => e[cle]), 1);
    el.querySelector("#sousTitre").textContent = mode === "brut"
      ? "Total des points retenus, toutes tailles confondues si aucun filtre"
      : "Points retenus rapportés à l'effectif, recalculé chaque lundi";
    const tb = el.querySelector("tbody");
    tb.innerHTML = "";
    if (!cl.length){ tb.appendChild(h(`<tr><td colspan="4" class="empty">Aucune entreprise dans cette catégorie.</td></tr>`)); return; }
    cl.forEach(e => {
      const moiOrg = e.id === u.org;
      tb.appendChild(h(`<tr style="${moiOrg ? "background:var(--forest-050)" : ""}">
        <td>${e.rang}</td>
        <td><strong>${esc(e.nom)}</strong>${moiOrg ? ` <span class="muted">(vous)</span>` : ""}${
          e.rang <= seuil ? ` <span class="badge badge--brand" style="height:20px;margin-left:6px">top 10 %</span>` : ""}
          <br><span class="muted" style="font-size:var(--t-xs)">${esc(e.categorie.label)} · ${e.participation} % de participation${
            e.ecrete ? ` · ${nb(e.ecrete)} points écrêtés` : ""}</span></td>
        <td style="width:30%"><div class="bar"><i style="width:${(e[cle] / max) * 100}%"></i></div></td>
        <td class="tnum" style="text-align:right"><strong>${mode === "brut" ? nb(e.points) : e.parSalarie}</strong>
          <br><span class="muted" style="font-size:var(--t-xs)">${mode === "brut" ? "points" : "pts / salarié"}</span></td>
      </tr>`));
    });
  };

  el.querySelectorAll("#modes .tab").forEach(t => t.onclick = () => {
    el.querySelectorAll("#modes .tab").forEach(x => x.classList.remove("is-active"));
    t.classList.add("is-active"); mode = t.dataset.m; dessine();
  });
  el.querySelector("#cat").value = categorie || "";
  el.querySelector("#cat").onchange = (e) => { categorie = e.target.value; dessine(); };
  el.querySelector("#csvCl").onclick = () => {
    const cl = DB.classement({ mode, categorie: categorie || null });
    versCSV("riseva-classement.csv",
      ["Rang", "Entreprise", "Catégorie", "Effectif", "Points retenus", "Points bruts",
       "Points par salarié", "Participation %"],
      cl.map(e => [e.rang, e.nom, e.categorie.label, e.effectif, e.points, e.brut,
                   e.parSalarie, e.participation]));
    toast("Export téléchargé.");
  };
  dessine();
  return el;
}

function vueEquipe(u){
  const eid = u.org;
  const gens = DB.salaries(eid);
  const actifs = gens.filter(g => !g.anonyme);
  const partis = gens.filter(g => g.anonyme);
  const si = DB.sieges(eid);
  const inv = DB.invitationActive(eid);
  const lien = inv ? `${location.origin}/rejoindre.html?code=${inv.code}` : "";

  const el = h(`<div class="two">
    <section class="card">
      <div class="between" style="margin-bottom:var(--s5)">
        <div><h3>Salariés</h3>
        <p class="muted" style="font-size:var(--t-sm);margin-top:4px">
          ${actifs.length} place${actifs.length > 1 ? "s" : ""} occupée${actifs.length > 1 ? "s" : ""}${
            partis.length ? ` · ${partis.length} départ${partis.length > 1 ? "s" : ""}` : ""}</p></div>
        <div class="row" style="gap:var(--s2)">
          <button class="btn btn--ghost btn--sm" id="csvEq">Exporter</button>
          <button class="btn btn--ghost btn--sm" id="add">${ICONS.plus} Ajouter</button>
        </div>
      </div>
      <table class="table"><thead><tr>
        <th>Nom</th><th>Email</th><th>Points</th><th>État</th><th></th></tr></thead><tbody></tbody></table>
    </section>

    <div class="stack" style="--gap:var(--s5)">
      <section class="card kpi kpi--tete grain">
        <span class="kpi__label">Places occupées</span>
        <span class="kpi__value">${si.pris} <span style="opacity:.45">/ ${si.total}</span></span>
        <div class="bar bar--lime" style="margin-top:var(--s3);background:rgba(223,230,208,.16)">
          <i style="width:${si.total ? (si.pris / si.total) * 100 : 0}%"></i></div>
        <span class="kpi__delta">${si.restants} place${si.restants > 1 ? "s" : ""} encore disponible${si.restants > 1 ? "s" : ""}</span>
      </section>

      <section class="card">
        <div class="between" style="margin-bottom:var(--s4)">
          <h3>Lien d'inscription</h3>
          ${inv ? `<span class="badge badge--ok"><span class="dot"></span>Actif</span>`
                : `<span class="badge badge--warn">Aucun lien</span>`}
        </div>
        <p class="muted" style="font-size:var(--t-sm)">
          Un seul lien à diffuser en interne. Chaque salarié crée son compte lui-même,
          vous n'avez aucune liste à saisir.</p>
        ${inv ? `
        <div class="copyline" style="margin-top:var(--s5)">
          <input class="input" id="lien" value="${esc(lien)}" readonly>
          <button class="btn btn--primary btn--sm" id="copy" style="flex:none">Copier</button>
        </div>
        <div class="stack" style="--gap:var(--s3);margin-top:var(--s5);font-size:var(--t-sm)">
          <div class="between"><span class="muted">Code</span>
            <strong style="font-family:var(--font-mono)">${esc(inv.code)}</strong></div>
          <div class="between"><span class="muted">Inscriptions par ce lien</span>
            <span class="tnum">${inv.utilisees} / ${inv.places}</span></div>
          <div class="between"><span class="muted">Valable jusqu'au</span>
            <span>${dateFR(inv.expire_le)}</span></div>
        </div>
        <hr class="sep">
        <div class="row" style="gap:var(--s2)">
          <button class="btn btn--ghost btn--sm" id="regen">Régénérer</button>
          <button class="btn btn--danger btn--sm" id="revoke">Révoquer</button>
        </div>
        <p class="hint">Régénérer coupe l'ancien lien et en crée un nouveau. Les comptes
          déjà créés ne sont pas touchés.</p>`
        : `<button class="btn btn--primary btn--block" style="margin-top:var(--s5)" id="regen">Créer le lien</button>`}
      </section>
    </div>
  </div>`);

  const tb = el.querySelector("tbody");
  const ligne = (g) => {
    const tr = h(`<tr class="${g.anonyme ? "is-anonyme" : ""}">
      <td><span class="row" style="gap:10px">
        <span class="avatar ${g.anonyme ? "avatar--anon" : ""}">${g.anonyme ? "—" : initiales(g.nom)}</span>
        <span><strong>${esc(g.nom)}</strong>${g.anonyme
          ? `<br><span class="muted" style="font-size:var(--t-xs)">retiré le ${dateFR(g.retire_le || new Date().toISOString())}</span>` : ""}</span>
      </span></td>
      <td class="muted">${g.anonyme ? "—" : esc(g.email)}</td>
      <td class="tnum">${nb(g.points || 0)}</td>
      <td><span class="badge ${g.anonyme ? "" : (g.actif ? "badge--ok" : "badge--warn")}">${
        g.anonyme ? "Anonymisé" : (g.actif ? "Actif" : "Suspendu")}</span>${
        g.role === "entreprise_admin" ? ` <span class="badge badge--info" style="margin-left:4px">Admin</span>` : ""}</td>
      <td style="text-align:right"></td></tr>`);
    if (!g.anonyme){
      const admins = DB.administrateurs(eid);
      if (g.role === "salarie"){
        const pa = h(`<button class="btn btn--quiet btn--sm">Nommer admin</button>`);
        pa.onclick = () => modal("Nommer " + g.nom + " administrateur",
          `<p class="muted">Il pourra gérer l'équipe, le lien d'inscription, les rapports et
           l'abonnement, comme vous.</p>
           <p class="hint" style="margin-top:var(--s4)">Avoir un seul administrateur est fragile :
           si vous partez en congés ou quittez l'entreprise, plus personne ne peut agir.</p>`,
          [{ label:"Annuler" },
           { label:"Nommer administrateur", classe:"btn--primary", onClick: () => {
               DB.promouvoirAdmin(g.id); toast("Administrateur nommé."); rendre(); }}]);
        tr.lastElementChild.appendChild(pa);
      } else if (admins.length > 1 && g.id !== u.id){
        const ra = h(`<button class="btn btn--quiet btn--sm">Retirer les droits</button>`);
        ra.onclick = () => { try { DB.retrograderAdmin(g.id); } catch (e){ toast(e.message); return; }
          toast("Droits retirés."); rendre(); };
        tr.lastElementChild.appendChild(ra);
      }
      const dernierAdmin = g.role === "entreprise_admin" && admins.length <= 1;
      const b = h(`<button class="btn btn--quiet btn--sm"${dernierAdmin ? " disabled title=\"Nommez un autre administrateur avant de retirer celui-ci\"" : ""}>Retirer</button>`);
      b.onclick = () => modal("Retirer " + g.nom + " de l'équipe",
        `<p class="muted">Son compte est fermé immédiatement et sa place est rendue à votre abonnement.</p>
         <p class="muted" style="margin-top:var(--s4)">Son nom et son adresse disparaissent de la
         plateforme. Il apparaîtra désormais comme <strong>salarié retiré</strong> dans les listes et
         dans l'historique des missions. Les ${nb(g.points || 0)} points qu'il a rapportés restent
         acquis à l'entreprise.</p>
         <p class="hint" style="margin-top:var(--s4)">Cette opération ne se défait pas.</p>`,
        [{ label:"Annuler" },
         { label:"Retirer et anonymiser", classe:"btn--primary", onClick: () => {
             try { DB.retirerSalarie(g.id); } catch (err){ toast(err.message); return false; }
             toast("Compte retiré et anonymisé."); rendre(); }}]);
      tr.lastElementChild.appendChild(b);
    }
    return tr;
  };
  actifs.forEach(g => tb.appendChild(ligne(g)));
  partis.forEach(g => tb.appendChild(ligne(g)));
  if (!gens.length) tb.appendChild(h(`<tr><td colspan="5" class="empty">Personne pour l'instant. Diffusez le lien d'inscription.</td></tr>`));

  el.querySelector("#copy")?.addEventListener("click", () => {
    const champ = el.querySelector("#lien");
    champ.select();
    navigator.clipboard?.writeText(champ.value).catch(() => document.execCommand("copy"));
    toast("Lien copié.");
  });
  el.querySelector("#regen")?.addEventListener("click", () => {
    const corps = h(`<div class="stack" style="--gap:var(--s4)">
      <p class="muted" style="font-size:var(--t-sm)">Combien de places ce lien peut-il ouvrir ?
        Il ne pourra jamais dépasser le nombre de places de votre abonnement.</p>
      <div class="field"><label>Places ouvertes par le lien</label>
        <input class="input" type="number" id="pl" min="1" max="${si.total}" value="${si.restants || si.total}"></div>
    </div>`);
    modal(inv ? "Régénérer le lien" : "Créer le lien", corps, [
      { label:"Annuler" },
      { label:inv ? "Régénérer" : "Créer", classe:"btn--primary", onClick: () => {
          const n = Math.min(Number(corps.querySelector("#pl").value) || 1, si.total);
          DB.creerInvitation(eid, n);
          toast("Nouveau lien prêt."); rendre();
        }}
    ]);
  });
  el.querySelector("#revoke")?.addEventListener("click", () => modal("Révoquer le lien",
    `<p class="muted">Plus personne ne pourra créer de compte avec ce lien. Les comptes
     existants ne sont pas touchés.</p>`,
    [{ label:"Annuler" },
     { label:"Révoquer", classe:"btn--primary", onClick: () => {
         DB.revoquerInvitation(inv.id); toast("Lien révoqué."); rendre(); }}]));

  el.querySelector("#csvEq").onclick = () => {
    versCSV("riseva-equipe.csv", ["Nom", "Email", "Points", "État"],
      gens.map(g => [g.nom, g.email || "", g.points || 0,
        g.anonyme ? "Anonymisé" : (g.actif ? "Actif" : "Suspendu")]));
    toast("Export téléchargé.");
  };
  el.querySelector("#add").onclick = () => {
    const corps = h(`<div class="stack" style="--gap:var(--s4)">
      <div class="field"><label>Nom et prénom</label><input class="input" id="n" placeholder="Camille Roux"></div>
      <div class="field"><label>Email professionnel</label><input class="input" id="e" type="email" placeholder="camille@entreprise.fr"></div>
      <p class="hint">${si.restants} place${si.restants > 1 ? "s" : ""} disponible${si.restants > 1 ? "s" : ""}.
        Un lien d'activation part vers cette adresse, aucun mot de passe ne transite par Riseva.</p>
    </div>`);
    modal("Ajouter un salarié", corps, [
      { label:"Annuler" },
      { label:"Envoyer l'invitation", classe:"btn--primary", onClick: () => {
          const n = corps.querySelector("#n").value.trim(), e = corps.querySelector("#e").value.trim();
          if (!n || !e){ toast("Nom et email sont nécessaires."); return false; }
          try { DB.inviterSalarie(eid, n, e); } catch (err){ toast(err.message); return false; }
          toast("Invitation envoyée."); rendre();
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
        <div class="row" style="gap:var(--s2)">
          <button class="btn btn--ghost btn--sm" id="csv">Exporter en CSV</button>
          <button class="btn btn--ghost btn--sm" id="pdf">Exporter en PDF</button>
        </div>
      </div>
      <hr class="sep">
      <div class="kpis">
        <div class="card kpi"><span class="kpi__label">Points</span>
          <span class="kpi__value" id="rPoints">${nb(r.points)}</span></div>
        ${kpi("Rang final", rangFR(r.rang), "sur " + r.total)}
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
  el.querySelector("#csv").onclick = () => {
    const ms = DB.missions({ entreprise: u.org })
                 .filter(m => m.etat === "validee" || m.etat === "validee_auto");
    versCSV(`riseva-rapport-${r.saison.nom.replace(/\s+/g, "-").toLowerCase()}.csv`,
      ["Mission", "Association", "Format", "Salarié", "Date", "Quantité", "Points"],
      ms.map(m => { const a = DB.annonceDe(m), sal = DB.utilisateur(m.salarie);
        return [a.titre, (DB.association(a.asso) || {}).nom, BAREME[a.type].label,
                sal ? sal.nom : "—", m.date, m.quantite, m.points]; }));
    toast("Export téléchargé.");
  };
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
  const si = DB.sieges(u.org);
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
        <div class="between"><span class="muted">Places de l'abonnement</span>
          <span class="tnum">${si.pris} / ${si.total}</span></div>
      </div>
      <hr class="sep">
      <div class="bar" style="margin-top:var(--s2)"><i style="width:${si.total ? (si.pris / si.total) * 100 : 0}%"></i></div>
      <hr class="sep">
      <p class="muted" style="font-size:var(--t-sm)">
        L'acompte de ${eur(s.acompte)} est remboursé intégralement si la saison ne démarre pas.
        Aucune commission n'est prélevée sur les dons faits par vos salariés.
        Un salarié retiré libère sa place immédiatement.</p>
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
      ${kpi("Annonces ouvertes", nb(annonces.filter(a => a.etat === "ouverte").length), "publiées par vous", "", "kpi--tete grain")}
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
  el.querySelector("#l").appendChild(tableAnnoncesAsso(annonces, u));
  el.querySelector("#new").onclick = () => formAnnonce(u);
  return el;
}

function tableAnnoncesAsso(annonces, u){
  const t = h(`<table class="table"><thead><tr>
    <th>Annonce</th><th>Format</th><th>Reste</th><th>État</th><th></th></tr></thead><tbody></tbody></table>`);
  const tb = t.querySelector("tbody");
  if (!annonces.length)
    tb.appendChild(h(`<tr><td colspan="5" class="empty">Aucune annonce publiée.</td></tr>`));
  annonces.forEach(a => {
    const engagees = DB.missions({}).filter(m => m.annonce === a.id && m.etat !== "refusee").length;
    const tr = h(`<tr>
      <td><strong>${esc(a.titre)}</strong><br><span class="muted" style="font-size:var(--t-xs)">${dateFR(a.date)} · ${esc(a.lieu || "")}${
        engagees ? ` · ${engagees} engagement${engagees > 1 ? "s" : ""}` : ""}</span></td>
      <td class="muted">${esc(BAREME[a.type].label)}</td>
      <td class="tnum">${a.type === "don_financier" ? eur(a.restant) : a.restant + " / " + a.quantite}</td>
      <td><span class="badge ${a.etat === "ouverte" ? "badge--ok" : ""}">${a.etat === "ouverte" ? "Ouverte" : "Close"}</span></td>
      <td style="text-align:right"></td></tr>`);
    if (u){
      const cell = tr.lastElementChild;
      const bEdit = h(`<button class="btn btn--quiet btn--sm">Modifier</button>`);
      bEdit.onclick = () => formAnnonce(u, a);
      cell.appendChild(bEdit);
      if (a.etat === "ouverte"){
        const b = h(`<button class="btn btn--quiet btn--sm">Fermer</button>`);
        b.onclick = () => { DB.fermerAnnonce(a.id); toast("Annonce fermée."); rendre(); };
        cell.appendChild(b);
      } else if (a.restant > 0){
        const b = h(`<button class="btn btn--quiet btn--sm">Rouvrir</button>`);
        b.onclick = () => { DB.rouvrirAnnonce(a.id); toast("Annonce rouverte."); rendre(); };
        cell.appendChild(b);
      }
      if (!engagees){
        const b = h(`<button class="btn btn--quiet btn--sm" style="color:var(--danger)">Supprimer</button>`);
        b.onclick = () => modal("Supprimer cette annonce",
          `<p class="muted">Personne ne s'y est engagé, elle peut disparaître sans laisser de trace.</p>`,
          [{ label:"Annuler" },
           { label:"Supprimer", classe:"btn--primary", onClick: () => {
               try { DB.supprimerAnnonce(a.id); } catch (e){ toast(e.message); return false; }
               toast("Annonce supprimée."); rendre(); }}]);
        cell.appendChild(b);
      }
    }
    tb.appendChild(tr);
  });
  return t;
}

function formAnnonce(u, existante = null){
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
  corps.querySelector("#d").value = existante
    ? existante.date
    : new Date(Date.now() + 12 * 864e5).toISOString().slice(0, 10);
  if (existante){
    corps.querySelector("#type").value = existante.type;
    corps.querySelector("#type").disabled = true;
    corps.querySelector("#titre").value = existante.titre;
    corps.querySelector("#desc").value = existante.description;
    corps.querySelector("#q").value = existante.quantite;
    corps.querySelector("#lieu").value = existante.lieu || "";
  }
  modal(existante ? "Modifier l'annonce" : "Publier une annonce", corps, [
    { label:"Annuler" },
    { label:existante ? "Enregistrer" : "Publier", classe:"btn--primary", onClick: () => {
        const v = (id) => corps.querySelector("#" + id).value.trim();
        if (!v("titre") || !v("desc")){ toast("Le titre et la description sont nécessaires."); return false; }
        if (existante){
          const q = Number(v("q")) || 1;
          const pris = existante.quantite - existante.restant;
          if (q < pris){ toast("Déjà " + pris + " engagement(s), la quantité ne peut pas descendre en dessous."); return false; }
          DB.modifierAnnonce(existante.id, { titre:v("titre"), description:v("desc"),
            quantite:q, restant:q - pris, date:v("d"), lieu:v("lieu") });
          toast("Annonce mise à jour.");
        } else {
          DB.creerAnnonce({ asso: u.org, type: v("type"), titre: v("titre"), description: v("desc"),
            quantite: Number(v("q")) || 1, date: v("d"), lieu: v("lieu") || DB.association(u.org).ville });
          toast("Annonce publiée.");
        }
        rendre();
      }}
  ]);
}

function vueAValider(u){
  const toutes = DB.missions({ asso: u.org })
                   .filter(m => m.etat === "a_valider" || m.etat === "engagee");
  const aValider = toutes.filter(m => m.etat === "a_valider");
  const selection = new Set();

  const el = h(`<div class="stack" style="--gap:var(--s5)">
    ${aValider.length ? `<section class="card card--dark grain">
      <div class="between" style="flex-wrap:wrap;gap:var(--s4)">
        <div>
          <h3>${aValider.length} mission${aValider.length > 1 ? "s" : ""} attend${aValider.length > 1 ? "ent" : ""} votre réponse</h3>
          <p class="muted" style="margin-top:6px;font-size:var(--t-sm)">
            Tant que vous n'avez pas répondu, l'entreprise ne marque rien. Vous pouvez tout
            confirmer d'un coup si tout s'est bien passé.</p>
        </div>
        <div class="row" style="gap:var(--s2)">
          <button class="btn btn--outlineDark btn--sm" id="tout">Tout sélectionner</button>
          <button class="btn btn--onDark btn--sm" id="lot">Confirmer la sélection (<span id="n">0</span>)</button>
        </div>
      </div>
    </section>` : ""}

    <section class="card">
      <div class="between" style="margin-bottom:var(--s5)">
        <div><h3>Missions à confirmer</h3>
        <p class="muted" style="font-size:var(--t-sm);margin-top:4px">
          Sans réponse de votre part sous quatorze jours, la mission est comptée comme réalisée.</p></div>
      </div>
      <table class="table"><thead><tr>
        <th style="width:36px"></th><th>Mission</th><th>Entreprise</th><th>Salarié</th>
        <th>Date</th><th>Délai</th><th>État</th><th></th>
      </tr></thead><tbody></tbody></table>
    </section>
  </div>`);

  const majCompteur = () => {
    const n = el.querySelector("#n"); if (n) n.textContent = selection.size;
    const b = el.querySelector("#lot"); if (b) b.disabled = selection.size === 0;
  };

  const tb = el.querySelector("tbody");
  if (!toutes.length){
    tb.appendChild(h(`<tr><td colspan="8"></td></tr>`));
    tb.querySelector("td").appendChild(vide({
      titre: "Tout est à jour",
      texte: "Rien à confirmer pour l'instant. Nous vous écrirons dès qu'une mission arrivera à échéance."
    }));
  }
  toutes.forEach(m => {
    const a = DB.annonceDe(m), e = DB.entreprise(m.entreprise), sal = DB.utilisateur(m.salarie);
    const jours = DB.joursAvantAuto(m);
    const tr = h(`<tr>
      <td>${m.etat === "a_valider" ? `<input type="checkbox" style="accent-color:var(--forest-700);width:16px;height:16px">` : ""}</td>
      <td><strong>${esc(a.titre)}</strong><br><span class="muted" style="font-size:var(--t-xs)">${esc(BAREME[a.type].label)} · ${nb(m.points)} pts</span></td>
      <td class="muted">${esc(e ? e.nom : "—")}</td>
      <td class="muted">${esc(sal ? sal.nom : "—")}</td>
      <td class="muted tnum">${dateCourte(m.date)}</td>
      <td>${jours === null ? '<span class="muted">—</span>'
            : `<span class="badge ${jours <= 3 ? "badge--warn" : ""}">${jours} j</span>`}</td>
      <td><span class="badge ${ETATS_MISSION[m.etat].badge}">${ETATS_MISSION[m.etat].label}</span></td>
      <td style="text-align:right"></td></tr>`);
    const cb = tr.querySelector("input");
    if (cb) cb.onchange = () => { cb.checked ? selection.add(m.id) : selection.delete(m.id); majCompteur(); };
    if (m.etat === "a_valider"){
      const ok = h(`<button class="btn btn--forest btn--sm">Confirmer</button>`);
      const no = h(`<button class="btn btn--quiet btn--sm">Refuser</button>`);
      ok.onclick = () => { DB.validerMission(m.id, true);  toast("Mission confirmée, points crédités."); rendre(); };
      no.onclick = () => modal("Refuser cette mission",
        `<p class="muted">La mission sera marquée comme non réalisée et l'entreprise ne marquera
         aucun point. Le besoin redevient disponible sur votre annonce.</p>
         <div class="field" style="margin-top:var(--s5)"><label>Un mot d'explication, pour l'entreprise</label>
           <textarea class="textarea" id="mot" placeholder="Personne n'est venu, ou la mission a été écourtée..."></textarea></div>`,
        [{ label:"Annuler" },
         { label:"Refuser", classe:"btn--primary", onClick: () => {
             DB.validerMission(m.id, false); toast("Mission refusée, l'entreprise est prévenue."); rendre(); }}]);
      tr.lastElementChild.append(no, ok);
    }
    tb.appendChild(tr);
  });

  el.querySelector("#tout")?.addEventListener("click", () => {
    const cases = [...el.querySelectorAll("tbody input[type=checkbox]")];
    const tousCoches = cases.every(c => c.checked);
    cases.forEach(c => { c.checked = !tousCoches; c.dispatchEvent(new Event("change")); });
  });
  el.querySelector("#lot")?.addEventListener("click", () => {
    const n = selection.size;
    modal(`Confirmer ${n} mission${n > 1 ? "s" : ""}`,
      `<p class="muted">Vous attestez que ${n > 1 ? "ces missions ont" : "cette mission a"}
       bien été réalisée${n > 1 ? "s" : ""}. Les points seront crédités immédiatement aux
       entreprises concernées.</p>`,
      [{ label:"Annuler" },
       { label:"Tout confirmer", classe:"btn--primary", onClick: () => {
           const faits = DB.validerLot([...selection], true);
           toast(`${faits} mission${faits > 1 ? "s" : ""} confirmée${faits > 1 ? "s" : ""}.`);
           rendre(); }}]);
  });
  majCompteur();
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
      ${kpi("Entreprises", nb(es.length), "saison en cours", "", "kpi--tete grain")}
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
    <th>Entreprise</th><th>Secteur</th><th>Places</th><th>Points</th><th>Rang</th>
  </tr></thead><tbody></tbody></table></section>`);
  const tb = el.querySelector("tbody");
  DB.classement().forEach(e => {
    const si = DB.sieges(e.id);
    tb.appendChild(h(`<tr>
      <td><strong>${esc(e.nom)}</strong><br><span class="muted" style="font-size:var(--t-xs)">${esc(e.ville)} · ${nb(e.effectif)} salariés</span></td>
      <td class="muted">${esc(e.secteur)}</td>
      <td style="width:22%"><div class="between" style="font-size:var(--t-xs);margin-bottom:5px">
          <span class="muted tnum">${si.pris} / ${si.total}</span></div>
        <div class="bar"><i style="width:${si.total ? (si.pris / si.total) * 100 : 0}%"></i></div></td>
      <td class="tnum"><strong>${nb(e.points)}</strong></td>
      <td class="tnum">${e.rang}</td></tr>`));
  });
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
  const sa = DB.saison();
  const el = h(`<div class="two">
    <section class="card" style="padding:var(--s8)">
      <div class="between"><h3>${esc(sa.nom)}</h3>
        <span class="badge ${sa.etat === "ouverte" ? "badge--ok" : "badge--warn"}">${
          sa.etat === "ouverte" ? "Ouverte" : sa.etat === "close" ? "Close" : "Brouillon"}</span></div>
      <div class="stack" style="--gap:var(--s4);margin-top:var(--s6)">
        <div class="field"><label>Nom de la saison</label><input class="input" id="nom" value="${esc(sa.nom)}"></div>
        <div class="row" style="gap:var(--s4);align-items:stretch">
          <div class="field" style="flex:1"><label>Début</label><input class="input" type="date" id="debut" value="${sa.debut}"></div>
          <div class="field" style="flex:1"><label>Fin</label><input class="input" type="date" id="fin" value="${sa.fin}"></div>
        </div>
        <div class="row" style="gap:var(--s4);align-items:stretch">
          <div class="field" style="flex:1"><label>Prix plancher HT</label><input class="input" type="number" id="pmin" value="${sa.prix_min}"></div>
          <div class="field" style="flex:1"><label>Prix plafond HT</label><input class="input" type="number" id="pmax" value="${sa.prix_max}"></div>
        </div>
        <div class="field"><label>Acompte à la confirmation</label><input class="input" type="number" id="ac" value="${sa.acompte}">
          <p class="hint">Remboursé intégralement si la saison ne démarre pas.</p></div>
        <div class="field"><label>État</label>
          <select class="select" id="etat">
            <option value="brouillon">Brouillon</option>
            <option value="ouverte">Ouverte</option>
            <option value="close">Close</option>
          </select></div>
      </div>
      <button class="btn btn--primary" style="margin-top:var(--s6)" id="save">Enregistrer la saison</button>
    </section>

    <section class="card">
      <h3>Barème</h3>
      <p class="muted" style="font-size:var(--t-sm);margin-top:var(--s3)">
        Versionné par saison. Un changement en cours de saison fausserait le classement :
        il ne s'applique donc qu'à partir de la saison suivante.</p>
      <div class="stack" style="--gap:var(--s4);margin-top:var(--s6)">
        ${Object.entries(BAREME).map(([k, b]) => `
          <div class="field"><label>${esc(b.label)} — par ${esc(b.unite)}</label>
            <input class="input" type="number" min="1" data-bareme="${k}" value="${b.points}"></div>`).join("")}
      </div>
      <button class="btn btn--ghost" style="margin-top:var(--s6)" id="saveB">Enregistrer le barème</button>
      <hr class="sep">
      <p class="hint">Le barème appliqué aux missions déjà validées n'est jamais recalculé.
        Les points acquis restent acquis.</p>
    </section>
  </div>`);
  el.querySelector("#etat").value = sa.etat;
  el.querySelector("#save").onclick = () => {
    const v = (id) => el.querySelector("#" + id).value;
    if (v("fin") <= v("debut")){ toast("La fin doit tomber après le début."); return; }
    DB.majSaison({ nom:v("nom").trim() || sa.nom, debut:v("debut"), fin:v("fin"),
      prix_min:Number(v("pmin")), prix_max:Number(v("pmax")),
      acompte:Number(v("ac")), etat:v("etat") });
    toast("Saison enregistrée."); rendre();
  };
  el.querySelector("#saveB").onclick = () => {
    el.querySelectorAll("[data-bareme]").forEach(i => DB.majBareme(i.dataset.bareme, i.value));
    toast("Barème enregistré pour la saison suivante."); rendre();
  };
  return el;
}

function vueActivite(u){
  const ms = DB.missions({ salarie: u.id });
  const validees = ms.filter(m => m.etat === "validee" || m.etat === "validee_auto");
  const e = DB.entreprise(u.org);
  const parType = {};
  validees.forEach(m => {
    const a = DB.annonceDe(m); if (!a) return;
    parType[a.type] = (parType[a.type] || 0) + m.points;
  });
  const equipe = DB.salaries(u.org).filter(x => !x.anonyme)
                   .sort((a, b) => (b.points || 0) - (a.points || 0));
  const monRang = equipe.findIndex(x => x.id === u.id) + 1;
  const part = e && e.points ? Math.round(((u.points || 0) / e.points) * 100) : 0;

  const el = h(`<div class="stack" style="--gap:var(--s5)">
    <div class="kpis">
      ${kpi("Mes points", nb(u.points || 0), `${part} % du total de l'entreprise`, "", "kpi--tete grain")}
      ${kpi("Missions réalisées", nb(validees.length), ms.length - validees.length + " en cours")}
      ${kpi("Rang dans l'équipe", rangFR(monRang), "sur " + equipe.length)}
      ${kpi("Demi-journées", nb(validees.filter(m => (DB.annonceDe(m) || {}).type === "benevolat_demi_journee")
        .reduce((n, m) => n + m.quantite, 0)), "de bénévolat")}
    </div>

    <div class="two">
      <section class="card">
        <div class="between" style="margin-bottom:var(--s5)">
          <h3>Ce que vous avez fait</h3>
          <button class="btn btn--ghost btn--sm" id="csv">Exporter</button>
        </div>
        <div id="hist"></div>
      </section>

      <div class="stack" style="--gap:var(--s5)">
        <section class="card">
          <h3>Par format</h3>
          <div class="stack" style="--gap:var(--s4);margin-top:var(--s5)">
            ${Object.entries(BAREME).map(([k, b]) => {
              const p = parType[k] || 0;
              const max = Math.max(...Object.values(parType), 1);
              return `<div><div class="between" style="font-size:var(--t-sm);margin-bottom:6px">
                <span class="muted">${esc(b.label)}</span><span class="tnum">${nb(p)} pts</span></div>
                <div class="bar"><i style="width:${(p / max) * 100}%"></i></div></div>`;
            }).join("")}
          </div>
        </section>
        <section class="card">
          <h3>L'équipe</h3>
          <div class="stack" style="--gap:var(--s3);margin-top:var(--s5);font-size:var(--t-sm)">
            ${equipe.slice(0, 6).map((x, i) => `<div class="between" ${x.id === u.id
              ? 'style="font-weight:600;color:var(--forest-800)"' : ""}>
              <span class="row" style="gap:10px"><span class="muted tnum" style="width:14px">${i + 1}</span>
                ${esc(x.nom)}${x.id === u.id ? " (vous)" : ""}</span>
              <span class="tnum">${nb(x.points || 0)}</span></div>`).join("")}
          </div>
          <hr class="sep">
          <p class="hint">Ce classement interne ne sort jamais de votre entreprise.
            Seul le total collectif apparaît dans le classement général.</p>
        </section>
      </div>
    </div>
  </div>`);

  const hist = el.querySelector("#hist");
  if (!ms.length){
    hist.appendChild(vide({
      titre: "Rien encore",
      texte: "Vous n'avez pas encore répondu à une annonce. Il y en a sûrement une près de chez vous.",
      action: { label: "Voir les annonces", onClick: () => { location.hash = "#/annonces"; } }
    }));
  } else {
    const t = h(`<table class="table"><thead><tr>
      <th>Mission</th><th>Association</th><th>Date</th><th>Points</th><th>État</th>
    </tr></thead><tbody></tbody></table>`);
    const tb = t.querySelector("tbody");
    ms.forEach(m => {
      const a = DB.annonceDe(m), asso = DB.association(a.asso);
      tb.appendChild(h(`<tr>
        <td><strong>${esc(a.titre)}</strong><br><span class="muted" style="font-size:var(--t-xs)">${esc(BAREME[a.type].label)}</span></td>
        <td class="muted">${esc(asso.nom)}</td>
        <td class="muted tnum">${dateCourte(m.date)}</td>
        <td class="tnum"><strong>${nb(m.points)}</strong></td>
        <td><span class="badge ${ETATS_MISSION[m.etat].badge}">${ETATS_MISSION[m.etat].label}</span></td>
      </tr>`));
    });
    hist.appendChild(t);
  }

  el.querySelector("#csv").onclick = () => {
    versCSV(`riseva-mon-activite.csv`,
      ["Mission", "Association", "Format", "Date", "Points", "État"],
      ms.map(m => {
        const a = DB.annonceDe(m);
        return [a.titre, (DB.association(a.asso) || {}).nom, BAREME[a.type].label,
                m.date, m.points, ETATS_MISSION[m.etat].label];
      }));
    toast("Export téléchargé.");
  };
  return el;
}

function vueJournal(){
  const j = DB.journal();
  const libelles = {
    bienvenue_entreprise: "Bienvenue entreprise",
    preinscription: "Préinscription reçue",
    mission_engagee: "Engagement sur une annonce",
    demande_validation: "Demande de validation",
    mission_validee: "Mission confirmée",
    validation_auto: "Validation sans retour",
    association_validee: "Association validée"
  };
  const el = h(`<div class="stack" style="--gap:var(--s5)">
    <section class="card card--pad-sm">
      <div class="row" style="gap:var(--s3);flex-wrap:wrap">
        <input class="input" id="q" placeholder="Filtrer par destinataire ou par objet" style="flex:1;min-width:240px">
        <select class="select" id="type" style="width:260px">
          <option value="">Tous les messages</option>
          ${Object.entries(libelles).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("")}
        </select>
        <button class="btn btn--ghost btn--sm" id="csv">Exporter</button>
      </div>
    </section>
    <section class="card">
      <p class="muted" style="font-size:var(--t-sm);margin-bottom:var(--s5)">
        Tout ce que la plateforme envoie, reconstruit à partir de l'état réel. Si un message
        n'apparaît pas ici, c'est qu'il ne part pas.</p>
      <div id="l"></div>
    </section>
  </div>`);
  const dessine = () => {
    const q = el.querySelector("#q").value.trim().toLowerCase();
    const type = el.querySelector("#type").value;
    const l = j.filter(x => (!type || x.type === type) &&
      (!q || (x.vers + " " + x.sujet).toLowerCase().includes(q)));
    const box = el.querySelector("#l");
    box.innerHTML = "";
    if (!l.length){
      box.appendChild(vide({ titre:"Aucun message", texte:"Rien ne correspond à ce filtre." }));
      return;
    }
    const t = h(`<table class="table"><thead><tr>
      <th>Date</th><th>Message</th><th>Destinataire</th><th>Objet</th><th>État</th>
    </tr></thead><tbody></tbody></table>`);
    const tb = t.querySelector("tbody");
    l.forEach(x => tb.appendChild(h(`<tr>
      <td class="muted tnum">${dateCourte(x.date)}</td>
      <td><strong>${esc(libelles[x.type] || x.type)}</strong></td>
      <td class="muted">${esc(x.vers)}</td>
      <td class="muted">${esc(x.sujet)}</td>
      <td><span class="badge ${x.etat === "envoyé" ? "badge--ok" : "badge--warn"}">${esc(x.etat)}</span></td>
    </tr>`)));
    box.appendChild(t);
  };
  el.querySelector("#q").addEventListener("input", dessine);
  el.querySelector("#type").addEventListener("change", dessine);
  el.querySelector("#csv").onclick = () => {
    versCSV("riseva-journal.csv", ["Date", "Message", "Destinataire", "Objet", "État"],
      j.map(x => [x.date, libelles[x.type] || x.type, x.vers, x.sujet, x.etat]));
    toast("Export téléchargé.");
  };
  dessine();
  return el;
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
    classement:[vueClassement,     "Classement"],
    activite:  [vueActivite,       "Mon activité"]
  },
  association: {
    tableau:    [tableauAsso,  "Tableau de bord"],
    mesannonces:[(u) => { const d = h(`<section class="card"></section>`);
                          d.appendChild(tableAnnoncesAsso(DB.annonces({ asso: u.org }), u)); return d; }, "Mes annonces"],
    avalider:   [vueAValider,  "Missions à valider"],
    page:       [vuePageAsso,  "Ma page publique"]
  },
  admin: {
    tableau:        [tableauAdmin,             "Tableau de bord"],
    entreprises:    [vueAdminEntreprises,      "Entreprises"],
    assos:          [vueAdminAssos,            "Associations"],
    preinscriptions:[vueAdminPreinscriptions,  "Préinscriptions"],
    saison:         [vueAdminSaison,           "Saison et barème"],
    journal:        [vueJournal,               "Journal des envois"]
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
