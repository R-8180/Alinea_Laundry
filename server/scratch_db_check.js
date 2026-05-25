const pool = require('./db');

async function run() {
  try {
    console.log("Checking triggers on 'orders' table...");
    const triggers = await pool.query(`
      SELECT trigger_name, event_manipulation, action_statement 
      FROM information_schema.triggers 
      WHERE event_object_table = 'orders';
    `);
    console.log("Triggers:", triggers.rows);

    console.log("\nChecking all triggers in the database...");
    const allTriggers = await pool.query(`
      SELECT trigger_name, event_object_table, event_manipulation 
      FROM information_schema.triggers;
    `);
    console.log("All Triggers:", allTriggers.rows);

    console.log("\nChecking notifications table schema...");
    const columns = await pool.query(`
      SELECT column_name, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'notifications';
    `);
    console.log("Notifications columns:", columns.rows);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

run();
