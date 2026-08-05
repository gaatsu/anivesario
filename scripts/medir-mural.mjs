/**
 * Confere, no navegador de verdade, se algum recado ficou sobreposto a outro ou
 * escapou por baixo do mural.
 *
 * Existe porque teste de unidade só cobre a matemática do arranjo: largura real
 * do papel, altura real do texto e o min-height do container só aparecem quando
 * a página é renderizada.
 *
 * Uso: node scripts/medir-mural.mjs <url> [largura]
 */
process.env.PLAYWRIGHT_BROWSERS_PATH = "0"
const { chromium } = await import("playwright")

const [, , url, largura = "1400"] = process.argv

async function abrirNavegador() {
  try {
    return await chromium.launch()
  } catch {
    // O EDR desta máquina barra executável recém-baixado; o Chrome instalado
    // passa.
    return chromium.launch({ channel: "chrome" })
  }
}

const navegador = await abrirNavegador()
const pagina = await navegador.newPage({
  viewport: { width: Number(largura), height: 1000 },
})
await pagina.goto(url, { waitUntil: "networkidle" })
await pagina.waitForTimeout(2500)

const relatorio = await pagina.evaluate(() => {
  const murais = [...document.querySelectorAll("[class*='cork-texture']")]

  return murais.map((mural, indice) => {
    const caixaMural = mural.getBoundingClientRect()
    const recados = [...mural.children].map((filho) => {
      const r = filho.getBoundingClientRect()
      const assinatura = filho.querySelector("p:last-of-type")
      return {
        quem: assinatura?.textContent?.trim() ?? "?",
        x: Math.round(r.x),
        y: Math.round(r.y),
        largura: Math.round(r.width),
        altura: Math.round(r.height),
      }
    })

    const sobrepostos = []
    for (let a = 0; a < recados.length; a++) {
      for (let b = a + 1; b < recados.length; b++) {
        const p = recados[a]
        const q = recados[b]
        const cruzaX = p.x < q.x + q.largura && q.x < p.x + p.largura
        const cruzaY = p.y < q.y + q.altura && q.y < p.y + p.altura
        if (cruzaX && cruzaY) sobrepostos.push(`${p.quem} x ${q.quem}`)
      }
    }

    const maisBaixo = Math.max(...recados.map((r) => r.y + r.altura))
    return {
      indice,
      recados: recados.length,
      sobrepostos,
      alturaDoMural: Math.round(caixaMural.height),
      // Positivo = recado passando da borda de baixo do mural.
      vazamento: Math.round(maisBaixo - (caixaMural.y + caixaMural.height)),
    }
  })
})

console.log(JSON.stringify(relatorio, null, 2))
await navegador.close()
