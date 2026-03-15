# Plano de Migração para Suporte Completo ao WhatsMeow

**Data:** 2026-03-15
**Status:** Planejado — não iniciado
**Objetivo:** Refatorar todos os módulos do sistema para usar a camada de abstração `ProviderFactory`, permitindo que o WhatsMeow funcione em todos os módulos, não apenas em gestão de grupos.

---

## Contexto

O sistema já possui uma camada de abstração de provider corretamente implementada em:
```
backend/src/services/whatsapp/providers/
├── BaseProvider.ts          ← Interface abstrata (todos os métodos)
├── BaileysProvider.ts       ← Implementação Baileys (atual padrão)
├── WhaileysProvider.ts      ← Implementação Whaileys
├── WhatsMeowProvider.ts     ← Implementação WhatsMeow (REST API)
└── ProviderFactory.ts       ← Fábrica que roteia pelo campo Whatsapp.provider
```

O problema: ~75% do código legado ignora essa abstração e chama `getWbot()` diretamente, que retorna uma conexão Baileys. Isso torna o WhatsMeow incompatível com a maioria dos módulos.

**Padrão legado (não funciona com WhatsMeow):**
```typescript
const wbot = getWbot(whatsappId);
await wbot.sendMessage(jid, content);
```

**Padrão correto (funciona com qualquer provider):**
```typescript
const provider = ProviderFactory.createProvider(wa, wbot, companyId);
await provider.sendMessage(jid, content);
```

---

## Diagnóstico de Compatibilidade Atual

| Módulo | Status Atual | Causa |
|--------|-------------|-------|
| Gestão de Grupos (CRUD) | ✅ Funciona | Usa ProviderFactory |
| Sincronização de Grupos | ✅ Funciona | Handler dedicado WhatsMeow |
| Campanhas em Grupos | ✅ Funciona | Usa ProviderFactory |
| Envio de texto simples | ✅ Funciona | SendWhatsAppMessage usa provider |
| Automação (mensagem) | ✅ Funciona | Delega para SendWhatsAppMessage |
| **Disparo em massa (campanha normal)** | ❌ Quebra | queues.ts chama wbot.sendMessage() direto |
| **Envio de mídia** | ❌ Quebra | SendWhatsAppMedia usa getWbot() direto |
| **Campanhas de botão/lista** | ❌ Quebra | ButtonCampaignService é Baileys-only |
| **Follow-up campaigns** | ❌ Quebra | Usa getWbot() direto |
| **ChatBot / Typebot / OpenAI** | ❌ Quebra | Todos usam getWbot() direto |
| **Validação de número** | ❌ Quebra | CheckNumber chama wbot.onWhatsApp() direto |
| **Importar contatos** | ❌ Quebra | Baileys-only |
| **Editar mensagem** | ❌ Quebra | Baileys-only |
| **Bloquear/desbloquear contato** | ❌ Quebra | Baileys-only |
| **wbotMessageListener** | ❌ Quebra | Event-driven Baileys, sem equivalente WhatsMeow |
| **Warmup** | ❌ Quebra | Chama groupFetchAllParticipating() direto |

---

## Fases do Plano

---

### FASE 1 — Expandir o BaseProvider (Pré-requisito)

Antes de migrar qualquer service, é preciso garantir que o `BaseProvider` cubra todos os métodos necessários.

**Arquivo:** `backend/src/services/whatsapp/providers/BaseProvider.ts`

Métodos a adicionar:

```typescript
// Validação de número
abstract onWhatsApp(jid: string): Promise<{ exists: boolean; jid: string }>;

// Envio de mídia
abstract sendMedia(to: string, mediaPath: string, caption?: string, mimeType?: string): Promise<any>;

// Editar mensagem
abstract editMessage(to: string, messageId: string, newText: string): Promise<any>;

// Bloquear/Desbloquear contato
abstract blockContact(jid: string): Promise<any>;
abstract unblockContact(jid: string): Promise<any>;

// Buscar foto de perfil
abstract getProfilePicUrl(jid: string): Promise<string | null>;

// Buscar todos os grupos (warmup e sync)
abstract fetchAllGroups(): Promise<any[]>;
```

