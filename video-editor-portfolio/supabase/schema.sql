-- ============================================================
-- Video Editor Portfolio — Supabase Schema
--
-- HOW TO USE:
-- 1. Create a free project at https://supabase.com
-- 2. Open the SQL Editor (left sidebar) → New Query
-- 3. Paste this entire file → click "Run"
-- That's it — this creates everything the site needs.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- TABLE: videos
-- Stores metadata for each project in your reel. The actual
-- video files live on YouTube/Vimeo — we only store the link,
-- so this table stays tiny (a few KB per row) no matter how
-- much footage you add.
-- ------------------------------------------------------------
create table if not exists public.videos (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  description    text not null default '',
  category       text not null default 'General',
  platform       text not null default 'youtube',   -- 'youtube' | 'vimeo'
  video_id       text not null,                       -- e.g. dQw4w9WgXcQ
  video_url      text not null,                       -- original pasted URL
  thumbnail_url  text,
  client         text default '',
  year           int,
  featured       boolean not null default false,
  display_order  int not null default 0,
  created_at     timestamptz not null default now()
);

comment on table public.videos is 'Portfolio video entries shown on the public site.';

-- ------------------------------------------------------------
-- TABLE: messages
-- Stores contact-form submissions from the public site.
-- ------------------------------------------------------------
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  message     text not null,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

comment on table public.messages is 'Contact form submissions.';

-- ------------------------------------------------------------
-- Helpful indexes
-- ------------------------------------------------------------
create index if not exists videos_order_idx on public.videos (display_order, created_at desc);
create index if not exists messages_created_idx on public.messages (created_at desc);

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- Public visitors (the "anon" role) may only READ videos and
-- SUBMIT messages. Only a signed-in admin (the "authenticated"
-- role — that's you, once logged in on admin.html) can write.
--
-- IMPORTANT: this means anyone who creates an account on your
-- Supabase project becomes an admin. Follow the README step
-- that disables public sign-ups so only you can log in.
-- ------------------------------------------------------------
alter table public.videos enable row level security;
alter table public.messages enable row level security;

drop policy if exists "videos_public_read" on public.videos;
create policy "videos_public_read"
  on public.videos for select
  to anon, authenticated
  using (true);

drop policy if exists "videos_admin_insert" on public.videos;
create policy "videos_admin_insert"
  on public.videos for insert
  to authenticated
  with check (true);

drop policy if exists "videos_admin_update" on public.videos;
create policy "videos_admin_update"
  on public.videos for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "videos_admin_delete" on public.videos;
create policy "videos_admin_delete"
  on public.videos for delete
  to authenticated
  using (true);

drop policy if exists "messages_public_insert" on public.messages;
create policy "messages_public_insert"
  on public.messages for insert
  to anon, authenticated
  with check (true);

drop policy if exists "messages_admin_read" on public.messages;
create policy "messages_admin_read"
  on public.messages for select
  to authenticated
  using (true);

drop policy if exists "messages_admin_update" on public.messages;
create policy "messages_admin_update"
  on public.messages for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "messages_admin_delete" on public.messages;
create policy "messages_admin_delete"
  on public.messages for delete
  to authenticated
  using (true);

-- ------------------------------------------------------------
-- EXPLICIT GRANTS
-- Supabase now requires explicit Postgres grants in addition to
-- RLS policies for the auto-generated API to expose a table.
-- Without these, the table stays invisible to the API even with
-- correct RLS policies above.
-- ------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select on public.videos to anon, authenticated;
grant insert, update, delete on public.videos to authenticated;

grant insert on public.messages to anon, authenticated;
grant select, update, delete on public.messages to authenticated;

-- ------------------------------------------------------------
-- Done! Next steps live in the main README.md:
--   1. Create your admin login (Authentication → Users → Add user)
--   2. Turn off public sign-ups (Authentication → Sign In / Providers)
--   3. Copy your Project URL + anon key into js/config.js
-- ------------------------------------------------------------
