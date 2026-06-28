import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
const port = process.env.PORT || 3000;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

app.use(cors({ origin: process.env.FRONTEND_URL?.split(',') || true, credentials: true }));
app.use(express.json());

function normalizeCompanyPayload(payload) {
  return {
    company_name: payload.company_name,
    slug: payload.slug,
    logo_url: payload.logo_url,
    cover_url: payload.cover_url,
    presentation_text: payload.presentation_text,
    business_hours: payload.business_hours,
    response_message: payload.response_message,
    primary_color: payload.primary_color,
    secondary_color: payload.secondary_color,
  };
}

async function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Token ausente.' });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ message: 'Token inválido.' });
  req.user = data.user;
  next();
}

async function getCompanyByOwner(ownerId) {
  const { data, error } = await supabase.from('companies').select('*').eq('owner_user_id', ownerId).single();
  if (error) throw error;
  return data;
}

async function getCompanyBySlug(slug) {
  const { data, error } = await supabase.from('companies').select('*').eq('slug', slug).eq('is_active', true).single();
  if (error) throw error;
  return data;
}

async function getCompanyBranches(companyId) {
  const { data, error } = await supabase
    .from('company_branches')
    .select('sort_order, branches(id, name, slug)')
    .eq('company_id', companyId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data || []).map((item) => item.branches).filter(Boolean);
}

async function getCompanyServices(companyId) {
  const { data, error } = await supabase
    .from('company_services')
    .select('branch_id, sort_order, display_name, services(id, name, description, branch_id)')
    .eq('company_id', companyId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data || []).map((item) => ({
    id: item.services?.id,
    name: item.display_name || item.services?.name,
    description: item.services?.description,
    branch_id: item.branch_id || item.services?.branch_id,
  })).filter((item) => item.id);
}

async function getBranchNames(ids = []) {
  if (!ids.length) return [];
  const { data } = await supabase.from('branches').select('id, name').in('id', ids);
  return (data || []).map((item) => item.name);
}

async function getServiceNames(ids = []) {
  if (!ids.length) return [];
  const { data } = await supabase.from('services').select('id, name').in('id', ids);
  return (data || []).map((item) => item.name);
}

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/api/public/:slug', async (req, res) => {
  try {
    const company = await getCompanyBySlug(req.params.slug);
    const branches = await getCompanyBranches(company.id);
    const services = await getCompanyServices(company.id);
    res.json({ company: { ...company, branches, services } });
  } catch (error) {
    res.status(404).json({ message: 'Página não encontrada.', detail: error.message });
  }
});

app.post('/api/public/:slug/leads', async (req, res) => {
  try {
    const company = await getCompanyBySlug(req.params.slug);
    const branch_ids = req.body.branch_ids || [];
    const service_ids = req.body.service_ids || [];
    const payload = {
      company_id: company.id,
      customer_name: req.body.customer_name,
      customer_whatsapp: req.body.customer_whatsapp,
      city: req.body.city,
      selected_branch_ids: branch_ids,
      selected_service_ids: service_ids,
      selected_branch_names: await getBranchNames(branch_ids),
      selected_service_names: await getServiceNames(service_ids),
      note: req.body.note || null,
      status: 'novo',
    };
    const { data, error } = await supabase.from('leads').insert(payload).select('*').single();
    if (error) throw error;

    await supabase.from('notifications').insert({
      company_id: company.id,
      lead_id: data.id,
      title: 'Novo lead recebido',
      body: `${payload.customer_name} enviou uma solicitação em ${payload.city}.`,
    });

    res.status(201).json({ message: 'Lead criado com sucesso.', lead: data });
  } catch (error) {
    res.status(400).json({ message: 'Não foi possível salvar o lead.', detail: error.message });
  }
});

app.get('/api/dashboard/summary', auth, async (req, res) => {
  try {
    const company = await getCompanyByOwner(req.user.id);
    const { data: leads } = await supabase.from('leads').select('*').eq('company_id', company.id).order('created_at', { ascending: false });
    const todayPrefix = new Date().toISOString().slice(0, 10);
    res.json({
      totals: {
        leads: leads?.length || 0,
        newLeads: (leads || []).filter((item) => item.status === 'novo').length,
        inProgress: (leads || []).filter((item) => item.status === 'em_contato').length,
        today: (leads || []).filter((item) => (item.created_at || '').startsWith(todayPrefix)).length,
      },
      latestLeads: (leads || []).slice(0, 5),
    });
  } catch (error) {
    res.status(400).json({ message: 'Erro ao carregar dashboard.', detail: error.message });
  }
});

