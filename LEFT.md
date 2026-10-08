# Pendências comuns (lottery e solmiza)

Arquivo temporário. Lista o que falta na base e serve para portar tanto o lottery quanto o solmiza.

## Estrutura

### Camada para engines de domínio

Matemática de prêmios, fechamentos e gerador no lottery; teoria musical, exercícios e áudio no solmiza.

**Decisão:** pasta nova `domain/<área>/`, abaixo de `lib`. Fica descartado colocar em `lib/<área>/`, porque mistura com os serviços que usam o banco e um componente cliente pode puxar código de servidor. Fica descartado também um pacote separado no workspace, que é exagero para um único consumidor.

- [ ] Override no `biome.json`: `domain/**` não importa nada de `@/` (nem `lib`, `ports`, `db`, `app`, `components` ou `features`), nem React.
- [ ] Ajustar a mensagem "lib is the lowest layer". `lib` e componentes podem importar `domain`, e o contrário não.
- [ ] Linha nova na tabela "Where things go" do `AGENTS.md`.
- [ ] Relógio e aleatoriedade sempre como parâmetro (`now` e um gerador com semente).
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
- [ ] As chaves de `outputFileTracingIncludes` são globs de rota. Páginas totalmente estáticas e rotas Edge não recebem os arquivos. Confirmar que a rota que lê tem trace de servidor sob `cacheComponents`.
- [ ] Arquivos pagos (WAVs do solmiza) não vão para `public/`. Ficam atrás de uma rota com guarda.
- [ ] **Validar:** `pnpm build`, conferir os arquivos em `.next/standalone/` e subir a imagem Docker.

### Rate limit

**Decisão:** tabela de contadores no Postgres (upsert por janela de tempo), exposta como opção do `actionFor` e como uma função para route handlers. Ficam descartados:
- em memória, que zera a cada deploy e não funciona com mais de uma réplica;
- Redis, que é infraestrutura nova;
- só na borda, que não sabe de plano nem de usuário.

- [ ] A mesma tabela serve aos limites de uso por plano (`usage` do lottery).
- [ ] Uma operação diária apaga as janelas antigas.
- [ ] Helper confiável de IP do cliente. Hoje `app/api/client-errors` pega o **primeiro** valor do `X-Forwarded-For`, que quem chama controla. É preciso o valor acrescentado pelo proxy de confiança (o Traefik do Coolify), normalmente o último.
- [ ] **Validar:** o IP real no Coolify, o número de réplicas e o custo de uma escrita por requisição nas rotas públicas mais acessadas. Se pesar, colocar limite na borda como primeira barreira.

## Design system

**Diagnóstico:** o `BASE.md` fixou que o produto só troca as cores. O resto é fixo: fonte Onest, raios 10/14/18, densidade, alturas escritas no `components/ui/styles.ts` (`h-11`, `h-12`, `w-[520px]`), sombra e movimento. Isso protege contra interfaces genéricas, mas deixa todo produto parecido, e o solmiza e o lottery não cabem.

**Decisão:** presets curados. O produto deixa de só trocar 2 sementes e passa a escolher entre botões curados, todos passando pelo mesmo verificador. Continua fechado, gerado e medido.

- [ ] Reescrever a regra no `BASE.md` e no `DESIGN.md`. Os presets mantêm a intenção anti-clone, porque o produto escolhe entre opções curadas e não cola uma pele.

### 1. Arquitetura em 3 camadas

| Camada | O que é | Quem mexe |
|---|---|---|
| Botões do produto | `design.json` no lugar do `colors.json`: cor, tipografia, forma, densidade, movimento, paletas extras | O produto, via `setup:product` |
| Tokens semânticos | `ink`, `surface`, `brand`, `accent`, `control-height`, `radius-panel`… gerados e medidos | O gerador, nunca à mão |
| Componentes | Consomem só tokens semânticos | A base |

- [ ] **Tokenizar as dimensões** que hoje estão escritas nos componentes: altura de controle, de linha e de campo, padding de painel, largura de diálogo. É pré-requisito de densidade e forma.

### 2. Botões

- [ ] **Cor**
  - Manter as sementes brand e neutral.
  - Adicionar a **temperatura do neutro** (mais chroma e offset para papel quente).
