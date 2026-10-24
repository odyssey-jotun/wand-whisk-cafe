// Builds the static site from src/ into docs/.
//   node scripts/build.mjs            preview build (noindex, robots disallow)
//   PREVIEW=0 node scripts/build.mjs  production build for wandandwhiskcafe.com
// No dependencies: content lives in src/data/*.json and src/posts/*.html.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'docs');
const PREVIEW = process.env.PREVIEW !== '0';

const read = (p) => fs.readFileSync(path.join(SRC, p), 'utf8');
const site = JSON.parse(read('data/site.json'));
const menu = JSON.parse(read('data/menu.json'));
const posts = JSON.parse(read('data/posts.json'));
const PROD = site.productionUrl;
const NOW = new Date();

/* ---------- helpers ---------- */
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const html = (s = '') => String(s).replace(/&(?![a-zA-Z]+;|#\d+;)/g, '&amp;'); // trusted copy that may hold <em>, <br>, <strong>
const attr = esc;

// relative URL from the page at `from` (a directory path like /menu/) to a root path
function rel(from, to) {
  if (/^(https?:|mailto:|tel:|#)/.test(to)) return to;
  const depth = from.split('/').filter(Boolean).length;
  const prefix = depth ? '../'.repeat(depth) : './';
  const target = to.replace(/^\//, '');
  return target === '' ? prefix : prefix + target;
}
// rewrite root-relative href/src inside trusted HTML fragments
const relHtml = (from, s) => s.replace(/(href|src)="(\/[^"]*)"/g, (m, a, u) => `${a}="${rel(from, u)}"`);

const hash = (file) => crypto.createHash('md5').update(fs.readFileSync(path.join(SRC, file))).digest('hex').slice(0, 8);
const V = { css: hash('css/site.css'), js: hash('js/site.js') };

const allItems = menu.categories.flatMap((c) => c.items.map((i) => ({ ...i, category: c })));
const characterAlt = {
  strawberry: 'Strawberry, a Wand & Whisk mascot in a pink witch hat, riding a strawberry crepe',
  matcha: 'Matcha, a Wand & Whisk mascot with green hair, hugging a melon potion float',
  ube: 'Ube, a Wand & Whisk mascot in a purple witch hat and cape, holding a moon wand and a spoon',
  creamia: 'Creamia, a Wand & Whisk mascot in a white cape, holding a taiyaki soft serve and a potion float',
};
const charSize = { strawberry: [400, 367], matcha: [400, 320], ube: [400, 320], creamia: [400, 250] };
function charImg(from, name, cls = '', sizes = '240px', extra = '') {
  const [w, h] = charSize[name];
  return `<img class="${cls}" src="${rel(from, `/img/char/${name}-400.webp`)}" srcset="${rel(from, `/img/char/${name}-400.webp`)} 400w, ${rel(from, `/img/char/${name}-800.webp`)} 800w" sizes="${sizes}" width="${w}" height="${h}" alt="${attr(characterAlt[name])}" loading="lazy" decoding="async"${extra}>`;
}

const fmtDate = (iso) => new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/* ---------- shared pieces ---------- */
const NAV = [
  ['/menu/', 'Menu'], ['/events/', 'Events'], ['/about-us/', 'About Us'], ['/blog/', 'Blog'], ['/contact-us/', 'Contact Us'],
];

function header(from, firstTheme) {
  const guildHref = from === '/' ? '#guild' : rel(from, '/') + '#guild';
  const links = NAV.map(([href, label]) => {
    const current = from === href || (href !== '/' && from.startsWith(href)) || (href === '/menu/' && from.startsWith('/menu-')) || (href === '/events/' && from.startsWith('/event')) || (href === '/blog/' && (from.startsWith('/category/') || from.startsWith('/tag/') || posts.some((p) => from === `/${p.slug}/`)));
    return `<li><a href="${rel(from, href)}"${current ? ' aria-current="page"' : ''}>${label}</a></li>`;
  }).join('');
  return `<header class="site-header" data-on="${firstTheme}">
  <div class="bar">
    <a class="brand" href="${rel(from, '/')}"><img src="${rel(from, '/img/brand/logo-white-480.webp')}" width="480" height="275" alt="Wand &amp; Whisk Café home"></a>
    <nav class="primary" id="primary-nav" aria-label="Main">
      <ul>${links}</ul>
      <a class="btn mobile-cta" href="${guildHref}">Join the Guild</a>
    </nav>
    <a class="btn nav-cta" href="${guildHref}">Join the Guild</a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="primary-nav"><span class="bars" aria-hidden="true"></span>Menu</button>
  </div>
</header>`;
}

function footer(from, { cast = true } = {}) {
  const castImgs = cast
    ? `<div class="footer-cast" aria-hidden="true">${['strawberry', 'matcha', 'ube', 'creamia'].map((c) => charImg(from, c, '', '(max-width: 760px) 140px, 240px', ' alt=""').replace(/alt="[^"]*" /, '')).join('')}</div>`
    : '';
  return `<footer class="site-footer scallop-top${cast ? '' : ' no-cast'}">
  ${castImgs}
  <div class="wrap footer-grid">
    <div>
      <div class="footer-brand"><img src="${rel(from, '/img/brand/crest-white-160.webp')}" width="160" height="160" alt=""><span>Wand &amp; Whisk Café</span></div>
      <p>${esc(site.footerBlurb)}</p>
      <p>${esc(site.hoursShort)}</p>
    </div>
    <div>
      <h2>Explore</h2>
      <ul><li><a href="${rel(from, '/menu/')}">Menu</a></li><li><a href="${rel(from, '/events/')}">Events</a></li><li><a href="${rel(from, '/about-us/')}">About Us</a></li><li><a href="${rel(from, '/blog/')}">Blog</a></li></ul>
    </div>
    <div>
      <h2>Visit</h2>
      <ul><li><a href="${rel(from, '/contact-us/')}">Contact Us</a></li><li><a href="${rel(from, '/contact-us/')}#visit">Location</a></li></ul>
      <address>${esc(site.address.street)}<br>${esc(site.address.city)}, ${site.address.region} ${site.address.zip}<br><a href="tel:${site.phoneHref}">${esc(site.phone)}</a></address>
    </div>
  </div>
  <div class="wrap footer-bottom">© ${NOW.getFullYear()} Wand &amp; Whisk Café · Little Rock, Arkansas</div>
</footer>`;
}

const signupForm = (id, cta = 'Join the Guild') => `<form class="signup" action="${attr(site.mailchimp.action)}" method="post" target="_blank" data-mailchimp>
      <label class="sr-only" for="${id}">Email address</label>
      <input id="${id}" type="email" name="EMAIL" autocomplete="email" placeholder="your@email.com" required>
      <div style="position:absolute;left:-5000px" aria-hidden="true"><input type="text" name="${site.mailchimp.honeypot}" tabindex="-1" value=""></div>
      <button class="btn" type="submit">${cta}</button>
    </form>`;

const miniSignup = () => `<aside class="mini-signup" aria-label="Sign up for updates" hidden>
  <form action="${attr(site.mailchimp.action)}" method="post" target="_blank" data-mailchimp>
    <span class="label">Sign up for updates</span>
    <label class="sr-only" for="mini-email">Email address</label>
    <input id="mini-email" type="email" name="EMAIL" autocomplete="email" placeholder="your@email.com" required>
    <div style="position:absolute;left:-5000px" aria-hidden="true"><input type="text" name="${site.mailchimp.honeypot}" tabindex="-1" value=""></div>
    <button class="btn" type="submit">Subscribe</button>
    <button class="close" type="button" aria-label="Close sign-up banner">×</button>
  </form>
  <p class="signup-status" role="status" aria-live="polite"></p>
</aside>`;

function layout(page) {
  const { path: from, title, description, body, theme = 'pink', head = '', jsonld = [], image = '/img/hero/friends-cone-1400.webp', noindex = false, bare = false, cast = true, type = 'website' } = page;
  const robots = PREVIEW || noindex ? '<meta name="robots" content="noindex, nofollow">' : '<meta name="robots" content="max-image-preview:large">';
  const ld = jsonld.length ? `<script type="application/ld+json">${JSON.stringify(jsonld.length === 1 ? jsonld[0] : { '@context': 'https://schema.org', '@graph': jsonld.map((j) => { const { '@context': _, ...rest } = j; return rest; }) })}</script>` : '';
  const cfg = { mailchimpJsonp: site.mailchimp.jsonp, mailchimpHoneypot: site.mailchimp.honeypot, contactEndpoint: site.contactFormEndpoint, email: site.email, phone: site.phone };
  return `<!doctype html>
<html lang="en" data-season="${site.season.name}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${attr(description)}">
${robots}
<link rel="canonical" href="${PROD}${from}">
<meta property="og:site_name" content="Wand &amp; Whisk Café">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${attr(title)}">
<meta property="og:description" content="${attr(description)}">
<meta property="og:url" content="${PROD}${from}">
<meta property="og:image" content="${PROD}${image}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#f8b8c6">
<link rel="icon" href="${rel(from, '/img/brand/favicon-32.png')}" sizes="32x32">
<link rel="icon" href="${rel(from, '/img/brand/favicon-192.png')}" sizes="192x192">
<link rel="apple-touch-icon" href="${rel(from, '/img/brand/favicon-180.png')}">
<link rel="preload" href="${rel(from, '/fonts/magic-story.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${rel(from, '/fonts/nunito-latin.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${rel(from, '/css/site.css')}?v=${V.css}">
${head}${ld}
</head>
<body>
${bare ? `<main id="main">${body}</main>` : `<a class="skip" href="#main">Skip to content</a>
${header(from, theme)}
<main id="main">
${body}
</main>
${footer(from, { cast })}
${miniSignup()}`}
<script>window.WW=${JSON.stringify(cfg)};</script>
<script src="${rel(from, '/js/site.js')}?v=${V.js}" defer></script>
</body>
</html>
`;
}

/* ---------- components ---------- */
function itemCard(from, item, extra = false, level = 'h4') {
  // level is the heading tag for the item name
  const potion = item.potion ? ` data-potion="${item.potion}"` : '';
  return `<a class="item-card${extra ? ' is-extra' : ''}" href="${rel(from, `/menu-item/${item.slug}/`)}"${potion}>
  <div class="pic"><img src="${rel(from, `/img/menu/${item.slug}-480.webp`)}" srcset="${rel(from, `/img/menu/${item.slug}-480.webp`)} 480w, ${rel(from, `/img/menu/${item.slug}-960.webp`)} 960w" sizes="(max-width: 620px) 44vw, (max-width: 1080px) 36vw, 300px" width="480" height="640" alt="${attr(item.name)}" loading="lazy" decoding="async"></div>
  <div class="txt"><${level} class="item-name">${item.potion ? '<span class="potion-dot" aria-hidden="true"></span>' : ''}${esc(item.name)}</${level}><p>${esc(item.description)}</p></div>
</a>`;
}

function menuBlock(from, { limit = 3, idp = 'cat', catLevel = 'h3', itemLevel = 'h4' } = {}) {
  const tracker = `<nav class="tracker" aria-label="Menu categories"><ol>${menu.categories.map((c) => `<li><a href="#${idp}-${c.slug}"><span class="dot" aria-hidden="true"></span><span class="label">${esc(c.name)}</span></a></li>`).join('')}</ol></nav>`;
  const cats = menu.categories.map((c) => {
    const gid = `${idp}-${c.slug}-grid`;
    const more = c.items.length > limit
      ? `<div class="more"><button class="btn btn--white" type="button" data-more aria-controls="${gid}" aria-expanded="false">+ More ${esc(c.name)}</button></div>` : '';
    return `<section class="menu-cat" id="${idp}-${c.slug}" aria-labelledby="${idp}-${c.slug}-h">
      <${catLevel} class="cat-title" id="${idp}-${c.slug}-h">${esc(c.name)}</${catLevel}>
      <div class="cards" id="${gid}">${c.items.map((it, i) => itemCard(from, it, i >= limit, itemLevel)).join('\n')}</div>
      ${more}
    </section>`;
  }).join('\n');
  return `<div class="menu-layout">${tracker}<div class="menu-cats">${cats}</div></div>`;
}

function eventDate(ev) {
  const d = new Date(ev.start);
  return {
    m: d.toLocaleDateString('en-US', { month: 'short', timeZone: 'America/Chicago' }),
    d: d.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'America/Chicago' }),
    y: d.toLocaleDateString('en-US', { year: 'numeric', timeZone: 'America/Chicago' }),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }),
    past: d < NOW,
  };
}
function eventCard(from, ev, level = 'h3') {
  const dt = eventDate(ev);
  return `<a class="event-card" href="${rel(from, `/event/${ev.slug}/`)}" data-event-start="${ev.start}">
  <div class="date-tile" aria-hidden="true"><span class="m">${dt.m}</span><span class="d">${dt.d}</span><span class="y">${dt.y}</span></div>
  <div class="event-pic"><img src="${rel(from, `/img/${ev.image}-800.webp`)}" width="800" height="450" alt="${attr(ev.imageAlt)}" loading="lazy" decoding="async"></div>
  <div class="event-txt">
    <span class="event-status">${dt.past ? 'Past event' : 'Upcoming'}</span>
    <${level}>${esc(ev.name)}</${level}>
    <div class="event-meta">${esc(ev.dateLabel)} · ${esc(ev.location)}</div>
    <span class="text-link">Event details</span>
  </div>
</a>`;
}

