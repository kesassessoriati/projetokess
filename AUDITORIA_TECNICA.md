# 🔍 RELATÓRIO DE AUDITORIA TÉCNICA — AtendZappy v2

**Data:** 21/02/2026  
**Escopo:** Backend (Node.js/TypeScript) + Frontend (React.js) + Infraestrutura (Docker Swarm)  
**Versões analisadas:** Backend 5.0.3 | Frontend 12.0.3

---

## 🔴 PROBLEMAS CRÍTICOS

---

### 🔴 [C-01] — Secrets Reais Expostos no `.env` Versionado

**Arquivo afetado:** `backend/.env`

**Trecho:**

```
JWT_SECRET=3123123213123
JWT_REFRESH_SECRET=75756756756
FACEBOOK_APP_ID=776874187723945
FACEBOOK_APP_SECRET=f5c459238d0df6a55a229f2262fb91a1
GOOGLE_CLIENT_ID=604305494657-vuc12chul19ro50qh9i4a7nq9ot3cfkm.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
UAZAPI_ADMIN_TOKEN=ZaW1qwTEkuq7Ub1cBUuyMiK5bNSu3nnMQ9lh7klElc2clSRV8t
```

**Impacto técnico:** Qualquer pessoa com acesso ao repositório pode usar os tokens de terceiros (Google API, Facebook App, UAZAPI), assumir sessões de usuários via JWT fraco e comprometer integrações externas.

**Risco:** 🔴 CRÍTICO — O JWT_SECRET de 13 dígitos numéricos é trivialmente quebrável via força bruta. Permite forjar tokens válidos e autenticar como qualquer usuário.

**Sugestão de correção:**

1. Adicionar `.env` ao `.gitignore` imediatamente (verificar se já foi commitado)
2. Revogar e regenerar todos os tokens expostos (Google, Facebook, UAZAPI)
3. Usar segredos criptograficamente seguros (mínimo 32 bytes aleatórios): `openssl rand -hex 32`
4. No Docker Swarm, usar `docker secret` em vez de variáveis de ambiente em texto plano

---

### 🔴 [C-02] — CORS Configurado para Aceitar QUALQUER Origem

**Arquivo afetado:** `backend/src/app.ts` — linha 87-92

**Trecho:**

```typescript
app.use(
  cors({
    credentials: true,
    origin: true // Permite qualquer origem
  })
);
```

**Impacto técnico:** O comentário "permite qualquer origem" e `origin: true` contradizem a lógica de `allowedOrigins` definida acima (linhas 50-74), que é completamente ignorada. Qualquer domínio malicioso pode fazer requisições autenticadas com cookies para a API.

**Risco:** 🔴 CRÍTICO — CSRF (Cross-Site Request Forgery) habilitado. Um site malicioso pode roubar dados de usuários autenticados.

**Sugestão de correção:**

```typescript
app.use(cors({
  credentials: true,
  origin: allowedOrigins  // usar a lista já calculada acima
}));
```

---

### 🔴 [C-03] — Upload de Arquivos sem Validação de Tipo/Tamanho

**Arquivo afetado:** `backend/src/config/upload.ts`

**Trecho:**

```typescript
// Não há filtro de fileFilter no multer
export default {
  storage: multer.diskStorage({ ... })
  // sem fileFilter, limits, ou validação de mimeType
};
```

**Impacto técnico:** Qualquer tipo de arquivo pode ser enviado ao servidor (executáveis, scripts PHP, SVG com XSS, etc.). Combinado com o fato de os arquivos serem servidos via `/public`, um atacante pode fazer upload de um arquivo malicioso e executá-lo remotamente.

**Risco:** 🔴 CRÍTICO — Remote Code Execution (RCE) potencial se o servidor servir conteúdo executável.

**Sugestão de correção:**

```typescript
fileFilter: (req, file, cb) => {
  const allowedMimes = ['image/jpeg','image/png','image/gif','audio/ogg','video/mp4','application/pdf'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Tipo de arquivo não permitido', 400));
  }
},
limits: { fileSize: 50 * 1024 * 1024 } // 50MB máximo
```

