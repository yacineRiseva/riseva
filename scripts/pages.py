#!/usr/bin/env python3
"""Génère les pages statiques de contenu (règlement, sécurité, confidentialité,
engagements, charte associations) à partir d'une mise en page commune.

Ces pages font partie du dossier qu'un acheteur demande avant de signer. Elles sont
écrites ici plutôt qu'à la main pour rester cohérentes entre elles.
"""
import pathlib, re

# Le bareme du reglement se LIT dans `public/app/data.js`. Il y etait recopie a
# la main, et il avait divergé : le reglement — le document contractuel, celui
# vers lequel la page de vente renvoie avant la signature — n'annoncait que
# trois formats quand le produit en compte sept. Un acheteur qui suit le lien y
# trouvait quatre formats absents.
def lire_bareme():
    src = (pathlib.Path(__file__).resolve().parent.parent
           / "public" / "app" / "data.js").read_text(encoding="utf-8")
    bloc = src[src.index("export const BAREME = {"):src.index("/* Les trois questions")]
    formats = []
    for m in re.finditer(
        r'(\w+):\s*\{\s*label:\s*"([^"]+)",\s*unite:\s*"([^"]+)",\s*\n?\s*points:\s*(\d+)',
        bloc):
        formats.append({"cle": m.group(1), "label": m.group(2),
                        "unite": m.group(3), "points": int(m.group(4))})
    if len(formats) < 5:
        raise SystemExit("pages.py : bareme illisible dans data.js")
    return formats

BAREME = lire_bareme()

RACINE = pathlib.Path(__file__).resolve().parent.parent / "public"

GABARIT = """<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Riseva, {titre}</title>
<meta name="description" content="{description}">
<link rel="icon" href="/brand/riseva-mark.png">
<link rel="stylesheet" href="/styles/polices.css">
<link rel="stylesheet" href="/styles/tokens.css">
<link rel="stylesheet" href="/styles/base.css">
<link rel="stylesheet" href="/styles/components.css">
<link rel="stylesheet" href="/styles/marketing.css">
<link rel="stylesheet" href="/styles/doc.css">
</head>
<body>
<header class="nav"><div class="wrap nav__in">
  <a href="/" class="logo"><img src="/brand/riseva-full.png" alt="Riseva"></a>
  <nav class="nav__links">
    <a href="/reglement.html">Règlement</a>
    <a href="/securite.html">Sécurité</a>
    <a href="/confidentialite.html">Données</a>
    <a href="/engagements.html">Engagements</a>
  </nav>
  <a class="btn btn--primary btn--sm" href="/inscription.html">Préinscription</a>
</div></header>

<main class="doc">
  <div class="wrap doc__grid">
    <aside class="doc__nav"><div class="doc__navIn">
      <p class="eyebrow">Le dossier</p>
      <ul class="stack" style="--gap:var(--s2);margin-top:var(--s4)">
        <li><a href="/reglement.html">Règlement de la saison</a></li>
        <li><a href="/charte-associations.html">Charte des associations</a></li>
        <li><a href="/securite.html">Sécurité</a></li>
        <li><a href="/confidentialite.html">Données personnelles</a></li>
        <li><a href="/engagements.html">Engagements de service</a></li>
        <li><a href="/cgv.html">Conditions de vente</a></li>
        <li><a href="/moderation.html">Modération des annonces</a></li>
        <li><a href="/mentions.html">Mentions légales</a></li>
      </ul>
      <hr class="sep">
      <p class="hint">Une question précise avant de signer ?<br>
        <a href="mailto:contact@riseva.fr" style="color:var(--forest-800)">contact@riseva.fr</a></p>
    </div></aside>

    <article class="doc__corps">
      <p class="eyebrow">{surtitre}</p>
      <h1 style="margin-top:var(--s4)">{titre}</h1>
      <p class="lede" style="margin-top:var(--s5)">{chapo}</p>
      <p class="doc__maj">Version du {maj}</p>
      {corps}
    </article>
  </div>
</main>

<footer class="foot"><div class="wrap">
  <div class="between">
    <a href="/" class="logo"><img src="/brand/riseva-full.png" alt="Riseva" style="height:20px"></a>
    <span style="font-size:var(--t-xs);color:var(--ink-400)">© 2026 Riseva, contact@riseva.fr</span>
  </div>
</div></footer>
</body>
</html>
"""

MAJ = "20 août 2026"

def ecrire(fichier, **kw):
    kw.setdefault("maj", MAJ)
    (RACINE / fichier).write_text(GABARIT.format(**kw), encoding="utf-8")
    print("écrit", fichier)

# ---------------------------------------------------------------- règlement
ecrire("reglement.html",
  surtitre="Le contrat moral",
  titre="Règlement de la saison",
  description="Comment les points sont attribués, comment le classement est calculé, et comment un litige se règle. Tout est public et recalculable.",
  chapo="Un classement qu'on ne peut pas recalculer soi-même n'est pas un classement, c'est une "
        "affirmation. Voici la règle complète, avec les chiffres et un exemple qui se vérifie à la main.",
  corps="""
<h2>1. Le barème</h2>
<p>Il est fixé par Riseva, identique pour toutes les associations et toutes les entreprises d'une
même saison. Une association choisit le format et la quantité de son annonce, jamais la valeur
en points.</p>
<table>
  <thead><tr><th>Format</th><th>Unité</th><th>Points</th></tr></thead>
  <tbody>
""" + "".join(
    f"    <tr><td>{b['label']}</td><td>par {b['unite']}</td>"
    f"<td>{b['points']} point{'s' if b['points'] > 1 else ''}</td></tr>\n"
    for b in BAREME) + """  </tbody>
</table>
<p>Le barème est versionné par saison. Une modification ne s'applique jamais en cours de saison :
elle fausserait un classement déjà commencé. Elle est annoncée au moins un mois avant l'ouverture
de la saison suivante.</p>

<h2>2. Quand les points sont crédités</h2>
<ul>
  <li>Un salarié se positionne sur une annonce : la mission passe en <strong>engagée</strong>,
      aucun point n'est crédité.</li>
  <li>Après réalisation, il la déclare faite : elle passe <strong>à valider</strong>.</li>
  <li>L'association confirme : la mission est <strong>validée</strong> et les points sont crédités
      à l'entreprise.</li>
  <li>Sans réponse de l'association sous <strong>quatorze jours</strong>, la mission est
      <strong>clôturée automatiquement sans confirmation</strong>. Les points sont crédités à
      l'entreprise selon le barème, mais le résultat reste <strong>estimé</strong> et il est
      identifié comme <strong>non confirmé</strong> partout où il apparaît. Riseva n'écrit jamais
      qu'une mission a été confirmée quand personne ne l'a confirmée.</li>
  <li>Si l'association refuse, aucun point n'est crédité, elle doit motiver son refus, et le besoin
      redevient disponible sur l'annonce.</li>
</ul>

<h2>3. Le plafond par format</h2>
<p><strong>Aucun format ne peut représenter plus de 50 % des points d'une entreprise sur la
saison.</strong> Les points au-delà sont écrêtés : ils apparaissent dans ce que l'entreprise a fait,
mais pas dans son rang.</p>
<div class="encadre">
  <p>Cette règle existe pour une raison simple : sans elle, il suffirait de virer de l'argent pour
  prendre la première place. Le classement mesurerait alors un budget, pas un engagement.</p>
</div>

<h2>4. Le classement</h2>
<p>Le classement de référence est <strong>normalisé</strong> : points retenus divisés par l'effectif
déclaré, et lu <strong>par catégorie de taille</strong>. Comparer une entreprise de quarante
personnes à un groupe de quatre mille n'a aucun sens.</p>
<table>
  <thead><tr><th>Catégorie</th><th>Effectif</th></tr></thead>
  <tbody>
    <tr><td>TPE</td><td>moins de 50 salariés</td></tr>
    <tr><td>PME</td><td>50 à 199 salariés</td></tr>
    <tr><td>ETI</td><td>200 à 499 salariés</td></tr>
    <tr><td>Grande entreprise</td><td>500 salariés et plus</td></tr>
  </tbody>
</table>
<p>Le total brut reste consultable comme lecture secondaire. Il n'est jamais le classement officiel.
Le calcul est refait chaque lundi matin.</p>

<h3>Un exemple qui se vérifie à la main</h3>
<div class="calcul">
  <div class="calcul__ligne"><span>Entreprise de 210 salariés</span><span></span></div>
  <div class="calcul__ligne"><span>Bénévolat : 84 demi-journées x 150</span><span>12 600 pts</span></div>
  <div class="calcul__ligne"><span>Don financier : 7 800 € / 10 x 1</span><span>780 pts</span></div>
  <div class="calcul__ligne"><span>Total brut</span><span>13 380 pts</span></div>
  <div class="calcul__ligne"><span>Plafond par format : 50 % de 13 380</span><span>6 690 pts</span></div>
  <div class="calcul__ligne"><span>Bénévolat écrêté à 6 690, don retenu en entier</span><span>- 5 910 pts</span></div>
  <div class="calcul__ligne calcul__ligne--total"><span>Points retenus</span><span>7 470 pts</span></div>
  <div class="calcul__ligne calcul__ligne--total"><span>Score : 7 470 / 210</span><span>35,6 pts / salarié</span></div>
</div>
<p>Chaque entreprise peut télécharger le détail de ses missions au format CSV et refaire ce calcul.
Si les deux ne concordent pas, écrivez-nous : c'est nous qui avons tort.</p>

<h2 id="mesure">5. Ce que les associations confirment</h2>

<p>Une annonce peut annoncer un objectif : quatre cents arbres, trois cents colis, mille repas.
Quand la mission est faite, le salarié la déclare, et <strong>l'association tranche</strong> : elle
confirme, elle corrige le chiffre, ou elle refuse. C'est elle qui était sur place, c'est son chiffre
qui compte.</p>

<p>Si elle ne répond pas sous quatorze jours, la mission est validée d'office pour ne pas bloquer
l'entreprise. Mais dans ce cas <strong>personne n'a compté</strong> : l'entreprise marque ses points,
et le résultat reste une estimation, déduite de l'objectif annoncé.</p>

<div class="encadre">
  <p><strong>Deux chiffres, jamais additionnés.</strong></p>
  <p><strong>Résultats confirmés</strong>, déclarés par l'association après la mission. Ce sont les
  chiffres affichés en grand, et les seuls qui partent dans un rapport comme des résultats.</p>
  <p><strong>Résultats estimés</strong>, calculés à partir de l'objectif de l'annonce, faute de
  réponse. Ils sont affichés à part, dans un bloc distinct, et jamais ajoutés aux précédents.</p>
</div>

<p>Riseva additionne, elle n'audite pas. Nous ne nous rendons pas sur place et nous ne recomptons pas
les arbres : nous garantissons que le chiffre affiché est bien celui que l'association a saisi, à la
date où elle l'a saisi, et qu'un silence n'est jamais présenté comme une confirmation.</p>

<h2>6. Ce que le score n'est pas</h2>
<p>Le score mesure un <strong>engagement</strong> : du temps donné, du matériel donné, de l'argent
donné. Ce n'est pas une mesure d'impact environnemental ou social, et Riseva ne le présentera jamais
comme telle, ni dans l'interface, ni dans les rapports, ni en rendez-vous commercial.</p>
<p><strong>Ce n'est pas non plus une assiette fiscale, et les deux ne se convertissent pas.</strong>
Un point est un point ; un euro déductible est un euro que quelqu'un a constaté. Une mission close
sans confirmation de l'association crédite ses points, l'équipe y était, mais n'entre
<strong>pas</strong> dans l'assiette de l'article 238 bis, parce que personne n'a attesté qu'elle
avait eu lieu. Il n'existe donc aucun taux de conversion entre votre rang au classement et votre
réduction d'impôt, et personne chez Riseva n'en promettra un. L'écran Mécénat affiche à part, en
euros et avec le nom des associations à relancer, la valeur qui attend une confirmation : c'est le
seul endroit où les deux mondes se regardent, et ils s'y regardent sans se toucher.</p>

<h2>7. Litiges</h2>
<ul>
  <li><strong>Contestation d'un refus.</strong> L'entreprise dispose de quinze jours pour contester
      un refus de validation. Riseva demande sa version à l'association et tranche par écrit.</li>
  <li><strong>Contestation d'un score.</strong> Le détail des missions et le calcul sont fournis
      sous cinq jours ouvrés. Une erreur avérée est corrigée rétroactivement et le classement
      recalculé.</li>
  <li><strong>Soupçon de fraude.</strong> Missions déclarées non réalisées, complaisance entre une
      entreprise et une association : Riseva suspend les points concernés le temps de vérifier, et
      informe les deux parties. Une fraude établie entraîne l'exclusion de la saison sans
      remboursement.</li>
  <li><strong>Arbitrage.</strong> Riseva arbitre en dernier ressort et motive sa décision par écrit.
      Ces décisions sont consignées et communicables au client sur demande.</li>
</ul>
""")

