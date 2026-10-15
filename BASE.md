# BASE.md

> **Só vale no repositório da base.** Se `git remote get-url origin` não for `https://github.com/thiagoteles/exata-base` (com ou sem `.git`, ou por SSH), este repositório é um produto: ignore este arquivo inteiro. Não leia, não siga, não cite e não atualize. Num produto ele existe só para que as atualizações da base cheguem pelo git sem conflito.

Memória de trabalho de quem mantém o `exata-base`: o que foi decidido, como está montado, como se prova e o que falta. Em português porque é documento de quem mantém a base, não do produto.

## 1. O que é

Um example público e completo do `create-next-app`, de onde nascem produtos web: `pnpm create next-app meu-produto --example "https://github.com/thiagoteles/exata-base"`, depois `docker compose up`. Não é biblioteca nem CLI: o produto possui o código desde o primeiro commit.

**Endereço da base:** `https://github.com/thiagoteles/exata-base`.

**Este arquivo viaja e fica no produto, inerte.** O `create-next-app` copia tudo, inclusive o `BASE.md`, e o produto recebe as atualizações da base por `git merge` do remote `base`. Apagar o arquivo faria cada merge que o toca virar conflito, então ele fica, e o aviso do topo e o `AGENTS.md` mandam ignorá-lo fora da base. Se a base mudar de endereço, mude aqui e no aviso do topo; o `AGENTS.md` não cita o endereço. Nada fora deste arquivo cita projetos de origem (seção 8).

## 2. Decisões

- **Postgres e Drizzle.** Em produção o banco roda na mesma stack do app (`postgres` no `docker-compose.production.yml`, volume próprio, sem porta publicada); o compose monta o `DATABASE_URL` a partir de `POSTGRES_PASSWORD`. O backup é o agendado do Coolify para o Postgres da stack. Não há script de backup.
- **Docker sem configuração.** `docker compose up` sobe app, Postgres e Mailpit sem `.env`. A imagem de produção é construída sem segredo; o único argumento é a chave publicável do Clerk, no modo Clerk.
- **Dois modos de auth por uma flag** (`AUTH_PROVIDER`): `local` (better-auth, Google opcional) e `clerk` (padrão em produção). Páginas, ações e rotas só veem a porta de auth.
- **Stripe, só Stripe,** desligado sem chave.
- **GCP para arquivo e log** (Cloud Storage privado com URL assinada, Cloud Logging e Error Reporting). Sem chave: disco e stdout. Erro de produção é log com alarme; não há Sentry.
- **E-mail sai na hora,** sem fila nem nova tentativa. Produção: Email API do Mailtrap. Local: Mailpit.
- **Agendamento é HTTP chamado de fora,** um endereço por cadência (`/events/daily`, `/events/hourly`, `/events/every-5-min`; `/events` responde como o `daily`), cada um com a sua tarefa agendada no Coolify e o `CRON_SECRET`. Sem fila, worker ou cron no container.
- **Tudo que viaja é em inglês** (código, comentário, tabela, coluna, valor guardado, rota, env, README, AGENTS, DESIGN, skills), menos o endereço público, que vem do mapa `lib/i18n/public-paths.ts`, e o texto do catálogo (`messages/pt-BR/`), o único idioma. Valores do banco ficam em inglês e o catálogo os traduz.
- **pnpm e Node 24.** Dependências em versão exata, com `minimumReleaseAge` de uma semana (o `next` é a exceção).
- **Qualidade estrita:** TypeScript estrito, Biome preset `all` com `--error-on-warnings` e fronteiras de import, knip para código morto, React Compiler, lefthook com `pnpm check` em todo commit. Sem ESLint.
- **Webpack,** em desenvolvimento e no build (`next dev --webpack`, `next build --webpack`), com o Tailwind pelo PostCSS. Turbopack não é usado: entrava em laço de recarga no compose e segurava mais memória do que o compose tinha.
- **Interação é Radix,** importado só em `components/ui`. O visual vem do `DESIGN.md`.
- **Sem CI** (não há cota de Actions). O hook de commit roda o `pnpm check`; o de push roda o build e o `pnpm check:prerender`; o `pnpm verify` é a prova antes de entregar. O Coolify faz o deploy a cada push na `main`; `--no-verify` é a única forma de pular os hooks.
- **Commits direto na `main`,** pequenos, em inglês (`feat:`, `chore:`, `docs:`).

## 3. Como está montado

Next 16.4 com `cacheComponents` e `partialPrefetching` (a casca é estática e o que depende do pedido chega por streaming), `typedRoutes`, saída standalone, `proxy.ts`. O mapa de pastas e as regras que não dobram estão no `AGENTS.md`; aqui fica o que não cabe lá.

### 3.1 Fundamentos