---

### 🔴 [C-04] — Body Parser com Limite de 2GB

**Arquivo afetado:** `backend/src/app.ts` — linha 84-85

**Trecho:**

```typescript
app.use(bodyParser.json({ limit: '2gb' }));
app.use(bodyParser.urlencoded({ limit: '2gb', extended: true }));
```

**Impacto técnico:** Qualquer cliente (sem autenticação, pois o parsing ocorre antes do middleware de auth) pode enviar um body de até 2GB por requisição. Isso esgota RAM e CPU, causando crash do serviço.

**Risco:** 🔴 CRÍTICO — Denial of Service (DoS) trivial. Uma única requisição maliciosa pode derrubar o servidor.

**Sugestão de correção:** Reduzir para no máximo `50mb` e tratar compressão via Nginx/Traefik no limite de 50MB já configurado no nginx.conf.

---

### 🔴 [C-05] — JWT com Expiração de 90 Dias para Refresh Token

**Arquivo afetado:** `backend/src/config/auth.ts`

**Trecho:**

```typescript
export default {
  secret: process.env.JWT_SECRET || "mysecret",
  expiresIn: "48h",
  refreshSecret: process.env.JWT_REFRESH_SECRET || "myanothersecret",
  refreshExpiresIn: "90d"
};
```

**Impacto técnico:** Se um token for comprometido (roubo de localStorage, XSS, etc.), o atacante tem 90 dias para usar o refresh token sem poder ser revogado, pois o sistema não implementa lista de revogação (blocklist).

**Risco:** 🔴 CRÍTICO — Impossibilidade de logout forçado em caso de comprometimento de conta.

**Sugestão de correção:** Implementar blacklist de tokens inválidos em Redis. Reduzir refresh token para 7-15 dias. Implementar endpoint de revogação de token.

---

### 🔴 [C-06] — Diagnóstico: Código de Servidor Duplicado (DRY Violation + Bug)

**Arquivo afetado:** `backend/src/server.ts`

**Trecho:**

```typescript
// Bloco HTTPS (linhas 15-61) e bloco HTTP (linhas 63-105) são 
// praticamente idênticos — código duplicado de 90%
companies.map(async c => {        // ← .map() com async NÃO garante conclusão
  const promise = StartAllWhatsAppsSessions(c.id);
  allPromises.push(promise);
});
```

**Impacto técnico:** `.map()` com `async` não espera as promessas internamente — o padrão correto seria `for...of` com `await` ou `Promise.all` direto. Existe um race condition: o `Promise.all(allPromises)` pode ser chamado antes de todas as promessas serem adicionadas ao array em cenários de microtask scheduling.

**Risco:** 🔴 ALTO — Sessões WhatsApp podem não ser iniciadas corretamente na startup.

**Sugestão de correção:**

```typescript
const allPromises = companies.map(c => StartAllWhatsAppsSessions(c.id));
await Promise.all(allPromises);
await startQueueProcess();
```

---

### 🔴 [C-07] — SQL Injection via Query Raw

**Arquivo afetado:** `backend/src/queues.ts` — linha 388-390

**Trecho:**

```typescript
await sequelize.query(
  `UPDATE "Campaigns" SET status = 'EM_ANDAMENTO' WHERE id = ${campaign.id}`
);
```

**Impacto técnico:** Se `campaign.id` for controlado por um input externo não sanitizado, é possível injetar SQL. Sequelize possui mecanismo de parametrização que não está sendo usado.

**Risco:** 🔴 ALTO — SQL Injection potencial em operação de escrita.

**Sugestão de correção:**

```typescript
await sequelize.query(
  `UPDATE "Campaigns" SET status = 'EM_ANDAMENTO' WHERE id = :id`,
  { replacements: { id: campaign.id }, type: QueryTypes.UPDATE }
);
```

---

### 🔴 [C-08] — Secrets em Texto Plano no `stack-swarm.yml`

