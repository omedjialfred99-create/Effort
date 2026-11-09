import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../config/db.js';

const router = Router();

router.get('/specialites', async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT id, nom FROM specialites ORDER BY nom');
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/medecins', async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT m.id, m.nom, m.prenom, m.photo_url, m.specialite_id, s.nom AS specialite
      FROM medecins m JOIN specialites s ON s.id = m.specialite_id
      WHERE m.actif = TRUE ORDER BY s.nom, m.nom
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/medecins/:id/creneaux', async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Paramètre date requis (YYYY-MM-DD)' });
    }
    const jour = new Date(`${date}T00:00:00`).getDay();
    const [dispos] = await db.query(
      'SELECT heure_debut, heure_fin FROM disponibilites WHERE medecin_id = ? AND jour_semaine = ?',
      [req.params.id, jour]
    );
    const [pris] = await db.query(
      `SELECT DATE_FORMAT(date_heure, '%Y-%m-%dT%H:%i:00') AS dt
       FROM rendez_vous WHERE medecin_id = ? AND DATE(date_heure) = ?
       AND statut IN ('en_attente', 'confirme')`,
      [req.params.id, date]
    );
    const reserved = new Set(pris.map((row) => row.dt));
    const slots = [];
    for (const dispo of dispos) {
      let [hour, minute] = dispo.heure_debut.split(':').map(Number);
      const [endHour, endMinute] = dispo.heure_fin.split(':').map(Number);
      while (hour < endHour || (hour === endHour && minute < endMinute)) {
        const nextMinute = minute + 30;
        const endH = hour + Math.floor(nextMinute / 60);
        const endM = nextMinute % 60;
        if (endH > endHour || (endH === endHour && endM > endMinute)) break;
        const dt = `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
        if (!reserved.has(dt)) slots.push(dt);
        hour = endH;
        minute = endM;
      }
    }
    res.json([...new Set(slots)].sort());
  } catch (err) { next(err); }
});

router.post('/rendez-vous', async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    const { nom, prenom, telephone, email, medecin_id, date_heure, motif } = req.body;
    if (!nom || !prenom || !telephone || !medecin_id || !date_heure) {
      return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }
    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO patients (nom, prenom, telephone, email) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE nom=VALUES(nom), prenom=VALUES(prenom), email=COALESCE(VALUES(email), email)`,
      [nom, prenom, telephone, email || null]
    );
    const [patients] = await conn.query('SELECT id FROM patients WHERE telephone = ?', [telephone]);
    const code = crypto.randomBytes(3).toString('hex').toUpperCase();
    await conn.query(
      `INSERT INTO rendez_vous (code, patient_id, medecin_id, date_heure, motif, origine)
       VALUES (?, ?, ?, ?, ?, 'en_ligne')`,
      [code, patients[0].id, medecin_id, date_heure, motif || null]
    );
    await conn.commit();
    res.status(201).json({ code, message: 'Rendez-vous enregistré. Conservez ce code.' });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: "Ce créneau vient d'être pris, choisissez-en un autre" });
    }
    next(err);
  } finally {
    conn.release();
  }
});

router.post('/rendez-vous/consulter', async (req, res, next) => {
  try {
    const { code, telephone } = req.body;
    const [rows] = await db.query(`
      SELECT r.code, r.date_heure, r.statut, r.motif,
        m.nom AS medecin_nom, m.prenom AS medecin_prenom, s.nom AS specialite
      FROM rendez_vous r JOIN patients p ON p.id=r.patient_id
      JOIN medecins m ON m.id=r.medecin_id JOIN specialites s ON s.id=m.specialite_id
      WHERE r.code=? AND p.telephone=?`, [code, telephone]);
    if (!rows.length) return res.status(404).json({ error: 'Rendez-vous introuvable' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.patch('/rendez-vous/:code/annuler', async (req, res, next) => {
  try {
    const [result] = await db.query(
      `UPDATE rendez_vous r JOIN patients p ON p.id=r.patient_id
       SET r.statut='annule' WHERE r.code=? AND p.telephone=? AND r.statut IN ('en_attente','confirme')`,
      [req.params.code, req.body.telephone]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Rendez-vous introuvable' });
    res.json({ message: 'Rendez-vous annulé' });
  } catch (err) { next(err); }
});

export default router;
