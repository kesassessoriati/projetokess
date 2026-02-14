import Tag from "../../models/Tag";
import Queue from "../../models/Queue";
import TicketTag from "../../models/TicketTag";
import ContactTag from "../../models/ContactTag";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import User from "../../models/User";

import { getIO } from "../../libs/socket";
import logger from "../../utils/logger";
import Whatsapp from "../../models/Whatsapp";
import ListProfissionaisService from "../ProfissionalService/ListProfissionaisService";
import { buildOpenAiToolDeclarationsFromCatalog } from "./AiToolGenerators";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import { getWbot } from "../../libs/wbot";
import { proto } from "@whiskeysockets/baileys";

// Definição das ferramentas disponíveis para a IA (geradas a partir do catálogo)
export const openAiTools = buildOpenAiToolDeclarationsFromCatalog();

// NOTA: As declarações das tools agora vêm do AiToolCatalog.ts (single source of truth)
// Para adicionar/modificar tools, edite AiToolCatalog.ts

// Interface para os argumentos das ferramentas
export interface ToolArgs {
  message?: string;
  variables?: Record<string, any>;
  command?: string;
  queueId?: string;
  userId?: string;
  tagId?: string;
  closeTicket?: boolean;
  commands?: any[];
  service_name?: string;
  weekday?: string;
  only_active?: boolean;
  limit?: number;
  productId?: number;
  quantity?: number;
  ferramentaNome?: string;
  placeholders?: Record<string, any>;
  emoji?: string;
  filename?: string;
  scope?: string;
  contact_id?: number;
  search?: string;
  page?: number;
  datetime?: string;
  schedule_id?: number;
  name?: string;
  email?: string;
  number?: string;
  cpfCnpj?: string;
  address?: string;
  birthday?: string;
  anniversary?: string;
  info?: string;
  extra_info?: Array<{ name: string; value: string }>;
  group_id?: string;
  alias?: string;
  pergunta?: string;
  [key: string]: any;
}

// Interface para o resultado da execução
export interface ToolResult {
  success: boolean;
  queue?: string;
  tags?: string[];
  note?: string | null;
  reason?: string;
  error?: string;
  formattedMessage?: string;
  originalMessage?: string;
  user?: string;
  message?: string;
  commandExecuted?: any;
  professionals?: any[];
  [key: string]: any;
}

// Função para executar as ferramentas
const normalizeToolName = (name?: string | null): string | null =>
  name ? name.trim().toLowerCase() : null;

const buildAllowedToolSet = (allowedTools?: string[] | null): Set<string> | null => {
  if (!allowedTools || allowedTools.length === 0) {
    return null;
  }
  const normalized = allowedTools
    .map(tool => normalizeToolName(tool))
    .filter(Boolean) as string[];
  return new Set(normalized);
};