- [ ] **Accent com escopo**
  - Tokens `accent`, `accent-wash`, `accent-ink` e `on-accent`. Um `data-accent="<nome>"` no contêiner troca o tom ali dentro.
  - Usos: o jogo no lottery; a função harmônica ou o nível no solmiza; categoria, setor ou cliente em outros produtos.
- [ ] **Cor oficial fixa como entrada** (hex da Caixa):
  - o tom puro só como decoração;
  - o gerador calcula `-ink` e `on-accent` com contraste medido nos dois temas;
  - isso resolve a exceção da Timemania sem escrever nada à mão.
- [ ] **Paletas de domínio nomeadas** (`material.wood`, `material.string`, `tone.tonic`, `tone.dominant`):
  - cada cor passa pelo verificador e vira token;
  - o `check-design-tokens` passa a aceitar essas classes.
- [ ] **Paleta de dados:** categórica (cerca de 8 tons com luminosidade equilibrada, distinguíveis por quem tem daltonismo), sequencial e divergente, nos dois temas.
- [ ] **Tipografia:**
  - par de fontes de uma lista curada (sans neutra, humanista, serifada editorial, hiperlegível), mais a mono para números;
  - o gerador escreve o arquivo de fontes, porque o `next/font` exige chamadas literais;
  - `font-serif` proibido só quando o par escolhido não tem serifa;
  - corpo de 17 ou 18;
  - escala de fonte do usuário como variável CSS.
- [ ] **Forma:** eixo `sharp | soft | round` que multiplica a escala de raios, mais o peso das bordas.
- [ ] **Densidade:** `compacta | média | confortável` (altura de controles, linhas e ritmo).
- [ ] **Elevação:** sombra ou borda nas camadas.
- [ ] **Movimento:** `calmo | vivo` (duração e easing). O "Salvo" continua como o momento autoral.

### 3. Presets

Combinações completas e testadas. O produto escolhe um preset mais as sementes e pode ajustar um botão ou outro.

- [ ] **Instrumento:** o atual, operacional e denso.
- [ ] **Editorial:** serifado, neutro quente, raios suaves e mais respiro. Serve ao solmiza, a conteúdo e a cursos.
- [ ] **Acessível:** hiperlegível, corpo 18, alvos maiores e contraste reforçado. Serve ao lottery e a públicos amplos.
- [ ] **Vivo:** raios maiores, accent forte e movimento presente. Serve a consumo e a produtos lúdicos.
- [ ] O preset vira pergunta do `setup:product`, e o `DESIGN.md` é gerado com a seção do preset escolhido.

### 4. Componentes que faltam

- [ ] **Primitivos** sobre Radix em `components/ui`: tabs, stepper, date picker, slider, progress/meter, accordion, checkbox, radio e switch (se faltarem), skeleton, chip removível e breadcrumb.
- [ ] **Padrões do site público:** hero, seções de conteúdo, tabela de preços, FAQ e um **layout de leitura (prose)** com tokens próprios (`/aprenda` do lottery, glossário do solmiza).
- [ ] **Gráficos em SVG** (`components/charts`): barras, linha, sparkline, heatmap e stat tile, usando a paleta de dados, sem biblioteca pesada.
- [ ] **Figuras de domínio** (`components/figures`): fretboard, bolas e volante, com `color-mix(in oklch, var(--color-x) N%, transparent)` permitido sobre tokens.
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

- [ ] **Validar com uma prova pequena antes:**
  - se `data-accent` com variáveis CSS funciona bem com o `@theme` do Tailwind 4;
  - se o `next/font` aceita o arquivo de fontes gerado pelo setup;
  - se o gerador acha variantes legíveis no tema escuro para todas as cores oficiais da Caixa.

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

Fora de escopo: nota fiscal (resolvida fora da base) e a migração das assinaturas do Mercado Pago do lottery (outro problema).

### 1. Catálogo de planos e direitos

- [ ] Catálogo tipado em `domain/billing/catalog.ts`, preenchido pelo produto: níveis com `features`, `limits` e `extends`, e preços apontando para `lookup_key` do Stripe (`"premium.monthly": "premium_monthly"`).
- [ ] `entitlementsOf(plan, now)` devolve recursos e limites, e substitui o `grantsAccess`.
- [ ] Guardas: `requireFeature("x")` em página e route, e `actionFor(role, { feature })` em action.
- [ ] Os limites por plano usam a tabela de contadores do rate limit.
- [ ] O acesso por nível do solmiza vira um recurso (`levels.all`) ou um limite (`maxLevel`), com o mesmo mecanismo.
- [ ] **Paywall** como componente de padrão, apoiado nessa guarda do servidor.

