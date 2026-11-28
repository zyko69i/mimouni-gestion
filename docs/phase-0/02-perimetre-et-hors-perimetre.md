# 02 — Périmètre et hors-périmètre

## Dans le périmètre

### Terrain et exploitation
- Fiches équipement avec QR code, historique d'interventions, documents liés.
- Sites, bâtiments, locaux, chantiers, tâches et planning.
- Pointage des heures, absences, déplacements et frais.
- Signalements (panne, dégât, demande) avec photos et traitement.
- Maintenance préventive, corrective, contrôles réglementaires, récurrences.
- Véhicules, carburant, entretien, contrôles.

### Conformité et administration
- Habilitations électriques, CACES, nucléaire, dosimétrie, validité et preuves.
- Bibliothèque documentaire versionnée, revues périodiques, étiquettes.
- Courriers : envois, réceptions, accusés, relances.
- Registre RGPD, demandes d'exercice de droits, sous-traitants, DPO.
- Journal d'activité inaltérable, sauvegardes, restauration, export complet.

### Accès
- Comptes nominatifs, rôles administrateur / chef d'équipe / technicien.
- Double authentification TOTP pour les comptes sensibles.
- Liens de délégation en lecture seule, limités en durée et en ouvertures, révocables.

### Notifications
- Synthèse quotidienne par email (habilitations, documents, maintenances, courriers, stocks, sauvegardes).

## Hors périmètre (à décider séparément)

- Paie, déclarations sociales et DSN : le logiciel de paie reste la référence.
- Comptabilité générale, facturation client, TVA : export CSV vers l'outil comptable uniquement.
- Gestion commerciale (devis, pipeline) au-delà du chiffrage des chantiers.
- Application native iOS/Android : l'application web installable (PWA) couvre le besoin.
- Badgeuse physique, lecture de badges, contrôle d'accès des portes.
- Vidéosurveillance et alarme : hors application, seulement documentées.
- Signature électronique qualifiée : la signature manuscrite numérisée est stockée comme preuve, sans valeur qualifiée.

## Interfaces

| Interface | Sens | Mode |
|---|---|---|
| Export CSV / JSON complet | Sortie | Manuel, administrateur |
| Email de synthèse | Sortie | Resend, quotidien |
| QR codes équipement | Entrée | Scan caméra ou lien `/e/<id>` |
| Lien de partage `/partage?t=…` | Sortie | Public, lecture seule, expirable |
| Sauvegarde Blob | Sortie | Quotidien, cron |

## Règles de changement

Tout ajout au périmètre est écrit ici, daté, avec son impact sur le planning et l'exploitation. Un ajout sans impact chiffré n'est pas accepté.
