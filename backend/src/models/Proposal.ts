import {
  Table,
  Column,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  CreatedAt,
  UpdatedAt,
  ForeignKey,
  BelongsTo,
  DataType,
  Default,
  Unique
} from "sequelize-typescript";

import Company from "./Company";
import Contact from "./Contact";

export type ProposalStatus = "rascunho" | "enviada" | "aceita" | "recusada";

@Table({ tableName: "Proposals" })
class Proposal extends Model<Proposal> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @AllowNull(false)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => Contact)
  @AllowNull(true)
  @Column
  contactId: number | null;

  @BelongsTo(() => Contact)
  contact: Contact;

  @AllowNull(false)
  @Column(DataType.STRING)
  title: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  clientName: string;

  @Default("rascunho")
  @AllowNull(false)
  @Column(DataType.ENUM("rascunho", "enviada", "aceita", "recusada"))
  status: ProposalStatus;

  @AllowNull(false)
  @Unique
  @Column(DataType.STRING(20))
  slug: string;

  @AllowNull(true)
  @Column(DataType.DATEONLY)
  validUntil: string | null;

  @AllowNull(true)
  @Column(DataType.TEXT)
  notes: string | null;

  @Default({})
  @AllowNull(false)
  @Column(DataType.JSONB)
  data: Record<string, any>;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default Proposal;
