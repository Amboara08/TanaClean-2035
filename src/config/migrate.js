const pool = require('./database');

const MIGRATIONS = [
  {
    name: 'notifications.link',
    sql:  'ALTER TABLE notifications ADD COLUMN link VARCHAR(255) NULL AFTER message',
  },
];

async function runMigrations() {
  for (const { name, sql } of MIGRATIONS) {
    try {
      await pool.query(sql);
      console.log(`[migrate] ✓ ${name}`);
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        /* colonne déjà présente — migration déjà appliquée */
      } else {
        console.error(`[migrate] ✗ ${name} :`, err.message);
      }
    }
  }
}

module.exports = runMigrations;
