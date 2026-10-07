const fs = require('fs');
const path = require('path');

// Load the school logo once and embed it as base64 so it always renders
// correctly inside the Puppeteer-generated PDF (no network/file path issues).
let logoBase64 = null;
function getLogoDataUri() {
  if (logoBase64) return logoBase64;
  try {
    const logoPath = path.join(__dirname, '..', 'public', 'images', 'logo.png');
    const data = fs.readFileSync(logoPath);
    logoBase64 = `data:image/png;base64,${data.toString('base64')}`;
  } catch (err) {
    logoBase64 = '';
  }
  return logoBase64;
}

// Maps a letter grade to a grade point and a short remark,
// using the same A/B/C/D/E/F scale already used when results are saved.
function gradeInfo(grade) {
  const map = {
    A: { point: 5, remark: 'Excellent' },
    B: { point: 4, remark: 'Very Good' },
    C: { point: 3, remark: 'Good' },
    D: { point: 2, remark: 'Fair' },
    E: { point: 1, remark: 'Pass' },
    F: { point: 0, remark: 'Fail' },
  };
  return map[grade] || { point: 0, remark: '-' };
}

/**
 * Builds the full HTML for a student's academic marksheet.
 *
 * @param {Object} student  { full_name, gender, date_of_birth, admission_number, class_name }
 * @param {Array}  results  [{ subject_name, ca_score, exam_score, total_score, grade }]
 * @param {Object} meta     { session_name, term, attendance_percent, issue_date }
 */
