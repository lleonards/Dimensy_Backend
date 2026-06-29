const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');
const webpush = require('web-push');

try {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} catch (err) {
  console.warn('⚠️ Notificações Push desativadas temporariamente:', err.message);
}

// GET /api/notifications/company/:companyId
router.get('/company/:companyId', requireAuth, async (req, res) => {
  const { companyId } = req.params;

  const { data: company } = await supabase
    .from('companies')
    .select('user_id')
    .eq('id', companyId)
    .single();
  if (!company || company.user_id !== req.user.id) return res.status(403).json({ error: 'Sem permissão.' });

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ notifications: data });
});

// PATCH /api/notifications/:id/read — marca como lida
router.patch('/:id/read', requireAuth, async (req, res) => {
  const { data: notif } = await supabase
    .from('notifications')
    .select('company_id')
    .eq('id', req.params.id)
    .single();

  if (!notif) return res.status(404).json({ error: 'Notificação não encontrada.' });

  const { data: company } = await supabase
    .from('companies')
    .select('user_id')
    .eq('id', notif.company_id)
    .single();
  if (!company || company.user_id !== req.user.id) return res.status(403).json({ error: 'Sem permissão.' });

  await supabase.from('notifications').update({ read: true }).eq('id', req.params.id);
  return res.json({ message: 'Marcada como lida.' });
});

// PATCH /api/notifications/company/:companyId/read-all
router.patch('/company/:companyId/read-all', requireAuth, async (req, res) => {
  const { companyId } = req.params;

  const { data: company } = await supabase
    .from('companies')
    .select('user_id')
    .eq('id', companyId)
    .single();
  if (!company || company.user_id !== req.user.id) return res.status(403).json({ error: 'Sem permissão.' });

  await supabase.from('notifications').update({ read: true }).eq('company_id', companyId).eq('read', false);
  return res.json({ message: 'Todas marcadas como lidas.' });
});

// POST /api/notifications/subscribe — salva subscription de push
router.post('/subscribe', requireAuth, async (req, res) => {
  const { company_id, subscription } = req.body;
  if (!company_id || !subscription) return res.status(400).json({ error: 'company_id e subscription são obrigatórios.' });

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ company_id, subscription: JSON.stringify(subscription) }, { onConflict: 'company_id' });

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ message: 'Subscription salva.' });
});

// Função interna para enviar push (usada pelo lead route via import direto do supabase)
async function sendPushToCompany(companyId, payload) {
  const { data } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('company_id', companyId)
    .single();

  if (!data) return;

  try {
    await webpush.sendNotification(JSON.parse(data.subscription), JSON.stringify(payload));
  } catch (err) {
    if (err.statusCode === 410) {
      await supabase.from('push_subscriptions').delete().eq('company_id', companyId);
    }
  }
}

module.exports = router;
module.exports.sendPushToCompany = sendPushToCompany;
