# Auth no Prisma, delegados por link e visibilidade do front

Data: 2026-07-31
Branch: `claude/recados-mural-app-bn6pmk`

## Problema

O app não sobe. Investigando o repositório e rodando o que dá pra rodar, encontrei
quatro falhas independentes — nenhuma visível só lendo o código:

1. **`npm ci` falha.** `package-lock.json` está fora de sincronia com `package.json`
   (faltam `@instantdb/*`, `@triplit/*`, `nanoid`, `superjson` e outros no lock). A
   Vercel usa `npm ci` quando existe lockfile, então o deploy quebra no `install`,
   antes de chegar no `next build`.

2. **`@neondatabase/auth` não é dependência declarada.** `lib/neon-auth.ts` e
   `lib/neon-auth-client.ts` importam o pacote, mas ele só existe na árvore como
   dependência transitiva de `@neondatabase/neon-js`. Resolve por acidente de
   hoisting.

3. **Dependências de identidade quebram o install local.** `@stackframe/stack` e
   `@neondatabase/neon-js` arrastam ~300 pacotes que o app não usa (`@aws-sdk`,
   `rrweb`, `@instantdb`, `@triplit`, `@ai-sdk`, `@captchafox`), incluindo o binário
   `esbuild.exe`, bloqueado pelo EDR da máquina (`spawnSync ... UNKNOWN`).
   Verificado: removendo os dois pacotes, `npm install` passa (546 pacotes, exit 0)
   e `@esbuild` some da árvore.

4. **`schema.prisma` dessincronizado do banco.** A migration aplicada
   (`20260729000000_init`, 2026-07-29 18:56) criou `User.password NOT NULL` e a
   tabela `Session` — schema da era NextAuth. O `schema.prisma` atual não tem
   nenhum dos dois, e nenhuma migration nova foi gerada. Como a `init` já consta
   aplicada, `migrate deploy` não vê nada pendente e o banco mantém
   `password NOT NULL`. Qualquer `db.user.create()` do código atual falha.

Ou seja: mesmo que o build passasse, ninguém conseguiria criar conta nem logar.

Além disso, os pedidos originais: tirar a criação de conta do início, corrigir
texto invisível no front, e seedar um admin.

## Restrições do ambiente (verificadas)

| Teste | Resultado |
|---|---|
| TCP 5432 / 5433 → host Neon | **TIMEOUT** (firewall corporativo bloqueia portas de banco) |
| TCP 443 → host Neon | OK |
| TCP 22, 80, 443, 4242 → hosts públicos | OK |
| HTTPS ao endpoint SQL do Neon | `SELF_SIGNED_CERT_IN_CHAIN` (proxy intercepta TLS) |
| Idem, com `NODE_OPTIONS=--use-system-ca` | **HTTP 200** — PostgreSQL 18.4, db `neondb` |

Consequências:
- `prisma migrate dev`/`deploy` **não roda nesta máquina** (usa TCP 5432).
  Migrations são geradas offline com `prisma migrate diff` e aplicadas no build da
  Vercel.
- O app só alcança o banco pela 443, o que obriga a trocar o driver adapter.
- Qualquer processo Node que fale com o Neon precisa de `--use-system-ca`.

Estado do banco: **vazio** (0 linhas em `User`, `Event`, `Postit`, `Delegate`,
`Session`). Não há risco de perda de dados.

## Decisões

- **Auth vai para o Prisma.** Credenciais deixam de morar num serviço externo. O
  banco já tem coluna de senha; isso reconcilia o schema com a realidade.
- **Delegados entram por link aleatório de uso único**, gerado pelo master admin.
  O delegado define a própria senha; o master nunca a conhece.
- **Front: correções pontuais**, não passe de tokens. Diff pequeno, num app que
  ainda não rodou.
- **Neon Postgres continua sendo o banco.** Sai apenas a camada de identidade.

## Arquitetura

### 1. Autenticação

Removidos: `@neondatabase/auth`, `@neondatabase/neon-js`, `@stackframe/stack`,
`lib/neon-auth.ts`, `lib/neon-auth-client.ts`, `app/auth/register/page.tsx`,
`app/api/auth/[...path]/route.ts`.

Novo `lib/auth.ts`, com responsabilidade única de credenciais e sessão:

- `hashPassword(plain)` / `verifyPassword(plain, hash)` — `scrypt` do
  `node:crypto`, sem dependência nova. Formato `scrypt$N$salt$hash`.
