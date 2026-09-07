#!/usr/bin/env python3
"""Les deux vitrines : une pour les entreprises, une pour les associations.

    python3 scripts/vitrines.py

Refonte de septembre 2026. Ce que les deux pages ont en commun : le squelette,
la barre, le pied, les polices, la feuille de style, et une règle d'écriture,
chaque section répond à une question que le lecteur se pose à ce moment-là de
sa lecture. Ce qu'elles n'ont pas en commun : le contenu, écrit deux fois,
exprès. Une présidente d'association n'a rien à faire dans un argumentaire
d'achat, un responsable RSE n'a rien à faire dans une charte de partenariat.

Ce que la recette vérifie et que ce fichier tient :
  , aucun chiffre du jeu de démonstration repris dans le texte ;
  , la grille tarifaire lue dans `data.js`, jamais recopiée ;
  , la formule de la clôture automatique, mot pour mot, sur les deux pages ;
  , Riseva n'encaisse rien, et les deux pages le disent ;
  , aucune requête vers un domaine tiers, polices comprises ;
  , aucune illustration : les seules images sont des captures du produit,
    prises par `scripts/captures.py`, et l'affiche telle qu'elle sort.

Les décisions de forme sont dans `docs/refonte-2026-09/` : audit, recherche,
contrôles croisés, architecture, langage visuel.
"""
import json, pathlib, re

RACINE = pathlib.Path(__file__).resolve().parent.parent
PUBLIC = RACINE / "public"


# ---------------------------------------------------------------------------
# La grille tarifaire n'est pas recopiée ici : elle est lue dans `data.js`, qui
# en est la seule source. Un prix affiché sur la vitrine et un prix facturé par
# la plateforme qui divergent, c'est le genre d'erreur qu'un client découvre au
# moment de signer. La recette vérifie en plus que les deux coïncident.
# ---------------------------------------------------------------------------
def lire_tarifs():
    src = (PUBLIC / "app" / "data.js").read_text(encoding="utf-8")
    bloc = src[src.index("export const TARIFS = {"):src.index("export const palierPour")]
    paliers = []
    for m in re.finditer(
        r"\{ id:\"(\w+)\",\s*max:([^,]+),\s*prix:(\d+),\s*sites:(\d+),\s*label:\"([^\"]+)\"",
        bloc):
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
        "fondateur_jusquau": re.search(r'jusquau:\s*"([^"]+)"', bloc).group(1),
        "acompte_taux": float(un("acompte_taux")),
        "acompte_minimum": int(un("acompte_minimum")),
        "solde_jours": int(un("solde_jours")),
        "remise_comptant": float(un("remise_comptant")),
        "affiches": int(un("envois_affiches_par_saison")),
        "inclus": re.findall(r'"([^"]+)"', bloc[bloc.index("inclus: ["):bloc.index("exclus: [")]),
        "exclus": re.findall(r'"([^"]+)"', bloc[bloc.index("exclus: ["):]),
    }


def lire_kits():
    """Les quatre envois de la saison, avec leur mois : `KITS_SAISON` dans data.js.

    « Quatre envois compris » sans dire de quoi ni quand est un chiffre qu'on ne
    comprend pas, donc un chiffre qu'on ne croit pas. La vitrine les nomme, et
    elle les lit là où ils sont définis pour ne jamais en nommer un de trop."""
    src = (PUBLIC / "app" / "data.js").read_text(encoding="utf-8")
    bloc = src[src.index("export const KITS_SAISON = ["):src.index("export const ETATS_EXPEDITION")]
    return [(m.group(1), int(m.group(2)))
            for m in re.finditer(r'nom:"([^"]+)",\s*mois:(\d+)', bloc)]


TARIFS = lire_tarifs()
KITS = lire_kits()
MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août",
        "septembre", "octobre", "novembre", "décembre"]
EUR = lambda n: f"{n:,}".replace(",", "&nbsp;") + "&nbsp;€"
# Un petit nombre en tête de phrase s'écrit en lettres ; les montants restent en chiffres.
EN_LETTRES = {1: "un", 2: "deux", 3: "trois", 4: "quatre", 5: "cinq", 6: "six", 7: "sept",
              8: "huit", 9: "neuf", 10: "dix", 11: "onze", 12: "douze"}
lettres = lambda n: EN_LETTRES.get(n, str(n))
PCT = lambda x: f"{int(round(x * 100))}&nbsp;%"

FEUILLE = "riseva-mark"   # favicon
DEMO = "/app/?demo=1"


# ── images ──────────────────────────────────────────────────────────────────

def dimensions(chemin):
    """Largeur et hauteur d'un JPEG, lues dans ses marqueurs.

    Sans ces deux attributs sur la balise, le navigateur ne connaît pas le
    rapport de l'image avant de l'avoir chargée et le texte descend d'un cran au
    moment où elle arrive. Sur une page faite de captures, c'est la page entière
    qui sauterait. Elles sont lues dans le fichier, jamais recopiées."""
    d = chemin.read_bytes()
    i = 2
    while i < len(d):
        if d[i] != 0xFF:
            i += 1; continue
        m = d[i + 1]
        if m in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
            return int.from_bytes(d[i + 7:i + 9], "big"), int.from_bytes(d[i + 5:i + 7], "big")
        if m in (0xD8, 0xD9) or 0xD0 <= m <= 0xD7:
            i += 2; continue
        i += 2 + int.from_bytes(d[i + 2:i + 4], "big")
    raise ValueError(f"dimensions introuvables : {chemin}")


def sources_webp(dossier, nom, tailles):
    """Le <source> WebP d'une image, ou rien si les variantes n'existent pas.

    Le JPEG reste dans le <img> : il porte l'alt, les dimensions et le repli.
    `tailles` décrit la largeur d'affichage réelle : sans elle, le navigateur
    suppose 100vw et télécharge la plus grande variante pour une image qui en
    occupe la moitié."""
    d = PUBLIC / dossier
    dispo = []
    for f in sorted(d.glob(f"{nom}-*.webp")):
        m = re.fullmatch(re.escape(nom) + r"-(\d+)", f.stem)
        if m:
            dispo.append((int(m.group(1)), f"/{dossier}/{f.name} {m.group(1)}w"))
    dispo = [t for _, t in sorted(dispo)]
    if not dispo:
        return ""
    return f'<source type="image/webp" srcset="{", ".join(dispo)}" sizes="{tailles}">'


def capture(nom, alt, tailles, eager=False, classe="", dossier="captures", nature=False,
            mobile=None, tapis=False, densite=2):
    """Une capture du produit, dans son cadre, sans légende.

    Pas de légende sous les images : la phrase qui explique ce qu'on regarde
    est à côté, dans la section, et la page dit une fois que les écrans
    viennent du jeu de démonstration. Une légende répétée sous chaque image
    transforme la page en avertissement continu.

    `tapis` : l'écran est posé sur une plaque de papier creusé, centré, et
    garde ses proportions dedans. Dans une séquence (les quatre moments, les
    trois étapes), c'est la plaque qui donne la masse, pas l'écran : une carte
    et une page entière font alors le même poids sur la grille, sans qu'aucune
    des deux soit recadrée.

    `densite` : la densité à laquelle la capture a été prise (captures.py) ;
    elle donne la taille « nature » de l'écran, la largeur du fichier divisée
    par la densité."""
    fichier = PUBLIC / dossier / f"{nom}.jpg"
    if not fichier.exists():
        raise SystemExit(f"capture manquante : {fichier}\nLancez d'abord : python3 scripts/captures.py")
    w, h = dimensions(fichier)
    charge = 'loading="eager" fetchpriority="high"' if eager else 'loading="lazy"'
    cls = f"shot{' shot-tapis' if tapis else ''}{(' ' + classe) if classe else ''}"
    # `nature` : l'image ne dépasse pas sa taille d'écran (les captures sont
    # prises en double densité, donc la moitié de leur largeur). Une petite
    # carte agrandie à la largeur de sa colonne se lit comme un dessin.
    style = f' style="max-width:{w // densite}px"' if (nature and not tapis) else ""
    # Sur un tapis, c'est l'image qui porte la limite : au plus douze pour cent
    # plus grande que nature, et jamais plus large ni plus haute que la plaque
    # (la feuille borne la hauteur).
    limite = f' style="max-width:min(100%,{round(w / densite * 1.12)}px)"' if tapis else ""
    # `mobile` : une autre capture du même écran, servie sous 640 px. Le
    # navigateur ne télécharge que celle qui correspond à sa largeur, et les
    # deux sources portent leurs dimensions pour que rien ne saute.
    tel = ""
    if mobile:
        fm = PUBLIC / dossier / f"{mobile}.jpg"
        if not fm.exists():
            raise SystemExit(f"capture manquante : {fm}\nLancez d'abord : python3 scripts/captures.py")
        wm, hm = dimensions(fm)
        webp_m = sources_webp(dossier, mobile, "92vw").replace(
            "<source ", f'<source media="(max-width: 640px)" width="{wm}" height="{hm}" ')
        tel = (f'{webp_m}<source media="(max-width: 640px)" srcset="/{dossier}/{mobile}.jpg" '
               f'width="{wm}" height="{hm}">')
    return (f'<figure class="{cls}"{style}><picture>{tel}{sources_webp(dossier, nom, tailles)}'
            f'<img src="/{dossier}/{nom}.jpg" alt="{alt}" {charge} decoding="async" '
            f'width="{w}" height="{h}"{limite}></picture></figure>')


