const { Client } = require('pg');

async function testCreds(label, config) {
  console.log(`\nTesting: ${label}`);
  console.log(`Host: ${config.host}:${config.port}`);
  console.log(`User: ${config.user}`);
  console.log(`SSL:`, !!config.ssl);
  const client = new Client({
    ...config,
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    console.log(`✅ Connection SUCCESS for ${label}!`);
    const tables = ['users', 'orders', 'services'];
    for (const table of tables) {
      try {
        const res = await client.query(`SELECT COUNT(*) FROM "${table}"`);
        console.log(`Count of ${table}:`, res.rows[0].count);
      } catch (e) {
        console.error(`Error querying ${table}:`, e.message);
      }
    }
    await client.end();
  } catch (err) {
    console.error(`❌ Connection FAILED for ${label}:`, err.message);
  }
}

async function run() {
  const commonSsl = { rejectUnauthorized: false };

  // Test wthbboyvmhqufmbgmznq with SSL
  await testCreds('.env config (wthbboyvmhqufmbgmznq) WITH SSL', {
    host: 'aws-1-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres.wthbboyvmhqufmbgmznq',
    password: 'Pemalang123.',
    database: 'postgres',
    ssl: commonSsl,
  });

  // Test wthbboyvmhqufmbgmznq WITHOUT SSL
  await testCreds('.env config (wthbboyvmhqufmbgmznq) WITHOUT SSL', {
    host: 'aws-1-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres.wthbboyvmhqufmbgmznq',
    password: 'Pemalang123.',
    database: 'postgres',
    ssl: false,
  });

  process.exit();
}

run();
