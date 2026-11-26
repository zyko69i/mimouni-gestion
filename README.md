# MIMOUNI INDUSTRIEL ÉLECTRICITÉ – Logiciel de gestion (V1)

Application web installable (PWA) : tableau de bord, chantiers et tâches, planning, pointage des heures (feuille du jour validée par le chef), techniciens et habilitations,
présences et absences, matériel avec QR codes permanents, scanner, historique en ajout seul, rapports PDF, exports, sauvegardes.

- Front : HTML/CSS/JS sans framework (`public/`), hors ligne (service worker + IndexedDB, file d'attente avec confirmation avant envoi).
- Back : fonctions Netlify (`netlify/functions/api.mjs`) + Netlify Blobs, une clé par enregistrement et par entrée d'historique.
- Couche de données isolée : `netlify/lib/db.mjs` (à réécrire pour passer à Supabase).
- Droits vérifiés côté serveur sur chaque route (admin / chef / technicien).
- Variables d'environnement Netlify requises : `MIMOUNI_TOKEN_SECRET` (signature des jetons), `MIMOUNI_ADMIN_HASH` (mot de passe initial de l'admin, haché scrypt). Aucun secret dans le dépôt.
- Bibliothèques embarquées : qrcode-generator (MIT), jsQR (Apache-2.0), jsPDF (MIT), JSZip (MIT).
