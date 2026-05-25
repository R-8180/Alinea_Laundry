const pool = require('./server/db');
pool.query("SELECT column_name, is_nullable, data_type FROM information_schema.columns WHERE table_name = 'orders'")
  .then(r => {
    console.table(r.rows);
    process.exit(0);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
