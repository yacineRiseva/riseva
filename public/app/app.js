import { DB, BAREME, ETATS_MISSION, CATEGORIES, PLAFOND_PAR_FORMAT, DELAI_VALIDATION_JOURS, FISCAL, cerfaPour, FACTURATION, UNITES, INDICATEURS, INDICATEURS_LIMITES, SEUIL_ECART, TARIFS, devisPour, NATURES_EVENEMENT, GRAVITES_EVENEMENT, TYPES_EVENEMENT, ETATS_ACTION, MAX_CIRCONSTANCES, KITS_SAISON, ETATS_EXPEDITION, DON, MANDAT_RECUS, ibanLisible, ANNUAIRE, ANNUAIRE_LIMITES, ETATS_CORRESPONDANCE, chercherStructure, comparerFiche, lienPublic, connecterSupabase, demoDemandee, brancherEvenements, estArgent, estTemps, estPrive, heuresPour,
  RUBRIQUES, rubrique, rubriquesDe, saisisDe, calculesDe, sectionsDe,
  demarrerVierge } from "./data.js";
import { qrSvg } from "./qr.js";
import { classeur, telecharger } from "./tableur.js";
import { h, esc, nb, pct, eur, dateFR, dateCourte, initiales, ecusson, rangFR, ICONS, toast, modal, kpi, spark, riviere, jauge, vignette, couvertureAsso, carteFrance, foret, versCSV, vide, bandeauRealisations } from "./ui.js";

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
      ["adoption",   "Adoption",     "trophy"],
      ["supports",   "Affiches",     "box"],
      ["mecenat",    "Mécénat",      "coins"],
      ["materiel",   "Dons de matériel", "box"],
      ["dossier",    "Réponses clients", "hands"],
      /* La fiche VSME figure dans ce qui est compris au contrat. Elle n'etait
         atteignable qu'en tapant #/vsme dans la barre d'adresse : pour un
         client, elle n'existait pas. */
      ["vsme",       "Fiche VSME",       "report"],
      ["abonnement", "Abonnement",   "card"],
      ["parametres", "Paramètres",   "settings"]
    ]}
  ],
  /* Le référent de site voit son site, et rien d'autre. Pas de contrat, pas de
     facture, pas de mécénat : ce sont des affaires de société, pas de lieu. */
  site_referent: [
    { groupe: "Mon site", items: [
      ["tableau",    "Tableau de bord", "dashboard"],
      ["equipe",     "Mes salariés",    "users"],
      ["indicateurs","Données sociales", "report"],
      ["securite",   "Sécurité",        "shield"]
    ]},
    { groupe: "Saison", items: [
      ["annonces",   "Annonces",        "megaphone"],
      ["missions",   "Missions du site","check"],
      ["annuaire",   "Associations",    "heart"],
      ["ensemble",   "Tous ensemble",   "leaf"]
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
      ["recus",     "Reçus fiscaux",     "report"],
      ["dons",      "Dons en argent",    "coins"],
      ["dossier",   "Mon dossier",       "report"]
    ]}
  ],
  cse: [
    { groupe: "Comité social et économique", items: [
      ["tableau",   "Ce que nous lisons", "dashboard"],
      ["ensemble",  "Tous ensemble",      "leaf"],
      ["preferences","Préférences",       "users"]
    ]}
  ],
  admin: [
    { groupe: "Réseau", items: [
      ["tableau",       "Tableau de bord", "dashboard"],
      ["entreprises",   "Entreprises",     "building"],
      ["assos",         "Associations",    "heart"],
      ["preinscriptions","Préinscriptions","users"],
      ["expeditions",   "Affiches",        "box"],
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
  /* Les cinq accès de la démonstration. Sur une installation neuve, aucun
     d'entre eux n'existe : l'écran les filtre au lieu de tomber sur le premier
     `undefined`. C'est la différence entre un produit qui se déploie et une
     démonstration qui ne sait vivre que pleine. */
  const comptes = [
    ["u2", "Espace entreprise",  "Claire Fontaine, Vaudrey Ciments, administratrice"],
    ["u4", "Espace salarié",     "Sonia Delaunay, Vaudrey Ciments"],
    ["u7", "Espace association", "Élise Tournier, Refuge des Quatre Vents"],
    ["u12","Accès CSE",          "Farid Amrani, élu, lecture seule"],
    ["u1", "Espace Riseva",      "Administration de la plateforme"]
  ].filter(([uid]) => !!DB.utilisateur(uid));
  const demo = comptes.length > 0;
  /* Le panneau de gauche portait un titre et deux lignes, au milieu de six cents
     pixels de vert. Un écran de connexion est le premier écran du produit, et un
     grand aplat vide s'y lit comme une page qui n'a pas fini de charger. Il porte
     maintenant ce que le produit propose, et ce que le réseau a déjà fait. */
  const r = DB.impactReseau();
  const el = h(`<div class="login">
    <aside class="login__aside grain">
      <div class="login__lueur" aria-hidden="true"></div>
      <svg class="login__river" viewBox="0 0 520 300" aria-hidden="true">
        <path d="M0 220 C 110 120, 190 270, 300 180 S 450 70, 520 150" fill="none" stroke="var(--lime)" stroke-width="4"/>
        <path d="M0 265 C 120 165, 200 305, 320 220 S 460 120, 520 195" fill="none" stroke="var(--brand)" stroke-width="4" opacity=".55"/>
      </svg>
      <img src="/brand/riseva-full-white.png" alt="Riseva">
      <div style="position:relative">
        <h2 style="color:var(--paper);max-width:16ch">Une saison. Des actes. Des chiffres.</h2>
        <p style="margin-top:var(--s5);color:rgba(223,230,208,.66);max-width:40ch">
          Les associations publient ce dont elles ont besoin, vos équipes y répondent,
          et le rapport s'écrit tout seul.</p>
        <ul class="login__formats">
          ${Object.entries(BAREME).map(([k, b]) => `<li>
            <span class="login__ic">${ICONS[b.icone] || ""}</span>
            <span class="login__lab">${esc(b.label)}</span>
            <span class="login__pts mono">+${nb(b.points)}</span></li>`).join("")}
        </ul>
        <p class="login__note">Le barème est public et identique pour toutes les
          entreprises. C'est l'association qui confirme, jamais l'entreprise.</p>
      </div>
      <div class="login__pied">
        <div class="login__chiffres">
          <div><b>${nb(r.associations || 0)}</b><span>associations vérifiées</span></div>
          <div><b>${nb(r.missions || 0)}</b><span>missions confirmées</span></div>
          <div><b>${nb(r.heures || 0)}</b><span>heures de bénévolat</span></div>
        </div>
        <p style="font-size:var(--t-xs);color:rgba(223,230,208,.62);margin-top:var(--s5)">
          &copy; 2026 Riseva${demo ? ", données de démonstration" : ""}</p>
      </div>
    </aside>
    <div class="login__form"><div class="login__box">
      <p class="eyebrow">Connexion</p>
      <h1 style="margin-top:var(--s4);font-size:var(--t-h2)">Bon retour</h1>
      <p class="muted" style="margin-top:var(--s3);font-size:var(--t-sm)">
        ${demo ? "Environnement de démonstration : choisissez l'espace à visiter."
               : "Entrez l'adresse avec laquelle votre compte a été ouvert."}</p>
      <div class="stack" style="--gap:var(--s3);margin-top:var(--s8)" id="roles"></div>
      ${demo ? `<hr class="sep">` : ""}
      <div class="field" style="margin-top:var(--s6)">
        <label for="loginMail">Votre adresse professionnelle</label>
        <input class="input" id="loginMail" type="email" placeholder="prenom.nom@exemple.fr"
               autocomplete="email">
        <p class="hint">Nous vous envoyons un lien de connexion. Pas de mot de passe à
          retenir, donc pas de mot de passe à perdre.</p>
      </div>
      <button class="btn btn--primary" id="loginGo" style="margin-top:var(--s3)">Recevoir mon lien</button>
      <p id="loginMsg" role="status" aria-live="polite"
         style="margin-top:var(--s3);font-size:var(--t-sm);color:var(--ink-600)"></p>
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
  /* La connexion par adresse. En démonstration elle retrouve le compte
     localement au lieu d'envoyer un courriel : le geste est le même, la réponse
     est immédiate, et rien n'est promis qui ne se produise. En production, la
     même action demande un lien à Supabase. */
  const msg = el.querySelector("#loginMsg");
  const entrer = () => {
    const mail = el.querySelector("#loginMail").value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(mail)){
      msg.style.color = "var(--danger, #B4564A)";
      msg.textContent = "Cette adresse ne semble pas complète."; return;
    }
    const u = (DB.utilisateurs() || []).find(x => (x.email || "").toLowerCase() === mail);
    if (!u){
      msg.style.color = "var(--danger, #B4564A)";
      msg.textContent = "Aucun compte avec cette adresse. Créez-en un juste en dessous.";
      return;
    }
    setSession(u.id); location.hash = "#/tableau"; rendre();
  };
  el.querySelector("#loginGo").onclick = entrer;
  el.querySelector("#loginMail").addEventListener("keydown", (e) => {
    if (e.key === "Enter"){ e.preventDefault(); entrer(); }
  });

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

/* Le menu dépend du périmètre, pas seulement du rôle. Une responsable RSE de groupe
   et une administratrice d'une société mono-site ont le même rôle et pas les mêmes
   écrans : l'une pilote quatre sociétés, l'autre une seule.

   Ce qui a changé, et pourquoi. « Sites et quotas » n'apparaissait qu'à partir de
   deux établissements. Une entreprise qui vient de créer son compte n'en a aucun :
   elle ne pouvait donc atteindre ni l'écran où on déclare un site, ni la collecte
   d'indicateurs qui a besoin de ces sites pour demander quoi que ce soit. Un menu
   qui se déplie une fois le travail fait est un menu qui empêche de le commencer. */
function menuDe(u){
  const base = MENUS[u.role].map(g => ({ groupe: g.groupe, items: g.items.slice() }));
  if (u.role !== "entreprise_admin") return base;
  /* Chaque société a désormais un périmètre, même seule : c'est ce qui permet
     d'ouvrir une collecte. On ne montre le bloc « Groupe » qu'à partir de deux
     sociétés — une vue consolidée d'une société unique répète le tableau de
     bord, et un menu qui répète est un menu qu'on cesse de lire. */
  const plusieursSocietes = u.groupe ? DB.societes(u.groupe).length > 1 : false;
  if (plusieursSocietes){
    base.unshift({ groupe: "Groupe", items: [
      ["groupe",      "Vue consolidée", "building"],
      ["sites",       "Sites et quotas", "users"],
      ["indicateurs", "Données sociales", "report"],
      ["securite",    "Sécurité",        "shield"]
    ]});
  } else {
    base[base.length - 1].items.splice(1, 0,
      ["sites",       "Sites et quotas", "users"],
      ["indicateurs", "Données sociales", "report"],
      ["securite",    "Sécurité",        "shield"]);
  }
  return base;
}

/* ------------------------------------------------------------------ */
/* Coquille applicative                                                */
/* ------------------------------------------------------------------ */
function coquille(u, vue, titre, actions = "", periode = DB.saison().nom){
  const route = (location.hash.split("/")[1] || "tableau");
  const menu = menuDe(u).map(g => `
    <div class="side__group">
      <p class="side__title">${esc(g.groupe)}</p>
      ${g.items.map(([id, label, ico]) => `
        <a class="side__link ${route === id ? "is-active" : ""}" href="#/${id}">
          ${ICONS[ico] || ""}<span>${esc(label)}</span></a>`).join("")}
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
          ${/* Le bandeau de demonstration. Il n'apparait que si l'adresse porte
                `?demo=1`, c'est-a-dire si quelqu'un a clique sur le lien de la
                vitrine. Il doit etre impossible de confondre cet ecran avec le
                sien : un chiffre invente pris pour un vrai est la confusion la
                plus couteuse que ce produit puisse produire. */""}
          ${DEMO ? `<span class="badge badge--warn" title="Les chiffres de cet écran viennent d'un jeu de démonstration">
            Démonstration</span>` : ""}
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
  /* Le classement entre sites de l'entreprise. Il ne dépend d'aucune autre
     entreprise, donc il fonctionne dès la première saison — contrairement au
     classement entre entreprises, qui attend dix participantes. */
  const sites = DB.etablissements(u.org).length > 1
    ? DB.classementSites({ entreprise: u.org }) : [];
  const maxSite = Math.max(...sites.map(x => x.parSalarie), 0.01);
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
    if (!a || !estTemps(a.type)) return n;
    return n + (!!a.temps_travail === surTempsDeTravail
              ? heuresPour(a.type, m.quantite) : 0);
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
            <span class="rappel__go">${ICONS.arrow || "->"}</span></a>`).join("")}
        </div></div>` : ""}
      ${aAttendre.length ? `<div class="aFaire__col">
        <span class="aFaire__titre">En attente d'un tiers</span>
        <div class="aFaire__liste">
          ${aAttendre.map(x => `<a class="rappel rappel--dense" href="${x.vers}">
            <span class="notif__point notif__point--info"></span>
            <span>${esc(x.texte)}</span>
            <span class="rappel__go">${ICONS.arrow || "->"}</span></a>`).join("")}
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

    ${/* Une entreprise mono-site n'a que faire d'un tableau de sites : cette bande
          n'apparaît que si l'entreprise en compte plusieurs. */""}
    ${sites.length > 1 ? `<section class="card">
      <div class="between" style="margin-bottom:var(--s5);align-items:flex-start">
        <div><h3>Vos sites</h3>
        <p class="muted" style="font-size:var(--t-sm);margin-top:4px">
          Rapporté à l'effectif de chaque site, sinon le siège écrase l'agence.
          Cette comparaison-là ne dépend de personne d'autre que vous.</p></div>
        <a class="btn btn--quiet btn--sm" href="#/sites">Quotas et référents</a>
      </div>
      <div class="stack" style="--gap:var(--s3)">
        ${sites.map(x => `<div>
          <div class="between" style="font-size:var(--t-sm);margin-bottom:6px;gap:var(--s3);flex-wrap:wrap">
            <span>${x.rang ? `<b>${x.rang}.</b> ` : ""}${esc(x.nom)}, ${esc(x.ville)}
              <span class="badge ${x.statut.cle === "fort" ? "badge--ok"
                : x.statut.cle === "actif" ? "badge--info"
                : x.statut.cle === "lancement" ? "badge--warn" : "badge--neutre"}"
                style="margin-left:6px">${esc(x.statut.label)}</span></span>
            <span class="tnum muted">${nb(x.mobilises)} mobilisé${x.mobilises > 1 ? "s" : ""} -
              ${nb(x.points)} pts, ${pct(x.parSalarie, 2)} / salarié</span></div>
          <div class="bar"><i style="width:${Math.max(2, (x.parSalarie / maxSite) * 100)}%"></i></div>
        </div>`).join("")}
      </div>
      ${sites.some(x => !x.comptes) ? `<p class="hint" style="margin-top:var(--s5)">
        ${sites.filter(x => !x.comptes).map(x => esc(x.ville)).join(", ")} n'${sites.filter(x => !x.comptes).length > 1 ? "ont" : "a"}
        encore aucun compte ouvert. Nommez-y un référent : c'est lui qui invitera ses salariés.</p>` : ""}
    </section>` : ""}

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
          <span class="muted" style="font-size:var(--t-sm)">${esc(p.asso.cause || "")}, ${esc(p.asso.ville || "")}</span>
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
        ${riviere(DB.semaines(eid), { hauteur: 120, legendes: ["il y a 12 semaines", "aujourd'hui"] })}
        ` : ""}
        <hr class="sep">
        <div class="three">
          ${Object.entries(BAREME).map(([k, b]) => {
            const v = pts.parType[k] || 0;
            const r = pts.retenuParType[k] || 0;
            /* « Voir les annonces de ce format » repete sous chaque format a
               zero point donnait cinq fois le meme lien sur douze centimetres.
               Le lien tient en un seul, sous le bloc. */
            if (!v) return `<div class="kpi">
              <span class="kpi__label">${esc(b.label)}</span>
              <span class="kpi__value" style="font-size:1.4rem;color:var(--ink-300)">0</span>
              <span class="kpi__delta">aucun point sur ce format</span></div>`;
            return `<div class="kpi">
              <span class="kpi__label">${esc(b.label)}</span>
              <span class="kpi__value" style="font-size:1.4rem">${nb(r)}</span>
              <span class="kpi__delta">${v > r ? nb(v - r) + " au-delà du plafond" : "points retenus"}</span></div>`;
          }).join("")}
        </div>
        <a class="btn btn--ghost btn--sm" href="#/annonces" style="margin-top:var(--s5)">
          Voir les annonces, format par format</a>
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

        ${/* La colonne s'arrêtait ici, et le bas de l'écran restait vide sur la
              moitié droite pendant que la colonne de gauche continuait. Ce qui
              manquait n'était pas du remplissage : c'étaient les dates. Un
              responsable RSE les cherche ailleurs, une par écran, alors qu'elles
              tiennent en quatre lignes et qu'elles décident de sa semaine. */""}
        <section class="card">
          <h3>Les dates qui comptent</h3>
          <p class="muted" style="font-size:var(--t-sm);margin-top:4px">
            Ce qui arrive, et d'où ça vient.</p>
          <div class="stack" style="--gap:0;margin-top:var(--s5)" id="dates"></div>
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
  /* Le titre etait coupe a la moitie par une pastille d'etat : « Sortie de 42
     animaux et entretien de... ». Un titre tronque ne se lit pas, et une ligne
     qu'on ne lit pas ne sert a rien. Il tient maintenant sur deux lignes, avec
     l'association et la date en dessous, et l'etat au-dessus a droite. */
  if (!items.length) todo.appendChild(h(`<div class="stack" style="--gap:var(--s3)">
    <p class="muted" style="font-size:var(--t-sm)">Aucun engagement en cours.</p>
    <a class="btn btn--ghost btn--sm" href="#/annonces" style="align-self:flex-start">
      Voir ce que les associations demandent</a></div>`));
  items.forEach(m => {
    const a = DB.annonceDe(m);
    const asso = a ? DB.association(a.asso) : null;
    const ligne = h(`<a class="mini" href="#/missions">
      <span class="mini__haut">
        <span class="mini__titre">${esc(a ? a.titre : "Mission")}</span>
        <span class="badge ${ETATS_MISSION[m.etat].badge}">${ETATS_MISSION[m.etat].label}</span>
      </span>
      <span class="mini__meta">${esc(asso ? asso.nom : "")}${
        m.date ? `, le ${dateCourte(m.date)}` : ""}</span>
    </a>`);
    todo.appendChild(ligne);
  });

  /* Les dates qui comptent. Elles se deduisent toutes de l'etat, aucune n'est
     ecrite en dur : une base vide n'affiche donc que la fin de saison, et c'est
     exactement ce qu'un premier client doit voir. */
  const boiteDates = el.querySelector("#dates");
  const jFin = DB.joursAvantFinSaison();
  const dates = [];
  const campOuverte = DB.campagnes(e.groupe || undefined).find(c => c.etat === "ouverte");
  if (campOuverte){
    const ec = DB.etatCampagne(campOuverte.id);
    const rest = ec.sites.length - ec.declares - ec.approuves;
    dates.push({ quand: campOuverte.echeance,
      quoi: `Échéance de la collecte, ${campOuverte.libelle.toLowerCase()}`,
      detail: rest > 0
        ? `${nb(rest)} site${rest > 1 ? "s" : ""} n'${rest > 1 ? "ont" : "a"} pas encore répondu`
        : "tous les sites ont répondu",
      vers: "#/indicateurs", ton: rest > 0 && ec.joursRestants <= 14 ? "alerte" : "info" });
  }
  const prochaine = (fact.contrat ? fact.contrat.factures : [])
    .filter(f => f.etat !== "payee")
    .sort((a, b) => String(a.echeance).localeCompare(String(b.echeance)))[0];
  if (prochaine) dates.push({ quand: prochaine.echeance, quoi: esc(prochaine.libelle),
    detail: `${eur(prochaine.montant)}${prochaine.echeance < "2026-08-20" ? ", échéance dépassée" : ""}`,
    vers: "#/abonnement", ton: prochaine.echeance < "2026-08-20" ? "alerte" : "info" });
  dates.push({ quand: DB.saison().fin, quoi: "Clôture de la saison",
    detail: jFin > 0 ? `${nb(jFin)} jours, puis le rapport annuel se génère`
                     : "la saison est close",
    vers: "#/rapports", ton: "info" });
  dates.sort((a, b) => String(a.quand).localeCompare(String(b.quand)));
  dates.forEach(d => boiteDates.appendChild(h(`<a class="dat" href="${d.vers}">
    <span class="dat__jour tnum">${esc(dateCourte(d.quand))}</span>
    <span class="dat__quoi"><strong>${d.quoi}</strong>
      <span class="muted" style="font-size:var(--t-xs)">${esc(d.detail)}</span></span>
    <span class="notif__point notif__point--${d.ton}"></span>
  </a>`)));

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
    const restant = estArgent(a.type)
      ? `${eur(a.restant)} restants`
      : `${a.restant} place${a.restant > 1 ? "s" : ""} sur ${a.quantite}`;
    const imp = a.impact && UNITES[a.impact.unite] ? a.impact : null;
    /* L'objectif complet de l'annonce, pas le multiplicateur unitaire : « 40 arbres
       plantés » par demi-journée ne veut rien dire pour qui lit l'annonce, « objectif
       480 arbres » si. */
    const objectif = imp ? Math.round(a.quantite * imp.par_unite) : 0;
    const qv = DB.quiVient(a.id, u.id);

    const card = h(`<article class="annonce">
      <div class="annonce__haut">
        ${vignette(a, { cause: asso.cause })}
        <span class="annonce__asso">
          <span class="annonce__pastille" aria-hidden="true">${initiales(asso.nom || "?")}</span>
          ${esc(asso.nom || "")}
        </span>
        <span class="annonce__pts" title="Barème de la saison, identique pour toutes les entreprises">
          <span class="annonce__ptsN">+${estArgent(a.type) ? b.points : nb(b.points)}</span>
          ${/* Le libellé sort du barème : « points par demi-journée » collé sur un don
                de matériel annonçait une unité qui n'existe pas pour ce format. */""}
          <span class="annonce__ptsL">${
            `pt${b.points > 1 ? "s" : ""} / ${estArgent(a.type) ? "10 €" : esc(b.unite)}`}</span>
        </span>
      </div>
      <div class="annonce__corps">
        <div class="row" style="gap:var(--s2);flex-wrap:wrap">
          <span class="badge badge--brand">${esc(b.label)}</span>
          ${a.temps_travail ? `<span class="badge badge--info"
            title="Mécénat de compétences, valorisable fiscalement">Temps de travail</span>` : ""}
          ${/* Ce chiffre est un objectif, pas un résultat. Écrit sans le dire, il se
                lisait comme un bilan, et « 0 colis préparés » sur une annonce qui
                cherche à en financer trois cents donnait l'impression d'une
                association qui n'a rien fait. */
            imp && objectif > 0 ? `<span class="badge" title="Objectif annoncé par l'association">
              Objectif : ${nb(objectif)} ${esc(UNITES[imp.unite].pl)}</span>` : ""}
        </div>
        <h4>${esc(a.titre)}</h4>
        <p class="muted" style="font-size:var(--t-sm)">${esc(a.description)}</p>
        <div class="annonce__meta">
          <span>${ICONS.pin || ""} <b>${esc(a.lieu || asso.ville || "")}</b>${
            distance != null ? `, ${distance} km` : ""}</span>
          <span><b>${dateFR(a.date)}</b></span>
          <span>${esc(restant)}</span>
        </div>
        ${/* Qui vient. C'est le seul élément de cette carte qui lève le vrai frein :
              le premier obstacle au bénévolat d'entreprise n'est ni le temps ni la
              cause, c'est de ne pas savoir avec qui on y va. « 4 places sur 6 »
              décrit un stock ; « Sonia y va » décide quelqu'un.
              Le nombre est toujours montré, il ne désigne personne. Les prénoms
              ne sortent que pour les collègues qui ont choisi d'être visibles :
              une mission auprès d'une association peut révéler une conviction,
              et ça ne se déduit pas d'un réglage par défaut. */""}
        ${qv.moi || qv.collegues ? `<p class="annonce__qui">
          ${qv.moi ? `<b>Vous y allez.</b>` : ""}
          ${qv.collegues ? `${qv.noms.length
            ? `${esc(qv.noms.slice(0, 2).join(" et "))}${
                qv.collegues > qv.noms.length
                  ? ` et ${qv.collegues - Math.min(2, qv.noms.length)} autre${
                      qv.collegues - Math.min(2, qv.noms.length) > 1 ? "s" : ""}` : ""} y ${
                qv.collegues > 1 ? "vont" : "va"}`
            : `${qv.collegues} collègue${qv.collegues > 1 ? "s" : ""} y ${
                qv.collegues > 1 ? "vont" : "va"}`}` : ""}
        </p>` : ""}
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
  /* Un don en argent ne suit pas le même chemin : on n'y « positionne » personne,
     on annonce un virement et on attend que l'association le voie arriver. */
  if (estArgent(a.type)) return ouvrirDon(a, u);
  /* Une annonce sur le temps de travail dont l'association ne déclare plus son
     éligibilité au mécénat ne se propose pas : hors du régime de l'article
     L. 8241-3, la mise à disposition gratuite est un prêt de main-d'œuvre
     illicite. On le dit avant le formulaire, pas après l'échec. */
  if (a.temps_travail && !DB.eligibleMecenat(a.asso)){
    const asso = DB.association(a.asso) || {};
    modal("Cette mission ne peut pas se faire sur le temps de travail", h(`<div>
      <p class="muted" style="font-size:var(--t-sm)">
        ${esc(asso.nom || "Cette association")} ne déclare pas, ou ne déclare plus, son
        éligibilité au mécénat de compétences. L'article <strong>L. 8241-3</strong> du code du
        travail n'autorise la mise à disposition gratuite de salariés qu'au profit des organismes
        visés aux a à g du 1 de l'article 238 bis du code général des impôts. En dehors de ce
        régime, un prêt de main-d'œuvre gratuit redevient illicite, et c'est votre employeur
        qui en répond.</p>
      <p class="muted" style="font-size:var(--t-sm);margin-top:var(--s3)">
        Rien n'empêche d'y aller <strong>sur votre temps personnel</strong> : ce serait du
        bénévolat, et le bénévolat ne demande l'autorisation de personne. Nous avons prévenu
        l'association ; si elle est bien d'intérêt général, elle n'a qu'un réglage à corriger.</p>
    </div>`), [{ label:"J'ai compris" }]);
    return;
  }
  const b = BAREME[a.type];
  const financier = estArgent(a.type);
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
    ${estTemps(a.type) ? `<p class="hint">Riseva n'assure pas les missions de
      bénévolat. En cas d'incident, la relation reste entre votre entreprise et l'association.</p>` : ""}
    ${a.temps_travail ? `<div class="encadreMini">
      <p><strong>Mission sur le temps de travail.</strong> Votre employeur vous met à disposition
      de l'association pour cette mission précise, à cette date précise. Vous restez son salarié,
      payé par lui et couvert par lui. Vous pouvez refuser sans aucune conséquence.</p>
      ${/* La case porte le texte exact qui sera enregistré et reproduit dans la
            convention. Une formulation courte à l'écran et une longue dans le
            document, c'est un consentement à deux versions : celle qu'il a lue
            n'est alors pas celle qu'on produit. */ ""}
      <label class="checkline" style="margin-top:var(--s3)"><input type="checkbox" id="consent">
        <span>${esc(DB.texteConsentement(a.id))}</span></label>
    </div>` : ""}
  </div>`);
  const q = corps.querySelector("#q"), calc = corps.querySelector("#calc");
  /* Ce que cette ligne disait au moment precis ou quelqu'un decide de donner
     son samedi : « Soit 150 points pour votre entreprise. » Le seul retour
     annonce etait un score, et il allait a l'employeur. L'annonce porte
     pourtant ce que la mission produit REELLEMENT — sept animaux sortis, quatre
     cents arbres — et c'est cela qu'il faut lire en premier. Les points restent,
     en second, parce qu'ils existent. */
  const maj = () => {
    const n = Number(q.value) || 0;
    const pts = `${nb(DB.pointsPour(a.type, n))} points pour votre entreprise`;
    const im = a.impact && UNITES[a.impact.unite];
    if (im && a.impact.par_unite){
      const fait = Math.round(a.impact.par_unite * n);
      calc.textContent = `Soit ${nb(fait)} ${fait > 1 ? im.pl : im.un}, et ${pts}.`;
    } else {
      calc.textContent = `Soit ${pts}.`;
    }
  };
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
              d'impact, ou pire, d'éligibilité fiscale, que Riseva ne certifie
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
            <span class="proche__vig">${couvertureAsso(a, { hauteur: 46 })}</span>
            <span class="proche__nom">${esc(a.nom)}</span>
            <span class="proche__meta">${esc(a.cause || "")}, ${esc(a.ville || "")}</span>
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
        ${/* La photo passe avant le texte. Une grille de cartes sans images se
              parcourt sans s'arrêter, et un salarié qui ne s'arrête pas ne
              s'engage sur rien. L'association publie la sienne depuis son
              espace ; à défaut, celle de sa cause. */""}
        ${couvertureAsso(a, { hauteur: 132 })}
        <div class="row" style="gap:var(--s3);flex-wrap:wrap">
          <span class="badge badge--brand">${esc(a.cause || "Association")}</span>
          <span class="muted" style="font-size:var(--t-sm)">${esc(a.ville)}</span>
          ${a.distance != null ? `<span class="annonce__loin" title="À vol d'oiseau depuis votre siège">${ICONS.pin || ""} ${nb(a.distance)} km</span>` : ""}
        </div>
        <h3>${esc(a.nom)}</h3>
        <p class="muted" style="font-size:var(--t-sm)">${esc(a.resume)}</p>
        <div class="between" style="margin-top:auto;padding-top:var(--s4);border-top:var(--line-soft)">
          ${/* Une association sans annonce ouverte reste dans l'annuaire et reste
                joignable : elle n'a pas de besoin PUBLIE, ce qui n'est pas la
                meme chose que ne rien faire. « 0 besoin ouvert » se lisait comme
                une association endormie. */""}
          <span class="muted" style="font-size:var(--t-sm)">${n
            ? `${n} besoin${n > 1 ? "s" : ""} ouvert${n > 1 ? "s" : ""}`
            : "aucun besoin publié en ce moment"}</span>
          <span class="row" style="gap:var(--s2)">
            <button class="btn btn--ghost btn--sm">${n ? "Voir les annonces" : "Voir la fiche"}</button>
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
        /* Sans annonce ouverte, le bouton menait a une liste filtree vide. Il
           mene a la fiche : c'est la que se lit ce que fait l'association, et
           c'est de la que l'on peut la contacter. */
        if (!n){ window.open(`/asso.html?id=${a.id}`, "_blank"); return; }
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
    <section class="card" id="tableMissions">
    <div class="tableau"><table class="table"><thead><tr>
      <th>Mission</th><th>Association</th><th>Salarié</th><th>Date</th>
      <th>Points</th><th>État</th><th></th></tr></thead><tbody></tbody></table></div>
  </section></div>`);
  const tb = el.querySelector("tbody");
  if (!ms.length) tb.appendChild(h(`<tr><td colspan="7" class="empty">
    Aucune mission pour l'instant. Tout part d'une annonce à laquelle quelqu'un répond.</td></tr>`));
  ms.forEach(m => {
    const a = DB.annonceDe(m), asso = DB.association(a.asso), s = DB.utilisateur(m.salarie);
    const tr = h(`<tr class="${m.masquee ? "is-anonyme" : ""}">
      <td><strong>${m.masquee ? "Don personnel d'un salarié" : esc(a.titre)}</strong><br>
        <span class="muted" style="font-size:var(--t-xs)">${esc(BAREME[a.type].label)}</span></td>
      <td class="muted">${m.masquee ? "-" : esc(asso.nom)}</td>
      <td class="muted">${m.masquee ? "-" : esc(s ? s.nom : "-")}</td>
      <td class="muted tnum">${m.masquee ? dateFR(m.date).replace(/^\d+ /, "") : dateCourte(m.date)}</td>
      <td class="tnum">${m.masquee ? `<span class="muted">-</span>`
        : `<strong>${nb(m.points)}</strong>`}</td>
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
        <div class="tableau"><table class="table table--rank"><thead><tr>
          <th></th><th>Entreprise</th><th></th><th style="text-align:right">Score</th>
        </tr></thead><tbody></tbody></table></div>
      </section>

      <div class="stack" style="--gap:var(--s5)">
        <section class="card">
          <h3 style="font-size:var(--t-lg)">Comprendre mon score</h3>
          <div class="stack" style="--gap:var(--s3);margin-top:var(--s4);font-size:var(--t-sm)">
            <div class="between"><span class="muted">Score</span>
              <b>points retenus / effectif</b></div>
            <div class="between"><span class="muted">Plafond par format</span>
              <b>${Math.round(PLAFOND_PAR_FORMAT * 100)} % du score retenu</b></div>
            <div class="between"><span class="muted">Classement publié à partir de</span>
              <b>3 entreprises</b></div>
            <div class="between"><span class="muted">« Top 10 % » à partir de</span>
              <b>10 entreprises</b></div>
          </div>
          <hr class="sep">
          <button class="btn btn--ghost btn--block btn--sm" id="detail">Le détail de mon score</button>
          <p class="hint">Le score mesure un engagement, pas un impact environnemental.
            <a href="/reglement.html" target="_blank" style="color:var(--forest-800)">Le règlement</a>.</p>
          <p class="hint" style="margin-top:var(--s3)">Ce n'est pas non plus une assiette fiscale,
            et il n'existe aucun taux de conversion entre les deux. Une mission close sans
            confirmation de l'association compte ici et pas dans votre réduction d'impôt : personne
            n'a attesté qu'elle avait eu lieu. Ce que vous pouvez déclarer, et ce qui attend encore
            une confirmation, sont sur l'écran
            <a href="#/mecenat" style="color:var(--forest-800)">Mécénat</a>, en euros.</p>
        </section>
      </div>
    </div>
  </div>`);

  const dessine = () => {
    const cl = DB.classement({ mode, categorie: categorie || null, pour: u.org });
    /* Deux seuils, et il ne faut pas les confondre, c'est la confusion des deux
       qui rendait cet écran vide pendant toute la première saison.

       Un RANG est un fait : dès qu'il y a trois entreprises, il y a une première,
       une deuxième et une troisième, et le dire n'exige aucune statistique. En
       dessous de trois, il n'y a pas de classement, il y a un duel.

       Un DÉCILE est une statistique : « top 10 % » sur onze entreprises désigne la
       première, et le dire ainsi lui prête une avance qu'elle n'a pas. Ça, ça
       demande une vraie cohorte.

       On classe donc à partir de trois, et on ne parle de décile qu'à partir de dix. */
    const RANG_MIN = 3, COHORTE_MIN = 10;
    const classable = cl.length >= RANG_MIN;
    const decile = cl.length >= COHORTE_MIN;
    const seuil = decile ? Math.max(1, Math.ceil(cl.length * 0.1)) : 0;
    const cle = mode === "brut" ? "points" : "parSalarie";
    const max = Math.max(...cl.map(e => e[cle]), 1);
    el.querySelector("#sousTitre").textContent = (mode === "brut"
      ? "Total des points retenus, toutes tailles confondues si aucun filtre"
      : "Points retenus rapportés à l'effectif, recalculé chaque lundi")
      + (decile ? "" : `, cohorte de ${cl.length}, trop petite pour parler de décile`);
    const av = el.querySelector("#avertCohorte");
    av.innerHTML = "";
    const tb = el.querySelector("tbody");
    const tete = el.querySelector("thead");
    tb.innerHTML = "";

    /* Sous dix entreprises, on ne classe pas. Afficher malgré tout un rang, une
       barre comparative et « vous êtes 2e » après avoir écrit trois fois que le
       classement n'est pas significatif, c'est laisser le lecteur retenir une
       seule chose : qu'il est dernier. On montre son score, et l'avancement de
       la cohorte, le seul objectif qui existe vraiment à ce stade. */
    if (!classable){
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
            <span class="muted" style="font-size:var(--t-sm)">Entreprises dans votre catégorie</span>
            <b class="tnum">${cl.length} / ${RANG_MIN}</b>
          </div>
          <div class="bar"><i style="width:${Math.min(100, (cl.length / RANG_MIN) * 100)}%"></i></div>
          <p class="hint">À deux, il n'y a pas de classement, il y a un duel. Le classement
            s'ouvre à ${RANG_MIN} entreprises dans votre catégorie de taille, et vous pouvez
            déjà comparer vos sites entre eux, ce qui ne dépend de personne d'autre.</p>
        </div>
      </div>`));
      return;
    }
    tete.style.display = "";
    el.querySelector("#titreClassement").textContent = "Classement de la saison";
    el.querySelector("#etatCohorte").textContent = decile
      ? "Cohorte constituée" : `${cl.length} entreprises classées`;
    el.querySelector("#etatCohorte").className = "badge badge--ok";
    if (!cl.length){ tb.appendChild(h(`<tr><td colspan="4" class="empty">Aucune entreprise dans cette catégorie.</td></tr>`)); return; }

    /* Son propre rang, en gros, au-dessus du tableau. C'est la première chose que
       quelqu'un cherche en ouvrant un classement, et le faire chercher dans une
       liste de trente lignes est une façon de le perdre. Il s'affiche même quand
       l'entreprise est sous la médiane : elle se voit toujours elle-même, ce sont
       les autres qui ne la voient pas. */
    const mien = cl.find(e => e.id === u.org);
    if (mien) av.appendChild(h(`<div class="card card--dark grain"
      style="margin-bottom:var(--s5);padding:var(--s5) var(--s6)">
      <div class="row" style="gap:var(--s5);align-items:center;flex-wrap:wrap">
        ${ecusson(mien.nom, { logo: mien.logo, taille: 46 })}
        <div style="flex:1;min-width:180px">
          <p class="eyebrow" style="color:var(--lime)">Votre rang</p>
          <div style="font-family:var(--font-display);font-size:2rem;line-height:1.05;
            letter-spacing:var(--track-display);color:var(--paper)">
            ${rangFR(mien.rang)} <span style="font-size:var(--t-md);color:#C5CDBB">
              sur ${cl.length}</span></div>
          <p class="muted" style="font-size:var(--t-sm);margin-top:2px;color:#C5CDBB">
            ${esc(mien.nom)}, ${esc(mien.categorie.label)}</p>
        </div>
        <div style="text-align:right">
          <div style="font-family:var(--font-display);font-size:1.7rem;line-height:1.05;
            color:var(--lime)">${nb(mien.points)}</div>
          <p class="muted" style="font-size:var(--t-xs);color:#C5CDBB">points retenus</p>
        </div>
        <div style="text-align:right">
          <div style="font-family:var(--font-display);font-size:1.7rem;line-height:1.05;
            color:var(--paper)">${pct(mien.parSalarie)}</div>
          <p class="muted" style="font-size:var(--t-xs);color:#C5CDBB">points par salarié</p>
        </div>
      </div>
      ${mien.anonyme ? `<p class="muted" style="font-size:var(--t-xs);margin-top:var(--s4);
        color:#A8B29B">Vous êtes dans la moitié basse : votre nom et votre logo n'apparaissent
        pas pour les autres entreprises. Vous, vous vous voyez toujours.</p>` : ""}
    </div>`));

    cl.forEach(e => {
      const moiOrg = e.id === u.org;
      /* Votre ligne dans le classement porte la couleur de la marque plutot
         qu'un gris vert de plus : c'est la seule ligne que le lecteur cherche,
         et l'encre y rend quinze pour un. */
      tb.appendChild(h(`<tr${moiOrg ? ` class="est-moi"` : ""}>
        <td class="tnum" style="font-family:var(--font-display);font-size:var(--t-lg);
          color:${moiOrg ? "var(--forest-800)" : "var(--ink-500)"};width:52px">${e.rang}</td>
        <td>
          <div class="row" style="gap:var(--s3);align-items:center">
            ${ecusson(e.nom, { logo: e.logo, anonyme: e.anonyme })}
            <div>
              <strong${e.anonyme ? ` class="muted"` : ""}>${esc(e.nomAffiche)}</strong>${
                moiOrg ? ` <span class="muted">(vous)</span>` : ""}${
                decile && e.rang <= seuil ? ` <span class="badge badge--brand" style="height:20px;margin-left:6px">top 10 %</span>` : ""}
              <br><span class="muted" style="font-size:var(--t-xs)">${e.anonyme
                ? `non nommée : moitié basse du classement`
                : `${esc(e.categorie.label)}, ${e.engages}/${e.effectif} de l'effectif${
                    e.ecrete ? `, ${nb(e.ecrete)} points écrêtés` : ""}`}</span>
            </div>
          </div>
        </td>
        ${/* Une ligne anonyme ne rend plus ses totaux exacts : ils se rapprochent
              d'une communication publique et levent le masque en une
              soustraction. Elle garde son rang, qui est ce que le classement
              sert a montrer. La couche SQL faisait deja ainsi. */""}
        <td style="width:26%">${e.anonyme ? "" :
          `<div class="bar"><i style="width:${(e[cle] / max) * 100}%"></i></div>`}</td>
        <td class="tnum" style="text-align:right">${e.anonyme
          ? `<span class="muted" style="font-size:var(--t-sm)">score non publié</span>`
          : `<strong>${mode === "brut" ? nb(e.points) : pct(e.parSalarie)}</strong>
             <br><span class="muted" style="font-size:var(--t-xs)">${mode === "brut"
               ? `points, ${pct(e.parSalarie)} / salarié`
               : `pts / salarié, ${nb(e.points)} au total`}</span>`}</td>
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
    const ms = DB.missionsVueEmployeur(u.org)
                 .filter(m => !m.masquee)
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
          <span class="tnum muted">- ${nb(pts.ecrete)} pts</span></div>` : ""}
        <div class="calculBox__l calculBox__l--t"><span>Points retenus</span>
          <span class="tnum">${nb(pts.retenu)} pts</span></div>
        <div class="calculBox__l"><span class="muted">Effectif déclaré</span>
          <span class="tnum muted">${nb(base)}</span></div>
        <div class="calculBox__l calculBox__l--t"><span>Score, ${nb(pts.retenu)} / ${nb(base)}</span>
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
    const cl = DB.classement({ mode, categorie: categorie || null, pour: u.org });
    /* L'export ne contourne pas l'anonymat de l'écran : ce serait la première
       chose que ferait quelqu'un qui veut la liste. Et l'effectif exact d'une
       entreprise anonymisée la désignerait à lui seul. */
    versCSV("riseva-classement.csv",
      ["Rang", "Entreprise", "Catégorie", "Effectif", "Points retenus", "Points bruts",
       "Points par salarié", "Participation dans l'effectif %", "Activation des inscrits %"],
      cl.map(e => [e.rang, e.nomAffiche, e.categorie.label,
                   e.anonyme ? "" : e.effectif,
                   e.anonyme ? "" : e.points, e.anonyme ? "" : e.brut,
                   e.anonyme ? "" : e.parSalarie,
                   e.anonyme ? "" : e.participation,
                   e.anonyme ? "" : e.activation]));
    toast("Export téléchargé.");
  };
  dessine();
  return el;
}

function vueEquipe(u){
  const eid = u.org;
  const cseUser = DB.utilisateurs().find(x => x.role === "cse" && x.org === eid && x.actif);
  /* Un référent de site ne voit que son site. Ce n'est pas un filtre d'affichage,
     c'est le périmètre : le reste de l'effectif de la société ne le regarde pas. */
  const monSite = u.role === "site_referent" ? u.etablissement : null;
  const gens = DB.salaries(eid).filter(g => !monSite || g.etablissement === monSite);
  const actifs = gens.filter(g => !g.anonyme);
  const partis = gens.filter(g => g.anonyme);
  const si = DB.sieges(eid, { etablissement: monSite });
  const inv = monSite
    ? DB.invitations(eid).find(i => i.etablissement === monSite && i.active && !i.pour_referent)
    : DB.invitationActive(eid);
  const lien = inv ? lienPublic(`/rejoindre.html?code=${inv.code}`) : "";

  const el = h(`<div class="two">
    <section class="card">
      <div class="between" style="margin-bottom:var(--s5)">
        <div><h3>Salariés</h3>
        <p class="muted" style="font-size:var(--t-sm);margin-top:4px">
          ${actifs.length} place${actifs.length > 1 ? "s" : ""} occupée${actifs.length > 1 ? "s" : ""}${
            partis.length ? `, ${partis.length} départ${partis.length > 1 ? "s" : ""}` : ""}</p></div>
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
      <div class="tableau"><table class="table"><thead><tr>
        <th>Nom</th><th>Email</th><th>Points des missions</th><th>État</th><th></th></tr></thead><tbody></tbody></table></div>
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

      ${/* Trois blocs qui relevent de la SOCIETE, pas du site. Le referent de
            site voyait « Nommer admin », « Suspendre l'acces », « Ouvrir
            l'acces CSE » et les domaines autorises : en demonstration ces
            actions aboutissaient, et en production la RLS les aurait refusees
            apres coup. Un ecran qui propose ce qu'on n'a pas le droit de faire
            ment deux fois. */""}
      ${u.role !== "entreprise_admin" ? "" : `<section class="card">
        <div class="between" style="margin-bottom:var(--s4)">
          <h3>Accès du CSE</h3>
          ${cseUser ? `<span class="badge badge--ok">Ouvert</span>`
                    : `<span class="badge">Pas ouvert</span>`}
        </div>
        <p class="muted" style="font-size:var(--t-sm)">
          Un accès en <strong style="color:var(--ink)">lecture seule</strong> aux agrégats
          sociaux et sécurité, aux rapports et à la participation. Aucun nom de salarié, aucune
          mission individuelle, aucun don personnel, et rien sous ${DB.SEUIL_RESTITUTION} personnes.
          Vous n'avez plus à recopier ces chiffres, et les élus n'ont plus à les demander.</p>
        ${cseUser ? `<p class="muted" style="font-size:var(--t-sm);margin-top:var(--s4)">
          Ouvert à <strong style="color:var(--ink)">${esc(cseUser.nom)}</strong>
          (${esc(cseUser.email || "")}).</p>` : ""}
        <div class="row" style="gap:var(--s2);margin-top:var(--s5)">
          <button class="btn btn--ghost btn--sm" id="cseLien">${
            cseUser ? "Ouvrir un autre accès" : "Ouvrir l'accès CSE"}</button>
        </div>
        <div id="cseOut"></div>
      </section>`}

      ${u.role !== "entreprise_admin" ? "" : `<section class="card">
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
      </section>`}

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
        <span class="avatar ${g.anonyme ? "avatar--anon" : ""}">${g.anonyme ? "-" : initiales(g.nom)}</span>
        <span><strong>${esc(g.nom)}</strong>${g.anonyme
          ? `<br><span class="muted" style="font-size:var(--t-xs)">retiré le ${dateFR(g.retire_le || new Date().toISOString())}</span>` : ""}</span>
      </span></td>
      <td class="muted">${g.anonyme ? "-" : esc(g.email)}</td>
      <td class="tnum">${nb(DB.pointsVisiblesEmployeur(g.id))}</td>
      <td><span class="badge ${g.anonyme ? "" : (g.actif ? "badge--ok" : "badge--warn")}">${
        g.anonyme ? "Anonymisé" : (g.actif ? "Actif" : "Suspendu")}</span>${
        g.role === "entreprise_admin" ? ` <span class="badge badge--info" style="margin-left:4px">Admin</span>` : ""}</td>
      <td style="text-align:right"></td></tr>`);
    /* Nommer, retrograder, suspendre, retirer : des decisions de societe. Un
       referent de site les voyait et pouvait les declencher. */
    if (!g.anonyme && u.role === "entreprise_admin"){
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

  const bCse = el.querySelector("#cseLien");
  if (bCse) bCse.onclick = () => {
    const corps = h(`<div class="stack" style="--gap:var(--s4)">
      <p class="muted" style="font-size:var(--t-sm)">Le lien est nominatif et expire dans trente
      jours. Il ouvre une lecture seule : ni saisie, ni validation, ni export au nom de
      l'entreprise.</p>
      <div class="field"><label for="cse-nom">Nom de l'élu</label>
        <input class="input" id="cse-nom"></div>
      <div class="field"><label for="cse-mail">Adresse professionnelle</label>
        <input class="input" id="cse-mail" type="email"></div>
      <div id="cse-res"></div>
    </div>`);
    modal("Ouvrir l'accès CSE", corps, [
      { label:"Annuler" },
      { label:"Créer le lien", classe:"btn--primary", onClick: () => {
          try {
            const inv = DB.creerInvitationCSE(eid,
              corps.querySelector("#cse-nom").value.trim(),
              corps.querySelector("#cse-mail").value.trim());
            const url = lienPublic(`/rejoindre.html?code=${inv.code}&role=cse`);
            corps.querySelector("#cse-res").innerHTML =
              `<p class="hint" style="margin-bottom:6px">À envoyer à cette personne, et à elle seule :</p>
               <div class="copyline"><input class="input" readonly aria-label="Lien d'accès du CSE" value="${esc(url)}"></div>
               <p class="hint" style="margin-top:6px">Expire le ${dateFR(inv.expire_le)}.</p>`;
            toast("Accès CSE créé.");
          } catch (e){ toast(e.message); }
          return false;
        }}]);
  };

  const bDom = el.querySelector("#saveDom");
  if (bDom) bDom.onclick = () => {
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
  const envois = DB.envois({ entreprise: u.org, type: "rapport" });
  const res = DB.impactReseau();
  const maxT = Math.max(...r.trimestres.map(t => t.points), 1);
  const v = DB.valorisationMecenat(u.org);
  const fa = DB.etatFacturation(u.org);
  const cout = r.missions && fa.contrat
    ? { valeur: Math.round(fa.contrat.montant_ht / r.missions),
        abonnement: fa.contrat.montant_ht, missions: r.missions }
    : null;

  const el = h(`<div class="stack" style="--gap:var(--s5)">
    <section class="card" id="tableRapports">
      <div class="between" style="margin-bottom:var(--s5)">
        <div><h3>Vos rapports</h3>
        <p class="muted" style="font-size:var(--t-sm);margin-top:4px">
          Générés automatiquement à la clôture de chaque période. Rien à demander,
          rien à consolider.</p></div>
      </div>
      <div class="tableau"><table class="table"><thead><tr>
        <th>Rapport</th><th>Période</th><th>Points</th><th>État</th><th>Envoi</th><th></th>
      </tr></thead><tbody></tbody></table></div>
      <p class="hint" style="margin-top:var(--s4)">Vous n'avez rien à demander : chaque rapport
        part vers l'administrateur de l'entreprise dès la clôture de sa période, une fois et une
        seule. Un rapport reçu deux fois est une erreur qu'on remarque, et qui coûte la confiance
        dans tout le reste.</p>
    </section>

    <section class="card" id="apercu" style="padding:var(--s10)">
      <div class="between" style="align-items:flex-start">
        <div>
          <p class="eyebrow">Aperçu du rapport annuel</p>
          <h2 style="margin-top:var(--s3)">${esc(r.entreprise.nom)}, ${esc(r.saison.nom)}</h2>
          <p class="muted" style="margin-top:var(--s3);font-size:var(--t-sm)">
            Construit à partir des missions validées. Ce que vous voyez ici est ce que
            contiendra le document final.</p>
        </div>
        <div class="row" style="gap:var(--s2);flex-wrap:wrap">
          <button class="btn btn--primary btn--sm" id="preuve">Dossier de traçabilité</button>
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
          kpi("Coût SaaS par mission", cout ? eur(cout.valeur) : "-",
            cout ? `${eur(cout.abonnement)} HT d'abonnement / ${nb(cout.missions)} missions`
                 : "aucune mission comptabilisée")}
      </div>
      <p class="hint" style="margin-top:var(--s4)">
        « Coût SaaS par mission » rapporte le seul abonnement Riseva au nombre de missions
        comptabilisées. Il <strong>n'inclut pas</strong> le temps de vos salariés, la valeur du
        matériel donné, les dons versés, ni les frais engagés sur place, ce ne sont pas nos
        chiffres, et nous ne les inventerons pas. Il est aussi très instable tant que le nombre de
        missions est petit : quatre missions de plus le divisent par deux.
      </p>
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
            <div class="between"><span class="muted">Assiette connue de Riseva</span>
              <span class="tnum">${eur(v.assiette)}</span></div>
            <div class="between"><span class="muted">${v.plafondCalculable
                ? "Réduction d'impôt estimée" : "Estimation maximale potentielle"}</span>
              <strong class="tnum" style="color:var(--forest-800)">${
                v.plafondCalculable ? eur(v.reduction) : eur(v.estimationMax)}</strong></div>
            ${v.plafondCalculable ? "" : `<p class="hint" style="margin:0">Plafond et report non
              calculés : ils dépendent de votre chiffre d'affaires, de vos autres dons de
              l'exercice et de vos reports antérieurs, que Riseva ne connaît pas.</p>`}
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
      <td class="muted">${dateCourte(x.periode.debut)}, ${dateCourte(x.periode.fin)}</td>
      <td class="tnum">${x.etat === "genere" ? nb(x.points) : "-"}</td>
      <td><span class="badge ${x.etat === "genere" ? "badge--ok" : ""}">${
        x.etat === "genere" ? "Généré le " + dateCourte(x.genere_le) : "À la clôture"}</span></td>
      <td class="muted" style="font-size:var(--t-xs)">${(() => {
        const en = envois.find(e => e.cle === `rapport:${u.org}:${x.id}`);
        return en ? `Envoyé le ${dateCourte(en.date)}<br>à ${esc(en.destinataire || "-")}`
                  : (x.etat === "genere" ? "Envoi au prochain passage" : "-");
      })()}</td>
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
    /* L'export du rapport ne sort que ce que l'employeur a le droit de voir. Il
       contenait le nom du salarie, l'association et le montant de ses dons
       personnels : le seuil de cinq donateurs protegeait l'agregat pendant que
       le tableur donnait le detail. */
    const ms = DB.missionsVueEmployeur(u.org)
                 .filter(m => m.etat === "validee" || m.etat === "validee_auto")
                 .filter(m => !m.masquee);
    versCSV(`riseva-rapport-${r.saison.nom.replace(/\s+/g, "-").toLowerCase()}.csv`,
      ["Mission", "Association", "Format", "Sur le temps de travail", "Salarié", "Date", "Quantité", "Points"],
      ms.map(m => { const a = DB.annonceDe(m), sal = DB.utilisateur(m.salarie);
        return [a.titre, (DB.association(a.asso) || {}).nom, BAREME[a.type].label,
                a.temps_travail ? "oui" : "non", sal ? sal.nom : "-", m.date, m.quantite, m.points]; }));
    toast("Export téléchargé.");
  };
  return el;
}

function vueAbonnement(u){
  const sa = DB.saison();
  const si = DB.sieges(u.org);
  /* Le devis recalculé aujourd'hui, à côté du contrat signé. Les deux peuvent
     différer, et c'est normal : ce qui est signé est signé. Le montrer évite la
     question « pourquoi je paie ça ? » posée six mois trop tard. */
  const dev = DB.devisEntreprise(u.org);
  const f = DB.etatFacturation(u.org);
  const c = f.contrat;
  const jours = DB.joursAvantFinSaison();
  const etats = { payee:["Payée","badge--ok"], a_venir:["À venir",""],
                  envoyee:["Envoyée","badge--info"], en_retard:["En retard","badge--danger"] };

  /* L'ecran ou un client du premier jour vient chercher son contrat. Il n'en a
     pas encore : c'est normal, et c'etait pourtant un mur — une phrase, aucun
     geste, aucune explication. Un etat vide muet est un defaut partout dans ce
     produit ; sur l'ecran qui mene au paiement, c'est le plus cher de tous. */
  if (!c) return h(`<section class="card">
    <h3>Votre saison n'est pas encore ouverte</h3>
    <p class="muted" style="font-size:var(--t-sm);margin-top:6px;max-width:70ch">
      Aucun contrat n'est rattaché à cette entreprise. C'est normal tant que
      votre bon de commande n'est pas signé : vous pouvez d'ici là déclarer vos
      établissements, préparer votre collecte d'indicateurs et regarder les
      associations autour de vos sites. Ce qui attend la signature, c'est
      l'ouverture des comptes salariés et l'envoi des affiches.</p>
    <div class="row" style="--gap:var(--s3);margin-top:var(--s5);flex-wrap:wrap">
      <a class="btn" href="/inscription.html">Demander l'ouverture de ma saison</a>
      <a class="btn btn--quiet" href="/#prix">Revoir la grille tarifaire</a>
    </div>
    <p class="hint" style="margin-top:var(--s4)">Le tarif suit votre effectif, il est
      public, et le bon de commande reprend la grille telle quelle.</p>
  </section>`);

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
          <div class="row" style="gap:var(--s2)">
            ${DB.etablissements(u.org).length > 1
              ? `<button class="btn btn--ghost btn--sm" id="csvR">Clé de répartition</button>` : ""}
            <button class="btn btn--ghost btn--sm" id="csvF">Exporter</button>
          </div>
        </div>
        <div class="tableau"><table class="table"><thead><tr>
          <th>Référence</th><th>Libellé</th><th>Émise</th><th>Échéance</th>
          <th style="text-align:right">HT</th><th style="text-align:right">TTC</th>
          <th>État</th><th></th>
        </tr></thead><tbody></tbody></table></div>
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
              <span>${dateFR(c.debut)}, ${dateFR(c.fin)}</span></div>
            <div class="between"><span class="muted">Acompte versé</span>
              <span class="tnum">${eur(c.acompte)} HT, ${eur(Math.round(c.acompte * (1 + FACTURATION.tva)))} TTC</span></div>
            <div class="between"><span class="muted">Places incluses</span><span class="tnum">${si.total}</span></div>
            ${c.fondateur ? `<div class="between"><span class="muted">Tarif</span>
              <span class="badge badge--ok">Fondateur, ${Math.round(TARIFS.fondateur.taux * 100)} % de remise</span></div>` : ""}
          </div>
          ${dev ? `<div class="stack" style="--gap:var(--s2);margin-top:var(--s5);padding:var(--s4);
            background:var(--paper-sunk);border-radius:var(--r-sm);font-size:var(--t-sm)">
            <div class="between"><strong>Comment ce montant est calculé</strong>
              <span class="badge">${esc(dev.palier.label)}</span></div>
            <div class="between"><span class="muted">Base de la tranche</span>
              <span class="tnum">${eur(dev.palier.prix)} HT</span></div>
            <div class="between"><span class="muted">Sites</span>
              <span class="tnum">${dev.sites} dont ${dev.sites_inclus} compris${
                dev.sites_factures ? `, ${dev.sites_factures} x ${eur(TARIFS.site_supplementaire)}` : ""}</span></div>
            ${dev.remiseFondateur ? `<div class="between"><span class="muted">Tarif fondateur</span>
              <span class="tnum">- ${eur(dev.remiseFondateur)}</span></div>` : ""}
            <div class="between"><strong>Total saison</strong>
              <span class="tnum">${eur(dev.ht)} HT</span></div>
            <p class="hint" style="margin:0">Soit ${nb2(dev.par_salarie)} € par salarié et par an.
              ${c.montant_ht !== dev.ht ? `Votre contrat signé est à ${eur(c.montant_ht)} HT : une
              grille qui change ne réécrit pas un contrat déjà signé.` : ""}</p>
          </div>` : ""}
          <hr class="sep">
          <p class="muted" style="font-size:var(--t-sm)">
            L'acompte de ${eur(c.acompte)} HT (${eur(Math.round(c.acompte * (1 + FACTURATION.tva)))} TTC)
            <strong style="color:var(--ink)">matérialise un engagement ferme des deux côtés</strong> :
            ce n'est pas une réservation qu'on annule d'un mot. Il est remboursé intégralement si
            la saison ne démarre pas au sens de l'article « Démarrage » du contrat, c'est-à-dire si
            l'un des cinq critères de recette n'est pas constaté à la date convenue. La TVA est
            exigible dès l'encaissement de l'acompte. Aucune commission n'est prélevée sur les
            dons. Un salarié retiré libère sa place immédiatement.</p>
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
          ${(c.devis || []).length && !c.reconduction ? `
          <div class="stack" style="--gap:var(--s2);margin-top:var(--s5);padding:var(--s4);
            background:var(--paper-sunk);border-radius:var(--r-sm);font-size:var(--t-sm)">
            <div class="between"><strong>Proposition de renouvellement</strong>
              <span class="badge">Devis, pas une facture</span></div>
            ${c.devis.map(d => `<div class="between"><span class="muted">${esc(d.libelle)}</span>
              <span class="tnum">${eur(d.montant)} HT</span></div>
              <div class="between"><span class="muted">Valable jusqu'au</span>
              <span class="tnum">${dateFR(d.validite)}</span></div>`).join("")}
            <p class="hint" style="margin:0">Aucune somme n'est due tant que vous n'avez pas
              accepté. La facture d'acompte n'est émise qu'après votre acceptation, et c'est
              seulement à ce moment-là qu'elle apparaît dans vos factures.</p>
          </div>` : ""}
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
  /* Ce que réclame un contrôleur de gestion : de quoi imputer la dépense site par
     site. La clé retenue est le nombre de comptes ouverts, parce que c'est ce qui
     est facturé, pas l'effectif, qui ne l'est pas. Elle est écrite en haut du
     fichier, sinon personne ne sait ce qu'il additionne. */
  el.querySelector("#csvR")?.addEventListener("click", () => {
    const etabs = DB.etablissements(u.org).map(et => ({
      et, comptes: DB.sieges(u.org, { etablissement: et.id }).pris
    }));
    const total = etabs.reduce((n, x) => n + x.comptes, 0);
    versCSV("riseva-cle-de-repartition.csv",
      ["Société", "SIREN", "Établissement", "Ville", "SIRET", "Comptes ouverts",
       "Quote-part", "Montant HT imputable"],
      etabs.map(x => {
        const part = total ? x.comptes / total : 0;
        return [DB.entreprise(u.org).nom, DB.entreprise(u.org).siren || "",
                x.et.nom, x.et.ville, x.et.siret || "", x.comptes,
                (Math.round(part * 10000) / 100) + " %",
                Math.round(c.montant_ht * part * 100) / 100];
      }).concat([["", "", "TOTAL", "", "", total, "100 %", c.montant_ht]]));
    toast("Clé de répartition téléchargée : au prorata des comptes ouverts.");
  });

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
/* Un montant qu'on ne sait pas calculer s'écrit « non calculé », jamais zéro.
   Zéro est une affirmation ; l'absence n'en est pas une. */
const eurOuNon = (v) => v === null || v === undefined ? "non calculé" : eur(v);

/* Une empreinte courte et reproductible du jeu d'opérations arrêté. Sans elle, un
   document régénéré après correction ne peut pas être rapproché de celui qu'on a
   déjà remis : les deux se ressemblent, et personne ne sait lequel fait foi. */
function empreinte(missions){
  const graine = missions.map(m => `${m.id}:${m.etat}:${m.quantite}:${m.points}`).sort().join("|");
  let x = 0x811c9dc5;
  for (let i = 0; i < graine.length; i++){
    x ^= graine.charCodeAt(i);
    x = Math.imul(x, 0x01000193) >>> 0;
  }
  return x.toString(16).padStart(8, "0").toUpperCase().replace(/(.{4})(.{4})/, "$1-$2");
}

/* Dossier de traçabilité : une page que le responsable RSE pose sur le bureau de sa
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
<title>Dossier de traçabilité, ${esc(e.nom)}, ${esc(sa.nom)}</title>
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
  <h1>Dossier de traçabilité, pièces, sources et méthode</h1>
  <p class="st">${esc(e.nom)}, ${esc(sa.nom)}, arrêté au ${dateFR(new Date().toISOString())}
 , empreinte ${empreinte(ms)}</p>
  <p class="st" style="margin-top:10px">Destiné à la direction et à l'expert-comptable. Chaque
  chiffre est donné avec sa méthode de calcul. Les données brutes correspondantes sont
  exportables au format CSV depuis l'espace client.</p>
  <div class="note alerte" style="margin-top:14px">
    <strong>Ce document n'est pas un rapport d'audit.</strong> Il rassemble des données
    <strong>déclarées</strong>, par vos salariés, par les associations, que Riseva horodate,
    recoupe et met en forme, mais <strong>n'audite pas</strong>. Chaque ligne porte son statut :
    <em>confirmée</em> quand une association a répondu, <em>estimée</em> quand la mission a été
    clôturée sans confirmation au bout de quatorze jours. L'empreinte ci-dessus identifie le jeu
    de données arrêté : deux éditions qui portent la même empreinte contiennent les mêmes
    opérations, et une empreinte différente signale qu'il s'est passé quelque chose entre les
    deux.
  </div>

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
      ${l("Participation dans l'effectif", ind.participation.valeur == null ? "-" : pct(ind.participation.valeur) + " %",
          `${ind.participation.num} salariés ayant au moins une action validée, divisés par ${ind.participation.den} de l'effectif de référence. Une inscription seule ne compte pas.`)}
      ${l("Actions validées", nb(ind.reperes.X),
          "Combinaisons uniques salarié x association x format x date. Deux versements au même organisme le même jour ne font qu'une action.")}
      ${l("Concentration", (ind.concentration.valeur ?? "-") + " %",
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
      ${l("Plafond de l'entreprise", eurOuNon(v.plafondEntreprise),
          v.plafondCalculable
            ? "Le plus élevé entre 20 000 € et 5 pour mille du chiffre d'affaires HT déclaré."
            : "Non calculé : le plafond porte sur tous les versements de l'exercice. Il demande le chiffre d'affaires, les dons faits hors Riseva et les reports antérieurs, qui ne sont pas renseignés.")}
      ${l("Report sur les exercices suivants", eurOuNon(v.reportable),
          v.plafondCalculable ? "Excédent au-delà du plafond, reportable sur cinq exercices."
                              : "Non calculé, pour la même raison.")}
      ${l(v.plafondCalculable ? "Réduction d'impôt estimée" : "Estimation maximale potentielle",
          v.plafondCalculable ? eur(v.reduction) : eur(v.estimationMax),
          v.plafondCalculable
            ? "60 % de l'assiette retenue. Estimation, non déclaration : votre expert-comptable arrête le chiffre."
            : "60 % de la seule assiette connue de Riseva, plafond non appliqué. Non utilisable pour la déclaration.")}
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
    présenté comme tel. Données déclarées, non auditées par Riseva.
    Les règles complètes du calcul sont publiques sur riseva.fr/reglement.html,
    avec un exemple chiffré qui se refait à la main. En cas d'écart entre ce document et vos
    propres calculs, écrivez-nous : c'est nous qui avons tort.
  </p>
</div></body></html>`;

  const w = window.open("", "_blank");
  if (!w){ toast("Autorisez les fenêtres pour ouvrir le dossier."); return; }
  w.document.write(html); w.document.close();
  toast("Dossier de traçabilité ouvert dans un nouvel onglet.");
}

function ouvrirFacture(u, fa){
  const e = DB.entreprise(u.org);
  const ht = fa.montant;
  const tva = Math.round(ht * FACTURATION.tva);
  const ttc = ht + tva;
  const champ = (x) => x || `<span class="v">[à compléter]</span>`;

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<title>Facture ${esc(fa.ref)}, Riseva</title>
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
        <p class="hint">À compter du 1<sup>er</sup> septembre 2026, toute entreprise doit pouvoir
          recevoir ses factures par une plateforme agréée : un PDF par courriel ne vaudra plus facture.
          Dites-nous laquelle vous utilisez et nous vous adressons vos factures dessus.</p>
        <div class="row" style="gap:var(--s4);align-items:stretch">
          <div class="field" style="flex:1"><label>Référent Riseva</label>
            <input class="input" id="ref" value="${esc(e.referent || "")}"></div>
          <div class="field" style="flex:1"><label>Son email</label>
            <input class="input" id="refmail" type="email" value="${esc(e.referent_mail || "")}"></div>
        </div>
      </div>
      <button class="btn btn--primary" style="margin-top:var(--s6)" id="save">Enregistrer</button>

      <hr class="sep">
      <h3 style="font-size:var(--t-lg)">Votre logo</h3>
      <p class="muted" style="font-size:var(--t-sm);margin-top:4px">
        Il apparaît à côté de votre nom dans le classement, sur vos rapports et sur les
        affiches que nous vous envoyons. Sans logo, vos initiales font l'affaire, l'écran
        n'est jamais vide.</p>
      <div class="row" style="gap:var(--s5);align-items:center;margin-top:var(--s5)">
        <span id="apercuLogo">${ecusson(e.nom, { logo: e.logo, taille: 56 })}</span>
        <div class="field" style="flex:1;margin:0">
          <label for="logo">Fichier image, ou adresse d'un logo en ligne</label>
          <div class="row" style="gap:var(--s3)">
            <input class="input" id="logo" value="${esc(e.logo && !String(e.logo).startsWith("data:") ? e.logo : "")}"
              placeholder="https://…/logo.png" style="flex:1">
            <input type="file" id="logoF" aria-label="Choisir un fichier de logo"
              accept="image/png,image/jpeg,image/svg+xml,image/webp" hidden>
            <button class="btn btn--quiet btn--sm" id="logoB" type="button">Choisir un fichier</button>
            ${e.logo ? `<button class="btn btn--ghost btn--sm" id="logoX" type="button">Retirer</button>` : ""}
          </div>
          <p class="hint" id="logoAide">Carré de préférence, 256 pixels suffisent. Il n'est jamais
            étiré : s'il ne remplit pas le carré, il est centré. Une entreprise dans la moitié
            basse du classement n'affiche ni son nom ni son logo aux autres, le logo suit le nom,
            sinon l'anonymat annoncé n'en serait pas un.</p>
        </div>
      </div>

      <hr class="sep">
      <h3 style="font-size:var(--t-lg)">Votre nom dans le classement</h3>
      <p class="muted" style="font-size:var(--t-sm);margin-top:4px">
        Par défaut, seule la moitié haute du classement est nommée. Un classement qui expose
        les derniers punit ceux qui participent, et donne une raison rationnelle de ne pas
        s'inscrire. Votre rang, lui, vous est toujours visible.</p>
      <div class="stack" style="--gap:var(--s3);margin-top:var(--s5)">
        ${Object.entries(DB.VISIBILITES).map(([k, v]) => `
          <label class="checkline"><input type="radio" name="vis" value="${k}"
            ${(e.visibilite || "auto") === k ? "checked" : ""}>
            <span><strong>${esc(v.label)}</strong><br>
              <span class="muted" style="font-size:var(--t-xs)">${esc(v.aide)}</span></span></label>`).join("")}
      </div>
      <p class="hint" style="margin-top:var(--s4)">Ce n'est pas de l'anonymat, et il ne faut pas
        le vendre comme tel : si vous communiquez vous-même sur votre participation, vous vous
        désignez. Riseva, de son côté, ne publie pas la liste de ses clients, sans quoi
        « absent de la moitié haute » se lirait comme « dans la moitié basse ».</p>
    </section>

    <div class="stack" style="--gap:var(--s5)">
      <section class="card">
        <h3>Données de valorisation</h3>
        <p class="muted" style="font-size:var(--t-sm);margin-top:var(--s3)">
          Ces chiffres servent uniquement à estimer votre mécénat. Ils ne sortent jamais de votre
          espace et n'apparaissent dans aucun classement. Tant que les quatre premiers ne sont pas
          renseignés, Riseva affiche « plafond non calculé » plutôt qu'un montant : le plafond
          fiscal porte sur <strong>tous</strong> vos versements de l'exercice, pas seulement sur
          ceux qui passent par ici.</p>
        <div class="stack" style="--gap:var(--s4);margin-top:var(--s5)">
          <div class="field"><label>Chiffre d'affaires HT du dernier exercice</label>
            <input class="input" id="ca" type="number" min="0" value="${e.ca || 0}">
            <p class="hint">Sert à calculer le plafond de 5  pour mille. En dessous de 4 M€, c'est le
              plancher de 20 000 € qui s'applique de toute façon.</p></div>
          <div class="row" style="gap:var(--s4)">
            <div class="field" style="flex:1"><label>Début de l'exercice fiscal</label>
              <input class="input" id="exdeb" type="date" value="${esc(e.exercice_debut || "")}"></div>
            <div class="field" style="flex:1"><label>Fin de l'exercice fiscal</label>
              <input class="input" id="exfin" type="date" value="${esc(e.exercice_fin || "")}"></div>
          </div>
          <div class="row" style="gap:var(--s4)">
            <div class="field" style="flex:1"><label>Autres dons de l'exercice, hors Riseva</label>
              <input class="input" id="dhors" type="number" min="0"
                value="${e.dons_hors_riseva ?? ""}" placeholder="0 si aucun">
              <p class="hint">Ce que vous avez versé ailleurs cette année. Sans ce montant, le
                plafond ne veut rien dire.</p></div>
            <div class="field" style="flex:1"><label>Reports des exercices antérieurs</label>
              <input class="input" id="rant" type="number" min="0"
                value="${e.report_anterieur ?? ""}" placeholder="0 si aucun">
              <p class="hint">Excédents non utilisés des cinq exercices précédents, qui
                s'imputent avant les versements de l'année.</p></div>
          </div>
          <div class="row" style="gap:var(--s4)">
            <div class="field" style="flex:1"><label>Coût journalier moyen chargé d'un salarié</label>
              <input class="input" id="cout" type="number" min="0" value="${e.cout_jour_moyen || 300}">
              <p class="hint">Rémunération brute plus charges, divisée par 220 jours ouvrés.
                Sert à valoriser une demi-journée quand les heures réelles ne sont pas saisies.</p></div>
            <div class="field" style="flex:1"><label>Coût horaire chargé</label>
              <input class="input" id="couth" type="number" min="0" step="0.01"
                value="${e.cout_heure_charge ?? ""}"
                placeholder="par défaut, le coût journalier / ${FISCAL.heures_jour}">
              <p class="hint">Utilisé dès que les heures réellement effectuées sont émargées.
                C'est cette base-là qu'un contrôle demande.</p></div>
          </div>
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

  /* Le fichier est lu dans le navigateur et rangé en clair dans l'entreprise : pas
     d'envoi vers un service tiers pour une image de 6 Ko, et pas de dépendance de
     plus. Au-delà de 200 Ko on refuse, un logo qui pèse plus qu'une page entière
     ralentit chaque écran où il apparaît, et il en apparaît partout. */
  const majApercu = (logo) => {
    el.querySelector("#apercuLogo").innerHTML = ecusson(e.nom, { logo, taille: 56 });
  };
  const bLogo = el.querySelector("#logoB"), fLogo = el.querySelector("#logoF");
  if (bLogo) bLogo.onclick = () => fLogo.click();
  if (fLogo) fLogo.onchange = () => {
    const f = fLogo.files && fLogo.files[0];
    if (!f) return;
    if (f.size > 200 * 1024){
      toast("Ce fichier dépasse 200 Ko. Un logo de 256 pixels en pèse une dizaine.");
      fLogo.value = ""; return;
    }
    const lecteur = new FileReader();
    lecteur.onload = () => {
      try {
        DB.reglerLogo(u.org, lecteur.result);
        majApercu(lecteur.result);
        el.querySelector("#logo").value = "";
        toast("Logo enregistré.");
      } catch (err){ toast(err.message); }
    };
    lecteur.readAsDataURL(f);
  };
  const xLogo = el.querySelector("#logoX");
  if (xLogo) xLogo.onclick = () => {
    DB.reglerLogo(u.org, "");
    majApercu(null);
    el.querySelector("#logo").value = "";
    toast("Logo retiré. Vos initiales prennent le relais.");
  };

  el.querySelector("#save").onclick = () => {
    const v = (id) => el.querySelector("#" + id).value;
    DB.majEntreprise(u.org, {
      nom: v("nom").trim() || e.nom, siret: v("siret").trim(), secteur: v("secteur").trim(),
      adresse: v("adresse").trim(), referent: v("ref").trim(), referent_mail: v("refmail").trim(),
      ca: Number(v("ca")) || 0, cout_jour_moyen: Number(v("cout")) || 300,
      /* Une case vide n'est pas un zéro : « je n'ai rien versé ailleurs » et « je n'ai
         pas répondu » n'ont pas les mêmes conséquences sur le plafond. */
      cout_heure_charge: v("couth").trim() === "" ? null : Number(v("couth")),
      exercice_debut: v("exdeb") || null, exercice_fin: v("exfin") || null,
      dons_hors_riseva: v("dhors").trim() === "" ? null : Number(v("dhors")),
      report_anterieur: v("rant").trim() === "" ? null : Number(v("rant")),
      effectif: Number(v("eff")) || e.effectif
    });
    DB.majContrat(u.org, { plateforme_reception: v("pdp").trim(), annuaire_id: v("annu").trim() });
    const vis = el.querySelector('input[name="vis"]:checked');
    if (vis) DB.reglerVisibilite(u.org, vis.value);
    const lg = el.querySelector("#logo");
    if (lg && lg.value.trim() !== (e.logo || "")) DB.reglerLogo(u.org, lg.value.trim());
    toast("Paramètres enregistrés."); rendre();
  };
  /* Le journal se lit par un client, pas par nous : un « quota_site » brut dans
     une colonne le renvoie deviner. Tout ce que le produit écrit ici a son
     libellé, et la liste suit les fonctions qui tracent. */
  const libelles = { inscription:"Inscription", creation_lien:"Création du lien",
                     revocation_lien:"Révocation du lien", retrait:"Retrait d'un salarié",
                     quota_site:"Quota d'un site modifié", site_declare:"Site déclaré",
                     site_modifie:"Site corrigé", lien_referent:"Lien de référent créé",
                     referent_site:"Référent de site inscrit", lien_cse:"Lien du CSE créé",
                     acces_cse:"Accès CSE ouvert", suspension:"Accès suspendu",
                     reactivation:"Accès rétabli", affectation:"Rattachement à un site",
                     classement_sites:"Classement entre sites" };
  const boxA = el.querySelector("#acces");
  const journalAcces = DB.acces(u.org);
  if (!journalAcces.length) boxA.appendChild(h(`<p class="muted" style="font-size:var(--t-sm)">Rien encore.</p>`));
  else {
    const t = h(`<div class="tableau"><table class="table"><tbody></tbody></table></div>`);
    journalAcces.forEach(a => {
      const who = a.utilisateur ? DB.utilisateur(a.utilisateur) : null;
      t.querySelector("tbody").appendChild(h(`<tr>
        <td class="muted tnum" style="width:70px">${dateCourte(a.date)}</td>
        <td><strong>${esc(libelles[a.quoi] || a.quoi)}</strong>${who ? `, ${esc(who.nom)}` : ""}</td>
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
    /* Meme regle que le rapport et que le mecenat : un don personnel de salarie
       ne sort jamais de l'espace employeur. Le seuil d'agregation de cinq
       donateurs ne vaut rien si le detail ressort par une autre porte, et
       celle-ci s'appelle « Exporter toutes nos donnees ». */
    const ms = DB.missionsVueEmployeur(u.org).filter(m => !m.masquee);
    versCSV("riseva-export-complet.csv",
      ["Type", "Libellé", "Association", "Salarié", "Date", "Quantité", "Points", "État"],
      [...ms.map(m => { const a = DB.annonceDe(m), sal = DB.utilisateur(m.salarie);
          return ["mission", a.titre, (DB.association(a.asso) || {}).nom, sal ? sal.nom : "",
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
  const annonces = DB.annonces({ asso: aid, toutes: true });
  const ms = DB.missions({ asso: aid });
  const aValider = ms.filter(m => m.etat === "a_valider");

  /* Ce qui attend vraiment une action de l'association, et rien d'autre. */
  /* Qui vient, quand, et pour quelle mission : la première question d'une
     association, et celle à laquelle le tableau de bord ne répondait pas. */
  const aVenir = ms.filter(m => m.etat === "engagee")
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const placesRestantes = annonces.filter(a => a.etat === "ouverte" && !estArgent(a.type))
    .reduce((n, a) => n + a.restant, 0);
  const reaAsso = DB.realisations({ asso: aid });

  /* Complétude de la fiche publique : ce qui manque pour qu'une association ait
     envie de la partager, dit noir sur blanc plutôt que laissé à deviner. */
  const attendu = [
    [asso.resume && asso.resume.length > 40, "une description d'au moins deux lignes"],
    /* La photo passe en tete de ce qui manque : c'est la premiere chose qu'un
       salarie voit dans l'annuaire de son entreprise, avant le texte. */
    [!!asso.photo, "une photo de ce que vous faites"],
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
    `${aValider.length} mission${aValider.length > 1 ? "s" : ""} à confirmer, sans réponse sous quatorze jours, elle${aValider.length > 1 ? "s seront clôturées automatiquement sans confirmation" : " sera clôturée automatiquement sans confirmation"}` });
  if (asso.a_reverifier_le && asso.a_reverifier_le <= new Date(2026, 7, 20).toISOString().slice(0, 10))
    rappels.push({ ton:"alerte", vers:"#/dossier", texte:
      "Votre vérification annuelle est échue : refaites le contrôle au registre "
      + "depuis votre dossier, il prend quelques secondes" });
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
            <span class="rappel__go">${ICONS.arrow || "->"}</span></a>`).join("")}
        </div></div>
    </section>` : ""}

    ${/* Le chiffre que toute association demande avant meme de s'inscrire :
          est-ce que quelqu'un viendra. La page vitrine promet de le dire ; il
          faut donc qu'il existe, et qu'il soit vrai le jour ou la reponse est
          zero. Une plateforme qui commence a zero et le dit vaut mieux qu'une
          plateforme qui laisse esperer. */""}
    <section class="card" id="autour"></section>

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
        <span class="muted">, ${esc(e ? e.nom : "")}</span><br>
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
     bord ne montrait que ses propres annonces, une liste qu'elle connaît déjà. */
  const rea = bandeauRealisations(DB.realisations({ asso: aid }), {
    /* C'est l'association qui réalise. Les entreprises apportent des moyens.
       Écrire l'inverse, c'est lui dire que son travail sert d'abord à fabriquer
       les indicateurs RSE de nos clients. */
    titre: "Ce que vous avez réalisé avec le soutien des entreprises", sombre: true,
    note: "Ces chiffres sont ceux que vous avez confirmés en validant les missions." });
  if (rea) el.querySelector("#produit").appendChild(rea);

  /* Les entreprises autour de l'association. Rien n'est arrondi vers le haut, et
     zero s'affiche comme zero : c'est la seule version que l'association pourra
     verifier elle-meme le jour ou personne ne se propose. */
  const au = DB.entreprisesAutour(aid);
  const boiteAutour = el.querySelector("#autour");
  boiteAutour.appendChild(h(`<div class="between" style="align-items:flex-start;
    flex-wrap:wrap;gap:var(--s4)">
    <div style="max-width:62ch">
      <h3>Qui peut venir chez vous</h3>
      <p class="muted" style="font-size:var(--t-sm);margin-top:4px">
        ${au.entreprises
          ? `${nb(au.entreprises)} entreprise${au.entreprises > 1 ? "s" : ""} abonnée${
              au.entreprises > 1 ? "s" : ""} ${au.entreprises > 1 ? "ont" : "a"} au moins un site
             à moins de ${nb(au.rayon)} km de chez vous${
             au.plusProche != null ? `, le plus proche à ${nb(au.plusProche)} km` : ""}.
             Leurs salariés voient vos annonces dès qu'elles sont publiées.`
          : `Aucune entreprise abonnée n'a encore de site à moins de ${nb(au.rayon)} km de chez
             vous. Vos annonces restent publiées et deviennent visibles le jour où une entreprise
             de votre secteur s'abonne. Nous ne vous ferons pas patienter en vous laissant croire
             le contraire.`}</p>
    </div>
    ${au.entreprises ? `<div class="row" style="gap:var(--s6)">
      <div><span class="muted" style="font-size:var(--t-xs);text-transform:uppercase;
        letter-spacing:var(--track-wide)">Sites</span>
        <div style="font-family:var(--font-display);font-size:1.6rem;line-height:1.1">${nb(au.sites)}</div></div>
      <div><span class="muted" style="font-size:var(--t-xs);text-transform:uppercase;
        letter-spacing:var(--track-wide)">Salariés</span>
        <div style="font-family:var(--font-display);font-size:1.6rem;line-height:1.1">${nb(au.salaries)}</div></div>
    </div>` : ""}
  </div>`));
  return el;
}

function tableAnnoncesAsso(annonces, u){
  const t = h(`<div class="tableau"><table class="table"><thead><tr>
    <th>Annonce</th><th>Format</th><th>Il reste</th><th>État</th><th></th></tr></thead><tbody></tbody></table></div>`);
  const tb = t.querySelector("tbody");
  if (!annonces.length)
    tb.appendChild(h(`<tr><td colspan="5" class="empty">Aucune annonce publiée.</td></tr>`));
  annonces.forEach(a => {
    const engagees = DB.missions({}).filter(m =>
      m.annonce === a.id && m.etat !== "refusee" && DB.deLaSaison(m)).length;
    /* « Participants » ne veut rien dire sur un don de matériel ou une collecte
       financière : chaque format a son mot. */
    const tr = h(`<tr>
      <td><strong>${esc(a.titre)}</strong><br><span class="muted" style="font-size:var(--t-xs)">${dateFR(a.date)}, ${esc(a.lieu || "")}${
        engagees ? `, ${engagees} ${estTemps(a.type)
          ? "participant" + (engagees > 1 ? "s inscrits" : " inscrit")
          : a.type === "don_materiel"
            ? "don" + (engagees > 1 ? "s proposés" : " proposé")
            : "versement" + (engagees > 1 ? "s reçus" : " reçu")}` : ""}</span></td>
      <td class="muted">${esc(BAREME[a.type].label)}</td>
      ${/* « 4 / 6 » se lit comme une note. Ce qui compte pour une association, c'est
            combien il reste, et dans quelle unité. */""}
      <td class="tnum">${estArgent(a.type)
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

/* Les demandes les plus frequentes, deja ecrites. Une association qui ouvre ce
   formulaire devant sept formats, un titre vide et une description vide ferme la
   fenetre : c'est la marche a laquelle on perd le plus de monde. Ces modeles ne
   publient rien, ils remplissent les champs, et tout reste modifiable.

   Ils ne sont pas decoratifs : la page vitrine promet que « le formulaire
   propose les formats les plus demandes ». Une promesse faite sur la vitrine
   doit exister dans le produit le jour ou la personne arrive. */
const MODELES_ANNONCE = [
  { nom:"Des bras un samedi", type:"benevolat_demi_journee", quantite:8,
    titre:"Coup de main un samedi matin",
    desc:"Nous cherchons des bras pour une matinée. Rendez-vous sur place à 9 h, "
       + "nous fournissons le matériel et de quoi déjeuner. Aucune compétence "
       + "particulière n'est nécessaire." },
  { nom:"Une journée entière", type:"benevolat_journee", quantite:6,
    titre:"Une journée de chantier",
    desc:"Une journée complète, de 9 h à 17 h, repas partagé sur place. "
       + "Prévoir des vêtements qui ne craignent rien." },
  { nom:"Une compétence", type:"mecenat_competence", quantite:2,
    titre:"Un coup de main sur nos outils",
    desc:"Nous cherchons quelqu'un qui puisse nous aider sur le sujet, sur son "
       + "temps de travail, une demi-journée à convenir ensemble." },
  { nom:"Du matériel", type:"don_materiel", quantite:1,
    titre:"Du matériel dont nous manquons",
    desc:"Nous prenons ce qui fonctionne encore, même usagé. Dites-nous ce que "
       + "vous avez, nous venons le chercher si c'est près." },
  { nom:"Un parrainage", type:"parrainage_animal", quantite:4,
    titre:"Parrainer un animal du refuge",
    desc:"Le parrainage couvre la nourriture et les soins d'un animal pendant "
       + "l'année. Vous recevez de ses nouvelles." },
  /* La quantite d'un don financier se compte en tranches de dix euros : 50, ce
     sont cinq cents euros, et non cinq cents euros de plus. */
  { nom:"Un coup de main financier", type:"don_financier", quantite:50,
    titre:"Une aide pour boucler l'année",
    desc:"Ce que nous cherchons à financer, et à quoi l'argent servira "
       + "exactement." }
];

function formAnnonce(u, existante = null){
  const corps = h(`<div class="stack" style="--gap:var(--s4)">
    ${existante ? "" : `<div class="field">
      <label>Partir d'un modèle</label>
      <div class="row" style="gap:var(--s2);flex-wrap:wrap" id="modeles">
        ${MODELES_ANNONCE.map((m, i) =>
          `<button type="button" class="btn btn--quiet btn--sm" data-m="${i}">${esc(m.nom)}</button>`).join("")}
      </div>
      <p class="hint">Ils remplissent les champs, rien de plus. Tout reste modifiable, et rien
        n'est publié tant que vous n'avez pas relu.</p></div>`}
    <div class="field"><label>Format</label>
      <select class="select" id="type">
        ${Object.entries(BAREME).map(([k, b]) =>
          `<option value="${k}">${esc(b.label)}, ${b.points} pt${b.points>1?"s":""} par ${esc(b.unite)}</option>`).join("")}
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
    const visible = estTemps(corps.querySelector("#type").value);
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

  corps.querySelectorAll("#modeles [data-m]").forEach(b => b.addEventListener("click", () => {
    const m = MODELES_ANNONCE[Number(b.dataset.m)];
    if (!m) return;
    corps.querySelector("#type").value = m.type;
    corps.querySelector("#titre").value = m.titre;
    corps.querySelector("#desc").value = m.desc;
    corps.querySelector("#q").value = m.quantite;
    if (!corps.querySelector("#lieu").value)
      corps.querySelector("#lieu").value = (DB.association(u.org) || {}).ville || "";
    majTT();
    corps.querySelector("#titre").focus();
  }));

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

    <section class="card" id="aConfirmer">
      <div class="between" style="margin-bottom:var(--s5)">
        <div><h3>Missions à confirmer</h3>
        <p class="muted" style="font-size:var(--t-sm);margin-top:4px">
          Sans réponse de votre part sous quatorze jours, la mission est clôturée automatiquement
          sans confirmation : l'entreprise marque ses points, le résultat reste estimé et il est
          écrit comme tel. Ce n'est pas une faute.</p></div>
      </div>
      <div class="tableau"><table class="table"><thead><tr>
        <th style="width:36px"></th><th>Mission</th><th>Entreprise</th><th>Salarié</th>
        <th>Date</th><th>Délai</th><th>État</th><th></th>
      </tr></thead><tbody></tbody></table></div>
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
      <td><strong>${esc(a.titre)}</strong><br><span class="muted" style="font-size:var(--t-xs)">${esc(BAREME[a.type].label)}, ${nb(m.points)} pts</span></td>
      <td class="muted">${esc(e ? e.nom : "-")}</td>
      <td class="muted">${esc(sal ? sal.nom : "-")}</td>
      <td class="muted tnum">${dateCourte(m.date)}</td>
      <td>${jours === null ? '<span class="muted">sans délai</span>'
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

/* Redimensionner une image dans le navigateur avant de l'enregistrer. Une photo
   de telephone pese quatre megaoctets ; personne ne va la reduire a la main, et
   une fiche qui met deux secondes a s'ouvrir sur un telephone est une fiche
   qu'on quitte. Mille deux cents pixels de large suffisent partout ou cette
   image est montree, y compris sur un ecran a haute densite. */
function reduireImage(fichier, { large = 1200, qualite = 0.82 } = {}){
  return new Promise((ok, non) => {
    const lecteur = new FileReader();
    lecteur.onerror = () => non(new Error("Ce fichier n'a pas pu être lu."));
    lecteur.onload = () => {
      const im = new Image();
      im.onerror = () => non(new Error("Ce fichier n'est pas une image."));
      im.onload = () => {
        const ech = Math.min(1, large / im.width);
        const c = document.createElement("canvas");
        c.width = Math.round(im.width * ech);
        c.height = Math.round(im.height * ech);
        const ctx = c.getContext("2d");
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(im, 0, 0, c.width, c.height);
        ok(c.toDataURL("image/jpeg", qualite));
      };
      im.src = lecteur.result;
    };
    lecteur.readAsDataURL(fichier);
  });
}

function vuePageAsso(u){
  const a = DB.association(u.org);
  if (!a) return h(`<section class="card"><p class="empty">Aucune association rattachée.</p></section>`);
  const causes = ["Protection animale", "Reforestation", "Dépollution", "Aide alimentaire",
                  "Réemploi", "Biodiversité", "Éducation", "Lutte contre l'exclusion"];
  const el = h(`<div class="two">
    <section class="card" style="padding:var(--s8)">
      <p class="eyebrow">Page publique</p>
      <h2 style="margin-top:var(--s3)">${esc(a.nom)}</h2>
      <p class="muted" style="font-size:var(--t-sm);margin-top:var(--s3)">
        C'est ce que voit un salarié qui vous découvre dans l'annuaire de son entreprise.
        Votre dénomination et vos numéros viennent du registre public et ne se corrigent
        pas ici. Le reste vous appartient.</p>

      <hr class="sep">
      <h3 style="font-size:var(--t-lg)">Votre photo</h3>
      <p class="muted" style="font-size:var(--t-sm);margin-top:4px">
        Une photo de ce que vous faites, prise chez vous. Elle passe avant votre texte :
        c'est elle qu'on regarde en premier. Riseva la réduit toute seule, vous pouvez
        envoyer celle de votre téléphone.</p>
      <div style="margin-top:var(--s5)" id="apercuPhoto"></div>
      <div class="row" style="gap:var(--s3);margin-top:var(--s4);flex-wrap:wrap">
        <input type="file" id="phF" accept="image/png,image/jpeg,image/webp" hidden
          aria-label="Choisir une photo">
        <button class="btn btn--quiet btn--sm" type="button" id="phB">Choisir une photo</button>
        ${a.photo ? `<button class="btn btn--ghost btn--sm" type="button" id="phX">Retirer</button>` : ""}
      </div>

      <hr class="sep">
      <div class="stack" style="--gap:var(--s4)">
        <div class="field"><label for="pa-res">Présentation affichée</label>
          <textarea class="textarea" id="pa-res" rows="5">${esc(a.resume || "")}</textarea>
          <p class="hint"><span id="pa-cpt">0</span> caractères sur 600.
            Dites ce que vous faites et pour qui, pas votre histoire depuis 1994.</p></div>
        <div class="row" style="gap:var(--s4);align-items:stretch">
          <div class="field" style="flex:1"><label for="pa-cause">Cause</label>
            <select class="select" id="pa-cause">
              ${causes.map(c => `<option ${c === a.cause ? "selected" : ""}>${esc(c)}</option>`).join("")}
              ${a.cause && !causes.includes(a.cause) ? `<option selected>${esc(a.cause)}</option>` : ""}
            </select></div>
          <div class="field" style="flex:1"><label for="pa-ville">Ville</label>
            <input class="input" id="pa-ville" value="${esc(a.ville || "")}"></div>
        </div>
        <div class="field"><label for="pa-site">Votre site, si vous en avez un</label>
          <input class="input" id="pa-site" value="${esc(a.site || "")}" placeholder="https://"></div>
      </div>
      <div class="row" style="margin-top:var(--s6);gap:var(--s3)">
        <button class="btn btn--primary btn--sm" id="pa-save">Enregistrer</button>
        <a class="btn btn--ghost btn--sm" href="/asso.html?id=${a.id}" target="_blank">Prévisualiser</a>
      </div>
    </section>

    <div class="stack" style="--gap:var(--s5)">
      <section class="card">
        <h3>Le don en argent</h3>
        <p class="muted" style="font-size:var(--t-sm);margin-top:var(--s4)">
          Les donateurs virent directement sur votre compte, avec une référence que nous émettons.
          Nous ne touchons jamais aux fonds : ni compte de passage, ni reversement. Vous recevez la
          totalité du don le jour où votre banque le crédite.</p>
        <hr class="sep">
        <div class="stack" style="--gap:var(--s3);font-size:var(--t-sm)">
          <div class="between"><span class="muted">Circuit</span><span>virement direct, sans intermédiaire</span></div>
          <div class="between"><span class="muted">Commission Riseva</span><strong>0 %</strong></div>
          <div class="between"><span class="muted">Votre compte</span>${
            DB.donsOuverts(u.org)
              ? `<span class="badge badge--ok">renseigné</span>`
              : `<span class="badge badge--warn">à renseigner</span>`}</div>
          <div class="between"><span class="muted">Reçus fiscaux</span>${
            DB.recusPrets(u.org)
              ? `<span class="badge badge--ok">préparés sur mandat</span>`
              : `<span class="badge badge--warn">mandat à donner</span>`}</div>
        </div>
        <a class="btn btn--ghost btn--sm" style="margin-top:var(--s4)" href="#/dons">Gérer les dons</a>
      </section>

      <section class="card card--flat" style="background:var(--paper-sunk);border-color:transparent">
        <h3 style="font-size:var(--t-md)">Ce qui décide un salarié</h3>
        <ul class="liste" style="margin-top:var(--s3);font-size:var(--t-sm)">
          <li>Une photo prise chez vous, pas une image d'illustration.</li>
          <li>Une ville juste : l'annuaire classe par distance depuis son lieu de travail.</li>
          <li>Deux phrases sur ce qui vous manque en ce moment, pas sur vos statuts.</li>
          <li>Des besoins ouverts : une fiche sans annonce ne mène nulle part.</li>
        </ul>
      </section>
    </div>
  </div>`);

  const boxPhoto = el.querySelector("#apercuPhoto");
  const dessinePhoto = (src) => {
    boxPhoto.innerHTML = "";
    boxPhoto.appendChild(h(`<div>${couvertureAsso({ ...a, photo: src }, { hauteur: 190 })}</div>`));
    if (!src) boxPhoto.appendChild(h(`<p class="hint" style="margin-top:6px">
      Sans photo, c'est une image générique de votre cause qui s'affiche. La vôtre vaut mieux.</p>`));
  };
  dessinePhoto(a.photo || null);

  const fPh = el.querySelector("#phF");
  el.querySelector("#phB").onclick = () => fPh.click();
  fPh.onchange = async () => {
    const f = fPh.files && fPh.files[0];
    if (!f) return;
    try {
      const petite = await reduireImage(f);
      DB.majAssociation(u.org, { photo: petite });
      dessinePhoto(petite);
      toast("Photo enregistrée. Elle apparaît dès maintenant dans l'annuaire.");
    } catch (err){ toast(err.message); }
    fPh.value = "";
  };
  el.querySelector("#phX")?.addEventListener("click", () => {
    try { DB.majAssociation(u.org, { photo: "" }); dessinePhoto(null);
          toast("Photo retirée."); }
    catch (err){ toast(err.message); }
  });

  const res = el.querySelector("#pa-res"), cpt = el.querySelector("#pa-cpt");
  const compte = () => { cpt.textContent = nb(res.value.trim().length); };
  res.addEventListener("input", compte); compte();

  el.querySelector("#pa-save").onclick = () => {
    try {
      DB.majAssociation(u.org, {
        resume: res.value,
        cause: el.querySelector("#pa-cause").value,
        ville: el.querySelector("#pa-ville").value,
        site: el.querySelector("#pa-site").value
      });
      toast("Votre page est à jour.");
      rendre();
    } catch (err){ toast(err.message); }
  };
  return el;
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
        <div style="margin-top:var(--s6)">${riviere(DB.semaines(), { hauteur: 150, legendes: ["il y a 12 semaines", "aujourd'hui"] })}</div>
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
            return j ? `${dateFR(j.le)}, ${j.validations_auto} validation(s) automatique(s),
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
  const el = h(`<section class="card"><div class="tableau"><table class="table"><thead><tr>
    <th>Entreprise</th><th>Secteur</th><th>Places</th><th>Points</th><th>Rang</th>
  </tr></thead><tbody></tbody></table></div></section>`);
  const tb = el.querySelector("tbody");
  DB.classement().forEach(e => {
    const si = DB.sieges(e.id);
    tb.appendChild(h(`<tr>
      <td><strong>${esc(e.nom)}</strong><br><span class="muted" style="font-size:var(--t-xs)">${esc(e.ville)}, ${nb(e.effectif)} salariés</span></td>
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
      <div class="tableau"><table class="table"><thead><tr>
        <th>Association</th><th>Cause</th><th>Identifiant</th><th>Registre</th>
        <th>Vérifiée</th><th>Annonces</th><th>État</th><th></th>
      </tr></thead><tbody></tbody></table></div>
    </section>
  </div>`);
  const tb = el.querySelector("tbody");
  if (!DB.associations().length)
    tb.appendChild(h(`<tr><td colspan="8" class="muted" style="font-size:var(--t-sm)">
      Aucune association inscrite pour l'instant. Elles arrivent par le site
      <a href="/associations.html" target="_blank">riseva.fr/associations</a>, et se présentent
      ici dès qu'un compte est ouvert.</td></tr>`));
  DB.associations().forEach(a => {
    const retard = a.valide && a.a_reverifier_le && a.a_reverifier_le < "2026-08-20";
    const etat = a.suspendue ? ["Suspendue", "badge--danger"]
               : !a.valide   ? ["En attente", "badge--warn"]
               : retard      ? ["À revérifier", "badge--warn"]
               :               ["Validée", "badge--ok"];
    const tr = h(`<tr>
      <td><strong>${esc(a.nom)}</strong><br><span class="muted" style="font-size:var(--t-xs)">${esc(a.ville || "")}, ${esc(a.resume || "")}</span></td>
      <td class="muted">${esc(a.cause || "-")}</td>
      <td class="muted" style="font-family:var(--font-mono);font-size:var(--t-xs)">${esc(a.siren || a.rna || "-")}</td>
      <td>${badgeControle(a.id)}</td>
      <td class="muted tnum">${a.verifiee_le ? dateCourte(a.verifiee_le) : "-"}</td>
      <td class="tnum">${DB.annonces({ asso: a.id, toutes: true }).length}</td>
      <td><span class="badge ${etat[1]}">${etat[0]}</span></td>
      <td style="text-align:right"></td></tr>`);
    const cell = tr.lastElementChild;
    if (!a.valide || retard || a.suspendue){
      const b = h(`<button class="btn btn--forest btn--sm">${a.valide ? "Revérifier" : "Valider"}</button>`);
      b.onclick = () => {
        const ct = DB.dernierControle(a.id);
        /* Le premier point de la liste n'est plus une case qu'on coche de bonne foi :
           il est renseigné par le registre, ou il ne l'est pas. C'était le seul des
           cinq qu'une machine pouvait vérifier mieux qu'un humain pressé. */
        const auto = ct && ["exact","proche"].includes(ct.etat);
        const corps = h(`<div>
          <p class="muted">Le registre public d'abord : c'est le seul point de la liste
          qu'une vérification à l'œil rate régulièrement.</p>
          <div style="margin-top:var(--s4)" id="reg"></div>
          <hr style="margin:var(--s6) 0;border:0;border-top:1px solid var(--trait)">
          <p class="muted">Puis ce que seule une personne peut voir :</p>
          <div class="stack" style="--gap:var(--s3);margin-top:var(--s4)">
            <label class="checkline"><input type="checkbox" class="v" ${auto ? "checked disabled" : ""}>
              <span>Existence juridique confirmée${auto
                ? `, <strong>${esc(ETATS_CORRESPONDANCE[ct.etat].label.toLowerCase())}</strong>, contrôle du ${dateCourte(ct.le)}`
                : " (RNA ou SIREN, statuts)"}.</span></label>
            <label class="checkline"><input type="checkbox" class="v"><span>Référent et signataire des reçus identifiés.</span></label>
            <label class="checkline"><input type="checkbox" class="v"><span>Objet réel cohérent avec l'activité annoncée.</span></label>
            <label class="checkline"><input type="checkbox" class="v"><span>Coordonnées vérifiées et actives.</span></label>
            <label class="checkline"><input type="checkbox" class="v"><span>Éligibilité au mécénat déclarée par l'association elle-même.</span></label>
          </div>
          <p class="hint" style="margin-top:var(--s4)">Riseva ne certifie pas l'éligibilité fiscale.
          Seule l'association peut l'affirmer, et aucun registre ne la porte.</p></div>`);
        corps.querySelector("#reg").appendChild(blocRegistre(a, { admin:true }));
        modal((a.valide ? "Revérifier " : "Valider ") + a.nom, corps,
        [{ label:"Annuler" },
         { label:"Valider pour une saison", classe:"btn--primary", onClick: (md) => {
             const toutes = [...md.querySelectorAll(".v")].every(x => x.checked || x.disabled);
             if (!toutes){ toast("Cochez les cinq points, sinon la vérification ne vaut rien."); return false; }
             try { DB.validerAssociation(a.id); }
             catch (e){ toast(e.message); return false; }
             toast("Association vérifiée pour une saison."); rendre(); }}]);
      };
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
  const el = h(`<section class="card"><div class="tableau"><table class="table"><thead><tr>
    <th>Entreprise</th><th>Contact</th><th>Effectif</th><th>Date</th><th>État</th>
  </tr></thead><tbody></tbody></table></div></section>`);
  const tb = el.querySelector("tbody");
  if (!DB.preinscriptions().length)
    tb.appendChild(h(`<tr><td colspan="5" class="muted" style="font-size:var(--t-sm)">
      Aucune préinscription pour l'instant. Elles arrivent par le formulaire de
      <a href="/inscription.html" target="_blank">riseva.fr/inscription</a>.</td></tr>`));
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
      <p class="hint">Une action validée est une combinaison unique salarié x association x
        format x date, réalisée dans la période et acceptée avant la clôture. Deux versements
        au même organisme le même jour ne font qu'une action.</p>
    </section>

    <div class="kpis">
      ${lignes.slice(0, 4).map(([cle, titre, unite], i) => {
        const x = global[cle];
        return kpi(titre, x.valeur === null ? "-" : x.valeur + (unite ? " " + unite : ""),
          x.den ? `${nb(x.num)} sur ${nb(x.den)}` : "", "", i === 0 ? "kpi--tete grain" : "");
      }).join("")}
    </div>

    <div class="two">
      <section class="card">
        <h3>Définitions</h3>
        <div class="tableau"><table class="table" style="margin-top:var(--s5)"><tbody>
          ${lignes.map(([cle, titre, unite]) => {
            const x = global[cle];
            return `<tr>
              <td style="width:34%"><strong>${esc(titre)}</strong><br>
                <span class="tnum" style="color:var(--forest-800);font-weight:600">${
                  x.valeur === null ? "-" : x.valeur + (unite ? " " + unite : "")}</span></td>
              <td class="muted">${esc(x.definition)}</td></tr>`;
          }).join("")}
        </tbody></table></div>
      </section>

      <section class="card">
        <h3>Par entreprise</h3>
        <div class="tableau"><table class="table" style="margin-top:var(--s5)"><thead><tr>
          <th>Entreprise</th><th>Inscription</th><th>Participation</th><th>Réalisation</th>
        </tr></thead><tbody id="pe"></tbody></table></div>
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
      <td class="tnum">${x.inscriptionI0.valeur === null ? "-" : x.inscriptionI0.valeur + " %"}</td>
      <td class="tnum">${x.participation.valeur === null ? "-" : pct(x.participation.valeur) + " %"}</td>
      <td class="tnum">${x.realisation.valeur === null ? "-" : x.realisation.valeur + " %"}</td>
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
  const fond = DB.placesFondateur();
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
        <div class="field"><label>État</label>
          <select class="select" id="etat">
            <option value="brouillon">Brouillon</option>
            <option value="ouverte">Ouverte</option>
            <option value="close">Close</option>
          </select></div>
      </div>
      <button class="btn btn--primary" style="margin-top:var(--s6)" id="save">Enregistrer la saison</button>

      <hr class="sep">
      <h3 style="font-size:var(--t-lg)">Grille tarifaire</h3>
      <p class="muted" style="font-size:var(--t-sm);margin-top:4px">
        Elle vit dans le code, pas dans un champ de saisie : c'est elle qui est affichée sur le
        site public, calculée dans les devis et reprise dans les contrats. Un prix modifiable
        depuis un écran finirait par ne plus correspondre à celui qu'un client a lu.</p>
      <div class="tableau"><table class="table" style="margin-top:var(--s5)"><thead><tr>
        <th>Tranche</th><th style="text-align:right">Saison HT</th>
        <th style="text-align:right">Sites compris</th><th style="text-align:right">€ / salarié</th>
      </tr></thead><tbody>
        ${TARIFS.paliers.map((x, i) => {
          const ref = x.max === Infinity ? 2500 : x.max;
          return `<tr><td>${esc(x.label)}</td>
            <td class="tnum" style="text-align:right">${eur(x.prix)}</td>
            <td class="tnum" style="text-align:right">${x.sites}</td>
            <td class="tnum muted" style="text-align:right">${nb2(Math.round(x.prix / ref * 10) / 10)} €</td>
          </tr>`; }).join("")}
      </tbody></table></div>
      <div class="stack" style="--gap:var(--s3);margin-top:var(--s5);font-size:var(--t-sm)">
        <div class="between"><span class="muted">Site supplémentaire</span>
          <span class="tnum">${eur(TARIFS.site_supplementaire)} HT</span></div>
        <div class="between"><span class="muted">Acompte</span>
          <span class="tnum">${Math.round(TARIFS.acompte_taux * 100)} %, minimum ${eur(TARIFS.acompte_minimum)}</span></div>
        <div class="between"><span class="muted">Règlement comptant</span>
          <span class="tnum">- ${Math.round(TARIFS.remise_comptant * 100)} %</span></div>
        <div class="between"><span class="muted">Places fondateur</span>
          <span class="tnum">${fond.pris} prise${fond.pris > 1 ? "s" : ""} sur ${fond.places}, ${
            fond.ouvert ? `${fond.reste} restante${fond.reste > 1 ? "s" : ""} jusqu'au ${dateFR(fond.jusquau)}`
                        : "fermées"}</span></div>
      </div>
    </section>

    <section class="card">
      <h3>Barème</h3>
      <p class="muted" style="font-size:var(--t-sm);margin-top:var(--s3)">
        Versionné par saison. Un changement en cours de saison fausserait le classement :
        il ne s'applique donc qu'à partir de la saison suivante.</p>
      <div class="stack" style="--gap:var(--s4);margin-top:var(--s6)">
        ${Object.entries(BAREME).map(([k, b]) => `
          <div class="field"><label>${esc(b.label)}, par ${esc(b.unite)}</label>
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
      etat:v("etat") });
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
   et où son entreprise en est, dans cet ordre. */
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
  const ns = DB.notreSaison(u.id);

  /* Le rattachement en attente se dit ICI, avant tout le reste, et pas au
     moment du clic final. Ce qui se passait : le salarie parcourait les
     annonces, en ouvrait une, remplissait toute la fenetre d'engagement, et
     apprenait a la derniere seconde que son rattachement n'etait pas confirme.
     La fenetre restait ouverte, sans issue, et l'ecran ne disait pas a qui
     s'adresser. Un blocage annonce apres l'effort est un blocage deux fois. */
  const enAttenteDeRattachement = u.etablissement && u.affectation_confirmee === false;
  const monSite = u.etablissement ? DB.etablissement(u.etablissement) : null;

  const el = h(`<div class="stack" style="--gap:var(--s5)">
    ${enAttenteDeRattachement ? `<section class="card card--flat"
      style="background:var(--warn-bg);border-color:transparent">
      <h3 style="font-size:var(--t-lg)">Votre rattachement attend une confirmation</h3>
      <p style="font-size:var(--t-sm);color:var(--ink-600);margin-top:6px;max-width:74ch">
        Vous êtes rattaché au site <b>${esc(monSite ? monSite.nom : "de votre entreprise")}</b>,
        et ce rattachement doit être confirmé par le référent de ce site avant que vous
        puissiez vous engager sur une mission. Sans lui, vos points iraient au mauvais
        endroit. Vous pouvez déjà regarder ce qui se passe près de chez vous.</p>
      <p class="hint" style="margin-top:var(--s4)">Si personne ne répond, l'administrateur
        de votre entreprise peut confirmer à sa place depuis son écran « Équipe ».</p>
    </section>` : ""}
    ${aDeclarer.length ? `<section class="aFaire">
      <div class="aFaire__col">
        <span class="aFaire__titre">Action requise
          <span class="badge badge--warn" style="height:20px;margin-left:6px">${aDeclarer.length}</span></span>
        <div class="aFaire__liste">
          <a class="rappel rappel--dense" href="#/missions">
            <span class="notif__point notif__point--alerte"></span>
            <span>${aDeclarer.length} mission${aDeclarer.length > 1 ? "s" : ""} passée${
              aDeclarer.length > 1 ? "s" : ""} que vous n'avez pas encore déclarée${
              aDeclarer.length > 1 ? "s" : ""}, sans déclaration, elle${
              aDeclarer.length > 1 ? "s ne comptent" : " ne compte"} pas</span>
            <span class="rappel__go">${ICONS.arrow || "->"}</span></a>
        </div></div>
      ${enAttente.length ? `<div class="aFaire__col">
        <span class="aFaire__titre">En attente d'un tiers</span>
        <div class="aFaire__liste">
          <a class="rappel rappel--dense" href="#/missions">
            <span class="notif__point notif__point--info"></span>
            <span>${enAttente.length} mission${enAttente.length > 1 ? "s" : ""} en attente
              de confirmation par l'association</span>
            <span class="rappel__go">${ICONS.arrow || "->"}</span></a>
        </div></div>` : ""}
    </section>` : ""}

    <div class="kpis">
      ${kpi("Mes points", nb(mesPoints), `${nb(validees.length)} mission${
        validees.length > 1 ? "s" : ""} validée${validees.length > 1 ? "s" : ""}`, "", "kpi--tete grain")}
      ${kpi("Heures de bénévolat", nb(validees.reduce(
        (n, m) => n + heuresPour((DB.annonceDe(m) || {}).type, m.quantite), 0)))}
      ${kpi("Associations soutenues", nb(new Set(validees
        .map(m => (DB.annonceDe(m) || {}).asso).filter(Boolean)).size))}
      ${kpi("Missions à venir", nb(aVenir.length),
        aVenir.length ? "prochaine le " + dateCourte(aVenir.map(m => m.date).sort()[0]) : "rien de prévu")}
    </div>

    <div id="realisMoi"></div>

    ${ns ? `<section class="card card--dark grain">
      <div class="between" style="flex-wrap:wrap;gap:var(--s4);align-items:flex-start">
        <div>
          <p class="eyebrow" style="color:var(--lime)">Notre saison</p>
          <h3 style="color:var(--paper);margin-top:var(--s2)">${esc(ns.site ? ns.site.nom
            : ns.entreprise.nom)}, ensemble</h3>
          <p class="muted" style="font-size:var(--t-sm);margin-top:4px;color:#C5CDBB">
            L'objectif se compte en personnes, pas en points : il ne s'atteint qu'en allant
            chercher quelqu'un qui n'est pas encore venu.</p>
        </div>
        ${ns.atteint ? `<span class="badge badge--lime">Objectif atteint</span>` : ""}
      </div>

      <div style="margin-top:var(--s6)">
        <div class="between" style="align-items:flex-end;margin-bottom:var(--s3)">
          <div style="font-family:var(--font-display);font-size:2.2rem;line-height:1;
            color:var(--paper)">${nb(ns.mobilises)}
            <span style="font-size:var(--t-lg);color:#C5CDBB">
              ${ns.mobilises > 1 ? "personnes mobilisées" : "personne mobilisée"}
              sur ${nb(ns.cible)}</span></div>
          <span class="tnum" style="color:var(--lime);font-weight:600">${pct(ns.part * 100, 0)} %</span>
        </div>
        <div class="bar bar--sombre"><i style="width:${Math.round(ns.part * 100)}%"></i></div>
        <p class="muted" style="font-size:var(--t-xs);margin-top:var(--s3);color:#A8B29B">
          ${ns.atteint
            ? `L'objectif est atteint. Tout ce qui vient en plus est du bonus, et personne ne compte les retardataires.`
            : `Il manque ${nb(ns.cible - ns.mobilises)} personne${
                ns.cible - ns.mobilises > 1 ? "s" : ""}. La plus efficace des deux façons d'aider,
               c'est d'en amener une avec vous.`}
        </p>
      </div>

      <div class="three" style="margin-top:var(--s6)">
        ${kpi("Missions faites ici", nb(ns.missions), "", "", "kpi--nu")}
        ${kpi("Engagements à venir", nb(ns.aVenir),
          ns.prochaine ? "la prochaine le " + dateCourte(ns.prochaine.date) : "aucun pour l'instant",
          "", "kpi--nu")}
        ${kpi("Effectif du périmètre", nb(ns.effectif), "", "", "kpi--nu")}
      </div>
    </section>` : ""}

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
  /* Le mur des noms. Cette liste montrait TOUS les collegues, classes, avec
     leurs points — donc trois d'entre eux nommes a zero, en clair, devant tout
     le monde. C'est exactement le contraire de la regle qui tient le produit :
     chacun se propose, et se retirer ne demande aucune justification. Un nom
     affiche a zero est une convocation.
     On ne nomme donc plus que ceux qui SONT VENUS. Les autres existent dans le
     total collectif, jamais dans une ligne a leur nom. */
  const equipe = DB.salaries(u.org).filter(x => !x.anonyme)
                   .map(x => ({ ...x, pointsVus: DB.pointsVisiblesEmployeur(x.id) }))
                   .sort((a, b) => b.pointsVus - a.pointsVus);
  const venus = equipe.filter(x => x.pointsVus > 0);
  const restants = equipe.length - venus.length;
  /* Aucun compteur figé : les points du salarié comme ceux de l'entreprise se
     relisent dans les missions validées, à chaque affichage. */
  const mesPoints = DB.pointsVisiblesEmployeur(u.id);
  const totalEnt = e ? DB.pointsDe(e.id).retenu : 0;
  const part = totalEnt ? Math.round((mesPoints / totalEnt) * 100) : 0;

  const el = h(`<div class="stack" style="--gap:var(--s5)">
    <div class="kpis">
      ${kpi("Mes points", nb(mesPoints), `${part} % du total de l'entreprise`, "", "kpi--tete grain")}
      ${kpi("Missions réalisées", nb(validees.length), ms.length - validees.length + " en cours")}
      ${/* « 3e sur 7 » classe un salarie contre ses collegues sur un geste
            volontaire. On compte donc ceux qui sont venus, pas ceux qui
            gagnent. */""}
      ${kpi("Venus cette saison", nb(venus.length),
            venus.length ? "collègues, vous compris" : "personne pour l'instant")}
      ${kpi("Heures", nb(validees.reduce(
        (n, m) => n + heuresPour((DB.annonceDe(m) || {}).type, m.quantite), 0)), "de bénévolat")}
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
          <h3>Ceux qui y sont allés</h3>
          ${venus.length ? `<div class="stack" style="--gap:var(--s3);margin-top:var(--s5);font-size:var(--t-sm)">
            ${venus.slice(0, 6).map(x => `<div class="between" ${x.id === u.id
              ? 'style="font-weight:600;color:var(--forest-800)"' : ""}>
              <span>${esc(x.nom)}${x.id === u.id ? " (vous)" : ""}</span>
              <span class="tnum">${nb(x.pointsVus)}</span></div>`).join("")}
          </div>` : `<p class="muted" style="font-size:var(--t-sm);margin-top:var(--s4)">
            Personne n'est encore parti sur une mission cette saison. Vous pouvez être
            le premier.</p>`}
          <hr class="sep">
          <p class="hint">Cette liste ne nomme que ceux qui sont venus${restants
            ? `, et ${nb(restants)} collègue${restants > 1 ? "s n'y figurent" : " n'y figure"}
               pas pour cette raison` : ""}. Personne n'apparaît à zéro : ne pas venir
            n'est pas une information à publier. Elle ne sort jamais de votre entreprise, elle
            ne compte que les missions, et les dons personnels n'y apparaissent pas.</p>
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
    const t = h(`<div class="tableau"><table class="table"><thead><tr>
      <th>Mission</th><th>Association</th><th>Date</th><th>Points</th><th>État</th>
    </tr></thead><tbody></tbody></table></div>`);
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
      <div class="tableau"><table class="table"><thead><tr>
        <th>Annonce</th><th>Motif</th><th>Reçu</th><th>État</th><th></th>
      </tr></thead><tbody></tbody></table></div>
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
          par ? `, signalé par ${esc(par.nom)}` : ""}</span>
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
    ["Extinction des intentions de don", "Une intention de virement que personne n'a honorée s'éteint au bout de trente jours. Rien n'est crédité, rien n'est reproché : sans échéance, le « reste à financer » d'une annonce serait faux en permanence.", dernier.intentions_expirees],
    ["Génération des rapports", "Chaque période close produit son rapport, sans que personne le demande.", dernier.rapports],
    ["Recalcul du classement", "Refait chaque lundi. Aucun rang n'est stocké : il se déduit des points, ce qui interdit tout écart entre l'affiché et le réel.", dernier.classement ? "à jour" : "-"]
  ];
  const el = h(`<div class="stack" style="--gap:var(--s5)">
    <section class="card card--dark grain">
      <div class="between" style="flex-wrap:wrap;gap:var(--s4)">
        <div>
          <h3>Dernier passage</h3>
          <p class="muted" style="margin-top:6px;font-size:var(--t-sm)">
            ${dernier.le ? dateFR(dernier.le) : "jamais"}, ${nb(dernier.validations_auto || 0)} validation${(dernier.validations_auto || 0) > 1 ? "s" : ""} automatique${(dernier.validations_auto || 0) > 1 ? "s" : ""},
            ${nb(dernier.annonces_fermees || 0)} annonce${(dernier.annonces_fermees || 0) > 1 ? "s" : ""} fermée${(dernier.annonces_fermees || 0) > 1 ? "s" : ""},
            ${nb(dernier.rapports || 0)} rapport${(dernier.rapports || 0) > 1 ? "s" : ""} généré${(dernier.rapports || 0) > 1 ? "s" : ""}.</p>
        </div>
        <button class="btn btn--onDark btn--sm" id="run">Relancer maintenant</button>
      </div>
    </section>

    <div class="two">
      <section class="card">
        <h3>Ce qui tourne sans personne</h3>
        <div class="tableau"><table class="table" style="margin-top:var(--s5)"><tbody>
          ${regles.map(([t, d, v]) => `<tr>
            <td style="width:36%"><strong>${esc(t)}</strong><br>
              <span class="tnum" style="color:var(--forest-800);font-weight:600">${
                v === undefined ? "-" : (typeof v === "number" ? nb(v) : esc(v))}</span></td>
            <td class="muted">${esc(d)}</td></tr>`).join("")}
        </tbody></table></div>
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
    const t = h(`<div class="tableau"><table class="table"><thead><tr>
      <th>Date</th><th>Validations</th><th>Fermetures</th><th>Intentions éteintes</th><th>Rapports</th></tr></thead><tbody></tbody></table></div>`);
    j.forEach(x => t.querySelector("tbody").appendChild(h(`<tr>
      <td class="muted tnum">${dateCourte(x.le)}</td>
      <td class="tnum">${nb(x.validations_auto)}</td>
      <td class="tnum">${nb(x.annonces_fermees)}</td>
      <td class="tnum">${nb(x.intentions_expirees || 0)}</td>
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
      ["Date", "Validations automatiques", "Annonces fermées", "Intentions de don éteintes", "Rapports générés"],
      j.map(x => [x.le, x.validations_auto, x.annonces_fermees, x.intentions_expirees || 0, x.rapports]));
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
    const t = h(`<div class="tableau"><table class="table"><thead><tr>
      <th>Date</th><th>Message</th><th>Destinataire</th><th>Objet</th><th>État</th>
    </tr></thead><tbody></tbody></table></div>`);
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
    const lignes = v.detailSalaries.flatMap(s => s.lignes);
    const points = [
      { libelle: "Coût horaire chargé renseigné dans les paramètres",
        ok: !!(e.cout_heure_charge || e.cout_jour_moyen) },
      { libelle: "SIRET et adresse de facturation renseignés",
        ok: !!(e.siret && e.adresse) },
      { libelle: "Associations bénéficiaires ayant déclaré leur éligibilité au mécénat",
        ok: missionsTT.length > 0
            && missionsTT.every(m => DB.eligibleMecenat((DB.annonceDe(m) || {}).asso)) },
      { libelle: "Heures réellement effectuées saisies pour chaque mission, pas la durée conventionnelle",
        ok: lignes.length > 0 && lignes.every(x => x.heuresReelles) },
      { libelle: "Convention de mise à disposition signée par les trois parties",
        ok: lignes.length > 0 && lignes.every(x => !!x.convention) },
      { libelle: "Reçu fiscal reçu de chaque association bénéficiaire",
        ok: lignes.length > 0 && lignes.every(x => !!x.recu) },
      { libelle: "Chiffre d'affaires, dons faits hors Riseva et reports antérieurs renseignés",
        ok: v.plafondCalculable },
      { libelle: "Validation par votre expert-comptable avant déclaration",
        ok: false }
    ];
    const ok = points.filter(x => x.ok).length;
    /* Le dernier contrôle est la validation par l'expert-comptable : il ne peut pas
       être coché depuis Riseva. Autrement dit le calcul n'est jamais « complet » ici,
       et c'est exactement ce qu'il faut écrire, plutôt que de se déclarer prêt à 3/5. */
    return { points, ok, total: points.length, pret: ok === points.length };
  })();
  const el = h(`<div class="stack" style="--gap:var(--s5)">
    <section class="card ${pretFiscal.pret ? "" : "card--flat"}"
      style="${pretFiscal.pret ? "" : "background:var(--warn-bg);border-color:transparent"}">
      <div class="between" style="flex-wrap:wrap;gap:var(--s4)">
        <div>
          <h3 style="font-size:var(--t-lg)">${pretFiscal.pret
            ? "Contrôles complets"
            : `Calcul incomplet, ${pretFiscal.ok} contrôle${pretFiscal.ok > 1 ? "s" : ""} sur ${pretFiscal.total}`}</h3>
          <p class="muted" style="font-size:var(--t-sm);margin-top:6px;color:var(--ink-600)">
            ${pretFiscal.pret
              ? "Les pièces sont réunies. Le montant reste une estimation : votre expert-comptable l'arrête."
              : "<strong>Non utilisable pour la déclaration</strong> tant que les justificatifs obligatoires ne sont pas complets. Le chiffre ci-dessous est un ordre de grandeur, pas un montant déclarable."}</p>
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
      ${kpi(v.plafondCalculable ? "Réduction d'impôt estimée" : "Estimation maximale potentielle",
            v.plafondCalculable ? eur(v.reduction) : eur(v.estimationMax),
            v.plafondCalculable
              ? `${Math.round(FISCAL.taux_reduction * 100)} % de ${eur(v.assietteRetenue)}`
              : `${Math.round(FISCAL.taux_reduction * 100)} % de ${eur(v.assiette)}, plafond non appliqué`,
            "", "kpi--tete grain")}
      ${kpi("Mécénat de compétences", eur(v.competencesRetenu),
            `${nb(v.heuresTT)} heure${v.heuresTT > 1 ? "s" : ""} sur le temps de travail, `
            + `${v.salariesConcernes} salarié${v.salariesConcernes > 1 ? "s" : ""}`)}
      ${kpi("Dons des salariés", eur(v.donsSalaries), "hors assiette de l'entreprise")}
      ${kpi("Report sur les exercices suivants", eurOuNon(v.reportable),
            v.plafondCalculable ? `sur ${FISCAL.report_annees} exercices`
                                : "demande votre chiffre d'affaires et vos autres dons")}
    </div>

    ${v.enAttente.valeur > 0 ? `<section class="card card--flat"
      style="background:var(--warn-bg);border-color:transparent;margin-top:var(--s6)">
      <h3 style="font-size:var(--t-lg)">${eur(v.enAttente.valeur)} attendent une confirmation</h3>
      <p class="muted" style="font-size:var(--t-sm);margin-top:var(--s3)">
        ${v.enAttente.missions} mission${v.enAttente.missions > 1 ? "s se sont fermées" : " s'est fermée"}
        sans retour de l'association au bout de ${DELAI_VALIDATION_JOURS} jours.
        ${v.enAttente.missions > 1 ? "Elles comptent" : "Elle compte"} dans vos points, mais
        <strong style="color:var(--ink)">pas dans votre assiette fiscale</strong> : l'article 238 bis
        valorise ce qui a été fait, et personne ne l'a confirmé. Un mail à
        ${v.enAttente.associations.length > 1
          ? esc(v.enAttente.associations.slice(0, 3).join(", "))
          : esc(v.enAttente.associations[0] || "l'association")} suffit à
        ${v.enAttente.missions > 1 ? "les" : "la"} faire rentrer.</p>
    </section>` : ""}

    <div class="two">
      <section class="card" id="calcul" style="padding:var(--s8)">
        <h3>Le calcul, ligne par ligne</h3>
        <div class="tableau"><table class="table" style="margin-top:var(--s5)"><tbody>
          <tr><td>Dons versés par l'entreprise elle-même</td>
              <td class="tnum" style="text-align:right">${eur(v.donsEntreprise)}</td></tr>
          <tr><td>Mécénat de compétences, au coût de revient<br>
              <span class="muted" style="font-size:var(--t-xs)">${nb(v.heuresTT)} heures sur
              ${v.salariesConcernes} salarié${v.salariesConcernes > 1 ? "s" : ""}, valorisées
              ${v.heuresEstimees ? `sur la base journalière déclarée (${eur(v.coutDemiJournee)}
              la demi-journée)` : `au coût horaire chargé de ${eur(v.coutHeure)}`}</span></td>
              <td class="tnum" style="text-align:right">${eur(v.competencesBrut)}</td></tr>
          ${v.ecreteParSalarie ? `<tr><td class="muted">Au-delà du plafond de ${eur(v.plafondSalarie)} par salarié</td>
              <td class="tnum" style="text-align:right;color:var(--ink-400)">- ${eur(v.ecreteParSalarie)}</td></tr>` : ""}
          <tr><td><strong>Assiette</strong></td>
              <td class="tnum" style="text-align:right"><strong>${eur(v.assiette)}</strong></td></tr>
          <tr><td class="muted">Plafond de l'entreprise<br>
              <span style="font-size:var(--t-xs)">le plus élevé entre ${eur(FISCAL.plafond_plancher)}
              et ${(FISCAL.plafond_taux_ca * 1000)} pour mille du chiffre d'affaires,
              soit ${pct(FISCAL.plafond_taux_ca * 100)} %${v.plafondCalculable ? ""
                : ", il porte sur tous vos versements de l'exercice, pas seulement sur ceux-ci"}</span></td>
              <td class="tnum" style="text-align:right">${eurOuNon(v.plafondEntreprise)}</td></tr>
          <tr><td class="muted">Excédent reporté sur les exercices suivants</td>
              <td class="tnum" style="text-align:right">${eurOuNon(v.reportable)}</td></tr>
          <tr><td><strong>${v.plafondCalculable
                ? `Réduction d'impôt de l'entreprise, ${Math.round(FISCAL.taux_reduction * 100)} %`
                : "Estimation maximale potentielle, plafond non appliqué"}</strong></td>
              <td class="tnum" style="text-align:right"><strong style="color:var(--forest-800)">${
                v.plafondCalculable ? eur(v.reduction) : eur(v.estimationMax)}</strong></td></tr>
        </tbody></table></div>

        <hr class="sep">
        <h3 style="font-size:var(--t-lg)">La piste d'audit, salarié par salarié</h3>
        <p class="muted" style="font-size:var(--t-sm);margin-top:var(--s3)">
          C'est cette table qu'un contrôle demande, pas le total. Elle rapproche, pour chaque
          mise à disposition : qui, quand, pour quelle association, combien d'heures, à quel coût
          horaire chargé, avec quelle convention et quel reçu.</p>
        ${v.detailSalaries.length ? `<div style="overflow-x:auto">
        <div class="tableau"><table class="table" style="margin-top:var(--s5);font-size:var(--t-sm)">
          <thead><tr><th>Salarié</th><th>Date</th><th>Association</th><th>Heures</th>
            <th>Coût retenu</th><th>Convention</th><th>Confirmation</th><th>Reçu</th></tr></thead>
          <tbody>
            ${v.detailSalaries.flatMap(s => s.lignes.map((x, i) => `<tr>
              <td>${i === 0 ? esc(s.nom) : ""}</td>
              <td class="muted tnum">${dateCourte(x.date)}</td>
              <td class="muted">${esc(x.association)}</td>
              <td class="tnum">${nb(x.heures)} h${x.heuresReelles ? ""
                : ` <span class="badge badge--warn">durée conventionnelle</span>`}</td>
              <td class="tnum">${eur(x.cout)}</td>
              <td>${x.convention ? `<span class="badge badge--ok">signée</span>`
                : `<span class="badge badge--warn">non signée</span>`}</td>
              <td>${x.confirmee ? `<span class="badge badge--ok">association</span>`
                : `<span class="badge badge--neutre">clôture d'office</span>`}</td>
              <td>${x.recu ? `<span class="badge badge--ok">reçu</span>`
                : `<span class="badge badge--warn">attendu</span>`}</td>
            </tr>`)).join("")}
          </tbody>
        </table></div></div>
        ${v.heuresEstimees ? `<p class="hint" style="margin-top:var(--s4)">
          Les durées marquées « conventionnelle » viennent du barème : une demi-journée vaut
          ${FISCAL.heures_demi_journee} heures. C'est un ordre de grandeur, pas une pièce
          comptable. La valorisation doit reposer sur les heures réellement effectuées, émargées
          par l'association : saisissez-les avant de transmettre quoi que ce soit à votre
          expert-comptable.</p>` : ""}` : `<p class="hint" style="margin-top:var(--s4)">
          Aucune mise à disposition sur le temps de travail cette saison.</p>`}

        <hr class="sep">
        <h3 style="font-size:var(--t-lg)">Les dons de vos salariés, à part</h3>
        <p class="muted" style="font-size:var(--t-sm);margin-top:var(--s3)">
          ${eur(v.donsSalaries)} ont été versés par vos salariés <strong style="color:var(--ink)">en
          leur nom propre</strong>. Ces montants n'entrent pas dans l'assiette de l'entreprise :
          l'article 238 bis vise les versements effectués par l'entreprise elle-même. Les faire
          entrer dans votre calcul fabriquerait une réduction d'impôt indue.</p>
        <p class="muted" style="font-size:var(--t-sm);margin-top:var(--s3)">
          Chaque salarié reçoit son propre reçu, au modèle ${esc(FISCAL.cerfa_particulier)}, et
          peut déduire 66 % de son don de son impôt sur le revenu, <strong style="color:var(--ink)">dans
          la limite de 20 % de son revenu imposable</strong> (article 200 du CGI). Au plus
          ${eur(v.reductionSalaries)} au total si ce plafond n'est atteint par personne, Riseva
          ne connaît pas leurs revenus et ne peut donc pas l'appliquer. L'excédent éventuel se
          reporte sur les cinq années suivantes. Pour eux, pas pour vous.</p>
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
    const toutes = DB.missions({ entreprise: u.org }).filter(m => {
      const a = DB.annonceDe(m);
      return a && estTemps(a.type) && a.temps_travail
             && ["engagee", "a_valider", "validee", "validee_auto"].includes(m.etat);
    });
    /* Deux conditions, et la convention affirme les deux. La première est le régime :
       l'article L. 8241-3 n'autorise le prêt gratuit qu'au profit des organismes des
       a à g du 1 de l'article 238 bis. Éditer une convention qui s'en réclame pour une
       association qui n'en relève pas, c'est signer un prêt de main-d'œuvre illicite.
       La seconde est l'accord exprès et écrit du salarié (R. 8241-2) : sans trace, la
       convention affirmerait un consentement que personne ne peut produire. */
    const eligibles = toutes.filter(m => DB.eligibleMecenat((DB.annonceDe(m) || {}).asso));
    const horsRegime = toutes.length - eligibles.length;
    const ms = eligibles.filter(m => m.consentement && m.consentement.donne_le);
    const sansAccord = eligibles.length - ms.length;
    if (!ms.length){
      toast(horsRegime && !eligibles.length
        ? "Ces missions concernent des associations qui ne déclarent pas leur éligibilité au mécénat : il n'y a pas de convention à éditer."
        : toutes.length
          ? "Aucune de ces missions ne porte l'accord écrit du salarié : la convention ne peut pas l'affirmer."
          : "Aucune mission sur le temps de travail pour l'instant.");
      return;
    }
    const corps = h(`<div>
      <p class="muted" style="font-size:var(--t-sm)">
        Choisissez la mission : le document est prérempli avec ses dates, son lieu, le salarié
        concerné et la valorisation au coût de revient.</p>
      ${sansAccord ? `<p class="hint" style="margin-top:var(--s3)">
        ${sansAccord} mission${sansAccord > 1 ? "s ne sont pas proposées" : " n'est pas proposée"} :
        l'accord écrit du salarié n'y est pas enregistré. La convention l'affirmerait sans preuve,
        et l'article R. 8241-2 en fait une condition de validité.</p>` : ""}
      ${horsRegime ? `<p class="hint" style="margin-top:var(--s3)">
        ${horsRegime} mission${horsRegime > 1 ? "s concernent des associations qui ne déclarent"
          : " concerne une association qui ne déclare"} pas leur éligibilité au mécénat.
        Hors du régime de l'article L. 8241-3, une mise à disposition gratuite redevient un prêt
        de main-d'œuvre illicite : il n'y a pas de convention à éditer, et le temps donné reste
        du bénévolat.</p>` : ""}
      <div class="field" style="margin-top:var(--s5)"><label>Mission</label>
        <select class="select" id="mi">
          ${ms.map(m => { const a = DB.annonceDe(m), sal = DB.utilisateur(m.salarie);
            return `<option value="${m.id}">${esc(a.titre)}, ${esc(sal ? sal.nom : "?")}, ${dateFR(m.date)}</option>`;
          }).join("")}
        </select></div>
      <div class="encadreMini">
        <p><strong>Deux régimes, et ils ne se valent pas.</strong></p>
        <p>Mettre un salarié à disposition d'une association, c'est un <strong>prêt de
        main-d'œuvre</strong>, jamais une prestation de service, et la durée n'y change rien :
        une demi-journée relève du même régime que six mois. Le prêt à but lucratif est interdit
        (article L. 8241-1). Ici on se place sous l'<strong>article L. 8241-3</strong>, qui
        autorise le prêt gratuit au profit des organismes visés aux a à g du 1 de l'article
        238 bis du CGI, sans condition d'effectif et pour trois ans au plus.</p>
        <p>Ce régime écarte l'article L. 8241-2 : <strong>pas d'avenant au contrat de travail</strong>.
        Il exige en revanche une convention conforme à l'article R. 8241-2, l'<strong>accord exprès
        et écrit du salarié</strong> pour cette mission-là, Riseva l'enregistre à l'engagement ,
        et l'information du CSE sur les postes concernés. Un refus ne peut jamais être sanctionné.</p>
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
    /* Un don personnel n'entre pas dans l'assiette de mecenat de l'entreprise :
       il n'est pas verse par elle. Il sortait ici avec le nom du salarie et le
       montant. */
    const ms = DB.missionsVueEmployeur(u.org)
                 .filter(m => !m.masquee)
                 .filter(m => m.etat === "validee" || m.etat === "validee_auto");
    versCSV("riseva-mecenat.csv",
      ["Mission", "Association", "Format", "Sur le temps de travail", "Salarié", "Date",
       "Quantité", "Valorisation"],
      ms.map(m => { const a = DB.annonceDe(m), sal = DB.utilisateur(m.salarie);
        const val = estTemps(a.type) && a.temps_travail
          ? m.quantite * v.coutDemiJournee
          : (estArgent(a.type) ? m.quantite : 0);
        return [a.titre, (DB.association(a.asso) || {}).nom, BAREME[a.type].label,
                a.temps_travail ? "oui" : "non", sal ? sal.nom : "", m.date, m.quantite, val]; }));
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
    `<h2>Article ${n}, ${titre}</h2>${corps}`;

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<title>Convention de mise à disposition, ${esc(e.nom)} et ${esc(asso.nom)}</title>
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
  <p class="st">Mécénat de compétences, article L. 8241-3 du code du travail</p>
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
    ${/* Le texte accepté, reproduit mot pour mot. C'est la pièce que la convention
          doit porter : une date seule atteste qu'on a coché, pas ce qu'on a lu. Et
          s'il manque, on l'écrit — un blanc franc vaut mieux qu'une phrase
          reconstituée aujourd'hui et présentée comme celle d'alors. */ ""}
    ${m.consentement && m.consentement.texte
      ? `<p><em>Texte accepté par le Salarié :</em><br>« ${esc(m.consentement.texte)} »</p>`
      : `<p><em>Le texte de l'accord n'a pas été conservé pour cette mission : il est à
         reconstituer et à faire signer avant la mise à disposition.</em></p>`}
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
      <tr><td>Durée</td><td>${m.quantite} ${esc((BAREME[a.type] || {}).unite || "unité")}${
        m.quantite > 1 ? "s" : ""}, soit ${heuresPour(a.type, m.quantite)} heures</td></tr>
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

  <p class="pied">Document préparé par Riseva, version ${dateFR(new Date().toISOString())},
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
        ${/* Les deux lignes sont tirées de la même fonction que le reçu lui-même.
              Recopier ici le numéro à la main aurait laissé l'écran promettre un
              modèle et le document en produire un autre, et c'est l'association
              qui signe, donc c'est elle que l'article 1740 A du CGI sanctionne. */
          [cerfaPour("salarie"), cerfaPour("entreprise")].map((c, i) => `
          <div class="row" style="align-items:flex-start;gap:var(--s3)">
            <span class="badge">Cerfa ${esc(c.numero)}</span>
            <span class="muted">${i === 0
              ? `Don d'un salarié à titre personnel, article ${esc(c.article)}.`
              : `Don ou mécénat de l'entreprise, article ${esc(c.article)}.
                 Obligatoire depuis le 1<sup>er</sup> janvier 2022.`}</span></div>`).join("")}
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
        Un reçu délivré à tort expose l'association à une amende égale au
        <strong>taux de la réduction d'impôt en cause</strong> appliqué aux sommes qui y figurent :
        60 % pour un don d'entreprise (article 238 bis), 66 ou 75 % pour un don de particulier
        (article 200). C'est l'article 1740 A du code général des impôts, et l'amende pèse sur
        l'organisme qui a délivré le reçu, pas sur celui qui l'a reçu.</p>
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
                 .filter(m => estArgent((DB.annonceDe(m) || {}).type)
                           && (m.etat === "validee" || m.etat === "validee_auto"));
    versCSV("riseva-dons.csv", ["Date", "Entreprise", "Donateur", "Montant", "Annonce"],
      ms.map(m => { const an = DB.annonceDe(m), sal = DB.utilisateur(m.salarie);
        return [m.date, (DB.entreprise(m.entreprise) || {}).nom, sal ? sal.nom : "",
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

      ${u.role === "salarie" || u.role === "site_referent" ? `
      <hr class="sep">
      <h3 style="font-size:var(--t-lg)">Votre prénom auprès de vos collègues</h3>
      <p class="muted" style="font-size:var(--t-sm);margin-top:4px">
        Sur une annonce, le <strong style="color:var(--ink)">nombre</strong> de collègues inscrits
        est toujours affiché : c'est ce qui rassure quelqu'un qui n'ose pas y aller seul, et ça ne
        désigne personne. Votre <strong style="color:var(--ink)">prénom</strong>, lui, n'apparaît
        que si vous le décidez ici.</p>
      <label class="checkline" style="margin-top:var(--s5)">
        <input type="checkbox" id="visp" ${u.visible_pairs ? "checked" : ""}>
        <span><strong>Mes collègues peuvent voir que je participe</strong><br>
          <span class="muted" style="font-size:var(--t-xs)">Votre prénom seul, et seulement pour
          les salariés de votre entreprise. Jamais votre nom, jamais pour une autre entreprise,
          jamais pour un don en argent. Une mission auprès d'une association peut en dire long
          sur vos convictions ou votre santé, c'est pour ça que ce réglage est à vous, décoché
          par défaut, et modifiable à tout moment.</span></span></label>` : ""}

      <button class="btn btn--primary" style="margin-top:var(--s8)" id="save">Enregistrer</button>
    </section>
    <div class="stack" style="--gap:var(--s5)">
      <section class="card">
        <h3>Notifications en cours</h3>
        <div class="stack" style="--gap:var(--s3);margin-top:var(--s5)" id="apercu"></div>
      </section>

      ${/* Cette carte parle de la DEMONSTRATION. Elle s'affichait aussi en
            production, ou elle proposait a un client de « remettre a neuf » ce
            qui est sa vraie base. */""}
      ${DB.mode === "supabase" ? "" : `<section class="card">
        <h3>Cet environnement</h3>
        <p class="muted" style="font-size:var(--t-sm);margin-top:var(--s3)">
          Tout ce que vous faites ici est enregistré et retrouvé à votre retour, exactement
          comme dans la version en production. ${DB.enregistreLe()
            ? `Dernier enregistrement le ${dateFR(DB.enregistreLe())}.` : ""}</p>
        <button class="btn btn--ghost btn--sm" style="margin-top:var(--s5)" id="raz">
          Remettre la démonstration à neuf</button>
        <p class="hint">Efface tout ce qui a été saisi et revient au jeu de départ.
          Une démonstration qu'on ne peut pas remettre à zéro finit par ne plus rien démontrer.</p>
      </section>`}
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
    const vp = el.querySelector("#visp");
    if (vp) DB.reglerVisibiliteParis(u.id, vp.checked);
    toast("Préférences enregistrées.");
  };
  el.querySelector("#raz")?.addEventListener("click", () => modal("Remettre la démonstration à neuf",
    `<p class="muted">Tout ce qui a été saisi depuis le début disparaît : annonces publiées,
     missions engagées, réglages, comptes créés. Le jeu de départ revient.</p>
     <p class="hint" style="margin-top:var(--s4)">Cette action ne se défait pas.</p>`,
    [{ label:"Annuler" },
     { label:"Tout remettre à neuf", classe:"btn--primary", onClick: () => {
         DB.reinitialiser();
         try { localStorage.removeItem("riseva.notifs.lues"); } catch {}
         location.reload(); }}]));
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
        <span class="ensemble__estimeT">Résultats estimés, non confirmés</span>
        <span class="ensemble__estimeL">${Object.entries(r.realisations.estimeParUnite)
          .sort((a, b) => b[1] - a[1]).slice(0, 4)
          .map(([k, v]) => `${nb(v)} ${esc((UNITES[k] || {}).pl || k)}`).join(", ")}</span>
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
/* ------------------------------------------------------------------ */
/* Groupe : consolidation, sites, indicateurs                          */
/* ------------------------------------------------------------------ */

/* Ce que voit un groupe : des agrégats. Jamais une identité d'une société dont la
   personne n'est pas salariée. Le lien capitalistique donne le droit de recevoir la
   facture, pas celui de lire les dossiers du personnel d'une filiale. */
function vueGroupe(u){
  const gid = u.groupe;
  if (!gid) return h(`<section class="card"><p class="empty">Ce compte n'est rattaché à aucun groupe.</p></section>`);
  const c = DB.consolideGroupe(gid);
  const rang = DB.classementSites({ groupe: gid });
  const ordinal = !!(DB.groupe(gid) || {}).classement_sites;
  const camp = DB.campagnes(gid).filter(x => x.etat === "close")
                 .sort((a, b) => b.debut.localeCompare(a.debut))[0];
  const ind = camp ? DB.indicateursDe({ campagne: camp.id, groupe: gid,
                                        approuvesSeulement: true }) : null;

  const el = h(`<div class="stack" style="--gap:var(--s5)">
    <div class="kpis">
      ${kpi("Salariés mobilisés", nb(c.mobilises),
            `${nb(c.effectif)} salariés dans le périmètre`, "", "kpi--tete grain")}
      ${kpi("Missions validées", nb(c.missions),
            `dont ${nb(c.confirmees)} confirmées par une association`)}
      ${kpi("Points du groupe", nb(c.points),
            `${pct(c.parSalarie, 2)} par salarié, somme des points / somme des effectifs`)}
      ${/* La réduction d'impôt n'existe fiscalement que par société donatrice. En
            faire un chiffre de groupe, même exact, invite à le reprendre tel quel
            dans une liasse. On renvoie donc au détail, société par société. */
        kpi("Sociétés au calcul fiscal complet",
            `${nb(c.societes.filter(x => x.plafondCalculable).length)} / ${nb(c.societes.length)}`,
            "la réduction d'impôt s'apprécie société par société, voir le détail plus bas")}
    </div>

    <section class="card" id="societes">
      <div class="between" style="margin-bottom:var(--s5);align-items:flex-start">
        <div><h3>Sociétés et établissements</h3>
        <p class="muted" style="font-size:var(--t-sm);margin-top:4px">
          Le groupe consolide, il ne fusionne pas. Chaque société garde son SIREN, son
          contrat, son plafond de mécénat et ses salariés, deux sociétés d'un même
          groupe sont deux responsables de traitement distincts.</p></div>
        <div class="row" style="gap:var(--s2)">
          <button class="btn btn--primary btn--sm" id="rapG">Rapport consolidé</button>
          <button class="btn btn--ghost btn--sm" id="csvG">Exporter</button>
        </div>
      </div>
      <div class="tableau"><table class="table"><thead><tr>
        <th>Société / site</th><th>SIREN</th><th style="text-align:right">Effectif</th>
        <th style="text-align:right">Comptes</th><th style="text-align:right">Missions</th>
        <th style="text-align:right">Points</th><th style="text-align:right">Par salarié</th>
      </tr></thead><tbody></tbody></table></div>
    </section>

    <div class="two">
      <section class="card">
        <div class="between" style="align-items:flex-start">
          <div><h3>Entre vos sites</h3>
          <p class="muted" style="font-size:var(--t-sm);margin-top:4px;max-width:52ch">
            Un <strong>challenge d'engagement associatif</strong>, pas une mesure de
            performance RSE d'un site, et sans aucune incidence sur l'évaluation de qui
            que ce soit. Normalisé par l'effectif, sinon le siège écrase l'agence. Compare
            des sites, <strong>jamais des personnes</strong>.</p></div>
        </div>
        <label class="checkline" style="margin-top:var(--s5)">
          <input type="checkbox" id="ordi" ${ordinal ? "checked" : ""}>
          <span>Afficher un classement ordinal entre les sites.
            <span class="muted">Désactivé par défaut : un rang fabrique un dernier. Même
            activé, un site reste hors classement tant qu'il n'a pas
            ${DB.SEUIL_CLASSEMENT.mobilises} salariés mobilisés et
            ${DB.SEUIL_CLASSEMENT.missions} missions validées, en dessous, on mesure le
            hasard des petits nombres et la date de démarrage.</span></span>
        </label>
        <div class="stack" style="--gap:var(--s3);margin-top:var(--s5)" id="rang"></div>
      </section>

      <section class="card">
        <div class="between" style="align-items:flex-start">
          <div><h3>Sécurité et social</h3>
          <p class="muted" style="font-size:var(--t-sm);margin-top:4px">
            ${camp ? esc(camp.libelle) : "aucune période close"}</p></div>
          <a class="btn btn--quiet btn--sm" href="#/indicateurs">Ouvrir</a>
        </div>
        ${ind && ind.sites ? `
        <div class="stack" style="--gap:var(--s3);margin-top:var(--s5);font-size:var(--t-sm)">
          ${INDICATEURS.calcules.filter(d => ["tf1", "tg", "turnover"].includes(d.cle))
            .map(d => `<div class="between"><span class="muted">${esc(d.libelle)}</span>
              <span class="tnum">${ind.calcules[d.cle] === null ? "-"
                : nb2(ind.calcules[d.cle]) + (d.unite ? " " + d.unite : "")}</span></div>`).join("")}
        </div>
        <p class="hint" style="margin-top:var(--s5)">
          Valeurs <strong>approuvées</strong> de ${ind.sites} site${ind.sites > 1 ? "s" : ""} sur
          ${ind.attendus}, soit ${nb(ind.effectifCouvert)} salariés sur ${nb(ind.effectifTotal)}.
          ${ind.complet ? "" : "Le périmètre est incomplet, et c'est écrit tel quel dans le rapport."}
        </p>
        <p class="hint">Indicateurs internes, comparables à eux-mêmes dans le temps et à rien
          d'autre. Rapport de sommes, jamais moyenne de taux. Aucun classement entre sites sur
          la sécurité.</p>
        ` : `<p class="hint" style="margin-top:var(--s5)">Aucune période close pour l'instant.</p>`}
      </section>
    </div>
  </div>`);

  const tb = el.querySelector("tbody");
  c.societes.forEach(soc => {
    tb.appendChild(h(`<tr>
      <td><strong>${esc(soc.nom)}</strong></td>
      <td class="muted" style="font-family:var(--font-mono);font-size:var(--t-xs)">${esc(soc.siren || "-")}</td>
      <td class="tnum" style="text-align:right">${nb(soc.effectif || 0)}</td>
      <td class="tnum" style="text-align:right">${nb(soc.etablissements.reduce((n, x) => n + x.comptes, 0))}</td>
      <td class="tnum" style="text-align:right">${nb(soc.missions)}</td>
      <td class="tnum" style="text-align:right"><strong>${nb(soc.points)}</strong></td>
      <td class="tnum" style="text-align:right">${soc.effectif ? pct(soc.points / soc.effectif, 2) : "-"}</td>
    </tr>`));
    soc.etablissements.forEach(et => {
      tb.appendChild(h(`<tr>
        <td style="padding-left:var(--s6)" class="muted">${esc(et.nom)}, ${esc(et.ville)}</td>
        <td></td>
        <td class="tnum muted" style="text-align:right">${nb(et.effectif || 0)}</td>
        <td class="tnum muted" style="text-align:right">${nb(et.comptes)} / ${nb(et.quota || 0)}</td>
        <td class="tnum muted" style="text-align:right">${nb(et.missions)}</td>
        <td class="tnum muted" style="text-align:right">${nb(et.points)}</td>
        <td class="tnum muted" style="text-align:right">${et.effectif ? pct(et.parSalarie, 2) : "-"}</td>
      </tr>`));
    });
  });

  const box = el.querySelector("#rang");
  const max = Math.max(...rang.map(x => x.parSalarie), 0.01);
  const TON = { lancement:"badge--warn", demarrage:"badge--neutre",
                actif:"badge--info", fort:"badge--ok" };
  rang.forEach(x => box.appendChild(h(`<div>
    <div class="between" style="font-size:var(--t-sm);margin-bottom:6px;gap:var(--s3);flex-wrap:wrap">
      <span>${x.rang ? `<b>${x.rang}.</b> ` : ""}${esc(x.nom)}, ${esc(x.ville)}
        <span class="badge ${TON[x.statut.cle]}" style="margin-left:6px">${esc(x.statut.label)}</span></span>
      <span class="tnum muted">${nb(x.mobilises)} mobilisé${x.mobilises > 1 ? "s" : ""} -
        ${nb(x.missions)} mission${x.missions > 1 ? "s" : ""} -
        ${pct(x.parSalarie, 2)} pts / salarié</span></div>
    <div class="bar"><i style="width:${Math.max(2, (x.parSalarie / max) * 100)}%"></i></div>
    ${x.statut.cle === "lancement" || x.statut.cle === "demarrage"
      ? `<p class="hint" style="margin-top:4px">${esc(x.statut.aide)}</p>` : ""}
  </div>`)));

  el.querySelector("#ordi").onchange = (ev) => {
    try { DB.activerClassementSites(gid, ev.target.checked);
          toast(ev.target.checked
            ? "Classement ordinal activé pour vos sites."
            : "Classement ordinal désactivé : chaque site garde son statut.");
          rendre(); }
    catch (e){ toast(e.message); }
  };

  el.querySelector("#rapG").onclick = () => ouvrirRapportGroupe(u);
  el.querySelector("#csvG").onclick = () => {
    versCSV("riseva-groupe.csv",
      ["Société", "SIREN", "Établissement", "Ville", "Effectif", "Comptes", "Quota",
       "Missions", "Confirmées", "Points", "Points par salarié"],
      c.societes.flatMap(soc => soc.etablissements.map(et =>
        [soc.nom, soc.siren || "", et.nom, et.ville, et.effectif, et.comptes, et.quota,
         et.missions, et.confirmees, et.points, Math.round(et.parSalarie * 100) / 100])));
    toast("Export téléchargé.");
  };
  return el;
}

const nb2 = (v) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(v);

/* La feuille de style des documents imprimables, écrite une fois. */
const STYLE_DOC = `
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
  td.v{font-variant-numeric:tabular-nums;font-weight:600;color:#131510;text-align:right}
  td.m{color:#63675C;font-size:12.5px}
  .note{background:#DFE6D0;border-radius:8px;padding:14px;font-size:12.5px;margin-top:14px}
  .alerte{background:#F6EAD5}
  .manque{color:#8A6A2F}
  .pied{margin-top:28px;font-size:11.5px;color:#8A8F82;line-height:1.55}
  @media print{body{background:#fff;padding:0}.p{box-shadow:none;padding:0;background:#fff}
    .noprint{display:none}h2{page-break-after:avoid}tr{break-inside:avoid}}
  .noprint{text-align:center;margin-bottom:20px}
  .noprint button{font:inherit;background:#131510;color:#F2F0E9;border:0;border-radius:12px;
    padding:11px 22px;cursor:pointer}`;

function ouvrirDoc(titre, corps){
  const w = window.open("", "_blank");
  if (!w){ toast("Autorisez les fenêtres pour ouvrir le document."); return null; }
  w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<title>${titre}</title><style>${STYLE_DOC}</style></head><body>
<div class="noprint"><button onclick="window.print()">Imprimer ou enregistrer en PDF</button></div>
<div class="p">${corps}</div></body></html>`);
  w.document.close();
  return w;
}

/* Le rapport de groupe. Il assemble ce que Riseva sait déjà — les missions, le
   mécénat société par société — et ce que les sites ont déclaré — les indicateurs
   sociaux et de sécurité. Chaque ligne porte sa provenance et son état, et le
   périmètre est écrit en haut : combien de sites ont répondu, et lesquels n'ont
   rien dit. Un rapport qui tait ses trous ne vaut rien. */
function ouvrirRapportGroupe(u){
  const gid = u.groupe;
  const c = DB.consolideGroupe(gid);
  const camps = DB.campagnes(gid).slice().sort((a, b) => b.debut.localeCompare(a.debut));
  const camp = camps.find(x => x.etat === "close") || camps[0];
  const e = camp ? DB.etatCampagne(camp.id) : null;
  const ind = camp ? DB.indicateursDe({ campagne: camp.id, groupe: gid,
                                        approuvesSeulement: true }) : null;
  const sa = DB.saison();
  const missions = c.societes.flatMap(soc =>
    DB.missions({ entreprise: soc.id }).filter(m => ["validee", "validee_auto"].includes(m.etat)));
  const ETIQ = { attendu:"attendu", declare:"déclaré, non approuvé",
                 approuve:"approuvé", clos_sans_reponse:"clos sans réponse" };

  const l = (cle, valeur, methode) =>
    `<tr><td>${cle}</td><td class="v">${valeur}</td><td class="m">${methode}</td></tr>`;

  const corps = `
  <h1>Rapport consolidé, ${esc(c.groupe.nom)}</h1>
  <p class="st">${esc(sa.nom)}, arrêté au ${dateFR(new Date().toISOString())}
    , empreinte ${empreinte(missions)}</p>
  <div class="note alerte">
    <strong>Ce document n'est pas un rapport d'audit.</strong> Il rassemble des données
    <strong>déclarées</strong>, par les salariés, par les associations, par les sites, que
    Riseva horodate, recoupe et met en forme, mais <strong>n'audite pas</strong>. Le périmètre
    de consolidation est celui du groupe : il n'a pas d'existence fiscale, et les réductions
    d'impôt ci-dessous sont calculées <strong>société par société</strong>, jamais sur un
    total de groupe.
  </div>

  <h2>1. Périmètre</h2>
  <table><tbody>
    ${l("Sociétés consolidées", nb(c.societes.length),
        c.societes.map(x => x.nom + (x.siren ? ` (SIREN ${x.siren})` : "")).join(", "))}
    ${l("Établissements", nb(c.sites.length), "Sites opérationnels raccordés à la plateforme.")}
    ${l("Effectif du périmètre", nb(c.effectif),
        "Somme des effectifs déclarés par société. Sert de dénominateur, jamais de résultat.")}
    ${l("Comptes ouverts", nb(c.sites.reduce((n, x) => n + x.comptes, 0)),
        "Un compte occupe une place du contrat ; un salarié retiré rend la sienne à son site.")}
  </tbody></table>

  <h2>2. Engagement, par site</h2>
  <table>
    <thead><tr><th>Société / site</th><th>Effectif</th><th>Missions</th>
      <th>dont confirmées</th><th>Points</th><th>Points / salarié</th></tr></thead>
    <tbody>
      ${c.societes.map(soc => `
        <tr><td colspan="6"><strong>${esc(soc.nom)}</strong></td></tr>
        ${soc.etablissements.map(x => `<tr>
          <td class="m" style="padding-left:18px">${esc(x.nom)}, ${esc(x.ville)}</td>
          <td class="v">${nb(x.effectif)}</td>
          <td class="v">${nb(x.missions)}</td>
          <td class="v">${nb(x.confirmees)}</td>
          <td class="v">${nb(x.points)}</td>
          <td class="v">${x.effectif ? nb2(Math.round(x.parSalarie * 100) / 100) : "-"}</td>
        </tr>`).join("")}`).join("")}
      <tr><td><strong>Consolidé</strong></td>
        <td class="v">${nb(c.effectif)}</td>
        <td class="v">${nb(c.missions)}</td>
        <td class="v">${nb(c.confirmees)}</td>
        <td class="v">${nb(c.points)}</td>
        <td class="v">${nb2(Math.round(c.parSalarie * 100) / 100)}</td></tr>
    </tbody>
  </table>
  <div class="note">
    Le consolidé est un <strong>rapport de sommes</strong> : total des points divisé par total
    des effectifs. Ce n'est pas la moyenne des ratios des sites, et l'écart entre les deux est
    réel. Les ${nb(c.missions - c.confirmees)} mission${c.missions - c.confirmees > 1 ? "s" : ""}
    non confirmée${c.missions - c.confirmees > 1 ? "s" : ""} ${c.missions - c.confirmees > 1 ? "ont" : "a"}
    été clôturée${c.missions - c.confirmees > 1 ? "s" : ""} automatiquement sans réponse de
    l'association : les points sont crédités selon le barème, le résultat reste estimé.
  </div>

  <h2>3. Fiscalité, société par société</h2>
  <table>
    <thead><tr><th>Société</th><th>Assiette connue de Riseva</th><th>Réduction estimée</th></tr></thead>
    <tbody>
      ${c.societes.map(soc => `<tr>
        <td>${esc(soc.nom)}</td>
        <td class="v">${eur(soc.assiette)}</td>
        <td class="v">${soc.plafondCalculable ? eur(soc.reduction)
          : `<span class="manque">non calculée</span>`}</td>
      </tr>`).join("")}
    </tbody>
  </table>
  <div class="note ${c.reduction === null ? "alerte" : ""}">
    <strong>Une réduction d'impôt n'existe que par société donatrice.</strong> Le groupe n'est
    pas un redevable : il ne dispose d'aucun plafond propre et ne déclare rien.
    ${c.reduction === null
      ? `Aucun total n'est donné ici : au moins une société n'a pas renseigné son chiffre
         d'affaires, ses dons faits hors Riseva ou ses reports antérieurs. Le plafond de
         20 000 € ou 5  pour mille porte sur <strong>tous</strong> les versements de l'exercice, pas
         seulement sur ceux que Riseva connaît. Additionner des estimations non plafonnées
         produirait un chiffre faux, et c'est celui qui finirait dans une liasse.`
      : `Le total de ${eur(c.reduction)} n'est donné qu'à titre <strong>informatif</strong> :
         c'est la somme de réductions plafonnées séparément, sur le périmètre connu de Riseva.
         Estimation, non déclaration : chaque société l'arrête avec son expert-comptable.`}
  </div>

  <h2>4. Indicateurs sociaux et sécurité</h2>
  ${!ind ? `<p class="m">Aucune campagne de collecte.</p>` : `
  <p class="st">${esc(camp.libelle)}, valeurs <strong>approuvées</strong> de
     ${ind.sites} site${ind.sites > 1 ? "s" : ""} sur ${ind.attendus}, soit
     ${nb(ind.effectifCouvert)} salariés sur ${nb(ind.effectifTotal)}
     (${nb2(Math.round(ind.partEffectif * 1000) / 10)} % de l'effectif du périmètre).
     Les saisies non approuvées ne figurent pas dans ce document.</p>
  <table>
    <thead><tr><th>Indicateur</th><th>Valeur</th><th>Méthode</th></tr></thead>
    <tbody>
      ${/* `|| 0` imprimait « 0 » pour une valeur que personne n'avait declaree.
            Dans un rapport remis a un client, zero et « non renseigne » sont
            deux affirmations differentes, et l'une des deux est fausse. */""}
      ${INDICATEURS.saisis.map(d => l(d.libelle,
          ind.somme[d.cle] === null || ind.somme[d.cle] === undefined
            ? `<span class="manque">non renseigné</span>`
            : nb(ind.somme[d.cle]),
          ind.somme[d.cle] === null || ind.somme[d.cle] === undefined
            ? "Aucun site n'a renseigné cette valeur pour la période."
            : `Somme des valeurs déclarées par ${nb(ind.sitesParCle[d.cle])} site`
              + `${ind.sitesParCle[d.cle] > 1 ? "s" : ""} sur ${nb(ind.sites)} ayant répondu.`
          )).join("")}
      ${INDICATEURS.calcules.map(d => l(d.libelle,
          ind.calcules[d.cle] === null ? `<span class="manque">non calculé</span>`
            : nb2(ind.calcules[d.cle]) + (d.unite ? " " + d.unite : ""),
          d.formule + ", rapport de sommes sur le périmètre, jamais moyenne des taux."
            + (d.note ? " " + d.note : ""))).join("")}
    </tbody>
  </table>
  <h2>5. Qui a déclaré quoi</h2>
  <table>
    <thead><tr><th>Établissement</th><th>État</th><th>Saisi par</th><th>Approuvé par</th></tr></thead>
    <tbody>
      ${e.sites.map(x => `<tr>
        <td>${esc(x.etablissement.nom)}, ${esc(x.etablissement.ville)}</td>
        <td class="m ${x.etat === "clos_sans_reponse" || x.etat === "attendu" ? "manque" : ""}">${ETIQ[x.etat]}</td>
        <td class="m">${x.saisiPar ? esc(x.saisiPar.nom) : "-"}</td>
        <td class="m">${x.approuvePar ? esc(x.approuvePar.nom) : "-"}</td>
      </tr>`).join("")}
    </tbody>
  </table>
  ${ind.sites < ind.attendus ? `<div class="note alerte">
    ${nb(ind.attendus - ind.sites)} site${ind.attendus - ind.sites > 1 ? "s n'ont" : " n'a"} pas de
    valeur approuvée pour cette période, soit
    ${nb(ind.effectifTotal - ind.effectifCouvert)} salariés sur ${nb(ind.effectifTotal)}. Les taux
    ci-dessus ne portent donc <strong>pas</strong> sur l'ensemble du périmètre :
    ${nb(ind.sites)} site${ind.sites > 1 ? "s" : ""} sur ${nb(ind.attendus)}, ce n'est pas la même
    chose que ${pct(ind.effectifTotal ? ind.effectifCouvert / ind.effectifTotal * 100 : 0)} % de
    l'effectif. Nous ne comblons pas les trous avec la période précédente : un chiffre absent
    reste absent.
  </div>` : ""}
  <div class="note">
    ${INDICATEURS_LIMITES.map(x => `${esc(x)}<br>`).join("")}
  </div>`}

  <p class="pied">
    Le score mesure un engagement, pas un impact environnemental ou social, et ne doit pas être
    présenté comme tel. Données déclarées, non auditées par Riseva. Les règles de calcul sont
    publiques sur riseva.fr/reglement.html. L'empreinte en tête identifie le jeu d'opérations
    arrêté : deux éditions qui portent la même empreinte contiennent les mêmes faits.
  </p>`;

  ouvrirDoc(`Rapport consolidé, ${esc(c.groupe.nom)}`, corps);
  toast("Rapport de groupe ouvert dans un nouvel onglet.");
}

/* Allocation des quotas et liens de référent. Deux liens et pas un : le groupe
   nomme un référent par site, le référent invite ses salariés. */
function vueSites(u){
  const societes = u.groupe ? DB.societes(u.groupe) : [DB.entreprise(u.org)].filter(Boolean);
  const el = h(`<div class="stack" style="--gap:var(--s5)">
    <section class="card card--flat" style="background:var(--paper-sunk);border-color:transparent">
      <h3 style="font-size:var(--t-lg)">Deux liens, jamais un seul</h3>
      <p class="muted" style="font-size:var(--t-sm);margin-top:var(--s3);max-width:76ch">
        Vous allouez un quota de comptes à un site, puis vous envoyez un lien
        <strong>nominatif</strong> à la personne qui pilotera ce site. C'est elle, ensuite,
        qui produit le lien d'inscription de ses salariés, dans la limite de son quota,
        et sans jamais pouvoir dépasser. Un lien de salarié ne confère jamais de droit
        d'administration : c'est ce qui fait qu'un lien qui fuite reste sans conséquence.
      </p>
    </section>
    <div id="soc" class="stack" style="--gap:var(--s5)"></div>
  </div>`);

  const box = el.querySelector("#soc");
  societes.forEach(soc => {
    const q = DB.quotaDisponible(soc.id);
    const ouverts = DB.sieges(soc.id).pris;
    /* « 0 libres » alors que deux cent quarante-huit comptes peuvent encore être
       créés dans les quotas déjà alloués : c'est le genre de chiffre qui fait
       rappeler un client pour rien. Cinq compteurs, et chacun dit ce qu'il est. */
    const bloc = h(`<section class="card">
      <div class="between" style="margin-bottom:var(--s5);align-items:flex-start;flex-wrap:wrap;gap:var(--s4)">
        <div><h3>${esc(soc.nom)}</h3>
        <p class="muted" style="font-size:var(--t-sm);margin-top:4px">
          SIREN ${esc(soc.siren || "non renseigné")}</p></div>
        <button class="btn btn--quiet btn--sm" data-site="${esc(soc.id)}">Déclarer un site</button>
      </div>
      <div class="kpis" style="margin-bottom:var(--s6)">
        ${kpi("Capacité achetée", nb(q.total), "places du contrat de cette société", "", "kpi--tete grain")}
        ${kpi("Réparties en quotas", nb(q.alloue),
              q.libre > 0 ? `${nb(q.libre)} encore à répartir` : "tout est réparti")}
        ${kpi("Comptes ouverts", nb(ouverts), "personnes réellement inscrites")}
        ${kpi("Encore activables", nb(Math.max(0, q.alloue - ouverts)),
              "dans les quotas déjà répartis, sans rien réallouer")}
      </div>
      <div class="tableau"><table class="table"><thead><tr>
        <th>Établissement</th><th>SIRET</th><th style="text-align:right">Effectif</th>
        <th style="text-align:right">Comptes</th><th style="text-align:right">Quota</th>
        <th>Référent</th><th></th>
      </tr></thead><tbody></tbody></table></div>
    </section>`);
    const tb = bloc.querySelector("tbody");
    const etabs = DB.etablissements(soc.id);
    if (!etabs.length){
      /* Le premier jour d'un client, cette ligne est tout ce qu'il voit de ses
         sites. « Aucun établissement déclaré » sans un geste possible le laisse
         chercher un bouton qui n'existe nulle part ailleurs. */
      const tr = h(`<tr><td colspan="7">
        <div class="stack" style="--gap:var(--s3);max-width:64ch">
          <strong>Aucun site déclaré pour l'instant</strong>
          <span class="muted" style="font-size:var(--t-sm)">
            Déclarez au moins un site, même si vous n'avez qu'une adresse : c'est lui
            qui reçoit les quotas de comptes, qui répond aux collectes d'indicateurs,
            et à qui les besoins des associations sont rapportés en fonction de sa
            ville.</span>
          <span><button class="btn btn--primary btn--sm" data-site="${esc(soc.id)}">Déclarer mon premier site</button></span>
        </div></td></tr>`);
      tb.appendChild(tr);
    }
    etabs.forEach(et => {
      const si = DB.sieges(soc.id, { etablissement: et.id });
      const tr = h(`<tr>
        <td><strong>${esc(et.nom)}</strong><br>
          <span class="muted" style="font-size:var(--t-xs)">${esc(et.ville)}</span></td>
        <td class="muted" style="font-family:var(--font-mono);font-size:var(--t-xs)">${esc(et.siret || "-")}</td>
        <td class="tnum" style="text-align:right">${nb(et.effectif || 0)}</td>
        <td class="tnum" style="text-align:right">${nb(si.pris)}</td>
        <td style="text-align:right;width:110px">
          <input class="input" type="number" min="0" value="${et.quota || 0}"
            aria-label="Quota de comptes pour ${esc(et.nom)} ${esc(et.ville)}"
            style="height:34px;text-align:right"></td>
        <td class="muted">${et.referent ? esc(et.referent) : `<span class="badge badge--warn">à nommer</span>`}</td>
        <td style="text-align:right"></td>
      </tr>`);
      const q2 = h(`<button class="btn btn--quiet btn--sm">Enregistrer</button>`);
      q2.onclick = () => {
        try {
          DB.allouerQuota(et.id, tr.querySelector("input").value);
          toast(`Quota de ${et.nom} ${et.ville} mis à jour.`); rendre();
        } catch (e){ toast(e.message); }
      };
      const lien = h(`<button class="btn btn--quiet btn--sm">${et.referent ? "Remplacer le référent" : "Nommer un référent"}</button>`);
      lien.onclick = () => formReferent(et);
      const corr = h(`<button class="btn btn--ghost btn--sm">Corriger</button>`);
      corr.onclick = () => formSite(soc, et);
      const cell = tr.querySelector("td:last-child");
      cell.append(q2, lien, corr);
      cell.style.whiteSpace = "nowrap";
      tb.appendChild(tr);
    });
    bloc.querySelectorAll("[data-site]").forEach(b =>
      b.addEventListener("click", () => formSite(soc)));
    box.appendChild(bloc);
  });
  return el;
}

/* Declarer ou corriger un site. Quatre champs, dont deux facultatifs : plus long,
   personne ne le remplit le jour de l'inscription, et un site jamais declare est
   une collecte qui n'a personne a qui demander. */
function formSite(soc, et = null){
  const restant = (() => {
    const e = DB.entreprise(soc.id) || {};
    if (!e.effectif) return null;
    const places = DB.etablissements(soc.id)
      .reduce((t, x) => t + (x.id === (et && et.id) ? 0 : (x.effectif || 0)), 0);
    return Math.max(0, e.effectif - places);
  })();
  const corps = h(`<div class="stack" style="--gap:var(--s4)">
    <div class="row" style="gap:var(--s4);align-items:stretch">
      <div class="field" style="flex:1"><label for="st-nom">Nom du site</label>
        <input class="input" id="st-nom" value="${esc(et ? et.nom : "")}"
          placeholder="Siège, Usine, Agence"></div>
      <div class="field" style="flex:1"><label for="st-ville">Ville</label>
        <input class="input" id="st-ville" value="${esc(et ? et.ville : "")}"
          placeholder="Nantes"></div>
    </div>
    <div class="row" style="gap:var(--s4);align-items:stretch">
      <div class="field" style="flex:1"><label for="st-eff">Effectif du site</label>
        <input class="input" id="st-eff" type="number" min="0" step="1"
          value="${et ? (et.effectif || 0) : ""}" placeholder="0">
        ${restant === null ? "" : `<p class="hint">Il vous reste ${nb(restant)} salariés à
          répartir sur vos sites, sur l'effectif déclaré par votre société.</p>`}</div>
      <div class="field" style="flex:1"><label for="st-siret">SIRET, si vous l'avez</label>
        <input class="input" id="st-siret" value="${esc(et && et.siret ? et.siret : "")}"
          placeholder="14 chiffres" inputmode="numeric">
        <p class="hint">Facultatif. Il sert à retrouver le site dans les registres publics
          quand vous répondez à un appel d'offres.</p></div>
    </div>
    <div class="field"><label for="st-adr">Adresse</label>
      <input class="input" id="st-adr" value="${esc(et && et.adresse ? et.adresse : "")}"
        placeholder="Facultatif">
      <p class="hint">Elle sert à mesurer ce qu'un salarié de ce site peut réellement aller
        faire : une usine à vingt kilomètres d'une ville n'a pas les mêmes besoins autour
        d'elle que le siège.</p></div>
  </div>`);
  const lire = () => ({
    nom: corps.querySelector("#st-nom").value,
    ville: corps.querySelector("#st-ville").value,
    effectif: corps.querySelector("#st-eff").value,
    siret: corps.querySelector("#st-siret").value,
    adresse: corps.querySelector("#st-adr").value
  });
  modal(et ? `Corriger ${et.nom}, ${et.ville}` : "Déclarer un site", corps, [
    { label: "Annuler", classe: "btn--ghost" },
    { label: et ? "Enregistrer" : "Déclarer ce site", classe: "btn--primary", onClick: () => {
        try {
          if (et) DB.modifierEtablissement(et.id, lire());
          else DB.ajouterEtablissement({ societe: soc.id, ...lire() });
          toast(et ? "Site mis à jour." : "Site déclaré. Nommez-y un référent pour qu'il invite ses salariés.");
          rendre();
        } catch (e){ toast(e.message); return false; }
      } }
  ]);
}

function formReferent(et){
  const corps = h(`<div class="stack" style="--gap:var(--s4)">
    <p class="muted" style="font-size:var(--t-sm)">
      Le lien est <strong style="color:var(--ink)">nominatif</strong> : il porte le nom et
      l'adresse de la personne visée, il expire dans trente jours, et il n'ouvre qu'un
      seul compte. Il donne à cette personne les droits sur
      <strong style="color:var(--ink)">${esc(et.nom)}, ${esc(et.ville)}</strong>, et sur rien d'autre.
    </p>
    <div class="field"><label for="rf-nom">Prénom et nom</label>
      <input class="input" id="rf-nom" value="${esc(et.referent || "")}"></div>
    <div class="field"><label for="rf-mail">Adresse professionnelle</label>
      <input class="input" id="rf-mail" type="email" value="${esc(et.referent_mail || "")}"></div>
    <div id="rf-out"></div>
  </div>`);
  modal(`Référent de ${et.nom}, ${et.ville}`, corps, [
    { label: "Annuler", classe: "btn--ghost" },
    { label: "Créer le lien", classe: "btn--primary", onClick: () => {
        try {
          const inv = DB.creerInvitationReferent(et.id,
            corps.querySelector("#rf-nom").value.trim(),
            corps.querySelector("#rf-mail").value.trim());
          const url = lienPublic(`/rejoindre.html?code=${inv.code}&role=referent`);
          corps.querySelector("#rf-out").innerHTML =
            `<p class="hint" style="margin-bottom:6px">À envoyer à cette personne, et à elle seule :</p>
             <div class="copyline"><input class="input" readonly aria-label="Lien du référent" value="${esc(url)}"></div>
             <p class="hint" style="margin-top:6px">Expire le ${dateFR(inv.expire_le)}.</p>`;
          toast("Lien de référent créé.");
        } catch (e){ toast(e.message); }
        /* La fenêtre reste ouverte : le lien qu'elle vient d'afficher est la
           seule raison de l'avoir ouverte, et il ne se réaffiche pas. */
        return false;
      } }
  ]);
}

/* La collecte des indicateurs. Le contributeur saisit, l'approbateur verrouille :
   sans ces deux gestes, un chiffre entre dans un document contractuel sans que
   personne ne l'ait regardé. */
/* ------------------------------------------------------------------ */
/* Le rapport de collecte                                              */
/* ------------------------------------------------------------------ */
/* Ce que remplace ce bloc : un fichier de relance, quatorze tableurs reçus par
   courriel, une nuit de copier-coller, et la question « est-ce qu'il manque
   quelqu'un ? » à laquelle personne ne sait répondre avant d'avoir tout ouvert.

   Ce qu'il n'est pas : une déclaration, une certification, un avis. Les valeurs
   sont celles que les sites ont écrites ; Riseva les additionne et les rend, en
   disant sur combien de sites chaque somme porte. La responsabilité de la valeur
   reste chez celui qui la saisit — exactement comme dans le tableur qu'il
   remplissait avant. C'est cette limite qui rend le service utilisable sans
   engager qui que ce soit.

   Trois sorties, parce que trois habitudes : l'écran pour regarder, le classeur
   pour retravailler, le CSV pour verser dans un autre outil. Aucune n'est
   supérieure aux autres, et aucune ne passe par le réseau : tout est fabriqué
   dans l'onglet de celui qui clique. */
function blocRapport(r){
  if (!r) return "";
  const manquants = r.sections.flatMap(s => s.manquants);
  return `<section class="card" id="rapc">
    <div class="between" style="flex-wrap:wrap;gap:var(--s4);align-items:flex-start">
      <div style="max-width:56ch">
        <h3>Rapport de collecte</h3>
        <p class="muted" style="font-size:var(--t-sm);margin-top:4px">
          ${r.complete
            ? `<strong style="color:var(--ink)">Les ${nb(r.sites)} sites ont répondu.</strong>
               Le rapport porte sur l'ensemble du périmètre : les totaux sont des totaux,
               et les taux sont calculés sur toutes les sommes.`
            : `<strong style="color:var(--ink)">${nb(r.repondus)} site${r.repondus > 1 ? "s" : ""}
               sur ${nb(r.sites)} ${r.repondus > 1 ? "ont" : "a"} répondu.</strong>
               Les totaux ci-dessous portent sur eux seuls. Un taux dont les deux termes ne
               sont pas complets n'est pas affiché : un taux calculé sur trois sites sur
               quatre est un taux faux qui a l'air juste.`}</p>
      </div>
      <div class="row" style="--gap:var(--s3);flex-wrap:wrap">
        <button class="btn btn--ghost btn--sm" id="docR">Ouvrir le rapport</button>
        <button class="btn btn--ghost btn--sm" id="csvR">CSV</button>
        <button class="btn btn--primary btn--sm" id="xlsR">Télécharger le classeur</button>
      </div>
    </div>
    <hr class="sep">
    <div class="stack" style="--gap:var(--s6)">
      ${r.sections.map(s => `<div>
        <div class="between" style="align-items:baseline">
          <h4 style="font-size:var(--t-md);margin:0">${esc(s.libelle)}</h4>
          <span class="muted" style="font-size:var(--t-xs)">${esc(s.aide)}</span>
        </div>
        <div class="tableau"><table class="table" style="margin-top:var(--s3)"><thead><tr>
          <th>Indicateur</th>
          <th style="text-align:right">Total du périmètre</th>
          <th style="text-align:right">Sites renseignés</th>
        </tr></thead><tbody>
          ${s.champs.map(d => {
            const tt = s.totaux[d.cle];
            return `<tr>
              <td>${esc(d.libelle)}${d.unite ? ` <span class="muted">(${esc(d.unite)})</span>` : ""}</td>
              <td class="tnum" style="text-align:right">${tt.somme === null
                ? `<span class="muted">non disponible</span>` : nb(Math.round(tt.somme * 100) / 100)}</td>
              <td class="tnum ${tt.sites < r.repondus ? "" : "muted"}" style="text-align:right">${
                nb(tt.sites)} / ${nb(r.repondus)}</td>
            </tr>`;
          }).join("")}
        </tbody></table></div>
      </div>`).join("")}

      ${r.ratios.length ? `<div>
        <h4 style="font-size:var(--t-md);margin:0">Ce que ça donne</h4>
        <p class="muted" style="font-size:var(--t-xs);margin-top:2px">
          Rapport de sommes, jamais moyenne de taux.</p>
        <div class="tableau"><table class="table" style="margin-top:var(--s3)"><thead><tr>
          <th>Indicateur</th><th style="text-align:right">Valeur</th><th>Assise</th>
        </tr></thead><tbody>
          ${r.ratios.map(x => `<tr>
            <td>${esc(x.libelle)}<br><span class="muted" style="font-size:var(--t-xs)">${esc(x.formule)}</span></td>
            <td class="tnum" style="text-align:right">${x.valeur === null
              ? `<span class="muted">non disponible</span>`
              : nb2(x.valeur) + (x.unite ? " " + esc(x.unite) : "")}</td>
            <td class="muted" style="font-size:var(--t-xs)">${x.surTousLesSites
              ? "tous les sites ayant répondu"
              : "périmètre partiel, à lire avec précaution"}</td>
          </tr>`).join("")}
        </tbody></table></div>
      </div>` : ""}

      ${manquants.length ? `<div class="card card--flat"
        style="background:var(--warn-bg);border-color:transparent">
        <p style="font-size:var(--t-sm);color:var(--ink-600)">
          <strong style="color:var(--ink)">${nb(manquants.length)} valeur${manquants.length > 1 ? "s" : ""}
          laissée${manquants.length > 1 ? "s" : ""} vide${manquants.length > 1 ? "s" : ""}</strong>
          par un site qui a pourtant répondu. Elles restent vides : Riseva n'écrit jamais
          zéro à la place de « je ne sais pas », parce que les deux ne se distinguent plus
          ensuite.</p>
        <ul class="stack" style="--gap:var(--s2);margin-top:var(--s3);font-size:var(--t-sm);
          list-style:none;color:var(--ink-600)">
          ${manquants.slice(0, 8).map(m => `<li>${esc(m.site)} : ${esc(m.libelle)}</li>`).join("")}
          ${manquants.length > 8 ? `<li class="muted">et ${nb(manquants.length - 8)} autres, dans le classeur.</li>` : ""}
        </ul>
      </div>` : ""}
    </div>
  </section>`;
}

/* Le coffre de preuves, dans la ligne d'un site.
   ------------------------------------------------
   Ce que cette cellule doit permettre en un geste : deposer la facture qui
   justifie le chiffre, et la retelecharger un an plus tard. Rien d'autre.
   Le siege ne lit pas les factures de ses sites, il verifie qu'elles existent :
   c'est pour cela que la cellule affiche un compte avant d'afficher une liste.

   Deux comportements, un seul code. En demonstration, le fichier est garde en
   base 64 dans l'etat du navigateur quand il tient sous quatre cents kilo-octets,
   et la piece le dit quand il n'a pas ete garde. En production, le fichier monte
   dans le stockage objet et c'est un lien signe qui le redescend. Ce qui ne
   change pas : la regle de retrait, ecrite une fois dans le moteur et une fois
   dans la base, jamais dans cet ecran. */
function coffre(cellule, x, u, rendre){
  const dessiner = () => {
    cellule.innerHTML = "";
    let liste = [];
    try { liste = DB.piecesDe("observation", x.observation.id) || []; } catch { liste = []; }

    const rang = h(`<div class="row" style="--gap:6px;flex-wrap:wrap;align-items:center"></div>`);
    if (liste.length){
      const det = h(`<details style="min-width:0">
        <summary style="cursor:pointer;font-size:var(--t-xs)">
          ${liste.length} pièce${liste.length > 1 ? "s" : ""}</summary>
        <ul class="pieces"></ul></details>`);
      const ul = det.querySelector("ul");
      liste.forEach(p => {
        const li = h(`<li>
          <span class="pj-n">${esc(p.nom)}</span>
          <span class="pj-m mono">${esc(p.format)}, ${Math.max(1, Math.round(p.taille / 1024))} Ko,
            déposée par ${esc(p.deposant)}</span>
        </li>`);
        if (p.conserve === false)
          li.appendChild(h(`<span class="pj-m mono">fichier non conservé en démonstration</span>`));
        else {
          const a = h(`<button class="tlink" type="button">Télécharger</button>`);
          a.onclick = () => telechargerPiece(p);
          li.appendChild(a);
        }
        if (x.etat !== "approuve"){
          const r = h(`<button class="tlink" type="button" style="margin-left:10px">Retirer</button>`);
          r.onclick = () => {
            try { DB.retirerPiece(p.id, u.id); toast("Pièce retirée."); dessiner(); }
            catch (err){ toast(err.message); }
          };
          li.appendChild(r);
        }
        ul.appendChild(li);
      });
      rang.appendChild(det);
    } else {
      rang.appendChild(h(`<span class="muted" style="font-size:var(--t-xs)">aucune</span>`));
    }

    /* Le depot reste ouvert apres l'approbation : on ajoute une preuve a un
       chiffre verrouille, on ne la retire pas. C'est l'inverse qui serait
       dangereux. */
    const champ = h(`<input type="file" hidden
      accept=".pdf,.jpg,.jpeg,.png,.webp,.csv,.xlsx,.docx">`);
    const b = h(`<button class="btn btn--quiet btn--sm" type="button">Joindre</button>`);
    b.onclick = () => champ.click();
    champ.onchange = async () => {
      const f = champ.files && champ.files[0];
      if (!f) return;
      b.disabled = true;
      try {
        if (DB.mode === "supabase"){
          await DB.joindrePiece({ objet: "observation", cible: x.observation.id, fichier: f });
        } else {
          const contenu = f.size <= (DB.TAILLE_PIECE_GARDEE || 409600)
            ? await lireEnBase64(f) : null;
          DB.joindrePiece({ objet: "observation", cible: x.observation.id,
                            nom: f.name, type: f.type, taille: f.size, contenu, uid: u.id });
        }
        toast("Pièce jointe au chiffre.");
        dessiner();
      } catch (err){ toast(err.message); }
      finally { b.disabled = false; champ.value = ""; }
    };
    rang.appendChild(b);
    rang.appendChild(champ);
    cellule.appendChild(rang);
  };
  dessiner();
}

function lireEnBase64(fichier){
  return new Promise((ok, ko) => {
    const l = new FileReader();
    l.onload = () => ok(l.result);
    l.onerror = () => ko(new Error("Fichier illisible."));
    l.readAsDataURL(fichier);
  });
}

function telechargerPiece(p){
  /* En production la piece porte un chemin de stockage, pas son contenu : c'est
     un lien signe, valable quelques minutes, qui la redescend. En demonstration
     elle porte son contenu en base 64. */
  if (p.contenu){
    const a = document.createElement("a");
    a.href = p.contenu; a.download = p.nom;
    document.body.appendChild(a); a.click(); a.remove();
    return;
  }
  if (DB.mode === "supabase" && p.chemin){
    DB.lienPiece(p.chemin).then(url => {
      if (!url) return toast("Lien indisponible.");
      const a = document.createElement("a");
      a.href = url; a.target = "_blank"; a.rel = "noopener";
      document.body.appendChild(a); a.click(); a.remove();
    }).catch(e => toast(e.message));
    return;
  }
  toast("Ce fichier n'a pas été conservé.");
}

function vueIndicateurs(u){
  const gid = u.groupe || null;
  const cs = DB.campagnes(gid || undefined)
    .slice().sort((a, b) => b.debut.localeCompare(a.debut));
  /* Le premier jour. Un ecran qui dit « Aucune campagne » et s'arrete la
     renvoie le responsable RSE chercher le bouton ailleurs : il n'existe nulle
     part ailleurs. Un etat vide nomme ce qui manque, dit ce que ca declenche,
     et porte le seul geste possible. */
  if (!cs.length){
    const v = h(`<section class="card">
      <div class="stack" style="--gap:var(--s4);max-width:62ch">
        <h3>Aucune collecte ouverte pour le moment</h3>
        <p class="muted" style="font-size:var(--t-sm)">
          Une collecte demande à chaque établissement les chiffres d'une période :
          effectifs, accidents, heures de formation, kilowattheures. Vous choisissez
          les rubriques et la date limite, Riseva prévient les sites concernés sur
          leur écran et relance ceux qui n'ont pas répondu. Vous n'avez personne à
          rappeler.</p>
        <p class="muted" style="font-size:var(--t-sm)">
          Tant qu'aucun site n'a répondu, rien ne s'affiche ici. Riseva n'invente pas
          de valeur de départ et n'écrit jamais zéro à la place d'une case restée
          vide.</p>
        ${u.role === "site_referent" ? `<p class="muted" style="font-size:var(--t-sm)">
          C'est le siège qui ouvre une collecte. Vous serez prévenu sur cet écran dès
          qu'une période vous sera demandée.</p>`
          : `<div><button class="btn btn--primary" id="c1">Ouvrir la première collecte</button></div>`}
      </div>
    </section>`);
    v.querySelector("#c1")?.addEventListener("click", () => formCampagne(u, gid, null));
    return v;
  }
  const choisie = sessionStorage.getItem("riseva.campagne") || cs[0].id;
  const cid = cs.some(c => c.id === choisie) ? choisie : cs[0].id;
  const e = DB.etatCampagne(cid);
  /* Deux lectures du même jeu : ce qui est publiable, et ce qui est en cours.
     Les mélanger revient à faire entrer dans un rapport un chiffre que personne
     n'a relu. */
  const portee = { campagne: cid, groupe: gid || undefined, societe: gid ? undefined : u.org };
  const ind = DB.indicateursDe({ ...portee, approuvesSeulement: true });
  const brouillon = DB.indicateursDe(portee);
  const monSite = u.role === "site_referent" ? u.etablissement : null;
  const rap = DB.rapportCollecte(cid);
  const ETIQ = { attendu:["À saisir", "badge--warn"], declare:["Soumis", "badge--info"],
                 approuve:["Approuvé", "badge--ok"], clos_sans_reponse:["Clos sans réponse", "badge--neutre"] };

  const el = h(`<div class="stack" style="--gap:var(--s5)">
    <section class="card">
      <div class="between" style="flex-wrap:wrap;gap:var(--s4);align-items:flex-start">
        <div>
          <h3>Collecte des indicateurs</h3>
          <p class="muted" style="font-size:var(--t-sm);margin-top:4px">
            Ce qui coûte cher, ce n'est pas le calcul : c'est d'obtenir les chiffres de
            chaque site. Même mécanisme que pour les missions, on demande, on rappelle,
            et si personne ne répond la période se clôt <strong>sans réponse</strong>,
            plutôt que d'être comblée avec celle d'avant.</p>
        </div>
        <div class="stack" style="--gap:var(--s3);min-width:220px">
          <div class="field" style="margin:0">
            <label for="camp">Période</label>
            <select class="select" id="camp">
              ${cs.map(c => `<option value="${c.id}" ${c.id === cid ? "selected" : ""}>${esc(c.libelle)}${c.etat === "close" ? ", close" : ""}</option>`).join("")}
            </select>
          </div>
          ${monSite ? "" : `<button class="btn btn--ghost btn--sm" id="newC">Nouvelle collecte</button>`}
        </div>
      </div>
      <hr class="sep">
      <div class="kpis">
        ${kpi("Sites qui ont répondu", `${e.declares + e.approuves} / ${e.sites.length}`,
              /* La phrase se calcule. Elle disait « deux sites sur quatre, ce
                 n'est pas la moitié du groupe » : vrai pour le jeu de
                 démonstration, faux partout ailleurs, et personne ne l'aurait
                 vu. Ce qui compte est le rapport des effectifs, pas celui du
                 nombre de sites, et c'est lui qu'on affiche. */
              brouillon.effectifTotal
                ? `soit ${nb(brouillon.effectifCouvert)} salariés sur ${nb(brouillon.effectifTotal)}, `
                  + `${pct(brouillon.effectifCouvert / brouillon.effectifTotal * 100)} % de l'effectif : `
                  + `ce sont les salariés qui comptent, pas le nombre de sites`
                : "aucun effectif déclaré sur ce périmètre", "", "kpi--tete grain")}
        ${kpi("Approuvés", `${nb(e.approuves)} / ${nb(e.sites.length)}`,
              ind.effectifTotal ? `${pct(ind.partEffectif * 100)} % de l'effectif du périmètre` : "")}
        ${kpi("En attente d'approbation", nb(e.declares), "soumis, pas encore relus")}
        ${kpi(e.campagne.etat === "ouverte" ? "Échéance" : "Close le",
              dateCourte(e.campagne.echeance),
              e.campagne.etat === "ouverte"
                ? `${e.joursRestants} jour${e.joursRestants > 1 ? "s" : ""}, période du ${dateCourte(e.campagne.debut)} au ${dateCourte(e.campagne.fin)}`
                : `${nb(e.clos)} site${e.clos > 1 ? "s" : ""} clos sans réponse`)}
      </div>
    </section>

    <section class="card">
      <div class="between" style="margin-bottom:var(--s5)"><h3>Par établissement</h3>
        <div class="row" style="--gap:var(--s3)">
          <button class="btn btn--ghost btn--sm" id="dicoI">Dictionnaire des données</button>
          <button class="btn btn--ghost btn--sm" id="csvI">Exporter</button></div></div>
      <div class="tableau"><table class="table"><thead><tr>
        <th>Établissement</th><th>État</th><th>Saisi par</th><th>Approuvé par</th>
        <th>Pièces</th><th></th>
      </tr></thead><tbody></tbody></table></div>
      <p class="hint" style="margin-top:var(--s4)">
        Une pièce jointe est ce qui répond, un an plus tard, à « d'où sort ce
        chiffre ». Facture, relevé, extrait de registre : PDF, photo, classeur,
        10 Mo au plus. <strong>Aucun document nominatif de santé</strong> : on
        compte des accidents et des journées, pas des personnes. Une pièce
        déposée sur une valeur approuvée ne se retire plus.</p>
    </section>

    ${monSite ? "" : blocRapport(rap)}

    <div class="two">
      <section class="card" id="consolide">
        <h3>Ce que ça donne, une fois consolidé</h3>
        <p class="muted" style="font-size:var(--t-sm);margin-top:4px">
          Un taux de périmètre est un <strong>rapport de sommes</strong> : total des accidents
          divisé par total des heures. Pas la moyenne des taux de chaque site, l'écart entre
          les deux est réel et ne se voit pas à l'œil.</p>
        ${brouillon.provisoire ? `<div class="card card--flat"
          style="background:var(--warn-bg);border-color:transparent;margin-top:var(--s5)">
          <p style="font-size:var(--t-sm);color:var(--ink-600)">
            <strong style="color:var(--ink)">Aperçu provisoire.</strong>
            ${nb(e.declares)} saisie${e.declares > 1 ? "s" : ""} attend${e.declares > 1 ? "ent" : ""}
            encore une approbation. La colonne « approuvé » est la seule qui entre dans un
            rapport ou dans une réponse à un client.</p>
        </div>` : ""}
        <div class="tableau"><table class="table" style="margin-top:var(--s5)"><thead><tr>
          <th>Indicateur</th>
          <th style="text-align:right">Approuvé</th>
          ${brouillon.provisoire ? `<th style="text-align:right">Provisoire</th>` : ""}
        </tr></thead><tbody>
          ${calculesDe(e.campagne).map(d => `<tr>
            <td>${esc(d.libelle)}<br><span class="muted" style="font-size:var(--t-xs)">${esc(d.formule)}</span>
              ${d.note ? `<br><span class="muted" style="font-size:var(--t-xs)">${esc(d.note)}</span>` : ""}</td>
            <td class="tnum" style="text-align:right">${ind && ind.calcules[d.cle] !== null
              ? nb2(ind.calcules[d.cle]) + (d.unite ? " " + d.unite : "")
              : `<span class="muted">non calculé</span>`}</td>
            ${brouillon.provisoire ? `<td class="tnum muted" style="text-align:right">${
              brouillon.calcules[d.cle] !== null
                ? nb2(brouillon.calcules[d.cle]) + (d.unite ? " " + d.unite : "") : "-"}</td>` : ""}
          </tr>`).join("")}
        </tbody></table></div>
        <p class="hint" style="margin-top:var(--s4)">
          Approuvé : ${ind.sites} site${ind.sites > 1 ? "s" : ""} sur ${ind.attendus},
          soit ${nb(ind.effectifCouvert)} salariés sur ${nb(ind.effectifTotal)}.
          ${!ind.complet ? "Périmètre incomplet : le rapport le mentionnera, et la réponse à un client aussi." : ""}
        </p>
      </section>
      <section class="card card--flat" style="background:var(--warn-bg);border-color:transparent">
        <h3 style="font-size:var(--t-lg)">Ce que Riseva ne fait pas</h3>
        <ul class="stack" style="--gap:var(--s3);margin-top:var(--s4);font-size:var(--t-sm);
          list-style:none;color:var(--ink-600)">
          ${INDICATEURS_LIMITES.map(x => `<li>${esc(x)}</li>`).join("")}
        </ul>
      </section>
    </div>
  </div>`);

  el.querySelector("#camp").onchange = (ev) => {
    sessionStorage.setItem("riseva.campagne", ev.target.value); rendre();
  };
  const nc = el.querySelector("#newC");
  if (nc) nc.onclick = () => formCampagne(u, gid || (DB.entreprise(u.org) || {}).groupe, cs[0]);

  const tb = el.querySelector("tbody");
  e.sites.filter(x => !monSite || x.etablissement.id === monSite).forEach(x => {
    const [lib, cls] = ETIQ[x.etat];
    const tr = h(`<tr>
      <td><strong>${esc(x.etablissement.nom)}</strong>, ${esc(x.etablissement.ville)}<br>
        <span class="muted" style="font-size:var(--t-xs)">${esc(DB.entreprise(x.etablissement.societe)?.nom || "")}</span></td>
      <td><span class="badge ${cls}">${lib}</span></td>
      <td class="muted">${x.saisiPar ? esc(x.saisiPar.nom) : "-"}</td>
      <td class="muted">${x.approuvePar ? esc(x.approuvePar.nom) : "-"}</td>
      <td class="cell-pieces"></td>
      <td style="text-align:right;white-space:nowrap"></td>
    </tr>`);
    const cell = tr.querySelector("td:last-child");
    if (x.observation) coffre(tr.querySelector(".cell-pieces"), x, u, rendre);
    else tr.querySelector(".cell-pieces").innerHTML =
      `<span class="muted" style="font-size:var(--t-xs)">après la saisie</span>`;
    if (e.campagne.etat === "ouverte"){
      const b = h(`<button class="btn btn--quiet btn--sm">${x.observation ? "Modifier" : "Saisir"}</button>`);
      b.onclick = () => formIndicateurs(u, cid, x.etablissement);
      cell.appendChild(b);
    }
    /* La règle est refusée côté serveur de toute façon, mais montrer le bouton à
       celui qui a saisi affirme visuellement le contraire de ce qui se passera.
       Un écran qui promet une action impossible est un écran qui ment. */
    if (x.etat === "declare" && x.observation && x.observation.saisi_par !== u.id
        && u.role === "entreprise_admin"){
      const a2 = h(`<button class="btn btn--primary btn--sm" style="margin-left:6px">Approuver</button>`);
      a2.onclick = () => {
        try { DB.approuverIndicateurs(cid, x.etablissement.id, u.id);
              toast("Valeurs approuvées et verrouillées."); rendre(); }
        catch (err){ toast(err.message); }
      };
      cell.appendChild(a2);
    }
    tb.appendChild(tr);
  });

  /* La pièce qu'un acheteur, un auditeur ou un commissaire aux comptes demande
     après les chiffres : comment ils ont été obtenus. Sans elle, il ne peut ni
     contester ni vérifier — il peut seulement croire, et c'est exactement ce
     qu'il refusera de faire. */
  el.querySelector("#dicoI").onclick = () => ouvrirDictionnaire(cid);

  el.querySelector("#csvI").onclick = () => {
    versCSV(`riseva-indicateurs-${e.campagne.periode}.csv`,
      ["Société", "Établissement", "Ville", "État", "Saisi par", "Approuvé par",
       ...saisisDe(e.campagne).map(d => d.libelle)],
      e.sites.map(x => [
        DB.entreprise(x.etablissement.societe)?.nom || "", x.etablissement.nom,
        x.etablissement.ville, ETIQ[x.etat][0],
        x.saisiPar ? x.saisiPar.nom : "", x.approuvePar ? x.approuvePar.nom : "",
        ...saisisDe(e.campagne).map(d => (x.observation && x.observation.valeurs[d.cle]) ?? "")]));
    toast("Export téléchargé.");
  };

  /* Les trois sorties du rapport. Elles partent du même objet — `rap` — de sorte
     qu'un chiffre lu à l'écran, un chiffre imprimé et un chiffre dans le classeur
     ne peuvent pas diverger. C'est la seule façon de tenir la promesse : ce que
     vous voyez est ce que vous envoyez. */
  const nomFichier = `riseva-collecte-${e.campagne.periode}`;
  const dl = el.querySelector("#xlsR");
  if (dl) dl.onclick = () => {
    try {
      telecharger(classeur(DB.classeurCollecte(cid)), nomFichier + ".xlsx");
      toast("Classeur téléchargé : un onglet par rubrique.");
    } catch (err){ toast("Le classeur n'a pas pu être fabriqué : " + err.message); }
  };

  /* Le CSV du rapport n'est pas le CSV des saisies : celui-là donne le détail
     site par site, celui-ci donne le consolidé. Les deux existent parce que les
     deux sont demandés, et confondre les deux fait recommencer le travail. */
  const cr = el.querySelector("#csvR");
  if (cr) cr.onclick = () => {
    versCSV(nomFichier + ".csv",
      ["Rubrique", "Indicateur", "Clé", "Unité", "Total du périmètre",
       "Sites renseignés", "Sites ayant répondu", "Type"],
      [...rap.sections.flatMap(s => s.champs.map(d => [
          s.libelle, d.libelle, d.cle, d.unite || "",
          s.totaux[d.cle].somme ?? "", s.totaux[d.cle].sites, rap.repondus, "collecté"])),
       ...rap.ratios.map(x => [
          (rubrique(x.rubrique) || {}).libelle || x.rubrique, x.libelle, x.cle, x.unite || "",
          x.valeur === null ? "" : Math.round(x.valeur * 100) / 100,
          x.surTousLesSites ? rap.repondus : "", rap.repondus, "calculé"])]);
    toast("Export téléchargé.");
  };

  const dr = el.querySelector("#docR");
  if (dr) dr.onclick = () => ouvrirRapportCollecte(rap);

  return el;
}

/* La version imprimable. Elle porte en tête ce qu'un rapport tait d'ordinaire :
   combien de sites ont répondu, lesquels n'ont rien dit, et sur quelle assise
   chaque taux est calculé. Un lecteur qui reçoit ce document peut le contester —
   c'est précisément ce qui le rend recevable. */
function ouvrirRapportCollecte(r){
  if (!r) return;
  const muets = r.sections[0]
    ? r.sections[0].lignes.filter(l => l.etat === "attendu" || l.etat === "clos_sans_reponse")
    : [];
  const corps = `
    <h1>${esc(r.campagne.libelle)}</h1>
    <p class="st">Rapport de collecte, période du ${dateFR(r.campagne.debut)} au
      ${dateFR(r.campagne.fin)}. Dictionnaire version ${esc(r.version)}.</p>
    <div class="note${r.complete ? "" : " alerte"}">
      <strong>Périmètre.</strong> ${nb(r.repondus)} site${r.repondus > 1 ? "s" : ""}
      sur ${nb(r.sites)} ${r.repondus > 1 ? "ont" : "a"} répondu, soit
      ${nb(r.effectifCouvert)} salariés sur ${nb(r.effectifTotal)}.
      ${muets.length ? `Sans réponse : ${muets.map(l => esc(l.site.nom)).join(", ")}.
        Leurs valeurs ne sont pas estimées ; elles sont absentes.` : ""}
      Les totaux ci-dessous portent sur les sites qui ont répondu, et sur eux seuls.
    </div>
    ${r.sections.map(s => `<h2>${esc(s.libelle)}</h2>
      <table><thead><tr><th>Indicateur</th><th style="text-align:right">Total</th>
        <th style="text-align:right">Sites renseignés</th></tr></thead><tbody>
        ${s.champs.map(d => {
          const tt = s.totaux[d.cle];
          return `<tr><td>${esc(d.libelle)}${d.unite ? ` (${esc(d.unite)})` : ""}</td>
            <td class="v">${tt.somme === null ? `<span class="manque">non disponible</span>`
              : nb(Math.round(tt.somme * 100) / 100)}</td>
            <td class="v">${tt.sites} / ${r.repondus}</td></tr>`;
        }).join("")}
      </tbody></table>`).join("")}
    ${r.ratios.length ? `<h2>Indicateurs calculés</h2>
      <table><thead><tr><th>Indicateur</th><th style="text-align:right">Valeur</th>
        <th>Assise du calcul</th></tr></thead><tbody>
        ${r.ratios.map(x => `<tr>
          <td>${esc(x.libelle)}<br><span class="m">${esc(x.formule)}</span></td>
          <td class="v">${x.valeur === null ? `<span class="manque">non disponible</span>`
            : nb2(x.valeur) + (x.unite ? " " + esc(x.unite) : "")}</td>
          <td class="m">${x.surTousLesSites ? "tous les sites ayant répondu"
            : "périmètre partiel"}</td></tr>`).join("")}
      </tbody></table>` : ""}
    <div class="pied">
      Riseva rassemble les valeurs saisies par chaque site, les additionne et les restitue.
      Elle ne les audite pas, ne les interprète pas et ne dépose rien avec : la
      responsabilité de chaque valeur reste chez l'établissement qui l'a écrite, comme
      dans le tableur que ce rapport remplace.<br>
      ${r.limites.map(x => esc(x)).join("<br>")}
    </div>`;
  ouvrirDoc(`${r.campagne.libelle}, rapport de collecte`, corps);
}

/* ------------------------------------------------------------------ */
/* Supports : l'affiche, et ce qui arrive par la poste                 */
/* ------------------------------------------------------------------ */
/* L'affiche est le seul support que Riseva peut produire à la demande, et c'est
   le plus utile : un site qui a perdu la sienne, ou qui vient d'ouvrir, n'a pas
   à attendre la vague suivante. Elle est générée avec le lien d'inscription de
   l'entreprise — c'est ce lien qui fait toute la différence entre une affiche
   qu'on regarde et une affiche à laquelle on répond. */
const STYLE_AFFICHE = `
  @page{size:A4;margin:0}
  body{margin:0;background:#F2F0E9;font:16px/1.5 -apple-system,Segoe UI,Inter,sans-serif;
    color:#131510}
  .a4{width:210mm;height:297mm;margin:0 auto;background:#FAF9F5;padding:22mm 20mm;
    box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;
    position:relative;overflow:hidden}
  .mq{position:absolute;right:-40mm;bottom:-40mm;width:150mm;height:150mm;
    border-radius:50%;background:#DFE6D0;opacity:.5}
  .in{position:relative;z-index:1}
  .eb{font:600 12px/1 -apple-system,Segoe UI,Inter,sans-serif;letter-spacing:.16em;
    text-transform:uppercase;color:#1F5C4A;margin:0 0 10mm}
  h1{font-size:46px;line-height:1.04;letter-spacing:-.03em;margin:0 0 8mm;max-width:15ch}
  h1 em{font-style:italic;color:#3B6D11}
  .lede{font-size:17px;line-height:1.55;color:#4A4F42;max-width:44ch;margin:0}
  .box{border:2px solid #131510;border-radius:14px;padding:8mm 9mm;background:#FAF9F5}
  .box p{margin:0 0 4mm;font-size:13.5px;color:#4A4F42}
  .lien{font:600 17px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;
    letter-spacing:-.01em;word-break:break-all;color:#131510}
  .pied{display:flex;justify-content:space-between;align-items:flex-end;gap:10mm;
    font-size:12px;color:#63675C}
  .fmts{display:flex;gap:5mm;margin:9mm 0 0;padding:0;list-style:none;flex-wrap:wrap}
  .fmts li{font-size:13px;color:#131510;font-weight:600;border:1px solid #CFD1C6;
    border-radius:999px;padding:2mm 5mm}
  .marque{display:flex;justify-content:space-between;align-items:center;margin:0 0 12mm}
  .marque img{height:11mm;width:auto}
  .marque span{font:600 11px/1 -apple-system,Segoe UI,Inter,sans-serif;letter-spacing:.14em;
    text-transform:uppercase;color:#63675C}
  .appel{display:flex;gap:9mm;align-items:center}
  .appel .qr{flex:0 0 auto;width:34mm;height:34mm;border-radius:6px}
  .appel .txt{min-width:0}
  .trois{display:grid;grid-template-columns:repeat(3,1fr);gap:6mm;margin:10mm 0 0}
  .trois div{border-top:2px solid #131510;padding-top:3mm}
  .trois b{display:block;font-size:22px;line-height:1;letter-spacing:-.02em}
  .trois span{display:block;font-size:12px;color:#4A4F42;margin-top:2mm}
  @media print{body{background:#fff}.a4{box-shadow:none;margin:0}.noprint{display:none}}
  .noprint{text-align:center;padding:14px}
  .noprint button{font:inherit;background:#131510;color:#F2F0E9;border:0;border-radius:12px;
    padding:11px 22px;cursor:pointer}`;

function ouvrirAffiche(u){
  const e = DB.entreprise(u.org) || {};
  const sa = DB.saison();
  const inv = DB.invitationActive(u.org);
  const lien = inv ? lienPublic(`/rejoindre.html?code=${inv.code}`) : null;
  if (!lien){
    modal("Aucun lien d'inscription actif",
      `<p class="muted">Une affiche sans lien est une affiche qu'on regarde sans y répondre.
       Créez d'abord le lien d'inscription de vos salariés, depuis l'écran Équipe.</p>`,
      [{ label:"Fermer" }]);
    return;
  }
  const rea = DB.impactReseau();
  const w = window.open("", "_blank");
  if (!w){ toast("Autorisez les fenêtres pour ouvrir l'affiche."); return; }
  const qr = qrSvg(lien, 128, "Code QR vers la page d'inscription");
  w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<title>Affiche Riseva, ${esc(e.nom || "")}</title><style>${STYLE_AFFICHE}</style></head><body>
<div class="noprint"><button onclick="window.print()">Imprimer en A3 ou A4</button></div>
<div class="a4"><div class="mq"></div>
  <div class="in">
    <div class="marque">
      <img src="/brand/riseva-full.png" alt="Riseva">
      <span>${esc(e.nom || "")}, ${esc(sa.nom)}</span>
    </div>
    <h1>Une demi-journée. <em>Une association.</em> Près d'ici.</h1>
    <p class="lede">Des associations près de nos sites publient ce dont elles ont besoin :
      des bras, du matériel, parfois un coup de main financier. Vous choisissez ce que vous
      voulez faire, quand vous le voulez. Ce que vous faites compte pour l'entreprise, et ce
      que vous donnez à titre personnel ne lui est jamais montré.</p>
    <ul class="fmts">
      <li>Une demi-journée de bénévolat</li>
      <li>Du matériel qui repart utile</li>
      <li>Un don, sans passer par nous</li>
    </ul>
    <div class="trois">
      <div><b>2 min</b><span>pour créer son compte</span></div>
      <div><b>Sur place</b><span>près de son site de travail</span></div>
      <div><b>Libre</b><span>on se propose, on n'est jamais désigné</span></div>
    </div>
  </div>
  <div class="in box appel">
    ${qr}
    <div class="txt">
      <p><strong>Scannez, ou ouvrez ce lien</strong> depuis votre poste ou votre téléphone :</p>
      <div class="lien">${esc(lien)}</div>
    </div>
  </div>
  <div class="in pied">
    ${/* Le pied comptait `rea.missions`, qui additionne les missions confirmees par
         une association et celles closes d'office au bout de quatorze jours : le mot
         « confirmees » couvrait donc des missions que personne n'a confirmees. Il ne
         compte plus que les vraies, et il dit d'ou vient le chiffre. */""}
    <span>Sur Riseva : ${nb(rea.associations || 0)} associations enregistrées${
      rea.confirmees ? `, ${nb(rea.confirmees)} missions confirmées par une association` : ""}</span>
    <span>riseva.fr</span>
  </div>
</div></body></html>`);
  w.document.close();
  toast("Affiche ouverte dans un nouvel onglet.");
}

/* Côté client : ce qui est arrivé, ce qui arrive, et de quoi réimprimer. */
function vueSupports(u){
  const l = DB.supportsDe(u.org);
  const el = h(`<div class="stack" style="--gap:var(--s5)">
    <section class="card">
      <div class="between" style="flex-wrap:wrap;gap:var(--s4);align-items:flex-start">
        <div>
          <h3>Vos supports</h3>
          <p class="muted" style="font-size:var(--t-sm);margin-top:4px">
            Quatre envois dans la saison, compris dans l'abonnement. Ce n'est pas un cadeau
            marketing : un lien envoyé une fois par courriel se perd, une affiche au-dessus de
            la machine à café rappelle la saison à des gens qui n'ouvrent pas leurs mails.</p>
        </div>
        <button class="btn btn--forest btn--sm" id="affiche">Imprimer une affiche</button>
      </div>
      <div class="tableau"><table class="table" style="margin-top:var(--s6)"><thead><tr>
        <th>Envoi</th><th>Contenu</th><th>Prévu</th><th>État</th><th></th>
      </tr></thead><tbody id="kits"></tbody></table></div>
      <p class="hint" style="margin-top:var(--s4)">C'est vous qui confirmez la réception, pas
        nous : un suivi où Riseva se déclare à elle-même que le colis est arrivé ne vaut rien le
        jour où vous dites n'avoir rien reçu.</p>
    </section>
  </div>`);

  const tb = el.querySelector("#kits");
  l.forEach(x => {
    const et = ETATS_EXPEDITION[x.etat] || { label:"À venir", badge:"" };
    const tr = h(`<tr>
      <td><strong>${esc(x.kit.nom)}</strong>
        <br><span class="muted" style="font-size:var(--t-xs)">${esc(x.kit.quoi)}</span></td>
      <td class="muted" style="font-size:var(--t-xs)">${esc(x.kit.contenu)}</td>
      <td class="muted tnum">${dateCourte(x.prevu)}</td>
      <td><span class="badge ${et.badge}">${esc(et.label)}</span>
        ${x.expedition && x.expedition.suivi
          ? `<br><span class="muted" style="font-size:var(--t-xs);font-family:var(--font-mono)">${esc(x.expedition.suivi)}</span>` : ""}
        ${x.en_retard ? `<br><span style="font-size:var(--t-xs);color:var(--danger)">en retard sur le calendrier</span>` : ""}</td>
      <td style="text-align:right"></td></tr>`);
    if (x.expedition && !x.expedition.recu_le){
      const b = h(`<button class="btn btn--ghost btn--sm">Bien reçu</button>`);
      b.onclick = () => { DB.confirmerReception(x.expedition.id);
        toast("Réception confirmée. Merci."); rendre(); };
      tr.lastElementChild.appendChild(b);
    }
    tb.appendChild(tr);
  });
  el.querySelector("#affiche").onclick = () => ouvrirAffiche(u);
  return el;
}

/* Côté Riseva : ce qu'il reste à préparer, tous clients confondus. C'est l'écran
   qui remplace le tableau tenu à la main — et le seul endroit où l'on voit qu'un
   envoi est en retard avant que le client ne le signale. */
function vueExpeditions(){
  const l = DB.aExpedier();
  const faites = DB.expeditions();
  const el = h(`<div class="stack" style="--gap:var(--s5)">
    <div class="kpis">
      ${kpi("À préparer", nb(l.length), l.filter(x => x.en_retard).length
        ? `${nb(l.filter(x => x.en_retard).length)} en retard sur le calendrier` : "à jour",
        "", "kpi--tete grain")}
      ${kpi("Expédiés", nb(faites.length), "sur la saison")}
      ${kpi("Reçus confirmés", nb(faites.filter(x => x.recu_le).length), "par le client lui-même")}
      ${kpi("Envois par saison", nb(KITS_SAISON.length), "compris dans l'abonnement")}
    </div>

    <section class="card">
      <h3>À préparer</h3>
      <p class="muted" style="font-size:var(--t-sm);margin-top:4px">
        Par date prévue. Le nombre de sites donne la quantité d'affiches à mettre dans le colis.</p>
      <div id="apr" style="margin-top:var(--s5)"></div>
    </section>

    <section class="card">
      <div class="between" style="margin-bottom:var(--s5)">
        <h3>Expédiés</h3>
        <button class="btn btn--ghost btn--sm" id="csvEx">Exporter</button>
      </div>
      <div id="fai"></div>
    </section>
  </div>`);

  const apr = el.querySelector("#apr");
  if (!l.length) apr.appendChild(vide({ titre:"Rien à préparer",
    texte:"Toutes les vagues dues ont été expédiées." }));
  else {
    const tb = h(`<div class="tableau"><table class="table"><thead><tr>
      <th>Entreprise</th><th>Envoi</th><th>Sites</th><th>Prévu</th><th></th>
    </tr></thead><tbody></tbody></table></div>`);
    l.forEach(x => {
      const tr = h(`<tr>
        <td><strong>${esc(x.entreprise.nom)}</strong>
          <br><span class="muted" style="font-size:var(--t-xs)">${esc(x.entreprise.ville || "")}</span></td>
        <td>${esc(x.kit.nom)}<br><span class="muted" style="font-size:var(--t-xs)">${esc(x.kit.contenu)}</span></td>
        <td class="tnum">${nb(x.sites)}</td>
        <td class="tnum ${x.en_retard ? "" : "muted"}" style="${x.en_retard ? "color:var(--danger)" : ""}">${dateCourte(x.prevu)}</td>
        <td style="text-align:right"></td></tr>`);
      const b = h(`<button class="btn btn--forest btn--sm">Marquer expédié</button>`);
      b.onclick = () => {
        const corps = h(`<div class="stack" style="--gap:var(--s4)">
          <p class="muted" style="font-size:var(--t-sm)">${esc(x.kit.nom)}, ${esc(x.entreprise.nom)},
            ${nb(x.sites)} site${x.sites > 1 ? "s" : ""}.</p>
          <div class="field"><label for="sv">Numéro de suivi (facultatif)</label>
            <input class="input" id="sv" placeholder="6A12345678901"></div>
          <p class="hint">Le client confirmera lui-même la réception : c'est la seule trace qui
            vaille quelque chose le jour où il dit n'avoir rien reçu.</p>
        </div>`);
        modal("Marquer expédié", corps, [
          { label:"Annuler" },
          { label:"Expédié", classe:"btn--primary", onClick: () => {
              try { DB.expedier(x.entreprise.id, x.kit.code,
                { suivi: corps.querySelector("#sv").value }); }
              catch (e){ toast(e.message); return false; }
              toast("Expédition enregistrée."); rendre(); }}]);
      };
      tr.lastElementChild.appendChild(b);
      tb.querySelector("tbody").appendChild(tr);
    });
    apr.appendChild(tb);
  }

  const fai = el.querySelector("#fai");
  if (!faites.length) fai.appendChild(vide({ titre:"Aucune expédition",
    texte:"Les envois marqués expédiés apparaîtront ici." }));
  else {
    const tb = h(`<div class="tableau"><table class="table"><thead><tr>
      <th>Entreprise</th><th>Envoi</th><th>Expédié</th><th>Suivi</th><th>Reçu</th>
    </tr></thead><tbody></tbody></table></div>`);
    faites.forEach(x => {
      const e = DB.entreprise(x.entreprise) || {};
      const k = KITS_SAISON.find(y => y.code === x.kit) || {};
      tb.querySelector("tbody").appendChild(h(`<tr>
        <td>${esc(e.nom || "")}</td>
        <td>${esc(k.nom || x.kit)}</td>
        <td class="muted tnum">${dateCourte(x.expedie_le)}</td>
        <td class="muted" style="font-family:var(--font-mono);font-size:var(--t-xs)">${esc(x.suivi || "-")}</td>
        <td>${x.recu_le ? `<span class="badge badge--ok">${dateCourte(x.recu_le)}</span>`
                        : `<span class="badge badge--attente">en attente</span>`}</td></tr>`));
    });
    fai.appendChild(tb);
  }
  el.querySelector("#csvEx").onclick = () => {
    versCSV("riseva-expeditions.csv",
      ["Entreprise", "Envoi", "Expédié le", "Suivi", "Reçu le"],
      faites.map(x => [(DB.entreprise(x.entreprise) || {}).nom || "",
        (KITS_SAISON.find(y => y.code === x.kit) || {}).nom || x.kit,
        x.expedie_le, x.suivi || "", x.recu_le || ""]));
    toast("Export téléchargé.");
  };
  return el;
}

/* ------------------------------------------------------------------ */
/* Sécurité : le registre, le Pareto, le plan d'actions               */
/* ------------------------------------------------------------------ */
/* Un site déclare ses événements au fil de l'eau ; la société les lit
   consolidés sans avoir rien demandé, et la campagne d'indicateurs s'en sert.
   C'est le seul endroit du produit où l'automatisation fait gagner du temps à
   tout le monde en même temps : le site ne remplit plus de tableau en fin de
   période, le siège ne relance plus, et les deux chiffres ne peuvent plus
   diverger puisqu'il n'y en a qu'un. */
function vueSecurite(u){
  const monSite = u.role === "site_referent" ? u.etablissement : null;
  const sa = DB.saison();
  const debut = sessionStorage.getItem("riseva.secu.debut") || sa.debut;
  const fin   = sessionStorage.getItem("riseva.secu.fin")   || sa.fin;
  const sy = DB.syntheseSecurite({ societe: u.org, debut, fin });
  const sites = DB.etablissements(u.org).filter(x => !monSite || x.id === monSite);
  const evs = DB.evenements({ societe: u.org, etablissement: monSite || undefined, debut, fin });
  const retard = DB.actionsEnRetard({ societe: u.org });
  const t = sy.total;

  const el = h(`<div class="stack" style="--gap:var(--s5)">
    <section class="card">
      <div class="between" style="flex-wrap:wrap;gap:var(--s4);align-items:flex-start">
        <div>
          <h3>Événements de sécurité</h3>
          <p class="muted" style="font-size:var(--t-sm);margin-top:4px">
            Déclarés un par un, au moment où ils arrivent. Les taux de la période s'en déduisent :
            plus de tableau à remplir en fin de campagne, et plus deux chiffres qui divergent.
            <strong style="color:var(--ink)">Aucun nom, aucune donnée de santé</strong>, ni
            identité, ni siège de la lésion, ni diagnostic.</p>
        </div>
        <div class="row" style="--gap:var(--s3);align-items:flex-end">
          <div class="field" style="margin:0"><label for="sd">Du</label>
            <input class="input" type="date" id="sd" value="${debut}"></div>
          <div class="field" style="margin:0"><label for="sf">au</label>
            <input class="input" type="date" id="sf" value="${fin}"></div>
          <button class="btn btn--forest btn--sm" id="declarer">Déclarer un événement</button>
        </div>
      </div>
      <div class="kpis" style="margin-top:var(--s6)">
        ${kpi("Avec arrêt", nb(t.at_avec_arret), `${nb(t.jours_arret)} journées perdues`, "", "kpi--tete grain")}
        ${kpi("Soins sans arrêt", nb(t.at_sans_arret), "événements pris en charge")}
        ${kpi("Trajet", nb(t.at_trajet), "comptés à part")}
        ${kpi("Sans soin", nb(t.sans_soin), "presqu'accidents, le seul indicateur qui permet d'agir avant")}
      </div>
      ${sy.sites_sans_registre.length ? `<div class="card card--flat"
        style="background:var(--warn-bg);border-color:transparent;margin-top:var(--s5)">
        <p style="font-size:var(--t-sm);color:var(--ink-600)">
          <strong style="color:var(--ink)">${sy.sites_sans_registre.length} site${
            sy.sites_sans_registre.length > 1 ? "s ne tiennent" : " ne tient"} pas encore le registre</strong>
         , ${esc(sy.sites_sans_registre.join(", "))}. Ces sites n'ont pas « zéro accident » : ils
          n'ont rien déclaré ici, et leurs chiffres continuent d'être saisis à la main dans la
          campagne. La différence est tout ce qui compte.</p>
      </div>` : ""}

      <div class="encadreMini" style="margin-top:var(--s5)">
        <p><strong>Ce registre ne remplace aucune de vos obligations légales.</strong></p>
        <p>C'est un outil de pilotage : il compte, il classe, il déduit vos taux et il consolide
        vos sites. Il ne vaut ni déclaration, ni registre réglementaire. Trois choses continuent
        de vous incomber entièrement, et une seule d'entre elles oubliée coûte plus cher que tout
        ce que Riseva vous fait gagner :</p>
        <ul style="margin:var(--s3) 0 0;padding-left:20px;font-size:var(--t-sm)">
          <li>La <strong>déclaration à la caisse primaire dans les 48 heures</strong> ouvrées de
          tout accident du travail (article R. 441-3 du code de la sécurité sociale). Riseva ne
          la fait pas et ne peut pas la faire : elle ne connaît ni le nom de la victime, ni la
          lésion, ni votre numéro de risque.</li>
          <li>Le <strong>registre des accidents du travail bénins</strong> de l'article L. 441-4,
          si vous en tenez un. Son contenu est fixé par décret et comprend l'identité de la
          victime, la nature des lésions et les témoins, précisément ce que nous refusons de
          collecter. C'est un autre document, tenu ailleurs.</li>
          <li>Le <strong>document unique d'évaluation des risques</strong> (article R. 4121-1) et
          sa mise à jour. Le plan d'actions ci-dessous l'alimente utilement, il ne le constitue
          pas : Riseva n'évalue pas les risques à la place de l'employeur.</li>
        </ul>
        <p style="margin-top:var(--s3)">Nous préférons vous le dire ici, en haut de l'écran, plutôt
        que de vous laisser le découvrir au moment d'un contrôle.</p>
      </div>
    </section>

    <div class="two">
      <section class="card">
        <h3>Par où commencer</h3>
        <p class="muted" style="font-size:var(--t-sm);margin-top:4px">
          Les types d'événements, du plus fréquent au moins fréquent, avec leur part cumulée.
          C'est la seule lecture qui dise par où commencer plutôt que quoi constater.</p>
        <div id="pareto" style="margin-top:var(--s5)"></div>
      </section>

      <section class="card">
        <div class="between" style="margin-bottom:var(--s4)">
          <h3>Sites</h3>
          ${monSite ? "" : `<span class="muted" style="font-size:var(--t-xs)">registre par site</span>`}
        </div>
        <div class="tableau"><table class="table"><thead><tr>
          <th>Site</th><th style="text-align:right">Avec arrêt</th>
          <th style="text-align:right">Jours</th><th>Registre</th>
        </tr></thead><tbody id="parSite"></tbody></table></div>
        <p class="hint" style="margin-top:var(--s4)">Activer le registre pour un site fait
          disparaître les quatre champs correspondants de sa campagne d'indicateurs : ils sont
          alors déduits, et ne peuvent plus être saisis à la main.</p>
      </section>
    </div>

    <section class="card">
      <div class="between" style="margin-bottom:var(--s5)">
        <div><h3>Plan d'actions</h3>
        <p class="muted" style="font-size:var(--t-sm);margin-top:4px">
          Un registre sans actions est un cahier de doléances. C'est aussi la première question
          posée après un accident : qu'avez-vous fait ensuite.</p></div>
        ${retard.length ? `<span class="badge badge--alerte">${retard.length} en retard</span>` : ""}
      </div>
      <div id="plan"></div>
    </section>

    <section class="card">
      <div class="between" style="margin-bottom:var(--s5)">
        <h3>Le registre</h3>
        <button class="btn btn--ghost btn--sm" id="csvEv">Exporter</button>
      </div>
      <div id="reg"></div>
    </section>
  </div>`);

  /* Pareto */
  const par = el.querySelector("#pareto");
  if (!sy.pareto.length) par.appendChild(vide({ titre:"Aucun événement sur la période",
    texte:"C'est peut-être une bonne nouvelle, ou personne n'a encore déclaré." }));
  else {
    const max = sy.pareto[0].nombre;
    sy.pareto.forEach(x => par.appendChild(h(`<div style="margin-bottom:var(--s4)">
      <div class="between" style="font-size:var(--t-sm)">
        <span>${esc(x.label)}</span>
        <span class="tnum muted">${nb(x.nombre)}, ${pct(x.part)} %, cumul ${pct(x.cumul)} %</span>
      </div>
      <div class="bar" style="margin-top:4px"><i style="width:${(x.nombre / max) * 100}%"></i></div>
    </div>`)));
  }

  /* Par site */
  const ps = el.querySelector("#parSite");
  const sitesVus = sy.sites.filter(x => !monSite || x.etablissement.id === monSite);
  /* Aucun site déclaré : le tableau vide laisserait croire à un écran cassé.
     On dit ce qui manque, et où le déclarer. */
  if (!sitesVus.length)
    ps.appendChild(h(`<tr><td colspan="4" class="muted" style="font-size:var(--t-sm)">
      Aucun site déclaré pour l'instant. ${monSite ? "Votre site n'apparaît pas encore ici."
        : `Déclarez-en un dans <a href="#/sites">Sites et quotas</a> : le registre de sécurité
           se tient site par site, jamais pour l'entreprise en bloc.`}</td></tr>`));
  sitesVus.forEach(x => {
    const tr = h(`<tr>
      <td><strong>${esc(x.etablissement.nom)}</strong>
        <br><span class="muted" style="font-size:var(--t-xs)">${esc(x.etablissement.ville || "")}</span></td>
      <td class="tnum" style="text-align:right">${x.registre ? nb(x.at_avec_arret) : "-"}</td>
      <td class="tnum" style="text-align:right">${x.registre ? nb(x.jours_arret) : "-"}</td>
      <td></td></tr>`);
    const cell = tr.lastElementChild;
    const b = h(`<button class="btn btn--sm ${x.registre ? "btn--ghost" : "btn--forest"}">${
      x.registre ? "Tenu" : "Activer"}</button>`);
    b.onclick = () => {
      if (x.registre){
        modal("Arrêter le registre de " + x.etablissement.nom,
          `<p class="muted">Les quatre valeurs de sécurité redeviendront saisissables à la main
           dans la campagne. Les événements déjà déclarés restent dans le registre : on
           n'efface pas un registre.</p>`,
          [{ label:"Annuler" },
           { label:"Arrêter", classe:"btn--primary", onClick: () => {
               DB.activerRegistre(x.etablissement.id, false); toast("Registre arrêté."); rendre(); }}]);
      } else {
        DB.activerRegistre(x.etablissement.id, true);
        toast("Registre activé : les taux de ce site seront déduits des événements."); rendre();
      }
    };
    cell.appendChild(b);
    ps.appendChild(tr);
  });

  /* Plan d'actions */
  const plan = el.querySelector("#plan");
  const acts = DB.actions({ societe: u.org, etablissement: monSite || undefined });
  if (!acts.length) plan.appendChild(vide({ titre:"Aucune action ouverte",
    texte:"Les actions se créent depuis un événement du registre." }));
  else {
    const tb = h(`<div class="tableau"><table class="table"><thead><tr>
      <th>Action</th><th>Site</th><th>Responsable</th><th>Échéance</th><th>État</th><th></th>
    </tr></thead><tbody></tbody></table></div>`);
    acts.forEach(a => {
      const et = DB.etablissement(a.etablissement) || {};
      const tard = ["a_faire", "en_cours"].includes(a.etat) && a.echeance < "2026-08-20";
      const tr = h(`<tr>
        <td>${esc(a.quoi)}</td>
        <td class="muted">${esc(et.nom || "")}</td>
        <td class="muted">${esc(a.responsable)}</td>
        <td class="tnum ${tard ? "" : "muted"}" style="${tard ? "color:var(--danger)" : ""}">${dateCourte(a.echeance)}</td>
        <td><span class="badge ${ETATS_ACTION[a.etat].badge}">${esc(ETATS_ACTION[a.etat].label)}</span></td>
        <td style="text-align:right"></td></tr>`);
      if (a.etat !== "faite" && a.etat !== "abandonnee"){
        const b = h(`<button class="btn btn--ghost btn--sm">${a.etat === "a_faire" ? "Démarrer" : "Terminer"}</button>`);
        b.onclick = () => { DB.majAction(a.id, a.etat === "a_faire" ? "en_cours" : "faite");
          toast("Action mise à jour."); rendre(); };
        tr.lastElementChild.appendChild(b);
      }
      tb.querySelector("tbody").appendChild(tr);
    });
    plan.appendChild(tb);
  }

  /* Registre */
  const reg = el.querySelector("#reg");
  if (!evs.length) reg.appendChild(vide({ titre:"Aucun événement déclaré sur cette période",
    texte:"Déclarer prend quinze secondes, et c'est ce qui remplace le tableau de fin d'année." }));
  else {
    const tb = h(`<div class="tableau"><table class="table"><thead><tr>
      <th>Date</th><th>Site</th><th>Nature</th><th>Type</th><th>Zone</th>
      <th style="text-align:right">Jours</th><th>Gravité</th><th></th>
    </tr></thead><tbody></tbody></table></div>`);
    evs.forEach(e => {
      const et = DB.etablissement(e.etablissement) || {};
      const g = GRAVITES_EVENEMENT[e.gravite];
      const tr = h(`<tr>
        <td class="tnum muted">${dateCourte(e.date)}</td>
        <td class="muted">${esc(et.nom || "")}</td>
        <td>${esc(NATURES_EVENEMENT[e.nature].label)}</td>
        <td>${esc(TYPES_EVENEMENT[e.type] || e.type)}
          ${e.circonstances ? `<br><span class="muted" style="font-size:var(--t-xs)">${esc(e.circonstances)}</span>` : ""}</td>
        <td class="muted">${esc(e.zone || "-")}</td>
        <td class="tnum" style="text-align:right">${e.jours_arret || "-"}</td>
        <td><span class="badge ${g.badge}">${esc(g.label)}</span></td>
        <td style="text-align:right"></td></tr>`);
      const bar = tr.lastElementChild;
      const ba = h(`<button class="btn btn--ghost btn--sm">Action</button>`);
      ba.onclick = () => formAction(e);
      bar.appendChild(ba);
      const bx = h(`<button class="btn btn--quiet btn--sm" style="color:var(--danger)">Annuler</button>`);
      bx.onclick = () => {
        const corps = h(`<div>
          <p class="muted">On n'efface pas une ligne d'un registre : on l'annule, en disant
          pourquoi. Une déclaration qui disparaît sans trace est exactement ce qu'un inspecteur
          cherche.</p>
          <div class="field" style="margin-top:var(--s5)"><label for="mo">Motif</label>
            <input class="input" id="mo" placeholder="Doublon, erreur de site, requalifié..."></div>
        </div>`);
        modal("Annuler cette déclaration", corps, [
          { label:"Fermer" },
          { label:"Annuler la déclaration", classe:"btn--primary", onClick: () => {
              try { DB.annulerEvenement(e.id, corps.querySelector("#mo").value); }
              catch (err){ toast(err.message); return false; }
              toast("Déclaration annulée, motif consigné."); rendre(); }}]);
      };
      bar.appendChild(bx);
      tb.querySelector("tbody").appendChild(tr);
    });
    reg.appendChild(tb);
  }

  const majPeriode = () => {
    sessionStorage.setItem("riseva.secu.debut", el.querySelector("#sd").value);
    sessionStorage.setItem("riseva.secu.fin", el.querySelector("#sf").value);
    rendre();
  };
  el.querySelector("#sd").onchange = majPeriode;
  el.querySelector("#sf").onchange = majPeriode;
  el.querySelector("#declarer").onclick = () => formEvenement(u, sites, monSite);
  el.querySelector("#csvEv").onclick = () => {
    versCSV("riseva-registre-securite.csv",
      ["Date", "Site", "Nature", "Type", "Zone", "Gravité", "Journées d'arrêt", "Circonstances"],
      evs.map(e => [e.date, (DB.etablissement(e.etablissement) || {}).nom || "",
        NATURES_EVENEMENT[e.nature].label, TYPES_EVENEMENT[e.type] || e.type,
        e.zone || "", GRAVITES_EVENEMENT[e.gravite].label, e.jours_arret,
        e.circonstances || ""]));
    toast("Registre exporté.");
  };
  return el;
}

function formEvenement(u, sites, monSite){
  const corps = h(`<div class="stack" style="--gap:var(--s4)">
    <div class="row" style="--gap:var(--s4);align-items:stretch">
      <div class="field" style="flex:1"><label for="ev-site">Site</label>
        <select class="select" id="ev-site">
          ${sites.map(x => `<option value="${x.id}"${x.id === monSite ? " selected" : ""}>${esc(x.nom)}, ${esc(x.ville || "")}</option>`).join("")}
        </select></div>
      <div class="field" style="flex:1"><label for="ev-date">Date de l'événement</label>
        <input class="input" type="date" id="ev-date" max="2026-08-20" value="2026-08-20"></div>
    </div>
    <div class="row" style="--gap:var(--s4);align-items:stretch">
      <div class="field" style="flex:1"><label for="ev-nature">Nature</label>
        <select class="select" id="ev-nature">
          ${Object.entries(NATURES_EVENEMENT).map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join("")}
        </select>
        <p class="hint" id="ev-natureAide"></p></div>
      <div class="field" style="flex:1"><label for="ev-grav">Gravité</label>
        <select class="select" id="ev-grav">
          ${Object.entries(GRAVITES_EVENEMENT).map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join("")}
        </select>
        <p class="hint" id="ev-gravAide"></p></div>
    </div>
    <div class="row" style="--gap:var(--s4);align-items:stretch">
      <div class="field" style="flex:1"><label for="ev-type">Type</label>
        <select class="select" id="ev-type">
          ${Object.entries(TYPES_EVENEMENT).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("")}
        </select></div>
      <div class="field" style="flex:1"><label for="ev-jours">Journées d'arrêt</label>
        <input class="input" type="number" id="ev-jours" min="0" value="0"></div>
    </div>
    <div class="field"><label for="ev-zone">Zone ou poste</label>
      <input class="input" id="ev-zone" placeholder="Quai de chargement, ligne 2, atelier..."></div>
    <div class="field"><label for="ev-circ">Circonstances</label>
      <textarea class="textarea" id="ev-circ" rows="2" maxlength="${MAX_CIRCONSTANCES}"
        placeholder="Ce qui s'est passé, factuellement."></textarea>
      <p class="hint"><strong>Aucun nom, aucune donnée de santé</strong> : ni identité, ni siège
        de la lésion, ni diagnostic. Ce sont des données de santé au sens de l'article 9 du RGPD,
        et Riseva n'a aucune raison de les héberger. Ce qui sert à agir, la circonstance, la
        zone, le type, n'en fait pas partie.</p></div>
  </div>`);
  const aide = () => {
    corps.querySelector("#ev-natureAide").textContent =
      NATURES_EVENEMENT[corps.querySelector("#ev-nature").value].aide;
    corps.querySelector("#ev-gravAide").textContent =
      GRAVITES_EVENEMENT[corps.querySelector("#ev-grav").value].aide;
  };
  corps.querySelector("#ev-nature").onchange = aide;
  corps.querySelector("#ev-grav").onchange = aide;
  aide();

  modal("Déclarer un événement", corps, [
    { label:"Annuler" },
    { label:"Déclarer", classe:"btn--primary", onClick: () => {
        const v = (id) => corps.querySelector("#" + id).value;
        try {
          DB.declarerEvenement(v("ev-site"), {
            date: v("ev-date"), nature: v("ev-nature"), gravite: v("ev-grav"),
            type: v("ev-type"), zone: v("ev-zone"),
            jours_arret: v("ev-jours"), circonstances: v("ev-circ")
          }, u.id);
        } catch (e){ toast(e.message); return false; }
        toast("Événement déclaré. Les taux de la période sont à jour."); rendre();
      }}
  ]);
}

function formAction(ev){
  const et = DB.etablissement(ev.etablissement) || {};
  const corps = h(`<div class="stack" style="--gap:var(--s4)">
    <p class="muted" style="font-size:var(--t-sm)">Suite à l'événement du ${dateFR(ev.date)}
     , ${esc(TYPES_EVENEMENT[ev.type] || ev.type)}, ${esc(et.nom || "")}.</p>
    <div class="field"><label for="ac-quoi">Ce qui va être fait</label>
      <input class="input" id="ac-quoi" placeholder="Une phrase, à l'infinitif."></div>
    <div class="row" style="--gap:var(--s4);align-items:stretch">
      <div class="field" style="flex:1"><label for="ac-resp">Responsable</label>
        <input class="input" id="ac-resp" value="${esc(et.referent || "")}"></div>
      <div class="field" style="flex:1"><label for="ac-ech">Échéance</label>
        <input class="input" type="date" id="ac-ech"></div>
    </div>
    <p class="hint">Une action sans responsable n'est pas une action, c'est un vœu ; une action
      sans échéance ne se fait jamais. Les deux sont donc obligatoires.</p>
  </div>`);
  modal("Action corrective", corps, [
    { label:"Annuler" },
    { label:"Ajouter", classe:"btn--primary", onClick: () => {
        try {
          DB.ajouterAction({ evenement: ev.id, etablissement: ev.etablissement,
            quoi: corps.querySelector("#ac-quoi").value,
            responsable: corps.querySelector("#ac-resp").value,
            echeance: corps.querySelector("#ac-ech").value });
        } catch (e){ toast(e.message); return false; }
        toast("Action ajoutée au plan."); rendre();
      }}
  ]);
}

/* ------------------------------------------------------------------ */
/* Le CSE, en lecture                                                  */
/* ------------------------------------------------------------------ */
/* Un écran, pas un espace. Le CSE n'a rien à saisir, rien à valider, rien à
   exporter au nom de l'entreprise : il consulte. Lui donner les mêmes vues que
   l'employeur avec des boutons désactivés serait la meilleure façon de laisser
   croire qu'il peut agir, et de lui faire chercher pendant dix minutes pourquoi
   il ne peut pas. */
/* L'aperçu d'un rapport pour le CSE : les mêmes chiffres que celui de
   l'employeur, sans le volet commercial et sans rien de nominatif. */
function apercuRapportCSE(eid, meta){
  const r = DB.rapport(eid, meta.portee);
  const rea = DB.realisations({ entreprise: eid });
  const corps = h(`<div class="stack" style="--gap:var(--s5)">
    <p class="muted" style="font-size:var(--t-sm)">
      ${esc(meta.titre)}, période du ${dateFR(meta.periode.debut)} au ${dateFR(meta.periode.fin)}${
        meta.genere_le ? `, arrêté le ${dateFR(meta.genere_le)}` : ""}.</p>
    <div class="kpis">
      ${kpi("Points retenus", nb(r.points), "après écrêtage par format")}
      ${kpi("Missions validées", nb(r.missions), "confirmées par les associations")}
      ${kpi("Salariés engagés", nb(r.salariesEngages) + " / " + nb(r.salariesTotal), "sur la saison")}
      ${kpi("Associations soutenues", nb(r.associations), "structures distinctes")}
    </div>
    ${rea.liste && rea.liste.length ? `<div>
      <h4>Ce que ces missions ont produit</h4>
      <ul class="liste-ecarts" style="margin-top:var(--s3)">${rea.liste.map(x =>
        `<li>${nb(x.quantite)} ${esc(x.quantite > 1 ? x.pl : x.un)}${
          x.estime ? ` <span class="muted">dont ${nb(x.estime)} estimés, faute de réponse de l'association</span>` : ""}</li>`).join("")}</ul>
    </div>` : ""}
    <p class="hint">Aucun nom de salarié ne figure dans ce rapport, et aucun don personnel n'y
      est compté : les dons faits à titre privé sortent de l'assiette de l'entreprise.</p>
  </div>`);
  modal(esc(meta.titre), corps, [{ label:"Fermer" }]);
}

function vueCSE(u){
  const d = DB.dossierCSE(u.org, { campagne: sessionStorage.getItem("riseva.cse.camp") || null });
  if (!d) return h(`<section class="card"><p class="empty">Aucune entreprise rattachée à cet accès.</p></section>`);
  const ind = d.indicateurs;
  const secu = d.securite;

  const el = h(`<div class="stack" style="--gap:var(--s5)">
    <section class="card card--dark grain">
      <div class="between" style="flex-wrap:wrap;gap:var(--s4)">
        <div>
          <p class="eyebrow" style="color:var(--lime)">Accès CSE, lecture seule</p>
          <h3 style="margin-top:var(--s2)">${esc(d.entreprise.nom)}, ${esc(d.saison.nom)}</h3>
          <p class="muted" style="margin-top:6px;font-size:var(--t-sm);color:#C5CDBB">
            Ce que Riseva détient déjà sur la situation sociale et la sécurité, sous forme
            agrégée. L'employeur n'a rien à recopier, vous n'avez rien à demander.</p>
          <p class="muted" style="margin-top:var(--s3);font-size:var(--t-xs);color:#A8B29B">
            <strong style="color:#DCE4CE">Cet accès s'ajoute à vos droits, il ne les remplace
            pas.</strong> Vos prérogatives d'information et de consultation, la base de données
            économiques, sociales et environnementales, et vos droits en matière de santé et de
            sécurité vous sont dus par votre employeur au titre du code du travail. Aucun contrat
            entre Riseva et votre entreprise ne peut les restreindre, et ce que vous voyez ici
            n'en épuise ni le contenu ni le calendrier. Si un chiffre manque ou paraît faux,
            c'est à l'employeur qu'il faut le demander : Riseva n'est que l'outil.</p>
        </div>
        <span class="badge badge--ok">${nb(d.points)} points retenus</span>
      </div>
    </section>

    <div class="kpis">
      ${kpi("Sites suivis", nb(d.sites.length),
            d.sites.map(x => x.nom).join(", "), "", "kpi--tete grain")}
      ${kpi("Participation",
            d.participation ? pct(d.participation.taux) + " %" : "-",
            d.participation
              ? `${nb(d.participation.engages)} salariés engagés sur ${nb(d.participation.effectif)}`
              : `masquée : moins de ${d.seuil} personnes concernées`)}
      ${kpi("Rapports disponibles", nb(d.rapports.length), "trimestriels et annuel")}
      ${kpi("Période de collecte", d.campagne ? esc(d.campagne.libelle) : "-",
            d.campagne ? `du ${dateCourte(d.campagne.debut)} au ${dateCourte(d.campagne.fin)}` : "")}
    </div>

    <section class="card">
      <div class="between" style="flex-wrap:wrap;gap:var(--s4);align-items:flex-start">
        <div>
          <h3>Indicateurs sociaux et sécurité</h3>
          <p class="muted" style="font-size:var(--t-sm);margin-top:4px">
            Uniquement les valeurs <strong>approuvées</strong> par la société. Une saisie non
            relue n'entre pas ici : elle n'entre pas non plus dans un rapport.</p>
        </div>
        <div class="row" style="--gap:var(--s3);align-items:flex-end">
          <div class="field" style="min-width:220px;margin:0">
            <label for="cseCamp">Période</label>
            <select class="select" id="cseCamp">
              ${d.campagnes.map(c => `<option value="${c.id}"${
                d.campagne && c.id === d.campagne.id ? " selected" : ""}>${esc(c.libelle)}</option>`).join("")}
            </select>
          </div>
          <button class="btn btn--ghost btn--sm" id="cseDico">Dictionnaire des données</button>
        </div>
      </div>
      ${!ind || !ind.sites ? `<p class="empty" style="margin-top:var(--s5)">Aucune donnée approuvée sur cette période.</p>` : `
      <p class="hint" style="margin-top:var(--s4)">Périmètre : ${nb(ind.sites)} site${ind.sites > 1 ? "s" : ""}
        sur ${nb(ind.attendus)}, soit ${nb(ind.effectifCouvert)} salariés sur ${nb(ind.effectifTotal)}.
        ${!ind.complet ? "Périmètre incomplet : les sites qui n'ont pas répondu ne sont pas comblés avec la période précédente." : ""}</p>
      <div class="tableau"><table class="table" style="margin-top:var(--s5)"><thead><tr>
        <th>Indicateur</th><th style="text-align:right">Valeur</th><th>Comment il est calculé</th>
      </tr></thead><tbody>
        ${INDICATEURS.calcules.map(x => `<tr>
          <td><strong>${esc(x.libelle)}</strong></td>
          <td class="tnum" style="text-align:right">${ind.calcules[x.cle] !== null
            ? nb2(ind.calcules[x.cle]) + (x.unite ? " " + x.unite : "")
            : `<span class="muted">non disponible</span>`}</td>
          <td class="muted" style="font-size:var(--t-xs)">${esc(x.formule)}${
            x.reglementaire ? "" : ", indicateur interne, non réglementaire"}</td>
        </tr>`).join("")}
        ${INDICATEURS.saisis.map(x => `<tr>
          <td>${esc(x.libelle)}</td>
          <td class="tnum" style="text-align:right">${ind.somme[x.cle] != null
            ? nb(ind.somme[x.cle]) + (x.unite ? " " + esc(x.unite) : "")
            : `<span class="muted">non disponible</span>`}</td>
          <td class="muted" style="font-size:var(--t-xs)">déclaré par les sites, ${esc(x.source || "")}</td>
        </tr>`).join("")}
      </tbody></table></div>`}
    </section>

    ${secu.sous_seuil ? `<section class="card card--flat"
      style="background:var(--warn-bg);border-color:transparent">
      <h3 style="font-size:var(--t-lg)">Événements de sécurité</h3>
      <p class="muted" style="font-size:var(--t-sm);margin-top:4px">
        Moins de ${d.seuil} événements déclarés sur la saison : le détail n'est pas restitué.
        Un décompte par type, à ce volume, désigne quelqu'un. Les taux calculés, eux, restent
        dans le tableau ci-dessus.</p>
    </section>` : ""}
    ${secu.pareto.length ? `<section class="card">
      <h3>Événements de sécurité de la saison</h3>
      <p class="muted" style="font-size:var(--t-sm);margin-top:4px">
        Les types d'événements déclarés par les sites, du plus fréquent au moins fréquent.
        Aucun nom, aucune donnée de santé : ni identité, ni siège de la lésion, ni diagnostic.
        ${secu.sites_sans_registre.length ? `${secu.sites_sans_registre.length} site${
          secu.sites_sans_registre.length > 1 ? "s ne tiennent" : " ne tient"} pas le registre -
          ${esc(secu.sites_sans_registre.join(", "))} : ces sites n'ont pas « zéro accident »,
          ils n'ont rien déclaré ici.` : ""}</p>
      <div style="margin-top:var(--s5)">${secu.pareto.map(x => `
        <div style="margin-bottom:var(--s4)">
          <div class="between" style="font-size:var(--t-sm)">
            <span>${esc(x.label)}</span>
            <span class="tnum muted">${nb(x.nombre)}, ${pct(x.part)} %</span></div>
          <div class="bar" style="margin-top:4px"><i style="width:${
            (x.nombre / secu.pareto[0].nombre) * 100}%"></i></div>
        </div>`).join("")}</div>
      <p class="hint" style="margin-top:var(--s4)">${nb(secu.total.sans_soin)} événement${
        secu.total.sans_soin > 1 ? "s" : ""} sans soin, les presqu'accidents ne comptent dans
        aucun taux : les compter ferait monter la fréquence au moment où la prévention
        s'améliore.</p>
    </section>` : ""}

    <div class="two">
      <section class="card">
        <h3>Rapports de la saison</h3>
        <div id="cseRap" style="margin-top:var(--s5)"></div>
      </section>
      <section class="card card--flat" style="background:var(--warn-bg);border-color:transparent">
        <h3 style="font-size:var(--t-lg)">Ce que cet accès ne montre pas</h3>
        <ul class="liste-ecarts" style="margin-top:var(--s4)">${
          d.exclus.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
        <p class="hint" style="margin-top:var(--s4)">Ce n'est pas un réglage : c'est la
          construction. Un accès qui permettrait de savoir qui a fait quoi transformerait un
          droit d'information en outil de contrôle, et Riseva en moyen de surveillance.</p>
      </section>
    </div>
  </div>`);

  const r = el.querySelector("#cseRap");
  if (!d.rapports.length) r.appendChild(vide({ titre:"Aucun rapport encore arrêté",
    texte:"Les rapports sont produits à la clôture de chaque période." }));
  else {
    const tb = h(`<div class="tableau"><table class="table"><thead><tr>
      <th>Rapport</th><th>Période</th><th>Arrêté le</th><th></th></tr></thead><tbody></tbody></table></div>`);
    d.rapports.forEach(x => {
      const tr = h(`<tr><td><strong>${esc(x.titre)}</strong></td>
        <td class="muted">${dateCourte(x.periode.debut)}, ${dateCourte(x.periode.fin)}</td>
        <td class="muted tnum">${x.genere_le ? dateCourte(x.genere_le) : "-"}</td>
        <td style="text-align:right"></td></tr>`);
      const b = h(`<button class="btn btn--ghost btn--sm">Lire</button>`);
      b.onclick = () => apercuRapportCSE(u.org, x);
      tr.lastElementChild.appendChild(b);
      tb.querySelector("tbody").appendChild(tr);
    });
    r.appendChild(tb);
  }

  el.querySelector("#cseCamp").onchange = (ev) => {
    sessionStorage.setItem("riseva.cse.camp", ev.target.value); rendre();
  };
  el.querySelector("#cseDico").onclick = () => {
    if (d.campagne) ouvrirDictionnaire(d.campagne.id);
    else toast("Aucune période de collecte à documenter.");
  };
  return el;
}

/* ------------------------------------------------------------------ */
/* Dictionnaire des données                                           */
/* ------------------------------------------------------------------ */
function ouvrirDictionnaire(cid){
  const d = DB.dictionnaire(cid);
  const corps = h(`<div class="stack" style="--gap:var(--s6)">
    <div>
      <p class="muted" style="font-size:var(--t-sm)">
        Version ${esc(d.version)}${d.campagne ? `, ${esc(d.campagne.libelle)},
        du ${dateCourte(d.campagne.debut)} au ${dateCourte(d.campagne.fin)}` : ""}.
        Le dictionnaire est daté avec la campagne : une définition qui change plus tard ne
        réécrit pas les rapports déjà arrêtés.</p>
      ${d.collecte ? `<p class="muted" style="font-size:var(--t-sm);margin-top:var(--s2)">
        Périmètre déclaré : ${nb(d.collecte.sites_approuves)} site${d.collecte.sites_approuves > 1 ? "s" : ""}
        approuvé${d.collecte.sites_approuves > 1 ? "s" : ""} sur ${nb(d.collecte.sites_attendus)}
        attendu${d.collecte.sites_attendus > 1 ? "s" : ""}${d.collecte.sites_sans_reponse
          ? `, ${nb(d.collecte.sites_sans_reponse)} clos sans réponse` : ""}.</p>` : ""}
    </div>

    <div>
      <h4>Ce que les sites déclarent</h4>
      <div class="tableau"><table class="table" style="margin-top:var(--s4)"><thead><tr>
        <th>Indicateur</th><th>Source</th><th>On compte</th><th>On ne compte pas</th>
      </tr></thead><tbody>
        ${d.saisis.map(x => `<tr>
          <td><strong>${esc(x.libelle)}</strong>${x.unite ? `<br><span class="muted" style="font-size:var(--t-xs)">${esc(x.unite)}, ${esc(x.niveau)}</span>` : ""}</td>
          <td class="muted" style="font-size:var(--t-xs)">${esc(x.source || "-")}</td>
          <td class="muted" style="font-size:var(--t-xs)">${esc(x.inclut || "-")}</td>
          <td class="muted" style="font-size:var(--t-xs)">${esc(x.exclut || "-")}</td>
        </tr>`).join("")}
      </tbody></table></div>
    </div>

    <div>
      <h4>Ce que Riseva calcule</h4>
      <div class="tableau"><table class="table" style="margin-top:var(--s4)"><thead><tr>
        <th>Indicateur</th><th>Formule</th><th>Agrégation</th><th>Réglementaire</th>
      </tr></thead><tbody>
        ${d.calcules.map(x => `<tr>
          <td><strong>${esc(x.libelle)}</strong>${x.note ? `<br><span class="muted" style="font-size:var(--t-xs)">${esc(x.note)}</span>` : ""}</td>
          <td class="muted" style="font-size:var(--t-xs)">${esc(x.formule)}<br>
            <span style="font-family:var(--font-mono)">${esc(x.numerateur)} / ${esc(x.denominateur)}</span></td>
          <td class="muted" style="font-size:var(--t-xs)">${esc(x.agregation)}</td>
          <td>${x.reglementaire ? `<span class="badge badge--ok">oui</span>`
                                : `<span class="badge badge--attente">non</span>`}</td>
        </tr>`).join("")}
      </tbody></table></div>
    </div>

    ${d.explications.length ? `<div>
      <h4>Variations expliquées par les sites</h4>
      <p class="muted" style="font-size:var(--t-sm);margin-top:4px">Au-delà de
        ${Math.round(d.seuil_ecart * 100)} % de variation, le site doit dire ce qui s'est passé.
        Un événement réel et une erreur de saisie se ressemblent exactement dans une base.</p>
      <div class="tableau"><table class="table" style="margin-top:var(--s4)"><thead><tr>
        <th>Site</th><th>Écart</th><th>Explication</th></tr></thead><tbody>
        ${d.explications.map(x => `<tr>
          <td>${esc(x.site)}</td>
          <td class="muted" style="font-size:var(--t-xs)">${x.ecarts.map(esc).join("<br>")}</td>
          <td class="muted" style="font-size:var(--t-xs)">${esc(x.commentaire)}</td>
        </tr>`).join("")}
      </tbody></table></div></div>` : ""}

    <div class="card card--flat" style="background:var(--warn-bg);border-color:transparent">
      <h4>Ce que Riseva ne fait pas</h4>
      <ul class="liste-ecarts" style="margin-top:var(--s3)">${
        d.limites.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
    </div>
  </div>`);

  modal("Dictionnaire des données", corps, [
    { label:"Fermer" },
    { label:"Exporter", classe:"btn--ghost", onClick: () => {
        versCSV("riseva-dictionnaire-donnees.csv",
          ["Type", "Indicateur", "Unité", "Niveau", "Source ou formule", "On compte", "On ne compte pas", "Agrégation"],
          [...d.saisis.map(x => ["déclaré", x.libelle, x.unite, x.niveau, x.source,
                                 x.inclut || "", x.exclut || "", x.agregation]),
           ...d.calcules.map(x => ["calculé", x.libelle, x.unite, x.niveau, x.formule,
                                   x.numerateur, x.denominateur, x.agregation])]);
        toast("Dictionnaire exporté.");
        return false; }}
  ]);
}

/* Ouvrir une collecte, c'est surtout choisir ce qu'on NE demande pas. Un
   formulaire de vingt-sept champs envoyé à quatorze sites revient à moitié
   rempli ; six champs demandés à quatorze sites reviennent entiers. L'écran
   affiche donc, en permanence, le nombre de valeurs que chaque site devra
   trouver — c'est le seul chiffre qui prédit le taux de réponse, et il vaut
   mieux le voir avant d'envoyer qu'après.

   Les rubriques sont écrites sur la campagne et n'en bougent plus. Une collecte
   close doit continuer à dire ce qu'elle demandait : sans cela, ses totaux
   deviennent illisibles dès qu'on ajoute une rubrique au catalogue. */
function formCampagne(u, gid, derniere){
  if (!gid) return toast("Ce compte n'est rattaché à aucun groupe.");
  const dejaPrises = derniere && Array.isArray(derniere.rubriques) && derniere.rubriques.length
    ? derniere.rubriques : RUBRIQUES.filter(r => r.defaut).map(r => r.cle);
  const corps = h(`<div class="stack" style="--gap:var(--s5)">
    <p class="muted" style="font-size:var(--t-sm)">
      Chaque site verra apparaître sur son écran ce que vous demandez ici, et un rappel
      à l'approche de l'échéance. Vous n'avez personne à relancer : quand tout le monde
      a répondu, le rapport se fabrique tout seul.</p>
    <div class="two" style="--gap:var(--s4)">
      <div class="field"><label for="c-lib">Nom de la période</label>
        <input class="input" id="c-lib" placeholder="Second semestre 2026">
        <p class="hint">C'est ce nom que liront les sites.</p></div>
      <div class="field"><label for="c-per">Code</label>
        <input class="input" id="c-per" placeholder="2026-S2">
        <p class="hint">Court et stable, il sert de nom de fichier aux exports.</p></div>
    </div>
    <div class="two" style="--gap:var(--s4)">
      <div class="field"><label for="c-deb">Début de la période</label>
        <input class="input" id="c-deb" type="date"></div>
      <div class="field"><label for="c-fin">Fin de la période</label>
        <input class="input" id="c-fin" type="date">
        <p class="hint">Une période non terminée ne se collecte pas : les sites
          n'auraient rien à déclarer.</p></div>
    </div>
    <div class="field"><label for="c-ech">Date limite de réponse</label>
      <input class="input" id="c-ech" type="date">
      <p class="hint">Passée cette date, la collecte peut être close. Les sites qui
        n'ont rien dit sont marqués « sans réponse », leur période précédente n'est
        jamais recopiée à leur place.</p></div>
    <div>
      <label style="display:block;font-size:var(--t-sm);font-weight:600">Ce que vous demandez</label>
      <div class="stack" style="--gap:var(--s3);margin-top:var(--s3)" id="c-rub">
        ${RUBRIQUES.map(r => `<label class="checkline">
          <input type="checkbox" value="${r.cle}" ${dejaPrises.includes(r.cle) ? "checked" : ""}>
          <span><strong>${esc(r.libelle)}</strong>
            <span class="muted" style="font-size:var(--t-xs)"> ${nb(INDICATEURS.saisis.filter(d => d.rubrique === r.cle).length)} valeurs</span>
            <br><span class="muted" style="font-size:var(--t-xs)">${esc(r.aide)}</span></span>
        </label>`).join("")}
      </div>
      <p class="hint" id="c-cpt" style="margin-top:var(--s3)"></p>
    </div>
  </div>`);

  const cases = () => [...corps.querySelectorAll("#c-rub input:checked")].map(i => i.value);
  const cpt = corps.querySelector("#c-cpt");
  const majCpt = () => {
    const n = INDICATEURS.saisis.filter(d => cases().includes(d.rubrique)).length;
    cpt.textContent = !n
      ? "Aucune rubrique choisie : il n'y aurait rien à demander."
      : `${n} valeur${n > 1 ? "s" : ""} à trouver pour chaque site. `
        + (n <= 8 ? "Un formulaire qui se remplit d'une traite."
           : n <= 16 ? "Il faudra ouvrir deux ou trois dossiers : prévoyez le délai."
           : "C'est beaucoup pour une seule fois. Deux collectes valent souvent mieux qu'une.");
  };
  corps.querySelectorAll("#c-rub input").forEach(i => i.addEventListener("change", majCpt));
  majCpt();

  modal("Nouvelle collecte", corps, [
    { label: "Annuler", classe: "btn--ghost" },
    { label: "Ouvrir la collecte", classe: "btn--primary", onClick: () => {
        try {
          const c = DB.ouvrirCampagne({ groupe: gid,
            libelle: corps.querySelector("#c-lib").value,
            periode: corps.querySelector("#c-per").value,
            debut: corps.querySelector("#c-deb").value,
            fin: corps.querySelector("#c-fin").value,
            echeance: corps.querySelector("#c-ech").value,
            rubriques: cases() });
          sessionStorage.setItem("riseva.campagne", c.id);
          toast("Collecte ouverte. Chaque site la voit maintenant sur son écran.");
          rendre();
        } catch (err){ toast(err.message); return false; }
      } }
  ]);
}

function formIndicateurs(u, cid, et){
  const o = DB.observation(cid, et.id);
  const v = (o && o.valeurs) || {};
  const corps = h(`<div class="stack" style="--gap:var(--s4)">
    <p class="muted" style="font-size:var(--t-sm)">
      Laissez vide ce que vous n'avez pas : Riseva écrira « non disponible » plutôt que
      de compléter. ${o && o.etat === "approuve"
        ? `<strong style="color:var(--ink)">Ces valeurs sont approuvées</strong> : les modifier
           produira une version ${o.version + 1}, et il faudra les approuver à nouveau.` : ""}
    </p>
    <div class="stack" style="--gap:var(--s4)" id="ch"></div>
    <div id="ec"></div>
    <div class="field">
      <label for="i-com">Ce qui explique une variation, s'il y en a une</label>
      <textarea class="textarea" id="i-com" rows="2"
        placeholder="Un événement, un changement de périmètre, une correction...">${esc((o && o.commentaire) || "")}</textarea>
      <p class="hint">Au-delà de ${Math.round(SEUIL_ECART * 100)} % de variation sur un
      indicateur calculé, une phrase est demandée. Elle suit la valeur jusque dans le
      rapport : c'est elle qui répondra, dans un an, devant une courbe qui saute.</p>
    </div>
  </div>`);
  const box = corps.querySelector("#ch");
  /* Quand le site tient son registre, les quatre valeurs de sécurité ne se
     saisissent plus : elles se déduisent. Les laisser modifiables et les écraser
     ensuite en silence serait pire que de les verrouiller. */
  const derive = DB.valeursDeriveesDuRegistre(cid, et.id);
  if (derive) box.appendChild(h(`<div class="card card--flat"
    style="padding:var(--s4);background:var(--ok-bg);border-color:transparent">
    <p style="font-size:var(--t-sm);color:var(--ink-600)">
      <strong style="color:var(--ink)">Ce site tient son registre de sécurité.</strong>
      Les accidents et les journées perdues sont déduits des événements déclarés sur la
      période : il n'y a rien à recopier ici, et les deux chiffres ne peuvent plus diverger.</p>
  </div>`));
  /* Un formulaire rangé par rubriques, et pas une colonne de vingt-sept champs.
     Ce n'est pas de l'ornement : les valeurs d'une rubrique viennent d'une même
     source et d'une même personne — la paie pour les effectifs, le registre pour
     la sécurité, les factures pour l'énergie. Groupées, elles se remplissent en
     une fois ; mélangées, elles obligent à rouvrir trois dossiers.

     Seules les rubriques demandées par CETTE campagne sont affichées. Un site à
     qui l'on demande l'énergie au mois d'août ne doit pas voir passer douze
     champs sociaux qu'on ne lui demande pas cette fois-ci. */
  const sections = sectionsDe(DB.campagne(cid));
  const champsDemandes = sections.flatMap(r => r.champs);
  sections.forEach(r => {
    const bloc = h(`<div class="stack" style="--gap:var(--s4)">
      <div>
        <h4 style="font-size:var(--t-md);margin:0">${esc(r.libelle)}</h4>
        <p class="muted" style="font-size:var(--t-xs);margin-top:2px">${esc(r.aide)}</p>
      </div>
    </div>`);
    r.champs.forEach(d => {
      const auto = derive && DB.CLES_DU_REGISTRE.includes(d.cle);
      /* `inclut` et `exclut` valent mieux qu'une définition en prose : c'est là que
         deux sites divergent sans le savoir, l'un comptant les intérimaires et
         l'autre non, et c'est invisible une fois les chiffres additionnés. */
      bloc.appendChild(h(`<div class="field">
        <label for="i-${d.cle}">${esc(d.libelle)}${d.unite ? ` <span class="muted">(${esc(d.unite)})</span>` : ""}
          ${auto ? `<span class="badge badge--ok" style="height:20px;margin-left:6px">déduit du registre</span>` : ""}</label>
        <input class="input" id="i-${d.cle}" type="number" min="0" step="any"
          value="${auto ? derive[d.cle] : (v[d.cle] ?? "")}"${auto ? " readonly disabled" : ""}>
        <p class="hint">${esc(d.aide)}</p>
        ${d.inclut ? `<p class="hint"><strong>On compte :</strong> ${esc(d.inclut)}.
          <strong>On ne compte pas :</strong> ${esc(d.exclut)}.</p>` : ""}
      </div>`));
    });
    box.appendChild(bloc);
  });

  /* Les valeurs déjà saisies pour une rubrique qui n'est plus demandée ne sont
     pas effacées : elles restent dans `v` et repartent telles quelles. Une
     campagne qui rétrécit ne doit pas détruire ce qu'une campagne plus large
     avait recueilli. */
  const lire = () => {
    const vals = {};
    champsDemandes.forEach(d => {
      const champ = corps.querySelector(`#i-${d.cle}`);
      if (champ && !champ.disabled) vals[d.cle] = champ.value;
    });
    return { ...v, ...(derive || {}), ...vals };
  };
  /* Les écarts s'affichent pendant la saisie, pas au moment du refus : découvrir
     qu'on doit se justifier après avoir rempli douze champs est la meilleure
     façon d'obtenir « RAS ». */
  const ec = corps.querySelector("#ec");
  const majEcarts = () => {
    const l = DB.ecartsAvecPeriodePrecedente(cid, et.id, { ...v, ...lire() });
    ec.innerHTML = !l.length ? "" :
      `<div class="card card--flat" style="padding:var(--s4);background:var(--warn-bg);border-color:transparent">
        <p style="font-size:var(--t-sm);font-weight:600">Variation notable par rapport à ${esc(l[0].periode_avant)}</p>
        <ul class="liste-ecarts" style="margin-top:var(--s2)">${l.map(x =>
          `<li>${esc(x.libelle)} : ${x.variation > 0 ? "+" : ""}${Math.round(x.variation * 100)} %
           (${nb(Math.round(x.avant))} -> ${nb(Math.round(x.apres))})</li>`).join("")}</ul>
      </div>`;
  };
  box.querySelectorAll("input").forEach(i => i.addEventListener("input", majEcarts));
  majEcarts();

  modal(`${et.nom}, ${et.ville}`, corps, [
    { label: "Annuler", classe: "btn--ghost" },
    { label: "Enregistrer", classe: "btn--primary", onClick: () => {
        try { DB.saisirIndicateurs(cid, et.id, lire(), u.id,
                corps.querySelector("#i-com").value);
              toast("Saisie enregistrée. Elle attend une approbation."); rendre(); }
        /* La fenêtre reste ouverte : sinon la saisie est perdue et le message
           d'erreur avec elle. */
        catch (err){ toast(err.message); return false; }
      } }
  ]);
}

/* Rattacher quelqu'un ailleurs : c'est une correction, pas une sanction, et elle
   doit rester possible sans passer par la société. */
function reaffecter(u, g){
  const etabs = DB.etablissements(u.org);
  const corps = h(`<div class="stack" style="--gap:var(--s4)">
    <p class="muted" style="font-size:var(--t-sm)">
      ${esc(g.nom)} s'est inscrit avec le lien d'un site qui n'est peut-être pas le sien.
      Choisissez le bon : ses futures missions y seront comptées. Les missions déjà faites,
      elles, restent où elles ont été faites.</p>
    <div class="field"><label for="ra-et">Établissement</label>
      <select class="select" id="ra-et">
        ${etabs.map(x => `<option value="${x.id}" ${x.id === g.etablissement ? "selected" : ""}>${esc(x.nom)}, ${esc(x.ville)} (${nb(DB.sieges(u.org, { etablissement: x.id }).restants)} places libres)</option>`).join("")}
      </select></div>
  </div>`);
  modal("Rattacher à un autre site", corps, [
    { label: "Annuler", classe: "btn--ghost" },
    { label: "Rattacher", classe: "btn--primary", onClick: () => {
        try { DB.confirmerAffectation(g.id, corps.querySelector("#ra-et").value);
              toast("Rattachement enregistré."); rendre(); }
        catch (e){ toast(e.message); }
      } }
  ]);
}

/* Le tableau de bord d'un référent de site : son site, et rien d'autre. */
function tableauSite(u){
  const et = DB.etablissement(u.etablissement);
  if (!et) return h(`<section class="card"><p class="empty">Aucun site rattaché à ce compte.</p></section>`);
  const si = DB.sieges(u.org, { etablissement: et.id });
  const gens = DB.salaries(u.org).filter(x => x.etablissement === et.id && !x.anonyme);
  /* Meme regle que partout cote employeur : un don personnel ne compte pas dans
     les points du site. Il faisait remonter un site dans le challenge interne a
     cause d'un versement prive de l'un de ses salaries. */
  const ms = DB.missionsVueEmployeur(u.org)
    .filter(m => !m.masquee)
    .filter(m => (m.etablissement || (DB.utilisateur(m.salarie) || {}).etablissement) === et.id);
  const validees = ms.filter(m => ["validee", "validee_auto"].includes(m.etat));
  const points = validees.reduce((n, m) => n + (m.points || 0), 0);
  const camp = DB.campagnes(DB.entreprise(u.org)?.groupe)
    .filter(c => c.etat === "ouverte")[0];
  const obs = camp ? DB.observation(camp.id, et.id) : null;
  const inv = DB.invitations(u.org).find(i => i.etablissement === et.id && i.active && !i.pour_referent);

  const aConfirmer = DB.affectationsAConfirmer(u.org, et.id);
  const prochains = DB.missions({ entreprise: u.org })
    .filter(m => (m.etablissement || (DB.utilisateur(m.salarie) || {}).etablissement) === et.id)
    .filter(m => ["engagee", "a_valider"].includes(m.etat))
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  const el = h(`<div class="stack" style="--gap:var(--s5)">
    ${aConfirmer.length ? `<section class="card card--flat" style="background:var(--warn-bg);border-color:transparent">
      <h3 style="font-size:var(--t-lg)">${nb(aConfirmer.length)} compte${aConfirmer.length > 1 ? "s" : ""} à rattacher</h3>
      <p class="muted" style="font-size:var(--t-sm);margin-top:4px;color:var(--ink-600);max-width:76ch">
        Ces personnes se sont inscrites avec votre lien. Une adresse professionnelle ne dit pas
        sur quel site quelqu'un travaille : tant que vous n'avez pas confirmé, elles peuvent tout
        consulter mais pas s'engager, leurs points iraient au mauvais endroit.</p>
      <div class="tableau"><table class="table" style="margin-top:var(--s5)"><tbody id="conf"></tbody></table></div>
    </section>` : ""}

    ${camp && !obs ? `<section class="card card--flat" style="background:var(--warn-bg);border-color:transparent">
      <div class="between" style="flex-wrap:wrap;gap:var(--s4)">
        <div><h3 style="font-size:var(--t-lg)">Indicateurs à saisir</h3>
        <p class="muted" style="font-size:var(--t-sm);margin-top:4px;color:var(--ink-600)">
          ${esc(camp.libelle)}, il reste ${DB.joursAvant(camp.echeance)} jours. Sans réponse,
          la période sera close sans vos chiffres, et le rapport le dira.</p></div>
        <a class="btn btn--primary btn--sm" href="#/indicateurs">Saisir</a>
      </div></section>` : ""}

    <div class="kpis">
      ${/* « 1 mobilisé sur 2 comptes » mesure les inscrits, pas la participation.
            La participation se rapporte à l'effectif du site — c'est le seul
            dénominateur qui ne bouge pas avec le rythme des inscriptions. */
        kpi("Salariés mobilisés", nb(new Set(validees.map(m => m.salarie)).size),
            et.effectif
              ? `${pct((new Set(validees.map(m => m.salarie)).size / et.effectif) * 100)} % de l'effectif du site (${nb(et.effectif)})`
              : "effectif du site non renseigné", "", "kpi--tete grain")}
      ${kpi("Comptes ouverts", `${nb(si.pris)} / ${nb(si.total)}`,
            `${nb(si.restants)} places restantes sur votre quota`)}
      ${kpi("Missions validées", nb(validees.length),
            `dont ${nb(validees.filter(m => m.etat === "validee").length)} confirmées`)}
      ${kpi("Points du site", nb(points),
            et.effectif ? `${pct(points / et.effectif, 2)} par salarié` : "")}
    </div>

    ${prochains.length ? `<section class="card">
      <div class="between" style="margin-bottom:var(--s5)">
        <h3>Ce qui arrive</h3>
        <a class="btn btn--quiet btn--sm" href="#/missions">Toutes les missions</a>
      </div>
      <div class="tableau"><table class="table"><thead><tr>
        <th>Quand</th><th>Qui</th><th>Où</th><th>État</th>
      </tr></thead><tbody>
        ${prochains.slice(0, 6).map(m => {
          const a2 = DB.annonceDe(m) || {}, sal2 = DB.utilisateur(m.salarie) || {};
          const as = DB.association(a2.asso) || {};
          return `<tr>
            <td class="muted tnum">${dateCourte(m.date)}</td>
            <td><strong>${esc(sal2.nom || "-")}</strong></td>
            <td class="muted">${esc(as.nom || "-")}<br>
              <span style="font-size:var(--t-xs)">${esc(a2.titre || "")}</span></td>
            <td><span class="badge ${ETATS_MISSION[m.etat].badge}">${ETATS_MISSION[m.etat].label}</span></td>
          </tr>`; }).join("")}
      </tbody></table></div>
    </section>` : ""}

    <section class="card">
      <div class="between" style="margin-bottom:var(--s5)">
        <h3>Inviter vos salariés</h3></div>
      <p class="muted" style="font-size:var(--t-sm)">
        Ce lien ouvre des comptes sur <strong style="color:var(--ink)">${esc(et.nom)}, ${esc(et.ville)}</strong>,
        dans la limite de votre quota. Il ne donne aucun droit d'administration.</p>
      ${inv ? `<div class="copyline" style="margin-top:var(--s5)">
        <input class="input" id="lienSite" readonly aria-label="Lien d'inscription de votre site"
          value="${esc(lienPublic("/rejoindre.html?code=" + inv.code))}">
        <button class="btn btn--primary btn--sm" id="copySite" style="flex:none">Copier</button></div>
        <p class="hint" style="margin-top:6px">${inv.utilisees} compte${inv.utilisees > 1 ? "s" : ""} créé${inv.utilisees > 1 ? "s" : ""} par ce lien, expire le ${dateFR(inv.expire_le)}</p>`
      : `<button class="btn btn--primary" style="margin-top:var(--s5)" id="newLien">Créer le lien de mon site</button>`}
    </section>
  </div>`);

  const boxC = el.querySelector("#conf");
  aConfirmer.forEach(g => {
    const tr = h(`<tr>
      <td><strong>${esc(g.nom)}</strong><br>
        <span class="muted" style="font-size:var(--t-xs)">${esc(g.email || "")}</span></td>
      <td style="text-align:right;white-space:nowrap"></td></tr>`);
    const ok = h(`<button class="btn btn--primary btn--sm">Il travaille ici</button>`);
    ok.onclick = () => {
      try { DB.confirmerAffectation(g.id, et.id); toast("Rattachement confirmé."); rendre(); }
      catch (e){ toast(e.message); }
    };
    const autre = h(`<button class="btn btn--quiet btn--sm" style="margin-left:6px">Autre site</button>`);
    autre.onclick = () => reaffecter(u, g);
    tr.querySelector("td:last-child").append(ok, autre);
    boxC.appendChild(tr);
  });

  el.querySelector("#copySite")?.addEventListener("click", () => {
    navigator.clipboard?.writeText(el.querySelector("#lienSite").value);
    toast("Lien copié.");
  });
  el.querySelector("#newLien")?.addEventListener("click", () => {
    try { DB.creerInvitation(u.org, et.quota, et.id); toast("Lien créé."); rendre(); }
    catch (e){ toast(e.message); }
  });
  return el;
}

/* ------------------------------------------------------------------ */
/* Registre des dons de matériel — loi AGEC                            */
/* ------------------------------------------------------------------ */
/* Le service le plus proche de l'axe associatif, et le seul qui réponde à une
   interdiction : les invendus non alimentaires ne peuvent plus être éliminés.
   Riseva ne fait rien de plus que ce qu'elle fait déjà — elle met en face du don
   la structure qui l'a reçu et sa déclaration de réception — mais elle le range
   là où un contrôle le cherchera. */
function vueMateriel(u){
  const r = DB.registreMateriel(u.org);
  const el = h(`<div class="stack" style="--gap:var(--s5)">
    <div class="kpis">
      ${kpi("Dons de matériel", nb(r.total),
            `dont ${nb(r.confirmes)} confirmés par l'association`, "", "kpi--tete grain")}
      ${/* « 0 / 0, tous valorises » : un zero sur zero presente comme une
            reussite. Sur un ensemble vide, on ne dit rien d'autre que le vide. */""}
      ${r.total
        ? kpi("Valorisés", `${nb(r.valorisees)} / ${nb(r.total)}`,
              r.sansValeur ? `${nb(r.sansValeur)} sans valeur déclarée` : "tous valorisés")
        : kpi("Valorisés", "-", "aucun don à valoriser pour l'instant")}
      ${kpi("Valeur déclarée", eur(r.valeur),
            "somme des valeurs que vous avez déclarées, méthode comprise")}
      ${/* « Réduction correspondante » se lisait comme un montant acquis. Ce n'en
            est pas un tant que le don n'est pas reçu, valorisé, approuvé, rattaché
            au bon SIREN et plafonné avec les dons faits ailleurs. */
        kpi("Estimation fiscale maximale", eur(Math.round(r.valeur * FISCAL.taux_reduction)),
            "non déclarable à ce stade : plafond non appliqué, réception et valorisation à confirmer")}
    </div>

    <section class="card">
      <div class="between" style="margin-bottom:var(--s5);align-items:flex-start">
        <div><h3>Registre des dons de matériel</h3>
        <p class="muted" style="font-size:var(--t-sm);margin-top:4px;max-width:78ch">
          Depuis la loi relative à la lutte contre le gaspillage, les invendus non
          alimentaires ne peuvent plus être éliminés : ils doivent être réemployés,
          réutilisés ou recyclés, et le don à une association est la voie prévue par le
          texte. Ce registre est la trace de ces dons, quoi, combien, à qui, quand, et
          qui l'a confirmé.</p></div>
        <button class="btn btn--ghost btn--sm" id="csvM">Exporter</button>
      </div>
      <div style="overflow-x:auto"><div class="tableau"><table class="table"><thead><tr>
        <th>Date</th><th>Nature</th><th style="text-align:right">Quantité</th>
        <th>Association</th><th>Site</th><th>Catégorie</th>
        <th style="text-align:right">Valeur déclarée</th>
        <th>Réception</th><th>Reçu</th><th></th>
      </tr></thead><tbody></tbody></table></div></div>
    </section>

    <section class="card card--flat" style="background:var(--warn-bg);border-color:transparent">
      <h3 style="font-size:var(--t-lg)">Ce n'est jamais le prix neuf, et ce n'est pas une seule méthode</h3>
      <p class="muted" style="font-size:var(--t-sm);margin-top:var(--s3);max-width:78ch;color:var(--ink-600)">
        La méthode dépend de la nature comptable du bien, et
        <strong style="color:var(--ink)">la valorisation relève de votre responsabilité</strong>,
        pas de la nôtre. Riseva enregistre une valeur que vous déclarez, rappelle la méthode qui
        s'applique, et n'en choisit aucune à votre place.
      </p>
      <ul class="stack" style="--gap:var(--s3);margin-top:var(--s4);font-size:var(--t-sm);
        list-style:none;color:var(--ink-600)">
        ${DB.CATEGORIES_MATERIEL.map(c => `<li><strong style="color:var(--ink)">${esc(c.label)}</strong>, ${esc(c.methode)}</li>`).join("")}
      </ul>
      <p class="muted" style="font-size:var(--t-sm);margin-top:var(--s4);max-width:78ch;color:var(--ink-600)">
        Retenir la valeur catalogue fabriquerait une réduction d'impôt indue, et c'est ce qu'un
        contrôle vérifie en premier. Le plafond, lui, dépend aussi des dons que vous avez faits
        hors Riseva : sans eux, aucun reliquat fiable ne peut être calculé.
      </p>
    </section>
  </div>`);

  const tb = el.querySelector("tbody");
  if (!r.lignes.length){
    tb.appendChild(h(`<tr><td colspan="10"></td></tr>`));
    tb.querySelector("td").appendChild(vide({
      titre: "Aucun don de matériel",
      texte: "Les dons de matériel de vos équipes apparaîtront ici, avec la structure qui les a reçus."
    }));
  }
  r.lignes.forEach(x => {
    const cat = (DB.CATEGORIES_MATERIEL.find(c => c.cle === x.categorie) || {}).label;
    const tr = h(`<tr>
      <td class="muted tnum">${dateCourte(x.date)}</td>
      <td><strong>${esc(x.nature)}</strong>
        ${x.reference ? `<br><span class="muted" style="font-size:var(--t-xs)">${esc(x.reference)}</span>` : ""}
        ${x.effacementDonnees === true ? `<br><span class="badge badge--ok" style="margin-top:4px">données effacées</span>` : ""}</td>
      <td class="tnum" style="text-align:right">${nb(x.quantite)} ${esc(x.unite)}</td>
      <td class="muted">${esc(x.association)}${x.ville ? `<br><span style="font-size:var(--t-xs)">${esc(x.ville)}</span>` : ""}
        ${x.eligible ? "" : `<br><span class="badge badge--warn" style="margin-top:4px">éligibilité non déclarée</span>`}</td>
      <td class="muted">${esc(x.etablissement)}<br>
        <span style="font-size:var(--t-xs)">${esc(x.societe)}${x.siren ? `, ${esc(x.siren)}` : ""}</span></td>
      <td class="muted" style="font-size:var(--t-xs)">${cat
        ? esc(cat) : `<span class="badge badge--warn">à préciser</span>`}</td>
      <td class="tnum" style="text-align:right">${x.valeurDeclaree === null
        ? `<span class="badge badge--warn">à valoriser</span>` : eur(x.valeurDeclaree)}</td>
      <td>${x.confirme ? `<span class="badge badge--ok">association</span>`
        : x.etat === "validee_auto" ? `<span class="badge badge--neutre">clôture d'office</span>`
        : `<span class="badge ${ETATS_MISSION[x.etat].badge}">${ETATS_MISSION[x.etat].label}</span>`}</td>
      <td>${x.recu ? `<span class="badge badge--ok">émis</span>`
        : `<span class="badge badge--warn">attendu</span>`}</td>
      <td style="text-align:right"></td>
    </tr>`);
    const b2 = h(`<button class="btn btn--quiet btn--sm">${x.valeurDeclaree === null ? "Valoriser" : "Corriger"}</button>`);
    b2.onclick = () => formValeurMateriel(x);
    tr.querySelector("td:last-child").appendChild(b2);
    tb.appendChild(tr);
  });

  el.querySelector("#csvM").onclick = () => {
    versCSV("riseva-dons-materiel.csv",
      ["Date de sortie", "Nature", "Référence d'actif", "Quantité", "Unité",
       "Société donatrice", "SIREN", "Site", "Association", "Ville",
       "Éligibilité déclarée par l'association", "Catégorie comptable",
       "Valeur déclarée par l'entreprise", "Justificatif de valorisation",
       "Données effacées", "Réception confirmée", "Reçu fiscal"],
      r.lignes.map(x => [x.sortieLe || x.date, x.nature, x.reference || "", x.quantite, x.unite,
        x.societe, x.siren, x.etablissement, x.association, x.ville,
        x.eligible ? "oui" : "non",
        (DB.CATEGORIES_MATERIEL.find(c => c.cle === x.categorie) || {}).label || "",
        x.valeurDeclaree ?? "", x.justificatif || "",
        x.effacementDonnees === null ? "" : (x.effacementDonnees ? "oui" : "non"),
        x.confirme ? "oui" : "non", x.recu ? "émis" : "attendu"]));
    toast("Export téléchargé.");
  };
  return el;
}

function formValeurMateriel(x){
  const corps = h(`<div class="stack" style="--gap:var(--s4)">
    <p class="muted" style="font-size:var(--t-sm)">
      La méthode de valorisation dépend de la nature comptable du bien, et
      <strong style="color:var(--ink)">elle relève de votre responsabilité</strong>. Riseva
      enregistre ce que vous déclarez et rappelle la méthode qui s'applique, elle n'en choisit
      aucune à votre place. Si vous ne savez pas, laissez vide : le registre écrira
      « à valoriser » plutôt qu'un chiffre inventé.
    </p>
    <div class="field"><label for="vm-nat">Nature du bien</label>
      <input class="input" id="vm-nat" value="${esc(x.nature)}"></div>
    <div class="field"><label for="vm-cat">Catégorie comptable</label>
      <select class="select" id="vm-cat">
        <option value="">Non précisée</option>
        ${DB.CATEGORIES_MATERIEL.map(c => `<option value="${c.cle}" ${c.cle === x.categorie ? "selected" : ""}>${esc(c.label)}</option>`).join("")}
      </select>
      <p class="hint" id="vm-meth">${esc((DB.CATEGORIES_MATERIEL.find(c => c.cle === x.categorie) || {}).methode
        || "Choisissez la catégorie pour voir la méthode applicable.")}</p></div>
    <div class="row" style="gap:var(--s4)">
      <div class="field" style="flex:1"><label for="vm-val">Valeur déclarée, en euros</label>
        <input class="input" id="vm-val" type="number" min="0" step="0.01" value="${x.valeurDeclaree ?? ""}"></div>
      <div class="field" style="flex:1"><label for="vm-date">Date de sortie du bien</label>
        <input class="input" id="vm-date" type="date" value="${esc(x.sortieLe || "")}"></div>
    </div>
    <div class="row" style="gap:var(--s4)">
      <div class="field" style="flex:1"><label for="vm-ref">Référence d'actif ou de lot</label>
        <input class="input" id="vm-ref" value="${esc(x.reference || "")}"
          placeholder="IMMO-2023-0412"></div>
      <div class="field" style="flex:1"><label for="vm-just">Justificatif de valorisation</label>
        <input class="input" id="vm-just" value="${esc(x.justificatif || "")}"
          placeholder="Fiche de sortie signée"></div>
    </div>
    <label class="checkline">
      <input type="checkbox" id="vm-eff" ${x.effacementDonnees ? "checked" : ""}>
      <span>Les données ont été effacées avant remise.
        <span class="muted">Pour du matériel informatique, c'est la pièce que réclame votre
        DPO autant que votre comptable.</span></span>
    </label>
  </div>`);
  const maj = () => {
    const c = DB.CATEGORIES_MATERIEL.find(y => y.cle === corps.querySelector("#vm-cat").value);
    corps.querySelector("#vm-meth").textContent = c ? c.methode
      : "Choisissez la catégorie pour voir la méthode applicable.";
  };
  corps.querySelector("#vm-cat").addEventListener("change", maj);
  modal("Valoriser un don de matériel", corps, [
    { label: "Annuler", classe: "btn--ghost" },
    { label: "Enregistrer", classe: "btn--primary", onClick: () => {
        try {
          DB.declarerValeurMateriel(x.mission, {
            valeur: corps.querySelector("#vm-val").value,
            categorie: corps.querySelector("#vm-cat").value || null,
            nature: corps.querySelector("#vm-nat").value,
            reference: corps.querySelector("#vm-ref").value,
            sortieLe: corps.querySelector("#vm-date").value || null,
            justificatif: corps.querySelector("#vm-just").value,
            effacement: corps.querySelector("#vm-eff").checked
          });
          toast("Registre mis à jour."); rendre();
        } catch (e){ toast(e.message); }
      } }
  ]);
}

/* ------------------------------------------------------------------ */
/* Réponses aux questionnaires clients                                 */
/* ------------------------------------------------------------------ */
/* Le vrai déclencheur d'achat en PME : un client important envoie un
   questionnaire, il faut répondre en huit jours, et personne ne sait où sont les
   chiffres. Riseva ne prétend pas couvrir toute la RSE — elle range ce qu'elle
   sait, avec sa provenance, et **écrit noir sur blanc ce qu'elle ne sait pas**.
   Une matrice qui ne montrerait que les cases remplies serait un piège : c'est
   sur les cases vides qu'on se fait prendre en rendez-vous. */
function vueDossier(u){
  const e = DB.entreprise(u.org);
  const res = DB.realisations({ entreprise: u.org });
  const ms = DB.missions({ entreprise: u.org })
    .filter(m => ["validee", "validee_auto"].includes(m.etat));
  const confirmees = ms.filter(m => m.etat === "validee").length;
  const assos = new Set(ms.map(m => (DB.annonceDe(m) || {}).asso).filter(Boolean)).size;
  const mob = new Set(ms.map(m => m.salarie)).size;
  const heures = ms.reduce(
    (n, m) => n + heuresPour((DB.annonceDe(m) || {}).type, m.quantite), 0);
  const mat = DB.registreMateriel(u.org);
  const v = DB.valorisationMecenat(u.org);
  const gid = e.groupe || null;
  const camps = DB.campagnes(gid || undefined)
    .filter(c => c.etat === "close").sort((a, b) => b.debut.localeCompare(a.debut));
  const camp = camps[0] || null;
  /* Une réponse à un client ne prend que de l'approuvé. Un chiffre soumis mais
     non relu n'a rien à faire dans un document qui sort de l'entreprise. */
  const ind = camp ? DB.indicateursDe({ campagne: camp.id,
    groupe: gid || undefined, societe: gid ? undefined : u.org,
    approuvesSeulement: true }) : null;
  const vi = (cle) => ind && ind.somme[cle] !== undefined ? ind.somme[cle] : null;
  const vc = (cle) => ind && ind.calcules[cle] !== null && ind.calcules[cle] !== undefined
    ? ind.calcules[cle] : null;

  const RISEVA = "Riseva, dérivé des missions";
  const SITE   = camp ? `Déclaré par les sites, ${camp.libelle}` : "Déclaré par les sites";
  const VOUS   = "Vous, dans Paramètres";

  const lignes = [
    ["Effectif", [
      ["Effectif total déclaré", e.effectif ? nb(e.effectif) : null, VOUS],
      ["Effectif à la clôture de la période", vi("effectif_fin") !== null ? nb(vi("effectif_fin")) : null, SITE],
      ["Entrées sur la période", vi("entrees") !== null ? nb(vi("entrees")) : null, SITE],
      ["Sorties sur la période", vi("sorties") !== null ? nb(vi("sorties")) : null, SITE],
      ["Rotation du personnel", vc("turnover") !== null ? nb2(vc("turnover")) + " %" : null, SITE]
    ]],
    ["Santé et sécurité au travail", [
      ["Heures travaillées", vi("heures_travaillees") !== null ? nb(vi("heures_travaillees")) : null, SITE],
      ["Accidents du travail avec arrêt", vi("at_avec_arret") !== null ? nb(vi("at_avec_arret")) : null, SITE],
      ["Journées perdues pour accident", vi("jours_arret") !== null ? nb(vi("jours_arret")) : null, SITE],
      ["Taux de fréquence (avec arrêt)", vc("tf1") !== null ? nb2(vc("tf1")) : null, SITE],
      ["Taux de gravité", vc("tg") !== null ? nb2(vc("tg")) : null, SITE],
      ["Nombre de maladies professionnelles reconnues", null, null],
      ["Document unique à jour", null, null]
    ]],
    ["Égalité et inclusion", [
      ["Part des femmes dans l'effectif", vc("part_femmes") !== null ? nb2(vc("part_femmes")) + " %" : null, SITE],
      ["Bénéficiaires de l'obligation d'emploi présents sur les sites", vi("boeth") !== null ? nb(vi("boeth")) : null, SITE + ", comptage interne"],
      ["Taux d'emploi OETH (annuel, par SIREN)", null, null],
      ["Index d'égalité professionnelle", null, null],
      ["Écart de rémunération femmes-hommes", null, null]
    ]],
    ["Formation", [
      ["Heures de formation", vi("formation_heures") !== null ? nb(vi("formation_heures")) : null, SITE],
      ["Salariés formés", vi("formation_benef") !== null ? nb(vi("formation_benef")) : null, SITE]
    ]],
    ["Engagement territorial et associatif", [
      ["Associations soutenues", assos ? nb(assos) : null, RISEVA],
      ["Salariés mobilisés", mob ? nb(mob) : null, RISEVA],
      ["Missions réalisées", ms.length ? nb(ms.length) : null, RISEVA],
      ["dont confirmées par l'association", ms.length ? nb(confirmees) : null, RISEVA],
      ["Heures de bénévolat", heures ? nb(heures) : null, RISEVA],
      ["Dons de matériel", mat.total ? nb(mat.total) : null, RISEVA],
      ["Valeur des dons de matériel déclarée par l'entreprise", mat.valeur ? eur(mat.valeur) : null, VOUS],
      ["Mécénat de compétences valorisé", v.competencesRetenu ? eur(v.competencesRetenu) : null, "Riseva, au coût déclaré"]
    ]],
    ["Environnement", [
      ["Émissions de gaz à effet de serre", null, null],
      ["Consommation d'énergie", null, null],
      ["Volume de déchets", null, null]
    ]]
  ];

  const total = lignes.flatMap(x => x[1]).length;
  const remplies = lignes.flatMap(x => x[1]).filter(x => x[1] !== null).length;

  const el = h(`<div class="stack" style="--gap:var(--s5)">
    <section class="card">
      <div class="between" style="flex-wrap:wrap;gap:var(--s4);align-items:flex-start">
        <div><h3>Ce que vous pouvez répondre, et ce que vous ne pouvez pas</h3>
        <p class="muted" style="font-size:var(--t-sm);margin-top:4px;max-width:78ch">
          Un client important vous envoie un questionnaire et attend une réponse sous huit
          jours. Voici ce que Riseva sait, avec sa provenance, et surtout ce qu'elle ne sait
          pas, parce que c'est sur ces lignes-là qu'on se fait reprendre en rendez-vous.</p></div>
        <button class="btn btn--ghost btn--sm" id="csvD">Exporter</button>
      </div>
      <hr class="sep">
      <div class="kpis">
        ${kpi("Lignes renseignées", `${nb(remplies)} / ${nb(total)}`,
              "le reste vit ailleurs que dans Riseva", "", "kpi--tete grain")}
        ${kpi("Période des indicateurs", camp ? esc(camp.libelle) : "aucune",
              camp ? "dernière période close" : "aucune campagne close")}
        ${kpi("Périmètre approuvé", ind ? `${ind.sites} / ${ind.attendus} sites` : "-",
              ind ? `${nb(ind.effectifCouvert)} salariés sur ${nb(ind.effectifTotal)}`
                  : "aucune période close")}
        ${kpi("Arrêté au", dateCourte(new Date().toISOString()), "à régénérer avant chaque envoi")}
      </div>
    </section>

    <section class="card">
      <div class="tableau"><table class="table"><thead><tr>
        <th>Donnée</th><th style="text-align:right">Valeur</th><th>Provenance</th>
      </tr></thead><tbody></tbody></table></div>
    </section>

    <section class="card card--flat" style="background:var(--warn-bg);border-color:transparent">
      <h3 style="font-size:var(--t-lg)">Ce document n'est pas une conformité</h3>
      <p class="muted" style="font-size:var(--t-sm);margin-top:var(--s3);max-width:78ch;color:var(--ink-600)">
        Riseva ne se déclare ni auditeur, ni organisme de contrôle, et n'écrit nulle part
        « conforme ». Ce tableau rassemble des données <strong style="color:var(--ink)">déclarées</strong>
       , par vos salariés, par les associations, par vos sites, horodatées et sourcées ligne
        à ligne. Ce qui n'y figure pas n'est pas un oubli : c'est ce que Riseva ne collecte
        pas, et le dire vous protège mieux qu'une case remplie au jugé.
      </p>
    </section>
  </div>`);

  const tb = el.querySelector("tbody");
  lignes.forEach(([theme, items]) => {
    tb.appendChild(h(`<tr><td colspan="3" style="padding-top:var(--s5)">
      <strong>${esc(theme)}</strong></td></tr>`));
    items.forEach(([nom, valeur, source]) => {
      tb.appendChild(h(`<tr>
        <td class="muted" style="padding-left:var(--s5)">${esc(nom)}</td>
        <td class="tnum" style="text-align:right">${valeur === null
          ? `<span class="badge badge--warn">non disponible</span>` : `<strong>${valeur}</strong>`}</td>
        <td class="muted" style="font-size:var(--t-xs)">${source ? esc(source)
          : "Riseva ne collecte pas cette donnée"}</td>
      </tr>`));
    });
  });

  el.querySelector("#csvD").onclick = () => {
    versCSV("riseva-reponses-client.csv",
      ["Thème", "Donnée", "Valeur", "Provenance", "Arrêté au"],
      lignes.flatMap(([theme, items]) => items.map(([nom, valeur, source]) =>
        [theme, nom, valeur === null ? "non disponible" : String(valeur).replace(/\u00a0/g, " "),
         source || "Riseva ne collecte pas cette donnée",
         new Date().toISOString().slice(0, 10)])));
    toast("Export téléchargé.");
  };
  return el;
}

/* ------------------------------------------------------------------ */
/* Faire un don : annoncer, virer, faire confirmer                     */
/* ------------------------------------------------------------------ */
/* Trois écrans en un, parce que le donateur a besoin des trois d'affilée :
   combien, où virer, et ce qui se passe ensuite. Le point le plus important
   n'est pas le montant, c'est la référence : sans elle, l'association voit un
   virement anonyme sur son relevé et ne peut rien confirmer. */
function bonDeVirement(intention, asso){
  const c = DB.coordonneesDon(asso.id) || {};
  const ha = DB.lienHelloAsso(asso.id);
  const el = h(`<div class="stack" style="--gap:var(--s5)">
    ${ha ? `<div class="card card--flat" style="padding:var(--s5)">
      <p class="muted" style="font-size:var(--t-sm)">Le plus rapide</p>
      <strong style="font-size:var(--t-lg)">Payer par carte</strong>
      <p class="muted" style="font-size:var(--t-sm);margin-top:var(--s2)">
        ${esc(asso.nom)} encaisse par HelloAsso, sans commission. <strong>Recopiez la référence
        ci-dessous dans le message du don</strong> : c'est elle qui permet à l'association de
        rapprocher votre versement, et à vos points d'être crédités.</p>
      <a class="btn btn--forest btn--sm" style="margin-top:var(--s4)" target="_blank"
         rel="noopener noreferrer" href="${esc(ha)}">Ouvrir le formulaire HelloAsso</a>
      <p class="hint" style="margin-top:var(--s3)">Riseva ne reçoit pas cet argent non plus :
        il va de votre carte au compte de l'association.</p>
    </div>
    <p class="muted" style="font-size:var(--t-sm);text-align:center;margin:0">ou par virement</p>` : ""}
    <div class="card card--flat" style="padding:var(--s5);background:var(--moss);border-color:transparent">
      <p class="muted" style="font-size:var(--t-sm)">À virer à</p>
      <strong style="font-size:var(--t-lg)">${esc(c.titulaire || asso.nom)}</strong>
      <div style="font-family:var(--font-mono);font-size:var(--t-sm);margin-top:var(--s3);word-break:break-all">
        ${esc(c.iban_lisible || "")}${c.bic ? `<br>BIC ${esc(c.bic)}` : ""}</div>
      <hr style="margin:var(--s5) 0;border:0;border-top:1px solid rgba(0,0,0,.08)">
      <p class="muted" style="font-size:var(--t-sm)">Montant</p>
      <strong style="font-size:var(--t-lg)">${eur(intention.montant)}</strong>
      <p class="muted" style="font-size:var(--t-sm);margin-top:var(--s4)">
        Référence à recopier dans le libellé du virement</p>
      <div class="row" style="--gap:var(--s3);align-items:center;margin-top:4px">
        <strong style="font-family:var(--font-mono);font-size:var(--t-lg);letter-spacing:.06em"
                id="ref">${esc(intention.reference)}</strong>
        <button class="btn btn--ghost btn--sm" id="copier">Copier</button>
      </div>
    </div>
    <div>
      <p class="muted" style="font-size:var(--t-sm)"><strong>Ce qui se passe ensuite.</strong>
      Vous faites le virement depuis votre banque, comme n'importe quel autre.
      ${esc(asso.nom)} le voit arriver avec cette référence et le confirme sur Riseva.
      C'est à ce moment-là, et pas avant, que les points sont crédités et que le reçu
      fiscal est préparé.</p>
      <p class="muted" style="font-size:var(--t-sm);margin-top:var(--s3)">
      <strong>Riseva ne reçoit pas cet argent</strong> et ne prélève rien : il va de votre
      compte à celui de l'association, sans intermédiaire. C'est pour ça qu'il n'y a pas de
      bouton « payer » ici, et c'est aussi pour ça que l'association touche la totalité
      de votre don.</p>
      <p class="hint" style="margin-top:var(--s3)">Sans virement d'ici au
      ${dateFR(intention.expire_le)}, cette annonce s'éteint d'elle-même. Rien ne vous
      sera demandé.</p>
    </div>
  </div>`);
  const b = el.querySelector("#copier");
  b.onclick = async () => {
    try { await navigator.clipboard.writeText(intention.reference); toast("Référence copiée."); }
    catch { toast("Sélectionnez la référence pour la copier."); }
  };
  return el;
}

function ouvrirDon(a, u){
  const asso = DB.association(a.asso) || {};
  if (!DB.donsOuverts(a.asso)){
    modal("Don impossible pour l'instant",
      `<p class="muted">${esc(asso.nom)} n'a pas encore indiqué où recevoir l'argent :
       ni compte HelloAsso connecté, ni IBAN. Riseva n'encaisse pas à sa place, donc il n'y
       a nulle part où l'envoyer.</p>
       <p class="hint" style="margin-top:var(--s4)">Les autres façons d'aider cette
       association, elles, restent ouvertes.</p>`, [{ label:"Fermer" }]);
    return;
  }
  const peutEntreprise = u.role === "entreprise_admin";
  const corps = h(`<div class="stack" style="--gap:var(--s5)">
    <p class="muted" style="font-size:var(--t-sm)">${esc(a.description)}</p>
    <div class="field">
      <label for="q">Montant du don</label>
      <input class="input" type="number" min="${DON.montant_min}" max="${a.restant}"
             value="${Math.min(50, a.restant)}" id="q">
      <p class="hint" id="calc"></p>
    </div>
    ${peutEntreprise ? `<div class="field">
      <label for="orig">Au nom de</label>
      <select class="select" id="orig">
        <option value="entreprise">${esc((DB.entreprise(u.org) || {}).nom || "l'entreprise")}</option>
        <option value="salarie">Moi, à titre personnel</option>
      </select>
      <p class="hint">Un don personnel ne rapporte aucun point à l'entreprise et n'apparaît
      nulle part dans son espace : la cause d'une association peut révéler une conviction
      ou un état de santé.</p></div>`
    : `<p class="hint">Ce don est personnel. Il ne rapporte aucun point à votre employeur,
       qui n'en saura rien, et ouvre droit pour vous à une réduction d'impôt de 66 % dans la
       limite de 20 % du revenu imposable (article 200 du CGI).</p>`}
  </div>`);
  const q = corps.querySelector("#q"), calc = corps.querySelector("#calc");
  const maj = () => {
    const orig = corps.querySelector("#orig");
    calc.textContent = (!orig || orig.value === "entreprise") && peutEntreprise
      ? `Soit ${nb(DB.pointsPour("don_financier", Number(q.value) || 0))} points pour l'entreprise, une fois le virement confirmé.`
      : `Un don personnel ne rapporte pas de points à l'employeur.`;
  };
  q.oninput = maj;
  corps.querySelector("#orig")?.addEventListener("change", maj);
  maj();

  /* Deux chemins, et un seul est propose a la fois. Compte HelloAsso connecte :
     on paie par carte, et le don se confirme tout seul. Sinon : le bon de
     virement, avec sa reference a recopier et sa confirmation a la main. */
  const parCarte = DB.helloassoLie(a.asso);
  modal("Don à " + asso.nom, corps, [
    { label:"Annuler" },
    { label: parCarte ? "Payer par carte" : "Obtenir la référence", classe:"btn--primary",
      onClick: () => {
        const orig = corps.querySelector("#orig");
        const origine = orig ? orig.value : "salarie";
        let i;
        try {
          i = DB.declarerIntentionDon({ annonce: a.id, montant: Number(q.value),
            origine, salarie: u.id,
            entreprise: origine === "entreprise" ? u.org : null });
        } catch (e){ toast(e.message); return false; }
        if (parCarte){ ouvrirPaiementCarte(i, asso, a); return; }
        modal("Votre virement à " + asso.nom, bonDeVirement(i, asso),
          [{ label:"C'est noté", classe:"btn--primary", onClick: () => rendre() }]);
      }}
  ]);
}

/* Le paiement par carte. En production, on demande a la fonction Edge d'ouvrir
   une intention de paiement chez HelloAsso, et on part sur leur page : c'est la
   que la carte est saisie, jamais chez nous. Au retour, la fonction Edge relit
   l'etat du paiement AUPRES DE HELLOASSO avant de crediter quoi que ce soit —
   une redirection est une intention, pas une preuve.

   En demonstration, il n'y a pas de page a ouvrir : on simule le paiement, et on
   le dit. */
function ouvrirPaiementCarte(intention, asso, annonce){
  if (DB.mode === "supabase"){
    const base = (window.RISEVA_CONFIG || {}).url || "";
    toast("Ouverture de la page de paiement...");
    fetch(`${base}/functions/v1/helloasso/don`, {
      method: "POST",
      headers: { "content-type": "application/json",
                 authorization: `Bearer ${(window.RISEVA_JETON || "")}` },
      body: JSON.stringify({ annonce: annonce.id, montant: intention.montant,
                             origine: intention.origine })
    }).then(r => r.json()).then(r => {
      if (r.redirection) location.href = r.redirection;
      else toast(r.erreur || "Le paiement n'a pas pu être ouvert.");
    }).catch(() => toast("Le paiement n'a pas pu être ouvert."));
    return;
  }
  const corps = h(`<div class="stack" style="--gap:var(--s4)">
    <p class="muted" style="font-size:var(--t-sm)">
      Sur riseva.fr, ce bouton vous emmène sur la page de paiement de HelloAsso :
      vous saisissez votre carte chez eux, l'argent arrive sur le compte de
      ${esc(asso.nom)}, et vos points sont crédités au retour. Riseva ne voit jamais
      votre numéro de carte et ne touche pas à l'argent.</p>
    <div class="card card--flat" style="padding:var(--s5)">
      <p class="muted" style="font-size:var(--t-sm)">Montant</p>
      <strong style="font-size:var(--t-lg)">${eur(intention.montant)}</strong>
      <p class="muted" style="font-size:var(--t-sm);margin-top:var(--s4)">Bénéficiaire</p>
      <strong>${esc(asso.nom)}</strong>
      <p class="muted" style="font-size:var(--t-sm);margin-top:var(--s4)">Référence</p>
      <strong style="font-family:var(--font-mono)">${esc(intention.reference)}</strong>
    </div>
    <p class="hint">Ici, c'est une démonstration : rien n'est débité, et le don sera
      simplement marqué comme reçu.</p>
  </div>`);
  modal("Payer par carte", corps, [
    { label:"Annuler" },
    { label:"Simuler le paiement", classe:"btn--primary", onClick: () => {
        try { DB.confirmerDonRecu(intention.id, { montant: intention.montant }); }
        catch (e){ toast(e.message); return false; }
        toast("Don confirmé, points crédités."); rendre(); }}
  ]);
}

/* ------------------------------------------------------------------ */
/* Association : recevoir de l'argent                                  */
/* ------------------------------------------------------------------ */
function vueDonsAsso(u){
  const asso = DB.association(u.org) || {};
  const manque = DB.manquePourDons(u.org);
  const attendus = DB.intentionsDon({ asso:u.org, etat:"annoncee" });
  const recus = DB.intentionsDon({ asso:u.org, etat:"recue" });
  const mandat = DB.mandatRecus(u.org);

  const el = h(`<div class="stack" style="--gap:var(--s5)">
    <section class="card card--flat">
      <h3 style="font-size:var(--t-lg)">L'argent ne passe pas par Riseva</h3>
      <p class="muted" style="margin-top:6px">Le donateur paie par carte sur une page
      HelloAsso, et l'argent arrive sur votre compte HelloAsso. Riseva n'y touche à aucun
      moment : nous n'encaissons pas, donc nous n'avons pas d'agrément d'établissement de
      paiement à obtenir, et vous n'avez aucun délai de reversement à subir. Le don se
      confirme tout seul : vous n'avez rien à rapprocher d'un relevé.</p>
      ${manque.length ? `<ul class="liste-ecarts" style="margin-top:var(--s4)">${
        manque.map(m => `<li><strong>${esc(m.quoi)}</strong>, ${esc(m.pourquoi)}</li>`).join("")}</ul>`
      : `<p class="muted" style="margin-top:var(--s3)"><strong>Tout est en place.</strong></p>`}
    </section>

    <div class="two">
      <section class="card">
        <div class="between"><h3>Votre compte</h3>
          <button class="btn btn--ghost btn--sm" id="majIban">${asso.iban ? "Modifier" : "Renseigner"}</button></div>
        ${asso.iban ? `<div style="margin-top:var(--s4)">
          <p class="muted" style="font-size:var(--t-sm)">Titulaire</p>
          <strong>${esc(asso.titulaire_compte || asso.nom)}</strong>
          <p class="muted" style="font-size:var(--t-sm);margin-top:var(--s3)">IBAN</p>
          <div style="font-family:var(--font-mono);word-break:break-all">${esc(ibanLisible(asso.iban))}</div>
          ${asso.bic ? `<p class="muted" style="font-size:var(--t-sm);margin-top:var(--s3)">BIC ${esc(asso.bic)}</p>` : ""}
          <p class="hint" style="margin-top:var(--s4)">Cet IBAN est montré aux donateurs sur votre
          page publique, à côté de votre dénomination. Vérifiez-le : une erreur ici envoie
          l'argent ailleurs.</p>
        </div>` : `<p class="muted" style="margin-top:var(--s4)">Sans IBAN, la page publique
          n'affiche aucun moyen de vous donner de l'argent, plutôt qu'un bouton qui ne mène
          nulle part.</p>`}
      </section>

      <section class="card${DB.helloassoLie(u.org) ? "" : " card--dark grain"}">
        <div class="between"><h3${DB.helloassoLie(u.org) ? "" : ` style="color:var(--paper)"`}>Paiement par carte</h3>
          ${DB.helloassoLie(u.org)
            ? `<span class="badge badge--ok">Connecté</span>`
            : `<span class="badge badge--lime-clair">Recommandé</span>`}</div>
        ${DB.helloassoLie(u.org) ? `
          <p class="muted" style="font-size:var(--t-sm);margin-top:var(--s4)">
            Votre compte <strong>HelloAsso</strong> est connecté depuis le
            ${dateFR(DB.association(u.org).helloasso_lie_le)}. Vos donateurs paient par carte,
            l'argent arrive chez vous, et le don se confirme tout seul.</p>
          <p class="muted" style="font-size:var(--t-sm);margin-top:var(--s3)">
            Organisation : <strong style="font-family:var(--font-mono)">${esc(DB.helloassoSlug(u.org))}</strong></p>
          <div class="row" style="gap:var(--s3);margin-top:var(--s5)">
            <button class="btn btn--ghost btn--sm" id="delierHa">Déconnecter</button>
          </div>
          <p class="hint" style="margin-top:var(--s4)">Déconnecter n'efface rien chez HelloAsso
            et ne touche pas aux dons déjà reçus. Riseva cesse simplement de pouvoir ouvrir un
            paiement en votre nom.</p>`
        : `
          <p style="color:var(--forest-100);opacity:.85;font-size:var(--t-sm);margin-top:var(--s4)">
            Connectez votre compte <strong style="color:var(--paper)">HelloAsso</strong> :
            vos donateurs paieront par carte en trois clics, l'argent arrivera directement sur
            votre compte, et le don se confirmera sans que vous ayez à rapprocher quoi que ce
            soit d'un relevé bancaire.</p>
          <p style="color:var(--forest-100);opacity:.85;font-size:var(--t-sm);margin-top:var(--s3)">
            Vous autorisez Riseva depuis la page de HelloAsso, en une fois. Nous ne voyons
            jamais vos identifiants, et vous pouvez retirer l'autorisation quand vous voulez.</p>
          <div class="row" style="gap:var(--s3);margin-top:var(--s5);flex-wrap:wrap">
            <button class="btn btn--lime btn--sm" id="lierHa">Connecter mon compte HelloAsso</button>
            <a class="btn btn--ghost btn--sm" href="https://www.helloasso.com/associations/inscription"
               target="_blank" rel="noopener noreferrer" style="color:var(--paper)">Je n'ai pas de compte</a>
          </div>
          <p class="hint" style="margin-top:var(--s4);color:var(--forest-100);opacity:.7">
            Ouvrir un compte HelloAsso est gratuit et prend quelques minutes. En attendant, le
            virement ci-contre fonctionne : il demande seulement à vos donateurs de recopier
            un IBAN, et à vous de confirmer la réception.</p>`}
      </section>

      <section class="card">
        <div class="between"><h3>Reçus fiscaux</h3>
          <button class="btn btn--ghost btn--sm" id="majMandat">${mandat ? "Révoquer" : "Donner mandat"}</button></div>
        ${mandat ? `<p class="muted" style="margin-top:var(--s4)">Mandat accordé le
          ${dateFR(mandat.accepte_le)} par <strong>${esc(mandat.nom)}</strong>, ${esc(mandat.qualite)}.
          Révocable à tout moment, sans motif.</p>` : ""}
        <ul class="liste-ecarts" style="margin-top:var(--s4)">${
          MANDAT_RECUS.texte.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
      </section>
    </div>

    <section class="card"${attendus.length ? "" : ` hidden`}>
      <h3>Virements annoncés, en attente de votre confirmation</h3>
      <p class="muted" style="font-size:var(--t-sm);margin-top:6px">Rapprochez chaque ligne de
      votre relevé bancaire par sa référence, puis confirmez le montant réellement crédité.
      C'est vous qui avez le relevé : c'est votre chiffre qui fait foi. Rien n'est validé
      automatiquement, un silence ne vaut pas encaissement.</p>
      <div id="att" style="margin-top:var(--s5)"></div>
    </section>

    <section class="card">
      <h3>Dons confirmés</h3>
      <div id="rec" style="margin-top:var(--s5)"></div>
    </section>
  </div>`);

  const att = el.querySelector("#att");
  if (!attendus.length) att.appendChild(vide({ titre:"Rien en attente",
    texte:"Aucun virement n'a été annoncé pour le moment." }));
  else {
    const t = h(`<div class="tableau"><table class="table"><thead><tr>
      <th>Référence</th><th>Annoncé le</th><th>Montant annoncé</th><th>S'éteint le</th><th></th>
    </tr></thead><tbody></tbody></table></div>`);
    attendus.forEach(i => {
      const tr = h(`<tr>
        <td style="font-family:var(--font-mono)">${esc(i.reference)}</td>
        <td class="muted tnum">${dateCourte(i.declare_le)}</td>
        <td class="tnum">${eur(i.montant)}</td>
        <td class="muted tnum">${dateCourte(i.expire_le)}</td>
        <td style="text-align:right"></td></tr>`);
      const b = h(`<button class="btn btn--forest btn--sm">Confirmer la réception</button>`);
      b.onclick = () => {
        const corps = h(`<div>
          <p class="muted">Confirmez le montant que votre banque a réellement crédité pour la
          référence <strong style="font-family:var(--font-mono)">${esc(i.reference)}</strong>.
          S'il diffère de ce qui avait été annoncé, corrigez-le : c'est votre relevé qui fait foi.</p>
          <div class="field" style="margin-top:var(--s5)"><label for="m">Montant reçu</label>
            <input class="input" type="number" id="m" min="1" value="${i.montant}"></div>
          <p class="hint">Confirmer crédite les points du donateur et déclenche la préparation
          du reçu fiscal, que vous seule émettez.</p></div>`);
        modal("Confirmer " + i.reference, corps, [
          { label:"Ce virement n'est jamais arrivé", onClick: () => {
              DB.abandonnerIntentionDon(i.id, "non reçu"); toast("Intention retirée."); rendre(); }},
          { label:"Confirmer", classe:"btn--primary", onClick: () => {
              try { DB.confirmerDonRecu(i.id, { montant: Number(corps.querySelector("#m").value) }); }
              catch (e){ toast(e.message); return false; }
              toast("Don confirmé, points crédités."); rendre(); }}]);
      };
      tr.lastElementChild.appendChild(b);
      t.querySelector("tbody").appendChild(tr);
    });
    att.appendChild(t);
  }

  const rec = el.querySelector("#rec");
  if (!recus.length) rec.appendChild(vide({ titre:"Aucun don confirmé",
    texte:"Les dons que vous confirmez apparaîtront ici." }));
  else {
    const t = h(`<div class="tableau"><table class="table"><thead><tr>
      <th>Référence</th><th>Confirmé le</th><th>Montant reçu</th></tr></thead><tbody></tbody></table></div>`);
    recus.forEach(i => t.querySelector("tbody").appendChild(h(`<tr>
      <td style="font-family:var(--font-mono)">${esc(i.reference)}</td>
      <td class="muted tnum">${dateCourte(i.confirme_le || i.declare_le)}</td>
      <td class="tnum">${eur(i.montant_recu ?? i.montant)}</td></tr>`)));
    rec.appendChild(t);
  }

  el.querySelector("#majIban").onclick = () => {
    const corps = h(`<div class="stack" style="--gap:var(--s4)">
      <p class="muted">Recopiez l'IBAN depuis un relevé. Riseva en vérifie la clé de contrôle,
      ce qui écarte l'erreur de saisie, mais ne garantit pas que le compte est le vôtre.</p>
      <div class="field"><label for="ib">IBAN</label>
        <input class="input" id="ib" value="${esc(asso.iban ? ibanLisible(asso.iban) : "")}"
               placeholder="FR76 3000 6000 0112 3456 7890 189"></div>
      <div class="field"><label for="bc">BIC (facultatif)</label>
        <input class="input" id="bc" value="${esc(asso.bic || "")}"></div>
      <div class="field"><label for="ti">Titulaire du compte</label>
        <input class="input" id="ti" value="${esc(asso.titulaire_compte || asso.nom_juridique || asso.nom)}">
        <p class="hint">C'est ce nom que le donateur verra, et qu'il comparera à celui de sa
        banque avant de valider son virement.</p></div>
    </div>`);
    modal("Compte bancaire de l'association", corps, [
      { label:"Annuler" },
      { label:"Enregistrer", classe:"btn--primary", onClick: () => {
          try {
            DB.enregistrerIban(u.org, { iban: corps.querySelector("#ib").value,
              bic: corps.querySelector("#bc").value, titulaire: corps.querySelector("#ti").value });
          } catch (e){ toast(e.message); return false; }
          toast("Compte enregistré."); rendre(); }}]);
  };

  /* Connecter le compte. En production, le bouton envoie vers la mire
     d'autorisation de HelloAsso : c'est la que l'association dit oui, et c'est
     la fonction Edge qui recoit le code et garde le jeton. Le navigateur ne voit
     jamais rien de secret.

     En demonstration, il n'y a pas de mire a ouvrir : on demande le nom de
     l'organisation et on ecrit la liaison, en disant que c'est une simulation.
     Un parcours qu'on ne peut pas traverser en entier est un parcours qu'on ne
     peut pas montrer. */
  el.querySelector("#lierHa")?.addEventListener("click", () => {
    if (DB.mode === "supabase"){
      const base = (window.RISEVA_CONFIG || {}).url || "";
      location.href = `${base}/functions/v1/helloasso/lier?retour=/dons`;
      return;
    }
    const corps = h(`<div class="stack" style="--gap:var(--s4)">
      <p class="muted" style="font-size:var(--t-sm)">
        Sur riseva.fr, ce bouton ouvre la page d'autorisation de HelloAsso : vous vous
        connectez chez eux, vous autorisez Riseva, et c'est fini. Riseva ne voit ni votre
        mot de passe, ni vos identifiants.</p>
      <p class="muted" style="font-size:var(--t-sm)">
        Ici, c'est une démonstration : indiquez le nom court de votre organisation, celui
        qui apparaît dans l'adresse de votre page HelloAsso, et la connexion sera simulée.</p>
      <div class="field"><label for="ha-slug">Nom de l'organisation</label>
        <input class="input" id="ha-slug" placeholder="refuge-des-quatre-vents"
               value="${esc(DB.helloassoSlug(u.org) || "")}">
        <p class="hint">Dans
          <span style="font-family:var(--font-mono);font-size:var(--t-xs)">helloasso.com/associations/<b>refuge-des-quatre-vents</b></span>,
          c'est la partie en gras.</p></div>
    </div>`);
    modal("Connecter HelloAsso", corps, [
      { label:"Annuler" },
      { label:"Connecter", classe:"btn--primary", onClick: () => {
          try { DB.lierHelloAsso(u.org, corps.querySelector("#ha-slug").value); }
          catch (e){ toast(e.message); return false; }
          toast("Compte connecté. Vos donateurs peuvent payer par carte.");
          rendre(); }}]);
  });

  el.querySelector("#delierHa")?.addEventListener("click", () => {
    modal("Déconnecter HelloAsso",
      `<p class="muted">Riseva cessera de pouvoir ouvrir un paiement en votre nom. Les dons
       déjà reçus ne bougent pas, et rien n'est effacé chez HelloAsso.</p>
       <p class="hint" style="margin-top:var(--s4)">Vos donateurs retomberont sur le virement,
       s'il est renseigné.</p>`,
      [{ label:"Annuler" },
       { label:"Déconnecter", classe:"btn--primary", onClick: () => {
           try { DB.delierHelloAsso(u.org); } catch (e){ toast(e.message); return false; }
           toast("Compte déconnecté."); rendre(); }}]);
  });

  el.querySelector("#majMandat").onclick = () => {
    if (mandat){
      modal("Révoquer le mandat",
        `<p class="muted">Riseva cessera immédiatement de préparer des reçus en votre nom.
         Les reçus déjà émis ne sont pas affectés : ils sont entre les mains de donateurs, et
         vous les conservez six ans (article L. 102 B du livre des procédures fiscales).</p>`,
        [{ label:"Annuler" },
         { label:"Révoquer", classe:"btn--primary", onClick: () => {
             DB.revoquerMandatRecus(u.org); toast("Mandat révoqué."); rendre(); }}]);
      return;
    }
    const r = DB.reglagesRecus(u.org);
    const corps = h(`<div>
      <ul class="liste-ecarts">${MANDAT_RECUS.texte.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
      <div class="two" style="margin-top:var(--s5)">
        <div class="field"><label for="n">Nom de la personne qui donne mandat</label>
          <input class="input" id="n" value="${esc(r.signataire || "")}"></div>
        <div class="field"><label for="qa">Sa qualité</label>
          <input class="input" id="qa" value="${esc(r.qualite || "")}" placeholder="Présidente, trésorier..."></div>
      </div>
      <p class="hint">Version ${esc(MANDAT_RECUS.version)}. Le mandat est daté, nominatif,
      et révocable à tout moment sans motif.</p></div>`);
    modal("Mandat de préparation des reçus", corps, [
      { label:"Annuler" },
      { label:"Donner mandat", classe:"btn--primary", onClick: () => {
          try {
            DB.accepterMandatRecus(u.org, { par: u.id,
              nom: corps.querySelector("#n").value.trim(),
              qualite: corps.querySelector("#qa").value.trim() });
          } catch (e){ toast(e.message); return false; }
          toast("Mandat enregistré."); rendre(); }}]);
  };

  return el;
}

/* ------------------------------------------------------------------ */
/* Registre public : le bloc partagé                                   */
/* ------------------------------------------------------------------ */
/* Le même bloc sert à l'association qui remplit sa fiche et à Riseva qui la
   contrôle. Deux écrans qui interrogeraient le même registre avec deux
   normalisations et deux verdicts finiraient par se contredire devant la même
   personne — et c'est l'association qui aurait raison de ne plus rien croire. */
function blocRegistre(asso, { admin = false, apres = null } = {}){
  const el = h(`<div class="stack" style="--gap:var(--s4)">
    <div class="field">
      <label for="q-registre">Numéro SIREN, ou nom de l'association</label>
      <div class="row" style="--gap:var(--s3)">
        <input class="input" id="q-registre" style="flex:1"
               placeholder="428 763 304" value="${esc(asso.siren || asso.nom || "")}">
        <button class="btn btn--forest" id="go-registre">Interroger le registre</button>
      </div>
      <p class="hint">Neuf associations déclarées sur dix n'ont pas de SIREN. Sans numéro,
      la fiche se remplit à la main : ce n'est pas bloquant.</p>
    </div>
    <div id="res-registre"></div>
    <p class="hint" style="color:var(--ink-400)">${esc(ANNUAIRE.attribution)}</p>
  </div>`);

  const res = el.querySelector("#res-registre");
  const champ = el.querySelector("#q-registre");
  const bouton = el.querySelector("#go-registre");
  let encours = null;

  const ligne = (f) => {
    const c = comparerFiche(asso, f);
    const et = ETATS_CORRESPONDANCE[c.etat] || ETATS_CORRESPONDANCE.different;
    const carte = h(`<div class="card card--flat" style="padding:var(--s4)">
      <div class="row" style="justify-content:space-between;align-items:flex-start">
        <div>
          <strong>${esc(f.nom || "-")}</strong>
          <div class="muted" style="font-size:var(--t-xs);margin-top:2px">
            ${esc(f.siren || "")}${f.rna ? ", " + esc(f.rna) : ""}
            ${f.adresse ? ", " + esc(f.adresse) : ""}</div>
          <div class="muted" style="font-size:var(--t-xs);margin-top:2px">
            ${f.est_association ? "Association" : "Structure non signalée comme association"}
            ${f.est_ess ? ", économie sociale et solidaire" : ""}
            ${f.date_creation ? ", immatriculée le " + dateCourte(f.date_creation) : ""}
            ${f.etablissements != null ? ", " + nb(f.etablissements) + " établissement" + (f.etablissements > 1 ? "s" : "") + " au registre" : ""}</div>
        </div>
        <span class="badge ${et.badge}">${esc(et.label)}</span>
      </div>
      ${c.ecarts.length ? `<ul class="liste-ecarts" style="margin-top:var(--s3)">${
        c.ecarts.map(e => `<li><span class="muted">${esc(e.champ)}</span> ,
          déclaré « ${esc(e.attendu)} », registre « ${esc(e.registre)} »</li>`).join("")}</ul>` : ""}
      <div class="row" style="margin-top:var(--s4);--gap:var(--s3)"></div>
    </div>`);
    const barre = carte.querySelector(".row:last-child");
    const b = h(`<button class="btn btn--sm ${admin ? "btn--primary" : "btn--forest"}">${
      admin ? "Retenir ce contrôle" : "C'est nous : remplir ma fiche"}</button>`);
    b.onclick = () => {
      if (!asso.siren && f.siren) DB.enregistrerNumeros(asso.id, { siren: f.siren });
      const ct = DB.controlerEnregistrement(asso.id, { fiche: f, par: (moi() || {}).id || null });
      toast(ct.bloquant
        ? "Contrôle enregistré : il signale un écart à lever."
        : "Contrôle enregistré, fiche complétée.");
      apres ? apres(ct) : rendre();
    };
    barre.appendChild(b);
    return carte;
  };

  const chercher = async () => {
    const q = champ.value.trim();
    res.innerHTML = `<p class="muted">Interrogation du registre...</p>`;
    bouton.disabled = true;
    if (encours) encours.abort();
    encours = new AbortController();
    const r = await chercherStructure(q, { signal: encours.signal });
    bouton.disabled = false;
    res.innerHTML = "";
    if (r.etat === "annulee") return;
    if (r.etat === "court"){
      res.appendChild(h(`<p class="muted">Trois caractères au minimum.</p>`)); return;
    }
    if (r.etat === "numero_invalide"){
      res.appendChild(h(`<p class="muted" style="color:var(--danger)">Ce numéro ne peut pas
        exister : sa clé de contrôle est fausse. Vérifiez la saisie.</p>`)); return;
    }
    if (r.etat === "panne"){
      const bloc = h(`<div class="card card--flat" style="padding:var(--s4)">
        <p class="muted">Le registre public est injoignable. Ce n'est pas de votre fait, et
        rien n'est perdu.</p>
        <div class="row" style="margin-top:var(--s3)"></div></div>`);
      if (admin){
        const b = h(`<button class="btn btn--ghost btn--sm">Consigner la panne</button>`);
        b.onclick = () => { const ct = DB.controlerEnregistrement(asso.id,
            { panne:true, par:(moi() || {}).id || null });
          toast("Panne consignée : le contrôle reste à faire."); apres ? apres(ct) : rendre(); };
        bloc.querySelector(".row").appendChild(b);
      }
      res.appendChild(bloc); return;
    }
    if (!r.fiches.length){
      const bloc = h(`<div class="card card--flat" style="padding:var(--s4)">
        <p class="muted">Rien à ce nom ni à ce numéro. Une association sans SIREN n'apparaît
        pas ici, et son absence ne veut rien dire.</p>
        <div class="row" style="margin-top:var(--s3)"></div></div>`);
      if (admin){
        const b = h(`<button class="btn btn--ghost btn--sm">Consigner « introuvable »</button>`);
        b.onclick = () => { const ct = DB.controlerEnregistrement(asso.id,
            { fiche:null, par:(moi() || {}).id || null });
          toast("Contrôle enregistré."); apres ? apres(ct) : rendre(); };
        bloc.querySelector(".row").appendChild(b);
      }
      res.appendChild(bloc); return;
    }
    r.fiches.forEach(f => res.appendChild(ligne(f)));
  };

  bouton.onclick = chercher;
  champ.addEventListener("keydown", e => { if (e.key === "Enter"){ e.preventDefault(); chercher(); } });
  return el;
}

/* Ce qu'un contrôle a donné, en une ligne, partout où il faut le rappeler. */
function badgeControle(aid){
  const c = DB.dernierControle(aid);
  if (!c) return `<span class="badge badge--attente">Jamais contrôlée</span>`;
  const et = ETATS_CORRESPONDANCE[c.etat] || ETATS_CORRESPONDANCE.different;
  return `<span class="badge ${et.badge}" title="${esc(et.label)}, ${dateCourte(c.le)}">${
    esc(et.label)}</span>`;
}

/* ------------------------------------------------------------------ */
/* Association : mon dossier                                           */
/* ------------------------------------------------------------------ */
/* La règle qu'on s'est donnée : une association ne doit rien avoir à faire
   d'autre que publier son besoin. Cet écran est le seul endroit où on lui
   demande quelque chose, et il tient en un numéro. Tout le reste — dénomination
   déposée, adresse, coordonnées, RNA — vient du registre public. */
function vueDossierAsso(u){
  const d = DB.dossierAdministratif(u.org);
  if (!d) return h(`<section class="card"><p class="muted">Aucune association rattachée.</p></section>`);
  const a = d.association;
  const c = d.controle;

  const el = h(`<div class="stack" style="--gap:var(--s5)">
    <section class="card">
      <h3 style="font-size:var(--t-lg)">Votre immatriculation</h3>
      <p class="muted" style="margin-top:6px">Un numéro, et Riseva remplit le reste à votre
      place : dénomination déposée, adresse, numéro RNA. Vous n'avez aucun justificatif à
      envoyer, et nous ne vous en demanderons pas.</p>
      <div style="margin-top:var(--s5)" id="registre"></div>
    </section>

    <section class="card">
      <h3 style="font-size:var(--t-lg)">Où vous en êtes</h3>
      <div class="stack" style="--gap:var(--s3);margin-top:var(--s4)">
        <div class="row" style="justify-content:space-between">
          <span>Visible par les entreprises</span>
          <span class="badge ${d.en_ligne ? "badge--ok" : "badge--attente"}">${
            d.en_ligne ? "Oui" : "Pas encore"}</span></div>
        <div class="row" style="justify-content:space-between">
          <span>Contrôle au registre public</span>
          <span>${badgeControle(a.id)}${c ? ` <span class="muted" style="font-size:var(--t-xs)">le ${dateCourte(c.le)}</span>` : ""}</span></div>
        <div class="row" style="justify-content:space-between">
          <span>Reçus fiscaux</span>
          <span class="badge ${d.recus_prets ? "badge--ok" : "badge--attente"}">${
            d.recus_prets ? "Prêts" : "Incomplets"}</span></div>
      </div>
      ${d.manque.length ? `<div style="margin-top:var(--s5)">
        <p class="muted" style="font-size:var(--t-sm)">Il reste :</p>
        <ul class="liste-ecarts" style="margin-top:var(--s2)">${d.manque.map(m =>
          `<li><strong>${esc(m.quoi)}</strong>, ${esc(m.pourquoi)}</li>`).join("")}</ul>
      </div>` : `<p class="muted" style="margin-top:var(--s4)">Rien à faire de plus.</p>`}
    </section>

    <section class="card card--flat">
      <h3 style="font-size:var(--t-md)">Ce que ce contrôle prouve, et ce qu'il ne prouve pas</h3>
      <ul class="liste-ecarts" style="margin-top:var(--s3)">${
        ANNUAIRE_LIMITES.map(l => `<li>${esc(l)}</li>`).join("")}</ul>
    </section>
  </div>`);

  el.querySelector("#registre").appendChild(blocRegistre(a, { admin:false }));
  return el;
}

/* ------------------------------------------------------------------ */
/* La fiche VSME                                                       */
/* ------------------------------------------------------------------ */
/* Une PME qui n'est soumise à rien reçoit quand même le questionnaire ESG de son
   donneur d'ordre, de sa banque et de l'acheteur public — trois questionnaires
   différents qui demandent la même chose. La norme VSME est la grille commune
   européenne. Riseva ne produit pas de rapport VSME : elle range ce qu'elle sait
   dans les rubriques de la norme et dit lesquelles restent vides. Le client
   arrive avec la moitié du questionnaire remplie et la liste de ce qui manque —
   ce qui vaut mieux qu'un document complet dont la moitié serait inventée. */
function vueVSME(u){
  const f = DB.ficheVSME(u.org, {
    campagne: sessionStorage.getItem("riseva.vsme.camp") || null });
  if (!f) return h(`<section class="card"><p class="empty">Aucune société rattachée.</p></section>`);
  const e = DB.entreprise(u.org);
  const camps = DB.campagnes(e.groupe || undefined)
    .slice().sort((a, b) => b.debut.localeCompare(a.debut));

  const pastille = (c) => c === "oui"
    ? `<span class="badge badge--ok">Renseignée par Riseva</span>`
    : c === "partiel"
      ? `<span class="badge badge--attente">Partiellement renseignée</span>`
      : `<span class="badge">Non couverte</span>`;

  const ligne = (l) => {
    const vide = l.texte === undefined && (l.valeur === null || l.valeur === undefined);
    return `<tr>
      <td>${esc(l.libelle)}${l.calcule
        ? ` <span class="muted" style="font-size:var(--t-xs)">(calculé)</span>` : ""}</td>
      <td style="text-align:right" class="tnum">${
        vide ? `<span class="muted">non renseigné</span>`
             : (l.texte !== undefined ? esc(l.texte)
                : `${nb(l.valeur)}${l.unite ? " " + esc(l.unite) : ""}`)}</td>
    </tr>`;
  };

  const rub = (r) => `
    <section class="card" style="margin-top:var(--s5)">
      <div class="between" style="flex-wrap:wrap;gap:var(--s3);align-items:flex-start">
        <div>
          <h3 style="font-size:var(--t-lg)">${esc(r.cle)}, ${esc(r.titre)}</h3>
          <p class="muted" style="font-size:var(--t-xs);margin-top:2px">${esc(r.pilier)}</p>
        </div>
        ${pastille(r.renseignee ? r.couvert : "non")}
      </div>
      ${r.apporte ? `<p class="muted" style="font-size:var(--t-sm);margin-top:var(--s3)">
        ${esc(r.apporte)}</p>` : ""}
      ${r.lignes.length ? `<div class="tableau"><table class="table" style="margin-top:var(--s4)"><tbody>
        ${r.lignes.map(ligne).join("")}</tbody></table></div>` : ""}
      ${r.manque ? `<p class="hint" style="margin-top:var(--s4)">
        <strong style="color:var(--ink)">Ce que Riseva n'a pas :</strong> ${esc(r.manque)}
        ${r.ailleurs ? ` ${esc(r.ailleurs)}` : ""}</p>` : ""}
    </section>`;

  const el = h(`<div class="stack" style="--gap:var(--s5)">
    <section class="card card--dark grain">
      <div class="between" style="flex-wrap:wrap;gap:var(--s4);align-items:flex-start">
        <div>
          <p class="eyebrow" style="color:var(--lime)">Norme volontaire de durabilité</p>
          <h3 style="margin-top:var(--s2)">Ce que Riseva remplit pour vous</h3>
          <p class="muted" style="margin-top:6px;font-size:var(--t-sm);color:#C5CDBB;max-width:62ch">
            ${esc(f.avertissement)}</p>
        </div>
        <div class="stack" style="--gap:var(--s3);align-items:flex-end">
          <span class="badge badge--ok">${f.couvertes} rubriques sur ${f.total}</span>
          <div class="field" style="margin:0">
            <label for="vc" style="color:#C5CDBB">Période</label>
            <select class="select" id="vc">
              ${camps.map(c => `<option value="${c.id}"${
                f.campagne && c.id === f.campagne.id ? " selected" : ""}>${esc(c.libelle)}${
                c.etat === "close" ? "" : ", en cours"}</option>`).join("")}
            </select>
          </div>
        </div>
      </div>
    </section>

    ${f.campagne && f.indicateurs && f.indicateurs.sites < f.indicateurs.attendus
      ? `<section class="card card--flat" style="background:var(--warn-bg);border-color:transparent">
      <p style="font-size:var(--t-sm);color:var(--ink-600)">
        <strong style="color:var(--ink)">${f.indicateurs.sites} site${
          f.indicateurs.sites > 1 ? "s ont" : " a"} répondu sur ${f.indicateurs.attendus}</strong>,
        soit ${pct(f.indicateurs.partEffectif * 100)} % de l'effectif. Les chiffres ci-dessous ne portent
        que sur ce périmètre-là, et une fiche qui ne le dirait pas serait fausse sans être
        inexacte.</p>
    </section>` : ""}

    ${f.rubriques.map(rub).join("")}

    <section class="card card--flat">
      <h3 style="font-size:var(--t-md)">La référence, et sa date</h3>
      <p class="muted" style="font-size:var(--t-sm);margin-top:var(--s3)">
        ${esc(f.norme.reference)}. Vérifiée le ${dateFR(f.norme.verifie_le)}.</p>
      <p class="hint" style="margin-top:var(--s3)">${esc(f.norme.reserve)}</p>
      <div class="row" style="gap:var(--s2);margin-top:var(--s5);flex-wrap:wrap">
        <button class="btn btn--primary btn--sm" id="imp">Imprimer ou enregistrer en PDF</button>
        <button class="btn btn--ghost btn--sm" id="csvV">Exporter en CSV</button>
      </div>
    </section>
  </div>`);

  el.querySelector("#vc").onchange = (ev) => {
    sessionStorage.setItem("riseva.vsme.camp", ev.target.value);
    location.reload();
  };
  el.querySelector("#imp").onclick = () => setTimeout(() => window.print(), 200);
  el.querySelector("#csvV").onclick = () => versCSV("riseva-vsme.csv",
    ["Rubrique", "Titre", "Pilier", "Couverture", "Indicateur", "Valeur", "Unité"],
    f.rubriques.flatMap(r => r.lignes.length
      ? r.lignes.map(l => [r.cle, r.titre, r.pilier,
          r.renseignee ? r.couvert : "non", l.libelle,
          l.texte !== undefined ? l.texte
            : (l.valeur === null || l.valeur === undefined ? "non renseigné" : l.valeur),
          l.unite || ""])
      : [[r.cle, r.titre, r.pilier, "non", "", "non renseigné", ""]]));
  return el;
}

/* ------------------------------------------------------------------ */
/* L'adoption                                                          */
/* ------------------------------------------------------------------ */
/* La question qu'un responsable RSE se pose au bout de trois mois n'est pas
   « combien de points » mais « pourquoi ça ne prend pas ». Un rapport annuel ne
   rattrape pas une saison restée inactive : quand il arrive, elle est finie et
   le renouvellement est déjà décidé. Cet écran-là arrive au bon moment. */
/* ---- L'offre associative autour de chaque site ----
   L'écran d'adoption écrivait déjà, comme cause probable d'un décrochage,
   « l'offre locale est trop loin ou ne correspond pas ». Il l'écrivait sans
   jamais la mesurer — et une cause qu'on suggère sans la chiffrer n'est qu'une
   excuse polie faite au client.

   Trois choses décident, et aucune ne dépend de la bonne volonté des équipes.
   La DISTANCE : un site industriel est en périphérie, et personne ne fait
   trente-cinq kilomètres après sa journée. Le JOUR : un chef d'atelier ne libère
   pas un opérateur en 3×8 un mardi à quatorze heures, donc une offre entièrement
   en semaine ouvrée exclut mécaniquement une grande part de l'effectif. Le
   FORMAT : le don de matériel ne demande la disponibilité de personne, c'est la
   seule voie qui reste quand les deux premières contraintes se cumulent.

   Ce tableau est donc une liste de travail pour Riseva, jamais un reproche au
   client. Il est trié du site le plus mal servi au mieux servi. */
const VERDICTS_OFFRE = {
  aucune:       { badge:"badge--danger", mot:"aucune offre",
                  dit:"Aucune association ne publie de besoin à portée de ce site. Vos "
                    + "salariés n'ont rien à quoi répondre : le taux de participation "
                    + "de ce site ne mesure rien d'autre que ça." },
  inaccessible: { badge:"badge--warn", mot:"horaires incompatibles",
                  dit:"Tout ce qui est proposé tombe en semaine ouvrée, et aucun don de "
                    + "matériel n'est ouvert. Un salarié en poste ou en équipe ne peut "
                    + "pas s'y rendre, ce n'est pas un problème d'envie." },
  mince:        { badge:"badge--warn", mot:"offre trop mince",
                  dit:"Il y a moins d'annonces à portée que ce que l'effectif de ce site "
                    + "demanderait. Ce n'est pas une prédiction sur ce qui va se passer : "
                    + "c'est un décompte de ce qui est ouvert aujourd'hui." },
  suffisante:   { badge:"badge--ok", mot:"offre suffisante",
                  dit:"Assez d'annonces à portée pour l'effectif du site. Si la "
                    + "participation reste basse ici, la cause est ailleurs." }
};

function offreLocaleBloc(u, sites){
  if (!sites || !sites.length) return "";
  const km = (n) => n === 0 ? "moins d'1 km" : `${nb(n)} km`;
  const lignes = sites.map(o => {
    const v = VERDICTS_OFFRE[o.verdict];
    return `
      <div class="offre">
        <div class="between" style="align-items:baseline;flex-wrap:wrap;gap:var(--s3)">
          <h4 style="font-size:var(--t-md)">${esc(o.site.nom)}, ${esc(o.site.ville)}
            <span class="muted" style="font-weight:400;font-size:var(--t-sm)">
              ${nb(o.site.effectif)} salariés</span></h4>
          <span class="badge ${v.badge}">${v.mot}</span>
        </div>
        ${o.situe ? `
        <div class="offre__chiffres">
          <div><b>${nb(o.ouvertes)}</b><span>annonce${o.ouvertes > 1 ? "s" : ""} ouverte${
            o.ouvertes > 1 ? "s" : ""} à moins de ${nb(o.rayon)} km</span></div>
          <div><b>${o.plusProche === null ? "-" : km(o.plusProche)}</b><span>la plus proche</span></div>
          ${o.ouvertes >= 4
            ? `<div><b>${km(o.mediane)}</b><span>distance médiane</span></div>`
            : `<div><b>${nb(o.places)}</b><span>place${o.places > 1 ? "s" : ""} encore
                ouverte${o.places > 1 ? "s" : ""}</span></div>`}
          <div><b>${nb(o.weekend)} / ${nb(o.semaine + o.weekend)}</b>
            <span>hors semaine ouvrée</span></div>
        </div>
        <p class="hint" style="margin-top:var(--s3)">${esc(v.dit)}</p>
        ${o.parFormat.materiel === 0 ? `<p class="hint">
          Aucun don de matériel ouvert à portée. Ce format n'est pas une solution de
          rechange pour un salarié qui n'a pas de créneau, le matériel appartient à
          l'entreprise, la décision aussi. C'est en revanche la seule voie qui reste
          ouverte à l'entreprise elle-même quand les horaires bloquent.</p>` : ""}
        ${o.verdict !== "suffisante" ? `
        <div class="offre__agir" data-et="${esc(o.site.id)}">
          ${o.signalee ? `<p class="hint" style="margin:0">
            <strong style="color:var(--ink)">Zone signalée le ${dateFR(o.signalee.le)}.</strong>
            Ce site est dans notre file de prospection associative. Nous ne vous donnons pas
            de date : une association décide seule de publier ou non, et promettre un délai
            qui ne dépend pas de nous serait la première chose qu'on ne tiendrait pas.</p>`
          : `<button class="btn btn--quiet btn--sm js-signal" type="button">Nous demander de
              chercher ici</button>
            <span class="muted" style="font-size:var(--t-sm)">Met ce site dans notre file de
              prospection. Sans date promise : une association décide seule de publier.</span>`}
          <button class="btn btn--quiet btn--sm js-inviter" type="button">Inviter une
            association que vous connaissez</button>
        </div>` : ""}
        ${o.aRelancerTotal ? `<p class="hint">
          <strong style="color:var(--ink)">${nb(o.aRelancerTotal)} association${
            o.aRelancerTotal > 1 ? "s vérifiées" : " vérifiée"} à moins de ${nb(o.rayon)} km
          ${o.aRelancerTotal > 1 ? "ne publient" : "ne publie"} rien en ce moment</strong> :
          ${o.aRelancer.map(x => esc(x.nom)).join(", ")}. Une association qui ne publie pas
          n'a presque jamais dit non, elle n'a pas eu le temps d'écrire l'annonce. C'est à
          nous de l'appeler.</p>` : ""}
        ` : `<p class="hint" style="margin-top:var(--s3)">L'adresse de ce site n'est pas
          localisée : sans elle, aucune distance ne peut être calculée. Renseignez-la dans
          <a href="#/sites">Sites et quotas</a>.</p>`}
      </div>`;
  }).join("");

  const nonSituees = sites.length ? sites[0].nonSituees : 0;
  return `<section class="card">
    <h3>L'offre autour de vos sites</h3>
    <p class="muted" style="font-size:var(--t-sm);margin-top:4px;max-width:70ch">
      Ce qu'un salarié de chaque site peut réellement faire aujourd'hui, à moins de
      ${nb(DB.RAYON_OFFRE_KM)} km. Du site le plus mal servi au mieux servi, c'est dans cet
      ordre que nous nous en occupons.</p>
    <div class="stack" style="--gap:var(--s5);margin-top:var(--s6)">${lignes}</div>
    ${nonSituees ? `<p class="hint" style="margin-top:var(--s5)">${nb(nonSituees)} annonce${
      nonSituees > 1 ? "s ouvertes ne sont pas localisées" : " ouverte n'est pas localisée"} et
      ${nonSituees > 1 ? "ne sont" : "n'est"} donc comptée${nonSituees > 1 ? "s" : ""} nulle
      part. Le remède est de géocoder l'association, pas de la retirer du décompte.</p>` : ""}
  </section>`;
}

/* Le texte de l'invitation est écrit d'avance et nominatif. C'est la seule
   raison pour laquelle ce genre de bouton sert à quelque chose : un référent de
   site ne rédigera pas un courriel de présentation d'une plateforme qu'il ne
   connaît pas lui-même bien. On lui donne le message, il ajoute l'adresse. */
function ouvrirInvitationAsso(etid){
  const t = DB.texteInvitationAsso(etid);
  const corps = h(`<div class="stack" style="--gap:var(--s4)">
    <p class="muted" style="font-size:var(--t-sm)">Votre site connaît son territoire mieux
      que nous : le club que vous soutenez, l'ESAT voisin, la banque alimentaire du coin.
      Le message est écrit, vous n'avez qu'à mettre l'adresse.</p>
    <div class="field"><label for="inv-o">Objet</label>
      <input class="input" id="inv-o" value="${esc(t.objet)}" readonly></div>
    <div class="field"><label for="inv-c">Message</label>
      <textarea class="textarea" id="inv-c" rows="12" readonly>${esc(t.corps)}</textarea></div>
    <p class="hint">Il ne promet ni argent ni bénévoles : personne ne peut garantir qu'un
      salarié se proposera, et une association qui découvrirait ça après coup ne
      reviendrait pas.</p>
  </div>`);
  modal("Inviter une association que vous connaissez", corps, [
    { label: "Fermer" },
    { label: "Copier le message", classe: "btn--quiet", onClick: () => {
        try { navigator.clipboard.writeText(t.corps); toast("Message copié."); }
        catch { toast("Copie impossible : sélectionnez le texte à la main."); }
        return false;
      }},
    { label: "Ouvrir dans mon courriel", classe: "btn--primary", onClick: () => {
        location.href = `mailto:?subject=${encodeURIComponent(t.objet)}`
          + `&body=${encodeURIComponent(t.corps)}`;
      }}
  ]);
}

function vueAdoption(u){
  let site = null, offre = [];
  const el = h(`<div class="stack" style="--gap:var(--s5)"></div>`);

  /* Le moteur de démonstration répond tout de suite ; Supabase répond après un
     aller-retour, parce que ces chiffres sont calculés dans la base et pas dans
     le navigateur. `Promise.resolve` accepte les deux sans que l'écran ait à
     savoir lequel il a en face. */
  const charger = () => Promise.resolve(DB.offreParSite(u.org))
    .then(r => { offre = r || []; dessine(); })
    .catch(() => { offre = []; dessine(); });

  const dessine = () => {
    const a = DB.adoption({ entreprise: u.org, etablissement: site });
    if (a && typeof a.then === "function"){
      a.then(x => { rendreAdoption(x); }).catch(() => {});
      return;
    }
    rendreAdoption(a);
  };

  const rendreAdoption = (a) => {
    if (!a){ el.innerHTML = ""; el.appendChild(h(`<section class="card"><p class="empty">Aucune société rattachée.</p></section>`)); return; }
    const max = a.marches[0].n || 1;
    el.innerHTML = "";
    /* `h()` ne rend que le premier élément : deux sections frères dans un même
       appel et la seconde disparaît sans erreur. Un conteneur, et le problème
       n'existe plus. */
    el.appendChild(h(`<div class="stack" style="--gap:var(--s5)">
      <section class="card">
        <div class="between" style="flex-wrap:wrap;gap:var(--s4);align-items:flex-start">
          <div>
            <h3>Où ça bloque</h3>
            <p class="muted" style="font-size:var(--t-sm);margin-top:4px;max-width:64ch">
              Cinq marches entre un salarié inscrit et un salarié qui revient. Celle où
              vous perdez le plus de monde est signalée : c'est là qu'il faut agir, et
              nulle part ailleurs.</p>
          </div>
          <div class="field" style="margin:0;min-width:200px">
            <label for="ads">Périmètre</label>
            <select class="select" id="ads">
              <option value="">Toute la société</option>
              ${a.sites.map(x => `<option value="${x.id}"${x.id === site ? " selected" : ""}
                >${esc(x.nom)}, ${esc(x.ville)}</option>`).join("")}
            </select>
          </div>
        </div>

        ${a.lisible ? "" : `<p class="empty" style="margin-top:var(--s6)">
          Moins de ${nb(a.plancher)} comptes ouverts sur ce périmètre : l'entonnoir n'est pas
          affiché. Sur un si petit groupe, dire « un seul s'est engagé » revient à désigner
          quelqu'un, même sans le nommer, et cet écran promet le contraire. Choisissez un
          périmètre plus large.</p>`}
        <div class="stack" style="--gap:var(--s4);margin-top:var(--s6)"${
          a.lisible ? "" : ' hidden'}>
          ${a.marches.map((m, i) => `
            <div>
              <div class="between" style="align-items:baseline;margin-bottom:6px">
                <span style="font-size:var(--t-sm)${
                  m.cle === a.rupture ? ";font-weight:600;color:var(--ink)" : ""}">
                  ${esc(m.label)}${m.cle === a.rupture
                    ? ` <span class="badge badge--warn" style="height:20px;margin-left:6px">premier écart observable</span>` : ""}</span>
                <span class="tnum"><b>${nb(m.n)}</b>${i > 0 && m.garde !== undefined
                  ? ` <span class="muted" style="font-size:var(--t-xs)">${
                      pct(m.garde * 100, 0)} % de la marche précédente</span>` : ""}</span>
              </div>
              <div class="bar${m.cle === a.rupture ? "" : " bar--lime"}">
                <i style="width:${Math.max(0.6, (m.n / max) * 100)}%"></i></div>
              ${m.cle === a.rupture && m.cause ? `<p class="hint" style="margin-top:6px">
                <strong style="color:var(--ink)">${nb(m.perdus)} personne${
                  m.perdus > 1 ? "s" : ""} de moins qu'à la marche précédente.</strong>
                ${esc(m.cause)}${m.action ? ` <a href="${esc(m.action.vers)}">${
                  esc(m.action.texte)}</a>.` : ""}</p>` : ""}
            </div>`).join("")}
        </div>
      </section>

      ${a.lisible && a.actifs ? `<section class="card">
        <h3 style="font-size:var(--t-lg)">Et ceux qui reviennent</h3>
        <p class="muted" style="font-size:var(--t-sm);margin-top:4px;max-width:70ch">
          Ce chiffre était la sixième marche de l'entonnoir. Il n'y avait pas sa place :
          les cinq marches mesurent une <em>acquisition</em>, combien de personnes
          franchissent une étape de plus, et celui-ci mesure une <em>rétention</em>, ce que
          fait quelqu'un qui a déjà tout franchi. Mélangés, ils font chercher la cause du
          décrochage au mauvais endroit.</p>
        <p style="font-family:var(--font-display);font-size:1.6rem;line-height:1.2;
          margin-top:var(--s4)">${nb(a.revenus)} salarié${a.revenus > 1 ? "s" : ""}
          sur ${nb(a.actifs)} <span style="font-size:var(--t-md);color:var(--ink-500)">
          ${a.revenus > 1 ? "sont revenus" : "est revenu"} après une première action
          validée</span></p>
        <p class="hint" style="margin-top:var(--s3)">C'est la mesure qui fait la saison
          suivante : une personne qui revient a trouvé l'expérience bonne, et c'est la seule
          chose qu'aucune relance ne fabrique.</p>
      </section>` : ""}

      <div class="two">
        <section class="card">
          <h3 style="font-size:var(--t-lg)">Combien de temps avant la première action</h3>
          ${a.delaiMesurable >= 3 ? `
            <div style="font-family:var(--font-display);font-size:2.2rem;line-height:1.05;
              margin-top:var(--s4)">${nb(a.delaiMedian)}
              <span style="font-size:var(--t-lg);color:var(--ink-500)">jours, en médiane</span></div>
            <p class="muted" style="font-size:var(--t-sm);margin-top:var(--s3)">
              <strong style="color:var(--ink)">${nb(a.delaiMesurable)} compte${
                a.delaiMesurable > 1 ? "s" : ""} sur ${nb(a.delaiSur)} ${
                a.delaiMesurable > 1 ? "ont" : "a"} obtenu une première action validée.</strong>
              Ce délai est celui de ces ${nb(a.delaiMesurable)}-là, et d'eux seuls : les autres
              n'ont pas un délai long, ils n'ont pas de délai. Médiane et non moyenne, pour la
              même raison, un salarié qui met huit mois tirerait la moyenne et ferait croire
              à un problème général alors qu'il est seul.</p>
            ${a.sansAction ? `<p class="hint" style="margin-top:var(--s4)">
              <strong style="color:var(--ink)">${nb(a.sansAction)} compte${
                a.sansAction > 1 ? "s ouverts n'ont" : " ouvert n'a"} encore rien fait</strong>,
              ouvert${a.sansAction > 1 ? "s" : ""} depuis ${nb(a.sansActionMedian)} jours en
              médiane${a.sansActionPlusDe90 ? `, dont ${nb(a.sansActionPlusDe90)} depuis plus de
              quatre-vingt-dix jours` : ""}.
              <a href="#/supports">Relancer les comptes ouverts sans action</a>.</p>` : ""}
          ` : `<p class="empty" style="margin-top:var(--s4)">Pas encore assez de premières
            actions pour en tirer une médiane. Riseva préfère ne rien afficher qu'un chiffre
            calculé sur deux personnes.</p>`}
        </section>

        <section class="card card--flat" style="background:var(--forest-050);border-color:transparent">
          <h3 style="font-size:var(--t-lg)">Ce que cet écran ne dit pas</h3>
          <p class="muted" style="font-size:var(--t-sm);margin-top:var(--s3);color:var(--ink-600)">
            Il ne nomme personne, et il ne le fera pas. Vous voyez des marches et des
            nombres, jamais la liste de ceux qui ne sont pas venus. Un outil qui produit
            cette liste-là cesse d'être un outil d'engagement et devient un outil de
            surveillance, et le premier salarié qui le comprend est le dernier à
            s'inscrire.</p>
          <p class="muted" style="font-size:var(--t-sm);margin-top:var(--s3);color:var(--ink-600)">
            Un taux bas ne mesure pas non plus la bonne volonté de vos équipes. Il mesure
            souvent l'offre associative disponible autour du site, les horaires, et le
            temps que leur encadrement leur laisse réellement prendre. Le tableau ci-dessous
            la mesure, site par site : c'est notre travail, pas le vôtre.</p>
        </section>
      </div>

      ${offreLocaleBloc(u, offre)}
    </div>`));
    el.querySelector("#ads").onchange = (ev) => { site = ev.target.value || null; dessine(); };

    /* Un diagnostic qui s'arrête au diagnostic est une excuse préparée d'avance.
       Deux issues, et elles vont dans deux directions opposées : l'une nous donne
       du travail, l'autre reconnaît que le site en sait plus que nous sur son
       propre bassin. */
    el.querySelectorAll(".offre__agir").forEach(zone => {
      const etid = zone.dataset.et;
      const bs = zone.querySelector(".js-signal");
      if (bs) bs.onclick = () => {
        Promise.resolve(DB.signalerZone(etid, u.id))
          .then(() => {
            toast("Zone signalée. Nous cherchons des associations autour de ce site.");
            charger();
          })
          .catch(err => toast(err.message || "Signalement impossible."));
      };
      zone.querySelector(".js-inviter").onclick = () => ouvrirInvitationAsso(etid);
    });
  };
  charger();
  return el;
}

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
    adoption:  [vueAdoption,       "Adoption"],
    mecenat:   [vueMecenat,        "Mécénat"],
    materiel:  [vueMateriel,       "Dons de matériel"],
    dossier:   [vueDossier,        "Réponses aux questionnaires clients"],
    vsme:      [vueVSME,           "Fiche de durabilité (VSME)"],
    supports:  [vueSupports,       "Affiches et supports"],
    abonnement:[vueAbonnement,     "Abonnement"],
    parametres:[vueParametres,     "Paramètres"],
    groupe:    [vueGroupe,         "Vue consolidée du groupe"],
    sites:     [vueSites,          "Sites et quotas"],
    indicateurs:[vueIndicateurs,   "Données sociales et sécurité"],
    securite:  [vueSecurite,       "Sécurité et plan d'actions"],
    preferences:[vuePreferences,   "Préférences"]
  },
  site_referent: {
    tableau:   [tableauSite,       "Tableau de bord du site"],
    equipe:    [vueEquipe,         "Mes salariés"],
    indicateurs:[vueIndicateurs,   "Données sociales et sécurité"],
    securite:  [vueSecurite,       "Sécurité de mon site"],
    annonces:  [vueAnnonces,       "Annonces"],
    missions:  [vueMissions,       "Missions du site"],
    annuaire:  [vueAnnuaire,       "Associations"],
    ensemble:  [vueEnsemble,       "Tous ensemble"],
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
    /* Une table grise dans une carte, et rien d'autre : c'etait l'ecran le plus
       administratif du produit, et c'est celui qu'une association ouvre le plus
       souvent. Une carte de tete lui donne son chiffre, celui qu'elle vient
       verifier : combien de places restent a prendre. */
    mesannonces:[(u) => {
      const anns = DB.annonces({ asso: u.org, toutes: true });
      const ouvertes = anns.filter(a => a.etat === "ouverte");
      const places = ouvertes.filter(a => !estArgent(a.type))
                             .reduce((n, a) => n + (a.restant || 0), 0);
      const d = h(`<div class="stack" style="--gap:var(--s5)">
        <section class="card card--dark grain">
          <span class="kpi__label" style="color:var(--forest-100);opacity:.75">Ce qui vous attend</span>
          <span class="kpi__value" style="color:var(--lime)">${nb(places)}</span>
          <span class="kpi__delta" style="color:var(--forest-100);opacity:.75">${
            ouvertes.length
              ? `place${places > 1 ? "s" : ""} encore libre${places > 1 ? "s" : ""} sur
                 ${nb(ouvertes.length)} annonce${ouvertes.length > 1 ? "s" : ""} ouverte${
                 ouvertes.length > 1 ? "s" : ""}`
              : `aucune annonce ouverte pour l'instant : personne ne peut se positionner`}</span>
        </section>
        <section class="card" id="tableAnn"></section>
      </div>`);
      d.querySelector("#tableAnn").appendChild(tableAnnoncesAsso(anns, u));
      return d;
    }, "Mes annonces"],
    avalider:   [vueAValider,  "Missions à valider"],
    page:       [vuePageAsso,  "Ma page publique"],
    dossier:    [vueDossierAsso, "Mon dossier"],
    recus:      [vueRecus,     "Reçus fiscaux"],
    dons:       [vueDonsAsso,  "Dons en argent"],
    preferences:[vuePreferences, "Préférences"]
  },
  cse: {
    tableau:    [vueCSE,       "Ce que le CSE lit"],
    ensemble:   [vueEnsemble,  "Tous ensemble"],
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
    expeditions:    [vueExpeditions,           "Affiches à expédier"],
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
  /* Les barres partent de zero et se remplissent une fois l'ecran pose. La
     transition CSS existait depuis le debut et ne jouait jamais : une largeur
     ecrite dans l'attribut `style` au moment du rendu n'a pas d'etat de depart
     a quitter. Deux images suffisent a lui en donner un. */
  const barres = [...el.querySelectorAll(".bar > i")].map(i => {
    const w = i.style.width; i.style.width = "0"; return [i, w];
  });
  requestAnimationFrame(() => requestAnimationFrame(() =>
    barres.forEach(([i, w]) => { i.style.width = w; })));
  el.querySelector("#np")?.addEventListener("click", () => formAnnonce(u));
}

const DEMO = demoDemandee();

window.addEventListener("hashchange", rendre);

/* Branche Supabase si window.RISEVA_CONFIG existe (défini dans /app/config.js),
   sinon l'application reste en mode démonstration. */
/* En production, une écriture revient du serveur après coup : l'écran se
   redessine à ce moment-là, et un refus de policy s'annonce au lieu de se
   perdre dans une promesse que personne n'attend. */
brancherEvenements({
  apres: () => rendre(),
  erreur: (e) => toast(e && e.message ? e.message : "L'enregistrement a été refusé.")
});
addEventListener("unhandledrejection", (e) => {
  const m = e.reason && e.reason.message;
  if (!m) return;
  e.preventDefault();
  toast(m);
});

/* Une association qui arrive de la vitrine a deja donne son nom, sa ville, ce
   qui lui manque et son adresse. Lui redemander les memes quatre champs derriere
   un ecran de connexion, c'est la perdre : elle a rempli un formulaire, elle
   attend un compte, pas un accuse de reception.

   La vitrine depose donc ce qu'elle a recueilli, l'application ouvre le compte
   et la depose directement dans son dossier, a l'endroit ou il reste trois
   choses a completer : le numero au registre, l'IBAN et une photo. Rien n'est
   demande deux fois. */
const CLE_NOUVELLE_ASSO = "riseva.nouvelleAsso";
function ouvrirCompteDepuisVitrine(){
  let brut;
  try { brut = localStorage.getItem(CLE_NOUVELLE_ASSO); } catch (e) { return false; }
  if (!brut) return false;
  try { localStorage.removeItem(CLE_NOUVELLE_ASSO); } catch (e) {}
  let d;
  try { d = JSON.parse(brut); } catch (e) { return false; }
  if (!d || !d.asso || !d.mail) return false;
  try {
    const r = DB.creerCompteAssociation({
      association: d.asso, ville: d.ville || "", cause: "",
      resume: d.mot ? `Ce qui nous manque le plus en ce moment : ${d.mot}.` : "",
      nom: d.contact || d.asso, email: d.mail });
    setSession(r.utilisateur.id);
    location.hash = "#/dossier";
    setTimeout(() => toast("Compte ouvert. Il reste trois champs pour être visible."), 400);
    return true;
  } catch (e) { return false; }
}

(async () => {
  /* `?vierge=1` : le premier jour d'une installation neuve. Une saison ouverte,
     le barème, et rien d'autre. C'est l'état dans lequel chaque écran doit
     encore se tenir, et la recette le traverse rôle par rôle. */
  const vierge = new URLSearchParams(location.search).has("vierge");
  if (vierge){ demarrerVierge(); }
  else if (window.RISEVA_CONFIG) {
    try { await connecterSupabase(window.RISEVA_CONFIG); } catch (e) { console.warn(e); }
  }
  if (!vierge) ouvrirCompteDepuisVitrine();
  rendre();
})();
