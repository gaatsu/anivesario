"use client"

import ConfettiAnimation from "./ConfettiAnimation"
import ConfettiPaperAnimation from "./ConfettiPaperAnimation"
import BalloonsAnimation from "./BalloonsAnimation"
import FireworksAnimation from "./FireworksAnimation"

const ANIMATION_COMPONENTS: Record<string, React.ComponentType> = {
  confetti: ConfettiAnimation,
  confetti_paper: ConfettiPaperAnimation,
  balloons: BalloonsAnimation,
  fireworks: FireworksAnimation,
}

interface AnimationLayerProps {
  animations: string[]
}

export default function AnimationLayer({ animations }: AnimationLayerProps) {
  return (
    <>
      {animations.map((animId) => {
        const AnimationComponent = ANIMATION_COMPONENTS[animId]
        if (!AnimationComponent) return null
        return <AnimationComponent key={animId} />
      })}
    </>
  )
}
