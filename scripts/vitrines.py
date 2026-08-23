#!/usr/bin/env python3
"""Les deux vitrines : une pour les entreprises, une pour les associations.

    python3 scripts/vitrines.py

Elles partagent la charte, papier crème, encre noire, lime, rubans, vagues,
parallaxe, révélations au défilement, et rien d'autre. Ce ne sont pas deux
versions d'une même page : ce sont deux sites, deux promesses, deux parcours.
Une présidente d'association n'a rien à faire dans un argumentaire d'achat, et
un responsable RSE n'a rien à faire dans une charte de partenariat.

Le squelette est commun pour que les deux ne divergent jamais par accident ;
le contenu est écrit deux fois, exprès.

Règles qui tiennent sur les deux pages, et que la recette vérifie :
, aucun chiffre issu du jeu de démonstration ;
, trois formats, dont le don par virement direct : Riseva n'encaisse jamais ;
, la formule canonique des quatorze jours, mot pour mot ;
, aucune requête vers un domaine tiers, polices comprises.
"""
import io, pathlib, re

RACINE = pathlib.Path(__file__).resolve().parent.parent
PUBLIC = RACINE / "public"
def _rubans():
    """Les lianes qui traversent la page, ramenées de quatorze à deux.

    Elles ne representent ni une progression, ni un reseau, ni une donnee : ce
    sont des ornements poses dans les espaces disponibles. Quatorze, elles
    traversent toutes les sections et deviennent le procede graphique le plus
    artificiel du site. Deux, une en haut, une au-dessus du pied de page ,
    restent une signature. On garde donc les rubans dont l'ancrage vertical
    tombe dans le premier dixieme ou le dernier dixieme de la page."""
    brut = (RACINE / "scripts" / "fragments-rubans.html").read_text(encoding="utf-8").strip()
    gardes, total = [], 0
    for bloc in re.findall(r'<div class="rib".*?</div>', brut, re.S):
        total += 1
        m = re.search(r'top:([\d.]+)%', bloc)
        if m and (float(m.group(1)) < 10 or float(m.group(1)) > 88):
            gardes.append(bloc)
    return ('<div class="ribbons" data-group="a" aria-hidden="true">'
            + "".join(gardes) + '</div>')


RUBANS = _rubans()

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
EUR = lambda n: f"{n:,}".replace(",", "&nbsp;") + "&nbsp;€"


FEUILLE = "riseva-mark"   # favicon

# ── briques communes ────────────────────────────────────────────────────────

# Le pictogramme feuille dessine a la main a disparu d'ici. La vitrine portait un
# logotype, l'application en portait un autre — le R geometrique de /brand — et un
# visiteur qui passe de la page d'accueil a la demonstration voyait deux marques.
# Avant la typographie et avant la couleur, c'est ce qui donne l'impression de deux
# produits mal recolles. Il n'y en a plus qu'un, et c'est celui de l'application.


def nav(liens, cta_texte, cta_href, note):
    """La barre du haut, et le panneau qui la remplace sous mille pixels."""
    grands = "\n    ".join(f'<a href="#{i}">{t}</a>' for i, t in liens)
    petits = "\n    ".join(
        f'<a href="#{i}"><span class="mono">{n:02d}</span>{t}</a>'
        for n, (i, t) in enumerate(liens, 1))
    return f"""<nav class="nav" id="nav">
  <a class="nav-brand" href="#hero" aria-label="Riseva, accueil">
    <img src="/brand/riseva-full.png" alt="Riseva" width="392" height="88">
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
        <img src="/brand/riseva-full-white.png" alt="Riseva" width="392" height="88">
      </div>
      <p>{pitch}</p>
    </div>{cols}
  </div>
  <div class="foot-bar">
    <span>&copy; 2026 Riseva</span>
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
<!-- Une classe posée avant le premier rendu, et rien d'autre. Les apparitions au
     défilement sont écrites « .js .rv », donc sans script le contenu est visible
     dès le départ : c'est le seul moyen qu'une animation ne puisse jamais
     conditionner l'affichage de ce qu'elle accompagne. -->
<script>document.documentElement.className+=" js";</script>
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
          <b class="mono">{n + 1:02d} - {quand}</b>
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
     ("associations", "Côté associations"), ("outil", "L'outil RSE"),
     ("pilotage", "Ce que vous pilotez"), ("prix", "Le prix"), ("faq", "Questions")],
    "Explorer la plateforme", "/app/", "Démonstration libre, sans rendez-vous")

PIED_ENT = pied(
    "Riseva met des entreprises françaises au service des associations qui protègent "
    "le vivant, partout en France. Une saison, un barème public, un rapport qui tient debout.",
    [("La saison", [("#saison", "Le déroulé"), ("#equipes", "Côté salariés"),
                    ("#associations", "Côté associations"), ("#outil", "L'outil RSE"),
                    ("#pilotage", "Ce que vous pilotez"), ("#affiches", "Les affiches"),
                    ("#perimetres", "Groupes et périmètres"),
                    ("#prix", "Le prix")]),
     ("Les règles", [("/reglement.html", "Le règlement du barème"),
                     ("/engagements.html", "Engagements de service"),
                     ("/securite.html", "Sécurité"),
                     ("/confidentialite.html", "Confidentialité")]),
     ("Aller plus loin", [("/associations.html", "Vous êtes une association"),
                          ("/inscription.html", "Réserver une place"),
                          ("mailto:contact@riseva.fr", "contact@riseva.fr"),
                          ("/mentions.html", "Mentions légales")])],
    "Saison 2027, préinscriptions ouvertes")


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
    répète à la main est une règle qu'on finit par oublier une fois, et cette
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
        <figcaption class="mono">{legende}</figcaption>
      </figure>"""


def photo(nom, alt, legende, classe="", eager=False):
    """Une illustration, et ce qu'elle est écrit dessous.

    Riseva n'a aucune photographie de mission réelle : elle n'a pas encore de
    mission. Ces images sont donc générées, et la page le dit sous chacune ,
    pas en petites lettres au bas d'une mention légale. C'est la seule
    condition à laquelle une illustration reste honnête : le lecteur doit
    pouvoir la regarder sans se demander si elle prouve quelque chose.

    Ce qu'elles font, elles, c'est montrer de quoi on parle. Une page qui vend
    du ramassage de berge, de la plantation et des refuges sans jamais montrer
    ni berge, ni arbre, ni animal demande au lecteur un effort d'imagination
    qu'il ne fera pas. La règle « pas de photo » corrigeait seize photos de
    bureaux en open space, ce qui était juste ; la remplacer par zéro image
    était une surcorrection.

    Ce qui reste interdit : présenter une image comme la trace d'une mission
    Riseva, montrer un visage reconnaissable, ou nommer une association qui
    n'aurait pas donné son accord."""
    fichier = PUBLIC / "photos" / f"{nom}.jpg"
    if not fichier.exists():
        raise SystemExit(f"illustration manquante : {fichier}")
    w, h = dimensions(fichier)
    charge = 'loading="eager" fetchpriority="high"' if eager else 'loading="lazy"'
    return f"""<figure class="photo{classe}">
        <img src="/photos/{nom}.jpg" alt="{alt}" {charge} decoding="async"
             width="{w}" height="{h}">
      </figure>"""