function bookingsGuide(from) {
  const b = site.bookings;
  const pkg = b.packages.map((p) => `<article class="package">
      <h4>${esc(p.name)}</h4>
      <div class="kind">${esc(p.kind)}</div>
      <dl>
        <div><dt>Space &amp; Capacity</dt><dd>${esc(p.space)}<small>${esc(p.spaceNote)}</small></dd></div>
        <div><dt>Pricing &amp; Rates</dt><dd><span class="big">${esc(p.price)}</span><small>${esc(p.priceNote)}</small></dd></div>
        <div><dt>Deposit</dt><dd>${esc(p.deposit)}${p.depositNote ? `<small>${esc(p.depositNote)}</small>` : ''}</dd></div>
        <div><dt>Staffing</dt><dd>${esc(p.staffing)}</dd></div>
      </dl>
      <p class="inc">${esc(p.detailsTitle)} <small>· ${esc(p.detailsSub)}</small></p>
      <ul>${p.details.map(([k, v]) => `<li><strong>${esc(k)}</strong> ${esc(v)}</li>`).join('')}</ul>
    </article>`).join('');
  return `<div class="guide">
    <p class="notice"><strong>Advance Booking Policy:</strong> ${html(b.advance)}</p>
    <h3>Package Summary &amp; Comparison</h3>
    <div class="packages">${pkg}</div>
    <h3>Event Policies &amp; Booking Guidelines</h3>
    <div class="policies">${b.policies.map(([t, d]) => `<div><h4>${esc(t)}</h4><p>${html(d)}</p></div>`).join('')}</div>
    <p class="callout"><strong>Large Group Inquiries (30+ Guests):</strong> ${html(b.largeGroups)}</p>
    <p class="closing">${esc(b.closing)}</p>
    <div class="guide-actions">
      <a class="btn" href="tel:${site.phoneHref}">Call ${esc(site.phone)}</a>
      <a class="btn btn--white" href="${rel(from, '/contact-us/')}">Send an inquiry</a>
      <a class="text-link" href="${rel(from, '/img/event/ww-events-private-bookings-guide.png')}" download>Printable guide</a>
    </div>
  </div>`;
}

