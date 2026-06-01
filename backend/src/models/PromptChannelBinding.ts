import { Op } from "sequelize";
import {
  AllowNull,
  AutoIncrement,
  BeforeSave,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  Default,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt
} from "sequelize-typescript";
import Company from "./Company";
import Prompt from "./Prompt";
import Whatsapp from "./Whatsapp";

export type PromptChannelType =
  | "whatsapp"
  | "whatsapp_official"
  | "facebook"
  | "instagram"
  | "telegram"
  | "webchat"
  | "http";

export const PROMPT_CHANNEL_BINDING_CHANNEL_TYPES = [
  "whatsapp",
  "whatsapp_official",
  "facebook",
  "instagram",
  "telegram",
  "webchat",
  "http"
];

export const PROMPT_CHANNEL_BINDING_DEFAULT_EVENTS = ["message_received"];

export const normalizePromptChannelBindingEvents = (
  events?: string[] | null
): string[] => {
  if (!Array.isArray(events) || events.length === 0) {
    return PROMPT_CHANNEL_BINDING_DEFAULT_EVENTS;
  }

  return Array.from(
    new Set(
      events
        .map(event => String(event || "").trim())
        .filter(event => event.length > 0)
    )
  );
};

@Table({ tableName: "PromptChannelBindings" })
class PromptChannelBinding extends Model<PromptChannelBinding> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @AllowNull(false)
  @ForeignKey(() => Prompt)
  @Column
  promptId: number;

  @BelongsTo(() => Prompt)
  prompt: Prompt;

  @AllowNull(false)
  @Column(DataType.STRING(50))
  channelType: PromptChannelType;

  @AllowNull(true)
  @Column
  channelId: number;

  @AllowNull(true)
  @ForeignKey(() => Whatsapp)
  @Column
  whatsappId: number;

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;

  @AllowNull(false)
  @Default(true)
  @Column
  isActive: boolean;

  @AllowNull(false)
  @Default(PROMPT_CHANNEL_BINDING_DEFAULT_EVENTS)
  @Column(DataType.JSONB)
  events: string[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @BeforeSave
  static async validateActiveConflict(
    binding: PromptChannelBinding
  ): Promise<void> {
    if (!binding.isActive) {
      return;
    }

    if (!PROMPT_CHANNEL_BINDING_CHANNEL_TYPES.includes(binding.channelType)) {
      throw new Error(
        `ERR_PROMPT_CHANNEL_BINDING_INVALID_CHANNEL_TYPE:${binding.channelType}`
      );
    }

    const events = normalizePromptChannelBindingEvents(binding.events);
    const where: any = {
      companyId: binding.companyId,
      channelType: binding.channelType,
      isActive: true
    };

    if (binding.id) {
      where.id = { [Op.ne]: binding.id };
    }

    const hasWhatsappId =
      binding.whatsappId !== null && typeof binding.whatsappId !== "undefined";
    const hasChannelId =
      binding.channelId !== null && typeof binding.channelId !== "undefined";

    if (hasWhatsappId) {
      where.whatsappId = binding.whatsappId;
    } else {
      where.whatsappId = { [Op.is]: null };
      where.channelId = hasChannelId
        ? binding.channelId
        : { [Op.is]: null };
    }

    const candidates = await PromptChannelBinding.findAll({
      where,
      attributes: ["id", "events"]
    });

    const conflict = candidates.find(candidate =>
      normalizePromptChannelBindingEvents(candidate.events).some(event =>
        events.includes(event)
      )
    );

    if (conflict) {
      throw new Error(
        `ERR_PROMPT_CHANNEL_BINDING_DUPLICATE_ACTIVE_AGENT:${conflict.id}`
      );
    }
  }
}

export default PromptChannelBinding;
