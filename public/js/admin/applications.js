let allApplications = [];

// Load applications
async function loadApplications() {
  const response = await fetch('/admin/api/applications');
  const data = await response.json();

  if (!data.success) return;

  allApplications = data.data;

  // Calculate stats
  const total = data.data.length;
  const pending = data.data.filter(a => a.status === 'pending').length;
  const approved = data.data.filter(a => a.status === 'approved').length;
  const rejected = data.data.filter(a => a.status === 'rejected').length;

  document.getElementById('totalApps').textContent = total;
  document.getElementById('pendingApps').textContent = pending;
  document.getElementById('approvedApps').textContent = approved;
  document.getElementById('rejectedApps').textContent = rejected;

  // Apply filters
  const statusFilter = document.getElementById('filterStatus').value;
  const classFilter = document.getElementById('filterClass').value;

  let filtered = data.data;

  if (statusFilter !== 'all') {
    filtered = filtered.filter(a => a.status === statusFilter);
  }

  if (classFilter !== 'all') {
    filtered = filtered.filter(a => a.applying_for === classFilter);
  }

  renderApplications(filtered);
}

// Render applications table
function renderApplications(applications) {
  const tbody = document.getElementById('applicationsTable');

  if (applications.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px; color:#888">No applications found</td></tr>`;
    return;
  }

  tbody.innerHTML = applications.map((a, index) => `
    <tr>
      <td>${index + 1}</td>
      <td><strong>${a.full_name}</strong></td>
      <td>${a.gender}</td>
      <td>
        <span style="
          background:#e3f2fd; color:#1565c0;
          padding:3px 10px; border-radius:12px;
          font-size:12px; font-weight:600;
        ">${a.applying_for}</span>
      </td>
      <td>${a.parent_name}</td>
      <td>${a.parent_phone}</td>
      <td style="font-size:12px">${new Date(a.created_at).toLocaleDateString()}</td>
      <td>
        <span style="
          background: ${a.status === 'approved' ? '#e8f5e9' : a.status === 'rejected' ? '#fdecea' : '#fff3e0'};
          color: ${a.status === 'approved' ? '#2e7d32' : a.status === 'rejected' ? '#c62828' : '#e65100'};
          padding:4px 12px; border-radius:12px;
          font-weight:600; font-size:12px;
        ">${a.status.toUpperCase()}</span>
      </td>
      <td>
        <div style="display:flex; gap:5px">
          <button onclick="viewApplication(${a.id})" style="
            padding:5px 12px; background:#1a73e8;
            color:white; border:none; border-radius:6px;
            font-size:12px; cursor:pointer;
          ">👁️ View</button>
          ${a.status === 'pending' ? `
            <button onclick="updateStatus(${a.id}, 'approved')" style="
              padding:5px 12px; background:#2e7d32;
              color:white; border:none; border-radius:6px;
              font-size:12px; cursor:pointer;
            ">✅</button>
            <button onclick="updateStatus(${a.id}, 'rejected')" style="
              padding:5px 12px; background:#c62828;
              color:white; border:none; border-radius:6px;
              font-size:12px; cursor:pointer;
            ">❌</button>
          ` : ''}
          <button onclick="window.open('/admin/api/applications/admission-letter/${a.id}', '_blank')" style="
            padding:5px 12px; background:#c9a84c;
            color:#0a1628; border:none; border-radius:6px;
            font-size:12px; cursor:pointer; font-weight:600;
          ">📄 Letter</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// View application details
function viewApplication(id) {
  const app = allApplications.find(a => a.id === id);
  if (!app) return;

  document.getElementById('modalContent').innerHTML = `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px">
      <div>
        <p style="font-size:12px; color:#888; margin-bottom:4px">STUDENT NAME</p>
        <p style="font-size:15px; font-weight:700; color:#0a1628">${app.full_name}</p>
      </div>
      <div>
        <p style="font-size:12px; color:#888; margin-bottom:4px">GENDER</p>
        <p style="font-size:15px; font-weight:600; color:#333">${app.gender}</p>
      </div>
      <div>
        <p style="font-size:12px; color:#888; margin-bottom:4px">DATE OF BIRTH</p>
        <p style="font-size:15px; font-weight:600; color:#333">${new Date(app.date_of_birth).toLocaleDateString()}</p>
      </div>
      <div>
        <p style="font-size:12px; color:#888; margin-bottom:4px">APPLYING FOR</p>
        <p style="font-size:15px; font-weight:600; color:#1a73e8">${app.applying_for}</p>
      </div>
      <div>
        <p style="font-size:12px; color:#888; margin-bottom:4px">PARENT NAME</p>
        <p style="font-size:15px; font-weight:600; color:#333">${app.parent_name}</p>
      </div>
      <div>
        <p style="font-size:12px; color:#888; margin-bottom:4px">PARENT PHONE</p>
        <p style="font-size:15px; font-weight:600; color:#333">${app.parent_phone}</p>
      </div>
      <div>
        <p style="font-size:12px; color:#888; margin-bottom:4px">EMAIL</p>
        <p style="font-size:15px; font-weight:600; color:#333">${app.parent_email || 'N/A'}</p>
      </div>
      <div>
        <p style="font-size:12px; color:#888; margin-bottom:4px">PREVIOUS SCHOOL</p>
        <p style="font-size:15px; font-weight:600; color:#333">${app.previous_school || 'N/A'}</p>
      </div>
      <div style="grid-column:span 2">
        <p style="font-size:12px; color:#888; margin-bottom:4px">ADDRESS</p>
        <p style="font-size:15px; font-weight:600; color:#333">${app.address || 'N/A'}</p>
      </div>
      <div>
        <p style="font-size:12px; color:#888; margin-bottom:4px">DATE SUBMITTED</p>
        <p style="font-size:15px; font-weight:600; color:#333">${new Date(app.created_at).toLocaleDateString()}</p>
      </div>
      <div>
        <p style="font-size:12px; color:#888; margin-bottom:4px">STATUS</p>
        <span style="
          background: ${app.status === 'approved' ? '#e8f5e9' : app.status === 'rejected' ? '#fdecea' : '#fff3e0'};
          color: ${app.status === 'approved' ? '#2e7d32' : app.status === 'rejected' ? '#c62828' : '#e65100'};
          padding:5px 15px; border-radius:12px;
          font-weight:700; font-size:14px;
        ">${app.status.toUpperCase()}</span>
      </div>
    </div>
  `;

  // Modal action buttons
  document.getElementById('modalActions').innerHTML = `
    ${app.status === 'pending' ? `
      <button onclick="updateStatus(${app.id}, 'approved'); closeModal()" style="
        padding:10px 25px; background:#2e7d32;
        color:white; border:none; border-radius:8px;
        font-size:14px; font-weight:600; cursor:pointer;
      ">✅ Approve</button>
      <button onclick="updateStatus(${app.id}, 'rejected'); closeModal()" style="
        padding:10px 25px; background:#c62828;
        color:white; border:none; border-radius:8px;
        font-size:14px; font-weight:600; cursor:pointer;
      ">❌ Reject</button>
    ` : ''}
    <button onclick="window.open('/admin/api/applications/admission-letter/${app.id}', '_blank')" style="
      padding:10px 25px; background:#c9a84c;
      color:#0a1628; border:none; border-radius:8px;
      font-size:14px; font-weight:700; cursor:pointer;
    ">📄 Print Admission Letter</button>
    <button onclick="closeModal()" style="
      padding:10px 25px; background:#f5f5f5;
      color:#333; border:none; border-radius:8px;
      font-size:14px; font-weight:600; cursor:pointer;
    ">Close</button>
  `;

  document.getElementById('modal').style.display = 'flex';
}

// Close modal
function closeModal() {
  document.getElementById('modal').style.display = 'none';
}

// Update application status
async function updateStatus(id, status) {
  const response = await fetch('/admin/api/applications/update-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, status })
  });

  const data = await response.json();

  if (data.success) {
    loadApplications();
  } else {
    alert('Error: ' + data.message);
  }
}

// Load on page start
loadApplications();