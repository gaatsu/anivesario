import { redirect } from "next/navigation"
import Link from "next/link"
import { LayoutDashboard, Users } from "lucide-react"
import { getCurrentUser } from "@/lib/current-user"
import LogoutButton from "@/components/LogoutButton"

// Server Component: a sessão é resolvida antes do render, então some o estado de
// "Carregando..." que a versão client-side mostrava em toda navegação.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Coluna no celular, lateral a partir de sm: um aside de 256px fixos deixava
  // 134px de conteúdo numa tela de 390.
  return (
    <div className="min-h-screen flex flex-col sm:flex-row bg-gray-50">
      <aside className="w-full sm:w-64 bg-white shadow-lg flex flex-col shrink-0">
        <div className="p-4 sm:p-6 border-b">
          <h2 className="text-seccao sm:text-2xl font-bold text-indigo-700">💬 Mensagens Corp.</h2>
          <p className="text-xs text-gray-600 mt-1">{user.email}</p>
        </div>

        {/* Lado a lado no celular, empilhado no desktop: no telefone a barra
            precisa ser fina para não empurrar o conteúdo para baixo da dobra. */}
        <nav className="flex sm:flex-col gap-2 p-3 sm:p-4">
          <Link href="/admin/dashboard"
            className="flex flex-1 sm:flex-none items-center gap-3 px-4 py-3 sm:py-2 rounded-lg hover:bg-gray-100 transition">
            <LayoutDashboard className="w-5 h-5 text-indigo-600" />
            <span className="font-medium">Dashboard</span>
          </Link>

          {user.role === "MASTER_ADMIN" && (
            <Link href="/admin/delegados"
              className="flex flex-1 sm:flex-none items-center gap-3 px-4 py-3 sm:py-2 rounded-lg hover:bg-gray-100 transition">
              <Users className="w-5 h-5 text-purple-500" />
              <span className="font-medium">Delegados</span>
            </Link>
          )}
        </nav>

        <div className="mt-auto p-4 sm:p-6">
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
