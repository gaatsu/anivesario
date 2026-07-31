# Como criar uma peça de abertura

A "peça" é o desenho central da tela que abre o link da surpresa: o bolo no
aniversário, o medalhão nos demais. Trocar ou criar uma envolve **dois passos**.

## 1. Criar o componente

`components/Abertura/MinhaPeca.tsx`:

```tsx
"use client"

import { motion, useReducedMotion } from "framer-motion"
import type { PropsPeca } from "./pecas"

export default function MinhaPeca({ tema, cores, className = "" }: PropsPeca) {
  const reduzido = useReducedMotion()

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
# abrir http://localhost:3987/preview/abertura
node scripts/screenshot.mjs http://localhost:3987/preview/abertura saida.png
```

A rota mostra as cinco peças lado a lado e 404 em produção.

## Três armadilhas

**`transformBox: "fill-box"`.** Sem isso, um `scale` ou `rotate` em elemento SVG
gira em torno da origem do `viewBox`, não do próprio desenho — a peça sai voando
para fora da tela. Vale para todo `motion.g` que escale ou rotacione.

**CSS não respeita `prefers-reduced-motion` sozinho.** Se usar `@keyframes` em
vez de framer-motion, desligue à mão dentro de
`@media (prefers-reduced-motion: reduce)` no `globals.css` — é o que as classes
`.chama` fazem. Sem isso a tela fica tremendo para quem pediu menos movimento.
Com framer-motion, `useReducedMotion()` resolve.

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