const faqBlock = () => `<div class="accordion wide">${site.faq.map((f) => `<details><summary>${esc(f.q)}</summary><div class="answer">${f.a.map((p) => `<p>${html(p)}</p>`).join('')}</div></details>`).join('')}</div>`;

function postCard(from, p, level = 'h3') {
  return `<a class="post-card" href="${rel(from, `/${p.slug}/`)}">
  <div class="pic"><img src="${rel(from, `/img/${p.lead}.webp`)}" width="1080" height="675" alt="${attr(p.leadAlt)}" loading="lazy" decoding="async"></div>
  <div class="txt"><${level}>${esc(p.title)}</${level}><div class="meta">${fmtDate(p.date)} · ${p.minutes} min read</div><p>${esc(p.description)}</p><span class="text-link">Read the post</span></div>
</a>`;
}

function titleBand(from, { theme = 'pink', h1, lede = '', crumbs = [], cast = '' }) {
  const crumbHtml = crumbs.length ? `<nav class="crumbs" aria-label="Breadcrumb">${crumbs.map(([href, label]) => `<a href="${rel(from, href)}">${esc(label)}</a>`).join('<span aria-hidden="true">›</span>')}</nav>` : '';
  return `<section class="band band--${theme} page-title" data-theme="${theme}">
  <div class="wrap page-title-grid">
    <div>${crumbHtml}<h1>${esc(h1)}</h1>${lede ? `<p class="lede">${lede}</p>` : ''}</div>
    ${cast ? charImg(from, cast, 'cast pop', '230px') : ''}
  </div>
</section>`;
}

const crumbLd = (items) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([href, name], i) => ({ '@type': 'ListItem', position: i + 1, name, item: PROD + href })) });

