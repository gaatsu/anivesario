# 🎉 Murais de Recados

App para criar murais de recados/mensagens personalizados para aniversários, retorno de férias e eventos especiais. Visitantes deixam recados em postits coloridos sem precisar de login, com drag livre pelo mural.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS
- **Prisma 7** + **Neon** (PostgreSQL serverless)
- **NextAuth v4** (credentials, JWT)
- **dnd-kit** (drag-and-drop), **Framer Motion** + **canvas-confetti** (animações)
- **Vercel** (hosting + cron)

## Setup local

### 1. Criar banco no Neon

1. Crie uma conta gratuita em https://console.neon.tech
2. Crie um novo projeto/banco
3. Copie a *connection string* (formato `postgresql://user:pass@host/db?sslmode=require`)

### 2. Configurar variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

```bash
cp .env.example .env.local
```

- `DATABASE_URL`: connection string **pooled** do Neon (host termina em `-pooler`) — usada pela aplicação em runtime
- `DIRECT_DATABASE_URL`: connection string **direta** (mesmo host, sem `-pooler`) — usada só pelo Prisma para migrations
- `NEXTAUTH_SECRET`: gere com `openssl rand -base64 32`
- `NEXTAUTH_URL`: `http://localhost:3000` em dev
- `CRON_SECRET`: gere com `openssl rand -base64 24` (protege o endpoint de limpeza automática)

### 3. Instalar dependências e rodar migrations

```bash
npm install
npx prisma migrate deploy
```

A migration inicial já está versionada em `prisma/migrations/`. `migrate deploy` só aplica migrations pendentes (não precisa de shadow database, ao contrário de `migrate dev`).

### 4. Rodar em dev

```bash
npm run dev
```

Abra http://localhost:3000

## Fluxo da aplicação

1. **Master Admin** se cadastra em `/auth/register` (primeira conta criada vira `MASTER_ADMIN`)
2. No **Dashboard** (`/admin/dashboard`), cria eventos: título, data, tipo e animações (confetti, balões, fogos, papel picado)
3. Cada evento gera um **link aleatório** e **QR code** automaticamente
4. O link (`/eventos/[shareLink]/mural`) é público — visitantes **não precisam de login**
5. Visitantes escolhem cor + ícone do postit, escrevem nome e mensagem, e arrastam livremente pelo mural
6. É possível **exportar o mural em PDF** a qualquer momento
7. **Após 12h da criação, o evento e seus recados são apagados automaticamente** (limpeza "preguiçosa" a cada acesso + cron diário de segurança via Vercel Cron)
8. Master Admin pode convidar **delegados** (outros admins) em `/admin/delegados`

## Deploy na Vercel

1. Importe o repositório na Vercel
2. Configure as env vars: `DATABASE_URL` (pooled), `DIRECT_DATABASE_URL` (direta), `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (domínio de produção), `CRON_SECRET`
3. O `vercel.json` já define `buildCommand: "prisma migrate deploy && next build"` — as migrations rodam automaticamente a cada deploy, aplicando só o que estiver pendente
4. O `vercel.json` também já configura o cron job de limpeza (`/api/cron/cleanup`, diário)

> **Por que `migrate deploy` roda no build da Vercel, e não localmente:** o Prisma precisa de uma conexão TCP direta (porta 5432) com o Postgres para aplicar migrations — o ambiente onde este projeto foi montado só permite tráfego HTTPS de saída, então a migration inicial foi gerada localmente (`prisma migrate diff`, sem precisar de conexão) e fica versionada em `prisma/migrations/`. Ela é aplicada de verdade na primeira vez que a Vercel builda o projeto, já que lá o acesso de rede é irrestrito.

> **Nota sobre o plano gratuito da Vercel (Hobby):** cron jobs são limitados a 1x/dia. Por isso a expiração de 12h é garantida principalmente por checagem "lazy" (ao acessar o mural ou o dashboard, eventos vencidos são apagados na hora) — o cron diário é só um reforço.

## Estrutura

```
app/
├── admin/              # área logada (dashboard, delegados)
├── api/
│   ├── auth/           # NextAuth + registro
│   ├── eventos/        # CRUD de eventos (admin, autenticado)
│   ├── delegados/      # gestão de delegados
│   ├── mural/          # API pública (sem auth) do mural
│   └── cron/cleanup/   # limpeza de eventos expirados
├── auth/               # login/registro
└── eventos/[shareLink]/mural/  # página pública do mural

components/
├── Mural/               # canvas + postit card (drag-and-drop)
├── Forms/                # formulário de novo recado
└── Animations/           # confetti, balões, fogos, papel picado

lib/
├── auth.ts, db.ts, utils.ts, eventLifecycle.ts

prisma/schema.prisma      # modelo de dados
```
