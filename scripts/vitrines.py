#!/usr/bin/env python3
"""Les deux vitrines : une pour les entreprises, une pour les associations.

    python3 scripts/vitrines.py

Elles partagent la charte — papier crème, encre noire, lime, rubans, vagues,
parallaxe, révélations au défilement — et rien d'autre. Ce ne sont pas deux
versions d'une même page : ce sont deux sites, deux promesses, deux parcours.
Une présidente d'association n'a rien à faire dans un argumentaire d'achat, et
un responsable RSE n'a rien à faire dans une charte de partenariat.

Le squelette est commun pour que les deux ne divergent jamais par accident ;
le contenu est écrit deux fois, exprès.

Règles qui tiennent sur les deux pages, et que la recette vérifie :
— aucun chiffre issu du jeu de démonstration ;
— trois formats, dont le don par virement direct : Riseva n'encaisse jamais ;
— la formule canonique des quatorze jours, mot pour mot ;
— aucune requête vers un domaine tiers, polices comprises.
"""
import io, pathlib, re

RACINE = pathlib.Path(__file__).resolve().parent.parent
PUBLIC = RACINE / "public"
RUBANS = (RACINE / "scripts" / "fragments-rubans.html").read_text(encoding="utf-8").strip()

# ---------------------------------------------------------------------------
# La grille tarifaire n'est pas recopiée ici : elle est lue dans `data.js`, qui
# en est la seule source. Un prix affiché sur la vitrine et un prix facturé par
# la plateforme qui divergent, c'est le genre d'erreur qu'un client découvre au
# moment de signer. La recette vérifie en plus que les deux coïncident.
def lire_tarifs():
    src = (PUBLIC / "app" / "data.js").read_text(encoding="utf-8")
    bloc = src[src.index("export const TARIFS = {"):src.index("export const palierPour")]
    paliers = []
    for m in re.finditer(
        r"\{ id:\"(\w+)\",\s*max:([^,]+),\s*prix:(\d+),\s*sites:(\d+),\s*label:\"([^\"]+)\"",
        bloc):
        paliers.append({"id": m.group(1), "max": m.group(2).strip(), "prix": int(m.group(3)),
                        "sites": int(m.group(4)), "label": m.group(5)})
    un = lambda cle: re.search(cle + r":\s*([\d.]+)", bloc).group(1)
    return {
        "paliers": paliers,
        "site_sup": int(un("site_supplementaire")),
        "fondateur_taux": float(un("taux")),
        "fondateur_places": int(un("places")),
        "acompte_taux": float(un("acompte_taux")),
        "remise_comptant": float(un("remise_comptant")),
        "affiches": int(un("envois_affiches_par_saison")),
        "inclus": re.findall(r'"([^"]+)"', bloc[bloc.index("inclus: ["):bloc.index("exclus: [")]),
        "exclus": re.findall(r'"([^"]+)"', bloc[bloc.index("exclus: ["):]),
    }

TARIFS = lire_tarifs()
EUR = lambda n: f"{n:,}".replace(",", "\u202f") + " €"


FEUILLE = "riseva-mark"   # favicon

# ── briques communes ────────────────────────────────────────────────────────

LOGO = """<svg viewBox="0 0 24 24" aria-hidden="true">
      <path class="lf" d="M12 2.4c5 5.6 7.7 9.3 7.7 13a7.7 7.7 0 0 1-15.4 0c0-3.7 2.7-7.4 7.7-13z"></path>
      <path d="M12 21.6V9.2" fill="none" stroke="#131510" stroke-width="1.3" stroke-linecap="round"></path>
    </svg>"""

LOGO_PIED = """<svg viewBox="0 0 24 24" aria-hidden="true">
          <path class="lf" d="M12 2.4c5 5.6 7.7 9.3 7.7 13a7.7 7.7 0 0 1-15.4 0c0-3.7 2.7-7.4 7.7-13z"></path>
        </svg>"""


def nav(liens, cta_texte, cta_href, note):
    """La barre du haut, et le panneau qui la remplace sous mille pixels."""
    grands = "\n    ".join(f'<a href="#{i}">{t}</a>' for i, t in liens)
    petits = "\n    ".join(
        f'<a href="#{i}"><span class="mono">{n:02d}</span>{t}</a>'
        for n, (i, t) in enumerate(liens, 1))
    return f"""<nav class="nav" id="nav">
  <a class="nav-brand" href="#hero" aria-label="Riseva, accueil">
    {LOGO}
    Riseva
  </a>
  <div class="nav-links">
    {grands}
  </div>
  <a class="btn" href="{cta_href}"><span class="dot"></span>{cta_texte}</a>
  <button class="nav-burger" id="navBurger" type="button"
          aria-expanded="false" aria-controls="navSheet" aria-label="Ouvrir le menu">
    <span></span><span></span>
  </button>
</nav>

<div class="nav-sheet" id="navSheet" hidden>
  <nav aria-label="Menu principal">
    {petits}
  </nav>
  <a class="btn btn-lg" href="{cta_href}"><span class="dot"></span>{cta_texte}</a>
  <p class="mono">{note}</p>
</div>"""


def pied(pitch, colonnes, barre):
    cols = ""
    for titre, items in colonnes:
        lis = "\n        ".join(f'<li><a href="{h}">{t}</a></li>' for h, t in items)
        cols += f"""
    <div>
      <h3 class="foot-h">{titre}</h3>
      <ul>
        {lis}
      </ul>
    </div>"""
    return f"""<footer class="foot">
  <div class="foot-grid">
    <div>
      <div class="foot-brand">
        {LOGO_PIED}
        Riseva
      </div>
      <p>{pitch}</p>
    </div>{cols}
  </div>
  <div class="foot-bar">
    <span>© 2026 Riseva</span>
    <span>{barre}</span>
  </div>
</footer>"""


def ticker(mots):
    """Le bandeau qui défile. Deux groupes identiques : le second cache la couture."""
    g = "\n    ".join(f'<span class="tick-i">{m}</span>' for m in mots * 2)
    return f"""<div class="tick" aria-label="Les causes soutenues">
  <div class="tick-g">
    {g}
  </div>
  <div class="tick-g" aria-hidden="true">
    {g}
  </div>
</div>"""


def page(*, fichier, titre, description, corps, nav_html, pied_html, canonique,
         classe_corps="", rubans=True):
    """`rubans` : les lianes vertes qui traversent la page de haut en bas.

    Elles ne représentent ni une progression, ni un réseau, ni une donnée : ce
    sont des ornements posés dans les espaces disponibles, et c'est exactement
    le procédé qui fait lire une page comme « générée ». La vitrine entreprises
    s'en passe. La page associations les garde : elle s'adresse à des bénévoles,
    pas à un acheteur qui cherche une raison de faire confiance."""
    classe = f' class="{classe_corps}"' if classe_corps else ""
    decor = RUBANS if rubans else ""
    html = f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{titre}</title>
<meta name="description" content="{description}">
<meta name="theme-color" content="#FCFBF8">
<link rel="canonical" href="https://riseva.fr{canonique}">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
<meta property="og:site_name" content="Riseva">
<meta property="og:title" content="{titre}">
<meta property="og:description" content="{description}">
<meta property="og:url" content="https://riseva.fr{canonique}">
<link rel="icon" href="/brand/{FEUILLE}.png">
<link rel="stylesheet" href="/styles/polices.css">
<link rel="stylesheet" href="/styles/vitrine.css">
</head>
<body{classe}>
{decor}

<a class="sr-only" href="#hero">Aller au contenu</a>

{nav_html}

{corps}

{pied_html}

<script src="/app/config.js" onerror="void 0"></script>
<script src="/vitrine.js" defer></script>
</body>
</html>
"""
    (PUBLIC / fichier).write_text(html, encoding="utf-8")
    return fichier


LIGNE_SAISON = (RACINE / "scripts" / "fragments-ligne-saison.html").read_text(encoding="utf-8").strip()


def entete(eyebrow, titre, note):
    return f"""    <div class="s-head">
      <div class="rv">
        <div class="eyebrow mono">{eyebrow}</div>
        <h2>{titre}</h2>
      </div>
      <p class="s-note rv d2">{note}</p>
    </div>"""


def etapes(items):
    out = ""
    for n, (quand, titre, corps) in enumerate(items):
        d = f" d{n}" if n else ""
        out += f"""
        <li class="rv{d}">
          <b class="mono">{n + 1:02d} · {quand}</b>
          <h3>{titre}</h3>
          <p>{corps}</p>
        </li>"""
    return f"""    <div class="sais">
      {LIGNE_SAISON}
      <ol class="sais-steps">{out}
      </ol>
    </div>"""


def formats(items):
    out = ""
    for n, (cle, titre, corps) in enumerate(items):
        d = " d1" if n >= 2 else ""
        out += f"""
      <li class="fx-i rv{d}">
        <span class="fx-n">{n + 1:02d}</span>
        <div>
          <div class="fx-k">{cle}</div>
          <h3 class="fx-h">{titre}</h3>
          <p class="fx-p">{corps}</p>
        </div>
      </li>"""
    return f'    <ol class="fx">{out}\n    </ol>'


def retombees(items):
    out = ""
    for n, (titre, corps, chiffre, source) in enumerate(items):
        d = f" d{n}" if n else ""
        fait = (f'<span class="ret-fact"><b><i>{chiffre}</i></b><em>{source}</em></span>'
                if chiffre else "")
        out += f"""
        <li class="rv{d}">
          <span class="ret-n mono">{n + 1:02d}</span>
          <div class="ret-body"><h3>{titre}</h3><p>{corps}</p></div>
          {fait}
        </li>"""
    return f'      <ol class="ret">{out}\n      </ol>'


def roles(fait_titre, fait, pas_titre, pas):
    lf = "\n          ".join(f"<li><i></i>{x}</li>" for x in fait)
    lp = "\n          ".join(f"<li><i></i>{x}</li>" for x in pas)
    return f"""    <div class="roles">
      <div class="role role-do rv">
        <h3>{fait_titre}</h3>
        <ul>
          {lf}
        </ul>
      </div>
      <div class="role role-dont rv d2">
        <h3>{pas_titre}</h3>
        <ul>
          {lp}
        </ul>
      </div>
    </div>"""


def faits(items):
    """Les chiffres du contexte. Chacun porte sa source et sa date : sans ça,
       c'est une opinion avec une décimale."""
    out = ""
    for quand, quoi, titre, corps, source in items:
        out += f"""
      <li class="fact rv">
        <div class="fact-when"><span class="mono">{quand}</span><span class="mono">{quoi}</span></div>
        <div class="fact-body">
          <p class="fact-lead">{titre}</p>
          <p class="fact-more">{corps}</p>
          <p class="fact-src mono">{source}</p>
        </div>
      </li>"""
    return f'    <ol class="facts-list">{out}\n    </ol>'


