import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  BelongsTo,
  Default
} from "sequelize-typescript";
import Company from "./Company";
import Opportunity from "./Opportunity";
import Pipeline from "./Pipeline";
import PipelineStage from "./PipelineStage";
import KanbanAutomation from "./KanbanAutomation";

@Table({
  tableName: "kanban_automation_timers"
})
class KanbanAutomationTimer extends Model<KanbanAutomationTimer> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column({ field: "company_id" })
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => KanbanAutomation)
  @Column({ field: "automation_id" })
  automationId: number;

  @BelongsTo(() => KanbanAutomation)
  automation: KanbanAutomation;

  @ForeignKey(() => Opportunity)
  @Column({ field: "opportunity_id" })
  opportunityId: number;

  @BelongsTo(() => Opportunity)
  opportunity: Opportunity;

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

  @Column(DataType.ENUM("shadow", "active"))
  mode: string;

  @Column({
    field: "trigger_kind",
    type: DataType.ENUM("card.in_stage_for", "card.inactive_for")
  })
  triggerKind: string;

  @Column({ field: "threshold_minutes" })
  thresholdMinutes: number;

  @Column({ field: "timer_key" })
  timerKey: string;

  @Column({ field: "baseline_at" })
  baselineAt: Date;

  @Column({ field: "due_at" })
  dueAt: Date;

  @Default("scheduled")
  @Column(DataType.ENUM("scheduled", "fired", "cancelled"))
  status: string;

  @Column({ field: "cancel_reason" })
  cancelReason: string;

  @Column({ field: "source_event_id" })
  sourceEventId: string;

  @Column({ field: "source_idempotency_key" })
  sourceIdempotencyKey: string;

  @Column({ field: "correlation_id" })
  correlationId: string;

  @Default({})
  @Column(DataType.JSONB)
  payload: any;

  @Column({ field: "fired_at" })
  firedAt: Date;

  @Column({ field: "cancelled_at" })
  cancelledAt: Date;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default KanbanAutomationTimer;
