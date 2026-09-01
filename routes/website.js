const express = require('express');
const router = express.Router();
const db = require('../db');
const upload = require('../config/upload');
const https = require('https');
const { sendMail } = require('../config/mailer');

// ==============================
// PAYSTACK CONFIG
// ==============================
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const APPLICATION_FEE = 5000; // Naira

// ==============================
// POST - Contact Page message -> sends email to school inbox
// ==============================
router.post('/api/contact', async (req, res) => {
  const { name, phone, email, subject, message } = req.body;

  try {
    if (!name || !phone || !subject || !message) {
      return res.json({ success: false, message: 'Please fill in all required fields!' });
    }

    await sendMail({
      to: process.env.GMAIL_USER,
      replyTo: email || undefined,
      subject: `📩 New Message from Website: ${subject}`,
      html: `
        <h2>New Message from Contact Page</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Email:</strong> ${email || 'Not provided'}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `,
    });

    res.json({ success: true, message: 'Your message was sent successfully!' });
  } catch (err) {
    console.error('Contact email error:', err);
    res.json({ success: false, message: 'There was a problem sending your message. Please try again.' });
  }
});

// ==============================
// GET - Public Teachers
// ==============================
router.get('/api/teachers', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT u.full_name, t.subject_id, t.class_id, t.photo,
             s.subject_name, c.class_name
      FROM users u
      LEFT JOIN teachers t ON u.id = t.user_id
      LEFT JOIN subjects s ON t.subject_id = s.id
      LEFT JOIN classes c ON t.class_id = c.id
      WHERE u.role = 'teacher'
      ORDER BY u.full_name ASC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// ==============================
// GET - Public Stats
// ==============================
router.get('/api/stats', async (req, res) => {
  try {
    const [students] = await db.execute('SELECT COUNT(*) as total FROM students');
    const [teachers] = await db.execute('SELECT COUNT(*) as total FROM users WHERE role = "teacher"');
    res.json({
      success: true,
      students: students[0].total,
      teachers: teachers[0].total
    });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// ==============================
// GET - Sessions (public)
// ==============================
router.get('/api/sessions', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM sessions ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// ==============================
// GET - Result Checker
// ==============================
router.get('/api/result', async (req, res) => {
  const { admission, session, term } = req.query;
  try {
    const [students] = await db.execute(`
      SELECT s.*, c.class_name
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.admission_number = ?
    `, [admission]);

    if (students.length === 0) {
      return res.json({ success: false, message: 'Admission number not found!' });
    }

    const student = students[0];

    const [results] = await db.execute(`
      SELECT r.*, sub.subject_name
      FROM results r
      LEFT JOIN subjects sub ON r.subject_id = sub.id
      WHERE r.student_id = ? AND r.session_id = ? AND r.term = ?
      ORDER BY sub.subject_name ASC
    `, [student.id, session, term]);

    if (results.length === 0) {
      return res.json({ success: false, message: `No results found for ${term}!` });
    }

    const [sessions] = await db.execute('SELECT * FROM sessions WHERE id = ?', [session]);

    res.json({
      success: true,
      student: student,
      results: results,
      session_name: sessions[0]?.session_name || 'N/A',
      term: term
    });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// ==============================
// GET - Check Application Status
// ==============================
router.get('/api/apply/status', async (req, res) => {
  const { phone } = req.query;
  try {
    const [rows] = await db.execute(
      'SELECT * FROM applications WHERE parent_phone = ? ORDER BY created_at DESC',
      [phone]
    );
    if (rows.length === 0) {
      return res.json({ success: false, message: 'No application found with this phone number!' });
    }
    res.json({ success: true, data: rows });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// ==============================
// POST - TEMPORARY: Submit application WITHOUT payment (for testing)
// ==============================
router.post('/api/apply/submit-test', upload.single('passport_photo'), async (req, res) => {
  const {
    full_name, gender, date_of_birth,
    applying_for, parent_name, parent_phone,
    parent_email, address, previous_school
  } = req.body;

  try {
    if (!full_name || !gender || !date_of_birth || !applying_for || !parent_name || !parent_phone) {
      return res.json({ success: false, message: 'Please fill in all required fields!' });
    }

    const passport_photo = req.file ? req.file.filename : null;
    const reference = `TEST-${Date.now()}`;

    const [result] = await db.execute(`
      INSERT INTO applications 
      (full_name, gender, date_of_birth, applying_for, parent_name, parent_phone, 
       parent_email, address, previous_school, passport_photo, status, payment_status, payment_reference, paid_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'paid', ?, NOW())
    `, [full_name, gender, date_of_birth, applying_for, parent_name, parent_phone,
        parent_email, address, previous_school, passport_photo, reference]);

    res.json({
      success: true,
      message: 'Test application submitted (payment skipped)!',
      application_id: result.insertId
    });

  } catch (err) {
    console.error('Test submit error:', err);
    res.json({ success: false, message: err.message });
  }
});

// ==============================
// POST - STEP 1: Save application temporarily & initialize Paystack payment
// ==============================
router.post('/api/apply/initiate-payment', upload.single('passport_photo'), async (req, res) => {
  const {
    full_name, gender, date_of_birth,
    applying_for, parent_name, parent_phone,
    parent_email, address, previous_school
  } = req.body;

  try {
    if (!full_name || !gender || !date_of_birth || !applying_for || !parent_name || !parent_phone) {
      return res.json({ success: false, message: 'Please fill in all required fields!' });
    }

    if (!parent_email) {
      return res.json({ success: false, message: 'Email address required for payment!' });
    }

    const passport_photo = req.file ? req.file.filename : null;

    const [result] = await db.execute(`
      INSERT INTO applications 
      (full_name, gender, date_of_birth, applying_for, parent_name, parent_phone, 
       parent_email, address, previous_school, passport_photo, status, payment_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_payment', 'unpaid')
    `, [full_name, gender, date_of_birth, applying_for, parent_name, parent_phone,
        parent_email, address, previous_school, passport_photo]);

    const application_id = result.insertId;
    const reference = `SYMS-APP-${application_id}-${Date.now()}`;

    await db.execute(
      'UPDATE applications SET payment_reference = ? WHERE id = ?',
      [reference, application_id]
    );

    const paystack_data = JSON.stringify({
      email: parent_email,
      amount: APPLICATION_FEE * 100,
      reference: reference,
      metadata: {
        application_id: application_id,
        student_name: full_name,
        applying_for: applying_for,
        parent_name: parent_name,
        parent_phone: parent_phone
      },
      callback_url: `${req.protocol}://${req.get('host')}/website/api/apply/verify-payment`
    });

    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: '/transaction/initialize',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const paystack_res = await new Promise((resolve, reject) => {
      const req_ps = https.request(options, (res_ps) => {
        let data = '';
        res_ps.on('data', (chunk) => data += chunk);
        res_ps.on('end', () => resolve(JSON.parse(data)));
      });
      req_ps.on('error', reject);
      req_ps.write(paystack_data);
      req_ps.end();
    });

    if (!paystack_res.status) {
      return res.json({ success: false, message: 'Payment initialization failed. Try again.' });
    }

    res.json({
      success: true,
      payment_url: paystack_res.data.authorization_url,
      reference: reference,
      application_id: application_id
    });

  } catch (err) {
    console.error('Payment initiation error:', err);
    res.json({ success: false, message: err.message });
  }
});

// ==============================
// GET - STEP 2: Verify Payment (Paystack callback)
// ==============================
router.get('/api/apply/verify-payment', async (req, res) => {
  const { reference } = req.query;

  try {
    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: `/transaction/verify/${reference}`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
      }
    };

    const paystack_res = await new Promise((resolve, reject) => {
      const req_ps = https.request(options, (res_ps) => {
        let data = '';
        res_ps.on('data', (chunk) => data += chunk);
        res_ps.on('end', () => resolve(JSON.parse(data)));
      });
      req_ps.on('error', reject);
      req_ps.end();
    });

    if (paystack_res.data.status === 'success') {
      await db.execute(
        `UPDATE applications 
         SET status = 'pending', payment_status = 'paid', paid_at = NOW()
         WHERE payment_reference = ?`,
        [reference]
      );

      const [apps] = await db.execute(
        'SELECT * FROM applications WHERE payment_reference = ?',
        [reference]
      );

      if (apps.length > 0) {
        return res.redirect(`/website/apply.html?payment=success&id=${apps[0].id}`);
      }
    } else {
      await db.execute(
        `UPDATE applications SET status = 'payment_failed', payment_status = 'failed'
         WHERE payment_reference = ?`,
        [reference]
      );
      return res.redirect('/website/apply.html?payment=failed');
    }

  } catch (err) {
    console.error('Payment verification error:', err);
    res.redirect('/website/apply.html?payment=failed');
  }
});

// ==============================
// GET - Get application by ID (for receipt)
// ==============================
router.get('/api/apply/details/:id', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM applications WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.json({ success: false, message: 'Application not found!' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// ==============================
// GET - Generate Payment Receipt PDF
// ==============================
router.get('/api/apply/receipt/:id', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM applications WHERE id = ?',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.json({ success: false, message: 'Application not found!' });
    }

    const app = rows[0];

    if (app.payment_status !== 'paid') {
      return res.json({ success: false, message: 'Payment not confirmed yet!' });
    }

    const html = generateReceiptHTML(app);

    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A5',
      printBackground: true,
      margin: { top: '15px', bottom: '15px', left: '15px', right: '15px' }
    });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Receipt-${app.full_name}.pdf"`);
    res.send(pdf);

  } catch (err) {
    console.error('Receipt generation error:', err);
    res.json({ success: false, message: err.message });
  }
});

// ==============================
// HELPER: Generate Receipt HTML
// ==============================
function generateReceiptHTML(app) {
  const paid_date = app.paid_at
    ? new Date(app.paid_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: white; color: #333; }
    .receipt { max-width: 500px; margin: 0 auto; padding: 30px; border: 3px solid #0a1628; }
    .header { text-align: center; padding-bottom: 15px; border-bottom: 3px solid #c9a84c; margin-bottom: 20px; }
    .school-name { font-size: 18px; font-weight: 800; color: #0a1628; text-transform: uppercase; }
    .school-sub { font-size: 11px; color: #666; margin-top: 3px; }
    .receipt-title { text-align: center; margin: 15px 0; }
    .receipt-title h2 { font-size: 16px; font-weight: 800; color: #0a1628; text-transform: uppercase; letter-spacing: 2px; padding: 8px 20px; border: 2px solid #c9a84c; display: inline-block; }
    .paid-stamp { text-align: center; margin: 10px 0; }
    .paid-stamp span { display: inline-block; background: #e8f5e9; color: #2e7d32; border: 2px solid #2e7d32; padding: 5px 20px; border-radius: 5px; font-size: 14px; font-weight: 800; letter-spacing: 3px; transform: rotate(-3deg); }
    .info-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    .info-table tr { border-bottom: 1px dashed #ddd; }
    .info-table td { padding: 8px 5px; font-size: 12px; }
    .info-table td:first-child { font-weight: 700; color: #0a1628; width: 45%; }
    .amount-box { background: #0a1628; color: white; padding: 15px; border-radius: 8px; text-align: center; margin: 15px 0; }
    .amount-box p { font-size: 11px; opacity: 0.7; margin-bottom: 5px; }
    .amount-box h2 { font-size: 28px; font-weight: 800; color: #c9a84c; }
    .footer { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 2px solid #c9a84c; font-size: 10px; color: #888; }
    .ref-box { background: #f9f9f9; padding: 8px 12px; border-radius: 5px; font-size: 11px; margin: 10px 0; }
    .ref-box strong { color: #0a1628; }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div class="school-name">🏫 Sani Yahaya Memorial School</div>
      <div class="school-sub">Kano State, Nigeria | +234 800 000 0000 | info@syms.edu.ng</div>
    </div>
    <div class="receipt-title"><h2>Payment Receipt</h2></div>
    <div class="paid-stamp"><span>✅ PAID</span></div>
    <div class="ref-box">
      <strong>Receipt No:</strong> SYMS-RCT-${String(app.id).padStart(5, '0')}<br>
      <strong>Reference:</strong> ${app.payment_reference || 'N/A'}<br>
      <strong>Date Paid:</strong> ${paid_date}
    </div>
    <table class="info-table">
      <tr><td>Student Name:</td><td><strong>${app.full_name.toUpperCase()}</strong></td></tr>
      <tr><td>Applying For:</td><td>${app.applying_for}</td></tr>
      <tr><td>Parent Name:</td><td>${app.parent_name}</td></tr>
      <tr><td>Parent Phone:</td><td>${app.parent_phone}</td></tr>
      <tr><td>Payment Type:</td><td>Application Fee</td></tr>
      <tr><td>Payment Method:</td><td>Paystack (Online)</td></tr>
      <tr><td>Academic Session:</td><td>2025/2026</td></tr>
    </table>
    <div class="amount-box">
      <p>AMOUNT PAID</p>
      <h2>₦${APPLICATION_FEE.toLocaleString()}.00</h2>
    </div>
    <div class="footer">
      <p>This is a computer-generated receipt and is valid without signature.</p>
      <p style="margin-top:5px">Thank you for choosing Sani Yahaya Memorial School</p>
      <p style="margin-top:3px">📍 Kano State, Nigeria | 🌐 www.syms.edu.ng</p>
    </div>
  </div>
</body>
</html>`;
}

module.exports = router;