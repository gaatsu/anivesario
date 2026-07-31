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

### Fundo com textura de papel

**Independente de tudo o mais e barato.** Hoje o fundo é `slate-50`/`slate-100`,
frio e sem textura, o que destoa de um app sobre murais de recado.

Referência: `C:\anivesario\Carrossel Example\main.css`. Duas camadas:

1. Radial gradient cor de papel — `#f8f3e7` → `#f2ead6` → `#e9dec3`
2. **Camada de grão**: ruído SVG via `feTurbulence`, `opacity: 0.06`,
   `mix-blend-mode: multiply`, como data-URI inline — sem requisição, sem imagem

O grão funciona por cima de qualquer paleta, então cada tema de evento pode ter o
próprio fundo e o grão unifica visualmente.

**A decidir:** o fundo de papel vale para a moldura sóbria (admin/login) também,
ou só para as telas de mural?

### Abertura com bolo antes da revelação

Uma tela de abertura antes do mural: saudação + nome do homenageado, com uma peça
animada ao centro, e fade para os postits, o carrossel e os efeitos.

Referência: `C:\anivesario\Bolo\` — bolo em **SVG puro com animação SMIL** (tags
`<animate>` encadeadas por `begin="id.end"`, desenhando o bolo camada por camada),
vela em CSS entrando aos 6s e chamas aos 6,5s. Zero JavaScript.

**Decidido:**
- **Estrutura comum, centro por tema.** Um componente de abertura com saudação +
  nome, e no centro uma peça por tema. Começa com o bolo no aniversário; os outros
  três mostram só a tipografia com a cor do tema até ganharem peça própria.
- **Só na primeira visita** (`sessionStorage`). Quem recarregar cai direto no
  mural — a surpresa acontece uma vez.
- **Encurtar para ~4s.** O original leva ~7s antes de mostrar qualquer coisa, o
  que é muito para uma porta de entrada. O confetti começa junto do fade.

**Bloqueia esta feature:**
- **Falta o campo `honoreeName` no `Event`.** Hoje só existe `title`, que é texto
  livre — os eventos atuais são "Alan" e "Aniversário Anabelle". Deduzir o nome do
  título quebra na primeira vez que alguém escrever diferente. Precisa de campo
  novo no schema e no formulário. **É migration**, ao contrário das outras
  features do backlog.

**Cuidados:**
- **SMIL não respeita `prefers-reduced-motion`**, diferente do `canvas-confetti`.
  Tratar à mão, ou a abertura vira uma tela travada de 4s para quem pediu menos
  movimento.
- Precisa ser pulável mesmo aparecendo uma vez só.

#### Melhorar a vela

O autor do exemplo registrou no `main.js` que não ficou satisfeito com a vela, e
com razão. Hoje as 5 chamas (`.fuego`) estão **na mesma posição**, são círculos
perfeitos (`border-radius: 100%`) e diferem só na duração; cada uma vai a
`scale(0)` no meio do ciclo, sumindo por completo. O resultado é um blob pulsando.

Melhorias, todas em CSS puro:

- **Forma de gota** em vez de círculo: `border-radius: 50% 50% 20% 20% / 60% 60% 40% 40%`
- **Três camadas sobrepostas** — externa laranja difusa, média amarela, núcleo
  branco-azulado — em vez de 5 círculos idênticos
- **Oscilação lateral + alongamento** (`translateX` mínimo e `scaleY`): chama de
  verdade balança, a atual só pulsa na vertical
- **Defasagem por `animation-delay`**, não por durações radicalmente diferentes,
  para as camadas lerem como uma chama só
- **Pavio** — retângulo escuro no topo da vela, hoje inexistente
- **Brilho pulsante no bolo** — `radial-gradient` sob a chama, simulando a luz
  lançada

### Carrossel de fotos na revelação

Cards de foto espalhados, cada um com posição e rotação próprias. **Não é um
carrossel de slides** — é uma composição com quatro comportamentos: entrada
escalonada a partir do centro, flutuação contínua em loop, parallax seguindo o
mouse (cada card com sua profundidade) e inclinação 3D no hover.

Referência: `C:\anivesario\Carrossel Example\` (`.cards-row` / `.card`).

**Decidido:**
- Armazenamento: **Vercel Blob** (1GB no free). Upload no formulário de criação de
  evento, com preview antes de salvar.
- Aparece **só na revelação** — as fotos são parte da surpresa.
- Reimplementar em **framer-motion**, não GSAP: o exemplo usa GSAP + ScrollTrigger
  via CDN, e o framer-motion (já instalado) faz tudo isso. Evita dependência nova
  num ambiente onde `npm install` já quebrou duas vezes pelo EDR.

**Em aberto:**
- **Quantas fotos no máximo?** O exemplo tem 8 cards com posições fixas no CSS.
  Com quantidade variável, as posições precisam ser calculadas — ou fixamos um
  teto e um layout por quantidade.
- **Limite de tamanho e compressão** antes do upload.
- **Parallax não existe no celular.** Fallback: só a flutuação contínua, ou
  giroscópio?
- **Limpeza dos blobs.** Eventos se apagam em 12h; as imagens precisam ser
  apagadas junto, no `deleteEventIfExpired` e no cron, senão vaza storage. É o
  ponto mais fácil de esquecer.

### Formatos de postit (maior impacto visual)

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

### Fontes de caligrafia nos recados

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

### Revelação em cascata

Hoje, ao abrir o link da surpresa, os postits **já estão lá** e a animação é a
única coisa que acontece. Fazê-los aparecer **um a um**, em sequência, transforma
a abertura num momento.

Referência: o Duolingo faz os cards de estatística subirem em sequência escalonada
em vez de todos de uma vez ([Duolingo streak animation](https://blog.duolingo.com/streak-milestone-design-animation/)).

**Cuidado:** com 30 recados, uma cascata lenta vira espera. Precisa de teto de
duração total.

### Intensidade escalonada por volume de recados

A recomendação corrente é intensidade em camadas — conquistas pequenas merecem
aceno discreto, grandes merecem festa. Hoje a intensidade da celebração é fixa.

**Um mural com 30 recados deveria estourar mais que um com 2.** Barato de fazer e
dá significado à animação.

### Vibração no celular (haptics)

`navigator.vibrate()` na abertura da revelação, como complemento — e como
alternativa para quem está com movimento reduzido, já que haptics podem substituir
feedback visual.

### Fallback estático sob `prefers-reduced-motion`

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
