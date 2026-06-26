import { Router } from 'express';
import { pool } from '../lib/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { ensureUniqueSlug } from '../utils/slug.js';
import { asyncHandler, createError } from '../utils/http.js';
import { getCompanyByOwner, mapCompany } from '../utils/company.js';

const router = Router();

router.post('/bootstrap', requireAuth, asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('begin');

    await client.query(
      `insert into public.profiles (id, email)
       values ($1, $2)
       on conflict (id) do update set email = excluded.email, updated_at = now()`,
      [req.user.id, req.user.email]
    );

    let company = await getCompanyByOwner(client, req.user.id);
    if (!company) {
      const localName = req.user.email?.split('@')[0]?.replace(/[._-]+/g, ' ') || 'Minha Empresa';
      const defaultName = localName.replace(/\b\w/g, (letter) => letter.toUpperCase());
      const slug = await ensureUniqueSlug(defaultName, client);
      const created = await client.query(
        `insert into public.companies (owner_id, name, slug, email)
         values ($1, $2, $3, $4)
         returning *`,
        [req.user.id, defaultName, slug, req.user.email]
      );
      company = created.rows[0];

      await client.query(
        `insert into public.categories (company_id, name, example_text, sort_order)
         values ($1, 'Outro', 'Explique brevemente o que você precisa e sua equipe retornará com orientação.', 1)`,
        [company.id]
      );
    }

    await client.query('commit');
    res.json({
      profile: { id: req.user.id, email: req.user.email },
      company: mapCompany(company),
    });
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    const profileResult = await client.query(`select * from public.profiles where id = $1 limit 1`, [req.user.id]);
    const company = await getCompanyByOwner(client, req.user.id);

    if (!profileResult.rowCount || !company) {
      throw createError(404, 'Conta ainda não inicializada.');
    }

    res.json({
      profile: profileResult.rows[0],
      company: mapCompany(company),
    });
  } finally {
    client.release();
  }
}));

export default router;
