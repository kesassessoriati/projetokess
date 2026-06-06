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
  AllowNull
} from "sequelize-typescript";

@Table({ tableName: "AdTrackingEvents" })
class AdTrackingEvent extends Model<AdTrackingEvent> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  companyId: number;

  @Column(DataType.ENUM("meta", "google"))
  provider: "meta" | "google";

  @AllowNull(true)
  @Column
  integrationId: number;

  @AllowNull(true)
  @Column
  mappingId: number;

  @AllowNull(true)
  @Column
  leadId: number;

  @AllowNull(true)
  @Column
  opportunityId: number;

  @AllowNull(true)
  @Column
  contactId: number;

  @AllowNull(true)
  @Column
  ticketId: number;

  @AllowNull(true)
  @Column
  pipelineId: number;

  @AllowNull(true)
  @Column
  stageId: number;

  @Column(DataType.STRING(100))
  eventName: string;

  @AllowNull(true)
  @Column(DataType.JSONB)
  payload: Record<string, any>;

  @AllowNull(true)
  @Column(DataType.JSONB)
  response: Record<string, any>;

  @Default("skipped")
  @Column(DataType.ENUM("success", "failed", "skipped"))
  status: "success" | "failed" | "skipped";

  @AllowNull(true)
  @Column(DataType.TEXT)
  errorMessage: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default AdTrackingEvent;
