"use client"

import { useEffect, useSyncExternalStore } from "react"

/**
 * Quanto movimento a pessoa quer ver, com direito a discordar do sistema.
 *
 * O celular tem um botão de "reduzir animações" que muita gente liga por
 * bateria ou por hábito, sem nunca ter pensado neste app — e aí a abertura, que
 * é a graça do link, chega como uma tela parada. Por outro lado, quem liga
 * aquilo por enjoo ou vertigem tem um motivo sério, e ignorar o pedido do
 * sistema seria pior do que perder a surpresa.
 *
 * A saída é não decidir por ninguém: o sistema continua mandando por padrão, e
 * quem quiser ver a cena pede uma vez. A escolha fica guardada neste navegador.
 */

const CHAVE = "mensagens_corp_movimento"
const CONSULTA = "(prefers-reduced-motion: reduce)"

/**
 * `auto` = obedece ao sistema, e é o padrão.
 * `completo` = pediu para ver a cena apesar do ajuste do sistema.
 * `reduzido` = pediu para não ver, mesmo que o sistema não peça nada.
 *
 * `reduzido` existe para a recusa ficar guardada: sem ele, quem dispensasse o
 * convite seria perguntado de novo na visita seguinte.
 */
export type Preferencia = "auto" | "completo" | "reduzido"

const ouvintes = new Set<() => void>()

function lerPreferencia(): Preferencia {
  try {
    const guardada = localStorage.getItem(CHAVE)
    return guardada === "completo" || guardada === "reduzido" ? guardada : "auto"
  } catch {
    // Navegação privada e cookies desativados fazem localStorage lançar.
    // Cair no `auto` é o lado certo de errar: obedece ao sistema.
    return "auto"
  }
}

function sistemaReduz(): boolean {
  return window.matchMedia(CONSULTA).matches
}

/**
 * Marca o documento para o CSS.
 *
 * `@media (prefers-reduced-motion)` no globals.css não tem como saber da
 * preferência guardada aqui — keyframes de CSS ficariam desligados mesmo depois
 * de a pessoa pedir para ver. Este atributo é a ponte.
 */
function marcarDocumento(preferencia: Preferencia) {
  document.documentElement.dataset.movimento = preferencia
}

export function definirMovimento(preferencia: Preferencia) {
  try {
    localStorage.setItem(CHAVE, preferencia)
  } catch {
    // Sem persistência a escolha vale só para esta visita, o que ainda é melhor
    // do que não valer.
  }
  marcarDocumento(preferencia)
  ouvintes.forEach((avisar) => avisar())
}

function subscrever(aoMudar: () => void) {
  ouvintes.add(aoMudar)
  const consulta = window.matchMedia(CONSULTA)
  consulta.addEventListener("change", aoMudar)
  return () => {
    ouvintes.delete(aoMudar)
    consulta.removeEventListener("change", aoMudar)
  }
}

// No servidor não há matchMedia nem localStorage. Responder "com movimento" faz
// o HTML sair com os elementos animados; logo após a hidratação o valor real
// chega e o React redesenha. O contrário — servir parado e depois animar —
// dispararia a animação já com a pessoa lendo a tela.
const noServidor = () => false

function resolver(): boolean {
  const preferencia = lerPreferencia()
  if (preferencia === "completo") return false
  if (preferencia === "reduzido") return true
  return sistemaReduz()
}

/** Verdadeiro quando o movimento deve ser suprimido. */
export function useMovimentoReduzido(): boolean {
  const reduzido = useSyncExternalStore(subscrever, resolver, noServidor)

  useEffect(() => {
    marcarDocumento(lerPreferencia())
  }, [reduzido])

  return reduzido
}

/**
 * O que o sistema pede, ignorando a preferência guardada.
 *
 * Serve para decidir se vale a pena oferecer a escolha: para quem não pediu
 * redução nenhuma, o convite seria ruído.
 */
export function useSistemaReduzMovimento(): boolean {
  return useSyncExternalStore(subscrever, sistemaReduz, noServidor)
}

/** A escolha guardada, para o botão saber que rótulo mostrar. */
export function usePreferenciaMovimento(): Preferencia {
  return useSyncExternalStore(subscrever, lerPreferencia, () => "auto" as const)
}
