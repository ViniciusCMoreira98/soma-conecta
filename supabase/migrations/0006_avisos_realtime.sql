-- SOMA Conecta — Migração 0006: avisos do SOMA em tempo real (contador da aba Avisos)
alter publication supabase_realtime add table public.soma_announcements;
