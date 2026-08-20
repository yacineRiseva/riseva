/* Riseva — gabarits des emails transactionnels.
   Une seule mise en page, huit messages. Le ton suit la même règle que le reste du produit :
   phrases courtes, pas de vocabulaire marketing, on dit ce qui s'est passé et ce qu'on attend. */

const COULEURS = {
  encre:   "#131510",
  papier:  "#F2F0E9",
  carte:   "#FAF9F5",
  foret:   "#0B2620",
  foret7:  "#1F5C4A",
  lime:    "#C9F24B",
  mousse:  "#DFE6D0",
  gris:    "#63675C",
  filet:   "#E5E2D9"
};

export type Destinataire = { email: string; nom?: string };
export type Message = { sujet: string; html: string; texte: string };

const echappe = (s: string) =>
  String(s ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]!));

/* Mise en page commune. Tableaux et styles en ligne : c'est la seule chose qui tienne
   dans Outlook comme dans Gmail. */
function mise_en_page(opts: {
  titre: string; corps: string; bouton?: { texte: string; url: string };
  pied?: string; preheader?: string;
}): string {
  const { titre, corps, bouton, pied, preheader } = opts;
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${echappe(titre)}</title></head>
<body style="margin:0;padding:0;background:${COULEURS.papier};">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${echappe(preheader)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COULEURS.papier};padding:32px 16px">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">

    <tr><td style="padding-bottom:24px">
      <span style="font:600 18px/1 -apple-system,Segoe UI,Inter,sans-serif;letter-spacing:.14em;
        text-transform:uppercase;color:${COULEURS.foret7}">Riseva</span>
    </td></tr>

    <tr><td style="background:${COULEURS.carte};border:1px solid ${COULEURS.filet};
      border-radius:12px;padding:32px">
      <h1 style="margin:0 0 16px;font:600 22px/1.25 -apple-system,Segoe UI,Inter,sans-serif;
        letter-spacing:-.02em;color:${COULEURS.encre}">${echappe(titre)}</h1>
      <div style="font:400 15px/1.6 -apple-system,Segoe UI,Inter,sans-serif;color:${COULEURS.gris}">
        ${corps}
      </div>
      ${bouton ? `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px">
        <tr><td style="background:${COULEURS.encre};border-radius:12px">
          <a href="${bouton.url}" style="display:inline-block;padding:13px 24px;
            font:600 15px/1 -apple-system,Segoe UI,Inter,sans-serif;color:${COULEURS.papier};
            text-decoration:none">${echappe(bouton.texte)}</a>
        </td></tr>
      </table>` : ""}
    </td></tr>

    <tr><td style="padding-top:24px;font:400 13px/1.6 -apple-system,Segoe UI,Inter,sans-serif;
      color:#8A8F82">
      ${pied ? pied + "<br><br>" : ""}
      Riseva · <a href="https://riseva.fr" style="color:#8A8F82">riseva.fr</a><br>
      Vous recevez ce message parce que votre organisation utilise Riseva.
    </td></tr>

  </table>
</td></tr></table>
</body></html>`;
}

const enTexte = (html: string) =>
  html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, "").replace(/\n{3,}/g, "\n\n").trim();

const message = (sujet: string, o: Parameters<typeof mise_en_page>[0]): Message => {
  const html = mise_en_page(o);
  return { sujet, html, texte: enTexte(o.corps) + (o.bouton ? `\n\n${o.bouton.texte} : ${o.bouton.url}` : "") };
};

const SITE = "https://riseva.fr";

/* ------------------------------------------------------------------ */
/* 1. Entreprise : compte créé, voici le lien à diffuser               */
/* ------------------------------------------------------------------ */
export const bienvenueEntreprise = (p: {
  prenom: string; entreprise: string; lien: string; places: number;
}) => message(
  `${p.entreprise} est inscrite pour la saison`, {
  titre: "Votre espace est prêt",
  preheader: `Le lien à diffuser à vos ${p.places} salariés est dans ce message.`,
  corps: `<p>Bonjour ${echappe(p.prenom)},</p>
    <p>L'espace de ${echappe(p.entreprise)} est ouvert. Votre abonnement comprend
    <strong style="color:${COULEURS.encre}">${p.places} places</strong>.</p>
    <p>Vous n'avez aucune liste à saisir. Diffusez ce lien en interne, chacun crée son compte
    en trente secondes :</p>
    <p style="background:${COULEURS.mousse};border-radius:8px;padding:14px 16px;
      font-family:ui-monospace,Menlo,monospace;font-size:14px;color:${COULEURS.foret};
      word-break:break-all">${echappe(p.lien)}</p>
    <p>Vous pouvez le couper ou le régénérer à tout moment depuis votre espace, sans toucher
    aux comptes déjà créés.</p>`,
  bouton: { texte: "Ouvrir mon espace", url: `${SITE}/app/` }
});

/* ------------------------------------------------------------------ */
/* 2. Salarié : compte créé                                            */
/* ------------------------------------------------------------------ */
export const bienvenueSalarie = (p: { prenom: string; entreprise: string; lienConnexion: string }) =>
  message(`Bienvenue sur Riseva`, {
  titre: `Vous voilà dans l'équipe`,
  preheader: "Votre lien de connexion est à l'intérieur.",
  corps: `<p>Bonjour ${echappe(p.prenom)},</p>
    <p>Votre compte est créé et rattaché à ${echappe(p.entreprise)}. Les associations
    partenaires publient régulièrement des besoins : une demi-journée de bénévolat, du matériel,
    un don. Vous répondez à ce qui vous parle, quand vous voulez.</p>
    <p>Ce lien vous connecte sans mot de passe. Il est valable une heure.</p>`,
  bouton: { texte: "Voir les annonces", url: p.lienConnexion }
});

