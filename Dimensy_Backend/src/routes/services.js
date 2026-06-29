const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

// GET /api/services — lista todos os serviços da biblioteca (com ramo)
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('services')
    .select('id, name, branch_id, branches(name)')
    .order('name');
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ services: data });
});

// GET /api/services/company/:companyId — serviços da empresa
router.get('/company/:companyId', requireAuth, async (req, res) => {
  const { companyId } = req.params;

  const { data: company } = await supabase
    .from('companies')
    .select('user_id')
    .eq('id', companyId)
    .single();
  if (!company || company.user_id !== req.user.id) return res.status(403).json({ error: 'Sem permissão.' });

  const { data, error } = await supabase
    .from('company_services')
    .select('id, is_active, services(id, name, branch_id, branches(name))')
    .eq('company_id', companyId);

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ services: data });
});

// POST /api/services/company/:companyId — adiciona serviço personalizado
router.post('/company/:companyId', requireAuth, async (req, res) => {
  const { companyId } = req.params;
  const { name, branch_id } = req.body;

  if (!name || !branch_id) return res.status(400).json({ error: 'name e branch_id são obrigatórios.' });

  const { data: company } = await supabase
    .from('companies')
    .select('user_id')
    .eq('id', companyId)
    .single();
  if (!company || company.user_id !== req.user.id) return res.status(403).json({ error: 'Sem permissão.' });

  // Cria serviço customizado
  const { data: service, error: sErr } = await supabase
    .from('services')
    .insert({ name, branch_id, is_custom: true, created_by_company: companyId })
    .select()
    .single();

  if (sErr) return res.status(400).json({ error: sErr.message });

  const { data: cs, error: csErr } = await supabase
    .from('company_services')
    .insert({ company_id: companyId, service_id: service.id, is_active: true })
    .select()
    .single();

  if (csErr) return res.status(400).json({ error: csErr.message });
  return res.status(201).json({ service: cs });
});

// PATCH /api/services/company/:companyId/:serviceId — ativa/desativa serviço
router.patch('/company/:companyId/:serviceId', requireAuth, async (req, res) => {
  const { companyId, serviceId } = req.params;
  const { is_active } = req.body;

  const { data: company } = await supabase
    .from('companies')
    .select('user_id')
    .eq('id', companyId)
    .single();
  if (!company || company.user_id !== req.user.id) return res.status(403).json({ error: 'Sem permissão.' });

  const { data, error } = await supabase
    .from('company_services')
    .update({ is_active })
    .eq('company_id', companyId)
    .eq('service_id', serviceId)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ service: data });
});

// DELETE /api/services/company/:companyId/:serviceId — remove serviço
router.delete('/company/:companyId/:serviceId', requireAuth, async (req, res) => {
  const { companyId, serviceId } = req.params;

  const { data: company } = await supabase
    .from('companies')
    .select('user_id')
    .eq('id', companyId)
    .single();
  if (!company || company.user_id !== req.user.id) return res.status(403).json({ error: 'Sem permissão.' });

  await supabase
    .from('company_services')
    .delete()
    .eq('company_id', companyId)
    .eq('service_id', serviceId);

  return res.json({ message: 'Serviço removido.' });
});

module.exports = router;
