import slugify from 'slugify';

const reserved = new Set(['app', 'login', 'forgot-password', 'reset-password']);

export function makeSlug(value) {
  const base = slugify(value || 'empresa', { lower: true, strict: true, locale: 'pt' }).slice(0, 60) || 'empresa';
  return reserved.has(base) ? `${base}-1` : base;
}

export async function ensureUniqueSlug(base, client, companyId = null) {
  let candidate = makeSlug(base);
  let counter = 1;

  while (true) {
    const result = await client.query(
      `select id from public.companies where slug = $1 and ($2::uuid is null or id <> $2::uuid) limit 1`,
      [candidate, companyId]
    );

    if (!result.rowCount) return candidate;
    counter += 1;
    candidate = `${makeSlug(base)}-${counter}`;
  }
}
