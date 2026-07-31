"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Calendar, Share2, Trash2 } from "lucide-react"
import { QRCodeCanvas } from "qrcode.react"

interface Event {
  id: string
  title: string
  description?: string
  eventDate: string
  shareLink: string
  status: string
  createdAt: string
}

export default function DashboardPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showNewEventForm, setShowNewEventForm] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    eventDate: "",
    type: "birthday",
    animations: [] as string[],
  })

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
        setFormData({
          title: "",
          description: "",
          eventDate: "",
          type: "birthday",
          animations: [],
        })
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

  const getShareUrl = (shareLink: string) =>
    `${window.location.origin}/eventos/${shareLink}/mural`

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Meus Eventos</h1>
          <p className="text-gray-600 mt-1">Crie e gerencie seus murais de recados</p>
        </div>

        <button
          onClick={() => setShowNewEventForm(true)}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg font-semibold hover:shadow-lg transition"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent h-24"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                >
                  <option value="birthday">Aniversário</option>
                  <option value="vacation">Férias</option>
                  <option value="custom">Customizado</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Animações
              </label>
              <div className="space-y-2">
                {["confetti", "balloons", "fireworks", "confetti_paper"].map((anim) => (
                  <label key={anim} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.animations.includes(anim)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            animations: [...formData.animations, anim],
                          })
                        } else {
                          setFormData({
                            ...formData,
                            animations: formData.animations.filter((a) => a !== anim),
                          })
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm capitalize">{anim.replace("_", " ")}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="flex-1 px-6 py-2 bg-pink-500 text-white rounded-lg font-semibold hover:bg-pink-600 transition"
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
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
