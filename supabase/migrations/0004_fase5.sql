-- SOMA Conecta — Migração 0004: Fase 5 (finalização)
-- Gestão de usuários, denúncias e moderação, capa/avatar, reuniões futuras, presença,
-- silenciar chat, transferência de liderança e solicitações LGPD.
-- Execute depois de 0001, 0002 e 0003.

-- ---------------------------------------------------------------
-- Utilitários
-- ---------------------------------------------------------------
-- "Hoje" no fuso da igreja (as datas de reunião são datas locais).
create or replace function public.today_local() returns date
language sql stable as $$ select (now() at time zone 'America/Campo_Grande')::date $$;

-- Contas suspensas perdem o acesso aos SOMAS também pela API (não só pela interface).
create or replace function public.is_soma_member(p_soma uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.soma_members m
    join public.somas s on s.id = m.soma_id
    join public.profiles p on p.id = m.user_id
    where m.soma_id = p_soma and m.user_id = auth.uid()
      and m.status = 'ACTIVE' and s.status = 'APPROVED' and p.status = 'ACTIVE'
  );
$$;

create or replace function public.is_soma_leader(p_soma uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.soma_members m
    join public.somas s on s.id = m.soma_id
    join public.profiles p on p.id = m.user_id
    where m.soma_id = p_soma and m.user_id = auth.uid()
      and m.role = 'LEADER' and m.status = 'ACTIVE' and s.status = 'APPROVED' and p.status = 'ACTIVE'
  );
$$;

-- O gatilho de proteção passa a valer só para chamadas diretas da API (papel "authenticated").
-- Funções SECURITY DEFINER (ex.: transferência de liderança) rodam como dono e podem trocar o líder.
create or replace function public.protect_soma_columns() returns trigger
language plpgsql as $$
begin
  if current_user = 'authenticated' and not public.is_admin() and (new.status is distinct from old.status
      or new.leader_id is distinct from old.leader_id) then
    raise exception 'Alteração não permitida.';
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------
-- 1) Gestão de usuários (suspender / reativar) com histórico
-- ---------------------------------------------------------------
create or replace function public.admin_set_user_status(p_user uuid, p_suspend boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_old account_status;
begin
  if not public.is_admin() then raise exception 'Apenas administradores.'; end if;
  if p_user = auth.uid() then raise exception 'Você não pode alterar a sua própria conta.'; end if;
  if p_suspend and (p_reason is null or char_length(btrim(p_reason)) < 5) then
    raise exception 'Informe o motivo da suspensão (mín. 5 caracteres).';
  end if;

  select status into v_old from public.profiles where id = p_user for update;
  if not found then raise exception 'Usuário não encontrado.'; end if;
  if (p_suspend and v_old = 'SUSPENDED') or (not p_suspend and v_old = 'ACTIVE') then
    raise exception 'A conta já está nesse estado.';
  end if;

  update public.profiles
     set status = case when p_suspend then 'SUSPENDED'::account_status else 'ACTIVE'::account_status end
   where id = p_user;

  insert into public.admin_audit_log (actor_id, action, target_type, target_id, details)
  values (auth.uid(), case when p_suspend then 'USER_SUSPENDED' else 'USER_REACTIVATED' end,
          'user', p_user, jsonb_build_object('reason', nullif(btrim(coalesce(p_reason, '')), '')));

  if not p_suspend then
    perform public.notify(p_user, 'ACCOUNT_REACTIVATED', 'Sua conta foi reativada',
      'Você já pode voltar a usar o SOMA Conecta.', '/meus-somas', null);
  end if;
end $$;

-- ---------------------------------------------------------------
-- 2) Denúncias e moderação
-- ---------------------------------------------------------------
create type report_status as enum ('OPEN', 'RESOLVED', 'DISMISSED');

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  soma_id uuid not null references public.somas(id) on delete cascade,
  target_type text not null check (target_type in ('MESSAGE', 'PHOTO')),
  target_id uuid not null,
  reported_user_id uuid references public.profiles(id) on delete set null,
  -- cópia do conteúdo no momento da denúncia (texto da mensagem ou caminho da foto)
  content_snapshot text,
  reason text not null check (reason in ('OFENSIVO', 'SPAM', 'PRIVACIDADE', 'INADEQUADO', 'OUTRO')),
  details text check (char_length(details) <= 500),
  status report_status not null default 'OPEN',
  content_removed boolean not null default false,
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  resolution_note text check (char_length(resolution_note) <= 500),
  created_at timestamptz not null default now()
);
create unique index reports_one_open_idx on public.reports(reporter_id, target_type, target_id) where status = 'OPEN';
create index reports_status_idx on public.reports(status, created_at desc);
alter table public.reports enable row level security;
create policy reports_select on public.reports for select to authenticated
  using (public.is_admin() or reporter_id = auth.uid());

