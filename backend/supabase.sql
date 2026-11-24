-- =============================================================================
-- backend/supabase.sql — Lừa Chill: schema + bảo mật (Row Level Security) + realtime
-- Chạy 1 lần trong Supabase Dashboard → SQL Editor → New query → dán toàn bộ → Run.
-- =============================================================================

-- ---------- Hồ sơ công khai (dùng cho bạn bè, chat, bảng xếp hạng) ----------
create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  name           text not null default 'Bạn Lừa' check (char_length(name) between 1 and 24),
  avatar_url     text,
  friend_code    text unique not null default upper(substr(md5(random()::text), 1, 6)),
  gems           integer not null default 0 check (gems >= 0),
  quests_total   integer not null default 0 check (quests_total >= 0),
  screen_today   integer not null default 0 check (screen_today >= 0),
  screen_day     date,
  sleep_streak   integer not null default 0,
  checkin_streak integer not null default 0,
  garden_stage   integer not null default 0,
  acc            text[] not null default '{}',
  room           jsonb,
  updated_at     timestamptz not null default now(),
  created_at     timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles: đọc khi đăng nhập" on public.profiles;
create policy "profiles: đọc khi đăng nhập" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles: tạo của mình" on public.profiles;
create policy "profiles: tạo của mình" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "profiles: sửa của mình" on public.profiles;
create policy "profiles: sửa của mình" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Chống gian lận cơ bản: Gem/quest chỉ tăng tối đa theo nhịp hợp lý mỗi lần đồng bộ
create or replace function public.guard_profile() returns trigger language plpgsql as $$
begin
  if new.gems - old.gems > 3000 then new.gems := old.gems + 3000; end if;
  if new.quests_total - old.quests_total > 12 then new.quests_total := old.quests_total + 12; end if;
  if new.screen_today > 1440 then new.screen_today := 1440; end if;
  new.friend_code := old.friend_code;   -- không cho tự đổi mã bạn bè
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists trg_guard_profile on public.profiles;
create trigger trg_guard_profile before update on public.profiles for each row execute function public.guard_profile();

-- ---------- Bản lưu riêng tư (đồng bộ đa thiết bị) — chỉ chủ tài khoản đọc/ghi ----------
create table if not exists public.saves (
  id         uuid primary key references auth.users(id) on delete cascade,
  state      jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.saves enable row level security;
drop policy if exists "saves: của mình" on public.saves;
create policy "saves: của mình" on public.saves for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- ---------- Bạn bè & Lời mời kết bạn (1 chiều = đang chờ; 2 chiều = bạn bè chính thức) ----------
create table if not exists public.friendships (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  friend_id  uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);
alter table public.friendships enable row level security;
drop policy if exists "friendships: xem liên quan" on public.friendships;
create policy "friendships: xem liên quan" on public.friendships for select to authenticated using (auth.uid() in (user_id, friend_id));
drop policy if exists "friendships: thêm của mình" on public.friendships;
create policy "friendships: thêm của mình" on public.friendships for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "friendships: xóa của mình" on public.friendships;
drop policy if exists "friendships: xóa liên quan" on public.friendships;
create policy "friendships: xóa liên quan" on public.friendships for delete to authenticated using (auth.uid() in (user_id, friend_id));

-- ---------- Tin nhắn: phòng 'global' (cộng đồng) và 'dm:<uuid>:<uuid>' (riêng 2 người) ----------
create table if not exists public.messages (
  id         bigint generated always as identity primary key,
  room       text not null check (room = 'global' or room ~ '^dm:[0-9a-f-]{36}:[0-9a-f-]{36}$'),
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body       text check (char_length(body) <= 300),
  sticker    text check (char_length(sticker) <= 20),
  created_at timestamptz not null default now(),
  check (body is not null or sticker is not null)
);
create index if not exists messages_room_id on public.messages (room, id desc);
alter table public.messages enable row level security;
drop policy if exists "messages: đọc phòng được phép" on public.messages;
create policy "messages: đọc phòng được phép" on public.messages for select to authenticated
  using (room = 'global' or position(auth.uid()::text in room) > 0);
drop policy if exists "messages: gửi phòng được phép" on public.messages;
create policy "messages: gửi phòng được phép" on public.messages for insert to authenticated
  with check (user_id = auth.uid() and (room = 'global' or position(auth.uid()::text in room) > 0));

-- Giới hạn tốc độ: tối đa 1 tin / 1.5 giây / người, 20 tin / phút
create or replace function public.rate_limit_messages() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from messages where user_id = new.user_id and created_at > now() - interval '1.5 seconds') then
    raise exception 'Bạn gửi nhanh quá, chờ chút nhé!';
  end if;
  if (select count(*) from messages where user_id = new.user_id and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'Bạn đã gửi quá nhiều tin trong 1 phút.';
  end if;
  return new;
end $$;
drop trigger if exists trg_rate_limit_messages on public.messages;
create trigger trg_rate_limit_messages before insert on public.messages for each row execute function public.rate_limit_messages();

-- ---------- Báo cáo & chặn (an toàn cộng đồng) ----------
create table if not exists public.reports (
  id            bigint generated always as identity primary key,
  message_id    bigint references public.messages(id) on delete set null,
  reported_user uuid references public.profiles(id) on delete cascade,
  reporter      uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  reason        text check (char_length(reason) <= 200),
  created_at    timestamptz not null default now()
);
alter table public.reports enable row level security;
drop policy if exists "reports: gửi" on public.reports;
create policy "reports: gửi" on public.reports for insert to authenticated with check (reporter = auth.uid());

create table if not exists public.blocks (
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_id)
);
alter table public.blocks enable row level security;
drop policy if exists "blocks: của mình" on public.blocks;
create policy "blocks: của mình" on public.blocks for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Ngăn người đã bị chặn gửi lại lời mời kết bạn
drop policy if exists "friendships: thêm của mình" on public.friendships;
create policy "friendships: thêm của mình" on public.friendships for insert to authenticated
  with check (
    auth.uid() = user_id
    and not exists (
      select 1 from public.blocks b
      where (b.user_id = friend_id and b.blocked_id = auth.uid())
         or (b.user_id = auth.uid() and b.blocked_id = friend_id)
    )
  );

-- ---------- Bật Realtime cho chat ----------
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;

-- ---------- Dọn tin nhắn cộng đồng cũ hơn 30 ngày (tùy chọn: bật pg_cron rồi bỏ comment) ----------
-- select cron.schedule('clean-global-chat', '0 3 * * *', $$delete from public.messages where room='global' and created_at < now() - interval '30 days'$$);
