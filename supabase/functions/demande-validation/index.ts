/* Riseva — envoie aux associations le mail de confirmation des missions arrivées à échéance.
   À déclencher une fois par jour (Supabase Scheduled Function). */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);
const SITE = Deno.env.get("SITE_URL") ?? "https://riseva.fr";

async function envoyerMail(a: string, sujet: string, html: string) {
  const cle = Deno.env.get("RESEND_API_KEY");
  if (!cle) { console.log("[mail simulé]", a, sujet); return; }
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${cle}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "Riseva <bonjour@riseva.fr>", to: a, subject: sujet, html })
  });
}

Deno.serve(async () => {
  // Missions déclarées faites, en attente, dont l'association n'a pas encore été relancée
  const { data: missions, error } = await sb
    .from("mission")
    .select(`id, jeton, quantite, declaree_le,
             annonce:annonce ( titre, type, association:association ( nom ) ),
             entreprise:entreprise ( nom ),
             salarie:profil ( nom )`)
    .eq("etat", "a_valider")
    .is("tranchee_le", null);

  if (error) return new Response(error.message, { status: 500 });

  let envoyes = 0;
  for (const m of missions ?? []) {
    const asso = (m as any).annonce?.association;
    const { data: referents } = await sb.from("profil")
      .select("id").eq("role", "association").eq("actif", true);
    // L'adresse vit dans auth.users : on passe par la vue exposée côté service role.
    const { data: contacts } = await sb.rpc("emails_referents_association",
      { p_association: (m as any).annonce?.association_id });

    const lienOui = `${SITE}/valider?j=${m.jeton}&r=oui`;
    const lienNon = `${SITE}/valider?j=${m.jeton}&r=non`;
    const html = `
      <p>Bonjour,</p>
      <p>${(m as any).salarie?.nom} (${(m as any).entreprise?.nom}) a déclaré avoir réalisé
      la mission « ${(m as any).annonce?.titre} ».</p>
      <p>Est-ce bien le cas ?</p>
      <p>
        <a href="${lienOui}" style="background:#3B7C21;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">Oui, c'est fait</a>
        &nbsp;&nbsp;
        <a href="${lienNon}" style="color:#5A6B63">Non</a>
      </p>
      <p style="color:#8A9A93;font-size:13px">Sans réponse de votre part sous quatorze jours,
      la mission sera comptée comme réalisée.</p>`;

    for (const c of (contacts ?? []) as { email: string }[]) {
      await envoyerMail(c.email, "Une mission a-t-elle bien été réalisée ?", html);
      envoyes++;
    }
  }
  return Response.json({ missions: missions?.length ?? 0, mails: envoyes });
});
