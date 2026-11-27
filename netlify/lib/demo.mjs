// Données d'exemple (toutes marquées demo: true, identifiants « demo-… »).
// 40 techniciens fictifs pour tests : 4 chefs de chantier, 6 chefs d'équipe, 30 électriciens.
const d = (offset) => { const x = new Date(); x.setDate(x.getDate() + offset); return x.toISOString().slice(0, 10); };
const ts = (offset, h = 9) => { const x = new Date(); x.setDate(x.getDate() + offset); x.setHours(h, 0, 0, 0); return x.toISOString(); };

const prenoms = ['Lucas', 'Hugo', 'Louis', 'Nathan', 'Enzo', 'Léo', 'Gabriel', 'Arthur', 'Raphaël', 'Jules', 'Adam', 'Noah', 'Théo', 'Tom', 'Antoine', 'Maxime', 'Alexandre', 'Paul', 'Victor', 'Mathis', 'Baptiste', 'Clément', 'Nicolas', 'Julien', 'Romain', 'Kevin', 'Damien', 'Florian', 'Vincent', 'Sébastien', 'Yassine', 'Karim', 'Mehdi', 'Sofiane', 'Amine', 'Ibrahim', 'Mohamed', 'Ali', 'Omar', 'Hamza'];
const noms = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel', 'Girard', 'André', 'Mercier', 'Dupont', 'Lambert', 'Bonnet', 'François', 'Martinez', 'Legrand'];

