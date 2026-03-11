import { BaileysProvider } from "./BaileysProvider";
import { WhaileysProvider } from "./WhaileysProvider";
import { WhatsMeowProvider } from "./WhatsMeowProvider";
import { BaseProvider } from "./BaseProvider";

export class ProviderFactory {
  static createProvider(whatsapp: any, wbot: any, tenantId?: number | string): BaseProvider {
    const providerType = whatsapp?.provider || "baileys";

    switch (providerType) {
      case "baileys":
        return new BaileysProvider(wbot, tenantId);
      case "whaileys":
        return new WhaileysProvider(wbot, tenantId);
      case "whatsmeow":
        return new WhatsMeowProvider(whatsapp, tenantId);
      default:
        // By default use Baileys
        return new BaileysProvider(wbot, tenantId);
    }
  }
}