# ── briques communes ────────────────────────────────────────────────────────

def nav(liens, cta_texte, cta_href, alt_texte, alt_href, note):
    """La barre du haut, et le menu qui la remplace sous 900 px.

    Le menu est un <dialog> : le navigateur gère le focus, Échap et le fond
    inerte, et la page en dessous ne défile plus. Sans script, la barre reste
    une barre et les ancres marchent."""
    grands = "\n      ".join(f'<a href="{h}">{t}</a>' for h, t in liens)
    petits = "\n      ".join(f'<a href="{h}">{t}</a>' for h, t in liens)
    return f"""<header class="nav" id="nav">
  <div class="wrap nav-in">
    <a class="nav-brand" href="/" aria-label="Riseva, accueil">
      <img src="/brand/riseva-full.png" alt="Riseva" width="392" height="88">
    </a>
    <nav class="nav-links" aria-label="Sections de la page">
      {grands}
    </nav>
    <div class="nav-actions">
      <a class="nav-alt" href="{alt_href}">{alt_texte}</a>
      <a class="btn btn-nav" href="{cta_href}">{cta_texte}</a>
      <button class="nav-menu" id="navMenu" type="button" aria-haspopup="dialog"
              aria-controls="menu" aria-label="Ouvrir le menu"><span></span><span></span></button>
    </div>
  </div>
</header>

<dialog class="menu" id="menu" aria-label="Menu">
  <div class="menu-in">
    <div class="menu-top">
      <img src="/brand/riseva-full.png" alt="Riseva" width="392" height="88">
      <button class="menu-close" id="menuClose" type="button" aria-label="Fermer le menu">
        <span></span><span></span></button>
    </div>
    <nav class="menu-links" aria-label="Sections de la page">
      {petits}
      <a class="menu-alt" href="{alt_href}">{alt_texte}</a>
    </nav>
    <a class="btn btn-lg" href="{cta_href}">{cta_texte}</a>
    <p class="menu-note">{note}</p>
  </div>
</dialog>"""


COLONNES_PIED = [
    ("Le produit", [(DEMO, "Démonstration"), ("/#prix", "Tarif"),
                    ("/inscription.html", "Préinscription 2027"),
                    ("/associations.html", "Pour les associations")]),
    ("Le contrat", [("/reglement.html", "Règlement de la saison"),
                    ("/charte-associations.html", "Charte des associations"),
                    ("/engagements.html", "Engagements de service"),
                    ("/cgv.html", "Conditions de vente"),
                    ("/moderation.html", "Modération des annonces")]),
    ("Riseva", [("/securite.html", "Sécurité"), ("/confidentialite.html", "Données personnelles"),
                ("/mentions.html", "Mentions légales"),
                ("mailto:contact@riseva.fr", "contact@riseva.fr")]),
]


def pied(pitch, croise_href, croise_texte):
    cols = ""
    for titre, items in COLONNES_PIED:
        lis = "\n        ".join(f'<li><a href="{h}">{t}</a></li>' for h, t in items)
        cols += f"""
      <div>
        <h2 class="foot-h">{titre}</h2>
        <ul>
        {lis}
        </ul>
      </div>"""
    return f"""<footer class="foot" id="pied">
  <div class="wrap">
    <div class="foot-grid">
      <div class="foot-id">
        <img src="/brand/riseva-full-white.png" alt="Riseva" width="392" height="88">
        <p>{pitch}</p>
        <p><a class="foot-croise" href="{croise_href}">{croise_texte}</a></p>
      </div>{cols}
    </div>
    <div class="foot-bar">
      <span>&copy; 2026 Riseva. Première saison&nbsp;: janvier 2027.</span>
      <span>Aucune requête vers un domaine tiers, polices comprises.</span>
    </div>
  </div>
</footer>"""


def entete(eyebrow, titre, intro=""):
    """Le titre d'une section, avec ou sans sur-titre.

    Le sur-titre en capitales ne reste que là où il situe une partie du produit
    que le titre ne nomme pas (« L'outil RSE », « Vos équipes », « La saison »).
    Répété avant chaque titre, il devenait le composant d'un gabarit."""
    p = f"\n    <p class=\"s-intro\">{intro}</p>" if intro else ""
    e = f"\n    <p class=\"eyebrow\">{eyebrow}</p>" if eyebrow else ""
    return f"""<div class="s-head">{e}
    <h2>{titre}</h2>{p}
  </div>"""


def details(questions, ouverte=0):
    """La FAQ : des <details>, toutes les questions visibles, une ouverte.

    Pas de carte autour, un filet entre les questions, un signe plus qui
    tourne. Le contenu est dans la page sans script : un lecteur d'écran, un
    moteur et une impression le lisent tel quel."""
    out = ""
    for i, (q, r) in enumerate(questions):
        ouvert = " open" if i == ouverte else ""
        out += f"""
    <details class="qa"{ouvert}>
      <summary><span>{q}</span><i class="qa-plus" aria-hidden="true"></i></summary>
      <div class="qa-r">{r}</div>
    </details>"""
    return f'<div class="faq">{out}\n  </div>'


def page(*, fichier, titre, description, corps, nav_html, pied_html, canonique,
         classe_corps, entetes_sup=""):
    html = f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{titre}</title>
<meta name="description" content="{description}">
<meta name="theme-color" content="#F2F0E9">
<link rel="canonical" href="https://riseva.fr{canonique}">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
<meta property="og:site_name" content="Riseva">
<meta property="og:title" content="{titre}">
<meta property="og:description" content="{description}">
<meta property="og:url" content="https://riseva.fr{canonique}">
<meta property="og:image" content="https://riseva.fr/captures/admin-tableau.jpg">
<link rel="icon" href="/brand/{FEUILLE}.png">
<!-- Les deux polices sont servies par Riseva et prechargees : elles decident du
     premier rendu, et le repli est cale sur leurs metriques (polices.css). -->
<link rel="preload" href="/brand/polices/instrument-sans.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/brand/polices/inter.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/styles/polices.css">
<!-- La feuille servie est engendree depuis vitrine.css par scripts/css.py :
     memes regles, sans les commentaires. Les corrections vont dans vitrine.css. -->
<link rel="stylesheet" href="/styles/vitrine.min.css">
<!-- Une classe posee avant le premier rendu, et rien d'autre. Les trois
     mouvements de la page sont ecrits « .js ... » : sans script, tout est en
     place des le depart. -->
<script>document.documentElement.className+=" js";</script>
{entetes_sup}</head>
<body class="{classe_corps}">
<a class="sr-only" href="#contenu">Aller au contenu</a>

{nav_html}

<main id="contenu">
{corps}
</main>

{pied_html}

