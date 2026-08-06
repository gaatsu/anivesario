/**
 * Gera `public/cork-texture.png`.
 *
 * O mural sempre pediu essa imagem, mas ela nunca existiu no repositório: dava
 * 404 em todo carregamento e faltava no PDF. Em vez de baixar textura de algum
 * banco de imagens — licença incerta e um binário que ninguém sabe de onde veio
 * —, ela é desenhada aqui. O script fica versionado junto, então dá para mudar
 * o tom ou a densidade e gerar de novo.
 *
 * Desenhada no canvas do navegador porque é o único encoder de PNG disponível
 * nesta máquina; instalar biblioteca de imagem aqui é aposta.
 *
 * Uso: node scripts/gerar-cortica.mjs
 */
process.env.PLAYWRIGHT_BROWSERS_PATH = "0"
const { chromium } = await import("playwright")
const { writeFile } = await import("node:fs/promises")

/** Lado do ladrilho. Pequeno o bastante para o arquivo ser leve. */
const LADO = 192

async function abrirNavegador() {
  try {
    return await chromium.launch()
  } catch {
    return chromium.launch({ channel: "chrome" })
  }
}

const navegador = await abrirNavegador()
const pagina = await navegador.newPage()

const base64 = await pagina.evaluate((LADO) => {
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = LADO
  const ctx = canvas.getContext("2d")

  // Semente fixa: gerar de novo tem de dar exatamente o mesmo arquivo, senão
  // cada execução vira um diff binário sem motivo.
  let semente = 20260806
  const aleatorio = () => {
    semente = (semente * 1103515245 + 12345) % 2147483648
    return semente / 2147483648
  }

  ctx.fillStyle = "#c8a67c"
  ctx.fillRect(0, 0, LADO, LADO)

  /**
   * Desenha nove vezes, deslocando em cada direção.
   *
   * É o que faz o ladrilho fechar: um grânulo que cai na borda precisa
   * reaparecer do outro lado, senão a emenda vira uma linha visível quando a
   * textura se repete.
   */
  const pintarNasNoveCopias = (desenhar) => {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        ctx.save()
        ctx.translate(dx * LADO, dy * LADO)
        desenhar()
        ctx.restore()
      }
    }
  }

  // Todo sorteio acontece **antes** das nove cópias. Sortear lá dentro daria a
  // cada cópia um grânulo diferente, e aí a emenda não fecharia: apareceria uma
  // linha nítida onde a textura se repete.

  // Grânulos escuros: é o que lê como cortiça, e não como papel pardo.
  for (let i = 0; i < 1500; i++) {
    const x = aleatorio() * LADO
    const y = aleatorio() * LADO
    const raio = 0.6 + aleatorio() * 2.6
    const achatamento = 0.5 + aleatorio() * 0.8
    const escuridao = 0.06 + aleatorio() * 0.22
    const giro = aleatorio() * Math.PI

    ctx.fillStyle = `rgba(104, 72, 42, ${escuridao})`
    pintarNasNoveCopias(() => {
      ctx.beginPath()
      ctx.ellipse(x, y, raio, raio * achatamento, giro, 0, Math.PI * 2)
      ctx.fill()
    })
  }

  // Pontos claros: sem eles a textura fica só suja, em vez de granulada.
  for (let i = 0; i < 500; i++) {
    const x = aleatorio() * LADO
    const y = aleatorio() * LADO
    const raio = 0.5 + aleatorio() * 1.6
    const brilho = 0.08 + aleatorio() * 0.18

    ctx.fillStyle = `rgba(233, 208, 175, ${brilho})`
    pintarNasNoveCopias(() => {
      ctx.beginPath()
      ctx.arc(x, y, raio, 0, Math.PI * 2)
      ctx.fill()
    })
  }

  return canvas.toDataURL("image/png").split(",")[1]
}, LADO)

await writeFile("public/cork-texture.png", Buffer.from(base64, "base64"))
await navegador.close()

const { stat } = await import("node:fs/promises")
console.log(`public/cork-texture.png — ${Math.round((await stat("public/cork-texture.png")).size / 1024)} KB`)
