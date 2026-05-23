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
import User from "./User";
import Queue from "./Queue";
import SipExtension from "./SipExtension";
import Whatsapp from "./Whatsapp";

@Table({ tableName: "SipDidRoutes" })
class SipDidRoute extends Model<SipDidRoute> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => SipDid)
  @Column
  didId: number;

  @BelongsTo(() => SipDid)
  did: SipDid;

  @Column(DataType.STRING)
  routeType: string;

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

  @ForeignKey(() => SipExtension)
  @Column
  extensionId: number;

  @BelongsTo(() => SipExtension)
  extension: SipExtension;

  @ForeignKey(() => Whatsapp)
  @Column
  channelId: number;

  @BelongsTo(() => Whatsapp)
  channel: Whatsapp;

  @Default(0)
  @Column(DataType.INTEGER)
  priority: number;

  @Default(true)
  @Column(DataType.BOOLEAN)
  isActive: boolean;

  @Column(DataType.STRING)
  businessHoursRule: string;

  @ForeignKey(() => SipDidRoute)
  @Column
  fallbackRouteId: number;

  @BelongsTo(() => SipDidRoute, { foreignKey: "fallbackRouteId", as: "fallbackRoute" })
  fallbackRoute: SipDidRoute;

  @Default({})
  @Column(DataType.JSONB)
  metadata: Record<string, any>;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default SipDidRoute;