const businessLd = {
  '@context': 'https://schema.org', '@type': 'IceCreamShop', '@id': PROD + '/#cafe',
  name: site.name, url: PROD + '/', image: PROD + '/img/hero/friends-cone-1400.webp', logo: PROD + '/img/brand/favicon-270.png',
  description: site.footerBlurb, telephone: '+1-501-563-0769', email: site.email,
  address: { '@type': 'PostalAddress', streetAddress: site.address.street, addressLocality: site.address.city, addressRegion: site.address.region, postalCode: site.address.zip, addressCountry: 'US' },
  geo: { '@type': 'GeoCoordinates', latitude: site.address.lat, longitude: site.address.lng },
  openingHours: site.hours.map((h) => h.schema),
  servesCuisine: ['Japanese desserts', 'Taiyaki soft serve', 'Crepes', 'Soufflé pancakes'],
  hasMenu: PROD + '/menu/',
};

/* ---------- pages ---------- */
const pages = [];

// Home
{
  const from = '/';
  const h = site.home;
  const hc = site.season.heroCharacter;
  const body = `
<section class="band band--pink hero scallop-bottom" data-theme="pink" style="--scallop: var(--pink)">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <h1>${esc(h.h1)}</h1>
      <h2 class="tagline">${esc(h.tagline)}</h2>
      <p class="lede">${esc(h.lede)}</p>
      <div class="btn-row">
        <a class="btn btn--plum" href="#menu">View Menu</a>
        <a class="btn btn--white" href="#guild">Join the Guild</a>
      </div>
    </div>
    <figure class="hero-photo" style="margin:0">
      <img class="photo" src="img/hero/friends-cone-960.webp" srcset="img/hero/friends-cone-640.webp 640w, img/hero/friends-cone-960.webp 960w, img/hero/friends-cone-1400.webp 1400w" sizes="(max-width: 860px) 380px, 470px" width="960" height="1200" alt="${attr(h.heroAlt)}" fetchpriority="high">
      ${charImg(from, hc, 'cast pop', '(max-width: 860px) 132px, 230px')}
    </figure>
  </div>
</section>

<section class="band band--yellow" id="menu" data-theme="yellow" aria-labelledby="menu-h">
  <div class="wrap">
    <div class="section-head reveal"><h2 id="menu-h">Magical Desserts &amp; Sweet Treats</h2><p>${esc(menu.intro)}</p></div>
    ${menuBlock(from, { limit: 3, idp: 'home' })}
    <div class="btn-row btn-row--center"><a class="btn btn--plum" href="menu/">Explore Our Full Menu</a></div>
  </div>
</section>

<section class="band band--white" id="events" data-theme="white" aria-labelledby="events-h">
  <div class="wrap events-split">
    <div class="events-copy reveal">
      <h2 id="events-h">${esc(h.events.h2)}</h2>
      ${h.events.paras.map((p) => `<p>${esc(p)}</p>`).join('')}
      <div class="btn-row"><a class="btn btn--plum" href="events/">All Events</a></div>
    </div>
    <div class="reveal">
      <div class="event-list">${site.events.map((ev) => eventCard(from, ev, 'h3')).join('')}</div>
    </div>
  </div>
  <div class="wrap accordion" style="margin-top:clamp(28px,4vw,44px)">
    <details><summary>Event Policies and Pricing</summary><div class="answer">${bookingsGuide(from)}</div></details>
  </div>
</section>

<section class="band band--pink" data-theme="pink" aria-labelledby="escape-h">
  <div class="wrap">
    <div class="section-head reveal" style="margin-bottom:0"><h2 id="escape-h">${esc(h.escapism.h2)}</h2>${h.escapism.paras.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
    <div class="feature-cards">${h.escapism.cards.map((c) => `<div class="feature-card reveal">${charImg(from, c.character, '', '170px')}<h3>${esc(c.title)}</h3><p>${esc(c.text)}</p></div>`).join('')}</div>
  </div>
</section>

<section class="band band--magenta" id="guild" data-theme="magenta" aria-labelledby="guild-h">
  <div class="wrap guild-box">
    <h2 id="guild-h">${esc(h.guild.h2)}</h2>
    <p>${esc(h.guild.text)}</p>
    ${signupForm('guild-email')}
    <p class="signup-status" role="status" aria-live="polite"></p>
  </div>
</section>

<section class="band band--pinksoft" data-theme="pinksoft" aria-labelledby="blog-h">
  <div class="wrap">
    <div class="section-head reveal"><h2 id="blog-h">Blog</h2></div>
    <div class="post-grid">${posts.map((p) => postCard(from, p)).join('')}</div>
    <div class="btn-row btn-row--center"><a class="btn btn--white" href="blog/">See All Posts</a></div>
  </div>
</section>

<section class="band band--white" id="faq" data-theme="white" aria-labelledby="faq-h">
  <div class="wrap">
    <div class="section-head reveal"><h2 id="faq-h">Frequently Asked Questions</h2></div>
    ${faqBlock()}
  </div>
</section>`;
  const faqLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: site.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a.join(' ').replace(/<br>/g, ', ') } })) };
  const siteLd = { '@context': 'https://schema.org', '@type': 'WebSite', name: site.name, url: PROD + '/' };
  pages.push({ path: from, title: h.title, description: h.description, body, theme: 'pink', jsonld: [businessLd, siteLd, faqLd],
    head: `<link rel="preload" as="image" href="img/hero/friends-cone-960.webp" imagesrcset="img/hero/friends-cone-640.webp 640w, img/hero/friends-cone-960.webp 960w, img/hero/friends-cone-1400.webp 1400w" imagesizes="(max-width: 860px) 380px, 470px" fetchpriority="high">\n` });
}