def video(nom, alt, legende, credit, classe=""):
    """Une boucle vidéo muette, avec sa première image en attendant.

    Trois conditions, et elles ne sont pas négociables. MUETTE et sans contrôle
    de son : une page qui parle sans qu'on le lui demande se fait fermer.
    L'AFFICHE est la première image du film, servie tout de suite : sans elle,
    le bloc est un rectangle vide pendant le chargement, et c'est le premier
    écran. Et POUR QUI A DEMANDÉ MOINS D'ANIMATION, la vidéo ne se lance pas du
    tout, l'affiche reste, la page ne perd rien.

    Le fichier pèse moins qu'une des photographies de cette page : dix secondes
    en 1 440 de large, sans piste audio, deux formats pour n'obliger aucun
    navigateur à un décodeur qu'il n'a pas."""
    poster = PUBLIC / "video" / f"{nom}.jpg"
    w, h = dimensions(poster)
    return f"""<figure class="photo video{classe}">
        <video width="{w}" height="{h}" poster="/video/{nom}.jpg"
               autoplay muted loop playsinline preload="metadata"
               aria-label="{alt}">
          <source src="/video/{nom}.webm" type="video/webm">
          <source src="/video/{nom}.mp4" type="video/mp4">
        </video>
        <figcaption class="mono">{legende}
          <span class="photo-src">{credit}, ce n'est pas une mission Riseva</span>
        </figcaption>
      </figure>"""


def chiffres(items):
    """Les quelques nombres qui portent l'argument, en grand.

    Aucun n'est un résultat de Riseva : ce sont des faits extérieurs, datés et
    sourcés, ou des propriétés du produit qui ne dépendent que de nous. Un
    chiffre de performance client à cet endroit serait le premier mensonge de
    la page, puisqu'il n'existe aucun client."""
    lis = "".join(f"""
        <div><b>{n}</b><span>{t}</span>{f'<cite>{src}</cite>' if src else ''}</div>"""
        for n, t, src in items)
    return f'<div class="chiffres">{lis}\n      </div>'


def piliers(items):
    """Les quatre dimensions du produit, en haut de page.

    Ce que ce bloc corrige : la page annonçait les quatre choses que Riseva fait
    — le terrain, le collectif, l'outil, la preuve — mais elles étaient dissoutes
    dans deux paragraphes d'introduction. Un visiteur qui lit en diagonale, et
    c'est tout le monde, en retenait une sur quatre, et rarement la même.

    Ce ne sont pas des arguments : chaque case porte un fait vérifiable et mène à
    la section qui le développe. Une case sans chiffre serait une promesse, et
    quatre promesses côte à côte se lisent comme une plaquette."""
    out = ""
    for n, (cle, titre, corps, ancre) in enumerate(items):
        d = f" d{n}" if n else ""
        out += f"""
        <a class="pil rv{d}" href="#{ancre}">
          <span class="pil-n mono">{n + 1:02d}</span>
          <span class="pil-k mono">{cle}</span>
          <span class="pil-h">{titre}</span>
          <span class="pil-p">{corps}</span>
        </a>"""
    return f'    <div class="piliers">{out}\n    </div>'


def objection(question, reponse):
    """Une question fréquente, et sa réponse en une phrase.

    Deux corrections successives ici, et la seconde va plus loin que la première.
    Ces phrases étaient d'abord entre guillemets : une phrase entre guillemets se
    lit comme une citation, donc comme un client qui l'aurait dite, et Riseva n'a
    pas encore de client. Retirer les guillemets n'a pas suffi, écrites au
    registre parlé (« mes gars sur le terrain », « c'est une usine à gaz »),
    elles ressemblaient toujours à des verbatims recueillis, et le surtitre
    « L'objection » les théâtralisait.

    Elles sont donc reformulées en questions neutres. On perd le mordant ; on
    perd aussi le faux témoignage, et c'est le bon échange."""
    return f"""<div class="obj">
      <p class="obj-l mono">Question fréquente</p>
      <p class="obj-q">{question}</p>
      <p class="obj-r">{reponse}</p>
    </div>"""


HERO_ENT = f"""<header class="hero hero--doc" id="hero">
  <div class="layer">
    <p class="eyebrow mono">Plateforme RSE, challenge de saison, associations du vivant</p>
    <h1 class="h1 h1--doc">Vos équipes sur le terrain.<br>
      <span class="it">Vos chiffres RSE, sans courir après personne.</span></h1>

    <div class="doc-tete">
    <div class="doc-intro">
      <p>Riseva organise une <b>saison d'engagement</b> d'un an autour d'<b>associations
        vérifiées</b> proches de vos sites : berges de rivière, forêts, refuges. Vos salariés
        choisissent une action, y vont ensemble, et c'est <b>l'association qui confirme</b> ce
        qui a été fait.</p>
      <p>Dans le même abonnement, l'<b>outil RSE</b> qui va avec. Vous choisissez les rubriques
        que vous demandez, chaque site les voit apparaître sur son écran, et quand tout le monde
        a répondu le <b>rapport est déjà fait</b> : à l'écran, en classeur, en CSV. Vous ne
        relancez personne, <b>et sans module en supplément</b>.</p>
      <div class="hero-cta">
        <a class="btn btn-lg" href="#prix"><span class="dot"></span>Calculer mon tarif</a>
        <a class="tlink" href="/app/">Explorer la plateforme</a>
      </div>
      <p class="doc-micro mono">Démonstration libre. Aucun rendez-vous, aucune carte
        bancaire.</p>
    </div>

    <dl class="fiche">
      <div><dt class="mono">Saison</dt><dd>12 mois, sans reconduction tacite</dd></div>
      <div><dt class="mono">Déploiement</dt><dd>un lien à diffuser, rien à installer</dd></div>
      <div><dt class="mono">Périmètre</dt><dd>une entreprise, ou un groupe multi-sites</dd></div>
      <div><dt class="mono">Tarif</dt><dd>de <b>{EUR(TARIFS['paliers'][0]['prix'])} à
        {EUR(TARIFS['paliers'][-2]['prix'])} HT</b> l'an selon l'effectif, un à huit sites
        compris. Au-delà de deux mille salariés, sur devis à partir de
        {EUR(TARIFS['paliers'][-1]['prix'])}. Pas de facturation par salarié, pas de commission
        sur les dons.</dd></div>
      <div><dt class="mono">Lancement</dt><dd>-10 % pour les 20 premières entreprises,
        sur leur première saison</dd></div>
      <div><dt class="mono">Le dossier</dt><dd><a href="/reglement.html">le règlement de la
        saison</a>, <a href="/cgv.html">les conditions de vente</a> et
        <a href="/engagements.html">les engagements de service</a>, lisibles avant de
        signer</dd></div>
    </dl>
    </div>

    {piliers([
      ("Le terrain", "Des associations vérifiées<br><span class='it'>près de chaque site.</span>",
       "Berges, forêts, refuges, maraudes. Des demi-journées réelles, pour quelqu'un d'autre, "
       "avec un résultat visible le soir même. Riseva vérifie chaque structure avant de la "
       "rendre visible.", "associations"),
      ("Le collectif", "Un challenge d'un an<br><span class='it'>qui fédère les équipes.</span>",
       "Un objectif compté en personnes et non en points : il ne s'atteint qu'en allant "
       "chercher quelqu'un qui n'est pas encore venu. Le classement situe les entreprises "
       "entre elles sans nommer la moitié basse.", "equipes"),
      ("L'outil RSE", "Huit rubriques,<br><span class='it'>vingt-sept valeurs, dix taux.</span>",
       "Effectifs, sécurité, formation, diversité, énergie et eau, déchets, mobilité, achats. "
       "Collectés site par site, calculés avec leur formule à côté du chiffre, rendus en "
       "classeur et en CSV. Registre de sécurité, fiche VSME et accès CSE compris.", "outil"),
      ("La preuve", "Chaque chiffre<br><span class='it'>garde sa source.</span>",
       "Les sites saisissent leurs valeurs, les associations confirment les missions, Riseva "
       "additionne et restitue. Chaque ligne porte sa date, son auteur et sa méthode : c'est "
       "la pièce qu'on vous demande en appel d'offres.", "pilotage"),
    ])}

    {chiffres([
      ("233 Md€", "de commande publique par an en France, dont environ 60 % vers des PME. "
        "Depuis le 21 août 2026, toute nouvelle consultation comporte un critère "
        "environnemental.",
        "Loi Climat et résilience, art. 35, code de la commande publique, art. L. 2152-7"),
      ("60 %", "de réduction d'impôt sur le mécénat, jusqu'à 2 M€ de dons sur l'exercice, "
        "dans la limite de 20 000 € ou 5 pour mille du chiffre d'affaires.",
        "Article 238 bis du CGI"),
      ("14 j", "le délai au bout duquel une mission sans réponse est clôturée, avec son "
        "résultat marqué comme estimé partout où il apparaît. C'est notre engagement, et il "
        "ne dépend que de nous.", None),
      ("0 €", "de commission sur les dons, et rien de facturé aux associations. Le virement "
        "va du donateur à l'association, sans passer par Riseva.", None),
    ])}

    <div class="scene">
    {capture("admin-tableau",
             "Le tableau de bord d'un responsable RSE dans Riseva : indicateurs de la saison, "
             "résultats confirmés par les associations, et comparaison entre sites",
             "Tableau de bord", " shot--large", eager=True)}
    </div>
  </div>
</header>"""


