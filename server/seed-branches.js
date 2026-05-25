const pool = require('./db');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    console.log('⏳ Connecting to database for admin seeding...');
    
    // Hash password "password" with 12 rounds
    const hashedPassword = await bcrypt.hash('password', 12);
    
    // Get branch IDs
    const branchesResult = await pool.query('SELECT id, name FROM branches');
    const branchMap = {};
    branchesResult.rows.forEach(row => {
      branchMap[row.name.toLowerCase()] = row.id;
    });
    
    console.log('Branches map:', branchMap);

    const admins = [
      {
        name: 'Super Admin Alinea',
        email: 'superadmin@alinea.com',
        role: 'admin',
        branch_id: null,
        address: 'Jl. Pusat Alinea No. 1, Semarang',
        phone: '081227884650'
      },
      {
        name: 'Admin Sampangan',
        email: 'admin.sampangan@alinea.com',
        role: 'admin',
        branch_id: branchMap['sampangan'],
        address: 'Jl. Sampangan Raya No. 12, Semarang',
        phone: '081227884651'
      },
      {
        name: 'Admin Unnes',
        email: 'admin.unnes@alinea.com',
        role: 'admin',
        branch_id: branchMap['unnes'],
        address: 'Jl. Unnes Raya No. 45, Sekaran, Semarang',
        phone: '081227884652'
      },
      {
        name: 'Admin Tlogosari',
        email: 'admin.tlogosari@alinea.com',
        role: 'admin',
        branch_id: branchMap['tlogosari'],
        address: 'Jl. Tlogosari Raya No. 78, Semarang',
        phone: '081227884653'
      }
    ];

    for (const admin of admins) {
      console.log(`⏳ Seeding account: ${admin.email}...`);
      const checkAdmin = await pool.query('SELECT id FROM users WHERE email = $1', [admin.email]);
      if (checkAdmin.rows.length === 0) {
        await pool.query(`
          INSERT INTO users (name, email, password, role, address, phone, branch_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [admin.name, admin.email, hashedPassword, admin.role, admin.address, admin.phone, admin.branch_id]);
        console.log(`✅ Seeded account: ${admin.email}`);
      } else {
        await pool.query(`
          UPDATE users 
          SET name = $1, password = $2, role = $3, address = $4, phone = $5, branch_id = $6
          WHERE email = $7
        `, [admin.name, hashedPassword, admin.role, admin.address, admin.phone, admin.branch_id, admin.email]);
        console.log(`ℹ️ Updated existing account: ${admin.email}`);
      }
    }
    
    console.log('\n🎉 Multi-Branch Admin Seeding completed successfully!');
  } catch (err) {
    console.error('❌ Error during seeding:', err);
  } finally {
    await pool.end();
  }
}

seed();
