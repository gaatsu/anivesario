# Auth no Prisma, delegados por link e visibilidade do front — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o app subir: trazer autenticação para o Prisma, substituir cadastro aberto por link de convite, seedar um master admin e corrigir o texto invisível do front.

**Architecture:** Credenciais passam a morar na tabela `User` do Prisma (`passwordHash` via `scrypt`), com sessão em cookie assinado por HMAC-SHA256 — zero dependência de auth externa. O banco continua sendo o Neon Postgres, mas acessado pela porta 443 via `@prisma/adapter-neon`, porque a 5432 está bloqueada pelo firewall. Delegados entram por link aleatório de uso único gerado pelo master admin.

**Tech Stack:** Next.js 16 (App Router), React 19, Prisma 7, Neon Postgres, Tailwind v4, `node:crypto`, `node:test`.

**Spec:** `docs/superpowers/specs/2026-07-31-auth-prisma-e-visibilidade-design.md`

## Global Constraints

- **Next.js 16 tem breaking changes.** Antes de escrever route handler, middleware ou Server Component, leia o guia relevante em `node_modules/next/dist/docs/`. Não confie em memória de versões anteriores. (Regra do `AGENTS.md` do projeto.)
- **Todo comando Node que fale com o Neon precisa de `NODE_OPTIONS=--use-system-ca`.** O proxy corporativo intercepta TLS; sem isso a conexão morre com `SELF_SIGNED_CERT_IN_CHAIN`.
- **A porta 5432 está bloqueada.** `prisma migrate dev`, `prisma migrate deploy`, `prisma db execute` e `prisma db seed` **não funcionam nesta máquina**. Migrations são aplicadas localmente via endpoint SQL HTTPS do Neon, e na Vercel pelo `migrate deploy`.
- **Checksum de migration do Prisma** = sha256 hex do conteúdo de `migration.sql` com quebras de linha **LF** (validado contra a migration já aplicada). Arquivos no disco estão em CRLF; normalize antes de calcular.
- **Não commitar `.env`.** Já está no `.gitignore`. Segredos nunca entram em arquivo versionado.
- **O projeto não tem suíte de testes.** Onde houver lógica pura (crypto, tokens), teste com `node --test` (built-in, zero dependências). Onde não houver, a verificação é `tsc --noEmit`, `lint`, `build` e checagem direta no banco.
- **Banco está vazio** (0 linhas em todas as tabelas). Nenhuma migração de dados é necessária.
- Commits em português ou inglês, mas com corpo explicando o *porquê*. Terminar com `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `lib/auth.ts` | **Criar.** Funções puras: hash/verificação de senha e assinatura/verificação de token de sessão. Sem I/O, sem Next — testável isoladamente. |
| `lib/session.ts` | **Criar.** I/O de cookie (`next/headers`): criar, ler e destruir sessão. Separado de `lib/auth.ts` para manter a cripto pura e testável. |
| `lib/current-user.ts` | **Reescrever.** Lê o cookie e devolve o `User`. Perde toda a lógica de auto-provisionamento. |
| `lib/db.ts` | **Modificar.** Troca adapter `pg` (5432) por `@prisma/adapter-neon` (443). |
| `lib/invites.ts` | **Criar.** Geração e validação de token de convite. |
| `app/api/auth/login/route.ts` | **Criar.** `POST` — valida credenciais, cria sessão. |
| `app/api/auth/logout/route.ts` | **Criar.** `POST` — destrói sessão. |
| `app/api/auth/convite/[token]/route.ts` | **Criar.** `POST` — resgata convite, cria `ADMIN`, cria sessão. |
| `app/auth/convite/[token]/page.tsx` | **Criar.** Formulário de resgate. |
| `app/auth/login/page.tsx` | **Modificar.** Passa a chamar `/api/auth/login`. |
| `app/auth/register/page.tsx` | **Deletar.** |
| `app/api/auth/[...path]/route.ts` | **Deletar.** |
| `lib/neon-auth.ts`, `lib/neon-auth-client.ts` | **Deletar.** |
| `proxy.ts` | **Modificar.** Valida cookie próprio no matcher `/admin/:path*`. |
| `prisma/schema.prisma` | **Modificar.** `passwordHash`, `Delegate.token/label/expiresAt`. |
| `prisma/migrations/<ts>_auth_prisma/migration.sql` | **Criar.** |
| `prisma/seed.ts` | **Criar.** Upsert do master admin. |
| `scripts/db-http.mjs` | **Criar.** Executa SQL no Neon via HTTPS. Necessário porque a 5432 está bloqueada. |

---

### Task 1: Trocar dependências e conectar pela 443

Destrava o `npm install` (hoje quebrado por binário bloqueado pelo EDR) e o acesso ao banco (hoje impossível pela 5432).

**Files:**
- Modify: `package.json`
- Modify: `lib/db.ts`
- Create: `scripts/db-http.mjs`

**Interfaces:**
- Consumes: nada.
- Produces: `db` (PrismaClient sobre adapter Neon) exportado de `lib/db.ts`; `scripts/db-http.mjs` executável via `node scripts/db-http.mjs "<sql>"`.

**Nota:** ao fim desta task o `tsc` ainda **não** passa — `lib/neon-auth.ts` continua importando pacote removido. Isso é esperado e some na Task 5.

- [ ] **Step 1: Editar `package.json`**

Remover de `dependencies`: `@stackframe/stack`, `@neondatabase/neon-js`, `pg`, `@prisma/adapter-pg`, `@types/pg`.
Adicionar: `"@prisma/adapter-neon": "^7.9.1"`, `"@neondatabase/serverless": "^1.0.0"`.

- [ ] **Step 2: Reinstalar do zero**

```bash
cd /c/anivesario/anivesario
rm -rf node_modules package-lock.json
npm install --no-audit --no-fund
```

Esperado: exit 0. Se der `EPERM`/`UNKNOWN`, feche editores/terminais que estejam com o diretório aberto e repita.

- [ ] **Step 3: Verificar que o binário bloqueado não voltou**

```bash
ls node_modules/@esbuild 2>/dev/null && echo "PROBLEMA: esbuild voltou" || echo "ok"
ls node_modules/@stackframe node_modules/@neondatabase/neon-js 2>/dev/null && echo "PROBLEMA" || echo "ok"
```

Esperado: `ok` nas duas linhas.

- [ ] **Step 4: Reescrever `lib/db.ts`**

```ts
import { PrismaClient } from "../generated/prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"

