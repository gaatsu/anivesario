# Temas, animações em duas fases e identidade "Mensagens Corp." — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar identidade visual por tipo de evento — paleta, ícones e animações próprias — com postits de aparência procedural e uma camada de animação que celebra na abertura e depois vira movimento de fundo.

**Architecture:** Um registry sem estado em `lib/themes.ts` é a fonte única de verdade; `lib/postit-visual.ts` deriva a aparência de cada recado do nome do autor em OKLCH; `AnimationLayer` orquestra duas fases sobre um canvas dedicado rodando em Web Worker. Nada disso toca o banco.

**Tech Stack:** Next.js 16, React 19, Tailwind v4, canvas-confetti, framer-motion, `node --test`.

**Spec:** `docs/superpowers/specs/2026-07-31-temas-animacoes-e-identidade-design.md`

## Global Constraints

- **Ids são estáveis e em inglês.** Já existe dado gravado: um evento com `type: "birthday"` e `animations: {confetti, balloons, confetti_paper}`. Renomear ids orfanaria essa linha. Rótulos em português vivem no registry, nunca nas chaves.
- **`confetti_paper` é alias de `petals`** na resolução, e não aparece como opção no formulário.
- **Nenhuma migration.** `Event.type` já é `String` e `Event.animations` já é `String[]`.
- **Animações só na página de revelação** (`/revelacao/[token]`). O link de coleta permanece sem animação alguma.
- **`prefers-reduced-motion` desliga as duas fases**, sempre.
- **Nenhuma dependência nova.** Instalar pacote nesta máquina já falhou duas vezes (binário do esbuild bloqueado pelo EDR). `canvas-confetti` e `framer-motion` já estão instalados.
- **Next.js 16 tem breaking changes** — leia o guia em `node_modules/next/dist/docs/` antes de escrever código de framework.
- **`prisma generate` não roda nesta máquina** (proxy bloqueia `.exe.gz`), então `next build` e `npm run dev` não rodam local. Verificação local é `node --test`, `npx tsc --noEmit` (ignorando o erro do client ausente) e `npx eslint .`.
- Commits com corpo explicando o *porquê*, terminando em `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `lib/themes.ts` | **Criar.** Registry dos 4 tipos + resolução de tipo/animações. Sem I/O, sem React. |
| `lib/themes.test.ts` | **Criar.** Fallback de tipo desconhecido, alias `confetti_paper`. |
| `lib/postit-visual.ts` | **Criar.** Hash do nome → cor OKLCH, inclinação, textura. Puro. |
| `lib/postit-visual.test.ts` | **Criar.** Determinismo, faixa de matiz, intervalo de inclinação. |
| `components/Animations/AnimationLayer.tsx` | **Reescrever.** Canvas em worker, fases, visibilidade, reduced-motion. |
| `components/Animations/tipos.ts` | **Criar.** Contrato `PropsAnimacao`. |
| `components/Animations/*Animation.tsx` | **Reescrever/criar.** 6 animações sob o contrato. |
| `components/Mural/PostitCard.tsx` | **Modificar.** Aplica cor/inclinação/textura procedurais. |
| `components/ui/Botao.tsx` | **Criar.** Variantes primário/secundário/perigo. |
| `components/ui/EstadoVazio.tsx` | **Criar.** Estado vazio padronizado. |
| `app/globals.css` | **Modificar.** Escala tipográfica no `@theme`. |
| `app/admin/dashboard/page.tsx` | **Modificar.** Select de 4 tipos, animações do tema. |
| `app/layout.tsx`, `app/page.tsx`, `app/admin/layout.tsx` | **Modificar.** Rename + moldura sóbria. |

---

### Task 1: Registry de temas

**Files:**
- Create: `lib/themes.ts`, `lib/themes.test.ts`

**Interfaces:**
- Produces:
  - `type TipoEvento = "birthday" | "farewell" | "welcome" | "achievement"`
  - `interface Tema { id, label, descricao, matizBase, amplitudeMatiz, acento, animacoesPadrao, icones }`
  - `TEMAS: Record<TipoEvento, Tema>`
  - `resolverTema(type: string): Tema`
  - `resolverAnimacoes(ids: string[]): string[]`
  - `ANIMACOES: { id: string; label: string; descricao: string }[]`

- [ ] **Step 1: Escrever o teste que falha**

Criar `lib/themes.test.ts`:

```ts
import { test } from "node:test"
import assert from "node:assert/strict"
import { TEMAS, resolverTema, resolverAnimacoes, ANIMACOES } from "./themes.ts"

test("os quatro tipos existem com id consistente", () => {
  for (const [chave, tema] of Object.entries(TEMAS)) {
    assert.equal(tema.id, chave)
    assert.ok(tema.label.length > 0)
    assert.ok(tema.animacoesPadrao.length > 0)
  }
  assert.equal(Object.keys(TEMAS).length, 4)
})

test("tipo desconhecido cai em birthday", () => {
  assert.equal(resolverTema("nao_existe").id, "birthday")
  assert.equal(resolverTema("").id, "birthday")
  assert.equal(resolverTema("farewell").id, "farewell")
})

test("confetti_paper é alias de petals", () => {
  assert.deepEqual(resolverAnimacoes(["confetti_paper"]), ["petals"])
})

test("resolução não duplica quando alias e alvo coexistem", () => {
  assert.deepEqual(resolverAnimacoes(["petals", "confetti_paper"]), ["petals"])
})

test("o evento já gravado continua válido", () => {
  assert.deepEqual(
    resolverAnimacoes(["confetti", "balloons", "confetti_paper"]),
    ["confetti", "balloons", "petals"]
  )
})

test("ids desconhecidos são descartados", () => {
  assert.deepEqual(resolverAnimacoes(["confetti", "lixo"]), ["confetti"])
})

test("confetti_paper não aparece como opção no formulário", () => {
  assert.ok(!ANIMACOES.some((a) => a.id === "confetti_paper"))
  assert.equal(ANIMACOES.length, 6)
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `node --test lib/themes.test.ts`
Expected: FAIL com `ERR_MODULE_NOT_FOUND` para `./themes.ts`.

- [ ] **Step 3: Implementar `lib/themes.ts`**

```ts
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

/** Opções oferecidas no formulário. `confetti_paper` não está aqui de propósito:
 *  é apenas um alias histórico, absorvido por `petals`. */
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
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `node --test lib/themes.test.ts`
Expected: `# pass 7`, `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add lib/themes.ts lib/themes.test.ts
git commit -m "Add event theme registry

One stateless object per event type drives palette, icons and default
animations, so adding a type later is adding an object rather than touching
every screen.

Ids stay in English because the database already holds an event with
type 'birthday' and animations confetti/balloons/confetti_paper. confetti_paper
resolves to the new petals animation instead of being renamed away.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Aparência procedural do postit

**Files:**
- Create: `lib/postit-visual.ts`, `lib/postit-visual.test.ts`

**Interfaces:**
- Consumes: `Tema` de `lib/themes.ts`.
- Produces:
  - `hashNome(nome: string): number`
  - `corDoPostit(nome: string, tema: Tema): string` — string `oklch(...)`
  - `inclinacaoDoPostit(nome: string): number` — −3 a 3
  - `texturaDoPostit(nome: string): "liso" | "listrado" | "pontilhado"`

- [ ] **Step 1: Escrever o teste que falha**

Criar `lib/postit-visual.test.ts`:

```ts
import { test } from "node:test"
import assert from "node:assert/strict"
import { TEMAS } from "./themes.ts"
import {
  hashNome,
  corDoPostit,
  inclinacaoDoPostit,
  texturaDoPostit,
} from "./postit-visual.ts"

