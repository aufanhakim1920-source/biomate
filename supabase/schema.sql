-- ============================================================
-- Biomate — Supabase schema
-- Run in the SQL editor of a fresh project (or via apply_migration).
--
-- Identity is REAL this time. Peak & Pan keyed its RLS on an
-- `x-device-id` header, which the client sets itself — so "only
-- edit your own row" was spam-resistant, not tamper-proof. Here
-- every write is checked against auth.uid(), which comes out of a
-- signed JWT the browser cannot forge.
--
-- MANUAL STEP, done once in the dashboard and NOT scriptable:
--    Authentication -> Sign In / Providers -> Anonymous sign-ins -> ON
--    Nothing below works until that is enabled.
-- ============================================================

-- ------------------------------------------------------------
-- helpers
-- ------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $fn$
begin
  new.updated_at = now();
  return new;
end $fn$;

-- ------------------------------------------------------------
-- profiles — one row per auth user, created automatically
-- Anonymous users are real rows in auth.users, so this works from
-- the very first page load with no signup screen. If a player
-- later links an email, the SAME uid is kept and every row they
-- already own follows them across.
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text        not null default 'Player',
  avatar_url   text        not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are readable by anyone"
  on public.profiles for select using (true);
create policy "a user inserts only their own profile"
  on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy "a user updates only their own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- The profile row is made by the database, not the client, so a
-- user can never exist without one and no screen has to branch on
-- "the profile might not be there yet".
-- security definer + empty search_path: it runs as the owner but
-- cannot be tricked into resolving a shadowed function.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $fn$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end $fn$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- media — the artwork INDEX, not the artwork
-- Carried over from Peak & Pan because it earned its place: the
-- app fetches this once on boot and maps kind+key -> a public
-- Storage URL. Nothing image-heavy lives in the repo, art changes
-- without a deploy, and A MISSING ROW IS NORMAL — the drawn or
-- emoji fallback takes over, so absent artwork can never break a
-- screen.
-- ------------------------------------------------------------
create table if not exists public.media (
  kind       text not null,          -- e.g. 'icon' | 'photo' | 'bg'
  key        text not null,          -- the app's own id, e.g. 'kecap'
  url        text not null,
  updated_at timestamptz not null default now(),
  primary key (kind, key)
);

alter table public.media enable row level security;
create policy "media index is readable by anyone"
  on public.media for select using (true);
-- deliberately NO write policy: artwork is uploaded through the
-- dashboard, so the browser key can never rewrite the index.

-- ------------------------------------------------------------
-- Storage buckets
--   content — official artwork. Public read, no client write.
--             Drag a file into content/<kind>/<key>.png in the
--             dashboard and the trigger below indexes it.
--   uploads — user-submitted files. A signed-in user may write
--             only inside a folder named after their own uid.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('content', 'content', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('uploads', 'uploads', true)
  on conflict (id) do nothing;

drop policy if exists "content is world readable" on storage.objects;
create policy "content is world readable"
  on storage.objects for select using (bucket_id in ('content', 'uploads'));

drop policy if exists "users upload into their own folder" on storage.objects;
create policy "users upload into their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users delete their own uploads" on storage.objects;
create policy "users delete their own uploads"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Dropping a file into the `content` bucket writes its own index
-- row; deleting the file removes it. The dashboard becomes the
-- entire artwork workflow — no CLI, no service key.
create or replace function public.index_content_object()
returns trigger language plpgsql security definer set search_path = '' as $fn$
declare
  parts  text[];
  n      int;
  base   text;
begin
  if (tg_op = 'DELETE') then
    if old.bucket_id = 'content' then
      parts := string_to_array(old.name, '/');
      n := array_length(parts, 1);
      if n >= 2 then
        base := regexp_replace(parts[n], '\.[^.]+$', '');
        delete from public.media where kind = parts[1] and key = base;
      end if;
    end if;
    return old;
  end if;

  if new.bucket_id = 'content' then
    parts := string_to_array(new.name, '/');
    n := array_length(parts, 1);
    if n >= 2 then
      base := regexp_replace(parts[n], '\.[^.]+$', '');
      insert into public.media (kind, key, url, updated_at)
      values (parts[1], base, '/storage/v1/object/public/content/' || new.name, now())
      on conflict (kind, key) do update
        set url = excluded.url, updated_at = now();
    end if;
  end if;
  return new;
end $fn$;

drop trigger if exists content_indexed on storage.objects;
create trigger content_indexed
  after insert or update or delete on storage.objects
  for each row execute function public.index_content_object();

-- ------------------------------------------------------------
-- Lock the trigger functions away from the HTTP API.
-- PostgREST exposes EVERY function in the `public` schema at
-- /rest/v1/rpc/<name>, so a security-definer trigger function is
-- reachable by an anonymous caller over the internet. Nothing should
-- call these directly — only the triggers that own them.
-- (Flagged by the Supabase security advisor; the project reports
-- zero lints with these in place.)
-- ------------------------------------------------------------
revoke execute on function public.handle_new_user()      from public, anon, authenticated;
revoke execute on function public.index_content_object() from public, anon, authenticated;
revoke execute on function public.touch_updated_at()     from public, anon, authenticated;

-- NOTE: media.url is stored as a ROOT-RELATIVE path, not an absolute
-- URL. The trigger has no reliable way to learn the project's own
-- hostname, and hardcoding the ref would silently rot if the project
-- is ever recreated. db.js joins it onto PP_CONFIG.url on read.

-- ============================================================
-- Domain tables go BELOW this line, once the brief lands.
-- Every one of them follows the same three rules:
--   1. owner column is
--        user_id uuid not null default auth.uid()
--          references auth.users (id) on delete cascade
--   2. RLS on, with the read policy separate from the write policy
--   3. write policies check user_id = auth.uid() — never a header
-- ============================================================
