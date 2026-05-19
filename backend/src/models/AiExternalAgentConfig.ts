import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
  Default
} from "sequelize-typescript";
import Company from "./Company";
import User from "./User";
import AiExternalPromptVersion from "./AiExternalPromptVersion";
import AiExternalAgentEvent from "./AiExternalAgentEvent";
import AiExternalWebhook from "./AiExternalWebhook";

@Table({ tableName: "ai_external_agent_configs" })
class AiExternalAgentConfig extends Model<AiExternalAgentConfig> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column({ field: "company_id" })
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @Default("Agente Externo N8N")
  @Column(DataType.STRING(120))
  name: string;

  @Default("")
  @Column({ field: "system_prompt", type: DataType.TEXT })
  systemPrompt: string;

  @Column({ field: "active_prompt_version_id", allowNull: true })
  activePromptVersionId: number;

  @Column({ field: "n8n_webhook_url", type: DataType.TEXT, allowNull: true })
  n8nWebhookUrl: string;

  @Default(true)
  @Column({ field: "webhook_enabled", type: DataType.BOOLEAN })
  webhookEnabled: boolean;

  @Default({})
  @Column(DataType.JSONB)
  metadata: Record<string, any>;

  @ForeignKey(() => User)
  @Column({ field: "created_by_user_id", allowNull: true })
  createdByUserId: number;

  @BelongsTo(() => User, "createdByUserId")
  createdByUser: User;

  @ForeignKey(() => User)
  @Column({ field: "updated_by_user_id", allowNull: true })
  updatedByUserId: number;

  @BelongsTo(() => User, "updatedByUserId")
  updatedByUser: User;

  @HasMany(() => AiExternalPromptVersion)
  promptVersions: AiExternalPromptVersion[];

  @HasMany(() => AiExternalAgentEvent)
  events: AiExternalAgentEvent[];

  @HasMany(() => AiExternalWebhook)
  webhooks: AiExternalWebhook[];

  @CreatedAt
  @Column({ field: "created_at" })
  createdAt: Date;

  @UpdatedAt
  @Column({ field: "updated_at" })
  updatedAt: Date;
}

export default AiExternalAgentConfig;
