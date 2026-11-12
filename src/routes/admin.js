import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../config/db.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(auth, requireRole('admin'));

function getAppUrl(req) {
  let appUrl = process.env.APP_URL?.replace(/\/+$/, '');
  if (!appUrl && req) {
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.get('host');
    if (host) appUrl = `${proto}://${host}`;
  }
  return appUrl || 'https://effort-hazel.vercel.app';
}

router.get('/comptes', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT id, nom, prenom, email, role, actif, medecin_id, must_change_password FROM personnel ORDER BY role, nom'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/medecins-sans-compte', async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT m.id, m.nom, m.prenom, s.nom AS specialite
      FROM medecins m
      JOIN specialites s ON s.id = m.specialite_id
      LEFT JOIN personnel p ON p.medecin_id = m.id
      WHERE m.actif = TRUE AND p.id IS NULL
      ORDER BY m.nom
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/medecins', async (req, res, next) => {
  const client = await db.connect();
  let transactionOpen = false;
  try {
    const { nom, prenom, specialite_id, telephone, email, password } = req.body;
    if (!nom?.trim() || !prenom?.trim() || !specialite_id) {
      return res.status(400).json({ error: 'Nom, prénom et spécialité requis' });
    }

    await client.query('BEGIN');
    transactionOpen = true;

    const { rows: doctors } = await client.query(
      'INSERT INTO medecins (nom, prenom, specialite_id, telephone) VALUES ($1, $2, $3, $4) RETURNING id',
      [nom.trim(), prenom.trim(), specialite_id, telephone?.trim() || null]
    );
    const doctorId = doctors[0].id;

    // Ajouter des disponibilités par défaut (Lundi au Vendredi, 08h00 - 16h00)
    for (let day = 1; day <= 5; day++) {
      await client.query(
        'INSERT INTO disponibilites (medecin_id, jour_semaine, heure_debut, heure_fin) VALUES ($1, $2, $3, $4)',
        [doctorId, day, '08:00', '16:00']
      );
    }

    let invitationUrl = null;
    let message = 'Médecin créé avec succès.';

    if (email?.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      const baseUrl = getAppUrl(req);

      if (password && password.trim().length >= 8) {
        // L'admin a défini le mot de passe directement
        const hash = await bcrypt.hash(password.trim(), 10);
        await client.query(
          `INSERT INTO personnel (nom, prenom, email, password_hash, must_change_password, role, medecin_id)
           VALUES ($1, $2, $3, $4, FALSE, 'medecin', $5)`,
          [nom.trim(), prenom.trim(), cleanEmail, hash, doctorId]
        );
        message = 'Médecin et compte créés avec succès ! Le médecin peut se connecter directement avec son mot de passe.';
        invitationUrl = `${baseUrl}/medecin.html`;
      } else {
        // Lien d'activation où le médecin choisit son mot de passe
        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const tempHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

        const { rows: personnel } = await client.query(
          `INSERT INTO personnel (nom, prenom, email, password_hash, must_change_password, role, medecin_id)
           VALUES ($1, $2, $3, $4, TRUE, 'medecin', $5) RETURNING id`,
          [nom.trim(), prenom.trim(), cleanEmail, tempHash, doctorId]
        );
        await client.query(
          `INSERT INTO password_reset_tokens (personnel_id, token_hash, expires_at)
           VALUES ($1, $2, NOW() + INTERVAL '72 hours')`,
          [personnel[0].id, tokenHash]
        );
        invitationUrl = `${baseUrl}/medecin.html?activation=${token}`;
        message = 'Médecin créé. Transmettez-lui le lien d’activation pour qu’il accède directement à son espace.';
      }
    }

    await client.query('COMMIT');
    transactionOpen = false;

    res.status(201).json({
      id: doctorId,
      message,
      lien_invitation: invitationUrl
    });
  } catch (err) {
    if (transactionOpen) await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    next(err);
  } finally {
    client.release();
  }
});

router.post('/medecins/:id/invitation', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email) return res.status(400).json({ error: 'Email de connexion requis' });
    const { rows: doctors } = await db.query(
      'SELECT id, nom, prenom FROM medecins WHERE id=$1 AND actif=TRUE',
      [req.params.id]
    );
    if (!doctors.length) return res.status(404).json({ error: 'Médecin introuvable' });
    
    const baseUrl = getAppUrl(req);
    const cleanEmail = email.trim().toLowerCase();

    if (password && password.trim().length >= 8) {
      const hash = await bcrypt.hash(password.trim(), 10);
      await db.query(
        `INSERT INTO personnel (nom, prenom, email, password_hash, must_change_password, role, medecin_id)
         VALUES ($1, $2, $3, $4, FALSE, 'medecin', $5)`,
        [doctors[0].nom, doctors[0].prenom, cleanEmail, hash, doctors[0].id]
      );
      return res.status(201).json({
        message: 'Compte médecin créé avec succès. Le médecin peut se connecter directement.',
        lien_invitation: `${baseUrl}/medecin.html`
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const hash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    const { rows: personnel } = await db.query(
      `INSERT INTO personnel (nom, prenom, email, password_hash, must_change_password, role, medecin_id)
       VALUES ($1, $2, $3, $4, TRUE, 'medecin', $5) RETURNING id`,
      [doctors[0].nom, doctors[0].prenom, cleanEmail, hash, doctors[0].id]
    );
    await db.query(
      `INSERT INTO password_reset_tokens (personnel_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '72 hours')`,
      [personnel[0].id, tokenHash]
    );
    const invitationUrl = `${baseUrl}/medecin.html?activation=${token}`;
    res.status(201).json({
      message: 'Lien d’activation médecin généré avec succès.',
      lien_invitation: invitationUrl,
      expires_in_hours: 72
    });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    next(err);
  }
});