# ---------------------------------------------------------------- charte associations
ecrire("charte-associations.html",
  surtitre="Le réseau",
  titre="Ce que nous nous promettons",
  description="Les cinq engagements d'une association qui rejoint Riseva, et les cinq que Riseva prend envers elle.",
  chapo="Une charte écrite uniquement pour protéger la plateforme et ses clients se lit comme une "
        "mise en garde. Celle-ci va dans les deux sens, et elle commence par ce que nous vous devons.",
  corps="""
<div class="encadre">
  <p><strong>Vos cinq engagements.</strong></p>
  <ol>
    <li>Publier des besoins réels, dans l'objet de votre association.</li>
    <li>Accueillir les salariés dans des conditions sûres, et dire à l'avance ce que la mission
        demande physiquement et matériellement.</li>
    <li>Répondre aux missions déclarées, ou laisser le délai courir, un silence n'est pas une
        faute, une fausse confirmation en est une.</li>
    <li>N'utiliser les coordonnées reçues par Riseva que pour la mission concernée.</li>
    <li>Rester responsable des reçus fiscaux que vous émettez, sous votre numéro d'ordre.</li>
  </ol>
</div>

<div class="encadre">
  <p><strong>Nos cinq engagements.</strong></p>
  <ol>
    <li>Ne rien prélever sur vos dons, ne rien vous facturer, et ne jamais vous demander
        l'exclusivité.</li>
    <li>Ne pas modifier votre fiche, vos annonces ou vos chiffres sans votre accord.</li>
    <li>Vous prévenir et vous laisser le temps de corriger avant toute suspension, sauf fraude
        avérée ou risque pour la sécurité de quelqu'un.</li>
    <li>Vous rendre vos données, à tout moment, dans un format lisible, et les supprimer si vous
        le demandez.</li>
    <li>N'utiliser votre nom et votre logo qu'avec votre autorisation, et jamais pour dire que
        vous recommandez Riseva.</li>
  </ol>
</div>

<h2>Ce que nous vérifions à l'entrée, et comment</h2>
<p>Sur les <strong>registres publics</strong>, pas sur des pièces que vous nous enverriez. Vous
donnez un numéro, nous allons lire nous-mêmes. <strong>Vous n'avez aucun justificatif à envoyer,
et nous ne vous en demanderons pas</strong>, ni statuts, ni comptes, ni attestation.</p>
<table class="table">
  <thead><tr><th>Ce que nous lisons</th><th>Où</th></tr></thead>
  <tbody>
    <tr><td>Existence juridique, dénomination déposée, date de déclaration, état d'activité</td>
        <td>Annuaire des Entreprises et Répertoire national des associations, via l'API
            Recherche d'entreprises, Licence Ouverte 2.0</td></tr>
    <tr><td>Adresse déclarée et cohérence avec ce que vous avez saisi</td>
        <td>Les mêmes registres. Les écarts vous sont montrés, jamais corrigés en douce.</td></tr>
    <tr><td>Objet réel de l'association</td>
        <td>Votre fiche publique et vos annonces, lues par une personne</td></tr>
    <tr><td>Identité du référent et du signataire des reçus</td>
        <td>Vos déclarations, avec le mandat écrit que vous nous donnez pour préparer les
            reçus, et que vous révoquez quand vous voulez</td></tr>
  </tbody>
</table>
<p>Trois choses relèvent de vous et sont affichées comme des <strong>déclarations</strong>, jamais
comme des vérifications : votre éligibilité au mécénat, votre assurance, et l'impact de vos
missions. Nous n'avons ni la compétence ni la légitimité pour les certifier à votre place, et
prétendre le contraire tromperait les entreprises.</p>

<div class="encadre encadre--alerte">
  <p><strong>Ce que nous ne garantissons pas.</strong> Riseva ne certifie pas l'éligibilité fiscale
  d'une association, et ne vérifie pas l'impact de ses missions. Seule l'association peut affirmer
  son éligibilité, et seule l'administration peut la contester. Une entreprise qui a besoin d'une
  certitude peut demander à l'association son <strong>rescrit fiscal</strong>.</p>
</div>

<h2>Revérification</h2>
<p>Chaque association est revue <strong>une fois par saison</strong>, et à chaque fois qu'elle
change de référent ou de signataire. La date de dernière vérification figure sur sa fiche, visible
par les entreprises.</p>

<h2>Le délai de quatorze jours, et ce qu'il ne veut pas dire</h2>
<ul>
  <li>Vous avez <strong>quatorze jours</strong> pour confirmer une mission, à compter du jour où le
      salarié la déclare faite. Vous recevez le message, puis des rappels à trois, sept et douze
      jours. Chacun contient trois boutons, réalisée comme prévu, réalisée partiellement, non
      réalisée, qui fonctionnent <strong>sans vous connecter</strong>.</li>
  <li>Sans réponse au bout de quatorze jours, la mission est <strong>clôturée automatiquement sans
      confirmation</strong>. Les points sont crédités à l'entreprise selon le barème, mais le
      résultat reste <strong>estimé</strong> et identifié comme <strong>non confirmé</strong> sur
      tous les écrans et dans tous les rapports. Nous n'écrirons jamais que vous avez confirmé ce
      que vous n'avez pas confirmé.</li>
  <li><strong>Une clôture automatique n'est pas une faute et n'entraîne aucune suspension.</strong>
      Vous avez une association à faire tourner, pas une boîte de réception à surveiller. Si les
      clôtures se répètent, nous vous appelons pour comprendre, un référent absent, une adresse
      qui ne marche plus, et pour trouver une solution.</li>
  <li>Vous pouvez déclarer une <strong>période d'absence</strong> et un référent suppléant. Pendant
      cette période, les demandes partent au suppléant et les rappels vous laissent tranquille.</li>
  <li>Ce qui peut être sanctionné, c'est une <strong>confirmation volontairement fausse</strong> :
      attester qu'une mission a eu lieu alors qu'elle n'a pas eu lieu. C'est autre chose qu'un
      silence, et nous ne les confondons pas.</li>
</ul>

<h2>Accueil, sécurité et assurance</h2>
<ul>
  <li>Vous annoncez dans l'annonce ce que la mission demande : port de charges, station debout
      prolongée, travail extérieur par tous les temps, équipement à prévoir, âge minimum.</li>
  <li>Vous accueillez les salariés dans des conditions sûres, et vous êtes assurée en
      responsabilité civile pour l'activité et pour les personnes que vous recevez.</li>
  <li>En cas d'incident, vous nous prévenez sous 48 heures et nous prévenons l'entreprise. Nous ne
      publions jamais le détail d'un incident.</li>
</ul>
<div class="encadre">
  <p><strong>Qui couvre quoi, et la nuance qui compte.</strong></p>
  <p><strong>Sur le temps de travail</strong>, le salarié reste salarié : son contrat continue et
  un accident survenu chez vous est un <strong>accident du travail</strong>, déclaré par son
  employeur et pris en charge par son régime (article L. 411-1 du code de la sécurité sociale).
  Votre responsabilité civile reste engagée si le dommage vient d'une faute de votre part.</p>
  <p><strong>Hors temps de travail</strong>, la personne est <strong>bénévole</strong>, et c'est
  là qu'il faut être exact. Votre responsabilité civile couvre les dommages qu'un bénévole
  <strong>cause</strong> à autrui ; elle ne couvre pas, par elle-même, ceux qu'il
  <strong>subit</strong>. Pour cela il faut une garantie individuelle accident, ou l'assurance
  volontaire contre les accidents du travail que les organismes d'intérêt général peuvent
  souscrire pour leurs bénévoles (articles L. 743-2 et R. 743-4 et suivants du code de la
  sécurité sociale). La jurisprudence retient par ailleurs une obligation de sécurité à votre
  charge, tirée de la convention d'assistance bénévole.</p>
  <p>Nous vous demandons d'<strong>écrire dans l'annonce ce qui est couvert</strong>. Un bénévole
  a le droit de le savoir avant de venir, et une entreprise a le droit de le savoir avant
  d'encourager ses salariés à y aller.</p>
</div>

<h2>Annulation, absence, incident</h2>
<ul>
  <li>Un salarié qui ne vient pas : vous répondez « non réalisée », aucun point n'est crédité, la
      place redevient disponible. Aucune justification ne vous est demandée.</li>
  <li>Une mission que vous devez annuler : fermez l'annonce, les salariés inscrits sont prévenus
      automatiquement. Prévenez si possible plus de 48 heures avant.</li>
  <li>Un comportement inapproprié, une discrimination, un manque de respect : signalez-le, la
      personne perd l'accès aux missions de votre association, et l'entreprise est informée.</li>
</ul>

<h2>Les données du salarié</h2>
<p>Vous recevez le nom du salarié et la date de sa mission, rien d'autre. Ces données servent à
organiser la mission, et à rien d'autre : pas de liste de diffusion, pas d'appel aux dons, pas de
transmission à un tiers. Elles s'effacent quand la mission est close et le délai de réclamation
écoulé.</p>

<h2>Situations pouvant conduire à une suspension</h2>
<p>Dans tous les cas ci-dessous, nous vous écrivons d'abord, nous expliquons ce qui pose problème,
et nous vous laissons <strong>quinze jours</strong> pour corriger. La suspension n'arrive qu'après,
et elle est motivée par écrit.</p>
<ul>
  <li>Annonces sans rapport avec l'objet déclaré.</li>
  <li>Coordonnées devenues fausses, ou référent injoignable malgré plusieurs tentatives sur
      plusieurs canaux, et à condition qu'aucune période d'absence n'ait été déclarée.</li>
  <li><strong>Démarchage détourné</strong> : utiliser les coordonnées d'un salarié ou d'une
      entreprise obtenues par Riseva pour une autre finalité que la mission, appel aux dons,
      lettre d'information, invitation, revente, sans que la personne l'ait demandé.</li>
</ul>
<p>Trois situations, et trois seulement, permettent une suspension immédiate sans délai de
correction : une <strong>fraude avérée</strong> (confirmation volontairement fausse, détournement
de fonds), un <strong>risque pour la sécurité</strong> des personnes accueillies, et l'émission de
<strong>reçus fiscaux gravement irréguliers</strong>, par exemple après la perte de l'éligibilité.</p>
<p>Une suspension retire les annonces, gèle les points en cours de validation liés à vos missions,
et informe les entreprises concernées. Elle est motivée par écrit et peut être contestée : nous
répondons sous quinze jours, par une décision motivée.</p>

<h2>Ce que l'association garde</h2>
<ul>
  <li>Le droit de refuser une entreprise, sans avoir à se justifier.</li>
  <li>La propriété de ses dons : l'argent va directement chez elle, Riseva n'en voit pas la couleur.</li>
  <li>La liberté de faire la même chose ailleurs. Aucune exclusivité n'est demandée.</li>
  <li>La possibilité de partir à tout moment, avec ses données, exportées dans un format lisible.</li>
  <li>Le dernier mot sur sa page publique : texte, visuel, coordonnées, et ce qui y est affiché.</li>
</ul>

<h2>Signalement</h2>
<p>Une entreprise, un salarié ou une association peut signaler un problème à
<a href="mailto:contact@riseva.fr" style="color:var(--forest-800)">contact@riseva.fr</a>.
Nous accusons réception sous deux jours ouvrés et rendons une décision motivée sous quinze jours.</p>
""")

