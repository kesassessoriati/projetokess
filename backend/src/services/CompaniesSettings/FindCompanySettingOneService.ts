/**
 * @TercioSantos-0 |
 * serviço/todas as configurações de 1 empresa |
 * @param:companyId
 */
import CompaniesSettings from "../../models/CompaniesSettings";
import { assertCompanySettingColumn } from "../../constants/companySettingsColumns";

type Params = {
  companyId: any;
  column:string
};

const FindCompanySettingOneService = async ({companyId, column}:Params): Promise<any> => {
  // Valida o nome da coluna contra a allowlist antes de qualquer query.
  const safeColumn = assertCompanySettingColumn(column);

  const row = await CompaniesSettings.findOne({
    where: { companyId },
    attributes: [safeColumn]
  });

  // Mantém o formato legado (array de linhas) consumido pelo controller: setting[0].
  return [row ? row.get({ plain: true }) : null];
};

export default FindCompanySettingOneService;