/* ------------------------------------------------------------------ */
/* 3. Connexion sans mot de passe                                      */
/* ------------------------------------------------------------------ */
export const lienConnexion = (p: { lien: string }) =>
  message("Votre lien de connexion Riseva", {
  titre: "Votre lien de connexion",
  preheader: "Valable une heure, utilisable une seule fois.",
  corps: `<p>Cliquez pour entrer dans votre espace. Le lien est valable une heure et ne
    fonctionne qu'une fois.</p>
    <p>Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : rien ne se passera.</p>`,
  bouton: { texte: "Me connecter", url: p.lien }
});

/* ------------------------------------------------------------------ */
/* 4. Association : une mission a-t-elle été faite ?                   */
/* ------------------------------------------------------------------ */
export const demandeValidation = (p: {
  association: string; salarie: string; entreprise: string; mission: string;
  date: string; oui: string; non: string;
}) => message(`${p.mission} : c'est bien fait ?`, {
  titre: "Une mission attend votre confirmation",
  preheader: `${p.salarie} (${p.entreprise}) a déclaré avoir réalisé la mission.`,
  corps: `<p>Bonjour,</p>
    <p><strong style="color:${COULEURS.encre}">${echappe(p.salarie)}</strong>, de
    ${echappe(p.entreprise)}, a déclaré avoir réalisé « ${echappe(p.mission)} »
    le ${echappe(p.date)}.</p>
    <p>Un clic suffit. Les points ne sont crédités qu'après votre réponse.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px">
      <tr>
        <td style="background:${COULEURS.foret7};border-radius:12px">
          <a href="${p.oui}" style="display:inline-block;padding:13px 24px;
            font:600 15px/1 -apple-system,Segoe UI,Inter,sans-serif;color:${COULEURS.papier};
            text-decoration:none">Oui, c'est fait</a></td>
        <td style="width:12px"></td>
        <td><a href="${p.non}" style="display:inline-block;padding:13px 8px;
          font:400 15px/1 -apple-system,Segoe UI,Inter,sans-serif;color:${COULEURS.gris}">
          Non, ça n'a pas eu lieu</a></td>
      </tr>
    </table>`,
  pied: "Sans réponse de votre part sous quatorze jours, la mission sera comptée comme réalisée."
});

/* ------------------------------------------------------------------ */
/* 5. Salarié : mission confirmée                                      */
/* ------------------------------------------------------------------ */
export const missionValidee = (p: {
  prenom: string; mission: string; association: string; points: number; total: number;
}) => message(`${p.association} a confirmé votre mission`, {
  titre: `+${p.points} points`,
  preheader: `${echappe(p.association)} a confirmé « ${echappe(p.mission)} ».`,
  corps: `<p>Bonjour ${echappe(p.prenom)},</p>
    <p>${echappe(p.association)} vient de confirmer « ${echappe(p.mission)} ».
    Votre entreprise gagne <strong style="color:${COULEURS.encre}">${p.points} points</strong>,
    ce qui porte son total à ${p.total.toLocaleString("fr-FR")}.</p>
    <p>Merci d'y être allé.</p>`,
  bouton: { texte: "Voir le classement", url: `${SITE}/app/#/classement` }
});

