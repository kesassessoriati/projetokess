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
import SipSetting from "./SipSetting";
import User from "./User";

@Table({ tableName: "SipExtensions" })
class SipExtension extends Model<SipExtension> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => SipSetting)
  @Column
  sipSettingId: number;

  @BelongsTo(() => SipSetting)
  sipSetting: SipSetting;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @Column(DataType.STRING)
  extension: string;

  @Column(DataType.STRING)
  authUser: string;

  @Column(DataType.STRING)
  displayName: string;

  @Column(DataType.TEXT)
  secret: string;

  @Default(true)
  @Column(DataType.BOOLEAN)
  isActive: boolean;

  @Default(true)
  @Column(DataType.BOOLEAN)
  canMakeOutbound: boolean;

  @Default(true)
  @Column(DataType.BOOLEAN)
  canReceiveInbound: boolean;

  @Default(true)
  @Column(DataType.BOOLEAN)
  autoRegister: boolean;

  @Default({})
  @Column(DataType.JSONB)
  metadata: Record<string, any>;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default SipExtension;