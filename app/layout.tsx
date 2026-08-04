import type { Metadata, Viewport } from "next";
import { Caveat, Geist, Geist_Mono, Kalam } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Duas letras manuscritas, sorteadas por autor: cada recado parece escrito por
// uma pessoa diferente, que é literalmente o caso. Só os recados usam estas — a
// moldura do app (admin, botões) segue no Geist.
//
// Um peso de cada. Cada peso extra é mais um arquivo baixado por quem abre o
// mural, e a diferença entre 600 e 700 numa caligrafia é imperceptível.
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: "600",
});

const kalam = Kalam({
  variable: "--font-kalam",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Mensagens Corp.",
  description:
    "Murais de recados para aniversários, despedidas, boas-vindas e conquistas do time",
  icons: { icon: "💬" },
};

// A barra do navegador no celular assume a cor do papel, para o app não ter
// uma faixa branca ou preta destoando no topo.
export const viewport: Viewport = {
  themeColor: "#f2ead6",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} ${caveat.variable} ${kalam.variable} h-full antialiased`}
    >
      <body className="fundo-papel grao min-h-full flex flex-col text-tinta">
        {children}
      </body>
    </html>
  );
}
