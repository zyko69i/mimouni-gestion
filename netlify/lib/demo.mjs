// Données d'exemple (toutes marquées demo: true, identifiants « demo-… »).
// Noms fictifs, clairement indiqués « Exemple » dans l'application.
const d = (offset) => { const x = new Date(); x.setDate(x.getDate() + offset); return x.toISOString().slice(0, 10); };
const ts = (offset, h = 9) => { const x = new Date(); x.setDate(x.getDate() + offset); x.setHours(h, 0, 0, 0); return x.toISOString(); };

export function DEMO() {
  const T = (id, firstName, lastName, position, skills, habs) => ({ id, firstName, lastName, position, skills, phone: '', email: '', address: '', entryDate: d(-400), notes: 'Fiche d\'exemple', active: true, habilitations: habs, createdAt: ts(-30), updatedAt: ts(-30) });
  const H = (id, kind, symbol, exp) => ({ id, kind, symbol, issued: d(exp - 1095), expires: d(exp), org: 'Organisme exemple', addedAt: ts(-30) });
  const technicians = [
    T('demo-t1', 'Exemple', 'Technicien A', 'Électricien industriel', ['Câblage armoire', 'HTA/BT'], [H('demo-h1', 'Électrique (NF C 18-510)', 'B2V BR', 20), H('demo-h2', 'SST', 'SST', 300)]),
    T('demo-t2', 'Exemple', 'Technicien B', 'Automaticien', ['Automatisme', 'Variation de vitesse'], [H('demo-h3', 'Électrique (NF C 18-510)', 'B1V H0V', 45), H('demo-h4', 'CACES', 'R486 B', 500)]),
    T('demo-t3', 'Exemple', 'Technicien C', 'Électricien', ['Instrumentation'], [H('demo-h5', 'Électrique (NF C 18-510)', 'BR', -5), H('demo-h6', 'AIPR', 'Opérateur', 200)]),
    T('demo-t4', 'Exemple', 'Technicien D', 'Chef d\'équipe', ['HTA/BT', 'Consignation'], [H('demo-h7', 'Électrique (NF C 18-510)', 'BC B2V HC', 700)]),
  ];
  const chantiers = [
    { id: 'demo-c1', name: 'Exemple – Rénovation TGBT usine', address: 'Adresse exemple', client: 'Client exemple 1', chefId: '', start: d(-20), endPlanned: d(25), status: 'En cours', team: ['demo-t1', 'demo-t2', 'demo-t3'], description: 'Chantier d\'exemple', createdAt: ts(-25), updatedAt: ts(-25) },
    { id: 'demo-c2', name: 'Exemple – Armoires de commande ligne 3', address: 'Adresse exemple', client: 'Client exemple 2', chefId: '', start: d(-40), endPlanned: d(-2), status: 'En cours', team: ['demo-t2', 'demo-t4'], description: 'Chantier d\'exemple', createdAt: ts(-45), updatedAt: ts(-45) },
    { id: 'demo-c3', name: 'Exemple – Éclairage atelier', address: 'Adresse exemple', client: 'Client exemple 3', chefId: '', start: d(10), endPlanned: d(40), status: 'En préparation', team: ['demo-t4'], description: 'Chantier d\'exemple', createdAt: ts(-5), updatedAt: ts(-5) },
  ];
  const K = (id, c, title, status, ph, dh, end, assignee, blockReason = '') => ({ id, chantierId: c, title, status, plannedHours: ph, doneHours: dh, start: d(-20), end: d(end), assignee, requiredHab: '', blockReason, createdAt: ts(-20), updatedAt: ts(-2), history: [] });
  const tasks = [
    K('demo-k1', 'demo-c1', 'Consignation et dépose ancien TGBT', 'Terminée', 10, 12, -12, 'demo-t1'),
    K('demo-k2', 'demo-c1', 'Pose du nouveau TGBT', 'Terminée', 20, 18, -4, 'demo-t1'),
    K('demo-k3', 'demo-c1', 'Raccordement des départs', 'En cours', 40, 15, 10, 'demo-t2'),
    K('demo-k4', 'demo-c1', 'Essais et mise en service', 'À faire', 30, 0, 24, 'demo-t3'),
    K('demo-k5', 'demo-c2', 'Câblage armoires 1 à 3', 'Terminée', 35, 38, -15, 'demo-t2'),
    K('demo-k6', 'demo-c2', 'Programmation automate', 'Bloquée', 25, 6, -3, 'demo-t2', 'Attente matériel'),
    K('demo-k7', 'demo-c2', 'Réception client', 'À faire', 8, 0, 3, 'demo-t4'),
    K('demo-k8', 'demo-c3', 'Relevé et étude éclairage', 'À faire', 12, 0, 15, 'demo-t4'),
  ];
  const A = (id, techId, chantierId, off, slot = 'journée') => ({ id, techId, chantierId, date: d(off), slot, note: '', createdBy: 'admin', createdAt: ts(-3) });
  const assignments = [
    A('demo-a1', 'demo-t1', 'demo-c1', 0), A('demo-a2', 'demo-t2', 'demo-c1', 0, 'matin'), A('demo-a3', 'demo-t2', 'demo-c2', 0, 'matin'),
    A('demo-a4', 'demo-t3', 'demo-c1', 1), A('demo-a5', 'demo-t4', 'demo-c2', 0), A('demo-a6', 'demo-t1', 'demo-c1', 1), A('demo-a7', 'demo-t3', 'demo-c1', 0),
  ];
  const absences = [
    { id: 'demo-b1', techId: 'demo-t3', type: 'maladie', start: d(0), end: d(1), time: '', motif: 'Arrêt (exemple)', status: 'Validée', author: 'admin', createdAt: ts(-1), history: [] },
    { id: 'demo-b2', techId: 'demo-t4', type: 'congé', start: d(5), end: d(9), time: '', motif: '', status: 'Validée', author: 'admin', createdAt: ts(-6), history: [] },
    { id: 'demo-b3', techId: 'demo-t1', type: 'retard', start: d(-2), end: d(-2), time: '08:45', motif: 'Embouteillage', status: 'Validée', author: 'admin', createdAt: ts(-2), history: [] },
  ];
  const E = (id, name, type, chantierId, location) => ({ id, name, type, brand: 'Marque exemple', model: 'Modèle exemple', serial: 'SN-EXEMPLE', chantierId, location, commissioned: d(-10), specs: '400 V – 630 A (exemple)', createdAt: ts(-10), updatedAt: ts(-10), createdBy: 'admin', labelPrints: 0 });
  const equipment = [
    E('EQ-DEMO01', 'Exemple – TGBT principal', 'TGBT', 'demo-c1', 'Local électrique RDC'),
    E('EQ-DEMO02', 'Exemple – Variateur pompe P2', 'Variateur', 'demo-c2', 'Ligne 3, armoire 2'),
    E('EQ-DEMO03', 'Exemple – Armoire de commande A1', 'Armoire', 'demo-c2', 'Ligne 3'),
  ];
  const history = [
    { id: 'demo-i1', equipId: 'EQ-DEMO01', type: 'intervention', content: 'Mise en service du TGBT (exemple).', duration: 3, photos: [], correctsId: '', reason: '', author: 'admin', authorName: 'Administrateur principal', authorRole: 'admin', at: ts(-4, 10) },
    { id: 'demo-i2', equipId: 'EQ-DEMO02', type: 'remarque', content: 'Ventilation à surveiller (exemple).', duration: 0, photos: [], correctsId: '', reason: '', author: 'admin', authorName: 'Administrateur principal', authorRole: 'admin', at: ts(-1, 15) },
  ];
  return { collections: { technicians, chantiers, tasks, assignments, absences, equipment }, history };
}
