import xlsx from "xlsx";
import fs from "fs";
import ContactListItem from "../../models/ContactListItem";
import AppError from "../../errors/AppError";
import logger from "../../utils/logger";
import CheckContactNumber from "../WbotServices/CheckNumber";

interface Request {
  companyId: number;
  contactListId: number;
  filePath: string;
  mapping?: Record<string, string>; // { colIndex: fieldId } ex: { "0": "name", "1": "number" }
  selectedRows?: string[];          // índices das linhas selecionadas (ex: ["1","2","3"])
}

const ImportContactListItemsService = async ({
  companyId,
  contactListId,
  filePath,
  mapping,
  selectedRows,
}: Request): Promise<{ total: number; imported: number; errors: any[] }> => {
  try {
    let workbook: xlsx.WorkBook;
    if (filePath.endsWith(".csv") || filePath.endsWith(".txt")) {
      const text = fs.readFileSync(filePath, "utf-8");
      workbook = xlsx.read(text, { type: "string", raw: true });
    } else {
      workbook = xlsx.readFile(filePath);
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new AppError("O arquivo não contém planilhas.");
    }

    const useMapping = mapping && Object.keys(mapping).length > 0;
    const xlData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], useMapping ? { header: 1 } : {}) as any[];

    if (!xlData || xlData.length === 0) {
      throw new AppError("O arquivo está vazio ou inválido.");
    }

    let imported = 0;
    const errors: any[] = [];
    const startIndex = useMapping ? 1 : 0;

    for (let index = startIndex; index < xlData.length; index++) {
      try {
        if (selectedRows && Array.isArray(selectedRows)) {
          if (!selectedRows.includes(String(index))) continue;
        }

        const rawRow: any = xlData[index];
        const row: any = {};

        if (useMapping) {
          for (const [colIndex, fieldId] of Object.entries(mapping)) {
            row[fieldId] = rawRow[parseInt(colIndex, 10)];
          }
        } else {
          Object.assign(row, rawRow);
        }

        const name: string = String(row.name || row.nome || "").trim();
        const number: string = String(row.number || row.numero || row.telefone || row.celular || "").trim();
        const email: string = String(row.email || row.Email || "").trim();

        if (!name) {
          errors.push({ row: index + 1, error: "Nome obrigatório" });
          continue;
        }
        if (!number && !email) {
          errors.push({ row: index + 1, error: "Número ou e-mail obrigatório" });
          continue;
        }

        const whereClause: any = { companyId, contactListId };
        if (number) {
          whereClause.number = number;
        } else if (email) {
          whereClause.email = email;
        } else {
          whereClause.name = name;
        }

        const [record] = await ContactListItem.findOrCreate({
          where: whereClause,
          defaults: { name, number, email, companyId, contactListId },
        });

        if (number) {
          try {
            const response = await CheckContactNumber(number, companyId);
            record.isWhatsappValid = !!response;
            if (response) record.number = response;
            await record.save();
          } catch {
            record.isWhatsappValid = false;
            await record.save();
          }
        }

        imported++;
      } catch (err: any) {
        logger.warn(`ImportContactListItems row ${index + 1}: ${err.message}`);
        errors.push({ row: index + 1, error: err.message });
      }
    }

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    return { total: xlData.length - startIndex, imported, errors };
  } catch (err: any) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    throw new AppError(`Erro ao processar arquivo: ${err.message}`);
  }
};

export default ImportContactListItemsService;
