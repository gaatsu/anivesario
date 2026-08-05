"use client"

import EstadoVazio from "@/components/ui/EstadoVazio"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Plus, PartyPopper } from "lucide-react"
import MuralCanvas from "@/components/Mural/MuralCanvas"
import PostitForm, { type RecadoEditavel } from "@/components/Forms/PostitForm"
import { esquecerRecado, tokenDoRecado } from "@/lib/meus-recados"
import { resolverTema } from "@/lib/themes"

interface Postit {
  id: string
  name: string
  message: string
  color: string
  icon?: string | null
  template?: string
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
  // Recado sendo editado. O mesmo formulário serve para criar e editar.
  const [editando, setEditando] = useState<RecadoEditavel | null>(null)

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
    setEditando(null)
    fetchEvent()
  }

  const handleExcluir = async (postit: Postit) => {
    if (!confirm("Apagar seu recado? Não dá para desfazer.")) return

    const res = await fetch(`/api/mural/${shareLink}/postits/${postit.id}`, {
      method: "DELETE",
      // Cabeçalho, e não corpo: DELETE com corpo atravessa mal proxies.
      headers: { "x-recado-token": tokenDoRecado(postit.id) ?? "" },
    })

    if (res.ok) {
      esquecerRecado(postit.id)
      fetchEvent()
    } else {
      alert("Não consegui apagar o recado.")
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
          {/* Aqui o público são os colegas, não o homenageado: a chamada é um
              convite a escrever, e não a saudação da revelação. */}
          <p className="text-apoio font-medium uppercase tracking-wide text-gray-600">
            {tema.convite}
          </p>
          {/* Cor sólida do tema em vez do gradiente com bg-clip-text: segue a
              identidade do evento e não tem como renderizar invisível. */}
          <h1 className="text-3xl sm:text-4xl font-bold text-balance" style={{ color: tema.acento }}>
            {event.title}
          </h1>
          {event.description && (
            <p className="text-gray-600">{event.description}</p>
          )}
        </div>

        {/* Sem exportar PDF aqui de propósito: este link circula no grupo, e o
            PDF leva o mural inteiro de recados. Quem exporta é o homenageado,
            no link da surpresa. */}
        <div className="flex justify-center">
          <button
            onClick={() => {
              setEditando(null)
              setShowForm(true)
            }}
            className="flex w-full max-w-xs items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-3 font-semibold text-white transition hover:shadow-lg sm:w-auto"
          >
            <Plus className="w-5 h-5" />
            Deixar Recado
          </button>
        </div>

        <div>
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
              onEditar={(p) => {
                setEditando(p)
                setShowForm(true)
              }}
              onExcluir={handleExcluir}
              tema={tema}
            />
          )}
        </div>
      </div>

      {showForm && (
        <PostitForm
          key={editando?.id ?? "novo"}
          shareLink={shareLink}
          recado={editando ?? undefined}
          onSuccess={handlePostitSuccess}
          onCancel={() => {
            setShowForm(false)
            setEditando(null)
          }}
          tema={tema}
        />
      )}
    </div>
  )
}
