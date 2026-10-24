# Wand & Whisk Café website (static copy + Jesse's additions)

A static copy of [wandandwhiskcafe.com](https://wandandwhiskcafe.com), the WordPress/Divi site James Alborough built, so it can move off WordPress onto our own hosting. The look is James's site, unchanged. On top of it sit a few graphic animations Jesse liked on his reference sites.

- **Preview:** https://odyssey-jotun.github.io/wand-whisk-cafe/ (noindex, so it does not compete with the live site in search)

## What was added

| Addition | From | Where |
|---|---|---|
| Wavy "Menu" title that moves as you scroll | Little Goat Chicago menu page | /menu/ |
| Menu tracker's active category becomes a white bubble with two trailing dots, sliding as you scroll | Kirby Café | Home and menu |
| Arched tops on menu cards and menu-item photos | Kirby Café shop cards | Home, menu, item pages |
| Double-ring circle frames around the three character cards | Pokémon Café menu | Home |
| Thin ornament line (diamond ends, the café's star) that draws in under centered titles | FF Eorzea Café dividers, Pokémon Café line animation | Every page |
| Blog index as a white rounded "news" panel with category tags | Kirby Café Information list | /blog/ |
| Cards fade up as they come into view | Pokémon Café | Menu cards, home cards, FAQ, blog |
| Menu cards and character cards bounce on hover | Kirby Café | Home and menu |
| Real rounded font with real weights (Nunito in place of the hairline-only Museo Sans Rounded), Magic Story on every page title, pill buttons, white FAQ bubbles, rounded hero bottom and footer top, softer footer plum | Marc's requests | Every page |
| Sign-up box slides in after scrolling, with no dark overlay over the page | Marc's request to James (Google's interstitial rules) | Every page |

Already on James's site and kept as is: the floating Strawberry and twinkling stars in the hero, the header that turns magenta on scroll, and the side nav that tracks the menu category in view.

## What had to change to work without WordPress

- **Load More** on the taiyaki grid: the extra items are in the page, revealed on click (the plugin used to fetch them from WordPress).
- **Contact form:** same fields and look as the Ninja Form. With no endpoint set it opens the visitor's email app addressed to wandandwhiskcafe@gmail.com. Set `CONTACT_ENDPOINT` in `scripts/build.mjs` (a Cloudflare Worker or Formspree) before go-live.
- **Search** icon is hidden (search needs WordPress).

## How it is built

- `mirror/`: snapshot of every live page and asset, exactly as WordPress serves them. Refresh with `node scripts/mirror.mjs` while the WordPress site is still up.
- `enhance/`: the additions (`ww-enhance.css`, `ww-enhance.js`, character images, `menu-items.json` for Load More, the static contact form markup).
- `node scripts/build.mjs` writes `docs/` (rewrites links so the copy works from any host, swaps the WordPress-only pieces, adds `enhance/`). `PREVIEW=0 node scripts/build.mjs` makes the production build (indexable, robots allow, sitemap).

To change content after the move, edit the page in `mirror/` and rebuild.