# ---------------------------------------------------------------- sécurité
ecrire("securite.html",
  surtitre="Le dossier achats",
  titre="Sécurité",
  description="Hébergement, chiffrement, contrôle d'accès, sauvegardes, procédure d'incident. Ce que Riseva fait, et ce qu'elle ne fait pas encore.",
  chapo="Une jeune entreprise n'a pas d'ISO 27001, et prétendre le contraire se voit tout de suite. "
        "Voici ce qui est en place, et ce qui ne l'est pas encore.",
  corps="""
<h2>Hébergement</h2>
<table>
  <thead><tr><th>Élément</th><th>Où</th></tr></thead>
  <tbody>
    <tr><td>Application web</td><td>Hébergeur européen, région Union européenne</td></tr>
    <tr><td>Base de données</td><td>PostgreSQL managé, région Union européenne, chiffré au repos</td></tr>
    <tr><td>Sauvegardes</td><td>Même région, chiffrées, rétention 30 jours, restauration ponctuelle</td></tr>
    <tr><td>Envoi des messages</td><td>Prestataire d'emailing, données limitées au strict nécessaire</td></tr>
    <tr><td>Paiement des dons</td><td>Prestataire spécialisé. Riseva ne stocke aucune donnée bancaire</td></tr>
  </tbody>
</table>
<p>Aucun transfert de données hors de l'Union européenne dans le fonctionnement normal du service.
La liste datée des sous-traitants figure sur la page <a href="/confidentialite.html">Données personnelles</a>.</p>

<h2>Chiffrement</h2>
<ul>
  <li>En transit : TLS 1.2 minimum sur toutes les connexions, HSTS activé.</li>
  <li>Au repos : chiffrement du disque de la base et des sauvegardes.</li>
  <li>Secrets applicatifs : variables d'environnement chiffrées, jamais dans le dépôt de code.</li>
</ul>

<h2>Contrôle d'accès</h2>
<ul>
  <li><strong>Sans mot de passe.</strong> La connexion se fait par lien à usage unique valable une
      heure. Il n'y a donc pas de mot de passe à voler chez nous.</li>
  <li><strong>Cloisonnement par ligne.</strong> Chaque table de la base porte des politiques de
      sécurité au niveau de la ligne. Un compte ne peut lire que ce que sa politique autorise,
      même si une requête est mal écrite côté application.</li>
  <li><strong>Domaines de messagerie.</strong> Le lien d'inscription d'une entreprise n'accepte que
      les adresses des domaines qu'elle a déclarés. Un lien qui fuite ne suffit pas à entrer.</li>
  <li><strong>Rotation et révocation.</strong> L'administrateur peut couper ou régénérer le lien à
      tout moment, sans toucher aux comptes existants.</li>
  <li><strong>Deuxième facteur.</strong> Obligatoire pour les comptes d'administration Riseva.
      Proposé aux administrateurs d'entreprise.</li>
  <li><strong>Journal des accès.</strong> Inscriptions, créations et révocations de lien, retraits :
      horodatés, consultables et exportables par l'entreprise. Personne ne peut les effacer.</li>
</ul>

<h2>Développement</h2>
<ul>
  <li>Suite de tests de bout en bout exécutée à chaque modification, couvrant les parcours réels
      de chacun des quatre rôles.</li>
  <li>Aucune donnée de production utilisée en développement.</li>
  <li>Dépendances tierces réduites au minimum. Le cœur de l'application ne dépend d'aucun paquet
      externe côté navigateur.</li>
</ul>

<h2>Incident</h2>
<ul>
  <li>Information du client concerné <strong>sous 24 heures</strong> après détection, même si
      l'analyse n'est pas terminée, puis mises à jour continues jusqu'à la clôture. Le texte
      dit « dans les meilleurs délais » : nous préférons un chiffre contractuel.</li>
  <li>Notification à la CNIL sous 72 heures en cas de violation de données à caractère personnel,
      conformément à l'article 33 du RGPD.</li>
  <li>Compte rendu écrit sous quinze jours : ce qui s'est passé, ce qui a été touché, ce qui a été
      corrigé.</li>
  <li>Contact sécurité : <a href="mailto:securite@riseva.fr" style="color:var(--forest-800)">securite@riseva.fr</a>.</li>
</ul>

<div class="encadre encadre--alerte">
  <p><strong>Ce qui n'est pas en place, et qu'on ne prétendra pas avoir.</strong></p>
  <ul>
    <li>Pas de certification ISO 27001 ni SOC 2. Nous sommes une jeune structure.</li>
    <li>Pas encore de test d'intrusion externe. Il est prévu avant la deuxième saison, et le
        rapport de synthèse sera communicable aux clients.</li>
    <li>Pas d'authentification unique d'entreprise (SSO SAML) à ce jour. Prévue si un client la
        demande, sans surcoût pour les premiers.</li>
  </ul>
</div>
""")