### 2. Estado neutro de provedor

- [ ] `plans`:
  - `tier` com os nomes do catálogo;
  - `status` com `trialing | active | past_due | pending | canceled`;
  - `provider`, `providerCustomerId`, `providerSubscriptionId`, `priceKey` e `trialUsedAt`.
- [ ] `stripe_events` vira `payment_events`, com a coluna `provider`.
- [ ] Migração das colunas atuais. A recomendação continua sendo só Stripe, mas as regras deixam de depender dele.

### 3. Preços e moedas

- [ ] Preços por `lookup_key` lidos do Stripe (com cache), no lugar de `STRIPE_PRICE_*` em env. Trocar o preço passa a ser feito no painel, sem deploy.
- [ ] Preço do par nível + intervalo, não só do intervalo.
- [ ] Várias moedas com o `currency_options` do próprio Price: o Checkout escolhe a moeda pelo IP. Isso substitui o `price_data` inline e o token de moeda assinado do solmiza.
- [ ] A exibição em BRL continua sendo a padrão. Mostrar outra moeda é uma opção do produto.

### 4. Pix para pagamentos únicos

A documentação do Stripe diz que uma conta Stripe brasileira aceita Pix **só em pagamento único**. O Pix Automático (recorrente) não está disponível para contas no Brasil.

- [ ] Pix no checkout em `mode: "payment"`: anual avulso e vitalício. Ligar o Pix no painel (métodos dinâmicos) e garantir que todos os itens estejam em `brl`.
- [ ] O mensal recorrente fica no cartão.
- [ ] **Decisão:** oferecer os dois. Anual como assinatura no cartão (renova sozinho) e anual avulso no Pix ou cartão (sem renovação). O intervalo do catálogo distingue `yearly` (assinatura) de `yearly-once` (avulso).
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

- [ ] Tabela `payments` alimentada pelo webhook: valor em centavos, moeda, método (cartão, Pix), status, ids do provedor e reembolsos.
- [ ] `authoredBy()`: o registro sobrevive à exclusão da conta.
- [ ] Usos:
  - admin com receita e histórico por pessoa, sem chamar o provedor;
  - exportação de dados pessoais;
  - analytics do servidor.
- [ ] **Direito de arrependimento (CDC art. 49):** reembolso integral em até 7 dias da compra, como regra explícita em `lib/billing`.

### 7. Checkout, paywall e conversão

- [ ] Tabela `checkout_sessions` (aberto, pago, expirado) com a origem e a variante do paywall.
- [ ] Operação diária de e-mail de checkout abandonado.
- [ ] Eventos de paywall e checkout (exibição, clique, conversão) e A/B de variante.

### 8. Cupons e créditos

- [ ] `allow_promotion_codes` no checkout.
- [ ] Crédito de indicação como saldo do cliente no Stripe ou como cupom gerado. As regras de quem ganha o quê ficam em `lib/referral`.

### Titular dos direitos

**Decisão:** preparar o titular agora, sem criar organizações.

- [ ] `entitlementsOf` e as guardas recebem um "titular" (`{ kind: "user", id }`), que hoje é sempre a pessoa. Organizações e assentos entram depois sem mudar a assinatura das funções.

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
  - eventos são strings livres;
  - não há envio pelo servidor;
  - não há funil padrão;
  - não há números de negócio;
  - não há experimentos.

### 1. Error Reporting do GCP no lugar do Sentry

- [ ] Logs de erro no formato do Cloud Error Reporting (pilha na mensagem e `serviceContext` com o serviço e a versão). O GCP passa a:
  - agrupar por assinatura;
  - avisar só quando aparece um grupo novo ou quando um grupo resolvido volta;
  - mostrar a contagem e a primeira e a última vez de cada grupo.
- [ ] Versão vinda de `SOURCE_COMMIT`, lido no `lib/env.ts`.
- [ ] Manter o alarme `app_errors` como rede de segurança, com limiar maior.
- [ ] Documentar no `BASE.md` como o substituto do Sentry.

### 2. Pilhas do navegador

