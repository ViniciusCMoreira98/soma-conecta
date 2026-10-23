# SOMA Conecta

Plataforma web (pt-BR, mobile first) para gerir os SOMAS de uma igreja.
Stack: Next.js 15 (App Router) + TypeScript + Tailwind CSS + Supabase (Postgres, Auth, Storage, Realtime, RLS).

## Estado atual

| Fase | Situação |
|---|---|
| 1 — Fundação (layout, banco, autenticação, perfis) | Código escrito |
| 2 — SOMAS (cadastro, aprovação, painel, busca, solicitações de entrada) | Código escrito |
| 3 — Reuniões e fotos | Banco, RLS e bucket prontos; telas pendentes |
| 4 — Chat e notificações | Banco, RLS e Realtime prontos; notificações internas (lista) prontas; tela do chat pendente |
| 5 — Finalização | Pendente |

O projeto é validado com `npm run typecheck` e `npm run build` antes da publicação.

## Configuração

1. `npm install`
2. Crie um projeto em https://supabase.com e execute, nesta ordem, no SQL Editor:
   `supabase/migrations/0001_schema.sql` e `supabase/migrations/0002_functions_rls.sql`.
3. Copie `.env.example` para `.env.local` e preencha URL e chave *anon* (Settings → API). Nunca use a chave `service_role` no frontend.
4. **Google OAuth**: no Google Cloud Console crie credenciais OAuth (tipo "Web"), adicione como URI de redirecionamento
   `https://SEU-PROJETO.supabase.co/auth/v1/callback`, e informe Client ID/Secret em Supabase → Authentication → Providers → Google.
5. Supabase → Authentication → URL Configuration: defina *Site URL* (ex.: `http://localhost:3000`) e adicione
   `http://localhost:3000/auth/callback` (e a URL de produção) em *Redirect URLs*.
6. Authentication → Providers → Email: mantenha "Confirm email" ativo (verificação de e-mail).
7. `npm run dev` e acesse http://localhost:3000.
8. Para o primeiro administrador: crie a conta no app e rode `update public.profiles set role = 'ADMIN' where email = '...';` no SQL Editor.
   Dados de demonstração: `supabase/seed_demo.sql` (somente em ambiente de teste).

## Segurança (resumo)

- RLS ativo em todas as tabelas; escritas sensíveis passam por funções `SECURITY DEFINER` (aprovação de SOMA, entrada de membros, remoção) que validam o papel no banco.
- Gatilhos impedem que usuários alterem o próprio papel global, o status ou o responsável de um SOMA.
- A busca usa a visão `somas_public`, sem dados pessoais. O bucket `meeting-photos` é privado (acesso por URL assinada, só para membros).
- Pontos a revisar: colegas do mesmo SOMA conseguem ler as colunas de `profiles` via API (a interface só exibe nome); para restringir por coluna, exponha uma visão de diretório e retire o acesso direto.
