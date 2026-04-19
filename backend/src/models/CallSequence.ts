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
import User from "./User";
import Pipeline from "./Pipeline";
import PipelineStage from "./PipelineStage";
import CallSequenceTarget from "./CallSequenceTarget";

@Table({ tableName: "CallSequences" })
class CallSequence extends Model<CallSequence> {
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

  @ForeignKey(() => Pipeline)
  @Column
  pipelineId: number;

  @BelongsTo(() => Pipeline)
  pipeline: Pipeline;

  @ForeignKey(() => PipelineStage)
  @Column
  stageId: number;

  @BelongsTo(() => PipelineStage, "stageId")
  stage: PipelineStage;

  @ForeignKey(() => PipelineStage)
  @Column
  nextStageId: number;

  @BelongsTo(() => PipelineStage, "nextStageId")
  nextStage: PipelineStage;

  @Column(DataType.STRING)
  name: string;

  @Default("ACTIVE")
  @Column(DataType.STRING)
  status: string;

  @Default(3)
  @Column(DataType.INTEGER)
  maxAttempts: number;

  @Default(30)
  @Column(DataType.INTEGER)
  intervalSeconds: number;

  @Default("move_stage")
  @Column(DataType.STRING)
  onMaxAttempts: string;

  @Default(0)
  @Column(DataType.INTEGER)
  totalTargets: number;

  @Default(0)
  @Column(DataType.INTEGER)
  completedTargets: number;

  @Default(0)
  @Column(DataType.INTEGER)
  answeredTargets: number;

  @Default(0)
  @Column(DataType.INTEGER)
  failedTargets: number;

  @Column(DataType.DATE)
  startedAt: Date;

  @Column(DataType.DATE)
  pausedAt: Date;

  @Column(DataType.DATE)
  completedAt: Date;

  @Default({})
  @Column(DataType.JSONB)
  metadata: Record<string, any>;

  @HasMany(() => CallSequenceTarget, { foreignKey: "sequenceId", as: "targets" })
  targets: CallSequenceTarget[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default CallSequence;
