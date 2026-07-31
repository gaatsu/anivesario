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

/**
 * Compartilhamento em três degraus, do melhor para o pior:
 *
 * 1. `navigator.share` — abre a folha nativa do sistema, onde o WhatsApp aparece
 *    junto com todo o resto. É o único caminho que **não** passa pelo WhatsApp
 *    Web no desktop, que era exatamente a reclamação.
 * 2. `wa.me` — abre o app no celular, o WhatsApp Web no desktop.
 * 3. Área de transferência — quando o navegador bloqueia a janela nova.
 *
 * O degrau 1 não existe no Firefox desktop, daí a cadeia.
 */
export default function BotaoCompartilhar({ url, texto, rotulo, className = "" }: Props) {
  const [copiado, setCopiado] = useState(false)

  const compartilhar = async () => {
    // Detectado no clique, não no render: o servidor não tem `navigator`, e
    // qualquer decisão de layout tomada por ele faria o HTML do servidor
    // divergir do cliente na hidratação. O botão é o mesmo nos três degraus.
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Mensagens Corp.", text: texto, url })
        return
      } catch (err) {
        // Fechar a folha de compartilhamento dispara AbortError. Cair no
        // fallback aqui abriria o WhatsApp Web logo depois de a pessoa ter
        // desistido — o comportamento mais irritante possível.
        if (err instanceof Error && err.name === "AbortError") return
      }
    }

    const wa = `https://wa.me/?text=${encodeURIComponent(`${texto}\n${url}`)}`
    if (!window.open(wa, "_blank", "noopener,noreferrer")) {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    }
  }

  return (
    <button
      type="button"
      onClick={compartilhar}
      className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition text-sm font-medium ${className}`}
    >
      {copiado ? (
        <>
          <Check className="w-4 h-4" /> Link copiado
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4" />
          {rotulo}
        </>
      )}
    </button>
  )
}
