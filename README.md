# MIMOUNI INDUSTRIEL ÉLECTRICITÉ – Logiciel de gestion (V1)

Application web installable (PWA) : tableau de bord, chantiers et tâches, planning, pointage des heures (feuille du jour validée par le chef), techniciens et habilitations,
présences et absences, matériel avec QR codes permanents, scanner, historique en ajout seul, rapports PDF, exports, sauvegardes.

- Front : HTML/CSS/JS sans framework (`public/`), hors ligne (service worker + IndexedDB, file d'attente avec confirmation avant envoi).
- Back : fonctions Netlify (`netlify/functions/api.mjs`) + Netlify Blobs, une clé par enregistrement et par entrée d'historique.
- Couche de données isolée : `netlify/lib/db.mjs` (à réécrire pour passer à Supabase).
- Droits vérifiés côté serveur sur chaque route (admin / chef / technicien).
- Variables d'environnement Netlify requises : `MIMOUNI_TOKEN_SECRET` (signature des jetons), `MIMOUNI_ADMIN_HASH` (mot de passe initial de l'admin, haché scrypt). Aucun secret dans le dépôt.
- Bibliothèques embarquées : qrcode-generator (MIT), jsQR (Apache-2.0), jsPDF (MIT), JSZip (MIT).

## Modules d'exploitation (V1.4)

- **7 sites et 80 personnes** dans les données d'exemple : Paluel, Tricastin, Cruas, Bugey, Saint-Alban, Romans (atelier industriel) et Bordeaux (plateforme logistique).
- **Documentation** : bibliothèque technique, sécurité et nucléaire (référence, version, statut, responsable, site, date de revue, historique de version). Un document est archivé ou remplacé, jamais effacé.
- **Courriers** : envois et réceptions (plan de prévention, compte rendu, attachement, certificat…), statut, accusé de réception et alerte de relance.
- **Maintenance** : maintenance préventive, corrective et contrôles réglementaires, échéances, intervenant interne ou prestataire ; signalements terrain (panne, dégât, demande, transfert) avec urgence et traitement.
- **Fiche équipement complète** : identification, caractéristiques électriques, localisation (site, bâtiment, local, zone), affectation (responsable, utilisateur), achat et garantie, suivi, historique.
- **QR codes** : création, régénération (versionnée), désactivation et réactivation réservées au webmaster (administrateur) ; le lien permanent de la fiche ne change pas. Un QR code n'est ni une autorisation d'utilisation ni une preuve de conformité.
- **Tableau de bord** : documents à réviser, maintenances à traiter, signalements ouverts, contrôles d'équipements, en plus des chantiers, présences, habilitations et heures.
- **Remplaçants suggérés** sur les absences : même site, même métier, disponibilité et habilitations couvertes, en suggestion indicative validée par le chef d'équipe.

## Modules ajoutés (V1.5 – V1.6)

- **Conformité** : statut calculé et statut déclaré des habilitations, justificatif obligatoire, refus serveur des affectations non conformes (chantiers critiques), dérogation QHSE écrite et limitée dans le temps.
- **Parc et frais** : carburant, entretien et contrôles véhicules, barèmes versionnés (source, justificatif, validateur), déplacements et frais calculés avec le barème en vigueur.
- **Sécurité et conformité** : DICT/DT, consignation / déconsignation / VAT, CACES, sous-traitants et plans de prévention, dosimétrie (admin seul), signatures électroniques scellées (SHA-256, ajout seul).
- **Ressources humaines** : évolution professionnelle, récompenses, anniversaires et ancienneté, export complet d'une fiche (JSON et PDF).
- **Stocks** et avertissements visibles par module.
- Registres : `netlify/lib/registres.mjs` (règles métier côté serveur, lignes jamais effacées, corrections journalisées avant / après).
- Les sauvegardes couvrent désormais toutes les collections ; une ancienne sauvegarde ne supprime pas les collections qu'elle ne contient pas.

## Lot 4 : sécurité, alertes, assistant, rentabilité

