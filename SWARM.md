# Docker Swarm e Portainer

## Visao geral de producao

O ambiente de producao documentado usa:

- Docker Swarm.
- Portainer para gerenciamento de stacks.
- Traefik como reverse proxy e TLS.
- PostgreSQL/pgvector como banco.
- Redis dedicado para filas/cache.
- Imagens Docker versionadas.
- Volumes externos para persistencia.

O deploy operacional e responsabilidade do Tech Lead. O agente de codigo nao deve executar deploy ou comandos em producao sem autorizacao explicita.

## Redes externas identificadas

Documentacoes e stacks citam:

- `waianet`: rede overlay externa usada no deploy geral.
- `kesnet`: rede overlay externa usada na stack KES.
- `wapainelnet`: rede externa usada pela stack Asterisk/WebRTC.

Ponto de atencao: confirmar qual stack/rede esta ativa antes de qualquer analise operacional. Nao assumir apenas pela documentacao.

## Servicos principais

Servicos identificados nas stacks/documentacao:

- `atendzappy_backend`
- `atendzappy_frontend`
- `atendzappy_redis`
- `pgvector` ou PostgreSQL externo/compartilhado
- `traefik`
- `portainer`
- servicos auxiliares como `whisper_api` ou Asterisk, conforme stack

## Volumes externos

Volumes principais:

- `atendzappy_public`
- `atendzappy_logs`
- `atendzappy_redis`

Esses volumes preservam midias, logs e dados do Redis entre atualizacoes de stack.

## Fluxo de deploy documentado

1. Desenvolvedor/agente cria alteracao local.
2. Validacoes basicas sao executadas.
3. Commit local e criado.
4. Push para GitHub somente com autorizacao explicita do Tech Lead.
5. Automacao captura os commits.
6. Automacao cria build da imagem Docker.
7. Automacao versiona a imagem.
8. Automacao envia a imagem para Docker Hub.
9. Tech Lead atualiza a versao da imagem no Portainer.
10. Tech Lead executa deploy.
11. Tech Lead valida containers, logs e comportamento real em producao.

## Responsabilidades do Tech Lead

- Autorizar push.
- Validar escopo e risco.
- Atualizar imagem no Portainer.
- Fazer deploy.
- Validar servicos, containers, logs e testes em producao.
- Orientar qualquer acesso ao servidor ou comando operacional.

## Responsabilidades do agente de codigo

- Analisar o escopo.
- Investigar codigo e documentacao.
- Implementar alteracoes cirurgicas.
- Validar localmente quando possivel.
- Criar commit local.
- Informar riscos, validacoes e impacto multi-tenant.
- Aguardar autorizacao para push.

## Acoes proibidas sem autorizacao explicita

O agente nao deve:

- Fazer deploy.
- Reiniciar containers.
- Alterar stack de producao.
- Alterar Traefik labels.
- Criar imagem Docker manualmente.
- Fazer push para Docker Hub.
- Rodar migrations em producao.
- Executar comandos em producao.
- Alterar secrets reais.
- Remover volumes, redes, servicos ou dados.

## Checklist antes de solicitar deploy

- Git local limpo antes da tarefa.
- Alteracao limitada ao escopo.
- Isolamento multi-tenant revisado.
- Queries raw revisadas e parametrizadas.
- Validacoes locais executadas ou limitacoes registradas.
- Commit local criado.
- Mensagem de commit clara.
- Push autorizado pelo Tech Lead.
- Build gerado pela automacao.
- Imagem versionada e publicada pela automacao.
- Portainer atualizado manualmente pelo Tech Lead.
- Testes basicos em producao executados pelo Tech Lead.
- Logs acompanhados pelo Tech Lead quando necessario.

## Pontos de atencao operacional

- Stacks criadas via terminal podem aparecer como "Limited" no Portainer, conforme documentacao existente.
- Alguns documentos antigos indicam comandos manuais de build/push; no fluxo operacional atual, build e push de imagem ficam a cargo da automacao apos push autorizado.
- Arquivos de stack podem conter valores sensiveis historicos. Nao replicar secrets.
- Sempre confirmar com o Tech Lead antes de acessar servidor, banco, containers ou logs de producao.
