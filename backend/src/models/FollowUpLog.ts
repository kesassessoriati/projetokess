import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  BelongsTo,
  AllowNull,
  Default,
  DataType,
} from "sequelize-typescript";
import FollowUpCampaign from "./FollowUpCampaign";
import FollowUpStage from "./FollowUpStage";

@Table({ tableName: "FollowUpLogs" })
class FollowUpLog extends Model<FollowUpLog> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => FollowUpCampaign)
  @Column
  followUpCampaignId: number;

  @ForeignKey(() => FollowUpStage)
  @Column
  stageId: number;

  @Column
  contactNumber: string;

  @Column
  companyId: number;

  // Canonical outbound-message trigger for the current follow-up cycle.
  // Legacy rows may keep this null and are handled by compatibility logic.
  @AllowNull(true)
  @Column
  triggerMessageId: number;

  @AllowNull(true)
  @Column
  triggeredAt: Date;

  @AllowNull(true)
  @Column
  sentAt: Date;

  @AllowNull(true)
  @Column
  respondedAt: Date;

  @Default("pending")
  @Column(DataType.STRING(20))
  status: string; // 'pending' | 'sent' | 'responded' | 'failed' | 'skipped'

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @BelongsTo(() => FollowUpCampaign)
  followUpCampaign: FollowUpCampaign;

  @BelongsTo(() => FollowUpStage)
  stage: FollowUpStage;
}

export default FollowUpLog;
