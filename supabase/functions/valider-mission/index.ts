/* Riseva — le lien de réponse envoyé aux associations.
   ---------------------------------------------------------------------------
   GET  /valider-mission?j=<jeton>  → une page qui demande, et ne décide rien.
   POST /valider-mission            → la réponse est enregistrée.

   Pourquoi cette séparation, et pourquoi elle n'est pas une coquetterie : un
   lien dans un courriel est ouvert par des machines avant de l'être par des
   gens. Les passerelles de sécurité (SafeLinks, Proofpoint), les antivirus de
   messagerie et les aperçus de lien font un GET sur chaque URL qu'ils trouvent.
   Si le GET tranchait, la mission serait validée par un antivirus, la veille du
   jour où le bénévole a ouvert son courriel — et l'entreprise recevrait une
   confirmation que personne n'a donnée. Un GET ne change donc rien : il montre.

   La décision elle-même n'est pas prise ici. Elle est prise par la fonction
   public.trancher_par_jeton, qui vit dans la base avec les mêmes règles que la
   validation depuis l'application : les points tombent à zéro sur un refus, le
   stock de l'annonce est rendu, et un « partiellement » sans chiffre est refusé
   au lieu d'être arrondi vers le haut. Écrire ces règles une deuxième fois ici,
   c'est se garantir qu'elles divergeront.                                    */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const ENTETES = {
  "content-type": "text/html; charset=utf-8",
  /* Rien de ce qui suit n'a besoin d'être indexé, mis en cache par un proxy
     d'entreprise ou rechargé depuis l'historique : la page contient un jeton. */
  "cache-control": "no-store, no-cache, must-revalidate",
  "referrer-policy": "no-referrer",
  "x-robots-tag": "noindex, nofollow, noarchive",
  "x-content-type-options": "nosniff",
  "content-security-policy":
    "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'",
};

const echappe = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
   .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const cadre = (titre: string, corps: string, code = 200) => new Response(
  `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
   <meta name="viewport" content="width=device-width,initial-scale=1">
   <meta name="robots" content="noindex,nofollow"><title>${echappe(titre)} — Riseva</title>
   <style>
     body{font:16px/1.6 system-ui,-apple-system,Segoe UI,sans-serif;color:#16211C;
       background:#F2F0E9;max-width:600px;margin:0 auto;padding:12vh 24px 6vh}
     h1{font-size:25px;letter-spacing:-.02em;margin:0 0 12px}
     p{color:#5A6B63;margin:10px 0}
     form{margin-top:28px;display:flex;flex-direction:column;gap:12px}
     button{font:inherit;font-weight:600;text-align:left;padding:15px 18px;border-radius:12px;
       border:1px solid #D8D5CA;background:#FAF9F5;color:#16211C;cursor:pointer}
     button.oui{background:#1F5C4A;border-color:#1F5C4A;color:#F2F0E9}
     button small{display:block;font-weight:400;opacity:.72;margin-top:2px}
     label{font-size:14px;color:#5A6B63}
     input{font:inherit;padding:11px 13px;border-radius:10px;border:1px solid #D8D5CA;
       background:#FAF9F5;width:100%;box-sizing:border-box}
     .pied{margin-top:34px;font-size:13px;color:#8A8F82;border-top:1px solid #E5E2D9;padding-top:16px}
   </style></head><body><h1>${echappe(titre)}</h1>${corps}
   <p class="pied">Riseva ne compte que ce que vous confirmez. Sans réponse de votre part, la
   mission se clôture seule au bout du délai, les points sont crédités à l'entreprise, mais le
   résultat reste marqué « estimé » partout. Un silence n'est jamais une faute.</p>
   </body></html>`,
  { status: code, headers: ENTETES },
);

const message = (titre: string, texte: string, code = 200) =>
  cadre(titre, `<p>${echappe(texte)}</p>`, code);