**Decisão:** nada a fazer. Pilhas minificadas bastam; o request id e a rota ajudam a achar o problema. Os source maps não são publicados.

### 3. Batimentos e alarmes de ausência

- [ ] Uma linha de log `heartbeat` com o nome do trabalho, gravada por cada operação diária, pela sincronização e pelo processamento de webhook.
- [ ] Uma métrica por log e um alarme de ausência por trabalho: `daily` em 26 horas, `sync` em 15 minutos dentro da janela de sorteio.
- [ ] Em `ops/gcp`, aplicado pelo `pnpm gcp:alerts`.

### 4. Checagem externa

- [ ] Uptime check do GCP no `/health`, a cada minuto, de mais de uma região, com alarme. Em `ops/gcp`.

### 5. Log de acesso (Marco Civil, art. 15)

Registros de acesso (IP, data e hora com fuso) guardados por 6 meses, em sigilo.

**Decisão:** na base, opcional por flag (`ACCESS_LOG=on`, lida em `lib/env.ts`), desligada por padrão. O `setup:product` pergunta se o produto tem fins econômicos e liga a flag quando tiver.

- [ ] Com a flag ligada, o `proxy.ts` grava uma linha de acesso por requisição num log separado (`access`) pelo log port.
- [ ] No GCP:
  - um bucket próprio com retenção de 6 meses;
  - o log `access` excluído do bucket padrão;
  - os dois em `ops/gcp`.
- [ ] Fora do GCP, a linha vai só para o stdout. Fica documentado que a retenção é responsabilidade do operador.
- [ ] Usar o helper de IP confiável do rate limit.
- [ ] **Validar:** se o Traefik do Coolify consegue repassar a porta de origem do cliente, que é necessária por causa do CGNAT.

### 6. Desempenho

- [ ] `useReportWebVitals` enviando LCP, INP e CLS como eventos do Umami, com amostragem.
- [ ] Duração de cada action e route no log.
- [ ] Consultas acima de N ms no log, com o nome da consulta e sem os parâmetros.

### 7. Painel "Saúde" no admin

- [ ] Página em `(app)/admin` com:
  - a última execução de cada trabalho;
  - o último webhook recebido;
  - a versão no ar;
  - o estado do banco.
- [ ] Substitui o `/status` com token do solmiza.

### 8. Catálogo tipado de eventos

- [ ] Eventos e propriedades de cada um declarados num lugar só. `track("checkout_started", { priceKey })` checado pelo TypeScript.
- [ ] Propriedades com nomes como `email`, `name` ou `cpf` recusadas pelo tipo, com um teste confirmando.

### 9. Analytics no servidor

- [ ] Port `analytics` com adapter Umami via `fetch` (`/api/send`), usando o mesmo id interno do `identify`.
- [ ] Usos: pagamento confirmado, reembolso, trial iniciado e conclusões.
- [ ] **Validar:**
  - que a versão do Umami usada aceita o id da pessoa;
  - que eventos vindos do servidor não são descartados como robô por causa do `User-Agent`.

### 10. Funil padrão

- [ ] Eventos que todo produto emite: `page_view` → `signup_completed` → `activated` → `paywall_viewed` → `checkout_started` → `payment_confirmed`.
- [ ] `activated` é definido pelo produto (primeiro jogo salvo no lottery, primeira lição concluída no solmiza).
- [ ] Funil e metas configurados no Umami por um script, como o `gcp:alerts`.

### 11. Números de negócio no admin

- [ ] Página "Números" lendo o Postgres (`users`, `plans`, `payments`), com os gráficos do design system:
  - cadastros por dia;
  - pessoas ativas;
  - pagantes por plano;
  - receita recorrente mensal;
  - cancelamentos;
  - reembolsos;
  - conversão do trial.
- [ ] Não depende do Umami.

### 12. Experimentos

- [ ] `variantOf(experiment, subjectId)` determinístico por hash, em `domain/`, sem tabela.
- [ ] A exposição registrada como evento.
- [ ] Visitante anônimo com um cookie próprio de id aleatório, declarado na política de privacidade.
- [ ] Atende o A/B do paywall da cobrança.

### LGPD

- [ ] Umami continua sem cookie, recebendo só o id interno.
- [ ] Pixels de anúncio (Meta, Google Ads) ficam fora da base, porque exigiriam consentimento e um banner.

