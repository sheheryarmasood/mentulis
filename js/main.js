// ============================================================
// Mentulis site — shared behaviour
// ============================================================

// Sticky nav shadow
const nav = document.querySelector('.nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 12);
}, { passive: true });

// Mobile menu
const burger = document.querySelector('.nav-burger');
const links = document.querySelector('.nav-links');
if (burger) {
  burger.addEventListener('click', () => {
    burger.classList.toggle('open');
    links.classList.toggle('open');
  });
  links.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => {
      burger.classList.remove('open');
      links.classList.remove('open');
    })
  );
}

// Reveal on scroll
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.16 }
);
document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

// Rotating hello in the app's 9 languages (hero only)
const greetEl = document.querySelector('.hero-greeting');
if (greetEl) {
  const greetings = [
    'Hello, friend',
    'Bonjour, mon ami',
    'ਸਤ ਸ੍ਰੀ ਅਕਾਲ ਜੀ',
    'नमस्ते, दोस्त',
    '你好，朋友',
    'Kumusta, kaibigan',
    'مرحباً يا صديقي',
    'Hola, amigo',
    'السلام علیکم دوست',
  ];
  let gi = 0;
  setInterval(() => {
    greetEl.classList.add('fading');
    setTimeout(() => {
      gi = (gi + 1) % greetings.length;
      greetEl.textContent = greetings[gi];
      greetEl.classList.remove('fading');
    }, 350);
  }, 2800);
}

// Box-breathing label, synced to the 16s CSS animation
const breathLabel = document.querySelector('.breath-label');
if (breathLabel) {
  const phases = ['Breathe in…', 'Hold…', 'Breathe out…', 'Hold…'];
  let pi = 0;
  breathLabel.textContent = phases[0];
  setInterval(() => {
    pi = (pi + 1) % phases.length;
    breathLabel.textContent = phases[pi];
  }, 4000);
}

// Footer year
document.querySelectorAll('.year').forEach((el) => {
  el.textContent = new Date().getFullYear();
});
