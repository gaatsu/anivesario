"use client"

import { useState } from "react"
import MuralCanvas from "@/components/Mural/MuralCanvas"
import PostitForm from "@/components/Forms/PostitForm"
import Carrossel from "@/components/Carrossel/Carrossel"
import BotaoCompartilhar from "@/components/ui/BotaoCompartilhar"
import { PALETA_ANIMACAO, resolverTema } from "@/lib/themes"

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

// As mesmas coordenadas que a API sorteia hoje: Math.random() * 600 por 300.
const POSTITS = NOMES.map((name, i) => ({
  id: String(i),
  name,
  message: RECADOS[i],
  color: "",
  icon: null,
  template: "",
  positionX: (i * 97) % 600,
  positionY: (i * 71) % 300,
}))

const FOTOS = Array.from(
  { length: 6 },
  (_, i) => `https://picsum.photos/seed/mensagens${i}/400/600`
)

export default function PreviewMobile() {
  const [form, setForm] = useState(false)
  const tema = resolverTema("birthday")

  return (
    <main className="fundo-papel min-h-screen space-y-10 p-4">
      <section>
        <h2 className="text-seccao font-bold text-tinta">Mural</h2>
        <MuralCanvas postits={POSTITS} readOnly tema={tema} />
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