app.get('/api/dashboard/leads', auth, async (req, res) => {
  try {
    const company = await getCompanyByOwner(req.user.id);
    const { data, error } = await supabase.from('leads').select('*').eq('company_id', company.id).order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ items: data || [] });
  } catch (error) {
    res.status(400).json({ message: 'Erro ao carregar leads.', detail: error.message });
  }
});

app.patch('/api/dashboard/leads/:id', auth, async (req, res) => {
  try {
    const company = await getCompanyByOwner(req.user.id);
    const { data, error } = await supabase
      .from('leads')
      .update({ status: req.body.status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('company_id', company.id)
      .select('*')
      .single();
    if (error) throw error;
    res.json({ item: data });
  } catch (error) {
    res.status(400).json({ message: 'Erro ao atualizar lead.', detail: error.message });
  }
});

app.get('/api/dashboard/company', auth, async (req, res) => {
  try {
    const company = await getCompanyByOwner(req.user.id);
    res.json({ company });
  } catch (error) {
    res.status(400).json({ message: 'Erro ao carregar empresa.', detail: error.message });
  }
});

app.put('/api/dashboard/company', auth, async (req, res) => {
  try {
    const company = await getCompanyByOwner(req.user.id);
    const { data, error } = await supabase
      .from('companies')
      .update({ ...normalizeCompanyPayload(req.body), updated_at: new Date().toISOString() })
      .eq('id', company.id)
      .select('*')
      .single();
    if (error) throw error;
    res.json({ company: data });
  } catch (error) {
    res.status(400).json({ message: 'Erro ao salvar empresa.', detail: error.message });
  }
});

app.get('/api/dashboard/profile', auth, async (req, res) => {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', req.user.id).single();
  if (error) return res.status(400).json({ message: 'Erro ao carregar perfil.', detail: error.message });
  res.json({ profile: data });
});

app.put('/api/dashboard/profile', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ full_name: req.body.full_name, whatsapp: req.body.whatsapp, updated_at: new Date().toISOString() })
    .eq('id', req.user.id)
    .select('*')
    .single();
  if (error) return res.status(400).json({ message: 'Erro ao salvar perfil.', detail: error.message });
  res.json({ profile: data });
});

app.get('/api/dashboard/branches', auth, async (req, res) => {
  try {
    const company = await getCompanyByOwner(req.user.id);
    const items = await getCompanyBranches(company.id);
    res.json({ items });
  } catch (error) {
    res.status(400).json({ message: 'Erro ao carregar ramos.', detail: error.message });
  }
});

app.put('/api/dashboard/branches', auth, async (req, res) => {
  try {
    const company = await getCompanyByOwner(req.user.id);
    await supabase.from('company_branches').delete().eq('company_id', company.id);
    const rows = (req.body.branch_ids || []).map((branch_id, index) => ({ company_id: company.id, branch_id, sort_order: index + 1 }));
    if (rows.length) await supabase.from('company_branches').insert(rows);
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ message: 'Erro ao salvar ramos.', detail: error.message });
  }
});

app.get('/api/dashboard/services', auth, async (req, res) => {
  try {
    const company = await getCompanyByOwner(req.user.id);
    const items = await getCompanyServices(company.id);
    res.json({ items });
  } catch (error) {
    res.status(400).json({ message: 'Erro ao carregar serviços.', detail: error.message });
  }
});

app.put('/api/dashboard/services', auth, async (req, res) => {
  try {
    const company = await getCompanyByOwner(req.user.id);
    await supabase.from('company_services').delete().eq('company_id', company.id);
    const rows = (req.body.items || []).map((item, index) => ({
      company_id: company.id,
      service_id: item.service_id,
      branch_id: item.branch_id,
      display_name: item.display_name || null,
      sort_order: index + 1,
    }));
    if (rows.length) await supabase.from('company_services').insert(rows);
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ message: 'Erro ao salvar serviços.', detail: error.message });
  }
});

app.listen(port, () => {
  console.log(`Dimensy API rodando na porta ${port}`);
});