**Arquivo afetado:** `stack-swarm.yml` — linhas 43, 47-48, 51, 144

**Trecho:**

```yaml
- DB_PASS=9b383b03c79359d5a08e5791c3793165
- JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4
- JWT_REFRESH_SECRET=z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7
- "--requirepass" "atendzappy123"  # senha Redis exposta
```

**Impacto técnico:** Qualquer pessoa com acesso ao repositório Git tem acesso a todas as senhas de banco de dados, Redis e JWT do ambiente de produção.

**Risco:** 🔴 CRÍTICO — Comprometimento total do ambiente de produção.

**Sugestão de correção:** Usar `docker secret` do Swarm Mode e referenciar via `secrets:` no Compose. Chave nunca deve ficar em arquivo versionável.

---

## 🟡 PROBLEMAS MODERADOS

---

### 🟡 [M-01] — Supressão Massiva de Tipagem TypeScript (`@ts-nocheck`)

**Arquivos afetados:** 40+ arquivos no backend

**Exemplos:**

- `queues.ts` (arquivo de 1.859 linhas!)
- `MessageController.ts`
- `TicketController.ts`
- `WhatsAppController.ts`
- `database/index.ts`
- `wbotMessageListener.ts`
- `ChatBotListener.ts`

**Impacto técnico:** O `@ts-nocheck` desabilita a verificação de tipos em todo o arquivo. Em um projeto TypeScript, isso elimina a principal vantagem da linguagem. Bugs de tipo passam silenciosamente — erros de null pointer, tipos incorretos em chamadas de API, ausência de tratamento de undefined.

**Risco:** 🟡 MÉDIO — Bugs silenciosos em runtime, especialmente em fluxos críticos como envio de mensagens.

**Sugestão de correção:** Resolver os erros de tipagem legítimos arquivo por arquivo e remover os `@ts-nocheck`. Usar `@ts-ignore` apenas na linha específica problemática, nunca no arquivo inteiro.

---

### 🟡 [M-02] — `console.log` Massivo em Produção

**Arquivos afetados:** 900+ ocorrências de `console.log` no backend

**Exemplos críticos:**

```typescript
// SendWhatsAppMedia.ts
console.log(`[SendWhatsAppMedia] Opções finais:`, JSON.stringify(options, null, 2));
// SendWhatsAppMessage.ts  
console.log("== BODY SEND MESSAGE ==", body);
// queues.ts
console.log(unidadeIntervalo)
console.log(novaData)
```

**Impacto técnico:** `console.log` em produção bloqueia o event loop (síncrono), aumenta latência em alto volume, polui logs do container dificultando diagnóstico de erros reais, e pode expor dados sensíveis (conteúdo de mensagens, tokens, payloads).

**Risco:** 🟡 MÉDIO — Degradação de performance, exposição de dados em logs.

**Sugestão de correção:** Substituir por `logger.debug()` (que pode ser desligado por variável de ambiente `LOG_LEVEL=warn` em produção).

---

### 🟡 [M-03] — Erro de Bug em `handleSendScheduledMessage` (Referência Nula)

**Arquivo afetado:** `backend/src/queues.ts` — linha 176-177

**Trecho:**

```typescript
let whatsapp

if (!isNil(schedule.whatsappId)) {
  whatsapp = await Whatsapp.findByPk(schedule.whatsappId);
}

if (!whatsapp)
  whatsapp = await GetDefaultWhatsApp(whatsapp.id, schedule.companyId);
//                                    ^^^^^^^^^^^ ERRO: whatsapp é undefined aqui!
```

**Impacto técnico:** Quando `whatsapp` for `null` (não encontrado no banco), a linha `whatsapp.id` tentará acessar propriedade de `undefined`, lançando `TypeError: Cannot read property 'id' of undefined`. O agendamento falhará silenciosamente.

**Risco:** 🟡 ALTO — Mensagens agendadas não serão enviadas sem log de error claro.

**Sugestão de correção:**