def confluent(eyebrow, mots, lede, cta_texte, cta_href, note, perks, photo="/photos/forest.jpg"):
    ms = " ".join(f'<span class="w{" it" if it else ""}">{m}</span>' for m, it in mots)
    ps = "\n        ".join(
        f'<li><span>{i + 1:02d}</span>{p}</li>' for i, p in enumerate(perks))
    return f"""<section id="confluent" class="conf">
  <div class="conf-photo" aria-hidden="true">
    <img src="{photo}" alt="" loading="lazy" decoding="async" width="900" height="600">
  </div>
  <div class="conf-veil" aria-hidden="true"></div>

  <div class="conf-in">
    <div class="eyebrow mono rv">{eyebrow}</div>
    <h2 class="conf-h" id="confH">{ms}</h2>
    <div class="conf-grid">
      <div class="rv d2">
        <p class="conf-lede">{lede}</p>
        <div class="conf-cta">
          <a class="btn btn-lg" href="{cta_href}"><span class="dot"></span>{cta_texte}</a>
          <span class="conf-note">{note}</span>
        </div>
      </div>
      <ol class="conf-perks rv d3">
        {ps}
      </ol>
    </div>
  </div>
</section>"""


def faq(items):
    idx = "\n      ".join(
        f'<li><button class="qa-link mono{" is-on" if not i else ""}" type="button" '
        f'role="tab" aria-selected="{"true" if not i else "false"}">'
        f'<span class="qa-n">{i + 1:02d}</span>{q}</button></li>'
        for i, (q, _) in enumerate(items))
    cards = "\n      ".join(
        f'<article class="qa-card{" is-on" if not i else ""}"{"" if not i else " hidden"}>'
        f'<h3 class="qa-t">{q}</h3>{r}</article>'
        for i, (q, r) in enumerate(items))
    return f"""<section id="faq" class="band">
  <div class="layer">
{entete("La FAQ", "Ce qu'on nous demande<br><span class='it'>vraiment.</span>",
        "Les questions posées en rendez-vous, avec les réponses données en rendez-vous. Si la vôtre manque, écrivez-la-nous : elle finira ici.")}
    <div class="qa-split">
      <ol class="qa-index rv" id="qaIndex" role="tablist" aria-label="Sommaire des questions">
      {idx}
      </ol>
      <div class="qa-panel rv d2" id="qaPanel">
      {cards}
      </div>
    </div>
  </div>
</section>"""


# ═══════════════════════════════════════════════════════════════════════════
#  VITRINE ENTREPRISES
#
#  Réécrite entièrement. L'ancienne version faisait 18 258 pixels de haut,
#  douze sections, soixante-douze apparitions au défilement et seize photos de
#  banque d'images montrant des cadres souriants en open space — pour un produit
#  dont le métier est le ramassage de déchets en rivière, la plantation d'arbres
#  et les refuges animaliers.
#
#  Le diagnostic n'était pas « c'est moche ». C'était : la page est faite
#  d'ARGUMENTS là où elle devrait être faite de PREUVES. Un dirigeant devait
#  croire deux paragraphes avant de voir quoi que ce soit du produit.
#
#  Trois règles tiennent la nouvelle version.
#
#  1. Une affirmation, un objet. Chaque section porte une capture prise dans
#     l'application par scripts/captures.py, avec le vrai jeu de démonstration.
#     Faute de photographies réelles de chantier — Riseva n'en a aucune — la
#     seule preuve disponible est le produit lui-même. Une photo d'illustration
#     n'est pas une preuve, et la légende « aucune mise en scène » ne la rachète
#     pas : elle confirme au lecteur que l'image ne prouve rien.
#
#  2. L'ordre des sections est l'ordre des objections, pas l'ordre du plan
#     commercial. Un dirigeant de PME industrielle se demande d'abord qui va
#     gérer ça chez lui, ensuite si ses équipes suivront, ensuite s'il y a des
#     associations autour de son usine, ensuite ce qu'il y gagne, et le prix
#     traverse tout : il est donc donné dès le premier écran.
#
#  3. Le contenu est visible par défaut. Aucune classe `rv` sur cette page :
#     une animation peut accompagner l'apparition d'un contenu, jamais la
#     conditionner. Soixante-douze éléments qui attendent un défilement, c'est
#     soixante-douze occasions de ne rien afficher du tout.
# ═══════════════════════════════════════════════════════════════════════════

NAV_ENT = nav(
    [("saison", "Le déroulé"), ("equipes", "Côté salariés"),
     ("associations", "Côté associations"), ("pilotage", "Ce que vous pilotez"),
     ("prix", "Le prix"), ("preuve", "Ce qu'on ne promet pas"), ("faq", "Questions")],
    "Explorer la plateforme", "/app/", "Données fictives, aucun rendez-vous")

PIED_ENT = pied(
    "Riseva met des entreprises françaises au service des associations qui protègent "
    "le vivant, partout en France. Une saison, un barème public, un rapport qui tient debout.",
    [("La saison", [("#saison", "Le déroulé"), ("#equipes", "Côté salariés"),
                    ("#associations", "Côté associations"),
                    ("#pilotage", "Ce que vous pilotez"), ("#perimetres", "Groupes et services RSE"),
                    ("#prix", "Le prix")]),
     ("Les règles", [("/reglement.html", "Le règlement du barème"),
                     ("/engagements.html", "Engagements de service"),
                     ("/securite.html", "Sécurité"),
                     ("/confidentialite.html", "Confidentialité")]),
     ("Aller plus loin", [("/associations.html", "Vous êtes une association"),
                          ("/inscription.html", "Réserver une place"),
                          ("mailto:contact@riseva.fr", "contact@riseva.fr"),
                          ("/mentions.html", "Mentions légales")])],
    "Saison 2027 · préinscriptions ouvertes")


# ── briques de preuve ───────────────────────────────────────────────────────

def dimensions(chemin):
    """Largeur et hauteur d'un JPEG, lues dans ses marqueurs.

    Sans ces deux attributs sur la balise, le navigateur ne connaît pas le
    rapport de l'image avant de l'avoir chargée : le texte descend d'un cran au
    moment où elle arrive. Sur une page qui n'est plus faite que de captures,
    ce serait la page entière qui sauterait. Elles sont donc lues dans le
    fichier au moment de la génération, jamais recopiées à la main."""
    d = chemin.read_bytes()
    i = 2
    while i < len(d):
        if d[i] != 0xFF:
            i += 1; continue
        m = d[i + 1]
        if m in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7,
                 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
            h = int.from_bytes(d[i + 5:i + 7], "big")
            w = int.from_bytes(d[i + 7:i + 9], "big")
            return w, h
        if m in (0xD8, 0xD9) or 0xD0 <= m <= 0xD7:
            i += 2; continue
        i += 2 + int.from_bytes(d[i + 2:i + 4], "big")
    raise ValueError(f"dimensions introuvables : {chemin}")


def capture(nom, alt, legende, classe="", eager=False):
    """Une capture de l'application, avec ce qu'elle est écrit dessous.

    La légende n'est pas décorative : elle dit de quel écran il s'agit et que
    les chiffres viennent d'un jeu de démonstration. Une capture sans cette
    mention se lit comme un résultat obtenu, et nous n'en avons aucun.

    La mention est ajoutée ici, pas recopiée dans chaque appel : une règle qu'on
    répète à la main est une règle qu'on finit par oublier une fois — et cette
    fois-là est celle où la page affirme un résultat que personne n'a produit."""
    fichier = PUBLIC / "captures" / f"{nom}.jpg"
    if not fichier.exists():
        raise SystemExit(f"capture manquante : {fichier}\n"
                         f"Lancez d'abord : python3 scripts/captures.py")
    w, h = dimensions(fichier)
    charge = 'loading="eager" fetchpriority="high"' if eager else 'loading="lazy"'
    return f"""<figure class="shot{classe}">
        <img src="/captures/{nom}.jpg" alt="{alt}" {charge} decoding="async"
             width="{w}" height="{h}">
        <figcaption class="mono">{legende}
          <span class="shot-demo">Jeu de démonstration &mdash; aucun résultat réel</span>
        </figcaption>
      </figure>"""


def objection(question, reponse):
    """L'objection telle qu'elle se formule vraiment, et la réponse en une phrase."""
    return f"""<div class="obj">
      <p class="obj-q">« {question} »</p>
      <p class="obj-r">{reponse}</p>
    </div>"""


