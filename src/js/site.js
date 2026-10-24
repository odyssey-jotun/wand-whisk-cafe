/* Wand & Whisk Café site script. No libraries. */
(function () {
  var doc = document.documentElement;
  doc.classList.add('js');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cfg = window.WW || {};

  /* ---- header color follows the section underneath it ---- */
  var header = document.querySelector('.site-header');
  var themed = [].slice.call(document.querySelectorAll('[data-theme]'));
  function updateHeader() {
    if (!header || !themed.length) return;
    var probe = header.getBoundingClientRect().bottom - 8;
    var current = themed[0].getAttribute('data-theme');
    for (var i = 0; i < themed.length; i++) {
      var r = themed[i].getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe) { current = themed[i].getAttribute('data-theme'); }
    }
    if (header.getAttribute('data-on') !== current) header.setAttribute('data-on', current);
  }

  /* ---- mobile nav ---- */
  var toggle = document.querySelector('.nav-toggle');
  if (toggle && header) {
    toggle.addEventListener('click', function () {
      var open = header.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && header.classList.contains('is-open')) {
        header.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); toggle.focus();
      }
    });
    header.querySelectorAll('.primary a').forEach(function (a) {
      a.addEventListener('click', function () { header.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); });
    });
  }

  /* ---- "+ More" on menu categories ---- */
  document.querySelectorAll('[data-more]').forEach(function (btn) {
    var grid = document.getElementById(btn.getAttribute('aria-controls'));
    var label = btn.textContent;
    btn.addEventListener('click', function () {
      var open = grid.classList.toggle('is-expanded');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.textContent = open ? '− Less' : label;
    });
  });

  /* ---- menu tracker: highlights the category in view, jumps on click ---- */
  var trackerLinks = [].slice.call(document.querySelectorAll('.tracker a'));
  var cats = trackerLinks.map(function (a) { return document.querySelector(a.getAttribute('href')); }).filter(Boolean);
  function updateTracker() {
    if (!cats.length) return;
    var line = window.innerHeight * 0.35, active = 0;
    for (var i = 0; i < cats.length; i++) { if (cats[i].getBoundingClientRect().top <= line) active = i; }
    trackerLinks.forEach(function (a, i) {
      var on = i === active;
      a.classList.toggle('is-active', on);
      if (on) { a.setAttribute('aria-current', 'true'); } else { a.removeAttribute('aria-current'); }
    });
    var strip = document.querySelector('.tracker ol');
    if (strip && strip.scrollWidth > strip.clientWidth) {
      var act = trackerLinks[active];
      var target = act.offsetLeft - 12;
      if (Math.abs(strip.scrollLeft - target) > 40) strip.scrollTo({ left: target, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  }

  /* ---- wavy title: moves only when the visitor scrolls ---- */
  var waves = [].slice.call(document.querySelectorAll('.wave-title textPath'));
  var waveUnits = [];
  waves.forEach(function (tp) {
    var unit = parseFloat(tp.getAttribute('data-unit')) || 600;
    waveUnits.push(unit);
  });
  function updateWaves() {
    if (!waves.length || reduceMotion) return;
    var y = window.scrollY || 0;
    waves.forEach(function (tp, i) {
      var unit = waveUnits[i];
      var dir = tp.getAttribute('data-dir') === 'right' ? 1 : -1;
      var shift = (y * 0.45) % unit;
      var off = dir < 0 ? -shift : shift - unit;
      tp.setAttribute('startOffset', off.toFixed(1));
    });
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      updateHeader(); updateTracker(); updateWaves(); maybeShowBanner();
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  updateHeader(); updateTracker(); updateWaves();

  /* ---- entrances ---- */
  var revealEls = [].slice.call(document.querySelectorAll('.reveal, .pop, .footer-cast'));
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---- Mailchimp sign-up (inline, no page change) ---- */
  var mcCount = 0;
  document.querySelectorAll('form[data-mailchimp]').forEach(function (form) {
    var status = form.parentNode.querySelector('.signup-status');
    form.addEventListener('submit', function (e) {
      if (!cfg.mailchimpJsonp) return;
      e.preventDefault();
      var email = form.querySelector('input[type="email"]').value.trim();
      if (!email) return;
      var cb = 'wwMc' + (++mcCount) + Date.now();
      var s = document.createElement('script');
      window[cb] = function (data) {
        var msg = (data && data.msg ? String(data.msg) : '').replace(/<[^>]*>/g, '').replace(/^\d+ - /, '');
        if (data && data.result === 'success') {
          status.textContent = 'You are in the Guild! Check your inbox to confirm.';
          form.reset();
          try { localStorage.setItem('ww-signed-up', '1'); } catch (err) {}
        } else {
          status.textContent = msg || 'Something went wrong. Please try again.';
        }
        delete window[cb]; s.remove();
      };
      s.src = cfg.mailchimpJsonp + '&EMAIL=' + encodeURIComponent(email) + '&' + cfg.mailchimpHoneypot + '=&c=' + cb;
      s.onerror = function () { status.textContent = 'Could not reach the sign-up service. Please try again.'; };
      status.textContent = 'Joining…';
      document.body.appendChild(s);
    });
  });

  /* ---- small sign-up banner: appears after some scrolling, dismissible ---- */
  var banner = document.querySelector('.mini-signup');
  var bannerDone = false;
  function bannerAllowed() {
    try {
      if (localStorage.getItem('ww-signed-up')) return false;
      var t = parseInt(localStorage.getItem('ww-banner-closed') || '0', 10);
      return !(t && Date.now() - t < 30 * 24 * 3600 * 1000);
    } catch (err) { return true; }
  }
  var bigForms = [].slice.call(document.querySelectorAll('.signup'));
  function maybeShowBanner() {
    if (!banner) return;
    // step aside while a full sign-up form is on screen
    var formInView = bigForms.some(function (f) { var r = f.getBoundingClientRect(); return r.top < window.innerHeight && r.bottom > 0; });
    banner.classList.toggle('is-aside', formInView);
    if (bannerDone) return;
    if ((window.scrollY || 0) > window.innerHeight * 0.9) {
      bannerDone = true;
      if (bannerAllowed()) { banner.hidden = false; requestAnimationFrame(function () { banner.classList.add('is-shown'); }); }
    }
  }
  if (banner) {
    banner.querySelector('.close').addEventListener('click', function () {
      banner.classList.remove('is-shown');
      try { localStorage.setItem('ww-banner-closed', String(Date.now())); } catch (err) {}
      setTimeout(function () { banner.hidden = true; }, 400);
    });
  }

  /* ---- contact form: posts to an endpoint if one is set, otherwise opens email ---- */
  var cform = document.querySelector('form[data-contact]');
  if (cform) {
    var cstatus = cform.querySelector('.form-status');
    cform.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = cform.name.value.trim(), email = cform.email.value.trim(), msg = cform.message.value.trim();
      if (!name || !email || !msg) { cstatus.textContent = 'Please fill in every field marked with an *.'; return; }
      if (cfg.contactEndpoint) {
        cstatus.textContent = 'Sending…';
        fetch(cfg.contactEndpoint, { method: 'POST', headers: { 'Accept': 'application/json' }, body: new FormData(cform) })
          .then(function (r) { if (!r.ok) throw new Error(); cstatus.textContent = 'Thanks! Your message is on its way.'; cform.reset(); })
          .catch(function () { cstatus.textContent = 'Sorry, that did not send. Please call us at ' + cfg.phone + '.'; });
      } else {
        var body = msg + '\n\n' + name + '\n' + email;
        window.location.href = 'mailto:' + cfg.email + '?subject=' + encodeURIComponent('Website message from ' + name) + '&body=' + encodeURIComponent(body);
        cstatus.textContent = 'Your email app should open with the message ready to send.';
      }
    });
  }

  /* ---- events flip to "Past event" on their own once the date passes ---- */
  document.querySelectorAll('[data-event-start]').forEach(function (card) {
    var t = Date.parse(card.getAttribute('data-event-start'));
    var tag = card.querySelector('.event-status');
    if (tag && !isNaN(t)) tag.textContent = t < Date.now() ? 'Past event' : 'Upcoming';
  });

  /* ---- map loads only when asked (keeps phones fast) ---- */
  document.querySelectorAll('[data-map]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var slot = btn.closest('.map-slot');
      var f = document.createElement('iframe');
      f.src = btn.getAttribute('data-map');
      f.title = 'Map to Wand & Whisk Café';
      f.loading = 'lazy';
      f.referrerPolicy = 'strict-origin-when-cross-origin';
      slot.innerHTML = '';
      slot.classList.add('is-loaded');
      slot.appendChild(f);
    });
  });
})();
