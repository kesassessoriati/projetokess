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
  Default
} from "sequelize-typescript";
import Company from "./Company";
import GroupCampaign from "./GroupCampaign";
import GroupDirectory from "./GroupDirectory";

@Table({ tableName: "GroupCampaignTargets" })
class GroupCampaignTarget extends Model<GroupCampaignTarget> {
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

  @ForeignKey(() => GroupDirectory)
  @Column
  groupId: number;

  @BelongsTo(() => GroupDirectory)
  group: GroupDirectory;

  @Column(DataType.STRING)
  groupJid: string;

  @Default("PENDING")
  @Column(DataType.STRING(20))
  status: string;

  @Column(DataType.DATE)
  scheduledAt: Date;

  @Column(DataType.DATE)
  sentAt: Date;

  @Column(DataType.DATE)
  lastAttemptAt: Date;

  @Default(0)
  @Column
  attempts: number;

  @Column(DataType.TEXT)
  errorMessage: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default GroupCampaignTarget;
