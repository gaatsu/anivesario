# Abertura, nome do homenageado e identidade visual — Plano de implementação

> **Para agentes:** executar tarefa a tarefa, verificando cada uma antes de seguir.

**Objetivo:** dar ao app uma identidade visual de papel, transformar o título do
evento no nome do homenageado, abrir a revelação com uma cena animada de bolo, e
permitir compartilhar e corrigir eventos.

**Arquitetura:** tudo em CSS/SVG e componentes de cliente já existentes. Nenhuma
dependência nova, nenhuma migration. O campo `title` do banco passa a significar
"nome do homenageado" e a saudação passa a vir do tema — o que evita alterar o
schema num ambiente onde `prisma generate` é bloqueado pelo proxy corporativo.

**Stack:** Next.js 16 (App Router), Tailwind v4, framer-motion, canvas-confetti.

## Restrições globais

- **Nenhum pacote npm novo.** `npm install` já falhou duas vezes nesta máquina por
  bloqueio de binário do EDR, e `prisma generate` (rodado no `postinstall`) toma
  403 do proxy. Qualquer feature que exija dependência nova está fora deste plano.
- **Nenhuma migration.** Sem `prisma generate` local não há como validar o client.
- **Sem execução local.** Verificação é `npx tsc --noEmit` + `node --test` + build
  na Vercel.
- Textos de UI em português; identificadores de dados (ids de tema, de animação)
  permanecem em inglês porque já existem gravados no banco.
- `prefers-reduced-motion` precisa ser respeitado por **toda** animação nova. SMIL
  e CSS não respeitam sozinhos — tratar à mão.

---

### Task 1: Fundo de papel com grão

**Arquivos:**
- Modificar: `app/globals.css`
- Modificar: `app/layout.tsx:32`

**Produz:** as classes `.fundo-papel` e `.grao`, e os tokens `--color-papel-*`.

- [ ] **Passo 1:** em `app/globals.css`, adicionar ao `@theme` os tons de papel
  (`#f8f3e7`, `#f2ead6`, `#e9dec3`) e a cor de tinta (`#3b3129`).
- [ ] **Passo 2:** criar `@layer utilities` com `.fundo-papel` (radial-gradient dos
  três tons) e `.grao` (pseudo-elemento `::after` fixo, `feTurbulence` como
  data-URI, `opacity: .05`, `mix-blend-mode: multiply`, `pointer-events: none`).
  Precisa estar em `@layer utilities` — CSS sem layer venceria as utilities do
  Tailwind, que foi a causa do bug de fonte anterior.
- [ ] **Passo 3:** trocar `bg-gradient-to-br from-slate-50 to-slate-100` no `<body>`
  por `fundo-papel grao`.
- [ ] **Passo 4:** `npx tsc --noEmit` e commit.

---

### Task 2: Saudação no tema e nome do homenageado

**Arquivos:**
- Modificar: `lib/themes.ts`, `lib/themes.test.ts`
- Modificar: `app/admin/dashboard/page.tsx` (rótulo e placeholder do campo)
- Modificar: `app/revelacao/[token]/page.tsx`, `app/eventos/[shareLink]/mural/page.tsx`

**Consome:** `resolverTema` (Task 0, já existe).
**Produz:** `Tema.saudacao: string`, `Tema.convite: string`.

- [ ] **Passo 1:** escrever o teste falho em `lib/themes.test.ts`: todo tema tem
  `saudacao` e `convite` não vazios; `resolverTema("birthday").saudacao ===
  "Feliz Aniversário"`.
- [ ] **Passo 2:** rodar `node --test` e ver falhar.
- [ ] **Passo 3:** adicionar os campos aos quatro temas.
  `birthday` → "Feliz Aniversário" / "Deixe um recado de aniversário para";
  `farewell` → "Boa sorte" / "Deixe uma mensagem de despedida para";
  `welcome` → "Bem-vindo(a)" / "Dê as boas-vindas a";
  `achievement` → "Parabéns" / "Parabenize".
- [ ] **Passo 4:** rodar `node --test` e ver passar.
- [ ] **Passo 5:** no dashboard, rótulo "Título" → "Nome do homenageado",
  placeholder `"Ex: Aniversário da Maria"` → `"Ex: Maria"`, com texto de apoio
  explicando que a saudação é automática. O placeholder atual induz o formato
  errado: com ele a abertura diria "Feliz Aniversário, Aniversário da Maria".
- [ ] **Passo 6:** nas duas páginas de mural, compor `saudacao` + `title` no `<h1>`
  em vez de exibir `title` cru. No mural de coleta usar `convite` (o público ali
  são os colegas, não o homenageado).
- [ ] **Passo 7:** `npx tsc --noEmit` e commit.

---

