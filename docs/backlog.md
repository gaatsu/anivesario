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

Depois disso, no mesmo dia: carrossel de fotos com Vercel Blob (upload com
compressão no navegador, limpeza dos blobs em toda rota que apaga evento) e os
nove templates de post-it de `C:nivesario\Templates` — fita ou percevejo,
canto recortado, Caveat/Kalam sorteadas por autor, e texto num tom escuro do
próprio matiz do papel.

Não conferidos rodando: nenhum deles. `prisma generate` continua bloqueado pelo
proxy, então a verificação foi `tsc --noEmit` + `node --test` + build da Vercel.

---

## Features

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
