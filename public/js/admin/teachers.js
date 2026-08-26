// Preview photo
function previewTeacherPhoto(input) {
  const preview = document.getElementById('teacherPhotoPreview');
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.src = e.target.result;
      preview.style.display = 'block';
    };
    reader.readAsDataURL(input.files[0]);
  }
}

// Load classes for dropdown
async function loadClasses() {
  try {
    const response = await fetch('/admin/api/classes/list');
    const data = await response.json();
    const select = document.getElementById('class_id');
    if (data.success) {
      data.data.forEach(c => {
        select.innerHTML += `<option value="${c.id}">${c.class_name}</option>`;
      });
    }
  } catch (err) {
    console.log(err);
  }
}

// Load subjects for dropdown
async function loadSubjects() {
  try {
    const response = await fetch('/admin/api/subjects/list');
    const data = await response.json();
    const select = document.getElementById('subject_id');
    if (data.success) {
      data.data.forEach(s => {
        select.innerHTML += `<option value="${s.id}">${s.subject_name}</option>`;
      });
    }
  } catch (err) {
    console.log(err);
  }
}

// Load teachers list
async function loadTeachers() {
  try {
    const response = await fetch('/admin/api/teachers');
    const data = await response.json();

    const tbody = document.getElementById('teachersTable');

    if (!data.success || data.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#888">No teachers registered yet</td></tr>`;
      return;
    }

    tbody.innerHTML = data.data.map(t => `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:10px">
            <div style="
              width:36px; height:36px; border-radius:50%;
              overflow:hidden; flex-shrink:0; background:#e3f2fd;
              display:flex; align-items:center; justify-content:center;
              font-size:18px;
            ">
              ${t.photo
                ? `<img src="/uploads/photos/${t.photo}" style="width:100%; height:100%; object-fit:cover;" />`
                : '👨‍🏫'
              }
            </div>
            <strong>${t.full_name}</strong>
          </div>
        </td>
        <td>${t.email}</td>
        <td>${t.phone || 'N/A'}</td>
        <td>${t.class_name || 'Not assigned'}</td>
        <td>${t.subject_name || 'Not assigned'}</td>
        <td>
          <button onclick="deleteTeacher(${t.id})" style="
            padding:5px 12px; background:#c62828;
            color:white; border:none; border-radius:6px;
            font-size:12px; cursor:pointer;
          ">🗑️ Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.log(err);
  }
}

// Add teacher
async function addTeacher() {
  const full_name = document.getElementById('full_name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const phone = document.getElementById('phone').value.trim();
  const class_id = document.getElementById('class_id').value;
  const subject_id = document.getElementById('subject_id').value;
  const photo = document.getElementById('photo').files[0];
  const msg = document.getElementById('teacher-msg');

  if (!full_name || !email || !password) {
    msg.textContent = '❌ Da fatan za a cika Name, Email da Password!';
    msg.className = 'form-msg error';
    return;
  }

  if (password.length < 6) {
    msg.textContent = '❌ Password dole ya zama akalla characters 6!';
    msg.className = 'form-msg error';
    return;
  }

  const formData = new FormData();
  formData.append('full_name', full_name);
  formData.append('email', email);
  formData.append('password', password);
  formData.append('phone', phone);
  formData.append('class_id', class_id);
  formData.append('subject_id', subject_id);
  if (photo) {
    formData.append('photo', photo);
  }

  const response = await fetch('/admin/api/teachers/add', {
    method: 'POST',
    body: formData
  });

  const data = await response.json();

  if (data.success) {
    msg.textContent = '✅ Teacher registered successfully!';
    msg.className = 'form-msg success';

    document.getElementById('full_name').value = '';
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
    document.getElementById('phone').value = '';
    document.getElementById('class_id').value = '';
    document.getElementById('subject_id').value = '';
    document.getElementById('photo').value = '';
    document.getElementById('teacherPhotoPreview').style.display = 'none';

    loadTeachers();
  } else {
    msg.textContent = '❌ ' + data.message;
    msg.className = 'form-msg error';
  }
}

// Delete teacher
async function deleteTeacher(id) {
  if (!confirm('Tabbatar kana son share wannan malami?')) return;

  const response = await fetch('/admin/api/teachers/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  });

  const data = await response.json();

  if (data.success) {
    loadTeachers();
  } else {
    alert('Error: ' + data.message);
  }
}

// Load on page start
loadClasses();
loadSubjects();
loadTeachers();