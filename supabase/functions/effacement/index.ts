/* Riseva — droit à l'effacement (RGPD art. 17)
   ---------------------------------------------------------------------------
   Supprimer une ligne dans `profil` ne supprime pas un compte : l'utilisateur
   reste dans `auth.users`, son jeton reste valable jusqu'à expiration, et son
   identifiant continue de relier ses missions entre elles. Une suppression qui
   laisse tout cela derrière elle est une pseudonymisation, et il faut alors
   l'appeler ainsi. Cette fonction fait le reste.

   L'ordre compte :

   1. Figer les agrégats. Les rapports scellés et les compteurs de saison ne
      doivent pas bouger parce qu'une personne s'en va : ce qu'une entreprise a
      réellement fait cette année-là reste vrai. Le SQL s'en charge en mettant
      `mission.salarie` à NULL (ON DELETE SET NULL) au lieu de casser la ligne.
   2. Supprimer les données applicatives, dans une transaction.
   3. Supprimer le compte d'authentification, ce qui invalide le rafraîchissement
      du jeton — l'ancien jeton d'accès, lui, vit jusqu'à son expiration, et
      c'est pour cela que `private.moi()` renvoie NULL dès que le profil a disparu.
   4. Consigner la purge, sans recopier ce qui vient d'être purgé.

   Qui peut demander : la personne elle-même, ou Riseva. Un administrateur
   d'entreprise, non : il peut retirer quelqu'un de son équipe — c'est
   `pseudonymiser_salarie` — mais l'effacement appartient à la personne. */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const URL_SB = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

const admin = createClient(URL_SB, SERVICE, { auth: { persistSession: false } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("méthode non autorisée", { status: 405 });

  const jeton = req.headers.get("Authorization")?.replace(/^Bearer /, "");
  if (!jeton) return new Response("connexion requise", { status: 401 });

  /* On vérifie le jeton avec la clé publique, jamais avec la clé de service :
     la clé de service ne doit jamais servir à décider qui parle. */
  const appelant = createClient(URL_SB, ANON, {
    global: { headers: { Authorization: `Bearer ${jeton}` } },
    auth: { persistSession: false }
  });
  const { data: { user }, error: eAuth } = await appelant.auth.getUser();
  if (eAuth || !user) return new Response("jeton invalide", { status: 401 });

  const { profil } = await req.json().catch(() => ({ profil: null })) as { profil?: string };
  const cible = profil ?? user.id;

  /* Riseva peut effacer pour le compte d'un tiers ; personne d'autre. */
  if (cible !== user.id) {
    const { data: estAdmin } = await appelant.rpc("suis_je_admin");
    if (!estAdmin) return new Response("effacement réservé à la personne concernée", { status: 403 });
  }

  const { error: eSql } = await admin.rpc("supprimer_salarie", { p_profil: cible });
  if (eSql) {
    console.error("supprimer_salarie", eSql.message);
    return new Response(eSql.message, { status: 500 });
  }

  const { error: eUser } = await admin.auth.admin.deleteUser(cible);
  if (eUser) {
    /* Les données applicatives sont parties, le compte d'authentification non :
       il faut le savoir tout de suite, c'est un effacement incomplet. */
    console.error("deleteUser", eUser.message);
    return new Response("compte d'authentification non supprimé : " + eUser.message, { status: 500 });
  }

  return new Response(JSON.stringify({ efface: cible }), {
    status: 200, headers: { "content-type": "application/json" }
  });
});
