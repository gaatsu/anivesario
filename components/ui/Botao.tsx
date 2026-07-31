import { cn } from "@/lib/utils"

type Variante = "primario" | "secundario" | "perigo"

// Antes cada tela repetia estas classes com pequenas diferenças — padding
// diferente aqui, hover ausente ali — e elas foram divergindo.
const VARIANTES: Record<Variante, string> = {
  primario: "bg-indigo-600 text-white hover:bg-indigo-700",
  secundario: "bg-white border border-gray-300 text-gray-900 hover:bg-gray-50",
  perigo: "bg-red-50 text-red-700 hover:bg-red-100",
}

interface BotaoProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
}

export default function Botao({ variante = "primario", className, ...props }: BotaoProps) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 font-semibold transition",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600",
        VARIANTES[variante],
        className
      )}
    />
  )
}
