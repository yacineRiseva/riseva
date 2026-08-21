/* Recette de la couche Postgres.
 *
 * On ne teste pas un client Supabase : on teste la *traduction*. Un client
 * factice sert les lignes réellement produites par la base de recette, la couche
 * les charge, et le moteur dérive. Si un nom de colonne change en base sans que
 * la traduction suive, ce fichier le dit — pas le client.
 */
import { readFileSync } from "node:fs";
import { DB, connecterSupabase } from "../public/app/data.js";

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

const etabs = DB.etablissements(ents.find(e => e.groupe && e.siren === "393120916")?.id
  || ents[0].id);
dit("les établissements d'une société sont retrouvés", etabs.length === 3, String(etabs.length));

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
  dit("la consolidation de groupe fonctionne sur la vraie base",
    c && c.sites.length === lignes.etablissement.length, JSON.stringify(c && c.sites.length));
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