- `createSession(userId)` / `readSession()` / `destroySession()` — cookie assinado
  com HMAC-SHA256 do `node:crypto` usando `AUTH_SECRET`. Payload
  `userId.expiraEm.assinatura`, comparação com `timingSafeEqual`. Cookie
  `httpOnly`, `sameSite=lax`, `secure` em produção, 30 dias.

  Sem `jose` e sem JWT: `jose` só existia na árvore dentro de
  `@neondatabase/auth` e `@stackframe/stack`, que estão sendo removidos, e não
  precisamos de interoperabilidade JWT com nenhum outro sistema. Num ambiente onde
  instalar pacote é frágil (EDR bloqueando binários), zero dependência nova de auth
  é uma vantagem concreta.

`lib/current-user.ts` encolhe para: ler o cookie, buscar o `User`, devolver. Some
toda a lógica de "primeiro usuário vira master" e de auto-provisionamento por
convite — ela existia só para contornar o fato de o Neon Auth criar usuários por
fora.

Rotas: `POST /api/auth/login`, `POST /api/auth/logout`,
`POST /api/auth/convite/[token]`.

`proxy.ts` valida o cookie no matcher `/admin/:path*`. `/auth/convite/:token*`
fica fora do matcher.

Telas: `app/page.tsx`, `app/admin/layout.tsx` e `app/admin/dashboard/page.tsx`
deixam de usar `authClient.useSession()` e viram Server Components lendo
`getCurrentUser()`. Efeito colateral bem-vindo: some o flash de "Carregando..."
do admin.

### 2. Schema

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  name         String
  passwordHash String
  role         UserRole @default(ADMIN)
  ...
}

model Delegate {
  id         String  @id @default(cuid())
  token      String  @unique      // randomBytes(32).toString("base64url")
  label      String?              // anotação do master: "pra Maria"
  creatorId  String
  delegateId String? @unique
  status     DelegateStatus @default(PENDING)
  expiresAt  DateTime
  ...
}
```

O token usa `crypto.randomBytes(32)`, **não** `cuid()`: como o link é a única
barreira para virar admin, precisa ser criptograficamente imprevisível. `cuid` não é.

Removido o model `Session` do banco (nunca esteve no schema) e o campo
`delegateEmail`.

### 3. Delegados

- Master clica em "Gerar link de convite" → `POST /api/delegados` cria `Delegate`
  com token aleatório e `expiresAt = agora + 7 dias`; devolve a URL.
- Delegado abre `/auth/convite/<token>` → validação (existe, `PENDING`, não
  expirado) → informa nome, email e senha → cria `User` com `role: ADMIN`, token
  vira `ACCEPTED`, sessão criada, redireciona ao dashboard.
- Master revoga a qualquer momento (`REVOKED`) na tela de delegados.
- Uso único: um token `ACCEPTED` nunca mais é aceito.

Casos de borda, definidos para não ficarem em aberto:

- Token inexistente, expirado, `ACCEPTED` ou `REVOKED` → mesma tela de "convite
  inválido ou expirado", sem distinguir qual dos casos (não entrega informação a
  quem estiver testando tokens).
- Email já cadastrado no resgate → erro no formulário, token **não** é consumido.
- `AUTH_SECRET` ausente → a aplicação falha no boot com mensagem explícita, em vez
  de assinar sessão com segredo vazio.
- Master admin não pode revogar a si mesmo nem ser excluído.

### 4. Seed

`prisma/seed.ts`, registrado em `prisma.config.ts` (no Prisma 7 é lá, não em
`package.json`).

- Lê `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME`.
- Se faltar email ou senha, **sai com código 0 sem fazer nada** — assim o build da
  Vercel não quebra em ambiente que não quer seed.
- `upsert` por email: cria com `role: MASTER_ADMIN`; se já existir, atualiza nome e
  role mas **não sobrescreve a senha**, para um redeploy não resetar a senha caso
  ela tenha sido trocada depois.

Idempotente por construção, então rodar a cada deploy é seguro.

### 5. Conexão com o banco

`lib/db.ts` troca `PrismaPg` (TCP 5432) por `@prisma/adapter-neon` +
`@neondatabase/serverless` (HTTPS/WebSocket na 443). Motivo: a 5432 é inalcançável
nesta rede. Funciona igual na Vercel.

Mudanças em `package.json`:

| Entram | Saem |
|---|---|
| `@prisma/adapter-neon` | `@stackframe/stack` |
| `@neondatabase/serverless` | `@neondatabase/neon-js` |
| | `pg`, `@prisma/adapter-pg`, `@types/pg` |

Verificado nesta máquina: com essas mudanças `npm install` completa em exit 0 e
`@esbuild` (o binário bloqueado pelo EDR) não entra na árvore.

### 6. Front

- `app/globals.css`: remove `font-family: Arial, Helvetica, sans-serif` do `body`,
  que estava anulando o Geist. Causa: a regra está fora de `@layer`, e CSS sem
  layer vence CSS em layer — no Tailwind v4 as utilities vivem em
  `@layer utilities`. Pelo mesmo motivo, `background: var(--background)` anulava o
  `bg-gradient-to-br` do `<body>` em `layout.tsx`. O que precisa sobreviver vai
  para dentro de `@theme`.
- Os dois `<h1>` com `bg-clip-text text-transparent` (`app/page.tsx:16`,
  `app/eventos/[shareLink]/mural/page.tsx:117`) ganham cor sólida de fallback:
  hoje somem por completo se o gradiente não pintar.
- `text-gray-400` / `text-gray-500` usados como **texto** sobem para `gray-600` /
  `gray-700` (mín. 4.5:1 sobre branco): `app/auth/login/page.tsx:102`,
  `app/page.tsx:80`, `components/Forms/PostitForm.tsx:113`, `app/admin/layout.tsx:39`.
- `text-gray-300` fica: são ícones decorativos, não texto.

### 7. Env

Entram: `AUTH_SECRET`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME`.

