# PLANO TÉCNICO DETALHADO — NOVAS FEATURES

**AtendZappy v2 — Arquitetura Multi-Tenant**
**Data:** 24/02/2026 | **Status:** Pré-Implementação

---

## CONTEXTO E PRINCÍPIOS GERAIS

### Stack Atual

- **Backend:** Node.js + TypeScript + Express + Sequelize (PostgreSQL)
- **Frontend:** React.js + Material-UI v4/v5
- **Real-time:** Socket.io v4
- **Auth:** JWT com `companyId` embedado no token
- **Isolamento Tenant:** `tenantIsolation.ts` via hooks `beforeFind/beforeCreate/beforeBulkUpdate`
- **Context:** `runWithContext({ companyId })` no middleware `isAuth.ts`
- **Queue Jobs:** Bull + Redis

### Modelos Relevantes Já Existentes

| Modelo | companyId | Observação |
|--------|-----------|-----------|
| `Ticket` | ✅ `@AllowNull(false)` | Base das conversas |
| `Message` | ✅ | `isPrivate: boolean` já existe! |
| `TicketNote` | ❌ **FALTANDO** | Sem `companyId` — risco atual |
| `Chat` (interno) | ✅ | Estrutura existe mas incompleta |
| `ChatMessage` | ⚠️ | Sem `companyId` direto (herda via Chat) |

### Regras Não Negociáveis

1. Todo modelo com risco de vazamento cross-tenant **deve ter `companyId` explícito**
2. O hook `tenantIsolation.ts` já aplica automaticamente em `beforeFind` - novos models apenas precisam ter o campo
3. APIs públicas (sem `isAuth`) **nunca** devem expor dados privados
4. Migrations seguem padrão `YYYYMMDDHHMMSS-nome-descritivo.ts`

---

## 1️⃣ EXPORTAÇÃO DE RELATÓRIOS EM PDF

### Estratégia Adotada: Backend Node.js com Puppeteer (Headless Chrome)

#### Justificativa Técnica

| Opção | Prós | Contras |
|-------|------|---------|
| **Puppeteer (escolhido)** | HTML → PDF fiel ao design; já está no `package.json`; suporte a CSS avançado | Usa mais memória |
| PDFKit | Leve, programático | CSS limitado; muito código para layouts complexos |
| jsPDF (frontend) | Sem carga no servidor | Expõe dados no cliente; sem controle de isolamento |
| wkhtmltopdf | Bom output | Binário externo; difícil em Docker |

> **Decisão:** `puppeteer` já está listado em `package.json`. Usar template HTML isolado com dados já filtrados por `companyId`. Geração em background via **Bull Worker** para não travar o event loop.

#### Fluxo de Arquitetura

```
Frontend                   Backend (Worker)              Storage
   │                             │                          │
   ├─[GET /reports?period=X]──▶  │                          │
   │                        Query com companyId             │
   │                        (tenantIsolation hook)          │
   │◀─────{ data filtrado }──────┤                          │
   │                             │                          │
   ├─[POST /reports/pdf/export]──▶                          │
   │    { period, companyId }    │                          │
   │                        ─ Enqueue Bull Job ─            │
   │◀──{ jobId: "abc123" }───────┤                          │
   │                             │                          │
   │  [Poll GET /reports/pdf/:jobId/status]                 │
   │                        Worker processa:                 │
   │                        1. Busca dados (companyId obrig.)│
   │                        2. Renderiza HTML template       │
   │                        3. Puppeteer → PDF               │
   │                        4. Salva em /public/company{id}/ │
   │                        5. Job status = "done"           │
   │                             │                          │
   │  [GET /reports/pdf/:jobId/download]                    │
   │◀────────────────────────────────────────{ PDF file }───┤
```

#### Impacto no Banco de Dados

**Nova tabela: `ReportExports`**

```sql
CREATE TABLE "ReportExports" (
  id         SERIAL PRIMARY KEY,
  "companyId" INTEGER NOT NULL REFERENCES "Companies"(id),
  "userId"   INTEGER NOT NULL REFERENCES "Users"(id),
  "jobId"    VARCHAR(255) NOT NULL UNIQUE,
  status     VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending|processing|done|error
  "period"   JSONB,          -- { startDate, endDate, type }
  "filePath" VARCHAR(500),   -- path relativo /public/company{id}/reports/
  "errorMsg" TEXT,
  "createdAt" TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP NOT NULL
);

CREATE INDEX idx_reportexports_company_status ON "ReportExports" ("companyId", status);
CREATE INDEX idx_reportexports_jobid ON "ReportExports" ("jobId");
```

