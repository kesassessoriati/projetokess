/**
 * @TercioSantos-0 |
 * serviço/atualizar 1 configuração da empresa |
 * @params:companyId/column(name)/data
 */
import CompaniesSettings from "../../models/CompaniesSettings";
import { assertCompanySettingColumn } from "../../constants/companySettingsColumns";

type Params = {
  companyId: number,
  column:string,
  data:string
};

const UpdateCompanySettingsService = async ({companyId, column, data}:Params): Promise<any> => {
  // Valida o nome da coluna contra a allowlist antes de qualquer query.
  // Evita SQL Injection por identificador e uso de coluna arbitrária.
  const safeColumn = assertCompanySettingColumn(column);

  // O valor é passado como parâmetro pela Model (Sequelize escapa/binda),
  // impossibilitando quebra de string ou múltiplas instruções SQL.
  const [affectedCount] = await CompaniesSettings.update(
    { [safeColumn]: data },
    { where: { companyId } }
  );

  return { affectedCount, column: safeColumn };
};

export default UpdateCompanySettingsService;
