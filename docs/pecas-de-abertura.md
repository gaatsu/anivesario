# Como criar uma peça de abertura

A "peça" é o desenho central da tela que abre o link da surpresa: o bolo no
aniversário, o medalhão nos demais. Trocar ou criar uma envolve **dois passos**.

## 1. Criar o componente

`components/Abertura/MinhaPeca.tsx`:

```tsx
"use client"

import { motion } from "framer-motion"
import { useMovimentoReduzido } from "@/lib/movimento"
import type { PropsPeca } from "./pecas"

export default function MinhaPeca({ tema, cores, className = "" }: PropsPeca) {
  const reduzido = useMovimentoReduzido()

  return (
    <svg viewBox="0 0 260 244" className={className} role="img" aria-label="descreva o desenho">
      <motion.g
        initial={reduzido ? false : { opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduzido ? { duration: 0 } : { delay: 0.2, duration: 0.6 }}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      >
        {/* seu desenho */}
      </motion.g>
    </svg>
  )
}
```

`tema` traz `acento` (cor sólida), `saudacao`, `icones`. `cores` é a paleta do
tema, boa para detalhes. `className` chega com a largura — **não fixe tamanho**,
use só o `viewBox`.

## Tamanho

| | Valor | Por quê |
|---|---|---|
| `viewBox` | `0 0 260 244` | O mesmo do bolo. Igual em todas, as peças viram intercambiáveis no registro. |
| Área útil do desenho | ~220 × 204, centralizada | Sobra ~20px de margem em toda a volta. |
| Renderizado | 208px (`w-52`), 256px a partir de `md` | O que `Abertura.tsx` passa. |

**A margem de 20px não é enfeite.** O `viewBox` é o palco, não o desenho: toda
entrada com overshoot — um `scale` que passa de 1 antes de assentar, um
balanço, um halo pulsando — precisa de para onde crescer. Encostou na borda,
corta, e a peça inteira lê como erro.

O bolo hoje desrespeita isso: a chama vai a `y=20` e o halo é um círculo em
`cy=42 r=34`, topo em `y=8`. Passa porque a chama não escala depois de entrar
— mas uma peça que dê um pulo vai cortar em cima.

**Confira a 208px, não a 800px.** O celular é onde isso abre. Um traço de 2px
no `viewBox` vira 1,6px na tela.

Evite `filter` de blur dentro do SVG — é caro no celular. O medalhão usa
`blur-2xl`, mas num `<div>` de CSS e num elemento só.

## 2. Registrar

`components/Abertura/pecas.ts` — é o único lugar:

```ts
export const PECAS: Partial<Record<TipoEvento, ComponentType<PropsPeca>>> = {
  birthday: Bolo,
  achievement: MinhaPeca,   // ← aqui
}
```

A abertura e a bancada de preview leem daqui. Tema sem entrada cai no medalhão.

## Ver o resultado

```bash
npx next dev -p 3987
# as peças lado a lado
node scripts/screenshot.mjs http://localhost:3987/preview/abertura saida.png
# a cena inteira tocando, um tema por vez
node scripts/conferir-movimento.mjs \
  "http://localhost:3987/preview/abertura/completa?tema=birthday" .
```

`/preview/abertura` mostra as cinco peças lado a lado.
`/preview/abertura/completa` toca a abertura de verdade, que é onde se vê o
convite de animação. As duas dão 404 em produção.

## Três armadilhas

**`transformBox: "fill-box"`.** Sem isso, um `scale` ou `rotate` em elemento SVG
gira em torno da origem do `viewBox`, não do próprio desenho — a peça sai voando
para fora da tela. Vale para todo `motion.g` que escale ou rotacione.

**Use `useMovimentoReduzido()`, não o `useReducedMotion()` do framer-motion.**
O hook do framer-motion só lê o ajuste do sistema, e quem escolher "Ver com
animação" na abertura continuaria vendo a peça parada. O nosso (`lib/movimento.ts`)
combina o ajuste do sistema com a escolha guardada, e tem a mesma assinatura.

**CSS não respeita a preferência sozinho.** Se usar `@keyframes` em vez de
framer-motion, desligue à mão no `globals.css` — é o que as classes `.chama`
fazem. Copie as duas regras de lá, e não só a do `@media`: uma desliga quando o
sistema pede redução **e** ninguém escolheu ver
(`:root:not([data-movimento="completo"])`), a outra desliga quando a pessoa
pediu para reduzir (`:root[data-movimento="reduzido"]`). Só o `@media` deixaria
a chama apagada para quem pediu para ver.

**Override por propriedade no `transition` não herda o resto.** No framer-motion,
`transition={{ duration: 8, opacity: { times: [...] } }}` faz a opacidade rodar
em ~0,3s, porque o objeto de `opacity` **substitui** o transition inteiro em vez
de completá-lo. Repita `duration` e `delay` dentro dele. Foi o bug que deixou os
balões invisíveis (ver `lib/balao.ts`).

## Onde estão as referências

- `components/Abertura/Bolo.tsx` — SVG completo, entrada escalonada, chama em
  três camadas
- `components/Abertura/Medalhao.tsx` — mistura HTML e SVG, ícone do lucide
- `app/globals.css` — keyframes `chama-tremor` e `halo-pulso`
