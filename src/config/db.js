import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;
const isLocalhost = databaseUrl ? (databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')) : false;

export const db = new Pool({
  connectionString: databaseUrl || 'postgresql://postgres:dummy@localhost:5432/postgres',
  max: Number(process.env.DB_POOL_SIZE) || (process.env.NETLIFY || process.env.VERCEL ? 2 : 10),
  ssl: isLocalhost ? false : { rejectUnauthorized: false }
});

if (!databaseUrl) {
  console.warn('ATTENTION: La variable d’environnement DATABASE_URL n’est pas définie.');
}