// Menu page
{
  const from = '/menu/';
  const word = 'Menu';
  const unit = 380; // width of one "Menu  ·  " repeat in SVG units
  const text = Array.from({ length: 14 }, () => `${word}  ·  `).join('');
  const wave = `<h1 class="wave-title"><span class="sr-only">Menu</span><svg viewBox="0 0 1440 300" role="presentation" aria-hidden="true" focusable="false">
    <defs>
      <path id="wave1" d="M-1600 130 C -1420 30, -1240 30, -1060 130 S -700 230, -520 130 S -160 30, 20 130 S 380 230, 560 130 S 920 30, 1100 130 S 1460 230, 1640 130 S 2000 30, 2180 130 S 2540 230, 2720 130"/>
      <path id="wave2" d="M-1600 230 C -1420 130, -1240 130, -1060 230 S -700 330, -520 230 S -160 130, 20 230 S 380 330, 560 230 S 920 130, 1100 230 S 1460 330, 1640 230 S 2000 130, 2180 230 S 2540 330, 2720 230"/>
    </defs>
    <g class="row1"><text><textPath href="#wave1" data-unit="${unit}" data-dir="left" startOffset="0">${text}</textPath></text></g>
    <g class="row2"><text><textPath href="#wave2" data-unit="${unit}" data-dir="right" startOffset="-${unit}">${text}</textPath></text></g>
  </svg></h1>`;
  const body = `
<section class="band band--pink wave-band" data-theme="pink">
  ${wave}
  <div class="wrap narrow center"><p class="lede">${esc(menu.intro)}</p></div>
</section>
<section class="band band--yellow" data-theme="yellow" aria-label="Menu items" style="padding-top:clamp(48px,6vw,72px)">
  <div class="wrap">${menuBlock(from, { limit: 3, idp: 'cat', catLevel: 'h2', itemLevel: 'h3' })}</div>
</section>
<section class="band band--magenta" data-theme="magenta">
  <div class="wrap guild-box">
    <h2>Join the Guild</h2>
    <p>${esc(site.home.guild.text)}</p>
    ${signupForm('menu-guild-email')}
    <p class="signup-status" role="status" aria-live="polite"></p>
  </div>
</section>`;
  const menuLd = { '@context': 'https://schema.org', '@type': 'Menu', name: 'Wand & Whisk Café Menu', url: PROD + from,
    hasMenuSection: menu.categories.map((c) => ({ '@type': 'MenuSection', name: c.name, hasMenuItem: c.items.map((i) => ({ '@type': 'MenuItem', name: i.name, description: i.description, url: `${PROD}/menu-item/${i.slug}/` })) })) };
  pages.push({ path: from, title: 'Menu | Taiyaki, Crepes & Potion Sodas | Wand & Whisk Café', description: 'Taiyaki soft serve, classic and specialty Japanese crepes, potion floats, potion sodas, soufflé pancakes, and matcha at Wand & Whisk Café in Little Rock.', body, theme: 'pink', jsonld: [menuLd, crumbLd([['/', 'Home'], ['/menu/', 'Menu']])] });
}

// Menu item pages
for (const item of allItems) {
  const from = `/menu-item/${item.slug}/`;
  const siblings = item.category.items.filter((i) => i.slug !== item.slug);
  const body = `
<section class="band band--pink page-title" data-theme="pink">
  <div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb" style="font-weight:800;margin-bottom:18px"><a href="${rel(from, '/menu/')}" style="color:var(--plum)">Menu</a><span aria-hidden="true" style="margin:0 .4em;opacity:.6">›</span><a href="${rel(from, `/menu-category/${item.category.slug}/`)}" style="color:var(--plum)">${esc(item.category.name)}</a></nav>
    <div class="item-hero"${item.potion ? ` data-potion="${item.potion}"` : ''}>
      <div class="pic"><img src="${rel(from, `/img/menu/${item.slug}-960.webp`)}" srcset="${rel(from, `/img/menu/${item.slug}-480.webp`)} 480w, ${rel(from, `/img/menu/${item.slug}-960.webp`)} 960w" sizes="(max-width: 760px) 360px, 480px" width="960" height="1280" alt="${attr(item.name)}" fetchpriority="high"></div>
      <div>
        <h1>${esc(item.name)}</h1>
        <p class="lede">${esc(item.description)}</p>
        <div class="btn-row"><a class="btn btn--plum" href="${rel(from, '/menu/')}#cat-${item.category.slug}">Back to the Menu</a><a class="btn btn--white" href="${rel(from, '/contact-us/')}#visit">Visit Us</a></div>
      </div>
    </div>
  </div>
</section>
${siblings.length ? `<section class="band band--yellow" data-theme="yellow"><div class="wrap"><h2 class="center" style="margin-bottom:28px">More ${esc(item.category.name)}</h2><div class="cards">${siblings.map((s) => itemCard(from, s, false, 'h3')).join('')}</div></div></section>` : ''}`;
  const ld = { '@context': 'https://schema.org', '@type': 'MenuItem', name: item.name, description: item.description, image: `${PROD}/img/menu/${item.slug}-960.webp`, url: PROD + from };
  pages.push({ path: from, title: `${item.name} | Wand & Whisk Café`, description: item.description, body, theme: 'pink', image: `/img/menu/${item.slug}-960.webp`, jsonld: [ld, crumbLd([['/menu/', 'Menu'], [`/menu-category/${item.category.slug}/`, item.category.name], [from, item.name]])] });
}

// Menu category archives
for (const c of menu.categories) {
  const from = `/menu-category/${c.slug}/`;
  const body = `${titleBand(from, { theme: 'pink', h1: c.name, crumbs: [['/menu/', 'Menu']] })}
<section class="band band--yellow" data-theme="yellow"><div class="wrap"><div class="cards">${c.items.map((i) => itemCard(from, i, false, 'h2')).join('')}</div>
<div class="btn-row btn-row--center"><a class="btn btn--plum" href="${rel(from, '/menu/')}">See the Whole Menu</a></div></div></section>`;
  pages.push({ path: from, title: `${c.name} | Wand & Whisk Café Menu`, description: `${c.name} at Wand & Whisk Café in Little Rock: ${c.items.map((i) => i.name).join(', ')}.`, body, theme: 'pink', jsonld: [crumbLd([['/menu/', 'Menu'], [from, c.name]])] });
}

