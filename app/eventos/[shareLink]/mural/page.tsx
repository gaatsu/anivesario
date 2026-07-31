"use client"

import EstadoVazio from "@/components/ui/EstadoVazio"
import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import { Plus, Download, PartyPopper } from "lucide-react"
import MuralCanvas from "@/components/Mural/MuralCanvas"
import PostitForm from "@/components/Forms/PostitForm"
import { resolverTema } from "@/lib/themes"

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

export default function MuralPage() {
  const params = useParams()
  const shareLink = params.shareLink as string

  const [event, setEvent] = useState<EventData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const muralRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchEvent()
  }, [shareLink])

  const fetchEvent = async () => {
    try {
      const res = await fetch(`/api/mural/${shareLink}`)
      if (!res.ok) {
        setError("Evento não encontrado ou expirado")
        return
      }
      const data = await res.json()
      setEvent(data)
    } catch (err) {
      setError("Erro ao carregar o mural")
    } finally {
      setIsLoading(false)
    }
  }

  // Sem animação aqui de propósito: as animações são a surpresa do homenageado,
  // e este é o link de coleta, usado por quem escreve o recado. Elas tocam ao
  // abrir /revelacao/[token].
  const handlePostitSuccess = () => {
    setShowForm(false)
    fetchEvent()
  }

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
          <p className="text-gray-600">{error || "Evento não encontrado"}</p>
        </div>
      </div>
    )
  }

  const tema = resolverTema(event.type)

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          {/* Cor sólida do tema em vez do gradiente com bg-clip-text: segue a
              identidade do evento e não tem como renderizar invisível. */}
          <h1 className="text-4xl font-bold" style={{ color: tema.acento }}>
            {event.title}
          </h1>
          {event.description && (
            <p className="text-gray-600">{event.description}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-4 justify-center">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg font-semibold hover:shadow-lg transition"
          >
            <Plus className="w-5 h-5" />
            Deixar Recado
          </button>

          <button
            onClick={handleExportPdf}
            disabled={isExporting}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition disabled:opacity-50"
          >
            <Download className="w-5 h-5" />
            {isExporting ? "Exportando..." : "Exportar PDF"}
          </button>
        </div>

        <div ref={muralRef}>
          {event.postits.length === 0 ? (
            <EstadoVazio
              Icone={PartyPopper}
              titulo="Nenhum recado ainda"
              descricao="Seja o primeiro a deixar uma mensagem!"
            />
          ) : (
            <MuralCanvas
              shareLink={shareLink}
              postits={event.postits}
              onPositionsChange={() => {}}
              tema={tema}
            />
          )}
        </div>
      </div>

      {showForm && (
        <PostitForm
          shareLink={shareLink}
          onSuccess={handlePostitSuccess}
          onCancel={() => setShowForm(false)}
          tema={tema}
        />
      )}
    </div>
  )
}
