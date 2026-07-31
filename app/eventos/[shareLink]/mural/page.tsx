"use client"

import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import { Plus, Download, PartyPopper } from "lucide-react"
import MuralCanvas from "@/components/Mural/MuralCanvas"
import PostitForm from "@/components/Forms/PostitForm"
import AnimationLayer from "@/components/Animations/AnimationLayer"

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
  const [showAnimations, setShowAnimations] = useState(false)
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

  const handlePostitSuccess = () => {
    setShowForm(false)
    fetchEvent()
    if (event?.animations?.length) {
      setShowAnimations(true)
      setTimeout(() => setShowAnimations(false), 5000)
    }
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

  return (
    <div className="min-h-screen p-4 md:p-8">
      {showAnimations && <AnimationLayer animations={event.animations} />}

      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          {/* bg-pink-600 é fallback: sem uma cor de fundo por baixo, se o
              gradiente não pintar o título some por completo. */}
          <h1 className="text-4xl font-bold bg-pink-600 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
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
            <div className="bg-white rounded-2xl shadow-lg p-16 text-center">
              <PartyPopper className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Nenhum recado ainda
              </h2>
              <p className="text-gray-600">Seja o primeiro a deixar uma mensagem!</p>
            </div>
          ) : (
            <MuralCanvas
              shareLink={shareLink}
              postits={event.postits}
              onPositionsChange={() => {}}
            />
          )}
        </div>
      </div>

      {showForm && (
        <PostitForm
          shareLink={shareLink}
          onSuccess={handlePostitSuccess}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
