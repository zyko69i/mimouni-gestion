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

  return { collections: { technicians, chantiers: [], tasks: [], assignments: [], absences: [], equipment: [] }, history: [] };
}
