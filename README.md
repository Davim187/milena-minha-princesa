# PROJETO: ELA

Experiência interativa em React + Vite + TypeScript + Tailwind.

Hospedagem: **GitHub Pages**  
Banco: **Supabase** (PostgreSQL)

Não há servidor Node próprio. O navegador fala direto com o Supabase.

```
GitHub Pages → React → Supabase → PostgreSQL
```

Nada do que é coletado aparece na tela. Não use `SUPABASE_SERVICE_ROLE_KEY` no frontend — só a **anon key**.

---

## 1. Criar o projeto no Supabase

1. Acesse [https://supabase.com](https://supabase.com) e crie um projeto.
2. Em **Project Settings → API**, copie:
   - Project URL → `VITE_SUPABASE_URL`
   - `anon` `public` key → `VITE_SUPABASE_ANON_KEY`
3. Não copie a `service_role` key.

## 2. Executar o SQL das tabelas

1. Abra **SQL Editor**.
2. Cole o conteúdo de `supabase/schema.sql`.
3. Rode o script.

Para já ver as 3 perguntas nas tabelas, rode também `supabase/seed.sql`.
Isso cria um registro de exemplo (`sessao_id = seed-catalogo`) com perguntas e opções zeradas.
Quando ela abrir o site, uma sessão nova é criada e as 3 perguntas são registradas de novo, de verdade.

Isso cria as tabelas, foreign keys, índices, trigger de `atualizado_em`, funções de clique/resposta/finalização e as políticas RLS.

## 3. Row Level Security (RLS)

O SQL já ativa RLS em todas as tabelas.

O que o frontend (anon) pode fazer:

- **INSERT** em sessões, perguntas, opções e eventos
- chamar as funções `registrar_clique`, `definir_resposta_final` e `finalizar_experiencia`

O que o frontend **não** pode fazer:

- **SELECT** de respostas, cliques ou eventos de outras pessoas
- listar todas as experiências
- alterar dados direto com `UPDATE` nas tabelas

Para ver os dados, use o painel do Supabase (Table Editor), autenticado na sua conta.

## 4. Configurar `.env`

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_BASE_PATH=/
```

Em produção no GitHub Pages, `VITE_BASE_PATH` deve ser `/NOME_DO_REPOSITORIO/`.

## 5. Rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`.

Se o Supabase estiver offline, a experiência continua. Os eventos ficam em `localStorage` (`projeto_ela_pending_events`) e são enviados quando a conexão volta.

## 6. Build

```bash
npm run build
```

O `dist/` inclui `404.html` para a SPA no GitHub Pages.

## 7. GitHub Pages

1. **Settings → Pages** → fonte **GitHub Actions**.
2. Em **Settings → Secrets and variables → Actions**, crie os secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Opcional: variável `VITE_BASE_PATH` (ex.: `/Milena/`). Sem ela, o workflow usa o nome do repositório.
4. `git push` na branch `main`.

O workflow `.github/workflows/deploy.yml` instala, faz o build e publica o `dist`.

Não coloque a `service_role` key no GitHub Actions do frontend.

## Personalizar

Edite `src/config.ts`. Trilha opcional: `public/soundtrack.mp3`.

## O que é gravado (em silêncio)

- sessão
- cada pergunta, com as opções
- cada clique (evento individual)
- quantidade de cliques por opção
- resposta final
- tentativas no botão “Não”
- etapas, easter eggs, música, WhatsApp, finalização

A tela final e o restante da experiência visual permanecem iguais.
