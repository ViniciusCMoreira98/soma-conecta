-- SOMA Conecta — Migração 0008: "Reuniões" passam a se chamar "Encontros" nos textos gerados pelo banco
-- (somente textos exibidos; tabelas, tipos e rotas continuam com "meetings"/"reunioes").

create or replace function public.notify_meeting_created() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_name text; v_future boolean := new.meeting_date > public.today_local();
begin
  select name into v_name from public.somas where id = new.soma_id;
  insert into public.notifications (user_id, type, title, body, link, dedupe_key)
  select m.user_id,
         case when v_future then 'MEETING_SCHEDULED' else 'MEETING_CREATED' end,
         case when v_future then 'Encontro agendado em ' else 'Novo encontro registrado em ' end || v_name,
         coalesce(new.title, 'Encontro') || ' · ' || to_char(new.meeting_date, 'DD/MM/YYYY')
           || coalesce(' às ' || to_char(new.start_time, 'HH24:MI'), ''),
         '/somas/' || new.soma_id::text || '/reunioes/' || new.id::text, 'meeting-' || new.id::text
  from public.soma_members m
  where m.soma_id = new.soma_id and m.status = 'ACTIVE' and m.user_id <> new.created_by
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  return new;
end $$;

create or replace function public.set_meeting_attendance(p_meeting uuid, p_present uuid[])
returns void language plpgsql security definer set search_path = public as $$
declare v_m public.meetings;
begin
  select * into v_m from public.meetings where id = p_meeting for update;
  if not found then raise exception 'Encontro não encontrado.'; end if;
  if not public.is_soma_leader(v_m.soma_id) then raise exception 'Apenas o responsável registra a presença.'; end if;
  if v_m.meeting_date > public.today_local() then
    raise exception 'A presença só pode ser registrada a partir do dia do encontro.';
  end if;

  delete from public.meeting_attendance where meeting_id = p_meeting;
  insert into public.meeting_attendance (meeting_id, soma_id, user_id)
  select p_meeting, v_m.soma_id, m.user_id
  from public.soma_members m
  where m.soma_id = v_m.soma_id and m.status = 'ACTIVE' and m.user_id = any(coalesce(p_present, '{}'));
  update public.meetings set attendance_taken_at = now() where id = p_meeting;
end $$;

-- Ajusta os títulos das notificações já enviadas.
update public.notifications
   set title = replace(replace(title, 'Nova reunião registrada em ', 'Novo encontro registrado em '),
                       'Reunião agendada em ', 'Encontro agendado em '),
       body = regexp_replace(body, '^Reunião( · |$)', 'Encontro\1')
 where type in ('MEETING_CREATED', 'MEETING_SCHEDULED');
