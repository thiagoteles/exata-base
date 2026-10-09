# Pendências da base

Arquivo temporário. Lista o que falta na base para que produtos como o lottery e o solmiza, e os próximos, nasçam dela, e é executado em loop pela **Fila** até o fim. O foco é técnico: a migração operacional de cada produto (dados, assinantes, corte) fica no repositório do produto.

## Como executar em loop

Este arquivo é o estado do trabalho. Uma sessão nova, ou a mesma depois de uma compactação, retoma daqui sem precisar de outra memória. Para rodar: `/loop siga o LEFT.md` (ou "siga" a cada rodada).

### Protocolo de cada rodada

1. Leia a **Fila** abaixo e pegue a primeira unidade `[ ]` que não esteja marcada `⏸`.
2. Leia a seção de especificação que ela cita, o código da área e a skill que se aplica (`.claude/skills`). Siga o `AGENTS.md`, o `DESIGN.md` e as regras de texto (sem travessão em interface, nada de nome de arquivo em comentário).
3. Implemente a unidade inteira, com os testes que provam o comportamento: unidade para `domain/`, integração para regra com banco, e2e para tela e fluxo.
4. Prove:
   - `pnpm check`, julgado pelo código de saída e nunca por `grep`;
   - `pnpm test:integration`, quando tocar regra com banco;
   - tela nova: captura nos dois temas e no celular, conferida a olho, mais axe no e2e;
   - comportamento que só aparece em produção: o item vai para o `pnpm verify`;
   - a suíte e2e é escrita para o compose limpo (sem provedor de pagamento): com o Stripe de teste no `.env.local`, `pnpm test:e2e` contra o compose local muda o estado. A prova de e2e é o `pnpm verify`, que roda numa cópia limpa sem `.env.local`; para provar uma tela de cobrança com o Stripe ligado, use um spec próprio contra o compose local.
5. Commit de uma unidade por vez, em inglês, no formato `tipo: descrição` (o hook roda o `pnpm check`). **Nunca faça push.**
6. Marque `[x]` na unidade e nos itens da seção, com uma linha do que provou. Atualize o `BASE.md` (decisões e armadilhas), o `AGENTS.md` (regras novas), o `README.md` (comandos e variáveis) e as skills quando a unidade mudar uma regra.
7. Ao fechar uma **fase**, rode o `pnpm verify` com o compose derrubado (`docker compose down`, depois `docker compose up -d`), e só então siga para a fase seguinte.
8. Vá para a próxima unidade. Pare quando só restarem unidades `⏸`, e então escreva o relatório final (ver F9).

### Como decidir no caminho

- A decisão escrita na unidade vale. Não pergunte de novo.
- Surgiu uma decisão nova: escolha pelos princípios da base (genérico para muitos produtos, fechado e tipado, nenhuma infraestrutura nova, o produto configura em vez de copiar código) e registre em **Decisões tomadas no loop**, com a data.
- Uma unidade grande demais para uma rodada vira subunidades na própria fila, antes de começar.
- Um defeito antigo achado no caminho é corrigido na mesma rodada, com teste, e anotado no commit.
- Uma unidade que exige algo de fora (chave, conta, servidor real, aprovação) ganha `⏸ motivo` e o loop segue. Nada é inventado para contornar.

### O que o loop nunca faz

- Push, deploy, `pnpm gcp:alerts` ou `gcp:access-log` sem `DRY_RUN`, ou qualquer escrita em serviço externo.
- Usar credencial que não seja de teste, gravar segredo em arquivo versionado, imprimir um valor de `.env.local` ou apagar recurso fora do repositório. O `.env.local` (ignorado pelo git) traz as chaves de teste que o dono deixou para provar o que for preciso (Stripe `sk_test_`, Clerk de teste, Mailtrap, Umami): podem ser lidas e usadas, nunca impressas nem copiadas para arquivo versionado. Uma chave `sk_live_` ou de produção é recusada. O Stripe em modo de teste pode receber produtos, preços e eventos de prova.
- Pular hook (`--no-verify`), silenciar plugin do Biome ou baixar o piso de cobertura.
- Acrescentar código sem consumidor: o knip recusa. Mecanismo novo entra com um uso na base (exemplo neutro no `/catalog` ou numa tela existente).

## Fila

As fases seguem a dependência entre elas. Cada unidade aponta a seção que detalha o que fazer.

### F1. Regras e arrumação (fase concluída, `pnpm verify` verde)

- [x] **F1.1 Onde cada coisa vai.** (feito: linha `components/figures` e regra "Where a thing lives" no `AGENTS.md`) Escrever no `AGENTS.md`: cálculo puro em `domain/`, figuras SVG em `components/figures`, áudio e microfone em `domain/audio` importado só por componente cliente (ou port com adapter de navegador quando precisar de falso em teste); notação de domínio (nomes de nota, siglas) vem de funções do domínio e não é texto do catálogo. *Estrutura, Camada; Regras, item 1.* A validação de mover um módulo já está provada: `domain/billing` e `domain/charts` passam no check.
- [x] **F1.2 Arquivos estáticos.** (feito: `public/` com o `COPY` no Dockerfile; o `pnpm verify` põe um `.wav` e um `.json` nela e confere 200 na imagem de produção, tipos que o matcher do proxy não nomeia; teste de fonte recusa `readFile`, `readFileSync`, `createReadStream` e `readdir` no código do app sem `turbopackIgnore`, com o adapter de disco como única exceção, por ler o diretório de storage fora do repositório; o upload do e2e falhou uma vez na primeira compilação e passou na rodada seguinte) Criar `public/` (com `.gitkeep`) e o `COPY` no Dockerfile, provado no `pnpm verify`. Teste de fonte que recusa `readFile`/`readFileSync` com caminho vindo de argumento sem o comentário `turbopackIgnore`. Arquivo pago fica atrás de rota com guarda: documentar o padrão com a rota de storage existente. *Estrutura, Arquivos estáticos.*
- [x] **F1.3 Convenções do banco.** (feito: três regras novas no teste de convenções, com um teste que prova que cada uma pega o erro que existe para pegar) `lib/db/conventions.test.ts` recusa coluna `real`, `double` ou `numeric` com nome de dinheiro (`price`, `amount`, `cents`, `total`, `value`), `timestamp` sem fuso, e valores de enum fora de `snake_case` ASCII. *Regras, item 3.*
- [x] **F1.4 `tools/`.** (feito: provado com um arquivo-sonda que quebra todas as regras, que o `pnpm check` não vê; a pasta também fica fora do `.dockerignore`) `tools/README.md` explicando a pasta, e ela fora do Biome, do knip, do tsconfig e do Vitest. *Regras, item 4.*
- [x] **F1.5 Skill `port-from-legacy`.** (feito; falta citar o extrator quando F7.2 existir, anotado em F7.2) A ordem para cada arquivo trazido de fora (camada, textos, relógio e aleatoriedade, check), citando o extrator de F7.2 quando existir. *Regras, item 5.*
- [x] **F1.6 Notas de SEO e deploy.** (feito: três armadilhas no `BASE.md`, seção 5) No `BASE.md`: nunca `as` no `<Link>`; um 301 fica guardado no navegador, então renomear um caminho público mantém o antigo no mapa; o Coolify faz deploy da `main` a cada push, e o hook de push é a barreira. *SEO, item 1; Infraestrutura, item 1.*
- [x] **F1.7 Renovate.** (feito: `renovate.json` validado pelo `renovate-config-validator`; um erro de curinga foi pego e corrigido) `renovate.json` com lotes semanais, versões exatas e as atualizações de Next, React e TypeScript isoladas. Ligar o app hospedado fica com o dono (anotar em "Depende de você"). *Infraestrutura, item 1.*

### F2. Agendamento e ingestão

- [ ] **F2.1 Grupos por cadência.** `/events/[group]` com `daily`, `hourly` e `every-5-min`; cada operação declara o grupo no registro; `/events` sem grupo continua chamando `daily` (compatível). Decisão: grupo inválido responde 404. *Capacidades, item 1.*
- [ ] **F2.2 Trava por operação.** `pg_try_advisory_xact_lock` pela chave da operação: uma execução lenta não roda duas vezes ao mesmo tempo; a segunda chamada registra `skipped`. Teste de integração com duas chamadas concorrentes.
- [ ] **F2.3 Batimento e painel por grupo.** `recordJobRun` e a linha `heartbeat` por grupo (`daily`, `hourly`, `every-5-min`); `ops/gcp/heartbeats.json` com a janela de cada um; o painel Saúde lista os grupos que têm operação registrada.
- [ ] **F2.4 Ingestão de workers externos.** `POST /api/ingest/[source]` com segredo próprio por fonte (`INGEST_SECRET`, comparado em tempo constante), payload validado por zod declarado num registro de fontes, `timedRoute` e rate limit. Na base, uma fonte de exemplo neutra com teste; a regra fica no servidor e o worker só entrega.
- [ ] **F2.5 Documentar.** `BASE.md`, `README.md` (um cron por grupo no Coolify) e a skill `new-daily-operation` passam a falar de grupo de cadência.

### F3. Contas e preferências

- [ ] **F3.1 Registro de opções tipadas.** Cada opção declara schema zod, padrão e se vai para cookie antes da pintura; `saveOption(key, value)` grava só a chave com `jsonb_set`; leitura validada (valor antigo ou inválido cai no padrão). Tema e idioma migram para o registro. *Contas, item 1.*
- [ ] **F3.2 Opções de visitante.** As mesmas opções em cookie para quem não tem conta, copiadas para a conta no cadastro e no login. Decisão: cookie, não `localStorage`, para valer antes da pintura.
- [ ] **F3.3 Fuso horário.** `options.timeZone` vindo do navegador (`Intl`) no login, padrão `America/Sao_Paulo`; os serviços recebem o fuso junto com o relógio. Registrar o limite dos lembretes por horário local no `BASE.md`. *Contas, item 2.*
- [ ] **F3.4 Preferências de e-mail.** Categorias em `options.email` (transacional sempre; lembretes desligáveis; novidades só com opt-in); o port de e-mail recebe a categoria e recusa enviar o que a pessoa desligou. Tela na conta. *Contas, item 3.*
- [ ] **F3.5 Descadastro com um clique.** Link assinado com HMAC e sem tabela, cabeçalhos `List-Unsubscribe` e `List-Unsubscribe-Post`, página de confirmação pública. e2e pelo mail catcher.
- [ ] **F3.6 Acessibilidade como preferência.** Escala de fonte, reduzir movimento forçado e contraste reforçado, em cookie antes da pintura como o tema; a escala vira variável CSS lida pelos tokens. *Contas, item 4; Design system, tipografia.*
- [ ] **F3.7 Dados de visitante reivindicados.** Helper genérico: dado guardado no navegador, action `claimVisitorData` que copia para a conta no primeiro login e apaga o local. Exemplo neutro na base (rascunho do formulário de contato) com e2e. *Contas, item 6.*
- [ ] **F3.8 Indicações.** Código por pessoa, cookie de atribuição na chegada por `?ref=`, `referredBy` como `authoredBy` gravado no cadastro, contagem na conta. A recompensa fica para F6.10. *Contas, item 5.*
- [ ] **F3.9 Onboarding.** Passos em `options.onboarding`, uma tela de primeiros passos que o produto preenche, e o evento `activated` do funil emitido quando o produto declara o passo final. *Contas, item 7.*
- [ ] **F3.10 Sessões e dispositivos.** No login próprio, listar e encerrar sessões (better-auth); com Clerk, um link para o perfil do Clerk. *Contas, item 7.*
- [ ] **F3.11 Exclusão de conta conferida.** Teste de integração: apagar a conta cancela a assinatura ativa no provedor, e `payments` e `referredBy` ficam com o e-mail do autor.

