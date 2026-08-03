# SK News

![SK News](assets/img/news-banner.jpg)

Kosher-filtered news and SMS text alerts for the Yeshiva community. SK News
delivers breaking headlines straight to your phone by text, backed by a live web
feed, topic/GroupMe chats, and a curated directory of community sites.

**Live:** [sknews.pages.dev](https://sknews.pages.dev)

## About

SK News is a text-based news service for the Yeshiva community, delivering
reliable, kosher-filtered news, community information, and discussions directly
to users' phones. The website is the hub for all SK News services: join news and
community chats via SMS or GroupMe, browse the live feed of breaking news, and
explore related community sites. Content is driven by a Supabase backend and
managed through two admin panels.

## Features

- **Live, database-driven feed** — real-time news from Supabase, with search,
  date and poster filters, a featured/pinned article, an article reader modal,
  and a sponsored-ad slot.
- **Dual admin panels** (not linked publicly):
  - `admin.html` — manage the news feed (add / edit / pin articles).
  - `admin_new.html` — manage chats, sites, and editable copy on Join / Terms.
- **Community pages** — a dynamic Chats directory and a Sites directory.
- **SEO** — canonical URLs, `sitemap.xml`, `robots.txt`, and an IndexNow key.

## Tech stack

- **Frontend:** HTML5, [Tailwind CSS](https://tailwindcss.com) (via CDN), vanilla JS (ES modules)
- **Type:** Fraunces (display) + Libre Franklin (body)
- **Backend:** [Supabase](https://supabase.com) (Postgres + auth for admin + realtime reads)
- **Hosting:** [Cloudflare Pages](https://pages.cloudflare.com) — served from the repo root, no build step

## Structure

```
/                     HTML pages (served at the site root)
├─ index.html  feed.html  chats.html  news.html  sites.html
├─ join.html  about.html  advertise.html  contact.html  terms.html
├─ headlines.html  not-found.html
├─ admin.html  admin_new.html     Internal admin tools
├─ assets/
│   ├─ img/           Images and logos
│   └─ js/            feed.js, chats.js, supabase-client.js, logs.js, admin.js, …
├─ docs/              Project documentation
├─ src/  tailwind.config.js   Optional Tailwind build inputs (site uses the CDN)
├─ _redirects  robots.txt  sitemap.xml  favicon.ico
└─ (site-verification + IndexNow key files)
```

## Database (Supabase)

Public reads use the anon key in `assets/js/supabase-client.js`. Key tables:

- `feed` — live feed items (title, content, sender_name, created_at, is_pinned, pinned_until)
- `poster_config` — ordered posters for the feed filter
- `sponsored_ad` — the feed sidebar ad
- `chats` — community chat directory (names, descriptions, join links)
- `sites` — the Sites directory
- `news_admin` — key/value store for editable copy (Join, Terms)
- `contacts` — contact-form submissions

## Local development

No build step — Tailwind loads from the CDN. Serve the folder to avoid CORS
issues with the ES-module scripts:

```sh
npx serve .      # or: python -m http.server
```

To run your own instance, create a Supabase project and set your Project URL and
anon key in `assets/js/supabase-client.js`, then create the tables above and an
admin user for the panels.

## Deploy

Pushing to `main` triggers a Cloudflare Pages deployment; the output directory is
the repo root.

## Contact

Shalom Karr — [info.skjmedia@gmail.com](mailto:info.skjmedia@gmail.com) ·
[sknews.pages.dev](https://sknews.pages.dev)
