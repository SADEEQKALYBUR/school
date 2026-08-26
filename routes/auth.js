const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');

// GET - Login Page
router.get('/login', (req, res) => {
  res.sendFile('login.html', { root: './public' });
});

// POST - Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check user exists
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
return res.json({ success: false, message: 'Email address not found!' });    }

    const user = rows[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
return res.json({ success: false, message: 'Incorrect password!' });    }

    // Save session
    req.session.user = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role
    };

    // Redirect based on role
    if (user.role === 'admin') {
      return res.json({ success: true, redirect: '/admin/dashboard' });
    } else if (user.role === 'teacher') {
      return res.json({ success: true, redirect: '/teacher/dashboard' });
    } else if (user.role === 'parent') {
      return res.json({ success: true, redirect: '/parent/dashboard' });
    }

  } catch (err) {
    console.log(err);
    return res.json({ success: false, message: 'Server error!' });
  }
});

// GET - Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/auth/login');
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// POST - Parent/Student Login
router.post('/parent-login', async (req, res) => {
  const { admission_number, password } = req.body;

  try {
    // Find student by admission number
    const [students] = await db.execute(
      `SELECT s.*, c.class_name 
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       WHERE s.admission_number = ?`,
      [admission_number]
    );

    if (students.length === 0) {
return res.json({ success: false, message: 'Admission number not found!' });    }

    const student = students[0];

    // Check password (parent phone number)
    if (password !== student.parent_phone) {
      return res.json({ success: false, message: 'Incorrect password!' });
    }

    // Save session
    req.session.parent = {
      id: student.id,
      full_name: student.full_name,
      admission_number: student.admission_number,
      class_name: student.class_name,
      class_id: student.class_id
    };

    return res.json({ success: true, redirect: '/portal/dashboard' });

  } catch (err) {
    console.log(err);
    return res.json({ success: false, message: 'Server error!' });
  }
});

// GET - Parent Logout
router.get('/parent-logout', (req, res) => {
  req.session.parent = null;
  res.redirect('/portal/login');
});

module.exports = router;