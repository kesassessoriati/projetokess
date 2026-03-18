interface PlanLike {
  useWhatsapp?: boolean | null;
  useFacebook?: boolean | null;
  useInstagram?: boolean | null;
  notifica_mehub?: boolean | null;
  whatsapp_whatsmeow?: boolean | null;
  whatsapp_whaleys?: boolean | null;
  email?: boolean | null;
}

interface ChannelTarget {
  channel?: string | null;
  notificameHub?: boolean | null;
}

export const getPlanChannelLabel = ({ channel, notificameHub }: ChannelTarget): string => {
  if (notificameHub) {
    return "Notifica MeHub";
  }

  switch (channel) {
    case "facebook":
      return "Facebook";
    case "instagram":
      return "Instagram";
    case "whatsapp_whaileys":
      return "WhatsApp Whaleys";
    case "whatsapp_whatsmeow":
      return "WhatsApp WhatsMeow";
    case "email":
      return "E-mail";
    case "whatsapp":
    default:
      return "WhatsApp";
  }
};

export const isPlanChannelEnabled = (
  plan: PlanLike | null | undefined,
  { channel, notificameHub }: ChannelTarget
): boolean => {
  if (!plan) {
    return true;
  }

  if (notificameHub) {
    return Boolean(plan.notifica_mehub);
  }

  switch (channel) {
    case "facebook":
      return plan.useFacebook !== false;
    case "instagram":
      return plan.useInstagram !== false;
    case "whatsapp_whaileys":
      return Boolean(plan.whatsapp_whaleys);
    case "whatsapp_whatsmeow":
      return Boolean(plan.whatsapp_whatsmeow);
    case "email":
      return Boolean(plan.email);
    case "whatsapp":
      return plan.useWhatsapp !== false;
    default:
      return true;
  }
};
