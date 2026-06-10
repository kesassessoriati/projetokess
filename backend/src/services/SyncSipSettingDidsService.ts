import { Op } from "sequelize";
import SipDid from "../models/SipDid";
import SipSetting from "../models/SipSetting";

type RawDid = {
  number?: string;
  value?: string;
  label?: string;
  name?: string;
  default?: boolean;
  isDefault?: boolean;
};

export type NormalizedSipDid = {
  number: string;
  label: string;
  default: boolean;
};

const SCREEN_PROVIDER_REF = "sip-settings";

export const normalizeSipDid = (did: RawDid | null | undefined): NormalizedSipDid | null => {
  if (!did) {
    return null;
  }

  const number = String(did.number || did.value || "").replace(/\D/g, "");
  if (!number) {
    return null;
  }

  return {
    number,
    label: String(did.label || did.name || number).trim(),
    default: Boolean(did.default || did.isDefault)
  };
};

export const normalizeSipDids = (metadata: any = {}): NormalizedSipDid[] => {
  const dids = Array.isArray(metadata?.dids)
    ? metadata.dids.map(normalizeSipDid).filter(Boolean) as NormalizedSipDid[]
    : [];

  const fallbackDid = normalizeSipDid({
    number: metadata?.trunkDid || metadata?.did || metadata?.defaultDid,
    label: "Principal",
    default: true
  });

  if (!dids.length && fallbackDid) {
    dids.push(fallbackDid);
  }

  if (!dids.length) {
    return [];
  }

  const uniqueDids = dids.reduce<NormalizedSipDid[]>((acc, did) => {
    if (!acc.some(item => item.number === did.number)) {
      acc.push(did);
    }
    return acc;
  }, []);

  const defaultIndex = uniqueDids.findIndex(did => did.default);
  return uniqueDids.map((did, index) => ({
    ...did,
    default: defaultIndex >= 0 ? index === defaultIndex : index === 0
  }));
};

const serializeDid = (did: SipDid): NormalizedSipDid => {
  const plain = did.toJSON() as any;
  return {
    number: plain.normalizedNumber || String(plain.number || "").replace(/\D/g, ""),
    label: plain.name || plain.number,
    default: Boolean(plain.isDefault)
  };
};

export const listSipSettingDids = async (
  companyId: number,
  sipSettingId?: number | null
): Promise<NormalizedSipDid[]> => {
  const where: any = {
    companyId,
    isActive: true,
    allowedForOutbound: true
  };

  if (sipSettingId) {
    where.sipSettingId = sipSettingId;
  }

  const dids = await SipDid.findAll({
    where,
    order: [["priority", "ASC"], ["id", "ASC"]]
  });

  if (!dids.length) {
    return [];
  }

  const serialized = dids.map(serializeDid);
  const hasDefault = serialized.some(did => did.default);

  return serialized.map((did, index) => ({
    ...did,
    default: hasDefault ? did.default : index === 0
  }));
};

export const syncSipSettingDids = async (
  setting: SipSetting,
  metadata: any = {}
): Promise<NormalizedSipDid[]> => {
  const normalizedDids = normalizeSipDids(metadata);
  const companyId = Number(setting.companyId);
  const sipSettingId = Number(setting.id);
  const normalizedNumbers = normalizedDids.map(did => did.number);

  if (!normalizedDids.length) {
    await SipDid.update(
      { isActive: false, isDefault: false },
      { where: { companyId, sipSettingId, providerRef: SCREEN_PROVIDER_REF } }
    );
    return [];
  }

  if (normalizedDids.some(did => did.default)) {
    await SipDid.update({ isDefault: false }, { where: { companyId } });
  }

  await Promise.all(normalizedDids.map(async (did, index) => {
    const existing = await SipDid.findOne({
      where: {
        companyId,
        normalizedNumber: did.number
      }
    });

    const payload: any = {
      companyId,
      sipSettingId,
      name: did.label,
      number: did.number,
      normalizedNumber: did.number,
      type: "both",
      isDefault: did.default,
      isActive: true,
      priority: index,
      allowedForInbound: true,
      allowedForOutbound: true,
      providerRef: SCREEN_PROVIDER_REF,
      metadata: {
        source: SCREEN_PROVIDER_REF,
        label: did.label
      }
    };

    if (existing) {
      await existing.update(payload);
      return;
    }

    await SipDid.create(payload);
  }));

  await SipDid.update(
    { isActive: false, isDefault: false },
    {
      where: {
        companyId,
        sipSettingId,
        providerRef: SCREEN_PROVIDER_REF,
        normalizedNumber: { [Op.notIn]: normalizedNumbers }
      }
    }
  );

  return listSipSettingDids(companyId, sipSettingId);
};

export const ensureSipSettingDids = async (setting: SipSetting): Promise<NormalizedSipDid[]> => {
  const dids = await listSipSettingDids(Number(setting.companyId), Number(setting.id));
  if (dids.length) {
    return dids;
  }

  return syncSipSettingDids(setting, setting.metadata || {});
};
