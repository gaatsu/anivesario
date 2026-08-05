/**
 * Confere o convite de animação com o aparelho pedindo movimento reduzido.
 *
 * Roda a abertura com `reducedMotion: "reduce"` — o mesmo que o ajuste do
 * celular liga — e verifica os três momentos: o convite aparece, aceitar liga a
 * cena, e recusar guarda a recusa.
 *
 * Uso: node scripts/conferir-movimento.mjs <url> <pasta-dos-prints>
 */
process.env.PLAYWRIGHT_BROWSERS_PATH = "0"
const { chromium } = await import("playwright")

const [, , url, pasta] = process.argv

async function abrirNavegador() {
  try {
    return await chromium.launch()
  } catch {
    return chromium.launch({ channel: "chrome" })
  }
}

const navegador = await abrirNavegador()
const contexto = await navegador.newContext({
  viewport: { width: 390, height: 844 },
  reducedMotion: "reduce",
})
const pagina = await contexto.newPage()

// O indicador do next dev fica no canto de baixo, exatamente sobre os botões da
// abertura num viewport de celular, e intercepta o clique.
await pagina.addInitScript(() => {
  const estilo = document.createElement("style")
  estilo.textContent = "nextjs-portal { display: none !important }"
  document.addEventListener("DOMContentLoaded", () => document.head.append(estilo))
})

function relatar(rotulo, ok, detalhe = "") {
  console.log(`${ok ? "ok  " : "FALHA"} ${rotulo}${detalhe ? ` — ${detalhe}` : ""}`)
  if (!ok) process.exitCode = 1
}

await pagina.goto(url, { waitUntil: "networkidle" })
await pagina.waitForTimeout(1500)

// 1. Com o sistema pedindo redução e nada escolhido, o convite aparece e a cena
//    não sai sozinha.
const convite = pagina.getByRole("button", { name: "Ver com animação" })
relatar("o convite aparece", await convite.isVisible())
await pagina.screenshot({ path: `${pasta}/movimento-convite.png` })

await pagina.waitForTimeout(4000)
relatar(
  "a cena espera a resposta em vez de sair sozinha",
  await convite.isVisible(),
  "o prazo de 3s não pode valer enquanto a pergunta está na tela"
)

// 2. Aceitar guarda a escolha e marca o documento para o CSS.
await convite.click()
await pagina.waitForTimeout(400)
const guardado = await pagina.evaluate(() => localStorage.getItem("mensagens_corp_movimento"))
relatar("aceitar guarda a escolha", guardado === "completo", `guardado: ${guardado}`)

const marca = await pagina.evaluate(() => document.documentElement.dataset.movimento)
relatar("o <html> fica marcado para o CSS", marca === "completo", `data-movimento: ${marca}`)

const chamaAnimando = await pagina.evaluate(() => {
  const chama = document.querySelector(".chama")
  if (!chama) return "sem chama nesta cena"
  return getComputedStyle(chama).animationName
})
relatar(
  "os keyframes de CSS voltam a rodar",
  chamaAnimando !== "none",
  `animation-name: ${chamaAnimando}`
)
await pagina.screenshot({ path: `${pasta}/movimento-aceito.png` })

// 3. Recusar também fica guardado, senão o convite voltaria toda visita.
await pagina.evaluate(() => localStorage.removeItem("mensagens_corp_movimento"))
await pagina.reload({ waitUntil: "networkidle" })
await pagina.waitForTimeout(1500)
await pagina.getByRole("button", { name: "Continuar sem" }).click()
await pagina.waitForTimeout(400)
const recusa = await pagina.evaluate(() => localStorage.getItem("mensagens_corp_movimento"))
relatar("recusar guarda a recusa", recusa === "reduzido", `guardado: ${recusa}`)

// 4. Sem pedido de redução, nada muda: o convite seria ruído para quem já vê a
//    cena inteira.
const normal = await navegador.newContext({
  viewport: { width: 390, height: 844 },
  reducedMotion: "no-preference",
})
const paginaNormal = await normal.newPage()
await paginaNormal.goto(url, { waitUntil: "networkidle" })
await paginaNormal.waitForTimeout(1200)
relatar(
  "quem não pediu redução não é perguntado",
  !(await paginaNormal.getByRole("button", { name: "Ver com animação" }).isVisible()) &&
    (await paginaNormal.getByRole("button", { name: "Pular" }).isVisible())
)

await navegador.close()