### Task 3: Editar evento

**Arquivos:**
- Modificar: `app/api/eventos/[id]/route.ts` (adicionar `PATCH`)
- Modificar: `app/admin/dashboard/page.tsx` (formulário reaproveitado para edição)

**Consome:** `getCurrentUser`, `db`.
**Produz:** `PATCH /api/eventos/:id` aceitando `{ title?, description?, eventDate?, type?, animations? }`.

Sem isto, um nome digitado errado só se conserta apagando o evento — e os recados
que os colegas já deixaram vão junto. Fica mais provável agora que o campo é um
nome de pessoa.

- [ ] **Passo 1:** adicionar `PATCH` verificando dono (`creatorId: user.id`) e
  `deletedAt: null`, montando o `data` só com os campos presentes no corpo.
  Rejeitar `title` vazio com 400. Não expor `shareLink`/`revealLink` a alteração.
- [ ] **Passo 2:** no dashboard, extrair o formulário para aceitar um evento
  existente; `handleSubmit` escolhe `POST` ou `PATCH` conforme `editandoId`.
- [ ] **Passo 3:** botão de lápis no card, ao lado do de lixeira.
- [ ] **Passo 4:** `npx tsc --noEmit` e commit.

---

### Task 4: Compartilhar (Web Share API)

**Arquivos:**
- Criar: `components/ui/BotaoCompartilhar.tsx`
- Modificar: `app/admin/dashboard/page.tsx`

**Produz:** `<BotaoCompartilhar url texto rotulo variante />`.

- [ ] **Passo 1:** criar o componente com a cadeia de fallback:
  `navigator.share({ title, text, url })` → `https://wa.me/?text=` → `clipboard`.
  Capturar `AbortError` (usuário fechou a folha) sem cair no fallback — senão
  cancelar o compartilhamento abriria o WhatsApp Web, que é o oposto do pedido.
  Detectar suporte em `useEffect`, nunca no render, para não quebrar a hidratação.
- [ ] **Passo 2:** dois botões no card, com textos distintos. O da coleta:
  "Deixe um recado para {nome}". O da surpresa: "{nome}, tem uma surpresa para
  você". São públicos opostos — mandar o link da surpresa no grupo dos colegas
  estraga tudo, então o texto precisa deixar óbvio qual está indo.
- [ ] **Passo 3:** `npx tsc --noEmit` e commit.

---

### Task 5: Abertura com bolo

**Arquivos:**
- Criar: `components/Abertura/Abertura.tsx`, `components/Abertura/Bolo.tsx`
- Modificar: `app/revelacao/[token]/page.tsx`, `app/globals.css`

**Consome:** `Tema.saudacao`, `Tema.acento`, `event.title`.
**Produz:** `<Abertura tema nome aoTerminar />`.

- [ ] **Passo 1:** `Bolo.tsx` — SVG puro do bolo (pratos, camadas, cobertura,
  vela, chama). A vela reescrita em relação à referência: gota em vez de círculo
  (`border-radius: 50% 50% 20% 20% / 60% 60% 40% 40%`), três camadas defasadas por
  `animation-delay` (externa laranja difusa, média amarela, núcleo branco-azulado),
  oscilação lateral com `translateX` + `scaleY`, pavio escuro no topo, e halo
  pulsante sob a chama. O original empilha 5 círculos idênticos na mesma posição
  que somem em `scale(0)` — lê como um blob pulsando, não como fogo.
- [ ] **Passo 2:** `Abertura.tsx` — framer-motion, saudação e nome entrando
  escalonados, bolo ao centro, ~3,2s, `onAnimationComplete` chamando `aoTerminar`.
  Botão "pular" sempre visível. Sob `useReducedMotion()`, renderizar a cena
  **estática** e chamar `aoTerminar` em 900ms — a preferência é sobre movimento,
  não sobre conteúdo, e o iOS liga essa flag sozinho em Modo de Baixo Consumo.
- [ ] **Passo 3:** na revelação, estado `abertura` controlado por `sessionStorage`
  (chave por token) para tocar só na primeira visita; ao terminar, fade para o
  mural e só então `setShowAnimations(true)`.
- [ ] **Passo 4:** keyframes da chama em `@layer utilities` no `globals.css`.
- [ ] **Passo 5:** `npx tsc --noEmit`, `node --test`, commit.

---

## Fora deste plano

- **Carrossel de fotos** — depende de um store do Vercel Blob e do
  `BLOB_READ_WRITE_TOKEN`, que só o dono da conta cria, e do pacote `@vercel/blob`.
  Bloqueado por ação do usuário, não por trabalho de código.
- Formatos de postit, fontes de caligrafia, revelação em cascata, intensidade
  escalonada, haptics — permanecem no backlog.
