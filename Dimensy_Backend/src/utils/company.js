export function mapCompany(row) {
  if (!row) return null;
  const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '') || '';
  const toPublicUrl = (path) => (path ? `${baseUrl}/storage/v1/object/public/branding/${path}` : '');

  return {
    ...row,
    logo_url: toPublicUrl(row.logo_path),
    cover_url: toPublicUrl(row.cover_path),
  };
}

export async function getCompanyByOwner(client, ownerId) {
  const result = await client.query(`select * from public.companies where owner_id = $1 limit 1`, [ownerId]);
  return result.rows[0] || null;
}