SAISON_ENT = f"""<section id="saison" class="band">
  <div class="layer">
{entete("Le déroulé", "Une saison,<br><span class='it'>quatre rendez-vous.</span>",
        "Le rythme est le même pour tout le monde : un début, un courant, des points d'étape, "
        "une fin. Et une date à laquelle on regarde ce qui a réellement été fait.")}

    {objection("Qui pilotera la saison au quotidien ?",
               "Vous diffusez un lien, les salariés créent leur compte, les associations "
               "publient leurs besoins, et les rapports arrivent finis à chaque clôture. "
               "Personne chez vous n'a de fichier à tenir.")}

{etapes([
  ("Janvier", "Le <span class='it'>départ.</span>",
   "La saison s'ouvre. Vous diffusez un lien, chacun crée son compte. Vos équipes voient "
   "les besoins publiés par les associations proches de vos sites."),
  ("Février à octobre", "Les <span class='it'>missions.</span>",
   "Les missions se font, une par une. Un salarié se propose, l'association l'accueille, "
   "puis confirme que c'est arrivé. C'est cette confirmation qui compte."),
  ("Chaque trimestre", "Le <span class='it'>point.</span>",
   "Un rapport se génère tout seul à la clôture de chaque trimestre : ce qui a été fait, "
   "ce qui a été confirmé, ce qui reste ouvert. Vous n'avez rien à consolider."),
  ("Décembre", "Le <span class='it'>bilan.</span>",
   "Le rapport annuel arrive, avec le dossier de traçabilité : pièces, sources et méthode. "
   "Puis vous décidez si vous recommencez. Il n'y a pas de reconduction tacite."),
])}

  </div>
</section>"""


EQUIPES_ENT = f"""<section id="equipes">
  <div class="layer">
{entete("Côté salariés", "Ce que vos salariés<br><span class='it'>voient réellement.</span>",
        "Trois écrans, et une règle : chacun se propose. Un salarié qui se sent inscrit "
        "d'office ne revient pas une deuxième fois.")}

    {objection("Est-ce que ça prend, avec des équipes en poste ou sur le terrain ?",
               "Le premier obstacle au bénévolat d'entreprise n'est ni le temps ni la cause : "
               "c'est de ne pas savoir avec qui on y va. L'écran répond à cette question-là "
               "avant de parler de points.")}

    {photo("depart-chantier",
           "Quatre personnes en bleu de travail chargent des outils dans un utilitaire devant "
           "une usine, au lever du jour", "", " photo--large-gauche")}

    <div class="duo duo--pile">
      {capture("salarie-saison",
               "Le tableau de bord d'un salarié : ses points, et l'objectif collectif de son site",
               "L'objectif de son site")}
      {capture("salarie-actions",
               "La liste des besoins publiés par les associations proches du site du salarié",
               "Les besoins près de chez lui")}
    </div>

    <div class="trois3">
      <div><h4>Chacun choisit</h4>
        <p>Il se propose quand il le veut, et se retirer ne demande aucune
          justification.</p></div>
      <div><h4>L'objectif se compte en personnes</h4>
        <p>Un objectif en points s'atteint avec trois salariés très actifs. En personnes, il
          ne s'atteint qu'en allant chercher quelqu'un qui n'est pas encore venu, et c'est le
          geste qu'on cherche à provoquer.</p></div>
      <div><h4>On voit qui vient</h4>
        <p>Le nombre de collègues déjà inscrits est toujours affiché. Les prénoms
          n'apparaissent que pour ceux qui l'ont choisi, et jamais sur un don en
          argent.</p></div>
    </div>

    <p class="s-note"><a class="tlink" href="/app/">Explorer l'espace salarié</a></p>
  </div>
</section>"""


ASSOCIATIONS_ENT = f"""<section id="associations" class="band-moss">
  <div class="layer">
    {photo("berge-ramassage",
           "Trois personnes en waders remontent une berge de rivière avec des sacs de collecte, "
           "un matin d'automne", "", " photo--couverture")}
{entete("Côté associations", "L'association publie,<br><span class='it'>puis elle confirme.</span>",
        "Le chiffre final de votre rapport vient de la structure qui était sur place. C'est "
        "ce qui lui donne sa valeur devant un acheteur ou un commissaire aux comptes.")}

    {objection("Et s'il n'y avait rien autour d'un de vos sites ?",
               "La plateforme mesure l'offre associative dans un rayon de trente kilomètres "
               "autour de chaque site et vous le dit avant la saison. Vous pouvez signaler "
               "une zone à couvrir, ou inviter une association que vous connaissez déjà.")}

    <div class="photos3">
      {photo("refuge", "Un chien recueilli, allongé dans un box de refuge", "")}
      {photo("plantation", "Deux mains tassent la terre autour d'un jeune arbre planté", "")}
      {photo("collecte", "Des mains gantées trient des conserves dans des cagettes", "")}
    </div>

    {capture("asso-valider",
             "L'écran par lequel une association confirme ce qui a été réalisé",
             "La confirmation, en un clic",
             " shot--seule")}

    <ul class="trois">
      <li><b>Aucun abonnement, aucune commission.</b> Une association ne paie jamais rien, et
        Riseva ne prélève rien sur ses dons.</li>
      <li><b>Une confirmation courte, sans se connecter.</b> Trois boutons dans un message
        après la date prévue, et c'est terminé.</li>
      <li><b>Rien à produire pour vous.</b> Passé quatorze jours sans réponse, la mission est
        clôturée et son résultat reste marqué <b>estimé</b> partout où il apparaît, vos
        rapports compris.</li>
    </ul>

    <div class="fmt-bloc fmt-bloc--incruste">
      <h3 class="fmt-titre">Ce qu'une association peut proposer</h3>
      <ul class="fmt-lignes">
        <li><div><b>Une demi-journée de bénévolat</b> : chantier, collecte, entretien, encadrés par
          l'association et sans compétence requise.</div><span>150 pts</span></li>
        <li><div><b>Une journée entière</b> sur un chantier ou une maraude.</div><span>300 pts</span></li>
        <li><div><b>Une mission de compétence</b> : compta, droit, informatique, communication,
          sur le temps de travail.</div><span>200 pts</span></li>
        <li><div><b>Le parrainage d'un animal</b> dans un refuge, pour une année.</div><span>250 pts</span></li>
        <li><div><b>L'adoption d'un animal</b> auprès d'un refuge partenaire, confirmée par le
          refuge.</div><span>400 pts</span></li>
        <li><div><b>Un don de matériel</b> : c'est l'association qui déclare ce qu'elle a reçu.</div><span>100 pts</span></li>
        <li><div><b>Un don en argent, par virement direct</b> de banque à banque,
          <b>sans transiter par Riseva</b>.</div><span>1 pt / 10 €</span></li>
      </ul>
      <p class="fmt-bareme">Sur le don en argent : <b>aucune commission</b>, aucun délai de
        reversement, <b>Riseva n'encaisse rien</b>, et les points sont crédités
        <b>quand l'association confirme la réception, et pas avant</b>. Le barème est identique
        pour toutes les entreprises et c'est la plateforme qui l'attribue, jamais l'association. Aucun format ne peut peser plus de la
        moitié des points d'une entreprise sur la saison. Le calcul complet, écrêtage compris,
        est dans <a href="/reglement.html">le règlement</a>, avec un exemple chiffré qui se
        refait à la main.</p>
    </div>

    <p class="s-note"><a class="tlink" href="/asso.html?id=a1">Voir une fiche d'association</a>
      &nbsp;-&nbsp; <a class="tlink" href="/associations.html">La page destinée aux associations</a></p>
  </div>
</section>"""


