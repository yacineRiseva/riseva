/* Riseva — couche de données.
   Deux implémentations : `mock` (données de démonstration en mémoire, aucun serveur)
   et `supabase` (client CDN, activé dès que /app/config.js fournit une URL et une clé anon).
   Le reste de l'application ne parle qu'à l'objet `DB` exporté ici. */

export const BAREME = {
  don_financier:          { label: "Don financier",   unite: "10 € versés",  points: 1,   icone: "coins" },
  benevolat_demi_journee: { label: "Bénévolat",       unite: "demi-journée", points: 150, icone: "hands" },
  don_materiel:           { label: "Don de matériel", unite: "don validé",   points: 100, icone: "box"  }
};

export const ETATS_MISSION = {
  engagee:      { label: "Engagée",            badge: "badge--info"   },
  a_valider:    { label: "À valider",          badge: "badge--warn"   },
  validee:      { label: "Validée",            badge: "badge--ok"     },
  validee_auto: { label: "Validée sans retour", badge: "badge--ok"    },
  refusee:      { label: "Refusée",            badge: "badge--danger" }
};

const J = (n) => { const d = new Date(2026, 7, 20); d.setDate(d.getDate() + n); return d.toISOString().slice(0,10); };

/* ------------------------------------------------------------------ */
/* Jeu de démonstration                                                */
/* ------------------------------------------------------------------ */
const seed = {
  saison: {
    id: "s2027", nom: "Saison 2027", debut: "2027-01-01", fin: "2027-12-31",
    etat: "ouverte", prix_min: 3500, prix_max: 4000, acompte: 500
  },
  entreprises: [
    { id:"e1", nom:"Lafarge Ciments",     effectif:210, points:12480, secteur:"Industrie",  ville:"Lyon" },
    { id:"e2", nom:"Groupe Vidal",        effectif:340, points:18020, secteur:"Logistique", ville:"Lille" },
    { id:"e3", nom:"Cabinet Marchand",    effectif:64,  points:15470, secteur:"Conseil",    ville:"Paris" },
    { id:"e4", nom:"Novaterre",           effectif:120, points:14100, secteur:"Agro",       ville:"Nantes" },
    { id:"e5", nom:"Atelier Berthier",    effectif:38,  points:11040, secteur:"Artisanat",  ville:"Toulouse" },
    { id:"e6", nom:"Sirius Assurances",   effectif:520, points:9380,  secteur:"Assurance",  ville:"Bordeaux" },
    { id:"e7", nom:"Delmas & Fils",       effectif:87,  points:7920,  secteur:"BTP",        ville:"Rennes" },
    { id:"e8", nom:"Kervella Transport",  effectif:145, points:6410,  secteur:"Transport",  ville:"Brest" }
  ],
  associations: [
    { id:"a1", nom:"Refuge des Quatre Vents", ville:"Saint-Étienne", cause:"Protection animale",
      resume:"Refuge de 180 places qui recueille chiens et chats abandonnés depuis 1998.",
      site:"", valide:true },
    { id:"a2", nom:"Racines Vives", ville:"Clermont-Ferrand", cause:"Reforestation",
      resume:"Replantation de haies bocagères et de forêts mixtes sur des parcelles agricoles.",
      site:"", valide:true },
    { id:"a3", nom:"Rivière Propre 42", ville:"Roanne", cause:"Dépollution",
      resume:"Nettoyage des berges de la Loire et sensibilisation dans les écoles.",
      site:"", valide:true },
    { id:"a4", nom:"Le Panier Solidaire", ville:"Villeurbanne", cause:"Aide alimentaire",
      resume:"Distribution de 900 colis par mois et maraude hebdomadaire.",
      site:"", valide:true },
    { id:"a5", nom:"Second Souffle", ville:"Grenoble", cause:"Réemploi",
      resume:"Reconditionnement de matériel informatique pour des familles et des écoles.",
      site:"", valide:false }
  ],
  annonces: [
    { id:"an1", asso:"a1", type:"benevolat_demi_journee", titre:"Sortie des chiens et entretien des box",
      description:"Nous manquons de bras le samedi matin. Six personnes suffisent pour sortir 40 chiens et remettre les box en état.",
      quantite:6, restant:4, date:J(9), lieu:"Saint-Étienne", etat:"ouverte" },
    { id:"an2", asso:"a2", type:"benevolat_demi_journee", titre:"Plantation de 400 arbres à Beaumont",
      description:"Chantier de plantation sur une parcelle de deux hectares. Aucune compétence particulière requise, on fournit le matériel.",
      quantite:12, restant:9, date:J(16), lieu:"Beaumont (63)", etat:"ouverte" },
    { id:"an3", asso:"a3", type:"don_materiel", titre:"Waders et gants de protection",
      description:"Nos équipements sont hors d'usage. Nous cherchons des waders taille 40 à 46 et des gants épais.",
      quantite:10, restant:10, date:J(24), lieu:"Roanne", etat:"ouverte" },
    { id:"an4", asso:"a4", type:"don_financier", titre:"Financer 300 colis pour l'hiver",
      description:"Chaque colis revient à 8,50 €. La collecte d'hiver démarre en novembre.",
      quantite:2550, restant:1820, date:J(40), lieu:"Villeurbanne", etat:"ouverte" },
    { id:"an5", asso:"a1", type:"don_materiel", titre:"Croquettes et couvertures",
      description:"Nous acceptons les palettes de croquettes non entamées et les couvertures propres.",
      quantite:5, restant:2, date:J(30), lieu:"Saint-Étienne", etat:"ouverte" },
    { id:"an6", asso:"a2", type:"don_financier", titre:"Achat de 1 200 plants de charme",
      description:"Un plant coûte 2,10 € livré. Objectif : sécuriser la campagne de plantation d'automne.",
      quantite:2520, restant:2520, date:J(52), lieu:"Clermont-Ferrand", etat:"ouverte" },
    { id:"an7", asso:"a3", type:"benevolat_demi_journee", titre:"Nettoyage des berges, secteur amont",
      description:"Ramassage sur trois kilomètres de berges. Prévoir des bottes.",
      quantite:15, restant:0, date:J(-4), lieu:"Roanne", etat:"close" }
  ],
  missions: [
    { id:"m1", annonce:"an1", entreprise:"e1", salarie:"u3", etat:"validee",     quantite:2, points:300,  date:J(-12) },
    { id:"m2", annonce:"an2", entreprise:"e1", salarie:"u4", etat:"validee",     quantite:3, points:450,  date:J(-9) },
    { id:"m3", annonce:"an4", entreprise:"e1", salarie:"u3", etat:"validee",     quantite:600, points:60, date:J(-7) },
    { id:"m4", annonce:"an5", entreprise:"e1", salarie:"u5", etat:"a_valider",   quantite:3, points:300,  date:J(-2) },
    { id:"m5", annonce:"an1", entreprise:"e1", salarie:"u4", etat:"engagee",     quantite:2, points:300,  date:J(9)  },
    { id:"m6", annonce:"an7", entreprise:"e1", salarie:"u5", etat:"validee_auto",quantite:1, points:150,  date:J(-4) },
    { id:"m7", annonce:"an3", entreprise:"e1", salarie:"u3", etat:"refusee",     quantite:1, points:0,    date:J(-6) },
    { id:"m8", annonce:"an2", entreprise:"e2", salarie:"u9", etat:"validee",     quantite:4, points:600,  date:J(-5) }
  ],
  utilisateurs: [
    { id:"u1", nom:"Yacine Bounoua",  email:"contact@riseva.fr",        role:"admin",            org:null },
    { id:"u2", nom:"Claire Fontaine", email:"claire@lafarge-ciments.fr",role:"entreprise_admin", org:"e1" },
    { id:"u3", nom:"Malik Ferhat",    email:"malik@lafarge-ciments.fr", role:"salarie",          org:"e1", points:360, actif:true },
    { id:"u4", nom:"Sonia Delaunay",  email:"sonia@lafarge-ciments.fr", role:"salarie",          org:"e1", points:750, actif:true },
    { id:"u5", nom:"Hugo Vasseur",    email:"hugo@lafarge-ciments.fr",  role:"salarie",          org:"e1", points:450, actif:true },
    { id:"u6", nom:"Nadia Berrada",   email:"nadia@lafarge-ciments.fr", role:"salarie",          org:"e1", points:0,   actif:false },
    { id:"u7", nom:"Élise Tournier",  email:"elise@quatrevents.org",    role:"association",      org:"a1" },
    { id:"u9", nom:"Paul Girard",     email:"paul@groupe-vidal.fr",     role:"salarie",          org:"e2", points:600, actif:true }
  ],
  preinscriptions: [
    { id:"p1", entreprise:"Groupe Vidal",     contact:"m.vidal@groupe-vidal.fr", effectif:340, etat:"confirmee",   date:J(-21) },
    { id:"p2", entreprise:"Cabinet Marchand", contact:"rh@cabinet-marchand.fr",  effectif:64,  etat:"preinscrite", date:J(-14) },
    { id:"p3", entreprise:"Novaterre",        contact:"rse@novaterre.fr",        effectif:120, etat:"preinscrite", date:J(-6) },
    { id:"p4", entreprise:"Sirius Assurances",contact:"contact@sirius-a.fr",     effectif:520, etat:"relancee",    date:J(-3) }
  ],
  trimestres: [
    { nom:"T1", points:6100 }, { nom:"T2", points:9800 },
    { nom:"T3", points:14600 }, { nom:"T4", points:17620 }
  ],
  semaines: [820,1140,960,1480,1310,1720,1560,2040,1880,2260,2110,2480]
};

