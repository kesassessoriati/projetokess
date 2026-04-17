import xlsx from "xlsx";
import fs from "fs";
import CreateCrmLeadService from "./CreateCrmLeadService";
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
    pipelineId?: number;
    stageId?: number;
    source?: string;
    autoTag?: string;
    mapping?: Record<string, string>;
    selectedRows?: string[];
}

const ImportCrmLeadsService = async ({
    companyId,
    filePath,
    ownerUserId,
    pipelineId,
    stageId,
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

        const startIndex = useMapping ? 1 : 0;

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
                if (useMapping) {
                    for (const [colName, fieldKey] of Object.entries(mapping)) {
                        leadRow[fieldKey] = rowOriginal[parseInt(colName, 10)];
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

                let rawCnpj = leadRow.cnpj || leadRow.CNPJ || leadRow.Cnpj;
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

                await CreateCrmLeadService({
                    companyId,
                    name: String(name),
                    phone: phone ? String(phone) : undefined,
                    email: email ? String(email) : undefined,
                    ownerUserId,
                    pipelineId,
                    stageId,
                    source: String(leadRow.source || leadRow.origem || source || ""),
                    campaign: String(leadRow.campaign || leadRow.campanha || ""),
                    notes,
                    temperature: leadRow.temperature || leadRow.temperatura || null,
                    position: String(leadRow.position || leadRow.cargo || ""),
                    companyName: String(leadRow.companyName || leadRow.empresa || ""),
                    decisionMakerName: leadRow.decisionMakerName ? String(leadRow.decisionMakerName) : undefined,
                    decisionMakerPhone: leadRow.decisionMakerPhone ? String(leadRow.decisionMakerPhone) : undefined,
                    cnpj: cleanCnpj,
                    gmn: leadRow.gmn ? String(leadRow.gmn) : undefined,
                    website: leadRow.website ? String(leadRow.website) : undefined,
                    instagram: leadRow.instagram ? String(leadRow.instagram) : undefined,
                    linkedin: leadRow.linkedin ? String(leadRow.linkedin) : undefined,
                    product: leadRow.product ? String(leadRow.product) : undefined,
                    paymentType: leadRow.paymentType ? String(leadRow.paymentType) : undefined,
                    purchaseType: leadRow.purchaseType ? String(leadRow.purchaseType) : undefined,
                    purchaseValue: leadRow.purchaseValue != null && leadRow.purchaseValue !== "" ? Number(leadRow.purchaseValue) : undefined,
                    tags: tagsObjArray.length > 0 ? tagsObjArray : undefined,
                    address: leadRow.address || leadRow.endereco || undefined,
                    birthDate: parseDate(leadRow.birthDate || leadRow.dataNascimento),
                    clientSince: parseDate(leadRow.clientSince || leadRow.clienteDesde),
                    acquisitionDate: parseDate(leadRow.acquisitionDate),
                    expirationDate: parseDate(leadRow.expirationDate || leadRow.dataVencimento)
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
