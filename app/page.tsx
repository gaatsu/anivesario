"use client"

import Link from "next/link"
import { authClient } from "@/lib/neon-auth-client"
import { Cake, Gift, PartyPopper } from "lucide-react"

export default function Home() {
  const { data: session } = authClient.useSession()

  if (session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-8 max-w-2xl">
          <div className="inline-flex items-center gap-3 justify-center">
            <PartyPopper className="w-10 h-10 text-pink-500" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
              Bem-vindo, {session.user?.name}!
            </h1>
            <Gift className="w-10 h-10 text-yellow-500" />
          </div>

          <p className="text-xl text-gray-600">
            Crie murais de recados memoráveis para seus eventos especiais
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/admin/dashboard"
              className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <Cake className="w-8 h-8 text-pink-500 mx-auto mb-3" />
              <h2 className="font-semibold text-lg mb-2">Dashboard</h2>
              <p className="text-sm text-gray-600">Gerenciar seus eventos e murais</p>
            </Link>

            <Link href="/admin/delegados"
              className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <Gift className="w-8 h-8 text-purple-500 mx-auto mb-3" />
              <h2 className="font-semibold text-lg mb-2">Delegados</h2>
              <p className="text-sm text-gray-600">Gerenciar admin delegados</p>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-8 max-w-2xl">
        <div>
          <h1 className="text-5xl font-bold mb-4">
            🎉 Murais de Recados
          </h1>
          <p className="text-xl text-gray-600">
            Crie murais interativos e memoráveis para aniversários, férias e eventos especiais
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
          <div className="p-4 bg-pink-50 rounded-lg">
            <Cake className="w-8 h-8 text-pink-500 mx-auto mb-2" />
            <p className="font-semibold">Aniversários</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <Gift className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="font-semibold">Eventos</p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg">
            <PartyPopper className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <p className="font-semibold">Celebrações</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/auth/login"
            className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg font-semibold hover:shadow-lg transition-shadow">
            Entrar
          </Link>
          <Link href="/auth/register"
            className="px-8 py-3 bg-white border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
            Criar Conta
          </Link>
        </div>

        <p className="text-sm text-gray-500 max-w-md mx-auto">
          ✨ Compartilhe links sem necessidade de login, escolha postits coloridos, arraste livremente e exporte como PDF
        </p>
      </div>
    </div>
  )
}