# ---------------------------------------------------------------- données personnelles
ecrire("confidentialite.html",
  surtitre="Le dossier achats",
  titre="Données personnelles",
  description="Quelles données Riseva traite, pour quoi, combien de temps, avec quels sous-traitants, et comment exercer ses droits.",
  chapo="Le client est responsable de traitement, Riseva est sous-traitant au sens de l'article 28 "
        "du RGPD. Un accord de sous-traitance est fourni avec le devis, avant la signature.",
  corps="""
<h2>Qui fait quoi</h2>
<table>
  <thead><tr><th>Rôle</th><th>Qui</th></tr></thead>
  <tbody>
    <tr><td>Responsable de traitement</td><td>L'entreprise cliente, pour les données de ses salariés</td></tr>
    <tr><td>Sous-traitant</td><td>Riseva</td></tr>
    <tr><td>Responsable conjoint</td><td>Aucun. Riseva n'utilise jamais les données d'un client pour son propre compte</td></tr>
  </tbody>
</table>

<h2>Groupes et filiales : le lien capitalistique ne donne aucun droit</h2>
<p>Quand un groupe souscrit pour plusieurs sociétés, <strong>chaque entité reste responsable
des données de son périmètre</strong>. Les données nominatives ne circulent pas librement d'une
société à l'autre, et détenir le capital n'y change rien. Lorsque plusieurs entités déterminent
ensemble une finalité, la responsabilité conjointe et les accès consolidés sont documentés
contractuellement, comme le prévoit l'article 26 du règlement.</p>
<ul>
  <li>La société qui <strong>paie</strong> reçoit les factures. Cela ne lui ouvre aucun accès
      aux personnes d'une autre société.</li>
  <li>La vue consolidée d'un groupe ne montre que des <strong>agrégats</strong> : points,
      missions, effectifs, indicateurs, par société et par établissement. Jamais un nom, jamais
      un dossier individuel.</li>
  <li>Un <strong>référent de site</strong> ne voit que les salariés de son établissement. Pas
      ceux des autres sites, pas le contrat, pas les factures, pas le mécénat.</li>
  <li>Ce cloisonnement n'est pas un filtre d'affichage : c'est une règle appliquée par la base
      de données elle-même, et vérifiée à chaque mise en production.</li>
</ul>
<p>Les indicateurs sociaux et de sécurité que Riseva collecte sont des <strong>agrégats par
établissement</strong> : effectifs, heures travaillées, nombre d'accidents, journées perdues.
<strong>Aucune donnée de santé n'est traitée</strong> : ni diagnostic, ni nature de lésion, ni
identité de la personne accidentée.</p>

<h2>Ce que nous traitons</h2>
<table>
  <thead><tr><th>Catégorie</th><th>Données</th><th>Conservation</th></tr></thead>
  <tbody>
    <tr><td>Compte salarié</td><td>Nom, prénom, email professionnel</td><td>Durée de l'abonnement, puis anonymisation</td></tr>
    <tr><td>Activité</td><td>Missions, points, dates</td><td>Durée de l'abonnement + 1 an pour les rapports</td></tr>
    <tr><td>Dons</td><td>Montant, date, association, identité du donateur</td><td>6 ans, obligation comptable et fiscale</td></tr>
    <tr><td>Journal des accès</td><td>Événement, horodatage, lien utilisé, adresse IP tronquée et navigateur</td><td>6 mois</td></tr>
    <tr><td>Registre de sécurité</td><td>Date, site, zone, type et gravité d'un événement, journées d'arrêt, <strong>aucune identité, aucune donnée de santé</strong></td><td>durée de la saison, puis archivage agrégé</td></tr>
    <tr><td>Facturation</td><td>Raison sociale, SIRET, adresse, factures</td><td>10 ans, obligation légale</td></tr>
  </tbody>
</table>
<p>Aucune donnée sensible au sens de l'article 9 n'est collectée <strong>directement</strong>.
Il serait faux de s'arrêter là : rapprocher un donateur identifié de la cause qu'il soutient
<strong>est</strong> une donnée sensible par déduction (CJUE, 1<sup>er</sup> août 2022, C-184/20).
Ce rapprochement existe, il est nécessaire au reçu fiscal, et il est traité comme tel, un don
personnel déclaré dans Riseva demande votre <strong>accord explicite</strong>, distinct de votre
inscription, et ce lien n'est jamais exposé à votre employeur. Aucun profilage, aucune décision
automatisée produisant des effets juridiques. Aucune revente, jamais.</p>

<div class="encadre">
  <p><strong>Ce que votre employeur ne voit pas.</strong> La cause d'une association peut révéler
  une conviction, une opinion, un état de santé ou une appartenance syndicale. Le produit est
  construit pour empêcher cette déduction :</p>
  <ul>
    <li>un don personnel n'est <strong>jamais nominatif</strong> dans les écrans de l'employeur :
        ni votre nom, ni le montant, ni l'association ;</li>
    <li>les points affichés dans l'espace Équipe sont ceux <strong>des missions uniquement</strong> ;</li>
    <li>les totaux de dons ne s'affichent qu'à partir de <strong>cinq donateurs</strong> : en
        dessous, un total et un effectif suffiraient à remonter aux personnes ;</li>
    <li>le classement interne ne sort jamais de votre entreprise, et vers l'extérieur seul le
        total collectif est publié.</li>
  </ul>
</div>

<p>Une <strong>analyse d'impact</strong> a été conduite : trois critères de la liste de la CNIL
sont réunis, notation, personnes vulnérables et risque d'inférence sensible. Elle est fournie
aux clients avec le contrat.</p>

<p>Enfin, le <strong>consentement n'est pas la base légale</strong> retenue pour les comptes et
les missions : la relation entre un employeur et son salarié est déséquilibrée, et un
consentement qu'on ne peut pas refuser librement n'en est pas un. La base est l'intérêt légitime,
avec participation volontaire et refus sans conséquence. L'accord demandé mission par mission
pour les missions sur le temps de travail répond, lui, à une exigence du code du travail.</p>

<h2>Le départ d'un salarié</h2>
<p>Le retrait d'un salarié <strong>anonymise</strong> son compte : nom et adresse effacés, remplacés
par une mention neutre, y compris dans l'historique des missions. Les points restent acquis à
l'entreprise parce qu'ils lui appartiennent, mais plus rien ne permet de remonter à la personne.
L'opération est irréversible et tracée.</p>

<h2>Sous-traitants ultérieurs</h2>
<table>
  <thead><tr><th>Prestataire</th><th>Fonction</th><th>Hébergement</th></tr></thead>
  <tbody>
    <tr><td>Supabase</td><td>Base de données et authentification</td><td>Union européenne</td></tr>
    <tr><td>Vercel</td><td>Diffusion de l'application web</td><td>Union européenne</td></tr>
    <tr><td>Resend</td><td>Envoi des messages transactionnels</td><td>Union européenne</td></tr>
  </tbody>
</table>
<p>Cette liste est datée et versionnée. Tout ajout est notifié au client trente jours avant, avec
un droit d'objection motivé.</p>
<p>L'<strong>hébergement</strong> est européen chez les trois. Mais ce sont des sociétés de droit
américain, et un accès de leur support depuis les États-Unis est un transfert au sens du chapitre V.
Il est encadré par les <strong>clauses contractuelles types</strong> de la décision (UE) 2021/914,
complétées le cas échéant par la certification <em>Data Privacy Framework</em> du prestataire.
Écrire « aucun transfert hors Union européenne » aurait été plus simple, et faux.</p>

<h2>Vos droits</h2>
<ul>
  <li>Accès, rectification, effacement, limitation, portabilité : par simple demande à
      <a href="mailto:contact@riseva.fr" style="color:var(--forest-800)">contact@riseva.fr</a>,
      transmise au responsable de traitement sous 72 heures et instruite avec lui.</li>
  <li>Pour les données de son espace, Riseva agit comme <strong>sous-traitant</strong> de votre
      employeur : elle ne peut pas effacer un compte de sa propre initiative, ce serait agir hors
      instruction (article 28.3.a). Vous pouvez nous écrire directement, nous transmettons, nous
      assistons, et nous vous disons ce qui a été fait.</li>
  <li>Riseva reste responsable de traitement pour ce qui la concerne en propre : prospection,
      facturation, journal de sécurité. Sur ces données-là, elle répond elle-même, sous un mois.</li>
  <li>Réclamation possible auprès de la CNIL, 3 place de Fontenoy, 75007 Paris.</li>
</ul>

<h2>Réversibilité</h2>
<p>À tout moment et sans frais, l'entreprise exporte l'intégralité de ses données au format CSV
depuis son espace : équipe, missions, points, dons, factures, journal des accès. À la fin du
contrat, les données sont supprimées sous trente jours sur demande, ou conservées le temps des
obligations légales. Un certificat de suppression est fourni si le client le demande.</p>

<h2>Cookies</h2>
<p>Aucun cookie publicitaire, aucun traceur tiers, aucune mesure d'audience externe. La plateforme
n'utilise que le stockage local du navigateur pour maintenir la session ouverte. Il n'y a donc pas
de bandeau à cliquer, parce qu'il n'y a rien à accepter.</p>

<p>Cela vaut aussi pour ce qui ne ressemble pas à un traceur. <strong>Les polices de caractères
sont servies par Riseva</strong>, pas par une fonderie extérieure. Consulter une page publique de
riseva.fr, accueil, tarifs, règlement, page d'une association, ne déclenche donc aucune requête
vers un domaine extérieur, et n'envoie l'adresse IP du visiteur à personne avant qu'il ait fait
quoi que ce soit. Une seule police chargée depuis un service extérieur suffirait à rendre cette
phrase fausse : un test de la recette échoue si un appel externe réapparaît sur une page.</p>

<p>Une fois connecté à l'application, votre navigateur dialogue évidemment avec l'hébergement de
la base, c'est ce qui affiche vos données. Ces prestataires sont ceux du tableau ci-dessus, ils
sont dans l'Union européenne, et il n'y en a pas d'autre.</p>
""")