- `domain/<area>` é a camada mais baixa, sem banco, React, Next nem Node; só `domain/clock.ts` lê o relógio do sistema.
- Tabela e coluna em `snake_case`, expostas em `camelCase` pelo Drizzle. Toda tabela que aponta para o usuário declara `ownedBy()` (apaga com a conta) ou `authoredBy()` (mantém a linha e uma coluna com o e-mail do autor).
- Ações por `actionFor(papel)` (next-safe-action): erro sempre no formato `DomainError` com o id do pedido; `.action` não compila sem `.metadata({ name })`; um middleware mede tudo, guardas incluídas, e escreve `action finished` com o status. Rotas passam por `timedRoute`, e `lib/source-rules.test.ts` recusa rota sem ele ou com padrão diferente da pasta (menos `/health`).
- Consultas: `lib/db/query-timing.ts` envolve o postgres.js num Proxy sobre `unsafe`, `begin` e `savepoint` e loga como `slow query` o que passa de 250 ms (`lib/db/client.ts`), sem os valores.
- Texto: `pnpm extract-text <arquivo> --area <área> [--write]` move literais de JSX e de `aria-label`, `placeholder`, `title` e `alt` para o catálogo; `pnpm messages` junta as áreas em `messages/pt-BR.json`, e o `pnpm check` recusa o junto desatualizado. `noJsxLiterals` fica ligado.
- Relógio: só a porta de entrada lê o relógio, com `currentInstant()`, depois de `connection()`; o plugin `biome-plugins/no-ambient-clock.grit` recusa `new Date()`, `Date.now` e `Math.random` no resto, e `lib/source-rules.test.ts` recusa silenciá-lo. O `updatedAt` usa o `now()` do banco. Dinheiro em centavos, instante em `timestamptz`, fuso do produto `America/Sao_Paulo`, data `dd/mm/aaaa`.
- Variáveis de ambiente só em `lib/env.ts` (padrão local, grupos que vão juntos, o que derruba o boot de produção). Variável nova também entra na lista de `scripts/setup-product/integrations.ts`.
- Migration roda na subida do servidor (`lib/server-startup.ts`), com advisory lock. A seed (admin `admin@app.local`, senha `admin-local`) só roda fora de produção; em produção o primeiro admin se cadastra com e-mail de `ADMIN_EMAILS`.
- Erros de escrita: `lib/db/conflicts.ts` transforma duplicata (`refusingDuplicates`) e chave estrangeira quebrada (`refusingBrokenLinks`) em 409 com a frase do catálogo, e `sameVersion` recusa a alteração feita sobre uma versão antiga do registro.
- Busca sem acento nem caixa: `contains()` em `lib/db/search.ts` usa a extensão `unaccent`. Toda busca nova usa essa função.

### 3.2 Sistema visual

- `design.json` tem o preset (`instrument`, `editorial`, `accessible`, `vivid`), trocas pontuais em `adjust` (só opções curadas: typeface, textSize, shape, density, elevation, motion, temperature, contrast, listadas em `scripts/tokens/preset-options.ts`), as seeds e os accents.
- `pnpm tokens` gera `styles/tokens.css` (cores e sombra), `styles/preset.css` (tipo, raios, tamanhos, movimento), `styles/print.css`, `app/fonts.ts` (o `next/font` só aceita chamada literal), `lib/accents.ts`, a paleta de e-mail e as tabelas do `DESIGN.md`. Os valores OKLCH do frontmatter do `DESIGN.md` ficam entre marcadores gerados e são conferidos pelo `tokens:check`.
- `scripts/check-design-tokens.ts` recusa classe padrão do Tailwind, cor escrita à mão e altura com nome.
- O contraste `reinforced` sobe texto secundário a 7:1 e borda de controle a 4,5:1. Um accent com `fixed: true` e `lightness` mantém o preenchimento exato nos dois temas; o gerador mede só o que se lê, e o texto sobre o preenchimento usa preto ou branco puro quando os neutros não chegam a 4,5:1.
- Paletas nomeadas em `scripts/tokens/palettes.ts`, verificadas com as simulações de daltonismo do `culori` e distância Oklab. Paleta de dados em `scripts/tokens/data.ts`: 8 tons categóricos, rampa sequencial no matiz da marca e polos divergentes; três tons claros ficam abaixo de 3:1, por isso todo gráfico tem tabela.
- Gráficos em `components/charts`, desenhados na largura real do contêiner, com botões transparentes por coluna para mouse e teclado e uma tabela equivalente; escala em `domain/charts/scale.ts`.
- Primitivos: `Size` e `Tone` vivem em `components/ui/styles.ts`, e cada primitivo declara o subconjunto que honra. O axe roda sobre o `/catalog` inteiro, então todo primitivo novo entra numa demo.
- Aparência por preferência (`lib/theme.ts`): tema, tamanho do texto, movimento e contraste viram atributo em `<html>` por um script antes da pintura, cada um com o seu cookie de nome simples. O tamanho escala a raiz (`112.5%`, `125%`), então tudo em rem acompanha. Sem escolha própria, `prefers-contrast: more` liga o contraste.
- Catálogo e snapshots: referências em `e2e/__snapshots__/<preset>-<tema ou densidade>-<seção>.png`, tolerância de 2% dos pixels, animações desligadas; seções com dado vivo saem por `snapshot={false}`. `pnpm catalog:presets` reinicia o app a cada preset, porque um servidor que trocou de preset sem reiniciar serve o anterior. As imagens valem para o mesmo navegador e sistema.
- Seletor de data: o campo digitado (`dd/mm/aaaa`) é o caminho rápido e o calendário é um botão ao lado; o valor é ISO ou vazio; `today` vem de fora.
- Site público: `Hero`, `ProofStrip`, `Showcase`, `ContentSection`, `Voices`, `Faq` e `ClosingBand` em `components/patterns`; a home da base é a amostra viva de todos, na ordem em que um produto costuma querer. Toda chamada é um `TrackedLink` (evento `cta_click { where }`, declarado na base). A imagem de compartilhamento aceita um `aside` (um desenho do produto em hex, ao lado do título), passado em `app/opengraph-image.tsx`.
- Face do documento: Source Serif 4 em todo preset (a mesma TTF que os PDFs embutem), gerada em `app/fonts.ts` com `preload: false`, token `font-document`, só dentro de `components/print` (o `lint:tokens` recusa fora). `<Sheet face="document" paper>` mostra um documento em qualquer página, claro em qualquer tema; `SheetHeader level` põe o título no nível certo da página. Os títulos dentro da folha herdam a face pela regra `.font-document :where(h1, h2, h3)`.
- Movimento do site público: `--animate-enter` sai do knob de movimento (480, 320 ou 560 ms); `enter-step-N` atrasa N passos de 80 ms; `reveal` usa `animation-timeline: view()` dentro de `@supports` e vira `animation: none` com movimento reduzido (o atributo e a mídia), porque uma animação presa à rolagem não obedece à duração de 0,01 ms. Numa captura de página inteira, o que tem `reveal` fora da vista sai invisível: é o começo da animação, não um defeito.
- Figuras: a chave do catálogo é o caminho pontilhado de uma folha do JSON (`lib/i18n/message-key.ts`); o `ArcGauge` arredonda coordenadas a milésimos.

