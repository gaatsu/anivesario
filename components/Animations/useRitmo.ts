import { useEffect, useRef } from "react"

/**
 * Executa `acao` em intervalos, com `intervaloMs` diferente por fase.
 *
 * Existe para que as seis animações não repitam cada uma o próprio setInterval
 * com a mesma lógica de limpeza. A ação vai numa ref para que mudar a paleta ou
 * a intensidade não reinicie o intervalo no meio de uma rajada — e a ref é
 * atualizada dentro de um efeito, nunca durante o render.
 */
export function useRitmo(acao: () => void, intervaloMs: number) {
  const acaoRef = useRef(acao)

  useEffect(() => {
    acaoRef.current = acao
  }, [acao])

  useEffect(() => {
    // A primeira rajada vai num requestAnimationFrame, não direto: os efeitos
    // dos filhos rodam antes dos do pai, e o AnimationLayer só cria a instância
    // do confetti no efeito dele. Chamar aqui na hora perderia o primeiro
    // disparo — justo o estouro de abertura, que é o ponto da tela.
    const quadro = requestAnimationFrame(() => acaoRef.current())
    const id = setInterval(() => acaoRef.current(), intervaloMs)

    return () => {
      cancelAnimationFrame(quadro)
      clearInterval(id)
    }
  }, [intervaloMs])
}
