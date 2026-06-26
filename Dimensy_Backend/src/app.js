import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import authRoutes from './routes/auth.js';
import categoriesRoutes from './routes/categories.js';
import companyRoutes from './routes/company.js';
import dashboardRoutes from './routes/dashboard.js';
import leadsRoutes from './routes/leads.js';
import publicRoutes from './routes/public.js';
import pushRoutes from './routes/push.js';
import { errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: true }));
  app.use(express.json({ limit: '5mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRoutes);
  app.use('/api/company', companyRoutes);
  app.use('/api/categories', categoriesRoutes);
  app.use('/api/leads', leadsRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/push', pushRoutes);
  app.use(errorHandler);
  return app;
}
