import { supabaseAdmin } from '../lib/supabase.js';
import { createError } from '../utils/http.js';

export async function requireAuth(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw createError(401, 'Token de autenticação não informado.');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      throw createError(401, 'Token inválido ou expirado.');
    }

    req.user = { id: data.user.id, email: data.user.email || '', token };
    next();
  } catch (error) {
    next(error);
  }
}
