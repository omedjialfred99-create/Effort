import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../config/db.js';
import { appointmentConfirmationEmail } from '../services/email.js';

const router = Router();

router.get('/specialites', async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT id, nom FROM specialites ORDER BY nom');
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/medecins', async (req, res, next) => {
  try {
    const { rows } = await db.query(`
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
    const parsedDate = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
      return res.status(400).json({ error: 'Date invalide' });
    }
    const jour = parsedDate.getUTCDay();
    const { rows: dispos } = await db.query(
      'SELECT heure_debut, heure_fin FROM disponibilites WHERE medecin_id = $1 AND jour_semaine = $2',
      [req.params.id, jour]
    );
    const { rows: pris } = await db.query(
      `SELECT TO_CHAR(date_heure, 'YYYY-MM-DD"T"HH24:MI:SS') AS dt
       FROM rendez_vous WHERE medecin_id = $1 AND DATE(date_heure) = $2
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
  let conn;
  let transactionOpen = false;
  try {
    const { nom, prenom, telephone, email, medecin_id, date_heure, motif } = req.body;
    if (!nom || !prenom || !telephone || !medecin_id || !date_heure) {
      return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }
    const normalizedDateTime = String(date_heure).replace('T', ' ');
    const dateMatch = normalizedDateTime.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}):00$/);
    if (!dateMatch) {
      return res.status(400).json({ error: 'Date et heure invalides' });
    }
    const bookingDate = new Date(`${dateMatch[1]}T00:00:00Z`);
    if (Number.isNaN(bookingDate.getTime()) || bookingDate.toISOString().slice(0, 10) !== dateMatch[1]) {
      return res.status(400).json({ error: 'Date invalide' });
    }
    conn = await db.connect();
    const { rows: availability } = await conn.query(
      'SELECT heure_debut, heure_fin FROM disponibilites WHERE medecin_id=$1 AND jour_semaine=$2',
      [medecin_id, bookingDate.getUTCDay()]
    );
    const requestedMinutes = Number(dateMatch[2].slice(0, 2)) * 60 + Number(dateMatch[2].slice(3, 5));
    const slotIsAvailableBySchedule = availability.some((item) => {
      const [startHour, startMinute] = item.heure_debut.split(':').map(Number);
      const [endHour, endMinute] = item.heure_fin.split(':').map(Number);
      const start = startHour * 60 + startMinute;
      const end = endHour * 60 + endMinute;
      return requestedMinutes >= start && requestedMinutes + 30 <= end && (requestedMinutes - start) % 30 === 0;
    });
    if (!slotIsAvailableBySchedule) {
      return res.status(409).json({ error: 'Ce médecin n’est pas disponible sur ce créneau.' });
    }
    await conn.query('BEGIN');
    transactionOpen = true;
    const { rows: patients } = await conn.query(
      `INSERT INTO patients (nom, prenom, telephone, email) VALUES ($1, $2, $3, $4)
       ON CONFLICT (telephone) DO UPDATE SET
         nom=EXCLUDED.nom, prenom=EXCLUDED.prenom,
         email=COALESCE(EXCLUDED.email, patients.email)
       RETURNING id`,
      [nom, prenom, telephone, email || null]
    );
    const code = crypto.randomBytes(3).toString('hex').toUpperCase();
    await conn.query(
      `INSERT INTO rendez_vous (code, patient_id, medecin_id, date_heure, motif, origine)
       VALUES ($1, $2, $3, $4, $5, 'en_ligne')`,
      [code, patients[0].id, medecin_id, normalizedDateTime, motif || null]
    );
    await conn.query('COMMIT');
    transactionOpen = false;
    let emailSent = false;
    let emailWarning = null;
    if (email) {
      try {
        const { rows: doctorRows } = await db.query(
          'SELECT nom, prenom FROM medecins WHERE id=$1',
          [medecin_id]
        );
        await appointmentConfirmationEmail({
          recipient: email,
          patientName: `${prenom} ${nom}`,
          doctorName: doctorRows[0] ? `${doctorRows[0].prenom} ${doctorRows[0].nom}` : 'votre praticien',
          date: new Date(date_heure).toLocaleString('fr-FR'),
          code
        });
        emailSent = true;
      } catch (emailError) {
        emailWarning = emailError.message;
        console.error(emailWarning);
      }
    }
    res.status(201).json({
      code,
      message: emailSent
        ? 'Rendez-vous enregistré. Un email de confirmation a été envoyé.'
        : 'Rendez-vous enregistré. Conservez ce code.',
      email_sent: emailSent,
      email_warning: emailWarning
    });
  } catch (err) {
    if (transactionOpen) await conn.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ error: "Ce créneau vient d'être pris, choisissez-en un autre" });
    }
    next(err);
  } finally {
    conn?.release();
  }
});

router.post('/rendez-vous/consulter', async (req, res, next) => {
  try {
    const { code, telephone } = req.body;
    const { rows } = await db.query(`
      SELECT r.code, r.date_heure, r.statut, r.motif,
        m.nom AS medecin_nom, m.prenom AS medecin_prenom, s.nom AS specialite
      FROM rendez_vous r JOIN patients p ON p.id=r.patient_id
      JOIN medecins m ON m.id=r.medecin_id JOIN specialites s ON s.id=m.specialite_id
      WHERE r.code=$1 AND p.telephone=$2`, [code, telephone]);
    if (!rows.length) return res.status(404).json({ error: 'Rendez-vous introuvable' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.patch('/rendez-vous/:code/annuler', async (req, res, next) => {
  try {
    const result = await db.query(
      `UPDATE rendez_vous r SET statut='annule'
       WHERE r.code=$1 AND r.statut IN ('en_attente','confirme')
         AND EXISTS (SELECT 1 FROM patients p WHERE p.id=r.patient_id AND p.telephone=$2)`,
      [req.params.code, req.body.telephone]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Rendez-vous introuvable' });
    res.json({ message: 'Rendez-vous annulé' });
  } catch (err) { next(err); }
});

export default router;
