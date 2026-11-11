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
  origin: [
    'https://effortclinique.netlify.app',
    'https://effortcliniqne.netlify.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5500'
  ],
  credentials: true
}));
app.use(express.json());
if (!process.env.NETLIFY) {
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
