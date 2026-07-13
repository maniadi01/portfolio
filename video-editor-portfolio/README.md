# Alex Rivera — Video Editor Portfolio

A dark, cinematic portfolio site with a real database behind it. Add a
video from an admin dashboard, paste a YouTube or Vimeo link, and it
appears on your site instantly — filterable, searchable by category,
playable in a lightbox. No build step, no framework, nothing to
compile. Everything runs on free tiers.

**How it works, in one paragraph:** your actual video files live on
YouTube or Vimeo (free, unlimited, and they handle all the streaming).
Supabase — a free hosted Postgres database — stores only the lightweight
stuff: titles, categories, the video links themselves, and messages from
your contact form. That split is why this stays free no matter how many
projects you add: the database never has to hold anything heavier than
a few hundred bytes of text per video.

---

## What's inside

```
video-editor-portfolio/
├── index.html              Your public site
├── admin.html               Password-protected dashboard to add/edit videos
├── css/style.css            All styling
├── js/config.js             Where your Supabase keys go
├── js/main.js                Public site logic
├── js/admin.js               Dashboard logic
├── supabase/schema.sql       Database setup script — run this once
└── .github/workflows/
    └── keep-alive.yml        Stops your free database from pausing
```

---

## Quick start

### 1. Create a free Supabase project
Go to **[supabase.com](https://supabase.com)** → sign up (no credit card
needed) → **New Project**. Pick a name, generate a database password
(save it somewhere — you likely won't need it again, but keep it just
in case), choose the region closest to your audience, and create the
project. It takes about two minutes to spin up.

### 2. Run the database schema
In your new project, open the **SQL Editor** in the left sidebar →
**New query**. Open `supabase/schema.sql` from this folder, copy
the whole file, paste it in, and click **Run**. This creates your
`videos` and `messages` tables with the right security rules already
attached.

### 3. Create your admin login
Go to **Authentication → Users** → **Add user** (sometimes labeled
**Invite**) → enter the email and password you want to log in with on
`admin.html`. There's no public sign-up page anywhere on this site —
this is the only way an account gets created, which is what keeps the
dashboard yours alone.

Then go to **Authentication → Sign In / Providers** (naming varies
slightly by Supabase version) and turn **off** the setting that allows
new users to sign themselves up. This matters: without it, anyone who
finds your Supabase project URL could theoretically create their own
account and get admin access.

### 4. Connect the site to your project
Back in **Settings → API**, you'll see a **Project URL** and an
**anon public** key. Open `js/config.js` and paste them in:

```js
const SUPABASE_URL = 'https://your-project-ref.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-public-key';
```

The anon key is meant to be public — it's safe in this file even after
deployment. Never put your **service_role** key anywhere in this
project; that one bypasses your security rules entirely.

### 5. Preview it locally
No build step required. Easiest option — just double-click
`index.html` and it opens in your browser. If you'd rather run a local
server (slightly closer to how it'll behave once deployed):

```bash
python3 -m http.server 8000
```

then visit `http://localhost:8000`.

### 6. Add your first video
Open `admin.html`, sign in with the account from step 3, paste a
YouTube or Vimeo URL, fill in a title and category, and save. Unlisted
Vimeo links work too — paste the full sharing URL Vimeo gives you and
the privacy hash is handled automatically. Refresh `index.html` and
your project is live on the site.

### 7. Deploy it for free
Any static host works since there's no build step. Two good free
options:

**Netlify (simplest):**
1. Create a free account at [netlify.com](https://netlify.com)
2. From your dashboard, drag the entire `video-editor-portfolio` folder
   onto the deploy area — that's it, you get a live URL immediately
3. To make future updates easier, connect it to a GitHub repo instead
   (**Add new site → Import an existing project**) and every push
   redeploys automatically. This also unlocks step 8 below.

**Cloudflare Pages (unlimited bandwidth, also free):**
1. Push this folder to a GitHub repository
2. At [pages.cloudflare.com](https://pages.cloudflare.com) → **Create a
   project → Connect to Git** → pick the repo
3. Leave the build command blank and the output directory as `/`

Both give you a free `*.netlify.app` or `*.pages.dev` URL, and both let
you attach a custom domain later at no extra cost. (Vercel is a fine
host too, but its free Hobby plan restricts commercial use — since a
portfolio meant to land clients arguably counts, Netlify or Cloudflare
are the safer free choice here.)

### 8. Prevent your database from pausing
Free Supabase projects pause automatically after 7 days with no API
activity — meaning if nobody visits your site for a week, it goes
offline until you manually wake it up in the dashboard. This repo
includes `.github/workflows/keep-alive.yml`, which pings your database
twice a week so that never happens.

To turn it on: open that file and replace the two placeholder values
(`YOUR-PROJECT-REF` and `YOUR-ANON-PUBLIC-KEY`) with the same values
you used in `js/config.js`, then push this project to a GitHub repo.
GitHub runs it automatically — nothing else to set up, and it's free.

---

## Customizing

| What | Where |
|---|---|
| Your name / brand | Find & replace "Alex Rivera" across `index.html` and `admin.html` |
| Bio, tools, stats | `index.html` → the `<section id="about">` block |
| Social links | `index.html` → the `<section id="contact">` block, `social-list` links |
| Category suggestions | `admin.html` → the `categorySuggestions` datalist (this is just a convenience autocomplete — you can type any category when adding a video, and it becomes a filter tab automatically) |
| Colors | `css/style.css` → the `:root` block near the top. `--teal` and `--orange` are the two accent colors; `--bg` is the base background |
| Fonts | Google Fonts `<link>` in both HTML files, plus `--font-display` / `--font-mono` / `--font-body` in `css/style.css` |
| Portrait photo | `index.html` → replace the placeholder `.about__portrait` block with a normal `<img>` tag |

---

## Troubleshooting

**Grid says "Connect your database to go live"** — `js/config.js` still
has the placeholder values. Complete step 4 above.

**Grid says "Couldn't load the reel"** — usually means `schema.sql`
hasn't been run yet, or your keys in `config.js` don't match your
project. Double-check both.

**Can't sign in on `admin.html`** — confirm the user exists under
**Authentication → Users** in Supabase, and that you're using the
password you set there (not your Supabase account password — they're
different things).

**A pasted video link isn't recognized** — the parser looks for
standard `youtube.com`, `youtu.be`, or `vimeo.com` URLs. Copy the link
straight from YouTube/Vimeo's own **Share** button rather than typing
it by hand.

**Thumbnail didn't load** — rare, but happens if a YouTube video has no
high-res thumbnail generated yet or Vimeo's oEmbed endpoint is briefly
unavailable. The video still saves and plays fine either way; you can
edit the entry later to retry the thumbnail fetch.

---

## What this actually costs

$0, as long as you stay within free-tier limits — which, for a
portfolio site, is very hard to exceed:

- **Supabase free tier**: 500 MB database (a few hundred thousand
  video/message rows before you'd ever get close), 50,000 monthly
  active users, no credit card required, commercial use allowed.
- **YouTube / Vimeo**: your actual video hosting, free and unlimited.
- **Netlify / Cloudflare Pages**: free static hosting with a custom
  domain supported at no extra cost.

The only real gotcha is the 7-day pause covered in step 8 — solved by
the included workflow.
