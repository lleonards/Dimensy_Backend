require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const companiesRoutes = require('./routes/companies');
const branchesRoutes = require('./routes/branches');
const servicesRoutes = require('./routes/services');
const leadsRoutes = require('./routes/leads');
const notificationsRoutes = require('./routes/notifications');

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Muitas requisições. Tente novamente em 15 minutos.' },
});
app.use(limiter);

// Rota pública para formulário — limite mais alto
const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Muitas solicitações. Aguarde 1 minuto.' },
});
app.use('/api/leads', publicLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/branches', branchesRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/notifications', notificationsRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use((req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Dimensy Backend rodando na porta ${PORT}`);
});