const globalForPrisma = global as unknown as { prisma: PrismaClient }

// A porta 5432 do Neon está bloqueada pelo firewall corporativo; este adapter
// fala com o banco por HTTPS/WebSocket na 443, que passa.
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL })

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db
```

- [ ] **Step 5: Criar `scripts/db-http.mjs`**

```js
// Executa SQL no Neon pelo endpoint HTTPS. Existe porque a porta 5432 está
// bloqueada nesta rede, o que inviabiliza psql e `prisma db execute`.
// uso: NODE_OPTIONS=--use-system-ca node scripts/db-http.mjs "select 1"
import { readFileSync } from "node:fs"

const env = {}
for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)="?([^"]*)"?\s*$/)
  if (m) env[m[1]] = m[2]
}

const cs = env.DATABASE_URL
if (!cs) throw new Error("DATABASE_URL ausente no .env")

const sql = process.argv[2]
if (!sql) throw new Error('uso: node scripts/db-http.mjs "<sql>"')

const res = await fetch(`https://${new URL(cs).hostname}/sql`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Neon-Connection-String": cs,
    "Neon-Raw-Text-Output": "true",
    "Neon-Array-Mode": "false",
  },
  body: JSON.stringify({ query: sql, params: [] }),
})

const body = await res.text()
if (res.status !== 200) {
  console.error("HTTP", res.status, body)
  process.exit(1)
}
console.log(JSON.stringify(JSON.parse(body).rows, null, 2))
```

- [ ] **Step 6: Verificar que o banco responde**

```bash
NODE_OPTIONS=--use-system-ca node scripts/db-http.mjs "select current_database() as db"
```

Esperado: `[{ "db": "neondb" }]`.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json lib/db.ts scripts/db-http.mjs
git commit -m "Replace identity deps with Neon HTTP adapter

The @stackframe/stack and @neondatabase/neon-js packages pulled ~300 unused
transitive deps including an esbuild binary the corporate EDR blocks, which made
npm install fail outright. They were also never imported by the app.

Switches lib/db.ts from the pg adapter to @prisma/adapter-neon because port 5432
is firewalled on this network; the Neon HTTPS endpoint on 443 works.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: `lib/auth.ts` — cripto de senha e sessão (TDD)

Funções puras, sem I/O. É a única parte do sistema onde um bug é silencioso e perigoso, então é a única que ganha teste automatizado.

**Files:**
- Create: `lib/auth.ts`
- Test: `lib/auth.test.ts`

**Interfaces:**
- Consumes: `process.env.AUTH_SECRET`.
- Produces:
  - `hashPassword(plain: string): string` — devolve `scrypt$<N>$<r>$<p>$<saltB64>$<hashB64>`
  - `verifyPassword(plain: string, stored: string): boolean`
  - `signSession(userId: string, ttlMs?: number): string`
  - `verifySession(token: string): string | null` — devolve o `userId` ou `null`
  - `SESSION_COOKIE = "anv_session"`
  - `SESSION_TTL_MS` — 30 dias

- [ ] **Step 1: Escrever o teste que falha**

Criar `lib/auth.test.ts`:

```ts
import { test } from "node:test"
import assert from "node:assert/strict"

process.env.AUTH_SECRET = "segredo-de-teste-nao-usar-em-producao"

const { hashPassword, verifyPassword, signSession, verifySession } = await import("./auth.ts")

test("hash da senha não contém a senha em texto puro", () => {
  const h = hashPassword("@Cvale2026123")
  assert.ok(!h.includes("@Cvale2026123"))
  assert.match(h, /^scrypt\$/)
})

