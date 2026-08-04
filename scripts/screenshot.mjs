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
// Navegador do próprio projeto, em node_modules/playwright-core/.local-browsers.
//
// Precisa ser definido antes de o playwright carregar, e `import` estático é
// içado para antes de qualquer statement — daí o import dinâmico logo abaixo.
// Sem isto o playwright procuraria no cache do usuário (~/AppData/ms-playwright),
// que tem builds de outra versão e falha pedindo `playwright install`.
process.env.PLAYWRIGHT_BROWSERS_PATH = "0"

const { chromium } = await import("playwright")

const [, , url, saida, espera = "3000", largura = "1400", altura = "900", clicar] = process.argv

if (!url || !saida) {
  console.error("uso: node scripts/screenshot.mjs <url> <arquivo.png> [ms] [largura] [altura] [seletor-a-clicar]")
  process.exit(1)
}

// Abaixo de 640 (o breakpoint `sm` do Tailwind) trata como celular: emula toque
// e ponteiro grosso, senão os `hover:` respondem e a captura mente sobre o que
// um dedo veria.
const celular = Number(largura) < 640

/**
 * Prefere o navegador baixado pelo projeto; cai no Chrome instalado se o EDR
 * não deixar executá-lo.
 *
 * O bloqueio é real e vale registrar: `playwright install` baixa o binário sem
 * problema — a CDN passa pelo proxy — mas o antivírus corporativo recusa
 * executar qualquer .exe recém-baixado, em `node_modules` ou no cache do
 * usuário, com "Permission denied". É o mesmo motivo pelo qual o `esbuild.exe`
 * derrubou um `npm install` antes nesta base.
 *
 * O Chrome instalado roda porque já está aprovado. Sobe headless e com perfil
 * temporário, então não encosta no perfil de ninguém.
 */
async function abrirNavegador() {
  try {
    return await chromium.launch()
  } catch (erro) {
    console.warn("navegador do projeto bloqueado, usando o Chrome do sistema")
    console.warn(" ", String(erro).split("\n")[0])
    return chromium.launch({ channel: "chrome" })
  }
}

const browser = await abrirNavegador()
const page = await browser.newPage({
  viewport: { width: Number(largura), height: Number(altura) },
  // 2x para o traço fino do SVG não virar borrão na inspeção.
  deviceScaleFactor: 2,
  isMobile: celular,
  hasTouch: celular,
})

const erros = []
page.on("console", (m) => m.type() === "error" && erros.push(m.text()))
page.on("pageerror", (e) => erros.push(String(e)))

await page.goto(url, { waitUntil: "networkidle" })

// Para fotografar o que só existe depois de uma interação — um modal, por
// exemplo. Sem isto não há como inspecionar o formulário de recado.
if (clicar) {
  await page.click(clicar)
  await page.waitForTimeout(400)
}

await page.waitForTimeout(Number(espera))
// Vazamento horizontal é o defeito mais comum e o mais fácil de não notar num
// screenshot: a captura em fullPage acompanha a página, então um elemento
// largo demais some no enquadramento em vez de aparecer cortado.
const medida = await page.evaluate(() => {
  const doc = document.documentElement
  const culpados = []
  for (const el of document.querySelectorAll("*")) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.right > window.innerWidth + 1) {
      culpados.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)} → ${Math.round(r.right)}px`)
    }
  }
  return { scroll: doc.scrollWidth, viewport: window.innerWidth, culpados: culpados.slice(0, 12) }
})

console.log(`largura do documento: ${medida.scroll}px | viewport: ${medida.viewport}px`)
if (medida.scroll > medida.viewport) {
  console.log(`VAZA ${medida.scroll - medida.viewport}px para fora da tela:`)
  for (const c of medida.culpados) console.log("  -", c)
}

// Só agora: `fullPage` expande o viewport durante a captura, então medir
// depois dele devolve a largura do conteúdo em vez da largura da tela.
await page.screenshot({ path: saida, fullPage: true })

await browser.close()

if (erros.length) {
  console.error("erros no console:")
  for (const e of erros) console.error("  -", e)
}
console.log("ok:", saida)
