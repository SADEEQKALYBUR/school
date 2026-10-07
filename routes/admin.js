const express = require('express');
const router = express.Router();
const db = require('../db');
const path = require('path');
const { isAdmin } = require('../middleware/auth');
const upload = require('../config/upload');
const { buildMarksheetHTML } = require('../config/marksheetTemplate');

// ===== DASHBOARD =====
router.get('/dashboard', isAdmin, async (req, res) => {
  try {
    res.sendFile('admin/dashboard.html', { root: './public' });
  } catch (err) {
    console.log(err);
    res.send('Server error');
  }
});

router.get('/stats', isAdmin, async (req, res) => {
  try {
    const [students] = await db.execute('SELECT COUNT(*) as total FROM students');
    const [classes] = await db.execute('SELECT COUNT(*) as total FROM classes');
    const [teachers] = await db.execute("SELECT COUNT(*) as total FROM users WHERE role = 'teacher'");
    const [pending] = await db.execute("SELECT COUNT(*) as total FROM applications WHERE status = 'pending'");
    const [approved] = await db.execute("SELECT COUNT(*) as total FROM applications WHERE status = 'approved'");
    res.json({
      students: students[0].total,
      classes: classes[0].total,
      teachers: teachers[0].total,
      pending: pending[0].total,
      approved: approved[0].total
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});

router.get('/recent-students', isAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT s.full_name, s.admission_number, c.class_name
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      ORDER BY s.created_at DESC
      LIMIT 5
    `);
    res.json(rows);
  } catch (err) {
    res.json({ error: err.message });
  }
});

// ===== CLASSES =====
router.get('/classes', isAdmin, async (req, res) => {
  res.sendFile('admin/classes.html', { root: './public' });
});

router.get('/api/classes', isAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM classes ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

router.get('/api/classes/list', isAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM classes ORDER BY class_name ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

router.post('/api/classes/add', isAdmin, async (req, res) => {
  const { class_name, class_code, level } = req.body;
  try {
    await db.execute(
      'INSERT INTO classes (class_name, class_code, level) VALUES (?, ?, ?)',
      [class_name, class_code, level]
    );
    res.json({ success: true, message: 'Class added successfully!' });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

router.post('/api/classes/delete', isAdmin, async (req, res) => {
  const { id } = req.body;
  try {
    await db.execute('DELETE FROM classes WHERE id = ?', [id]);
    res.json({ success: true, message: 'Class deleted!' });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// ===== STUDENTS (API only - used internally, no admin page) =====
router.get('/api/students', isAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT s.*, c.class_name 
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      ORDER BY s.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

router.get('/api/students/by-class/:class_id', isAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT * FROM students WHERE class_id = ? AND (status = 'active' OR status IS NULL)",
      [req.params.class_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// ===== SUBJECTS =====
router.get('/subjects', isAdmin, async (req, res) => {
  res.sendFile('admin/subjects.html', { root: './public' });
});

router.get('/api/subjects', isAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT s.*, c.class_name 
      FROM subjects s
      LEFT JOIN classes c ON s.class_id = c.id
      ORDER BY s.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

router.get('/api/subjects/list', isAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM subjects ORDER BY subject_name ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

router.get('/api/subjects/by-class/:class_id', isAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT * FROM subjects WHERE class_id = ? AND (status = 'active' OR status IS NULL)",
      [req.params.class_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

router.post('/api/subjects/add', isAdmin, async (req, res) => {
  const { subject_name, subject_code, class_id } = req.body;
  try {
    await db.execute(
      'INSERT INTO subjects (subject_name, subject_code, class_id) VALUES (?, ?, ?)',
      [subject_name, subject_code, class_id]
    );
    res.json({ success: true, message: 'Subject added successfully!' });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

router.post('/api/subjects/delete', isAdmin, async (req, res) => {
  const { id } = req.body;
  try {
    await db.execute('DELETE FROM subjects WHERE id = ?', [id]);
    res.json({ success: true, message: 'Subject deleted!' });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// ===== RESULTS =====
router.get('/results', isAdmin, async (req, res) => {
  res.sendFile('admin/results.html', { root: './public' });
});

router.get('/api/results', isAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT r.*, 
             s.full_name as student_name,
             s.admission_number,
             sub.subject_name,
             c.class_name,
             ses.session_name
      FROM results r
      LEFT JOIN students s ON r.student_id = s.id
      LEFT JOIN subjects sub ON r.subject_id = sub.id
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN sessions ses ON r.session_id = ses.id
      ORDER BY r.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

router.post('/api/results/add', isAdmin, async (req, res) => {
  const { student_id, subject_id, session_id, term, ca_score, exam_score } = req.body;
  try {
    const total_score = parseFloat(ca_score) + parseFloat(exam_score);
    let grade = '';
    if (total_score >= 70) grade = 'A';
    else if (total_score >= 60) grade = 'B';
    else if (total_score >= 50) grade = 'C';
    else if (total_score >= 45) grade = 'D';
    else if (total_score >= 40) grade = 'E';
    else grade = 'F';

    const [existing] = await db.execute(
      'SELECT * FROM results WHERE student_id = ? AND subject_id = ? AND session_id = ? AND term = ?',
      [student_id, subject_id, session_id, term]
    );

    if (existing.length > 0) {
      await db.execute(
        `UPDATE results SET ca_score = ?, exam_score = ?, total_score = ?, grade = ?
         WHERE student_id = ? AND subject_id = ? AND session_id = ? AND term = ?`,
        [ca_score, exam_score, total_score, grade, student_id, subject_id, session_id, term]
      );
    } else {
      await db.execute(
        `INSERT INTO results (student_id, subject_id, session_id, term, ca_score, exam_score, total_score, grade)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [student_id, subject_id, session_id, term, ca_score, exam_score, total_score, grade]
      );
    }

    res.json({ success: true, message: 'Result saved successfully!' });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// ===== SESSIONS =====
router.get('/api/sessions', isAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM sessions ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

router.post('/api/sessions/add', isAdmin, async (req, res) => {
  const { session_name } = req.body;
  try {
    await db.execute(
      'INSERT INTO sessions (session_name, is_current) VALUES (?, ?)',
      [session_name, false]
    );
    res.json({ success: true, message: 'Session added!' });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// ===== ID CARD =====
router.get('/idcard', isAdmin, async (req, res) => {
  res.sendFile('admin/idcard.html', { root: './public' });
});

router.get('/api/idcard/:student_id', isAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT s.*, c.class_name
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.id = ?
    `, [req.params.student_id]);
    if (rows.length === 0) {
      return res.json({ success: false, message: 'Student not found!' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// ===== APPLICATIONS =====
router.get('/applications', isAdmin, async (req, res) => {
  res.sendFile('admin/applications.html', { root: './public' });
});

router.get('/api/applications', isAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM applications ORDER BY created_at DESC'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

router.post('/api/applications/update-status', isAdmin, async (req, res) => {
  const { id, status } = req.body;
  try {
    await db.execute(
      'UPDATE applications SET status = ? WHERE id = ?',
      [status, id]
    );

    // Idan approved — auto register student
    if (status === 'approved') {
      const [apps] = await db.execute(
        'SELECT * FROM applications WHERE id = ?', [id]
      );

      if (apps.length > 0) {
        const app = apps[0];

        const [existing] = await db.execute(
          'SELECT * FROM students WHERE parent_phone = ?',
          [app.parent_phone]
        );

        if (existing.length === 0) {
          // Try exact match first, then partial
// Exact match first
let [classes] = await db.execute(
  'SELECT * FROM classes WHERE class_name = ?',
  [app.applying_for]
);

// Idan babu exact match, try LIKE
if (classes.length === 0) {
  [classes] = await db.execute(
    'SELECT * FROM classes WHERE class_name LIKE ?',
    [`%${app.applying_for}%`]
  );
}

          const class_id = classes.length > 0 ? classes[0].id : null;
          const classCode = classes.length > 0 ? classes[0].class_code : 'STU';

          const [count] = await db.execute('SELECT COUNT(*) as total FROM students');
          const total = count[0].total + 1;
          const admission_number = 'ADM-' + new Date().getFullYear() + '-' + String(total).padStart(3, '0');
          const year = new Date().getFullYear();
          const serial_number = classCode + '-' + year + '-' + String(total).padStart(3, '0');

          await db.execute(`
            INSERT INTO students 
            (full_name, gender, date_of_birth, parent_name, parent_phone, 
             class_id, admission_number, serial_number, passport_photo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            app.full_name, app.gender, app.date_of_birth,
            app.parent_name, app.parent_phone,
            class_id, admission_number, serial_number, app.passport_photo
          ]);
        }
      }
    }

    res.json({ success: true, message: 'Status updated!' });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// GET - Generate Admission Letter PDF (admin print)
router.get('/api/applications/admission-letter/:id', isAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM applications WHERE id = ?',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.json({ success: false, message: 'Application not found!' });
    }

    const app = rows[0];
    const photoUrl = app.passport_photo
      ? `file://${path.join(__dirname, '..', 'uploads', 'photos', app.passport_photo)}`
      : null;

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: Arial, sans-serif; color:#333; background:white; }
.letter { max-width:750px; margin:0 auto; padding:40px; border:3px solid #0a1628; }
.header { text-align:center; padding-bottom:20px; border-bottom:3px solid #c9a84c; margin-bottom:25px; display:flex; align-items:center; justify-content:center; gap:20px; }
.school-logo { width:80px; height:80px; background:#0a1628; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:40px; flex-shrink:0; }
.school-info h1 { font-size:22px; font-weight:800; color:#0a1628; text-transform:uppercase; }
.school-info p { font-size:13px; color:#555; margin-top:3px; }
.school-info .tagline { font-size:12px; color:#c9a84c; font-style:italic; margin-top:2px; }
.letter-title { text-align:center; margin:20px 0; }
.letter-title h2 { font-size:20px; font-weight:800; color:#0a1628; text-transform:uppercase; letter-spacing:2px; padding:10px 30px; border:2px solid #c9a84c; display:inline-block; }
.student-section { display:flex; gap:30px; margin:25px 0; align-items:flex-start; }
.student-photo { width:120px; height:140px; border:3px solid #0a1628; border-radius:8px; overflow:hidden; flex-shrink:0; display:flex; align-items:center; justify-content:center; background:#f5f5f5; font-size:60px; }
.student-photo img { width:100%; height:100%; object-fit:cover; }
.detail-row { display:flex; margin-bottom:10px; border-bottom:1px dashed #ddd; padding-bottom:8px; }
.detail-label { font-size:13px; font-weight:700; color:#0a1628; width:180px; flex-shrink:0; }
.detail-value { font-size:13px; color:#333; font-weight:600; }
.message-body { margin:20px 0; line-height:1.8; font-size:14px; color:#444; }
.conditions { background:#f9f9f9; border-left:4px solid #c9a84c; padding:15px 20px; margin:20px 0; border-radius:0 8px 8px 0; }
.conditions h4 { font-size:14px; font-weight:700; color:#0a1628; margin-bottom:10px; }
.conditions ul { list-style:none; display:flex; flex-direction:column; gap:6px; }
.conditions ul li { font-size:13px; color:#555; }
.conditions ul li::before { content:"✓ "; color:#c9a84c; font-weight:700; }
.signature-section { display:flex; justify-content:space-between; margin-top:40px; }
.signature-box { text-align:center; width:180px; }
.signature-line { border-top:2px solid #0a1628; margin-bottom:8px; }
.footer { text-align:center; margin-top:30px; padding-top:15px; border-top:2px solid #c9a84c; font-size:12px; color:#888; }
.ref-number { background:#0a1628; color:#c9a84c; padding:5px 15px; border-radius:20px; font-size:12px; font-weight:700; display:inline-block; }
.status-badge { background:#e8f5e9; color:#2e7d32; padding:5px 20px; border-radius:20px; font-size:13px; font-weight:700; display:inline-block; margin:10px 0; }
</style>
</head>
<body>
<div class="letter">
<div class="header">
<div class="school-logo">🏫</div>
<div class="school-info">
<h1>Sani Yahaya Memorial School</h1>
<p>📍 Kano State, Nigeria | 📞 +234 800 000 0000 | ✉️ info@syms.edu.ng</p>
<p class="tagline">"Excellence in Education — Shaping Futures, Building Leaders"</p>
</div>
</div>
<div class="letter-title"><h2>Admission Letter</h2></div>
<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px">
<span class="ref-number">REF: SYMS/ADM/${new Date().getFullYear()}/${String(app.id).padStart(4,'0')}</span>
<span style="font-size:13px; color:#555">Date: ${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</span>
</div>
<div class="student-section">
<div class="student-photo">
${photoUrl ? `<img src="${photoUrl}" alt="Photo" />` : '👨‍🎓'}
</div>
<div style="flex:1">
<div class="detail-row"><span class="detail-label">Student Name:</span><span class="detail-value">${app.full_name.toUpperCase()}</span></div>
<div class="detail-row"><span class="detail-label">Gender:</span><span class="detail-value">${app.gender.charAt(0).toUpperCase()+app.gender.slice(1)}</span></div>
<div class="detail-row"><span class="detail-label">Date of Birth:</span><span class="detail-value">${new Date(app.date_of_birth).toLocaleDateString('en-GB')}</span></div>
<div class="detail-row"><span class="detail-label">Class Admitted:</span><span class="detail-value" style="color:#0a1628;font-weight:800">${app.applying_for}</span></div>
<div class="detail-row"><span class="detail-label">Parent/Guardian:</span><span class="detail-value">${app.parent_name}</span></div>
<div class="detail-row"><span class="detail-label">Parent Phone:</span><span class="detail-value">${app.parent_phone}</span></div>
<div class="detail-row"><span class="detail-label">Academic Session:</span><span class="detail-value">2025/2026</span></div>
<div style="margin-top:10px"><span class="status-badge">✅ ADMISSION APPROVED</span></div>
</div>
</div>
<div class="message-body">
<p>Dear <strong>${app.parent_name}</strong>,</p><br>
<p>On behalf of the Management and Staff of <strong>Sani Yahaya Memorial School</strong>, we are delighted to inform you that your child/ward, <strong>${app.full_name.toUpperCase()}</strong>, has been offered admission into <strong>${app.applying_for}</strong> for the <strong>2025/2026 Academic Session</strong>.</p><br>
<p>This admission is offered based on the satisfactory performance in our entrance assessment and the information provided during the application process.</p>
</div>
<div class="conditions">
<h4>📋 Conditions of Admission:</h4>
<ul>
<li>Payment of all required school fees before resumption</li>
<li>Submission of original copies of all required documents</li>
<li>Purchase of official school uniform from approved vendor</li>
<li>Adherence to all school rules and regulations</li>
<li>Resumption Date: September 1, 2026</li>
</ul>
</div>
<div class="signature-section">
<div class="signature-box"><div class="signature-line"></div><strong>Principal</strong><p>Sani Yahaya Memorial School</p></div>
<div class="signature-box"><div class="signature-line"></div><strong>School Stamp</strong><p>Official Seal</p></div>
<div class="signature-box"><div class="signature-line"></div><strong>Parent/Guardian</strong><p>Acknowledgement</p></div>
</div>
<div class="footer">
<p>This letter is computer generated and valid without signature if bearing the school seal.</p>
<p style="margin-top:5px">📍 Kano State, Nigeria | 📞 +234 800 000 0000 | ✉️ info@syms.edu.ng | 🌐 www.syms.edu.ng</p>
</div>
</div>
</body>
</html>`;

    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
    });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Admission-Letter-${app.full_name}.pdf"`);
    res.send(pdf);

  } catch (err) {
    console.log(err);
    res.json({ success: false, message: err.message });
  }
});
// ===== TEACHERS =====
// ===== TEACHERS =====
router.get('/teachers', isAdmin, async (req, res) => {
  res.sendFile('admin/teachers.html', { root: './public' });
});

router.get('/api/teachers', isAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT u.id, u.full_name, u.email, u.created_at,
             t.phone, t.id as teacher_id, t.photo,
             s.subject_name, c.class_name, c.id as class_id
      FROM users u
      LEFT JOIN teachers t ON u.id = t.user_id
      LEFT JOIN subjects s ON t.subject_id = s.id
      LEFT JOIN classes c ON t.class_id = c.id
      WHERE u.role = 'teacher'
      ORDER BY u.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

router.post('/api/teachers/add', isAdmin, upload.single('photo'), async (req, res) => {
  const { full_name, email, password, phone, class_id, subject_id } = req.body;
  try {
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);
    const photo = req.file ? req.file.filename : null;

    const [result] = await db.execute(
      'INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)',
      [full_name, email, hashedPassword, 'teacher']
    );

    const user_id = result.insertId;

    await db.execute(
      'INSERT INTO teachers (user_id, subject_id, class_id, phone, photo) VALUES (?, ?, ?, ?, ?)',
      [user_id, subject_id || null, class_id || null, phone || null, photo]
    );

    res.json({ success: true, message: 'Teacher registered successfully!' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.json({ success: false, message: 'Email already exists!' });
    }
    res.json({ success: false, message: err.message });
  }
});

router.post('/api/teachers/delete', isAdmin, async (req, res) => {
  const { id } = req.body;
  try {
    await db.execute('DELETE FROM teachers WHERE user_id = ?', [id]);
    await db.execute('DELETE FROM users WHERE id = ?', [id]);
    res.json({ success: true, message: 'Teacher deleted!' });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// ===== FEES =====
router.get('/fees', isAdmin, async (req, res) => {
  res.sendFile('admin/fees.html', { root: './public' });
});

router.get('/api/fee-types', isAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT f.*, c.class_name
      FROM fee_types f
      LEFT JOIN classes c ON f.class_id = c.id
      ORDER BY c.class_name ASC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

router.post('/api/fee-types/add', isAdmin, async (req, res) => {
  const { payment_type, amount, class_id } = req.body;
  try {
    await db.execute(
      'INSERT INTO fee_types (payment_type, amount, class_id) VALUES (?, ?, ?)',
      [payment_type, amount, class_id || null]
    );
    res.json({ success: true, message: 'Fee added successfully!' });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

router.post('/api/fee-types/delete', isAdmin, async (req, res) => {
  const { id } = req.body;
  try {
    await db.execute('DELETE FROM fee_types WHERE id = ?', [id]);
    res.json({ success: true, message: 'Fee deleted!' });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// GET - Download Marksheet PDF for any student (admin)
router.get('/api/marksheet/:student_id/:session_id/:term', isAdmin, async (req, res) => {
  try {
    const { student_id, session_id, term } = req.params;

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

    const [results] = await db.execute(`
      SELECT r.*, sub.subject_name
      FROM results r
      LEFT JOIN subjects sub ON r.subject_id = sub.id
      WHERE r.student_id = ? AND r.session_id = ? AND r.term = ?
      ORDER BY sub.subject_name ASC
    `, [student_id, session_id, term]);

    const [sessionRows] = await db.execute(
      'SELECT session_name FROM sessions WHERE id = ?', [session_id]
    );
    const session_name = sessionRows.length ? sessionRows[0].session_name : '';

    const [attRows] = await db.execute(`
      SELECT
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present_count,
        COUNT(*) AS total_count
      FROM attendance
      WHERE student_id = ? AND session_id = ?
    `, [student_id, session_id]);

    let attendance_percent = null;
    if (attRows.length && attRows[0].total_count > 0) {
      attendance_percent = Math.round((attRows[0].present_count / attRows[0].total_count) * 100);
    }

    const html = buildMarksheetHTML(student, results, {
      session_name,
      term,
      attendance_percent,
    });

    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15px', bottom: '15px', left: '15px', right: '15px' }
    });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Marksheet-${student.full_name}-${term}.pdf"`);
    res.send(pdf);

  } catch (err) {
    console.log(err);
    res.json({ success: false, message: err.message });
  }
});

module.exports = router;