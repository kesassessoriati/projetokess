# AtendZappy Asterisk

Stack do Asterisk para ligar o SIP Trunk ao Webphone do CRM via WebRTC.

## Servicos e portas

- SIP trunk UDP: `5060/udp`
- RTP audio UDP: `10000-10100/udp`
- WebSocket WebRTC interno: `8088`, publicado por Traefik como `wss://sip.wapainel.com.br/ws`
- Rede Docker externa: `wapainelnet`
- Volumes persistentes: `asterisk_spool`, `asterisk_lib`, `asterisk_logs`
- Configuracao persistente no host: `/opt/atendzappy-asterisk/templates`

## Variaveis obrigatorias

Use `asterisk/.env.example` como base no Portainer:

- `ASTERISK_PUBLIC_IP`: IP publico do novo servidor.
- `WEBRTC_EXTENSION`: ramal usado pelo CRM, normalmente `7001`.
- `WEBRTC_PASSWORD`: senha do ramal WebRTC.
- `WEBRTC_DEFAULT_DID`: DID padrao de saida e entrada.
- `SIP_TRUNK_HOST`: host da operadora, atualmente `sip1.sipserver.com.br`.
- `SIP_TRUNK_PORT`: porta da operadora, normalmente `5060`.
- `SIP_TRUNK_USERNAME`: usuario do trunk.
- `SIP_TRUNK_PASSWORD`: senha do trunk.

## Deploy pelo Portainer

1. Crie a rede externa `wapainelnet` caso ela ainda nao exista.
2. Crie os volumes externos `asterisk_spool`, `asterisk_lib` e `asterisk_logs`.
3. No servidor, envie a pasta `asterisk/templates` para `/opt/atendzappy-asterisk/templates`.
4. No Portainer, crie uma stack usando `asterisk/asterisk-stack.yml`.
5. Preencha as variaveis de ambiente da stack com os valores do novo servidor.
6. Aponte o DNS `sip.seu-dominio.com.br` para o IP publico do novo servidor.
7. Ajuste a label Traefik `Host(...)` da stack para esse dominio.
8. Faça o deploy e valide no container:

```bash
docker exec -it $(docker ps --format '{{.ID}} {{.Names}}' | awk '/asterisk/ {print $1; exit}') asterisk -rx 'pjsip show contacts'
docker exec -it $(docker ps --format '{{.ID}} {{.Names}}' | awk '/asterisk/ {print $1; exit}') asterisk -rx 'http show status'
```

## Configuracao no CRM

- Host SIP: dominio publicado pelo Traefik, exemplo `sip.wapainel.com.br`
- Porta: `443`
- Protocolo: `wss`
- Caminho WS: `/ws`
- Dominio SIP: mesmo host do SIP
- Usuario/Auth user: valor de `WEBRTC_EXTENSION`
- Senha: valor de `WEBRTC_PASSWORD`
- DID padrao: valor de `WEBRTC_DEFAULT_DID`

O CRM envia o DID escolhido no header `X-AtendZappy-DID`. O Asterisk normaliza o numero, define `CALLERID(num)` e injeta `P-Preferred-Identity`/`P-Asserted-Identity` no canal de saida do trunk via pre-dial handler.