HERO_ENT = f"""<header class="hero hero--doc" id="hero">
  <div class="layer">
    <p class="eyebrow mono">Plateforme RSE pour PME et groupes multi-sites</p>
    <h1 class="h1 h1--doc">Des actions locales pour vos équipes.<br>
      <span class="it">Des résultats documentés pour l'entreprise.</span></h1>

    <div class="doc-tete">
    <div class="doc-intro">
      <p>Riseva organise une <b>saison d'engagement</b> d'un an autour d'<b>associations
        vérifiées</b> proches de vos sites. Vos salariés choisissent une action, l'association
        confirme ce qui a été réalisé, et vos rapports se construisent au fil de l'année.</p>
      <p>Autour de cet axe, la <b>gestion RSE</b> qui va avec : indicateurs sociaux et sécurité
        collectés site par site, registre des accidents, plan d'actions, accès en lecture pour le
        CSE, rapports trimestriels et annuel. Tout est dans l'abonnement,
        <b>sans module en supplément</b>. Un classement situe les entreprises entre elles,
        <b>sans nommer la moitié basse</b> : exposer les derniers punit ceux qui participent.</p>
      <div class="hero-cta">
        <a class="btn btn-lg" href="/app/"><span class="dot"></span>Explorer la plateforme</a>
        <a class="tlink" href="#pilotage">Voir un rapport</a>
      </div>
      <p class="doc-micro mono">Démonstration libre, données fictives. Aucun rendez-vous,
        aucune carte bancaire.</p>
    </div>

    <dl class="fiche">
      <div><dt class="mono">Saison</dt><dd>12 mois, sans reconduction tacite</dd></div>
      <div><dt class="mono">Déploiement</dt><dd>un lien à diffuser, rien à installer</dd></div>
      <div><dt class="mono">Périmètre</dt><dd>une entreprise, ou un groupe multi-sites</dd></div>
      <div><dt class="mono">Tarif</dt><dd>de <b>{EUR(TARIFS['paliers'][0]['prix'])[:-2]} à
        {EUR(TARIFS['paliers'][-1]['prix'])} HT</b> l'an selon l'effectif, un à douze sites
        compris. Pas de facturation par salarié, pas de commission sur les dons.</dd></div>
      <div><dt class="mono">Lancement</dt><dd>&minus;10 % pour les 20 premières entreprises,
        sur leur première saison</dd></div>
      <div><dt class="mono">Le dossier</dt><dd><a href="/reglement.html">le règlement de la
        saison</a>, <a href="/cgv.html">les conditions de vente</a>,
        <a href="/engagements.html">les engagements de service</a> — lisibles avant de
        signer</dd></div>
    </dl>
    </div>

    {capture("admin-tableau",
             "Le tableau de bord d'un responsable RSE dans Riseva : indicateurs de la saison, "
             "résultats confirmés par les associations, et comparaison entre sites",
             "Le tableau de bord d'un responsable RSE",
             " shot--large", eager=True)}
  </div>
</header>"""


SAISON_ENT = f"""<section id="saison" class="band">
  <div class="layer">
{entete("Le déroulé", "Une saison,<br><span class='it'>quatre rendez-vous.</span>",
        "Le rythme est le même pour tout le monde : un début, un courant, des points d'étape, "
        "une fin. Et une date à laquelle on regarde ce qui a réellement été fait.")}

    {objection("C'est une usine à gaz. Qui va gérer ça chez moi ?",
               "Personne n'a de fichier à tenir. Vous diffusez un lien, les salariés créent "
               "leur compte, les associations publient leurs besoins, et les rapports "
               "arrivent finis à chaque clôture.")}

{etapes([
  ("Janvier", "Le <span class='it'>départ.</span>",
   "La saison s'ouvre. Vous diffusez un lien, chacun crée son compte. Vos équipes voient "
   "les besoins publiés par les associations proches de vos sites."),
  ("Février à octobre", "Le <span class='it'>courant.</span>",
   "Les missions se font, une par une. Un salarié se propose, l'association l'accueille, "
   "puis confirme que c'est arrivé. Rien n'est compté avant cette confirmation."),
  ("Chaque trimestre", "Le <span class='it'>point.</span>",
   "Un rapport se génère tout seul à la clôture de chaque trimestre : ce qui a été fait, "
   "ce qui a été confirmé, ce qui ne l'a pas été. Vous n'avez rien à consolider."),
  ("Décembre", "Le <span class='it'>bilan.</span>",
   "Le rapport annuel arrive, avec le dossier de traçabilité : pièces, sources et méthode. "
   "Puis vous décidez si vous recommencez. Il n'y a pas de reconduction tacite."),
])}

{roles("Ce que vous <span class='it'>faites</span>",
       ["Décider de participer, et pour quel budget",
        "Diffuser un lien et laisser chacun s'inscrire",
        "Désigner deux personnes capables d'agir",
        "Informer vos salariés et consulter votre CSE"],
       "Ce que vous ne faites <span class='it'>pas</span>",
       ["Chercher une association fiable",
        "Éplucher ses statuts, ses comptes, son assurance",
        "Construire un calendrier d'animation",
        "Produire des affiches et des messages",
        "Tenir un fichier de suivi"])}
  </div>
</section>"""


EQUIPES_ENT = f"""<section id="equipes">
  <div class="layer">
{entete("Côté salariés", "Ce que vos salariés<br><span class='it'>voient réellement.</span>",
        "Trois écrans, et une règle : chacun se propose, personne n'est désigné. Un salarié qui "
        "se sent inscrit d'office ne vient pas une deuxième fois.")}

    {objection("Mes gars sur le terrain ne sont pas des cadres parisiens, ça ne prendra pas.",
               "Le premier obstacle au bénévolat d'entreprise n'est ni le temps ni la cause : "
               "c'est de ne pas savoir avec qui on y va. L'écran répond à cette question-là "
               "avant de parler de points.")}

    <div class="duo duo--pile">
      {capture("salarie-saison",
               "Le tableau de bord d'un salarié : ses points, et l'objectif collectif de son site",
               "Espace salarié — l'objectif de la saison, au périmètre de son site")}
      {capture("salarie-actions",
               "La liste des besoins publiés par les associations proches du site du salarié",
               "Les besoins ouverts près de son site, avec les collègues déjà inscrits")}
    </div>

    <ul class="trois">
      <li><b>Chacun choisit librement.</b> Un besoin, une association, une date, un lieu, des
        places restantes. Il se propose ; il n'est jamais désigné, et se retirer ne demande
        aucune justification.</li>
      <li><b>L'objectif se compte en personnes, pas en points.</b> Un objectif en points
        s'atteint avec trois salariés très actifs — il récompense exactement le contraire de
        ce qu'on cherche. Un objectif en personnes ne s'atteint qu'en allant chercher
        quelqu'un qui n'est pas encore venu.</li>
      <li><b>Les collègues engagés apparaissent, s'ils l'ont choisi.</b> Le nombre est
        toujours visible : c'est lui qui lève le frein, et il ne désigne personne. Les
        prénoms ne sortent que pour ceux qui ont coché un réglage décoché par défaut — une
        mission auprès d'une association peut révéler une conviction ou un état de santé, et
        ça ne se déduit pas d'un réglage par défaut. Jamais sur un don en argent.</li>
    </ul>

    <p class="s-note"><a class="tlink" href="/app/">Explorer l'espace salarié</a></p>
  </div>
</section>"""


ASSOCIATIONS_ENT = f"""<section id="associations" class="band-moss">
  <div class="layer">
{entete("Côté associations", "L'association publie,<br>puis <span class='it'>elle confirme.</span>",
        "Le chiffre final de votre rapport ne vient pas de nous, ni de vous : il vient de la "
        "structure qui était sur place. C'est tout l'intérêt, et c'est aussi la limite.")}

    {objection("Et si l'association du coin s'en fout, ou qu'il n'y a rien autour de mon usine ?",
               "C'est la vraie question, et nous n'avons pas de réseau éprouvé à vous vendre : "
               "il n'existe pas encore. Ce que nous garantissons est écrit dans les engagements "
               "de service, y compris l'acompte remboursé si le démarrage n'est pas constaté.")}

    {capture("asso-valider",
             "L'écran par lequel une association confirme ce qui a été réalisé",
             "La confirmation après la mission — un clic, sans se connecter, "
             "et c'est ce chiffre-là qui remonte dans votre rapport", " shot--seule")}

    <ul class="trois">
      <li><b>Aucun abonnement, aucune commission.</b> Une association ne paie jamais rien, et
        Riseva ne prélève rien sur ses dons.</li>
      <li><b>Aucune obligation de produire un rapport pour vous.</b> Elle déclare ce qu'elle a
        constaté, en une réponse courte. Le reste est notre travail, pas le sien.</li>
      <li><b>Sans réponse sous quatorze jours</b>, la mission est clôturée automatiquement
        sans confirmation : les points sont crédités selon le barème, mais le résultat reste
        <b>estimé</b> et il est identifié comme <b>non confirmé</b> partout où il apparaît, y
        compris dans vos rapports. Nous n'écrivons jamais qu'une association a confirmé ce
        qu'elle n'a pas confirmé.</li>
    </ul>

    <div class="fmt-bloc">
      <h3 class="fmt-titre">Trois formats, et aucun intermédiaire</h3>
      <div class="fmt3">
        <div><p class="mono">Sur le terrain</p>
          <h4>Une demi-journée de bénévolat</h4>
          <p>Réfection d'un enclos, plantation d'une haie, remise en état d'une berge, tri
            d'une collecte. Encadrée par l'association, sur son terrain, avec ses règles.
            Aucune compétence requise.</p></div>
        <div><p class="mono">Depuis vos locaux</p>
          <h4>Du matériel qui repart utile</h4>
          <p>Ordinateurs renouvelés, mobilier, outillage : ce que vous alliez sortir de vos
            locaux de toute façon. L'association déclare ce qu'elle a reçu, et c'est cette
            déclaration qui compte, pas la vôtre.</p></div>
        <div><p class="mono">Par virement</p>
          <h4>Du don financier, sans passer par nous</h4>
          <p>L'argent va de la banque du donateur à celle de l'association,
            <b>sans transiter par Riseva</b> : aucune commission, aucun délai de reversement,
            aucun prestataire qui puisse fermer un compte. Riseva n'encaisse rien, et les
            points sont crédités quand l'association confirme la réception, et pas avant.</p></div>
      </div>
    </div>

    <div id="bareme" class="bareme">
      <div class="bareme-h">
        <span class="mono">Le barème de la saison</span>
        <p>Les associations ne fixent pas la valeur de leurs annonces : c'est la plateforme
           qui l'attribue, sinon comparer deux entreprises ne voudrait plus rien dire. Le
           calcul complet, écrêtage compris, est dans <a href="/reglement.html">le
           règlement</a>, avec un exemple chiffré qui se refait à la main.</p>
      </div>
      <ol class="bareme-l">
        <li><b>150 pts</b><span>la demi-journée de bénévolat, comptée après confirmation de
            l'association</span></li>
        <li><b>100 pts</b><span>par don de matériel validé</span></li>
        <li><b>1 pt</b><span>par tranche de 10 € virée, comptée quand l'association confirme
            avoir reçu le virement</span></li>
      </ol>
      <p class="bareme-n mono">Aucun format ne peut peser plus de la moitié des points retenus
        d'une entreprise sur la saison</p>
    </div>

    <p class="s-note"><a class="tlink" href="/asso.html?id=a1">Voir une fiche d'association</a>
      &nbsp;·&nbsp; <a class="tlink" href="/associations.html">La page destinée aux associations</a></p>
  </div>
</section>"""


