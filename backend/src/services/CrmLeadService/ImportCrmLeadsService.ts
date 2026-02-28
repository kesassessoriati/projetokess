import xlsx from "xlsx";
import fs from "fs";
import CreateCrmLeadService from "./CreateCrmLeadService";
import AppError from "../../errors/AppError";

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
        const workbook = xlsx.readFile(filePath);
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
                    gmn: leadRow.gmn ? String(leadRow.gmn) : undefined,
                    website: leadRow.website ? String(leadRow.website) : undefined,
                    instagram: leadRow.instagram ? String(leadRow.instagram) : undefined,
                    linkedin: leadRow.linkedin ? String(leadRow.linkedin) : undefined,
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
