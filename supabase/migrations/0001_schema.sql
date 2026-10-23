-- SOMA Conecta — Migração 0001: esquema principal
-- Execute no SQL Editor do Supabase ou com `supabase db push`.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- Tipos enumerados
-- ---------------------------------------------------------------
create type global_role as enum ('MEMBER', 'ADMIN');
create type account_status as enum ('ACTIVE', 'SUSPENDED');
create type soma_status as enum ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');
create type group_role as enum ('LEADER', 'MEMBER');
create type membership_status as enum ('ACTIVE', 'REMOVED', 'LEFT');
create type request_status as enum ('PENDING', 'APPROVED', 'REJECTED', 'CANCELED');
create type weekday as enum ('DOMINGO','SEGUNDA','TERCA','QUARTA','QUINTA','SEXTA','SABADO');
create type meeting_frequency as enum ('SEMANAL','QUINZENAL','MENSAL','OUTRA');

-- ---------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text not null,
  phone text,
  age int,
  has_bases boolean,
  avatar_url text,
  role global_role not null default 'MEMBER',
  status account_status not null default 'ACTIVE',
  profile_completed boolean generated always as (
    full_name is not null and age is not null and phone is not null and has_bases is not null
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_age_check check (age is null or (age between 5 and 120)),
  constraint profiles_phone_check check (phone is null or phone ~ '^\+?[0-9]{10,13}$')
);

-- Cria o perfil automaticamente quando um usuário se cadastra.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    nullif(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), ''),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------
-- somas
-- ---------------------------------------------------------------
create table public.somas (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 80),
  description text not null check (char_length(description) between 10 and 1000),
  leader_id uuid not null references public.profiles(id),
  neighborhood text not null check (char_length(neighborhood) between 2 and 80),
  location_hint text check (char_length(location_hint) <= 200),
  weekday weekday not null,
  start_time time not null,
  end_time time,
  frequency meeting_frequency not null default 'SEMANAL',
  cover_url text,
  extra_info text check (char_length(extra_info) <= 1000),
  accepting_members boolean not null default true,
  status soma_status not null default 'PENDING',
  -- reservado para geolocalização futura
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint somas_time_check check (end_time is null or end_time > start_time)
);
create index somas_status_idx on public.somas(status);
create index somas_neighborhood_idx on public.somas(lower(neighborhood));
create index somas_leader_idx on public.somas(leader_id);

-- ---------------------------------------------------------------
-- soma_members
-- ---------------------------------------------------------------
create table public.soma_members (
  id uuid primary key default gen_random_uuid(),
  soma_id uuid not null references public.somas(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role group_role not null default 'MEMBER',
  status membership_status not null default 'ACTIVE',
  joined_at timestamptz not null default now(),
  unique (soma_id, user_id)
);
create index soma_members_user_idx on public.soma_members(user_id) where status = 'ACTIVE';
create unique index soma_one_leader_idx on public.soma_members(soma_id)
  where role = 'LEADER' and status = 'ACTIVE';

-- ---------------------------------------------------------------
-- soma_registration_requests  (pedido de criação de SOMA)
-- ---------------------------------------------------------------
create table public.soma_registration_requests (
  id uuid primary key default gen_random_uuid(),
  soma_id uuid not null unique references public.somas(id) on delete cascade,
  requester_id uuid not null references public.profiles(id),
  status request_status not null default 'PENDING',
  decided_by uuid references public.profiles(id),
  decided_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  constraint reg_decision_check check (
    (status = 'PENDING' and decided_at is null)
    or (status <> 'PENDING' and decided_at is not null)
  )
);
create index reg_requests_status_idx on public.soma_registration_requests(status, created_at desc);

-- ---------------------------------------------------------------
-- soma_join_requests
-- ---------------------------------------------------------------
create table public.soma_join_requests (
  id uuid primary key default gen_random_uuid(),
  soma_id uuid not null references public.somas(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status request_status not null default 'PENDING',
  decided_by uuid references public.profiles(id),
  decided_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now()
);
-- Impede duas solicitações pendentes para o mesmo SOMA e usuário.
create unique index join_requests_one_pending_idx
  on public.soma_join_requests(soma_id, user_id) where status = 'PENDING';
create index join_requests_soma_idx on public.soma_join_requests(soma_id, status);

-- ---------------------------------------------------------------
-- meetings / meeting_photos
-- ---------------------------------------------------------------
create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  soma_id uuid not null references public.somas(id) on delete cascade,
  meeting_date date not null,
  start_time time,
  end_time time,
  title text check (char_length(title) <= 120),
  description text check (char_length(description) <= 2000),
  notes text check (char_length(notes) <= 2000),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint meetings_time_check check (end_time is null or start_time is null or end_time > start_time)
);
-- Evita duplicidade acidental (mesmo SOMA, data e horário de início).
create unique index meetings_no_dup_idx
  on public.meetings(soma_id, meeting_date, coalesce(start_time, '00:00'::time));
create index meetings_soma_date_idx on public.meetings(soma_id, meeting_date desc);

create table public.meeting_photos (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  soma_id uuid not null references public.somas(id) on delete cascade,
  storage_path text not null unique,
  caption text check (char_length(caption) <= 200),
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index meeting_photos_meeting_idx on public.meeting_photos(meeting_id);

-- ---------------------------------------------------------------
-- messages (chat)
-- ---------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  soma_id uuid not null references public.somas(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  content text not null check (char_length(btrim(content)) between 1 and 2000),
  -- reservado para evolução futura
  reply_to uuid references public.messages(id) on delete set null,
  image_path text,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
create index messages_soma_created_idx on public.messages(soma_id, created_at desc);

create table public.chat_reads (
  soma_id uuid not null references public.somas(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (soma_id, user_id)
);

-- ---------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  dedupe_key text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);
create unique index notifications_dedupe_idx on public.notifications(user_id, dedupe_key)
  where dedupe_key is not null;

-- ---------------------------------------------------------------
-- admin_audit_log (histórico de decisões e ações administrativas)
-- ---------------------------------------------------------------
create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id),
  action text not null,
  target_type text not null,
  target_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);
create index audit_created_idx on public.admin_audit_log(created_at desc);

-- ---------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

create trigger profiles_touch before update on public.profiles
for each row execute function public.touch_updated_at();
create trigger somas_touch before update on public.somas
for each row execute function public.touch_updated_at();
