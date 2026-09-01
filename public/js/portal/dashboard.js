let feeTypes = [];

// Load student info
async function loadStudentInfo() {
  const response = await fetch('/portal/api/student-info');
  const data = await response.json();

  if (!data.success) return;

  const s = data.data;

  document.getElementById('studentName').textContent = s.full_name;
  document.getElementById('infoName').textContent = s.full_name;
  document.getElementById('infoAdmission').textContent = s.admission_number;
  document.getElementById('infoClass').textContent = s.class_name || 'N/A';
  document.getElementById('infoSerial').textContent = s.serial_number || 'N/A';
}

// Load results
async function loadResults() {
  const response = await fetch('/portal/api/results');
  const data = await response.json();

  const tbody = document.getElementById('resultsBody');

  if (!data.success || data.data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center">No results yet</td></tr>`;
    return;
  }

  tbody.innerHTML = data.data.map((r, index) => `
    <tr>
      <td>${index + 1}</td>
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

// Load payments
async function loadPayments() {
  const response = await fetch('/portal/api/payments');
  const data = await response.json();

  const tbody = document.getElementById('paymentsBody');

  if (!data.success || data.data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center">No payments yet</td></tr>`;
    return;
  }

  let totalPaid = 0;
  let totalPending = 0;

  data.data.forEach(p => {
    if (p.status === 'paid') totalPaid += parseFloat(p.amount);
    else totalPending += parseFloat(p.amount);
  });

  document.getElementById('myTotalPaid').textContent = '₦' + totalPaid.toLocaleString();
  document.getElementById('myTotalPending').textContent = '₦' + totalPending.toLocaleString();

  tbody.innerHTML = data.data.map((p, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${p.payment_type}</td>
      <td>₦${parseFloat(p.amount).toLocaleString()}</td>
      <td>
        <span style="
          background: ${p.status === 'paid' ? '#e8f5e9' : '#fff3e0'};
          color: ${p.status === 'paid' ? '#2e7d32' : '#e65100'};
          padding: 4px 12px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 13px;
        ">${p.status.toUpperCase()}</span>
      </td>
      <td style="font-size:12px">${p.transaction_ref}</td>
      <td>${p.session_name || 'N/A'}</td>
    </tr>
  `).join('');
}

// Show tab
function showTab(tab, btn) {
  document.getElementById('resultsTab').classList.add('hidden');
  document.getElementById('idcardTab').classList.add('hidden');
  document.getElementById('admissionTab').classList.add('hidden');

  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.remove('active');
  });

  document.getElementById(tab + 'Tab').classList.remove('hidden');
  if (btn) btn.classList.add('active');
}

// Load ID Card
async function loadIDCard() {
  const response = await fetch('/portal/api/idcard');
  const data = await response.json();

  if (!data.success) return;

  const s = data.data;

  document.getElementById('portalCardName').textContent = s.full_name;
  document.getElementById('portalCardClass').textContent = s.class_name || 'N/A';
  document.getElementById('portalCardGender').textContent =
    s.gender.charAt(0).toUpperCase() + s.gender.slice(1);
  document.getElementById('portalCardAdmission').textContent = s.admission_number;
  document.getElementById('portalCardSerial').textContent = s.serial_number;

  if (s.passport_photo) {
    document.getElementById('portalCardPhoto').src = '/uploads/photos/' + s.passport_photo;
    document.getElementById('portalCardPhoto').style.display = 'block';
    document.getElementById('portalCardEmoji').style.display = 'none';

    document.getElementById('infoPhoto').src = '/uploads/photos/' + s.passport_photo;
    document.getElementById('infoPhoto').style.display = 'block';
    document.getElementById('infoEmoji').style.display = 'none';
  }
}

// Load fee types
async function loadFeeTypes() {
  const response = await fetch('/portal/api/fee-types');
  const data = await response.json();

  const select = document.getElementById('paymentType');
  if (!select) return;

  if (!data.success || data.data.length === 0) {
    select.innerHTML = '<option value="">No fees found</option>';
    return;
  }

  feeTypes = data.data;

  select.innerHTML = '<option value="">-- Select --</option>';
  data.data.forEach(f => {
    select.innerHTML += `
      <option value="${f.payment_type}" data-amount="${f.amount}">
        ${f.payment_type} — ₦${parseFloat(f.amount).toLocaleString()}
      </option>
    `;
  });
}

// Update amount when payment type selected
function updateAmount() {
  const select = document.getElementById('paymentType');
  const selected = select.options[select.selectedIndex];
  const amountDisplay = document.getElementById('amountDisplay');
  const amountValue = document.getElementById('amountValue');

  if (!selected.value) {
    amountDisplay.style.display = 'none';
    return;
  }

  const amount = selected.getAttribute('data-amount');
  amountValue.textContent = '₦' + parseFloat(amount).toLocaleString();
  amountDisplay.style.display = 'block';
}

// Load payment sessions
async function loadPaymentSessions() {
  const sesRes = await fetch('/portal/api/sessions');
  const sesData = await sesRes.json();

  const select = document.getElementById('paymentSession');
  if (!select) return;

  if (!sesData.success || sesData.data.length === 0) {
    select.innerHTML = '<option value="">No sessions found</option>';
    return;
  }

  select.innerHTML = '<option value="">-- Select Session --</option>';
  sesData.data.forEach(s => {
    select.innerHTML += `<option value="${s.id}">${s.session_name}</option>`;
  });
}

// Make payment
async function makePayment() {
  const select = document.getElementById('paymentType');
  const selected = select.options[select.selectedIndex];
  const payment_type = selected.value;
  const amount = selected.getAttribute('data-amount');
  const session_id = document.getElementById('paymentSession').value;
  const msg = document.getElementById('payment-msg');

  if (!payment_type || !session_id) {
    msg.textContent = 'Please select Payment Type and Session!';
    msg.style.color = 'red';
    return;
  }

  msg.textContent = '⏳ Ana shirya payment...';
  msg.style.color = '#1a73e8';

  const response = await fetch('/portal/api/payment/initialize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, payment_type, session_id })
  });

  const data = await response.json();

  if (data.success) {
    window.location.href = data.url;
  } else {
    msg.textContent = '❌ ' + data.message;
    msg.style.color = 'red';
  }
}

// Print
function printResults() {
  window.print();
}
// Load Admission Letter
async function loadAdmissionLetter() {
  try {
    const response = await fetch('/portal/api/admission-letter');
    const data = await response.json();

    const content = document.getElementById('admissionContent');

    if (!data.success) {
      content.innerHTML = `
        <div style="text-align:center; padding:40px; color:#888">
          ❌ ${data.message}
        </div>
      `;
      return;
    }

    const app = data.application;
    const student = data.student;

    if (!app) {
      content.innerHTML = `
        <div style="text-align:center; padding:40px">
          <div style="font-size:60px; margin-bottom:15px">📄</div>
          <h3 style="color:#333; margin-bottom:10px">No Admission Letter Yet</h3>
          <p style="color:#888; font-size:14px">
            Your admission letter will appear here once your application has been approved by the school.
          </p>
        </div>
      `;
      return;
    }

    // Show print button
    document.getElementById('printAdmBtn').style.display = 'block';

    // Show admission letter
    const photoUrl = app.passport_photo
      ? `/uploads/photos/${app.passport_photo}`
      : null;

    content.innerHTML = `
      <div id="admissionLetterPrint" style="
        max-width:700px; margin:0 auto;
        border:3px solid #0a1628;
        padding:30px;
        background:white;
        border-radius:8px;
      ">
        <!-- Header -->
        <div style="text-align:center; padding-bottom:15px; border-bottom:3px solid #c9a84c; margin-bottom:20px; display:flex; align-items:center; justify-content:center; gap:15px">
          <div style="width:70px; height:70px; background:#0a1628; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:35px; flex-shrink:0">🏫</div>
          <div>
            <h2 style="font-size:20px; font-weight:800; color:#0a1628; text-transform:uppercase">Sani Yahaya Memorial School</h2>
            <p style="font-size:12px; color:#555">📍 Kano State, Nigeria | 📞 +234 800 000 0000 | ✉️ info@syms.edu.ng</p>
            <p style="font-size:11px; color:#c9a84c; font-style:italic">"Excellence in Education — Shaping Futures, Building Leaders"</p>
          </div>
        </div>

        <!-- Title -->
        <div style="text-align:center; margin:15px 0">
          <h2 style="font-size:18px; font-weight:800; color:#0a1628; text-transform:uppercase; letter-spacing:2px; padding:8px 25px; border:2px solid #c9a84c; display:inline-block">
            Admission Letter
          </h2>
        </div>

        <!-- Ref & Date -->
        <div style="display:flex; justify-content:space-between; margin-bottom:15px">
          <span style="background:#0a1628; color:#c9a84c; padding:4px 12px; border-radius:15px; font-size:12px; font-weight:700">
            REF: SYMS/ADM/${new Date().getFullYear()}/${String(app.id).padStart(4,'0')}
          </span>
          <span style="font-size:12px; color:#555">
            Date: ${new Date().toLocaleDateString('en-GB', {day:'numeric', month:'long', year:'numeric'})}
          </span>
        </div>

        <!-- Student Section -->
        <div style="display:flex; gap:20px; margin:20px 0; align-items:flex-start">
          <!-- Photo -->
          <div style="
            width:110px; height:130px;
            border:3px solid #0a1628;
            border-radius:8px;
            overflow:hidden;
            flex-shrink:0;
            display:flex;
            align-items:center;
            justify-content:center;
            background:#f5f5f5;
            font-size:50px;
          ">
            ${photoUrl
              ? `<img src="${photoUrl}" style="width:100%; height:100%; object-fit:cover;" />`
              : '👨‍🎓'
            }
          </div>

          <!-- Details -->
          <div style="flex:1">
            <div style="display:flex; margin-bottom:8px; border-bottom:1px dashed #ddd; padding-bottom:6px">
              <span style="font-size:12px; font-weight:700; color:#0a1628; width:160px">Student Name:</span>
              <span style="font-size:12px; font-weight:800; color:#333">${app.full_name.toUpperCase()}</span>
            </div>
            <div style="display:flex; margin-bottom:8px; border-bottom:1px dashed #ddd; padding-bottom:6px">
              <span style="font-size:12px; font-weight:700; color:#0a1628; width:160px">Gender:</span>
              <span style="font-size:12px; color:#333">${app.gender.charAt(0).toUpperCase() + app.gender.slice(1)}</span>
            </div>
            <div style="display:flex; margin-bottom:8px; border-bottom:1px dashed #ddd; padding-bottom:6px">
              <span style="font-size:12px; font-weight:700; color:#0a1628; width:160px">Date of Birth:</span>
              <span style="font-size:12px; color:#333">${new Date(app.date_of_birth).toLocaleDateString('en-GB')}</span>
            </div>
            <div style="display:flex; margin-bottom:8px; border-bottom:1px dashed #ddd; padding-bottom:6px">
              <span style="font-size:12px; font-weight:700; color:#0a1628; width:160px">Class Admitted:</span>
              <span style="font-size:12px; font-weight:800; color:#1a73e8">${app.applying_for}</span>
            </div>
            <div style="display:flex; margin-bottom:8px; border-bottom:1px dashed #ddd; padding-bottom:6px">
              <span style="font-size:12px; font-weight:700; color:#0a1628; width:160px">Parent/Guardian:</span>
              <span style="font-size:12px; color:#333">${app.parent_name}</span>
            </div>
            <div style="display:flex; margin-bottom:8px; border-bottom:1px dashed #ddd; padding-bottom:6px">
              <span style="font-size:12px; font-weight:700; color:#0a1628; width:160px">Phone:</span>
              <span style="font-size:12px; color:#333">${app.parent_phone}</span>
            </div>
            <div style="display:flex; margin-bottom:8px">
              <span style="font-size:12px; font-weight:700; color:#0a1628; width:160px">Academic Session:</span>
              <span style="font-size:12px; font-weight:700; color:#2e7d32">2025/2026</span>
            </div>
            <div style="margin-top:10px">
              <span style="background:#e8f5e9; color:#2e7d32; padding:4px 15px; border-radius:15px; font-size:12px; font-weight:800">
                ✅ ADMISSION APPROVED
              </span>
            </div>
          </div>
        </div>

        <!-- Message -->
        <div style="margin:15px 0; font-size:13px; color:#444; line-height:1.8">
          <p>Dear <strong>${app.parent_name}</strong>,</p><br>
          <p>
            On behalf of the Management and Staff of <strong>Sani Yahaya Memorial School</strong>,
            we are delighted to inform you that your child/ward, <strong>${app.full_name.toUpperCase()}</strong>,
            has been offered admission into <strong>${app.applying_for}</strong> for the
            <strong>2025/2026 Academic Session</strong>.
          </p><br>
          <p>
            Please ensure all required documents are submitted and school fees are paid before resumption.
          </p>
        </div>

        <!-- Conditions -->
        <div style="background:#f9f9f9; border-left:4px solid #c9a84c; padding:12px 15px; margin:15px 0; border-radius:0 8px 8px 0">
          <h4 style="font-size:13px; font-weight:700; color:#0a1628; margin-bottom:8px">📋 Conditions of Admission:</h4>
          <ul style="list-style:none; font-size:12px; color:#555; display:flex; flex-direction:column; gap:5px">
            <li>✓ Payment of all required school fees before resumption</li>
            <li>✓ Submission of original copies of all required documents</li>
            <li>✓ Purchase of official school uniform from approved vendor</li>
            <li>✓ Adherence to all school rules and regulations</li>
            <li>✓ Resumption Date: September 1, 2026</li>
          </ul>
        </div>

        <!-- Signature -->
        <div style="display:flex; justify-content:space-between; margin-top:30px">
          <div style="text-align:center; width:160px">
            <div style="border-top:2px solid #0a1628; margin-bottom:6px"></div>
            <strong style="font-size:12px">Principal</strong>
            <p style="font-size:11px; color:#555">Sani Yahaya Memorial School</p>
          </div>
          <div style="text-align:center; width:160px">
            <div style="border-top:2px solid #0a1628; margin-bottom:6px"></div>
            <strong style="font-size:12px">School Stamp</strong>
            <p style="font-size:11px; color:#555">Official Seal</p>
          </div>
          <div style="text-align:center; width:160px">
            <div style="border-top:2px solid #0a1628; margin-bottom:6px"></div>
            <strong style="font-size:12px">Parent/Guardian</strong>
            <p style="font-size:11px; color:#555">Acknowledgement</p>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align:center; margin-top:20px; padding-top:12px; border-top:2px solid #c9a84c; font-size:11px; color:#888">
          <p>This letter is computer generated and valid without signature if bearing the school seal.</p>
          <p style="margin-top:4px">📍 Kano State, Nigeria | 📞 +234 800 000 0000 | ✉️ info@syms.edu.ng | 🌐 www.syms.edu.ng</p>
        </div>
      </div>
    `;

  } catch (err) {
    console.log(err);
  }
}

// Print admission letter
function printAdmission() {
  window.print();
}

// Load on page start
loadStudentInfo();
loadResults();
loadIDCard();
loadAdmissionLetter();