- Double authentification TOTP optionnelle (Profil), journal des connexions (IP, refus), révocation des sessions par l'administrateur.
- Alertes unifiées (`reg/alerts`) : CACES, DICT, sous-traitants, véhicules, frais, stocks, consignation, dérogations, dosimétrie, barèmes, sauvegardes.
- Assistant d'exploitation basé sur les données internes : cite ses sources, aucune action, refuse les sujets sensibles, interactions journalisées.
- Rentabilité des chantiers (administrateur) : estimation de pilotage, pas de comptabilité.

## Lot 5 : RGPD, délégation, notifications, preuve (V1.7 – V1.8)

- **Registre RGPD et outils DPO** (`#/rgpd`, administrateur) : registre des activités de traitement (article 30), demandes d'exercice de droits avec échéance à un mois, coordonnées du DPO, sous-traitants (article 28), revue annuelle, export JSON et CSV. Rien n'est supprimé : un traitement est archivé.
- **Délégation d'accès par lien** (`#/partages`) : un lien donne accès à une seule fiche en lecture seule, sans données personnelles sensibles ni montants, avec durée, nombre d'ouvertures et révocation immédiate. Page publique `/partage?t=…`, accessible sans compte.
- **Notifications par email** (Réglages) : synthèse quotidienne des alertes (habilitations, documents, maintenances, courriers, stocks, sauvegardes), destinataires, horizons réglables, envoi de test. Fournisseur Resend ; sans `RESEND_API_KEY`, rien n'est perdu : le message est conservé dans la boîte d'envoi avec son statut.
- **Stockage et synchronisation** (`#/stockage`) : volume local, quota du navigateur, cache du service worker, file d'attente, envois refusés, volumétrie serveur par collection, synchronisation forcée, purge de la copie locale.
- **Partie 9 — QR codes** (`#/etiquettes`) : sélection en lot, planches A4 de 24, 12 ou 6 étiquettes, étiquette seule 50 × 30 mm, export PNG, copie du lien, vérification de conformité des liens, compteur d'impressions par équipement.
- **Partie 10 — Preuve et traçabilité** (`#/preuves`) : journal chaîné (empreinte SHA-256 du contenu + référence de l'entrée précédente), vérification d'intégrité, trace par fiche, paquet de preuve filtré par période, objet et acteur (JSON, CSV, attestation PDF). Toute altération ou suppression d'entrée casse la chaîne et devient visible.
- **Partie 19 — Rapports et exports** (`#/rapports`) : période et site, rapport d'exploitation PDF, dix exports CSV (chantiers, heures, habilitations, documents, courriers, maintenances, stocks, équipements, absences, signalements), export complet ZIP et accès au paquet de preuve.
- **Documents** : étiquettes, versions (l'ancienne version est conservée), revue à un an, archivage.
- **Courriers** : référence, accusé daté, relances comptées avec prochaine relance à 7 jours.
- **Maintenance** : périodicité, contrat, coût, durée, preuve, points de contrôle ; une maintenance récurrente réalisée crée automatiquement l'occurrence suivante.
- **Phase 0** : documents de cadrage dans [`docs/phase-0/`](docs/phase-0/) — note de cadrage, périmètre, rôles et droits, architecture et hébergement, sécurité et RGPD, déploiement et recette, reprise et exploitation.

### Variables d'environnement

| Nom | Rôle | Obligatoire |
|---|---|---|
| `MIMOUNI_TOKEN_SECRET` | Signature des jetons de session | Oui |
| `MIMOUNI_ADMIN_HASH` | Mot de passe administrateur initial (scrypt) | Oui |
| `BLOB_READ_WRITE_TOKEN` | Stockage Vercel Blob | Oui (Vercel) |
| `CRON_SECRET` | Protection du cron de sauvegarde | Oui |
| `RESEND_API_KEY` | Envoi des emails de synthèse | Non |
| `GROQ_API_KEY` | Assistant d'exploitation | Non |
