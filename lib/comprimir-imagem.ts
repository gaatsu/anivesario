import { LARGURA_MAXIMA, QUALIDADE_JPEG } from "./fotos"

/**
 * Reduz e recomprime a imagem no navegador, antes de subir.
 *
 * Não é otimização: é requisito. A Vercel corta o corpo da requisição em 4,5 MB
 * e uma foto de celular passa disso sozinha. Reduzir aqui também evita subir
 * 12 MP para exibir um card de 130 px.
 *
 * Só roda no cliente — depende de canvas.
 */
export async function comprimirImagem(arquivo: File): Promise<File> {
  // imageOrientation explícito: sem ele, foto tirada em pé pelo celular sobe
  // deitada, porque a rotação vive no EXIF e o canvas não a lê sozinho.
  const bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" })

  const escala = Math.min(1, LARGURA_MAXIMA / Math.max(bitmap.width, bitmap.height))
  const largura = Math.round(bitmap.width * escala)
  const altura = Math.round(bitmap.height * escala)

  const canvas = document.createElement("canvas")
  canvas.width = largura
  canvas.height = altura

  const ctx = canvas.getContext("2d")
  if (!ctx) {
    bitmap.close()
    return arquivo
  }

  // Fundo branco: PNG com transparência vira preto ao virar JPEG.
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, largura, altura)
  ctx.drawImage(bitmap, 0, 0, largura, altura)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", QUALIDADE_JPEG)
  )
  if (!blob) return arquivo

  const nome = arquivo.name.replace(/\.[^.]+$/, "") || "foto"
  return new File([blob], `${nome}.jpg`, { type: "image/jpeg" })
}
