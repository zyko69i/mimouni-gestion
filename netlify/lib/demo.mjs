// Données d'exemple (toutes marquées demo: true, identifiants « demo-… »).
// Contexte : 7 sites (nucléaire et industriel), 80 personnes, parc véhicules,
// équipements étiquetés QR, documentation, courriers, maintenance et signalements.
const d = (offset) => { const x = new Date(); x.setDate(x.getDate() + offset); return x.toISOString().slice(0, 10); };
const now = new Date();
const M = (offset) => { const x = new Date(now.getFullYear(), now.getMonth() + offset, 1); return x.toISOString().slice(0, 7); };
const ts = (offset, h = 9) => { const x = new Date(); x.setDate(x.getDate() + offset); x.setHours(h, 0, 0, 0); return x.toISOString(); };
const rnd = (() => { let s = 42; return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; })();
const pick = (a) => a[Math.floor(rnd() * a.length)];

const SITES = [
  { id: 'demo-s1', name: 'Paluel', code: 'PAL', type: 'Centrale nucléaire', address: 'Paluel, Normandie', manager: 'S. Renard' },
  { id: 'demo-s2', name: 'Tricastin', code: 'TRI', type: 'Centrale nucléaire', address: 'Pierrelatte, Drôme', manager: 'C. Vidal' },
  { id: 'demo-s3', name: 'Cruas', code: 'CRU', type: 'Centrale nucléaire', address: 'Cruas, Ardèche', manager: 'M. Perrin' },
  { id: 'demo-s4', name: 'Bugey', code: 'BUG', type: 'Centrale nucléaire', address: 'Saint-Vulbas, Ain', manager: 'A. Fontaine' },
  { id: 'demo-s5', name: 'Saint-Alban', code: 'SAB', type: 'Centrale nucléaire', address: 'Saint-Alban-du-Rhône, Isère', manager: 'J. Morel' },
  { id: 'demo-s6', name: 'Romans – Atelier industriel', code: 'ROM', type: 'Site industriel', address: 'Romans-sur-Isère, Drôme', manager: 'L. Girard' },
  { id: 'demo-s7', name: 'Bordeaux – Plateforme logistique', code: 'BDX', type: 'Site industriel', address: 'Bordeaux, Gironde', manager: 'P. Lemoine' },
];

const PRENOMS = ['Lucas', 'Hugo', 'Louis', 'Nathan', 'Enzo', 'Léo', 'Gabriel', 'Arthur', 'Raphaël', 'Jules', 'Adam', 'Noah', 'Théo', 'Tom', 'Antoine', 'Maxime', 'Alexandre', 'Paul', 'Victor', 'Mathis', 'Baptiste', 'Clément', 'Nicolas', 'Julien', 'Romain', 'Kevin', 'Damien', 'Florian', 'Vincent', 'Sébastien', 'Yassine', 'Karim', 'Mehdi', 'Sofiane', 'Amine', 'Ibrahim', 'Mohamed', 'Ali', 'Omar', 'Hamza'];
const NOMS = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel', 'Girard', 'André', 'Mercier', 'Dupont', 'Lambert', 'Bonnet', 'François', 'Martinez', 'Legrand'];
const METIERS = ['Chef de chantier', "Chef d'équipe", 'Électricien industriel', 'Câbleur', 'Instrumentiste', 'Automaticien', 'Électricien HTA/BT', 'Technicien essais', 'Électricien nucléaire'];

