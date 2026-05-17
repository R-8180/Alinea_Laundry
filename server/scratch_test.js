const { Client } = require('pg');

const indexes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

async function probeIndex(index) {
  const host = `aws-${index}-ap-southeast-1.pooler.supabase.com`;
  const client = new Client({
    host,
    port: 6543,
    user: 'postgres.nmuxiduvphjfdmtpztzc',
    password: 's8ZURDnpX0coSfcu',
    database: 'postgres',
    connectionTimeoutMillis: 2000,
  });

  try {
    await client.connect();
    console.log(`🎉 SUCCESS! Connected to pooler: ${host}`);
    await client.end();
    return host;
  } catch (err) {
    const msg = err.message.toLowerCase();
    if (msg.includes('tenant') || msg.includes('not found') || msg.includes('getaddrinfo')) {
      // Ignored
    } else {
      console.log(`⭐ POSSIBLE SUCCESS ON ${host}: ${err.message}`);
      return host;
    }
  }
  return null;
}

async function run() {
  console.log('Probing Singapore poolers with different server indexes (aws-0 to aws-10)...');
  const results = await Promise.all(indexes.map(i => probeIndex(i)));
  const match = results.find(r => r !== null);
  if (match) {
    console.log(`\n\n🎯 MATCH FOUND: ${match}`);
  } else {
    console.log('\n\n❌ No match found on Singapore poolers aws-0 through aws-10.');
  }
  process.exit();
}

run();
