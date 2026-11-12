import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import authRouter from '../src/routes/auth.js';
import publicRouter from '../src/routes/public.js';
import secretariatRouter from '../src/routes/secretariat.js';
import medecinRouter from '../src/routes/medecin.js';
import adminRouter from '../src/routes/admin.js';

const app = express();

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

// Routes API uniquement
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

export default function handler(req, res) {
  return app(req, res);
}
