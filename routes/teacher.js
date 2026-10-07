const express = require('express');
const router = express.Router();
const db = require('../db');
const { isTeacher } = require('../middleware/auth');
const { buildMarksheetHTML } = require('../config/marksheetTemplate');

// GET - Teacher Dashboard
router.get('/dashboard', isTeacher, async (req, res) => {
  res.sendFile('teacher/dashboard.html', { root: './public' });
});

// GET - Teacher Info (own profile)
router.get('/api/me', isTeacher, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT u.id, u.full_name, u.email, u.created_at,
             t.phone, t.photo, t.id as teacher_id,
             s.subject_name, c.class_name, c.id as class_id
      FROM users u
      LEFT JOIN teachers t ON u.id = t.user_id
      LEFT JOIN subjects s ON t.subject_id = s.id
      LEFT JOIN classes c ON t.class_id = c.id
      WHERE u.id = ?
    `, [req.session.user.id]);

    if (rows.length === 0) {
      return res.json({ success: false, message: 'Teacher not found!' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// GET - Students in teacher's class
router.get('/api/my-students', isTeacher, async (req, res) => {
  try {
    const [teacher] = await db.execute(`
      SELECT t.class_id FROM teachers t WHERE t.user_id = ?
    `, [req.session.user.id]);

    if (teacher.length === 0 || !teacher[0].class_id) {
      return res.json({ success: true, data: [] });
    }

    const class_id = teacher[0].class_id;

    const [rows] = await db.execute(`
      SELECT s.*, c.class_name
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.class_id = ? AND (s.status = 'active' OR s.status IS NULL)
      ORDER BY s.full_name ASC
    `, [class_id]);

    res.json({ success: true, data: rows, class_id: class_id });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// GET - My Subjects
router.get('/api/my-subjects', isTeacher, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT s.*, c.class_name
      FROM subjects s
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN teachers t ON t.subject_id = s.id
      WHERE t.user_id = ?
    `, [req.session.user.id]);

    res.json({ success: true, data: rows });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// GET - Sessions
router.get('/api/sessions', isTeacher, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM sessions ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// POST - Save Attendance
router.post('/api/attendance/save', isTeacher, async (req, res) => {
  const { class_id, date, session_id, attendance } = req.body;
  try {
    for (const record of attendance) {
      const { student_id, status } = record;
      const [existing] = await db.execute(
        'SELECT * FROM attendance WHERE student_id = ? AND date = ?',
        [student_id, date]
      );
      if (existing.length > 0) {
        await db.execute(
          'UPDATE attendance SET status = ? WHERE student_id = ? AND date = ?',
          [status, student_id, date]
        );
      } else {
        await db.execute(
          `INSERT INTO attendance (student_id, class_id, date, status, session_id)
           VALUES (?, ?, ?, ?, ?)`,
          [student_id, class_id, date, status, session_id]
        );
      }
    }
    res.json({ success: true, message: 'Attendance saved!' });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// GET - Fetch Attendance
router.get('/api/attendance', isTeacher, async (req, res) => {
  const { class_id, date } = req.query;
  try {
    const [rows] = await db.execute(`
      SELECT a.*, s.full_name as student_name, s.admission_number
      FROM attendance a
      LEFT JOIN students s ON a.student_id = s.id
      WHERE a.class_id = ? AND a.date = ? AND (s.status = 'active' OR s.status IS NULL)
      ORDER BY s.full_name ASC
    `, [class_id, date]);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// POST - Save Result
router.post('/api/results/save', isTeacher, async (req, res) => {
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

    res.json({ success: true, message: 'Result saved!' });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// GET - Fetch Results
router.get('/api/results', isTeacher, async (req, res) => {
  try {
    const [teacher] = await db.execute(
      'SELECT * FROM teachers WHERE user_id = ?',
      [req.session.user.id]
    );

    if (teacher.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const [rows] = await db.execute(`
      SELECT r.*,
             s.full_name as student_name, s.admission_number,
             sub.subject_name, c.class_name, ses.session_name
      FROM results r
      LEFT JOIN students s ON r.student_id = s.id
      LEFT JOIN subjects sub ON r.subject_id = sub.id
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN sessions ses ON r.session_id = ses.id
      WHERE s.class_id = ? AND r.subject_id = ? AND (s.status = 'active' OR s.status IS NULL)
      ORDER BY r.created_at DESC
    `, [teacher[0].class_id, teacher[0].subject_id]);

    res.json({ success: true, data: rows });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// GET - Download Marksheet PDF (teacher, restricted to their own class)
router.get('/api/marksheet/:student_id/:session_id/:term', isTeacher, async (req, res) => {
  try {
    const { student_id, session_id, term } = req.params;

    const [teacher] = await db.execute(
      'SELECT * FROM teachers WHERE user_id = ?',
      [req.session.user.id]
    );
    if (teacher.length === 0) {
      return res.json({ success: false, message: 'Teacher profile not found!' });
    }

    const [students] = await db.execute(`
      SELECT s.*, c.class_name
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.id = ? AND s.class_id = ?
    `, [student_id, teacher[0].class_id]);

    if (students.length === 0) {
      return res.json({ success: false, message: 'Student not found in your class!' });
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