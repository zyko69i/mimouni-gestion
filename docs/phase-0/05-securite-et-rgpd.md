# 05 — Sécurité et RGPD

## Principes

1. Moindre privilège : chaque rôle ne voit que ce dont il a besoin, contrôlé côté serveur.
2. Traçabilité : toute action sensible est journalisée, le journal n'est jamais modifié.
3. Réversibilité : rien n'est supprimé, tout est archivé, désactivé ou versionné.
4. Sobriété : aucune donnée collectée sans finalité écrite au registre.
5. Défense en profondeur : mot de passe, jeton signé, double authentification, en-têtes de sécurité.

## Mesures techniques en place

| Mesure | Détail |
|---|---|
| Mots de passe | scrypt, sel aléatoire, jamais stockés en clair |
| Jetons | HMAC-SHA256, expiration, en-tête `Authorization` |
| Double authentification | TOTP 6 chiffres, secret par compte |
| En-têtes | CSP stricte, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy` |
| Transport | HTTPS obligatoire |
| Journal | Chaîné (SHA-256 + maillon précédent), conservé, exportable, vérifiable |
| Sauvegardes | Quotidiennes, 30 conservées, restauration testée |
| Partage | Lien à jeton aléatoire, durée, nombre d'ouvertures, révocation |
| Hors ligne | Copie locale effaçable, file d'attente visible |

## Registre RGPD

Le registre est intégré à l'application (menu RGPD & DPO) et couvre a minima :

| Traitement | Finalité | Base légale | Conservation |
|---|---|---|---|
| Gestion du personnel | Contrats, coordonnées, planning | Contrat de travail | Durée du contrat + 5 ans |
| Pointage et temps | Suivi des heures, paie | Obligation légale | 5 ans |
| Habilitations et aptitudes | Sécurité des interventions | Obligation légale | Durée de validité + 5 ans |
| Absences | Organisation, paie | Contrat / obligation légale | 5 ans |
| Signalements et photos | Sécurité, preuve d'intervention | Intérêt légitime | 5 ans |
| Journal d'activité | Sécurité du système | Intérêt légitime | 12 mois glissants minimum |
| Courriers clients | Preuve contractuelle | Contrat | 10 ans |
| Sauvegardes | Continuité d'activité | Intérêt légitime | 30 jours |

Chaque traitement du registre porte : finalité, base légale, personnes concernées, catégories de données, destinataires, sous-traitants, durée de conservation, mesures de sécurité, transferts hors UE, niveau de risque, AIPD, responsable, date de revue.

## Demandes d'exercice de droits

- Réception tracée (date, canal, personne, référence interne).
- Échéance à un mois calculée automatiquement, alerte en cas de retard.
- Décision et preuve conservées.
- Aucune suppression physique : la réponse peut être un effacement logique documenté.

## Sous-traitants

| Sous-traitant | Prestation | Pays | Garanties |
|---|---|---|---|
| Vercel | Hébergement et stockage | UE (cdg1) | Contrat, clauses types |
| Resend | Envoi d'emails | À vérifier | Contrat, clauses types |
| Groq (optionnel) | Assistant | À vérifier | À documenter ou désactiver |

## Violation de données

1. Constat et qualification sous 24 h.
2. Mesures immédiates : révocation des jetons, désactivation des comptes, rotation des secrets.
3. Notification à la CNIL sous 72 h si risque pour les personnes.
4. Information des personnes concernées si risque élevé.
5. Compte rendu écrit conservé dans le registre.

## Points à traiter

- Désigner formellement le DPO ou le référent et publier ses coordonnées.
- Vérifier la localisation exacte des données chez chaque sous-traitant.
- Rédiger la politique de conservation et la procédure d'effacement logique.
- Ajouter la mention d'information des salariés et le registre des consentements si nécessaire.

## Validation

Nom : ______________________  Date : __________
