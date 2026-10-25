# SOMA Conecta

Plataforma web (pt-BR, mobile first) para gerir os SOMAS de uma igreja.
Stack: Next.js 15 (App Router) + TypeScript + Tailwind CSS + Supabase (Postgres, Auth, Storage, Realtime, RLS).

📐 Arquitetura, padrões e organização do projeto: [docs/ARQUITETURA.md](docs/ARQUITETURA.md)

## Estado atual

| Fase | Situação |
|---|---|
| 1 — Fundação (layout, banco, autenticação, perfis) | Código escrito |
| 2 — SOMAS (cadastro, aprovação, painel, busca, solicitações de entrada) | Código escrito |
| 3 — Reuniões e fotos | Código escrito (reuniões, galeria por reunião, URLs assinadas) |
| 4 — Chat e notificações | Código escrito (chat em tempo real, não lidas, notificações agregadas) |
| 5 — Finalização | Código escrito (ver abaixo) |

O projeto é validado com `npm run typecheck` e `npm run build` antes da publicação.

## Configuração

1. `npm install`
2. Crie um projeto em https://supabase.com e execute, nesta ordem, no SQL Editor:
   `0001_schema.sql`, `0002_functions_rls.sql`, `0003_chat_notifications.sql` e `0004_fase5.sql` (pasta `supabase/migrations`).
   Em um banco que já tem 0001–0003, execute apenas `0004_fase5.sql`.
3. Copie `.env.example` para `.env.local` e preencha URL e chave *anon* (Settings → API). Nunca use a chave `service_role` no frontend.
4. **Google OAuth**: no Google Cloud Console crie credenciais OAuth (tipo "Web"), adicione como URI de redirecionamento
   `https://SEU-PROJETO.supabase.co/auth/v1/callback`, e informe Client ID/Secret em Supabase → Authentication → Providers → Google.
5. Supabase → Authentication → URL Configuration: defina *Site URL* (ex.: `http://localhost:3000`) e adicione
   `http://localhost:3000/auth/callback` (e a URL de produção) em *Redirect URLs*.
6. Authentication → Providers → Email: mantenha "Confirm email" ativo (verificação de e-mail).
7. `npm run dev` e acesse http://localhost:3000.
8. Para o primeiro administrador: crie a conta no app e rode `update public.profiles set role = 'ADMIN' where email = '...';` no SQL Editor.
   Dados de demonstração: `supabase/seed_demo.sql` (somente em ambiente de teste).

## Fase 5 — o que foi incluído

| Área | Funcionalidade | Onde |
|---|---|---|
| Admin | Gestão de usuários: busca (nome, e-mail, celular), filtros, suspender com motivo / reativar, histórico por usuário | `/admin/usuarios`, `/admin/usuarios/[id]` |
| Admin | Histórico geral de ações administrativas, com filtros | `/admin/historico` |
| Admin | Denúncias e moderação: fila agrupada por conteúdo, remoção de mensagens e fotos, arquivamento, aviso a quem denunciou e ao autor | `/admin/denuncias` |
| Admin | Membros de cada SOMA (ativos ou todos os vínculos) e transferência de liderança | `/admin/somas/[id]` |
| Admin | Pedidos LGPD: resposta ao titular e exclusão (anonimização) de dados pessoais | `/admin/lgpd`, página do usuário |
| Membro | Botão “Denunciar” nas mensagens do chat e nas fotos | chat, fotos |
| Membro | Foto de perfil (upload/remoção) | `/perfil` |
| Membro | Silenciar notificações do chat por SOMA | chat e `/perfil` |
| Membro | “Solicitar entrada” direto no cartão da busca (mantém os filtros) | `/encontrar` |
| Membro | Pedido de correção ou exclusão de dados (LGPD) com acompanhamento | `/perfil` |
| Todos | Selo de notificações não lidas em todas as páginas, atualizado ao vivo; abrir um aviso o marca como lido | menu |
| Responsável | Imagem de capa do SOMA (aparece na busca e na visão geral) | `/somas/[id]/configuracoes` |
| Responsável | Agendar reuniões futuras; visão geral mostra próxima e última reunião | `/somas/[id]/reunioes` |
| Responsável | Lista de presença por reunião e resumo de participação (30 dias a 12 meses) | reunião, `/somas/[id]/participacao` |
| Responsável | Transferir a liderança (e opcionalmente sair do SOMA) | `/somas/[id]/membros` |

Notas:
- Fotos e presença só podem ser registradas a partir do dia da reunião (validado também no banco).
- Contas suspensas perdem o acesso aos SOMAS também pela API (as funções `is_soma_member`/`is_soma_leader` checam a conta).
- Exclusão LGPD: “Excluir dados pessoais” anonimiza o perfil e encerra participações; o login em `auth.users`
  deve ser apagado em Supabase → Authentication → Users (exige a chave de serviço, que não fica no app).
- Os buckets `avatars` e `soma-covers` são públicos com nomes aleatórios (as imagens aparecem na busca e no chat sem URL assinada).
  As fotos das reuniões continuam privadas.

## Segurança (resumo)

- RLS ativo em todas as tabelas; escritas sensíveis passam por funções `SECURITY DEFINER` (aprovação de SOMA, entrada de membros, remoção) que validam o papel no banco.
- Gatilhos impedem que usuários alterem o próprio papel global, o status ou o responsável de um SOMA.
- A busca usa a visão `somas_public`, sem dados pessoais. O bucket `meeting-photos` é privado (acesso por URL assinada, só para membros).
- Pontos a revisar: colegas do mesmo SOMA conseguem ler as colunas de `profiles` via API (a interface só exibe nome); para restringir por coluna, exponha uma visão de diretório e retire o acesso direto.
