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
import User from "./User";
import Appointment from "./Appointment";
import AiExternalAgentConfig from "./AiExternalAgentConfig";
import CrmLead from "./CrmLead";
import Contact from "./Contact";
import Ticket from "./Ticket";
import Pipeline from "./Pipeline";
import PipelineStage from "./PipelineStage";
import UserSchedule from "./UserSchedule";
import Servico from "./Servico";

@Table({ tableName: "ai_external_appointments" })
class AiExternalAppointment extends Model<AiExternalAppointment> {
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
  @Column({ field: "config_id", allowNull: true })
  configId: number;

  @BelongsTo(() => AiExternalAgentConfig)
  config: AiExternalAgentConfig;

  @ForeignKey(() => Appointment)
  @Column({ field: "appointment_id", allowNull: true })
  appointmentId: number;

  @BelongsTo(() => Appointment)
  appointment: Appointment;

  @ForeignKey(() => CrmLead)
  @Column({ field: "crm_lead_id", allowNull: true })
  crmLeadId: number;

  @BelongsTo(() => CrmLead)
  crmLead: CrmLead;

  @ForeignKey(() => Contact)
  @Column({ field: "contact_id", allowNull: true })
  contactId: number;

  @BelongsTo(() => Contact)
  contact: Contact;

  @ForeignKey(() => Ticket)
  @Column({ field: "ticket_id", allowNull: true })
  ticketId: number;

  @BelongsTo(() => Ticket)
  ticket: Ticket;

  @ForeignKey(() => Pipeline)
  @Column({ field: "pipeline_id", allowNull: true })
  pipelineId: number;

  @BelongsTo(() => Pipeline)
  pipeline: Pipeline;

  @ForeignKey(() => PipelineStage)
  @Column({ field: "stage_id", allowNull: true })
  stageId: number;

  @BelongsTo(() => PipelineStage)
  stage: PipelineStage;

  @ForeignKey(() => UserSchedule)
  @Column({ field: "schedule_id" })
  scheduleId: number;

  @BelongsTo(() => UserSchedule)
  schedule: UserSchedule;

  @ForeignKey(() => Servico)
  @Column({ field: "service_id", allowNull: true })
  serviceId: number;

  @BelongsTo(() => Servico)
  service: Servico;

  @Column(DataType.STRING(200))
  title: string;

  @Column(DataType.TEXT)
  description: string;

  @Column({ field: "lead_name", type: DataType.STRING(200), allowNull: true })
  leadName: string;

  @Column({ field: "lead_phone", type: DataType.STRING(50), allowNull: true })
  leadPhone: string;

  @Column({ field: "lead_email", type: DataType.STRING(200), allowNull: true })
  leadEmail: string;

  @Column({ field: "lead_document", type: DataType.STRING(80), allowNull: true })
  leadDocument: string;

  @Column({ field: "start_datetime", type: DataType.DATE })
  startDatetime: Date;

  @Default(60)
  @Column({ field: "duration_minutes" })
  durationMinutes: number;

  @Default("scheduled")
  @Column(DataType.STRING(30))
  status: string;

  @Default(false)
  @Column({ field: "reminder_enabled", type: DataType.BOOLEAN })
  reminderEnabled: boolean;

  @Column({ field: "ai_paused_until", type: DataType.DATE, allowNull: true })
  aiPausedUntil: Date;

  @Column({ field: "cancellation_reason", type: DataType.TEXT, allowNull: true })
  cancellationReason: string;

  @Column({ field: "n8n_session_id", type: DataType.STRING(160), allowNull: true })
  n8nSessionId: string;

  @Default("crm")
  @Column(DataType.STRING(40))
  source: string;

  @Default({})
  @Column(DataType.JSONB)
  metadata: Record<string, any>;

  @ForeignKey(() => User)
  @Column({ field: "created_by_user_id", allowNull: true })
  createdByUserId: number;

  @BelongsTo(() => User, "createdByUserId")
  createdByUser: User;

  @CreatedAt
  @Column({ field: "created_at" })
  createdAt: Date;

  @UpdatedAt
  @Column({ field: "updated_at" })
  updatedAt: Date;
}

export default AiExternalAppointment;
