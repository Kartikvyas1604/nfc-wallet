// Run: node src/migrate.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const MIGRATIONS = [
  '../migrations/001_init.sql',
  '../migrations/002_bitgo.sql',
];

async function migrate() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  for (const file of MIGRATIONS) {
    const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
    await client.query(sql);
    console.log(`Applied: ${file}`);
  }
  console.log('All migrations complete');
  await client.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
