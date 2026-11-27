// Données d'exemple (toutes marquées demo: true, identifiants « demo-… »).
// Contexte : 3 sites nucléaires (Paluel, Tricastin, Cruas), 40 personnes,
// parc véhicules, matériel étiqueté QR et historique d'heures sur 24 mois.
const d = (offset) => { const x = new Date(); x.setDate(x.getDate() + offset); return x.toISOString().slice(0, 10); };
const now = new Date();
const M = (offset) => { const x = new Date(now.getFullYear(), now.getMonth() + offset, 1); return x.toISOString().slice(0, 7); };
const ts = (offset, h = 9) => { const x = new Date(); x.setDate(x.getDate() + offset); x.setHours(h, 0, 0, 0); return x.toISOString(); };
const rnd = (() => { let s = 42; return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; })();
const pick = (a) => a[Math.floor(rnd() * a.length)];

const SITES = [
  { id: 'demo-s1', name: 'Paluel', code: 'PAL', type: 'Centrale nucléaire', address: 'Paluel, Normandie', demo: true },
  { id: 'demo-s2', name: 'Tricastin', code: 'TRI', type: 'Centrale nucléaire', address: 'Pierrelatte, Drôme', demo: true },
  { id: 'demo-s3', name: 'Cruas', code: 'CRU', type: 'Centrale nucléaire', address: 'Cruas, Ardèche', demo: true },
];

const PRENOMS = ['Lucas', 'Hugo', 'Louis', 'Nathan', 'Enzo', 'Léo', 'Gabriel', 'Arthur', 'Raphaël', 'Jules', 'Adam', 'Noah', 'Théo', 'Tom', 'Antoine', 'Maxime', 'Alexandre', 'Paul', 'Victor', 'Mathis', 'Baptiste', 'Clément', 'Nicolas', 'Julien', 'Romain', 'Kevin', 'Damien', 'Florian', 'Vincent', 'Sébastien', 'Yassine', 'Karim', 'Mehdi', 'Sofiane', 'Amine', 'Ibrahim', 'Mohamed', 'Ali', 'Omar', 'Hamza'];
const NOMS = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel', 'Girard', 'André', 'Mercier', 'Dupont', 'Lambert', 'Bonnet', 'François', 'Martinez', 'Legrand'];
const METIERS = ['Chef de chantier', "Chef d'équipe", 'Électricien industriel', 'Câbleur', 'Instrumentiste', 'Automaticien', 'Électricien HTA/BT', 'Technicien essais'];

function habsFor(i, site) {
  const H = (kind, symbol, exp, org) => ({ id: `demo-h${i}-${symbol.replace(/[^A-Z0-9]/gi, '')}`, kind, symbol, issued: d(exp - 1095), expires: d(exp), org: org || 'Organisme agréé', addedAt: ts(-30) });
  const out = [];
  const elec = ['B1V', 'B2V', 'BR', 'BC', 'HC'][i % 5];
  out.push(H('Électrique (NF C 18-510)', elec, 120 + (i % 9) * 45));
  if (i % 4 !== 0) out.push(H('Électrique (NF C 18-510)', 'B2V BR', 260 + (i % 6) * 40));
  // Nucléaire : RP/SC selon le site et l'ancienneté
  out.push(H('Nucléaire (RP / SC / HN)', i % 3 === 0 ? 'SC1' : 'SC2', 60 + (i % 11) * 30, 'EDF – habilitation site'));
  if (i % 2 === 0) out.push(H('Nucléaire (RP / SC / HN)', i % 5 === 0 ? 'RP2' : 'RP1', (i % 7 === 0 ? -15 : 90) + (i % 5) * 40, 'EDF – RP'));
  if (i % 6 === 0) out.push(H('Nucléaire (RP / SC / HN)', 'HN', 200 + (i % 4) * 60));
  if (i % 5 === 0) out.push(H('Nucléaire (RP / SC / HN)', 'CSQ', 150 + i * 7));
  out.push(H('SST', 'SST', 300 + (i % 8) * 40));
  out.push(H('AIPR', 'AIPR', 400 + (i % 7) * 50));
  if (i % 3 === 0) out.push(H('CACES', i % 2 ? 'R486' : 'R482', 180 + (i % 6) * 55, 'CACES'));
  if (i % 4 === 1) out.push(H('Travail en hauteur', 'TH', 240 + (i % 5) * 45));
  return out;
}

