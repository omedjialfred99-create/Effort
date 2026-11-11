import 'dotenv/config';
import fs from 'fs/promises';
import pg from 'pg';

const { Client } = pg;
const schema = await fs.readFile(new URL('../schema.postgres.sql', import.meta.url), 'utf8');
const connection = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

try {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be configured before initializing the database.');
  }
  await connection.connect();
  for (const statement of schema.split(';').map((part) => part.trim()).filter(Boolean)) {
    await connection.query(statement);
  }
  console.log('Supabase PostgreSQL schema initialized.');
} finally {
  await connection.end().catch(() => {});
}
