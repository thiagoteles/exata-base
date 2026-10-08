# BASE.md

Memória de trabalho do `exata-base`: de onde ele veio, o que foi decidido, como está montado, como se prova que funciona e o que falta. Escrito em português porque é documento de quem mantém a base, não do produto.

> **Este arquivo viaja de propósito, e é a única exceção da higiene.** O repositório público é a base, e o `create-next-app --example` copia tudo, inclusive este arquivo, que cita os produtos de origem e a história da construção. Isso é aceito. Por isso o `AGENTS.md` manda o agente apagar o `BASE.md` na primeira tarefa de qualquer produto criado a partir da base (veja a seção 9). Na base em si, ele fica. Nada mais fora deste arquivo pode citar a origem: a conferência da seção 9 exclui só ele.

## 1. Origem

O `exata-base` nasceu em 2026-10-07 de uma leitura de cinco projetos do mesmo autor, comparados com o que o `exata-ui` (biblioteca de UI compartilhada) exportava. A pergunta era: o que o próximo produto precisa ter para nascer rápido e com cara própria.

| Projeto | Runtime | Papel na origem |
|---|---|---|
| lottery | Next 16, Clerk, Firestore | Fonte do `exata-ui`. Firestore custou caro e não volta. Ainda cobra por Mercado Pago e migra para Stripe depois |
| brb | Next 16, Clerk, Postgres | Usa o `exata-ui`. Dossiê, LGPD, extrato, pagamento |
| solmiza | Next 16, Clerk, Postgres, Stripe | Não usa o `exata-ui`. Modelo de cobrança (sem o domínio das lições), i18n com `next-intl`, paleta gerada de uma fonte só |
| acolhimento | Next 16, better-auth, Postgres | Não usa o `exata-ui`. Molde das portas, das cascas, de lista, ficha e assistente, testcontainers e axe |
| brazil | Vite, Preact, Pixi | Fora. Jogo, não produto web |

O que esses projetos repetiam e o `exata-ui` não entregava: Next 16 completo (erro, not-found, proxy, sitemap, Open Graph), Docker e Coolify, Postgres com Drizzle, entrar e sessão e convite, conta (exportar, apagar, auditoria), e-mail transacional, três cascas, lista com filtro na URL, ficha, assistente, testes, privacidade e termos. A cara dos produtos divergiu de propósito (solmiza, acolhimento, lottery); colar a pele de um deles produz um clone. Por isso a base tem um sistema visual próprio, determinístico, em que o produto só troca as cores.

O `exata-ui` não foi tocado. Lottery e brb continuam nele.

## 2. Decisões que valem

- **Forma.** Um example público e completo do `create-next-app`: `pnpm create next-app meu-produto --example "https://github.com/thiagoteles/exata-base"`, depois `docker compose up`. Não é biblioteca nem CLI. O produto possui o código desde o primeiro commit.
- **Postgres sempre, Drizzle.** Firebase nunca mais. Em produção o app lê `DATABASE_URL`; o banco é um recurso Postgres do Coolify com backup agendado do Coolify. Não há script de backup.
- **Docker zero config.** `docker compose up` sobe app, Postgres e Mailpit sem `.env`. A imagem de produção constrói sem segredo nem argumento.
- **Dois modos de auth por uma flag** (`AUTH_PROVIDER`): `local` (better-auth, Google opcional) e `clerk` (padrão em produção). Páginas, ações e rotas só veem a porta de auth.
- **Stripe, só Stripe,** implementado e desligado sem chave. Mercado Pago não entra.
- **GCP para arquivo e log** (Cloud Storage privado com URL assinada, Cloud Logging), sem S3. Sem chave: disco e stdout. Erro de produção é log com alarme; Sentry não entra.
- **E-mail sai na hora,** sem fila nem nova tentativa. Produção: Email API do Mailtrap. Local: Mailpit.
- **Agendamento é um endpoint só, `/events`,** chamado uma vez por dia pelo Coolify com `CRON_SECRET`. Sem fila, worker ou cron no container.
- **Tudo que viaja é em inglês** (código, comentário, tabela, coluna, valor guardado, rota, env, README, AGENTS, DESIGN, skills). Só `messages/pt-BR.json` é em português, e é o único idioma. Valores do banco ficam em inglês e o catálogo os traduz (`member` aparece como "Membro").
- **pnpm é o único gerenciador. Node 24.** Dependências em versão exata, com `minimumReleaseAge` de uma semana (o `next` é a exceção).
- **Qualidade estrita desde a linha 1:** TypeScript estrito, Biome preset `all` com `--error-on-warnings` e fronteiras de import, knip para código morto, React Compiler, lefthook rodando `pnpm check` em todo commit. Sem ESLint.
- **Interação é Radix,** importado só em `components/ui`. O visual vem do `DESIGN.md`.
- **Commits direto na `main`,** pequenos, em inglês (`feat:`, `chore:`, `docs:`).

