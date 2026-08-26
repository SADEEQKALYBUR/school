const express = require('express');
const router = express.Router();
const db = require('../db');

// Middleware - check parent login
function isParent(req, res, next) {
  if (req.session.parent) {
    return next();
  }
  res.redirect('/portal/login');
}

// GET - Portal Login Page
router.get('/login', (req, res) => {
  res.sendFile('portal/login.html', { root: './public' });
});

// GET - Portal Dashboard
router.get('/dashboard', isParent, (req, res) => {
  res.sendFile('portal/dashboard.html', { root: './public' });
});

// GET - Student Info API
router.get('/api/student-info', isParent, async (req, res) => {
  try {
    const student_id = req.session.parent.id;
    const [rows] = await db.execute(`
      SELECT s.*, c.class_name
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.id = ?
    `, [student_id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// GET - Student Results API
router.get('/api/results', isParent, async (req, res) => {
  try {
    const student_id = req.session.parent.id;
    const [rows] = await db.execute(`
      SELECT r.*,
             sub.subject_name,
             ses.session_name
      FROM results r
      LEFT JOIN subjects sub ON r.subject_id = sub.id
      LEFT JOIN sessions ses ON r.session_id = ses.id
      WHERE r.student_id = ?
      ORDER BY ses.session_name, sub.subject_name
    `, [student_id]);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// GET - Student Payments API
router.get('/api/payments', isParent, async (req, res) => {
  try {
    const student_id = req.session.parent.id;
    const [rows] = await db.execute(`
      SELECT p.*, ses.session_name
      FROM payments p
      LEFT JOIN sessions ses ON p.session_id = ses.id
      WHERE p.student_id = ?
      ORDER BY p.created_at DESC
    `, [student_id]);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// GET - Student ID Card
router.get('/api/idcard', isParent, async (req, res) => {
  try {
    const student_id = req.session.parent.id;
    const [rows] = await db.execute(`
      SELECT s.*, c.class_name
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.id = ?
    `, [student_id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});// GET - Student ID Card
router.get('/api/idcard', isParent, async (req, res) => {
  try {
    const student_id = req.session.parent.id;
    const [rows] = await db.execute(`
      SELECT s.*, c.class_name
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.id = ?
    `, [student_id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// GET - Initialize Paystack Payment
router.post('/api/payment/initialize', isParent, async (req, res) => {
  const { amount, payment_type, session_id } = req.body;
  const student = req.session.parent;

  try {
    // Get student email from DB
    const [rows] = await db.execute(
      'SELECT * FROM students WHERE id = ?', [student.id]
    );

    const studentData = rows[0];

    // Initialize Paystack
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: `${studentData.admission_number}@school.com`,
        amount: amount * 100, // Paystack uses kobo
        metadata: {
          student_id: student.id,
          payment_type: payment_type,
          session_id: session_id,
          student_name: student.full_name,
          admission_number: student.admission_number
        }
      })
    });

    const data = await response.json();

    if (data.status) {
      // Save pending payment
      await db.execute(
        `INSERT INTO payments (student_id, amount, payment_type, status, transaction_ref, session_id)
         VALUES (?, ?, ?, 'pending', ?, ?)`,
        [student.id, amount, payment_type, data.data.reference, session_id]
      );

      res.json({ success: true, url: data.data.authorization_url });
    } else {
      res.json({ success: false, message: data.message });
    }
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// GET - Verify Paystack Payment
router.get('/payment/verify/:reference', isParent, async (req, res) => {
  const { reference } = req.params;

  try {
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      }
    );

    const data = await response.json();

    if (data.data.status === 'success') {
      // Update payment status
      await db.execute(
        'UPDATE payments SET status = ? WHERE transaction_ref = ?',
        ['paid', reference]
      );

      res.redirect('/portal/payment/success');
    } else {
      res.redirect('/portal/payment/failed');
    }
  } catch (err) {
    res.redirect('/portal/payment/failed');
  }
});

// GET - Payment Success Page
router.get('/payment/success', isParent, (req, res) => {
  res.sendFile('portal/payment-success.html', { root: './public' });
});

// GET - Payment Failed Page
router.get('/payment/failed', isParent, (req, res) => {
  res.sendFile('portal/payment-failed.html', { root: './public' });
});

// GET - Sessions
router.get('/api/sessions', isParent, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM sessions ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// Paystack Webhook
router.post('/payment/webhook', async (req, res) => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const hash = require('crypto')
    .createHmac('sha512', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(401).send('Unauthorized');
  }

  const event = req.body;

  if (event.event === 'charge.success') {
    const reference = event.data.reference;
    await db.execute(
      'UPDATE payments SET status = ? WHERE transaction_ref = ?',
      ['paid', reference]
    );
  }

  res.sendStatus(200);
});

// GET - Fee Types with amounts
router.get('/api/fee-types', isParent, async (req, res) => {
  try {
    const student_id = req.session.parent.id;
    const [student] = await db.execute('SELECT class_id FROM students WHERE id = ?', [student_id]);
    const class_id = student.length > 0 ? student[0].class_id : null;

    const [rows] = await db.execute(
      'SELECT * FROM fee_types WHERE class_id = ? ORDER BY payment_type ASC',
      [class_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// GET - Check if student has approved application
router.get('/api/admission-letter', isParent, async (req, res) => {
  try {
    const student_id = req.session.parent.id;

    // Get student info
    const [students] = await db.execute(`
      SELECT s.*, c.class_name
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.id = ?
    `, [student_id]);

    if (students.length === 0) {
      return res.json({ success: false, message: 'Student not found!' });
    }

    const student = students[0];

    // Check if there is approved application
    const [apps] = await db.execute(`
      SELECT * FROM applications 
      WHERE parent_phone = ? AND status = 'approved'
      ORDER BY created_at DESC LIMIT 1
    `, [student.parent_phone]);

    res.json({
      success: true,
      student: student,
      application: apps.length > 0 ? apps[0] : null
    });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

module.exports = router;