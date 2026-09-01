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
async function loadStudents() {
  const class_id = document.getElementById('class_id').value;
  const select = document.getElementById('student_id');

  if (!class_id) {
    select.innerHTML = '<option value="">-- Select Student --</option>';
    return;
  }

  const response = await fetch(`/admin/api/students/by-class/${class_id}`);
  const data = await response.json();

  if (!data.success || data.data.length === 0) {
    select.innerHTML = '<option value="">No students found</option>';
    return;
  }

  select.innerHTML = '<option value="">-- Select Student --</option>';
  data.data.forEach(s => {
    select.innerHTML += `<option value="${s.id}">${s.full_name}</option>`;
  });
}

// Generate single ID card
async function generateCard() {
  const student_id = document.getElementById('student_id').value;

  if (!student_id) {
    alert('Please select a student!');
    return;
  }

  const response = await fetch(`/admin/api/idcard/${student_id}`);
  const data = await response.json();

  if (!data.success) {
    alert('Error: ' + data.message);
    return;
  }

  const s = data.data;

  // Fill card
  document.getElementById('cardName').textContent = s.full_name;
  document.getElementById('cardClass').textContent = s.class_name || 'N/A';
  document.getElementById('cardGender').textContent = 
    s.gender.charAt(0).toUpperCase() + s.gender.slice(1);
  document.getElementById('cardAdmission').textContent = s.admission_number;
  document.getElementById('cardSerial').textContent = s.serial_number;
  // Show photo
if (s.passport_photo) {
  document.getElementById('cardPhoto').src = '/uploads/photos/' + s.passport_photo;
  document.getElementById('cardPhoto').style.display = 'block';
  document.getElementById('cardPhotoEmoji').style.display = 'none';
} else {
  document.getElementById('cardPhoto').style.display = 'none';
  document.getElementById('cardPhotoEmoji').style.display = 'block';
}

  // Show preview
  document.getElementById('cardPreview').style.display = 'block';
  document.getElementById('allCardsSection').style.display = 'none';

  // Scroll to card
  document.getElementById('cardPreview').scrollIntoView({ behavior: 'smooth' });
}

// Generate all cards for a class
async function generateAll() {
  const class_id = document.getElementById('class_id').value;

  if (!class_id) {
    alert('Please select a class!');
    return;
  }

  const response = await fetch(`/admin/api/students/by-class/${class_id}`);
  const data = await response.json();

  if (!data.success || data.data.length === 0) {
    alert('Babu students a wannan class!');
    return;
  }

  const allCards = document.getElementById('allCards');
  allCards.innerHTML = data.data.map(s => `
    <div class="id-card" style="margin-bottom:20px">
      <div class="id-card-header">
        <div style="font-size:30px">🏫</div>
        <h2 style="font-size:16px; font-weight:700; margin-top:5px">
          SCHOOL MANAGEMENT SYSTEM
        </h2>
        <p style="font-size:11px; opacity:0.8; margin-top:3px">
          Student Identity Card
        </p>
      </div>

      <div style="display:flex; gap:15px; align-items:center">
       <div style="
  width:80px; height:80px; border-radius:50%;
  background:rgba(255,255,255,0.2);
  display:flex; align-items:center;
  justify-content:center; font-size:40px;
  flex-shrink:0; border:3px solid white;
  overflow:hidden;
">
  ${s.passport_photo 
    ? `<img src="/uploads/photos/${s.passport_photo}" 
         style="width:80px; height:80px; object-fit:cover;" />`
    : '👨‍🎓'
  }
</div>
        <div>
          <h3 style="font-size:15px; font-weight:700; margin-bottom:6px">
            ${s.full_name}
          </h3>
          <p style="font-size:11px; opacity:0.85; margin-bottom:3px">
            Class: <strong>${s.class_name || 'N/A'}</strong>
          </p>
          <p style="font-size:11px; opacity:0.85; margin-bottom:3px">
            Gender: <strong>${s.gender}</strong>
          </p>
          <p style="font-size:11px; opacity:0.85">
            Session: <strong>2025/2026</strong>
          </p>
        </div>
      </div>

      <div style="
        margin-top:15px; padding-top:15px;
        border-top:1px solid rgba(255,255,255,0.3);
        display:flex; justify-content:space-between; align-items:center;
      ">
        <div style="font-size:12px; opacity:0.9">
          Adm: <strong>${s.admission_number}</strong>
        </div>
        <div style="
          font-size:11px;
          background:rgba(255,255,255,0.2);
          padding:4px 10px; border-radius:10px;
        ">${s.serial_number}</div>
      </div>
    </div>
  `).join('');

  document.getElementById('allCardsSection').style.display = 'block';
  document.getElementById('allCardsSection').scrollIntoView({ behavior: 'smooth' });

  // Print after short delay
  setTimeout(() => window.print(), 500);
}

// Load on page start
loadClasses();