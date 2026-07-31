import { del } from "@vercel/blob"

/**
 * Teto de fotos por evento. Oito é o número do layout de referência e o limite
 * em que o leque ainda se lê: acima disso os cards viram uma pilha.
 */
export const MAX_FOTOS = 8

/** Lado maior depois da compressão no navegador. */
export const LARGURA_MAXIMA = 1400

export const QUALIDADE_JPEG = 0.82

/**
 * Teto do arquivo já comprimido que chega ao servidor. A Vercel corta o corpo da
 * requisição em 4,5 MB; 4 MB deixa folga para o resto do multipart.
 */
export const TAMANHO_MAXIMO_BYTES = 4 * 1024 * 1024

export const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"]

/**
 * Apaga os binários no Blob. Nunca lança: o evento já foi (ou está sendo)
 * removido do banco, e falhar aqui só significa storage órfão — um problema bem
 * menor do que uma rota de exclusão que estoura no meio.
 */
export async function apagarFotos(urls: string[]): Promise<void> {
  if (!urls.length) return
  try {
    await del(urls)
  } catch (error) {
    console.error("Falha ao apagar fotos do Blob:", error)
  }
}
