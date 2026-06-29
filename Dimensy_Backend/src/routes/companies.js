const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

// GET /api/companies/me — busca empresa do usuário logado
router.get('/me', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('user_id', req.user.id)
    .single();

  if (error && error.code !== 'PGRST116') return res.status(500).json({ error: error.message });
  return res.json({ company: data || null });
});

// POST /api/companies — cria empresa
router.post('/', requireAuth, async (req, res) => {
  const { name, slug, logo_url, cover_url, description, primary_color, secondary_color,
    business_hours, response_time_message, whatsapp } = req.body;

  if (!name || !slug) {
    return res.status(400).json({ error: 'name e slug são obrigatórios.' });
  }

  // Verifica slug único
  const { data: existing } = await supabase
    .from('companies')
    .select('id')
    .eq('slug', slug)
    .single();

  if (existing) return res.status(409).json({ error: 'Slug já está em uso.' });

  const { data, error } = await supabase
    .from('companies')
    .insert({
      user_id: req.user.id,
      name,
      slug,
      logo_url,
      cover_url,
      description,
      primary_color: primary_color || '#1D4ED8',
      secondary_color: secondary_color || '#FFFFFF',
      business_hours,
      response_time_message: response_time_message || 'Entraremos em contato em até 12 horas pelo WhatsApp informado.',
      whatsapp,
    })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json({ company: data });
});

// PUT /api/companies/:id — atualiza empresa
router.put('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  const { data: existing, error: checkError } = await supabase
    .from('companies')
    .select('user_id')
    .eq('id', id)
    .single();

  if (checkError || !existing) return res.status(404).json({ error: 'Empresa não encontrada.' });
  if (existing.user_id !== req.user.id) return res.status(403).json({ error: 'Sem permissão.' });

  const allowedFields = ['name', 'logo_url', 'cover_url', 'description', 'primary_color',
    'secondary_color', 'business_hours', 'response_time_message', 'whatsapp'];
  const updates = {};
  allowedFields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  const { data, error } = await supabase
    .from('companies')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ company: data });
});

// GET /api/companies/slug/:slug — página pública
router.get('/slug/:slug', async (req, res) => {
  const { data, error } = await supabase
    .from('companies')
    .select(`
      id, name, slug, logo_url, cover_url, description,
      primary_color, secondary_color, business_hours, response_time_message,
      company_branches (
        id,
        branches ( id, name )
      ),
      company_services (
        id, is_active,
        services ( id, name, branch_id )
      )
    `)
    .eq('slug', req.params.slug)
    .single();

  if (error) return res.status(404).json({ error: 'Empresa não encontrada.' });
  return res.json({ company: data });
});

module.exports = router;
