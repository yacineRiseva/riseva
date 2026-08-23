/* La couche de production, sans Postgres.

   Ce que ce fichier verifie, et pourquoi il existe. La couche Supabase de
   `data.js` est un objet d'ecritures pose devant un Proxy qui retombe sur le
   moteur en memoire pour tout le reste. C'est ce qu'il faut pour les
   derivations : elles se recalculent sur l'etat charge, deja filtre par la RLS.

   Mais ce repli s'appliquait aussi aux ECRITURES. Vingt-six d'entre elles
   n'avaient aucune fonction Postgres : l'ecran affichait « enregistre », la
   mutation restait dans un etat cree avec `persister:false`, et disparaissait au
   rechargement. Le controle cense l'attraper interrogeait ce meme Proxy, qui
   repond oui a tout : il ne s'est jamais declenche.

   On verifie donc ici trois choses qu'aucun navigateur ne montre :
     1. chaque ecriture declaree a bien sa fonction cote serveur ;
     2. une ecriture non branchee LEVE au lieu d'ecrire en memoire ;
     3. les derivations masquees par une liaison de meme nom rendent toujours ce
        que l'interface attend — un tableau, pas une promesse.

       node scripts/test_couche.mjs
*/
globalThis.localStorage = { getItem: () => null, setItem(){}, removeItem(){} };
globalThis.location = { hostname: "127.0.0.1", search: "", hash: "" };

const { DB, connecterSupabase, ecrituresManquantes } =
  await import(new URL("../public/app/data.js", import.meta.url).href);

let passes = 0, total = 0;
const dit = (nom, ok, detail = "") => {
  total++; if (ok) passes++;
  console.log((ok ? "  ok   " : "  RATÉ ") + nom + (!ok && detail ? "  [" + detail + "]" : ""));
};

const appels = [];
const faux = {
  rpc: async (nom) => { appels.push(nom); return { data: null, error: null }; },
  from: (t) => ({ select: async () => ({
    data: t === "saison"
      ? [{ id:"s1", nom:"Saison 2026", debut:"2026-01-01", fin:"2026-12-31",
           etat:"ouverte", prix_min:2400, prix_max:18500, acompte:900 }]
      : [], error: null }) }),
  auth: { getUser: async () => ({ data: { user: null } }) },
  channel: () => ({ on(){ return this; }, subscribe(){ return this; } })
};

const dos = await connecterSupabase(null, { client: faux });

const manquantes = ecrituresManquantes(dos);
dit("chaque écriture a sa fonction Postgres", manquantes.length === 0, manquantes.join(", "));
dit("la couche annonce ce qu'elle a branché", (dos.ecrituresBranchees || []).length > 50,
    String((dos.ecrituresBranchees || []).length));

appels.length = 0;
await DB.enregistrerIban("a1", { iban: "FR7630006000011234567890189" });
dit("un enregistrement d'IBAN part vraiment au serveur",
    appels.includes("enregistrer_iban"), appels.join(", ") || "aucun appel");

/* Le classement est la premiere ligne du tableau de bord d'une entreprise : une
   promesse a la place d'un tableau, c'est un ecran blanc a la connexion. */
const cl = DB.classement();
dit("le classement rend un tableau, pas une promesse", Array.isArray(cl), typeof cl);
const dons = DB.donsPersonnelsAgreges("e1");
dit("l'agrégat des dons personnels garde son seuil",
    !!dons && dons.suffisant !== undefined && dons.seuil >= 5, JSON.stringify(dons));

/* Une couche sans aucune ecriture doit etre signalee comme incomplete : c'est
   ce controle-la qui ne se declenchait jamais. */
dit("une couche vide est signalée comme incomplète",
    ecrituresManquantes({ ecrituresBranchees: [] }).length > 50);

console.log(`\n${passes} / ${total} vérifications passées`);
if (passes !== total){ console.log("La couche de production n'est pas complète."); process.exit(1); }
console.log("La couche de production tient.");
