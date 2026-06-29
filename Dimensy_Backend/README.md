# Dimensy Backend

API REST em Node.js + Express com Supabase (PostgreSQL + Auth).

## Requisitos

- Node.js >= 18
- Conta no [Supabase](https://supabase.com)
- Conta no [Render](https://render.com) para hospedagem

## Instalação

```bash
npm install
cp .env.example .env
# Preencha as variáveis no .env
npm run dev
```

## Variáveis de Ambiente

| Variável | Descrição |
|---|---|
| `PORT` | Porta do servidor (padrão: 3000) |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role Key (não a anon key!) |
| `VAPID_PUBLIC_KEY` | Chave pública VAPID para Web Push |
| `VAPID_PRIVATE_KEY` | Chave privada VAPID para Web Push |
| `VAPID_EMAIL` | E-mail para VAPID (ex: mailto:seu@email.com) |
| `FRONTEND_URL` | URL do frontend (para CORS) |

### Gerar chaves VAPID

```bash
npx web-push generate-vapid-keys
```

## Endpoints

### Auth
- `POST /api/auth/register` — Cadastro
- `POST /api/auth/login` — Login
- `POST /api/auth/logout` — Logout (requer token)
- `GET  /api/auth/me` — Usuário atual (requer token)

### Empresas
- `GET  /api/companies/me` — Minha empresa (requer token)
- `POST /api/companies` — Criar empresa (requer token)
- `PUT  /api/companies/:id` — Atualizar empresa (requer token)
- `GET  /api/companies/slug/:slug` — Página pública (sem auth)

### Ramos
- `GET  /api/branches` — Todos os ramos (sem auth)
- `GET  /api/branches/company/:id` — Ramos da empresa (requer token)
- `POST /api/branches/company/:id` — Adicionar ramo (requer token)
- `DELETE /api/branches/company/:companyId/:branchId` — Remover (requer token)

### Serviços
- `GET  /api/services/company/:id` — Serviços da empresa (requer token)
- `POST /api/services/company/:id` — Adicionar serviço (requer token)
- `PATCH /api/services/company/:id/:serviceId` — Ativar/desativar (requer token)
- `DELETE /api/services/company/:id/:serviceId` — Remover (requer token)

### Leads
- `POST /api/leads` — Enviar formulário (sem auth — clientes)
- `GET  /api/leads/company/:id` — Listar leads (requer token)
- `GET  /api/leads/:id` — Buscar lead (requer token)
- `PATCH /api/leads/:id/status` — Atualizar status (requer token)

### Notificações
- `GET  /api/notifications/company/:id` — Listar (requer token)
- `PATCH /api/notifications/:id/read` — Marcar lida (requer token)
- `PATCH /api/notifications/company/:id/read-all` — Marcar todas (requer token)
- `POST /api/notifications/subscribe` — Salvar push subscription (requer token)

## Deploy no Render

1. Crie um novo **Web Service** no Render
2. Conecte o repositório
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Adicione as variáveis de ambiente

## Configuração do Supabase

1. Crie um projeto no Supabase
2. Execute o SQL em `schema.sql` no SQL Editor
3. Ative Row Level Security (RLS) — já incluso no schema
4. Copie a `SERVICE_ROLE_KEY` (não a anon key) para o `.env`