#### Novos Arquivos a Criar

```
backend/src/
  models/
    ReportExport.ts                         ← Model Sequelize
  services/
    ReportServices/
      GenerateReportPdfService.ts           ← Lógica principal
      GetReportDataService.ts               ← Coleta dados (reusa queries existentes)
  controllers/
    ReportPdfController.ts
  routes/
    reportPdfRoutes.ts
  jobs/
    ProcessReportPdfJob.ts                  ← Consumer Bull
  templates/
    pdf/
      reportTemplate.html                   ← Template HTML com Mustache
      reportStyles.css

frontend/src/
  components/
    ReportPdfButton/
      index.js                              ← Botão + polling status
  services/
    reportPdf.js                            ← API calls
```

#### Pontos Críticos de Segurança

- ⚠️ O endpoint de download valida que `req.user.companyId === report.companyId`
- ⚠️ Arquivo PDF salvo em `/public/company{companyId}/reports/` (namespace isolado)
- ⚠️ Puppeteer deve rodar com `--no-sandbox` no Docker e usuário não-root
- ⚠️ Job TTL de 1 hora; arquivo limpo após download ou expiração

#### Plano de Testes

- [ ] Unit: `GetReportDataService` retorna apenas dados do `companyId` correto
- [ ] Unit: Tentativa de download de PDF de outra empresa retorna 403
- [ ] Integration: Fluxo completo enqueue → worker → download
- [ ] Load: 5 empresas simultâneas gerando PDF sem contaminação

---

## 2️⃣ BOTÃO DE MENSAGEM RÁPIDA (QUICK SEND)

### Estratégia Adotada: Modal Full-Screen em Mobile + Modal Centered em Desktop

#### Fluxo de Arquitetura

```
Header (layout/index.js)
  └── QuickSendButton (ícone ⚡)
        └── QuickSendModal
              ├── Campo: Número (libphonenumber-js — validação internacional)
              ├── Campo: Mensagem (textarea)
              ├── Upload: imagem/áudio/vídeo/documento (Multer existente)
              └── [Enviar]
                    │
                    ▼
              POST /api/messages/quick-send
                    │
                    ├── 1. Busca Contact por (number, companyId)
                    │        └── Não existe? Cria novo Contact (companyId obrigatório)
                    ├── 2. Busca Ticket aberto para esse Contact (companyId)
                    │        └── Não existe? Cria novo Ticket (whatsappId da empresa)
                    ├── 3. Envia mensagem via instância WhatsApp da EMPRESA
                    │        └── Valida: whatsapp.companyId === req.user.companyId
                    └── 4. Retorna { ticketId, success }
```

#### Seleção de Instância WhatsApp

- O sistema já tem `Whatsapp` model com `companyId`
- **Lógica:** Usar instância conectada (`status = 'CONNECTED'`) da empresa do usuário
- Se múltiplas instâncias: dropdown no modal para selecionar
- **Regra dura:** `WHERE whatsappId IN (SELECT id FROM Whatsapps WHERE companyId = ?)` antes do envio

#### Impacto no Banco de Dados
>
> **Nenhuma nova tabela necessária.** Usa estruturas existentes: `Contacts`, `Tickets`, `Messages`, `Whatsapps`.

#### Novos Arquivos a Criar

```
backend/src/
  services/
    MessageServices/
      QuickSendMessageService.ts     ← Orquestra contact+ticket+envio
  controllers/
    QuickSendController.ts
  routes/
    quickSendRoutes.ts

frontend/src/
  components/
    QuickSendModal/
      index.js                       ← Modal principal
      PhoneInput.js                  ← Campo telefone com bandeira
      MediaUploadArea.js             ← Drag & drop mídia
  layout/
    QuickSendButton.js               ← Botão no header (responsivo)
```

#### Responsividade Mobile

```
Desktop: Botão com texto "Mensagem Rápida" + ícone ⚡ no header
Tablet:  Apenas ícone ⚡ no header  
Mobile:  Ícone ⚡ no header + Modal full-screen (não bottom sheet)
```

#### Pontos Críticos de Segurança

- ⚠️ Middleware `isAuth` obrigatório na rota
- ⚠️ Perfil mínimo: `agent` (não apenas viewer)
- ⚠️ **Validação dupla de instância:** `whatsapp.companyId MUST === req.user.companyId`
- ⚠️ Validação de número: sanitizar, aceitar apenas formato E.164
- ⚠️ Rate limiting: máx. 10 quick sends por minuto por usuário

