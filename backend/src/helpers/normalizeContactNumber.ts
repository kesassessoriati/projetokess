const DIGIT_REGEX = /\D/g;

const stripDigits = (value?: string | null): string => {
	if (!value) return "";
	return value.replace(DIGIT_REGEX, "");
};

// Detecta se um JID é de grupo WhatsApp (@g.us)
export const isGroupJid = (jid?: string | null): boolean => {
	if (!jid) return false;
	return jid.endsWith("@g.us");
};

// Extrai o ID numérico de um JID de grupo (ex: "120363304843711539@g.us" -> "120363304843711539")
export const extractGroupId = (jid?: string | null): string => {
	if (!jid || !isGroupJid(jid)) return "";
	return jid.split("@")[0] || "";
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
	// Números brasileiros têm no máximo 13 dígitos (55 + DDD + 9 dígitos)
	if (digits.length >= 15) {
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
	remoteJidAlt,
	forGroup
}: {
	rawNumber?: string | null;
	remoteJid?: string | null;
	remoteJidAlt?: string | null;
	forGroup?: boolean;
}): string => {
	// Para grupos, retorna o ID do grupo diretamente (não é número de telefone)
	if (forGroup || isGroupJid(remoteJid) || isGroupJid(remoteJidAlt) || isGroupJid(rawNumber)) {
		const groupJid = remoteJid || remoteJidAlt || rawNumber || "";
		const groupId = extractGroupId(groupJid);
		if (groupId) return groupId;
	}

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
	// Para grupos, preserva o remoteJid original (@g.us)
	if (isGroup && remoteJid && isGroupJid(remoteJid)) {
		return remoteJid;
	}
	if (isGroup && number) {
		return buildRemoteJidFromNumber(number, true);
	}

	if (number) {
		const normalized = normalizePhoneNumber(number);
		if (normalized) {
			return buildRemoteJidFromNumber(normalized, isGroup);
		}
	}

	return "";
};