### 3.3 Preferências, visitante e pessoa

- O registro (`lib/preferences/definitions.ts`) dá a cada preferência schema, fallback e, se a página precisa dela antes de pintar, o cookie. Fica tudo em `users.options` (jsonb), uma chave por vez com `jsonb_set`; ler passa pelo registro, então valor ausente, antigo ou inválido vira o fallback.
- `rememberOption` é a action única (limitada por endereço) e `claimVisitorData` reivindica o que o visitante guardou no navegador (`browser: true`, prefixo `visitor:` no `localStorage`); a conta vence. Ambas vivem em `lib/preferences/actions.ts` porque duas features as usam. O exemplo é o rascunho do contato (`useDraft`, salva quando a digitação pausa por 3 s).
- Fuso: a preferência `timeZone` vem do navegador (`ReportTimeZone`, uma vez por aba, só quando difere). `dateInZone` em `domain/calendar.ts`; telas da pessoa usam o fuso dela, admin e auditoria o do produto. O Playwright fixa `America/Sao_Paulo`.
- Primeiros passos: `onboardingSteps` em `domain/onboarding/steps.ts`, guardados na preferência `onboarding`. Argumento ICU numérico precisa de `{n, number}`, senão o tipo gerado o trata como texto.
- Aparelhos: no login próprio a lista vem da tabela `sessions` do better-auth, sem o `token`; com Clerk, o endereço do portal hospedado sai da chave publicável.
- Indicações: `users.referral_code` (12 caracteres, gerado pelo banco), tabela `referrals`, cookie `ref` `httpOnly` posto pelo proxy (30 dias), gravação no cadastro local e no fim de todo login; regras em `domain/referral/rules.ts`. A tabela fica fora da exportação de quem foi indicado.

### 3.4 E-mail

- Toda `EmailMessage` leva `category`; `domain/email/consent.ts` decide e `lib/ports/email/consent.ts` filtra os destinatários pela preferência `email` da conta. O padrão de conta nova é lembretes ligados e novidades desligadas. `sendEmail` devolve `sent`, `declined` ou `failed`.
- Descadastro sem tabela: `categoria:endereço` em base64url mais HMAC-SHA256 com propósito (`lib/unsubscribe/token.ts`). A porta manda uma cópia por destinatário com o link e os cabeçalhos `List-Unsubscribe` e `List-Unsubscribe-Post`. `POST /api/unsubscribe?token=` desliga sem tela; `GET` leva a `/descadastrar`. Endereço sem conta e conta que já desligou respondem igual.
- E-mails saem no idioma do destinatário (`emailTranslatorFor`): o salvo na conta, senão o do pedido que causou o envio; o aviso à equipe fica no idioma padrão.
- Anexos: `EmailMessage.attachments` (`filename`, `contentType`, `content`), mapeados no Mailtrap (base64, `disposition: attachment`) e no SMTP local. O total é limitado por `EMAIL_ATTACHMENTS_MAX_MB` (10) em `lib/ports/email/attachments.ts`; acima disso o envio é recusado inteiro e devolve `failed`, com os tamanhos no log. Quem anexa confere o mesmo teto antes, com `checkAttachments` de `domain/email/attachments.ts`, para mostrar o tamanho de cada arquivo. O limite do provedor vale para a mensagem codificada, cerca de um terço maior, e não foi lido na documentação do Mailtrap.
- Categoria `billing`: o que uma pessoa manda a outra sobre dinheiro devido (um lembrete de cobrança ao cliente). Chega a endereço sem conta, leva o link assinado de um clique e nunca vai a endereço que usou o link. Parar é uma linha em `email_suppressions` (endereço em minúsculas, sem dono, mantida depois que qualquer conta é apagada), porque endereço sem conta não tem preferência para desligar. `mayEmail(categoria, preferencias, suprimido)`; as outras três categorias não mudaram.
- Um e-mail que uma operação envia reivindica a linha antes de enviar, então dois disparos não mandam duas vezes; `declined` não devolve a reivindicação, `failed` devolve.

### 3.5 Cobrança

O catálogo (`domain/billing/catalog.ts`) é a única configuração do que se vende.

