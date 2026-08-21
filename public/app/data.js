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
/* Adresse publique du service. En démonstration on tourne sur un fichier local ou sur
   127.0.0.1 ; montrer ce lien-là à un client ferait douter de tout le reste. */
export const SITE = "https://riseva.fr";
export const lienPublic = (chemin) => {
  const local = typeof location === "undefined"
    || location.protocol === "file:"
    || /^(127\.|localhost|0\.0\.0\.0)/.test(location.hostname);
  return (local ? SITE : location.origin) + chemin;
};

/* ------------------------------------------------------------------ */
/* Géolocalisation                                                     */
/* ------------------------------------------------------------------ */
/* Base Adresse Nationale : service public français, gratuit, sans clé et sans
   compte à créer. On lui envoie une adresse, elle renvoie des coordonnées.
   Rien d'autre ne sort d'ici : ni identité, ni contexte. */
export const GEOCODEUR = "https://api-adresse.data.gouv.fr/search/";

export async function geocoder(adresse, { signal } = {}){
  const q = String(adresse || "").trim();
  if (q.length < 5) return null;
  try {
    const r = await fetch(`${GEOCODEUR}?q=${encodeURIComponent(q)}&limit=1&autocomplete=0`,
      { signal, headers: { Accept: "application/json" } });
    if (!r.ok) return null;
    const j = await r.json();
    const f = j.features && j.features[0];
    if (!f) return null;
    const [lon, lat] = f.geometry.coordinates;
    return { lat, lon, label: f.properties.label,
             ville: f.properties.city, code_postal: f.properties.postcode,
             precision: f.properties.type, score: f.properties.score,
             source: "BAN", le: new Date().toISOString().slice(0, 10) };
  } catch { return null; }   // hors ligne ou service indisponible : on continue sans
}

/* Distance orthodromique, en kilomètres. Suffisamment juste à l'échelle d'un pays,
   et sans dépendance : une bibliothèque de cartographie pour ça serait absurde. */
export function distanceKm(a, b){
  if (!a || !b || a.lat == null || b.lat == null) return null;
  const R = 6371, rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const x = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(x)));
}

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
/* Taux et mentions de facturation. La TVA d'un abonnement SaaS français à un
   professionnel établi en France est au taux normal. */
export const FACTURATION = {
  tva: 0.20,
  penalites_taux: "taux d'intérêt légal majoré de 10 points",
  indemnite_recouvrement: 40,          // article L. 441-10 du code de commerce
  delai_paiement_jours: 30,
  conservation_ans: 10,
  /* Calendrier de la réforme, à tenir à jour. */
  reception_obligatoire_le: "2026-09-01",
  emission_pme_le: "2027-09-01"
};

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

/* Unités de réalisation. Ce que la mission produit dans le monde réel, déclaré par
   l'association qui en est témoin. C'est volontairement séparé des points : les points
   sont une mécanique de classement, les réalisations sont un décompte de choses faites. */
