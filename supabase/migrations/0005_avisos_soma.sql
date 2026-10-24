-- SOMA Conecta — Migração 0005: avisos por SOMA e contador de não lidos (chat/avisos)

-- ---------------------------------------------------------------
-- 1) Avisos do SOMA (emitidos pelo responsável, visíveis só aos membros daquele SOMA)
-- ---------------------------------------------------------------
create table public.soma_announcements (
  id uuid primary key default gen_random_uuid(),
  soma_id uuid not null references public.somas(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index soma_announcements_soma_idx on public.soma_announcements(soma_id, created_at desc);

create table public.soma_announcement_reads (
  soma_id uuid not null references public.somas(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (soma_id, user_id)
);

alter table public.soma_announcements enable row level security;
alter table public.soma_announcement_reads enable row level security;

create policy announcements_select on public.soma_announcements for select to authenticated using (
  public.is_soma_member(soma_id) or public.is_admin()
);
create policy announcements_insert on public.soma_announcements for insert to authenticated
  with check (public.is_soma_leader(soma_id) and author_id = auth.uid());
create policy announcements_delete on public.soma_announcements for delete to authenticated
  using (public.is_soma_leader(soma_id) or public.is_admin());

create policy announcement_reads_own on public.soma_announcement_reads for select to authenticated
  using (user_id = auth.uid());

create or replace function public.mark_announcements_read(p_soma uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_soma_member(p_soma) then raise exception 'Sem acesso.'; end if;
  insert into public.soma_announcement_reads (soma_id, user_id, last_read_at) values (p_soma, auth.uid(), now())
  on conflict (soma_id, user_id) do update set last_read_at = now();
end $$;

-- ---------------------------------------------------------------
-- 2) Contadores de não lidos por SOMA (abas Chat e Avisos)
-- ---------------------------------------------------------------
create or replace function public.soma_unread_counts(p_soma uuid)
returns table (chat_unread int, avisos_unread int)
language plpgsql stable security definer set search_path = public as $$
declare v_joined timestamptz;
begin
  select joined_at into v_joined from public.soma_members
   where soma_id = p_soma and user_id = auth.uid() and status = 'ACTIVE';
  if not found then raise exception 'Sem acesso.'; end if;

  return query select
    (select count(*)::int from public.messages m
      where m.soma_id = p_soma and m.sender_id <> auth.uid()
        and m.created_at > coalesce((select r.last_read_at from public.chat_reads r
                                      where r.soma_id = p_soma and r.user_id = auth.uid()), v_joined)),
    (select count(*)::int from public.soma_announcements a
      where a.soma_id = p_soma and a.author_id is distinct from auth.uid()
        and a.created_at > coalesce((select r.last_read_at from public.soma_announcement_reads r
                                      where r.soma_id = p_soma and r.user_id = auth.uid()), v_joined));
end $$;

revoke all on function public.mark_announcements_read(uuid) from public, anon;
revoke all on function public.soma_unread_counts(uuid) from public, anon;

-- ---------------------------------------------------------------
-- 3) Chat deixa de gerar notificações gerais (passa a usar o contador da aba Chat)
-- ---------------------------------------------------------------
drop trigger if exists messages_notify on public.messages;
drop function if exists public.notify_chat_message();
delete from public.notifications where type = 'CHAT_MESSAGE';
