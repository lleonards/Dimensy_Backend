import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { pool } from '../lib/pool.js';
import { sendLeadNotification } from '../lib/push.js';
import { asyncHandler, createError } from '../utils/http.js';
import { mapCompany } from '../utils/company.js';
import { cleanNullableText, cleanText } from '../utils/sanitize.js';
import { publicLeadSchema } from '../validators.js';

const router = Router();
const publicLeadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
});

router.get('/:slug', asyncHandler(async (req, res) => {
  const companyResult = await pool.query(`select * from public.companies where slug = $1 limit 1`, [req.params.slug]);
  if (!companyResult.rowCount) throw createError(404, 'Empresa não encontrada.');

  const company = companyResult.rows[0];
  const categories = await pool.query(`select id, name, example_text, sort_order from public.categories where company_id = $1 order by sort_order asc`, [company.id]);
  res.json({ company: mapCompany(company), categories: categories.rows });
}));

router.post('/:slug/leads', publicLeadLimiter, asyncHandler(async (req, res) => {
  const companyResult = await pool.query(`select * from public.companies where slug = $1 limit 1`, [req.params.slug]);
  if (!companyResult.rowCount) throw createError(404, 'Empresa não encontrada.');
  const company = companyResult.rows[0];

  const parsed = publicLeadSchema.parse({
    customer_name: cleanText(req.body.customer_name),
    whatsapp: cleanText(req.body.whatsapp),
    city: cleanText(req.body.city),
    category_id: req.body.category_id,
    summary: cleanText(req.body.summary),
    details: cleanNullableText(req.body.details),
    website: cleanNullableText(req.body.website),
  });

  if (parsed.website) throw createError(400, 'Envio inválido.');

  const categoryResult = await pool.query(`select * from public.categories where id = $1 and company_id = $2 limit 1`, [parsed.category_id, company.id]);
  if (!categoryResult.rowCount) throw createError(400, 'Categoria inválida.');
  const category = categoryResult.rows[0];

  const client = await pool.connect();
  try {
    await client.query('begin');
    const insertLead = await client.query(
      `insert into public.leads (company_id, customer_name, whatsapp, city, category_id, category_name, summary, details, source)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       returning *`,
      [
        company.id,
        parsed.customer_name,
        parsed.whatsapp,
        parsed.city,
        parsed.category_id,
        category.name,
        parsed.summary,
        parsed.details,
        req.headers.origin || req.headers.referer || 'landing_page',
      ]
    );

    const lead = insertLead.rows[0];
    await client.query(
      `insert into public.lead_history (lead_id, company_id, event_type, event_label, payload)
       values ($1, $2, 'created', 'Solicitação recebida', $3::jsonb)`,
      [lead.id, company.id, JSON.stringify({ source: lead.source })]
    );

    await client.query('commit');
    sendLeadNotification({ companyId: company.id, companyName: company.name, lead }).catch(() => null);
    res.status(201).json({ leadId: lead.id, message: 'Solicitação enviada com sucesso.' });
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}));

export default router;
