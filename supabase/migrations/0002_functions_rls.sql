-- SOMA Conecta — Migração 0002: funções seguras, RLS e storage

-- ---------------------------------------------------------------
-- Funções auxiliares (security definer evita recursão nas políticas)
-- ---------------------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'ADMIN' and status = 'ACTIVE'
  );
$$;

create or replace function public.is_soma_member(p_soma uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.soma_members m
    join public.somas s on s.id = m.soma_id
    where m.soma_id = p_soma and m.user_id = auth.uid()
      and m.status = 'ACTIVE' and s.status = 'APPROVED'
  );
$$;

create or replace function public.is_soma_leader(p_soma uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.soma_members m
    join public.somas s on s.id = m.soma_id
    where m.soma_id = p_soma and m.user_id = auth.uid()
      and m.role = 'LEADER' and m.status = 'ACTIVE' and s.status = 'APPROVED'
  );
$$;

create or replace function public.profile_is_complete() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select profile_completed and status = 'ACTIVE'
                   from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.notify(
  p_user uuid, p_type text, p_title text, p_body text, p_link text, p_dedupe text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, type, title, body, link, dedupe_key)
  values (p_user, p_type, p_title, p_body, p_link, p_dedupe)
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
end $$;
revoke all on function public.notify(uuid,text,text,text,text,text) from public, anon, authenticated;