| O que | Onde e como |
|---|---|
| Níveis, recursos e limites | `tiers` (`free` obrigatório, `paid`), com `features`, `limits` e `extends`; `entitlementsOf(plano, agora)` é puro (`pending`, `canceled` ou trial vencido dão o `free`; `past_due` mantém) |
| Guardas | `requireFeature` e `hasFeature` (páginas e rotas), `actionFor(papel, { feature })`, `enforcePlanLimit` e `actionFor(papel, { limit })`; o limite usa o contador do rate limit (`plan:<limite>`, `user:<id>`) |
| Preços | por chave de busca (`paid_monthly`, `paid_yearly`, `paid_yearly_once`, `paid_lifetime`), lidos do Stripe com `'use cache'` e a tag `prices`; `price.*` expira a tag; um intervalo sem preço ativo some da oferta |
| Moedas | `currencies` (padrão BRL, `offered`); uma moeda só é oferecida se o preço tem `currency_options` nela, conferido no servidor |
| Intervalos | `monthly`, `yearly` (assinaturas), `yearly_once` e `lifetime` (pagamento único; o ano avulso tem fim e volta à gratuita) |
| Trial | 14 dias para assinatura, uma vez por conta, aviso por e-mail antes do fim; o fim vem do `created` do evento mais os dias da metadata da sessão |
| Pix | pendente (`pending`, nível ainda gratuito, o que se espera comprar em `priceKey`) até o dinheiro chegar; expirar ou falhar desfaz só o que está `pending`. Se o Pix estiver desligado no painel, o checkout sai sem ele |
| Disputa, reembolso | `disputed` com log em ERROR até um reembolso decidir; reembolso total devolve à gratuita |
| Cupom e indicação | `allowPromotionCodes` (o cupom é criado no painel do Stripe); `referralCredit` vira saldo do cliente, que só abate fatura de assinatura |
| Rastro | `checkout_sessions` (aberto, pendente, pago, expirado, falhou) com a origem do paywall; funil `paywall_viewed`, `checkout_started`, `checkout_completed`, `payment_confirmed` |
| Pagamentos | `payments`, uma linha por cobrança do `charge.succeeded`, reembolso parcial ou total na mesma linha; `payerId` é `authoredBy`; entra na exportação; o admin mostra o prazo de arrependimento (`domain/billing/withdrawal.ts`, 7 dias) |

Eventos tratados: a skill `new-payment-event`. Operações diárias de cobrança: `expire-fixed-terms`, `warn-expiring-terms`, `remind-abandoned-checkouts`, `grant-referral-credits`. O serviço devolve `effects` para o webhook agir depois do commit. O reembolso de quem foi indicado não estorna o crédito já concedido.

### 3.6 Admin, observabilidade e operações

- "Números" (`/admin/numbers`): cadastros, receita líquida e reembolsos (só BRL), pagantes por plano, cortesias e cancelamentos, por 7, 30 ou 90 dias no dia de São Paulo.
- "Saúde" (`/admin/health`) lê só o Postgres: a última execução de cada trabalho (`job_runs`, estado de `domain/operations/job-health.ts` contra a janela de `ops/gcp/heartbeats.json`, a mesma do alarme), o último webhook de cada provedor e o banco (tempo, versão, tamanho, migrations).
- Erros saem no formato do Cloud Error Reporting (`serviceContext` com `SERVICE_NAME` e `SOURCE_COMMIT`). `pnpm gcp:alerts` mantém o alarme de enxurrada, um de trabalho parado por linha de `heartbeats.json` e o uptime check do `/health`.
- Agendamento: o registro (`lib/scheduled/registry.ts`) dá a cada operação a sua cadência; `pg_try_advisory_lock` numa conexão reservada impede duas execuções ao mesmo tempo, e a que acha a anterior viva marca `skipped`. O segredo é conferido antes do grupo (401 antes de 404).
- Ingestão (`/api/ingest/<fonte>`, `lib/ingest/`): um segredo por fonte em `INGEST_SECRETS`; ordem segredo, limite (1200 por hora), corpo (1 MB), JSON e schema `.strict()`; fonte desconhecida e segredo errado respondem 401 igual. `apply` é idempotente.
- Rate limit em Postgres (`lib/rate-limit`): uma linha por janela fixa, chave em hash (nenhum IP guardado), `upsert` que devolve a contagem. O endereço vem de `clientAddress` segundo `TRUSTED_PROXY`. Em desenvolvimento, `delete from rate_limits` zera os contadores.
- Analytics: o catálogo (`lib/analytics-events.ts`) recusa propriedade com nome de dado pessoal (provado por `lib/analytics-events.type-test.ts`). O servidor envia por `fetch` ao `/api/send` do Umami depois da resposta, com User-Agent vazio, porque o filtro de robôs do Umami responde `{"beep":"boop"}` a todo User-Agent que não é de navegador (o "HeadlessChrome" do Playwright também). O `identify` do navegador vale só para a página aberta, então `IdentifyAccount` roda no shell logado. Web Vitals com amostra de 10%.
- `pnpm umami` (Umami 3): relatórios em `/api/reports`, link público pelo `shareId`, credenciais em `.env.umami`.
- Segurança: cabeçalhos fixos no `next.config` com a lista do produto em `lib/security/headers.ts`; a CSP vai em Report-Only, montada a partir de `lib/security/sources.ts`, sem nonce (por isso `'unsafe-inline'`), só com `report-uri`. O zod roda com `jitless: true`, senão cada página relataria um `eval` recusado.

### 3.7 Idiomas

Um segundo idioma é opt-in (README): o catálogo, a lista em `lib/i18n/locales.ts` com o `localeStatus`, e `export const instant = false;` no `app/layout.tsx` (o Next exige o literal, e ler o cabeçalho no layout raiz sem ele quebra o build). Com um idioma só, nada lê o pedido e a casca fica estática. Peças: `lib/i18n/negotiate.ts` (prefixo, cookie `NEXT_LOCALE`, `Accept-Language`, padrão), o proxy (reescreve `/en/x` para `/x` e manda `x-app-locale`), `lib/i18n/request.ts`, `features/language`, `scripts/check-catalogs.ts`. Idioma incompleto: `reportCatalog` conta o que falta e `withFallback` completa com o pt-BR. Os outros idiomas usam os endereços de rota sob o prefixo; o português sob o prefixo leva 301 para eles. A base não traz um segundo idioma; o mecanismo é provado em teste de unidade e por `e2e/language.spec.ts`, que pula com um idioma só.

### 3.8 Configuração do produto

