require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const creditsRoutes = require('./routes/credits');
const stripeRoutes = require('./routes/stripe');
const calculosRoutes = require('./routes/calculos');
const projectsRoutes = require('./routes/projects');
const infoRoutes = require('./routes/info');

const app = express();
const PORT = process.env.PORT || 3001;

// Webhook Stripe
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// JSON
app.use(express.json({ limit: '2mb' }));

// CORS
const allowedOrigins = [
  'http://localhost:5173',
  'https://dimensy.com.br',
  'https://www.dimensy.com.br'
];

// Adiciona FRONTEND_URL do .env caso exista
if (process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
    .forEach(origin => {
      if (!allowedOrigins.includes(origin)) {
        allowedOrigins.push(origin);
      }
    });
}

app.use(cors({
  origin: function (origin, callback) {
    // Permite requests sem origin (Postman, mobile apps, etc.)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS bloqueado para origem: ${origin}`));
  },
  credentials: true,
}));

// Rate limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: {
    error: 'Muitas requisições, tente novamente em 15 minutos.'
  }
});

app.use('/api/', limiter);

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/credits', creditsRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/calculos', calculosRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/info', infoRoutes);

// Root
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Dimensy API funcionando!',
    docs: {
      guia: '/api/info/guide',
      health: '/api/info/health'
    }
  });
});

// Start
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
