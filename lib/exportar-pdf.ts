"use client"

/**
 * Salvar o mural em PDF.
 *
 * O `html2canvas` que vem dentro do html2pdf é da linha 1.x e só entende
 * `rgb`, `rgba`, `hsl` e `hsla` — diante de qualquer outra função de cor ele
 * lança "Attempting to parse an unsupported color function". Os postits são
 * pintados em `oklch` (ver lib/postit-visual.ts), então o export morria sempre,
 * e morria calado: o `catch` só escrevia no console, e para quem clicava o
 * botão apenas piscava "Exportando..." e voltava ao normal.
 *
 * A conversão fica aqui, e não em postit-visual, de propósito. `oklch` é
 * escolha de projeto — é o que dá a paleta perceptualmente uniforme —, e trocar
 * as cores do app inteiro para contornar limitação de uma biblioteca de PDF
 * seria deixar a ferramenta mandar no desenho. O contorno mora junto de quem
 * precisa dele; no dia em que o html2canvas for trocado, some daqui inteiro.
 */

/**
 * Funções de cor que o html2canvas 1.x não sabe interpretar.
 *
 * Varre-se o valor inteiro em vez de trocá-lo por completo: a cor pode estar
 * dentro de um gradiente ou de uma sombra, cercada de outras coisas que
 * precisam sobreviver.
 */
const FUNCAO_NAO_SUPORTADA = /\b(?:oklch|oklab|lab|lch|color)\([^()]*\)/
const TODAS_AS_OCORRENCIAS = new RegExp(FUNCAO_NAO_SUPORTADA.source, "g")

/**
 * Converte qualquer cor que o navegador saiba pintar em `rgba()`.
 *
 * Pintando um pixel e lendo de volta. Parece rodeio, mas as saídas diretas não
 * servem: tanto `getComputedStyle` quanto `ctx.fillStyle` devolvem `oklch(...)`
 * de volta, preservando a função original — conferido no Chrome. O único lugar
 * onde a cor já virou sRGB de fato é o pixel.
 */
function criarConversor(): (valor: string) => string {
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = 1
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  const cache = new Map<string, string>()

  return (valor: string): string => {
    if (!ctx) return valor
    const guardado = cache.get(valor)
    if (guardado) return guardado

    ctx.clearRect(0, 0, 1, 1)
    ctx.fillStyle = valor
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
    const convertido = `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`

    cache.set(valor, convertido)
    return convertido
  }
}

/**
 * Reescreve, como estilo inline, toda cor que o html2canvas recusaria.
 *
 * Feito sobre o clone que o html2canvas monta, nunca sobre a página: mexer no
 * documento de verdade faria as cores piscarem na tela de quem só pediu um PDF.
 */
export function normalizarCoresParaCaptura(raiz: HTMLElement): number {
  const converter = criarConversor()
  let trocadas = 0

  for (const el of [raiz, ...raiz.querySelectorAll("*")]) {
    if (!(el instanceof HTMLElement) && !(el instanceof SVGElement)) continue
    const computado = getComputedStyle(el)

    // Percorre **todas** as propriedades computadas em vez de uma lista escrita
    // à mão. Já tentei a lista, e ela saiu curta duas vezes: primeiro esqueci
    // que `border`, `outline` e `caret` valem `currentColor` por padrão e
    // herdam o `oklch` do texto; depois que o ícone do recado é um SVG do
    // lucide com `stroke="currentColor"` — e ainda faltavam
    // `-webkit-text-fill-color`, `-webkit-text-stroke-color` e
    // `text-emphasis-color`. Uma cor pode aparecer em qualquer propriedade que
    // aceite cor, e enumerá-las é uma lista que nunca fecha.
    for (let i = 0; i < computado.length; i++) {
      const prop = computado[i]
      const valor = computado.getPropertyValue(prop)
      if (!valor || !FUNCAO_NAO_SUPORTADA.test(valor)) continue

      el.style.setProperty(prop, valor.replace(TODAS_AS_OCORRENCIAS, converter))
      trocadas++
    }
  }

  return trocadas
}

export interface OpcoesDeExport {
  /** Nome do arquivo, sem extensão. */
  nome: string
}

/**
 * Gera e baixa o PDF do mural.
 *
 * Deixa o erro subir em vez de engolir: quem chama precisa poder avisar que
 * falhou, que é justamente o que não acontecia antes.
 */
export async function exportarMuralEmPdf(
  no: HTMLElement,
  { nome }: OpcoesDeExport
): Promise<void> {
  const html2pdf = (await import("html2pdf.js")).default

  await html2pdf()
    .set({
      margin: 10,
      filename: `${nome}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        onclone: (_documento: Document, elemento: HTMLElement) => {
          normalizarCoresParaCaptura(elemento)
        },
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
    })
    .from(no)
    .save()
}
