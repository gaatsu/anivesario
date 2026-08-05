"use client"

import { useEffect, useState } from "react"
import MuralCanvas from "@/components/Mural/MuralCanvas"
import PostitForm from "@/components/Forms/PostitForm"
import Carrossel from "@/components/Carrossel/Carrossel"
import BotaoCompartilhar from "@/components/ui/BotaoCompartilhar"
import { PALETA_ANIMACAO, resolverTema } from "@/lib/themes"
import { posicaoNaGrade } from "@/lib/arranjo"

/**
 * Bancada de responsividade.
 *
 * Renderiza os componentes reais com dados falsos, para poder olhá-los num
 * viewport de celular sem depender do banco — que não compila localmente.
 * 404 em produção, como toda rota sob /preview.
 */

const NOMES = ["Ana", "Bruno", "Carla", "Diego", "Alan", "Maria Fernanda"]
const RECADOS = [
  "Parabéns pelo seu dia! Que venha um ano incrível 🎉",
  "Vamos sentir sua falta por aqui. Boa sorte na nova jornada!",
  "Parabéns pela conquista, você merece cada elogio!",
  "Boas férias! Aproveita cada minuto de descanso.",
  "Bem-vinda ao time! Qualquer coisa é só chamar.",
  "Obrigado por tudo esses anos. Foi um prazer trabalhar contigo!",
]

function recado(i: number, posicao: { x: number; y: number }) {
  return {
    id: String(i),
    name: NOMES[i % NOMES.length],
    message: RECADOS[i % RECADOS.length],
    color: "",
    icon: null,
    template: "",
    positionX: posicao.x,
    positionY: posicao.y,
  }
}

const POSTITS = Array.from({ length: 12 }, (_, i) => recado(i, posicaoNaGrade(i, 1100)))

/**
 * Um mural como os criados antes da grade: posições sorteadas dentro de 600x300,
 * onde não cabem três recados sem colisão.
 *
 * Serve para olhar o que o homenageado vê no link da revelação, que é o único
 * lugar sem botão de arrumar nem arraste. Semente fixa em vez de Math.random
 * para a bancada dar sempre a mesma tela.
 */
const POSTITS_LEGADO = (() => {
  let semente = 7
  const sorteio = () => {
    semente = (semente * 1103515245 + 12345) % 2147483648
    return semente / 2147483648
  }
  return Array.from({ length: 10 }, (_, i) =>
    recado(i, { x: Math.round(sorteio() * 600), y: Math.round(sorteio() * 300) })
  )
})()

const FOTOS = Array.from(
  { length: 6 },
  (_, i) => `https://picsum.photos/seed/mensagens${i}/400/600`
)

export default function PreviewMobile() {
  const [form, setForm] = useState(
    typeof window !== "undefined" && new URLSearchParams(location.search).has("form")
  )
  const [pronto, setPronto] = useState(false)

  // Finge a posse dos dois primeiros recados para os botões do autor
  // aparecerem na bancada.
  useEffect(() => {
    localStorage.setItem(
      "mensagens_corp_recados",
      JSON.stringify({ "0": "token-falso", "1": "token-falso" })
    )
    setPronto(true)
  }, [])
  const tema = resolverTema("birthday")

  return (
    <main className="fundo-papel min-h-screen space-y-10 p-4">
      <section>
        <h2 className="text-seccao font-bold text-tinta">Mural {pronto ? "" : "…"}</h2>
        <MuralCanvas
          key={String(pronto)}
          postits={POSTITS}
          shareLink="preview"
          onEditar={() => {}}
          onExcluir={() => {}}
          tema={tema}
        />
      </section>

      <section>
        <h2 className="text-seccao font-bold text-tinta">
          Mural antigo, somente-leitura (posições sorteadas em 600x300)
        </h2>
        <MuralCanvas postits={POSTITS_LEGADO} readOnly tema={tema} />
      </section>

      <section>
        <h2 className="text-seccao font-bold text-tinta">Carrossel</h2>
        <Carrossel fotos={FOTOS} />
      </section>

      <section className="space-y-2">
        <h2 className="text-seccao font-bold text-tinta">Compartilhar</h2>
        <div className="rounded-lg border border-pink-200 bg-pink-50 p-3">
          <BotaoCompartilhar
            url="https://exemplo.com/revelacao/abc"
            texto="Maria, tem uma surpresa esperando por você:"
            rotulo="Enviar a surpresa"
            className="bg-pink-600 text-white"
          />
        </div>
      </section>

      <section>
        <h2 className="text-seccao font-bold text-tinta">Formulário</h2>
        <button
          type="button"
          onClick={() => setForm(true)}
          className="rounded-lg bg-pink-600 px-4 py-2 text-white"
        >
          Abrir formulário
        </button>
        {form && (
          <PostitForm
            shareLink="preview"
            onSuccess={() => setForm(false)}
            onCancel={() => setForm(false)}
            tema={tema}
          />
        )}
      </section>

      <p className="text-apoio text-gray-600">
        Paleta do tema: {PALETA_ANIMACAO[tema.id].join(" ")}
      </p>
    </main>
  )
}