# ── les onglets : quatre captures, un seul emplacement ──────────────────────
# Faits en boutons radio et en CSS, sans une ligne de JavaScript. Un composant
# à onglets qui dépend d'un script est un composant qui n'affiche rien si le
# script ne charge pas, et l'écran qu'il cachait est précisément la preuve.
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
        "Quatre écrans de l'application, remplis avec un jeu de démonstration.")}

    {objection("Qu'obtient l'entreprise en fin de saison ?",
               "Des chiffres datés, confirmés par un tiers nommé, avec la méthode qui les a "
               "produits. C'est la pièce qu'on vous demande en appel d'offres et dans les "
               "questionnaires de vos donneurs d'ordre.")}

{onglets([
  ("miss", "Les missions", capture("missions",
      "La liste des missions d'une entreprise, avec leur état de confirmation",
      "Chaque mission, son association, son état")),
  ("rapp", "Les rapports", capture("rapports",
      "Le rapport trimestriel d'une entreprise dans Riseva",
      "Les rapports, en CSV et en PDF")),
  ("meca", "Le dossier de mécénat", capture("mecenat",
      "La piste d'audit du mécénat, salarié par salarié",
      "La piste d'audit du mécénat")),
  ("indi", "Les indicateurs", capture("indicateurs",
      "Les indicateurs sociaux et de sécurité, consolidés site par site",
      "Les indicateurs, formule comprise")),
])}

    <dl class="faits4 faits4--serre">
      <div><dt class="mono">Salariés mobilisés</dt><dd>et non le nombre de comptes ouverts</dd></div>
      <div><dt class="mono">Missions confirmées</dt><dd>séparées des missions estimées</dd></div>
      <div><dt class="mono">Résultats déclarés</dt><dd>arbres, kilos, repas, animaux</dd></div>
      <div><dt class="mono">Méthode et sources</dt><dd>exportables, datées, versionnées</dd></div>
    </dl>
  </div>
</section>"""


# ── l'outil RSE ─────────────────────────────────────────────────────────────
# La section que la page n'avait pas, et qui est pourtant la moitié de ce qu'on
# vend. Un responsable RSE n'achète pas un challenge : il achète de ne plus
# passer trois semaines par an à réclamer des chiffres à quatorze sites. Le
# challenge est ce qui fait venir les salariés ; l'outil est ce qui fait signer
# le budget.
#
# Elle est écrite en quatre temps parce que c'est un enchaînement, pas une liste
# de fonctionnalités : on demande, les sites répondent, personne ne relance, le
# rapport existe. Chaque temps dit ce qu'il remplace dans la vie réelle de celui
# qui lit.
OUTIL_ENT = f"""<section id="outil" class="band">
  <div class="layer">
{entete("L'outil RSE", "Ce que vous ne referez plus<br><span class='it'>à la main.</span>",
        "Ce qui coûte cher dans un programme RSE, ce n'est pas le calcul. C'est d'obtenir "
        "les chiffres de chaque site, et de relancer jusqu'à ce que le dernier réponde.")}

    {objection("On a déjà un tableur pour tout ça.",
               "Riseva ne fait rien qu'un tableur ne sache faire. Elle fait ce qu'un tableur "
               "ne fait pas : demander, prévenir à votre place, et vous dire qui manque "
               "encore.")}

{formats([
  ("Vous demandez", "Les rubriques que vous voulez,<br><span class='it'>et rien d'autre.</span>",
   "Effectifs, sécurité, formation, diversité, énergie et eau, déchets, mobilité, achats. "
   "Vous cochez ce que vous demandez pour cette période, et l'écran vous dit combien de "
   "valeurs chaque site devra trouver <b>avant</b> que la collecte parte. C'est le seul "
   "chiffre qui prédit le taux de réponse : vingt-sept champs reviennent à moitié remplis, "
   "six reviennent entiers."),
  ("Les sites répondent", "Sur leur écran,<br><span class='it'>pas dans votre boîte.</span>",
   "Chaque référent de site voit ce qu'on attend de lui, rangé par source : la paie pour les "
   "effectifs, le registre pour la sécurité, les factures pour l'énergie. Chaque champ dit ce "
   "qu'on compte et ce qu'on ne compte pas, pour que deux sites ne divergent pas en silence. "
   "Celui qui saisit ne peut pas approuver sa propre saisie."),
  ("Personne ne relance", "Le rappel part tout seul,<br><span class='it'>et il ne vient pas de vous.</span>",
   "Tant qu'un site n'a pas répondu, il le voit sur son tableau de bord, avec le nombre de "
   "jours qui restent. Vous, vous voyez qui manque, nommément. Aucun courriel à écrire, "
   "aucune liste à tenir. Et si personne ne répond, la période se clôt <b>sans réponse</b> "
   "plutôt que d'être comblée avec celle d'avant."),
  ("Le rapport existe déjà", "À l'écran, en classeur,<br><span class='it'>en CSV.</span>",
   "Quand tout le monde a répondu, il n'y a rien à consolider : totaux par rubrique avec le "
   "nombre de sites sur lequel chaque somme porte, taux calculés sur les sommes et jamais en "
   "moyenne de taux, valeurs manquantes listées site par site. Le classeur a un onglet par "
   "rubrique et un onglet de définitions. Tout est fabriqué dans votre navigateur."),
])}

    {capture("indicateurs",
             "L'écran de collecte des indicateurs dans Riseva : l'état de chaque site, les "
             "totaux par rubrique et les taux calculés",
             "La collecte, et le rapport qui en sort", " shot--seule")}

    <dl class="faits4 faits4--serre">
      <div><dt class="mono">Le dictionnaire</dt><dd>pour chaque clé, ce qu'on compte et ce
        qu'on ne compte pas, daté avec la période</dd></div>
      <div><dt class="mono">Le registre de sécurité</dt><dd>événements, circonstances, plan
        d'actions avec ses échéances</dd></div>
      <div><dt class="mono">La fiche VSME</dt><dd>les onze rubriques de la norme européenne
        volontaire, et ce qui reste vide</dd></div>
      <div><dt class="mono">L'accès CSE</dt><dd>en lecture, sans nominatif, et rien qui porte
        sur moins de cinq personnes</dd></div>
    </dl>

    <p class="s-note">Riseva tient le classeur ; c'est vous qui signez. Les valeurs sont celles
      que vos sites ont écrites, elles restent les vôtres, et la plateforme ne les interprète
      pas. <a class="tlink" href="/app/">Ouvrir l'écran de collecte</a></p>
  </div>
</section>"""


# ── ce que ça change ────────────────────────────────────────────────────────
# Trois bénéfices, et chacun porte son chiffre. Dans la version précédente,
# celui du milieu n'en avait pas : au lieu de trois colonnes, l'œil voyait deux
# colonnes et un trou. Le rang a donc changé, et le troisième a reçu le sien.
CHANGE_ENT = f"""<section id="change" class="band">
  <div class="layer">
{entete("Ce que ça change", "Trois effets,<br><span class='it'>et leur date.</span>",
        "Deux échéances réglementaires arrivent, et une troisième chose se joue en interne, "
        "tous les jours.")}

