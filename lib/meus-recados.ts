/**
 * Guarda, no navegador de quem escreveu, os tokens que provam autoria dos
 * recados. É o que permite editar e excluir o próprio recado sem exigir
 * cadastro — ver lib/postit-token.ts para o lado do servidor.
 *
 * localStorage e não sessionStorage: quem deixa um recado de manhã e percebe
 * o erro de tarde precisa continuar dono dele. O custo é que trocar de
 * navegador, de aparelho ou limpar os dados faz perder o direito — o que é
 * aceitável para um mural que existe por 12h, e é a troca por não ter login.
 */
const CHAVE = "mensagens_corp_recados"

type Guardados = Record<string, string>

function ler(): Guardados {
  try {
    const cru = localStorage.getItem(CHAVE)
    if (!cru) return {}
    const dados = JSON.parse(cru)
    // JSON.parse de qualquer coisa gravada à mão poderia devolver string ou
    // array; sem esta checagem o Object.entries seguinte se comportaria de
    // formas estranhas em vez de simplesmente ignorar o lixo.
    return dados && typeof dados === "object" && !Array.isArray(dados) ? dados : {}
  } catch {
    return {}
  }
}

export function guardarRecado(id: string, token: string): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ ...ler(), [id]: token }))
  } catch {
    /* navegação privada ou storage cheio: perde-se a edição, não o recado */
  }
}

export function esquecerRecado(id: string): void {
  try {
    const atuais = ler()
    delete atuais[id]
    localStorage.setItem(CHAVE, JSON.stringify(atuais))
  } catch {
    /* idem */
  }
}

export function tokenDoRecado(id: string): string | null {
  return ler()[id] ?? null
}

/** Ids possuídos, dentre os que existem no mural. */
export function meusRecados(ids: string[]): Set<string> {
  const guardados = ler()
  return new Set(ids.filter((id) => typeof guardados[id] === "string"))
}
