# 04 — Architecture et hébergement

## Vue d'ensemble

Application web installable (PWA), sans framework côté client, servie en statique, avec une API unique et un stockage clé-valeur.

```
Navigateur / mobile
   │  HTML + JS + service worker (cache hors ligne)
   ▼
Front statique (public/)
   │  fetch JSON, jeton HMAC en en-tête
   ▼
API unique (netlify/functions/api.mjs, réutilisée par api/index.mjs sur Vercel)
   │  un enregistrement = une clé
   ▼
Stockage Blob (Netlify Blobs ou Vercel Blob selon l'hébergement)
   ├── collections métier (sites, chantiers, équipements, documents…)
   ├── hist/<collection>/<id>  historiques
   ├── journal/                journal d'activité append-only
   └── backups/                sauvegardes nommées
```

## Choix techniques et justifications

| Choix | Justification | Conséquence |
|---|---|---|
| Pas de framework front | Charge faible sur mobile, pas de build | Code à maintenir avec rigueur, tests manuels |
| API unique | Un seul point d'authentification et de journalisation | Fichier volumineux, routes explicites |
| Blob clé-valeur | Coût faible, sauvegarde par simple lecture | Pas de requêtes SQL, indexation en mémoire |
| Jeton HMAC signé | Pas de session serveur, fonctionne hors ligne | Révocation par changement de secret |
| scrypt pour les mots de passe | Résistant au cassage hors ligne | Coût CPU à la connexion |
| TOTP pour la double authentification | Standard, aucune dépendance SMS | Nécessite une application d'authentification |
| Service worker | Usage terrain sans réseau | Risque de version en cache : versionner le cache |

## Hébergement

| Élément | Hébergeur | Détail |
|---|---|---|
| Front et API | Vercel (équipe `mimo`) | Production : `mimouni-industriel-electricite.vercel.app` |
| Stockage | Vercel Blob, magasin `mimouni`, région `cdg1` | Paris, données dans l'Union européenne |
| Sauvegarde planifiée | Cron Vercel 02:00 | `api/sauvegarde.mjs`, protégé par `CRON_SECRET` |
| Emails | Resend | Optionnel, clé `RESEND_API_KEY` |
| Nom de domaine | À confirmer | À faire pointer sur Vercel |

## Variables d'environnement

| Nom | Rôle | Obligatoire |
|---|---|---|
| `MIMOUNI_TOKEN_SECRET` | Signature des jetons de session | Oui |
| `MIMOUNI_ADMIN_HASH` | Empreinte du mot de passe administrateur initial | Oui |
| `BLOB_READ_WRITE_TOKEN` | Accès au stockage Vercel Blob | Oui |
| `CRON_SECRET` | Protection du cron de sauvegarde | Oui |
| `RESEND_API_KEY` | Envoi des emails de synthèse | Non |
| `GROQ_API_KEY` | Assistant d'exploitation (optionnel) | Non |

## Contraintes et limites connues

- Le stockage Blob n'offre pas de transactions : les écritures sont idempotentes et l'historique compense.
- Les photos sont stockées encodées, la taille est donc à surveiller (indicateur dans Stockage et synchronisation).
- Un seul déploiement régional : pas de bascule automatique en cas de panne d'hébergeur.
- La restauration remet l'état exact de la sauvegarde : c'est volontaire, et une sauvegarde de sécurité est créée avant.

## Validation

Nom : ______________________  Date : __________