### F4. Design system

- [ ] **F4.1 Cor oficial fixa.** `design.json` aceita accent com `fixed: true`: o tom puro só decora e o gerador calcula `-ink` e `on-accent` com contraste medido nos dois temas. Provar com amarelo, verde-limão e laranja saturados e claros, e registrar o resultado (fecha o "Validar" do Design system). *Design system, item 2.*
- [ ] **F4.2 Paletas de domínio nomeadas.** `design.json` declara grupos (`palettes.category.*`), cada cor passa pelo verificador e vira token; o `check-design-tokens` aceita essas classes; exemplo neutro no `/catalog`.
- [ ] **F4.3 Primitivos.** Em `components/ui`, sobre Radix, os que faltam: tabs, stepper, date picker, slider, progress e meter, accordion, checkbox, radio, switch, skeleton, chip removível e breadcrumb. API uniforme com `tone` e `size` tipados. Cada um no `/catalog` com teste de teclado e axe. Pode virar subunidades.
- [ ] **F4.4 Padrões do site público.** Hero, seções de conteúdo, tabela de preços (lida do catálogo de planos) e FAQ, aplicados à página inicial e a `/planos`, com desenho próprio e nunca o cartão genérico. JSON-LD junto: `FAQPage` no FAQ, `Product` com `Offer` em `/planos`, `Article` e `BreadcrumbList` nos artigos. *Design system, item 4; SEO, item 4.*
- [ ] **F4.5 Texto em SVG e figuras.** Um `<SvgText>` que recebe a chave do catálogo sem esbarrar no `noJsxLiterals`, e a família `components/figures` com as regras e um exemplo neutro (`color-mix` sobre tokens permitido).
- [ ] **F4.6 Padrões de produto pago.** Paywall e gate (apoiados no `requireFeature`), estado de trial, progresso e conquistas, e o onboarding de F3.9 com o desenho do design system. O paywall emite `paywall_viewed`.
- [ ] **F4.7 API uniforme.** Os componentes existentes que têm variação de cor ou tamanho passam a `tone` e `size` tipados, sem mudar o visual.
- [ ] **F4.8 Catálogo vivo e snapshots.** O `/catalog` mostra cada componente nos dois temas e em cada densidade do preset ativo; snapshots do Playwright (`toHaveScreenshot`) sobre ele, com as referências versionadas. Decisão: os presets não trocam em execução, então a matriz de presets é um comando (`pnpm catalog:presets`) que gera cada preset, captura e restaura o `design.json`.

### F5. Conteúdo e SEO

- [ ] **F5.1 Erros de frontmatter legíveis.** O `pnpm content` mostra o erro do zod em português, com o campo e o arquivo, no lugar da chave crua. *SEO, item 9.*

### F6. Cobrança, construída e provada com eventos assinados

Tudo aqui se prova como a base já faz: eventos do Stripe assinados à mão e lidos pelo adaptador real, chamadas ao Stripe por `fetch` falso. A prova no sandbox de verdade fica em "Depende de você".

- [ ] **F6.1 Limites por plano.** `limits` do catálogo consumidos pela tabela de contadores do rate limit (`consumeLimit(holder, limit)`, com janela por limite), e `actionFor(role, { limit })`. Exemplo neutro com teste. *Cobrança, item 1; Rate limit.*
- [ ] **F6.2 Preços por `lookup_key`.** O catálogo declara `"premium.monthly": "premium_monthly"`; o adaptador lê os preços do Stripe com cache por tag (`'use cache'`), e o `STRIPE_PRICE_*` sai do env. Preço do par nível e intervalo. *Cobrança, item 3.*
- [ ] **F6.3 Moedas.** `currency_options` do próprio Price, exibição em BRL como padrão e outra moeda como opção do produto.
- [ ] **F6.4 Pix e anual avulso.** Intervalo `yearly_once` (snake_case: a regra de F1.3 recusa hífen em valor de enum) em `mode: "payment"` com Pix e cartão; `currentPeriodEnd` gravado na compra; operação diária devolve a free no vencimento; e-mail de aviso antes do vencimento; expiração do QR por `expires_after_seconds`. *Cobrança, item 4.*
- [ ] **F6.5 Pendente e falha assíncrona.** `pending` quando o checkout completa sem o dinheiro, "aguardando pagamento" na tela do plano, `async_payment_failed` e a expiração do Pix tratados. *Cobrança, item 5.*
- [ ] **F6.6 Trial.** `trial_period_days` no checkout, `trial_will_end` disparando e-mail, `trialUsedAt` impedindo repetir; eventos `trial_started` e `refund_issued` no catálogo de analytics e emitidos. *Cobrança, item 5; Observabilidade, item 9.*
- [ ] **F6.7 Disputa.** `charge.dispute.created` registrado na `payments` e alertado no log como erro (o Error Reporting avisa).
- [ ] **F6.8 Rastro de checkout.** Tabela `checkout_sessions` (aberto, pago, expirado) com a origem do paywall; eventos de exibição, clique e conversão. *Cobrança, item 7.*
- [ ] **F6.9 Checkout abandonado.** Operação diária que envia um e-mail uma vez por sessão expirada, respeitando a preferência de e-mail de F3.4.
- [ ] **F6.10 Cupons e crédito de indicação.** `allow_promotion_codes` no checkout; crédito de indicação como saldo do cliente no Stripe, com as regras em `lib/referral`. *Cobrança, item 8.*
- [ ] **F6.11 Skill e documentos.** `new-payment-event` com os eventos novos; o `BASE.md` com o estado completo da cobrança.

### F7. Textos e catálogo

- [ ] **F7.1 Catálogo dividido.** `messages/pt-BR/<área>.json`, juntado por um comando num `messages/pt-BR.json` gerado, que continua sendo o tipo; o `pnpm check` confere que o gerado está em dia. A paridade entre idiomas continua. *Regras, item 1.*
- [ ] **F7.2 Extrator de textos.** Ao terminar, citar o extrator no passo 3 da skill `port-from-legacy`. `scripts/extract-text.ts` com `ts-morph`: acha literais em JSX e nas props `aria-label`, `placeholder`, `title` e `alt`, propõe a chave pelo caminho, grava no catálogo da área e troca por `t("chave")`; recusa travessão. Testado sobre um arquivo de exemplo.
- [ ] **F7.3 Peso do catálogo.** Medir o typecheck do TS 7 com um catálogo sintético de 5 mil chaves e registrar o tempo no `BASE.md`. Se passar de 2× o atual, propor a mitigação no próprio registro.

### F8. Capacidades sob demanda

- [ ] **F8.1 API v1 e tokens pessoais.** Tokens criados e revogados na conta, só o hash no banco, escopos por token; `app/api/v1/*` com handlers finos sobre os serviços e os mesmos schemas das actions; CORS por lista de origens, rate limit por token, erros no formato `DomainError`. Um endpoint de exemplo (`GET /api/v1/me`). *Capacidades, item 2.*
- [ ] **F8.2 PDF e QR.** `lib/documents` com `@react-pdf/renderer` (import limitado à pasta por regra do Biome), `qrcode`, fontes do disco e cores em hex do gerador. *Capacidades, item 3.*
- [ ] **F8.3 Documento verificável e recibo.** Slug assinado, página pública de verificação, QR apontando para ela; recibo de pagamento a partir de `payments`, baixado pela conta.
- [ ] **F8.4 Páginas de impressão.** Grupo `app/(print)` com casca própria, tokens de impressão, `components/print`, variante `print:` nas páginas comuns, botão "Imprimir"; uma ficha de exemplo (a de contato) com teste `emulateMedia` e `page.pdf()`. Provar a numeração por `counter(page)` no Chromium e registrar o que se sabe de Safari e Firefox. *Capacidades, item 5.*
- [ ] **F8.5 Segundo idioma parcial.** `complete: false` em `lib/i18n/locales.ts`, o `check-catalogs` avisando em vez de falhar, chaves faltantes recebendo o pt-BR no build, relatório do quanto falta; `formatMoney(cents, currency, locale)` e datas pelo idioma; caminhos públicos em inglês no mapa (`/en/plans`). *Capacidades, item 4; SEO, item 1.*

### F9. Fechamento

- [ ] **F9.1 Retenção do backup no `setup:product`.** A pergunta, e o valor escrito no README e na política de privacidade. *Infraestrutura, item 3.*
- [ ] **F9.2 SRI.** Prova em branch descartável do `experimental.sri` do Next com a casca estática. Se funcionar sem renderização dinâmica, ligar; se não, registrar por quê. *Infraestrutura, item 2.*
- [ ] **F9.3 Relatório final.** `pnpm verify` verde; o que sobrou de "Depende de você" e "Fora do loop" vai para uma seção "Pendências externas" do `BASE.md`; este arquivo é apagado num commit próprio (`chore: remove the work list`).

## Fora do loop

Itens das seções abaixo que o loop não faz, e por quê. Ficam como referência.

- **Esperam um consumidor** (o knip recusa código sem uso): `generateSitemaps` em partes de 50 mil (SEO, item 3); port `indexing` com IndexNow (SEO, item 8); linha e heatmap nos gráficos.
- **São do produto:** URLs atuais do lottery no mapa; JSON-LD de domínio (sorteio, curso); `/aprenda`, FAQ e glossários dos produtos; acesso por nível do solmiza, que usa o mecanismo de `features` e `limits` sem código novo; arquivos pagos do solmiza.
- **Decididos contra:** Google Indexing API (só serve a `JobPosting` e `BroadcastEvent`); mutation testing com Stryker (não há matemática de prêmios na base); OpenAPI gerado (entra com o primeiro cliente de fora que o peça); experimentos A/B.
- **Dependem de tempo em produção:** ligar a CSP de verdade depois de um período sem violações inesperadas.

