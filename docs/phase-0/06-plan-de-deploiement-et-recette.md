# 06 — Plan de déploiement et recette

## Environnements

| Environnement | Usage | Données |
|---|---|---|
| Local | Développement | Jeu de démonstration |
| Aperçu Vercel | Recette avant mise en production | Jeu de démonstration |
| Production | Exploitation réelle | Données réelles |

## Étapes de mise en service

1. Créer le magasin de stockage et renseigner les variables d'environnement.
2. Définir le mot de passe administrateur initial et activer la double authentification.
3. Renseigner la fiche entreprise, les sites, bâtiments et locaux.
4. Importer les techniciens, leurs habilitations et les justificatifs.
5. Importer les équipements, générer et coller les QR codes.
6. Charger la bibliothèque documentaire initiale et planifier les revues.
7. Saisir le registre RGPD et les sous-traitants.
8. Configurer les destinataires des notifications et envoyer un test.
9. Vérifier la sauvegarde automatique et restaurer une sauvegarde de test.
10. Former les trois rôles (1 h par rôle), diffuser les règles d'usage.

## Tests d'acceptation

| # | Test | Attendu |
|---|---|---|
| 1 | Connexion avec un mot de passe erroné | Refus, message clair, aucun jeton |
| 2 | Connexion administrateur avec TOTP | Accès complet, code invalide refusé |
| 3 | Technicien ouvre un chantier hors périmètre | Refus côté serveur |
| 4 | Pointage hors ligne puis reconnexion | Saisie conservée, envoyée, visible |
| 5 | Scan d'un QR équipement | Fiche correcte ouverte |
| 6 | Modification d'un équipement | Journal mise à jour, historique conservé |
| 7 | Document : nouvelle version | Ancienne version conservée, revue repoussée |
| 8 | Document : revue | Statut remis à Valide, prochaine revue à un an |
| 9 | Courrier attendu : relance | Compteur incrémenté, prochaine relance à 7 jours |
| 10 | Maintenance récurrente réalisée | Occurrence suivante créée automatiquement |
| 11 | Lien de partage ouvert sans session | Fiche en lecture seule, sans données personnelles |
| 12 | Lien révoqué | Refus immédiat (410) |
| 13 | Lien au-delà du nombre d'ouvertures | Refus (429) |
| 14 | Demande RGPD reçue | Échéance à un mois, alerte si dépassée |
| 15 | Export du registre | JSON et CSV complets |
| 16 | Synthèse email sans clé Resend | Statut « non envoyé », contenu consultable |
| 17 | Restauration d'une sauvegarde | État exact, sécurité créée avant |
| 18 | Archivage d'un document | Toujours consultable, jamais supprimé |

## Critères de sortie

- Les 18 tests passent sur l'aperçu Vercel.
- Aucune erreur dans la console navigateur.
- Sauvegarde restaurée avec succès.
- Registre RGPD saisi et DPO désigné.
- Deux utilisateurs réels par rôle formés.

## Retour arrière

En cas d'anomalie bloquante : redéploiement de la version précédente, puis restauration de la dernière sauvegarde si les données sont en cause. La procédure est décrite dans [07](07-reprise-et-exploitation.md).

## Validation

Nom : ______________________  Date : __________
