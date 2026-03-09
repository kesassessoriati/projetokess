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
import GroupCampaign from "./GroupCampaign";

@Table({ tableName: "GroupCampaignLogs" })
class GroupCampaignLog extends Model<GroupCampaignLog> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => GroupCampaign)
  @Column
  campaignId: number;

  @BelongsTo(() => GroupCampaign)
  campaign: GroupCampaign;

  @Column(DataType.STRING(30))
  type: string;

  @Column(DataType.STRING)
  groupJid: string;

  @Column(DataType.TEXT)
  message: string;

  @Column(DataType.JSONB)
  payload: Record<string, any>;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default GroupCampaignLog;
