import { Router } from 'express';
import { pool } from '../lib/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, createError } from '../utils/http.js';
import { cleanNullableText, cleanText } from '../utils/sanitize.js';
import { getCompanyByOwner } from '../utils/company.js';
import { leadStatusSchema, leadUpdateSchema } from '../validators.js';

const router = Router();
router.use(requireAuth);

async function getLeadOrFail(client, leadId, companyId) {
  const result = await client.query(`select * from public.leads where id = $1 and company_id = $2 limit 1`, [leadId, companyId]);
  if (!result.rowCount) throw createError(404, 'Lead não encontrado.');
  return result.rows[0];
}

router.get('/', asyncHandler(async (req, res) => {
  const company = await getCompanyByOwner(pool, req.user.id);
  if (!company) throw createError(404, 'Empresa não encontrada.');

  const values = [company.id];
  const where = ['company_id = $1'];

  if (req.query.status) {
    values.push(req.query.status);
    where.push(`status = $${values.length}`);
  }

  if (req.query.search) {
    values.push(`%${req.query.search}%`);
    where.push(`(customer_name ilike $${values.length} or city ilike $${values.length} or category_name ilike $${values.length})`);
  }

  const result = await pool.query(
    `select * from public.leads where ${where.join(' and ')} order by created_at desc`,
    values
  );

  res.json({ leads: result.rows });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    const company = await getCompanyByOwner(client, req.user.id);
    if (!company) throw createError(404, 'Empresa não encontrada.');

    const lead = await getLeadOrFail(client, req.params.id, company.id);
    const history = await client.query(`select * from public.lead_history where lead_id = $1 order by created_at asc`, [req.params.id]);
    res.json({ lead: { ...lead, history: history.rows } });
  } finally {
    client.release();
  }
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    const company = await getCompanyByOwner(client, req.user.id);
    if (!company) throw createError(404, 'Empresa não encontrada.');
    const lead = await getLeadOrFail(client, req.params.id, company.id);

    const parsed = leadUpdateSchema.parse({
      customer_name: cleanText(req.body.customer_name),
      whatsapp: cleanText(req.body.whatsapp),
      city: cleanText(req.body.city),
      category_name: cleanText(req.body.category_name),
      summary: cleanText(req.body.summary),
      details: cleanNullableText(req.body.details),
    });

    await client.query(
      `update public.leads
       set customer_name = $1, whatsapp = $2, city = $3, category_name = $4, summary = $5, details = $6
       where id = $7 and company_id = $8`,
      [parsed.customer_name, parsed.whatsapp, parsed.city, parsed.category_name, parsed.summary, parsed.details, req.params.id, company.id]
    );

    await client.query(
      `insert into public.lead_history (lead_id, company_id, event_type, event_label, payload)
       values ($1, $2, 'edited', 'Solicitação editada', $3::jsonb)`,
      [req.params.id, company.id, JSON.stringify({ before: lead, after: parsed })]
    );

    const history = await client.query(`select * from public.lead_history where lead_id = $1 order by created_at asc`, [req.params.id]);
    const updated = await getLeadOrFail(client, req.params.id, company.id);
    res.json({ lead: { ...updated, history: history.rows } });
  } finally {
    client.release();
  }
}));

router.patch('/:id/status', asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    const company = await getCompanyByOwner(client, req.user.id);
    if (!company) throw createError(404, 'Empresa não encontrada.');
    const lead = await getLeadOrFail(client, req.params.id, company.id);
    const parsed = leadStatusSchema.parse({ status: req.body.status });

    let firstContactAt = lead.first_contact_at;
    let completedAt = lead.completed_at;
    let discardedAt = lead.discarded_at;
    if (parsed.status === 'em_atendimento' && !firstContactAt) firstContactAt = new Date().toISOString();
    if (parsed.status === 'concluido') completedAt = new Date().toISOString();
    if (parsed.status === 'descartado') discardedAt = new Date().toISOString();

    await client.query(
      `update public.leads
       set status = $1, first_contact_at = $2, completed_at = $3, discarded_at = $4
       where id = $5 and company_id = $6`,
      [parsed.status, firstContactAt, completedAt, discardedAt, req.params.id, company.id]
    );

    const labels = {
      novo: 'Status alterado para Novo',
      em_atendimento: 'Primeiro atendimento iniciado',
      concluido: 'Solicitação concluída',
      descartado: 'Solicitação descartada',
    };

    await client.query(
      `insert into public.lead_history (lead_id, company_id, event_type, event_label, payload)
       values ($1, $2, 'status_changed', $3, $4::jsonb)`,
      [req.params.id, company.id, labels[parsed.status], JSON.stringify({ from: lead.status, to: parsed.status })]
    );

    const history = await client.query(`select * from public.lead_history where lead_id = $1 order by created_at asc`, [req.params.id]);
    const updated = await getLeadOrFail(client, req.params.id, company.id);
    res.json({ lead: { ...updated, history: history.rows } });
  } finally {
    client.release();
  }
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const company = await getCompanyByOwner(pool, req.user.id);
  if (!company) throw createError(404, 'Empresa não encontrada.');
  await pool.query(`delete from public.leads where id = $1 and company_id = $2`, [req.params.id, company.id]);
  res.status(204).send();
}));

export default router;
