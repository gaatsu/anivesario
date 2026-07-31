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

## Entregues

Implementados no plano `docs/superpowers/plans/2026-07-31-abertura-nome-e-identidade.md`:
fundo de papel com grão, saudação vinda do tema com `title` virando o nome do
homenageado, edição de evento (`PATCH`), compartilhamento via Web Share API e
abertura com bolo — vela reescrita em três camadas.

Não conferidos rodando: nenhum deles. `prisma generate` continua bloqueado pelo
proxy, então a verificação foi `tsc --noEmit` + `node --test` + build da Vercel.

---

## Features

### Carrossel de fotos na revelação

Cards de foto espalhados, cada um com posição e rotação próprias. **Não é um
carrossel de slides** — é uma composição com quatro comportamentos: entrada
escalonada a partir do centro, flutuação contínua em loop, parallax seguindo o
mouse (cada card com sua profundidade) e inclinação 3D no hover.

Referência: `C:\anivesario\Carrossel Example\` (`.cards-row` / `.card`).

**Bloqueado por ação do usuário, não por código:** precisa de um store do Vercel
Blob criado no painel (o que provisiona o `BLOB_READ_WRITE_TOKEN`) e do pacote
`@vercel/blob` instalado — e `npm install` nesta máquina já falhou duas vezes por
bloqueio do EDR, com o agravante de o `postinstall` rodar `prisma generate`, que
o proxy responde com 403. Por isso ficou fora do plano de 31/07.

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

### Eventos já gravados com o título antigo

Os seis eventos no banco ("Alan", "Aniversário Anabelle", "Teste", "Teste 3",
"Teste", "Teste 2") foram criados quando `title` era texto livre. Agora que a
saudação vem do tema, "Aniversário Anabelle" abre como **"Feliz Aniversário,
Aniversário Anabelle"**. O botão de editar no dashboard já resolve — é só trocar
o campo para "Anabelle".

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
