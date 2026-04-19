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
  BeforeSave,
  Default
} from "sequelize-typescript";
import Company from "./Company";
import { decrypt, encrypt } from "../helpers/crypto";

@Table({ tableName: "SipSettings" })
class SipSetting extends Model<SipSetting> {
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
  label: string;

  @Column(DataType.STRING)
  host: string;

  @Column(DataType.INTEGER)
  port: number;

  @Default("wss")
  @Column(DataType.STRING)
  websocketProtocol: string;

  @Column(DataType.STRING)
  wsPath: string;

  @Column(DataType.STRING)
  sipDomain: string;

  @Column(DataType.STRING)
  username: string;

  @Column(DataType.STRING)
  authUser: string;

  @Column(DataType.TEXT)
  get password(): string {
    const rawValue = this.getDataValue("password");
    return rawValue ? decrypt(rawValue) : rawValue;
  }

  @Column(DataType.STRING)
  displayName: string;

  @Column(DataType.STRING)
  outboundProxy: string;

  @Column(DataType.STRING)
  stunServer: string;

  @Default(true)
  @Column(DataType.BOOLEAN)
  registerOnStartup: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  enabled: boolean;

  @Default({})
  @Column(DataType.JSONB)
  metadata: Record<string, any>;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @BeforeSave
  static encryptPassword(instance: SipSetting) {
    if (instance.changed("password")) {
      const plainPassword = instance.getDataValue("password");
      instance.setDataValue("password", plainPassword ? encrypt(plainPassword) : plainPassword);
    }
  }
}

export default SipSetting;
