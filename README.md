# Wand & Whisk Café website (redesign)

A static rebuild of [wandandwhiskcafe.com](https://wandandwhiskcafe.com), the WordPress/Divi site James Alborough built, with the design changes Jesse Pruitt asked for. Every page, URL, menu item, blog post and line of copy from the live site is carried over; the look and layout are new.

- **Preview:** https://odyssey-jotun.github.io/wand-whisk-cafe/ (noindex, so it does not compete with the live site in search)
- **Live site today:** still the WordPress build on James's hosting

## What changed, and where it came from

| Request | Source | Where it shows up |
|---|---|---|
| Floating header that changes color | Jesse's Kirby Café Loom | Header pill turns plum over yellow and magenta sections, magenta over pink and white |
| Seasonal landing section | Jesse's Kirby Café Loom | Hero character swaps by season (`season.heroCharacter` in `src/data/site.json`); Ube the witch for autumn |
| Hard color breaks, clear contrast | Jesse's Kirby Café Loom | Solid brand-color bands (pink 176 C, Yellow C, magenta 681 C, plum) instead of gradients |
| Storybook font for big headings, clean font for text | Jesse's Loom; Marc to James, Jul 28 ("Story... so long as it isn't too heavy") | Magic Story for H1/H2, Nunito for everything else |
| Hero tagline the same size as the other H2s | Jesse via Marc, Jul 28 | "A Magical Dessert Atelier in Little Rock." uses the H2 size |
| Menu first, then events, then blog, simple footer | Jesse's Loom | Home page order: hero, menu, events, café intro, Join the Guild, blog, FAQ |
| Standard menu cards, about 50/50, limited grid with More | Jesse's Loom | 3 items per category, "+ More" reveals the rest; on phones the photo and text sit side by side |
| Side bubble that tracks the section and jumps to it | Jesse's Loom (Kirby) | Sticky category tracker beside the menu; a swipeable strip on phones |
| Mana blue, Health red, Stamina green | Marc's Loom 2 | Potion cards carry a matching colored shadow and dot |
| Center the text on buttons; rounded edges; no bolding mess | Marc to James, Jul 29; Marc's Loom 2 | Every button is centered; cards and photos are rounded |
| Email pop-up replaced by a small banner (Google interstitial rules) | Marc to James, Jul 30 | Small bottom banner after scrolling, dismissible for 30 days, hides while a full sign-up form is on screen |
| FAQ for SEO | Marc to James, Jul 15 | FAQ section on the home page with FAQPage schema |
| Event policy and pricing in the events area, FAQ treatment | Dylan, Aug 27; James, Aug 31 | Dylan's guide is real text now (it was a single image): accordion on home, full guide on /events/ |
| Blog laid out like the Odyssey blog page | Marc to James, Jul 29 | /blog/ has a featured latest post and a card grid |
| Kirby Café, Pokémon Café, FF Eorzea Café, Little Goat references | Jesse's brief | Scalloped edges and peeking characters (Kirby), sticker buttons and the wavy scrolling "Menu" title (Little Goat), framed photo cards (Pokémon/Eorzea) |
| Calendar or equivalent for events | Jesse's brief | Date-tile event cards split into Upcoming and Past; a card flips to "Past event" on its own after its date |
| People photo in the hero | Marc's standing rule | Stand-in stock photo (Unsplash `udhs4KjVKgE`) until we have a real one from the café |

## Editing content

Everything lives in `src/`:

- `src/data/menu.json`: categories and items. Add an item, then add its photo as `src/img/menu/<slug>-480.webp` and `-960.webp`. Items with `"potion": "mana" | "health" | "stamina"` take the potion color.
- `src/data/site.json`: hours, address, phone, home page copy, FAQ, events, Dylan's bookings guide, About page copy, and the season.
- `src/data/posts.json` plus `src/posts/<slug>.html`: blog posts. The HTML is the post body; the JSON holds the title, date, author, category and lead image.
- `src/css/site.css`, `src/js/site.js`: design and behavior. No frameworks, no libraries.

Then rebuild:

```sh
node scripts/build.mjs            # preview build (noindex) into docs/
PREVIEW=0 node scripts/build.mjs  # production build for wandandwhiskcafe.com
```

`docs/` is generated; commit it, since GitHub Pages serves it.

## Before this replaces the live site

1. **Contact form:** the WordPress form goes away with WordPress. Set `contactFormEndpoint` in `site.json` to a form endpoint (a Cloudflare Worker or Formspree). Until then the form opens the visitor's email app addressed to wandandwhiskcafe@gmail.com.
2. **Production build:** run `PREVIEW=0 node scripts/build.mjs` so pages are indexable and `robots.txt` allows crawling.
3. **Hero photo:** swap the stock photo for a real photo of guests in the café when one exists.
4. **URLs:** every live URL is kept (pages, posts, `/menu-item/...`, `/menu-category/...`, `/category/...`, `/tag/...`, `/event/test-event/`), so no redirects are needed.

## Assets

- Fonts: Magic Story (the brand display face from the brand guidelines, the same file the live site serves) and Nunito (Google Fonts, OFL), self-hosted in `src/fonts/`.
- Menu photos, character art, logos and blog images come from the live site's media library; Dylan's printable bookings guide is in `src/img/event/`.
