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
  console.log(`Base de données ${process.env.DB_NAME} initialisée.`);
} finally {
  await connection.end();
}
