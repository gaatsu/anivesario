// Cria (ou atualiza) o master admin a partir de variáveis de ambiente.
//
// Fala com o Neon pelo endpoint SQL sobre HTTPS em vez de usar o Prisma Client.
// Dois motivos: a porta 5432 é bloqueada pela rede corporativa, e assim o seed
// roda com `node` puro, sem precisar de tsx — que arrasta o esbuild, cujo binário
// o EDR desta máquina bloqueia.
//
// uso: NODE_OPTIONS=--use-system-ca node --experimental-strip-types prisma/seed.ts
import { readFileSync } from "node:fs"
import { hashPassword } from "../lib/auth.ts"

type Row = Record<string, string | null>

function carregarEnv(): void {
  // Na Vercel as variáveis já vêm do ambiente; localmente vêm do .env.
  try {
    const arquivo = readFileSync(new URL("../.env", import.meta.url), "utf8")
    for (const linha of arquivo.split(/\r?\n/)) {
      const m = linha.match(/^([A-Z_]+)="?([^"]*)"?\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
    }
  } catch {
    // Sem .env: seguimos só com o que estiver no ambiente.
  }
}

async function sql(query: string, params: unknown[] = []): Promise<Row[]> {
  const cs = process.env.DATABASE_URL
  if (!cs) throw new Error("DATABASE_URL não configurada")

  const res = await fetch(`https://${new URL(cs).hostname}/sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Neon-Connection-String": cs,
      "Neon-Raw-Text-Output": "true",
      "Neon-Array-Mode": "false",
    },
    body: JSON.stringify({ query, params }),
  })

  const corpo = await res.text()
  if (res.status !== 200) throw new Error(`Neon HTTP ${res.status}: ${corpo}`)
  return JSON.parse(corpo).rows as Row[]
}

async function main(): Promise<void> {
  carregarEnv()

  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase().trim()
  const senha = process.env.SEED_ADMIN_PASSWORD
  const nome = process.env.SEED_ADMIN_NAME ?? "Admin"

  // Sai limpo em vez de quebrar: um ambiente sem essas variáveis simplesmente
  // não quer seed, e isto pode rodar durante o build.
  if (!email || !senha) {
    console.log("SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD ausentes — seed ignorado.")
    return
  }

  const existente = await sql('select id from "User" where email = $1', [email])

  if (existente.length > 0) {
    // Não sobrescreve a senha: um redeploy não pode resetar uma senha trocada
    // depois do seed inicial.
    await sql('update "User" set name = $1, role = \'MASTER_ADMIN\', "updatedAt" = now() where email = $2', [nome, email])
    console.log(`Master admin já existia: ${email} (senha preservada)`)
    return
  }

  await sql(
    `insert into "User" (id, email, name, "passwordHash", role, "createdAt", "updatedAt")
     values (gen_random_uuid()::text, $1, $2, $3, 'MASTER_ADMIN', now(), now())`,
    [email, nome, hashPassword(senha)]
  )
  console.log(`Master admin criado: ${email}`)
}

main().catch((erro) => {
  console.error(erro)
  process.exit(1)
})