#### Plano de Testes

- [ ] Unit: `QuickSendMessageService` rejeita instância de outra empresa
- [ ] Unit: Contato criado sempre com `companyId` correto
- [ ] Integration: Usuário empresa A não pode usar instância empresa B
- [ ] UI: Modal responsivo em 320px, 768px e 1024px

---

## 3️⃣ CHAT INTERNO MULTI-TENANT

### Análise dos Modelos Existentes

Os modelos `Chat` e `ChatMessage` **já existem** mas apresentam lacunas:

| Problema | Situação Atual | Correção Necessária |
|----------|---------------|---------------------|
| `Chat.companyId` | ✅ Existe | OK |
| `ChatMessage.companyId` | ❌ Não existe | Adicionar (segurança redundante) |
| Socket.io rooms | ❓ Não mapeado | Implementar rooms `chat-{companyId}-{chatId}` |
| Upload de mídia no chat | ❓ `mediaPath` existe | Validar path isolado |
| Suporte a áudio | ❓ Sem coluna tipo | Adicionar `mediaType` |

### Estratégia: Socket.io com Rooms Isoladas (já existe no projeto)

```
Cliente A (empresa 1)                    Servidor Socket.io
   │                                           │
   ├──[connect] token JWT (companyId=1)──────▶│
   │                               Valida JWT  │
   │                  join room "chat-1-{id}"  │
   │                                           │
   ├──[emit 'chat:message']──────────────────▶│
   │  { chatId, message, companyId: 1 }        │
   │                    Valida companyId        │
   │                    Verifica chat.companyId │
   │                    Salva ChatMessage       │
   │                                           │
   │◀──[to room "chat-1-{id}"] broadcast ──────┤
   │                                           │
Cliente B (empresa 2)                          │
   ├──[connect] token JWT (companyId=2)──────▶│
   │                    join room "chat-2-{id}"│
   │               NUNCA recebe eventos da 1   │
```

#### Impacto no Banco de Dados

**Alterações na tabela `ChatMessages`:**

```sql
ALTER TABLE "ChatMessages" 
  ADD COLUMN "companyId" INTEGER REFERENCES "Companies"(id),
  ADD COLUMN "mediaType" VARCHAR(50),   -- 'text'|'image'|'audio'|'video'|'document'
  ADD COLUMN "isRead" BOOLEAN DEFAULT FALSE;

CREATE INDEX idx_chatmessages_company ON "ChatMessages" ("companyId");
CREATE INDEX idx_chatmessages_chat_company ON "ChatMessages" ("chatId", "companyId");
```

**Alterações na tabela `ChatUsers`:**

```sql
ALTER TABLE "ChatUsers"
  ADD COLUMN "companyId" INTEGER REFERENCES "Companies"(id);

CREATE INDEX idx_chatusers_company ON "ChatUsers" ("companyId");
```

**Alterações na tabela `Chats`:**

```sql
ALTER TABLE "Chats"
  ADD COLUMN "type" VARCHAR(50) DEFAULT 'group';  -- 'direct'|'group'|'team'
```

#### Novos Arquivos a Criar

```
backend/src/
  services/
    InternalChatServices/
      CreateInternalChatService.ts
      SendInternalMessageService.ts       ← Valida companyId antes de salvar
      ListInternalChatsService.ts         ← WHERE companyId = ?
      GetInternalChatHistoryService.ts
  controllers/
    InternalChatController.ts
  routes/
    internalChatRoutes.ts

frontend/src/
  pages/
    InternalChat/
      index.js                            ← Página principal
      ChatList.js                         ← Lista de chats da empresa
      ChatWindow.js                       ← Janela de conversa
      MessageBubble.js                    ← Bolha de mensagem
      AudioRecorder.js                    ← Gravação de áudio inline
  hooks/
    useInternalChat.js                    ← Socket.io events
  services/
    internalChat.js                       ← REST API calls
```

#### Modelagem de Rooms Socket.io

```javascript
// Padrão de room name:
`internal-chat-${companyId}-${chatId}`

// No server socket.io (libs/socket.ts):
socket.on('internal:join', ({ chatId }) => {
  // Valida JWT → companyId
  // Valida que chat.companyId === userCompanyId
  socket.join(`internal-chat-${companyId}-${chatId}`);
});

socket.on('internal:message', async ({ chatId, content, mediaType }) => {
  // Valida companyId match
  // Salva no banco
  // Emite apenas para room correta
  io.to(`internal-chat-${companyId}-${chatId}`).emit('internal:new_message', message);
});
```