### Decisões

- Error Reporting do GCP como substituto do Sentry.
- Sem tradução de source maps.
- Log de acesso do Marco Civil na base, opcional por flag.

### Ordem

1. Formato do Error Reporting com a versão do deploy.
2. Batimentos, alarmes de ausência e Uptime check.
3. Log de acesso do Marco Civil, atrás da flag.
4. Catálogo tipado de eventos, port do servidor e funil padrão.
5. Página "Números" e painel "Saúde".
6. Web Vitals e experimentos.

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

- [ ] Mapa de caminhos públicos por idioma, com padrões para segmentos dinâmicos: `"/plans": "/planos"`, `"/lotteries/[game]/results/[draw]": "/loterias/[game]/resultado/[draw]"`.
- [ ] O `proxy.ts` reescreve o endereço público para a rota interna e responde 301 quando alguém acessa o endereço interno.
- [ ] Helper `publicHref()` para os links. Sitemap e `canonical` sempre com o endereço público.
- [ ] Com segundo idioma, o mesmo mapa ganha os caminhos em inglês (`/en/plans`), sem exigir a pasta `[locale]`.
- [ ] O lottery mantém as URLs de hoje declarando-as no mapa. A área logada continua em inglês.
- [ ] Atualizar a regra no `BASE.md` e no `AGENTS.md`.
- [ ] **Validar:** o `typedRoutes` com o helper e o prefetch do `<Link>` com o endereço reescrito.
- Alternativa descartada, mas mais barata: permitir pastas em pt-BR só em `app/(public)`. Não serve se houver segundo idioma.

### 2. Metadados completos

- [ ] `type` (`website | article`), `publishedTime` e `modifiedTime` no `buildSocialMetadata`.
- [ ] Locale vindo do pedido e `alternates.languages` (`hreflang`) com mais de um idioma.
- [ ] Opção `index: false` para buscas filtradas, páginas paginadas além da primeira e páginas sem conteúdo.
- [ ] `canonical` normalizado, sem parâmetros de filtro ou de rastreamento.
- [ ] `GOOGLE_SITE_VERIFICATION` em `lib/env.ts` para o Search Console.

### 3. Sitemap por fontes

- [ ] Cada área registra uma fonte que devolve URLs públicas com `lastModified` do banco.
- [ ] O `sitemap.ts` junta as rotas fixas e as fontes, e o `generateSitemaps` divide por fonte e em partes de até 50 mil.
- [ ] `publicRoutes` continua sendo a fonte das páginas fixas.

### 4. JSON-LD tipado

- [ ] Componente `<JsonLd>` que escapa `<`, para evitar injeção de script.
- [ ] Construtores tipados com `schema-dts`: `Organization`, `WebSite`, `BreadcrumbList`, `FAQPage`, `Article` e `Product` com `Offer`.
- [ ] O produto acrescenta os seus (resultado de sorteio, curso).

### 5. Imagem OG por página

- [ ] Modelo compartilhado (título, subtítulo, marca) usado pelos `opengraph-image.tsx` de cada rota.
- [ ] Paleta em hex gerada pelo gerador de tokens, como a do e-mail: o Satori do `ImageResponse` não suporta `oklch`.
- [ ] Fontes TTF lidas do disco com `outputFileTracingIncludes` (ver "Arquivos estáticos").
- [ ] Ficam em cache por padrão; as que dependem de parâmetro são geradas na primeira visita.

### 6. Cache e invalidação

- [ ] Leituras públicas em funções `'use cache'`, com `cacheTag` e `cacheLife`.
- [ ] Tags num módulo tipado por área (`cacheTags.draw(game, n)`), nunca string solta.
- [ ] Em server action, `updateTag(tag)`: só funciona ali, e a pessoa vê a mudança na hora.
- [ ] Em route handler (webhook, operação diária, sincronização), `revalidateTag(tag, "max")`, ou `{ expire: 0 }` quando o dado precisa sumir na hora.
- [ ] `revalidatePath` e `unstable_cache` proibidos por convenção.

### 7. Redirects

- [ ] Lista tipada no `next.config.ts` com `permanent: true`.
- [ ] Teste que impede cadeias (nenhum destino aponta para outro redirect).

### 8. Feeds e aviso de URL nova

