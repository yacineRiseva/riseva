/* Riseva — couche de données.
   Deux implémentations : `mock` (données de démonstration en mémoire, aucun serveur)
   et `supabase` (client CDN, activé dès que /app/config.js fournit une URL et une clé anon).
   Le reste de l'application ne parle qu'à l'objet `DB` exporté ici. */

export const BAREME = {
  don_financier:          { label: "Don financier",   unite: "10 € versés",  points: 1,   icone: "coins" },
  benevolat_demi_journee: { label: "Bénévolat",       unite: "demi-journée", points: 150, icone: "hands" },
  don_materiel:           { label: "Don de matériel", unite: "don validé",   points: 100, icone: "box"  }
};

/* Règle anti-optimisation : aucun format ne peut peser plus de la moitié des points
   d'une entreprise sur une saison. Sans ce plafond, il suffirait de virer de l'argent
   pour truster le classement, ce qui viderait le jeu de son sens. */
export const PLAFOND_PAR_FORMAT = 0.5;

/* Catégories de taille. Comparer une entreprise de 40 salariés à une de 4 000 n'a
   aucun sens : le classement principal est normalisé, et il se lit par catégorie. */
export const CATEGORIES = [
  { id:"tpe", label:"Moins de 50 salariés",  min:0,   max:49 },
  { id:"pme", label:"50 à 199 salariés",     min:50,  max:199 },
  { id:"eti", label:"200 à 499 salariés",    min:200, max:499 },
  { id:"ge",  label:"500 salariés et plus",  min:500, max:Infinity }
];
export const categorieDe = (effectif) =>
  CATEGORIES.find(c => effectif >= c.min && effectif <= c.max) || CATEGORIES[0];

/* Cadre fiscal, sourcé et paramétrable plutôt que codé en dur : ces valeurs bougent
   chaque année et le produit ne doit pas avoir à être redéployé pour ça.
   - Réduction d'impôt mécénat : 60 % du don (art. 238 bis du CGI), 40 % au-delà de
     2 M€ pour un même don.
   - Plafond annuel : le plus élevé entre 20 000 € et 5 ‰ du chiffre d'affaires HT.
     Excédent reportable sur les cinq exercices suivants.
   - Mécénat de compétences : valorisation au coût de revient (rémunération brute
     chargée, au prorata du temps), plafonnée à trois fois le plafond mensuel de la
     Sécurité sociale par salarié et par an. PMSS 2026 = 4 005 €, donc 12 015 €. */