`pnpm setup:product` (`scripts/setup-product.mts`, lógica testada em `scripts/setup-product/`) escreve nome, descrição, público, tom, superfícies, retenção do backup, portas, preset e cor no catálogo, `package.json`, README, `DESIGN.md`, `design.json`, compose e documentos que citam porta; roda `pnpm tokens`, `pnpm messages`, formata e roda o `pnpm check`. Acha as linhas pela estrutura, então pode rodar de novo. Rejeita travessão, campo vazio e matiz a menos de 25 graus do verde. Avisa para refazer as referências do catálogo quando o preset ou a cor mudam. Os serviços externos vão para `.env.integrations` (não `.env.local`, que o compose ignora). Se um trecho novo do repositório carregar o nome do produto, ensine o script a escrevê-lo e o `apply.test.ts` a conferir.

### 3.9 API, documentos e impressão

- API pública: `app/api/v1/*` atrás de tokens pessoais (`exb_` mais 32 bytes, só o hash em `api_tokens`, no máximo dez em vigor, último uso gravado no máximo uma vez por minuto). `apiRoute`, `apiWrite` e `apiPreflight` em `lib/api/route.ts`; limite de 600 por hora por token; `Cache-Control: no-store`. Sem OpenAPI gerado.
- PDF e QR só em `lib/documents/`: `renderPdf`, `qrPngDataUri`, `qrSvg`; cores do `emailPalette` em hex; fonte TTF de `assets/fonts/` (Source Serif 4, OFL), declarada em `outputFileTracingIncludes` junto com as fontes padrão do pdfkit.
- Idioma do documento (`lib/documents/languages.ts` guarda só a lista, `lib/documents/language.ts` os catálogos): lista própria, `pt-BR` e `en`, escolhida por documento e separada dos idiomas da interface. O português é a área `documents` do catálogo; o inglês é `messages/documents.en.json`, que não liga o roteamento por idioma. Um teste exige as mesmas chaves e argumentos e recusa valor em inglês igual ao português. Dinheiro e data seguem o idioma do documento: `formatMoney(valor, idioma)` de `domain/money/format.ts` e `formatDate(dia, idioma)`.
- Documento verificável: o QR aponta para `/verificar/[slug]`, com `tipo:id` assinado por `DOCUMENT_SECRET`; endereço forjado é 404, nada fica guardado. O recibo sai de `payments` em `/account/receipts/[id]` e nunca é gravado.
- Impressão: `styles/print.css` (folha, `@page` A4 com `counter(page) / counter(pages)` na margem, paleta clara em `data-paper`, tinta sobre papel em `@media print`); grupo `app/(print)` com casca própria; `components/print`. O exemplo é `/print/contacts/[id]`.

### 3.10 Áreas de registro e o gerador

- `sample-items` é uma área real (tabela do dono, regras, lista, ficha, formulário, exclusão, quatro páginas, textos, navegação, integração e e2e). Toda área nasce com a unicidade `(owner_id, id)`, para uma área filha apontar para ela, e com a exclusão recusada com 409 (`<entidade>HasLinks`) enquanto houver registro ligado.
- `sample-parts` é a segunda amostra viva, filha de `sample-items`: chave composta com o dono repetido (o banco recusa pai de outra conta), recusa de pai ausente (`<entidade>ParentMissing`), leitura com o nome do pai, busca pelo nome do pai, escolha do pai com `FormComboboxField`, formulário que começa sob o pai com `?parent=<id>`, e a seção dos filhos na ficha do pai.
- As cópias ficam em `scripts/new-crud/sample/`, fora do typecheck, do lint, do knip e dos testes; um teste exige cada cópia igual à amostra viva, e `pnpm new:crud --sync-sample` refaz as cópias. A cópia da ficha do pai fica sem as duas linhas da filha.
- `pnpm new:crud <área>` troca o nome da amostra em todas as formas (kebab, snake, Pascal, camel, em palavras, o rótulo) e grava as linhas de registro depois de âncoras fixas (`lib/db/schema.ts`, `lib/db/personal-data.ts`, `lib/navigation.ts`) e as chaves nos catálogos. A primeira área de um produto remove as duas amostras, numa migração gerada depois da migração da área nova.
- `pnpm new:crud <área> --parent <pai>` troca primeiro os nomes da filha e depois os da primeira amostra pelos do pai (entidade lida de `export type <Entity>Row`, rótulo de `nav.json`), confere que o pai tem `name` e a unicidade `(owner_id, id)`, insere duas linhas na ficha do pai (ou as imprime, se a ficha mudou) e põe a navegação logo abaixo da do pai.
- O `pnpm verify` gera uma área e uma filha num produto nascido como o do `create-next-app` e roda check, integração e e2e sobre elas.

### 3.11 Dinheiro em várias moedas, câmbio e séries

