import xlsx from "xlsx";
import fs from "fs";
import CreateCrmLeadService from "./CreateCrmLeadService";
import AppError from "../../errors/AppError";
import CrmLead from "../../models/CrmLead";
import Opportunity from "../../models/Opportunity";
import OpportunityEvent from "../../models/OpportunityEvent";
import PipelineStage from "../../models/PipelineStage";
import CreateOpportunityService from "../OpportunityServices/CreateOpportunityService";
import EventBus from "../../libs/EventBus";
import { getIO } from "../../libs/socket";
import CompanyLeadFieldSetting from "../../models/CompanyLeadFieldSetting";
import CrmLeadCustomFieldValue from "../../models/CrmLeadCustomFieldValue";
import { defaultLeadFields } from "../../controllers/LeadFieldSettingsController";

// Converte qualquer formato de data para Date:
// - Objeto Date, ISO (yyyy-mm-dd), Brasileiro (dd/mm/yyyy)
// - Número serial do Excel (ex: 45842.99 → data real)
const parseDate = (raw: any): Date | undefined => {
    if (!raw) return undefined;
    if (raw instanceof Date) return isNaN(raw.getTime()) ? undefined : raw;
    const str = String(raw).trim();
    if (!str) return undefined;
    // dd/mm/yyyy
    const brMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (brMatch) {
        const d = new Date(`${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`);
        return isNaN(d.getTime()) ? undefined : d;
    }
    // Serial numérico do Excel (25569 = 01/01/1970; 2958465 = 31/12/9999)
    const num = Number(str);
    if (!isNaN(num) && num > 25569 && num < 2958465) {
        const d = new Date(Math.round((num - 25569) * 86400 * 1000));
        return isNaN(d.getTime()) ? undefined : d;
    }
    // ISO ou outros formatos parseáveis
    const d = new Date(str);
    return isNaN(d.getTime()) ? undefined : d;
};

const normalizeImportedStatus = (raw: any): string | undefined => {
    if (raw === null || raw === undefined || raw === "") return undefined;

    const normalized = String(raw)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[\s-]+/g, "_");

    const statusMap: Record<string, string> = {
        new: "novo",
        novo: "novo",
        novo_lead: "novo",
        contacted: "contactado",
        contactado: "contactado",
        qualified: "qualificado",
        qualificado: "qualificado",
        scheduled: "reuniao_agendada",
        reuniao_agendada: "reuniao_agendada",
        nao_qualificado: "nao_qualificado",
        nao_qualificado_: "nao_qualificado",
        unqualified: "nao_qualificado",
        converted: "convertido",
        convertido: "convertido",
        lost: "perdido",
        perdido: "perdido",
        follow_up: "follow_up",
        follow_up_enviado: "follow_up_enviado"
    };

    return statusMap[normalized];
};

