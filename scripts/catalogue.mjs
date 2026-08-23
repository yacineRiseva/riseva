/* ------------------------------------------------------------------ */
/* Le catalogue, fabriqué depuis les sources et jamais recopié         */
/* ------------------------------------------------------------------ */
/* Deux endroits décrivent les indicateurs : `public/app/data.js`, que lit
   l'application, et la base, où vivront les entrées créées plus tard. Tant que
   les deux sont écrits à la main, ils divergent — pas tout de suite, mais au
   troisième ajout, et le symptôme est une clé qui existe d'un côté seulement,
   donc une colonne vide que personne ne sait expliquer.

   Ce script supprime la question : le fichier SQL est ENGENDRÉ depuis data.js.
   Ajouter un indicateur, c'est ajouter une entrée dans data.js et relancer.

       node scripts/catalogue.mjs

   Les insertions sont idempotentes : rejouer le fichier met à jour les
   libellés sans toucher aux valeurs déjà saisies. Ce qui a disparu du catalogue
   n'est pas supprimé mais désactivé — les valeurs saisies sous une clé retirée
   doivent rester lisibles, sinon un rapport de l'an dernier perd la moitié de
   ses lignes sans que personne ne s'en aperçoive. */
import { readFileSync, writeFileSync, copyFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const RACINE = new URL("..", import.meta.url).pathname;
/* data.js porte l'extension `.js` : node le lirait en CommonJS depuis un
   répertoire sans `"type": "module"`. On le recopie en `.mjs` pour l'importer. */
const tmp = join(tmpdir(), `riseva-catalogue-${process.pid}.mjs`);
copyFileSync(join(RACINE, "public/app/data.js"), tmp);
const { RUBRIQUES, INDICATEURS } = await import(tmp);
unlinkSync(tmp);

const s = (v) => (v === null || v === undefined || v === "")
  ? "null" : "'" + String(v).replace(/'/g, "''") + "'";
const b = (v) => (v ? "true" : "false");

const lignesR = RUBRIQUES.map(r =>
  `  (${s(r.cle)}, ${s(r.libelle)}, ${s(r.aide)}, ${r.ordre}, ${b(r.defaut)})`);

const lignesI = [
  ...INDICATEURS.saisis.map((d, i) => ({ ...d, nature: "collecte", ordre: i + 1 })),
  ...INDICATEURS.calcules.map((d, i) => ({ ...d, nature: "calcule", ordre: 100 + i + 1 }))
].map(d => "  (" + [s(d.cle), s(d.rubrique), s(d.libelle), s(d.unite), s(d.nature),
  s(d.niveau), s(d.source), s(d.aide), s(d.inclut), s(d.exclut), s(d.formule),
  s(d.num), s(d.den), s(d.note), b(d.reglementaire), d.ordre,
  s(INDICATEURS.version)].join(", ") + ")");

const clesR = RUBRIQUES.map(r => s(r.cle)).join(", ");
const clesI = [...INDICATEURS.saisis, ...INDICATEURS.calcules]
  .map(d => s(d.cle)).join(", ");

const sql = `-- Riseva — catalogue des rubriques et des indicateurs
-- ---------------------------------------------------------------------------
-- ENGENDRÉ par scripts/catalogue.mjs depuis public/app/data.js.
-- Ne pas modifier à la main : la prochaine exécution écraserait la correction.
-- Pour ajouter un indicateur, ajoutez-le dans data.js et relancez le script.
--
-- Dictionnaire version ${INDICATEURS.version} —
-- ${RUBRIQUES.length} rubriques, ${INDICATEURS.saisis.length} indicateurs collectés,
-- ${INDICATEURS.calcules.length} calculés.
-- ---------------------------------------------------------------------------

insert into rubrique (cle, libelle, aide, ordre, defaut) values
${lignesR.join(",\n")}
on conflict (cle) do update set
  libelle = excluded.libelle, aide = excluded.aide,
  ordre = excluded.ordre, defaut = excluded.defaut, active = true;

insert into indicateur (cle, rubrique, libelle, unite, nature, niveau, source,
  aide, inclut, exclut, formule, numerateur, denominateur, note,
  reglementaire, ordre, version) values
${lignesI.join(",\n")}
on conflict (cle) do update set
  rubrique = excluded.rubrique, libelle = excluded.libelle, unite = excluded.unite,
  nature = excluded.nature, niveau = excluded.niveau, source = excluded.source,
  aide = excluded.aide, inclut = excluded.inclut, exclut = excluded.exclut,
  formule = excluded.formule, numerateur = excluded.numerateur,
  denominateur = excluded.denominateur, note = excluded.note,
  reglementaire = excluded.reglementaire, ordre = excluded.ordre,
  version = excluded.version, active = true;

-- Ce qui a quitté le catalogue est désactivé, jamais supprimé : les valeurs
-- déjà saisies sous cette clé restent lisibles, et les rapports qui les citent
-- restent vrais.
update indicateur set active = false where cle not in (${clesI});
update rubrique  set active = false where cle not in (${clesR});
`;

writeFileSync(join(RACINE, "supabase/06_catalogue.sql"), sql);
process.stdout.write(`06_catalogue.sql : ${RUBRIQUES.length} rubriques, `
  + `${INDICATEURS.saisis.length + INDICATEURS.calcules.length} indicateurs, `
  + `version ${INDICATEURS.version}\n`);
