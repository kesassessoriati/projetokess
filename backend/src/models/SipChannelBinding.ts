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
import Whatsapp from "./Whatsapp";
import Queue from "./Queue";
import User from "./User";
import SipExtension from "./SipExtension";
import SipDid from "./SipDid";

@Table({ tableName: "SipChannelBindings" })
class SipChannelBinding extends Model<SipChannelBinding> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => Whatsapp)
  @Column
  whatsappId: number;

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;

  @ForeignKey(() => Queue)
  @Column
  queueId: number;

  @BelongsTo(() => Queue)
  queue: Queue;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @ForeignKey(() => SipExtension)
  @Column
  extensionId: number;

  @BelongsTo(() => SipExtension)
  extension: SipExtension;

  @ForeignKey(() => SipDid)
  @Column
  didId: number;

  @BelongsTo(() => SipDid)
  did: SipDid;

  @Default(true)
  @Column(DataType.BOOLEAN)
  isActive: boolean;

  @Default({})
  @Column(DataType.JSONB)
  metadata: Record<string, any>;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default SipChannelBinding;