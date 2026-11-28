# 03 — Rôles et droits

## Rôles

| Rôle | Qui | Mission principale |
|---|---|---|
| Administrateur | Direction / gérant | Paramétrage, comptes, conformité, sauvegardes |
| Chef d'équipe | Conducteur de travaux, responsable de site | Organisation, validation, suivi de son périmètre |
| Technicien | Électricien, alternant, intérimaire encadré | Saisie terrain, consultation de ses fiches |

## Matrice des droits

| Domaine | Administrateur | Chef d'équipe | Technicien |
|---|---|---|---|
| Sites, chantiers | Créer, modifier, archiver | Modifier son périmètre | Consulter |
| Techniciens | Créer, modifier, désactiver | Consulter son équipe | Consulter sa fiche |
| Planning et affectations | Tout | Son périmètre | Consulter le sien |
| Pointage | Tout valider | Valider son périmètre | Saisir ses heures |
| Équipements | Créer, modifier, QR | Modifier son périmètre | Consulter, signaler |
| Habilitations | Tout | Consulter, alerter | Consulter les siennes |
| Documents | Créer, versionner, archiver | Proposer, consulter | Consulter |
| Courriers | Tout | Son périmètre | — |
| Maintenance | Tout | Son périmètre | Réaliser, renseigner |
| Stocks | Tout | Mouvements | Consulter, demander |
| Journal | Lire, exporter | Lire son périmètre | — |
| Sauvegardes | Créer, restaurer | — | — |
| Registre RGPD | Tout | — | — |
| Liens de délégation | Tous | Ses fiches | — |
| Notifications email | Configurer, envoyer | — | — |

## Règles structurantes

1. Un compte est nominatif : aucun compte partagé, aucun mot de passe communiqué.
2. Un départ se traduit par une désactivation immédiate, jamais par une suppression (l'historique reste lisible).
3. Le périmètre d'un chef est calculé par ses chantiers et sites affectés ; hors périmètre, l'accès est refusé côté serveur, pas seulement masqué dans l'interface.
4. La double authentification est obligatoire pour l'administrateur et recommandée pour les chefs.
5. Les liens de délégation ne créent aucun compte, ne donnent accès qu'à une fiche, sans données personnelles sensibles ni montants, et sont révocables à tout moment.
6. Toute action sensible (création, modification, validation, export, restauration, partage) est journalisée avec auteur, date et objet.

## Données personnelles et rôles

| Donnée | Rôle administrateur | Rôle chef | Rôle technicien |
|---|---|---|---|
| Identité, coordonnées | Oui | Son équipe | Sa fiche |
| Contrat, rémunération | Oui | Non | Sa fiche (consultation) |
| Pointage | Oui | Son périmètre | Le sien |
| Habilitations, aptitudes | Oui | Son équipe | Les siennes |
| Absences, arrêts | Oui | Son périmètre (sans motif médical) | Les siennes |
| Données de santé | Non (hors application) | Non | Non |

## Validation

Nom : ______________________  Date : __________