Deno.serve(async (req) => {
  const url = new URL(req.url);

  /* ------------------------------------------------------ ce qu'on montre */
  if (req.method === "GET") {
    const jeton = url.searchParams.get("j") ?? "";
    if (jeton.length < 20) return message("Lien incomplet",
      "Ce lien n'est pas exploitable. Recopiez-le entièrement depuis le courriel, "
      + "ou répondez directement à ce courriel : nous nous en occupons.", 400);
    /* On ne dit rien de la mission tant que le jeton n'a pas été présenté : la
       page servirait sinon d'oracle à qui essaie des jetons au hasard. */
    return cadre("Cette mission a-t-elle eu lieu ?", `
      <p>Le salarié a déclaré cette mission comme faite. Votre réponse fait foi :
      c'est elle qui est reprise dans les rapports de l'entreprise.</p>
      <form method="post" action="${echappe(url.pathname)}">
        <input type="hidden" name="j" value="${echappe(jeton)}">
        <button class="oui" name="r" value="oui" type="submit">Réalisée comme prévu
          <small>Le nombre annoncé est retenu tel quel.</small></button>
        <label for="q">Réalisée partiellement — combien exactement ?</label>
        <input id="q" name="q" type="number" min="0" step="1" inputmode="numeric"
          placeholder="par exemple 18">
        <button name="r" value="partiel" type="submit">Réalisée partiellement
          <small>Votre chiffre remplace l'estimation. Sans chiffre, nous ne pouvons pas
          l'enregistrer : « partiellement » sans nombre, c'est un silence de plus.</small></button>
        <button name="r" value="non" type="submit">Non réalisée
          <small>Aucun point n'est attribué et le besoin retourne dans vos annonces.</small></button>
      </form>`);
  }

  if (req.method !== "POST")
    return message("Méthode non autorisée", "Utilisez le lien reçu par courriel.", 405);

  /* ------------------------------------------------------ ce qu'on décide */
  let jeton = "", reponse = "", realise: number | null = null;
  try {
    const f = await req.formData();
    jeton = String(f.get("j") ?? "");
    reponse = String(f.get("r") ?? "");
    const q = String(f.get("q") ?? "").trim();
    realise = q === "" ? null : Number(q);
    if (realise !== null && !Number.isFinite(realise)) realise = null;
  } catch {
    return message("Réponse illisible", "Le formulaire n'a pas pu être lu.", 400);
  }

  const { data, error } = await sb.rpc("trancher_par_jeton", {
    p_jeton: jeton, p_reponse: reponse, p_realise: realise,
  });
  if (error) {
    console.error("trancher_par_jeton", error.message);
    return message("Un incident est survenu",
      "Nous n'avons pas pu enregistrer votre réponse. Réessayez dans un instant, "
      + "ou répondez à ce courriel : quelqu'un s'en occupe à la main.", 500);
  }

  switch (data) {
    case "oui":
      return message("Merci, c'est enregistré",
        "La mission est confirmée et les points sont crédités à l'entreprise.");
    case "partiel":
      return message("Merci, c'est enregistré",
        "Votre chiffre remplace l'estimation : c'est lui qui apparaîtra dans les rapports.");
    case "non":
      return message("C'est noté",
        "La mission est refusée, aucun point n'a été attribué, et le besoin est "
        + "réouvert dans vos annonces.");
    case "chiffre_manquant":
      return message("Il manque le nombre",
        "Vous avez indiqué « réalisée partiellement » sans dire combien. Revenez au "
        + "courriel, saisissez le nombre, puis validez : nous préférons vous le "
        + "redemander plutôt que d'arrondir à votre place.", 400);
    case "deja":
      return message("Déjà traitée",
        "Cette mission a déjà reçu une réponse, ou s'est clôturée entre-temps. "
        + "Merci quand même — il n'y a rien à faire de plus.");
    case "expire":
      return message("Le délai est passé",
        "Ce lien a expiré. La mission s'est clôturée sans confirmation : les points "
        + "sont crédités à l'entreprise, mais le résultat reste marqué « estimé ». "
        + "Si le chiffre compte pour vous, écrivez-nous et nous le corrigerons.");
    case "inconnu":
      return message("Lien inconnu",
        "Cette mission n'existe plus, ou le lien a été recopié incomplet.", 404);
    default:
      return message("Lien invalide", "Ce lien n'est pas exploitable.", 400);
  }
});