- [ ] Construtor de RSS/Atom para route handlers (`feed.xml`), com escape correto.
- [ ] Port `indexing` com adapter IndexNow e o arquivo de chave servido na raiz.
- [ ] Remover a Google Indexing API do lottery. Pela política do Google ela só serve para `JobPosting` e `BroadcastEvent`. Para o Google, valem o sitemap com `lastModified` real e o Search Console.

### 9. Conteúdo editorial em MDX

- [ ] Textos de interface continuam no `messages/pt-BR.json`.
- [ ] Conteúdo longo em `content/<locale>/<área>/*.mdx`, com frontmatter validado por zod (título, descrição, datas, autor) e o layout de leitura do design system.
- [ ] Atende `/aprenda`, FAQ e glossário do lottery, e glossário e referência do solmiza.
- [ ] Declarar a exceção à regra do catálogo no `AGENTS.md`.
- [ ] **Validar:** `@next/mdx` com Turbopack no Next 16.4, e a regra de travessão aplicada aos `.mdx`.

### 10. Testes de SEO

- [ ] Suíte do Playwright que percorre o sitemap e confere em cada página pública:
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

### 7. Migração de usuários existentes

- [ ] Script de backfill que lista os usuários da instância do Clerk e cria as linhas em `users` antes do lançamento. Sem isso, o admin só vê quem fizer login de novo.
- [ ] Migrações de dados indexadas pelo `clerkId` e traduzidas para `users.id` (os dados do lottery no Firestore usam o id do Clerk).

### 8. Pontos menores

- [ ] Sessões e dispositivos: listar e encerrar sessões. Baixa prioridade; o Clerk já oferece, e o better-auth tem as sessões no modo local.
- [ ] Onboarding: `onboardedAt` ou passos em `options`, ligado ao evento `activated` do funil.
- [ ] Exclusão de conta: confirmar que cancela a assinatura ativa no provedor e que `payments` e `referredBy` ficam como `authoredBy`.

### Depende de outra decisão

- Organizações e equipes ficam para depois. A cobrança já prepara o titular dos direitos; quando entrarem, contas ganham `organizations`, `memberships` com papel por organização e convites por organização.

### Ordem

1. Registro de opções tipadas, com a cópia de visitante para conta.
2. Preferências de e-mail e descadastro com um clique.
3. Fuso horário.
4. Backfill de usuários do Clerk.
5. Reivindicação de dados de visitante e indicações.
6. Acessibilidade, sessões e onboarding.

## Regras da base a reconciliar

**Diagnóstico:** quase tudo aqui é trabalho de portar cada produto, e a maior parte já é verificada pela base. O que falta são ferramentas para o porte ser mecânico e verificável.

| Regra | Como a base aplica | Situação |
|---|---|---|
| `process.env` só em `lib/env.ts` (logo, sem `NEXT_PUBLIC_`) | Biome `noProcessEnv` | Já verificado |
| Texto só no catálogo | `noJsxLiterals` e `check-catalogs` | Verificado em JSX. Textos em arquivos TS escapam |
| zod via `@/lib/validation` | `noRestrictedImports` | Já verificado |
| Relógio e aleatoriedade como parâmetro | Convenção e o erro de prerender do Next | Não verificado |
| Valores guardados em inglês | Convenção | Não verificado |
| Dinheiro em centavos, instantes em `timestamptz` | Helpers de coluna e convenção | Parcial |
| Feature não importa feature | `noRestrictedImports` | Já verificado |

### 1. Porte limpo

**Decisão:** porte limpo de uma vez. Cada arquivo só entra quando passa em todas as regras; não há isenções nem catraca. O produto só funciona no fim do porte, então o produto antigo continua no ar até lá.

- [ ] O porte acontece num branch, área por área, com o `pnpm check` verde a cada passo.
- [ ] A troca do produto antigo pelo novo é um único corte, depois da migração de dados (ver "Contas e preferências", migração de usuários).

### 2. Textos para o catálogo

- [ ] Extrator `scripts/extract-text.ts` (com `ts-morph`):
  - acha literais em JSX e nas props `aria-label`, `placeholder`, `title` e `alt`;
  - propõe uma chave pelo caminho do arquivo e grava no catálogo;
  - troca o literal por `t("chave")`;
  - recusa travessão; o diff passa por revisão humana.