#### Arquitetura de Armazenamento de Mídia

- Upload via endpoint `POST /api/internal-chat/media`
- Arquivo salvo em `/public/company{companyId}/internal-chat/{chatId}/`
- Nunca compartilhado entre companies

#### Pontos Críticos de Segurança

- ⚠️ Toda operação Socket.io valida `companyId` do JWT
- ⚠️ `ChatMessage.companyId` adicionado como campo redundante de segurança
- ⚠️ Room names contêm companyId para impedir cross-join
- ⚠️ Histórico: query SEMPRE com `WHERE companyId = ?`

#### Plano de Testes

- [ ] Unit: Usuário A não pode fazer join em room de empresa B
- [ ] Unit: `ChatMessage.companyId` é sempre populado
- [ ] Integration: Socket.io broadcast não vaza entre empresas
- [ ] Integration: Upload de mídia salvo no diretório correto
- [ ] Load: 50 usuários simultâneos em rooms diferentes sem cruzamento

---

## 4️⃣ NOTAS PRIVADAS EM CONVERSA

### Análise do Estado Atual

O modelo `TicketNote` já existe mas tem **vulnerabilidade crítica:**

- ❌ `TicketNote` **NÃO TEM `companyId`** → o hook `tenantIsolation.ts` não consegue filtrar
- ❌ Qualquer query sem where explícito pode vazar notas entre empresas

> **ATENÇÃO:** Isso também afeta a feature existente, não só a nova.

### Estratégia Adotada

**Abordagem 1 — Reutilizar `Message.isPrivate`** (campo já existe!)

- O campo `isPrivate: boolean` já está no model `Message`
- Aproveitar isso como "nota privada" com tratamento especial no frontend
- **Vantagem:** Sem nova tabela, sem migration complexa
- **Desvantagem:** Mistura conceitos (mensagem vs nota)

**Abordagem 2 — Evoluir `TicketNote` com `companyId`** ← **ESCOLHIDA**

- Adicionar `companyId` ao `TicketNote` via migration
- Criar interface dedicada no frontend
- Mais semântico e auditável

#### Impacto no Banco de Dados

**Migration: adicionar `companyId` ao `TicketNotes`:**

```sql
-- Migration: 20260224120000-add-companyId-to-ticket-notes.ts
ALTER TABLE "TicketNotes" 
  ADD COLUMN "companyId" INTEGER REFERENCES "Companies"(id);

-- Backfill: preencher companyId a partir do Ticket vinculado
UPDATE "TicketNotes" tn
SET "companyId" = t."companyId"
FROM "Tickets" t
WHERE tn."ticketId" = t.id;

-- Agora tornar NOT NULL
ALTER TABLE "TicketNotes" 
  ALTER COLUMN "companyId" SET NOT NULL;

-- Índices
CREATE INDEX idx_ticketnotes_company ON "TicketNotes" ("companyId");
CREATE INDEX idx_ticketnotes_ticket_company ON "TicketNotes" ("ticketId", "companyId");
```

#### Alterações no Model `TicketNote.ts`

```typescript
// Adicionar ao modelo:
@ForeignKey(() => Company)
@AllowNull(false)
@Column
companyId: number;

@BelongsTo(() => Company)
company: Company;
```

#### Novos Arquivos a Criar

```
backend/src/
  services/
    TicketNoteServices/
      CreateTicketNoteService.ts       ← Valida ticketId pertence à empresa
      ListTicketNotesService.ts        ← WHERE companyId = ? AND ticketId = ?
      DeleteTicketNoteService.ts       ← Valida propriedade
  controllers/
    TicketNoteController.ts            ← Verificar se já existe; refatorar
  routes/
    ticketNoteRoutes.ts

frontend/src/
  components/
    PrivateNoteArea/
      index.js                         ← Área de input de nota
      NoteCard.js                      ← Card amarelo/destacado
      NotesList.js                     ← Lista de notas do ticket
  pages/
    Tickets/
      PrivateNotesSection.js           ← Seção dentro da conversa
```

#### Interface Visual (Requisito)

```
┌─────────────────────────────────────────────┐
│  🔒 NOTA PRIVADA               [× fechar]   │
│  ┌──────────────────────────────────────┐   │
│  │ Texto da nota...                     │   │
│  └──────────────────────────────────────┘   │
│                            [Salvar Nota]     │
└─────────────────────────────────────────────┘

Exibição na conversa:
┌─────────────────────────────────────────────┐
│ 🔒 Nota Privada — João Silva               │
│ [fundo amarelo suave: #FEFCE8]             │
│ "Lembrar de verificar o contrato antes     │
│  de responder o cliente."                   │
│                         14/02/2026 10:30   │
└─────────────────────────────────────────────┘
```

