# Hébergement

- **Production : Vercel** — équipe « mimo » (compte zyko69i), projet `mimouni-industriel-electricite`
  (id prj_ERK7JweSTYzoc2yRouuFgmaonoyC), adresse https://mimouni-industriel-electricite.vercel.app
- Stockage : Vercel Blob privé « mimouni » (région Paris cdg1), une clé par enregistrement.
- Fonctions : `api/index.mjs` (réutilise `netlify/functions/api.mjs`), cron quotidien `api/sauvegarde.mjs`.
- Variables serveur (jamais dans le dépôt) : MIMOUNI_TOKEN_SECRET, MIMOUNI_ADMIN_HASH, CRON_SECRET, BLOB_READ_WRITE_TOKEN.
- Déploiement : direct (le dépôt GitHub privé n'est pas encore relié à Vercel).
- Netlify reste compatible : sans BLOB_READ_WRITE_TOKEN, `db.mjs` utilise Netlify Blobs.

## Base de données : Supabase (PostgreSQL)

- Table unique `public.kv` (une ligne par clé : collections, historique, photos, journal, sauvegardes) — schéma dans `docs/supabase/schema.sql`.
- RLS activée sans politique, `anon` révoqué : seule la clé `service_role` (serveur uniquement) accède aux données.
- Variables à ajouter côté Vercel : `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- Ordre de priorité de la couche de données (`netlify/lib/db.mjs`) : Supabase, puis Vercel Blob, puis Netlify Blobs.
- Reprise des données existantes : `node scripts/migrer-vers-supabase.mjs` (ajout seul, ne réécrit jamais une clé déjà présente ; `--simulation` pour un décompte sans écriture).
- Test hors ligne de l'adaptateur : `node tests/supabase-smoke.mjs`.
