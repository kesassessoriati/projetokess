import SipDid from "../models/SipDid";
import SipExtension from "../models/SipExtension";
import SipDidRoute from "../models/SipDidRoute";
import SipChannelBinding from "../models/SipChannelBinding";

interface ValidationIssue {
  field: string;
  message: string;
  severity: "warning" | "error";
}

const ValidateSipRoutingService = async (companyId: number): Promise<ValidationIssue[]> => {
  const issues: ValidationIssue[] = [];

  const dids = await SipDid.findAll({ where: { companyId }, raw: true });
  const extensions = await SipExtension.findAll({ where: { companyId }, raw: true });
  const routes = await SipDidRoute.findAll({ where: { companyId }, raw: true });
  const bindings = await SipChannelBinding.findAll({ where: { companyId }, raw: true });

  // Verifica DID inativos em rotas
  for (const route of routes) {
    if (route.didId) {
      const did = dids.find((d) => d.id === route.didId);
      if (did && !did.isActive) {
        issues.push({
          field: "route",
          message: `Rota #${route.id} referencia DID #${route.didId} que está inativo.`,
          severity: "error"
        });
      }
    }
  }

  // Verifica ramal inativo vinculado
  for (const binding of bindings) {
    if (binding.extensionId) {
      const ext = extensions.find((e) => e.id === binding.extensionId);
      if (ext && !ext.isActive) {
        issues.push({
          field: "binding",
          message: `Vínculo #${binding.id} referencia ramal #${binding.extensionId} que está inativo.`,
          severity: "warning"
        });
      }
    }
  }

  // Verifica rota sem destino
  for (const route of routes) {
    if (!route.userId && !route.queueId && !route.extensionId && !route.channelId) {
      issues.push({
        field: "route",
        message: `Rota #${route.id} não possui destino definido.`,
        severity: "error"
      });
    }
  }

  // Verifica DID duplicado
  const numberGroups: Record<string, number[]> = {};
  for (const did of dids) {
    const key = did.normalizedNumber || did.number;
    if (!numberGroups[key]) numberGroups[key] = [];
    numberGroups[key].push(did.id);
  }
  for (const [number, ids] of Object.entries(numberGroups)) {
    if (ids.length > 1) {
      issues.push({
        field: "did",
        message: `Número ${number} duplicado nos DIDs: ${ids.join(", ")}.`,
        severity: "warning"
      });
    }
  }

  // Verifica ramal duplicado
  const extGroups: Record<string, number[]> = {};
  for (const ext of extensions) {
    if (!extGroups[ext.extension]) extGroups[ext.extension] = [];
    extGroups[ext.extension].push(ext.id);
  }
  for (const [ext, ids] of Object.entries(extGroups)) {
    if (ids.length > 1) {
      issues.push({
        field: "extension",
        message: `Ramal ${ext} duplicado nos IDs: ${ids.join(", ")}.`,
        severity: "warning"
      });
    }
  }

  return issues;
};

export default ValidateSipRoutingService;