# ── les onglets : quatre captures, un seul emplacement ──────────────────────
# Faits en boutons radio et en CSS, sans une ligne de JavaScript. Un composant
# à onglets qui dépend d'un script est un composant qui n'affiche rien si le
# script ne charge pas — et l'écran qu'il cachait est précisément la preuve.
def onglets(items):
    entrees, panneaux = "", ""
    for n, (cle, label, corps) in enumerate(items):
        coche = " checked" if n == 0 else ""
        entrees += (f'<input class="ong-r" type="radio" name="ong" id="ong-{cle}"{coche}>'
                    f'<label class="ong-l" for="ong-{cle}">{label}</label>')
        panneaux += f'<div class="ong-p" data-ong="{cle}">{corps}</div>'
    return f"""<div class="ong">
      <div class="ong-bar" role="tablist">{entrees}</div>
      <div class="ong-panneaux">{panneaux}</div>
    </div>"""


PILOTAGE_ENT = f"""<section id="pilotage">
  <div class="layer">
{entete("Ce que vous pilotez", "Sans tenir<br><span class='it'>un seul tableur.</span>",
        "Quatre écrans, pris dans l'application avec un <strong>jeu de démonstration</strong>. "
        "Ils montrent la forme des restitutions, jamais des résultats obtenus.")}

    {objection("Au final, qu'est-ce que j'y gagne à part faire plaisir ?",
               "Des chiffres datés, confirmés par un tiers nommé, avec la méthode qui les a "
               "produits. C'est exactement la pièce qu'on vous demande en appel d'offres et "
               "dans les questionnaires de vos donneurs d'ordre.")}

{onglets([
  ("miss", "Les missions", capture("missions",
      "La liste des missions d'une entreprise, avec leur état de confirmation",
      "Chaque mission, son association, son état — confirmée, estimée, refusée")),
  ("rapp", "Le rapport", capture("rapports",
      "Le rapport trimestriel d'une entreprise dans Riseva",
      "Le rapport, généré à la clôture de la période, export CSV et impression PDF")),
  ("meca", "Le dossier de preuve", capture("mecenat",
      "La piste d'audit du mécénat, salarié par salarié",
      "La piste d'audit : coût retenu, convention, plafond — et ce qui manque pour conclure")),
  ("indi", "Les indicateurs", capture("indicateurs",
      "Les indicateurs sociaux et de sécurité, consolidés site par site",
      "Indicateurs sociaux et sécurité, avec la formule écrite à côté du chiffre")),
])}

    <dl class="faits4 faits4--serre">
      <div><dt class="mono">Salariés mobilisés</dt><dd>et non le nombre de comptes ouverts</dd></div>
      <div><dt class="mono">Missions confirmées</dt><dd>séparées des missions estimées</dd></div>
      <div><dt class="mono">Résultats déclarés</dt><dd>arbres, kilos, repas, animaux</dd></div>
      <div><dt class="mono">Méthode et sources</dt><dd>exportables, datées, versionnées</dd></div>
    </dl>

    <div class="dates3">
      <p class="mono dates3-h">Ce que ce rapport vous permet d'écrire, et depuis quand</p>
      <ul>
        <li><b>21.08.26</b><span>Tout marché public doit comporter un critère environnemental.
          Ce qui est demandé n'est pas une intention mais une pièce : des chiffres datés, une
          méthode, une traçabilité. <cite>Loi Climat et résilience, article 35 · code de la
          commande publique, article L. 2152-7</cite></span></li>
        <li><b>27.09.26</b><span>Les allégations environnementales vagues deviennent interdites
          dans toute l'Union. « Engagés pour la planète » devient un risque ; « 42 demi-journées
          confirmées par 7 associations » n'en est pas un. <cite>Directive (UE) 2024/825</cite></span></li>
        <li><b>En continu</b><span>Vos clients vous interrogent avant de vous référencer. Le
          rapport range vos chiffres à l'endroit où le référentiel VSME les attend, sans
          prétendre couvrir le reste de votre RSE. <cite>Norme volontaire VSME pour les PME non
          cotées, EFRAG</cite></span></li>
      </ul>
    </div>
  </div>
</section>"""


PERIMETRES_ENT = f"""<section id="perimetres" class="band">
  <div class="layer">
{entete("Groupes et services RSE", "Un même cadre,<br><span class='it'>plusieurs périmètres.</span>",
        "Deux portes d'entrée, et deux écrans pour les montrer. Le détail complet est sur les "
        "pages dédiées : cette section dit seulement ce qui existe.")}

    {capture("groupe",
             "La vue consolidée d'un groupe : sociétés, sites et indicateurs réunis",
             "Vue consolidée d'un groupe — un rapport de sommes, jamais une moyenne de ratios",
             " shot--seule")}

    <div class="duo duo--texte">
      <div class="col">
        <h3>Pour un groupe</h3>
        <ul class="trois trois--court">
          <li><b>Trois niveaux, parce que le droit en compte trois.</b> Un groupe contient des
            <b>sociétés</b> — chacune son SIREN, son contrat, son plafond de mécénat — et
            chaque société contient des <b>établissements</b> : un lieu, un effectif, un quota
            de comptes, un score. Écraser les trois en une étiquette « site » produirait un
            calcul fiscal faux.</li>
          <li><b>Payer la facture ne donne pas accès aux personnes.</b> Le référent de
            Marseille voit Marseille ; la direction du groupe voit des agrégats, jamais
            l'identité d'un salarié d'une filiale dont elle n'est pas l'employeur. Ce n'est pas
            un filtre d'affichage, c'est une frontière écrite dans la base.</li>
          <li><b>Le classement entre sites est désactivé par défaut.</b> Un rang fabrique un
            dernier. Quand il est activé, le score est rapporté à l'effectif — sinon le siège
            de quatre cents personnes écrase l'agence de douze — et un site qui n'a pas commencé
            est « en lancement », pas dernier.</li>
        </ul>
        <p><a class="tlink" href="#prix">L'offre groupe est sur devis</a></p>
      </div>
      <div class="col">
        <h3>Les services RSE, compris dans l'abonnement</h3>
        <ul class="trois trois--court">
          <li><b>Données sociales et sécurité.</b> Douze valeurs saisies par établissement, six
            indicateurs calculés avec leur formule à côté du chiffre. Celui qui saisit ne peut
            pas approuver sa propre saisie, et seules les valeurs approuvées entrent dans un
            rapport.</li>
          <li><b>Registre des événements de sécurité, et registre des dons de matériel</b> au
            titre de la loi anti-gaspillage. Ni nom de victime, ni siège de la lésion, ni
            diagnostic : ce sont des données de l'article 9 du RGPD, et rien de ce qu'un
            préventeur utilise pour agir n'en fait partie.</li>
          <li><b>Un accès en lecture pour le CSE</b> : les indicateurs approuvés, les rapports,
            la participation en agrégat. Rien de nominatif, et aucun agrégat sous cinq
            personnes.</li>
        </ul>
        <p><a class="tlink" href="/reglement.html">Le règlement et les définitions</a></p>
      </div>
    </div>
  </div>
</section>"""