# ---------------------------------------------------------------- engagements de service
ecrire("engagements.html",
  surtitre="Le dossier achats",
  titre="Engagements de service",
  description="Disponibilité, support, délais de validation, fraîcheur des annonces, réversibilité. Des engagements chiffrés, pas des intentions.",
  chapo="« Meilleur effort » ne veut rien dire. Voici des chiffres, et ce qui se passe quand nous "
        "ne les tenons pas.",
  corps="""
<h2>Le démarrage</h2>
<p>Une saison ne commence pas à la signature : elle commence quand l'outil fonctionne chez vous.
Cinq points sont constatés ensemble, à une date convenue. Ils sont vérifiables par vous, sans
nous croire sur parole.</p>
<ol>
  <li>Votre espace est ouvert et le lien d'inscription fonctionne <strong>depuis un poste de
      votre réseau</strong> : c'est le seul test qui vaut, un lien qui marche chez nous ne prouve
      rien.</li>
  <li>Les comptes commandés sont disponibles, et le quota de chaque site est réparti.</li>
  <li>Les formats de votre contrat sont actifs, et le barème de la saison est celui du
      règlement publié.</li>
  <li>Des associations vérifiées et actives sont présentes autour de vos sites. Le nombre exact
      vous est donné site par site, y compris quand il est faible.</li>
  <li>Un rapport est exportable, avec la méthode de calcul à côté de chaque chiffre.</li>
</ol>
<p>Vous disposez de quinze jours pour les constater. Si l'un manque et n'est pas levé dans les
quinze jours suivants, <strong>l'acompte est remboursé intégralement</strong> et aucun solde
n'est dû. Le solde est facturé à l'ouverture de la saison et payable à trente jours ; si le
démarrage n'est pas constaté, il n'est pas dû.</p>

<h2>Disponibilité</h2>
<table>
  <thead><tr><th>Engagement</th><th>Valeur</th></tr></thead>
  <tbody>
    <tr><td>Disponibilité mensuelle</td><td>99,5 % hors maintenance annoncée</td></tr>
    <tr><td>Maintenance planifiée</td><td>Annoncée 5 jours avant, hors heures ouvrées, 4 h maximum par mois</td></tr>
    <tr><td>Perte de données maximale (RPO)</td><td>24 heures</td></tr>
    <tr><td>Délai de remise en service (RTO)</td><td>8 heures ouvrées</td></tr>
  </tbody>
</table>
<p>En dessous de 99 % sur un mois, un avoir de 10 % de la mensualité correspondante est appliqué
sans que le client ait à le demander. En dessous de 95 %, l'avoir passe à 30 % et le client peut
résilier sans pénalité.</p>
<p><strong>Ces avoirs ne sont pas un recours exclusif.</strong> Ils compensent l'indisponibilité,
ils ne couvrent pas un préjudice d'une autre nature, et ils ne privent le client d'aucun autre
droit. Un contrat qui ferait des avoirs la seule réparation possible pour tout préjudice serait
déséquilibré, et un service achats le verrait.</p>

<h2>Support</h2>
<table>
  <thead><tr><th>Sévérité</th><th>Exemple</th><th>Prise en charge</th><th>Contournement</th></tr></thead>
  <tbody>
    <tr><td>Bloquant</td><td>Plateforme inaccessible, points faux</td><td>4 h ouvrées</td><td>1 jour ouvré</td></tr>
    <tr><td>Majeur</td><td>Une fonction ne marche pas, export impossible</td><td>1 jour ouvré</td><td>5 jours ouvrés</td></tr>
    <tr><td>Mineur</td><td>Affichage, confort, demande d'évolution</td><td>3 jours ouvrés</td><td>selon planning</td></tr>
  </tbody>
</table>
<p>Support par email, du lundi au vendredi, 9 h à 18 h. Pour les entreprises de la première saison,
la personne qui répond est celle qui a construit la plateforme. Pas de niveau 1, pas de ticket qui
tourne en rond.</p>

<h2>Fraîcheur du réseau associatif</h2>
<p>Une plateforme d'engagement sans annonces vivantes est une coquille vide. Nous nous engageons sur
le réseau, pas seulement sur le logiciel.</p>
<ul>
  <li>Nous visons <strong>huit annonces ouvertes à tout moment, dont trois de bénévolat</strong>,
      dans un rayon de <strong>30 km</strong> autour de chaque établissement de chaque entreprise
      cliente. C'est notre objectif de service, et nous le mesurons.</li>
  <li>L'engagement contractuel, celui sur lequel vous pouvez nous tenir, est plus prudent et plus
      net : <strong>au moins trois annonces ouvertes, dont une de bénévolat</strong>, dans ce même
      rayon. Nous ne promettons pas huit associations autour d'un site isolé alors que le réseau
      se construit : ce serait une promesse que la carte de France ne permet pas toujours de
      tenir.</li>
  <li>Trente kilomètres, et pas cinquante : c'est le rayon que l'écran d'un salarié montre
      réellement. Un engagement mesuré sur un rayon plus large que celui qu'on affiche serait tenu
      sur le papier pendant que l'écran resterait vide.</li>
  <li>Si ce plancher n'est pas atteint <strong>pendant plus de trente jours consécutifs</strong>
      pour un établissement, nous élargissons son rayon à 100 km et nous vous prévenons. S'il n'est
      toujours pas atteint au bout de <strong>soixante jours</strong>, le mois d'abonnement
      correspondant vous est <strong>remboursé au prorata de l'établissement concerné</strong>,
      sans que vous ayez à le demander.</li>
  <li>Toute annonce dont la date est dépassée depuis plus de sept jours est fermée automatiquement.</li>
  <li>Une association injoignable plus de trente jours voit ses annonces retirées.</li>
  <li>Si une entreprise n'a aucune association pertinente dans sa zone, nous en cherchons pour elle
      et nous la démarchons nous-mêmes. C'est notre travail, pas le sien.</li>
</ul>

<h2>Délais de validation</h2>
<ul>
  <li>Vous avez <strong>quatorze jours</strong> pour confirmer une mission, à compter du jour où
      le salarié la déclare faite. Vous recevez le message, puis deux rappels : à trois jours, à
      sept jours, et un dernier à douze jours. Chacun contient trois boutons, réalisée comme
      prévu, réalisée partiellement, non réalisée, qui fonctionnent <strong>sans vous
      connecter</strong>.</li>
  <li>Sans réponse au bout de quatorze jours, la mission est <strong>clôturée automatiquement
      sans confirmation</strong>. Les points sont crédités à l'entreprise, mais le résultat reste
      <strong>estimé</strong>, et il est écrit comme tel sur tous les écrans et dans tous les
      rapports. Nous n'écrirons jamais que vous avez confirmé quelque chose que vous n'avez pas
      confirmé.</li>
  <li><strong>Une clôture automatique n'est pas une faute et n'entraîne aucune suspension.</strong>
      Vous avez une association à faire tourner, pas une boîte de réception à surveiller. Si les
      clôtures automatiques se répètent, nous vous appelons pour comprendre, un référent
      indisponible, une adresse qui ne marche plus, et pour trouver une solution avec vous.</li>
  <li>Ce qui peut être sanctionné, c'est une <strong>confirmation volontairement fausse</strong> :
      attester qu'une mission a eu lieu alors qu'elle n'a pas eu lieu. C'est autre chose qu'un
      silence.</li>
  <li>Contestation d'un refus : réponse motivée sous quinze jours.</li>
</ul>

<h2>Réversibilité</h2>
<p>Depuis le 12 septembre 2025, le règlement européen sur les données couvre expressément les
services d'informatique en nuage. La réversibilité n'est plus une politesse contractuelle, c'est
une obligation (articles 25 à 30).</p>
<ul>
  <li>Export complet au format CSV, à tout moment, sans frais, depuis l'espace client.</li>
  <li>À la fin du contrat, les données restent accessibles en lecture <strong>trente jours</strong>.</li>
  <li>Suppression définitive sur demande, avec certificat, sous trente jours.</li>
  <li>Aucun format propriétaire, aucun frais de sortie, aucune donnée retenue en otage,
      y compris en cas d'impayé.</li>
  <li>Assistance au transfert vers un autre prestataire, sans facturation supplémentaire.</li>
</ul>

<h2>Facturation électronique</h2>
<p>À compter du <strong>1<sup>er</sup> septembre 2026</strong>, toute entreprise établie en France
doit être en mesure de <strong>recevoir</strong> ses factures par une plateforme agréée. Un PDF
envoyé par courriel ne vaudra plus facture. Les PME et microentreprises devront
<strong>émettre</strong> sous ce format à partir du 1<sup>er</sup> septembre 2027.</p>
<p>Concrètement : dites-nous votre plateforme de réception et votre identifiant d'annuaire au
moment de la signature, le champ est prévu dans votre espace. Nos factures y sont adressées.</p>

<h2>Impayé</h2>
<p>Une facture en retard suspend la publication de nouvelles missions. Elle ne coupe jamais l'accès
en lecture, ne supprime aucune donnée et n'annule aucun point acquis. Prendre en otage les données
d'un client pour se faire payer est une pratique que nous n'aurons pas.</p>

<h2>Évolutions et prix</h2>
<ul>
  <li>Le prix est ferme pour la durée de la saison souscrite.</li>
  <li><strong>Pas de reconduction tacite.</strong> L'abonnement s'arrête à la clôture, après remise
      du rapport annuel. C'est au client de décider de repartir.</li>
  <li>Toutes les fonctions décrites au contrat sont incluses. Ni le reporting, ni les exports,
      ni le support ne sont facturés à part.</li>
</ul>
""")

