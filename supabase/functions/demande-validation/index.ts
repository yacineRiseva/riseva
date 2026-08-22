/* Riseva — les demandes de confirmation envoyées aux associations.
   ---------------------------------------------------------------------------
   À déclencher une fois par jour. Cette fonction n'a aucune règle métier : la
   base a déjà décidé quoi envoyer, à qui, et quand (private.tache_demandes_
   validation enfile dans `envoi`, avec une clé d'idempotence par rappel). Ici on
   ne fait que trois choses : demander à la base de quoi écrire, résoudre
   l'adresse du destinataire, et dire ce qui est parti.

   Le lien envoyé ne décide rien : il ouvre une page qui pose la question. Les
   passerelles de sécurité des messageries d'entreprise ouvrent tous les liens
   qu'elles trouvent — un lien « oui » tranche alors la mission avant que
   quiconque l'ait lue.                                                       */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const SITE = Deno.env.get("SITE_URL") ?? "https://riseva.fr";
const PAR_PASSAGE = 200;

const echappe = (t: string) =>
  String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
           .replace(/"/g, "&quot;");

async function envoyerMail(a: string, sujet: string, html: string): Promise<boolean> {
  const cle = Deno.env.get("RESEND_API_KEY");
  if (!cle) { console.log("[mail simulé]", a, sujet); return true; }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${cle}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "Riseva <bonjour@riseva.fr>", to: a, subject: sujet, html }),
  });
  if (!r.ok) console.error("resend", r.status, await r.text());
  return r.ok;
}

const corps = (d: {
  titre: string; entreprise: string; salarie: string; quantite: number;
  unite: string | null; lien: string; rappel: boolean;
}) => `
  <p>Bonjour,</p>
  ${d.rappel
    ? `<p>Nous vous avions écrit au sujet d'une mission, sans réponse de votre part —
       ce n'est pas un reproche, c'est un rappel.</p>`
    : ""}
  <p><strong>${echappe(d.salarie)}</strong> (${echappe(d.entreprise)}) a déclaré avoir réalisé
  la mission « ${echappe(d.titre)} »${d.unite
    ? `, pour un résultat annoncé de ${d.quantite} ${echappe(d.unite)}` : ""}.</p>
  <p>Une seule question : est-ce bien ce qui s'est passé ?</p>
  <p style="margin:26px 0">
    <a href="${d.lien}" style="background:#1F5C4A;color:#fff;padding:13px 22px;
      border-radius:999px;text-decoration:none;font-weight:600">Répondre en un clic</a>
  </p>
  <p style="color:#5A6B63;font-size:13px">Trois réponses possibles, dont « réalisée
  partiellement » — avec le chiffre réel, qui remplacera l'estimation. Vous n'avez pas de
  compte à créer ni de mot de passe à retrouver.</p>
  <p style="color:#8A9A93;font-size:13px">Sans réponse de votre part, la mission se clôturera
  seule et les points seront crédités à l'entreprise&nbsp;: vous ne bloquez personne. Mais le
  résultat restera marqué « estimé » partout, parce que personne n'aura compté. C'est la seule
  chose que votre réponse change — et c'est la seule qui compte vraiment.</p>`;

Deno.serve(async () => {
  const { data: files, error } = await sb
    .from("envoi")
    .select("id, sujet, destinataire_profil")
    .eq("type", "demande_validation")
    .eq("etat", "a_envoyer")
    .order("date", { ascending: true })
    .limit(PAR_PASSAGE);
  if (error) return new Response(error.message, { status: 500 });

  let envoyes = 0, sansAdresse = 0, echecs = 0;
  for (const f of files ?? []) {
    if (!f.destinataire_profil) {
      await sb.rpc("marquer_envoi", { p_envoi: f.id, p_etat: "sans_destinataire" });
      sansAdresse++;
      continue;
    }
    /* Le jeton n'est émis qu'ici, au moment où le courriel part. Un jeton créé
       d'avance et jamais envoyé est un jeton valide qui traîne pour rien. */
    const { data: prep, error: e1 } = await sb
      .rpc("preparer_demande_validation", { p_envoi: f.id });
    const d = Array.isArray(prep) ? prep[0] : prep;
    if (e1 || !d) {
      /* La mission a été tranchée entre l'enfilage et l'envoi : il n'y a plus de
         question à poser. Ce n'est pas un échec, c'est une bonne nouvelle. */
      await sb.rpc("marquer_envoi", { p_envoi: f.id, p_etat: "sans_destinataire" });
      sansAdresse++;
      continue;
    }

    const { data: compte } = await sb.auth.admin.getUserById(d.destinataire);
    const adresse = compte?.user?.email;
    if (!adresse) {
      await sb.rpc("marquer_envoi", { p_envoi: f.id, p_etat: "sans_destinataire" });
      sansAdresse++;
      continue;
    }

    const lien = `${SITE}/valider-mission?j=${encodeURIComponent(d.jeton)}`;
    const ok = await envoyerMail(adresse, f.sujet, corps({ ...d, lien }));
    await sb.rpc("marquer_envoi", {
      p_envoi: f.id, p_etat: ok ? "envoye" : "echec", p_destinataire: adresse,
    });
    ok ? envoyes++ : echecs++;
  }
  return Response.json({ files: files?.length ?? 0, envoyes, sansAdresse, echecs });
});
