# Proposta: Módulo de Telefonia SIP

**Status:** Armazenada para análise de viabilidade  
**Data:** 2026-02-16  

## Resumo

Adicionar módulo independente de telefonia baseado em protocolo SIP para realização de chamadas dentro do sistema, integrando um Webphone à interface e registrando histórico completo de chamadas.

## Infraestrutura de Voz Existente no Sistema (Descobertas)

### 1. WAVoIP (app.wavoip.com)

- Já integrado no frontend (Atendimentos + Mobile)
- Abre chamada via iframe `https://app.wavoip.com/call?token=...`
- Token configurável por conexão via campo `wavoip` no model Whatsapp
- Campo no WhatsAppModal para configurar token

### 2. voice-calls-baileys

- Dependência opcional (try/catch no StartWhatsAppSession.ts)
- Não consta no package.json (não instalada)
- Quando disponível, integra chamadas de voz via Baileys

### 3. CallRecord Model

- Tabela `CallRecords` já existe
- Campos: callId, type, status, fromNumber, toNumber, duration, recordingUrl
- Relations: Contact, Whatsapp, Ticket, User, Company
- Controller com CRUD + summary

### 4. wbotMonitor

- Já escuta evento `CB:call` do Baileys
- Registra chamadas incoming (offer → terminate)
- Calcula duração e status (answered, missed, busy)
- Emite eventos socket em tempo real
- Envia mensagem automática para chamadas perdidas

## Proposta de Implementação SIP

### Fase 1 — Servidor SIP (Asterisk)

- Container Docker com Asterisk 20
- Configuração WebSocket Secure (WSS)
- Certificado SSL para WebRTC
- NAT traversal via STUN/TURN

### Fase 2 — Webphone SIP.js

- Componente React com SIP.js
- Softphone in-browser via WebRTC
- Registro SIP, controle de chamadas
- Integração com microfone/áudio

### Fase 3 — Integração com Sistema

- Canal `sip` no model Whatsapp/Connections
- Reutilizar modelo CallRecord existente
- Comunicação via API REST + WebSocket

### Fase 4 — CDR e Gravações

- Reutilizar tabela CallRecords
- Armazenamento de gravações (local ou S3)
- Dashboard de métricas

## Estimativa: 15-20 dias de desenvolvimento

## Complexidade: Alta
