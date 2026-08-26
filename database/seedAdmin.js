const bcrypt = require('bcryptjs');
const db = require('../db');

async function createAdmin() {
  try {
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.execute(
      `INSERT INTO users (full_name, email, password, role) 
       VALUES (?, ?, ?, ?)`,
      ['Super Admin', 'admin@school.com', hashedPassword, 'admin']
    );

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@school.com');
    console.log('🔑 Password: admin123');
    process.exit(0);

  } catch (err) {
    console.log('❌ Error:', err.message);
    process.exit(1);
  }
}

createAdmin();