export function DEMO() {
  const T = (id, firstName, lastName, position, skills, habs) => ({ id, firstName, lastName, position, skills, phone: '06' + String(Math.floor(Math.random()*90000000)+10000000), email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@exemple.fr`, address: 'Adresse exemple', entryDate: d(-400 - Math.floor(Math.random()*200)), notes: 'Fiche d\'exemple', active: true, habilitations: habs, createdAt: ts(-30), updatedAt: ts(-30), demo: true });
  const H = (id, kind, symbol, exp) => ({ id, kind, symbol, issued: d(exp - 1095), expires: d(exp), org: 'Organisme exemple', addedAt: ts(-30) });

  const technicians = [];
  // 4 chefs de chantier
  for (let i = 1; i <= 4; i++) {
    const p = prenoms[i-1], n = noms[i-1];
    technicians.push(T(`demo-t${i}`, p, n, 'Chef de chantier', ['Conduite de travaux', 'HTA/BT', 'Sécurité'], [H(`demo-h${i}a`, 'Électrique (NF C 18-510)', 'BC B2V HC', 200 + i*30), H(`demo-h${i}b`, 'SST', 'SST', 400)]));
  }
  // 6 chefs d'équipe
  for (let i = 5; i <= 10; i++) {
    const p = prenoms[i-1], n = noms[i-1];
    technicians.push(T(`demo-t${i}`, p, n, 'Chef d\'équipe', ['Câblage', 'Consignation', 'Encadrement'], [H(`demo-h${i}a`, 'Électrique (NF C 18-510)', 'B2V BR', 150 + i*20)]));
  }
  // 30 techniciens électriciens
  for (let i = 11; i <= 40; i++) {
    const p = prenoms[(i-1) % prenoms.length], n = noms[(i-1) % noms.length] + (i > 30 ? ' ' + (i-30) : '');
    const skills = i % 3 === 0 ? ['Câblage armoire', 'Instrumentation'] : i % 3 === 1 ? ['HTA/BT', 'Câblage'] : ['Automatisme', 'Variation'];
    const exp = i % 7 === 0 ? -10 : 100 + (i % 5)*40; // some expired
    technicians.push(T(`demo-t${i}`, p, n, 'Électricien industriel', skills, [H(`demo-h${i}a`, 'Électrique (NF C 18-510)', i % 2 ? 'B1V' : 'B2V BR', exp)]));
  }

  const chantiers = [
    { id: 'demo-c1', name: 'Exemple – Rénovation TGBT usine Nord', address: '12 Zone Industrielle, 59000 Lille', client: 'Usine Nord SA', chefId: 'demo-t1', start: d(-25), endPlanned: d(30), status: 'En cours', team: ['demo-t1','demo-t5','demo-t11','demo-t12','demo-t13','demo-t14'], description: 'Chantier d\'exemple', demo: true, createdAt: ts(-30), updatedAt: ts(-2) },
    { id: 'demo-c2', name: 'Exemple – Armoires ligne production 3', address: '45 Rue des Usines, 69000 Lyon', client: 'Indus Lyon', chefId: 'demo-t2', start: d(-40), endPlanned: d(5), status: 'En cours', team: ['demo-t2','demo-t6','demo-t15','demo-t16','demo-t17'], description: 'Chantier d\'exemple', demo: true, createdAt: ts(-45), updatedAt: ts(-1) },
    { id: 'demo-c3', name: 'Exemple – Éclairage et prises atelier', address: '8 Avenue de l\'Industrie, 33000 Bordeaux', client: 'Atelier Bordeaux', chefId: 'demo-t3', start: d(-10), endPlanned: d(40), status: 'En cours', team: ['demo-t3','demo-t7','demo-t18','demo-t19'], description: 'Chantier d\'exemple', demo: true, createdAt: ts(-15), updatedAt: ts(-3) },
    { id: 'demo-c4', name: 'Exemple – Installation variateurs', address: '22 Boulevard Technique, 31000 Toulouse', client: 'Techno Toulouse', chefId: 'demo-t4', start: d(5), endPlanned: d(50), status: 'En préparation', team: ['demo-t4','demo-t8','demo-t20'], description: 'Chantier d\'exemple', demo: true, createdAt: ts(-5), updatedAt: ts(-5) },
    { id: 'demo-c5', name: 'Exemple – Maintenance préventive site Sud', address: '1 Zone Sud, 13000 Marseille', client: 'Site Sud', chefId: 'demo-t1', start: d(-60), endPlanned: d(-10), status: 'En cours', team: ['demo-t9','demo-t21','demo-t22'], description: 'Chantier d\'exemple (retard)', demo: true, createdAt: ts(-65), updatedAt: ts(-2) },
  ];

  const K = (id, c, title, status, ph, dh, end, assignee, blockReason = '') => ({ id, chantierId: c, title, status, plannedHours: ph, doneHours: dh, start: d(-20), end: d(end), assignee, requiredHab: '', blockReason, createdAt: ts(-20), updatedAt: ts(-2), history: [], demo: true });
  const tasks = [
    K('demo-k1', 'demo-c1', 'Consignation et dépose ancien TGBT', 'Terminée', 16, 18, -15, 'demo-t11'),
    K('demo-k2', 'demo-c1', 'Pose du nouveau TGBT', 'Terminée', 24, 22, -5, 'demo-t12'),
    K('demo-k3', 'demo-c1', 'Raccordement des départs', 'En cours', 40, 18, 12, 'demo-t13'),
    K('demo-k4', 'demo-c1', 'Essais et mise en service', 'À faire', 20, 0, 28, 'demo-t14'),
    K('demo-k5', 'demo-c2', 'Câblage armoires 1 à 4', 'Terminée', 50, 55, -20, 'demo-t15'),
    K('demo-k6', 'demo-c2', 'Programmation automate', 'Bloquée', 30, 8, -2, 'demo-t16', 'Attente pièces'),
    K('demo-k7', 'demo-c2', 'Réception client', 'À faire', 10, 0, 8, 'demo-t6'),
    K('demo-k8', 'demo-c3', 'Pose luminaires LED', 'En cours', 35, 20, 15, 'demo-t18'),
    K('demo-k9', 'demo-c3', 'Câblage prises et circuits', 'En cours', 28, 12, 20, 'demo-t19'),
    K('demo-k10', 'demo-c5', 'Contrôle des armoires', 'Bloquée', 15, 5, -8, 'demo-t21', 'Accès chantier fermé'),
  ];

  const A = (id, techId, chantierId, off, slot = 'journée') => ({ id, techId, chantierId, date: d(off), slot, note: '', createdBy: 'admin', createdAt: ts(-3), demo: true });
  const assignments = [];
  for (let dayOff = -2; dayOff <= 5; dayOff++) {
    chantiers.forEach((c, ci) => {
      const team = c.team.slice(0, 4);
      team.forEach((tid, ti) => {
        if ((dayOff + ti + ci) % 3 !== 0) assignments.push(A(`demo-a${dayOff}${ci}${ti}`, tid, c.id, dayOff, ti % 2 ? 'matin' : 'journée'));
      });
    });
  }

  const absences = [
    { id: 'demo-b1', techId: 'demo-t13', type: 'maladie', start: d(0), end: d(2), time: '', motif: 'Arrêt (exemple)', status: 'Validée', author: 'admin', createdAt: ts(-1), history: [], demo: true },
    { id: 'demo-b2', techId: 'demo-t22', type: 'congé', start: d(3), end: d(7), time: '', motif: '', status: 'Validée', author: 'admin', createdAt: ts(-6), history: [], demo: true },
    { id: 'demo-b3', techId: 'demo-t11', type: 'retard', start: d(-1), end: d(-1), time: '08:50', motif: 'Transport', status: 'Validée', author: 'admin', createdAt: ts(-1), history: [], demo: true },
    { id: 'demo-b4', techId: 'demo-t17', type: 'absence', start: d(1), end: d(1), time: '', motif: 'Personnel', status: 'Demandée', author: 'admin', createdAt: ts(0), history: [], demo: true },
  ];

  const E = (id, name, type, chantierId, location) => ({ id, name, type, brand: 'Marque exemple', model: 'Modèle exemple', serial: 'SN-EX-' + id.slice(-4), chantierId, location, commissioned: d(-10), specs: '400 V (exemple)', createdAt: ts(-10), updatedAt: ts(-10), createdBy: 'admin', labelPrints: 1, demo: true });
  const equipment = [
    E('EQ-DEMO01', 'Exemple – TGBT principal usine Nord', 'TGBT', 'demo-c1', 'Local électrique RDC'),
    E('EQ-DEMO02', 'Exemple – Variateur pompe P2', 'Variateur', 'demo-c2', 'Ligne 3'),
    E('EQ-DEMO03', 'Exemple – Armoire commande A1', 'Armoire', 'demo-c2', 'Atelier'),
    E('EQ-DEMO04', 'Exemple – Tableau éclairage atelier', 'Tableau', 'demo-c3', 'Atelier principal'),
    E('EQ-DEMO05', 'Exemple – Armoire variateurs', 'Armoire', 'demo-c4', 'Local technique'),
  ];

  const history = [
    { id: 'demo-i1', equipId: 'EQ-DEMO01', type: 'intervention', content: 'Mise en service du TGBT (exemple).', duration: 4, photos: [], correctsId: '', reason: '', author: 'admin', authorName: 'Administrateur principal', authorRole: 'admin', at: ts(-4, 10), demo: true },
    { id: 'demo-i2', equipId: 'EQ-DEMO02', type: 'remarque', content: 'Ventilation à surveiller (exemple).', duration: 0, photos: [], correctsId: '', reason: '', author: 'admin', authorName: 'Administrateur principal', authorRole: 'admin', at: ts(-1, 15), demo: true },
    { id: 'demo-i3', equipId: 'EQ-DEMO03', type: 'intervention', content: 'Contrôle câblage (exemple).', duration: 2, photos: [], correctsId: '', reason: '', author: 'admin', authorName: 'Administrateur principal', authorRole: 'admin', at: ts(-2, 11), demo: true },
  ];

  return { collections: { technicians, chantiers, tasks, assignments, absences, equipment }, history };
}
