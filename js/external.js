async function includeHTML() {
  const elements = document.querySelectorAll('[w3-include-html]');

  for (const el of elements) {
    const file = el.getAttribute('w3-include-html');
    if (!file) continue;

    try {
      const response = await fetch(file);
      if (response.ok) {
        el.innerHTML = await response.text();
      } else {
        el.innerHTML = 'Page not found.';
      }
    } catch {
      el.innerHTML = 'Failed to load content.';
    }

    el.removeAttribute('w3-include-html');
  }
}
function scrollAnimation() {
    if (window.location.hash) {
        window.scrollTo(0, 0);
        setTimeout(() => window.scrollTo(0, 0), 1);
    }

    // Delegate so links added by includeHTML() also work
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a.nav-scroll');
        if (!link) return;

        // Only smooth-scroll on the home page
        const path = window.location.pathname;
        const onHome = path.endsWith('/') || path.endsWith('/index.html');
        if (!onHome) return;

        const href = link.getAttribute('href') || '';
        const hash = href.split('#')[1];
        if (!hash) return;

        const target = document.getElementById(hash);
        if (!target) return;

        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    if (window.location.hash) {
        const el = document.querySelector(window.location.hash);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function Scroll() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return false;
}

// load Umami
function loadUmamiOnce() {
  if (window.umami || document.querySelector('script[data-website-id="b8992f59-bcb2-4f10-a02a-2ffa23f482e0"]')) return;

  const PROD_HOSTS = ['cbrennan.ie', 'www.cbrennan.ie'];

  if (!PROD_HOSTS.includes(location.hostname)) {
    // Don’t load Umami on localhost, preview, or any non-prod host
    return;
  }

  const s = document.createElement('script');
  s.defer = true;
  s.src = 'https://analytics.cbrennan.ie/script.js';
  s.setAttribute('data-website-id', 'b8992f59-bcb2-4f10-a02a-2ffa23f482e0');
  s.setAttribute('data-do-not-track', 'true'); // respect browser DNT
  document.head.appendChild(s);
}

window.addEventListener('load', () => {
  if (typeof includeHTML === 'function') includeHTML();
  setTimeout(loadUmamiOnce, 0);
});
