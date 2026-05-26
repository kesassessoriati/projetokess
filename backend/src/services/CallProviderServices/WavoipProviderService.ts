import AppError from "../../errors/AppError";
import { getRawCallProviderSettings } from "./CallProviderSettingsService";
import { StartCallProviderParams } from "./CallProviderTypes";

type WavoipStartResult = {
  provider: "wavoip";
  configured: boolean;
  started: boolean;
  message: string;
};

const hasWavoipRuntimeConfig = (settings: any): boolean => Boolean(
  settings?.wavoipEnabled &&
  settings?.wavoipBaseUrl &&
  settings?.wavoipDeviceId &&
  settings?.getDataValue("wavoipToken")
);

export const startWavoipCall = async (
  params: StartCallProviderParams
): Promise<WavoipStartResult> => {
  const settings = await getRawCallProviderSettings(params.companyId);

  if (!hasWavoipRuntimeConfig(settings)) {
    throw new AppError("Wavoip nao configurado para esta empresa.", 409);
  }

  // A Fase 2 prepara o provedor e protege os segredos no backend. A chamada real
  // depende do contrato final da API/widget Wavoip, que sera ligado em fase futura.
  throw new AppError("Provedor Wavoip configurado, mas a chamada real ainda nao foi habilitada nesta fase.", 501);
};
