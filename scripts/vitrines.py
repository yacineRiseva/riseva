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
, trois formats, dont le don par carte encaissé par HelloAsso pour l'association : Riseva n'encaisse jamais ;
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
        # `sur_devis` suit le palier plutot que d'etre reecrit ici : la grille et
        # la note en dessous doivent dire la meme chose, et la source est data.js.
        reste = bloc[m.end():]
        suivant = reste.find('{ id:"')
        apres = reste[:suivant if suivant != -1 else 200]
        paliers.append({"id": m.group(1), "max": m.group(2).strip(), "prix": int(m.group(3)),
                        "sites": int(m.group(4)), "label": m.group(5),
                        "sur_devis": "sur_devis:true" in apres.replace(" ", "")})
    un = lambda cle: re.search(cle + r":\s*([\d.]+)", bloc).group(1)
    return {
        "paliers": paliers,
        "site_sup": int(un("site_supplementaire")),
        "fondateur_taux": float(un("taux")),
        "fondateur_places": int(un("places")),
        "acompte_taux": float(un("acompte_taux")),
        # Le plancher d'acompte manquait a la vitrine : sur le premier palier
        # remise, 40 % font 838 € et le devis en demande 900. Un prospect qui
        # compare les deux voit une note plus salee que la vitrine.
        "acompte_minimum": int(un("acompte_minimum")),
        "remise_comptant": float(un("remise_comptant")),
        "affiches": int(un("envois_affiches_par_saison")),
        "inclus": re.findall(r'"([^"]+)"', bloc[bloc.index("inclus: ["):bloc.index("exclus: [")]),
        "exclus": re.findall(r'"([^"]+)"', bloc[bloc.index("exclus: ["):]),
    }

TARIFS = lire_tarifs()

# Meme regle que pour les tarifs : « huit rubriques, vingt-sept valeurs, dix
# taux » est une promesse verifiable, donc elle se compte dans le catalogue au
# lieu de se recopier a la main. Le jour ou un indicateur est ajoute, la vitrine
# le dit sans que personne y pense.
def lire_catalogue():
    src = (PUBLIC / "app" / "data.js").read_text(encoding="utf-8")
    bloc = src[src.index("export const INDICATEURS = {"):
               src.index("export const INDICATEURS_LIMITES")]
    saisis = bloc[bloc.index("saisis: ["):bloc.index("calcules: [")]
    calcules = bloc[bloc.index("calcules: ["):]
    return {
        "rubriques": len(set(re.findall(r'rubrique:"(\w+)"', bloc))),
        "saisis": len(re.findall(r'\{ cle:"', saisis)),
        "calcules": len(re.findall(r'\{ cle:"', calcules)),
    }

CATALOGUE = lire_catalogue()
EUR = lambda n: f"{n:,}".replace(",", "&nbsp;") + "&nbsp;€"

# Un chiffre isole au milieu d'une phrase se lit comme une donnee ; ecrit en
# lettres, il se lit comme une phrase. Les montants restent en chiffres.
EN_LETTRES = {1: "un", 2: "deux", 3: "trois", 4: "quatre", 5: "cinq", 6: "six",
              7: "sept", 8: "huit", 9: "neuf", 10: "dix", 11: "onze", 12: "douze"}


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
        "Les questions qui décident d'une signature, et nos réponses. Si la vôtre manque, écrivez-la-nous à contact@riseva.fr : elle finira ici.")}
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
#     commercial. Un dirigeant se demande d'abord qui va
#     gérer ça chez lui, ensuite si ses équipes suivront, ensuite s'il y a des
#     associations autour de son usine, ensuite ce qu'il y gagne, et le prix
#     traverse tout : il est donc donné dès le premier écran.
#
#  3. Le contenu est visible par défaut. Aucune classe `rv` sur cette page :
#     une animation peut accompagner l'apparition d'un contenu, jamais la
#     conditionner. Soixante-douze éléments qui attendent un défilement, c'est
#     soixante-douze occasions de ne rien afficher du tout.
# ═══════════════════════════════════════════════════════════════════════════

# La barre du haut nomme les trois parties, et rien d'autre. Sept entrees
# disaient sept choses de meme rang ; personne ne pouvait deviner, en les lisant,
# que « Le deroule », « Cote salaries » et « Les affiches » racontaient une seule
# et meme chose.
NAV_ENT = nav(
    [("outil-rse", "L'outil RSE"), ("challenge", "Le challenge"),
     ("associations", "Les associations"), ("prix", "Le prix"), ("faq", "Questions")],
    "Ouvrir la démonstration", "/app/?demo=1", "Démonstration libre, sans rendez-vous")