-- ---------------------------------------------------------------
-- RPC: solicitar cadastro de um SOMA (cria SOMA PENDING + pedido)
-- ---------------------------------------------------------------
create or replace function public.request_soma_registration(
  p_name text, p_description text, p_neighborhood text, p_location_hint text,
  p_weekday weekday, p_start_time time, p_end_time time,
  p_frequency meeting_frequency, p_cover_url text, p_extra_info text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_soma uuid;
begin
  if v_uid is null then raise exception 'Não autenticado.'; end if;
  if not public.profile_is_complete() then
    raise exception 'Complete seu perfil antes de cadastrar um SOMA.';
  end if;

  -- Evita duplicidade: mesmo líder já com pedido pendente de mesmo nome.
  if exists (
    select 1 from public.somas
    where leader_id = v_uid and status = 'PENDING' and lower(name) = lower(p_name)
  ) then
    raise exception 'Você já enviou uma solicitação pendente para este SOMA.';
  end if;

  insert into public.somas (name, description, leader_id, neighborhood, location_hint,
    weekday, start_time, end_time, frequency, cover_url, extra_info, status)
  values (btrim(p_name), btrim(p_description), v_uid, btrim(p_neighborhood),
    nullif(btrim(p_location_hint), ''), p_weekday, p_start_time, p_end_time,
    p_frequency, p_cover_url, nullif(btrim(p_extra_info), ''), 'PENDING')
  returning id into v_soma;

  insert into public.soma_registration_requests (soma_id, requester_id)
  values (v_soma, v_uid);

  -- avisa todos os administradores ativos
  perform public.notify(a.id, 'SOMA_REGISTRATION_REQUESTED',
    'Novo SOMA aguardando aprovação', btrim(p_name), '/admin/solicitacoes',
    'reg-' || v_soma::text)
  from public.profiles a where a.role = 'ADMIN' and a.status = 'ACTIVE';

  return v_soma;
end $$;

-- ---------------------------------------------------------------
-- RPC: decisão administrativa sobre cadastro de SOMA
-- ---------------------------------------------------------------
create or replace function public.decide_soma_registration(
  p_request uuid, p_approve boolean, p_reason text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_req public.soma_registration_requests;
  v_soma public.somas;
begin
  if not public.is_admin() then raise exception 'Apenas administradores podem decidir.'; end if;

  select * into v_req from public.soma_registration_requests where id = p_request for update;
  if not found then raise exception 'Solicitação não encontrada.'; end if;
  if v_req.status <> 'PENDING' then raise exception 'Esta solicitação já foi decidida.'; end if;
  if v_req.requester_id = auth.uid() then
    raise exception 'Você não pode decidir a sua própria solicitação.';
  end if;
  if not p_approve and (p_reason is null or btrim(p_reason) = '') then
    raise exception 'Informe o motivo da rejeição.';
  end if;

  select * into v_soma from public.somas where id = v_req.soma_id for update;

  update public.soma_registration_requests
     set status = case when p_approve then 'APPROVED'::request_status else 'REJECTED'::request_status end,
         decided_by = auth.uid(), decided_at = now(),
         rejection_reason = case when p_approve then null else btrim(p_reason) end
   where id = p_request;

  update public.somas
     set status = case when p_approve then 'APPROVED'::soma_status else 'REJECTED'::soma_status end
   where id = v_soma.id;

  if p_approve then
    insert into public.soma_members (soma_id, user_id, role, status)
    values (v_soma.id, v_soma.leader_id, 'LEADER', 'ACTIVE')
    on conflict (soma_id, user_id) do update set role = 'LEADER', status = 'ACTIVE';
  end if;

  perform public.notify(v_req.requester_id,
    case when p_approve then 'SOMA_APPROVED' else 'SOMA_REJECTED' end,
    case when p_approve then 'Seu SOMA foi aprovado!' else 'Seu SOMA não foi aprovado' end,
    case when p_approve then v_soma.name else v_soma.name || ' — ' || btrim(p_reason) end,
    case when p_approve then '/somas/' || v_soma.id::text else '/meus-somas' end,
    'regdec-' || p_request::text);

  insert into public.admin_audit_log (actor_id, action, target_type, target_id, details)
  values (auth.uid(), case when p_approve then 'SOMA_APPROVED' else 'SOMA_REJECTED' end,
          'soma', v_soma.id, jsonb_build_object('reason', p_reason));
end $$;

-- ---------------------------------------------------------------
-- RPC: suspender / reativar SOMA (admin)
-- ---------------------------------------------------------------
create or replace function public.set_soma_suspended(p_soma uuid, p_suspend boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Apenas administradores.'; end if;
  update public.somas
     set status = case when p_suspend then 'SUSPENDED'::soma_status else 'APPROVED'::soma_status end
   where id = p_soma and status in ('APPROVED','SUSPENDED');
  if not found then raise exception 'SOMA não encontrado ou não elegível.'; end if;
  insert into public.admin_audit_log (actor_id, action, target_type, target_id)
  values (auth.uid(), case when p_suspend then 'SOMA_SUSPENDED' else 'SOMA_REACTIVATED' end, 'soma', p_soma);
end $$;

-- ---------------------------------------------------------------
-- RPC: solicitar entrada em um SOMA
-- ---------------------------------------------------------------
create or replace function public.request_join_soma(p_soma uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_soma public.somas;
  v_id uuid;
begin
  if v_uid is null then raise exception 'Não autenticado.'; end if;
  if not public.profile_is_complete() then raise exception 'Complete seu perfil primeiro.'; end if;

  select * into v_soma from public.somas where id = p_soma and status = 'APPROVED';
  if not found then raise exception 'SOMA indisponível.'; end if;
  if not v_soma.accepting_members then raise exception 'Este SOMA não está aceitando novos membros.'; end if;
  if exists (select 1 from public.soma_members where soma_id = p_soma and user_id = v_uid and status = 'ACTIVE') then
    raise exception 'Você já participa deste SOMA.';
  end if;
  if exists (select 1 from public.soma_join_requests where soma_id = p_soma and user_id = v_uid and status = 'PENDING') then
    raise exception 'Você já tem uma solicitação pendente para este SOMA.';
  end if;

  insert into public.soma_join_requests (soma_id, user_id) values (p_soma, v_uid) returning id into v_id;

  perform public.notify(v_soma.leader_id, 'JOIN_REQUESTED', 'Nova solicitação de entrada',
    (select full_name from public.profiles where id = v_uid) || ' quer entrar em ' || v_soma.name,
    '/somas/' || p_soma::text || '/solicitacoes', 'join-' || v_id::text);
  return v_id;
end $$;

-- RPC: cancelar a própria solicitação
create or replace function public.cancel_join_request(p_request uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.soma_join_requests
     set status = 'CANCELED', decided_at = now()
   where id = p_request and user_id = auth.uid() and status = 'PENDING';
  if not found then raise exception 'Solicitação não encontrada ou já decidida.'; end if;
end $$;

-- RPC: líder decide solicitação de entrada
create or replace function public.decide_join_request(
  p_request uuid, p_approve boolean, p_reason text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_req public.soma_join_requests;
  v_soma public.somas;
begin
  select * into v_req from public.soma_join_requests where id = p_request for update;
  if not found then raise exception 'Solicitação não encontrada.'; end if;
  if not (public.is_soma_leader(v_req.soma_id)) then raise exception 'Apenas o responsável do SOMA pode decidir.'; end if;
  if v_req.status <> 'PENDING' then raise exception 'Solicitação já decidida.'; end if;

  select * into v_soma from public.somas where id = v_req.soma_id;

  update public.soma_join_requests
     set status = case when p_approve then 'APPROVED'::request_status else 'REJECTED'::request_status end,
         decided_by = auth.uid(), decided_at = now(),
         rejection_reason = case when p_approve then null else nullif(btrim(p_reason), '') end
   where id = p_request;

  if p_approve then
    insert into public.soma_members (soma_id, user_id, role, status)
    values (v_req.soma_id, v_req.user_id, 'MEMBER', 'ACTIVE')
    on conflict (soma_id, user_id) do update set status = 'ACTIVE', role = 'MEMBER', joined_at = now();
  end if;

  perform public.notify(v_req.user_id,
    case when p_approve then 'JOIN_APPROVED' else 'JOIN_REJECTED' end,
    case when p_approve then 'Entrada aprovada!' else 'Solicitação não aprovada' end,
    v_soma.name,
    case when p_approve then '/somas/' || v_soma.id::text else '/meus-somas' end,
    'joindec-' || p_request::text);
end $$;

-- RPC: remover membro (líder) / sair do SOMA (membro)
create or replace function public.remove_member(p_soma uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_user = auth.uid() then
    -- sair do grupo: o líder não pode sair sem transferir a liderança
    if public.is_soma_leader(p_soma) then
      raise exception 'O responsável não pode sair do SOMA. Peça a um administrador para transferir a liderança.';
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

-- RPC: marcar chat como lido
create or replace function public.mark_chat_read(p_soma uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_soma_member(p_soma) then raise exception 'Sem acesso.'; end if;
  insert into public.chat_reads (soma_id, user_id, last_read_at) values (p_soma, auth.uid(), now())
  on conflict (soma_id, user_id) do update set last_read_at = now();
end $$;

-- ---------------------------------------------------------------
-- Visão pública dos SOMAs (sem dados pessoais) para a busca
-- ---------------------------------------------------------------
create or replace view public.somas_public
with (security_invoker = false) as
select s.id, s.name, s.description, s.neighborhood, s.weekday, s.start_time, s.end_time,
       s.frequency, s.cover_url, s.accepting_members,
       p.full_name as leader_name,
       (select count(*) from public.soma_members m where m.soma_id = s.id and m.status = 'ACTIVE') as member_count
from public.somas s
join public.profiles p on p.id = s.leader_id
where s.status = 'APPROVED';

revoke all on public.somas_public from anon;
grant select on public.somas_public to authenticated;

-- ---------------------------------------------------------------
-- Dashboard administrativo
-- ---------------------------------------------------------------
create or replace function public.admin_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Apenas administradores.'; end if;
  return jsonb_build_object(
    'somas_approved', (select count(*) from public.somas where status = 'APPROVED'),
    'registrations_pending', (select count(*) from public.soma_registration_requests where status = 'PENDING'),
    'users', (select count(*) from public.profiles),
    'memberships', (select count(*) from public.soma_members where status = 'ACTIVE'),
    'meetings', (select count(*) from public.meetings)
  );
end $$;

-- ---------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.somas enable row level security;
alter table public.soma_members enable row level security;
alter table public.soma_registration_requests enable row level security;
alter table public.soma_join_requests enable row level security;
alter table public.meetings enable row level security;
alter table public.meeting_photos enable row level security;
alter table public.messages enable row level security;
alter table public.chat_reads enable row level security;
alter table public.notifications enable row level security;
alter table public.admin_audit_log enable row level security;

-- profiles: o próprio usuário, admins, ou colegas de um mesmo SOMA / solicitantes do SOMA que lidera
create policy profiles_select on public.profiles for select to authenticated using (
  id = auth.uid() or public.is_admin()
  or exists (
    select 1 from public.soma_members a join public.soma_members b on a.soma_id = b.soma_id
    where a.user_id = auth.uid() and a.status = 'ACTIVE' and b.user_id = profiles.id and b.status = 'ACTIVE'
  )
  or exists (
    select 1 from public.soma_join_requests r
    where r.user_id = profiles.id and public.is_soma_leader(r.soma_id)
  )
);
-- atualização: só o próprio, e colunas sensíveis são protegidas pelo trigger abaixo
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_update_admin on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create or replace function public.protect_profile_columns() returns trigger
language plpgsql as $$
begin
  if auth.uid() is not null and not public.is_admin() and (new.role is distinct from old.role or new.status is distinct from old.status
      or new.email is distinct from old.email or new.id is distinct from old.id) then
    raise exception 'Alteração não permitida.';
  end if;
  return new;
end $$;
create trigger profiles_protect before update on public.profiles
for each row execute function public.protect_profile_columns();

-- somas: líder/admin/membros leem o próprio; edição restrita ao líder (campos) ou admin
create policy somas_select on public.somas for select to authenticated using (
  public.is_admin() or leader_id = auth.uid() or public.is_soma_member(id)
);
create policy somas_update_leader on public.somas for update to authenticated
  using (public.is_soma_leader(id)) with check (public.is_soma_leader(id));

create or replace function public.protect_soma_columns() returns trigger
language plpgsql as $$
begin
  if auth.uid() is not null and not public.is_admin() and (new.status is distinct from old.status
      or new.leader_id is distinct from old.leader_id) then
    raise exception 'Alteração não permitida.';
  end if;
  return new;
end $$;
create trigger somas_protect before update on public.somas
for each row execute function public.protect_soma_columns();

-- soma_members: leitura para membros do grupo e admin; escrita só via RPC
create policy members_select on public.soma_members for select to authenticated using (
  public.is_admin() or user_id = auth.uid() or public.is_soma_member(soma_id)
);

-- pedidos de cadastro: solicitante e admin leem; escrita só via RPC
create policy reg_select on public.soma_registration_requests for select to authenticated using (
  public.is_admin() or requester_id = auth.uid()
);

-- pedidos de entrada: o usuário, o líder e admin leem; escrita só via RPC
create policy join_select on public.soma_join_requests for select to authenticated using (
  user_id = auth.uid() or public.is_soma_leader(soma_id) or public.is_admin()
);

-- reuniões: membros leem; líder escreve
create policy meetings_select on public.meetings for select to authenticated using (
  public.is_soma_member(soma_id) or public.is_admin()
);
create policy meetings_insert on public.meetings for insert to authenticated
  with check (public.is_soma_leader(soma_id) and created_by = auth.uid());
create policy meetings_update on public.meetings for update to authenticated
  using (public.is_soma_leader(soma_id)) with check (public.is_soma_leader(soma_id));
create policy meetings_delete on public.meetings for delete to authenticated
  using (public.is_soma_leader(soma_id));

-- fotos
create policy photos_select on public.meeting_photos for select to authenticated using (
  public.is_soma_member(soma_id) or public.is_admin()
);
create policy photos_insert on public.meeting_photos for insert to authenticated
  with check (
    public.is_soma_leader(soma_id) and uploaded_by = auth.uid()
    and exists (select 1 from public.meetings m where m.id = meeting_id and m.soma_id = meeting_photos.soma_id)
  );
create policy photos_delete on public.meeting_photos for delete to authenticated
  using (public.is_soma_leader(soma_id));

-- chat: somente membros ativos do SOMA, enviando como si mesmos
create policy messages_select on public.messages for select to authenticated using (public.is_soma_member(soma_id));
create policy messages_insert on public.messages for insert to authenticated
  with check (public.is_soma_member(soma_id) and sender_id = auth.uid());
create policy chat_reads_own on public.chat_reads for select to authenticated using (user_id = auth.uid());

-- notificações: só o dono lê e marca como lida
create policy notif_select on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notif_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- auditoria: só admins leem
create policy audit_select on public.admin_audit_log for select to authenticated using (public.is_admin());

-- Realtime do chat (as políticas RLS acima também valem para o Realtime)
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;

-- ---------------------------------------------------------------
-- Permissões de execução das RPCs
-- ---------------------------------------------------------------
revoke all on function public.request_soma_registration(text,text,text,text,weekday,time,time,meeting_frequency,text,text) from public, anon;
revoke all on function public.decide_soma_registration(uuid,boolean,text) from public, anon;
revoke all on function public.set_soma_suspended(uuid,boolean) from public, anon;
revoke all on function public.request_join_soma(uuid) from public, anon;
revoke all on function public.cancel_join_request(uuid) from public, anon;
revoke all on function public.decide_join_request(uuid,boolean,text) from public, anon;
revoke all on function public.remove_member(uuid,uuid) from public, anon;
revoke all on function public.mark_chat_read(uuid) from public, anon;
revoke all on function public.admin_stats() from public, anon;
grant execute on function public.request_soma_registration(text,text,text,text,weekday,time,time,meeting_frequency,text,text) to authenticated;
grant execute on function public.decide_soma_registration(uuid,boolean,text) to authenticated;
grant execute on function public.set_soma_suspended(uuid,boolean) to authenticated;
grant execute on function public.request_join_soma(uuid) to authenticated;
grant execute on function public.cancel_join_request(uuid) to authenticated;
grant execute on function public.decide_join_request(uuid,boolean,text) to authenticated;
grant execute on function public.remove_member(uuid,uuid) to authenticated;
grant execute on function public.mark_chat_read(uuid) to authenticated;
grant execute on function public.admin_stats() to authenticated;

-- ---------------------------------------------------------------
-- Storage: buckets privados (sem links públicos permanentes)
-- Caminho das fotos: {soma_id}/{meeting_id}/{arquivo}
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meeting-photos', 'meeting-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "fotos: membros leem" on storage.objects for select to authenticated using (
  bucket_id = 'meeting-photos'
  and public.is_soma_member(((storage.foldername(name))[1])::uuid)
);
create policy "fotos: líder envia" on storage.objects for insert to authenticated with check (
  bucket_id = 'meeting-photos'
  and public.is_soma_leader(((storage.foldername(name))[1])::uuid)
);
create policy "fotos: líder remove" on storage.objects for delete to authenticated using (
  bucket_id = 'meeting-photos'
  and public.is_soma_leader(((storage.foldername(name))[1])::uuid)
);
