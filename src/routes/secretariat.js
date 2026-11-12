import { Router } from 'express';
import { db } from '../config/db.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(auth, requireRole('secretaire', 'admin'));

// Statistiques du jour pour l'accueil
router.get('/stats', async (req, res, next) => {
  try {
    const { rows: [rdvJour] } = await db.query('SELECT COUNT(*) AS n FROM rendez_vous WHERE DATE(date_heure) = CURRENT_DATE');
    const { rows: [presents] } = await db.query('SELECT COUNT(*) AS n FROM rendez_vous WHERE DATE(date_heure) = CURRENT_DATE AND present = TRUE');
    const { rows: [attente] } = await db.query("SELECT COUNT(*) AS n FROM rendez_vous WHERE DATE(date_heure) = CURRENT_DATE AND statut = 'en_attente'");
    const { rows: [termines] } = await db.query("SELECT COUNT(*) AS n FROM rendez_vous WHERE DATE(date_heure) = CURRENT_DATE AND statut = 'termine'");
    res.json({
      rdv_jour: Number(rdvJour.n),
      presents_jour: Number(presents.n),
      en_attente_jour: Number(attente.n),
      termines_jour: Number(termines.n)
    });
  } catch (err) { next(err); }
});

// Liste des rendez-vous avec filtres avancés (recherche, date, médecin, statut)
router.get('/rendez-vous', async (req, res, next) => {
  try {
    const { date, medecin_id, search, statut } = req.query;
    let query = `
      SELECT r.id, r.code, r.date_heure, r.statut, r.motif, r.present, r.origine,
        p.id AS patient_id, p.nom AS patient_nom, p.prenom AS patient_prenom, p.telephone, p.email AS patient_email,
        m.id AS medecin_id, m.nom AS medecin_nom, m.prenom AS medecin_prenom, s.nom AS specialite
      FROM rendez_vous r
      JOIN patients p ON p.id = r.patient_id
      JOIN medecins m ON m.id = r.medecin_id
      JOIN specialites s ON s.id = m.specialite_id
      WHERE 1=1
    `;
    const params = [];
    if (date) {
      params.push(date);
      query += ` AND DATE(r.date_heure) = $${params.length}`;
    }
    if (medecin_id) {
      params.push(medecin_id);
      query += ` AND r.medecin_id = $${params.length}`;
    }
    if (statut) {
      params.push(statut);
      query += ` AND r.statut = $${params.length}`;
    }
    if (search?.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (LOWER(p.nom) LIKE $${params.length} OR LOWER(p.prenom) LIKE $${params.length} OR p.telephone LIKE $${params.length} OR LOWER(r.code) LIKE $${params.length})`;
    }
    query += ' ORDER BY r.date_heure DESC LIMIT 200';
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// Enregistrer un rendez-vous directement à l'accueil / guichet
router.post('/rendez-vous', async (req, res, next) => {
  const client = await db.connect();
  let transactionOpen = false;
  try {
    const { nom, prenom, telephone, email, medecin_id, date_heure, motif, present } = req.body;
    if (!nom || !prenom || !telephone || !medecin_id || !date_heure) {
      return res.status(400).json({ error: 'Nom, prénom, téléphone, médecin et date/heure requis' });
    }
    await client.query('BEGIN');
    transactionOpen = true;

    // Créer ou récupérer le patient par téléphone
    let { rows: patient } = await client.query('SELECT id FROM patients WHERE telephone = $1', [telephone.trim()]);
    let patientId;
    if (!patient.length) {
      const { rows: newP } = await client.query(
        'INSERT INTO patients (nom, prenom, telephone, email) VALUES ($1, $2, $3, $4) RETURNING id',
        [nom.trim(), prenom.trim(), telephone.trim(), email?.trim() || null]
      );
      patientId = newP[0].id;
    } else {
      patientId = patient[0].id;
      await client.query('UPDATE patients SET nom=$1, prenom=$2 WHERE id=$3', [nom.trim(), prenom.trim(), patientId]);
    }

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const isPresent = present === true;

    const { rows: rdv } = await client.query(
      `INSERT INTO rendez_vous (code, patient_id, medecin_id, date_heure, motif, statut, origine, present)
       VALUES ($1, $2, $3, $4, $5, 'confirme', 'presentiel', $6) RETURNING id, code`,
      [code, patientId, medecin_id, date_heure, motif?.trim() || 'Consultation sur place', isPresent]
    );

    await client.query('COMMIT');
    transactionOpen = false;
    res.status(201).json({ id: rdv[0].id, code: rdv[0].code, message: 'Rendez-vous enregistré avec succès' });
  } catch (err) {
    if (transactionOpen) await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'Ce médecin a déjà une consultation sur ce créneau' });
    next(err);
  } finally {
    client.release();
  }
});

// Annuler un rendez-vous
router.patch('/rendez-vous/:id/annuler', async (req, res, next) => {
  try {
    const result = await db.query("UPDATE rendez_vous SET statut='annule' WHERE id=$1", [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Rendez-vous introuvable' });
    res.json({ message: 'Rendez-vous annulé' });
  } catch (err) { next(err); }
});

// Confirmer un rendez-vous
router.patch('/rendez-vous/:id/confirmer', async (req, res, next) => {
  try {
    const result = await db.query("UPDATE rendez_vous SET statut='confirme' WHERE id=$1", [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Rendez-vous introuvable' });
    res.json({ message: 'Rendez-vous confirmé' });
  } catch (err) { next(err); }
});

// Marquer le patient présent en salle d'attente
router.patch('/rendez-vous/:id/present', async (req, res, next) => {
  try {
    const present = req.body.present !== false;
    const result = await db.query('UPDATE rendez_vous SET present=$1 WHERE id=$2', [present, req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Rendez-vous introuvable' });
    res.json({ message: present ? 'Patient marqué comme présent en salle d’attente' : 'Statut de présence retiré' });
  } catch (err) { next(err); }
});

// Liste des patients et historique
router.get('/patients', async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = `
      SELECT p.id, p.nom, p.prenom, p.telephone, p.email, p.created_at,
        COUNT(r.id) AS total_rdv,
        MAX(r.date_heure) AS dernier_rdv
      FROM patients p
      LEFT JOIN rendez_vous r ON r.patient_id = p.id
    `;
    const params = [];
    if (search?.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` WHERE LOWER(p.nom) LIKE $1 OR LOWER(p.prenom) LIKE $1 OR p.telephone LIKE $1`;
    }
    query += ' GROUP BY p.id, p.nom, p.prenom, p.telephone, p.email, p.created_at ORDER BY p.nom LIMIT 100';
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// Spécialités et disponibilités
router.post('/specialites', async (req, res, next) => {
  try {
    if (!req.body.nom) return res.status(400).json({ error: 'Nom de la spécialité requis' });
    const { rows } = await db.query('INSERT INTO specialites (nom) VALUES ($1) RETURNING id', [req.body.nom]);
    res.status(201).json({ id: rows[0].id });
  } catch (err) { next(err); }
});

router.post('/medecins/:id/disponibilites', async (req, res, next) => {
  try {
    const { jour_semaine, heure_debut, heure_fin } = req.body;
    const { rows } = await db.query(
      'INSERT INTO disponibilites (medecin_id, jour_semaine, heure_debut, heure_fin) VALUES ($1, $2, $3, $4) RETURNING id',
      [req.params.id, jour_semaine, heure_debut, heure_fin]
    );
    res.status(201).json({ id: rows[0].id });
  } catch (err) { next(err); }
});

export default router;