test("senha correta verifica, senha errada não", () => {
  const h = hashPassword("senha-correta")
  assert.equal(verifyPassword("senha-correta", h), true)
  assert.equal(verifyPassword("senha-errada", h), false)
})

test("hashes da mesma senha diferem (salt aleatório)", () => {
  assert.notEqual(hashPassword("igual"), hashPassword("igual"))
})

test("hash malformado não derruba a verificação", () => {
  assert.equal(verifyPassword("x", "lixo"), false)
  assert.equal(verifyPassword("x", ""), false)
})

test("sessão assinada volta o mesmo userId", () => {
  const t = signSession("user_123")
  assert.equal(verifySession(t), "user_123")
})

test("token adulterado é rejeitado", () => {
  const t = signSession("user_123")
  assert.equal(verifySession(t.replace("user_123", "user_666")), null)
  assert.equal(verifySession(t.slice(0, -3) + "aaa"), null)
  assert.equal(verifySession("nada"), null)
})

test("token expirado é rejeitado", () => {
  assert.equal(verifySession(signSession("user_123", -1000)), null)
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

```bash
node --test lib/auth.test.ts
```

Esperado: falha ao resolver `./auth.ts` (arquivo ainda não existe).

- [ ] **Step 3: Implementar `lib/auth.ts`**

```ts
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHmac,
} from "node:crypto"

export const SESSION_COOKIE = "anv_session"
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

const N = 16384
const R = 8
const P = 1
const KEYLEN = 64

function secret(): string {
  const s = process.env.AUTH_SECRET
  // Falhar alto: assinar sessão com segredo vazio deixaria qualquer um forjar login.
  if (!s) throw new Error("AUTH_SECRET não configurado")
  return s
}

export function hashPassword(plain: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(plain, salt, KEYLEN, { N, r: R, p: P })
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${hash.toString("base64")}`
}

export function verifyPassword(plain: string, stored: string): boolean {
  try {
    const [scheme, n, r, p, saltB64, hashB64] = stored.split("$")
    if (scheme !== "scrypt") return false
    const expected = Buffer.from(hashB64, "base64")
    const actual = scryptSync(plain, Buffer.from(saltB64, "base64"), expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    })
    return timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url")
}

export function signSession(userId: string, ttlMs: number = SESSION_TTL_MS): string {
  const payload = `${Buffer.from(userId).toString("base64url")}.${Date.now() + ttlMs}`
  return `${payload}.${sign(payload)}`
}

export function verifySession(token: string): string | null {
  const parts = token.split(".")
  if (parts.length !== 3) return null
  const [idB64, expStr, mac] = parts
  const expected = Buffer.from(sign(`${idB64}.${expStr}`))
  const given = Buffer.from(mac)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  if (!Number(expStr) || Number(expStr) < Date.now()) return null
  return Buffer.from(idB64, "base64url").toString("utf8")
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

```bash
node --test lib/auth.test.ts
```

Esperado: `# pass 7`, `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add lib/auth.ts lib/auth.test.ts
git commit -m "Add password hashing and session signing primitives

scrypt for passwords and HMAC-SHA256 for session tokens, both from node:crypto,
so the app gains no auth dependency. jose was only present as a transitive dep of
the identity packages being removed, and we need no JWT interop.

Comparisons use timingSafeEqual. Missing AUTH_SECRET throws rather than signing
with an empty secret.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Schema e migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260731120000_auth_prisma/migration.sql`

**Interfaces:**
- Produces: `User.passwordHash`, `Delegate.token/label/expiresAt` disponíveis no Prisma Client.

- [ ] **Step 1: Editar `prisma/schema.prisma`**

No model `User`: trocar o comentário sobre Neon Auth por um sobre credenciais próprias, mudar `id` para `String @id @default(cuid())` e adicionar `passwordHash String` depois de `name`.

Substituir o model `Delegate` inteiro por:

```prisma
// Convite por link: o master admin gera um token aleatório e envia a URL. Quem
// abrir define a própria senha. Uso único — um token ACCEPTED nunca mais vale.
model Delegate {
  id        String   @id @default(cuid())
  token     String   @unique
  label     String?

  creatorId String
  creator   User     @relation("MasterAdmin", fields: [creatorId], references: [id], onDelete: Cascade)

  delegateId   String? @unique
  delegateUser User?   @relation("DelegateUser", fields: [delegateId], references: [id], onDelete: SetNull)

  status    DelegateStatus @default(PENDING)
  expiresAt DateTime

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([creatorId])
}
```

- [ ] **Step 2: Gerar o client e conferir que o schema é válido**

```bash
npx prisma generate
```

Esperado: exit 0. Isso valida a sintaxe sem precisar de conexão.

- [ ] **Step 3: Escrever a migration**

Criar `prisma/migrations/20260731120000_auth_prisma/migration.sql`:

```sql
-- Sobra da era NextAuth: a tabela existe no banco mas nunca esteve no schema.prisma.
DROP TABLE "Session";

-- Credenciais voltam a morar no Prisma. A coluna já existia; só passa a guardar
-- um hash scrypt em vez de sabe-se lá o quê.
ALTER TABLE "User" RENAME COLUMN "password" TO "passwordHash";

-- Convite por email dá lugar a convite por link aleatório.
ALTER TABLE "Delegate" DROP COLUMN "delegateEmail";
ALTER TABLE "Delegate" ADD COLUMN "token" TEXT NOT NULL;
ALTER TABLE "Delegate" ADD COLUMN "label" TEXT;
ALTER TABLE "Delegate" ADD COLUMN "expiresAt" TIMESTAMP(3) NOT NULL;

CREATE UNIQUE INDEX "Delegate_token_key" ON "Delegate"("token");
CREATE UNIQUE INDEX "Delegate_delegateId_key" ON "Delegate"("delegateId");
```

Nota: `@default(cuid())` no `User.id` é gerado pelo Prisma Client, não pelo banco — não gera DDL. Adicionar colunas `NOT NULL` sem default é seguro porque a tabela tem 0 linhas.

- [ ] **Step 4: Aplicar a migration via HTTPS**

A 5432 está bloqueada, então `migrate deploy` não roda aqui. Rode cada statement:

```bash
export NODE_OPTIONS=--use-system-ca
node scripts/db-http.mjs 'DROP TABLE "Session"'
node scripts/db-http.mjs 'ALTER TABLE "User" RENAME COLUMN "password" TO "passwordHash"'
node scripts/db-http.mjs 'ALTER TABLE "Delegate" DROP COLUMN "delegateEmail"'
node scripts/db-http.mjs 'ALTER TABLE "Delegate" ADD COLUMN "token" TEXT NOT NULL'
node scripts/db-http.mjs 'ALTER TABLE "Delegate" ADD COLUMN "label" TEXT'
node scripts/db-http.mjs 'ALTER TABLE "Delegate" ADD COLUMN "expiresAt" TIMESTAMP(3) NOT NULL'
node scripts/db-http.mjs 'CREATE UNIQUE INDEX "Delegate_token_key" ON "Delegate"("token")'
node scripts/db-http.mjs 'CREATE UNIQUE INDEX "Delegate_delegateId_key" ON "Delegate"("delegateId")'
```

- [ ] **Step 5: Registrar a migration como aplicada**

Sem isso, o `migrate deploy` da Vercel tentaria rodar tudo de novo e falharia (tabelas já alteradas). O checksum precisa ser o sha256 do arquivo com quebras **LF**:

```bash
node -e "
const c=require('crypto'),fs=require('fs');
const p='prisma/migrations/20260731120000_auth_prisma/migration.sql';
const lf=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
console.log(c.createHash('sha256').update(Buffer.from(lf,'utf8')).digest('hex'));
"
```

Com o hash em mãos (substitua `<CHECKSUM>`):

```bash
node scripts/db-http.mjs "insert into _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) values (gen_random_uuid()::text, '<CHECKSUM>', now(), '20260731120000_auth_prisma', null, null, now(), 1)"
```

- [ ] **Step 6: Verificar o estado do banco**

```bash
node scripts/db-http.mjs "select column_name from information_schema.columns where table_name='User' order by 1"
node scripts/db-http.mjs "select table_name from information_schema.tables where table_schema='public' order by 1"
```

Esperado: `User` tem `passwordHash` e **não** tem `password`; não existe tabela `Session`.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "Reconcile schema with database and switch Delegate to invite links

schema.prisma had drifted from the applied migration: the database still had
User.password NOT NULL and a Session table from the NextAuth era, neither of
which was in the schema. Any user create would have failed at runtime.

Delegate now carries a random token instead of an invited email address.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Sessão em cookie e usuário atual

**Files:**
- Create: `lib/session.ts`
- Rewrite: `lib/current-user.ts`

**Interfaces:**
- Consumes: `signSession`, `verifySession`, `SESSION_COOKIE`, `SESSION_TTL_MS` de `lib/auth.ts`; `db` de `lib/db.ts`.
- Produces:
  - `createSession(userId: string): Promise<void>`
  - `destroySession(): Promise<void>`
  - `readSessionUserId(): Promise<string | null>`
  - `getCurrentUser(): Promise<User | null>`
  - `requireUser(): Promise<User>` — lança se não autenticado

- [ ] **Step 1: Ler a doc do Next 16 sobre cookies**

```bash
ls node_modules/next/dist/docs/
```

Confirme a API de `cookies()` nesta versão (síncrona vs. assíncrona) antes de escrever o código abaixo, e ajuste se divergir.

- [ ] **Step 2: Criar `lib/session.ts`**

```ts
import { cookies } from "next/headers"
import { SESSION_COOKIE, SESSION_TTL_MS, signSession, verifySession } from "./auth"

export async function createSession(userId: string): Promise<void> {
  const jar = await cookies()
  jar.set(SESSION_COOKIE, signSession(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  })
}

export async function destroySession(): Promise<void> {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
}

export async function readSessionUserId(): Promise<string | null> {
  const jar = await cookies()
  const raw = jar.get(SESSION_COOKIE)?.value
  return raw ? verifySession(raw) : null
}
```

- [ ] **Step 3: Reescrever `lib/current-user.ts`**

```ts
import { db } from "@/lib/db"
import { readSessionUserId } from "@/lib/session"

/**
 * Devolve o usuário da sessão atual, ou null. Diferente da versão anterior, não
 * cria usuário nem promove ninguém: contas só nascem pelo seed ou pelo resgate
 * de um convite.
 */
export async function getCurrentUser() {
  const userId = await readSessionUserId()
  if (!userId) return null
  return db.user.findUnique({ where: { id: userId } })
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) throw new Error("Não autenticado")
  return user
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/session.ts lib/current-user.ts
git commit -m "Add cookie session handling backed by our own User table

getCurrentUser no longer provisions accounts as a side effect of reading the
session — that only existed to paper over Neon Auth creating users out of band.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Rotas de login/logout, remoção do cadastro e do Neon Auth

Primeira task ao fim da qual `tsc` volta a passar.

**Files:**
- Create: `app/api/auth/login/route.ts`, `app/api/auth/logout/route.ts`
- Modify: `app/auth/login/page.tsx`, `proxy.ts`, `app/admin/layout.tsx`, `app/admin/dashboard/page.tsx`, `app/page.tsx`
- Delete: `app/auth/register/page.tsx`, `app/api/auth/[...path]/route.ts`, `lib/neon-auth.ts`, `lib/neon-auth-client.ts`

**Interfaces:**
- Consumes: `createSession`, `destroySession`, `getCurrentUser`, `verifyPassword`.
- Produces: `POST /api/auth/login` aceita `{email, password}` e devolve `200` ou `401 {message}`; `POST /api/auth/logout` devolve `200`.

- [ ] **Step 1: Deletar o que sai**

```bash
git rm -r app/auth/register "app/api/auth/[...path]" lib/neon-auth.ts lib/neon-auth-client.ts
```

- [ ] **Step 2: Criar `app/api/auth/login/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyPassword } from "@/lib/auth"
import { createSession } from "@/lib/session"

export async function POST(request: NextRequest) {
  const { email, password } = await request.json().catch(() => ({}))

  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ message: "Dados inválidos" }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })

  // Mesma resposta para email inexistente e senha errada: não entrega quais
  // emails têm conta.
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ message: "Credenciais inválidas" }, { status: 401 })
  }

  await createSession(user.id)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Criar `app/api/auth/logout/route.ts`**