/* ------------------------------------------------------------------ */
/* 6. Association : une nouvelle annonce a trouvé preneur              */
/* ------------------------------------------------------------------ */
export const missionEngagee = (p: {
  association: string; salarie: string; entreprise: string; mission: string; date: string;
}) => message(`Quelqu'un vient pour « ${p.mission} »`, {
  titre: "Une entreprise s'est engagée",
  preheader: `${p.salarie} (${p.entreprise}) sera là le ${p.date}.`,
  corps: `<p>Bonjour,</p>
    <p><strong style="color:${COULEURS.encre}">${echappe(p.salarie)}</strong>, de
    ${echappe(p.entreprise)}, s'est positionné sur « ${echappe(p.mission)} »
    pour le ${echappe(p.date)}.</p>
    <p>Vous n'avez rien à faire d'ici là. Nous vous écrirons après la date pour vous demander
    si la mission a bien eu lieu.</p>`,
  bouton: { texte: "Voir mes annonces", url: `${SITE}/app/#/mesannonces` }
});

/* ------------------------------------------------------------------ */
/* 7. Entreprise : le rapport du trimestre                             */
/* ------------------------------------------------------------------ */
export const rapportTrimestriel = (p: {
  entreprise: string; trimestre: string; points: number; rang: number; total: number;
  demiJournees: number; url: string;
}) => message(`Le ${p.trimestre} de ${p.entreprise}`, {
  titre: `${p.trimestre} : ${p.points.toLocaleString("fr-FR")} points`,
  preheader: `${p.rang}e sur ${p.total} entreprises ce trimestre.`,
  corps: `<p>Bonjour,</p>
    <p>Voici ce que ${echappe(p.entreprise)} a fait ce trimestre.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="margin:20px 0;border-top:1px solid ${COULEURS.filet}">
      <tr><td style="padding:12px 0;border-bottom:1px solid ${COULEURS.filet}">Points</td>
        <td align="right" style="padding:12px 0;border-bottom:1px solid ${COULEURS.filet};
          color:${COULEURS.encre};font-weight:600">${p.points.toLocaleString("fr-FR")}</td></tr>
      <tr><td style="padding:12px 0;border-bottom:1px solid ${COULEURS.filet}">Rang</td>
        <td align="right" style="padding:12px 0;border-bottom:1px solid ${COULEURS.filet};
          color:${COULEURS.encre};font-weight:600">${p.rang} sur ${p.total}</td></tr>
      <tr><td style="padding:12px 0;border-bottom:1px solid ${COULEURS.filet}">Demi-journées de bénévolat</td>
        <td align="right" style="padding:12px 0;border-bottom:1px solid ${COULEURS.filet};
          color:${COULEURS.encre};font-weight:600">${p.demiJournees}</td></tr>
    </table>
    <p>Les affiches du trimestre partent par courrier cette semaine.</p>`,
  bouton: { texte: "Ouvrir le rapport", url: p.url }
});

/* ------------------------------------------------------------------ */
/* 8. Donateur : reçu fiscal                                           */
/* ------------------------------------------------------------------ */
export const recuFiscal = (p: {
  prenom: string; association: string; montant: number; numero: string; url: string;
}) => message(`Votre reçu fiscal — ${p.association}`, {
  titre: "Votre reçu fiscal",
  preheader: `Don de ${p.montant} € à ${p.association}.`,
  corps: `<p>Bonjour ${echappe(p.prenom)},</p>
    <p>Votre don de <strong style="color:${COULEURS.encre}">${p.montant} €</strong> à
    ${echappe(p.association)} est bien arrivé. Le reçu fiscal est joint, sous le numéro
    ${echappe(p.numero)}.</p>
    <p>Il est émis au nom de l'association, qui a perçu la somme directement. Riseva n'a
    jamais détenu ces fonds.</p>`,
  bouton: { texte: "Télécharger le reçu", url: p.url },
  pied: "Ce reçu ouvre droit à réduction d'impôt selon la législation en vigueur."
});