PREUVE_ENT = f"""<section id="preuve" class="band-moss">
  <div class="layer">
{entete("Ce qu'on ne promet pas", "Rien encore, et nous n'allons pas <span class='it'>l'inventer.</span>",
        "Riseva n'a pas démarré. Aucune mission n'a été confirmée, donc il n'y a pas un chiffre "
        "de résultat à mettre sur cette page. Les écrans montrés plus haut viennent d'un "
        "<strong>jeu de démonstration</strong> : ils montrent la forme du produit, jamais des "
        "résultats obtenus.")}

    <ul class="stakes-list stakes-list--seule">
      <li class="stake">
        <div class="stake-n">0</div>
        <div><h3>mission confirmée à ce jour</h3>
          <p>Cet emplacement se remplira tout seul à partir de ce que les associations auront
             réellement confirmé. Pas avant, et sans retouche.</p></div>
      </li>
      <li class="stake">
        <div class="stake-n">—</div>
        <div><h3>taux de réponse des associations</h3>
          <p>Il n'existera qu'après les premiers pilotes. Nous refusons de l'estimer à partir
             de données inventées : ce serait le seul chiffre qu'un acheteur retiendrait, et il
             serait faux.</p></div>
      </li>
      <li class="stake">
        <div class="stake-n">14 j</div>
        <div><h3>avant clôture automatique</h3>
          <p>C'est la seule promesse chiffrée que nous tenons dès le premier jour, parce
             qu'elle ne dépend que de nous : passé ce délai, une mission sans réponse est
             clôturée sans confirmation, et le résultat reste marqué comme estimé.</p></div>
      </li>
    </ul>

    <div class="deux-col">
      <div class="col col--oui">
        <h3>Ce que Riseva documente</h3>
        <ul>
          <li>L'enregistrement administratif des associations, avec la date du contrôle</li>
          <li>Les validations, et qui les a faites</li>
          <li>Les méthodes de calcul, publiées et refaisables à la main</li>
          <li>Les accès, les exports et les envois</li>
          <li>Les engagements de service, et ce qui se passe s'ils ne sont pas tenus</li>
        </ul>
      </div>
      <div class="col col--non">
        <h3>Ce que Riseva ne prétend pas faire</h3>
        <ul>
          <li>Auditer ou certifier un impact</li>
          <li>Produire un bilan carbone : c'est un métier normé</li>
          <li>Donner une note RSE : on serait juge et partie</li>
          <li>Remplacer votre expert-comptable sur la valorisation d'un don</li>
          <li>Déclarer à votre place : vous déposez, pas nous</li>
          <li>Classer vos sites sur les accidents : ça pousse à sous-déclarer</li>
        </ul>
      </div>
    </div>

    <p class="s-note s-note--liens">
      <a href="/securite.html">Sécurité</a> ·
      <a href="/confidentialite.html">Données personnelles</a> ·
      <a href="/reglement.html">Règlement</a> ·
      <a href="/engagements.html">Engagements de service</a> ·
      <a href="/cgv.html">Conditions de vente</a>
    </p>
  </div>
</section>"""


BANDEAU_ENT = """<section id="rejoindre" class="bandeau">
  <div class="layer">
    <div class="bandeau-in">
      <div>
        <h2>Douze places pour la première saison.</h2>
        <p>Ce n'est pas une rareté fabriquée : c'est le nombre d'entreprises qu'une personne
          seule peut accompagner correctement. Vous n'achetez pas un réseau éprouvé — il
          n'existe pas encore. Vous achetez une première saison accompagnée, avec cinq critères
          de démarrage constatés avant que le solde soit facturé.</p>
      </div>
      <div class="bandeau-cta">
        <a class="btn btn-lg" href="/inscription.html"><span class="dot"></span>Réserver une place</a>
        <span class="mono">Préinscription gratuite, sans carte bancaire.
          Une personne vous répond.</span>
      </div>
    </div>
  </div>
</section>"""


FAQ_ENT = faq([
  ("Combien coûte une saison ?",
   f"<p>La grille est <a href='#prix'>affichée sur cette page</a> : de "
   f"<b>{EUR(TARIFS['paliers'][0]['prix'])[:-2]} à {EUR(TARIFS['paliers'][-1]['prix'])} HT</b> "
   f"pour douze mois, selon votre effectif, un à douze sites compris selon la tranche. "
   f"Les {TARIFS['fondateur_places']} premières entreprises signataires bénéficient de "
   f"{int(TARIFS['fondateur_taux'] * 100)} % de remise sur leur première saison, et sur elle "
   f"seule : nous ne garantissons le prix d'aucune saison que nous n'avons pas encore "
   f"vécue.</p>"
   "<p>Pas de facturation par salarié, pas de module en supplément, pas de commission sur les "
   "dons. Les associations, elles, ne paient jamais rien.</p>"
   "<p>Pour situer : les outils RSE français facturent couramment de 5 000 à 50 000 € par an, "
   "et de 3 000 à 12 000 € pour ceux qui visent les PME. Riseva est en dessous parce qu'elle "
   "fait moins de choses — et qu'elle les fait entièrement.</p>"),
  ("Qu'est-ce qui est vendu, exactement ?",
   "<p>Une saison d'un an, avec les comptes correspondant à votre effectif, les <b>trois "
   "formats</b> — bénévolat, don de matériel, don en argent par virement —, l'accompagnement "
   "au lancement, les supports, et les rapports trimestriels et annuel.</p>"
   "<p>Sur le don en argent, une précision qui compte : Riseva <b>n'encaisse rien</b>. Le "
   "virement va du donateur à l'association, avec une référence que nous émettons. Nous ne "
   "sommes donc pas un établissement de paiement, il n'y a aucune commission, et l'association "
   "reçoit la totalité du don.</p>"
   "<p>Ce qui n'est <b>pas</b> vendu : la certitude qu'un besoin trouve preneur. Cela dépend "
   "de vos salariés et des associations, et aucun contrat ne peut le promettre.</p>"),
  ("Qu'est-ce que « démarrer » veut dire, précisément ?",
   "<p>Cinq critères, constatés à la date convenue : votre espace est ouvert et le lien "
   "d'inscription fonctionne depuis un de vos postes ; les comptes commandés sont "
   "disponibles ; les formats contractuels sont actifs ; l'inventaire associatif convenu "
   "est disponible ; un rapport est exportable.</p>"
   "<p>Vous avez quinze jours pour les constater. Si l'un manque et n'est pas levé sous "
   "quinze jours de plus, <b>l'acompte est remboursé intégralement</b> et aucun solde n'est "
   "dû. Le solde n'est facturé qu'après ce constat.</p>"),
  ("Qui valide qu'une mission a bien eu lieu ?",
   "<p>L'association, et elle seule. Elle reçoit un message après la date prévue et répond en "
   "un clic, sans se connecter. Sans réponse de sa part sous quatorze jours, la mission est "
   "<b>clôturée automatiquement sans confirmation</b> : les points sont crédités selon le "
   "barème, mais le résultat reste <b>estimé</b> et il est identifié comme <b>non confirmé</b> "
   "partout où il apparaît, y compris dans vos rapports.</p>"
   "<p>Nous n'écrivons jamais qu'une association a confirmé ce qu'elle n'a pas confirmé.</p>"),
  ("Et le classement, il sert à quoi ?",
   "<p>À donner un rendez-vous que personne n'a besoin d'imposer. Il se joue entre "
   "entreprises, jamais entre salariés : personne n'est noté individuellement et une équipe "
   "qui passe son tour ne pénalise personne.</p>"
   "<p>Mais soyons clairs : <b>le classement n'ouvre qu'à partir de dix entreprises dans "
   "votre catégorie</b>, et nous ne garantissons aucune date pour ce seuil. En dessous, vous "
   "voyez votre score et votre rang dès trois entreprises, mais pas de décile — parce qu'un "
   "« top 10 % » sur onze entreprises désigne la première et lui prête une avance qu'elle "
   "n'a pas.</p>"),
  ("Est-ce que la dépense est déductible ?",
   "<p>Deux lignes, deux régimes. L'abonnement Riseva est une prestation de services : il "
   "entre dans vos charges, TVA récupérable. Le mécénat, lui, suit l'article 238 bis du CGI "
   "et donne droit à 60 % de réduction d'impôt, dans la limite de 20 000 € ou 5 ‰ du chiffre "
   "d'affaires, le plus élevé des deux.</p>"
   "<p>Riseva calcule une estimation à partir de ce qu'elle connaît, et <b>refuse d'afficher "
   "un plafond</b> tant que vous ne lui avez pas donné votre chiffre d'affaires, vos dons "
   "faits ailleurs et vos reports antérieurs : sans eux, le chiffre serait faux. Votre "
   "expert-comptable arrête le montant, pas nous.</p>"),
  ("Quelles données sortent de chez nous ?",
   "<p>Le strict nécessaire, hébergé dans l'Union européenne. L'employeur ne voit jamais le "
   "détail nominatif des dons personnels de ses salariés, et un salarié peut se retirer sans "
   "avoir à se justifier. La base légale est l'intérêt légitime, pas le consentement : nous "
   "n'affichons donc pas de case à cocher qui n'en serait pas une.</p>"
   "<p>Consulter une page publique de riseva.fr ne déclenche aucune requête vers un domaine "
   "extérieur — polices comprises. Un test de la recette échoue si ce n'est plus vrai.</p>"),
  ("Sur quoi s'engage-t-on ?",
   "<p>Sur une saison, et rien de plus. <b>Pas de reconduction tacite</b> : votre abonnement "
   "s'arrête à la clôture, après remise du rapport annuel, et vous décidez ensuite. Tant que "
   "vous n'avez pas accepté la saison suivante, aucune facture n'est émise et rien n'est dû.</p>"),
])


def jalons(eyebrow, titre, note, photo, alt, legende, items, ident="preuve", bande=" class=\"band-moss\""):
    lis = ""
    for n, (chiffre, t, p, src) in enumerate(items, 1):
        cite = f"<cite>{src}</cite>" if src else ""
        lis += f"""
        <li class="stake rv d{n}">
          <div class="stake-n">{chiffre}</div>
          <div>
            <h3>{t}</h3>
            <p>{p}</p>
            {cite}
          </div>
        </li>"""
    return f"""<section id="{ident}"{bande}>
  <div class="layer">
{entete(eyebrow, titre, note)}
    <div class="stakes">
      <figure class="stakes-photo rv">
        <div class="sp-layer" style="background-image:url('{photo}')" role="img"
             aria-label="{alt}"></div>
        <div class="sp-veil" aria-hidden="true"><span class="sp-veil-tex"></span></div>
        <figcaption>{legende}</figcaption>
      </figure>
      <ul class="stakes-list">{lis}
      </ul>
    </div>
  </div>
</section>"""