<script src="/app/config.js" onerror="void 0"></script>
<script src="/vitrine.js" defer></script>
</body>
</html>
"""
    (PUBLIC / fichier).write_text(html, encoding="utf-8")
    return fichier


# ═══════════════════════════════════════════════════════════════════════════
#  SITE ENTREPRISES
# ═══════════════════════════════════════════════════════════════════════════

# Les largeurs d'affichage, pour `sizes`. Mesurées sur la page rendue, pas
# devinées : le navigateur choisit le fichier avant de connaître la mise en
# page, et une valeur trop basse lui fait servir une image qu'il agrandira.
T_HERO = "(max-width: 1240px) 94vw, 1180px"
T_DEMI = "(max-width: 640px) 92vw, (max-width: 1240px) 46vw, 566px"
T_SEPT = "(max-width: 900px) 92vw, (max-width: 1240px) 56vw, 691px"
T_CINQ = "(max-width: 900px) 92vw, (max-width: 1240px) 40vw, 484px"
# Les tapis des moments : deux colonnes au-dessus de 900 px, une seule en
# dessous. La valeur de `sizes` fixe aussi la taille intrinseque d'une image en
# `width:auto` : trop basse, l'ecran serait dessine plus petit que sa plaque.
T_TAPIS = "(max-width: 640px) 92vw, (max-width: 900px) 84vw, (max-width: 1240px) 46vw, 516px"

NAV_ENT = nav(
    [("#mecanisme", "Comment ça marche"), ("#outil", "L'outil"), ("#saison", "La saison"),
     ("#prix", "Tarif"), ("#questions", "Questions")],
    "Se préinscrire", "/inscription.html",
    "Associations", "/associations.html",
    "Préinscription gratuite, sans carte, sans engagement.")

HERO_ENT = f"""<section class="hero" id="hero">
  <div class="wrap">
    <div class="hero-txt">
      <h1>Tous vos sites dans un seul rapport.<br>Et vos équipes sur le terrain.</h1>
      <p class="lede">Des associations à moins de trente kilomètres de vos sites, refuges,
        épiceries solidaires, chantiers de plantation, publient ce qui leur manque. Vos salariés
        se proposent. L'association confirme ce qui a eu lieu. Cette confirmation, datée, entre
        dans votre rapport RSE.</p>
      <div class="cta">
        <a class="btn btn-lg" href="#prix">Calculer mon tarif</a>
        <a class="btn btn-lg btn-2" href="{DEMO}">Ouvrir la démonstration</a>
      </div>
      <p class="hero-note">À partir de {EUR(TARIFS['paliers'][0]['prix'])} HT la saison, tarif
        public. Rien par salarié, rien par module. Première saison&nbsp;: janvier 2027.</p>
    </div>
    {capture("admin-tableau",
             "Le tableau de bord d'une entreprise dans Riseva : salariés mobilisés, missions "
             "validées, heures consacrées, associations soutenues, et l'état de chaque site",
             T_HERO, eager=True, classe="shot-hero", mobile="admin-tableau-mobile")}
  </div>
</section>"""


def moments(items):
    """Le mécanisme, en quatre objets réels du produit.

    Le texte est au-dessus de l'image, et chaque image est posée sur un tapis
    du même format : une carte, une liste, une page, un tableau n'ont pas la
    même forme, et la première implémentation, qui les laissait pendre chacune
    à sa hauteur, se lisait comme quatre objets de tailles accidentelles. La
    plaque donne la masse ; l'écran garde ses proportions dedans.
    Le trait qui longe le haut est la rivière du design system : la seule fois
    où le motif sert un sens, le fait qui coule de l'association au rapport."""
    out = ""
    for n, (titre, texte, image, note) in enumerate(items, 1):
        bas = f'\n      <p class="moment-note">{note}</p>' if note else ""
        out += f"""
    <li class="moment">
      <div class="moment-txt">
        <p class="moment-n" aria-hidden="true">{n}</p>
        <h3>{titre}</h3>
        <p>{texte}</p>{bas}
      </div>
      {image}
    </li>"""
    return f"""<ol class="moments">{out}
  </ol>"""


MECANISME_ENT = f"""<section class="s" id="mecanisme">
  <div class="wrap">
  {entete("", "De l'annonce au rapport, sans ressaisir la mission.",
          "Quatre écrans du produit, issus du jeu de démonstration. L'interface est réelle, les "
          "noms et les chiffres sont fictifs.")}
  <svg class="riviere" viewBox="0 0 1180 24" preserveAspectRatio="none" aria-hidden="true">
    <path class="riviere-t" d="M0 12 C 140 12, 200 4, 320 8 S 560 20, 700 12 S 980 2, 1180 10"/>
  </svg>
  {moments([
    ("L'association publie",
     "Elle écrit ce qui lui manque, la date et le nombre de places. Son annonce apparaît chez "
     "les salariés des entreprises abonnées dont un site est à moins de trente kilomètres.",
     capture("annonce-carte", "Une annonce telle qu'un salarié la voit : le format, l'objectif, "
             "la date, les places restantes, et le bouton Participer", T_TAPIS, tapis=True,
             mobile="annonce-carte-mobile"), ""),
    ("Vos salariés se proposent",
     "Depuis leur espace, sur la date qui leur convient, sur leur temps de travail si "
     "l'annonce le prévoit. L'association voit qui vient, et peut refuser sans se justifier.",
     capture("qui-vient", "La liste de qui vient, côté association : le salarié, son entreprise, "
             "la mission et la date", T_TAPIS, tapis=True, densite=3), ""),
    ("L'association confirme",
     "Après la mission, elle reçoit un courriel. Une question, trois réponses, dont « réalisée "
     "partiellement » avec le chiffre réel. Sa réponse fait foi.",
     capture("confirmation", "La page qu'ouvre le courriel de confirmation : une question, trois "
             "réponses, réalisée comme prévu, réalisée partiellement, non réalisée", T_TAPIS,
             tapis=True, mobile="confirmation-mobile"),
     "Sans réponse sous quatorze jours, la mission est <b>clôturée automatiquement sans "
     "confirmation</b>&nbsp;: son résultat reste marqué estimé partout, dans vos rapports aussi."),
    ("Le fait entre dans votre rapport",
     "La mission apparaît dans votre tableau avec son état, confirmée, engagée ou clôturée sans "
     "confirmation, puis dans le rapport du trimestre. Personne ne la recopie.",
     capture("mission-lignes", "Trois lignes du tableau des missions d'une entreprise, avec leur "
             "état : en attente de l'association, engagée, clôturée sans confirmation", T_TAPIS,
             tapis=True, mobile="mission-lignes-mobile"), ""),
  ])}
  <p class="s-croise">Vous êtes une association&nbsp;? <a href="/associations.html">La page qui vous
    est destinée</a>&nbsp;: gratuite, sans exclusivité, sans commission.</p>
  </div>
</section>"""


OUTIL_ENT = f"""<section class="s s-sunk" id="outil">
  <div class="wrap">
  {entete("L'outil RSE", "Ce que vous ne referez<br>plus à la main.")}
  <div class="outil-a">
    <div class="outil-txt">
      <p class="q">Combien de vos sites ont répondu&nbsp;?</p>
      <h3>Le compte des sites qui ont répondu, pendant la collecte.</h3>
      <p>Chaque campagne de collecte a son échéance&nbsp;; chaque site, un référent qui saisit,
        et un administrateur qui approuve. Vous voyez combien de sites ont répondu, ce qui attend
        une approbation et ce qu'il manque, pendant la collecte plutôt qu'après. Un site qui n'a
        pas répondu reste marqué sans réponse, jamais complété avec le chiffre d'avant.</p>
    </div>
    {capture("collecte", "La carte Collecte des indicateurs d'une entreprise : les sites qui ont "
             "répondu, les valeurs approuvées, celles en attente d'approbation, et l'échéance",
             T_SEPT, mobile="collecte-mobile")}
  </div>
  <div class="outil-bc">
    <div class="outil-b">
      <p class="q">D'où sort ce chiffre&nbsp;?</p>
      <h3>Chaque taux avec sa formule et ses sources.</h3>
      <p>Un taux de périmètre est un rapport de sommes, jamais une moyenne de taux. Seules les
        valeurs approuvées entrent dans un rapport ou dans une réponse à un client&nbsp;; les
        autres restent marquées provisoires.</p>
      {capture("indicateurs-formule", "Le tableau consolidé des indicateurs : chaque taux avec "
               "sa formule, sa valeur approuvée et sa valeur provisoire", T_DEMI,
               mobile="indicateurs-formule-mobile")}
    </div>
    <div class="outil-c">
      <p class="q">Qu'est-ce que vos équipes ont fait cette année&nbsp;?</p>
      <h3>La liste des missions, avec leur état.</h3>
      <p>Association, salarié, date, points, et ce que l'association a répondu. C'est ce tableau
        que le rapport reprend, rien n'est retraité entre les deux.</p>
      {capture("missions", "Le tableau des missions d'une entreprise : mission, association, "
               "salarié, date, points, état", T_DEMI, mobile="missions-mobile")}
    </div>
  </div>
  <p class="s-liens">Aussi dans la démonstration&nbsp;: le dictionnaire des données, le registre des
    événements de sécurité, la fiche VSME, la vue groupe.
    <a href="{DEMO}">Ouvrir la démonstration</a></p>
  </div>
</section>"""