- `domain/money`: `Money` é `{ minor, currency }`, inteiro seguro de unidades menores mais o código ISO 4217 em maiúsculas. As casas vêm do expoente da moeda (JPY 0, KWD 3, CLF 4, o resto 2; a tabela segue a norma e difere do CLDR só em IQD, o que um teste prova). O texto sai de um decimal exato, sem float, e a leitura é estrita: mais casas do que a moeda tem é recusado, não arredondado. `Cents` e `lib/money.ts` continuam para o que é só em reais; a conversão é na borda, e códigos de preço em minúsculas viram maiúsculas ao entrar.
- Colunas de dinheiro novas devem ser `bigint`, não `integer`: IDR passa de 2,1 bilhões de unidades menores com R$ 21 milhões de rupias.
- `domain/exchange`: dias do calendário sem relógio (`dates.ts`), política de qual dia e qual lado da cotação (`policy.ts`, padrão: venda do dia anterior à emissão) e conversão exata por cotação decimal, arredondando uma vez, metade para longe de zero (`convert.ts`).
- Porta `exchange-rate` (`lib/ports/exchange-rate`): uma fonte, o PTAX do Banco Central, sem chave, com prazo de 2,5 s; fonte que falha vira `unavailable`, que é resposta. O endpoint de período devolve todos os boletins e o de fechamento é escolhido pelo início do rótulo (`Fechamento`). Provado contra o serviço real em 2026-10-12 (formato dos campos e dia sem cotação). `lib/exchange-rate/service.ts` guarda a cotação em `exchange_quotes` (uma cotação publicada não muda), olha o dia e os nove anteriores numa só chamada e lembra um dia passado sem fechamento, para um fim de semana não ser perguntado de novo. O hoje entra por parâmetro.
- Séries numeradas: `number_sequences` guarda o último número por pessoa e série; `nextNumber(executor, ownerId, serie)` é um upsert que trava a linha até o fim da transação de quem chama, então chamadores concorrentes esperam a vez e uma transação desfeita devolve o número. Chame dentro da transação que usa o número. `domain/sequences/number.ts` escreve `INV-0008` e lê de volta; a série é maiúsculas, dígitos e hífens simples, começando por letra.
- CNPJ com letras desde 2026: `maskCnpj` e `cnpjSchema` (`isValidCnpj` com `version: 2`, que lê numérico e alfanumérico), devolvendo catorze maiúsculas e dígitos.
- Arquivo ligado a um registro: `files.subject_type`, `files.subject_id` e `files.kind`, sem chave estrangeira, porque a base não conhece as tabelas do produto. `listFiles(db, dono, registro)` filtra por dono e registro; `removeFilesOf` apaga bytes e linhas quando o registro vai embora. O limite de tamanho já era por chamada, então um plano mais baixo passa um `limitsFrom` menor.

## 4. Como se prova

- `pnpm check`: tipos (com `next typegen`; `tsc --noEmit` sozinho não basta), Biome, tokens, migrations, catálogos, knip, testes de unidade com cobertura de 90% em `domain`.
- `pnpm test:integration`: regras contra Postgres real. Webhooks do Stripe com eventos assinados à mão lidos pelo adaptador real.
- `pnpm test:e2e`: o Playwright contra o build de produção (troca o app do compose pela imagem e devolve o de desenvolvimento no fim), com axe (WCAG 2.0, 2.1 e 2.2, A e AA) nos dois temas. `workers: 1`. `pnpm test:clerk`: modo Clerk, com chaves de desenvolvimento.
- `pnpm verify` (`scripts/verify.sh`): check, integração, a imagem de produção contra um Postgres descartável (com o `canonical`, o 301 do endereço de rota, o 404 de documento forjado e as fontes do PDF na imagem), a área e a filha geradas num produto novo, e a suíte do navegador num compose limpo. Apaga tudo no fim, mesmo com falha, e recusa começar com as portas do compose ocupadas.
- **A suíte e2e é escrita para o compose limpo:** sem provedor de pagamento, arquivos em disco e o admin no plano gratuito. Os testes que dependem desse estado (`e2e/environment.ts`: `billingIsOff`, `accountIsFree`) perguntam antes e pulam dizendo o motivo. O banco do compose sobrevive entre execuções: specs usam nomes únicos.
- **Provar com chaves:** um arquivo de override fora do repositório (`docker compose -f docker-compose.yml -f <arquivo>.yml up -d --force-recreate app`). Para o webhook do Stripe, `stripe listen --api-key <chave de teste> --forward-to localhost:47300/api/webhooks/stripe`; ele imprime o segredo de assinatura, então mande a saída para um arquivo e apague. Para assinar um evento sem o painel, `stripe.webhooks.generateTestHeaderString` com o segredo do `.env.local`.
- A conta de teste do Stripe do `.env.local` tem os quatro preços (BRL e USD) e o Pix ligado.

## 5. Armadilhas

