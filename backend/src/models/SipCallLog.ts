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
import SipDid from "./SipDid";
import SipExtension from "./SipExtension";
import User from "./User";
import Queue from "./Queue";
import Whatsapp from "./Whatsapp";
import Ticket from "./Ticket";
import Contact from "./Contact";

@Table({ tableName: "SipCallLogs" })
class SipCallLog extends Model<SipCallLog> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @Column(DataType.STRING)
  callId: string;

  @Column(DataType.STRING)
  providerCallId: string;

  @Column(DataType.STRING)
  direction: string;

  @Column(DataType.STRING)
  status: string;

  @Column(DataType.STRING)
  fromNumber: string;

  @Column(DataType.STRING)
  toNumber: string;

  @ForeignKey(() => SipDid)
  @Column
  didId: number;

  @BelongsTo(() => SipDid)
  did: SipDid;

  @ForeignKey(() => SipExtension)
  @Column
  extensionId: number;

  @BelongsTo(() => SipExtension)
  extension: SipExtension;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @ForeignKey(() => Queue)
  @Column
  queueId: number;

  @BelongsTo(() => Queue)
  queue: Queue;

  @ForeignKey(() => Whatsapp)
  @Column
  channelId: number;

  @BelongsTo(() => Whatsapp)
  channel: Whatsapp;

  @ForeignKey(() => Ticket)
  @Column
  ticketId: number;

  @BelongsTo(() => Ticket)
  ticket: Ticket;

  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @BelongsTo(() => Contact)
  contact: Contact;

  @Column(DataType.DATE)
  startedAt: Date;

  @Column(DataType.DATE)
  answeredAt: Date;

  @Column(DataType.DATE)
  endedAt: Date;

  @Column(DataType.INTEGER)
  duration: number;

  @Column(DataType.TEXT)
  recordingUrl: string;

  @Default({})
  @Column(DataType.JSONB)
  metadata: Record<string, any>;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default SipCallLog;