```ts
import { NextResponse } from "next/server"
import { destroySession } from "@/lib/session"

export async function POST() {
  await destroySession()
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Atualizar `app/auth/login/page.tsx`**

Trocar o corpo de `handleSubmit` (hoje chama `authClient.signIn.email`) por:

```ts
const res = await fetch("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
})

if (res.ok) {
  router.push("/admin/dashboard")
  router.refresh()
} else {
  const data = await res.json().catch(() => ({}))
  setError(data.message ?? "Credenciais inválidas")
}
```

Remover o import de `@/lib/neon-auth-client`.

- [ ] **Step 5: Atualizar `proxy.ts`**

```ts
import { NextRequest, NextResponse } from "next/server"
import { SESSION_COOKIE, verifySession } from "@/lib/auth"

export default function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token || !verifySession(token)) {
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"],
}
```

- [ ] **Step 6: Converter as telas que usavam `useSession`**

- `app/admin/layout.tsx`: remover `"use client"` e o `useSession`/`useEffect`; virar `async` e ler `getCurrentUser()`; se `null`, `redirect("/auth/login")`. O botão "Sair" vira um pequeno Client Component que chama `POST /api/auth/logout` e navega para `/auth/login`. Remover o bloco de `isPending`/"Carregando...".
- `app/page.tsx`: virar Server Component `async` usando `getCurrentUser()` no lugar de `authClient.useSession()`.
- `app/admin/dashboard/page.tsx`: remover o import e o uso de `authClient` (a variável `session` não é usada para nada além de existir).

- [ ] **Step 7: Verificar que compila e lint passa**

```bash
npx tsc --noEmit && npm run lint
```

Esperado: exit 0 nos dois. Nenhuma referência restante a `neon-auth`:

```bash
grep -rn "neon-auth\|authClient\|@neondatabase/auth" app components lib proxy.ts || echo "limpo"
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Replace Neon Auth with first-party login and drop open signup

