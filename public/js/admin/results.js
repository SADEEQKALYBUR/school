// Load sessions dropdown
async function loadSessions() {
  const response = await fetch('/admin/api/sessions');
  const data = await response.json();

  const select = document.getElementById('session_id');

  if (!data.success || data.data.length === 0) {
    select.innerHTML = '<option value="">No sessions found</option>';
    return;
  }

  select.innerHTML = '<option value="">-- Select Session --</option>';
  data.data.forEach(s => {
    select.innerHTML += `<option value="${s.id}">${s.session_name}</option>`;
  });
}

// Load classes dropdown
async function loadClasses() {
  const response = await fetch('/admin/api/classes/list');
  const data = await response.json();

  const select = document.getElementById('class_id');

  if (!data.success || data.data.length === 0) {
    select.innerHTML = '<option value="">No classes found</option>';
    return;
  }

  select.innerHTML = '<option value="">-- Select Class --</option>';
  data.data.forEach(c => {
    select.innerHTML += `<option value="${c.id}">${c.class_name}</option>`;
  });
}

// Load students by class
async function loadStudentsByClass() {
  const class_id = document.getElementById('class_id').value;

  const studentSelect = document.getElementById('student_id');
  const subjectSelect = document.getElementById('subject_id');

  if (!class_id) {
    studentSelect.innerHTML = '<option value="">-- Select Student --</option>';
    subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>';
    return;
  }

  // Load students
  const sRes = await fetch(`/admin/api/students/by-class/${class_id}`);
  const sData = await sRes.json();

  if (!sData.success || sData.data.length === 0) {
    studentSelect.innerHTML = '<option value="">No students in this class</option>';
  } else {
    studentSelect.innerHTML = '<option value="">-- Select Student --</option>';
    sData.data.forEach(s => {
      studentSelect.innerHTML += `<option value="${s.id}">${s.full_name}</option>`;
    });
  }

  // Load subjects
  const subRes = await fetch(`/admin/api/subjects/by-class/${class_id}`);
  const subData = await subRes.json();

  if (!subData.success || subData.data.length === 0) {
    subjectSelect.innerHTML = '<option value="">No subjects in this class</option>';
  } else {
    subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>';
    subData.data.forEach(s => {
      subjectSelect.innerHTML += `<option value="${s.id}">${s.subject_name}</option>`;
    });
  }
}

// Auto calculate total and grade
function calculateTotal() {
  const ca = parseFloat(document.getElementById('ca_score').value) || 0;
  const exam = parseFloat(document.getElementById('exam_score').value) || 0;
  const total = ca + exam;

  document.getElementById('total_score').value = total;

  let grade = '';
  if (total >= 70) grade = 'A';
  else if (total >= 60) grade = 'B';
  else if (total >= 50) grade = 'C';
  else if (total >= 45) grade = 'D';
  else if (total >= 40) grade = 'E';
  else grade = 'F';

  document.getElementById('grade').value = grade;
}

// Add event listeners for auto calculate
document.getElementById('ca_score').addEventListener('input', calculateTotal);
document.getElementById('exam_score').addEventListener('input', calculateTotal);

// Save result
async function saveResult() {
  const session_id = document.getElementById('session_id').value;
  const term = document.getElementById('term').value;
  const student_id = document.getElementById('student_id').value;
  const subject_id = document.getElementById('subject_id').value;
  const ca_score = document.getElementById('ca_score').value;
  const exam_score = document.getElementById('exam_score').value;
  const msg = document.getElementById('result-msg');

  // Validate
  if (!session_id || !term || !student_id || !subject_id || !ca_score || !exam_score) {
    msg.textContent = 'Please fill in all fields!';
    msg.className = 'form-msg error';
    return;
  }

  if (parseFloat(ca_score) > 40) {
    msg.textContent = 'CA Score ya wuce 40!';
    msg.className = 'form-msg error';
    return;
  }

  if (parseFloat(exam_score) > 60) {
    msg.textContent = 'Exam Score ya wuce 60!';
    msg.className = 'form-msg error';
    return;
  }

  const response = await fetch('/admin/api/results/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student_id, subject_id, session_id, term, ca_score, exam_score })
  });

  const data = await response.json();

  if (data.success) {
    msg.textContent = '✅ Result saved successfully!';
    msg.className = 'form-msg success';

    document.getElementById('ca_score').value = '';
    document.getElementById('exam_score').value = '';
    document.getElementById('total_score').value = '';
    document.getElementById('grade').value = '';

    loadResults();
  } else {
    msg.textContent = '❌ ' + data.message;
    msg.className = 'form-msg error';
  }
}

// Load all results
async function loadResults() {
  const response = await fetch('/admin/api/results');
  const data = await response.json();

  const tbody = document.getElementById('resultsTable');

  if (!data.success || data.data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center">No results yet</td></tr>`;
    return;
  }

  tbody.innerHTML = data.data.map((r, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${r.student_name}</td>
      <td>${r.subject_name}</td>
      <td>${r.ca_score}</td>
      <td>${r.exam_score}</td>
      <td>${r.total_score}</td>
      <td>
        <span style="
          background: ${r.grade === 'A' ? '#e8f5e9' : r.grade === 'F' ? '#fdecea' : '#fff3e0'};
          color: ${r.grade === 'A' ? '#2e7d32' : r.grade === 'F' ? '#c62828' : '#e65100'};
          padding: 3px 10px;
          border-radius: 12px;
          font-weight: 600;
        ">${r.grade}</span>
      </td>
      <td>${r.session_name || 'N/A'}</td>
    </tr>
  `).join('');
}

// Add session
async function addSession() {
  const session_name = document.getElementById('session_name').value.trim();
  const msg = document.getElementById('session-msg');

  if (!session_name) {
    msg.textContent = 'Please enter a session name!';
    msg.className = 'form-msg error';
    return;
  }

  const response = await fetch('/admin/api/sessions/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_name })
  });

  const data = await response.json();

  if (data.success) {
    msg.textContent = '✅ Session added!';
    msg.className = 'form-msg success';
    document.getElementById('session_name').value = '';
    loadSessions();
  } else {
    msg.textContent = '❌ ' + data.message;
    msg.className = 'form-msg error';
  }
}

// Load on page start
loadSessions();
loadClasses();
loadResults();