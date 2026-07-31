import { notFound } from "next/navigation"
import { pecaDoTema } from "@/components/Abertura/pecas"
import { PALETA_ANIMACAO, TEMAS } from "@/lib/themes"

/**
 * Bancada visual das peças de abertura.
 *
 * Existe porque nada neste app pode ser visto rodando: `prisma generate` é
 * bloqueado pelo proxy, então qualquer tela que toque o banco não compila
 * localmente. Esta rota não importa `lib/db`, e por isso o `next dev` consegue
 * servi-la — o que permite abrir, tirar screenshot e de fato conferir se o
 * desenho ficou de pé antes de subir.
 *
 * Fora do ar em produção: é ferramenta de trabalho, não página do produto.
 */
export default function PreviewAbertura() {
  if (process.env.NODE_ENV === "production") notFound()

  return (
    <main className="fundo-papel min-h-screen p-10">
      <h1 className="text-titulo font-bold text-tinta mb-8">Peças de abertura</h1>

      <div className="flex flex-wrap gap-10">
        {Object.values(TEMAS).map((tema) => (
          <section key={tema.id} className="flex w-64 flex-col items-center gap-3">
            <div className="flex h-72 items-center justify-center">
              {(() => {
                const Peca = pecaDoTema(tema.id)
                return <Peca tema={tema} cores={PALETA_ANIMACAO[tema.id]} className="w-52" />
              })()}
            </div>
            <p className="text-seccao font-medium" style={{ color: tema.acento }}>
              {tema.saudacao}, Maria!
            </p>
            <p className="text-apoio text-gray-600">{tema.label}</p>
          </section>
        ))}
      </div>
    </main>
  )
}
