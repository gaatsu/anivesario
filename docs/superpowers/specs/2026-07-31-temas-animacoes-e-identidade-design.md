# Temas por tipo de evento, animações em duas fases e identidade "Mensagens Corp."

Data: 2026-07-31
Branch: `claude/recados-mural-app-bn6pmk`
Spec anterior: `2026-07-31-auth-prisma-e-visibilidade-design.md`

## Contexto

O app subiu e funciona: auth própria, link de coleta separado do link de surpresa,
seed do master admin. Esta spec cobre a camada visual, que ficou para trás.

Três problemas concretos no estado atual:

1. **O campo `Event.type` existe mas está morto.** O `<select>` do dashboard tem
   uma única opção, "Aniversário". A separação por tipo de evento já está no banco
   e nunca foi usada.
2. **As quatro animações são todas de aniversário, escolhidas por checkbox manual**,
   sem relação com o tipo. E usam as bibliotecas de forma rasa: o confetti dispara
   sempre dos mesmos dois cantos, os balões são doze `div`s subindo em linha reta,
   e o "papel picado" é quase indistinguível do confetti.
3. **O nome "Aniversário" ficou incoerente** com os tipos de evento que o app
   passa a cobrir.

`POSTIT_ICONS` em `lib/utils.ts` é código morto — o `PostitForm` mantém a própria
lista — e contém `"Balloon"`, que não existe no lucide. Removido nesta spec, já
que o trabalho passa exatamente por ali.

## Decisões

- **Quatro tipos de evento:** aniversário, despedida, boas-vindas, conquista.
  Datas comemorativas ficam fora.
- **O tipo sugere, o admin ajusta.** Escolher o tipo pré-marca animações e tema,
  mas os controles continuam editáveis.
- **Tema do evento define a paleta; o autor define a variação.** Cada postit tira
  cor, inclinação e textura de um hash do nome de quem escreveu.
- **Animações em duas fases:** celebração forte na abertura, depois movimento
  ambiente contínuo e discreto enquanto a pessoa lê.
- **Identidade dividida:** moldura (admin, login) sóbria; mural e revelação
  festivos.
- **Repaginada é acabamento**, não redesign: escala tipográfica, espaçamento,
  padronização de botões/cards e estados de vazio.

## Fundamentação

Pontos que vieram de pesquisa e que sustentam escolhas específicas:

