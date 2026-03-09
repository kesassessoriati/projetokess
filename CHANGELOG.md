# 📘 CHANGELOG OFICIAL
## AtendZappy – Versão Comercial

---

## 🚀 Versão 1.5 – 09/03/2026

### 🎨 Interface Premium Verde
- Dashboard (Painel) padronizado no layout verde premium
- CRM Kanban refatorado com visual verde premium consistente
- Cabeçalho de navegação "voltar" reutilizável em todas as páginas internas do CRM

### 📧 Canal de E-mail (Novo)
- Canal de e-mail integrado ao módulo de atendimento (inbound/outbound)
- Recebimento e envio de e-mails diretamente na interface de tickets
- Suporte a múltiplas contas SMTP por empresa

### 👥 Gestão de Grupos (Expansão)
- Ecossistema completo de gestão de grupos WhatsApp
- Listagem, busca, filtros e edição de grupos
- Fotos de grupo e cache de metadados para performance

### 🔥 WhatsApp Warmup (Evolução)
- 3 modos de aquecimento: básico, avançado e cross
- Scripts com IA integrada
- Migração da lógica N8n scripted para modo cross do Warmup
- Página dedicada para gestão de sessões de aquecimento

### 🔌 API Externa (Correções)
- Rotas de mensagens da API externa ajustadas e estabilizadas

---

## 🚀 Versão 1.4 – 08/03/2026

### 📧 Campanha de E-mail (Novo Módulo)
- Módulo completo de disparo de e-mails em campanhas
- Suporte a templates, destinatários e agendamento

### 📣 Disparos / Campanhas
- UX/UI da página de disparos completamente modernizada
- Interface dark/futurista com métricas integradas

### 🤖 IA – Google Gemini
- Correção de await incorreto no result.response (propriedade síncrona na v0.24.1)
- Correção do erro 404 no modelo Gemini e do envio de cabeçalho em chamadas

### 💬 Atendimento
- Padronização do tipo de conversa nas telas de atendimento

---

## 🚀 Versão 1.3 – 07/03/2026

### 📲 Mensagens Interativas
- Suporte nativo a botões e listas com fallback via Baileys
- Envio interativo no modal de envio rápido (Quick Send)
- Normalização de payload de lista interativa no despachador de campanhas
- Helper SendInteractiveMessage centralizado

### 🤖 CRM – Assistente IA
- Mensagem de erro de cota 429 mais clara com informações do provider

---

## 🚀 Versão 1.2 – 06/03/2026

### ✅ Gestão de Tarefas – Kanban (Novo Módulo)
- Módulo completo de gerenciamento de tarefas em kanban
- Atalho "Tarefas" no menu principal (abaixo de Projetos)
- Colunas arrastáveis, links e cores nos cards
- Botão "Criar Quadro" reposicionado ao lado do ícone de lixeira

### 🤖 CRM – Assistente de IA (Novo)
- Assistente IA integrado ao CRM com sistema de créditos
- Busca em cascata de chaves LLM (empresa → whitelabel)
- Seletor de provider IA (OpenAI / Gemini) no Whitelabel
- Botões "Novo Chat" e "Limpar" no assistente

### 📣 Follow-Up Automatizado (Novo Módulo)
- Módulo de campanhas de follow-up automático para leads e tickets

### 👥 Gestão de Grupos (Novo)
- Módulo de gestão de grupos WhatsApp no backend e frontend
- Correções de ESLint no módulo de grupos

### 🔥 WhatsApp Warmup (Novo)
- Módulo avançado completo: 3 modos + scripts com IA
- Correção de 3 bugs no modal de warmup
- Botão de warmup reposicionado abaixo da barra de busca

### 📣 Campanhas – Mensagens Interativas
- Tipos interativos: botões, lista e carrossel nas campanhas

### ⚙️ Infraestrutura
- Correção: isNull substituído por isNil em verifyCampaignMessageAndCloseTicket

---

## 🚀 Versão 1.1 – 05/03/2026

### 🏷️ Tags
- TagModal com nova UI/UX: modo escuro, paleta de cores aprimorada, correção de reset de campos

### 🔄 Automações do Kanban
- Flow builder de automações integrado ao Kanban CRM
- Hooks de execução de automações

### ⏱️ Timer de Produtividade
- Timer avançado de produtividade integrado ao atendimento
- Relatórios de tempo por atendente

### 📣 Campanhas – Disparos
- Refatoração completa: drawer de contatos, importação com mapeamento de campos, modais tema dark
- Contador de contatos atualizado em tempo real ao adicionar/remover

### 📊 Dashboard
- Correção de loop infinito por referências instáveis no useEffect

### 📖 Documentação API
- Páginas de documentação para CRM Leads e Pipeline

---

## 🚀 Versão 1.0 – 04/03/2026

### 🔌 API Externa – CRM
- Endpoints externos para Pipeline e CRM Leads
- Documentação completa da API Externa (API_EXTERNA.md)

### 📲 API Oficial WhatsApp
- Dispatch de webhook MESSAGE_RECEIVED para mensagens da API Oficial
- Extração de nome do contato e foto de perfil via webhook
- Correção de FK constraint na reabertura de ticket
- Isolamento de atualizações de contato e logging aprimorado

