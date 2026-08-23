/* Riseva — le don en argent, par carte, chez HelloAsso.
   ------------------------------------------------------------------------
   Ce que fait cette fonction, et ce qu'elle ne fait pas.

   Elle ouvre une intention de paiement sur l'organisation HelloAsso d'une
   association QUI A AUTORISE RISEVA, puis renvoie le donateur vers la page de
   paiement de HelloAsso. L'argent va de la carte du donateur au compte de
   l'association, directement. Riseva ne le touche à aucun moment : elle n'est
   donc pas un prestataire de services de paiement au sens des articles L. 314-1
   et L. 521-1 du code monétaire et financier, et n'a aucun agrément à obtenir.
   C'est la seule raison pour laquelle ce circuit est tenable sans société
   agréée, et c'est aussi pourquoi rien ici ne doit jamais encaisser.

   Ce qu'elle remplace : le virement avec référence. Le donateur recopiait un
   IBAN et une référence dans son application bancaire, puis l'association
   confirmait à la main avoir reçu l'argent, parfois trois semaines plus tard.
   Trois gestes manuels et deux délais, pour un don de quarante euros.

   Quatre routes, et un secret qui ne sort jamais :

     GET  /helloasso/lier?retour=…      l'association autorise Riseva
     GET  /helloasso/retour?code=&state= HelloAsso nous renvoie le code
     POST /helloasso/don                 un donateur ouvre un paiement
     GET  /helloasso/paiement?intention= HelloAsso renvoie le donateur

   Le `client_secret` et les jetons de rafraîchissement vivent ici et dans le
   schéma privé de Postgres. Aucun des deux n'entre jamais dans une réponse.

   Variables d'environnement attendues :
     HELLOASSO_CLIENT_ID, HELLOASSO_CLIENT_SECRET  (compte partenaire)
     HELLOASSO_API  (défaut : https://api.helloasso.com)
     HELLOASSO_AUTH (défaut : https://auth.helloasso.com)
     SITE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
*/
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const API   = Deno.env.get("HELLOASSO_API")  ?? "https://api.helloasso.com";
const AUTH  = Deno.env.get("HELLOASSO_AUTH") ?? "https://auth.helloasso.com";
const SITE  = Deno.env.get("SITE_URL") ?? "https://riseva.fr";
const ID    = Deno.env.get("HELLOASSO_CLIENT_ID") ?? "";
const SECRET= Deno.env.get("HELLOASSO_CLIENT_SECRET") ?? "";
const MOI   = `${Deno.env.get("SUPABASE_URL")}/functions/v1/helloasso`;

/* ---------------------------------------------------------------- PKCE ---- */
/* Le vérificateur ne voyage jamais par le navigateur : il est posé en base le
   temps de l'aller-retour, et effacé à la lecture. Sans PKCE, un code
   d'autorisation intercepté suffirait à obtenir un jeton. */
const base64url = (o: Uint8Array) =>
  btoa(String.fromCharCode(...o)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const alea = (n: number) => base64url(crypto.getRandomValues(new Uint8Array(n)));

async function defi(verificateur: string) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verificateur));
  return base64url(new Uint8Array(h));
}

