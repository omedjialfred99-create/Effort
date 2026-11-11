import 'dotenv/config';
import fs from 'fs/promises';
import mysql from 'mysql2/promise';

const schema = await fs.readFile(new URL('../schema.sql', import.meta.url), 'utf8');
const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  multipleStatements: true
});

try {
  await connection.query(schema);
  const [columns] = await connection.query(
    "SHOW COLUMNS FROM personnel LIKE 'must_change_password'"
  );
  if (!columns.length) {
    await connection.query(
      'ALTER TABLE personnel ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE AFTER password_hash'
    );
    console.log('Colonne must_change_password ajoutée.');
  }
  console.log(`Base de données ${process.env.DB_NAME} initialisée.`);
} finally {
  await connection.end();
}
