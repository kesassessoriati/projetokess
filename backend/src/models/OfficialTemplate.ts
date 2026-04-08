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
import OfficialCampaign from "./OfficialCampaign";

@Table({ tableName: "OfficialTemplates" })
class OfficialTemplate extends Model<OfficialTemplate> {
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

  @AllowNull(false)
  @Column(DataType.TEXT)
  externalTemplateId: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  name: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  language: string;

  @Column(DataType.TEXT)
  category: string;

  @Column(DataType.TEXT)
  status: string;

  @Column(DataType.TEXT)
  qualityScore: string;

  @Default([])
  @Column(DataType.JSONB)
  components: any[];

  @Default({})
  @Column(DataType.JSONB)
  raw: Record<string, any>;

  @Column(DataType.DATE)
  lastSyncedAt: Date;

  @HasMany(() => OfficialCampaign)
  campaigns: OfficialCampaign[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default OfficialTemplate;
