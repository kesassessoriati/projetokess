
# Estratégia de Blindagem Multi-Tenant (P1)

Este documento descreve as medidas de blindagem estrutural implementadas para garantir o isolamento total de dados entre empresas (tenants) no backend.

## 1. Contexto Requisitado (AsyncLocalStorage)

Utilizamos a API `AsyncLocalStorage` do Node.js para criar um contexto de execução seguro para cada requisição.

- **Arquivo**: `backend/src/context.ts`
- **Funcionamento**: Assim que o usuário é autenticado, o `companyId` é injetado no contexto. Qualquer código executado "abaixo" desta requisição (Services, Models, Hooks) tem acesso ao `companyId` sem necessidade de passagem manual de parâmetros.

## 2. Injeção Global via Hooks (Sequelize)

Em vez de depender de `defaultScope` estáticos em cada Model (que poderiam ser esquecidos em novas implementações), optamos por **Hooks Globais** na instância do Sequelize.

- **Arquivo**: `backend/src/database/tenantIsolation.ts`
- **Mecanismos**:
  - `beforeFind`: Intercepta todas as consultas (`find`, `findOne`, `findAll`, etc.). Se o contexto possuir um `companyId`, ele é injetado automaticamente na cláusula `where`.
  - `beforeCreate`: Garante que qualquer novo registro criado tenha o `companyId` do contexto, impedindo que um usuário tente forjar um registro para outra empresa.
  - `beforeBulkUpdate`: Garante a proteção em atualizações em lote.

## 3. Middleware de Contexto Obrigatório

Atualizamos os middlewares de autenticação para inicializar o contexto:

- `isAuth`: Usuários do sistema.
- `tokenAuth`: Integrações via token de WhatsApp.
- `isAuthExternal`: Integrações via API Key externa.

O contexto é mantido durante todo o ciclo de vida da requisição Express.

## 4. Performance e Índices

Adicionamos uma migration para criar índices compostos nas tabelas críticas:

- `Tickets` (companyId, status)
- `Campaigns` (companyId, status, scheduledAt)
- `Schedules` (companyId, status, sendAt)
- `Contacts` (companyId, number)

**Justificativa**: Com a blindagem automática, *todas* as queries agora incluem `companyId`. Índices compostos garantem que o banco de dados possa filtrar primeiro pela empresa e depois pelo critério de busca de forma extremamente performática, evitando full table scans.

## 5. Auditoria e Riscos Residuais

- **Queries Raw (SQL Puro)**: Queries feitas com `sequelize.query()` ignoram os hooks do Sequelize. Realizamos uma varredura e refatoramos pontos críticos (ex: `ShowMessageService`). Desenvolvedores devem evitar SQL puro ou garantir o filtro manual de `companyId`.
- **Global Admins**: Rotas que usam `isAuthCompany` ou `isSuper` não definem um `companyId` no contexto propositalmente, permitindo visualizações gerenciais (planos, empresas, etc.).

## 6. Como testar o Isolamento

Foi criado um teste automatizado em `backend/src/__tests__/tenant.spec.ts`.
Para rodar os testes:

```bash
npm test
```

O teste valida se:

1. Uma busca por ID em contexto de outra empresa retorna vazio.
2. A criação de um registro herda automaticamente o ID da empresa do contexto.
