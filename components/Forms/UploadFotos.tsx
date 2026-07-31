"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ImagePlus, Loader2, X } from "lucide-react"
import { comprimirImagem } from "@/lib/comprimir-imagem"
import { MAX_FOTOS, TIPOS_ACEITOS, type FotoAssinada } from "@/lib/fotos"

interface Props {
  /** Já no Blob. Vazio enquanto o evento não existe. */
  salvas: FotoAssinada[]
  /** Escolhidas e ainda não enviadas — sobem quando o evento for salvo. */
  pendentes: File[]
  onPendentesChange: (arquivos: File[]) => void
  /** Recebe o pathname, que é a identidade da foto — a URL expira. */
  onRemoverSalva: (pathname: string) => void
}

export default function UploadFotos({
  salvas,
  pendentes,
  onPendentesChange,
  onRemoverSalva,
}: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [processando, setProcessando] = useState(false)
  const [erro, setErro] = useState("")

  const previews = useMemo(() => pendentes.map((f) => URL.createObjectURL(f)), [pendentes])

  // Revoga ao trocar a lista e ao desmontar: sem isto cada nova seleção deixaria
  // os bitmaps anteriores presos na memória da aba.
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews])

  const total = salvas.length + pendentes.length

  const escolher = async (lista: FileList | null) => {
    if (!lista?.length) return
    setErro("")

    const espaco = MAX_FOTOS - total
    if (espaco <= 0) {
      setErro(`São no máximo ${MAX_FOTOS} fotos.`)
      return
    }

    const escolhidos = Array.from(lista).slice(0, espaco)
    if (escolhidos.length < lista.length) {
      setErro(`Só cabiam mais ${espaco}; o resto foi ignorado.`)
    }

    setProcessando(true)
    try {
      const comprimidos = await Promise.all(
        escolhidos
          .filter((f) => f.type.startsWith("image/"))
          .map((f) => comprimirImagem(f))
      )
      onPendentesChange([...pendentes, ...comprimidos])
    } catch {
      setErro("Não consegui ler alguma das imagens.")
    } finally {
      setProcessando(false)
      // Zerar o input permite reescolher o mesmo arquivo logo depois de removê-lo.
      if (input.current) input.current.value = ""
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Fotos do carrossel
      </label>

      <div className="flex flex-wrap gap-2">
        {salvas.map((foto) => (
          <Miniatura
            key={foto.pathname}
            src={foto.url}
            onRemover={() => onRemoverSalva(foto.pathname)}
          />
        ))}

        {previews.map((src, i) => (
          <Miniatura
            key={src}
            src={src}
            pendente
            onRemover={() => onPendentesChange(pendentes.filter((_, j) => j !== i))}
          />
        ))}

        {total < MAX_FOTOS && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={processando}
            className="w-20 h-24 flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition disabled:opacity-50"
          >
            {processando ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <ImagePlus className="w-5 h-5" />
                <span className="text-xs">Adicionar</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={input}
        type="file"
        accept={TIPOS_ACEITOS.join(",")}
        multiple
        hidden
        onChange={(e) => escolher(e.target.files)}
      />

      <p className="text-xs text-gray-600 mt-2">
        Até {MAX_FOTOS} fotos, reduzidas automaticamente antes de subir. Aparecem
        só no link da surpresa — fazem parte dela.
      </p>
      {erro && <p className="text-xs text-red-600 mt-1">{erro}</p>}
    </div>
  )
}

function Miniatura({
  src,
  pendente,
  onRemover,
}: {
  src: string
  pendente?: boolean
  onRemover: () => void
}) {
  return (
    <div className="relative w-20 h-24 rounded-lg overflow-hidden group ring-1 ring-black/10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="w-full h-full object-cover" />
      {pendente && (
        <span className="absolute bottom-0 inset-x-0 bg-black/55 text-white text-[10px] text-center py-0.5">
          a enviar
        </span>
      )}
      <button
        type="button"
        onClick={onRemover}
        aria-label="Remover foto"
        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}