{retombees([
  ("Des chiffres datés pour vos <span class='it'>appels d'offres.</span>",
   "Depuis le 21 août 2026, toute nouvelle consultation de marché public comporte un critère "
   "environnemental, sans seuil de montant ni condition de secteur. Ce qu'on vous demande "
   "alors n'est pas une intention : ce sont des chiffres datés, avec leur méthode. C'est "
   "exactement ce que produit le rapport.",
   "21.08.26", "Entrée en vigueur du critère environnemental pour toute nouvelle "
   "consultation. Code de la commande publique, art. L. 2152-7, date fixée par le décret "
   "n° 2022-767 du 2 mai 2022."),
  ("Des allégations que vous pouvez <span class='it'>écrire.</span>",
   "À partir du 27 septembre 2026, les allégations environnementales vagues sont encadrées "
   "dans toute l'Union. « Engagés pour la planète » devient difficile à tenir ; "
   "« 42 demi-journées confirmées par 7 associations en 2027 » tient devant un contrôle.",
   "27.09.26", "Entrée en application de la directive (UE) 2024/825."),
  ("Des équipes qui se <span class='it'>parlent.</span>",
   "Une demi-journée de chantier met dans la même camionnette des gens qui ne se croisent "
   "jamais. Ce n'est pas un séminaire : c'est un travail réel, pour quelqu'un d'autre, avec "
   "un résultat visible le soir même.",
   "1 sur 10", "l'objectif de salariés mobilisés proposé par défaut sur chaque site, "
   "calculé sur l'effectif et modifiable."),
])}
  </div>
</section>"""


# ── les affiches ────────────────────────────────────────────────────────────
# Le seul support papier du produit, et le seul objet Riseva qu'un salarié voit
# sans ouvrir un écran. Il est montré tel qu'il sort de l'application, avec le
# lien de l'entreprise dedans et un code QR qui se scanne pour de bon.
AFFICHES_ENT = f"""<section id="affiches">
  <div class="layer">
{entete("Les affiches", "Ce qui se met<br><span class='it'>au-dessus de la machine à café.</span>",
        "Un lien envoyé une fois par courriel se perd. Une affiche reste, et elle parle aux "
        "gens qui n'ouvrent jamais leurs mails.")}

    <div class="aff-scene">
      {photo("affiche-bureau",
             "Une affiche Riseva collée sur la paroi vitrée d'un plateau de bureaux, "
             "visible depuis le couloir", "", " photo--mur")}
      <div class="aff-encart">
        {capture("affiche",
                 "L'affiche A3 générée par Riseva : le nom de l'entreprise, la saison, les "
                 "formats proposés, le lien d'inscription et son code QR",
                 "", " shot--affiche")}
        <p class="mono">Celle que la plateforme génère, avec votre lien et son code QR</p>
      </div>
      <div class="aff-texte">
        <h3>Elle porte le lien de votre entreprise</h3>
        <p>Chaque affiche est générée avec le lien d'inscription de vos équipes et le code QR
          qui va avec. Un salarié le scanne depuis la salle de pause et son compte est ouvert
          avant qu'il soit remonté à son poste.</p>
        <h3>Quatre envois compris</h3>
        <p>Elles partent imprimées, en nombre suffisant pour tous vos sites, à quatre moments
          de la saison. Un site qui ouvre en cours d'année la réimprime lui-même.</p>
        <p class="s-note"><a class="tlink" href="/app/">Voir l'écran des supports</a></p>
      </div>
    </div>
  </div>
</section>"""


PERIMETRES_ENT = f"""<section id="perimetres" class="band">
  <div class="layer">
{entete("Groupes et périmètres", "Un même cadre,<br><span class='it'>plusieurs périmètres.</span>",
        "Une société seule, ou un groupe et ses filiales. Un écran pour les montrer.")}

    {capture("groupe",
             "La vue consolidée d'un groupe : sociétés, sites et indicateurs réunis",
             "La vue consolidée d'un groupe",
             " shot--seule")}

    <div class="duo duo--texte">
      <div class="col">
        <h3>Pour un groupe</h3>
        <p>Trois niveaux, parce que le droit en compte trois : le groupe, les <b>sociétés</b>,
          chacune avec son SIREN, son contrat et son plafond de mécénat, et leurs
          <b>établissements</b>. Payer la facture ne donne pas accès aux personnes : la
          direction voit des agrégats, jamais l'identité d'un salarié d'une filiale dont elle
          n'est pas l'employeur, et c'est une frontière écrite dans la base. Le classement
          entre sites est désactivé par défaut.</p>
        <p><a class="tlink" href="#prix">L'offre groupe est sur devis</a></p>
      </div>
      <div class="col">
        <h3>Pour une société seule</h3>
        <p>Le même produit, sans le niveau du dessus : un contrat, un plafond de mécénat, et
          autant d'<b>établissements</b> que vous en avez. La collecte des indicateurs
          fonctionne à l'identique, site par site, et le rapport porte alors sur la société.
          Une société qui rejoint un groupe plus tard ne recommence rien : ses périodes
          passées restent lisibles telles qu'elles ont été arrêtées.</p>
        <p><a class="tlink" href="#outil">L'outil RSE, dans le détail</a></p>
      </div>
    </div>
  </div>