- [ ] Catálogo dividido em `messages/pt-BR/<área>.json` e juntado num catálogo único no build, que continua sendo o tipo. A paridade de chaves continua valendo. Resolve os 332 arquivos do solmiza.
- [ ] Conteúdo editorial em MDX (ver SEO), não no catálogo.
- [ ] Dados com texto (planos, FAQs em arrays TS) viram chaves do catálogo referenciadas pelo dado, ou MDX.
- [ ] Notação não é texto: nomes de nota (`C#`, `Dm7`) e números de bola vêm de funções do domínio. Escrever isso no `AGENTS.md`.
- [ ] **Validar:** quanto tempo o TS 7 leva para checar tipos com um catálogo do tamanho do do solmiza.

### 3. Relógio e aleatoriedade

- [ ] Plugin GritQL do Biome barrando `new Date()` sem argumento, `Date.now()` e `Math.random()` em `domain/`, `lib/`, `features/` e `components/`.
- [ ] Exceções: o módulo de relógio e o de aleatoriedade com semente, ambos em `domain/`.
- [ ] **Validar:** os plugins GritQL na versão do Biome usada.

### 4. Variáveis `NEXT_PUBLIC_`

- [ ] Nada a fazer na base:
  - a chave do Clerk vai como prop;
  - o id do Umami é lido no servidor;
  - a URL do app vem do `APP_URL`.
- [ ] No porte, renomear as variáveis. A tabela de equivalência de cada produto entra no roteiro de porte.

### 5. Valores guardados, dinheiro e datas

- [ ] Enums em inglês por um mapa de cada produto (`gasto` → `expense`, `premio` → `prize`, `organizador` → `organizer`) aplicado no script de migração. O catálogo traduz na tela.
- [ ] Reais em ponto flutuante viram centavos inteiros na migração, com arredondamento explícito e um relatório das diferenças.
- [ ] Timestamps do Firestore viram `timestamptz`.
- [ ] `lib/db/conventions.test.ts` passa a recusar colunas `real`, `double` ou `numeric` com nome de dinheiro, e `timestamp` sem fuso.

### 6. Toolchain

- [ ] pnpm, Node 24, Vitest 5 e as regras do ESLint traduzidas para Biome.
- [ ] Os guardas do solmiza usam a API de compilador do TypeScript, que mudou no TS 7 (nativo). Reescrever como regras do Biome (GritQL) ou testes do Vitest sobre o código-fonte.
- [ ] Rodar a checagem do TS 7 cedo no porte, antes de mover código: ele pode acusar erros que o TS 5 deixava passar.

### 7. Ferramentas e pacotes de fora

- [ ] **Decisão:** pasta `tools/` no repositório do produto (gerador em Rust, análises em Python, extensão do Chrome, vídeo).
  - Na base, a pasta tem só um `tools/README.md` explicando que as ferramentas de fora do app vão para lá.
  - `tools/` fica fora do lint, do knip e do `tsconfig`.
- [ ] O pacote privado `exata-ui` sai. Os componentes são refeitos sobre os primitivos da base, com o design system novo.

### 8. Roteiro de porte como skill

- [ ] Skill `port-from-legacy` com a ordem para cada arquivo:
  1. mover para a camada certa (`domain`, `lib`, `features`, `components`);
  2. extrair os textos;
  3. tirar relógio e aleatoriedade;
  4. passar no `pnpm check` antes do commit.
- [ ] Tabelas de equivalência de cada produto na skill: variáveis de ambiente, enums e rotas.

### Decisões

- Porte limpo de uma vez, sem catraca.
- Catálogo dividido por área, juntado no build.
- Pasta `tools/` no repositório, com só um README na base.

### Ordem

1. Plugin de relógio e aleatoriedade.
2. Catálogo dividido e extrator de textos.
3. Regras novas no teste de convenções do banco.
4. Skill `port-from-legacy`, com as tabelas de cada produto.
5. `tools/README.md` e a exclusão da pasta no lint, no knip e no `tsconfig`.

## Infraestrutura e qualidade

### 1. CI

Hoje o `.github/workflows/ci.yml` existe (`pnpm check` e integração), mas só roda manualmente. A única barreira é o hook de commit, que o `--no-verify` pula.