router.post('/comptes', async (req, res, next) => {
  try {
    const { nom, prenom, email, role, medecin_id, password } = req.body;
    if (!['secretaire', 'medecin'].includes(role)) {
      return res.status(400).json({ error: 'Rôle invalide (secretaire ou medecin)' });
    }
    if (role === 'medecin' && !medecin_id) {
      return res.status(400).json({ error: 'medecin_id requis pour un compte médecin' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const baseUrl = getAppUrl(req);
    const targetPage = role === 'medecin' ? 'medecin.html' : 'admin.html';

    if (password && password.trim().length >= 8) {
      const hash = await bcrypt.hash(password.trim(), 10);
      await db.query(
        `INSERT INTO personnel (nom, prenom, email, password_hash, must_change_password, role, medecin_id)
         VALUES ($1, $2, $3, $4, FALSE, $5, $6)`,
        [nom.trim(), prenom.trim(), cleanEmail, hash, role, role === 'medecin' ? medecin_id : null]
      );
      return res.status(201).json({
        message: `Compte ${role} créé avec mot de passe défini.`,
        lien_invitation: `${baseUrl}/${targetPage}`
      });
    }

    const invitationToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(invitationToken).digest('hex');
    const hash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    const { rows: users } = await db.query(
      `INSERT INTO personnel (nom, prenom, email, password_hash, must_change_password, role, medecin_id)
       VALUES ($1, $2, $3, $4, TRUE, $5, $6) RETURNING id`,
      [nom.trim(), prenom.trim(), cleanEmail, hash, role, role === 'medecin' ? medecin_id : null]
    );
    await db.query(
      `INSERT INTO password_reset_tokens (personnel_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '72 hours')`,
      [users[0].id, tokenHash]
    );
    res.status(201).json({
      message: 'Compte créé avec lien d’activation.',
      lien_invitation: `${baseUrl}/${targetPage}?activation=${invitationToken}`
    });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    next(err);
  }
});

router.post('/comptes/:id/reset-password', async (req, res, next) => {
  try {
    const { rows: users } = await db.query(
      'SELECT id, role, must_change_password FROM personnel WHERE id=$1 AND role IN ($2, $3)',
      [req.params.id, 'medecin', 'secretaire']
    );
    if (!users.length) return res.status(404).json({ error: 'Compte médecin ou secrétaire introuvable' });

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await db.query(
      `UPDATE password_reset_tokens SET used_at=NOW()
       WHERE personnel_id=$1 AND used_at IS NULL`,
      [req.params.id]
    );
    await db.query('UPDATE personnel SET must_change_password=TRUE WHERE id=$1', [req.params.id]);
    await db.query(
      `INSERT INTO password_reset_tokens (personnel_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '72 hours')`,
      [req.params.id, tokenHash]
    );
    const baseUrl = getAppUrl(req);
    const targetPage = users[0].role === 'medecin' ? 'medecin.html' : 'admin.html';
    res.json({
      message: 'Nouveau lien d’activation créé. Il expire dans 72 heures.',
      lien_recuperation: `${baseUrl}/${targetPage}?activation=${token}`
    });
  } catch (err) { next(err); }
});

router.patch('/comptes/:id/toggle', async (req, res, next) => {
  try {
    if (Number(req.user.id) === Number(req.params.id)) {
      return res.status(400).json({ error: 'Vous ne pouvez pas désactiver votre propre compte administrateur.' });
    }
    await db.query('UPDATE personnel SET actif=NOT actif WHERE id=$1', [req.params.id]);
    res.json({ message: 'Statut du compte modifié' });
  } catch (err) { next(err); }
});

router.get('/stats', async (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const { rows: [rdvJour] } = await db.query('SELECT COUNT(*) AS n FROM rendez_vous WHERE DATE(date_heure)=$1', [date]);
    const { rows: [attente] } = await db.query("SELECT COUNT(*) AS n FROM rendez_vous WHERE statut='en_attente'");
    const { rows: [annules] } = await db.query("SELECT COUNT(*) AS n FROM rendez_vous WHERE statut='annule' AND DATE(date_heure)=$1", [date]);
    const { rows: [medecins] } = await db.query('SELECT COUNT(*) AS n FROM medecins WHERE actif=TRUE');
    res.json({
      rdv_jour: Number(rdvJour.n),
      en_attente: Number(attente.n),
      annules_jour: Number(annules.n),
      medecins_actifs: Number(medecins.n)
    });
  } catch (err) { next(err); }
});

export default router;
