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
import AiExternalAgentConfig from "./AiExternalAgentConfig";
import AiExternalAgentEvent from "./AiExternalAgentEvent";

@Table({ tableName: "ai_external_prompt_versions" })
class AiExternalPromptVersion extends Model<AiExternalPromptVersion> {
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

  @Column
  version: number;

  @Column(DataType.TEXT)
  content: string;

  @Column({ field: "change_note", type: DataType.TEXT, allowNull: true })
  changeNote: string;

  @ForeignKey(() => AiExternalPromptVersion)
  @Column({ field: "restored_from_version_id", allowNull: true })
  restoredFromVersionId: number;

  @BelongsTo(() => AiExternalPromptVersion, "restoredFromVersionId")
  restoredFromVersion: AiExternalPromptVersion;

  @Default(false)
  @Column({ field: "is_active", type: DataType.BOOLEAN })
  isActive: boolean;

  @ForeignKey(() => User)
  @Column({ field: "created_by_user_id", allowNull: true })
  createdByUserId: number;

  @BelongsTo(() => User, "createdByUserId")
  createdByUser: User;

  @HasMany(() => AiExternalAgentEvent)
  events: AiExternalAgentEvent[];

  @CreatedAt
  @Column({ field: "created_at" })
  createdAt: Date;

  @UpdatedAt
  @Column({ field: "updated_at" })
  updatedAt: Date;
}

export default AiExternalPromptVersion;
