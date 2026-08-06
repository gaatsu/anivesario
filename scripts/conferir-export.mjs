/**
 * Clica no botão de exportar PDF e diz o que aconteceu de verdade.
 *
 * O handler engole a falha num `console.error`, então pela tela o botão só
 * pisca "Exportando..." e volta. Aqui o console é lido e o download é
 * observado, que é a única forma de distinguir "falhou" de "demorou".
 *
 * Uso: node scripts/conferir-export.mjs <url>
 */
process.env.PLAYWRIGHT_BROWSERS_PATH = "0"
const { chromium } = await import("playwright")

const [, , url] = process.argv

async function abrirNavegador() {
  try {
    return await chromium.launch()
  } catch {
    return chromium.launch({ channel: "chrome" })
  }
}

const navegador = await abrirNavegador()
const contexto = await navegador.newContext({ acceptDownloads: true })
const pagina = await contexto.newPage()

const erros = []
pagina.on("console", (m) => {
  if (m.type() === "error") erros.push(m.text())
})
pagina.on("pageerror", (e) => erros.push(`pageerror: ${e.message}`))

await pagina.addInitScript(() => {
  const estilo = document.createElement("style")
  estilo.textContent = "nextjs-portal { display: none !important }"
  document.addEventListener("DOMContentLoaded", () => document.head.append(estilo))
})

await pagina.goto(url, { waitUntil: "networkidle" })
await pagina.waitForTimeout(2000)

const baixou = pagina
  .waitForEvent("download", { timeout: 20000 })
  .then(async (d) => {
    // Baixar não é o bastante: um PDF em branco também "baixa". Guarda em disco
    // para poder olhar o tamanho e conferir que é PDF de verdade.
    const destino = `${process.env.TEMP || "."}/${d.suggestedFilename()}`
    await d.saveAs(destino)
    const { readFile } = await import("node:fs/promises")
    const bytes = await readFile(destino)
    return {
      nome: d.suggestedFilename(),
      kb: Math.round(bytes.length / 1024),
      ehPdf: bytes.subarray(0, 5).toString() === "%PDF-",
      paginas: (bytes.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length,
    }
  })
  .catch(() => null)

await pagina.getByRole("button", { name: /Salvar em PDF/ }).click()
const arquivo = await baixou

const naTela = (await pagina.locator("[data-teste=erro]").textContent())?.trim()

// Baixar o PDF prova que hoje funciona; isto prova *por quê*, e é o que pega um
// elemento novo trazendo cor que o html2canvas recusa — foi exatamente o caso
// do ícone do recado, que passou despercebido porque a bancada não tinha nenhum.
const sobrando = await pagina.evaluate(() => {
  const mural = document.querySelector("[class*='cork-texture']")
  const normalizar = window.__normalizarCores
  if (!mural || typeof normalizar !== "function") return "bancada não expôs __normalizarCores"

  const clone = mural.cloneNode(true)
  document.body.append(clone)
  normalizar(clone)

  const RE = /\b(?:oklch|oklab|lab|lch|color)\([^()]*\)/
  const restantes = []
  for (const el of [clone, ...clone.querySelectorAll("*")]) {
    const cs = getComputedStyle(el)
    for (let i = 0; i < cs.length; i++) {
      const v = cs.getPropertyValue(cs[i])
      if (v && RE.test(v)) restantes.push(`${el.tagName}.${cs[i]} = ${v.slice(0, 40)}`)
    }
  }
  clone.remove()
  return restantes.slice(0, 10)
})

console.log("baixou:", arquivo ? JSON.stringify(arquivo) : "NADA")
if (Array.isArray(sobrando) && sobrando.length === 0) {
  console.log("cores nao suportadas apos normalizar: nenhuma")
} else {
  console.log("cores nao suportadas apos normalizar:", sobrando)
  process.exitCode = 1
}
if (naTela) console.log("erro na tela:", naTela)
if (erros.length) {
  console.log("erros no console:")
  for (const e of erros) console.log("  -", e.slice(0, 300))
}
if (!arquivo) process.exitCode = 1

await navegador.close()
