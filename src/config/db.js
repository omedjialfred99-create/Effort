import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const DEFAULT_DB_URL = 'postgresql://postgres.xnjxithjgkbejruxcdfi:le20juillet%407@aws-0-eu-west-3.pooler.supabase.com:5432/postgres';
const databaseUrl = process.env.DATABASE_URL || DEFAULT_DB_URL;
const isLocalhost = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');

export const db = new Pool({
  connectionString: databaseUrl,
  max: Number(process.env.DB_POOL_SIZE) || (process.env.NETLIFY || process.env.VERCEL ? 2 : 10),
  ssl: isLocalhost ? false : { rejectUnauthorized: false }
});

if (!process.env.DATABASE_URL) {
  console.log('Utilisation de l’URL Supabase par défaut pour la connexion PostgreSQL.');
}
