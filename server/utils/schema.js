const pool = require('../db');
const logger = require('./logger');

const REQUIRED_SCHEMA_PATCHES = [
  {
    name: 'addresses.note',
    sql: "ALTER TABLE addresses ADD COLUMN IF NOT EXISTS note TEXT DEFAULT ''",
  },
  {
    name: 'orders.courier_notes',
    sql: "ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_notes TEXT DEFAULT ''",
  },
];

let schemaPromise;

async function ensureDatabaseSchema() {
  if (schemaPromise) return schemaPromise;

  schemaPromise = (async () => {
    for (const patch of REQUIRED_SCHEMA_PATCHES) {
      await pool.query(patch.sql);
      logger.info(`Database schema checked: ${patch.name}`);
    }
  })();

  return schemaPromise;
}

module.exports = { ensureDatabaseSchema };
