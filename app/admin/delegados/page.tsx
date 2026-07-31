"use client"

import { useEffect, useState } from "react"
import { Plus, Trash2, Users } from "lucide-react"

interface Delegate {
  id: string
  delegateEmail: string
  status: string
  createdAt: string
}

export default function DelegadosPage() {
  const [delegates, setDelegates] = useState<Delegate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    fetchDelegates()
  }, [])

  const fetchDelegates = async () => {
    try {
      const res = await fetch("/api/delegados")
      const data = await res.json()
      setDelegates(data || [])
    } catch (error) {
      console.error("Error fetching delegates:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddDelegate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    try {
      const res = await fetch("/api/delegados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delegateEmail: email }),
      })

      if (res.ok) {
        setEmail("")
        setShowForm(false)
        fetchDelegates()
      } else {
        const data = await res.json()
        setError(data.message || "Erro ao adicionar delegado")
      }
    } catch (error) {
      setError("Erro ao adicionar delegado")
    }
  }

  const handleRemoveDelegate = async (delegateId: string) => {
    if (confirm("Tem certeza que deseja remover este delegado?")) {
      try {
        await fetch(`/api/delegados/${delegateId}`, { method: "DELETE" })
        fetchDelegates()
      } catch (error) {
        console.error("Error removing delegate:", error)
      }
    }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gerenciar Delegados</h1>
          <p className="text-gray-600 mt-1">Invitar admins para gerenciar eventos</p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg font-semibold hover:shadow-lg transition"
        >
          <Plus className="w-5 h-5" />
          Adicionar Delegado
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8 max-w-xl">
          <h2 className="text-2xl font-bold mb-6">Convidar Delegado</h2>

          <form onSubmit={handleAddDelegate} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email do Delegado
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="delegado@email.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                required
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="flex-1 px-6 py-2 bg-pink-500 text-white rounded-lg font-semibold hover:bg-pink-600 transition"
              >
                Enviar Convite
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
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
      ) : delegates.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Nenhum delegado adicionado
          </h2>
          <p className="text-gray-600">Invitar alguém para ajudar a gerenciar seus eventos</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Data
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {delegates.map((delegate) => (
                <tr key={delegate.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {delegate.delegateEmail}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        delegate.status === "ACCEPTED"
                          ? "bg-green-50 text-green-700"
                          : "bg-yellow-50 text-yellow-700"
                      }`}
                    >
                      {delegate.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(delegate.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleRemoveDelegate(delegate.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