function habsFor(i, site) {
  const H = (kind, symbol, exp, org) => ({ id: `demo-h${i}-${symbol.replace(/[^A-Z0-9]/gi, '')}-${kind.slice(0, 3)}`, kind, symbol, issued: d(exp - 1095), expires: d(exp), org: org || 'Organisme agréé', addedAt: ts(-30) });
  const out = [];
  const elec = ['B1V', 'B2V', 'BR', 'BC', 'HC'][i % 5];
  out.push(H('Électrique (NF C 18-510)', elec, 120 + (i % 9) * 45));
  if (i % 4 !== 0) out.push(H('Électrique (NF C 18-510)', 'B2V BR', 260 + (i % 6) * 40));
  const nuclear = site.type === 'Centrale nucléaire';
  if (nuclear) {
    out.push(H('Nucléaire (RP / SC / HN)', i % 3 === 0 ? 'SC1' : 'SC2', 60 + (i % 11) * 30, 'EDF – habilitation site'));
    if (i % 2 === 0) out.push(H('Nucléaire (RP / SC / HN)', i % 5 === 0 ? 'RP2' : 'RP1', (i % 7 === 0 ? -15 : 90) + (i % 5) * 40, 'EDF – RP'));
    if (i % 6 === 0) out.push(H('Nucléaire (RP / SC / HN)', 'HN', 200 + (i % 4) * 60));
    if (i % 5 === 0) out.push(H('Nucléaire (RP / SC / HN)', 'CSQ', 150 + i * 7));
  }
  out.push(H('SST', 'SST', 300 + (i % 8) * 40));
  out.push(H('AIPR', 'AIPR', 400 + (i % 7) * 50));
  if (i % 3 === 0) out.push(H('CACES', i % 2 ? 'R486' : 'R482', 180 + (i % 6) * 55, 'CACES'));
  if (i % 4 === 1) out.push(H('Travail en hauteur', 'TH', 240 + (i % 5) * 45));
  return out;
}

