import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db } from '../src/config/db.js';

const email = process.env.ADMIN_EMAIL || 'admin@clinique-effort.cd';
const password = process.argv[2] || 'Admin123!';
const hash = await bcrypt.hash(password, 10);

await db.query(
  `INSERT INTO personnel (nom, prenom, email, password_hash, role)
   VALUES ('Admin', 'System', $1, $2, 'admin')
   ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash`,
  [email, hash]
);
console.log(`Compte admin prêt : ${email}`);
console.log(`Mot de passe : ${password}`);
await db.end();