# ---------------------------------------------------------------------------
#  Le prix, en clair, sur la page.
#  Un acheteur qui doit demander le prix se dit deux choses : que c'est cher, et
#  qu'il va falloir négocier. Les deux coûtent une réunion. La grille est donc
#  affichée, lue depuis `data.js`, et la recette vérifie qu'elle correspond à
#  celle que la plateforme facture.
# ---------------------------------------------------------------------------
def grille_tarifaire():
    lignes = ""
    for p in TARIFS["paliers"]:
        lignes += f"""
        <tr>
          <td class="tar-eff">{p['label']}</td>
          <td class="tar-prix"><b>{EUR(p['prix'])}</b> <span class="tar-ht">HT / saison</span></td>
          <td class="tar-sites">{p['sites']} site{'s' if p['sites'] > 1 else ''} inclus</td>
        </tr>"""
    inclus = "".join(f"<li>{x}</li>" for x in TARIFS["inclus"])
    exclus = "".join(f"<li>{x}</li>" for x in TARIFS["exclus"])
    return f"""<section id="prix">
  <div class="layer">
{entete("Le prix", "Il est écrit ici,<br>et <span class='it'>il ne bouge pas.</span>",
        "Une saison de douze mois, tout compris. Le tarif suit votre effectif parce que c'est "
        "lui qui détermine ce que nous produisons : les comptes, les affiches, les sites à "
        "consolider, les rapports. Pas de facturation par utilisateur, pas de module en "
        "supplément, pas de commission sur les dons.")}

    <div class="tar rv">
      <table class="tar-t">
        <caption class="sr-only">Grille tarifaire par tranche d'effectif</caption>
        <tbody>{lignes}
        </tbody>
      </table>
      <p class="tar-n">Site supplémentaire au-delà de ceux compris : {EUR(TARIFS['site_sup'])} HT.
        Au-delà de deux mille salariés, le tarif est établi sur devis à partir du dernier palier.</p>
    </div>

    <div class="tar-grid">
      <div class="tar-card rv">
        <p class="mono">Ce qui est compris</p>
        <ul class="tar-l">{inclus}</ul>
      </div>
      <div class="tar-card rv d1">
        <p class="mono">Ce qui ne l'est pas</p>
        <ul class="tar-l tar-l--non">{exclus}</ul>
        <p class="tar-n">Nous préférons le dire avant. Une plateforme qui prétend tout couvrir
          se fait démonter au premier entretien avec un commissaire aux comptes.</p>
      </div>
      <div class="tar-card tar-card--fond rv d2">
        <p class="mono">Tarif fondateur</p>
        <p class="tar-fond"><b>&minus;{int(TARIFS['fondateur_taux'] * 100)} %</b> sur la première saison</p>
        <p class="tar-n">Pour les {TARIFS['fondateur_places']} premières entreprises qui signent,
          jusqu'au 31 décembre 2026. Elle porte sur votre <b>première saison, et sur elle
          seule</b> : nous ne garantissons le prix d'aucune saison que nous n'avons pas encore
          vécue. Passé ces places, la grille s'applique telle quelle — une remise sans limite
          n'est pas une remise, c'est le prix.</p>
      </div>
      <div class="tar-card rv d3">
        <p class="mono">Le règlement</p>
        <p class="tar-n">{int(TARIFS['acompte_taux'] * 100)} % à la commande, le solde à trente
          jours après l'ouverture de votre saison. Règlement intégral à la commande :
          &minus;{int(TARIFS['remise_comptant'] * 100)} %.</p>
        <p class="tar-n">L'acompte n'est pas une garantie qu'on prend sur vous : il paie le premier
          envoi d'affiches et l'ouverture de vos comptes, qui partent avant la première mission.
          Il y a {TARIFS['affiches']} envois dans la saison.</p>
      </div>
    </div>

    <div class="tar-sim rv">
      <p class="mono">Votre tranche</p>
      <div class="tar-sim-row">
        <label for="simEff">Effectif</label>
        <input class="tar-in" id="simEff" type="number" min="1" max="20000" value="150"
               inputmode="numeric">
        <label for="simSites">Sites</label>
        <input class="tar-in" id="simSites" type="number" min="1" max="60" value="1"
               inputmode="numeric">
      </div>
      <p class="tar-sim-out" id="simOut" aria-live="polite"></p>
      <p class="tar-n">Simulation indicative, au tarif fondateur. Le devis nominatif reprend le
        même calcul, et il est daté.</p>
    </div>
  </div>
</section>"""


PRIX_ENT = grille_tarifaire()


CORPS_ENT = "\n\n".join([
    HERO_ENT,           # 1. l'offre, le prix, et une capture de l'application
    SAISON_ENT,         # 2. « qui va gérer ça chez moi ? »
    EQUIPES_ENT,        # 3. « mes gars ne vont pas y aller »
    ASSOCIATIONS_ENT,   # 4. « et s'il n'y a rien autour de mon usine ? »
    PILOTAGE_ENT,       # 5. « qu'est-ce que j'y gagne ? »
    PERIMETRES_ENT,     # 6. groupes et services RSE, en porte d'entrée
    PRIX_ENT,           # 7. la grille, et ce qu'elle ne comprend pas
    PREUVE_ENT,         # 8. ce qui est documenté, et ce qui ne l'est pas
    FAQ_ENT,            # 9. les questions qui décident vraiment
    BANDEAU_ENT,
])


# ═══════════════════════════════════════════════════════════════════════════
#  VITRINE ASSOCIATIONS
#  Autre public, autre peur, autre parcours. Une présidente ne cherche pas un
#  outil : elle se demande si ça va lui coûter du temps, si on va s'approprier
#  son travail, et si quelqu'un viendra vraiment.
# ═══════════════════════════════════════════════════════════════════════════

NAV_ASSO = nav(
    [("comment", "Comment ça marche"), ("temps", "Ce que ça vous coûte"),
     ("argent", "L'argent"), ("jamais", "Ce qu'on ne fait pas"),
     ("yacine", "Qui vous répond"), ("faq", "Vos questions")],
    "Parler à Yacine", "#yacine", "C'est une personne, pas un formulaire")

PIED_ASSO = pied(
    "Riseva met des entreprises françaises au service des associations qui protègent le "
    "vivant. Gratuit pour vous, sans exclusivité, et sans commission sur vos dons.",
    [("Comprendre", [("#comment", "Comment ça marche"), ("#temps", "Ce que ça vous coûte"),
                     ("#argent", "L'argent"), ("#jamais", "Ce qu'on ne fait pas")]),
     ("Les textes", [("/charte-associations.html", "La charte des associations"),
                     ("/reglement.html", "Le règlement du barème"),
                     ("/moderation.html", "Signalement et modération"),
                     ("/confidentialite.html", "Confidentialité")]),
     ("Aller plus loin", [("/", "Vous êtes une entreprise"),
                          ("/asso.html?id=a1", "Voir une page d'association"),
                          ("mailto:contact@riseva.fr", "contact@riseva.fr"),
                          ("/mentions.html", "Mentions légales")])],
    "Gratuit pour les associations · toujours")


HERO_ASSO = """<header class="hero" id="hero">
  <h1 class="h1" id="h1">
    <span class="ln"><span>Vous n'avez pas besoin</span></span>
    <span class="ln"><span>d'un outil de plus.</span></span>
    <span class="ln turn"><span>Il vous faut <span class="hit">des bras.</span></span></span>
  </h1>

  <div class="hero-grid">
    <div class="hero-pitch rv d2">
      <div class="eyebrow mono">Le principe</div>
      <p>
        Vous publiez un besoin concret — <b>une demi-journée de bras, du matériel</b> —
        et des salariés d'entreprises abonnées peuvent s'y proposer. Vous voyez qui
        vient et pour quelle date. Quand c'est fait, vous confirmez en un clic.
        C'est tout le travail que ça vous demande.
      </p>
      <div class="hero-cta">
        <a class="btn btn-lg" href="#yacine"><span class="dot"></span>Parler à Yacine</a>
        <a class="tlink" href="#comment">Voir comment ça marche</a>
      </div>
      <ul class="hero-assure mono">
        <li>Gratuit, toujours</li>
        <li>Sans exclusivité</li>
        <li>Aucune commission sur vos dons</li>
      </ul>
    </div>

    <div class="rv d3">
      <figure class="vframe">
        <div class="vframe-in">
          <div class="sp-layer" style="background-image:url('/photos/voix-chien.jpg')"></div>
        </div>
        <figcaption class="mono">Photo d'illustration — aucune mise en scène</figcaption>
      </figure>
    </div>
  </div>
</header>"""


HONNETE_ASSO = """<section id="honnete" class="band-moss">
  <div class="layer">
    <div class="s-head">
      <div class="rv">
        <div class="eyebrow mono">Avant tout le reste</div>
        <h2>Riseva démarre.<br><span class="it">Voilà ce que ça implique.</span></h2>
      </div>
      <p class="s-note rv d2">
        Nous n'avons pas de témoignages à vous montrer et nous n'allons pas en inventer.
        Ce que nous pouvons faire, c'est <strong>écrire votre première annonce avec vous</strong>
        et vous dire honnêtement, dans trois mois, combien d'annonces ont trouvé preneur.
        <strong>Nous ne pouvons pas vous promettre qu'un besoin trouvera preneur.</strong>
      </p>
    </div>
  </div>
</section>"""


