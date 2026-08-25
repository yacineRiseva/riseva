/* Riseva — couche de données.
   Deux implémentations : `mock` (données de démonstration en mémoire, aucun serveur)
   et `supabase` (client CDN, activé dès que /app/config.js fournit une URL et une clé anon).
   Le reste de l'application ne parle qu'à l'objet `DB` exporté ici. */

/* ------------------------------------------------------------------ */
/* Le barème : sept façons d'aider, et ce que chacune vaut             */
/* ------------------------------------------------------------------ */
/* Il n'y en avait que trois, et elles disaient toutes la même chose : du temps,
   des objets, de l'argent. Une association de terrain propose autre chose. Un
   refuge cherche des parrains et des adoptants avant de chercher des bras, et
   c'est même sa demande principale : un animal parrainé, c'est une année de
   soins financée ; un animal adopté, c'est une place qui se libère pour le
   suivant. Ne pas les inscrire au barème revenait à dire aux refuges que ce
   qu'ils demandent vraiment ne compte pas.
 
   Trois attributs pilotent tout le reste du code, et remplacent les tests sur
   le nom du format qui étaient écrits partout :
 
   `famille` : temps, animal, materiel, argent. C'est elle qui décide si une
   mission compte des heures, si elle entre dans l'assiette du mécénat, et si
   les prénoms des collègues peuvent s'afficher à côté.
 
   `heures` : les heures qu'une unité représente. La valorisation du mécénat de
   compétence les utilise directement, au lieu de convertir des demi-journées
   avec une constante qui ne vaut que pour un seul format.
 
   `prive` : ce qui touche à la vie personnelle ne s'affiche pas à côté d'un
   nom. Un virement et une adoption sont deux décisions qu'on prend chez soi. */
export const BAREME = {
  benevolat_demi_journee: { label: "Bénévolat, demi-journée", unite: "demi-journée",
                            points: 150, famille: "temps",   heures: 4, icone: "hands" },
  benevolat_journee:      { label: "Bénévolat, journée",      unite: "journée",
                            points: 300, famille: "temps",   heures: 8, icone: "hands" },
  mecenat_competence:     { label: "Mécénat de compétence",   unite: "demi-journée",
                            points: 200, famille: "temps",   heures: 4, icone: "hands" },
  parrainage_animal:      { label: "Parrainage d'un animal",  unite: "animal parrainé un an",
                            points: 250, famille: "animal",  prive: true, icone: "paw" },
  adoption_animal:        { label: "Adoption d'un animal",    unite: "animal adopté",
                            points: 400, famille: "animal",  prive: true, icone: "paw" },
  don_materiel:           { label: "Don de matériel",         unite: "don validé",
                            points: 100, famille: "materiel", icone: "box" },
  don_financier:          { label: "Don financier",           unite: "10 € versés",
                            points: 1,   famille: "argent",  prive: true, icone: "coins" }
};

/* Les trois questions qu'on posait au format en le nommant, posées maintenant à
   ses attributs. Un format ajouté demain répond tout seul aux trois. */
export const estArgent   = (t) => (BAREME[t] || {}).famille === "argent";
export const estTemps    = (t) => (BAREME[t] || {}).famille === "temps";
export const estPrive    = (t) => Boolean((BAREME[t] || {}).prive);
export const heuresPour  = (t, q = 1) => ((BAREME[t] || {}).heures || 0) * q;

/* ------------------------------------------------------------------ */
/* Les dons en argent : par virement, et sans jamais y toucher         */
/* ------------------------------------------------------------------ */
/* Riseva n'encaisse rien, et ne le fera pas. Recevoir des fonds pour les
   reverser à un tiers, c'est fournir un service de paiement au sens des articles
   L. 314-1 et L. 521-1 du code monétaire et financier. L'exercer sans agrément
   est puni de trois ans d'emprisonnement et 375 000 € d'amende (art. L. 572-5).
   Aucun montage — « compte de cantonnement », « simple facilitation », « nous ne
   sommes que l'intermédiaire technique » — ne change cette qualification.

   D'où le circuit retenu, qui n'a besoin ni d'agrément, ni de prestataire, ni de
   commission : **le donateur vire l'argent directement à l'association**, avec
   une référence émise par Riseva. Riseva ne voit passer que deux événements —
   l'intention, puis la confirmation par l'association — et pas un centime.

   Le prix à payer est assumé : c'est moins fluide qu'un bouton « Donner ». En
   échange, il n'y a ni frais, ni délai de reversement, ni dépendance à un
   prestataire qui peut fermer un compte, et l'association reçoit 100 % du don le
   jour où sa banque le crédite. */
export const DON = {
  ouvert: true,
  circuit: "virement",
  /* Ce que Riseva ne fait pas, écrit une fois et repris partout à l'écran. */
  riseva_encaisse: false,
  frais: 0,
  /* Une intention non confirmée s'éteint. Sans échéance, la page d'une
     association se remplirait de dons annoncés jamais versés, et le « reste à
     financer » ne voudrait plus rien dire. */
  validite_jours: 30,
  montant_min: 5,
  montants_suggeres: [20, 50, 100, 250]
};

/* Les circuits par lesquels l'argent peut arriver à une association. Aucun ne
   passe par Riseva : c'est la seule chose qu'ils ont en commun, et c'est la seule
   qui compte juridiquement.

   HelloAsso a été retenu comme circuit *complémentaire*, pas comme remplacement.
   Il est plus fluide — une carte bancaire, immédiat — et il ne prend aucune
   commission : son modèle repose sur une contribution volontaire du donateur,
   qui peut la mettre à zéro. Mais il suppose que l'association ait un compte
   HelloAsso vérifié, ce que neuf petites associations sur dix n'ont pas, et il
   ne délivre pas le reçu fiscal.

   D'où l'ordre : HelloAsso quand l'association en a un, virement sinon. Le
   virement reste le socle, parce qu'un IBAN, toute association en a un.

   Ce que Riseva ne fait PAS, volontairement : détenir les clés d'API des
   associations. L'intégration serveur-à-serveur (webhook, confirmation
   automatique du don) suppose un compte partenaire obtenu auprès de HelloAsso,
   qui exige une personne morale. Tant qu'elle n'existe pas, l'association colle
   l'adresse de son propre formulaire et confirme la réception comme pour un
   virement. Aucun secret ne transite, et rien n'attend une réponse de qui que
   ce soit pour fonctionner. */
export const CIRCUITS_DON = {
  /* Le circuit principal. L'association connecte son compte HelloAsso une fois ;
     ensuite un don se fait par carte, en trois clics, et se confirme tout seul.
     L'argent va de la carte du donateur au compte de l'association : Riseva n'y
     touche pas, donc pas d'agrément d'établissement de paiement à obtenir. */
  helloasso: {
    label: "Carte bancaire",
    aide: "Trois clics, et c'est fait. L'argent arrive sur le compte de l'association sans passer par Riseva, et le don se confirme tout seul. HelloAsso ne prend aucune commission : il se rémunère sur une contribution volontaire du donateur, modifiable et supprimable.",
    immediat: true,
    exige: "un compte HelloAsso connecté à Riseva"
  },
  /* Le repli, pour une association qui n'a pas encore de compte HelloAsso. Il
     marche partout et ne demande rien à personne, mais il coûte trois gestes
     manuels et une confirmation à la main : c'est pour cela qu'il n'est plus le
     circuit qu'on propose en premier. */
  virement: {
    label: "Virement bancaire",
    aide: "Universel, mais manuel : le donateur recopie l'IBAN et la référence, et vous confirmez la réception depuis votre espace.",
    immediat: false,
    exige: "un IBAN"
  }
};

/* L'adresse d'un formulaire HelloAsso. On ne l'accepte que sur le domaine de
   HelloAsso, et rien d'autre : ce lien est présenté à des donateurs sous la
   phrase « donnez ici », et un champ libre pointant n'importe où serait un
   détournement de dons offert à qui prendrait la main sur un compte
   d'association. */
const HELLOASSO_MOTIF =
  /^https:\/\/(www\.)?helloasso\.com\/associations\/[a-z0-9-]+\/(formulaires|collectes|evenements|adhesions|boutiques)\/[a-z0-9-]+\/?$/i;
export const lienHelloAssoValide = (v) => HELLOASSO_MOTIF.test(String(v || "").trim());

/* La référence portée par le virement. Elle sert à une seule chose, et c'est la
   seule chose qui compte : permettre à l'association de rapprocher une ligne de
   son relevé bancaire d'un don annoncé sur Riseva. Elle est donc lue à voix
   haute, recopiée à la main dans un formulaire de banque, parfois dictée au
   téléphone — d'où un alphabet sans 0/O, 1/I et sans minuscules. */
const ALPHABET = "ACDEFGHJKLMNPQRSTUVWXYZ2345679";
export function referenceVirement(graine){
  let n = 0;
  const t = String(graine || "");
  for (let i = 0; i < t.length; i++) n = (n * 31 + t.charCodeAt(i)) >>> 0;
  let s = "";
  for (let i = 0; i < 8; i++){ s += ALPHABET[n % ALPHABET.length]; n = Math.floor(n / 7) + 97 * (i + 1); }
  return `RSV-${s.slice(0, 4)}-${s.slice(4)}`;
}
export const REFERENCE_MOTIF = /^RSV-[ACDEFGHJKLMNPQRSTUVWXYZ2345679]{4}-[ACDEFGHJKLMNPQRSTUVWXYZ2345679]{4}$/;

/* Contrôle mod-97 d'un IBAN (norme ISO 13616). Un IBAN faux affiché sur une page
   publique, c'est un don qui part chez personne — ou, pire, chez quelqu'un
   d'autre. Le contrôle ne prouve pas que le compte existe ; il prouve que le
   numéro n'a pas été saisi de travers, ce qui est l'erreur de très loin la plus
   fréquente. */
export function ibanValide(v){
  const s = String(v || "").replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(s)) return false;
  const p = s.slice(4) + s.slice(0, 4);
  let reste = 0;
  for (const c of p){
    const d = c >= "A" && c <= "Z" ? String(c.charCodeAt(0) - 55) : c;
    for (const ch of d) reste = (reste * 10 + Number(ch)) % 97;
  }
  return reste === 1;
}
export const ibanNormalise = (v) => String(v || "").replace(/\s+/g, "").toUpperCase();
/* Affichage par groupes de quatre, comme sur un relevé : c'est ainsi qu'on le
   recopie sans se tromper. */
export const ibanLisible = (v) => ibanNormalise(v).replace(/(.{4})/g, "$1 ").trim();
/* Version tronquée, pour les écrans où l'IBAN n'a pas à être lu en entier. */
export const ibanCourt = (v) => {
  const s = ibanNormalise(v);
  return s.length < 10 ? s : `${s.slice(0, 4)} ...... ${s.slice(-4)}`;
};

/* Le reçu fiscal est émis par l'association, et par elle seule : c'est elle qui
   engage sa responsabilité, et c'est elle qui encourt l'amende de l'article
   1740 A du CGI — égale au taux de la réduction d'impôt en cause, appliqué aux sommes
   portées sur le reçu. Riseva ne peut
   donc préparer un reçu qu'à la condition d'un mandat écrit, daté, nominatif et
   révocable à tout moment. Sans lui, la plateforme n'émet rien : ni brouillon,
   ni « modèle à signer ». */
export const MANDAT_RECUS = {
  version: "2026.1",
  texte: [
    "L'association mandate Riseva pour préparer et transmettre en son nom les reçus fiscaux correspondant aux dons reçus par son intermédiaire.",
    "L'association reste seule émettrice : elle déclare son éligibilité au régime des articles 200 et 238 bis du CGI, désigne le signataire et sa qualité, et arrête la numérotation.",
    "L'association conserve les reçus émis pendant six ans (art. L. 102 B du livre des procédures fiscales).",
    "Riseva ne certifie ni l'éligibilité, ni l'exactitude des montants déclarés reçus.",
    "Le mandat est révocable à tout moment, sans motif et sans préavis. La révocation arrête immédiatement la préparation des reçus, sans effet sur ceux déjà émis."
  ]
};

/* Règle anti-optimisation : aucun format ne peut peser plus de la moitié des points
   d'une entreprise sur une saison. Sans ce plafond, il suffirait de virer de l'argent
   pour truster le classement, ce qui viderait le jeu de son sens. */
export const PLAFOND_PAR_FORMAT = 0.5;

/* Une association a quatorze jours pour répondre, comptés depuis la déclaration
   de la mission. La même constante vaut pour le SQL (tache_validation_auto) et
   pour le protocole de mesure : trois délais concurrents, c'est trois chiffres
   qui ne tombent jamais juste. */
export const DELAI_VALIDATION_JOURS = 14;

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
             source: "BAN", le: leJour() };
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

/* ------------------------------------------------------------------ */
/* Annuaire public : vérifier une structure sans rien demander à personne */
/* ------------------------------------------------------------------ */
/* API « Recherche d'entreprises » de la DINUM (data.gouv.fr). Gratuite, sans clé
   et sans compte, sous Licence Ouverte 2.0 — l'attribution est obligatoire et
   figure sur les écrans qui l'utilisent. Elle sert deux choses, et deux seulement :

   1. remplir la fiche d'une association à sa place, à partir de son seul numéro.
      C'est la règle qu'on s'est donnée : une association ne doit rien avoir à
      faire d'autre que publier son besoin ;
   2. donner à Riseva une preuve datée que la structure existe, qu'elle est
      ouverte, et que le nom affiché est bien le sien.

   Ce qu'elle ne prouve pas est écrit noir sur blanc dans ANNUAIRE_LIMITES et
   repris à l'écran : l'éligibilité au mécénat (art. 200 et 238 bis du CGI) n'est
   dans aucun registre public, et ne se déduit pas d'une catégorie juridique.

   `minimal=true` retire les dirigeants de la réponse. Ce n'est pas un détail de
   performance : sans ce paramètre, l'API renvoie des noms, prénoms et dates de
   naissance de personnes physiques que Riseva n'a aucune raison de recevoir. On
   ne filtre pas après coup ce qu'on peut ne pas demander. */
export const ANNUAIRE = {
  url: "https://recherche-entreprises.api.gouv.fr/search",
  source: "Annuaire des Entreprises (DINUM)",
  licence: "Licence Ouverte 2.0",
  attribution: "Données : Annuaire des Entreprises, INSEE, INPI, DILA, sous Licence Ouverte 2.0",
  page: "https://annuaire-entreprises.data.gouv.fr",
  /* Le service annonce sept requêtes par seconde. On reste très en dessous :
     une frappe au clavier ne doit pas déclencher une rafale. */
  debit_max_par_seconde: 7,
  delai_frappe_ms: 450,
  par_page: 8,
  /* Revérification annuelle. Une association contrôlée il y a deux ans n'est pas
     une association contrôlée. */
  validite_controle_jours: 365
};

export const ANNUAIRE_LIMITES = [
  "Le registre prouve qu'une structure est immatriculée et ouverte. Il ne prouve pas qu'elle est éligible au mécénat : aucun registre public ne porte cette information.",
  "Seules 10 à 15 % des associations déclarées ont un numéro SIREN. Les autres n'apparaissent pas ici, et leur absence ne veut rien dire.",
  "Les tranches d'effectif de l'INSEE sont des intervalles datés de deux à trois ans, absents pour une structure sur deux. Elles ne servent ni au quota, ni au score, ni au prix.",
  "Le nombre d'établissements donne un ordre de grandeur, jamais la liste des sites d'un client : cette liste se déclare, elle ne se devine pas.",
  "Les associations d'Alsace-Moselle relèvent du droit local de 1908 et d'un registre distinct ; leur numéro n'est pas un RNA."
];

/* Clé de Luhn. Le SIREN et le SIRET la portent, ce qui permet de refuser une
   coquille avant même d'interroger quoi que ce soit — un aller-retour réseau
   évité, et surtout un message d'erreur qui dit la vérité : « ce numéro ne peut
   pas exister », et non « nous n'avons rien trouvé ». */
function luhn(n){
  let somme = 0;
  for (let i = 0; i < n.length; i++){
    let c = Number(n[n.length - 1 - i]);
    if (i % 2 === 1){ c *= 2; if (c > 9) c -= 9; }
    somme += c;
  }
  return somme % 10 === 0;
}

export const chiffresSeuls = (v) => String(v || "").replace(/\D+/g, "");

/* La Poste fait exception depuis toujours : ses numéros ne satisfont pas Luhn
   mais la somme de leurs chiffres est divisible par cinq. Une règle écrite dans
   la documentation de l'INSEE, pas une tolérance qu'on s'accorde. */
const exceptionLaPoste = (n) =>
  n.startsWith("356000000") &&
  [...n].reduce((t, c) => t + Number(c), 0) % 5 === 0;

export const sirenValide = (v) => {
  const n = chiffresSeuls(v);
  return n.length === 9 && (luhn(n) || exceptionLaPoste(n));
};
export const siretValide = (v) => {
  const n = chiffresSeuls(v);
  return n.length === 14 && (luhn(n) || exceptionLaPoste(n));
};
/* Un RNA : W puis neuf caractères. Le premier chiffre code le département de
   dépôt, mais on ne le contrôle pas : les reprises de fichiers anciens en ont
   assez pour qu'un contrôle strict rejette des associations parfaitement
   réelles. */
export const rnaValide = (v) => /^W[0-9A-Z]{9}$/i.test(String(v || "").trim());

/* Tranches d'effectif de l'INSEE. Conservées pour l'affichage — un acheteur
   reconnaît le code et s'attend à le voir — et interdites partout ailleurs.
   `usage_interdit` n'est pas décoratif : les écrans le lisent pour afficher la
   réserve à côté du chiffre. */
export const TRANCHES_EFFECTIF = {
  "NN": "Effectif non renseigné", "00": "Aucun salarié",
  "01": "1 ou 2 salariés",      "02": "3 à 5 salariés",
  "03": "6 à 9 salariés",       "11": "10 à 19 salariés",
  "12": "20 à 49 salariés",     "21": "50 à 99 salariés",
  "22": "100 à 199 salariés",   "31": "200 à 249 salariés",
  "32": "250 à 499 salariés",   "41": "500 à 999 salariés",
  "42": "1 000 à 1 999 salariés","51": "2 000 à 4 999 salariés",
  "52": "5 000 à 9 999 salariés","53": "10 000 salariés et plus"
};
export const trancheEffectif = (code) =>
  TRANCHES_EFFECTIF[String(code || "NN")] || "Effectif non renseigné";

export const ETATS_ADMINISTRATIFS = {
  A: { label:"En activité",  badge:"badge--ok"    },
  C: { label:"Fermée",       badge:"badge--alerte" }
};

/* Normalisation des dénominations avant comparaison. « ASSOCIATION LES JARDINS
   DU NORD (LOI 1901) » et « Les Jardins du Nord » sont la même structure ; les
   traiter comme deux noms différents aurait produit un écart à chaque contrôle,
   et un écart qui se produit toujours n'est plus lu par personne. */
const MOTS_VIDES = new Set(["ASSOCIATION","ASSOC","ASSO","LOI","1901","DE","DU","DES",
  "LA","LE","LES","L","D","ET","POUR","EN","AU","AUX","UNION","COMITE","COMITÉ"]);

export function normaliserNom(v){
  return String(v || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}
const motsUtiles = (v) =>
  normaliserNom(v).split(" ").filter(m => m && !MOTS_VIDES.has(m));

/* Recouvrement de Jaccard sur les mots utiles. Simple, explicable à un client,
   et surtout symétrique : « Refuge des Quatre Vents » et « Quatre Vents Refuge »
   se reconnaissent. */
function recouvrement(a, b){
  const A = new Set(motsUtiles(a)), B = new Set(motsUtiles(b));
  if (!A.size || !B.size) return 0;
  let commun = 0; A.forEach(m => { if (B.has(m)) commun++; });
  return commun / (A.size + B.size - commun);
}

export const ETATS_CORRESPONDANCE = {
  exact:       { label:"Nom identique au registre",        badge:"badge--ok",     bloquant:false },
  proche:      { label:"Nom voisin du registre",           badge:"badge--info",   bloquant:false },
  different:   { label:"Nom différent du registre",        badge:"badge--attente",bloquant:true  },
  fermee:      { label:"Structure fermée au registre",     badge:"badge--alerte", bloquant:true  },
  introuvable: { label:"Numéro introuvable au registre",   badge:"badge--alerte", bloquant:true  },
  panne:       { label:"Registre injoignable",             badge:"badge--info",   bloquant:false },
  absent:      { label:"Aucun numéro déclaré",             badge:"badge--attente",bloquant:false }
};

/* Une fiche, telle que Riseva la garde : ce dont on a besoin, rien de plus.
   La réponse de l'API contient davantage ; recopier tout « au cas où » aurait
   fait entrer dans la base des champs que personne n'affiche et que personne ne
   sait plus justifier trois ans plus tard. */
export function versFiche(r){
  if (!r) return null;
  const siege = r.siege || {};
  const co = String(siege.coordonnees || "").split(",");
  const comp = r.complements || {};
  return {
    siren: r.siren || null,
    siret_siege: siege.siret || null,
    nom: r.nom_complet || r.nom_raison_sociale || "",
    nom_raison_sociale: r.nom_raison_sociale || "",
    sigle: r.sigle || "",
    etat: r.etat_administratif || siege.etat_administratif || null,
    date_creation: r.date_creation || null,
    nature_juridique: r.nature_juridique || null,
    activite: siege.activite_principale || null,
    adresse: siege.adresse || "",
    code_postal: siege.code_postal || "",
    commune: siege.libelle_commune || "",
    lat: co[0] ? Number(co[0]) : null,
    lon: co[1] ? Number(co[1]) : null,
    tranche_effectif: r.tranche_effectif_salarie || null,
    /* Ordre de grandeur seulement — voir ANNUAIRE_LIMITES. */
    etablissements: r.nombre_etablissements ?? null,
    etablissements_ouverts: r.nombre_etablissements_ouverts ?? null,
    est_association: comp.est_association === true,
    est_ess: comp.est_ess === true,
    rna: comp.identifiant_association || null,
    source: ANNUAIRE.source,
    licence: ANNUAIRE.licence
  };
}

export function requeteAnnuaire(q, { parPage = ANNUAIRE.par_page, page = 1 } = {}){
  const p = new URLSearchParams({
    q: String(q || "").trim(),
    minimal: "true",
    include: "siege,complements",
    per_page: String(parPage),
    page: String(page)
  });
  return `${ANNUAIRE.url}?${p}`;
}

/* Recherche libre : un nom, un SIREN, un SIRET. Renvoie toujours un objet, jamais
   une exception — un registre injoignable est un incident d'exploitation, pas une
   erreur de l'utilisateur, et il ne doit pas casser l'écran sur lequel il est. */
export async function chercherStructure(q, { signal, parPage } = {}){
  const texte = String(q || "").trim();
  if (texte.length < 3) return { etat:"court", fiches:[] };
  const n = chiffresSeuls(texte);
  if ((n.length === 9 && !sirenValide(n)) || (n.length === 14 && !siretValide(n)))
    return { etat:"numero_invalide", fiches:[] };
  try {
    const r = await fetch(requeteAnnuaire(texte, { parPage }),
      { signal, headers: { Accept: "application/json" } });
    if (!r.ok) return { etat:"panne", code:r.status, fiches:[] };
    const j = await r.json();
    return {
      etat: "ok",
      total: j.total_results ?? (j.results || []).length,
      fiches: (j.results || []).map(versFiche).filter(Boolean)
    };
  } catch (e){
    if (e && e.name === "AbortError") return { etat:"annulee", fiches:[] };
    return { etat:"panne", fiches:[] };
  }
}

/* Recherche par numéro exact. On ne renvoie une fiche que si le numéro demandé
   est bien celui de la fiche trouvée : l'API accepte les recherches approchées,
   et rendre « la première réponse » pour un SIREN saisi à une touche près aurait
   validé une association avec l'immatriculation d'une autre. */
export async function chercherParNumero(numero, { signal } = {}){
  const n = chiffresSeuls(numero);
  if (n.length !== 9 && n.length !== 14) return { etat:"numero_invalide", fiche:null };
  if (n.length === 9 && !sirenValide(n)) return { etat:"numero_invalide", fiche:null };
  if (n.length === 14 && !siretValide(n)) return { etat:"numero_invalide", fiche:null };
  const siren = n.slice(0, 9);
  const r = await chercherStructure(n, { signal, parPage: 5 });
  if (r.etat !== "ok") return { etat:r.etat, fiche:null };
  const f = r.fiches.find(x => x.siren === siren);
  return f ? { etat:"ok", fiche:f } : { etat:"introuvable", fiche:null };
}

/* Comparaison de la fiche déclarée avec le registre. Le résultat n'applique
   jamais rien tout seul : il produit un état et une liste d'écarts, qu'une
   personne lit. Une plateforme qui corrigerait d'office le nom d'une association
   d'après un registre se tromperait un jour, sans que personne ne sache quand. */
export function comparerFiche(declaree, fiche){
  if (!fiche) return { etat:"introuvable", ecarts:[] };
  if (fiche.etat === "C")
    return { etat:"fermee", ecarts:[{ champ:"état", attendu:"en activité", registre:"fermée" }] };

  const ecarts = [];
  const nomDeclare = declaree.nom_juridique || declaree.nom || "";
  const score = Math.max(recouvrement(nomDeclare, fiche.nom),
                         recouvrement(nomDeclare, fiche.nom_raison_sociale),
                         fiche.sigle ? recouvrement(nomDeclare, fiche.sigle) : 0);
  /* « Identique » se juge sur les mots utiles, pas sur la chaîne. « Association
     Refuge des Quatre Vents » et « REFUGE DES QUATRE VENTS » sont le même nom :
     l'un porte la forme juridique, l'autre non. Un verdict littéral aurait
     signalé un écart à chaque contrôle, et un écart permanent n'est plus lu. */
  let etat = score >= 0.5 ? "proche" : "different";
  if (score === 1) etat = "exact";
  if (etat !== "exact")
    ecarts.push({ champ:"dénomination", attendu:nomDeclare || "", registre:fiche.nom || "" });

  const cp = String(declaree.adresse || "").match(/\b\d{5}\b/);
  if (cp && fiche.code_postal && cp[0] !== fiche.code_postal)
    ecarts.push({ champ:"code postal", attendu:cp[0], registre:fiche.code_postal });

  if (declaree.rna && fiche.rna
      && normaliserNom(declaree.rna) !== normaliserNom(fiche.rna))
    ecarts.push({ champ:"RNA", attendu:declaree.rna, registre:fiche.rna });

  if (!fiche.est_association)
    ecarts.push({ champ:"nature", attendu:"association",
                  registre:"structure non signalée comme association" });

  return { etat, score:Math.round(score * 100) / 100, ecarts };
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
  /* La MÊME formulation que les CGV acceptées par le client. La facture disait
     « taux d'intérêt légal majoré de 10 points », les CGV « taux de
     refinancement de la BCE majoré de dix points, sans pouvoir être inférieur à
     trois fois le taux d'intérêt légal » : deux taux différents sur la mention
     obligatoire de l'article L. 441-9, l'un sur la pièce, l'autre au contrat. */
  penalites_taux: "taux de refinancement de la Banque centrale européenne en vigueur "
    + "au 1er janvier ou au 1er juillet précédant l'échéance, majoré de dix points, "
    + "sans pouvoir être inférieur à trois fois le taux d'intérêt légal",
  /* Le même taux que `TARIFS.remise_comptant`, lu là où il est décidé : deux
     constantes pour un seul escompte finissent toujours par diverger. */
  get escompte_comptant(){ return TARIFS.remise_comptant; },
  indemnite_recouvrement: 40,          // article L. 441-10 du code de commerce
  delai_paiement_jours: 30,
  conservation_ans: 10,
  /* Calendrier de la réforme, à tenir à jour. */
  reception_obligatoire_le: "2026-09-01",
  emission_pme_le: "2027-09-01"
};

/* ------------------------------------------------------------------ */
/* Ce que ça coûte                                                     */
/* ------------------------------------------------------------------ */
/* Un prix unique de 3 500 à 4 000 € ne tenait pas. Il demandait la même chose à
   une entreprise de quarante personnes qu'à une de mille cinq cents, alors que
   ce qui coûte à Riseva — comptes, affiches trimestrielles, sites à consolider,
   rapports — suit l'effectif et le nombre de sites. Résultat prévisible : trop
   cher pour les petites, et laissé sur la table chez les grandes.

   Repères de marché, relevés en août 2026 sur le segment des logiciels RSE
   français : 5 000 à 50 000 € par an selon la taille, et 3 000 à 12 000 € pour
   les outils qui visent explicitement les PME. Riseva se place en dessous : elle
   ne prétend pas être une suite de reporting CSRD, elle fait moins de choses et
   les fait entièrement. Le prix par salarié descend de 49 € pour une TPE à 7 €
   au-dessus de mille — c'est la dégressivité normale du secteur.

   Ce qui est INCLUS dans tous les cas, et qu'il ne faut pas facturer à part sous
   peine de rendre le prix illisible : tous les comptes salariés de l'effectif
   déclaré, les quatre envois d'affiches de la saison, les rapports trimestriels
   et annuel, le module de gestion RSE, l'accès du CSE en lecture, et zéro
   commission sur les dons. */
export const TARIFS = {
  devise: "EUR",
  saison_mois: 12,
  paliers: [
    { id:"tpe",  max:49,   prix:2400,  sites:1,  label:"Moins de 50 salariés" },
    { id:"pme",  max:199,  prix:4200,  sites:2,  label:"50 à 199 salariés" },
    { id:"eti",  max:499,  prix:6900,  sites:3,  label:"200 à 499 salariés" },
    { id:"ge",   max:999,  prix:9800,  sites:5,  label:"500 à 999 salariés" },
    { id:"ge2",  max:1999, prix:13800, sites:8,  label:"1 000 à 1 999 salariés" },
    { id:"ge3",  max:Infinity, prix:18500, sites:12, label:"2 000 salariés et plus",
      sur_devis:true }
  ],
  site_supplementaire: 420,
  /* Remise de lancement. Elle est plafonnée en nombre ET datée : une remise sans
     limite n'est pas une remise, c'est le prix. Elle porte sur la PREMIÈRE saison
     et sur elle seule.
     Elle ne gèle pas le tarif de la seconde, et c'est délibéré. Un gel, c'est un
     tarif garanti à l'avance : la décision du 29/07/2026, reconfirmée le
     30/07/2026 et consignée au SPEC §9, l'interdit — « ne doit réapparaître nulle
     part ». Il l'interdit pour une bonne raison : un prix promis pour une saison
     qu'on n'a pas encore vécue est une promesse faite avec l'argent de l'année
     suivante, et les affiches, elles, partent toute l'année. */
  fondateur: {
    taux: 0.10,
    places: 20,
    jusquau: "2026-12-31",
    libelle: "Tarif fondateur"
  },
  /* Trésorerie. Les affiches partent tout au long de l'année et se paient à
     l'impression, pas à la fin de la saison : l'acompte doit couvrir le premier
     envoi et l'amorçage, sinon Riseva finance ses clients. */
  acompte_taux: 0.40,
  acompte_minimum: 900,
  solde_jours: 30,
  remise_comptant: 0.03,
  envois_affiches_par_saison: 4,
  inclus: [
    "Tous les comptes salariés de l'effectif déclaré, sans facturation à l'utilisateur.",
    "Quatre envois d'affiches et de supports au cours de la saison.",
    "Les rapports trimestriels et le rapport annuel, produits et envoyés sans rien demander.",
    "La gestion RSE interne : indicateurs, registre des événements de sécurité, plan d'actions, consolidation multi-sites.",
    "La fiche de durabilité VSME : ce que Riseva sait, rangé dans les rubriques de la norme européenne volontaire, avec la liste de ce qu'elle ne couvre pas.",
    "L'accès du CSE en lecture, sur des données agrégées.",
    "Zéro commission sur les dons : Riseva n'encaisse pas."
  ],
  exclus: [
    "Le bilan carbone réglementaire et le calcul des émissions : Riseva ne collecte pas cette donnée.",
    "L'index d'égalité professionnelle et la déclaration OETH : autres périmètres, autres règles.",
    "Le document unique d'évaluation des risques : Riseva n'évalue pas les risques à la place de l'employeur.",
    "L'audit des valeurs déclarées : Riseva calcule, elle ne certifie pas."
  ]
};

export const palierPour = (effectif) =>
  TARIFS.paliers.find(p => (Number(effectif) || 0) <= p.max) || TARIFS.paliers[TARIFS.paliers.length - 1];

/* Un devis complet, calculé au même endroit pour la vitrine, la préinscription,
   le contrat et la facture. Trois formules du même prix à trois endroits, c'est
   trois prix différents au premier changement de grille. */
export function devisPour({ effectif = 0, sites = 1, fondateur = false, comptant = false } = {}){
  const p = palierPour(effectif);
  const sitesFactures = Math.max(0, (Number(sites) || 1) - p.sites);
  const base = p.prix + sitesFactures * TARIFS.site_supplementaire;
  const remiseFondateur = fondateur ? Math.round(base * TARIFS.fondateur.taux) : 0;
  const apresFondateur = base - remiseFondateur;
  const remiseComptant = comptant ? Math.round(apresFondateur * TARIFS.remise_comptant) : 0;
  const ht = apresFondateur - remiseComptant;
  const acompte = comptant ? ht
    : Math.min(ht, Math.max(TARIFS.acompte_minimum, Math.round(ht * TARIFS.acompte_taux)));
  return {
    palier: p, effectif: Number(effectif) || 0, sites: Number(sites) || 1,
    sites_inclus: p.sites, sites_factures: sitesFactures,
    base, remiseFondateur, remiseComptant, ht,
    tva: Math.round(ht * FACTURATION.tva * 100) / 100,
    ttc: Math.round(ht * (1 + FACTURATION.tva) * 100) / 100,
    acompte, solde: ht - acompte,
    /* Le prix par salarié n'est pas un tarif : c'est un repère que tout acheteur
       calcule de tête dans la seconde qui suit. Autant le donner juste. */
    par_salarie: effectif > 0 ? Math.round((ht / effectif) * 10) / 10 : null,
    sur_devis: !!p.sur_devis
  };
}

/* Les indicateurs sociaux et de sécurité que Riseva collecte par établissement.
   Chaque définition porte son unité, son mode d'agrégation et sa version : un
   rapport arrêté doit pouvoir dire avec quelle formule il a été produit, même si
   la formule change ensuite.

   Riseva *calcule*, Riseva ne *certifie* pas. Les valeurs sont déclarées par
   l'entreprise, site par site, et chaque ligne garde qui l'a saisie et qui l'a
   approuvée. */
/* ------------------------------------------------------------------ */
/* Les rubriques : des sections, et des clés qui ne bougent plus       */
/* ------------------------------------------------------------------ */
/* Un indicateur sans rubrique est un champ dans un formulaire. Un indicateur
   dans une rubrique est une ligne d'un catalogue : on peut l'activer pour une
   entreprise et pas pour une autre, le demander une période et pas la suivante,
   et en ajouter un nouveau sans toucher au code de la page qui l'affiche.

   C'est ce qui permet d'ouvrir une entreprise avec les bonnes sections dès le
   premier jour, au lieu de lui présenter un formulaire de trente champs dont
   vingt ne la concernent pas.

   La clé est le contrat. Elle est écrite une fois, en minuscules et sans
   accent, et elle ne change plus : elle sert de colonne dans les exports, de
   nom de champ dans la base, et d'en-tête dans le tableur qu'on renvoie. Un
   libellé se corrige ; une clé qui change casse deux ans d'historique.

   Ce que Riseva fait de ces chiffres, et ce qu'elle n'en fait pas. Elle les
   rassemble, elle les additionne, elle les rend. Elle ne les audite pas, elle
   ne les interprète pas, et elle ne dépose rien avec. La responsabilité de la
   valeur reste chez celui qui la saisit, exactement comme dans le tableur
   qu'elle remplace. */
export const RUBRIQUES = [
  { cle:"social",    libelle:"Effectifs et mouvements", ordre:1, defaut:true,
    aide:"Ce que la paie sait déjà. C'est le dénominateur de presque tout le reste." },
  { cle:"securite",  libelle:"Sécurité", ordre:2, defaut:true,
    aide:"Ce que le registre du site consigne déjà, période par période." },
  { cle:"formation", libelle:"Formation", ordre:3, defaut:true,
    aide:"Volume et nombre de personnes formées, toutes formations confondues." },
  { cle:"diversite", libelle:"Diversité", ordre:4, defaut:true,
    aide:"Comptages simples. Aucun index réglementaire n'est calculé ici." },
  { cle:"energie",   libelle:"Énergie et eau", ordre:5, defaut:false,
    aide:"Les relevés de vos factures. C'est la question la plus fréquente des "
         + "questionnaires clients, et celle qui traîne le plus." },
  { cle:"dechets",   libelle:"Déchets", ordre:6, defaut:false,
    aide:"Les tonnages de vos bordereaux d'enlèvement, site par site." },
  { cle:"mobilite",  libelle:"Mobilité et flotte", ordre:7, defaut:false,
    aide:"Les déplacements domicile-travail et les véhicules du site." },
  { cle:"achats",    libelle:"Achats", ordre:8, defaut:false,
    aide:"Le poids des fournisseurs proches et du secteur protégé dans vos achats." }
];

export const rubrique = (cle) => RUBRIQUES.find(r => r.cle === cle) || null;

/* Les indicateurs d'une campagne, et eux seuls. Une campagne sans liste de
   rubriques demande tout : c'est le comportement des campagnes créées avant que
   les sections existent, et il ne faut pas qu'elles se vident du jour au
   lendemain. */
export const rubriquesDe = (campagne) =>
  (campagne && Array.isArray(campagne.rubriques) && campagne.rubriques.length)
    ? campagne.rubriques
    : RUBRIQUES.map(r => r.cle);

export const saisisDe = (campagne) => {
  const r = rubriquesDe(campagne);
  return INDICATEURS.saisis.filter(d => r.includes(d.rubrique));
};

export const calculesDe = (campagne) => {
  const r = rubriquesDe(campagne);
  return INDICATEURS.calcules.filter(d => r.includes(d.rubrique));
};

/* Les rubriques dans l'ordre du catalogue, avec leurs champs : c'est la forme
   dont un formulaire a besoin, et celle d'un onglet de tableur. */
export const sectionsDe = (campagne) =>
  RUBRIQUES.filter(r => rubriquesDe(campagne).includes(r.cle))
    .map(r => ({ ...r, champs: INDICATEURS.saisis.filter(d => d.rubrique === r.cle) }));

export const INDICATEURS = {
  version: "2026.3",
  /* Chaque indicateur porte le niveau auquel il a un sens, sa source attendue, et
     s'il correspond ou non à une définition réglementaire. Sans ce dictionnaire,
     on affiche un taux au mauvais niveau avec le bon nom — et c'est là qu'un
     préventeur ou un contrôleur s'arrête. */
  saisis: [
    { cle:"effectif_fin", rubrique:"social",      libelle:"Effectif à la fin de la période",      unite:"personnes", niveau:"établissement", source:"paie ou DSN",
      aide:"En contrat au dernier jour de la période, tous contrats confondus.",
      inclut:"CDI, CDD, apprentis et contrats de professionnalisation présents au dernier jour",
      exclut:"intérimaires, stagiaires, prestataires, sous-traitants" },
    { cle:"entrees", rubrique:"social",           libelle:"Entrées",                              unite:"personnes", niveau:"établissement", source:"paie ou DSN",
      aide:"Embauches sur la période.",
      inclut:"toute embauche sur la période, y compris en CDD",
      exclut:"les mutations internes entre sites du même employeur" },
    { cle:"sorties", rubrique:"social",           libelle:"Sorties",                              unite:"personnes", niveau:"établissement", source:"paie ou DSN",
      aide:"Fins de contrat sur la période, quel qu'en soit le motif.",
      inclut:"fins de contrat, démissions, licenciements, ruptures conventionnelles, départs en retraite, décès",
      exclut:"les mutations internes entre sites du même employeur" },
    { cle:"heures_travaillees", rubrique:"social",libelle:"Heures travaillées",                   unite:"heures",    niveau:"établissement", source:"paie",
      aide:"Heures réellement travaillées, hors absences. C'est le dénominateur des taux de sécurité.",
      inclut:"heures réellement travaillées par les personnes comptées dans l'effectif",
      exclut:"congés, RTT, arrêts, formation hors poste, heures des intérimaires" },
    { cle:"at_avec_arret", rubrique:"securite",     libelle:"Accidents du travail avec arrêt",      unite:"accidents", niveau:"établissement", source:"registre HSE",
      aide:"Accidents survenus sur le lieu de travail ayant entraîné un arrêt d'au moins un jour. Ce n'est pas la notion d'« accident en premier règlement » utilisée par l'assurance maladie : les taux calculés ici sont donc des indicateurs internes.",
      inclut:"accidents survenus par le fait ou à l'occasion du travail, ayant entraîné au moins un jour d'arrêt au-delà du jour de l'accident",
      exclut:"accidents de trajet, maladies professionnelles, accidents d'intérimaires ou de prestataires" },
    { cle:"at_sans_arret", rubrique:"securite",     libelle:"Accidents du travail sans arrêt",      unite:"accidents", niveau:"établissement", source:"registre HSE",
      aide:"Accidents ayant nécessité des soins mais sans arrêt.",
      inclut:"accidents ayant nécessité des soins, sans arrêt",
      exclut:"les incidents sans soin, les presqu'accidents" },
    { cle:"at_trajet", rubrique:"securite",         libelle:"Accidents de trajet",                  unite:"accidents", niveau:"établissement", source:"registre HSE",
      aide:"Comptés à part : ils ne relèvent pas des mêmes actions de prévention.",
      inclut:"accidents survenus sur le trajet domicile-travail ou vers le lieu de restauration",
      exclut:"les déplacements professionnels, qui relèvent de l'accident du travail" },
    { cle:"jours_arret", rubrique:"securite",       libelle:"Journées perdues pour accident",       unite:"jours",     niveau:"établissement", source:"registre HSE",
      aide:"Journées calendaires d'arrêt imputables aux accidents de la période.",
      inclut:"journées calendaires d'arrêt imputables aux accidents de la période, décomptées jusqu'au dernier jour de la période",
      exclut:"les journées d'arrêt pour maladie ordinaire ou maladie professionnelle" },
    { cle:"formation_heures", rubrique:"formation",  libelle:"Heures de formation",                  unite:"heures",    niveau:"établissement", source:"plan de formation",
      aide:"Toutes formations confondues.",
      inclut:"toutes formations, internes et externes, sur et hors temps de travail",
      exclut:"l'accueil sécurité au poste et les briefings de moins d'une heure" },
    { cle:"formation_benef", rubrique:"formation",   libelle:"Salariés formés",                      unite:"personnes", niveau:"établissement", source:"plan de formation",
      aide:"Personnes distinctes ayant suivi au moins une formation.",
      inclut:"personnes distinctes ayant suivi au moins une formation sur la période",
      exclut:"les inscriptions non suivies" },
    { cle:"femmes", rubrique:"diversite",            libelle:"Femmes dans l'effectif",               unite:"personnes", niveau:"établissement", source:"paie ou DSN",
      aide:"Au dernier jour de la période.",
      inclut:"personnes déclarées de sexe féminin dans la paie, au dernier jour de la période",
      exclut:"les intérimaires et les prestataires" },
    /* ── Énergie et eau ─────────────────────────────────────────────────
       Des relevés de factures, pas des estimations. Riseva ne convertit aucun
       kilowattheure en équivalent carbone : un facteur d'émission dépend du
       contrat, de l'année et de la méthode, et le choisir à la place du client
       transformerait un relevé en affirmation. */
    { cle:"elec_kwh", rubrique:"energie", libelle:"Électricité consommée", unite:"kWh", niveau:"établissement", source:"facture du fournisseur",
      aide:"Relevé de la période, tel qu'il figure sur vos factures.",
      inclut:"la consommation du site sur la période, tous usages confondus",
      exclut:"l'électricité refacturée à un tiers occupant le même bâtiment" },
    { cle:"gaz_kwh", rubrique:"energie", libelle:"Gaz consommé", unite:"kWh", niveau:"établissement", source:"facture du fournisseur",
      aide:"En kilowattheures, tels qu'ils figurent sur la facture.",
      inclut:"le gaz de réseau et le gaz en citerne",
      exclut:"le gaz des chariots élévateurs, compté avec le carburant" },
    { cle:"carburant_l", rubrique:"energie", libelle:"Carburant acheté", unite:"litres", niveau:"établissement", source:"cartes carburant",
      aide:"Fioul de chauffage et carburant des engins et véhicules du site.",
      inclut:"fioul, gazole, essence et GPL achetés par le site",
      exclut:"le carburant des véhicules personnels des salariés" },
    { cle:"eau_m3", rubrique:"energie", libelle:"Eau consommée", unite:"m³", niveau:"établissement", source:"facture ou relevé de compteur",
      aide:"Relevé de la période.",
      inclut:"l'eau du réseau et l'eau de forage si elle est comptée",
      exclut:"l'eau de pluie récupérée et non comptée" },

    /* ── Déchets ────────────────────────────────────────────────────────
       Des tonnages de bordereaux. Riseva ne qualifie aucun déchet et ne tient
       pas le registre réglementaire : elle additionne ce que le site déclare
       avoir fait enlever. */
    { cle:"dechets_kg", rubrique:"dechets", libelle:"Déchets produits", unite:"kg", niveau:"établissement", source:"bordereaux d'enlèvement",
      aide:"Tonnage total enlevé sur la période, toutes filières confondues.",
      inclut:"tous les déchets enlevés du site sur la période",
      exclut:"les déchets d'un chantier réalisé par un tiers sur votre terrain" },
    { cle:"dechets_valorises_kg", rubrique:"dechets", libelle:"Dont partis en valorisation", unite:"kg", niveau:"établissement", source:"bordereaux d'enlèvement",
      aide:"La part du tonnage précédent partie en recyclage, réemploi ou valorisation énergétique, selon ce qu'indique votre prestataire.",
      inclut:"ce que le bordereau du prestataire déclare valorisé",
      exclut:"toute estimation faite par le site lui-même" },
    { cle:"biodechets_kg", rubrique:"dechets", libelle:"Biodéchets triés", unite:"kg", niveau:"établissement", source:"bordereaux d'enlèvement",
      aide:"Restauration collective, espaces verts, déchets alimentaires.",
      inclut:"les biodéchets faisant l'objet d'un tri à la source",
      exclut:"les biodéchets partis avec les ordures résiduelles" },

    /* ── Mobilité et flotte ─────────────────────────────────────────────
       Des comptages simples, tirés du parc et de la paie. Rien n'est estimé :
       un champ vide vaut mieux qu'un chiffre inventé, et le rapport le dit. */
    { cle:"flotte", rubrique:"mobilite", libelle:"Véhicules de la flotte du site", unite:"véhicules", niveau:"établissement", source:"parc automobile",
      aide:"Véhicules détenus ou loués par le site au dernier jour de la période.",
      inclut:"voitures, utilitaires et engins immatriculés affectés au site",
      exclut:"les véhicules personnels des salariés" },
    { cle:"flotte_electrique", rubrique:"mobilite", libelle:"Dont électriques ou hybrides rechargeables", unite:"véhicules", niveau:"établissement", source:"parc automobile",
      aide:"Sous-ensemble du chiffre précédent.",
      inclut:"les véhicules 100 % électriques et les hybrides rechargeables",
      exclut:"les hybrides non rechargeables" },
    { cle:"places_recharge", rubrique:"mobilite", libelle:"Points de recharge sur le site", unite:"points", niveau:"établissement", source:"services généraux",
      aide:"Bornes accessibles aux salariés, au dernier jour de la période.",
      inclut:"les points de charge en service",
      exclut:"les bornes installées mais non raccordées" },
    { cle:"forfait_mobilite", rubrique:"mobilite", libelle:"Salariés au forfait mobilités durables", unite:"personnes", niveau:"établissement", source:"paie",
      aide:"Personnes ayant perçu le forfait au moins une fois sur la période.",
      inclut:"les bénéficiaires effectivement payés",
      exclut:"les salariés éligibles qui n'ont rien demandé" },

    /* ── Achats ─────────────────────────────────────────────────────────
       « De proximité » est une notion que chaque entreprise définit à sa façon.
       La définition retenue est écrite à côté du chiffre et le suit dans le
       rapport : sans elle, le taux ne veut rien dire. */
    { cle:"achats_montant", rubrique:"achats", libelle:"Montant des achats du site", unite:"€", niveau:"établissement", source:"comptabilité fournisseurs",
      aide:"Achats hors taxes engagés par le site sur la période.",
      inclut:"les achats de biens et de services imputés au site",
      exclut:"les achats du siège refacturés au site" },
    { cle:"achats_locaux", rubrique:"achats", libelle:"Dont fournisseurs de proximité", unite:"€", niveau:"établissement", source:"comptabilité fournisseurs",
      aide:"Selon la définition que vous retenez, et que le rapport reprend telle quelle.",
      inclut:"les fournisseurs répondant à votre définition de la proximité",
      exclut:"tout fournisseur dont l'adresse n'a pas été vérifiée" },
    { cle:"achats_esat", rubrique:"achats", libelle:"Dont secteur du travail protégé", unite:"€", niveau:"établissement", source:"comptabilité fournisseurs",
      aide:"Achats auprès d'ESAT, d'entreprises adaptées et de travailleurs indépendants handicapés.",
      inclut:"les prestations facturées par ces structures sur la période",
      exclut:"toute déduction d'obligation d'emploi : Riseva n'en calcule aucune" },
    { cle:"fournisseurs", rubrique:"achats", libelle:"Fournisseurs actifs sur la période", unite:"fournisseurs", niveau:"établissement", source:"comptabilité fournisseurs",
      aide:"Nombre de fournisseurs distincts ayant facturé au moins une fois.",
      inclut:"les fournisseurs ayant émis au moins une facture sur la période",
      exclut:"les comptes ouverts sans mouvement" },

    { cle:"boeth", rubrique:"diversite",             libelle:"Bénéficiaires de l'obligation d'emploi présents sur le site", unite:"personnes", niveau:"établissement", source:"RH du site",
      aide:"Comptage interne, à ne pas confondre avec le taux d'emploi OETH : celui-ci se calcule une fois par an, au niveau de la société (SIREN), sur des effectifs moyens annuels Urssaf. Riseva ne le calcule pas.",
      inclut:"personnes présentes sur le site ayant déclaré une reconnaissance en cours de validité",
      exclut:"toute inférence : ce comptage repose sur des déclarations volontaires, et un salarié n'a aucune obligation de déclarer" }
  ],
  /* Ce que Riseva calcule. Aucun de ces taux ne reprend une définition
     réglementaire : ce sont des indicateurs internes, comparables à eux-mêmes
     dans le temps, et à rien d'autre. Le dire est la seule façon honnête de les
     afficher — un « taux de fréquence » qui ressemble à celui de l'assurance
     maladie sans en reprendre le numérateur est un piège pour celui qui le lit. */
  /* Une valeur absente reste absente. Écrire zéro à sa place transformerait
     « ce site n'a pas déclaré ses entrées » en « ce site n'a eu aucune entrée » :
     le taux de rotation chuterait de cent pour cent, et l'alerte d'écart se
     déclencherait sur une donnée manquante. */
  calcules: [
    { cle:"tf1", rubrique:"securite", libelle:"Fréquence interne des accidents avec arrêt",
      unite:"", niveau:"tout périmètre", reglementaire:false,
      num:"at_avec_arret", den:"heures_travaillees",
      formule:"accidents avec arrêt x 1 000 000 / heures travaillées",
      note:"Indicateur interne. Le taux de fréquence de l'assurance maladie repose sur les accidents en premier règlement : ces deux chiffres ne se comparent pas.",
      calcul: (v) => v.heures_travaillees ? (v.at_avec_arret * 1e6) / v.heures_travaillees : null },
    { cle:"tf2", rubrique:"securite", libelle:"Fréquence interne, avec et sans arrêt",
      unite:"", niveau:"tout périmètre", reglementaire:false,
      num:"at_avec_arret + at_sans_arret", den:"heures_travaillees",
      formule:"(accidents avec arrêt + sans arrêt) x 1 000 000 / heures travaillées",
      note:"Indicateur interne, utile pour suivre les presqu'accidents soignés sans arrêt.",
      calcul: (v) => v.heures_travaillees
        ? ((v.at_avec_arret + v.at_sans_arret) * 1e6) / v.heures_travaillees : null },
    { cle:"tg", rubrique:"securite", libelle:"Gravité interne",
      unite:"", niveau:"tout périmètre", reglementaire:false,
      num:"jours_arret", den:"heures_travaillees",
      formule:"journées perdues x 1 000 / heures travaillées",
      note:"Indicateur interne. Les journées perdues déclarées ici ne suivent pas forcément les règles d'imputation de l'assurance maladie.",
      calcul: (v) => v.heures_travaillees ? (v.jours_arret * 1e3) / v.heures_travaillees : null },
    { cle:"if_", rubrique:"securite", libelle:"Indice interne de fréquence",
      unite:"", niveau:"tout périmètre", reglementaire:false,
      num:"at_avec_arret", den:"effectif_fin",
      formule:"accidents avec arrêt x 1 000 / effectif",
      note:"Indicateur interne.",
      calcul: (v) => v.effectif_fin ? (v.at_avec_arret * 1e3) / v.effectif_fin : null },
    { cle:"turnover", rubrique:"social", libelle:"Rotation du personnel",
      unite:"%", niveau:"tout périmètre", reglementaire:false,
      num:"(entrees + sorties) / 2", den:"effectif_fin",
      formule:"(entrées + sorties) / 2 / effectif x 100",
      note:"Définition interne : il en existe plusieurs, celle-ci est écrite pour être refaite à la main.",
      calcul: (v) => v.effectif_fin ? ((v.entrees + v.sorties) / 2) / v.effectif_fin * 100 : null },
    { cle:"part_femmes", rubrique:"diversite", libelle:"Part des femmes dans l'effectif",
      unite:"%", niveau:"tout périmètre", reglementaire:false,
      num:"femmes", den:"effectif_fin",
      formule:"femmes / effectif x 100",
      note:"Ne préjuge en rien de l'index d'égalité professionnelle, qui obéit à d'autres règles et se calcule au niveau de l'entreprise.",
      calcul: (v) => v.effectif_fin ? (v.femmes / v.effectif_fin) * 100 : null },
    { cle:"part_valorise", rubrique:"dechets", libelle:"Part des déchets valorisés",
      unite:"%", niveau:"tout périmètre", reglementaire:false,
      num:"dechets_valorises_kg", den:"dechets_kg",
      formule:"déchets valorisés / déchets produits x 100",
      note:"Reprend la qualification du prestataire d'enlèvement, sans la vérifier.",
      calcul: (v) => v.dechets_kg ? (v.dechets_valorises_kg / v.dechets_kg) * 100 : null },
    { cle:"part_flotte_elec", rubrique:"mobilite", libelle:"Part électrique de la flotte",
      unite:"%", niveau:"tout périmètre", reglementaire:false,
      num:"flotte_electrique", den:"flotte",
      formule:"véhicules électriques ou hybrides rechargeables / flotte x 100",
      note:"Comptage de véhicules, pas de kilomètres parcourus.",
      calcul: (v) => v.flotte ? (v.flotte_electrique / v.flotte) * 100 : null },
    { cle:"part_achats_locaux", rubrique:"achats", libelle:"Part des achats de proximité",
      unite:"%", niveau:"tout périmètre", reglementaire:false,
      num:"achats_locaux", den:"achats_montant",
      formule:"achats de proximité / achats du site x 100",
      note:"Dépend entièrement de la définition de proximité retenue par l'entreprise, "
        + "qui est reprise à côté du chiffre dans le rapport.",
      calcul: (v) => v.achats_montant ? (v.achats_locaux / v.achats_montant) * 100 : null },
    { cle:"elec_par_salarie", rubrique:"energie", libelle:"Électricité par salarié",
      unite:"kWh", niveau:"tout périmètre", reglementaire:false,
      num:"elec_kwh", den:"effectif_fin",
      formule:"électricité consommée / effectif",
      note:"Rapporter à l'effectif permet de comparer deux sites de tailles différentes. "
        + "Ce ratio n'a aucun sens entre un entrepôt et un bureau.",
      calcul: (v) => v.effectif_fin ? v.elec_kwh / v.effectif_fin : null }
    /* Retiré : le « taux d'emploi de travailleurs handicapés ». Il ne se calcule
       pas en divisant les bénéficiaires d'un site par l'effectif de ce site :
       l'obligation d'emploi est annuelle, s'apprécie au niveau de la société,
       sur des effectifs moyens annuels, avec ses propres règles de décompte.
       Afficher un ratio local sous ce nom aurait été faux et se serait retrouvé
       dans un questionnaire client. */
  ],
  delai_jours: 21
};

/* Trente pour cent : le seuil au-delà duquel une variation d'un indicateur
   calculé doit être expliquée. Ce n'est pas une constante magique — c'est le
   point où, dans un jeu de données sociales, une variation cesse d'être du bruit
   et devient soit un événement, soit une erreur de saisie. En dessous, demander
   une explication à chaque campagne ferait écrire « RAS » à tout le monde, ce qui
   ne vaut pas mieux que rien. */
export const SEUIL_ECART = 0.3;

export const INDICATEURS_LIMITES = [
  "Riseva calcule à partir de valeurs déclarées par l'entreprise ; elle ne les audite pas.",
  "Aucun de ces taux ne reprend une définition réglementaire : ce sont des indicateurs internes, comparables à eux-mêmes dans le temps, et à rien d'autre.",
  "Riseva ne calcule pas le taux d'emploi de travailleurs handicapés ni l'index d'égalité professionnelle : ils obéissent à d'autres règles et à d'autres périmètres.",
  "Aucun classement entre sites sur la sécurité : un classement crée une incitation à sous-déclarer.",
  "Riseva n'identifie pas les dangers, n'évalue pas les risques et ne produit pas le document unique.",
  "Aucune donnée de santé nominative n'est collectée : ni diagnostic, ni nature de la lésion, ni identité de la victime.",
  "Riseva ne dépose rien à la place de l'entreprise : ni Egapro, ni DSN, ni déclaration Urssaf."
];

/* ------------------------------------------------------------------ */
/* Registre des événements de sécurité                                 */
/* ------------------------------------------------------------------ */
/* Ce qui coûte le plus cher dans un suivi sécurité multi-sites, ce n'est pas le
   calcul : c'est que chaque site tienne son tableau dans son coin, et qu'il
   faille tout ressaisir au siège pour obtenir un chiffre consolidé. Le registre
   renverse le sens : le site déclare ses événements un par un, au fil de l'eau,
   et les indicateurs de la période s'en déduisent — pour lui comme pour la
   société. Personne ne recopie rien.

   Ce que ce registre n'est PAS, et il faut le dire avant qu'on le prenne pour
   ça : ce n'est ni le registre des accidents bénins de l'article L. 441-4 du
   code de la sécurité sociale, ni le document unique. Les deux sont nominatifs
   ou relèvent de l'évaluation des risques, et ils restent chez l'employeur.

   Aucune donnée de santé, aucune identité. Ni nom de victime, ni siège de la
   lésion, ni diagnostic. Ce sont des données de santé au sens de l'article 9 du
   RGPD, et une plateforme qui les héberge devient responsable de quelque chose
   qu'elle n'a aucune raison de porter. Ce qu'un préventeur utilise vraiment pour
   agir — la circonstance, la zone, le type, la gravité — n'en fait pas partie. */
export const NATURES_EVENEMENT = {
  travail: { label:"Accident du travail", aide:"Survenu par le fait ou à l'occasion du travail." },
  trajet:  { label:"Accident de trajet",  aide:"Domicile-travail ou vers le lieu de restauration. Compté à part : il ne relève pas des mêmes actions de prévention." }
};

export const GRAVITES_EVENEMENT = {
  sans_soin:       { label:"Sans soin",             ordre:1, badge:"badge--info",
                     aide:"Presqu'accident ou événement sans conséquence. Ne compte dans aucun taux, mais c'est le seul indicateur qui permet d'agir avant." },
  soin_sans_arret: { label:"Soins, sans arrêt",     ordre:2, badge:"badge--attente",
                     aide:"A nécessité des soins, sans arrêt de travail." },
  avec_arret:      { label:"Avec arrêt",            ordre:3, badge:"badge--alerte",
                     aide:"A entraîné au moins un jour d'arrêt au-delà du jour de l'accident." }
};

/* Typologie volontairement courte. Une liste de quarante causes n'est jamais
   remplie correctement : les déclarants prennent la première qui ressemble, et
   le Pareto qui en sort ne veut plus rien dire. */
export const TYPES_EVENEMENT = {
  chute_plain_pied:  "Chute de plain-pied",
  chute_hauteur:     "Chute de hauteur",
  manutention:       "Manutention manuelle",
  engin:             "Engin ou chariot",
  machine:           "Machine ou outil",
  chimique:          "Produit chimique",
  thermique:         "Brûlure ou température",
  electrique:        "Électrique",
  routier:           "Routier",
  agression:         "Agression ou incivilité",
  autre:             "Autre"
};

export const ETATS_ACTION = {
  a_faire: { label:"À faire",  badge:"badge--attente" },
  en_cours:{ label:"En cours", badge:"badge--info" },
  faite:   { label:"Faite",    badge:"badge--ok" },
  abandonnee:{ label:"Abandonnée", badge:"" }
};

/* Longueur maximale des circonstances. Une limite courte n'est pas une
   contrainte de stockage : c'est ce qui empêche le champ de devenir un récit
   où finit par apparaître un prénom. */
export const MAX_CIRCONSTANCES = 300;

/* ------------------------------------------------------------------ */
/* Les supports : ce qui arrive par la poste                           */
/* ------------------------------------------------------------------ */
/* Quatre envois dans la saison. Ce n'est pas une option marketing : c'est ce
   qui fait qu'une plateforme d'engagement ne meurt pas au bout de six semaines.
   Un lien envoyé une fois par courriel se perd ; une affiche au-dessus de la
   machine à café rappelle la saison à des gens qui n'ouvrent pas leurs mails.

   Le suivi est ici parce que c'est le seul endroit où il tient : qui a reçu
   quoi, quand, et pour quel site. Sans ça, un client qui dit « on n'a rien
   reçu » a toujours raison, et Riseva n'a rien à opposer. */
export const KITS_SAISON = [
  { code:"K1", nom:"Lancement", mois:1,
    contenu:"Affiches A3 pour chaque site, cartes du lien d'inscription, une page pour le manager.",
    quoi:"lancement de la saison" },
  { code:"K2", nom:"Premier trimestre", mois:4,
    contenu:"Affiche des résultats du trimestre, avec ce que les missions ont réellement produit.",
    quoi:"relance après le premier trimestre" },
  { code:"K3", nom:"Rentrée", mois:8,
    contenu:"Affiches des besoins de la rentrée, période où les associations manquent le plus de bras.",
    quoi:"relance de rentrée" },
  { code:"K4", nom:"Clôture", mois:11,
    contenu:"Affiche du bilan de la saison, à laisser en place : c'est elle qui donne envie de recommencer.",
    quoi:"bilan de fin de saison" }
];

export const ETATS_EXPEDITION = {
  a_preparer: { label:"À préparer", badge:"badge--attente" },
  expedie:    { label:"Expédié",    badge:"badge--info" },
  recu:       { label:"Reçu",       badge:"badge--ok" }
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
  /* Durées conventionnelles, utilisées seulement tant que les heures réelles ne sont
     pas saisies. Elles servent à afficher un ordre de grandeur, jamais à justifier
     une valorisation devant un contrôle : c'est écrit à côté du chiffre. */
  heures_demi_journee: 4,
  heures_jour: 7,
  get plafond_mecenat_par_salarie(){ return this.pmss * 3; },

  /* Les millésimes des formulaires changent, et un ancien modèle peut être écarté
     en cas de contrôle. Ils vivent donc ici, pas dans le code des écrans.
     Vérifiés le 20/08/2026 sur impots.gouv.fr. */
  cerfa_particulier: "11580*05",   // 2041-RD, dons des particuliers, art. 200 du CGI
  cerfa_entreprise:  "16216*03",   // 2041-MEC-SD, dons des entreprises, art. 238 bis du CGI
  duree_max_mise_a_disposition_ans: 3   // article L. 8241-3 du code du travail
};

/* Le modèle de reçu se déduit de QUI a donné, jamais de qui saisit.
   Un don versé par un salarié sur ses propres deniers relève de l'article 200 du
   CGI et se constate au modèle 2041-RD ; un don de l'entreprise relève de
   l'article 238 bis et se constate au modèle 2041-MEC-SD. Les deux ouvrent des
   droits à deux contribuables différents, à deux taux différents.

   Se tromper de modèle n'est pas une coquille de mise en page. Un reçu au mauvais
   millésime ou au mauvais formulaire peut être écarté en contrôle, et l'article
   1740 A du CGI punit la délivrance irrégulière d'une amende égale au taux de la
   réduction en cause — la sanction retombe sur l'association qui a signé, pas sur
   l'outil qui a préparé. L'écran promet que « Riseva choisit le bon modèle selon
   l'origine du don » : cette fonction est cette promesse, et le test la tient. */
export function cerfaPour(origine){
  if (origine !== "entreprise" && origine !== "salarie")
    throw new Error("Origine de don inconnue : impossible de choisir un modèle de reçu.");
  return origine === "salarie"
    ? { numero: FISCAL.cerfa_particulier, modele: "2041-RD",
        article: "200 du CGI", donateur: "le salarié, à titre personnel" }
    : { numero: FISCAL.cerfa_entreprise, modele: "2041-MEC-SD",
        article: "238 bis du CGI", donateur: "l'entreprise" };
}

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

/* Deux libellés par état, parce que deux personnes ne lisent pas la même chose.
   « À valider » dans l'espace de l'entreprise laissait croire qu'elle avait
   quelque chose à faire, alors qu'elle attend l'association ; et « validée sans
   retour » disait exactement le contraire de la règle — personne n'a validé.
   `label` est ce que voit celui qui attend, `labelAsso` ce que voit celle qui agit. */
/* ------------------------------------------------------------------ */
/* La norme volontaire de durabilité (VSME)                           */
/* ------------------------------------------------------------------ */
/* Le problème que ça résout, et il est réel : une PME qui n'est soumise à
   aucune obligation de reporting reçoit quand même un questionnaire ESG de son
   donneur d'ordre, de sa banque ou d'un acheteur public. Chacun a le sien, et
   chacun demande la même chose autrement. La norme VSME est la réponse
   européenne à ce désordre — une grille commune, volontaire, pensée pour les
   entreprises non cotées.

   Ce que Riseva en fait, et surtout ce qu'elle n'en fait pas. Elle NE PRODUIT
   PAS un rapport VSME. Depuis que la collecte se fait par rubriques, elle a les
   consommations — électricité, gaz, carburant, eau — et les tonnages de déchets
   quand l'entreprise a demandé ces rubriques à ses sites ; elle n'a toujours ni
   les ÉMISSIONS, ni les rejets polluants, ni les écarts de rémunération. La
   distinction entre une consommation et une émission n'est pas un détail : passer
   de l'une à l'autre demande un facteur d'émission, donc un choix de méthode que
   Riseva n'a pas à faire à la place de son client. Un rapport à moitié rempli
   présenté comme complet serait pire qu'aucun rapport.

   Elle fait donc une chose utile et bornée : ranger ce qu'elle sait déjà dans les
   rubriques de la norme, et dire noir sur blanc lesquelles restent vides et où
   aller les chercher. Le client arrive au rendez-vous avec la moitié du
   questionnaire déjà remplie et la liste exacte de ce qui manque.

   Statut du texte, parce qu'il bouge : la norme est publiée comme recommandation
   (UE) 2025/1710 du 30 juillet 2025, et la Commission a mis en consultation en
   mai 2026 un projet d'acte délégué qui la reprendra. Les rubriques B1 à B11
   sont stables, le détail des points de donnée peut encore évoluer. On date donc
   la référence, et la fiche le dit. */
export const VSME = {
  reference: "Recommandation (UE) 2025/1710 du 30 juillet 2025",
  verifie_le: "2026-08-22",
  reserve: "La Commission a mis en consultation en mai 2026 un projet d'acte délégué "
    + "reprenant cette norme. Les rubriques B1 à B11 sont stables ; le détail des points "
    + "de donnée peut encore évoluer. Cette fiche est datée pour cette raison.",
  /* couvert : "oui" — Riseva a la donnée et elle est fiable ;
     "partiel" — Riseva a une partie de la rubrique, jamais toute ;
     "non"     — Riseva ne collecte pas, et le dit plutôt que de laisser un blanc. */
  sections: [
    { cle:"B1", pilier:"général", titre:"Base d'établissement",
      couvert:"partiel",
      apporte:"Le périmètre, société, établissements rattachés, effectif de référence, "
        + "et la période de collecte.",
      manque:"Le choix du module, les options retenues et les éventuelles omissions : "
        + "c'est une décision de l'entreprise, pas une donnée." },
    { cle:"B2", pilier:"général", titre:"Pratiques, politiques et actions de transition",
      couvert:"oui",
      apporte:"C'est le cœur de Riseva : les missions réalisées et confirmées, les "
        + "associations partenaires, les résultats constatés sur le terrain, le mécénat "
        + "de compétences valorisé, et le plan d'actions de sécurité avec ses échéances.",
      manque:"Rien pour cette rubrique, hors politiques formalisées que l'entreprise "
        + "seule peut décrire." },
    { cle:"B3", pilier:"environnement", titre:"Énergie et émissions de gaz à effet de serre",
      couvert:"partiel",
      indicateurs:["elec_kwh", "gaz_kwh", "carburant_l", "flotte", "flotte_electrique"],
      calcules:["elec_par_salarie", "part_flotte_elec"],
      apporte:"Les consommations relevées site par site sur la période, électricité, gaz, "
        + "carburant, et la composition de la flotte. Ce sont les chiffres de vos factures, "
        + "réunis, additionnés, et rendus avec le nombre de sites sur lequel chaque somme "
        + "porte.",
      manque:"Les ÉMISSIONS des scopes 1, 2 et 3. Une consommation n'est pas une émission : "
        + "passer de l'une à l'autre demande un facteur d'émission, donc un choix de méthode. "
        + "Riseva vous rend les kilowattheures ; elle ne les convertit pas en tonnes de CO2 à "
        + "votre place.",
      ailleurs:"Un outil de bilan carbone, ou la méthode Bilan Carbone® de l'ADEME, à qui "
        + "vous donnerez les consommations ci-dessus." },
    { cle:"B4", pilier:"environnement", titre:"Pollution de l'air, de l'eau et des sols",
      couvert:"non",
      manque:"Rejets et polluants déclarés.",
      ailleurs:"Vos déclarations réglementaires si vous êtes une installation classée." },
    { cle:"B5", pilier:"environnement", titre:"Biodiversité",
      couvert:"non",
      manque:"Sites en zone sensible, surfaces artificialisées.",
      ailleurs:"Riseva sait qu'un chantier de plantation a eu lieu et combien d'arbres "
        + "ont été mis en terre. C'est une action, pas un indicateur d'impact sur la "
        + "biodiversité : les deux ne se remplacent pas et nous ne les confondrons pas." },
    { cle:"B6", pilier:"environnement", titre:"Eau",
      couvert:"partiel",
      indicateurs:["eau_m3"],
      apporte:"La consommation relevée par établissement sur la période, telle qu'elle "
        + "figure sur vos factures.",
      manque:"La répartition par source de prélèvement, et l'exposition de vos sites au "
        + "stress hydrique.",
      ailleurs:"Vos factures pour le détail par source, et l'outil Aqueduct du World "
        + "Resources Institute pour situer vos sites." },
    { cle:"B7", pilier:"environnement",
      titre:"Utilisation des ressources, économie circulaire et déchets",
      couvert:"partiel",
      indicateurs:["dechets_kg", "dechets_valorises_kg", "biodechets_kg"],
      calcules:["part_valorise"],
      apporte:"Les tonnages relevés sur vos bordereaux d'enlèvement, site par site, avec la "
        + "part valorisée. Et les dons de matériel réemployé passés par Riseva : nature, quantité, "
        + "catégorie comptable et valeur déclarée par l'entreprise, avec l'association "
        + "qui les a reçus. C'est du réemploi documenté, opposable, et daté. La valeur "
        + "reste celle que vous déclarez : Riseva rappelle la méthode qui s'applique à "
        + "la catégorie choisie, elle ne valorise pas à la place de votre comptable.",
      manque:"Les flux de matières entrants, et la part de matière recyclée dans ce que "
        + "vous achetez.",
      ailleurs:"Vos achats et vos fiches produits pour les flux entrants." },
    { cle:"B8", pilier:"social", titre:"Effectifs, caractéristiques générales",
      couvert:"partiel",
      indicateurs:["effectif_fin", "entrees", "sorties", "femmes", "boeth"],
      manque:"La répartition par type de contrat et par pays.",
      ailleurs:"Votre DSN les contient déjà." },
    { cle:"B9", pilier:"social", titre:"Santé et sécurité au travail",
      couvert:"oui",
      indicateurs:["at_avec_arret", "at_sans_arret", "at_trajet", "jours_arret",
                   "heures_travaillees"],
      calcules:["tf1", "tf2", "tg", "if_"],
      apporte:"Les accidents déclarés site par site, consolidés au niveau de la société, "
        + "avec les taux calculés sur les heures réellement travaillées.",
      manque:"Les décès et les maladies professionnelles reconnues. Riseva ne les "
        + "collecte pas : ce sont des données de santé, et un registre de pilotage n'a "
        + "pas à en porter." },
    { cle:"B10", pilier:"social",
      titre:"Rémunération, négociation collective et formation",
      couvert:"partiel",
      indicateurs:["formation_heures", "formation_benef"],
      manque:"L'écart de rémunération entre femmes et hommes, le respect du salaire "
        + "minimum et le taux de couverture par une convention collective.",
      ailleurs:"L'index d'égalité professionnelle si vous y êtes soumis, et votre paie." },
    { cle:"B11", pilier:"gouvernance", titre:"Condamnations et amendes pour corruption",
      couvert:"non",
      manque:"Le nombre de condamnations et le montant des amendes.",
      ailleurs:"Votre direction juridique. Si la réponse est zéro, elle se déclare quand "
        + "même : une case vide et un zéro ne disent pas la même chose." }
  ]
};

export const ETATS_MISSION = {
  engagee:      { label: "Engagée",     labelAsso: "Engagée",     badge: "badge--info"   },
  a_valider:    { label: "En attente de l'association",
                                        labelAsso: "À confirmer", badge: "badge--warn"   },
  validee:      { label: "Confirmée",   labelAsso: "Confirmée",   badge: "badge--ok"     },
  validee_auto: { label: "Clôturée sans confirmation",
                  labelAsso: "Clôturée sans confirmation",        badge: "badge--neutre" },
  refusee:      { label: "Refusée",     labelAsso: "Refusée",     badge: "badge--danger" }
};

/* La date du jour, une seule fois. Elle était écrite en dur — « 2026-08-20 » — à
   quatorze endroits du moteur, et le moteur est le MÊME code en démonstration et
   en production : la liste des rapports d'un client réel restait figée au
   deuxième trimestre 2026 pour toujours, ses places fondateur expiraient un jour
   qui ne venait jamais, et le contrôle « un événement ne se déclare pas à une
   date future » aurait refusé, à partir du 21 août 2026, toute déclaration
   portant la date du jour. */
/* Minuit aujourd'hui, dans le fuseau de celui qui regarde. Pas `toISOString` :
   celle-ci convertit en UTC, et un client à Paris qui ouvre l'application à
   00 h 30 se serait vu répondre « hier ». Sur un écran qui compte des jours
   avant échéance, un jour d'écart est une erreur qu'on voit. */
const minuit = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
export const leJour = () => {
  const d = minuit();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export { minuit };

/* Le jeu de démonstration, lui, est daté : ses factures, ses signatures et ses
   annonces portent des jours précis, et une capture d'écran doit rendre deux
   fois la même image. Son ancre est ici, nommée, pour que la mise à jour du jeu
   de démonstration soit une ligne et non une chasse. */
const ANCRE_DEMO = [2026, 7, 20];
const J = (n) => { const d = new Date(...ANCRE_DEMO); d.setDate(d.getDate() + n); return d.toISOString().slice(0,10); };

/* ------------------------------------------------------------------ */
/* Jeu de démonstration                                                */
/* ------------------------------------------------------------------ */
/* Exporté pour une seule raison : la recette compare la FORME des objets du jeu
   de démonstration à celle que produisent les mappeurs de production. Deux
   moteurs qui dérivent le même écran doivent voir les mêmes champs ; une
   divergence de nom ou d'absence est un défaut qu'aucun test d'écran ne voit,
   parce que la démonstration, elle, a toujours le champ. */
export const seed = {
  /* La saison de démonstration est celle qui tourne, pas celle qu'on vend. Un
     client connecté est au milieu de son année ; le site public, lui, prend les
     préinscriptions pour la suivante. Afficher « Saison 2027 » au-dessus
     d'annonces datées d'août 2026 ne trompait personne, ça décrédibilisait tout. */
  saison: {
    id: "s2026", nom: "Saison 2026", debut: "2026-01-01", fin: "2026-12-31",
    etat: "ouverte", prix_min: 2400, prix_max: 18500, acompte: 900
  },
  /* Un groupe est le périmètre de consolidation *volontaire* du payeur. Il n'a pas
     d'existence fiscale : il ne signe rien, ne déclare rien, et surtout il ne mutualise
     aucun plafond. Ce qui signe et ce qui est imposé, c'est la société. */
  groupes: [
    /* Le classement ordinal entre sites est *désactivé par défaut*. Un rang
       fabrique un dernier, et un dernier qui n'a pas encore de référent nommé est
       puni avant d'avoir commencé. Le groupe l'active s'il le veut, en connaissance
       de cause. Par défaut, chaque site porte un statut, pas une place. */
    { id:"g1", nom:"Groupe Vaudrey", societe_mere:"e1",
      classement_sites:false, cree_le:"2025-11-14" }
  ],

  /* Un établissement est un lieu, pas une personne morale : il porte un effectif, un
     quota de comptes, un score et une accidentologie. Il ne porte ni contrat, ni
     facture, ni plafond de mécénat — ceux-là restent à la société. */
  etablissements: [
    { id:"et1", societe:"e1", nom:"Siège",           ville:"Paris",     lat:48.8566, lon:2.3522,
      siret:"90800005200005", effectif:60,  quota:60,
      referent:"Claire Fontaine", referent_mail:"claire@vaudrey-ciments.fr" },
    { id:"et2", societe:"e1", nom:"Usine",           ville:"Lyon",      lat:45.7333, lon:4.8137,
      siret:"90800005200013", effectif:110, quota:110, registre_actif:true,
      referent:"Karim Belhadj", referent_mail:"karim@vaudrey-ciments.fr" },
    { id:"et3", societe:"e1", nom:"Agence",          ville:"Marseille", lat:43.2965, lon:5.3698,
      siret:"90800005200021", effectif:40,  quota:40,
      referent:"Léa Mercier", referent_mail:"lea@vaudrey-ciments.fr" },
    { id:"et4", societe:"e9", nom:"Plateforme",      ville:"Nantes",    lat:47.2184, lon:-1.5536,
      siret:"84210044800013", effectif:45,  quota:45,
      referent:null, referent_mail:null }
  ],

  /* Le registre de l'usine de Lyon, sur les deux périodes de collecte. Il sert à
     deux choses dans la démonstration : montrer qu'on déclare un événement en
     quinze secondes, et montrer que les taux du rapport en sortent tout seuls,
     sans que le siège ait rien demandé. */
  evenements: [
    { id:"ev1", etablissement:"et2", date:J(-201), nature:"travail", gravite:"avec_arret",
      type:"manutention", zone:"Quai de chargement", jours_arret:9,
      circonstances:"Palette instable reprise à la main, effort en torsion.",
      declare_par:"u10", declare_le:J(-200), annule_le:null },
    { id:"ev2", etablissement:"et2", date:J(-168), nature:"travail", gravite:"soin_sans_arret",
      type:"machine", zone:"Ligne 2", jours_arret:0,
      circonstances:"Coupure superficielle au démontage d'un carter.",
      declare_par:"u10", declare_le:J(-168), annule_le:null },
    { id:"ev3", etablissement:"et2", date:J(-120), nature:"trajet", gravite:"avec_arret",
      type:"routier", zone:null, jours_arret:4,
      circonstances:"Collision à faible vitesse sur le trajet domicile-travail.",
      declare_par:"u10", declare_le:J(-119), annule_le:null },
    { id:"ev4", etablissement:"et2", date:J(-62), nature:"travail", gravite:"sans_soin",
      type:"chute_plain_pied", zone:"Quai de chargement", jours_arret:0,
      circonstances:"Glissade sans chute, sol humide non signalé.",
      declare_par:"u10", declare_le:J(-62), annule_le:null },
    { id:"ev5", etablissement:"et2", date:J(-41), nature:"travail", gravite:"avec_arret",
      type:"manutention", zone:"Quai de chargement", jours_arret:6,
      circonstances:"Reprise manuelle d'une charge au sol, lombalgie.",
      declare_par:"u10", declare_le:J(-40), annule_le:null },
    { id:"ev6", etablissement:"et2", date:J(-22), nature:"travail", gravite:"sans_soin",
      type:"engin", zone:"Allée centrale", jours_arret:0,
      circonstances:"Chariot arrivé trop vite dans l'angle, aucun contact.",
      declare_par:"u10", declare_le:J(-22), annule_le:null }
  ],
  /* Deux actions ouvertes, dont une en retard : c'est l'état ordinaire d'un plan
     d'actions, et un écran qui n'afficherait que des actions à jour ne servirait
     à rien. */
  actions: [
    { id:"acs1", evenement:"ev5", etablissement:"et2",
      quoi:"Installer deux tables élévatrices sur le quai de chargement.",
      responsable:"Karim Belhadj", echeance:J(-9), etat:"en_cours",
      cree_le:J(-38), fait_le:null },
    { id:"acs2", evenement:"ev4", etablissement:"et2",
      quoi:"Marquage au sol et procédure de signalement des sols humides.",
      responsable:"Karim Belhadj", echeance:J(21), etat:"a_faire",
      cree_le:J(-60), fait_le:null },
    { id:"acs3", evenement:"ev2", etablissement:"et2",
      quoi:"Consignation obligatoire avant démontage d'un carter, affichée au poste.",
      responsable:"Karim Belhadj", echeance:J(-120), etat:"faite",
      cree_le:J(-166), fait_le:J(-130) }
  ],

  entreprises: [
    { id:"e1", lat:45.7333, lon:4.8137, nom:"Vaudrey Ciments",     effectif:210, sieges:210, ca:48_000_000, cout_jour_moyen:340,
      groupe:"g1", siren:"908000052",
      referent:"Claire Fontaine", referent_mail:"claire@vaudrey-ciments.fr", siret:"90800005200005",
      domaines:["vaudrey-ciments.fr"],
      adresse:"12 rue des Docks, 69009 Lyon", secteur:"Industrie",  ville:"Lyon" },
    /* Deuxième société du même groupe : elle prouve ce que le modèle doit tenir.
       Son plafond de mécénat est le sien, sa facture est la sienne, et personne chez
       elle n'est visible depuis l'autre société — même actionnaire, autre responsable
       de traitement. */
    { id:"e9", lat:47.2184, lon:-1.5536, nom:"Vaudrey Négoce",      effectif:45,  sieges:45,  ca:6_200_000,  cout_jour_moyen:295,
      groupe:"g1", siren:"842100448", siret:"84210044800013",
      domaines:["vaudrey-negoce.fr"],
      adresse:"4 quai de la Fosse, 44000 Nantes", secteur:"Négoce", ville:"Nantes" },
    { id:"e2", lat:50.6292, lon:3.0573, nom:"Groupe Vidal",        effectif:340, sieges:350, ca:62_000_000, cout_jour_moyen:290, secteur:"Logistique", ville:"Lille" },
    { id:"e3", lat:48.8566, lon:2.3522, nom:"Cabinet Marchand",    effectif:64,  sieges:75,  ca:9_800_000,  cout_jour_moyen:520,  secteur:"Conseil",    ville:"Paris" },
    { id:"e4", lat:47.2184, lon:-1.5536, nom:"Novaterre",           effectif:120, sieges:120, ca:21_000_000, cout_jour_moyen:310, secteur:"Agro",       ville:"Nantes" ,
      logo:"data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2064%2064%27%3E%3Crect%20width%3D%2764%27%20height%3D%2764%27%20rx%3D%2712%27%20fill%3D%27%231F5C4A%27%2F%3E%3Cpath%20d%3D%27M32%2014c10%206%2014%2013%2014%2021a14%2014%200%200%201-28%200c0-8%204-15%2014-21z%27%20fill%3D%27%23DCEBA8%27%2F%3E%3Cpath%20d%3D%27M32%2020v26%27%20stroke%3D%27%231F5C4A%27%20stroke-width%3D%273%27%20stroke-linecap%3D%27round%27%2F%3E%3C%2Fsvg%3E"},
    { id:"e5", lat:43.6047, lon:1.4442, nom:"Atelier Berthier",    effectif:38,  sieges:50,  ca:3_400_000,  cout_jour_moyen:280,  secteur:"Artisanat",  ville:"Toulouse" },
    { id:"e6", lat:44.8378, lon:-0.5792, nom:"Sirius Assurances",   effectif:520, sieges:500, ca:140_000_000, cout_jour_moyen:400,  secteur:"Assurance",  ville:"Bordeaux" ,
      logo:"data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2064%2064%27%3E%3Crect%20width%3D%2764%27%20height%3D%2764%27%20rx%3D%2712%27%20fill%3D%27%232B3A6B%27%2F%3E%3Ccircle%20cx%3D%2732%27%20cy%3D%2732%27%20r%3D%2715%27%20fill%3D%27none%27%20stroke%3D%27%23F2F0E9%27%20stroke-width%3D%273%27%2F%3E%3Cpath%20d%3D%27M32%2017l4.2%2010.6L47%2032l-10.8%204.4L32%2047l-4.2-10.6L17%2032l10.8-4.4z%27%20fill%3D%27%23F2F0E9%27%2F%3E%3C%2Fsvg%3E"},
    { id:"e7", lat:48.1173, lon:-1.6778, nom:"Delmas & Fils",       effectif:87,  sieges:100, ca:12_000_000, cout_jour_moyen:300,  secteur:"BTP",        ville:"Rennes" },
    { id:"e8", lat:48.3904, lon:-4.4861, nom:"Kervella Transport",  effectif:145, sieges:150, ca:18_000_000, cout_jour_moyen:270,  secteur:"Transport",  ville:"Brest" },
    /* Il faut dépasser dix entreprises pour que le classement ait un sens, et
       la démonstration doit montrer le produit tel qu'il tourne, pas un écran
       qui explique que la cohorte est trop petite pour être classée. */
    { id:"e10", lat:45.7640, lon:4.8357, nom:"Verrerie du Rhône",  effectif:265, sieges:270, ca:39_000_000, cout_jour_moyen:295, secteur:"Industrie", ville:"Lyon" ,
      logo:"data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2064%2064%27%3E%3Crect%20width%3D%2764%27%20height%3D%2764%27%20rx%3D%2712%27%20fill%3D%27%237A4A1E%27%2F%3E%3Cpath%20d%3D%27M22%2016h20l-3%2016a7%207%200%200%201-14%200z%27%20fill%3D%27%23F2F0E9%27%2F%3E%3Cpath%20d%3D%27M32%2039v9M25%2048h14%27%20stroke%3D%27%23F2F0E9%27%20stroke-width%3D%273%27%20stroke-linecap%3D%27round%27%2F%3E%3C%2Fsvg%3E"},
    { id:"e11", lat:43.2965, lon:5.3698, nom:"Marseille Optique", effectif:64,  sieges:70,  ca:8_200_000,  cout_jour_moyen:285, secteur:"Santé",     ville:"Marseille" },
    { id:"e12", lat:49.4432, lon:1.0999, nom:"Seine Emballage",   effectif:410, sieges:420, ca:61_000_000, cout_jour_moyen:305, secteur:"Industrie", ville:"Rouen" }
  ],
  contrats: [
    { entreprise:"e1", statut:"actif", signe_le:"2025-11-14", debut:"2026-01-01", fin:"2026-12-31",
      fondateur:true, montant_ht:6210, acompte:2484, effectif_reference:210, reconduction:false,
      factures:[
        { ref:"RSV-2025-0007", libelle:"Acompte saison 2026 (40 %)", montant:2484, date:"2025-11-14",
          echeance:"2025-12-14", etat:"payee",  periode:"acompte, saison 2026" },
        { ref:"RSV-2026-0031", libelle:"Solde saison 2026",   montant:3726, date:"2026-01-05",
          echeance:"2026-02-04", etat:"payee", periode:"01/01/2026 au 31/12/2026" },
      ],
      /* Une facture d'acompte pour la saison suivante, alors que le renouvellement
         n'est pas décidé, crée une créance que rien ne fonde — et rend fausses, en
         même temps, les mentions « pas de reconduction tacite » et « reste à régler ».
         Tant que le client n'a pas accepté, il n'existe qu'une proposition. */
      devis:[
        { ref:"DEV-2026-0148", libelle:"Acompte saison 2027 (40 %)", montant:2484, date:J(-6),
          validite:J(24), periode:"acompte, saison 2027" }
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
      nom_juridique:"Association Refuge des Quatre Vents", site:"https://refuge4vents.fr",
      reseaux:[{ nom:"Facebook", url:"https://facebook.com/refuge4vents" }],
      contact_public:"bonjour@refuge4vents.fr",
      siren:"428763304", valide:true, rna:"W423001234", verifiee_le:J(-120), a_reverifier_le:J(240), suspendue:false,
      recus:{ actif:true, eligible_mecenat:true, signataire:"Élise Tournier",
              qualite:"Présidente", prochain_numero:47, prefixe:"QV-2027-" },
      iban:"FR7530003004180001234567890", bic:"BREDFRPPXXX", titulaire_compte:"Association Refuge des Quatre Vents",
      mandat_recus:{ version:"2026.1", nom:"Élise Tournier", qualite:"Présidente", accepte_le:J(-40) } },
    { id:"a2", nom:"Racines Vives", ville:"Clermont-Ferrand", cause:"Reforestation",
      resume:"Replantation de haies bocagères et de forêts mixtes sur des parcelles agricoles.",
      adresse:"3 route des Prés, 63200 Riom", lat:45.8938, lon:3.1128,
      nom_juridique:"Racines Vives, association loi 1901", site:"https://racines-vives.org",
      reseaux:[{ nom:"Instagram", url:"https://instagram.com/racinesvives" },
               { nom:"LinkedIn", url:"https://linkedin.com/company/racines-vives" }],
      contact_public:"contact@racines-vives.org",
      siren:"512291048", valide:true, rna:"W631004567", verifiee_le:J(-60), a_reverifier_le:J(300), suspendue:false,
      recus:{ actif:true, eligible_mecenat:true, signataire:"Marc Aubert",
              qualite:"Trésorier", prochain_numero:12, prefixe:"RV-2027-" },
      iban:"FR5510278073000002047260146", bic:"CMCIFR2AXXX", titulaire_compte:"Racines Vives",
      helloasso:"https://www.helloasso.com/associations/racines-vives/formulaires/1",
      mandat_recus:{ version:"2026.1", nom:"Marc Aubert", qualite:"Trésorier", accepte_le:J(-40) } },
    { id:"a3", nom:"Rivière Propre 42", ville:"Roanne", cause:"Dépollution",
      resume:"Nettoyage des berges de la Loire et sensibilisation dans les écoles.",
      adresse:"8 quai de Loire, 42300 Roanne", lat:46.0367, lon:4.0680,
      site:"", valide:true, rna:"W422009876", verifiee_le:J(-200), a_reverifier_le:J(-20), suspendue:false },
    { id:"a4", nom:"Le Panier Solidaire", ville:"Villeurbanne", cause:"Aide alimentaire",
      resume:"Distribution de 900 colis par mois et maraude hebdomadaire.",
      adresse:"22 rue Garibaldi, 69003 Lyon", lat:45.7578, lon:4.8515,
      site:"", siren:"809177421", valide:true, rna:"W691002345", verifiee_le:J(-30), a_reverifier_le:J(330), suspendue:false,
      iban:"FR9716807004050607080910111", bic:"AGRIFRPP869", titulaire_compte:"Le Panier Solidaire" },
    { id:"a5", nom:"Second Souffle", ville:"Grenoble", cause:"Réemploi",
      resume:"Reconditionnement de matériel informatique pour des familles et des écoles.",
      site:"", valide:false },
    { id:"a6", nom:"Les Jardins du Nord", ville:"Lille", cause:"Reforestation",
      resume:"Plantation de micro-forêts sur des friches industrielles de la métropole.",
      adresse:"45 rue de Wazemmes, 59000 Lille", lat:50.6292, lon:3.0573,
      site:"", valide:true, rna:"W595003311", verifiee_le:J(-90), a_reverifier_le:J(270), suspendue:false,
      recus:{ actif:true, eligible_mecenat:true, signataire:"Nadia Berger",
              qualite:"Présidente", prochain_numero:8, prefixe:"JN-2027-" },
      iban:"FR4520041010120304050607089", bic:"PSSTFRPPLIL", titulaire_compte:"Les Jardins du Nord",
      mandat_recus:{ version:"2026.1", nom:"Nadia Berger", qualite:"Présidente", accepte_le:J(-40) } },
    { id:"a7", nom:"Océan Net", ville:"Saint-Nazaire", cause:"Dépollution",
      resume:"Collectes sur le littoral atlantique et suivi des déchets ramassés.",
      adresse:"2 quai Demange, 44600 Saint-Nazaire", lat:47.2806, lon:-2.2086,
      site:"", valide:true, rna:"W442007788", verifiee_le:J(-45), a_reverifier_le:J(315), suspendue:false,
      recus:{ actif:true, eligible_mecenat:true, signataire:"Yann Le Gall",
              qualite:"Trésorier", prochain_numero:31, prefixe:"ON-2027-" },
      iban:"FR4813606000112233445566778", bic:"AGRIFRPP844", titulaire_compte:"Océan Net",
      mandat_recus:{ version:"2026.1", nom:"Yann Le Gall", qualite:"Trésorier", accepte_le:J(-40) } },
    { id:"a8", nom:"Table Ouverte", ville:"Bordeaux", cause:"Aide alimentaire",
      resume:"Repas chauds quatre soirs par semaine et épicerie solidaire étudiante.",
      adresse:"18 cours de la Marne, 33800 Bordeaux", lat:44.8378, lon:-0.5792,
      site:"", valide:true, rna:"W332001199", verifiee_le:J(-70), a_reverifier_le:J(290), suspendue:false,
      recus:{ actif:true, eligible_mecenat:true, signataire:"Hélène Ducasse",
              qualite:"Directrice", prochain_numero:64, prefixe:"TO-2027-" },
      iban:"FR4930004008230001122334455", bic:"BNPAFRPPBOR", titulaire_compte:"Table Ouverte" },
    { id:"a9", nom:"Coup de Pouce Occitanie", ville:"Toulouse", cause:"Éducation",
      resume:"Accompagnement scolaire et ateliers d'orientation en quartier prioritaire.",
      adresse:"7 allée de Bellefontaine, 31100 Toulouse", lat:43.6047, lon:1.4442,
      site:"", valide:true, rna:"W312004422", verifiee_le:J(-110), a_reverifier_le:J(250), suspendue:false,
      recus:{ actif:true, eligible_mecenat:true, signataire:"Samir Ould",
              qualite:"Président", prochain_numero:19, prefixe:"CP-2027-" } },
    { id:"a10", nom:"Rhin Vivant", ville:"Strasbourg", cause:"Biodiversité",
      resume:"Restauration de haies et de zones humides le long du Rhin.",
      adresse:"12 route de la Wantzenau, 67000 Strasbourg", lat:48.5734, lon:7.7521,
      site:"", valide:true, rna:"W672006655", verifiee_le:J(-25), a_reverifier_le:J(335), suspendue:false,
      recus:{ actif:true, eligible_mecenat:true, signataire:"Anne Schmitt",
              qualite:"Présidente", prochain_numero:5, prefixe:"RH-2027-" } },
    { id:"a11", nom:"Calanques Solidaires", ville:"Marseille", cause:"Dépollution",
      resume:"Ramassage dans les calanques et sensibilisation des scolaires du littoral.",
      adresse:"30 boulevard Michelet, 13008 Marseille", lat:43.2965, lon:5.3698,
      site:"", valide:true, rna:"W132008844", verifiee_le:J(-140), a_reverifier_le:J(220), suspendue:false,
      recus:{ actif:true, eligible_mecenat:true, signataire:"Léo Ferrand",
              qualite:"Secrétaire", prochain_numero:27, prefixe:"CS-2027-" } },
    { id:"a12", nom:"Bocage de Bretagne", ville:"Rennes", cause:"Reforestation",
      resume:"Replantation de haies bocagères avec les agriculteurs d'Ille-et-Vilaine.",
      adresse:"5 rue de Saint-Malo, 35000 Rennes", lat:48.1173, lon:-1.6778,
      site:"", valide:true, rna:"W352003377", verifiee_le:J(-55), a_reverifier_le:J(305), suspendue:false,
      recus:{ actif:true, eligible_mecenat:true, signataire:"Gwen Morvan",
              qualite:"Présidente", prochain_numero:41, prefixe:"BB-2027-" },
      iban:"FR8811315000900011223344556", bic:"CEPAFRPP351", titulaire_compte:"Bocage de Bretagne" },
    { id:"a13", nom:"Toits d'Abord", ville:"Paris", cause:"Lutte contre l'exclusion",
      resume:"Maraudes nocturnes et accompagnement vers le logement en Île-de-France.",
      adresse:"9 rue de Belleville, 75019 Paris", lat:48.8566, lon:2.3522,
      site:"", valide:true, rna:"W752009900", verifiee_le:J(-15), a_reverifier_le:J(345), suspendue:false,
      recus:{ actif:true, eligible_mecenat:true, signataire:"Paul Reynaud",
              qualite:"Directeur", prochain_numero:112, prefixe:"TA-2027-" } }
  ],
  annonces: [
    { id:"an1", asso:"a1", type:"benevolat_demi_journee", temps_travail:false,
      impact:{ unite:"animal", par_unite:7 }, titre:"Sortie de 42 animaux et entretien des box",
      description:"Nous manquons de bras le samedi matin. Six personnes suffisent pour sortir nos 42 pensionnaires, chiens et chats, et remettre les box en état.",
      quantite:6, restant:4, date:J(9), lieu:"Saint-Étienne", etat:"ouverte" },
    { id:"an2", asso:"a2", type:"benevolat_demi_journee", temps_travail:true,
      impact:{ unite:"arbre", par_unite:40 }, titre:"Plantation de 400 arbres à Beaumont",
      description:"Chantier de plantation sur une parcelle de deux hectares. Aucune compétence particulière requise, on fournit le matériel.",
      quantite:10, restant:7, date:J(16), lieu:"Beaumont (63)", etat:"ouverte" },
    { id:"an25", asso:"a1", type:"parrainage_animal",
      impact:{ unite:"animal", par_unite:1 }, titre:"Parrainer un de nos pensionnaires pour un an",
      description:"Douze de nos chiens sont là depuis plus de deux ans et ne seront probablement jamais adoptés. Un parrainage couvre leur nourriture, leurs vaccins et leurs soins courants sur douze mois. Vous recevez des nouvelles et vous pouvez venir le voir quand vous voulez.",
      quantite:12, restant:9, date:null, lieu:"Saint-Étienne", etat:"ouverte" },
    { id:"an26", asso:"a1", type:"adoption_animal",
      impact:{ unite:"animal", par_unite:1 }, titre:"Adopter un chat adulte",
      description:"Vingt-trois chats adultes attendent une famille. Ils sont identifiés, stérilisés et vaccinés. L'adoption se fait après une visite et un entretien, et nous restons joignables ensuite.",
      quantite:23, restant:18, date:null, lieu:"Saint-Étienne", etat:"ouverte" },
    { id:"an27", asso:"a9", type:"mecenat_competence", temps_travail:true,
      impact:{ unite:"eleve", par_unite:12 }, titre:"Remettre notre comptabilité à jour",
      description:"Nous cherchons quelqu'un qui sait tenir une compta associative. Deux demi-journées suffiraient à repartir sur des bases propres avant l'assemblée générale.",
      quantite:2, restant:2, date:J(21), lieu:"Toulouse", etat:"ouverte" },
    { id:"an28", asso:"a7", type:"benevolat_journee",
      impact:{ unite:"dechet_kg", par_unite:180 }, titre:"Grande collecte sur l'estran, journée entière",
      description:"Une journée complète, marée basse le matin et l'après-midi. On fournit les sacs, les gants et le repas de midi.",
      quantite:14, restant:11, date:J(30), lieu:"Saint-Nazaire", etat:"ouverte" },
    { id:"an3", asso:"a3", type:"don_materiel", impact:{ unite:"kit", par_unite:1 },
      titre:"Dix kits de terrain : waders et gants",
      description:"Nos kits sont hors d'usage. Un kit, c'est une paire de waders taille 40 à 46 et une paire de gants épais.",
      quantite:10, restant:10, date:J(24), lieu:"Roanne", etat:"ouverte" },
    { id:"an4", asso:"a4", type:"don_financier", impact:{ unite:"colis", par_unite:0.1176 },
      titre:"Financer 300 colis pour l'hiver",
      description:"Chaque colis revient à 8,50 €. La collecte d'hiver démarre en novembre.",
      quantite:2550, restant:1820, date:J(40), lieu:"Villeurbanne", etat:"ouverte" },
    { id:"an5", asso:"a1", type:"don_materiel",
      titre:"Croquettes et couvertures",
      description:"Nous acceptons les palettes de croquettes non entamées et les couvertures propres.",
      quantite:5, restant:2, date:J(30), lieu:"Saint-Étienne", etat:"ouverte" },
    { id:"an6", asso:"a2", type:"don_financier", impact:{ unite:"arbre", par_unite:0.4762 },
      titre:"Achat de 1 200 plants de charme",
      description:"Un plant coûte 2,10 € livré. Objectif : sécuriser la campagne de plantation d'automne.",
      quantite:2520, restant:2520, date:J(52), lieu:"Clermont-Ferrand", etat:"ouverte" },
    { id:"an7", asso:"a3", type:"benevolat_demi_journee", temps_travail:true,
      impact:{ unite:"metre_berge", par_unite:200 }, titre:"Nettoyage des berges, secteur amont",
      description:"Ramassage sur trois kilomètres de berges. Prévoir des bottes.",
      quantite:15, restant:0, date:J(-4), lieu:"Roanne", etat:"close" },
    { id:"an8", asso:"a6", type:"benevolat_demi_journee", temps_travail:true,
      impact:{ unite:"arbre", par_unite:125 }, titre:"Micro-forêt sur la friche de Fives",
      description:"Deux mille plants sur 600 m². On plante dense, la méthode Miyawaki. Bottes et gants fournis.",
      quantite:16, restant:11, date:J(21), lieu:"Lille", etat:"ouverte" },
    { id:"an9", asso:"a6", type:"don_financier", impact:{ unite:"arbre", par_unite:0.3509 },
      titre:"Financer la deuxième parcelle",
      description:"Un plant revient à 2,85 € livré et paillé. La parcelle voisine se libère en octobre.",
      quantite:5700, restant:4200, date:J(60), lieu:"Lille", etat:"ouverte" },
    { id:"an10", asso:"a7", type:"benevolat_demi_journee", temps_travail:false,
      impact:{ unite:"dechet_kg", par_unite:35 }, titre:"Collecte sur la plage de Saint-Marc",
      description:"Ramassage et tri par catégories, les données partent au protocole national. Prévoir un coupe-vent.",
      quantite:20, restant:14, date:J(12), lieu:"Saint-Nazaire", etat:"ouverte" },
    { id:"an11", asso:"a7", type:"don_materiel", impact:{ unite:"kit", par_unite:1 },
      titre:"Vingt-quatre kits de ramassage",
      description:"Un kit, c'est une pince et un seau gradué. Les nôtres cassent au bout de deux saisons ; nous cherchons du matériel neuf ou peu servi.",
      quantite:24, restant:24, date:J(35), lieu:"Saint-Nazaire", etat:"ouverte" },
    { id:"an12", asso:"a8", type:"benevolat_demi_journee", temps_travail:false,
      impact:{ unite:"repas", par_unite:60 }, titre:"Service du soir, cours de la Marne",
      description:"Préparation à 17 h, service à 19 h, rangement à 21 h. Six personnes par soirée.",
      quantite:24, restant:9, date:J(6), lieu:"Bordeaux", etat:"ouverte" },
    { id:"an13", asso:"a8", type:"don_financier", impact:{ unite:"repas", par_unite:0.5556 },
      titre:"Approvisionner l'épicerie solidaire",
      description:"Un repas complet revient à 1,80 € grâce aux invendus. L'hiver double la fréquentation.",
      quantite:4000, restant:2650, date:J(48), lieu:"Bordeaux", etat:"ouverte" },
    { id:"an14", asso:"a9", type:"benevolat_demi_journee", temps_travail:true,
      impact:{ unite:"eleve", par_unite:8 }, titre:"Ateliers d'orientation en troisième",
      description:"Vous racontez votre métier, vous répondez aux questions. Deux heures, deux classes.",
      quantite:14, restant:6, date:J(18), lieu:"Toulouse", etat:"ouverte" },
    { id:"an15", asso:"a9", type:"don_materiel",
      titre:"Ordinateurs portables reconditionnés",
      description:"Pour le prêt aux lycéens. Windows ou Linux, 8 Go de RAM minimum, chargeur compris.",
      quantite:30, restant:22, date:J(44), lieu:"Toulouse", etat:"ouverte" },
    { id:"an16", asso:"a10", type:"benevolat_demi_journee", temps_travail:true,
      impact:{ unite:"haie", par_unite:30 }, titre:"Plantation de haies à la Wantzenau",
      description:"Trois cents mètres de haie mixte le long d'un fossé. Terrain plat, matériel fourni.",
      quantite:10, restant:7, date:J(27), lieu:"Strasbourg", etat:"ouverte" },
    { id:"an17", asso:"a10", type:"benevolat_demi_journee", temps_travail:false,
      impact:{ unite:"metre_berge", par_unite:180 }, titre:"Entretien des berges du Rhin",
      description:"Arrachage des espèces invasives et ramassage. Une matinée, secteur nord.",
      quantite:12, restant:12, date:J(38), lieu:"Strasbourg", etat:"ouverte" },
    { id:"an18", asso:"a11", type:"benevolat_demi_journee", temps_travail:false,
      impact:{ unite:"dechet_kg", par_unite:28 }, titre:"Ramassage dans la calanque de Sormiou",
      description:"Accès à pied, trente minutes de marche. Départ 8 h pour éviter la chaleur.",
      quantite:18, restant:10, date:J(15), lieu:"Marseille", etat:"ouverte" },
    { id:"an19", asso:"a11", type:"benevolat_demi_journee", temps_travail:true,
      impact:{ unite:"eleve", par_unite:25 }, titre:"Interventions dans les écoles du littoral",
      description:"Une heure devant une classe de CM2, support fourni, formation d'une demi-journée en amont.",
      quantite:8, restant:8, date:J(50), lieu:"Marseille", etat:"ouverte" },
    { id:"an20", asso:"a12", type:"benevolat_demi_journee", temps_travail:true,
      impact:{ unite:"haie", par_unite:95 }, titre:"Chantier bocage à Pacé",
      description:"Plantation chez un agriculteur partenaire. Repas de midi offert par la ferme.",
      quantite:14, restant:4, date:J(9), lieu:"Rennes", etat:"ouverte" },
    { id:"an21", asso:"a12", type:"don_financier", impact:{ unite:"arbre", par_unite:0.41667 },
      titre:"Financer les plants d'hiver",
      description:"Un plant de bocage coûte 2,40 € avec sa protection contre les chevreuils.",
      quantite:3600, restant:3600, date:J(65), lieu:"Rennes", etat:"ouverte" },
    { id:"an22", asso:"a13", type:"benevolat_demi_journee", temps_travail:false,
      impact:{ unite:"maraude", par_unite:1 }, titre:"Maraude du jeudi soir, 19e",
      description:"Trois heures, en binôme avec un bénévole formé. Thermos et duvets fournis.",
      quantite:20, restant:13, date:J(4), lieu:"Paris", etat:"ouverte" },
    { id:"an23", asso:"a13", type:"don_materiel", impact:{ unite:"kit", par_unite:1 },
      titre:"Quatre-vingts kits grand froid",
      description:"Un kit, c'est un duvet confort -5 °C et une trousse d'hygiène. Neufs de préférence : ils partent en une semaine.",
      quantite:80, restant:56, date:J(33), lieu:"Paris", etat:"ouverte" },
    /* Une association qui a coché le temps de travail quand elle déclarait son
       éligibilité au mécénat, et qui ne la déclare plus. L'annonce reste ouverte —
       le besoin, lui, existe toujours — mais la mise à disposition ne peut plus se
       faire à son profit : hors du régime de l'article L. 8241-3, un prêt de
       main-d'œuvre gratuit redevient illicite, et c'est l'entreprise qui en répond.
       Ce cas est dans la démonstration exprès : c'est celui qu'un produit sérieux
       doit attraper, et celui qu'un produit bavard laisse passer. */
    { id:"an24", asso:"a3", type:"benevolat_demi_journee", temps_travail:true,
      impact:{ unite:"metre_berge", par_unite:180 },
      titre:"Nettoyage des berges, secteur aval",
      description:"Deux kilomètres de berges après la crue. Bottes indispensables, gants fournis.",
      quantite:12, restant:12, date:J(26), lieu:"Roanne", etat:"ouverte" }
  ],
  /* Une campagne de collecte : une période, une échéance, et un état par site.
     C'est le même mécanisme que la validation d'une mission — on demande, on
     rappelle, et si personne ne répond on clôt en le disant. */
  campagnes: [
    /* `rubriques` : les sections demandées pour cette période, et elles seules.
       Une campagne qui présente les trente-sept champs du catalogue à un
       référent de site qui n'en concerne que douze ne reçoit pas douze réponses,
       elle n'en reçoit aucune. */
    { id:"c1", groupe:"g1", periode:"2026-S1", libelle:"Premier semestre 2026",
      rubriques:["social","securite","formation","diversite"],
      debut:"2026-01-01", fin:"2026-06-30", ouverte_le:J(-40), echeance:J(-19), etat:"close" },
    /* Une campagne de point d'étape, dont la période est réellement terminée : on
       ne demande pas le second semestre au mois d'août. */
    { id:"c2", groupe:"g1", periode:"2026-T3", libelle:"Point au 31 juillet 2026",
      rubriques:["social","securite","formation","diversite","energie","dechets"],
      debut:"2026-07-01", fin:"2026-07-31", ouverte_le:J(-6), echeance:J(15), etat:"ouverte" }
  ],
  /* Une observation = une valeur, pour un site, une période, un indicateur.
     Elle porte qui l'a saisie, qui l'a approuvée, et son état. Une valeur approuvée
     ne se modifie pas en silence : elle se corrige avec une nouvelle version. */
  observations: [
    { id:"o1", campagne:"c1", etablissement:"et1", etat:"approuve", version:1,
      saisi_par:"u13", saisi_le:J(-34), approuve_par:"u2", approuve_le:J(-31),
      valeurs:{ effectif_fin:60, entrees:4, sorties:3, heures_travaillees:52_400,
                at_avec_arret:1, at_sans_arret:2, at_trajet:1, jours_arret:14,
                formation_heures:640, formation_benef:38, femmes:31, boeth:3 } },
    { id:"o2", campagne:"c1", etablissement:"et2", etat:"approuve", version:1,
      saisi_par:"u10", saisi_le:J(-33), approuve_par:"u2", approuve_le:J(-30),
      valeurs:{ effectif_fin:110, entrees:9, sorties:11, heures_travaillees:96_800,
                at_avec_arret:4, at_sans_arret:6, at_trajet:2, jours_arret:96,
                formation_heures:1_480, formation_benef:71, femmes:24, boeth:7 } },
    { id:"o3", campagne:"c1", etablissement:"et3", etat:"approuve", version:1,
      saisi_par:"u11", saisi_le:J(-30), approuve_par:"u2", approuve_le:J(-28),
      valeurs:{ effectif_fin:40, entrees:2, sorties:2, heures_travaillees:34_900,
                at_avec_arret:0, at_sans_arret:1, at_trajet:0, jours_arret:0,
                formation_heures:220, formation_benef:14, femmes:19, boeth:1 } },
    /* Nantes n'a jamais répondu à la première campagne. On ne comble pas le trou :
       la période est close sans réponse, et le rapport le dira. */
    { id:"o4", campagne:"c1", etablissement:"et4", etat:"clos_sans_reponse", version:1,
      saisi_par:null, saisi_le:null, approuve_par:null, approuve_le:null, valeurs:{} },

    { id:"o5", campagne:"c2", etablissement:"et1", etat:"declare", version:1,
      saisi_par:"u2",  saisi_le:J(-3), approuve_par:null, approuve_le:null,
      valeurs:{ effectif_fin:61, entrees:3, sorties:2, heures_travaillees:49_100,
                at_avec_arret:0, at_sans_arret:1, at_trajet:0, jours_arret:0,
                formation_heures:410, formation_benef:26, femmes:32, boeth:3 } },
    { id:"o6", campagne:"c2", etablissement:"et2", etat:"declare", version:1,
      saisi_par:"u10", saisi_le:J(-2), approuve_par:null, approuve_le:null,
      valeurs:{ effectif_fin:112, entrees:7, sorties:5, heures_travaillees:94_200,
                at_avec_arret:2, at_sans_arret:4, at_trajet:1, jours_arret:38,
                formation_heures:960, formation_benef:52, femmes:26, boeth:8 } }
  ],
  missions: [
    { id:"m1", annonce:"an1", entreprise:"e1", salarie:"u3", etablissement:"et2", etat:"validee",     quantite:2, points:300,  date:J(-12), declaree_le:J(-11), tranchee_le:J(-10), realise:22 },
    { id:"m2", annonce:"an2", entreprise:"e1", salarie:"u4", etablissement:"et3", etat:"validee",     quantite:3, points:450,  date:J(-9), declaree_le:J(-8), tranchee_le:J(-7), realise:118,
      consentement:{ donne_le:J(-14), mission:"Atelier réparation vélos", date_mission:J(-9) } },
    { id:"m3", annonce:"an4", entreprise:"e1", salarie:"u3", etablissement:"et2", etat:"validee",     quantite:600, points:60, date:J(-7), declaree_le:J(-7), tranchee_le:J(-6), realise:68 },
    { id:"m4", annonce:"an5", entreprise:"e1", salarie:"u5", etablissement:"et1", etat:"a_valider",   quantite:3, points:300,  date:J(-2), declaree_le:J(-2), valeur_declaree:840, nature:"Trois ordinateurs portables renouvelés",
      categorie_comptable:"immobilisation", reference_actif:"IMMO-2023-0412 à 0414",
      sortie_le:J(-2), effacement_donnees:true,
      justificatif:"Fiche de sortie d'immobilisation signée" },
    { id:"m5", annonce:"an1", entreprise:"e1", salarie:"u4", etablissement:"et3", etat:"engagee",     quantite:2, points:300,  date:J(9)  },
    { id:"m6", annonce:"an7", entreprise:"e1", salarie:"u5", etablissement:"et1", etat:"validee_auto",quantite:1, points:150,  date:J(-4), declaree_le:J(-20), tranchee_le:J(-6),
      consentement:{ donne_le:J(-25), mission:"Distribution de repas", date_mission:J(-4) } },
    { id:"m7", annonce:"an3", entreprise:"e1", salarie:"u3", etablissement:"et2", etat:"refusee",     quantite:1, points:0,    date:J(-6) },
    { id:"m8", annonce:"an2", entreprise:"e2", salarie:"u9", etat:"validee",     quantite:4, points:600,  date:J(-5), declaree_le:J(-4), tranchee_le:J(-3), realise:155 },
    /* Un don de matériel confirmé mais pas encore valorisé : le registre doit le
       montrer comme tel, pas lui inventer une valeur. */
    { id:"m9", annonce:"an3", entreprise:"e1", salarie:"u4", etablissement:"et3", etat:"validee",
      quantite:2, points:200, date:J(-16), declaree_le:J(-15), tranchee_le:J(-14), realise:2,
      nature:"Deux lots de mobilier de bureau" },
    /* Une mise à disposition sur le temps de travail que l'association n'a jamais
       confirmée : au bout de quatorze jours, elle s'est comptée toute seule. Les
       points sont acquis — l'équipe a bien été là — mais la valorisation fiscale ne
       l'est pas : l'article 238 bis valorise ce qui a été fait, et personne ne l'a
       constaté. C'est le cas que la démonstration doit montrer, pas cacher. */
    { id:"m10", annonce:"an2", entreprise:"e1", salarie:"u3", etablissement:"et2",
      etat:"validee_auto", quantite:2, points:300, date:J(-24), declaree_le:J(-22),
      tranchee_le:J(-8),
      consentement:{ donne_le:J(-30), mission:"Plantation de 400 arbres", date_mission:J(-24) } }
  ],
  utilisateurs: [
    { id:"u1", nom:"Yacine Bounoua",  email:"contact@riseva.fr",        role:"admin",            org:null },
    /* Claire est salariée de la société mère et pilote le groupe : deux périmètres,
       un seul compte. `groupe` ouvre la consolidation, `org` reste sa société — elle
       ne devient pas administratrice des autres sociétés pour autant. */
    { id:"u2", nom:"Claire Fontaine", email:"claire@vaudrey-ciments.fr",role:"entreprise_admin", org:"e1", etablissement:"et1", groupe:"g1", actif:true, cree_le:J(-300) },
    { id:"u3", nom:"Malik Ferhat",    email:"malik@vaudrey-ciments.fr", role:"salarie",          org:"e1", etablissement:"et2", actif:true, cree_le:J(-280) },
    { id:"u4", nom:"Sonia Delaunay",  email:"sonia@vaudrey-ciments.fr", role:"salarie",          org:"e1", etablissement:"et3", actif:true, visible_pairs:true, cree_le:J(-275) },
    { id:"u5", nom:"Hugo Vasseur",    email:"hugo@vaudrey-ciments.fr",  role:"salarie",          org:"e1", etablissement:"et1", actif:true, visible_pairs:true, cree_le:J(-190) },
    { id:"u6", nom:"Nadia Berrada",   email:"nadia@vaudrey-ciments.fr", role:"salarie",          org:"e1", etablissement:"et3", actif:false, cree_le:J(-150) },
    /* Les référents de site : ils invitent leurs propres salariés, dans la limite du
       quota que le groupe leur a alloué, et ne voient rien des autres sites. */
    /* Le siège a son propre référent, comme les deux autres sites. Sans lui, la
       saisie du siège était faite ET approuvée par la même personne dans le jeu
       de démonstration — exactement ce que la règle interdit, et exactement ce
       que la page de vente affirme impossible. Une donnée d'exemple qui
       contredit la règle qu'elle illustre décrédibilise les deux. */
    { id:"u13", nom:"Yann Prigent",   email:"yann@vaudrey-ciments.fr",  role:"site_referent",    org:"e1", etablissement:"et1", actif:true, cree_le:J(-110) },
    { id:"u10", nom:"Karim Belhadj",  email:"karim@vaudrey-ciments.fr", role:"site_referent",    org:"e1", etablissement:"et2", actif:true, cree_le:J(-100) },
    { id:"u11", nom:"Léa Mercier",    email:"lea@vaudrey-ciments.fr",   role:"site_referent",    org:"e1", etablissement:"et3", actif:true, cree_le:J(-80) },
    { id:"u7", nom:"Élise Tournier",  email:"elise@quatrevents.org",    role:"association",      org:"a1", cree_le:J(-260) },
    { id:"u9", nom:"Paul Girard",     email:"paul@groupe-vidal.fr",     role:"salarie",          org:"e2", actif:true, cree_le:J(-120) },
    { id:"u12", nom:"Farid Amrani",   email:"cse@vaudrey-ciments.fr",   role:"cse",              org:"e1", actif:true, cree_le:J(-60) }
  ],
  signalements: [],
  /* Les zones signalées : un site dont l'offre associative est trop faible, et
     que Riseva doit aller travailler. C'est le seul endroit du produit où le
     client nous donne du travail plutôt que l'inverse. */
  sourcing: [],
  acces: [
    { id:"ac1", entreprise:"e1", utilisateur:"u3", quoi:"inscription", code:"VAUDREY-7QK2", date:J(-28) },
    { id:"ac2", entreprise:"e1", utilisateur:"u4", quoi:"inscription", code:"VAUDREY-7QK2", date:J(-27) },
    { id:"ac3", entreprise:"e1", utilisateur:"u5", quoi:"inscription", code:"VAUDREY-7QK2", date:J(-25) },
    { id:"ac4", entreprise:"e1", utilisateur:"u2", quoi:"creation_lien", code:"VAUDREY-7QK2", date:J(-30) }
  ],
  invitations: [
    { id:"i1", entreprise:"e1", code:"VAUDREY-7QK2", places:210, utilisees:4,
      active:true, cree_le:J(-30), expire_le:J(120) }
  ],
  preinscriptions: [
    { id:"p1", entreprise:"Groupe Vidal",     contact:"m.vidal@groupe-vidal.fr", effectif:340, etat:"confirmee",   date:J(-21) },
    { id:"p2", entreprise:"Cabinet Marchand", contact:"rh@cabinet-marchand.fr",  effectif:64,  etat:"preinscrite", date:J(-14) },
    { id:"p3", entreprise:"Novaterre",        contact:"rse@novaterre.fr",        effectif:120, etat:"preinscrite", date:J(-6) },
    { id:"p4", entreprise:"Sirius Assurances",contact:"contact@sirius-a.fr",     effectif:520, etat:"relancee",    date:J(-3) }
  ],
  controles: [],
  intentions: [],
  envois: [],
  expeditions: [],
  rapports_generes: [],
  moteur_journal: [],
  /* Les reçus réellement émis. Le récapitulatif annuel les comptait jusqu'ici à
     partir des missions financières validées, ce qui est un autre nombre : une
     association dont les réglages sont incomplets a des dons confirmés et zéro
     reçu, et c'est le nombre de REÇUS que l'article 222 bis lui demande de
     déclarer. */
  recus_emis: [],
  classement_recalcule_le: null
};

/* ------------------------------------------------------------------ */
/* Le passé du réseau                                                  */
/* ------------------------------------------------------------------ */
/* « Tous ensemble » additionne ce que toutes les entreprises ont fait. Pour que
   ce total veuille dire quelque chose, il faut qu'il y ait quelque chose à
   additionner : des missions réelles, rattachées à de vraies annonces, donc à de
   vraies unités d'impact, avec de vraies dates. On les engendre une seule fois,
   de façon déterministe — même graine, même histoire, à chaque chargement — puis
   elles vivent dans l'état comme les autres. Rien n'est écrit en dur : les
   chiffres du réseau sortent du même code que ceux d'une entreprise.
   L'entreprise de démonstration (e1) est laissée intacte : son tableau de bord
   doit rester lisible et reproductible. */
function alea(graine){
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PRENOMS = ["Camille","Malik","Sofia","Thomas","Awa","Julien","Nadia","Pierre",
  "Léa","Hugo","Fatou","Antoine","Manon","Karim","Élodie","Marc","Inès","Bastien",
  "Chloé","Youssef","Sarah","Nicolas","Aline","Rémi","Jeanne","Idris"];
const NOMS = ["Perrin","Bouchard","Nguyen","Lefèvre","Diallo","Roussel","Barbier",
  "Meunier","Chauvin","Sanchez","Bertrand","Faure","Colin","Traoré","Guerin",
  "Marchal","Petit","Renaud","Leclerc","Vasseur"];

function engendrerReseau(base){
  const r = alea(20260821);
  const jour = (n) => {
    const d = minuit();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };
  const slug = (nom) => nom.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const supports = base.annonces.slice();
  if (!supports.length) return;

  /* Le groupe du client de démonstration reste piloté par le jeu de départ : on ne
     lui invente pas d'activité, sinon la vue groupe montrerait une société qui
     tourne alors qu'elle n'a rien fait. Une société sans mission, ça arrive, et
     c'est justement ce qu'une vue de groupe doit rendre visible. */
  base.entreprises.filter(e => !["e1", "e9"].includes(e.id)).forEach(e => {
    const domaine = slug(e.nom) + ".fr";
    const equipe = [];
    const taille = Math.max(3, Math.min(14, Math.round(e.effectif / 28) + 2));
    for (let i = 0; i < taille; i++){
      const prenom = PRENOMS[Math.floor(r() * PRENOMS.length)];
      const nom = NOMS[Math.floor(r() * NOMS.length)];
      const id = `u-${e.id}-${i + 1}`;
      const lieu = base.etablissements.filter(x => x.societe === e.id);
      base.utilisateurs.push({
        id, nom: `${prenom} ${nom}`, role: "salarie", org: e.id, reseau: true,
        etablissement: lieu.length ? lieu[i % lieu.length].id : null,
        email: `${slug(prenom)}.${slug(nom)}${i}@${domaine}`
      });
      equipe.push(id);
    }
    const combien = 10 + Math.floor(r() * 26);
    for (let k = 0; k < combien; k++){
      const a = supports[Math.floor(r() * supports.length)];
      const bareme = (BAREME[a.type] || {}).points || 0;
      const quantite = estArgent(a.type)
        ? (2 + Math.floor(r() * 24)) * 10
        : 1 + Math.floor(r() * 3);
      const repond = r() > 0.12;             /* la plupart des associations répondent */
      const date = jour(14 + Math.floor(r() * 500));
      const mission = {
        id: `m-${e.id}-${k + 1}`,
        annonce: a.id, entreprise: e.id, salarie: equipe[Math.floor(r() * equipe.length)],
        etat: repond ? "validee" : "validee_auto",
        quantite,
        points: estArgent(a.type)
          ? Math.floor((quantite / 10) * bareme)
          : quantite * bareme,
        date, declaree_le: date, tranchee_le: date, reseau: true
      };
      /* Quand elle répond, elle donne son chiffre, et il n'est jamais pile celui
         annoncé : c'est le terrain qui compte, pas la brochure. */
      if (repond && a.impact && a.impact.unite){
        const attendu = Math.round(quantite * (a.impact.par_unite || 0));
        mission.realise = Math.max(0, Math.round(attendu * (0.82 + r() * 0.3)));
      }
      base.missions.push(mission);
    }
  });
}
engendrerReseau(seed);

/* ------------------------------------------------------------------ */
/* Implémentation mock                                                 */
/* ------------------------------------------------------------------ */
const clone = (o) => JSON.parse(JSON.stringify(o));

/* Persistance. La démonstration se comporte comme le produit : tout ce qui est fait
   est enregistré, et retrouvé au retour. Une clé de version évite de restaurer un
   état écrit par une version antérieure du modèle. */
const CLE_ETAT = "riseva.etat";
/* La base vierge se garde a part. Deux etats sous la meme cle, c'est le premier
   rechargement qui ecrase l'autre : on visite une installation neuve, on revient
   a la demonstration, et les deux cent vingt-trois missions ont disparu. */
const CLE_VIERGE = "riseva.etat.vierge";
const VERSION_ETAT = 8;

function lireEtat(cle = CLE_ETAT){
  try {
    const brut = localStorage.getItem(cle);
    if (!brut) return null;
    const o = JSON.parse(brut);
    if (!o || o.version !== VERSION_ETAT) return null;
    return o;
  } catch { return null; }
}

/* Le moteur de dérivation, sur un état en mémoire.

   Il sert deux fois, exprès. En démonstration, l'état vient du jeu de départ et
   se persiste dans le navigateur. En production, l'état vient de Postgres — filtré
   par la RLS, donc réduit à ce que l'appelant a le droit de voir — et ne se
   persiste nulle part : les écritures passent par des RPC.

   Le point qui compte : **le calcul est le même code dans les deux cas**. Un score,
   un plafond, un taux de fréquence ne peuvent pas diverger entre ce qu'on montre en
   démonstration et ce qu'on facture. Dupliquer ces formules dans une couche
   « vraie » aurait garanti qu'elles finissent par ne plus dire la même chose. */
function creerMoteur({ etat = null, persister = true, mode = "demo",
                       cle = CLE_ETAT } = {}){
  const sauvegarde = persister ? lireEtat(cle) : null;
  const s = etat ? etat : (sauvegarde ? sauvegarde.etat : clone(seed));
  /* Un état enregistré avant l'existence du registre des reçus n'a pas ce
     tableau : sans cette ligne, le premier don confirmé après mise à jour
     casserait l'écran au lieu d'émettre un reçu. */
  if (!Array.isArray(s.recus_emis)) s.recus_emis = [];
  if (sauvegarde && sauvegarde.bareme)
    Object.entries(sauvegarde.bareme).forEach(([k, v]) => { if (BAREME[k]) BAREME[k].points = v; });
  let seq = sauvegarde ? sauvegarde.seq : 100;
  const id = (p) => p + (++seq);

  let minuteur = null;
  const ecrire = () => {
    if (!persister) return;
    try {
      localStorage.setItem(cle, JSON.stringify({
        version: VERSION_ETAT, seq, etat: s,
        bareme: Object.fromEntries(Object.entries(BAREME).map(([k, v]) => [k, v.points])),
        enregistre_le: new Date().toISOString()
      }));
    } catch { /* navigation privée, quota plein : la démo continue sans mémoire */ }
  };
  const planifier = () => { clearTimeout(minuteur); minuteur = setTimeout(ecrire, 120); };

  const api = {
    mode,
    etat: () => s,
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
    /* Le lien de l'entreprise, celui qu'on met sur l'affiche et dans le mail
       interne. Il n'y en a qu'un, et ce n'est NI celui d'un referent NI celui
       du CSE : ces deux-la sont nominatifs et n'ont qu'une place.
       Ce qui se passait sans ce filtre : l'admin nommait un referent, la
       creation mettait son invitation en tete de liste, et l'ecran « Equipe »
       affichait desormais ce code-la comme « le lien a diffuser en interne ».
       L'admin l'envoyait a cent vingt salaries, une seule place, verrouillee
       sur l'adresse du referent : personne ne pouvait s'inscrire, et le vrai
       lien n'etait plus affiche nulle part. */
    invitationActive: (eid) => s.invitations.find(
      i => i.entreprise === eid && i.active && !i.pour_referent && !i.pour_cse) || null,
    invitationParCode: (code) => s.invitations.find(i =>
      i.code.toUpperCase() === String(code || "").trim().toUpperCase()) || null,
    /* Douze dernières semaines, en points bruts, comptées dans les missions.
       C'étaient douze nombres écrits à la main : une courbe qui monte joliment
       et ne dit rien. Une courbe qui ne vient pas des données n'est pas un
       graphique, c'est une illustration. */
    semaines(eid = null, { combien = 12, aujourdhui = minuit() } = {}){
      const seaux = new Array(combien).fill(0);
      s.missions.forEach(m => {
        if (eid && m.entreprise !== eid) return;
        if (!["validee", "validee_auto"].includes(m.etat)) return;
        /* Un don personnel n'entre pas dans les points de l'entreprise
           (`pointsDe` l'exclut) : l'inclure ici faisait monter la courbe sans
           que le score bouge, et l'ecart entre les deux se lisait a l'euro
           pres. Une courbe qui ne mesure pas ce que mesure le score au-dessus
           d'elle est pire qu'une absence de courbe. */
        if (api.estDonPersonnel(m)) return;
        const jours = Math.floor((aujourdhui - new Date(m.date)) / 864e5);
        if (jours < 0) return;
        const semaine = Math.floor(jours / 7);
        if (semaine >= combien) return;
        seaux[combien - 1 - semaine] += Number(m.points) || 0;
      });
      return seaux;
    },

    /* Les quatre trimestres de la saison, cumulés. Même règle : ça se compte. */
    trimestres(eid = null){
      const debut = new Date(s.saison.debut), fin = new Date(s.saison.fin);
      const bornes = [0, 1, 2, 3].map(i => {
        const d = new Date(debut);
        d.setMonth(debut.getMonth() + i * 3);
        return d;
      });
      const noms = ["T1", "T2", "T3", "T4"];
      const total = [0, 0, 0, 0];
      s.missions.forEach(m => {
        if (eid && m.entreprise !== eid) return;
        if (!["validee", "validee_auto"].includes(m.etat)) return;
        if (api.estDonPersonnel(m)) return;   /* meme raison que dans `semaines` */
        const d = new Date(m.date);
        if (d < debut || d > fin) return;
        let i = 3;
        while (i > 0 && d < bornes[i]) i--;
        total[i] += Number(m.points) || 0;
      });
      return noms.map((nom, i) => ({ nom, points: total[i] }));
    },

    /* Une annonce n'existe pour personne tant que son association n'est pas
       verifiee. L'annuaire filtrait deja sur `valide` ; le catalogue des
       annonces, lui, ne filtrait rien, et c'etait la porte de derriere : une
       structure inscrite depuis dix minutes, dont le dossier attend encore la
       verification, publiait une annonce, des salaries s'y engageaient, et
       leurs missions etaient validees avec des points credites. Toute la
       promesse de moderation tenait a une page qui ne la faisait pas
       respecter.
       `toutes` sert aux ecrans de l'association elle-meme et de Riseva, qui
       doivent voir ce qui n'est pas encore visible pour les autres. */
    annonces: (filtre = {}) => s.annonces.filter(a =>
      (filtre.toutes || (api.association(a.asso) || {}).valide) &&
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
    /* Le dénominateur du classement : l'effectif figé au contrat, pas celui que
       le client déclare dans ses paramètres. Sinon il suffit de se déclarer
       trois salariés pour rafler le classement normalisé — c'est déjà la règle
       en base (`abonnement.effectif_reference`), elle manquait ici. */
    effectifReference(eid){
      const c = api.contrat(eid) || {};
      const e = api.entreprise(eid) || {};
      return Math.max(1, c.effectif_reference ?? e.effectif ?? 1);
    },

    pointsDe(eid){
      /* Les dons personnels ne sont pas des points de l'entreprise. Ils
         entraient ici alors que la couche Postgres les excluait : deux scores
         pour la même entreprise le même jour — et, par différence avec ce que
         l'employeur a le droit de voir salarié par salarié, exactement le total
         que le seuil d'agrégation est censé rendre inaccessible. */
      const ms = api.missions({ entreprise: eid })
                   .filter(m => (m.etat === "validee" || m.etat === "validee_auto")
                                && !api.estDonPersonnel(m));
      const parType = {};
      ms.forEach(m => {
        const a = api.annonceDe(m); if (!a) return;
        parType[a.type] = (parType[a.type] || 0) + m.points;
      });
      const brut = Object.values(parType).reduce((x, y) => x + y, 0);

      /* Le plafond porte sur le total RETENU, pas sur le brut. Écrire
         `min(v, brut / 2)` laisse passer un score où un format pèse 82 % :
         il suffit qu'il domine assez pour que la moitié du brut reste
         au-dessus des autres. La forme juste est `min(v, brut - v)` — la
         part d'un format ne peut pas dépasser la somme de toutes les autres,
         ce qui revient exactement à la moitié du retenu. */
      const retenuParType = {};
      let retenu = 0, ecrete = 0;
      Object.entries(parType).forEach(([k, v]) => {
        const r = Math.max(0, Math.min(v, brut - v));
        retenuParType[k] = r; retenu += r; ecrete += v - r;
      });
      const plafond = Math.round(retenu * PLAFOND_PAR_FORMAT);
      return { brut, retenu, ecrete, parType, retenuParType, plafond };
    },

    /* Classement. Deux lectures :
       - normalisé (par défaut) : points retenus rapportés au nombre de salariés,
         ce qui met une PME et un grand groupe sur le même plan ;
       - brut : le total, gardé comme lecture secondaire. */
    classement({ mode = "normalise", categorie = null, pour = null } = {}){
      /* En production, la cohorte vient de la base. Le moteur ne voit que les
         sociétés que la RLS lui ouvre — la sienne, et celles de son groupe —, ce
         qui donnait un classement d'une seule ligne chez tout client réel. La
         base, elle, voit tout le réseau et applique déjà les règles de nommage :
         moitié haute, ex æquo à cheval sur la médiane, totaux à null sur une
         ligne anonyme. On ne recalcule donc rien ici, on met en forme. */
      if (Array.isArray(s.classement_public) && s.classement_public.length){
        /* La base rend « TPE », « PME », « ETI », « GE » ; les identifiants du
           moteur sont en minuscules. Les bornes, elles, sont les mêmes des deux
           côtés — c'est écrit dans `classement_saison`. */
        let l = s.classement_public.map(r => {
          const cat = CATEGORIES.find(c => c.id === String(r.categorie || "").toLowerCase())
                      || CATEGORIES[0];
          const e = r.id ? api.entreprise(r.id) : null;
          const sal = r.id ? api.salaries(r.id).filter(u => !u.anonyme) : [];
          const engages = sal.filter(u => api.pointsVisiblesEmployeur(u.id) > 0).length;
          const anonyme = r.anonyme && r.id !== pour;
          return {
            ...(e || {}), id: r.id, nom: r.nom, logo: anonyme ? null : (r.logo || (e || {}).logo || null),
            categorie: cat, rang: r.rang, cohorte: r.cohorte, anonyme,
            points: anonyme ? null : r.points, brut: anonyme ? null : r.brut,
            ecrete: anonyme || r.brut === null || r.points === null ? null : r.brut - r.points,
            parSalarie: anonyme ? null : r.parSalarie,
            effectif: anonyme ? null : r.effectif,
            /* Participation et activation ne se calculent que pour soi : elles
               demandent la liste des salariés, que personne n'a sur une autre
               société — et n'a pas à avoir. */
            participation: anonyme || !r.id || !r.effectif ? null
              : Math.round((engages / r.effectif) * 1000) / 10,
            activation: anonyme || !sal.length ? null
              : Math.round((engages / sal.length) * 100),
            engages: r.id ? engages : null, inscrits: r.id ? sal.length : null,
            nomAffiche: anonyme ? `Entreprise, ${cat.label.toLowerCase()}` : r.nom
          };
        });
        if (categorie) l = l.filter(x => x.categorie.id === categorie);
        const mediane = Math.ceil(l.length / 2);
        return l.sort((a, b) => a.rang - b.rang).map(x => ({ ...x, mediane }));
      }
      let l = clone(s.entreprises).map(e => {
        const p = api.pointsDe(e.id);
        const sal = api.salaries(e.id).filter(u => !u.anonyme);
        /* Un salarié « engagé » est un salarié dont une mission a été validée.
           Aucun compteur dénormalisé : le chiffre se relit dans les missions,
           sinon un total oublié survit à la correction qui l'a rendu faux. */
        const engages = sal.filter(u => api.pointsVisiblesEmployeur(u.id) > 0).length;
        const base = api.effectifReference(e.id);
        return { ...e,
          points: p.retenu,
          brut: p.brut,
          ecrete: p.ecrete,
          parSalarie: Math.round((p.retenu / base) * 10) / 10,
          /* Deux chiffres, deux noms. « Participation » désigne partout la part de
             l'EFFECTIF qui a une action validée ; la part des seuls inscrits est
             l'« activation ». Les confondre sous un seul mot donnait 1,4 % sur un
             écran et 60 % sur l'autre, pour la même entreprise le même jour. */
          participation: Math.round((engages / base) * 1000) / 10,
          activation: sal.length ? Math.round((engages / sal.length) * 100) : 0,
          engages, inscrits: sal.length,
          categorie: categorieDe(e.effectif || 0)
        };
      });
      if (categorie) l = l.filter(e => e.categorie.id === categorie);
      const cle = mode === "brut" ? "points" : "parSalarie";
      l = l.sort((a, b) => b[cle] - a[cle]).map((e, i) => ({ ...e, rang: i + 1 }));

      /* La moitié basse n'est pas nommée.

         Un classement d'entreprises sur l'engagement a un défaut connu : il
         punit ceux qui participent. Une entreprise qui n'entre pas n'apparaît
         nulle part ; une entreprise qui entre et finit dernière est nommée
         dernière. Le calcul du dirigeant est vite fait, et il est rationnel :
         il ne s'inscrit pas. Nommer seulement la moitié haute retire cette
         raison de rester dehors sans retirer la raison de bien faire.

         Ce que ça ne fait pas, et qui est écrit à l'écran : ce n'est pas de
         l'anonymat. Une entreprise qui communique elle-même sur sa
         participation se désigne. Riseva, elle, ne publie pas la liste de ses
         clients — sans ça, « absent de la moitié haute » se lirait comme
         « dans la moitié basse ». */
      const mediane = Math.ceil(l.length / 2);
      /* Les ex æquo comptent comme un bloc. Un groupe à cheval sur la médiane
         n'est pas nommé : départager deux scores identiques par leur ordre dans
         un tableau reviendrait à exposer l'un et protéger l'autre au hasard. */
      const dernierRangDuGroupe = (e) =>
        l.reduce((n, x) => (x[cle] === e[cle] ? Math.max(n, x.rang) : n), e.rang);
      return l.map(e => {
        const choix = e.visibilite || "auto";
        const anonyme = e.id !== pour && (
          choix === "anonyme" || (choix === "auto" && dernierRangDuGroupe(e) > mediane));
        return { ...e, anonyme, mediane,
          /* Le logo suit le nom, et disparaît avec lui. Un logo est un identifiant
             plus fort qu'une raison sociale — masquer le nom en laissant la marque
             ne masque rien du tout, et l'anonymat annoncé deviendrait un mensonge. */
          logo: anonyme ? null : (e.logo || null),
          /* Sur une ligne anonyme, la tranche de taille et RIEN d'autre. Le secteur
             était de trop : « 200 à 499 salariés · Logistique » dans une cohorte de
             quatre ne masque personne, ça désigne. Deux attributs suffisent à
             réidentifier là où un seul ne suffit pas. */
          nomAffiche: anonyme
            ? `Entreprise, ${e.categorie.label.toLowerCase()}`
            : e.nom,
          /* Une ligne anonyme garde son RANG et sa position relative, et rien de
             plus. Elle rendait ses totaux exacts — points, brut, participation,
             activation, points par salarie — qui se rapprochent d'une
             communication publique ou d'un chiffre vu ailleurs et lèvent le
             masque en une soustraction. La couche SQL les met deja a NULL
             (`classement_saison`, « une jointure sur deux nombres levait le
             masque ») ; le navigateur faisait autrement, et c'est le navigateur
             qui avait tort. */
          ...(anonyme ? { points: null, brut: null, parSalarie: null,
                          participation: null, activation: null, effectif: null } : {}) };
      });
    },
    rangDe(eid, options){
      return this.classement(options).findIndex(e => e.id === eid) + 1;
    },

    pointsPour(type, quantite){
      const b = BAREME[type];
      if (!b) return 0;
      return estArgent(type)
        ? Math.floor((quantite / 10) * b.points)
        : quantite * b.points;
    },

    /* --- écritures --- */
    creerAnnonce(a){
      /* Demander de l'argent sans avoir dit où le verser, c'est publier un besoin
         auquel personne ne peut répondre. La règle est ici, pas seulement dans
         l'écran : une annonce créée par une autre voie tomberait dessus aussi. */
      if (estArgent(a.type) && !api.donsOuverts(a.asso))
        throw new Error("Renseignez d'abord le compte bancaire de l'association : "
          + "sans IBAN, personne ne peut répondre à une demande d'argent.");
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
    /* Le texte exact du consentement, composé à partir de l'annonce.
       Un horodatage prouve qu'une case a été cochée ; il ne dit pas à QUOI. Or
       c'est la seule question qui se pose devant un inspecteur du travail : ce
       salarié a-t-il accepté CETTE mission, à CES dates, auprès de CET
       organisme ? L'article R. 8241-2 exige un accord exprès et écrit —
       « exprès » qualifie le contenu, pas la vitesse du clic.

       La phrase est composée en un seul endroit et lue en deux : l'écran
       l'affiche au-dessus de la case, la convention la reproduit mot pour mot.
       Deux formulations proches auraient été pires que pas de texte du tout,
       parce qu'elles auraient donné à croire qu'il y en avait un.

       Son empreinte SHA-256 est calculée côté serveur, jamais ici : une
       empreinte fournie par le navigateur est une empreinte que celui qui
       consent peut réécrire, et un consentement rédigé par la partie qui le
       recueille ne prouve rien. */
    texteConsentement(aid){
      const a = api.annonce(aid);
      if (!a) return "";
      const asso = api.association(a.asso) || {};
      /* Date écrite ici plutôt qu'empruntée à la couche d'affichage : ce texte
         part dans une convention et dans une base, pas seulement dans un écran. */
      const jj = (d) => { const p = String(d).slice(0, 10).split("-");
                          return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : String(d); };
      const quand = a.date ? `, le ${jj(a.date)}` : "";
      const ou = a.lieu ? ` à ${a.lieu}` : "";
      return `Je donne mon accord exprès à cette mise à disposition sur mon temps de `
        + `travail : « ${a.titre} », au profit de ${asso.nom || "l'association"}${quand}${ou}. `
        + `Je sais que mon contrat de travail se poursuit sans changement pendant toute `
        + `la durée de la mise à disposition, que je peux refuser sans que ce refus `
        + `constitue une faute ni un motif de sanction, et que mon employeur reste mon `
        + `employeur.`;
    },
    engager({ annonce, entreprise, salarie, quantite, consentement }){
      const a = s.annonces.find(x => x.id === annonce);
      if (!a || a.etat !== "ouverte") throw new Error("Annonce indisponible");
      /* Un don en argent ne s'« engage » pas : il s'annonce, se vire, et se
         confirme par l'association qui l'a reçu. Le laisser passer par ici aurait
         crédité des points sur une promesse. */
      if (estArgent(a.type))
        throw new Error("Un don en argent passe par une intention de virement, pas par un engagement.");
      if (quantite > a.restant) throw new Error("Quantité supérieure au besoin restant");
      /* L'éligibilité se revérifie ICI, pas seulement à la publication. L'article
         L. 8241-3 n'autorise le prêt gratuit qu'au profit des organismes visés aux
         a à g du 1 de l'article 238 bis. Si l'association a perdu cette qualité
         entre la publication et l'engagement — déclaration retirée, contrôle
         négatif — la mise à disposition retombe sous l'interdiction de l'article
         L. 8241-1, et c'est un délit pour l'entreprise cliente, pas une erreur de
         saisie. Une annonce ouverte n'est pas une autorisation permanente. */
      if (a.temps_travail && !api.eligibleMecenat(a.asso)){
        const asso = api.association(a.asso) || {};
        throw new Error(`${asso.nom || "Cette association"} ne déclare plus son éligibilité `
          + "au mécénat de compétences. Une mise à disposition sur le temps de travail ne peut "
          + "pas se faire à son profit : hors du régime de l'article L. 8241-3, un prêt de "
          + "main-d'œuvre gratuit redevient illicite. La mission reste possible sur le temps "
          + "personnel, en bénévolat.");
      }
      /* Une mise à disposition sur le temps de travail exige l'accord exprès, écrit et
         spécifique du salarié (article R. 8241-2). Accepter les conditions générales
         une fois pour toutes ne vaut pas consentement à cette mission-là, à ces dates-là. */
      if (a.temps_travail && !consentement)
        throw new Error("Votre accord explicite est nécessaire pour une mission sur le temps de travail");
      /* Deux fois sur la meme annonce. Un pouce qui appuie deux fois, ou un
         salarie qui retombe sur l'annonce trois ecrans plus bas sans reconnaitre
         qu'il s'y est deja mis : la place partait deux fois, l'association voyait
         deux inscriptions du meme nom, et le besoin restant se vidait pour rien.
         La quantite existe pour prendre plusieurs places d'un coup ; s'inscrire
         deux fois ne veut rien dire de plus. Un engagement refuse ou annule ne
         compte pas : celui-la, on peut le reprendre. */
      const dejaLa = s.missions.find(x => x.annonce === annonce && x.salarie === salarie
        && x.etat !== "refusee");
      if (dejaLa)
        throw new Error("Vous êtes déjà positionné sur cette annonce. "
          + "Pour prendre une place de plus, annulez et réinscrivez-vous avec la quantité voulue.");
      const moi = api.utilisateur(salarie) || {};
      if (moi.etablissement && moi.affectation_confirmee === false)
        throw new Error("Votre rattachement à un site doit être confirmé par votre référent "
          + "avant de vous engager : sans lui, vos points iraient au mauvais endroit.");
      a.restant -= quantite;
      if (a.restant === 0) a.etat = "close";
      /* Deux attributions figées au moment de l'engagement, et plus jamais recalculées :
         l'établissement qui recevra les points, et la société qui portera la convention,
         la valorisation et le reçu. Un salarié muté garde son historique là où il l'a
         fait ; ses missions suivantes iront à son nouveau site. */
      const sal = api.utilisateur(salarie) || {};
      const m = { id:id("m"), annonce, entreprise, salarie, quantite,
                  etablissement: sal.etablissement || null,
                  points: api.pointsPour(a.type, quantite), etat:"engagee", date:a.date,
                  consentement: a.temps_travail
                    ? { donne_le: leJour(),
                        /* Figé au moment de l'accord. Si le gabarit change l'an
                           prochain, la convention doit produire le texte d'alors,
                           pas celui d'aujourd'hui. */
                        texte: api.texteConsentement(a.id),
                        mission: a.titre, date_mission: a.date }
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
      m.declaree_le = leJour();
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
    /* Le délai court à partir de la déclaration, jamais à partir de la date prévue
       de la mission. Sinon une mission déclarée treize jours en retard serait
       validée d'office le lendemain, sans que l'association ait eu le temps de
       lire le message. Une seule définition, ici et en SQL. */
    echeanceAuto(m){
      const depart = m.declaree_le || m.date;
      const limite = new Date(depart);
      limite.setDate(limite.getDate() + DELAI_VALIDATION_JOURS);
      return limite;
    },
    /* Jours restants avant la validation automatique. */
    joursAvantAuto(m){
      if (m.etat !== "a_valider") return null;
      return Math.max(0, Math.ceil((api.echeanceAuto(m) - minuit()) / 864e5));
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
    /* `u.actif` absent veut dire actif : c'est `false` qui retire un compte, pas
       l'absence de la clé. La version stricte renvoyait une liste vide pour une
       entreprise dont l'administrateur venait du jeu de départ — donc aucun
       destinataire pour ses rapports, et aucun garde-fou sur le dernier
       administrateur. */
    administrateurs: (eid) => s.utilisateurs.filter(u => u.org === eid
      && u.role === "entreprise_admin" && u.actif !== false && !u.anonyme),

    /* Une seule écriture : l'état de la mission, et le chiffre que l'association
       a corrigé. Pas de compteur additionné au passage sur l'entreprise ni sur le
       salarié — les totaux se relisent dans les missions, sinon une correction
       laisse un score faux derrière elle. */
    validerMission(mid, ok, realise, motif = null){
      const m = s.missions.find(x => x.id === mid); if (!m) return null;
      m.etat = ok ? "validee" : "refusee";
      m.tranchee_le = leJour();
      if (ok){
        if (realise !== undefined && realise !== null) m.realise = Math.max(0, Number(realise) || 0);
        api.emettreRecuSiPret(m);
      } else {
        m.points = 0; m.realise = 0;
        /* Le motif suit la décision. L'écran le demandait déjà et le jetait :
           l'entreprise voyait ses points tomber à zéro sans un mot, et le salarié
           qui avait donné sa demi-journée non plus. */
        m.motif_refus = String(motif || "").trim().slice(0, 500) || null;
        const dest = api.administrateurs(m.entreprise)[0];
        if (!s.envois.some(x => x.cle === `refus:${m.id}`))
          s.envois.unshift({ id: id("en"), cle: `refus:${m.id}`, type: "moderation",
            entreprise: m.entreprise, destinataire: dest ? dest.email : null,
            sujet: "Une mission n'a pas été confirmée",
            detail: m.motif_refus || "L'association a indiqué que la mission n'a pas eu lieu.",
            date: leJour(), etat: dest ? "à envoyer" : "sans destinataire" });
      }
      return m;
    },
    /* Les administrateurs occupent aussi une place : ce sont des comptes de l'entreprise. */
    salaries: (eid, { avecAnonymes = true } = {}) =>
      s.utilisateurs.filter(u => u.org === eid
        && ["salarie", "entreprise_admin", "site_referent"].includes(u.role)
        && (avecAnonymes || !u.anonyme)),

    /* Sièges : une place occupée par salarié encore identifié.
       Un salarié retiré, donc anonymisé, rend sa place.

       Avec un établissement, la place se compte dans son quota et pas ailleurs :
       sinon le premier site servi mange les places des autres, et le référent de
       Marseille découvre en septembre qu'il n'a plus de comptes. */
    /* Une place, c'est un salarié. Un administrateur, un référent de site ou un
       élu du CSE n'en consomme pas : refuser un élu parce que l'entreprise a
       rempli ses sièges reviendrait à lui faire payer des comptes qu'il
       n'utilise pas. C'est la règle du serveur — `affectation_siege` n'est
       écrite que par `rejoindre_entreprise` — et c'est ce que dit la page
       d'inscription. Ici, les trois rôles étaient comptés : un client lisait
       « 118 / 120 places » là où la base en comptait 115 de libres, et l'alerte
       « votre équipe approche de sa limite » se déclenchait pour rien. */
    occupeUnSiege: (u) => !!u && !u.anonyme && u.role === "salarie",
    sieges(eid, { etablissement = null } = {}){
      if (etablissement){
        const et = api.etablissement(etablissement);
        const total = et ? (et.quota || et.effectif || 0) : 0;
        const pris = api.salaries(eid).filter(u => api.occupeUnSiege(u)
          && u.etablissement === etablissement).length;
        return { total, pris, restants: Math.max(0, total - pris) };
      }
      const e = api.entreprise(eid);
      const total = e ? (e.sieges || e.effectif || 0) : 0;
      const pris = api.salaries(eid).filter(u => api.occupeUnSiege(u)).length;
      return { total, pris, restants: Math.max(0, total - pris) };
    },

    /* ---- Groupe, sociétés, établissements ----
       Trois niveaux, parce que le droit français en compte trois : le groupe ne
       signe rien, la société signe et paie l'impôt, l'établissement emploie sur
       un lieu. Écraser les trois en un seul casse le plafond de mécénat, la
       facture, la convention de mise à disposition et le cloisonnement RGPD. */
    groupe: (gid) => s.groupes.find(g => g.id === gid) || null,
    groupeDe(eid){
      const e = api.entreprise(eid);
      return e && e.groupe ? api.groupe(e.groupe) : null;
    },
    societes: (gid) => s.entreprises.filter(e => e.groupe === gid),
    etablissement: (etid) => s.etablissements.find(x => x.id === etid) || null,
    etablissements: (eid) => s.etablissements.filter(x => x.societe === eid),
    etablissementsDuGroupe: (gid) =>
      api.societes(gid).flatMap(e => api.etablissements(e.id)),

    /* Le quota est une ressource finie : la somme allouée aux établissements ne
       peut pas dépasser les places du contrat de la société. */
    quotaDisponible(eid){
      const total = (api.entreprise(eid) || {}).sieges || 0;
      const alloue = api.etablissements(eid).reduce((n, x) => n + (x.quota || 0), 0);
      return { total, alloue, libre: total - alloue };
    },
    /* Declarer un site. Sans cette fonction, une entreprise qui vient de creer
       son compte n'a aucun etablissement : la collecte d'indicateurs n'a personne
       a qui demander, le classement interne n'a rien a comparer, et l'ecran des
       quotas affiche « Aucun etablissement declare » sans le moindre geste
       possible. Le jeu de demonstration masquait le trou, parce qu'il arrive
       avec ses quatre sites deja en place.

       Ce qui est verifie ici l'est aussi cote Postgres, dans `creer_etablissement` :
       une regle qui n'existe que dans le navigateur n'est pas une regle. */
    ajouterEtablissement({ societe, nom, ville, siret, effectif, adresse }){
      const e = api.entreprise(societe);
      if (!e) throw new Error("Société inconnue");
      const n = String(nom || "").trim();
      if (n.length < 2) throw new Error("Donnez un nom à ce site : « Siège », « Usine », « Agence de Lyon ».");
      const v = String(ville || "").trim();
      if (!v) throw new Error("La ville est nécessaire : c'est elle qui dit ce qu'un salarié de ce site peut aller faire.");
      const sr = String(siret || "").replace(/[^0-9]/g, "");
      if (sr && sr.length !== 14) throw new Error("Un SIRET compte quatorze chiffres.");
      if (sr && !siretValide(sr)) throw new Error("Ce SIRET ne passe pas la clé de contrôle. Vérifiez la saisie.");
      if (sr && s.etablissements.some(x => x.siret === sr))
        throw new Error("Ce SIRET est déjà déclaré sur un autre site.");
      const eff = Math.max(0, Math.round(Number(effectif) || 0));
      /* Un site ne peut pas contenir plus de salaries que la societe n'en
         declare. Le classement entre sites est normalise par l'effectif : sans
         ce plafond, il suffirait de se declarer trois salaries sur un site pour
         le faire remonter tout en haut. */
      const dejaDeclare = api.etablissements(societe).reduce((t, x) => t + (x.effectif || 0), 0);
      if (e.effectif && dejaDeclare + eff > e.effectif)
        throw new Error(`Votre société déclare ${e.effectif} salariés et ${dejaDeclare} sont déjà `
          + `répartis sur vos sites : il en reste ${e.effectif - dejaDeclare} à placer. `
          + `Corrigez l'effectif de la société dans Paramètres si le vôtre a changé.`);
      const et = { id:id("et"), societe, nom:n, ville:v, siret:sr || null,
                   effectif:eff, quota:0, adresse:String(adresse || "").trim() || null,
                   lat:null, lon:null, referent:null, referent_mail:null,
                   registre_actif:false };
      s.etablissements.push(et);
      api.tracer(societe, null, "site_declare", `${et.nom} ${et.ville}`);
      return et;
    },

    /* Corriger un site declare. Une ville mal orthographiee, un effectif qui
       change au 1er janvier : ce sont des corrections ordinaires, et les rendre
       impossibles obligerait a supprimer puis recreer, ce qui emporterait les
       saisies deja faites. */
    modifierEtablissement(etid, { nom, ville, effectif, adresse, siret } = {}){
      const et = api.etablissement(etid);
      if (!et) throw new Error("Établissement inconnu");
      const e = api.entreprise(et.societe);
      if (nom !== undefined){
        const n = String(nom).trim();
        if (n.length < 2) throw new Error("Donnez un nom à ce site.");
        et.nom = n;
      }
      if (ville !== undefined){
        const v = String(ville).trim();
        if (!v) throw new Error("La ville est nécessaire.");
        et.ville = v;
      }
      if (siret !== undefined){
        const sr = String(siret || "").replace(/[^0-9]/g, "");
        if (sr && sr.length !== 14) throw new Error("Un SIRET compte quatorze chiffres.");
        if (sr && !siretValide(sr)) throw new Error("Ce SIRET ne passe pas la clé de contrôle.");
        if (sr && s.etablissements.some(x => x.siret === sr && x.id !== etid))
          throw new Error("Ce SIRET est déjà déclaré sur un autre site.");
        et.siret = sr || null;
      }
      if (effectif !== undefined){
        const eff = Math.max(0, Math.round(Number(effectif) || 0));
        const autres = api.etablissements(et.societe)
          .reduce((t, x) => t + (x.id === etid ? 0 : (x.effectif || 0)), 0);
        if (e && e.effectif && autres + eff > e.effectif)
          throw new Error(`Votre société déclare ${e.effectif} salariés : il en reste `
            + `${e.effectif - autres} à placer sur ce site.`);
        et.effectif = eff;
      }
      if (adresse !== undefined) et.adresse = String(adresse).trim() || null;
      api.tracer(et.societe, null, "site_modifie", `${et.nom} ${et.ville}`);
      return et;
    },

    allouerQuota(etid, places){
      const et = api.etablissement(etid);
      if (!et) throw new Error("Établissement inconnu");
      const n = Math.max(0, Math.round(Number(places) || 0));
      const { total, alloue } = api.quotaDisponible(et.societe);
      if (alloue - (et.quota || 0) + n > total)
        throw new Error(`Le contrat ouvre ${total} places : ${alloue - (et.quota || 0)} sont `
          + `déjà allouées ailleurs, il en reste ${total - alloue + (et.quota || 0)} pour ce site.`);
      const pris = api.sieges(et.societe, { etablissement: etid }).pris;
      if (n < pris)
        throw new Error(`${pris} comptes sont déjà ouverts sur ce site : le quota ne peut `
          + `pas descendre en dessous.`);
      et.quota = n;
      api.tracer(et.societe, null, "quota_site", `${et.nom} ${et.ville} : ${n}`);
      return et;
    },

    /* Ce que voit le groupe : des agrégats, jamais des personnes. Deux sociétés
       d'un même groupe sont deux responsables de traitement distincts ; faire
       remonter du nominatif de l'une à l'autre serait la faute la plus coûteuse
       que ce produit puisse commettre. */
    consolideGroupe(gid){
      const societes = api.societes(gid).map(e => {
        const etabs = api.etablissements(e.id).map(et => {
          const gens = api.salaries(e.id).filter(u => u.etablissement === et.id && !u.anonyme);
          /* On lit l'attribution figée sur la mission, jamais l'affectation actuelle
             du salarié : sinon une mutation de Lyon à Marseille déplacerait le passé
             avec la personne, et le classement de la saison dernière changerait tout
             seul. Repli sur l'affectation courante pour les missions antérieures au
             modèle multi-sites, et pour elles seulement. */
          const ms = api.missions({ entreprise: e.id })
            .filter(m => ["validee", "validee_auto"].includes(m.etat))
            /* Un don personnel ne compte pas dans le score de l'entreprise
               (`pointsDe` l'exclut) : le laisser peser ici faisait remonter un
               site dans le classement interne a cause d'un versement prive, et
               l'ecart entre les deux totaux se lisait a dix euros pres. */
            .filter(m => !api.estDonPersonnel(m))
            .filter(m => (m.etablissement
              || ((api.utilisateur(m.salarie) || {}).etablissement)) === et.id);
          const points = ms.reduce((n, m) => n + (m.points || 0), 0);
          const confirmees = ms.filter(m => m.etat === "validee").length;
          const mobilises = new Set(ms.map(m => m.salarie)).size;
          return {
            id: et.id, nom: et.nom, ville: et.ville, effectif: et.effectif,
            quota: et.quota, comptes: gens.length,
            points, missions: ms.length, confirmees, mobilises,
            parSalarie: et.effectif ? points / et.effectif : 0
          };
        });
        const v = api.valorisationMecenat(e.id);
        return {
          id: e.id, nom: e.nom, siren: e.siren || null, effectif: e.effectif,
          etablissements: etabs,
          points: etabs.reduce((n, x) => n + x.points, 0),
          missions: etabs.reduce((n, x) => n + x.missions, 0),
          confirmees: etabs.reduce((n, x) => n + x.confirmees, 0),
          mobilises: etabs.reduce((n, x) => n + x.mobilises, 0),
          /* Le plafond se calcule société par société. On additionne des réductions
             déjà plafonnées séparément, on ne plafonne jamais un total de groupe. */
          assiette: v.assiette, reduction: v.reduction, plafondCalculable: v.plafondCalculable
        };
      });
      const sites = societes.flatMap(x => x.etablissements);
      const points = societes.reduce((n, x) => n + x.points, 0);
      const effectif = societes.reduce((n, x) => n + (x.effectif || 0), 0);
      return {
        groupe: api.groupe(gid), societes, sites,
        /* Un consolidé est un rapport de sommes, jamais une moyenne de ratios.
           La moyenne des scores de Paris, Lyon et Marseille n'est pas le score du
           groupe, et l'écart est invisible à l'œil. */
        parSalarie: effectif ? points / effectif : 0,
        points: societes.reduce((n, x) => n + x.points, 0),
        missions: societes.reduce((n, x) => n + x.missions, 0),
        confirmees: societes.reduce((n, x) => n + x.confirmees, 0),
        mobilises: societes.reduce((n, x) => n + x.mobilises, 0),
        effectif: societes.reduce((n, x) => n + (x.effectif || 0), 0),
        /* Additionner des réductions d'impôt n'a de sens que si toutes sont
           calculables. Sinon on renvoie null, comme partout ailleurs. */
        reduction: societes.every(x => x.plafondCalculable)
          ? societes.reduce((n, x) => n + (x.reduction || 0), 0) : null
      };
    },

    /* La comparaison entre sites d'un même périmètre. Elle fonctionne dès le
       premier client — trois sites suffisent — et elle parle à des gens qui se
       connaissent. C'est sa force, et c'est aussi son danger.

       Trois garde-fous, parce qu'un rang mal posé fait plus de mal que pas de
       rang du tout :
       — l'ordinal est désactivé par défaut, le groupe l'active s'il le veut ;
       — aucun rang tant qu'un site n'a pas cinq salariés mobilisés et cinq
         missions validées : en dessous, on mesure la volatilité des petits
         nombres et la date de démarrage, pas l'engagement ;
       — un site sans référent nommé n'est pas classé dernier, il est en
         « lancement » : il n'a pas encore commencé.

       Et jamais « performance RSE d'un site » : c'est un challenge d'engagement
       associatif, sans incidence sur l'évaluation de qui que ce soit. */
    SEUIL_CLASSEMENT: { mobilises: 5, missions: 5 },

    statutSite(x){
      const seuil = api.SEUIL_CLASSEMENT;
      if (!x.comptes) return { cle:"lancement", label:"En lancement",
        aide:"Aucun compte ouvert : le site n'a pas encore commencé." };
      if (!x.missions) return { cle:"lancement", label:"En lancement",
        aide:"Des comptes ouverts, aucune mission encore réalisée." };
      if (x.mobilises < seuil.mobilises || x.missions < seuil.missions)
        return { cle:"demarrage", label:"En démarrage",
          aide:`Sous ${seuil.mobilises} salariés mobilisés et ${seuil.missions} missions, `
             + `un rang mesurerait surtout le hasard des petits nombres.` };
      if (x.effectif && x.mobilises / x.effectif >= 0.1)
        return { cle:"fort", label:"Fortement mobilisé",
          aide:"Plus d'un salarié sur dix a participé." };
      return { cle:"actif", label:"Actif", aide:"Le site tourne." };
    },

    classementSites(portee){
      const sites = portee.groupe
        ? api.consolideGroupe(portee.groupe).sites
        : api.consolideGroupe((api.entreprise(portee.entreprise) || {}).groupe || "")
            .societes.filter(x => x.id === portee.entreprise).flatMap(x => x.etablissements);
      const gid = portee.groupe || (api.entreprise(portee.entreprise) || {}).groupe;
      const ordinal = !!(api.groupe(gid) || {}).classement_sites;
      const classes = sites
        .map(x => ({ ...x, score: Math.round(x.parSalarie * 100) / 100,
                     statut: api.statutSite(x) }))
        .sort((a, b) => b.parSalarie - a.parSalarie);
      let n = 0;
      return classes.map(x => {
        const classable = ordinal && x.statut.cle !== "lancement" && x.statut.cle !== "demarrage";
        return { ...x, ordinal, classable, rang: classable ? ++n : null };
      });
    },

    /* L'activation appartient au groupe, et elle se journalise : personne ne doit
       découvrir un classement de ses sites un lundi matin sans savoir qui l'a
       allumé. */
    activerClassementSites(gid, oui){
      const g = api.groupe(gid); if (!g) throw new Error("Groupe inconnu");
      g.classement_sites = !!oui;
      const mere = api.entreprise(g.societe_mere);
      if (mere) api.tracer(mere.id, null, "classement_sites", oui ? "activé" : "désactivé");
      return g;
    },

    /* ---- Registre des dons de matériel, au titre de la loi AGEC ----
       Les invendus et équipements non alimentaires ne peuvent plus être éliminés :
       ils doivent être réemployés, réutilisés ou recyclés, et le don à une
       association est la voie prévue par le texte. Riseva devient la preuve de ce
       don — quoi, combien, à qui, quand — sans demander une ligne de plus à
       l'association : elle déclare « reçu », comme pour n'importe quelle mission.

       Sur la valorisation, j'avais écrit une règle trop simple : « la valeur nette
       comptable ». C'est faux comme règle unique. La doctrine distingue au moins
       deux cas — un bien inscrit en stock se valorise à son coût de revient, une
       immobilisation à la valeur de cession retenue pour déterminer la plus ou
       moins-value de sortie — et la valorisation relève de toute façon de la
       responsabilité du donateur, pas de la nôtre.

       Riseva demande donc la catégorie comptable, rappelle la méthode qui s'y
       applique, et enregistre une *valeur déclarée par l'entreprise*. Elle ne
       détermine rien à la place du comptable, et une valeur absente reste absente. */
    CATEGORIES_MATERIEL: [
      { cle:"stock", label:"Bien inscrit en stock",
        methode:"Se valorise au coût de revient du bien." },
      { cle:"immobilisation", label:"Immobilisation",
        methode:"Se valorise à la valeur de cession retenue pour déterminer la plus ou moins-value de sortie." },
      { cle:"autre", label:"Autre cas",
        methode:"À déterminer avec votre expert-comptable : Riseva n'applique pas de méthode à votre place." }
    ],
    registreMateriel(eid){
      const lignes = api.missions({ entreprise: eid })
        .filter(m => (api.annonceDe(m) || {}).type === "don_materiel")
        .filter(m => m.etat !== "refusee")
        .map(m => {
          const a = api.annonceDe(m) || {};
          const asso = api.association(a.asso) || {};
          const sal = api.utilisateur(m.salarie) || {};
          const et = m.etablissement ? api.etablissement(m.etablissement) : null;
          return {
            mission: m.id, date: m.date, nature: m.nature || a.titre,
            quantite: m.quantite, unite: (a.impact || {}).unite || "don",
            association: asso.nom || "", ville: asso.ville || "",
            etablissement: et ? `${et.nom}, ${et.ville}` : "",
            salarie: sal.nom || "",
            valeurDeclaree: m.valeur_declaree ?? null,
            categorie: m.categorie_comptable || null,
            reference: m.reference_actif || null,
            sortieLe: m.sortie_le || null,
            justificatif: m.justificatif || null,
            effacementDonnees: m.effacement_donnees ?? null,
            societe: (api.entreprise(m.entreprise) || {}).nom || "",
            siren: (api.entreprise(m.entreprise) || {}).siren || "",
            eligible: api.eligibleMecenat(a.asso),
            confirme: m.etat === "validee",
            etat: m.etat,
            recu: m.recu_le || null
          };
        })
        .sort((x, y) => (y.date || "").localeCompare(x.date || ""));
      const valorisees = lignes.filter(x => x.valeurDeclaree !== null);
      return {
        lignes,
        total: lignes.length,
        confirmes: lignes.filter(x => x.confirme).length,
        valorisees: valorisees.length,
        valeur: valorisees.reduce((n, x) => n + x.valeurDeclaree, 0),
        /* Ce qu'on ne sait pas valoriser, on ne l'invente pas. */
        sansValeur: lignes.length - valorisees.length
      };
    },
    declarerValeurMateriel(mid, champs = {}){
      const m = s.missions.find(x => x.id === mid);
      if (!m) throw new Error("Mission inconnue");
      const a = api.annonceDe(m);
      if (!a || a.type !== "don_materiel")
        throw new Error("Cette mission n'est pas un don de matériel");
      const { valeur, categorie, nature, reference, sortieLe, justificatif, effacement } = champs;
      if (categorie && !api.CATEGORIES_MATERIEL.some(c => c.cle === categorie))
        throw new Error("Catégorie comptable inconnue");
      m.valeur_declaree = valeur === "" || valeur === null || valeur === undefined
        ? null : Math.max(0, Number(valeur) || 0);
      if (categorie !== undefined) m.categorie_comptable = categorie || null;
      if (nature !== undefined) m.nature = String(nature || "").slice(0, 200) || undefined;
      if (reference !== undefined) m.reference_actif = String(reference || "").slice(0, 80) || null;
      if (sortieLe !== undefined) m.sortie_le = sortieLe || null;
      if (justificatif !== undefined) m.justificatif = String(justificatif || "").slice(0, 200) || null;
      if (effacement !== undefined) m.effacement_donnees = effacement === null ? null : !!effacement;
      return m;
    },

    /* ---- Indicateurs sociaux et sécurité ----
       Ce qui coûte cher à un groupe, ce n'est pas le calcul : c'est la collecte.
       Relancer quatorze sites pour obtenir un tableur mal rempli. On réemploie donc
       exactement le mécanisme des missions : on demande, on rappelle, et si personne
       ne répond la période se clôt sans réponse — sans rien inventer pour combler. */
    campagnes: (gid) => s.campagnes.filter(c => !gid || c.groupe === gid),
    campagne: (cid) => s.campagnes.find(c => c.id === cid) || null,
    observation: (cid, etid) =>
      s.observations.find(o => o.campagne === cid && o.etablissement === etid) || null,

    /* L'état d'une campagne, site par site. Quatre états et pas un de plus :
       attendu, déclaré, approuvé, clos sans réponse. */
    etatCampagne(cid){
      const c = api.campagne(cid); if (!c) return null;
      const sites = api.etablissementsDuGroupe(c.groupe).map(et => {
        const o = api.observation(cid, et.id);
        return {
          etablissement: et, observation: o,
          etat: o ? o.etat : "attendu",
          saisiPar: o && o.saisi_par ? api.utilisateur(o.saisi_par) : null,
          approuvePar: o && o.approuve_par ? api.utilisateur(o.approuve_par) : null
        };
      });
      const compte = (e) => sites.filter(x => x.etat === e).length;
      return { campagne: c, sites,
        attendus: compte("attendu"), declares: compte("declare"),
        approuves: compte("approuve"), clos: compte("clos_sans_reponse"),
        joursRestants: api.joursAvant(c.echeance) };
    },

    joursAvant(date){
      if (!date) return null;
      return Math.ceil((new Date(date) - minuit()) / 864e5);
    },

    /* Le contributeur saisit, l'approbateur verrouille. Deux gestes, deux personnes
       si possible, parce qu'un chiffre entre sinon dans un document contractuel sans
       que personne ne l'ait regardé. */
    /* ------------------------------------------------------------------ */
    /* Écarts entre périodes                                              */
    /* ------------------------------------------------------------------ */
    /* Un taux de fréquence qui triple d'un semestre à l'autre a deux causes
       possibles : il s'est réellement passé quelque chose, ou quelqu'un a saisi
       des heures travaillées au lieu d'heures payées. Les deux se ressemblent
       exactement dans une base de données, et la seconde est la plus fréquente.

       Riseva ne corrige rien et ne refuse pas la valeur : elle refuse le silence.
       Au-delà de trente pour cent de variation sur un indicateur calculé, la
       saisie demande une phrase d'explication. Cette phrase suit la valeur
       jusque dans le rapport — c'est elle qui répond, un an plus tard, à la seule
       question que posera un acheteur devant une courbe qui saute. */
    campagnePrecedente(cid){
      const c = api.campagne(cid); if (!c) return null;
      return s.campagnes
        .filter(x => x.groupe === c.groupe && x.fin < c.debut)
        .sort((a, b) => (a.fin < b.fin ? 1 : -1))[0] || null;
    },
    ecartsAvecPeriodePrecedente(cid, etid, valeurs){
      const prec = api.campagnePrecedente(cid);
      if (!prec) return [];
      const o = api.observation(prec.id, etid);
      if (!o || !["declare", "approuve"].includes(o.etat)) return [];
      const ecarts = [];
      INDICATEURS.calcules.forEach(d => {
        const avant = d.calcul(o.valeurs || {});
        const apres = d.calcul(valeurs || {});
        if (avant == null || apres == null || avant === 0) return;
        const variation = (apres - avant) / Math.abs(avant);
        if (Math.abs(variation) >= SEUIL_ECART)
          ecarts.push({ cle: d.cle, libelle: d.libelle, formule: d.formule,
                        avant, apres, variation,
                        periode_avant: prec.libelle || prec.nom || prec.id });
      });
      return ecarts;
    },
    /* Les quatre valeurs que le registre remplace, quand le site le tient. */
    CLES_DU_REGISTRE: ["at_avec_arret", "at_sans_arret", "at_trajet", "jours_arret"],
    /* Ce que la campagne déduit du registre pour un site, ou null si ce site ne
       le tient pas. La double saisie est le premier endroit où deux chiffres se
       mettent à diverger : un accident déclaré au fil de l'eau et un total
       recopié en fin de période ne tombent jamais juste. */
    valeursDeriveesDuRegistre(cid, etid){
      if (!api.registreActif(etid)) return null;
      const c = api.campagne(cid); if (!c) return null;
      const r = api.securiteDuRegistre({ etablissement: etid, debut: c.debut, fin: c.fin });
      const v = {};
      api.CLES_DU_REGISTRE.forEach(k => { v[k] = r[k]; });
      return v;
    },

    /* ---------------------------------------------------------------- */
    /* Le coffre de preuves                                               */
    /*                                                                    */
    /* Ce qu'il change, et pourquoi il valait la peine d'etre ecrit. Une   */
    /* valeur portait deja qui l'avait saisie et qui l'avait approuvee.    */
    /* C'est plus qu'un tableur, et ce n'est pas assez : un an plus tard,  */
    /* devant un donneur d'ordre qui demande d'ou sort le chiffre,         */
    /* « Karim l'a saisi le 3 juillet » n'est pas une reponse. La facture  */
    /* d'electricite, elle, en est une.                                    */
    /*                                                                    */
    /* En demonstration, le fichier est garde en base 64 dans l'etat, et   */
    /* seulement s'il tient sous la limite : le navigateur alloue quelques */
    /* megaoctets par site, et une demonstration qui casse au troisieme    */
    /* depot ne demontre rien. Au-dela, on garde la ligne sans le fichier  */
    /* et on le dit, plutot que de faire croire a une piece qu'on n'a pas. */
    FORMATS_PIECE: {
      "application/pdf": "PDF",
      "image/jpeg": "photo JPEG",
      "image/png": "image PNG",
      "image/webp": "image WebP",
      "text/csv": "CSV",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "classeur",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "document"
    },
    TAILLE_PIECE_MAX: 10 * 1024 * 1024,
    TAILLE_PIECE_GARDEE: 400 * 1024,

    joindrePiece({ objet, cible, nom, type, taille, contenu = null, uid = null }){
      /* Deux objets ici, trois en base. Le troisieme, le don, existe cote
         Postgres parce qu'un recu fiscal se justifie ; il n'existe pas dans le
         moteur du navigateur parce que la demonstration modelise les dons comme
         des missions. Ajouter un objet vide de ce cote-ci ferait diverger les
         deux moteurs sur une regle qu'aucun ecran n'utilise encore. */
      if (!["observation", "mission"].includes(objet))
        throw new Error("Objet inconnu.");
      if (!Array.isArray(s.pieces)) s.pieces = [];
      if (!api.FORMATS_PIECE[type])
        throw new Error("Format refusé. Acceptés : PDF, photo, image, CSV, classeur, document.");
      if (!(taille > 0)) throw new Error("Fichier vide.");
      if (taille > api.TAILLE_PIECE_MAX)
        throw new Error("Fichier trop lourd : " + Math.round(taille / 1048576) + " Mo, "
          + "maximum " + Math.round(api.TAILLE_PIECE_MAX / 1048576) + " Mo.");
      const cibleOk = objet === "observation"
        ? s.observations.some(o => o.id === cible)
        : s.missions.some(m => m.id === cible);
      if (!cibleOk) throw new Error("Cet élément n'existe pas.");
      const id = "pj" + (s.pieces.length + 1) + "-" + Date.now().toString(36);
      s.pieces.push({
        id, objet, cible, nom: String(nom).slice(0, 200), type, taille,
        contenu: taille <= api.TAILLE_PIECE_GARDEE ? contenu : null,
        depose_par: uid, depose_le: new Date().toISOString(), retire_le: null
      });
      planifier();
      return id;
    },

    piecesDe(objet, cible){
      if (!Array.isArray(s.pieces)) return [];
      return s.pieces.filter(p => p.objet === objet && p.cible === cible && !p.retire_le)
        .map(p => ({ ...p,
          format: api.FORMATS_PIECE[p.type] || "fichier",
          deposant: (s.utilisateurs.find(u => u.id === p.depose_par) || {}).nom || "compte retiré",
          /* `conserve` dit si le FICHIER est là. En démonstration il vit dans
             `contenu` ; en production, dans le stockage objet, et le mappeur pose
             `contenu: null` en dur avec `conserve` déjà calculé — cette ligne
             réécrivait donc `false` par-dessus, et toute pièce d'un vrai client
             s'affichait « fichier non conservé en démonstration », sans bouton
             de téléchargement, sur une facture qu'il venait de déposer. */
          conserve: p.contenu !== null || !!p.chemin || p.conserve === true }));
    },

    retirerPiece(id, uid = null){
      const p = (s.pieces || []).find(x => x.id === id);
      if (!p || p.retire_le) return;
      /* Une piece accrochee a une valeur approuvee ne se retire plus : le
         chiffre est entre dans un rapport, sa justification part avec lui.
         Effacer une preuve apres coup, c'est exactement ce contre quoi une
         piste d'audit existe. */
      if (p.objet === "observation") {
        const o = s.observations.find(x => x.id === p.cible);
        if (o && o.etat === "approuve")
          throw new Error("Cette valeur est approuvée : sa pièce ne se retire plus.");
      }
      p.retire_le = new Date().toISOString();
      p.retire_par = uid;
      planifier();
    },

    /* Combien de valeurs d'une campagne portent au moins une piece. C'est le
       seul chiffre que le siege regarde vraiment : il ne lit pas les factures,
       il verifie qu'elles existent. */
    couverturePreuves(cid){
      const obs = s.observations.filter(o => o.campagne === cid);
      const avec = obs.filter(o => api.piecesDe("observation", o.id).length > 0).length;
      return { sites: obs.length, avec, sans: obs.length - avec };
    },

    saisirIndicateurs(cid, etid, valeurs, uid, commentaire = null){
      const c = api.campagne(cid);
      if (!c || c.etat !== "ouverte") throw new Error("Cette campagne est close.");
      let o = api.observation(cid, etid);
      const derive = api.valeursDeriveesDuRegistre(cid, etid);
      const propres = {};
      INDICATEURS.saisis.forEach(d => {
        /* Une valeur déduite du registre ne se saisit pas : elle est écrasée par
           le registre à chaque enregistrement, et l'écran le dit. Accepter une
           saisie manuelle qu'on remplace ensuite en silence serait pire que de
           la refuser. */
        if (derive && api.CLES_DU_REGISTRE.includes(d.cle)) return;
        const v = valeurs[d.cle];
        if (v === undefined || v === null || v === "") return;
        propres[d.cle] = Math.max(0, Number(v) || 0);
      });
      if (derive) Object.assign(propres, derive);
      /* Le refus porte sur l'absence d'explication, jamais sur la valeur. Une
         plateforme qui rejetterait un chiffre parce qu'il bouge trop finirait par
         obtenir des chiffres qui ne bougent pas. */
      const ecarts = api.ecartsAvecPeriodePrecedente(cid, etid,
        { ...(o ? o.valeurs : {}), ...propres });
      const mot = String(commentaire || "").trim();
      if (ecarts.length && mot.length < 10)
        throw new Error(
          ecarts.map(e => `${e.libelle} : ${Math.abs(Math.round(e.variation * 100))} % `
            + `de variation par rapport à ${e.periode_avant}`).join(" ; ")
          + `. Au-delà de ${Math.round(SEUIL_ECART * 100)} %, expliquez en une phrase : `
          + `un événement réel et une erreur de saisie se ressemblent exactement dans une base.`);
      if (!o){
        o = { id:id("o"), campagne:cid, etablissement:etid, etat:"declare", version:1,
              saisi_par:uid, saisi_le:leJour(),
              approuve_par:null, approuve_le:null, valeurs:propres,
              source_registre: !!derive,
              commentaire: mot || null, ecarts };
        s.observations.push(o);
      } else {
        /* Corriger une valeur approuvée, c'est produire une version, jamais écraser. */
        if (o.etat === "approuve") o.version += 1;
        o.valeurs = { ...o.valeurs, ...propres };
        o.source_registre = !!derive;
        o.commentaire = mot || o.commentaire || null;
        o.ecarts = ecarts;
        o.etat = "declare";
        o.saisi_par = uid; o.saisi_le = leJour();
        o.approuve_par = null; o.approuve_le = null;
      }
      return o;
    },
    /* ------------------------------------------------------------------ */
    /* Dictionnaire des données                                           */
    /* ------------------------------------------------------------------ */
    /* Ce que produit un rapport RSE défendable, en plus des chiffres : la pièce
       qui dit comment ils ont été obtenus. Sans elle, un acheteur, un auditeur ou
       un commissaire aux comptes ne peut ni contester ni vérifier — il peut
       seulement croire, et c'est exactement ce qu'il refusera de faire.

       Le dictionnaire est daté et versionné avec la campagne : une définition qui
       change plus tard ne réécrit pas les rapports déjà arrêtés. C'est la raison
       pour laquelle il est produit ici plutôt que lu dans le code au moment de
       l'affichage. */
    dictionnaire(cid){
      const c = api.campagne(cid);
      const e = c ? api.etatCampagne(cid) : null;
      return {
        version: INDICATEURS.version,
        campagne: c ? { id:c.id, libelle:c.libelle, debut:c.debut, fin:c.fin,
                        echeance:c.echeance, etat:c.etat } : null,
        edite_le: leJour(),
        seuil_ecart: SEUIL_ECART,
        collecte: c ? {
          sites_attendus: e.sites.length,
          sites_approuves: e.sites.filter(x => x.etat === "approuve").length,
          sites_sans_reponse: e.sites.filter(x => x.etat === "clos_sans_reponse").length
        } : null,
        saisis: INDICATEURS.saisis.map(d => ({
          cle:d.cle, libelle:d.libelle, unite:d.unite, niveau:d.niveau,
          source:d.source, definition:d.aide, inclut:d.inclut, exclut:d.exclut,
          agregation:"somme des sites du périmètre"
        })),
        calcules: INDICATEURS.calcules.map(d => ({
          cle:d.cle, libelle:d.libelle, unite:d.unite, niveau:d.niveau,
          reglementaire:d.reglementaire, formule:d.formule,
          numerateur:d.num, denominateur:d.den, note:d.note,
          /* La règle qui compte, et celle qu'on voit le plus souvent violée :
             sur plusieurs sites, un taux est un rapport de sommes. La moyenne des
             taux de Paris, Lyon et Marseille n'est pas le taux du groupe, et
             l'écart ne se voit pas à l'œil. */
          agregation:"rapport de la somme des numérateurs sur la somme des dénominateurs, jamais une moyenne de taux"
        })),
        limites: INDICATEURS_LIMITES,
        /* Les explications fournies par les sites quand une valeur a bougé de plus
           du seuil. Elles font partie du dictionnaire, pas d'une annexe : ce sont
           elles qui répondent à la question posée devant une courbe qui saute. */
        explications: c ? s.observations
          .filter(o => o.campagne === cid && o.commentaire)
          .map(o => ({ site: (api.etablissement(o.etablissement) || {}).nom || o.etablissement,
                       commentaire: o.commentaire,
                       ecarts: (o.ecarts || []).map(x =>
                         `${x.libelle} : ${x.variation > 0 ? "+" : ""}${Math.round(x.variation * 100)} %`) }))
          : []
      };
    },
    /* ------------------------------------------------------------------ */
    /* Le rapport de collecte                                             */
    /* ------------------------------------------------------------------ */
    /* Ce que la plateforme rend une fois que les sites ont répondu, et le seul
       endroit où elle apporte quelque chose que le tableur n'apporte pas : elle
       rassemble sans qu'on ait à relancer, elle additionne au bon niveau, et
       elle dit ce qui manque.

       Deux règles y sont tenues, et elles ne sont pas décoratives. Une valeur
       absente reste absente : écrire zéro à sa place transformerait « ce site
       n'a pas déclaré ses entrées » en « ce site n'a eu aucune entrée ». Et un
       taux consolidé est un rapport de sommes, jamais une moyenne de taux : la
       moyenne des taux de Paris, Lyon et Marseille n'est pas le taux du groupe,
       et l'écart ne se voit pas à l'œil.

       Ce que ce rapport n'est pas : une déclaration, une certification, une
       interprétation. Les chiffres sont ceux que les sites ont saisis, et la
       responsabilité de chacun reste chez celui qui l'a écrit. Riseva tient le
       classeur ; elle ne signe pas à la place du client. */
    rapportCollecte(cid){
      const c = api.campagne(cid); if (!c) return null;
      const etat = api.etatCampagne(cid);
      const repondus = etat.sites.filter(x => x.etat === "declare" || x.etat === "approuve");
      const sections = sectionsDe(c).map(r => {
        const champs = r.champs;
        const lignes = etat.sites.map(x => ({
          site: x.etablissement,
          etat: x.etat,
          valeurs: Object.fromEntries(champs.map(d => [d.cle,
            x.observation && x.observation.valeurs[d.cle] !== undefined
              && x.observation.valeurs[d.cle] !== null
              ? Number(x.observation.valeurs[d.cle]) : null])),
          commentaire: x.observation ? x.observation.commentaire : null
        }));
        /* Une somme n'a de sens que si l'on dit sur combien de sites elle porte.
           « 1 240 » sur quatre sites et « 1 240 » sur deux ne racontent pas la
           même chose, et c'est la première question qu'on pose devant un
           agrégat. */
        const totaux = Object.fromEntries(champs.map(d => {
          const vs = lignes.map(l => l.valeurs[d.cle]).filter(v => v !== null);
          return [d.cle, { somme: vs.length ? vs.reduce((a, b) => a + b, 0) : null,
                           sites: vs.length }];
        }));
        const manquants = champs.flatMap(d =>
          lignes.filter(l => l.valeurs[d.cle] === null
                             && (l.etat === "declare" || l.etat === "approuve"))
            .map(l => ({ champ: d.cle, libelle: d.libelle, site: l.site.nom })));
        return { ...r, lignes, totaux, manquants };
      });

      /* Les ratios se calculent sur les sommes du périmètre, et seulement si
         leurs deux termes sont eux-mêmes complets. Un taux calculé sur trois
         sites sur quatre est un taux faux qui a l'air juste. */
      const sommes = {};
      sections.forEach(r => Object.entries(r.totaux)
        .forEach(([k, v]) => { sommes[k] = v.somme; }));
      const complet = (cle) => {
        for (const r of sections) if (r.totaux[cle]) return r.totaux[cle].sites === repondus.length;
        return false;
      };
      const ratios = calculesDe(c).map(d => {
        const termes = String(d.num + " " + d.den).match(/[a-z_]+[a-z0-9_]*/g) || [];
        const utilisables = termes.filter(t => sommes[t] !== undefined);
        const tousLa = utilisables.length > 0 && utilisables.every(t => sommes[t] !== null);
        return { cle:d.cle, libelle:d.libelle, unite:d.unite, rubrique:d.rubrique,
                 formule:d.formule, note:d.note,
                 valeur: tousLa ? d.calcul(sommes) : null,
                 surTousLesSites: utilisables.every(complet) };
      });

      return {
        campagne: c,
        sections, ratios,
        sites: etat.sites.length,
        repondus: repondus.length,
        approuves: etat.approuves,
        sansReponse: etat.clos,
        /* « Complète » veut dire : tous les sites attendus ont répondu. C'est
           l'événement qui déclenche la notification et qui rend le rapport
           utilisable tel quel. */
        complete: etat.sites.length > 0 && repondus.length === etat.sites.length,
        effectifCouvert: repondus.reduce((n, x) => n + (x.etablissement.effectif || 0), 0),
        effectifTotal: etat.sites.reduce((n, x) => n + (x.etablissement.effectif || 0), 0),
        version: INDICATEURS.version,
        limites: INDICATEURS_LIMITES
      };
    },

    /* Les onglets d'un classeur, dans l'ordre où on veut les lire : d'abord ce
       que chaque site a répondu, rubrique par rubrique, puis les totaux, puis
       les définitions. Un tableur dont le premier onglet est un dictionnaire ne
       se lit pas. */
    classeurCollecte(cid){
      const r = api.rapportCollecte(cid); if (!r) return [];
      const onglets = r.sections.map(sec => ({
        nom: sec.libelle,
        lignes: [
          ["Site", "Ville", "Effectif", "État", ...sec.champs.map(d => `${d.libelle}${d.unite ? " (" + d.unite + ")" : ""}`), "Commentaire du site"],
          ...sec.lignes.map(l => [
            l.site.nom, l.site.ville || "", l.site.effectif || null,
            ({ attendu:"Pas de réponse", declare:"Saisi", approuve:"Approuvé",
               clos_sans_reponse:"Clos sans réponse" })[l.etat] || l.etat,
            ...sec.champs.map(d => l.valeurs[d.cle]),
            l.commentaire || ""
          ]),
          [],
          ["Total du périmètre", "", r.effectifCouvert, `${r.repondus} site(s) sur ${r.sites}`,
           ...sec.champs.map(d => sec.totaux[d.cle].somme), ""],
          ["Sites ayant renseigné", "", "", "",
           ...sec.champs.map(d => sec.totaux[d.cle].sites), ""]
        ]
      }));
      onglets.push({
        nom: "Ratios",
        lignes: [["Indicateur", "Valeur", "Unité", "Formule", "Calculé sur tous les sites", "Note"],
          ...r.ratios.map(x => [x.libelle,
            x.valeur === null ? null : Math.round(x.valeur * 100) / 100,
            x.unite || "", x.formule, x.surTousLesSites ? "oui" : "non", x.note])]
      });
      onglets.push({
        nom: "Définitions",
        lignes: [["Clé", "Rubrique", "Indicateur", "Unité", "Source attendue", "Ce que ça inclut", "Ce que ça exclut"],
          ...saisisDe(r.campagne).map(d => [d.cle, (rubrique(d.rubrique) || {}).libelle || d.rubrique,
            d.libelle, d.unite, d.source, d.inclut, d.exclut]),
          [],
          ["Ce que Riseva ne fait pas"],
          ...INDICATEURS_LIMITES.map(x => [x])]
      });
      return onglets;
    },

    approuverIndicateurs(cid, etid, uid){
      const o = api.observation(cid, etid);
      if (!o) throw new Error("Rien à approuver pour ce site.");
      if (o.etat !== "declare") throw new Error("Seule une saisie déclarée s'approuve.");
      if (o.saisi_par && o.saisi_par === uid)
        throw new Error("La personne qui a saisi ne peut pas approuver sa propre saisie.");
      o.etat = "approuve";
      o.approuve_par = uid;
      o.approuve_le = leJour();
      return o;
    },
    /* Ouvrir une campagne, c'est décider deux choses : sur quelle période on
       demande, et QUOI on demande. La seconde est la nouveauté. Un groupe qui
       lance sa première collecte veut les effectifs et la sécurité ; celui qui
       répond à un questionnaire client au mois d'août veut l'énergie et les
       déchets, et il ne veut pas repasser par un tableur pour ça.

       Les rubriques choisies sont écrites SUR la campagne, pas sur l'entreprise :
       ce qui est demandé varie d'une période à l'autre, et une campagne close
       doit continuer à dire ce qu'elle demandait à l'époque. Une campagne dont
       on changerait la liste après coup rendrait ses propres totaux illisibles. */
    ouvrirCampagne({ groupe, libelle, periode, debut, fin, echeance, rubriques } = {}){
      if (!groupe) throw new Error("Une campagne appartient à un groupe.");
      const lib = String(libelle || "").trim();
      if (lib.length < 3) throw new Error("Donnez un nom à la période, il sera lu par chaque site.");
      if (!debut || !fin || !echeance) throw new Error("Il manque une date.");
      if (fin < debut) throw new Error("La fin de la période précède son début.");
      const aujourdhui = leJour();
      /* On ne demande pas des chiffres pour une période qui n'a pas eu lieu : le
         site les invente ou ne répond pas, et les deux se ressemblent. */
      if (fin > aujourdhui)
        throw new Error("Cette période n'est pas terminée : les sites n'auraient rien à déclarer.");
      if (echeance <= aujourdhui)
        throw new Error("L'échéance est déjà passée : les sites n'auraient pas le temps de répondre.");
      const per = String(periode || lib).trim().slice(0, 20);
      if (s.campagnes.some(c => c.groupe === groupe && c.periode === per))
        throw new Error(`Une campagne « ${per} » existe déjà pour ce groupe.`);
      const rs = (Array.isArray(rubriques) ? rubriques : [])
        .filter(x => RUBRIQUES.some(r => r.cle === x));
      if (!rs.length) throw new Error("Choisissez au moins une rubrique à demander.");
      const c = { id:id("c"), groupe, periode:per, libelle:lib,
        rubriques: RUBRIQUES.filter(r => rs.includes(r.cle)).map(r => r.cle),
        debut, fin, echeance,
        ouverte_le: aujourdhui, etat:"ouverte" };
      s.campagnes.push(c);
      return c;
    },

    /* Une campagne arrivée à échéance se referme. Les sites qui n'ont pas répondu sont
       marqués comme tels : on ne recopie pas la période précédente à leur place. */
    cloreCampagne(cid){
      const e = api.etatCampagne(cid); if (!e) return null;
      /* Une période ne se clôt pas avant d'être finie. Sinon on demande le
         second semestre au mois d'août et on appelle « clos » un trimestre qui
         n'a pas eu lieu. */
      const aujourdhui = leJour();
      if (e.campagne.fin > aujourdhui)
        throw new Error(`La période court jusqu'au ${e.campagne.fin} : elle ne peut pas `
          + `être clôturée avant. Pour un point d'étape, ouvrez une campagne dédiée.`);
      e.sites.filter(x => x.etat === "attendu").forEach(x => {
        s.observations.push({ id:id("o"), campagne:cid, etablissement:x.etablissement.id,
          etat:"clos_sans_reponse", version:1, saisi_par:null, saisi_le:null,
          approuve_par:null, approuve_le:null, valeurs:{} });
      });
      e.campagne.etat = "close";
      return api.etatCampagne(cid);
    },

    /* Les taux, calculés. Sur un périmètre de plusieurs sites, c'est un rapport de
       sommes et jamais une moyenne de taux : la moyenne des taux de Paris, Lyon et
       Marseille n'est pas le taux du groupe, et l'écart ne se voit pas à l'œil. */
    /* `approuvesSeulement` décide si l'on regarde un aperçu de travail ou un
       chiffre publiable. Un rapport ne prend que de l'approuvé ; un écran de
       pilotage peut montrer le reste, à condition d'écrire que c'est provisoire. */
    indicateursDe({ campagne, etablissement = null, groupe = null, societe = null,
                    approuvesSeulement = false }){
      const c = api.campagne(campagne); if (!c) return null;
      let obs = s.observations.filter(o => o.campagne === campagne
        && (approuvesSeulement ? o.etat === "approuve"
                               : ["declare", "approuve"].includes(o.etat)));
      if (etablissement) obs = obs.filter(o => o.etablissement === etablissement);
      if (societe) obs = obs.filter(o =>
        (api.etablissement(o.etablissement) || {}).societe === societe);
      if (groupe){
        const ids = api.etablissementsDuGroupe(groupe).map(x => x.id);
        obs = obs.filter(o => ids.includes(o.etablissement));
      }
      /* Une valeur qu'aucun site n'a declaree vaut `null`, pas zero. La somme
         valait `obs.reduce(... || 0)`, ce qui rendait zero pour un indicateur
         que personne n'avait rempli : la fiche VSME imprimait « 0 embauche »
         pour une case jamais saisie, et cette fiche part chez un donneur
         d'ordre ou chez une banque.

         `sites` compte, pour chaque cle, combien de sites l'ont renseignee. Une
         somme n'a de sens que rapportee au nombre de sites qui la composent :
         c'est la meme regle que `rapportCollecte`, elle vaut ici aussi. */
      const somme = {}, sitesParCle = {};
      INDICATEURS.saisis.forEach(d => {
        const vs = obs.map(o => o.valeurs[d.cle])
                      .filter(v => v !== undefined && v !== null && v !== "")
                      .map(Number)
                      .filter(v => Number.isFinite(v));
        somme[d.cle] = vs.length ? vs.reduce((a, b) => a + b, 0) : null;
        sitesParCle[d.cle] = vs.length;
      });
      /* Un taux dont l'un des termes manque ne se calcule pas. Le calculer
         reviendrait a traiter l'absence comme un zero, ce que la ligne
         precedente vient precisement d'interdire : un taux de frequence sur un
         denominateur absent vaut l'infini, et arrondi il vaut n'importe quoi. */
      const calcules = {}, assise = {};
      INDICATEURS.calcules.forEach(d => {
        const termes = String(d.num + " " + d.den).match(/[a-z_]+[a-z0-9_]*/g) || [];
        const utiles = termes.filter(t => somme[t] !== undefined);
        const tousLa = utiles.length > 0 && utiles.every(t => somme[t] !== null);
        /* Meme complets, les termes peuvent ne pas porter sur les memes sites :
           un numerateur sur trois sites et un denominateur sur quatre donnent un
           taux faux qui a l'air juste. On le calcule quand meme, mais on dit sur
           quelle assise il repose. */
        assise[d.cle] = tousLa && utiles.every(t => sitesParCle[t] === obs.length);
        const v = tousLa ? d.calcul(somme) : null;
        calcules[d.cle] = v === null || !isFinite(v) ? null : Math.round(v * 100) / 100;
      });
      const tous = etablissement ? [api.etablissement(etablissement)].filter(Boolean)
        : (groupe ? api.etablissementsDuGroupe(groupe) : api.etablissements(societe || ""));
      const attendus = tous.length;
      /* Deux sites sur quatre, ce n'est pas la moitié du groupe : ça peut être
         vingt pour cent comme quatre-vingt-quinze. La couverture se dit donc
         aussi en effectifs, sinon le taux affiché ne veut rien dire. */
      const effectifTotal = tous.reduce((n, x) => n + (x.effectif || 0), 0);
      const idsRepondus = new Set(obs.map(o => o.etablissement));
      const effectifCouvert = tous.filter(x => idsRepondus.has(x.id))
        .reduce((n, x) => n + (x.effectif || 0), 0);
      return { campagne: c, somme, calcules,
               /* `sitesParCle` : sur combien de sites chaque somme repose.
                  `assise` : vrai quand un taux porte sur tous les sites qui ont
                  repondu, faux quand son perimetre est partiel. */
               sitesParCle, assise,
               sites: obs.length, attendus,
               effectifCouvert, effectifTotal,
               partEffectif: effectifTotal ? effectifCouvert / effectifTotal : 0,
               approuves: obs.filter(o => o.etat === "approuve").length,
               provisoire: obs.some(o => o.etat === "declare"),
               complet: obs.length === attendus && obs.every(o => o.etat === "approuve") };
    },

    /* Comparaison dans le temps, jamais entre sites : un classement sur la sécurité
       fabriquerait une incitation à sous-déclarer les accidents. */
    serieIndicateur(cle, { etablissement = null, groupe = null }){
      return api.campagnes(groupe || undefined)
        .slice()
        .sort((a, b) => a.debut.localeCompare(b.debut))
        .map(c => {
          const r = api.indicateursDe({ campagne: c.id, etablissement, groupe });
          const d = INDICATEURS.calcules.find(x => x.cle === cle);
          return { periode: c.libelle, campagne: c.id,
                   valeur: d ? (r ? r.calcules[cle] : null)
                             : (r ? r.somme[cle] ?? null : null) };
        });
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
      u.retire_le = leJour();
      const inv = api.invitationActive(u.org);
      if (inv && inv.utilisees > 0) inv.utilisees -= 1;
      api.tracer(u.org, uid, "retrait", null);
      return u;
    },

    /* Les comptes créés par un lien de site et pas encore rattachés pour de bon. */
    affectationsAConfirmer(eid, etid = null){
      return s.utilisateurs.filter(u => u.org === eid && !u.anonyme
        && u.affectation_confirmee === false
        && (!etid || u.etablissement === etid));
    },
    confirmerAffectation(uid, etid = null){
      const u = s.utilisateurs.find(x => x.id === uid);
      if (!u) throw new Error("Compte inconnu");
      if (etid){
        const et = api.etablissement(etid);
        if (!et || et.societe !== u.org) throw new Error("Établissement hors de la société");
        const si = api.sieges(u.org, { etablissement: etid });
        if (etid !== u.etablissement && si.restants <= 0)
          throw new Error("Le quota de ce site est complet.");
        u.etablissement = etid;
      }
      u.affectation_confirmee = true;
      api.tracer(u.org, uid, "affectation", (api.etablissement(u.etablissement) || {}).ville || "");
      return u;
    },

    inviterSalarie(org, nom, email){
      const { restants } = api.sieges(org);
      if (restants <= 0) throw new Error("Plus aucune place disponible sur cet abonnement");
      const u = { id:id("u"), nom, email, role:"salarie", org, points:0, actif:true, anonyme:false };
      s.utilisateurs.push(u); return u;
    },

    /* ---- Invitations par lien ----
       Deux niveaux, et jamais un seul. Le groupe alloue un quota à un établissement et
       envoie un lien *nominatif* au référent de ce site ; le référent, lui, produit le
       lien d'inscription de ses salariés, dans la limite de son quota.

       Sans cette séparation, un groupe se retrouve avec trois mille comptes ouverts par
       une personne qui ne connaît personne, et plus rien ne dit qui a autorisé quoi.
       Un lien de salarié ne confère jamais un rôle d'administration : c'est la règle qui
       fait qu'un lien qui fuite reste sans conséquence grave. */
    codeLien(prefixe){
      const base = (prefixe || "RISEVA").toUpperCase().normalize("NFD")
        .replace(/[^A-Z]/g, "").slice(0, 7) || "RISEVA";
      const suffixe = Array.from({ length: 4 }, (_, k) =>
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[(seq * 7 + k * 13 + s.invitations.length * 5) % 32]).join("");
      seq++;
      return `${base}-${suffixe}`;
    },
    creerInvitation(eid, places, etablissement = null){
      s.invitations
        .filter(i => i.entreprise === eid && !i.pour_referent
                  && (i.etablissement || null) === etablissement)
        .forEach(i => i.active = false);
      const e = api.entreprise(eid);
      const et = etablissement ? api.etablissement(etablissement) : null;
      const dispo = api.sieges(eid, { etablissement }).restants;
      const n = places || (et ? et.quota : api.sieges(eid).total);
      if (etablissement && n > (et ? et.quota : 0))
        throw new Error(`Ce site dispose de ${et ? et.quota : 0} places allouées.`);
      const inv = { id:id("i"), entreprise:eid, etablissement,
        code: api.codeLien(et ? `${e.nom}${et.ville}` : e.nom),
        places: n, utilisees:0, active:true, pour_referent:false,
        cree_le:leJour(),
        expire_le:new Date(Date.now() + 120 * 864e5).toISOString().slice(0,10) };
      s.invitations.unshift(inv);
      api.tracer(eid, null, "creation_lien",
        inv.code + (et ? `, ${et.nom} ${et.ville}` : "") + `, ${dispo} places libres`);
      return inv;
    },

    /* Le lien nominatif qui fait d'une personne le référent d'un site. Il ne crée pas
       de compte tout seul et ne se partage pas : il porte le nom et l'adresse de la
       personne visée, et il est journalisé au nom de celle qui l'a émis. */
    creerInvitationReferent(etid, nom, email){
      const et = api.etablissement(etid);
      if (!et) throw new Error("Établissement inconnu");
      if (!nom || !email) throw new Error("Un lien de référent est nominatif : nom et adresse.");
      s.invitations.filter(i => i.etablissement === etid && i.pour_referent)
        .forEach(i => i.active = false);
      const e = api.entreprise(et.societe);
      const inv = { id:id("i"), entreprise:et.societe, etablissement:etid,
        code: api.codeLien(`REF${et.ville}`), pour_referent:true,
        nom, email, places:1, utilisees:0, active:true,
        cree_le:leJour(),
        expire_le:new Date(Date.now() + 30 * 864e5).toISOString().slice(0,10) };
      s.invitations.unshift(inv);
      api.tracer(et.societe, null, "lien_referent", `${nom}, ${et.nom} ${et.ville}`);
      return inv;
    },

    /* L'acceptation : la personne devient référente de *son* site, et de rien d'autre. */
    accepterInvitationReferent(code){
      const inv = api.invitationParCode(code);
      if (!inv || !inv.pour_referent) throw new Error("Lien de référent invalide");
      if (!inv.active) throw new Error("Ce lien a été révoqué");
      const et = api.etablissement(inv.etablissement);
      const u = { id:id("u"), nom:inv.nom, email:inv.email, role:"site_referent",
                  org:inv.entreprise, etablissement:inv.etablissement, actif:true, anonyme:false };
      s.utilisateurs.push(u);
      et.referent = inv.nom; et.referent_mail = inv.email;
      inv.utilisees = 1; inv.active = false;
      api.tracer(inv.entreprise, u.id, "referent_site", `${et.nom} ${et.ville}`);
      return u;
    },
    /* ------------------------------------------------------------------ */
    /* Le CSE, en lecture                                                  */
    /* ------------------------------------------------------------------ */
    /* Le comité social et économique a un droit d'information sur la situation
       sociale et sur la santé et la sécurité (art. L. 2312-8 et L. 2312-9 du code
       du travail). Riseva n'est pas la BDESE et ne prétend pas la remplacer :
       elle donne un accès en lecture à ce qu'elle a déjà, sous une forme
       agrégée, pour que l'employeur n'ait pas à le recopier et que le CSE n'ait
       pas à le demander.

       Ce que cet accès ne doit jamais devenir, sous aucune pression : un moyen de
       savoir qui a fait quoi. Aucun nom de salarié, aucune mission individuelle,
       aucun don personnel — et un seuil de restitution sous lequel un agrégat
       désigne quelqu'un. */
    SEUIL_RESTITUTION: 5,
    /* Places ouvertes tant qu'aucun contrat n'est signé. Le même nombre qu'en
       base, dans `ouvrir_compte_entreprise`. */
    SIEGES_ESSAI: 10,
    creerInvitationCSE(eid, nom, email){
      const e = api.entreprise(eid);
      if (!e) throw new Error("Entreprise inconnue");
      if (!nom || !email) throw new Error("Un accès CSE est nominatif : nom et adresse.");
      s.invitations.filter(i => i.entreprise === eid && i.pour_cse)
        .forEach(i => i.active = false);
      const inv = { id:id("i"), entreprise:eid, etablissement:null,
        code: api.codeLien(`CSE${e.nom}`), pour_cse:true,
        nom, email, places:1, utilisees:0, active:true,
        cree_le:leJour(),
        expire_le:new Date(Date.now() + 30 * 864e5).toISOString().slice(0,10) };
      s.invitations.unshift(inv);
      api.tracer(eid, null, "lien_cse", `${nom}, ${e.nom}`);
      return inv;
    },
    accepterInvitationCSE(code){
      const inv = api.invitationParCode(code);
      if (!inv || !inv.pour_cse) throw new Error("Lien CSE invalide");
      if (!inv.active) throw new Error("Ce lien a été révoqué");
      const u = { id:id("u"), nom:inv.nom, email:inv.email, role:"cse",
                  org:inv.entreprise, etablissement:null, actif:true, anonyme:false };
      s.utilisateurs.push(u);
      inv.utilisees = 1; inv.active = false;
      api.tracer(inv.entreprise, u.id, "acces_cse", inv.code);
      return u;
    },
    /* Ce que le CSE lit, et rien d'autre. Un seul objet : deux vues divergentes
       du même périmètre finissent par se contredire devant les mêmes personnes. */
    dossierCSE(eid, { campagne = null } = {}){
      const e = api.entreprise(eid); if (!e) return null;
      const sites = api.etablissements(eid);
      const cs = api.campagnes((e.groupe || undefined))
                   .slice().sort((a, b) => b.debut.localeCompare(a.debut));
      /* La periode ouverte par defaut est la derniere CLOSE, pas la plus
         recente : une campagne encore ouverte n'a le plus souvent aucune saisie
         approuvee, et l'elu ouvrait son ecran sur « aucune donnee approuvee »
         alors que le semestre precedent, complet, etait a un clic. La fiche VSME
         choisit deja ainsi. */
      const cid = campagne
        || (cs.find(c => c.etat === "close") || cs[0] || {}).id
        || null;
      const ind = cid ? api.indicateursDe({ campagne: cid, societe: eid,
                                            approuvesSeulement: true }) : null;
      const pts = api.pointsDe(eid);
      const sal = api.salaries(eid).filter(x => !x.anonyme);
      const engages = sal.filter(x => api.pointsVisiblesEmployeur(x.id) > 0).length;
      const seuil = api.SEUIL_RESTITUTION;
      /* Ce que la base a calculé pour cet élu, quand elle l'a calculé. */
      const d = s.dossier_cse || null;
      return {
        entreprise: { id:e.id, nom:e.nom, effectif:e.effectif, secteur:e.secteur },
        saison: s.saison,
        campagne: cid ? api.campagne(cid) : null,
        campagnes: cs,
        indicateurs: ind,
        dictionnaire: cid ? api.dictionnaire(cid) : null,
        sites: sites.map(x => ({ nom:x.nom, ville:x.ville, effectif:x.effectif })),
        /* La participation est un agrégat, et elle reste muette sous le seuil :
           « un salarié engagé sur douze » dans un site de douze personnes, c'est
           une désignation. */
        /* En production, ces deux chiffres viennent de la BASE : un compte CSE ne
           lit ni la liste des salariés ni les événements, et les dériver d'ici
           donnait zéro — donc « moins de cinq personnes » affiché en permanence à
           une société qui en comptait cent quatre-vingts. */
        participation: d
          ? (d.participation_sous_seuil ? null
             : { engages: d.engages, effectif: d.effectif, taux: Number(d.participation) })
          : (engages >= seuil
             ? { engages, effectif: e.effectif || sal.length,
                 taux: Math.round((engages / Math.max(e.effectif || sal.length, 1)) * 1000) / 10 }
             : null),
        seuil,
        /* La sécurité, en agrégat et sous seuil. Le registre ligne à ligne se
           réidentifie : une date, une zone et un nombre de journées d'arrêt
           suffisent sur un petit site. Un décompte par type ne le permet pas —
           au-dessus du seuil. En dessous, on ne rend rien plutôt qu'un chiffre :
           « un accident de manutention » dans une société de douze personnes
           désigne quelqu'un. */
        securite: (() => {
          if (d) return {
            sous_seuil: !!d.securite_sous_seuil,
            motif_seuil: d.motif_seuil || null,
            pareto: (d.pareto || []).map(x => ({ type: x.type, n: Number(x.n) })),
            total: { evenements: d.evenements,
                     at_avec_arret: d.at_avec_arret, at_sans_arret: d.at_sans_arret,
                     at_trajet: d.at_trajet, jours_arret: d.jours_arret,
                     sans_soin: d.sans_soin },
            sites_sans_registre: d.sites_sans_registre || []
          };
          const sy = api.syntheseSecurite({ societe: eid,
            debut: s.saison.debut, fin: s.saison.fin });
          /* Deux conditions, pas une. Cinq EVENEMENTS ne sont pas cinq
             PERSONNES : le meme salarie peut en declarer cinq, et le registre ne
             conserve justement aucune identite qui permettrait de le savoir. Le
             compte d'evenements ne peut donc pas servir de plancher de
             reidentification a lui seul. Ce qui borne le risque, c'est la taille
             du perimetre : dans une societe de quatre personnes, « trois
             accidents de manutention » designe quelqu'un quel que soit le nombre
             d'evenements. On exige donc les deux, et l'ecran dit lequel manque. */
          /* Le repli ne peut PAS être `sal.length` : un compte CSE ne reçoit
             aucune liste nominative — `mon_equipe()` l'exclut, et c'est voulu —
             donc `salaries()` rend zéro pour le seul rôle qui appelle cet écran.
             On replie sur la somme des effectifs de sites, qui, elle, existe
             pour un compte CSE. Et si aucun effectif n'est connu nulle part, on
             ne prétend pas qu'il est sous le seuil : on dit qu'il manque. */
          const effSites = sites.reduce((n, x) => n + (x.effectif || 0), 0);
          const effectif = e.effectif || effSites || null;
          if (effectif === null)
            return { sous_seuil: true, pareto: [], total: sy.total,
                     motif_seuil: "effectif_inconnu",
                     sites_sans_registre: sy.sites_sans_registre };
          if (sy.total.evenements < seuil || effectif < seuil)
            return { sous_seuil: true, pareto: [], total: sy.total,
                     motif_seuil: effectif < seuil ? "effectif" : "evenements",
                     sites_sans_registre: sy.sites_sans_registre };
          return { sous_seuil: false, pareto: sy.pareto, total: sy.total,
                   motif_seuil: null,
                   sites_sans_registre: sy.sites_sans_registre };
        })(),
        points: pts.retenu,
        rapports: api.rapports(eid).filter(r => r.etat === "genere"),
        /* Ce que le CSE ne verra pas ici, écrit à l'écran plutôt que deviné. */
        exclus: [
          "Aucun nom de salarié, aucune mission individuelle, aucun don personnel.",
          `Aucun agrégat de participation portant sur moins de ${seuil} salariés.`,
          /* Ce que le produit sait tenir, ecrit exactement. La phrase precedente
             — « aucun agregat portant sur moins de 5 personnes » — promettait un
             plancher que le registre ne peut pas mesurer, puisqu'il ne garde
             aucune identite. */
          `Aucun détail du registre de sécurité sous ${seuil} événements, ni dans une `
          + `société de moins de ${seuil} salariés, et jamais ligne à ligne.`,
          "Aucune donnée de santé : ni diagnostic, ni nature de lésion, ni identité d'une victime.",
          "Riseva n'est pas la base de données économiques, sociales et environnementales de l'entreprise et ne s'y substitue pas."
        ]
      };
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
    /* Aucun domaine déclaré : PERSONNE n'entre. C'est la règle du serveur
       (`rejoindre_entreprise` refuse dès qu'aucune ligne ne correspond) ; ici
       elle disait l'inverse — « aucune restriction, tout le monde entre » — et
       les deux moteurs se contredisaient sur le seul contrôle d'accès du
       produit. Un client lisait « Ouvert à tous » sur son écran, diffusait son
       lien, et chacun de ses salariés se voyait répondre « Cette adresse
       n'appartient pas à l'entreprise » sans qu'aucun écran ne dise pourquoi.
       Une liste vide est une porte fermée, pas une porte sans serrure. */
    domaineAutorise(eid, email){
      const l = api.domaines(eid);
      if (!l.length) return false;
      const d = String(email || "").split("@")[1];
      return !!d && l.includes(d.toLowerCase());
    },

    /* Journal des accès : qui a rejoint, quand, avec quel lien. */
    acces: (eid) => s.acces.filter(a => !eid || a.entreprise === eid)
                          .sort((x, y) => String(y.date).localeCompare(String(x.date))),
    tracer(entreprise, utilisateur, quoi, code){
      s.acces.unshift({ id:id("ac"), entreprise, utilisateur, quoi, code,
        date:leJour() });
    },

    /* Inscription d'un salarié depuis le lien public. */
    rejoindre(code, nom, email){
      const inv = api.invitationParCode(code);
      if (!inv) throw new Error("Ce lien n'existe pas ou a été révoqué");
      if (!inv.active) throw new Error("Ce lien a été désactivé par l'entreprise");
      if (inv.expire_le < leJour()) throw new Error("Ce lien a expiré");
      if (inv.utilisees >= inv.places) throw new Error("Toutes les places de ce lien ont été prises");
      if (!api.domaineAutorise(inv.entreprise, email)){
        const l = api.domaines(inv.entreprise);
        throw new Error("Ce lien n'accepte que les adresses en @" + l.join(", @"));
      }
      const dejaLa = s.utilisateurs.find(u => u.email && email &&
        u.email.toLowerCase() === email.toLowerCase());
      if (dejaLa) throw new Error("Un compte existe déjà avec cette adresse");
      if (inv.pour_referent)
        throw new Error("Ce lien nomme un référent de site : il s'accepte depuis la page dédiée");
      /* Une place se prend dans le quota du site quand le lien en porte un. Sinon le
         premier établissement servi consommerait les places de tous les autres. */
      const { restants } = api.sieges(inv.entreprise, { etablissement: inv.etablissement || null });
      if (restants <= 0) throw new Error(inv.etablissement
        ? "Le quota de ce site est complet. Votre référent peut en demander davantage."
        : "L'abonnement de cette entreprise n'a plus de place");
      /* Un domaine de messagerie partagé par tout le groupe ne dit rien du site :
         n'importe qui peut utiliser le lien de Lyon. Le quota empêche de dépasser
         cent dix comptes, il n'empêche pas une mauvaise affectation — et une
         mauvaise affectation fausse ensuite le score, les rapports et les droits.
         Le compte est donc créé, mais son rattachement attend un clic du référent
         du site. Tant qu'il n'est pas confirmé, la personne peut tout consulter et
         ne peut pas s'engager : ses points iraient au mauvais endroit. */
      const u = { id:id("u"), nom, email, role:"salarie", org:inv.entreprise,
                  etablissement: inv.etablissement || null,
                  affectation_confirmee: !inv.etablissement,
                  points:0, actif:true, anonyme:false };
      s.utilisateurs.push(u);
      inv.utilisees += 1;
      api.tracer(inv.entreprise, u.id, "inscription", inv.code);
      return { utilisateur:u, entreprise:api.entreprise(inv.entreprise) };
    },

    /* ---- Création de compte ---- */
    creerCompteEntreprise({ entreprise, effectif, nom, email, secteur, ville }){
      /* Un compte ouvert en libre-service n'a rien acheté : il ouvrait pourtant
         autant de places que l'effectif déclaré, c'est-à-dire tout le produit,
         gratuitement et pour la saison entière. Les places de l'essai sont
         plafonnées ; la signature du contrat les porte au nombre convenu. */
      const eff = Number(effectif) || 0;
      const e = { id:id("e"), nom:entreprise, effectif:eff,
        sieges:Math.min(eff, api.SIEGES_ESSAI), essai:true,
        points:0, secteur:secteur || "", ville:ville || "" };
      s.entreprises.push(e);
      /* Un périmètre, même d'une seule société. Le modèle est à trois étages —
         groupe, société, établissement — et la collecte d'indicateurs s'attache
         au premier. Sans ce périmètre, une entreprise qui vient de s'inscrire ne
         peut ouvrir aucune collecte : « une campagne appartient à un groupe ».
         Une société seule n'en voit rien, l'interface ne parle de groupe qu'à
         partir de deux sociétés. Le jour où elle en rachète une, il est déjà là. */
      const g = { id:id("g"), nom:entreprise, societe_mere:e.id,
                  classement_sites:false,
                  cree_le:leJour() };
      s.groupes.push(g);
      e.groupe = g.id;
      const u = { id:id("u"), nom, email, role:"entreprise_admin", org:e.id,
                  groupe:g.id, actif:true };
      s.utilisateurs.push(u);
      const inv = api.creerInvitation(e.id, e.sieges);
      return { entreprise:e, groupe:g, utilisateur:u, invitation:inv };
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
      const n = { id:id("p"), etat:"preinscrite", date:leJour(), ...p };
      s.preinscriptions.unshift(n); return n;
    },
    /* Vérification d'éligibilité : datée, avec échéance de revérification.
       Une association jamais revue depuis plus d'une saison est signalée. */
    validerAssociation(aid){
      const a = s.associations.find(x => x.id === aid);
      /* Un contrôle bloquant — structure fermée au registre, numéro introuvable,
         dénomination sans rapport — interdit la mise en ligne tant qu'il n'a pas
         été refait. L'absence de contrôle, elle, n'est pas bloquante : neuf
         associations déclarées sur dix n'ont pas de SIREN, et les exclure
         reviendrait à ne garder que les grosses. */
      const ct = api.dernierControle(aid);
      /* Riseva promet publiquement de vérifier l'enregistrement administratif de
         chaque structure AVANT de la rendre visible. Tant qu'aucun contrôle n'a
         été consigné, cette phrase est fausse : la mise en ligne se faisait sur
         la seule confiance de celui qui cliquait. Un contrôle reste possible même
         sans SIREN — il se conclut alors « numéro absent », et c'est une réponse
         datée, conservée, opposable. Exiger qu'il existe n'exclut donc aucune
         petite association : ça oblige seulement à avoir regardé. */
      if (!ct)
        throw new Error("Aucun contrôle au registre n'a encore été consigné pour cette "
          + "association. Faites-le avant la mise en ligne, même s'il conclut « numéro "
          + "absent » : c'est ce que Riseva promet publiquement de faire.");
      if (ct.bloquant)
        throw new Error("Le registre public dit : « "
          + ETATS_CORRESPONDANCE[ct.etat].label.toLowerCase()
          + " ». Refaites le contrôle ou corrigez le numéro avant la mise en ligne.");
      if (a){
        a.valide = true; a.suspendue = false; a.motif_suspension = null;
        a.verifiee_le = leJour();
        const d = minuit(); d.setFullYear(d.getFullYear() + 1);
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
      const auj = leJour();
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
      /* La FILE RÉELLE. Tout ce qui précède est reconstruit depuis l'état ; la
         table `envoi`, elle, porte ce que la nuit a effectivement enfilé et ce
         que la fonction d'envoi a effectivement fait — rapports, rappels de
         collecte, reçus, décisions de modération. L'écran affirme « si un message
         n'apparaît pas ici, c'est qu'il ne part pas », et ces quatre familles-là
         n'y apparaissaient jamais : elles partent pourtant, et une décision de
         modération qui part sans trace vérifiable est exactement ce que le DSA
         demande de pouvoir montrer. */
      s.envois.forEach(e => j.push({
        date: e.date, type: e.type,
        vers: e.destinataire
              || (e.association ? (api.association(e.association) || {}).nom : null)
              || (e.entreprise ? (api.entreprise(e.entreprise) || {}).nom : null)
              || "sans destinataire",
        sujet: e.sujet, etat: e.etat || "à envoyer" }));
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
    /* Confirmé et estimé ne se mélangent pas. Une association qui répond donne un
       chiffre : c'est du confirmé. Une association qui ne répond pas laisse la
       mission se valider toute seule au bout de quatorze jours : l'entreprise
       marque ses points, mais personne n'a compté les arbres, donc le chiffre
       reste une estimation et se dit comme telle. Additionner les deux
       transformerait un silence en résultat. */
    realiseDe(m){
      const a = api.annonceDe(m);
      if (!a || !a.impact || !a.impact.unite) return null;
      if (!["validee", "validee_auto"].includes(m.etat)) return null;
      const attendu = Math.round((Number(m.quantite) || 0) * (Number(a.impact.par_unite) || 0));
      const declare = m.realise !== undefined && m.realise !== null;
      const confirme = declare && m.etat === "validee";
      return {
        unite: a.impact.unite,
        quantite: confirme ? Math.max(0, Number(m.realise)) : 0,
        estime: confirme ? 0 : attendu,
        attendu, declare, confirme
      };
    },

    /* Une mission appartient à la saison dans laquelle elle a été réalisée. Les
       compteurs affichés sur une annonce ouverte doivent s'y tenir : la
       plateforme a un passé, et compter les engagements des saisons précédentes
       sur une annonce de cette année donne « 7 engagements » en face de
       « 4 places sur 6 », ce qui ne veut rien dire. */
    deLaSaison(m, sa = s.saison){
      return !!m && !!m.date && m.date >= sa.debut && m.date <= sa.fin;
    },

    /* Cumul par unité. Filtres possibles : entreprise, association, salarié, période. */
    realisations({ entreprise, asso, salarie, depuis, jusqua } = {}){
      const total = {}, estime = {};
      let missions = 0, sansReponse = 0;
      s.missions.forEach(m => {
        /* Vu depuis l'entreprise, un don personnel n'existe pas : ni ses points,
           ni son montant, ni son resultat. Les soixante-huit colis finances par
           le versement prive d'un salarie entraient dans « ce que vos equipes
           ont produit » et dans la fiche VSME, document qui sort de l'entreprise
           — pendant que le seuil d'agregation refusait d'en dire le nombre. */
        if (entreprise && api.estDonPersonnel(m)) return;
        if (entreprise && m.entreprise !== entreprise) return;
        if (salarie && m.salarie !== salarie) return;
        if (depuis && m.date < depuis) return;
        if (jusqua && m.date > jusqua) return;
        const a = api.annonceDe(m);
        if (asso && (!a || a.asso !== asso)) return;
        const r = api.realiseDe(m);
        if (!r) return;
        if (r.quantite){ total[r.unite] = (total[r.unite] || 0) + r.quantite; missions++; }
        if (r.estime){ estime[r.unite] = (estime[r.unite] || 0) + r.estime; sansReponse++; }
      });
      return {
        parUnite: total,
        estimeParUnite: estime,
        missions, sansReponse,
        liste: Object.entries(total)
          .map(([unite, quantite]) => ({ unite, quantite, estime: estime[unite] || 0,
            ...(UNITES[unite] || { un:unite, pl:unite }) }))
          .sort((x, y) => y.quantite - x.quantite)
      };
    },

    /* ------------------------------------------------------------------ */
    /* Tous ensemble                                                      */
    /* ------------------------------------------------------------------ */
    /* Le total du réseau, toutes entreprises confondues. Aucun nom, aucune
       entreprise nommée, aucun salarié identifiable : ce sont des compteurs.
       C'est le même moteur d'addition que pour une entreprise seule, sans
       filtre — si le calcul d'une entreprise est juste, celui-ci l'est aussi. */
    reseau({ depuis, jusqua } = {}){
      const parUnite = api.realisations({ depuis, jusqua });
      const entreprises = new Set(), assos = new Set(), gens = new Set(), villes = new Set();
      let missions = 0, heures = 0, euros = 0;
      s.missions.forEach(m => {
        if (!["validee", "validee_auto"].includes(m.etat)) return;
        if (depuis && m.date < depuis) return;
        if (jusqua && m.date > jusqua) return;
        const a = api.annonceDe(m);
        missions++;
        if (m.entreprise) entreprises.add(m.entreprise);
        if (m.salarie) gens.add(m.salarie);
        if (a){
          assos.add(a.asso);
          if (a.lieu) villes.add(a.lieu);
          const q = Number(m.quantite) || 0;
          heures += heuresPour(a.type, q);
          if (estArgent(a.type)) euros += q;
        }
      });
      return {
        missions, heures, euros,
        entreprises: entreprises.size,
        associations: assos.size,
        salaries: gens.size,
        villes: villes.size,
        realisations: parUnite,
        arbres: parUnite.parUnite.arbre || 0
      };
    },

    /* La courbe cumulée d'une unité, mois par mois. Sert au dessin de la forêt :
       le décompte est vrai, c'est le dessin qui le raconte. */
    cumulParMois(unite, { entreprise } = {}){
      const parMois = {};
      s.missions.forEach(m => {
        if (entreprise && m.entreprise !== entreprise) return;
        const r = api.realiseDe(m);
        if (!r || r.unite !== unite || !r.quantite) return;
        const mois = String(m.date).slice(0, 7);
        parMois[mois] = (parMois[mois] || 0) + r.quantite;
      });
      let cumul = 0;
      return Object.keys(parMois).sort().map(mois => {
        cumul += parMois[mois];
        return { mois, ajout: parMois[mois], cumul };
      });
    },

    /* Les associations avec lesquelles une entreprise a le plus travaillé.
       Les dons personnels des salariés en sont exclus : la cause d'une
       association peut trahir une conviction ou un état de santé, et
       l'employeur n'a pas à la déduire d'un palmarès. */
    associationsPreferees(eid, { limite = 3 } = {}){
      const par = new Map();
      s.missions.forEach(m => {
        if (m.entreprise !== eid) return;
        if (!["validee", "validee_auto"].includes(m.etat)) return;
        if (api.estDonPersonnel(m)) return;
        const a = api.annonceDe(m);
        if (!a) return;
        const asso = s.associations.find(x => x.id === a.asso);
        if (!asso) return;
        const e = par.get(asso.id) || {
          asso, missions: 0, points: 0, salaries: new Set(), parUnite: {}, derniere: ""
        };
        e.missions++;
        e.points += Number(m.points) || 0;
        if (m.salarie) e.salaries.add(m.salarie);
        if (m.date > e.derniere) e.derniere = m.date;
        const r = api.realiseDe(m);
        if (r && r.quantite) e.parUnite[r.unite] = (e.parUnite[r.unite] || 0) + r.quantite;
        par.set(asso.id, e);
      });
      return [...par.values()]
        .map(e => ({
          ...e,
          salaries: e.salaries.size,
          impacts: Object.entries(e.parUnite)
            .map(([unite, quantite]) => ({ unite, quantite, ...(UNITES[unite] || { un:unite, pl:unite }) }))
            .sort((x, y) => y.quantite - x.quantite)
        }))
        /* Par activité récente, pas par points. Classer des associations au
           mérite serait un palmarès, et ce n'est pas ce que ce produit vend. */
        .sort((a, b) => String(b.derniere).localeCompare(String(a.derniere))
                     || b.missions - a.missions)
        .slice(0, limite);
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

    /* Le miroir de `associationsProches` : les entreprises abonnees dont un site
       se trouve dans le rayon d'une association. C'est la question que pose
       toute association avant de s'inscrire — « est-ce que quelqu'un viendra ? »
       — et la page vitrine promet de lui repondre. Une promesse sans le chiffre
       derriere est une promesse qu'on ne tient pas.

       On compte les SITES, pas les sieges sociaux : une entreprise parisienne
       dont l'usine est a douze kilometres compte, et c'est l'usine qui enverra
       du monde. Une entreprise dont aucun site n'est situe n'est pas comptee :
       on ne sait pas ou elle est, et l'annoncer serait mentir dans le bon sens. */
    entreprisesAutour(aid, { rayon = null } = {}){
      const asso = api.association(aid);
      if (!asso) return { entreprises: 0, sites: 0, salaries: 0, plusProche: null, rayon: 0 };
      const r = rayon == null ? api.RAYON_OFFRE_KM : rayon;
      const ici = api.coordsDe(asso);
      const proches = [];
      api.entreprises().forEach(e => {
        const sites = api.etablissements(e.id)
          .map(et => ({ et, d: distanceKm(ici, api.coordsDe(et)) }))
          .filter(x => x.d != null && x.d <= r);
        if (sites.length) proches.push({ entreprise: e, sites });
      });
      const toutes = proches.flatMap(x => x.sites.map(y => y.d));
      return {
        entreprises: proches.length,
        sites: toutes.length,
        salaries: proches.reduce((n, x) =>
          n + x.sites.reduce((m, y) => m + (y.et.effectif || 0), 0), 0),
        plusProche: toutes.length ? Math.round(Math.min(...toutes)) : null,
        rayon: r
      };
    },

    /* ---- L'offre associative autour d'un site ----
       La question qu'un responsable RSE se pose au bout de trois mois est
       « pourquoi ça ne prend pas ». L'entonnoir d'adoption lui dit à quelle
       marche il perd du monde ; il écrit même « l'offre locale est trop loin ou
       ne correspond pas » comme cause probable. Mais il l'ÉCRIT sans jamais la
       MESURER, et une cause qu'on suggère sans la chiffrer n'est qu'une excuse
       polie.

       Ce que cet écran mesure est ce qui décide du renouvellement, et ce n'est
       pas la bonne volonté des équipes :

       — LA DISTANCE. Un site industriel est en périphérie ou en zone rurale.
         Si les seules associations actives sont à trente-cinq kilomètres,
         personne n'ira après sa journée. Ce n'est pas un problème d'engagement,
         c'est un problème de géographie, et aucune relance interne ne le règle.

       — LE JOUR. Un chef d'atelier ne libère pas un opérateur en 3×8 un mardi à
         quatorze heures. Si toutes les annonces tombent en semaine ouvrée, une
         grande part de l'effectif est mécaniquement exclue — et le taux de
         participation qu'on lui reprochera mesurera en réalité le calendrier
         des associations.

       — LE FORMAT. Un don de matériel ne demande aucune disponibilité de
         personne : c'est la seule voie qui reste ouverte quand les deux
         contraintes précédentes se cumulent.

       Aucun de ces trois chiffres ne juge le client. Ils désignent ce que Riseva
       doit aller chercher sur le terrain avant de reprocher quoi que ce soit à
       qui que ce soit. */
    RAYON_OFFRE_KM: 30,
    /* En dessous, l'offre est trop mince pour qu'une saison prenne. Le seuil est
       exprimé pour cent salariés : trois annonces suffisent à un site de vingt
       personnes et ne suffisent pas à un site de quatre cents. */
    OFFRE_MIN_POUR_CENT: 4,

    offreLocale(etid, { rayon = null } = {}){
      const et = api.etablissement(etid);
      if (!et) return null;
      const r = rayon == null ? api.RAYON_OFFRE_KM : rayon;
      const depuis = api.coordsDe(et);
      const jour = (d) => { const x = new Date(d); return isNaN(x) ? null : x.getDay(); };

      const toutes = api.annonces({ ouvertes: true })
        .map(a => {
          const asso = api.association(a.asso);
          return { ...a,
            asso_nom: (asso || {}).nom || "",
            distance: distanceKm(depuis, api.coordsDe(asso)),
            jour: a.date ? jour(a.date) : null };
        })
        .filter(a => (api.association(a.asso) || {}).valide);

      /* Une annonce sans coordonnées n'est pas comptée comme proche : on ne sait
         pas où elle est. Elle n'est pas non plus perdue — elle est comptée à
         part, parce que le remède est de géocoder l'association, pas de la
         retirer. */
      const situees = toutes.filter(a => a.distance != null);
      const proches = situees.filter(a => a.distance <= r)
        .sort((x, y) => x.distance - y.distance);
      const dists = proches.map(a => a.distance).sort((x, y) => x - y);
      const mediane = dists.length
        ? (dists.length % 2 ? dists[(dists.length - 1) / 2]
           : Math.round((dists[dists.length / 2 - 1] + dists[dists.length / 2]) / 2))
        : null;

      const parFormat = { temps: 0, animal: 0, materiel: 0, argent: 0 };
      let semaine = 0, weekend = 0, sansDate = 0;
      proches.forEach(a => {
        const f = (BAREME[a.type] || {}).famille;
        if (parFormat[f] !== undefined) parFormat[f] += 1;
        if (a.jour == null) sansDate += 1;
        else if (a.jour === 0 || a.jour === 6) weekend += 1;
        else semaine += 1;
      });

      /* Les associations proches qui n'ont rien publié : c'est la liste de
         travail, pas un reproche. Une association qui ne publie pas n'a
         généralement pas dit non, elle n'a pas eu le temps d'écrire l'annonce. */
      const aRelancer = api.associations()
        .filter(a => a.valide && !a.suspendue)
        .map(a => ({ id: a.id, nom: a.nom, ville: a.ville,
                     distance: distanceKm(depuis, api.coordsDe(a)),
                     ouvertes: api.annonces({ asso: a.id, ouvertes: true }).length }))
        .filter(a => a.distance != null && a.distance <= r && a.ouvertes === 0)
        .sort((x, y) => x.distance - y.distance);

      const attendu = Math.max(2, Math.round(
        (et.effectif || 0) / 100 * api.OFFRE_MIN_POUR_CENT));

      /* Un seul verdict, et il ne parle jamais des salariés. */
      let verdict = "suffisante";
      if (!proches.length) verdict = "aucune";
      else if (proches.length < attendu) verdict = "mince";
      /* Une offre qui n'existe qu'en semaine et qui ne propose rien qui se fasse
         à distance est inaccessible à qui travaille en poste. Le matériel, le
         parrainage et l'adoption ne demandent pas d'être libre un mardi. */
      else if (semaine && !weekend && !parFormat.materiel && !parFormat.animal)
        verdict = "inaccessible";

      /* Un besoin de financement se compte en euros, pas en places : additionner
         4 000 € restants et 6 ordinateurs donnerait 4 006 places, c'est-à-dire un
         chiffre qui ne veut rien dire et qui flatte. */
      const places = proches
        .filter(a => !estArgent(a.type))
        .reduce((n, a) => n + (Number(a.restant) || 0), 0);

      return {
        site: { id: et.id, nom: et.nom, ville: et.ville, effectif: et.effectif || 0 },
        signalee: api.zoneSignalee(et.id),
        /* Deux distances pour deux annonces n'apprennent rien. Le nombre de
           places encore prenables, si. */
        places,
        situe: depuis != null,
        rayon: r, attendu, verdict,
        ouvertes: proches.length,
        mediane,
        plusProche: proches.length ? proches[0].distance : null,
        parFormat,
        semaine, weekend, sansDate,
        /* Ce qu'on ne sait pas placer sur une carte, on le dit. */
        nonSituees: toutes.length - situees.length,
        aRelancer: aRelancer.slice(0, 8),
        aRelancerTotal: aRelancer.length,
        exemples: proches.slice(0, 4).map(a => ({
          id: a.id, titre: a.titre, asso: a.asso_nom, type: a.type,
          distance: a.distance, date: a.date || null }))
      };
    },

    /* ---- Ce qu'on fait du constat ----
       Un diagnostic qui s'arrête au diagnostic est une excuse préparée
       d'avance : le client lit « offre trop mince », comprend « ce n'est pas de
       notre faute » et retient surtout que personne ne fera rien. Deux issues,
       donc, et elles vont dans deux directions opposées.

       SIGNALER LA ZONE, c'est nous donner du travail. Le site est mis dans la
       file de prospection associative de son bassin, et l'écran porte la date du
       signalement. Aucune promesse de délai n'est faite, parce qu'aucun délai ne
       dépend de nous : une association décide seule de publier ou non.

       INVITER UNE ASSOCIATION, c'est reconnaître que le site en sait plus que
       nous. Une usine de province connaît son écosystème mieux que n'importe
       quelle recherche : elle soutient déjà un club, fait travailler l'ESAT
       voisin, croise la banque alimentaire. Le texte est écrit d'avance et
       nominatif — le référent n'a rien à rédiger, et c'est la seule raison pour
       laquelle ce genre de bouton sert à quelque chose. */
    signalerZone(etid, uid = null){
      const et = api.etablissement(etid);
      if (!et) throw new Error("Site inconnu");
      const deja = api.zoneSignalee(etid);
      if (deja) return deja;
      const z = { id: id("z"), etablissement: etid, societe: et.societe,
                  par: uid, le: leJour(), traite_le: null };
      s.sourcing.unshift(z);
      return z;
    },
    zoneSignalee: (etid) => s.sourcing.find(z => z.etablissement === etid) || null,
    zonesSignalees: (eid) => s.sourcing.filter(z => !eid || z.societe === eid),

    /* Le message d'invitation, écrit ici et pas dans l'écran : il part par
       courriel chez des gens que nous ne connaissons pas, et il engage Riseva
       autant qu'une page publique. Il ne promet rien qu'on ne tienne — pas
       d'argent garanti, pas de bénévoles garantis — et il nomme le site
       d'où part l'invitation, parce qu'une association répond à un voisin,
       pas à une plateforme. */
    texteInvitationAsso(etid){
      const et = api.etablissement(etid);
      if (!et) return { objet: "", corps: "" };
      const soc = api.entreprise(et.societe) || {};
      const lieu = et.ville ? ` à ${et.ville}` : "";
      const objet = `Vos besoins, portés aux salariés de ${soc.nom || "notre entreprise"}${lieu}`;
      const corps =
        `Bonjour,\n\n`
        + `Nous sommes ${soc.nom || "une entreprise"}, sur le site de ${et.nom}${lieu}. `
        + `Nous participons à Riseva, une plateforme sur laquelle des associations publient `
        + `des besoins concrets, une demi-journée de bras, du matériel, un besoin de `
        + `financement, auxquels nos salariés peuvent répondre.\n\n`
        + `Si cela vous intéresse, l'inscription est gratuite et le restera, il n'y a `
        + `aucune exclusivité, et Riseva ne prélève aucune commission sur vos dons : `
        + `un virement va du donateur à votre compte, sans passer par elle.\n\n`
        + `Ce que nous ne pouvons pas vous promettre : que quelqu'un vienne. Cela dépend `
        + `de nos salariés, et personne ne peut le garantir à l'avance. Ce que nous pouvons `
        + `vous dire, c'est que sans annonce publiée près d'ici, la question ne se pose même `
        + `pas.\n\n`
        + `Tout est expliqué là : https://riseva.fr/associations.html\n\n`
        + `Bien à vous,`;
      return { objet, corps };
    },

    /* La même chose pour tous les sites d'une société, du plus mal servi au
       mieux servi : c'est dans cet ordre qu'on doit s'en occuper. */
    offreParSite(eid){
      const rang = { aucune: 0, inaccessible: 1, mince: 2, suffisante: 3 };
      return api.etablissements(eid)
        .map(et => api.offreLocale(et.id))
        .filter(Boolean)
        .sort((x, y) => (rang[x.verdict] - rang[y.verdict]) || (x.ouvertes - y.ouvertes));
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

    /* Deux champs disent la même chose selon l'époque du jeu de données :
       `origine`, posé par le circuit de don, et `pour_le_compte_de`, hérité. On
       lit le premier s'il existe — sinon un don d'entreprise passé par le
       nouveau circuit serait pris pour un don personnel, et disparaîtrait de
       l'assiette de mécénat de son propre payeur. */
    estDonPersonnel(m){
      const a = api.annonceDe(m);
      if (!a || !estArgent(a.type)) return false;
      if (m.origine) return m.origine !== "entreprise";
      return m.pour_le_compte_de !== "entreprise";
    },

    /* Missions telles que l'employeur a le droit de les voir. */
    missionsVueEmployeur(eid){
      return api.missions({ entreprise: eid }).map(m => {
        if (!api.estDonPersonnel(m)) return m;
        /* Les points partent aussi : au bareme d'un point par tranche de dix
           euros, ils redonnent le montant a dix euros pres. Masquer la quantite
           en laissant les points ne masque rien. La date reste au mois : le jour
           exact, croise avec un releve bancaire, designe la personne. */
        return { ...m, masquee: true, salarie: null, annonce: m.annonce,
                 quantite: null, points: null,
                 date: m.date ? String(m.date).slice(0, 7) + "-01" : null };
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
        recu_le: leJour(), decide_le:null };
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
      sg.decide_le = leJour();
      if (decision === "retire"){
        const a = api.annonce(sg.annonce);
        if (a){ a.etat = "close"; a.retiree_moderation = true; }
      }
      /* La motivation n'est pas une note interne. L'article 16 du DSA veut que le
         signalant dont on connait les coordonnees soit informe sans retard indu
         de la decision ET des voies de recours ; l'article 17 veut que
         l'association dont l'annonce est en cause recoive une declaration des
         motifs. Les deux dormaient dans une colonne que ni l'un ni l'autre ne
         lit. La cle porte le NUMERO DE REVISION : une decision revisee apres
         reclamation doit repartir, et une cle fixe l'aurait fait taire. */
      const rev = s.envois.filter(x => String(x.cle).startsWith(`moderation:${sg.id}:`)).length + 1;
      const an = api.annonce(sg.annonce);
      const asso = an ? api.association(an.asso) : null;
      const u = sg.par ? api.utilisateur(sg.par) : null;
      if (u){
        s.envois.unshift({ id: id("en"), cle: `moderation:${sg.id}:signalant:${rev}`,
          type: "moderation", entreprise: u.org || null,
          destinataire: u.email || u.nom || null,
          sujet: decision === "retire" ? "Votre signalement : l'annonce a été retirée"
               : decision === "modifie" ? "Votre signalement : l'annonce a été modifiée"
               : "Votre signalement : l'annonce est maintenue",
          detail: "décision de modération", date: leJour(), etat: "à envoyer" });
      }
      if (asso){
        const ref = s.utilisateurs.find(x => x.role === "association" && x.org === asso.id);
        s.envois.unshift({ id: id("en"), cle: `moderation:${sg.id}:association:${rev}`,
          type: "moderation", association: asso.id,
          destinataire: ref ? (ref.email || ref.nom) : null,
          sujet: decision === "retire" ? "Une de vos annonces a été retirée"
               : decision === "modifie" ? "Une de vos annonces doit être modifiée"
               : "Une de vos annonces a été signalée, et elle est maintenue",
          detail: "décision de modération", date: leJour(),
          etat: ref ? "à envoyer" : "sans destinataire" });
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
      /* La collecte, des deux côtés. C'est le remplacement le plus direct du
         travail de relance : au lieu d'écrire à quatorze sites et de tenir la
         liste de ceux qui ont répondu, on affiche à chacun ce qu'on attend de
         lui, et au siège ce qui manque encore. Rien n'est envoyé, rien n'est
         stocké : la notification EST l'état de la collecte. */
      if (u.role === "site_referent" || u.role === "entreprise_admin"){
        const ent = api.entreprise(u.org);
        const gid = ent ? ent.groupe : null;
        api.campagnes(gid || undefined)
          .filter(c => c.etat === "ouverte")
          .forEach(c => {
            const e = api.etatCampagne(c.id);
            const j = api.joursAvant(c.echeance);
            const sections = sectionsDe(c);
            const quoi = sections.length > 2
              ? `${sections.slice(0, 2).map(r => r.libelle.toLowerCase()).join(", ")} et ${sections.length - 2} autre${sections.length - 2 > 1 ? "s" : ""} rubrique${sections.length - 2 > 1 ? "s" : ""}`
              : sections.map(r => r.libelle.toLowerCase()).join(" et ");
            if (u.role === "site_referent"){
              const x = e.sites.find(y => y.etablissement.id === u.etablissement);
              if (!x) return;
              if (x.etat === "attendu")
                pousser({ id:"col" + c.id, date:c.echeance, ton: j <= 7 ? "alerte" : "info",
                  titre:"Le siège attend vos chiffres",
                  texte:`${c.libelle} : ${quoi}. ${j > 0 ? `${j} jour${j > 1 ? "s" : ""} avant l'échéance` : "L'échéance est passée"}.`,
                  vers:"#/indicateurs" });
              /* Ce que le référent veut savoir après avoir saisi, c'est si
                 quelqu'un a relu. Sans cette ligne, il rouvre le formulaire
                 pour vérifier que sa saisie est bien partie. */
              if (x.etat === "declare")
                pousser({ id:"colr" + c.id, date:c.echeance, ton:"info",
                  titre:"Votre saisie attend une relecture",
                  texte:`${c.libelle} : vos chiffres sont enregistrés, le siège doit encore les approuver.`,
                  vers:"#/indicateurs" });
            } else {
              const manque = e.sites.filter(y => y.etat === "attendu");
              /* L'événement qui compte pour un responsable RSE : le moment où
                 il n'a plus personne à relancer. C'est là que le rapport
                 devient utilisable, et c'est la seule notification de cette
                 liste qui annonce une bonne nouvelle. */
              if (!manque.length && e.sites.length)
                pousser({ id:"colok" + c.id, date:c.echeance, ton:"ok",
                  titre:"Tous les sites ont répondu",
                  texte:`${c.libelle} : votre rapport de collecte est prêt, avec l'export tableur.`,
                  vers:"#/indicateurs" });
              else if (manque.length)
                pousser({ id:"colatt" + c.id, date:c.echeance, ton: j <= 7 ? "alerte" : "info",
                  titre:`${manque.length} site${manque.length > 1 ? "s" : ""} n'${manque.length > 1 ? "ont" : "a"} pas encore répondu`,
                  texte:`${c.libelle} : ${manque.slice(0, 3).map(y => y.etablissement.nom).join(", ")}${manque.length > 3 ? `, et ${manque.length - 3} autre${manque.length - 3 > 1 ? "s" : ""}` : ""}. Ils sont prévenus sur leur écran, vous n'avez personne à relancer.`,
                  vers:"#/indicateurs" });
              if (e.declares)
                pousser({ id:"colap" + c.id, date:c.echeance, ton:"info",
                  titre:`${e.declares} saisie${e.declares > 1 ? "s" : ""} à approuver`,
                  texte:"Tant qu'elles ne sont pas relues, elles n'entrent ni dans un rapport ni dans une réponse à un client.",
                  vers:"#/indicateurs" });
            }
          });
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

    /* La signature d'un contrat sur un compte déjà ouvert. Elle manquait, et son
       absence enfermait le libre-service : un compte ouvert seul démarre avec
       les places de l'essai, et rien ne savait les relever. La seule issue était
       de recréer la société en double, sans ses salariés ni ses missions.
       L'effectif de référence, lui, ne bouge pas : c'est le dénominateur du
       classement, figé à l'ouverture. */
    signerContrat(eid, { sieges, montant_ht = 0, palier = null,
                         fondateur = false, le = null } = {}){
      const e = api.entreprise(eid);
      if (!e) throw new Error("Entreprise inconnue");
      const places = Math.round(Number(sieges) || 0);
      if (places < 1) throw new Error("Un contrat ouvre au moins une place");
      const pris = api.sieges(eid).pris;
      if (places < pris)
        throw new Error(pris + " place" + (pris > 1 ? "s sont" : " est") + " déjà occupée"
          + (pris > 1 ? "s" : "") + " : le contrat ne peut pas en ouvrir moins.");
      e.sieges = places; e.essai = false;
      let c = api.contrat(eid);
      if (!c){
        c = { entreprise: eid, statut: "actif", debut: s.saison.debut, fin: s.saison.fin };
        s.contrats.push(c);
      }
      c.signe_le = le || leJour();
      c.montant_ht = Math.round(Number(montant_ht) || 0);
      if (palier) c.palier = palier;
      c.fondateur = !!fondateur;
      return c;
    },

    /* Le devis d'une entreprise, calculé à partir de ce qu'elle est : son
       effectif et ses sites. Jamais saisi à la main dans un contrat — un prix
       recopié est un prix qui finit par ne plus correspondre à la grille. */
    devisEntreprise(eid, { comptant = false } = {}){
      const e = api.entreprise(eid); if (!e) return null;
      const sites = api.etablissements(eid).length || 1;
      const c = api.contrat(eid);
      return devisPour({ effectif: e.effectif || 0, sites,
        fondateur: c ? !!c.fondateur : api.placesFondateur().reste > 0, comptant });
    },
    /* Places de lancement. Dérivé des contrats, jamais compté à part : un
       compteur qu'on incrémente est un compteur qu'on oublie de décrémenter. */
    placesFondateur({ aujourdhui = leJour() } = {}){
      const pris = s.contrats.filter(c => c.fondateur).length;
      const ouvert = aujourdhui <= TARIFS.fondateur.jusquau;
      return { places: TARIFS.fondateur.places, pris,
               reste: ouvert ? Math.max(0, TARIFS.fondateur.places - pris) : 0,
               jusquau: TARIFS.fondateur.jusquau, ouvert };
    },
    majContrat(eid, champs){
      const c = api.contrat(eid); if (!c) return null;
      Object.assign(c, champs); return c;
    },
    /* Une facture impayée après échéance suspend l'accès en écriture, jamais la lecture :
       on ne prend pas en otage les données d'un client. */
    etatFacturation(eid){
      const c = api.contrat(eid);
      if (!c) return { statut:"aucun", enRetard:[], du:0 };
      const aujourdhui = leJour();
      const enRetard = c.factures.filter(f => f.etat !== "payee" && f.echeance < aujourdhui);
      const du = c.factures.filter(f => f.etat !== "payee").reduce((n, f) => n + f.montant, 0);
      return { statut:c.statut, enRetard, du, contrat:c };
    },
    marquerFacturePayee(eid, ref){
      const c = api.contrat(eid); if (!c) return null;
      const f = c.factures.find(x => x.ref === ref); if (f) f.etat = "payee";
      return f;
    },
    /* Renouvellement : jamais tacite. Décision du 20/08/2026.
       Accepter la proposition la transforme en facture — c'est l'acceptation qui crée
       la créance, pas l'affichage. Revenir en arrière la remet à l'état de devis, tant
       qu'elle n'a pas été payée. */
    reconduire(eid, oui){
      const c = api.contrat(eid); if (!c) return null;
      c.reconduction = !!oui;
      c.devis = c.devis || [];
      if (oui){
        c.devis.forEach(d => {
          if (c.factures.some(f => f.ref === d.ref.replace("DEV-", "RSV-"))) return;
          c.factures.push({ ref: d.ref.replace("DEV-", "RSV-"), libelle: d.libelle,
            montant: d.montant, date: d.date, echeance: d.validite,
            etat: "envoyee", periode: d.periode, devis: d.ref });
        });
      } else {
        c.factures = c.factures.filter(f => !f.devis || f.etat === "payee");
      }
      return c;
    },
    joursAvantFinSaison(){
      const fin = new Date(s.saison.fin);
      return Math.max(0, Math.ceil((fin - minuit()) / 864e5));
    },

    /* Trois positions, et la valeur par défaut est celle qui protège. « auto »
       nomme au-dessus de la médiane et pas en dessous ; « nom » accepte d'être
       nommée quel que soit le rang ; « anonyme » refuse d'être nommée, même en
       tête. Ce dernier cas n'est pas théorique : une entreprise peut vouloir
       agir sans en faire une communication. */
    VISIBILITES: {
      auto:    { label:"Nommée si je suis dans la moitié haute", aide:"Le réglage par défaut. Un mauvais rang ne vous expose pas." },
      nom:     { label:"Nommée quel que soit mon rang",          aide:"Vous assumez le classement dans les deux sens." },
      anonyme: { label:"Jamais nommée",                          aide:"Votre rang reste visible pour vous seule." }
    },
    /* Le logo de l'entreprise. Deux formes acceptées et deux seulement : une adresse
       https, ou une image encodée dans la page. Tout le reste est refusé — un
       « javascript: » ou un « data:text/html » dans un attribut src qu'on affiche
       sur l'écran de tous les autres clients, c'est une porte ouverte, et elle
       s'ouvrirait sur le classement, l'écran le plus partagé du produit. */
    /* La fiche que l'association tient elle-meme. Elle ecrivait dans le vide :
       l'ecran « Ma page publique » avait un champ, un bouton, et aucun des deux
       n'etait branche. Une association qui s'inscrit seule depuis le site doit
       pouvoir dire qui elle est sans nous ecrire.

       Ce qu'elle ne touche pas, et pourquoi : sa denomination et ses numeros
       viennent du registre public et ne se corrigent que par un controle ; sa
       validation reste une decision de Riseva. Le reste lui appartient. */
    majAssociation(aid, { resume, cause, ville, site, photo, contact_public } = {}){
      const a = api.association(aid);
      if (!a) throw new Error("Association inconnue");
      if (resume !== undefined){
        const r = String(resume).trim();
        if (r.length < 40)
          throw new Error("Une présentation de moins de quarante caractères ne dit rien "
            + "à un salarié qui vous découvre. Deux phrases suffisent.");
        if (r.length > 600)
          throw new Error("Six cents caractères au maximum : au-delà, personne ne lit "
            + "jusqu'au bout, et votre première phrase se perd.");
        a.resume = r;
      }
      if (cause !== undefined) a.cause = String(cause).trim().slice(0, 60);
      if (contact_public !== undefined){
        const m = String(contact_public).trim();
        if (m && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m))
          throw new Error("L'adresse de contact n'est pas une adresse électronique.");
        a.contact_public = m || null;
      }
      if (ville !== undefined){
        const v = String(ville).trim();
        if (!v) throw new Error("La ville est nécessaire : c'est elle qui vous met "
          + "devant les salariés qui travaillent près de chez vous.");
        a.ville = v.slice(0, 80);
      }
      if (site !== undefined){
        const u = String(site).trim();
        if (u && !/^https?:\/\//i.test(u))
          throw new Error("L'adresse de votre site commence par http ou https.");
        a.site = u.slice(0, 240);
      }
      if (photo !== undefined){
        const v = String(photo || "").trim();
        if (!v) a.photo = null;
        else {
          const image = /^data:image\/(png|jpeg|webp);/i.test(v);
          const distant = /^https:\/\//i.test(v);
          if (!image && !distant)
            throw new Error("Une photo est soit un fichier image, soit une adresse "
              + "commençant par https.");
          /* Six cents kilooctets : au-dela, la fiche met une seconde a s'ouvrir
             sur un telephone, et c'est la premiere impression qu'on donne. Le
             navigateur redimensionne avant d'arriver ici. */
          if (v.length > 600_000)
            throw new Error("Cette photo est trop lourde. Riseva la réduit toute seule : "
              + "réessayez, ou choisissez une image plus petite.");
          a.photo = v;
        }
      }
      return a;
    },

    reglerLogo(eid, valeur){
      const e = api.entreprise(eid); if (!e) return null;
      const v = String(valeur || "").trim();
      if (!v){ e.logo = null; return e; }
      const image = /^data:image\/(png|jpeg|webp|gif|svg\+xml);/i.test(v);
      const distant = /^https:\/\//i.test(v);
      if (!image && !distant)
        throw new Error("Un logo est soit un fichier image, soit une adresse commençant "
          + "par https. Rien d'autre n'est accepté.");
      if (v.length > 300_000)
        throw new Error("Ce logo est trop lourd. Un carré de 256 pixels suffit largement.");
      e.logo = v;
      return e;
    },

    /* ------------------------------------------------------------------ */
    /* L'entonnoir d'adoption                                              */
    /* ------------------------------------------------------------------ */
    /* La question qu'un responsable RSE se pose au bout de trois mois n'est pas
       « combien de points » mais « pourquoi ça ne prend pas », et aucun écran ne
       lui répondait. Un rapport annuel ne rattrape pas une saison restée inactive :
       quand il arrive, la saison est finie et le renouvellement est déjà décidé.

       Cinq marches, et chacune a sa propre cause quand elle décroche :
       — compte ouvert, mais jamais venu → le lien d'inscription n'est pas passé ;
       — venu, jamais engagé → l'offre locale ne convient pas, ou elle est trop loin ;
       — engagé, jamais déclaré → le rappel après la mission ne fonctionne pas ;
       — une action, jamais deux → la première expérience n'a pas donné envie ;
       — deux actions et plus → celui-là revient, et c'est lui qui fait la saison.

       On rend la marche ET la cause probable, parce qu'un entonnoir qui ne dit pas
       quoi faire est un joli graphique de plus. */
    adoption({ entreprise = null, etablissement = null } = {}){
      const eid = entreprise;
      const e = api.entreprise(eid); if (!e) return null;
      const sites = api.etablissements(eid);
      const cible = (u) => !etablissement || u.etablissement === etablissement;
      const gens = api.salaries(eid).filter(u => !u.anonyme && cible(u));

      const parPersonne = new Map();
      api.missions({ entreprise: eid }).forEach(m => {
        if (!m.salarie) return;
        const x = parPersonne.get(m.salarie) || { engagees:0, declarees:0, validees:0, premiere:null };
        x.engagees++;
        if (["a_valider", "validee", "validee_auto"].includes(m.etat)) x.declarees++;
        if (["validee", "validee_auto"].includes(m.etat)){
          x.validees++;
          if (!x.premiere || m.date < x.premiere) x.premiere = m.date;
        }
        parPersonne.set(m.salarie, x);
      });

      const compte = (f) => gens.filter(f).length;
      const act = (u) => parPersonne.get(u.id) || { engagees:0, declarees:0, validees:0, premiere:null };
      const effectif = etablissement
        ? ((api.etablissement(etablissement) || {}).effectif || 0)
        : api.effectifReference(eid);

      /* Le délai entre l'ouverture du compte et la première action validée. La
         médiane, pas la moyenne : un salarié qui met huit mois tire une moyenne
         vers le haut et fait croire à un problème général alors qu'il est seul. */
      const delais = gens.map(u => {
        const a = act(u);
        if (!a.premiere || !u.cree_le) return null;
        return Math.round((new Date(a.premiere) - new Date(u.cree_le)) / 86400000);
      }).filter(x => x !== null && x >= 0).sort((a, b) => a - b);
      const mediane = delais.length
        ? (delais.length % 2 ? delais[(delais.length - 1) / 2]
           : Math.round((delais[delais.length / 2 - 1] + delais[delais.length / 2]) / 2))
        : null;

      const marches = [
        { cle:"effectif", label:"Salariés du périmètre", n: effectif,
          cause:null },
        { cle:"comptes", label:"Comptes ouverts", n: gens.length,
          /* Riseva sait qu'ils n'ont pas ouvert de compte. Elle ne sait pas s'ils
             n'ont pas reçu le lien, s'ils l'ont vu et ignoré, ou s'ils ne se
             sentaient pas concernés — et écrire « personnes perdues » à propos de
             gens dont on ignore tout, c'est se donner un diagnostic qu'on n'a pas.
             La cause est donc écrite comme une piste, jamais comme un constat. */
          cause:"Riseva ne sait pas combien ont effectivement vu le lien : c'est la première "
              + "chose à vérifier avant d'en conclure quoi que ce soit.",
          action:{ texte:"Préparer une nouvelle diffusion", vers:"#/supports" } },
        { cle:"engages", label:"Se sont engagés au moins une fois",
          n: compte(u => act(u).engagees > 0),
          cause:"Les annonces proposées sont trop loin, ou ne correspondent pas. Regardez la distance moyenne.",
          action:{ texte:"Voir l'offre autour de vos sites", vers:"#/adoption" } },
        { cle:"declarees", label:"Ont déclaré une mission faite",
          n: compte(u => act(u).declarees > 0),
          cause:"Ils y sont allés mais n'ont rien déclaré : c'est le rappel après la mission qui manque.",
          action:{ texte:"Voir les missions à déclarer", vers:"#/missions" } },
        { cle:"validees", label:"Ont au moins une action validée",
          n: compte(u => act(u).validees > 0),
          cause:"L'association n'a pas confirmé. Relancez-la : sans confirmation, le résultat reste estimé.",
          action:{ texte:"Relancer les associations", vers:"#/missions" } },
      ];
      /* « Sont revenus une deuxième fois » était la sixième marche de ce tunnel.
         Elle n'y avait pas sa place : les cinq premières mesurent une ACQUISITION
         — combien de personnes franchissent une étape de plus — et celle-là mesure
         une RÉTENTION, c'est-à-dire ce que fait quelqu'un qui a déjà tout franchi.
         Les mélanger donne un entonnoir qui se lit comme une seule mécanique alors
         qu'il en décrit deux, et fait chercher la cause du décrochage au mauvais
         endroit. Elle sort donc du tunnel et se dit à part, avec son
         dénominateur. */
      const ayantAgi = compte(u => act(u).validees > 0);
      const revenus = compte(u => act(u).validees > 1);
      /* Le point de rupture : la marche où l'on perd le plus de monde, en part de
         la marche précédente. C'est là qu'agir, et nulle part ailleurs. */
      let rupture = null, pire = 0;
      for (let i = 1; i < marches.length; i++){
        const av = marches[i - 1].n, ap = marches[i].n;
        const perte = av ? (av - ap) / av : 0;
        marches[i].garde = av ? ap / av : 0;
        marches[i].perdus = Math.max(0, av - ap);
        if (av >= 3 && perte > pire){ pire = perte; rupture = marches[i].cle; }
      }
      /* Les comptes ouverts qui n'ont encore jamais agi, et depuis combien de
         temps. Sans eux, la médiane du délai est une médiane de survivants : elle
         ne compte que ceux qui ont fini par agir, et ceux qui n'ont jamais agi
         n'ont pas de délai — pas un délai long, pas de délai du tout. Les
         afficher à côté est la seule façon honnête de donner le chiffre. */
      const auj = new Date(leJour());
      const attente = gens.filter(u => !act(u).premiere && u.cree_le)
        .map(u => Math.round((auj - new Date(u.cree_le)) / 86400000))
        .filter(x => x >= 0).sort((a, b) => a - b);

      /* Un tunnel comportemental sur un tout petit groupe désigne les personnes
         même sans les nommer : avec deux comptes ouverts sur un site et un seul
         salarié mobilisé, le référent sait de qui il s'agit. L'écran affirmait
         qu'il ne nomme personne tout en le permettant, ce qui est pire que de ne
         rien afficher. C'est le même plancher de cinq personnes que pour les
         agrégats du CSE, et pour la même raison. */
      const PLANCHER = 5;
      const lisible = gens.length >= PLANCHER;

      return {
        entreprise: e, sites, etablissement: etablissement || null,
        marches, rupture,
        lisible, plancher: PLANCHER,
        delaiMedian: mediane,
        /* Ce qu'on ne sait pas, on ne l'affiche pas : sans date d'ouverture de
           compte, il n'y a pas de délai, et un « 0 jour » serait un mensonge. */
        delaiMesurable: delais.length,
        /* Le dénominateur du délai, et son biais, donnés avec le chiffre. */
        delaiSur: gens.length,
        sansAction: attente.length,
        sansActionMedian: attente.length ? attente[Math.floor((attente.length - 1) / 2)] : null,
        sansActionPlusDe90: attente.filter(x => x > 90).length,
        actifs: ayantAgi,
        revenus,
        effectif
      };
    },

    /* ------------------------------------------------------------------ */
    /* Notre saison : l'objectif collectif, et qui vient                    */
    /* ------------------------------------------------------------------ */
    /* La brique que les trois relectures ont désignée en même temps. Le constat
       partagé : un salarié seul devant ses points ne revient pas, et un classement
       ne répare pas ça — il peut même l'aggraver, parce qu'une compétition
       instaurée par l'employeur se lit comme une évaluation déguisée.

       Deux choix de conception, et ils ne sont pas cosmétiques.

       L'objectif se compte en SALARIÉS MOBILISÉS, pas en points. Un objectif en
       points est atteint par trois personnes très actives, et il récompense
       exactement le contraire de ce qu'on cherche : il n'élargit rien. Un objectif
       en personnes ne s'atteint qu'en allant chercher quelqu'un qui n'est pas
       encore venu, ce qui est précisément le geste qu'on veut provoquer.

       Le défaut se calcule, il ne se demande pas. Un administrateur à qui on
       demande « quel objectif ? » à l'inscription répond au hasard, et un objectif
       au hasard est soit ridicule soit décourageant. On propose un salarié sur dix,
       arrondi, plancher à trois : c'est atteignable la première saison et ça reste
       un vrai effort. Il reste modifiable. */
    OBJECTIF_PART_DEFAUT: 0.1,
    objectifSaison(eid){
      const e = api.entreprise(eid); if (!e) return null;
      const base = api.effectifReference(eid) || e.effectif || 0;
      const propose = Math.max(3, Math.round(base * api.OBJECTIF_PART_DEFAUT));
      return {
        cible: e.objectif_mobilises || propose,
        propose,
        choisi: !!e.objectif_mobilises
      };
    },
    reglerObjectifSaison(eid, cible){
      const e = api.entreprise(eid); if (!e) return null;
      if (cible === "" || cible === null || cible === undefined){ e.objectif_mobilises = null; return e; }
      const n = Math.round(Number(cible));
      if (!isFinite(n) || n < 1)
        throw new Error("Un objectif se compte en personnes, et il en faut au moins une.");
      const base = api.effectifReference(eid) || e.effectif || 0;
      if (base && n > base)
        throw new Error(`Vous n'avez que ${base} salariés : viser plus haut rend l'objectif `
          + "inatteignable, et un objectif inatteignable ne motive personne.");
      e.objectif_mobilises = n;
      return e;
    },

    /* Ce que le salarié voit de sa saison collective. Le périmètre est SON SITE
       quand il en a un — « douze personnes sur mon site » parle, « douze personnes
       sur les onze cents de l'entreprise » ne parle pas — et l'entreprise sinon. */
    notreSaison(uid){
      const u = api.utilisateur(uid); if (!u || !u.org) return null;
      const e = api.entreprise(u.org); if (!e) return null;
      const site = u.etablissement ? api.etablissement(u.etablissement) : null;
      const pairs = api.salaries(u.org)
        .filter(x => !x.anonyme && (!site || x.etablissement === site.id));
      const idsPairs = new Set(pairs.map(x => x.id));

      const validees = api.missions({ entreprise: u.org })
        .filter(m => ["validee", "validee_auto"].includes(m.etat))
        .filter(m => !site || (m.etablissement
          || (api.utilisateur(m.salarie) || {}).etablissement) === site.id)
        .filter(m => !api.estDonPersonnel(m));
      const mobilises = new Set(validees.map(m => m.salarie).filter(x => idsPairs.has(x)));

      const objectif = api.objectifSaison(u.org);
      /* L'objectif de l'entreprise se répartit au prorata de l'effectif du site :
         demander trente personnes à un site de douze serait une farce. */
      const partSite = site && e.effectif
        ? Math.max(1, Math.round(objectif.cible * ((site.effectif || 0) / e.effectif)))
        : objectif.cible;

      const aVenir = api.missions({ entreprise: u.org })
        .filter(m => m.etat === "engagee")
        .filter(m => !site || (m.etablissement
          || (api.utilisateur(m.salarie) || {}).etablissement) === site.id)
        .sort((a, b) => String(a.date).localeCompare(String(b.date)));

      return {
        site, entreprise: e,
        effectif: site ? (site.effectif || 0) : (e.effectif || 0),
        mobilises: mobilises.size,
        cible: partSite,
        part: partSite ? Math.min(1, mobilises.size / partSite) : 0,
        atteint: mobilises.size >= partSite,
        missions: validees.length,
        realisations: api.realisations({ entreprise: u.org }),
        prochaine: aVenir[0] || null,
        aVenir: aVenir.length
      };
    },

    /* Qui vient sur une annonce. Le NOMBRE est toujours visible : c'est lui qui
       lève le frein — la peur d'y aller seul — et il ne désigne personne. Les
       PRÉNOMS ne sortent que pour les collègues qui l'ont choisi, parce qu'une
       mission auprès d'une association peut révéler une conviction, une croyance
       ou un état de santé, et que ça, ça ne se déduit pas d'un réglage par défaut.

       Et on ne montre que les collègues de la même entreprise : savoir qui vient
       d'ailleurs n'aide personne et exposerait des salariés d'un autre client. */
    quiVient(aid, uid){
      const u = api.utilisateur(uid);
      const vide = { total: 0, collegues: 0, noms: [], moi: false, reseau: 0 };
      if (!u) return vide;
      /* Jamais sur un don en argent, et ce n'est pas un oubli : qui donne, à qui,
         et combien est la donnée la mieux protégée du produit. Le montant d'un don
         personnel n'apparaît nulle part côté employeur, et le nom du donateur ne
         doit pas fuir par la porte d'à côté sous couvert d'entraînement collectif.
         Le bénévolat et le matériel se font à plusieurs, sur place, au vu de tous ;
         un virement ne se fait pas à plusieurs. */
      const a = api.annonce(aid);
      if (!a || estArgent(a.type)) return vide;
      const ms = s.missions.filter(m => m.annonce === aid
        && ["engagee", "a_valider", "validee", "validee_auto"].includes(m.etat));
      const miens = ms.filter(m => m.entreprise === u.org);
      const noms = miens
        .map(m => api.utilisateur(m.salarie))
        /* Deux formes pour le meme reglage : `visible_pairs` sur l'objet en
           demonstration, `prefs.visible_pairs` en production, ou il vient de la
           vue filtree sur auth.uid(). Le defaut, dans les deux cas, est de ne
           pas montrer : un prenom ne s'affiche que sur un oui explicite. */
        .filter(x => x && !x.anonyme && x.id !== uid
                       && (x.visible_pairs || (x.prefs && x.prefs.visible_pairs)))
        .map(x => String(x.nom || "").split(/\s+/)[0]);
      return {
        total: miens.length,
        collegues: miens.filter(m => m.salarie !== uid).length,
        noms: [...new Set(noms)],
        moi: miens.some(m => m.salarie === uid),
        reseau: ms.length
      };
    },
    /* Le réglage appartient à la personne, et à personne d'autre. */
    reglerVisibiliteParis(uid, oui){
      const u = api.utilisateur(uid); if (!u) return null;
      u.visible_pairs = !!oui; return u;
    },

    reglerVisibilite(eid, valeur){
      const e = api.entreprise(eid); if (!e) return null;
      if (!["auto", "nom", "anonyme"].includes(valeur))
        throw new Error("Réglage de visibilité inconnu.");
      e.visibilite = valeur; return e;
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
    /* La valorisation fiscale, et ce qu'elle ne peut pas savoir.
       Trois choses ont été corrigées ici, parce qu'un contrôle les aurait trouvées :
       — le mécénat de compétences se valorise au temps réellement effectué et au coût
         de revient réel, salarié par salarié ; les demi-journées sont un barème de
         points, pas une pièce comptable. Tant que les heures émargées ne sont pas
         saisies, on applique la durée conventionnelle ET on le dit ;
       — le plafond de 20 000 € ou 5 ‰ du chiffre d'affaires porte sur TOUS les
         versements de l'exercice, pas seulement sur ceux que Riseva connaît. Sans
         chiffre d'affaires, dons hors Riseva et reports antérieurs déclarés, le
         plafond et le report ne se calculent pas : ils valent null, pas zéro ;
       — l'entreprise est responsable de sa valorisation. On lui rend donc la piste
         d'audit ligne à ligne, pas un total. */
    valorisationMecenat(eid){
      /* Une mission comptée toute seule au bout de quatorze jours n'entre PAS dans
         l'assiette du 238 bis. Le règlement dit « personne n'a compté », la convention
         dit « seules les heures réellement exécutées et validées » : fabriquer une
         réduction d'impôt sur un silence, c'est exactement ce que l'article 1740 A
         sanctionne, au taux de la réduction en cause. Les points restent acquis —
         ils motivent une équipe, ils ne déduisent pas un impôt. La valeur en attente
         est rendue à part, pour que l'entreprise sache quoi relancer. */
      const toutes = api.missions({ entreprise: eid })
                   .filter(m => m.etat === "validee" || m.etat === "validee_auto");
      const ms = toutes.filter(m => m.etat === "validee");
      const enAttenteMs = toutes.filter(m => m.etat === "validee_auto");
      const e = api.entreprise(eid) || {};
      const coutJour = e.cout_jour_moyen || 300;
      const coutHeure = e.cout_heure_charge || (coutJour / FISCAL.heures_jour);
      const coutDemiJournee = coutJour / 2;

      const parSalarie = {};
      let donsSalaries = 0, donsEntreprise = 0, demiJourneesTT = 0, demiJourneesPerso = 0;
      let heuresEstimees = false;

      ms.forEach(m => {
        const a = api.annonceDe(m); if (!a) return;
        if (estArgent(a.type)){
          /* Un salarié qui donne de sa poche donne en son nom. Le reçu est établi à son
             nom, au modèle des particuliers, et le montant n'entre PAS dans l'assiette de
             l'entreprise : l'article 238 bis vise les versements effectués par l'entreprise.
             Confondre les deux fabriquerait une réduction d'impôt indue. */
          if (api.estDonPersonnel(m)) donsSalaries += Number(m.quantite) || 0;
          else donsEntreprise += Number(m.quantite) || 0;
          return;
        }
        /* Seuls les formats de temps entrent dans l'assiette du mécénat de
           compétence : un parrainage ou une adoption n'est pas une mise à
           disposition de personnel, et le valoriser en coût salarial serait
           fabriquer une réduction d'impôt qui n'existe pas. */
        if (!estTemps(a.type)) return;
        if (!a.temps_travail || !api.eligibleMecenat(a.asso)){
          demiJourneesPerso += m.quantite; return;
        }
        demiJourneesTT += m.quantite;
        /* Deux régimes, et surtout pas de conversion entre les deux : des heures
           émargées se valorisent au coût horaire chargé ; à défaut, la demi-journée
           se valorise sur la base journalière déclarée par l'entreprise. Convertir
           une demi-journée conventionnelle en heures puis en euros fabriquerait une
           précision que personne n'a mesurée — et, ici, 14 % de valorisation en trop. */
        const reelles = Number(m.heures) > 0;
        if (!reelles) heuresEstimees = true;
        const heures = reelles ? Number(m.heures) : heuresPour(a.type, m.quantite);
        const cout = reelles ? heures * coutHeure
                             : heures / FISCAL.heures_demi_journee * coutDemiJournee;
        const asso = api.association(a.asso) || {};
        const sal = api.utilisateur(m.salarie) || {};
        const ligne = parSalarie[m.salarie] || (parSalarie[m.salarie] = {
          salarie: m.salarie, nom: sal.nom || "", heures: 0, cout: 0, lignes: []
        });
        ligne.heures += heures;
        ligne.cout   += cout;
        ligne.lignes.push({
          mission: m.id, date: m.date, association: asso.nom || "",
          heures, heuresReelles: reelles, cout: Math.round(cout),
          convention: m.convention_signee_le || null,
          confirmee: m.etat === "validee",
          recu: m.recu_le || null
        });
      });

      /* Ce que le silence des associations coûte à l'entreprise, en clair. Ce n'est
         pas une perte de points : c'est une valeur qu'elle ne peut pas déclarer tant
         que personne n'a confirmé. Un mail de relance la récupère. */
      const enAttente = { missions: enAttenteMs.length, dons: 0, demiJournees: 0,
                          valeur: 0, associations: [] };
      enAttenteMs.forEach(m => {
        const a = api.annonceDe(m); if (!a) return;
        const asso = api.association(a.asso) || {};
        if (estArgent(a.type)){
          if (api.estDonPersonnel(m)) return;
          enAttente.dons += Number(m.quantite) || 0;
          enAttente.valeur += Number(m.quantite) || 0;
        } else if (estTemps(a.type)
                   && a.temps_travail && api.eligibleMecenat(a.asso)){
          const dj = heuresPour(a.type, Number(m.quantite) || 0)
                     / FISCAL.heures_demi_journee;
          enAttente.demiJournees += dj;
          enAttente.valeur += dj * coutDemiJournee;
        } else return;
        if (asso.nom && !enAttente.associations.includes(asso.nom))
          enAttente.associations.push(asso.nom);
      });
      enAttente.valeur = Math.round(enAttente.valeur);

      const plafondSal = FISCAL.plafond_mecenat_par_salarie;
      let competencesBrut = 0, competencesRetenu = 0, heuresTT = 0;
      const detailSalaries = Object.values(parSalarie).map(s => {
        competencesBrut += s.cout;
        const retenu = Math.min(s.cout, plafondSal);
        competencesRetenu += retenu;
        heuresTT += s.heures;
        return { ...s, cout: Math.round(s.cout), retenu: Math.round(retenu),
                 ecrete: Math.round(s.cout - retenu) };
      }).sort((x, y) => y.cout - x.cout);
      competencesBrut = Math.round(competencesBrut);
      competencesRetenu = Math.round(competencesRetenu);

      /* L'assiette connue de Riseva, et rien d'autre. */
      const assiette = donsEntreprise + competencesRetenu;

      /* Le plafond ne se calcule qu'avec ce que l'entreprise a déclaré. Sans ça,
         « reportable : 0 € » serait une affirmation, et elle serait fausse. */
      const plafondCalculable = Number(e.ca) > 0
        && e.exercice_debut && e.exercice_fin
        && e.dons_hors_riseva !== undefined && e.dons_hors_riseva !== null
        && e.report_anterieur !== undefined && e.report_anterieur !== null;

      const versementsExercice = plafondCalculable
        ? assiette + Number(e.dons_hors_riseva) + Number(e.report_anterieur) : null;
      const plafondEntreprise = plafondCalculable
        ? Math.max(FISCAL.plafond_plancher, Math.round(Number(e.ca) * FISCAL.plafond_taux_ca))
        : null;
      const assietteRetenue = plafondCalculable
        ? Math.max(0, Math.min(assiette, plafondEntreprise - Number(e.dons_hors_riseva)
                                          - Number(e.report_anterieur)))
        : null;
      const reportable = plafondCalculable
        ? Math.max(0, versementsExercice - plafondEntreprise) : null;
      /* Le taux n'est pas de 60 % partout. L'article 238 bis le ramène à 40 %
         pour la fraction des versements de l'exercice qui dépasse deux millions
         d'euros. Le code portait la constante depuis le début et ne s'en servait
         jamais : au-dessus du seuil, l'écran annonçait une réduction supérieure
         à celle que l'administration accordera, et ce chiffre-là, un dirigeant
         le recopie dans sa liasse.

         Les versements déjà faits hors Riseva et le report des exercices
         antérieurs comptent AVANT ceux que Riseva connaît : c'est le total de
         l'exercice qui franchit le seuil, pas la part Riseva prise isolément.
         L'assiette Riseva occupe donc la tranche qui va de `dejaVerse` à
         `dejaVerse + assietteRetenue`. */
      const dejaVerse = plafondCalculable
        ? Number(e.dons_hors_riseva) + Number(e.report_anterieur) : 0;
      const tranches = (base, montant) => {
        const haut = base + montant;
        const plein = Math.max(0, Math.min(haut, FISCAL.seuil_taux_reduit)
                                  - Math.min(base, FISCAL.seuil_taux_reduit));
        return { plein, reduit: Math.max(0, montant - plein) };
      };
      const tr = plafondCalculable ? tranches(dejaVerse, assietteRetenue) : null;
      const reduction = plafondCalculable
        ? Math.round(tr.plein * FISCAL.taux_reduction
                     + tr.reduit * FISCAL.taux_reduit) : null;
      /* Vrai dès qu'une partie de l'assiette tombe dans la tranche à 40 % : c'est
         la seule situation où l'écran doit dire que certains organismes d'aide aux
         personnes en difficulté restent, eux, à 60 % au-delà du seuil. Riseva ne
         sait pas si l'association en relève ; elle ne peut donc pas le décider à
         la place de l'expert-comptable, mais elle doit le dire. */
      const trancheReduite = plafondCalculable && tr.reduit > 0;
      const trMax = tranches(0, assiette);
      /* Le même drapeau pour l'estimation. Sans lui, l'écran écrivait « 60 % de
         X » sous un montant calculé 60/40 : le lecteur refaisait le calcul et
         trouvait autre chose, sur la page qui s'appelle « dossier de preuve ». */
      const trancheReduiteMax = trMax.reduit > 0;

      return {
        donsSalaries, donsEntreprise, demiJourneesTT, demiJourneesPerso,
        coutDemiJournee, coutHeure, heuresTT, heuresEstimees,
        competencesBrut, competencesRetenu, detailSalaries,
        ecreteParSalarie: competencesBrut - competencesRetenu,
        plafondSalarie: plafondSal,
        assiette, plafondCalculable, versementsExercice,
        plafondEntreprise, assietteRetenue, reportable, reduction,
        /* Ce que la réduction vaudrait si rien d'autre n'avait été versé cette année.
           C'est un maximum théorique, jamais un montant déclarable. */
        estimationMax: Math.round(trMax.plein * FISCAL.taux_reduction
                                  + trMax.reduit * FISCAL.taux_reduit),
        /* Ce que la tranche haute a coûté par rapport à un 60 % uniforme : sans
           ce chiffre, personne ne comprend pourquoi la réduction n'est pas
           l'assiette multipliée par soixante pour cent. */
        trancheReduite, trancheReduiteMax,
        assiettePleine: plafondCalculable ? tr.plein : null,
        assietteReduite: plafondCalculable ? tr.reduit : null,
        assiettePleineMax: trMax.plein, assietteReduiteMax: trMax.reduit,
        salariesConcernes: detailSalaries.length,
        /* Missions closes sans retour : hors assiette, mais dites. */
        enAttente,
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
      /* Le mandat en fait partie : sans lui, Riseva n'a pas le droit de préparer
         un reçu au nom de l'association, même avec toutes les autres cases
         cochées. */
      return !!(r.actif && r.eligible_mecenat && r.signataire && r.qualite && r.prefixe
                && api.mandatRecus(aid));
    },
    /* L'émission d'un reçu, aux mêmes conditions que `private.emettre_recu_si_pret`
       côté base : don confirmé, association éligible, émission activée, signataire,
       qualité, préfixe et mandat écrit. Une mission ne porte jamais deux reçus. */
    emettreRecuSiPret(m){
      if (!m || m.etat !== "validee") return null;
      const an = api.annonceDe(m); if (!an || !estArgent(an.type)) return null;
      const aid = an.asso;
      if (!api.recusPrets(aid)) return null;
      if (s.recus_emis.some(r => r.mission === m.id)) return null;
      const a = api.association(aid) || {};
      /* Le numéro suit ceux DÉJÀ ÉMIS, y compris ceux émis avant Riseva. Compter
         les seules lignes de `recus_emis` faisait repartir la série à 1 chez une
         association qui en était à 47, puis réécrivait son compteur à 2 — c'est
         exactement ce que le champ en lecture seule de l'écran promet
         d'empêcher, et c'est l'amende de l'article 1740 A qui est au bout. */
      const dejaEmis = s.recus_emis.filter(r => r.association === aid).length;
      const suite = Math.max(Number((a.recus || {}).prochain_numero) || 1, dejaEmis + 1);
      /* `cerfaPour` lève sur une origine inconnue plutôt que de retomber sur un
         modèle : délivrer le formulaire des particuliers pour un don d'entreprise
         est précisément la faute que l'article 1740 A sanctionne. Et l'origine se
         lit par `estDonPersonnel`, seul endroit qui connaisse aussi la forme
         héritée `pour_le_compte_de` que produit le mappeur de production. */
      const r = { id: id("rc"), mission: m.id, association: aid,
                  numero: String((a.recus || {}).prefixe || "") + String(suite).padStart(4, "0"),
                  modele: cerfaPour(api.estDonPersonnel(m) ? "salarie" : "entreprise").numero,
                  montant: Number(m.quantite) || 0, le: leJour() };
      s.recus_emis.unshift(r);
      if (a.recus) a.recus.prochain_numero = suite + 1;
      return r;
    },
    recusEmis: (aid) => s.recus_emis.filter(r => !aid || r.association === aid),
    /* Le rattrapage à la demande, côté démonstration. Même effet que la RPC. */
    emettreRecusEnAttente(aid){
      let n = 0;
      api.missions({ asso: aid }).filter(m => m.etat === "validee")
        .forEach(m => { if (api.emettreRecuSiPret(m)) n++; });
      return n;
    },
    /* Récapitulatif à reporter dans la déclaration annuelle des dons, obligatoire
       depuis 2021 : montant global des dons portés sur les reçus, et nombre de reçus. */
    recapRecus(aid){
      /* La déclaration de l'article 222 bis porte sur les REÇUS délivrés, pas sur
         les dons reçus. Compter les dons confirmés donnait un nombre toujours
         supérieur ou égal au vrai : une association dont un réglage manque
         encaisse et n'émet rien, et aurait déclaré des reçus qui n'existent pas.
         On compte donc les reçus, et on dit séparément ce qui reste à émettre. */
      /* Borné à l'exercice, parce que c'est ce que l'écran affiche et ce que
         l'article 222 bis demande : le montant et le nombre de reçus de
         L'EXERCICE. Sans ce filtre, une association en était à son deuxième
         exercice et recopiait le cumul des deux. */
      const dans = (d) => d && d >= s.saison.debut && d <= s.saison.fin;
      let montant = 0, nombre = 0;
      s.recus_emis.filter(r => r.association === aid && dans(r.le)).forEach(r => {
        montant += Number(r.montant) || 0; nombre++;
      });
      const enAttente = api.missions({ asso: aid })
        .filter(m => m.etat === "validee")
        .filter(m => { const a = api.annonceDe(m); return a && estArgent(a.type); })
        .filter(m => !s.recus_emis.some(r => r.mission === m.id));
      return { montant, nombre, saison: s.saison.nom,
               aEmettre: enAttente.length,
               montantAEmettre: enAttente.reduce((t, m) => t + (Number(m.quantite) || 0), 0) };
    },

    /* ------------------------------------------------------------------ */
    /* Dons en argent : virement direct, Riseva n'encaisse rien            */
    /* ------------------------------------------------------------------ */
    /* Trois écritures, et pas une de plus : l'association donne son IBAN, un
       donateur annonce une intention, l'association confirme ce que sa banque a
       crédité. Entre les deux, l'argent va d'un compte à l'autre sans passer par
       Riseva — c'est ce qui dispense d'un agrément d'établissement de paiement,
       et ce qui fait que l'association touche 100 % du don. */
    enregistrerIban(aid, { iban, bic, titulaire } = {}){
      const a = api.association(aid); if (!a) return null;
      if (iban !== undefined){
        const v = ibanNormalise(iban);
        if (v && !ibanValide(v))
          throw new Error("Cet IBAN est incorrect : sa clé de contrôle ne tombe pas juste. "
            + "Recopiez-le depuis un relevé, sans espace en trop ni caractère oublié.");
        a.iban = v || null;
      }
      if (bic !== undefined) a.bic = String(bic || "").replace(/\s+/g, "").toUpperCase() || null;
      if (titulaire !== undefined) a.titulaire_compte = String(titulaire || "").trim() || null;
      return a;
    },
    /* Un don ne peut être annoncé que si l'argent a où aller, et si l'association
       est bien en ligne. Une page qui afficherait un formulaire de don pour une
       association suspendue serait la pire chose que ce produit puisse faire. */
    /* Une association peut recevoir de l'argent des qu'elle a UN moyen de le
       recevoir : un compte HelloAsso connecte, ou un IBAN. Exiger l'IBAN meme
       quand le compte est connecte reclamait un numero dont plus personne ne se
       sert, et bloquait le don pour une association parfaitement equipee. */
    donsOuverts(aid){
      const a = api.association(aid);
      if (!DON.ouvert || !a || !a.valide || a.suspendue) return false;
      return !!a.helloasso_slug || !!(a.iban && ibanValide(a.iban));
    },
    /* Connecter le compte HelloAsso d'une association. En production, la vraie
       liaison passe par la mire d'autorisation de HelloAsso et une fonction
       Edge : le navigateur ne voit jamais le jeton. En demonstration, on simule
       le retour de cette mire pour que le parcours se traverse en entier. */
    lierHelloAsso(aid, slug){
      const a = api.association(aid);
      if (!a) throw new Error("Association inconnue");
      const v = String(slug || "").trim().toLowerCase();
      if (!/^[a-z0-9-]{1,120}$/.test(v))
        throw new Error("Ce nom d'organisation ne ressemble pas à celui d'une page HelloAsso.");
      a.helloasso_slug = v;
      a.helloasso_lie_le = leJour();
      return a;
    },
    delierHelloAsso(aid){
      const a = api.association(aid);
      if (!a) return null;
      a.helloasso_slug = null; a.helloasso_lie_le = null;
      return a;
    },

    enregistrerHelloAsso(aid, lien){
      const a = api.association(aid); if (!a) return null;
      const v = String(lien || "").trim();
      if (v && !lienHelloAssoValide(v))
        throw new Error("Ce lien n'est pas une adresse de formulaire HelloAsso. "
          + "Elle commence par https://www.helloasso.com/associations/… et ne porte "
          + "aucun paramètre après le nom du formulaire.");
      a.helloasso = v || null;
      return a;
    },
    lienHelloAsso: (aid) => (api.association(aid) || {}).helloasso || null,
    /* Les circuits réellement disponibles pour une association, dans l'ordre où
       on les propose : le plus simple pour le donateur d'abord. */
    circuitsDon(aid){
      const a = api.association(aid) || {};
      if (!api.donsOuverts(aid)) return [];
      const l = [];
      /* Le compte connecte d'abord : c'est celui qui se paie par carte et se
         confirme seul. Le lien colle a la main ensuite, pour celles qui ont un
         formulaire sans avoir autorise Riseva. Le virement en dernier. */
      if (a.helloasso_slug)
        l.push({ cle:"helloasso", ...CIRCUITS_DON.helloasso, slug:a.helloasso_slug, api:true });
      else if (a.helloasso)
        l.push({ cle:"helloasso", ...CIRCUITS_DON.helloasso,
                 aide:"Paiement par carte sur le formulaire de l'association.",
                 lien:a.helloasso, api:false });
      if (api.coordonneesDon(aid))
        l.push({ cle:"virement", ...CIRCUITS_DON.virement, ...api.coordonneesDon(aid) });
      return l;
    },
    coordonneesDon(aid){
      const a = api.association(aid);
      if (!a || !api.donsOuverts(aid)) return null;
      return { iban: a.iban, iban_lisible: ibanLisible(a.iban), bic: a.bic || null,
               titulaire: a.titulaire_compte || a.nom_juridique || a.nom };
    },

    mandatRecus: (aid) => (api.association(aid) || {}).mandat_recus || null,
    /* Le mandat est écrit, daté, nominatif, et révocable sans motif. Sans lui,
       Riseva ne prépare aucun reçu : l'amende de l'article 1740 A du CGI —
       au taux de la réduction d'impôt en cause — pèse sur l'association,
       pas sur nous, et un mandat implicite ne se plaide pas. */
    accepterMandatRecus(aid, { par, nom, qualite } = {}){
      const a = api.association(aid); if (!a) return null;
      const r = api.reglagesRecus(aid);
      if (!r.eligible_mecenat)
        throw new Error("Déclarez d'abord l'éligibilité de l'association au régime des "
          + "articles 200 et 238 bis du CGI. Riseva ne peut pas la déduire d'un registre.");
      if (!nom || !qualite)
        throw new Error("Le mandat nomme la personne qui l'accorde et sa qualité.");
      a.mandat_recus = { version: MANDAT_RECUS.version, par: par || null,
                         nom, qualite, accepte_le: leJour() };
      return a.mandat_recus;
    },
    revoquerMandatRecus(aid){
      const a = api.association(aid); if (!a) return null;
      a.mandat_recus = null;
      /* Révoquer n'efface rien de ce qui a été émis : ces reçus existent, ils
         sont entre les mains de donateurs, et l'association les conserve six ans
         (art. L. 102 B du LPF). */
      if (a.recus) a.recus.actif = false;
      return true;
    },

    /* L'intention : ce que le donateur annonce, avec la référence qu'il portera
       sur son virement. C'est le seul objet que Riseva crée ; il ne vaut pas
       encaissement, et il ne rapporte aucun point. */
    declarerIntentionDon({ annonce, montant, origine = "salarie", salarie = null, entreprise = null }){
      const an = s.annonces.find(x => x.id === annonce);
      if (!an || an.etat !== "ouverte") throw new Error("Annonce indisponible");
      if (!estArgent(an.type)) throw new Error("Cette annonce n'attend pas de l'argent");
      const m = Math.round(Number(montant) || 0);
      if (m < DON.montant_min) throw new Error(`Le minimum est de ${DON.montant_min} €.`);
      if (!api.donsOuverts(an.asso))
        throw new Error("Cette association n'a pas encore renseigné son compte bancaire.");
      const auj = minuit();
      const exp = new Date(auj); exp.setDate(exp.getDate() + DON.validite_jours);
      const nid = id("int");
      const i = { id: nid, annonce, association: an.asso, salarie, entreprise,
                  origine, montant: m,
                  reference: referenceVirement(`${nid}|${an.asso}|${m}|${salarie || entreprise || ""}`),
                  etat: "annoncee", declare_le: auj.toISOString().slice(0, 10),
                  expire_le: exp.toISOString().slice(0, 10) };
      s.intentions.unshift(i);
      return i;
    },
    intentionsDon(filtre = {}){
      return s.intentions.filter(i =>
        (!filtre.asso    || i.association === filtre.asso) &&
        (!filtre.salarie || i.salarie === filtre.salarie) &&
        (!filtre.etat    || i.etat === filtre.etat));
    },
    intentionParReference: (ref) => s.intentions.find(i =>
      i.reference.toUpperCase() === String(ref || "").trim().toUpperCase()) || null,

    /* L'association confirme ce que sa banque a crédité, et corrige le montant si
       le donateur a viré autre chose. C'est elle qui a le relevé ; c'est donc son
       chiffre qui fait foi, exactement comme pour le bénévolat.

       Rien ici n'est automatique. Une mission de bénévolat non tranchée en
       quatorze jours est réputée faite — un silence n'est pas une faute. De
       l'argent, non : un silence ne vaut pas encaissement, et créditer des points
       pour un virement que personne n'a vu arriver serait un score faux. */
    confirmerDonRecu(iid, { montant, le = null } = {}){
      const i = s.intentions.find(x => x.id === iid);
      if (!i) throw new Error("Intention introuvable");
      if (i.etat !== "annoncee") throw new Error("Ce don a déjà été traité");
      const recu = Math.round(Number(montant ?? i.montant) || 0);
      if (recu <= 0) throw new Error("Montant reçu invalide");
      const an = s.annonces.find(x => x.id === i.annonce);
      if (!an) throw new Error("Annonce introuvable");

      const m = { id: id("m"), annonce: i.annonce, entreprise: i.entreprise || null,
                  salarie: i.salarie || null, quantite: recu,
                  etablissement: (api.utilisateur(i.salarie) || {}).etablissement || null,
                  points: api.pointsPour("don_financier", recu),
                  etat: "validee", date: le || i.declare_le,
                  declaree_le: i.declare_le, tranchee_le: le || leJour(),
                  origine: i.origine, don: { reference: i.reference, circuit: "virement" } };
      s.missions.unshift(m);
      an.restant = Math.max(0, an.restant - recu);
      if (an.restant === 0) an.etat = "close";
      i.etat = "recue"; i.montant_recu = recu; i.mission = m.id;
      i.confirme_le = le || leJour();
      api.emettreRecuSiPret(m);
      return { intention: i, mission: m };
    },
    abandonnerIntentionDon(iid, motif = null){
      const i = s.intentions.find(x => x.id === iid);
      if (!i || i.etat !== "annoncee") return null;
      i.etat = "abandonnee"; i.motif = motif; return i;
    },

    /* Ce qui manque à une association pour recevoir de l'argent et faire suivre
       un reçu. Une liste d'actions, pas de reproches. */
    manquePourDons(aid){
      const a = api.association(aid) || {};
      const r = api.reglagesRecus(aid);
      const l = [];
      if (!a.valide || a.suspendue) l.push({ quoi:"mise en ligne de l'association",
        pourquoi:"une association hors ligne ne reçoit pas de dons par Riseva" });
      /* Ce qui manque VRAIMENT pour recevoir de l'argent : un moyen de le
         recevoir. Le compte HelloAsso connecte suffit, l'IBAN aussi ; c'est
         l'absence des deux qui bloque. Exiger l'IBAN quand le compte est
         connecte demandait un numero dont plus personne ne se sert. */
      if (!a.helloasso_slug && !a.iban) l.push({ quoi:"un moyen de recevoir les dons",
        pourquoi:"connectez votre compte HelloAsso, ou renseignez un IBAN pour les virements" });
      if (!r.eligible_mecenat) l.push({ quoi:"déclaration d'éligibilité au mécénat",
        pourquoi:"sans elle, le don reste possible mais aucun reçu n'est préparé" });
      if (!api.mandatRecus(aid)) l.push({ quoi:"mandat de préparation des reçus",
        pourquoi:"seul l'organisme bénéficiaire peut délivrer un reçu ; Riseva le prépare sur mandat écrit" });
      return l;
    },
    /* Ce qui n'est pas un manque, mais un plus : si l'association a déjà un
       formulaire HelloAsso, autant l'utiliser. Le lui présenter comme une case
       à cocher obligatoire ferait croire qu'elle doit ouvrir un compte quelque
       part, ce qui est exactement la promesse qu'on lui a faite de ne pas faire. */
    optionsDon(aid){
      const a = api.association(aid) || {};
      if (a.helloasso_slug) return [];
      return [{ quoi:"connecter votre compte HelloAsso",
        pourquoi:"vos donateurs paient par carte en trois clics, l'argent arrive chez vous, et le don se confirme sans que vous ayez rien à faire" }];
    },

    /* L'etat de la liaison HelloAsso, tel que l'ecran le lit. */
    helloassoLie: (aid) => !!(api.association(aid) || {}).helloasso_slug,
    helloassoSlug: (aid) => (api.association(aid) || {}).helloasso_slug || null,



    /* ------------------------------------------------------------------ */
    /* Supports et affiches                                                */
    /* ------------------------------------------------------------------ */
    expeditions(filtre = {}){
      return s.expeditions.filter(x =>
        (!filtre.entreprise || x.entreprise === filtre.entreprise) &&
        (!filtre.kit || x.kit === filtre.kit))
        .sort((a, b) => String(b.expedie_le || b.cree_le).localeCompare(String(a.expedie_le || a.cree_le)));
    },
    /* L'état de la saison en supports, pour une entreprise : les quatre vagues,
       et où en est chacune. Une vague sans expédition n'est pas « en retard » :
       elle est simplement à venir tant que son mois n'est pas atteint. */
    supportsDe(eid, { aujourdhui = leJour() } = {}){
      const sa = s.saison;
      const debut = new Date(sa.debut);
      return KITS_SAISON.map(k => {
        const d = new Date(debut); d.setMonth(d.getMonth() + k.mois - 1);
        const prevu = d.toISOString().slice(0, 10);
        const ex = s.expeditions.find(x => x.entreprise === eid && x.kit === k.code) || null;
        return { kit: k, prevu, expedition: ex,
                 etat: ex ? (ex.recu_le ? "recu" : "expedie")
                          : (prevu <= aujourdhui ? "a_preparer" : "a_venir"),
                 en_retard: !ex && prevu < aujourdhui };
      });
    },
    expedier(eid, kit, { etablissement = null, suivi = null, le = null } = {}){
      const e = api.entreprise(eid); if (!e) throw new Error("Entreprise inconnue");
      if (!KITS_SAISON.some(k => k.code === kit)) throw new Error("Vague inconnue.");
      const deja = s.expeditions.find(x => x.entreprise === eid && x.kit === kit);
      if (deja) throw new Error("Cette vague a déjà été expédiée à cette entreprise.");
      const x = { id: id("ex"), entreprise: eid, etablissement, kit,
                  cree_le: leJour(),
                  expedie_le: le || leJour(),
                  suivi: String(suivi || "").trim() || null, recu_le: null };
      s.expeditions.unshift(x);
      return x;
    },
    /* C'est le client qui confirme, pas nous. Marquer « reçu » à sa place ferait
       du suivi une déclaration de Riseva sur elle-même, ce qui ne vaut rien le
       jour où il dit n'avoir rien eu. */
    confirmerReception(exid){
      const x = s.expeditions.find(y => y.id === exid); if (!x) return null;
      x.recu_le = leJour();
      return x;
    },
    /* Ce que Riseva a à préparer, tous clients confondus. C'est l'écran qui
       remplace le tableau à la main. */
    aExpedier({ aujourdhui = leJour() } = {}){
      const l = [];
      s.entreprises.forEach(e => {
        api.supportsDe(e.id, { aujourdhui }).forEach(x => {
          if (x.etat === "a_preparer")
            l.push({ entreprise: e, kit: x.kit, prevu: x.prevu, en_retard: x.en_retard,
                     sites: api.etablissements(e.id).length || 1 });
        });
      });
      return l.sort((a, b) => a.prevu.localeCompare(b.prevu));
    },

    /* ------------------------------------------------------------------ */
    /* Registre des événements de sécurité                                */
    /* ------------------------------------------------------------------ */
    evenements(filtre = {}){
      let l = s.evenements.filter(e => !e.annule_le);
      if (filtre.etablissement) l = l.filter(e => e.etablissement === filtre.etablissement);
      if (filtre.societe) l = l.filter(e =>
        (api.etablissement(e.etablissement) || {}).societe === filtre.societe);
      if (filtre.groupe){
        const ids = new Set(api.etablissementsDuGroupe(filtre.groupe).map(x => x.id));
        l = l.filter(e => ids.has(e.etablissement));
      }
      if (filtre.debut) l = l.filter(e => e.date >= filtre.debut);
      if (filtre.fin)   l = l.filter(e => e.date <= filtre.fin);
      if (filtre.nature) l = l.filter(e => e.nature === filtre.nature);
      if (filtre.gravite) l = l.filter(e => e.gravite === filtre.gravite);
      return l.slice().sort((a, b) => b.date.localeCompare(a.date));
    },
    evenement: (evid) => s.evenements.find(e => e.id === evid) || null,

    /* Trois motifs universels — adresse, téléphone, numéro de sécurité sociale —
       et une liste que Riseva est seule à connaître : les noms des salariés de
       cette société. « Meunier » est un métier avant d'être un patronyme, on ne
       compare donc qu'à cette liste, et seulement au-delà de quatre lettres pour
       ne pas rejeter « Le Mans » à cause d'un salarié qui s'appelle Le. */
    /* Le DIAGNOSTIC, que `traceDePersonne` ne voyait pas : elle attrapait un nom,
       une adresse, un numéro — et « fracture du poignet » passait. Le siège de
       la lésion et sa nature sont des données de santé de l'article 9 du RGPD,
       et le registre promet en toutes lettres de ne pas les héberger. Même liste
       qu'en base, `private.trace_de_sante`. On n'y met ni « main », ni « dos »,
       ni « pied » : ce sont des mots ordinaires du travail, et les refuser
       rendrait le champ inutilisable. */
    traceDeSante(texte){
      const t = " " + normaliserNom(String(texte || "")).toLowerCase() + " ";
      if (!t.trim()) return null;
      for (const mot of ["fracture","fractures","entorse","entorses","luxation","luxations",
        "brulure","brulures","plaie","plaies","hematome","hematomes","contusion","contusions",
        "lombalgie","sciatique","hernie","commotion","traumatisme","traumatismes",
        "intoxication","syncope","suture","sutures","amputation","tendinite",
        "elongation","dechirure","ecchymose","lesion","lesions","diagnostic",
        "radiographie","cicatrice"]){
        if (new RegExp("(^|[^a-z0-9])" + mot + "([^a-z0-9]|$)").test(t))
          return `une description de la blessure (« ${mot} »)`;
      }
      return null;
    },
    traceDePersonne(texte, etid){
      /* Deux lectures du même texte, et il faut les deux : les motifs à ponctuation
         se cherchent sur le texte tel quel (normaliserNom mange le « @ » et les
         points, et une adresse cesse d'en être une), les noms se cherchent sur le
         texte réduit aux lettres. */
      const brut = String(texte || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                                      .toLowerCase();
      const t = normaliserNom(texte).toLowerCase();
      if (!t) return null;
      if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/.test(brut)) return "une adresse électronique";
      if (/(^|[^0-9])0[1-9]([ .-]?[0-9]{2}){4}([^0-9]|$)/.test(brut))
        return "un numéro de téléphone";
      if (/(^|[^0-9])[12][0-9]{2}(0[1-9]|1[0-2])[0-9]{5,8}([^0-9]|$)/.test(brut))
        return "un numéro de sécurité sociale";
      const et = api.etablissement(etid) || {};
      const mots = new Set();
      s.utilisateurs
        .filter(u => u.org && u.org === et.societe && !u.anonyme)
        .forEach(u => normaliserNom(u.nom).toLowerCase().split(/\s+/)
          .forEach(m => { if (m.length >= 4) mots.add(m); }));
      for (const m of mots)
        if (new RegExp(`(^|[^a-z0-9])${m}([^a-z0-9]|$)`).test(t))
          return "le nom d'une personne de votre société";
      return null;
    },
    declarerEvenement(etid, champs, uid){
      const et = api.etablissement(etid);
      if (!et) throw new Error("Site inconnu");
      const d = String(champs.date || "").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new Error("La date de l'événement est obligatoire.");
      if (d > leJour()) throw new Error("Un événement ne se déclare pas à une date future.");
      if (!NATURES_EVENEMENT[champs.nature]) throw new Error("Nature inconnue.");
      if (!GRAVITES_EVENEMENT[champs.gravite]) throw new Error("Gravité inconnue.");
      if (!TYPES_EVENEMENT[champs.type]) throw new Error("Type inconnu.");
      const jours = Math.max(0, Math.round(Number(champs.jours_arret) || 0));
      /* Deux incohérences qu'on voit tout le temps dans les tableaux Excel, et
         qui faussent le taux de gravité sans que personne les remarque. */
      if (champs.gravite === "avec_arret" && jours < 1)
        throw new Error("Un accident « avec arrêt » compte au moins un jour d'arrêt.");
      if (champs.gravite !== "avec_arret" && jours > 0)
        throw new Error("Des journées d'arrêt sur un accident sans arrêt : l'un des deux est faux.");
      const circ = String(champs.circonstances || "").trim().slice(0, MAX_CIRCONSTANCES);
      const zone = String(champs.zone || "").trim().slice(0, 80);
      /* Le seul endroit du registre où quelqu'un peut écrire ce que le schéma
         refuse de stocker. On refuse la ligne plutôt que de la nettoyer en
         silence : nettoyer apprendrait que le champ accepte tout, puisqu'il ne
         dit rien. Même règle qu'en base (private.trace_de_personne). */
      const trace = api.traceDePersonne(circ, etid) || api.traceDePersonne(zone, etid)
                 || api.traceDeSante(circ) || api.traceDeSante(zone);
      if (trace)
        throw new Error("Ce registre ne reçoit ni identité ni donnée de santé, et votre texte "
          + `contient ${trace}. Décrivez la situation, pas la personne.`);
      const ev = { id: id("ev"), etablissement: etid, date: d,
                   nature: champs.nature, gravite: champs.gravite, type: champs.type,
                   zone: zone || null,
                   jours_arret: jours, circonstances: circ || null,
                   declare_par: uid || null,
                   declare_le: leJour(),
                   annule_le: null, motif_annulation: null };
      s.evenements.unshift(ev);
      return ev;
    },
    /* On n'efface pas une ligne d'un registre : on l'annule, en disant pourquoi.
       Une déclaration qui disparaît sans trace est exactement ce qu'un inspecteur
       cherche. */
    annulerEvenement(evid, motif){
      const ev = api.evenement(evid); if (!ev) return null;
      if (!String(motif || "").trim()) throw new Error("Annuler une déclaration exige un motif.");
      ev.annule_le = leJour();
      ev.motif_annulation = String(motif).trim().slice(0, 200);
      return ev;
    },

    /* Les quatre valeurs de sécurité, déduites du registre sur une période.
       C'est la fin de la double saisie : le site déclare ses événements, la
       campagne s'en sert. */
    securiteDuRegistre({ etablissement = null, societe = null, groupe = null,
                         debut, fin } = {}){
      const l = api.evenements({ etablissement, societe, groupe, debut, fin });
      const travail = l.filter(e => e.nature === "travail");
      return {
        at_avec_arret: travail.filter(e => e.gravite === "avec_arret").length,
        at_sans_arret: travail.filter(e => e.gravite === "soin_sans_arret").length,
        at_trajet:     l.filter(e => e.nature === "trajet").length,
        jours_arret:   travail.reduce((n, e) => n + (e.jours_arret || 0), 0),
        /* Les presqu'accidents ne comptent dans aucun taux, et c'est voulu :
           les compter ferait monter la fréquence quand la prévention
           s'améliore. On les suit à part. */
        sans_soin:     l.filter(e => e.gravite === "sans_soin").length,
        evenements:    l.length
      };
    },
    /* Un site tient-il son registre ? Tant qu'il ne l'a pas activé, il saisit ses
       chiffres à la main comme avant. Basculer est une décision, pas un effet de
       bord : sinon un site qui déclare un seul événement verrait ses trois autres
       accidents disparaître du rapport. */
    registreActif: (etid) => !!(api.etablissement(etid) || {}).registre_actif,
    activerRegistre(etid, oui){
      const et = api.etablissement(etid); if (!et) return null;
      et.registre_actif = !!oui; return et;
    },
    /* Ce que le siège lit sans que personne ne lui envoie quoi que ce soit. */
    syntheseSecurite({ societe = null, groupe = null, debut, fin } = {}){
      const sites = groupe ? api.etablissementsDuGroupe(groupe)
                           : api.etablissements(societe || "");
      const parSite = sites.map(et => ({
        etablissement: et,
        registre: api.registreActif(et.id),
        ...api.securiteDuRegistre({ etablissement: et.id, debut, fin })
      }));
      const total = api.securiteDuRegistre({ societe, groupe, debut, fin });
      /* Pareto : les types qui pèsent le plus, dans l'ordre. C'est la seule
         lecture qui dise par où commencer. */
      const parType = {};
      api.evenements({ societe, groupe, debut, fin }).forEach(e => {
        parType[e.type] = (parType[e.type] || 0) + 1;
      });
      const pareto = Object.entries(parType)
        .map(([t, n]) => ({ type: t, label: TYPES_EVENEMENT[t] || t, nombre: n }))
        .sort((a, b) => b.nombre - a.nombre);
      let cumul = 0;
      pareto.forEach(x => { cumul += x.nombre;
        x.part = total.evenements ? Math.round((x.nombre / total.evenements) * 1000) / 10 : 0;
        x.cumul = total.evenements ? Math.round((cumul / total.evenements) * 1000) / 10 : 0; });
      return { debut, fin, sites: parSite, total, pareto,
               /* Un site sans registre n'a pas « zéro accident » : il n'a rien
                  déclaré ici. La différence est tout ce qui compte. */
               sites_sans_registre: parSite.filter(x => !x.registre).map(x => x.etablissement.nom),
               actions: api.actions({ societe, groupe }) };
    },

    /* ------------------------------------------------------------------ */
    /* Plan d'actions                                                      */
    /* ------------------------------------------------------------------ */
    /* Un registre sans actions est un cahier de doléances. C'est aussi la
       première question posée après un accident : qu'avez-vous fait ensuite. */
    actions(filtre = {}){
      let l = s.actions.slice();
      if (filtre.evenement) l = l.filter(a => a.evenement === filtre.evenement);
      if (filtre.etablissement) l = l.filter(a => a.etablissement === filtre.etablissement);
      if (filtre.societe) l = l.filter(a =>
        (api.etablissement(a.etablissement) || {}).societe === filtre.societe);
      if (filtre.groupe){
        const ids = new Set(api.etablissementsDuGroupe(filtre.groupe).map(x => x.id));
        l = l.filter(a => ids.has(a.etablissement));
      }
      if (filtre.etat) l = l.filter(a => a.etat === filtre.etat);
      return l.sort((a, b) => String(a.echeance).localeCompare(String(b.echeance)));
    },
    ajouterAction({ evenement = null, etablissement, quoi, responsable, echeance }){
      const et = api.etablissement(etablissement);
      if (!et) throw new Error("Site inconnu");
      if (!String(quoi || "").trim()) throw new Error("Une action se décrit en une phrase.");
      if (!String(responsable || "").trim())
        throw new Error("Une action sans responsable n'est pas une action, c'est un vœu.");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(echeance || "")))
        throw new Error("Une action sans échéance ne se fait jamais.");
      const a = { id: id("ac"), evenement, etablissement,
                  quoi: String(quoi).trim().slice(0, 240),
                  responsable: String(responsable).trim().slice(0, 120),
                  echeance, etat: "a_faire",
                  cree_le: leJour(), fait_le: null };
      s.actions.unshift(a);
      return a;
    },
    majAction(aid, etat){
      const a = s.actions.find(x => x.id === aid); if (!a) return null;
      if (!ETATS_ACTION[etat]) throw new Error("État d'action inconnu.");
      a.etat = etat;
      a.fait_le = etat === "faite" ? leJour() : null;
      return a;
    },
    actionsEnRetard(filtre = {}){
      const auj = leJour();
      return api.actions(filtre).filter(a =>
        ["a_faire", "en_cours"].includes(a.etat) && a.echeance < auj);
    },

    /* ------------------------------------------------------------------ */
    /* Dossier administratif d'une association                            */
    /* ------------------------------------------------------------------ */
    /* Riseva met des salariés d'entreprises clientes en contact avec des
       associations, et prépare des reçus qui ouvrent droit à réduction d'impôt.
       Le jour où l'une d'elles se révèle radiée, la question posée à Riseva ne
       sera pas « aviez-vous un doute ? » mais « qu'aviez-vous vérifié, quand, et
       qu'est-ce que ça disait ? ». D'où un contrôle daté, conservé, avec la
       réponse brute du registre à côté du verdict.

       Aucune conséquence automatique. Le contrôle informe, il ne décide pas :
       une correspondance imparfaite entre un nom d'usage et une dénomination
       déposée est le cas ordinaire, pas une fraude. */
    enregistrerNumeros(aid, { siren, rna } = {}){
      const a = api.association(aid); if (!a) return null;
      if (siren !== undefined){
        const n = chiffresSeuls(siren);
        if (n && !sirenValide(n))
          throw new Error("Ce numéro SIREN ne peut pas exister : la clé de contrôle est fausse.");
        a.siren = n || null;
      }
      if (rna !== undefined){
        const v = String(rna || "").trim().toUpperCase();
        if (v && !rnaValide(v))
          throw new Error("Un numéro RNA s'écrit W suivi de neuf caractères.");
        a.rna = v || null;
      }
      return a;
    },

    controlerEnregistrement(aid, { fiche = null, panne = false, par = null } = {}){
      const a = api.association(aid); if (!a) return null;
      const numero = a.siren || null;
      let etat, ecarts = [];
      if (panne) etat = "panne";
      else if (!numero && !fiche) etat = "absent";
      else {
        const c = comparerFiche(a, fiche);
        etat = c.etat; ecarts = c.ecarts;
      }
      const c = {
        id: id("ct"), association: aid, le: leJour(),
        par, etat, ecarts,
        bloquant: !!(ETATS_CORRESPONDANCE[etat] || {}).bloquant,
        numero, fiche: fiche || null, source: ANNUAIRE.source
      };
      s.controles.unshift(c);
      /* On ne recopie que ce que l'association n'a pas renseigné elle-même. Le
         registre complète, il n'écrase pas : une association qui a corrigé son
         adresse dans Riseva sait mieux que le fichier où elle reçoit son
         courrier. */
      if (fiche && !panne){
        if (!a.rna && fiche.rna) a.rna = fiche.rna;
        if (!a.nom_juridique && fiche.nom) a.nom_juridique = fiche.nom;
        if (!a.adresse && fiche.adresse) a.adresse = fiche.adresse;
        if (a.lat == null && fiche.lat != null){ a.lat = fiche.lat; a.lon = fiche.lon; }
        if (!a.ville && fiche.commune)
          a.ville = fiche.commune.charAt(0) + fiche.commune.slice(1).toLowerCase();
      }
      return c;
    },
    controlesDe: (aid) => s.controles.filter(c => c.association === aid),
    dernierControle: (aid) => s.controles.find(c => c.association === aid) || null,

    /* Ce qu'un administrateur Riseva doit avoir sous les yeux avant de mettre une
       association en ligne, et ce que l'association voit d'elle-même. Les deux
       lisent le même objet : deux vues divergentes du même dossier finissent
       toujours par se contredire devant quelqu'un. */
    dossierAdministratif(aid, { aujourdhui = leJour() } = {}){
      const a = api.association(aid); if (!a) return null;
      const c = api.dernierControle(aid);
      const perime = c ? (function(){
        const d = new Date(c.le); d.setDate(d.getDate() + ANNUAIRE.validite_controle_jours);
        return d.toISOString().slice(0, 10) < aujourdhui;
      })() : true;
      const r = api.reglagesRecus(aid);

      /* Ce qui manque pour que l'association puisse recevoir des dons donnant
         lieu à reçu. Chaque ligne est une action, pas un reproche : le but est
         qu'une présidente sache en dix secondes ce qu'il lui reste à faire. */
      const manque = [];
      if (!a.siren) manque.push({ quoi:"numéro SIREN", pourquoi:"permet de vérifier l'association au registre public, sans pièce à envoyer" });
      if (!r.eligible_mecenat) manque.push({ quoi:"déclaration d'éligibilité au mécénat", pourquoi:"sans elle, aucun reçu n'est préparé (art. 200 et 238 bis du CGI)" });
      if (!r.signataire) manque.push({ quoi:"nom du signataire", pourquoi:"un reçu non signé est irrégulier" });
      if (!r.qualite)    manque.push({ quoi:"qualité du signataire", pourquoi:"président, trésorier : elle figure sur le reçu" });
      if (!r.prefixe)    manque.push({ quoi:"numérotation des reçus", pourquoi:"la série doit être continue et sans doublon (BOI-IR-RICI-250-40)" });

      return {
        association: a, siren: a.siren || null, rna: a.rna || null,
        controle: c, controle_perime: perime,
        bloquant: !!(c && c.bloquant),
        en_ligne: !!a.valide && !a.suspendue,
        recus_prets: api.recusPrets(aid),
        manque,
        limites: ANNUAIRE_LIMITES
      };
    },

    /* ------------------------------------------------------------------ */
    /* Moteur : ce qui se fait tout seul                                  */
    /* ------------------------------------------------------------------ */
    /* Quatre automatismes tournent sans que personne les déclenche. En production
       ce sont des tâches planifiées côté base (voir supabase/05_taches.sql) ;
       ici elles s'exécutent au chargement, ce qui donne exactement le même résultat.
       Chaque passage est daté et consigné : une automatisation qu'on ne peut pas
       auditer inquiète plus qu'elle ne rassure. */
    moteur(aujourdhui = leJour()){
      const fait = { validations_auto:0, annonces_fermees:0, intentions_expirees:0,
                     rapports:0, recus_emis:0, classement:false, le: aujourdhui };

      /* 1. Une association qui ne répond pas ne doit pas bloquer le client.
            Quatorze jours après la déclaration, la mission est comptée. */
      s.missions.filter(m => m.etat === "a_valider").forEach(m => {
        if (api.echeanceAuto(m).toISOString().slice(0, 10) <= aujourdhui){
          m.etat = "validee_auto";
          m.tranchee_le = aujourdhui;
          /* Aucun compteur à incrémenter : les totaux se relisent dans les missions.
             Un compteur qu'on additionne ici est un compteur qu'on oublie de
             décrémenter là, et le score dérive sans que personne s'en aperçoive. */
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

      /* 3. Les rapports arrivent tout seuls. « Générés automatiquement » ne veut
            rien dire tant que personne ne les reçoit : ce qui compte pour un
            client, c'est que le document tombe dans sa boîte sans qu'il ait
            pensé à le demander. Chaque envoi porte une clé, et une clé déjà
            présente n'est jamais renvoyée — un rapport reçu deux fois est une
            erreur qu'on remarque, et qui coûte la confiance dans tout le reste. */
      s.entreprises.forEach(e => {
        const dest = api.administrateurs(e.id)[0];
        api.rapports(e.id).filter(r => r.etat === "genere").forEach(r => {
          const cle = `rapport:${e.id}:${r.id}`;
          if (s.envois.some(x => x.cle === cle)) return;
          s.envois.unshift({ id: id("en"), cle, type: "rapport",
            entreprise: e.id, destinataire: dest ? dest.email : null,
            sujet: `${r.titre}, ${e.nom}`,
            detail: `Période du ${r.periode.debut} au ${r.periode.fin}, ${r.points} points retenus.`,
            date: r.genere_le || aujourdhui, etat: dest ? "envoyé" : "sans destinataire" });
          fait.rapports++;
        });
      });

      /* 4. Une intention de don que personne n'a virée finit par s'éteindre. Sans
            échéance, le « reste à financer » d'une annonce serait faux en
            permanence, et l'association verrait s'empiler des promesses. Rien
            n'est crédité, rien n'est reproché : l'intention s'efface. */
      s.intentions.filter(i => i.etat === "annoncee" && i.expire_le < aujourdhui)
        .forEach(i => { i.etat = "abandonnee"; i.motif = "sans virement à l'échéance";
                        fait.intentions_expirees++; });

      /* 5. Le rattrapage des reçus. Un reçu ne s'émet qu'à l'instant où le don est
            confirmé : une association qui complète ses réglages APRÈS avoir
            encaissé — le cas normal, on encaisse d'abord — gardait ses dons
            antérieurs sans reçu pour toujours. Ces montants sortaient de sa
            déclaration annuelle et ses donateurs n'avaient rien à joindre à la
            leur. La même tâche existe côté base, `private.tache_recus`. */
      s.missions.filter(m => m.etat === "validee").forEach(m => {
        if (api.emettreRecuSiPret(m)) fait.recus_emis++;
      });

      /* 6. Le classement est recalculé chaque lundi. On ne stocke pas de rang :
            il se déduit des points, ce qui évite tout écart entre l'affiché et le réel. */
      s.classement_recalcule_le = aujourdhui;
      fait.classement = true;

      s.moteur_journal.unshift(fait);
      s.moteur_journal = s.moteur_journal.slice(0, 30);
      return fait;
    },
    journalMoteur: () => s.moteur_journal,
    /* Ce qui est réellement parti, avec sa clé d'unicité. Un client qui demande
       « ai-je bien reçu mon rapport du deuxième trimestre » doit avoir une
       réponse, pas une conviction. */
    envois: (filtre = {}) => s.envois.filter(x =>
      (!filtre.entreprise || x.entreprise === filtre.entreprise) &&
      (!filtre.type || x.type === filtre.type)),

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
    /* La fiche VSME : ce que Riseva sait, rangé dans les rubriques de la norme.
       Ce n'est pas un rapport de durabilité et la fiche le dit en toutes lettres.
       Trois règles tiennent son honnêteté :
       1. une rubrique non couverte est écrite « non couverte », jamais laissée
          vide et jamais remplie d'un zéro — un blanc se lit « rien à déclarer »,
          ce qui est un mensonge par omission ;
       2. les chiffres viennent des observations APPROUVÉES de la campagne. Une
          saisie non relue n'entre pas dans un document qui part chez un client ;
       3. la fiche porte la date de vérification de la norme, parce que le texte
          est en cours de reprise par acte délégué. */
    ficheVSME(sid, { campagne = null } = {}){
      const e = api.entreprise(sid); if (!e) return null;
      const sites = api.etablissements(sid);
      const cam = campagne ? api.campagne(campagne)
        : api.campagnes(e.groupe || undefined).find(c => c.etat === "close")
          || api.campagnes(e.groupe || undefined)[0] || null;
      const ind = cam ? api.indicateursDe({ campagne: cam.id, societe: sid,
                                            approuvesSeulement: true }) : null;
      const val = (cle) => {
        if (!ind) return null;
        const d = INDICATEURS.calcules.find(x => x.cle === cle);
        /* Un taux dont le numerateur et le denominateur ne portent pas sur les
           memes sites a l'air juste et ne l'est pas. A l'ecran, on l'affichait
           avec un asterisque et la phrase « a ne pas publier tel quel ». Cette
           fiche-ci EST la publication : elle part chez un donneur d'ordre ou chez
           une banque, sans l'asterisque et sans la phrase. Le chiffre n'y entre
           donc pas ; la rubrique se dit non renseignee, ce qui est la verite. */
        if (d && ind.assise[cle] === false) return null;
        const v = d ? ind.calcules[cle] : ind.somme[cle];
        return v === undefined || v === null ? null : v;
      };
      /* Une somme de zéros n'est pas une donnée : si aucun site n'a répondu, la
         rubrique est « non renseignée », pas « zéro accident ». */
      const renseigne = !!(ind && ind.sites > 0);

      const reel = api.realisations({ entreprise: sid });
      const mecenat = api.valorisationMecenat(sid);
      const materiel = s.missions.filter(m => m.entreprise === sid
        && ["validee", "validee_auto"].includes(m.etat)
        && (api.annonceDe(m) || {}).type === "don_materiel");
      const secu = api.syntheseSecurite({ societe: sid,
        debut: cam ? cam.debut : s.saison.debut, fin: cam ? cam.fin : s.saison.fin });
      const plan = api.actions({ societe: sid });

      const rubriques = VSME.sections.map(sec => {
        const lignes = [];
        (sec.indicateurs || []).forEach(cle => {
          const d = INDICATEURS.saisis.find(x => x.cle === cle);
          lignes.push({ cle, libelle: d ? d.libelle : cle, unite: d ? d.unite : "",
                        valeur: renseigne ? val(cle) : null });
        });
        (sec.calcules || []).forEach(cle => {
          const d = INDICATEURS.calcules.find(x => x.cle === cle);
          lignes.push({ cle, libelle: d ? d.libelle : cle, unite: "",
                        valeur: renseigne ? val(cle) : null, calcule: true });
        });
        if (sec.cle === "B1"){
          lignes.push({ cle:"perimetre", libelle:"Périmètre de la fiche", unite:"",
                        texte: `${e.nom}${e.siren ? ` (SIREN ${e.siren})` : ""}, `
                          + `${sites.length} établissement${sites.length > 1 ? "s" : ""}` });
          const jf = (d) => String(d || "").split("-").reverse().join("/");
          lignes.push({ cle:"periode", libelle:"Période", unite:"",
                        texte: cam ? `${cam.libelle}, du ${jf(cam.debut)} au ${jf(cam.fin)}`
                                   : "aucune campagne de collecte" });
        }
        if (sec.cle === "B2"){
          /* Uniquement le confirmé. L'estimé a sa place sur un tableau de bord,
             pas dans une fiche que le client transmet à sa banque : c'est là que
             la différence entre « on a compté » et « on suppose » se paie. */
          const unites = (reel.liste || []).map(x =>
            `${Math.round(x.quantite)} ${x.quantite > 1 ? x.pl : x.un}`);
          lignes.push({ cle:"missions", libelle:"Missions confirmées par les associations",
                        unite: reel.missions > 1 ? "missions" : "mission",
                        valeur: reel.missions });
          lignes.push({ cle:"resultats",
                        libelle:"Résultats constatés sur le terrain, hors estimations",
                        unite:"", texte: unites.length ? unites.join(", ")
                                                       : "aucun résultat confirmé" });
          lignes.push({ cle:"mecenat", libelle:"Mécénat de compétences valorisé",
                        unite:"€", valeur: mecenat.competencesRetenu });
          lignes.push({ cle:"heures", libelle:"Heures mises à disposition sur le temps de travail",
                        unite:"heures", valeur: Math.round(mecenat.heuresTT) });
          const ouvertes = plan.filter(a => a.etat !== "abandonnee").length;
          lignes.push({ cle:"actions", libelle:"Actions de prévention ouvertes au plan",
                        unite: ouvertes > 1 ? "actions" : "action", valeur: ouvertes });
          const faites = plan.filter(a => a.etat === "faite").length;
          lignes.push({ cle:"actions_faites", libelle:"dont menées à leur terme",
                        unite: faites > 1 ? "actions" : "action", valeur: faites });
        }
        if (sec.cle === "B7"){
          const valeurDeclaree = materiel.reduce((n, m) => n + (Number(m.valeur_declaree) || 0), 0);
          lignes.push({ cle:"reemploi", libelle:"Dons de matériel réemployé",
                        unite: materiel.length > 1 ? "dons" : "don",
                        valeur: materiel.length });
          /* Le libellé ne nomme plus de méthode. « Valeur nette comptable » était
             faux comme règle unique — un bien en stock se valorise à son coût de
             revient, une immobilisation à la valeur de cession retenue pour la
             plus ou moins-value de sortie — et surtout ce n'est pas Riseva qui
             valorise : c'est le donateur. Un indicateur VSME qui annonce une
             méthode que l'outil n'applique pas est une affirmation de plus à
             défendre devant un commissaire aux comptes. */
          lignes.push({ cle:"reemploi_valeur",
                        libelle:"Valeur déclarée par l'entreprise, matériel réemployé",
                        unite:"€", valeur: valeurDeclaree || null });
          lignes.push({ cle:"reemploi_nature", libelle:"Nature du matériel", unite:"",
                        texte: materiel.map(m => m.nature).filter(Boolean).join(", ")
                               || "non détaillée" });
        }
        if (sec.cle === "B9"){
          const avec = sites.length - (secu.sites_sans_registre || []).length;
          lignes.push({ cle:"sites_registre", libelle:"Sites tenant le registre dans Riseva",
                        unite: avec > 1 ? "sites" : "site", valeur: avec });
        }
        return { ...sec, lignes,
                 /* Une rubrique annoncée couverte dont toutes les lignes sont
                    vides ne l'est pas : on le dégrade plutôt que de l'afficher. */
                 renseignee: lignes.some(l => l.texte
                   || (l.valeur !== null && l.valeur !== undefined)) };
      });

      return {
        entreprise: e, sites, campagne: cam, indicateurs: ind,
        norme: VSME, rubriques,
        couvertes: rubriques.filter(r => r.couvert !== "non" && r.renseignee).length,
        total: rubriques.length,
        /* Ce que la fiche N'EST PAS. Cette phrase n'est pas une précaution
           d'avocat : sans elle, un acheteur pourrait croire tenir un rapport de
           durabilité, et l'entreprise croire s'être acquittée de quelque chose. */
        avertissement: "Cette fiche n'est pas un rapport de durabilité et ne vaut pas "
          + "publication au sens de la norme VSME. C'est un relevé de ce que Riseva "
          + "détient, rangé dans les rubriques de la norme pour vous éviter de le "
          + "recopier. Les rubriques marquées « non couverte » ne sont pas à zéro : "
          + "elles ne sont pas renseignées, et il faut aller les chercher ailleurs."
      };
    },

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
        return n + (a ? heuresPour(a.type, m.quantite) : 0);
      }, 0);

      const tranchees = s.missions.filter(m => ids.includes(m.entreprise)
        && ["validee", "validee_auto", "refusee"].includes(m.etat));
      const auto = s.missions.filter(m => ids.includes(m.entreprise) && m.etat === "validee_auto");

      const pct = (n, d) => d ? Math.round((n / d) * 1000) / 10 : null;
      const ouvertes = s.annonces.filter(a => a.etat === "ouverte");
      const fraiches = ouvertes.filter(a => a.date >= leJour());

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
          definition: "100 x X divisé par I0. Nombre d'actions validées pour cent salariés invités." },
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
        if (estTemps(a.type))
          demiJournees += heuresPour(a.type, m.quantite) / FISCAL.heures_demi_journee;
        if (estArgent(a.type)) euros += Number(m.quantite) || 0;
        if (a.type === "don_materiel") materiel += m.quantite;
      });
      return {
        entreprises: s.entreprises.length,
        associations: s.associations.filter(a => a.valide).length,
        missions: ms.length,
        /* Confirmées et clôturées d'office ne se totalisent pas sous le même mot :
           « validées par les associations » recouvrait les deux, ce qui attribuait
           à quelqu'un un accord qu'il n'a jamais donné. */
        confirmees: ms.filter(m => m.etat === "validee").length,
        closesSansReponse: ms.filter(m => m.etat === "validee_auto").length,
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
      const aujourdhui = leJour();
      /* Un rapport ne se scelle pas le dernier jour de sa période : il se scelle
         quand les validations sont closes, quatorze jours plus tard. L'arrêter
         plus tôt le fige incomplet — deux semaines de missions déclarées en fin
         de période n'y figureraient jamais. Le serveur applique cette règle
         depuis toujours ; l'écran, lui, annonçait « généré » deux semaines
         d'avance, et le client cherchait un courriel qui n'était pas parti. */
      const arrete = (fin) => {
        const d = new Date(fin); d.setDate(d.getDate() + DELAI_VALIDATION_JOURS);
        return d.toISOString().slice(0, 10);
      };
      const trimestres = api.trimestres(eid);
      const l = bornes.map((b, i) => ({
        id: "t" + (i + 1), portee: "trimestriel", titre: "Rapport " + b.nom,
        periode: b, points: (trimestres[i] || {}).points || 0,
        etat: arrete(b.fin) < aujourdhui ? "genere" : "a_venir",
        genere_le: arrete(b.fin) < aujourdhui ? arrete(b.fin) : null
      }));
      l.push({ id: "annuel", portee: "annuel", titre: "Rapport annuel",
        periode: { nom: sa.nom, debut: sa.debut, fin: sa.fin },
        points: api.pointsDe(eid).retenu,
        etat: arrete(sa.fin) < aujourdhui ? "genere" : "a_venir",
        genere_le: arrete(sa.fin) < aujourdhui ? arrete(sa.fin) : null });
      return l;
    },

    /* --- rapports --- */
    rapport(eid, portee = "annuel"){
      const e = api.entreprise(eid);
      /* Les dons personnels des salaries sortent du rapport de l'entreprise. Ils
         n'entrent pas dans son score, ils n'entrent pas dans son assiette de
         mecenat, et ils ne la regardent pas : le seuil d'agregation de cinq
         donateurs n'a aucun sens si le meme montant ressort ligne a ligne dans
         le rapport annuel et dans son export. */
      const ms = api.missions({ entreprise: eid })
                    .filter(m => m.etat === "validee" || m.etat === "validee_auto")
                    .filter(m => !api.estDonPersonnel(m));
      const parType = {};
      let euros = 0;
      ms.forEach(m => {
        const a = api.annonceDe(m); if (!a) return;
        parType[a.type] = (parType[a.type] || 0) + m.points;
        if (estArgent(a.type)) euros += m.quantite;
      });
      const salaries = api.salaries(eid);
      return {
        portee, entreprise: e, saison: s.saison,
        points: api.pointsDe(eid).retenu, rang: api.rangDe(eid), total: s.entreprises.length,
        missions: ms.length, parType, euros,
        salariesEngages: salaries.filter(u => api.pointsVisiblesEmployeur(u.id) > 0).length,
        salariesTotal: salaries.length,
        trimestres: api.trimestres(eid),
        demiJournees: ms.filter(m => estTemps((api.annonceDe(m)||{}).type))
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

  /* Les missions du jeu de démonstration portent un consentement daté mais pas
     son texte : elles sont écrites à la main dans ce fichier, et recopier la
     phrase trois fois aurait garanti qu'une des trois finisse par diverger. On
     la compose donc ici, une fois, à partir de la même méthode que la vraie.
     C'est un rattrapage de fixture, et il est écrit là où on le voit : sur une
     mission réelle, le texte est figé au moment de l'accord et jamais
     reconstitué — reconstituer a posteriori le texte auquel quelqu'un a
     consenti, c'est précisément ce qu'un consentement doit empêcher. */
  s.missions.forEach(m => {
    if (m.consentement && !m.consentement.texte)
      m.consentement.texte = api.texteConsentement(m.annonce);
  });

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
/* La base vierge, c'est-à-dire le premier jour                        */
/* ------------------------------------------------------------------ */
/* Une plateforme se juge sur son premier jour, pas sur sa démonstration. Le
   jeu de démonstration montre le produit plein : deux cent vingt-trois missions,
   treize associations, un classement de douze entreprises. C'est ce qu'il faut
   pour vendre, et c'est exactement ce qu'un client n'aura JAMAIS le jour où il
   ouvre son espace.

   Ce qu'un écran doit faire quand il n'y a rien : dire qu'il n'y a rien, dire
   pourquoi, et donner le geste suivant. Ce qu'il ne doit jamais faire : afficher
   « NaN », « undefined », une division par zéro, un classement vide avec un
   podium, ou pire, un chiffre du jeu de démonstration.

   Cet état sert à le vérifier automatiquement, écran par écran et rôle par rôle.
   Il contient ce qu'une installation neuve contient réellement : une saison
   ouverte, le barème, et rien d'autre. Pas une entreprise, pas une association,
   pas une mission. */
export function etatVierge({ saison = null } = {}){
  const annee = new Date().getFullYear() + 1;
  return {
    saison: saison || { id:"s" + annee, nom:"Saison " + annee,
      debut: annee + "-01-01", fin: annee + "-12-31", etat:"ouverte",
      prix_min: TARIFS.paliers[0].prix, prix_max: TARIFS.paliers.at(-1).prix,
      acompte: TARIFS.acompte_minimum },
    groupes: [], etablissements: [], evenements: [], actions: [],
    entreprises: [], contrats: [], associations: [], annonces: [],
    campagnes: [], observations: [], missions: [], utilisateurs: [],
    signalements: [], sourcing: [], acces: [], invitations: [],
    preinscriptions: [], controles: [], intentions: [], envois: [],
    expeditions: [], rapports_generes: [], moteur_journal: [], pieces: [],
    recus_emis: [],
    classement_recalcule_le: null
  };
}

/* ------------------------------------------------------------------ */
/* Sélection de l'implémentation                                       */
/* ------------------------------------------------------------------ */
const creerMock = () => creerMoteur();
let impl = creerMock();
let branche = false;

/* Vrai seulement quand la couche Supabase a effectivement pris la main. Tout ce
   qui affiche un chiffre devant un client — et d'abord la page d'accueil — doit
   le demander avant de publier quoi que ce soit : un total tiré du jeu de
   démonstration, présenté comme un résultat, est un mensonge commercial même
   quand personne ne l'a voulu. */
export function donneesReelles(){ return branche; }

/* Démarrer sur une base vierge, sans rien persister : c'est l'état du premier
   jour, et c'est celui qu'on veut pouvoir traverser écran par écran. */
export function demarrerVierge(){
  /* Elle se persiste, comme la demonstration : sans cela, une entreprise creee
     sur une base vierge disparait au premier rechargement, et on ne peut pas
     traverser le produit tel qu'un vrai premier client le traverse. */
  /* Si une visite precedente a laisse un etat sous cette cle, on le reprend :
     passer un etat neuf a `creerMoteur` court-circuiterait la sauvegarde, et le
     compte ouvert il y a dix secondes disparaitrait au rechargement. */
  const reprise = lireEtat(CLE_VIERGE);
  impl = creerMoteur({ etat: reprise ? null : etatVierge(), persister: true,
                       mode: "vierge", cle: CLE_VIERGE });
  branche = false;
  return impl;
}

/* Repartir de zero sur la base vierge : c'est ce que fait la recette entre deux
   parcours, et ce qu'un demonstrateur veut avant de montrer le premier jour. */
export function reinitialiserVierge(){
  try { localStorage.removeItem(CLE_VIERGE); } catch (e) {}
  return demarrerVierge();
}

/* Domaines sur lesquels la démonstration n'a rien à faire. Un client qui ouvre
   riseva.fr et voit des chiffres inventés ne le saura jamais : c'est la
   confusion la plus coûteuse que ce produit puisse produire. */
const DOMAINES_PRODUCTION = ["riseva.fr", "www.riseva.fr", "app.riseva.fr"];

export function estProduction(){
  try { return DOMAINES_PRODUCTION.includes(location.hostname); }
  catch { return false; }
}

/* Se connecter au vrai dos, ou refuser de démarrer.
   L'ancienne version ajoutait `client: sb` à l'objet de démonstration et
   renvoyait la main : toutes les méthodes continuaient à lire et à écrire dans
   le navigateur. Une configuration Supabase valide donnait donc l'illusion
   d'être en production tout en servant des données inventées. Tant que la
   couche Supabase n'est pas écrite méthode par méthode, il vaut mieux que ce
   soit visible, bruyant, et bloquant. */
/* Le controle de completude. Il rend la liste de ce qui manque, et refuse le
   demarrage en production : servir de la demonstration a un client qui croit
   voir ses donnees est la panne la plus couteuse que ce produit puisse
   provoquer, et la perdre en silence en est la deuxieme. */
export function ecrituresManquantes(dos){
  const branchees = new Set((dos && dos.ecrituresBranchees) || []);
  return ECRITURES.filter(k => !branchees.has(k));
}

function verifierEcritures(dos){
  const manquantes = ecrituresManquantes(dos);
  if (!manquantes.length) return manquantes;
  const message = "Riseva : " + manquantes.length + " écriture(s) n'ont pas de fonction "
    + "Postgres (" + manquantes.slice(0, 6).join(", ")
    + (manquantes.length > 6 ? ", ..." : "") + ").";
  if (estProduction())
    throw new Error(message + " Démarrage refusé : mieux vaut un refus qu'un "
      + "enregistrement qui ne quitte jamais l'onglet.");
  console.warn(message + " En production, le démarrage serait refusé.");
  return manquantes;
}

/* La demonstration, demandee explicitement, meme en production.
   ------------------------------------------------------------
   Le site vitrine a un bouton « Ouvrir la demonstration ». Sur riseva.fr, ce
   bouton menait a l'application branchee sur la vraie base : un prospect
   tombait sur un ecran de connexion et une base vide, c'est-a-dire sur rien.
   L'inverse — servir la demonstration a un client qui croit voir ses donnees —
   reste interdit, et c'est pour cela que le parametre doit etre EXPLICITE dans
   l'adresse et que l'ecran l'affiche en clair. Personne n'arrive ici par
   accident : on y arrive en cliquant sur un lien qui le dit. */
export function demoDemandee(){
  try { return new URLSearchParams(location.search).get("demo") === "1"; }
  catch { return false; }
}

/* ---------------------------------------------------------------------- */
/* L'AUTHENTIFICATION                                                       */
/*                                                                          */
/* Ce qui manquait, et ce que ca rendait faux. L'ecran de connexion promet   */
/* « nous vous envoyons un lien de connexion » depuis le premier jour, et    */
/* aucun appel a `signInWithOtp` n'existait dans le depot. En demonstration  */
/* ca ne se voyait pas : la connexion retrouve le compte dans la liste en    */
/* memoire et pose un identifiant dans le navigateur. En production, ce meme */
/* code posait un identifiant que Postgres n'a jamais vu : aucune session,   */
/* donc aucun jeton, donc la RLS ne rend rien. L'ecran de connexion etait    */
/* une facade, et la page de rejointe annoncait « compte cree » sans qu'un   */
/* compte existe nulle part.                                                */
/*                                                                          */
/* Le mot de passe, lui, n'existe pas et c'est un choix : un lien a usage    */
/* unique envoye par courriel. Il n'y a donc pas de mot de passe a perdre,   */
/* pas de mot de passe a voler dans notre base, et rien a hacher chez nous.  */
/* Supabase Auth garde l'empreinte du lien et fait expirer la session ;      */
/* notre code ne voit jamais qu'un jeton, et ne l'ecrit nulle part.          */

let clientAuth = null;

/* Le client d'authentification, meme quand la couche de donnees n'est pas
   branchee : la page de rejointe et l'ecran de connexion en ont besoin avant
   d'avoir la moindre donnee a lire. */
export async function clientDAuth(config = null){
  if (clientAuth) return clientAuth;
  const c = config || (typeof window !== "undefined" ? window.RISEVA_CONFIG : null);
  if (!c || !c.url || !c.anonKey) return null;
  const { createClient } = await chargerPilote();
  clientAuth = createClient(c.url, c.anonKey);
  return clientAuth;
}

/* Demander le lien. `emailRedirectTo` ramene la personne sur l'ecran d'ou elle
   est partie : un salarie qui vient d'un lien d'inscription doit revenir sur ce
   lien-la, code compris, sinon il se retrouve authentifie et sans entreprise. */
/* `creerCompte` : faut-il ouvrir un compte à une adresse inconnue ?
   ------------------------------------------------------------------
   OUI sur les deux chemins d'entrée — le lien d'inscription d'un salarié et
   l'ouverture d'un compte d'organisation — parce que la personne n'a par
   définition pas encore de compte.

   NON sur l'écran de connexion. Il est public : laissé ouvert, il acceptait
   n'importe quelle adresse, faisait partir un courriel signé Riseva vers un
   tiers, et créait la ligne `auth.users` correspondante. Répété, cela vide le
   quota d'envoi du projet — plus aucun salarié légitime ne reçoit son lien —
   et remplit la table des comptes d'adresses qui n'ont rien demandé.

   Le refus qui en découle ne doit RIEN révéler : `compteInconnu` est vrai quand
   Supabase répond que l'adresse n'existe pas, et l'appelant affiche alors le
   même message que dans le cas contraire. Répondre « aucun compte avec cette
   adresse » sur une page publique, c'est offrir un annuaire de qui travaille
   ou non chez un client. */
export async function envoyerLienConnexion(email, { retour = null, creerCompte = true } = {}){
  const c = await clientDAuth();
  if (!c) throw new Error("Cette installation n'a pas de configuration serveur.");
  const { error } = await c.auth.signInWithOtp({
    email: String(email || "").trim().toLowerCase(),
    options: { emailRedirectTo: retour || location.href, shouldCreateUser: creerCompte }
  });
  if (error){
    const e = new Error(error.message);
    e.compteInconnu = !creerCompte
      && /not found|n'existe|signups? not allowed|user not allowed|disabled/i.test(error.message || "");
    throw e;
  }
  return true;
}

/* Le RIB d'UNE association, demandé au serveur. Les coordonnées bancaires ne
   sont plus accordées en bloc à qui n'est pas connecté : rendre l'annuaire
   complet des IBAN du réseau en une requête, c'est fournir la matière première
   d'une fraude au changement de RIB. La fiche publique en demande un, celui de
   l'association qu'on regarde.

   Sans serveur — démonstration, base vierge — on retombe sur le moteur, qui
   porte les mêmes champs. */
export async function coordonneesDonPubliques(aid){
  const c = await clientDAuth();
  if (!c) return DB.coordonneesDon(aid);
  try {
    const { data, error } = await c.rpc("coordonnees_don", { p_association: aid });
    if (error) return null;
    const r = Array.isArray(data) ? data[0] : data;
    if (!r || !r.iban) return null;
    return { iban: r.iban, iban_lisible: ibanLisible(r.iban), bic: r.bic || null,
             titulaire: r.titulaire || null };
  } catch (e){ return null; }
}

/* La session, s'il y en a une. Le jeton n'est pas recopie sur `window` : un
   jeton pose sur un global enumerable se lit en une ligne depuis n'importe quel
   script tiers charge par la page. On le redemande au moment de s'en servir. */
export async function sessionAuth(){
  const c = await clientDAuth();
  if (!c) return null;
  const { data } = await c.auth.getSession();
  return data && data.session ? data.session : null;
}

export async function jetonAuth(){
  const s = await sessionAuth();
  return s ? s.access_token : null;
}

export async function seDeconnecter(){
  const c = await clientDAuth();
  if (c) { try { await c.auth.signOut(); } catch (e) { /* deja parti */ } }
}

export async function connecterSupabase(config, { client: injecte = null } = {}){
  if (demoDemandee()){
    /* On ne touche pas a `impl` : il porte deja le moteur de demonstration. La
       seule chose a faire est de ne pas se brancher. */
    branche = false;
    return impl;
  }
  /* `injecte` sert à la recette : elle branche un client factice alimenté par un
     export de la vraie base, pour prouver que la traduction des lignes tient
     sans avoir à monter un Supabase. Le chemin de production, lui, ne le passe
     jamais. */
  if (injecte){
    const dos = creerSupabase(injecte);
    await dos.recharger();
    /* La recette passe par ici : elle doit constater la meme completude que la
       production, sinon le controle ne serait verifie par personne. */
    verifierEcritures(dos);
    impl = dos; branche = true; return impl;
  }
  if (!config || !config.url || !config.anonKey){
    if (estProduction())
      throw new Error("Riseva : aucune configuration Supabase. Le mode démonstration "
        + "est interdit sur le domaine de production.");
    return impl;                                    // développement : démo assumée
  }
  const { createClient } = await chargerPilote();
  const client = createClient(config.url, config.anonKey);
  /* Le jeton de la session, mis a disposition des appels aux fonctions Edge.
     C'est le meme que celui que la bibliotheque envoie deja a chaque requete :
     il ne sort pas de l'onglet, et il expire avec la session. */
  /* Le client d'authentification et celui des donnees sont le meme objet : deux
     clients, ce seraient deux sessions, et la seconde ne saurait rien de la
     premiere. */
  clientAuth = client;
  const dos = creerSupabase(client);
  /* On charge avant de vérifier : tant que l'état n'est pas là, la couche n'a
     que ses écritures et la vérification ci-dessous se plaindrait à tort. */
  await dos.recharger();
  /* Sur les cles PROPRES de l'objet, pas a travers le Proxy : celui-ci retombe
     sur le moteur et repondait « oui » pour tout. */
  verifierEcritures(dos);
  impl = dos;
  branche = true;
  return impl;
}

/* ------------------------------------------------------------------ */
/* Les ecritures : ce qui doit exister cote serveur                    */
/* ------------------------------------------------------------------ */
/* Une derivation peut se calculer dans le navigateur, sur l'etat charge et
   filtre par la RLS : elle ne fait que relire. Une ECRITURE, non. Si elle n'a
   pas sa fonction Postgres, l'ecran confirme un enregistrement qui n'a jamais
   quitte l'onglet, et le client s'en apercoit au rechargement suivant.

   Cette liste existe parce que le controle qui devait l'attraper ne pouvait pas
   fonctionner : il interrogeait `dos[k]`, et `dos` est un Proxy qui retombe sur
   le moteur, donc `typeof dos[k]` valait toujours "function" et la liste des
   methodes manquantes etait toujours vide. Le controle passait, et une
   trentaine d'ecritures se perdaient en silence.

   Deux categories, et la difference compte :
   - BRANCHEES : elles ont leur RPC, elles sont dans `dos`.
   - PAS_ENCORE : leur fonction Postgres n'est pas ecrite. Elles LEVENT en
     production au lieu d'ecrire en memoire. C'est desagreable, et c'est le but :
     une erreur visible vaut mieux qu'une donnee perdue. */
const ECRITURES = [
  "abandonnerIntentionDon", "accepterInvitationCSE", "accepterInvitationReferent",
  /* `reglerVisibiliteParis` porte un choix de vie privee — « mon prenom est
     visible de mes collegues » — qui se perdait en silence au rechargement.
     `moteur` mute l'etat a chaque ouverture de session. Les deux manquaient. */
  "reglerVisibiliteParis", "moteur",
  "accepterMandatRecus", "activerClassementSites", "activerRegistre", "ajouterAction",
  "ajouterEtablissement", "allouerQuota", "annulerEvenement", "approuverIndicateurs",
  "cloreCampagne", "confirmerAffectation", "confirmerDonRecu", "confirmerReception",
  "controlerEnregistrement", "creerAnnonce", "creerCompteAssociation",
  "creerCompteEntreprise", "creerInvitation", "creerInvitationCSE",
  "creerInvitationReferent", "deciderSignalement", "declarerEvenement", "declarerFaite",
  "declarerIntentionDon", "declarerValeurMateriel", "delierHelloAsso", "engager",
  "enregistrerHelloAsso", "joindrePiece", "lierHelloAsso",
  "enregistrerIban", "enregistrerNumeros", "expedier", "fermerAnnonce", "inviterSalarie",
  "majAction", "majAssociation", "majContrat", "majDomaines", "majEntreprise",
  "majPreferences", "majReglagesRecus", "marquerFacturePayee", "modifierEtablissement",
  "ouvrirCampagne", "preinscrire", "promouvoirAdmin", "reconduire", "reglerLogo",
  "reglerObjectifSaison", "reglerVisibilite", "rejoindre", "retirerSalarie",
  "retirerPiece", "retrograderAdmin", "revoquerInvitation", "revoquerMandatRecus",
  "rouvrirAnnonce",
  "emettreRecusEnAttente",
  /* Elles n'y étaient pas, et le Proxy retombait donc en SILENCE sur le moteur
     en mémoire, créé avec `persister:false` : l'écran de Riseva disait « saison
     enregistrée » et « barème enregistré », rien n'était écrit, et tout
     disparaissait au rechargement suivant. */
  "majSaison", "majBareme",
  "saisirIndicateurs", "signaler", "signalerZone", "signerContrat",
  "supprimerAnnonce", "supprimerSalarie",
  "suspendreAcces", "suspendreAssociation", "validerAssociation", "validerMission"
];

/* La bibliothèque cliente, figée. Importée d'un CDN à l'exécution, elle est
   mutable : le jour où l'URL sert autre chose, ce sont nos jetons de session qui
   partent ailleurs, sans qu'aucun de nos fichiers ait changé. On charge donc en
   priorité la copie déposée dans `public/app/vendor/`, produite par
   `scripts/figer-dependance.sh` et versionnée avec le reste. Le repli CDN est
   épinglé à une version exacte et interdit en production. */
const PILOTE_LOCAL = "./vendor/supabase.js";
const PILOTE_CDN   = "https://esm.sh/@supabase/supabase-js@2.45.4";

async function chargerPilote(){
  try { return await import(PILOTE_LOCAL); }
  catch {
    if (estProduction())
      throw new Error("Riseva : la bibliothèque Supabase n'est pas figée dans "
        + "public/app/vendor/. Lancez scripts/figer-dependance.sh avant de déployer.");
    console.warn("Riseva : bibliothèque Supabase chargée depuis un CDN. "
      + "Acceptable en développement, jamais en production.");
    return await import(/* @vite-ignore */ PILOTE_CDN);
  }
}

/* Le socle de la vraie implémentation. Chaque méthode qui existe ici parle à
   Postgres ; celles qui n'existent pas encore n'ont pas de repli silencieux —
   elles lèvent, et on sait exactement ce qu'il reste à écrire. */
/* ------------------------------------------------------------------ */
/* La couche Postgres                                                  */
/* ------------------------------------------------------------------ */
/* Elle ne réécrit aucun calcul. Elle charge ce que l'appelant a le droit de
   voir — c'est la RLS qui décide, pas le navigateur —, traduit les lignes dans
   la forme que le moteur attend, et laisse le moteur dériver. Les écritures,
   elles, ne passent jamais par une table : chacune est une RPC qui fixe
   elle-même ce qui ne se négocie pas.

   Conséquence voulue : un score, un plafond ou un taux de fréquence sont
   calculés par le même code en démonstration et en production. Deux
   implémentations auraient fini par ne plus dire la même chose, et c'est le
   genre d'écart qu'on ne découvre qu'en réunion. */

/* Traductions ligne à ligne. Elles sont volontairement bêtes et explicites :
   un mapping malin est un mapping qu'on n'ose plus relire. */
const versEtat = {
  entreprise: (r) => ({
    id: r.id, nom: r.nom, secteur: r.secteur, ville: r.ville, visibilite: r.visibilite || "auto",
    effectif: r.effectif,
    /* Les places achetées vivent sur l'abonnement, pas sur l'effectif déclaré.
       Les confondre faisait afficher « 520 places » à une société de 520
       salariés qui en avait acheté 500, facturer 520 sur l'écran d'abonnement,
       et refuser le 501e salarié sans que rien ne l'ait annoncé. Renseigné plus
       bas, une fois les abonnements lus. */
    sieges: r.effectif, ca: r.ca ? Number(r.ca) : null,
    cout_jour_moyen: r.cout_jour_moyen ? Number(r.cout_jour_moyen) : null,
    /* Les cinq colonnes du dossier fiscal. Elles étaient posées à `null` en dur
       parce que le schéma ne les portait pas : l'entreprise remplissait les
       quatre champs de l'écran « Mécénat », `maj_entreprise` les jetait, et
       `plafondCalculable` restait faux pour TOUT client de production — le
       plafond de l'article 238 bis n'était donc jamais appliqué chez personne,
       et l'écran basculait en silence sur une estimation. Les colonnes existent
       maintenant ; on les lit. */
    cout_heure_charge: r.cout_heure_charge != null ? Number(r.cout_heure_charge) : null,
    exercice_debut: r.exercice_debut || null,
    exercice_fin: r.exercice_fin || null,
    dons_hors_riseva: r.dons_hors_riseva != null ? Number(r.dons_hors_riseva) : null,
    report_anterieur: r.report_anterieur != null ? Number(r.report_anterieur) : null,
    referent: r.referent_nom ?? null,
    referent_mail: r.referent_mail ?? null,
    siren: r.siren, siret: r.siret, adresse: r.adresse,
    lat: r.lat, lon: r.lon, groupe: r.groupe || null,
    /* Demandée en lecture, jamais recopiée : l'objectif que l'administrateur
       avait posé n'apparaissait nulle part, et l'écran retombait sur la valeur
       suggérée en se disant « non choisi » à chaque rechargement. */
    objectif_mobilises: r.objectif_mobilises ?? null,
    /* Renseigné plus bas depuis `mes_domaines()` : la liste vit dans le schéma
       privé et n'en sort que pour l'entreprise qu'elle concerne. */
    domaines: [],
    logo: r.logo || null
  }),
  groupe: (r) => ({ id: r.id, nom: r.nom, societe_mere: r.societe_mere,
                    classement_sites: !!r.classement_sites, cree_le: r.cree_le }),
  /* Quatre colonnes se perdaient ici, et chacune emportait une fonctionnalite :
     sans `registre_actif`, aucun site ne tenait jamais son registre de securite
     et les valeurs deduites ne l'etaient jamais ; sans l'adresse et les
     coordonnees, la mesure de ce qu'un salarie peut aller faire autour de son
     site ne trouvait plus le site. */
  etablissement: (r) => ({
    id: r.id, societe: r.societe, nom: r.nom, ville: r.ville, siret: r.siret,
    effectif: r.effectif, quota: r.quota,
    adresse: r.adresse || null, lat: r.lat ?? null, lon: r.lon ?? null,
    registre_actif: !!r.registre_actif,
    referent: r.referent_nom, referent_mail: r.referent_mail
  }),
  association: (r) => ({
    id: r.id, nom: r.nom, rna: r.rna, siren: r.siren, nom_juridique: r.nom_juridique,
    helloasso: r.helloasso,
    cause: r.cause, ville: r.ville,
    resume: r.resume, adresse: r.adresse, lat: r.lat, lon: r.lon,
    valide: r.valide, suspendue: r.suspendue, site: r.site, photo: r.photo,
    helloasso_slug: r.helloasso_slug || null, helloasso_lie_le: r.helloasso_lie_le || null,
    contact_public: r.contact_public || null,
    /* La colonne s'appelle `a_reverifier_le`, et elle est bien demandée en
       lecture — mais elle était posée sous le nom `verifiee_jusqua`, qui
       n'existe nulle part. Aucune association n'était donc jamais signalée « à
       revérifier », alors que ce contrôle annuel est le fondement de ce qu'on
       promet aux entreprises sur les reçus fiscaux. */
    verifiee_le: r.verifiee_le, a_reverifier_le: r.a_reverifier_le || null,
    iban: r.iban, bic: r.bic, titulaire_compte: r.titulaire_compte,
    mandat_recus: r.mandat_recus_le
      ? { version: r.mandat_recus_version, nom: r.mandat_recus_nom,
          qualite: r.mandat_recus_qualite, accepte_le: r.mandat_recus_le }
      : null,
    recus: {
      actif: r.recus_actif, eligible_mecenat: r.eligible_mecenat,
      signataire: r.signataire, qualite: r.qualite, prefixe: r.recu_prefixe,
      /* Le prochain numéro se DÉDUIT des reçus déjà émis : le poser à 1 en dur
         faisait réafficher « 1 » à une association qui en était à 47, et
         l'exposait à réémettre des numéros déjà utilisés. Renseigné plus bas,
         une fois les reçus connus. */
      prochain_numero: 1
    }
  }),
  evenement: (r) => ({
    id: r.id, etablissement: r.etablissement, date: r.date, nature: r.nature,
    gravite: r.gravite, type: r.type_evenement, zone: r.zone,
    jours_arret: r.jours_arret, circonstances: r.circonstances,
    declare_par: r.declare_par, declare_le: r.declare_le,
    annule_le: r.annule_le, motif_annulation: r.motif_annulation
  }),
  action: (r) => ({
    id: r.id, evenement: r.evenement, etablissement: r.etablissement,
    quoi: r.quoi, responsable: r.responsable, echeance: r.echeance,
    etat: r.etat, cree_le: r.cree_le, fait_le: r.fait_le
  }),
  controle: (r) => ({
    id: r.id, association: r.association, le: r.le, par: r.par, etat: r.etat,
    bloquant: r.bloquant, numero: r.numero, ecarts: r.ecarts || [], fiche: r.fiche,
    source: r.source
  }),
  /* `eligible_mecenat` reste sur la table publique : une entreprise doit pouvoir
     savoir si une association peut recevoir du mécénat de compétences avant de
     s'engager. Le reste — qui signe, sous quel mandat, avec quelle numérotation —
     ne regarde qu'elle. */
  /* Un abonnement et ses factures, remis dans la forme que les ecrans lisent.
     `statut` se deduit plutot que de se stocker : une colonne « actif » qui ne
     suit pas les dates finit toujours par mentir. */
  contrat: (a, factures, saisons) => {
    const sa = (saisons || []).find(x => x.id === a.saison) || {};
    const mes = (factures || []).filter(f => f.abonnement === a.id);
    const auj = leJour();
    return {
      entreprise: a.entreprise,
      statut: sa.fin && sa.fin < auj ? "termine" : "actif",
      signe_le: a.signe_le, debut: sa.debut || null, fin: sa.fin || null,
      fondateur: !!a.fondateur, montant_ht: Number(a.montant_ht) || 0,
      acompte: Number(a.acompte_paye) || 0,
      effectif_reference: a.effectif_reference,
      reconduction: !!a.reconduction,
      plateforme_reception: a.plateforme_reception || "",
      annuaire_id: a.annuaire_id || "",
      factures: mes
        .slice()
        .sort((x, y) => String(x.echeance).localeCompare(String(y.echeance)))
        .map(f => ({ ref: f.ref, libelle: f.libelle, montant: Number(f.montant) || 0,
                     date: f.emise_le, echeance: f.echeance, periode: f.periode || "",
                     etat: f.payee_le ? "payee" : (f.echeance < auj ? "en_retard" : "a_venir") })),
      /* Les devis de renouvellement ne sont pas des factures : ils ne creent
         aucune creance, et la base ne les modelise pas encore. */
      devis: []
    };
  },
  preinscription: (r) => ({
    id: r.id, entreprise: r.entreprise, contact: r.contact,
    effectif: r.effectif, etat: r.etat, date: String(r.cree_le || "").slice(0, 10)
  }),

  reglagesAssociation: (r, base) => ({
    mandat_recus: r.mandat_recus_le
      ? { version: r.mandat_recus_version, nom: r.mandat_recus_nom,
          qualite: r.mandat_recus_qualite, accepte_le: r.mandat_recus_le }
      : null,
    recus: {
      actif: r.recus_actif, eligible_mecenat: (base.recus || {}).eligible_mecenat,
      signataire: r.signataire, qualite: r.qualite, prefixe: r.recu_prefixe,
      /* Le prochain numéro se DÉDUIT des reçus déjà émis : le poser à 1 en dur
         faisait réafficher « 1 » à une association qui en était à 47, et
         l'exposait à réémettre des numéros déjà utilisés. Renseigné plus bas,
         une fois les reçus connus. */
      prochain_numero: 1
    }
  }),
  intention: (r) => ({
    id: r.id, annonce: r.annonce, association: r.association, salarie: r.salarie,
    entreprise: r.entreprise, origine: r.origine,
    montant: Number(r.montant), montant_recu: r.montant_recu == null ? null : Number(r.montant_recu),
    reference: r.reference, etat: r.etat, motif: r.motif,
    declare_le: r.declare_le, expire_le: r.expire_le, confirme_le: r.confirme_le,
    mission: r.mission
  }),
  annonce: (r) => ({
    id: r.id, asso: r.association, type: r.type, titre: r.titre,
    description: r.description, lieu: r.lieu, date: r.date_prevue,
    temps_travail: r.temps_travail, etat: r.etat,
    quantite: r.quantite, restant: r.restant,
    impact: r.impact_unite ? { unite: r.impact_unite, par_unite: Number(r.impact_par_unite) } : null
  }),
  mission: (r) => ({
    id: r.id, annonce: r.annonce, entreprise: r.entreprise, salarie: r.salarie,
    etablissement: r.etablissement || null, etat: r.etat,
    quantite: Number(r.quantite), points: r.points, date: r.date_mission,
    declaree_le: r.declaree_le ? String(r.declaree_le).slice(0, 10) : null,
    tranchee_le: r.tranchee_le ? String(r.tranchee_le).slice(0, 10) : null,
    motif_refus: r.motif_refus || null,
    realise: r.realise_confirme === null || r.realise_confirme === undefined
      ? undefined : Number(r.realise_confirme),
    realise_propose: r.realise_propose === null || r.realise_propose === undefined
      ? undefined : Number(r.realise_propose),
    pour_le_compte_de: r.origine === "salarie" ? "salarie" : "entreprise",
    origine: r.origine || undefined,
    /* L'accord du salarié à cette mise à disposition : c'est lui qui autorise
       l'édition de la convention (article R. 8241-2). Absent, la convention n'est
       pas proposée — jamais éditée sans preuve. */
    consentement: r.consentement_le
      ? { donne_le: String(r.consentement_le).slice(0, 10),
          /* Le texte vient de la base, jamais d'une recomposition côté client :
             c'est celui qui a été accepté, pas celui qu'on écrirait aujourd'hui. */
          texte: r.consentement_texte || null } : null,
    valeur_declaree: r.valeur_declaree ?? null, nature: r.nature || undefined,
    /* Cinq colonnes du registre des dons de matériel se perdaient ici : la
       catégorie comptable, la référence de l'actif, la date de sortie, le
       justificatif et l'attestation d'effacement des données. Elles existent en
       base et revenaient dans la requête. Le registre AGEC affichait « à
       préciser » sur des lignes que le client avait pourtant remplies. */
    /* Et sous LE MÊME NOM que dans le jeu de démonstration. Elles étaient
       traduites en `categorie` / `reference` / `sortieLe` / `effacementDonnees`,
       alors que `registreMateriel` lit `m.categorie_comptable`,
       `m.reference_actif`, `m.sortie_le` et `m.effacement_donnees` : les cinq
       colonnes revenaient bien de la base, se posaient sur l'objet, et le
       registre AGEC affichait quand même « à préciser » sur des lignes que le
       client avait remplies. Un mappeur qui renomme un champ que la dérivation
       lit sous son ancien nom ne perd rien en apparence et tout en pratique. */
    categorie_comptable: r.categorie_comptable || null,
    reference_actif: r.reference_actif || null,
    sortie_le: r.sortie_le || null,
    justificatif: r.justificatif || null,
    effacement_donnees: r.effacement_donnees ?? null
  }),
  invitation: (r, sieges = []) => ({
    id: r.id, entreprise: r.entreprise, etablissement: r.etablissement || null,
    pour_referent: !!r.pour_referent,
    /* `pour_cse` se perdait ici. `invitationActive` teste `!i.pour_cse`, qui vaut
       vrai sur `undefined` : l'écran Équipe pouvait donc afficher le lien
       NOMINATIF d'un élu du CSE — une place, verrouillée sur son adresse —
       comme « le lien à diffuser à vos salariés ». */
    pour_cse: !!r.pour_cse,
    nom: r.destinataire_nom, email: r.destinataire_mail,
    /* PAS de code. `indice` n'est que les six premiers caractères du code réel,
       et la base l'expose justement parce qu'il ne permet rien. Le publier sous
       le nom de `code` mettait dans le lien diffusé à tout l'effectif une valeur
       qui n'ouvre rien : `rejoindre_entreprise` hache ce qu'on lui donne, l'indice
       ne correspond à aucune empreinte, et le parcours salarié était mort. Le
       vrai code n'est lisible qu'une fois, au retour de `creer_invitation`. */
    code: null, indice: r.indice,
    places: r.places,
    utilisees: sieges.filter(s => s.invitation === r.id && !s.liberee_le).length,
    active: r.active,
    cree_le: String(r.cree_le).slice(0, 10), expire_le: String(r.expire_le).slice(0, 10)
  }),
  campagne: (r) => ({
    id: r.id, groupe: r.groupe, entreprise: r.entreprise, periode: r.periode,
    libelle: r.libelle, debut: r.debut, fin: r.fin, echeance: r.echeance,
    /* La date d'ouverture, sous le nom que porte la démonstration. */
    ouverte_le: r.cree_le ? String(r.cree_le).slice(0, 10) : null,
    etat: r.close_le ? "close" : "ouverte"
  }),
  observation: (r) => ({
    /* `commentaire` et `ecarts` se perdaient. L'explication d'une variation
       forte suit pourtant la valeur jusque dans le rapport : c'est elle qui
       répond, un an plus tard, à la seule question que posera un acheteur devant
       une courbe qui saute. Le tableau « Variations expliquées par les sites »
       était vide en permanence, et le référent qui corrigeait une valeur
       retrouvait son champ vierge — sans quoi la saisie est refusée au-delà de
       30 % d'écart. */
    commentaire: r.commentaire ?? null, ecarts: r.ecarts || [],
    id: r.id, campagne: r.campagne, etablissement: r.etablissement, etat: r.etat,
    version: r.version, valeurs: r.valeurs || {},
    saisi_par: r.saisi_par, saisi_le: r.saisi_le ? String(r.saisi_le).slice(0, 10) : null,
    approuve_par: r.approuve_par,
    approuve_le: r.approuve_le ? String(r.approuve_le).slice(0, 10) : null
  }),
  acces: (r) => ({ id: r.id, entreprise: r.entreprise, utilisateur: r.profil,
                   quoi: r.quoi, code: r.indice, date: String(r.cree_le).slice(0, 10) }),
  /* Quatre champs manquaient, et la table n'a PAS de colonne `etat` : l'écran de
     modération filtrait sur `etat === "recu"`, ne trouvait jamais rien, et
     annonçait « Aucun signalement en attente » quel qu'en soit le nombre. Le
     bouton « Décider » n'apparaissait sur aucune ligne — c'est-à-dire que
     l'obligation de décision motivée de l'article 16 du DSA n'était pas tenable
     en production. L'état se déduit : décidé ou non. */
  signalement: (r, annoncesLues = []) => ({
    id: r.id, annonce: r.annonce, motif: r.motif,
    association: (annoncesLues.find(a => a.id === r.annonce) || {}).association || null,
    par: r.auteur || null,
    precisions: r.precisions,
    etat: r.decide_le ? "traite" : "recu",
    recu_le: String(r.cree_le).slice(0, 10),
    decide_le: r.decide_le ? String(r.decide_le).slice(0, 10) : null,
    decision: r.decision,
    motivation: r.motivation, date: String(r.cree_le).slice(0, 10) })
};

/* Le chargement. Une requête par table, aucune jointure côté client : ce que la
   RLS refuse ne revient pas, et l'absence d'une ligne n'est pas une erreur —
   c'est le cloisonnement qui fonctionne. */
async function chargerEtat(client){
  const lire = async (nom, colonnes = "*") => {
    const { data, error } = await client.from(nom).select(colonnes);
    /* Une table entièrement refusée renvoie une erreur de permission : c'est
       normal pour un salarié sur `abonnement`. On rend une liste vide, et le
       moteur dérive ce qu'il peut. Toute autre erreur remonte. */
    if (error && !/permission|denied|not exist/i.test(error.message || "")) throw error;
    /* Un refus avalé reste un refus. Il est légitime — un salarié n'a rien à
       lire sur `abonnement` — mais il l'était aussi quand `select=*` butait sur
       un droit COLONNE et vidait six tables pour tout le monde. Un `[]` ne
       ressemble pas à une panne ; on le trace, pour que la prochaine fois se
       voie dans la console plutôt que six mois plus tard. */
    if (error) console.warn(`Riseva : lecture de « ${nom} » refusée (${error.message}).`);
    return data || [];
  };

  const [saisons, baremes, entreprises, dossiersEntreprise, groupes, etablissements,
         associations,
         annonces, missions, profils, invitations, campagnes, observations,
         acces, signalements, intentions, controles,
         evenements, actionsCorrectives,
         abonnements, factures, preinscriptions, reglagesAsso,
         reglagesProfil, piecesJointes,
         envois, expeditions, sourcing, sieges, rapportsBase,
         journalMoteur, recus, dons, rubriquesCampagne] = await Promise.all([
    /* SIX tables n'ont que des droits COLONNE, jamais un droit de table : ce
       sont celles qui portent une donnée qu'un salarié n'a pas à lire — le
       chiffre d'affaires, l'empreinte d'une invitation, les circonstances d'un
       accident. PostgREST traduit `select=*` en `SELECT tbl.*`, qui exige le
       droit sur TOUTES les colonnes : la requête était donc refusée en bloc, le
       filtre d'erreur avalait le refus, et l'application recevait une liste
       vide. En production, `entreprise`, `profil`, `invitation`, `acces`,
       `association` et `evenement_securite` étaient VIDES pour tout le monde —
       et un `[]` ne ressemble pas à une panne, il ressemble à une base neuve.
       On énumère donc, et la liste doit rester identique à celle de 03_rls.sql. */
    lire("saison"), lire("bareme"),
    lire("entreprise", "id, nom, secteur, ville, effectif, lat, lon, groupe, "
                     + "visibilite, logo, objectif_mobilises"),
    /* Le dossier de MA société, et seulement si j'en suis l'administrateur :
       chiffre d'affaires, coût journalier, dossier fiscal, numéros, adresse de
       facturation, référent. C'est une vue avec son propre `where`, pas un droit
       sur la table — une policy protège les lignes, jamais les colonnes. */
    lire("entreprise_dossier"),
    lire("groupe"),
    lire("etablissement"),
    lire("association", "id, nom, nom_juridique, rna, siren, cause, ville, resume, adresse, "
                      + "lat, lon, site, photo, valide, suspendue, verifiee_le, a_reverifier_le, "
                      + "eligible_mecenat, helloasso, helloasso_slug, helloasso_lie_le, "
                      + "contact_public, iban, bic, titulaire_compte, cree_le"),
    lire("annonce"), lire("mission"),
    lire("profil", "id, nom"),
    lire("invitation", "id, entreprise, etablissement, pour_referent, pour_cse, "
                     + "destinataire_nom, destinataire_mail, indice, places, active, "
                     + "cree_le, expire_le"),
    lire("campagne_indicateurs"),
    lire("observation_indicateur"),
    lire("acces", "id, entreprise, profil, quoi, indice, cree_le"),
    lire("signalement"),
    lire("intention_don"), lire("controle_association"),
    lire("evenement_securite", "id, etablissement, date, nature, gravite, type_evenement, "
                             + "zone, jours_arret, circonstances, declare_le, annule_le, "
                             + "motif_annulation"),
    lire("action_corrective"),
    /* Trois tables qui n'etaient jamais lues : l'ecran « Abonnement » d'un
       client etait donc vide en production, et l'ecran « Preinscriptions » de
       Riseva aussi. Elles existaient en base ; personne n'allait les chercher. */
    lire("abonnement"), lire("facture"), lire("preinscription"),
    lire("association_reglages"), lire("profil_reglages"),
    /* Le coffre. On ne charge que les lignes : le fichier reste dans le
       stockage, et ne descend que sur un clic, par un lien signe. */
    lire("piece_jointe"),
    /* Trois tables de plus qui n'étaient jamais lues. `s.envois`, `s.expeditions`
       et `s.sourcing` restaient donc `undefined` en production — pas vides :
       absents — et le premier `.filter` dessus jetait une TypeError. L'écran
       « Vos rapports » d'un vrai client tombait en panne à l'ouverture, celui
       des affiches aussi, et le bouton « signaler la zone » d'un référent
       également. En démonstration tout marchait : le jeu de démonstration, lui,
       porte les trois listes. */
    lire("envoi"), lire("expedition"), lire("sourcing"),
    /* Les sièges occupés. Sans eux, « Inscriptions par ce lien » affichait
       éternellement 0, la page d'inscription annonçait toutes les places libres
       sur un lien épuisé, et le refus n'arrivait qu'après l'envoi du courriel. */
    lire("affectation_siege"),
    /* Les rapports arrêtés en base. Le moteur dérive lui-même la liste des
       périodes ; ce qu'il ne peut pas deviner, c'est lequel a déjà été envoyé.
       On lit donc la table pour recoller l'envoi à sa période. */
    lire("rapport"),
    lire("moteur_journal"),
    /* Les reçus déjà émis. Une seule chose s'en déduit ici, et elle compte : le
       prochain numéro. Le poser à 1 en dur faisait réafficher « 1 » à une
       association qui en était à 47. */
    lire("recu"),
    /* Les dons. Le moteur du navigateur modélise un don comme une mission ; en
       base, le reçu pointe le don, et le don pointe la mission. Sans cette
       table, aucun reçu ne pouvait être rattaché à ce qui l'a justifié, et le
       récapitulatif annuel repartait compter des missions. */
    lire("don"),
    /* Ce que chaque collecte demande, rubrique par rubrique. Sans cette table,
       `rubriquesDe` retombait sur TOUTES les rubriques : un groupe qui ouvrait
       une collecte sur « social + sécurité » voyait ses référents recevoir un
       formulaire de trente-sept champs — exactement ce que le mécanisme des
       rubriques existe pour éviter. */
    lire("campagne_rubrique")
  ]);

  const saison = saisons.find(x => x.etat === "ouverte") || saisons[0] || null;
  if (!saison) throw new Error("Riseva : aucune saison ouverte en base.");

  /* Le classement PUBLIC, calculé par la base.
     Le navigateur le dérivait de `s.entreprises`, c'est-à-dire des sociétés que
     la RLS le laisse lire : la sienne, et celles de son groupe. Chez un vrai
     client, la cohorte comptait donc UNE ligne, l'écran affichait
     « 1 / 1 entreprise dans votre catégorie » et le tableau de bord annonçait
     « classement non publié » pour toujours. La fonction qui calcule la vraie
     cohorte existait depuis le premier jour et n'était appelée nulle part.
     Elle nomme, anonymise et met les totaux à null selon les mêmes règles que le
     moteur : c'est elle qui fait foi. */
  let classementPublic = [];
  try {
    const { data, error } = await client.rpc("classement_saison", { p_saison: saison.id });
    if (error) throw new Error(error.message);
    classementPublic = data || [];
  } catch (e){
    console.warn("Riseva : classement public indisponible (" + e.message + ").");
  }

  /* Le barème vient de la base, pas du fichier : un barème recalibré en cours
     de route doit s'appliquer partout, et surtout figurer dans les rapports. */
  baremes.filter(b => b.saison === saison.id).forEach(b => {
    if (BAREME[b.type]) BAREME[b.type].points = b.points;
  });

  const moi = (await client.auth.getUser()).data?.user || null;

  /* Qui est la personne connectée. Le rôle, l'entreprise, le site et le groupe
     vivent dans le schéma privé : ils ne sortent que par cette fonction, et
     seulement pour elle. Sans eux, `role` valait `null` sur chaque profil, le
     routeur cherchait un menu qui n'existe pas, et l'application ne s'ouvrait
     pour personne en production — alors que la démonstration, dont le jeu de
     données porte les rôles, marchait parfaitement. */
  let identite = null;
  let domaines = [];
  let equipe = [];
  if (moi){
    try {
      const { data } = await client.rpc("mon_profil");
      identite = Array.isArray(data) ? data[0] || null : data || null;
    } catch (e){ identite = null; }
    /* Les domaines de messagerie de mon entreprise. Ils ne sortent que pour
       elle, et l'écran Équipe en dépend : sans eux il affichait le badge rouge
       « Ouvert à tous » à un client dont la base était pourtant verrouillée. */
    try {
      const { data } = await client.rpc("mes_domaines");
      domaines = Array.isArray(data) ? data : [];
    } catch (e){ domaines = []; }
    /* Mon équipe : le rôle et le site de mes collègues. Les noms arrivaient bien,
       le rattachement non — et tout ce qui filtre sur le rôle rendait donc une
       liste vide. « Personne pour l'instant » sur l'écran Équipe d'un client de
       deux cents personnes. */
    try {
      const { data } = await client.rpc("mon_equipe");
      equipe = Array.isArray(data) ? data : [];
    } catch (e){ equipe = []; }
  }

  /* Le dossier du CSE, calculé par la base avec ses deux planchers.
     Un compte CSE ne lit ni les événements ligne à ligne ni la liste des
     salariés — c'est la frontière, pas un oubli —, donc le navigateur dérivait
     zéro partout et affichait « moins de cinq événements » à une société qui en
     comptait quarante. */
  let dossierCse = null;
  if (identite && identite.role === "cse"){
    try {
      const { data, error } = await client.rpc("dossier_cse",
        { p_debut: saison.debut, p_fin: saison.fin });
      if (error) throw new Error(error.message);
      dossierCse = Array.isArray(data) ? data[0] : data;
    } catch (e){
      console.warn("Riseva : dossier CSE indisponible (" + e.message + ").");
    }
  }


  return {
    saison: { id: saison.id, nom: saison.nom, debut: saison.debut, fin: saison.fin,
              etat: saison.etat, prix_min: saison.prix_min, prix_max: saison.prix_max,
              acompte: saison.acompte },
    entreprises: entreprises.map(r => {
      /* Le dossier de la société, quand il est lisible. Il ne l'est que pour
         l'administrateur de SA société : pour tous les autres, ces champs
         restent absents, et c'est la frontière, pas un oubli. */
      const d = (dossiersEntreprise || []).find(x => x.id === r.id) || {};
      const e = versEtat.entreprise({ ...r, ...d });
      const ab = abonnements.find(x => x.entreprise === r.id && x.saison === saison.id);
      if (ab && ab.sieges) e.sieges = ab.sieges;
      if (identite && identite.entreprise === r.id) e.domaines = domaines;
      return e;
    }),
    groupes: groupes.map(versEtat.groupe),
    etablissements: etablissements.map(versEtat.etablissement),
    /* Les réglages de reçus d'une association ne sont plus dans la table qu'elle
       publie : ils passent par une vue qui ne rend que les siens. On les
       recolle ici, pour que le moteur voie un seul objet comme en démonstration. */
    associations: associations.map(a => {
      const r = reglagesAsso.find(x => x.id === a.id);
      const base = versEtat.association(a);
      const fiche = r ? { ...base, ...versEtat.reglagesAssociation(r, base) } : base;
      /* Le prochain numéro de reçu, déduit de ceux déjà émis. */
      if (fiche.recus){
        /* Le numéro est un texte : « QV-2027-047 ». On ne garde que sa fin
           chiffrée — un préfixe qui change en cours d'année ne doit pas faire
           repartir la série à zéro. */
        const n = recus.filter(x => x.association === a.id)
                       .reduce((m, x) => Math.max(m,
                          Number((String(x.numero).match(/(\d+)\s*$/) || [])[1]) || 0), 0);
        fiche.recus = { ...fiche.recus, prochain_numero: n + 1 };
      }
      return fiche;
    }),
    annonces: annonces.map(versEtat.annonce),
    missions: missions.map(versEtat.mission),
    /* Un profil ne porte ni rôle ni entreprise : ce sont des colonnes du schéma
       privé, invisibles depuis le navigateur, par construction. Le rôle de la
       personne connectée vient de son jeton ; celui des autres ne la regarde pas. */
    /* Les reglages d'une personne ne sortent que pour elle : ils viennent d'une
       vue filtree sur `auth.uid()`, jamais de la colonne, que la policy de
       `profil` aurait ouverte a tous les collegues. */
    utilisateurs: [...profils.map(r => ({
      id: r.id, nom: r.nom, email: r.id === (moi && moi.id) ? (moi.email || null) : null,
      /* Le rôle vient de `mon_equipe()` pour mes collègues, de `mon_profil()`
         pour moi. Hors de ma société, il reste nul : c'est la frontière, pas un
         oubli — un compte d'association ou d'une autre société n'a aucune raison
         de m'apparaître avec un rôle. */
      ...(() => {
        const e = equipe.find(x => x.id === r.id);
        if (e) return {
          role: e.role, org: identite ? identite.entreprise : null,
          etablissement: e.etablissement, groupe: identite ? identite.groupe : null,
          actif: e.actif !== false, anonyme: !!e.pseudonymise,
          retire_le: e.retire_le ? String(e.retire_le).slice(0, 10) : null
        };
        if (identite && r.id === identite.id) return {
          role: identite.role,
          org: identite.entreprise || identite.association || null,
          etablissement: identite.etablissement, groupe: identite.groupe,
          actif: identite.actif !== false, anonyme: false
        };
        return { role: null, org: null, etablissement: null, groupe: null,
                 actif: true, anonyme: false };
      })(),
      prefs: (reglagesProfil.find(x => x.id === r.id) || {}).preferences || undefined,
      /* Deux champs que la démonstration porte et que la production n'avait pas.
         `cree_le` n'est pas la date du compte Auth — elle n'est pas lisible d'ici
         — mais celle de la PRISE DE SIÈGE, c'est-à-dire l'entrée de la personne
         dans l'entreprise : c'est exactement ce que l'écran Adoption mesure. Sans
         elle, « délai avant la première mission » et « en attente depuis » étaient
         vides en production, et le seul écran qui dit OÙ ça bloque ne disait rien.
         `visible_pairs` vit dans les préférences côté base ; on le remonte à plat
         pour que les deux moteurs voient un seul champ, pas deux formes. */
      cree_le: (() => {
        const a = sieges.filter(x => x.profil === r.id)
                        .sort((x, y) => String(x.prise_le).localeCompare(String(y.prise_le)))[0];
        return a && a.prise_le ? String(a.prise_le).slice(0, 10) : null;
      })(),
      visible_pairs: !!((reglagesProfil.find(x => x.id === r.id) || {})
                        .preferences || {}).visible_pairs
    })),
    /* La personne connectée, si la table des profils ne l'a pas rendue. Une
       policy peut très bien lui refuser la ligne des autres et la sienne du
       même mouvement ; l'application, elle, doit toujours savoir qui elle est,
       sans quoi elle se déconnecte toute seule au premier rendu. */
    ...(identite && !profils.some(x => x.id === identite.id) ? [{
      id: identite.id, nom: identite.nom,
      email: (moi && moi.email) || null,
      role: identite.role, org: identite.entreprise || identite.association || null,
      etablissement: identite.etablissement, groupe: identite.groupe,
      actif: identite.actif !== false, anonyme: false
    }] : [])],
    invitations: invitations.map(r => versEtat.invitation(r, sieges)),
    campagnes: campagnes.map(c => ({
      ...versEtat.campagne(c),
      /* Une campagne sans aucune ligne demande tout : c'est le comportement des
         collectes ouvertes avant que les rubriques existent, et la règle est la
         même des deux côtés. */
      rubriques: rubriquesCampagne.filter(x => x.campagne === c.id).map(x => x.rubrique)
    })),
    observations: observations.map(versEtat.observation),
    acces: acces.map(versEtat.acces),
    signalements: signalements.map(r => versEtat.signalement(r, annonces)),
    intentions: intentions.map(versEtat.intention),
    /* Trié explicitement. `dernierControle` prend le PREMIER de la liste et
       suppose « le plus récent d'abord » — ce que le moteur de démonstration
       garantit par construction et que la base ne garantit pas du tout. Le
       dossier d'une association pouvait afficher comme dernier contrôle un
       verdict « introuvable » de six mois plus tôt, et se dire périmé alors
       qu'un contrôle venait d'être fait. */
    controles: controles.map(versEtat.controle)
      .sort((a, b) => String(b.le || "").localeCompare(String(a.le || ""))),
    evenements: evenements.map(versEtat.evenement),
    actions: actionsCorrectives.map(versEtat.action),
    /* Un « contrat » cote moteur, c'est un abonnement et ses factures. La forme
       vient du jeu de demonstration ; elle est reconstituee ici plutot que
       d'imposer deux formes differentes aux quinze ecrans qui la lisent. */
    contrats: abonnements.map(a => versEtat.contrat(a, factures, saisons)),
    preinscriptions: preinscriptions.map(versEtat.preinscription),
    /* Le coffre. Le moteur travaille sur `objet` + `cible` ; la base range les
       trois rattachements dans trois colonnes distinctes, parce qu'une cle
       etrangere ne se declare pas sur une colonne polymorphe. La traduction se
       fait ici, une fois. */
    pieces: piecesJointes.filter(p => !p.retire_le).map(p => ({
      id: p.id, objet: p.objet,
      cible: p.observation || p.mission || p.don,
      nom: p.nom, type: p.type_mime, taille: p.taille, empreinte: p.empreinte,
      chemin: p.chemin, contenu: null,
      /* `conserve` se déduisait de `contenu !== null`, toujours faux en
         production : l'écran remplaçait donc le bouton de téléchargement par
         « fichier non conservé en démonstration » — dans une vraie base, sur une
         facture que le client venait de déposer. Le chemin de production, un
         lien signé, était inatteignable. Ce qui compte n'est pas d'avoir le
         contenu sous la main, c'est qu'il existe quelque part. */
      conserve: !!p.chemin,
      depose_par: p.depose_par, depose_le: p.depose_le, retire_le: null
    })),
    /* Ce qui est réellement parti. La clé de la base porte l'identifiant du
       rapport ; l'écran, lui, cherche `rapport:<entreprise>:<t1|…|annuel>`,
       parce que c'est la forme que le moteur produit tout seul. On traduit ici,
       une fois, plutôt que d'imposer deux formes à l'écran. */
    envois: envois.map(e => {
      const m = /^rapport:([0-9a-f-]{36})$/.exec(e.cle || "");
      const r = m ? rapportsBase.find(x => x.id === m[1]) : null;
      const dest = profils.find(x => x.id === e.destinataire_profil);
      return {
        id: e.id,
        cle: r ? `rapport:${r.entreprise}:${String(r.periode).toLowerCase()}` : e.cle,
        type: e.type, entreprise: e.entreprise, association: e.association,
        mission: e.mission,
        /* La tâche planifiée ne compose aucune adresse : elle désigne un profil,
           et c'est la fonction Edge qui détient la clé de service qui résout
           l'adresse. On affiche donc le nom, jamais un courriel inventé. */
        destinataire: e.destinataire || (dest ? dest.nom : null),
        sujet: e.sujet, detail: e.detail, date: e.date,
        etat: { a_envoyer: "à envoyer", envoye: "envoyé",
                sans_destinataire: "sans destinataire", echec: "échec" }[e.etat] || e.etat
      };
    }),
    expeditions: expeditions.map(x => ({
      id: x.id, entreprise: x.entreprise, etablissement: null, kit: x.kit,
      cree_le: String(x.cree_le || x.expedie_le).slice(0, 10),
      expedie_le: x.expedie_le, suivi: x.suivi, recu_le: x.recu_le
    })),
    sourcing: sourcing.map(z => ({
      id: z.id, etablissement: z.etablissement,
      /* La table ne porte pas la société : elle se déduit du site, qui est déjà
         chargé. La déduire ici évite une colonne dénormalisée en base. */
      societe: (etablissements.find(e => e.id === z.etablissement) || {}).societe || null,
      par: z.par, le: String(z.le).slice(0, 10),
      traite_le: z.traite_le ? String(z.traite_le).slice(0, 10) : null
    })),
    /* Le journal du moteur. Il était posé vide en dur : l'écran « Moteur » de
       Riseva n'affichait donc jamais rien en production, alors que la table est
       remplie chaque nuit. La base range `{tache, fait:{...}, cree_le}` ; l'écran
       lit les compteurs à plat. On aplatit ici. */
    moteur_journal: journalMoteur.map(x => ({
      le: String(x.cree_le).slice(0, 10), ...(x.fait || {})
    })),
    rapports_generes: [],
    /* Le classement public, tel que la base l'a calculé. Le moteur s'en sert
       quand il est là — c'est-à-dire en production — et retombe sur sa propre
       dérivation en démonstration. */
    /* Ce que la base rend au CSE, brut. Le moteur le met en forme. */
    dossier_cse: dossierCse || null,
    classement_public: classementPublic.map(r => ({
      id: r.entreprise || null, nom: r.nom, logo: r.logo || null,
      anonyme: !!r.anonyme, categorie: r.categorie,
      brut: r.brut === null ? null : Number(r.brut),
      points: r.retenu === null ? null : Number(r.retenu),
      effectif: r.effectif_reference === null ? null : Number(r.effectif_reference),
      parSalarie: r.par_salarie === null ? null : Number(r.par_salarie),
      rang: Number(r.rang), cohorte: Number(r.cohorte)
    })),
    /* Les reçus délivrés, rattachés à la mission que le moteur connaît. C'est
       ce nombre-là, et pas celui des dons confirmés, que l'article 222 bis fait
       déclarer chaque année. */
    recus_emis: recus.map(r => {
      const d = dons.find(x => x.id === r.don) || {};
      return { id: r.id, mission: d.mission || null, association: r.association,
               numero: r.numero, modele: r.modele,
               montant: Number(d.montant) || 0,
               le: String(r.emis_le || "").slice(0, 10) };
    }),
    classement_recalcule_le: null
  };
}

/* En production, une écriture est un aller-retour : on appelle la RPC, on relit,
   puis seulement on redessine. L'interface, elle, est synchrone — elle a été
   écrite pour un état en mémoire. Plutôt que de saupoudrer des `await` dans
   trente-cinq gestionnaires de clic, on annonce l'arrivée du nouvel état.

   Le contrat est explicite : rien n'est affiché comme fait avant que le serveur
   l'ait accepté. L'écran garde l'état d'avant pendant l'aller-retour, puis se
   redessine. Une écriture refusée déclenche `surErreur`, jamais un silence. */
let apresEcriture = () => {};
let surErreur = () => {};
export function brancherEvenements({ apres, erreur } = {}){
  if (apres) apresEcriture = apres;
  if (erreur) surErreur = erreur;
}

/* La base rend des colonnes plates ; les écrans attendent la forme que le
   moteur de démonstration produit. La traduction vit ici, une fois, et pas
   dans chaque écran : deux formes pour la même donnée, c'est deux endroits où
   elles finiront par diverger. */
function versOffre(r){
  return {
    site: { id: r.etablissement, nom: r.site, ville: r.ville,
            effectif: r.effectif || 0 },
    signalee: r.signalee_le ? { le: String(r.signalee_le).slice(0, 10) } : null,
    situe: !!r.situe,
    rayon: r.rayon, attendu: r.attendu, verdict: r.verdict,
    ouvertes: r.ouvertes, places: r.places,
    plusProche: r.plus_proche, mediane: r.mediane,
    parFormat: { temps: r.benevolat, animal: r.animal,
                 materiel: r.materiel, argent: r.financier },
    semaine: r.semaine, weekend: r.weekend, sansDate: r.sans_date,
    nonSituees: r.non_situees,
    /* La liste nominative des associations à rappeler n'est pas rendue par la
       base : c'est notre carnet d'adresses, pas celui du client. Il voit
       combien, pas lesquelles. */
    /* La base ne rend délibérément pas les noms des associations à relancer :
       c'est un agrégat, pas un annuaire. L'écran écrivait quand même
       « … ne publient rien en ce moment : . » — une phrase visiblement tronquée
       à chaque site concerné. Il sait maintenant que la liste peut être vide. */
    aRelancer: [], aRelancerTotal: r.a_relancer,
    exemples: []
  };
}

function versAdoption(r, moteur){
  const marche = (cle, label, n, cause, action) => ({ cle, label, n, cause, action });
  const marches = [
    marche("effectif", "Salariés du périmètre", r.effectif, null, null),
    marche("comptes", "Comptes ouverts", r.comptes,
      "Riseva ne sait pas combien ont effectivement vu le lien : c'est la première "
      + "chose à vérifier avant d'en conclure quoi que ce soit.",
      { texte:"Préparer une nouvelle diffusion", vers:"#/supports" }),
    marche("engages", "Se sont engagés au moins une fois", r.engages,
      "Les annonces proposées sont trop loin, ou ne correspondent pas.",
      { texte:"Voir l'offre autour de vos sites", vers:"#/adoption" }),
    marche("declarees", "Ont déclaré une mission faite", r.declarees,
      "Ils y sont allés mais n'ont rien déclaré : c'est le rappel après la mission qui manque.",
      { texte:"Voir les missions à déclarer", vers:"#/missions" }),
    marche("validees", "Ont au moins une action validée", r.validees,
      "L'association n'a pas confirmé. Relancez-la : sans confirmation, le résultat reste estimé.",
      { texte:"Relancer les associations", vers:"#/missions" })
  ];
  let rupture = null, pire = 0;
  for (let i = 1; i < marches.length; i++){
    const av = marches[i - 1].n, ap = marches[i].n;
    const perte = av ? (av - ap) / av : 0;
    marches[i].garde = av ? ap / av : 0;
    marches[i].perdus = Math.max(0, av - ap);
    if (av >= 3 && perte > pire){ pire = perte; rupture = marches[i].cle; }
  }
  const e = moteur ? moteur.entreprise : null;
  return {
    entreprise: e,
    /* `etablissements()` prend l'identifiant de la SOCIÉTÉ. Appelée sans
       argument, elle comparait `x.societe === undefined` et rendait un tableau
       vide : sur l'écran qui sert précisément à trouver OÙ ça bloque, un groupe
       multi-sites ne pouvait descendre à aucun site — seul « toute la société »
       était proposé, et le plancher d'anonymat masquait alors l'entonnoir. */
    sites: moteur && e ? moteur.etablissements(e.id) : [],
    etablissement: null,
    marches, rupture,
    lisible: !!r.lisible, plancher: r.plancher,
    delaiMedian: r.delai_median, delaiMesurable: r.delai_mesurable,
    delaiSur: r.delai_sur,
    sansAction: r.sans_action, sansActionMedian: r.sans_action_median,
    sansActionPlusDe90: r.sans_action_plus_90,
    actifs: r.validees, revenus: r.revenus, effectif: r.effectif
  };
}

/* L'empreinte SHA-256 d'un fichier. C'est elle qui fait la preuve : elle dit que
   le fichier telecharge dans un an est celui qui a ete depose ce jour-la. Une
   piece sans empreinte prouve seulement qu'un fichier existe quelque part.
   `crypto.subtle` n'existe qu'en contexte securise ; hors HTTPS on prefere ne
   pas d'empreinte du tout plutot qu'une empreinte fabriquee autrement, qui
   n'aurait pas la meme valeur et se lirait pareil. */
async function empreinteSha256(fichier){
  if (!globalThis.crypto?.subtle) return null;
  try {
    const octets = await fichier.arrayBuffer();
    const somme = await crypto.subtle.digest("SHA-256", octets);
    return [...new Uint8Array(somme)].map(o => o.toString(16).padStart(2, "0")).join("");
  } catch { return null; }
}

function creerSupabase(client){
  const rpc = async (nom, args) => {
    const { data, error } = await client.rpc(nom, args);
    if (error) throw new Error(error.message);
    return data;
  };
  let moteur = null;

  /* Après chaque écriture, on relit. C'est plus cher qu'une mise à jour locale,
     et c'est le seul moyen de ne jamais afficher un état que le serveur n'a pas
     accepté. Une écriture refusée par une policy doit se voir tout de suite,
     pas à la prochaine visite. */
  const ecrire = async (fn) => {
    try {
      const r = await fn();
      moteur = creerMoteur({ etat: await chargerEtat(client), persister: false, mode: "supabase" });
      apresEcriture();
      return r;
    } catch (e){
      /* Relire même après un refus : l'écran doit revenir à ce que le serveur
         dit, pas rester sur ce que l'utilisateur croyait avoir fait. */
      try { moteur = creerMoteur({ etat: await chargerEtat(client), persister: false, mode: "supabase" }); } catch {}
      surErreur(e);
      apresEcriture();
      throw e;
    }
  };

  const brut = {
    mode: "supabase", client,
    /* Toutes les lectures sont celles du moteur, sur l'état chargé. */
    recharger: async () => {
      moteur = creerMoteur({ etat: await chargerEtat(client), persister: false, mode: "supabase" });
      return moteur;
    },

    rejoindre: (code, nom) => ecrire(() =>
      rpc("rejoindre_entreprise", { p_code: code, p_nom: nom || null })),
    /* Résoudre un lien d'entrée AVANT toute connexion. La table `invitation`
       n'est lisible que par l'administrateur : la page d'inscription la
       consultait quand même, recevait une table vide, et répondait « Ce code
       n'existe pas » à chaque salarié. */
    resoudreInvitation: async (code) => {
      const { data, error } = await client.rpc("resoudre_invitation", { p_code: code });
      if (error) throw new Error(error.message);
      const r = Array.isArray(data) ? data[0] : data;
      if (!r) return null;
      return {
        entreprise: r.entreprise, entreprise_nom: r.entreprise_nom,
        etablissement: r.etablissement, etablissement_nom: r.etablissement_nom,
        etablissement_ville: r.etablissement_ville, etablissement_quota: r.etablissement_quota,
        pour_referent: !!r.pour_referent, pour_cse: !!r.pour_cse,
        nom: r.destinataire_nom, email: r.destinataire_mail,
        places: r.places, utilisees: r.utilisees, restantes: r.restantes,
        restantes_abonnement: r.restantes_abonnement,
        active: !!r.active, expire_le: r.expire_le, domaines: r.domaines || []
      };
    },
    accepterInvitationReferent: (code) => ecrire(() => rpc("rejoindre_comme_referent", { p_code: code })),
    /* Elle rend le CODE, une seule fois : la base n'en garde que l'empreinte, et
       aucun écran ne pourra le relire. C'est à l'appelant de le montrer tout de
       suite — ce que les deux appelants ne faisaient pas. */
    creerInvitation: (eid, places, etablissement = null) => ecrire(() =>
      rpc("creer_invitation", { p_places: places, p_jours: 60,
                                p_etablissement: etablissement || null })),
    reglerLogo: (eid, valeur) => ecrire(() => rpc("regler_logo", { p_logo: valeur || null })),
    majAssociation: (aid, ch) => ecrire(() => rpc("maj_association", {
      p_resume: ch.resume ?? null, p_cause: ch.cause ?? null, p_ville: ch.ville ?? null,
      p_site: ch.site ?? null, p_photo: ch.photo === undefined ? null : (ch.photo || ""),
      p_effacer_photo: ch.photo !== undefined && !ch.photo,
      p_contact_public: ch.contact_public ?? null })),
    creerInvitationReferent: (etid, nom, email) => ecrire(() =>
      rpc("creer_invitation_referent", { p_etablissement: etid, p_nom: nom, p_mail: email })),
    allouerQuota: (etid, places) => ecrire(() =>
      rpc("allouer_quota", { p_etablissement: etid, p_places: Number(places) })),
    ajouterEtablissement: ({ nom, ville, siret, effectif, adresse }) => ecrire(() =>
      rpc("creer_etablissement", { p_nom: nom, p_ville: ville, p_siret: siret || null,
                                   p_effectif: Number(effectif) || 0, p_adresse: adresse || null })),
    modifierEtablissement: (etid, ch) => ecrire(() =>
      rpc("modifier_etablissement", { p_etablissement: etid, p_nom: ch.nom ?? null,
                                      p_ville: ch.ville ?? null, p_siret: ch.siret ?? null,
                                      p_effectif: ch.effectif === undefined ? null : Number(ch.effectif),
                                      p_adresse: ch.adresse ?? null })),
    // La liaison s'arretait aux trois premiers arguments et jetait la phrase
    // d'explication que l'ecran venait de faire ecrire. Or la RPC la reclame des
    // qu'une valeur bouge de plus de trente pour cent : le contributeur tapait
    // son explication, elle ne partait pas, et la base refusait la saisie en lui
    // demandant precisement ce qu'il venait d'ecrire. La demonstration, elle,
    // acceptait — deux moteurs, deux comportements sur la meme regle.
    saisirIndicateurs: (cid, etid, valeurs, uid, commentaire = null) => ecrire(() => {
      /* Deuxième filet, au plus près de la RPC : elle refuse tout ce qui n'est
         pas un nombre, et un écran qui enverrait une chaîne ferait échouer la
         saisie sans que personne comprenne pourquoi. Un champ vide disparaît,
         il ne devient pas zéro. */
      const propres = {};
      Object.entries(valeurs || {}).forEach(([k, val]) => {
        if (val === undefined || val === null || val === "") return;
        const n = Number(val);
        if (Number.isFinite(n)) propres[k] = n;
      });
      return rpc("saisir_indicateurs", { p_campagne: cid, p_etablissement: etid,
                                         p_valeurs: propres,
                                         p_commentaire: commentaire || null });
    }),
    approuverIndicateurs: (cid, etid) => ecrire(() =>
      rpc("approuver_indicateurs", { p_campagne: cid, p_etablissement: etid })),

    /* Le coffre de preuves. Deux mouvements, dans cet ordre et pas l'inverse :
       le fichier monte d'abord dans le stockage objet, sous une cle qui commence
       par l'identifiant de l'entreprise, puis la RPC enregistre la ligne. Si la
       RPC echoue, le fichier reste orphelin dans le bucket et la tache de menage
       le ramasse ; si on ecrivait la ligne d'abord, c'est une preuve qui
       manquerait derriere un lien qui promet qu'elle existe. */
    joindrePiece: async ({ objet, cible, fichier }) => {
      const ent = await rpc("mon_entreprise_id", {});
      if (!ent) throw new Error("Compte sans entreprise.");
      const propre = String(fichier.name).replace(/[^A-Za-z0-9._-]/g, "_").slice(-80);
      const cle = `${ent}/${objet}/${cible}/${Date.now()}-${propre}`;
      const { error: monte } = await client.storage.from("preuves")
        .upload(cle, fichier, { contentType: fichier.type, upsert: false });
      if (monte) throw new Error("Le fichier n'est pas monté : " + monte.message);
      const empreinte = await empreinteSha256(fichier);
      return ecrire(() => rpc("joindre_piece", {
        p_objet: objet, p_cible: cible, p_chemin: cle, p_nom: fichier.name,
        p_type: fichier.type, p_taille: fichier.size, p_empreinte: empreinte }));
    },
    retirerPiece: (id) => ecrire(() => rpc("retirer_piece", { p_piece: id })),
    /* Un lien signe, valable dix minutes. Le bucket n'est pas public : sans
       signature, un chemin devine ne rend rien, et une signature expire avant
       d'avoir eu le temps de circuler. */
    lienPiece: async (chemin) => {
      const { data, error } = await client.storage.from("preuves")
        .createSignedUrl(chemin, 600);
      if (error) throw new Error(error.message);
      return data?.signedUrl || null;
    },
    engager: ({ annonce, quantite, cle, consentement }) => ecrire(() =>
      rpc("engager_mission", { p_annonce: annonce, p_quantite: quantite, p_cle: cle || null,
                               p_consentement: !!consentement })),
    declarerFaite: (mid, propose) => ecrire(() =>
      rpc("declarer_mission", { p_mission: mid, p_propose: propose ?? null })),
    validerMission: (mid, ok, realise, motif = null) => ecrire(() =>
      rpc("trancher_mission", { p_mission: mid, p_ok: ok, p_realise: realise ?? null,
                                p_motif: motif || null })),
    creerAnnonce: (a) => ecrire(() => rpc("publier_annonce", {
      p_titre: a.titre, p_description: a.description, p_type: a.type,
      p_quantite: a.quantite, p_date: a.date, p_lieu: a.lieu,
      p_temps_travail: !!a.temps_travail,
      p_impact_unite: a.impact ? a.impact.unite : null,
      p_impact_par_unite: a.impact ? a.impact.par_unite : null })),
    fermerAnnonce: (aid) => ecrire(() => rpc("fermer_annonce", { p_annonce: aid })),
    retirerSalarie: (uid) => ecrire(() => rpc("pseudonymiser_salarie", { p_profil: uid })),
    /* Le moteur appelle `signaler({annonce, par, motif, precisions})`. Cette
       liaison prenait trois arguments positionnels : l'ecran passait un objet,
       la RPC recevait `[object Object]` en identifiant d'annonce et refusait. */
    signaler: ({ annonce, motif, precisions } = {}) => ecrire(() =>
      rpc("signaler_annonce", { p_annonce: annonce, p_motif: motif,
                                p_precisions: precisions || null })),
    deciderSignalement: (sid, decision, motivation) => ecrire(() =>
      rpc("decider_signalement", { p_signalement: sid, p_decision: decision, p_motivation: motivation })),
    /* Meme piege : le moteur expose `donsPersonnelsAgreges(eid)` et rend un
       objet ; cette liaison rendait une promesse, et l'ecran lisait
       `.suffisant` sur la promesse, donc `undefined`, donc le seuil
       d'agregation ne s'appliquait plus. La derivation du moteur travaille sur
       l'etat deja filtre par la RLS : elle reste la source. */
    donsPersonnelsAgregesServeur: (saison) =>
      rpc("dons_personnels_agreges", { p_saison: saison }),
    emettreRecu: (don) => ecrire(() => rpc("emettre_recu", { p_don: don })),
    emettreRecusEnAttente: (aid) => ecrire(() =>
      rpc("emettre_recus_en_attente", { p_association: aid })),


    /* ---- Le reste des ecritures ----
       Elles etaient absentes, et leur absence ne se voyait pas : le Proxy de fin
       de fichier retombait sur le moteur en memoire, l'ecran confirmait
       l'enregistrement, et rien ne partait au serveur. Un IBAN saisi
       disparaissait au rechargement suivant, sans un message. */
    enregistrerIban: (aid, { iban, bic, titulaire } = {}) => ecrire(() =>
      rpc("enregistrer_iban", { p_association: aid, p_iban: iban,
                                p_bic: bic || null, p_titulaire: titulaire || null })),
    delierHelloAsso: () => ecrire(() => rpc("delier_helloasso", {})),
    /* Lier ne s'ecrit pas d'ici : la mire d'autorisation de HelloAsso renvoie
       vers la fonction Edge, qui detient le secret partenaire et enregistre la
       liaison avec la cle de service. L'ecran se contente d'ouvrir la mire. */
    lierHelloAsso: () => { throw new Error(
      "La connexion HelloAsso passe par la page d'autorisation de HelloAsso."); },
    enregistrerHelloAsso: (aid, lien) => ecrire(() =>
      rpc("enregistrer_helloasso", { p_association: aid, p_lien: lien })),
    enregistrerNumeros: (aid, { siren, rna } = {}) => ecrire(() =>
      rpc("enregistrer_numeros_association", { p_association: aid,
                                               p_siren: siren || null, p_rna: rna || null })),
    accepterMandatRecus: (aid, { nom, qualite, version } = {}) => ecrire(() =>
      rpc("accepter_mandat_recus", { p_association: aid, p_nom: nom, p_qualite: qualite,
                                     ...(version ? { p_version: version } : {}) })),
    revoquerMandatRecus: (aid) => ecrire(() =>
      rpc("revoquer_mandat_recus", { p_association: aid })),
    controlerEnregistrement: (aid, { fiche = null, panne = false } = {}) => ecrire(() =>
      rpc("controler_association", { p_association: aid, p_fiche: fiche, p_panne: !!panne })),

    declarerIntentionDon: ({ annonce, montant, origine = "salarie" }) => ecrire(() =>
      rpc("declarer_intention_don", { p_annonce: annonce, p_montant: montant,
                                      p_origine: origine })),
    confirmerDonRecu: (iid, { montant = null } = {}) => ecrire(() =>
      rpc("confirmer_don_recu", { p_intention: iid, p_montant: montant })),
    abandonnerIntentionDon: (iid, motif = null) => ecrire(() =>
      rpc("abandonner_intention_don", { p_intention: iid, p_motif: motif })),

    declarerEvenement: (etid, champs = {}) => ecrire(() =>
      rpc("declarer_evenement", { p_etablissement: etid, p_date: champs.date,
        p_nature: champs.nature, p_gravite: champs.gravite, p_type: champs.type,
        p_zone: champs.zone || null, p_jours: Number(champs.jours_arret) || 0,
        p_circonstances: champs.circonstances || null })),
    annulerEvenement: (evid, motif) => ecrire(() =>
      rpc("annuler_evenement", { p_evenement: evid, p_motif: motif })),
    activerRegistre: (etid, oui) => ecrire(() =>
      rpc("activer_registre", { p_etablissement: etid, p_actif: !!oui })),
    ajouterAction: ({ evenement = null, etablissement, quoi, responsable, echeance }) =>
      ecrire(() => rpc("ajouter_action", { p_etablissement: etablissement, p_quoi: quoi,
        p_responsable: responsable, p_echeance: echeance, p_evenement: evenement })),
    majAction: (aid, etat) => ecrire(() =>
      rpc("maj_action", { p_action: aid, p_etat: etat })),

    ouvrirCampagne: ({ libelle, periode, debut, fin, echeance, rubriques }) => ecrire(() =>
      rpc("ouvrir_campagne", { p_libelle: libelle, p_periode: periode, p_debut: debut,
                               p_fin: fin, p_echeance: echeance,
                               p_rubriques: rubriques || null })),
    declarerValeurMateriel: (mid, champs = {}) => ecrire(() =>
      rpc("declarer_valeur_materiel", { p_mission: mid,
        p_valeur: champs.valeur ?? null, p_categorie: champs.categorie ?? null,
        p_nature: champs.nature ?? null, p_reference: champs.reference ?? null,
        /* L'écran envoie `sortieLe` en chameau, comme le moteur de démonstration
           l'attend. L'adaptateur ne lisait que `sortie_le` : la date de sortie de
           l'actif était TOUJOURS nulle en production, sur un registre qui doit
           justement dire quand le bien est sorti du bilan. On accepte les deux. */
        p_sortie_le: champs.sortieLe ?? champs.sortie_le ?? null,
        p_justificatif: champs.justificatif ?? null,
        p_effacement: champs.effacement ?? null })),
    expedier: (eid, kit, { suivi = null } = {}) => ecrire(() =>
      rpc("expedier_kit", { p_entreprise: eid, p_kit: kit, p_suivi: suivi })),
    confirmerReception: (exid) => ecrire(() =>
      rpc("confirmer_reception", { p_expedition: exid })),
    supprimerSalarie: (uid) => ecrire(() => rpc("supprimer_salarie", { p_profil: uid })),

    majEntreprise: (eid, champs = {}) => ecrire(() => rpc("maj_entreprise", {
      p_nom: champs.nom ?? null, p_secteur: champs.secteur ?? null,
      p_siret: champs.siret ?? null, p_adresse: champs.adresse ?? null,
      p_ca: champs.ca ?? null, p_cout_jour_moyen: champs.cout_jour_moyen ?? null,
      p_effectif: champs.effectif ?? null,
      /* Le dossier fiscal. Ces cinq champs partaient jusqu'ici dans le vide :
         l'écran les saisissait, la RPC ne les prenait pas, la table n'avait pas
         les colonnes. `p_efface_vides` dit que le FORMULAIRE COMPLET des
         paramètres a été soumis, donc qu'un champ vidé y est une décision et
         doit redevenir null — sinon une adresse personnelle ou un montant saisi
         par erreur ne pourrait plus jamais être retiré. On ne le pose que si
         TOUTES les clés du formulaire sont là : le poser sur trois clés
         effaçait les quatre autres dès qu'un écran n'en envoyait qu'une. */
      p_cout_heure_charge: champs.cout_heure_charge ?? null,
      p_exercice_debut: champs.exercice_debut ?? null,
      p_exercice_fin: champs.exercice_fin ?? null,
      p_dons_hors_riseva: champs.dons_hors_riseva ?? null,
      p_report_anterieur: champs.report_anterieur ?? null,
      p_efface_vides: ["cout_heure_charge", "exercice_debut", "exercice_fin",
                       "dons_hors_riseva", "report_anterieur", "referent",
                       "referent_mail"].every(k => k in champs),
      p_referent_nom: champs.referent ?? null,
      p_referent_mail: champs.referent_mail ?? null })),
    majDomaines: (eid, liste) => ecrire(() =>
      rpc("maj_domaines", { p_domaines: liste || [] })),
    reglerVisibilite: (eid, valeur) => ecrire(() =>
      rpc("regler_visibilite", { p_visibilite: valeur })),
    reglerObjectifSaison: (eid, cible) => ecrire(() =>
      rpc("regler_objectif_saison", { p_cible: cible === "" || cible === null
        || cible === undefined ? null : Math.round(Number(cible)) })),
    activerClassementSites: (gid, oui) => ecrire(() =>
      rpc("activer_classement_sites", { p_actif: !!oui })),

    promouvoirAdmin: (uid) => ecrire(() => rpc("promouvoir_admin", { p_profil: uid })),
    retrograderAdmin: (uid) => ecrire(() => rpc("retrograder_admin", { p_profil: uid })),
    suspendreAcces: (uid, oui) => ecrire(() =>
      rpc("suspendre_acces", { p_profil: uid, p_suspendre: !!oui })),
    confirmerAffectation: (uid, etid = null) => ecrire(() =>
      rpc("confirmer_affectation", { p_profil: uid, p_etablissement: etid })),
    /* Le moteur de demonstration creait un compte de toutes pieces. Ici un compte
       n'existe qu'apres authentification : ce qu'on cree est un lien nominatif a
       usage unique, et la fonction rend ce lien. */
    inviterSalarie: (org, nom, email) => ecrire(() =>
      rpc("inviter_salarie", { p_nom: nom, p_mail: email })),
    revoquerInvitation: (iid) => ecrire(() =>
      rpc("revoquer_invitation", { p_invitation: iid })),
    creerInvitationCSE: (eid, nom, email) => ecrire(() =>
      rpc("creer_invitation_cse", { p_nom: nom, p_mail: email })),
    accepterInvitationCSE: (code) => ecrire(() =>
      rpc("rejoindre_comme_cse", { p_code: code })),
    majPreferences: (uid, champs = {}) => ecrire(() =>
      rpc("maj_preferences", { p_preferences: champs })),
    /* Le prenom visible des collegues est un reglage de la personne : il passe
       par la meme fonction que ses autres reglages, filtree sur auth.uid(). */
    reglerVisibiliteParis: (uid, oui) => ecrire(() =>
      rpc("maj_preferences", { p_preferences: { visible_pairs: !!oui } })),
    /* Le moteur est une tache PLANIFIEE cote serveur (pg_cron, `05_taches.sql`).
       Le navigateur ne la declenche pas : il retombait sur le moteur en memoire,
       et l'ecran annoncait des validations automatiques et des envois que le
       serveur n'avait jamais faits. */
    /* Les noms des compteurs sont ceux du serveur, pas d'autres : l'écran lisait
       `annonces_fermees` et recevait `annonces_closes`, ce qui affichait
       « undefined fermeture(s) ». Deux vocabulaires pour la même chose, c'est
       une divergence de plus à chaque écran. */
    moteur: () => ({ validations_auto: 0, annonces_fermees: 0, relances_collecte: 0,
                     le: null, cote: "serveur" }),

    rouvrirAnnonce: (aid) => ecrire(() => rpc("rouvrir_annonce", { p_annonce: aid })),
    supprimerAnnonce: (aid) => ecrire(() => rpc("supprimer_annonce", { p_annonce: aid })),
    majReglagesRecus: (aid, champs = {}) => ecrire(() => rpc("maj_reglages_recus", {
      p_actif: champs.actif ?? null, p_eligible: champs.eligible_mecenat ?? null,
      p_signataire: champs.signataire ?? null, p_qualite: champs.qualite ?? null,
      p_prefixe: champs.prefixe ?? null })),
    cloreCampagne: (cid) => ecrire(() => rpc("clore_campagne", { p_campagne: cid })),

    preinscrire: (p = {}) => ecrire(() => rpc("preinscrire", {
      p_entreprise: p.entreprise, p_contact: p.contact,
      p_effectif: p.effectif ?? null })),
    validerAssociation: (aid) => ecrire(() =>
      rpc("valider_association", { p_association: aid })),
    suspendreAssociation: (aid, motif) => ecrire(() =>
      rpc("suspendre_association", { p_association: aid, p_motif: motif })),
    /* L'inscription d'une association depuis le site public. La personne est
       deja authentifiee par lien de connexion ; le compte s'ouvre non valide, et
       n'est visible des entreprises qu'apres le controle au registre. */
    creerCompteAssociation: ({ association, ville, resume, nom } = {}) => ecrire(() =>
      rpc("ouvrir_compte_association", { p_nom: association, p_ville: ville,
                                         p_resume: resume || null, p_contact: nom || null })),
    /* Une entreprise qui s'inscrit elle-même. L'ancienne liaison appelait la
       fonction de Riseva, qui exige `est_admin()` : le bouton « Créer un compte
       entreprise » finissait donc TOUJOURS sur « Réservé à Riseva ». Celle-ci
       ouvre le compte au nom de la personne connectée, la nomme administratrice,
       et rend le premier lien d'inscription de ses salariés. */
    creerCompteEntreprise: ({ entreprise, effectif, secteur, ville, nom } = {}) => ecrire(() =>
      rpc("ouvrir_compte_entreprise", { p_nom: entreprise, p_effectif: Number(effectif) || 0,
                                        p_secteur: secteur || null, p_ville: ville || null,
                                        p_contact: nom || null })),
    majContrat: (eid, champs = {}) => ecrire(() => rpc("maj_contrat", {
      p_plateforme: champs.plateforme_reception ?? null,
      p_annuaire: champs.annuaire_id ?? null })),
    reconduire: (eid, oui) => ecrire(() => rpc("reconduire", { p_oui: !!oui })),
    marquerFacturePayee: (eid, ref) => ecrire(() =>
      rpc("marquer_facture_payee", { p_ref: ref, p_le: null })),

    /* `classement`, `donsPersonnelsAgreges` et `signaler` avaient ici des
       versions asynchrones aux signatures differentes de celles du moteur : le
       tableau de bord appelait `DB.classement().find(...)` et recevait une
       promesse, donc un ecran blanc a la connexion. Les derivations du moteur
       restent la source, elles travaillent sur l'etat deja filtre par la RLS.
       Ces trois-la gardent leur nom de fonction serveur, distinct. */
    classementServeur: (saison) => rpc("classement_saison", { p_saison: saison }),

    /* ---- Ce que la base calcule, et que le navigateur ne recalcule pas ----
       Ces chiffres finissent dans le rapport de fin de saison d'un client, et
       servent d'argument au renouvellement. Un chiffre calculé dans le
       navigateur est un chiffre que personne ne peut refaire : ni un
       commissaire aux comptes, ni nous six mois plus tard. La distance, le
       verdict d'offre, l'entonnoir et son plancher d'anonymat sont donc
       calculés par PostgreSQL, sous les mêmes policies que le reste, et le
       navigateur ne fait que les afficher.

       Les noms de colonnes changent de forme au passage — la base parle
       serpent, l'écran parle chameau. La conversion se fait ici, une fois,
       plutôt que dans chaque écran. */
    offreLocale: async (etid) => {
      const r = await rpc("offre_locale", { p_etablissement: etid });
      return r && r.length ? versOffre(r[0]) : null;
    },
    offreParSite: async (eid) => {
      const r = await rpc("offre_par_site", { p_entreprise: eid });
      return (r || []).map(versOffre);
    },
    signalerZone: (etid, motif = null) => ecrire(() =>
      rpc("signaler_zone", { p_etablissement: etid, p_motif: motif })),
    majSaison: (champs = {}) => ecrire(() => rpc("maj_saison", {
      p_nom: champs.nom ?? null, p_debut: champs.debut ?? null,
      p_fin: champs.fin ?? null, p_etat: champs.etat ?? null })),
    majBareme: (type, points) => ecrire(() =>
      rpc("maj_bareme", { p_type: type, p_points: Math.round(Number(points) || 0) })),
    signerContrat: (eid, { sieges, montant_ht = 0, palier = null,
                           fondateur = false, le = null } = {}) => ecrire(() =>
      rpc("signer_contrat", { p_entreprise: eid, p_montant_ht: Number(montant_ht) || 0,
                              p_sieges: Math.round(Number(sieges) || 0), p_palier: palier,
                              p_fondateur: !!fondateur, p_le: le })),
    adoption: async ({ entreprise = null, etablissement = null } = {}) => {
      const r = await rpc("adoption", { p_entreprise: entreprise,
                                        p_etablissement: etablissement });
      return r && r.length ? versAdoption(r[0], moteur) : null;
    }
  };

  /* Le moteur d'abord, les écritures ensuite : une méthode d'écriture masque
     toujours la dérivation du même nom.

     Ce que ce Proxy ne fait PLUS : retomber sur le moteur pour une ECRITURE. Il
     le faisait, et c'est ce qui rendait invisibles une trentaine d'écritures non
     branchées — l'écran affichait « enregistré », la mutation restait dans un
     état en mémoire créé avec `persister:false`, et tout disparaissait au
     rechargement. Une écriture sans fonction Postgres lève maintenant, avec le
     nom de la fonction qui manque. */
  /* La liste des ecritures reellement branchees, lisible de l'exterieur : le
     controle de completude ne peut pas interroger le Proxy, qui repond oui a
     tout. C'est exactement le piege dans lequel il etait tombe. */
  brut.ecrituresBranchees = Object.keys(brut).filter(k => ECRITURES.includes(k));

  const dos = new Proxy(brut, {
    get: (cible, prop) => {
      if (Object.prototype.hasOwnProperty.call(cible, prop)) return cible[prop];
      if (ECRITURES.includes(prop))
        return () => { throw new Error("Riseva : « " + String(prop) + " » n'a pas encore "
          + "de fonction côté serveur. Rien n'a été enregistré."); };
      const v = moteur ? moteur[prop] : undefined;
      return typeof v === "function" ? v.bind(moteur) : v;
    },
    has: (cible, prop) => prop in cible || (moteur ? prop in moteur : false)
  });
  return dos;
}

export const DB = new Proxy({}, {
  get: (_, prop) => {
    const v = impl[prop];
    return typeof v === "function" ? v.bind(impl) : v;
  }
});