def envois_phrase():
    """« Quatre envois » nommés : les kits de `KITS_SAISON`, avec leur mois."""
    parts = []
    for nom, mois in KITS:
        parts.append(f"{nom.lower()} en {MOIS[mois - 1]}")
    if len(parts) > 1:
        return ", ".join(parts[:-1]) + " et " + parts[-1]
    return parts[0]


EQUIPES_ENT = f"""<section class="s" id="equipes">
  <div class="wrap">
  {entete("Vos équipes", "Un lien, une affiche, et chacun peut se proposer.")}
  <div class="equipes">
    <div class="equipes-txt">
      <p>Vous déclarez vos sites et nommez un référent par site. Le référent envoie le lien
        d'inscription à ses collègues, qui ouvrent leur espace sans mot de passe. L'affiche est
        générée avec ce lien et son code QR&nbsp;; {lettres(len(KITS))} envois d'affiches et de
        supports sont compris dans la saison, imprimés et postés à chaque site&nbsp;:
        {envois_phrase()}.</p>
      <p>La participation reste volontaire. Aucun taux de participation n'est promis.</p>
      <h3>Ce que ça demande chez vous</h3>
      <ul class="liste liste-grande">
        <li>Rien à installer. Aucun annuaire à synchroniser, aucun accès à votre réseau&nbsp;: tout
          passe par un lien et des courriels.</li>
        <li>Un référent par site, qui envoie le lien et saisit les indicateurs de son site à
          chaque campagne de collecte.</li>
        <li>Un administrateur, qui approuve les valeurs et reçoit les rapports.</li>
        <li>Pour les missions, l'association confirme le résultat&nbsp;: vous n'avez pas à le
          ressaisir.</li>
      </ul>
    </div>
    <div class="aff">
      {capture("affiche", "L'affiche A3 générée par Riseva pour un site : le nom de l'entreprise, "
               "la saison, le lien d'inscription et son code QR", T_CINQ)}
    </div>
  </div>
  </div>
</section>"""


SAISON_ENT = f"""<section class="s" id="saison">
  <div class="wrap">
  <div class="carte-sombre grain">
    <div class="saison-txt">
      <p class="eyebrow">La saison</p>
      <h2>Douze mois plus tard, vous n'avez pas de bilan à écrire.</h2>
      <ol class="temps">
        <li><b>Janvier.</b> Le lien part, l'affiche est posée, la saison est ouverte.</li>
        <li><b>De février à décembre.</b> Les missions se font et se confirment. Les indicateurs
          se collectent par campagne, site par site.</li>
        <li><b>Chaque trimestre.</b> Le rapport de la période est généré et envoyé à
          l'administrateur, sans rien demander à personne.</li>
        <li><b>Mi-janvier.</b> Le bilan annuel, avec son dossier de traçabilité&nbsp;: qui a
          confirmé quoi, et quand.</li>
      </ol>
      <p class="saison-cle">Ce qui est confirmé entre dans votre bilan. Ce qui ne l'est pas y
        reste marqué comme estimé.</p>
      <p>Un classement entre entreprises comparables rythme la saison&nbsp;; la moitié basse
        n'est jamais nommée. Le barème des points est public, dans
        <a href="/reglement.html">le règlement</a>.</p>
      <p><a class="btn btn-lime" href="{DEMO}#/rapports">Voir un rapport tel qu'il sort</a></p>
    </div>
    {capture("rapports", "L'écran Rapports d'une entreprise : les quatre rapports trimestriels "
             "et le rapport annuel, leur période, leur état et leur envoi", T_SEPT,
             mobile="rapports-mobile")}
  </div>
  </div>
</section>"""


def grille_tarifaire():
    lignes = ""
    for p in TARIFS["paliers"]:
        apd = "<span class='tar-apd'>à partir de</span> " if p.get("sur_devis") else ""
        lignes += f"""
        <tr>
          <td class="tar-eff">{p['label']}</td>
          <td class="tar-prix">{apd}<span class="tar-m"><b>{EUR(p['prix'])}</b> <span class="tar-ht">HT</span></span></td>
          <td class="tar-sites">{p['sites']} site{'s' if p['sites'] > 1 else ''}</td>
        </tr>"""
    inclus = "".join(f"<li>{x}</li>" for x in TARIFS["inclus"])
    dernier = TARIFS["paliers"][-1]
    jusquau = TARIFS["fondateur_jusquau"]
    a, m, j = jusquau.split("-")
    jusquau_fr = f"{int(j)} {MOIS[int(m) - 1]} {a}"
    return f"""<section class="s s-sunk" id="prix">
  <div class="wrap">
  {entete("", "Un tarif public, avant de décider.",
          "Une saison de douze mois. Le tarif suit votre effectif, parce que c'est lui qui "
          "détermine ce que nous produisons&nbsp;: les comptes, les affiches, les sites à "
          "consolider, les rapports.")}
  <div class="tarif">
    <div class="tar-sim">
      <p class="eyebrow">Votre tranche</p>
      <div class="tar-sim-row">
        <div class="champ"><label for="simEff">Effectif</label>
          <input class="tar-in" id="simEff" type="number" min="1" max="20000" value="150" inputmode="numeric"></div>
        <div class="champ"><label for="simSites">Sites</label>
          <input class="tar-in" id="simSites" type="number" min="1" max="60" value="1" inputmode="numeric"></div>
      </div>
      <p class="tar-sim-out" id="simOut" aria-live="polite">Entrez votre effectif et le nombre de vos
        sites&nbsp;: le montant s'affiche ici.</p>
      <div class="tar-sim-cta">
        <a class="btn" href="/inscription.html">Se préinscrire</a>
        <span class="mini">Gratuit, sans carte, sans engagement.</span>
      </div>
    </div>
    <div class="tar">
      <table class="tar-t">
        <caption class="sr-only">Grille tarifaire par tranche d'effectif</caption>
        <thead><tr><th scope="col">Effectif</th><th scope="col">La saison</th><th scope="col">Sites compris</th></tr></thead>
        <tbody>{lignes}
        </tbody>
      </table>
      <p class="tar-n">Site supplémentaire au-delà du nombre compris dans votre tranche&nbsp;:
        <b>{EUR(TARIFS['site_sup'])} HT</b>. Au-delà de deux mille salariés, le tarif est établi
        sur devis, à partir de {EUR(dernier['prix'])} HT et {dernier['sites']} sites compris.</p>
    </div>
  </div>
  <div class="tar-bas">
    <div class="tar-inclus">
      <h3>Ce qui est compris</h3>
      <ul class="liste">{inclus}</ul>
    </div>
    <div class="tar-notes">
      <h3>Tarif fondateur</h3>
      <p>-{PCT(TARIFS['fondateur_taux'])} pour les {TARIFS['fondateur_places']} premières
        entreprises qui signent, jusqu'au {jusquau_fr}. Il porte sur votre première saison, et sur
        elle seule&nbsp;: nous ne garantissons le prix d'aucune saison que nous n'avons pas encore
        vécue.</p>
      <h3>Règlement</h3>
      <p>Acompte de {PCT(TARIFS['acompte_taux'])} à la commande, {EUR(TARIFS['acompte_minimum'])}
        HT au minimum&nbsp;: il paie le premier envoi d'affiches et l'ouverture de vos comptes, qui
        partent avant la première mission. Solde à {TARIFS['solde_jours']} jours après l'ouverture
        de votre saison. Règlement intégral à la commande&nbsp;: -{PCT(TARIFS['remise_comptant'])}.
        Le bon de commande reprend cette grille telle quelle.</p>
      <p class="mini">Ce que Riseva ne fait pas est écrit plus bas, dans
        <a href="#questions">le périmètre exact de la plateforme</a> et dans ce qui reste à votre
        charge.</p>
    </div>
  </div>
  </div>
</section>"""


