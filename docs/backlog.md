# Backlog — Mensagens Corp.

Ideias e pendências ainda não planejadas. Cada item tem contexto suficiente para
virar spec sem refazer a investigação. Última atualização: 2026-07-31.

---

## Bloqueadores

### Proteção de deploy da Vercel

**Estado:** aberto, depende de acesso ao painel.

Enquanto a autenticação da Vercel estiver na frente, **ninguém sem conta na
Vercel abre nem o link de coleta nem o da surpresa** — o app inteiro depende de
links públicos para gente sem login.

Este branch (`claude/recados-mural-app-bn6pmk`) é o branch default do repositório,
então os deploys dele são de produção, não preview. Duas causas possíveis:

1. Estar abrindo a URL única do deployment (`projeto-hash-user.vercel.app`) em vez
   da URL estável do projeto. As de deployment são protegidas.
2. Deployment Protection ligada para tudo: Settings → Deployment Protection →
   Vercel Authentication → **Disabled** (liberado no plano Hobby).

---

## Features

### 1. Formatos de postit (maior impacto visual)

Hoje há três texturas procedurais (`liso`, `listrado`, `pontilhado`) em
`lib/postit-visual.ts`, todas sutis demais para se notar. Trocar por **formatos**,
sorteados pelo mesmo hash do nome do autor:

- **Fita adesiva** no topo — semitransparente, borda pontilhada nas pontas para
  parecer cortada
- **Canto dobrado** — [técnica em CSS puro do Nicolas Gallagher](https://nicolasgallagher.com/pure-css-folded-corner-effect/),
  sem imagem nem markup extra
- **Percevejo** — gradientes radiais
- **Papel pautado / quadriculado** — gradientes empilhados
- **Polaroid** — borda inferior grossa, leve rotação, sombra suave
- **Borda rasgada**

Tudo em CSS, sem imagem e sem requisição. Referências:
[20+ CSS paper effects](https://freefrontend.com/css-paper-effects/),
[3 experiments with CSS paper effects](https://dev.to/s_aitchison/3-experiments-with-css-paper-effects-2o56),
[washi tape notes](http://www.codeitpretty.com/2013/10/washi-tape-notes-with-html-css.html).

**A decidir:** os formatos são sorteados por autor (como cor e inclinação) ou
definidos pelo tema do evento?

### 2. Fontes de caligrafia nos recados

Sortear entre 2–3 fontes manuscritas **pelo hash do nome do autor**, para que cada
recado pareça escrito por uma pessoa diferente — que é literalmente o caso. A
moldura (admin, botões) continua no Geist.

| Fonte | Força |
|---|---|
| **Caveat** | Referência para sticky notes. Tem alternativas contextuais: duas letras iguais seguidas são desenhadas diferente, o que evita o efeito "fonte" |
| **Patrick Hand** | A mais legível em tamanho pequeno; letras separadas |
| **Kalam** | Meio-termo, traço de esferográfica |

Todas no Google Fonts, compatíveis com `next/font`. Referências:
[handwriting Google Fonts](https://www.notebookandpenguin.com/handwriting-google-fonts/),
[free handwriting/script fonts 2026](https://fontalternatives.com/blog/best-free-handwriting-script-fonts-2026/).

**Atenção:** cada fonte extra pesa no bundle e no tempo de build. Avaliar se 3
fontes se justificam ou se 2 bastam.

### 3. Revelação em cascata

Hoje, ao abrir o link da surpresa, os postits **já estão lá** e a animação é a
única coisa que acontece. Fazê-los aparecer **um a um**, em sequência, transforma
a abertura num momento.

Referência: o Duolingo faz os cards de estatística subirem em sequência escalonada
em vez de todos de uma vez ([Duolingo streak animation](https://blog.duolingo.com/streak-milestone-design-animation/)).

**Cuidado:** com 30 recados, uma cascata lenta vira espera. Precisa de teto de
duração total.

### 4. Intensidade escalonada por volume de recados

A recomendação corrente é intensidade em camadas — conquistas pequenas merecem
aceno discreto, grandes merecem festa. Hoje a intensidade da celebração é fixa.

**Um mural com 30 recados deveria estourar mais que um com 2.** Barato de fazer e
dá significado à animação.

### 5. Vibração no celular (haptics)

`navigator.vibrate()` na abertura da revelação, como complemento — e como
alternativa para quem está com movimento reduzido, já que haptics podem substituir
feedback visual.

### 6. Fallback estático sob `prefers-reduced-motion`

**Motivado por problema real.** Hoje suprimimos 100% das animações sob
`prefers-reduced-motion`, e isso mordeu duas vezes durante os testes: o Windows do
Alan estava com efeitos desligados, e o **iOS liga essa flag automaticamente em
Modo de Baixo Consumo**.

Resultado: alguém abre o link da surpresa com o celular em economia de bateria e
recebe uma página morta — o oposto do objetivo.

Proposta: em vez de nada, mostrar uma versão **estática** — cabeçalho decorativo
com as cores do tema, sem movimento algum. A preferência é sobre *movimento*, não
sobre *cor*.

---

## Ajustes pendentes de validação visual

Nada disso foi visto rodando por quem escreveu — o `prisma generate` é bloqueado
pelo proxy corporativo, então não há como rodar o app localmente. São constantes,
não arquitetura:

| O quê | Onde | Suspeita |
|---|---|---|
| Duração da celebração (2500ms) | `components/Animations/tipos.ts` | Pode ser curta demais |
| Intensidade do ambiente (0.1) | `components/Animations/AnimationLayer.tsx` | |
| Opacidade do canvas (80% / 30%) | `components/Animations/AnimationLayer.tsx` | Recém-alterada, não validada |
| Duração dos balões (7–12s) | `components/Animations/BalloonsAnimation.tsx` | **Provavelmente lenta demais** — o confetti dura 3s, e balões podem passar despercebidos |

### Pendências de verificação

- **Balões subindo:** corrigidos em `77c9ba5` (eram destruídos aos 2,5s ao trocar
  de fase) e trazidos para frente do conteúdo. **Não confirmado pelo usuário.**
- **Animações no celular:** hipótese é que o canvas a `-z-10` ficava atrás do card,
  que no celular ocupa a largura toda. Corrigido em `c27892a` trazendo o canvas
  para `z-20`. **Não confirmado.**

---

## Fora de escopo (decidido)

- Datas comemorativas (Natal, festa junina) como tipo de evento
- Tema editável por evento — o tipo decide, sem tela de customização
- Trocar `canvas-confetti`/`framer-motion` por outra biblioteca: instalar pacote
  nesta máquina falhou duas vezes por bloqueio de binário do EDR
- Recuperação de senha por email