```typescript
if (!whatsapp)
  whatsapp = await GetDefaultWhatsApp(schedule.companyId); // remover whatsapp.id
```

---

### 🟡 [M-04] — Typo em Nome de Variável de Ambiente

**Arquivo afetado:** `backend/.env` — linha 19, `backend/src/queues.ts`

**Trecho no .env:**

```
REGIS_OPT_LIMITER_DURATION=3000  # ← deveria ser REDIS_OPT_LIMITER_DURATION
```

**Trecho em queues.ts:**

```typescript
const limiterDuration = process.env.REDIS_OPT_LIMITER_DURATION || 3000;
```

**Impacto técnico:** A variável `REGIS_OPT_LIMITER_DURATION` nunca é lida. O limiter de rate sempre usa o valor padrão de 3000ms, independente da configuração.

**Risco:** 🟡 BAIXO — Configuração ignorada, rate limiting pode não funcionar conforme esperado.

---

### 🟡 [M-05] — Lógica de Condição Incorreta no Upload (`isAuth`)

**Arquivo afetado:** `backend/src/config/upload.ts` — linha 18

**Trecho:**

```typescript
if (companyId === undefined && isNil(companyId) && isEmpty(companyId)) {
```

**Impacto técnico:** A condição usa `&&` (AND), mas deveria usar `||` (OR) para verificar se `companyId` está ausente. `companyId === undefined` já implica `isNil(companyId)` — as condições subsequentes são redundantes. Além disso, se o header `authorization` não existir, a próxima linha lançará `TypeError`.

**Risco:** 🟡 MÉDIO — Uploads podem falhar ou usar companyId incorreto.

---

### 🟡 [M-06] — Código Morto (Dead Code) Comentado em Larga Escala

**Arquivos afetados:** `queues.ts`, `UserController.ts`, `server.ts`, `socket.ts` e outros

**Exemplos:**

```typescript
// UserController.ts: ~50 linhas de código antigo comentado (linhas 462-504)
// queues.ts: ~50 linhas de função inteira comentada (linhas 678-726)
// server.ts: bloco de verificação comentado
// socket.ts: bloco de admin UI comentado
```

**Impacto técnico:** Aumenta complexidade cognitiva, dificulta manutenção, confunde novos desenvolvedores sobre qual código está ativo.

**Risco:** 🟡 BAIXO — Debt técnico de manutenção.

**Sugestão de correção:** Usar Git para histórico. Remover código comentado permanentemente.

---

### 🟡 [M-07] — `queues.ts` com 1.859 Linhas — God Object

**Arquivo afetado:** `backend/src/queues.ts`

**Impacto técnico:** Um único arquivo de 1.859 linhas concentra: inicialização de filas Bull, processadores de mensagens, verificação de campanhas, envio de agendamentos, crons, processamento de fluxos. Alta coesão negativa, impossível de testar unitariamente, impossível de entender isoladamente.

**Risco:** 🟡 ALTO — Qualquer bug neste arquivo compromete múltiplos fluxos. Modificações causam regressões inesperadas.

**Sugestão de correção:** Separar em módulos por responsabilidade:

- `queues/campaignQueue.ts`
- `queues/scheduleQueue.ts`
- `queues/messageQueue.ts`
- `queues/index.ts` (só exportações e registro dos processors)

---

### 🟡 [M-08] — Banco de Dados com Pool Máximo de 100 Conexões

**Arquivo afetado:** `backend/src/config/database.ts` — linhas 26-29

**Trecho:**

```typescript
pool: {
  max: parseInt(process.env.DB_POOL_MAX) || 100,
  min: parseInt(process.env.DB_POOL_MIN) || 15,
  idle: parseInt(process.env.DB_POOL_IDLE) || 600000  // 10 minutos!
}
```

**Impacto técnico:** Pool de 100 conexões mínimas com 15 sempre abertas. Idle de 600s (10min) mantém conexões ociosas por muito tempo. Em ambientes multi-instância (Docker Swarm com réplicas), cada réplica abre 15-100 conexões, potencialmente esgotando o pool do PostgreSQL.