## Depende de você

O loop marca a unidade com `⏸` e segue. Quando você puder, cada item destrava o que diz.

- **Chave do GCS para testar o storage:** o dono pediu a chave do projeto "test" no `.env.local`, mas não existe projeto com esse nome (o mais parecido é `testchunk`, e o `gcloud` está logado como o dono). Criar conta de serviço e chave é escrever na conta de GCP dele, então a unidade espera um nome de projeto confirmado. O `.env.local` já tem as chaves de teste de Stripe (com o `STRIPE_WEBHOOK_SECRET` impresso pelo `stripe listen --print-secret`), Clerk, Mailtrap e Umami.
- **Pix no sandbox do Stripe:** só aparece se a conta de teste tiver o Pix habilitado e o Brasil como país; o loop confere e marca `⏸` em F6.4 se não tiver.
- **Servidor real atrás do Traefik ou da Cloudflare:** IP e porta de origem do cliente (Marco Civil, rate limit), número de réplicas e custo da escrita por requisição.
- **Projeto GCP:** aplicar `pnpm gcp:alerts` e `pnpm gcp:access-log` de verdade.
- **Renovate:** instalar o app hospedado no repositório (F1.7 deixa a configuração pronta).

## Decisões tomadas no loop

(O loop acrescenta aqui, com a data, cada decisão nova que precisar tomar.)

## Histórico

### Decisões tomadas (2026-10-08)

- **Proxy confiável por produto.** O helper de IP lê `TRUSTED_PROXY` (`cloudflare | traefik`) em `lib/env.ts`. Com `cloudflare`, o IP vem do `CF-Connecting-IP`; com `traefik`, do último valor do `X-Forwarded-For`. O `setup:product` pergunta.
- **Retenção do backup por produto.** Padrão de 7 dias; o `setup:product` pergunta e escreve o valor no README e na política de privacidade.
- **Auth por produto.** Clerk ou login próprio continua sendo a flag `AUTH_PROVIDER`. A base não traz scripts de migração de usuários.
- **Sem CI no GitHub** (sem cota). As checagens pesadas rodam nos hooks e num comando local (ver "Infraestrutura e qualidade").
- **Migração operacional fora do LEFT.md.** Backfill de usuários, mapa de enums, conversão de valores e tabelas de equivalência ficam em cada produto.
- **Só o mecanismo na base.** Cores oficiais de terceiros, figuras e paletas de um domínio vivem no produto. A base traz o mecanismo com exemplos neutros, e a conferência de higiene do `BASE.md` continua passando.
- **Presets visuais:** a proposta de valores de cada preset é feita no `/catalog`, com capturas nos dois temas, e aprovada antes de virar padrão.
- **Sem experimentos A/B** (2026-10-09).

### Provas técnicas (feitas em 2026-10-09)

Cada uma num branch descartável (`spike/*`, fora da `main`). Todas passaram e nenhuma decisão mudou; o que cada uma ensinou está na seção correspondente.

- [x] `typedRoutes` com o mapa de URLs públicas e o prefetch do `<Link>` sobre o endereço reescrito (SEO, item 1). `spike/public-paths`.
- [x] `data-accent` com variáveis CSS sob o `@theme` do Tailwind 4, e o `next/font` aceitando um arquivo de fontes gerado (Design system). `spike/accent-fonts`.
- [x] `@next/mdx` com Turbopack no Next 16.4 (SEO, item 9). `spike/mdx`.
- [x] `@react-pdf/renderer` com React 19.3 no servidor (PDF e QR). `spike/pdf-files`.
- [x] Plugin GritQL barrando relógio e aleatoriedade no Biome 2.5 (Regras, item 2). `spike/gritql-clock`.
- [x] `outputFileTracingIncludes` sob `cacheComponents` (Arquivos estáticos). `spike/pdf-files`.

Achado que vale para o produto inteiro: sob `cacheComponents` com `partialPrefetching`, uma rota dinâmica com slug inexistente responde **200** com `noindex` e a tela de não encontrado, porque a casca já saiu. Um 404 de verdade exige checar o slug no `proxy.ts` (ver SEO, item 2).

# Especificação por seção

## Estrutura

### Camada para engines de domínio

Matemática de prêmios, fechamentos e gerador no lottery; teoria musical, exercícios e áudio no solmiza.

**Decisão:** pasta nova `domain/<área>/`, abaixo de `lib`. Fica descartado colocar em `lib/<área>/`, porque mistura com os serviços que usam o banco e um componente cliente pode puxar código de servidor. Fica descartado também um pacote separado no workspace, que é exagero para um único consumidor.

- [x] Override no `biome.json`: `domain/**` não importa nada de `@/` (nem `lib`, `ports`, `db`, `app`, `components` ou `features`), nem React, Next, zod, Drizzle ou módulos do Node.
- [x] Ajustar a mensagem "lib is the lowest layer". `lib` e componentes podem importar `domain`, e o contrário não.
- [x] Linha nova na tabela "Where things go" do `AGENTS.md`.
- [x] Relógio e aleatoriedade sempre como parâmetro (`now` e um gerador com semente). O módulo de aleatoriedade com semente entra com o primeiro consumidor (o knip recusa código sem uso).
- [ ] Onde cada coisa vai:
  - cálculo puro em `domain/`;
  - figuras SVG e bolas, que são React, numa família nova em `components/` (por exemplo `components/figures`);
  - áudio e microfone isolados em `domain/audio`, importado só por componentes cliente, ou num port com adapter de navegador, se precisar de um falso nos testes.
- [ ] **Validar:** mover um módulo só (por exemplo a matemática de prêmios) e rodar `pnpm check` para conferir Biome, knip e Vitest.

### Arquivos estáticos

**Decisão:** a forma depende de quem lê o arquivo.

| Quem lê | Forma | Exemplo |
|---|---|---|
| O navegador | `public/` | WAVs sem paywall |
| O servidor, dado pequeno e fixo | `import` do JSON (vai no bundle) | modelo de popularidade |
| O servidor, muitos arquivos sob demanda | `fs` + `outputFileTracingIncludes` | matrizes, fontes TTF das imagens OG |
| Dado consultável ou que muda | tabela no Postgres via seed | |
| Grande ou enviado por usuário | port de storage | |

- [ ] A base não tem `public/` e o Dockerfile não a copia. Se usar, adicionar o `COPY`.
- [x] Provado em dev, standalone e Docker, sem mudar o Dockerfile:
  - caminho fixo (`join(process.cwd(), "assets/fonts/x.ttf")`) é rastreado sozinho pelo Turbopack, sem configuração;
  - **um helper que recebe o caminho como argumento faz o Turbopack copiar o repositório inteiro** para o standalone, só com um aviso. Nesse caso: `join(/* turbopackIgnore: true */ process.cwd(), rel)` mais `outputFileTracingIncludes`;
  - as chaves do `outputFileTracingIncludes` são rotas, e a da imagem OG aninhada leva um sufixo de hash (`/terms/opengraph-image-1810ec`): usar curinga (`"/terms/*"`);
  - o arquivo precisa ir sempre, mesmo para imagem OG estática: a página carrega o módulo da imagem para os metadados.
- [ ] Arquivos pagos (WAVs do solmiza) não vão para `public/`. Ficam atrás de uma rota com guarda.
- [ ] Uma regra (Biome ou teste) que recusa `readFile` com caminho vindo de argumento sem o `turbopackIgnore`.

### Rate limit

**Decisão:** tabela de contadores no Postgres (upsert por janela de tempo), exposta como opção do `actionFor` e como uma função para route handlers. Ficam descartados:
- em memória, que zera a cada deploy e não funciona com mais de uma réplica;
- Redis, que é infraestrutura nova;
- só na borda, que não sabe de plano nem de usuário.

- [x] Tabela, serviço, guardas (`limitedPublicAction`, `actionFor(papel, { rateLimit })`, `enforceRateLimit`) e erro 429. Aplicado ao contato público e a `/api/client-errors`.
- [ ] A mesma tabela serve aos limites de uso por plano (`usage` do lottery). Entra com o catálogo de planos.
- [x] Uma operação diária apaga as janelas antigas.
- [x] Helper confiável de IP do cliente. Hoje `app/api/client-errors` pega o **primeiro** valor do `X-Forwarded-For`, que quem chama controla. O helper lê `TRUSTED_PROXY`: `cloudflare` usa o `CF-Connecting-IP`, `traefik` usa o último valor do `X-Forwarded-For`. Com `cloudflare`, o README documenta o firewall aceitando só os IPs da Cloudflare.
- [ ] **Validar:** o IP real nos dois modos, o número de réplicas e o custo de uma escrita por requisição nas rotas públicas mais acessadas. Se pesar, colocar limite na borda como primeira barreira.

## Design system

**Diagnóstico:** o `BASE.md` fixou que o produto só troca as cores. O resto é fixo: fonte Onest, raios 10/14/18, densidade, alturas escritas no `components/ui/styles.ts` (`h-11`, `h-12`, `w-[520px]`), sombra e movimento. Isso protege contra interfaces genéricas, mas deixa todo produto parecido, e o solmiza e o lottery não cabem.

**Decisão:** presets curados. O produto deixa de só trocar 2 sementes e passa a escolher entre botões curados, todos passando pelo mesmo verificador. Continua fechado, gerado e medido.

- [x] Reescrever a regra no `BASE.md` e no `DESIGN.md`. Os presets mantêm a intenção anti-clone, porque o produto escolhe entre opções curadas e não cola uma pele.

### 1. Arquitetura em 3 camadas

| Camada | O que é | Quem mexe |
|---|---|---|
| Botões do produto | `design.json` no lugar do `colors.json`: cor, tipografia, forma, densidade, movimento, paletas extras | O produto, via `setup:product` |
| Tokens semânticos | `ink`, `surface`, `brand`, `accent`, `control-height`, `radius-panel`… gerados e medidos | O gerador, nunca à mão |
| Componentes | Consomem só tokens semânticos | A base |

- [x] **Tokenizar as dimensões** que hoje estão escritas nos componentes: altura de controle, de linha e de campo, padding de painel, largura de diálogo. É pré-requisito de densidade e forma.

### 2. Botões

- [x] **Cor**
  - Manter as sementes brand e neutral.
  - Adicionar a **temperatura do neutro** (mais chroma e offset para papel quente).
- [x] **Accent com escopo**
  - Tokens `accent`, `accent-wash`, `accent-ink` e `on-accent`. Um `data-accent="<nome>"` no contêiner troca o tom ali dentro.
  - Usos: o jogo no lottery; a função harmônica ou o nível no solmiza; categoria, setor ou cliente em outros produtos.
