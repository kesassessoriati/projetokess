const DIGIT_REGEX = /\D/g;

const stripDigits = (value?: string | null): string => {
	if (!value) return "";
	return value.replace(DIGIT_REGEX, "");
};

// Detecta se é um LID (Linked ID) do WhatsApp Business API
// LIDs geralmente começam com 120 e têm 15+ dígitos
export const isLidNumber = (digits: string): boolean => {
	if (!digits) return false;
	// LIDs começam com 120 e têm 15 ou mais dígitos
	if (digits.startsWith("120") && digits.length >= 15) {
		return true;
	}
	// Também pode ser um WAID que começa com outros padrões
	// Se tem mais de 15 dígitos e não parece um número de telefone válido
	if (digits.length > 15) {
		return true;
	}
	return false;
};

export const normalizePhoneNumber = (value?: string | null): string => {
	let digits = stripDigits(value);

	if (!digits) {
		return "";
	}

	// Se é um LID/WAID, retorna vazio - não é um número de telefone válido
	if (isLidNumber(digits)) {
		console.log(`[normalizePhoneNumber] Detected LID/WAID, ignoring: ${digits}`);
		return "";
	}

	// Normaliza números nacionais (ex: 11988887777 -> 5511988887777)
	if ((digits.length === 10 || digits.length === 11) && !digits.startsWith("55")) {
		digits = `55${digits}`;
	}

	// Aceita somente números brasileiros válidos (55 + DDD + número)
	const isBrazilNumber = digits.startsWith("55") && digits.length >= 12 && digits.length <= 13;
	if (!isBrazilNumber) {
		console.log(`[normalizePhoneNumber] Invalid BR number (len/prefix): ${digits}`);
		return "";
	}

	return digits;
};

const extractDigitsFromJid = (jid?: string | null): string => {
  if (!jid) return "";
  return stripDigits(jid);
};

const getCandidateNumbers = (candidates: Array<string | null | undefined>): string[] =>
  candidates
    .map(extractDigitsFromJid)
    .filter(digits => !!digits);

export const resolveContactNumber = ({
  rawNumber,
  remoteJid,
  remoteJidAlt
}: {
  rawNumber?: string | null;
  remoteJid?: string | null;
  remoteJidAlt?: string | null;
}): string => {
  const rawCandidates = getCandidateNumbers([remoteJidAlt, remoteJid, rawNumber]);
  for (const digits of rawCandidates) {
    const normalized = normalizePhoneNumber(digits);
    if (normalized) {
      return normalized;
    }
  }

  return "";
};

export const buildRemoteJidFromNumber = (number: string, isGroup = false): string => {
	if (!number) {
		return "";
	}

	return isGroup ? `${number}@g.us` : `${number}@s.whatsapp.net`;
};

export const sanitizeRemoteJid = (
  remoteJid?: string | null,
  number?: string | null,
  isGroup = false
): string => {
  if (number) {
    const normalized = normalizePhoneNumber(number);
    if (normalized) {
      return buildRemoteJidFromNumber(normalized, isGroup);
    }
  }

  return "";
};