- **Animação de celebração é a exceção à regra de 200–500 ms** de motion em UI,
  mas precisa ser não-bloqueante e interrompível ([NN/G](https://www.nngroup.com/articles/animation-duration/)).
- **Movimento excessivo é acessibilidade, não gosto.** Animação contínua deve ser
  suprimida sob `prefers-reduced-motion`; o `canvas-confetti` tem
  `disableForReducedMotion` embutido.
- **Ease-out para entrada, arcos em vez de retas**, e a sequência
  burst → assentamento por gravidade → decaimento de opacidade
  ([Microsoft Learn](https://learn.microsoft.com/en-us/windows/apps/design/motion/timing-and-easing),
  [IxDF](https://ixdf.org/literature/article/ui-animation-how-to-apply-disney-s-12-principles-of-animation-to-ui-design)).
- **Para cor derivada de string, hashear apenas o matiz** e fixar saturação e
  luminosidade, garantindo consistência de paleta ([color-hash](https://github.com/zenozeng/color-hash)).
- **Passo de ângulo áureo (137,508°)** separa matizes melhor que módulo puro, que
  agrupa e colide para poucos itens.
- **OKLCH em vez de HSL.** Em HSL, amarelo e azul com o mesmo `L` têm luminosidade
  percebida muito diferente, então o contraste do texto do recado variaria por
  postit. Em OKLCH o `L` é perceptualmente uniforme: fixando-o, todo postit gerado
  tem o mesmo contraste real com o texto.

## Arquitetura

### 1. `lib/themes.ts` — fonte única

Um registry, sem estado, sem I/O. Todo o resto (dashboard, mural, revelação,
camada de animação) lê daqui. Adicionar um tipo novo é acrescentar um objeto.

Os identificadores ficam em inglês e **estáveis**, porque já há dado gravado: o
evento existente tem `type: "birthday"` e
`animations: {confetti, balloons, confetti_paper}`. Renomear os ids quebraria essa
linha. Rótulos em português vivem no registry, não nas chaves.

```ts
export type TipoEvento = "birthday" | "farewell" | "welcome" | "achievement"

export interface Tema {
  id: TipoEvento
  label: string            // "Despedida"
  descricao: string        // texto de apoio no formulário
  matizBase: number        // grau OKLCH de partida da paleta
  amplitudeMatiz: number   // quanto a paleta pode variar em torno da base
  acento: string           // cor sólida para títulos e destaques
  animacoesPadrao: string[]
  icones: string[]         // sugestões de ícone de postit
}
```

| `id` | Rótulo | Identidade | Animações padrão |
|---|---|---|---|
| `birthday` | Aniversário | quente — rosa/roxo/âmbar | `confetti`, `balloons` |
| `farewell` | Despedida | sóbrio — azul/índigo/teal | `petals` |
| `welcome` | Boas-vindas | fresco — verde/ciano/amarelo | `confetti_up`, `stars` |
| `achievement` | Conquista | premium — dourado/âmbar/roxo | `fireworks`, `stars` |

Não há migration: `Event.type` já é `String`, `Event.animations` já é `String[]`, e
os ids preservados mantêm o evento existente válido.

### 2. `lib/postit-visual.ts` — aparência procedural

Funções puras, testáveis com `node --test`, sem dependência de React.

```ts
hashNome(nome: string): number
corDoPostit(nome: string, tema: Tema): string      // string oklch(...)
inclinacaoDoPostit(nome: string): number           // -3 a +3 graus
texturaDoPostit(nome: string): "liso" | "listrado" | "pontilhado"
```

O matiz parte de `tema.matizBase`, deslocado pelo hash e caminhando em passos de
137,508°, limitado a `amplitudeMatiz`. Croma e luminosidade são constantes do
módulo — é isso que garante contraste uniforme.

Propriedades que os testes verificam: mesmo nome sempre gera o mesmo visual;
nomes diferentes raramente colidem; o matiz sempre cai dentro da faixa do tema;
a inclinação sempre fica no intervalo.

O seletor manual de cor continua no `PostitForm`. A cor procedural é o **padrão**,
não uma imposição: se o visitante escolher uma cor, ela vence.

### 3. Animações

Contrato único. Cada animação é um componente que recebe:

```ts
interface PropsAnimacao {
  fase: "celebracao" | "ambiente"
  cores: string[]
  intensidade: number   // 1 na celebração, ~0.1 no ambiente
}
```

**Fase celebração** (~2,5 s): burst com ease-out agressivo, arco, gravidade.
**Fase ambiente** (contínua): poucas partículas por vez, `ticks` longo, `gravity`
baixa, `drift` leve, `scalar` pequeno.

O `AnimationLayer` orquestra a transição e monta o canvas:

- Canvas dedicado via `confetti.create(canvas, { resize: true, useWorker: true })`.
  O worker tira a animação da thread principal — indispensável para algo que roda
  indefinidamente enquanto a pessoa rola os recados.
- O canvas do ambiente fica **atrás do conteúdo** (`z-index` abaixo dos postits,
  `opacity: 0.45`), então nunca cobre um recado.
- **Pausa por `visibilitychange`**: aba oculta congela o ambiente; ao voltar,
  retoma. Sem isso um celular animaria no bolso.
- **`prefers-reduced-motion` desliga as duas fases**, via
  `disableForReducedMotion` no canvas-confetti e `useReducedMotion()` do
  framer-motion nas animações em DOM.

Como cada animação interpreta as fases:

| `id` | Celebração | Ambiente |
|---|---|---|
| `confetti` | rajadas laterais alternadas, `scalar` e `decay` variados | poucas peças caindo devagar |
| `balloons` | cardume subindo em arco com oscilação lateral | um balão solitário de tempos em tempos |
| `fireworks` | volleys alternados preservando o centro da tela | um estouro discreto ocasional |
| `petals` | rajada densa com deriva | chuvisco esparso |
| `stars` | `shapes: ["star"]` em dourado, escalas variadas | brilho ocasional |
| `confetti_up` | disparo de baixo para cima | subida lenta esparsa |

O `confetti_paper` atual é absorvido por `petals`, que passa a ser o que ele
deveria ter sido: `flat: true`, `decay` alto, `ticks` longo e deriva lateral, ou
seja, queda lenta em vez de explosão — a reclamação de "confetti e papel picado
são a mesma coisa". Para não quebrar o evento já gravado, `confetti_paper` é
mantido como **alias** de `petals` na resolução, sem aparecer como opção nova no
formulário.

**Só na página de revelação.** O link de coleta permanece sem animação alguma,
preservando a separação construída na spec anterior.

### 4. Identidade "Mensagens Corp."

Renomeação mecânica: `metadata` em `app/layout.tsx`, cabeçalho da sidebar
(`🎉 Aniversário`), `<h1>` da home, título do README e campo `name` do
`package.json`. O nome do repositório e do diretório ficam como estão.

Moldura sóbria, mural festivo:

- **Sóbrio** (`/`, `/auth/*`, `/admin/*`): cinzas neutros com índigo de acento.
  O gradiente rosa/roxo dos botões primários vira índigo sólido.
- **Festivo** (`/eventos/[shareLink]/mural`, `/revelacao/[token]`): mantém
  gradientes e ganha o acento do tema do evento.

### 5. Acabamento

Escopo fechado, sem redesign de layout:

- Escala tipográfica única em `@theme` (`globals.css`), substituindo tamanhos
  escolhidos caso a caso.
- Espaçamento consistente entre seções de página.
- Botões primário/secundário/perigo padronizados num componente, hoje repetidos
  com classes ligeiramente diferentes em cada tela.
- Estados de vazio e carregando com o mesmo tratamento nas quatro telas que os têm.

## Fora de escopo

- Datas comemorativas como tipo de evento.
- Tema editável por evento (o tipo decide; sem tela de customização).
- Redesign de layout, home nova ou cabeçalho novo do admin.
- Trocar `canvas-confetti`/`framer-motion` por outra biblioteca: instalar pacote
  nesta máquina já falhou duas vezes por bloqueio de binário do EDR, e as libs
  atuais dão conta.

## Como validar

Local (o que o ambiente permite):

1. `node --test lib/postit-visual.test.ts` — determinismo, faixa de matiz,
   intervalo de inclinação.
2. `npx tsc --noEmit` sem erros além do client do Prisma ausente.
3. `npx eslint .` sem erros novos.

Em produção, após deploy:

4. Criar um evento de cada tipo e conferir que animações e acento mudam junto.
5. Abrir a revelação: burst na entrada, ambiente depois, nenhum recado coberto.
6. Trocar a aba e voltar: o ambiente pausa e retoma.
7. Ligar "reduzir movimento" no SO: nenhuma animação roda.
8. Vários recados com nomes diferentes: cores distintas, texto legível em todas.
