-- SOMA Conecta — dados de DEMONSTRAÇÃO (nunca execute em produção).
-- Pré-requisito: crie 2 contas pelo app (ex.: lider@exemplo.com e admin@exemplo.com)
-- e complete o perfil de cada uma. Depois ajuste os e-mails abaixo e execute no SQL Editor.

-- 1) Promover um usuário a administrador (o SQL Editor roda sem auth.uid(), por isso é permitido)
update public.profiles set role = 'ADMIN' where email = 'admin@exemplo.com';

-- 2) SOMAS de demonstração, já aprovados, liderados por lider@exemplo.com
with leader as (select id from public.profiles where email = 'lider@exemplo.com'),
ins as (
  insert into public.somas (name, description, leader_id, neighborhood, weekday, start_time, end_time, frequency, status)
  select v.name, v.description, leader.id, v.neighborhood, v.weekday::weekday, v.start_time::time, v.end_time::time, 'SEMANAL', 'APPROVED'
  from leader, (values
    ('[DEMO] SOMA Esperança', 'Grupo de comunhão e estudo bíblico para famílias.', 'Centro', 'QUARTA', '19:30', '21:00'),
    ('[DEMO] SOMA Jovens Vida', 'Encontro semanal de jovens com louvor e oração.', 'Vila Carvalho', 'SEXTA', '20:00', '22:00'),
    ('[DEMO] SOMA Manhã de Paz', 'Café, oração e partilha da Palavra pela manhã.', 'Tiradentes', 'SABADO', '09:00', '10:30')
  ) as v(name, description, neighborhood, weekday, start_time, end_time)
  returning id, leader_id
)
insert into public.soma_members (soma_id, user_id, role, status)
select id, leader_id, 'LEADER', 'ACTIVE' from ins;