**Implementar nos 3 providers:**
- `BaileysProvider.ts` — já tem a lógica, só encapsular
- `WhaileysProvider.ts` — idem
- `WhatsMeowProvider.ts` — implementar via chamadas HTTP à API WhatsMeow

---

### FASE 2 — Migrar Serviços Core de Mensagens

Prioridade máxima — são a base de todos os outros módulos.

#### 2.1 `SendWhatsAppMedia.ts`
**Arquivo:** `backend/src/services/WbotServices/SendWhatsAppMedia.ts`
**Problema:** Linha 144 usa `getWbot()` direto, linha 295 chama `wbot.sendMessage()`.
**Mudança:** Usar `ProviderFactory.createProvider()` e delegar para `provider.sendMedia()`.

#### 2.2 `SendWhatsAppMessageLink.ts`
**Arquivo:** `backend/src/services/WbotServices/SendWhatsAppMessageLink.ts`
**Problema:** Linha 37 usa `getWbot()` direto.
**Mudança:** Usar `ProviderFactory.createProvider()`.

#### 2.3 `CheckNumber.ts`
**Arquivo:** `backend/src/services/WbotServices/CheckNumber.ts`
**Problema:** Linhas 51 e 66 chamam `wbot.groupMetadata()` e `wbot.onWhatsApp()`.
**Mudança:** Usar `provider.onWhatsApp()` e `provider.getGroupMetadata()`.

#### 2.4 `CheckIsValidContact.ts`
**Arquivo:** `backend/src/services/WbotServices/CheckIsValidContact.ts`
**Problema:** Linha 11 usa `wbot.onWhatsApp()`.
**Mudança:** Usar `provider.onWhatsApp()`.

#### 2.5 `GetProfilePicUrl.ts`
**Arquivo:** `backend/src/services/WbotServices/GetProfilePicUrl.ts`
**Problema:** Usa `getWbot()` direto.
**Mudança:** Usar `provider.getProfilePicUrl()`.

---

### FASE 3 — Migrar Campanhas e Disparos em Massa

#### 3.1 `queues.ts` — handleDispatchCampaign
**Arquivo:** `backend/src/queues.ts`
**Linhas:** 1058–1281
**Problema:** `handleDispatchCampaign()` e `SendMessage()` usam `GetWhatsappWbot()` que retorna baileys direto.
**Mudança:** Substituir `GetWhatsappWbot()` por `ProviderFactory.createProvider()` e usar `provider.sendMessage()` / `provider.sendMedia()`.

#### 3.2 `ButtonCampaignService.ts`
**Arquivo:** `backend/src/services/ButtonCampaignService/ButtonCampaignService.ts`
**Problema:** Linha 51 verifica `channel === "whatsapp_whaileys"`, ignora WhatsMeow. Usa `sendButtonMessage()` Baileys-only.
**Mudança:** Adicionar verificação para WhatsMeow e usar mensagem de fallback (botões como texto).

#### 3.3 `ExecuteFollowUpCampaignService.ts`
**Arquivo:** `backend/src/services/FollowUpCampaignService/ExecuteFollowUpCampaignService.ts`
**Problema:** Linha 62 usa `getWbot()` direto.
**Mudança:** Usar `ProviderFactory.createProvider()`.

#### 3.4 `DispatchProcessorService.ts` (agendamentos)
**Arquivo:** `backend/src/services/ScheduledDispatcherService/DispatchProcessorService.ts`
**Problema:** Linha 75 usa `getWbot()` direto.
**Mudança:** Usar provider abstraction.

---

### FASE 4 — Migrar ChatBot / IA / Integrações

#### 4.1 `ChatBotListener.ts`
**Arquivo:** `backend/src/services/WbotServices/ChatBotListener.ts`
**Mudança:** Passar provider como parâmetro ao invés de usar `getWbot()`.

#### 4.2 `TypebotListener.ts`
**Arquivo:** `backend/src/services/TypebotServices/TypebotListener.ts`
**Mudança:** Mesma abordagem — provider como parâmetro.

#### 4.3 `OpenAiService.ts` / `OpenAiTools.ts`
**Arquivos:** `backend/src/services/OpenAi/`
**Mudança:** Usar `provider.sendMessage()` e `provider.sendMedia()`.

