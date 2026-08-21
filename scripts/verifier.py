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
    for f in ["public/app/data.js", "public/app/ui.js", "public/app/app.js"]:
        code, sortie = lancer(f"node --check {f}")
        print(("  ok   " if code == 0 else "  RATÉ ") + f)
        if code: echecs.append(f); print(sortie.strip()[:400])

    titre("Base de données")
    code, sortie = lancer("service postgresql status")
    if "down" in sortie:
        lancer("service postgresql start"); time.sleep(3)
    code, sortie = lancer("python3 scripts/sql.py")
    print(sortie.rstrip())
    if code: echecs.append("SQL")

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
