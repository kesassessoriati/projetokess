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
  BelongsTo,
  HasMany,
  Default,
  AllowNull
} from "sequelize-typescript";
import Company from "./Company";
import Whatsapp from "./Whatsapp";
import ContactList from "./ContactList";
import OfficialTemplate from "./OfficialTemplate";
import OfficialCampaignShipping from "./OfficialCampaignShipping";

@Table({ tableName: "OfficialCampaigns" })
class OfficialCampaign extends Model<OfficialCampaign> {
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

  @ForeignKey(() => Whatsapp)
  @AllowNull(false)
  @Column
  whatsappId: number;

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;

  @ForeignKey(() => ContactList)
  @AllowNull(false)
  @Column
  contactListId: number;

  @BelongsTo(() => ContactList)
  contactList: ContactList;

  @ForeignKey(() => OfficialTemplate)
  @AllowNull(true)
  @Column
  officialTemplateId: number | null;

  @BelongsTo(() => OfficialTemplate)
  officialTemplate: OfficialTemplate | null;

  @AllowNull(false)
  @Column(DataType.TEXT)
  name: string;

  @Default("DRAFT")
  @Column(DataType.STRING(30))
  status: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  templateName: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  templateLanguage: string;

  @Column(DataType.TEXT)
  templateCategory: string;

  @Default([])
  @Column(DataType.JSONB)
  templateComponents: any[];

  @Default({})
  @Column(DataType.JSONB)
  variableMapping: Record<string, any>;

  @AllowNull(true)
  @Column(DataType.JSONB)
  advancedComponents: any[] | null;

  @AllowNull(true)
  @Column(DataType.TEXT)
  previewNumber: string | null;

  @Default(4)
  @Column
  intervalSeconds: number;

  @Column(DataType.DATE)
  scheduledAt: Date | null;

  @Column(DataType.DATE)
  startedAt: Date | null;

  @Column(DataType.DATE)
  completedAt: Date | null;

  @Default(0)
  @Column
  totalTargets: number;

  @Default(0)
  @Column
  processedTargets: number;

  @Default(0)
  @Column
  successCount: number;

  @Default(0)
  @Column
  failedCount: number;

  @Column(DataType.TEXT)
  failureReason: string | null;

  @HasMany(() => OfficialCampaignShipping)
  shippings: OfficialCampaignShipping[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default OfficialCampaign;