export const FISCAL = {
  annee: 2026,
  taux_reduction: 0.60,
  seuil_taux_reduit: 2_000_000,
  taux_reduit: 0.40,
  plafond_plancher: 20_000,
  plafond_taux_ca: 0.005,
  report_annees: 5,
  pmss: 4005,
  get plafond_mecenat_par_salarie(){ return this.pmss * 3; },

  /* Les millésimes des formulaires changent, et un ancien modèle peut être écarté
     en cas de contrôle. Ils vivent donc ici, pas dans le code des écrans.
     Vérifiés le 20/08/2026 sur impots.gouv.fr. */
  cerfa_particulier: "11580*05",   // 2041-RD, dons des particuliers, art. 200 du CGI
  cerfa_entreprise:  "16216*03",   // 2041-MEC-SD, dons des entreprises, art. 238 bis du CGI
  duree_max_mise_a_disposition_ans: 3   // article L. 8241-3 du code du travail
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
    { id:"e1", nom:"Lafarge Ciments",     effectif:210, sieges:210, ca:48_000_000, cout_jour_moyen:340,
      referent:"Claire Fontaine", referent_mail:"claire@lafarge-ciments.fr", siret:"39312091600025",
      domaines:["lafarge-ciments.fr"],
      adresse:"12 rue des Docks, 69009 Lyon", points:12480, secteur:"Industrie",  ville:"Lyon" },
    { id:"e2", nom:"Groupe Vidal",        effectif:340, sieges:350, ca:62_000_000, cout_jour_moyen:290, points:18020, secteur:"Logistique", ville:"Lille" },
    { id:"e3", nom:"Cabinet Marchand",    effectif:64,  sieges:75,  ca:9_800_000,  cout_jour_moyen:520,  points:15470, secteur:"Conseil",    ville:"Paris" },
    { id:"e4", nom:"Novaterre",           effectif:120, sieges:120, ca:21_000_000, cout_jour_moyen:310, points:14100, secteur:"Agro",       ville:"Nantes" },
    { id:"e5", nom:"Atelier Berthier",    effectif:38,  sieges:50,  ca:3_400_000,  cout_jour_moyen:280,  points:11040, secteur:"Artisanat",  ville:"Toulouse" },
    { id:"e6", nom:"Sirius Assurances",   effectif:520, sieges:500, ca:140_000_000, cout_jour_moyen:400, points:9380,  secteur:"Assurance",  ville:"Bordeaux" },
    { id:"e7", nom:"Delmas & Fils",       effectif:87,  sieges:100, ca:12_000_000, cout_jour_moyen:300, points:7920,  secteur:"BTP",        ville:"Rennes" },
    { id:"e8", nom:"Kervella Transport",  effectif:145, sieges:150, ca:18_000_000, cout_jour_moyen:270, points:6410,  secteur:"Transport",  ville:"Brest" }
  ],
  contrats: [
    { entreprise:"e1", statut:"actif", signe_le:J(-40), debut:"2027-01-01", fin:"2027-12-31",
      montant_ht:3800, acompte:500, reconduction:false,
      factures:[
        { ref:"RSV-2026-0007", libelle:"Acompte saison 2027", montant:500,  date:J(-40), echeance:J(-10), etat:"payee" },
        { ref:"RSV-2027-0031", libelle:"Solde saison 2027",   montant:3300, date:"2027-01-05", echeance:"2027-02-04", etat:"a_venir" }
      ] }
  ],
  associations: [
    { id:"a1", nom:"Refuge des Quatre Vents", ville:"Saint-Étienne", cause:"Protection animale",
      resume:"Refuge de 180 places qui recueille chiens et chats abandonnés depuis 1998.",
      site:"", valide:true, rna:"W423001234", verifiee_le:J(-120), a_reverifier_le:J(240), suspendue:false,
      recus:{ actif:true, eligible_mecenat:true, signataire:"Élise Tournier",
              qualite:"Présidente", prochain_numero:47, prefixe:"QV-2027-" } },
    { id:"a2", nom:"Racines Vives", ville:"Clermont-Ferrand", cause:"Reforestation",
      resume:"Replantation de haies bocagères et de forêts mixtes sur des parcelles agricoles.",
      site:"", valide:true, rna:"W631004567", verifiee_le:J(-60), a_reverifier_le:J(300), suspendue:false },
    { id:"a3", nom:"Rivière Propre 42", ville:"Roanne", cause:"Dépollution",
      resume:"Nettoyage des berges de la Loire et sensibilisation dans les écoles.",
      site:"", valide:true, rna:"W422009876", verifiee_le:J(-200), a_reverifier_le:J(-20), suspendue:false },
    { id:"a4", nom:"Le Panier Solidaire", ville:"Villeurbanne", cause:"Aide alimentaire",
      resume:"Distribution de 900 colis par mois et maraude hebdomadaire.",
      site:"", valide:true, rna:"W691002345", verifiee_le:J(-30), a_reverifier_le:J(330), suspendue:false },
    { id:"a5", nom:"Second Souffle", ville:"Grenoble", cause:"Réemploi",
      resume:"Reconditionnement de matériel informatique pour des familles et des écoles.",
      site:"", valide:false }
  ],
  annonces: [
    { id:"an1", asso:"a1", type:"benevolat_demi_journee", temps_travail:false, titre:"Sortie des chiens et entretien des box",
      description:"Nous manquons de bras le samedi matin. Six personnes suffisent pour sortir 40 chiens et remettre les box en état.",
      quantite:6, restant:4, date:J(9), lieu:"Saint-Étienne", etat:"ouverte" },
    { id:"an2", asso:"a2", type:"benevolat_demi_journee", temps_travail:true, titre:"Plantation de 400 arbres à Beaumont",
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
    { id:"an7", asso:"a3", type:"benevolat_demi_journee", temps_travail:true, titre:"Nettoyage des berges, secteur amont",
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
  acces: [
    { id:"ac1", entreprise:"e1", utilisateur:"u3", quoi:"inscription", code:"LAFARGE-7QK2", date:J(-28) },
    { id:"ac2", entreprise:"e1", utilisateur:"u4", quoi:"inscription", code:"LAFARGE-7QK2", date:J(-27) },
    { id:"ac3", entreprise:"e1", utilisateur:"u5", quoi:"inscription", code:"LAFARGE-7QK2", date:J(-25) },
    { id:"ac4", entreprise:"e1", utilisateur:"u2", quoi:"creation_lien", code:"LAFARGE-7QK2", date:J(-30) }
  ],
  invitations: [
    { id:"i1", entreprise:"e1", code:"LAFARGE-7QK2", places:210, utilisees:4,
      active:true, cree_le:J(-30), expire_le:J(120) }
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
    invitations: (eid) => s.invitations.filter(i => !eid || i.entreprise === eid),
    invitationActive: (eid) => s.invitations.find(i => i.entreprise === eid && i.active) || null,
    invitationParCode: (code) => s.invitations.find(i =>
      i.code.toUpperCase() === String(code || "").trim().toUpperCase()) || null,
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

    /* Points bruts d'une entreprise, ventilés par format, avec le plafond appliqué.
       On garde les deux chiffres : ce qui a été fait, et ce qui compte au classement. */
    pointsDe(eid){
      const ms = api.missions({ entreprise: eid })
                   .filter(m => m.etat === "validee" || m.etat === "validee_auto");
      const parType = {};
      ms.forEach(m => {
        const a = api.annonceDe(m); if (!a) return;
        parType[a.type] = (parType[a.type] || 0) + m.points;
      });
      let brut = Object.values(parType).reduce((x, y) => x + y, 0);

      /* Jeu de démonstration : les entreprises portent un total de saison qui couvre
         plus de missions que celles détaillées ici. On complète la ventilation au prorata
         du mélange observé, pour que le tableau de bord et le classement racontent la
         même histoire. En production, `brut` vient uniquement des missions. */
      const totalSaison = (api.entreprise(eid) || {}).points || 0;
      if (totalSaison > brut){
        const manque = totalSaison - brut;
        const mix = brut > 0
          ? Object.fromEntries(Object.entries(parType).map(([k, v]) => [k, v / brut]))
          : { benevolat_demi_journee: 0.62, don_materiel: 0.26, don_financier: 0.12 };
        Object.entries(mix).forEach(([k, part]) => {
          parType[k] = (parType[k] || 0) + Math.round(manque * part);
        });
        brut = Object.values(parType).reduce((x, y) => x + y, 0);
      }
      const plafond = Math.round(brut * PLAFOND_PAR_FORMAT);
      const retenuParType = {};
      let retenu = 0, ecrete = 0;
      Object.entries(parType).forEach(([k, v]) => {
        const r = Math.min(v, plafond);
        retenuParType[k] = r; retenu += r; ecrete += v - r;
      });
      return { brut, retenu, ecrete, parType, retenuParType, plafond };
    },

    /* Classement. Deux lectures :
       - normalisé (par défaut) : points retenus rapportés au nombre de salariés,
         ce qui met une PME et un grand groupe sur le même plan ;
       - brut : le total, gardé comme lecture secondaire. */
    classement({ mode = "normalise", categorie = null } = {}){
      let l = clone(s.entreprises).map(e => {
        const p = api.pointsDe(e.id);
        const sal = api.salaries(e.id).filter(u => !u.anonyme);
        const engages = sal.filter(u => (u.points || 0) > 0).length;
        const base = Math.max(e.effectif || sal.length || 1, 1);
        return { ...e,
          points: p.retenu || e.points || 0,
          brut: p.brut || e.points || 0,
          ecrete: p.ecrete,
          parSalarie: Math.round(((p.retenu || e.points || 0) / base) * 10) / 10,
          participation: sal.length ? Math.round((engages / sal.length) * 100) : 0,
          categorie: categorieDe(e.effectif || 0)
        };
      });
      if (categorie) l = l.filter(e => e.categorie.id === categorie);
      const cle = mode === "brut" ? "points" : "parSalarie";
      return l.sort((a, b) => b[cle] - a[cle]).map((e, i) => ({ ...e, rang: i + 1 }));
    },
    rangDe(eid, options){
      return this.classement(options).findIndex(e => e.id === eid) + 1;
    },

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
    rouvrirAnnonce(aid){
      const a = s.annonces.find(x => x.id === aid);
      if (a && a.restant > 0) a.etat = "ouverte";
      return a;
    },
    modifierAnnonce(aid, champs){
      const a = s.annonces.find(x => x.id === aid);
      if (!a) return null;
      Object.assign(a, champs);
      return a;
    },
    supprimerAnnonce(aid){
      const engagees = s.missions.filter(m => m.annonce === aid && m.etat !== "refusee");
      if (engagees.length) throw new Error("Des salariés se sont déjà engagés, l'annonce ne peut plus être supprimée. Fermez-la.");
      s.annonces = s.annonces.filter(x => x.id !== aid);
      return true;
    },
    majSaison(champs){ Object.assign(s.saison, champs); return s.saison; },
    majBareme(type, points){
      if (BAREME[type] && points > 0) BAREME[type].points = Number(points);
      return BAREME;
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
    /* Validation en masse : la lenteur d'une association bloque les points de plusieurs
       entreprises à la fois. On lui donne de quoi trancher d'un coup. */
    validerLot(ids, ok){
      let n = 0;
      ids.forEach(id => { if (api.validerMission(id, ok)) n++; });
      return n;
    },
    /* Jours restants avant la validation automatique. */
    joursAvantAuto(m){
      if (m.etat !== "a_valider") return null;
      const limite = new Date(m.date); limite.setDate(limite.getDate() + 14);
      return Math.max(0, Math.ceil((limite - new Date(2026, 7, 20)) / 864e5));
    },
    /* Deuxième administrateur : un seul compte admin par entreprise est trop fragile. */
    promouvoirAdmin(uid){
      const u = s.utilisateurs.find(x => x.id === uid);
      if (!u || u.role !== "salarie" || u.anonyme) return null;
      u.role = "entreprise_admin"; return u;
    },
    retrograderAdmin(uid){
      const u = s.utilisateurs.find(x => x.id === uid);
      if (!u || u.role !== "entreprise_admin") return null;
      const autres = s.utilisateurs.filter(x => x.org === u.org
        && x.role === "entreprise_admin" && x.id !== uid && x.actif);
      if (!autres.length) throw new Error("Il doit rester au moins un administrateur");
      u.role = "salarie"; return u;
    },
    administrateurs: (eid) => s.utilisateurs.filter(u => u.org === eid
      && u.role === "entreprise_admin" && u.actif),

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
    /* Les administrateurs occupent aussi une place : ce sont des comptes de l'entreprise. */
    salaries: (eid, { avecAnonymes = true } = {}) =>
      s.utilisateurs.filter(u => u.org === eid
        && (u.role === "salarie" || u.role === "entreprise_admin")
        && (avecAnonymes || !u.anonyme)),

    /* Sièges : une place occupée par salarié encore identifié.
       Un salarié retiré, donc anonymisé, rend sa place. */
    sieges(eid){
      const e = api.entreprise(eid);
      const total = e ? (e.sieges || e.effectif || 0) : 0;
      const pris = api.salaries(eid).filter(u => !u.anonyme).length;
      return { total, pris, restants: Math.max(0, total - pris) };
    },

    /* Retirer un salarié : on ne supprime pas la ligne, on la vide.
       Les missions gardent leur trace, les points restent acquis à l'entreprise,
       mais plus rien ne permet de remonter à la personne. */
    retirerSalarie(uid){
      const u = s.utilisateurs.find(x => x.id === uid);
      if (!u || u.anonyme) return u;
      if (u.role === "entreprise_admin" && api.administrateurs(u.org).length <= 1)
        throw new Error("C'est le dernier administrateur. Nommez-en un autre avant de le retirer.");
      const rang = api.salaries(u.org).filter(x => x.anonyme).length + 1;
      u.anonyme = true;
      u.actif = false;
      u.nom = "Salarié retiré " + String(rang).padStart(2, "0");
      u.email = null;
      u.retire_le = new Date().toISOString().slice(0, 10);
      const inv = api.invitationActive(u.org);
      if (inv && inv.utilisees > 0) inv.utilisees -= 1;
      api.tracer(u.org, uid, "retrait", null);
      return u;
    },

    inviterSalarie(org, nom, email){
      const { restants } = api.sieges(org);
      if (restants <= 0) throw new Error("Plus aucune place disponible sur cet abonnement");
      const u = { id:id("u"), nom, email, role:"salarie", org, points:0, actif:true, anonyme:false };
      s.utilisateurs.push(u); return u;
    },

    /* ---- Invitations par lien ---- */
    creerInvitation(eid, places){
      s.invitations.filter(i => i.entreprise === eid).forEach(i => i.active = false);
      const e = api.entreprise(eid);
      const base = (e.nom || "RISEVA").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 7) || "RISEVA";
      const suffixe = Array.from({ length: 4 }, (_, k) =>
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[(seq * 7 + k * 13 + s.invitations.length * 5) % 32]).join("");
      const inv = { id:id("i"), entreprise:eid, code:`${base}-${suffixe}`,
        places: places || api.sieges(eid).total, utilisees:0, active:true,
        cree_le:new Date().toISOString().slice(0,10),
        expire_le:new Date(Date.now() + 120 * 864e5).toISOString().slice(0,10) };
      seq++;
      s.invitations.unshift(inv);
      api.tracer(eid, null, "creation_lien", inv.code);
      return inv;
    },
    revoquerInvitation(iid){
      const i = s.invitations.find(x => x.id === iid);
      if (i){ i.active = false; api.tracer(i.entreprise, null, "revocation_lien", i.code); }
      return i;
    },
    /* Domaines de messagerie autorisés : sans cette barrière, un lien qui fuite permet à
       n'importe qui de créer un compte dans l'entreprise. C'est le premier point que
       vérifie un acheteur, et il a raison. */
    domaines: (eid) => (api.entreprise(eid) || {}).domaines || [],
    majDomaines(eid, liste){
      const e = api.entreprise(eid); if (!e) return null;
      e.domaines = liste.map(d => d.trim().toLowerCase().replace(/^@/, "")).filter(Boolean);
      return e.domaines;
    },
    domaineAutorise(eid, email){
      const l = api.domaines(eid);
      if (!l.length) return true;                    // aucune restriction déclarée
      const d = String(email || "").split("@")[1];
      return !!d && l.includes(d.toLowerCase());
    },

    /* Journal des accès : qui a rejoint, quand, avec quel lien. */
    acces: (eid) => s.acces.filter(a => !eid || a.entreprise === eid)
                          .sort((x, y) => String(y.date).localeCompare(String(x.date))),
    tracer(entreprise, utilisateur, quoi, code){
      s.acces.unshift({ id:id("ac"), entreprise, utilisateur, quoi, code,
        date:new Date().toISOString().slice(0,10) });
    },

    /* Inscription d'un salarié depuis le lien public. */
    rejoindre(code, nom, email){
      const inv = api.invitationParCode(code);
      if (!inv) throw new Error("Ce lien n'existe pas ou a été révoqué");
      if (!inv.active) throw new Error("Ce lien a été désactivé par l'entreprise");
      if (inv.expire_le < new Date().toISOString().slice(0,10)) throw new Error("Ce lien a expiré");
      if (inv.utilisees >= inv.places) throw new Error("Toutes les places de ce lien ont été prises");
      if (!api.domaineAutorise(inv.entreprise, email)){
        const l = api.domaines(inv.entreprise);
        throw new Error("Ce lien n'accepte que les adresses en @" + l.join(", @"));
      }
      const dejaLa = s.utilisateurs.find(u => u.email && email &&
        u.email.toLowerCase() === email.toLowerCase());
      if (dejaLa) throw new Error("Un compte existe déjà avec cette adresse");
      const { restants } = api.sieges(inv.entreprise);
      if (restants <= 0) throw new Error("L'abonnement de cette entreprise n'a plus de place");
      const u = { id:id("u"), nom, email, role:"salarie", org:inv.entreprise,
                  points:0, actif:true, anonyme:false };
      s.utilisateurs.push(u);
      inv.utilisees += 1;
      api.tracer(inv.entreprise, u.id, "inscription", inv.code);
      return { utilisateur:u, entreprise:api.entreprise(inv.entreprise) };
    },

    /* ---- Création de compte ---- */
    creerCompteEntreprise({ entreprise, effectif, nom, email, secteur, ville }){
      const e = { id:id("e"), nom:entreprise, effectif:Number(effectif) || 0,
        sieges:Number(effectif) || 0, points:0, secteur:secteur || "", ville:ville || "" };
      s.entreprises.push(e);
      const u = { id:id("u"), nom, email, role:"entreprise_admin", org:e.id, actif:true };
      s.utilisateurs.push(u);
      const inv = api.creerInvitation(e.id, e.sieges);
      return { entreprise:e, utilisateur:u, invitation:inv };
    },
    creerCompteAssociation({ association, cause, ville, resume, nom, email }){
      const a = { id:id("a"), nom:association, cause:cause || "", ville:ville || "",
        resume:resume || "", site:"", valide:false };
      s.associations.push(a);
      const u = { id:id("u"), nom, email, role:"association", org:a.id, actif:true };
      s.utilisateurs.push(u);
      return { association:a, utilisateur:u };
    },
    preinscrire(p){
      const n = { id:id("p"), etat:"preinscrite", date:new Date().toISOString().slice(0,10), ...p };
      s.preinscriptions.unshift(n); return n;
    },
    /* Vérification d'éligibilité : datée, avec échéance de revérification.
       Une association jamais revue depuis plus d'une saison est signalée. */
    validerAssociation(aid){
      const a = s.associations.find(x => x.id === aid);
      if (a){
        a.valide = true; a.suspendue = false; a.motif_suspension = null;
        a.verifiee_le = new Date(2026, 7, 20).toISOString().slice(0, 10);
        const d = new Date(2026, 7, 20); d.setFullYear(d.getFullYear() + 1);
        a.a_reverifier_le = d.toISOString().slice(0, 10);
      }
      return a;
    },
    suspendreAssociation(aid, motif){
      const a = s.associations.find(x => x.id === aid);
      if (!a) return null;
      a.suspendue = true; a.motif_suspension = motif || "non précisé";
      s.annonces.filter(x => x.asso === aid && x.etat === "ouverte").forEach(x => x.etat = "close");
      return a;
    },
    aReverifier(){
      const auj = "2026-08-20";
      return s.associations.filter(a => a.valide && a.a_reverifier_le && a.a_reverifier_le < auj);
    },

    /* Journal des messages : ce que la plateforme envoie, reconstruit à partir de l'état.
       Sert à l'écran de contrôle de Riseva et de garde-fou : si un message n'a pas de
       déclencheur visible ici, c'est qu'il ne part pas. */
    journal(){
      const j = [];
      s.missions.forEach(m => {
        const a = api.annonceDe(m); if (!a) return;
        const asso = api.association(a.asso), e = api.entreprise(m.entreprise),
              sal = api.utilisateur(m.salarie);
        const qui = sal ? sal.nom : "un salarié";
        if (m.etat === "engagee")
          j.push({ date:m.date, type:"mission_engagee", vers:asso.nom,
            sujet:`Quelqu'un vient pour « ${a.titre} »`, etat:"envoyé" });
        if (m.etat === "a_valider")
          j.push({ date:m.date, type:"demande_validation", vers:asso.nom,
            sujet:`${a.titre} : c'est bien fait ?`, etat:"en attente de réponse" });
        if (m.etat === "validee")
          j.push({ date:m.date, type:"mission_validee", vers:qui,
            sujet:`${asso.nom} a confirmé votre mission`, etat:"envoyé" });
        if (m.etat === "validee_auto")
          j.push({ date:m.date, type:"validation_auto", vers:e ? e.nom : "entreprise",
            sujet:`Mission comptée sans retour de ${asso.nom}`, etat:"envoyé" });
      });
      s.preinscriptions.forEach(p => j.push({ date:p.date, type:"preinscription",
        vers:p.entreprise, sujet:`La place de ${p.entreprise} est réservée`, etat:"envoyé" }));
      s.invitations.forEach(i => {
        const e = api.entreprise(i.entreprise);
        j.push({ date:i.cree_le, type:"bienvenue_entreprise", vers:e ? e.nom : "entreprise",
          sujet:`${e ? e.nom : "Votre entreprise"} est inscrite pour la saison`, etat:"envoyé" });
      });
      s.associations.filter(a => a.valide).forEach(a => j.push({ date:s.saison.debut,
        type:"association_validee", vers:a.nom, sujet:`${a.nom} est en ligne`, etat:"envoyé" }));
      s.entreprises.forEach(e => {
        const si = api.sieges(e.id);
        if (si.total && si.restants <= Math.max(2, Math.round(si.total * 0.1)))
          j.push({ date:s.saison.debut, type:"quota", vers:e.nom,
            sujet:`Il reste ${si.restants} places chez ${e.nom}`, etat:"envoyé" });
        j.push({ date:s.saison.debut, type:"recap_hebdo", vers:e.nom,
          sujet:"Votre semaine sur Riseva", etat:"programmé chaque lundi" });
      });
      const jrs = api.joursAvantFinSaison();
      if (jrs <= 60) s.entreprises.forEach(e => j.push({ date:s.saison.fin, type:"fin_saison",
        vers:e.nom, sujet:`Votre saison Riseva se termine dans ${jrs} jours`, etat:"programmé" }));
      return j.sort((x, y) => String(y.date).localeCompare(String(x.date)));
    },

    /* ------------------------------------------------------------------ */
    /* Notifications                                                      */
    /* ------------------------------------------------------------------ */
    /* Dérivées de l'état, pas stockées : une notification qui ne correspond plus à
       rien disparaît d'elle-même. Chacune sait à qui elle s'adresse et où elle mène. */
    notifications(uid){
      const u = api.utilisateur(uid); if (!u) return [];
      const n = [];
      const pousser = (o) => n.push({ id:o.id, date:o.date, titre:o.titre, texte:o.texte,
        vers:o.vers, ton:o.ton || "info" });

      if (u.role === "salarie" || u.role === "entreprise_admin"){
        api.missions({ entreprise:u.org }).forEach(m => {
          const a = api.annonceDe(m); if (!a) return;
          const asso = api.association(a.asso);
          if (m.etat === "validee")
            pousser({ id:"mv" + m.id, date:m.date, ton:"ok",
              titre:`+${m.points} points`,
              texte:`${asso.nom} a confirmé « ${a.titre} ».`, vers:"#/missions" });
          if (m.etat === "refusee")
            pousser({ id:"mr" + m.id, date:m.date, ton:"alerte",
              titre:"Une mission n'a pas été retenue",
              texte:`${asso.nom} a indiqué que « ${a.titre} » n'a pas eu lieu.`, vers:"#/missions" });
          if (m.etat === "engagee" && m.salarie === uid)
            pousser({ id:"me" + m.id, date:m.date, ton:"info",
              titre:"Mission à venir",
              texte:`« ${a.titre} » le ${new Date(m.date).toLocaleDateString("fr-FR")}. Pensez à la déclarer une fois faite.`,
              vers:"#/missions" });
        });
      }
      if (u.role === "entreprise_admin"){
        const si = api.sieges(u.org);
        if (si.total && si.restants <= Math.max(2, Math.round(si.total * 0.1)))
          pousser({ id:"quota", date:s.saison.debut, ton:"alerte",
            titre:"Votre équipe approche de sa limite",
            texte:`${si.restants} place${si.restants > 1 ? "s" : ""} restante${si.restants > 1 ? "s" : ""} sur ${si.total}.`,
            vers:"#/equipe" });
        const f = api.etatFacturation(u.org);
        f.enRetard.forEach(x => pousser({ id:"fa" + x.ref, date:x.echeance, ton:"alerte",
          titre:"Facture en retard", texte:`${x.libelle}, échéance dépassée.`, vers:"#/abonnement" }));
        if (api.administrateurs(u.org).length < 2)
          pousser({ id:"admin1", date:s.saison.debut, ton:"info",
            titre:"Un seul administrateur",
            texte:"Nommez un deuxième compte capable d'agir, au cas où.", vers:"#/equipe" });
        const j = api.joursAvantFinSaison();
        if (j <= 60) pousser({ id:"fin", date:s.saison.fin, ton:"info",
          titre:"La saison se termine bientôt",
          texte:`${j} jours avant la clôture et le rapport annuel.`, vers:"#/abonnement" });
      }
      if (u.role === "association"){
        const aValider = api.missions({ asso:u.org, etat:"a_valider" });
        if (aValider.length) pousser({ id:"av", date:aValider[0].date, ton:"alerte",
          titre:`${aValider.length} mission${aValider.length > 1 ? "s" : ""} à confirmer`,
          texte:"Tant que vous n'avez pas répondu, l'entreprise ne marque rien.", vers:"#/avalider" });
        api.missions({ asso:u.org, etat:"engagee" }).forEach(m => {
          const a = api.annonceDe(m), sal = api.utilisateur(m.salarie), e = api.entreprise(m.entreprise);
          pousser({ id:"eng" + m.id, date:m.date, ton:"info",
            titre:"Quelqu'un vient",
            texte:`${sal ? sal.nom : "Un salarié"} de ${e ? e.nom : "une entreprise"} sur « ${a.titre} ».`,
            vers:"#/mesannonces" });
        });
        if (!api.recusPrets(u.org)) pousser({ id:"recus", date:s.saison.debut, ton:"alerte",
          titre:"Reçus fiscaux inactifs",
          texte:"Il manque un réglage, aucun reçu ne part pour l'instant.", vers:"#/recus" });
      }
      if (u.role === "admin"){
        s.associations.filter(a => !a.valide).forEach(a =>
          pousser({ id:"va" + a.id, date:s.saison.debut, ton:"alerte",
            titre:"Association à valider", texte:a.nom + " attend votre vérification.", vers:"#/assos" }));
        s.preinscriptions.filter(p => p.etat === "preinscrite").forEach(p =>
          pousser({ id:"pr" + p.id, date:p.date, ton:"info",
            titre:"Préinscription à traiter", texte:p.entreprise + " attend une réponse.", vers:"#/preinscriptions" }));
      }
      return n.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    },
    preferences(uid){
      const u = api.utilisateur(uid);
      return (u && u.prefs) || { mail_mission:true, mail_hebdo:true, mail_saison:true };
    },
    majPreferences(uid, champs){
      const u = api.utilisateur(uid); if (!u) return null;
      u.prefs = { ...api.preferences(uid), ...champs };
      return u.prefs;
    },

    /* ------------------------------------------------------------------ */
    /* Contrat, facturation, renouvellement                               */
    /* ------------------------------------------------------------------ */
    contrat: (eid) => s.contrats.find(c => c.entreprise === eid) || null,
    contrats: () => s.contrats,
    majContrat(eid, champs){
      const c = api.contrat(eid); if (!c) return null;
      Object.assign(c, champs); return c;
    },
    /* Une facture impayée après échéance suspend l'accès en écriture, jamais la lecture :
       on ne prend pas en otage les données d'un client. */
    etatFacturation(eid){
      const c = api.contrat(eid);
      if (!c) return { statut:"aucun", enRetard:[], du:0 };
      const aujourdhui = "2026-08-20";
      const enRetard = c.factures.filter(f => f.etat !== "payee" && f.echeance < aujourdhui);
      const du = c.factures.filter(f => f.etat !== "payee").reduce((n, f) => n + f.montant, 0);
      return { statut:c.statut, enRetard, du, contrat:c };
    },
    marquerFacturePayee(eid, ref){
      const c = api.contrat(eid); if (!c) return null;
      const f = c.factures.find(x => x.ref === ref); if (f) f.etat = "payee";
      return f;
    },
    /* Renouvellement : jamais tacite. Décision du 20/08/2026. */
    reconduire(eid, oui){
      const c = api.contrat(eid); if (!c) return null;
      c.reconduction = !!oui; return c;
    },
    joursAvantFinSaison(){
      const fin = new Date(s.saison.fin);
      return Math.max(0, Math.ceil((fin - new Date(2026, 7, 20)) / 864e5));
    },

    majEntreprise(eid, champs){
      const e = api.entreprise(eid); if (!e) return null;
      Object.assign(e, champs); return e;
    },

    /* ------------------------------------------------------------------ */
    /* Mécénat                                                            */
    /* ------------------------------------------------------------------ */
    /* Une mission n'est valorisable en mécénat de compétences que si elle a eu lieu
       sur le temps de travail, à l'initiative de l'entreprise. Une demi-journée un
       samedi matin, c'est du bénévolat : estimable, mais pas déductible. */
    valorisationMecenat(eid){
      const ms = api.missions({ entreprise: eid })
                   .filter(m => m.etat === "validee" || m.etat === "validee_auto");
      const e = api.entreprise(eid) || {};
      const coutDemiJournee = (e.cout_jour_moyen || 300) / 2;

      const parSalarie = {};
      let dons = 0, demiJourneesTT = 0, demiJourneesPerso = 0;

      ms.forEach(m => {
        const a = api.annonceDe(m); if (!a) return;
        if (a.type === "don_financier"){ dons += Number(m.quantite) || 0; return; }
        if (a.type !== "benevolat_demi_journee") return;
        if (!a.temps_travail){ demiJourneesPerso += m.quantite; return; }
        demiJourneesTT += m.quantite;
        parSalarie[m.salarie] = (parSalarie[m.salarie] || 0) + m.quantite * coutDemiJournee;
      });

      const plafondSal = FISCAL.plafond_mecenat_par_salarie;
      let competencesBrut = 0, competencesRetenu = 0;
      Object.values(parSalarie).forEach(v => {
        competencesBrut += v;
        competencesRetenu += Math.min(v, plafondSal);
      });

      const assiette = dons + competencesRetenu;
      const plafondEntreprise = Math.max(FISCAL.plafond_plancher,
        Math.round((e.ca || 0) * FISCAL.plafond_taux_ca));
      const assietteRetenue = Math.min(assiette, plafondEntreprise);
      const reportable = Math.max(0, assiette - plafondEntreprise);
      const reduction = Math.round(assietteRetenue * FISCAL.taux_reduction);

      return {
        dons, demiJourneesTT, demiJourneesPerso,
        coutDemiJournee, competencesBrut, competencesRetenu,
        ecreteParSalarie: competencesBrut - competencesRetenu,
        plafondSalarie: plafondSal,
        assiette, plafondEntreprise, assietteRetenue, reportable, reduction,
        salariesConcernes: Object.keys(parSalarie).length
      };
    },

    /* ------------------------------------------------------------------ */
    /* Reçus fiscaux                                                      */
    /* ------------------------------------------------------------------ */
    /* Riseva prépare et envoie. L'émetteur reste l'association : c'est elle qui porte
       le numéro d'ordre, la signature et la responsabilité (art. 1740 A du CGI).
       Sans réglages complets, la plateforme refuse d'émettre. */
    reglagesRecus: (aid) => (api.association(aid) || {}).recus || {
      actif:false, eligible_mecenat:false, signataire:"", qualite:"",
      prochain_numero:1, prefixe:"" },
    majReglagesRecus(aid, champs){
      const a = api.association(aid); if (!a) return null;
      a.recus = { ...api.reglagesRecus(aid), ...champs };
      return a.recus;
    },
    recusPrets(aid){
      const r = api.reglagesRecus(aid);
      return !!(r.actif && r.eligible_mecenat && r.signataire && r.qualite && r.prefixe);
    },
    /* Récapitulatif à reporter dans la déclaration annuelle des dons, obligatoire
       depuis 2021 : montant global des dons portés sur les reçus, et nombre de reçus. */
    recapRecus(aid){
      const ms = api.missions({ asso: aid })
                   .filter(m => m.etat === "validee" || m.etat === "validee_auto");
      let montant = 0, nombre = 0;
      ms.forEach(m => {
        const a = api.annonceDe(m);
        if (a && a.type === "don_financier"){ montant += Number(m.quantite) || 0; nombre++; }
      });
      return { montant, nombre, saison: s.saison.nom };
    },

    /* ------------------------------------------------------------------ */
    /* Indicateurs de pilote                                              */
    /* ------------------------------------------------------------------ */
    /* Des chiffres qu'on peut opposer à un prospect. Chaque définition précise son
       numérateur, son dénominateur et sa période : un taux dont on peut changer le
       dénominateur ne prouve rien. */
    indicateurs(eid){
      const entreprises = eid ? [api.entreprise(eid)].filter(Boolean) : s.entreprises;
      const ids = entreprises.map(e => e.id);
      const comptes = s.utilisateurs.filter(u => ids.includes(u.org)
        && (u.role === "salarie" || u.role === "entreprise_admin") && !u.anonyme);
      const places = entreprises.reduce((n, e) => n + (e.sieges || e.effectif || 0), 0);
      const ms = s.missions.filter(m => ids.includes(m.entreprise));
      const tranchees = ms.filter(m => ["validee", "validee_auto", "refusee"].includes(m.etat));
      const validees = ms.filter(m => ["validee", "validee_auto"].includes(m.etat));
      const auto = ms.filter(m => m.etat === "validee_auto");
      const actifs = comptes.filter(u => ms.some(m => m.salarie === u.id
        && ["validee", "validee_auto"].includes(m.etat)));

      const delais = tranchees.map(m => {
        const d = new Date(m.date); const t = new Date(m.date);
        t.setDate(t.getDate() + (m.etat === "validee_auto" ? 14 : 4)); // démonstration
        return Math.max(0, Math.round((t - d) / 864e5));
      }).sort((a, b) => a - b);
      const mediane = delais.length
        ? (delais.length % 2 ? delais[(delais.length - 1) / 2]
           : Math.round((delais[delais.length / 2 - 1] + delais[delais.length / 2]) / 2))
        : null;

      const ouvertes = s.annonces.filter(a => a.etat === "ouverte");
      const fraiches = ouvertes.filter(a => a.date >= "2026-08-20");

      const pct = (n, d) => d ? Math.round((n / d) * 1000) / 10 : null;
      return {
        activation:   { valeur: pct(comptes.length, places), num: comptes.length, den: places,
          definition: "Comptes créés et non anonymisés, divisés par les places de l'abonnement." },
        participation:{ valeur: pct(actifs.length, comptes.length), num: actifs.length, den: comptes.length,
          definition: "Salariés avec au moins une mission validée, divisés par les comptes actifs, sur la saison." },
        realisation:  { valeur: pct(validees.length, tranchees.length), num: validees.length, den: tranchees.length,
          definition: "Missions validées, divisées par les missions tranchées. Les missions encore en cours ne comptent dans aucun des deux." },
        validationAuto:{ valeur: pct(auto.length, validees.length), num: auto.length, den: validees.length,
          definition: "Missions comptées faute de réponse de l'association, divisées par les missions validées. Mesure la défaillance du réseau, pas la performance du client." },
        delaiMedian:  { valeur: mediane, num: mediane, den: null,
          definition: "Médiane du nombre de jours entre la déclaration du salarié et la décision de l'association, sur les missions tranchées uniquement." },
        fraicheur:    { valeur: pct(fraiches.length, ouvertes.length), num: fraiches.length, den: ouvertes.length,
          definition: "Annonces ouvertes dont la date n'est pas dépassée, divisées par les annonces ouvertes." }
      };
    },

    /* ------------------------------------------------------------------ */
    /* Rapports                                                           */
    /* ------------------------------------------------------------------ */
    /* Impact du réseau : volet commun à toutes les entreprises de la saison.
       On ne prétend jamais qu'une entreprise a produit tel résultat à elle seule. */
    impactReseau(){
      const ms = s.missions.filter(m => m.etat === "validee" || m.etat === "validee_auto");
      let demiJournees = 0, euros = 0, materiel = 0;
      ms.forEach(m => {
        const a = api.annonceDe(m); if (!a) return;
        if (a.type === "benevolat_demi_journee") demiJournees += m.quantite;
        if (a.type === "don_financier") euros += Number(m.quantite) || 0;
        if (a.type === "don_materiel") materiel += m.quantite;
      });
      return {
        entreprises: s.entreprises.length,
        associations: s.associations.filter(a => a.valide).length,
        missions: ms.length,
        demiJournees, euros, materiel,
        salaries: s.utilisateurs.filter(u => u.role === "salarie" && !u.anonyme).length,
        heures: demiJournees * 4
      };
    },

    /* La liste des rapports d'une entreprise pour la saison en cours : les trimestres
       déjà clos sont générés, les autres attendent leur échéance. */
    rapports(eid){
      const sa = s.saison;
      const debut = new Date(sa.debut);
      const bornes = [0, 1, 2, 3].map(i => {
        const d = new Date(debut); d.setMonth(d.getMonth() + i * 3);
        const f = new Date(debut); f.setMonth(f.getMonth() + (i + 1) * 3); f.setDate(f.getDate() - 1);
        return { nom: "T" + (i + 1), debut: d.toISOString().slice(0, 10), fin: f.toISOString().slice(0, 10) };
      });
      const aujourdhui = "2026-08-20";
      const trimestres = s.trimestres;
      const l = bornes.map((b, i) => ({
        id: "t" + (i + 1), portee: "trimestriel", titre: "Rapport " + b.nom,
        periode: b, points: (trimestres[i] || {}).points || 0,
        etat: b.fin <= aujourdhui ? "genere" : "a_venir",
        genere_le: b.fin <= aujourdhui ? b.fin : null
      }));
      l.push({ id: "annuel", portee: "annuel", titre: "Rapport annuel",
        periode: { nom: sa.nom, debut: sa.debut, fin: sa.fin },
        points: api.pointsDe(eid).retenu,
        etat: sa.fin <= aujourdhui ? "genere" : "a_venir",
        genere_le: sa.fin <= aujourdhui ? sa.fin : null });
      return l;
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
      const salaries = api.salaries(eid);
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
