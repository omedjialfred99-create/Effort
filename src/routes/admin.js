import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../config/db.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(auth, requireRole('admin'));

router.get('/comptes', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT id, nom, prenom, email, role, actif, medecin_id FROM personnel ORDER BY role, nom'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/medecins-sans-compte', async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT m.id, m.nom, m.prenom
      FROM medecins m
      LEFT JOIN personnel p ON p.medecin_id = m.id
      WHERE p.id IS NULL AND m.actif = TRUE
      ORDER BY m.nom, m.prenom
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/medecins/:id/invitation', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email de connexion requis' });
    const [doctors] = await db.query(
      'SELECT id, nom, prenom FROM medecins WHERE id=? AND actif=TRUE',
      [req.params.id]
    );
    if (!doctors.length) return res.status(404).json({ error: 'Médecin introuvable' });
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const hash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    const [result] = await db.query(
      `INSERT INTO personnel (nom, prenom, email, password_hash, role, medecin_id)
       VALUES (?, ?, ?, ?, 'medecin', ?)`,
      [doctors[0].nom, doctors[0].prenom, email, hash, doctors[0].id]
    );
    await db.query(
      `INSERT INTO password_reset_tokens (personnel_id, token_hash, expires_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 72 HOUR))`,
      [result.insertId, tokenHash]
    );
    const baseUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
    res.status(201).json({ lien_invitation: `${baseUrl}/reset-password.html?token=${token}` });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    next(err);
  }
});

router.post('/comptes', async (req, res, next) => {
  try {
    const { nom, prenom, email, role, medecin_id } = req.body;
    if (!['secretaire', 'medecin'].includes(role)) {
      return res.status(400).json({ error: 'Rôle invalide (secretaire ou medecin)' });
    }
    if (role === 'medecin' && !medecin_id) {
      return res.status(400).json({ error: 'medecin_id requis pour un compte médecin' });
    }
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(invitationToken).digest('hex');
    const hash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    await db.query(
      `INSERT INTO personnel (nom, prenom, email, password_hash, role, medecin_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nom, prenom, email, hash, role, role === 'medecin' ? medecin_id : null]
    );
    const [users] = await db.query('SELECT id FROM personnel WHERE email=?', [email]);
    await db.query(
      `INSERT INTO password_reset_tokens (personnel_id, token_hash, expires_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 72 HOUR))`,
      [users[0].id, tokenHash]
    );
    const baseUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
    res.status(201).json({
      message: 'Compte créé',
      lien_invitation: `${baseUrl}/reset-password.html?token=${invitationToken}`
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    next(err);
  }
});

router.post('/comptes/:id/reset-password', async (req, res, next) => {
  try {
    const [users] = await db.query(
      'SELECT id FROM personnel WHERE id=? AND role IN (?, ?)',
      [req.params.id, 'medecin', 'secretaire']
    );
    if (!users.length) return res.status(404).json({ error: 'Compte médecin ou secrétaire introuvable' });

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await db.query(
      `UPDATE password_reset_tokens SET used_at=NOW()
       WHERE personnel_id=? AND used_at IS NULL`,
      [req.params.id]
    );
    await db.query(
      `INSERT INTO password_reset_tokens (personnel_id, token_hash, expires_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))`,
      [req.params.id, tokenHash]
    );
    const baseUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
    res.json({
      message: 'Lien de récupération créé. Il expire dans 1 heure.',
      lien_recuperation: `${baseUrl}/reset-password.html?token=${token}`
    });
  } catch (err) { next(err); }
});

router.patch('/comptes/:id/toggle', async (req, res, next) => {
  try {
    await db.query('UPDATE personnel SET actif=NOT actif WHERE id=?', [req.params.id]);
    res.json({ message: 'Statut du compte modifié' });
  } catch (err) { next(err); }
});

router.get('/stats', async (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const [[rdvJour]] = await db.query('SELECT COUNT(*) AS n FROM rendez_vous WHERE DATE(date_heure)=?', [date]);
    const [[attente]] = await db.query("SELECT COUNT(*) AS n FROM rendez_vous WHERE statut='en_attente'");
    const [[annules]] = await db.query("SELECT COUNT(*) AS n FROM rendez_vous WHERE statut='annule' AND DATE(date_heure)=?", [date]);
    const [[medecins]] = await db.query('SELECT COUNT(*) AS n FROM medecins WHERE actif=TRUE');
    res.json({ rdv_jour: rdvJour.n, en_attente: attente.n, annules_jour: annules.n, medecins_actifs: medecins.n });
  } catch (err) { next(err); }
});

export default router;
