/* Footer newsletter signup.
   The form is a Netlify Form (data-netlify="true" in the markup): Netlify
   finds it in the HTML at deploy time and stores each submission under Forms
   in the site dashboard. This script only submits it in the background so the
   visitor stays on the page; with JavaScript off the form still posts
   normally and Netlify shows its own confirmation page.
   It posts to this same site, so the CSP needs nothing new (connect-src and
   form-action are both 'self').
   Loaded on every page with a ?v= query -- bump it when this file changes,
   because /assets/* is cached for a day (see netlify.toml). */
(function () {
  var forms = document.querySelectorAll('.f-news-form');
  [].forEach.call(forms, function (form) {
    var input  = form.querySelector('input[type=email]');
    var button = form.querySelector('button[type=submit]');
    var status = form.querySelector('.f-news-status');

    function say(msg, kind) {
      status.textContent = msg;
      status.className = 'f-news-status' + (kind ? ' is-' + kind : '');
    }

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      input.value = input.value.trim();
      if (!input.value || !input.checkValidity()) {
        say('Please enter a valid email address.', 'err');
        input.setAttribute('aria-invalid', 'true');
        input.focus();
        return;
      }
      input.removeAttribute('aria-invalid');
      button.disabled = true;
      say('Subscribing…');

      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form)).toString()
      })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          input.value = '';
          say('Thanks — you’re on the list.', 'ok');
          // Shows up in Google Analytics as a sign_up event.
          if (typeof window.gtag === 'function') {
            window.gtag('event', 'sign_up', { method: 'newsletter' });
          }
        })
        .catch(function () {
          say('That didn’t go through. Please try again, or email hello@makfai.org.', 'err');
        })
        .then(function () { button.disabled = false; });
    });
  });
})();