- [ ] **Cor oficial fixa como entrada** (a cor de marca de um terceiro, que o produto não pode alterar):
  - o tom puro só como decoração;
  - o gerador calcula `-ink` e `on-accent` com contraste medido nos dois temas;
  - uma cor oficial clara demais para texto deixa de exigir exceção escrita à mão.
- [ ] **Paletas de domínio nomeadas** (o produto declara grupos como `category.*` ou `material.*`):
  - cada cor passa pelo verificador e vira token;
  - o `check-design-tokens` passa a aceitar essas classes;
  - na base, só um exemplo neutro no `/catalog`.
- [x] **Paleta de dados:** categórica (cerca de 8 tons com luminosidade equilibrada, distinguíveis por quem tem daltonismo), sequencial e divergente, nos dois temas.
- [x] **Tipografia:**
  - par de fontes de uma lista curada (sans neutra, humanista, serifada editorial, hiperlegível), mais a mono para números;
  - o gerador escreve o arquivo de fontes, porque o `next/font` exige chamadas literais;
  - `font-serif` proibido só quando o par escolhido não tem serifa;
  - corpo de 17 ou 18;
  - pendente: escala de fonte escolhida pela pessoa, como variável CSS (ver "Contas e preferências", acessibilidade).
- [x] **Forma:** eixo `sharp | soft | round` que multiplica a escala de raios, mais o peso das bordas.
- [x] **Densidade:** `compacta | média | confortável` (altura de controles, linhas e ritmo).
- [x] **Elevação:** sombra ou borda nas camadas.
- [x] **Movimento:** `calmo | vivo` (duração e easing). O "Salvo" continua como o momento autoral.

### 3. Presets

Combinações completas e testadas. O produto escolhe um preset mais as sementes e pode ajustar um botão ou outro.

- [x] Proposta dos valores de cada preset (par de fontes, escala de raios, densidade, elevação, movimento) renderizada no `/catalog`, com capturas nos dois temas, aprovada antes de virar padrão.

- [x] **Instrumento:** o atual, operacional e denso.
- [x] **Editorial:** serifado, neutro quente, raios suaves e mais respiro. Serve ao solmiza, a conteúdo e a cursos.
- [x] **Acessível:** hiperlegível, corpo 18, alvos maiores e contraste reforçado. Serve ao lottery e a públicos amplos.
- [x] **Vivo:** raios maiores, accent forte e movimento presente. Serve a consumo e a produtos lúdicos. Carimbo em pílula aprovado só nesta forma (`round`).
- [x] O preset vira pergunta do `setup:product`, e o `DESIGN.md` é gerado com a seção do preset escolhido.

### 4. Componentes que faltam

- [ ] **Primitivos** sobre Radix em `components/ui`: tabs, stepper, date picker, slider, progress/meter, accordion, checkbox, radio e switch (se faltarem), skeleton, chip removível e breadcrumb.
- [ ] **Padrões do site público:** hero, seções de conteúdo, tabela de preços, FAQ. O **layout de leitura (prose)** está feito (`mdx-components.tsx`).
- [x] **Gráficos em SVG** (`components/charts`): colunas, barras, sparkline e stat tile, usando a paleta de dados, sem biblioteca. Linha e heatmap entram com o primeiro consumidor.
- [ ] **Figuras de domínio** (`components/figures`): a família existe na base com as regras e um exemplo neutro; as figuras de cada produto (diagramas, bolas, instrumentos) vivem no produto. `color-mix(in oklch, var(--color-x) N%, transparent)` permitido sobre tokens.
- [ ] **Texto dentro de SVG** (`<text>`) vindo do catálogo, sem esbarrar no `noJsxLiterals`.
- [ ] **Padrões de produto pago:** paywall e gate, estado de trial, progresso, conquistas e onboarding.
- [ ] **API uniforme:** todo componente com `tone` (neutral, brand, accent, success…) e `size`, tipados.

### 5. Garantia de beleza

- [ ] O `/catalog` vira um guia vivo: cada componente em cada preset, nos dois temas e em cada densidade.
- [ ] Snapshots visuais no Playwright sobre o catálogo, para pegar no PR uma regressão em qualquer preset.
- [ ] O verificador de contraste continua a ser a barreira: nenhum botão produz um token que não passe nele.

### Ordem e validação

1. Tokenizar as dimensões.
2. Accent com escopo e paletas nomeadas (destrava os dois projetos).
3. Botão de tipografia com serifa.
4. Paleta de dados e gráficos.
5. Primitivos e padrões que faltam.
6. Presets, catálogo e snapshots.

- [x] **Accent com escopo, provado** (claro, escuro, aninhado, dev e produção):
  - usar `@theme` simples, **nunca `@theme inline`**: o inline grava a cor na classe e o escopo deixa de trocá-la;
  - os quatro valores padrão no `@theme`, e o gerador escreve um bloco por accent em `@layer base`, nos três seletores de tema (`[data-accent=x]`, `:root[data-theme="dark"] [data-accent=x]` e o `prefers-color-scheme`);
  - nenhum token derivado de outro (`color-mix(var(--color-accent) …)`): é calculado uma vez na raiz e não segue o escopo. O gerador escreve os quatro valores em cada escopo;
  - verdes entre os matizes 140 e 150 ficaram abaixo de 4,5:1 no texto sobre o accent cheio; o gerador corrige movendo o preenchimento;
  - o Next converte `oklch` para `lab()` no build: testes de navegador comparam cores por distância, não por texto.
- [x] **Fontes geradas, provado:** um script escreve `app/fonts.ts` a partir do par escolhido, com chamadas literais no topo do módulo e opções literais (o `next/font` recusa variável). As variáveis CSS têm nomes estáveis (`--font-face-sans`, `--font-face-serif`, `--font-face-mono`), e trocar o par só regenera o arquivo.
- [ ] **Validar:** se o gerador acha variantes legíveis no tema escuro para cores oficiais saturadas e claras (amarelo, verde-limão, laranja).

## Cobrança

**O que a base já tem:**
- port neutro (`PaymentGateway` traduz o provedor para eventos);
- webhook idempotente, com o id do evento como trava na mesma transação;
- mensal, anual e vitalício, com o vitalício cancelando a assinatura que substitui;
- cortesia;
- reembolso total;
- `past_due` mantendo o acesso;
- cancelamento no fim do período;
- `async_payment_succeeded` já tratado.

**Limites:**
- o acesso é binário (`free | paid`, `grantsAccess`);
- o estado tem nomes do Stripe;
- os preços vêm de env, numa moeda só;
- não há trial nem estado pendente;
- não há registro local de pagamentos, rastro de checkout, cupom ou cobrança por organização.

Fora de escopo: nota fiscal (resolvida fora da base) e a migração de assinaturas de outros provedores, que é operação de cada produto.

### 1. Catálogo de planos e direitos

- [x] Catálogo tipado em `domain/billing/catalog.ts`, preenchido pelo produto: níveis com `features`, `limits` e `extends`.
- [ ] Preços do catálogo apontando para `lookup_key` do Stripe (`"premium.monthly": "premium_monthly"`). Entra com "Preços e moedas"; até lá, `catalog.paidTier` com os `STRIPE_PRICE_*`.
- [x] `entitlementsOf(plan, now)` devolve recursos e limites, e substitui o `grantsAccess`.
- [x] Guardas: `requireFeature("x")` em página e route, e `actionFor(role, { feature })` em action.
- [ ] Os limites por plano usam a tabela de contadores do rate limit.
- [ ] O acesso por nível do solmiza vira um recurso (`levels.all`) ou um limite (`maxLevel`), com o mesmo mecanismo.
- [ ] **Paywall** como componente de padrão, apoiado nessa guarda do servidor.

### 2. Estado neutro de provedor

- [x] `plans` (feito em 2026-10-09, com três migrations: adiciona, copia os dados, remove; provado com linhas reais num Postgres descartável):
  - `tier` com os nomes do catálogo (entra com o catálogo);
  - `status` com `trialing | active | past_due | pending | canceled`;
  - `provider`, `providerCustomerId`, `providerSubscriptionId`, `priceKey` e `trialUsedAt`.
- [x] `stripe_events` vira `payment_events`, com a coluna `provider`.
- [x] Migração das colunas atuais. A recomendação continua sendo só Stripe, mas as regras deixam de depender dele.

### 3. Preços e moedas

- [ ] Preços por `lookup_key` lidos do Stripe (com cache), no lugar de `STRIPE_PRICE_*` em env. Trocar o preço passa a ser feito no painel, sem deploy.
- [ ] Preço do par nível + intervalo, não só do intervalo.
- [ ] Várias moedas com o `currency_options` do próprio Price: o Checkout escolhe a moeda pelo IP. Isso substitui o `price_data` inline e o token de moeda assinado do solmiza.
- [ ] A exibição em BRL continua sendo a padrão. Mostrar outra moeda é uma opção do produto.

### 4. Pix para pagamentos únicos

A documentação do Stripe diz que uma conta Stripe brasileira aceita Pix **só em pagamento único**. O Pix Automático (recorrente) não está disponível para contas no Brasil.

- [ ] Pix no checkout em `mode: "payment"`: anual avulso e vitalício. Ligar o Pix no painel (métodos dinâmicos) e garantir que todos os itens estejam em `brl`.
- [ ] O mensal recorrente fica no cartão.
- [ ] **Decisão:** oferecer os dois. Anual como assinatura no cartão (renova sozinho) e anual avulso no Pix ou cartão (sem renovação). O intervalo do catálogo distingue `yearly` (assinatura) de `yearly_once` (avulso).
- [ ] Anual avulso:
  - `currentPeriodEnd` gravado na compra;
  - uma operação diária devolve a free quando o período vence;
  - um e-mail avisa antes do vencimento, convidando a renovar.
- [ ] Expiração do QR com `payment_method_options.pix.expires_after_seconds` (padrão de 4 horas).
- [ ] Reembolso de Pix vale até 90 dias depois do pagamento, o que cobre a regra dos 7 dias.
- [ ] **Validar:** um teste ponta a ponta no sandbox com Pix ("Simulate scan", CPF `000.000.000-00`), incluindo a expiração do QR.

### 5. Ciclo de vida

- [ ] **Trial:** `trial_period_days` no checkout, o evento `customer.subscription.trial_will_end` disparando um e-mail, e `trialUsedAt` para não repetir.
- [ ] **Pendente:**
  - registrar `pending` quando o checkout completa sem o dinheiro (Pix ainda não pago, boleto);
  - mostrar "aguardando pagamento" na tela do plano;
  - tratar `checkout.session.async_payment_failed` e a expiração do Pix.
