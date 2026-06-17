import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import { getIO } from "../../libs/socket";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import Contact from "../../models/Contact";
import logger from "../../utils/logger";
import ShowTicketService from "./ShowTicketService";

/**
 * Migracao em massa de tickets presos em conexao WhatsApp desconectada (ou com
 * whatsappId NULL) para uma conexao CONNECTED da MESMA empresa.
 *
 * Seguranca:
 *  - Destino obrigatorio, CONNECTED e da mesma companyId.
 *  - Origem (se informada) precisa ser da mesma companyId.
 *  - So afeta tickets open/pending da empresa.
 *  - Atualiza APENAS Tickets.whatsappId (nao mexe em Messages/contactId).
 *  - queueId/userId so mudam se explicitamente informados.
 *  - dryRun retorna preview sem alterar nada.
 */

type ReassignStatus = "open" | "pending";

interface Request {
  companyId: number;
  targetWhatsappId: number;
  sourceWhatsappId?: number | null; // numero = conexao especifica; null = tickets com whatsappId NULL
  status?: ReassignStatus[];
  ticketIds?: number[];
  queueId?: number | null; // opcional: so muda se informado
  userId?: number | null; // opcional: so muda se informado
  dryRun?: boolean;
  actorUserId?: number; // usuario que disparou (para log)
}

interface PreviewResult {
  dryRun: boolean;
  companyId: number;
  source: { whatsappId: number | null; name: string | null; status: string | null };
  target: { whatsappId: number; name: string | null; status: string };
  statusFilter: ReassignStatus[];
  total: number;
  breakdown: { open: number; pending: number };
  sample: Array<{ id: number; status: string; contactName: string | null; contactNumber: string | null; updatedAt: Date }>;
  warning: string;
  updated?: number;
}

const SAMPLE_LIMIT = 15;
const LIVE_EMIT_CAP = 300; // limite de emissoes de socket por execucao

const sanitizeStatus = (status?: ReassignStatus[]): ReassignStatus[] => {
  const allowed: ReassignStatus[] = ["open", "pending"];
  const provided = Array.isArray(status)
    ? status.filter((s): s is ReassignStatus => allowed.includes(s as ReassignStatus))
    : [];
  return provided.length ? Array.from(new Set(provided)) : ["open", "pending"];
};

