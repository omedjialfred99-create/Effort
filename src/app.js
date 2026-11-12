import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import publicRouter from './routes/public.js';
import secretariatRouter from './routes/secretariat.js';
import medecinRouter from './routes/medecin.js';
import adminRouter from './routes/admin.js';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const rootDir = path.dirname(fileURLToPath(import.meta.url));

app.use(cors({
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origine (curl, mobile) ou venant de localhost, netlify, ou vercel
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.endsWith('.netlify.app') || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    if (process.env.APP_URL && origin === process.env.APP_URL.replace(/\/+$/, '')) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());

if (!process.env.NETLIFY && !process.env.VERCEL) {
  app.use(express.static(path.resolve(rootDir, '..')));
}

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRouter);
app.use('/api', publicRouter);
app.use('/api/secretariat', secretariatRouter);
app.use('/api/medecin', medecinRouter);
app.use('/api/admin', adminRouter);

app.use((err, req, res, next) => {
  console.error('Erreur:', err);
  res.status(err.status || 500).json({ error: err.message || 'Erreur serveur' });
});

export default app;