PRIX_ENT = grille_tarifaire()

# Les questions qui décident d'une signature. Elles sont écrites au registre
# de la franchise et non de l'argumentaire : la première dit non.
QUESTIONS_ENT = [
  ("Riseva a-t-elle déjà des résultats à montrer&nbsp;?",
   "<p>Non, et cette page n'en affiche aucun. La première saison démarre en janvier 2027&nbsp;: "
   "les écrans montrés ici viennent d'un jeu de démonstration et servent à montrer la forme des "
   "restitutions, pas un résultat obtenu.</p>"
   "<p>Ce qui est contractuel dès le premier jour est écrit dans "
   "<a href='/engagements.html'>les engagements de service</a>&nbsp;: les cinq critères de "
   "démarrage, l'acompte remboursé s'ils ne sont pas constatés, et le délai de quatorze jours au "
   "terme duquel un résultat non confirmé reste marqué comme estimé.</p>"),
  ("Qu'est-ce que Riseva demande à mon équipe pendant l'année&nbsp;?",
   "<p>Un administrateur déclare les sites, nomme un référent par site et approuve les valeurs "
   "avant qu'elles entrent dans un rapport. Chaque référent envoie le lien d'inscription à ses "
   "collègues et saisit les indicateurs de son site à chaque campagne de collecte, avec ses "
   "pièces s'il en a. Les rapports partent tout seuls.</p>"
   "<p>Pour les missions, le salarié se propose et l'association confirme le résultat&nbsp;: "
   "vous n'avez rien à ressaisir, ni fichier à tenir, ni bilan à écrire.</p>"),
  ("Faut-il une intégration informatique&nbsp;?",
   "<p>Non. Rien à installer sur les postes, aucun annuaire à synchroniser, pas d'authentification "
   "unique à brancher, aucun accès à votre réseau. Chacun se connecte par un lien reçu par "
   "courriel, sans mot de passe. Le seul prérequis est une adresse de courriel par personne.</p>"),
  ("Combien coûte une saison&nbsp;?",
   f"<p>La grille est <a href='#prix'>juste au-dessus</a>, avec le simulateur qui donne le "
   f"montant pour votre effectif et vos sites. Ce qu'elle ne dit pas et qui compte autant&nbsp;: "
   f"pas de facturation par salarié, pas de module en supplément, pas de commission sur les dons. "
   f"Les associations, elles, ne paient jamais rien.</p>"
   f"<p>Nous ne comparons pas notre prix à celui d'un concurrent que nous ne nommerions pas&nbsp;: "
   f"une fourchette annoncée sans source ne vous aide pas à décider.</p>"),
  ("Qu'est-ce qui est compris dans l'abonnement&nbsp;?",
   f"<p>Une saison d'un an, avec les comptes correspondant à votre effectif, tous les formats du "
   f"barème, l'accompagnement au lancement, les {lettres(len(KITS))} envois d'affiches et de supports, la "
   f"gestion RSE interne, la fiche VSME, l'accès du CSE en lecture, et les rapports trimestriels "
   f"et annuel.</p>"
   f"<p>Sur le don en argent, une précision qui compte&nbsp;: Riseva <b>n'encaisse rien</b>. Le "
   f"donateur paie par virement sur le compte de l'association, ou par carte sur la page "
   f"<b>HelloAsso</b> de l'association si elle en a une&nbsp;; dans les deux cas l'argent arrive "
   f"chez elle sans transiter par Riseva. Nous ne sommes donc pas un établissement de paiement, "
   f"il n'y a aucune commission de notre part, et rien à attendre d'un reversement de Riseva.</p>"),
  ("Qu'est-ce que « démarrer » veut dire, précisément&nbsp;?",
   "<p>Cinq critères, constatés ensemble à la date convenue&nbsp;: votre espace est ouvert et le "
   "lien d'inscription fonctionne depuis un poste de votre réseau&nbsp;; les comptes commandés "
   "sont disponibles et le quota de chaque site est réparti&nbsp;; les formats de votre contrat "
   "sont actifs&nbsp;; des associations vérifiées et actives sont présentes autour de vos sites, "
   "et leur nombre vous est donné site par site, même quand il est faible&nbsp;; un rapport est "
   "exportable, avec la méthode de calcul à côté de chaque chiffre.</p>"
   "<p>Vous avez quinze jours pour les constater. Si l'un manque et n'est pas levé dans les quinze "
   "jours suivants, <b>l'acompte est remboursé intégralement</b> et aucun solde n'est dû. Le solde "
   "est facturé à l'ouverture de la saison et payable à trente jours&nbsp;; si le démarrage n'est "
   "pas constaté, il n'est pas dû. C'est écrit dans <a href='/engagements.html'>les engagements "
   "de service</a>, mot pour mot.</p>"),
  ("Est-ce que la dépense est déductible, et qui émet le reçu&nbsp;?",
   "<p>Deux lignes, deux régimes. L'abonnement Riseva est une prestation de services&nbsp;: il "
   "entre dans vos charges, TVA récupérable. Le mécénat suit l'article 238 bis du CGI et peut "
   "ouvrir droit à 60&nbsp;% de réduction d'impôt jusqu'à 2 millions d'euros de dons sur "
   "l'exercice, puis 40&nbsp;% au-delà, dans la limite de 20&nbsp;000&nbsp;€ ou 5 pour mille du "
   "chiffre d'affaires, le plus élevé des deux, selon la nature du don et l'éligibilité de "
   "l'organisme.</p>"
   "<p>Le reçu fiscal est émis par l'association bénéficiaire, seule habilitée, au modèle Cerfa "
   "16216 (2041-MEC-SD), sous sa numérotation et la signature d'une personne habilitée. Si elle "
   "en a donné mandat écrit à Riseva, nous préparons le document&nbsp;; elle le vérifie et le "
   "signe. Riseva ne certifie ni l'éligibilité ni les montants&nbsp;: elle calcule une estimation "
   "et attend votre chiffre d'affaires, vos dons faits ailleurs et vos reports avant d'afficher "
   "un plafond. Votre expert-comptable arrête le montant.</p>"),
  ("Est-ce que ça compte dans un appel d'offres&nbsp;?",
   "<p>Depuis le 21 août 2026, toute nouvelle consultation engagée sous le code de la commande "
   "publique doit retenir au moins un critère prenant en compte les caractéristiques "
   "environnementales de l'offre, sous réserve des exclusions prévues par le code (loi Climat et "
   "résilience, art. 35&nbsp;; code de la commande publique, art. L. 2152-7&nbsp;; décret "
   "n°&nbsp;2022-767 du 2 mai 2022).</p>"
   "<p>Riseva ne certifie rien et ne remplace pas un bilan carbone. Ce qu'elle vous donne pour "
   "répondre, c'est une liste datée de faits confirmés par des tiers, des indicateurs sociaux et "
   "sécurité avec leur formule et leurs sources, et une fiche rangée dans les rubriques de la "
   "norme volontaire VSME, avec la liste de ce qu'elle ne couvre pas.</p>"),
  ("Quelles données sortent de chez nous&nbsp;?",
   "<p>Le strict nécessaire, hébergé dans l'Union européenne. L'employeur ne voit jamais le détail "
   "nominatif des dons personnels de ses salariés, et un salarié peut se retirer sans avoir à se "
   "justifier. La base légale est l'intérêt légitime, pas le consentement&nbsp;: nous n'affichons "
   "donc pas de case à cocher qui n'en serait pas une.</p>"
   "<p>Consulter une page publique de riseva.fr ne déclenche aucune requête vers un domaine "
   "extérieur, polices comprises. Un test de la recette échoue si ce n'est plus vrai.</p>"),
  ("Le classement, il sert à quoi&nbsp;?",
   "<p>À donner un rendez-vous que personne n'a besoin d'imposer. Il se joue entre entreprises, "
   "jamais entre salariés&nbsp;: personne n'est noté individuellement et une équipe qui passe son "
   "tour ne pénalise personne. La moitié basse n'est jamais nommée.</p>"
   "<p>Vous voyez votre score et votre rang dès trois entreprises inscrites dans votre catégorie. "
   "Le décile, lui, n'apparaît qu'à partir de <b>dix entreprises</b> dans la catégorie&nbsp;: un "
   "« top 10&nbsp;% » sur onze entreprises désigne la première et lui prête une avance qu'elle n'a "
   "pas.</p>"),
  ("Quel est le périmètre exact de la plateforme&nbsp;?",
   "<p>Riseva documente l'enregistrement administratif des associations avec la date du contrôle, "
   "les validations et qui les a faites, les méthodes de calcul publiées et refaisables à la main, "
   "les accès, les exports et les envois, ainsi que les engagements de service et ce qui se passe "
   "s'ils ne sont pas tenus.</p>"
   "<p>Elle ne se substitue pas aux métiers voisins&nbsp;: elle ne certifie pas un impact, ne "
   "produit pas de bilan carbone, n'attribue pas de note RSE parce qu'elle serait <b>juge et "
   "partie</b>, ne remplace pas votre expert-comptable sur la valorisation d'un don, et ne dépose "
   "aucune déclaration à votre place. Elle ne classe pas non plus vos sites sur leurs accidents du "
   "travail&nbsp;: un classement de ce genre pousse à <b>sous-déclarer</b>, et c'est l'inverse de "
   "ce qu'on cherche. Chacun de ces points est traité dans <a href='/reglement.html'>le "
   "règlement</a> et dans <a href='/engagements.html'>les engagements de service</a>.</p>"),
  ("Qu'est-ce qui reste à ma charge&nbsp;?",
   "<p>Ce qui n'est pas compris dans l'abonnement, écrit noir sur blanc&nbsp;:</p>"
   "<ul class='liste'>" + "".join(f"<li>{x}</li>" for x in TARIFS["exclus"]) + "</ul>"
   "<p>Le reste, c'est-à-dire les comptes, les rapports, les supports et l'accompagnement, est "
   "<a href='#prix'>dans la grille</a>.</p>"),
]