</section>"""


BANDEAU_ENT = """<section id="rejoindre" class="bandeau">
  <div class="layer">
    <div class="bandeau-in">
      <div>
        <h2>Douze places pour la première saison.</h2>
        <p>C'est le nombre d'entreprises que nous pouvons accompagner correctement sur une
          première année. Vous achetez une saison accompagnée de bout en bout, avec cinq
          critères de démarrage constatés avec vous avant que le solde soit facturé.</p>
      </div>
      <div class="bandeau-cta">
        <a class="btn btn-lg" href="/inscription.html"><span class="dot"></span>Réserver une place</a>
        <span class="mono">Préinscription gratuite, sans carte bancaire.
          Une personne de l'équipe vous répond.</span>
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
   f"{int(TARIFS['fondateur_taux'] * 100)} % de remise sur leur première saison.</p>"
   "<p>Pas de facturation par salarié, pas de module en supplément, pas de commission sur les "
   "dons. Les associations, elles, ne paient jamais rien.</p>"
   "<p>Pour situer : les outils RSE français facturent couramment de 5 000 à 50 000 € par an, "
   "et de 3 000 à 12 000 € pour ceux qui visent les PME.</p>"),
  ("Qu'est-ce qui est compris dans l'abonnement ?",
   "<p>Une saison d'un an, avec les comptes correspondant à votre effectif, les formats du "
   "barème, l'accompagnement au lancement, les affiches et les supports, et les rapports "
   "trimestriels et annuel.</p>"
   "<p>Sur le don en argent, une précision qui compte : Riseva <b>n'encaisse rien</b>. Le "
   "virement va du donateur à l'association, avec une référence que nous émettons. Nous ne "
   "sommes donc pas un établissement de paiement, il n'y a aucune commission, et l'association "
   "reçoit la totalité du don.</p>"),
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
   "partout où il apparaît, y compris dans vos rapports.</p>"),
  ("Le classement, il sert à quoi ?",
   "<p>À donner un rendez-vous que personne n'a besoin d'imposer. Il se joue entre "
   "entreprises, jamais entre salariés : personne n'est noté individuellement et une équipe "
   "qui passe son tour ne pénalise personne. La moitié basse n'est jamais nommée.</p>"
   "<p>Vous voyez votre score et votre rang dès trois entreprises inscrites dans votre "
   "catégorie. Le décile, lui, n'apparaît qu'à partir de <b>dix entreprises</b> dans la "
   "catégorie : un « top 10 % » sur onze entreprises désigne la première et lui prête une "
   "avance qu'elle n'a pas.</p>"),
  ("Est-ce que la dépense est déductible ?",
   "<p>Deux lignes, deux régimes. L'abonnement Riseva est une prestation de services : il "
   "entre dans vos charges, TVA récupérable. Le mécénat suit l'article 238 bis du CGI et "
   "donne droit à 60 % de réduction d'impôt jusqu'à <b>2 millions d'euros de dons sur "
   "l'exercice</b>, puis 40 % au-delà, dans la limite de 20 000 € ou 5 pour mille du chiffre "
   "d'affaires, le plus élevé des deux.</p>"
   "<p>Riseva calcule une estimation à partir de ce qu'elle connaît, et attend votre chiffre "
   "d'affaires, vos dons faits ailleurs et vos reports antérieurs avant d'afficher un "
   "plafond : sans eux, le chiffre serait faux. Votre expert-comptable arrête le montant.</p>"),
  ("Quelles données sortent de chez nous ?",
   "<p>Le strict nécessaire, hébergé dans l'Union européenne. L'employeur ne voit jamais le "
   "détail nominatif des dons personnels de ses salariés, et un salarié peut se retirer sans "
   "avoir à se justifier. La base légale est l'intérêt légitime, pas le consentement : nous "
   "n'affichons donc pas de case à cocher qui n'en serait pas une.</p>"
   "<p>Consulter une page publique de riseva.fr ne déclenche aucune requête vers un domaine "
   "extérieur, polices comprises. Un test de la recette échoue si ce n'est plus vrai.</p>"),
  ("Sur quoi s'engage-t-on ?",
   "<p>Sur une saison, et rien de plus. <b>Pas de reconduction tacite</b> : votre abonnement "
   "s'arrête à la clôture, après remise du rapport annuel, et vous décidez ensuite. Tant que "
   "vous n'avez pas accepté la saison suivante, aucune facture n'est émise et rien n'est "
   "dû.</p>"),
  ("Quel est le périmètre exact de la plateforme ?",
   "<p>Riseva documente l'enregistrement administratif des associations avec la date du "
   "contrôle, les validations et qui les a faites, les méthodes de calcul publiées et "
   "refaisables à la main, les accès, les exports et les envois, ainsi que les engagements "
   "de service et ce qui se passe s'ils ne sont pas tenus.</p>"
   "<p>Elle ne se substitue pas aux métiers voisins : elle ne certifie pas un impact, ne "
   "produit pas de bilan carbone, n'attribue pas de note RSE parce qu'elle serait "
   "<b>juge et partie</b>, ne remplace pas votre expert-comptable sur la valorisation d'un "
   "don, et ne dépose aucune déclaration à votre place. Elle ne classe pas non plus vos "
   "sites sur leurs accidents du travail : un classement de ce genre pousse à "
   "<b>sous-déclarer</b>, et c'est l'inverse de ce qu'on cherche. Chacun de ces points est "
   "traité en détail dans "
   "<a href='/reglement.html'>le règlement</a> et dans "
   "<a href='/engagements.html'>les engagements de service</a>.</p>"),
  ("Riseva a-t-elle déjà des résultats à montrer ?",
   "<p>Non, et cette page n'en affiche aucun. La première saison démarre en janvier : les "
   "écrans montrés ici viennent d'un jeu de démonstration et servent à montrer la forme des "
   "restitutions. Les chiffres publics de la page sont des faits extérieurs, datés et "
   "sourcés.</p>"
   "<p>Ce qui est contractuel dès le premier jour est écrit dans "
   "<a href='/engagements.html'>les engagements de service</a> : les cinq critères de "
   "démarrage, l'acompte remboursé s'ils ne sont pas constatés, et le délai de quatorze "
   "jours au terme duquel un résultat non confirmé reste marqué comme estimé.</p>"),
])


def jalons(eyebrow, titre, note, items, ident="preuve", bande=" class=\"band-moss\"",
           illustration=""):
    """Une liste de réponses numérotées.

    Il y avait une photo de refuge ici, avec une légende. La légende attirait
    fortement l'œil juste à côté de cinq réponses qui, elles, engagent."""
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
    {illustration}
    <ul class="stakes-list stakes-list--large">{lis}
    </ul>
  </div>
</section>"""


# ---------------------------------------------------------------------------
#  Le prix, en clair, sur la page.
#  Un acheteur qui doit demander le prix se dit deux choses : que c'est cher, et
#  qu'il va falloir négocier. Les deux coûtent une réunion. La grille est donc
#  affichée, lue depuis `data.js`, et la recette vérifie qu'elle correspond à
#  celle que la plateforme facture. Un devis nominatif reste proposé juste à
#  côté, pour ceux qui en ont besoin pour engager la dépense.
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
    return f"""<section id="prix" class="band-moss">
  <div class="layer">
{entete("Le prix", "Un tarif public,<br><span class='it'>avant de décider.</span>",
        "Une saison de douze mois, tout compris. Le tarif suit votre effectif parce que c'est "
        "lui qui détermine ce que nous produisons : les comptes, les affiches, les sites à "
        "consolider, les rapports.")}

    <div class="tar rv">
      <table class="tar-t">
        <caption class="sr-only">Grille tarifaire par tranche d'effectif</caption>
        <tbody>{lignes}
        </tbody>
      </table>
      <p class="tar-n">Site supplémentaire au-delà de ceux compris : {EUR(TARIFS['site_sup'])} HT.
        Au-delà de deux mille salariés, le tarif est établi sur devis à partir du dernier palier.</p>
    </div>

    <div class="deux-col deux-col--prix">
      <div class="col col--oui">
        <h3>Ce qui est compris</h3>
        <ul class="tar-l">{inclus}</ul>
      </div>
      <div class="col col--non">
        <h3>Ce qui reste à votre charge</h3>
        <ul class="tar-l tar-l--non">{exclus}</ul>
      </div>
    </div>

    <div class="tar-sim">
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
      <p class="tar-sim-cta"><a class="btn" href="/inscription.html">Recevoir un devis daté</a>
        <span class="mono">Le devis reprend exactement ce calcul.</span></p>
      <div class="tar-sim-notes">
        <p class="tar-n"><b>Tarif fondateur : -{int(TARIFS['fondateur_taux'] * 100)} %</b>
          pour les {TARIFS['fondateur_places']} premières entreprises qui signent, jusqu'au
          31 décembre 2026. Il porte sur votre <b>première saison, et sur elle seule</b> :
          nous ne garantissons le prix d'aucune saison que nous n'avons pas encore vécue.
          Passé ces places, la grille s'applique telle quelle.</p>
        <p class="tar-n"><b>Règlement :</b> {int(TARIFS['acompte_taux'] * 100)} % à la commande,
          le solde à trente jours après l'ouverture de votre saison ; règlement intégral à la
          commande, -{int(TARIFS['remise_comptant'] * 100)} %. L'acompte paie le premier
          envoi d'affiches et l'ouverture de vos comptes, qui partent avant la première
          mission. Il y a {TARIFS['affiches']} envois dans la saison.</p>
      </div>
    </div>
  </div>