# ---------------------------------------------------------------- CGV
ecrire("cgv.html",
  surtitre="Le contrat",
  titre="Conditions générales de vente",
  description="Conditions de vente de l'abonnement Riseva aux entreprises : prix, garanties, responsabilité, données, réversibilité.",
  chapo="Version de travail, à faire relire par un juriste avant la première signature. "
        "Publiée telle quelle parce qu'un acheteur préfère un document imparfait mais "
        "disponible à un document promis pour plus tard.",
  corps="""
<h2>1. Objet et documents contractuels</h2>
<p>Riseva fournit un service en ligne qui met en relation des entreprises abonnées et des
associations partenaires, comptabilise les actions réalisées et produit des rapports.</p>
<p>Le contrat est formé, dans cet ordre de priorité, par : le bon de commande signé, les
conditions particulières éventuelles, les présentes conditions générales, les
<a href="/engagements.html">engagements de service</a>, l'accord de sous-traitance annexé, et
les <a href="/reglement.html">règles de la saison</a>. Chacune de ces pages est datée et
versionnée ; la version applicable est celle en vigueur à la signature, et elle est jointe
au bon de commande.</p>

<h2>2. Commande et durée</h2>
<ul>
  <li>La préinscription est gratuite et n'engage à rien.</li>
  <li>La commande est formée par la signature du bon de commande.</li>
  <li>L'abonnement couvre une <strong>saison</strong>, d'une durée d'une année.</li>
  <li><strong>Pas de reconduction tacite.</strong> Il s'arrête à la clôture, après remise du
      rapport annuel.</li>
</ul>

<h2>2 bis. Droit de rétractation des très petites structures</h2>
<p>L'article <strong>L. 221-3 du code de la consommation</strong> étend le droit de rétractation
des consommateurs aux contrats conclus <strong>hors établissement</strong> entre professionnels,
lorsque le client emploie <strong>cinq salariés ou moins</strong> et que l'objet du contrat
n'entre pas dans le champ de son activité principale. Une entreprise du bâtiment de quatre
personnes qui signe un abonnement RSE lors d'un rendez-vous dans ses locaux est dans ce cas.</p>
<ul>
  <li>Ce client dispose de <strong>quatorze jours</strong> à compter de la signature pour se
      rétracter, <strong>sans motif et sans pénalité</strong>. Un courriel à
      <a href="mailto:contact@riseva.fr" style="color:var(--forest-800)">contact@riseva.fr</a>
      suffit ; un formulaire type est joint au bon de commande.</li>
  <li>Les sommes déjà versées, <strong>acompte compris</strong>, sont remboursées sous quatorze
      jours à compter de la réception de la rétractation.</li>
  <li>Si le client a demandé que le service commence pendant ce délai, il ne paie que la part
      réellement exécutée, au prorata. Nous ne démarrons pas sans cette demande écrite : lancer
      la saison pendant le délai de rétractation, c'est le vider de son sens.</li>
  <li>Nous n'exigeons de personne qu'il déclare son effectif pour bénéficier de ce droit. Si vous
      pensez y avoir droit, écrivez-nous : nous ne demanderons pas de preuve.</li>
</ul>

<h2>3. Prix, facturation et paiement</h2>
<ul>
  <li>Le prix résulte de la <strong>grille tarifaire publiée</strong> sur riseva.fr, appliquée à
      l'effectif déclaré et au nombre de sites. Il figure au bon de commande et il est
      <strong>ferme pour la durée de la saison</strong> : une modification ultérieure de la grille
      est sans effet sur un contrat signé.</li>
  <li><strong>Tarif fondateur.</strong> Une remise de 10 % est accordée aux vingt premières
      entreprises signataires, jusqu'au 31 décembre 2026. Elle porte sur la
      <strong>première saison, et sur elle seule</strong> : nous ne garantissons le prix
      d'aucune saison que nous n'avons pas encore vécue, et nous préférons vous le dire
      maintenant plutôt que de le retirer plus tard. Au-delà de ce nombre ou de cette date, la
      grille s'applique sans remise.</li>
  <li><strong>Acompte de 40 % du montant hors taxes</strong>, avec un minimum de 900 €, à la
      confirmation. Il est déduit du total et <strong>remboursé intégralement si la saison ne
      démarre pas</strong> au sens de l'article « Démarrage ». La TVA est exigible dès son
      encaissement.</li>
  <li>Solde facturé à l'ouverture de la saison, payable à trente jours.</li>
  <li><strong>Escompte pour paiement comptant : 3 %</strong> en cas de règlement intégral à la
      commande.</li>
  <li><strong>Retard de paiement.</strong> Pénalités exigibles de plein droit, sans rappel, au
      <strong>taux de refinancement de la Banque centrale européenne en vigueur au 1<sup>er</sup>
      janvier ou au 1<sup>er</sup> juillet précédant l'échéance, majoré de dix points de
      pourcentage</strong>, sans pouvoir être inférieur à trois fois le taux d'intérêt légal
      (article L. 441-10 II du code de commerce). S'y ajoute l'indemnité forfaitaire de
      recouvrement de <strong>40 €</strong> par facture (article D. 441-5), et le complément
      justifié si les frais réellement engagés la dépassent.</li>
  <li><strong>Facturation électronique.</strong> Le client communique sa plateforme agréée de
      réception et son identifiant d'annuaire à la signature. <strong>À compter du
      1<sup>er</sup> septembre 2026</strong>, toute entreprise établie en France doit pouvoir
      recevoir ses factures sous ce format ; l'obligation de les émettre s'applique aux PME et
      microentreprises à compter du 1<sup>er</sup> septembre 2027.</li>
  <li>Aucune commission n'est prélevée sur les dons, qui ne transitent jamais par Riseva et ne
      figurent sur aucune facture.</li>
</ul>

<h2>4. Places</h2>
<p>L'abonnement ouvre un nombre de places égal à l'effectif déclaré. Un compte occupe une place.
Le retrait d'un salarié libère la sienne immédiatement. Des places peuvent être ajoutées en cours
de saison, au prorata.</p>

<h2>4 bis. Abonnement de groupe</h2>
<ul>
  <li>Le <strong>payeur</strong> et les <strong>bénéficiaires</strong> sont distincts et nommés
      au bon de commande : une société peut régler pour plusieurs sociétés du même groupe.</li>
  <li>Payer ne donne <strong>aucun droit</strong> sur les données personnelles des salariés
      d'une autre société. Les conventions et reçus de mécénat restent rattachés à l'employeur
      réel.</li>
  <li>Les places se répartissent en <strong>quotas par établissement</strong>. La somme des
      quotas ne peut pas dépasser les places du contrat, et un quota ne peut pas descendre en
      dessous des comptes déjà ouverts sur le site.</li>
  <li>Une <strong>clé de répartition analytique</strong>, au prorata des comptes ouverts, est
      exportable pour l'imputation interne.</li>
  <li>Le <strong>plafond fiscal de mécénat</strong> se calcule société par société. Riseva ne
      consolide jamais un plafond au niveau du groupe.</li>
  <li>Le prix d'un abonnement de groupe est établi sur devis, selon le nombre de sociétés,
      d'établissements et de comptes.</li>
</ul>

<h2>5. Obligations du client</h2>
<ul>
  <li>Déclarer un effectif exact : il détermine les places et le classement normalisé.</li>
  <li>Désigner au moins <strong>deux administrateurs</strong>.</li>
  <li>Déclarer les domaines de messagerie autorisés pour le lien d'inscription.</li>
  <li>Informer ses salariés et consulter son comité social et économique avant le déploiement.
      Riseva fournit les textes, la démarche appartient au client.</li>
  <li>Ne pas utiliser les données de la plateforme à des fins d'évaluation professionnelle,
      de décision de carrière, de rémunération ou de discipline.</li>
</ul>

<h2>6. Obligations de Riseva</h2>
<ul>
  <li>Fournir le service conformément aux <a href="/engagements.html">engagements de service</a>.</li>
  <li>Vérifier les associations selon la <a href="/charte-associations.html">charte</a>.</li>
  <li>Appliquer les <a href="/reglement.html">règles de la saison</a> de façon identique à tous.</li>
  <li>Traiter les données personnelles selon l'accord de sous-traitance annexé.</li>
  <li>Traiter les signalements selon la <a href="/moderation.html">politique de modération</a>.</li>
</ul>

<h2>7. Données, contenus et propriété intellectuelle</h2>
<p>On n'écrira pas ici que « le client est propriétaire de toutes les données » : les données
personnelles ne sont pas un bien appropriable, et l'écrire ferait joli sans rien vouloir dire.</p>
<ul>
  <li>L'<strong>entreprise</strong> conserve ses droits sur ses données et ses contenus.</li>
  <li>L'<strong>association</strong> conserve ses droits sur ses données, son nom et ses visuels.</li>
  <li><strong>Riseva</strong> reçoit uniquement la licence nécessaire pour héberger, reproduire et
      diffuser ces contenus pendant la durée du service, et pour rien d'autre.</li>
  <li>Riseva conserve ses droits sur le logiciel, la marque, le design, les modèles de documents
      et les règles de calcul.</li>
  <li>Le client reçoit un droit <strong>perpétuel</strong> d'utiliser et d'archiver les rapports
      qu'il a exportés, y compris après la fin du contrat.</li>
</ul>
<div class="encadre">
  <p><strong>Réutilisation des données.</strong> Riseva ne peut réutiliser des statistiques
  transversales que si elles sont <strong>réellement anonymisées de manière irréversible</strong>.
  Sont interdits sans accord écrit distinct : toute tentative de réidentification, la vente ou la
  cession des données clients, et leur usage pour entraîner un modèle d'intelligence
  artificielle.</p>
  <p>La publication du <strong>nom</strong> d'une entreprise dans un classement public suppose son
  acceptation explicite au bon de commande. Le client peut demander à tout moment d'y figurer de
  manière anonyme ou de ne plus y figurer, sous quinze jours.</p>
</div>

<h2>8. Garanties</h2>
<p>Riseva garantit :</p>
<ul>
  <li>un service substantiellement conforme à sa documentation ;</li>
  <li>une exécution professionnelle et diligente ;</li>
  <li>détenir les droits nécessaires sur le logiciel, et garantir le client contre toute
      réclamation de propriété intellectuelle le concernant ;</li>
  <li>une sécurité conforme à ce qui est décrit sur la page <a href="/securite.html">Sécurité</a> ;</li>
  <li>des sauvegardes et une restauration conformes aux RPO et RTO annoncés ;</li>
  <li><strong>l'exactitude du calcul par rapport au barème publié</strong> : une erreur avérée est
      corrigée rétroactivement et le classement recalculé ;</li>
  <li>la correction des anomalies critiques dans les délais des engagements de service.</li>
</ul>
<p>Riseva ne garantit <strong>pas</strong>, et c'est volontaire :</p>
<ul>
  <li>un taux de participation, un rang au classement, un impact social, ni une économie fiscale ;</li>
  <li>l'éligibilité fiscale d'une association. Elle garantit en revanche que le produit
      <strong>bloque l'émission</strong> quand les réglages sont incomplets, signale les données
      manquantes et reproduit fidèlement les paramètres validés par l'association ;</li>
  <li>l'exactitude du coût de revient déclaré par le client : la valorisation du mécénat de
      compétences relève de sa responsabilité, et sa déclaration fiscale aussi.</li>
</ul>
<p>L'association reste seule émettrice du reçu fiscal et seule à certifier son éligibilité.</p>

<h2>9. Responsabilité</h2>
<ul>
  <li>Riseva n'organise pas les missions de bénévolat et ne les assure pas. En cas de dommage
      pendant une mission, la relation demeure entre l'entreprise, l'association et le salarié.</li>
  <li>Sont indemnisables les <strong>dommages directs et prévisibles</strong> uniquement.</li>
  <li><strong>Plafond ordinaire</strong> : le montant des redevances hors taxes payées ou dues au
      titre de la saison concernée.</li>
  <li><strong>Plafond renforcé</strong> pour les manquements à la confidentialité, à la protection
      des données personnelles, à la sécurité et à la propriété intellectuelle : 50 000 €, ou
      trois fois la redevance annuelle si ce montant est supérieur.</li>
  <li><strong>Sans plafond</strong> : dol, faute lourde, dommages corporels, obligations de
      paiement, et tout ce que la loi interdit de limiter.</li>
</ul>

<h2>10. Réversibilité et sortie</h2>
<p>Le règlement européen sur les données couvre expressément les services en nuage depuis le
12 septembre 2025. Ce qui suit n'est donc pas une faveur.</p>
<ul>
  <li>Export de <strong>toutes</strong> les données saisies, produites et de leurs métadonnées
      pertinentes : entreprises, comptes, missions, validations, points bruts et retenus,
      justificatifs, conventions, émargements, rapports et historiques utiles.</li>
  <li>Formats structurés, courants et lisibles par machine, avec dictionnaire des données.</li>
  <li>Registre public à jour des formats et des éventuelles restrictions.</li>
  <li>Préavis de changement plafonné à deux mois.</li>
  <li>Transition de trente jours maximum ; une impossibilité technique doit être motivée sous
      quatorze jours ouvrables, prolongation maximale de sept mois.</li>
  <li>Suppression complète après récupération et sortie réussie, avec certificat.</li>
  <li><strong>Aucun frais de changement à compter du 12 janvier 2027.</strong> D'ici là, seuls des
      coûts directs démontrables pourraient être facturés ; Riseva y renonce par avance.</li>
</ul>

<h2>11. Suspension et résiliation</h2>
<ul>
  <li>Un impayé suspend la publication de nouvelles missions. Il ne coupe jamais l'accès en
      lecture, ne supprime aucune donnée et n'annule aucun point acquis.</li>
  <li>Le client peut résilier à tout moment, avec remboursement au prorata si le manquement
      vient de Riseva.</li>
  <li>Riseva peut résilier en cas de non-paiement persistant après deux relances écrites, ou de
      fraude établie au sens des règles de la saison.</li>
  <li>Dans tous les cas, les données restent exportables trente jours.</li>
</ul>

<h2>11 bis. Durées de conservation</h2>
<table>
  <thead><tr><th>Donnée</th><th>Durée</th></tr></thead>
  <tbody>
    <tr><td>Données opérationnelles de la saison</td><td>Durée de la saison, puis 90 jours pour corrections et export, puis suppression ou anonymisation sauf instruction d'archivage du client</td></tr>
    <tr><td>Compte après résiliation</td><td>Export et récupération pendant 30 jours au moins, puis suppression de production</td></tr>
    <tr><td>Sauvegardes</td><td>Purge glissante, 30 à 60 jours après la suppression de production</td></tr>
    <tr><td>Journaux de sécurité</td><td>12 mois, davantage seulement en cas d'incident ou de contentieux</td></tr>
    <tr><td>Contrat, commande, acceptation</td><td>5 ans après la fin de la relation commerciale</td></tr>
    <tr><td>Factures et pièces comptables</td><td>10 ans, durée légale</td></tr>
    <tr><td>Justificatifs fiscaux et pièces de mécénat</td><td>Durée fixée par l'entreprise ou l'association, en pratique 6 ans</td></tr>
    <tr><td>Opposition à la prospection</td><td>Aussi longtemps que nécessaire pour ne pas recontacter, accès très restreint</td></tr>
  </tbody>
</table>
<div class="encadre encadre--alerte">
  <p><strong>Riseva n'est pas votre archive légale.</strong> Les conventions, émargements et
  justificatifs fiscaux restent conservés par l'entreprise et l'association, à qui la loi impose
  de les produire en cas de contrôle. Riseva les prépare, les met à disposition et les conserve
  le temps du service, mais ne prend aucun engagement d'archivage à valeur probante, sauf accord
  écrit distinct.</p>
</div>

<h2>12. Confidentialité et assurance</h2>
<p>Chaque partie garde confidentielles les informations de l'autre pendant le contrat et trois ans
après. Riseva est assurée en responsabilité civile professionnelle ; l'attestation est jointe au
devis.</p>

<h2>13. Droit applicable et juridiction</h2>
<p>Droit français. Les parties recherchent d'abord une solution amiable.</p>
<p><strong>À défaut, et uniquement entre Riseva et une entreprise cliente ayant contracté dans le
cadre de son activité commerciale</strong>, compétence est attribuée aux tribunaux du ressort du
siège de Riseva, conformément à l'article 48 du code de procédure civile. Cette clause est écrite
en gras parce que le texte exige qu'elle soit très apparente.</p>
<p>Elle ne s'applique <strong>ni aux associations, ni aux salariés, ni à aucun donateur
particulier</strong> : les règles ordinaires de compétence valent pour eux, et notamment celles
qui protègent le consommateur. Étendre une clause de juridiction à des personnes qui n'ont pas
contracté comme commerçants la rendrait nulle, et donnerait mauvaise impression à juste titre.</p>
""")