## 3. Como está montado

Next 16.4 com `cacheComponents` e `partialPrefetching` (a casca é estática e o que depende do pedido chega por streaming), `typedRoutes`, saída standalone, `proxy.ts`. `getCurrentUser` usa `'use cache: private'`. O Next 16 guarda a página anterior, escondida, no DOM.

O mapa de pastas e as regras que não dobram estão no `AGENTS.md`. Em resumo:

- `app/` só rotas; `features/<area>` telas e ações (uma feature nunca importa outra); `lib/<area>` as regras, contra o banco, com teste de integração; `lib/ports/<porta>/adapters` é o único lugar de SDK (`auth`, `email`, `storage`, `log`, `cep`, `payment`); `components/ui` primitivos e Radix; `components/patterns` e `components/shell`.
- Tabela e coluna em `snake_case`, expostas em `camelCase` pelo Drizzle. `ownedBy()` apaga junto com a conta; `authoredBy()` mantém a linha e uma coluna com o e-mail do autor. Toda tabela que aponta para o usuário declara qual dos dois.
- Papéis `member`, `staff`, `admin`. Página usa `requirePageRole`, ação usa `actionFor(papel)` (next-safe-action, erro sempre no formato `DomainError` com id do pedido), rota usa `requireRole`. Leitura que depende de quem olha recebe o espectador por argumento.
- Texto é chave do `messages/pt-BR.json` (o arquivo é o tipo do catálogo). Sem travessão em texto de interface. `noJsxLiterals` do Biome fica ligado.
- Cores são tokens: `colors.json` tem as duas seeds, `pnpm tokens` regenera paleta, CSS, e-mail e as tabelas do `DESIGN.md`. `scripts/check-design-tokens.ts` recusa classe padrão do Tailwind e cor escrita à mão. Fonte Onest e JetBrains Mono.
- Dinheiro em centavos inteiros, instante em `timestamptz` no fuso `America/Sao_Paulo`, data `dd/mm/aaaa`. Código que lê o relógio recebe o relógio por parâmetro, e a página chama `connection()` antes de lê-lo, senão o Next recusa pré-renderizar.
- Variáveis de ambiente só em `lib/env.ts` (padrão local, grupos que vão juntos, o que derruba o boot de produção). Não há `NEXT_PUBLIC_`.
- Migration roda na subida do servidor (`lib/server-startup.ts`), com advisory lock. A seed (admin `admin@app.local`, senha `admin-local`) só roda fora de produção. Em produção o primeiro admin se cadastra com e-mail de `ADMIN_EMAILS`.

### 3.1 Idiomas

