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
}

const ImportCrmLeadsService = async ({
    companyId,
    filePath,
    ownerUserId,
    pipelineId,
    stageId,
    source,
    autoTag
}: Request): Promise<{ total: number; imported: number; errors: any[] }> => {
    try {
        const workbook = xlsx.readFile(filePath);
        const sheetNameList = workbook.SheetNames;
        const xlData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetNameList[0]]);

        if (!xlData || xlData.length === 0) {
            throw new AppError("O arquivo de importação está vazio ou inválido.");
        }

        let imported = 0;
        const errors: any[] = [];

        // Validar os cabeçalhos esperados
        const firstRow: any = xlData[0];
        const hasNameOrPhone = firstRow.hasOwnProperty("name") || firstRow.hasOwnProperty("nome") ||
            firstRow.hasOwnProperty("phone") || firstRow.hasOwnProperty("telefone") ||
            firstRow.hasOwnProperty("numero");

        if (!hasNameOrPhone) {
            throw new AppError("O arquivo deve conter as colunas 'name' (ou 'nome') e 'phone' (ou 'telefone').");
        }

        for (let index = 0; index < xlData.length; index++) {
            try {
                const leadRow: any = xlData[index];

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
                    source: source || String(leadRow.source || leadRow.origem || ""),
                    campaign: String(leadRow.campaign || leadRow.campanha || ""),
                    notes,
                    temperature: leadRow.temperature || leadRow.temperatura || null,
                    position: String(leadRow.position || leadRow.cargo || ""),
                    companyName: String(leadRow.companyName || leadRow.empresa || ""),
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
