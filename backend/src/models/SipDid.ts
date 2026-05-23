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

@Table({ tableName: "SipDids" })
class SipDid extends Model<SipDid> {
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

  @Column(DataType.STRING)
  name: string;

  @Column(DataType.STRING)
  number: string;

  @Column(DataType.STRING)
  normalizedNumber: string;

  @Column(DataType.STRING)
  countryCode: string;

  @Column(DataType.STRING)
  areaCode: string;

  @Column(DataType.STRING)
  state: string;

  @Column(DataType.STRING)
  city: string;

  @Default("both")
  @Column(DataType.STRING)
  type: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  isDefault: boolean;

  @Default(true)
  @Column(DataType.BOOLEAN)
  isActive: boolean;

  @Default(0)
  @Column(DataType.INTEGER)
  priority: number;

  @Default(true)
  @Column(DataType.BOOLEAN)
  allowedForOutbound: boolean;

  @Default(true)
  @Column(DataType.BOOLEAN)
  allowedForInbound: boolean;

  @Column(DataType.STRING)
  providerRef: string;

  @Default({})
  @Column(DataType.JSONB)
  metadata: Record<string, any>;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default SipDid;