Opt-in por três passos (README): `messages/<locale>.json`, a lista em `lib/i18n/locales.ts` e `export const instant = false;` no `app/layout.tsx`. Com um idioma só, nada disso lê o pedido e a casca continua estática. O que existe: `lib/i18n/negotiate.ts` (prefixo, cookie `NEXT_LOCALE`, `Accept-Language`, padrão; funções puras, testadas), `lib/i18n/proxy.ts` e `proxy.ts` (reescrevem `/en/x` para `/x`, mandam o idioma no cabeçalho `x-app-locale` e redirecionam o endereço limpo quando a escolha não é o padrão), `lib/i18n/request.ts` (lê o cabeçalho e importa o catálogo), `features/language` (ação que grava cookie e `options.locale`, seletor no rodapé e na conta), cópia do idioma salvo para o cookie no login (`/auth/complete`), `scripts/check-catalogs.ts` no `pnpm check` (compara chaves e argumentos ICU e a consistência do layout). A razão do `instant = false`: o Next exige um literal no export, e ler o cabeçalho no layout raiz sem ele quebra o build ("blocking-prerender-dynamic"). A alternativa seria mover tudo para `app/[locale]`, o que custa o `typedRoutes` sem prefixo. A prova foi feita numa cópia com `en-US.json` gerado (cada texto com prefixo "EN "), 73 testes do Playwright, incluindo `e2e/language.spec.ts`, que pula sozinho quando o produto tem um idioma.

### 3.2 Configuração do produto novo

`pnpm setup:product` (`scripts/setup-product.mts`, lógica em `scripts/setup-product/apply.ts`, testada) pergunta nome, descrição, público, tom, superfícies e a cor da marca, e escreve em `messages/pt-BR.json` (`site.name`, `site.description`), `package.json` (nome em slug e descrição), `README.md` (título e primeiro parágrafo), `DESIGN.md` (frontmatter, título, bloco Produto, linha do Decisions Log) e `colors.json`; depois roda `pnpm tokens`, formata os arquivos e roda `pnpm check` (`--no-check` pula). Idempotente: acha as linhas pela estrutura, não pelo texto "TO FILL IN", então dá para rodar de novo para corrigir. Com `--yes` e flags não pergunta nada e recusa o que faltar; sem terminal, também não pergunta. Rejeita travessão, campos vazios e semente de cor inválida (matiz a menos de 25 graus do verde). O nome e a descrição de exemplo do catálogo contam como não respondidos. Se um novo trecho do repositório passar a carregar o nome do produto, ensine o script a escrevê-lo (e a `apply.test.ts` a conferir).

### O que existe

Contas (cadastro, confirmação, recuperação, convite, exportar em ZIP, apagar com trilha), contato (formulário público, caixa da equipe, resposta por e-mail, mensagens do membro), cobrança Stripe (`/plans`, `/account/plan` com a data de renovação ou do fim do acesso vinda da fatura paga em `plans.current_period_end`, portal, cancelar no fim do período, vitalício sobre assinatura, reembolso, cortesia, inadimplente mantém acesso), admin (usuários, convites, auditoria), `/events` com a limpeza de convites, `/catalog` (vitrine, assistente de três passos, upload), erro do navegador em `/api/client-errors`, alarme do GCP em `ops/gcp` e `pnpm gcp:alerts`, compose de produção, workflow de CI desligado, `.mcp.json`.

Skills em `.claude/skills`: `new-table`, `new-list-and-record`, `new-action`, `new-text-key`, `new-email`, `new-daily-operation`, `new-payment-event`. A referência viva de cada uma é o módulo que ela aponta (contato, convites, Stripe).

## 4. Como se prova

- `pnpm check`: tipos (`next typegen` incluso), Biome, tokens, migrations, knip, testes de unidade. Não use só `tsc --noEmit`: ele perde o `next typegen`.
- `pnpm test:integration`: regras contra Postgres real (testcontainers). Webhooks do Stripe com eventos assinados à mão (HMAC igual ao do Stripe) lidos pelo adaptador real.
- `pnpm test:e2e`: Playwright contra o compose já de pé, com axe (WCAG 2.0/2.1/2.2 A e AA) nos dois temas. `pnpm test:clerk`: modo Clerk, com chaves de desenvolvimento (a suíte pula sem elas).
- **Receita de prova em cópia limpa** (usada em cada fase): copiar o repo para uma pasta temporária com `git archive HEAD | tar -x -C pasta` (ou `git ls-files -co --exclude-standard`), `docker compose -p <nome> up -d` nela, esperar `/health`, rodar o Playwright do repo, depois `docker compose -p <nome> down -v` e apagar a pasta pelo caminho literal.
- **Máquina carregada:** com outro projeto pesando a máquina, a suíte com 6 processos travou no navegador mesmo com o servidor respondendo ao `curl`. O `playwright.config.ts` já fixa `workers: 2`. Servidor de desenvolvimento do compose degrada depois de muitas execuções: reinicie o container do app.