- [ ] **Disputa:** tratar `charge.dispute.created` (registro mais alerta).
- [ ] Eventos novos no `PaymentEvent` e caminhos na skill `new-payment-event`.

### 6. Registro local de pagamentos

- [x] Tabela `payments` alimentada pelo webhook (`charge.succeeded` e `charge.refunded`): valor em centavos, moeda, método (cartão, Pix), status, ids do provedor e reembolsos.
- [x] `authoredBy()`: o registro sobrevive à exclusão da conta.
- [ ] Usos:
  - admin com receita e histórico por pessoa, sem chamar o provedor (histórico por pessoa feito; receita entra na página "Números");
  - exportação de dados pessoais (feito, formato versão 2);
  - analytics do servidor.
- [x] **Direito de arrependimento (CDC art. 49):** reembolso integral em até 7 dias da compra, como regra explícita (`domain/billing/withdrawal.ts`), mostrada na ficha do admin.

### 7. Checkout, paywall e conversão

- [ ] Tabela `checkout_sessions` (aberto, pago, expirado) com a origem do paywall.
- [ ] Operação diária de e-mail de checkout abandonado.
- [ ] Eventos de paywall e checkout (exibição, clique, conversão).

### 8. Cupons e créditos

- [ ] `allow_promotion_codes` no checkout.
- [ ] Crédito de indicação como saldo do cliente no Stripe ou como cupom gerado. As regras de quem ganha o quê ficam em `lib/referral`.

### Titular dos direitos

**Decisão:** preparar o titular agora, sem criar organizações.

- [x] `entitlementsOf` e as guardas recebem um "titular" (`{ kind: "user", id }`), que hoje é sempre a pessoa. Organizações e assentos entram depois sem mudar a assinatura das funções.

### Ordem

1. Estado neutro de provedor.
2. Catálogo, `entitlementsOf` e guardas.
3. Preços por `lookup_key` e `currency_options`.
4. Pix para pagamentos únicos, pendente e falha assíncrona.
5. Trial.
6. `payments` e a regra dos 7 dias.
7. `checkout_sessions`, abandono e eventos de paywall.
8. Cupons e créditos.

## Observabilidade e analytics

**O que a base já tem:**
- logs estruturados com pino (stdout, e Cloud Logging com as chaves GCP);
- `onRequestError` com o request id que a página de erro mostra;
- `/api/client-errors` com tamanho limitado e deduplicado por minuto;
- um alarme `app_errors` ("qualquer erro em 5 minutos", por e-mail);
- `/health` testando o Postgres;
- Umami no navegador (`track` e `identify`, só com o id interno).

**Limites:**
- **Observabilidade:**
  - o alarme não agrupa erros;
  - a pilha do navegador chega minificada;
  - nada avisa quando um trabalho para de rodar;
  - não há checagem externa;
  - não há log de acesso do Marco Civil;
  - não há medida de desempenho.
- **Analytics:**
  - ~~eventos são strings livres~~ (catálogo tipado);
  - ~~não há envio pelo servidor~~ (port `analytics`);
  - ~~não há funil padrão~~ (declarado e emitido);
  - não há números de negócio;
  - ~~não há experimentos~~ (decidido: fora da base).

### 1. Error Reporting do GCP no lugar do Sentry

- [x] Logs de erro no formato do Cloud Error Reporting (`@type`, pilha em `stack_trace` ou local pela mensagem, e `serviceContext` com o serviço e a versão). O GCP passa a:
  - agrupar por assinatura;
  - avisar só quando aparece um grupo novo ou quando um grupo resolvido volta;
  - mostrar a contagem e a primeira e a última vez de cada grupo.
- [x] Versão vinda de `SOURCE_COMMIT`, lido no `lib/env.ts`.
- [x] Manter o alarme `app_errors` como rede de segurança, com limiar maior (mais de 20 em 5 minutos).
- [x] Documentar no `BASE.md` como o substituto do Sentry.

### 2. Pilhas do navegador

**Decisão:** nada a fazer. Pilhas minificadas bastam; o request id e a rota ajudam a achar o problema. Os source maps não são publicados.

### 3. Batimentos e alarmes de ausência

- [x] Uma linha de log `heartbeat` com o nome do trabalho, gravada ao fim da chamada diária (a sincronização de um produto grava a sua). Webhook não ganhou batimento: a falta dele não é falha.
- [x] Uma métrica por log (`app_heartbeats`, com o rótulo `job`) e um alarme por trabalho em `ops/gcp/heartbeats.json`. Condição de limiar com dado ausente contando como violação, porque a janela de alerta vai até cerca de 25 horas: o `daily` usa 24,5 horas.
- [x] Em `ops/gcp`, aplicado pelo `pnpm gcp:alerts` (com `DRY_RUN=1` para conferir). **Não aplicado num projeto real ainda.**

### 4. Checagem externa

- [x] Uptime check do GCP no `/health`, a cada minuto, de três regiões, com alarme, no `pnpm gcp:alerts`. **Não aplicado num projeto real ainda.**

### 5. Log de acesso (Marco Civil, art. 15)

Registros de acesso (IP, data e hora com fuso) guardados por 6 meses, em sigilo.

**Decisão:** na base, opcional por flag (`ACCESS_LOG=on`, lida em `lib/env.ts`), desligada por padrão. O `setup:product` pergunta se o produto tem fins econômicos e liga a flag quando tiver.

- [x] Com a flag ligada, o `proxy.ts` grava uma linha de acesso por requisição num log separado (`access`) pelo log port. Uma só por requisição, mesmo na segunda passagem de uma reescrita; sem a query.
- [x] No GCP (`pnpm gcp:access-log`, com `DRY_RUN=1`; **não aplicado num projeto real ainda**):
  - um bucket próprio com retenção de 6 meses;
  - o log `access` excluído do bucket padrão;
  - os dois em `ops/gcp`.
- [x] Fora do GCP, a linha vai só para o stdout. Fica documentado que a retenção é responsabilidade do operador.
- [x] Usar o helper de IP confiável do rate limit (`TRUSTED_PROXY`).
- [ ] **Validar:** a porta de origem do cliente, necessária por causa do CGNAT, nos dois modos. O registro lê `x-forwarded-client-port` (que o Traefik do Coolify precisa ser configurado para mandar) e o `CF-Connecting-Port` atrás da Cloudflare; sem eles, a porta sai `null`.

### 6. Desempenho

- [x] `useReportWebVitals` enviando LCP, INP e CLS como o evento `web_vital` do catálogo, numa amostra de 10% por id da métrica (`domain/analytics/sample.ts`, determinística, sem ler aleatoriedade; provada por propriedades e pela fração em 20 mil ids sequenciais). Só com o Umami ligado.
- [x] **Validado** no mesmo Umami: INP e CLS chegam (o rastreador usa `fetch` com `keepalive`). O teste achou a taxa em dobro no desenvolvimento: o efeito montado duas vezes cria dois observadores, cada um com seu id. Agora a amostra é por carregamento (`performance.timeOrigin`, então as três métricas entram ou saem juntas; o `navigationId` não serve porque Safari e Firefox não o dão) e cada métrica sai uma vez por navegação. Medido: 0,31 Web Vital por página, para 0,3 esperado.
- [x] O `identify` não era chamado em lugar nenhum, e o Umami guarda o id só enquanto a página está aberta: o shell logado agora identifica a pessoa a cada carregamento, esperando o script carregar. Provado: a sessão do navegador ficou com o id da conta.
- [x] Duração de cada action e route no log: `action finished` com o nome (`.metadata({ name })`, exigido pelo tipo), a duração e o status HTTP equivalente; `route finished` com o padrão da rota, o método, a duração e o status (`timedRoute`, conferido por um teste de fonte). O `/health` fica de fora: o uptime check o chama a cada minuto de três regiões. O nome da action também vai para o log de erro.
- [x] Consultas acima de 250 ms no log (`slow query`), com o nome (comando e tabela principal, como `select users`) e o texto com os `$1`, nunca os valores. O cliente do postgres.js é envolvido num Proxy que mede o `unsafe`, inclusive dentro de transações e savepoints; provado contra o Postgres real.

### 7. Painel "Saúde" no admin

- [x] Página `/admin/health` com:
  - a última execução de cada trabalho (tabela `job_runs`, uma linha por trabalho, gravada pelo runner diário; um sync de produto grava com `recordJobRun`), com estado em dia, com falha, atrasado ou sem registro, contra o mesmo prazo do alarme de ausência (`ops/gcp/heartbeats.json`, regra em `domain/operations/job-health.ts`);
  - o último webhook recebido de pagamentos e de contas;
  - a versão no ar (`SOURCE_COMMIT`) e o serviço;
  - o estado do banco (tempo de resposta, versão do Postgres, tamanho, migrations aplicadas).
- [x] Substitui o `/status` com token do solmiza.
- [x] De quebra: a área de conteúdo do shell virou parada de Tab, porque o axe mostrou que uma página sem link nem botão não rolava pelo teclado.

### 8. Catálogo tipado de eventos

- [x] Eventos e propriedades de cada um declarados num lugar só (`lib/analytics-events.ts`). `track("checkout_started", { interval })` checado pelo TypeScript: evento fora do catálogo, propriedade não declarada e propriedade obrigatória ausente não compilam.
- [x] Propriedades com nomes como `email`, `name`, `cpf`, `cnpj`, `phone`, `address` ou `password` recusadas pelo tipo do catálogo, com um type-test (`lib/analytics-events.type-test.ts`) que o typecheck compila. Provado: tirar um `@ts-expect-error` quebra o typecheck.

### 9. Analytics no servidor

- [x] Port `analytics` (`lib/ports/analytics`) com adapter Umami via `fetch` (`/api/send`, sem SDK), com o id interno da conta no `id` do payload, o mesmo do `identify`. Sai depois da resposta (`after`), com prazo de 2 segundos; falha vira aviso no log, nunca erro. Sem as variáveis do Umami, não faz nada.
- [x] Usos: pagamento confirmado (só na primeira gravação da cobrança, mesmo que dois eventos a entreguem, e só com conta), checkout iniciado e cadastro concluído.
- [ ] Reembolso e trial iniciado: entram com o trial e quando um produto pedir.
- [x] **Validado** no Umami do solmiza (site de teste próprio, 9/10/2026):
  - o `id` do payload vira o `distinctId` da sessão, e as propriedades chegam (`method`, `cents`);
  - o filtro de robôs descartava os eventos do servidor: o Umami responde `200 {"beep":"boop"}` a qualquer User-Agent que não seja de navegador (`node`, que o fetch manda por padrão, um nome de servidor, `Mozilla/5.0 (compatible; ...)`), e o adapter tomava isso por sucesso. Corrigido: User-Agent vazio, que passa, e `beep` tratado como falha no log;
  - com o id da pessoa, o Umami 3 calcula a sessão pelo id: o evento do servidor cai na mesma sessão do navegador identificado (provado), então o funil junta etapas do navegador e do servidor. O país de um evento só do servidor sai o do servidor.

