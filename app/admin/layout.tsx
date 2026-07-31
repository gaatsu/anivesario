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

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-64 bg-white shadow-lg flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold text-pink-600">🎉 Aniversário</h2>
          <p className="text-xs text-gray-600 mt-1">{user.email}</p>
        </div>

        <nav className="p-4 space-y-2">
          <Link href="/admin/dashboard"
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 transition">
            <LayoutDashboard className="w-5 h-5 text-pink-500" />
            <span className="font-medium">Dashboard</span>
          </Link>

          {user.role === "MASTER_ADMIN" && (
            <Link href="/admin/delegados"
              className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 transition">
              <Users className="w-5 h-5 text-purple-500" />
              <span className="font-medium">Delegados</span>
            </Link>
          )}
        </nav>

        <div className="mt-auto p-6">
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
