-- Riseva — bac à sable local
-- ---------------------------------------------------------------------------
-- Ce fichier n'est JAMAIS déployé sur Supabase : il recrée en local le peu de
-- Supabase dont les migrations dépendent — le schéma `auth`, la table
-- `auth.users`, la fonction `auth.uid()` et les trois rôles PostgREST — pour
-- qu'on puisse rejouer 01 → 05 sur une base vierge et voir échouer ce qui
-- échoue, ici, avant le client. Sur Supabase, ces objets existent déjà.
-- ---------------------------------------------------------------------------

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
  -- `riseva_definer` est créé par 01_schema.sql, qui s'exécute APRÈS ce fichier.
  -- Sur une base neuve, le grant plus bas tombait donc sur un rôle inexistant et
  -- toute l'installation s'arrêtait là. Le bug ne se voyait que sur un serveur
  -- vierge : sur une machine où le rôle traînait d'une installation précédente,
  -- tout passait. C'est précisément le genre de panne qu'on découvre le jour du
  -- déploiement, et jamais avant.
  if not exists (select 1 from pg_roles where rolname = 'riseva_definer') then
    create role riseva_definer nologin noinherit;
  end if;
end $$;

grant anon, authenticated, service_role, riseva_definer to current_user;

create schema if not exists extensions;
grant usage on schema extensions to anon, authenticated, service_role, riseva_definer;

create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role, riseva_definer;

create table if not exists auth.users (
  id    uuid primary key default gen_random_uuid(),
  email text unique
);

-- En local, l'utilisateur courant est porté par un réglage de session.
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create or replace function auth.email() returns text
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.email', true), '')
$$;
