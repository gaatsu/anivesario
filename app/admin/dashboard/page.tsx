"use client"

import Botao from "@/components/ui/Botao"
import EstadoVazio from "@/components/ui/EstadoVazio"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Calendar, ExternalLink, Pencil, Trash2, Gift, Users, Copy, Check } from "lucide-react"
import { QRCodeCanvas } from "qrcode.react"
import BotaoCompartilhar from "@/components/ui/BotaoCompartilhar"
import { ANIMACOES, TEMAS, TEMA_PADRAO, resolverTema } from "@/lib/themes"

interface Event {
  id: string
  title: string
  description?: string
  eventDate: string
  type: string
  animations: string[]
  shareLink: string
  revealLink: string
  status: string
  createdAt: string
}

/**
 * `<input type="datetime-local">` só aceita "YYYY-MM-DDTHH:mm" em horário local;
 * o que vem da API é ISO em UTC. Sem esta conversão, abrir a edição mostraria o
 * campo vazio e salvar apagaria a data.
 */
function paraCampoDeData(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
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
  const [editandoId, setEditandoId] = useState<string | null>(null)
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

  // Um formulário só para criar e editar: os campos são idênticos, e duplicá-los
  // garantiria que um dia divergissem.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const res = await fetch(
        editandoId ? `/api/eventos/${editandoId}` : "/api/eventos",
        {
          method: editandoId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      )

      if (res.ok) {
        fecharFormulario()
        fetchEvents()
      }
    } catch (error) {
      console.error("Error saving event:", error)
    }
  }

  const abrirCriacao = () => {
    setEditandoId(null)
    setFormData(FORM_VAZIO)
    setShowNewEventForm(true)
  }

  const abrirEdicao = (event: Event) => {
    setEditandoId(event.id)
    setFormData({
      title: event.title,
      description: event.description ?? "",
      eventDate: paraCampoDeData(event.eventDate),
      type: event.type,
      animations: [...(event.animations ?? [])],
    })
    setShowNewEventForm(true)
  }

  const fecharFormulario = () => {
    setShowNewEventForm(false)
    setEditandoId(null)
    setFormData(FORM_VAZIO)
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

        <Botao onClick={abrirCriacao}>
          <Plus className="w-5 h-5" />
          Novo Evento
        </Botao>
      </div>

      {showNewEventForm && (
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8 max-w-2xl">
          <h2 className="text-2xl font-bold mb-6">
            {editandoId ? "Editar Evento" : "Criar Novo Evento"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome do homenageado
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Maria"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
              {/* Só o nome. A saudação vem do tipo do evento — se a pessoa
                  escrever "Aniversário da Maria" aqui, o mural abre com
                  "Feliz Aniversário, Aniversário da Maria". */}
              <p className="text-xs text-gray-600 mt-1">
                Só o nome. O mural vai abrir com “{resolverTema(formData.type).saudacao},{" "}
                {formData.title.trim() || "Maria"}”.
              </p>
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
              <Botao type="submit" className="flex-1">
                {editandoId ? "Salvar alterações" : "Criar Evento"}
              </Botao>
              <Botao
                type="button"
                variante="secundario"
                onClick={fecharFormulario}
                className="flex-1"
              >
                Cancelar
              </Botao>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      ) : events.length === 0 ? (
        <EstadoVazio
          Icone={Calendar}
          titulo="Nenhum evento criado ainda"
          descricao="Clique em Novo Evento para começar"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div key={event.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition">
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{event.title}</h3>
                  <p className="text-apoio text-gray-600">
                    {resolverTema(event.type).label} · abre com “
                    {resolverTema(event.type).saudacao}, {event.title}”
                  </p>
                </div>
                <p className="text-sm text-gray-600">{event.description}</p>

                {/* Dois QR codes, sempre rotulados: entregar o da surpresa a um
                    colega — ou o de coleta ao homenageado — estraga o efeito. */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 border border-gray-200 p-2 rounded-lg text-center">
                    <QRCodeCanvas
                      value={getShareUrl(event.shareLink)}
                      size={96}
                      level="H"
                      marginSize={2}
                      className="mx-auto"
                    />
                    <p className="text-apoio font-medium text-gray-700 mt-2">Para os colegas</p>
                    <p className="text-xs text-gray-600">deixar recado</p>
                  </div>

                  <div className="bg-pink-50 border border-pink-200 p-2 rounded-lg text-center">
                    <QRCodeCanvas
                      value={getRevealUrl(event.revealLink)}
                      size={96}
                      level="H"
                      marginSize={2}
                      className="mx-auto"
                    />
                    <p className="text-apoio font-medium text-pink-800 mt-2">Para o homenageado</p>
                    <p className="text-xs text-pink-700">a surpresa</p>
                  </div>
                </div>

                {/* Dois links, de propósito separados, e cada um com o próprio
                    botão de compartilhar: o de cima circula entre quem vai
                    deixar recado; o de baixo é a surpresa e só deve ir para o
                    homenageado, porque abre com as animações tocando. Um botão
                    só, genérico, mandaria o link errado no grupo errado. */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Users className="w-4 h-4" />
                    <span className="text-xs font-semibold">Link de coleta</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Mande no grupo — é onde os colegas escrevem.
                  </p>
                  <BotaoCompartilhar
                    url={getShareUrl(event.shareLink)}
                    texto={`${resolverTema(event.type).convite} ${event.title}:`}
                    rotulo="Enviar para os colegas"
                    className="w-full bg-gray-700 text-white hover:bg-gray-800"
                  />
                </div>

                <div className="bg-pink-50 border border-pink-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-pink-700">
                    <Gift className="w-4 h-4" />
                    <span className="text-xs font-semibold">Link da surpresa</span>
                  </div>
                  <p className="text-xs text-pink-800">
                    Envie só para {event.title} — abre o mural com as animações.
                  </p>
                  <BotaoCompartilhar
                    url={getRevealUrl(event.revealLink)}
                    texto={`${event.title}, tem uma surpresa esperando por você:`}
                    rotulo="Enviar a surpresa"
                    className="w-full bg-pink-600 text-white hover:bg-pink-700"
                  />
                  <button
                    onClick={() => handleCopyReveal(event.revealLink)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-pink-700 hover:bg-pink-100 rounded-lg transition text-xs font-medium"
                  >
                    {copiedId === event.revealLink ? (
                      <><Check className="w-4 h-4" /> Copiado</>
                    ) : (
                      <><Copy className="w-4 h-4" /> Copiar link</>
                    )}
                  </button>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/eventos/${event.shareLink}/mural`}
                    target="_blank"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition text-sm font-medium"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir mural
                  </Link>

                  <button
                    onClick={() => abrirEdicao(event)}
                    title="Editar evento"
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteEvent(event.id)}
                    title="Excluir evento"
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