/* ------------------------------------------------------------------ */
/* Implémentation mock                                                 */
/* ------------------------------------------------------------------ */
const clone = (o) => JSON.parse(JSON.stringify(o));

function creerMock(){
  const s = clone(seed);
  let seq = 100;
  const id = (p) => p + (++seq);

  const api = {
    mode: "demo",
    saison: () => s.saison,
    bareme: () => BAREME,

    utilisateur: (uid) => s.utilisateurs.find(u => u.id === uid),
    utilisateurs: () => s.utilisateurs,
    entreprise: (eid) => s.entreprises.find(e => e.id === eid),
    entreprises: () => s.entreprises,
    association: (aid) => s.associations.find(a => a.id === aid),
    associations: () => s.associations,
    preinscriptions: () => s.preinscriptions,
    trimestres: () => s.trimestres,
    semaines: () => s.semaines,

    annonces: (filtre = {}) => s.annonces.filter(a =>
      (!filtre.asso   || a.asso === filtre.asso) &&
      (!filtre.type   || a.type === filtre.type) &&
      (!filtre.ouvertes || a.etat === "ouverte")),

    missions: (filtre = {}) => s.missions.filter(m =>
      (!filtre.entreprise || m.entreprise === filtre.entreprise) &&
      (!filtre.salarie    || m.salarie === filtre.salarie) &&
      (!filtre.asso       || (api.annonceDe(m) || {}).asso === filtre.asso) &&
      (!filtre.etat       || m.etat === filtre.etat)),

    annonceDe: (mission) => s.annonces.find(a => a.id === mission.annonce),

    classement(){
      return clone(s.entreprises).sort((a,b) => b.points - a.points)
        .map((e,i) => ({ ...e, rang: i + 1 }));
    },
    rangDe(eid){ return this.classement().findIndex(e => e.id === eid) + 1; },

    pointsPour(type, quantite){
      const b = BAREME[type];
      if (!b) return 0;
      return type === "don_financier"
        ? Math.floor((quantite / 10) * b.points)
        : quantite * b.points;
    },

    /* --- écritures --- */
    creerAnnonce(a){
      const n = { id:id("an"), etat:"ouverte", restant:a.quantite, ...a };
      s.annonces.unshift(n); return n;
    },
    fermerAnnonce(aid){
      const a = s.annonces.find(x => x.id === aid); if (a) a.etat = "close"; return a;
    },
    engager({ annonce, entreprise, salarie, quantite }){
      const a = s.annonces.find(x => x.id === annonce);
      if (!a || a.etat !== "ouverte") throw new Error("Annonce indisponible");
      if (quantite > a.restant) throw new Error("Quantité supérieure au besoin restant");
      a.restant -= quantite;
      if (a.restant === 0) a.etat = "close";
      const m = { id:id("m"), annonce, entreprise, salarie, quantite,
                  points: api.pointsPour(a.type, quantite), etat:"engagee", date:a.date };
      s.missions.unshift(m); return m;
    },
    declarerFaite(mid){
      const m = s.missions.find(x => x.id === mid); if (m) m.etat = "a_valider"; return m;
    },
    validerMission(mid, ok){
      const m = s.missions.find(x => x.id === mid); if (!m) return null;
      m.etat = ok ? "validee" : "refusee";
      if (ok){
        const e = s.entreprises.find(x => x.id === m.entreprise);
        if (e) e.points += m.points;
        const u = s.utilisateurs.find(x => x.id === m.salarie);
        if (u) u.points = (u.points || 0) + m.points;
      } else { m.points = 0; }
      return m;
    },
    desactiverSalarie(uid){
      const u = s.utilisateurs.find(x => x.id === uid); if (u) u.actif = false; return u;
    },
    inviterSalarie(org, nom, email){
      const u = { id:id("u"), nom, email, role:"salarie", org, points:0, actif:true };
      s.utilisateurs.push(u); return u;
    },
    preinscrire(p){
      const n = { id:id("p"), etat:"preinscrite", date:new Date().toISOString().slice(0,10), ...p };
      s.preinscriptions.unshift(n); return n;
    },
    validerAssociation(aid){
      const a = s.associations.find(x => x.id === aid); if (a) a.valide = true; return a;
    },

    /* --- rapports --- */
    rapport(eid, portee = "annuel"){
      const e = api.entreprise(eid);
      const ms = api.missions({ entreprise: eid })
                    .filter(m => m.etat === "validee" || m.etat === "validee_auto");
      const parType = {};
      let euros = 0;
      ms.forEach(m => {
        const a = api.annonceDe(m); if (!a) return;
        parType[a.type] = (parType[a.type] || 0) + m.points;
        if (a.type === "don_financier") euros += m.quantite;
      });
      const salaries = api.utilisateurs().filter(u => u.org === eid && u.role === "salarie");
      return {
        portee, entreprise: e, saison: s.saison,
        points: e.points, rang: api.rangDe(eid), total: s.entreprises.length,
        missions: ms.length, parType, euros,
        salariesEngages: salaries.filter(u => (u.points || 0) > 0).length,
        salariesTotal: salaries.length,
        trimestres: s.trimestres,
        demiJournees: ms.filter(m => (api.annonceDe(m)||{}).type === "benevolat_demi_journee")
                        .reduce((n,m) => n + m.quantite, 0),
        associations: new Set(ms.map(m => (api.annonceDe(m)||{}).asso)).size
      };
    }
  };
  return api;
}

/* ------------------------------------------------------------------ */
/* Sélection de l'implémentation                                       */
/* ------------------------------------------------------------------ */
let impl = creerMock();

export async function connecterSupabase(config){
  if (!config || !config.url || !config.anonKey) return impl;   // reste en démo
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const sb = createClient(config.url, config.anonKey);
  impl = { ...impl, mode: "supabase", client: sb };
  return impl;
}

export const DB = new Proxy({}, {
  get: (_, prop) => {
    const v = impl[prop];
    return typeof v === "function" ? v.bind(impl) : v;
  }
});
