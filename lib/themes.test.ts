import { test } from "node:test"
import assert from "node:assert/strict"
import { TEMAS, resolverTema, resolverAnimacoes, ANIMACOES } from "./themes.ts"

test("os cinco tipos existem com id consistente", () => {
  for (const [chave, tema] of Object.entries(TEMAS)) {
    assert.equal(tema.id, chave)
    assert.ok(tema.label.length > 0)
    assert.ok(tema.animacoesPadrao.length > 0)
  }
  assert.equal(Object.keys(TEMAS).length, 5)
})

test("todo tema traz saudação e convite próprios", () => {
  // O usuário digita só o nome do homenageado; a saudação e o convite vêm daqui.
  // Se um tema esquecer o campo, a tela mostraria ", Maria" — vazio antes do nome.
  const saudacoes = new Set<string>()
  for (const tema of Object.values(TEMAS)) {
    assert.ok(tema.saudacao.length > 0, `${tema.id} sem saudação`)
    assert.ok(tema.convite.length > 0, `${tema.id} sem convite`)
    saudacoes.add(tema.saudacao)
  }
  assert.equal(saudacoes.size, 5, "duas saudações iguais tornam os temas indistinguíveis")
  assert.equal(resolverTema("birthday").saudacao, "Feliz Aniversário")
})

test("tipo desconhecido cai em birthday", () => {
  assert.equal(resolverTema("nao_existe").id, "birthday")
  assert.equal(resolverTema("").id, "birthday")
  assert.equal(resolverTema("farewell").id, "farewell")
})

test("confetti_paper é alias de petals", () => {
  assert.deepEqual(resolverAnimacoes(["confetti_paper"]), ["petals"])
})

test("resolução não duplica quando alias e alvo coexistem", () => {
  assert.deepEqual(resolverAnimacoes(["petals", "confetti_paper"]), ["petals"])
})

test("o evento já gravado continua válido", () => {
  assert.deepEqual(
    resolverAnimacoes(["confetti", "balloons", "confetti_paper"]),
    ["confetti", "balloons", "petals"]
  )
})

test("ids desconhecidos são descartados", () => {
  assert.deepEqual(resolverAnimacoes(["confetti", "lixo"]), ["confetti"])
})

test("confetti_paper não aparece como opção no formulário", () => {
  // Comparação via string porque ANIMACOES é `as const`: hoje o TS já sabe que
  // esse id não está lá. O teste protege contra alguém reintroduzi-lo.
  const ids: string[] = ANIMACOES.map((a) => a.id)
  assert.ok(!ids.includes("confetti_paper"))
  assert.equal(ANIMACOES.length, 6)
})

test("toda animação padrão de tema é uma opção válida", () => {
  const validos = new Set(ANIMACOES.map((a) => a.id as string))
  for (const tema of Object.values(TEMAS)) {
    for (const id of tema.animacoesPadrao) {
      assert.ok(validos.has(id), `${tema.id} referencia animação inexistente: ${id}`)
    }
  }
})
