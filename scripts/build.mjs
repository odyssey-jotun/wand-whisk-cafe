// Turns the live-site snapshot in mirror/ into the static site in docs/.
//   node scripts/build.mjs            preview build (noindex, robots disallow)
//   PREVIEW=0 node scripts/build.mjs  production build for wandandwhiskcafe.com
//
// The pages are James's WordPress output, unchanged except for:
//   - links and asset URLs rewritten so the copy works from any host
//   - WordPress-only pieces swapped for static ones (Load More, contact form, sign-up pop-up)
//   - enhance/ww-enhance.css + .js added on every page (Jesse's reference-site animations)

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const MIRROR = path.join(ROOT, 'mirror');
const ENH = path.join(ROOT, 'enhance');
const OUT = path.join(ROOT, 'docs');
const PREVIEW = process.env.PREVIEW !== '0';
const PROD = 'https://wandandwhiskcafe.com';
const CONTACT_ENDPOINT = ''; // set to a form endpoint before go-live; empty = open the visitor's email app

const menuItems = JSON.parse(fs.readFileSync(path.join(ENH, 'menu-items.json'), 'utf8'));
const nfForm = fs.readFileSync(path.join(ENH, 'contact-form.html'), 'utf8');
const ver = (f) => crypto.createHash('md5').update(fs.readFileSync(path.join(ENH, f))).digest('hex').slice(0, 8);

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]));

function prefixFor(fileRel) { // fileRel like "menu/index.html" or "wp-content/x/y.css"
  const depth = fileRel.split('/').length - 1;
  return depth ? '../'.repeat(depth) : './';
}

