import { createHmac, timingSafeEqual } from "node:crypto"

/**
 * Prova de autoria de um recado, sem conta de usuário.
 *
 * O link de coleta é público: qualquer um que o tenha pode escrever. Para
 * deixar alguém apagar **o próprio** recado sem poder apagar o dos outros,
 * quem cria recebe um token assinado pelo servidor e o guarda no navegador.
 * Editar e excluir exigem esse token de volta.
 *
 * Esconder o botão no cliente não bastaria: sem verificação no servidor, uma
 * requisição à mão apagaria o recado de qualquer pessoa.
 *
 * Sem prazo de validade de propósito — o recado morre junto com o evento, em
 * 12h, então o token não sobrevive ao que ele protege.
 */
function secret(): string {
  const s = process.env.AUTH_SECRET
  if (!s) throw new Error("AUTH_SECRET não configurado")
  return s
}

export function assinarPostit(id: string): string {
  return createHmac("sha256", secret()).update(`postit:${id}`).digest("base64url")
}

export function verificarPostit(id: string, token: unknown): boolean {
  if (typeof token !== "string" || token.length === 0) return false

  const esperado = Buffer.from(assinarPostit(id))
  const recebido = Buffer.from(token)

  // Comprimentos diferentes já reprovam, e timingSafeEqual lança se receber
  // buffers de tamanhos distintos — por isso a checagem vem antes.
  if (esperado.length !== recebido.length) return false
  return timingSafeEqual(esperado, recebido)
}
