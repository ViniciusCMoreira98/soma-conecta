-- SOMA Conecta — Migração 0009: busca por proximidade e pedidos de oração

-- ---------------------------------------------------------------
-- 1) Localização do SOMA (definida pelo responsável; também em SOMAs pendentes)
--    Guardada com 4 casas decimais (~11 m). As coordenadas nunca são expostas na busca:
--    somas_nearby devolve apenas a distância, arredondada.
-- ---------------------------------------------------------------
create or replace function public.set_soma_location(p_soma uuid, p_lat double precision, p_lng double precision)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (exists (select 1 from public.somas where id = p_soma and leader_id = auth.uid()) or public.is_admin()) then
    raise exception 'Apenas o responsável pode definir a localização.';
  end if;
  if (p_lat is null) <> (p_lng is null) or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'Localização inválida.';
  end if;
  update public.somas
     set latitude = round(p_lat::numeric, 4), longitude = round(p_lng::numeric, 4)
   where id = p_soma;
end $$;

-- SOMAs aprovados dentro do raio (km), do mais próximo ao mais distante (distância de Haversine).
-- Distância arredondada: 0.5 = "menos de 1 km"; acima disso, km inteiros.
create or replace function public.somas_nearby(p_lat double precision, p_lng double precision, p_radius_km double precision default 10)
returns table (
  id uuid, name text, description text, neighborhood text, weekday weekday, start_time time,
  cover_url text, accepting_members boolean, leader_name text, member_count bigint, distance_km numeric
)
language sql stable security definer set search_path = public as $$
  select v.id, v.name, v.description, v.neighborhood, v.weekday, v.start_time,
         v.cover_url, v.accepting_members, v.leader_name, v.member_count,
         case when d.km < 1 then 0.5 else round(d.km::numeric) end
  from public.somas_public v
  join public.somas s on s.id = v.id
  cross join lateral (
    select 6371 * 2 * asin(sqrt(
      power(sin(radians(s.latitude - p_lat) / 2), 2)
      + cos(radians(p_lat)) * cos(radians(s.latitude)) * power(sin(radians(s.longitude - p_lng) / 2), 2)
    )) as km
  ) d
  where auth.uid() is not null
    and s.latitude is not null and s.longitude is not null
    and d.km <= least(greatest(coalesce(p_radius_km, 10), 1), 100)
  order by d.km
$$;

revoke all on function public.set_soma_location(uuid, double precision, double precision) from public, anon;
revoke all on function public.somas_nearby(double precision, double precision, double precision) from public, anon;
grant execute on function public.set_soma_location(uuid, double precision, double precision) to authenticated;
grant execute on function public.somas_nearby(double precision, double precision, double precision) to authenticated;

-- ---------------------------------------------------------------
-- 2) Pedidos de oração (por SOMA, visíveis apenas aos membros)
-- ---------------------------------------------------------------
create table public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  soma_id uuid not null references public.somas(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  content text not null check (char_length(btrim(content)) between 1 and 1000),
  is_anonymous boolean not null default false,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);
create index prayer_requests_soma_idx on public.prayer_requests(soma_id, created_at desc);

create table public.prayer_support (
  request_id uuid not null references public.prayer_requests(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (request_id, user_id)
);

alter table public.prayer_requests enable row level security;
alter table public.prayer_support enable row level security;

-- Leitura direta só pelo autor/admin: os membros leem via list_prayers, que oculta o autor dos pedidos anônimos.
create policy prayers_select on public.prayer_requests for select to authenticated
  using (author_id = auth.uid() or public.is_admin());
create policy prayers_insert on public.prayer_requests for insert to authenticated
  with check (public.is_soma_member(soma_id) and author_id = auth.uid());
create policy prayers_delete on public.prayer_requests for delete to authenticated
  using (author_id = auth.uid() or public.is_soma_leader(soma_id) or public.is_admin());

create policy prayer_support_own on public.prayer_support for select to authenticated
  using (user_id = auth.uid());

create or replace function public.list_prayers(p_soma uuid)
returns table (
  id uuid, content text, is_anonymous boolean, author_name text, author_avatar text, is_mine boolean,
  answered_at timestamptz, created_at timestamptz, pray_count int, i_pray boolean
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.is_soma_member(p_soma) or public.is_admin()) then raise exception 'Sem acesso.'; end if;
  return query
  select r.id, r.content, r.is_anonymous,
         case when r.is_anonymous and r.author_id is distinct from auth.uid() then null else p.full_name end,
         case when r.is_anonymous and r.author_id is distinct from auth.uid() then null else p.avatar_url end,
         coalesce(r.author_id = auth.uid(), false),
         r.answered_at, r.created_at,
         (select count(*)::int from public.prayer_support s where s.request_id = r.id),
         exists (select 1 from public.prayer_support s where s.request_id = r.id and s.user_id = auth.uid())
  from public.prayer_requests r
  left join public.profiles p on p.id = r.author_id
  where r.soma_id = p_soma
  order by (r.answered_at is not null), r.created_at desc
  limit 100;
end $$;

-- "Estou orando": liga/desliga o apoio do membro a um pedido. Devolve o novo estado.
create or replace function public.toggle_prayer_support(p_request uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_soma uuid;
begin
  select soma_id into v_soma from public.prayer_requests where id = p_request;
  if not found or not public.is_soma_member(v_soma) then raise exception 'Pedido não encontrado.'; end if;
  delete from public.prayer_support where request_id = p_request and user_id = auth.uid();
  if found then return false; end if;
  insert into public.prayer_support (request_id, user_id) values (p_request, auth.uid());
  return true;
end $$;

-- O autor marca (ou desmarca) o pedido como respondido.
create or replace function public.set_prayer_answered(p_request uuid, p_answered boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.prayer_requests set answered_at = case when p_answered then now() else null end
   where id = p_request and author_id = auth.uid();
  if not found then raise exception 'Apenas quem fez o pedido pode marcá-lo como respondido.'; end if;
end $$;

-- Remoção pelo autor, pelo responsável do SOMA ou por administrador. Feita por função porque o responsável
-- não lê a tabela diretamente (o que revelaria o autor dos pedidos anônimos).
create or replace function public.delete_prayer(p_request uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v public.prayer_requests;
begin
  select * into v from public.prayer_requests where id = p_request;
  if not found then raise exception 'Pedido não encontrado.'; end if;
  if not (v.author_id = auth.uid() or public.is_soma_leader(v.soma_id) or public.is_admin()) then
    raise exception 'Você não pode remover este pedido.';
  end if;
  delete from public.prayer_requests where id = p_request;
end $$;

revoke all on function public.delete_prayer(uuid) from public, anon;
grant execute on function public.delete_prayer(uuid) to authenticated;
revoke all on function public.list_prayers(uuid) from public, anon;
revoke all on function public.toggle_prayer_support(uuid) from public, anon;
revoke all on function public.set_prayer_answered(uuid, boolean) from public, anon;
grant execute on function public.list_prayers(uuid) to authenticated;
grant execute on function public.toggle_prayer_support(uuid) to authenticated;
grant execute on function public.set_prayer_answered(uuid, boolean) to authenticated;
