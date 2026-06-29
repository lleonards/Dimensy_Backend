const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

// POST /api/leads — cliente envia formulário (rota pública)
router.post('/', async (req, res) => {
  const { company_id, name, whatsapp, city, branches_selected, services_selected, observation } = req.body;

  if (!company_id || !name || !whatsapp || !city) {
    return res.status(400).json({ error: 'company_id, name, whatsapp e city são obrigatórios.' });
  }

  const { data: lead, error } = await supabase
    .from('leads')
    .insert({
      company_id,
      name,
      whatsapp,
      city,
      branches_selected: branches_selected || [],
      services_selected: services_selected || [],
      observation: observation || null,
      status: 'novo',
    })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  // Cria notificação para o prestador
  await supabase.from('notifications').insert({
    company_id,
    lead_id: lead.id,
    message: `Novo lead de ${name} (${city})`,
    read: false,
  });

  return res.status(201).json({ lead, message: 'Solicitação enviada com sucesso!' });
});

// GET /api/leads/company/:companyId — lista leads da empresa
router.get('/company/:companyId', requireAuth, async (req, res) => {
  const { companyId } = req.params;
  const { status, page = 1, limit = 20 } = req.query;

  const { data: company } = await supabase
    .from('companies')
    .select('user_id')
    .eq('id', companyId)
    .single();
  if (!company || company.user_id !== req.user.id) return res.status(403).json({ error: 'Sem permissão.' });

  let query = supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (status) query = query.eq('status', status);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });

  return res.json({ leads: data, total: count, page: Number(page), limit: Number(limit) });
});

// GET /api/leads/:id — busca lead específico
router.get('/:id', requireAuth, async (req, res) => {
  const { data: lead, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error || !lead) return res.status(404).json({ error: 'Lead não encontrado.' });

  const { data: company } = await supabase
    .from('companies')
    .select('user_id')
    .eq('id', lead.company_id)
    .single();
  if (!company || company.user_id !== req.user.id) return res.status(403).json({ error: 'Sem permissão.' });

  return res.json({ lead });
});

// PATCH /api/leads/:id/status — atualiza status do lead
router.patch('/:id/status', requireAuth, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['novo', 'em_contato', 'fechado', 'cancelado'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Status deve ser um de: ${validStatuses.join(', ')}` });
  }

  const { data: lead } = await supabase
    .from('leads')
    .select('company_id')
    .eq('id', req.params.id)
    .single();

  if (!lead) return res.status(404).json({ error: 'Lead não encontrado.' });

  const { data: company } = await supabase
    .from('companies')
    .select('user_id')
    .eq('id', lead.company_id)
    .single();
  if (!company || company.user_id !== req.user.id) return res.status(403).json({ error: 'Sem permissão.' });

  const { data, error } = await supabase
    .from('leads')
    .update({ status })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ lead: data });
});

module.exports = router;
