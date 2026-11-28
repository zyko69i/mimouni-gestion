# 01 — Note de cadrage

## Contexte

MIMOUNI INDUSTRIEL ÉLECTRICITÉ exploite plusieurs sites industriels avec des équipes terrain, des chantiers clients et des obligations documentaires lourdes (habilitations, contrôles réglementaires, plans de prévention, courriers). Le suivi repose aujourd'hui sur des fichiers dispersés et des échanges informels : l'information existe, mais elle est difficile à retrouver, à prouver et à transmettre.

## Objectif du projet

Disposer d'une application unique, utilisable sur mobile et hors connexion, qui :

1. donne à chaque intervenant la fiche dont il a besoin au moment où il en a besoin (équipement, chantier, consigne) ;
2. rende démontrable la conformité (habilitations à jour, contrôles réalisés, documents à jour, courriers suivis) ;
3. réduise le temps administratif de l'encadrement (pointage, comptes rendus, relances, sauvegardes) ;
4. protège les données personnelles des salariés et des clients (accès par rôle, journalisation, registre RGPD).

## Enjeux et risques principaux

| Enjeu | Risque si rien n'est fait | Réponse dans le projet |
|---|---|---|
| Conformité des habilitations | Interdiction d'intervention, mise en cause de responsabilité | Suivi des échéances, alertes, justificatifs |
| Traçabilité des contrôles | Contestation en cas d'accident ou d'audit | Historique horodaté, preuves, non-suppression |
| Perte de données | Perte d'exploitation et de preuve | Sauvegardes quotidiennes, restauration testée |
| Données personnelles | Sanction CNIL, perte de confiance | Registre, droits par rôle, journal, DPO |
| Adoption terrain | Retour aux fichiers, double saisie | Mobile d'abord, hors ligne, QR codes |

## Décision attendue

Valider le périmètre de [02](02-perimetre-et-hors-perimetre.md), les rôles de [03](03-roles-et-droits.md), l'hébergement de [04](04-architecture-et-hebergement.md) et le budget d'exploitation (hébergement, nom de domaine, envoi d'emails).

## Indicateurs de succès (12 mois)

- 100 % des habilitations avec une date de fin et un justificatif.
- 0 contrôle réglementaire en retard de plus de 30 jours.
- 100 % des chantiers clôturés avec un dossier documentaire complet.
- Sauvegarde restaurée avec succès au moins une fois par semestre.
- Moins de 15 minutes par semaine et par technicien consacrées à la saisie administrative.

## Validation

Nom : ______________________  Fonction : ______________________  Date : __________