function buildMarksheetHTML(student, results, meta) {
  const logo = getLogoDataUri();

  let totalPoints = 0;
  const rows = results.map((r, i) => {
    const info = gradeInfo(r.grade);
    totalPoints += info.point;
    return `
      <tr>
        <td class="center">${i + 1}</td>
        <td>${r.subject_name || '-'}</td>
        <td class="center">${r.ca_score ?? '-'}</td>
        <td class="center">${r.exam_score ?? '-'}</td>
        <td class="center"><strong>${r.total_score ?? '-'}</strong></td>
        <td class="center">${r.grade || '-'}</td>
        <td class="center">${info.remark}</td>
      </tr>`;
  }).join('');

  const gpa = results.length ? (totalPoints / results.length).toFixed(2) : '0.00';

  const dob = student.date_of_birth
    ? new Date(student.date_of_birth).toLocaleDateString('en-GB')
    : '-';

  const issueDate = meta.issue_date
    ? new Date(meta.issue_date).toLocaleDateString('en-GB')
    : new Date().toLocaleDateString('en-GB');

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; font-family: 'Segoe UI', Arial, sans-serif; }
  body { padding: 25px; color:#0a1628; }

  .sheet {
    border: 3px solid #0a1628;
    border-radius: 10px;
    padding: 25px 30px;
    position: relative;
  }
  .sheet::before, .sheet::after {
    content: '';
    position: absolute;
    height: 6px;
    left: 15px; right: 15px;
    background: linear-gradient(90deg, #c9a84c, #e8d48a, #c9a84c);
    border-radius: 3px;
  }
  .sheet::before { top: 6px; }
  .sheet::after { bottom: 6px; }

  .header { text-align:center; margin-bottom: 10px; }
  .header img { width: 90px; height: 90px; object-fit: contain; margin-bottom: 6px; }
  .header h1 { font-size: 26px; letter-spacing: 1px; color:#0a1628; }
  .motto {
    display:inline-block; margin-top:8px; padding: 5px 20px;
    background: linear-gradient(90deg, #c9a84c, #e8d48a, #c9a84c);
    border-radius: 20px; font-style: italic; font-weight:700; font-size: 13px;
  }
  .contact { margin-top:8px; font-size: 12px; color:#333; }

  .banner {
    background: #0a1628; color:#fff; text-align:center;
    padding: 10px; margin: 18px 0 6px; border-radius: 6px;
    font-size: 18px; font-weight:700; letter-spacing:1px;
  }
  .session-term { text-align:center; font-size:13px; font-weight:700; margin-bottom: 15px; }

  .info-box {
    display:flex; justify-content:space-between; gap: 20px;
    border: 1px solid #c9a84c; border-radius: 8px; padding: 12px 18px;
    margin-bottom: 18px; font-size: 13px;
  }
  .info-box div { line-height: 1.9; }
  .info-box strong { color:#0a1628; }

  table { width:100%; border-collapse: collapse; margin-bottom: 15px; }
  th {
    background:#0a1628; color:#fff; padding: 9px 8px; font-size: 12px;
    text-align:left; border: 1px solid #0a1628;
  }
  td {
    padding: 8px; font-size: 13px; border: 1px solid #dcdcdc;
  }
  tr:nth-child(even) td { background: #f5f8fc; }
  .center { text-align:center; }

  .summary-row { display:flex; gap: 15px; margin-bottom: 15px; }
  .summary-box {
    flex:1; border: 1px solid #c9a84c; border-radius: 8px;
    padding: 12px; text-align:center; background:#fbf8ee;
  }
  .summary-box .label { font-size: 12px; font-weight:700; color:#0a1628; }
  .summary-box .value { font-size: 20px; font-weight:700; margin-top:4px; }

  .remarks-box {
    border: 1px solid #c9a84c; border-radius: 8px; padding: 12px 18px;
    margin-bottom: 18px; min-height: 55px; font-size: 13px;
  }
  .remarks-box .label { font-weight:700; margin-bottom: 8px; display:block; }

  .footer-row {
    display:flex; justify-content:space-between; align-items:flex-end; margin-top: 25px;
  }
  .issue-date { font-size: 12px; }
  .signatures { display:flex; gap: 40px; }
  .sig { text-align:center; font-size: 12px; }
  .sig .line { width: 130px; border-top: 1px solid #333; margin-bottom: 4px; }

  .tagline {
    text-align:center; margin-top: 20px; font-style: italic;
    font-size: 12px; color:#555;
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      ${logo ? `<img src="${logo}" alt="Logo">` : ''}
      <h1>SANI YAHAYA MEMORIAL SCHOOL</h1>
      <div class="motto">"He Who Strives Will Succeed"</div>
      <div class="contact">📍 2HH6+692, Tudun Wada 700213, Kano, Nigeria &nbsp; | &nbsp; 📞 +234 908 111 1699</div>
    </div>

    <div class="banner">STUDENT ACADEMIC MARKSHEET</div>
    <div class="session-term">SESSION: ${meta.session_name || '-'} &nbsp; | &nbsp; TERM: ${meta.term || '-'}</div>

    <div class="info-box">
      <div>
        <div><strong>Student Name:</strong> ${student.full_name || '-'}</div>
        <div><strong>Class:</strong> ${student.class_name || '-'}</div>
        <div><strong>Admission No:</strong> ${student.admission_number || '-'}</div>
      </div>
      <div>
        <div><strong>Gender:</strong> ${student.gender || '-'}</div>
        <div><strong>Date of Birth:</strong> ${dob}</div>
        <div><strong>Academic Session:</strong> ${meta.session_name || '-'}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:6%">S/NO</th>
          <th style="width:30%">SUBJECT</th>
          <th style="width:14%">CA SCORE</th>
          <th style="width:14%">EXAM SCORE</th>
          <th style="width:12%">TOTAL</th>
          <th style="width:10%">GRADE</th>
          <th style="width:14%">REMARKS</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="7" class="center">No results recorded yet</td></tr>'}
      </tbody>
    </table>

    <div class="summary-row">
      <div class="summary-box">
        <div class="label">ATTENDANCE</div>
        <div class="value">${meta.attendance_percent != null ? meta.attendance_percent + '%' : 'N/A'}</div>
      </div>
      <div class="summary-box">
        <div class="label">GPA</div>
        <div class="value">${gpa}</div>
      </div>
    </div>

    <div class="remarks-box">
      <span class="label">REMARKS:</span>
      ${meta.class_teacher_remark || ''}
    </div>

    <div class="footer-row">
      <div class="issue-date"><strong>ISSUED ON:</strong> ${issueDate}</div>
      <div class="signatures">
        <div class="sig"><div class="line"></div>Teacher Sign</div>
        <div class="sig"><div class="line"></div>Parent Sign</div>
        <div class="sig"><div class="line"></div>Principal Sign</div>
      </div>
    </div>

    <div class="tagline">Education Builds a Better Future</div>
  </div>
</body>
</html>`;
}

module.exports = { buildMarksheetHTML };
