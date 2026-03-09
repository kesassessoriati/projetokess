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
  BelongsTo
} from "sequelize-typescript";
import Company from "./Company";
import WhatsappWarmupSession from "./WhatsappWarmupSession";

@Table
class WhatsappWarmupSessionLog extends Model<WhatsappWarmupSessionLog> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => WhatsappWarmupSession)
  @Column
  warmupSessionId: number;

  @BelongsTo(() => WhatsappWarmupSession)
  session: WhatsappWarmupSession;

  @Column(DataType.STRING(40))
  type: string;

  @Column(DataType.TEXT)
  message: string;

  @Column(DataType.INTEGER)
  fromWhatsappId: number;

  @Column(DataType.INTEGER)
  toWhatsappId: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default WhatsappWarmupSessionLog;
