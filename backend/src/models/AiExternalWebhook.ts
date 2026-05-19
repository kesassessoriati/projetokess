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
import AiExternalAgentConfig from "./AiExternalAgentConfig";

@Table({ tableName: "ai_external_webhooks" })
class AiExternalWebhook extends Model<AiExternalWebhook> {
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
  @Column({ field: "config_id" })
  configId: number;

  @BelongsTo(() => AiExternalAgentConfig)
  config: AiExternalAgentConfig;

  @Column(DataType.STRING(120))
  name: string;

  @Column(DataType.TEXT)
  url: string;

  @Column({ field: "event_type", type: DataType.STRING(80) })
  eventType: string;

  @Default(true)
  @Column({ field: "is_active", type: DataType.BOOLEAN })
  isActive: boolean;

  @CreatedAt
  @Column({ field: "created_at" })
  createdAt: Date;

  @UpdatedAt
  @Column({ field: "updated_at" })
  updatedAt: Date;
}

export default AiExternalWebhook;
