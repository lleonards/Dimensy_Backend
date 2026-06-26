import webpush from 'web-push';
import { pool } from './pool.js';

let cachedKeys = null;

async function getKeys() {
  if (cachedKeys) return cachedKeys;

  const existing = await pool.query(`select value from public.app_settings where key = 'vapid_keys' limit 1`);
  if (existing.rowCount) {
    cachedKeys = existing.rows[0].value;
    webpush.setVapidDetails('mailto:suporte@dimensy.app', cachedKeys.publicKey, cachedKeys.privateKey);
    return cachedKeys;
  }

  const keys = webpush.generateVAPIDKeys();
  await pool.query(
    `insert into public.app_settings (key, value) values ('vapid_keys', $1::jsonb)
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [JSON.stringify(keys)]
  );
  cachedKeys = keys;
  webpush.setVapidDetails('mailto:suporte@dimensy.app', keys.publicKey, keys.privateKey);
  return keys;
}

export async function getPublicVapidKey() {
  const keys = await getKeys();
  return keys.publicKey;
}

export async function sendLeadNotification({ companyId, companyName, lead }) {
  const keys = await getKeys();
  webpush.setVapidDetails('mailto:suporte@dimensy.app', keys.publicKey, keys.privateKey);

  const subscriptions = await pool.query(
    `select endpoint, p256dh, auth_key from public.push_subscriptions where company_id = $1`,
    [companyId]
  );

  const payload = JSON.stringify({
    title: 'Novo lead recebido',
    body: `${lead.customer_name} enviou uma solicitação para ${companyName}.`,
    url: `/app/leads`,
    leadId: lead.id,
  });

  await Promise.all(
    subscriptions.rows.map(async (subscription) => {
      try {
        await webpush.sendNotification({
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth_key },
        }, payload);
      } catch (error) {
        if ([404, 410].includes(error.statusCode)) {
          await pool.query(`delete from public.push_subscriptions where endpoint = $1`, [subscription.endpoint]);
        }
      }
    })
  );
}