/* ------------------------------------------------------------------ */
/* 9. Entreprise : votre place est réservée (préinscription)           */
/* ------------------------------------------------------------------ */
export const preinscriptionRecue = (p: { prenom: string; entreprise: string }) =>
  message(`La place de ${p.entreprise} est réservée`, {
  titre: "C'est noté",
  preheader: "Aucun engagement, aucune carte bancaire.",
  corps: `<p>Bonjour ${echappe(p.prenom)},</p>
    <p>La place de ${echappe(p.entreprise)} est réservée pour la première saison. Rien ne vous
    est demandé d'ici là : ni engagement, ni paiement.</p>
    <p>Nous revenons vers vous sous quarante-huit heures avec une date d'ouverture et le détail
    de ce qui sera mis en place chez vous.</p>`
});

/* ------------------------------------------------------------------ */
/* 10. Association : votre fiche est validée                           */
/* ------------------------------------------------------------------ */
export const associationValidee = (p: { association: string; url: string }) =>
  message(`${p.association} est en ligne`, {
  titre: "Votre fiche est validée",
  preheader: "Vous pouvez publier vos premiers besoins.",
  corps: `<p>Bonjour,</p>
    <p>La fiche de ${echappe(p.association)} est vérifiée et visible par les entreprises
    de la saison. Vous pouvez publier vos premiers besoins.</p>
    <p>Rappel : c'est gratuit, ça le restera, et nous ne prélevons rien sur vos dons.</p>`,
  bouton: { texte: "Publier une annonce", url: p.url }
});

/* ------------------------------------------------------------------ */
/* 11. Entreprise : le quota de places se remplit                      */
/* ------------------------------------------------------------------ */
export const quotaPresqueAtteint = (p: {
  entreprise: string; restantes: number; total: number; url: string;
}) => message(`Il reste ${p.restantes} places chez ${p.entreprise}`, {
  titre: "Votre équipe approche de sa limite",
  preheader: `${p.restantes} places libres sur ${p.total}.`,
  corps: `<p>Bonjour,</p>
    <p>Il reste <strong style="color:${COULEURS.encre}">${p.restantes} places</strong> sur les
    ${p.total} de votre abonnement. Au-delà, le lien d'inscription refusera les nouveaux comptes.</p>
    <p>Deux façons de faire de la place : retirer les salariés partis, ce qui libère leur place
    immédiatement, ou ajouter des places au prorata de la saison restante.</p>`,
  bouton: { texte: "Gérer l'équipe", url: p.url }
});

/* ------------------------------------------------------------------ */
/* 12. Salarié : une mission n'a pas été retenue                       */
/* ------------------------------------------------------------------ */
export const missionRefusee = (p: {
  prenom: string; mission: string; association: string; motif?: string;
}) => message(`Un point à vérifier sur « ${p.mission} »`, {
  titre: "Cette mission n'a pas été retenue",
  preheader: `${p.association} a indiqué que la mission n'a pas eu lieu comme prévu.`,
  corps: `<p>Bonjour ${echappe(p.prenom)},</p>
    <p>${echappe(p.association)} a indiqué que « ${echappe(p.mission)} » n'a pas eu lieu comme
    prévu. Aucun point n'a été crédité.</p>
    ${p.motif ? `<p style="background:${COULEURS.mousse};border-radius:8px;padding:12px 16px">
      « ${echappe(p.motif)} »</p>` : ""}
    <p>Si c'est une erreur, répondez à ce message : nous demandons sa version à l'association
    et nous tranchons par écrit sous quinze jours.</p>`
});

/* ------------------------------------------------------------------ */
/* 13. Entreprise : le récapitulatif du lundi                          */
/* ------------------------------------------------------------------ */
/* Un seul mail par semaine plutôt qu'une alerte par événement : c'est ce qui évite
   que les équipes filtrent Riseva au bout de trois semaines. */
