# SIP Webhook Integration - Chamadas Recebidas

## Endpoint

```
POST /api/sip/webhook/events
```

## Autenticação

Header obrigatório:
```
x-sip-webhook-token: SEU_TOKEN_AQUI
```

O token é configurado via variável de ambiente:
```
SIP_WEBHOOK_TOKEN=troque_por_um_token_seguro
```

## Payload

```json
{
  "event": "incoming_call",
  "provider": "asterisk",
  "callId": "abc-123",
  "providerCallId": "asterisk-unique-id",
  "fromNumber": "11999999999",
  "toNumber": "7130000000",
  "didNumber": "7130000000",
  "extension": "7001",
  "status": "ringing",
  "timestamp": "2026-05-23T14:00:00.000Z",
  "metadata": {}
}
```

## Eventos suportados

| Evento | Status interno | Descrição |
|--------|---------------|-----------|
| `incoming_call` | ringing | Nova chamada recebida |
| `ringing` | ringing | Chamada tocando |
| `answered` | answered | Chamada atendida |
| `completed` | completed | Chamada encerrada normalmente |
| `missed` | missed | Chamada não atendida |
| `busy` | busy | Ocupado |
| `failed` | failed | Falha na chamada |
| `canceled` | canceled | Chamada cancelada |

## Fluxo

1. Asterisk/provedor envia POST para o endpoint com evento `incoming_call`
2. CRM valida token `x-sip-webhook-token`
3. CRM normaliza `didNumber` e localiza `SipDid` ativo
4. CRM obtém `companyId` do DID encontrado
5. CRM resolve rota de entrada via `ResolveInboundCallRouteService`
6. CRM cria `SipCallLog` com status `ringing`
7. CRM localiza contato existente pelo número (se disponível)
8. CRM emite evento `sip-call` via Socket.IO para a empresa
9. Webphone do usuário destino exibe notificação de chamada recebida
10. Eventos posteriores (answered, completed, etc.) atualizam o mesmo log

## Como o DID identifica a empresa

O CRM **não confia** em `companyId` enviado no payload. Em vez disso:
1. Normaliza `didNumber` (remove tudo não-dígito)
2. Busca `SipDid` ativo com `normalizedNumber` correspondente
3. Obtém `companyId` do registro `SipDid`

## Idempotência

O CRM usa `providerCallId` para evitar duplicação de logs. Se o mesmo `providerCallId` já existir, o log é atualizado em vez de criado.

## Exemplo curl

```bash
curl -X POST "https://API_URL/api/sip/webhook/events" \
  -H "Content-Type: application/json" \
  -H "x-sip-webhook-token: SEU_TOKEN_AQUI" \
  -d '{
    "event": "incoming_call",
    "provider": "asterisk",
    "callId": "test-001",
    "providerCallId": "asterisk-001",
    "fromNumber": "11999999999",
    "toNumber": "7130000000",
    "didNumber": "7130000000",
    "status": "ringing",
    "timestamp": "2026-05-23T14:00:00.000Z"
  }'
```

## Limitações

- Atender/rejeitar chamada real requer sessão SIP no navegador (JsSIP + Asterisk WebSocket)
- Criação automática de ticket para chamada recebida não implementada nesta fase
- Caller ID real depende de configuração no Asterisk/provedor
- ws/wss não alterado

## Pendências futuras

- Criação controlada de ticket ao receber chamada
- Integração com filas de atendimento
- Relatório de chamadas recebidas
- Dashboard de call center