// Events page
{
  const from = '/events/';
  const upcoming = site.events.filter((e) => !eventDate(e).past);
  const past = site.events.filter((e) => eventDate(e).past);
  const body = `${titleBand(from, { theme: 'pink', h1: 'Events', lede: esc(site.home.events.h2), cast: 'strawberry' })}
<section class="band band--white" data-theme="white">
  <div class="wrap narrow">
    ${site.home.events.paras.map((p) => `<p class="lede">${esc(p)}</p>`).join('')}
    <h2>Upcoming Events</h2>
    ${upcoming.length ? `<div class="event-list">${upcoming.map((e) => eventCard(from, e, 'h3')).join('')}</div>` : `<p>No upcoming events are posted right now.</p><div class="btn-row"><a class="btn btn--plum" href="#events-guild">Join the Guild</a></div>`}
    ${past.length ? `<h2>Past Events</h2><div class="event-list">${past.map((e) => eventCard(from, e, 'h3')).join('')}</div>` : ''}
  </div>
</section>
<section class="band band--pinksoft" id="private-events" data-theme="pinksoft" aria-labelledby="guide-h">
  <div class="wrap">
    <div class="section-head"><h2 id="guide-h">${esc(site.bookings.title)}</h2><p>${esc(site.bookings.subtitle)}</p></div>
    ${bookingsGuide(from)}
  </div>
</section>
<section class="band band--magenta" id="events-guild" data-theme="magenta">
  <div class="wrap guild-box">
    <h2>Join the Guild</h2>
    <p>${esc(site.home.guild.text)}</p>
    ${signupForm('events-guild-email')}
    <p class="signup-status" role="status" aria-live="polite"></p>
  </div>
</section>`;
  pages.push({ path: from, title: 'Events & Private Parties | Wand & Whisk Café, Little Rock', description: 'Seasonal menu drops, tastings, themed treats, and collaborations at Wand & Whisk Café, plus birthday parties, large group reservations, and private café buyouts.', body, theme: 'pink', jsonld: [crumbLd([['/', 'Home'], ['/events/', 'Events']])] });
}

// Event detail pages
for (const ev of site.events) {
  const from = `/event/${ev.slug}/`;
  const dt = eventDate(ev);
  const body = `${titleBand(from, { theme: 'pink', h1: ev.name, crumbs: [['/events/', 'Events']] })}
<section class="band band--white" data-theme="white">
  <div class="wrap narrow">
    <div class="article">
      <div class="lead-img"><img src="${rel(from, `/img/${ev.image}-1400.webp`)}" srcset="${rel(from, `/img/${ev.image}-800.webp`)} 800w, ${rel(from, `/img/${ev.image}-1400.webp`)} 1400w" sizes="(max-width: 780px) 92vw, 740px" width="1400" height="788" alt="${attr(ev.imageAlt)}"></div>
      <p class="event-meta" style="font-size:1.05rem"><strong>Location:</strong> ${esc(ev.location)}<br><strong>Date:</strong> ${esc(ev.dateLabel)}${dt.past ? ' (past event)' : ''}</p>
      <div class="prose"><p>${esc(ev.description)}</p></div>
      <div class="btn-row">${ev.learnMore ? `<a class="btn btn--plum" href="${attr(ev.learnMore)}" rel="noopener">Learn More</a>` : ''}<a class="btn btn--white" href="${rel(from, '/events/')}">All Events</a></div>
    </div>
  </div>
</section>`;
  const ld = { '@context': 'https://schema.org', '@type': 'Event', name: ev.name, startDate: ev.start, eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode', description: ev.description, image: `${PROD}/img/${ev.image}-1400.webp`,
    location: { '@type': 'Place', name: site.name, address: businessLd.address }, organizer: { '@type': 'Organization', name: site.name, url: PROD + '/' } };
  pages.push({ path: from, title: `${ev.name} | Events at Wand & Whisk Café`, description: ev.description, body, theme: 'pink', image: `/img/${ev.image}-1400.webp`, jsonld: [ld, crumbLd([['/events/', 'Events'], [from, ev.name]])] });
}

// event-status archive
{
  const from = '/event-status/upcoming/';
  const body = `${titleBand(from, { theme: 'pink', h1: 'Upcoming', crumbs: [['/events/', 'Events']] })}
<section class="band band--white" data-theme="white"><div class="wrap narrow"><div class="event-list">${site.events.map((e) => eventCard(from, e, 'h2')).join('')}</div><div class="btn-row"><a class="btn btn--plum" href="${rel(from, '/events/')}">All Events</a></div></div></section>`;
  pages.push({ path: from, title: 'Upcoming Events | Wand & Whisk Café', description: 'Upcoming events at Wand & Whisk Café in Little Rock.', body, theme: 'pink', noindex: true });
}

