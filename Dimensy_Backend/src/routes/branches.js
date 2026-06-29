const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

// GET /api/branches — lista todos os ramos da biblioteca
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('branches')
    .select('id, name')
    .order('name');
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ branches: data });
});

// GET /api/branches/company/:companyId — ramos ativos da empresa
router.get('/company/:companyId', requireAuth, async (req, res) => {
  const { companyId } = req.params;

  const { data: company } = await supabase
    .from('companies')
    .select('user_id')
    .eq('id', companyId)
    .single();
  if (!company || company.user_id !== req.user.id) return res.status(403).json({ error: 'Sem permissão.' });

  const { data, error } = await supabase
    .from('company_branches')
    .select('id, branches(id, name)')
    .eq('company_id', companyId);

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ branches: data });
});

// POST /api/branches/company/:companyId — adiciona ramo à empresa
router.post('/company/:companyId', requireAuth, async (req, res) => {
  const { companyId } = req.params;
  const { branch_id } = req.body;

  const { data: company } = await supabase
    .from('companies')
    .select('user_id')
    .eq('id', companyId)
    .single();
  if (!company || company.user_id !== req.user.id) return res.status(403).json({ error: 'Sem permissão.' });

  // Busca serviços do ramo e adiciona automaticamente
  const { data: branchServices } = await supabase
    .from('services')
    .select('id')
    .eq('branch_id', branch_id);

  const { data: cb, error } = await supabase
    .from('company_branches')
    .insert({ company_id: companyId, branch_id })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  if (branchServices && branchServices.length > 0) {
    const companyServices = branchServices.map(s => ({
      company_id: companyId,
      service_id: s.id,
      is_active: true,
    }));
    await supabase.from('company_services').upsert(companyServices, { onConflict: 'company_id,service_id' });
  }

  return res.status(201).json({ company_branch: cb });
});

// DELETE /api/branches/company/:companyId/:branchId — remove ramo da empresa
router.delete('/company/:companyId/:branchId', requireAuth, async (req, res) => {
  const { companyId, branchId } = req.params;

  const { data: company } = await supabase
    .from('companies')
    .select('user_id')
    .eq('id', companyId)
    .single();
  if (!company || company.user_id !== req.user.id) return res.status(403).json({ error: 'Sem permissão.' });

  await supabase
    .from('company_branches')
    .delete()
    .eq('company_id', companyId)
    .eq('branch_id', branchId);

  // Remove serviços do ramo
  const { data: branchServices } = await supabase
    .from('services')
    .select('id')
    .eq('branch_id', branchId);

  if (branchServices && branchServices.length > 0) {
    const serviceIds = branchServices.map(s => s.id);
    await supabase
      .from('company_services')
      .delete()
      .eq('company_id', companyId)
      .in('service_id', serviceIds);
  }

  return res.json({ message: 'Ramo removido.' });
});

module.exports = router;
