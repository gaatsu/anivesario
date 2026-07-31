export type TipoEvento = "birthday" | "farewell" | "welcome" | "achievement"

export interface Tema {
  id: TipoEvento
  label: string
  descricao: string
  /** Grau OKLCH de partida da paleta de postits. */
  matizBase: number
  /** Largura da faixa de matiz, em graus, em torno da base. */
  amplitudeMatiz: number
  /** Cor sólida para títulos e destaques da página do mural. */
  acento: string
  animacoesPadrao: string[]
  icones: string[]
}

export const TEMAS: Record<TipoEvento, Tema> = {
  birthday: {
    id: "birthday",
    label: "Aniversário",
    descricao: "Comemoração de aniversário",
    matizBase: 340,
    amplitudeMatiz: 90,
    acento: "#db2777",
    animacoesPadrao: ["confetti", "balloons"],
    icones: ["Cake", "Gift", "PartyPopper", "Heart", "Sparkles", "Star"],
  },
  farewell: {
    id: "farewell",
    label: "Despedida",
    descricao: "Alguém deixando o time",
    matizBase: 250,
    amplitudeMatiz: 70,
    acento: "#4f46e5",
    animacoesPadrao: ["petals"],
    icones: ["Heart", "Star", "Sun", "Music", "Sparkles", "Moon"],
  },
  welcome: {
    id: "welcome",
    label: "Boas-vindas",
    descricao: "Chegada ao time ou volta de férias",
    matizBase: 150,
    amplitudeMatiz: 80,
    acento: "#059669",
    animacoesPadrao: ["confetti_up", "stars"],
    icones: ["Sparkles", "Sun", "Star", "Laugh", "Heart", "Zap"],
  },
  achievement: {
    id: "achievement",
    label: "Conquista",
    descricao: "Promoção, formatura, casamento, nascimento",
    matizBase: 70,
    amplitudeMatiz: 60,
    acento: "#b45309",
    animacoesPadrao: ["fireworks", "stars"],
    icones: ["Star", "Sparkles", "Zap", "Flame", "Gift", "Heart"],
  },
}

export const TEMA_PADRAO: TipoEvento = "birthday"

export function resolverTema(type: string): Tema {
  return TEMAS[type as TipoEvento] ?? TEMAS[TEMA_PADRAO]
}

/**
 * Opções oferecidas no formulário. `confetti_paper` não está aqui de propósito:
 * é apenas um alias histórico, absorvido por `petals`.
 */
export const ANIMACOES = [
  { id: "confetti", label: "Confetti", descricao: "Rajadas laterais de papel colorido" },
  { id: "confetti_up", label: "Confetti ascendente", descricao: "Disparo de baixo para cima" },
  { id: "balloons", label: "Balões", descricao: "Balões subindo em arco" },
  { id: "fireworks", label: "Fogos", descricao: "Estouros alternados nas laterais" },
  { id: "petals", label: "Pétalas", descricao: "Queda lenta com deriva lateral" },
  { id: "stars", label: "Estrelas", descricao: "Estrelas douradas cintilando" },
] as const

const ALIASES: Record<string, string> = {
  // O "papel picado" original era quase idêntico ao confetti; `petals` é o que
  // ele deveria ter sido. Mantido como alias para não invalidar eventos já
  // gravados no banco.
  confetti_paper: "petals",
}

const IDS_VALIDOS = new Set(ANIMACOES.map((a) => a.id as string))

export function resolverAnimacoes(ids: string[]): string[] {
  const resolvidos = ids.map((id) => ALIASES[id] ?? id).filter((id) => IDS_VALIDOS.has(id))
  return [...new Set(resolvidos)]
}

/**
 * Paleta usada pelas animações. Separada de `acento` porque o canvas-confetti
 * só aceita hex — não entende as cores oklch dos postits.
 */
export const PALETA_ANIMACAO: Record<TipoEvento, string[]> = {
  birthday: ["#f472b6", "#a78bfa", "#60a5fa", "#fbbf24"],
  farewell: ["#818cf8", "#38bdf8", "#2dd4bf", "#c7d2fe"],
  welcome: ["#34d399", "#22d3ee", "#fde047", "#86efac"],
  achievement: ["#fbbf24", "#f59e0b", "#a78bfa", "#fcd34d"],
}
