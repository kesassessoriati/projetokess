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

@Table({ tableName: "CallProviderSettings" })
class CallProviderSetting extends Model<CallProviderSetting> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @Default("sip")
  @Column(DataType.STRING)
  defaultProvider: string;

  @Default(true)
  @Column(DataType.BOOLEAN)
  sipEnabled: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  wavoipEnabled: boolean;

  @Column(DataType.STRING)
  wavoipBaseUrl: string;

  @Column(DataType.STRING)
  wavoipDeviceId: string;

  @Column(DataType.TEXT)
  get wavoipToken(): string {
    const rawValue = this.getDataValue("wavoipToken");
    return rawValue ? decrypt(rawValue) : rawValue;
  }

  @Default(false)
  @Column(DataType.BOOLEAN)
  rejectCallsDefault: boolean;

  @Column(DataType.TEXT)
  callRejectMessagePt: string;

  @Column(DataType.TEXT)
  callRejectMessageEn: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  businessHoursEnabled: boolean;

  @Default({})
  @Column(DataType.JSONB)
  settings: Record<string, any>;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @BeforeSave
  static encryptToken(instance: CallProviderSetting) {
    if (instance.changed("wavoipToken")) {
      const plainToken = instance.getDataValue("wavoipToken");
      instance.setDataValue("wavoipToken", plainToken ? encrypt(plainToken) : plainToken);
    }
  }
}

export default CallProviderSetting;
