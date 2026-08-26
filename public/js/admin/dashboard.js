// Load stats
async function loadStats() {
  try {
    const response = await fetch('/admin/stats');
    const data = await response.json();


    document.getElementById('totalStudents').textContent = data.students || 0;
    document.getElementById('totalClasses').textContent = data.classes || 0;
    document.getElementById('pendingApps').textContent = data.pending || 0;
    document.getElementById('approvedApps').textContent = data.approved || 0;
  } catch (err) {
    console.log(err);
  }
}

// Load recent students
async function loadRecentStudents() {
  try {
    const response = await fetch('/admin/recent-students');
    const data = await response.json();

    const tbody = document.getElementById('recentStudents');

    if (data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#888">No students yet</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(s => `
      <tr>
        <td>${s.full_name}</td>
        <td>${s.admission_number}</td>
        <td>${s.class_name || 'N/A'}</td>
        <td><span style="color:#2e7d32; font-weight:600">Active</span></td>
      </tr>
    `).join('');
  } catch (err) {
    console.log(err);
  }
}

loadStats();
loadRecentStudents();