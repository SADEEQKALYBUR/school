document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const errorMsg = document.getElementById('error-msg');
  const loginBtn = document.getElementById('loginBtn');

  loginBtn.textContent = 'Loading...';
  loginBtn.disabled = true;

  const response = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();

  if (data.success) {
    window.location.href = data.redirect;
  } else {
    errorMsg.textContent = data.message;
    errorMsg.classList.remove('hidden');
    loginBtn.textContent = 'Login';
    loginBtn.disabled = false;
  }
});