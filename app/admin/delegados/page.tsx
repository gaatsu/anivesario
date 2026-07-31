"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus, Trash2, Users, Copy, Check } from "lucide-react"

interface Delegate {
  id: string
  label: string | null
  status: string
  expiresAt: string
  expired: boolean
  createdAt: string
  delegateUser: { name: string; email: string } | null
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Aguardando",
  ACCEPTED: "Ativo",
  REVOKED: "Revogado",
}

export default function DelegadosPage() {
  const [delegates, setDelegates] = useState<Delegate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [label, setLabel] = useState("")
  const [error, setError] = useState("")
  const [novoLink, setNovoLink] = useState("")
  const [copiado, setCopiado] = useState(false)

  const fetchDelegates = useCallback(async () => {
    try {
      const res = await fetch("/api/delegados")
      const data = await res.json()
      setDelegates(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Error fetching delegates:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDelegates()
  }, [fetchDelegates])

  const handleGerarLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    try {
      const res = await fetch("/api/delegados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      })

      const data = await res.json().catch(() => ({}))

      if (res.ok) {
        setLabel("")
        setShowForm(false)
        setNovoLink(data.url)
        setCopiado(false)
        fetchDelegates()
      } else {
        setError(data.message ?? "Erro ao gerar convite")
      }
    } catch {
      setError("Erro ao gerar convite")
    }
  }

  const handleCopiar = async () => {
    await navigator.clipboard.writeText(novoLink)
    setCopiado(true)
  }

  const handleRevogar = async (delegate: Delegate) => {
    const aviso = delegate.status === "ACCEPTED"
      ? `Revogar o acesso de ${delegate.delegateUser?.email ?? "este delegado"}? A conta e os eventos dele serão apagados.`
      : "Revogar este convite? O link deixa de funcionar."

    if (!confirm(aviso)) return

    try {
      const res = await fetch(`/api/delegados/${delegate.id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.message ?? "Erro ao revogar")
      }
      fetchDelegates()
    } catch (err) {
      console.error("Error revoking delegate:", err)
    }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gerenciar Delegados</h1>
          <p className="text-gray-600 mt-1">Gere um link de convite para outro administrador</p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg font-semibold hover:shadow-lg transition"
        >
          <Plus className="w-5 h-5" />
          Gerar link de convite
        </button>
      </div>

      {novoLink && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
          <h2 className="font-semibold text-green-900 mb-1">Link gerado</h2>
          <p className="text-sm text-green-800 mb-4">
            Envie para a pessoa. Ele vale por 7 dias e só pode ser usado uma vez — depois disso não
            será possível vê-lo novamente.
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={novoLink}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 px-4 py-2 border border-green-300 rounded-lg text-gray-900 bg-white text-sm"
            />
            <button
              onClick={handleCopiar}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
            >
              {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiado ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8 max-w-xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Novo convite</h2>

          <form onSubmit={handleGerarLink} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Anotação (opcional)
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="ex.: para a Maria do RH"
                maxLength={100}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-600 mt-1">
                Só para você lembrar de quem é o convite. Quem receber o link define nome, email e
                senha.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="flex-1 px-6 py-2 bg-pink-500 text-white rounded-lg font-semibold hover:bg-pink-600 transition"
              >
                Gerar link
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
            Nenhum convite gerado
          </h2>
          <p className="text-gray-600">Gere um link para alguém ajudar a gerenciar seus eventos</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Delegado</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Criado</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {delegates.map((delegate) => (
                <tr key={delegate.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {delegate.delegateUser ? (
                      <>
                        <div className="font-medium">{delegate.delegateUser.name}</div>
                        <div className="text-gray-600">{delegate.delegateUser.email}</div>
                      </>
                    ) : (
                      <span className="text-gray-600">{delegate.label ?? "Convite sem anotação"}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        delegate.status === "ACCEPTED"
                          ? "bg-green-50 text-green-700"
                          : delegate.status === "REVOKED"
                            ? "bg-gray-100 text-gray-700"
                            : delegate.expired
                              ? "bg-orange-50 text-orange-700"
                              : "bg-yellow-50 text-yellow-800"
                      }`}
                    >
                      {delegate.expired && delegate.status === "PENDING"
                        ? "Expirado"
                        : STATUS_LABEL[delegate.status] ?? delegate.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(delegate.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {delegate.status !== "REVOKED" && (
                      <button
                        onClick={() => handleRevogar(delegate)}
                        title="Revogar"
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
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
