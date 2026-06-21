require('dotenv').config({ path: './server/.env' });
const db = require('./server/db');

const query = `
  INSERT INTO app_settings (setting_key, setting_value) 
  VALUES ('visit_count', '1'::jsonb) 
  ON CONFLICT (setting_key) 
  DO UPDATE SET setting_value = (COALESCE(app_settings.setting_value #>> '{}', '0')::integer + 1)::text::jsonb 
  RETURNING *;
`;

db.query(query)
  .then(res => {
    console.log("SUCCESS:", res.rows);
    process.exit(0);
  })
  .catch(err => {
    console.error("ERROR:", err);
    process.exit(1);
  });
