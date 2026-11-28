# Parties 9, 10 et 19 — ce qui a été livré

Ce document décrit les trois parties demandées et la façon de les vérifier en quelques minutes. Il complète les documents de [phase 0](phase-0/).

## Partie 9 — QR codes

### Ce qui existe
- Un QR code par équipement, encodant un lien permanent `https://mimouni-industriel-electricite.vercel.app/e/<identifiant>`.
- Création, régénération versionnée, désactivation et réactivation réservées à l'administrateur, avec motif obligatoire.
- Étiquette 50 × 30 mm (logo, désignation, code) imprimable depuis la fiche.

### Ce qui a été ajouté
- Page **Étiquettes QR** (`#/etiquettes`, administrateur) : recherche, filtre par site, sélection multiple.
- Planches A4 de **24**, **12** ou **6** étiquettes, plus l'étiquette seule ; impression dans une iframe isolée (pas de conflit avec les styles de l'écran).
- Export **PNG** d'un QR, copie du lien, aperçu à l'échelle réelle.
- Compteur d'impressions et date de dernière impression par équipement, enregistrés au journal (une entrée par étiquette).
- Bouton **Vérifier les liens** : compare l'identifiant encodé à l'identifiant de la fiche et signale les étiquettes à réimprimer, ainsi que les QR désactivés.

### Comment vérifier
1. Ouvrir `#/etiquettes`, sélectionner trois équipements, choisir « Planche A4 — 24 étiquettes », imprimer : la boîte d'impression doit proposer trois étiquettes.
2. Cliquer sur **PNG** : un fichier `qr-<code>.png` est téléchargé et se lit avec n'importe quel lecteur.
3. Cliquer sur **Vérifier les liens** : message sans anomalie.
4. Contrôler dans `#/journal` les entrées « étiquette imprimée ».

## Partie 10 — Preuve et traçabilité

### Ce qui existait
- Journal d'activité en ajout seul (auteur, rôle, action, objet, détail, date).
- Historique par équipement, versions de documents, corrections tracées dans les registres.

### Ce qui a été ajouté
- **Journal chaîné** : chaque entrée porte l'empreinte SHA-256 de son contenu et la clé de l'entrée précédente. Le calcul se fait côté serveur, à l'écriture.
- Page **Preuves et traçabilité** (`#/preuves`, administrateur) : volumétrie, acteurs, objets, dernières actions.
- **Vérification d'intégrité** : recalcule chaque empreinte. Deux natures de constat sont distinguées :
  - *contenu altéré* : l'empreinte ne correspond plus (grave) ;
  - *maillon rompu* : la référence précédente ne correspond pas (suppression, restauration de sauvegarde ou écritures simultanées entre deux instances).
- **Trace d'une fiche** : toutes les actions liées à un identifiant (équipement, document, courrier, maintenance…), avec l'historique de l'équipement lorsque c'est un équipement.
- **Paquet de preuve** : filtre par période, objet et acteur ; export JSON, CSV et **attestation PDF** rappelant la période, l'état de la chaîne et l'auteur du paquet. Le paquet est lui-même inscrit au journal.

### Limites assumées
- Les entrées écrites avant cette version n'ont pas d'empreinte : elles sont comptées comme « antérieures au chaînage » et ne sont pas déclarées altérées.
- Le chaînage détecte une altération ou une suppression, il n'empêche pas une écriture frauduleuse par un administrateur qui réécrirait toute la chaîne. La sauvegarde quotidienne reste la référence de comparaison.
- Une écriture concurrente entre deux instances peut rompre un maillon sans perte de donnée : c'est signalé, pas bloquant.

### Comment vérifier
1. Ouvrir `#/preuves`, cliquer sur **Vérifier l'intégrité** : « contenus intègres ».
2. Choisir une période, un objet, cliquer sur **Constituer un paquet de preuve** : JSON, CSV et PDF sont téléchargés.
3. Saisir un code équipement dans **Trace d'une fiche** : les actions apparaissent avec leur empreinte.
4. Dans `#/journal`, vérifier qu'une action récente porte bien une empreinte (visible dans le paquet exporté).

## Partie 19 — Rapports et export

### Ce qui existait
- Rapport PDF par chantier, exports CSV tâches / absences / heures / habilitations, export complet ZIP (administrateur).

### Ce qui a été ajouté
- Sélecteur de **période** (du / au) et de **site**, appliqué à tous les exports de la page.
- **Rapport d'exploitation PDF** : activité, chantiers, conformité (habilitations à échéance, documents à réviser), courriers en attente, maintenances et retards, stocks sous seuil, zone de visa.
- Dix exports CSV : chantiers, heures par technicien et chantier, habilitations, documents, courriers, maintenances, stocks, équipements, absences, signalements.
- Accès direct au **paquet de preuve** depuis la page Rapports.
- Export complet ZIP conservé (administrateur).

### Comment vérifier
1. Ouvrir `#/rapports`, choisir une période couvrant le mois en cours et un site.
2. Générer le **Rapport d'exploitation** : le PDF contient les six sections et les visas.
3. Cliquer sur « Heures par technicien et chantier » : le CSV ne contient que la période et le site choisis.
4. Générer le PDF d'un chantier : inchangé, avec la zone de visa.

## Compléments livrés en même temps

Ces améliorations ne faisaient pas partie des trois parties mais complètent la même version :

- **Documents** : étiquettes, nouvelle version (l'ancienne est conservée), revue à un an, archivage, filtre par étiquette, fiche détaillée avec historique.
- **Courriers** : référence, accusé daté, relances comptées, prochaine relance à sept jours.
- **Maintenance** : périodicité, contrat, coût, durée, preuve, points de contrôle ; une maintenance récurrente réalisée crée l'occurrence suivante.