**Next e React**
- Um Server Component não cria `onClick`: o `Button` é `"use client"`.
- `typedRoutes` não aceita rota `[[...rest]]`: o Clerk usa `routing="hash"`.
- `new Date()` e `Math.random()` na pré-renderização são recusados: `connection()` antes, relógio por parâmetro.
- O ambiente lido no prerender fica na imagem, que é construída sem variável nenhuma. O que muda o que uma página mostra (provedor de auth, analytics, `APP_URL` no `canonical`, sitemap e `robots.txt`) é lido por pedido, depois de `connection()` ou dos `searchParams`, dentro de `<Suspense>`. No modo Clerk, o `ClerkProvider` estático exige a chave publicável no build, e o boot recusa `AUTH_PROVIDER` diferente da imagem.
- `notFound()` responde 200 em produção com Cache Components (vercel/next.js#98518); o servidor de desenvolvimento responde 404. Os specs conferem a tela e o `noindex`; o 404 de endereço público é do proxy.
- Em produção o Next passa a requisição reescrita pelo proxy uma segunda vez, no endereço da rota; o proxy marca a reescrita com `x-public-address` e não redireciona o que vem marcado.
- Uma página pública com `buildSocialMetadata` precisa do `<RuntimeMarker />` dentro da própria página (num layout acima não resolve), senão o servidor de desenvolvimento loga erro a cada visita e trava.
- O proxy trunca corpo acima de 10 MB: `experimental.proxyClientMaxBodySize` e rejeição antecipada pelo `Content-Length`.
- `as` no `<Link>` não faz nada: o `href` sai de `publicHref`, e um teste recusa a rota escrita à mão. Um 301 fica guardado no navegador: renomear um caminho público publicado exige manter o antigo no mapa.
- `'use cache: private'` vaza memória no servidor de desenvolvimento (cerca de 1 MB por pedido; em produção é plano): o `getCurrentUser` usa a diretiva só em produção.
- `next-intl` trata `.` em chave como aninhamento.
- `react-hook-form` só avisa o componente que leu o estado: campo filho usa `useFormState`.
- `experimental.sri` não fica ligado: só parte dos `<script>` de uma página prerenderizada leva `integrity` (os chunks do fluxo do React saem sem hash), então ele não substitui `'self'` na CSP.

**Webpack**
- Compila dentro de cada rota tudo o que ela importa estaticamente, em cada camada, enquanto um `import()` vira um chunk compartilhado. O que os layouts e os arquivos raiz alcançam é pago por toda rota (regra no `AGENTS.md`). Um módulo com função `"use cache"` é compilado em toda página que o alcança, mesmo por `import()`.
- O `next.config.ts` desliga o descarte de rotas do dev (`onDemandEntries`): recompilar a mesma rota acumula memória, porque o Next não descarrega módulos do servidor. O cache em disco do webpack fica desligado no dev pelo mesmo motivo.
- O `instrumentation.ts` também é compilado para o edge: código de Node fica dentro de `if (process.env.NEXT_RUNTIME === "nodejs")`, com a forma pontilhada e o import dentro do bloco.
- Os SDKs do Google leem os próprios arquivos em tempo de execução: ficam em `serverExternalPackages`.
- O build confere o segundo argumento de cada handler de rota contra o `RouteContext`: contexto opcional reprova. Rota sem parte dinâmica recebe `params` indefinido.
- MDX precisa de `mdx` em `pageExtensions`, senão o artigo carrega o runtime de JSX errado.
- O pdfkit carrega as fontes padrão pelo mapa `imports` do próprio `package.json`, que o rastreador do standalone não segue: a rota de recibo lista a pasta em `outputFileTracingIncludes`.
- As faces Atkinson Hyperlegible (preset `accessible`) não estão na tabela de métricas do `next/font`: o `pnpm tokens` as gera com `adjustFontFallback: false`.

**Drizzle e Postgres**
- `drizzle-kit generate` pergunta "criada ou renomeada?" quando a mesma migração acrescenta e tira colunas, enums ou tabelas; sem terminal, imprime o erro e sai com sucesso, sem migração. Troque campos em duas migrações (acrescentar, depois tirar). Quem roda o gerador de um script confere que o arquivo apareceu (o `new:crud` faz isso). Os snapshots saem sem formatação, e o lint os lê.
- O drizzle-kit escreve uma chave estrangeira nova antes de uma unicidade nova na mesma migração, e o Postgres recusa: a unicidade vem numa migração anterior.
- Numa subquery em `sql\`...\``, o Drizzle deixa a coluna sem o nome da tabela e o Postgres a resolve na tabela de dentro: escreva a correlação com nomes completos.
- Uma chave estrangeira sem `onDelete` é checada no fim do comando, então apagar a conta leva pai e filho juntos pela cascata.
- Default volátil em `ADD COLUMN` é avaliado por linha (o `referral_code` de cada conta é diferente).
- `group by` com o fuso como parâmetro agrupa por posição (`group by 1`), porque dois parâmetros não casam como uma expressão.
- Duas correntes de migração, separadas em 15/10/2026: a da base (`lib/db/migrations`, tabela `drizzle.__drizzle_migrations`, `pnpm db:generate:base`, só os arquivos de `lib/db/base-schema.ts`) e a do produto (`lib/db/product-migrations`, tabela `drizzle.__product_migrations`, `pnpm db:generate`, todo o resto de `lib/db/schema/`). O migrator do drizzle só aplica migração mais nova que a última registrada (`created_at < folderMillis`), então um journal só, num produto que faz merge da base, pularia em silêncio uma migração da base gerada antes da última do produto. A chave estrangeira de uma tabela do produto para uma da base sai certa sem a tabela da base no snapshot do produto.
- `drizzle-kit generate --custom` copia o snapshot anterior, não o schema atual. Para tirar tabelas do snapshot sem mexer no banco (as amostras saindo da corrente da base, `0024`, e entrando na do produto, `0000`), gera-se a migração normal e troca-se o SQL por um `SELECT 1;` comentado.
- Um banco migrado numa corrente só (o Faturis até 15/10/2026) é reconhecido na subida: há registros na tabela da base que não são da base. As migrações do produto que ele já tem vêm de `lib/db/adopted-migrations.product.json`; são registradas sem rodar, e os registros antigos saem da tabela da base, numa transação, sob o lock. Sem a lista, a subida recusa em vez de adivinhar. Provado no banco de desenvolvimento do Faturis: schema `public` idêntico antes e depois, e um banco novo com as duas correntes dá o mesmo schema, fora a ordem das colunas.

**TypeScript e Biome**
- Com `noUncheckedIndexedAccess` e o `noUnnecessaryConditions` do Biome, dê ao objeto o tipo que ele tem em vez de silenciar um dos dois.
- O `noSecrets` do Biome mede a entropia das strings e confunde chaves de erro com segredo conforme o nome da área. Ele fica desligado só nas regras das áreas (`lib/*/records.ts`) e nos testes de integração, onde essas chaves aparecem.
- O peso do catálogo no `tsc` cresce pouco com o número de chaves; se um produto passar de dezenas de milhares, tipe só as áreas que o arquivo usa.

**Testes e ambiente**
- Depois de uma navegação no cliente, o Next mantém a página anterior escondida no DOM: specs usam `getByRole` com `exact`, ou `.filter({ visible: true })`. `networkidle` antes de clicar. `browser.newContext` herda o `storageState` do projeto: passe um vazio.
- O preço aparece com espaço sem quebra (`R$ 29,00`).
- O axe recusa região rolável sem foco: a `<main>` do shell tem `tabIndex={0}`.
- A seta do `RadioGroup` do Radix só marca por foco em navegador de verdade; no happy-dom o teste confirma o foco e o Espaço.
- O `wget` da imagem `node:24-alpine` é o do BusyBox, sem `--method`: `--post-data=''` faz o POST.
- Log pino: um campo `message` no objeto colide com o da linha; o relatório do navegador usa `errorMessage`.
- `docker compose up --force-recreate` mantém os volumes anônimos, inclusive o `.next`; para compilação fria, `-V`. Um log do Playwright MCP gravado dentro do projeto faz o servidor recompilar em laço: apague `.playwright-mcp`.
- Com Clerk ou Stripe ligados, o servidor de desenvolvimento loga erros do validador `instant` (`Could not validate instant ...`); as páginas respondem 200 e as suítes passam.
- O hook de commit precisa de Node 24 no shell.
- A numeração de página por CSS funciona no Chromium; Safari e Firefox não desenham caixas de margem. O que precisa de número em qualquer navegador é PDF.

## 6. Estado

**Provado contra serviços reais:** Clerk (instância de desenvolvimento, `pnpm test:clerk`), Stripe (chaves de teste: checkouts, portal, cancelamento, reembolso, webhook), Google Cloud Storage e Logging (envio, link assinado, link adulterado recusado), `pnpm gcp:alerts` e `pnpm gcp:access-log` (alarme de enxurrada e de trabalho parado chegando por e-mail; o sink de acesso leva alguns minutos para valer), Umami 3 (envio pelo servidor e relatórios), e um produto criado pelo `create-next-app --example` contra o repositório público, com `setup:product`, áreas geradas e `pnpm verify` verde.

**Provado só em teste:** anexos do Mailtrap (o corpo do pedido é testado com um fetch falso, sem chamada real; o limite de tamanho do provedor não foi lido); o envio com anexos ao Mailpit.

**Não provado:** o caminho no Coolify com um banco de verdade; o uptime check (precisa de `APP_URL` público); numeração de página em Safari e Firefox.

**Do dono, para destravar:**
- Servidor real atrás do Traefik ou da Cloudflare: IP e porta de origem do cliente (Marco Civil, rate limit), número de réplicas e custo da escrita por requisição.
- Coolify: subir a imagem com um banco de verdade.
- Renovate: instalar o app hospedado no repositório; a configuração está pronta.
- Stripe de produção: criar os preços com as chaves de busca de `domain/billing/catalog.ts` e apontar o webhook.

**Espera um consumidor** (o knip recusa código sem uso): `generateSitemaps` em partes de 50 mil; port `indexing` com IndexNow; linha e heatmap nos gráficos.

**É de cada produto:** URLs antigas no mapa de endereços; JSON-LD de domínio; FAQ e glossários; acesso por nível com `features` e `limits`; arquivos pagos; as figuras de domínio; um segundo idioma de verdade; o texto real de termos, privacidade e home; o estorno do crédito de indicação, se quiser.

**Fica para quando valer a pena:** telas da equipe sobre os dados das contas, foto de registro, auditoria das edições do dono, exportação CSV. O teste de teclado do seletor de data (`components/ui/composition.test.tsx`) pode travar com a máquina sob carga.

**Decidido contra:** Google Indexing API (só serve a `JobPosting` e `BroadcastEvent`); mutation testing; OpenAPI gerado (entra com o primeiro cliente de fora que o peça); experimentos A/B; Mercado Pago; Sentry; S3; Turbopack.

**Depende de tempo em produção ou de terceiros:** ligar a CSP de verdade depois de um período sem violações inesperadas; rever o `experimental.sri` quando o Next cobrir os chunks do fluxo.

## 7. Como evoluir

1. Leia `AGENTS.md` e, para trabalho visual, `DESIGN.md`.
2. Escolha a skill da receita (`.claude/skills`) e copie o padrão do módulo de referência.
3. Mudança de schema: `pnpm db:generate`, nunca edite migration; o `lint:migrations` confere.
4. Toda regra nova tem teste de integração contra banco real, inclusive os caminhos de recusa.
5. SDK novo só em `lib/ports/<porta>/adapters`; a fronteira está no `biome.json`.
6. Não crie exceção no Biome ou no knip para fugir de regra; exceção só com o motivo escrito, quando a regra briga com uma biblioteca.
7. Código sem consumidor espera quem o consuma.
8. Mudou uma amostra (`sample-items` ou `sample-parts`): `pnpm new:crud --sync-sample`.
9. Antes de entregar: `pnpm verify`.

## 8. Higiene

**Conferência antes de publicar.** Deve voltar vazia; só o `BASE.md` é excluído:

```sh
grep -rnE "lottery|solmiza|\bbrb\b|acolhimento|violao|exata-ui|gstack|/Users/|LEFT\.md|CONTRATO|PLANO\.md|projects/my|brazil/" . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next --exclude-dir=test-results \
  --exclude=pnpm-lock.yaml --exclude=tsconfig.tsbuildinfo --exclude=BASE.md -I
```

O padrão usa `brazil/` com a barra porque `@brazilian-utils` é dependência legítima.

**Histórico de construção.** A `main` publicada começa num único commit. O histórico anterior (fases, registros, documentos de trabalho, tag `pre-hygiene-docs`) está só no bundle `/Users/thiago/projects/my/exata-bundle/exata-base.bundle`, fora do repositório; leia com `git clone <bundle> /tmp/exata-historia`.