## 5. Armadilhas já pagas

- Um Server Component não cria `onClick`: o `Button` é `"use client"`. Só o compose mostrou, os testes de unidade não.
- O proxy trunca corpo acima de 10 MB: `experimental.proxyClientMaxBodySize` e rejeição antecipada pelo `Content-Length`.
- `typedRoutes` não aceita rota `[[...rest]]`: o Clerk usa `routing="hash"`.
- `react-hook-form` só avisa o componente que leu o estado: campo filho usa `useFormState` (`FormTextField`).
- Streaming faz página "não encontrada" responder 200. Os testes conferem o conteúdo, não o status.
- Duplicata transitória no DOM durante streaming: testes esperam `toHaveCount(1)` ou filtram visível. `networkidle` antes de clicar (clique antes da hidratação se perde). `browser.newContext` herda o `storageState` do projeto: passe um vazio de forma explícita. O banco do compose sobrevive entre execuções: use nomes únicos.
- `new Date()` e `Math.random()` durante a pré-renderização são recusados pelo Next 16: `connection()` antes, relógio por parâmetro.
- `next-intl` trata `.` em chave como aninhamento: nome de ação do log vira `user_role_change` na busca do texto.
- A imagem `node:24-alpine` traz o `wget` do BusyBox, sem `--method`. A chamada diária é `wget -qO- --header="Authorization: Bearer $CRON_SECRET" --post-data='' http://127.0.0.1:3000/events`.
- Log pino: um campo `message` no objeto colide com o `message` da linha. O relatório do navegador sai como `errorMessage`.
- A busca ignora acento e caixa: `contains()` em `lib/db/search.ts` usa a extensão `unaccent`, criada por migration. Toda busca nova com `ILIKE` deve usar essa função.
- Hook de commit precisa de Node 24 no shell (`nvm use 24`), senão o `pnpm` recusa o engine.

## 6. Estado

As fases 0 a 12 do plano foram feitas e provadas (cada uma foi um commit `feat:`/`chore:` ... `for phase N`, hoje só no bundle da seção 8). Último estado provado: `pnpm check` limpo com 190 testes de unidade, 102 de integração, 69 de 69 no Playwright em cópia limpa (74 de 74 com inglês ligado).

**Só o dono pode fazer:**
1. Rodar `pnpm test:clerk` com chaves de desenvolvimento do Clerk.
2. Testar o checkout e o portal do Stripe com chaves de teste (webhook em `/api/webhooks/stripe` com os seis eventos da tabela do README).
3. Rodar `pnpm gcp:alerts` contra o Google Cloud (a sintaxe e os JSON foram conferidos, o script nunca rodou contra o GCP).
4. Ligar o workflow `.github/workflows/ci.yml` (hoje só `workflow_dispatch`) e ver o primeiro resultado.
5. **Depois de tudo acima testado:** fazer o primeiro `create-next-app --example` contra o repositório público, numa pasta nova, seguido de `docker compose up`, e conferir que o agente apaga o `BASE.md` como o `AGENTS.md` manda. Ainda não foi feito, de propósito.

**Já feito:** a `main` foi enviada ao GitHub e, depois, o histórico dela foi reescrito para um único commit (veja a seção 8). Os commits antigos, com os documentos de trabalho, deixaram de existir no branch publicado; o bundle guarda tudo.

