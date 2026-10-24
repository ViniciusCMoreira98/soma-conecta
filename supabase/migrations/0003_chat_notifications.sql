-- SOMA Conecta — Migração 0003: notificação agregada de novas mensagens do chat

-- Uma única notificação "viva" por usuário e por SOMA: novas mensagens reabrem a mesma
-- notificação (sem gerar uma por mensagem), evitando duplicidade.
create or replace function public.notify_chat_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_name text;
  v_sender text;
begin
  select name into v_name from public.somas where id = new.soma_id;
  select coalesce(full_name, 'Alguém') into v_sender from public.profiles where id = new.sender_id;

  insert into public.notifications (user_id, type, title, body, link, dedupe_key)
  select m.user_id, 'CHAT_MESSAGE', 'Novas mensagens em ' || v_name,
         v_sender || ': ' || left(new.content, 80),
         '/somas/' || new.soma_id::text || '/chat', 'chat-' || new.soma_id::text
  from public.soma_members m
  where m.soma_id = new.soma_id and m.status = 'ACTIVE' and m.user_id <> new.sender_id
  on conflict (user_id, dedupe_key) where dedupe_key is not null
  do update set read_at = null, created_at = now(), body = excluded.body, title = excluded.title;

  return new;
end $$;

create trigger messages_notify after insert on public.messages
for each row execute function public.notify_chat_message();

-- Ao abrir o chat, marca como lido e fecha a notificação correspondente.
create or replace function public.mark_chat_read(p_soma uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_soma_member(p_soma) then raise exception 'Sem acesso.'; end if;
  insert into public.chat_reads (soma_id, user_id, last_read_at) values (p_soma, auth.uid(), now())
  on conflict (soma_id, user_id) do update set last_read_at = now();
  update public.notifications set read_at = now()
   where user_id = auth.uid() and dedupe_key = 'chat-' || p_soma::text and read_at is null;
end $$;

-- Aviso de reunião registrada (aos membros do grupo), uma notificação por reunião.
create or replace function public.notify_meeting_created() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  select name into v_name from public.somas where id = new.soma_id;
  insert into public.notifications (user_id, type, title, body, link, dedupe_key)
  select m.user_id, 'MEETING_CREATED', 'Nova reunião registrada em ' || v_name,
         coalesce(new.title, 'Reunião de ' || to_char(new.meeting_date, 'DD/MM/YYYY')),
         '/somas/' || new.soma_id::text || '/reunioes/' || new.id::text, 'meeting-' || new.id::text
  from public.soma_members m
  where m.soma_id = new.soma_id and m.status = 'ACTIVE' and m.user_id <> new.created_by
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  return new;
end $$;

create trigger meetings_notify after insert on public.meetings
for each row execute function public.notify_meeting_created();

-- Mensagens: histórico imutável pelo cliente (sem update/delete por usuários comuns).
-- Moderação: administradores podem remover mensagens.
create policy messages_delete_admin on public.messages for delete to authenticated using (public.is_admin());
