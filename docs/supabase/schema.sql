-- MIMOUNI INDUSTRIEL ÉLECTRICITÉ — schéma Supabase (PostgreSQL).
-- Une seule table : le stockage objet de l'application (une ligne par clé).
-- À exécuter une fois dans l'éditeur SQL du projet Supabase.

create table if not exists public.kv (
  key        text primary key,
  doc        jsonb,
  txt        text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kv_one_value check (doc is null or txt is null)
);

-- Listage par préfixe (users/, hist/<equipement>/, photos/, journal/, backups/…)
create index if not exists kv_key_prefix_idx on public.kv (key text_pattern_ops);

create or replace function public.kv_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists kv_touch on public.kv;
create trigger kv_touch before update on public.kv
for each row execute function public.kv_touch();

-- RLS activée sans aucune politique : la clé anon ne peut rien lire ni écrire.
-- Seule la clé service_role (utilisée uniquement côté serveur) accède aux données.
alter table public.kv enable row level security;
revoke all on public.kv from anon, authenticated;

-- Volumétrie par préfixe (page #/stockage)
create or replace view public.kv_volumes as
select split_part(key, '/', 1) as prefixe, count(*) as lignes,
       pg_size_pretty(sum(pg_column_size(doc) + coalesce(pg_column_size(txt), 0))::bigint) as volume
from public.kv group by 1 order by 2 desc;
