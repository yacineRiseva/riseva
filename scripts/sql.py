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
            "03_rls.sql", "04_seed.sql", "05_taches.sql",
            # Engendré par scripts/catalogue.mjs depuis public/app/data.js :
            # les rubriques et les clés d'indicateurs, identiques des deux côtés
            # parce qu'un seul des deux est écrit à la main.
            "06_catalogue.sql", "07_ecritures.sql"]

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

# Ce que Supabase fournit déjà : les trois rôles PostgREST, le schéma `auth`,
# `auth.users` et `auth.uid()`. Tout le reste doit venir de 01 → 05, sans
# `00_local.sql` qui n'est jamais déployé. Le rôle `riseva_definer`, lui, y
# vivait — et son absence en production laissait soixante fonctions privilégiées
# appartenir au superutilisateur. Cette passe le vérifie à chaque recette.
AMORCE_SUPABASE = """
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin noinherit bypassrls; end if;
end $$;
grant anon, authenticated, service_role to current_user;
create schema if not exists extensions;
create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;
create table if not exists auth.users (id uuid primary key, email text);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
"""

def installation_production():
    """Rejoue le chemin réel : ce que Supabase donne, puis 01 → 05, rien d'autre."""
    print("\nInstallation sans le bac à sable local")
    base = "riseva_prod"
    subprocess.run(["su", "postgres", "-c", f"dropdb --if-exists {base}"], capture_output=True)
    subprocess.run(["su", "postgres", "-c", f"createdb {base}"], capture_output=True)
    r = psql("-f -", entree=AMORCE_SUPABASE, base=base)
    if r.returncode:
        print("  ÉCHEC amorce"); print("      " + r.stderr.strip()[:300]); return False
    for nom in [f for f in FICHIERS if f != "00_local.sql"]:
        chemin = RACINE / "supabase" / nom
        if not chemin.exists():
            continue
        r = psql("-f -", entree=chemin.read_text(encoding="utf-8"), base=base)
        if r.returncode:
            print(f"  ÉCHEC {nom}")
            for l in r.stderr.strip().splitlines()[:6]:
                print("      " + l)
            return False
        print(f"  ok   {nom}")
    r = psql("-t -A -f -", base=base, entree=
        "select count(*) from pg_proc p "
        "join pg_namespace n on n.oid = p.pronamespace "
        "join pg_roles ro on ro.oid = p.proowner "
        "where n.nspname in ('public','private') and p.prosecdef "
        "and ro.rolname <> 'riseva_definer';")
    mal = (r.stdout or "").strip()
    ok = mal == "0"
    print(("  ok   " if ok else "  RATÉ ")
          + "aucune fonction privilégiée ne reste au superutilisateur"
          + ("" if ok else f"  [{mal}]"))
    return ok

def main():
    print("Installation à blanc")
    recreer()
    for f in FICHIERS:
        if not jouer(f):
            sys.exit(1)
    if not installation_production():
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