# ---------------------------------------------------------------- modération
ecrire("moderation.html",
  surtitre="Le dossier achats",
  titre="Modération des annonces",
  description="Comment Riseva traite un signalement, dans quels délais, et selon quelles règles.",
  chapo="Riseva héberge et diffuse des annonces écrites par des associations. Cela fait d'elle "
        "un hébergeur, avec les obligations qui vont avec, quelle que soit sa taille.",
  corps="""
<h2>Ce que nous sommes</h2>
<p>Riseva stocke et rend publiques des annonces fournies par des tiers, les associations
partenaires. Cette activité relève du <strong>service d'hébergement</strong> au sens du règlement
sur les services numériques. L'article 16, qui impose un mécanisme de signalement, s'applique
<strong>quelle que soit la taille de l'hébergeur</strong>. Certaines obligations de publication
sont allégées pour les micro et petites entreprises, mais pas celle-là.</p>
<p>Riseva n'écrit pas les annonces, ne les commande pas et n'en garantit pas le contenu. Elle
les vérifie à l'entrée de l'association dans le réseau, selon la
<a href="/charte-associations.html">charte</a>, et les modère ensuite sur signalement.</p>

<h2>Signaler une annonce</h2>
<p>Un bouton <strong>Signaler</strong> figure sur chaque annonce, dans tous les espaces, sans
avoir à chercher. Le formulaire demande un motif et des précisions factuelles.</p>
<table>
  <thead><tr><th>Motif</th><th>Ce qu'il couvre</th></tr></thead>
  <tbody>
    <tr><td>Hors objet</td><td>L'annonce n'a pas de rapport avec l'objet déclaré de l'association</td></tr>
    <tr><td>Trompeur</td><td>La description ne correspond pas à ce qui est réellement demandé</td></tr>
    <tr><td>Illicite</td><td>Contenu contraire à la loi</td></tr>
    <tr><td>Dangereux</td><td>Mission présentant un risque sans encadrement adapté</td></tr>
    <tr><td>Données personnelles</td><td>Informations personnelles exposées dans l'annonce</td></tr>
  </tbody>
</table>

<h2>Ce qui se passe ensuite</h2>
<ul>
  <li><strong>Accusé de réception immédiat</strong>, à l'écran et par mail.</li>
  <li><strong>Décision sous cinq jours ouvrés</strong>, et sous vingt-quatre heures si le
      signalement porte sur un danger ou un contenu manifestement illicite.</li>
  <li><strong>Décision motivée</strong>, notifiée à l'auteur du signalement et à l'association.
      Une décision sans motivation n'est pas acceptée par la plateforme : le champ est obligatoire,
      techniquement.</li>
  <li>Si l'annonce est retirée, elle est fermée immédiatement et les entreprises engagées
      sont prévenues.</li>
  <li>L'association peut contester par écrit. Le réexamen est fait par une autre personne
      que celle qui a décidé.</li>
</ul>

<h2>Mesures d'urgence</h2>
<p>En cas de danger pour des personnes, l'annonce est retirée d'abord et la motivation vient
ensuite, dans les vingt-quatre heures. C'est le seul cas où nous agissons avant d'expliquer.</p>

<h2>Ce que nous conservons</h2>
<ul>
  <li>Les signalements, leur motif, la décision et sa motivation : douze mois.</li>
  <li>Le nombre de signalements reçus, traités et le délai moyen : publiés une fois par an
      dans le rapport de saison.</li>
</ul>

<h2>Abus</h2>
<p>Un signalement manifestement infondé, répété, peut entraîner la suspension du compte qui
l'émet. Nous prévenons avant de suspendre.</p>

<h2>Nous écrire</h2>
<p>Pour tout ce que le formulaire ne couvre pas :
<a href="mailto:contact@riseva.fr" style="color:var(--forest-800)">contact@riseva.fr</a>.
Réponse sous deux jours ouvrés.</p>
""")

