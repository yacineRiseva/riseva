/* Riseva — envoi réel des formulaires publics
   ---------------------------------------------------------------------------
   Un formulaire qui affiche « message envoyé » sans rien envoyer est la pire
   chose qu'on puisse mettre sur un site : la personne a fait sa part, elle
   attend une réponse qui ne viendra jamais, et personne ne s'en aperçoit — ni
   elle, ni nous. Deux chemins, et un seul mensonge possible : aucun.

   1. Si la plateforme est configurée, on écrit dans la base. La table
      `preinscription` accepte l'insertion anonyme, et rien d'autre : personne ne
      peut relire la liste des prospects, c'est le seul droit accordé.
   2. Sinon — développement, ou configuration absente — on ouvre le courriel
      pré-rempli et on le dit. Mieux vaut un envoi manuel assumé qu'un accusé de
      réception inventé.
*/

const CONTACT = "contact@riseva.fr";

function config(){
  return (typeof window !== "undefined" && window.RISEVA_CONFIG) || null;
}

async function versSupabase(table, ligne){
  const c = config();
  if (!c || !c.url || !c.anonKey) return false;
  const r = await fetch(`${c.url}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "apikey": c.anonKey,
      "Authorization": `Bearer ${c.anonKey}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal"
    },
    body: JSON.stringify(ligne)
  });
  if (!r.ok) throw new Error("écriture refusée (" + r.status + ")");
  return true;
}

function courriel(sujet, corps){
  return `mailto:${CONTACT}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`;
}

/* Remplace le formulaire par un état final honnête. */
function conclure(form, { titre, texte, lien }){
  const bloc = document.createElement("div");
  bloc.className = "center";
  bloc.style.padding = "var(--s10) 0";
  bloc.innerHTML =
    `<span class="badge badge--ok" style="height:28px">${titre}</span>
     <p class="muted" style="margin-top:var(--s5);max-width:52ch;margin-inline:auto">${texte}</p>` +
    (lien ? `<a class="btn btn--primary" style="margin-top:var(--s6)" href="${lien}">Ouvrir mon courrier</a>` : "");
  form.replaceWith(bloc);
}

export function brancher(form, { table, sujet, ligne, resume, merci }){
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form).entries());
    const bouton = form.querySelector("[type=submit]");
    if (bouton){ bouton.disabled = true; bouton.textContent = "Envoi..."; }
    try {
      const parti = await versSupabase(table, ligne(d));
      if (parti) return conclure(form, merci(d));
      conclure(form, {
        titre: "Il reste une étape",
        texte: "Le formulaire n'est pas encore relié à notre boîte. Votre message est prêt : "
             + "il ne manque qu'un clic pour l'envoyer depuis votre messagerie. "
             + "Nous répondons à tout le monde.",
        lien: courriel(sujet, resume(d))
      });
    } catch (err){
      conclure(form, {
        titre: "L'envoi a échoué",
        texte: "Nous n'avons pas pu enregistrer votre message (" + err.message + "). "
             + "Votre texte est prêt à partir par courriel, rien n'est perdu.",
        lien: courriel(sujet, resume(d))
      });
    }
  });
}
