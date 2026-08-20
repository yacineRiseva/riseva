/* Riseva — point d'entrée public du lien de validation envoyé aux associations.
   GET /valider-mission?j=<jeton>&r=oui|non  */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const page = (titre: string, texte: string) => new Response(
  `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
   <meta name="viewport" content="width=device-width,initial-scale=1"><title>${titre}</title></head>
   <body style="font-family:system-ui;max-width:560px;margin:14vh auto;padding:0 24px;color:#16211C">
   <h1 style="font-size:24px">${titre}</h1><p style="color:#5A6B63">${texte}</p></body></html>`,
  { headers: { "content-type": "text/html; charset=utf-8" } });

Deno.serve(async (req) => {
  const u = new URL(req.url);
  const jeton = u.searchParams.get("j");
  const reponse = u.searchParams.get("r");
  if (!jeton || !["oui", "non"].includes(reponse ?? ""))
    return page("Lien invalide", "Ce lien n'est pas exploitable.");

  const { data: m } = await sb.from("mission").select("id, etat").eq("jeton", jeton).single();
  if (!m) return page("Lien inconnu", "Cette mission n'existe plus.");
  if (m.etat !== "a_valider")
    return page("Déjà traitée", "Cette mission a déjà été tranchée, merci.");

  await sb.from("mission")
    .update({ etat: reponse === "oui" ? "validee" : "refusee", tranchee_le: new Date().toISOString() })
    .eq("id", m.id);

  return reponse === "oui"
    ? page("Merci", "La mission est confirmée et les points ont été crédités à l'entreprise.")
    : page("C'est noté", "La mission a été refusée, aucun point n'a été attribué.");
});
