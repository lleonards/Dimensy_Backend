import { Router } from 'express';
import { pool } from '../lib/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, createError } from '../utils/http.js';
import { cleanNullableText, cleanText } from '../utils/sanitize.js';
import { ensureUniqueSlug, makeSlug } from '../utils/slug.js';
import { getCompanyByOwner, mapCompany } from '../utils/company.js';
import { companySchema } from '../validators.js';

const router = Router();
router.use(requireAuth);

router.get('/me', asyncHandler(async (req, res) => {
  const company = await getCompanyByOwner(pool, req.user.id);
  if (!company) throw createError(404, 'Empresa não encontrada.');
  res.json({ company: mapCompany(company) });
}));

router.put('/me', asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    const currentCompany = await getCompanyByOwner(client, req.user.id);
    if (!currentCompany) throw createError(404, 'Empresa não encontrada.');

    const parsed = companySchema.parse({
      ...req.body,
      name: cleanText(req.body.name),
      slug: makeSlug(req.body.slug || req.body.name),
      description: cleanNullableText(req.body.description),
      city: cleanNullableText(req.body.city),
      phone: cleanNullableText(req.body.phone),
      whatsapp: cleanNullableText(req.body.whatsapp),
      email: cleanNullableText(req.body.email),
      business_hours: cleanNullableText(req.body.business_hours),
      intro_message: cleanNullableText(req.body.intro_message),
      logo_path: cleanNullableText(req.body.logo_path),
      cover_path: cleanNullableText(req.body.cover_path),
    });

    const slug = await ensureUniqueSlug(parsed.slug, client, currentCompany.id);
    const result = await client.query(
      `update public.companies
       set name = $1, slug = $2, description = $3, city = $4, phone = $5, whatsapp = $6, email = $7,
           business_hours = $8, response_time_hours = $9, intro_message = $10, primary_color = $11,
           secondary_color = $12, logo_path = $13, cover_path = $14
       where owner_id = $15
       returning *`,
      [
        parsed.name,
        slug,
        parsed.description,
        parsed.city,
        parsed.phone,
        parsed.whatsapp,
        parsed.email,
        parsed.business_hours,
        parsed.response_time_hours,
        parsed.intro_message,
        parsed.primary_color,
        parsed.secondary_color,
        parsed.logo_path,
        parsed.cover_path,
        req.user.id,
      ]
    );

    res.json({ company: mapCompany(result.rows[0]) });
  } finally {
    client.release();
  }
}));

export default router;