### 10. Funil padrão

- [x] Eventos que todo produto emite: `page_view` (o próprio Umami) → `signup_completed` → `activated` → `paywall_viewed` → `checkout_started` → `payment_confirmed`, todos no catálogo.
- [x] `signup_completed` sai quando a conta fica utilizável: no login próprio, na confirmação do e-mail (ou na criação, quando o Google já entrega o e-mail confirmado); no Clerk, quando a linha é inserida (o `xmax = 0` do upsert distingue inserção de ligação a uma linha existente, então o seed ligado não conta).
- [x] `checkout_started` na action de compra; `payment_confirmed` no webhook.
- [x] `activated` e `paywall_viewed` ficam declarados; quem emite é o produto (primeiro jogo salvo no lottery, primeira lição concluída no solmiza; o paywall, onde ele aparecer).
- [x] Funil e metas configurados no Umami por um script: `pnpm umami setup` (idempotente) cria o site e os relatórios padrão (funil completo e de compra a partir do `funnel` do catálogo, metas de cadastro e pagamento, receita, retenção, caminhos). O `pnpm umami` cobre leitura, link público, exclusões com `--yes` e qualquer endpoint por `api`; a skill `umami` ensina o uso. Provado no Umami do solmiza.
- [x] `payment_confirmed` leva `revenue` (em reais) e `currency`, que o relatório de receita do Umami lê. Provado: R$ 49,90 apareceu no relatório.

### 11. Números de negócio no admin

- [x] Página "Números" lendo o Postgres (`users`, `plans`, `payments`), com os gráficos do design system (feito: cadastros, receita líquida, reembolsos, pagantes por plano, cancelamentos agendados; pendentes marcados abaixo):
  - cadastros por dia;
  - pessoas ativas (pendente: a base não registra atividade);
  - pagantes por plano;
  - receita recorrente mensal (pendente: precisa do valor de cada preço, que entra com os preços por `lookup_key`);
  - cancelamentos;
  - reembolsos;
  - conversão do trial (pendente: entra com o trial).
- [x] Não depende do Umami.

### 12. Experimentos

**Decisão:** fora da base. Os produtos não fazem testes A/B com pessoas, então não há `variantOf`, evento de exposição nem cookie de visitante.

### LGPD

- [x] Umami continua sem cookie, recebendo só o id interno (o catálogo recusa propriedade com nome de dado pessoal).
- [x] Pixels de anúncio (Meta, Google Ads) ficam fora da base, porque exigiriam consentimento e um banner.

### Decisões

- Error Reporting do GCP como substituto do Sentry.
- Sem tradução de source maps.
- Sem experimentos A/B.
- Log de acesso do Marco Civil na base, opcional por flag.

### Ordem

1. Formato do Error Reporting com a versão do deploy.
2. Batimentos, alarmes de ausência e Uptime check.
3. Log de acesso do Marco Civil, atrás da flag.
4. Catálogo tipado de eventos, port do servidor e funil padrão.
5. Página "Números" e painel "Saúde".
6. Web Vitals.

## SEO

**O que a base já tem:**
- `robots.ts` que fecha o site inteiro fora de produção;
- `sitemap.ts` a partir da lista fixa `lib/public-routes.ts` (4 rotas);
- `buildSocialMetadata` com `canonical`, Open Graph e Twitter em URLs absolutas;
- uma imagem OG na raiz, `manifest` e ícones.

**Limites:**
- URLs públicas obrigatoriamente em inglês (regra "tudo que viaja é em inglês" do `BASE.md`), o que quebra o SEO do lottery;
- sitemap estático, sem páginas do banco nem `lastModified` real;
- metadados sempre `website`, com locale fixo `pt_BR`, sem `hreflang` nem `noindex` por página;
- sem JSON-LD;
- uma imagem OG só;
- sem convenção de cache;
- sem redirects, RSS ou aviso de URL nova;
- sem lugar para conteúdo editorial longo.

### 1. URLs públicas em português

**Decisão:** mapa de caminhos. As pastas em `app/` continuam em inglês, e um mapa tipado traduz o endereço visto pelo visitante.

- [x] Mapa de caminhos públicos por idioma, com padrões para segmentos dinâmicos: `"/plans": "/planos"`, `"/lotteries/[game]/results/[draw]": "/loterias/[game]/resultado/[draw]"`.
- [x] O `proxy.ts` reescreve o endereço público para a rota interna e responde 301 quando alguém acessa o endereço interno.
- [x] Helper `publicHref()` para os links. Sitemap e `canonical` sempre com o endereço público.
- [ ] Com segundo idioma, o mesmo mapa ganha os caminhos em inglês (`/en/plans`), sem exigir a pasta `[locale]`.
- [ ] O lottery mantém as URLs de hoje declarando-as no mapa. A área logada continua em inglês.
- [x] Atualizar a regra no `BASE.md` e no `AGENTS.md`.
- [x] **Provado em build de produção:** endereço em português servido da pré-renderização, 301 do endereço interno (mantendo a query, só em GET e HEAD), navegação no cliente, prefetch igual ao de uma rota sem tradução e casca estática mantida. Forma que funcionou:
  - mapa `as const` cujas chaves são conferidas contra as páginas, com os params tipados a partir delas;
  - o proxy roda depois da etapa de idioma e reescreve com `NextResponse.rewrite`. A guarda de auth vê o caminho interno, então os prefixos protegidos continuam em inglês;
  - `publicHref("/examples/[slug]", { slug })` é o único lugar com cast para `Route`.
- [ ] Nunca usar `as` no `<Link>`: no App Router ele ignora o `href` e aceita qualquer texto.
- [x] Link com o caminho interno funciona, mas perde o prefetch (bate no 301) e custa uma viagem a mais. Um teste recusa `href` com a rota escrita à mão; os links atuais foram trocados.
- [x] Sitemap e o `cancelUrl` do Stripe passam por `publicPathOf`.
- [ ] Um 301 fica guardado no navegador: renomear um caminho público depois exige manter o antigo no mapa.
- Alternativa descartada, mas mais barata: permitir pastas em pt-BR só em `app/(public)`. Não serve se houver segundo idioma.

### 2. Metadados completos

- [x] `type` (`website | article`), `publishedTime` e `modifiedTime` no `buildSocialMetadata`.
- [x] Locale vindo do pedido e `alternates.languages` (`hreflang`) com mais de um idioma.
- [x] Opção `index: false` para buscas filtradas, páginas paginadas além da primeira e páginas sem conteúdo.
- [x] `canonical` normalizado, sem parâmetros de filtro ou de rastreamento, e com o endereço de execução (antes saía com o host do build).
- [x] `GOOGLE_SITE_VERIFICATION` em `lib/env.ts` para o Search Console (só na página inicial, onde o Google procura).
- [x] **404 de verdade em rota dinâmica** (`lib/known-pages.ts`, conferido no `pnpm verify` em produção): sob `cacheComponents`, slug inexistente responde 200 com `noindex`. O `proxy.ts` confere o slug contra uma lista gerada no build (ou uma consulta barata) e responde 404 antes da casca. `dynamicParams = false` é recusado sob `cacheComponents`.

### 3. Sitemap por fontes

- [x] Cada área registra uma fonte que devolve URLs públicas com `lastModified` do banco (`lib/sitemap-sources.ts`).
- [x] O `sitemap.ts` junta as rotas fixas e as fontes.
- [ ] O `generateSitemaps` divide por fonte e em partes de até 50 mil. Entra quando uma fonte passar de algumas centenas de endereços.
- [x] `publicRoutes` continua sendo a fonte das páginas fixas.

### 4. JSON-LD tipado

- [x] Componente `<JsonLd>` que escapa `<`, para evitar injeção de script.
- [x] Construtores tipados com `schema-dts`: `Organization` e `WebSite`, na página inicial.
- [ ] `BreadcrumbList`, `FAQPage`, `Article` e `Product` com `Offer` entram com a primeira página que os use (MDX, planos).
- [ ] O produto acrescenta os seus (resultado de sorteio, curso).

### 5. Imagem OG por página

- [x] Modelo compartilhado (título, subtítulo, marca) usado pelos `opengraph-image.tsx` de cada rota (`lib/og/share-image.tsx`).
- [x] Paleta em hex gerada pelo gerador de tokens, como a do e-mail: o Satori do `ImageResponse` não suporta `oklch`.
- [x] **Mudou:** as fontes vêm do Google Fonts (TTF), buscadas uma vez em `'use cache'` com `cacheLife("max")`, pela família que o preset gera em `lib/typeface.ts`. Com presets, guardar o TTF de cada tipografia no repositório pesaria cerca de 1,5 MB; o build já depende de rede pelo `next/font`. Sem rede, a imagem sai na fonte padrão. A imagem continua estática.
- [ ] Sem I/O sem cache, a imagem é pré-renderizada no build. Uma imagem que lê dado por parâmetro é dinâmica e não fica guardada depois da primeira visita: para cachear, a leitura vai numa função `'use cache'`.

### 6. Cache e invalidação

- [x] Leituras públicas em funções `'use cache'`, com `cacheTag` e `cacheLife`.
- [x] Tags num módulo tipado por área (`lib/cache-tags.ts`), nunca string solta.
- [x] Em server action, `updateTag(tag)`: só funciona ali, e a pessoa vê a mudança na hora. Para a tela de quem agiu, `refresh()`.
- [x] Em route handler (webhook, operação diária, sincronização), `revalidateTag(tag, "max")`, ou `{ expire: 0 }` quando o dado precisa sumir na hora.
- [x] `revalidatePath` e `unstable_cache` proibidos por um teste do código-fonte.

### 7. Redirects

- [x] Lista tipada (`lib/redirects.ts`) aplicada no `next.config.ts` com `permanent: true`.
- [x] Teste que impede cadeias (nenhum destino aponta para outro redirect).

### 8. Feeds e aviso de URL nova

- [x] Construtor de RSS para route handlers, com escape correto; `/feed.xml` com os artigos.
- [ ] Port `indexing` com adapter IndexNow e o arquivo de chave servido na raiz. Entra com o primeiro conteúdo que muda sem deploy (resultados do lottery); hoje não teria quem o chamasse.
- [ ] A base não usa a Google Indexing API. Pela política do Google ela só serve para `JobPosting` e `BroadcastEvent`. Para o Google, valem o sitemap com `lastModified` real e o Search Console.

