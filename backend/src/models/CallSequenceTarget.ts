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
  Default
} from "sequelize-typescript";
import CallSequence from "./CallSequence";
import CrmLead from "./CrmLead";
import Opportunity from "./Opportunity";
import Contact from "./Contact";

@Table({ tableName: "CallSequenceTargets" })
class CallSequenceTarget extends Model<CallSequenceTarget> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => CallSequence)
  @Column
  sequenceId: number;

  @BelongsTo(() => CallSequence, "sequenceId")
  sequence: CallSequence;

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

  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @BelongsTo(() => Contact)
  contact: Contact;

  @Column(DataType.STRING)
  phone: string;

  @Column(DataType.STRING)
  contactName: string;

  @Column(DataType.INTEGER)
  orderIndex: number;

  @Default("PENDING")
  @Column(DataType.STRING)
  status: string;

  @Default(0)
  @Column(DataType.INTEGER)
  attempts: number;

  @Column(DataType.INTEGER)
  lastCallRecordId: number;

  @Column(DataType.STRING)
  lastCallStatus: string;

  @Column(DataType.DATE)
  lastOutcomeAt: Date;

  @Column(DataType.DATE)
  completedAt: Date;

  @Default({})
  @Column(DataType.JSONB)
  metadata: Record<string, any>;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default CallSequenceTarget;