create or replace function public.report_content(
  p_type text, p_target uuid, p_reason text, p_details text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_soma uuid; v_author uuid; v_snapshot text; v_id uuid; v_name text;
begin
  if auth.uid() is null then raise exception 'Não autenticado.'; end if;
  if p_type = 'MESSAGE' then
    select soma_id, sender_id, content into v_soma, v_author, v_snapshot from public.messages where id = p_target;
  elsif p_type = 'PHOTO' then
    select soma_id, uploaded_by, storage_path into v_soma, v_author, v_snapshot from public.meeting_photos where id = p_target;
  else
    raise exception 'Tipo de conteúdo inválido.';
  end if;
  if v_soma is null then raise exception 'Conteúdo não encontrado.'; end if;
  if not public.is_soma_member(v_soma) then raise exception 'Sem acesso a este conteúdo.'; end if;
  if v_author = auth.uid() then raise exception 'Você não pode denunciar o seu próprio conteúdo.'; end if;
  if exists (select 1 from public.reports where reporter_id = auth.uid() and target_type = p_type
             and target_id = p_target and status = 'OPEN') then
    raise exception 'Você já denunciou este conteúdo. A administração vai analisar.';
  end if;

  insert into public.reports (reporter_id, soma_id, target_type, target_id, reported_user_id, content_snapshot, reason, details)
  values (auth.uid(), v_soma, p_type, p_target, v_author, v_snapshot, p_reason, nullif(btrim(coalesce(p_details, '')), ''))
  returning id into v_id;

  select name into v_name from public.somas where id = v_soma;
  perform public.notify(a.id, 'REPORT_CREATED', 'Nova denúncia para análise',
    case when p_type = 'MESSAGE' then 'Mensagem' else 'Foto' end || ' em ' || v_name,
    '/admin/denuncias', 'report-' || p_target::text)
  from public.profiles a where a.role = 'ADMIN' and a.status = 'ACTIVE';
  return v_id;
end $$;

-- Decide a denúncia. Com p_remove = true, apaga a mensagem ou o registro da foto
-- (o arquivo da foto é removido do Storage pela aplicação antes desta chamada).
-- Todas as denúncias abertas sobre o mesmo conteúdo são encerradas juntas.
create or replace function public.admin_resolve_report(p_report uuid, p_remove boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_rep public.reports; v_removed boolean := false;
begin
  if not public.is_admin() then raise exception 'Apenas administradores.'; end if;
  select * into v_rep from public.reports where id = p_report for update;
  if not found then raise exception 'Denúncia não encontrada.'; end if;
  if v_rep.status <> 'OPEN' then raise exception 'Esta denúncia já foi analisada.'; end if;

  if p_remove then
    if v_rep.target_type = 'MESSAGE' then
      delete from public.messages where id = v_rep.target_id;
    else
      delete from public.meeting_photos where id = v_rep.target_id;
    end if;
    v_removed := true;
  end if;

  update public.reports
     set status = case when p_remove then 'RESOLVED'::report_status else 'DISMISSED'::report_status end,
         content_removed = v_removed, resolved_by = auth.uid(), resolved_at = now(),
         resolution_note = nullif(btrim(coalesce(p_note, '')), '')
   where target_type = v_rep.target_type and target_id = v_rep.target_id and status = 'OPEN';

  insert into public.admin_audit_log (actor_id, action, target_type, target_id, details)
  values (auth.uid(),
          case when p_remove then 'CONTENT_REMOVED' else 'REPORT_DISMISSED' end,
          lower(v_rep.target_type), v_rep.target_id,
          jsonb_build_object('report_id', v_rep.id, 'soma_id', v_rep.soma_id, 'reason', v_rep.reason,
                             'note', nullif(btrim(coalesce(p_note, '')), ''), 'author_id', v_rep.reported_user_id));

  -- avisa quem denunciou
  perform public.notify(r.reporter_id, 'REPORT_REVIEWED', 'Sua denúncia foi analisada',
    case when p_remove then 'O conteúdo foi removido pela moderação.' else 'A moderação não identificou violação.' end,
    null, 'reportdec-' || r.id::text)
  from public.reports r where r.target_type = v_rep.target_type and r.target_id = v_rep.target_id
    and r.resolved_at is not null and r.resolved_by = auth.uid();

  if p_remove and v_rep.reported_user_id is not null then
    perform public.notify(v_rep.reported_user_id, 'CONTENT_REMOVED',
      case when v_rep.target_type = 'MESSAGE' then 'Uma mensagem sua foi removida' else 'Uma foto foi removida' end,
      'A administração removeu o conteúdo por violar as regras de convivência.', null,
      'removed-' || v_rep.target_id::text);
  end if;
end $$;

-- Administradores podem ver e remover fotos (moderação).
create policy photos_delete_admin on public.meeting_photos for delete to authenticated using (public.is_admin());
create policy "fotos: admin lê" on storage.objects for select to authenticated using (
  bucket_id = 'meeting-photos' and public.is_admin()
);
create policy "fotos: admin remove" on storage.objects for delete to authenticated using (
  bucket_id = 'meeting-photos' and public.is_admin()
);

-- ---------------------------------------------------------------
-- 3) Administrador consulta membros de cada SOMA
--    (já permitido por RLS: members_select e profiles_select incluem is_admin()).
-- ---------------------------------------------------------------

-- ---------------------------------------------------------------
-- 4) Foto de perfil e imagem de capa do SOMA
--    Buckets públicos com nomes aleatórios (UUID): a imagem é exibida na busca e no chat
--    sem precisar de URL assinada. Só o dono (avatar) ou o responsável (capa) envia.
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg','image/png','image/webp']),
  ('soma-covers', 'soma-covers', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Caminho: avatars/{user_id}/{arquivo}
create policy "avatar: dono envia" on storage.objects for insert to authenticated with check (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "avatar: dono ou admin remove" on storage.objects for delete to authenticated using (
  bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);
-- Caminho: soma-covers/{soma_id}/{arquivo}
create policy "capa: responsável envia" on storage.objects for insert to authenticated with check (
  bucket_id = 'soma-covers' and public.is_soma_leader(((storage.foldername(name))[1])::uuid)
);
create policy "capa: responsável ou admin remove" on storage.objects for delete to authenticated using (
  bucket_id = 'soma-covers'
  and (public.is_soma_leader(((storage.foldername(name))[1])::uuid) or public.is_admin())
);

-- ---------------------------------------------------------------
-- 5) Reuniões futuras (agenda) e presença
-- ---------------------------------------------------------------
alter table public.meetings add column attendance_taken_at timestamptz;
create index meetings_soma_upcoming_idx on public.meetings(soma_id, meeting_date);

-- Fotos só em reuniões que já aconteceram (hoje ou antes).
drop policy photos_insert on public.meeting_photos;
create policy photos_insert on public.meeting_photos for insert to authenticated
  with check (
    public.is_soma_leader(soma_id) and uploaded_by = auth.uid()
    and exists (select 1 from public.meetings m where m.id = meeting_id and m.soma_id = meeting_photos.soma_id
                and m.meeting_date <= public.today_local())
  );

-- Aviso aos membros: "agendada" para datas futuras, "registrada" para as já realizadas.
create or replace function public.notify_meeting_created() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_name text; v_future boolean := new.meeting_date > public.today_local();
begin
  select name into v_name from public.somas where id = new.soma_id;
  insert into public.notifications (user_id, type, title, body, link, dedupe_key)
  select m.user_id,
         case when v_future then 'MEETING_SCHEDULED' else 'MEETING_CREATED' end,
         case when v_future then 'Reunião agendada em ' else 'Nova reunião registrada em ' end || v_name,
         coalesce(new.title, 'Reunião') || ' · ' || to_char(new.meeting_date, 'DD/MM/YYYY')
           || coalesce(' às ' || to_char(new.start_time, 'HH24:MI'), ''),
         '/somas/' || new.soma_id::text || '/reunioes/' || new.id::text, 'meeting-' || new.id::text
  from public.soma_members m
  where m.soma_id = new.soma_id and m.status = 'ACTIVE' and m.user_id <> new.created_by
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  return new;
end $$;

create table public.meeting_attendance (
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  soma_id uuid not null references public.somas(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (meeting_id, user_id)
);
create index attendance_soma_user_idx on public.meeting_attendance(soma_id, user_id);
alter table public.meeting_attendance enable row level security;
create policy attendance_select on public.meeting_attendance for select to authenticated
  using (user_id = auth.uid() or public.is_soma_leader(soma_id) or public.is_admin());

-- Grava a lista de presentes de uma reunião (substitui a anterior).
create or replace function public.set_meeting_attendance(p_meeting uuid, p_present uuid[])
returns void language plpgsql security definer set search_path = public as $$
declare v_m public.meetings;
begin
  select * into v_m from public.meetings where id = p_meeting for update;
  if not found then raise exception 'Reunião não encontrada.'; end if;
  if not public.is_soma_leader(v_m.soma_id) then raise exception 'Apenas o responsável registra a presença.'; end if;
  if v_m.meeting_date > public.today_local() then
    raise exception 'A presença só pode ser registrada a partir do dia da reunião.';
  end if;

  delete from public.meeting_attendance where meeting_id = p_meeting;
  insert into public.meeting_attendance (meeting_id, soma_id, user_id)
  select p_meeting, v_m.soma_id, m.user_id
  from public.soma_members m
  where m.soma_id = v_m.soma_id and m.status = 'ACTIVE' and m.user_id = any(coalesce(p_present, '{}'));
  update public.meetings set attendance_taken_at = now() where id = p_meeting;
end $$;

-- ---------------------------------------------------------------
-- 6) Resumo de participação (para o responsável)
--    Considera só reuniões realizadas, com presença registrada, a partir da entrada do membro
--    (ou anteriores, se o membro foi marcado presente nelas).
-- ---------------------------------------------------------------
create or replace function public.soma_participation(p_soma uuid, p_since date)
returns table (user_id uuid, full_name text, avatar_url text, role group_role, joined_at timestamptz,
               meetings_total int, present int, last_present date)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.is_soma_leader(p_soma) or public.is_admin()) then
    raise exception 'Apenas o responsável pode ver a participação.';
  end if;
  return query
  select m.user_id, p.full_name, p.avatar_url, m.role, m.joined_at,
         -- reuniões com chamada no período, desde a entrada do membro (ou em que ele foi marcado presente,
         -- caso o responsável tenha registrado reuniões anteriores ao cadastro no app)
         (select count(*)::int from public.meetings mt
           where mt.soma_id = p_soma and mt.attendance_taken_at is not null
             and mt.meeting_date between p_since and public.today_local()
             and (mt.meeting_date >= (m.joined_at at time zone 'America/Campo_Grande')::date
                  or exists (select 1 from public.meeting_attendance a where a.meeting_id = mt.id and a.user_id = m.user_id))),
         (select count(*)::int from public.meeting_attendance a join public.meetings mt on mt.id = a.meeting_id
           where a.soma_id = p_soma and a.user_id = m.user_id and mt.attendance_taken_at is not null
             and mt.meeting_date between p_since and public.today_local()),
         (select max(mt.meeting_date) from public.meeting_attendance a join public.meetings mt on mt.id = a.meeting_id
           where a.soma_id = p_soma and a.user_id = m.user_id)
  from public.soma_members m join public.profiles p on p.id = m.user_id
  where m.soma_id = p_soma and m.status = 'ACTIVE'
  order by m.role, p.full_name;