#### Pontos Críticos de Segurança

- ⚠️ **API pública (sem auth) NUNCA retorna notas** — filtro em nível de controller
- ⚠️ `companyId` obrigatório em todas as queries de TicketNote
- ⚠️ Webhook de saída não inclui `TicketNote` no payload
- ⚠️ Validação: `ticket.companyId === req.user.companyId` antes de criar nota
- ⚠️ Apenas usuários da mesma empresa visualizam (`companyId` match no JWT)

#### Plano de Testes

- [ ] Unit: Nota criada sempre herda `companyId` do ticket
- [ ] Unit: API retorna 403 ao acessar nota de outro company
- [ ] Integration: Busca de notas filtrada por companyId
- [ ] Security: Endpoint público (ex: webhook) não retorna notas privadas
- [ ] UI: Nota aparece com estilo amarelo diferenciado da mensagem comum

---

## ESTRATÉGIA DE IMPLEMENTAÇÃO INCREMENTAL

### Ordem Recomendada de Entrega

```
Semana 1: Feature 4 (Notas Privadas)
   ├── Mais simples, menor risco
   ├── Corrige vulnerabilidade existente em TicketNote
   └── Entrega valor imediato para agentes

Semana 2: Feature 2 (Quick Send)
   ├── Sem nova tabela
   ├── Reutiliza infra existente (Whatsapp, Contact, Ticket)
   └── Valor operacional alto para times de suporte

Semana 3: Feature 1 (Export PDF)
   ├── Bull Worker (infra já existe)
   ├── Puppeteer (já no package.json)
   └── Template pode ser evoluído depois

Semana 4: Feature 3 (Chat Interno)
   ├── Mais complexa (Socket.io rooms + mídia + UI)
   ├── Requer mais QA de isolamento
   └── Pode ser feature flag até validação completa
```

### Feature Flags Recomendadas

Cada feature deve ter uma flag em `CompaniesSettings` para habilitar/desabilitar por empresa:

```
ENABLE_PDF_EXPORT     = true/false
ENABLE_QUICK_SEND     = true/false  
ENABLE_INTERNAL_CHAT  = true/false
ENABLE_PRIVATE_NOTES  = true/false
```

---

## RISCOS TÉCNICOS

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Puppeteer consumir muita RAM no Docker | Alta | Médio | Limitar concorrência (maxConcurrency: 2 no Bull) |
| Socket.io rooms cruzando após reconexão | Média | Alto | Revalidar companyId no evento `reconnect` |
| Migration de backfill em `TicketNotes.companyId` falhar se orphan | Média | Médio | Script de limpeza antes da migration |
| libphonenumber-js aumentar bundle size | Baixa | Baixo | Lazy load ou usar regex simples inicialmente |
| Quick Send criar ticket duplicado (race condition) | Média | Médio | Upsert com lock (SELECT...FOR UPDATE ou mutex) |
| PDF gerado expor dados de outra empresa | Baixa | Crítico | Code review + teste de segurança obrigatório |

---

## PONTOS CRÍTICOS DE SEGURANÇA TRANSVERSAIS

1. **Nunca confiar no `companyId` vindo do body** — sempre usar `req.user.companyId` do JWT
2. **Toda nova rota** deve ser registrada com `isAuth` middleware
3. **Todo novo model com dados sensíveis** deve ter `companyId NOT NULL`
4. **Arquivos de mídia** sempre salvos em `/public/company{companyId}/` (namespace isolado)
5. **O hook `tenantIsolation.ts`** é a última linha de defesa — não criar brechas com queries raw
6. **Bull Jobs** devem incluir `companyId` no payload e revalidar no worker

---

## CHECKLIST PRÉ-IMPLEMENTAÇÃO

### Para cada Feature

- [ ] Model criado com `companyId @AllowNull(false)`
- [ ] Migration criada com índice em `(companyId, ...)`
- [ ] Service valida `companyId` explicitamente
- [ ] Controller usa `req.user.companyId` (não body)
- [ ] Rota protegida com `isAuth`
- [ ] Teste de segurança: cross-company retorna 403
- [ ] Mobile responsivo validado em 320px
- [ ] Feature flag em `CompaniesSettings`

---

*Documento gerado como pré-requisito de implementação. Nenhum código deve ser escrito antes da aprovação deste plano.*