const NOMES = ["Ana", "Bruno", "Carla", "Diego", "Alan", "Maria Fernanda", "José"]

test("hash é determinístico e não negativo", () => {
  for (const n of NOMES) {
    assert.equal(hashNome(n), hashNome(n))
    assert.ok(hashNome(n) >= 0)
  }
})

test("mesmo nome gera sempre a mesma cor", () => {
  assert.equal(corDoPostit("Ana", TEMAS.birthday), corDoPostit("Ana", TEMAS.birthday))
})

test("o mesmo nome muda de cor conforme o tema", () => {
  assert.notEqual(corDoPostit("Ana", TEMAS.birthday), corDoPostit("Ana", TEMAS.farewell))
})

test("a cor é oklch com luminosidade e croma fixos", () => {
  for (const n of NOMES) {
    const cor = corDoPostit(n, TEMAS.welcome)
    assert.match(cor, /^oklch\(0\.92 0\.09 \d+(\.\d+)?\)$/)
  }
})

test("o matiz fica dentro da faixa do tema", () => {
  const tema = TEMAS.farewell
  for (const n of NOMES) {
    const matiz = Number(corDoPostit(n, tema).match(/ (\d+(?:\.\d+)?)\)$/)![1])
    const distancia = Math.abs(((matiz - tema.matizBase + 540) % 360) - 180)
    assert.ok(
      distancia <= tema.amplitudeMatiz / 2 + 0.001,
      `${n}: matiz ${matiz} fora da faixa de ${tema.matizBase}±${tema.amplitudeMatiz / 2}`
    )
  }
})

test("nomes diferentes recebem cores distintas", () => {
  const cores = new Set(NOMES.map((n) => corDoPostit(n, TEMAS.birthday)))
  assert.ok(cores.size >= NOMES.length - 1, `só ${cores.size} cores para ${NOMES.length} nomes`)
})

test("inclinação é determinística e fica entre -3 e 3", () => {
  for (const n of NOMES) {
    const i = inclinacaoDoPostit(n)
    assert.equal(i, inclinacaoDoPostit(n))
    assert.ok(i >= -3 && i <= 3, `${n}: ${i}`)
  }
})

test("textura é determinística e uma das três", () => {
  for (const n of NOMES) {
    const t = texturaDoPostit(n)
    assert.equal(t, texturaDoPostit(n))
    assert.ok(["liso", "listrado", "pontilhado"].includes(t))
  }
})

