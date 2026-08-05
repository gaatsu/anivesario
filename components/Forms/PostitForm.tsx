"use client"

import { useState } from "react"
import * as Icons from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { X } from "lucide-react"
import { POSTIT_COLORS } from "@/lib/utils"
import type { Tema } from "@/lib/themes"
import {
  ESTILOS,
  corDaFita,
  corDoPercevejo,
  corDoPostit,
  corDoTextoPostit,
  resolverEstilo,
} from "@/lib/postit-visual"
import { guardarRecado, tokenDoRecado } from "@/lib/meus-recados"

/** Recado existente, quando o formulário está em modo de edição. */
export interface RecadoEditavel {
  id: string
  name: string
  message: string
  color: string
  icon?: string | null
  template?: string
}

interface PostitFormProps {
  shareLink: string
  onSuccess: () => void
  onCancel: () => void
  tema: Tema
  /** Ausente = criar. Presente = editar aquele recado. */
  recado?: RecadoEditavel
}

export default function PostitForm({
  shareLink,
  onSuccess,
  onCancel,
  tema,
  recado,
}: PostitFormProps) {
  const editando = !!recado

  const [name, setName] = useState(recado?.name ?? "")
  const [message, setMessage] = useState(recado?.message ?? "")
  // Vazio = automático: o postit ganha a cor do tema derivada do nome. Começar
  // numa cor fixa faria todo recado parecer escolhido à mão e a paleta
  // procedural nunca apareceria.
  const [color, setColor] = useState(recado?.color ?? "")
  const [icon, setIcon] = useState<string | null>(recado?.icon ?? null)
  // Vazio = automático, mesma convenção da cor.
  const [template, setTemplate] = useState(recado?.template ?? "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      const res = editando
        ? await fetch(`/api/mural/${shareLink}/postits/${recado.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            // O token prova a autoria; sem ele o servidor recusa a edição.
            body: JSON.stringify({
              name,
              message,
              color,
              icon,
              template,
              token: tokenDoRecado(recado.id),
            }),
          })
        : await fetch(`/api/mural/${shareLink}/postits`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              message,
              color,
              icon,
              template,
              positionX: Math.random() * 600,
              positionY: Math.random() * 300,
            }),
          })

      if (res.ok) {
        // O token só vem na criação, e só uma vez. Guardá-lo aqui é o que
        // permite editar e apagar depois.
        if (!editando) {
          const criado = await res.json()
          if (criado?.id && criado?.token) guardarRecado(criado.id, criado.token)
        }
        onSuccess()
      } else {
        const data = await res.json()
        setError(data.message || "Erro ao enviar recado")
      }
    } catch (err) {
      setError("Erro ao enviar recado")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Colado embaixo no celular, centralizado a partir de sm: o formulário é alto
  // e, centralizado numa tela de 844px, o botão de enviar caía fora do alcance
  // sem rolagem interna.
  return (
    // `dvh` e não `vh`: no celular, `vh` mede a viewport com a barra do
    // navegador escondida, então 92vh é mais alto que a área realmente visível
    // e o topo do formulário — o título — fica atrás da barra de endereço.
    // `dvh` acompanha a barra aparecendo e sumindo.
    <div className="fixed inset-0 z-50 flex h-[100dvh] items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <div
        className="relative w-full max-w-md space-y-4 overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6"
        style={{
          maxHeight: "88dvh",
          // Respiro para a barra de gestos do iPhone, que fica por cima do
          // conteúdo colado na borda de baixo.
          paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))",
        }}
      >
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 p-2 text-gray-500 hover:text-gray-700"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-bold text-gray-900">
          {editando ? "Editar seu recado" : "Deixe seu recado"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seu nome
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              maxLength={100}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mensagem
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escreva seu recado..."
              maxLength={500}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent h-28"
              required
            />
            <p className="text-xs text-gray-600 text-right mt-1">{message.length}/500</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cor do postit
            </label>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setColor("")}
                className={`w-11 h-11 rounded-full border-2 transition ${
                  color === "" ? "border-gray-800 scale-110" : "border-gray-300"
                }`}
                style={{ backgroundColor: corDoPostit(name, tema) }}
                title="Automática (combina com o evento)"
              />
              {POSTIT_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  className={`w-11 h-11 rounded-full border-2 transition ${
                    color === c.hex ? "border-gray-800 scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              A primeira combina com o evento e muda conforme o seu nome.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estilo do papel
            </label>
            {/* Miniaturas em vez de nomes: "Fita, cursiva" só quer dizer alguma
                coisa depois de visto. Cada uma é o postit de verdade em
                escala reduzida, com a cor que este recado vai ter.

                Rola na horizontal no celular em vez de quebrar linha: cinco
                miniaturas em duas fileiras desalinhadas ocupam altura preciosa
                num formulário que já é alto. */}
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 sm:flex-wrap sm:overflow-visible sm:pb-0">
              <BotaoEstilo
                id=""
                rotulo="Automático"
                nome={name}
                tema={tema}
                selecionado={template === ""}
                onSelecionar={setTemplate}
              />
              {ESTILOS.map((e) => (
                <BotaoEstilo
                  key={e.id}
                  id={e.id}
                  rotulo={e.label}
                  nome={name}
                  tema={tema}
                  selecionado={template === e.id}
                  onSelecionar={setTemplate}
                />
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              O automático sorteia pelo seu nome — dois recados de pessoas
              diferentes nunca saem iguais.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ícone (opcional)
            </label>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIcon(null)}
                className={`px-4 py-3 rounded-lg border text-xs font-medium transition ${
                  icon === null ? "border-pink-500 bg-pink-50" : "border-gray-300"
                }`}
              >
                Nenhum
              </button>
              {/* Ícones sugeridos pelo tema do evento: bolo e presente num
                  aniversário, sol e coração numa despedida. */}
              {tema.icones.map((iconName) => {
                const Component = (Icons as unknown as Record<string, LucideIcon>)[iconName]
                if (!Component) return null
                return (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setIcon(iconName)}
                  className={`p-3 rounded-lg border transition ${
                    icon === iconName ? "border-pink-500 bg-pink-50" : "border-gray-300"
                  }`}
                  title={iconName}
                >
                  <Component className="w-5 h-5 text-gray-700" />
                </button>
                )
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold py-3 rounded-lg hover:shadow-lg transition disabled:opacity-50"
          >
            {isSubmitting ? "Salvando..." : editando ? "Salvar alterações" : "Colar no Mural"}
          </button>
        </form>
      </div>
    </div>
  )
}

/** Miniatura clicável de um estilo, desenhada com as mesmas regras do postit. */
function BotaoEstilo({
  id,
  rotulo,
  nome,
  tema,
  selecionado,
  onSelecionar,
}: {
  id: string
  rotulo: string
  nome: string
  tema: Tema
  selecionado: boolean
  onSelecionar: (id: string) => void
}) {
  const { formato, fonte } = resolverEstilo(id, nome)
  const cursiva = fonte === "caveat"

  return (
    <button
      type="button"
      onClick={() => onSelecionar(id)}
      title={rotulo}
      aria-label={rotulo}
      aria-pressed={selecionado}
      className={`relative w-16 shrink-0 rounded-lg border-2 p-1 pt-3 transition ${
        selecionado ? "border-pink-500 bg-pink-50" : "border-gray-200 hover:border-gray-400"
      }`}
    >
      {formato === "fita" ? (
        <span
          aria-hidden
          className="absolute left-1/2 top-1 h-2.5 w-7 -translate-x-1/2 -rotate-3 opacity-70"
          style={{ background: corDaFita(nome, tema) }}
        />
      ) : (
        <span
          aria-hidden
          className="absolute left-1/2 top-1.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full"
          style={{ background: corDoPercevejo(nome, tema) }}
        />
      )}

      <span
        className="flex h-12 items-end justify-center pb-1"
        style={{
          background: corDoPostit(nome, tema),
          color: corDoTextoPostit(nome, tema),
          // Mesmo recorte de canto do postit real, em escala menor.
          clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)",
          fontFamily: cursiva ? "var(--font-caveat), cursive" : "var(--font-kalam), cursive",
          fontSize: cursiva ? "1.05rem" : "0.7rem",
        }}
      >
        {id === "" ? "?" : "Aa"}
      </span>

      <span className="mt-1 block text-[10px] leading-tight text-gray-600">{rotulo}</span>
    </button>
  )
}
