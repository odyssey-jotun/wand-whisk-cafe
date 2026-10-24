/* Wand & Whisk additions: Jesse's reference-site animations plus static
   stand-ins for the parts that needed WordPress (Load More, contact form,
   the sign-up pop-up). James's own scripts keep running untouched. */
(function () {
  document.documentElement.classList.add('ww-js');

  // Taiyaki soft serve cards: paint the strip above each swirl in that photo's own backdrop color
  document.querySelectorAll('.dp-dfg-item.menu-category-taiyaki-soft-serve img').forEach(function (img) {
    function paint() {
      try {
        var c = document.createElement('canvas'); c.width = 8; c.height = 1;
        var g = c.getContext('2d');
        g.drawImage(img, 0, 0, img.naturalWidth, Math.max(2, Math.round(img.naturalHeight * 0.01)), 0, 0, 8, 1);
        var d = g.getImageData(0, 0, 8, 1).data, r = 0, gr = 0, b = 0;
        for (var i = 0; i < 32; i += 4) { r += d[i]; gr += d[i + 1]; b += d[i + 2]; }
        img.style.setProperty('--ww-photo-top', 'rgb(' + Math.round(r / 8) + ',' + Math.round(gr / 8) + ',' + Math.round(b / 8) + ')');
      } catch (e) {}
    }
    if (img.complete && img.naturalWidth) paint(); else img.addEventListener('load', paint);
  });
  var cfg = window.WW || {};
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Load More: reveal the items the static build added ---- */
  // Capture phase so the FilterGrid plugin's AJAX handler never runs.
  window.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.dp-dfg-load-more-button');
    if (!btn) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    var grid = btn.closest('.dp-dfg-container');
    var hidden = grid ? grid.querySelectorAll('.ww-hidden-item') : [];
    for (var i = 0; i < hidden.length; i++) {
      hidden[i].classList.remove('ww-hidden-item');
      if (!reduce) { hidden[i].classList.add('ww-rise'); (function (el) { requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('ww-in'); }); }); })(hidden[i]); }
    }
    var wrap = btn.closest('.dp-dfg-pagination');
    if (wrap) wrap.style.display = 'none';
  }, true);
  document.querySelectorAll('.dp-dfg-container').forEach(function (grid) {
    var btn = grid.querySelector('.dp-dfg-load-more-button');
    if (btn && !grid.querySelector('.ww-hidden-item')) { var w = btn.closest('.dp-dfg-pagination'); if (w) w.style.display = 'none'; }
  });

  /* ---- Eorzea Café style ornament line under centered section titles ---- */
  var orn = [].slice.call(document.querySelectorAll('h2.et_pb_module_header, h1.entry-title, h1.et_pb_module_header')).filter(function (h) {
    if (h.closest('.et_pb_blurb, .anchor-group, .dp-dfg-item, .ww-wave-title')) return false;
    if (document.body.classList.contains('home') && h.tagName === 'H1') return false;
    return getComputedStyle(h).textAlign === 'center';
  });
  orn.forEach(function (h) { h.classList.add('ww-ornament'); });

  /* ---- fade-up as cards come into view; ornament lines draw in ---- */
  var rise = [].slice.call(document.querySelectorAll('.dp-dfg-item:not(.ww-hidden-item), .et_pb_blurb, .et_pb_toggle, .et_pb_post, article.et_pb_post'));
  var cast = null;
  if ('IntersectionObserver' in window && !reduce) {
    var lineIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('ww-drawn'); lineIo.unobserve(en.target); } });
    }, { threshold: 0.6 });
    orn.forEach(function (h) { lineIo.observe(h); });
  } else {
    orn.forEach(function (h) { h.classList.add('ww-drawn'); });
  }
  if ('IntersectionObserver' in window && !reduce) {
    rise.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight) return; // already on screen: leave it alone
      el.classList.add('ww-rise');
      var sibs = el.parentNode ? [].slice.call(el.parentNode.children) : [];
      el.style.transitionDelay = (Math.max(0, sibs.indexOf(el)) % 4) * 0.08 + 's';
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('ww-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
    document.querySelectorAll('.ww-rise').forEach(function (el) { io.observe(el); });
    if (cast) io.observe(cast);
  } else if (cast) {
    cast.classList.add('ww-in');
  }

  /* ---- wavy "Menu" title: moves only while the visitor scrolls ---- */
  var paths = [].slice.call(document.querySelectorAll('.ww-wave textPath'));
  function wave() {
    var y = window.scrollY || 0;
    paths.forEach(function (tp) {
      var unit = parseFloat(tp.getAttribute('data-unit')) || 400;
      var shift = (y * 0.5) % unit;
      tp.setAttribute('startOffset', (tp.getAttribute('data-dir') === 'right' ? shift - unit : -shift).toFixed(1));
    });
  }
  if (paths.length && !reduce) {
    var ticking = false;
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(function () { wave(); ticking = false; }); } }, { passive: true });
    wave();
  }

  /* ---- sign-up box: slides in after some scrolling, never covers the page ---- */
  var box = document.querySelector('.wppopups-whole .spu-box');
  if (box) {
    var KEY = 'ww-signup-closed';
    var closedRecently = function () { try { var t = +localStorage.getItem(KEY) || 0; return t && Date.now() - t < 30 * 864e5; } catch (e) { return false; } };
    var open = function () { box.classList.add('ww-open'); };
    var close = function () { box.classList.remove('ww-open'); try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {} };
    var shown = false;
    window.addEventListener('scroll', function () {
      if (shown || closedRecently()) return;
      if ((window.scrollY || 0) > window.innerHeight * 0.9) { shown = true; open(); }
    }, { passive: true });
    var x = box.querySelector('.spu-close');
    if (x) x.addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') box.classList.remove('ww-open'); });
    // James's "Sign up for updates" buttons open the same box
    document.querySelectorAll('a.mailchimp, .mailchimp > a, a[href="#signup"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault(); open();
        var input = box.querySelector('input[type="email"]'); if (input) setTimeout(function () { input.focus(); }, 350);
      });
    });
  }

  /* ---- contact form: posts to an endpoint once one is set, otherwise opens email ---- */
  var form = document.querySelector('form[data-ww-contact]');
  if (form) {
    var status = form.querySelector('.nf-response-msg') || form.parentNode.querySelector('.nf-response-msg');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = (form.querySelector('#nf-field-1') || {}).value || '';
      var email = (form.querySelector('#nf-field-2') || {}).value || '';
      var msg = (form.querySelector('#nf-field-3') || {}).value || '';
      if (!name.trim() || !email.trim() || !msg.trim()) { if (status) status.textContent = 'Please fill in every field marked with an *.'; return; }
      if (cfg.contactEndpoint) {
        var fd = new FormData(); fd.append('name', name); fd.append('email', email); fd.append('message', msg);
        fetch(cfg.contactEndpoint, { method: 'POST', body: fd, headers: { Accept: 'application/json' } })
          .then(function (r) { if (!r.ok) throw 0; if (status) status.textContent = 'Thanks! Your message is on its way.'; form.reset(); })
          .catch(function () { if (status) status.textContent = 'Sorry, that did not send. Please call (501) 563-0769.'; });
      } else {
        location.href = 'mailto:wandandwhiskcafe@gmail.com?subject=' + encodeURIComponent('Website message from ' + name) + '&body=' + encodeURIComponent(msg + '\n\n' + name + '\n' + email);
        if (status) status.textContent = 'Your email app should open with the message ready to send.';
      }
    });
  }
})();
