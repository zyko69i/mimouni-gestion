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

## Mise en service (Supabase + Vercel)

1. **Base** : le projet Supabase `mimouni-gestion` (région Paris, référence `kgaablwwxiasfysxqwjf`) contient déjà la table `kv` (`docs/supabase/schema.sql`).
2. **Clé serveur** : Supabase → Project Settings → API keys → secret keys → copier la clé `service_role`.
3. **Variables Vercel** (project settings → Environment Variables, production) :
   - `SUPABASE_URL` = `https://kgaablwwxiasfysxqwjf.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = la clé de l'étape 2
   Les laisser absentes maintient l'application sur son stockage actuel.
4. **Reprise des données** (une fois, depuis un poste avec les variables) :
   `SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… BLOB_READ_WRITE_TOKEN=… npm run migrer:supabase`
   Relancer avec `--simulation` d'abord pour un simple décompte.
5. **Déploiement** : `VERCEL_TOKEN=… ./scripts/deployer-vercel.sh` (ou liaison du dépôt GitHub au projet Vercel pour les déploiements automatiques).
6. **Contrôle** : connexion administrateur, ouverture d'un chantier, pointage, export CSV, page `#/preuves` (chaîne d'intégrité) et `#/stockage` (volumétrie).

## Déploiement automatique par GitHub Actions

`.github/workflows/deploy-vercel.yml` déploie en production à chaque push sur `main`.

- Secrets du dépôt (Settings → Secrets and variables → Actions) : `VERCEL_TOKEN` (obligatoire), `VERCEL_ORG_ID` et `VERCEL_PROJECT_ID` (`prj_ERK7JweSTYzoc2yRouFgmaonoyC`, facultatifs).
- Sans `VERCEL_TOKEN`, le workflow lance seulement le contrôle hors ligne et ne déploie pas.
- Après déploiement, il vérifie que `https://mimouni-industriel-electricite.vercel.app` répond en 200.
