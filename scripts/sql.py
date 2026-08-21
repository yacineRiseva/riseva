#!/usr/bin/env python3
"""Rejoue toutes les migrations sur une base vierge, puis les tests SQL.

L'audit demandait une installation à blanc vérifiable : la voici. Une migration
qui ne passe pas ici ne part pas chez Supabase.

    python3 scripts/sql.py            # installe et teste
    python3 scripts/sql.py --schema   # installe seulement
"""
import subprocess, sys, pathlib, os

BASE = "riseva_test"
RACINE = pathlib.Path(__file__).resolve().parent.parent
FICHIERS = ["00_local.sql", "01_schema.sql", "02_logique.sql",
            "03_rls.sql", "04_seed.sql", "05_taches.sql"]

def psql(args, entree=None, base=BASE):
    return subprocess.run(
        ["su", "postgres", "-c", f"psql -v ON_ERROR_STOP=1 -q -d {base} " + args],
        input=entree, capture_output=True, text=True)

def recreer():
    subprocess.run(["su", "postgres", "-c", f"dropdb --if-exists {BASE}"],
                   capture_output=True, text=True)
    r = subprocess.run(["su", "postgres", "-c", f"createdb {BASE}"],
                       capture_output=True, text=True)
    if r.returncode:
        print(r.stderr); sys.exit(1)

def jouer(nom):
    chemin = RACINE / "supabase" / nom
    if not chemin.exists():
        print(f"  — {nom} absent, ignoré"); return True
    # On passe par l'entrée standard : postgres n'a pas à lire /root.
    r = psql("-f -", entree=chemin.read_text(encoding="utf-8"))
    if r.returncode:
        print(f"  ÉCHEC {nom}")
        for ligne in r.stderr.strip().splitlines()[:12]:
            print("      " + ligne)
        return False
    print(f"  ok   {nom}")
    return True

def main():
    print("Installation à blanc")
    recreer()
    for f in FICHIERS:
        if not jouer(f):
            sys.exit(1)
    if "--schema" in sys.argv:
        return
    tests = RACINE / "supabase" / "tests.sql"
    if tests.exists():
        print("\nTests SQL")
        # Les assertions passent par RAISE NOTICE, donc par la sortie d'erreur.
        r = psql("-o /dev/null -f -", entree=tests.read_text(encoding="utf-8"))
        for ligne in r.stderr.splitlines():
            print(ligne.replace("psql:<stdin>:", "").replace("NOTICE:  ", ""))
        if r.returncode:
            sys.exit(1)

main()
