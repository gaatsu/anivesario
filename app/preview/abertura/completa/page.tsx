"use client"

import { useState } from "react"
import Abertura from "@/components/Abertura/Abertura"
import { PALETA_ANIMACAO, resolverTema } from "@/lib/themes"

/**
 * Bancada da abertura inteira, e não só da peça central.
 *
 * A rota irmã mostra os desenhos lado a lado; esta toca a cena de verdade, que é
 * o único jeito de olhar o convite que aparece quando o aparelho está com as
 * animações reduzidas — no Playwright, com `reducedMotion: "reduce"`.
 *
 * `?tema=birthday` escolhe o tema. Fora do ar em produção.
 */
export default function PreviewAberturaCompleta() {
  const [tocando, setTocando] = useState(true)

  const tipo =
    typeof window !== "undefined"
      ? (new URLSearchParams(location.search).get("tema") ?? "birthday")
      : "birthday"
  const tema = resolverTema(tipo)

  return (
    <main className="fundo-papel min-h-screen p-10">
      <h1 className="text-titulo font-bold text-tinta">Abertura completa — {tema.label}</h1>
      <button
        type="button"
        onClick={() => setTocando(true)}
        className="mt-4 rounded-lg bg-pink-600 px-4 py-2 text-white"
      >
        Tocar de novo
      </button>

      {tocando && (
        <Abertura
          tema={tema}
          nome="Maria"
          cores={PALETA_ANIMACAO[tema.id]}
          aoTerminar={() => setTocando(false)}
        />
      )}
    </main>
  )
}
