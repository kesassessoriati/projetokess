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
import KanbanAutomationRun from "./KanbanAutomationRun";

@Table({
  tableName: "kanban_automation_run_actions"
})
class KanbanAutomationRunAction extends Model<KanbanAutomationRunAction> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column({ field: "company_id" })
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => KanbanAutomationRun)
  @Column({ field: "run_id" })
  runId: number;

  @BelongsTo(() => KanbanAutomationRun)
  run: KanbanAutomationRun;

  @ForeignKey(() => Opportunity)
  @Column({ field: "opportunity_id" })
  opportunityId: number;

  @BelongsTo(() => Opportunity)
  opportunity: Opportunity;

  @Column({ field: "action_node_id" })
  actionNodeId: string;

  @Column({
    field: "action_kind",
    type: DataType.ENUM(
      "send_message",
      "create_task",
      "move_card",
      "assign_user",
      "add_tag",
      "remove_tag",
      "notify_internal_users",
      "schedule_follow_up"
    )
  })
  actionKind: string;

  @Column({ field: "sequence_no" })
  sequenceNo: number;

  @Default(0)
  @Column({ field: "delay_minutes" })
  delayMinutes: number;

  @Column({ field: "scheduled_for" })
  scheduledFor: Date;

  @Column({ field: "started_at" })
  startedAt: Date;

  @Column({ field: "completed_at" })
  completedAt: Date;

  @Column({ field: "cancelled_at" })
  cancelledAt: Date;

  @Default(0)
  @Column
  attempts: number;

  @Column({ field: "last_attempt_at" })
  lastAttemptAt: Date;

  @Default("scheduled")
  @Column(DataType.ENUM("scheduled", "running", "completed", "failed", "cancelled", "shadowed"))
  status: string;

  @Column({ field: "idempotency_key" })
  idempotencyKey: string;

  @Default({})
  @Column({ field: "payload_snapshot", type: DataType.JSONB })
  payloadSnapshot: any;

  @Column({ field: "result_snapshot", type: DataType.JSONB })
  resultSnapshot: any;

  @Column({ field: "error_class" })
  errorClass: string;

  @Column({ field: "error_message", type: DataType.TEXT })
  errorMessage: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default KanbanAutomationRunAction;
