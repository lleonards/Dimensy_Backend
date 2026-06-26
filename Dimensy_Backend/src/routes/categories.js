import { Router } from 'express';
import { pool } from '../lib/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, createError } from '../utils/http.js';
import { cleanNullableText, cleanText } from '../utils/sanitize.js';
import { getCompanyByOwner } from '../utils/company.js';
import { categorySchema } from '../validators.js';

const router = Router();
router.use(requireAuth);

async function listCategories(client, companyId) {
  const result = await client.query(`select * from public.categories where company_id = $1 order by sort_order asc, created_at asc`, [companyId]);
  return result.rows;
}

router.get('/', asyncHandler(async (req, res) => {
  const company = await getCompanyByOwner(pool, req.user.id);
  if (!company) throw createError(404, 'Empresa não encontrada.');
  res.json({ categories: await listCategories(pool, company.id) });
}));

router.post('/', asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    const company = await getCompanyByOwner(client, req.user.id);
    if (!company) throw createError(404, 'Empresa não encontrada.');

    const parsed = categorySchema.parse({
      name: cleanText(req.body.name),
      example_text: cleanNullableText(req.body.example_text),
    });

    const orderResult = await client.query(`select coalesce(max(sort_order), 0) as max_order from public.categories where company_id = $1`, [company.id]);
    const nextOrder = Number(orderResult.rows[0].max_order) + 1;

    await client.query(
      `insert into public.categories (company_id, name, example_text, sort_order)
       values ($1, $2, $3, $4)`,
      [company.id, parsed.name, parsed.example_text, nextOrder]
    );

    res.status(201).json({ categories: await listCategories(client, company.id) });
  } finally {
    client.release();
  }
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    const company = await getCompanyByOwner(client, req.user.id);
    if (!company) throw createError(404, 'Empresa não encontrada.');

    const parsed = categorySchema.partial().parse({
      name: req.body.name ? cleanText(req.body.name) : undefined,
      example_text: req.body.example_text !== undefined ? cleanNullableText(req.body.example_text) : undefined,
    });

    const categoryResult = await client.query(`select * from public.categories where id = $1 and company_id = $2 limit 1`, [req.params.id, company.id]);
    if (!categoryResult.rowCount) throw createError(404, 'Categoria não encontrada.');
    const current = categoryResult.rows[0];

    await client.query(
      `update public.categories set name = $1, example_text = $2 where id = $3 and company_id = $4`,
      [parsed.name ?? current.name, parsed.example_text ?? current.example_text, req.params.id, company.id]
    );

    res.json({ categories: await listCategories(client, company.id) });
  } finally {
    client.release();
  }
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    const company = await getCompanyByOwner(client, req.user.id);
    if (!company) throw createError(404, 'Empresa não encontrada.');
    await client.query(`delete from public.categories where id = $1 and company_id = $2`, [req.params.id, company.id]);
    res.json({ categories: await listCategories(client, company.id) });
  } finally {
    client.release();
  }
}));

router.post('/:id/move', asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    const company = await getCompanyByOwner(client, req.user.id);
    if (!company) throw createError(404, 'Empresa não encontrada.');

    const direction = req.body.direction;
    if (!['up', 'down'].includes(direction)) throw createError(400, 'Direção inválida.');

    const categories = await listCategories(client, company.id);
    const index = categories.findIndex((item) => item.id === req.params.id);
    if (index === -1) throw createError(404, 'Categoria não encontrada.');

    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= categories.length) {
      return res.json({ categories });
    }

    const current = categories[index];
    const target = categories[swapIndex];

    await client.query('begin');
    await client.query(`update public.categories set sort_order = $1 where id = $2`, [target.sort_order, current.id]);
    await client.query(`update public.categories set sort_order = $1 where id = $2`, [current.sort_order, target.id]);
    await client.query('commit');

    res.json({ categories: await listCategories(client, company.id) });
  } catch (error) {
    await client.query('rollback').catch(() => null);
    throw error;
  } finally {
    client.release();
  }
}));

export default router;