FAQ_ENT = f"""<section class="s" id="questions">
  <div class="wrap wrap-lecture">
  {entete("", "Ce que vous voudrez vérifier avant de signer.",
          "Les questions qui décident d'une signature, et nos réponses. Il en manque une&nbsp;? "
          "Écrivez-la à <a href='mailto:contact@riseva.fr'>contact@riseva.fr</a>&nbsp;: elle "
          "finira ici, avec sa réponse.")}
  {details(QUESTIONS_ENT)}
  </div>
</section>"""


FINAL_ENT = f"""<section class="s s-final" id="demarrer">
  <div class="wrap wrap-lecture">
  <h2>La saison commence quand l'outil marche chez vous.</h2>
  <p>Le démarrage se constate à la date convenue, sur cinq critères, ceux des
    <a href="/engagements.html">engagements de service</a>&nbsp;:</p>
  <ul class="liste criteres">
    <li>Votre espace est ouvert et le lien d'inscription fonctionne depuis un poste de votre
      réseau.</li>
    <li>Les comptes commandés sont disponibles, et le quota de chaque site est réparti.</li>
    <li>Les formats de votre contrat sont actifs.</li>
    <li>Des associations vérifiées et actives sont présentes autour de vos sites, et leur nombre
      vous est donné site par site.</li>
    <li>Un rapport est exportable, avec la méthode de calcul à côté de chaque chiffre.</li>
  </ul>
  <p>Vous avez quinze jours pour les constater. Si l'un manque et n'est pas levé dans les quinze
    jours suivants, l'acompte est remboursé intégralement et aucun solde n'est dû.</p>
  <ol class="etapes">
    <li><b>Aujourd'hui</b>, une préinscription&nbsp;: gratuite, sans carte, sans engagement.</li>
    <li><b>Ensuite, si vous signez</b>, un bon de commande et un acompte de
      {PCT(TARIFS['acompte_taux'])}, remboursé si la saison ne démarre pas chez vous.</li>
    <li><b>Puis le démarrage</b>, constaté sur les cinq critères, et la saison est ouverte.</li>
  </ol>
  <div class="cta">
    <a class="btn btn-lg" href="/inscription.html">Se préinscrire</a>
    <a class="btn btn-lg btn-2" href="{DEMO}">Ouvrir la démonstration</a>
  </div>
  <p class="mini">Tarif fondateur pour les {TARIFS['fondateur_places']} premières entreprises,
    jusqu'au 31 décembre 2026, sur la première saison seulement.</p>
  </div>
</section>"""


CORPS_ENT = "\n\n".join([HERO_ENT, MECANISME_ENT, OUTIL_ENT, EQUIPES_ENT, SAISON_ENT,
                         PRIX_ENT, FAQ_ENT, FINAL_ENT])

PIED_ENT = pied(
    "La plateforme RSE qui commence par les associations&nbsp;: vos équipes sur le terrain, et "
    "ce qui est confirmé dans votre rapport.",
    "/associations.html", "Vous êtes une association&nbsp;? La page qui vous est destinée.")


# ═══════════════════════════════════════════════════════════════════════════
#  SITE ASSOCIATIONS
# ═══════════════════════════════════════════════════════════════════════════

NAV_ASSO = nav(
    [("#comment", "Comment ça marche"), ("#controle", "Ce que vous gardez"),
     ("#argent", "Les dons"), ("#questions", "Questions")],
    "S'inscrire", "#commencer",
    "Entreprises", "/",
    "Gratuit, sans exclusivité, sans commission sur vos dons.")

HERO_ASSO = f"""<section class="hero hero-asso" id="hero">
  <div class="wrap">
    <div class="hero-txt">
      <p class="eyebrow">Gratuit. Ce sont les entreprises qui paient.</p>
      <h1>Écrivez ce qui vous manque.<br>Des entreprises d'à côté peuvent y répondre.</h1>
      <p class="lede">Des bras pour une demi-journée, du matériel dont une entreprise n'a plus
        l'usage, ou un don. Vous décidez de ce que vous acceptez, et c'est vous qui confirmez ce
        qui a eu lieu.</p>
      <div class="cta">
        <a class="btn btn-lg" href="#commencer">Écrire ce qui nous manque</a>
        <a class="btn btn-lg btn-2" href="#comment">Voir comment ça marche</a>
      </div>
      <p class="hero-note">Six modèles pour écrire votre première annonce, un courriel pour
        confirmer. Les salariés des entreprises abonnées à moins de trente kilomètres la voient
        comme ici, points compris&nbsp;: ils comptent pour leur entreprise, jamais pour vous.</p>
    </div>
    {capture("annonce-carte", "Une annonce telle qu'un salarié la voit : le nom de l'association, "
             "le format, l'objectif, la date, les places restantes, et le bouton Participer",
             T_CINQ, eager=True, classe="shot-carte", nature=True, mobile="annonce-carte-mobile")}
  </div>
</section>"""


def etapes_asso(items):
    """Trois étapes, chacune avec son écran, en lignes alternées.

    Le texte à gauche, l'écran à droite sur son tapis : un formulaire, une
    petite liste, une page gardent leur forme, et c'est la plaque qui donne à
    chaque ligne le même poids."""
    out = ""
    for n, (titre, texte, image, note) in enumerate(items, 1):
        bas = f'\n        <p class="moment-note">{note}</p>' if note else ""
        out += f"""
    <li class="etape">
      <div class="etape-txt">
        <p class="moment-n" aria-hidden="true">{n}</p>
        <h3>{titre}</h3>
        <p>{texte}</p>{bas}
      </div>
      {image}
    </li>"""
    return f"""<ol class="etapes-asso">{out}
  </ol>"""


