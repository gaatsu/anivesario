"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Calendar, Share2, Trash2, Gift, Copy, Check } from "lucide-react"
import { QRCodeCanvas } from "qrcode.react"
import { ANIMACOES, TEMAS, TEMA_PADRAO, resolverTema } from "@/lib/themes"

interface Event {
  id: string
  title: string
  description?: string
  eventDate: string
  shareLink: string
  revealLink: string
  status: string
  createdAt: string
}

// O formulário já nasce com as animações do tema padrão, para que criar um
// evento sem mexer em nada ainda produza um mural com identidade.
const FORM_VAZIO = {
  title: "",
  description: "",
  eventDate: "",
  type: TEMA_PADRAO as string,
  animations: [...TEMAS[TEMA_PADRAO].animacoesPadrao] as string[],
}

export default function DashboardPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showNewEventForm, setShowNewEventForm] = useState(false)
  const [formData, setFormData] = useState(FORM_VAZIO)

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/eventos")
      const data = await res.json()
      setEvents(data || [])
    } catch (error) {
      console.error("Error fetching events:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const res = await fetch("/api/eventos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setFormData(FORM_VAZIO)
        setShowNewEventForm(false)
        fetchEvents()
      }
    } catch (error) {
      console.error("Error creating event:", error)
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (confirm("Tem certeza que deseja deletar este evento?")) {
      try {
        await fetch(`/api/eventos/${eventId}`, { method: "DELETE" })
        fetchEvents()
      } catch (error) {
        console.error("Error deleting event:", error)
      }
    }
  }

  // Trocar o tipo repõe as animações daquele tema. É sugestão, não trava: os
  // checkboxes seguem editáveis logo abaixo.
  const handleTrocarTipo = (type: string) => {
    setFormData({ ...formData, type, animations: [...resolverTema(type).animacoesPadrao] })
  }

  const getShareUrl = (shareLink: string) =>
    `${window.location.origin}/eventos/${shareLink}/mural`

  const getRevealUrl = (revealLink: string) =>
    `${window.location.origin}/revelacao/${revealLink}`

  const handleCopyReveal = async (revealLink: string) => {
    await navigator.clipboard.writeText(getRevealUrl(revealLink))
    setCopiedId(revealLink)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Meus Eventos</h1>
          <p className="text-gray-600 mt-1">Crie e gerencie seus murais de recados</p>
        </div>

        <button
          onClick={() => setShowNewEventForm(true)}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold hover:shadow-lg transition"
        >
          <Plus className="w-5 h-5" />
          Novo Evento
        </button>
      </div>

      {showNewEventForm && (
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8 max-w-2xl">
          <h2 className="text-2xl font-bold mb-6">Criar Novo Evento</h2>

          <form onSubmit={handleCreateEvent} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Aniversário da Maria"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva seu evento"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent h-24"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data
                </label>
                <input
                  type="datetime-local"
                  value={formData.eventDate}
                  onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => handleTrocarTipo(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {Object.values(TEMAS).map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-600 mt-1">
                  {resolverTema(formData.type).descricao}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Animações
              </label>
              <div className="space-y-2">
                {ANIMACOES.map((anim) => (
                  <label
                    key={anim.id}
                    className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={formData.animations.includes(anim.id)}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          animations: e.target.checked
                            ? [...formData.animations, anim.id]
                            : formData.animations.filter((a) => a !== anim.id),
                        })
                      }
                      className="w-4 h-4 mt-0.5"
                    />
                    <span>
                      <span className="block text-sm font-medium text-gray-900">{anim.label}</span>
                      <span className="block text-xs text-gray-600">{anim.descricao}</span>
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Só tocam no link da surpresa, nunca no link de coleta.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="flex-1 px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
              >
                Criar Evento
              </button>
              <button
                type="button"
                onClick={() => setShowNewEventForm(false)}
                className="flex-1 px-6 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Nenhum evento criado ainda
          </h2>
          <p className="text-gray-600">Clique em "Novo Evento" para começar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div key={event.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition">
              <div className="p-6 space-y-4">
                <h3 className="text-xl font-bold text-gray-900">{event.title}</h3>
                <p className="text-sm text-gray-600">{event.description}</p>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <QRCodeCanvas
                    value={getShareUrl(event.shareLink)}
                    size={120}
                    level="H"
                    marginSize={2}
                    className="mx-auto"
                  />
                </div>

                {/* Dois links, de propósito separados: o de cima circula entre
                    quem vai deixar recado; o de baixo é a surpresa e só deve ir
                    para o homenageado, porque abre com as animações tocando. */}
                <div className="bg-pink-50 border border-pink-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-pink-700">
                    <Gift className="w-4 h-4" />
                    <span className="text-xs font-semibold">Link da surpresa</span>
                  </div>
                  <p className="text-xs text-pink-800">
                    Envie só para o homenageado — abre o mural com as animações.
                  </p>
                  <button
                    onClick={() => handleCopyReveal(event.revealLink)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition text-sm font-medium"
                  >
                    {copiedId === event.revealLink ? (
                      <><Check className="w-4 h-4" /> Copiado</>
                    ) : (
                      <><Copy className="w-4 h-4" /> Copiar link da surpresa</>
                    )}
                  </button>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/eventos/${event.shareLink}/mural`}
                    target="_blank"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition text-sm font-medium"
                  >
                    <Share2 className="w-4 h-4" />
                    Compartilhar
                  </Link>

                  <button
                    onClick={() => handleDeleteEvent(event.id)}
                    className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