</section>"""


PRIX_ENT = grille_tarifaire()


CORPS_ENT = "\n\n".join([
    HERO_ENT,           # 1. l'offre, le prix, et une capture de l'application
    SAISON_ENT,         # 2. « qui va gérer ça chez moi ? »
    EQUIPES_ENT,        # 3. « est-ce que mes équipes vont y aller ? »
    ASSOCIATIONS_ENT,   # 4. « et s'il n'y a rien autour de mon site ? »
    PILOTAGE_ENT,       # 5. « qu'est-ce que j'y gagne ? »
    OUTIL_ENT,          # 6. « et le travail que ça m'épargne ? »
    CHANGE_ENT,         # 7. trois effets, et leur date
    AFFICHES_ENT,       # 8. le seul objet Riseva qu'un salarié voit sans écran
    PERIMETRES_ENT,     # 9. groupes et services RSE, en porte d'entrée
    PRIX_ENT,           # 10. la grille, et le devis à côté
    FAQ_ENT,            # 11. les questions qui décident vraiment
    BANDEAU_ENT,
])


# ═══════════════════════════════════════════════════════════════════════════
#  VITRINE ASSOCIATIONS
#  Autre public, autre peur, autre parcours. Une présidente ne cherche pas un
#  outil : elle se demande si ça va lui coûter du temps, si on va s'approprier
#  son travail, et si quelqu'un viendra vraiment.
# ═══════════════════════════════════════════════════════════════════════════

NAV_ASSO = nav(
    [("comment", "Comment ça marche"), ("challenge", "Pourquoi elles viennent"),
     ("argent", "Les dons"), ("faq", "Vos questions")],
    "Inscrire mon association", "#commencer", "Gratuit, et sans exclusivité")

PIED_ASSO = pied(
    "Riseva met des entreprises françaises au service des associations qui protègent le "
    "vivant. Gratuit pour vous, sans exclusivité, et sans commission sur vos dons.",
    [("Comprendre", [("#comment", "Comment ça marche"),
                     ("#challenge", "Pourquoi elles viennent"),
                     ("#argent", "Les dons"), ("#faq", "Vos questions")]),
     ("Les textes", [("/charte-associations.html", "La charte des associations"),
                     ("/reglement.html", "Le règlement du barème"),
                     ("/moderation.html", "Signalement et modération"),
                     ("/confidentialite.html", "Confidentialité")]),
     ("Aller plus loin", [("/", "Vous êtes une entreprise"),
                          ("/asso.html?id=a1", "Voir une page d'association"),
                          ("mailto:contact@riseva.fr", "contact@riseva.fr"),
                          ("/mentions.html", "Mentions légales")])],
    "Gratuit pour les associations, toujours")


HERO_ASSO = f"""<header class="hero hero--doc" id="hero">
  <div class="layer">
    <p class="eyebrow mono">Gratuit pour les associations, sans exclusivité</p>
    <h1 class="h1 h1--doc">Dites ce dont vous avez besoin.<br>
      <span class="it">Des salariés d'entreprises proches viennent le faire.</span></h1>

    <div class="doc-tete">
      <div class="doc-intro">
        <p>Vous publiez une annonce : des bras pour un samedi, du matériel, un coup de main
          financier. Des salariés d'entreprises abonnées se proposent. Quand c'est fait, vous
          confirmez en un clic depuis un courriel.</p>
        <p>Les entreprises suivent une saison d'engagement, avec un classement entre elles.
          Les points ne comptent qu'après votre confirmation : c'est vous qui décidez si la
          mission a eu lieu.</p>
        <div class="hero-cta">
          <a class="btn btn-lg" href="#commencer"><span class="dot"></span>Inscrire mon association</a>
          <a class="tlink" href="#comment">Voir comment ça marche</a>
        </div>
        <p class="doc-garanties">Gratuit. Sans exclusivité. Sans commission sur vos dons.
          Rien à installer.</p>
        <p class="doc-micro">Cinq minutes, et une personne de l'équipe vous rappelle.</p>
      </div>

      <dl class="fiche">
        <div><dt class="mono">Prix</dt><dd>gratuit, aujourd'hui et après</dd></div>
        <div><dt class="mono">Engagement</dt><dd>aucune exclusivité, vous continuez tout ce que
          vous faites ailleurs</dd></div>
        <div><dt class="mono">Sur vos dons</dt><dd>aucune commission. L'argent va du donateur à
          votre compte, sans passer par nous</dd></div>
        <div><dt class="mono">Technique</dt><dd>rien à installer. Tout se fait depuis un
          courriel</dd></div>
      </dl>
    </div>

    {photo("collecte", "Des mains gantées trient des conserves dans des cagettes lors d'une "
           "collecte solidaire", "", " photo--bande", eager=True)}

    {chiffres([
      ("0 €", "à payer, et aucune commission sur vos dons.", None),
      ("1 clic", "pour confirmer une mission, depuis un courriel.", None),
      ("5 min", "pour publier une annonce. Nous la rédigeons avec vous si vous préférez.",
       None),
      ("3", "façons d'être aidé : des bras, du matériel, de l'argent.", None),
    ])}

    {capture("asso-tableau",
             "Le tableau de bord d'une association dans Riseva",
             "Le tableau de bord d'une association, avec des chiffres de démonstration",
             " shot--large")}
  </div>
</header>"""


COMMENT_ASSO = f"""<section id="comment" class="band">
  <div class="layer">
{entete("Comment ça marche", "Trois gestes,<br><span class='it'>et c'est tout.</span>",
        "Riseva se charge du reste : les invitations, les rappels, et le suivi des missions.")}

{etapes([
  ("Vous publiez", "Une <span class='it'>annonce.</span>",
   "Ce dont vous avez besoin, pour quelle date, combien de personnes. Cinq minutes. Si vous "
   "préférez, appelez-nous : nous la rédigeons avec vous."),
  ("Des salariés répondent", "Ils <span class='it'>viennent.</span>",
   "Les salariés des entreprises abonnées proches de chez vous voient l'annonce et se "
   "proposent. Vous voyez qui vient et pour quelle date."),
  ("Vous confirmez", "En <span class='it'>un clic.</span>",
   "Après la date, vous recevez un courriel avec trois boutons. Vous cliquez, c'est terminé. "
   "Aucun compte à ouvrir, aucun rapport à écrire."),
])}
  </div>
</section>"""


CHALLENGE_ASSO = f"""<section id="challenge">
  <div class="layer">
{entete("Pourquoi elles viennent", "Les entreprises jouent<br><span class='it'>une saison.</span>",
        "Les points ne comptent qu'après votre confirmation. Une mission que vous ne "
        "confirmez pas ne rapporte rien à personne.")}

    <div class="photos3">
      {photo("refuge", "Un chien recueilli, allongé dans un box de refuge", "")}
      {photo("plantation", "Deux mains tassent la terre autour d'un jeune arbre planté", "")}
      {photo("berge-ramassage", "Trois personnes en waders remontent une berge de rivière "
             "avec des sacs de collecte", "")}
    </div>

    <div class="trois3">
      <div><h4>Les points comptent quand vous confirmez</h4>
        <p>Une mission ne rapporte rien tant que vous n'avez pas dit qu'elle avait eu lieu.
          C'est vous qui tenez le stylo.</p></div>
      <div><h4>Elles cherchent près de chez vous</h4>
        <p>Chaque entreprise voit les besoins ouverts autour de ses sites. Une association qui
          publie est une association qu'on trouve.</p></div>
      <div><h4>Vous ne leur devez rien</h4>
        <p>Pas de contrepartie, pas de logo obligatoire, pas de compte à rendre. Vous acceptez
          ou vous refusez une proposition sans avoir à vous justifier.</p></div>
    </div>
  </div>
</section>"""


ARGENT_ASSO = f"""<section id="argent" class="band-moss">
  <div class="layer">
{entete("Les dons", "L'argent arrive<br><span class='it'>directement chez vous.</span>",
        "Riseva n'encaisse rien et ne prélève rien.")}

    <div class="duo duo--texte">
      <div class="col">
        <h3>Un virement, de leur banque à la vôtre</h3>
        <p>Le donateur reçoit votre IBAN et une référence que nous générons. L'argent ne
          transite jamais par nous, il n'y a donc ni commission, ni délai de reversement, ni
          plafond. Vous recevez la totalité du don.</p>
        <p>Vous confirmez la réception dans votre espace, et c'est à ce moment que le donateur
          voit son don validé.</p>
      </div>
      <div class="col">
        <h3>Les reçus fiscaux restent les vôtres</h3>
        <p>C'est vous qui émettez le reçu, comme aujourd'hui. Riseva prépare les informations
          et vous laisse signer : la responsabilité du reçu appartient à l'association qui
          l'émet, et elle y reste.</p>
        <p><a class="tlink" href="/charte-associations.html">La charte des associations</a></p>
      </div>
    </div>

    {capture("asso-valider",
             "L'écran par lequel une association confirme ce qui a été réalisé",
             "Confirmer une mission", " shot--seule")}
  </div>