COMMENT_ASSO = f"""<section class="s" id="comment">
  <div class="wrap">
  {entete("", "Publier, choisir, confirmer.",
          "Les écrans viennent du jeu de démonstration&nbsp;: l'interface est réelle, les noms et "
          "les chiffres sont fictifs.")}
  {etapes_asso([
    ("Vous publiez",
     "Six modèles déjà écrits&nbsp;: des bras un samedi, une journée entière, une compétence, du "
     "matériel, un parrainage, un coup de main financier. Vous changez la date et le nombre de "
     "places. Rien ne part tant que vous n'avez pas relu.",
     capture("annonce-formulaire", "Le formulaire de publication d'une annonce, avec ses six "
             "modèles et le choix du format", T_SEPT, tapis=True,
             mobile="annonce-formulaire-mobile"), ""),
    ("Des salariés se proposent",
     "Les salariés des entreprises abonnées autour de vous voient l'annonce et se proposent sur "
     "une date. Vous voyez qui vient. Vous acceptez ou vous refusez, sans vous justifier.",
     capture("qui-vient", "La liste de qui vient : le salarié, son entreprise, la mission et la "
             "date", T_SEPT, tapis=True, densite=3), ""),
    ("Vous confirmez",
     "Après la mission, vous recevez un courriel. Une question, trois réponses, dont « réalisée "
     "partiellement » avec le chiffre réel. Rien à ressaisir dans votre espace, aucun rapport à "
     "écrire.",
     capture("confirmation", "La page qu'ouvre le courriel de confirmation : une question, trois "
             "réponses", T_SEPT, tapis=True, mobile="confirmation-mobile"),
     "Sans réponse de votre part sous quatorze jours, la mission est <b>clôturée automatiquement "
     "sans confirmation</b>&nbsp;: l'entreprise marque ses points, mais le résultat reste écrit "
     "comme estimé partout où il apparaît. Ce n'est pas une faute, et vous pouvez répondre plus "
     "tard."),
  ])}
  <div class="cta cta-centre">
    <a class="btn btn-lg" href="#commencer">Écrire ce qui nous manque</a>
  </div>
  </div>
</section>"""


CONTROLE_ASSO = f"""<section class="s s-sunk" id="controle">
  <div class="wrap">
  {entete("", "Vous gardez la main, du début à la fin.")}
  <div class="controle">
    <ul class="liste liste-grande">
      <li>Vous choisissez le besoin, la date et le nombre de places.</li>
      <li>Vous acceptez ou refusez une proposition d'un clic, sans avoir à vous justifier.</li>
      <li>Vous modifiez ou retirez une annonce quand vous voulez.</li>
      <li>Vous ne confirmez que ce qui a eu lieu, et un silence n'est jamais une faute.</li>
      <li>Vous partez quand vous voulez, avec vos données, exportées dans un format lisible.</li>
      <li>Aucune exclusivité, aucune contrepartie, aucun logo à afficher.</li>
    </ul>
    <div class="assure">
      <h3>Qui est assuré&nbsp;?</h3>
      <p>Sur son temps de travail, le salarié reste salarié de son entreprise&nbsp;: un accident
        chez vous relève du régime d'accident du travail de son employeur. Hors temps de travail,
        c'est un bénévole, et la couverture dépend de votre contrat&nbsp;: votre responsabilité
        civile couvre en général ce qu'il cause à autrui, pas forcément ce qu'il subit.</p>
      <p><a href="/charte-associations.html">La charte</a> détaille qui couvre quoi. L'annonce
        doit dire ce qui est couvert&nbsp;: un bénévole a le droit de le savoir avant de venir.</p>
    </div>
  </div>
  </div>
</section>"""


POURQUOI_ASSO = f"""<section class="s" id="pourquoi">
  <div class="wrap">
  {entete("Pourquoi elles viennent", "Ce qu'une entreprise vient chercher ici.")}
  <div class="pourquoi">
    <p>Une entreprise paie un abonnement à Riseva pour que ses salariés trouvent une action
      concrète près de leur lieu de travail, pour tenir ses indicateurs sociaux, et pour
      retrouver ce que ses équipes ont fait dans le bilan qu'elle publie en fin d'année. Le
      mécénat de compétences et le don en nature peuvent lui ouvrir une réduction d'impôt, selon
      la nature du don et de l'organisme (article 238 bis du code général des impôts).</p>
    <p>Chaque mission confirmée lui rapporte des points, dans un classement entre entreprises
      comparables. Les associations n'y sont jamais classées.</p>
    <p class="pourquoi-cle">Elle paie pour vous trouver, pas l'inverse.</p>
    <h3>Ce que ça vous laisse</h3>
    <p>Chaque mission confirmée reste dans votre espace, datée. La liste de ce que vous avez
      confirmé, mission par mission, s'exporte en tableur&nbsp;: pour votre conseil
      d'administration, pour un financeur, pour une demande de subvention.</p>
    {capture("export-ca", "La carte Pour votre conseil d'administration : les résultats "
             "confirmés, mission par mission, exportables en tableur",
             "(max-width: 900px) 92vw, 720px", tapis=True, densite=3)}
  </div>
  </div>
</section>"""


ARGENT_ASSO = f"""<section class="s" id="argent">
  <div class="wrap">
  <div class="carte-sombre grain carte-sombre-txt">
    <div>
      <p class="eyebrow">Les dons</p>
      <h2>L'argent ne passe jamais par Riseva.</h2>
    </div>
    <div class="argent-cols">
      <div>
        <h3>Deux chemins, aucun ne passe par nous</h3>
        <p>Soit un virement du donateur sur votre compte, avec une référence à retrouver sur
          votre relevé. Soit votre propre page HelloAsso, dont vous collez l'adresse&nbsp;: le
          donateur paie par carte chez HelloAsso, et l'argent arrive chez vous. Aucune commission,
          aucun délai de reversement, aucun plafond de notre part. Riseva n'encaisse rien.</p>
      </div>
      <div>
        <h3>Les reçus fiscaux restent les vôtres</h3>
        <p>Vous les émettez, comme aujourd'hui, et vous appréciez votre éligibilité. Si vous nous
          en donnez mandat par écrit, nous préparons le document à partir de vos informations et
          vous le relisez avant de le signer. Sans mandat, nous ne préparons rien. Le mandat se
          révoque quand vous voulez.</p>
        <p><a href="/charte-associations.html">La charte des associations</a></p>
      </div>
    </div>
  </div>
  </div>
</section>"""


QUESTIONS_ASSO = [
  ("Et si personne ne vient&nbsp;?",
   "<p>Ça peut arriver, surtout la première saison&nbsp;: Riseva démarre et les entreprises "
   "abonnées ne couvrent pas encore tout le territoire. Votre annonce reste publiée, et votre "
   "tableau de bord indique combien d'entreprises abonnées ont un site à moins de trente "
   "kilomètres de chez vous, y compris zéro.</p>"
   + capture("autour", "La carte Qui peut venir chez vous, telle que le tableau de bord d'une "
             "association l'affiche quand aucune entreprise abonnée n'a de site à moins de trente "
             "kilomètres", "(max-width: 900px) 92vw, 640px", classe="shot-qa",
             mobile="autour-mobile")),
  ("C'est vraiment gratuit&nbsp;?",
   "<p>Oui. Les associations ne paient rien, ni abonnement, ni commission sur les dons, ni frais "
   "de dossier. Ce sont les entreprises qui paient l'abonnement, et c'est le seul revenu de "
   "Riseva.</p>"),
  ("Combien de temps ça me prend&nbsp;?",
   "<p>Le temps d'écrire une annonce à partir d'un des six modèles, puis un courriel pour "
   "confirmer après la mission. La première mise en ligne attend que nous ayons vérifié votre "
   "enregistrement administratif&nbsp;; ensuite, vous publiez quand vous voulez. Il n'y a pas de "
   "tableau de bord à surveiller, pas de fichier à tenir, pas de rapport à produire pour "
   "l'entreprise.</p>"
   "<p>Si écrire l'annonce vous rebute, le formulaire propose les formats les plus demandés et "
   "vous n'avez qu'à changer la date et le nombre de places. Rien n'est publié tant que vous "
   "n'avez pas relu.</p>"),
  ("Est-ce que je peux refuser quelqu'un&nbsp;?",
   "<p>Oui, sans avoir à vous justifier. Vous fixez le nombre de places, les dates, ce que vous "
   "acceptez et ce que vous n'acceptez pas. Une proposition peut être déclinée d'un clic.</p>"),
  ("Et si je ne réponds pas à temps&nbsp;?",
   "<p>Rien de grave. Sans réponse de votre part sous quatorze jours, la mission est "
   "<b>clôturée automatiquement sans confirmation</b>&nbsp;: l'entreprise marque ses points, mais "
   "le résultat reste écrit comme estimé partout où il apparaît. Ce n'est pas une faute, ça "
   "n'entraîne aucune suspension, et vous pouvez répondre plus tard.</p>"),
  ("Qui est assuré&nbsp;?",
   "<p>Sur son temps de travail, le salarié reste couvert par le régime d'accident du travail de "
   "son employeur. Hors temps de travail, il est bénévole et la couverture dépend de votre "
   "contrat&nbsp;: la responsabilité civile de l'association couvre en général ce qu'il cause, pas "
   "forcément ce qu'il subit. <a href='/charte-associations.html'>La charte</a> détaille qui "
   "couvre quoi, et l'annonce doit dire ce qui est couvert.</p>"),
  ("Qui peut s'inscrire&nbsp;?",
   "<p>Toute association déclarée, y compris de droit local d'Alsace-Moselle. Un numéro, RNA ou "
   "SIREN, accélère la vérification sans être obligatoire&nbsp;: beaucoup d'associations déclarées "
   "n'ont pas de SIREN. Nous vérifions l'enregistrement administratif avant de publier votre page, "
   "et nous vous disons ce qui manque le cas échéant.</p>"
   "<p>Pour les dons ouvrant droit à un reçu fiscal, c'est vous qui appréciez votre éligibilité "
   "au titre de l'article 200 ou 238 bis du CGI, comme aujourd'hui. "
   "<a href='/charte-associations.html'>La charte</a> détaille ce point.</p>"),
  ("Qu'est-ce que vous faites de nos données&nbsp;?",
   "<p>Votre page publique contient ce que vous y mettez, rien d'autre. Nous ne revendons aucune "
   "donnée, nous n'envoyons pas les coordonnées de vos bénévoles aux entreprises, et vous pouvez "
   "fermer votre compte quand vous voulez. <a href='/confidentialite.html'>Le détail est "
   "ici</a>.</p>"),
]

