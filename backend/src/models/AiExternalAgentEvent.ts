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
  Default
} from "sequelize-typescript";
import Company from "./Company";
import User from "./User";
import AiExternalAgentConfig from "./AiExternalAgentConfig";
import AiExternalPromptVersion from "./AiExternalPromptVersion";

@Table({ tableName: "ai_external_agent_events" })
class AiExternalAgentEvent extends Model<AiExternalAgentEvent> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column({ field: "company_id" })
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => AiExternalAgentConfig)
  @Column({ field: "config_id", allowNull: true })
  configId: number;

  @BelongsTo(() => AiExternalAgentConfig)
  config: AiExternalAgentConfig;

  @ForeignKey(() => AiExternalPromptVersion)
  @Column({ field: "prompt_version_id", allowNull: true })
  promptVersionId: number;

  @BelongsTo(() => AiExternalPromptVersion)
  promptVersion: AiExternalPromptVersion;

  @Column({ field: "event_type", type: DataType.STRING(80) })
  eventType: string;

  @Default("pending")
  @Column(DataType.STRING(30))
  status: "pending" | "sent" | "failed" | "skipped";

  @Column({ field: "target_url", type: DataType.TEXT, allowNull: true })
  targetUrl: string;

  @Default({})
  @Column(DataType.JSONB)
  payload: Record<string, any>;

  @Column({ field: "response_status", allowNull: true })
  responseStatus: number;

  @Column({ field: "response_body", type: DataType.TEXT, allowNull: true })
  responseBody: string;

  @Column({ field: "error_message", type: DataType.TEXT, allowNull: true })
  errorMessage: string;

  @Default(0)
  @Column
  attempt: number;

  @Column({ field: "sent_at", type: DataType.DATE, allowNull: true })
  sentAt: Date;

  @ForeignKey(() => User)
  @Column({ field: "created_by_user_id", allowNull: true })
  createdByUserId: number;

  @BelongsTo(() => User, "createdByUserId")
  createdByUser: User;

  @CreatedAt
  @Column({ field: "created_at" })
  createdAt: Date;

  @UpdatedAt
  @Column({ field: "updated_at" })
  updatedAt: Date;
}

export default AiExternalAgentEvent;