#### 4.4 `ActionsWebhookService.ts`
**Arquivo:** `backend/src/services/ActionsWebhookService/`
**Mudança:** Usar provider abstraction para envio de respostas.

---

### FASE 5 — Migrar Funcionalidades Auxiliares

#### 5.1 `EditWhatsAppMessage.ts`
**Arquivo:** `backend/src/services/WbotServices/EditWhatsAppMessage.ts`
**Mudança:** Usar `provider.editMessage()` — no WhatsMeow fazer fallback para delete+reenvio se API não suportar.

#### 5.2 `BlockUnblockContactService.ts`
**Arquivo:** `backend/src/services/ContactServices/BlockUnblockContactService.ts`
**Mudança:** Usar `provider.blockContact()` / `provider.unblockContact()`.

#### 5.3 `ImportContactsService.ts`
**Arquivo:** `backend/src/services/ContactServices/ImportContactsService.ts`
**Mudança:** Usar `provider.fetchAllGroups()` para importar contatos de grupos.

#### 5.4 `WhatsappWarmupService.ts`
**Arquivo:** `backend/src/services/WhatsappWarmupService/`
**Problema:** Chama `groupFetchAllParticipating()` direto.
**Mudança:** Usar `provider.fetchAllGroups()`.

---

### FASE 6 — wbotMessageListener (Maior Complexidade)

**Arquivo:** `backend/src/services/WbotServices/wbotMessageListener.ts` (6.475 linhas)

Este é o maior desafio. O listener é inteiramente baseado no modelo event-driven do Baileys (`conn.ev.on("messages.upsert", ...)`). O WhatsMeow usa webhook (push) ao invés de eventos.

**Abordagem:**

1. Criar `wbotMessageListenerWhatsMeow.ts` — novo listener que recebe webhooks do WhatsMeow
2. Extrair a lógica de processamento de mensagens do listener atual para funções reutilizáveis (sem dependência de Baileys)
3. Criar rota de webhook dedicada: `POST /whatsmeow/webhook/:companyId/:sessionId`
4. Ambos os listeners chamam as mesmas funções de processamento

**Nota:** Esta fase pode ser feita de forma incremental — primeiro criar o webhook receiver básico, depois migrar funcionalidades gradualmente.

---

## Resumo por Prioridade

| Prioridade | Fase | Impacto |
|-----------|------|---------|
| 🔴 Alta | Fase 1 — Expandir BaseProvider | Pré-requisito de tudo |
| 🔴 Alta | Fase 2 — Core messaging (media, validação) | Base de todos os módulos |
| 🔴 Alta | Fase 3 — Campanhas e disparos em massa | Funcionalidade principal solicitada |
| 🟡 Média | Fase 4 — ChatBot / IA | Automações e respostas automáticas |
| 🟡 Média | Fase 5 — Auxiliares | Funcionalidades de suporte |
| 🟢 Baixa | Fase 6 — wbotMessageListener | Alta complexidade, alto retorno |

---

## Estimativa de Esforço

| Fase | Arquivos afetados | Complexidade |
|------|------------------|-------------|
| Fase 1 | 4 arquivos (3 providers + base) | Média |
| Fase 2 | 5 arquivos | Baixa–Média |
| Fase 3 | 4 arquivos | Média |
| Fase 4 | 4 arquivos | Média |
| Fase 5 | 4 arquivos | Baixa |
| Fase 6 | 1 arquivo gigante + novo listener | Alta |

**Total: ~22 arquivos modificados + 1 novo arquivo**

---

## Observações Técnicas

- `updateGroupPicture` não é suportado pela API WhatsMeow — manter como limitação conhecida ou verificar se a versão da API usada suporta upload de imagem via multipart.
- Mensagens com **botões e listas** no WhatsMeow devem usar fallback para texto formatado, pois a API REST pode não suportar esses tipos nativamente.
- O campo `Whatsapp.provider` deve ser `"whatsmeow"` para que o `ProviderFactory` roteie corretamente — sem necessidade de alterar a interface ou banco.
- Toda nova funcionalidade deve seguir o padrão `ProviderFactory` desde o início.
