"use client"

import { useEffect, useRef, useState } from "react"
import MuralCanvas from "@/components/Mural/MuralCanvas"
import { resolverTema } from "@/lib/themes"
import { posicaoNaGrade } from "@/lib/arranjo"
import { exportarMuralEmPdf, normalizarCoresParaCaptura } from "@/lib/exportar-pdf"

/**
 * Bancada do export em PDF.
 *
 * Reproduz o botão da página de revelação sobre o mural de verdade, para poder
 * clicar nele com o Playwright e ler o erro no console — que é onde ele estava
 * morrendo calado. 404 em produção, como toda rota sob /preview.
 */

const NOMES = ["Ana", "Bruno", "Carla", "Diego"]

// Precisa parecer um mural de verdade, não um mínimo confortável. A primeira
// versão desta bancada tinha `icon: null` em todos os recados e por isso deu o
// export como consertado: o ícone é um SVG do lucide com `stroke="currentColor"`,
// e é justamente o `stroke` que derrubava o html2canvas.
const ICONES = ["Cake", null, "Heart", null, "PartyPopper"]
// Uma cor escolhida à mão entra na roda: esse caminho usa hex, não oklch, e
// tem de continuar funcionando também.
const CORES = ["", "", "#FEF08A", "", ""]
const TEMPLATES = ["", "fita_caveat", "percevejo_kalam", "fita_kalam", ""]

const POSTITS = Array.from({ length: 5 }, (_, i) => {
  const p = posicaoNaGrade(i, 1100)
  return {
    id: String(i),
    name: NOMES[i % NOMES.length],
    message: "Parabéns! Que venha um ano incrível.",
    color: CORES[i],
    icon: ICONES[i],
    template: TEMPLATES[i],
    positionX: p.x,
    positionY: p.y,
  }
})

export default function PreviewExport() {
  const muralRef = useRef<HTMLDivElement>(null)
  const [exportando, setExportando] = useState(false)
  const [erro, setErro] = useState("")
  const tema = resolverTema("birthday")

  // Exposta para o scripts/conferir-export.mjs poder afirmar o que interessa:
  // que depois de normalizar não sobra nenhuma cor que o html2canvas recuse.
  // Só baixar o PDF não bastaria — foi assim que a primeira correção passou
  // por boa enquanto ainda quebrava em recado com ícone.
  useEffect(() => {
    ;(window as unknown as Record<string, unknown>).__normalizarCores =
      normalizarCoresParaCaptura
  }, [])

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