Removes the /auth/register page and the Neon Auth catch-all route. Accounts now
come from the seed or from redeeming an invite link, so there is no public way to
create one.

The admin screens become Server Components, which also removes the loading flash
they showed while the client resolved the session.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Seed do master admin

**Files:**
- Create: `prisma/seed.ts`
- Modify: `prisma.config.ts`

**Interfaces:**
- Consumes: `hashPassword` de `lib/auth.ts`, `db` de `lib/db.ts`.
- Produces: `npx prisma db seed` cria/atualiza o master admin.

- [ ] **Step 1: Criar `prisma/seed.ts`**

```ts
import { db } from "../lib/db"
import { hashPassword } from "../lib/auth"

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase().trim()
  const password = process.env.SEED_ADMIN_PASSWORD
  const name = process.env.SEED_ADMIN_NAME ?? "Admin"

  // Sai limpo em vez de quebrar: o build da Vercel roda isto sempre, e um
  // ambiente sem essas variáveis simplesmente não quer seed.
  if (!email || !password) {
    console.log("SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD ausentes — seed ignorado.")
    return
  }

  const existing = await db.user.findUnique({ where: { email } })

  if (existing) {
    // Não sobrescreve a senha: um redeploy não pode resetar uma senha trocada
    // depois do seed inicial.
    await db.user.update({ where: { email }, data: { name, role: "MASTER_ADMIN" } })
    console.log(`Master admin já existia: ${email} (senha preservada)`)
    return
  }

  await db.user.create({
    data: { email, name, passwordHash: hashPassword(password), role: "MASTER_ADMIN" },
  })
  console.log(`Master admin criado: ${email}`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
```