### 9. Conteúdo editorial em MDX

- [x] Textos de interface continuam no `messages/pt-BR.json`.
- [x] Conteúdo longo em `content/<locale>/<área>/*.mdx`, com frontmatter validado por zod (título, descrição, datas, autor) e o layout de leitura do design system. Na base, a área `/artigos`, com índice gerado por `pnpm content`.
- [ ] Atende `/aprenda`, FAQ e glossário do lottery, e glossário e referência do solmiza.
- [x] Declarar a exceção à regra do catálogo no `AGENTS.md`.
- [x] **Provado em dev e build:** `@next/mdx` com Turbopack, frontmatter YAML por `remark-frontmatter` e `remark-mdx-frontmatter` passados por nome (texto), o módulo importado como `unknown` e validado inteiro por zod. Frontmatter inválido derruba o build daquela página. A página sai como pré-renderização parcial.
- [x] Conferência de travessão nos `.mdx` (caractere e entidades HTML, frontmatter incluso), no `pnpm check`.
- [ ] Mensagens de erro do zod saem como a chave do catálogo (`{"key":"required"}`), com o caminho do campo: legível para quem escreve, mas pode ganhar um formatador próprio para conteúdo.

### 10. Testes de SEO

- [x] Suíte do Playwright (`e2e/seo.spec.ts`) que percorre o sitemap e confere em cada página pública:
  - `title` e `description` únicos;
  - `canonical` igual ao próprio endereço;
  - um único `h1`;
  - imagem OG respondendo 200;
  - nenhum link interno quebrado.

### Decisões

- URLs em português pelo mapa de caminhos.
- MDX por idioma para conteúdo editorial, como exceção declarada à regra do catálogo.
- Google Indexing API sai; ficam IndexNow e sitemap.

### Ordem

1. Mapa de URLs públicas e metadados completos.
2. Convenção de cache e tags.
3. Sitemap por fontes e JSON-LD.
4. Modelo de imagem OG.
5. MDX e layout de leitura.
6. Redirects, feeds, IndexNow e a suíte de testes.

## Contas e preferências

**O que a base já tem:**
- papéis `member < staff < admin` em `users.role`, com guardas em página, action e route;
- **`ADMIN_EMAILS` já existe** (`lib/env.ts`): promove a admin no login local e no sync do Clerk, só subindo o papel. O solmiza já usa esse modelo; o lottery só troca o `publicMetadata.isAdmin` pela lista;
- preferências em `users.options` (`jsonb`), com tema e idioma copiados para cookie antes da pintura;
- **registro de dados pessoais** (`lib/db/personal-data.ts`), em que um teste falha se uma tabela `ownedBy` ficar fora. Tabelas novas já são cobertas, basta seguir;
- exportação em ZIP, exclusão com trilha de auditoria, convites e sync de usuários do Clerk.

### 1. Preferências tipadas e extensíveis

- [ ] Registro de opções: cada uma declara schema zod, valor padrão e se precisa de cookie antes da pintura.
- [ ] Action genérica `saveOption(key, value)` grava só aquela chave com `jsonb_set`, no lugar de uma função por opção.
- [ ] Leitura validada pelo schema: um valor antigo ou inválido cai no padrão.
- [ ] O produto acrescenta opções sem mexer na base:
  - lottery: escala de fonte;
  - solmiza: nomenclatura, modo de entrada e avanço automático.
- [ ] Visitante sem conta: as mesmas opções em `localStorage` ou cookie, copiadas para a conta no cadastro e no login, como o idioma.

### 2. Fuso horário da pessoa

- [ ] `options.timeZone` informado pelo navegador (`Intl`) no login, com padrão `America/Sao_Paulo`.
- [ ] "Hoje", sequências e lembretes usam o fuso da pessoa. Os serviços recebem o fuso junto com o relógio.
- [ ] Registrar o limite: com uma operação diária só, um lembrete "às 9h no seu horário" não funciona para fusos diferentes.

### 3. Preferências de e-mail e descadastro

- [ ] Categorias em `options.email`:
  - transacionais sempre enviadas;
  - lembretes desligáveis;
  - novidades só com opt-in.
- [ ] Descadastro com um clique:
  - link assinado com HMAC, sem tabela;
  - cabeçalhos `List-Unsubscribe` e `List-Unsubscribe-Post`, exigidos pelo Gmail e pelo Yahoo para quem envia muito;
  - página de confirmação.
- [ ] O port de e-mail recebe a categoria, e as operações diárias consultam a preferência antes de enviar.

### 4. Acessibilidade como preferência

- [ ] Escala de fonte, reduzir movimento (forçado mesmo quando o sistema não pede) e contraste reforçado, todos em cookie antes da pintura, como o tema. Depende do design system.

### 5. Indicações

- [ ] Código por pessoa.
- [ ] Cookie de atribuição definido na chegada por um link de indicação.
- [ ] `referredBy` gravado no cadastro, como `authoredBy`, para sobreviver à exclusão de quem indicou.
- [ ] A recompensa fica na cobrança (crédito ou cupom).

### 6. Dados de visitante reivindicados no cadastro

- [ ] Helper da base: dados no navegador, uma action de "reivindicar" copia tudo para a conta no primeiro login, e o dado local é apagado depois.
- [ ] Teste do fluxo.
- [ ] Atende o conferidor anônimo do lottery e o progresso de visitante do solmiza.

### 7. Pontos menores

- [ ] Sessões e dispositivos: listar e encerrar sessões. Baixa prioridade; o Clerk já oferece, e o better-auth tem as sessões no modo local.
- [ ] Onboarding: `onboardedAt` ou passos em `options`, ligado ao evento `activated` do funil.
- [ ] Exclusão de conta: confirmar que cancela a assinatura ativa no provedor e que `payments` e `referredBy` ficam como `authoredBy`.

### Depende de outra decisão

- Organizações e equipes ficam para depois. A cobrança já prepara o titular dos direitos; quando entrarem, contas ganham `organizations`, `memberships` com papel por organização e convites por organização.

### Ordem

1. Registro de opções tipadas, com a cópia de visitante para conta.
2. Preferências de e-mail e descadastro com um clique.
3. Fuso horário.
4. Reivindicação de dados de visitante e indicações.
5. Acessibilidade, sessões e onboarding.

## Regras da base a reconciliar

**Diagnóstico:** a maior parte das regras já é verificada pela base. O que falta é verificar as que ainda são só convenção e dar ferramentas para que trazer código de fora seja mecânico.

| Regra | Como a base aplica | Situação |
|---|---|---|
| `process.env` só em `lib/env.ts` (logo, sem `NEXT_PUBLIC_`) | Biome `noProcessEnv` | Já verificado |
| Texto só no catálogo | `noJsxLiterals` e `check-catalogs` | Verificado em JSX. Textos em arquivos TS escapam |
| zod via `@/lib/validation` | `noRestrictedImports` | Já verificado |
| Relógio e aleatoriedade como parâmetro | Convenção e o erro de prerender do Next | Não verificado |
| Valores guardados em inglês | Convenção | Não verificado |
| Dinheiro em centavos, instantes em `timestamptz` | Helpers de coluna e convenção | Parcial |
| Feature não importa feature | `noRestrictedImports` | Já verificado |

### 1. Textos para o catálogo

- [ ] Extrator `scripts/extract-text.ts` (com `ts-morph`):
  - acha literais em JSX e nas props `aria-label`, `placeholder`, `title` e `alt`;
  - propõe uma chave pelo caminho do arquivo e grava no catálogo;
  - troca o literal por `t("chave")`;
  - recusa travessão; o diff passa por revisão humana.
- [ ] Catálogo dividido em `messages/pt-BR/<área>.json` e juntado num catálogo único no build, que continua sendo o tipo. A paridade de chaves continua valendo. Necessário para produtos com centenas de telas.
- [ ] Conteúdo editorial em MDX (ver SEO), não no catálogo.
- [ ] Dados com texto (planos, FAQs em arrays TS) viram chaves do catálogo referenciadas pelo dado, ou MDX.
- [ ] Notação não é texto: símbolos e códigos do domínio (nomes de nota, números, siglas técnicas) vêm de funções do domínio. Escrever isso no `AGENTS.md`.
- [ ] **Validar:** quanto tempo o TS 7 leva para checar tipos com um catálogo de alguns milhares de chaves.

### 2. Relógio e aleatoriedade

- [x] Plugin GritQL do Biome barrando `new Date()` sem argumento, `Date.now()` e `Math.random()` em `domain/`, `lib/`, `features/`, `components/`, `app/` e `proxy.ts`.
- [x] Exceção: `domain/clock.ts` (`currentInstant`, `currentEpochMs`). As portas de entrada leem o relógio uma vez por ele e passam o instante adiante.
- [x] **Provado no Biome 2.5.15:** pega as três chamadas, aponta linha e coluna e não custa tempo mensurável no lint. `Date.now` passado como valor também é recusado.
  - Escopo por `plugins` dentro de um `overrides` (com `!` para os testes e as duas exceções). O `includes` por plugin na lista do topo não casa globs de pasta.
  - Não pega `globalThis.Date.now()`, `Date["now"]()` nem desestruturação. Aceitável.
  - `biome-ignore lint/plugin` silencia a regra: um teste de unidade recusa esse comentário em qualquer arquivo versionado. Feito.
- [x] 11 violações em 9 arquivos, quase todas `now = new Date()` como padrão de parâmetro em `lib/accounts`, `lib/contact`, `lib/client-errors` e nos adapters de storage: tirar o padrão e passar o relógio de quem chama. O `$onUpdate` de `lib/db/columns.ts` passa a usar o `now()` do banco.

### 3. Convenções do banco

- [ ] `lib/db/conventions.test.ts` passa a recusar colunas `real`, `double` ou `numeric` com nome de dinheiro, e `timestamp` sem fuso.
- [ ] Enums guardados só com valores em inglês, conferidos pelo mesmo teste (sem acento, em `snake_case`).

### 4. Ferramentas de fora do app

- [ ] **Decisão:** pasta `tools/` no repositório do produto (geradores em outras linguagens, análises, extensões de navegador, vídeo).
  - Na base, a pasta tem só um `tools/README.md` explicando que as ferramentas de fora do app vão para lá.
  - `tools/` fica fora do lint, do knip e do `tsconfig`.

### 5. Roteiro de porte como skill

- [ ] Skill `port-from-legacy`, genérica, com a ordem para cada arquivo trazido de outro projeto:
  1. mover para a camada certa (`domain`, `lib`, `features`, `components`);
  2. extrair os textos;
  3. tirar relógio e aleatoriedade;
  4. passar no `pnpm check` antes do commit.
