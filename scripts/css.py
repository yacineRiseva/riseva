#!/usr/bin/env python3
"""La feuille servie, sans les commentaires qui expliquent pourquoi.

    python3 scripts/css.py            # ecrit public/styles/vitrine.min.css
    python3 scripts/css.py --verifie  # sort en erreur si le fichier est perime

Pourquoi. `public/styles/vitrine.css` fait 206 Ko, dont 42 % de commentaires :
ce sont eux qui gardent la memoire de chaque decision, et ils doivent rester
dans la source. Mais ils partent aussi chez le visiteur, sur la ressource qui
bloque le premier rendu. Compresses, 52 Ko avec, 23 Ko sans : la moitie du
poids de la feuille sert a expliquer la feuille a quelqu'un qui ne la lira
jamais.

Ce que fait ce script, et rien d'autre : retirer les commentaires, les lignes
vides et l'indentation. Aucune regle n'est fusionnee, aucune propriete n'est
reordonnee, aucune couleur n'est reecrite. Un minifieur qui reecrit peut se
tromper ; celui-ci ne peut se tromper que d'une facon, et la recette la
mesure : elle compare le style calcule de CHAQUE element des pages publiques
entre la feuille source et la feuille servie. Byte different, pixel identique.

Le decoupage est fait par un automate a trois etats, pas par une expression
reguliere : voir alleger(). Une valeur comme content:"/*" n'ouvre donc pas un
commentaire, et une apostrophe francaise dans un commentaire n'ouvre pas une
chaine.
"""
import pathlib, re, sys

RACINE = pathlib.Path(__file__).resolve().parent.parent
SOURCE = RACINE / "public" / "styles" / "vitrine.css"
SERVIE = RACINE / "public" / "styles" / "vitrine.min.css"

ENTETE = ("/* Engendre par scripts/css.py a partir de vitrine.css.\n"
          "   Ne pas modifier ici : les corrections vont dans vitrine.css. */\n")


def alleger(css):
    """Un seul passage, caractere par caractere.

    Premiere version : proteger les chaines avec une expression reguliere, puis
    retirer les commentaires. Elle a mange le `:root{` du fichier et rendu la
    page en Times New Roman. La raison est que les commentaires sont ecrits en
    francais : la premiere apostrophe de « l'ecran » ouvrait une fausse chaine
    qui courait jusqu'a l'apostrophe suivante, plusieurs regles plus loin, en
    avalant au passage la fin du commentaire et le debut du CSS.

    On ne peut pas decider d'une apostrophe sans savoir si on est deja dans un
    commentaire, et une expression reguliere ne sait pas ou elle est. Un
    automate, si : il lit une fois, de gauche a droite, et a chaque caractere il
    sait dans lequel des trois etats il se trouve.
    """
    out = []
    i, n = 0, len(css)
    while i < n:
        c = css[i]
        if c == "/" and css.startswith("/*", i):
            j = css.find("*/", i + 2)
            i = n if j < 0 else j + 2
            continue
        if c in "\"'":
            j = i + 1
            while j < n:
                if css[j] == "\\":
                    j += 2
                    continue
                if css[j] == c:
                    j += 1
                    break
                j += 1
            out.append(css[i:j])
            i = j
            continue
        out.append(c)
        i += 1
    css = "".join(out)
    css = "\n".join(l.strip() for l in css.split("\n"))
    css = re.sub(r"\n{2,}", "\n", css).strip() + "\n"
    return css


def main():
    source = SOURCE.read_text(encoding="utf-8")
    attendu = ENTETE + alleger(source)
    if "--verifie" in sys.argv:
        actuel = SERVIE.read_text(encoding="utf-8") if SERVIE.exists() else ""
        if actuel != attendu:
            print("vitrine.min.css est perime : relancer python3 scripts/css.py")
            return 1
        print("vitrine.min.css est a jour.")
        return 0
    SERVIE.write_text(attendu, encoding="utf-8")
    a, b = len(source.encode()), len(attendu.encode())
    print(f"vitrine.min.css  {b // 1024} Ko, contre {a // 1024} Ko  "
          f"({100 - 100 * b // a} % de moins)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