// Rewrite same-site absolute URLs (plain, protocol-relative and JSON-escaped) to relative ones.
function rewriteUrls(text, prefix) {
  const esc = prefix.replace(/\//g, '\\/');
  return text
    .replace(/(?:https?:)?\\\/\\\/(?:www\.)?wandandwhiskcafe\.com(?:\\\/)?/g, esc)
    .replace(/(?:https?:)?\/\/(?:www\.)?wandandwhiskcafe\.com(?:\/(?!\/)|(?=["'\s<)>,]))/g, prefix)
    .replace(/(\s(?:href|src|action)=["'])\/(?!\/)/g, `$1${prefix}`)
    .replace(/url\(\s*(['"]?)\/(?!\/)/g, `url($1${prefix}`);
}

// Keep SEO tags pointing at the real domain.
function protect(html) {
  const kept = [];
  const out = html.replace(/<link[^>]+rel=["']canonical["'][^>]*>|<meta[^>]+(?:property|name)=["'](?:og:|twitter:|article:)[^>]*>|<script[^>]+application\/ld\+json[^>]*>[\s\S]*?<\/script>/gi, (m) => { kept.push(m); return `\u0000KEEP${kept.length - 1}\u0000`; });
  return { out, restore: (s) => s.replace(/\u0000KEEP(\d+)\u0000/g, (_, i) => kept[+i]) };
}

const stripOldFont = (t) => t.replace(/@font-face\s*\{[^}]*font-family:\s*["']?Museo Sans Rounded["']?[^}]*\}/g, '');

function removeWpOnly(html) {
  return stripOldFont(html)
    .replace(/<link[^>]+rel=["'](?:https:\/\/api\.w\.org\/|EditURI|shortlink|pingback)["'][^>]*>\s*/gi, '')
    .replace(/<link[^>]+type=["'](?:application\/json\+oembed|text\/xml\+oembed|application\/rss\+xml)["'][^>]*>\s*/gi, '')
    .replace(/<script[^>]+id=["']wppopups-js(?:-extra)?["'][^>]*>[\s\S]*?<\/script>\s*/gi, '');
}

// Find the end of the element that starts at index i (balanced on its tag name).
function elementEnd(html, i) {
  const tag = html.slice(i + 1).match(/^[a-zA-Z0-9]+/)[0];
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'g');
  re.lastIndex = i;
  let depth = 0, m;
  while ((m = re.exec(html))) { depth += m[1] ? -1 : 1; if (depth === 0) return re.lastIndex; }
  return html.length;
}

// Static "Load More": add the items the plugin would have fetched, hidden until clicked.
function addMenuItems(html) {
  let out = '', pos = 0;
  const re = /<div class="dp-dfg-container[^"]*"/g;
  let m;
  while ((m = re.exec(html))) {
    const start = m.index, end = elementEnd(html, start);
    let block = html.slice(start, end);
    if (block.includes('dp-dfg-load-more-button')) {
      const cat = (block.match(/menu-category-([a-z0-9-]+)/) || [])[1];
      const list = menuItems[cat] || [];
      const present = new Set([...block.matchAll(/\/menu-item\/([a-z0-9-]+)\//g)].map((x) => x[1]));
      const tStart = block.indexOf('<article'), tEnd = block.indexOf('</article>', tStart) + '</article>'.length;
      const tpl = block.slice(tStart, tEnd);
      const oldSlug = tpl.match(/\/menu-item\/([a-z0-9-]+)\//)[1];
      const oldName = tpl.match(/<h2 class="entry-title"><a [^>]*>([^<]*)<\/a>/)[1];
      const extra = list.filter((it) => !present.has(it.slug)).map((it) => tpl
        .replace(/<article id="post-\d+" class="/, '<article class="ww-hidden-item ')
        .replace(/post-\d+ /, '')
        .replaceAll(`/menu-item/${oldSlug}/`, `/menu-item/${it.slug}/`)
        .replace(/<img([^>]*?) src="[^"]*"/, `<img$1 src="${PROD}${it.img}"`)
        .replace(/\s(?:srcset|sizes)="[^"]*"/g, '')
        .replace(/alt="[^"]*"/, `alt="${it.name.replace(/&/g, '&amp;')}"`)
        .replace(`>${oldName}</a>`, `>${it.name.replace(/&/g, '&amp;')}</a>`)
        .replace(/<div class="dp-dfg-content entry-summary"><p>[\s\S]*?<\/p>/, `<div class="dp-dfg-content entry-summary"><p>${it.description.replace(/&/g, '&amp;')}</p>`)
      ).join('');
      const itemsEnd = block.lastIndexOf('</article>') + '</article>'.length;
      block = block.slice(0, itemsEnd) + extra + block.slice(itemsEnd);
    }
    out += html.slice(pos, start) + block;
    pos = end;
    re.lastIndex = end;
  }
  return out + html.slice(pos);
}

// Little Goat style wavy title (menu page): replaces how the H1 "Menu" is drawn; the text stays for readers.
function waveTitle(html) {
  return html.replace(/<h1 class="([^"]*)">Menu<\/h1>/, (m, cls) => {
    const text = Array.from({ length: 16 }, () => 'Menu  ·  ').join('');
    return `<h1 class="${cls} ww-wave-title"><span class="screen-reader-text">Menu</span><svg class="ww-wave" viewBox="0 0 1440 290" aria-hidden="true" focusable="false">
<defs><path id="ww-wave1" d="M-1600 120 C -1420 20, -1240 20, -1060 120 S -700 220, -520 120 S -160 20, 20 120 S 380 220, 560 120 S 920 20, 1100 120 S 1460 220, 1640 120 S 2000 20, 2180 120 S 2540 220, 2720 120"/>
<path id="ww-wave2" d="M-1600 220 C -1420 120, -1240 120, -1060 220 S -700 320, -520 220 S -160 120, 20 220 S 380 320, 560 220 S 920 120, 1100 220 S 1460 320, 1640 220 S 2000 120, 2180 220 S 2540 320, 2720 220"/></defs>
<g class="row1"><text><textPath href="#ww-wave1" data-unit="390" data-dir="left" startOffset="0">${text}</textPath></text></g>
<g class="row2"><text><textPath href="#ww-wave2" data-unit="390" data-dir="right" startOffset="-390">${text}</textPath></text></g></svg></h1>`;
  });
}

// Mark the last content section so the footer's rounded top can overlap its padding.
function markLastSection(html) {
  const fIdx = html.indexOf('<div class="et_pb_section_0_tb_footer');
  if (fIdx < 0) return html;
  const main = html.indexOf('id="main-content"');
  const footerStart = html.lastIndexOf('<footer', fIdx);
  const lastSec = html.lastIndexOf('<div class="et_pb_section_', footerStart);
  if (lastSec > main && main > 0) return html.slice(0, lastSec) + '<div class="ww-last-section ' + html.slice(lastSec + '<div class="'.length);
  return html.replace('id="main-content"', 'id="main-content" class="ww-last-plain"');
}

// About page hero, in the home hero's style: title, a line from the About copy, and three of the
// guild girls floating with James's own float and twinkle animations. Replaces the old title module.
function aboutHero(html) {
  const t = html.indexOf('<div class="et_pb_post_title_0');
  if (t >= 0) html = html.slice(0, t) + html.slice(elementEnd(html, t));
  const sec = html.indexOf('<div class="et_pb_section_0 et_pb_section');
  if (sec < 0) return html;
  const g = (n, w, h, cls) => `<img class="ww-guild-girl ${cls}" src="${PROD}/ww/img/guild/${n}-400.webp" srcset="${PROD}/ww/img/guild/${n}-400.webp 400w, ${PROD}/ww/img/guild/${n}-800.webp 800w" sizes="(max-width: 767px) 120px, 300px" width="${w}" height="${h}" alt="">`;
  const star = (cls) => `<img class="ww-star ${cls}" src="${PROD}/wp-content/uploads/2026/06/WWStarWhite.svg" alt="" width="27" height="27">`;
  const hero = `<div class="ww-about-hero"><div class="ww-about-hero-inner">
<h1 class="entry-title">About Us</h1>
<p class="ww-hero-sub">There is always room for one more adventurer at the guild.</p>
<div class="ww-guild" aria-hidden="true">${star('s1')}${star('s2')}${star('s3')}${star('s4')}${star('s5')}${g('matcha', 400, 320, 'g1')}${g('strawberry', 400, 367, 'g2')}${g('ube', 400, 320, 'g3')}</div>
</div></div>`;
  return html.slice(0, sec) + hero + html.slice(sec);
}

// About page: put Jesse's and Gwen's photos (from the Park West Pharmacy team page) beside their bios.
function founderPhotos(html) {
  const people = [
    ['Dr. Jesse Pruitt, PharmD', 'jesse', 'Dr. Jesse Pruitt, co-founder of Wand &amp; Whisk Café'],
    ['Dr. Gwendolyn Herzig, PharmD', 'gwen', 'Dr. Gwendolyn Herzig, co-founder of Wand &amp; Whisk Café'],
  ];
  for (const [name, img, alt] of people) {
    const h = `<h3><b>${name}</b></h3>`;
    const i = html.indexOf(h);
    if (i < 0) continue;
    let end = i + h.length;
    for (let k = 0; k < 2; k++) end = html.indexOf('</p>', end) + 4; // the two paragraphs about this person
    const src = `${PROD}/ww/img/founders/${img}`;
    html = html.slice(0, i) + `<div class="ww-founder"><figure class="ww-founder-photo"><img src="${src}-320.webp" srcset="${src}-320.webp 320w, ${src}-640.webp 640w" sizes="200px" width="320" height="320" alt="${alt}" loading="lazy" decoding="async"></figure><div class="ww-founder-text">` + html.slice(i, end) + '</div></div>' + html.slice(end);
  }
  return html;
}

// About page: break the long text into alternating rows of text and art (the girls in arched
// windows, trios of arched menu photos), switching sides each section.
function aboutRows(html) {
  const img = (n, w, h, alt, cls = '') => `<img class="${cls}" src="${PROD}/ww/img/${n}" width="${w}" height="${h}" alt="${alt}" loading="lazy" decoding="async">`;
  const star = (c) => `<img class="ww-star ${c}" src="${PROD}/wp-content/uploads/2026/06/WWStarWhite.svg" alt="" width="27" height="27">`;
  const windowArt = (name, srcset, w, h, extra = '') => `<div class="ww-window ww-window--${name}" aria-hidden="true">${star('s1')}${star('s2')}${star('s3')}<img class="ww-window-girl" src="${PROD}/ww/img/${srcset[0]}" srcset="${srcset.map((f, i) => `${PROD}/ww/img/${f} ${[1, 2][i] === 1 ? w : w * 2}w`).join(', ')}" sizes="(max-width: 767px) 280px, 380px" width="${w}" height="${h}" alt="" loading="lazy" decoding="async">${extra}</div>`;
  const trio = (items) => `<div class="ww-trio">${items.map(([f, alt], i) => `<div class="ww-trio-arch a${i + 1}"><img src="${PROD}/ww/img/about/${f}-280.webp" srcset="${PROD}/ww/img/about/${f}-280.webp 280w, ${PROD}/ww/img/about/${f}-560.webp 560w" sizes="(max-width: 767px) 30vw, 150px" width="280" height="${f.startsWith('float') ? 420 : 374}" alt="${alt}" loading="lazy" decoding="async"></div>`).join('')}</div>`;
  const art = {
    'A Little Magic for Little Rock': ['right', windowArt('creamia', ['about/creamia-600.webp', 'about/creamia-1200.webp'], 600, 383)],
    'Luxury Soft Serve': ['left', trio([['taiyaki-strawberry', 'Strawberry taiyaki soft serve'], ['taiyaki-matcha', 'Matcha taiyaki soft serve'], ['taiyaki-ube', 'Ube taiyaki soft serve']])],
    'Welcome to the Dessert Guild': ['right', windowArt('ube', ['guild/ube-400.webp', 'guild/ube-800.webp'], 400, 320)],
    'Meet the Guild': ['left', trio([['float-stamina', 'Stamina Potion Float'], ['float-mana', 'Mana Potion Float'], ['float-health', 'Health Potion Float']])],
    'Our Promise': ['right', windowArt('matcha', ['guild/matcha-400.webp', 'guild/matcha-800.webp'], 400, 320)],
  };
  const starts = [...html.matchAll(/<h2><b>/g)].map((m) => m.index);
  if (!starts.length) return html;
  const last = starts[starts.length - 1];
  const textEnd = html.indexOf('</div></div>', last);
  const bounds = starts.map((st, i) => [st, i + 1 < starts.length ? starts[i + 1] : textEnd]);
  let out = html.slice(0, starts[0]);
  for (const [st, en] of bounds) {
    const block = html.slice(st, en);
    const key = Object.keys(art).find((k) => block.slice(0, 200).includes(k));
    if (!key) { out += block; continue; }
    const [side, figure] = art[key];
    out += `<div class="ww-about-row ww-art-${side}"><div class="ww-about-text">${block}</div><figure class="ww-about-art">${figure}</figure></div>`;
  }
  return out + html.slice(textEnd);
}

function contactForm(html) {
  const i = html.indexOf('<div id="nf-form-1-cont"');
  if (i < 0) return html;
  const end = elementEnd(html, i);
  html = html.slice(0, i) + nfForm.replace('<form>', '<form data-ww-contact novalidate>') + html.slice(end);
  // drop Ninja Forms' client-side renderer and its templates
  return html
    .replace(/<script>var formDisplay=1;[\s\S]*?<\/script>/, '')
    .replace(/<script[^>]+id=["']tmpl-nf[\s\S]*?<\/script>\s*/g, '')
    .replace(/<script[^>]+src=["'][^"']*ninja-forms[^"']*["'][^>]*><\/script>\s*/g, '')
    .replace(/<script[^>]+id=["']nf-[^"']*["'][^>]*>[\s\S]*?<\/script>\s*/g, '');
}

/* Crepe photos reframed so the gap above the crepe (or its paper cone point) to the card's arch matches the
   gap beside it, the same rule Jesse set for the taiyaki cards. Built from James's uploads into
   enhance/img/crepes/<name>-framed.jpg; the backdrop filled in around them is the photo's own. */
const FRAMED = ['Banana-Pudding-Crepe-Website.jpg', 'Classic-Japanese-e1784666714454.png', 'Strawberries-and-Cream-e1784664928864.jpg',
  'Banana-Nutella-e1784666806374.png', 'Brulee-Crepe-Image-Website.jpg', 'choc-crepe.jpg', 'PBD-Crepe.jpg', 'Strawberry-Wand-e1784665078738.jpg'];
function framedPhotos(html) {
  return html.replace(/<img\b[^>]*>/g, (tag) => {
    const m = tag.match(/\ssrc="[^"]*\/wp-content\/uploads\/\d{4}\/\d{2}\/([^"\/]+)"/);
    if (!m || !FRAMED.includes(m[1])) return tag;
    const framed = `${PROD}/ww/img/crepes/${m[1].replace(/\.(jpg|png)$/i, '')}-framed.jpg`;
    return tag.replace(m[0], ` src="${framed}"`).replace(/\s(?:srcset|sizes)="[^"]*"/g, '');
  });
}

function processHtml(html, rel) {
  const prefix = prefixFor(rel);
  html = removeWpOnly(html);
  html = addMenuItems(html);
  html = framedPhotos(html);
  if (rel === 'menu/index.html') html = waveTitle(html);
  if (rel === 'contact-us/index.html') html = contactForm(html);
  if (rel === 'about-us/index.html') html = aboutRows(founderPhotos(aboutHero(html)));
  if (PREVIEW) html = html.replace(/<meta name="robots"[^>]*>/i, '<meta name="robots" content="noindex, nofollow">');
  const { out, restore } = protect(html);
  html = restore(rewriteUrls(out, prefix));
  html = markLastSection(html);
  const cfg = JSON.stringify({ contactEndpoint: CONTACT_ENDPOINT });
  html = html.replace('</head>', `<link rel="stylesheet" href="${prefix}ww/ww-enhance.css?v=${ver('ww-enhance.css')}">\n</head>`);
  html = html.replace(/<\/body>(?![\s\S]*<\/body>)/, `<script>window.WW=${cfg};</script>\n<script src="${prefix}ww/ww-enhance.js?v=${ver('ww-enhance.js')}" defer></script>\n</body>`);
  return html;
}

/* ---------- build ---------- */
fs.rmSync(OUT, { recursive: true, force: true });
const pages = [];
for (const file of walk(MIRROR)) {
  const rel = path.relative(MIRROR, file).split(path.sep).join('/');
  const dest = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (rel.endsWith('.html')) {
    fs.writeFileSync(dest, processHtml(fs.readFileSync(file, 'utf8'), rel));
    pages.push(rel);
  } else if (/\.css$/i.test(rel)) {
    fs.writeFileSync(dest, stripOldFont(rewriteUrls(fs.readFileSync(file, 'utf8'), prefixFor(rel))));
  } else {
    fs.copyFileSync(file, dest);
  }
}
fs.mkdirSync(path.join(OUT, 'ww'), { recursive: true });
for (const f of ['ww-enhance.css', 'ww-enhance.js']) fs.copyFileSync(path.join(ENH, f), path.join(OUT, 'ww', f));
fs.cpSync(path.join(ENH, 'img'), path.join(OUT, 'ww/img'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'ww/fonts'), { recursive: true });
for (const f of fs.readdirSync(path.join(ENH, 'fonts'))) fs.copyFileSync(path.join(ENH, 'fonts', f), path.join(OUT, 'ww/fonts', f));

const urls = pages.filter((p) => !p.startsWith('coming-soon')).map((p) => `${PROD}/${p.replace(/index\.html$/, '')}`);
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(OUT, 'robots.txt'), PREVIEW ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\n\nSitemap: ${PROD}/sitemap.xml\n`);
const base = PREVIEW ? '/wand-whisk-cafe/' : '/';
fs.writeFileSync(path.join(OUT, '404.html'), `<!doctype html><meta charset="utf-8"><title>Page not found | Wand &amp; Whisk Cafe</title><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url=${base}"><a href="${base}">Back to Wand &amp; Whisk Café</a>\n`);
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
console.log(`Built ${pages.length} pages into docs/ (${PREVIEW ? 'preview, noindex' : 'production'})`);
