// Sauvegarde automatique quotidienne (fonction planifiée Netlify).
// Conserve les 30 dernières sauvegardes automatiques.
import * as db from '../lib/db.mjs';
import { sendDailyDigest } from '../lib/notifs.mjs';

export default async () => {
  const at = new Date().toISOString();
  const name = 'auto-' + at.slice(0, 10);
  const data = await db.snapshot();
  await db.putBackup(name, { name, at, by: 'automatique', data });
  const autos = (await db.listBackups()).filter((n) => n.startsWith('auto-')).sort().reverse();
  for (const old of autos.slice(30)) await db.deleteKey('backups/' + old);
  await db.journal({ who: 'système', role: '', action: 'sauvegarde automatique', entity: 'sauvegarde', id: name, detail: '' });
  // Synthèse quotidienne des alertes par email. Un échec d'envoi ne doit jamais
  // faire échouer la sauvegarde.
  try {
    await sendDailyDigest({});
  } catch (e) {
    await db.journal({ who: 'système', role: '', action: 'synthèse email en échec', entity: 'notification', id: name, detail: String(e && e.message || e).slice(0, 300) }).catch(() => {});
  }
  return new Response('ok');
};

export const config = { schedule: '@daily' };