- [ ] Tabelas de equivalência (variáveis, enums, rotas) e scripts de migração de dados ficam no repositório de cada produto, fora da base.

### Decisões

- Catálogo dividido por área, juntado no build.
- Pasta `tools/` no repositório, com só um README na base.
- Migração operacional de cada produto fora da base.

### Ordem

1. Plugin de relógio e aleatoriedade.
2. Catálogo dividido e extrator de textos.
3. Regras novas no teste de convenções do banco.
4. Skill `port-from-legacy`.
5. `tools/README.md` e a exclusão da pasta no lint, no knip e no `tsconfig`.

## Infraestrutura e qualidade

### 1. Checagens locais no lugar do CI

**Decisão:** sem CI no GitHub (sem cota de Actions). O `.github/workflows/ci.yml` continua só manual. As barreiras ficam nos hooks do lefthook e num comando local, e o `--no-verify` continua sendo a única forma de pular.

- [x] Commit: `pnpm check`, como hoje.
- [x] Push (hook novo de `pre-push`):
  - `next build` com saída standalone;
  - `check:prerender`: confere que as páginas que deviam ser estáticas foram pré-renderizadas e que os arquivos esperados estão em `.next/standalone/` (arquivo fora do trace, prerender quebrado).
- [x] `pnpm verify`, rodado antes de entregar uma fase: `pnpm check`, integração, build da imagem Docker de produção, compose limpo e e2e (a receita de prova em cópia limpa do `BASE.md`, como script).
- [ ] O Coolify continua observando a `main` e faz o deploy a cada push; o hook de push é a barreira antes dele.
- [ ] Atualizações de dependências: Renovate como app hospedado (não consome Actions), em lotes semanais e respeitando versões exatas. Opcional.

### 2. Cabeçalhos de segurança e CSP

Hoje não há nenhum cabeçalho de segurança.

- [x] Já, sem risco:
  - `Strict-Transport-Security`;
  - `X-Content-Type-Options: nosniff`;
  - `Referrer-Policy: strict-origin-when-cross-origin`;
  - `frame-ancestors 'none'`;
  - `Permissions-Policy` fechando câmera, microfone e localização. O produto abre o que precisa (o solmiza, `microphone=(self)`).
- [x] **Decisão:** CSP sem nonce, primeiro em `Content-Security-Policy-Report-Only`, com violações enviadas para o log. Mantém a casca estática. Só `report-uri` (o `report-to` desligava a entrega no Chrome).
- [x] Cada parte declara os domínios que usa (Clerk e Umami; Stripe e GCS abrem por navegação e não entram na página), e a política é montada a partir dessas declarações.
- [x] O produto acrescenta o que precisa (no solmiza, `worker-src blob:` e `script-src blob:` para o AudioWorklet) em `lib/security/sources.ts`.
- [ ] A CSP passa a valer de verdade depois de um período sem violações inesperadas.
- [ ] **Validar:** o `experimental.sri` do Next (hash dos scripts) como reforço, sem renderização dinâmica.

### 3. Backup e restauração

Hoje há o backup agendado do Coolify. A restauração nunca foi provada, e não há backup dos arquivos enviados.

- [x] Roteiro de restauração no README, com os passos testados.
- [x] Script de ensaio (`pnpm restore:drill`, provado com um dump real e recusando um dump vazio):
  - restaura o último dump num Postgres descartável;
  - roda as migrações e contagens de sanidade;
  - roda uma vez por mês, no CI ou à mão.
- [x] Versionamento ou *soft delete* no bucket GCS dos arquivos (comando no README; aplicar é do operador).
- [x] **Decisão:** backup diário, com a retenção escolhida pelo produto (padrão de 7 dias). Perde no máximo um dia.
- [ ] O `setup:product` pergunta a retenção e escreve o valor no README e na política de privacidade. Hoje o README diz o padrão de 7 dias e a configuração é feita à mão no Coolify.
- [x] LGPD: depois de qualquer restauração, `pnpm restore:reapply` reaplica as exclusões feitas desde o backup. A trilha do banco restaurado não as tem, então cada exclusão também vai para o log (`account deleted`), de onde os ids podem ser tirados se o banco antigo se perdeu.

### 4. Estratégia de testes do domínio

- [x] Testes por propriedade com `fast-check` onde há invariantes (na base: escala de eixo e mapa de caminhos, como exemplo):
  - a soma do rateio é igual ao total;
  - um fechamento cobre o que promete;
  - transpor e voltar devolve a mesma nota.
- [x] Cobertura mínima de 90% para `domain/` no `vitest.config`, medida em todo `pnpm test`. O resto do código continua sem meta.
- [ ] Opcional: mutation testing (Stryker) só na matemática de prêmios.

### Decisões

- Sem CI no GitHub: build e prerender no hook de push, imagem e e2e no `pnpm verify`.
- CSP sem nonce, em modo relatório primeiro.
- Backup diário, retenção por produto, padrão de 7 dias.

### Ordem

1. Hook de push e `pnpm verify`.
2. Cabeçalhos de segurança, e CSP em relatório.
3. Ensaio de restauração e reaplicação de exclusões.
4. Estratégia de testes de `domain/`, antes do primeiro porte.

## Capacidades sob demanda

### 1. Agendamento mais frequente que diário

Hoje há um `/events` diário, autorizado por `CRON_SECRET`, com um registro de operações.

- [ ] Grupos por cadência em `/events/[group]` (`daily`, `hourly`, `every-5-min`). Cada operação declara o grupo no registro, e o Coolify chama cada grupo no seu cron.
- [ ] Continua sem fila e sem worker: HTTP, autorizado, idempotente.
- [ ] `pg_try_advisory_lock` por operação, para que uma execução lenta não rode duas vezes ao mesmo tempo.
- [ ] Batimento gravado a cada execução (ver "Observabilidade e analytics").
- [ ] Endpoint de ingestão para workers externos (por exemplo, um coletor rodando fora do servidor), com segredo próprio e payload validado por zod. A regra fica no servidor; o worker só busca e entrega.
- [ ] Atualizar o `BASE.md`: "agendamento é HTTP chamado de fora, por grupo de cadência", no lugar de "uma chamada diária".

### 2. API JSON para clientes de fora

Hoje há só server actions. O `app/api` tem webhooks e o relatório de erros.

- [ ] `app/api/v1/*` com handlers finos sobre os serviços de `lib/` e os mesmos schemas zod das actions.
- [ ] Tokens de acesso pessoais:
  - criados e revogados na conta;
  - só o hash no banco;
  - escopos por token.
- [ ] CORS por lista de origens, rate limit por token, erros no formato `DomainError` e versão no caminho.
- [ ] Opcional: OpenAPI gerado a partir dos schemas zod.
- [ ] **Decisão:** tokens pessoais desde a primeira versão da API, também para a extensão do Chrome. Nada depende do cookie de sessão em chamadas de outra origem.

### 3. PDF e QR

- [ ] Módulo `lib/documents` com `@react-pdf/renderer`, gerando em route handler. Uma regra do Biome limita o import da biblioteca a essa pasta.
- [ ] `qrcode` para o QR: no PDF, como PNG em data URI (`toDataURL`) dentro do `<Image>`; SVG só redesenhado com os componentes `Svg` do react-pdf. Na página web, SVG.
- [ ] Fontes TTF do disco (ver "Arquivos estáticos") e cores da paleta em hex do gerador de tokens.
- [ ] Documento verificável: slug assinado, página pública de verificação e QR apontando para ela.
- [ ] Usos: certificado do solmiza, recibo de pagamento (a partir de `payments`) e relatórios.
- [x] **Provado em dev, standalone e Docker** (`@react-pdf/renderer` 4.9.0, React 19.3): fonte própria embutida por `Font.register` com caminho do disco, texto acentuado recuperável. Não precisa de `serverExternalPackages`: o pacote já está na lista de externos do Next. Cores em hex, como na imagem OG (o Satori recusa `oklch`).

### 4. Segundo idioma

O mecanismo já está provado: catálogo por idioma, paridade de chaves, prefixo `/en` e e-mail no idioma da pessoa.

- [ ] Tradução parcial com fallback:
  - o idioma declara `complete: false` em `lib/i18n/locales.ts`;
  - o `check-catalogs` avisa, em vez de falhar, sobre chaves que faltam;
  - no build, as chaves que faltam recebem o texto pt-BR;
  - um relatório mostra o quanto falta traduzir.
- [ ] `formatMoney(cents, currency, locale)` e datas pelo idioma, com o formato brasileiro como padrão.
- [ ] `hreflang` e URLs traduzidas ficam na seção de SEO.
- [ ] Aceitar o custo da casca dinâmica com mais de um idioma. A alternativa (`app/[locale]`) perde o `typedRoutes` sem prefixo.

### 5. Páginas de impressão

Folhas impressas na hora: entregas do acolhimento, dossiê do brb, financeiro do bike.

**Decisão:** impressão por CSS para o que a pessoa imprime na hora (ficha, folha de entrega, relatório da tela). PDF (ver "PDF e QR") para o que é anexado, arquivado ou verificado. Os dois leem os mesmos serviços.

- [ ] Grupo de rotas `app/(print)` com casca própria: sem navegação, tema claro forçado, folha A4 com `@page` e margens em tokens.
- [ ] Tokens de impressão gerados pelo `pnpm tokens`: tinta sobre papel, bordas finas, sem fundo de cor. `print-color-adjust: exact` só onde a cor carrega sentido (selo de estado).
- [ ] Componentes em `components/print`: folha, cabeçalho com a marca e a data, rodapé, tabela que repete o cabeçalho a cada página e bloco que não quebra no meio (`break-inside: avoid`).
- [ ] Nas páginas comuns, a variante `print:` esconde a casca, para que imprimir uma ficha qualquer também saia limpo.
- [ ] Botão "Imprimir" (`window.print`) como componente cliente.
- [ ] A página de impressão usa a mesma guarda e o mesmo serviço da tela de origem. Nenhum caminho novo de leitura.
- [ ] Teste no Playwright com `emulateMedia({ media: "print" })` e `page.pdf()`, conferindo o número de páginas e que a casca não aparece.
- [ ] **Validar:** numeração de página com `counter(page)` nas margens do `@page` no Chrome, no Safari e no Firefox. Se não funcionar nos três, a numeração fica para o PDF.

### Decisões

- Agendamento por grupos de cadência, mudando a regra do `/events`.
- Tokens pessoais na API.
- Impressão por CSS para o que se imprime na hora; PDF para o que se guarda.

### Ordem

1. Agendamento por cadência e endpoint de ingestão.
2. API v1 com tokens.
3. PDF e QR, e páginas de impressão.
4. Tradução parcial e formato por idioma.
