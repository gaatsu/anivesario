import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateShareLink(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export const POSTIT_COLORS = [
  { name: "Amarelo", hex: "#FEF08A" },
  { name: "Rosa", hex: "#FBD5E5" },
  { name: "Azul", hex: "#DBEAFE" },
  { name: "Verde", hex: "#DCF5ED" },
  { name: "Roxo", hex: "#EDE9FE" },
  { name: "Laranja", hex: "#FED7AA" },
]

export const POSTIT_ICONS = [
  "Heart",
  "Star",
  "Cake",
  "Gift",
  "Sparkles",
  "Laugh",
  "Balloon",
  "Music",
  "Sun",
  "Moon",
  "Flame",
  "Zap",
]

export const ANIMATIONS = [
  { id: "confetti", label: "Confetti", description: "Chuva de papéis" },
  { id: "balloons", label: "Balões", description: "Balões subindo" },
  { id: "fireworks", label: "Fogos", description: "Fogos de artifício" },
  { id: "confetti_paper", label: "Papel Picado", description: "Chuva de papel picado" },
]