</section>"""


FAQ_ASSO = faq([
  ("C'est vraiment gratuit ?",
   "<p>Oui. Les associations ne paient rien, ni abonnement, ni commission sur les dons, ni "
   "frais de dossier. Ce sont les entreprises qui paient l'abonnement, et c'est le seul "
   "revenu de Riseva.</p>"),
  ("Combien de temps ça me prend ?",
   "<p>Cinq minutes pour publier une annonce, un clic pour confirmer après la mission. Il n'y "
   "a pas de tableau de bord à surveiller, pas de fichier à tenir, pas de rapport à produire "
   "pour l'entreprise.</p>"
   "<p>Si écrire l'annonce vous rebute, appelez-nous : nous la rédigeons avec vous au "
   "téléphone, et rien n'est publié tant qu'elle ne vous convient pas.</p>"),
  ("Est-ce que je peux refuser quelqu'un ?",
   "<p>Oui, sans avoir à vous justifier. Vous fixez le nombre de places, les dates, ce que "
   "vous acceptez et ce que vous n'acceptez pas. Une proposition peut être déclinée d'un "
   "clic.</p>"),
  ("Et si je ne réponds pas à temps ?",
   "<p>Rien de grave. Sans réponse de votre part sous quatorze jours, la mission est "
   "<b>clôturée automatiquement sans confirmation</b> : l'entreprise marque ses points, mais "
   "le résultat reste écrit comme estimé partout où il apparaît. Ce n'est pas une faute, ça "
   "n'entraîne aucune suspension, et vous pouvez répondre plus tard.</p>"),
  ("Et si personne ne vient ?",
   "<p>Ça peut arriver, surtout la première saison : Riseva démarre et les entreprises "
   "abonnées ne couvrent pas encore tout le territoire. Vous ne perdez rien, votre annonce "
   "reste publiée, et nous vous disons franchement combien d'entreprises sont présentes "
   "autour de vous avant que vous vous inscriviez.</p>"),
  ("Qui peut s'inscrire ?",
   "<p>Toute association déclarée, avec un numéro RNA et des statuts à jour. Nous vérifions "
   "l'enregistrement administratif avant de publier votre page, et nous vous disons ce qui "
   "manque le cas échéant.</p>"
   "<p>Pour les dons ouvrant droit à un reçu fiscal, c'est vous qui appréciez votre "
   "éligibilité au titre de l'article 200 ou 238 bis du CGI, comme aujourd'hui. "
   "<a href='/charte-associations.html'>La charte</a> détaille ce point.</p>"),
  ("Qu'est-ce que vous faites de nos données ?",
   "<p>Votre page publique contient ce que vous y mettez, rien d'autre. Nous ne revendons "
   "aucune donnée, nous n'envoyons pas les coordonnées de vos bénévoles aux entreprises, et "
   "vous pouvez fermer votre compte quand vous voulez. "
   "<a href='/confidentialite.html'>Le détail est ici</a>.</p>"),
])


CONTACT_ASSO = f"""<section id="commencer">
  <div class="layer">
{entete("Nous écrire", "Quatre mots,<br><span class='it'>et on vous rappelle.</span>",
        "Pas de dossier à monter, pas de pièce à joindre. Une personne de l'équipe vous "
        "rappelle sous deux jours ouvrés, et écrit votre première annonce avec vous si vous "
        "le souhaitez.")}
    <form id="formAsso" class="join-grid" novalidate>
      <div class="rv">
        <div class="j-step mono">Trois lignes suffisent</div>
        <p class="j-sentence">Nous sommes <span class="blank"><label class="sr-only" for="fa-asso">Nom de l'association</label><input id="fa-asso" class="bk" type="text" name="asso" data-key="asso" data-label="le nom de votre association" placeholder="votre association" spellcheck="false" required><span class="ghost" aria-hidden="true"></span></span>, à <span class="blank"><label class="sr-only" for="fa-ville">Ville</label><input id="fa-ville" class="bk" type="text" name="ville" data-key="ville" data-label="votre ville" placeholder="votre ville" required><span class="ghost" aria-hidden="true"></span></span>. Ce qui nous manque le plus en ce moment, c'est <span class="blank"><label class="sr-only" for="fa-mot">Ce qui vous manque</label><input id="fa-mot" class="bk" type="text" name="mot" data-key="mot" data-label="ce qui vous manque" placeholder="des bras un samedi matin" required><span class="ghost" aria-hidden="true"></span></span>. Écrivez-nous à <span class="blank"><label class="sr-only" for="fa-mail">Adresse e-mail</label><input id="fa-mail" class="bk" type="email" name="mail" data-key="mail" data-label="votre adresse e-mail" placeholder="nom@association.fr" spellcheck="false" required><span class="ghost" aria-hidden="true"></span></span>.</p>
        <p class="j-hint" id="jHint">Pas de dossier à monter, pas de pièce à joindre. On vous rappelle et on part de là.</p>
        <div class="j-cta">
          <button type="submit" class="btn btn-lg"><span class="dot"></span>Envoyer</button>
          <span class="mono">contact@riseva.fr, une personne, pas un robot</span>
        </div>
        <p class="j-msg" id="jMsg" role="status" aria-live="polite"></p>
      </div>

      <div class="rv d2">
        <div class="bulletin" id="bulletin" aria-hidden="true">
          <div class="bl-body">
            <div class="bl-top">
              <span class="mono">Prise de contact</span>
              <span class="bl-ref mono" id="blRef">RSV-AS-....</span>
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
            <div class="bl-stamp mono">Gratuit, sans engagement</div>
          </div>
        </div>
      </div>
    </form>
  </div>
</section>"""


BANDEAU_ASSO = """<section id="rejoindre" class="bandeau">
  <div class="layer">
    <div class="bandeau-in">
      <div>
        <h2>Cinq minutes pour vous inscrire.</h2>
        <p>Vous nous dites ce que fait votre association et ce dont elle a besoin. Nous
          vérifions votre enregistrement, nous ouvrons votre page, et vous publiez votre
          première annonce. Il n'y a rien à installer et rien à payer.</p>
      </div>
      <div class="bandeau-cta">
        <a class="btn btn-lg" href="#commencer"><span class="dot"></span>Inscrire mon association</a>
        <span class="mono">Une personne de l'équipe vous rappelle sous deux jours ouvrés.</span>
      </div>
    </div>
  </div>
</section>"""


CORPS_ASSO = "\n\n".join([
    HERO_ASSO,        # 1. ce que vous obtenez, et ce que ça coûte
    COMMENT_ASSO,     # 2. trois gestes
    CHALLENGE_ASSO,   # 3. pourquoi les entreprises viennent
    ARGENT_ASSO,      # 4. les dons arrivent directement
    FAQ_ASSO,         # 5. les six questions qui reviennent
    CONTACT_ASSO,     # 6. quatre mots a remplir, et un bulletin qui se coche
    BANDEAU_ASSO,
])


def main():
    a = page(fichier="index.html", canonique="/",
             titre="Riseva, la plateforme RSE qui commence par les associations",
             description="Des associations vérifiées publient des besoins concrets près de vos "
                         "sites, vos équipes y répondent autour d'un même objectif, et la gestion "
                         "RSE suit : indicateurs sociaux, registre de sécurité multi-sites, accès "
                         "CSE, rapports trimestriels et annuel envoyés tout seuls.",
             corps=CORPS_ENT, nav_html=NAV_ENT, pied_html=PIED_ENT,
             classe_corps="vd", rubans=False)
    b = page(fichier="associations.html", canonique="/associations.html",
             titre="Riseva, pour les associations",
             description="Publiez un besoin concret, des salariés d'entreprises abonnées peuvent "
                         "y répondre. Gratuit, sans intégration technique, sans exclusivité et "
                         "sans commission sur vos dons.",
             corps=CORPS_ASSO, nav_html=NAV_ASSO, pied_html=PIED_ASSO,
             classe_corps="va", rubans=False)
    for f in (a, b):
        print("écrit", f, f"{(PUBLIC / f).stat().st_size // 1024} Ko")


if __name__ == "__main__":
    main()