const ReassignTicketsWhatsappService = async ({
  companyId,
  targetWhatsappId,
  sourceWhatsappId,
  status,
  ticketIds,
  queueId,
  userId,
  dryRun = false,
  actorUserId
}: Request): Promise<PreviewResult> => {
  // ── Validacao do destino ────────────────────────────────────────────────
  if (!targetWhatsappId) {
    throw new AppError("ERR_TARGET_WHATSAPP_REQUIRED", 400);
  }

  const target = await Whatsapp.findOne({
    where: { id: targetWhatsappId, companyId },
    attributes: ["id", "name", "status", "companyId"]
  });

  if (!target) {
    // Nao existe ou e de outra empresa.
    throw new AppError("ERR_TARGET_WHATSAPP_NOT_FOUND", 404);
  }

  if (target.status !== "CONNECTED") {
    throw new AppError("ERR_TARGET_WHATSAPP_NOT_CONNECTED", 409);
  }

  // ── Validacao da origem (se informada) ───────────────────────────────────
  const hasSource = sourceWhatsappId !== undefined && sourceWhatsappId !== null;
  let source: Whatsapp | null = null;

  if (hasSource) {
    source = await Whatsapp.findOne({
      where: { id: sourceWhatsappId as number, companyId },
      attributes: ["id", "name", "status", "companyId"]
    });
    if (!source) {
      throw new AppError("ERR_SOURCE_WHATSAPP_NOT_FOUND", 404);
    }
    if (source.id === target.id) {
      throw new AppError("ERR_SOURCE_EQUALS_TARGET", 400);
    }
  }

  const statusFilter = sanitizeStatus(status);

  // ── Monta o filtro de tickets (empresa + status + origem) ─────────────────
  const finalWhere: any = {
    companyId,
    status: { [Op.in]: statusFilter }
  };

  if (Array.isArray(ticketIds) && ticketIds.length) {
    const ids = ticketIds
      .map(id => Number(id))
      .filter(id => Number.isInteger(id) && id > 0);
    if (!ids.length) {
      throw new AppError("ERR_INVALID_TICKET_IDS", 400);
    }
    finalWhere.id = { [Op.in]: ids };
  } else if (hasSource) {
    // Origem especifica (conexao desconectada).
    finalWhere.whatsappId = sourceWhatsappId;
  } else {
    // Origem NULL: tickets sem conexao vinculada.
    finalWhere.whatsappId = { [Op.is]: null };
  }

  const rows = await Ticket.findAll({
    where: finalWhere,
    attributes: ["id", "status", "whatsappId", "companyId", "contactId"],
    include: [
      {
        model: Contact,
        as: "contact",
        attributes: ["id", "name", "number"],
        required: false
      }
    ],
    order: [["updatedAt", "DESC"]]
  });

  // Quando ticketIds explicitos, garante que todos pertencem a empresa/status.
  if (Array.isArray(ticketIds) && ticketIds.length) {
    const validIds = new Set(rows.map(r => r.id));
    const rejected = ticketIds
      .map(id => Number(id))
      .filter(id => !validIds.has(id));
    if (rejected.length) {
      throw new AppError("ERR_SOME_TICKETS_INVALID", 400);
    }
  }

  // Remove eventuais tickets ja vinculados ao destino (no-op para eles).
  const migratableRows = rows.filter(r => Number(r.whatsappId) !== Number(target.id));

  const openCount = migratableRows.filter(r => r.status === "open").length;
  const pendingCount = migratableRows.filter(r => r.status === "pending").length;
  const total = migratableRows.length;

  const sample = migratableRows.slice(0, SAMPLE_LIMIT).map(r => ({
    id: r.id,
    status: r.status,
    contactName: (r as any).contact?.name ?? null,
    contactNumber: (r as any).contact?.number ?? null,
    updatedAt: r.updatedAt
  }));

  const result: PreviewResult = {
    dryRun,
    companyId,
    source: {
      whatsappId: hasSource ? (sourceWhatsappId as number) : null,
      name: source?.name ?? null,
      status: source?.status ?? null
    },
    target: { whatsappId: target.id, name: target.name, status: target.status },
    statusFilter,
    total,
    breakdown: { open: openCount, pending: pendingCount },
    sample,
    warning:
      "As proximas mensagens destes tickets sairao pela conexao de destino selecionada."
  };

  if (dryRun) {
    return result;
  }

  // ── Execucao ──────────────────────────────────────────────────────────────
  if (!total) {
    result.updated = 0;
    return result;
  }

  const updatePayload: any = { whatsappId: target.id };
  if (queueId !== undefined) updatePayload.queueId = queueId;
  if (userId !== undefined) updatePayload.userId = userId;

  const affectedIds = migratableRows.map(r => r.id);

  await Ticket.update(updatePayload, {
    where: { id: { [Op.in]: affectedIds }, companyId },
    hooks: false
  });

  logger.info(
    `[Ticket WhatsApp Bulk Reassign] companyId=${companyId} ` +
      `sourceWhatsappId=${hasSource ? sourceWhatsappId : "null"} ` +
      `targetWhatsappId=${target.id} total=${total} userId=${actorUserId ?? "?"}`
  );

  // Emite atualizacao para refletir no atendimento (limitado para nao sobrecarregar).
  try {
    const io = getIO();
    const emitIds = affectedIds.slice(0, LIVE_EMIT_CAP);
    for (const id of emitIds) {
      // eslint-disable-next-line no-await-in-loop
      const ticket = await ShowTicketService(id, companyId).catch(() => null);
      if (ticket) {
        io.of(String(companyId)).emit(`company-${companyId}-ticket`, {
          action: "update",
          ticket
        });
      }
    }
  } catch (err) {
    logger.warn(
      `[Ticket WhatsApp Bulk Reassign] socket emit falhou companyId=${companyId}: ${
        (err as any)?.message
      }`
    );
  }

  result.updated = total;
  return result;
};

export default ReassignTicketsWhatsappService;
