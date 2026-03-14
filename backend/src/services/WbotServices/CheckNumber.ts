import AppError from "../../errors/AppError";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { normalizePhoneNumber } from "../../helpers/normalizeContactNumber";
import { getWbot } from "../../libs/wbot";

const buildWhatsAppNumberCandidates = (rawNumber: string): string[] => {
  const digits = String(rawNumber || "").replace(/\D/g, "").replace(/^0+/, "");
  const normalized = normalizePhoneNumber(digits) || digits;
  const candidates = new Set<string>();

  const appendCandidate = (value?: string | null) => {
    const candidate = String(value || "").replace(/\D/g, "");
    if (candidate.length >= 10 && candidate.length <= 13) {
      candidates.add(candidate);
    }
  };

  appendCandidate(normalized);
  appendCandidate(digits);

  const national = normalized.startsWith("55") ? normalized.slice(2) : normalized;

  // Brasil: tenta automaticamente com e sem o nono dígito.
  if (national.length === 11 && national[2] === "9") {
    appendCandidate(`55${national.slice(0, 2)}${national.slice(3)}`);
    appendCandidate(`${national.slice(0, 2)}${national.slice(3)}`);
  }

  if (national.length === 10) {
    appendCandidate(`55${national.slice(0, 2)}9${national.slice(2)}`);
    appendCandidate(`${national.slice(0, 2)}9${national.slice(2)}`);
  }

  return Array.from(candidates);
};

const CheckContactNumber = async (
  number: string, companyId: number, isGroup: boolean = false, whatsappId?: number
): Promise<string> => {
  let wbot;
  if (whatsappId) {
    wbot = getWbot(whatsappId);
  } else {
    const wahtsappList = await GetDefaultWhatsApp(null, companyId);
    wbot = getWbot(wahtsappList.id);
  }

  let numberArray;

  if (isGroup) {
    const grupoMeta = await wbot.groupMetadata(number);
    numberArray = [
      {
        jid: grupoMeta.id,
        exists: true
      }
    ]; 
  } else {
    const candidates = buildWhatsAppNumberCandidates(number);

    if (candidates.length === 0) {
      throw new AppError("Este número não está cadastrado no whatsapp");
    }

    for (const candidate of candidates) {
      numberArray = await wbot.onWhatsApp(`${candidate}@s.whatsapp.net`);
      if (numberArray?.[0]?.exists) {
        return numberArray[0].jid.split("@")[0];
      }
    }
  }

  const isNumberExit = numberArray;

  if (!isNumberExit[0]?.exists) {
    throw new AppError("Este número não está cadastrado no whatsapp");
  }

  return isGroup ? number.split("@")[0] : isNumberExit[0].jid.split("@")[0];
};

export default CheckContactNumber;
