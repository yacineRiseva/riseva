/* Riseva — réception des paiements
   ---------------------------------------------------------------------------
   Le seul chemin par lequel un don financier entre dans la base. Le navigateur
   ne confirme jamais un paiement : il ne fait qu'ouvrir la page du prestataire.
   C'est le prestataire qui nous rappelle ici, et c'est cet appel-là qu'on vérifie.

   Trois précautions, dans cet ordre :

   1. La signature. Comparée en temps constant, sinon la durée de la comparaison
      dit combien de caractères sont justes et le secret se devine octet par octet.
   2. L'idempotence. Les prestataires rejouent — c'est leur manière de garantir
      la livraison. `confirmer_don` retombe sur (fournisseur, référence) et
      renvoie le don déjà enregistré, sans recompter les points.
   3. Le calcul côté base. Le montant vient du prestataire, les points viennent du
      barème de la saison, lu en SQL. Rien de ce que contient ce corps de requête
      ne décide d'un score.

   Le secret et la clé de service vivent dans les variables d'environnement de la
   fonction, jamais dans `public/`. */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

/* Comparaison à durée constante. `a === b` sort au premier caractère différent. */
function memeSecret(recu: string | null, attendu: string | undefined): boolean {
  if (!recu || !attendu || recu.length !== attendu.length) return false;
  let diff = 0;
  for (let i = 0; i < recu.length; i++) diff |= recu.charCodeAt(i) ^ attendu.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("méthode non autorisée", { status: 405 });

  if (!memeSecret(req.headers.get("x-riseva-signature"), Deno.env.get("WEBHOOK_SECRET")))
    return new Response("signature invalide", { status: 401 });

  let corps: Record<string, unknown>;
  try { corps = await req.json(); }
  catch { return new Response("corps illisible", { status: 400 }); }

  const { fournisseur, reference, annonce, montant, origine, salarie } = corps as {
    fournisseur?: string; reference?: string; annonce?: string;
    montant?: number; origine?: "entreprise" | "salarie"; salarie?: string;
  };

  if (!fournisseur || !reference || !annonce || !montant || !origine)
    return new Response("champs manquants", { status: 400 });
  if (origine !== "entreprise" && origine !== "salarie")
    return new Response("origine inconnue", { status: 400 });
  if (typeof montant !== "number" || !(montant > 0) || montant > 1_000_000)
    return new Response("montant hors bornes", { status: 400 });

  const { data, error } = await sb.rpc("confirmer_don", {
    p_fournisseur: fournisseur,
    p_reference: reference,
    p_annonce: annonce,
    p_montant: montant,
    p_origine: origine,
    p_salarie: salarie ?? null
  });

  if (error) {
    /* On renvoie 200 sur une erreur métier définitive — annonce fermée, montant
       refusé — sinon le prestataire rejouera indéfiniment un appel qui ne
       passera jamais. On renvoie 500 seulement si un nouvel essai a un sens. */
    const definitif = /introuvable|fermée|invalide|hors bornes|sans entreprise/i.test(error.message);
    console.error("confirmer_don", error.message);
    return new Response(error.message, { status: definitif ? 200 : 500 });
  }

  /* Le reçu fiscal est émis dans la foulée, sous le numéro d'ordre de
     l'association et jamais côté navigateur. */
  const { error: eRecu } = await sb.rpc("emettre_recu", { p_don: data });
  if (eRecu) console.error("emettre_recu", eRecu.message);

  return new Response(JSON.stringify({ don: data }), {
    status: 200, headers: { "content-type": "application/json" }
  });
});