export const UNITES = {
  arbre:      { un:"arbre planté",        pl:"arbres plantés",           icone:"leaf" },
  haie:       { un:"mètre de haie",       pl:"mètres de haie plantés",   icone:"leaf" },
  dechet_kg:  { un:"kilo ramassé",        pl:"kilos de déchets ramassés",icone:"box" },
  repas:      { un:"repas distribué",     pl:"repas distribués",         icone:"heart" },
  colis:      { un:"colis préparé",       pl:"colis préparés",           icone:"box" },
  animal:     { un:"animal pris en charge", pl:"animaux pris en charge", icone:"heart" },
  maraude:    { un:"maraude",             pl:"maraudes réalisées",       icone:"users" },
  kit:        { un:"kit distribué",       pl:"kits distribués",          icone:"box" },
  eleve:      { un:"élève sensibilisé",   pl:"élèves sensibilisés",      icone:"users" },
  metre_berge:{ un:"mètre de berge",      pl:"mètres de berge nettoyés", icone:"leaf" }
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
    { id:"e1", lat:45.7333, lon:4.8137, nom:"Lafarge Ciments",     effectif:210, sieges:210, ca:48_000_000, cout_jour_moyen:340,
      referent:"Claire Fontaine", referent_mail:"claire@lafarge-ciments.fr", siret:"39312091600025",
      domaines:["lafarge-ciments.fr"],
      adresse:"12 rue des Docks, 69009 Lyon", points:12480, secteur:"Industrie",  ville:"Lyon" },
    { id:"e2", lat:50.6292, lon:3.0573, nom:"Groupe Vidal",        effectif:340, sieges:350, ca:62_000_000, cout_jour_moyen:290, points:18020, secteur:"Logistique", ville:"Lille" },
    { id:"e3", lat:48.8566, lon:2.3522, nom:"Cabinet Marchand",    effectif:64,  sieges:75,  ca:9_800_000,  cout_jour_moyen:520,  points:15470, secteur:"Conseil",    ville:"Paris" },
    { id:"e4", lat:47.2184, lon:-1.5536, nom:"Novaterre",           effectif:120, sieges:120, ca:21_000_000, cout_jour_moyen:310, points:14100, secteur:"Agro",       ville:"Nantes" },
    { id:"e5", lat:43.6047, lon:1.4442, nom:"Atelier Berthier",    effectif:38,  sieges:50,  ca:3_400_000,  cout_jour_moyen:280,  points:11040, secteur:"Artisanat",  ville:"Toulouse" },
    { id:"e6", lat:44.8378, lon:-0.5792, nom:"Sirius Assurances",   effectif:520, sieges:500, ca:140_000_000, cout_jour_moyen:400, points:9380,  secteur:"Assurance",  ville:"Bordeaux" },
    { id:"e7", lat:48.1173, lon:-1.6778, nom:"Delmas & Fils",       effectif:87,  sieges:100, ca:12_000_000, cout_jour_moyen:300, points:7920,  secteur:"BTP",        ville:"Rennes" },
    { id:"e8", lat:48.3904, lon:-4.4861, nom:"Kervella Transport",  effectif:145, sieges:150, ca:18_000_000, cout_jour_moyen:270, points:6410,  secteur:"Transport",  ville:"Brest" }
  ],
  contrats: [
    { entreprise:"e1", statut:"actif", signe_le:J(-40), debut:"2027-01-01", fin:"2027-12-31",
      montant_ht:3800, acompte:500, reconduction:false,
      factures:[
        { ref:"RSV-2026-0007", libelle:"Acompte saison 2027", montant:500,  date:J(-40),
          echeance:J(-10), etat:"payee",  periode:"acompte, saison 2027" },
        { ref:"RSV-2027-0031", libelle:"Solde saison 2027",   montant:3300, date:"2027-01-05",
          echeance:"2027-02-04", etat:"a_venir", periode:"01/01/2027 au 31/12/2027" }
      ],
      /* Facturation électronique : au 1er septembre 2026 toute entreprise doit pouvoir
         RECEVOIR une facture par une plateforme agréée. Un PDF par courriel ne suffit plus.
         On demande donc au client son numéro d'annuaire et sa plateforme dès la signature. */
      plateforme_reception:"", annuaire_id:"" }
  ],
  associations: [
    { id:"a1", nom:"Refuge des Quatre Vents", ville:"Saint-Étienne", cause:"Protection animale",
      resume:"Refuge de 180 places qui recueille chiens et chats abandonnés depuis 1998.",
      adresse:"14 chemin du Bois, 42000 Saint-Étienne", lat:45.4397, lon:4.3872,
      site:"", valide:true, rna:"W423001234", verifiee_le:J(-120), a_reverifier_le:J(240), suspendue:false,
      recus:{ actif:true, eligible_mecenat:true, signataire:"Élise Tournier",
              qualite:"Présidente", prochain_numero:47, prefixe:"QV-2027-" } },
    { id:"a2", nom:"Racines Vives", ville:"Clermont-Ferrand", cause:"Reforestation",
      resume:"Replantation de haies bocagères et de forêts mixtes sur des parcelles agricoles.",
      adresse:"3 route des Prés, 63200 Riom", lat:45.8938, lon:3.1128,
      site:"", valide:true, rna:"W631004567", verifiee_le:J(-60), a_reverifier_le:J(300), suspendue:false,
      recus:{ actif:true, eligible_mecenat:true, signataire:"Marc Aubert",
              qualite:"Trésorier", prochain_numero:12, prefixe:"RV-2027-" } },
    { id:"a3", nom:"Rivière Propre 42", ville:"Roanne", cause:"Dépollution",
      resume:"Nettoyage des berges de la Loire et sensibilisation dans les écoles.",
      adresse:"8 quai de Loire, 42300 Roanne", lat:46.0367, lon:4.0680,
      site:"", valide:true, rna:"W422009876", verifiee_le:J(-200), a_reverifier_le:J(-20), suspendue:false },
    { id:"a4", nom:"Le Panier Solidaire", ville:"Villeurbanne", cause:"Aide alimentaire",
      resume:"Distribution de 900 colis par mois et maraude hebdomadaire.",
      adresse:"22 rue Garibaldi, 69003 Lyon", lat:45.7578, lon:4.8515,
      site:"", valide:true, rna:"W691002345", verifiee_le:J(-30), a_reverifier_le:J(330), suspendue:false },
    { id:"a5", nom:"Second Souffle", ville:"Grenoble", cause:"Réemploi",
      resume:"Reconditionnement de matériel informatique pour des familles et des écoles.",
      site:"", valide:false }
  ],
  annonces: [
    { id:"an1", asso:"a1", type:"benevolat_demi_journee", temps_travail:false,
      impact:{ unite:"animal", par_unite:12 }, titre:"Sortie des chiens et entretien des box",
      description:"Nous manquons de bras le samedi matin. Six personnes suffisent pour sortir 40 chiens et remettre les box en état.",
      quantite:6, restant:4, date:J(9), lieu:"Saint-Étienne", etat:"ouverte" },
    { id:"an2", asso:"a2", type:"benevolat_demi_journee", temps_travail:true,
      impact:{ unite:"arbre", par_unite:40 }, titre:"Plantation de 400 arbres à Beaumont",
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
    { id:"an7", asso:"a3", type:"benevolat_demi_journee", temps_travail:true,
      impact:{ unite:"metre_berge", par_unite:250 }, titre:"Nettoyage des berges, secteur amont",
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
  signalements: [],
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
  semaines: [820,1140,960,1480,1310,1720,1560,2040,1880,2260,2110,2480],
  rapports_generes: [],
  moteur_journal: [],
  classement_recalcule_le: null
};

/* ------------------------------------------------------------------ */
/* Implémentation mock                                                 */
/* ------------------------------------------------------------------ */
const clone = (o) => JSON.parse(JSON.stringify(o));

/* Persistance. La démonstration se comporte comme le produit : tout ce qui est fait
   est enregistré, et retrouvé au retour. Une clé de version évite de restaurer un
   état écrit par une version antérieure du modèle. */
const CLE_ETAT = "riseva.etat";
const VERSION_ETAT = 3;

function lireEtat(){
  try {
    const brut = localStorage.getItem(CLE_ETAT);
    if (!brut) return null;
    const o = JSON.parse(brut);
    if (!o || o.version !== VERSION_ETAT) return null;
    return o;
  } catch { return null; }
}

function creerMock(){
  const sauvegarde = lireEtat();
  const s = sauvegarde ? sauvegarde.etat : clone(seed);
  if (sauvegarde && sauvegarde.bareme)
    Object.entries(sauvegarde.bareme).forEach(([k, v]) => { if (BAREME[k]) BAREME[k].points = v; });
  let seq = sauvegarde ? sauvegarde.seq : 100;
  const id = (p) => p + (++seq);

  let minuteur = null;
  const ecrire = () => {
    try {
      localStorage.setItem(CLE_ETAT, JSON.stringify({
        version: VERSION_ETAT, seq, etat: s,
        bareme: Object.fromEntries(Object.entries(BAREME).map(([k, v]) => [k, v.points])),
        enregistre_le: new Date().toISOString()
      }));
    } catch { /* navigation privée, quota plein : la démo continue sans mémoire */ }
  };
  const planifier = () => { clearTimeout(minuteur); minuteur = setTimeout(ecrire, 120); };

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
      if (a.temps_travail && !api.eligibleMecenat(a.asso))
        throw new Error("Votre association n'a pas déclaré son éligibilité au mécénat : "
          + "une mission sur le temps de travail ne serait pas valorisable.");
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
    engager({ annonce, entreprise, salarie, quantite, consentement }){
      const a = s.annonces.find(x => x.id === annonce);
      if (!a || a.etat !== "ouverte") throw new Error("Annonce indisponible");
      if (quantite > a.restant) throw new Error("Quantité supérieure au besoin restant");
      /* Une mise à disposition sur le temps de travail exige l'accord exprès, écrit et
         spécifique du salarié (article R. 8241-2). Accepter les conditions générales
         une fois pour toutes ne vaut pas consentement à cette mission-là, à ces dates-là. */
      if (a.temps_travail && !consentement)
        throw new Error("Votre accord explicite est nécessaire pour une mission sur le temps de travail");
      a.restant -= quantite;
      if (a.restant === 0) a.etat = "close";
      const m = { id:id("m"), annonce, entreprise, salarie, quantite,
                  points: api.pointsPour(a.type, quantite), etat:"engagee", date:a.date,
                  consentement: a.temps_travail
                    ? { donne_le: new Date().toISOString().slice(0, 10), mission: a.titre, date_mission: a.date }
                    : null };
      s.missions.unshift(m); return m;
    },
    /* Le salarié déclare ce qu'il a fait, chiffre à l'appui. L'association corrigera si
       besoin : c'est elle qui tranche, mais partir de son chiffre à lui évite la page
       blanche et fait remonter une information que personne d'autre n'a. */
    declarerFaite(mid, realisePropose){
      const m = s.missions.find(x => x.id === mid);
      if (!m) return null;
      m.etat = "a_valider";
      m.declaree_le = new Date().toISOString().slice(0, 10);
      if (realisePropose !== undefined && realisePropose !== null)
        m.realise_propose = Math.max(0, Number(realisePropose) || 0);
      return m;
    },
    /* Validation en masse : la lenteur d'une association bloque les points de plusieurs
       entreprises à la fois. On lui donne de quoi trancher d'un coup. */
    validerLot(ids, ok, realises = {}){
      let n = 0;
      ids.forEach(id => { if (api.validerMission(id, ok, realises[id])) n++; });
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

    validerMission(mid, ok, realise){
      const m = s.missions.find(x => x.id === mid); if (!m) return null;
      m.etat = ok ? "validee" : "refusee";
      if (ok){
        if (realise !== undefined && realise !== null) m.realise = Math.max(0, Number(realise) || 0);
        const e = s.entreprises.find(x => x.id === m.entreprise);
        if (e) e.points += m.points;
        const u = s.utilisateurs.find(x => x.id === m.salarie);
        if (u) u.points = (u.points || 0) + m.points;
      } else { m.points = 0; m.realise = 0; }
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

    /* Suspendre l'accès : réversible, et sans rien effacer. C'est ce qu'on veut dans
       neuf cas sur dix, un congé, un doute, un départ pas encore confirmé. Toutes les
       sessions tombent, les données et le journal restent. */
    suspendreAcces(uid, oui){
      const u = s.utilisateurs.find(x => x.id === uid);
      if (!u || u.anonyme) return null;
      if (!oui && u.role === "entreprise_admin") { u.actif = true; return u; }
      if (oui && u.role === "entreprise_admin"
          && api.administrateurs(u.org).length <= 1)
        throw new Error("C'est le dernier administrateur actif. Nommez-en un autre d'abord.");
      u.actif = !oui;
      api.tracer(u.org, uid, oui ? "suspension" : "reactivation", null);
      return u;
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
    /* Réalisations                                                       */
    /* ------------------------------------------------------------------ */
    /* Ce que les missions ont produit dans le monde réel. Deux règles tiennent
       l'honnêteté du chiffre :
       1. seules les missions validées comptent, jamais une réservation ;
       2. le nombre déclaré par l'association fait foi, pas l'estimation de l'annonce.
       Riseva additionne, elle n'audite pas, et l'interface le dit. */
    realiseDe(m){
      const a = api.annonceDe(m);
      if (!a || !a.impact || !a.impact.unite) return null;
      if (!["validee", "validee_auto"].includes(m.etat)) return null;
      const attendu = Math.round((Number(m.quantite) || 0) * (Number(a.impact.par_unite) || 0));
      const reel = m.realise === undefined || m.realise === null ? attendu : Number(m.realise);
      return { unite: a.impact.unite, quantite: Math.max(0, reel), attendu, declare: m.realise != null };
    },

    /* Cumul par unité. Filtres possibles : entreprise, association, salarié, période. */
    realisations({ entreprise, asso, salarie, depuis, jusqua } = {}){
      const total = {};
      let missions = 0;
      s.missions.forEach(m => {
        if (entreprise && m.entreprise !== entreprise) return;
        if (salarie && m.salarie !== salarie) return;
        if (depuis && m.date < depuis) return;
        if (jusqua && m.date > jusqua) return;
        const a = api.annonceDe(m);
        if (asso && (!a || a.asso !== asso)) return;
        const r = api.realiseDe(m);
        if (!r || !r.quantite) return;
        total[r.unite] = (total[r.unite] || 0) + r.quantite;
        missions++;
      });
      return {
        parUnite: total,
        missions,
        liste: Object.entries(total)
          .map(([unite, quantite]) => ({ unite, quantite, ...(UNITES[unite] || { un:unite, pl:unite }) }))
          .sort((x, y) => y.quantite - x.quantite)
      };
    },

    /* L'association corrige le chiffre au moment de valider : c'est elle qui était là. */
    declarerRealise(mid, quantite){
      const m = s.missions.find(x => x.id === mid);
      if (!m) return null;
      m.realise = Math.max(0, Number(quantite) || 0);
      return m;
    },

    /* ------------------------------------------------------------------ */
    /* Proximité                                                          */
    /* ------------------------------------------------------------------ */
    /* Une entreprise lyonnaise n'a rien à faire d'un besoin à Brest. La distance
       se calcule à partir des adresses que chacun a saisies, géocodées une fois. */
    coordsDe(entite){
      if (!entite) return null;
      return entite.lat != null && entite.lon != null
        ? { lat: entite.lat, lon: entite.lon } : null;
    },

    /* Géocode une adresse et l'enregistre sur l'entité. Appelé au moment où
       l'adresse change, pas à chaque affichage. */
    async situer(type, id, adresse){
      const g = await geocoder(adresse);
      if (!g) return null;
      const cible = type === "entreprise" ? api.entreprise(id) : api.association(id);
      if (!cible) return null;
      Object.assign(cible, { adresse, lat: g.lat, lon: g.lon,
        geo_label: g.label, geo_source: g.source, geo_le: g.le });
      return g;
    },

    distanceEntre(eid, aid){
      return distanceKm(api.coordsDe(api.entreprise(eid)), api.coordsDe(api.association(aid)));
    },

    /* Associations triées par distance. Celles dont l'adresse n'est pas géocodée
       arrivent en fin de liste plutôt que d'être exclues : une adresse manquante
       n'est pas une raison de faire disparaître une association. */
    associationsProches(eid, { rayon = null, avecAnnonces = false } = {}){
      const dep = api.coordsDe(api.entreprise(eid));
      return api.associations()
        .filter(a => a.valide && !a.suspendue)
        .map(a => ({ ...a,
          distance: distanceKm(dep, api.coordsDe(a)),
          annoncesOuvertes: api.annonces({ asso: a.id, ouvertes: true }).length }))
        .filter(a => !avecAnnonces || a.annoncesOuvertes > 0)
        .filter(a => rayon == null || a.distance == null || a.distance <= rayon)
        .sort((x, y) => {
          if (x.distance == null) return 1;
          if (y.distance == null) return -1;
          return x.distance - y.distance;
        });
    },

    /* Distance d'une annonce, via son association. */
    distanceAnnonce(eid, annonce){
      return annonce ? api.distanceEntre(eid, annonce.asso) : null;
    },

    /* ------------------------------------------------------------------ */
    /* Cloisonnement des dons personnels                                  */
    /* ------------------------------------------------------------------ */
    /* La cause d'une association révèle parfois une opinion politique, une conviction
       religieuse, un état de santé ou une appartenance syndicale : des catégories
       particulières au sens du RGPD. Rattacher nominativement un don personnel à un
       salarié dans les écrans de l'employeur revient à lui livrer cette inférence.
       Règle : dans les vues employeur, un don personnel n'est jamais nominatif, et son
       montant comme son bénéficiaire sont masqués. Il compte pour l'entreprise, il
       reste visible dans l'espace du salarié, et c'est tout. */
    SEUIL_AGREGAT: 5,

    estDonPersonnel(m){
      const a = api.annonceDe(m);
      return !!(a && a.type === "don_financier" && m.pour_le_compte_de !== "entreprise");
    },

    /* Missions telles que l'employeur a le droit de les voir. */
    missionsVueEmployeur(eid){
      return api.missions({ entreprise: eid }).map(m => {
        if (!api.estDonPersonnel(m)) return m;
        return { ...m, masquee: true, salarie: null, annonce: m.annonce, quantite: null };
      });
    },

    /* Points d'un salarié tels que l'employeur peut les voir : ceux des missions
       opérationnelles, jamais ceux issus d'un don personnel. Sinon il suffit de lire
       un écart de points pour deviner un montant donné, et à quelle cause. */
    pointsVisiblesEmployeur(uid){
      return api.missions({ salarie: uid })
        .filter(m => ["validee", "validee_auto"].includes(m.etat) && !api.estDonPersonnel(m))
        .reduce((n, m) => n + m.points, 0);
    },

    /* Agrégat des dons personnels, publié seulement au-dessus du seuil : en dessous,
       un total et un effectif suffisent à réidentifier. */
    donsPersonnelsAgreges(eid){
      const ms = api.missions({ entreprise: eid })
        .filter(m => api.estDonPersonnel(m) && ["validee", "validee_auto"].includes(m.etat));
      const donateurs = new Set(ms.map(m => m.salarie)).size;
      const montant = ms.reduce((n, m) => n + (Number(m.quantite) || 0), 0);
      const suffisant = donateurs >= api.SEUIL_AGREGAT;
      return { donateurs, montant, suffisant, seuil: api.SEUIL_AGREGAT,
               affichable: suffisant ? { donateurs, montant } : null };
    },

    /* ------------------------------------------------------------------ */
    /* Signalement de contenu                                             */
    /* ------------------------------------------------------------------ */
    /* Riseva héberge et diffuse des annonces écrites par des tiers. Le règlement sur
       les services numériques impose, quelle que soit la taille de l'hébergeur, un
       mécanisme de signalement électronique, accessible et facile d'utilisation, et
       une décision motivée notifiée à l'auteur du signalement (article 16 du DSA). */
    MOTIFS_SIGNALEMENT: {
      hors_objet:   "Sans rapport avec l'objet de l'association",
      trompeur:     "Description trompeuse ou inexacte",
      illicite:     "Contenu illicite",
      dangereux:    "Mission dangereuse ou sans encadrement",
      donnees:      "Données personnelles exposées",
      autre:        "Autre motif"
    },
    signaler({ annonce, par, motif, precisions }){
      const a = api.annonce(annonce);
      if (!a) throw new Error("Annonce introuvable");
      const sg = { id:id("sg"), annonce, association:a.asso, par, motif,
        precisions: precisions || "", etat:"recu", decision:null, motivation:null,
        recu_le: new Date().toISOString().slice(0, 10), decide_le:null };
      s.signalements.unshift(sg);
      return sg;
    },
    signalements: (etat) => s.signalements.filter(x => !etat || x.etat === etat),
    /* Une décision non motivée ne vaut rien : le texte l'exige, et c'est de toute
       façon la seule façon qu'une association comprenne ce qu'on lui reproche. */
    deciderSignalement(sid, decision, motivation){
      const sg = s.signalements.find(x => x.id === sid);
      if (!sg) return null;
      if (!motivation || !motivation.trim())
        throw new Error("Une décision doit être motivée, le règlement l'exige");
      sg.etat = "traite"; sg.decision = decision; sg.motivation = motivation.trim();
      sg.decide_le = new Date().toISOString().slice(0, 10);
      if (decision === "retire"){
        const a = api.annonce(sg.annonce);
        if (a){ a.etat = "close"; a.retiree_moderation = true; }
      }
      return sg;
    },
    annonce: (aid) => s.annonces.find(a => a.id === aid) || null,

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
      let donsSalaries = 0, donsEntreprise = 0, demiJourneesTT = 0, demiJourneesPerso = 0;

      ms.forEach(m => {
        const a = api.annonceDe(m); if (!a) return;
        if (a.type === "don_financier"){
          /* Un salarié qui donne de sa poche donne en son nom. Le reçu est établi à son
             nom, au modèle des particuliers, et le montant n'entre PAS dans l'assiette de
             l'entreprise : l'article 238 bis vise les versements effectués par l'entreprise.
             Confondre les deux fabriquerait une réduction d'impôt indue. */
          if (m.pour_le_compte_de === "entreprise") donsEntreprise += Number(m.quantite) || 0;
          else donsSalaries += Number(m.quantite) || 0;
          return;
        }
        if (a.type !== "benevolat_demi_journee") return;
        if (!a.temps_travail || !api.eligibleMecenat(a.asso)){
          demiJourneesPerso += m.quantite; return;
        }
        demiJourneesTT += m.quantite;
        parSalarie[m.salarie] = (parSalarie[m.salarie] || 0) + m.quantite * coutDemiJournee;
      });

      const plafondSal = FISCAL.plafond_mecenat_par_salarie;
      let competencesBrut = 0, competencesRetenu = 0;
      Object.values(parSalarie).forEach(v => {
        competencesBrut += v;
        competencesRetenu += Math.min(v, plafondSal);
      });

      /* L'assiette de l'entreprise, et rien d'autre. */
      const assiette = donsEntreprise + competencesRetenu;
      const plafondEntreprise = Math.max(FISCAL.plafond_plancher,
        Math.round((e.ca || 0) * FISCAL.plafond_taux_ca));
      const assietteRetenue = Math.min(assiette, plafondEntreprise);
      const reportable = Math.max(0, assiette - plafondEntreprise);
      const reduction = Math.round(assietteRetenue * FISCAL.taux_reduction);

      return {
        donsSalaries, donsEntreprise, demiJourneesTT, demiJourneesPerso,
        coutDemiJournee, competencesBrut, competencesRetenu,
        ecreteParSalarie: competencesBrut - competencesRetenu,
        plafondSalarie: plafondSal,
        assiette, plafondEntreprise, assietteRetenue, reportable, reduction,
        salariesConcernes: Object.keys(parSalarie).length,
        /* Ce que les salariés peuvent déduire eux-mêmes, à titre personnel : 66 % du don
           dans la limite de 20 % du revenu imposable (article 200 du CGI). */
        reductionSalaries: Math.round(donsSalaries * 0.66)
      };
    },

    /* Une association non éligible au mécénat ne peut pas proposer de mission
       sur le temps de travail : il n'y aurait rien à valoriser, et laisser croire
       le contraire serait la faute la plus coûteuse du produit. */
    eligibleMecenat: (aid) => !!(api.reglagesRecus(aid) || {}).eligible_mecenat,

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
    /* Moteur : ce qui se fait tout seul                                  */
    /* ------------------------------------------------------------------ */
    /* Quatre automatismes tournent sans que personne les déclenche. En production
       ce sont des tâches planifiées côté base (voir supabase/05_taches.sql) ;
       ici elles s'exécutent au chargement, ce qui donne exactement le même résultat.
       Chaque passage est daté et consigné : une automatisation qu'on ne peut pas
       auditer inquiète plus qu'elle ne rassure. */
    moteur(aujourdhui = new Date().toISOString().slice(0, 10)){
      const fait = { validations_auto:0, annonces_fermees:0, rapports:0, classement:false,
                     le: aujourdhui };

      /* 1. Une association qui ne répond pas ne doit pas bloquer le client.
            Quatorze jours après la déclaration, la mission est comptée. */
      s.missions.filter(m => m.etat === "a_valider").forEach(m => {
        const limite = new Date(m.date);
        limite.setDate(limite.getDate() + 14);
        if (limite.toISOString().slice(0, 10) <= aujourdhui){
          m.etat = "validee_auto";
          const e = s.entreprises.find(x => x.id === m.entreprise);
          if (e) e.points += m.points;
          const u = s.utilisateurs.find(x => x.id === m.salarie);
          if (u) u.points = (u.points || 0) + m.points;
          fait.validations_auto++;
        }
      });

      /* 2. Une annonce dont la date est passée depuis plus de sept jours ne doit plus
            apparaître : c'est l'engagement de fraîcheur pris envers les clients. */
      s.annonces.filter(a => a.etat === "ouverte").forEach(a => {
        const limite = new Date(a.date);
        limite.setDate(limite.getDate() + 7);
        if (limite.toISOString().slice(0, 10) < aujourdhui){
          a.etat = "close"; a.fermeture_auto = true; fait.annonces_fermees++;
        }
      });

      /* 3. Les rapports de période close se génèrent seuls, une fois. */
      s.entreprises.forEach(e => {
        api.rapports(e.id).filter(r => r.etat === "genere").forEach(r => {
          const cle = e.id + ":" + r.id;
          if (!s.rapports_generes.includes(cle)){
            s.rapports_generes.push(cle); fait.rapports++;
          }
        });
      });

      /* 4. Le classement est recalculé chaque lundi. On ne stocke pas de rang :
            il se déduit des points, ce qui évite tout écart entre l'affiché et le réel. */
      s.classement_recalcule_le = aujourdhui;
      fait.classement = true;

      s.moteur_journal.unshift(fait);
      s.moteur_journal = s.moteur_journal.slice(0, 30);
      return fait;
    },
    journalMoteur: () => s.moteur_journal,

    /* ------------------------------------------------------------------ */
    /* Indicateurs de pilote                                              */
    /* ------------------------------------------------------------------ */
    /* Protocole de mesure, figé avant le lancement d'un pilote. Un indicateur dont on
       peut changer le dénominateur en cours de route ne prouve rien, et un acheteur
       le sait. Les repères :
         T0  première communication de lancement à toute la population pilote ;
         P   période de mesure, T0 à T0 + 90 jours ;
         C   clôture des validations, 14 jours après P ;
         I0  effectif à qui l'accès a été proposé à T0, certifié par l'entreprise et gelé ;
         S0  places disponibles à T0 ;
         R30, R90  comptes uniques appartenant à I0, créés avant J30 et J90 ;
         A   salariés uniques ayant au moins une action validée ;
         X   nombre d'actions validées.
       Une action validée est une combinaison unique salarié × association × format × date,
       réalisée dans P et acceptée avant C. Deux versements au même organisme le même jour
       ne font qu'une action. */
    indicateurs(eid){
      const entreprises = eid ? [api.entreprise(eid)].filter(Boolean) : s.entreprises;
      const ids = entreprises.map(e => e.id);

      const I0 = entreprises.reduce((n, e) => n + (e.effectif || 0), 0);
      const S0 = entreprises.reduce((n, e) => n + (e.sieges || e.effectif || 0), 0);
      const comptes = s.utilisateurs.filter(u => ids.includes(u.org)
        && (u.role === "salarie" || u.role === "entreprise_admin") && !u.anonyme);
      const R90 = comptes.length;
      const R30 = comptes.length;   // jeu de démonstration : pas d'historique de création

      const validees = s.missions.filter(m => ids.includes(m.entreprise)
        && ["validee", "validee_auto"].includes(m.etat));
      /* Déduplication : salarié × association × format × date. */
      const cles = new Set();
      validees.forEach(m => {
        const a = api.annonceDe(m); if (!a) return;
        cles.add([m.salarie, a.asso, a.type, m.date].join("|"));
      });
      const X = cles.size;
      const A = new Set(validees.map(m => m.salarie)).size;

      /* Concentration : part des actions portée par les 10 % de salariés les plus actifs.
         Une valeur élevée révèle un pilote tenu par quelques ambassadeurs. */
      const parSalarie = {};
      validees.forEach(m => parSalarie[m.salarie] = (parSalarie[m.salarie] || 0) + 1);
      const tries = Object.values(parSalarie).sort((x, y) => y - x);
      const tete = Math.max(1, Math.ceil(0.1 * Math.max(A, 1)));
      const concentration = X ? tries.slice(0, tete).reduce((n, v) => n + v, 0) / X : null;

      const parFormat = {};
      validees.forEach(m => {
        const a = api.annonceDe(m); if (!a) return;
        parFormat[a.type] = (parFormat[a.type] || 0) + 1;
      });
      const partMax = X ? Math.max(...Object.values(parFormat), 0) / X : null;

      const assos = new Set(validees.map(m => (api.annonceDe(m) || {}).asso).filter(Boolean)).size;
      const heures = validees.reduce((n, m) => {
        const a = api.annonceDe(m);
        return n + (a && a.type === "benevolat_demi_journee" ? m.quantite * 4 : 0);
      }, 0);

      const tranchees = s.missions.filter(m => ids.includes(m.entreprise)
        && ["validee", "validee_auto", "refusee"].includes(m.etat));
      const auto = s.missions.filter(m => ids.includes(m.entreprise) && m.etat === "validee_auto");

      const pct = (n, d) => d ? Math.round((n / d) * 1000) / 10 : null;
      const ouvertes = s.annonces.filter(a => a.etat === "ouverte");
      const fraiches = ouvertes.filter(a => a.date >= "2026-08-20");

      return {
        reperes: { I0, S0, R30, R90, A, X },
        inscriptionI0: { valeur: pct(R30, I0), num: R30, den: I0,
          definition: "R30 divisé par I0. Comptes uniques créés avant J30, rapportés à l'effectif à qui l'accès a été proposé à T0. À publier avec l'indicateur suivant, jamais seul." },
        inscriptionS0: { valeur: pct(R30, S0), num: R30, den: S0,
          definition: "R30 divisé par S0. Mesure la consommation des places achetées, pas la portée dans l'entreprise." },
        participation:{ valeur: pct(A, I0), num: A, den: I0,
          definition: "A divisé par I0. Salariés uniques ayant au moins une action validée, rapportés à l'effectif invité. C'est l'indicateur commercial principal : une inscription seule ne compte pas." },
        conversion:   { valeur: pct(A, R90), num: A, den: R90,
          definition: "A divisé par R90. Part des inscrits devenus acteurs." },
        actions100:   { valeur: I0 ? Math.round((100 * X / I0) * 10) / 10 : null, num: X, den: I0,
          definition: "100 × X divisé par I0. Nombre d'actions validées pour cent salariés invités." },
        concentration:{ valeur: concentration === null ? null : Math.round(concentration * 1000) / 10,
          num: tries.slice(0, tete).reduce((n, v) => n + v, 0), den: X,
          definition: "Actions réalisées par les 10 % de salariés les plus actifs, divisées par X. Une valeur élevée révèle un pilote porté par quelques ambassadeurs." },
        partFormatMax:{ valeur: partMax === null ? null : Math.round(partMax * 1000) / 10,
          num: X ? Math.max(...Object.values(parFormat), 0) : 0, den: X,
          definition: "Part du format le plus représenté. Les points restent une mécanique de classement, pas une mesure d'impact." },
        associations: { valeur: assos, num: assos, den: null,
          definition: "Nombre d'organismes distincts ayant reçu au moins une action validée." },
        heuresMecenat:{ valeur: heures, num: heures, den: null,
          definition: "Somme des durées nettes réellement émargées. Pauses exclues, déplacements inclus seulement s'ils font partie de la mission convenue." },
        validationAuto:{ valeur: pct(auto.length, validees.length), num: auto.length, den: validees.length,
          definition: "Missions comptées faute de réponse de l'association, divisées par les missions validées. Mesure la défaillance du réseau, pas la performance du client." },
        realisation:  { valeur: pct(validees.length, tranchees.length), num: validees.length, den: tranchees.length,
          definition: "Missions validées divisées par les missions tranchées. Celles encore en cours ne comptent dans aucun des deux termes." },
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
        heures: demiJournees * 4,
        realisations: api.realisations().liste
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
  /* Remise à zéro, offerte dans l'interface : une démonstration qu'on ne peut pas
     remettre à neuf finit par ne plus rien démontrer. */
  api.reinitialiser = () => {
    try { localStorage.removeItem(CLE_ETAT); } catch {}
    return true;
  };
  api.enregistreLe = () => (lireEtat() || {}).enregistre_le || null;

  /* Toute méthode appelée déclenche une sauvegarde différée. Écrire après une lecture
     ne coûte rien et garantit qu'aucune mutation ne passe à travers les mailles. */
  return new Proxy(api, {
    get(cible, prop){
      const v = cible[prop];
      if (typeof v !== "function") return v;
      return (...args) => { const r = v.apply(cible, args); planifier(); return r; };
    }
  });
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
