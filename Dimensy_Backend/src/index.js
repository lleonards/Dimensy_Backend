import dotenv from 'dotenv';

dotenv.config();

const requiredVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE', 'DATABASE_URL'];
for (const key of requiredVars) {
  if (!process.env[key]) {
    throw new Error(`Variável obrigatória ausente: ${key}`);
  }
}

const [{ createApp }, { pool }, { getPublicVapidKey }] = await Promise.all([
  import('./app.js'),
  import('./lib/pool.js'),
  import('./lib/push.js'),
]);

const app = createApp();
const port = process.env.PORT || 4000;

await pool.query('select 1');
await getPublicVapidKey();
app.listen(port, () => {
  console.log(`Dimensy backend disponível na porta ${port}`);
});
