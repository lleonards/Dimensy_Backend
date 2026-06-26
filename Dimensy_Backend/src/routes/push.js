import { Router } from 'express';
import { pool } from '../lib/pool.js';
import { getPublicVapidKey } from '../lib/push.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, createError } from '../utils/http.js';
import { getCompanyByOwner } from '../utils/company.js';
import { pushSubscriptionSchema } from '../validators.js';

const router = Router();
router.use(requireAuth);

router.get('/public-key', asyncHandler(async (_req, res) => {
  res.json({ publicKey: await getPublicVapidKey() });
}));

router.post('/subscribe', asyncHandler(async (req, res) => {
  const company = await getCompanyByOwner(pool, req.user.id);
  if (!company) throw createError(404, 'Empresa não encontrada.');

  const parsed = pushSubscriptionSchema.parse(req.body);
  await pool.query(
    `insert into public.push_subscriptions (company_id, user_id, endpoint, p256dh, auth_key, expiration_time, user_agent)
     values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (endpoint) do update set company_id = excluded.company_id, user_id = excluded.user_id,
       p256dh = excluded.p256dh, auth_key = excluded.auth_key, expiration_time = excluded.expiration_time,
       user_agent = excluded.user_agent, updated_at = now()`,
    [
      company.id,
      req.user.id,
      parsed.subscription.endpoint,
      parsed.subscription.keys.p256dh,
      parsed.subscription.keys.auth,
      parsed.subscription.expirationTime ? String(parsed.subscription.expirationTime) : null,
      req.headers['user-agent'] || '',
    ]
  );

  res.status(201).json({ message: 'Notificações ativadas com sucesso.' });
}));

export default router;
