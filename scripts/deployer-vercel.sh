#!/usr/bin/env bash
# Déploiement en production sur le projet Vercel existant, sans passer par la
# liaison du dépôt (le dépôt n'est pas relié à Vercel aujourd'hui).
#
# Prérequis : VERCEL_TOKEN (jeton personnel, portée sur l'équipe « mimo »).
# Usage : VERCEL_TOKEN=… ./scripts/deployer-vercel.sh
#
# Options utiles (variables d'environnement) :
#   PROJET   nom du projet Vercel       (défaut : mimouni-industriel-electricite)
#   PORTEE   slug de l'équipe Vercel    (défaut : mimo)
set -euo pipefail

: "${VERCEL_TOKEN:?VERCEL_TOKEN manquant}"
PROJET="${PROJET:-mimouni-industriel-electricite}"
PORTEE="${PORTEE:-mimo}"
RACINE="$(cd "$(dirname "$0")/.." && pwd)"
cd "$RACINE"

VERCEL="npx --yes vercel@latest"

echo "→ Liaison au projet $PROJET (équipe $PORTEE)"
$VERCEL link --yes --project "$PROJET" --scope "$PORTEE" --token "$VERCEL_TOKEN" >/dev/null

echo "→ Liste des variables attendues côté serveur"
$VERCEL env ls production --token "$VERCEL_TOKEN" | sed 's/^/   /'

echo "→ Déploiement en production"
$VERCEL deploy --prod --yes --token "$VERCEL_TOKEN" --archive=tgz "$@"
