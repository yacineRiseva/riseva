/* Riseva — émission automatique du reçu fiscal au nom de l'association.
   Appelée par le webhook du prestataire de paiement après encaissement.
   Riseva ne détient jamais les fonds : elle ne fait qu'attester le don. */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("méthode non autorisée", { status: 405 });

  const secret = req.headers.get("x-riseva-signature");
  if (secret !== Deno.env.get("WEBHOOK_SECRET"))
    return new Response("signature invalide", { status: 401 });

  const { association, entreprise, montant, reference, donateur } = await req.json();

  const { data: don, error } = await sb.from("don")
    .insert({ association, entreprise, montant, reference, fournisseur: "helloasso" })
    .select("id").single();
  if (error) return new Response(error.message, { status: 500 });

  const { data: asso } = await sb.from("association").select("nom, rna, ville").eq("id", association).single();

  // Génération du reçu : gabarit CERFA 11580, rempli au nom de l'association bénéficiaire.
  const recu = {
    numero: `RSV-${new Date().getFullYear()}-${don.id.slice(0, 8).toUpperCase()}`,
    beneficiaire: asso?.nom,
    rna: asso?.rna,
    montant,
    date: new Date().toISOString().slice(0, 10),
    donateur
  };

  await sb.from("don").update({ recu_emis_le: new Date().toISOString() }).eq("id", don.id);
  return Response.json({ ok: true, recu });
});
