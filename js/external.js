function includeHTML() {
    var z, i, elmnt, file, xhttp;
    /* Loop through a collection of all HTML elements: */
    z = document.getElementsByTagName("*");
    for (i = 0; i < z.length; i++) {
        elmnt = z[i];
        /*search for elements with a certain atrribute:*/
        file = elmnt.getAttribute("w3-include-html");
        if (file) {
            /* Make an HTTP request using the attribute value as the file name: */
            xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function() {
                if (this.readyState === 4) {
                    if (this.status === 200) {elmnt.innerHTML = this.responseText;}
                    if (this.status === 404) {elmnt.innerHTML = "Page not found.";}
                    /* Remove the attribute, and call this function once more: */
                    elmnt.removeAttribute("w3-include-html");
                    includeHTML();
                }
            }
            xhttp.open("GET", file, true);
            xhttp.send();
            /* Exit the function: */
            return;
        }
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

// external.js
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
