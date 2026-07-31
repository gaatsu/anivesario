// Tira screenshot de uma rota do dev server.
//
// Existe porque este app não pode ser visto rodando por inteiro: `prisma
// generate` é bloqueado pelo proxy corporativo, então toda tela que toca o
// banco não compila localmente. As rotas sob /preview não importam `lib/db` e
// por isso o `next dev` as serve — e com isto dá para conferir o desenho antes
// de subir, em vez de descobrir em produção.
//
// uso: node scripts/screenshot.mjs <url> <arquivo.png> [ms de espera]
//
// A espera existe para as animações de entrada terminarem: sem ela o
// screenshot pega tudo no meio do caminho, opaco pela metade.
import { chromium } from "playwright"

const [, , url, saida, espera = "3000"] = process.argv

if (!url || !saida) {
  console.error("uso: node scripts/screenshot.mjs <url> <arquivo.png> [ms]")
  process.exit(1)
}

// Chrome do sistema em vez do Chromium do Playwright: o pacote espera um build
// que não está baixado, e `playwright install` puxa de uma CDN que o proxy
// corporativo bloqueia. O Chrome já está instalado nesta máquina.
const browser = await chromium.launch({ channel: "chrome" })
const page = await browser.newPage({
  viewport: { width: 1400, height: 900 },
  // 2x para o traço fino do SVG não virar borrão na inspeção.
  deviceScaleFactor: 2,
})

const erros = []
page.on("console", (m) => m.type() === "error" && erros.push(m.text()))
page.on("pageerror", (e) => erros.push(String(e)))

await page.goto(url, { waitUntil: "networkidle" })
await page.waitForTimeout(Number(espera))
await page.screenshot({ path: saida, fullPage: true })
await browser.close()

if (erros.length) {
  console.error("erros no console:")
  for (const e of erros) console.error("  -", e)
}
console.log("ok:", saida)
