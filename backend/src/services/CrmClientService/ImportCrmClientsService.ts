import xlsx from "xlsx";
import fs from "fs";
import CreateCrmClientService from "./CreateCrmClientService";
import AppError from "../../errors/AppError";

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

interface Request {
    companyId: number;
    filePath: string;
    ownerUserId?: number;
    source?: string;
    autoTag?: string;
    mapping?: Record<string, string>;
    selectedRows?: string[];
}

const ImportCrmClientsService = async ({
    companyId,
    filePath,
    ownerUserId,
    source,
    autoTag,
    mapping,
    selectedRows
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

        const xlData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetNameList[0]], useMapping ? { header: 1 } : {});

        if (!xlData || xlData.length === 0) {
            throw new AppError("O arquivo de importação está vazio ou inválido.");
        }

        let imported = 0;
        const errors: any[] = [];

        if (!useMapping) {
            const firstRow: any = xlData[0];
            const hasNameOrPhone = firstRow.hasOwnProperty("name") || firstRow.hasOwnProperty("nome") ||
                firstRow.hasOwnProperty("phone") || firstRow.hasOwnProperty("telefone") ||
                firstRow.hasOwnProperty("numero");

            if (!hasNameOrPhone) {
                throw new AppError("O arquivo deve conter as colunas 'name' (ou 'nome') e 'phone' (ou 'telefone').");
            }
        }

        const startIndex = useMapping ? 1 : 0;

        for (let index = startIndex; index < xlData.length; index++) {
            try {
                if (selectedRows && Array.isArray(selectedRows)) {
                    if (!selectedRows.includes(String(index))) {
                        continue;
                    }
                }

                const rowOriginal: any = xlData[index];

                const clientRow: any = {};
                if (useMapping) {
                    for (const [colName, fieldKey] of Object.entries(mapping)) {
                        clientRow[fieldKey] = rowOriginal[parseInt(colName, 10)];
                    }
                } else {
                    Object.assign(clientRow, rowOriginal);
                }

                const hasAnyData = Object.values(clientRow).some(v => v !== null && v !== "" && v !== undefined);
                if (!hasAnyData) continue;

                const name = clientRow.name || clientRow.nome || `Cliente #${index + 1}`;
                const phone = clientRow.phone || clientRow.telefone || clientRow.numero || null;
                const email = clientRow.email || clientRow.Email || null;

                if (!phone && !email) {
                    const { default: logger } = await import("../../utils/logger");
                    logger.warn(`[ImportCrmClients] Linha ${index + 2}: cliente "${name}" importado sem telefone e sem e-mail.`);
                }

                let notes = clientRow.notes || clientRow.observacoes || "";
                if (autoTag) {
                    notes += `\n[Tag Auto: ${autoTag}]`;
                }

                let rawDocument = clientRow.document || clientRow.documento || clientRow.cnpj || clientRow.CNPJ;
                let cleanDocument: string | undefined = undefined;

                if (rawDocument) {
                    cleanDocument = String(rawDocument).replace(/[^\d]/g, "");
                }

                let rawTags = clientRow.tags || clientRow.Tags || clientRow.TAGS;
                let tagsStr = undefined;
                if (rawTags) {
                    tagsStr = String(rawTags).split(",").map(t => t.trim()).filter(t => t !== "").join(",");
                }

                await CreateCrmClientService({
                    companyId,
                    name: String(name),
                    phone: phone ? String(phone) : undefined,
                    email: email ? String(email) : undefined,
                    ownerUserId,
                    origem: String(clientRow.source || clientRow.origem || source || ""),
                    campanhaTag: String(clientRow.campaign || clientRow.campanha || ""),
                    notes,
                    temperatura: clientRow.temperature || clientRow.temperatura || null,
                    cargo: String(clientRow.position || clientRow.cargo || ""),
                    companyName: String(clientRow.companyName || clientRow.empresa || ""),
                    decisorName: clientRow.decisionMakerName || clientRow.decisorName ? String(clientRow.decisionMakerName || clientRow.decisorName) : undefined,
                    decisorPhone: clientRow.decisionMakerPhone || clientRow.decisorPhone ? String(clientRow.decisionMakerPhone || clientRow.decisorPhone) : undefined,
                    document: cleanDocument,
                    site: clientRow.website || clientRow.site ? String(clientRow.website || clientRow.site) : undefined,
                    instagram: clientRow.instagram ? String(clientRow.instagram) : undefined,
                    linkedin: clientRow.linkedin ? String(clientRow.linkedin) : undefined,
                    acquiredProduct: clientRow.acquiredProduct ? String(clientRow.acquiredProduct) : undefined,
                    paymentType: clientRow.paymentType ? String(clientRow.paymentType) : undefined,
                    purchaseType: clientRow.purchaseType ? String(clientRow.purchaseType) : undefined,
                    purchaseValue: clientRow.purchaseValue != null && clientRow.purchaseValue !== "" ? Number(clientRow.purchaseValue) : undefined,
                    tags: tagsStr,
                    birthDate: parseDate(clientRow.birthDate || clientRow.dataNascimento),
                    clientSince: parseDate(clientRow.clientSince || clientRow.clienteDesde) ?? new Date(),
                    acquisitionDate: parseDate(clientRow.acquisitionDate),
                    expirationDate: parseDate(clientRow.expirationDate || clientRow.dataVencimento),
                    status: (() => {
                        const raw = String(clientRow.status || "").toLowerCase().trim();
                        if (raw === "inactive" || raw === "inativo") return "inactive";
                        if (raw === "blocked" || raw === "bloqueado") return "blocked";
                        return "active";
                    })(),
                    type: cleanDocument && cleanDocument.length > 11 ? "pj" : "pf"
                });

                imported++;
            } catch (err: any) {
                errors.push({ row: index + 2, error: err.message });
            }
        }

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

export default ImportCrmClientsService;
