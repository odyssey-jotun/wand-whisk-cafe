// Snapshot the live WordPress site (wandandwhiskcafe.com) into mirror/ as static files.
// Every page's server HTML plus every same-site asset it references (CSS, JS, fonts, images,
// including url() inside CSS). URLs are left as on the live site; scripts/build.mjs rewrites them.
//   node scripts/mirror.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'mirror');
const ORIGIN = 'https://wandandwhiskcafe.com';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

async function get(url) {
  for (let i = 0; i < 3; i++) {
    try { const r = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' }); return r; }
    catch (e) { if (i === 2) throw e; await new Promise((r) => setTimeout(r, 800)); }
  }
}
const localPath = (u) => {
  const p = decodeURIComponent(new URL(u).pathname);
  return path.join(OUT, p.endsWith('/') ? p + 'index.html' : p);
};

// 1. page list from the sitemaps
const pages = new Set([ORIGIN + '/']);
const idx = await (await get(ORIGIN + '/sitemap.xml')).text();
for (const sm of [...idx.matchAll(/<loc><!\[CDATA\[([^\]]+)\]\]><\/loc>/g)].map((m) => m[1])) {
  const xml = await (await get(sm)).text();
  for (const m of xml.matchAll(/<loc><!\[CDATA\[([^\]]+)\]\]><\/loc>/g)) pages.add(m[1]);
}
console.log(pages.size, 'pages');

// 2. fetch pages, collect same-site assets
const assets = new Set();
const sameSite = (u) => /^(https?:)?\/\/(www\.)?wandandwhiskcafe\.com\//.test(u);
const norm = (u) => (u.startsWith('//') ? 'https:' + u : u).replace('://www.', '://').replace(/&#038;|&amp;/g, '&').replace(/\\\//g, '/');
function collect(text) {
  const re = /(?:https?:)?(?:\\\/\\\/|\/\/)(?:www\.)?wandandwhiskcafe\.com(?:\\\/|\/)[^"'\s)<>,]*/g;
  for (const m of text.matchAll(re)) {
    const u = norm(m[0]).split('#')[0];
    const p = new URL(u).pathname;
    if (/\.(css|js|woff2?|ttf|otf|eot|svg|png|jpe?g|gif|webp|ico|pdf|mp4)$/i.test(p)) assets.add(u.split('?')[0]);
  }
}
for (const url of pages) {
  const html = await (await get(url)).text();
  const file = localPath(url);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  collect(html);
}

// 3. download assets; scan CSS for url() and @import (relative or absolute)
const done = new Set();
const queue = [...assets];
while (queue.length) {
  const u = queue.shift();
  if (done.has(u)) continue;
  done.add(u);
  const r = await get(u);
  if (!r.ok) { console.log('skip', r.status, u); continue; }
  const buf = Buffer.from(await r.arrayBuffer());
  const file = localPath(u);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
  if (/\.css$/i.test(u)) {
    const css = buf.toString('utf8');
    for (const m of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)|@import\s+['"]([^'"]+)['"]/g)) {
      const ref = (m[1] || m[2]).trim();
      if (/^(data:|#)/.test(ref)) continue;
      let abs; try { abs = new URL(ref.startsWith('//') ? 'https:' + ref : ref, u).href; } catch { continue; }
      if (!sameSite(abs)) continue;
      abs = norm(abs).split('#')[0].split('?')[0];
      if (!done.has(abs)) queue.push(abs);
    }
  }
}
console.log(done.size, 'assets');