// About
{
  const from = '/about-us/';
  const a = site.about;
  const person = (p) => `<article class="person reveal"><div class="mark"><img src="${rel(from, '/img/brand/crest-white-160.webp')}" width="160" height="160" alt=""></div><h3>${esc(p.name)}</h3>${p.paras.map((x) => `<p>${html(x)}</p>`).join('')}</article>`;
  const body = `${titleBand(from, { theme: 'pink', h1: 'About Us', cast: 'creamia' })}
<section class="band band--white" data-theme="white">
  <div class="wrap split">
    <div class="reveal"><h2>${esc(a.intro.h2)}</h2>${a.intro.paras.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
    <div class="art pop">${charImg(from, 'strawberry', '', '340px')}</div>
  </div>
</section>
<section class="band band--yellow" data-theme="yellow">
  <div class="wrap split flip">
    <div class="reveal"><h2>${esc(a.softServe.h2)}</h2>${a.softServe.paras.map((p) => `<p>${esc(p)}</p>`).join('')}<p class="closer">${esc(a.softServe.closer)}</p></div>
    <div class="art photo reveal"><img src="${rel(from, '/img/menu/creme-royale-960.webp')}" srcset="${rel(from, '/img/menu/creme-royale-480.webp')} 480w, ${rel(from, '/img/menu/creme-royale-960.webp')} 960w" sizes="340px" width="960" height="1280" alt="Creme Royale soft serve in a taiyaki cone" loading="lazy"></div>
  </div>
</section>
<section class="band band--pink" data-theme="pink">
  <div class="wrap split">
    <div class="reveal"><h2>${esc(a.guild.h2)}</h2>${a.guild.paras.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
    <div class="art pop">${charImg(from, 'matcha', '', '340px')}</div>
  </div>
</section>
<section class="band band--white" data-theme="white">
  <div class="wrap">
    <h2 class="center">${esc(a.founders.h2)}</h2>
    <div class="people" style="margin-top:28px">${a.founders.people.map(person).join('')}</div>
    <p class="people-after center" style="margin-inline:auto">${esc(a.founders.after)}</p>
  </div>
</section>
<section class="band band--pinksoft" data-theme="pinksoft">
  <div class="wrap">
    <h2 class="center">${esc(a.team.h2)}</h2>
    <div class="people" style="margin-top:28px">${a.team.people.map(person).join('')}</div>
    <div class="people-after center" style="margin-inline:auto"><h3>${esc(a.team.membersTitle)}</h3><p>${esc(a.team.members)}</p></div>
  </div>
</section>
<section class="band band--magenta" data-theme="magenta">
  <div class="wrap narrow center">
    <h2>${esc(a.promise.h2)}</h2>${a.promise.paras.map((p) => `<p>${esc(p)}</p>`).join('')}
    <div class="btn-row btn-row--center"><a class="btn" href="${rel(from, '/menu/')}">View Menu</a><a class="btn btn--white" href="${rel(from, '/contact-us/')}">Contact Us</a></div>
  </div>
</section>`;
  pages.push({ path: from, title: a.title, description: a.description, body, theme: 'pink', jsonld: [crumbLd([['/', 'Home'], ['/about-us/', 'About Us']])] });
}

// Blog index
{
  const from = '/blog/';
  const [first, ...rest] = posts;
  const body = `${titleBand(from, { theme: 'pink', h1: 'Blog', lede: 'New menu items, upcoming events, and notes from the Guild Master.', cast: 'matcha' })}
<section class="band band--pinksoft" data-theme="pinksoft">
  <div class="wrap">
    <a class="post-card post-feature" href="${rel(from, `/${first.slug}/`)}">
      <div class="pic"><img src="${rel(from, `/img/${first.lead}.webp`)}" width="1080" height="675" alt="${attr(first.leadAlt)}"></div>
      <div class="txt"><div class="meta">Latest · ${esc(first.category.name)}</div><h2>${esc(first.title)}</h2><p>${esc(first.description)}</p><div class="meta">${fmtDate(first.date)} · ${first.minutes} min read</div><span class="text-link">Read the post</span></div>
    </a>
    <div class="post-grid">${rest.map((p) => postCard(from, p, 'h2')).join('')}</div>
  </div>
</section>`;
  pages.push({ path: from, title: 'Blog | Wand & Whisk Café, Little Rock', description: 'New menu items, upcoming events, and behind-the-scenes notes from the Guild Master at Wand & Whisk Café in Little Rock.', body, theme: 'pink', jsonld: [crumbLd([['/', 'Home'], ['/blog/', 'Blog']])] });
}

// Posts
for (const p of posts) {
  const from = `/${p.slug}/`;
  const content = relHtml(from, read(`posts/${p.slug}.html`)).replace(/<img /g, '<img loading="lazy" decoding="async" ');
  const others = posts.filter((o) => o.slug !== p.slug);
  const body = `${titleBand(from, { theme: 'pink', h1: p.title, crumbs: [['/blog/', 'Blog'], [`/category/${p.category.slug}/`, p.category.name]], lede: `<span class="post-meta">By ${esc(p.author)} · ${fmtDate(p.date)} · ${p.minutes} min read</span>` })}
<section class="band band--white" data-theme="white">
  <article class="wrap article" id="article-top">
    <div class="lead-img"><img src="${rel(from, `/img/${p.lead}.webp`)}" width="1080" height="675" alt="${attr(p.leadAlt)}" fetchpriority="high"></div>
    <div class="prose">${content}</div>
    <p class="article-foot">Filed under <a href="${rel(from, `/category/${p.category.slug}/`)}">${esc(p.category.name)}</a>${p.tags.length ? ` · Tagged ${p.tags.map((t) => `<a href="${rel(from, `/tag/${t.slug}/`)}">${esc(t.name)}</a>`).join(', ')}` : ''}</p>
  </article>
</section>
<section class="band band--pinksoft" data-theme="pinksoft">
  <div class="wrap"><h2 class="center" style="margin-bottom:28px">More from the Blog</h2><div class="post-grid">${others.map((o) => postCard(from, o)).join('')}</div></div>
</section>`;
  const ld = { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.title, description: p.description, datePublished: p.date, image: `${PROD}/img/${p.lead}.webp`, mainEntityOfPage: PROD + from,
    author: p.author === 'admin' ? { '@type': 'Organization', name: site.name } : { '@type': 'Person', name: p.author === 'Chef Dylan' ? 'Dylan Hobby' : p.author },
    publisher: { '@type': 'Organization', name: site.name, logo: { '@type': 'ImageObject', url: PROD + '/img/brand/favicon-270.png' } } };
  pages.push({ path: from, title: `${p.title} | Wand & Whisk Café`, description: p.description, body, theme: 'pink', type: 'article', image: `/img/${p.lead}.webp`, jsonld: [ld, crumbLd([['/blog/', 'Blog'], [from, p.title]])] });
}

