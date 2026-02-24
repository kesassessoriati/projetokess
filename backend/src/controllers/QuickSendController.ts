// @ts-nocheck
import { Request, Response } from "express";
import * as Yup from "yup";
import AppError from "../errors/AppError";
import { getIO } from "../libs/socket";

import Whatsapp from "../models/Whatsapp";
import Contact from "../models/Contact";
import Ticket from "../models/Ticket";
import CompaniesSettings from "../models/CompaniesSettings";

import CreateOrUpdateContactService from "../services/ContactServices/CreateOrUpdateContactService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import UpdateTicketService from "../services/TicketServices/UpdateTicketService";
import SendWhatsAppMessage from "../services/WbotServices/SendWhatsAppMessage";
import CheckContactNumber from "../services/WbotServices/CheckNumber";
import ListSettingsService from "../services/SettingServices/ListSettingsService";
import CreateLogTicketService from "../services/TicketServices/CreateLogTicketService";
import { Op } from "sequelize";

// ─── Tipagens ──────────────────────────────────────────────────────────────────
interface QuickSendBody {
    number: string;          // Ex: "5511999998888"
    message: string;         // Texto da mensagem
    whatsappId: number;      // Conexão WhatsApp a usar
    name?: string;           // Nome do contato (caso precise criar)
    queueId?: number;        // Fila opcional
    createIfNotExists?: boolean; // Criar contato/ticket se não existir
}

// ─── Função auxiliar: normaliza número ────────────────────────────────────────
const normalizeNumber = (raw: string): string => {
    return raw.replace(/\D/g, "");
};

// ─── POST /quick-send ─────────────────────────────────────────────────────────
export const quickSend = async (req: Request, res: Response): Promise<Response> => {
    const { companyId, id: userId } = req.user;
    const {
        number,
        message,
        whatsappId,
        name,
        queueId,
        createIfNotExists = true
    }: QuickSendBody = req.body;

    // ─── Validação de entrada ──────────────────────────────────────────────────
    const schema = Yup.object().shape({
        number: Yup.string()
            .matches(/^\d{10,15}$/, "Número inválido. Use apenas dígitos (DDD+número, sem código do país ou com 55)")
            .required("Número é obrigatório"),
        message: Yup.string()
            .min(1, "Mensagem não pode ser vazia")
            .required("Mensagem é obrigatória"),
        whatsappId: Yup.number().required("Selecione uma conexão WhatsApp")
    });

    try {
        await schema.validate({ number: normalizeNumber(number), message, whatsappId });
    } catch (err) {
        throw new AppError(err.message);
    }

    const normalized = normalizeNumber(number);

    // ─── 1. Verificar conexão WhatsApp (pertence à empresa) ───────────────────
    const whatsapp = await Whatsapp.findOne({
        where: { id: whatsappId, companyId, status: "CONNECTED" }
    });

    if (!whatsapp) {
        throw new AppError("Conexão WhatsApp não encontrada ou não está conectada.", 404);
    }

    // ─── 2. Verificar se número existe no WhatsApp (validação real) ───────────
    let remoteJid = `${normalized}@s.whatsapp.net`;

    try {
        const validatedNumber = await CheckContactNumber(normalized, companyId);
        // CheckContactNumber retorna o número normalizado como string
        if (validatedNumber) {
            remoteJid = `${validatedNumber}@s.whatsapp.net`;
        }
    } catch (err) {
        // Número não encontrado no WhatsApp — silencioso, continua o fluxo
        console.warn(`[QuickSend] Validação opcional de número falhou para ${normalized}:`, err.message);
    }

    // ─── 3. Buscar ou criar contato ───────────────────────────────────────────
    let contact = await Contact.findOne({
        where: { number: normalized, companyId }
    });

    if (!contact) {
        if (!createIfNotExists) {
            throw new AppError("Contato não encontrado. Habilite a criação automática ou cadastre o contato primeiro.", 404);
        }

        // Cria o contato automaticamente
        const settings = await CompaniesSettings.findOne({ where: { companyId } });
        const acceptAudio = settings?.acceptAudioMessageContact === "enabled";

        contact = await CreateOrUpdateContactService({
            name: name || normalized,      // fallback: usa o próprio número
            number: normalized,
            remoteJid,
            companyId,
            isGroup: false,
            channel: "whatsapp",
            profilePicUrl: "",
            acceptAudioMessage: acceptAudio,
            active: true
        });
    }

    // ─── 4. Buscar ticket aberto ou criar novo ────────────────────────────────
    const settings = await ListSettingsService({ companyId });
    const settingsMap: Record<string, string> = {};
    settings.forEach((s: any) => { settingsMap[s.key] = s.value; });

    let ticket = await Ticket.findOne({
        where: {
            contactId: contact.id,
            companyId,
            status: { [Op.in]: ["open", "pending"] }
        },
        order: [["updatedAt", "DESC"]]
    });

    const io = getIO();

    if (!ticket) {
        // Criar novo ticket como "open" (atendimento ativo)
        ticket = await Ticket.create({
            contactId: contact.id,
            whatsappId: whatsapp.id,
            companyId,
            userId,
            queueId: queueId || null,
            status: "open",
            isGroup: false,
            unreadMessages: 0,
            isActiveDemand: true,   // Flag: abertura ativa pelo agente
            channel: "whatsapp",
            isBot: false
        });

        await CreateLogTicketService({ ticketId: ticket.id, type: "create" });

        ticket = await ShowTicketService(ticket.id, companyId);

        io.of(String(companyId))
            .emit(`company-${companyId}-ticket`, {
                action: "update",
                ticket
            });
    } else {
        // Reaproveita ticket existente — garante que está aberto e atribuído
        await UpdateTicketService({
            ticketId: ticket.id,
            companyId,
            ticketData: {
                status: "open",
                userId,
                queueId: queueId || ticket.queueId
            }
        });

        ticket = await ShowTicketService(ticket.id, companyId);
    }

    // ─── 5. Enviar mensagem ───────────────────────────────────────────────────
    try {
        await SendWhatsAppMessage({
            body: message,
            ticket,
            quotedMsg: null
        });
    } catch (sendErr) {
        // Ticket foi criado mas o envio falhou — retorna ticket + erro de envio
        return res.status(206).json({
            warning: "Ticket criado, mas houve erro ao enviar a mensagem. Abra o ticket para tentar novamente.",
            ticket,
            sendError: sendErr.message
        });
    }

    return res.status(200).json({
        message: "Mensagem enviada com sucesso!",
        ticket,
        contact
    });
};

// ─── GET /quick-send/connections ─────────────────────────────────────────────
// Lista conexões WhatsApp disponíveis (para o dropdown no modal)
export const listConnections = async (req: Request, res: Response): Promise<Response> => {
    const { companyId } = req.user;

    const connections = await Whatsapp.findAll({
        where: { companyId },
        attributes: ["id", "name", "number", "status", "battery", "plugged", "channel"],
        order: [["name", "ASC"]]
    });

    return res.status(200).json(connections);
};
