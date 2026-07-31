import { del, issueSignedToken, presignUrl } from "@vercel/blob"

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
export async function apagarFotos(pathnames: string[]): Promise<void> {
  if (!pathnames.length) return
  try {
    await del(pathnames)
  } catch (error) {
    console.error("Falha ao apagar fotos do Blob:", error)
  }
}

/**
 * O banco guarda o `pathname`; a URL de exibição é assinada na hora de servir.
 * Os dois viajam juntos porque o pathname é a identidade (é por ele que se
 * apaga) e a URL é descartável (expira).
 */
export interface FotoAssinada {
  pathname: string
  url: string
}

/** Piso da validade, para não pedir uma URL que já nasce vencida. */
const VALIDADE_MINIMA_MS = 60_000

/**
 * Converte pathnames em URLs assinadas de leitura.
 *
 * O store é privado, então a URL do blob não abre sozinha — precisa da
 * assinatura. `issueSignedToken` é a única chamada de rede aqui; `presignUrl`
 * apenas calcula um HMAC local com a chave que veio no token, e por isso vale a
 * pena emitir **um** token e assinar todos os caminhos com ele em vez de um
 * token por foto.
 *
 * O token sai com escopo de store inteiro (`pathname` omitido = `*`), o que é
 * seguro porque ele nunca deixa o servidor: o que vai para o navegador são as
 * URLs já assinadas, cada uma presa a um caminho.
 *
 * Falha devolvendo lista vazia. Um erro de assinatura tira as fotos da página;
 * deixar a exceção subir tiraria a página inteira, e os recados importam mais.
 */
export async function assinarFotos(
  pathnames: string[],
  validoAte: number
): Promise<FotoAssinada[]> {
  if (!pathnames.length) return []

  const validUntil = Math.max(validoAte, Date.now() + VALIDADE_MINIMA_MS)

  try {
    const token = await issueSignedToken({ operations: ["get"], validUntil })

    return await Promise.all(
      pathnames.map(async (pathname) => {
        const { presignedUrl } = await presignUrl(token, {
          operation: "get",
          access: "private",
          pathname,
          validUntil,
        })
        return { pathname, url: presignedUrl }
      })
    )
  } catch (error) {
    console.error("Falha ao assinar fotos do Blob:", error)
    return []
  }
}
