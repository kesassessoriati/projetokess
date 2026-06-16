const DIGIT_REGEX = /\D/g;
const COMPANION_SUFFIX_REGEX = /:\d+@/;

export const stripCompanionDeviceSuffix = (value?: string | null): string => {
	if (!value) return "";
	return value.replace(COMPANION_SUFFIX_REGEX, "@");
};

const stripDigits = (value?: string | null): string => {
	if (!value) return "";
	return stripCompanionDeviceSuffix(value).replace(DIGIT_REGEX, "");
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

	// Preferimos o JID principal e o rawNumber antes do remoteJidAlt.
	// Em alguns fluxos o remoteJidAlt pode carregar identificadores auxiliares/LID,
	// enquanto o remoteJid já contém o telefone canônico do contato.
	const rawCandidates = getCandidateNumbers([remoteJid, rawNumber, remoteJidAlt]);
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

/**
 * Gera todas as variantes de um número brasileiro com e sem o nono dígito.
 * Usado para buscar contatos no banco independente do formato armazenado.
 * Ex: 5511988887777 → [5511988887777, 551188887777, 1188887777, 11988887777]
 */
export const getBrazilianPhoneVariants = (number: string): string[] => {
	const variants = new Set<string>([number]);
	if (!number) return [];

	const hasBrPrefix = number.startsWith("55");
	const national = hasBrPrefix ? number.slice(2) : number;
	const ddd = national.slice(0, 2);
	const subscriber = national.slice(2);

	// Assinante tem 9 dígitos começando com "9" → adiciona variante sem o nono dígito (8 dígitos)
	if (subscriber.length === 9 && subscriber[0] === "9") {
		const without9 = subscriber.slice(1);
		variants.add(`55${ddd}${without9}`); // com DDI, sem nono
		variants.add(`${ddd}${without9}`);   // sem DDI, sem nono
	}

	// Assinante tem 8 dígitos → adiciona variante com o nono dígito (9 dígitos)
	if (subscriber.length === 8) {
		const with9 = `9${subscriber}`;
		variants.add(`55${ddd}${with9}`);    // com DDI, com nono
		variants.add(`${ddd}${with9}`);      // sem DDI, com nono
	}

	// Adiciona variantes com/sem prefixo 55
	if (hasBrPrefix) {
		variants.add(national); // sem DDI
	} else if (number.length >= 10) {
		variants.add(`55${number}`); // com DDI
	}

	return Array.from(variants).filter(v => v.length >= 10 && v.length <= 13);
};

/**
 * Formata um número de telefone como nome de fallback legível.
 * Prioridade: "+55 (81) 98765-4321" para números BR, "+<digits>" caso contrário.
 * O resultado é reconhecido como genérico por isGenericContactName (regex de phone),
 * portanto pode ser sobrescrito ao chegar um pushName ou nome do lead.
 */
export const formatPhoneFallback = (number?: string | null): string => {
	if (!number) return "";
	const digits = number.replace(/\D/g, "");
	if (!digits || digits.length < 7) return digits || "";

	// Número brasileiro: 55 + DDD(2) + assinante(8 ou 9) = 12 ou 13 dígitos
	if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
		const ddd = digits.slice(2, 4);
		const local = digits.slice(4);
		if (local.length === 9) {
			return `+55 (${ddd}) ${local.slice(0, 5)}-${local.slice(5)}`;
		}
		if (local.length === 8) {
			return `+55 (${ddd}) ${local.slice(0, 4)}-${local.slice(4)}`;
		}
	}

	return `+${digits}`;
};
