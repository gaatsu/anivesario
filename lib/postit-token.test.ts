import { test } from "node:test"
import assert from "node:assert/strict"

process.env.AUTH_SECRET = "segredo-de-teste-nao-usado-em-producao"

const { assinarPostit, verificarPostit } = await import("./postit-token.ts")

test("o token do próprio recado é aceito", () => {
  const id = "cm3abc123"
  assert.ok(verificarPostit(id, assinarPostit(id)))
})

test("o token de um recado não serve para outro", () => {
  // O ponto inteiro do mecanismo: o link de coleta é público, então sem isto
  // quem escreveu um recado poderia apagar o de todo mundo.
  assert.ok(!verificarPostit("recado-b", assinarPostit("recado-a")))
})

test("token ausente, vazio ou de outro tipo é recusado", () => {
  const id = "cm3abc123"
  for (const lixo of [undefined, null, "", 42, {}, [], true]) {
    assert.ok(!verificarPostit(id, lixo), `aceitou ${JSON.stringify(lixo)}`)
  }
})

test("token adulterado é recusado", () => {
  const id = "cm3abc123"
  const bom = assinarPostit(id)

  // Trocar um caractere mantendo o comprimento: é o ataque que uma comparação
  // por tamanho deixaria passar.
  const trocado = (bom[0] === "A" ? "B" : "A") + bom.slice(1)
  assert.equal(trocado.length, bom.length)
  assert.ok(!verificarPostit(id, trocado))

  assert.ok(!verificarPostit(id, bom.slice(0, -1)))
  assert.ok(!verificarPostit(id, bom + "x"))
})

test("a assinatura é estável entre chamadas", () => {
  assert.equal(assinarPostit("mesmo-id"), assinarPostit("mesmo-id"))
})
