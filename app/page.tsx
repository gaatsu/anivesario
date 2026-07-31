import Link from "next/link"
import { getCurrentUser } from "@/lib/current-user"
import { LayoutDashboard, Users } from "lucide-react"
import { TEMAS } from "@/lib/themes"

export default async function Home() {
  const user = await getCurrentUser()

  if (user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-8 max-w-2xl">
          <h1 className="text-titulo font-bold text-gray-900">
            Bem-vindo, {user.name}
          </h1>

          <p className="text-xl text-gray-600">
            Crie murais de recados para os momentos do seu time
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/admin/dashboard"
              className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <LayoutDashboard className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
              <h2 className="font-semibold text-lg mb-1 text-gray-900">Dashboard</h2>
              <p className="text-sm text-gray-600">Gerenciar seus eventos e murais</p>
            </Link>

            {user.role === "MASTER_ADMIN" && (
              <Link
                href="/admin/delegados"
                className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <Users className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
                <h2 className="font-semibold text-lg mb-1 text-gray-900">Delegados</h2>
                <p className="text-sm text-gray-600">Convidar outros administradores</p>
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-8 max-w-2xl">
        <div>
          <h1 className="text-5xl font-bold mb-4 text-gray-900">💬 Mensagens Corp.</h1>
          <p className="text-xl text-gray-600">
            Murais de recados para aniversários, despedidas, boas-vindas e conquistas do time
          </p>
        </div>

        {/* Os quatro tipos vêm do registry: acrescentar um tema aqui não exige
            editar esta página. */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-8">
          {Object.values(TEMAS).map((tema) => (
            <div
              key={tema.id}
              className="p-4 bg-white rounded-lg border border-gray-200"
            >
              <span
                className="block w-8 h-8 rounded-full mx-auto mb-2"
                style={{ backgroundColor: tema.acento }}
                aria-hidden="true"
              />
              <p className="font-semibold text-sm text-gray-900">{tema.label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/auth/login"
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition"
          >
            Entrar
          </Link>
        </div>

        <p className="text-apoio text-gray-600 max-w-md mx-auto">
          Quem deixa recado não precisa de login. O homenageado recebe um link separado, que abre
          o mural em clima de festa.
        </p>
      </div>
    </div>
  )
}
