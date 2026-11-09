import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../config/db.js';
import { auth } from '../middleware/auth.js';

const router = Router();
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }
    const [rows] = await db.query(
      'SELECT * FROM personnel WHERE email = ? AND actif = TRUE',
      [email]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }
    const token = jwt.sign(
      { id: user.id, role: user.role, medecin_id: user.medecin_id },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );
    res.json({ token, role: user.role, nom: `${user.nom} ${user.prenom}` });
  } catch (err) {
    next(err);
  }
});

router.get('/me', auth, async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT id, nom, prenom, email, role, medecin_id FROM personnel WHERE id=? AND actif=TRUE',
      [req.user.id]
    );
    if (!rows.length) return res.status(401).json({ error: 'Compte introuvable ou désactivé' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.patch('/me', auth, async (req, res, next) => {
  try {
    const { nom, prenom, email } = req.body;
    if (!nom?.trim() || !prenom?.trim() || !email?.trim()) {
      return res.status(400).json({ error: 'Nom, prénom et email sont requis' });
    }
    await db.query(
      'UPDATE personnel SET nom=?, prenom=?, email=? WHERE id=? AND actif=TRUE',
      [nom.trim(), prenom.trim(), email.trim().toLowerCase(), req.user.id]
    );
    res.json({ message: 'Profil mis à jour' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    next(err);
  }
});

router.patch('/password', auth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Mot de passe actuel requis et nouveau mot de passe de 8 caractères minimum' });
    }
    const [rows] = await db.query(
      'SELECT password_hash FROM personnel WHERE id=? AND actif=TRUE',
      [req.user.id]
    );
    if (!rows.length || !(await bcrypt.compare(currentPassword, rows[0].password_hash))) {
      return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE personnel SET password_hash=? WHERE id=?', [passwordHash, req.user.id]);
    res.json({ message: 'Mot de passe modifié. Reconnectez-vous avec le nouveau mot de passe.' });
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password || password.length < 8) {
      return res.status(400).json({ error: 'Lien et mot de passe de 8 caractères minimum requis' });
    }
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const [rows] = await db.query(
      `SELECT id, personnel_id FROM password_reset_tokens
       WHERE token_hash=? AND used_at IS NULL AND expires_at > NOW()`,
      [tokenHash]
    );
    if (!rows.length) return res.status(400).json({ error: 'Lien invalide ou expiré' });

    const passwordHash = await bcrypt.hash(password, 10);
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query('UPDATE personnel SET password_hash=? WHERE id=?', [passwordHash, rows[0].personnel_id]);
      await connection.query('UPDATE password_reset_tokens SET used_at=NOW() WHERE id=?', [rows[0].id]);
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
    res.json({ message: 'Mot de passe défini. Vous pouvez vous connecter.' });
  } catch (err) {
    next(err);
  }
});

export default router;
