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
  HasMany,
  Default
} from "sequelize-typescript";
import Company from "./Company";
import Opportunity from "./Opportunity";
import KanbanAutomation from "./KanbanAutomation";
import KanbanAutomationRunAction from "./KanbanAutomationRunAction";

@Table({
  tableName: "kanban_automation_runs"
})
class KanbanAutomationRun extends Model<KanbanAutomationRun> {
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

  @Column({ field: "source_event_type" })
  sourceEventType: string;

  @Column({ field: "source_event_id" })
  sourceEventId: string;

  @Column({ field: "source_idempotency_key" })
  sourceIdempotencyKey: string;

  @Column({ field: "correlation_id" })
  correlationId: string;

  @Column({ field: "causation_id" })
  causationId: string;

  @Column(DataType.ENUM("shadow", "active"))
  mode: string;

  @Default("planned")
  @Column(DataType.ENUM("planned", "running", "completed", "failed", "cancelled", "skipped"))
  status: string;

  @Default(false)
  @Column({ field: "trigger_match" })
  triggerMatch: boolean;

  @Default(false)
  @Column({ field: "conditions_match" })
  conditionsMatch: boolean;

  @Column({ field: "runtime_plan_version" })
  runtimePlanVersion: number;

  @Column({ field: "runtime_plan_compiler_version" })
  runtimePlanCompilerVersion: string;

  @Column({ field: "runtime_plan_source_hash" })
  runtimePlanSourceHash: string;

  @Default([])
  @Column({ field: "diagnostics", type: DataType.JSONB })
  diagnostics: any[];

  @Default({})
  @Column({ field: "summary", type: DataType.JSONB })
  summary: any;

  @Column({ field: "error_class" })
  errorClass: string;

  @Column({ field: "error_message", type: DataType.TEXT })
  errorMessage: string;

  @Column({ field: "started_at" })
  startedAt: Date;

  @Column({ field: "completed_at" })
  completedAt: Date;

  @HasMany(() => KanbanAutomationRunAction, { foreignKey: "runId", as: "actions" })
  actions: KanbanAutomationRunAction[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default KanbanAutomationRun;
