"use client"

import EstadoVazio from "@/components/ui/EstadoVazio"
import { use, useCallback, useEffect, useRef, useState } from "react"
import { Download, PartyPopper } from "lucide-react"
import MuralCanvas from "@/components/Mural/MuralCanvas"
import AnimationLayer from "@/components/Animations/AnimationLayer"
import { PALETA_ANIMACAO, resolverTema } from "@/lib/themes"

interface Postit {
  id: string
  name: string
  message: string
  color: string
  icon?: string | null
  positionX: number
  positionY: number
}

interface EventData {
  id: string
  title: string
  description?: string
  eventDate: string
  type: string
  animations: string[]
  postits: Postit[]
}

export default function RevelacaoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)

  const [event, setEvent] = useState<EventData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [showAnimations, setShowAnimations] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const muralRef = useRef<HTMLDivElement>(null)

  const fetchEvent = useCallback(async () => {
    try {
      const res = await fetch(`/api/revelacao/${token}`)
      if (!res.ok) {
        setError("Este mural não existe mais")
        return
      }
      const data: EventData = await res.json()
      setEvent(data)

      // A animação é o ponto deste link: dispara assim que o mural chega, e não
      // ao deixar um recado (que é o que acontecia no link de coleta). Não há
      // timeout aqui: o AnimationLayer é quem decai da celebração para o
      // movimento de fundo, que fica rodando enquanto a pessoa lê.
      if (data.animations?.length) {
        setShowAnimations(true)
      }
    } catch {
      setError("Erro ao carregar o mural")
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchEvent()
  }, [fetchEvent])

  const handleExportPdf = async () => {
    if (!muralRef.current) return
    setIsExporting(true)
    try {
      const html2pdf = (await import("html2pdf.js")).default
      await html2pdf()
        .set({
          margin: 10,
          filename: `mural-${event?.title || "evento"}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
        })
        .from(muralRef.current)
        .save()
    } catch (err) {
      console.error("Error exporting PDF:", err)
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">😔 Oops!</h1>
          <p className="text-gray-600">{error || "Mural não encontrado"}</p>
        </div>
      </div>
    )
  }

  const tema = resolverTema(event.type)

  return (
    <div className="min-h-screen p-4 md:p-8">
      {showAnimations && (
        <AnimationLayer animations={event.animations} cores={PALETA_ANIMACAO[tema.id]} />
      )}

      {/* relative z-0 dá contexto de empilhamento próprio: o canvas usa -z-10, e
          sem isto a ordem dependeria do DOM em vez de ser explícita. */}
      <div className="relative z-0 max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          {/* Cor sólida do tema em vez do gradiente com bg-clip-text: além de
              seguir a identidade do evento, um título com cor não tem como
              renderizar invisível. */}
          <h1 className="text-4xl font-bold" style={{ color: tema.acento }}>
            {event.title}
          </h1>
          {event.description && <p className="text-gray-600">{event.description}</p>}
          <p className="text-sm text-gray-600">
            {event.postits.length === 1
              ? "1 recado deixado para você"
              : `${event.postits.length} recados deixados para você`}
          </p>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleExportPdf}
            disabled={isExporting}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition disabled:opacity-50"
          >
            <Download className="w-5 h-5" />
            {isExporting ? "Exportando..." : "Salvar em PDF"}
          </button>
        </div>

        <div ref={muralRef}>
          {event.postits.length === 0 ? (
            <EstadoVazio
              Icone={PartyPopper}
              titulo="Ainda não há recados"
              descricao="Volte daqui a pouco."
            />
          ) : (
            <MuralCanvas postits={event.postits} readOnly tema={tema} />
          )}
        </div>
      </div>
    </div>
  )
}
