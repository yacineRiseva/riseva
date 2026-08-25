/* Recette de la couche Postgres.
 *
 * On ne teste pas un client Supabase : on teste la *traduction*. Un client
 * factice sert les lignes réellement produites par la base de recette, la couche
 * les charge, et le moteur dérive. Si un nom de colonne change en base sans que
 * la traduction suive, ce fichier le dit — pas le client.
 */
import { readFileSync } from "node:fs";
import { DB, connecterSupabase, seed } from "../public/app/data.js";

const lignes = JSON.parse(readFileSync("/tmp/riseva-db.json", "utf8"));

const faux = {
  from: (nom) => ({
    select: () => Promise.resolve({ data: lignes[nom] ?? null,
                                    error: lignes[nom] ? null : { message: "permission denied" } })
  }),
  rpc: async () => ({ data: null, error: null }),
  auth: { getUser: async () => ({ data: { user: null } }) }
};

let rates = 0;
const dit = (nom, ok, detail = "") => {
  console.log((ok ? "  ok   " : "  RATÉ ") + nom + (!ok && detail ? `  [${detail}]` : ""));
  if (!ok) rates++;
};

await connecterSupabase(null, { client: faux });

dit("la couche annonce le mode production", DB.mode === "supabase", DB.mode);

const sa = DB.saison();
dit("la saison ouverte est chargée", !!sa && sa.etat === "ouverte", JSON.stringify(sa));

const ents = DB.entreprises();
dit("les sociétés sont chargées", ents.length === lignes.entreprise.length);
dit("le groupe est rattaché à sa société",
  ents.some(e => e.groupe), JSON.stringify(ents.map(e => e.groupe)));

/* La société à trois sites du jeu de démonstration. On la cherchait par un SIREN
   qu'aucune entreprise ne porte, et le repli `ents[0]` prenait la première ligne
   rendue par Postgres — c'est-à-dire l'ordre physique du tas, qui change dès
   qu'un test met à jour une ligne. La recette dépendait donc de l'ordre des
   tests. On la désigne par son nom, qui, lui, ne bouge pas. */
const mere = ents.find(e => e.nom === "Vaudrey Ciments") || ents[0];
const etabs = DB.etablissements(mere.id);
dit("les établissements d'une société sont retrouvés", etabs.length === 3,
  `${mere.nom} : ${etabs.length}`);

const ann = DB.annonces({ ouvertes: true });
dit("les annonces ouvertes sont traduites", ann.length > 0 && ann.every(a => a.asso && a.type));
dit("une annonce garde son besoin restant", ann.every(a => typeof a.restant === "number"));

const ms = DB.missions({});
dit("les missions sont traduites", ms.length === lignes.mission.length);
dit("l'état des missions est repris tel quel",
  ms.every(m => ["engagee","a_valider","validee","validee_auto","refusee"].includes(m.etat)));

/* Le point qui compte : la dérivation tourne sur les lignes réelles. */
const eid = ms[0] ? ms[0].entreprise : ents[0].id;
const pts = DB.pointsDe(eid);
dit("le score se dérive des lignes de la base",
  pts && typeof pts.brut === "number" && typeof pts.retenu === "number",
  JSON.stringify(pts));
dit("le plafond par format est appliqué comme en démonstration",
  pts.retenu <= pts.brut, `${pts.retenu} > ${pts.brut}`);

const g = ents.find(e => e.groupe);
if (g){
  const c = DB.consolideGroupe(g.groupe);
  /* On compare aux sites DE CE GROUPE, pas au nombre total d'établissements de
     la base : dès qu'une deuxième société existe — et la recette en crée une,
     celle qui s'inscrit toute seule — les deux nombres n'ont plus de raison
     d'être égaux, et l'assertion tombait sans qu'aucune consolidation soit
     fausse. */
  const attendus = ents.filter(e => e.groupe === g.groupe)
    .reduce((n, e) => n + DB.etablissements(e.id).length, 0);
  dit("la consolidation de groupe fonctionne sur la vraie base",
    c && c.sites.length === attendus, `${c && c.sites.length} vs ${attendus}`);
  dit("le consolidé reste un rapport de sommes",
    !c.effectif || Math.abs(c.parSalarie - c.points / c.effectif) < 1e-9);
}

