# Guia de Contribuicao

Este projeto esta em producao. Toda contribuicao deve priorizar estabilidade, isolamento multi-tenant e alteracoes cirurgicas.

## Papeis

### Tech Lead

- Define escopo.
- Aprova decisoes tecnicas sensiveis.
- Autoriza push.
- Conduz deploy via Portainer.
- Valida producao.
- Orienta acesso a servidor, banco, logs e containers.

### Desenvolvedor ou agente de IA

- Analisa o escopo.
- Investiga codigo existente.
- Avalia impacto e risco.
- Implementa a menor alteracao segura.
- Executa validacoes.
- Cria commit local.
- Nao faz push sem autorizacao.
- Nao faz deploy.

## Como iniciar uma tarefa

1. Verificar estado do Git.
2. Entender objetivo da tarefa.
3. Localizar arquivos envolvidos.
4. Verificar se envolve dados multi-tenant.
5. Verificar se envolve areas criticas.
6. Avaliar risco de regressao.
7. Implementar somente o necessario.
8. Validar.
9. Criar commit local.
10. Informar resultado ao Tech Lead.

## Multi-tenant e companyId

O projeto depende de `companyId`.

Sempre revisar `companyId` ao alterar:

- Contatos.
- Tickets.
- Mensagens.
- Campanhas.
- Filas.
- Usuarios.
- CRM.
- Pipeline.
- Oportunidades.
- Financeiro.
- Automacoes.
- Agendamentos.
- Webhooks.
- Jobs.
- Relatorios.
- Dashboards.
- Queries diretas no banco.

Regras:

- Nunca confiar em `companyId` vindo do body quando existir usuario autenticado.
- Usar `req.user.companyId` ou contexto autenticado.
- Validar ownership entre entidades relacionadas.
- Jobs Bull devem carregar e revalidar `companyId`.
- Rotas publicas nao podem expor dados privados.

## Queries raw

Evite adicionar `sequelize.query()`.

Se for inevitavel:

- Justifique tecnicamente.
- Use `replacements` ou `bind`.
- Nao concatene parametros.
- Inclua filtro por `companyId` para dados multi-tenant.
- Respeite status e permissao.
- Documente o impacto na resposta final.

## Areas criticas

Alterar com cuidado extra:

- `backend/src/queues.ts`
- Campanhas.
- Disparos em massa.
- WhatsApp/Baileys/Wbot/providers.
- Bull/Redis.
- Agendamentos.
- Automacoes.
- Financeiro e faturamento.
- Tickets e mensagens.
- API externa.
- Rotas publicas.
- Autenticacao Bearer/API Key.
- Socket.io.
- Migrations.

Nessas areas, evite refatoracoes amplas. Se o risco for sistemico, pare e reporte antes de aplicar mudanca invasiva.

## Cuidados antes de alterar backend

- Verificar rotas em `backend/src/routes`.
- Verificar services e controllers envolvidos.
- Verificar models e migrations.
- Verificar tenant isolation.
- Verificar impacto em jobs, webhooks e sockets.
- Verificar se imports continuam validos.
- Nao alterar contratos de API sem aprovacao.

## Cuidados antes de alterar frontend

- Confirmar origem de variaveis via `frontend/src/config.js`.
- Confirmar uso de `REACT_APP_BACKEND_URL` em runtime/build antes de alterar.
- Verificar Axios em `frontend/src/services/api.js`.
- Verificar Socket.io contexts/services se envolver tempo real.
- Preservar compatibilidade de rotas e componentes existentes.
- Evitar mudancas visuais amplas sem escopo.

## Docker, Swarm e producao

Sem autorizacao explicita, nao:

- Alterar stack de producao.
- Criar imagem Docker.
- Fazer push para Docker Hub.
- Reiniciar containers.
- Rodar migrations em producao.
- Alterar secrets.
- Alterar Traefik labels.
- Executar comandos em producao.

## Validacao

Execute validacoes compativeis com a tarefa:

```bash
cd backend
npm run build
npm run lint
npm test

cd ../frontend
npm run build
npm test
```

Nem todos os comandos precisam ser executados em toda tarefa. Escolha validacoes proporcionais ao risco e registre o que foi executado.

Se um comando nao existir, falhar por ambiente ou for pesado demais para a tarefa, informe claramente.

Nunca afirme que testou algo sem ter executado ou validado tecnicamente.

## Commits

Criar commit local ao finalizar cada tarefa.

Padrao de mensagem:

```text
fix: descricao curta da correcao
feat: descricao curta da funcionalidade
chore: descricao curta da manutencao
refactor: descricao curta da refatoracao autorizada
docs: descricao curta da documentacao
```

Exemplo:

```bash
git add README.md ARCHITECTURE.md DOCKER.md SWARM.md CONTRIBUTING.md
git commit -m "docs: adicionar documentacao tecnica inicial do projeto"
```

## Push

Nenhum push deve ser feito sem autorizacao explicita do Tech Lead.

Autorizacoes validas incluem frases como:

- "Pode enviar para o GitHub"
- "Faca o push"
- "Pode subir os commits"
- "Envia para o repositorio"
- "Agora pode mandar para o GitHub"

Sem autorizacao, manter commits apenas locais.

## Como reportar riscos

Na resposta final da tarefa, informar:

- O que foi alterado.
- Arquivos alterados.
- Pontos de atencao multi-tenant.
- Queries raw afetadas.
- Validacoes executadas.
- Riscos ou validacoes manuais necessarias.
- Commit local criado.
- Status para validacao.

## Formato final recomendado

```text
Resumo tecnico:
- ...

Arquivos alterados:
- ...

Pontos de atencao multi-tenant:
- ...

Validacoes executadas:
- ...

Riscos ou observacoes:
- ...

Commit local:
- ...

Status:
- ...
```
