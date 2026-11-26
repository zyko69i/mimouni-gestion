// Sauvegarde automatique quotidienne (cron Vercel, voir vercel.json).
import job from '../netlify/functions/sauvegarde-auto.mjs';

export async function GET(req) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Non autorisé', { status: 401 });
  }
  return job();
}
