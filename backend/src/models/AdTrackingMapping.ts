import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  Default,
  ForeignKey,
  BelongsTo,
  AllowNull
} from "sequelize-typescript";
import Company from "./Company";
import AdTrackingIntegration from "./AdTrackingIntegration";
import Pipeline from "./Pipeline";
import PipelineStage from "./PipelineStage";

@Table({ tableName: "AdTrackingMappings" })
class AdTrackingMapping extends Model<AdTrackingMapping> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @Column(DataType.ENUM("meta", "google"))
  provider: "meta" | "google";

  @ForeignKey(() => AdTrackingIntegration)
  @Column
  integrationId: number;

  @BelongsTo(() => AdTrackingIntegration)
  integration: AdTrackingIntegration;

  @ForeignKey(() => Pipeline)
  @Column
  pipelineId: number;

  @BelongsTo(() => Pipeline)
  pipeline: Pipeline;

  @ForeignKey(() => PipelineStage)
  @Column
  stageId: number;

  @BelongsTo(() => PipelineStage)
  stage: PipelineStage;

  @Column(DataType.STRING(100))
  eventName: string;

  @AllowNull(true)
  @Column(DataType.STRING(100))
  customEventName: string;

  @Default(true)
  @Column
  active: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default AdTrackingMapping;
