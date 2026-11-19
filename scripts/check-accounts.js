import 'dotenv/config';
import { db } from '../src/config/db.js';

try {
  const { rows } = await db.query(
    `SELECT id, nom, prenom, email, role, medecin_id, actif, must_change_password,
            CASE WHEN password_hash IS NULL OR password_hash = '' THEN 'NO PASSWORD' ELSE 'HAS PASSWORD' END AS pwd_status
     FROM personnel ORDER BY id`
  );
  console.table(rows);
} catch (err) {
  console.error(err.message);
}
process.exit(0);
