// Navbar scroll effect
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (navbar) {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }
});

// Animate stats
async function loadStats() {
  try {
    const response = await fetch('/admin/stats');
    const data = await response.json();

    if (data.students !== undefined) {
      animateNumber('statStudents', data.students);
      animateNumber('statTeachers', data.teachers);
    }
  } catch (err) {
    // Use default numbers
    animateNumber('statStudents', 500);
    animateNumber('statTeachers', 30);
  }
}

function animateNumber(id, target) {
  const el = document.getElementById(id);
  if (!el) return;

  let current = 0;
  const increment = target / 50;
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    el.textContent = Math.floor(current) + '+';
  }, 30);
}

// Load stats on page load
loadStats();