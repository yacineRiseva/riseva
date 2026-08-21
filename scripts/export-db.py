#!/usr/bin/env python3
"""Exporte la base de recette en JSON, pour prouver que la couche Postgres traduit
bien les lignes réelles — pas des lignes qu'on aurait écrites soi-même à la main.

    python3 scripts/export-db.py > /tmp/riseva-db.json
"""
import json, subprocess, sys

TABLES = ["saison", "bareme", "entreprise", "groupe", "etablissement", "association",
          "annonce", "mission", "profil", "invitation", "campagne_indicateurs",
          "observation_indicateur", "acces", "signalement"]

def lire(table):
    sql = f"select coalesce(json_agg(t), '[]') from public.{table} t;"
    r = subprocess.run(
        ["su", "postgres", "-c", f"psql -tAq -d riseva_test -c \"{sql}\""],
        capture_output=True, text=True)
    if r.returncode:
        print(r.stderr, file=sys.stderr); sys.exit(1)
    return json.loads(r.stdout.strip() or "[]")

print(json.dumps({t: lire(t) for t in TABLES}, ensure_ascii=False))