test("nome vazio não quebra", () => {
  assert.match(corDoPostit("", TEMAS.birthday), /^oklch\(/)
  assert.ok(Number.isFinite(inclinacaoDoPostit("")))
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `node --test lib/postit-visual.test.ts`
Expected: FAIL com `ERR_MODULE_NOT_FOUND` para `./postit-visual.ts`.

- [ ] **Step 3: Implementar `lib/postit-visual.ts`**

```ts
import type { Tema } from "./themes.ts"

/** Passo do ângulo áureo: separa matizes melhor que módulo puro, que agrupa e
 *  colide quando há poucos itens. */
const PASSO_AUREO = 137.508

/** Croma e luminosidade são constantes de propósito. Em OKLCH a luminosidade é
 *  perceptualmente uniforme, então fixá-la garante que todo postit gerado tenha
 *  o mesmo contraste real com o texto — o que HSL não daria, já que amarelo e
 *  azul com o mesmo L parecem ter claridades diferentes. */
const LUMINOSIDADE = 0.92
const CROMA = 0.09

const TEXTURAS = ["liso", "listrado", "pontilhado"] as const
export type Textura = (typeof TEXTURAS)[number]

/** FNV-1a de 32 bits: rápido, sem dependência e estável entre execuções. */
export function hashNome(nome: string): number {
  let h = 2166136261
  for (let i = 0; i < nome.length; i++) {
    h ^= nome.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function corDoPostit(nome: string, tema: Tema): string {
  // Espalha pelo círculo completo com o ângulo áureo, depois comprime o
  // resultado para dentro da faixa do tema.
  const espalhado = (hashNome(nome) * PASSO_AUREO) % 360
  const desvio = (espalhado / 360 - 0.5) * tema.amplitudeMatiz
  const matiz = (tema.matizBase + desvio + 360) % 360
  return `oklch(${LUMINOSIDADE} ${CROMA} ${Number(matiz.toFixed(2))})`
}

export function inclinacaoDoPostit(nome: string): number {
  return Number((((hashNome(nome) % 61) - 30) / 10).toFixed(1))
}

export function texturaDoPostit(nome: string): Textura {
  return TEXTURAS[hashNome(nome) % TEXTURAS.length]
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `node --test lib/postit-visual.test.ts`
Expected: `# pass 9`, `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add lib/postit-visual.ts lib/postit-visual.test.ts
git commit -m "Derive post-it appearance from the author's name

Colour, tilt and texture come from an FNV-1a hash of the name, so the same
person always gets the same note and no two neighbours look alike.

Colour is generated in OKLCH with fixed lightness and chroma rather than HSL:
HSL lightness is not perceptually uniform, so yellow and blue at the same L
would give the note text visibly different contrast. Hue is spread with the
golden angle before being compressed into the theme's band, since plain modulo
clusters for small counts.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Contrato e orquestração das animações

**Files:**
- Create: `components/Animations/tipos.ts`
- Rewrite: `components/Animations/AnimationLayer.tsx`

**Interfaces:**
- Consumes: `resolverAnimacoes` de `lib/themes.ts`.
- Produces:
  - `type FaseAnimacao = "celebracao" | "ambiente"`
  - `interface PropsAnimacao { fase, cores, intensidade, disparar }`
  - `type Disparador = (opcoes: confetti.Options) => void`
  - `<AnimationLayer animations={string[]} cores={string[]} />`

- [ ] **Step 1: Criar `components/Animations/tipos.ts`**

```ts
import type confetti from "canvas-confetti"

export type FaseAnimacao = "celebracao" | "ambiente"

/** Instância ligada ao canvas do AnimationLayer, não ao canvas global da lib. */
export type Disparador = (opcoes: confetti.Options) => void

export interface PropsAnimacao {
  fase: FaseAnimacao
  /** Paleta do tema do evento, em hex (canvas-confetti não aceita oklch). */
  cores: string[]
  /** 1 na celebração, ~0.1 no ambiente. */
  intensidade: number
  disparar: Disparador
}

/** Quanto dura a celebração antes de decair para o movimento de fundo. */
export const DURACAO_CELEBRACAO_MS = 2500
```

- [ ] **Step 2: Reescrever `components/Animations/AnimationLayer.tsx`**

```tsx
"use client"

import { useEffect, useRef, useState } from "react"
import confetti from "canvas-confetti"
import { resolverAnimacoes } from "@/lib/themes"
import { DURACAO_CELEBRACAO_MS, type Disparador, type FaseAnimacao, type PropsAnimacao } from "./tipos"
import ConfettiAnimation from "./ConfettiAnimation"
import ConfettiUpAnimation from "./ConfettiUpAnimation"
import BalloonsAnimation from "./BalloonsAnimation"
import FireworksAnimation from "./FireworksAnimation"
import PetalsAnimation from "./PetalsAnimation"
import StarsAnimation from "./StarsAnimation"

const COMPONENTES: Record<string, React.ComponentType<PropsAnimacao>> = {
  confetti: ConfettiAnimation,
  confetti_up: ConfettiUpAnimation,
  balloons: BalloonsAnimation,
  fireworks: FireworksAnimation,
  petals: PetalsAnimation,
  stars: StarsAnimation,
}

interface Props {
  animations: string[]
  cores: string[]
}

export default function AnimationLayer({ animations, cores }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [disparar, setDisparar] = useState<Disparador | null>(null)
  const [fase, setFase] = useState<FaseAnimacao>("celebracao")
  const [visivel, setVisivel] = useState(true)

  // Movimento contínuo é gatilho de acessibilidade, não questão de gosto:
  // sob prefers-reduced-motion nada roda.
  const [reduzirMovimento, setReduzirMovimento] = useState(true)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const aplicar = () => setReduzirMovimento(mq.matches)
    aplicar()
    mq.addEventListener("change", aplicar)
    return () => mq.removeEventListener("change", aplicar)
  }, [])

  // useWorker tira a animação da thread principal. Como o ambiente roda
  // indefinidamente, é o que separa a página fluida da travada ao rolar.
  useEffect(() => {
    if (!canvasRef.current || reduzirMovimento) return
    const instancia = confetti.create(canvasRef.current, {
      resize: true,
      useWorker: true,
      disableForReducedMotion: true,
    })
    setDisparar(() => instancia as Disparador)
    return () => {
      instancia.reset()
    }
  }, [reduzirMovimento])

  useEffect(() => {
    if (reduzirMovimento) return
    const t = setTimeout(() => setFase("ambiente"), DURACAO_CELEBRACAO_MS)
    return () => clearTimeout(t)
  }, [reduzirMovimento])

  // Sem isto um celular no bolso continuaria animando.
  useEffect(() => {
    const aoMudar = () => setVisivel(document.visibilityState === "visible")
    document.addEventListener("visibilitychange", aoMudar)
    return () => document.removeEventListener("visibilitychange", aoMudar)
  }, [])

  const ids = resolverAnimacoes(animations)

  if (reduzirMovimento || ids.length === 0) return null

  return (
    <>
      {/* Atrás do conteúdo e translúcido: o ambiente nunca cobre um recado. */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 h-full w-full opacity-45"
      />

      {visivel && disparar &&
        ids.map((id) => {
          const Componente = COMPONENTES[id]
          if (!Componente) return null
          return (
            <Componente
              key={id}
              fase={fase}
              cores={cores}
              intensidade={fase === "celebracao" ? 1 : 0.1}
              disparar={disparar}
            />
          )
        })}
    </>
  )
}
```

- [ ] **Step 3: Garantir que o conteúdo fique acima do canvas**

Em `app/revelacao/[token]/page.tsx`, o container do conteúdo precisa de contexto
de empilhamento próprio. Trocar:

```tsx
      <div className="max-w-6xl mx-auto space-y-6">
```

por:

```tsx
      <div className="relative z-0 max-w-6xl mx-auto space-y-6">
```

O canvas usa `-z-10`; sem `relative z-0` no conteúdo, o resultado depende da
ordem do DOM em vez de ser explícito.

- [ ] **Step 4: Verificar que compila**

Run: `npx tsc --noEmit 2>&1 | grep -v "generated/prisma/client"`
Expected: nenhum erro (as animações ainda não existem — este passo só roda ao fim da Task 4).

Nota: as Tasks 3 e 4 compartilham um commit, porque `AnimationLayer` importa
componentes que a Task 4 cria. Faça a Task 4 antes de commitar.

---

### Task 4: As seis animações

**Files:**
- Rewrite: `components/Animations/ConfettiAnimation.tsx`, `BalloonsAnimation.tsx`, `FireworksAnimation.tsx`
- Create: `components/Animations/PetalsAnimation.tsx`, `StarsAnimation.tsx`, `ConfettiUpAnimation.tsx`
- Delete: `components/Animations/ConfettiPaperAnimation.tsx`

**Interfaces:**
- Consumes: `PropsAnimacao`, `Disparador` de `./tipos`.
- Produces: seis componentes `React.ComponentType<PropsAnimacao>`.

- [ ] **Step 1: Criar um hook compartilhado de ritmo**

Criar `components/Animations/useRitmo.ts`:

```ts
import { useEffect, useRef } from "react"

/**
 * Executa `acao` em intervalos, com `intervaloMs` diferente por fase.
 * Existe para que as seis animações não repitam cada uma o seu próprio
 * setInterval com a mesma lógica de limpeza.
 */
export function useRitmo(acao: () => void, intervaloMs: number) {
  const acaoRef = useRef(acao)
  acaoRef.current = acao

  useEffect(() => {
    acaoRef.current()
    const id = setInterval(() => acaoRef.current(), intervaloMs)
    return () => clearInterval(id)
  }, [intervaloMs])
}
```

- [ ] **Step 2: Reescrever `ConfettiAnimation.tsx`**

```tsx
"use client"

import type { PropsAnimacao } from "./tipos"
import { useRitmo } from "./useRitmo"

export default function ConfettiAnimation({ fase, cores, intensidade, disparar }: PropsAnimacao) {
  const celebrando = fase === "celebracao"

  useRitmo(() => {
    const quantidade = Math.max(2, Math.round(30 * intensidade))
    // Escalas e decaimentos diferentes por rajada dão profundidade: as peças
    // menores parecem mais distantes e caem mais devagar.
    for (const escala of [1, 0.7]) {
      disparar({
        particleCount: quantidade,
        angle: 60,
        spread: celebrando ? 70 : 40,
        startVelocity: celebrando ? 55 : 25,
        decay: 0.92,
        scalar: escala,
        ticks: celebrando ? 220 : 400,
        origin: { x: 0, y: 0.7 },
        colors: cores,
      })
      disparar({
        particleCount: quantidade,
        angle: 120,
        spread: celebrando ? 70 : 40,
        startVelocity: celebrando ? 55 : 25,
        decay: 0.92,
        scalar: escala,
        ticks: celebrando ? 220 : 400,
        origin: { x: 1, y: 0.7 },
        colors: cores,
      })
    }
  }, celebrando ? 350 : 2600)

  return null
}
```

Cuidado ao editar: a prop da lib chama-se `colors` e o valor vem da nossa prop
`cores`. Como ambos são `string[]`, escrever `colors,` por engano compila e só
aparece como cor errada em runtime.

- [ ] **Step 3: Criar `ConfettiUpAnimation.tsx`**

```tsx
"use client"

import type { PropsAnimacao } from "./tipos"
import { useRitmo } from "./useRitmo"

export default function ConfettiUpAnimation({ fase, cores, intensidade, disparar }: PropsAnimacao) {
  const celebrando = fase === "celebracao"

  useRitmo(() => {
    disparar({
      particleCount: Math.max(2, Math.round(45 * intensidade)),
      angle: 90,
      spread: celebrando ? 100 : 45,
      startVelocity: celebrando ? 60 : 30,
      decay: 0.91,
      gravity: 0.9,
      scalar: 0.9,
      ticks: celebrando ? 240 : 420,
      origin: { x: 0.5, y: 1.05 },
      colors: cores,
    })
  }, celebrando ? 450 : 3000)

  return null
}
```

- [ ] **Step 4: Criar `PetalsAnimation.tsx`**

```tsx
"use client"

import type { PropsAnimacao } from "./tipos"
import { useRitmo } from "./useRitmo"

export default function PetalsAnimation({ fase, cores, intensidade, disparar }: PropsAnimacao) {
  const celebrando = fase === "celebracao"

  useRitmo(() => {
    // flat + gravidade baixa + ticks longo = queda lenta, não explosão. É o que
    // separa isto do confetti — a reclamação de que os dois eram a mesma coisa.
    const lado = Math.random()
    disparar({
      particleCount: Math.max(1, Math.round(12 * intensidade)),
      angle: 270,
      spread: 120,
      startVelocity: 8,
      decay: 0.97,
      gravity: 0.35,
      drift: lado < 0.5 ? -0.6 : 0.6,
      flat: true,
      scalar: 1.2,
      ticks: 600,
      origin: { x: lado, y: -0.1 },
      colors: cores,
    })
  }, celebrando ? 300 : 1800)

  return null
}
```

- [ ] **Step 5: Criar `StarsAnimation.tsx`**

```tsx
"use client"

import type { PropsAnimacao } from "./tipos"
import { useRitmo } from "./useRitmo"

const DOURADOS = ["#FFD700", "#FFA500", "#FFDF6B", "#F5C518"]

export default function StarsAnimation({ fase, cores, intensidade, disparar }: PropsAnimacao) {
  const celebrando = fase === "celebracao"

  useRitmo(() => {
    for (const [escala, velocidade] of [[1.2, 28], [0.7, 18]] as const) {
      disparar({
        particleCount: Math.max(1, Math.round(14 * intensidade)),
        angle: 90,
        spread: 360,
        startVelocity: celebrando ? velocidade : velocidade / 2,
        decay: 0.94,
        gravity: 0.4,
        shapes: ["star"],
        scalar: escala,
        ticks: celebrando ? 260 : 500,
        origin: { x: Math.random(), y: Math.random() * 0.6 },
        colors: [...DOURADOS, ...cores],
      })
    }
  }, celebrando ? 400 : 2800)

  return null
}
```

- [ ] **Step 6: Reescrever `FireworksAnimation.tsx`**

```tsx
"use client"

import type { PropsAnimacao } from "./tipos"
import { useRitmo } from "./useRitmo"

export default function FireworksAnimation({ fase, cores, intensidade, disparar }: PropsAnimacao) {
  const celebrando = fase === "celebracao"

  useRitmo(() => {
    // Estouros nas laterais preservam o centro da tela, que é onde ficam os
    // recados.
    const x = Math.random() < 0.5 ? 0.1 + Math.random() * 0.2 : 0.7 + Math.random() * 0.2
    disparar({
      particleCount: Math.max(3, Math.round(60 * intensidade)),
      angle: 90,
      spread: 360,
      startVelocity: celebrando ? 35 : 18,
      decay: 0.9,
      gravity: 1.1,
      scalar: celebrando ? 1 : 0.7,
      ticks: celebrando ? 200 : 320,
      origin: { x, y: 0.2 + Math.random() * 0.3 },
      colors: cores,
    })
  }, celebrando ? 500 : 3200)

  return null
}
```

- [ ] **Step 7: Reescrever `BalloonsAnimation.tsx`**

```tsx
"use client"

import { motion, useReducedMotion } from "framer-motion"
import { useEffect, useState } from "react"
import type { PropsAnimacao } from "./tipos"

interface Balao {
  id: number
  left: number
  cor: string
  atraso: number
  duracao: number
  deriva: number
}

export default function BalloonsAnimation({ fase, cores, intensidade }: PropsAnimacao) {
  const reduzir = useReducedMotion()
  const [baloes, setBaloes] = useState<Balao[]>([])
  const celebrando = fase === "celebracao"

  useEffect(() => {
    if (reduzir) return

    const quantidade = Math.max(1, Math.round(14 * intensidade))
    const gerar = () =>
      setBaloes(
        Array.from({ length: quantidade }, (_, i) => ({
          id: Date.now() + i,
          left: Math.random() * 90 + 5,
          cor: cores[i % cores.length],
          atraso: Math.random() * (celebrando ? 1.2 : 3),
          duracao: 7 + Math.random() * 5,
          // Deriva lateral: sobem em arco, não em linha reta.
          deriva: (Math.random() - 0.5) * 120,
        }))
      )

    gerar()
    const id = setInterval(gerar, celebrando ? 4000 : 9000)
    return () => clearInterval(id)
  }, [celebrando, cores, intensidade, reduzir])

  if (reduzir) return null

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {baloes.map((b) => (
        <motion.div
          key={b.id}
          initial={{ y: "105vh", x: 0, opacity: 0 }}
          animate={{ y: "-25vh", x: b.deriva, opacity: [0, 1, 1, 0] }}
          transition={{
            duration: b.duracao,
            delay: b.atraso,
            ease: "easeOut",
            opacity: { times: [0, 0.15, 0.8, 1] },
          }}
          style={{ left: `${b.left}%`, backgroundColor: b.cor }}
          className="absolute h-12 w-9 rounded-[50%_50%_50%_50%/60%_60%_40%_40%]"
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 8: Remover o componente absorvido**

```bash
git rm components/Animations/ConfettiPaperAnimation.tsx
```

- [ ] **Step 9: Verificar**

```bash
npx tsc --noEmit 2>&1 | grep -v "generated/prisma/client" | grep "error TS" || echo "tsc ok"
npx eslint components/Animations lib/themes.ts lib/postit-visual.ts
node --test lib/themes.test.ts lib/postit-visual.test.ts
```

Expected: sem erros de tipo, sem erros novos de lint, `# fail 0`.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "Rebuild animations around a two-phase contract

Every animation now takes { fase, cores, intensidade, disparar } and interprets
a strong opening burst followed by a continuous ambient trickle, which is what
was asked for: celebrate on arrival, then keep the screen alive while the person
reads without getting in the way.

They share one canvas created with useWorker so the ambient phase does not run
on the main thread, sit behind the content at reduced opacity, freeze when the
tab is hidden, and are suppressed entirely under prefers-reduced-motion.

Petals replaces the old paper confetti, which was nearly indistinguishable from
regular confetti: flat particles, low gravity and long ticks make it fall slowly
instead of exploding.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Aplicar tema e aparência procedural no mural

**Files:**
- Modify: `components/Mural/PostitCard.tsx`, `components/Mural/MuralCanvas.tsx`
- Modify: `app/revelacao/[token]/page.tsx`, `app/eventos/[shareLink]/mural/page.tsx`
- Modify: `app/api/mural/[shareLink]/route.ts` (nada a mudar — confirmar que `type` já vem no payload)

**Interfaces:**
- Consumes: `resolverTema`, `corDoPostit`, `inclinacaoDoPostit`, `texturaDoPostit`.
- Produces: `PostitCard` aceita `tema: Tema`.

- [ ] **Step 1: Aplicar em `PostitCard.tsx`**

Trocar a interface e o cálculo de estilo:

```tsx
import type { Tema } from "@/lib/themes"
import { corDoPostit, inclinacaoDoPostit, texturaDoPostit } from "@/lib/postit-visual"

interface PostitCardProps {
  id: string
  name: string
  message: string
  /** Cor escolhida à mão pelo visitante. Vazia = usa a cor do tema. */
  color: string
  icon?: string | null
  positionX: number
  positionY: number
  disabled?: boolean
  tema: Tema
}
```

E, dentro do componente, antes do `style`:

```tsx
  // A cor procedural é o padrão, não uma imposição: se o visitante escolheu uma
  // cor no formulário, ela vence.
  const corPadrao = POSTIT_COLORS.some((c) => c.hex === color)
  const fundo = corPadrao ? color : corDoPostit(name, tema)
  const giro = inclinacaoDoPostit(name)
  const textura = texturaDoPostit(name)

  const style: React.CSSProperties = {
    position: "absolute",
    left: positionX,
    top: positionY,
    backgroundColor: fundo,
    backgroundImage: FUNDOS[textura],
    transform: CSS.Translate.toString(transform),
    rotate: `${giro}deg`,
    zIndex: isDragging ? 50 : 1,
    touchAction: "none",
  }
```

Com, no topo do arquivo:

```tsx
import { POSTIT_COLORS } from "@/lib/utils"

// Texturas sutis em CSS puro: sem imagem, sem requisição, e legíveis por cima.
const FUNDOS: Record<string, string> = {
  liso: "none",
  listrado:
    "repeating-linear-gradient(45deg, rgba(0,0,0,0.035) 0 6px, transparent 6px 12px)",
  pontilhado: "radial-gradient(rgba(0,0,0,0.05) 1.2px, transparent 1.2px)",
}
```

E remover `rotate-[-2deg] hover:rotate-0` do `className`, já que a rotação passou
a ser inline e por autor.

- [ ] **Step 2: Repassar o tema em `MuralCanvas.tsx`**

Adicionar `tema: Tema` às props e repassar para cada `PostitCard`:

```tsx
import type { Tema } from "@/lib/themes"
```

E no `PostitCard`: `tema={tema}`.

- [ ] **Step 3: Passar o tema nas duas páginas**

Nas duas páginas, adicionar `type: string` à interface `EventData` e:

```tsx
import { resolverTema } from "@/lib/themes"
...
const tema = resolverTema(event.type)
```

Em `/revelacao/[token]/page.tsx`, usar o tema também no `AnimationLayer` e no título:

```tsx
<AnimationLayer animations={event.animations} cores={PALETA_ANIMACAO[tema.id]} />
```

Definir em `lib/themes.ts`, ao fim do arquivo (canvas-confetti só aceita hex):

```ts
export const PALETA_ANIMACAO: Record<TipoEvento, string[]> = {
  birthday: ["#f472b6", "#a78bfa", "#60a5fa", "#fbbf24"],
  farewell: ["#818cf8", "#38bdf8", "#2dd4bf", "#c7d2fe"],
  welcome: ["#34d399", "#22d3ee", "#fde047", "#86efac"],
  achievement: ["#fbbf24", "#f59e0b", "#a78bfa", "#fcd34d"],
}
```

E o `<h1>` da revelação passa a usar o acento do tema:

```tsx
<h1 className="text-4xl font-bold" style={{ color: tema.acento }}>
  {event.title}
</h1>
```

Isso também resolve o gradiente `bg-clip-text` de vez: cor sólida não tem como sumir.

- [ ] **Step 4: Verificar e commitar**

```bash
npx tsc --noEmit 2>&1 | grep -v "generated/prisma/client" | grep "error TS" || echo "tsc ok"
git add -A
git commit -m "Give each note a look derived from its author and the event theme

Notes now take colour, tilt and a subtle CSS texture from the writer's name
within the event theme's hue band, so a board reads as one piece while no two
notes look the same. A colour picked by hand in the form still wins.

The reveal heading uses the theme accent as a solid colour, which also retires
the bg-clip-text gradient that could render as invisible text.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Tipos de evento no dashboard

**Files:**
- Modify: `app/admin/dashboard/page.tsx`

- [ ] **Step 1: Trocar o `<select>` de tipo**

Substituir o bloco que hoje tem só `<option value="birthday">Aniversário</option>` por:

```tsx
<select
  value={formData.type}
  onChange={(e) => handleTrocarTipo(e.target.value)}
  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
>
  {Object.values(TEMAS).map((t) => (
    <option key={t.id} value={t.id}>{t.label}</option>
  ))}
</select>
<p className="text-xs text-gray-600 mt-1">{resolverTema(formData.type).descricao}</p>
```

- [ ] **Step 2: Trocar o tipo remarca as animações**

```tsx
// Trocar o tipo repõe as animações daquele tema. É sugestão, não trava: os
// checkboxes abaixo continuam editáveis.
const handleTrocarTipo = (type: string) => {
  setFormData({ ...formData, type, animations: [...resolverTema(type).animacoesPadrao] })
}
```

E o estado inicial passa a nascer com o padrão do tema:

```tsx
const [formData, setFormData] = useState({
  title: "",
  description: "",
  eventDate: "",
  type: TEMA_PADRAO,
  animations: [...TEMAS[TEMA_PADRAO].animacoesPadrao],
})
```

O mesmo objeto deve ser usado no reset após criar o evento.

- [ ] **Step 3: Listar as animações a partir do registry**

Substituir o array literal `["confetti", "balloons", "fireworks", "confetti_paper"]` por
`ANIMACOES`, mostrando `label` e `descricao` em vez do id cru:

```tsx
{ANIMACOES.map((anim) => (
  <label key={anim.id} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
    <input
      type="checkbox"
      checked={formData.animations.includes(anim.id)}
      onChange={(e) =>
        setFormData({
          ...formData,
          animations: e.target.checked
            ? [...formData.animations, anim.id]
            : formData.animations.filter((a) => a !== anim.id),
        })
      }
      className="mt-1"
    />
    <span>
      <span className="block text-sm font-medium text-gray-900">{anim.label}</span>
      <span className="block text-xs text-gray-600">{anim.descricao}</span>
    </span>
  </label>
))}
```

- [ ] **Step 4: Verificar e commitar**

```bash
npx tsc --noEmit 2>&1 | grep -v "generated/prisma/client" | grep "error TS" || echo "tsc ok"
npx eslint app/admin/dashboard/page.tsx
git add app/admin/dashboard/page.tsx
git commit -m "Offer the four event types when creating an event

The type field existed in the database from the start but the form only ever
offered 'Aniversário', so it was dead. Picking a type now also fills in that
theme's animations, which stay editable.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Identidade "Mensagens Corp." e moldura sóbria

**Files:**
- Modify: `app/layout.tsx`, `app/page.tsx`, `app/admin/layout.tsx`, `app/auth/login/page.tsx`, `app/auth/convite/[token]/page.tsx`, `package.json`, `README.md`

- [ ] **Step 1: Renomear**

- `app/layout.tsx`: `title: "Mensagens Corp."`, `description: "Murais de recados para aniversários, despedidas, boas-vindas e conquistas"`, `icons: { icon: "💬" }`.
- `app/admin/layout.tsx`: o `<h2>` vira `💬 Mensagens Corp.` e a cor passa de `text-pink-600` para `text-indigo-700`.
- `app/page.tsx`: o `<h1>` vira `💬 Mensagens Corp.`.
- `package.json`: `"name": "mensagens-corp"`.
- `README.md`: título `# 💬 Mensagens Corp.` e primeiro parágrafo mencionando os quatro tipos de evento.

- [ ] **Step 2: Moldura sóbria**

Nas telas de moldura (`app/page.tsx`, `app/auth/login/page.tsx`, `app/auth/convite/[token]/page.tsx`, `app/admin/*`), trocar os gradientes rosa/roxo de botão primário por índigo sólido:

- `bg-gradient-to-r from-pink-500 to-purple-500` → `bg-indigo-600 hover:bg-indigo-700`
- `focus:ring-pink-500` → `focus:ring-indigo-500`
- `text-pink-500` / `text-pink-600` em links e ícones de navegação → `text-indigo-600`
- `border-b-2 border-pink-500` dos spinners → `border-indigo-600`

Não tocar em `app/eventos/[shareLink]/mural/page.tsx`, `app/revelacao/[token]/page.tsx`
nem em `components/Forms/PostitForm.tsx`: são as telas festivas.

- [ ] **Step 3: Verificar que nada de rosa sobrou na moldura**

```bash
grep -rn "pink" app/page.tsx app/auth app/admin || echo "moldura sem rosa"
```

- [ ] **Step 4: Commitar**

```bash
git add -A
git commit -m "Rename to Mensagens Corp. and sober up the frame

'Aniversário' stopped describing the product once farewells, welcomes and
achievements became first-class event types.

Admin, login and invite screens move to a neutral grey and indigo palette,
while the board and the reveal page keep their gradients. A tool people open at
work should not look like a party until the moment it is meant to.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Acabamento

**Files:**
- Create: `components/ui/Botao.tsx`, `components/ui/EstadoVazio.tsx`
- Modify: `app/globals.css`
- Modify: telas que repetem botões e estados vazios

- [ ] **Step 1: Escala tipográfica em `globals.css`**

Adicionar dentro do `@theme` existente:

```css
  --text-titulo: 1.875rem;
  --text-titulo--line-height: 2.25rem;
  --text-seccao: 1.25rem;
  --text-seccao--line-height: 1.75rem;
  --text-apoio: 0.8125rem;
  --text-apoio--line-height: 1.25rem;
```

- [ ] **Step 2: Criar `components/ui/Botao.tsx`**

```tsx
import { cn } from "@/lib/utils"

type Variante = "primario" | "secundario" | "perigo"

const VARIANTES: Record<Variante, string> = {
  primario: "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50",
  secundario: "bg-white border border-gray-300 text-gray-900 hover:bg-gray-50",
  perigo: "bg-red-50 text-red-700 hover:bg-red-100",
}

export default function Botao({
  variante = "primario",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante }) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 font-semibold transition disabled:cursor-not-allowed",
        VARIANTES[variante],
        className
      )}
    />
  )
}
```

- [ ] **Step 3: Criar `components/ui/EstadoVazio.tsx`**

```tsx
import type { LucideIcon } from "lucide-react"