// Category + tag archives
const archives = [];
for (const p of posts) {
  archives.push({ kind: 'category', slug: p.category.slug, name: p.category.name, post: p });
  for (const t of p.tags) archives.push({ kind: 'tag', slug: t.slug, name: t.name, post: p });
}
const archiveMap = new Map();
for (const a of archives) {
  const key = `/${a.kind}/${a.slug}/`;
  if (!archiveMap.has(key)) archiveMap.set(key, { ...a, posts: [] });
  archiveMap.get(key).posts.push(a.post);
}
for (const [from, a] of archiveMap) {
  const body = `${titleBand(from, { theme: 'pink', h1: a.name, crumbs: [['/blog/', 'Blog']] })}
<section class="band band--pinksoft" data-theme="pinksoft"><div class="wrap"><div class="post-grid">${a.posts.map((p) => postCard(from, p, 'h2')).join('')}</div></div></section>`;
  pages.push({ path: from, title: `${a.name} | Wand & Whisk Café Blog`, description: `Posts about ${a.name} from Wand & Whisk Café in Little Rock.`, body, theme: 'pink', noindex: a.kind === 'tag' });
}

// Contact
{
  const from = '/contact-us/';
  const body = `${titleBand(from, { theme: 'pink', h1: 'Contact Us', cast: 'ube' })}
<section class="band band--white" data-theme="white">
  <div class="wrap contact-grid">
    <div class="form-card">
      <h2 style="font-size:clamp(1.6rem,2.6vw,2rem)">Send Us a Message</h2>
      <p class="req-note">Fields marked with an <span style="color:var(--magenta)">*</span> are required</p>
      <form data-contact novalidate>
        <div class="field"><label for="c-name">Name <span class="req">*</span></label><input id="c-name" name="name" autocomplete="name" required></div>
        <div class="field"><label for="c-email">Email <span class="req">*</span></label><input id="c-email" name="email" type="email" autocomplete="email" required></div>
        <div class="field"><label for="c-msg">Message <span class="req">*</span></label><textarea id="c-msg" name="message" required></textarea></div>
        <button class="btn btn--plum" type="submit">Submit</button>
        <p class="form-status" role="status" aria-live="polite"></p>
      </form>
    </div>
    <div class="visit-card" id="visit">
      <h2>Visit the Guild Hall</h2>
      <dl>
        <dt>Address</dt><dd>${esc(site.address.street)}<br>${esc(site.address.city)}, ${site.address.region} ${site.address.zip}</dd>
        <dt>Phone</dt><dd><a href="tel:${site.phoneHref}">${esc(site.phone)}</a></dd>
        <dt>Hours</dt><dd>${site.hours.map((h) => `${esc(h.days)}: ${esc(h.time)}`).join('<br>')}</dd>
      </dl>
      <div class="map-slot"><div><p style="margin-bottom:12px">We are in the Outlets of Little Rock, across from Otaku Takeout and Lucky Cat Arcade.</p><button class="btn btn--white" type="button" data-map="${attr(site.mapEmbed)}">Show the map</button></div></div>
    </div>
  </div>
</section>`;
  pages.push({ path: from, title: 'Contact Us | Wand & Whisk Café, Little Rock', description: `${site.address.street}, ${site.address.city}, ${site.address.region} ${site.address.zip}. ${site.phone}. ${site.hoursShort}.`, body, theme: 'pink', jsonld: [businessLd, crumbLd([['/', 'Home'], ['/contact-us/', 'Contact Us']])] });
}

// Coming soon (old placeholder URL)
pages.push({ path: '/coming-soon/', title: 'Coming soon | Wand & Whisk Café', description: 'Something Magical is Brewing! A Magical Dessert Atelier in Little Rock. A sweet escape from the ordinary.', noindex: true, bare: true,
  body: `<section class="solo"><div><h1>Something Magical is Brewing!</h1><img src="../img/brand/logo-white-960.webp" width="960" height="550" alt="Wand &amp; Whisk Café"><p>A Magical Dessert Atelier in Little Rock.</p><p>A sweet escape from the ordinary.</p><div class="btn-row btn-row--center"><a class="btn" href="../">Visit the Café Site</a></div></div></section>` });

/* ---------- write ---------- */
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const dir of ['css', 'js', 'fonts', 'img']) fs.cpSync(path.join(SRC, dir), path.join(OUT, dir), { recursive: true });
for (const p of pages) {
  const file = path.join(OUT, p.path, 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, layout(p));
}
// 404 page uses root-absolute-safe relative links via a <base>-free approach: GitHub Pages serves it at any depth,
// so it links with absolute paths built from the deploy base.
const BASE = PREVIEW ? '/wand-whisk-cafe/' : '/';
fs.writeFileSync(path.join(OUT, '404.html'), layout({ path: '/', title: 'Page not found | Wand & Whisk Café', description: 'This page wandered off.', noindex: true, bare: true,
  body: `<section class="solo"><div><h1>This page wandered off</h1><p>Head back to the café.</p><div class="btn-row btn-row--center"><a class="btn" href="${BASE}">Home</a><a class="btn btn--white" href="${BASE}menu/">Menu</a></div></div></section>` })
  .replace(/(href|src)="\.\/(?!\/)/g, `$1="${BASE}`));

const indexable = pages.filter((p) => !p.noindex);
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexable.map((p) => `  <url><loc>${PROD}${p.path}</loc></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(OUT, 'robots.txt'), PREVIEW ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\n\nSitemap: ${PROD}/sitemap.xml\n`);
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
console.log(`Built ${pages.length} pages + 404 into docs/ (${PREVIEW ? 'preview, noindex' : 'production'})`);
