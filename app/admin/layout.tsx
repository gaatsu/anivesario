"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import Link from "next/link"
import { LogOut, LayoutDashboard, Users } from "lucide-react"
import { signOut } from "next-auth/react"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login")
    }
  }, [status, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return null
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold text-pink-600">🎉 Aniversário</h2>
          <p className="text-xs text-gray-500 mt-1">{session?.user?.email}</p>
        </div>

        <nav className="p-4 space-y-2">
          <Link href="/admin/dashboard"
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 transition">
            <LayoutDashboard className="w-5 h-5 text-pink-500" />
            <span className="font-medium">Dashboard</span>
          </Link>

          <Link href="/admin/delegados"
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 transition">
            <Users className="w-5 h-5 text-purple-500" />
            <span className="font-medium">Delegados</span>
          </Link>
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <button
            onClick={() => signOut()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-medium"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
