"use client"

import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { useMovimentoReduzido } from "@/lib/movimento"

interface Props {
  fotos: string[]
  /** Índice aberto, ou null com a visualização fechada. */
  aberta: number | null
  aoFechar: () => void
  aoTrocar: (indice: number) => void
}

/**
 * A foto em tamanho grande, por cima de tudo.
 *
 * O leque é bonito mas mostra as fotos pequenas e tortas; no celular, onde não
 * existe hover, ele era só um mosaico sem saída. Aqui a foto aparece inteira e
 * em pé.
 */
export default function FotoAmpliada({ fotos, aberta, aoFechar, aoTrocar }: Props) {
  const reduzido = useMovimentoReduzido()
  const botaoFechar = useRef<HTMLButtonElement>(null)
  const abertaAgora = aberta !== null

  // Teclado antes do mouse: sem Esc, a única saída seria acertar o X.
  useEffect(() => {
    if (!abertaAgora) return

    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar()
      if (e.key === "ArrowRight") aoTrocar((aberta + 1) % fotos.length)
      if (e.key === "ArrowLeft") aoTrocar((aberta - 1 + fotos.length) % fotos.length)
    }
    window.addEventListener("keydown", aoTeclar)
    return () => window.removeEventListener("keydown", aoTeclar)
  }, [abertaAgora, aberta, fotos.length, aoFechar, aoTrocar])

  // Trava a rolagem do fundo: sem isto, rolar a foto no celular arrasta o mural
  // atrás dela e a pessoa fecha a visualização num lugar diferente de onde
  // abriu.
  useEffect(() => {
    if (!abertaAgora) return
    const antes = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = antes
    }
  }, [abertaAgora])

  useEffect(() => {
    if (abertaAgora) botaoFechar.current?.focus()
  }, [abertaAgora])

  // Renderizado direto no <body>, e não onde o componente está na árvore.
  //
  // O carrossel tem `perspective: 900`, e perspective — como transform — cria
  // bloco de contenção para descendentes `position: fixed`. Sem o portal, o
  // `inset-0` mede o carrossel em vez da tela: o fundo escuro cobria só a
  // faixa das fotos e a imagem ampliada abria dentro dela.
  if (typeof document === "undefined") return null

  return createPortal(
    <AnimatePresence>
      {abertaAgora && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`Foto ${aberta + 1} de ${fotos.length}`}
          className="fixed inset-0 z-[60] flex h-[100dvh] items-center justify-center bg-black/85 p-4"
          initial={reduzido ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduzido ? { opacity: 0 } : { opacity: 0 }}
          transition={{ duration: reduzido ? 0 : 0.2 }}
          onClick={aoFechar}
        >
          <button
            ref={botaoFechar}
            type="button"
            onClick={aoFechar}
            aria-label="Fechar a foto"
            className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/30"
            style={{ top: "calc(1rem + env(safe-area-inset-top))" }}
          >
            <X className="h-6 w-6" />
          </button>

          {fotos.length > 1 && (
            <>
              <Seta
                lado="esquerda"
                aoAcionar={() => aoTrocar((aberta - 1 + fotos.length) % fotos.length)}
              />
              <Seta lado="direita" aoAcionar={() => aoTrocar((aberta + 1) % fotos.length)} />
            </>
          )}

          {/* motion.img e não next/image: as URLs vêm do Blob em runtime, e o
              componente do Next exigiria remotePatterns para um domínio que
              muda por store. */}
          <motion.img
            key={fotos[aberta]}
            src={fotos[aberta]}
            alt={`Foto ${aberta + 1} de ${fotos.length}`}
            // O clique na foto não fecha; só o fundo e o X. Fechar ao tocar na
            // própria imagem faz a visualização sumir enquanto a pessoa só
            // queria olhar de perto.
            onClick={(e) => e.stopPropagation()}
            initial={reduzido ? false : { opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: reduzido ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="max-h-[85dvh] max-w-full rounded-lg object-contain shadow-2xl"
          />

          {fotos.length > 1 && (
            <p className="absolute bottom-6 text-apoio text-white/70">
              {aberta + 1} de {fotos.length}
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

function Seta({ lado, aoAcionar }: { lado: "esquerda" | "direita"; aoAcionar: () => void }) {
  const Icone = lado === "esquerda" ? ChevronLeft : ChevronRight

  return (
    <button
      type="button"
      aria-label={lado === "esquerda" ? "Foto anterior" : "Próxima foto"}
      onClick={(e) => {
        e.stopPropagation()
        aoAcionar()
      }}
      // 44px de alvo: é o mínimo confortável para o dedo, e estas ficam nas
      // bordas da tela onde a mira é pior.
      className={`absolute grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/30 ${
        lado === "esquerda" ? "left-3" : "right-3"
      }`}
    >
      <Icone className="h-7 w-7" />
    </button>
  )
}
