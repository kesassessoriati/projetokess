import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  BelongsTo,
  DataType,
  Default,
  HasMany
} from "sequelize-typescript";
import Company from "./Company";
import Pipeline from "./Pipeline";
import PipelineStage from "./PipelineStage";

@Table({ tableName: "meta_lead_integrations", underscored: true })
class MetaLeadIntegration extends Model<MetaLeadIntegration> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column({ field: "company_id" })
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @Column({ field: "page_id", type: DataType.STRING(64) })
  pageId: string;

  @Column({ field: "page_name", type: DataType.STRING(255) })
  pageName: string;

  @Column({ field: "form_id", type: DataType.STRING(64) })
  formId: string;

  @Column({ field: "form_name", type: DataType.STRING(255) })
  formName: string;

  @Column({ field: "access_token", type: DataType.TEXT })
  accessToken: string;

  @Column({ field: "verify_token", type: DataType.STRING(128) })
  verifyToken: string;

  @ForeignKey(() => Pipeline)
  @Column({ field: "pipeline_id" })
  pipelineId: number;

  @BelongsTo(() => Pipeline)
  pipeline: Pipeline;

  @ForeignKey(() => PipelineStage)
  @Column({ field: "stage_id" })
  stageId: number;

  @BelongsTo(() => PipelineStage)
  stage: PipelineStage;

  @Column({ field: "default_whatsapp_id" })
  defaultWhatsappId: number;

  @Default("Meta Ads")
  @Column({ field: "default_tag_name", type: DataType.STRING(128) })
  defaultTagName: string;

  @Default(true)
  @Column({ field: "is_active" })
  isActive: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default MetaLeadIntegration;
