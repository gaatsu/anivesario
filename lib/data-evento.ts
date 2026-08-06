/**
 * Conversão entre o campo de data do formulário e o instante guardado no banco.
 *
 * `<input type="datetime-local">` fala "2026-08-21T12:00" — data e hora **sem
 * fuso nenhum**. O banco guarda instante em UTC. Traduzir entre os dois só dá
 * certo no navegador, porque é lá que "local" quer dizer o fuso de quem marcou
 * a data; o servidor da Vercel roda em UTC e leria as 12:00 de Brasília como
 * 12:00 UTC.
 *
 * Era exatamente esse o defeito: a ida não convertia e a volta convertia. O
 * horário voltava para a tela 3h mais cedo e, como editar relê o campo e
 * regrava, cada salvamento empurrava a data mais 3h para trás.
 *
 * Fora do componente para poder ter teste — o par só está certo se `ida` e
 * `volta` se anularem, e isso é o tipo de coisa que se quebra sem ninguém ver.
 */

/** Campo do formulário → instante ISO com fuso, para mandar à API. */
export function paraInstante(valorDoCampo: string): string {
  const d = new Date(valorDoCampo)
  return Number.isNaN(d.getTime()) ? valorDoCampo : d.toISOString()
}

/** Instante vindo da API → o que o campo do formulário aceita. */
export function paraCampoDeData(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