const camp = DB.campagnes()[0];
if (camp){
  const e = DB.etatCampagne(camp.id);
  dit("l'état d'une campagne se calcule sur les observations réelles",
    e && e.sites.length > 0, JSON.stringify(e && e.sites.map(x => x.etat)));
  const ind = DB.indicateursDe({ campagne: camp.id, groupe: camp.groupe });
  dit("les taux se calculent sur les valeurs de la base",
    ind && (ind.calcules.tf1 === null || typeof ind.calcules.tf1 === "number"),
    JSON.stringify(ind && ind.calcules));
}

/* ------------------------------------------------------------------ */
/* La forme des objets, moteur contre moteur                           */
/* ------------------------------------------------------------------ */
/* Le défaut le plus coûteux de ce produit ne se voit sur aucun écran : le MÊME
   code de dérivation sert le jeu de démonstration et la base réelle, et il suffit
   qu'un mappeur oublie un champ, le nomme autrement ou le pose en dur pour qu'un
   écran juste en démonstration soit faux chez un client — sans erreur, sans trace.
   La recette d'écran ne peut pas l'attraper : elle tourne sur la démonstration,
   qui a toujours le champ.
   On compare donc les DEUX formes, collection par collection : tout champ présent
   sur un objet de la démonstration doit exister sur l'objet correspondant chargé
   depuis Postgres. L'inverse n'est pas une faute — la production porte des champs
   que la démonstration n'a pas besoin d'inventer. */
{
  const etat = DB.etat();
  /* `id` mis à part : les identifiants de démonstration sont des chaînes courtes.
     Les champs listés ici sont ceux dont on sait qu'ils n'ont PAS d'équivalent en
     base et qui sont documentés comme tels dans le mappeur. */
  const tolere = {
    /* `reseau` marque, dans le jeu de démonstration seul, les comptes et les
       missions des AUTRES entreprises du réseau, fabriqués pour que « Tous
       ensemble » ait quelque chose à additionner. En production, ces lignes sont
       réelles : le marqueur n'a pas d'objet. */
    utilisateurs: ["email", "reseau"],
    associations: ["reseaux", "recus_actif"],
    entreprises: [],
    invitations: ["code", "email", "nom"],
    missions: ["don", "reseau"],
    annonces: [],
    campagnes: [], observations: [], etablissements: [], groupes: [],
    contrats: [], evenements: [], actions: [], acces: [], intentions: [],
    preinscriptions: [], controles: [], signalements: [], envois: [],
    expeditions: [], sourcing: [], pieces: [], recus_emis: []
  };
  const cles = (o) => Object.keys(o || {});
  let manquants = [];
  Object.keys(tolere).forEach(nom => {
    const dem = seed[nom], prod = etat[nom];
    if (!Array.isArray(dem) || !dem.length) return;
    if (!Array.isArray(prod) || !prod.length) return;
    /* L'union des clés de la démonstration : un objet du jeu peut être plus
       complet qu'un autre, et c'est le champ le plus riche qui fait la forme. */
    const attendues = new Set();
    dem.forEach(o => cles(o).forEach(k => attendues.add(k)));
    const vues = new Set();
    prod.forEach(o => cles(o).forEach(k => vues.add(k)));
    [...attendues].forEach(k => {
      if (!vues.has(k) && !(tolere[nom] || []).includes(k))
        manquants.push(`${nom}.${k}`);
    });
  });
  dit("aucun champ du jeu de démonstration ne disparaît en production",
    manquants.length === 0, manquants.join(", "));
}

/* Ce qu'un salarié ne peut pas lire ne doit pas casser le moteur : la RLS
   refuse la table, la couche rend une liste vide, et l'écran s'affiche. */
const partiel = {
  ...faux,
  from: (nom) => ({
    select: () => Promise.resolve(["abonnement","acces","mission"].includes(nom)
      ? { data: null, error: { message: "permission denied for table " + nom } }
      : { data: lignes[nom] ?? [], error: null })
  })
};
await connecterSupabase(null, { client: partiel });
dit("une table refusée par la RLS ne casse pas l'application",
  DB.missions({}).length === 0 && DB.saison() !== null);

console.log(rates ? `\n${rates} échec(s).` : "\nTout est vert.");
process.exit(rates ? 1 : 0);