export async function executeOpenAiTool(
  toolName: string,
  args: ToolArgs,
  ticket: Ticket,
  contact: Contact,
  availableTags: string[],
  allQueues: Queue[],
  allowedTools?: string[] | null,
  wbot?: any,
  msg?: proto.IWebMessageInfo
): Promise<ToolResult> {
  let result: ToolResult = { success: false };
  const allowedSet = buildAllowedToolSet(allowedTools);
  const normalizedToolName = normalizeToolName(toolName);

  try {
    if (allowedSet && (!normalizedToolName || !allowedSet.has(normalizedToolName))) {
      logger.warn(
        `[TOOLS] Execução bloqueada para tool "${toolName}" no ticket ${ticket.id} (companyId=${ticket.companyId})`
      );
      return {
        success: false,
        reason: "Ferramenta desabilitada para este prompt/empresa"
      };
    }

    switch (toolName) {
      case "execute_command":
        try {
          let commandData: any = {};
          
          if (args.command) {
            const commandMatch = args.command.match(/#\{([^}]+)\}/);
            if (commandMatch) {
              try {
                commandData = JSON.parse(`{${commandMatch[1]}}`);
              } catch (parseError) {
                logger.error(`Erro ao fazer parse do comando: ${args.command}`, parseError);
                result = { success: false, error: "Formato de comando inválido" };
                break;
              }
            }
          }
          
          if (args.queueId) commandData.queueId = args.queueId;
          if (args.userId) commandData.userId = args.userId;
          if (args.tagId) commandData.tagId = args.tagId;
          if (args.closeTicket) commandData.closeTicket = "1";
          
          const results: string[] = [];
          
          // Processar userId direto (transferência para usuário sem fila)
          if (commandData.userId && !commandData.queueId) {
            const userId = parseInt(commandData.userId);
            const user = await User.findOne({
              where: { id: userId, companyId: ticket.companyId }
            });
            
            if (user) {
              ticket.userId = userId;
              // Mantém status como "pending" - só muda para "open" quando usuário aceitar manualmente
              // ticket.status = "open"; // REMOVIDO: não muda status automaticamente
              await ticket.save();
              results.push(`Transferido para ${user.name} (aguardando aceitação)`);
              
              getIO()
                .of(String(ticket.companyId))
                .emit(`company-${ticket.companyId}-ticket`, {
                  action: "update",
                  ticket
                });
            } else {
              results.push(`Usuário ID ${userId} não encontrado`);
            }
          }
          
          if (commandData.queueId) {
            const queueId = parseInt(commandData.queueId);
            const queue = allQueues.find(q => q.id === queueId && q.companyId === ticket.companyId);
            
            if (queue) {
              // Não sobrescrever flowStopped se já foi definido por call_flow_builder
              if (!ticket.flowStopped) {
                ticket.queueId = queueId;
              }
              results.push(`Fila alterada para ${queue.name}`);
              
              if (commandData.userId) {
                const userId = parseInt(commandData.userId);
                const user = await User.findOne({
                  where: { id: userId, companyId: ticket.companyId }
                });
                
                if (user) {
                  ticket.userId = userId;
                  results.push(`Atendente alterado para ${user.name}`);
                } else {
                  results.push(`Usuário ID ${userId} não encontrado`);
                }
              }
              
              await ticket.save();
              
              getIO()
                .of(String(ticket.companyId))
                .emit(`company-${ticket.companyId}-ticket`, {
                  action: "update",
                  ticket
                });
            } else {
              results.push(`Fila ID ${queueId} não encontrada`);
            }
          }
          
          if (commandData.tagId) {
            const tagId = parseInt(commandData.tagId);
            const tag = await Tag.findOne({
              where: { id: tagId, companyId: ticket.companyId }
            });
            
            if (tag) {
              await TicketTag.findOrCreate({
                where: { ticketId: ticket.id, tagId: tag.id }
              });
              await ContactTag.findOrCreate({
                where: { contactId: contact.id, tagId: tag.id }
              });
              results.push(`Tag "${tag.name}" adicionada`);
              
              const updatedTicket = await Ticket.findByPk(ticket.id, {
                include: [
                  { model: Tag, as: "tags", attributes: ["id", "name", "color"] },
                  { model: Contact, as: "contact", attributes: ["id", "name", "number"] },
                  { model: User, as: "user", attributes: ["id", "name"] },
                  { model: Queue, as: "queue", attributes: ["id", "name", "color"] }
                ]
              });
              
              if (updatedTicket) {
                const ticketJSON = updatedTicket.toJSON() as any;
                if (!ticketJSON.tags) ticketJSON.tags = [];
                ticketJSON.tags = ticketJSON.tags.filter((tag: any) => tag && tag.name);
                
                getIO()
                  .of(String(ticket.companyId))
                  .emit(`company-${ticket.companyId}-ticket`, {
                    action: "update",
                    ticket: ticketJSON
                  });
              }
            } else {
              results.push(`Tag ID ${tagId} não encontrada`);
            }
          }
          
          if (commandData.closeTicket === "1" || commandData.closeTicket === true) {
            ticket.status = "closed";
            await ticket.save();
            results.push("Atendimento finalizado");
            
            getIO()
              .of(String(ticket.companyId))
              .emit(`company-${ticket.companyId}-ticket`, {
                action: "delete",
                ticketId: ticket.id
              });
          }
          
          result = {
            success: results.length > 0 && !results.some(r => r.includes("não encontrado")),
            message: results.join(", "),
            commandExecuted: commandData
          };
          
          logger.info(`Comando executado: ${JSON.stringify(commandData)}`);
        } catch (error) {
          logger.error(`Erro ao executar comando:`, error);
          result = {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao executar comando"
          };
        }
        break;

      case "execute_multiple_commands":
        try {
          if (!args.commands || !Array.isArray(args.commands)) {
            result = { success: false, error: "commands deve ser um array" };
            break;
          }

          const allResults: string[] = [];
          let allSuccessful = true;

          for (const cmd of args.commands) {
            const cmdResult = await executeOpenAiTool(
              "execute_command",
              cmd,
              ticket,
              contact,
              availableTags,
              allQueues,
              allowedTools,
              wbot,
              msg
            );

            if (cmdResult.message) {
              allResults.push(cmdResult.message);
            }

            if (!cmdResult.success) {
              allSuccessful = false;
            }
          }

          result = {
            success: allSuccessful,
            message: allResults.join("; "),
            commandsExecuted: args.commands.length
          };

          logger.info(`Múltiplos comandos executados: ${args.commands.length} comandos`);
        } catch (error) {
          logger.error(`Erro ao executar múltiplos comandos:`, error);
          result = {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao executar múltiplos comandos"
          };
        }
        break;

      case "format_message":
        if (args.message) {
          try {
            const currentUser = ticket.userId ? 
              await User.findByPk(ticket.userId) : null;
            
            const currentQueue = ticket.queueId ? 
              await Queue.findByPk(ticket.queueId) : null;
            
            const formattedMessage = formatMessageWithVariables(
              args.message,
              ticket,
              contact,
              currentUser || undefined,
              currentQueue || undefined,
              args.variables
            );
            
            result = { 
              success: true, 
              formattedMessage,
              originalMessage: args.message
            };
            
            logger.info(`Mensagem formatada com sucesso`);
          } catch (error) {
            logger.error(`Erro ao formatar mensagem:`, error);
            result = { 
              success: false, 
              error: error instanceof Error ? error.message : "Erro ao formatar mensagem"
            };
          }
        } else {
          result = { success: false, reason: "Mensagem não fornecida" };
        }
        break;

      case "list_professionals": {
        try {
          const { service_name, weekday, only_active, limit } = args;

          const profissionais = await ListProfissionaisService({
            companyId: ticket.companyId
          });

          const normalizedService =
            typeof service_name === "string" ? service_name.toLowerCase() : "";
          const normalizedWeekday =
            typeof weekday === "string" ? weekday.toLowerCase() : "";
          const onlyActiveFlag = Boolean(only_active);
          const maxItems = Math.min(Math.max(Number(limit) || 15, 1), 50);

          const filtered = profissionais
            .filter(profissional => {
              if (onlyActiveFlag && profissional.ativo === false) return false;

              if (normalizedService) {
                const servicesList = Array.isArray(profissional.servicos)
                  ? profissional.servicos
                  : [];
                const hasService = servicesList.some((service: any) => {
                  if (!service) return false;
                  const name =
                    typeof service === "string" ? service : service.nome;
                  return name?.toLowerCase().includes(normalizedService);
                });
                if (!hasService) return false;
              }

              if (normalizedWeekday) {
                const agendaList = Array.isArray(profissional.agenda)
                  ? profissional.agenda
                  : [];
                const worksOnDay = agendaList.some(
                  (item: any) => item?.dia?.toLowerCase() === normalizedWeekday
                );
                if (!worksOnDay) return false;
              }

              return true;
            })
            .slice(0, maxItems)
            .map(profissional => ({
              id: profissional.id,
              nome: profissional.nome,
              ativo: profissional.ativo,
              comissao: profissional.comissao,
              servicos: Array.isArray(profissional.servicos)
                ? profissional.servicos.map((service: any) => ({
                    nome: typeof service === "string" ? service : service?.nome,
                    valorOriginal: service?.valorOriginal ?? null,
                    valorComDesconto: service?.valorComDesconto ?? null,
                    possuiDesconto: service?.possuiDesconto ?? false
                  }))
                : [],
              agenda: Array.isArray(profissional.agenda)
                ? profissional.agenda.map((item: any) => ({
                    dia: item?.dia || null,
                    inicio: item?.inicio || item?.horarios || null,
                    fim: item?.fim || null,
                    almocoInicio: item?.almocoInicio || null,
                    almocoFim: item?.almocoFim || null,
                    duracaoAtendimento:
                      (item?.duracaoAtendimento ?? item?.duracao) || null
                  }))
                : [],
              valorEmAberto: profissional.valorEmAberto,
              valoresRecebidos: profissional.valoresRecebidos,
              valoresAReceber: profissional.valoresAReceber
            }));

          result = {
            success: true,
            professionals: filtered,
            total: filtered.length,
            filters: {
              service_name: normalizedService || undefined,
              weekday: normalizedWeekday || undefined,
              only_active: onlyActiveFlag || undefined
            }
          } as any;
        } catch (error) {
          logger.error("Erro ao executar list_professionals:", error);
          result = {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "Erro ao listar profissionais"
          };
        }
        break;
      }

      case "call_prompt_agent":
        if (!args.alias || !args.pergunta) {
          result = {
            success: false,
            reason: "Parâmetros 'alias' e 'pergunta' são obrigatórios"
          };
        } else {
          logger.info(
            `call_prompt_agent solicitado com alias=${args.alias} para ticket ${ticket.id}`
          );
          result = {
            success: true,
            message: "Solicitação registrada. Será tratada pelo orquestrador de IA."
          } as any;
        }
        break;

      case "call_flow_builder":
        try {
          const flowId = parseInt(args.flowId);
          
          if (!flowId || isNaN(flowId)) {
            result = { success: false, error: "flowId inválido ou não fornecido" };
            break;
          }

          // Implementação exata como o nó transferFlow
          console.log(`TransferFlow: Transferindo para fluxo ID ${flowId}`);
          
          const { FlowBuilderModel } = await import("../../models/FlowBuilder");
          const targetFlow = await FlowBuilderModel.findOne({
            where: { id: flowId, company_id: ticket.companyId }
          });
          
          if (targetFlow && targetFlow.flow) {
            console.log(`TransferFlow: Fluxo encontrado, processando dados...`);
            const flowData = typeof targetFlow.flow === 'string' 
              ? JSON.parse(targetFlow.flow) 
              : targetFlow.flow;
            
            const newNodes = flowData.nodes || [];
            const newConnects = flowData.connections || [];
            
            console.log(`TransferFlow: Nó encontrados: ${newNodes.length}, Conexões: ${newConnects.length}`);
            
            // Encontrar o nó de início do novo fluxo
            const startNode = newNodes.find((n: any) => n.type === "start");
            
            console.log(`TransferFlow: Nó start encontrado: ${startNode ? startNode.id : 'NÃO'}`);
            
            if (startNode) {
              // Encontrar a conexão que sai do start
              const startConnection = newConnects.find((c: any) => c.source === startNode.id);
              
              console.log(`TransferFlow: Conexão start encontrada: ${startConnection ? startConnection.target : 'NÃO'}`);
              
              if (startConnection) {
                // Gerar hash do fluxo
                const crypto = require('crypto');
                const hashWebhookId = crypto.randomBytes(6).toString('hex');
                
                // Atualizar ticket com novo fluxo (exatamente como o nó)
                await ticket.update({
                  flowWebhook: true,
                  lastFlowId: startConnection.target,  // Próximo nó do fluxo
                  hashFlowId: hashWebhookId,           // Hash do fluxo
                  flowStopped: flowId.toString()
                });
                
                // Criar details com estrutura correta para ActionsWebhookService
                const flowDetails = {
                  inputs: [],
                  keysFull: []
                };
                
                // Executar o novo fluxo recursivamente (como o nó)
                const { ActionsWebhookService } = await import("../WebhookService/ActionsWebhookService");
                await ActionsWebhookService(
                  ticket.whatsappId,
                  flowId,
                  ticket.companyId,
                  newNodes,
                  newConnects,
                  startConnection.target,
                  {},
                  flowDetails,
                  hashWebhookId,
                  undefined,
                  ticket.id,
                  "",
                  msg
                );
                
                // Retornar sucesso silencioso
                result = { 
                  success: true,
                  silent: true,
                  message: `TransferFlow: Cliente transferido para o flow builder ${flowId}`
                };
                
                console.log(`TransferFlow: Cliente transferido para o flow builder ${flowId}`);
              } else {
                result = { success: false, error: "Conexão de início não encontrada no fluxo" };
              }
            } else {
              result = { success: false, error: "Nó de início não encontrado no fluxo" };
            }
          } else {
            result = { success: false, error: "Fluxo não encontrado" };
          }
        } catch (error) {
          console.error(`TransferFlow: Erro ao transferir para flow builder:`, error);
          result = { success: false, error: "Erro ao transferir para fluxo" };
        }
        break;

      case "send_product":
      case "execute_tool":
      case "like_message":
      case "send_contact_file":
      case "send_emoji":
      case "get_company_schedule":
      case "get_contact_schedules":
      case "create_contact_schedule":
      case "update_contact_schedule":
      case "get_contact_info":
      case "update_contact_info":
      case "get_company_groups":
      case "send_group_message":
      case "allow_product_resend":
        result = {
          success: false,
          reason: `${toolName} precisa ser executado no contexto do OpenAiService`
        };
        logger.info(`Ferramenta ${toolName} chamada - delegada ao contexto principal`);
        break;

      default:
        result = { 
          success: false, 
          reason: `Ferramenta desconhecida: ${toolName}` 
        };
    }
  } catch (error) {
    logger.error(`Erro ao executar ferramenta ${toolName}:`, error);
    result = { 
      success: false, 
      error: error instanceof Error ? error.message : "Erro desconhecido"
    };
  }

  return result;
}

export function getToolInstructions(availableTags: string[], queueNames: string[]): string {
  return `
FERRAMENTAS DISPONÍVEIS:

1. TRANSFERIR PARA FLUXO (call_flow_builder):
   - Transfere o cliente para um fluxo automatizado específico
   - Parâmetro: flowId (ID do fluxo)
   - Exemplo: flowId: 31

2. FORMATAR MENSAGEM (format_message):
   - Personaliza mensagens com variáveis dinâmicas
   - Variáveis disponíveis:
     * {{ms}} - Saudação automática (Bom dia/tarde/noite/madrugada)
     * {{name}} / {{firstName}} - Nome completo ou primeiro nome do contato
     * {{userName}} - Nome do atendente atual
     * {{date}} - Data atual
     * {{ticket_id}} - Número do chamado
     * {{queue}} - Nome da fila/setor (configuradas: ${queueNames.join(", ") || "nenhuma"})
     * {{connection}} - Nome da conexão WhatsApp
     * {{protocol}} - Protocolo único do atendimento
     * {{hora}} - Hora atual (HH:MM:SS)
   - Exemplo: "{{ms}}  {{firstName}}! Seu protocolo é {{protocol}}"

3. EXECUTAR COMANDO (execute_command):
   - Executa comandos administrativos (transferências, tags, etc.)
   - Formato: JSON entre #{ ... }
   - Exemplos:
     * Transferir fila: #{ "queueId":"5" }
     * Transferir para atendente: #{ "queueId":"5", "userId":"12" }
     * Adicionar tag: #{ "tagId":"14" }
     * Encerrar ticket: #{ "closeTicket":"1" }
   - Tags disponíveis: ${availableTags.join(", ") || "nenhuma"}

REGRAS IMPORTANTES:
- Utilize apenas IDs confirmados nas instruções personalizadas ou no prompt.
- Se não tiver certeza do ID correto, peça confirmação antes de executar.
`;
}

export function isValidTag(tagName: string, availableTags: string[]): boolean {
  return availableTags.includes(tagName);
}

export function isValidQueue(queueName: string, allQueues: Queue[], companyId: number): boolean {
  return allQueues.some(q => q.name === queueName && q.companyId === companyId);
}

export function formatMessageWithVariables(
  message: string,
  ticket?: Ticket,
  contact?: Contact,
  user?: User,
  queue?: Queue,
  customVariables?: Record<string, any>
): string {
  let formattedMessage = message;
  
  const hour = new Date().getHours();
  let greeting = "Boa noite";
  if (hour >= 5 && hour < 12) greeting = "Bom dia";
  else if (hour >= 12 && hour < 18) greeting = "Boa tarde";
  else if (hour >= 0 && hour < 5) greeting = "Boa madrugada";
  formattedMessage = formattedMessage.replace(/\{\{ms\}\}/g, greeting);
  
  if (contact?.name) {
    formattedMessage = formattedMessage.replace(/\{\{name\}\}/g, contact.name);
    const firstName = contact.name.split(' ')[0];
    formattedMessage = formattedMessage.replace(/\{\{firstName\}\}/g, firstName);
  }
  
  if (user?.name) {
    formattedMessage = formattedMessage.replace(/\{\{userName\}\}/g, user.name);
  }
  
  const date = new Date().toLocaleDateString('pt-BR');
  formattedMessage = formattedMessage.replace(/\{\{date\}\}/g, date);
  
  if (ticket?.id) {
    formattedMessage = formattedMessage.replace(/\{\{ticket_id\}\}/g, ticket.id.toString());
  }
  
  if (queue?.name || (ticket as any)?.queue?.name) {
    const queueName = queue?.name || (ticket as any)?.queue?.name || "Sem fila";
    formattedMessage = formattedMessage.replace(/\{\{queue\}\}/g, queueName);
  }
  
  if ((ticket as any)?.whatsapp?.name) {
    formattedMessage = formattedMessage.replace(/\{\{connection\}\}/g, (ticket as any).whatsapp.name);
  }
  
  if (ticket?.id && ticket?.createdAt) {
    const protocol = `${ticket.id}${new Date(ticket.createdAt).getTime()}`;
    formattedMessage = formattedMessage.replace(/\{\{protocol\}\}/g, protocol);
  }
  
  const hora = new Date().toLocaleTimeString('pt-BR');
  formattedMessage = formattedMessage.replace(/\{\{hora\}\}/g, hora);
  
  if (customVariables) {
    Object.keys(customVariables).forEach(key => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      formattedMessage = formattedMessage.replace(regex, customVariables[key]);
    });
  }
  
  return formattedMessage;
}