- [ ] **Step 2: Registrar o seed em `prisma.config.ts`**

Adicionar ao objeto passado para `defineConfig`:

```ts
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
```

Se `tsx` não estiver disponível, use `node --experimental-strip-types prisma/seed.ts` (Node 22.18 suporta). Confirme qual funciona antes de seguir.

- [ ] **Step 3: Rodar o seed**

```bash
NODE_OPTIONS=--use-system-ca npx prisma db seed
```

Esperado: `Master admin criado: alanvitorb98@gmail.com`.

- [ ] **Step 4: Verificar no banco e conferir idempotência**

```bash
NODE_OPTIONS=--use-system-ca node scripts/db-http.mjs "select email, role, left(\"passwordHash\", 7) as hash_prefix from \"User\""
NODE_OPTIONS=--use-system-ca npx prisma db seed
```

Esperado: uma linha com `MASTER_ADMIN` e prefixo `scrypt$`; a segunda execução imprime "já existia".

- [ ] **Step 5: Commit**

```bash
git add prisma/seed.ts prisma.config.ts
git commit -m "Seed the master admin from environment variables

Idempotent upsert so it can run on every deploy. Exits cleanly when the seed vars
are absent, and never overwrites an existing password so a redeploy cannot reset
a password changed later.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Delegados por link de convite

**Files:**
- Create: `lib/invites.ts`, `app/api/auth/convite/[token]/route.ts`, `app/auth/convite/[token]/page.tsx`
- Modify: `app/api/delegados/route.ts`, `app/api/delegados/[id]/route.ts`, `app/admin/delegados/page.tsx`
- Test: `lib/invites.test.ts`

**Interfaces:**
- Consumes: `db`, `hashPassword`, `createSession`, `requireUser`.
- Produces:
  - `generateInviteToken(): string` — 43 chars base64url
  - `INVITE_TTL_MS` — 7 dias
  - `POST /api/delegados` `{label?}` → `201 {id, token, url}`
  - `DELETE /api/delegados/[id]` → `200` (marca `REVOKED`)
  - `POST /api/auth/convite/[token]` `{name, email, password}` → `201` ou `400 {message}`

- [ ] **Step 1: Escrever o teste do token**

Criar `lib/invites.test.ts`:

```ts
import { test } from "node:test"
import assert from "node:assert/strict"
import { generateInviteToken } from "./invites.ts"

test("token é longo e url-safe", () => {
  const t = generateInviteToken()
  assert.ok(t.length >= 43)
  assert.match(t, /^[A-Za-z0-9_-]+$/)
})

