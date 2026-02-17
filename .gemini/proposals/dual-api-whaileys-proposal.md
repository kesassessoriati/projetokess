# Proposta: Dual-API (Baileys v7 + Whaileys)

**Status:** Armazenada para análise posterior  
**Data:** 2026-02-16  

## Resumo

Implementar uma segunda integração de API dentro do sistema utilizando o fork Whaileys (canove/whaileys), mantendo a Baileys v7 ativa e operacional.

## Objetivos

- Criar uma segunda integração de API dentro do sistema
- Duplicar as mesmas funcionalidades hoje existentes na baileys@7
- Manter a baileys@7 ativa e operacional, sem realizar migração
- Evitar riscos de incompatibilidade decorrentes de substituição direta da API
- Disponibilizar ao cliente duas opções de API dentro do sistema

## Estratégia Proposta

### Fase 1 — Interface Abstrata (1-2 dias)

- Criar `IWhatsAppProvider` interface
- Métodos: connect, disconnect, sendMessage, sendMedia, deleteMessage, etc.

### Fase 2 — Wrapper Baileys v7 (2-3 dias)

- Encapsular lógica atual de `wbot.ts` dentro de `BaileysProvider`

### Fase 3 — Wrapper Whaileys (3-5 dias)

- Instalar `whaileys` como dependência paralela
- Implementar `WhaileysProvider` com a mesma interface

### Fase 4 — Factory + Seleção (1-2 dias)

- `ProviderFactory` usando campo `provider` do model `Whatsapp`

### Fase 5 — Frontend + Migration (2-3 dias)

- Dropdown na tela de conexão para selecionar provider
- Migration DB

## Diferenças Técnicas

- Baileys v7: `@whiskeysockets/baileys@^7.0.0-rc.9`
- Whaileys: `whaileys@6.4.10` (baseado em Baileys 4.x, compatível com v6.x)
- Sem conflito npm (nomes de pacote diferentes)
- Whaileys tem suporte limitado a grupos

## Estimativa Total: 10-15 dias de desenvolvimento

## Arquivos afetados: ~30-35
