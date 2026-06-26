import { Router } from 'express';
import { pool } from '../lib/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, createError } from '../utils/http.js';
import { getCompanyByOwner } from '../utils/company.js';

const router = Router();
router.use(requireAuth);

router.get('/summary', asyncHandler(async (req, res) => {
  const company = await getCompanyByOwner(pool, req.user.id);
  if (!company) throw createError(404, 'Empresa não encontrada.');

  const [today, week, month, statuses, recent] = await Promise.all([
    pool.query(`select count(*)::int as total from public.leads where company_id = $1 and created_at >= current_date`, [company.id]),
    pool.query(`select count(*)::int as total from public.leads where company_id = $1 and created_at >= date_trunc('week', now())`, [company.id]),
    pool.query(`select count(*)::int as total from public.leads where company_id = $1 and created_at >= date_trunc('month', now())`, [company.id]),
    pool.query(`select status, count(*)::int as total from public.leads where company_id = $1 group by status`, [company.id]),
    pool.query(`select * from public.leads where company_id = $1 order by created_at desc limit 5`, [company.id]),
  ]);

  const statusMap = { novo: 0, em_atendimento: 0, concluido: 0, descartado: 0 };
  statuses.rows.forEach((row) => {
    statusMap[row.status] = row.total;
  });
  const total = Object.values(statusMap).reduce((sum, item) => sum + Number(item), 0);
  const conversionRate = total ? Math.round((Number(statusMap.concluido) / total) * 100) : 0;

  const origin = req.headers.origin || 'http://localhost:5173';
  res.json({
    today: today.rows[0].total,
    week: week.rows[0].total,
    month: month.rows[0].total,
    statuses: statusMap,
    conversionRate,
    recentLeads: recent.rows,
    publicUrl: `${origin.replace(/\/$/, '')}/${company.slug}`,
  });
}));

export default router;