PIED_ENT = pied(
    "Riseva met des entreprises françaises au service des associations qui protègent "
    "le vivant, partout en France. Une saison, un barème public, un rapport qui tient debout.",
    [("La saison", [("#plateforme", "Ce que ça répond"), ("#outil-rse", "L'outil RSE"),
                    ("#pilotage", "La preuve, écran par écran"),
                    ("#challenge", "Le challenge"), ("#equipes", "Côté salariés"),
                    ("#affiches", "Les affiches"),
                    ("#associations", "Côté associations"),
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
    # Une legende vide laissait quand meme un <figcaption> dans la page : une
    # bande claire de vingt pixels sous l'image, qu'on prenait pour un defaut de
    # cadrage de la capture. Pas de legende, pas de bloc.
    bas = f'\n        <figcaption class="mono">{legende}</figcaption>' if legende else ""
    return f"""<figure class="shot{classe}">
        <img src="/captures/{nom}.jpg" alt="{alt}" {charge} decoding="async"
             width="{w}" height="{h}">{bas}
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
    # Une relecture a demande une mention sous CHAQUE illustration. Elle a
    # raison sur le principe et tort sur le remede : une decision anterieure les
    # avait retirees parce que « illustration generee » repete sept fois
    # transforme la page en avertissement continu, et le lecteur finit par lire
    # la mention au lieu de regarder l'image. La regle est donc tenue autrement,
    # la ou le risque est reel : sous l'affiche, qui porte un nom d'entreprise et
    # des nombres, et sous l'image du premier ecran de la vitrine associations,
    # qui est legendee. Partout ailleurs, aucune image ne pretend etre la trace
    # d'un resultat et aucune ne nomme personne : c'est ce qui est verifie.
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


def chiffres_hero():
    """Quatre chiffres, dans le premier ecran, et pas un de plus.

    La regle qui les gouverne : Riseva n'a AUCUN client et AUCUNE mission
    realisee. Aucun de ces chiffres ne peut donc etre un resultat. Ce sont soit
    des faits exterieurs, dates et sources, soit des proprietes verifiables du
    produit — ce que contient le catalogue, ce que coute une saison, ce que dure
    l'engagement. Un chiffre gonfle sur cette page se paierait au premier
    rendez-vous, quand l'acheteur demandera lequel de ses concurrents l'a
    obtenu."""
    return f"""
    <ul class="chiffres chiffres--hero rv">
      <li><b>60&nbsp;%</b><span>de réduction d'impôt sur vos dons, jusqu'à deux millions
        d'euros.<br><span class="mono">Article 238 bis du CGI</span></span></li>
      <li><b>{CATALOGUE['rubriques']}&nbsp;rubriques</b><span>{CATALOGUE['saisis']} valeurs,
        {CATALOGUE['calcules']} taux, chacun avec sa formule.<br><span class="mono">Catalogue de
        la plateforme</span></span></li>
      <li><b>1&nbsp;lien</b><span>à diffuser. Chaque salarié ouvre son compte
        lui-même.<br><span class="mono">Déploiement</span></span></li>
      <li><b>{EUR(TARIFS['paliers'][0]['prix']).replace('&nbsp;€', '')} à
        {EUR(TARIFS['paliers'][-2]['prix'])}</b><span>HT la saison, selon l'effectif. Rien
        par salarié.<br><span class="mono">Grille publique, plus bas</span></span></li>
    </ul>"""


def chapitre(numero, titre, phrase, ancre):
    """Un intertitre de premier niveau, qui ouvre une partie de la page.

    Ce qu'il repare. La page comptait onze sections, chacune repondant a une
    objection d'acheteur. C'est le bon ordre pour convaincre quelqu'un qui a
    deja une question en tete ; pour tous les autres, le produit arrivait en
    morceaux. Le challenge etait raconte dans quatre sections separees par
    trois autres, l'outil RSE dans trois, et personne ne savait, arrive au bas
    de la page, combien de choses il venait de lire.

    Il y en a trois : le challenge, l'outil, les associations. Chaque partie est
    annoncee par son numero et sa phrase, et tout ce qui la compose vient
    ensuite, sans rien d'autre au milieu."""
    return f"""<section class="chap" id="{ancre}">
  <div class="layer">
    <div class="chap-in rv">
      <p class="chap-n mono">Partie {numero} sur 3</p>
      <h2 class="chap-t">{titre}</h2>
      <p class="chap-p">{phrase}</p>
    </div>
  </div>
</section>"""


def questions(items):
    """Les trois questions auxquelles un dirigeant n'avait pas la reponse.

    Ce que ce bloc remplace, et pourquoi. La section presentait le produit en
    quatre cartes numerotees — agir, collecter, piloter, rapporter. C'etait
    exact, ordonne, et ca se lisait comme un sommaire de logiciel : quatre mots
    a l'infinitif que n'importe quel outil de gestion pourrait afficher, et
    devant lesquels un dirigeant ne se reconnait pas.

    On n'ouvre pas un logiciel RSE par curiosite. On l'ouvre
    parce qu'on vient de lui poser une question a laquelle il n'a pas su
    repondre, et il y en a exactement trois : combien de mes sites ont repondu,
    d'ou sort ce chiffre, et qu'est-ce que mes equipes ont fait cette annee. La
    section pose les trois, dit qui les pose, et montre ou est la reponse.

    La forme suit : pas des cartes cote a cote, mais trois lignes empilees, la
    question en gros a gauche et la reponse a droite. Ca se lit comme un
    document, pas comme une grille de fonctionnalites — et c'est exactement ce
    qu'on veut faire croire, parce que c'est vrai."""
    out = ""
    for n, item in enumerate(items):
        question, qui, reponse, ecran = item[:4]
        # Une illustration, sur la troisieme seulement. La relecture croisee a
        # dit la meme chose que l'oeil : les deux premieres questions vendent
        # l'outil, la troisieme vend le challenge, et le challenge est ce qui
        # differencie Riseva de n'importe quel logiciel de reporting. Il ne
        # pouvait pas rester le paragraphe le plus bas de la section, sans une
        # image, alors que c'est lui qu'on retient.
        image = item[4] if len(item) > 4 else ""
        d = f" d{n}" if n else ""
        out += f"""
        <li class="qst{' qst--img' if image else ''} rv{d}">
          <div class="qst-q">
            <p class="qst-t">{question}</p>
            <p class="qst-w mono">{qui}</p>
            {image}
          </div>
          <div class="qst-r">
            <p>{reponse}</p>
            <p class="qst-e mono">{ecran}</p>
          </div>
        </li>"""
    return f'    <ol class="questions">{out}\n    </ol>'


def flux(etapes_flux):
    """La chaine, d'un bout a l'autre, sur une ligne.

    Quatre briques cote a cote disent ce que le produit contient ; elles ne
    disent pas qu'elles s'enchainent. Cette ligne-la le dit, et c'est elle qui
    repond a la question que pose vraiment un responsable RSE : combien de fois
    vais-je devoir m'en occuper ? Une seule, au debut."""
    cases = "".join(
        f'<li class="flux-c rv d{min(n, 5)}"><b class="mono">{q}</b><span>{t}</span></li>'
        for n, (q, t) in enumerate(etapes_flux))
    return f'    <ol class="flux">{cases}</ol>'


# Le premier ecran. Il a ete refait trois fois, et voici ce que chaque passe a
# corrige. Passe 1 : un titre sur deux lignes, deux paragraphes et une fiche de
# tarif — on arrivait au bas de l'ecran sans avoir vu ni le produit ni un
# chiffre. Passe 2 : une capture du bandeau de resultats, qui prouvait le
# vivant mais laissait croire que Riseva n'etait qu'un compteur d'arbres.
#
# Passe 3, celle-ci : le plan large du tableau de bord. On voit la navigation,
# donc on voit qu'il y a une application ; on lit « Groupe », « Vue
# consolidee », « Sites et quotas », donc on comprend que ca tient plusieurs
# etablissements ; et le bandeau vert du milieu montre quand meme les arbres et
# les animaux. Le texte, lui, dit les trois choses dans l'ordre ou un acheteur
# les demande : c'est une plateforme RSE, elle tient vos sites, et elle embarque
# vos equipes.
#
# Un mot est interdit ici, et il faut savoir pourquoi : « complete ». Une
# plateforme RSE annoncee complete promet le bilan carbone, l'index egalite et
# la conformite CSRD — trois choses que Riseva ne fait pas et, pour deux
# d'entre elles, n'a pas le droit de faire. On ecrit ce qu'elle fait.
# Le premier ecran, refait apres le retour du client. Ce qu'il a dit, et il a
# raison : « la personne qui va ouvrir ca n'a pas forcement le temps de tout
# lire, il faut vendre le produit le plus rapidement possible avec une lecture
# en diagonale ». L'ancien premier ecran demandait quatre blocs avant le premier
# fait : une accroche, trois puces, une fiche de sept lignes, quatre piliers,
# quatre chiffres avec leurs sources, et une grande capture. Six masses de texte
# gris avant de comprendre ce que le produit EST.
#
# Il en reste trois : ce que c'est, ce que ca coute, et a quoi ca ressemble. Le
# reste de la page le developpe pour celui qui ralentit.
HERO_ENT = f"""<header class="hero hero--doc" id="hero">
  <div class="layer">
    <p class="eyebrow mono">Plateforme RSE multi-sites, et un an de terrain avec vos équipes</p>
    <h1 class="h1 h1--doc h1--court">Tous vos sites<br>dans un seul rapport.<br>
      <span class="it">Et vos équipes sur le terrain.</span></h1>

    <div class="doc-tete doc-tete--apercu">
    <div class="doc-intro">
      <p class="doc-accroche">Chaque site saisit ses chiffres, la plateforme relance,
        consolide et sort le rapport. Et pendant douze mois, vos équipes vont chez des
        <b>associations vérifiées</b> près de chez elles : refuges, plantations,
        distributions de repas.</p>
      <div class="hero-cta">
        <a class="btn btn-lg" href="#prix"><span class="dot"></span>Calculer mon tarif</a>
        <a class="tlink" href="/app/?demo=1">Explorer la plateforme</a>
      </div>
      <p class="doc-prix">De <b>{EUR(TARIFS['paliers'][0]['prix'])}</b> à
        <b>{EUR(TARIFS['paliers'][-2]['prix'])} HT</b> l'an selon l'effectif, au-delà sur devis
        à partir de {EUR(TARIFS['paliers'][-1]['prix'])}. Challenge et outil RSE dans le même
        abonnement, <b>sans module en supplément</b>.</p>
      <p class="doc-micro mono">-10&nbsp;% pour les 20 premières entreprises.
        <a class="tlink" href="/reglement.html">Le règlement de la saison</a>,
        <a class="tlink" href="/cgv.html">les conditions de vente</a> et
        <a class="tlink" href="/engagements.html">les engagements</a> sont lisibles avant de
        signer.</p>
    </div>

    <figure class="apercu">
      {capture("apercu-tableau",
               "Le tableau de bord d'une entreprise dans Riseva : la navigation du groupe et "
               "de la saison à gauche, les salariés mobilisés, les missions validées, les "
               "heures et les associations soutenues, puis le bandeau des résultats : arbres "
               "plantés, animaux pris en charge, kits distribués", "", " shot--apercu",
               eager=True)}
      <figcaption>Le tableau de bord, tel qu'il s'ouvre. Chiffres d'un jeu de
        démonstration.</figcaption>
    </figure>
    </div>

    {piliers([
      ("Le terrain", "Des associations<br><span class='it'>près de chaque site.</span>",
       "Refuges animaliers, plantations, berges de rivière, à moins de trente kilomètres.",
       "associations"),
      ("Le collectif", "Un challenge d'un an<br><span class='it'>qui fédère les équipes.</span>",
       "Un classement entre entreprises comparables, sans nommer la moitié basse.",
       "challenge"),
      ("L'outil RSE", "Huit rubriques,<br><span class='it'>vingt-sept valeurs.</span>",
       "Dix taux calculés, chacun avec sa formule à côté du chiffre.", "outil-rse"),
      ("La preuve", "Chaque chiffre<br><span class='it'>garde sa source.</span>",
       "Sa date, la personne qui l'a saisie, celle qui l'a approuvée, ses pièces.",
       "pilotage"),
    ])}

    {chiffres_hero()}

    <p class="s-note s-note--loi rv">Depuis le <b>21 août 2026</b>, toute nouvelle
      consultation engagée sous le code de la commande publique doit retenir au moins un
      critère prenant en compte les caractéristiques environnementales de l'offre, sous
      réserve des exclusions prévues par le code.
      <span class="mono">Loi Climat et résilience, art. 35 ; code de la commande publique,
      art. L. 2152-7 ; décret n° 2022-767 du 2 mai 2022</span></p>
  </div>
</header>"""


# ── le challenge ────────────────────────────────────────────────────────────
# Refait apres le retour du client. Ce qu'il y avait avant : deux sections
# blanches a la suite, « une saison, quatre rendez-vous » et « ce que vos
# salaries voient », soit deux titres, deux questions frequentes, quatre
# paragraphes d'etapes et trois petits textes de bas de page. En lecture
# diagonale, cela faisait deux ecrans de gris.
#
# Ce qu'il y a maintenant : une photographie pleine largeur, un panneau de verre
# pose dessus avec la promesse et trois nombres, et les quatre temps de la
# saison en une ligne chacun. On comprend en deux secondes ce que le challenge
# est. Le detail est reste, il a juste cesse d'etre la premiere chose qu'on
# rencontre.
CHALLENGE_ENT = f"""<section id="challenge" class="chal verre-sect">
  <div class="chal-fond" aria-hidden="true">
    <img src="/photos/berge-ramassage.jpg" alt="" loading="lazy" decoding="async"
         width="1358" height="772">
  </div>
  <div class="layer">
    <div class="verre chal-verre verre-anim">
      <i class="verre-lumiere" aria-hidden="true"></i>
      <i class="verre-eclat" aria-hidden="true"></i>
      <div class="chal-tete">
        <p class="eyebrow mono">Le challenge</p>
        <h2>Douze mois,<br><span class="it">et vos équipes y sont allées.</span></h2>
        <p class="chal-p">Des associations vérifiées publient ce dont elles ont besoin près de
          chacun de vos sites. Vos équipes s'y rendent ensemble.</p>
      </div>
      <div class="verre-chiffres chal-chiffres">
        <span class="verre-chiffre"><b>12</b><span>mois, sans reconduction tacite</span></span>
        <span class="verre-chiffre"><b>4</b><span>rapports, un par trimestre</span></span>
        <span class="verre-chiffre"><b>30&nbsp;km</b><span>autour de chaque site</span></span>
      </div>
      <ol class="chal-temps">
        <li><b class="mono">Janvier</b><span>Vous diffusez un lien. Chacun crée son compte.</span></li>
        <li><b class="mono">Février à octobre</b><span>Les missions se font, l'association confirme.</span></li>
        <li><b class="mono">Chaque trimestre</b><span>Le rapport se génère tout seul.</span></li>
        <li><b class="mono">Mi-janvier</b><span>Le bilan annuel, avec son dossier de traçabilité.</span></li>
      </ol>
    </div>
  </div>
</section>"""


EQUIPES_ENT = f"""<section id="equipes">
  <div class="layer">
{entete("Côté salariés", "Deux écrans,<br><span class='it'>et chacun se propose.</span>",
        "Un salarié qui se sent inscrit d'office ne revient pas une deuxième fois.")}

    <div class="duo duo--pile">
      {capture("salarie-saison",
               "Le tableau de bord d'un salarié : ses points, et l'objectif collectif de son site",
               "L'objectif de son site")}
      {capture("salarie-actions",
               "La liste des besoins publiés par les associations proches du site du salarié",
               "Les besoins près de chez lui")}
    </div>

    <p class="s-note s-note--grand">L'objectif de la saison se compte en <b>personnes venues</b>,
      pas en points : il ne s'atteint qu'en allant chercher quelqu'un qui n'est pas encore
      venu. <a class="tlink" href="/app/?demo=1">Explorer l'espace salarié</a></p>
  </div>
</section>"""


ASSOCIATIONS_ENT = f"""<section id="associations" class="band-moss verre-sect">
  <div class="layer">
    {photo("riviere-aube",
           "Une rivière au petit matin, ses berges plantées, avant l'arrivée d'un chantier "
           "de ramassage", "", " photo--couverture")}
{entete("L'annuaire", "L'association publie,<br><span class='it'>puis elle confirme.</span>",
        "Le chiffre final de votre rapport vient de la structure qui était sur place : une "
        "déclaration datée, tracée et attribuée. Ce n'est pas une attestation et cela ne vaut "
        "ni contrôle ni certification, mais c'est déjà tout autre chose qu'un chiffre que vous "
        "auriez écrit vous-même.")}

    <div class="photos3">
      {photo("refuge", "Un chien de refuge trotte en laisse au soleil, à côté de la personne "
             "qui le sort", "")}
      {photo("plantation", "Deux paires de mains tassent la terre autour d'un jeune arbre "
             "qui vient d'être planté", "")}
      {photo("maraude", "Un bol chaud passe de main en main au-dessus d'une table de "
             "distribution, devant une camionnette", "")}
    </div>

    <div class="verre asso-verre verre-anim">
      <i class="verre-lumiere" aria-hidden="true"></i>
      <i class="verre-eclat" aria-hidden="true"></i>
      {capture("asso-valider",
               "L'écran par lequel une association confirme ce qui a été réalisé",
               "La confirmation, en un clic")}
    </div>

    <ul class="trois">
      <li><b>Aucun abonnement, aucune commission.</b> Une association ne paie jamais rien, et
        Riseva ne prélève rien sur ses dons.</li>
      <li><b>Une confirmation courte, sans se connecter.</b> Un lien dans un message après
        la date prévue, trois réponses sur la page qu'il ouvre, et c'est terminé.</li>
      <li><b>Rien à produire pour vous.</b> Passé quatorze jours sans réponse, la mission est
        clôturée et son résultat reste marqué <b>estimé</b> partout où il apparaît, vos
        rapports compris.</li>
    </ul>

    <div class="fmt-bloc fmt-bloc--incruste">
      <h3 class="fmt-titre">Ce qu'une association peut proposer</h3>
      <ul class="fmt-lignes">
        <li><div><b>Une demi-journée de bénévolat</b> : chantier, collecte,
          entretien.</div><span>150 pts</span></li>
        <li><div><b>Une mission de compétence</b> sur le temps de
          travail.</div><span>200 pts</span></li>
        <li><div><b>Le parrainage d'un animal</b> dans un refuge, pour une
          année.</div><span>250 pts</span></li>
        <li><div><b>L'adoption d'un animal</b>, confirmée par le
          refuge.</div><span>400 pts</span></li>
        <li><div><b>Un don de matériel</b> : c'est l'association qui déclare ce qu'elle a
          reçu.</div><span>100 pts</span></li>
        <li><div><b>Un don en argent, par carte</b>, encaissé par <b>HelloAsso</b> pour
          l'association, <b>sans transiter par Riseva</b>.</div><span>1 pt / 10 €</span></li>
      </ul>
      <p class="fmt-note"><b>Aucune commission, et Riseva n'encaisse rien.</b> Les points
        tombent <b>quand le paiement est confirmé</b>. Ils servent au classement entre vos
        sites, et à rien d'autre. Le barème complet, écrêtage compris, est
        <a class="tlink" href="/reglement.html">dans le règlement</a>.</p>
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


# ── ce que Riseva repond ────────────────────────────────────────────────────
# La section vient juste apres le premier ecran parce que c'est la question
# suivante, toujours la meme : « concretement, c'est quoi ? ». Elle y repond en
# retournant la question — voici les trois qu'on vous pose, et voici ou est la
# reponse — puis elle montre l'ecran de groupe, celui qui prouve le multi-sites
# qu'aucune phrase ne prouve.
#
# Le titre a ete arbitre. « Et vous n'aviez pas la reponse » pointait le lecteur
# du doigt : la relecture croisee l'a vu, et elle a raison, la section ne marche
# que parce qu'elle fait reconnaitre des situations, pas parce qu'elle reproche
# quelque chose. La contre-proposition, « trois questions auxquelles Riseva vous
# permet de repondre », enlevait le reproche et la tension avec. Celle qui est
# en place garde les deux : le fait est le meme, il n'est simplement plus
# personnel.
# ── les trois parties de la page ───────────────────────────────────────────
def lianes_verre():
    """Le motif de Riseva, pose derriere le verre.

    Pourquoi celui-la et pas trois taches de couleur. Un panneau translucide
    pose sur un aplat uni ne prouve rien : il n'y a rien a traverser. Ce qui
    fait le verre, c'est de voir le MEME motif net a cote du panneau et flou
    dessous. Il fallait donc un motif, et le site en a deja un : les lianes.

    Elles ne sont pas recopiees ici. On relit le fragment qui les fabrique et on
    en prend trois du milieu, celles que la page ecarte parce qu'elles sont trop
    loin des bords. Le jour ou le trace change, il change aussi ici."""
    brut = (RACINE / "scripts" / "fragments-rubans.html").read_text(encoding="utf-8")
    blocs = re.findall(r'<div class="rib".*?</div>', brut, re.S)
    milieu = [b for b in blocs
              if 20 < float(re.search(r'top:([\d.]+)%', b).group(1)) < 60]
    out = []
    for n, bloc in enumerate(milieu[:3]):
        # Les identifiants de degrade sont uniques dans un document : ceux du
        # fragment servent deja aux deux lianes de la page.
        bloc = bloc.replace('id="rg', 'id="vg').replace('url(#rg', 'url(#vg')
        # Reparties dans la section, pas a leur place dans la page.
        bloc = re.sub(r'top:[\d.]+%', f'top:{14 + n * 27}%', bloc)
        bloc = re.sub(r'height:[\d.]+%', f'height:{22 + n * 3}%', bloc)
        out.append(bloc)
    if len(out) != 3:
        raise SystemExit("lianes de la section verre : le fragment a change")
    return ('<div class="verre-lianes" aria-hidden="true">'
            + "".join(out) + '</div>')


def mini_ecran(onglet, lignes, jauge, legende):
    """Un ecran de produit, dessine avec du texte.

    Aucune capture. Une capture d'ecran de produit pese deux cents kilo-octets,
    vieillit a la premiere retouche d'interface, ne se traduit pas et ne se lit
    pas au lecteur d'ecran. Ces maquettes-la sont du HTML : elles suivent la
    feuille de style, elles restent nettes a tous les zooms, et ce qu'elles
    montrent est ecrit en toutes lettres dans leur legende.

    Ce qu'elles n'ont pas le droit de faire : passer pour la trace d'un
    resultat reel. La legende dit toujours de quel ecran il s'agit."""
    corps = ""
    for gauche, droite, etat in lignes:
        droit = (f'<span class="mini-etat mini-etat--{etat}">{droite}</span>'
                 if etat else f"<span>{droite}</span>")
        corps += f"""
            <div class="mini-ligne"><span>{gauche}</span>{droit}</div>"""
    if jauge:
        part, dit = jauge
        corps += f"""
            <div class="mini-jauge"><i style="width:{part}%"></i></div>
            <div class="mini-ligne"><span>{dit}</span><span>{part}&nbsp;%</span></div>"""
    return f"""<figure class="mini">
          <div class="mini-barre"><i></i><i></i><i></i><span class="mono">{onglet}</span></div>
          <div class="mini-corps">{corps}
          </div>
          <figcaption class="mini-note">{legende}</figcaption>
        </figure>"""


def verre_zone(n, qui, question, reponse, visuel, ecrans, large=False):
    """Une zone du panneau : qui pose la question, la question, la reponse.

    Ce ne sont pas des cartes. Elles vivent DANS le panneau de verre, separees
    par des filets d'un pixel, comme les zones d'une interface. C'est ce qui
    fait que le panneau se lit comme un ecran de produit et non comme trois
    encarts poses cote a cote."""
    if large:
        return f"""      <article class="verre-zone verre-zone--large">
        <span class="verre-num" aria-hidden="true">{n}</span>
        <div class="verre-zone-texte">
          <span class="verre-puce mono">{qui}</span>
          <h3>{question}</h3>
          <p>{reponse}</p>
          <p class="verre-ecrans mono">{ecrans}</p>
        </div>
        {visuel}
      </article>"""
    return f"""      <article class="verre-zone">
        <span class="verre-num" aria-hidden="true">{n}</span>
        <span class="verre-puce mono">{qui}</span>
        <h3>{question}</h3>
        <p>{reponse}</p>
        {visuel}
        <p class="verre-ecrans mono">{ecrans}</p>
      </article>"""


# La seule section du site traitee en verre, et c'est deliberé : celle qui
# presente la plateforme. Ce qui est en jeu ici n'est pas un effet de mode. Un
# lecteur arrive du premier ecran avec une promesse et zero idee de ce que le
# produit EST. Il faut lui montrer un ecran. Le montrer en photographie coute
# des captures qui vieillissent ; le montrer en verre, avec un nom de produit en
# haut et des maquettes de texte dedans, donne la meme impression de produit
# sans une seule image.
#
# Et il n'y a qu'UN panneau. Quatre panneaux de verre cote a cote, c'est quatre
# fois la depense de `backdrop-filter` ; et surtout, trois cartes parlent DE la
# plateforme quand un seul panneau EST la plateforme.
PLATEFORME_ENT = f"""<section id="plateforme" class="band-moss verre-sect">
  <div class="verre-champ" aria-hidden="true"><i></i><i></i><i></i></div>
{lianes_verre()}
  <div class="layer">
{entete("Ce que ça répond",
        "Trois questions,<br><span class='it'>et personne n'a la réponse.</span>",
        "Personne n'ouvre un logiciel RSE par curiosité. On l'ouvre parce qu'on "
        "vient de vous poser une de ces trois questions, et qu'il a fallu répondre "
        "« je vais voir ».")}

    <div class="verre verre-anim">
      <i class="verre-lumiere" aria-hidden="true"></i>
      <i class="verre-eclat" aria-hidden="true"></i>

      <div class="verre-tete">
        <span class="verre-produit"><span class="verre-marque" aria-hidden="true">R</span>Riseva, tableau de bord</span>
        <span class="verre-demo mono"><i aria-hidden="true"></i>Jeu de démonstration</span>
      </div>

      <div class="verre-intro">
        <p>Une saison d'un an, un écran par métier, et <b>la même donnée du site
          jusqu'au rapport</b>. Rien n'est ressaisi, et rien n'est estimé sans que
          la page le dise.</p>
        <div class="verre-chiffres">
          <span class="verre-chiffre"><b>{CATALOGUE['rubriques']}</b><span>rubriques au choix</span></span>
          <span class="verre-chiffre"><b>{CATALOGUE['saisis']}</b><span>valeurs collectées</span></span>
          <span class="verre-chiffre"><b>{CATALOGUE['calcules']}</b><span>taux calculés</span></span>
        </div>
      </div>

      <div class="verre-grille">
{verre_zone(1,
  "En réunion budget",
  "« Combien de vos sites ont répondu&nbsp;?&nbsp;»",
  f"Vous cochez les rubriques d'une période parmi {CATALOGUE['rubriques']} : effectifs, "
  "sécurité, formation, énergie, déchets, mobilité, achats. Chaque établissement voit sa "
  "part sur son écran, avec ce qu'on compte et ce qu'on ne compte pas. La plateforme "
  "relance à sa place, et <b>vous voyez qui manque, nommément</b>.",
  mini_ecran("Sites et quotas", [
      ("Rennes - Sud", "Approuvé", "ok"),
      ("Lyon - Vaise", "Approuvé", "ok"),
      ("Lille - Seclin", "En attente", "attente"),
      ("Brest - Port", "Non commencé", "muet"),
  ], (64, "Établissements ayant répondu"),
     "Maquette de l'écran « Sites et quotas », avec un jeu de démonstration."),
  "Écrans : Données sociales, Sites et quotas, Vue consolidée",
  large=True)}

{verre_zone(2,
  "Questionnaire fournisseur",
  "« D'où sort ce chiffre&nbsp;?&nbsp;»",
  f"{CATALOGUE['saisis']} valeurs collectées, {CATALOGUE['calcules']} taux calculés en "
  "rapport de sommes et jamais en moyenne de taux. Chaque saisie de site porte qui l'a "
  "remplie, qui l'a approuvée (jamais la même personne) et <b>les pièces jointes qui la "
  "justifient</b>.",
  mini_ecran("Rapport, taux de fréquence", [
      ("Formule", "AT x 1 000 000 / heures", None),
      ("Période", "2026, 4e trimestre", None),
      ("Sites derrière la somme", "22 sur 22", "ok"),
      ("Valeurs approuvées", "Par le référent", "ok"),
      ("Pièces jointes", "9 justificatifs", "muet"),
  ], None,
     "Maquette de la fiche d'un taux consolidé, avec sa formule et ses sources."),
  "Écrans : Rapports, Fiche VSME, Mécénat")}

{verre_zone(3,
  "Vos salariés, vos candidats",
  "« Qu'est-ce que vos équipes ont fait cette année&nbsp;?&nbsp;»",
  "Des associations vérifiées près de chaque site publient ce dont elles ont besoin, vos "
  "équipes s'y rendent ensemble, et <b>c'est l'association qui confirme</b>. Bénévolat, "
  "dons de matériel, mécénat de compétences et dons en argent passent par le même écran.",
  photo("refuge-sortie", "Deux bénévoles sortent quatre chiens de refuge sur un chemin de "
        "campagne, en plein soleil", "", " verre-photo"),
  "Écrans : Annonces, Nos missions, Associations")}
      </div>
    </div>

    <p class="s-note s-note--trois">Vos sites répondent, vos équipes agissent,
      <b>et vous avez les preuves</b>.</p>

  </div>
</section>"""

PILOTAGE_ENT = f"""<section id="pilotage">
  <div class="layer">
{entete("La preuve", "Chaque chiffre<br><span class='it'>garde sa source.</span>",
        "Quatre écrans de l'application, tels qu'ils s'affichent, avec un jeu de "
        "démonstration.")}

{onglets([
  ("miss", "Les missions", capture("missions",
      "La liste des missions d'une entreprise, avec leur état de confirmation",
      "Chaque mission, son association, son état")),
  ("rapp", "Les rapports", capture("rapports",
      "Le rapport trimestriel d'une entreprise dans Riseva",
      "Les rapports, en CSV et en PDF")),
  ("meca", "Le dossier de mécénat", capture("mecenat",
      "Le calcul du mécénat ligne par ligne : dons versés, mécénat de compétences au coût "
      "de revient, assiette, plafond, report",
      "Le calcul, ligne par ligne")),
  ("indi", "Les indicateurs", capture("indicateurs-formule",
      "Les taux de sécurité consolidés, chacun avec sa formule sous son libellé, et la "
      "colonne approuvé séparée de la colonne provisoire",
      "Chaque taux avec sa formule")),
])}

    {capture("groupe",
             "La vue consolidée d'un groupe : sociétés, sites et indicateurs réunis",
             "Un groupe, ses sociétés, ses établissements", " shot--seule")}

    <dl class="faits4 faits4--serre">
      <div><dt class="mono">Trois niveaux</dt><dd>le groupe, les sociétés avec leur SIREN,
        les établissements</dd></div>
      <div><dt class="mono">Cloisonné</dt><dd>payer la facture ne donne pas accès aux
        personnes d'une filiale</dd></div>
      <div><dt class="mono">Clôture automatique</dt><dd>passé quatorze jours sans réponse, la
        mission est clôturée et son résultat reste <b>estimé</b></dd></div>
      <div><dt class="mono">Rien à installer</dt><dd>un lien à diffuser, chaque salarié ouvre
        son compte lui-même</dd></div>
    </dl>
  </div>
</section>"""


OUTIL_ENT = f"""<section id="outil-rse" class="band">
  <div class="layer">
{entete("L'outil RSE", "Ce que vous ne referez plus<br><span class='it'>à la main.</span>",
        "Obtenir les chiffres de chaque site, et relancer jusqu'à ce que le dernier réponde.")}

    <ul class="benef">
      <li class="rv">
        <b>Vous demandez une fois</b>
        <span>Vous cochez les rubriques de la période. L'écran dit combien de valeurs chaque
          site devra trouver, avant que la collecte parte.</span>
      </li>
      <li class="rv d1">
        <b>Personne ne relance</b>
        <span>Le rappel part tout seul et il ne vient pas de vous. Vous voyez qui manque,
          nommément.</span>
      </li>
      <li class="rv d2">
        <b>Le rapport existe déjà</b>
        <span>Totaux, taux calculés en rapport de sommes, valeurs manquantes site par site.
          En classeur et en CSV.</span>
      </li>
    </ul>

    {capture("indicateurs",
             "L'écran de collecte des indicateurs dans Riseva : l'état de chaque site, les "
             "totaux par rubrique et les taux calculés",
             "La collecte, et le rapport qui en sort", " shot--seule")}

{flux([
  ("Jour 1", "vous cochez les rubriques et la date limite"),
  ("Jour 2", "chaque site voit sa part, sans rien installer"),
  ("J-7, J-2", "le rappel part tout seul"),
  ("Échéance", "vous voyez qui manque, nommément"),
  ("Le lendemain", "le rapport est là, daté, avec sa méthode"),
])}

    <dl class="faits4 faits4--serre">
      <div><dt class="mono">Le dictionnaire</dt><dd>ce qu'on compte et ce qu'on ne compte
        pas, daté</dd></div>
      <div><dt class="mono">Le registre de sécurité</dt><dd>événements, circonstances, plan
        d'actions</dd></div>
      <div><dt class="mono">La fiche VSME</dt><dd>les onze rubriques de la norme européenne
        volontaire</dd></div>
      <div><dt class="mono">Groupes et filiales</dt><dd>trois niveaux : groupe, sociétés,
        établissements</dd></div>
    </dl>
  </div>
</section>"""


# ── ce que ça change ────────────────────────────────────────────────────────
# Trois bénéfices, et chacun porte son chiffre. Dans la version précédente,
# celui du milieu n'en avait pas : au lieu de trois colonnes, l'œil voyait deux
# colonnes et un trou. Le rang a donc changé, et le troisième a reçu le sien.
AFFICHES_ENT = f"""<section id="affiches">
  <div class="layer">
{entete("Les affiches", "Ce qui se met<br><span class='it'>au-dessus de la machine à café.</span>",
        "Un lien envoyé une fois par courriel se perd. Une affiche reste, et elle parle aux "
        "gens qui n'ouvrent jamais leurs mails.")}

    <div class="aff-scene">
      {photo("affiche-bureau",
             "L'affiche A3 que Riseva génère, entière, posée devant un plateau de bureaux : "
             "le nom d'une entreprise de démonstration, la saison, les formats proposés, le "
             "lien d'inscription et son code QR", "", " photo--mur")}
      <p class="aff-mention mono">Affiche sortie du jeu de démonstration : le nom d'entreprise
        et les nombres du bas de page en viennent, ils ne décrivent aucune saison réalisée.</p>
      <div class="aff-encart">
        {photo("affiche-qr",
               "Le bas de l'affiche : le code QR et le lien d'inscription de l'entreprise, "
               "en toutes lettres à côté", "", " shot--affiche")}
        <p class="mono">Le code QR porte le lien de vos équipes. Il se scanne pour de bon.</p>
      </div>
      <div class="aff-texte">
        <h3>Elle porte le lien de votre entreprise</h3>
        <p>Chaque affiche est générée avec le lien d'inscription de vos équipes et le code QR
          qui va avec. Un salarié le scanne depuis la salle de pause et son compte est ouvert
          avant qu'il soit remonté à son poste.</p>
        <h3>Quatre envois compris</h3>
        <p>Elles partent imprimées, en nombre suffisant pour tous vos sites, à quatre moments
          de la saison. Un site qui ouvre en cours d'année la réimprime lui-même.</p>
        <p class="s-note"><a class="tlink" href="/app/?demo=1">Voir l'écran des supports</a></p>
      </div>
    </div>
  </div>
</section>"""


BANDEAU_ENT = """<section id="rejoindre" class="bandeau">
  <div class="layer">
    <div class="bandeau-in">
      <div>
        <h2>Vingt places au tarif fondateur.</h2>
        <p>La remise de lancement est limitée à vingt entreprises, et au 31 décembre 2026.
          Avant que le solde soit facturé, les cinq critères de démarrage écrits dans les
          engagements de service sont constatés avec vous.</p>
      </div>
      <div class="bandeau-cta">
        <a class="btn btn-lg" href="/inscription.html"><span class="dot"></span>Réserver une place</a>
        <span class="mono">Préinscription gratuite, sans carte bancaire,
          sans engagement.</span>
      </div>
    </div>
  </div>
</section>"""


FAQ_ENT = faq([
  ("Combien coûte une saison ?",
   f"<p>La grille est <a href='#prix'>affichée sur cette page</a> : de "
   # `[:-2]` coupait « € » et laissait « &nbsp » sans point-virgule : l'entite
   # restait a moitie ecrite dans la page. Et la fourchette annoncait le dernier
   # palier comme un prix ferme, alors que le heros et la note sous la grille
   # disent « a partir de ». Les trois disent maintenant la meme chose.
   f"<b>{EUR(TARIFS['paliers'][0]['prix']).replace('&nbsp;€', '')} à "
   f"{EUR(TARIFS['paliers'][-2]['prix'])} HT</b> pour douze mois, selon votre effectif, "
   f"un à {EN_LETTRES.get(TARIFS['paliers'][-2]['sites'], TARIFS['paliers'][-2]['sites'])} "
   f"sites compris selon la tranche. Au-delà de deux mille salariés, sur devis à partir de "
   f"{EUR(TARIFS['paliers'][-1]['prix'])}, "
   f"{EN_LETTRES.get(TARIFS['paliers'][-1]['sites'], TARIFS['paliers'][-1]['sites'])} "
   f"sites compris. "
   f"Les {TARIFS['fondateur_places']} premières entreprises signataires bénéficient de "
   f"{int(TARIFS['fondateur_taux'] * 100)} % de remise sur leur première saison.</p>"
   "<p>Pas de facturation par salarié, pas de module en supplément, pas de commission sur les "
   "dons. Les associations, elles, ne paient jamais rien.</p>"
   "<p>Nous ne comparons pas notre prix à celui d'un concurrent que nous ne nommerions pas : "
   "une fourchette annoncée sans source ne vous aide pas à décider. La grille complète est "
   "publique, elle est plus bas sur cette page, et le simulateur donne le montant exact pour "
   "votre effectif.</p>"),
  ("Qu'est-ce qui est compris dans l'abonnement ?",
   "<p>Une saison d'un an, avec les comptes correspondant à votre effectif, les formats du "
   "barème, l'accompagnement au lancement, les affiches et les supports, et les rapports "
   "trimestriels et annuel.</p>"
   "<p>Sur le don en argent, une précision qui compte : Riseva <b>n'encaisse rien</b>. Le "
   "donateur paie par carte sur une page <b>HelloAsso</b>, et l'argent arrive sur le compte "
   "de l'association. Nous ne sommes donc pas un établissement de paiement, il n'y a aucune "
   "commission de notre part, et rien à attendre d'un reversement de Riseva puisque l'argent "
   "ne passe pas par elle. Les délais et les frais éventuels relèvent des conditions de "
   "HelloAsso, entre l'association et lui.</p>"),
  ("Qu'est-ce que « démarrer » veut dire, précisément ?",
   "<p>Cinq critères, constatés à la date convenue : votre espace est ouvert et le lien "
   "d'inscription fonctionne depuis un de vos postes ; les comptes commandés sont "
   "disponibles ; les formats contractuels sont actifs ; l'inventaire associatif convenu "
   "est disponible ; un rapport est exportable.</p>"
   "<p>Vous avez quinze jours pour les constater. Si l'un manque et n'est pas levé sous "
   "quinze jours de plus, <b>l'acompte est remboursé intégralement</b> et aucun solde n'est "
   "dû. Le solde est facturé à l'ouverture de la saison et payable à trente jours ; si le "
   "démarrage n'est pas constaté, il n'est pas dû.</p>"),
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
  ("Le classement, il sert à quoi ?",
   "<p>À donner un rendez-vous que personne n'a besoin d'imposer. Il se joue entre "
   "entreprises, jamais entre salariés : personne n'est noté individuellement et une équipe "
   "qui passe son tour ne pénalise personne. La moitié basse n'est jamais nommée.</p>"
   "<p>Vous voyez votre score et votre rang dès trois entreprises inscrites dans votre "
   "catégorie. Le décile, lui, n'apparaît qu'à partir de <b>dix entreprises</b> dans la "
   "catégorie : un « top 10 % » sur onze entreprises désigne la première et lui prête une "
   "avance qu'elle n'a pas.</p>"),
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
   "<a href='/engagements.html'>les engagements de service</a>.</p>"
   "<p><b>Ce qui reste à votre charge</b>, et qui n'est donc pas compris dans l'abonnement :</p>"
   "<ul class='qa-l'>" + "".join(f"<li>{x}</li>" for x in TARIFS["exclus"]) + "</ul>"),
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
          <td class="tar-prix">{"<span class='tar-apd'>à partir de</span> " if p.get('sur_devis') else ""}<b>{EUR(p['prix'])}</b> <span class="tar-ht">HT / saison</span></td>
          <td class="tar-sites">{p['sites']} site{'s' if p['sites'] > 1 else ''} inclus</td>
        </tr>"""
    inclus = "".join(f"<li>{x}</li>" for x in TARIFS["inclus"])
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
      <p class="tar-n">Site supplémentaire <b>au-delà du nombre inclus dans votre tranche</b> :
        {EUR(TARIFS['site_sup'])} HT. Chaque ligne ci-dessus dit combien de sites sa tranche
        comprend. Au-delà de deux mille salariés, le tarif est établi sur devis, à partir de
        {EUR(TARIFS['paliers'][-1]['prix'])} HT et {TARIFS['paliers'][-1]['sites']} sites
        inclus.</p>
    </div>

    <div class="tar-inclus">
      <h3>Ce qui est compris</h3>
      <ul class="tar-l">{inclus}</ul>
      <p class="tar-n">Ce que Riseva ne fait pas est écrit noir sur blanc, un peu plus bas :
        <a class="tlink" href="#faq">le périmètre exact de la plateforme</a>.</p>
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
      <p class="tar-sim-cta"><a class="btn" href="/inscription.html">Réserver une place</a>
        <span class="mono">Le bon de commande reprend cette grille telle quelle.</span></p>
      <div class="tar-sim-notes">
        <p class="tar-n"><b>Tarif fondateur : -{int(TARIFS['fondateur_taux'] * 100)} %</b>
          pour les {TARIFS['fondateur_places']} premières entreprises qui signent, jusqu'au
          31 décembre 2026. Il porte sur votre <b>première saison, et sur elle seule</b> :
          nous ne garantissons le prix d'aucune saison que nous n'avons pas encore vécue.
          Passé ces places, la grille s'applique telle quelle.</p>
        <p class="tar-n"><b>Règlement :</b> {int(TARIFS['acompte_taux'] * 100)} % à la commande,
          avec un minimum de {EUR(TARIFS['acompte_minimum'])} HT,
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
    HERO_ENT,           # ce que c'est, ce que ca coute, a quoi ca ressemble
    PLATEFORME_ENT,     # la console de verre : les trois questions, et leurs ecrans
    OUTIL_ENT,          # trois benefices, une capture, cinq dates
    PILOTAGE_ENT,       # la demonstration, quatre onglets
    CHALLENGE_ENT,      # la photographie pleine largeur, et le panneau de verre
    EQUIPES_ENT,        # les deux ecrans du salarie, alignes
    AFFICHES_ENT,       # ce qui arrive par la poste
    ASSOCIATIONS_ENT,   # l'annuaire verifie, et la confirmation
    PRIX_ENT,           # la grille, et le devis a cote
    FAQ_ENT,            # les questions qui decident vraiment
    BANDEAU_ENT,
])


# ═══════════════════════════════════════════════════════════════════════════
#  VITRINE ASSOCIATIONS
#  Autre public, autre peur, autre parcours. Une présidente ne cherche pas un
#  outil : elle se demande si ça va lui coûter du temps, si on va s'approprier
#  son travail, et si quelqu'un viendra vraiment.
# ═══════════════════════════════════════════════════════════════════════════

NAV_ASSO = nav(
    [("comment", "Comment ça marche"), ("challenge", "Pourquoi les entreprises viennent"),
     ("argent", "Les dons"), ("faq", "Vos questions")],
    "Ouvrir mon espace", "#commencer", "Gratuit, et sans exclusivité")

PIED_ASSO = pied(
    "Riseva met des entreprises françaises au service des associations qui protègent le "
    "vivant. Gratuit pour vous, sans exclusivité, et sans commission sur vos dons.",
    [("Comprendre", [("#comment", "Comment ça marche"),
                     ("#challenge", "Pourquoi les entreprises viennent"),
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


def chiffres_asso():
    """Les quatre chiffres du premier ecran de la vitrine associations.

    Meme discipline que du cote entreprise : aucun n'est un resultat obtenu, ce
    sont des proprietes du produit, verifiables en cinq minutes par qui ouvre un
    espace. Une association n'a pas de budget a engager : ce qu'elle regarde en
    premier, c'est ce que ca coute et ce que ca lui demande de temps."""
    return """
    <ul class="chiffres chiffres--hero rv">
      <li><b>0&nbsp;€</b><span>à payer, aujourd'hui et après, et aucune commission sur vos
        dons.<br><span class="mono">Ce sont les entreprises qui paient</span></span></li>
      <li><b>5&nbsp;minutes</b><span>pour écrire une première annonce. Six modèles sont déjà
        écrits : vous changez la date. Elle paraît une fois votre enregistrement
        vérifié.<br><span class="mono">Des bras, du matériel, de
        l'argent</span></span></li>
      <li><b>1&nbsp;courriel</b><span>pour confirmer une mission : le lien ouvre la page de
        décision, vous répondez, c'est fini. Rien à installer, aucun logiciel à
        apprendre.<br><span class="mono">La confirmation</span></span></li>
      <li><b>30&nbsp;km</b><span>le rayon dans lequel les salariés des entreprises abonnées voient
        vos besoins autour de leur site.<br><span class="mono">Annuaire et
        annonces</span></span></li>
    </ul>"""


HERO_ASSO = f"""<header class="hero hero--doc" id="hero">
  <div class="layer">
    <p class="eyebrow mono">Gratuit pour les associations, sans exclusivité</p>
    <h1 class="h1 h1--doc h1--court">Il vous manque des bras un samedi.<br>
      <span class="it">Des salariés d'à côté viennent les donner.</span></h1>

    <div class="doc-tete doc-tete--apercu">
      <div class="doc-intro">
        <p class="doc-accroche">Sortir les chiens, tenir une distribution, planter une
          parcelle, porter des cartons : vous écrivez ce dont vous avez besoin, des salariés
          d'entreprises abonnées se proposent, et <b>c'est vous qui confirmez</b> ce qui a eu
          lieu.</p>
        <div class="hero-cta">
          <a class="btn btn-lg" href="#commencer"><span class="dot"></span>Ouvrir mon espace</a>
          <a class="tlink" href="#comment">Voir comment ça marche</a>
        </div>
        <p class="doc-garanties">Gratuit. Sans exclusivité. Sans commission sur vos dons.
          Rien à installer.</p>
        <p class="doc-micro">Quatre lignes pour ouvrir votre espace, cinq minutes pour votre
          première annonce.</p>
      </div>

      <figure class="apercu">
        {photo("refuge-sortie", "Deux personnes promènent cinq chiens en laisse sur un chemin de "
               "campagne bordé d'arbres, un matin d'été", "", " photo--apercu", eager=True)}
        <figcaption>Une demi-journée de sortie de chiens, telle qu'une association peut la
          demander sur Riseva. Illustration générée, aucune mission réelle.</figcaption>
      </figure>
    </div>

    {chiffres_asso()}

    <div class="doc-tete doc-tete--fiche">
      <div class="doc-intro">
        <p>Vous ne changez rien à ce que vous faites déjà. Riseva ne vous demande ni
          exclusivité, ni contrepartie, ni logo : elle vous rend visible auprès des entreprises
          abonnées autour de vous, et elle s'efface une fois que le contact est pris.</p>
      </div>

      <dl class="fiche">
        <div><dt class="mono">Prix</dt><dd>gratuit, aujourd'hui et après. Ce sont les
          entreprises abonnées qui paient</dd></div>
        <div><dt class="mono">Engagement</dt><dd>aucune exclusivité, vous continuez tout ce que
          vous faites ailleurs</dd></div>
        <div><dt class="mono">Sur vos dons</dt><dd>aucune commission. L'argent va du donateur à
          votre compte, sans passer par nous</dd></div>
        <div><dt class="mono">Technique</dt><dd>rien à installer. Vous ouvrez votre espace
          vous-même, et vous confirmez vos missions depuis un courriel</dd></div>
      </dl>
    </div>

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
   "Ce dont vous avez besoin, pour quelle date, combien de personnes. Cinq minutes, et le "
   "formulaire vous propose les formats les plus demandés."),
  ("Des salariés répondent", "Ils <span class='it'>viennent.</span>",
   "Les salariés des entreprises abonnées proches de chez vous voient l'annonce et se "
   "proposent. Vous voyez qui vient et pour quelle date."),
  ("Vous confirmez", "En <span class='it'>un clic.</span>",
   "Après la date, vous recevez un courriel avec un lien. Il ouvre une page qui pose une "
   "seule question, avec trois réponses possibles, dont « réalisée partiellement » avec le "
   "chiffre réel. Rien à ressaisir dans votre espace, aucun rapport à écrire."),
])}
  </div>
</section>"""


CHALLENGE_ASSO = f"""<section id="challenge">
  <div class="layer">
{entete("Pourquoi les entreprises viennent",
        "Les entreprises jouent<br><span class='it'>une saison.</span>",
        "C'est vous qui dites si une mission a eu lieu. Sans réponse de votre part sous "
        "quatorze jours, elle est comptée, et reste marquée comme non confirmée partout "
        "où elle apparaît.")}

    <div class="photos3">
      {photo("refuge-sortie", "Deux bénévoles sortent quatre chiens de refuge sur un chemin "
             "de campagne, en plein soleil", "")}
      {photo("collecte", "Des mains gantées trient des conserves et des légumes dans des "
             "cagettes, dans une salle claire", "")}
      {photo("refuge-chats", "Un chat roux se laisse gratter sous le menton dans une salle "
             "de refuge claire", "")}
    </div>

    <div class="trois3">
      <div><h4>C'est vous qui confirmez</h4>
        <p>Vous dites si la mission a eu lieu, en un clic, depuis un courriel. Sans réponse
          sous quatorze jours, elle est comptée mais reste écrite comme non confirmée, et le
          résultat comme estimé. Ce n'est pas une faute, et vous pouvez répondre plus tard.</p></div>
      <div><h4>Elles cherchent près de chez vous</h4>
        <p>Votre fiche entre dans l'annuaire de chaque entreprise abonnée dès que votre
          enregistrement est vérifié, que vous ayez publié une annonce ou non : leurs salariés
          peuvent vous trouver, lire ce que vous faites et vous contacter. Une annonce ouverte
          vous fait remonter en plus dans les besoins à trente kilomètres de leurs sites.</p></div>
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
        <h3>Par carte, sur votre compte HelloAsso</h3>
        <p>Vous connectez votre compte HelloAsso une fois, depuis leur page d'autorisation.
          Ensuite, un donateur paie par carte sur la page de HelloAsso et l'argent arrive chez
          vous. L'argent ne transite jamais par Riseva : ni commission de notre part, ni délai
          de reversement, ni plafond.</p>
        <p>Le don s'enregistre dès que HelloAsso ramène le donateur sur Riseva, juste après
          le paiement : le donateur n'a aucune référence à recopier. S'il ferme sa page avant
          ce retour, le paiement est bien encaissé chez HelloAsso : il apparaît sur votre
          compte là-bas, et vous l'ajoutez ici en une ligne.</p>
        <p class="mono">Pas encore de compte HelloAsso ? En ouvrir un est gratuit et prend
          quelques minutes. En attendant, le virement reste possible.</p>
      </div>
      <div class="col">
        <h3>Les reçus fiscaux restent les vôtres</h3>
        <p>Si vous activez cette option sous mandat écrit, Riseva prépare le reçu à partir de
          vos informations. Votre association l'émet et en reste responsable. Sans mandat, nous
          ne préparons rien.</p>
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
   "<p>Cinq minutes pour écrire une annonce, un courriel pour confirmer après la mission. La "
   "première mise en ligne attend que nous ayons vérifié votre enregistrement administratif ; "
   "ensuite, vous publiez quand vous voulez. Il n'y a pas de tableau de bord à surveiller, pas "
   "de fichier à tenir, pas de rapport à produire pour l'entreprise.</p>"
   "<p>Si écrire l'annonce vous rebute, le formulaire propose les formats les plus demandés "
   "et vous n'avez qu'à changer la date et le nombre de places. Rien n'est publié tant que "
   "vous n'avez pas relu.</p>"),
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
   "reste publiée, et votre tableau de bord affiche noir sur blanc combien d'entreprises "
   "abonnées ont un site à moins de trente kilomètres de chez vous. Si la réponse est zéro, "
   "il l'écrit.</p>"),
  ("Qui peut s'inscrire ?",
   "<p>Toute association déclarée, y compris de droit local d'Alsace-Moselle. Un numéro, RNA "
   "ou SIREN, accélère la vérification sans être obligatoire : beaucoup d'associations déclarées "
   "dix n'ont pas de SIREN. Nous vérifions "
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
{entete("S'inscrire", "Quatre lignes, un lien,<br><span class='it'>et votre espace est ouvert.</span>",
        "Pas de dossier à monter, pas de pièce à joindre. Vous entrez quatre informations, "
        "vous ouvrez le lien qu'on vous envoie, et votre espace est là : vous préparez votre "
        "première annonce tout de suite. Elle part en ligne dès que nous avons vérifié votre "
        "enregistrement administratif, ce que nous faisons sous deux jours ouvrés. "
        "Rien à ressaisir.")}
    <form id="formAsso" class="join-grid" novalidate>
      <div class="rv">
        <div class="j-step mono">Quatre informations suffisent</div>
        <p class="j-sentence">Nous sommes <span class="blank"><label class="sr-only" for="fa-asso">Nom de l'association</label><input id="fa-asso" class="bk" type="text" name="asso" data-key="asso" data-label="le nom de votre association" placeholder="votre association" spellcheck="false" required><span class="ghost" aria-hidden="true"></span></span>, à <span class="blank"><label class="sr-only" for="fa-ville">Ville</label><input id="fa-ville" class="bk" type="text" name="ville" data-key="ville" data-label="votre ville" placeholder="votre ville" required><span class="ghost" aria-hidden="true"></span></span>. Ce qui nous manque le plus en ce moment, c'est <span class="blank"><label class="sr-only" for="fa-mot">Ce qui vous manque</label><input id="fa-mot" class="bk" type="text" name="mot" data-key="mot" data-label="ce qui vous manque" placeholder="des bras un samedi matin" required><span class="ghost" aria-hidden="true"></span></span>. Notre adresse est <span class="blank"><label class="sr-only" for="fa-mail">Adresse e-mail</label><input id="fa-mail" class="bk" type="email" name="mail" data-key="mail" data-label="votre adresse e-mail" placeholder="nom@association.fr" spellcheck="false" required><span class="ghost" aria-hidden="true"></span></span>.</p>
        <p class="j-hint" id="jHint">Nous vous envoyons un lien de connexion : en l'ouvrant,
          votre espace se crée avec ce que vous venez d'écrire. Aucun mot de passe. Votre page
          devient visible une fois votre enregistrement vérifié, et votre espace vous dit ce
          qu'il reste à faire.</p>
        <div class="j-cta">
          <button type="submit" class="btn btn-lg"><span class="dot"></span>Ouvrir mon espace</button>
          <span class="mono">Gratuit, sans exclusivité, sans commission</span>
        </div>
        <p class="j-msg" id="jMsg" role="status" aria-live="polite"></p>
      </div>

      <div class="rv d2">
        <div class="bulletin" id="bulletin" aria-hidden="true">
          <div class="bl-body">
            <div class="bl-top">
              <span class="mono">Votre fiche</span>
              <span class="bl-ref mono" id="blRef">RSV-AS-....</span>
            </div>
            <ul class="bl-rows">
              <li data-key="asso"><i class="bl-tick"></i><span class="bl-k">Association</span><span class="bl-v">à compléter</span></li>
              <li data-key="ville"><i class="bl-tick"></i><span class="bl-k">Ville</span><span class="bl-v">à compléter</span></li>
              <li data-key="mot"><i class="bl-tick"></i><span class="bl-k">Besoin</span><span class="bl-v">à compléter</span></li>
              <li data-key="mail"><i class="bl-tick"></i><span class="bl-k">Adresse</span><span class="bl-v">à compléter</span></li>
            </ul>
            <div class="bl-prog" role="progressbar" aria-valuemin="0" aria-valuemax="4"
                 aria-valuenow="0" aria-label="Champs renseignés">
              <span class="bl-track"><span class="bl-fill" id="blBar"></span></span>
              <span class="bl-count mono" id="blCount">0 / 4</span>
            </div>
            <div class="bl-stamp mono" id="blStamp">Gratuit, sans engagement</div>
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
        <h2>Quatre lignes, un lien, et votre espace est ouvert.</h2>
        <p>Vous décrivez ce que vous faites et vous préparez votre première annonce. Nous
          vérifions votre enregistrement pendant ce temps : votre page devient visible des
          entreprises une fois cette vérification faite. Rien à installer, rien à payer.</p>
      </div>
      <div class="bandeau-cta">
        <a class="btn btn-lg" href="#commencer"><span class="dot"></span>Ouvrir mon espace</a>
        <span class="mono">Gratuit, sans exclusivité, et sans commission sur vos dons.</span>
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
