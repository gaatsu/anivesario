import type { LucideIcon } from "lucide-react"

interface EstadoVazioProps {
  Icone: LucideIcon
  titulo: string
  descricao: string
}

export default function EstadoVazio({ Icone, titulo, descricao }: EstadoVazioProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
      {/* text-gray-400 e não gray-300: mesmo decorativo, gray-300 sobre branco
          fica quase invisível. */}
      <Icone className="w-14 h-14 text-gray-400 mx-auto mb-4" aria-hidden="true" />
      <h2 className="text-seccao font-semibold text-gray-900 mb-1">{titulo}</h2>
      <p className="text-gray-600">{descricao}</p>
    </div>
  )
}