COMMENT_ASSO = f"""<section id="comment">
  <div class="layer">
{entete("Comment ça marche", "Trois gestes,<br><span class='it'>et c'est fini.</span>",
        "Il n'y a pas de quatrième étape cachée. Pas de tableau de bord à surveiller, "
        "pas de fichier à tenir, pas de formation à suivre.")}
{etapes([
  ("Vous publiez", "Un <span class='it'>besoin.</span>",
   "Un titre, une description, une date, un lieu, un nombre de places. Vous choisissez le "
   "format : une demi-journée de bénévolat ou un don de matériel. Si l'exercice vous "
   "rebute — c'est souvent là que ça coince — nous l'écrivons avec vous, en un quart d'heure."),
  ("Des salariés se proposent", "Vous voyez <span class='it'>qui vient.</span>",
   "Ils viennent d'entreprises abonnées, engagées pour l'année. Vous voyez leur nom, leur "
   "entreprise et la date choisie. Vous gardez la main : c'est votre annonce, votre terrain, "
   "vos règles."),
  ("Après la mission", "Vous <span class='it'>confirmez.</span>",
   "Un message vous demande si la mission a bien eu lieu, avec trois boutons — réalisée comme "
   "prévu, réalisée partiellement, non réalisée — qui fonctionnent <b>sans vous connecter</b>. "
   "Un clic, et c'est terminé."),
  ("Si vous ne répondez pas", "Ce n'est pas une <span class='it'>faute.</span>",
   "Sans réponse au bout de quatorze jours, la mission est <b>clôturée automatiquement sans "
   "confirmation</b>. Les points sont crédités selon le barème, mais le résultat reste "
   "<b>estimé</b> et identifié comme <b>non confirmé</b> partout où il apparaît. Aucune "
   "suspension, aucun rappel culpabilisant."),
])}
  </div>
</section>"""


TEMPS_ASSO = f"""<section id="temps" class="band">
  <div class="layer">
{entete("Ce que ça vous coûte", "Du temps,<br><span class='it'>et rien d'autre.</span>",
        "Soyons précis, parce que « sans travail supplémentaire » serait faux : accueillir des "
        "bénévoles un matin, ça se prépare. Voici ce que ça demande vraiment, et ce que ça ne "
        "demande pas.")}
{roles("Ce que vous <span class='it'>faites</span>",
       ["Écrire l'annonce — ou nous la dicter au téléphone",
        "Accueillir et encadrer les gens qui viennent, comme n'importe quel bénévole",
        "Cliquer sur un bouton après la mission",
        "Déclarer une période d'absence et un suppléant, si vous partez"],
       "Ce que vous ne faites <span class='it'>pas</span>",
       ["Installer un logiciel : il n'y en a pas",
        "Brancher Riseva sur vos outils : il n'y a rien à brancher",
        "Payer quoi que ce soit, jamais, à aucun moment",
        "Renoncer à ce que vous faites ailleurs : aucune exclusivité",
        "Surveiller une boîte de réception"])}
  </div>
</section>"""


ARGENT_ASSO = f"""<section id="argent">
  <div class="layer">
{entete("L'argent", "Les dons vont chez vous,<br><span class='it'>pas chez nous.</span>",
        "C'est la question qui décide, alors elle passe avant les autres.")}
{formats([
  ("Le circuit", "Le donateur paie <span class='n'>directement</span> chez vous.",
   "Vous avez déjà un formulaire <b>HelloAsso</b> ? Collez-en l'adresse et vos donateurs paient "
   "par carte en un clic, sans commission — nous ne vous demandons ni clé, ni mot de passe, ni "
   "accès à votre compte. Vous n'en avez pas ? Donnez-nous votre IBAN : le virement va de la "
   "banque du donateur à la vôtre. Dans les deux cas, <b>nous ne touchons jamais l'argent</b> — "
   "ni sur un compte de passage, ni le temps d'un reversement."),
  ("Ce que ça vous évite", "Aucune commission, aucun <span class='n'>délai</span>.",
   "Pas de prestataire à qui reverser un pourcentage, pas de virement hebdomadaire à attendre, "
   "pas de compte qu'un tiers peut geler. <b>Riseva ne prélève rien</b>, et ne peut rien "
   "prélever : l'argent ne passe jamais par elle. C'est aussi pour ça que ce service reste "
   "gratuit — nous n'avons aucun frais de paiement à répercuter."
   "<br><br>Par virement, vous recevez l'intégralité du don le jour où votre banque le crédite. "
   "Par HelloAsso, c'est le donateur qui choisit librement de laisser une contribution à la "
   "plateforme, en plus de son don : elle ne sort pas de votre part. Ce que nous ne pouvons pas "
   "promettre à votre place, ce sont les frais que votre propre banque applique — un virement "
   "SEPA entrant est gratuit dans la quasi-totalité des cas, un virement venu de hors zone euro "
   "ne l'est pas toujours."),
  ("Ce qu'on vous demande", "De <span class='n'>confirmer</span> ce que vous avez reçu.",
   "Chaque virement porte une référence. Vous la retrouvez sur votre relevé, vous confirmez le "
   "montant réellement crédité — le vôtre fait foi, pas celui qui avait été annoncé — et c'est "
   "à ce moment que les points sont attribués. Rien n'est validé automatiquement sur de "
   "l'argent."),
  ("Le reçu fiscal", "C'est <span class='n'>vous</span> qui l'émettez, nous le préparons.",
   "Un tiers n'a pas le droit de délivrer un reçu à votre place, et nous ne le ferons pas. Nous "
   "le préparons et l'envoyons au donateur sous votre numéro d'ordre et votre signature, "
   "uniquement si vous nous en donnez mandat — écrit, daté, et révocable à tout moment sans "
   "motif."),
])}
  </div>
</section>"""


JAMAIS_ASSO = jalons(
    "Ce qu'on ne fait pas",
    "Les cinq peurs,<br><span class='it'>dans l'ordre.</span>",
    "Ce sont celles qu'on nous oppose en rendez-vous. Chacune est légitime, et chacune a une "
    "réponse écrite noir sur blanc dans <a href='/charte-associations.html'>la charte</a> — "
    "pas seulement sur cette page.",
    "/photos/forest.jpg", "Une forêt de conifères",
    "Photo d'illustration",
    [("01", "« Vous allez vous approprier notre travail »",
      "Votre page publique porte votre nom et votre logo. Les résultats sont attribués "
      "explicitement : « résultats déclarés par votre association ». Riseva additionne, ne "
      "s'attribue rien, et n'écrit jamais qu'elle a planté un arbre.", None),
     ("02", "« On va nous sanctionner si on ne répond pas »",
      "Non. Une clôture automatique n'est pas une faute et n'entraîne aucune suspension. Ce "
      "qui peut être sanctionné, c'est une confirmation volontairement fausse — attester "
      "d'une mission qui n'a pas eu lieu. C'est autre chose qu'un silence.", None),
     ("03", "« Ça va nous coûter du temps qu'on n'a pas »",
      "Écrire la première annonce prend un quart d'heure à deux, et nous la tenons. Ensuite, "
      "confirmer une mission, c'est un clic dans un message, sans connexion.", None),
     ("04", "« Et si personne ne vient ? »",
      "C'est possible, et nous ne pouvons pas le garantir. Nous vous dirons dans trois mois "
      "combien d'annonces ont trouvé preneur, chiffre en main, y compris si le chiffre est "
      "mauvais.", None),
     ("05", "« Il va falloir signer une exclusivité »",
      "Non. Vous continuez tout ce que vous faites ailleurs, avec qui vous voulez. Riseva "
      "n'est pas un canal exclusif et ne le deviendra pas.", None)],
    ident="jamais", bande=" class=\"band-moss\"")


CONFLUENT_ASSO = confluent(
    "Écrire la première annonce",
    [("La", 0), ("première", 1), ("annonce,", 1), ("nous", 0), ("l'écrivons", 0),
     ("avec", 0), ("vous.", 1)],
    "C'est souvent là que ça coince : formuler un besoin en quelques lignes, avec une date, "
    "un lieu et un nombre de places. <b>Un quart d'heure au téléphone suffit.</b> Vous "
    "corrigez, ou vous refusez — l'annonce n'est publiée que si elle vous convient.",
    "Parler à Yacine", "#yacine", "Réponse sous deux jours ouvrés, à tout le monde",
    ["Vous décrivez votre besoin, à l'oral, sans rien rédiger",
     "Nous vous renvoyons l'annonce écrite, en clair, dans un mail",
     "Vous corrigez ou vous refusez : rien n'est publié sans vous"],
    photo="/photos/forest.jpg")


