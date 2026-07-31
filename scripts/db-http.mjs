// Executa SQL no Neon pelo endpoint HTTPS.
//
// Existe porque a porta 5432 é bloqueada pelo firewall corporativo, o que
// inviabiliza psql, `prisma db execute` e `prisma migrate deploy` nesta máquina.
// O endpoint HTTP do Neon responde na 443, que passa.
//
// uso: NODE_OPTIONS=--use-system-ca node scripts/db-http.mjs "select 1"
//
// O --use-system-ca é obrigatório: o proxy corporativo intercepta TLS e o Node
// não confia na CA da empresa por padrão.
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
