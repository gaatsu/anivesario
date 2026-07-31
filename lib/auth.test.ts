import { test } from "node:test"
import assert from "node:assert/strict"

process.env.AUTH_SECRET = "segredo-de-teste-nao-usar-em-producao"

const { hashPassword, verifyPassword, signSession, verifySession } = await import("./auth.ts")

test("hash da senha não contém a senha em texto puro", () => {
  const h = hashPassword("@Cvale2026123")
  assert.ok(!h.includes("@Cvale2026123"))
  assert.match(h, /^scrypt\$/)
})

test("senha correta verifica, senha errada não", () => {
  const h = hashPassword("senha-correta")
  assert.equal(verifyPassword("senha-correta", h), true)
  assert.equal(verifyPassword("senha-errada", h), false)
})

test("hashes da mesma senha diferem (salt aleatório)", () => {
  assert.notEqual(hashPassword("igual"), hashPassword("igual"))
})

test("hash malformado não derruba a verificação", () => {
  assert.equal(verifyPassword("x", "lixo"), false)
  assert.equal(verifyPassword("x", ""), false)
  assert.equal(verifyPassword("x", "scrypt$16384$8$1$naoBase64$@@@"), false)
})

test("sessão assinada volta o mesmo userId", () => {
  const t = signSession("user_123")
  assert.equal(verifySession(t), "user_123")
})

test("token adulterado é rejeitado", () => {
  const t = signSession("user_123")
  assert.equal(verifySession(t.slice(0, -3) + "aaa"), null)
  assert.equal(verifySession("nada"), null)
  assert.equal(verifySession(""), null)
})

test("trocar o userId sem reassinar é rejeitado", () => {
  const [, exp, mac] = signSession("user_123").split(".")
  const forjado = `${Buffer.from("user_666").toString("base64url")}.${exp}.${mac}`
  assert.equal(verifySession(forjado), null)
})

test("token expirado é rejeitado", () => {
  assert.equal(verifySession(signSession("user_123", -1000)), null)
})
