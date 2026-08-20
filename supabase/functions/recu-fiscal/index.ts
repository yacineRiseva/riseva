/* Riseva — préparation du reçu fiscal, pour le compte de l'association.
   Appelée par le webhook du prestataire de paiement après encaissement.

   Deux modèles officiels, et ils ne sont pas interchangeables :
   - Cerfa 11580*05, dons des PARTICULIERS, article 200 du CGI ;
   - Cerfa 16216*01, dons des ENTREPRISES, article 238 bis du CGI, obligatoire
     depuis le 1er janvier 2022.

   Riseva ne détient jamais les fonds et n'est pas l'émetteur : le reçu émane de
   l'association, sous son numéro d'ordre et la signature de la personne habilitée.
   Sans réglages complets côté association, on ne produit rien. */
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

  const { association, entreprise, montant, reference, donateur, pour_le_compte_de } = await req.json();

  // Qui donne détermine le modèle. Un salarié qui donne de sa poche est un particulier,
  // même si son geste rapporte des points à son entreprise.
  const auNomDeLEntreprise = pour_le_compte_de === "entreprise";
  const modele = auNomDeLEntreprise
    ? { cerfa: "16216*01", article: "238 bis du CGI", public: "entreprise" }
    : { cerfa: "11580*05", article: "200 du CGI",     public: "particulier" };

  const { data: don, error } = await sb.from("don")
    .insert({ association, entreprise, montant, reference, fournisseur: "helloasso" })
    .select("id").single();
  if (error) return new Response(error.message, { status: 500 });

  const { data: asso } = await sb.from("association")
    .select("nom, rna, ville, recus_actif, recus_eligible, recus_signataire, recus_qualite, recus_prefixe, recus_numero")
    .eq("id", association).single();

  if (!asso?.recus_actif || !asso?.recus_eligible || !asso?.recus_signataire || !asso?.recus_prefixe){
    // On préfère ne rien émettre plutôt qu'émettre un reçu attaquable.
    return Response.json({ ok: true, recu: null,
      motif: "réglages de reçu incomplets côté association" });
  }

  const numero = `${asso.recus_prefixe}${String(asso.recus_numero).padStart(4, "0")}`;
  await sb.from("association").update({ recus_numero: asso.recus_numero + 1 }).eq("id", association);

  const recu = {
    modele: modele.cerfa,
    article: modele.article,
    numero,                       // numérotation continue, propriété de l'association
    emetteur: asso.nom,           // l'association émet, Riseva prépare
    rna: asso.rna,
    signataire: asso.recus_signataire,
    qualite: asso.recus_qualite,
    montant,
    date: new Date().toISOString().slice(0, 10),
    donateur
  };

  await sb.from("don").update({ recu_emis_le: new Date().toISOString() }).eq("id", don.id);
  return Response.json({ ok: true, recu });
});