YACINE_ASSO = f"""<section id="yacine">
  <div class="layer">
{entete("Parler à quelqu'un", "C'est Yacine<br><span class='it'>qui vous répond.</span>",
        "Yacine Bounoua, fondateur. C'est lui qui vérifie chaque association, lui qui répond "
        "aux messages, et lui qui écrira votre première annonce si vous le souhaitez. "
        "<strong>Réponse sous deux jours ouvrés, à tout le monde</strong>, et pas de relance "
        "commerciale si vous ne donnez pas suite.")}
    <form id="formAsso" class="join-grid" novalidate>
      <div class="rv">
        <div class="j-step mono">Trois lignes suffisent</div>
        <p class="j-sentence">Nous sommes <span class="blank"><label class="sr-only" for="fa-asso">Nom de l'association</label><input id="fa-asso" class="bk" type="text" name="asso" data-key="asso" data-label="le nom de votre association" placeholder="votre association" spellcheck="false" required><span class="ghost" aria-hidden="true"></span></span>, à <span class="blank"><label class="sr-only" for="fa-ville">Ville</label><input id="fa-ville" class="bk" type="text" name="ville" data-key="ville" data-label="votre ville" placeholder="votre ville" required><span class="ghost" aria-hidden="true"></span></span>. Ce qui nous manque le plus en ce moment, c'est <span class="blank"><label class="sr-only" for="fa-mot">Ce qui vous manque</label><input id="fa-mot" class="bk" type="text" name="mot" data-key="mot" data-label="ce qui vous manque" placeholder="des bras un samedi matin" required><span class="ghost" aria-hidden="true"></span></span>. Écrivez-nous à <span class="blank"><label class="sr-only" for="fa-mail">Adresse e-mail</label><input id="fa-mail" class="bk" type="email" name="mail" data-key="mail" data-label="votre adresse e-mail" placeholder="nom@association.fr" spellcheck="false" required><span class="ghost" aria-hidden="true"></span></span>.</p>
        <p class="j-hint" id="jHint">Pas de dossier à monter, pas de pièce à joindre. On vous rappelle et on part de là.</p>
        <div class="j-cta">
          <button type="submit" class="btn btn-lg"><span class="dot"></span>Envoyer</button>
          <span class="mono">contact@riseva.fr · une personne, pas un robot</span>
        </div>
        <p class="j-msg" id="jMsg" role="status" aria-live="polite"></p>
      </div>

      <div class="rv d2">
        <div class="bulletin" id="bulletin" aria-hidden="true">
          <div class="bl-photo">
            <img src="/photos/bulletin.jpg" alt="" decoding="async" width="1200" height="400">
          </div>
          <div class="bl-body">
            <div class="bl-top">
              <span class="mono">Prise de contact</span>
              <span class="bl-ref mono" id="blRef">RSV-AS-••••</span>
            </div>
            <ul class="bl-rows">
              <li data-key="asso"><i class="bl-tick"></i><span class="bl-k">Association</span><span class="bl-v">à compléter</span></li>
              <li data-key="ville"><i class="bl-tick"></i><span class="bl-k">Ville</span><span class="bl-v">à compléter</span></li>
              <li data-key="mot"><i class="bl-tick"></i><span class="bl-k">Besoin</span><span class="bl-v">à compléter</span></li>
              <li data-key="mail"><i class="bl-tick"></i><span class="bl-k">Contact</span><span class="bl-v">à compléter</span></li>
            </ul>
            <div class="bl-prog">
              <svg viewBox="0 0 300 22" preserveAspectRatio="none" aria-hidden="true">
                <path class="bl-track" d="M3 15C38 4 66 20 104 12s70-14 106-2 56 14 87 4"></path>
                <path class="bl-fill" id="blBar" pathLength="1" d="M3 15C38 4 66 20 104 12s70-14 106-2 56 14 87 4"></path>
              </svg>
              <span class="bl-count mono" id="blCount">0 / 4</span>
            </div>
            <div class="bl-stamp mono">Gratuit · sans engagement</div>
          </div>
        </div>
      </div>
    </form>
  </div>
</section>"""


FAQ_ASSO = faq([
  ("Combien ça nous coûte ?",
   "<p><b>Rien.</b> Ni abonnement, ni commission, ni frais de dossier, à aucun moment. Le "
   "modèle économique repose entièrement sur l'abonnement des entreprises. Si un jour cela "
   "devait changer, ce ne serait pas par une mise à jour de conditions générales : nous vous "
   "le dirions en face, et vous seriez libres de partir.</p>"),
  ("Faut-il installer quelque chose ?",
   "<p>Non. Aucun travail informatique : vous vous connectez à une page web, vous publiez, "
   "vous confirmez. Aucun développement, aucun branchement sur vos outils.</p>"
   "<p>Une seule exception, le jour où les dons en ligne ouvriront : l'activation des dons "
   "financiers demandera la vérification de votre compte de paiement et de votre IBAN, comme "
   "pour n'importe quelle collecte. Ce n'est pas de l'informatique, c'est de l'administratif, "
   "et nous vous accompagnerons.</p>"),
  ("Que se passe-t-il si nous ne répondons pas à temps ?",
   "<p>Au bout de quatorze jours, la mission est <b>clôturée automatiquement sans "
   "confirmation</b>. Les points sont crédités à l'entreprise selon le barème, mais le "
   "résultat reste <b>estimé</b> et identifié comme <b>non confirmé</b> sur tous les écrans "
   "et dans tous les rapports.</p>"
   "<p><b>Ce n'est pas une faute et ça n'entraîne aucune suspension.</b> Vous avez une "
   "association à faire tourner, pas une boîte de réception à surveiller. Si les clôtures se "
   "répètent, nous vous appelons pour comprendre — un référent absent, une adresse qui ne "
   "marche plus — et pour trouver une solution.</p>"),
  ("Qui est responsable pendant une mission ?",
   "<p>Vous et l'entreprise, et les deux cas de figure ne se ressemblent pas.</p>"
   "<p><b>Sur le temps de travail</b>, le salarié reste salarié : son contrat continue, son "
   "employeur le paie, et un accident survenu chez vous est un <b>accident du travail</b>, "
   "déclaré par l'employeur et pris en charge par son régime (article L. 411-1 du code de la "
   "sécurité sociale). Votre responsabilité civile reste engagée si le dommage vient d'une "
   "faute de votre part.</p>"
   "<p><b>Hors temps de travail</b>, la personne est bénévole, et c'est là qu'il faut être "
   "précis : votre responsabilité civile couvre les dommages qu'un bénévole <b>cause</b> à "
   "autrui, elle ne couvre pas, par elle-même, ceux qu'il <b>subit</b>. Pour cela il faut une "
   "garantie individuelle accident, ou l'assurance volontaire contre les accidents du travail "
   "que les associations d'intérêt général peuvent souscrire pour leurs bénévoles (articles "
   "L. 743-2 et R. 743-4 et suivants). Nous vous demandons de dire dans l'annonce ce qui est "
   "couvert : un bénévole a le droit de le savoir avant de venir.</p>"
   "<p><b>Riseva n'assure pas les missions</b> et n'organise rien sur place. Nous hébergeons "
   "l'annonce et faisons la présentation, rien de plus. Nous préférons l'écrire que le "
   "laisser croire.</p>"),
  ("Qu'est-ce que vous faites de nos données ?",
   "<p>Le nom de votre association, votre ville, votre cause et vos annonces ouvertes sont "
   "publics : c'est ce qui permet à un salarié de vous trouver. Le reste ne l'est pas.</p>"
   "<p>Vous voyez le nom et l'entreprise des personnes qui s'inscrivent à vos missions, parce "
   "que vous devez savoir qui vous accueillez. Vous ne voyez rien d'autre de leur vie "
   "professionnelle. Consulter une page publique de riseva.fr ne déclenche aucune requête "
   "vers un domaine extérieur.</p>"),
  ("On peut partir ?",
   "<p>Quand vous voulez, sans préavis et sans justification. Vos annonces ferment, votre "
   "page publique disparaît, et vos données sont supprimées selon la procédure décrite dans "
   "la <a href='/confidentialite.html'>politique de confidentialité</a>. Nous ne gardons pas "
   "une association en otage dans un réseau.</p>"),
  ("Comment vérifiez-vous les associations ?",
   "<p>Sur les <b>registres publics</b>, pas sur des pièces que vous nous enverriez. Vous "
   "donnez un numéro — RNA ou SIREN — et nous allons lire nous-mêmes l'Annuaire des "
   "Entreprises et le Répertoire national des associations : dénomination déposée, date de "
   "déclaration, adresse, état d'activité. Nous comparons avec ce que vous avez saisi et nous "
   "vous montrons les écarts. <b>Vous n'avez aucun justificatif à envoyer, et nous ne vous en "
   "demanderons pas.</b> La vérification vaut pour une saison et se refait ensuite.</p>"
   "<p>Ce que nous ne faisons pas, et que personne ne devrait prétendre faire à votre place : "
   "certifier votre éligibilité au mécénat, juger de votre gestion, ou attester que vous êtes "
   "assurée. Ces trois choses relèvent de vous, et nous les affichons comme des "
   "<b>déclarations</b>, jamais comme des vérifications.</p>"
   "<p>Le détail de ce que nous vérifions, de ce que nous vous demandons et de ce que nous "
   "nous engageons à faire pour vous est dans <a href='/charte-associations.html'>la "
   "charte</a>. Elle tient en deux colonnes : vos cinq engagements, nos cinq engagements.</p>"),
])


CORPS_ASSO = "\n\n".join([
    HERO_ASSO,
    ticker(["Refuges animaliers", "Reboisement", "Rivières et zones humides",
            "Océans et littoral", "Protection des espèces", "Collectes solidaires"]),
    HONNETE_ASSO, COMMENT_ASSO, TEMPS_ASSO, ARGENT_ASSO, JAMAIS_ASSO,
    CONFLUENT_ASSO, YACINE_ASSO, FAQ_ASSO,
])


def main():
    a = page(fichier="index.html", canonique="/",
             titre="Riseva — la plateforme RSE qui commence par les associations",
             description="Des associations vérifiées publient des besoins concrets près de vos "
                         "sites, vos équipes y répondent autour d'un même objectif, et la gestion "
                         "RSE suit : indicateurs sociaux, registre de sécurité multi-sites, accès "
                         "CSE, rapports trimestriels et annuel envoyés tout seuls.",
             corps=CORPS_ENT, nav_html=NAV_ENT, pied_html=PIED_ENT,
             classe_corps="vd", rubans=False)
    b = page(fichier="associations.html", canonique="/associations.html",
             titre="Riseva — pour les associations",
             description="Publiez un besoin concret, des salariés d'entreprises abonnées peuvent "
                         "y répondre. Gratuit, sans intégration technique, sans exclusivité et "
                         "sans commission sur vos dons.",
             corps=CORPS_ASSO, nav_html=NAV_ASSO, pied_html=PIED_ASSO)
    for f in (a, b):
        print("écrit", f, f"{(PUBLIC / f).stat().st_size // 1024} Ko")


if __name__ == "__main__":
    main()