export const recapHebdo = (p: {
  entreprise: string; points: number; gagnes: number; rang: number; categorie: string;
  nouvelles: number; aFaire: number; url: string;
}) => message(`Votre semaine sur Riseva`, {
  titre: `+${p.gagnes} points cette semaine`,
  preheader: `${p.rang}e de votre catégorie, ${p.nouvelles} nouvelles annonces.`,
  corps: `<p>Bonjour,</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="margin:8px 0 20px;border-top:1px solid ${COULEURS.filet}">
      <tr><td style="padding:12px 0;border-bottom:1px solid ${COULEURS.filet}">Points de la semaine</td>
        <td align="right" style="padding:12px 0;border-bottom:1px solid ${COULEURS.filet};
          color:${COULEURS.encre};font-weight:600">+${p.gagnes}</td></tr>
      <tr><td style="padding:12px 0;border-bottom:1px solid ${COULEURS.filet}">Total</td>
        <td align="right" style="padding:12px 0;border-bottom:1px solid ${COULEURS.filet};
          color:${COULEURS.encre};font-weight:600">${p.points.toLocaleString("fr-FR")}</td></tr>
      <tr><td style="padding:12px 0;border-bottom:1px solid ${COULEURS.filet}">Rang, ${echappe(p.categorie)}</td>
        <td align="right" style="padding:12px 0;border-bottom:1px solid ${COULEURS.filet};
          color:${COULEURS.encre};font-weight:600">${p.rang}</td></tr>
    </table>
    <p>${p.nouvelles} nouvelle${p.nouvelles > 1 ? "s" : ""} annonce${p.nouvelles > 1 ? "s" : ""}
    depuis lundi dernier${p.aFaire ? `, et ${p.aFaire} chose${p.aFaire > 1 ? "s" : ""} qui
    attend${p.aFaire > 1 ? "ent" : ""} de votre côté` : ""}.</p>`,
  bouton: { texte: "Ouvrir mon espace", url: p.url },
  pied: "Vous pouvez couper ce récapitulatif dans vos préférences, sans perdre les notifications."
});

/* ------------------------------------------------------------------ */
/* 14. Entreprise : le trophée du trimestre                            */
/* ------------------------------------------------------------------ */
export const tropheeTrimestre = (p: {
  entreprise: string; trimestre: string; rang: number; categorie: string; url: string;
}) => message(`${p.entreprise} entre dans le top 10 % du ${p.trimestre}`, {
  titre: "Un trophée pour votre équipe",
  preheader: `${p.rang}e de la catégorie ${p.categorie} ce trimestre.`,
  corps: `<p>Bonjour,</p>
    <p>${echappe(p.entreprise)} figure dans les 10 % les plus actifs de sa catégorie
    (${echappe(p.categorie)}) sur le ${echappe(p.trimestre)}, à la ${p.rang}<sup>e</sup> place.</p>
    <p>Le trophée et les affiches partent par courrier cette semaine. Dites-nous si l'adresse
    de livraison a changé.</p>
    <p>Le détail du calcul est dans votre espace, et le règlement complet est public : vous
    pouvez refaire l'addition.</p>`,
  bouton: { texte: "Voir le classement", url: p.url }
});

/* ------------------------------------------------------------------ */
/* 15. Entreprise : la saison se termine                               */
/* ------------------------------------------------------------------ */
export const finDeSaison = (p: {
  entreprise: string; saison: string; jours: number; url: string;
}) => message(`Votre saison Riseva se termine dans ${p.jours} jours`, {
  titre: "La saison se termine bientôt",
  preheader: "Pas de reconduction tacite : rien ne se passe si vous ne faites rien.",
  corps: `<p>Bonjour,</p>
    <p>La ${echappe(p.saison)} de ${echappe(p.entreprise)} se termine dans ${p.jours} jours.
    Le rapport annuel sera généré automatiquement à la clôture.</p>
    <p><strong style="color:${COULEURS.encre}">Il n'y a pas de reconduction tacite.</strong>
    Si vous ne faites rien, l'abonnement s'arrête et vous gardez l'accès à vos données pendant
    trente jours, le temps de tout exporter. Rien à résilier, rien à surveiller.</p>
    <p>Si vous voulez repartir pour une saison, dites-le nous et nous préparons le devis.</p>`,
  bouton: { texte: "Décider maintenant", url: p.url }
});

export const TOUS = {
  bienvenueEntreprise, bienvenueSalarie, lienConnexion, demandeValidation,
  missionValidee, missionEngagee, missionRefusee, rapportTrimestriel, recuFiscal,
  preinscriptionRecue, associationValidee, quotaPresqueAtteint, recapHebdo,
  tropheeTrimestre, finDeSaison
};
