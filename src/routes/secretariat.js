import { Router } from 'express';
import { db } from '../config/db.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(auth, requireRole('secretaire', 'admin'));

router.get('/rendez-vous', async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT r.id, r.code, r.date_heure, r.statut, r.motif, r.present,
        p.nom AS patient_nom, p.prenom AS patient_prenom, p.telephone,
        m.nom AS medecin_nom, m.prenom AS medecin_prenom
      FROM rendez_vous r
      JOIN patients p ON p.id = r.patient_id
      JOIN medecins m ON m.id = r.medecin_id
      ORDER BY r.date_heure DESC
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/specialites', async (req, res, next) => {
  try {
    if (!req.body.nom) return res.status(400).json({ error: 'Nom de la spécialité requis' });
    const { rows } = await db.query('INSERT INTO specialites (nom) VALUES ($1) RETURNING id', [req.body.nom]);
    res.status(201).json({ id: rows[0].id });
  } catch (err) { next(err); }
});

router.post('/medecins', async (req, res, next) => {
  try {
    const { nom, prenom, specialite_id, telephone, photo_url } = req.body;
    const { rows } = await db.query(
      'INSERT INTO medecins (nom, prenom, specialite_id, telephone, photo_url) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [nom, prenom, specialite_id, telephone || null, photo_url || null]
    );
    res.status(201).json({ id: rows[0].id });
  } catch (err) { next(err); }
});

router.put('/medecins/:id', async (req, res, next) => {
  try {
    const { nom, prenom, specialite_id, telephone, actif = true } = req.body;
    await db.query(
      'UPDATE medecins SET nom=$1, prenom=$2, specialite_id=$3, telephone=$4, actif=$5 WHERE id=$6',
      [nom, prenom, specialite_id, telephone || null, actif, req.params.id]
    );
    res.json({ message: 'Médecin mis à jour' });
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

router.patch('/rendez-vous/:id/confirmer', async (req, res, next) => {
  try {
    const result = await db.query("UPDATE rendez_vous SET statut='confirme' WHERE id=$1", [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Rendez-vous introuvable' });
    res.json({ message: 'Rendez-vous confirmé' });
  } catch (err) { next(err); }
});

router.patch('/rendez-vous/:id/present', async (req, res, next) => {
  try {
    const result = await db.query('UPDATE rendez_vous SET present=TRUE WHERE id=$1', [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Rendez-vous introuvable' });
    res.json({ message: 'Patient marqué présent' });
  } catch (err) { next(err); }
});

export default router;
