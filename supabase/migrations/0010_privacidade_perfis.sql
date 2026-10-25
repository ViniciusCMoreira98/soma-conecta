-- SOMA Conecta — Migração 0010: dados pessoais do perfil (celular, idade, e-mail, bases) protegidos por coluna
--
-- Antes: a RLS de profiles libera a LINHA inteira para quem divide um SOMA, então qualquer membro conseguia ler
-- celular/idade/e-mail dos outros pela API (a interface só não mostrava).
-- Agora:
--   • profiles: usuários comuns leem apenas id, nome e foto (privilégio por coluna).
--   • profiles_private: dados completos, só para o próprio usuário, administradores e o responsável
--     (sobre membros ativos do seu SOMA e quem tem pedido de entrada PENDENTE nele).

-- 1) Privilégio por coluna em profiles
revoke select on public.profiles from anon, authenticated;
grant select (id, full_name, avatar_url) on public.profiles to authenticated;

-- 2) Visão com os dados pessoais, filtrada por quem pode vê-los.
--    Roda com os privilégios do dono (security_invoker = false): o filtro abaixo é a regra de acesso.
create or replace view public.profiles_private
with (security_invoker = false) as
select p.id, p.full_name, p.email, p.phone, p.age, p.has_bases, p.avatar_url,
       p.role, p.status, p.profile_completed, p.created_at, p.updated_at
from public.profiles p
where p.id = auth.uid()
   or public.is_admin()
   or exists (
     select 1 from public.soma_members m
     where m.user_id = p.id and m.status = 'ACTIVE' and public.is_soma_leader(m.soma_id)
   )
   or exists (
     select 1 from public.soma_join_requests r
     where r.user_id = p.id and r.status = 'PENDING' and public.is_soma_leader(r.soma_id)
   );

revoke all on public.profiles_private from public, anon;
grant select on public.profiles_private to authenticated;

-- Obs.: a RLS de profiles (quem divide SOMA ou pediu entrada) continua igual. Com o privilégio por coluna,
-- essas linhas expõem só id, nome e foto — o necessário para chat, membros e histórico de solicitações.