const normalizeImportedBoolean = (raw: any): string => {
    const normalized = String(raw || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

    return ["true", "1", "sim", "yes", "y", "s"].includes(normalized) ? "true" : "false";
};

interface Request {
    companyId: number;
    filePath: string;
    ownerUserId?: number;
    pipelineId?: number;
    stageId?: number;
    source?: string;
    autoTag?: string;
    mapping?: Record<string, string>;
    selectedRows?: string[];
    hasHeaderRow?: boolean;
}

const ensureImportedLeadInPipeline = async ({
    lead,
    companyId,
    pipelineId,
    stageId,
    ownerUserId,
    value
}: {
    lead: CrmLead;
    companyId: number;
    pipelineId?: number;
    stageId?: number;
    ownerUserId?: number;
    value?: number;
}): Promise<void> => {
    if (!pipelineId || !stageId) {
        return;
    }

    const stage = await PipelineStage.findOne({
        where: { id: stageId, pipelineId, companyId }
    });

    if (!stage) {
        throw new AppError("EstÃ¡gio selecionado nÃ£o encontrado no funil informado.");
    }

    const leadUpdate: Record<string, any> = {
        pipelineId,
        stageId,
        lastActivityAt: new Date()
    };

    if (ownerUserId !== undefined) {
        leadUpdate.ownerUserId = ownerUserId || null;
    }

    if (stage.linkedStatus) {
        leadUpdate.status = stage.linkedStatus;
        leadUpdate.leadStatus = stage.linkedStatus;
    }

    await lead.update(leadUpdate);

    const opportunity = await Opportunity.findOne({
        where: {
            companyId,
            leadId: lead.id,
            status: "OPEN"
        },
        order: [["updatedAt", "DESC"]]
    });

    const assignedUserId = ownerUserId !== undefined ? ownerUserId || null : opportunity?.assignedUserId || lead.ownerUserId || null;

    if (!opportunity) {
        await CreateOpportunityService({
            companyId,
            pipelineId,
            stageId,
            leadId: lead.id,
            contactId: lead.contactId || undefined,
            title: lead.name,
            value: value != null ? Number(value) : Number(lead.purchaseValue || 0),
            assignedUserId
        } as any);
    } else {
        const changes: Record<string, { before: any; after: any }> = {};
        const updateData: Record<string, any> = {};

        if (Number(opportunity.pipelineId) !== Number(pipelineId)) {
            changes.pipelineId = { before: opportunity.pipelineId, after: pipelineId };
            updateData.pipelineId = pipelineId;
        }

        if (Number(opportunity.stageId) !== Number(stageId)) {
            changes.stageId = { before: opportunity.stageId, after: stageId };
            updateData.stageId = stageId;
            updateData.lastMovedBy = "USER";
        }

        if (ownerUserId !== undefined && Number(opportunity.assignedUserId || 0) !== Number(assignedUserId || 0)) {
            changes.assignedUserId = { before: opportunity.assignedUserId || null, after: assignedUserId };
            updateData.assignedUserId = assignedUserId;
        }

        if (Object.keys(updateData).length > 0) {
            await opportunity.update(updateData);

            await OpportunityEvent.create({
                companyId,
                opportunityId: opportunity.id,
                type: "UPDATED",
                metadata: {
                    origin: "lead_import",
                    changes,
                    text: `Lead importado/vinculado ao estÃ¡gio: ${stage.name}`
                }
            });

            await EventBus.publish("OPPORTUNITY_UPDATED", {
                opportunityId: opportunity.id,
                pipelineId: opportunity.pipelineId,
                stageId: opportunity.stageId,
                changes,
                assignedUserId: opportunity.assignedUserId,
                status: opportunity.status,
                value: opportunity.value,
                updatedAt: opportunity.updatedAt,
                version: opportunity.version
            }, companyId);

            const io = getIO();
            io.to(companyId.toString()).emit(`company-${companyId}-opportunity`, {
                action: "update",
                opportunity
            });
        }
    }

    const io = getIO();
    io.to(companyId.toString()).emit(`company-${companyId}-lead`, {
        action: "update",
        lead
    });
};

const getImportableLeadFields = async (companyId: number) => {
    const saved = await CompanyLeadFieldSetting.findAll({
        where: { companyId }
    });
    const savedByKey = new Map(saved.map(field => [field.fieldKey, field]));

    const standardFieldKeys = new Set(
        defaultLeadFields
            .filter(field => {
                const override = savedByKey.get(field.fieldKey);
                return override ? override.visible !== false && override.active !== false : true;
            })
            .map(field => field.fieldKey)
    );

    const customFieldsByKey = new Map(
        saved
            .filter(field => field.isCustom && field.active !== false && field.visible !== false)
            .map(field => [field.fieldKey, field])
    );

    return { standardFieldKeys, customFieldsByKey };
};

const syncImportedCustomFieldValues = async ({
    companyId,
    leadId,
    customFields,
    customFieldsByKey
}: {
    companyId: number;
    leadId: number;
    customFields: Record<string, any>;
    customFieldsByKey: Map<string, CompanyLeadFieldSetting>;
}) => {
    await Promise.all(
        Object.entries(customFields).map(async ([fieldKey, rawValue]) => {
            const field = customFieldsByKey.get(fieldKey);
            if (!field) return;

            const value =
                rawValue === null || rawValue === undefined
                    ? ""
                    : field.fieldType === "boolean"
                        ? normalizeImportedBoolean(rawValue)
                        : String(rawValue);

            await CrmLeadCustomFieldValue.upsert({
                companyId,
                leadId,
                fieldId: field.id,
                value
            });
        })
    );
};

const ImportCrmLeadsService = async ({
    companyId,
    filePath,
    ownerUserId,
    pipelineId,
    stageId,
    source,
    autoTag,
    mapping,
    selectedRows,
    hasHeaderRow = true
}: Request): Promise<{ total: number; imported: number; errors: any[] }> => {
    try {
        // Para CSV: ler como texto com raw:true para preservar strings de data (dd/mm/yyyy)
        // sem que xlsx as converta usando formato americano (mm/dd/yyyy)
        let workbook: xlsx.WorkBook;
        if (filePath.endsWith(".csv")) {
            const csvText = fs.readFileSync(filePath, "utf-8");
            workbook = xlsx.read(csvText, { type: "string", raw: true });
        } else {
            workbook = xlsx.readFile(filePath);
        }
        const sheetNameList = workbook.SheetNames;
        const useMapping = mapping && Object.keys(mapping).length > 0;
        const { standardFieldKeys, customFieldsByKey } = await getImportableLeadFields(companyId);

        const xlData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetNameList[0]], useMapping ? { header: 1 } : {});

        if (!xlData || xlData.length === 0) {
            throw new AppError("O arquivo de importação está vazio ou inválido.");
        }

        let imported = 0;
        const errors: any[] = [];

        // Ignorando validação estrita se tiver mapping
        if (!useMapping) {
            const firstRow: any = xlData[0];
            const hasNameOrPhone = firstRow.hasOwnProperty("name") || firstRow.hasOwnProperty("nome") ||
                firstRow.hasOwnProperty("phone") || firstRow.hasOwnProperty("telefone") ||
                firstRow.hasOwnProperty("numero");

            if (!hasNameOrPhone) {
                throw new AppError("O arquivo deve conter as colunas 'name' (ou 'nome') e 'phone' (ou 'telefone').");
            }
        }

        const startIndex = useMapping && hasHeaderRow ? 1 : 0;

        for (let index = startIndex; index < xlData.length; index++) {
            try {
                // Se selectedRows foi fornecido, o frontend baseou-se no array do xls (onde a primeira linha de dados tem índice 1 no grid do frontend)
                // O frontend passa o índice do row no grid (ex: "1", "2"). 
                if (selectedRows && Array.isArray(selectedRows)) {
                    if (!selectedRows.includes(String(index))) {
                        continue;
                    }
                }

                const rowOriginal: any = xlData[index];

                // Aplicar mapeamento
                const leadRow: any = {};
                const customFieldValues: Record<string, any> = {};
                if (useMapping) {
                    for (const [colName, fieldKey] of Object.entries(mapping)) {
                        if (!fieldKey) continue;

                        const rawValue = rowOriginal[parseInt(colName, 10)];
                        if (customFieldsByKey.has(fieldKey)) {
                            customFieldValues[fieldKey] = rawValue;
                            continue;
                        }

                        if (standardFieldKeys.has(fieldKey)) {
                            leadRow[fieldKey] = rawValue;
                        }
                    }
                } else {
                    Object.assign(leadRow, rowOriginal);
                }

                // Ignorar linhas onde tudo é nulo ou string vazia
                const hasAnyData = Object.values(leadRow).some(v => v !== null && v !== "" && v !== undefined);
                if (!hasAnyData) continue;

                const name = leadRow.name || leadRow.nome || `Lead #${index + 1}`;
                const phone = leadRow.phone || leadRow.telefone || leadRow.numero || null;
                const email = leadRow.email || leadRow.Email || null;

                if (!phone && !email) {
                    errors.push({ row: index + 2, error: "Telefone ou email são obrigatórios" });
                    continue;
                }

                let notes = leadRow.notes || leadRow.observacoes || "";
                if (autoTag) {
                    notes += `\n[Tag Auto: ${autoTag}]`;
                }

                let rawCnpj = leadRow.document || leadRow.cnpj || leadRow.CNPJ || leadRow.Cnpj;
                let cleanCnpj: string | undefined = undefined;

                if (rawCnpj) {
                    cleanCnpj = String(rawCnpj).replace(/[^\d]/g, "");
                    if (cleanCnpj.length !== 14) {
                        errors.push({ row: index + 2, error: `Aviso: CNPJ '${String(rawCnpj)}' inválido (tamanho incorreto). Importado mesmo assim.` });
                    }
                }

                let rawTags = leadRow.tags || leadRow.Tags || leadRow.TAGS;
                let tagsObjArray: { name: string }[] = [];
                if (rawTags) {
                    const splitTags = String(rawTags).split(",").map(t => t.trim()).filter(t => t !== "");
                    tagsObjArray = splitTags.map(t => ({ name: t }));
                }

                const rowOwnerUserId = leadRow.ownerUserId ? Number(leadRow.ownerUserId) : ownerUserId;
                const rowPipelineId = leadRow.pipelineId ? Number(leadRow.pipelineId) : pipelineId;
                const rowStageId = leadRow.stageId ? Number(leadRow.stageId) : stageId;
                const rowPurchaseValue = leadRow.purchaseValue != null && leadRow.purchaseValue !== "" ? Number(leadRow.purchaseValue) : undefined;
                const rowScore = leadRow.score != null && leadRow.score !== "" ? Number(leadRow.score) : undefined;
                const rowStatus = normalizeImportedStatus(leadRow.status);

                const lead = await CreateCrmLeadService({
                    companyId,
                    name: String(name),
                    phone: phone ? String(phone) : undefined,
                    email: email ? String(email) : undefined,
                    ownerUserId: rowOwnerUserId,
                    pipelineId: rowPipelineId,
                    stageId: rowStageId,
                    source: String(leadRow.source || leadRow.origem || source || ""),
                    campaign: String(leadRow.campaign || leadRow.campanha || ""),
                    notes,
                    temperature: leadRow.temperature || leadRow.temperatura || null,
                    status: rowStatus,
                    leadStatus: rowStatus,
                    score: rowScore,
                    position: String(leadRow.position || leadRow.cargo || ""),
                    companyName: String(leadRow.companyName || leadRow.empresa || ""),
                    decisionMakerName: leadRow.decisionMakerName ? String(leadRow.decisionMakerName) : undefined,
                    decisionMakerPhone: leadRow.decisionMakerPhone ? String(leadRow.decisionMakerPhone) : undefined,
                    document: cleanCnpj,
                    cnpj: cleanCnpj,
                    gmn: leadRow.gmn ? String(leadRow.gmn) : undefined,
                    website: leadRow.website ? String(leadRow.website) : undefined,
                    instagram: leadRow.instagram ? String(leadRow.instagram) : undefined,
                    linkedin: leadRow.linkedin ? String(leadRow.linkedin) : undefined,
                    product: leadRow.product ? String(leadRow.product) : undefined,
                    paymentType: leadRow.paymentType ? String(leadRow.paymentType) : undefined,
                    purchaseType: leadRow.purchaseType ? String(leadRow.purchaseType) : undefined,
                    purchaseValue: rowPurchaseValue,
                    sessionid: leadRow.sessionid ? String(leadRow.sessionid) : undefined,
                    tags: tagsObjArray.length > 0 ? tagsObjArray : undefined,
                    address: leadRow.address || leadRow.endereco || undefined,
                    birthDate: parseDate(leadRow.birthDate || leadRow.dataNascimento),
                    clientSince: parseDate(leadRow.clientSince || leadRow.clienteDesde),
                    acquisitionDate: parseDate(leadRow.acquisitionDate),
                    expirationDate: parseDate(leadRow.expirationDate || leadRow.dataVencimento)
                });

                await ensureImportedLeadInPipeline({
                    lead,
                    companyId,
                    pipelineId: rowPipelineId,
                    stageId: rowStageId,
                    ownerUserId: rowOwnerUserId,
                    value: rowPurchaseValue
                });

                await syncImportedCustomFieldValues({
                    companyId,
                    leadId: lead.id,
                    customFields: customFieldValues,
                    customFieldsByKey
                });

                imported++;
            } catch (err: any) {
                errors.push({ row: index + 2, error: err.message });
            }
        }

        // Remover o arquivo após processar
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        return { total: xlData.length, imported, errors };
    } catch (err: any) {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        throw new AppError(`Erro ao processar arquivo: ${err.message}`);
    }
};

export default ImportCrmLeadsService;
