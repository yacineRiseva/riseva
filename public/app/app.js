import { DB, BAREME, ETATS_MISSION, CATEGORIES, PLAFOND_PAR_FORMAT, FISCAL, FACTURATION, UNITES, lienPublic, connecterSupabase } from "./data.js";
import { h, esc, nb, pct, eur, dateFR, dateCourte, initiales, rangFR, ICONS, toast, modal, kpi, spark, riviere, jauge, vignette, carteFrance, foret, versCSV, vide, bandeauRealisations } from "./ui.js";

/* ------------------------------------------------------------------ */
/* Session                                                             */
/* ------------------------------------------------------------------ */
const CLE = "riseva.session";
const CLE_LUES = "riseva.notifs.lues";
const lues = () => { try { return new Set(JSON.parse(localStorage.getItem(CLE_LUES) || "[]")); }
                     catch { return new Set(); } };
const marquerLues = (ids) => {
  const s = lues(); ids.forEach(i => s.add(i));
  try { localStorage.setItem(CLE_LUES, JSON.stringify([...s])); } catch {}
};
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
      ["classement", "Classement",      "trophy"],
      ["annuaire",   "Associations",    "heart"],
      ["ensemble",   "Tous ensemble",   "leaf"]
    ]},
    { groupe: "Entreprise", items: [
      ["equipe",     "Équipe",       "users"],
      ["rapports",   "Rapports",     "report"],
      ["mecenat",    "Mécénat",      "coins"],
      ["abonnement", "Abonnement",   "card"],
      ["parametres", "Paramètres",   "settings"]
    ]}
  ],
  salarie: [
    { groupe: "Saison", items: [
      ["tableau",    "Tableau de bord", "dashboard"],
      ["annonces",   "Annonces",        "megaphone"],
      ["missions",   "Mes missions",    "check"],
      ["classement", "Classement",      "trophy"],
      ["annuaire",   "Associations",    "heart"],
      ["ensemble",   "Tous ensemble",   "leaf"]
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
      ["page",      "Ma page publique",  "heart"],
      ["recus",     "Reçus fiscaux",     "report"]
    ]}
  ],
  admin: [
    { groupe: "Réseau", items: [
      ["tableau",       "Tableau de bord", "dashboard"],
      ["entreprises",   "Entreprises",     "building"],
      ["assos",         "Associations",    "heart"],
      ["preinscriptions","Préinscriptions","users"],
      ["pilotes",       "Indicateurs",     "trophy"]
    ]},
    { groupe: "Paramètres", items: [
      ["saison",  "Saison et barème", "settings"],
      ["journal", "Journal des envois", "report"],
      ["moteur",  "Automatismes",        "settings"],
      ["moderation", "Modération",       "alert"]
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
function coquille(u, vue, titre, actions = "", periode = DB.saison().nom){
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
            <span style="font-size:var(--t-xs);color:rgba(223,230,208,.72);display:block;
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
          ${/* Le bandeau dit la période à laquelle appartiennent les chiffres de la
                page. « Saison 2026 » au-dessus d'un total qui court depuis le
                lancement racontait deux périmètres à la fois. */""}
          <span class="badge badge--brand"><span class="dot"></span>${esc(periode)}</span>
        </div>
        <div class="row">${actions}
          <div class="notifs">
            <button class="btn btn--quiet btn--sm notifs__btn" id="cloche" aria-label="Notifications">
              ${ICONS.cloche}<span class="notifs__pastille" id="pastille"></span></button>
          </div>
        </div>
      </header>
      <div class="content" id="slot"></div>
    </div>
  </div>`);
  el.querySelector("#out").onclick = () => { setSession(null); location.hash = ""; rendre(); };
  const cote = el.querySelector(".side");
  el.querySelector("#burger").onclick = () => cote.classList.toggle("is-open");

  const notifs = DB.notifications(u.id);
  const dejaLues = lues();
  const nonLues = notifs.filter(n => !dejaLues.has(n.id));
  const pastille = el.querySelector("#pastille");
  if (nonLues.length){ pastille.textContent = nonLues.length > 9 ? "9+" : nonLues.length;
                       pastille.classList.add("is-on"); }
  el.querySelector("#cloche").onclick = (ev) => {
    ev.stopPropagation();
    const existant = document.querySelector(".panneau");
    if (existant){ existant.remove(); return; }
    const p = h(`<div class="panneau">
      <div class="panneau__tete">
        <strong>Notifications</strong>
        ${notifs.length ? `<button class="btn btn--quiet btn--sm" id="tout">Tout marquer comme lu</button>` : ""}
      </div>
      <div class="panneau__corps"></div>
      <a class="panneau__pied" href="#/preferences">Préférences de notification</a>
    </div>`);
    const corps = p.querySelector(".panneau__corps");
    if (!notifs.length){
      corps.appendChild(h(`<p class="muted" style="padding:var(--s6);text-align:center;font-size:var(--t-sm)">
        Rien pour l'instant.</p>`));
    }
    notifs.forEach(n => {
      const nouvelle = !dejaLues.has(n.id);
      const li = h(`<a class="notif ${nouvelle ? "is-new" : ""}" href="${n.vers}">
        <span class="notif__point notif__point--${n.ton}"></span>
        <span><strong>${esc(n.titre)}</strong>
          <span class="notif__texte">${esc(n.texte)}</span>
          <span class="notif__date">${dateCourte(n.date)}</span></span>
      </a>`);
      li.addEventListener("click", () => { marquerLues([n.id]); p.remove(); });
      corps.appendChild(li);
    });
    p.querySelector("#tout")?.addEventListener("click", () => {
      marquerLues(notifs.map(n => n.id)); p.remove(); rendre();
    });
    el.querySelector(".notifs").appendChild(p);
    setTimeout(() => document.addEventListener("click", function fermer(e){
      if (!p.contains(e.target)){ p.remove(); document.removeEventListener("click", fermer); }
    }), 0);
  };
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
  const engages = salaries.filter(x => DB.pointsVisiblesEmployeur(x.id) > 0).length;
  /* Plus de « barre d'objectif » sans objectif : une jauge à moitié pleine avec un
     tiret à droite ne mesure rien. On donne le score, et un point de comparaison
     qui existe — la médiane de la catégorie quand la cohorte est assez grande,
     l'avancement de la cohorte sinon. */
  const monParSalarie = moiCl.parSalarie || 0;
  const scores = dansCat.map(x => x.parSalarie).sort((a, b) => a - b);
  const medianeCat = scores.length
    ? Math.round(((scores.length % 2
        ? scores[(scores.length - 1) / 2]
        : (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2)) * 10) / 10
    : 0;

  /* Ce qui attend une action passe avant ce qui flatte. Un responsable RSE ouvre cet
     écran pour savoir quoi faire, pas pour contempler son rang. */
  const aFaire = [];
  /* Ce qui attend quelqu'un d'autre n'est pas une tâche : le distinguer évite de
     reprocher à l'entreprise un délai qui ne dépend pas d'elle. */
  const aAttendre = [];
  const aValider = ms.filter(m => m.etat === "a_valider");
  if (aValider.length) aAttendre.push({ texte:
    `${aValider.length} mission${aValider.length > 1 ? "s" : ""} en attente de confirmation par l'association`,
    vers:"#/missions" });
  const aDeclarer = ms.filter(m => m.etat === "engagee" && m.date < "2026-08-20");
  if (aDeclarer.length) aFaire.push({ texte:
    `${aDeclarer.length} mission${aDeclarer.length > 1 ? "s" : ""} passée${aDeclarer.length > 1 ? "s" : ""} que personne n'a déclarée${aDeclarer.length > 1 ? "s" : ""}`,
    vers:"#/missions", ton:"alerte" });
  if (!e.cout_jour_moyen || !e.siret) aFaire.push({ texte:
    "Des paramètres manquent pour valoriser votre mécénat", vers:"#/parametres", ton:"alerte" });
  const fact = DB.etatFacturation(eid);
  if (fact.enRetard.length) aFaire.push({ texte:
    `${fact.enRetard.length} facture${fact.enRetard.length > 1 ? "s" : ""} en retard`,
    vers:"#/abonnement", ton:"alerte" });
  if (DB.administrateurs(eid).length < 2) aFaire.push({ texte:
    "Un seul administrateur : nommez-en un second", vers:"#/equipe", ton:"info" });
  if (!DB.domaines(eid).length) aFaire.push({ texte:
    "Aucun domaine de messagerie déclaré : le lien accepte n'importe qui", vers:"#/equipe", ton:"alerte" });

  /* Un seul taux de participation dans tout le produit, celui du protocole de mesure :
     salariés ayant au moins une action validée, divisés par l'effectif de référence.
     Trois définitions concurrentes sur trois écrans, c'est trois fois moins crédible. */
  const aAgir = aFaire;
  const partVerifiee = DB.indicateurs(eid).participation;

  /* Le palmarès des associations, et le total du réseau : deux lectures que le
     responsable RSE demande à voix haute dès la deuxième réunion. */
  const prefs = DB.associationsPreferees(eid, { limite: 3 });
  const res = DB.reseau();
  const reaEnt = DB.realisations({ entreprise: eid });
  const semainesActives = DB.semaines(eid).filter(x => x > 0).length;

  const coutParAction = validees.length && fact.contrat
    ? Math.round(fact.contrat.montant_ht / validees.length) : null;
  const heures = (surTempsDeTravail) => validees.reduce((n, m) => {
    const a = DB.annonceDe(m);
    if (!a || a.type !== "benevolat_demi_journee") return n;
    return n + (!!a.temps_travail === surTempsDeTravail ? m.quantite * 4 : 0);
  }, 0);
  const heuresTT = heures(true), heuresPerso = heures(false);

  const el = h(`<div class="stack" style="--gap:var(--s5)">
    ${/* Deux lignes n'ont pas besoin d'une carte de deux cents pixels. Un bandeau
          bas, dense, qui se lit d'un coup et laisse la place aux résultats. */
      /* Deux colonnes, deux natures. Mettre « nommez un second administrateur »
         et « l'association n'a pas encore répondu » sous le même titre demandait
         au lecteur de trier lui-même ce sur quoi il peut agir. */
      (aAgir.length || aAttendre.length) ? `<section class="aFaire">
      ${aAgir.length ? `<div class="aFaire__col">
        <span class="aFaire__titre">Action requise
          <span class="badge ${aAgir.some(x => x.ton === "alerte") ? "badge--warn" : ""}"
            style="height:20px;margin-left:6px">${aAgir.length}</span></span>
        <div class="aFaire__liste">
          ${aAgir.map(x => `<a class="rappel rappel--dense" href="${x.vers}">
            <span class="notif__point notif__point--${x.ton}"></span>
            <span>${esc(x.texte)}</span>
            <span class="rappel__go">${ICONS.arrow || "→"}</span></a>`).join("")}
        </div></div>` : ""}
      ${aAttendre.length ? `<div class="aFaire__col">
        <span class="aFaire__titre">En attente d'un tiers</span>
        <div class="aFaire__liste">
          ${aAttendre.map(x => `<a class="rappel rappel--dense" href="${x.vers}">
            <span class="notif__point notif__point--info"></span>
            <span>${esc(x.texte)}</span>
            <span class="rappel__go">${ICONS.arrow || "→"}</span></a>`).join("")}
        </div></div>` : ""}
    </section>` : ""}

    <div class="kpis">
      ${/* Le nombre de personnes d'abord, le pourcentage ensuite. « 1,4 % » en
            chiffre principal, c'est un score d'échec affiché en grand le jour de
            la mise en route ; « 3 salariés mobilisés » est le même fait, dit
            dans le sens où on peut agir dessus. */
        kpi("Salariés mobilisés", nb(partVerifiee.num),
            `${pct(partVerifiee.valeur ?? 0)} % de l'effectif (${partVerifiee.num}/${partVerifiee.den})`,
            "", "kpi--tete grain")}
      ${/* Le chiffre du bandeau de résultats ne compte que les missions dont
            l'association a confirmé la production. Sans cette ligne, l'écart entre
            « 4 validées » et « 3 missions » ne s'explique qu'en lisant les notes. */
        kpi("Missions validées", nb(validees.length),
            reaEnt.missions < validees.length
              ? `dont ${nb(reaEnt.missions)} avec un résultat confirmé par l'association`
              : enCours.length + " en cours")}
      ${/* « Heures offertes » regroupait deux choses différentes : du bénévolat
            sur temps personnel et du mécénat de compétences sur temps de travail.
            Seul le second se valorise fiscalement. */
        kpi("Heures consacrées aux missions", nb(heuresTT + heuresPerso),
            heuresTT ? `dont ${nb(heuresTT)} h sur le temps de travail, valorisables en mécénat`
                     : "toutes sur le temps personnel des salariés")}
      ${kpi("Associations soutenues", nb(prefs.length),
            prefs.length ? "sur " + nb(DB.associations().filter(a => a.valide).length) + " partenaires"
                         : "aucune pour l'instant")}
    </div>

    <div id="realis"></div>

    ${prefs.length ? `<section class="card">
      <div class="between" style="margin-bottom:var(--s5)">
        <div><h3>Associations soutenues</h3>
        <p class="muted" style="font-size:var(--t-sm);margin-top:4px">
          Les plus récentes d'abord. Les dons personnels des salariés n'entrent pas
          dans ce compte.</p></div>
        <a class="btn btn--quiet btn--sm" href="#/annuaire">L'annuaire</a>
      </div>
      <div class="pref">
        ${/* Aucun ordinal : trois associations à une mission chacune ne sont ni
              première, ni deuxième, ni troisième, et un palmarès d'associations
              serait de toute façon la mauvaise tonalité pour ce produit. */""}
        ${prefs.map(p => `<article class="pref__c">
          <span class="pref__rang">${p.derniere ? "Dernière mission le " + dateCourte(p.derniere) : ""}</span>
          <span class="pref__nom">${esc(p.asso.nom)}</span>
          <span class="muted" style="font-size:var(--t-sm)">${esc(p.asso.cause || "")} · ${esc(p.asso.ville || "")}</span>
          <div class="pref__l"><span>Missions</span><b class="tnum">${nb(p.missions)}</b></div>
          <div class="pref__l"><span>Salariés impliqués</span><b class="tnum">${nb(p.salaries)}</b></div>
          ${/* « Points rapportés » entretenait un palmarès implicite des
                associations. La date, les missions, les salariés et le résultat
                réel disent tout ce qu'il faut. Les points restent dans le rapport. */""}
          ${p.impacts.length ? `<div class="pref__l" style="border-top:var(--line-soft);padding-top:var(--s3)">
            <span>${esc(p.impacts[0].quantite > 1 ? p.impacts[0].pl : p.impacts[0].un)}</span>
            <b class="tnum">${nb(p.impacts[0].quantite)}</b></div>` : ""}
          <a class="btn btn--ghost btn--sm" style="margin-top:auto"
             href="/asso.html?id=${p.asso.id}" target="_blank">Voir la fiche</a>
        </article>`).join("")}
      </div>
    </section>` : ""}

    <section class="card card--dark grain">
      <div class="between" style="margin-bottom:var(--s5)">
        <div><h3 style="color:var(--paper)">Tous ensemble</h3>
        <p style="color:var(--forest-100);opacity:.75;font-size:var(--t-sm);margin-top:4px">
          Ce que toutes les entreprises du réseau ont fait, la vôtre comprise.</p></div>
        <a class="btn btn--lime btn--sm" href="#/ensemble">Voir la forêt</a>
      </div>
      <div class="three">
        ${kpi("Missions du réseau", nb(res.missions), "", "", "kpi--nu")}
        ${kpi("Arbres plantés", nb(res.arbres), "", "", "kpi--nu")}
        ${kpi("Associations soutenues", nb(res.associations), "", "", "kpi--nu")}
      </div>
    </section>

    <div class="two">
      <section class="card">
        <div class="between" style="margin-bottom:var(--s6)">
          <div><h3>Votre score : ${nb(pts.retenu)} points retenus sur ${nb(pts.brut)} bruts</h3>
          <p class="muted" style="font-size:var(--t-sm);margin-top:4px">
            Chaque format peut représenter au maximum ${Math.round(PLAFOND_PAR_FORMAT * 100)} % du score retenu</p></div>
          <a class="btn btn--quiet btn--sm" href="/reglement.html" target="_blank">Le règlement</a>
        </div>
        <div id="jauge"></div>
        ${/* Dix semaines plates et un pic ne racontent rien : ça se voit, et ce
              qui se voit comme un graphique de démonstration en est un. En dessous
              de trois semaines actives, la courbe attend son tour. */""}
        ${semainesActives >= 3 ? `
        <hr class="sep">
        <div class="between" style="margin-bottom:var(--s5)">
          <div><h3 style="font-size:var(--t-lg)">Points par semaine</h3>
          <p class="muted" style="font-size:var(--t-sm);margin-top:4px">Douze dernières semaines, en brut</p></div>
          ${(() => {
            /* Le badge se lit dans la courbe : six semaines contre six semaines.
               Un « En progression » écrit en dur reste vert le jour où tout
               s'arrête, et ce jour-là c'est exactement ce qu'il ne faut pas dire. */
            const w = DB.semaines(eid);
            const avant = w.slice(0, 6).reduce((a, b) => a + b, 0);
            const apres = w.slice(6).reduce((a, b) => a + b, 0);
            if (!avant && !apres) return `<span class="badge">Rien sur douze semaines</span>`;
            if (apres > avant) return `<span class="badge badge--ok"><span class="dot"></span>En progression</span>`;
            if (apres < avant) return `<span class="badge badge--warn">En repli</span>`;
            return `<span class="badge">Stable</span>`;
          })()}
        </div>
        ${riviere(DB.semaines(eid), { hauteur: 120, legendes: ["il y a 12 semaines", "aujourd\u2019hui"] })}
        ` : ""}
        <hr class="sep">
        <div class="three">
          ${Object.entries(BAREME).map(([k, b]) => {
            const v = pts.parType[k] || 0;
            const r = pts.retenuParType[k] || 0;
            if (!v) return `<div class="kpi">
              <span class="kpi__label">${esc(b.label)}</span>
              <span class="kpi__value" style="font-size:1.4rem;color:var(--ink-300)">0</span>
              <a class="kpi__delta" href="#/annonces" style="color:var(--forest-800)">
                Voir les annonces de ce format</a></div>`;
            return `<div class="kpi">
              <span class="kpi__label">${esc(b.label)}</span>
              <span class="kpi__value" style="font-size:1.4rem">${nb(r)}</span>
              <span class="kpi__delta">${v > r ? nb(v - r) + " au-delà du plafond" : "points retenus"}</span></div>`;
          }).join("")}
        </div>
      </section>

      <div class="stack" style="--gap:var(--s5)">
        <section class="card">
          ${/* Pas de rang sous dix entreprises, ici non plus. Le classement le disait
                déjà ; l'afficher quand même sur le tableau de bord annulait la
                précaution et laissait « 2e sur 2 » comme seule impression. */""}
          <div class="between" style="margin-bottom:var(--s5)">
            <div><h3>${total >= 10 ? "Votre rang" : "Votre position"}</h3>
              <p class="muted" style="font-size:var(--t-sm);margin-top:4px">${
                esc(moiCl.categorie ? moiCl.categorie.label : "")}</p></div>
            <span class="row" style="gap:var(--s3)">
              ${total >= 10
                ? `<strong style="font-family:var(--font-display);font-size:1.6rem;
                     letter-spacing:-.02em;color:var(--ink)">${rangFR(rang)}</strong>
                   <span class="muted" style="font-size:var(--t-sm)">sur ${total}</span>`
                : `<span class="badge badge--warn">Classement non publié</span>`}
            </span>
          </div>
          <hr class="sep" style="margin:0 0 var(--s5)">
          <h3 style="font-size:var(--t-lg)">Où vous en êtes</h3>
          <div class="between" style="margin-top:var(--s4);align-items:flex-end">
            <div>
              <span class="muted" style="font-size:var(--t-sm)">Votre score</span>
              <div style="font-family:var(--font-display);font-size:1.9rem;line-height:1.05;
                letter-spacing:var(--track-h)">${pct(monParSalarie)}
                <span style="font-size:var(--t-base);color:var(--ink-500)">pts / salarié</span></div>
            </div>
            <div style="text-align:right">
              <span class="muted" style="font-size:var(--t-sm)">${
                total >= 10 ? "Médiane de la catégorie" : "Cohorte"}</span>
              <div style="font-family:var(--font-display);font-size:1.9rem;line-height:1.05;
                letter-spacing:var(--track-h);color:var(--ink-500)">${
                total >= 10 ? pct(medianeCat) : total + " / 10"}</div>
            </div>
          </div>
          <p class="hint" style="margin-top:var(--s4)">${
            total >= 10
              ? (monParSalarie >= medianeCat
                  ? `Vous êtes au-dessus de la médiane de votre catégorie.`
                  : `Il vous manque ${pct(Math.round((medianeCat - monParSalarie) * 10) / 10)} point${
                     medianeCat - monParSalarie > 1 ? "s" : ""}
                     par salarié pour atteindre la médiane de votre catégorie.`)
              : `Votre catégorie compte ${total} entreprise${total > 1 ? "s" : ""}. En dessous de
                 dix, aucun rang n'est publié : la seule progression qui compte pour l'instant est
                 celle de la cohorte.`}</p>
          ${/* L'écrêtage est expliqué une seule fois, dans la jauge, à côté du
                dessin qui le montre. Le répéter ici mettait deux formulations
                différentes de la même règle sur le même écran. */""}
        </section>

        <section class="card">
          <div class="between" style="margin-bottom:var(--s4)">
            <h3>Missions en cours</h3><a class="btn btn--quiet btn--sm" href="#/missions">Tout voir</a></div>
          <div class="stack" style="--gap:var(--s3)" id="todo"></div>
        </section>
      </div>
    </div>

    ${/* Passé les premières missions validées, la mise en route n'a plus rien à
          faire sur un poste de pilotage : elle reste accessible depuis Paramètres,
          où l'on va quand on cherche à régler quelque chose. */""}
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
      <div class="between">
        <div><h3>Des besoins près de chez vous</h3>
        <p class="muted" style="font-size:var(--t-sm);margin-top:4px">
          ${nb(DB.annonces({ ouvertes:true }).length)} annonces ouvertes,
          la plus proche à ${(() => {
            const d = DB.associationsProches(eid, { avecAnnonces: true })
                        .map(a => a.distance).filter(x => x != null);
            return d.length ? nb(d[0]) + " km" : "consulter";
          })()}.</p></div>
        <a class="btn btn--ghost btn--sm" href="#/annonces">Voir les annonces</a>
      </div>
      <div id="reco" hidden></div>
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

  /* Le format qui a fait sauter des points : celui dont l'écart entre réalisé et
     retenu est le plus grand. C'est la seule information actionnable de la carte. */
  const ecarts = Object.entries(pts.parType)
    .map(([k, v]) => ({ k, perte: v - (pts.retenuParType[k] || 0), label: (BAREME[k] || {}).label || k }))
    .sort((a, b) => b.perte - a.perte);
  el.querySelector("#jauge").appendChild(jauge({
    brut: pts.brut, ecrete: pts.ecrete, retenu: pts.retenu,
    diviseur: e.effectif, cohorte: total,
    cause: ecarts[0] && ecarts[0].perte > 0 ? ecarts[0] : null }));

  const rea = bandeauRealisations(reaEnt, {
    titre: "Ce que vos équipes ont produit", sombre: true,
    /* Cinq phrases défensives en pied de bloc principal se lisent comme une
       excuse. Deux suffisent, et la méthode complète est à un clic. */
    note: `${nb(reaEnt.missions)} résultat${reaEnt.missions > 1 ? "s" : ""} confirmé${
      reaEnt.missions > 1 ? "s" : ""} par les associations.` });
  if (rea) el.querySelector("#realis").appendChild(rea);

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
    /* Une entreprise qui a déjà quatre missions validées n'est plus en mise en
       route, même s'il lui manque une case. Le rappel qui compte — nommer un
       second administrateur — est déjà dans « Action requise » en haut de page. */
    if (restantes.length && validees.length < 3){
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

/* « Se positionner » ne convient à aucun des trois formats : on ne se positionne
   pas pour verser de l'argent, et on ne se positionne pas non plus pour donner un
   carton de matériel. Chaque format dit ce qu'il demande vraiment. */
const ACTION_FORMAT = {
  don_financier:          "Faire un don",
  don_materiel:           "Proposer du matériel",
  benevolat_demi_journee: "Participer"
};

function listeAnnonces(annonces, u){
  const box = h(`<div class="grilleAnnonces"></div>`);
  if (!annonces.length){
    box.className = "";
    box.appendChild(vide({ titre:"Aucune annonce ouverte",
      texte:"Les associations du réseau publient au fil de leurs besoins. Revenez dans quelques jours, ou élargissez vos filtres." }));
    return box;
  }
  annonces.forEach(a => {
    const asso = DB.association(a.asso) || {};
    const b = BAREME[a.type];
    const distance = u.org ? DB.distanceAnnonce(u.org, a) : null;
    const restant = a.type === "don_financier"
      ? `${eur(a.restant)} restants`
      : `${a.restant} place${a.restant > 1 ? "s" : ""} sur ${a.quantite}`;
    const imp = a.impact && UNITES[a.impact.unite] ? a.impact : null;
    /* L'objectif complet de l'annonce, pas le multiplicateur unitaire : « 40 arbres
       plantés » par demi-journée ne veut rien dire pour qui lit l'annonce, « objectif
       480 arbres » si. */
    const objectif = imp ? Math.round(a.quantite * imp.par_unite) : 0;

    const card = h(`<article class="annonce">
      <div class="annonce__haut">
        ${vignette(a)}
        <span class="annonce__asso">
          <span class="annonce__pastille" aria-hidden="true">${initiales(asso.nom || "?")}</span>
          ${esc(asso.nom || "")}
        </span>
        <span class="annonce__pts" title="Barème de la saison, identique pour toutes les entreprises">
          <span class="annonce__ptsN">+${a.type === "don_financier" ? b.points : nb(b.points)}</span>
          ${/* Le libellé sort du barème : « points par demi-journée » collé sur un don
                de matériel annonçait une unité qui n'existe pas pour ce format. */""}
          <span class="annonce__ptsL">${
            `pt${b.points > 1 ? "s" : ""} / ${a.type === "don_financier" ? "10 €" : esc(b.unite)}`}</span>
        </span>
      </div>
      <div class="annonce__corps">
        <div class="row" style="gap:var(--s2);flex-wrap:wrap">
          <span class="badge badge--brand">${esc(b.label)}</span>
          ${a.temps_travail ? `<span class="badge badge--info"
            title="Mécénat de compétences, valorisable fiscalement">Temps de travail</span>` : ""}
          ${/* Ce chiffre est un objectif, pas un résultat. Écrit sans le dire, il se
                lisait comme un bilan — et « 0 colis préparés » sur une annonce qui
                cherche à en financer trois cents donnait l'impression d'une
                association qui n'a rien fait. */
            imp && objectif > 0 ? `<span class="badge" title="Objectif annoncé par l'association">
              Objectif : ${nb(objectif)} ${esc(UNITES[imp.unite].pl)}</span>` : ""}
        </div>
        <h4>${esc(a.titre)}</h4>
        <p class="muted" style="font-size:var(--t-sm)">${esc(a.description)}</p>
        <div class="annonce__meta">
          <span>${ICONS.pin || ""} <b>${esc(a.lieu || asso.ville || "")}</b>${
            distance != null ? ` · ${distance} km` : ""}</span>
          <span><b>${dateFR(a.date)}</b></span>
          <span>${esc(restant)}</span>
        </div>
      </div>
      <div class="annonce__actions">
        <button class="btn btn--forest btn--sm" data-go>${esc(ACTION_FORMAT[a.type] || "Participer")}</button>
        <button class="btn btn--quiet btn--sm" data-sig title="Signaler cette annonce">Signaler</button>
      </div>
    </article>`);
    card.querySelector("[data-go]").onclick = () => ouvrirEngagement(a, u);
    card.querySelector("[data-sig]").onclick = () => ouvrirSignalement(u, a);
    box.appendChild(card);
  });
  return box;
}

function ouvrirSignalement(u, a){
  const motifs = DB.MOTIFS_SIGNALEMENT;
  const corps = h(`<div class="stack" style="--gap:var(--s4)">
    <p class="muted" style="font-size:var(--t-sm)">
      Vous signalez « ${esc(a.titre)} », publiée par ${esc((DB.association(a.asso) || {}).nom || "")}.
      Riseva examine chaque signalement et vous répond par une décision motivée.</p>
    <div class="field"><label>Motif</label>
      <select class="select" id="motif">
        ${Object.entries(motifs).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("")}
      </select></div>
    <div class="field"><label>Précisions</label>
      <textarea class="textarea" id="prec" placeholder="Ce que vous avez constaté, aussi factuellement que possible."></textarea></div>
    <p class="hint">Un signalement abusif répété peut entraîner la suspension de votre compte.
      Les signalements sont conservés douze mois.</p>
  </div>`);
  modal("Signaler cette annonce", corps, [
    { label:"Annuler" },
    { label:"Envoyer le signalement", classe:"btn--primary", onClick: () => {
        try {
          DB.signaler({ annonce: a.id, par: u.id,
            motif: corps.querySelector("#motif").value,
            precisions: corps.querySelector("#prec").value });
        } catch (e){ toast(e.message); return false; }
        toast("Signalement enregistré. Vous recevrez une décision motivée.");
      }}
  ]);
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
    ${a.temps_travail ? `<div class="encadreMini">
      <p><strong>Mission sur le temps de travail.</strong> Votre employeur vous met à disposition
      de l'association pour cette mission précise, à cette date précise. Vous restez son salarié,
      payé par lui et couvert par lui. Vous pouvez refuser sans aucune conséquence.</p>
      <label class="checkline" style="margin-top:var(--s3)"><input type="checkbox" id="consent">
        <span>Je donne mon accord pour <strong>${esc(a.titre)}</strong>, le
        ${dateFR(a.date)}.</span></label>
    </div>` : ""}
  </div>`);
  const q = corps.querySelector("#q"), calc = corps.querySelector("#calc");
  const maj = () => { calc.textContent = `Soit ${nb(DB.pointsPour(a.type, Number(q.value) || 0))} points pour votre entreprise.`; };
  q.oninput = maj; maj();

  modal(a.titre, corps, [
    { label: "Annuler" },
    { label: "Confirmer", classe: "btn--primary", onClick: () => {
        try {
          const cons = corps.querySelector("#consent");
          DB.engager({ annonce: a.id, entreprise: u.org, salarie: u.id,
            quantite: Number(q.value), consentement: cons ? cons.checked : false });
          toast("Vous êtes positionné. L'association sera prévenue.");
          rendre();
        } catch (err){ toast(err.message); return false; }
      }}
  ]);
}

function vueAnnonces(u){
  const assos = DB.associations().filter(a => a.valide);
  const el = h(`<div class="stack" style="--gap:var(--s5)">
    ${/* Trois contrôles visibles, deux repliés. Cinq filtres alignés pour vingt-deux
          annonces, c'est un formulaire de recherche avancée posé devant un catalogue
          qu'on peut parcourir à l'œil. */""}
    <section class="card card--pad-sm">
      <div class="row" style="gap:var(--s3);flex-wrap:wrap">
        <input class="input" id="q" placeholder="Rechercher un besoin, une ville" style="flex:1;min-width:220px">
        <select class="select" id="type" style="width:190px">
          <option value="">Tous les formats</option>
          ${Object.entries(BAREME).map(([k, b]) => `<option value="${k}">${esc(b.label)}</option>`).join("")}
        </select>
        <select class="select" id="rayon" style="width:170px">
          <option value="">Toute la France</option>
          <option value="25">Moins de 25 km</option>
          <option value="50">Moins de 50 km</option>
          <option value="100">Moins de 100 km</option>
          <option value="200">Moins de 200 km</option>
        </select>
        <button class="btn btn--quiet btn--sm" id="plus" aria-expanded="false">Plus de filtres</button>
      </div>
      <div class="row" id="filtresPlus" style="gap:var(--s3);flex-wrap:wrap;display:none;
        margin-top:var(--s3);padding-top:var(--s3);border-top:var(--line-soft)">
        <select class="select" id="asso" style="width:240px">
          <option value="">Toutes les associations</option>
          ${assos.map(a => `<option value="${a.id}">${esc(a.nom)}</option>`).join("")}
        </select>
        <select class="select" id="tri" style="width:200px">
          <option value="distance">La plus proche</option>
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
    const rayon = Number(el.querySelector("#rayon").value) || null;
    let l = DB.annonces({ ouvertes: true, type: type || undefined });
    if (asso) l = l.filter(a => a.asso === asso);
    if (rayon) l = l.filter(a => {
      const d = DB.distanceAnnonce(u.org, a);
      return d == null || d <= rayon;   // une adresse manquante ne fait pas disparaître l'annonce
    });
    if (q) l = l.filter(a => {
      const nomAsso = (DB.association(a.asso) || {}).nom || "";
      return (a.titre + " " + a.description + " " + a.lieu + " " + nomAsso).toLowerCase().includes(q);
    });
    l = [...l].sort((a, b) => {
      if (tri === "points")
        return DB.pointsPour(b.type, b.restant) - DB.pointsPour(a.type, a.restant);
      if (tri === "distance"){
        const da = DB.distanceAnnonce(u.org, a), db = DB.distanceAnnonce(u.org, b);
        if (da == null && db == null) return String(a.date).localeCompare(String(b.date));
        if (da == null) return 1;
        if (db == null) return -1;
        return da - db;
      }
      return String(a.date).localeCompare(String(b.date));
    });
    const box = el.querySelector("#liste");
    box.innerHTML = "";
    const dep = DB.coordsDe(DB.entreprise(u.org));
    box.appendChild(h(`<div class="between" style="margin-bottom:var(--s5)">
      <p class="muted" style="font-size:var(--t-sm)">
        ${l.length} annonce${l.length > 1 ? "s" : ""} ouverte${l.length > 1 ? "s" : ""}${
          rayon ? ` à moins de ${rayon} km` : ""}</p>
      ${!dep ? `<a class="muted" href="#/parametres" style="font-size:var(--t-sm);
        color:var(--forest-800)">Renseignez votre adresse pour voir les distances</a>` : ""}
    </div>`));
    box.appendChild(listeAnnonces(l, u));
  };
  el.querySelector("#q").addEventListener("input", dessine);
  ["type","asso","tri","rayon"].forEach(id => el.querySelector("#" + id).addEventListener("change", dessine));
  const plus = el.querySelector("#plus"), zone = el.querySelector("#filtresPlus");
  plus.onclick = () => {
    const ouvert = zone.style.display !== "none";
    zone.style.display = ouvert ? "none" : "flex";
    plus.setAttribute("aria-expanded", String(!ouvert));
    plus.textContent = ouvert ? "Plus de filtres" : "Moins de filtres";
  };
  dessine();
  return el;
}

function vueAnnuaire(u){
  /* Les distances viennent des adresses saisies, géocodées une fois chacune.
     Une association sans coordonnées n'est jamais écartée : elle passe en fin
     de liste, mais elle reste visible — sinon un oubli de saisie la ferait
     disparaître de l'annuaire, ce qui la pénaliserait pour rien. */
  const assos = u.org && DB.entreprise(u.org)
    ? DB.associationsProches(u.org).filter(a => a.valide)
    : DB.associations().filter(a => a.valide).map(a => ({ ...a, distance: null }));
  const monEnt = u.org ? DB.entreprise(u.org) : null;
  const situe = monEnt && monEnt.lat != null;
  const causes = [...new Set(assos.map(a => a.cause).filter(Boolean))].sort();
  const el = h(`<div class="stack" style="--gap:var(--s5)">
    <section class="card">
      <div class="between" style="margin-bottom:var(--s5)">
        <h3>${nb(assos.length)} associations partenaires en France</h3>
        ${/* « Vérifiées par Riseva » pouvait s'entendre comme une garantie
              d'impact, ou pire, d'éligibilité fiscale — que Riseva ne certifie
              pas. On dit ce qui est réellement contrôlé, et on ouvre la liste. */""}
        <button class="btn btn--quiet btn--sm" id="quoiVerifie">
          Existence juridique et coordonnées contrôlées</button>
      </div>
      <div class="annuaire__haut">
        <div id="carte"></div>
        <div class="stack" style="--gap:var(--s3)">
          <h4 style="font-size:var(--t-sm);letter-spacing:var(--track-wide);
            text-transform:uppercase;color:var(--ink-500)">${situe ? "Les plus proches de vous" : "Quelques partenaires"}</h4>
          ${assos.slice(0, 3).map(a => `<a class="proche" href="/asso.html?id=${a.id}" target="_blank">
            <span class="proche__nom">${esc(a.nom)}</span>
            <span class="proche__meta">${esc(a.cause || "")} · ${esc(a.ville || "")}</span>
            ${a.distance != null ? `<span class="proche__km tnum">${nb(a.distance)} km</span>` : ""}
            <span class="proche__go" aria-hidden="true"></span>
          </a>`).join("")}
          ${situe ? `<p class="hint">Distances à vol d'oiseau depuis votre siège.</p>`
                  : `<p class="hint">Renseignez l'adresse de l'entreprise dans Paramètres
                     pour voir les distances.</p>`}
        </div>
      </div>
    </section>
    <section class="card card--pad-sm">
      <div class="row" style="gap:var(--s3);flex-wrap:wrap">
        <input class="input" id="q" placeholder="Rechercher une association, une ville, une cause" style="flex:1;min-width:240px">
        <select class="select" id="cause" style="width:230px">
          <option value="">Toutes les causes</option>
          ${causes.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join("")}
        </select>
        <select class="select" id="tri" style="width:200px">
          ${situe ? `<option value="proche">La plus proche</option>` : ""}
          <option value="nom">Ordre alphabétique</option>
          <option value="annonces">Le plus de besoins</option>
        </select>
      </div>
    </section>
    <div id="liste" class="grid" style="grid-template-columns:repeat(auto-fill,minmax(320px,1fr))"></div>
  </div>`);

  el.querySelector("#quoiVerifie").onclick = () => modal("Ce que Riseva vérifie",
    `<p class="muted">Avant qu'une association apparaisse ici, cinq points sont
     contrôlés, et consignés avec leur date :</p>
     <ul class="liste" style="margin-top:var(--s4)">
       <li>Existence juridique confirmée : RNA ou SIREN, statuts.</li>
       <li>Référent et signataire des reçus identifiés.</li>
       <li>Objet réel cohérent avec l'activité annoncée.</li>
       <li>Coordonnées vérifiées et actives.</li>
       <li>Éligibilité au mécénat déclarée par l'association elle-même.</li>
     </ul>
     <p class="hint" style="margin-top:var(--s5)">Ce que Riseva ne vérifie pas :
     l'éligibilité fiscale, qui relève de l'administration et de la déclaration de
     l'association, et l'impact réel des missions, qui est déclaré par l'association
     bénéficiaire. La vérification est refaite chaque saison.
     <a href="/charte-associations.html" target="_blank" style="color:var(--forest-800)">La charte</a>.</p>`,
    [{ label:"Fermer" }]);

  el.querySelector("#carte").appendChild(carteFrance([
    ...(situe ? [{ lat: monEnt.lat, lon: monEnt.lon, nom: monEnt.nom, principal: true }] : []),
    ...assos.map(a => ({ lat: a.lat, lon: a.lon, nom: a.nom, distance: a.distance }))
  ], { hauteur: 300, compacte: true }));

  const dessine = () => {
    const q = el.querySelector("#q").value.trim().toLowerCase();
    const cause = el.querySelector("#cause").value;
    const tri = el.querySelector("#tri").value;
    let l = assos.filter(a => (!cause || a.cause === cause) &&
      (!q || (a.nom + " " + a.ville + " " + a.cause + " " + a.resume).toLowerCase().includes(q)));
    const nbAnn = (a) => DB.annonces({ asso: a.id, ouvertes: true }).length;
    l = [...l].sort((a, b) => {
      if (tri === "annonces") return nbAnn(b) - nbAnn(a);
      if (tri === "proche"){
        if (a.distance == null) return 1;
        if (b.distance == null) return -1;
        return a.distance - b.distance;
      }
      return a.nom.localeCompare(b.nom);
    });

    const box = el.querySelector("#liste");
    box.innerHTML = "";
    if (!l.length){
      box.appendChild(vide({ titre:"Aucune association", texte:"Aucune ne correspond à cette recherche." }));
      return;
    }
    /* Les trois plus proches sont déjà en haut de page, dans leur panneau. Les
       réafficher immédiatement dessous, mêmes noms et mêmes distances, donnait
       une page qui bégaie. La grille commence donc après elles. */
    const dejaVues = new Set(situe && !q && !cause ? assos.slice(0, 3).map(x => x.id) : []);
    l.filter(a => !dejaVues.has(a.id)).forEach(a => {
      const n = nbAnn(a);
      const c = h(`<article class="card card--hover stack" style="--gap:var(--s3)">
        <div class="row" style="gap:var(--s3);flex-wrap:wrap">
          <span class="badge badge--brand">${esc(a.cause || "Association")}</span>
          <span class="muted" style="font-size:var(--t-sm)">${esc(a.ville)}</span>
          ${a.distance != null ? `<span class="annonce__loin" title="À vol d'oiseau depuis votre siège">${ICONS.pin || ""} ${nb(a.distance)} km</span>` : ""}
        </div>
        <h3>${esc(a.nom)}</h3>
        <p class="muted" style="font-size:var(--t-sm)">${esc(a.resume)}</p>
        <div class="between" style="margin-top:auto;padding-top:var(--s4);border-top:var(--line-soft)">
          <span class="muted" style="font-size:var(--t-sm)">${n} besoin${n > 1 ? "s" : ""} ouvert${n > 1 ? "s" : ""}</span>
          <span class="row" style="gap:var(--s2)">
            <button class="btn btn--ghost btn--sm">Voir les annonces</button>
          </span>
        </div>
      </article>`);
      /* La carte entière mène à la fiche, le bouton mène aux annonces. Deux
         appels concurrents répétés douze fois obligeaient à choisir avant même
         d'avoir lu le résumé. */
      c.style.cursor = "pointer";
      c.onclick = (ev) => {
        if (ev.target.closest("button")) return;
        window.open(`/asso.html?id=${a.id}`, "_blank");
      };
      c.querySelector("button").onclick = (ev) => {
        ev.stopPropagation();
        location.hash = "#/annonces";
        setTimeout(() => {
          const zone = document.querySelector("#filtresPlus");
          if (zone && zone.style.display === "none") document.querySelector("#plus")?.click();
          const sel = document.querySelector("#asso");
          if (sel){ sel.value = a.id; sel.dispatchEvent(new Event("change")); }
        }, 140);
      };
      box.appendChild(c);
    });
  };
  el.querySelector("#q").addEventListener("input", dessine);
  ["cause","tri"].forEach(id => el.querySelector("#" + id).addEventListener("change", dessine));
  dessine();
  return el;
}

function vueMissions(u){
  const salarieVue = u.role === "salarie";
  /* L'employeur ne voit jamais un don personnel rattaché à un nom : la cause d'une
     association peut révéler une opinion, une conviction ou un état de santé. */
  const ms = salarieVue ? DB.missions({ salarie: u.id }) : DB.missionsVueEmployeur(u.org);
  const agg = salarieVue ? null : DB.donsPersonnelsAgreges(u.org);
  const el = h(`<div class="stack" style="--gap:var(--s5)">
    ${!salarieVue && ms.some(m => m.masquee) ? `<section class="card card--flat"
      style="background:var(--info-bg);border-color:transparent">
      <h3 style="font-size:var(--t-lg)">Les dons personnels ne sont pas nominatifs</h3>
      <p class="muted" style="font-size:var(--t-sm);margin-top:6px;color:var(--ink-600)">
        Quand un salarié donne de sa poche, ni son nom, ni le montant, ni l'association ne vous
        sont montrés. La cause d'une association peut révéler une conviction, une opinion ou un
        état de santé, et cela ne regarde pas l'employeur. Les points comptent pour l'entreprise,
        c'est tout.
        ${agg && agg.affichable
          ? ` Au total : ${eur(agg.affichable.montant)} versés par ${agg.affichable.donateurs} salariés.`
          : agg && agg.donateurs
            ? ` Moins de ${agg.seuil} donateurs cette saison : le total n'est pas affiché, il permettrait de remonter aux personnes.`
            : ""}</p>
    </section>` : ""}
    <section class="card">
    <table class="table"><thead><tr>
      <th>Mission</th><th>Association</th><th>Salarié</th><th>Date</th>
      <th>Points</th><th>État</th><th></th></tr></thead><tbody></tbody></table>
  </section></div>`);
  const tb = el.querySelector("tbody");
  if (!ms.length) tb.appendChild(h(`<tr><td colspan="7" class="empty">
    Aucune mission pour l'instant. Tout part d'une annonce à laquelle quelqu'un répond.</td></tr>`));
  ms.forEach(m => {
    const a = DB.annonceDe(m), asso = DB.association(a.asso), s = DB.utilisateur(m.salarie);
    const tr = h(`<tr class="${m.masquee ? "is-anonyme" : ""}">
      <td><strong>${m.masquee ? "Don personnel d'un salarié" : esc(a.titre)}</strong><br>
        <span class="muted" style="font-size:var(--t-xs)">${esc(BAREME[a.type].label)}</span></td>
      <td class="muted">${m.masquee ? "—" : esc(asso.nom)}</td>
      <td class="muted">${m.masquee ? "—" : esc(s ? s.nom : "—")}</td>
      <td class="muted tnum">${dateCourte(m.date)}</td>
      <td class="tnum"><strong>${nb(m.points)}</strong></td>
      <td><span class="badge ${ETATS_MISSION[m.etat].badge}">${ETATS_MISSION[m.etat].label}</span></td>
      <td style="text-align:right"></td></tr>`);
    if (m.etat === "engagee" && !m.masquee && salarieVue){
      const b = h(`<button class="btn btn--ghost btn--sm">Déclarer faite</button>`);
      b.onclick = () => {
        const an = DB.annonceDe(m);
        const imp = an && an.impact && UNITES[an.impact.unite] ? an.impact : null;
        if (!imp){
          DB.declarerFaite(m.id);
          toast("L'association va recevoir le mail de confirmation."); rendre(); return;
        }
        const attendu = Math.round(m.quantite * imp.par_unite);
        const corps = h(`<div>
          <p class="muted">Vous y étiez. Donnez le chiffre que vous avez constaté, l'association
          le confirmera ou le corrigera.</p>
          <div class="field" style="margin-top:var(--s5)">
            <label>${esc(UNITES[imp.unite].pl.charAt(0).toUpperCase() + UNITES[imp.unite].pl.slice(1))}</label>
            <input class="input" type="number" min="0" id="rp" value="${attendu}">
            <p class="hint">Prévu d'après l'annonce : ${nb(attendu)}. Ce chiffre n'entre au
              décompte qu'une fois l'association d'accord.</p>
          </div>
        </div>`);
        modal("Déclarer « " + esc(an.titre) + " » réalisée", corps, [
          { label:"Annuler" },
          { label:"Déclarer", classe:"btn--primary", onClick: () => {
              DB.declarerFaite(m.id, Number(corps.querySelector("#rp").value));
              toast("L'association va recevoir le mail de confirmation."); rendre(); }}
        ]);
      };
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
          <div><h3 id="titreClassement">Classement de la saison</h3>
          <p class="muted" style="font-size:var(--t-sm);margin-top:4px" id="sousTitre"></p></div>
          <span class="badge" id="etatCohorte">Semaine 34</span>
        </div>
        <div id="avertCohorte"></div>
        <table class="table table--rank"><thead><tr>
          <th></th><th>Entreprise</th><th></th><th style="text-align:right">Score</th>
        </tr></thead><tbody></tbody></table>
      </section>

      <div class="stack" style="--gap:var(--s5)">
        <section class="card">
          <h3 style="font-size:var(--t-lg)">Comprendre mon score</h3>
          <div class="stack" style="--gap:var(--s3);margin-top:var(--s4);font-size:var(--t-sm)">
            <div class="between"><span class="muted">Score</span>
              <b>points retenus / effectif</b></div>
            <div class="between"><span class="muted">Plafond par format</span>
              <b>${Math.round(PLAFOND_PAR_FORMAT * 100)} % du score retenu</b></div>
            <div class="between"><span class="muted">Cohorte minimale</span>
              <b>10 entreprises</b></div>
          </div>
          <hr class="sep">
          <button class="btn btn--ghost btn--block btn--sm" id="detail">Le détail de mon score</button>
          <p class="hint">Le score mesure un engagement, pas un impact environnemental.
            <a href="/reglement.html" target="_blank" style="color:var(--forest-800)">Le règlement</a>.</p>
        </section>
      </div>
    </div>
  </div>`);

  const dessine = () => {
    const cl = DB.classement({ mode, categorie: categorie || null });
    /* Un décile n'a de sens qu'au-dessus d'une certaine cohorte. Afficher « top 10 % »
       quand deux entreprises sont classées est indéfendable. */
    const COHORTE_MIN = 10;
    const decile = cl.length >= COHORTE_MIN;
    const seuil = decile ? Math.max(1, Math.ceil(cl.length * 0.1)) : 0;
    const cle = mode === "brut" ? "points" : "parSalarie";
    const max = Math.max(...cl.map(e => e[cle]), 1);
    el.querySelector("#sousTitre").textContent = (mode === "brut"
      ? "Total des points retenus, toutes tailles confondues si aucun filtre"
      : "Points retenus rapportés à l'effectif, recalculé chaque lundi")
      + (decile ? "" : ` · cohorte de ${cl.length}, trop petite pour parler de décile`);
    const av = el.querySelector("#avertCohorte");
    av.innerHTML = "";
    const tb = el.querySelector("tbody");
    const tete = el.querySelector("thead");
    tb.innerHTML = "";

    /* Sous dix entreprises, on ne classe pas. Afficher malgré tout un rang, une
       barre comparative et « vous êtes 2e » après avoir écrit trois fois que le
       classement n'est pas significatif, c'est laisser le lecteur retenir une
       seule chose : qu'il est dernier. On montre son score, et l'avancement de
       la cohorte — le seul objectif qui existe vraiment à ce stade. */
    if (!decile){
      /* Un titre « Classement de la saison » qui ouvre une page sans classement
         est une promesse non tenue, et c'est la première chose qu'on lit. */
      el.querySelector("#titreClassement").textContent = "Votre score de saison";
      el.querySelector("#etatCohorte").textContent = "Classement à venir";
      el.querySelector("#etatCohorte").className = "badge badge--warn";
      tete.style.display = "none";
      const mien = cl.find(e => e.id === u.org);
      av.appendChild(h(`<div class="stack" style="--gap:var(--s5)">
        ${mien ? `<div>
          <span class="muted" style="font-size:var(--t-sm)">Votre score</span>
          <div style="font-family:var(--font-display);font-size:2.4rem;line-height:1.05;
            letter-spacing:var(--track-display)">${pct(mien.parSalarie)}
            <span style="font-size:var(--t-lg);color:var(--ink-500)">point${
              mien.parSalarie > 1 ? "s" : ""} par salarié</span></div>
          <p class="muted" style="font-size:var(--t-sm);margin-top:6px">
            ${nb(mien.points)} points retenus sur ${nb(mien.brut)} bruts,
            divisés par ${nb(mien.effectif)} salariés.</p>
        </div>` : ""}
        <div>
          <div class="between" style="margin-bottom:var(--s2)">
            <span class="muted" style="font-size:var(--t-sm)">Cohorte</span>
            <b class="tnum">${cl.length} / 10</b>
          </div>
          <div class="bar"><i style="width:${Math.min(100, (cl.length / 10) * 100)}%"></i></div>
          <p class="hint">${cl.length} entreprise${cl.length > 1 ? "s" : ""} sur les dix
            nécessaires. Le classement sera publié lorsque la cohorte atteindra ce seuil.</p>
        </div>
      </div>`));
      return;
    }
    tete.style.display = "";
    el.querySelector("#titreClassement").textContent = "Classement de la saison";
    el.querySelector("#etatCohorte").textContent = "Cohorte constituée";
    el.querySelector("#etatCohorte").className = "badge badge--ok";
    if (!cl.length){ tb.appendChild(h(`<tr><td colspan="4" class="empty">Aucune entreprise dans cette catégorie.</td></tr>`)); return; }
    cl.forEach(e => {
      const moiOrg = e.id === u.org;
      tb.appendChild(h(`<tr style="${moiOrg ? "background:var(--forest-050)" : ""}">
        <td>${e.rang}</td>
        <td><strong>${esc(e.nom)}</strong>${moiOrg ? ` <span class="muted">(vous)</span>` : ""}${
          decile && e.rang <= seuil ? ` <span class="badge badge--brand" style="height:20px;margin-left:6px">top 10 %</span>` : ""}
          <br><span class="muted" style="font-size:var(--t-xs)">${esc(e.categorie.label)} · ${e.engages}/${e.effectif} de l'effectif${
            e.ecrete ? ` · ${nb(e.ecrete)} points écrêtés` : ""}</span></td>
        <td style="width:30%"><div class="bar"><i style="width:${(e[cle] / max) * 100}%"></i></div></td>
        <td class="tnum" style="text-align:right"><strong>${mode === "brut" ? nb(e.points) : pct(e.parSalarie)}</strong>
          <br><span class="muted" style="font-size:var(--t-xs)">${mode === "brut" ? "points" : "pts / salarié"}</span></td>
      </tr>`));
    });
  };

  el.querySelectorAll("#modes .tab").forEach(t => t.onclick = () => {
    el.querySelectorAll("#modes .tab").forEach(x => x.classList.remove("is-active"));
    t.classList.add("is-active"); mode = t.dataset.m; dessine();
  });
  el.querySelector("#detail").onclick = () => {
    const e = DB.entreprise(u.org);
    const pts = DB.pointsDe(u.org);
    const base = Math.max(e.effectif || 1, 1);
    const ms = DB.missions({ entreprise: u.org })
                 .filter(m => m.etat === "validee" || m.etat === "validee_auto");
    const corps = h(`<div>
      <p class="muted" style="font-size:var(--t-sm)">
        Voici l'addition complète, dans l'ordre du règlement. Vous pouvez la refaire à la main
        à partir de l'export : si nos deux résultats diffèrent, c'est nous qui avons tort.</p>
      <div class="calculBox">
        ${Object.entries(BAREME).map(([k, b]) => {
          const v = pts.parType[k] || 0;
          return v ? `<div class="calculBox__l"><span>${esc(b.label)}</span>
            <span class="tnum">${nb(v)} pts</span></div>` : "";
        }).join("")}
        <div class="calculBox__l calculBox__l--t"><span>Total brut</span>
          <span class="tnum">${nb(pts.brut)} pts</span></div>
        <div class="calculBox__l"><span class="muted">Plafond par format, 50 % de ${nb(pts.brut)}</span>
          <span class="tnum muted">${nb(pts.plafond)} pts</span></div>
        ${pts.ecrete ? `<div class="calculBox__l"><span class="muted">Écrêtage</span>
          <span class="tnum muted">− ${nb(pts.ecrete)} pts</span></div>` : ""}
        <div class="calculBox__l calculBox__l--t"><span>Points retenus</span>
          <span class="tnum">${nb(pts.retenu)} pts</span></div>
        <div class="calculBox__l"><span class="muted">Effectif déclaré</span>
          <span class="tnum muted">${nb(base)}</span></div>
        <div class="calculBox__l calculBox__l--t"><span>Score, ${nb(pts.retenu)} ÷ ${nb(base)}</span>
          <span class="tnum">${pct(Math.round((pts.retenu / base) * 10) / 10)} pts / salarié</span></div>
      </div>
      <p class="hint">${ms.length} mission${ms.length > 1 ? "s" : ""} validée${ms.length > 1 ? "s" : ""}
        entre${ms.length > 1 ? "nt" : ""} dans ce calcul.</p>
    </div>`);
    modal("Le détail de votre score", corps, [
      { label:"Fermer" },
      { label:"Exporter les missions", classe:"btn--primary", onClick: () => {
          versCSV("riseva-detail-score.csv",
            ["Mission", "Association", "Format", "Date", "Quantité", "Points"],
            ms.map(m => { const a = DB.annonceDe(m);
              return [a.titre, (DB.association(a.asso) || {}).nom, BAREME[a.type].label,
                      m.date, m.quantite, m.points]; }));
          toast("Export téléchargé."); return false; }}
    ]);
  };
  el.querySelector("#cat").value = categorie || "";
  el.querySelector("#cat").onchange = (e) => { categorie = e.target.value; dessine(); };
  el.querySelector("#csvCl").onclick = () => {
    const cl = DB.classement({ mode, categorie: categorie || null });
    versCSV("riseva-classement.csv",
      ["Rang", "Entreprise", "Catégorie", "Effectif", "Points retenus", "Points bruts",
       "Points par salarié", "Participation dans l'effectif %", "Activation des inscrits %"],
      cl.map(e => [e.rang, e.nom, e.categorie.label, e.effectif, e.points, e.brut,
                   e.parSalarie, e.participation, e.activation]));
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
  const lien = inv ? lienPublic(`/rejoindre.html?code=${inv.code}`) : "";

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
      <div class="row" style="gap:var(--s3);flex-wrap:wrap;margin-bottom:var(--s5)">
        <input class="input" id="q" placeholder="Rechercher un nom ou une adresse" style="flex:1;min-width:220px">
        <select class="select" id="etat" style="width:200px">
          <option value="">Tous les états</option>
          <option value="actif">Actifs</option>
          <option value="suspendu">Suspendus</option>
          <option value="anonyme">Départs anonymisés</option>
        </select>
      </div>
      <table class="table"><thead><tr>
        <th>Nom</th><th>Email</th><th>Points des missions</th><th>État</th><th></th></tr></thead><tbody></tbody></table>
      <p class="hint" id="compte"></p>
      <p class="hint">Les points affichés ici sont ceux des missions. Les dons personnels d'un
        salarié n'y figurent pas et ne vous sont jamais rattachés à un nom : la cause d'une
        association peut révéler une conviction ou un état de santé.</p>
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
          <h3>Domaines autorisés</h3>
          <span class="badge ${DB.domaines(eid).length ? "badge--ok" : "badge--danger"}">${
            DB.domaines(eid).length ? "Restreint" : "Ouvert à tous"}</span>
        </div>
        <p class="muted" style="font-size:var(--t-sm)">
          Seules les adresses de ces domaines peuvent créer un compte avec votre lien.
          <strong style="color:var(--ink)">Sans restriction, un lien qui fuite laisse
          n'importe qui entrer chez vous.</strong></p>
        <div class="field" style="margin-top:var(--s5)">
          <input class="input" id="dom" value="${esc(DB.domaines(eid).join(", "))}"
            placeholder="entreprise.fr, filiale.com">
          <p class="hint">Séparés par des virgules. Laisser vide retire la protection.</p>
        </div>
        <button class="btn btn--primary btn--sm" style="margin-top:var(--s3)" id="saveDom">Enregistrer</button>
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
          <input class="input" id="lien" aria-label="Lien d'inscription à partager avec vos salariés" value="${esc(lien)}" readonly>
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
      <td class="tnum">${nb(DB.pointsVisiblesEmployeur(g.id))}</td>
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
      /* Suspendre et retirer ne sont pas la même chose, et les confondre coûte cher :
         l'un est réversible et ne touche à rien, l'autre efface une identité pour de bon. */
      const sus = h(`<button class="btn btn--quiet btn--sm"${
        dernierAdmin && g.actif ? " disabled title=\"Dernier administrateur actif\"" : ""}>${
        g.actif ? "Suspendre l'accès" : "Réactiver"}</button>`);
      sus.onclick = () => {
        if (g.actif){
          modal("Suspendre l'accès de " + g.nom,
            `<p class="muted">Ses sessions sont fermées immédiatement et il ne peut plus se
             connecter. <strong style="color:var(--ink)">Rien n'est effacé</strong> : ses données,
             ses missions et le journal restent en place, et vous pouvez le réactiver quand vous
             voulez. Sa place reste occupée.</p>`,
            [{ label:"Annuler" },
             { label:"Suspendre l'accès", classe:"btn--primary", onClick: () => {
                 try { DB.suspendreAcces(g.id, true); } catch (err){ toast(err.message); return false; }
                 toast("Accès suspendu."); rendre(); }}]);
        } else {
          DB.suspendreAcces(g.id, false); toast("Accès rétabli."); rendre();
        }
      };
      tr.lastElementChild.appendChild(sus);
      const b = h(`<button class="btn btn--quiet btn--sm" style="color:var(--danger)"${
        dernierAdmin ? " disabled title=\"Nommez un autre administrateur avant de retirer celui-ci\"" : ""}>Retirer définitivement</button>`);
      b.onclick = () => modal("Retirer définitivement " + g.nom,
        `<p class="muted">Pour une absence, un doute ou un départ pas encore confirmé, préférez
         <strong style="color:var(--ink)">suspendre l'accès</strong> : c'est réversible et rien
         n'est effacé.</p>
         <p class="muted" style="margin-top:var(--s4)">Ici, son compte est fermé et sa place est
         rendue à votre abonnement.</p>
         <p class="muted" style="margin-top:var(--s4)">Son nom et son adresse disparaissent de la
         plateforme. Il apparaîtra désormais comme <strong>salarié retiré</strong> dans les listes et
         dans l'historique des missions. Les ${nb(DB.pointsVisiblesEmployeur(g.id))} points qu'il a rapportés restent
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
  const PAGE = 25;
  let page = 1;
  const dessiner = () => {
    const q = el.querySelector("#q").value.trim().toLowerCase();
    const et = el.querySelector("#etat").value;
    let l = [...actifs, ...partis].filter(g => {
      if (q && !((g.nom + " " + (g.email || "")).toLowerCase().includes(q))) return false;
      if (et === "actif")    return !g.anonyme && g.actif;
      if (et === "suspendu") return !g.anonyme && !g.actif;
      if (et === "anonyme")  return g.anonyme;
      return true;
    });
    const total = l.length;
    l = l.slice(0, page * PAGE);
    tb.innerHTML = "";
    if (!total){
      tb.appendChild(h(`<tr><td colspan="5" class="empty">${gens.length
        ? "Personne ne correspond à cette recherche."
        : "Personne pour l'instant. Diffusez le lien d'inscription, chacun crée son compte."}</td></tr>`));
    }
    l.forEach(g => tb.appendChild(ligne(g)));
    const c = el.querySelector("#compte");
    c.textContent = total > l.length
      ? `${l.length} sur ${total} affichés.`
      : (total ? `${total} personne${total > 1 ? "s" : ""}.` : "");
    if (total > l.length){
      const b = h(`<button class="btn btn--ghost btn--sm" style="margin-top:var(--s3)">Afficher la suite</button>`);
      b.onclick = () => { page++; dessiner(); };
      c.after(b);
    }
  };
  el.querySelector("#q").addEventListener("input", () => { page = 1; dessiner(); });
  el.querySelector("#etat").addEventListener("change", () => { page = 1; dessiner(); });
  dessiner();

  el.querySelector("#saveDom").onclick = () => {
    const l = el.querySelector("#dom").value.split(",").filter(x => x.trim());
    const enregistrer = () => {
      DB.majDomaines(eid, l);
      toast(l.length ? "Domaines enregistrés." : "Restriction retirée.");
      rendre();
    };
    if (!l.length && DB.domaines(eid).length){
      modal("Retirer la restriction de domaine",
        `<p class="muted">Sans domaine déclaré, <strong style="color:var(--ink)">n'importe qui
         disposant du lien pourra créer un compte dans votre entreprise</strong>, y compris
         quelqu'un à qui il aurait été transféré par erreur.</p>
         <p class="hint" style="margin-top:var(--s4)">Si vous voulez seulement fermer les
         inscriptions, révoquez le lien : c'est plus sûr et réversible.</p>`,
        [{ label:"Annuler" },
         { label:"Retirer quand même", classe:"btn--primary", onClick: enregistrer }]);
      return;
    }
    enregistrer();
  };
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
    versCSV("riseva-equipe.csv", ["Nom", "Email", "Points des missions", "État"],
      gens.map(g => [g.nom, g.email || "", DB.pointsVisiblesEmployeur(g.id),
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
  const liste = DB.rapports(u.org);
  const res = DB.impactReseau();
  const maxT = Math.max(...r.trimestres.map(t => t.points), 1);
  const v = DB.valorisationMecenat(u.org);
  const fa = DB.etatFacturation(u.org);
  const cout = r.missions && fa.contrat
    ? { valeur: Math.round(fa.contrat.montant_ht / r.missions),
        abonnement: fa.contrat.montant_ht, missions: r.missions }
    : null;

  const el = h(`<div class="stack" style="--gap:var(--s5)">
    <section class="card">
      <div class="between" style="margin-bottom:var(--s5)">
        <div><h3>Vos rapports</h3>
        <p class="muted" style="font-size:var(--t-sm);margin-top:4px">
          Générés automatiquement à la clôture de chaque période. Rien à demander,
          rien à consolider.</p></div>
      </div>
      <table class="table"><thead><tr>
        <th>Rapport</th><th>Période</th><th>Points</th><th>État</th><th></th>
      </tr></thead><tbody></tbody></table>
    </section>

    <section class="card" id="apercu" style="padding:var(--s10)">
      <div class="between" style="align-items:flex-start">
        <div>
          <p class="eyebrow">Aperçu du rapport annuel</p>
          <h2 style="margin-top:var(--s3)">${esc(r.entreprise.nom)} — ${esc(r.saison.nom)}</h2>
          <p class="muted" style="margin-top:var(--s3);font-size:var(--t-sm)">
            Construit à partir des missions validées. Ce que vous voyez ici est ce que
            contiendra le document final.</p>
        </div>
        <div class="row" style="gap:var(--s2);flex-wrap:wrap">
          <button class="btn btn--primary btn--sm" id="preuve">Dossier de preuve</button>
          <button class="btn btn--ghost btn--sm" id="csv">CSV</button>
          <button class="btn btn--ghost btn--sm" id="pdf">Imprimer</button>
        </div>
      </div>
      <hr class="sep">
      <div class="kpis">
        <div class="card kpi kpi--tete grain"><span class="kpi__label">Points retenus</span>
          <span class="kpi__value">${nb(r.points)}</span></div>
        ${kpi("Salariés mobilisés", nb(r.salariesEngages),
            `${pct(DB.indicateurs(u.org).participation.valeur ?? 0)} % de l'effectif (${r.salariesEngages}/${r.salariesTotal})`)}
        ${kpi("Associations soutenues", nb(r.associations))}
        ${/* Le coût par mission a sa place ici, dans un document de pilotage, avec
              sa formule sous les yeux — pas en quatrième KPI d'accueil, où quatre
              missions suffisent à le faire varier du simple au double. */
          kpi("Coût par mission validée", cout ? eur(cout.valeur) : "—",
            cout ? `${eur(cout.abonnement)} / ${nb(cout.missions)} missions` : "aucune mission validée")}
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
          <hr class="sep">
          <h3>Valorisation fiscale</h3>
          <div class="stack" style="--gap:var(--s3);margin-top:var(--s5);font-size:var(--t-sm)">
            <div class="between"><span class="muted">Assiette de l'entreprise</span>
              <span class="tnum">${eur(v.assietteRetenue)}</span></div>
            <div class="between"><span class="muted">Réduction d'impôt estimée</span>
              <strong class="tnum" style="color:var(--forest-800)">${eur(v.reduction)}</strong></div>
            <div class="between"><span class="muted">Dont mécénat de compétences</span>
              <span class="tnum">${eur(v.competencesRetenu)}</span></div>
            <div class="between"><span class="muted">Dons des salariés, hors assiette</span>
              <span class="tnum">${eur(v.donsSalaries)}</span></div>
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
      <div id="reaEnt"></div>
      <h3>Impact du réseau</h3>
      <p class="muted" style="margin-top:var(--s3);max-width:70ch;font-size:var(--t-sm)">
        Ce volet est commun à toutes les entreprises de la saison. Il rend compte de ce que le
        réseau a accompli dans son ensemble. Aucun de ces chiffres n'est attribuable à une
        entreprise en particulier, et il ne faut pas les présenter comme tels.</p>
      <div class="kpis" style="margin-top:var(--s6)">
        ${kpi("Entreprises engagées", nb(res.entreprises))}
        ${kpi("Associations soutenues", nb(res.associations))}
        ${kpi("Heures de bénévolat", nb(res.heures), nb(res.demiJournees) + " demi-journées")}
        ${kpi("Dons versés", eur(res.euros), nb(res.materiel) + " dons de matériel")}
      </div>
      ${res.realisations && res.realisations.length ? `<div class="realis__grid" style="margin-top:var(--s8)">
        ${res.realisations.map(x => `<div class="realis__c">
          <span class="realis__n">${nb(Math.round(x.quantite))}</span>
          <span class="realis__l">${esc(x.pl)}</span></div>`).join("")}
      </div>` : ""}
    </section>
  </div>`);

  const reaE = bandeauRealisations(DB.realisations({ entreprise: u.org }),
    { titre: "Vos réalisations de la saison" });
  if (reaE){ reaE.classList.add("card--flat"); reaE.style.padding = "0";
             reaE.style.background = "transparent"; reaE.style.border = "0";
             el.querySelector("#reaEnt").appendChild(reaE); }

  const tb = el.querySelector("tbody");
  liste.forEach(x => {
    const tr = h(`<tr>
      <td><strong>${esc(x.titre)}</strong><br><span class="muted" style="font-size:var(--t-xs)">${
        x.portee === "annuel" ? "Bilan complet de la saison" : "Version courte, remise avec les trophées"}</span></td>
      <td class="muted">${dateCourte(x.periode.debut)} — ${dateCourte(x.periode.fin)}</td>
      <td class="tnum">${x.etat === "genere" ? nb(x.points) : "—"}</td>
      <td><span class="badge ${x.etat === "genere" ? "badge--ok" : ""}">${
        x.etat === "genere" ? "Généré le " + dateCourte(x.genere_le) : "À la clôture"}</span></td>
      <td style="text-align:right"></td></tr>`);
    if (x.etat === "genere"){
      const b = h(`<button class="btn btn--quiet btn--sm">Ouvrir</button>`);
      b.onclick = () => { el.querySelector("#apercu").scrollIntoView({ behavior:"smooth" });
                          toast("Aperçu affiché ci-dessous."); };
      tr.lastElementChild.appendChild(b);
    }
    tb.appendChild(tr);
  });

  el.querySelector("#preuve").onclick = () => ouvrirPreuve(u);
  el.querySelector("#pdf").onclick = () => { toast("Ouverture de l'aperçu d'impression."); setTimeout(() => window.print(), 400); };
  el.querySelector("#csv").onclick = () => {
    const ms = DB.missions({ entreprise: u.org })
                 .filter(m => m.etat === "validee" || m.etat === "validee_auto");
    versCSV(`riseva-rapport-${r.saison.nom.replace(/\s+/g, "-").toLowerCase()}.csv`,
      ["Mission", "Association", "Format", "Sur le temps de travail", "Salarié", "Date", "Quantité", "Points"],
      ms.map(m => { const a = DB.annonceDe(m), sal = DB.utilisateur(m.salarie);
        return [a.titre, (DB.association(a.asso) || {}).nom, BAREME[a.type].label,
                a.temps_travail ? "oui" : "non", sal ? sal.nom : "—", m.date, m.quantite, m.points]; }));
    toast("Export téléchargé.");
  };
  return el;
}

function vueAbonnement(u){
  const sa = DB.saison();
  const si = DB.sieges(u.org);
  const f = DB.etatFacturation(u.org);
  const c = f.contrat;
  const jours = DB.joursAvantFinSaison();
  const etats = { payee:["Payée","badge--ok"], a_venir:["À venir",""],
                  envoyee:["Envoyée","badge--info"], en_retard:["En retard","badge--danger"] };

  if (!c) return h(`<section class="card"><p class="empty">Aucun contrat rattaché à cette entreprise.</p></section>`);

  const el = h(`<div class="stack" style="--gap:var(--s5)">
    ${f.enRetard.length ? `<section class="card card--flat" style="background:var(--danger-bg);border-color:transparent">
      <div class="between" style="flex-wrap:wrap;gap:var(--s4)">
        <div><h3 style="font-size:var(--t-lg);color:var(--danger)">${f.enRetard.length} facture${f.enRetard.length > 1 ? "s" : ""} en retard</h3>
        <p class="muted" style="font-size:var(--t-sm);margin-top:4px;color:var(--ink-600)">
          Vos données restent accessibles et vos points sont conservés. Seule la publication de
          nouvelles missions est suspendue en attendant le règlement.</p></div>
        <span class="tnum" style="font-weight:600">${eur(f.du)} dus</span>
      </div>
    </section>` : ""}

    <div class="kpis">
      ${kpi("Abonnement", eur(c.montant_ht) + " HT", esc(sa.nom), "", "kpi--tete grain")}
      ${kpi("Places", si.pris + " / " + si.total, si.restants + " disponibles")}
      ${kpi("Fin de saison", jours + " j", dateFR(sa.fin))}
      ${kpi("Reste à régler", eur(f.du), f.du ? "prochaine échéance" : "tout est à jour")}
    </div>

    <div class="two">
      <section class="card">
        <div class="between" style="margin-bottom:var(--s5)">
          <h3>Factures</h3>
          <button class="btn btn--ghost btn--sm" id="csvF">Exporter</button>
        </div>
        <table class="table"><thead><tr>
          <th>Référence</th><th>Libellé</th><th>Émise</th><th>Échéance</th>
          <th style="text-align:right">HT</th><th style="text-align:right">TTC</th>
          <th>État</th><th></th>
        </tr></thead><tbody></tbody></table>
      </section>

      <div class="stack" style="--gap:var(--s5)">
        <section class="card">
          <h3>Le contrat</h3>
          <div class="stack" style="--gap:var(--s3);margin-top:var(--s5);font-size:var(--t-sm)">
            <div class="between"><span class="muted">Statut</span>
              <span class="badge ${c.statut === "actif" ? "badge--ok" : "badge--warn"}">${
                c.statut === "actif" ? "Actif" : "Suspendu"}</span></div>
            <div class="between"><span class="muted">Signé le</span><span>${dateFR(c.signe_le)}</span></div>
            <div class="between"><span class="muted">Période</span>
              <span>${dateFR(c.debut)} — ${dateFR(c.fin)}</span></div>
            <div class="between"><span class="muted">Acompte versé</span><span class="tnum">${eur(c.acompte)}</span></div>
            <div class="between"><span class="muted">Places incluses</span><span class="tnum">${si.total}</span></div>
          </div>
          <hr class="sep">
          <p class="muted" style="font-size:var(--t-sm)">
            L'acompte de ${eur(c.acompte)} est remboursé intégralement si la saison ne démarre pas.
            Aucune commission n'est prélevée sur les dons. Un salarié retiré libère sa place
            immédiatement.</p>
        </section>

        <section class="card">
          <div class="between" style="margin-bottom:var(--s4)">
            <h3>Saison suivante</h3>
            <span class="badge ${c.reconduction ? "badge--ok" : ""}">${c.reconduction ? "Reconduite" : "Non décidée"}</span>
          </div>
          <p class="muted" style="font-size:var(--t-sm)">
            <strong style="color:var(--ink)">Pas de reconduction tacite.</strong> Votre abonnement
            prend fin à la clôture de la saison, après remise du rapport annuel. Vous décidez
            ensuite, sans rien à résilier.</p>
          <div class="row" style="gap:var(--s2);margin-top:var(--s5)">
            <button class="btn ${c.reconduction ? "btn--ghost" : "btn--primary"} btn--sm" id="rec">
              ${c.reconduction ? "Annuler la reconduction" : "Reconduire pour la saison suivante"}</button>
          </div>
        </section>
      </div>
    </div>
  </div>`);

  const tb = el.querySelector("tbody");
  c.factures.forEach(fa => {
    const enRetard = fa.etat !== "payee" && fa.echeance < "2026-08-20";
    const cle = enRetard ? "en_retard" : fa.etat;
    const ttc = Math.round(fa.montant * (1 + FACTURATION.tva));
    const tr = h(`<tr>
      <td style="font-family:var(--font-mono);font-size:var(--t-xs)">${esc(fa.ref)}</td>
      <td><strong>${esc(fa.libelle)}</strong>${fa.periode
        ? `<br><span class="muted" style="font-size:var(--t-xs)">${esc(fa.periode)}</span>` : ""}</td>
      <td class="muted tnum">${dateCourte(fa.date)}</td>
      <td class="muted tnum">${dateCourte(fa.echeance)}</td>
      <td class="tnum" style="text-align:right">${eur(fa.montant)}</td>
      <td class="tnum" style="text-align:right"><strong>${eur(ttc)}</strong></td>
      <td><span class="badge ${(etats[cle] || etats.a_venir)[1]}">${(etats[cle] || etats.a_venir)[0]}</span></td>
      <td style="text-align:right"></td></tr>`);
    const b = h(`<button class="btn btn--quiet btn--sm">Voir</button>`);
    b.onclick = () => ouvrirFacture(u, fa);
    tr.lastElementChild.appendChild(b);
    tb.appendChild(tr);
  });

  el.querySelector("#csvF").onclick = () => {
    versCSV("riseva-factures.csv",
      ["Référence", "Libellé", "Période", "Émise", "Échéance", "HT", "TVA", "TTC", "État"],
      c.factures.map(fa => [fa.ref, fa.libelle, fa.periode || "", fa.date, fa.echeance,
        fa.montant, Math.round(fa.montant * FACTURATION.tva),
        Math.round(fa.montant * (1 + FACTURATION.tva)), fa.etat]));
    toast("Export téléchargé.");
  };
  el.querySelector("#rec").onclick = () => {
    DB.reconduire(u.org, !c.reconduction);
    toast(c.reconduction ? "Reconduction annulée." : "Reconduction enregistrée, nous reviendrons vers vous.");
    rendre();
  };
  return el;
}

/* Facture conforme, ouverte dans un onglet. Les mentions ne sont pas décoratives :
   numéro unique dans une séquence continue, dates, identité des parties, désignation
   et période de la prestation, montants HT, TVA et TTC, échéance, pénalités de retard
   et indemnité forfaitaire de recouvrement de 40 € (article L. 441-9 du code de commerce).
   Conservation dix ans. */
/* Dossier de preuve : une page que le responsable RSE pose sur le bureau de sa
   direction et de son expert-comptable. Chaque chiffre y arrive avec son numérateur,
   son dénominateur et sa méthode. Rien n'y est arrondi en sa faveur. */
function ouvrirPreuve(u){
  const e = DB.entreprise(u.org);
  const ind = DB.indicateurs(u.org);
  const pts = DB.pointsDe(u.org);
  const v = DB.valorisationMecenat(u.org);
  const rea = DB.realisations({ entreprise: u.org });
  const cl = DB.classement({ categorie: (DB.classement().find(x => x.id === u.org) || {}).categorie?.id });
  const rang = cl.findIndex(x => x.id === u.org) + 1;
  const ms = DB.missions({ entreprise: u.org })
               .filter(m => ["validee", "validee_auto"].includes(m.etat));
  const missionsTT = ms.filter(m => (DB.annonceDe(m) || {}).temps_travail);
  const assosTT = [...new Set(missionsTT.map(m => (DB.annonceDe(m) || {}).asso))];
  const assosOk = assosTT.filter(a => DB.eligibleMecenat(a));
  const sa = DB.saison();

  const l = (cle, valeur, methode) => `<tr>
    <td>${cle}</td>
    <td class="v">${valeur}</td>
    <td class="m">${methode}</td></tr>`;

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<title>Dossier de preuve — ${esc(e.nom)}, ${esc(sa.nom)}</title>
<style>
  body{font:13.5px/1.6 -apple-system,Segoe UI,Inter,sans-serif;color:#2C3026;background:#F2F0E9;
    margin:0;padding:40px 20px}
  .p{max-width:900px;margin:0 auto;background:#FAF9F5;padding:48px;border-radius:12px;
    box-shadow:0 24px 48px -20px rgba(11,38,32,.18)}
  h1{font-size:23px;letter-spacing:-.02em;color:#131510;margin:0 0 4px}
  .st{color:#63675C;margin:0}
  h2{font-size:15px;color:#131510;margin:30px 0 6px;padding-top:18px;border-top:1px solid #E5E2D9}
  table{width:100%;border-collapse:collapse;margin-top:10px}
  th{text-align:left;font-size:12px;color:#63675C;font-weight:600;
    padding:0 10px 7px 0;border-bottom:1px solid #E5E2D9}
  td{padding:9px 10px 9px 0;border-bottom:1px solid #EFEDE6;vertical-align:top}
  td:first-child{width:34%;color:#131510}
  td.v{width:20%;font-variant-numeric:tabular-nums;font-weight:600;color:#131510}
  td.m{color:#63675C;font-size:12.5px}
  .note{background:#DFE6D0;border-radius:8px;padding:14px;font-size:12.5px;margin-top:14px}
  .alerte{background:#F6EAD5}
  .pied{margin-top:28px;font-size:11.5px;color:#8A8F82;line-height:1.55}
  @media print{body{background:#fff;padding:0}.p{box-shadow:none;padding:0;background:#fff}
    .noprint{display:none}h2{page-break-after:avoid}tr{break-inside:avoid}}
  .noprint{text-align:center;margin-bottom:20px}
  .noprint button{font:inherit;background:#131510;color:#F2F0E9;border:0;border-radius:12px;
    padding:11px 22px;cursor:pointer}
</style></head><body>
<div class="noprint"><button onclick="window.print()">Imprimer ou enregistrer en PDF</button></div>
<div class="p">
  <h1>Dossier de preuve</h1>
  <p class="st">${esc(e.nom)} — ${esc(sa.nom)} — édité le ${dateFR(new Date().toISOString())}</p>
  <p class="st" style="margin-top:10px">Destiné à la direction et à l'expert-comptable. Chaque
  chiffre est donné avec sa méthode de calcul. Les données brutes correspondantes sont
  exportables au format CSV depuis l'espace client.</p>

  <h2>1. Population et période</h2>
  <table>
    <thead><tr><th>Élément</th><th>Valeur</th><th>Méthode</th></tr></thead>
    <tbody>
      ${l("Effectif de référence", nb(e.effectif || 0),
          "Effectif déclaré par l'entreprise à l'ouverture, gelé pour la saison. Sert de dénominateur à tous les taux.")}
      ${l("Places de l'abonnement", nb(DB.sieges(u.org).total),
          "Nombre de comptes que le lien d'inscription peut ouvrir.")}
      ${l("Comptes créés", nb(ind.reperes.R90),
          "Comptes uniques, non anonymisés, appartenant à l'effectif de référence.")}
      ${l("Période", dateFR(sa.debut) + " au " + dateFR(sa.fin),
          "Saison contractuelle. Les validations sont closes quatorze jours après la fin.")}
    </tbody>
  </table>

  <h2>2. Participation</h2>
  <table>
    <thead><tr><th>Indicateur</th><th>Valeur</th><th>Méthode</th></tr></thead>
    <tbody>
      ${l("Participation dans l'effectif", ind.participation.valeur == null ? "—" : pct(ind.participation.valeur) + " %",
          `${ind.participation.num} salariés ayant au moins une action validée, divisés par ${ind.participation.den} de l'effectif de référence. Une inscription seule ne compte pas.`)}
      ${l("Actions validées", nb(ind.reperes.X),
          "Combinaisons uniques salarié × association × format × date. Deux versements au même organisme le même jour ne font qu'une action.")}
      ${l("Concentration", (ind.concentration.valeur ?? "—") + " %",
          "Part des actions portée par les 10 % de salariés les plus actifs. Une valeur élevée signale un dispositif tenu par quelques personnes.")}
    </tbody>
  </table>

  <h2>3. Temps de travail et temps personnel</h2>
  <table>
    <thead><tr><th>Élément</th><th>Valeur</th><th>Méthode</th></tr></thead>
    <tbody>
      ${l("Demi-journées sur le temps de travail", nb(v.demiJourneesTT),
          "Missions dont l'annonce porte la mention temps de travail, validées par l'association.")}
      ${l("Demi-journées sur le temps personnel", nb(v.demiJourneesPerso),
          "Bénévolat à l'initiative du salarié. Ne se valorise pas.")}
      ${l("Heures mises à disposition", nb(v.demiJourneesTT * 4),
          "Quatre heures par demi-journée. Seules les heures validées comptent.")}
    </tbody>
  </table>

  <h2>4. Dons</h2>
  <table>
    <thead><tr><th>Élément</th><th>Valeur</th><th>Méthode</th></tr></thead>
    <tbody>
      ${l("Dons versés par l'entreprise", eur(v.donsEntreprise),
          "Entrent dans l'assiette de l'entreprise. Reçu au modèle " + esc(FISCAL.cerfa_entreprise) + ".")}
      ${l("Dons personnels des salariés", eur(v.donsSalaries),
          "N'entrent PAS dans l'assiette de l'entreprise. Reçus individuels au modèle " + esc(FISCAL.cerfa_particulier) + ", au nom de chaque salarié.")}
    </tbody>
  </table>
  <div class="note alerte">L'article 238 bis vise les versements effectués par l'entreprise
  elle-même. Faire entrer les dons personnels des salariés dans son assiette produirait une
  réduction d'impôt indue.</div>

  <h2>5. Valorisation du mécénat</h2>
  <table>
    <thead><tr><th>Élément</th><th>Valeur</th><th>Méthode</th></tr></thead>
    <tbody>
      ${l("Coût journalier chargé retenu", eur(e.cout_jour_moyen || 0),
          "Renseigné par l'entreprise, sous sa responsabilité. Rémunération brute et charges, divisées par 220 jours ouvrés.")}
      ${l("Mécénat de compétences", eur(v.competencesRetenu),
          `Coût de revient au prorata du temps validé. Écrêtage par salarié à ${eur(v.plafondSalarie)}${v.ecreteParSalarie ? ", soit " + eur(v.ecreteParSalarie) + " écartés" : ""}.`)}
      ${l("Assiette de l'entreprise", eur(v.assiette),
          "Dons de l'entreprise plus mécénat de compétences retenu.")}
      ${l("Plafond de l'entreprise", eur(v.plafondEntreprise),
          "Le plus élevé entre 20 000 € et 5 pour mille du chiffre d'affaires HT déclaré.")}
      ${l("Réduction d'impôt estimée", eur(v.reduction),
          "60 % de l'assiette retenue. Estimation, non déclaration : votre expert-comptable arrête le chiffre.")}
    </tbody>
  </table>

  <h2>6. Pièces justificatives</h2>
  <table>
    <thead><tr><th>Pièce</th><th>État</th><th>Où</th></tr></thead>
    <tbody>
      ${l("Associations bénéficiaires éligibles au mécénat", assosOk.length + " / " + assosTT.length,
          "Éligibilité déclarée par chaque association. Riseva ne la certifie pas.")}
      ${l("Conventions de mise à disposition", nb(missionsTT.length) + " à éditer",
          "Une par mission sur le temps de travail, article L. 8241-3. Éditables depuis l'écran Mécénat.")}
      ${l("Feuilles d'émargement", "à conserver",
          "Signées sur place, conservées par l'entreprise et l'association pendant six ans. Riseva n'est pas une archive à valeur probante.")}
      ${l("Reçus fiscaux", "émis par les associations",
          "Sous leur numérotation et leur signature. Riseva prépare, elle n'émet pas.")}
    </tbody>
  </table>

  <h2>7. Points et classement</h2>
  <table>
    <thead><tr><th>Élément</th><th>Valeur</th><th>Méthode</th></tr></thead>
    <tbody>
      ${l("Points réalisés", nb(pts.brut), "Somme des points des missions validées, au barème publié.")}
      ${l("Points écrêtés", nb(pts.ecrete), "Aucun format ne peut peser plus de 50 % du total.")}
      ${l("Points retenus", nb(pts.retenu), "Ce qui compte au classement.")}
      ${l("Score", (Math.round((pts.retenu / Math.max(e.effectif || 1, 1)) * 10) / 10) + " par salarié",
          "Points retenus divisés par l'effectif de référence.")}
      ${l("Rang", rang + " sur " + cl.length,
          cl.length < 10
            ? "Cohorte de moins de dix entreprises : rang indicatif, sans percentile ni trophée."
            : "Catégorie de taille comparable, recalculé chaque lundi.")}
    </tbody>
  </table>

  ${rea.liste.length ? `<h2>8. Réalisations</h2>
  <table>
    <thead><tr><th>Unité</th><th>Quantité</th><th>Méthode</th></tr></thead>
    <tbody>
      ${rea.liste.map(x => l(esc(x.pl), nb(Math.round(x.quantite)),
        "Déclaré par l'association bénéficiaire au moment de valider la mission. Riseva additionne, elle n'audite pas.")).join("")}
    </tbody>
  </table>` : ""}

  <p class="pied">
    Le score mesure un engagement, pas un impact environnemental ou social, et ne doit pas être
    présenté comme tel. Les règles complètes du calcul sont publiques sur riseva.fr/reglement.html,
    avec un exemple chiffré qui se refait à la main. En cas d'écart entre ce document et vos
    propres calculs, écrivez-nous : c'est nous qui avons tort.
  </p>
</div></body></html>`;

  const w = window.open("", "_blank");
  if (!w){ toast("Autorisez les fenêtres pour ouvrir le dossier."); return; }
  w.document.write(html); w.document.close();
  toast("Dossier de preuve ouvert dans un nouvel onglet.");
}

function ouvrirFacture(u, fa){
  const e = DB.entreprise(u.org);
  const ht = fa.montant;
  const tva = Math.round(ht * FACTURATION.tva);
  const ttc = ht + tva;
  const champ = (x) => x || `<span class="v">[à compléter]</span>`;

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<title>Facture ${esc(fa.ref)} — Riseva</title>
<style>
  body{font:14px/1.6 -apple-system,Segoe UI,Inter,sans-serif;color:#2C3026;background:#F2F0E9;
    margin:0;padding:44px 20px}
  .p{max-width:720px;margin:0 auto;background:#FAF9F5;padding:48px;border-radius:12px;
    box-shadow:0 24px 48px -20px rgba(11,38,32,.18)}
  h1{font-size:22px;letter-spacing:-.02em;color:#131510;margin:0}
  .ref{font-family:ui-monospace,Menlo,monospace;color:#63675C;margin-top:4px}
  .cols{display:flex;gap:36px;margin-top:32px}
  .cols>div{flex:1;font-size:13px}
  .t{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#8A8F82;margin-bottom:6px}
  table{width:100%;border-collapse:collapse;margin-top:32px}
  th{text-align:left;font-size:11px;letter-spacing:.06em;text-transform:uppercase;
    color:#63675C;padding:0 0 8px;border-bottom:1px solid #E5E2D9}
  td{padding:12px 0;border-bottom:1px solid #E5E2D9;vertical-align:top}
  .r{text-align:right;font-variant-numeric:tabular-nums}
  .tot{margin-top:20px;margin-left:auto;width:280px;font-variant-numeric:tabular-nums}
  .tot div{display:flex;justify-content:space-between;padding:7px 0}
  .tot .g{border-top:2px solid #131510;margin-top:6px;padding-top:10px;
    font-weight:600;color:#131510;font-size:16px}
  .m{margin-top:32px;font-size:11.5px;color:#63675C;line-height:1.55}
  .v{background:#F6EAD5;padding:0 4px;border-radius:3px}
  @media print{body{background:#fff;padding:0}.p{box-shadow:none;padding:0;background:#fff}
    .noprint{display:none}}
  .noprint{text-align:center;margin-bottom:20px}
  .noprint button{font:inherit;background:#131510;color:#F2F0E9;border:0;border-radius:12px;
    padding:11px 22px;cursor:pointer}
</style></head><body>
<div class="noprint"><button onclick="window.print()">Imprimer ou enregistrer en PDF</button></div>
<div class="p">
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div><h1>Facture</h1><p class="ref">${esc(fa.ref)}</p></div>
    <div style="text-align:right;font-size:13px;color:#63675C">
      Émise le ${dateFR(fa.date)}<br>Échéance le ${dateFR(fa.echeance)}</div>
  </div>

  <div class="cols">
    <div>
      <p class="t">Émetteur</p>
      <strong style="color:#131510">Riseva</strong><br>
      ${champ("")}<br>SIREN ${champ("")}<br>TVA intracommunautaire ${champ("")}<br>
      contact@riseva.fr
    </div>
    <div>
      <p class="t">Client</p>
      <strong style="color:#131510">${esc(e.nom)}</strong><br>
      ${champ(esc(e.adresse || ""))}<br>SIRET ${champ(esc(e.siret || ""))}<br>
      ${esc(e.referent || "")}
    </div>
  </div>

  <table>
    <thead><tr><th>Désignation</th><th>Période</th><th class="r">Montant HT</th></tr></thead>
    <tbody><tr>
      <td><strong style="color:#131510">${esc(fa.libelle)}</strong><br>
        <span style="color:#63675C">Abonnement à la plateforme Riseva, ${DB.sieges(u.org).total} places</span></td>
      <td style="color:#63675C">${esc(fa.periode || "")}</td>
      <td class="r">${eur(ht)}</td>
    </tr></tbody>
  </table>

  <div class="tot">
    <div><span style="color:#63675C">Total HT</span><span>${eur(ht)}</span></div>
    <div><span style="color:#63675C">TVA ${nb(FACTURATION.tva * 100)} %</span><span>${eur(tva)}</span></div>
    <div class="g"><span>Total TTC</span><span>${eur(ttc)}</span></div>
  </div>

  <p class="m">
    Paiement à ${FACTURATION.delai_paiement_jours} jours à compter de la date d'émission.<br>
    En cas de retard, pénalités au ${esc(FACTURATION.penalites_taux)}, exigibles sans rappel,
    et indemnité forfaitaire pour frais de recouvrement de ${eur(FACTURATION.indemnite_recouvrement)}
    (articles L. 441-9 et L. 441-10 du code de commerce). Pas d'escompte pour paiement anticipé.<br>
    Aucune commission n'est prélevée sur les dons versés aux associations, qui ne transitent
    jamais par Riseva et ne figurent pas sur cette facture.<br>
    Document conservé ${FACTURATION.conservation_ans} ans.
  </p>
</div></body></html>`;

  const w = window.open("", "_blank");
  if (!w){ toast("Autorisez les fenêtres pour ouvrir la facture."); return; }
  w.document.write(html); w.document.close();
  toast("Facture ouverte dans un nouvel onglet.");
}

function vueParametres(u){
  const e = DB.entreprise(u.org);
  const si = DB.sieges(u.org);
  const el = h(`<div class="two">
    <section class="card" style="padding:var(--s8)">
      <h3>Votre entreprise</h3>
      <div class="stack" style="--gap:var(--s4);margin-top:var(--s6)">
        <div class="field"><label>Raison sociale</label><input class="input" id="nom" value="${esc(e.nom)}"></div>
        <div class="row" style="gap:var(--s4);align-items:stretch">
          <div class="field" style="flex:1"><label>SIRET</label>
            <input class="input" id="siret" value="${esc(e.siret || "")}" placeholder="14 chiffres"></div>
          <div class="field" style="flex:1"><label>Secteur</label>
            <input class="input" id="secteur" value="${esc(e.secteur || "")}"></div>
        </div>
        <div class="field"><label>Adresse de facturation</label>
          <input class="input" id="adresse" value="${esc(e.adresse || "")}"></div>
        <div class="row" style="gap:var(--s4);align-items:stretch">
          <div class="field" style="flex:1"><label>Plateforme de réception des factures</label>
            <input class="input" id="pdp" value="${esc((DB.contrat(u.org) || {}).plateforme_reception || "")}"
              placeholder="Nom de votre plateforme agréée"></div>
          <div class="field" style="flex:1"><label>Identifiant annuaire</label>
            <input class="input" id="annu" value="${esc((DB.contrat(u.org) || {}).annuaire_id || "")}"
              placeholder="SIRET ou routage"></div>
        </div>
        <p class="hint">Depuis le 1<sup>er</sup> septembre 2026, toute entreprise doit pouvoir
          recevoir ses factures par une plateforme agréée : un PDF par courriel ne suffit plus.
          Dites-nous laquelle vous utilisez et nous vous adressons vos factures dessus.</p>
        <div class="row" style="gap:var(--s4);align-items:stretch">
          <div class="field" style="flex:1"><label>Référent Riseva</label>
            <input class="input" id="ref" value="${esc(e.referent || "")}"></div>
          <div class="field" style="flex:1"><label>Son email</label>
            <input class="input" id="refmail" type="email" value="${esc(e.referent_mail || "")}"></div>
        </div>
      </div>
      <button class="btn btn--primary" style="margin-top:var(--s6)" id="save">Enregistrer</button>
    </section>

    <div class="stack" style="--gap:var(--s5)">
      <section class="card">
        <h3>Données de valorisation</h3>
        <p class="muted" style="font-size:var(--t-sm);margin-top:var(--s3)">
          Ces deux chiffres servent uniquement à estimer votre mécénat. Ils ne sortent jamais
          de votre espace et n'apparaissent dans aucun classement.</p>
        <div class="stack" style="--gap:var(--s4);margin-top:var(--s5)">
          <div class="field"><label>Chiffre d'affaires HT du dernier exercice</label>
            <input class="input" id="ca" type="number" min="0" value="${e.ca || 0}">
            <p class="hint">Sert à calculer le plafond de 5 ‰. En dessous de 4 M€, c'est le
              plancher de 20 000 € qui s'applique de toute façon.</p></div>
          <div class="field"><label>Coût journalier moyen chargé d'un salarié</label>
            <input class="input" id="cout" type="number" min="0" value="${e.cout_jour_moyen || 300}">
            <p class="hint">Rémunération brute plus charges, divisée par 220 jours ouvrés.
              Une demi-journée de mécénat de compétences vaut la moitié.</p></div>
          <div class="field"><label>Effectif déclaré</label>
            <input class="input" id="eff" type="number" min="1" value="${e.effectif || 0}">
            <p class="hint">Sert au classement normalisé. ${si.pris} place${si.pris > 1 ? "s" : ""}
              occupée${si.pris > 1 ? "s" : ""} sur ${si.total}.</p></div>
        </div>
      </section>

      <section class="card">
        <div class="between" style="margin-bottom:var(--s4)">
          <h3>Journal des accès</h3>
          <button class="btn btn--ghost btn--sm" id="csvA">Exporter</button>
        </div>
        <p class="muted" style="font-size:var(--t-sm)">
          Qui a rejoint, quand, avec quel lien, et ce qui a été révoqué. Conservé toute la saison.</p>
        <div style="margin-top:var(--s5);max-height:260px;overflow:auto" id="acces"></div>
      </section>

      <section class="card">
        <h3>Vos données</h3>
        <div class="stack" style="--gap:var(--s3);margin-top:var(--s5);font-size:var(--t-sm)">
          <div class="between"><span class="muted">Hébergement</span><span>Union européenne</span></div>
          <div class="between"><span class="muted">Sous-traitance</span>
            <a href="/confidentialite.html" style="color:var(--forest-800)">liste des sous-traitants</a></div>
          <div class="between"><span class="muted">Réversibilité</span><span>export complet à tout moment</span></div>
        </div>
        <div class="row" style="gap:var(--s2);margin-top:var(--s5)">
          <button class="btn btn--ghost btn--sm" id="exp">Exporter toutes nos données</button>
        </div>
        <p class="hint">Un export complet au format CSV : équipe, missions, points, dons,
          factures. Rien ne vous retient chez nous.</p>
      </section>
    </div>
  </div>`);

  el.querySelector("#save").onclick = () => {
    const v = (id) => el.querySelector("#" + id).value;
    DB.majEntreprise(u.org, {
      nom: v("nom").trim() || e.nom, siret: v("siret").trim(), secteur: v("secteur").trim(),
      adresse: v("adresse").trim(), referent: v("ref").trim(), referent_mail: v("refmail").trim(),
      ca: Number(v("ca")) || 0, cout_jour_moyen: Number(v("cout")) || 300,
      effectif: Number(v("eff")) || e.effectif
    });
    DB.majContrat(u.org, { plateforme_reception: v("pdp").trim(), annuaire_id: v("annu").trim() });
    toast("Paramètres enregistrés."); rendre();
  };
  const libelles = { inscription:"Inscription", creation_lien:"Création du lien",
                     revocation_lien:"Révocation du lien", retrait:"Retrait d'un salarié" };
  const boxA = el.querySelector("#acces");
  const journalAcces = DB.acces(u.org);
  if (!journalAcces.length) boxA.appendChild(h(`<p class="muted" style="font-size:var(--t-sm)">Rien encore.</p>`));
  else {
    const t = h(`<table class="table"><tbody></tbody></table>`);
    journalAcces.forEach(a => {
      const who = a.utilisateur ? DB.utilisateur(a.utilisateur) : null;
      t.querySelector("tbody").appendChild(h(`<tr>
        <td class="muted tnum" style="width:70px">${dateCourte(a.date)}</td>
        <td><strong>${esc(libelles[a.quoi] || a.quoi)}</strong>${who ? ` — ${esc(who.nom)}` : ""}</td>
        <td class="muted" style="font-family:var(--font-mono);font-size:var(--t-xs);text-align:right">${esc(a.code || "")}</td>
      </tr>`));
    });
    boxA.appendChild(t);
  }
  el.querySelector("#csvA").onclick = () => {
    versCSV("riseva-journal-acces.csv", ["Date", "Événement", "Personne", "Lien"],
      journalAcces.map(a => { const w = a.utilisateur ? DB.utilisateur(a.utilisateur) : null;
        return [a.date, libelles[a.quoi] || a.quoi, w ? w.nom : "", a.code || ""]; }));
    toast("Export téléchargé.");
  };
  el.querySelector("#exp").onclick = () => {
    const ms = DB.missions({ entreprise: u.org });
    versCSV("riseva-export-complet.csv",
      ["Type", "Libellé", "Association", "Salarié", "Date", "Quantité", "Points", "État"],
      [...ms.map(m => { const a = DB.annonceDe(m), sal = DB.utilisateur(m.salarie);
          return ["mission", a.titre, (DB.association(a.asso) || {}).nom, sal ? sal.nom : "—",
                  m.date, m.quantite, m.points, ETATS_MISSION[m.etat].label]; }),
       ...DB.salaries(u.org).map(g => ["salarié", g.nom, "", g.email || "", "", "", DB.pointsVisiblesEmployeur(g.id),
          g.anonyme ? "anonymisé" : (g.actif ? "actif" : "suspendu")]),
       ...((DB.contrat(u.org) || {}).factures || []).map(f =>
          ["facture", f.libelle, "", f.ref, f.date, "", f.montant, f.etat])]);
    toast("Export complet téléchargé.");
  };
  return el;
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

  /* Ce qui attend vraiment une action de l'association, et rien d'autre. */
  /* Qui vient, quand, et pour quelle mission : la première question d'une
     association, et celle à laquelle le tableau de bord ne répondait pas. */
  const aVenir = ms.filter(m => m.etat === "engagee")
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const placesRestantes = annonces.filter(a => a.etat === "ouverte" && a.type !== "don_financier")
    .reduce((n, a) => n + a.restant, 0);
  const reaAsso = DB.realisations({ asso: aid });

  /* Complétude de la fiche publique : ce qui manque pour qu'une association ait
     envie de la partager, dit noir sur blanc plutôt que laissé à deviner. */
  const attendu = [
    [asso.resume && asso.resume.length > 40, "une description d'au moins deux lignes"],
    [!!asso.adresse, "l'adresse"],
    [!!asso.site, "le site ou la page publique"],
    [!!asso.cause, "la cause"],
    [!!(asso.recus && asso.recus.actif), "les reçus fiscaux"]
  ];
  const complet = {
    pct: Math.round((attendu.filter(x => x[0]).length / attendu.length) * 100),
    manque: attendu.filter(x => !x[0]).map(x => x[1])
  };

  const rappels = [];
  if (aValider.length) rappels.push({ ton:"alerte", vers:"#/avalider", texte:
    `${aValider.length} mission${aValider.length > 1 ? "s" : ""} à confirmer — sans réponse sous quatorze jours, elle${aValider.length > 1 ? "s seront clôturées automatiquement sans confirmation" : " sera clôturée automatiquement sans confirmation"}` });
  if (asso.a_reverifier_le && asso.a_reverifier_le <= new Date(2026, 7, 20).toISOString().slice(0, 10))
    rappels.push({ ton:"alerte", vers:"#/page", texte:
      "Votre vérification annuelle est échue : Riseva va vous recontacter" });
  if (!asso.recus || !asso.recus.actif) rappels.push({ ton:"info", vers:"#/recus", texte:
    "Les reçus fiscaux ne sont pas activés : les entreprises ne peuvent pas déduire leurs dons" });
  if (!annonces.some(a => a.etat === "ouverte")) rappels.push({ ton:"info", vers:"#/mesannonces", texte:
    "Aucune annonce ouverte : personne ne peut se positionner" });

  const el = h(`<div class="stack" style="--gap:var(--s5)">
    <div class="kpis">
      ${/* Quatre questions, dans l'ordre où une association se les pose : que dois-je
            confirmer, qui vient et quand, où en sont mes annonces, et qu'avons-nous
            reçu. « Entreprises mobilisées » était un chiffre pour nous, pas pour elle. */
        kpi("À confirmer", nb(aValider.length),
            aValider.length ? "action attendue de votre part" : "rien en attente",
            aValider.length ? "down" : "", "kpi--tete grain")}
      ${kpi("Participants attendus", nb(aVenir.length),
            aVenir.length ? "prochain le " + dateCourte(aVenir[0].date) : "personne d'inscrit")}
      ${kpi("Annonces ouvertes", nb(annonces.filter(a => a.etat === "ouverte").length),
            nb(placesRestantes) + " place" + (placesRestantes > 1 ? "s" : "") + " encore libre"
            + (placesRestantes > 1 ? "s" : ""))}
      ${kpi("Missions confirmées", nb(reaAsso.missions),
            "depuis le début, toutes entreprises confondues")}
    </div>
    ${rappels.length ? `<section class="aFaire">
      <div class="aFaire__col">
        <span class="aFaire__titre">Action requise
          <span class="badge ${rappels.some(x => x.ton === "alerte") ? "badge--warn" : ""}"
            style="height:20px;margin-left:6px">${rappels.length}</span></span>
        <div class="aFaire__liste">
          ${rappels.map(x => `<a class="rappel rappel--dense" href="${x.vers}">
            <span class="notif__point notif__point--${x.ton}"></span>
            <span>${esc(x.texte)}</span>
            <span class="rappel__go">${ICONS.arrow || "→"}</span></a>`).join("")}
        </div></div>
    </section>` : ""}

    <div id="produit"></div>

    <div class="two">
      <section class="card">
        <div class="between" style="margin-bottom:var(--s5)">
          <h3>Vos annonces</h3>
          <button class="btn btn--primary btn--sm" id="new">${ICONS.plus} Publier</button></div>
        <div id="l"></div>
      </section>
      <div class="stack" style="--gap:var(--s5)">
        <section class="card">
          <div class="between" style="margin-bottom:var(--s5)">
            <h3>Qui vient</h3>
            <a class="btn btn--quiet btn--sm" href="#/avalider">Tout voir</a></div>
          <div class="stack" style="--gap:var(--s4)" id="qui"></div>
        </section>

        <section class="card">
          <div class="between" style="margin-bottom:var(--s4)">
            <h3>Votre page publique</h3>
            <span class="badge ${complet.manque.length ? "badge--warn" : "badge--ok"}">${
              complet.pct} % complète</span></div>
          <div class="bar"><i style="width:${complet.pct}%"></i></div>
          ${complet.manque.length ? `<p class="hint">Il manque : ${esc(complet.manque.join(", "))}.
            Une fiche complète se partage ; une fiche à moitié vide, non.</p>`
            : `<p class="hint">Tout y est. C'est la page à mettre dans votre lettre d'information
               et sur vos réseaux.</p>`}
          <div class="row" style="gap:var(--s2);margin-top:var(--s5)">
            <a class="btn btn--ghost btn--sm" style="flex:1" href="/asso.html?id=${aid}" target="_blank">Voir la page</a>
            <button class="btn btn--ghost btn--sm" style="flex:1" id="copier">Copier le lien</button>
          </div>
        </section>

        <section class="card">
          <h3 style="font-size:var(--t-lg)">Pour votre conseil d'administration</h3>
          <p class="muted" style="font-size:var(--t-sm);margin-top:6px">
            Les résultats que vous avez confirmés, mission par mission, en tableur.</p>
          <button class="btn btn--ghost btn--block btn--sm" style="margin-top:var(--s4)" id="expA">Exporter</button>
        </section>
      </div>
    </div>
  </div>`);
  el.querySelector("#l").appendChild(tableAnnoncesAsso(annonces, u));
  el.querySelector("#new").onclick = () => formAnnonce(u);

  const qui = el.querySelector("#qui");
  if (!aVenir.length)
    qui.appendChild(h(`<p class="muted" style="font-size:var(--t-sm)">
      Personne d'inscrit pour l'instant. Une annonce ouverte et datée trouve preneur plus vite
      qu'une annonce sans date.</p>`));
  aVenir.slice(0, 6).forEach(m => {
    const a = DB.annonceDe(m), e = DB.entreprise(m.entreprise), sal = DB.utilisateur(m.salarie);
    qui.appendChild(h(`<div class="between" style="font-size:var(--t-sm);gap:var(--s4)">
      <span style="min-width:0">
        <strong>${esc(sal ? sal.nom : "Un salarié")}</strong>
        <span class="muted"> · ${esc(e ? e.nom : "")}</span><br>
        <span class="muted" style="font-size:var(--t-xs);overflow:hidden;text-overflow:ellipsis;
          white-space:nowrap;display:block">${esc(a ? a.titre : "")}</span>
      </span>
      <span class="badge">${dateCourte(m.date)}</span>
    </div>`));
  });

  el.querySelector("#copier").onclick = async (ev) => {
    const lien = lienPublic(`/asso.html?id=${aid}`);
    try { await navigator.clipboard.writeText(lien); toast("Lien copié."); }
    catch { ev.target.textContent = lien; toast("Copiez le lien affiché."); }
  };

  el.querySelector("#expA").onclick = () => {
    const lignes = DB.missions({ asso: aid })
      .filter(m => m.etat === "validee" && m.realise != null)
      .map(m => {
        const a = DB.annonceDe(m), e = DB.entreprise(m.entreprise), r = DB.realiseDe(m);
        return [m.date, a ? a.titre : "", e ? e.nom : "", a ? BAREME[a.type].label : "",
                r ? r.quantite : "", r ? ((UNITES[r.unite] || {}).pl || r.unite) : ""];
      });
    if (!lignes.length){ toast("Aucun résultat confirmé à exporter pour l'instant."); return; }
    versCSV(`riseva-resultats-${aid}.csv`,
      ["Date", "Mission", "Entreprise", "Format", "Quantité", "Unité"], lignes);
  };

  /* Ce que l'association vient chercher ici : ce que les entreprises ont
     réellement produit chez elle, et ce qui l'attend côté reçus. Le tableau de
     bord ne montrait que ses propres annonces — une liste qu'elle connaît déjà. */
  const rea = bandeauRealisations(DB.realisations({ asso: aid }), {
    /* C'est l'association qui réalise. Les entreprises apportent des moyens.
       Écrire l'inverse, c'est lui dire que son travail sert d'abord à fabriquer
       les indicateurs RSE de nos clients. */
    titre: "Ce que vous avez réalisé avec le soutien des entreprises", sombre: true,
    note: "Ces chiffres sont ceux que vous avez confirmés en validant les missions." });
  if (rea) el.querySelector("#produit").appendChild(rea);
  return el;
}

function tableAnnoncesAsso(annonces, u){
  const t = h(`<table class="table"><thead><tr>
    <th>Annonce</th><th>Format</th><th>Il reste</th><th>État</th><th></th></tr></thead><tbody></tbody></table>`);
  const tb = t.querySelector("tbody");
  if (!annonces.length)
    tb.appendChild(h(`<tr><td colspan="5" class="empty">Aucune annonce publiée.</td></tr>`));
  annonces.forEach(a => {
    const engagees = DB.missions({}).filter(m =>
      m.annonce === a.id && m.etat !== "refusee" && DB.deLaSaison(m)).length;
    /* « Participants » ne veut rien dire sur un don de matériel ou une collecte
       financière : chaque format a son mot. */
    const tr = h(`<tr>
      <td><strong>${esc(a.titre)}</strong><br><span class="muted" style="font-size:var(--t-xs)">${dateFR(a.date)} · ${esc(a.lieu || "")}${
        engagees ? ` · ${engagees} ${a.type === "benevolat_demi_journee"
          ? "participant" + (engagees > 1 ? "s inscrits" : " inscrit")
          : a.type === "don_materiel"
            ? "don" + (engagees > 1 ? "s proposés" : " proposé")
            : "versement" + (engagees > 1 ? "s reçus" : " reçu")}` : ""}</span></td>
      <td class="muted">${esc(BAREME[a.type].label)}</td>
      ${/* « 4 / 6 » se lit comme une note. Ce qui compte pour une association, c'est
            combien il reste, et dans quelle unité. */""}
      <td class="tnum">${a.type === "don_financier"
        ? eur(a.restant) + " à réunir"
        : a.type === "don_materiel"
          ? nb(a.restant) + " sur " + nb(a.quantite) + " encore attendus"
          : nb(a.restant) + " place" + (a.restant > 1 ? "s" : "") + " restante" + (a.restant > 1 ? "s" : "")}</td>
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

/* Lit l'objectif du formulaire et le ramène au multiplicateur que stocke le
   modèle. Sans unité, sans objectif ou sans quantité, on n'invente rien : une
   annonce sans décompte vaut mieux qu'un décompte inventé. */
function lireImpact(corps){
  const unite = corps.querySelector("#unite").value;
  const objectif = Number(corps.querySelector("#objectif").value);
  const quantite = Number(corps.querySelector("#q").value);
  if (!unite || !(objectif > 0) || !(quantite > 0)) return null;
  return { unite, par_unite: objectif / quantite, objectif };
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
    ${/* On demande l'objectif TOTAL, pas un multiplicateur par unité. Une
          association qui saisit « 40 arbres par demi-journée » sur douze
          demi-journées publie sans le vouloir un objectif de 480 arbres sous un
          titre qui en annonce 400 : personne ne fait la multiplication de tête au
          moment de la saisie, et le chiffre incohérent part en ligne. */""}
    <div class="field"><label>Objectif annoncé <span class="muted">(facultatif)</span></label>
      <div class="row" style="gap:var(--s3);align-items:stretch">
        <input class="input" type="number" min="0" step="1" id="objectif" style="width:130px" placeholder="400">
        <select class="select" id="unite" style="flex:1">
          <option value="">Aucun décompte</option>
          ${Object.entries(UNITES).map(([k, v]) => `<option value="${k}">${esc(v.pl)}</option>`).join("")}
        </select>
      </div>
      <p class="hint" id="apercuObjectif">Le total que la campagne vise, tel qu'il apparaîtra sur
        l'annonce. Reprenez le chiffre de votre titre : c'est celui que les entreprises liront.</p>
    </div>
    <label class="checkline" id="ttWrap"><input type="checkbox" id="tt">
      <span>Mission proposée sur le temps de travail des salariés.
      <span class="muted">Dans ce cas elle relève du mécénat de compétences et l'entreprise peut
      la valoriser fiscalement. Une mission le week-end ou le soir ne coche pas cette case.</span></span></label>
  </div>`);
  corps.querySelector("#d").value = existante
    ? existante.date
    : new Date(Date.now() + 12 * 864e5).toISOString().slice(0, 10);
  const eligible = DB.eligibleMecenat(u.org);
  const majTT = () => {
    const visible = corps.querySelector("#type").value === "benevolat_demi_journee";
    corps.querySelector("#ttWrap").style.display = visible ? "" : "none";
    if (visible && !eligible){
      const c = corps.querySelector("#tt");
      c.checked = false; c.disabled = true;
      if (!corps.querySelector("#ttNote"))
        corps.querySelector("#ttWrap").insertAdjacentHTML("afterend",
          `<p class="hint" id="ttNote">Pour proposer une mission sur le temps de travail, déclarez
           d'abord votre éligibilité au mécénat dans <a href="#/recus" style="color:var(--forest-800)">Reçus fiscaux</a>.
           Sans cela, l'entreprise n'aurait rien à valoriser.</p>`);
    }
  };
  corps.querySelector("#type").addEventListener("change", majTT);

  /* L'aperçu écrit la phrase exacte qui partira sur l'annonce. C'est le seul
     moment où l'incohérence entre le titre et l'objectif saute aux yeux de la
     personne qui peut encore la corriger. */
  const apercu = () => {
    const n = corps.querySelector("#apercuObjectif");
    const u = corps.querySelector("#unite").value;
    const o = Number(corps.querySelector("#objectif").value);
    if (!u || !(o > 0)){
      n.textContent = "Le total que la campagne vise, tel qu'il apparaîtra sur l'annonce. "
        + "Reprenez le chiffre de votre titre : c'est celui que les entreprises liront.";
      n.classList.remove("hint--alerte");
      return;
    }
    const libelle = (UNITES[u] || {}).pl || u;
    n.textContent = `L'annonce affichera « Objectif : ${nb(o)} ${libelle} ».`;
    const titre = corps.querySelector("#titre").value;
    const chiffres = (titre.match(/\d[\d  ]*/g) || [])
      .map(x => Number(x.replace(/[^\d]/g, ""))).filter(Boolean);
    /* On compare le nombre ET le mot. « Objectif : 10 kits » sous un titre qui
       parle d'équipements, c'est le même écart que 480 sous un titre à 400 :
       le lecteur voit deux unités et n'en croit aucune. */
    const motCle = libelle.split(" ")[0].replace(/s$/, "").toLowerCase();
    const ecarts = [];
    if (chiffres.length && !chiffres.includes(o))
      ecarts.push(`votre titre annonce ${chiffres.map(nb).join(" et ")}`);
    if (titre.length > 6 && motCle.length > 3
        && !titre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
              .includes(motCle.normalize("NFD").replace(/[\u0300-\u036f]/g, "")))
      ecarts.push(`le mot « ${libelle.split(" ")[0]} » n'apparaît pas dans votre titre`);
    if (ecarts.length){
      n.textContent += " Attention : " + ecarts.join(", et ") + ".";
      n.classList.add("hint--alerte");
    } else n.classList.remove("hint--alerte");
  };
  ["objectif", "unite", "titre"].forEach(id =>
    corps.querySelector("#" + id).addEventListener("input", apercu));
  corps.querySelector("#unite").addEventListener("change", apercu);
  if (existante){
    corps.querySelector("#tt").checked = !!existante.temps_travail;
    if (existante.impact){
      corps.querySelector("#unite").value = existante.impact.unite || "";
      corps.querySelector("#objectif").value =
        Math.round((existante.quantite || 0) * (existante.impact.par_unite || 0)) || "";
    }
    corps.querySelector("#type").value = existante.type;
    corps.querySelector("#type").disabled = true;
    corps.querySelector("#titre").value = existante.titre;
    corps.querySelector("#desc").value = existante.description;
    corps.querySelector("#q").value = existante.quantite;
    corps.querySelector("#lieu").value = existante.lieu || "";
  }
  majTT(); apercu();
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
            quantite:q, restant:q - pris, date:v("d"), lieu:v("lieu"),
            temps_travail: corps.querySelector("#tt").checked,
            impact: lireImpact(corps) });
          toast("Annonce mise à jour.");
        } else {
          try {
            DB.creerAnnonce({ asso: u.org, type: v("type"), titre: v("titre"), description: v("desc"),
              quantite: Number(v("q")) || 1, date: v("d"), lieu: v("lieu") || DB.association(u.org).ville,
              temps_travail: corps.querySelector("#tt").checked,
              impact: lireImpact(corps) });
          } catch (err){ toast(err.message); return false; }
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
          Sans réponse de votre part sous quatorze jours, la mission est clôturée automatiquement
          sans confirmation : l'entreprise marque ses points, le résultat reste estimé et il est
          écrit comme tel. Ce n'est pas une faute.</p></div>
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
      <td>${m.etat === "a_valider" ? `<input type="checkbox" aria-label="Sélectionner la mission « ${esc(a.titre)} » de ${esc(sal ? sal.nom : 'un salarié')}" style="accent-color:var(--forest-700);width:16px;height:16px">` : ""}</td>
      <td><strong>${esc(a.titre)}</strong><br><span class="muted" style="font-size:var(--t-xs)">${esc(BAREME[a.type].label)} · ${nb(m.points)} pts</span></td>
      <td class="muted">${esc(e ? e.nom : "—")}</td>
      <td class="muted">${esc(sal ? sal.nom : "—")}</td>
      <td class="muted tnum">${dateCourte(m.date)}</td>
      <td>${jours === null ? '<span class="muted">—</span>'
            : `<span class="badge ${jours <= 3 ? "badge--warn" : ""}">${jours} j</span>`}</td>
      <td><span class="badge ${ETATS_MISSION[m.etat].badge}">${ETATS_MISSION[m.etat].labelAsso}</span></td>
      <td style="text-align:right"></td></tr>`);
    const cb = tr.querySelector("input");
    if (cb) cb.onchange = () => { cb.checked ? selection.add(m.id) : selection.delete(m.id); majCompteur(); };
    if (m.etat === "a_valider"){
      const ok = h(`<button class="btn btn--forest btn--sm">Confirmer</button>`);
      const no = h(`<button class="btn btn--quiet btn--sm">Refuser</button>`);
      ok.onclick = () => {
        const imp = a.impact && UNITES[a.impact.unite] ? a.impact : null;
        if (!imp){
          DB.validerMission(m.id, true);
          toast("Mission confirmée, points crédités."); rendre(); return;
        }
        const attendu = Math.round(m.quantite * imp.par_unite);
        const propose = m.realise_propose;
        const sal = DB.utilisateur(m.salarie);
        const corps = h(`<div>
          <p class="muted">Vous étiez là. C'est votre chiffre qui fait foi et qui alimente le
          décompte de l'entreprise et celui du réseau.</p>
          <div class="field" style="margin-top:var(--s5)">
            <label>${esc(UNITES[imp.unite].pl.charAt(0).toUpperCase() + UNITES[imp.unite].pl.slice(1))}</label>
            <input class="input" type="number" min="0" id="re" value="${propose != null ? propose : attendu}">
            <p class="hint">${propose != null
              ? `${esc(sal ? sal.nom : "Le salarié")} a déclaré ${nb(propose)}. Prévu d'après l'annonce : ${nb(attendu)}.`
              : `Prévu d'après l'annonce : ${nb(attendu)}.`} Corrigez librement.</p>
          </div>
        </div>`);
        modal("Confirmer « " + a.titre + " »", corps, [
          { label:"Annuler" },
          { label:"Confirmer", classe:"btn--primary", onClick: () => {
              DB.validerMission(m.id, true, Number(corps.querySelector("#re").value));
              toast("Mission confirmée, points crédités."); rendre(); }}
        ]);
      };
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
       entreprises concernées.</p>
       <p class="hint" style="margin-top:var(--s4)">Les décomptes de réalisation retiendront
       l'estimation annoncée. Pour corriger un chiffre, confirmez cette mission-là séparément.</p>`,
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
      ${kpi("Points du réseau", nb(es.reduce((s, e) => s + DB.pointsDe(e.id).retenu, 0)))}
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
            `<div class="between"><span>${esc(a.nom)}</span><span class="badge badge--warn">à valider</span></div>`).join("")}
          ${DB.aReverifier().map(a =>
            `<div class="between"><span>${esc(a.nom)}</span><span class="badge badge--warn">à revérifier</span></div>`).join("")}
          ${!as.filter(a => !a.valide).length && !DB.aReverifier().length
            ? `<p class="muted">Rien en attente.</p>` : ""}
        </div>
        <hr class="sep">
        <h3 style="font-size:var(--t-lg)">Dernier passage du moteur</h3>
        <p class="muted" style="font-size:var(--t-sm);margin-top:var(--s3)">
          ${(() => { const j = DB.journalMoteur()[0];
            return j ? `${dateFR(j.le)} · ${j.validations_auto} validation(s) automatique(s),
                        ${j.annonces_fermees} fermeture(s), ${j.rapports} rapport(s).`
                     : "Le moteur n'a pas encore tourné."; })()}</p>
        <a class="btn btn--ghost btn--sm" style="margin-top:var(--s4)" href="#/moteur">Voir les automatismes</a>
      </section>
    </div>

    <div id="reaR"></div>
  </div>`);
  const rr = bandeauRealisations(DB.realisations(),
    { titre: "Ce que le réseau a produit", sombre: true });
  if (rr) el.querySelector("#reaR").appendChild(rr);
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
      <td class="tnum"><strong>${nb(DB.pointsDe(e.id).retenu)}</strong></td>
      <td class="tnum">${e.rang}</td></tr>`));
  });
  return el;
}

function vueAdminAssos(){
  const aRevoir = DB.aReverifier();
  const el = h(`<div class="stack" style="--gap:var(--s5)">
    ${aRevoir.length ? `<section class="card card--flat" style="background:var(--warn-bg);border-color:transparent">
      <h3 style="font-size:var(--t-lg)">${aRevoir.length} association${aRevoir.length > 1 ? "s" : ""} à revérifier</h3>
      <p class="muted" style="font-size:var(--t-sm);margin-top:6px;color:var(--ink-600)">
        La charte prévoit une revérification par saison. Au-delà, on ne sait plus ce qu'on
        présente aux entreprises.</p>
    </section>` : ""}
    <section class="card">
      <table class="table"><thead><tr>
        <th>Association</th><th>Cause</th><th>Identifiant</th><th>Vérifiée</th>
        <th>Annonces</th><th>État</th><th></th>
      </tr></thead><tbody></tbody></table>
    </section>
  </div>`);
  const tb = el.querySelector("tbody");
  DB.associations().forEach(a => {
    const retard = a.valide && a.a_reverifier_le && a.a_reverifier_le < "2026-08-20";
    const etat = a.suspendue ? ["Suspendue", "badge--danger"]
               : !a.valide   ? ["En attente", "badge--warn"]
               : retard      ? ["À revérifier", "badge--warn"]
               :               ["Validée", "badge--ok"];
    const tr = h(`<tr>
      <td><strong>${esc(a.nom)}</strong><br><span class="muted" style="font-size:var(--t-xs)">${esc(a.ville || "")} · ${esc(a.resume || "")}</span></td>
      <td class="muted">${esc(a.cause || "—")}</td>
      <td class="muted" style="font-family:var(--font-mono);font-size:var(--t-xs)">${esc(a.rna || "—")}</td>
      <td class="muted tnum">${a.verifiee_le ? dateCourte(a.verifiee_le) : "—"}</td>
      <td class="tnum">${DB.annonces({ asso: a.id }).length}</td>
      <td><span class="badge ${etat[1]}">${etat[0]}</span></td>
      <td style="text-align:right"></td></tr>`);
    const cell = tr.lastElementChild;
    if (!a.valide || retard || a.suspendue){
      const b = h(`<button class="btn btn--forest btn--sm">${a.valide ? "Revérifier" : "Valider"}</button>`);
      b.onclick = () => modal((a.valide ? "Revérifier " : "Valider ") + a.nom,
        `<p class="muted">Vérifiez avant de cocher, la charte nous engage :</p>
         <div class="stack" style="--gap:var(--s3);margin-top:var(--s5)">
           <label class="checkline"><input type="checkbox" class="v"><span>Existence juridique confirmée (RNA ou SIREN, statuts).</span></label>
           <label class="checkline"><input type="checkbox" class="v"><span>Référent et signataire des reçus identifiés.</span></label>
           <label class="checkline"><input type="checkbox" class="v"><span>Objet réel cohérent avec l'activité annoncée.</span></label>
           <label class="checkline"><input type="checkbox" class="v"><span>Coordonnées vérifiées et actives.</span></label>
           <label class="checkline"><input type="checkbox" class="v"><span>Éligibilité au mécénat déclarée par l'association elle-même.</span></label>
         </div>
         <p class="hint" style="margin-top:var(--s4)">Riseva ne certifie pas l'éligibilité fiscale.
         Seule l'association peut l'affirmer.</p>`,
        [{ label:"Annuler" },
         { label:"Valider pour une saison", classe:"btn--primary", onClick: (md) => {
             const toutes = [...md.querySelectorAll(".v")].every(x => x.checked);
             if (!toutes){ toast("Cochez les cinq points, sinon la vérification ne vaut rien."); return false; }
             DB.validerAssociation(a.id); toast("Association vérifiée pour une saison."); rendre(); }}]);
      cell.appendChild(b);
    }
    if (a.valide && !a.suspendue){
      const b = h(`<button class="btn btn--quiet btn--sm" style="color:var(--danger)">Suspendre</button>`);
      b.onclick = () => {
        const corps = h(`<div>
          <p class="muted">La suspension retire immédiatement ses annonces, gèle les points en
          cours de validation liés à ses missions et informe les entreprises concernées.</p>
          <div class="field" style="margin-top:var(--s5)"><label>Motif, communiqué à l'association</label>
            <select class="select" id="motif">
              <option>Annonces sans rapport avec l'objet déclaré</option>
              <option>Missions validées qui n'ont pas eu lieu</option>
              <option>Coordonnées fausses ou référent injoignable</option>
              <option>Reçus fiscaux émis sans éligibilité</option>
              <option>Pression sur des salariés ou démarchage détourné</option>
            </select></div></div>`);
        modal("Suspendre " + a.nom, corps, [
          { label:"Annuler" },
          { label:"Suspendre", classe:"btn--primary", onClick: () => {
              DB.suspendreAssociation(a.id, corps.querySelector("#motif").value);
              toast("Association suspendue, annonces retirées."); rendre(); }}]);
      };
      cell.appendChild(b);
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

function vuePilotes(){
  const global = DB.indicateurs();
  const lignes = [
    ["participation", "Participation vérifiée", "%"],
    ["inscriptionI0", "Inscription sur l'effectif invité", "%"],
    ["inscriptionS0", "Consommation des places", "%"],
    ["conversion", "Inscrits devenus acteurs", "%"],
    ["actions100", "Actions pour 100 salariés invités", ""],
    ["concentration", "Concentration sur les 10 % les plus actifs", "%"],
    ["partFormatMax", "Part du format dominant", "%"],
    ["associations", "Organismes réellement soutenus", ""],
    ["heuresMecenat", "Heures effectivement émargées", "h"],
    ["realisation", "Taux de réalisation", "%"],
    ["validationAuto", "Validations sans retour", "%"],
    ["fraicheur", "Fraîcheur des annonces", "%"]
  ];
  const el = h(`<div class="stack" style="--gap:var(--s5)">
    <section class="card card--flat" style="background:var(--forest-050);border-color:transparent">
      <h3 style="font-size:var(--t-lg)">Le protocole, figé avant le lancement</h3>
      <p class="muted" style="font-size:var(--t-sm);margin-top:6px;color:var(--ink-600)">
        Un indicateur dont on peut changer le dénominateur en cours de route ne prouve rien.
        Les repères sont posés à T0, la première communication de lancement, et gelés :
        période de mesure de 90 jours, clôture des validations 14 jours plus tard.</p>
      <div class="row" style="gap:var(--s5);flex-wrap:wrap;margin-top:var(--s5);font-size:var(--t-sm)">
        ${Object.entries(global.reperes).map(([k, v]) =>
          `<span><strong style="font-family:var(--font-mono)">${k}</strong>
           <span class="muted"> = ${nb(v)}</span></span>`).join("")}
      </div>
      <p class="hint">Une action validée est une combinaison unique salarié × association ×
        format × date, réalisée dans la période et acceptée avant la clôture. Deux versements
        au même organisme le même jour ne font qu'une action.</p>
    </section>

    <div class="kpis">
      ${lignes.slice(0, 4).map(([cle, titre, unite], i) => {
        const x = global[cle];
        return kpi(titre, x.valeur === null ? "—" : x.valeur + (unite ? " " + unite : ""),
          x.den ? `${nb(x.num)} sur ${nb(x.den)}` : "", "", i === 0 ? "kpi--tete grain" : "");
      }).join("")}
    </div>

    <div class="two">
      <section class="card">
        <h3>Définitions</h3>
        <table class="table" style="margin-top:var(--s5)"><tbody>
          ${lignes.map(([cle, titre, unite]) => {
            const x = global[cle];
            return `<tr>
              <td style="width:34%"><strong>${esc(titre)}</strong><br>
                <span class="tnum" style="color:var(--forest-800);font-weight:600">${
                  x.valeur === null ? "—" : x.valeur + (unite ? " " + unite : "")}</span></td>
              <td class="muted">${esc(x.definition)}</td></tr>`;
          }).join("")}
        </tbody></table>
      </section>

      <section class="card">
        <h3>Par entreprise</h3>
        <table class="table" style="margin-top:var(--s5)"><thead><tr>
          <th>Entreprise</th><th>Inscription</th><th>Participation</th><th>Réalisation</th>
        </tr></thead><tbody id="pe"></tbody></table>
        <hr class="sep">
        <button class="btn btn--ghost btn--block btn--sm" id="csvI">Exporter les indicateurs</button>
      </section>
    </div>
  </div>`);

  const pe = el.querySelector("#pe");
  DB.entreprises().forEach(e => {
    const x = DB.indicateurs(e.id);
    pe.appendChild(h(`<tr>
      <td><strong>${esc(e.nom)}</strong></td>
      <td class="tnum">${x.inscriptionI0.valeur === null ? "—" : x.inscriptionI0.valeur + " %"}</td>
      <td class="tnum">${x.participation.valeur === null ? "—" : pct(x.participation.valeur) + " %"}</td>
      <td class="tnum">${x.realisation.valeur === null ? "—" : x.realisation.valeur + " %"}</td>
    </tr>`));
  });
  el.querySelector("#csvI").onclick = () => {
    versCSV("riseva-indicateurs.csv",
      ["Entreprise", "Indicateur", "Valeur", "Numérateur", "Dénominateur", "Définition"],
      DB.entreprises().flatMap(e => {
        const x = DB.indicateurs(e.id);
        return lignes.map(([cle, titre]) => [e.nom, titre, x[cle].valeur ?? "",
          x[cle].num ?? "", x[cle].den ?? "", x[cle].definition]);
      }));
    toast("Export téléchargé.");
  };
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

/* Le tableau de bord d'un salarié.
   Il voyait exactement celui de son administrateur : « nommez un second
   administrateur », l'écrêtage de l'entreprise, le rang de la société, les
   missions de tout le monde. Rien de tout cela ne lui demande quoi que ce soit
   et rien ne lui appartient. Ici, on lui montre ce qu'il a fait, ce qui l'attend,
   et où son entreprise en est — dans cet ordre. */
function tableauSalarie(u){
  const mes = DB.missions({ salarie: u.id });
  const validees = mes.filter(m => ["validee", "validee_auto"].includes(m.etat));
  const aDeclarer = mes.filter(m => m.etat === "engagee"
    && m.date < new Date(2026, 7, 20).toISOString().slice(0, 10));
  const aVenir = mes.filter(m => m.etat === "engagee"
    && m.date >= new Date(2026, 7, 20).toISOString().slice(0, 10));
  const enAttente = mes.filter(m => m.etat === "a_valider");
  const mesPoints = DB.pointsVisiblesEmployeur(u.id);
  const res = DB.reseau();
  const monEnt = DB.entreprise(u.org);
  const proches = u.org ? DB.associationsProches(u.org, { avecAnnonces: true }) : [];

  const el = h(`<div class="stack" style="--gap:var(--s5)">
    ${aDeclarer.length ? `<section class="aFaire">
      <div class="aFaire__col">
        <span class="aFaire__titre">Action requise
          <span class="badge badge--warn" style="height:20px;margin-left:6px">${aDeclarer.length}</span></span>
        <div class="aFaire__liste">
          <a class="rappel rappel--dense" href="#/missions">
            <span class="notif__point notif__point--alerte"></span>
            <span>${aDeclarer.length} mission${aDeclarer.length > 1 ? "s" : ""} passée${
              aDeclarer.length > 1 ? "s" : ""} que vous n'avez pas encore déclarée${
              aDeclarer.length > 1 ? "s" : ""} — sans déclaration, elle${
              aDeclarer.length > 1 ? "s ne comptent" : " ne compte"} pas</span>
            <span class="rappel__go">${ICONS.arrow || "→"}</span></a>
        </div></div>
      ${enAttente.length ? `<div class="aFaire__col">
        <span class="aFaire__titre">En attente d'un tiers</span>
        <div class="aFaire__liste">
          <a class="rappel rappel--dense" href="#/missions">
            <span class="notif__point notif__point--info"></span>
            <span>${enAttente.length} mission${enAttente.length > 1 ? "s" : ""} en attente
              de confirmation par l'association</span>
            <span class="rappel__go">${ICONS.arrow || "→"}</span></a>
        </div></div>` : ""}
    </section>` : ""}

    <div class="kpis">
      ${kpi("Mes points", nb(mesPoints), `${nb(validees.length)} mission${
        validees.length > 1 ? "s" : ""} validée${validees.length > 1 ? "s" : ""}`, "", "kpi--tete grain")}
      ${kpi("Demi-journées de bénévolat", nb(validees
        .filter(m => (DB.annonceDe(m) || {}).type === "benevolat_demi_journee")
        .reduce((n, m) => n + m.quantite, 0)))}
      ${kpi("Associations soutenues", nb(new Set(validees
        .map(m => (DB.annonceDe(m) || {}).asso).filter(Boolean)).size))}
      ${kpi("Missions à venir", nb(aVenir.length),
        aVenir.length ? "prochaine le " + dateCourte(aVenir.map(m => m.date).sort()[0]) : "rien de prévu")}
    </div>

    <div id="realisMoi"></div>

    <div class="two">
      <section class="card">
        <div class="between" style="margin-bottom:var(--s5)">
          <div><h3>Des besoins près de chez vous</h3>
          <p class="muted" style="font-size:var(--t-sm);margin-top:4px">
            ${nb(DB.annonces({ ouvertes:true }).length)} annonces ouvertes${
              proches.length && proches[0].distance != null
                ? `, la plus proche à ${nb(proches[0].distance)} km` : ""}.</p></div>
          <a class="btn btn--ghost btn--sm" href="#/annonces">Voir les annonces</a>
        </div>
        <div id="reco"></div>
      </section>

      <div class="stack" style="--gap:var(--s5)">
        <section class="card">
          <div class="between" style="margin-bottom:var(--s4)">
            <h3>Mes missions en cours</h3>
            <a class="btn btn--quiet btn--sm" href="#/missions">Tout voir</a></div>
          <div class="stack" style="--gap:var(--s3)" id="todo"></div>
        </section>
        <section class="card card--dark grain">
          <div class="between" style="margin-bottom:var(--s5)">
            <div><h3 style="color:var(--paper)">Tous ensemble</h3>
            <p style="color:var(--forest-100);opacity:.78;font-size:var(--t-sm);margin-top:4px">
              Ce que tout le réseau a fait, ${esc(monEnt ? monEnt.nom : "votre entreprise")} comprise.</p></div>
            <a class="btn btn--lime btn--sm" href="#/ensemble">Voir la forêt</a>
          </div>
          <div class="three">
            ${kpi("Missions du réseau", nb(res.missions), "", "", "kpi--nu")}
            ${kpi("Arbres plantés", nb(res.arbres), "", "", "kpi--nu")}
            ${kpi("Associations", nb(res.associations), "", "", "kpi--nu")}
          </div>
        </section>
      </div>
    </div>
  </div>`);

  const rea = bandeauRealisations(DB.realisations({ salarie: u.id }),
    { titre: "Ce que vous avez produit", sombre: true,
      note: "Chiffres confirmés par les associations bénéficiaires, qui étaient sur place." });
  if (rea) el.querySelector("#realisMoi").appendChild(rea);

  const todo = el.querySelector("#todo");
  const enCours = mes.filter(m => ["engagee", "a_valider"].includes(m.etat));
  if (!enCours.length)
    todo.appendChild(h(`<p class="muted" style="font-size:var(--t-sm)">
      Rien en cours. Les annonces à côté n'attendent que vous.</p>`));
  enCours.slice(0, 5).forEach(m => {
    const a = DB.annonceDe(m);
    todo.appendChild(h(`<div class="between" style="font-size:var(--t-sm)">
      <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.titre)}</span>
      <span class="badge ${ETATS_MISSION[m.etat].badge}">${ETATS_MISSION[m.etat].label}</span></div>`));
  });

  el.querySelector("#reco").appendChild(listeAnnonces(
    DB.annonces({ ouvertes: true })
      .map(a => ({ a, d: DB.distanceAnnonce(u.org, a) }))
      .sort((x, y) => (x.d == null ? 1e9 : x.d) - (y.d == null ? 1e9 : y.d))
      .slice(0, 2).map(x => x.a), u));
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
                   .map(x => ({ ...x, pointsVus: DB.pointsVisiblesEmployeur(x.id) }))
                   .sort((a, b) => b.pointsVus - a.pointsVus);
  const monRang = equipe.findIndex(x => x.id === u.id) + 1;
  /* Aucun compteur figé : les points du salarié comme ceux de l'entreprise se
     relisent dans les missions validées, à chaque affichage. */
  const mesPoints = DB.pointsVisiblesEmployeur(u.id);
  const totalEnt = e ? DB.pointsDe(e.id).retenu : 0;
  const part = totalEnt ? Math.round((mesPoints / totalEnt) * 100) : 0;

  const el = h(`<div class="stack" style="--gap:var(--s5)">
    <div class="kpis">
      ${kpi("Mes points", nb(mesPoints), `${part} % du total de l'entreprise`, "", "kpi--tete grain")}
      ${kpi("Missions réalisées", nb(validees.length), ms.length - validees.length + " en cours")}
      ${kpi("Rang dans l'équipe", rangFR(monRang), "sur " + equipe.length)}
      ${kpi("Demi-journées", nb(validees.filter(m => (DB.annonceDe(m) || {}).type === "benevolat_demi_journee")
        .reduce((n, m) => n + m.quantite, 0)), "de bénévolat")}
    </div>

    <div id="realisMoi"></div>

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
              <span class="tnum">${nb(x.pointsVus)}</span></div>`).join("")}
          </div>
          <hr class="sep">
          <p class="hint">Ce classement interne ne sort jamais de votre entreprise, et il ne
            compte que les missions : les dons personnels de chacun n'y apparaissent pas.
            Vers l'extérieur, seul le total collectif est publié.</p>
        </section>
      </div>
    </div>
  </div>`);

  const reaMoi = bandeauRealisations(DB.realisations({ salarie: u.id }),
    { titre: "Ce que vous avez produit", sombre: true,
      note: "Chiffres déclarés par les associations chez qui vous êtes allé." });
  if (reaMoi) el.querySelector("#realisMoi").appendChild(reaMoi);

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

function vueModeration(){
  const motifs = DB.MOTIFS_SIGNALEMENT;
  const tous = DB.signalements();
  const enAttente = tous.filter(x => x.etat === "recu");
  const el = h(`<div class="stack" style="--gap:var(--s5)">
    <section class="card card--flat" style="background:${enAttente.length ? "var(--warn-bg)" : "var(--forest-050)"};border-color:transparent">
      <h3 style="font-size:var(--t-lg)">${enAttente.length
        ? `${enAttente.length} signalement${enAttente.length > 1 ? "s" : ""} en attente`
        : "Aucun signalement en attente"}</h3>
      <p class="muted" style="font-size:var(--t-sm);margin-top:6px;color:var(--ink-600)">
        Riseva héberge et diffuse des annonces écrites par des tiers. Le règlement sur les services
        numériques impose un mécanisme de signalement accessible et une décision motivée notifiée
        à son auteur, quelle que soit la taille de l'hébergeur. Une décision non motivée ne vaut rien.</p>
    </section>
    <section class="card">
      <table class="table"><thead><tr>
        <th>Annonce</th><th>Motif</th><th>Reçu</th><th>État</th><th></th>
      </tr></thead><tbody></tbody></table>
    </section>
  </div>`);
  const tb = el.querySelector("tbody");
  if (!tous.length){
    tb.appendChild(h(`<tr><td colspan="5"></td></tr>`));
    tb.querySelector("td").appendChild(vide({
      titre: "Rien à modérer",
      texte: "Aucune annonce n'a été signalée. Le bouton existe sur chaque annonce, dans tous les espaces." }));
  }
  tous.forEach(sg => {
    const a = DB.annonce(sg.annonce);
    const asso = DB.association(sg.association);
    const par = DB.utilisateur(sg.par);
    const tr = h(`<tr>
      <td><strong>${esc(a ? a.titre : "annonce supprimée")}</strong><br>
        <span class="muted" style="font-size:var(--t-xs)">${esc(asso ? asso.nom : "")}${
          par ? ` · signalé par ${esc(par.nom)}` : ""}</span>
        ${sg.precisions ? `<br><span class="muted" style="font-size:var(--t-xs)">« ${esc(sg.precisions)} »</span>` : ""}</td>
      <td class="muted">${esc(motifs[sg.motif] || sg.motif)}</td>
      <td class="muted tnum">${dateCourte(sg.recu_le)}</td>
      <td><span class="badge ${sg.etat === "recu" ? "badge--warn"
        : sg.decision === "retire" ? "badge--danger" : "badge--ok"}">${
        sg.etat === "recu" ? "À traiter"
        : sg.decision === "retire" ? "Retirée" : "Conservée"}</span>
        ${sg.motivation ? `<br><span class="muted" style="font-size:var(--t-xs)">${esc(sg.motivation)}</span>` : ""}</td>
      <td style="text-align:right"></td></tr>`);
    if (sg.etat === "recu"){
      const b = h(`<button class="btn btn--ghost btn--sm">Décider</button>`);
      b.onclick = () => {
        const corps = h(`<div class="stack" style="--gap:var(--s4)">
          <p class="muted" style="font-size:var(--t-sm)">
            Motif invoqué : ${esc(motifs[sg.motif] || sg.motif)}.
            ${sg.precisions ? `« ${esc(sg.precisions)} »` : ""}</p>
          <div class="field"><label>Décision</label>
            <select class="select" id="dec">
              <option value="conserve">Conserver l'annonce</option>
              <option value="retire">Retirer l'annonce</option>
            </select></div>
          <div class="field"><label>Motivation, communiquée à l'auteur du signalement et à l'association</label>
            <textarea class="textarea" id="mot" placeholder="Ce qui a été vérifié, et pourquoi cette décision."></textarea></div>
        </div>`);
        modal("Décider du signalement", corps, [
          { label:"Annuler" },
          { label:"Notifier la décision", classe:"btn--primary", onClick: () => {
              try {
                DB.deciderSignalement(sg.id, corps.querySelector("#dec").value,
                  corps.querySelector("#mot").value);
              } catch (e){ toast(e.message); return false; }
              toast("Décision notifiée."); rendre();
            }}
        ]);
      };
      tr.lastElementChild.appendChild(b);
    }
    tb.appendChild(tr);
  });
  return el;
}

function vueMoteur(){
  const j = DB.journalMoteur();
  const dernier = j[0] || {};
  const regles = [
    ["Validation sans retour", "Quatorze jours après la déclaration du salarié, une mission sans réponse de l'association est comptée comme réalisée. Les points sont crédités selon le barème, mais le résultat reste estimé et identifié comme non confirmé.", dernier.validations_auto],
    ["Fermeture des annonces périmées", "Une annonce dont la date est dépassée depuis plus de sept jours est fermée. C'est l'engagement de fraîcheur pris envers les clients.", dernier.annonces_fermees],
    ["Génération des rapports", "Chaque période close produit son rapport, sans que personne le demande.", dernier.rapports],
    ["Recalcul du classement", "Refait chaque lundi. Aucun rang n'est stocké : il se déduit des points, ce qui interdit tout écart entre l'affiché et le réel.", dernier.classement ? "à jour" : "—"]
  ];
  const el = h(`<div class="stack" style="--gap:var(--s5)">
    <section class="card card--dark grain">
      <div class="between" style="flex-wrap:wrap;gap:var(--s4)">
        <div>
          <h3>Dernier passage</h3>
          <p class="muted" style="margin-top:6px;font-size:var(--t-sm)">
            ${dernier.le ? dateFR(dernier.le) : "jamais"} · ${nb(dernier.validations_auto || 0)} validation${(dernier.validations_auto || 0) > 1 ? "s" : ""} automatique${(dernier.validations_auto || 0) > 1 ? "s" : ""},
            ${nb(dernier.annonces_fermees || 0)} annonce${(dernier.annonces_fermees || 0) > 1 ? "s" : ""} fermée${(dernier.annonces_fermees || 0) > 1 ? "s" : ""},
            ${nb(dernier.rapports || 0)} rapport${(dernier.rapports || 0) > 1 ? "s" : ""} généré${(dernier.rapports || 0) > 1 ? "s" : ""}.</p>
        </div>
        <button class="btn btn--onDark btn--sm" id="run">Relancer maintenant</button>
      </div>
    </section>

    <div class="two">
      <section class="card">
        <h3>Ce qui tourne sans personne</h3>
        <table class="table" style="margin-top:var(--s5)"><tbody>
          ${regles.map(([t, d, v]) => `<tr>
            <td style="width:36%"><strong>${esc(t)}</strong><br>
              <span class="tnum" style="color:var(--forest-800);font-weight:600">${
                v === undefined ? "—" : (typeof v === "number" ? nb(v) : esc(v))}</span></td>
            <td class="muted">${esc(d)}</td></tr>`).join("")}
        </tbody></table>
        <hr class="sep">
        <p class="hint">En production ces règles sont des tâches planifiées dans la base
          (<span style="font-family:var(--font-mono)">supabase/05_taches.sql</span>), pas du code
          d'interface : elles s'exécutent même si personne n'ouvre la plateforme.</p>
      </section>

      <section class="card">
        <div class="between" style="margin-bottom:var(--s5)">
          <h3>Historique</h3>
          <button class="btn btn--ghost btn--sm" id="csvM">Exporter</button>
        </div>
        <div id="hj"></div>
      </section>
    </div>
  </div>`);

  const hj = el.querySelector("#hj");
  if (!j.length) hj.appendChild(vide({ titre:"Aucun passage", texte:"Le moteur n'a pas encore tourné." }));
  else {
    const t = h(`<table class="table"><thead><tr>
      <th>Date</th><th>Validations</th><th>Fermetures</th><th>Rapports</th></tr></thead><tbody></tbody></table>`);
    j.forEach(x => t.querySelector("tbody").appendChild(h(`<tr>
      <td class="muted tnum">${dateCourte(x.le)}</td>
      <td class="tnum">${nb(x.validations_auto)}</td>
      <td class="tnum">${nb(x.annonces_fermees)}</td>
      <td class="tnum">${nb(x.rapports)}</td></tr>`)));
    hj.appendChild(t);
  }
  el.querySelector("#run").onclick = () => {
    const f = DB.moteur();
    toast(`Passage terminé : ${f.validations_auto} validation(s), ${f.annonces_fermees} fermeture(s).`);
    rendre();
  };
  el.querySelector("#csvM").onclick = () => {
    versCSV("riseva-automatismes.csv",
      ["Date", "Validations automatiques", "Annonces fermées", "Rapports générés"],
      j.map(x => [x.le, x.validations_auto, x.annonces_fermees, x.rapports]));
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
    association_validee: "Association validée",
    quota: "Alerte de places",
    recap_hebdo: "Récapitulatif hebdomadaire",
    fin_saison: "Fin de saison"
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
      <td><span class="badge ${x.etat === "envoyé" ? "badge--ok"
        : /programmé/.test(x.etat) ? "badge--info" : "badge--warn"}">${esc(x.etat)}</span></td>
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

function vueMecenat(u){
  const v = DB.valorisationMecenat(u.org);
  const e = DB.entreprise(u.org);
  /* Le statut documentaire avant le montant. Un chiffre affiché sans ses pièces donne
     une confiance que rien ne justifie, et c'est exactement ce qu'un contrôle démonte. */
  const missionsTT = DB.missions({ entreprise: u.org }).filter(m => {
    const a = DB.annonceDe(m); return a && a.temps_travail; });
  const pretFiscal = (() => {
    const points = [
      { libelle: "Coût journalier chargé renseigné dans les paramètres",
        ok: !!e.cout_jour_moyen },
      { libelle: "SIRET et adresse de facturation renseignés",
        ok: !!(e.siret && e.adresse) },
      { libelle: "Associations bénéficiaires ayant déclaré leur éligibilité au mécénat",
        ok: missionsTT.every(m => DB.eligibleMecenat((DB.annonceDe(m) || {}).asso)) },
      { libelle: "Convention de mise à disposition éditée pour chaque mission sur le temps de travail",
        ok: missionsTT.length === 0 ? false : true },
      { libelle: "Validation par votre expert-comptable avant déclaration",
        ok: false }
    ];
    const ok = points.filter(x => x.ok).length;
    return { points, ok, total: points.length, pret: ok >= 3 };
  })();
  const el = h(`<div class="stack" style="--gap:var(--s5)">
    <section class="card ${pretFiscal.pret ? "" : "card--flat"}"
      style="${pretFiscal.pret ? "" : "background:var(--warn-bg);border-color:transparent"}">
      <div class="between" style="flex-wrap:wrap;gap:var(--s4)">
        <div>
          <h3 style="font-size:var(--t-lg)">${pretFiscal.pret
            ? "Estimation calculable" : "Estimation non calculable en l'état"}</h3>
          <p class="muted" style="font-size:var(--t-sm);margin-top:6px;color:var(--ink-600)">
            ${pretFiscal.pret
              ? "Les pièces nécessaires existent. Le montant reste une estimation : votre expert-comptable l'arrête."
              : "Le chiffre ci-dessous ne vaut rien tant que les pièces ne suivent pas."}</p>
        </div>
        <span class="badge ${pretFiscal.pret ? "badge--ok" : "badge--warn"}">
          Justificatifs ${pretFiscal.ok} / ${pretFiscal.total}</span>
      </div>
      <div class="stack" style="--gap:var(--s2);margin-top:var(--s5);font-size:var(--t-sm)">
        ${pretFiscal.points.map(x => `<div class="row" style="align-items:flex-start;gap:var(--s3)">
          <span style="color:${x.ok ? "var(--forest-700)" : "var(--amber)"};margin-top:2px">
            ${x.ok ? ICONS.check : ICONS.clock}</span>
          <span class="${x.ok ? "muted" : ""}">${esc(x.libelle)}</span></div>`).join("")}
      </div>
    </section>

    <div class="kpis">
      ${kpi("Réduction d'impôt de l'entreprise", eur(v.reduction),
            `${Math.round(FISCAL.taux_reduction * 100)} % de ${eur(v.assietteRetenue)}`, "", "kpi--tete grain")}
      ${kpi("Mécénat de compétences", eur(v.competencesRetenu),
            `${v.demiJourneesTT} demi-journée${v.demiJourneesTT > 1 ? "s" : ""} sur le temps de travail`)}
      ${kpi("Dons des salariés", eur(v.donsSalaries), "hors assiette de l'entreprise")}
      ${kpi("Reportable", eur(v.reportable),
            v.reportable ? `sur ${FISCAL.report_annees} exercices` : "rien au-dessus du plafond")}
    </div>

    <div class="two">
      <section class="card" style="padding:var(--s8)">
        <h3>Le calcul, ligne par ligne</h3>
        <table class="table" style="margin-top:var(--s5)"><tbody>
          <tr><td>Dons versés par l'entreprise elle-même</td>
              <td class="tnum" style="text-align:right">${eur(v.donsEntreprise)}</td></tr>
          <tr><td>Mécénat de compétences, au coût de revient<br>
              <span class="muted" style="font-size:var(--t-xs)">${v.demiJourneesTT} demi-journées ×
              ${eur(v.coutDemiJournee)}, ${v.salariesConcernes} salarié${v.salariesConcernes > 1 ? "s" : ""} concerné${v.salariesConcernes > 1 ? "s" : ""}</span></td>
              <td class="tnum" style="text-align:right">${eur(v.competencesBrut)}</td></tr>
          ${v.ecreteParSalarie ? `<tr><td class="muted">Au-delà du plafond de ${eur(v.plafondSalarie)} par salarié</td>
              <td class="tnum" style="text-align:right;color:var(--ink-400)">− ${eur(v.ecreteParSalarie)}</td></tr>` : ""}
          <tr><td><strong>Assiette</strong></td>
              <td class="tnum" style="text-align:right"><strong>${eur(v.assiette)}</strong></td></tr>
          <tr><td class="muted">Plafond de l'entreprise<br>
              <span style="font-size:var(--t-xs)">le plus élevé entre ${eur(FISCAL.plafond_plancher)}
              et ${(FISCAL.plafond_taux_ca * 1000)} pour mille du chiffre d'affaires,
              soit ${pct(FISCAL.plafond_taux_ca * 100)} %</span></td>
              <td class="tnum" style="text-align:right">${eur(v.plafondEntreprise)}</td></tr>
          ${v.reportable ? `<tr><td class="muted">Excédent reporté sur les exercices suivants</td>
              <td class="tnum" style="text-align:right">${eur(v.reportable)}</td></tr>` : ""}
          <tr><td><strong>Réduction d'impôt de l'entreprise, ${Math.round(FISCAL.taux_reduction * 100)} %</strong></td>
              <td class="tnum" style="text-align:right"><strong style="color:var(--forest-800)">${eur(v.reduction)}</strong></td></tr>
        </tbody></table>

        <hr class="sep">
        <h3 style="font-size:var(--t-lg)">Les dons de vos salariés, à part</h3>
        <p class="muted" style="font-size:var(--t-sm);margin-top:var(--s3)">
          ${eur(v.donsSalaries)} ont été versés par vos salariés <strong style="color:var(--ink)">en
          leur nom propre</strong>. Ces montants n'entrent pas dans l'assiette de l'entreprise :
          l'article 238 bis vise les versements effectués par l'entreprise elle-même. Les faire
          entrer dans votre calcul fabriquerait une réduction d'impôt indue.</p>
        <p class="muted" style="font-size:var(--t-sm);margin-top:var(--s3)">
          Chaque salarié reçoit son propre reçu, au modèle ${esc(FISCAL.cerfa_particulier)}, et
          peut déduire 66 % de son don de son impôt sur le revenu, dans la limite de 20 % de son
          revenu imposable. Soit environ ${eur(v.reductionSalaries)} au total, pour eux, pas pour vous.</p>
        <div class="row" style="gap:var(--s2);margin-top:var(--s6);flex-wrap:wrap">
          <button class="btn btn--primary btn--sm" id="conv">Éditer une convention</button>
          <button class="btn btn--ghost btn--sm" id="att">Attestation annuelle</button>
          <button class="btn btn--ghost btn--sm" id="csvM">Exporter le détail</button>
        </div>
      </section>

      <div class="stack" style="--gap:var(--s5)">
        <section class="card">
          <h3>Ce qui compte, et ce qui ne compte pas</h3>
          <div class="stack" style="--gap:var(--s4);margin-top:var(--s5);font-size:var(--t-sm)">
            <div><span class="badge badge--ok">Déductible</span>
              <p class="muted" style="margin-top:6px">Une mission réalisée <strong>sur le temps de
              travail</strong>, à l'initiative de l'entreprise. C'est du mécénat de compétences :
              le salarié reste payé par vous, et la mise à disposition se valorise au coût de revient.</p></div>
            <div><span class="badge">Non déductible</span>
              <p class="muted" style="margin-top:6px">Une mission faite sur le temps personnel du
              salarié. C'est du bénévolat, ça compte pour vos points et pour vos équipes,
              mais pas pour votre impôt. ${v.demiJourneesPerso} demi-journée${v.demiJourneesPerso > 1 ? "s" : ""}
              dans ce cas cette saison.</p></div>
          </div>
          <hr class="sep">
          <p class="hint">Chiffres ${FISCAL.annee}. Le plafond par salarié est « trois fois le
            montant du plafond mentionné à l'article L. 241-3 du code de la Sécurité sociale ».
            Le BOFiP ne dit pas si ce plafond est mensuel ou annuel, et les sources divergent :
            nous retenons la lecture basse, mensuelle, soit ${eur(FISCAL.plafond_mecenat_par_salarie)}.
            Elle sous-estime plutôt que de promettre trop. Votre expert-comptable tranchera,
            la valeur est paramétrable.</p>
        </section>

        <section class="card card--flat" style="background:var(--warn-bg);border-color:transparent">
          <h3 style="font-size:var(--t-lg)">Une estimation, pas une déclaration</h3>
          <p class="muted" style="font-size:var(--t-sm);margin-top:var(--s3);color:var(--ink-600)">
            La valorisation fiscale est établie <strong>après réalisation</strong> de la mission,
            sous votre responsabilité exclusive, à partir du temps effectivement validé et de votre
            coût de revient.</p>
          <p class="muted" style="font-size:var(--t-sm);margin-top:var(--s3);color:var(--ink-600)">
            <strong>Les estimations affichées ici, les heures planifiées et les points de classement
            sont sans valeur fiscale.</strong> Seules les heures réellement exécutées et validées
            par l'association comptent. Votre expert-comptable arrête les chiffres.</p>
          <p class="muted" style="font-size:var(--t-sm);margin-top:var(--s3);color:var(--ink-600)">
            Riseva est l'outil de préparation et de traçabilité : ni employeur, ni association
            bénéficiaire, ni assureur, ni conseil fiscal, ni émetteur du reçu.</p>
        </section>
      </div>
    </div>
  </div>`);

  el.querySelector("#conv").onclick = () => {
    const ms = DB.missions({ entreprise: u.org }).filter(m => {
      const a = DB.annonceDe(m);
      return a && a.type === "benevolat_demi_journee" && a.temps_travail
             && ["engagee", "a_valider", "validee", "validee_auto"].includes(m.etat);
    });
    if (!ms.length){
      toast("Aucune mission sur le temps de travail pour l'instant.");
      return;
    }
    const corps = h(`<div>
      <p class="muted" style="font-size:var(--t-sm)">
        Choisissez la mission : le document est prérempli avec ses dates, son lieu, le salarié
        concerné et la valorisation au coût de revient.</p>
      <div class="field" style="margin-top:var(--s5)"><label>Mission</label>
        <select class="select" id="mi">
          ${ms.map(m => { const a = DB.annonceDe(m), sal = DB.utilisateur(m.salarie);
            return `<option value="${m.id}">${esc(a.titre)} — ${esc(sal ? sal.nom : "?")} — ${dateFR(m.date)}</option>`;
          }).join("")}
        </select></div>
      <div class="encadreMini">
        <p><strong>Deux régimes, et ils ne se valent pas.</strong></p>
        <p>Pour une tâche délimitée sur une ou deux demi-journées, c'est une prestation de
        service : la convention suffit. Si l'association encadre réellement votre salarié dans
        la durée, c'est un prêt de main-d'œuvre, et il faut en plus un avenant à son contrat,
        son accord écrit et la consultation du CSE. Se tromper expose au prêt illicite.</p>
      </div>
    </div>`);
    modal("Convention de mécénat de compétences", corps, [
      { label:"Annuler" },
      { label:"Générer le document", classe:"btn--primary", onClick: () => {
          const m = ms.find(x => x.id === corps.querySelector("#mi").value);
          ouvrirConvention(u, m);
        }}
    ]);
  };
  el.querySelector("#att").onclick = () => modal("Attestation de mécénat",
    `<p class="muted">L'attestation reprend les missions réalisées sur le temps de travail,
     leur valorisation au coût de revient et le total de l'assiette. Elle est destinée à votre
     comptabilité et aux associations bénéficiaires, qui doivent la contresigner.</p>
     <p class="hint" style="margin-top:var(--s4)">Le coût journalier moyen actuellement retenu est
     de ${eur(e.cout_jour_moyen || 300)}. Vous pouvez le corriger dans les paramètres de l'entreprise.</p>`,
    [{ label:"Fermer" },
     { label:"Imprimer", classe:"btn--primary", onClick: () => setTimeout(() => window.print(), 300) }]);

  el.querySelector("#csvM").onclick = () => {
    const ms = DB.missions({ entreprise: u.org })
                 .filter(m => m.etat === "validee" || m.etat === "validee_auto");
    versCSV("riseva-mecenat.csv",
      ["Mission", "Association", "Format", "Sur le temps de travail", "Salarié", "Date",
       "Quantité", "Valorisation"],
      ms.map(m => { const a = DB.annonceDe(m), sal = DB.utilisateur(m.salarie);
        const val = a.type === "benevolat_demi_journee" && a.temps_travail
          ? m.quantite * v.coutDemiJournee
          : (a.type === "don_financier" ? m.quantite : 0);
        return [a.titre, (DB.association(a.asso) || {}).nom, BAREME[a.type].label,
                a.temps_travail ? "oui" : "non", sal ? sal.nom : "—", m.date, m.quantite, val]; }));
    toast("Export téléchargé.");
  };
  return el;
}

/* Ouvre la convention préremplie dans un onglet, prête à imprimer.
   Riseva prépare, les trois parties signent. Riseva n'est pas partie à l'acte. */
/* Ouvre la convention préremplie dans un onglet, prête à imprimer.
   Structure reprise des exigences de R. 8241-2 et des recommandations de prudence :
   subordination, autorité fonctionnelle, santé-sécurité, valorisation, preuve.
   Riseva prépare et trace. Elle n'est ni employeur, ni association, ni assureur,
   ni conseil fiscal, ni émetteur du reçu. */
function ouvrirConvention(u, m){
  const e = DB.entreprise(u.org);
  const a = DB.annonceDe(m);
  const asso = DB.association(a.asso);
  const sal = DB.utilisateur(m.salarie);
  const v = DB.valorisationMecenat(u.org);
  const valorisation = m.quantite * v.coutDemiJournee;
  const champ = (x) => x || `<span class="v">[à compléter]</span>`;
  const art = (n, titre, corps) =>
    `<h2>Article ${n} — ${titre}</h2>${corps}`;

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<title>Convention de mise à disposition — ${esc(e.nom)} et ${esc(asso.nom)}</title>
<style>
  body{font:15px/1.62 -apple-system,Segoe UI,Inter,sans-serif;color:#2C3026;background:#F2F0E9;
    margin:0;padding:48px 24px}
  .p{max-width:780px;margin:0 auto;background:#FAF9F5;padding:56px;border-radius:12px;
    box-shadow:0 24px 48px -20px rgba(11,38,32,.18)}
  h1{font-size:25px;letter-spacing:-.022em;color:#131510;margin:0 0 6px}
  .st{color:#63675C;font-size:14px;margin:0 0 4px}
  h2{font-size:15px;color:#131510;margin:30px 0 8px;padding-top:18px;border-top:1px solid #E5E2D9}
  p{margin:9px 0}
  ul{margin:9px 0;padding-left:20px} li{margin:4px 0}
  table{width:100%;border-collapse:collapse;margin:14px 0}
  td{padding:9px 0;border-bottom:1px solid #E5E2D9;vertical-align:top}
  td:first-child{color:#63675C;width:42%}
  .v{background:#F6EAD5;padding:0 5px;border-radius:3px}
  .note{background:#DFE6D0;border-radius:8px;padding:15px;font-size:13.5px;margin:14px 0}
  .cite{border-left:3px solid #1F5C4A;padding:4px 0 4px 16px;margin:14px 0;color:#2C3026}
  .sig{display:flex;gap:22px;margin-top:36px}
  .sig div{flex:1;border-top:1px solid #131510;padding-top:8px;font-size:13px;color:#63675C;min-height:92px}
  .pied{margin-top:36px;font-size:12px;color:#8A8F82}
  @media print{body{background:#fff;padding:0}.p{box-shadow:none;padding:0;background:#fff}
    .noprint{display:none}h2{page-break-after:avoid}}
  .noprint{text-align:center;margin-bottom:22px}
  .noprint button{font:inherit;background:#131510;color:#F2F0E9;border:0;border-radius:12px;
    padding:11px 22px;cursor:pointer}
</style></head><body>
<div class="noprint"><button onclick="window.print()">Imprimer ou enregistrer en PDF</button></div>
<div class="p">
  <h1>Convention de mise à disposition de personnel</h1>
  <p class="st">Mécénat de compétences — article L. 8241-3 du code du travail</p>
  <p class="st">Préparée le ${dateFR(new Date().toISOString())} à partir des données Riseva.
  À relire, compléter et signer avant la mission. Les champs
  <span class="v">[à compléter]</span> ne sont pas connus de la plateforme.</p>

  ${art(1, "Parties", `
    <p><strong>${esc(e.nom)}</strong>, ${champ("")} au capital de ${champ("")},
    SIREN ${champ(esc(e.siret || ""))}, siège ${champ(esc(e.adresse || ""))},
    représentée par ${champ(esc(e.referent || ""))}, ci-après <strong>l'Entreprise</strong>.</p>
    <p><strong>${esc(asso.nom)}</strong>, association loi 1901, RNA ${champ(esc(asso.rna || ""))},
    siège ${champ(esc(asso.ville || ""))}, représentée par
    ${champ(esc((DB.reglagesRecus(asso.id) || {}).signataire || ""))}, ci-après
    <strong>l'Association</strong>.</p>
    <p><strong>${esc(sal ? sal.nom : "")}</strong>, ${champ("")} au sein de l'Entreprise,
    ci-après <strong>le Salarié</strong>.</p>`)}

  ${art(2, "Objet et régime", `
    <p>Mise à disposition temporaire et gratuite, dans le cadre d'un mécénat de compétences, sur
    le fondement des articles <strong>L. 8241-3</strong> et <strong>R. 8241-2</strong> du code du
    travail. Il s'agit d'un <strong>prêt de personnel</strong>, et non d'une prestation pilotée
    par Riseva.</p>
    <div class="note">L'article L. 8241-3 autorise le prêt gratuit au profit des organismes visés
    aux a à g du 1 de l'article 238 bis du code général des impôts. Aucune condition d'effectif ne
    s'applique à l'Entreprise dans ce cas, l'opération est réputée sans but lucratif, et sa durée
    ne peut excéder ${FISCAL.duree_max_mise_a_disposition_ans} ans.</div>`)}

  ${art(3, "Finalité", `
    <p>La mise à disposition s'inscrit dans un partenariat d'intérêt commun entre l'Entreprise et
    l'Association, répondant au besoin suivant : ${esc(a.description)}</p>`)}

  ${art(4, "Éligibilité et intention libérale", `
    <p>L'Association déclare relever de l'article 238 bis du code général des impôts, exercer une
    activité d'intérêt général et être habilitée à délivrer des reçus fiscaux.
    Rescrit fiscal : ${champ("")}.</p>
    <p>La mise à disposition ne donne lieu à aucune contrepartie commerciale directe. Seules les
    contreparties symboliques expressément décrites ci-après sont admises : ${champ("néant")}.</p>`)}

  ${art(5, "Consentement du salarié", `
    <p>Le Salarié a donné son accord <strong>libre, exprès, spécifique et écrit</strong> à cette
    mission et à ses dates${m.consentement ? `, enregistré le ${dateFR(m.consentement.donne_le)}
    sur la plateforme Riseva` : ""}. Une acceptation générale de conditions d'utilisation ne vaut
    pas consentement au sens de l'article R. 8241-2.</p>
    <p>Un refus ne peut donner lieu ni à sanction, ni à licenciement, ni à mesure discriminatoire.</p>`)}

  ${art(6, "Mission", `
    <table>
      <tr><td>Intitulé</td><td>${esc(a.titre)}</td></tr>
      <tr><td>Besoin et tâches réelles</td><td>${esc(a.description)}</td></tr>
      <tr><td>Résultat attendu</td><td>${champ("")}</td></tr>
      <tr><td>Compétences mobilisées</td><td>${champ("")}</td></tr>
      <tr><td>Tâches exclues</td><td>${champ("")}</td></tr>
      <tr><td>Accès ou habilitations requis</td><td>${champ("")}</td></tr>
    </table>
    <p>La mission doit correspondre à une activité réellement et effectivement exécutée.</p>`)}

  ${art(7, "Durée, horaires et lieu", `
    <table>
      <tr><td>Date prévue</td><td>${dateFR(m.date)}</td></tr>
      <tr><td>Heures prévues, pauses comprises</td><td>${champ("")}</td></tr>
      <tr><td>Durée</td><td>${m.quantite} demi-journée${m.quantite > 1 ? "s" : ""},
        soit ${m.quantite * 4} heures</td></tr>
      <tr><td>Lieu exact ou distanciel</td><td>${esc(a.lieu || "")}</td></tr>
      <tr><td>Déplacements prévus</td><td>${champ("")}</td></tr>
    </table>
    <p>Les heures sont effectuées <strong>sur le temps de travail autorisé par l'employeur</strong>.
    Toute modification doit être tracée par écrit.</p>`)}

  ${art(8, "Contrat de travail et subordination", `
    <div class="cite">L'Entreprise conserve pendant toute la mise à disposition sa qualité
    d'employeur ainsi que ses pouvoirs juridique et disciplinaire. L'Association dispose uniquement
    de l'autorité fonctionnelle nécessaire à l'exécution de la mission décrite. Elle ne peut
    modifier la mission, les horaires ou le lieu, ni prononcer une sanction : toute difficulté est
    signalée à l'Entreprise.</div>
    <p>Le contrat de travail n'est ni rompu ni suspendu. Rémunération, congés, carrière, protection
    sociale et discipline restent gérés par l'Entreprise. Le retour au poste habituel ou équivalent
    se fait sans incidence sur la carrière ou la rémunération.</p>`)}

  ${art(9, "Autorité fonctionnelle de l'Association", `
    <table>
      <tr><td>Référent de l'Association</td><td>${champ("")}</td></tr>
      <tr><td>Interlocuteur d'urgence</td><td>${champ("")}</td></tr>
    </table>`)}

  ${art(10, "Santé et sécurité", `
    <p>L'Association assure l'accueil sécurité, informe des risques du poste et du site, donne les
    consignes, vérifie les formations ou habilitations nécessaires et fournit les équipements de
    protection individuelle. Elle est responsable des conditions d'exécution du travail, notamment
    de la durée du travail, des repos, de la santé et de la sécurité pendant la mission.</p>`)}

  ${art(11, "Conditions financières", `
    <table>
      <tr><td>Salaire du Salarié</td><td>Maintenu par l'Entreprise</td></tr>
      <tr><td>Salaires et charges facturés</td><td><strong>0 €</strong>, mise à disposition gratuite</td></tr>
      <tr><td>Transports, repas, hébergement, achats</td><td>${champ("néant")}</td></tr>
    </table>
    <p>Aucune marge n'est appliquée. Les frais professionnels ne doivent pas être ajoutés
    silencieusement à la valorisation fiscale.</p>`)}

  ${art(12, "Émargement et preuve", `
    <p>Seules les heures <strong>réellement exécutées et validées</strong> par l'Association sont
    retenues. Une réservation, une présence planifiée ou l'attribution de points sur Riseva
    ne constitue pas une preuve fiscale.</p>
    <p>La feuille d'émargement, signée par le Salarié et certifiée par le référent de
    l'Association, est annexée à la présente convention.</p>`)}

  ${art(13, "Valorisation", `
    <div class="cite">La valorisation fiscale est établie après réalisation de la mission, sous la
    responsabilité exclusive de l'Entreprise, à partir du temps effectivement validé et de son coût
    de revient. Les estimations affichées par Riseva, les heures planifiées et les points de
    classement sont sans valeur fiscale.</div>
    <table>
      <tr><td>Coût journalier chargé retenu</td><td>${eur(e.cout_jour_moyen || 300)}</td></tr>
      <tr><td>Demi-journées prévues</td><td>${m.quantite}</td></tr>
      <tr><td>Valorisation prévisionnelle</td><td><strong>${eur(valorisation)}</strong></td></tr>
      <tr><td>Plafond par salarié et par exercice</td><td>${eur(v.plafondSalarie)}, soit trois fois
        le plafond mensuel de la Sécurité sociale</td></tr>
    </table>
    <p>Aucun tarif de consultant, prix de marché ou valeur de points n'entre dans ce calcul.</p>`)}

  ${art(14, "Reçu fiscal", `
    <p>L'Entreprise communique la valorisation finale. L'Association contrôle la réalité de la
    mission et son acceptation, puis émet le reçu au modèle <strong>Cerfa
    ${esc(FISCAL.cerfa_entreprise)}</strong> (2041-MEC-SD), sous sa propre numérotation et la
    signature d'une personne habilitée.</p>
    <p>Le reçu mentionne les dates, la description exhaustive de la mission, le détail des salariés
    concernés et la valorisation communiquée. Un reçu agrégé est possible, à condition de ne pas
    chevaucher deux exercices fiscaux du donateur.</p>`)}

  ${art(15, "Assurances et responsabilité", `
    <table>
      <tr><td>RC professionnelle de l'Entreprise</td><td>${champ("")}</td></tr>
      <tr><td>RC de l'Association</td><td>${champ("")}</td></tr>
      <tr><td>Confirmation que la RC de l'Association couvre les salariés mis à disposition</td>
        <td>${champ("")}</td></tr>
      <tr><td>Garantie individuelle accident, si la RC ne couvre pas les dommages corporels subis</td>
        <td>${champ("")}</td></tr>
    </table>
    <p>Le Salarié reste couvert par l'Entreprise au titre des accidents du travail et des maladies
    professionnelles, trajets compris. Aucune clause ne transfère « toute responsabilité » à une
    seule partie.</p>`)}

  ${art(16, "Accident et incident", `
    <p>Le Salarié avertit immédiatement l'Association et l'Entreprise. L'Association transmet les
    circonstances, lieu et témoins à l'Entreprise, qui procède à la déclaration.</p>`)}

  ${art(17, "Confidentialité, données et propriété", `
    <p>Chaque partie s'engage à la discrétion sur ce qu'elle apprend à l'occasion de la mission.
    Les livrables éventuels sont ${champ("restitués / cédés / concédés")} à l'Association. Le droit
    à l'image du Salarié fait l'objet d'un accord séparé. Un régime renforcé s'applique si la
    mission concerne des mineurs, des personnes vulnérables ou des données sensibles.</p>`)}

  ${art(18, "Suspension et cessation", `
    <p>Arrêt immédiat en cas de danger, de mission matériellement différente de celle décrite,
    d'absence d'habilitation ou de manquement grave. Toute annulation ou modification se fait par
    écrit. La cessation n'a aucun effet défavorable pour le Salarié, qui peut regagner son poste
    à tout moment sans avoir à se justifier.</p>`)}

  ${art(19, "Preuves, litiges et rôle de Riseva", `
    <p>Les versions signées, les émargements, les validations et les corrections sont conservés
    par les parties. <strong>Riseva est l'outil de préparation et de traçabilité : ni employeur,
    ni association bénéficiaire, ni assureur, ni conseil fiscal, ni émetteur du reçu.</strong></p>
    <p>À défaut d'accord amiable, compétence est donnée aux tribunaux du ressort du siège de
    l'Entreprise.</p>`)}

  ${art(20, "Signatures et annexes", `
    <p>Annexes : fiche mission, calendrier, risques et équipements, feuille d'émargement,
    justificatifs d'assurance, déclaration d'éligibilité de l'Association.</p>
    <p>Fait à ${champ("")}, le ${champ("")}, en trois exemplaires originaux.</p>
    <div class="sig">
      <div>Pour l'Entreprise<br>${esc(e.referent || "")}</div>
      <div>Pour l'Association<br>${esc((DB.reglagesRecus(asso.id) || {}).signataire || asso.nom)}</div>
      <div>Le Salarié<br>${esc(sal ? sal.nom : "")}</div>
    </div>`)}

  <p class="pied">Document préparé par Riseva — version ${dateFR(new Date().toISOString())},
  mission ${esc(m.id)}. Riseva n'est pas partie à la présente convention, ne la signe pas, et
  n'en garantit ni la validité juridique ni les conséquences fiscales. Faites-la relire par
  votre conseil avant la première signature.</p>
</div></body></html>`;

  const w = window.open("", "_blank");
  if (!w){ toast("Autorisez les fenêtres pour ouvrir le document."); return; }
  w.document.write(html);
  w.document.close();
  toast("Convention ouverte dans un nouvel onglet.");
}

function vueRecus(u){
  const aid = u.org;
  const r = DB.reglagesRecus(aid);
  const prets = DB.recusPrets(aid);
  const recap = DB.recapRecus(aid);
  const a = DB.association(aid);

  const el = h(`<div class="two">
    <section class="card" style="padding:var(--s8)">
      <div class="between" style="margin-bottom:var(--s5)">
        <h3>Vos reçus fiscaux</h3>
        <span class="badge ${prets ? "badge--ok" : "badge--warn"}">${prets ? "Émission active" : "Incomplet"}</span>
      </div>
      <p class="muted" style="font-size:var(--t-sm)">
        Riseva prépare le reçu et l'envoie au donateur, mais <strong style="color:var(--ink)">c'est
        votre association qui l'émet</strong> : sous votre numéro d'ordre, avec votre signature, et
        sous votre responsabilité. La loi ne permet pas à un tiers de délivrer un reçu à votre place.
      </p>
      <div class="stack" style="--gap:var(--s3);margin-top:var(--s5);font-size:var(--t-sm)">
        <div class="row" style="align-items:flex-start;gap:var(--s3)">
          <span class="badge">Cerfa ${esc(FISCAL.cerfa_particulier)}</span>
          <span class="muted">Don d'un salarié à titre personnel, article 200 du CGI.</span></div>
        <div class="row" style="align-items:flex-start;gap:var(--s3)">
          <span class="badge">Cerfa ${esc(FISCAL.cerfa_entreprise)}</span>
          <span class="muted">Don ou mécénat de l'entreprise, article 238 bis du CGI.
            Obligatoire depuis le 1<sup>er</sup> janvier 2022.</span></div>
      </div>
      <p class="hint">Riseva choisit le bon modèle selon l'origine du don. Vous pouvez l'adapter
        à vos couleurs, à condition de conserver toutes les mentions obligatoires.</p>

      <div class="stack" style="--gap:var(--s4);margin-top:var(--s6)">
        <label class="checkline"><input type="checkbox" id="elig" ${r.eligible_mecenat ? "checked" : ""}>
          <span>Je certifie que ${esc(a.nom)} est éligible au mécénat au sens de l'article 200
          du CGI, et habilitée à délivrer des reçus fiscaux.</span></label>
        <div class="row" style="gap:var(--s4);align-items:stretch">
          <div class="field" style="flex:1"><label>Signataire habilité</label>
            <input class="input" id="sig" value="${esc(r.signataire || "")}" placeholder="Prénom Nom"></div>
          <div class="field" style="flex:1"><label>Qualité</label>
            <input class="input" id="qual" value="${esc(r.qualite || "")}" placeholder="Président, trésorier..."></div>
        </div>
        <div class="row" style="gap:var(--s4);align-items:stretch">
          <div class="field" style="flex:1"><label>Préfixe de numérotation</label>
            <input class="input" id="pref" value="${esc(r.prefixe || "")}" placeholder="QV-2027-"></div>
          <div class="field" style="width:180px"><label>Prochain numéro</label>
            <input class="input" id="num" type="number" min="1" value="${r.prochain_numero || 1}"></div>
        </div>
        <label class="checkline"><input type="checkbox" id="actif" ${r.actif ? "checked" : ""}>
          <span>Émettre automatiquement un reçu à chaque don encaissé.</span></label>
      </div>

      <button class="btn btn--primary" style="margin-top:var(--s6)" id="save">Enregistrer</button>
      <p class="hint">Sans ces réglages, Riseva n'émet rien plutôt que d'émettre un reçu irrégulier.
        Un reçu délivré à tort expose l'association à une amende égale à 25 % des sommes qui y
        figurent (article 1740 A du CGI).</p>
    </section>

    <div class="stack" style="--gap:var(--s5)">
      <section class="card kpi kpi--tete grain">
        <span class="kpi__label">Dons de la saison</span>
        <span class="kpi__value">${eur(recap.montant)}</span>
        <span class="kpi__delta">${recap.nombre} reçu${recap.nombre > 1 ? "s" : ""} à émettre</span>
      </section>

      <section class="card">
        <h3>Déclaration annuelle</h3>
        <p class="muted" style="font-size:var(--t-sm);margin-top:var(--s3)">
          Depuis 2021, toute association qui délivre des reçus doit déclarer chaque année le
          montant global des dons portés sur ses reçus et leur nombre, dans les trois mois
          suivant la clôture de son exercice.</p>
        <div class="stack" style="--gap:var(--s3);margin-top:var(--s5);font-size:var(--t-sm)">
          <div class="between"><span class="muted">Montant global</span>
            <strong class="tnum">${eur(recap.montant)}</strong></div>
          <div class="between"><span class="muted">Nombre de reçus</span>
            <strong class="tnum">${recap.nombre}</strong></div>
          <div class="between"><span class="muted">Exercice</span><span>${esc(recap.saison)}</span></div>
        </div>
        <button class="btn btn--ghost btn--block" style="margin-top:var(--s6)" id="csvR">Exporter le détail des dons</button>
      </section>
    </div>
  </div>`);

  el.querySelector("#save").onclick = () => {
    DB.majReglagesRecus(aid, {
      eligible_mecenat: el.querySelector("#elig").checked,
      actif: el.querySelector("#actif").checked,
      signataire: el.querySelector("#sig").value.trim(),
      qualite: el.querySelector("#qual").value.trim(),
      prefixe: el.querySelector("#pref").value.trim(),
      prochain_numero: Number(el.querySelector("#num").value) || 1
    });
    toast(DB.recusPrets(aid) ? "Réglages enregistrés, l'émission est active."
                             : "Enregistré. L'émission reste inactive tant qu'il manque un réglage.");
    rendre();
  };
  el.querySelector("#csvR").onclick = () => {
    const ms = DB.missions({ asso: aid })
                 .filter(m => (DB.annonceDe(m) || {}).type === "don_financier"
                           && (m.etat === "validee" || m.etat === "validee_auto"));
    versCSV("riseva-dons.csv", ["Date", "Entreprise", "Donateur", "Montant", "Annonce"],
      ms.map(m => { const an = DB.annonceDe(m), sal = DB.utilisateur(m.salarie);
        return [m.date, (DB.entreprise(m.entreprise) || {}).nom, sal ? sal.nom : "—",
                m.quantite, an.titre]; }));
    toast("Export téléchargé.");
  };
  return el;
}

function vuePreferences(u){
  const p = DB.preferences(u.id);
  const lignes = [
    ["mail_mission", "Missions et validations",
     "Un mail quand une association confirme ou refuse une mission, et quand quelqu'un se positionne sur une de vos annonces."],
    ["mail_hebdo", "Récapitulatif hebdomadaire",
     "Un seul mail le lundi avec le classement, les nouvelles annonces et ce qui vous attend. C'est le réglage qui remplace le mieux les alertes une par une."],
    ["mail_saison", "Trimestres et fin de saison",
     "Trophées, rapports trimestriels, rapport annuel et échéances de la saison."]
  ];
  const el = h(`<div class="two">
    <section class="card" style="padding:var(--s8)">
      <h3>Ce que vous recevez par mail</h3>
      <p class="muted" style="font-size:var(--t-sm);margin-top:var(--s3)">
        Les notifications restent visibles dans la cloche même si vous coupez les mails.
        Nous n'envoyons jamais de message commercial à vos salariés.</p>
      <div class="stack" style="--gap:var(--s5);margin-top:var(--s6)" id="l"></div>
      <button class="btn btn--primary" style="margin-top:var(--s8)" id="save">Enregistrer</button>
    </section>
    <div class="stack" style="--gap:var(--s5)">
      <section class="card">
        <h3>Notifications en cours</h3>
        <div class="stack" style="--gap:var(--s3);margin-top:var(--s5)" id="apercu"></div>
      </section>

      <section class="card">
        <h3>Cet environnement</h3>
        <p class="muted" style="font-size:var(--t-sm);margin-top:var(--s3)">
          Tout ce que vous faites ici est enregistré et retrouvé à votre retour, exactement
          comme dans la version en production. ${DB.enregistreLe()
            ? `Dernier enregistrement le ${dateFR(DB.enregistreLe())}.` : ""}</p>
        <button class="btn btn--ghost btn--sm" style="margin-top:var(--s5)" id="raz">
          Remettre la démonstration à neuf</button>
        <p class="hint">Efface tout ce qui a été saisi et revient au jeu de départ.
          Une démonstration qu'on ne peut pas remettre à zéro finit par ne plus rien démontrer.</p>
      </section>
    </div>
  </div>`);
  const box = el.querySelector("#l");
  lignes.forEach(([cle, titre, texte]) => {
    box.appendChild(h(`<label class="checkline" style="align-items:flex-start">
      <input type="checkbox" data-p="${cle}" ${p[cle] ? "checked" : ""}>
      <span><strong style="color:var(--ink)">${esc(titre)}</strong>
        <span style="display:block;margin-top:2px">${esc(texte)}</span></span></label>`));
  });
  const ap = el.querySelector("#apercu");
  const n = DB.notifications(u.id);
  if (!n.length) ap.appendChild(h(`<p class="muted" style="font-size:var(--t-sm)">Rien en attente.</p>`));
  n.slice(0, 6).forEach(x => ap.appendChild(h(`<div class="row" style="align-items:flex-start;gap:var(--s3)">
    <span class="notif__point notif__point--${x.ton}" style="margin-top:7px"></span>
    <span style="font-size:var(--t-sm)"><strong>${esc(x.titre)}</strong>
      <span class="muted" style="display:block">${esc(x.texte)}</span></span></div>`)));
  el.querySelector("#save").onclick = () => {
    const champs = {};
    el.querySelectorAll("[data-p]").forEach(i => champs[i.dataset.p] = i.checked);
    DB.majPreferences(u.id, champs);
    toast("Préférences enregistrées.");
  };
  el.querySelector("#raz").onclick = () => modal("Remettre la démonstration à neuf",
    `<p class="muted">Tout ce qui a été saisi depuis le début disparaît : annonces publiées,
     missions engagées, réglages, comptes créés. Le jeu de départ revient.</p>
     <p class="hint" style="margin-top:var(--s4)">Cette action ne se défait pas.</p>`,
    [{ label:"Annuler" },
     { label:"Tout remettre à neuf", classe:"btn--primary", onClick: () => {
         DB.reinitialiser();
         try { localStorage.removeItem("riseva.notifs.lues"); } catch {}
         location.reload(); }}]);
  return el;
}

/* ------------------------------------------------------------------ */
/* Tous ensemble                                                       */
/* ------------------------------------------------------------------ */
/* Ce que le réseau entier a produit. Aucune entreprise n'est nommée, aucun
   salarié n'est identifiable : ce sont des compteurs, additionnés par le même
   code que celui d'une entreprise seule. On montre aussi la part de la maison,
   parce qu'un total auquel on ne se situe pas ne sert à rien. */
function vueEnsemble(u){
  const r = DB.reseau();
  const mien = u.org ? DB.realisations({ entreprise: u.org }) : null;
  const mesArbres = mien ? (mien.parUnite.arbre || 0) : 0;
  const part = r.arbres ? Math.round((mesArbres / r.arbres) * 100) : 0;
  const monEnt = u.org ? DB.entreprise(u.org) : null;
  const liste = r.realisations.liste;
  const tete = liste.slice(0, 4), reste = liste.slice(4);

  const chiffre = (n, l) => `<div class="ensemble__c">
    <span class="ensemble__cn tnum">${n}</span><span class="ensemble__cl">${esc(l)}</span></div>`;

  const el = h(`<div class="stack" style="--gap:var(--s6)">
    <section class="stack" style="--gap:var(--s2)">
      <h2>Résultats déclarés par le réseau Riseva</h2>
      <p class="muted" style="max-width:62ch">
        Depuis le lancement, toutes entreprises confondues. Les données sont agrégées :
        aucune entreprise ni aucun salarié n'est nommé.
      </p>
    </section>

    <div id="foret"></div>

    ${monEnt ? `<section class="card card--dark grain stack" style="--gap:var(--s3)">
      <h3 style="color:var(--paper)">Votre part</h3>
      <p style="color:var(--forest-100);max-width:62ch">
        ${esc(monEnt.nom)} a fait planter <strong class="tnum" style="color:var(--lime)">${nb(mesArbres)}</strong>
        arbre${mesArbres > 1 ? "s" : ""} confirmés sur les ${nb(r.arbres)} du réseau${part >= 1 ? `, soit ${part} %` : ""}.
        ${mien && mien.missions ? `${nb(mien.missions)} de vos missions ont produit un résultat mesurable.` : ""}
      </p>
    </section>` : ""}

    <section class="card stack" style="--gap:var(--s5)">
      <h3>Le réseau en chiffres</h3>
      <div class="ensemble__chiffres">
        ${chiffre(nb(r.missions), r.realisations.sansReponse
            ? `missions validées, dont ${nb(r.realisations.sansReponse)} clôturées automatiquement sans confirmation`
            : "missions validées")}
        ${chiffre(nb(r.entreprises), r.entreprises > 1
            ? "entreprises avec au moins une action validée"
            : "entreprise avec au moins une action validée")}
        ${chiffre(nb(r.associations), r.associations > 1 ? "associations soutenues" : "association soutenue")}
        ${chiffre(nb(r.heures) + " h", "de temps offert")}
      </div>
    </section>

    <section class="card stack" style="--gap:var(--s5)">
      ${/* Un badge « 25 missions sans réponse » posé sur le titre « ce que les
            associations ont confirmé » se contredit au premier regard. Il
            appartient au bloc des estimations, pas à celui des confirmations. */""}
      <h3>Ce que les associations ont confirmé</h3>
      <div class="ensemble__unites">
        ${tete.map(x => `<div class="ensemble__u">
          <span class="ensemble__uq tnum">${nb(x.quantite)}</span>
          <span class="ensemble__ul">${esc(x.quantite > 1 ? x.pl : x.un)}</span>
        </div>`).join("") || `<p class="muted">Rien n'a encore été confirmé.</p>`}
      </div>
      ${reste.length ? `<details class="volet">
        <summary>Les ${nb(reste.length)} autres résultats</summary>
        <div class="ensemble__unites" style="margin-top:var(--s4)">
          ${reste.map(x => `<div class="ensemble__u">
            <span class="ensemble__uq tnum">${nb(x.quantite)}</span>
            <span class="ensemble__ul">${esc(x.quantite > 1 ? x.pl : x.un)}</span>
          </div>`).join("")}
        </div>
      </details>` : ""}

      ${/* Les estimations ne se glissent pas en petit gris au milieu des chiffres
            confirmés : elles ont leur propre bloc, avec la raison pour laquelle
            elles existent. */
        Object.keys(r.realisations.estimeParUnite).length ? `<div class="ensemble__estime">
        ${/* « En plus » invitait à additionner l'estimé au confirmé, ce que tout
              le reste du produit s'interdit. */""}
        <span class="ensemble__estimeT">Résultats estimés — non confirmés</span>
        <span class="ensemble__estimeL">${Object.entries(r.realisations.estimeParUnite)
          .sort((a, b) => b[1] - a[1]).slice(0, 4)
          .map(([k, v]) => `${nb(v)} ${esc((UNITES[k] || {}).pl || k)}`).join(" · ")}</span>
        <span class="ensemble__estimeN">${nb(r.realisations.sansReponse)} mission${
          r.realisations.sansReponse > 1 ? "s" : ""} auto-validée${
          r.realisations.sansReponse > 1 ? "s" : ""} après quatorze jours sans réponse.
          Le résultat est estimé à partir de l'objectif annoncé : il n'a pas été constaté
          par l'association.</span>
      </div>` : ""}

      <details class="volet">
        <summary>Comment ces chiffres sont calculés</summary>
        <p class="muted" style="font-size:var(--t-sm);margin-top:var(--s3);max-width:70ch">
          Chaque unité vient d'une annonce qui l'annonçait, et d'une association qui a
          confirmé le chiffre après la mission. Le confirmé et l'estimé ne sont jamais
          additionnés. Riseva additionne, elle n'audite pas.
        </p>
      </details>
    </section>
  </div>`);

  el.querySelector("#foret").appendChild(foret(r.arbres, { unite: "arbres plantés" }));
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
    classement:[vueClassement,     "Score et classement"],
    annuaire:  [vueAnnuaire,       "Associations"],
    ensemble:  [vueEnsemble,       "Tous ensemble"],
    equipe:    [vueEquipe,         "Équipe"],
    rapports:  [vueRapports,       "Rapports"],
    mecenat:   [vueMecenat,        "Mécénat"],
    abonnement:[vueAbonnement,     "Abonnement"],
    parametres:[vueParametres,     "Paramètres"],
    preferences:[vuePreferences,   "Préférences"]
  },
  salarie: {
    tableau:   [tableauSalarie,    "Tableau de bord"],
    annonces:  [vueAnnonces,       "Annonces"],
    missions:  [vueMissions,       "Mes missions"],
    classement:[vueClassement,     "Score et classement"],
    annuaire:  [vueAnnuaire,       "Associations"],
    ensemble:  [vueEnsemble,       "Tous ensemble"],
    activite:  [vueActivite,       "Mon activité"],
    preferences:[vuePreferences,   "Préférences"]
  },
  association: {
    tableau:    [tableauAsso,  "Tableau de bord"],
    mesannonces:[(u) => { const d = h(`<section class="card"></section>`);
                          d.appendChild(tableAnnoncesAsso(DB.annonces({ asso: u.org }), u)); return d; }, "Mes annonces"],
    avalider:   [vueAValider,  "Missions à valider"],
    page:       [vuePageAsso,  "Ma page publique"],
    recus:      [vueRecus,     "Reçus fiscaux"],
    preferences:[vuePreferences, "Préférences"]
  },
  admin: {
    tableau:        [tableauAdmin,             "Tableau de bord"],
    entreprises:    [vueAdminEntreprises,      "Entreprises"],
    assos:          [vueAdminAssos,            "Associations"],
    preinscriptions:[vueAdminPreinscriptions,  "Préinscriptions"],
    pilotes:        [vuePilotes,               "Indicateurs"],
    saison:         [vueAdminSaison,           "Saison et barème"],
    journal:        [vueJournal,               "Journal des envois"],
    moteur:         [vueMoteur,                "Automatismes"],
    moderation:     [vueModeration,            "Modération"],
    preferences:    [vuePreferences,           "Préférences"]
  }
};

/* Le moteur passe une fois par ouverture de session, comme une tâche planifiée le
   ferait côté serveur. Rien à cliquer pour que la plateforme se tienne à jour. */
let moteurPasse = false;
function rendre(){
  if (!moteurPasse){ moteurPasse = true; try { DB.moteur(); } catch {} }
  const root = document.getElementById("root");
  root.innerHTML = "";
  const u = moi();
  if (!u){ root.appendChild(vueConnexion()); return; }
  /* Un accès suspendu, un compte retiré : la session ne survit pas à la décision.
     Rien ne servait de suspendre quelqu'un si son onglet déjà ouvert continuait
     de fonctionner comme avant — c'est exactement le trou que le SQL vient de
     fermer avec des helpers qui renvoient NULL, et l'interface doit dire la
     même chose. */
  if (u.role !== "admin" && (u.actif === false || u.anonyme)){
    setSession(null);
    root.appendChild(vueConnexion());
    toast(u.anonyme
      ? "Ce compte a été retiré de l'entreprise."
      : "Votre accès a été suspendu par votre administrateur.");
    return;
  }
  const table = ROUTES[u.role];
  const nom = (location.hash.split("/")[1] || "tableau");
  const [fn, titre] = table[nom] || table.tableau;
  let actions = "";
  if (u.role === "association" && nom === "mesannonces")
    actions = `<button class="btn btn--primary btn--sm" id="np">Publier une annonce</button>`;
  const el = coquille(u, fn(u), titre, actions,
    nom === "ensemble" ? "Depuis le lancement" : DB.saison().nom);
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
