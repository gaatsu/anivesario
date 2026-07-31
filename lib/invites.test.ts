import { test } from "node:test"
import assert from "node:assert/strict"
import { generateInviteToken, INVITE_TTL_MS } from "./invites.ts"

test("token é longo e url-safe", () => {
  const t = generateInviteToken()
  assert.ok(t.length >= 43, `esperava >= 43 chars, veio ${t.length}`)
  assert.match(t, /^[A-Za-z0-9_-]+$/)
})

test("tokens não se repetem", () => {
  const s = new Set(Array.from({ length: 500 }, generateInviteToken))
  assert.equal(s.size, 500)
})

test("validade é de 7 dias", () => {
  assert.equal(INVITE_TTL_MS, 7 * 24 * 60 * 60 * 1000)
})