export default function EstadoVazio({
  Icone,
  titulo,
  descricao,
}: {
  Icone: LucideIcon
  titulo: string
  descricao: string
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
      <Icone className="w-14 h-14 text-gray-400 mx-auto mb-4" aria-hidden="true" />
      <h2 className="text-seccao font-semibold text-gray-900 mb-1">{titulo}</h2>
      <p className="text-gray-600">{descricao}</p>
    </div>
  )
}
```

Note que o ícone usa `text-gray-400` e não `text-gray-300`: mesmo decorativo,
`gray-300` sobre branco é quase invisível.

- [ ] **Step 4: Adotar nos quatro estados vazios**

Substituir os blocos repetidos em `app/admin/dashboard/page.tsx`,
`app/admin/delegados/page.tsx`, `app/eventos/[shareLink]/mural/page.tsx` e
`app/revelacao/[token]/page.tsx` por `<EstadoVazio Icone={...} titulo="..." descricao="..." />`,
preservando os textos atuais de cada tela.

- [ ] **Step 5: Verificar e commitar**

```bash
npx tsc --noEmit 2>&1 | grep -v "generated/prisma/client" | grep "error TS" || echo "tsc ok"
npx eslint .
node --test lib/*.test.ts
git add -A
git commit -m "Standardise buttons, empty states and type scale

Buttons and empty states were duplicated across five screens with slightly
different classes each time, so they had drifted apart. Empty-state icons move
off gray-300, which is nearly invisible on white.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Verificação final e deploy

- [ ] **Step 1: Suite completa**

```bash
node --test lib/auth.test.ts lib/invites.test.ts lib/themes.test.ts lib/postit-visual.test.ts
npx tsc --noEmit 2>&1 | grep -v "generated/prisma/client" | grep "error TS" || echo "tsc ok"
npx eslint . -f json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{let n=0;for(const f of JSON.parse(s))n+=f.messages.length;console.log('problemas de lint:',n)})"
```

Expected: `# fail 0`, `tsc ok`, e contagem de lint **não maior que 11** (a linha de base pré-existente).

- [ ] **Step 2: Conferir que nenhum segredo entrou**

```bash
git status --porcelain | grep -E "^\s*[AM].*\.env$" && echo "PARE" || echo "ok"
```

- [ ] **Step 3: Push**

```bash
GIT_TERMINAL_PROMPT=0 git push origin claude/recados-mural-app-bn6pmk
```

- [ ] **Step 4: Validar em produção**

Depois do deploy, na ordem:

1. Criar um evento de cada tipo; conferir que as animações pré-marcadas mudam junto do tipo.
2. Abrir a revelação de um evento: burst na entrada, depois movimento de fundo; nenhum recado coberto.
3. Trocar de aba e voltar: o ambiente pausa e retoma.
4. Ligar "reduzir movimento" no SO e recarregar: nenhuma animação.
5. Deixar recados com nomes diferentes: cores distintas, todas com texto legível.
6. Abrir o link de coleta: nenhuma animação, moldura sóbria.

---

## Notas de auto-revisão

- **Cobertura da spec:** registry (T1), postit procedural (T2), contrato e duas fases (T3–T4), aplicação no mural (T5), tipos no dashboard (T6), rename e moldura (T7), acabamento (T8). Todas as seções têm task.
- **Tasks 3 e 4 compartilham commit** porque `AnimationLayer` importa componentes criados na T4; está sinalizado no fim da T3.
- **Armadilha de nomes:** o `canvas-confetti` usa a prop `colors`, enquanto a prop do nosso contrato é `cores`. O passo 2 da T4 chama isso explicitamente porque é fácil de trocar sem o `tsc` reclamar quando ambos são `string[]`.
- **`POSTIT_ICONS` morto:** removido junto na T5, ao mexer em `lib/utils.ts`. Se a task não precisar tocar o arquivo, remova numa linha separada do commit da T8.
- **Sem migration em nenhuma task**, como a spec exige — e os ids preservados mantêm o evento `birthday` existente válido.
