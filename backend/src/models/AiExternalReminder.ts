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
import Contact from "./Contact";
import Ticket from "./Ticket";
import AiExternalAppointment from "./AiExternalAppointment";

@Table({ tableName: "ai_external_reminders" })
class AiExternalReminder extends Model<AiExternalReminder> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column({ field: "company_id" })
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => AiExternalAppointment)
  @Column({ field: "ai_appointment_id", allowNull: true })
  aiAppointmentId: number;

  @BelongsTo(() => AiExternalAppointment)
  aiAppointment: AiExternalAppointment;

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

  @Column({ field: "lead_name", type: DataType.STRING(200), allowNull: true })
  leadName: string;

  @Column({ field: "lead_phone", type: DataType.STRING(50), allowNull: true })
  leadPhone: string;

  @Column(DataType.TEXT)
  message: string;

  @Column({ field: "scheduled_at", type: DataType.DATE })
  scheduledAt: Date;

  @Column({ field: "sent_at", type: DataType.DATE, allowNull: true })
  sentAt: Date;

  @Default("pending")
  @Column(DataType.STRING(30))
  status: string;

  @Column({ field: "ai_paused_until", type: DataType.DATE, allowNull: true })
  aiPausedUntil: Date;

  @Column({ field: "n8n_session_id", type: DataType.STRING(160), allowNull: true })
  n8nSessionId: string;

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

export default AiExternalReminder;