export function DEMO() {
  const sites = SITES.map((s) => ({ ...s, createdAt: ts(-400) }));

  const technicians = [];
  for (let i = 1; i <= 40; i++) {
    const site = SITES[(i - 1) % 3];
    const metier = i <= 3 ? 'Chef de chantier' : i <= 9 ? "Chef d'équipe" : METIERS[2 + (i % 6)];
    technicians.push({
      id: `demo-t${i}`,
      firstName: PRENOMS[(i - 1) % PRENOMS.length],
      lastName: NOMS[(i - 1) % NOMS.length] + (i > 30 ? ' ' + (i - 30) : ''),
      position: metier,
      metier,
      siteId: site.id,
      skills: metier === 'Chef de chantier' ? ['Conduite de travaux', 'HTA/BT', 'Sécurité', 'Coordination'] : metier === "Chef d'équipe" ? ['Encadrement', 'Consignation', 'Câblage'] : i % 3 === 0 ? ['Câblage armoire', 'Instrumentation'] : i % 3 === 1 ? ['HTA/BT', 'Câblage'] : ['Automatisme', 'Variation'],
      phone: '06' + String(10000000 + i * 137913).slice(0, 8),
      email: `${PRENOMS[(i - 1) % PRENOMS.length].toLowerCase()}.${NOMS[(i - 1) % NOMS.length].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}@mimouni.fr`,
      address: 'Adresse exemple', entryDate: d(-400 - (i % 12) * 120), notes: "Fiche d'exemple", active: true,
      habilitations: habsFor(i, site), createdAt: ts(-30), updatedAt: ts(-30), demo: true,
    });
  }

  const CH = [
    ['demo-c1', 'demo-s1', 'Tranche 1 – Salle des machines', 'EDF Paluel', 'En cours', -120, 90],
    ['demo-c2', 'demo-s1', 'TGBT – Bâtiment électrique', 'EDF Paluel', 'En cours', -60, 45],
    ['demo-c3', 'demo-s1', 'Éclairage de sûreté – Zone contrôlée', 'EDF Paluel', 'En préparation', 10, 120],
    ['demo-c4', 'demo-s2', 'Poste HTA – Atelier mécanique', 'EDF Tricastin', 'En cours', -90, 60],
    ['demo-c5', 'demo-s2', 'Chemin de câbles – Bâtiment combustible', 'EDF Tricastin', 'En cours', -40, 30],
    ['demo-c6', 'demo-s2', 'Armoires de contrôle – Station de pompage', 'EDF Tricastin', 'Clôture proposée', -200, 5],
    ['demo-c7', 'demo-s3', 'Ligne de production – Atelier 3', 'EDF Cruas', 'En cours', -150, 75],
    ['demo-c8', 'demo-s3', 'Instrumentation – Salle de commande', 'EDF Cruas', 'En cours', -30, 100],
    ['demo-c9', 'demo-s3', 'Rénovation éclairage – Parc extérieur', 'EDF Cruas', 'Clôturé', -300, -10],
  ];
  const chantiers = CH.map(([id, siteId, name, client, status, start, end]) => ({
    id, siteId, name, client, address: SITES.find((s) => s.id === siteId).address,
    chefId: 'demo-t' + ((SITES.findIndex((s) => s.id === siteId) % 3) + 1),
    start: d(start), endPlanned: d(end), status, team: technicians.filter((t) => t.siteId === siteId).slice(0, 8).map((t) => t.id),
    description: 'Prestation d\'électricité industrielle en environnement nucléaire.', createdAt: ts(start), updatedAt: ts(-5), demo: true,
  }));

  const TITRES = ['Consignation et pose des armoires', 'Tirage de câbles puissance', 'Raccordement TGBT', 'Essais diélectriques', 'Repérage et étiquetage', 'Mise en service éclairage', 'Contrôle isolement', 'Pose chemin de câbles', 'Câblage instrumentation', 'Levée des réserves', 'Rapport de fin de travaux', 'Contrôle des serrages'];
  const tasks = [];
  let k = 1;
  chantiers.forEach((c, ci) => {
    const n = 6;
    for (let j = 0; j < n; j++) {
      const st = c.status === 'Clôturé' ? 'Terminée' : (ci + j) % 7 === 0 ? 'Bloquée' : (ci + j) % 3 === 0 ? 'Terminée' : (ci + j) % 3 === 1 ? 'En cours' : 'À faire';
      const plan = 16 + ((j * 13 + ci * 7) % 60);
      const done = st === 'Terminée' ? plan : st === 'En cours' ? Math.round(plan * (0.2 + rnd() * 0.5)) : 0;
      tasks.push({
        id: 'demo-k' + (k++), chantierId: c.id, title: TITRES[(ci * 3 + j) % TITRES.length] + (j > 5 ? ' (phase 2)' : ''),
        status: st, plannedHours: plan, doneHours: done, start: c.start, end: c.endPlanned,
        assignee: c.team[j % c.team.length], requiredHab: j % 4 === 0 ? 'SC2' : '', blockReason: st === 'Bloquée' ? 'Attente autorisation d\'accès zone contrôlée' : '',
        createdAt: ts(-20), updatedAt: ts(-2), history: [], demo: true,
      });
    }
  });

  const assignments = [];
  for (let day = -3; day <= 12; day++) {
    technicians.slice(0, 18).forEach((t, idx) => {
      const ch = chantiers.filter((c) => c.siteId === t.siteId && c.status !== 'Clôturé')[(idx + Math.abs(day)) % 2];
      if (!ch) return;
      assignments.push({ id: `demo-a${assignments.length + 1}`, techId: t.id, chantierId: ch.id, date: d(day), slot: (idx + day) % 3 === 0 ? 'matin' : (idx + day) % 3 === 1 ? 'après-midi' : 'journée', note: '', createdBy: 'admin', createdAt: ts(-6), demo: true });
    });
  }

  const absences = [
    ['demo-t4', 'congé', -2, 3, 'Congés annuels'],
    ['demo-t11', 'maladie', -1, 1, 'Arrêt de travail'],
    ['demo-t22', 'absence', 4, 4, 'Formation habilitation'],
    ['demo-t31', 'retard', 0, 0, 'Retard transport'],
    ['demo-t38', 'congé', 8, 14, 'Congés annuels'],
    ['demo-t7', 'maladie', -12, -9, 'Arrêt de travail'],
  ].map(([techId, type, a, b, motif], i) => ({ id: `demo-b${i + 1}`, techId, type, start: d(a), end: d(b), motif, status: 'Validée', author: 'admin', createdAt: ts(-5), history: [], demo: true }));

  const EQT = [
    ['Armoire', 'Armoire de puissance AP', 'Schneider', 'Prisma P'],
    ['Tableau', 'Tableau divisionnaire TD', 'Legrand', 'XL3'],
    ['Chemin de câbles', 'Chemin de câbles tôle 300 mm', 'Legrand', 'Cablofil'],
    ['Luminaire', 'Luminaire étanche LED 36 W', 'Philips', 'Pacific'],
    ['Coffret', 'Coffret de commande locale', 'Schneider', 'Spacial'],
    ['Câble', 'Câble U-1000 R2V 4G25', 'Nexans', 'R2V'],
    ['Transformateur', 'Transformateur 630 kVA', 'Schneider', 'Trihal'],
    ['Moteur', 'Moteur asynchrone 75 kW', 'ABB', 'M3BP'],
    ['Capteur', 'Capteur de température PT100', 'Endress', 'Omnigrad'],
    ['Prise', 'Prise industrielle 63 A', 'Legrand', 'P17'],
  ];
  const ZONES = ['Salle des machines', 'Bâtiment électrique', 'Zone contrôlée', 'Atelier', 'Parc extérieur', 'Salle de commande', 'Station de pompage'];
  const equipment = [];
  let eqn = 1;
  chantiers.filter((c) => c.status !== 'Clôturé').forEach((c, ci) => {
    for (let j = 0; j < 5; j++) {
      const [type, name, brand, model] = EQT[(ci * 3 + j) % EQT.length];
      const id = 'demo-e' + (eqn++);
      equipment.push({
        id, name: name + ' ' + (j + 1), type, category: type, brand, model, serial: 'SN-' + (100000 + eqn * 37),
        chantierId: c.id, siteId: c.siteId, zone: ZONES[(ci + j) % ZONES.length], location: 'Local ' + String.fromCharCode(65 + (j % 6)) + (j + 1),
        status: j === 4 ? 'À contrôler' : 'En service', criticality: j < 2 ? 'Critique' : 'Standard',
        commissioned: d(-700 + j * 30), nextControl: d(30 + j * 25), specs: 'Fiche technique d\'exemple', createdAt: ts(-40), updatedAt: ts(-4), createdBy: 'admin', labelPrints: 1, demo: true,
      });
    }
  });

  const vehicles = [];
  const PLATES = ['GK-482-MN', 'FT-119-QR', 'HJ-733-LP', 'DR-205-VB', 'KS-918-TC', 'LM-364-XA', 'NP-771-BD', 'QT-540-HG', 'RC-228-JK', 'SV-905-FN', 'TB-617-WL', 'VD-340-ZM'];
  const VT = ['Fourgon', 'Camionnette', 'Voiture', 'Utilitaire', 'Camion nacelle', 'Pick-up'];
  PLATES.forEach((plate, i) => {
    const site = SITES[i % 3];
    vehicles.push({
      id: 'demo-v' + (i + 1), plate, brand: ['Renault', 'Peugeot', 'Ford', 'Citroën', 'Iveco', 'Toyota'][i % 6],
      model: ['Master', 'Boxer', 'Transit', 'Jumper', 'Daily', 'Hilux'][i % 6], type: VT[i % VT.length],
      siteId: site.id, assignedTo: i < 9 ? `demo-t${i + 1}` : '', km: 38000 + i * 7400,
      status: i === 7 ? 'Atelier' : i === 11 ? 'Hors service' : i < 9 ? 'Affecté' : 'Disponible',
      ct: d(-20 + i * 22), insurance: d(40 + i * 18), nextService: d(-5 + i * 20), nextServiceKm: 45000 + i * 7400 + 15000,
      fuel: i % 4 === 0 ? 'Électrique' : 'Diesel', notes: '', createdAt: ts(-300), updatedAt: ts(-10), createdBy: 'admin', demo: true,
    });
  });

  // Feuilles d'heures récentes (le détail des 24 derniers mois est dans l'agrégat « timelog »)
  const timesheets = [];
  for (let day = -1; day >= -12; day--) {
    const tech = technicians[(-day) % 40];
    const ch = chantiers.filter((c) => c.siteId === tech.siteId && c.status !== 'Clôturé')[0];
    if (!ch) continue;
    const hh = 7 + (Math.abs(day) % 2);
    timesheets.push({
      id: `demo-f${Math.abs(day)}`, techId: tech.id, date: d(day), lines: [{ chantierId: ch.id, taskId: '', hours: hh, note: '' }], total: hh,
      comment: '', warnings: [], status: 'Envoyée', refusedReason: '', submittedBy: tech.id, submittedAt: ts(day), decidedBy: '', decidedAt: '', createdAt: ts(day), updatedAt: ts(day), history: [], demo: true,
    });
  }

  // Agrégat d'heures sur 24 mois, par site / chantier / technicien
  const months = {};
  const siteHours = { 'demo-s1': 2350, 'demo-s2': 1980, 'demo-s3': 1520 };
  for (let m = -23; m <= 0; m++) {
    const key = M(m);
    const seasonal = 0.82 + 0.18 * Math.abs(Math.sin((m + 24) / 3));
    const bySite = {}; const byChantier = {}; const byTech = {}; let total = 0;
    ['demo-s1', 'demo-s2', 'demo-s3'].forEach((sid) => {
      const v = Math.round(siteHours[sid] * seasonal * (0.92 + rnd() * 0.16));
      bySite[sid] = v; total += v;
      chantiers.filter((c) => c.siteId === sid).forEach((c, idx) => {
        const part = idx === 0 ? 0.46 : idx === 1 ? 0.3 : idx === 2 ? 0.16 : 0.08;
        byChantier[c.id] = Math.round(v * part);
      });
      technicians.filter((t) => t.siteId === sid).forEach((t) => { byTech[t.id] = Math.round((v / 13) * (0.7 + rnd() * 0.6)); });
    });
    months[key] = { total, bySite, byChantier, byTech };
  }

  return {
    collections: {
      sites, technicians, chantiers, tasks, assignments, absences, equipment, vehicles, timesheets,
      settings: [{ id: 'timelog', months, updatedAt: new Date().toISOString(), demo: true }],
    },
    history: [],
  };
}
