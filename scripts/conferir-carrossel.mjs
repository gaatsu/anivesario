/**
 * Confere o carrossel de fotos no desktop e no celular.
 *
 * O leque só faz sentido em movimento e sob o mouse, então o que dá para
 * verificar sozinho é o resto: que a foto abre grande ao clique — o único
 * caminho no celular, onde hover não existe —, que dá para navegar e que dá
 * para sair.
 *
 * Uso: node scripts/conferir-carrossel.mjs <url> <pasta-dos-prints>
 */
process.env.PLAYWRIGHT_BROWSERS_PATH = "0"
const { chromium } = await import("playwright")

const [, , url, pasta] = process.argv

let navegador
try {
  navegador = await chromium.launch()
} catch {
  navegador = await chromium.launch({ channel: "chrome" })
}

function relatar(rotulo, ok, detalhe = "") {
  console.log(`${ok ? "ok  " : "FALHA"} ${rotulo}${detalhe ? ` — ${detalhe}` : ""}`)
  if (!ok) process.exitCode = 1
}

const TELAS = [
  ["desktop", { width: 1400, height: 1000 }],
  ["celular", { width: 390, height: 844 }],
]

for (const [rotulo, viewport] of TELAS) {
  const contexto = await navegador.newContext({ viewport })
  const pagina = await contexto.newPage()

  // O indicador do next dev fica sobre os controles num viewport de celular.
  await pagina.addInitScript(() => {
    const estilo = document.createElement("style")
    estilo.textContent = "nextjs-portal { display: none !important }"
    document.addEventListener("DOMContentLoaded", () => document.head.append(estilo))
  })

  await pagina.goto(url, { waitUntil: "networkidle" })
  await pagina.waitForTimeout(3000)

  relatar(
    `[${rotulo}] o botão de arrumar saiu do link público`,
    !(await pagina
      .getByRole("button", { name: "Arrumar no mural" })
      .isVisible()
      .catch(() => false))
  )

  const cartao = pagina.getByRole("button", { name: /Ampliar a foto 3/ })
  relatar(`[${rotulo}] as fotos viraram botão`, await cartao.isVisible())

  // `force`: o card flutua sem parar, e o Playwright nunca o considera
  // estável. A flutuação é o efeito pretendido, não instabilidade da página.
  await cartao.click({ force: true })
  await pagina.waitForTimeout(600)
  const dialogo = pagina.getByRole("dialog")
  relatar(`[${rotulo}] clicar abre a foto ampliada`, await dialogo.isVisible())

  // O carrossel tem `perspective`, que cria bloco de contenção para `fixed`.
  // Sem portal, o fundo escuro cobre só a faixa das fotos — e o defeito passa
  // despercebido em qualquer verificação que só pergunte se o diálogo abriu.
  const fundo = await dialogo.boundingBox()
  relatar(
    `[${rotulo}] a foto cobre a tela inteira`,
    Math.round(fundo.width) >= viewport.width && Math.round(fundo.height) >= viewport.height - 1,
    `fundo ${Math.round(fundo.width)}x${Math.round(fundo.height)} para tela ${viewport.width}x${viewport.height}`
  )

  // Antes de carregar, a imagem não tem tamanho intrínseco e mede 0x0 — medir
  // aí reprovaria por causa da rede, não do layout.
  await dialogo
    .locator("img")
    .evaluate((el) => el.complete || new Promise((pronto) => el.addEventListener("load", pronto)))
  const caixa = await dialogo.locator("img").boundingBox()
  relatar(
    `[${rotulo}] a foto abre grande`,
    caixa.height > viewport.height * 0.4,
    `${Math.round(caixa.width)}x${Math.round(caixa.height)} numa tela de ${viewport.height}`
  )
  await pagina.screenshot({ path: `${pasta}/foto-${rotulo}.png` })

  await pagina.getByRole("button", { name: "Próxima foto" }).click()
  await pagina.waitForTimeout(400)
  relatar(`[${rotulo}] a seta troca de foto`, await dialogo.isVisible())

  await pagina.keyboard.press("Escape")
  await pagina.waitForTimeout(400)
  relatar(
    `[${rotulo}] Esc fecha`,
    !(await dialogo.isVisible().catch(() => false))
  )

  await contexto.close()
}

await navegador.close()