/* ---------------------------------------------------------------- jetons -- */
async function jetonPartenaire(corps: Record<string, string>) {
  const r = await fetch(`${API}/oauth2/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: ID, client_secret: SECRET, ...corps })
  });
  if (!r.ok) throw new Error(`HelloAsso a refusé le jeton (${r.status}) ${await r.text()}`);
  return await r.json();
}

/* Un access_token vaut trente minutes, un refresh_token trente jours, et
   HelloAsso en rend un NEUF à chaque rafraîchissement : ne pas réécrire celui
   qu'on vient de recevoir, c'est perdre la liaison au bout d'un mois. */
async function accesPour(association: string) {
  const { data, error } = await sb.rpc("helloasso_lien", { p_association: association });
  if (error) throw new Error(error.message);
  const lien = Array.isArray(data) ? data[0] : data;
  if (!lien) throw new Error("Cette association n'a pas connecté son compte HelloAsso.");
  const j = await jetonPartenaire({ grant_type: "refresh_token", refresh_token: lien.jeton });
  if (j.refresh_token && j.refresh_token !== lien.jeton)
    await sb.rpc("helloasso_rafraichir_jeton",
      { p_association: association, p_jeton: j.refresh_token });
  return { acces: j.access_token as string, slug: lien.slug as string };
}

/* ---------------------------------------------------------------- réponses */
const json = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } });

const versApp = (chemin: string, message?: string) =>
  new Response(null, { status: 302, headers: { location:
    `${SITE}/app/#${chemin}${message ? `?m=${encodeURIComponent(message)}` : ""}` } });

/* Qui appelle : on relit le porteur pour savoir de quel compte il s'agit. La
   fonction tourne avec la clé de service, donc rien ne doit se fier au corps de
   la requête pour décider à qui appartient une association. */
async function appelant(req: Request) {
  const a = req.headers.get("authorization") ?? "";
  const { data } = await sb.auth.getUser(a.replace(/^Bearer /i, ""));
  return data?.user ?? null;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const route = url.pathname.split("/").pop();

  try {
    if (!ID || !SECRET)
      return json({ erreur: "Riseva n'a pas encore de compte partenaire HelloAsso." }, 503);

    /* --- 1. L'association autorise Riseva ------------------------------- */
    if (route === "lier") {
      const u = await appelant(req);
      if (!u) return json({ erreur: "Connexion requise" }, 401);
      const { data: asso } = await sb.rpc("mon_association_de", { p_profil: u.id });
      if (!asso) return json({ erreur: "Réservé à une association" }, 403);

      const verificateur = alea(48);
      const etat = alea(24);
      await sb.rpc("helloasso_ouvrir_autorisation", {
        p_association: asso, p_etat: etat, p_verificateur: verificateur,
        p_retour: url.searchParams.get("retour")
      });
      const q = new URLSearchParams({
        client_id: ID,
        redirect_uri: `${MOI}/retour`,
        code_challenge: await defi(verificateur),
        code_challenge_method: "S256",
        state: etat
      });
      return new Response(null, { status: 302,
        headers: { location: `${AUTH}/authorize?${q}` } });
    }

    /* --- 2. HelloAsso nous renvoie le code ------------------------------ */
    if (route === "retour") {
      const code = url.searchParams.get("code");
      const etat = url.searchParams.get("state");
      if (!code || !etat) return versApp("/dons", "Autorisation interrompue.");

      const { data } = await sb.rpc("helloasso_reprendre_autorisation", { p_etat: etat });
      const ouv = Array.isArray(data) ? data[0] : data;
      /* L'état est à usage unique : un code rejoué ne trouve plus rien. */
      if (!ouv) return versApp("/dons", "Cette autorisation a expiré. Recommencez.");

      const j = await jetonPartenaire({
        grant_type: "authorization_code", code,
        code_verifier: ouv.verificateur, redirect_uri: `${MOI}/retour`
      });

      /* Le slug de l'organisation qui vient d'autoriser : il est dans le jeton
         d'accès, et on ne le devine pas. */
      const r = await fetch(`${API}/v5/users/me/organizations`, {
        headers: { authorization: `Bearer ${j.access_token}` } });
      const orgs = r.ok ? await r.json() : [];
      const slug = Array.isArray(orgs) && orgs.length ? orgs[0].organizationSlug : null;
      if (!slug) return versApp("/dons", "HelloAsso n'a rendu aucune organisation.");

      await sb.rpc("helloasso_enregistrer_lien", {
        p_association: ouv.association, p_slug: slug, p_jeton: j.refresh_token,
        p_privileges: String(j.scope ?? "").split(" ").filter(Boolean)
      });
      return versApp(ouv.retour ?? "/dons", "Compte HelloAsso connecté.");
    }

    /* --- 3. Un donateur ouvre un paiement ------------------------------- */
    if (route === "don" && req.method === "POST") {
      const u = await appelant(req);
      if (!u) return json({ erreur: "Connexion requise" }, 401);
      const { annonce, montant, origine } = await req.json();

      /* L'intention est créée par Postgres, qui contrôle l'annonce, l'origine
         et l'éligibilité. Rien ici ne décide de ce qui est permis. */
      const { data: intention, error } = await sb.rpc("declarer_intention_don_pour", {
        p_annonce: annonce, p_montant: montant, p_origine: origine ?? "salarie",
        p_profil: u.id
      });
      if (error) return json({ erreur: error.message }, 400);

      const { data: infos } = await sb.rpc("helloasso_intention", { p_intention: intention });
      const i = Array.isArray(infos) ? infos[0] : infos;
      if (!i?.slug) return json({ erreur: "Cette association n'a pas connecté HelloAsso." }, 409);

      const { acces } = await accesPour(i.association);
      /* Les montants voyagent en CENTIMES chez HelloAsso. Un euro passé tel quel
         serait un don cent fois trop petit, et personne ne s'en apercevrait
         avant le relevé de l'association. */
      const cents = Math.round(Number(i.montant) * 100);
      const rep = await fetch(`${API}/v5/organizations/${i.slug}/checkout-intents`, {
        method: "POST",
        headers: { authorization: `Bearer ${acces}`, "content-type": "application/json" },
        body: JSON.stringify({
          totalAmount: cents,
          initialAmount: cents,
          itemName: `Don Riseva ${i.reference}`.slice(0, 250),
          backUrl:   `${SITE}/app/#/annonces`,
          errorUrl:  `${MOI}/paiement?intention=${i.id}&etat=erreur`,
          returnUrl: `${MOI}/paiement?intention=${i.id}`,
          containsDonation: true,
          metadata: JSON.stringify({ riseva: i.reference, intention: i.id })
        })
      });
      if (!rep.ok) {
        const t = await rep.text();
        /* 409 : l'organisation ne peut pas encore recevoir de paiement. C'est
           une information pour l'association, pas une panne. */
        return json({ erreur: rep.status === 409
          ? "Le compte HelloAsso de cette association n'est pas encore vérifié."
          : `HelloAsso a refusé l'ouverture du paiement (${rep.status}).`, detail: t }, 502);
      }
      const ci = await rep.json();
      await sb.rpc("helloasso_poser_intent", { p_intention: i.id, p_intent: ci.id });
      return json({ redirection: ci.redirectUrl, reference: i.reference });
    }

    /* --- 4. Le donateur revient ----------------------------------------- */
    if (route === "paiement") {
      const id = url.searchParams.get("intention");
      if (!id) return versApp("/annonces", "Paiement introuvable.");
      const { data: infos } = await sb.rpc("helloasso_intention", { p_intention: id });
      const i = Array.isArray(infos) ? infos[0] : infos;
      if (!i) return versApp("/annonces", "Paiement introuvable.");
      if (url.searchParams.get("etat") === "erreur")
        return versApp("/annonces", "Le paiement n'a pas abouti. Rien n'a été débité.");

      /* On ne croit pas le navigateur sur parole : l'état du paiement se relit
         chez HelloAsso, avec notre jeton. Une redirection est une intention, pas
         une preuve. */
      const { acces } = await accesPour(i.association);
      const r = await fetch(
        `${API}/v5/organizations/${i.slug}/checkout-intents/${i.helloasso_intent}`,
        { headers: { authorization: `Bearer ${acces}` } });
      if (!r.ok) return versApp("/annonces", "HelloAsso n'a pas répondu. Réessayez dans un instant.");
      const ci = await r.json();
      const paye = (ci.order?.payments ?? []).some((p: any) =>
        ["Authorized", "Registered"].includes(p.state));
      if (!paye) return versApp("/annonces", "Le paiement n'est pas encore confirmé.");

      /* `confirmer_don` est idempotente : un retour rejoué ne crée pas un
         deuxième don, il ressort le premier. */
      const { error } = await sb.rpc("confirmer_don", {
        p_fournisseur: "helloasso", p_reference: String(i.helloasso_intent),
        p_annonce: i.annonce, p_montant: i.montant, p_origine: i.origine,
        p_salarie: i.salarie
      });
      if (error) return versApp("/annonces", error.message);
      return versApp("/activite", "Merci, votre don est enregistré.");
    }

    return json({ erreur: "Route inconnue" }, 404);
  } catch (e) {
    return json({ erreur: String((e as Error).message ?? e) }, 500);
  }
});