test("tokens não se repetem", () => {
  const s = new Set(Array.from({ length: 500 }, generateInviteToken))
  assert.equal(s.size, 500)
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
node --test lib/invites.test.ts
```

Esperado: falha ao resolver `./invites.ts`.

- [ ] **Step 3: Criar `lib/invites.ts`**

```ts
import { randomBytes } from "node:crypto"

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

// randomBytes, não cuid(): este token é a única barreira entre um estranho e uma
// conta de admin, então precisa ser criptograficamente imprevisível.
export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url")
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

```bash
node --test lib/invites.test.ts
```

Esperado: `# pass 2`, `# fail 0`.

- [ ] **Step 5: Reescrever `app/api/delegados/route.ts`**

`GET`: exige `requireUser()` com `role === "MASTER_ADMIN"`; lista `db.delegate.findMany({ where: { creatorId: user.id }, include: { delegateUser: true } })`.

`POST`: exige master admin; cria o convite e devolve a URL:

```ts
const token = generateInviteToken()
const delegate = await db.delegate.create({
  data: {
    token,
    label: typeof label === "string" && label.trim() ? label.trim() : null,
    creatorId: user.id,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  },
})
return NextResponse.json(
  { id: delegate.id, token, url: `${process.env.APP_URL}/auth/convite/${token}` },
  { status: 201 }
)
```

`DELETE` em `app/api/delegados/[id]/route.ts`: exige master admin e dono do convite; `update` para `status: "REVOKED"`.

- [ ] **Step 6: Criar `app/api/auth/convite/[token]/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { hashPassword } from "@/lib/auth"
import { createSession } from "@/lib/session"

const INVALIDO = { message: "Convite inválido ou expirado" }

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params
  const { name, email, password } = await request.json().catch(() => ({}))

  if (
    typeof name !== "string" || !name.trim() ||
    typeof email !== "string" || !email.includes("@") ||
    typeof password !== "string" || password.length < 8
  ) {
    return NextResponse.json({ message: "Preencha nome, email e senha (mín. 8 caracteres)" }, { status: 400 })
  }

  const invite = await db.delegate.findUnique({ where: { token } })

  // Mesma mensagem para inexistente, expirado, aceito e revogado: não confirma
  // a existência de tokens para quem estiver testando.
  if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) {
    return NextResponse.json(INVALIDO, { status: 400 })
  }

  const normalizedEmail = email.toLowerCase().trim()
  if (await db.user.findUnique({ where: { email: normalizedEmail } })) {
    // Token não é consumido: o convite continua válido para outro email.
    return NextResponse.json({ message: "Este email já tem conta" }, { status: 400 })
  }

  const user = await db.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: hashPassword(password),
      role: "ADMIN",
    },
  })

  await db.delegate.update({
    where: { id: invite.id },
    data: { status: "ACCEPTED", delegateId: user.id },
  })

  await createSession(user.id)
  return NextResponse.json({ ok: true }, { status: 201 })
}
```

- [ ] **Step 7: Criar `app/auth/convite/[token]/page.tsx`**

Client Component com formulário de nome, email e senha, no mesmo estilo visual de `app/auth/login/page.tsx` (card branco, `rounded-2xl`, botão com gradiente rosa/roxo). Envia `POST` para `/api/auth/convite/<token>` e, em caso de sucesso, `router.push("/admin/dashboard")`. Erros vão para o mesmo bloco vermelho do login. Todos os `<input>` levam `text-gray-900`.

- [ ] **Step 8: Atualizar `app/admin/delegados/page.tsx`**

Trocar o formulário de "convidar por email" por um botão "Gerar link de convite" (com campo opcional de anotação). Ao criar, exibir a URL retornada com um botão de copiar. Listar convites com status, anotação, data de expiração e nome de quem resgatou, com botão de revogar nos `PENDING`.

- [ ] **Step 9: Verificar**

```bash
npx tsc --noEmit && npm run lint && node --test lib/*.test.ts
```

Esperado: exit 0 em todos.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "Add invite links for delegate admins

The master admin generates a random single-use link instead of inviting an email
address; the delegate sets their own password, so the master never learns it.

Tokens come from randomBytes(32) rather than cuid() because the link is the only
thing standing between a stranger and an admin account. Invalid, expired, revoked
and already-redeemed tokens all return the same message so the endpoint does not
confirm which tokens exist.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Visibilidade do front

**Files:**
- Modify: `app/globals.css`, `app/page.tsx`, `app/eventos/[shareLink]/mural/page.tsx`, `app/auth/login/page.tsx`, `app/admin/layout.tsx`, `components/Forms/PostitForm.tsx`

- [ ] **Step 1: Corrigir `app/globals.css`**

```css
@import "tailwindcss";

@theme inline {
  --color-background: #ffffff;
  --color-foreground: #171717;
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

/* Tema claro fixo: o app usa gradientes rosa/roxo e cards brancos, e não tem
   variantes de dark mode. Declarar color-scheme evita que o navegador pinte
   controles nativos com as cores escuras do sistema. */
:root {
  color-scheme: light;
}

body {
  color: var(--color-foreground);
  font-family: var(--font-sans), system-ui, sans-serif;
}
```

Removidas as declarações que estavam fora de `@layer` e venciam as utilities do Tailwind v4 — era isso que anulava o Geist (`font-family: Arial`) e o `bg-gradient-to-br` do `<body>` (`background: #fff`).

- [ ] **Step 2: Dar fallback aos títulos com gradiente**

Em `app/page.tsx:16` e `app/eventos/[shareLink]/mural/page.tsx:117`, acrescentar `text-pink-600` **antes** de `bg-clip-text text-transparent`:

```tsx
className="text-4xl font-bold text-pink-600 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent"
```

Hoje, se o gradiente não pinta, o texto fica literalmente invisível — não há cor por baixo.

- [ ] **Step 3: Subir o contraste dos textos auxiliares**

- `app/auth/login/page.tsx:102`: `text-gray-400` → `text-gray-600`
- `app/page.tsx:80`: `text-gray-500` → `text-gray-600`
- `components/Forms/PostitForm.tsx:113`: `text-gray-400` → `text-gray-600`
- `app/admin/layout.tsx:39`: `text-gray-500` → `text-gray-600`

Não mexer nos `text-gray-300` de `dashboard:222`, `delegados:140` e `mural:147`: são ícones decorativos, não texto.

- [ ] **Step 4: Dar cor explícita aos campos**

Adicionar `text-gray-900` à classe de todo `<input>`, `<textarea>` e `<select>` em `app/admin/dashboard/page.tsx`, `app/admin/delegados/page.tsx`, `app/auth/login/page.tsx` e `components/Forms/PostitForm.tsx`. Hoje nenhum deles declara cor de texto e todos dependem de herança.

- [ ] **Step 5: Verificar visualmente**

```bash
NODE_OPTIONS=--use-system-ca npm run dev
```

Abrir `http://localhost:3000` e conferir: título visível, fonte Geist (não Arial — inspecione o `computed font-family`), textos auxiliares legíveis. Logar com as credenciais seedadas e criar um evento.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Fix invisible text and restore the Geist font

globals.css declared body styles outside any @layer, and unlayered CSS beats
layered CSS, so those rules silently overrode Tailwind v4 utilities: font-family
killed the Geist font loaded by next/font, and background killed the body
gradient.

The two gradient headings had no solid color underneath bg-clip-text, so they
rendered fully transparent whenever the gradient failed to paint.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Deploy

**Files:**
- Modify: `vercel.json`, `.env.example`, `README.md`

- [ ] **Step 1: Adicionar o seed ao build**

`vercel.json`:

```json
"buildCommand": "prisma migrate deploy && prisma db seed && next build"
```

- [ ] **Step 2: Corrigir `.env.example`**

Remover `NEXTAUTH_SECRET` e `NEXTAUTH_URL` (não existem no código desde a saída do NextAuth). Adicionar, com comentário explicando cada um: `AUTH_SECRET`, `APP_URL` (usado em `app/api/eventos/route.ts:76` para montar a URL do QR code, hoje indefinido), `SEED_ADMIN_EMAIL`, `SEED_ADMIN_NAME`, `SEED_ADMIN_PASSWORD`.

- [ ] **Step 3: Atualizar o `README.md`**

Corrigir a stack (não é mais NextAuth v4), o fluxo (não existe mais `/auth/register`; o master admin vem do seed e delegados entram por link), e acrescentar uma nota sobre `NODE_OPTIONS=--use-system-ca` e o bloqueio da 5432 em rede corporativa.

- [ ] **Step 4: Verificação final antes do push**

```bash
npx tsc --noEmit && npm run lint && node --test lib/*.test.ts && npm run build
```

Esperado: exit 0 em todos. **Não pule o `build`** — é o que a Vercel roda.

- [ ] **Step 5: Confirmar que nenhum segredo entrou no commit**

```bash
git status --short
git diff --cached --name-only | grep -x ".env" && echo "PARE: .env staged" || echo "ok"
```

- [ ] **Step 6: Commit e push**

```bash
git add -A
git commit -m "Run the seed during deploy and document the new setup

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push origin claude/recados-mural-app-bn6pmk
```

- [ ] **Step 7: Configurar as env vars na Vercel**

**Depende do usuário — não dá para fazer daqui.** Antes do build rodar, precisam existir no projeto da Vercel: `DATABASE_URL`, `DIRECT_DATABASE_URL`, `AUTH_SECRET`, `CRON_SECRET`, `APP_URL` (domínio de produção), `SEED_ADMIN_EMAIL`, `SEED_ADMIN_NAME`, `SEED_ADMIN_PASSWORD`.

Sem `AUTH_SECRET` o build passa mas toda requisição autenticada quebra. Sem `APP_URL` os QR codes saem com URL inválida.

- [ ] **Step 8: Acompanhar o deploy**

Verificar no log da Vercel, em ordem: `npm ci` completa (era aqui que quebrava), `migrate deploy` reporta "No pending migrations" (já aplicamos via HTTPS), `db seed` reporta que o admin já existia, `next build` completa.

Depois: logar em produção com as credenciais seedadas, criar um evento, abrir o mural pelo link público e deixar um recado.

---

## Notas de auto-revisão

Coisas verificadas ao revisar este plano contra a spec:

- **Cobertura:** todas as seções da spec têm task correspondente. A spec descrevia `createSession`/`readSession`/`destroySession` dentro de `lib/auth.ts`; o plano separa em `lib/auth.ts` (puro, testável) e `lib/session.ts` (I/O de cookie). É um refinamento consciente — a cripto fica testável sem carregar o runtime do Next.
- **Correção sobre a migration:** `@default(cuid())` no `User.id` é gerado pelo Prisma Client e **não** produz DDL. A spec sugeria que era mudança de schema no banco; não é.
- **Correção sobre `migrate diff`:** `--from-migrations` exige shadow database, ou seja, conexão TCP — indisponível aqui. Por isso a migration é escrita à mão (8 statements, revisáveis) e validada por introspecção depois de aplicada.
- **Sem suíte de testes no projeto:** só `lib/auth.ts` e `lib/invites.ts` ganham teste, via `node --test`. O resto é verificado por `tsc`, `lint`, `build` e checagem no banco. Cobertura de rotas e telas fica de fora, como a spec já previa.
