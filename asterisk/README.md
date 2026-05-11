# AtendZappy Asterisk

Configuracao inicial para ligar o SIP Trunk SobreIP ao Webphone do CRM.

- Trunk SIP UDP: `5.189.166.61:5060`
- WebSocket via Traefik: `wss://sip.wapainel.com.br/ws`
- Ramal WebRTC inicial: `7001`

No CRM, configure SIP / Webphone com:

- Host SIP: `sip.wapainel.com.br`
- Porta: `443`
- Protocolo: `wss`
- Caminho WS: `/ws`
- Dominio SIP: `sip.wapainel.com.br`
- Usuario: `7001`
- Auth user: `7001`
- Senha: `8XmTEDMDKu6yZVlcXiDJluGK`

## DIDs

O CRM envia o DID escolhido na chamada pelo header SIP `X-AtendZappy-DID`.
O dialplan usa esse valor como `CALLERID(num)` antes de encaminhar para o trunk SobreIP.
Se nenhum DID for enviado, o fallback atual e `1231970516`.