export function DEMO() {
  const sites = SITES.map((s) => ({ ...s, createdAt: ts(-400), demo: true }));

  const technicians = [];
  for (let i = 1; i <= 80; i++) {
    const site = SITES[(i - 1) % SITES.length];
    const metier = i <= 7 ? 'Chef de chantier' : i <= 21 ? "Chef d'équipe" : METIERS[2 + (i % 7)];
    const base = PRENOMS[(i - 1) % PRENOMS.length].toLowerCase() + '.' + NOMS[(i - 1) % NOMS.length].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    technicians.push({
      id: `demo-t${i}`,
      firstName: PRENOMS[(i - 1) % PRENOMS.length],
      lastName: NOMS[(i - 1) % NOMS.length] + (i > 60 ? ' ' + (i - 60) : ''),
      position: metier,
      metier,
      siteId: site.id,
      managerId: i <= 7 ? '' : 'demo-t' + ((i - 1) % 7 + 1),
      skills: metier === 'Chef de chantier' ? ['Conduite de travaux', 'HTA/BT', 'Sécurité', 'Coordination'] : metier === "Chef d'équipe" ? ['Encadrement', 'Consignation', 'Câblage'] : i % 3 === 0 ? ['Câblage armoire', 'Instrumentation'] : i % 3 === 1 ? ['HTA/BT', 'Câblage'] : ['Automatisme', 'Variation'],
      phone: '06' + String(10000000 + i * 137913).slice(0, 8),
      email: `${base}${i}@mimouni.fr`,
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
    ['demo-c10', 'demo-s4', 'Remplacement luminaires – Bâtiment machines', 'EDF Bugey', 'En cours', -70, 40],
    ['demo-c11', 'demo-s5', 'Armoire de distribution – Station de pompage', 'EDF Saint-Alban', 'En cours', -35, 55],
    ['demo-c12', 'demo-s6', 'Extension atelier – Force motrice', 'MécaRhône', 'En cours', -50, 70],
    ['demo-c13', 'demo-s6', 'Éclairage LED – Atelier assemblage', 'MécaRhône', 'En préparation', 15, 90],
    ['demo-c14', 'demo-s7', 'Plateforme logistique – TGBT et éclairage', 'LogiSud', 'En cours', -80, 35],
  ];
  const chantiers = CH.map(([id, siteId, name, client, status, start, end], idx) => ({
    id, siteId, name, client, address: SITES.find((s) => s.id === siteId).address,
    chefId: 'demo-t' + (idx % 7 + 1),
    start: d(start), endPlanned: d(end), status, team: technicians.filter((t) => t.siteId === siteId).slice(0, 9).map((t) => t.id),
    description: 'Prestation d\'électricité industrielle : dépose, pose, câblage, raccordement et mise en service.',
    createdAt: ts(start), updatedAt: ts(-5), demo: true,
  }));

  const TITRES = ['Consignation et pose des armoires', 'Tirage de câbles puissance', 'Raccordement TGBT', 'Essais diélectriques', 'Repérage et étiquetage', 'Mise en service éclairage', 'Contrôle isolement', 'Pose chemin de câbles', 'Câblage instrumentation', 'Levée des réserves', 'Rapport de fin de travaux', 'Contrôle des serrages'];
  const tasks = [];
  let k = 1;
  chantiers.forEach((c, ci) => {
    for (let j = 0; j < 6; j++) {
      const st = c.status === 'Clôturé' ? 'Terminée' : (ci + j) % 7 === 0 ? 'Bloquée' : (ci + j) % 3 === 0 ? 'Terminée' : (ci + j) % 3 === 1 ? 'En cours' : 'À faire';
      const plan = 16 + ((j * 13 + ci * 7) % 60);
      const done = st === 'Terminée' ? plan : st === 'En cours' ? Math.round(plan * (0.2 + rnd() * 0.5)) : 0;
      tasks.push({
        id: 'demo-k' + (k++), chantierId: c.id, title: TITRES[(ci * 3 + j) % TITRES.length] + (j > 5 ? ' (phase 2)' : ''),
        status: st, plannedHours: plan, doneHours: done, start: c.start, end: c.endPlanned,
        assignee: c.team[j % c.team.length], requiredHab: ci % 2 === 0 ? 'SC2' : '', blockReason: st === 'Bloquée' ? 'Attente autorisation d\'accès zone contrôlée' : '',
        createdAt: ts(-20), updatedAt: ts(-2), history: [], demo: true,
      });
    }
  });

  const assignments = [];
  for (let day = -3; day <= 12; day++) {
    technicians.forEach((t, idx) => {
      if (idx % 3 === 2) return;
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
    ['demo-t47', 'maladie', -12, -9, 'Arrêt de travail'],
    ['demo-t55', 'congé', 1, 6, 'Congés annuels'],
    ['demo-t63', 'absence', 2, 2, 'Visite médicale'],
  ].map(([techId, type, a, b, motif], i) => ({ id: `demo-b${i + 1}`, techId, type, start: d(a), end: d(b), motif, status: 'Validée', author: 'admin', createdAt: ts(-5), history: [], demo: true }));

  const EQT = [
    ['Armoire', 'Armoire de puissance AP', 'Schneider', 'Prisma P', '18,5 kW', '400 V', '32 A', 'IP55'],
    ['Tableau', 'Tableau divisionnaire TD', 'Legrand', 'XL3', '6 kW', '400 V', '25 A', 'IP40'],
    ['Chemin de câbles', 'Chemin de câbles tôle 300 mm', 'Legrand', 'Cablofil', '', '', '', ''],
    ['Luminaire', 'Luminaire étanche LED 36 W', 'Philips', 'Pacific', '36 W', '230 V', '0,16 A', 'IP65'],
    ['Coffret', 'Coffret de commande locale', 'Schneider', 'Spacial', '2,2 kW', '400 V', '10 A', 'IP54'],
    ['Câble', 'Câble U-1000 R2V 4G25', 'Nexans', 'R2V', '', '', '', ''],
    ['Transformateur', 'Transformateur 630 kVA', 'Schneider', 'Trihal', '630 kVA', '20 000 / 400 V', '', 'IP31'],
    ['Moteur', 'Moteur asynchrone 75 kW', 'ABB', 'M3BP', '75 kW', '400 V', '138 A', 'IP55'],
    ['Capteur', 'Capteur de température PT100', 'Endress', 'Omnigrad', '', '', '', 'IP67'],
    ['Prise', 'Prise industrielle 63 A', 'Legrand', 'P17', '', '400 V', '63 A', 'IP67'],
  ];
  const ZONES = ['Salle des machines', 'Bâtiment électrique', 'Zone contrôlée', 'Atelier', 'Parc extérieur', 'Salle de commande', 'Station de pompage'];
  const BUILDINGS = ['Bâtiment machines', 'Bâtiment électrique', 'Bâtiment combustible', 'Atelier nord', 'Local technique', 'Extérieur'];
  const equipment = [];
  let eqn = 1;
  chantiers.filter((c) => c.status !== 'Clôturé').forEach((c, ci) => {
    for (let j = 0; j < 5; j++) {
      const [type, name, brand, model, power, voltage, current, ip] = EQT[(ci * 3 + j) % EQT.length];
      const id = 'demo-e' + (eqn++);
      equipment.push({
        id, name: name + ' ' + (j + 1), type, category: type, brand, manufacturer: brand, reference: 'REF-' + (4000 + eqn * 13),
        model, serial: 'SN-' + (100000 + eqn * 37), purchaseDate: d(-900 + j * 40), supplier: 'ÉlecPro Distribution', warrantyUntil: d(200 + j * 30),
        chantierId: c.id, siteId: c.siteId, zone: ZONES[(ci + j) % ZONES.length], building: BUILDINGS[(ci + j) % BUILDINGS.length],
        local: 'Local ' + String.fromCharCode(65 + (j % 6)) + (j + 1), location: 'Armoire ' + String.fromCharCode(65 + (j % 6)) + (j + 1),
        status: j === 4 ? 'À contrôler' : 'En service', criticality: j < 2 ? 'Critique' : 'Standard',
        function: type === 'Luminaire' ? 'Éclairage industriel' : type === 'Câble' ? 'Distribution puissance' : 'Distribution et protection',
        power, voltage, current, dimensions: type === 'Armoire' ? '800 × 600 × 300 mm' : '', ip, elecClass: 'Classe I', conditions: 'Ambiance industrielle, 0 à 40 °C',
        manager: 'demo-t' + ((ci % 7) + 1), userId: 'demo-t' + (((ci + j) % 79) + 1),
        commissioned: d(-700 + j * 30), nextControl: d(30 + j * 25), specs: 'Fiche technique d\'exemple', documents: [],
        qrVersion: 1, qrDisabled: false, createdAt: ts(-40), updatedAt: ts(-4), createdBy: 'admin', labelPrints: 1, demo: true,
      });
    }
  });

  const vehicles = [];
  const PLATES = ['GK-482-MN', 'FT-119-QR', 'HJ-733-LP', 'DR-205-VB', 'KS-918-TC', 'LM-364-XA', 'NP-771-BD', 'QT-540-HG', 'RC-228-JK', 'SV-905-FN', 'TB-617-WL', 'VD-340-ZM', 'XB-118-CT', 'YR-662-PL', 'ZA-903-KV', 'BC-455-DF', 'DE-721-SN', 'FG-290-HJ', 'HL-537-QT', 'JM-884-RX'];
  const VT = ['Fourgon', 'Camionnette', 'Voiture', 'Utilitaire', 'Camion nacelle', 'Pick-up'];
  PLATES.forEach((plate, i) => {
    const site = SITES[i % SITES.length];
    vehicles.push({
      id: 'demo-v' + (i + 1), plate, brand: ['Renault', 'Peugeot', 'Ford', 'Citroën', 'Iveco', 'Toyota'][i % 6],
      model: ['Master', 'Boxer', 'Transit', 'Jumper', 'Daily', 'Hilux'][i % 6], type: VT[i % VT.length],
      siteId: site.id, assignedTo: i < 15 ? `demo-t${i + 1}` : '', km: 38000 + i * 7400,
      status: i === 7 ? 'Atelier' : i === 19 ? 'Hors service' : i < 15 ? 'Affecté' : 'Disponible',
      ct: d(-20 + i * 22), insurance: d(40 + i * 18), nextService: d(-5 + i * 20), nextServiceKm: 45000 + i * 7400 + 15000,
      fuel: i % 4 === 0 ? 'Électrique' : 'Diesel', notes: '', createdAt: ts(-300), updatedAt: ts(-10), createdBy: 'admin', demo: true,
    });
  });

  // Feuilles d'heures récentes (le détail des 24 derniers mois est dans l'agrégat « timelog »)
  const timesheets = [];
  for (let day = -1; day >= -12; day--) {
    const tech = technicians[(-day * 3) % 80];
    const ch = chantiers.filter((c) => c.siteId === tech.siteId && c.status !== 'Clôturé')[0];
    if (!ch) continue;
    const hh = 7 + (Math.abs(day) % 2);
    timesheets.push({
      id: `demo-f${Math.abs(day)}`, techId: tech.id, date: d(day), lines: [{ chantierId: ch.id, taskId: '', hours: hh, note: '' }], total: hh,
      comment: '', warnings: [], status: day % 4 === 0 ? 'Validée' : 'Envoyée', refusedReason: '', submittedBy: tech.id, submittedAt: ts(day), decidedBy: day % 4 === 0 ? 'admin' : '', decidedAt: day % 4 === 0 ? ts(day) : '', createdAt: ts(day), updatedAt: ts(day), history: [], demo: true,
    });
  }

  // Agrégat d'heures sur 24 mois, par site / chantier / technicien
  const months = {};
  const siteHours = {};
  SITES.forEach((s, i) => { siteHours[s.id] = 1500 + (i % 3) * 420; });
  for (let m = -23; m <= 0; m++) {
    const key = M(m);
    const seasonal = 0.82 + 0.18 * Math.abs(Math.sin((m + 24) / 3));
    const bySite = {}; const byChantier = {}; const byTech = {}; let total = 0;
    SITES.forEach((s) => {
      const v = Math.round(siteHours[s.id] * seasonal * (0.92 + rnd() * 0.16));
      bySite[s.id] = v; total += v;
      chantiers.filter((c) => c.siteId === s.id).forEach((c, idx) => {
        const part = idx === 0 ? 0.5 : idx === 1 ? 0.32 : 0.18;
        byChantier[c.id] = Math.round(v * part);
      });
      technicians.filter((t) => t.siteId === s.id).forEach((t) => { byTech[t.id] = Math.round((v / 12) * (0.7 + rnd() * 0.6)); });
    });
    months[key] = { total, bySite, byChantier, byTech };
  }

  // ---------- Documentation technique et sécurité ----------
  const DOCS = [
    ['Symboles électriques normalisés', 'Électricité', 'NF EN 60617', '4.1', 'Valide'],
    ['Schémas unifilaires types', 'Électricité', 'MIM-ELEC-UF', '2.3', 'Valide'],
    ['Repérage des circuits et câbles', 'Électricité', 'MIM-ELEC-REP', '1.8', 'Valide'],
    ['Sections et choix des câbles', 'Électricité', 'GUIDE-CABLE', '3.0', 'Valide'],
    ['Protections électriques et sélectivité', 'Électricité', 'MIM-ELEC-PRO', '2.0', 'À réviser'],
    ['Éclairage industriel – règles de pose', 'Électricité', 'MIM-ELEC-ECL', '1.4', 'Valide'],
    ['Chemins de câbles – mise en œuvre', 'Électricité', 'MIM-ELEC-CDC', '1.1', 'Valide'],
    ['Procédure de consignation', 'Sécurité', 'MIM-SEC-CONS', '5.2', 'Valide'],
    ['Prévention du risque électrique', 'Sécurité', 'MIM-SEC-RISQ', '3.6', 'Valide'],
    ['EPI et EPC – dotation', 'Sécurité', 'MIM-SEC-EPI', '2.2', 'Valide'],
    ['Travail en hauteur', 'Sécurité', 'MIM-SEC-TH', '1.9', 'Valide'],
    ['Plan de prévention type', 'Sécurité', 'MIM-SEC-PDP', '6.0', 'Valide'],
    ['Analyse de risques chantier', 'Sécurité', 'MIM-SEC-ADR', '2.7', 'À réviser'],
    ['Autorisation de travail – modèle', 'Sécurité', 'MIM-SEC-AT', '3.1', 'Valide'],
    ['Accès installations nucléaires', 'Nucléaire', 'MIM-NUC-ACC', '4.0', 'Valide'],
    ['Radioprotection – consignes générales', 'Nucléaire', 'MIM-NUC-RP', '2.5', 'Valide'],
    ['Traçabilité et documents qualité', 'Nucléaire', 'MIM-NUC-QUA', '1.7', 'Valide'],
    ['Procédures d\'intervention site', 'Nucléaire', 'MIM-NUC-INT', '3.3', 'Remplacé'],
  ];
  const documents = DOCS.map(([title, category, ref, version, status], i) => ({
    id: `demo-d${i + 1}`, title, category, ref, version, status,
    siteId: i % 3 === 0 ? SITES[i % SITES.length].id : '',
    owner: i % 2 ? 'Bureau d\'études' : 'QHSE',
    createdAt: d(-800 + i * 30), reviewAt: d(-20 + i * 45), notes: 'Document de référence interne.',
    link: '', tags: [category.toLowerCase()], createdAtTs: ts(-200), updatedAt: ts(-30), createdBy: 'admin', history: [], demo: true,
  }));

  const FLOWS = [
    ['Plan de prévention – Bugey', 'Plan de prévention', 'Envoi', 'EDF Bugey', 'Mimouni', 'demo-s4', 'demo-c10', 'Envoyé', true],
    ['Compte rendu – Tricastin S2', 'Compte rendu', 'Envoi', 'EDF Tricastin', 'Mimouni', 'demo-s2', 'demo-c4', 'Reçu', true],
    ['Attachement n°3 – Cruas', 'Attachement', 'Envoi', 'EDF Cruas', 'Mimouni', 'demo-s3', 'demo-c7', 'Envoyé', false],
    ['Bon de travaux – Romans', 'Bon de travaux', 'Réception', 'Mimouni', 'MécaRhône', 'demo-s6', 'demo-c12', 'Validé', true],
    ['Documents d\'accès – Paluel', 'Document d\'accès', 'Réception', 'Mimouni', 'EDF Paluel', 'demo-s1', 'demo-c1', 'Reçu', true],
    ['Dossier de fin de travaux – Cruas', 'Dossier de fin de travaux', 'Envoi', 'EDF Cruas', 'Mimouni', 'demo-s3', 'demo-c9', 'Validé', true],
    ['Relevé d\'heures – octobre', 'Relevé d\'heures', 'Envoi', 'MécaRhône', 'Mimouni', 'demo-s6', '', 'Envoyé', false],
    ['Certificats de conformité – Bordeaux', 'Certificat', 'Envoi', 'LogiSud', 'Mimouni', 'demo-s7', 'demo-c14', 'Attendu', false],
    ['Plans d\'exécution – Saint-Alban', 'Plan', 'Envoi', 'EDF Saint-Alban', 'Mimouni', 'demo-s5', 'demo-c11', 'Reçu', true],
    ['Rapport d\'intervention – Paluel', 'Rapport d\'intervention', 'Envoi', 'EDF Paluel', 'Mimouni', 'demo-s1', 'demo-c2', 'Envoyé', false],
    ['Bon de commande – Luminaires', 'Bon de commande', 'Réception', 'Mimouni', 'Philips', 'demo-s1', '', 'Reçu', true],
    ['Documents qualité – Bugey', 'Document qualité', 'Réception', 'Mimouni', 'EDF Bugey', 'demo-s4', 'demo-c10', 'Attendu', false],
  ];
  const docflows = FLOWS.map(([name, type, direction, to, from, siteId, chantierId, status, ack], i) => ({
    id: `demo-g${i + 1}`, name, type, direction, to, from, siteId, chantierId, status, ack,
    sentAt: d(-40 + i * 3), receivedAt: status === 'Reçu' || status === 'Validé' ? d(-38 + i * 3) : '',
    version: '1.' + (i % 3), owner: i % 2 ? 'C. Vidal' : 'S. Renard', notes: '', createdAt: ts(-40 + i * 3), updatedAt: ts(-20), demo: true,
  }));

  const MAINT = [
    ['Contrôle annuel armoire', 'Contrôle réglementaire', 5, 'Planifiée'],
    ['Thermographie infrarouge', 'Préventive', -3, 'Planifiée'],
    ['Remplacement disjoncteur', 'Corrective', 0, 'En cours'],
    ['Vérification isolement', 'Contrôle réglementaire', 14, 'Planifiée'],
    ['Maintenance luminaires', 'Préventive', 21, 'Planifiée'],
    ['Resserrage connexions', 'Préventive', -10, 'Réalisée'],
    ['Contrôle serrages TGBT', 'Contrôle réglementaire', 7, 'Planifiée'],
    ['Remplacement variateur', 'Corrective', 2, 'En cours'],
    ['Contrôle chemin de câbles', 'Préventive', 30, 'Planifiée'],
    ['Essais différentiels', 'Contrôle réglementaire', -1, 'Planifiée'],
    ['Mise à jour repérage', 'Préventive', 45, 'Planifiée'],
    ['Réparation capot armoire', 'Corrective', -6, 'Réalisée'],
    ['Nettoyage filtres ventilation', 'Préventive', 12, 'Planifiée'],
    ['Contrôle prises 63 A', 'Contrôle réglementaire', 28, 'Planifiée'],
  ];
  const TITLE_BY_CAT = {
    Armoire: 'Contrôle annuel armoire', Tableau: 'Resserrage connexions', 'Chemin de câbles': 'Contrôle chemin de câbles',
    Luminaire: 'Maintenance luminaires', Coffret: 'Essais différentiels', Câble: 'Vérification isolement',
    Transformateur: 'Thermographie infrarouge', Moteur: 'Remplacement variateur', Capteur: 'Étalonnage capteur', Prise: 'Contrôle prises 63 A',
  };
  const maintenances = MAINT.map(([title, kind, offset, status], i) => {
    const eq = equipment[(i * 5) % equipment.length];
    return {
      id: `demo-m${i + 1}`, equipId: eq.id, siteId: eq.siteId, chantierId: eq.chantierId, title: TITLE_BY_CAT[eq.category] || title, kind, status,
      dueDate: d(offset), doneAt: status === 'Réalisée' ? d(offset) : '', assignee: 'demo-t' + ((i % 20) + 1),
      provider: i % 4 === 0 ? 'Apave' : 'Interne', notes: '', createdAt: ts(-30), updatedAt: ts(-5), demo: true,
    };
  });

  const REPORTS = [
    ['Panne', 'Haute', 'Disjoncteur de départ déclenché à répétition', 'Ouvert'],
    ['Dégât', 'Normale', 'Capot d\'armoire déformé après choc chariot', 'En cours'],
    ['Demande de maintenance', 'Normale', 'Contrôle annuel à planifier', 'Ouvert'],
    ['Panne', 'Haute', 'Luminaire HS au-dessus de la ligne 2', 'En cours'],
    ['Transfert', 'Basse', 'Équipement à transférer vers le site de Romans', 'Ouvert'],
    ['Demande de réparation', 'Normale', 'Prise 63 A endommagée', 'Clos'],
    ['Panne', 'Normale', 'Défaut d\'isolement signalé au contrôle', 'Ouvert'],
    ['Dégât', 'Basse', 'Étiquette QR illisible', 'Clos'],
  ];
  const reports = REPORTS.map(([type, urgency, description, status], i) => {
    const eq = equipment[(i * 7 + 3) % equipment.length];
    return {
      id: `demo-r${i + 1}`, equipId: eq.id, siteId: eq.siteId, type, urgency, description, status,
      author: 'demo-t' + ((i * 3) % 60 + 10), authorName: 'Technicien terrain', photos: [],
      resolution: status === 'Clos' ? 'Traité par l\'équipe de maintenance.' : '', createdAt: ts(-20 + i * 2), closedAt: status === 'Clos' ? ts(-4) : '', demo: true,
    };
  });

  const movements = equipment.slice(0, 6).map((eq, i) => ({
    id: `demo-o${i + 1}`, equipId: eq.id, fromSite: eq.siteId, toSite: SITES[(SITES.findIndex((s) => s.id === eq.siteId) + 1) % SITES.length].id,
    fromLocation: eq.location, toLocation: 'Local B2', date: d(-60 + i * 8), author: 'admin', note: 'Transfert pour besoin chantier', createdAt: ts(-60 + i * 8), demo: true,
  }));

  return {
    collections: {
      sites, technicians, chantiers, tasks, assignments, absences, equipment, vehicles, timesheets,
      documents, docflows, maintenances, reports, movements,
      settings: [{ id: 'timelog', months, updatedAt: new Date().toISOString(), demo: true }],
    },
    history: [],
  };
}