**Risco:** 🟡 ALTO — Com 3 réplicas: 300-900 conexões ao banco, facilmente esgotando o `max_connections` padrão do Postgres (100).

**Sugestão de correção:** Usar PgBouncer ou reduzir pool para `max: 20, min: 2, idle: 10000`.

---

### 🟡 [M-09] — `react-scripts 3.4.3` Obsoleto (4 anos atrás)

**Arquivo afetado:** `frontend/package.json` — linha 102

**Impacto técnico:** Versão de 2020, com múltiplas vulnerabilidades de segurança conhecidas no webpack e suas dependências. Sem suporte desde 2022. A flag `--openssl-legacy-provider` nos scripts é sintoma de que a versão é incompatível com Node.js moderno.

**Risco:** 🟡 MÉDIO — Vulnerabilidades de build tool, build lento, sem acesso a otimizações modernas.

**Sugestão de correção:** Migrar para Vite + React 18. Alternativa: atualizar para `react-scripts 5.x`.

---

### 🟡 [M-10] — Versões Duplamente Instaladas de Bibliotecas UI

**Arquivo afetado:** `frontend/package.json`

**Trecho:**

```json
"@material-ui/core": "^4.12.4",   // Versão antiga
"@material-ui/icons": "^4.11.3",  // Versão antiga
"@mui/material": "^5.16.14",      // Versão nova
"@mui/icons-material": "^5.14.1", // Versão nova
```

**Impacto técnico:** Dois sistemas de UI instalados simultaneamente (MUI v4 e MUI v5). Duplica o bundle size (~2MB extras), causa conflitos de estilos, inconsistência visual. Também temos: `emoji-mart` v5, `@emoji-mart/react` v1, `emoji-picker-react` v4 — três bibliotecas de emoji = bundle desnecessário.

**Risco:** 🟡 MÉDIO — Bundle size excessivo, tempo de carregamento lento, inconsistência visual.

---

### 🟡 [M-11] — `nodemailer` no Frontend (Erro Conceitual)

**Arquivo afetado:** `frontend/package.json` — linha 65

**Trecho:**

```json
"nodemailer": "^6.10.0"
```

**Impacto técnico:** `nodemailer` é uma biblioteca Node.js (server-side) para envio de emails. Não funciona em ambiente de browser. Sua presença no frontend indica tentativa de enviar emails diretamente do browser (impossível e perigoso — exporia credenciais SMTP). Aumenta bundle desnecessariamente.

**Risco:** 🟡 MÉDIO — Funcionalidade provavelmente quebrada, bundle inflado.

---

### 🟡 [M-12] — Helmet não Aplicado (Configuração Ineficaz)

**Arquivo afetado:** `backend/src/app.ts`

**Trecho:**

```typescript
import helmet from "helmet";
// ... helmet importado mas NUNCA usado/registrado como middleware!
```

**Impacto técnico:** O pacote `helmet` está importado mas não há `app.use(helmet())` no código. Os headers de segurança HTTP (X-Content-Type-Options, HSTS, X-Frame-Options, etc.) não estão sendo aplicados pelo backend.

**Risco:** 🟡 MÉDIO — API vulnerável a ataques de clickjacking, MIME sniffing, etc.

**Sugestão de correção:** Adicionar `app.use(helmet())` logo após a criação do app Express.

---

## 🔵 MELHORIAS RECOMENDADAS

---

### 🔵 [R-01] — Backend Sem Healthcheck no Docker

**Arquivo afetado:** `backend/Dockerfile`

**Impacto técnico:** O Dockerfile do backend não define `HEALTHCHECK`. O Docker Swarm não consegue detectar se o serviço está funcionando vs. apenas rodando em processo zumbi. O frontend tem healthcheck correto — inconsistência.

