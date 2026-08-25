/* Riseva — tout ce qui doit partir par courriel.
   ---------------------------------------------------------------------------
   Une seule fonction, déclenchée une fois par jour, pour les trois files que la
   base remplit : les demandes de confirmation aux associations, les relances de
   collecte aux sites, et les rapports arrêtés aux administrateurs. Il en
   existait une, pour une seule des trois : les deux autres files se remplissaient
   et ne se vidaient jamais, alors que la page de vente promet « le rappel part
   tout seul » et « les rapports arrivent finis à chaque clôture ». La procédure
   de mise en ligne demandait d'ailleurs de déployer une fonction `rapport` qui
   n'a jamais existé dans le dépôt.

   Cette fonction n'a aucune règle métier : la base a déjà décidé quoi envoyer, à
   qui, et quand — avec une clé d'idempotence par message. Ici on fait trois
   choses : demander de quoi écrire, résoudre l'adresse, et dire ce qui est parti.

   Elle est protégée par un secret partagé. Sans lui, n'importe qui pouvait vider
   la file à la demande : les demandes de confirmation partaient avant l'heure
   vers les associations, et le quota d'envoi du projet y passait.

   Le lien de confirmation ne décide rien : il ouvre une page qui pose la
   question. Les passerelles de sécurité des messageries d'entreprise ouvrent
   tous les liens qu'elles trouvent — un lien « oui » trancherait la mission
   avant que quiconque l'ait lue.                                             */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const SITE = Deno.env.get("SITE_URL") ?? "https://riseva.fr";
/* L'adresse de la page de réponse. Elle était composée sur le site vitrine —
   `${SITE}/valider-mission` — où AUCUNE page de ce nom n'existe et où aucune
   réécriture ne mène : le jeton à usage unique partait en clair dans les
   journaux d'accès du CDN, et l'association recevait un 404. La page vit dans la
   fonction Edge ; c'est là qu'on pointe, sauf si un hébergement a été mis
   devant, auquel cas `VALIDATION_URL` le dit. */
const URL_VALIDATION = Deno.env.get("VALIDATION_URL")
  ?? `${Deno.env.get("SUPABASE_URL")}/functions/v1/valider-mission`;
const PAR_PASSAGE = 200;

/* Comparaison à durée constante. `a === b` sort au premier caractère différent. */
function memeSecret(recu: string | null, attendu: string | undefined): boolean {
  if (!recu || !attendu || recu.length !== attendu.length) return false;
  let diff = 0;
  for (let i = 0; i < recu.length; i++) diff |= recu.charCodeAt(i) ^ attendu.charCodeAt(i);
  return diff === 0;
}

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

const corpsRelance = (d: { sujet: string; detail: string | null }) => `
  <p>Bonjour,</p>
  <p>Les indicateurs de votre site sont attendus : <strong>${echappe(d.detail ?? "")}</strong>.</p>
  <p>Il s'agit de chiffres que vous avez déjà — effectifs, heures travaillées, événements du
  registre — et l'écran ne demande que ce qui manque.</p>
  <p style="margin:26px 0">
    <a href="${SITE}/app/#/collecte" style="background:#1F5C4A;color:#fff;padding:13px 22px;
      border-radius:999px;text-decoration:none;font-weight:600">Ouvrir la collecte</a>
  </p>
  <p style="color:#8A9A93;font-size:13px">Sans réponse à l'échéance, la période se clôt
  <em>sans réponse</em> pour votre site : le chiffre reste absent, il n'est pas remplacé par
  celui d'avant. C'est ce qui rend le rapport défendable, et c'est aussi pourquoi votre
  réponse compte.</p>`;

const corpsRapport = (d: { sujet: string; detail: string | null }) => `
  <p>Bonjour,</p>
  <p><strong>${echappe(d.sujet)}</strong> — la période est arrêtée, le rapport est prêt.</p>
  <p>Vous n'avez rien demandé et rien à consolider : il porte les points retenus, les
  réalisations confirmées par les associations, et la méthode qui a servi à les calculer,
  figée à la date de clôture.</p>
  <p style="margin:26px 0">
    <a href="${SITE}/app/#/rapports" style="background:#1F5C4A;color:#fff;padding:13px 22px;
      border-radius:999px;text-decoration:none;font-weight:600">Ouvrir le rapport</a>
  </p>
  <p style="color:#8A9A93;font-size:13px">Un rapport arrêté ne bouge plus. S'il vous paraît
  incomplet, c'est qu'une mission n'a pas été déclarée à temps : elle comptera dans la
  période suivante.</p>`;

/* Une file, un rédacteur. `demande_validation` est la seule qui demande un jeton
   à usage unique, et donc un aller-retour de plus avec la base. */
async function traiter(f: { id: string; type: string; sujet: string; detail: string | null;
                            destinataire_profil: string | null }) {
  if (!f.destinataire_profil) {
    await sb.rpc("marquer_envoi", { p_envoi: f.id, p_etat: "sans_destinataire" });
    return "sansAdresse";
  }

  let html: string | null = null;
  let profil = f.destinataire_profil;

  if (f.type === "demande_validation") {
    /* Le jeton n'est émis qu'ici, au moment où le courriel part. Un jeton créé
       d'avance et jamais envoyé est un jeton valide qui traîne pour rien. */
    const { data: prep, error: e1 } = await sb
      .rpc("preparer_demande_validation", { p_envoi: f.id });
    const d = Array.isArray(prep) ? prep[0] : prep;
    if (e1 || !d) {
      /* La mission a été tranchée entre l'enfilage et l'envoi : il n'y a plus de
         question à poser. Ce n'est pas un échec, c'est une bonne nouvelle. */
      await sb.rpc("marquer_envoi", { p_envoi: f.id, p_etat: "sans_destinataire" });
      return "sansAdresse";
    }
    profil = d.destinataire;
    html = corps({ ...d, lien: `${URL_VALIDATION}?j=${encodeURIComponent(d.jeton)}` });
  } else if (f.type === "relance") {
    html = corpsRelance(f);
  } else {
    html = corpsRapport(f);
  }

  const { data: compte } = await sb.auth.admin.getUserById(profil);
  const adresse = compte?.user?.email;
  if (!adresse) {
    await sb.rpc("marquer_envoi", { p_envoi: f.id, p_etat: "sans_destinataire" });
    return "sansAdresse";
  }

  const ok = await envoyerMail(adresse, f.sujet, html);
  await sb.rpc("marquer_envoi", {
    p_envoi: f.id, p_etat: ok ? "envoye" : "echec", p_destinataire: adresse,
  });
  return ok ? "envoye" : "echec";
}

Deno.serve(async (req) => {
  if (!memeSecret(req.headers.get("x-riseva-cron"), Deno.env.get("CRON_SECRET")))
    return new Response("non autorisé", { status: 401 });

  const { data: files, error } = await sb
    .from("envoi")
    .select("id, type, sujet, detail, destinataire_profil")
    .in("type", ["demande_validation", "relance", "rapport"])
    .eq("etat", "a_envoyer")
    .order("date", { ascending: true })
    .limit(PAR_PASSAGE);
  if (error) return new Response(error.message, { status: 500 });

  const compte = { envoye: 0, sansAdresse: 0, echec: 0 } as Record<string, number>;
  for (const f of files ?? []) compte[await traiter(f as never)]++;
  return Response.json({ files: files?.length ?? 0, ...compte });
});
