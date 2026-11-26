# Hébergement

- **Production : Vercel** — équipe « mimo » (compte zyko69i), projet `mimouni-industriel-electricite`
  (id prj_ERK7JweSTYzoc2yRouuFgmaonoyC), adresse https://mimouni-industriel-electricite.vercel.app
- Stockage : Vercel Blob privé « mimouni » (région Paris cdg1), une clé par enregistrement.
- Fonctions : `api/index.mjs` (réutilise `netlify/functions/api.mjs`), cron quotidien `api/sauvegarde.mjs`.
- Variables serveur (jamais dans le dépôt) : MIMOUNI_TOKEN_SECRET, MIMOUNI_ADMIN_HASH, CRON_SECRET, BLOB_READ_WRITE_TOKEN.
- Déploiement : direct (le dépôt GitHub privé n'est pas encore relié à Vercel).
- Netlify reste compatible : sans BLOB_READ_WRITE_TOKEN, `db.mjs` utilise Netlify Blobs.
