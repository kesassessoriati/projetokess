import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  DataType,
  BelongsTo,
  ForeignKey,
  Default
} from "sequelize-typescript";
import Company from "./Company";
import User from "./User";
import CallRecord from "./CallRecord";
import CrmLead from "./CrmLead";
import Opportunity from "./Opportunity";
import Pipeline from "./Pipeline";
import PipelineStage from "./PipelineStage";

@Table({ tableName: "CallRecordings" })
class CallRecording extends Model<CallRecording> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @ForeignKey(() => CallRecord)
  @Column
  callRecordId: number;

  @BelongsTo(() => CallRecord)
  callRecord: CallRecord;

  @ForeignKey(() => CrmLead)
  @Column
  leadId: number;

  @BelongsTo(() => CrmLead)
  lead: CrmLead;

  @ForeignKey(() => Opportunity)
  @Column
  opportunityId: number;

  @BelongsTo(() => Opportunity)
  opportunity: Opportunity;

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

  @Default("browser")
  @Column
  source: string;

  @Default("ready")
  @Column
  status: string;

  @Column
  originalName: string;

  @Column
  filename: string;

  @Column
  mimeType: string;

  @Column
  publicUrl: string;

  @Column(DataType.INTEGER)
  size: number;

  @Column(DataType.INTEGER)
  duration: number;

  @Default({})
  @Column(DataType.JSONB)
  metadata: Record<string, any>;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default CallRecording;