- [ ] Ligar em `push` na `main` e em `pull_request`.
- [ ] Job de build e imagem Docker, para pegar erros do standalone (arquivo fora do trace, prerender quebrado).
- [ ] e2e (Playwright contra o compose) toda noite ou em PR com label.
- [ ] **Decisão:** o Coolify continua observando a `main` e faz o deploy a cada push. O CI roda em paralelo, então um commit que só falha no CI pode chegar à produção; o hook de commit continua sendo a primeira barreira.
- [ ] Renovate ou Dependabot em lotes semanais, respeitando versões exatas.

### 2. Cabeçalhos de segurança e CSP

Hoje não há nenhum cabeçalho de segurança.

- [ ] Já, sem risco:
  - `Strict-Transport-Security`;
  - `X-Content-Type-Options: nosniff`;
  - `Referrer-Policy: strict-origin-when-cross-origin`;
  - `frame-ancestors 'none'`;
  - `Permissions-Policy` fechando câmera, microfone e localização. O produto abre o que precisa (o solmiza, `microphone=(self)`).
- [ ] **Decisão:** CSP sem nonce, primeiro em `Content-Security-Policy-Report-Only`, com violações enviadas para o log. Mantém a casca estática.
- [ ] Cada port declara os domínios que usa (Clerk, Stripe, Umami, GCS), e a política é montada a partir dessas declarações.
- [ ] O produto acrescenta o que precisa (no solmiza, `worker-src blob:` e `script-src blob:` para o AudioWorklet).
- [ ] A CSP passa a valer de verdade depois de um período sem violações inesperadas.
- [ ] **Validar:** o `experimental.sri` do Next (hash dos scripts) como reforço, sem renderização dinâmica.

### 3. Backup e restauração

Hoje há o backup agendado do Coolify. A restauração nunca foi provada, e não há backup dos arquivos enviados.

- [ ] Roteiro de restauração no README, com os passos testados.
- [ ] Script de ensaio:
  - restaura o último dump num Postgres descartável;
  - roda as migrações e contagens de sanidade;
  - roda uma vez por mês, no CI ou à mão.
- [ ] Versionamento ou *soft delete* no bucket GCS dos arquivos.
- [ ] **Decisão:** backup diário, guardado por 30 dias. Perde no máximo um dia.
- [ ] Configurar o backup agendado do Coolify com essa frequência e retenção, e documentar no README.
- [ ] LGPD: depois de qualquer restauração, um script reaplica as exclusões registradas na auditoria desde a data do dump.

### 4. Estratégia de testes do domínio

- [ ] Testes por propriedade com `fast-check` onde há invariantes:
  - a soma do rateio é igual ao total;
  - um fechamento cobre o que promete;
  - transpor e voltar devolve a mesma nota.
- [ ] Testes de paridade no porte: a implementação antiga gera saídas para um conjunto grande de entradas, que viram fixtures, e a nova precisa reproduzir todas antes de a antiga ser apagada.
- [ ] Cobertura mínima de 90% para `domain/` no `vitest.config`. O resto do código continua sem meta.
- [ ] Opcional: mutation testing (Stryker) só na matemática de prêmios.

### Decisões

- O Coolify continua observando a `main`; o CI roda em paralelo.
- CSP sem nonce, em modo relatório primeiro.
- Backup diário, 30 dias de retenção.

### Ordem

1. CI ligado, com build e imagem.
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
- [ ] Endpoint de ingestão para o worker residencial do lottery, com segredo próprio e payload validado por zod. A regra fica no servidor; o worker só busca e entrega.
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
- [ ] `qrcode` para QR em SVG.
- [ ] Fontes TTF do disco (ver "Arquivos estáticos") e cores da paleta em hex do gerador de tokens.
- [ ] Documento verificável: slug assinado, página pública de verificação e QR apontando para ela.
- [ ] Usos: certificado do solmiza, recibo de pagamento (a partir de `payments`) e relatórios.
- [ ] **Validar:** `@react-pdf/renderer` com React 19 e Next 16.4 no servidor. Pode precisar de `serverExternalPackages`.

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

### Decisões

- Agendamento por grupos de cadência, mudando a regra do `/events`.
- Tokens pessoais na API.

### Ordem

1. Agendamento por cadência e endpoint de ingestão.
2. API v1 com tokens.
3. PDF e QR.
4. Tradução parcial e formato por idioma.
