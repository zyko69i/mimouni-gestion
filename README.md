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