**Sugestão de correção:**

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1
```

E criar a rota `/health` retornando `200 OK`.

---

### 🔵 [R-02] — Ausência Total de Testes Automatizados

**Arquivos afetados:** Todo o projeto

**Impacto técnico:** O `jest.config.js` existe no backend, mas não há evidência de testes escritos para nenhuma funcionalidade crítica (envio de mensagens, autenticação, processamento de campanhas). Qualquer refatoração é feita às cegas.

**Sugestão de correção:** Priorizar testes para:

1. Autenticação / autorização (middleware isAuth)
2. Fluxo de criação de tickets
3. Processadores de fila (queue processor handlers)

---

### 🔵 [R-03] — Controller com Lógica de Negócio (Violação MVC)

**Arquivo afetado:** `backend/src/controllers/UserController.ts`

**Exemplos:**

- Busca de configurações de email de boas-vindas (linhas 339-346)
- Formatação de template de mensagem (linhas 353-364)
- Envio de WhatsApp (linhas 392-422)
- Cálculo de data de expiração (linhas 250-253)

**Impacto técnico:** O controller `store` tem 350 linhas de lógica de negócio que deveriam estar em um `WelcomeService` ou `OnboardingService`. Viola Single Responsibility Principle. Impossível de testar sem simular HTTP.

---

### 🔵 [R-04] — Uso do Pacote `request` (Deprecated)

**Arquivo afetado:** `backend/package.json` — linha 84

**Trecho:**

```json
"request": "2.88.2"
```

**Impacto técnico:** O pacote `request` foi oficialmente descontinuado em 2020. Não recebe atualizações de segurança. O projeto já usa `axios` — redundância desnecessária.

**Sugestão de correção:** Localizar usos de `request` e substituir por `axios`. Remover dependência.

---

### 🔵 [R-05] — Cache de Resposta da API Bloqueado Globalmente

**Arquivo afetado:** `backend/src/app.ts` — linhas 112-119

**Trecho:**

```typescript
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  // Aplicado a TODAS as rotas, incluindo recursos estáticos
  next();
});
```

**Impacto técnico:** O middleware `no-cache` é aplicado ANTES do `express.static`, sobrescrevendo os headers de cache configurados para imagens (`max-age=86400`). Na prática, nenhuma imagem será cacheada pelo browser, aumentando o tráfego desnecessariamente.

**Sugestão de correção:** Mover o middleware de no-cache para ser aplicado apenas nas rotas da API (`/api/*`), não nos arquivos estáticos.

---

### 🔵 [R-06] — Artefatos de Build no Repositório

**Arquivo afetado:** Raiz do projeto

**Arquivos problemáticos:**

- `changes.patch` (31KB)
- `changes.patch.b64` (42KB)
- `frontend/cross-env` (arquivo sem extensão na raiz do frontend)
- `frontend/frontend@12.0.3` (arquivo stray)
- `backend/.DS_Store` (arquivo de sistema macOS)

**Impacto técnico:** Poluição do repositório com arquivos temporários e artefatos. `.DS_Store` expõe estrutura do filesystem do desenvolvedor.

---

### 🔵 [R-07] — Todos os Serviços em Node Manager (Single Point of Failure)

**Arquivo afetado:** `stack-swarm.yml`

**Trecho:**

```yaml
placement:
  constraints:
    - node.role == manager
```

**Impacto técnico:** Todos os serviços (backend, frontend, redis) estão forçados a rodar APENAS no nó manager. Elimina benefício do Swarm de distribuição de carga. Se o manager cair, tudo cai.

**Sugestão de correção:** Usar `node.role == worker` para frontend e backend. Manter apenas persistência de dados em manager ou usar storage distribuído.

---

### 🔵 [R-08] — `sequelize v5` Desatualizado para PostgreSQL

**Arquivo afetado:** `backend/package.json` — linha 85

**Trecho:**

```json
"sequelize": "^5.22.3",
"sequelize-typescript": "^1.1.0"
```

**Impacto técnico:** Sequelize v5 foi lançado em 2019 e não recebe atualizações de segurança desde 2021. A versão atual é v6. Sequelize v5 não suporta recursos modernos do PostgreSQL e tem problemas conhecidos com pool de conexões.

---

### 🔵 [R-09] — `mysql2` Instalado em Projeto PostgreSQL

**Arquivo afetado:** `backend/package.json` — linha 68

**Trecho:**

```json
"mysql2": "^2.3.3"
```

**Impacto técnico:** O projeto usa PostgreSQL (dialect: postgres), mas `mysql2` está instalado como dependência de produção. Dependência desnecessária que aumenta tamanho da imagem Docker e surface de ataque.

---

### 🔵 [R-10] — Variável de Ambiente `NODE_ENV` em Branco no `.env`

**Arquivo afetado:** `backend/.env` — linha 1

**Trecho:**

```
NODE_ENV=
```

**Impacto técnico:** `NODE_ENV` sem valor faz o Express rodar em modo de desenvolvimento, habilitando stack traces detalhadas nas respostas de erro, desabilitando otimizações de performance do Express, e revelando informações internas ao cliente.

---

## 📈 AVALIAÇÃO GERAL DO PROJETO

| Critério | Nota | Justificativa |
|---|---|---|
| **Arquitetura** | 4/10 | Estrutura de pastas razoável, mas God Objects (queues.ts 1859 linhas), controllers com lógica de negócio, ausência de camadas domain/application |
| **Segurança** | 2/10 | Secrets expostos no Git, CORS aberto, uploads sem validação, JWT fraco, body parser 2GB, helmet inativo |
| **Escalabilidade** | 4/10 | Bull Queue bem estruturado, mas pool de DB excessivo, todos serviços no manager, sem separação de workers |
| **Performance** | 5/10 | Compressão HTTP e cache de estáticos configurados, mas 900+ console.logs, bundle frontend inflado, cache API incorreto |
| **Organização** | 5/10 | Estrutura de pastas relativamente coerente, mas ~40 arquivos com @ts-nocheck, código morto em volume, artefatos no repo |
| **Manutenibilidade** | 3/10 | Ausência de testes, @ts-nocheck massivo, queues.ts com 1859 linhas, sem documentação de código, código duplicado no server.ts |

**Média Geral: 3.8/10**

---

## 🧠 ANÁLISE DE RISCO FUTURO

### ⚠️ O que pode quebrar com escala?

1. **Pool de banco de dados**: Com 2-3 réplicas do backend, o PostgreSQL atingirá o limite de conexões. Cada instância tenta abrir 100 conexões — 300 conexões para um Postgres padrão de 100 max_connections.
2. **queues.ts monolítico**: À medida que mais tipos de mensagens/automações são adicionados, este arquivo se tornará impossível de manter. Um erro de sintaxe derruba TODO o sistema de filas.
3. **Body limit 2GB**: Em alta concorrência, múltiplas requisições simultâneas de grande porte esgotarão RAM instantaneamente.
4. **Redis sem cluster**: Um único Redis é SPOF para todo o sistema de filas. Sem sentinel/cluster, qualquer falha para toda a operação.

### ⚠️ O que pode virar gargalo?

1. **N+1 queries nos listeners**: Os listeners do Baileys (wbotMessageListener.ts) realizam múltiplas queries sequenciais por mensagem recebida. Em alto volume de mensagens, isso serializa toda a processamento.
2. **Processamento de mídia síncrono**: Conversão de áudio com FFmpeg acontece de forma síncrona no thread principal. Em envio de muitas mídias simultâneas, bloqueia o event loop.
3. **Socket.IO sem adaptador Redis**: Em múltiplas instâncias, os namespaces Socket.IO não são sincronizados entre réplicas. Usuários em instâncias diferentes não recebem eventos em tempo real.

### ⚠️ O que pode gerar débito técnico grave?

1. **@ts-nocheck em arquivos críticos**: Migrate para TypeScript estrito vai requerer refatoração massiva quando necessário.
2. **Sequelize v5**: A migração para v6 vai requerer mudanças em todos os 100+ models.
3. **React 16 + react-scripts 3.x**: A migração para React 18 + Vite ou CRA 5 vai requerer revisão de todos os componentes com lifecycle legado.
4. **Ausência de testes**: Qualquer refatoração futura é de alto risco, podendo introduzir regressões não detectadas.

---

## 🛠️ PLANO DE AÇÃO PRIORITÁRIO

### 🔥 Urgente (Fazer AGORA — Semana 1)

| # | Ação | Impacto |
|---|---|---|
| 1 | Revogar e trocar TODOS os tokens expostos (Google, Facebook, UAZAPI, JWT) | Segurança crítica |
| 2 | Corrigir CORS: usar `allowedOrigins` em vez de `origin: true` | Segurança crítica |
| 3 | Adicionar `.env` e `stack-swarm.yml` ao `.gitignore` e remover do histórico Git com `git filter-branch` ou BFG | Segurança crítica |
| 4 | Reduzir `bodyParser.json` de `2gb` para `50mb` | DoS prevention |
| 5 | Corrigir bug em `queues.ts:177` — `whatsapp.id` em objeto nulo | Bug de produção |
| 6 | Ativar `app.use(helmet())` | Segurança |

### 🔧 Correções Estruturais (Mês 1)

| # | Ação | Impacto |
|---|---|---|
| 7 | Adicionar validação de tipo de arquivo no multer (fileFilter + mimeType) | Segurança |
| 8 | Implementar blacklist de tokens JWT em Redis + reduzir expiração | Segurança |
| 9 | Substituir `console.log` por `logger.debug`/`logger.info` no backend inteiro | Performance + Observabilidade |
| 10 | Corrigir race condition no `server.ts` (substituir `.map(async` por `for...of await`) | Correção de bug |
| 11 | Corrigir SQL concatenado em `queues.ts` para usar parametrização Sequelize | Segurança SQL |
| 12 | Usar `docker secret` para secrets no Swarm | Segurança infra |
| 13 | Adicionar healthcheck ao Dockerfile do backend | Observabilidade |
| 14 | Corrigir typo `REGIS_OPT_LIMITER_DURATION` para `REDIS_OPT_LIMITER_DURATION` | Bug config |

### 🏗️ Refatorações Estratégicas (Trimestre 1)

| # | Ação | Impacto |
|---|---|---|
| 15 | Quebrar `queues.ts` em módulos por domínio (campaignQueue, scheduleQueue, etc.) | Manutenibilidade |
| 16 | Mover lógica de negócio do `UserController.store` para `OnboardingService` | Arquitetura |
| 17 | Adicionar `@socket.io/redis-adapter` para sincronização multi-instância | Escalabilidade |
| 18 | Remover `@ts-nocheck` dos arquivos críticos e resolver tipos | Qualidade |
| 19 | Remover `mysql2`, pacote `request`, e duplicatas de dependências UI (MUI v4) | Higiene de dependências |
| 20 | Implementar PgBouncer ou reduzir pool de DB (max: 20) | Escalabilidade |

### 🚀 Melhorias de Longo Prazo (Semestre 1)

| # | Ação | Impacto |
|---|---|---|
| 21 | Migrar `react-scripts 3.4.3` → Vite + React 18 | Performance de build |
| 22 | Atualizar Sequelize v5 → v6 com tipagem completa | Modernização |
| 23 | Implementar suite de testes unitários e de integração (meta: 60% coverage) | Qualidade |
| 24 | Redis Sentinel ou Cluster para alta disponibilidade | Escalabilidade |
| 25 | Implementar Rate Limiting por usuário/IP nas rotas críticas (auth, API externa) | Segurança |
| 26 | Separar workers (processamento de mídia, campanhas) em processos dedicados | Performance |
| 27 | Implementar APM (Application Performance Monitoring) com Sentry Performance ou Datadog | Observabilidade |

---

*Relatório gerado em 21/02/2026 via análise estática do código-fonte do repositório AtendZappy v2.*  
*Total de arquivos analisados: ~200+ arquivos TypeScript/JavaScript + configurações de infraestrutura.*
