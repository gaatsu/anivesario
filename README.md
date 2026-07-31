# 🎉 Murais de Recados

App para criar murais de recados/mensagens personalizados para aniversários, retorno de férias e eventos especiais. Visitantes deixam recados em postits coloridos sem precisar de login, com drag livre pelo mural.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS
- **Prisma 7** + **Neon** (PostgreSQL serverless, via `@prisma/adapter-neon`)
- **Autenticação própria** — senha com `scrypt` e sessão em cookie assinado com
  HMAC-SHA256, tudo com `node:crypto` (sem dependência externa de auth)
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
- `AUTH_SECRET`: gere com `openssl rand -base64 32` — assina o cookie de sessão
- `APP_URL`: `http://localhost:3000` em dev; em produção, o domínio real (usado para montar os links de QR code e de convite)
- `CRON_SECRET`: gere com `openssl rand -base64 24` (protege o endpoint de limpeza automática)
- `SEED_ADMIN_EMAIL`, `SEED_ADMIN_NAME`, `SEED_ADMIN_PASSWORD`: conta de master admin criada pelo seed

### 3. Instalar dependências e rodar migrations

```bash
npm install
npx prisma migrate deploy
```

As migrations já estão versionadas em `prisma/migrations/`. `migrate deploy` só aplica as pendentes (não precisa de shadow database, ao contrário de `migrate dev`).

### 4. Criar o master admin

```bash
npx prisma db seed
```

Idempotente: se o email já existir, só atualiza nome e papel — **nunca sobrescreve a senha**, para um redeploy não resetar uma senha trocada depois.

### 5. Rodar em dev

```bash
npm run dev
```

Abra http://localhost:3000

## Rodando atrás de proxy corporativo

Em redes que bloqueiam portas de banco e interceptam TLS (o caso da rede onde este projeto foi montado), três coisas quebram:

| Sintoma | Causa | Contorno |
|---|---|---|
| `SELF_SIGNED_CERT_IN_CHAIN` | o proxy intercepta TLS e o Node não confia na CA da empresa | rode com `NODE_OPTIONS=--use-system-ca` |
| conexão ao Postgres dá timeout | a porta 5432 é bloqueada | o app usa `@prisma/adapter-neon`, que fala na 443; para SQL avulso use `node scripts/db-http.mjs "<sql>"` |
| `prisma generate` falha com 403 | o proxy bloqueia o download de `.exe.gz` | peça liberação de `binaries.prisma.sh`, ou rode `npx prisma generate` uma vez fora da rede corporativa (o engine fica em cache) |

Sem o `prisma generate`, não há client gerado — então `tsc`, `next build` e `npm run dev` não rodam localmente, embora funcionem normalmente na Vercel.

## Fluxo da aplicação

1. **Não existe cadastro aberto.** O **Master Admin** é criado pelo seed (`npx prisma db seed`, a partir das variáveis `SEED_ADMIN_*`) e entra em `/auth/login`
2. No **Dashboard** (`/admin/dashboard`), cria eventos: título, data, tipo e animações (confetti, balões, fogos, papel picado)
3. Cada evento gera **dois links aleatórios** e um **QR code** automaticamente:
   - **Link de coleta** (`/eventos/[shareLink]/mural`) — circula entre os colegas, que deixam recados. **Sem animações**, para não estragar a surpresa
   - **Link da surpresa** (`/revelacao/[revealLink]`) — vai só para o homenageado. Abre o mural com as animações tocando, em modo somente-leitura (sem botão de deixar recado e sem arrastar postits)
4. Ambos são públicos — ninguém **precisa de login** para abrir
5. Visitantes escolhem cor + ícone do postit, escrevem nome e mensagem, e arrastam livremente pelo mural
6. É possível **exportar o mural em PDF** a qualquer momento
7. **Após 12h da criação, o evento e seus recados são apagados automaticamente** (limpeza "preguiçosa" a cada acesso + cron diário de segurança via Vercel Cron)
8. Master Admin pode gerar **links de convite** para outros admins em `/admin/delegados`. O link é aleatório (`randomBytes(32)`), vale 7 dias e só pode ser usado uma vez; quem abrir define o próprio nome, email e senha. O master nunca conhece a senha do delegado, e pode revogar o acesso a qualquer momento

## Deploy na Vercel

1. Importe o repositório na Vercel
2. Configure as env vars: `DATABASE_URL` (pooled), `DIRECT_DATABASE_URL` (direta), `AUTH_SECRET`, `APP_URL` (domínio de produção), `CRON_SECRET`, e as `SEED_ADMIN_*` se quiser rodar o seed
3. O `vercel.json` já define `buildCommand: "prisma migrate deploy && next build"` — as migrations rodam automaticamente a cada deploy, aplicando só o que estiver pendente
4. O `vercel.json` também já configura o cron job de limpeza (`/api/cron/cleanup`, diário)

> **Por que `migrate deploy` roda no build da Vercel, e não localmente:** o Prisma precisa de conexão TCP direta (porta 5432) para aplicar migrations, e a rede onde este projeto foi montado bloqueia essa porta. As migrations ficam versionadas em `prisma/migrations/` e são aplicadas de verdade no build da Vercel, onde o acesso é irrestrito. Ver "Rodando atrás de proxy corporativo" acima.

> **O seed não roda no build.** O `buildCommand` propositalmente não inclui `prisma db seed`: o seed usa type stripping nativo do Node (`--experimental-strip-types`, Node ≥ 22.6), e uma incompatibilidade de versão no build derrubaria o deploy inteiro por algo que só precisa rodar uma vez. Rode `npx prisma db seed` manualmente quando precisar criar o master admin.

> **Nota sobre o plano gratuito da Vercel (Hobby):** cron jobs são limitados a 1x/dia. Por isso a expiração de 12h é garantida principalmente por checagem "lazy" (ao acessar o mural ou o dashboard, eventos vencidos são apagados na hora) — o cron diário é só um reforço.

## Estrutura

```
app/
├── admin/              # área logada (dashboard, delegados)
├── api/
│   ├── auth/           # login, logout, resgate de convite
│   ├── eventos/        # CRUD de eventos (admin, autenticado)
│   ├── delegados/      # geração e revogação de convites
│   ├── mural/          # API pública (sem auth) do mural
│   └── cron/cleanup/   # limpeza de eventos expirados
├── auth/               # login + página de resgate de convite
└── eventos/[shareLink]/mural/  # página pública do mural

components/
├── Mural/               # canvas + postit card (drag-and-drop)
├── Forms/                # formulário de novo recado
└── Animations/           # confetti, balões, fogos, papel picado

lib/
├── auth.ts              # scrypt + assinatura de sessão (puro, testável)
├── session.ts           # leitura/escrita do cookie de sessão
├── current-user.ts      # resolve a sessão para um User
├── invites.ts           # geração de token de convite
└── db.ts, utils.ts, eventLifecycle.ts

prisma/
├── schema.prisma        # modelo de dados
├── migrations/          # SQL versionado
└── seed.ts              # cria o master admin

scripts/db-http.mjs      # SQL no Neon via HTTPS (contorna a 5432 bloqueada)

proxy.ts                 # guarda /admin/* (Next 16: era "middleware")
```