end $$;

-- ---------------------------------------------------------------
-- 7) Preferências de notificação do chat (silenciar um SOMA)
-- ---------------------------------------------------------------
alter table public.soma_members add column chat_muted boolean not null default false;

create or replace function public.set_chat_muted(p_soma uuid, p_muted boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.soma_members set chat_muted = p_muted
   where soma_id = p_soma and user_id = auth.uid() and status = 'ACTIVE';
  if not found then raise exception 'Você não participa deste SOMA.'; end if;
  if p_muted then
    update public.notifications set read_at = now()
     where user_id = auth.uid() and dedupe_key = 'chat-' || p_soma::text and read_at is null;
  end if;
end $$;

create or replace function public.notify_chat_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_name text; v_sender text;
begin
  select name into v_name from public.somas where id = new.soma_id;
  select coalesce(full_name, 'Alguém') into v_sender from public.profiles where id = new.sender_id;

  insert into public.notifications (user_id, type, title, body, link, dedupe_key)
  select m.user_id, 'CHAT_MESSAGE', 'Novas mensagens em ' || v_name,
         v_sender || ': ' || left(new.content, 80),
         '/somas/' || new.soma_id::text || '/chat', 'chat-' || new.soma_id::text
  from public.soma_members m
  where m.soma_id = new.soma_id and m.status = 'ACTIVE' and m.user_id <> new.sender_id and not m.chat_muted
  on conflict (user_id, dedupe_key) where dedupe_key is not null
  do update set read_at = null, created_at = now(), body = excluded.body, title = excluded.title;
  return new;
end $$;

-- ---------------------------------------------------------------
-- 8) Transferência de liderança (responsável ou administrador)
-- ---------------------------------------------------------------
create or replace function public.transfer_leadership(p_soma uuid, p_new_leader uuid, p_leave boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare v_soma public.somas; v_old uuid; v_admin boolean := public.is_admin();
begin
  select * into v_soma from public.somas where id = p_soma for update;
  if not found then raise exception 'SOMA não encontrado.'; end if;
  if not (public.is_soma_leader(p_soma) or v_admin) then
    raise exception 'Apenas o responsável ou um administrador pode transferir a liderança.';
  end if;
  v_old := v_soma.leader_id;
  if p_new_leader = v_old then raise exception 'Esta pessoa já é a responsável.'; end if;
  if not exists (
    select 1 from public.soma_members m join public.profiles p on p.id = m.user_id
    where m.soma_id = p_soma and m.user_id = p_new_leader and m.status = 'ACTIVE' and p.status = 'ACTIVE'
  ) then
    raise exception 'O novo responsável precisa ser um membro ativo do SOMA.';
  end if;
  if p_leave and auth.uid() <> v_old then raise exception 'Só o responsável atual pode transferir e sair.'; end if;

  -- rebaixa primeiro (índice garante um único líder ativo por SOMA)
  update public.soma_members set role = 'MEMBER' where soma_id = p_soma and role = 'LEADER' and status = 'ACTIVE';
  update public.soma_members set role = 'LEADER' where soma_id = p_soma and user_id = p_new_leader;
  update public.somas set leader_id = p_new_leader where id = p_soma;
  if p_leave then
    update public.soma_members set status = 'LEFT' where soma_id = p_soma and user_id = v_old;
  end if;

  perform public.notify(p_new_leader, 'LEADERSHIP_RECEIVED', 'Você agora é o responsável',
    'Você assumiu a liderança de ' || v_soma.name, '/somas/' || p_soma::text, null);
  if v_admin and auth.uid() <> v_old then
    perform public.notify(v_old, 'LEADERSHIP_TRANSFERRED', 'Liderança transferida',
      'A administração transferiu a liderança de ' || v_soma.name, '/somas/' || p_soma::text, null);
  end if;

  insert into public.admin_audit_log (actor_id, action, target_type, target_id, details)
  values (auth.uid(), 'LEADERSHIP_TRANSFERRED', 'soma', p_soma,
          jsonb_build_object('from', v_old, 'to', p_new_leader, 'left', p_leave, 'by_admin', v_admin and auth.uid() <> v_old));
end $$;

-- Mensagem atualizada: o responsável agora pode transferir a liderança e sair.
create or replace function public.remove_member(p_soma uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_user = auth.uid() then
    if public.is_soma_leader(p_soma) then
      raise exception 'Transfira a liderança para outro membro antes de sair do SOMA.';
    end if;
    update public.soma_members set status = 'LEFT'
     where soma_id = p_soma and user_id = p_user and status = 'ACTIVE';
  else
    if not public.is_soma_leader(p_soma) then raise exception 'Sem permissão.'; end if;
    update public.soma_members set status = 'REMOVED'
     where soma_id = p_soma and user_id = p_user and status = 'ACTIVE' and role = 'MEMBER';
  end if;
  if not found then raise exception 'Membro não encontrado.'; end if;
end $$;

-- ---------------------------------------------------------------
-- 9) Solicitações do titular (LGPD): correção ou exclusão de dados
-- ---------------------------------------------------------------
create type data_request_kind as enum ('CORRECTION', 'DELETION');
create type data_request_status as enum ('PENDING', 'DONE', 'REJECTED');

create table public.data_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind data_request_kind not null,
  details text not null check (char_length(btrim(details)) between 5 and 1000),
  status data_request_status not null default 'PENDING',
  response text check (char_length(response) <= 1000),
  handled_by uuid references public.profiles(id),
  handled_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index data_requests_one_pending_idx on public.data_requests(user_id, kind) where status = 'PENDING';
alter table public.data_requests enable row level security;
create policy data_requests_select on public.data_requests for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create or replace function public.request_data_change(p_kind data_request_kind, p_details text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Não autenticado.'; end if;
  if p_details is null or char_length(btrim(p_details)) < 5 then
    raise exception 'Descreva o pedido (mín. 5 caracteres).';
  end if;
  if exists (select 1 from public.data_requests where user_id = auth.uid() and kind = p_kind and status = 'PENDING') then
    raise exception 'Você já tem um pedido desse tipo em análise.';
  end if;
  insert into public.data_requests (user_id, kind, details) values (auth.uid(), p_kind, btrim(p_details))
  returning id into v_id;
  perform public.notify(a.id, 'DATA_REQUEST', 'Novo pedido de dados (LGPD)',
    case when p_kind = 'DELETION' then 'Pedido de exclusão de dados' else 'Pedido de correção de dados' end,
    '/admin/lgpd', 'datareq-' || v_id::text)
  from public.profiles a where a.role = 'ADMIN' and a.status = 'ACTIVE';
  return v_id;
end $$;

create or replace function public.admin_decide_data_request(p_request uuid, p_done boolean, p_response text)
returns void language plpgsql security definer set search_path = public as $$
declare v_req public.data_requests;
begin
  if not public.is_admin() then raise exception 'Apenas administradores.'; end if;
  if p_response is null or char_length(btrim(p_response)) < 5 then
    raise exception 'Escreva uma resposta ao titular (mín. 5 caracteres).';
  end if;
  select * into v_req from public.data_requests where id = p_request for update;
  if not found then raise exception 'Pedido não encontrado.'; end if;
  if v_req.status <> 'PENDING' then raise exception 'Este pedido já foi respondido.'; end if;

  update public.data_requests
     set status = case when p_done then 'DONE'::data_request_status else 'REJECTED'::data_request_status end,
         response = btrim(p_response), handled_by = auth.uid(), handled_at = now()
   where id = p_request;

  insert into public.admin_audit_log (actor_id, action, target_type, target_id, details)
  values (auth.uid(), case when p_done then 'DATA_REQUEST_DONE' else 'DATA_REQUEST_REJECTED' end,
          'user', v_req.user_id, jsonb_build_object('request_id', p_request, 'kind', v_req.kind, 'response', btrim(p_response)));

  perform public.notify(v_req.user_id, 'DATA_REQUEST_ANSWERED', 'Seu pedido sobre dados foi respondido',
    left(btrim(p_response), 120), '/perfil', 'datareqdec-' || p_request::text);
end $$;

-- Anonimiza a conta (atendimento a pedido de exclusão). Remove dados pessoais do perfil,
-- encerra participações e solicitações e bloqueia o acesso. O login em auth.users deve ser
-- apagado depois pelo painel do Supabase (exige chave de serviço, que não fica no app).
create or replace function public.admin_anonymize_user(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Apenas administradores.'; end if;
  if p_user = auth.uid() then raise exception 'Você não pode anonimizar a sua própria conta.'; end if;
  if exists (select 1 from public.somas where leader_id = p_user and status in ('PENDING', 'APPROVED', 'SUSPENDED')) then
    raise exception 'Este usuário é responsável por um SOMA. Transfira a liderança antes.';
  end if;

  update public.soma_members set status = 'LEFT', chat_muted = true where user_id = p_user and status = 'ACTIVE';
  update public.soma_join_requests set status = 'CANCELED', decided_at = now() where user_id = p_user and status = 'PENDING';
  delete from public.notifications where user_id = p_user;
  delete from public.chat_reads where user_id = p_user;
  update public.profiles
     set full_name = 'Usuário removido', phone = null, age = null, has_bases = null, avatar_url = null,
         email = 'removido-' || p_user::text || '@anonimizado.invalid', status = 'SUSPENDED'
   where id = p_user;
  if not found then raise exception 'Usuário não encontrado.'; end if;

  insert into public.admin_audit_log (actor_id, action, target_type, target_id)
  values (auth.uid(), 'USER_ANONYMIZED', 'user', p_user);
end $$;

-- ---------------------------------------------------------------
-- 10) Painel: novos indicadores
-- ---------------------------------------------------------------
create or replace function public.admin_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Apenas administradores.'; end if;
  return jsonb_build_object(
    'somas_approved', (select count(*) from public.somas where status = 'APPROVED'),
    'registrations_pending', (select count(*) from public.soma_registration_requests where status = 'PENDING'),
    'users', (select count(*) from public.profiles),
    'users_suspended', (select count(*) from public.profiles where status = 'SUSPENDED'),
    'memberships', (select count(*) from public.soma_members where status = 'ACTIVE'),
    'meetings', (select count(*) from public.meetings where meeting_date <= public.today_local()),
    'reports_open', (select count(*) from public.reports where status = 'OPEN'),
    'data_requests_pending', (select count(*) from public.data_requests where status = 'PENDING')
  );
end $$;

-- ---------------------------------------------------------------
-- Realtime: notificações já estão publicadas (selo de não lidas ao vivo).
-- ---------------------------------------------------------------

-- ---------------------------------------------------------------
-- Permissões de execução
-- ---------------------------------------------------------------
revoke all on function public.admin_set_user_status(uuid,boolean,text) from public, anon;
revoke all on function public.report_content(text,uuid,text,text) from public, anon;
revoke all on function public.admin_resolve_report(uuid,boolean,text) from public, anon;
revoke all on function public.set_meeting_attendance(uuid,uuid[]) from public, anon;
revoke all on function public.soma_participation(uuid,date) from public, anon;
revoke all on function public.set_chat_muted(uuid,boolean) from public, anon;
revoke all on function public.transfer_leadership(uuid,uuid,boolean) from public, anon;
revoke all on function public.request_data_change(data_request_kind,text) from public, anon;
revoke all on function public.admin_decide_data_request(uuid,boolean,text) from public, anon;
revoke all on function public.admin_anonymize_user(uuid) from public, anon;
grant execute on function public.admin_set_user_status(uuid,boolean,text) to authenticated;
grant execute on function public.report_content(text,uuid,text,text) to authenticated;
grant execute on function public.admin_resolve_report(uuid,boolean,text) to authenticated;
grant execute on function public.set_meeting_attendance(uuid,uuid[]) to authenticated;
grant execute on function public.soma_participation(uuid,date) to authenticated;
grant execute on function public.set_chat_muted(uuid,boolean) to authenticated;
grant execute on function public.transfer_leadership(uuid,uuid,boolean) to authenticated;
grant execute on function public.request_data_change(data_request_kind,text) to authenticated;
grant execute on function public.admin_decide_data_request(uuid,boolean,text) to authenticated;
grant execute on function public.admin_anonymize_user(uuid) to authenticated;