### 👥 Grupos
- Correção de travamento do chat em grupos
- Fotos de grupo e cache de metadados

### 🏢 Navegação / Menu
- Pagamentos movido para o grupo "Sistema" (restrito a admin)
- Usuários comuns podem adicionar conexões
- Reestruturação completa da sidebar

### 🏢 Cadastro de Empresa
- Registro simplificado — removidas validações de CPF/telefone/plano

---

## 🚀 Versão 0.9 – 03/03/2026

### 📣 Central de Disparos
- Central de disparos com abas, métricas integradas e modal dark/futurista
- Disparos/Campanhas promovidos para o topo da navegação

### 👥 Contatos
- Importação de Excel diretamente na página de Contatos
- Seleção em massa com master checkbox para ações em lote

### 📋 CRM – Leads
- Seleção em massa com master checkbox para ações em lote
- Busca, filtro de equipe para admin e campo CNPJ no lead

### 💬 Chat Interno
- Correção de crash no ChatPopover ao receber evento new-message
- Correção de exibição de mídia e isolamento por empresa

### 🏢 Kanban CRM
- Campo de atribuição de usuário na sidebar de conversa

---

## 🚀 Versão 0.8 – 02/03/2026

### 📎 CRM – Anexos no Lead
- Upload de arquivos com drag & drop no card do lead

### 💬 CRM – Mini-Chat WhatsApp
- Mini-chat WhatsApp com pré-modal integrado no card do lead

### 🔗 Webhooks / Integrações
- Assinaturas configuráveis de eventos webhook para integrações N8n/Webhook
- 15 eventos suportados: MESSAGE_RECEIVED, TICKET_*, LEAD_*, OPPORTUNITY_*
- Frontend: checkboxes agrupados por categoria no modal de integração
- Compatibilidade retroativa: webhookEvents=[] mantém comportamento legado

### 🤖 CRM – Sincronização de Status
- Status do lead sincronizado automaticamente com Oportunidade (Ganho → convertido / Perdido → perdido)
- Correção de estágio de pipeline sendo revertido indevidamente

---

## 🚀 Versão 0.7 – 01/03/2026

### 📅 Agenda / Calendário
- Suporte a múltiplos usuários por agendamento com UI de seleção e tabela pivot
- Geração automática de link Google Meet e envio de convites nativos de calendário
- Correção de erro 403 ao carregar agenda
- Padronização do modal de compromisso com o modal de lead

### 🏢 CRM – Pipeline
- Seletor de cor no modal de estágio
- Timeline de atividade MOVED com nome do estágio exibido dinamicamente

### 🔑 Controle de Acesso
- Menu lateral libera acessos para usuário comum (exceto área de admin sys)

---

## 📅 Versão 0.6 – 28/02/2026

### 🤖 CRM (Consolidação)
- Alteração de status de oportunidade (Ganho/Perdido) e remoção automática do kanban
- Rastreamento rigoroso e métrica de reuniões nos dashboards
- Correção de duplicidade no drag-and-drop do kanban
- Correção do importador que zerava quantidade de leads
- Padronização de status dos leads

### ⚙️ CI/CD
- GitHub Actions: build e push automático no Docker Hub

---

## 📅 Versão 0.5 – 27/02/2026

### 📧 SMTP / E-mail no CRM
- Módulo de configuração SMTP por empresa
- Envio de e-mail diretamente do card do Lead
- Modal de compromisso com e-mails e texto customizado

### 🚀 Deploy / Infraestrutura
- Stack Docker Swarm de produção atualizada e estabilizada
- Script de atualização automática para VPS com token de autenticação

---

## 📅 Versão 0.4 – 24/02/2026

### 📝 Notas Privadas
- Notas privadas multi-tenant nos tickets de atendimento

### ⚡ Envio Rápido
- Botão de Quick Send adicionado na interface de atendimento

### 🤖 IA – ChatGPT
- Integração com ChatGPT nas Integrações de Fila

### 📊 Monitoramento
- Dashboard de erros de backend e métricas de performance/produto

### ⚙️ Infraestrutura
- Isolamento multi-tenant reforçado nas filas Bull
- Persistência do estado showAllTickets entre sessões

---

## 📅 Versão 0.3 – 23/02/2026

### 🚀 Infraestrutura
- Deploy via Docker Swarm com stack-swarm.yml
- Versionamento automático no script de build

---

## 📅 Versão 0.2 – 17/02/2026

### 🔌 Aplicativos Externos
- Módulo de aplicativos externos (embedded) no backend e frontend

### 🚀 Infraestrutura
- Scripts de deploy e configuração KES (backend/frontend/db)
- Stack de produção com Traefik + Let's Encrypt

---

## 📅 Versão 0.1 – 14/02/2026

### 🏗️ Inicialização do Projeto
- Estrutura inicial: frontend React + backend Node.js/TypeScript
- Docker Swarm + Portainer
- Configuração de tema, roteamento e autenticação JWT
- Documentação de deploy completa (DEPLOY.md)

---

*Documento gerado em 09/03/2026 — AtendZappy v2*