FAQ_ASSO = f"""<section class="s" id="questions">
  <div class="wrap wrap-lecture">
  {entete("", "Ce que vous voudrez vérifier avant de vous inscrire.",
          "Les questions qu'une association se pose avant de publier une première annonce, et nos "
          "réponses. Il en manque une&nbsp;? Écrivez-la à "
          "<a href='mailto:contact@riseva.fr'>contact@riseva.fr</a>&nbsp;: elle finira ici, avec "
          "sa réponse.")}
  {details(QUESTIONS_ASSO)}
  </div>
</section>"""


def trou(cle, label, placeholder, suite, type_="text", autocomplete=None):
    """Un champ dans la phrase, et la ponctuation qui le suit.

    La ponctuation est DANS le bloc du champ : un champ est un objet insécable
    pour le navigateur, qui s'autorise un retour à la ligne juste après lui,
    et une phrase qui commence par une virgule ou un point n'est plus une
    phrase. Sous 640 px, les fragments de phrase disparaissent et le libellé du
    champ devient visible : la phrase redevient un formulaire."""
    ac = f' autocomplete="{autocomplete}"' if autocomplete else ""
    return (f'<span class="blank"><label class="sr-only" for="fa-{cle}">{label}</label>'
            f'<input id="fa-{cle}" class="bk" type="{type_}" name="{cle}" data-key="{cle}" '
            f'data-label="{label[0].lower() + label[1:]}" placeholder="{placeholder}" '
            f'spellcheck="false"{ac} required><span class="ghost" aria-hidden="true"></span>'
            f'<span class="j-frag">{suite}</span></span>')


COMMENCER_ASSO = f"""<section class="s s-sunk" id="commencer">
  <div class="wrap">
  {entete("", "Quatre lignes, un lien, et votre espace est ouvert.",
          "Pas de dossier à monter, pas de pièce à joindre. Vous entrez quatre informations, vous "
          "ouvrez le lien qu'on vous envoie, et votre espace est là. Après vérification de votre "
          "enregistrement, vous publiez votre première annonce.")}
  <form id="formAsso" class="join" novalidate>
    <div class="join-txt">
      <p class="j-sentence"><span class="j-frag">Nous sommes </span>{trou("asso", "Le nom de votre association", "votre association", ",", autocomplete="organization")}<span class="j-frag"> à </span>{trou("ville", "Votre ville", "votre ville", ".", autocomplete="address-level2")}<span class="j-frag"> Ce qui nous manque le plus en ce moment, c'est </span>{trou("mot", "Ce qui vous manque", "des bras un samedi matin", ".")}<span class="j-frag"> Notre adresse est </span>{trou("mail", "Votre adresse e-mail", "nom@association.fr", ".", "email", "email")}</p>
      <p class="j-hint" id="jHint">Nous vous envoyons un lien de connexion&nbsp;: en l'ouvrant, votre
        espace se crée avec ce que vous venez d'écrire. Aucun mot de passe.</p>
      <div class="j-cta">
        <button type="submit" class="btn btn-lg">Ouvrir notre espace</button>
        <span class="mini">Gratuit, sans exclusivité, sans commission.</span>
      </div>
      <p class="j-msg" id="jMsg" role="status" aria-live="polite"></p>
    </div>
  </form>
  <p class="s-lancement">Première saison en janvier 2027. Vous rejoignez un réseau qui se
    constitue&nbsp;: votre tableau de bord vous dira combien d'entreprises abonnées ont un site à
    moins de trente kilomètres de chez vous, et il écrira zéro si c'est zéro.</p>
  </div>
</section>"""


CORPS_ASSO = "\n\n".join([HERO_ASSO, COMMENT_ASSO, CONTROLE_ASSO, POURQUOI_ASSO, ARGENT_ASSO,
                          FAQ_ASSO, COMMENCER_ASSO])

PIED_ASSO = pied(
    "Gratuit pour les associations, sans exclusivité et sans commission&nbsp;: vous publiez ce "
    "qui vous manque, et c'est vous qui confirmez ce qui a eu lieu.",
    "/", "Vous êtes une entreprise&nbsp;? La plateforme, le tarif et la démonstration.")


# ── les données structurées ─────────────────────────────────────────────────
# Rien d'inventé : pas de note, pas d'avis, pas d'effectif, pas de date de
# fondation. Les questions de la FAQ sont générées depuis la même liste que la
# page affiche, donc elles ne peuvent pas s'en écarter.
def sans_balises(html):
    txt = re.sub(r"<[^>]+>", " ", html)
    txt = (txt.replace("&nbsp;", " ").replace("&amp;", "&")
              .replace("&lt;", "<").replace("&gt;", ">").replace("&#39;", "'"))
    return re.sub(r"\s+", " ", txt).strip()


def donnees_structurees(questions=None):
    orga = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Riseva",
        "url": "https://riseva.fr/",
        "logo": "https://riseva.fr/brand/riseva-full.png",
        "description": ("Plateforme RSE française pour entreprises multi-sites : missions auprès "
                        "d'associations vérifiées près de chaque site, confirmées par "
                        "l'association, indicateurs sociaux et sécurité, rapports trimestriels "
                        "et annuel."),
        "areaServed": "FR",
        "contactPoint": [{"@type": "ContactPoint", "contactType": "sales",
                          "email": "contact@riseva.fr", "availableLanguage": ["fr"]}],
    }
    blocs = [orga]
    if questions:
        blocs.append({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [{"@type": "Question", "name": sans_balises(q),
                            "acceptedAnswer": {"@type": "Answer", "text": sans_balises(r)}}
                           for q, r in questions],
        })
    return "".join('<script type="application/ld+json">'
                   + json.dumps(b, ensure_ascii=False, separators=(",", ":"))
                   + "</script>\n" for b in blocs)


def main():
    a = page(fichier="index.html", canonique="/",
             titre="Riseva, la plateforme RSE qui commence par les associations",
             description="Vos sites dans un seul rapport RSE, vos équipes chez des associations "
                         "à moins de trente kilomètres. Seul ce que l'association confirme "
                         "entre dans le rapport.",
             entetes_sup=donnees_structurees(QUESTIONS_ENT),
             corps=CORPS_ENT, nav_html=NAV_ENT, pied_html=PIED_ENT, classe_corps="page-ent")
    b = page(fichier="associations.html", canonique="/associations.html",
             titre="Riseva, pour les associations",
             description="Écrivez ce qui vous manque : des salariés d'entreprises abonnées à moins "
                         "de trente kilomètres peuvent y répondre. Gratuit, sans exclusivité, sans "
                         "commission.",
             entetes_sup=donnees_structurees(QUESTIONS_ASSO),
             corps=CORPS_ASSO, nav_html=NAV_ASSO, pied_html=PIED_ASSO, classe_corps="page-asso")
    for f in (a, b):
        print("écrit", f, f"{(PUBLIC / f).stat().st_size // 1024} Ko")


if __name__ == "__main__":
    main()
