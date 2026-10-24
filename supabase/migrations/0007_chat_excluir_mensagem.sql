-- SOMA Conecta — Migração 0007: exclusão de mensagens do chat
-- Autor exclui a própria mensagem; o responsável do SOMA exclui qualquer mensagem do seu chat.
-- (A remoção pelo administrador já existe em messages_delete_admin.)
create policy messages_delete_own_or_leader on public.messages for delete to authenticated using (
  sender_id = auth.uid() or public.is_soma_leader(soma_id)
);
