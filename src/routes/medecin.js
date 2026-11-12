import { Router } from 'express';
import { db } from '../config/db.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(auth, requireRole('medecin'));

router.get('/stats', async (req, res, next) => {
  try {
    if (!req.user.medecin_id) return res.status(400).json({ error: 'Compte non lié à une fiche médecin' });
    const { rows } = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE DATE(date_heure) = CURRENT_DATE) AS total_jour,
        COUNT(*) FILTER (WHERE DATE(date_heure) = CURRENT_DATE AND statut = 'termine') AS termines_jour,
        COUNT(*) FILTER (WHERE DATE(date_heure) = CURRENT_DATE AND statut NOT IN ('termine', 'annule')) AS en_attente_jour
      FROM rendez_vous
      WHERE medecin_id = $1`, [req.user.medecin_id]);
    res.json(rows[0] || { total_jour: 0, termines_jour: 0, en_attente_jour: 0 });
  } catch (err) { next(err); }
});

router.get('/planning', async (req, res, next) => {
  try {
    if (!req.user.medecin_id) return res.status(400).json({ error: 'Compte non lié à une fiche médecin' });
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const { rows } = await db.query(`
      SELECT r.id, r.date_heure, r.statut, r.motif, r.present, r.origine, r.note_medecin,
        p.nom AS patient_nom, p.prenom AS patient_prenom, p.telephone
      FROM rendez_vous r JOIN patients p ON p.id=r.patient_id
      WHERE r.medecin_id=$1 AND DATE(r.date_heure)=$2 ORDER BY r.date_heure`,
      [req.user.medecin_id, date]);
    res.json(rows);
  } catch (err) { next(err); }
});

router.patch('/rendez-vous/:id/present', async (req, res, next) => {
  try {
    const present = req.body.present !== false;
    const result = await db.query(
      "UPDATE rendez_vous SET present=$1 WHERE id=$2 AND medecin_id=$3",
      [present, req.params.id, req.user.medecin_id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Rendez-vous introuvable' });
    res.json({ message: 'Statut de présence mis à jour' });
  } catch (err) { next(err); }
});

router.patch('/rendez-vous/:id/terminer', async (req, res, next) => {
  try {
    const result = await db.query(
      "UPDATE rendez_vous SET statut='termine', note_medecin=$1 WHERE id=$2 AND medecin_id=$3",
      [req.body.note_medecin || null, req.params.id, req.user.medecin_id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Rendez-vous introuvable' });
    res.json({ message: 'Consultation terminée avec succès' });
  } catch (err) { next(err); }
});

export default router;
