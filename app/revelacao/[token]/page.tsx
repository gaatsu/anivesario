"use client"

import EstadoVazio from "@/components/ui/EstadoVazio"
import { use, useCallback, useEffect, useRef, useState } from "react"
import { Download, PartyPopper } from "lucide-react"
import MuralCanvas from "@/components/Mural/MuralCanvas"
import AnimationLayer from "@/components/Animations/AnimationLayer"
import Abertura from "@/components/Abertura/Abertura"
import Carrossel from "@/components/Carrossel/Carrossel"
import { PALETA_ANIMACAO, resolverTema } from "@/lib/themes"
import type { FotoAssinada } from "@/lib/fotos"
import { exportarMuralEmPdf } from "@/lib/exportar-pdf"

// sessionStorage é bloqueado em navegação privada e com cookies desativados, e
// aí lança em vez de retornar null. Falhar para "ainda não viu" é o lado certo
// de errar: mostra a abertura de novo, em vez de nunca mostrar.
const chaveAbertura = (token: string) => `abertura:${token}`

function jaViuAbertura(token: string): boolean {
  try {
    return sessionStorage.getItem(chaveAbertura(token)) !== null
  } catch {
    return false
  }
}

function marcarAberturaVista(token: string) {
  try {
    sessionStorage.setItem(chaveAbertura(token), "1")
  } catch {
    /* sem persistência: a abertura toca de novo, o que é aceitável */
  }
}

interface Postit {
  id: string
  name: string
  message: string
  color: string
  icon?: string | null
  template?: string
  positionX: number
  positionY: number
}

interface EventData {
  id: string
  title: string
  description?: string
  eventDate: string
  type: string
  animations: string[]
  photos: FotoAssinada[]
  postits: Postit[]
}

export default function RevelacaoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)

  const [event, setEvent] = useState<EventData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [showAnimations, setShowAnimations] = useState(false)
  const [mostrarAbertura, setMostrarAbertura] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [erroExport, setErroExport] = useState("")
  const muralRef = useRef<HTMLDivElement>(null)

  const fetchEvent = useCallback(async () => {
    try {
      const res = await fetch(`/api/revelacao/${token}`)
      if (!res.ok) {
        setError("Este mural não existe mais")
        return
      }
      const data: EventData = await res.json()
      setEvent(data)

      // A abertura é a surpresa, e surpresa só acontece uma vez: quem recarregar
      // a página cai direto no mural. sessionStorage e não localStorage porque
      // reabrir o link semanas depois merece a cena de novo.
      if (!jaViuAbertura(token)) {
        marcarAberturaVista(token)
        setMostrarAbertura(true)
        return
      }

      // A animação é o ponto deste link: dispara assim que o mural chega, e não
      // ao deixar um recado (que é o que acontecia no link de coleta). Não há
      // timeout aqui: o AnimationLayer é quem decai da celebração para o
      // movimento de fundo, que fica rodando enquanto a pessoa lê.
      if (data.animations?.length) {
        setShowAnimations(true)
      }
    } catch {
      setError("Erro ao carregar o mural")
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchEvent()
  }, [fetchEvent])

  const handleExportPdf = async () => {
    if (!muralRef.current) return
    setIsExporting(true)
    setErroExport("")
    try {
      await exportarMuralEmPdf(muralRef.current, {
        nome: `mural-${event?.title || "evento"}`,
      })
    } catch (err) {
      // Antes isto só ia para o console, e o botão voltava ao normal sem dizer
      // nada — o export estava quebrado havia tempo e, de fora, parecia que
      // clicar simplesmente não fazia efeito.
      console.error("Error exporting PDF:", err)
      setErroExport("Não foi possível gerar o PDF. Tente de novo.")
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">😔 Oops!</h1>
          <p className="text-gray-600">{error || "Mural não encontrado"}</p>
        </div>
      </div>
    )
  }

  const tema = resolverTema(event.type)

  return (
    <div className="min-h-screen p-4 md:p-8">
      {mostrarAbertura && (
        <Abertura
          tema={tema}
          nome={event.title}
          cores={PALETA_ANIMACAO[tema.id]}
          aoTerminar={() => {
            setMostrarAbertura(false)
            // Só agora: disparar o confetti atrás da abertura desperdiçaria a
            // rajada de celebração, que é justamente a parte que a pessoa vê uma
            // vez só.
            if (event.animations?.length) setShowAnimations(true)
          }}
        />
      )}

      {showAnimations && (
        <AnimationLayer animations={event.animations} cores={PALETA_ANIMACAO[tema.id]} />
      )}

      {/* relative z-0 fixa o conteúdo num nível explícito; as camadas de
          animação ficam acima dele, em z-20, com opacidade baixa. */}
      <div className="relative z-0 max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          {/* Cor sólida do tema em vez do gradiente com bg-clip-text: além de
              seguir a identidade do evento, um título com cor não tem como
              renderizar invisível. */}
          {/* `title` guarda o nome do homenageado; a saudação vem do tema, para
              que todo evento do mesmo tipo abra com a mesma frase. */}
          <h1 className="text-3xl sm:text-4xl font-bold text-balance" style={{ color: tema.acento }}>
            {tema.saudacao}, {event.title}!
          </h1>
          {event.description && <p className="text-gray-600">{event.description}</p>}
          <p className="text-sm text-gray-600">
            {event.postits.length === 1
              ? "1 recado deixado para você"
              : `${event.postits.length} recados deixados para você`}
          </p>
        </div>

        {/* Antes dos recados: as fotos são a parte que se olha, os recados a
            que se lê. Fora do muralRef de propósito — o PDF é dos recados, e
            html2canvas com imagens remotas mancha a exportação. */}
        {event.photos?.length > 0 && (
          <Carrossel fotos={event.photos.map((f) => f.url)} />
        )}

        <div className="flex flex-col items-center gap-2">
          <button
            onClick={handleExportPdf}
            disabled={isExporting}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition disabled:opacity-50"
          >
            <Download className="w-5 h-5" />
            {isExporting ? "Exportando..." : "Salvar em PDF"}
          </button>
          {erroExport && (
            <p role="alert" className="text-apoio text-red-700">
              {erroExport}
            </p>
          )}
        </div>

        <div ref={muralRef}>
          {event.postits.length === 0 ? (
            <EstadoVazio
              Icone={PartyPopper}
              titulo="Ainda não há recados"
              descricao="Volte daqui a pouco."
            />
          ) : (
            <MuralCanvas postits={event.postits} readOnly tema={tema} />
          )}
        </div>
      </div>
    </div>
  )
}
