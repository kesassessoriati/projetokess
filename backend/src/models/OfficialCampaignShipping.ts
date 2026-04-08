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
  AllowNull,
  Default
} from "sequelize-typescript";
import Company from "./Company";
import OfficialCampaign from "./OfficialCampaign";
import ContactListItem from "./ContactListItem";

@Table({ tableName: "OfficialCampaignShippings" })
class OfficialCampaignShipping extends Model<OfficialCampaignShipping> {
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

  @ForeignKey(() => OfficialCampaign)
  @AllowNull(false)
  @Column
  campaignId: number;

  @BelongsTo(() => OfficialCampaign)
  campaign: OfficialCampaign;

  @ForeignKey(() => ContactListItem)
  @AllowNull(true)
  @Column
  contactId: number | null;

  @BelongsTo(() => ContactListItem)
  contact: ContactListItem | null;

  @AllowNull(false)
  @Column(DataType.TEXT)
  number: string;

  @Column(DataType.TEXT)
  contactName: string;

  @Default("PENDING")
  @Column(DataType.STRING(20))
  status: string;

  @Column(DataType.TEXT)
  messageId: string | null;

  @Column(DataType.TEXT)
  errorMessage: string | null;

  @Column(DataType.JSONB)
  payload: Record<string, any> | null;

  @Column(DataType.JSONB)
  response: Record<string, any> | null;

  @Column(DataType.DATE)
  sentAt: Date | null;

  @Column(DataType.DATE)
  failedAt: Date | null;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default OfficialCampaignShipping;
