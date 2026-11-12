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
  origin: true,
  credentials: true
}));

app.use(express.json());

// Servir les fichiers statiques (public/ d'abord, puis racine)
app.use(express.static(path.resolve(rootDir, '..', 'public')));
app.use(express.static(path.resolve(rootDir, '..')));

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
