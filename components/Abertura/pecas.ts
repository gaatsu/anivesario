import type { ComponentType } from "react"
import type { Tema, TipoEvento } from "@/lib/themes"
import Bolo from "./Bolo"
import Ferias from "./Ferias"
import Medalhao from "./Medalhao"

/** Contrato de toda peça central de abertura. */
export interface PropsPeca {
  tema: Tema
  /** Paleta do tema, para detalhes coloridos. */
  cores: string[]
  className?: string
}

/**
 * Peça central por tema — **o único lugar a editar** ao criar uma nova.
 *
 * A abertura e a bancada de preview leem daqui, então registrar aqui já faz a
 * peça aparecer nas duas. Tema sem entrada cai no medalhão.
 */
export const PECAS: Partial<Record<TipoEvento, ComponentType<PropsPeca>>> = {
  birthday: Bolo,
  vacation: Ferias,
}

export function pecaDoTema(tipo: TipoEvento): ComponentType<PropsPeca> {
  return PECAS[tipo] ?? Medalhao
}
