import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { getCurrentUser } from "@/lib/current-user"
import { db } from "@/lib/db"
import { apagarFotos, MAX_FOTOS, TAMANHO_MAXIMO_BYTES, TIPOS_ACEITOS } from "@/lib/fotos"

async function eventoDoUsuario(id: string) {
  const user = await getCurrentUser()
  if (!user) return { erro: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) }

  const event = await db.event.findFirst({
    where: { id, creatorId: user.id, deletedAt: null },
    select: { id: true, photos: true },
  })

  if (!event) return { erro: NextResponse.json({ message: "Event not found" }, { status: 404 }) }
  return { event }
}

/**
 * Upload de fotos do carrossel. Recebe multipart e sobe para o Vercel Blob.
 *
 * O arquivo chega já reduzido pelo navegador (ver components/Forms/UploadFotos):
 * o corpo de requisição na Vercel é cortado em 4,5 MB, então mandar o original
 * de uma câmera de celular falharia. As validações abaixo repetem as do
 * navegador de propósito — aquelas são conveniência, estas são a regra.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { event, erro } = await eventoDoUsuario(id)
    if (erro) return erro

    const form = await request.formData()
    const arquivos = form.getAll("fotos").filter((f): f is File => f instanceof File)

    if (!arquivos.length) {
      return NextResponse.json({ message: "Nenhuma foto enviada" }, { status: 400 })
    }

    if (event.photos.length + arquivos.length > MAX_FOTOS) {
      return NextResponse.json(
        { message: `São no máximo ${MAX_FOTOS} fotos por evento` },
        { status: 400 }
      )
    }

    for (const arquivo of arquivos) {
      if (!TIPOS_ACEITOS.includes(arquivo.type)) {
        return NextResponse.json(
          { message: `Formato não aceito: ${arquivo.type || "desconhecido"}` },
          { status: 400 }
        )
      }
      if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
        return NextResponse.json({ message: "Foto grande demais" }, { status: 400 })
      }
    }

    const enviados = await Promise.all(
      arquivos.map((arquivo) =>
        put(`eventos/${id}/${arquivo.name || "foto"}`, arquivo, {
          // Store privado: a URL do blob não abre sozinha. O que fica salvo é o
          // pathname, e a URL de leitura é assinada na hora de servir.
          access: "private",
          // Sem sufixo, subir duas fotos com o mesmo nome sobrescreveria a
          // primeira — e "IMG_0001.jpg" repete o tempo todo.
          addRandomSuffix: true,
          contentType: arquivo.type,
        })
      )
    )

    const atualizado = await db.event.update({
      where: { id },
      data: { photos: [...event.photos, ...enviados.map((b) => b.pathname)] },
      select: { photos: true },
    })

    return NextResponse.json(atualizado, { status: 201 })
  } catch (error) {
    console.error("Error uploading photos:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

/** Remove uma foto do evento e o binário correspondente. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { event, erro } = await eventoDoUsuario(id)
    if (erro) return erro

    const { pathname } = await request.json()

    // Só apaga o que pertence a este evento: sem esta checagem a rota viraria um
    // "apague qualquer blob da conta" para quem tem login.
    if (typeof pathname !== "string" || !event.photos.includes(pathname)) {
      return NextResponse.json({ message: "Foto não encontrada" }, { status: 404 })
    }

    const atualizado = await db.event.update({
      where: { id },
      data: { photos: event.photos.filter((p: string) => p !== pathname) },
      select: { photos: true },
    })
    await apagarFotos([pathname])

    return NextResponse.json(atualizado)
  } catch (error) {
    console.error("Error deleting photo:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
