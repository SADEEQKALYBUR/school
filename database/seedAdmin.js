const bcrypt = require('bcryptjs');
const db = require('../db');

async function createAdmin() {
  try {
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if this admin email already exists
    const [existing] = await db.execute(
      'SELECT id FROM users WHERE email = ?',
      ['admin@school.com']
    );

    if (existing.length > 0) {
      // Reset password for the existing admin instead of failing on duplicate insert
      await db.execute(
        'UPDATE users SET password = ?, role = ? WHERE email = ?',
        [hashedPassword, 'admin', 'admin@school.com']
      );
      console.log('✅ Admin password reset successfully!');
    } else {
      await db.execute(
        `INSERT INTO users (full_name, email, password, role) 
         VALUES (?, ?, ?, ?)`,
        ['Super Admin', 'admin@school.com', hashedPassword, 'admin']
      );
      console.log('✅ Admin user created successfully!');
    }

    console.log('📧 Email: admin@school.com');
    console.log('🔑 Password: admin123');
    process.exit(0);

  } catch (err) {
    console.log('❌ Error:', err.message);
    process.exit(1);
  }
}

createAdmin();