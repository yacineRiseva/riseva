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
    for f in ["data.js", "ui.js", "app.js"]:
        shutil.copy(RACINE / "public" / "app" / f, pathlib.Path(tmp) / f)
    for f in ["data.js", "ui.js", "app.js"]:
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
