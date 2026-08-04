"use client"

import { useCallback, useSyncExternalStore } from "react"

/**
 * Media query como estado de React.
 *
 * `useSyncExternalStore` em vez de `useState` + `useEffect` porque o servidor
 * também precisa de uma resposta: o snapshot do servidor devolve `false`, ou
 * seja, **o servidor sempre assume celular**. Num app cujo uso principal é no
 * telefone, esse é o lado certo de errar — o desktop corrige no primeiro
 * frame, e ninguém no celular recebe layout de desktop nem por um instante.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (aoMudar: () => void) => {
      const mq = window.matchMedia(query)
      mq.addEventListener("change", aoMudar)
      return () => mq.removeEventListener("change", aoMudar)
    },
    [query]
  )

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  )
}

/** Breakpoint `sm` do Tailwind — a fronteira entre mural livre e lista. */
export const ACIMA_DE_CELULAR = "(min-width: 640px)"
