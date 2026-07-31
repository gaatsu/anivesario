import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Paleta fixa oferecida no formulário para quem quiser escolher a cor à mão.
 * Quem não escolher recebe a cor do tema do evento — ver lib/postit-visual.ts.
 */
export const POSTIT_COLORS = [
  { name: "Amarelo", hex: "#FEF08A" },
  { name: "Rosa", hex: "#FBD5E5" },
  { name: "Azul", hex: "#DBEAFE" },
  { name: "Verde", hex: "#DCF5ED" },
  { name: "Roxo", hex: "#EDE9FE" },
  { name: "Laranja", hex: "#FED7AA" },
]
