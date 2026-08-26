// Load all classes
async function loadClasses() {
  const response = await fetch('/admin/api/classes');
  const data = await response.json();

  const tbody = document.getElementById('classesTable');

  if (!data.success || data.data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center">No classes yet</td></tr>`;
    return;
  }

  tbody.innerHTML = data.data.map((c, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${c.class_name}</td>
      <td>${c.class_code}</td>
      <td>${c.level}</td>
      <td>${c.next_class_name ? c.next_class_name : '🎓 Graduating class'}</td>
      <td>
        <button class="btn-delete" onclick="deleteClass(${c.id})">
          🗑️ Delete
        </button>
      </td>
    </tr>
  `).join('');

  // Sabunta dropdown na "Next Class" duk lokacin da muka reload table
  loadNextClassOptions(data.data);
}

// Cika dropdown na "Next Class" da sunayen classes da ake dasu
function loadNextClassOptions(classes) {
  const select = document.getElementById('next_class_id');
  const current = select.value;

  select.innerHTML = `<option value="">-- Babu (Class na karshe / Graduating) --</option>` +
    classes.map(c => `<option value="${c.id}">${c.class_name}</option>`).join('');

  select.value = current;
}

// Add new class
async function addClass() {
  const class_name = document.getElementById('class_name').value.trim();
  const class_code = document.getElementById('class_code').value.trim();
  const level = document.getElementById('level').value;
  const next_class_id = document.getElementById('next_class_id').value || null;
  const msg = document.getElementById('form-msg');

  // Validate
  if (!class_name || !class_code || !level) {
    msg.textContent = 'Da fatan za a cika dukan fields!';
    msg.className = 'form-msg error';
    return;
  }

  const response = await fetch('/admin/api/classes/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ class_name, class_code, level, next_class_id })
  });

  const data = await response.json();

  if (data.success) {
    msg.textContent = '✅ Class added successfully!';
    msg.className = 'form-msg success';

    // Clear inputs
    document.getElementById('class_name').value = '';
    document.getElementById('class_code').value = '';
    document.getElementById('level').value = '';
    document.getElementById('next_class_id').value = '';

    // Reload table
    loadClasses();
  } else {
    msg.textContent = '❌ ' + data.message;
    msg.className = 'form-msg error';
  }
}

// Delete class
async function deleteClass(id) {
  if (!confirm('Tabbas kake son share wannan class?')) return;

  const response = await fetch('/admin/api/classes/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  });

  const data = await response.json();

  if (data.success) {
    loadClasses();
  } else {
    alert('❌ ' + data.message);
  }
}

// Promote ALL students to their next class (end of session)
async function promoteAll() {
  const msg = document.getElementById('promote-msg');

  const sure = confirm(
    '⚠️ Tabbas kake son matsar da DUKKAN dalibai zuwa aji na gaba?\n\n' +
    'Wannan aiki ba za a iya soke shi ba (undo). Tabbata kayi backup na database kafin ka ci gaba.'
  );
  if (!sure) return;

  msg.className = 'form-msg';
  msg.classList.remove('hidden');
  msg.textContent = '⏳ Ana aiki... don Allah a jira...';

  try {
    const response = await fetch('/admin/api/students/promote-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await response.json();

    if (data.success) {
      msg.textContent = '✅ ' + data.message;
      msg.className = 'form-msg success';
    } else {
      msg.textContent = '❌ ' + data.message;
      msg.className = 'form-msg error';
    }
  } catch (err) {
    msg.textContent = '❌ Kuskure: ' + err.message;
    msg.className = 'form-msg error';
  }
}

// Load classes on page load
loadClasses();