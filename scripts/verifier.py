#!/usr/bin/env python3
"""Tout vérifier, dans l'ordre où ça compte.

    python3 scripts/verifier.py

1. La syntaxe des modules.
2. Le dos : installation à blanc de la base, puis les tests de sécurité SQL.
3. Le devant : le parcours complet dans un vrai navigateur.
4. Le contraste réel de chaque texte affiché.

Ce script est le contrat : ce qui passe ici peut partir, le reste non.
"""
import subprocess, sys, pathlib, os, time, signal

RACINE = pathlib.Path(__file__).resolve().parent.parent
PORT = 8080

def titre(t):
    print("\n" + t)
    print("-" * len(t))

def lancer(cmd, cwd=RACINE):
    r = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
    return r.returncode, (r.stdout + r.stderr)

def main():
    echecs = []

    titre("Syntaxe des modules")
    # `node --check` ne voit pas tout : un littéral gabarit mal fermé passe la
    # vérification et casse à l'exécution. On importe réellement les modules.
    import shutil, tempfile
    tmp = tempfile.mkdtemp()
    MODULES = ["qr.js", "tableur.js", "data.js", "ui.js", "app.js"]
    for f in MODULES:
        shutil.copy(RACINE / "public" / "app" / f, pathlib.Path(tmp) / f)
    for f in MODULES:
        code, sortie = lancer(
            "node --input-type=module -e "
            f"\"import('file://{tmp}/{f}').then(()=>0).catch(e=>{{"
            "if(/SyntaxError|missing|Unexpected/.test(e.message)){console.error(e.message);process.exit(1)}"
            "})\"")
        ok = code == 0
        print(("  ok   " if ok else "  RATÉ ") + f)
        if not ok: echecs.append(f); print("      " + sortie.strip()[:400])
    shutil.rmtree(tmp, ignore_errors=True)

    titre("Polices")
    # Rien ici ne fait échouer la recette : le site reste lisible avec la pile système.
    # Mais il faut que ce soit dit fort, parce qu'un déploiement sans les fichiers est
    # un déploiement au mauvais rendu, et ça ne se voit pas dans les tests.
    manquantes = [n for n in ("bricolage-grotesque", "instrument-sans", "fraunces",
                              "ibm-plex-mono", "inter")
                  if not (RACINE / "public" / "brand" / "polices" / f"{n}.woff2").exists()]
    if manquantes:
        print("  À FAIRE  " + ", ".join(f"{n}.woff2" for n in manquantes) + " manquent.")
        print("           Lancer ./scripts/polices.sh depuis un poste connecté, puis")
        print("           versionner les fichiers. En attendant, la pile système prend")
        print("           le relais : aucune requête externe, mais le rendu n'est pas celui prévu.")
    else:
        print("  ok   les cinq polices sont servies par Riseva")

    titre("Codes QR")
    # L'affiche porte un code QR fabriqué ici, sans rien appeler dehors. Un
    # encodeur écrit à la main produit très facilement un carré parfaitement
    # crédible que personne ne lit : le seul test qui vaut est un aller-retour,
    # avec un décodeur qui n'est pas le nôtre.
    code, sortie = lancer("python3 scripts/test_qr.py")
    print(sortie.strip())
    if code:
        echecs.append("codes QR")

    titre("Classeur")
    # Un `.xlsx` écrit à la main produit très facilement une archive crédible
    # qu'Excel ouvre vide, sans un mot d'explication. On le relit donc avec un
    # lecteur qui n'est pas le nôtre.
    code, sortie = lancer("python3 scripts/test_tableur.py")
    print(sortie.strip())
    if code:
        echecs.append("classeur")

    titre("Catalogue")
    # Le catalogue SQL est engendré depuis `public/app/data.js`. S'il a été
    # modifié à la main, ou si un indicateur a été ajouté sans relancer le
    # script, les deux côtés divergent — et le symptôme, plus tard, est une clé
    # qui existe d'un seul côté, donc une colonne vide que personne ne sait
    # expliquer. On régénère et on compare.
    avant = (RACINE / "supabase" / "06_catalogue.sql").read_text(encoding="utf-8") \
        if (RACINE / "supabase" / "06_catalogue.sql").exists() else ""
    code, sortie = lancer("node scripts/catalogue.mjs")
    apres = (RACINE / "supabase" / "06_catalogue.sql").read_text(encoding="utf-8")
    if code:
        print("  RATÉ le catalogue n'a pas pu être engendré")
        print("      " + sortie.strip()[:400]); echecs.append("catalogue")
    elif avant != apres:
        print("  RATÉ 06_catalogue.sql ne correspondait plus à data.js")
        print("       il vient d'être régénéré : relisez la différence et versionnez-la")
        echecs.append("catalogue")
    else:
        print("  ok   " + sortie.strip())

    titre("Base de données")
    code, sortie = lancer("service postgresql status")
    if "down" in sortie:
        lancer("service postgresql start"); time.sleep(3)
    code, sortie = lancer("python3 scripts/sql.py")
    print(sortie.rstrip())
    if code: echecs.append("SQL")

    titre("Postgres vers le moteur")
    # Le chemin de production : les vraies lignes de la base traversent la couche
    # de traduction, et le moteur dérive dessus. Sans ce test, « la couche existe »
    # ne voulait rien dire.
    code, sortie = lancer("python3 scripts/export-db.py > /tmp/riseva-db.json")
    if code:
        print("  RATÉ export de la base"); print("      " + sortie.strip()[:300])
        echecs.append("export")
    else:
        code, sortie = lancer("node scripts/postgres-vers-moteur.mjs")
        print(sortie.rstrip())
        if code: echecs.append("traduction")

    titre("Serveur de test")
    srv = subprocess.Popen(
        ["python3", "-m", "http.server", str(PORT), "--directory", str(RACINE / "public")],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    time.sleep(2)
    try:
        titre("Parcours navigateur")
        code, sortie = lancer("python3 scripts/tests.py")
        print("\n".join(l for l in sortie.splitlines() if "ok " not in l).rstrip()
              or sortie.splitlines()[-1])
        if code: echecs.append("parcours"); print(sortie[-1500:])

        titre("Le premier jour, sur une base vide")
        # Le jeu de demonstration montre le produit plein. Un client ne verra
        # jamais cela le jour de son ouverture : ce parcours-la se verifie a
        # part, ecran par ecran, role par role, et jusqu'au premier rapport.
        code, sortie = lancer("python3 scripts/vierge.py")
        print("\n".join(l for l in sortie.splitlines() if not l.startswith("  ok ")).rstrip())
        if code: echecs.append("premier jour"); print(sortie[-1500:])

        titre("Ce qui s'affiche doit pouvoir se taper")
        # Un tiret cadratin, une apostrophe courbe ou une espace fine insécable
        # ne sont sur aucun clavier français. Ils signent la machine, ils
        # deviennent des losanges dans un courriel, et ils empêchent de
        # retrouver un mot dans la page qui l'affiche.
        code, sortie = lancer("python3 scripts/clavier.py --strict")
        print(sortie.rstrip())
        if code: echecs.append("caractères hors clavier")

        titre("Contraste")
        code, sortie = lancer("python3 scripts/contraste.py")
        print(sortie.rstrip())
        if code: echecs.append("contraste")
    finally:
        os.killpg(os.getpgid(srv.pid), signal.SIGTERM)

    print()
    if echecs:
        print("À reprendre : " + ", ".join(echecs)); sys.exit(1)
    print("Tout est vert, de la base au pixel.")

main()
