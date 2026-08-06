"use client"

import { useRef, useState } from "react"
import MuralCanvas from "@/components/Mural/MuralCanvas"
import { resolverTema } from "@/lib/themes"
import { posicaoNaGrade } from "@/lib/arranjo"
import { exportarMuralEmPdf } from "@/lib/exportar-pdf"

/**
 * Bancada do export em PDF.
 *
 * Reproduz o botão da página de revelação sobre o mural de verdade, para poder
 * clicar nele com o Playwright e ler o erro no console — que é onde ele estava
 * morrendo calado. 404 em produção, como toda rota sob /preview.
 */

const NOMES = ["Ana", "Bruno", "Carla", "Diego"]

const POSTITS = Array.from({ length: 4 }, (_, i) => {
  const p = posicaoNaGrade(i, 1100)
  return {
    id: String(i),
    name: NOMES[i],
    message: "Parabéns! Que venha um ano incrível.",
    color: "",
    icon: null,
    template: "",
    positionX: p.x,
    positionY: p.y,
  }
})

export default function PreviewExport() {
  const muralRef = useRef<HTMLDivElement>(null)
  const [exportando, setExportando] = useState(false)
  const [erro, setErro] = useState("")
  const tema = resolverTema("birthday")

  // Cópia fiel do handler da revelação, para a bancada falhar pelo mesmo motivo.
  const exportar = async () => {
    if (!muralRef.current) return
    setExportando(true)
    setErro("")
    try {
      await exportarMuralEmPdf(muralRef.current, { nome: "mural-teste" })
    } catch (err) {
      setErro(String(err))
      console.error("Error exporting PDF:", err)
    } finally {
      setExportando(false)
    }
  }

  return (
    <main className="fundo-papel min-h-screen space-y-4 p-6">
      <button
        type="button"
        onClick={exportar}
        disabled={exportando}
        className="rounded-lg bg-pink-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {exportando ? "Exportando..." : "Salvar em PDF"}
      </button>

      <p data-teste="erro" className="text-apoio text-red-700">
        {erro}
      </p>

      <div ref={muralRef}>
        <MuralCanvas postits={POSTITS} readOnly tema={tema} />
      </div>
    </main>
  )
}
