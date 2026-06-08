import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  BelongsTo,
  ForeignKey,
  Default
} from "sequelize-typescript";
import Company from "./Company";
import Contact from "./Contact";
import Ticket from "./Ticket";

export type FollowUpLogStatus = "pending" | "processing" | "sent" | "skipped" | "failed";

@Table({ tableName: "AiExternalFollowUpLogs" })
class AiExternalFollowUpLog extends Model<AiExternalFollowUpLog> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @BelongsTo(() => Contact)
  contact: Contact;

  @ForeignKey(() => Ticket)
  @Column
  ticketId: number;

  @BelongsTo(() => Ticket)
  ticket: Ticket;

  @Column(DataType.TEXT)
  sessionId: string;

  @Column(DataType.TEXT)
  messageId: string;

  @Default("pending")
  @Column(DataType.ENUM("pending", "processing", "sent", "skipped", "failed"))
  status: FollowUpLogStatus;

  @Column(DataType.TEXT)
  reason: string;

  @Column(DataType.TEXT)
  detectedIntent: string;

  @Column(DataType.TEXT)
  detectedStage: string;

  @Column(DataType.TEXT)
  lastUserMessage: string;

  @Column(DataType.TEXT)
  lastAgentMessage: string;

  @Column(DataType.TEXT)
  conversationSummary: string;

  @Column(DataType.TEXT)
  generatedMessage: string;

  @Column(DataType.DATE(6))
  sentAt: Date;

  @Column(DataType.DATE(6))
  scheduledAt: Date;

  @Column(DataType.TEXT)
  errorMessage: string;

  @Column(DataType.JSONB)
  metadata: object;

  @CreatedAt
  @Column(DataType.DATE(6))
  createdAt: Date;

  @UpdatedAt
  @Column(DataType.DATE(6))
  updatedAt: Date;
}

export default AiExternalFollowUpLog;
