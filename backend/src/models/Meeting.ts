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
import Contact from "./Contact";
import CrmLead from "./CrmLead";
import Opportunity from "./Opportunity";

@Table({ tableName: "Meetings" })
class Meeting extends Model<Meeting> {
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

  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @BelongsTo(() => Contact)
  contact: Contact;

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

  @Column
  title: string;

  @Default("pending")
  @Column(DataType.ENUM("pending", "processing", "completed", "failed"))
  status: string;

  @Column
  videoFilename: string;

  @Column
  audioFilename: string;

  @Column(DataType.TEXT)
  transcription: string;

  @Default({})
  @Column(DataType.JSONB)
  insights: Record<string, any>;

  @Column(DataType.INTEGER)
  duration: number;

  @Column
  errorMessage: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default Meeting;
