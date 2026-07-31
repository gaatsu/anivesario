"use client"

import { useState } from "react"
import { Check, Share2 } from "lucide-react"

interface Props {
  url: string
  /** Frase que acompanha o link. Cada link tem um público próprio — ver abaixo. */
  texto: string
  rotulo: string
  className?: string
}

type Estado = "parado" | "copiado" | "abrindo"

/**
 * Compartilhamento em dois degraus, nenhum deles passando pelo navegador:
 *
 * 1. `navigator.share` — folha nativa do sistema, com o WhatsApp entre as
 *    opções. É o caminho no celular.
 * 2. `whatsapp://send` — o protocolo do app instalado. No Windows abre o
 *    WhatsApp Desktop diretamente.
 *
 * **`wa.me` foi removido de propósito.** Era o fallback anterior e é uma
 * armadilha: no desktop ele sempre cai no `web.whatsapp.com`, que num proxy
 * corporativo é uma página bloqueada. Trocava "não consigo compartilhar" por
 * "compartilhei e deu erro", que é pior.
 *
 * O link vai para a área de transferência **junto** com a tentativa de abrir o
 * app. Não existe forma confiável de detectar se um protocolo customizado foi
 * atendido, então em vez de adivinhar, o caminho manual fica pronto: se o
 * WhatsApp não abrir, o link já está copiado e é só colar.
 */
export default function BotaoCompartilhar({ url, texto, rotulo, className = "" }: Props) {
  const [estado, setEstado] = useState<Estado>("parado")

  const sinalizar = (novo: Estado) => {
    setEstado(novo)
    setTimeout(() => setEstado("parado"), 2500)
  }

  const compartilhar = async () => {
    // Detectado no clique, não no render: o servidor não tem `navigator`, e
    // decidir o layout por ele faria o HTML divergir na hidratação.
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Mensagens Corp.", text: texto, url })
        return
      } catch (err) {
        // Fechar a folha dispara AbortError. Seguir para o fallback aqui abriria
        // o WhatsApp logo depois de a pessoa ter desistido.
        if (err instanceof Error && err.name === "AbortError") return
      }
    }

    try {
      await navigator.clipboard.writeText(`${texto}\n${url}`)
      sinalizar("abrindo")
    } catch {
      sinalizar("abrindo")
    }

    // Protocolo nativo. Se não houver aplicativo registrado, o navegador
    // simplesmente não faz nada — a página continua aqui e o link está copiado.
    window.location.href = `whatsapp://send?text=${encodeURIComponent(`${texto}\n${url}`)}`
  }

  const copiar = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await navigator.clipboard.writeText(url)
    sinalizar("copiado")
  }

  return (
    <div className="flex gap-1">
      <button
        type="button"
        onClick={compartilhar}
        className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${className}`}
      >
        {estado === "abrindo" ? (
          <>
            <Check className="h-4 w-4" /> Copiado, abrindo o WhatsApp
          </>
        ) : (
          <>
            <Share2 className="h-4 w-4" />
            {rotulo}
          </>
        )}
      </button>

      {/* Escape explícito para quando o app não estiver instalado. Copiar é a
          única ação que funciona em qualquer máquina, então merece um botão
          próprio em vez de ficar escondida atrás de um clique com o direito. */}
      <button
        type="button"
        onClick={copiar}
        title="Copiar só o link"
        aria-label="Copiar só o link"
        className={`rounded-lg px-2.5 py-2 text-sm transition ${className}`}
      >
        {estado === "copiado" ? <Check className="h-4 w-4" /> : "Copiar"}
      </button>
    </div>
  )
}