Saem: `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, e os `NEXTAUTH_SECRET` /
`NEXTAUTH_URL` que o `.env.example` ainda documenta apesar de não existirem no
código desde a saída do NextAuth.

Corrigido: `.env.example` não documenta `APP_URL`, usado de verdade em
`app/api/eventos/route.ts:76` para montar a URL do QR code — hoje provavelmente
gera `undefined/eventos/...` em produção.

## Migration

Como a `20260729000000_init` já consta aplicada, ela nunca roda de novo. Então:
nova migration `20260731xxxxxx_auth_prisma`, com SQL gerado offline por
`prisma migrate diff --from-migrations --to-schema-datamodel` (não precisa de
conexão), fazendo:

- `DROP TABLE "Session"`
- `User.password` → `passwordHash`
- `Delegate`: adiciona `token` (unique), `label`, `expiresAt`; remove `delegateEmail`
- `User.id` passa a ter `@default(cuid())`

Banco vazio, então nenhuma cláusula de migração de dados é necessária.

Aplicação: `migrate deploy` no build da Vercel, como já está no `vercel.json`.
Localmente dá para aplicar o mesmo SQL pelo endpoint HTTPS do Neon, para validar
antes do deploy.

## Deploy

`vercel.json` passa a rodar:

```
prisma migrate deploy && prisma db seed && next build
```

O `package-lock.json` é regenerado para voltar a sincronizar com o `package.json`,
sem o que a Vercel falha no `npm ci`.

Env vars a configurar na Vercel: `DATABASE_URL`, `DIRECT_DATABASE_URL`,
`AUTH_SECRET`, `CRON_SECRET`, `APP_URL`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`,
`SEED_ADMIN_NAME`.

## Como validar

Nesta máquina (com `NODE_OPTIONS=--use-system-ca`):

1. `npm install` completa sem erro e sem `@esbuild` na árvore.
2. `npx tsc --noEmit` e `npm run lint` passam.
3. `npm run build` passa.
4. Migration aplicada via endpoint HTTPS; `\d "User"` mostra `passwordHash` e
   nenhuma tabela `Session`.
5. `prisma db seed` cria o master admin; login local funciona; criar evento
   funciona; gerar link de convite e resgatá-lo cria um `ADMIN`.
6. Front: título da home visível, fonte Geist aplicada (não Arial), textos
   auxiliares legíveis.

Na Vercel: build completa (install → migrate → seed → build) e login em produção
com as credenciais seedadas.

## Fora de escopo

- Passe de tokens tipográficos e escala de tipos (avaliar depois, com o app rodando).
- Recuperação de senha por email.
- Testes automatizados: o projeto não tem suíte; criar uma é um projeto à parte.
