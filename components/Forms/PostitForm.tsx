"use client"

import { useState } from "react"
import { Heart, Star, Cake, Gift, Sparkles, Laugh, Music, Sun, Moon, Flame, Zap, X } from "lucide-react"
import { POSTIT_COLORS } from "@/lib/utils"

const ICON_OPTIONS = [
  { name: "Heart", Component: Heart },
  { name: "Star", Component: Star },
  { name: "Cake", Component: Cake },
  { name: "Gift", Component: Gift },
  { name: "Sparkles", Component: Sparkles },
  { name: "Laugh", Component: Laugh },
  { name: "Music", Component: Music },
  { name: "Sun", Component: Sun },
  { name: "Moon", Component: Moon },
  { name: "Flame", Component: Flame },
  { name: "Zap", Component: Zap },
]

interface PostitFormProps {
  shareLink: string
  onSuccess: () => void
  onCancel: () => void
}

export default function PostitForm({ shareLink, onSuccess, onCancel }: PostitFormProps) {
  const [name, setName] = useState("")
  const [message, setMessage] = useState("")
  const [color, setColor] = useState(POSTIT_COLORS[0].hex)
  const [icon, setIcon] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/mural/${shareLink}/postits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          message,
          color,
          icon,
          positionX: Math.random() * 600,
          positionY: Math.random() * 300,
        }),
      })

      if (res.ok) {
        onSuccess()
      } else {
        const data = await res.json()
        setError(data.message || "Erro ao enviar recado")
      }
    } catch (err) {
      setError("Erro ao enviar recado")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full space-y-4 relative">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-bold text-gray-900">Deixe seu recado</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seu nome
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              maxLength={100}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mensagem
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escreva seu recado..."
              maxLength={500}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent h-28"
              required
            />
            <p className="text-xs text-gray-400 text-right mt-1">{message.length}/500</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cor do postit
            </label>
            <div className="flex gap-2 flex-wrap">
              {POSTIT_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  className={`w-10 h-10 rounded-full border-2 transition ${
                    color === c.hex ? "border-gray-800 scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ícone (opcional)
            </label>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIcon(null)}
                className={`px-3 py-2 rounded-lg border text-xs font-medium transition ${
                  icon === null ? "border-pink-500 bg-pink-50" : "border-gray-300"
                }`}
              >
                Nenhum
              </button>
              {ICON_OPTIONS.map(({ name: iconName, Component }) => (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setIcon(iconName)}
                  className={`p-2 rounded-lg border transition ${
                    icon === iconName ? "border-pink-500 bg-pink-50" : "border-gray-300"
                  }`}
                  title={iconName}
                >
                  <Component className="w-5 h-5 text-gray-700" />
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold py-3 rounded-lg hover:shadow-lg transition disabled:opacity-50"
          >
            {isSubmitting ? "Enviando..." : "Colar no Mural"}
          </button>
        </form>
      </div>
    </div>
  )
}