# ---------------------------------------------------------------- mentions légales
# La base légale a changé et beaucoup de modèles en ligne ne l'ont pas vu : depuis
# la loi SREN du 21 mai 2024, l'obligation ne vit plus à l'article 6 III de la LCEN
# - qui n'existe plus - mais à l'**article 1-1**, avec les sanctions à l'article
# 1-2. Le SREN a aussi ajouté une mention que personne n'avait avant : les
# sous-traitants qui stockent les données (art. 1-1, I, 5°).
# Trois mentions dépendent d'une immatriculation qui n'est pas encore délivrée. On
# ne les invente pas : on dit lesquelles manquent, pourquoi, et quand elles
# paraîtront. Une mention légale fausse est plus grave qu'une mention légale
# incomplète et datée.
ecrire("mentions.html",
  surtitre="Informations légales",
  titre="Mentions légales",
  description="Qui édite ce site, qui l'héberge, qui répond, et ce qui reste à publier.",
  chapo="Ces mentions sont exigées par l'article 1-1 de la loi du 21 juin 2004 pour la "
        "confiance dans l'économie numérique, dans sa rédaction issue de la loi du 21 mai 2024 "
        "visant à sécuriser et réguler l'espace numérique. Elles sont ici en entier, y compris "
        "ce qui manque encore et la date à laquelle cela paraîtra.",
  corps="""
<h2>Éditeur du site</h2>
<table class="table">
  <tbody>
    <tr><td>Dénomination</td><td><strong>Riseva</strong></td></tr>
    <tr><td>Directeur de la publication</td><td>Yacine Bounoua, fondateur</td></tr>
    <tr><td>Contact</td>
        <td><a href="mailto:contact@riseva.fr" style="color:var(--forest-800)">contact@riseva.fr</a></td></tr>
    <tr><td>Forme juridique, SIREN, RCS, TVA</td>
        <td><em>Immatriculation en cours.</em> Ces quatre mentions seront publiées ici le jour
            où le greffe les délivre, et la date de mise à jour de cette page le montrera.</td></tr>
    <tr><td>Siège social et téléphone</td>
        <td><em>Publiés en même temps que l'immatriculation.</em> D'ici là, le courriel
            ci-dessus est le canal officiel et il est relevé tous les jours ouvrés.</td></tr>
  </tbody>
</table>
<p class="hint">Nous ne signons aucun contrat commercial avant que ces mentions soient complètes.
Une plateforme qui facture sans être immatriculée n'est pas une plateforme, c'est un problème.
L'article 1-2 de la même loi punit l'absence de ces mentions d'un an d'emprisonnement et de
75 000 € d'amende, portés à 375 000 € pour une personne morale : ce n'est pas une formalité.</p>

<h2>Hébergement et sous-traitants de stockage</h2>
<p>L'article 1-1, I, 4° exige le nom, l'adresse et le téléphone du fournisseur d'hébergement ;
le 5°, ajouté par la loi du 21 mai 2024, exige en plus l'identité des sous-traitants qui stockent
les données. Voici les deux, sans distinction, parce que chez nous ce sont les mêmes.</p>
<p>Les données sont hébergées dans l'Union européenne. Les sociétés qui exploitent ces
infrastructures sont, elles, de droit américain, c'est un fait, et il est traité pour ce qu'il
est dans notre <a href="/confidentialite.html" style="color:var(--forest-800)">politique de
confidentialité</a> et dans l'accord de sous-traitance remis à chaque client.</p>
<table class="table">
  <tbody>
    <tr><td>Application et diffusion</td>
        <td><strong>Vercel Inc.</strong>, 440 N Barranca Avenue #4133, Covina, CA 91723,
            États-Unis, <a href="https://vercel.com/legal/privacy-policy"
            style="color:var(--forest-800)">vercel.com/legal</a>, privacy@vercel.com.
            Région d'hébergement : Union européenne.</td></tr>
    <tr><td>Base de données, authentification et stockage</td>
        <td><strong>Supabase, Inc.</strong>, société de droit américain ,
            <a href="https://supabase.com/privacy" style="color:var(--forest-800)">supabase.com/privacy</a>,
            privacy@supabase.com. Région d'hébergement : Union européenne.</td></tr>
    <tr><td>Messages transactionnels</td>
        <td><strong>Resend</strong>, <a href="https://resend.com/legal/privacy-policy"
            style="color:var(--forest-800)">resend.com/legal</a>. Région d'envoi :
            Union européenne.</td></tr>
  </tbody>
</table>
<p class="hint">Aucun de ces trois prestataires ne publie de numéro de téléphone : ils indiquent
une adresse électronique comme canal de contact, et c'est celle que nous reproduisons. Nous ne
composons pas un numéro pour combler une case. Si l'un d'eux nous communique un numéro, il
paraîtra ici le jour même.</p>

<h2>Propriété intellectuelle</h2>
<p>Le code, les textes, les visuels et la marque Riseva appartiennent à l'éditeur. Les données
saisies par les clients et les associations leur appartiennent : nous n'en revendiquons aucun
droit, et elles ressortent dans un format ouvert à tout moment, y compris en cas d'impayé.</p>
<p>Les données d'entreprises affichées dans l'annuaire proviennent de l'API Recherche
d'entreprises de la Direction interministérielle du numérique, sous
<strong>Licence Ouverte 2.0</strong>. Les données du Répertoire national des associations
proviennent du ministère de l'Intérieur, sous la même licence.</p>

<h2>Données personnelles</h2>
<p>Ce que nous collectons, pourquoi, combien de temps nous le gardons et comment exercer vos
droits : tout est détaillé sur la page
<a href="/confidentialite.html" style="color:var(--forest-800)">Données personnelles</a>.
Pour l'essentiel : Riseva est <strong>sous-traitant</strong> de ses clients pour les données de
leurs salariés, et <strong>responsable de traitement</strong> pour ses propres prospects et pour
les comptes des associations.</p>
<p>Vous pouvez à tout moment introduire une réclamation auprès de la Commission nationale de
l'informatique et des libertés, 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07.</p>

<h2>Dons</h2>
<p>Riseva <strong>n'encaisse pas les dons</strong> et n'est pas un établissement de paiement au
sens de l'article L. 522-1 du code monétaire et financier. Les paiements par carte sont encaissés
par <strong>HelloAsso</strong> pour le compte de l'association bénéficiaire, sur l'organisation
que celle-ci a elle-même autorisée depuis son compte HelloAsso ; les fonds ne transitent à aucun
moment par Riseva, qui ne prélève aucune commission. Riseva ouvre l'intention de paiement au nom
de l'association et n'a accès ni à ses identifiants, ni à ses fonds. L'autorisation est révocable
à tout moment par l'association, depuis son espace ou depuis son compte HelloAsso.</p>
<p>Le virement bancaire direct reste possible pour les associations qui n'ont pas connecté de
compte HelloAsso : dans ce cas, Riseva fournit la référence qui permet à l'association de
rapprocher le virement du don annoncé, et c'est elle qui confirme la réception.</p>
<p>Le reçu fiscal est émis par l'association elle-même, sous sa seule responsabilité. Riseva le
prépare sur <strong>mandat écrit et révocable</strong>, et ne juge jamais de l'éligibilité de
l'association au régime de l'article 200 ou 238 bis du code général des impôts.</p>

<h2>Responsabilité</h2>
<p>Riseva met en relation des entreprises et des associations. Elle n'organise pas les missions,
ne les encadre pas et ne les assure pas. Pendant une mission, le salarié reste sous contrat avec
son employeur ; l'association exerce l'autorité fonctionnelle sur la tâche, pas le pouvoir
disciplinaire. En cas d'incident, la responsabilité relève de l'entreprise et de l'association
concernées, chacune pour ce qui la regarde.</p>
<p>Les limites de responsabilité contractuelle figurent aux
<a href="/cgv.html" style="color:var(--forest-800)">conditions de vente</a>. Elles ne couvrent
ni le dommage corporel, ni la faute lourde, ni le dol : la loi ne le permettrait pas, et nous
n'essayons pas.</p>

<h2>Litiges et médiation</h2>
<p>Riseva contracte exclusivement avec des <strong>professionnels</strong>, entreprises et
associations agissant dans le cadre de leur objet. Le dispositif de médiation de la consommation
des articles L. 611-1 et suivants du code de la consommation n'est donc pas étendu à ces
contrats, y compris lorsque le client bénéficie du droit de rétractation de l'article L. 221-3
(voir l'article 2 bis des <a href="/cgv.html" style="color:var(--forest-800)">conditions de
vente</a>) : cet article étend les sections sur l'information et la rétractation, pas le titre
sur la médiation.</p>
<p>Avant toute action, les parties s'engagent à une phase de discussion de trente jours. À défaut
d'accord, compétence des tribunaux dans les conditions prévues aux conditions de vente.</p>

<h2>Signalement de contenu</h2>
<p>Une annonce qui vous paraît trompeuse, dangereuse ou illicite se signale depuis la fiche
elle-même, ou par courriel. La procédure, les délais et ce que nous conservons sont décrits sur
la page <a href="/moderation.html" style="color:var(--forest-800)">Modération des annonces</a>.</p>
""")
