// Load classes into the dropdown
async function loadClassOptions() {
  const response = await fetch('/admin/api/classes');
  const data = await response.json();
  const select = document.getElementById('class_id');

  if (data.success && data.data.length > 0) {
    select.innerHTML = `<option value="">-- Zabi Class --</option>` +
      data.data.map(c => `<option value="${c.id}">${c.class_name}</option>`).join('');
  } else {
    select.innerHTML = `<option value="">-- No classes available, please create classes first --</option>`;
  }
}

// Load all fees
async function loadFees() {
  const response = await fetch('/admin/api/fee-types');
  const data = await response.json();
  const tbody = document.getElementById('feesTable');

  if (!data.success || data.data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center">No fee has been set yet</td></tr>`;
    return;
  }

  tbody.innerHTML = data.data.map((f, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${f.class_name ? f.class_name : '⚠️ No class'}</td>
      <td>${f.payment_type}</td>
      <td>₦${parseFloat(f.amount).toLocaleString()}</td>
      <td>
        <button class="btn-delete" onclick="deleteFee(${f.id})">
          🗑️ Delete
        </button>
      </td>
    </tr>
  `).join('');
}

// Add new fee
async function addFee() {
  const class_id = document.getElementById('class_id').value;
  const payment_type = document.getElementById('payment_type').value.trim();
  const amount = document.getElementById('amount').value;
  const msg = document.getElementById('form-msg');

  if (!class_id || !payment_type || !amount) {
    msg.textContent = 'Please fill in all fields!';
    msg.className = 'form-msg error';
    return;
  }

  const response = await fetch('/admin/api/fee-types/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payment_type, amount, class_id })
  });

  const data = await response.json();

  if (data.success) {
    msg.textContent = '✅ Fee added successfully!';
    msg.className = 'form-msg success';

    document.getElementById('class_id').value = '';
    document.getElementById('amount').value = '';

    loadFees();
  } else {
    msg.textContent = '❌ ' + data.message;
    msg.className = 'form-msg error';
  }
}

// Delete fee
async function deleteFee(id) {
  if (!confirm('Are you sure you want to delete this fee?')) return;

  const response = await fetch('/admin/api/fee-types/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  });

  const data = await response.json();

  if (data.success) {
    loadFees();
  } else {
    alert('❌ ' + data.message);
  }
}

// Load everything on page load
loadClassOptions();
loadFees();