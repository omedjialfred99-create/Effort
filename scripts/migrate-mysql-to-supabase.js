import 'dotenv/config';
import mysql from 'mysql2/promise';
import pg from 'pg';

const { Client } = pg;
const source = mysql.createPool({
  host: process.env.MYSQL_SOURCE_HOST || process.env.DB_HOST,
  user: process.env.MYSQL_SOURCE_USER || process.env.DB_USER,
  password: process.env.MYSQL_SOURCE_PASSWORD ?? process.env.DB_PASSWORD,
  database: process.env.MYSQL_SOURCE_DATABASE || process.env.DB_NAME,
  dateStrings: true,
  waitForConnections: true,
  connectionLimit: 2
});
const destination = new Client({ connectionString: process.env.DATABASE_URL });
const tables = [
  'specialites',
  'medecins',
  'patients',
  'personnel',
  'password_reset_tokens',
  'disponibilites',
  'rendez_vous'
];
const booleanColumns = new Set(['actif', 'must_change_password', 'present']);
let transactionOpen = false;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must point to the Supabase PostgreSQL database.');
}
if (!(process.env.MYSQL_SOURCE_HOST || process.env.DB_HOST)
  || !(process.env.MYSQL_SOURCE_USER || process.env.DB_USER)
  || !(process.env.MYSQL_SOURCE_DATABASE || process.env.DB_NAME)) {
  throw new Error('Configure MYSQL_SOURCE_HOST, MYSQL_SOURCE_USER, and MYSQL_SOURCE_DATABASE for the MySQL source.');
}

try {
  await destination.connect();
  await destination.query('BEGIN');
  transactionOpen = true;

  for (const table of tables) {
    const { rows: [{ count }] } = await destination.query(`SELECT COUNT(*)::int AS count FROM "${table}"`);
    if (count > 0) {
      throw new Error(`Supabase table "${table}" is not empty. Migration stopped to protect existing data.`);
    }
  }

  for (const table of tables) {
    const [rows] = await source.query(`SELECT * FROM \`${table}\` ORDER BY id`);
    if (!rows.length) {
      console.log(`${table}: 0 rows`);
      continue;
    }

    const columns = Object.keys(rows[0]);
    const quotedColumns = columns.map((column) => `"${column}"`).join(', ');
    for (let offset = 0; offset < rows.length; offset += 100) {
      const batch = rows.slice(offset, offset + 100);
      const values = [];
      const placeholders = batch.map((row, rowIndex) => {
        const rowPlaceholders = columns.map((column, columnIndex) => {
          let value = row[column];
          if (booleanColumns.has(column) && value !== null) value = Boolean(Number(value));
          values.push(value);
          return `$${rowIndex * columns.length + columnIndex + 1}`;
        });
        return `(${rowPlaceholders.join(', ')})`;
      });
      await destination.query(
        `INSERT INTO "${table}" (${quotedColumns}) VALUES ${placeholders.join(', ')}`,
        values
      );
    }

    const { rows: [{ count }] } = await destination.query(`SELECT COUNT(*)::int AS count FROM "${table}"`);
    if (count !== rows.length) {
      throw new Error(`Row count mismatch for "${table}": MySQL=${rows.length}, Supabase=${count}.`);
    }
    console.log(`${table}: ${count} rows migrated`);
  }

  for (const table of tables) {
    await destination.query(
      `SELECT setval(pg_get_serial_sequence($1, 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM "${table}"`,
      [table]
    );
  }

  await destination.query('COMMIT');
  transactionOpen = false;
  console.log('MySQL data copied to Supabase successfully.');
} catch (error) {
  if (transactionOpen) await destination.query('ROLLBACK');
  throw error;
} finally {
  await Promise.all([source.end(), destination.end()]);
}