**Decisões em aberto:**
- **Inglês opt-in está implementado e provado** (ver seção 3.1), mas o produto continua só em pt-BR. Limites assumidos: data e dinheiro mantêm o formato brasileiro de propósito; com mais de um idioma a casca deixa de ser estática (`instant = false` no layout raiz). E-mails saem no idioma do destinatário (`emailTranslatorFor`, `lib/ports/email/locale.ts`): o salvo na conta (`options.locale`), senão o do pedido que causou o envio; o contato guarda o idioma na mensagem (`contact_messages.locale`); o aviso à equipe fica no idioma padrão.
- Valores OKLCH do frontmatter do `DESIGN.md` ficaram, porque estão entre marcadores gerados pelo `pnpm tokens` e conferidos pelo `tokens:check`; só o que era escrito à mão saiu.

## 7. Como evoluir

1. Leia `AGENTS.md` e, para trabalho visual, `DESIGN.md` (Product block ainda "TO FILL IN": peça o preenchimento antes do primeiro trabalho visual).
2. Escolha a skill da receita (`.claude/skills`) e copie o padrão do módulo de referência.
3. Mudança de schema: `pnpm db:generate`, nunca edite migration; a regra de `lint:migrations` confere.
4. Toda regra nova tem teste de integração contra banco real, inclusive os caminhos de recusa.
5. Depende de SDK novo: só em `lib/ports/<porta>/adapters`, e a fronteira está no `biome.json`.
6. Não crie exceção no Biome ou no knip para fugir de regra; exceção só com o motivo escrito, quando a regra briga com uma biblioteca.
7. Código sem consumidor espera a fase que o consome. Exemplo vivo: `hasPaidPlan` ficou interno à porta de pagamento porque nada fora dela o usava.

## 8. Onde está a história

O histórico da `main` publicada foi **reescrito em um único commit** (raiz nova, com a árvore já higienizada), então o GitHub não mostra mais `LEFT.md`, `PLANO.md`, `CONTRATO.md`, as notas de design nem o `loop.txt`, nem os 70 e poucos commits de construção. O histórico completo, com todas as fases, os registros e a tag `pre-hygiene-docs`, está só no bundle `/Users/thiago/projects/my/exata-bundle/exata-base.bundle`, fora do repositório. Para ler:

```sh
git clone /Users/thiago/projects/my/exata-bundle/exata-base.bundle /tmp/exata-historia
cd /tmp/exata-historia
git show pre-hygiene-docs:docs/PLANO.md     # registros das fases 0 a 11
git show pre-hygiene-docs:docs/LEFT.md      # a superfície e as decisões
git show pre-hygiene-docs:docs/design-historia.md
```

Guarde o bundle: é a única cópia desse histórico (o GitHub pode manter por um tempo os objetos antigos acessíveis por hash direto; isso não é garantia de nada). Quem já clonou a `main` antiga tem de reclonar. A partir daqui, trabalhe em cima do commit novo.

## 9. Higiene e o `BASE.md`

**O `BASE.md` é a única exceção.** Ele fica no repositório público e viaja com o `create-next-app`. Quem o remove é o agente do produto novo: o `AGENTS.md` tem a instrução, e ela se apoia no endereço do repositório da base, que é este: `https://github.com/thiagoteles/exata-base` (seção 2). Regra: se `git remote get-url origin` não for esse endereço (nem a mesma URL com `.git` ou por SSH), o repositório é um produto, e o `BASE.md` sai com `git rm BASE.md` num commit próprio, antes de qualquer outra tarefa. Na base, o `origin` é esse endereço e o arquivo fica. Se um dia a base mudar de endereço, atualize aqui e na seção 2; o `AGENTS.md` não cita o endereço, só manda comparar com o que está no `BASE.md`.

**Conferência de higiene.** Passo de quem publica, não script que viaja. Deve voltar vazio. Só o `BASE.md` é excluído:

```sh
grep -rnE "lottery|solmiza|\bbrb\b|acolhimento|violao|exata-ui|exata-base|gstack|/Users/|LEFT\.md|CONTRATO|PLANO\.md|projects/my|brazil/" . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next --exclude-dir=test-results \
  --exclude=pnpm-lock.yaml --exclude=tsconfig.tsbuildinfo --exclude=BASE.md -I
```

(O padrão usa `brazil/` com a barra porque `@brazilian-utils` é dependência legítima e "dados brasileiros" aparece em comentários.)
